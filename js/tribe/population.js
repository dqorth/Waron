// Population: growth, hunger, food carry, unit sync.
class TribePopulation {
  constructor(tribe) {
    this.tribe = tribe;
  }

  /**
   * Manages the tribe's population growth based on housing capacity, food supply, and debuffs.
   *
   * @description This private method periodically attempts to increase the tribe's population. It checks if enough time has passed since the last growth, then assesses the maximum population allowed by homes and the current age. Growth is further influenced by food availability and active disease or food debuffs, ensuring that population expansion is tied to the tribe's well-being and infrastructure.
   *
   * @workflow
   * 1. Increments `this._growthTimer`.
   * 2. Calculates `growRate` based on `techLevel`, clamped between 4 and 16.
   * 3. If `this._growthTimer` is less than `growRate`, the function returns (not time to grow yet).
   * 4. Resets `this._growthTimer` to 0.
   * 5. Filters `this.buildings` to get all `HOME` buildings.
   * 6. Calculates `homeCap`, the total population capacity provided by all homes, summing capacities by their levels.
   * 7. Calculates `ageCap` based on `this.age.tribeMaxPop` and `this.techLevel`.
   * 8. Determines `maxPop` as the minimum of `ageCap` and `homeCap`, clamped to a minimum of 4.
   * 9. If `this.population` is already greater than or equal to `maxPop`, the function returns (no room for growth).
   * 10. Filters `this.buildings` to get all `FARM` buildings.
   * 11. Calculates `farmStorageCap` based on farms' levels and sizes.
   * 12. Determines `foodCap` as `CONFIG.FOOD_STORAGE_BASE + farmStorageCap`.
   * 13. Calculates `foodFill` as the ratio of `this.res.food` to `foodCap`, capped at 1.
   * 14. Retrieves `diseaseDebuff` and `foodDebuff` from `this.debuffs`.
   * 15. Calculates `growAmt` as a percentage of current population, adjusted by `foodFill`, `diseaseDebuff`, and `foodDebuff`, ensuring it's not negative.
   * 16. Updates `this.population` by adding `growAmt`, capped at `maxPop`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.HOME, CONFIG.ENTITY.FARM, CONFIG.FOOD_STORAGE_PER_FARM, CONFIG.FOOD_STORAGE_BASE, Math.floor(), Math.random(), Math.max(), Math.min(), this._homeCapacityByLevel().
   * @modifies this._growthTimer, this.population.
   * @triggers Called by `tick()`.
   * @performance O(B) where B is the number of buildings (due to filters and reduces), but generally small B.
   */
  _growPopulation() {
    this.tribe._growthTimer++;
    const growRate = Math.max(4, 16 - this.tribe.techLevel);
    if (this.tribe._growthTimer < growRate) return;
    this.tribe._growthTimer = 0;

    const homes  = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.HOME);
    const farms  = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    const homeCap = homes.reduce((sum, h) => sum + this._homeCapacityByLevel(h.level || 1), 0);
    const ageCap = this.tribe.age.tribeMaxPop * (1 + this.tribe.techLevel * 0.05);
    const maxPop = Math.max(4, Math.min(ageCap, homeCap));
    if (this.tribe.population >= maxPop) return;

    const farmStorageCap = farms.reduce((sum, f) => sum + CONFIG.FOOD_STORAGE_PER_FARM * (f.level || 1), 0);
    const foodCap = CONFIG.FOOD_STORAGE_BASE + farmStorageCap;

    const foodFill   = Math.min(1, this.tribe.res.food / Math.max(1, foodCap));
    const diseaseDebuff = this.tribe.debuffs.disease || 0;
    const foodDebuff    = this.tribe.debuffs.food    || 0;
    const growAmt = Math.max(0, Math.floor(
      this.tribe.population * 0.10 * Math.max(0.15, foodFill) * (1 - diseaseDebuff) * (1 - foodDebuff * 0.5)
    ));
    this.tribe.population = Math.min(maxPop, this.tribe.population + growAmt);
  }

  // ── Hunger system with personal food carry ────────────────────────────
  _updateHunger() {
    const foodBuildings = this.tribe.buildings.filter(b =>
      b.type === CONFIG.ENTITY.STOREHOUSE || b.type === CONFIG.ENTITY.CAPITOL
    );
    const refillRange = CONFIG.FOOD_CARRY_REFILL_RANGE || 2;
    const eatInterval = CONFIG.FOOD_CARRY_EAT_INTERVAL || 5;

    for (let i = this.tribe.units.length - 1; i >= 0; i--) {
      const u = this.tribe.units[i];

      // Ensure carry fields exist (for units spawned before this system)
      if (u.carriedFood === undefined) {
        const cap = this.tribe._getFoodCarryCapacity();
        u.carriedFood = cap;
        u.carriedFoodMax = cap;
        u._carryEatTimer = 0;
      }

      // Increase hunger
      u.hunger = Math.min(CONFIG.HUNGER_MAX, (u.hunger || 0) + CONFIG.HUNGER_RATE);

      // Starvation check
      if (u.hunger >= CONFIG.HUNGER_MAX) {
        u._hungerFullTicks = (u._hungerFullTicks || 0) + 1;
        if (u._hungerFullTicks >= CONFIG.HUNGER_DEATH_TICKS) {
          this.tribe._despawnUnitAtIndex(i);
          this.tribe.population = Math.max(0, this.tribe.population - 1);
          this.tribe.morale = Math.max(0.05, this.tribe.morale - 0.01);
          if (Math.random() < 0.3)
            Game.eventLog(`${this.tribe.name}: a ${u.type} dies of hunger.`, 'danger');
          continue;
        }
      } else {
        u._hungerFullTicks = 0;
      }

      // ── Priority 1: Eat from personal carry ──────────────────────────
      u._carryEatTimer = (u._carryEatTimer || 0) + 1;
      if (u.hunger >= CONFIG.HUNGER_EAT_THRESHOLD && u.carriedFood > 0 && u._carryEatTimer >= eatInterval) {
        u._carryEatTimer = 0;
        u.carriedFood = Math.max(0, u.carriedFood - 1);
        u.hunger = Math.max(0, u.hunger - CONFIG.HUNGER_FOOD_RESTORE);
        u._hungerFullTicks = 0;
        u._hungerTarget = null;
        // Don't seek food building — carry sustains the unit
        continue;
      }

      // ── Priority 2: Refill carry + eat at food buildings ─────────────
      if (foodBuildings.length) {
        let nearestFB = null, nearFBDist = Infinity;
        for (const fb of foodBuildings) {
          const d = Math.abs(fb.x - u.x) + Math.abs(fb.y - u.y);
          if (d < nearFBDist) { nearFBDist = d; nearestFB = fb; }
        }

        if (nearestFB && nearFBDist <= 1) {
          // At food building: eat from tribe supply
          if (u.hunger >= CONFIG.HUNGER_EAT_THRESHOLD && this.tribe.res.food >= 1) {
            const foodNeeded = Math.ceil(u.hunger / CONFIG.HUNGER_FOOD_RESTORE);
            const foodEaten  = Math.min(foodNeeded, Math.floor(this.tribe.res.food), 6);
            if (foodEaten > 0) {
              u.hunger           = Math.max(0, u.hunger - foodEaten * CONFIG.HUNGER_FOOD_RESTORE);
              this.tribe.res.food      = Math.max(0, this.tribe.res.food - foodEaten);
              u._hungerFullTicks = 0;
            }
          }

          // Refill carry from tribe supply (top up even if not hungry)
          if (u.carriedFood < u.carriedFoodMax && this.tribe.res.food >= 1) {
            const refillNeeded = u.carriedFoodMax - u.carriedFood;
            const refillGot = Math.min(refillNeeded, Math.floor(this.tribe.res.food));
            u.carriedFood += refillGot;
            this.tribe.res.food = Math.max(0, this.tribe.res.food - refillGot);
          }
          u._hungerTarget = null;

        } else if (u.carriedFood <= 0 && u.hunger >= CONFIG.HUNGER_EAT_THRESHOLD && nearestFB) {
          // Carry empty and hungry — march to food building
          u._hungerTarget = { x: nearestFB.x, y: nearestFB.y };
        } else if (u.carriedFood > 0 || u.hunger < CONFIG.HUNGER_EAT_THRESHOLD) {
          // Has carry or not hungry yet — no need to seek
          u._hungerTarget = null;
        }
      } else if (u.carriedFood <= 0) {
        // No food buildings at all and carry empty — nothing to do
        u._hungerTarget = null;
      }
    }
  }

  /**
   * Returns the population capacity provided by a home building at a given level.
   *
   * @description This private helper function determines how many population units a "home" building can house based on its current upgrade level. It provides a simple lookup for varying capacities, with higher-level homes accommodating more people.
   *
   * @workflow
   * 1. If `level` is 3 or greater, returns 6.
   * 2. Else if `level` is 2, returns 4.
   * 3. Else (level 1 or below), returns 3.
   *
   * @param {number} level - The current level of the home building.
   * @returns {number} The population capacity provided by the home.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by `_growPopulation()`, `_syncPopulationUnits()`.
   * @performance O(1).
   */
  _homeCapacityByLevel(level) {
    if (level >= 3) return 6;
    if (level === 2) return 4;
    return 3;
  }

  /**
   * Synchronizes the number of "normal" units with the tribe's population, creating or despawning as needed.
   *
   * @description This private method ensures that the number of generic "normal" units accurately reflects the tribe's `population` count, after accounting for all specialized units (warriors, workers, scouts, leaders). If the population is higher than the current special + normal units, it spawns new normal units, primarily near homes. If the population is lower, it despawns excess normal units.
   *
   * @workflow
   * 1. Filters `this.units` into `special` (non-normal units) and `normal` (normal units).
   * 2. If `this.population` is less than the count of `special` units, adjusts `this.population` to `special.length`.
   * 3. Calculates `desiredNormals` as `Math.max(0, this.population - special.length)`.
   * 4. If `normal.length` is greater than `desiredNormals`:
   *    a. Calculates `removeCount` (`normal.length - desiredNormals`).
   *    b. Iterates backwards through `this.units`:
   *       i. If the unit is `NORMAL` and `removeCount` is greater than 0:
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Decrements `removeCount`.
   *    c. Recalculates `desiredNormals` after despawning.
   * 5. Counts `currentNormals` (normal units after potential despawning).
   * 6. While `currentNormals` is less than `desiredNormals`:
   *    a. Finds a `HOME` building or the first building available as a spawn point.
   *    b. If no home is found, breaks the loop.
   *    c. Calls `this._spawnUnit(home.x, home.y, CONFIG.ENTITY.NORMAL)`.
   *    d. Increments `currentNormals`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.NORMAL, CONFIG.ENTITY.HOME, this.population, this.units, this.buildings, this._despawnUnitAtIndex(), this._spawnUnit(), this._homeCapacityByLevel(), Math.max(), Math.ceil().
   * @modifies this.population, this.units (by adding/removing units), world (via `_spawnUnit`, `_despawnUnitAtIndex`).
   * @triggers Called by `init()` and `tick()`.
   * @performance O(U + B) in the worst case, as it iterates units for filtering and potentially multiple times for spawning/despawning. Spawning/despawning also involves `_spawnUnit` which has `findNearestWalkable` (O(W)).
   */
  _syncPopulationUnits() {
    const special = this.tribe.units.filter(u => u.type !== CONFIG.ENTITY.NORMAL);
    const normal = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.NORMAL);

    if (this.tribe.population < special.length) this.tribe.population = special.length;

    let desiredNormals = Math.max(0, this.tribe.population - special.length);
    if (normal.length > desiredNormals) {
      let removeCount = normal.length - desiredNormals;
      for (let i = this.tribe.units.length - 1; i >= 0 && removeCount > 0; i--) {
        if (this.tribe.units[i].type !== CONFIG.ENTITY.NORMAL) continue;
        this.tribe._despawnUnitAtIndex(i);
        removeCount--;
      }
      desiredNormals = Math.max(0, this.tribe.population - special.length);
    }

    let currentNormals = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.NORMAL).length;
    while (currentNormals < desiredNormals) {
      const home = this.tribe.buildings.find(b => b.type === CONFIG.ENTITY.HOME) || this.tribe.buildings[0];
      if (!home) break;
      this.tribe._spawnUnit(home.x, home.y, CONFIG.ENTITY.NORMAL);
      currentNormals++;
    }
  }

}

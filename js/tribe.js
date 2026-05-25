class Tribe {
  /**
   * Initializes a new Tribe instance with core attributes, resources, and timers.
   *
   * @description This constructor sets up all fundamental properties for a new tribe, including its identity, starting location, initial population, military strength, and resource stockpiles. It also initializes various internal timers and collections for buildings and units, preparing the tribe for simulation.
   *
   * @workflow
   * 1. Assigns `id`, `name`, `color`, `startX`, `startY` from parameters to instance properties.
   * 2. Initializes `population` to a random value between 20 and 29.
   * 3. Sets `military` to 0.
   * 4. Initializes `res` (wood, food, metal, stone) to default starting values.
   * 5. Sets `techLevel` to 1, `knowledge` to 0, `morale` to 0.7.
   * 6. Creates a `leader` object with a random name and strength.
   * 7. Initializes empty arrays for `buildings` and `units`.
   * 8. Sets `suspicion` to 0, `debuffs` to an empty object, `agentCount` to 0.
   * 9. Sets `age` to the first age in `AGES` constant.
   * 10. Initializes `casualties` and `power` to 0.
   * 11. Initializes various internal timers (`_growthTimer`, `_techTimer`, etc.) to 0.
   *
   * @param {string} id - Unique identifier for the tribe.
   * @param {string} name - Display name of the tribe.
   * @param {number} startX - Initial X coordinate for the tribe's starting area.
   * @param {number} startY - Initial Y coordinate for the tribe's starting area.
   * @param {string} color - Hex color code for the tribe.
   * @returns {Tribe} A newly created Tribe instance.
   *
   * @dependencies Math.floor(), Math.random(), AGES (global constant), this._randName().
   * @modifies this.id, this.name, this.color, this.startX, this.startY, this.population, this.military, this.res, this.techLevel, this.knowledge, this.morale, this.leader, this.buildings, this.units, this.suspicion, this.debuffs, this.agentCount, this.age, this.casualties, this.power, and all internal timers.
   * @triggers Called once when a new Tribe object is instantiated.
   * @performance O(1) as it involves fixed-number assignments and basic calculations.
   */
  constructor(id, name, startX, startY, color) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.startX = startX;
    this.startY = startY;

    this.population = 20 + Math.floor(Math.random() * 10);
    this.military = 0;

    // ── Specific resource stockpiles ──────────────────────────────────────
    this.res = { wood: 120, food: 200, metal: 60, stone: 60 };

    this.techLevel = 1;
    this.knowledge = 0;
    this.morale = 0.7;

    this.leader = { name: this._randName(), strength: 0.5 + Math.random() * 0.5 };
    this.buildings = [];
    this.units = [];

    this.suspicion = 0;
    this.debuffs = {};
    this.agentCount = 0;
    this.age = AGES[0];
    this.casualties = 0;
    this.power = 0;

    // Internal timers
    this._growthTimer  = 0;
    this._techTimer    = 0;
    this._buildTimer   = 0;
    this._upgradeTimer = 0;
    this._militaryTimer = 0;
    this._attackTimer  = 0;
    this._towerTimer   = 0;
  }

  // ── Compat shims so legacy external code still works ──────────────────────
  get food()        { return this.res.food; }
  set food(v)       { this.res.food = v; }
  get resources()   { return this.res.wood + this.res.metal + this.res.stone; }
  // ── Fixed: resources setter now distributes evenly across wood/metal/stone ──
  set resources(v)  {
    const current = this.res.wood + this.res.metal + this.res.stone;
    if (current <= 0) return;
    const ratio = Math.max(0, v) / current;
    this.res.wood  = Math.max(0, this.res.wood  * ratio);
    this.res.metal = Math.max(0, this.res.metal * ratio);
    this.res.stone = Math.max(0, this.res.stone * ratio);
  }

  // ── Init ──
  /**
   * Initializes the tribe within the game world, placing initial buildings and units.
   *
   * @description This method connects the tribe to the game world and its enemy, then proceeds to establish its starting infrastructure and military. It finds a suitable starting location, places a capitol, seeds initial homes, and spawns a basic set of warriors, scouts, and workers to kickstart the tribe's development and defense.
   *
   * @workflow
   * 1. Assigns the `world` object to `this._world`.
   * 2. Assigns the `enemyTribe` object to `this._enemy`.
   * 3. Calls `world.findNearestWalkable(this.startX, this.startY)` to get a valid starting point `p`.
   * 4. Calls `this._placeBuilding(p.x, p.y, CONFIG.ENTITY.CAPITOL)` to place the tribe's capitol.
   * 5. Calls `this._seedStartingHomes(p.x, p.y)` to place initial homes around the capitol.
   * 6. Determines an `ox` offset based on the tribe's `id` for unit spawning direction.
   * 7. Spawns two `WARRIOR` units relative to the capitol.
   * 8. Spawns one `SCOUT` unit relative to the capitol.
   * 9. Spawns one `WORKER` unit relative to the capitol.
   * 10. Calls `this._syncPopulationUnits()` to ensure the population count matches the spawned units.
   *
   * @param {World} world - The game world instance.
   * @param {Tribe} enemyTribe - The opposing tribe instance.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.WARRIOR, CONFIG.ENTITY.SCOUT, CONFIG.ENTITY.WORKER, world.findNearestWalkable(), this._placeBuilding(), this._seedStartingHomes(), this._spawnUnit(), this._syncPopulationUnits().
   * @modifies this._world, this._enemy, this.buildings, this.units, world (by adding entities).
   * @triggers Called once after tribe creation, usually by the game's initialization logic.
   * @performance O(1) for fixed number of building/unit placements and world interactions, but `_seedStartingHomes` and `_syncPopulationUnits` might involve small loops (bounded by `neededHomes` and population).
   */
  init(world, enemyTribe) {
    this._world = world;
    this._enemy = enemyTribe;
    const p = world.findNearestWalkable(this.startX, this.startY);

    this._placeBuilding(p.x, p.y, CONFIG.ENTITY.CAPITOL);
    this._seedStartingHomes(p.x, p.y);

    // Starting units
    const ox = this.id === 'a' ? 1 : -1;
    this._spawnUnit(p.x + ox * 2, p.y,     CONFIG.ENTITY.WARRIOR);
    this._spawnUnit(p.x + ox * 2, p.y + 1, CONFIG.ENTITY.WARRIOR);
    this._spawnUnit(p.x + ox * 3, p.y,     CONFIG.ENTITY.SCOUT);
    this._spawnUnit(p.x,          p.y + 1, CONFIG.ENTITY.WORKER);
    this._syncPopulationUnits();
  }

  // ── Tick ──
  /**
   * Advances the tribe's simulation state by one year, processing all periodic logic.
   *
   * @description This is the main update loop for the tribe, executed every game year. It orchestrates a series of internal methods that manage population growth, resource gathering, unit actions, building construction and upgrades, military operations, and debuff decay, ensuring the tribe evolves and reacts to the game environment.
   *
   * @workflow
   * 1. Calls `this._applyDebuffDecay()` to reduce active debuff strengths.
   * 2. Calls `this._updateAge(year)` to update the tribe's current age based on the game year.
   * 3. Calls `this._growPopulation()` to potentially increase the tribe's population.
   * 4. Calls `this._gatherResources()` to collect resources from farms and workers.
   * 5. Calls `this._updateHunger()` to manage unit hunger and food consumption.
   * 6. Calls `this._doBuildLogic()` to determine and initiate new building construction.
   * 7. Calls `this._doUpgradeLogic()` to determine and initiate building upgrades.
   * 8. Calls `this._doMilitaryLogic()` to handle military unit spawning.
   * 9. Calls `this._doAttackLogic()` to plan and execute attacks on the enemy.
   * 10. Calls `this._updateUnits()` to update the state and actions of all tribe units.
   * 11. Calls `this._updateTowers()` to handle tower auto-attacks.
   * 12. Calls `this._syncPopulationUnits()` to ensure the number of normal units matches the population.
   * 13. Calls `this._computePower()` to recalculate the tribe's overall power score.
   *
   * @param {number} year - The current game year.
   * @returns {void}
   *
   * @dependencies All the internal methods called within the tick.
   * @modifies this.debuffs, this.age, this.population, this.res, this.units, this.buildings, this.military, this.power, and various internal timers and unit/building properties via sub-methods.
   * @triggers Called by the main game loop, typically once per game year.
   * @performance O(N) where N is the total number of units and buildings, as many sub-methods iterate over these collections.
   */
  tick(year) {
    this._applyDebuffDecay();
    this._updateAge(year);
    this._growPopulation();
    this._gatherResources();
    this._updateHunger();
    this._doBuildLogic();
    this._doUpgradeLogic();
    this._doMilitaryLogic();
    this._doAttackLogic();
    this._updateUnits();
    this._updateTowers();
    this._syncPopulationUnits();
    this._computePower();
  }

  /**
   * Updates the tribe's current age based on the given game year.
   *
   * @description This private helper function is responsible for keeping the tribe's `age` property synchronized with the game's progression. It delegates the logic of determining the age to a global `getAgeByYear` function, ensuring the tribe's attributes and capabilities evolve with the game era.
   *
   * @workflow
   * 1. Assigns the result of `getAgeByYear(year)` to `this.age`.
   *
   * @param {number} year - The current game year.
   * @returns {void}
   *
   * @dependencies getAgeByYear() (global function).
   * @modifies this.age.
   * @triggers Called by `tick()`.
   * @performance O(1).
   */
  _updateAge(year) { this.age = getAgeByYear(year); }

  /**
   * Calculates and updates the tribe's overall power score.
   *
   * @description This private method aggregates various tribal statistics, such as population, military strength, technological advancement, number of buildings, and morale, into a single numerical `power` score. This score provides a simplified metric for comparing tribe strength and can influence AI decisions or game events.
   *
   * @workflow
   * 1. Calculates `this.power` using a weighted sum of:
   *    - `this.population * 0.5`
   *    - `this.military * 3`
   *    - `this.techLevel * 10`
   *    - `this.buildings.length * 6`
   *    - `this.morale * 20`
   * 2. Assigns the result to `this.power`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies None (accesses internal properties).
   * @modifies this.power.
   * @triggers Called by `tick()`.
   * @performance O(1) as it's a fixed number of calculations and property accesses.
   */
  _computePower() {
    this.power = (this.population * 0.5)
               + (this.military   * 3)
               + (this.techLevel  * 10)
               + (this.buildings.length * 6)
               + (this.morale     * 20);
  }

  // ── Population ──
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
    this._growthTimer++;
    const growRate = Math.max(4, 16 - this.techLevel);
    if (this._growthTimer < growRate) return;
    this._growthTimer = 0;

    const homes  = this.buildings.filter(b => b.type === CONFIG.ENTITY.HOME);
    const farms  = this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    const homeCap = homes.reduce((sum, h) => sum + this._homeCapacityByLevel(h.level || 1), 0);
    const ageCap = this.age.tribeMaxPop * (1 + this.techLevel * 0.05);
    const maxPop = Math.max(4, Math.min(ageCap, homeCap));
    if (this.population >= maxPop) return;

    const farmStorageCap = farms.reduce((sum, f) => sum + CONFIG.FOOD_STORAGE_PER_FARM * (f.level || 1), 0);
    const foodCap = CONFIG.FOOD_STORAGE_BASE + farmStorageCap;

    const foodFill   = Math.min(1, this.res.food / Math.max(1, foodCap));
    const diseaseDebuff = this.debuffs.disease || 0;
    const foodDebuff    = this.debuffs.food    || 0;
    const growAmt = Math.max(0, Math.floor(
      this.population * 0.10 * Math.max(0.15, foodFill) * (1 - diseaseDebuff) * (1 - foodDebuff * 0.5)
    ));
    this.population = Math.min(maxPop, this.population + growAmt);
  }

  // ── Resources ──
  /**
   * Handles the periodic collection and management of all tribe resources.
   *
   * @description This private method orchestrates the tribe's resource economy, processing food production from farms, resource collection by workers, passive resource generation, and knowledge accumulation. It accounts for building capacities, weather conditions, unit stats, and resource spoilage, ensuring the tribe's stockpiles are updated and managed each tick.
   *
   * @workflow
   * 1. Filters `this.buildings` to get all `FARM`, `HOME`, and `CAPITOL` buildings.
   * 2. Calls `this._assignFarmWorkers(farms)` to assign available workers to farms.
   * 3. Calculates `farmStorageCap` based on farm levels and sizes.
   * 4. Determines `foodCap` as `CONFIG.FOOD_STORAGE_BASE + farmStorageCap`.
   * 5. Retrieves `weatherType` from `this._world.weather` or defaults to `CONFIG.WEATHER.SUNSHINE`.
   * 6. Calls `this._getWeatherFarmTileFactor(weatherType)` to get a weather-based yield multiplier.
   * 7. Initializes `farmOutput` to 0.
   * 8. For each `f` in `farms`:
   *    a. Calls `this._ensureFarmFarmland(f)` to ensure the farm has farmland plots initialized.
   *    b. Gets the farm's `level` and assigned `workers`.
   *    c. Calculates `workerPower` based on workers' strength and agility stats.
   *    d. Calculates `workerMult` and `levelMult` for output.
   *    e. For each `plot` in `f.farmland`:
   *       i. Gets the tile type at `plot.x, plot.y` from `this._world`.
   *       ii. Calls `this._getFarmBiomeBaseYield(tile.type)` to get the biome base.
   *       iii. Calculates `perTile` yield incorporating biome, weather, level, and worker multipliers.
   *       iv. Adds `perTile` to `farmFood`.
   *    f. Adds `farmFood` to `farmOutput`.
   * 9. Retrieves `farmMult` from `this._world.weatherMods`.
   * 10. Updates `this.res.food` by adding `farmOutput * farmMult`, capped at `foodCap`.
   * 11. Applies food spoilage by reducing `this.res.food` by `CONFIG.FOOD_SPOIL_RATE`.
   * 12. Filters `this.buildings` to get all `STOREHOUSE` buildings.
   * 13. Calculates `storageCap` based on storehouse levels.
   * 14. Filters `this.units` to get all `WORKER` units.
   * 15. For each `w` in `workers`:
   *    a. Calls `this._world.harvestTile(w.x, w.y)` to attempt harvesting.
   *    b. If `gained` resources are returned:
   *       i. For each `res, amt` entry in `gained`:
   *          1. If `res` is not 'food' and exists in `this.res`, add `amt` to `this.res[res]`, capped at `storageCap`.
   *    c. If `w.state` is 'idle' and `this.res.stone` is at least 2:
   *       i. Calls `this._world.setRoad(w.x, w.y)`.
   *       ii. Reduces `this.res.stone` by 0.5.
   * 16. Calculates `passiveMult` based on `this.techLevel`.
   * 17. Increases `this.res.metal` and `this.res.stone` by a small passive amount, capped at `storageCap`.
   * 18. Increments `this._techTimer`.
   * 19. Calculates `techRate` based on `this.techLevel`.
   * 20. If `this._techTimer` is greater than or equal to `techRate`:
   *    a. Resets `this._techTimer` to 0.
   *    b. Retrieves `boost` and `penalty` from `this.debuffs` for research.
   *    c. Increases `this.knowledge` by `1 + round(boost * 3) - round(penalty * 2)`, ensuring it's not negative.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.FARM, CONFIG.ENTITY.HOME, CONFIG.ENTITY.CAPITOL, CONFIG.FOOD_STORAGE_PER_FARM, CONFIG.FOOD_STORAGE_BASE, CONFIG.WEATHER.SUNSHINE, CONFIG.TILE.GRASS, CONFIG.FOOD_SPOIL_RATE, CONFIG.ENTITY.STOREHOUSE, CONFIG.STORAGE_BASE_CAP, CONFIG.STORAGE_PER_STOREHOUSE, CONFIG.ENTITY.WORKER, this._world.weather, this._world.weatherMods, this._world.getTile(), this._world.harvestTile(), this._world.setRoad(), this._assignFarmWorkers(), this._ensureFarmFarmland(), this._getWeatherFarmTileFactor(), this._getFarmBiomeBaseYield(), Math.min(), Math.max(), Object.entries(), Math.floor().
   * @modifies this.res.food, this.res.wood, this.res.metal, this.res.stone, this.knowledge, this._techTimer, farm._workers, farm.farmland, world (by setting roads or harvesting trees), unit `w.state`.
   * @triggers Called by `tick()`.
   * @performance O(B + U + F*P) where B is buildings, U is units, F is farms, and P is plots per farm. Can be significant depending on map density and unit count.
   */
  _gatherResources() {
    const farms   = this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    const homes   = this.buildings.filter(b => b.type === CONFIG.ENTITY.HOME).length;
    const capitol = this.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL) ? 1 : 0;

    this._assignFarmWorkers(farms);

    const farmStorageCap = farms.reduce((sum, f) => sum + CONFIG.FOOD_STORAGE_PER_FARM * (f.level || 1) * (f.size || 1), 0);
    const foodCap        = CONFIG.FOOD_STORAGE_BASE + farmStorageCap;
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const weatherType = (this._world.weather && this._world.weather.type) || CONFIG.WEATHER.SUNSHINE;
    const weatherTileMult = this._getWeatherFarmTileFactor(weatherType);
    const farmOutput = farms.reduce((sum, f) => {
      this._ensureFarmFarmland(f);
      const lv = f.level || 1;
      const workers = f._workers || [];
      const workerPower = workers.reduce((wSum, w) => {
        const str = w.stats ? w.stats.strength : 5;
        const agi = w.stats ? w.stats.agility : 5;
        return wSum + (0.55 + str * 0.08 + agi * 0.04);
      }, 0);
      const workerMult = 1 + workerPower * 0.20;
      const levelMult = 0.80 + lv * 0.24;

      let farmFood = 0;
      for (const plot of f.farmland || []) {
        const tile = this._world.getTile(plot.x, plot.y);
        const biomeBase = this._getFarmBiomeBaseYield(tile ? tile.type : CONFIG.TILE.GRASS);
        const perTile = Math.max(0, Math.min(5, biomeBase * weatherTileMult * levelMult * workerMult));
        farmFood += perTile;
      }
      return sum + farmFood;
    }, 0);
    const farmMult = this._world.weatherMods ? this._world.weatherMods.farmMult : 1;
    this.res.food = Math.min(foodCap, this.res.food + farmOutput * farmMult);

    // Capitol food trickle — ensures tribes survive before first farm
    if (this.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL)) {
      this.res.food = Math.min(foodCap, this.res.food + 2);
    }

    // Food spoilage
    this.res.food = Math.max(0, this.res.food - this.res.food * CONFIG.FOOD_SPOIL_RATE);

    // Resource storage caps
    const storehouses = this.buildings.filter(b => b.type === CONFIG.ENTITY.STOREHOUSE);
    const storageCap  = CONFIG.STORAGE_BASE_CAP
      + storehouses.reduce((s, b) => s + CONFIG.STORAGE_PER_STOREHOUSE * (b.level || 1), 0);

    // Workers harvest from landscape tiles
    const workers = this.units.filter(u => u.type === CONFIG.ENTITY.WORKER);
    for (const w of workers) {
      const gained = this._world.harvestTile(w.x, w.y, 1 + this.techLevel * 0.1);
      if (gained) {
        for (const [res, amt] of Object.entries(gained)) {
          if (res === 'food') continue;
          if (res in this.res) this.res[res] = Math.min(storageCap, this.res[res] + amt);
        }
      }
      if (w.state === 'idle' && this.res.stone >= 2) {
        this._world.setRoad(w.x, w.y);
        this.res.stone = Math.max(0, this.res.stone - 0.5);
      }
    }

    // Passive trickle — fractional accumulator so low pop still produces
    const passiveMult = 1 + this.techLevel * 0.04;
    const rawPassive = this.population * 0.004 * passiveMult;
    this._metalAccum = (this._metalAccum || 0) + rawPassive;
    this._stoneAccum = (this._stoneAccum || 0) + rawPassive;
    const metalGain = Math.floor(this._metalAccum);
    const stoneGain = Math.floor(this._stoneAccum);
    this._metalAccum -= metalGain;
    this._stoneAccum -= stoneGain;
    this.res.metal = Math.min(storageCap, this.res.metal + Math.max(metalGain, 1));
    this.res.stone = Math.min(storageCap, this.res.stone + Math.max(stoneGain, 1));
    this._techTimer++;
    const techRate = Math.max(4, 14 - this.techLevel);
    if (this._techTimer >= techRate) {
      this._techTimer = 0;
      const boost   = this.debuffs.research_boost || 0;
      const penalty = this.debuffs.research_slow  || 0;
      this.knowledge += Math.max(0, 2 + Math.round(boost * 3) - Math.round(penalty * 2));
    }
  }

  // ── Building Logic ──
  /**
   * Manages the tribe's automatic construction of new buildings.
   *
   * @description This private method periodically evaluates the tribe's building needs and attempts to construct new structures based on predefined priorities and resource availability. It prioritizes expanding farmland if possible, then progresses through a sequence of essential buildings like farms, homes, storehouses, barracks, forts, towers, and walls, ensuring a balanced infrastructure development.
   *
   * @workflow
   * 1. Increments `this._buildTimer`.
   * 2. If `this._buildTimer` is less than 25, returns immediately.
   * 3. Resets `this._buildTimer` to 0.
   * 4. Calls `this._expandFarmLand()`. If it successfully expands farmland, returns immediately.
   * 5. Defines a helper function `count(type)` to count buildings of a specific type.
   * 6. Gets counts for `CAPITOL`, `FARM`, `HOME`, `BARRACKS`, `FORT`, `TOWER` buildings.
   * 7. If no capitol exists, returns immediately (critical building missing).
   * 8. Checks for various building types in a prioritized order and calls `this._buildNew()` if a need is identified and conditions (like population or existing buildings) are met:
   *    - Farms (up to 2)
   *    - Homes (up to 4)
   *    - Storehouses (up to 1)
   *    - Barracks (up to 2)
   *    - Forts (if population > 50, up to 2)
   *    - Towers (up to 5)
   *    - Barracks (if population > 80, up to 3)
   *    - Storehouses (up to 2)
   *    - Homes (if population > 80, up to 6)
   *    - Walls (if population > 80, up to 8)
   *    - Farms (if population > 100, up to 3)
   *    - Storehouses (if population > 120, up to 3)
   *    - Towers (if population > 150, up to 8)
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, this.buildings, this.population, this._expandFarmLand(), this._buildNew().
   * @modifies this._buildTimer, this.buildings, this.res (via `_buildNew`).
   * @triggers Called by `tick()`.
   * @performance O(B) where B is the number of buildings for initial filtering, then a series of O(1) checks.
   */
  _doBuildLogic() {
    this._buildTimer++;
    if (this._buildTimer < 15) return;
    this._buildTimer = 0;

    if (this._expandFarmLand()) return;

    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const count = (type) => this.buildings.filter(b => b.type === type).length;
    const hasCapitol   = count(CONFIG.ENTITY.CAPITOL)   > 0;
    const foodHalls    = count(CONFIG.ENTITY.FARM);
    const homes        = count(CONFIG.ENTITY.HOME);
    const barracksNum  = count(CONFIG.ENTITY.BARRACKS);
    const forts        = count(CONFIG.ENTITY.FORT);
    const towers       = count(CONFIG.ENTITY.TOWER);

    if (!hasCapitol) return;

    if (foodHalls < 1) return this._buildNew(CONFIG.ENTITY.FARM, false);
    if (homes < 2) return this._buildNew(CONFIG.ENTITY.HOME, false);
    const storehouses = count(CONFIG.ENTITY.STOREHOUSE);
    if (storehouses < 1) return this._buildNew(CONFIG.ENTITY.STOREHOUSE, false);
    if (barracksNum < 1) return this._buildNew(CONFIG.ENTITY.BARRACKS, false);
    if (foodHalls < 2) return this._buildNew(CONFIG.ENTITY.FARM, false);
    if (homes < 4) return this._buildNew(CONFIG.ENTITY.HOME, false);
    if (barracksNum < 2) return this._buildNew(CONFIG.ENTITY.BARRACKS, false);
    if (forts < 2 && this.population > 50) return this._buildNew(CONFIG.ENTITY.FORT, true);
    if (towers < 5) return this._buildNew(CONFIG.ENTITY.TOWER, true);
    if (barracksNum < 3 && this.population > 80) return this._buildNew(CONFIG.ENTITY.BARRACKS, false);
    if (storehouses < 2) return this._buildNew(CONFIG.ENTITY.STOREHOUSE, false);
    if (homes < 6 && this.population > 80) return this._buildNew(CONFIG.ENTITY.HOME, false);
    const walls = count(CONFIG.ENTITY.WALL);
    if (walls < 8 && this.population > 80) return this._buildNew(CONFIG.ENTITY.WALL, true);
    if (foodHalls < 3 && this.population > 100) return this._buildNew(CONFIG.ENTITY.FARM, false);
    if (storehouses < 3 && this.population > 120) return this._buildNew(CONFIG.ENTITY.STOREHOUSE, false);
    if (towers < 8 && this.population > 150) return this._buildNew(CONFIG.ENTITY.TOWER, true);
  }

  /**
   * Checks if the tribe can afford a given set of resources.
   *
   * @description This private helper function iterates through a provided cost object, which maps resource names to required amounts. For each resource, it checks if the tribe's current stockpile is greater than or equal to the required amount. If any resource requirement is not met, the function immediately returns `false`.
   *
   * @workflow
   * 1. For each `[res, amt]` pair in `costObj`:
   *    a. If `this.res[res]` (or 0 if undefined) is less than `amt`, returns `false`.
   * 2. If all resource requirements are met, returns `true`.
   *
   * @param {Object.<string, number>} costObj - An object mapping resource names to their required amounts.
   * @returns {boolean} True if the tribe can afford all resources, false otherwise.
   *
   * @dependencies Object.entries().
   * @modifies None.
   * @triggers Called by `_doBuildLogic()`, `_buildNew()`, `_expandFarmLand()`, `_doUpgradeLogic()`, `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in `costObj` (usually a small constant).
   */
  _canAfford(costObj) {
    for (const [res, amt] of Object.entries(costObj)) {
      if ((this.res[res] || 0) < amt) return false;
    }
    return true;
  }

  /**
   * Deducts the specified resource costs from the tribe's stockpiles.
   *
   * @description This private helper function iterates through a provided cost object and subtracts the corresponding amounts from the tribe's resources. It ensures that resource values do not drop below zero, effectively consuming the resources required for a building, upgrade, or other action.
   *
   * @workflow
   * 1. For each `[res, amt]` pair in `costObj`:
   *    a. Subtracts `amt` from `this.res[res]`.
   *    b. Ensures `this.res[res]` is not less than 0 by clamping it with `Math.max(0, ...)`.
   *
   * @param {Object.<string, number>} costObj - An object mapping resource names to their amounts to be deducted.
   * @returns {void}
   *
   * @dependencies Math.max(), Object.entries().
   * @modifies this.res (for affected resources).
   * @triggers Called by `_buildNew()`, `_expandFarmLand()`, `_doUpgradeLogic()`, `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in `costObj` (usually a small constant).
   */
  _payCost(costObj) {
    for (const [res, amt] of Object.entries(costObj)) {
      this.res[res] = Math.max(0, (this.res[res] || 0) - amt);
    }
  }

  /**
   * Attempts to expand the farmland of an existing farm building.
   *
   * @description This private method periodically tries to increase the number of farm plots for a suitable farm. It prioritizes farms with the smallest current size, checks if the tribe can afford the expansion cost and has enough population, then attempts to find a new walkable plot adjacent to the farm. If successful, it updates the farm's properties and logs the event.
   *
   * @workflow
   * 1. Filters `this.buildings` to get all `FARM` buildings.
   * 2. If no farms exist, returns `false`.
   * 3. Filters farms into `candidates` that have not reached their `_getFarmMaxTiles` capacity.
   * 4. Sorts `candidates` by current farm size in ascending order.
   * 5. If no `candidates` are found, returns `false`.
   * 6. Selects the first farm `f` from `candidates`.
   * 7. Calls `this._ensureFarmFarmland(f)` to initialize farmland if it's missing.
   * 8. Calculates `nextSize` (current size + 1).
   * 9. Calculates `cost` for the expansion based on `nextSize`.
   * 10. Calls `this._canAfford(cost)`. If `false`, returns `false`.
   * 11. If `this.population` is less than the required amount (`45 + nextSize * 12`), returns `false`.
   * 12. Calls `this._findExpandableFarmPlot(f)` to find a suitable new plot. If `null`, returns `false`.
   * 13. Calls `this._payCost(cost)` to deduct resources.
   * 14. Updates `f.size` to `nextSize`.
   * 15. Adds `newPlot` to `f.farmland`.
   * 16. Increases `f.maxHp` and `f.hp`.
   * 17. Logs the expansion event using `Game.eventLog()`.
   * 18. Returns `true`.
   *
   * @param {void} -
   * @returns {boolean} True if farmland was successfully expanded, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.FARM, Game.eventLog(), this.buildings, this.population, this._getFarmMaxTiles(), this._ensureFarmFarmland(), this._canAfford(), this._findExpandableFarmPlot(), this._payCost(), Math.floor().
   * @modifies f.size, f.farmland, f.maxHp, f.hp, this.res (via `_payCost`).
   * @triggers Called by `_doBuildLogic()`.
   * @performance O(B) for filtering and sorting buildings, then O(N) for `_findExpandableFarmPlot` where N is neighbors, in the worst case might iterate around existing farmland. Overall bounded by B.
   */
  _expandFarmLand() {
    const farms = this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    if (!farms.length) return false;

    const candidates = farms
      .filter(f => (f.size || 1) < this._getFarmMaxTiles(f.level || 1))
      .sort((a, b) => (a.size || 1) - (b.size || 1));
    if (!candidates.length) return false;

    const f = candidates[0];
    this._ensureFarmFarmland(f);
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const nextSize = (f.size || 1) + 1;
    const cost = {
      wood: 14 * nextSize,
      stone: 8 * nextSize,
      food: 10 * nextSize,
      metal: 0,
    };

    if (!this._canAfford(cost)) return false;
    if (this.population < 45 + nextSize * 12) return false;

    const newPlot = this._findExpandableFarmPlot(f);
    if (!newPlot) return false;

    this._payCost(cost);
    f.size = nextSize;
    f.farmland.push(newPlot);
    f.maxHp += 50;
    f.hp = Math.min(f.maxHp, f.hp + 30);
    Game.eventLog(`${this.name} expands a farm to size ${nextSize}.`, 'good');
    return true;
  }

  /**
   * Assigns available worker units to farms based on proximity and capacity.
   *
   * @description This private method distributes idle worker units among existing farm buildings to maximize food production. It clears previous worker assignments, identifies all available workers, and then iterates through each farm, sorting workers by distance and assigning them up to the farm's capacity. Assigned workers have their state updated to 'working_farm'.
   *
   * @workflow
   * 1. If no `farms` are provided, returns immediately.
   * 2. For each `f` in `farms`, clears its `_workers` array.
   * 3. Filters `this.units` to get all `WORKER` units and creates a shallow copy `available`.
   * 4. For each `f` in `farms`:
   *    a. Calls `this._ensureFarmFarmland(f)` to ensure farmland is initialized.
   *    b. Calculates `cap`, the maximum workers for the farm based on its size and level.
   *    c. Sorts `available` workers by their squared distance to the farm `f` in ascending order.
   *    d. Iterates through sorted `available` workers from end to start (closest first):
   *       i. Selects worker `w`.
   *       ii. Calculates `dist` from `w` to `f`.
   *       iii. If `dist` is too far (`> 4 + (f.size || 1) * 0.8`), continues to the next worker.
   *       iv. Adds `w` to `f._workers`.
   *       v. If `w.state` is 'idle', sets `w.state` to 'working_farm'.
   *       vi. Removes `w` from `available`.
   *
   * @param {Array<Object>} farms - An array of farm building objects.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.WORKER, this.units, this._ensureFarmFarmland(), Math.min(), Math.sqrt().
   * @modifies farm._workers for each farm, unit.state for assigned workers, available array (by splicing).
   * @triggers Called by `_gatherResources()`.
   * @performance O(F * W log W) where F is the number of farms and W is the number of workers, due to sorting workers for each farm.
   */
  _assignFarmWorkers(farms) {
    if (!farms.length) return;

    for (const f of farms) f._workers = [];

    const workers = this.units.filter(u => u.type === CONFIG.ENTITY.WORKER);
    const available = workers.slice();

    for (const f of farms) {
      this._ensureFarmFarmland(f);
      const cap = Math.min(8, 2 + (f.size || 1) * 2 + (f.level || 1));
      available.sort((a, b) => {
        /**
         * One-line summary.
         *
         * @description MANDATORY detailed explanation (2-5 sentences).
         *
         * @workflow
         * 1. Specific numbered steps
         * 2. Include conditionals and loops
         *
         * @param {Type} name - Description
         * @returns {Type} Description
         *
         * @dependencies stateManager.get(), etc.
         * @modifies What state/DOM changes
         * @triggers When/how called
         * @performance O(n) complexity notes
         */
        const da = (a.x - f.x) ** 2 + (a.y - f.y) ** 2;
        /**
         * One-line summary.
         *
         * @description MANDATORY detailed explanation (2-5 sentences).
         *
         * @workflow
         * 1. Specific numbered steps
         * 2. Include conditionals and loops
         *
         * @param {Type} name - Description
         * @returns {Type} Description
         *
         * @dependencies stateManager.get(), etc.
         * @modifies What state/DOM changes
         * @triggers When/how called
         * @performance O(n) complexity notes
         */
        const db = (b.x - f.x) ** 2 + (b.y - f.y) ** 2;
        return da - db;
      });

      for (let i = available.length - 1; i >= 0 && f._workers.length < cap; i--) {
        const w = available[i];
        const dist = Math.sqrt((w.x - f.x) ** 2 + (w.y - f.y) ** 2);
        if (dist > 4 + (f.size || 1) * 0.8) continue;
        f._workers.push(w);
        if (w.state === 'idle') w.state = 'working_farm';
        available.splice(i, 1);
      }
    }
  }

  /**
   * Attempts to build a new structure of a specified type at a suitable location.
   *
   * @description This private method handles the logic for placing new buildings. It first checks if the tribe can afford the building's cost. If so, it randomly selects an existing building as an anchor, calculates a potential new position, finds the nearest walkable and unoccupied tile, and then places the new building, deducting the resources and logging the event.
   *
   * @workflow
   * 1. Retrieves `cost` for `type` from `CONFIG.BUILDING_COST`.
   * 2. If `cost` is not defined or `this._canAfford(cost)` returns `false`, returns immediately.
   * 3. Selects a random `anchor` building from `this.buildings`.
   * 4. Calculates `dx` and `dy` for a new position relative to the anchor, with an `ox` offset depending on the tribe's `id` and `facingEnemy` flag for strategic placement.
   * 5. Calculates `nx`, `ny` (potential new coordinates).
   * 6. Calls `this._world.findNearestWalkable(nx, ny)` to find a valid position `p`.
   * 7. If `p` is null, returns immediately.
   * 8. Calls `this._world.getEntitiesAt(p.x, p.y)` to check for occupied tiles.
   * 9. If any existing building entity is at `p.x, p.y`, returns immediately.
   * 10. Calls `this._placeBuilding(p.x, p.y, type)` to create the building.
   * 11. Calls `this._payCost(cost)` to deduct resources.
   * 12. Formats a resource string for logging.
   * 13. Logs the building event using `Game.eventLog()`.
   *
   * @param {string} type - The type of building to construct (e.g., `CONFIG.ENTITY.FARM`).
   * @param {boolean} facingEnemy - A flag indicating if the building should be placed closer to the enemy border.
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_COST, CONFIG.BUILDING_HP, Game.eventLog(), this.buildings, this.id, this._world.findNearestWalkable(), this._world.getEntitiesAt(), this._canAfford(), this._payCost(), this._placeBuilding(), Math.floor(), Math.random(), Object.entries().
   * @modifies this.buildings, this.res (via `_payCost`), world (via `_placeBuilding`).
   * @triggers Called by `_doBuildLogic()`.
   * @performance O(B) in worst case for checking entities at a location. Finding nearest walkable is O(W) (bounded by world size). Random selection and fixed operations are O(1).
   */
  _buildNew(type, facingEnemy) {
    const cost = CONFIG.BUILDING_COST[type];
    if (!cost || !this._canAfford(cost)) return;

    const anchor = this.buildings[Math.floor(Math.random() * this.buildings.length)];
    const ox = this.id === 'a' ? 1 : -1;
    const spread = facingEnemy ? ox * (3 + Math.floor(Math.random() * 5)) : ox * -(Math.floor(Math.random() * 4));
    const dx = spread + Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 7) - 3;
    const nx = anchor.x + dx, ny = anchor.y + dy;
    const p = this._world.findNearestWalkable(nx, ny);
    if (!p) return;

    const occupied = this._world.getEntitiesAt(p.x, p.y);
    if (occupied.some(e => e.type && CONFIG.BUILDING_HP[e.type])) return;

    this._placeBuilding(p.x, p.y, type);
    this._payCost(cost);
    const resStr = Object.entries(cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
    Game.eventLog(`${this.name} builds a ${type.replace('_', ' ')}${resStr ? ' (' + resStr + ')' : ''}.`);
  }

  // ── Building Upgrades ──
  /**
   * Manages the tribe's automatic upgrading of existing buildings.
   *
   * @description This private method periodically assesses which buildings are eligible for an upgrade and attempts to perform one. It prioritizes upgrading key defensive and resource-related buildings, checking resource affordability, and then applies the upgrade, increasing the building's level, maximum HP, and current HP, and logs the event.
   *
   * @workflow
   * 1. Increments `this._upgradeTimer`.
   * 2. If `this._upgradeTimer` is less than 40, returns immediately.
   * 3. Resets `this._upgradeTimer` to 0.
   * 4. Filters `this.buildings` to create an `upgradeable` list, including only buildings whose `level` is less than their `CONFIG.BUILDING_MAX_LEVEL`.
   * 5. If `upgradeable` is empty, returns immediately.
   * 6. Defines a `priority` array for building types (Capitol first, then Storehouse, Tower, Fort, Barracks, Farm, Wall, Home).
   * 7. Sorts `upgradeable` buildings based on the `priority` order.
   * 8. Selects the first `candidate` building from the sorted list.
   * 9. Calls `this._upgradeCost(candidate)` to determine the cost.
   * 10. Calls `this._canAfford(cost)`. If `false`, returns immediately.
   * 11. Calls `this._payCost(cost)` to deduct resources.
   * 12. Increments `candidate.level`.
   * 13. Calculates `baseHp` from `CONFIG.BUILDING_HP` for the building type.
   * 14. Updates `candidate.maxHp` based on `baseHp` and new level.
   * 15. Updates `candidate.hp` by adding a portion of `baseHp`, capped at `maxHp`.
   * 16. Logs the upgrade event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_MAX_LEVEL, CONFIG.BUILDING_HP, CONFIG.ENTITY constants, Game.eventLog(), this.buildings, this._upgradeCost(), this._canAfford(), this._payCost(), Math.round(), Math.min().
   * @modifies this._upgradeTimer, building.level, building.maxHp, building.hp for the upgraded building, this.res (via `_payCost`).
   * @triggers Called by `tick()`.
   * @performance O(B log B) where B is the number of buildings, due to filtering and sorting.
   */
  _doUpgradeLogic() {
    this._upgradeTimer++;
    if (this._upgradeTimer < 40) return;
    this._upgradeTimer = 0;

    const upgradeable = this.buildings.filter(b => {
      const maxLv = CONFIG.BUILDING_MAX_LEVEL[b.type] || 1;
      return (b.level || 1) < maxLv;
    });
    if (!upgradeable.length) return;

    const priority = [CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.STOREHOUSE, CONFIG.ENTITY.TOWER,
              CONFIG.ENTITY.FORT, CONFIG.ENTITY.BARRACKS, CONFIG.ENTITY.FARM,
              CONFIG.ENTITY.WALL, CONFIG.ENTITY.HOME];
    upgradeable.sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));

    const candidate = upgradeable[0];
    const cost = this._upgradeCost(candidate);
    if (!this._canAfford(cost)) return;

    this._payCost(cost);
    candidate.level = (candidate.level || 1) + 1;
    const baseHp = CONFIG.BUILDING_HP[candidate.type] || 200;
    candidate.maxHp = Math.round(baseHp * (1 + (candidate.level - 1) * 0.25));
    candidate.hp = Math.min(candidate.maxHp, candidate.hp + baseHp * 0.25);
    Game.eventLog(`${this.name} upgrades ${candidate.type.replace('_',' ')} to level ${candidate.level}.`, 'good');
  }

  /**
   * Calculates the resource cost for upgrading a specific building to its next level.
   *
   * @description This private helper function determines the resources required to upgrade a given building. It starts with the building's base construction cost, applies a level-based multiplier, and then ensures certain minimum costs for wood and stone are met, making upgrades progressively more expensive.
   *
   * @workflow
   * 1. Retrieves `base` cost from `CONFIG.BUILDING_COST` for the `building.type`, defaulting to a generic cost.
   * 2. Gets the current `lv` (level) of the building.
   * 3. Calculates `mult` using `CONFIG.BUILDING_UPGRADE_MULT` and the current `lv`.
   * 4. Initializes an empty `cost` object.
   * 5. For each `[res, amt]` pair in `base` cost:
   *    a. Calculates `cost[res]` by multiplying `amt` by `mult` and rounding up.
   * 6. Ensures `cost.wood` is at least `30 * lv`.
   * 7. Ensures `cost.stone` is at least `20 * lv`.
   * 8. Returns the calculated `cost` object.
   *
   * @param {Object} building - The building object for which to calculate upgrade costs. Must have `type` and `level` properties.
   * @returns {Object.<string, number>} An object mapping resource names to their required amounts for the upgrade.
   *
   * @dependencies CONFIG.BUILDING_COST, CONFIG.BUILDING_UPGRADE_MULT, Math.ceil(), Math.max(), Object.entries().
   * @modifies None.
   * @triggers Called by `_doUpgradeLogic()` and `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in the base cost (usually a small constant).
   */
  _upgradeCost(building) {
    const base = CONFIG.BUILDING_COST[building.type] || { wood: 20, metal: 10, stone: 10 };
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const lv = (building.level || 1);
    const mult = CONFIG.BUILDING_UPGRADE_MULT * lv;
    const cost = {};
    for (const [res, amt] of Object.entries(base)) {
      cost[res] = Math.ceil(amt * mult);
    }
    cost.wood  = Math.max(cost.wood  || 0, 30 * lv);
    cost.stone = Math.max(cost.stone || 0, 20 * lv);
    return cost;
  }

  /**
   * Externally callable method to upgrade a specific building if conditions are met.
   *
   * @description This public API method allows external game systems (e.g., player interaction) to initiate a building upgrade for a specific building belonging to this tribe. It performs checks for ownership, maximum level, and resource affordability, then applies the upgrade, increasing the building's level and health attributes.
   *
   * @workflow
   * 1. If `building` is null or its `tribe` ID does not match `this.id`, returns immediately.
   * 2. Retrieves `maxLv` from `CONFIG.BUILDING_MAX_LEVEL` for the building type.
   * 3. If `building.level` is already greater than or equal to `maxLv`, returns immediately.
   * 4. Calls `this._upgradeCost(building)` to get the upgrade cost.
   * 5. Calls `this._canAfford(cost)`. If `false`, returns immediately.
   * 6. Calls `this._payCost(cost)` to deduct resources.
   * 7. Increments `building.level`.
   * 8. Calculates `baseHp` from `CONFIG.BUILDING_HP`.
   * 9. Updates `building.maxHp` based on `baseHp` and the new `level`.
   * 10. Updates `building.hp` by adding a portion of `baseHp`, capped at `building.maxHp`.
   *
   * @param {Object} building - The building object to upgrade. Must belong to this tribe.
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_MAX_LEVEL, CONFIG.BUILDING_HP, this.id, this._upgradeCost(), this._canAfford(), this._payCost(), Math.round(), Math.min().
   * @modifies building.level, building.maxHp, building.hp, this.res (via `_payCost`).
   * @triggers Called by player actions or other external game systems.
   * @performance O(1) for checks and calculations.
   */
  upgradeBuilding(building) {
    if (!building || building.tribe !== this.id) return;
    const maxLv = CONFIG.BUILDING_MAX_LEVEL[building.type] || 1;
    if ((building.level || 1) >= maxLv) return;
    const cost = this._upgradeCost(building);
    if (!this._canAfford(cost)) return;
    this._payCost(cost);
    building.level = (building.level || 1) + 1;
    const baseHp = CONFIG.BUILDING_HP[building.type] || 200;
    building.maxHp = Math.round(baseHp * (1 + (building.level - 1) * 0.25));
    building.hp = Math.min(building.maxHp, building.hp + baseHp * 0.25);
  }

  // ── Military Spawning ──
  /**
   * Manages the periodic spawning of military and worker units.
   *
   * @description This private method periodically assesses the tribe's unit composition and attempts to spawn new units like warriors, leaders, workers, and scouts. It checks for sufficient food and population, availability of barracks or capitol, and resource costs, ensuring that the tribe maintains a balanced and growing force based on strategic needs and resources.
   *
   * @workflow
   * 1. Increments `this._militaryTimer`.
   * 2. Calculates `spawnRate` based on `this.techLevel`, clamped between 5 and 30.
   * 3. If `this._militaryTimer` is less than `spawnRate`, returns immediately.
   * 4. Resets `this._militaryTimer` to 0.
   * 5. If `this.res.food` is less than 5 or `this.population` is less than 6, returns immediately.
   * 6. Filters `this.buildings` to find `BARRACKS` and `CAPITOL` buildings.
   * 7. Counts existing `WARRIOR`, `WORKER`, `SCOUT`, and `LEADER` units.
   * 8. Calculates `maxWarriors`, `maxWorkers`, `maxScouts`, `maxLeaders` based on population, barracks count, and tech level.
   * 9. If barracks exist, warriors are below `maxWarriors`, and `this.res.metal` is sufficient:
   *    a. Selects a random barracks `b`.
   *    b. Calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR)`.
   *    c. Deducts food (5) and metal (3) resources.
   *    d. Returns.
   * 10. If barracks exist, leaders are below `maxLeaders`, a random check passes (0.18 chance), and `this.res.metal` is sufficient:
   *    a. Selects the first barracks `b`.
   *    b. Calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.LEADER)`.
   *    c. Deducts food (12) and metal (10) resources.
   *    d. Returns.
   * 11. If capitol exists, workers are below `maxWorkers`, a random check passes (0.50 chance), and `this.res.wood` is sufficient:
   *    a. Calls `this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.WORKER)`.
   *    c. Deducts wood (5) resource.
   *    d. Returns.
   * 12. If capitol exists, scouts are below `maxScouts`, a random check passes (0.40 chance), and `this.res.food` is sufficient:
   *    a. Calls `this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.SCOUT)`.
   *    b. Deducts food (5) resource.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, this.res, this.population, this.techLevel, this.buildings, this.units, this._spawnUnit(), Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies this._militaryTimer, this.res.food, this.res.metal, this.res.wood, this.units, world (via `_spawnUnit`).
   * @triggers Called by `tick()`.
   * @performance O(U + B) where U is the number of units and B is the number of buildings (for filtering).
   */
  _doMilitaryLogic() {
    this._militaryTimer++;
    const spawnRate = Math.max(5, 30 - this.techLevel * 2);
    if (this._militaryTimer < spawnRate) return;
    this._militaryTimer = 0;
    if (this.res.food < 5 || this.population < 6) return;

    const barracks = this.buildings.filter(b => b.type === CONFIG.ENTITY.BARRACKS);
    const capitol  = this.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL);

    const warriors = this.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR).length;
    const workers  = this.units.filter(u => u.type === CONFIG.ENTITY.WORKER).length;
    const scouts   = this.units.filter(u => u.type === CONFIG.ENTITY.SCOUT).length;
    const leaders  = this.units.filter(u => u.type === CONFIG.ENTITY.LEADER).length;

    const maxWarriors = Math.min(200, Math.floor(this.population * 0.38) + barracks.length * 12 + this.techLevel * 3);
    const maxWorkers  = Math.min(30, 6 + this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM).length * 3);
    const maxScouts   = Math.min(25, 5 + Math.floor(this.population / 35));
    const maxLeaders  = Math.max(1, Math.floor(this.population / 30));

    if (barracks.length && warriors < maxWarriors && this.res.metal >= 3) {
      const b = barracks[Math.floor(Math.random() * barracks.length)];
      this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR);
      this.res.food  = Math.max(0, this.res.food  - 5);
      this.res.metal = Math.max(0, this.res.metal - 3);
      return;
    }

    if (barracks.length && leaders < maxLeaders && Math.random() < 0.18 && this.res.metal >= 10) {
      const b = barracks[0];
      this._spawnUnit(b.x, b.y, CONFIG.ENTITY.LEADER);
      this.res.food  = Math.max(0, this.res.food  - 12);
      this.res.metal = Math.max(0, this.res.metal - 10);
      return;
    }

    if (capitol && workers < maxWorkers && Math.random() < 0.50 && this.res.wood >= 5) {
      this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.WORKER);
      this.res.wood = Math.max(0, this.res.wood - 5);
      return;
    }

    if (capitol && scouts < maxScouts && Math.random() < 0.40 && this.res.food >= 5) {
      this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.SCOUT);
      this.res.food = Math.max(0, this.res.food - 5);
    }
  }

  // ── Attack Logic ──
  /**
   * Coordinates the tribe's offensive military actions against the enemy.
   *
   * @description This private method periodically decides whether to launch an attack and, if so, which enemy building to target and which units to send. It considers factors like attack frequency, morale, and the availability of idle warriors, leaders, and scouts. It then assigns marching orders to the selected units, directing them towards the target and logging the offensive action.
   *
   * @workflow
   * 1. Increments `this._attackTimer`.
   * 2. Calculates `aggRate` based on `this.techLevel`, clamped between 12 and 70.
   * 3. If `this._attackTimer` is less than `aggRate`, returns immediately.
   * 4. Resets `this._attackTimer` to 0.
   * 5. Retrieves `moralePenalty` from `this.debuffs`.
   * 6. If a random check (`Math.random() < moralePenalty * 0.5`) indicates a morale-based deterrence, returns immediately.
   * 7. Filters `this.units` to find idle `WARRIOR` units.
   * 8. If fewer than 2 idle warriors are available, returns immediately.
   * 9. If the `_enemy.buildings` array is empty, returns immediately (no targets).
   * 10. Defines a `priorityOrder` for enemy building types to target (Capitol, Barracks, Farm, Fort, Storehouse).
   * 11. Initializes `target` to `null`.
   * 12. For each `ptype` in `priorityOrder`:
   *    a. Filters `_enemy.buildings` for `opts` of that `ptype`.
   *    b. If `opts` are found, selects a random `target` from `opts` and breaks the loop.
   * 13. If no prioritized `target` was found, selects a random building from `_enemy.buildings`.
   * 14. Calculates `maxGroup` size based on idle warriors, tech level, and population percentage.
   * 15. Creates `group` by taking `maxGroup` idle warriors.
   * 16. Finds an idle `LEADER` unit. If found, adds it to `group`.
   * 17. Finds up to 2 idle `SCOUT` units. Adds them to `group`.
   * 18. For each `u` in `group`:
   *    a. Sets `u.state` to 'marching'.
   *    b. Sets `u.targetX` and `u.targetY` to coordinates near the `target` building.
   * 19. If a random check passes (0.35 chance), logs an attack message using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, Game.eventLog(), this.debuffs, this.units, this.techLevel, this.population, this._enemy.buildings, Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies this._attackTimer, unit.state, unit.targetX, unit.targetY for selected units.
   * @triggers Called by `tick()`.
   * @performance O(U + B) where U is the number of units and B is the number of enemy buildings, due to filtering and iterating.
   */
  _doAttackLogic() {
    this._attackTimer++;
    const aggRate = Math.max(12, 70 - this.techLevel * 6);
    if (this._attackTimer < aggRate) return;
    this._attackTimer = 0;

    const moralePenalty = this.debuffs.morale_loss || 0;
    if (Math.random() < moralePenalty * 0.5) return;

    const idleWarriors = this.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR && u.state === 'idle');
    if (idleWarriors.length < 2) return;

    if (!this._enemy.buildings.length) return;

    const priorityOrder = [
      CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.BARRACKS, CONFIG.ENTITY.FARM,
      CONFIG.ENTITY.FORT, CONFIG.ENTITY.STOREHOUSE,
    ];
    let target = null;
    for (const ptype of priorityOrder) {
      const opts = this._enemy.buildings.filter(b => b.type === ptype);
      if (opts.length) { target = opts[Math.floor(Math.random() * opts.length)]; break; }
    }
    if (!target) target = this._enemy.buildings[Math.floor(Math.random() * this._enemy.buildings.length)];

    const maxGroup = Math.min(idleWarriors.length, 3 + Math.floor(this.techLevel * 1.5) + Math.floor(idleWarriors.length * 0.5));
    const group = idleWarriors.slice(0, maxGroup);

    const idleLeader = this.units.find(u => u.type === CONFIG.ENTITY.LEADER && u.state === 'idle');
    if (idleLeader) group.push(idleLeader);

    const idleScouts = this.units.filter(u => u.type === CONFIG.ENTITY.SCOUT && u.state === 'idle').slice(0, 2);
    group.push(...idleScouts);

    group.forEach(u => {
      u.state = 'marching';
      u.targetX = target.x + Math.floor(Math.random() * 3) - 1;
      u.targetY = target.y + Math.floor(Math.random() * 3) - 1;
    });

    if (Math.random() < 0.35) {
      const msgs = [
        `${this.name} launches an assault! ${group.length} fighters march on ${this._enemy.name}'s ${target.type.replace('_',' ')}.`,
        `${this.name} warriors advance on ${this._enemy.name}. War drums beat across the land.`,
        `${this.name} sends ${group.length} soldiers to destroy a ${this._enemy.name} ${target.type.replace('_',' ')}.`,
      ];
      Game.eventLog(msgs[Math.floor(Math.random() * msgs.length)], 'danger');
    }
  }

  // ── Unit AI ──
  /**
   * Iterates through all tribe units, updating their state, movement, and combat actions.
   *
   * @description This comprehensive private method is the core AI logic for individual units. It processes movement timers, handles hunger-driven movement, and defines specific behaviors for warriors, leaders (marching, fighting, retreating, defecting), workers (resource gathering, repairing, planting), scouts (patrolling, detecting enemies), and normal units (wandering). It also manages unit health, attacks, and despawning upon death or defection.
   *
   * @workflow
   * 1. Iterates backwards through `this.units` array:
   *    a. Selects unit `u`.
   *    b. Ensures `u.stats` are initialized by calling `this._rollUnitStats()`.
   *    c. Calculates `baseMI` (move interval) based on unit type.
   *    d. Retrieves `weatherMult` from `this._world.weatherMods`.
   *    e. Gets the tile `u` is on and determines `roadDiv` if a road is present.
   *    f. Calls `this._agilityFactor(stats)` to get an agility-based multiplier.
   *    g. Calculates `moveInterval` (clamped between 1 and `baseMI` * multipliers).
   *    h. Increments `u._moveTimer`.
   *    i. Sets `canAct` if `u._moveTimer` meets `moveInterval`. If `canAct`, resets `u._moveTimer`.
   *    j. If `u` has `_pauseTicks` and it's greater than 0:
   *       i. Decrements `u._pauseTicks` and continues to next unit.
   *    k. If `u.state` is not 'fighting' and `canAct`:
   *       i. If a random check passes (chance based on unit type), sets `u._pauseTicks` for a short duration and continues.
   *    l. If `u` has `_hungerTarget` and `u.state` is not 'fighting':
   *       i. If `canAct`, calls `this._stepTowardVaried(u, u._hungerTarget.x, u._hungerTarget.y)`.
   *       ii. If `u` is close to `_hungerTarget`, clears `u._hungerTarget` and continues.
   *    m. If `u.type` is `WARRIOR` or `LEADER`:
   *       i. If `u.state` is 'marching' and `canAct`:
   *          1. If `u` is close to `u.targetX, u.targetY`, sets `u.state` to 'fighting'.
   *          2. Else, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       ii. If `u.state` is 'fighting':
   *          1. If not `canAct`, continues.
   *          2. Calls `this._tryDefect(u)`. If `true`:
   *             A. Calls `this._despawnUnitAtIndex(i)`.
   *             B. Adds `u` to `_enemy.units`.
   *             C. Recalculates `_enemy.military` and `this.military`.
   *             D. Continues to next unit.
   *          3. Calls `this._shouldRetreat(u)`. If `true`:
   *             A. Sets `u.state` to 'idle', clears `u.attackTarget`.
   *             B. Continues.
   *          4. Checks for `leaderNearby` and calculates `leaderBonus`.
   *          5. Filters `_enemy.units` and `_enemy.buildings` within range.
   *          6. Calculates `atkPower` based on unit stats, tech level, and leader strength/bonus.
   *          7. If `enemyUnits` are found:
   *             A. Selects first `tgt`.
   *             B. Calculates `dmg`, applies defense reduction to `tgt.hp`.
   *             C. Sets `u.attackTarget`.
   *             D. If `tgt.hp <= 0`, despawns `tgt` from enemy, increments enemy casualties, logs kill message.
   *             E. Calculates `retaliation` damage, applies defense reduction to `u.hp`.
   *          8. Else if `enemyBuildings` are found:
   *             A. Selects first `bld`.
   *             B. Calculates `bldDmg`, applies it to `bld.hp`.
   *             C. Sets `u.attackTarget`, sets `bld._underAttack` timer.
   *             D. If `bld.hp <= 0`, removes `bld` from enemy buildings, logs destroy message.
   *             E. Reduces `u.hp` by a small amount.
   *          9. Else (no enemies in range), sets `u.state` to 'idle', clears `u.attackTarget`.
   *       iii. If `u.hp <= 0` (after fighting or retaliation):
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Increments `this.casualties`.
   *          3. Recalculates `this.military`.
   *    n. If `u.type` is `WORKER`:
   *       i. Finds `STOREHOUSE` buildings and calculates `storageCap`.
   *       ii. Finds `nearTree` within range.
   *       iii. If `nearTree` exists and `this.res.wood` is below 80% capacity:
   *          1. If `u` is at `nearTree`'s location: harvests tree, updates `this.res.wood`, potentially plants new tree.
   *          2. Else if `canAct`, calls `this._stepTowardVaried(u, nearTree.x, nearTree.y)` and sets `u.state` to 'working'.
   *          3. Continues.
   *       iv. If `this.res.wood` is low and `canAct` (10% chance), randomly plants a tree.
   *       v. Finds `damaged` buildings (hp < maxHp), sorted by health fraction.
   *       vi. If `damaged` buildings exist:
   *          1. Selects `target`.
   *          2. If `u` is close to `target`: if `canAct`, repairs building using `_getWorkerBuildSpeed`, updates `target.hp`.
   *          3. Else if `canAct`: calls `this._stepTowardVaried(u, target.x, target.y)`.
   *          4. Sets `u.state` to 'working'.
   *       vii. Else (no work):
   *          1. If `canAct` (15% chance), sets `u.targetX, u.targetY` to a random spot around capitol.
   *          2. If `canAct` and `u.targetX` is defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *          3. Sets `u.state` to 'idle'.
   *    o. If `u.type` is `SCOUT`:
   *       i. If not `canAct`, continues.
   *       ii. Checks for `closeEnemy` within range.
   *       iii. If `closeEnemy` found: attacks it, applies damage, sets `u.attackTarget`. If enemy dies, despawns it from enemy, increments enemy casualties, recalculates enemy military. Continues.
   *       iv. Calculates `distToMid` based on `u.x` and `CONFIG.MAP_W`.
   *       v. If `u.state` is 'idle' or `u.patrolDir` is not set: sets `u.patrolDir` based on distance to map center, sets `u.state` to 'patrolling'.
   *       vi. If `u.state` is 'patrolling':
   *          1. Calculates `tx, ty` for movement.
   *          2. If `_world.isWalkable(tx, ty)`, moves `u` and notifies `_world`.
   *          3. Checks for `nearEnemy` within range. If found (5% chance), logs warning.
   *          4. Adjusts `u.patrolDir` if `u` is too close or far from map center.
   *    p. If `u.type` is `NORMAL`:
   *       i. If not `canAct`, continues.
   *       ii. If `u.state` is 'idle' (28% chance), finds a home or first building, sets `u.targetX, u.targetY` to a random spot around it, and sets `u.state` to 'wandering'.
   *       iii. If `u.targetX, u.targetY` are defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       iv. If `u` is close to target, sets `u.state` to 'idle'.
   * 2. Recalculates `this.military` after the loop.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, CONFIG.SCOUT_MOVE_INTERVAL, CONFIG.UNIT_MOVE_INTERVAL, CONFIG.UNIT_ROAD_DIVISOR, CONFIG.UNIT_HP, CONFIG.UNIT_STATS_BASE, CONFIG.MAP_W, Game.eventLog(), this.units, this.buildings, this._world.weatherMods, this._world.getTile(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), this._world.getEntitiesAt(), this._world.getNearbyTree(), this._world.harvestTree(), this._world.plantTree(), this._enemy.units, this._enemy.buildings, this._enemy._despawnUnitByObject(), this._rollUnitStats(), this._agilityFactor(), this._stepTowardVaried(), this._tryDefect(), this._shouldRetreat(), this._nearbyLeader(), this._getUnitAttackValue(), this._applyDefenseReduction(), this._despawnUnitAtIndex(), this._getWorkerBuildSpeed(), Math.abs(), Math.sqrt(), Math.round(), Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies unit._moveTimer, unit._pauseTicks, unit._hungerTarget, unit.state, unit.targetX, unit.targetY, unit.attackTarget, unit.hp, unit.tribe, this.res.wood, this.res.food, this.units, this.military, this.casualties, this._enemy.units, this._enemy.military, this._enemy.casualties, this._enemy.buildings, building._underAttack, world (by moving/removing entities, harvesting/planting trees).
   * @triggers Called by `tick()`.
   * @performance O(U * R) where U is the number of units and R is the average range check (small constant for neighbors, or limited range for enemies/buildings). Dominant factor is U.
   */
  _updateUnits() {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const stats = u.stats || this._rollUnitStats(u.type);
      u.stats = stats;

      const baseMI = u.type === CONFIG.ENTITY.SCOUT
        ? CONFIG.SCOUT_MOVE_INTERVAL
        : CONFIG.UNIT_MOVE_INTERVAL;
      const weatherMult = this._world.weatherMods ? this._world.weatherMods.moveMult : 1;
      const tile = this._world.getTile(u.x, u.y);
      /**
       * One-line summary.
       *
       * @description MANDATORY detailed explanation (2-5 sentences).
       *
       * @workflow
       * 1. Specific numbered steps
       * 2. Include conditionals and loops
       *
       * @param {Type} name - Description
       * @returns {Type} Description
       *
       * @dependencies stateManager.get(), etc.
       * @modifies What state/DOM changes
       * @triggers When/how called
       * @performance O(n) complexity notes
       */
      const roadDiv = (tile && tile.road) ? CONFIG.UNIT_ROAD_DIVISOR : 1;
      const agilityFactor = this._agilityFactor(stats);
      const moveInterval = Math.max(1, Math.round(baseMI * weatherMult * agilityFactor / roadDiv));

      u._moveTimer = (u._moveTimer || 0) + 1;
      const canAct = u._moveTimer >= moveInterval;
      if (canAct) u._moveTimer = 0;

      if (u._pauseTicks && u._pauseTicks > 0) {
        u._pauseTicks--;
        continue;
      }
      if (u.state !== 'fighting' && canAct) {
        const pauseChance = u.type === CONFIG.ENTITY.SCOUT ? 0.04 : (u.type === CONFIG.ENTITY.WORKER ? 0.12 : 0.08);
        if (Math.random() < pauseChance) {
          u._pauseTicks = 1 + Math.floor(Math.random() * (u.type === CONFIG.ENTITY.SCOUT ? 2 : 4));
          continue;
        }
      }

      // ── Hunger override ──
      if (u._hungerTarget && u.state !== 'fighting') {
        if (canAct) this._stepTowardVaried(u, u._hungerTarget.x, u._hungerTarget.y);
        if (Math.abs(u.x - u._hungerTarget.x) + Math.abs(u.y - u._hungerTarget.y) <= 1) {
          u._hungerTarget = null;
        }
        continue;
      }

      // ── WARRIOR / LEADER ──
      if (u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER) {
        if (u.state === 'marching' && canAct) {
          const dx = u.targetX - u.x;
          const dy = u.targetY - u.y;
          if (Math.sqrt(dx*dx + dy*dy) < 1.5) {
            u.state = 'fighting';
          } else {
            this._stepTowardVaried(u, u.targetX, u.targetY);
          }
        }

        if (u.state === 'fighting') {
          if (!canAct) continue;

          if (this._tryDefect(u)) {
            this._despawnUnitAtIndex(i);
            this._enemy.units.push(u);
            this._enemy.military = this._enemy.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
            this.military = this.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
            continue;
          }

          if (this._shouldRetreat(u)) {
            u.state = 'idle';
            u.attackTarget = null;
            continue;
          }

          const leaderNearby = this._nearbyLeader(u);
          const leaderBonus = leaderNearby ? 1.25 : 1.0;

          const range = u.type === CONFIG.ENTITY.LEADER ? 3 : 2;
          const enemyUnits = this._enemy.units.filter(eu =>
            Math.abs(eu.x - u.x) <= range && Math.abs(eu.y - u.y) <= range
          );
          const enemyBuildings = this._enemy.buildings.filter(eb =>
            Math.abs(eb.x - u.x) <= range && Math.abs(eb.y - u.y) <= range
          );

          const atkPower = this._getUnitAttackValue(u) * (1 + this.techLevel * 0.08) * this.leader.strength * leaderBonus;

          if (enemyUnits.length) {
            const tgt = enemyUnits[0];
            const dmg = Math.max(0.5, atkPower - this._enemy.leader.strength * 0.3 + Math.random());
            tgt.hp -= this._applyDefenseReduction(tgt, dmg);
            u.attackTarget = { x: tgt.x, y: tgt.y, id: tgt.id, kind: 'unit' };
            if (tgt.hp <= 0) {
              this._enemy._despawnUnitByObject(tgt);
              this._enemy.military = this._enemy.units.length;
              this._enemy.casualties++;
              if (Math.random() < 0.25) {
                const kills = [
                  `A ${this.name} warrior cuts down an enemy ${tgt.type}!`,
                  `${this.name} warriors overwhelm an enemy fighter. Another falls.`,
                  `${this._enemy.name} loses a ${tgt.type} in the fray.`,
                  `Blood stains the earth as ${this.name} claims a kill.`,
                  `An enemy ${tgt.type} collapses — ${this.name} advances.`,
                ];
                Game.eventLog(kills[Math.floor(Math.random() * kills.length)], 'danger');
              }
            }
            const retaliation = Math.max(
              0.15,
              this._getUnitAttackValue(tgt) * this._enemy.leader.strength * 0.25
            );
            u.hp -= this._applyDefenseReduction(u, retaliation);
          } else if (enemyBuildings.length) {
            const bld = enemyBuildings[0];
            const bldDmg = atkPower * 0.12;
            bld.hp -= Math.max(0.1, bldDmg);
            u.attackTarget = { x: bld.x, y: bld.y, id: bld.id, kind: 'building' };
            bld._underAttack = 4;
            if (bld.hp <= 0) {
              this._enemy.buildings.splice(this._enemy.buildings.indexOf(bld), 1);
              const destroyMsgs = [
                `${this.name} DESTROYS a ${bld.type.replace('_',' ')} of ${this._enemy.name}!`,
                `${this._enemy.name}'s ${bld.type.replace('_',' ')} burns to the ground!`,
                `Fire and ruin — ${this.name} razes an enemy ${bld.type.replace('_',' ')}.`,
                `${this._enemy.name} loses their ${bld.type.replace('_',' ')}. The walls crumble.`,
              ];
              Game.eventLog(destroyMsgs[Math.floor(Math.random() * destroyMsgs.length)], 'danger');
            }
            u.hp -= 0.03;
          } else {
            u.state = 'idle';
            u.attackTarget = null;
          }

          if (u.hp <= 0) {
            this._despawnUnitAtIndex(i);
            this.casualties++;
            this.military = this.units.length;
          }
        }
      }

      // ── WORKER ──
      if (u.type === CONFIG.ENTITY.WORKER) {
        const storehouses = this.buildings.filter(b => b.type === CONFIG.ENTITY.STOREHOUSE);
        const storageCap = CONFIG.STORAGE_BASE_CAP
          + storehouses.reduce((s, b) => s + CONFIG.STORAGE_PER_STOREHOUSE * (b.level || 1), 0);

        const nearTree = this._world.getNearbyTree(u.x, u.y, 7);
        if (nearTree && this.res.wood < storageCap * 0.8) {
          u.resourceTarget = null;
          if (u.x === nearTree.x && u.y === nearTree.y) {
            const wood = this._world.harvestTree(nearTree.x, nearTree.y);
            this.res.wood = Math.min(storageCap, this.res.wood + wood);
            if (Math.random() < 0.30) this._world.plantTree(nearTree.x, nearTree.y);
          } else if (canAct) {
            this._stepTowardVaried(u, nearTree.x, nearTree.y);
            u.state = 'working';
          }
          continue;
        }

        if (this.res.wood < 20 && canAct && Math.random() < 0.10) {
          const px = u.x + Math.floor(Math.random() * 5) - 2;
          const py = u.y + Math.floor(Math.random() * 5) - 2;
          this._world.plantTree(px, py);
        }

        const damaged = this.buildings
          .filter(b => b.hp < b.maxHp)
          .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));

        if (damaged.length) {
          u.resourceTarget = null;
          const target = damaged[0];
          const dist = Math.sqrt((target.x - u.x) ** 2 + (target.y - u.y) ** 2);
          if (dist < 1.5) {
            if (canAct) {
              const buildSpeed = this._getWorkerBuildSpeed(u);
              target.hp = Math.min(target.maxHp, target.hp + buildSpeed);
            }
          } else if (canAct) {
            this._stepTowardVaried(u, target.x, target.y);
          }
          u.state = 'working';
        } else {
          // Seek/mine Stone and Metal when stockpiles are low
          if (u.resourceTarget) {
            const tile = this._world.getTile(u.resourceTarget.x, u.resourceTarget.y);
            if (tile && tile.resourceNode && tile.resourceNode.amount >= 1) {
              const dist = Math.sqrt((tile.x - u.x) ** 2 + (tile.y - u.y) ** 2);
              if (dist < 1.5) {
                u.state = 'working';
              } else if (canAct) {
                this._stepTowardVaried(u, tile.x, tile.y);
                u.state = 'working';
              }
              continue;
            } else {
              u.resourceTarget = null;
            }
          }

          let neededRes = null;
          if (this.res.metal < storageCap * 0.8 && this.res.stone < storageCap * 0.8) {
            neededRes = this.res.metal <= this.res.stone ? 'metal' : 'stone';
          } else if (this.res.metal < storageCap * 0.8) {
            neededRes = 'metal';
          } else if (this.res.stone < storageCap * 0.8) {
            neededRes = 'stone';
          }

          if (neededRes) {
            const range = CONFIG.WORKER_SEARCH_RANGE || 35;
            const nearRes = this._world.getNearbyResource(u.x, u.y, neededRes, range);
            if (nearRes) {
              u.resourceTarget = { x: nearRes.x, y: nearRes.y, type: neededRes };
              if (canAct) {
                this._stepTowardVaried(u, nearRes.x, nearRes.y);
                u.state = 'working';
              }
              continue;
            }
          }

          if (canAct && Math.random() < 0.15) {
            const outposts = this.buildings.filter(b =>
              b.type === CONFIG.ENTITY.CAPITOL ||
              b.type === CONFIG.ENTITY.STOREHOUSE ||
              b.type === CONFIG.ENTITY.FORT
            );
            let nearestOutpost = null;
            let minDist = Infinity;
            for (const o of outposts) {
              /**
               * One-line summary.
               *
               * @description MANDATORY detailed explanation (2-5 sentences).
               *
               * @workflow
               * 1. Specific numbered steps
               * 2. Include conditionals and loops
               *
               * @param {Type} name - Description
               * @returns {Type} Description
               *
               * @dependencies stateManager.get(), etc.
               * @modifies What state/DOM changes
               * @triggers When/how called
               * @performance O(n) complexity notes
               */
              const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
              if (d < minDist) {
                minDist = d;
                nearestOutpost = o;
              }
            }
            const anchor = nearestOutpost || this.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL);
            if (anchor) {
              u.targetX = anchor.x + Math.floor(Math.random() * 5) - 2;
              u.targetY = anchor.y + Math.floor(Math.random() * 5) - 2;
            }
          }
          if (canAct && u.targetX !== undefined) this._stepTowardVaried(u, u.targetX, u.targetY);
          u.state = 'idle';
        }
      }

      // ── SCOUT ──
      if (u.type === CONFIG.ENTITY.SCOUT) {
        if (!canAct) continue;

        const closeEnemy = this._enemy.units.find(eu =>
          Math.abs(eu.x - u.x) <= 1 && Math.abs(eu.y - u.y) <= 1
        );
        if (closeEnemy) {
          const scoutAtk = this._getUnitAttackValue(u) * (1 + this.techLevel * 0.04);
          closeEnemy.hp -= this._applyDefenseReduction(closeEnemy, Math.max(0.25, scoutAtk * 0.45));
          u.attackTarget = { x: closeEnemy.x, y: closeEnemy.y, id: closeEnemy.id, kind: 'unit' };
          if (closeEnemy.hp <= 0) {
            this._enemy._despawnUnitByObject(closeEnemy);
            this._enemy.casualties++;
            this._enemy.military = this._enemy.units.filter(mu =>
              mu.type === CONFIG.ENTITY.WARRIOR || mu.type === CONFIG.ENTITY.LEADER
            ).length;
          }
          continue;
        }

        const midX = CONFIG.MAP_W / 2;
        const distToMid = Math.abs(u.x - midX);
        const ox = this.id === 'a' ? 1 : -1;

        if (u.state === 'idle' || !u.patrolDir) {
          u.patrolDir = distToMid < 6 ? -ox : ox;
          u.state = 'patrolling';
        }

        if (u.state === 'patrolling') {
          const tx = u.x + u.patrolDir;
          const ty = u.y + Math.floor(Math.random() * 3) - 1;
          if (this._world.isWalkable(tx, ty)) { u.x = tx; u.y = ty; this._world.notifyEntityMoved(u); }

          const nearEnemy = this._enemy.units.some(eu =>
            Math.abs(eu.x - u.x) <= 5 && Math.abs(eu.y - u.y) <= 5
          );
          if (nearEnemy && Math.random() < 0.05) {
            Game.eventLog(`A ${this.name} scout spots enemy movement near the border.`, 'warn');
          }

          if (distToMid < 3) u.patrolDir = -ox;
          if (distToMid > 14) u.patrolDir = ox;
        }
      }

      // ── NORMAL ──
      if (u.type === CONFIG.ENTITY.NORMAL) {
        if (!canAct) continue;
        if (u.state === 'idle' && Math.random() < 0.28) {
          const home = this.buildings.find(b => b.type === CONFIG.ENTITY.HOME) || this.buildings[0];
          if (home) {
            u.targetX = home.x + Math.floor(Math.random() * 5) - 2;
            u.targetY = home.y + Math.floor(Math.random() * 5) - 2;
            u.state = 'wandering';
          }
        }
        if (u.targetX !== undefined && u.targetY !== undefined) {
          this._stepTowardVaried(u, u.targetX, u.targetY);
          if (Math.abs(u.x - u.targetX) + Math.abs(u.y - u.targetY) <= 1) u.state = 'idle';
        }
      }
    }

    this.military = this.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER).length;
  }

  // ── Tower Auto-Attack ──────────────────────────────────────────────────
  /**
   * Manages the automatic attack logic for all defensive towers.
   *
   * @description This private method periodically processes all tower buildings, allowing them to automatically target and attack nearby enemy units. It calculates tower range and damage based on level, prioritizes the closest enemy unit, applies damage, and despawns enemy units if their health drops to zero, updating enemy military stats.
   *
   * @workflow
   * 1. Increments `this._towerTimer`.
   * 2. If `this._towerTimer` is less than 6, returns immediately.
   * 3. Resets `this._towerTimer` to 0.
   * 4. Filters `this.buildings` to get all `TOWER` buildings.
   * 5. For each `tower` in `towers`:
   *    a. Gets `level` of the tower.
   *    b. Calculates `range` and `dmg` based on `level` and `CONFIG` constants.
   *    c. Filters `this._enemy.units` to find units `inRange` of the tower.
   *    d. If no units `inRange`, clears `tower.attackTarget` and continues to next tower.
   *    e. Sorts `inRange` units by their Manhattan distance to the tower (closest first).
   *    f. Selects the first unit as `target`.
   *    g. Applies defense reduction to `target.hp` using `dmg`.
   *    h. Sets `tower.attackTarget` to the target's coordinates and ID.
   *    i. Sets `target._underFire` timer.
   *    j. If `target.hp <= 0`:
   *       i. Calls `this._enemy._despawnUnitByObject(target)`.
   *       ii. Recalculates `this._enemy.military`.
   *       iii. Increments `this._enemy.casualties`.
   *       iv. Clears `tower.attackTarget`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.TOWER, CONFIG.TOWER_RANGE, CONFIG.TOWER_DAMAGE, this.buildings, this._enemy.units, this._enemy._despawnUnitByObject(), this._applyDefenseReduction(), Math.abs().
   * @modifies this._towerTimer, tower.attackTarget, unit.hp, unit._underFire for attacked units, this._enemy.units, this._enemy.military, this._enemy.casualties.
   * @triggers Called by `tick()`.
   * @performance O(T * U) where T is the number of towers and U is the number of enemy units (due to filtering and sorting for each tower). Can be significant.
   */
  _updateTowers() {
    this._towerTimer++;
    if (this._towerTimer < 6) return;
    this._towerTimer = 0;

    const towers = this.buildings.filter(b => b.type === CONFIG.ENTITY.TOWER);
    for (const tower of towers) {
      const level  = tower.level || 1;
      const range  = CONFIG.TOWER_RANGE  + (level - 1) * 2;
      const dmg    = CONFIG.TOWER_DAMAGE * (1 + (level - 1) * 0.4);

      const inRange = this._enemy.units.filter(eu =>
        Math.abs(eu.x - tower.x) <= range && Math.abs(eu.y - tower.y) <= range
      );
      if (!inRange.length) {
        tower.attackTarget = null;
        continue;
      }

      inRange.sort((a, b) => {
        const dA = Math.abs(a.x - tower.x) + Math.abs(a.y - tower.y);
        const dB = Math.abs(b.x - tower.x) + Math.abs(b.y - tower.y);
        return dA - dB;
      });
      const target = inRange[0];

      target.hp -= this._applyDefenseReduction(target, dmg);
      tower.attackTarget = { x: target.x, y: target.y, id: target.id };
      target._underFire = 4;

      if (target.hp <= 0) {
        this._enemy._despawnUnitByObject(target);
        this._enemy.military = this._enemy.units.length;
        this._enemy.casualties++;
        tower.attackTarget = null;
      }
    }
  }

  // ── Movement helpers — now use spatial hash for wall checks ────────────
  /**
   * Moves a unit one step closer to a target coordinate, avoiding obstacles and enemy walls.
   *
   * @description This private helper function calculates the best adjacent walkable tile for a unit to move towards a specific target (`tx`, `ty`). It evaluates all neighboring tiles, filtering out non-walkable terrain and tiles containing enemy walls, then selects the neighbor that minimizes the Euclidean distance to the target. The unit's position is updated, and the world is notified of the movement.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately (already at target).
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes `best` to `null` and `bestDist` to `Infinity`.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. If `d` is less than `bestDist`: updates `bestDist` to `d` and `best` to `n`.
   * 5. If `best` is found:
   *    a. Updates `u.x` to `best.x` and `u.y` to `best.y`.
   *    b. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by internal unit movement logic (e.g., in early versions or specific scenarios).
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors (e.g., 4 or 8).
   */
  _stepToward(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this._world.getNeighbors(u.x, u.y);
    let best = null, bestDist = Infinity;
    for (const n of neighbors) {
      if (!this._world.isWalkable(n.x, n.y)) continue;
      if (this._world.hasEnemyWall(n.x, n.y, this.id)) continue;
      /**
       * One-line summary.
       *
       * @description MANDATORY detailed explanation (2-5 sentences).
       *
       * @workflow
       * 1. Specific numbered steps
       * 2. Include conditionals and loops
       *
       * @param {Type} name - Description
       * @returns {Type} Description
       *
       * @dependencies stateManager.get(), etc.
       * @modifies What state/DOM changes
       * @triggers When/how called
       * @performance O(n) complexity notes
       */
      const d = (tx - n.x) ** 2 + (ty - n.y) ** 2;
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (best) {
      u.x = best.x;
      u.y = best.y;
      this._world.notifyEntityMoved(u);
    }
  }

  /**
   * Moves a unit one step closer to a target coordinate, with a slight random variation to prevent predictable paths.
   *
   * @description This private helper function moves a unit towards a target `tx, ty` similar to `_stepToward`, but introduces randomness. It evaluates all valid neighboring tiles, filters obstacles and enemy walls, then sorts them by distance. It usually picks the closest, but has a chance to pick a slightly less optimal but still close tile, leading to more natural and less "grid-like" movement patterns.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately.
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes an `options` array.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. Pushes `{ n, d }` to `options`.
   * 5. If `options` is empty, returns immediately (no valid moves).
   * 6. Sorts `options` by distance `d` in ascending order.
   * 7. Sets `pick` to the first (closest) option.
   * 8. If `options.length` is greater than 1 and a random check passes (0.22 chance):
   *    a. Filters `options` to `alt` containing options whose distance is within 2.0 of the closest.
   *    b. Selects a random `pick` from `alt`.
   * 9. Updates `u.x` to `pick.n.x` and `u.y` to `pick.n.y`.
   * 10. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), Math.random().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by `_updateUnits()` for most unit movement.
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors, and sorting/filtering is on a very small array.
   */
  _stepTowardVaried(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this._world.getNeighbors(u.x, u.y);
    const options = [];
    for (const n of neighbors) {
      if (!this._world.isWalkable(n.x, n.y)) continue;
      if (this._world.hasEnemyWall(n.x, n.y, this.id)) continue;
      /**
       * One-line summary.
       *
       * @description MANDATORY detailed explanation (2-5 sentences).
       *
       * @workflow
       * 1. Specific numbered steps
       * 2. Include conditionals and loops
       *
       * @param {Type} name - Description
       * @returns {Type} Description
       *
       * @dependencies stateManager.get(), etc.
       * @modifies What state/DOM changes
       * @triggers When/how called
       * @performance O(n) complexity notes
       */
      const d = (tx - n.x) ** 2 + (ty - n.y) ** 2;
      options.push({ n, d });
    }
    if (!options.length) return;

    options.sort((a, b) => a.d - b.d);
    let pick = options[0];

    if (options.length > 1 && Math.random() < 0.22) {
      const alt = options.filter(o => o.d <= options[0].d + 2.0);
      pick = alt[Math.floor(Math.random() * alt.length)];
    }

    u.x = pick.n.x;
    u.y = pick.n.y;
    this._world.notifyEntityMoved(u);
  }

  /**
   * Checks if a leader unit from the same tribe is within a short range of a given unit.
   *
   * @description This private helper function determines if any of the tribe's leader units are in close proximity (within a 3x3 square radius) to a specified unit. This check is primarily used to apply combat bonuses to units operating near their leader, simulating the effect of leadership on battlefield performance.
   *
   * @workflow
   * 1. Iterates through `this.units`.
   * 2. For each `other` unit:
   *    a. If `other.type` is `CONFIG.ENTITY.LEADER` AND `Math.abs(other.x - u.x)` is less than or equal to 3 AND `Math.abs(other.y - u.y)` is less than or equal to 3, returns `true`.
   * 3. If no such leader is found after checking all units, returns `false`.
   *
   * @param {Object} u - The unit object to check for nearby leaders.
   * @returns {boolean} True if a leader is within 3 tiles (inclusive) horizontally and vertically, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, this.units, Math.abs().
   * @modifies None.
   * @triggers Called by `_updateUnits()` when processing warrior/leader combat logic.
   * @performance O(U) where U is the number of units in the tribe.
   */
  _nearbyLeader(u) {
    return this.units.some(other =>
      other.type === CONFIG.ENTITY.LEADER &&
      Math.abs(other.x - u.x) <= 3 && Math.abs(other.y - u.y) <= 3
    );
  }

  /**
   * Decrements the strength of all active debuffs affecting the tribe.
   *
   * @description This private method is called periodically to simulate the natural decay or weakening of debuffs over time. It iterates through all active debuffs in `this.debuffs`, reduces their strength by a small amount, and removes any debuffs that have completely decayed (strength falls to zero or below).
   *
   * @workflow
   * 1. For each `key` in `Object.keys(this.debuffs)`:
   *    a. Decrements `this.debuffs[key]` by 0.008, ensuring it doesn't go below 0.
   *    b. If `this.debuffs[key]` is less than or equal to 0, deletes the `key` from `this.debuffs`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies Object.keys(), Math.max().
   * @modifies this.debuffs (values reduced, properties potentially deleted).
   * @triggers Called by `tick()`.
   * @performance O(D) where D is the number of active debuffs (usually a small constant).
   */
  _applyDebuffDecay() {
    for (const key of Object.keys(this.debuffs)) {
      this.debuffs[key] = Math.max(0, this.debuffs[key] - 0.008);
      if (this.debuffs[key] <= 0) delete this.debuffs[key];
    }
  }

  /**
   * Creates and places a new building on the game map.
   *
   * @description This private method instantiates a new building object with specified coordinates and type, assigns it initial health, and adds it to the tribe's `buildings` array and the game world. Special handling is included for farms to initialize their size and worker arrays. For farms, it also ensures initial farmland plots are established.
   *
   * @workflow
   * 1. Retrieves `maxHp` for `type` from `CONFIG.BUILDING_HP` or defaults to 200.
   * 2. Creates a `b` (building) object with `x, y, type, hp, maxHp, tribe, level`.
   * 3. If `type` is `CONFIG.ENTITY.FARM`:
   *    a. Sets `b.size` to 1.
   *    b. Initializes `b._workers` to an empty array.
   *    c. Initializes `b.farmland` to an empty array.
   * 4. Pushes `b` to `this.buildings`.
   * 5. Calls `this._world.addEntity(b)` to add the building to the game world.
   * 6. If `type` is `CONFIG.ENTITY.FARM`, calls `this._ensureFarmFarmland(b)` to establish initial farmland.
   *
   * @param {number} x - The X coordinate for the building.
   * @param {number} y - The Y coordinate for the building.
   * @param {string} type - The type of building (e.g., `CONFIG.ENTITY.CAPITOL`).
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_HP, CONFIG.ENTITY.FARM, this.id, this._world.addEntity(), this._ensureFarmFarmland().
   * @modifies this.buildings, world (by adding entity).
   * @triggers Called by `init()`, `_doBuildLogic()`, `_seedStartingHomes()`.
   * @performance O(1) for object creation and array push, plus O(N) for `_ensureFarmFarmland` in the worst case (small N).
   */
  _placeBuilding(x, y, type) {
    const maxHp = CONFIG.BUILDING_HP[type] || 200;
    const b = { x, y, type, hp: maxHp, maxHp, tribe: this.id, level: 1 };
    if (type === CONFIG.ENTITY.FARM) {
      b.size = 1;
      b._workers = [];
      b.farmland = [];
    }
    this.buildings.push(b);
    this._world.addEntity(b);
    if (type === CONFIG.ENTITY.FARM) this._ensureFarmFarmland(b);
  }

  /**
   * Creates and places a new unit on the game map.
   *
   * @description This private method instantiates a new unit object of a specified type at a given location. It finds the nearest walkable tile, rolls initial stats for the unit, calculates its maximum health, and then adds the unit to the tribe's `units` array and the game world. It also initializes unit-specific properties like state and hunger.
   *
   * @workflow
   * 1. Calls `this._world.findNearestWalkable(x, y)` to get a valid spawning position `p`.
   * 2. Calls `this._rollUnitStats(type)` to generate random stats for the unit.
   * 3. Retrieves `baseHp` for `type` from `CONFIG.UNIT_HP` or defaults to 10.
   * 4. Calls `this._getUnitMaxHp(baseHp, stats)` to calculate `maxHp`.
   * 5. Creates a `u` (unit) object with `x, y, type, hp, maxHp, state, targetX, targetY, tribe, _moveTimer, stats, hunger, _hungerFullTicks, _hungerTarget`.
   * 6. Pushes `u` to `this.units`.
   * 7. Calls `this._world.addEntity(u)` to add the unit to the game world.
   *
   * @param {number} x - The desired X coordinate for unit spawning.
   * @param {number} y - The desired Y coordinate for unit spawning.
   * @param {string} type - The type of unit to spawn (e.g., `CONFIG.ENTITY.WARRIOR`).
   * @returns {void}
   *
   * @dependencies CONFIG.UNIT_HP, this.id, this._world.findNearestWalkable(), this._world.addEntity(), this._rollUnitStats(), this._getUnitMaxHp().
   * @modifies this.units, world (by adding entity).
   * @triggers Called by `init()`, `_doMilitaryLogic()`, `_syncPopulationUnits()`, `giftWeapons()`.
   * @performance O(W) for `findNearestWalkable` (bounded by world size), otherwise O(1) for object creation and array push.
   */
  _spawnUnit(x, y, type) {
    const p = this._world.findNearestWalkable(x, y);
    const stats = this._rollUnitStats(type);
    const baseHp = CONFIG.UNIT_HP[type] || 10;
    const maxHp = this._getUnitMaxHp(baseHp, stats);
    const carryMax = this._getFoodCarryCapacity();
    const u = {
      x: p.x, y: p.y, type, hp: maxHp, maxHp,
      state: 'idle', targetX: p.x, targetY: p.y,
      tribe: this.id, _moveTimer: 0,
      stats,
      hunger: 0, _hungerFullTicks: 0, _hungerTarget: null,
      carriedFood: carryMax, carriedFoodMax: carryMax,
      _carryEatTimer: 0,
    };
    this.units.push(u);
    this._world.addEntity(u);
  }

  /**
   * Calculates the base attack value of a unit based on its type and stats.
   *
   * @description This private helper function computes the offensive power of a given unit or unit type. It uses a base attack value determined by the unit's class (Warrior, Leader, Scout, Worker, Normal) and then scales it further by the unit's individual `strength` statistic, providing a dynamic combat rating.
   *
   * @workflow
   * 1. Determines `type` from `unitOrType` (either a string or an object with a `type` property).
   * 2. Determines `stats` from `unitOrType` if it's an object, otherwise uses base stats for the type.
   * 3. Retrieves `strength` from `stats` or defaults to 5.
   * 4. If `type` is `CONFIG.ENTITY.WARRIOR`, returns `1.8 + strength * 0.30`.
   * 5. If `type` is `CONFIG.ENTITY.LEADER`, returns `2.7 + strength * 0.34`.
   * 6. If `type` is `CONFIG.ENTITY.SCOUT`, returns `0.9 + strength * 0.22`.
   * 7. If `type` is `CONFIG.ENTITY.WORKER`, returns `0.4 + strength * 0.10`.
   * 8. If `type` is `CONFIG.ENTITY.NORMAL`, returns `0.2 + strength * 0.05`.
   * 9. Else (default/fallback), returns `1.5 + strength * 0.2`.
   *
   * @param {Object|string} unitOrType - Either a unit object with `type` and `stats` properties, or a string representing the unit type.
   * @returns {number} The calculated attack value.
   *
   * @dependencies CONFIG.ENTITY constants, CONFIG.UNIT_STATS_BASE.
   * @modifies None.
   * @triggers Called by `_updateUnits()` (for unit combat).
   * @performance O(1).
   */
  _getUnitAttackValue(unitOrType) {
    const type = typeof unitOrType === 'string' ? unitOrType : unitOrType.type;
    const stats = typeof unitOrType === 'string' ? null : unitOrType.stats;
    const strength = stats ? stats.strength : (CONFIG.UNIT_STATS_BASE[type]?.strength || 5);

    if (type === CONFIG.ENTITY.WARRIOR) return 1.8 + strength * 0.30;
    if (type === CONFIG.ENTITY.LEADER) return 2.7 + strength * 0.34;
    if (type === CONFIG.ENTITY.SCOUT) return 0.9 + strength * 0.22;
    if (type === CONFIG.ENTITY.WORKER) return 0.4 + strength * 0.10;
    if (type === CONFIG.ENTITY.NORMAL) return 0.2 + strength * 0.05;
    return 1.5 + strength * 0.2;
  }

  /**
   * Calculates the build/repair speed of a worker unit based on its strength.
   *
   * @description This private helper function determines how effectively a worker unit can contribute to building construction or repair. It takes the worker's individual `strength` statistic into account, providing a base speed that increases with higher strength, simulating a more efficient builder.
   *
   * @workflow
   * 1. Retrieves `strength` from `unit.stats` or defaults to 5 if stats are not present or worker type base strength.
   * 2. Returns `1.2 + strength * 0.32`.
   *
   * @param {Object} unit - The worker unit object. Must have a `stats` property with `strength`.
   * @returns {number} The calculated build/repair speed value.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, CONFIG.ENTITY.WORKER.
   * @modifies None.
   * @triggers Called by `_updateUnits()` (for worker repair logic).
   * @performance O(1).
   */
  _getWorkerBuildSpeed(unit) {
    const strength = unit.stats ? unit.stats.strength : (CONFIG.UNIT_STATS_BASE[CONFIG.ENTITY.WORKER]?.strength || 5);
    return 1.2 + strength * 0.32;
  }

  /**
   * Calculates a unit's maximum hit points based on its base HP and endurance stats.
   *
   * @description This private helper function determines the total health a unit can have. It takes a base health value and modifies it with an endurance multiplier derived from the unit's `endurance` statistic. Higher endurance directly translates to a greater maximum HP, making units more resilient. The result is always at least 2 HP.
   *
   * @workflow
   * 1. Calculates `enduranceMult` using `stats.endurance` (scaled from 0.6 to 1.4).
   * 2. Returns `Math.max(2, Math.round(baseHp * enduranceMult))`, ensuring a minimum of 2 HP.
   *
   * @param {number} baseHp - The inherent base hit points for the unit type.
   * @param {Object} stats - The unit's stat object, containing an `endurance` property.
   * @returns {number} The calculated maximum hit points for the unit.
   *
   * @dependencies Math.max(), Math.round().
   * @modifies None.
   * @triggers Called by `_spawnUnit()`.
   * @performance O(1).
   */
  _getUnitMaxHp(baseHp, stats) {
    const enduranceMult = 0.6 + (stats.endurance / 10) * 0.8;
    return Math.max(2, Math.round(baseHp * enduranceMult));
  }

  /**
   * Calculates a movement speed factor based on a unit's agility.
   *
   * @description This private helper function determines how a unit's `agility` statistic influences its movement speed. Higher agility results in a lower factor (faster movement), while lower agility results in a higher factor (slower movement). The factor is clamped within a reasonable range to prevent extreme speeds.
   *
   * @workflow
   * 1. Calculates `f` as `1.0 - (stats.agility - 5) * 0.06`.
   * 2. Returns `Math.max(0.55, Math.min(1.45, f))`, clamping the factor between 0.55 and 1.45.
   *
   * @param {Object} stats - The unit's stat object, containing an `agility` property.
   * @returns {number} The calculated agility movement factor (lower means faster).
   *
   * @dependencies Math.max(), Math.min().
   * @modifies None.
   * @triggers Called by `_updateUnits()` when calculating unit move intervals.
   * @performance O(1).
   */
  _agilityFactor(stats) {
    const f = 1.0 - (stats.agility - 5) * 0.06;
    return Math.max(0.55, Math.min(1.45, f));
  }

  /**
   * Calculates the effective damage taken by a unit after applying its defense stat.
   *
   * @description This private helper function simulates a unit's defensive capabilities against incoming damage. It takes the raw damage dealt and reduces it by a percentage derived from the unit's `defense` statistic. Higher defense leads to a greater reduction in damage, making the unit more durable in combat. The reduction is capped at 60%.
   *
   * @workflow
   * 1. Retrieves `defense` from `unit.stats` or defaults to 5.
   * 2. Calculates `reduction` as `defense * 0.04`, clamped between 0 and 0.60.
   * 3. Returns `rawDamage * (1 - reduction)`.
   *
   * @param {Object} unit - The unit object taking damage. Must have a `stats` property with `defense`.
   * @param {number} rawDamage - The initial damage value before defense is applied.
   * @returns {number} The final damage value after defense reduction.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, Math.max(), Math.min().
   * @modifies None.
   * @triggers Called by `_updateUnits()` and `_updateTowers()` when applying damage to units.
   * @performance O(1).
   */
  _applyDefenseReduction(unit, rawDamage) {
    const defense = unit.stats ? unit.stats.defense : (CONFIG.UNIT_STATS_BASE[unit.type]?.defense || 5);
    const reduction = Math.max(0, Math.min(0.60, defense * 0.04));
    return rawDamage * (1 - reduction);
  }

  /**
   * Determines if a unit should attempt to retreat from combat.
   *
   * @description This private helper function assesses whether a unit, particularly in combat, decides to retreat. It primarily considers the unit's current health fraction and its `tenacity` and `loyalty` stats. Units with low health or low morale are more likely to retreat, while tenacious and loyal units will hold their ground longer.
   *
   * @workflow
   * 1. Calculates `hpFrac` (current HP / max HP).
   * 2. If `hpFrac` is greater than 0.55, returns `false` (not low enough health).
   * 3. Retrieves `tenacity` and `loyalty` from `unit.stats` or defaults to 5.
   * 4. Calculates `holdChance` based on `tenacity`, `loyalty`, and `hpFrac`, clamped between 0.08 and 0.96.
   * 5. Returns `true` if `Math.random()` is greater than `holdChance` (meaning the unit fails to hold), otherwise `false`.
   *
   * @param {Object} unit - The unit object to evaluate for retreat. Must have `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit should retreat, false otherwise.
   *
   * @dependencies Math.max(), Math.min(), Math.random().
   * @modifies None.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
  _shouldRetreat(unit) {
    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    if (hpFrac > 0.55) return false;

    const tenacity = unit.stats ? unit.stats.tenacity : 5;
    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    const holdChance = Math.max(0.08, Math.min(0.96, (tenacity * 0.07) + (loyalty * 0.03) + hpFrac * 0.18));
    return Math.random() > holdChance;
  }

  /**
   * Determines if a unit defects to the enemy tribe during combat.
   *
   * @description This private helper function simulates the possibility of a non-leader unit abandoning its tribe and joining the enemy. It's influenced by the unit's `loyalty` stat, its current health, and the tribe's overall morale. Units with lower loyalty, low health, or poor tribal morale are more prone to defection. If a unit defects, its tribe is switched, and a game event is logged.
   *
   * @workflow
   * 1. If `unit.type` is `CONFIG.ENTITY.LEADER`, returns `false` (leaders cannot defect).
   * 2. Retrieves `loyalty` from `unit.stats` or defaults to 5.
   * 3. If `loyalty` is 6.0 or higher, returns `false` (too loyal).
   * 4. Calculates `hpFrac` (current HP / max HP).
   * 5. Calculates `moralePenalty` based on `this.morale`.
   * 6. Calculates `baseChance` for defection, incorporating `loyalty`, `moralePenalty`, and `hpFrac`.
   * 7. Clamps `baseChance` to `chance` between 0 and 0.16.
   * 8. If `Math.random()` is greater than or equal to `chance`, returns `false`.
   * 9. Sets `unit.tribe` to `this._enemy.id`.
   * 10. Sets `unit.state` to 'idle' and clears `unit.targetX, unit.targetY`.
   * 11. Logs the defection event using `Game.eventLog()`.
   * 12. Returns `true`.
   *
   * @param {Object} unit - The unit object to evaluate for defection. Must have `type`, `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit defects, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, Game.eventLog(), this._enemy.id, this.morale, Math.max(), Math.min(), Math.random().
   * @modifies unit.tribe, unit.state, unit.targetX, unit.targetY.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
  _tryDefect(unit) {
    if (unit.type === CONFIG.ENTITY.LEADER) return false;

    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    if (loyalty >= 6.0) return false;

    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    const moralePenalty = Math.max(0, 0.7 - this.morale);
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const baseChance = (6.2 - loyalty) * 0.015 + moralePenalty * 0.04 + (hpFrac < 0.35 ? 0.015 : 0);
    const chance = Math.max(0, Math.min(0.16, baseChance));
    if (Math.random() >= chance) return false;

    unit.tribe = this._enemy.id;
    unit.state = 'idle';
    unit.targetX = unit.x;
    unit.targetY = unit.y;
    Game.eventLog(`${this.name} loses a ${unit.type} to defection!`, 'warn');
    return true;
  }

  /**
   * Generates random combat and behavioral statistics for a new unit.
   *
   * @description This private helper function creates a new set of statistics (strength, loyalty, agility, tenacity, endurance, defense) for a unit of a given type. It uses base stats defined in `CONFIG.UNIT_STATS_BASE` and applies a random variance, further adjusting them based on the tribe's `techLevel` to reflect technological advancement. Stats are clamped between 1 and 10.
   *
   * @workflow
   * 1. Retrieves `base` stats from `CONFIG.UNIT_STATS_BASE` for the given `type` or uses a default.
   * 2. Retrieves `v` (variance) from `CONFIG.UNIT_STATS_VARIANCE`.
   * 3. Calculates `techAdj` based on `this.techLevel`.
   * 4. Defines a `roll(k)` helper function:
   *    a. Calculates `r` by taking `base[k]`, adding a random variance (between -v and +v), and adding `techAdj`.
   *    b. Clamps `r` between 1 and 10, and converts to a float with 2 decimal places.
   *    c. Returns `r`.
   * 5. Returns an object containing rolled `strength`, `loyalty`, `agility`, `tenacity`, `endurance`, and `defense` stats.
   *
   * @param {string} type - The type of unit for which to roll stats.
   * @returns {Object.<string, number>} An object containing the generated stats.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, CONFIG.UNIT_STATS_VARIANCE, this.techLevel, Math.random(), Math.max(), Math.min(), parseFloat(), toFixed().
   * @modifies None.
   * @triggers Called by `_spawnUnit()` and `_updateUnits()` (if a unit's stats haven't been rolled yet).
   * @performance O(1) for a fixed number of stat rolls.
   */
  _rollUnitStats(type) {
    const base = CONFIG.UNIT_STATS_BASE[type] || {
      strength: 5, loyalty: 5, agility: 5, tenacity: 5, endurance: 5, defense: 5,
    };
    const v = CONFIG.UNIT_STATS_VARIANCE || 0.8;
    const techAdj = Math.max(0, (this.techLevel - 1) * 0.08);
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const roll = (k) => {
      const r = base[k] + (Math.random() * 2 - 1) * v + techAdj;
      return Math.max(1, Math.min(10, parseFloat(r.toFixed(2))));
    };

    return {
      strength: roll('strength'),
      loyalty: roll('loyalty'),
      agility: roll('agility'),
      tenacity: roll('tenacity'),
      endurance: roll('endurance'),
      defense: roll('defense'),
    };
  }

  // ── Hunger System (single definition — duplicate removed) ──────────────
  /**
   * Manages the hunger levels of all units and applies consequences of starvation.
   *
   * @description This private method processes the hunger of every unit in the tribe. Units continuously get hungrier; if they reach a critical hunger level, they attempt to eat from nearby food storage buildings. If a unit goes without food for too long, it will eventually die, impacting population and morale.
   *
   * @workflow
   * 1. Filters `this.buildings` to get `STOREHOUSE` and `CAPITOL` buildings as `foodBuildings`.
   * 2. Iterates backwards through `this.units`:
   *    a. Selects unit `u`.
   *    b. Increments `u.hunger` by `CONFIG.HUNGER_RATE`, capped at `CONFIG.HUNGER_MAX`.
   *    c. If `u.hunger` reaches `CONFIG.HUNGER_MAX`:
   *       i. Increments `u._hungerFullTicks`.
   *       ii. If `u._hungerFullTicks` reaches `CONFIG.HUNGER_DEATH_TICKS`:
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Decrements `this.population` (min 0).
   *          3. Decrements `this.morale` (min 0.05).
   *          4. If a random check passes (30% chance), logs death message.
   *          5. Continues to next unit.
   *    d. Else (`u` is not fully hungry), resets `u._hungerFullTicks` to 0.
   *    e. If `u.hunger` is at or above `CONFIG.HUNGER_EAT_THRESHOLD` AND `this.res.food` is at least 1 AND `foodBuildings` exist:
   *       i. Finds the `nearestFB` (food building) and `nearFBDist`.
   *       ii. If `nearestFB` is found and `u` is adjacent (distance <= 1):
   *          1. Calculates `foodNeeded` based on current hunger.
   *          2. Calculates `foodEaten` (min of `foodNeeded`, `this.res.food`, and 6).
   *          3. If `foodEaten` is greater than 0:
   *             A. Reduces `u.hunger`.
   *             B. Reduces `this.res.food`.
   *             C. Resets `u._hungerFullTicks` and `u._hungerTarget`.
   *       iii. Else if `nearestFB` is found (but not adjacent):
   *          1. Sets `u._hungerTarget` to `nearestFB`'s coordinates.
   *    f. Else (not hungry enough or no food/buildings), clears `u._hungerTarget`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.STOREHOUSE, CONFIG.ENTITY.CAPITOL, CONFIG.HUNGER_MAX, CONFIG.HUNGER_RATE, CONFIG.HUNGER_DEATH_TICKS, CONFIG.HUNGER_EAT_THRESHOLD, CONFIG.HUNGER_FOOD_RESTORE, Game.eventLog(), this.buildings, this.units, this.res.food, this._despawnUnitAtIndex(), Math.min(), Math.max(), Math.floor(), Math.ceil(), Math.abs(), Math.random().
   * @modifies unit.hunger, unit._hungerFullTicks, unit._hungerTarget, this.res.food, this.population, this.morale, this.units (via `_despawnUnitAtIndex`).
   * @triggers Called by `tick()`.
   * @performance O(U * B) where U is the number of units and B is the number of food buildings (for finding nearest).
   */
  // ── Food carry capacity: days of personal food, scales with age ─────────
  _getFoodCarryCapacity() {
    const baseDays = CONFIG.FOOD_CARRY_BASE_DAYS || 3;
    const perAge   = CONFIG.FOOD_CARRY_PER_AGE_DAYS || 1;
    const ageIdx   = AGES.indexOf(this.age);
    const days     = baseDays + Math.max(0, ageIdx) * perAge;
    // Convert days to food units: days * ticks/day * hungerRate / restore
    return Math.ceil(days * CONFIG.TICKS_PER_DAY * CONFIG.HUNGER_RATE / CONFIG.HUNGER_FOOD_RESTORE);
  }

  // ── Hunger system with personal food carry ────────────────────────────
  _updateHunger() {
    const foodBuildings = this.buildings.filter(b =>
      b.type === CONFIG.ENTITY.STOREHOUSE || b.type === CONFIG.ENTITY.CAPITOL
    );
    const refillRange = CONFIG.FOOD_CARRY_REFILL_RANGE || 2;
    const eatInterval = CONFIG.FOOD_CARRY_EAT_INTERVAL || 5;

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];

      // Ensure carry fields exist (for units spawned before this system)
      if (u.carriedFood === undefined) {
        const cap = this._getFoodCarryCapacity();
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
          this._despawnUnitAtIndex(i);
          this.population = Math.max(0, this.population - 1);
          this.morale = Math.max(0.05, this.morale - 0.01);
          if (Math.random() < 0.3)
            Game.eventLog(`${this.name}: a ${u.type} dies of hunger.`, 'danger');
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
          if (u.hunger >= CONFIG.HUNGER_EAT_THRESHOLD && this.res.food >= 1) {
            const foodNeeded = Math.ceil(u.hunger / CONFIG.HUNGER_FOOD_RESTORE);
            const foodEaten  = Math.min(foodNeeded, Math.floor(this.res.food), 6);
            if (foodEaten > 0) {
              u.hunger           = Math.max(0, u.hunger - foodEaten * CONFIG.HUNGER_FOOD_RESTORE);
              this.res.food      = Math.max(0, this.res.food - foodEaten);
              u._hungerFullTicks = 0;
            }
          }

          // Refill carry from tribe supply (top up even if not hungry)
          if (u.carriedFood < u.carriedFoodMax && this.res.food >= 1) {
            const refillNeeded = u.carriedFoodMax - u.carriedFood;
            const refillGot = Math.min(refillNeeded, Math.floor(this.res.food));
            u.carriedFood += refillGot;
            this.res.food = Math.max(0, this.res.food - refillGot);
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
    const special = this.units.filter(u => u.type !== CONFIG.ENTITY.NORMAL);
    const normal = this.units.filter(u => u.type === CONFIG.ENTITY.NORMAL);

    if (this.population < special.length) this.population = special.length;

    let desiredNormals = Math.max(0, this.population - special.length);
    if (normal.length > desiredNormals) {
      let removeCount = normal.length - desiredNormals;
      for (let i = this.units.length - 1; i >= 0 && removeCount > 0; i--) {
        if (this.units[i].type !== CONFIG.ENTITY.NORMAL) continue;
        this._despawnUnitAtIndex(i);
        removeCount--;
      }
      desiredNormals = Math.max(0, this.population - special.length);
    }

    let currentNormals = this.units.filter(u => u.type === CONFIG.ENTITY.NORMAL).length;
    while (currentNormals < desiredNormals) {
      const home = this.buildings.find(b => b.type === CONFIG.ENTITY.HOME) || this.buildings[0];
      if (!home) break;
      this._spawnUnit(home.x, home.y, CONFIG.ENTITY.NORMAL);
      currentNormals++;
    }
  }

  /**
   * Returns the maximum number of farmland tiles a farm building can have at a given level.
   *
   * @description This private helper function specifies the maximum size (number of arable plots) a farm building can achieve, dependent on its upgrade level. Higher levels allow for significantly more plots, enabling greater food production capacity.
   *
   * @workflow
   * 1. If `level` is 1 or less, returns 3.
   * 2. Else if `level` is 2, returns 6.
   * 3. Else (level 3 or greater), returns 10.
   *
   * @param {number} level - The current level of the farm building.
   * @returns {number} The maximum number of farmland tiles.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by `_expandFarmLand()`.
   * @performance O(1).
   */
  _getFarmMaxTiles(level) {
    if (level <= 1) return 3;
    if (level === 2) return 6;
    return 10;
  }

  /**
   * Returns the base food yield multiplier for a farm tile based on its biome type.
   *
   * @description This private helper function determines the inherent fertility of a specific map tile for farming purposes. Different biome types, represented by `tileType` constants, have varying base yields, simulating the environmental suitability for agriculture. Tiles like water or mountain have zero yield, while wetlands and jungles are highly productive.
   *
   * @workflow
   * 1. Uses a series of `if/else if` statements to check `tileType` against `CONFIG.TILE` constants.
   * 2. Returns a specific base yield multiplier for known tile types (e.g., 0 for WATER/MOUNTAIN, 4.5 for JUNGLE).
   * 3. Defaults to 2.0 if `tileType` is not recognized.
   *
   * @param {string} tileType - The type of the map tile (e.g., `CONFIG.TILE.GRASS`).
   * @returns {number} The base food yield multiplier for that biome.
   *
   * @dependencies CONFIG.TILE constants.
   * @modifies None.
   * @triggers Called by `_gatherResources()`.
   * @performance O(1).
   */
  _getFarmBiomeBaseYield(tileType) {
    const T = CONFIG.TILE;
    if (tileType === T.WATER || tileType === T.MOUNTAIN) return 0.0;
    if (tileType === T.DESERT) return 0.6;
    if (tileType === T.STONE) return 0.7;
    if (tileType === T.SNOW) return 0.8;
    if (tileType === T.TUNDRA) return 1.2;
    if (tileType === T.RUINS) return 1.8;
    if (tileType === T.FOREST) return 2.3;
    if (tileType === T.SAVANNA) return 2.8;
    if (tileType === T.GRASS) return 3.6;
    if (tileType === T.WETLAND) return 4.2;
    if (tileType === T.JUNGLE) return 4.5;
    return 2.0;
  }

  /**
   * Returns a food yield multiplier for farm tiles based on the current weather type.
   *
   * @description This private helper function applies environmental modifiers to farm production based on the prevailing weather conditions. Different weather types, represented by `CONFIG.WEATHER` constants, can positively or negatively impact crop growth, simulating the effects of sunshine, rain, drought, or snow on agricultural output.
   *
   * @workflow
   * 1. Uses a series of `if/else if` statements to check `type` against `CONFIG.WEATHER` constants.
   * 2. Returns a specific multiplier for known weather types (e.g., 1.15 for SUNSHINE, 0.32 for DROUGHT).
   * 3. Defaults to 1.0 if `type` is not recognized.
   *
   * @param {string} type - The type of weather (e.g., `CONFIG.WEATHER.RAIN`).
   * @returns {number} The weather-based food yield multiplier.
   *
   * @dependencies CONFIG.WEATHER constants.
   * @modifies None.
   * @triggers Called by `_gatherResources()`.
   * @performance O(1).
   */
  _getWeatherFarmTileFactor(type) {
    const W = CONFIG.WEATHER;
    if (type === W.SUNSHINE) return 1.15;
    if (type === W.OVERCAST) return 0.95;
    if (type === W.RAIN) return 1.20;
    if (type === W.STORM) return 0.70;
    if (type === W.SNOW) return 0.45;
    if (type === W.DROUGHT) return 0.32;
    if (type === W.FLOOD) return 0.60;
    return 1.0;
  }

  /**
   * Ensures a farm building has initial farmland plots assigned to it.
   *
   * @description This private helper function guarantees that every farm building has at least some workable land. If a farm is created without any `farmland` or if its `farmland` array is empty, it attempts to assign up to two walkable neighboring tiles as initial plots. If no walkable neighbors exist, it defaults to the farm's own tile. It also updates the farm's `size` property.
   *
   * @workflow
   * 1. If `farm.farmland` is not defined, initializes it to an empty array.
   * 2. If `farm.farmland` is empty:
   *    a. Calls `this._world.getNeighbors(farm.x, farm.y)` to get adjacent tiles.
   *    b. Filters neighbors to include only `isWalkable` tiles.
   *    c. Adds up to the first 2 walkable neighbors (as `{x, y}` objects) to `farm.farmland`.
   *    d. If `farm.farmland` is still empty (no walkable neighbors), adds the farm's own tile `{ x: farm.x, y: farm.y }` to `farmland`.
   *    e. Sets `farm.size` to `farm.farmland.length`.
   *
   * @param {Object} farm - The farm building object to ensure farmland for. Must have `x`, `y` properties.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), Math.min().
   * @modifies farm.farmland, farm.size.
   * @triggers Called by `_gatherResources()`, `_placeBuilding()`, `_expandFarmLand()`, `_assignFarmWorkers()`.
   * @performance O(1) as `getNeighbors` is a small constant operation.
   */
  _ensureFarmFarmland(farm) {
    if (!farm.farmland) farm.farmland = [];
    if (!farm.farmland.length) {
      const around = this._world.getNeighbors(farm.x, farm.y).filter(n => this._world.isWalkable(n.x, n.y));
      farm.farmland.push(...around.slice(0, Math.min(2, around.length)).map(p => ({ x: p.x, y: p.y })));
      if (!farm.farmland.length) farm.farmland.push({ x: farm.x, y: farm.y });
      farm.size = farm.farmland.length;
    }
  }

  /**
   * Searches for a new, valid, and unoccupied tile to expand a farm's farmland.
   *
   * @description This private helper function attempts to locate an adjacent tile that can be added to a farm's arable land. It considers the farm's current plots and direct neighbors, ensuring the candidate tile is walkable and not already occupied by another farm's plots or by any existing building. This allows for organic farm expansion on the map.
   *
   * @workflow
   * 1. Creates `occupiedByFarms` set to store coordinates of all existing farmland plots from all farms.
   * 2. Initializes `frontier` with the `farm`'s own coordinates and its existing `farmland` plots.
   * 3. For each `p` (plot) in `frontier`:
   *    a. Calls `this._world.getNeighbors(p.x, p.y)` to get `ns` (neighbors).
   *    b. For each `n` in `ns`:
   *       i. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *       ii. Creates a key `k` for `n.x, n.y`.
   *       iii. If `occupiedByFarms` already has `k`, continues.
   *       iv. Calls `this._world.getEntitiesAt(n.x, n.y)` to check for blocking entities.
   *       v. If `blocked` by any building with `CONFIG.BUILDING_HP`, continues.
   *       vi. Returns `{ x: n.x, y: n.y }` (found a valid plot).
   * 4. If no valid plot is found after checking all neighbors, returns `null`.
   *
   * @param {Object} farm - The farm building object to find an expansion plot for.
   * @returns {Object|null} An object `{ x, y }` for a new plot, or `null` if none found.
   *
   * @dependencies CONFIG.ENTITY.FARM, CONFIG.BUILDING_HP, this.buildings, this._world.getNeighbors(), this._world.isWalkable(), this._world.getEntitiesAt().
   * @modifies None.
   * @triggers Called by `_expandFarmLand()`.
   * @performance O(B + F * N) where B is total buildings (for `occupiedByFarms` setup), F is `farm.farmland.length`, and N is number of neighbors (small constant).
   */
  _findExpandableFarmPlot(farm) {
    const occupiedByFarms = new Set();
    for (const fb of this.buildings) {
      if (fb.type !== CONFIG.ENTITY.FARM || !fb.farmland) continue;
      for (const p of fb.farmland) occupiedByFarms.add(`${p.x},${p.y}`);
    }

    const frontier = [{ x: farm.x, y: farm.y }, ...(farm.farmland || [])];
    for (const p of frontier) {
      const ns = this._world.getNeighbors(p.x, p.y);
      for (const n of ns) {
        if (!this._world.isWalkable(n.x, n.y)) continue;
        const k = `${n.x},${n.y}`;
        if (occupiedByFarms.has(k)) continue;
        const blocked = this._world.getEntitiesAt(n.x, n.y).some(e => !!CONFIG.BUILDING_HP[e.type]);
        if (blocked) continue;
        return { x: n.x, y: n.y };
      }
    }
    return null;
  }

  /**
   * Places initial home buildings around a central point during tribe initialization.
   *
   * @description This private method ensures a new tribe has enough homes to support its initial population. It calculates the required number of homes and then strategically places them in concentric squares around a given central coordinate (`cx`, `cy`), checking for walkable and unoccupied tiles, ensuring a compact starting settlement.
   *
   * @workflow
   * 1. Calculates `neededHomes` based on `this.population` and the capacity of a level 1 home.
   * 2. Initializes `placed` homes to 0.
   * 3. Iterates `r` (radius) from 1 to 7:
   *    a. Iterates `dy` from `-r` to `r`:
   *       i. Iterates `dx` from `-r` to `r`:
   *          1. Calculates `nx`, `ny` (potential home coordinates).
   *          2. If `this._world.isWalkable(nx, ny)` is `false`, continues.
   *          3. Calls `this._world.getEntitiesAt(nx, ny)` to check for occupied tiles.
   *          4. If `occ` contains any building, continues.
   *          5. Calls `this._placeBuilding(nx, ny, CONFIG.ENTITY.HOME)`.
   *          6. Increments `placed`.
   *          7. If `placed` has reached `neededHomes`, breaks all loops.
   *
   * @param {number} cx - The central X coordinate for home placement.
   * @param {number} cy - The central Y coordinate for home placement.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.HOME, CONFIG.BUILDING_HP, this.population, this._homeCapacityByLevel(), this._world.isWalkable(), this._world.getEntitiesAt(), this._placeBuilding(), Math.max(), Math.ceil().
   * @modifies this.buildings, world (via `_placeBuilding`).
   * @triggers Called by `init()`.
   * @performance O(R^2) where R is the max radius (7), so O(49) in worst case (constant and small).
   */
  _seedStartingHomes(cx, cy) {
    const neededHomes = Math.max(1, Math.ceil(this.population / this._homeCapacityByLevel(1)));
    let placed = 0;
    for (let r = 1; r <= 7 && placed < neededHomes; r++) {
      for (let dy = -r; dy <= r && placed < neededHomes; dy++) {
        for (let dx = -r; dx <= r && placed < neededHomes; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this._world.isWalkable(nx, ny)) continue;
          const occ = this._world.getEntitiesAt(nx, ny);
          if (occ.some(e => !!CONFIG.BUILDING_HP[e.type])) continue;
          this._placeBuilding(nx, ny, CONFIG.ENTITY.HOME);
          placed++;
        }
      }
    }
  }

  /**
   * Removes a unit from the tribe's `units` array and the game world by its array index.
   *
   * @description This private helper function handles the complete removal of a unit from the simulation. It identifies the unit at the specified index, notifies the game world to remove the entity from its spatial hash, and then removes the unit object from the tribe's internal `units` array.
   *
   * @workflow
   * 1. Retrieves unit `u` from `this.units[index]`.
   * 2. If `u` is `null` or `undefined`, returns immediately.
   * 3. If `u.id` is not `null` (meaning it was added to the world), calls `this._world.removeEntity(u.id)`.
   * 4. Removes the unit at `index` from `this.units` using `splice()`.
   *
   * @param {number} index - The index of the unit in the `this.units` array.
   * @returns {void}
   *
   * @dependencies this.units, this._world.removeEntity().
   * @modifies this.units (element removed), world (via `removeEntity`).
   * @triggers Called by `_updateUnits()` (unit death/defection), `_updateTowers()` (unit death by tower), `_syncPopulationUnits()` (excess normal units), `_updateHunger()` (unit starvation), `killUnits()`.
   * @performance O(U) where U is the number of units (due to array splice), but usually small U.
   */
  _despawnUnitAtIndex(index) {
    const u = this.units[index];
    if (!u) return;
    if (u.id != null) this._world.removeEntity(u.id);
    this.units.splice(index, 1);
  }

  /**
   * Removes a specific unit object from the tribe's `units` array and the game world.
   *
   * @description This private helper function provides a convenient way to remove a unit by its object reference rather than its array index. It finds the unit's index within the `units` array and then delegates the actual removal process to `_despawnUnitAtIndex`.
   *
   * @workflow
   * 1. Finds the `idx` of the `unit` object in `this.units`.
   * 2. If `idx` is not -1 (unit is found), calls `this._despawnUnitAtIndex(idx)`.
   *
   * @param {Object} unit - The unit object to remove.
   * @returns {void}
   *
   * @dependencies this.units, this._despawnUnitAtIndex().
   * @modifies this.units (via `_despawnUnitAtIndex`), world (via `_despawnUnitAtIndex`).
   * @triggers Called by `_updateUnits()` (enemy unit death), `_updateTowers()` (enemy unit death), `_enemy._despawnUnitByObject` (indirectly called by this tribe for enemy units).
   * @performance O(U) where U is the number of units (due to `indexOf` and `splice`).
   */
  _despawnUnitByObject(unit) {
    const idx = this.units.indexOf(unit);
    if (idx !== -1) this._despawnUnitAtIndex(idx);
  }

  /**
   * Generates a random name from a predefined list.
   *
   * @description This private helper function provides a simple way to obtain a random name, primarily used for assigning names to new tribe leaders or in other contexts requiring a generic identifier. It selects a name from a fixed array using a random index.
   *
   * @workflow
   * 1. Defines a `names` array with several predefined names.
   * 2. Returns a randomly selected name from the `names` array.
   *
   * @param {void} -
   * @returns {string} A randomly chosen name.
   *
   * @dependencies Math.floor(), Math.random().
   * @modifies None.
   * @triggers Called by `constructor()`, `killLeader()`.
   * @performance O(1).
   */
  _randName() {
    const names = ['Uruk','Karan','Shet','Borak','Mira','Neth','Cyra','Dorath','Elka','Forath'];
    return names[Math.floor(Math.random() * names.length)];
  }

  // ── Player Influence API ──
  /**
   * Applies or strengthens a specific debuff on the tribe.
   *
   * @description This public API method allows external systems to inflict various negative status effects (debuffs) on the tribe. It takes a debuff `key` and `strength` value, adding or increasing the debuff's intensity, up to a maximum of 1.0. Debuffs can influence various aspects of tribe performance, like research or morale.
   *
   * @workflow
   * 1. Retrieves the current strength of `this.debuffs[key]` or defaults to 0.
   * 2. Adds `strength` to the current value.
   * 3. Caps the new value at 1.0 using `Math.min()`.
   * 4. Assigns the result to `this.debuffs[key]`.
   *
   * @param {string} key - The identifier for the debuff (e.g., 'disease', 'research_slow').
   * @param {number} strength - The amount to add to the debuff's current strength.
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.debuffs.
   * @triggers Called by player influence actions (`damageMorale`, `sabotageFood`, `causeDisease`, `boostResearch`).
   * @performance O(1).
   */
  applyDebuff(key, strength) {
    this.debuffs[key] = Math.min(1, (this.debuffs[key] || 0) + strength);
  }

  /**
   * Eliminates the current tribe leader, assigning a new one with reduced stats and impacting morale.
   *
   * @description This public API method simulates the death of the tribe's leader, causing immediate consequences for the tribe. It replaces the old leader with a new, weaker one, significantly reduces tribe morale, and explicitly sets all existing leader units' HP to zero, causing them to be despawned during the next unit update. A warning event is logged.
   *
   * @workflow
   * 1. Stores the `old` leader's name.
   * 2. Assigns a new `leader` object with a random name (via `_randName()`) and a reduced strength (0.3 to 0.7).
   * 3. Reduces `this.morale` by 0.2, ensuring it doesn't drop below 0.1.
   * 4. Filters `this.units` to find all `LEADER` units.
   * 5. For each `u` in `leaderUnits`, sets `u.hp` to 0.
   * 6. Logs a warning event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.LEADER, Game.eventLog(), this.units, this._randName(), Math.random(), Math.max().
   * @modifies this.leader, this.morale, unit.hp for leader units.
   * @triggers Called by player influence actions or specific game events.
   * @performance O(U) where U is the number of units (for filtering leader units).
   */
  killLeader() {
    const old = this.leader.name;
    this.leader = { name: this._randName(), strength: 0.3 + Math.random() * 0.4 };
    this.morale = Math.max(0.1, this.morale - 0.2);
    const leaderUnits = this.units.filter(u => u.type === CONFIG.ENTITY.LEADER);
    leaderUnits.forEach(u => { u.hp = 0; });
    Game.eventLog(`${this.name} leader ${old} is eliminated. Command fractures.`, 'warn');
  }

  /**
   * Kills a specified number of warrior units from the tribe.
   *
   * @description This public API method allows external systems to inflict casualties on the tribe's military. It identifies the specified `count` of warrior units and sets their health to zero, causing them to be removed during the next unit update. It increments the tribe's `casualties` count and updates the `military` size.
   *
   * @workflow
   * 1. Filters `this.units` to get all `WARRIOR` units.
   * 2. Calculates `toKill` as the minimum of `count` and the number of available warriors.
   * 3. For each `i` from 0 up to `toKill - 1`:
   *    a. Finds the `idx` of the warrior `warriors[i]` in `this.units`.
   *    b. If `idx` is found, calls `this._despawnUnitAtIndex(idx)`.
   * 4. Increments `this.casualties` by `toKill`.
   * 5. Recalculates `this.military` based on remaining warrior and leader units.
   *
   * @param {number} count - The number of warrior units to kill.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.WARRIOR, CONFIG.ENTITY.LEADER, this.units, this._despawnUnitAtIndex(), Math.min().
   * @modifies this.units (via `_despawnUnitAtIndex`), this.casualties, this.military, world (via `_despawnUnitAtIndex`).
   * @triggers Called by player influence actions or specific game events.
   * @performance O(U) for filtering, then O(count * U) in worst case for despawning (due to `indexOf` and `splice`).
   */
  killUnits(count) {
    const warriors = this.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR);
    const toKill = Math.min(count, warriors.length);
    for (let i = 0; i < toKill; i++) {
      const idx = this.units.indexOf(warriors[i]);
      if (idx !== -1) this._despawnUnitAtIndex(idx);
    }
    this.casualties += toKill;
    this.military = this.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER).length;
  }

  /**
   * Applies a temporary boost to the tribe's research speed.
   *
   * @description This public API method triggers a positive effect on the tribe's knowledge accumulation. It calls `applyDebuff` with a 'research_boost' key, increasing the associated debuff strength. Although named 'debuff', it is used here to represent a positive modifier in the `_gatherResources` logic, effectively speeding up tech gain.
   *
   * @workflow
   * 1. Calls `this.applyDebuff('research_boost', 0.5)`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies this.applyDebuff().
   * @modifies this.debuffs (specifically 'research_boost').
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
  boostResearch()      { this.applyDebuff('research_boost', 0.5); }
  /**
   * Increases the tribe's overall morale.
   *
   * @description This public API method provides a way to improve the tribe's morale, representing a positive influence or event. It directly increases the `this.morale` property, capping it at a maximum of 1.0, which can positively affect unit behavior and tribe performance.
   *
   * @workflow
   * 1. Increases `this.morale` by 0.3, capped at 1.0 using `Math.min()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.morale.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
  boostMorale()        { this.morale = Math.min(1, this.morale + 0.3); }
  /**
   * Decreases the tribe's morale and applies a temporary morale loss debuff.
   *
   * @description This public API method simulates events that negatively impact the tribe's morale. It reduces the `this.morale` property by the specified `amount`, ensuring it doesn't drop below a minimum of 0.05. Additionally, it applies a 'morale_loss' debuff, which can temporarily influence combat decisions and prevent attacks.
   *
   * @workflow
   * 1. Decreases `this.morale` by `amount`, ensuring it doesn't drop below 0.05.
   * 2. Calls `this.applyDebuff('morale_loss', amount)`.
   *
   * @param {number} amount - The value to subtract from morale and apply as debuff strength.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Math.max().
   * @modifies this.morale, this.debuffs (specifically 'morale_loss').
   * @triggers Called by player influence actions or specific game events.
   * @performance O(1).
   */
  damageMorale(amount) { this.morale = Math.max(0.05, this.morale - amount); this.applyDebuff('morale_loss', amount); }

  /**
   * Destroys a specified amount of food and applies a temporary food shortage debuff.
   *
   * @description This public API method simulates an act of sabotage targeting the tribe's food supply. It directly reduces `this.res.food` by the given `amount`, ensuring it doesn't drop below zero. Furthermore, it applies a 'food' debuff, which negatively impacts population growth, simulating the consequences of food scarcity.
   *
   * @workflow
   * 1. Reduces `this.res.food` by `amount`, ensuring it doesn't drop below 0.
   * 2. Calls `this.applyDebuff('food', 0.4)`.
   *
   * @param {number} amount - The amount of food to destroy.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Math.max().
   * @modifies this.res.food, this.debuffs (specifically 'food').
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
  sabotageFood(amount) {
    this.res.food = Math.max(0, this.res.food - amount);
    this.applyDebuff('food', 0.4);
  }

  /**
   * Inflicts a disease on the tribe, reducing population and applying a temporary disease debuff.
   *
   * @description This public API method simulates the outbreak of a disease within the tribe. It applies a 'disease' debuff with a given `severity`, which can further impact population growth. Immediately, it also causes a percentage of the tribe's population to die, directly reducing `this.population`, and logs a warning event.
   *
   * @workflow
   * 1. Calls `this.applyDebuff('disease', severity)`.
   * 2. Calculates `killed` population based on `this.population` and `severity`.
   * 3. Reduces `this.population` by `killed`, ensuring it stays above a minimum of 5.
   * 4. Logs a warning event using `Game.eventLog()`.
   *
   * @param {number} severity - The intensity of the disease to apply as a debuff.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Game.eventLog(), Math.floor(), Math.max().
   * @modifies this.debuffs (specifically 'disease'), this.population.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
  causeDisease(severity) {
    this.applyDebuff('disease', severity);
    const killed = Math.floor(this.population * severity * 0.2);
    this.population = Math.max(5, this.population - killed);
    Game.eventLog(`Disease ravages ${this.name}. ${killed} perish.`, 'danger');
  }

  /**
   * Boosts the tribe's tech level and spawns new warrior units.
   *
   * @description This public API method simulates a beneficial external intervention for the tribe, such as receiving advanced weaponry. It immediately increases the tribe's `techLevel` up to the maximum allowed by its current age. Additionally, it spawns three new warrior units, typically near a barracks or the first available building, reinforcing the tribe's military strength and logging a warning event.
   *
   * @workflow
   * 1. Increases `this.techLevel` by 2, capped at `this.age.tribeMaxTech`.
   * 2. Finds a `BARRACKS` building or the first available building `b`.
   * 3. If `b` is found, calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR)` three times.
   * 4. Logs a warning event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.BARRACKS, CONFIG.ENTITY.WARRIOR, Game.eventLog(), this.techLevel, this.age.tribeMaxTech, this.buildings, this._spawnUnit(), Math.min().
   * @modifies this.techLevel, this.units (via `_spawnUnit`), world (via `_spawnUnit`).
   * @triggers Called by player influence actions.
   * @performance O(B) for finding barracks, then O(1) for fixed number of unit spawns.
   */
  giftWeapons() {
    this.techLevel = Math.min(this.age.tribeMaxTech, this.techLevel + 2);
    const b = this.buildings.find(bd => bd.type === CONFIG.ENTITY.BARRACKS) || this.buildings[0];
    if (b) {
      for (let i = 0; i < 3; i++) this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR);
    }
    Game.eventLog(`${this.name} receives mysterious weapons. Their army grows.`, 'warn');
  }

  // ── Fixed: direct resource manipulation instead of broken setter ──
  /**
   * Reduces the tribe's non-food resources proportionally by a specified amount.
   *
   * @description This public API method simulates a negative external event that causes the tribe to lose a portion of its material wealth. It calculates the total non-food resources (wood, metal, stone) and then drains the specified `amount` by proportionally reducing each resource type. This ensures that the resource distribution remains balanced even after a loss.
   *
   * @workflow
   * 1. Calculates `total` as the sum of `this.res.wood`, `this.res.metal`, and `this.res.stone`.
   * 2. If `total` is less than or equal to 0, returns immediately.
   * 3. Calculates `drain` as the minimum of `amount` and `total`.
   * 4. Calculates `ratio` as `(total - drain) / total`.
   * 5. Multiplies `this.res.wood` by `ratio`.
   * 6. Multiplies `this.res.metal` by `ratio`.
   * 7. Multiplies `this.res.stone` by `ratio`.
   *
   * @param {number} amount - The total amount of resources to drain.
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.res.wood, this.res.metal, this.res.stone.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
  drainResources(amount) {
    const total = this.res.wood + this.res.metal + this.res.stone;
    if (total <= 0) return;
    const drain = Math.min(amount, total);
    /**
     * One-line summary.
     *
     * @description MANDATORY detailed explanation (2-5 sentences).
     *
     * @workflow
     * 1. Specific numbered steps
     * 2. Include conditionals and loops
     *
     * @param {Type} name - Description
     * @returns {Type} Description
     *
     * @dependencies stateManager.get(), etc.
     * @modifies What state/DOM changes
     * @triggers When/how called
     * @performance O(n) complexity notes
     */
    const ratio = (total - drain) / total;
    this.res.wood  *= ratio;
    this.res.metal *= ratio;
    this.res.stone *= ratio;
  }

  /**
   * Checks if the tribe has been eliminated from the game.
   *
   * @description This public API method determines the tribe's survival status. A tribe is considered eliminated if it no longer possesses a `CAPITOL` building, which is its central and most vital structure.
   *
   * @workflow
   * 1. Checks if `this.buildings` contains any building with `type` equal to `CONFIG.ENTITY.CAPITOL`.
   * 2. Returns `true` if no capitol is found, `false` otherwise.
   *
   * @param {void} -
   * @returns {boolean} True if the tribe has no capitol and is eliminated, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.CAPITOL, this.buildings.
   * @modifies None.
   * @triggers Called by game state checks, UI updates.
   * @performance O(B) where B is the number of buildings (due to `some()` method).
   */
  isEliminated() {
    return !this.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL);
  }
}

// Military: spawning, army supply, attacks, towers.
class TribeMilitary {
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
  constructor(tribe) {
    this.tribe = tribe;
  }

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
    this.tribe._militaryTimer++;
    const spawnRate = Math.max(5, 30 - this.tribe.techLevel * 2);
    if (this.tribe._militaryTimer < spawnRate) return;
    this.tribe._militaryTimer = 0;
    if (this.tribe.res.food < 5 || this.tribe.population < 6) return;

    const barracks = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.BARRACKS);
    const capitol  = this.tribe.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL);

    const warriors = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR).length;
    const workers  = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WORKER).length;
    const scouts   = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.SCOUT).length;
    const leaders  = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.LEADER).length;

    const maxWarriors = Math.min(200, Math.floor(this.tribe.population * 0.38) + barracks.length * 12 + this.tribe.techLevel * 3);
    const maxWorkers  = Math.min(30, 6 + this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM).length * 3);
    const maxScouts   = Math.min(25, 5 + Math.floor(this.tribe.population / 35));
    const maxLeaders  = Math.max(1, Math.floor(this.tribe.population / 30));

    if (barracks.length && warriors < maxWarriors && this.tribe.res.metal >= 3) {
      const b = barracks[Math.floor(Math.random() * barracks.length)];
      this.tribe._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR);
      this.tribe.res.food  = Math.max(0, this.tribe.res.food  - 5);
      this.tribe.res.metal = Math.max(0, this.tribe.res.metal - 3);
      return;
    }

    if (barracks.length && leaders < maxLeaders && Math.random() < 0.18 && this.tribe.res.metal >= 10) {
      const b = barracks[0];
      this.tribe._spawnUnit(b.x, b.y, CONFIG.ENTITY.LEADER);
      this.tribe.res.food  = Math.max(0, this.tribe.res.food  - 12);
      this.tribe.res.metal = Math.max(0, this.tribe.res.metal - 10);
      return;
    }

    if (capitol && workers < maxWorkers && Math.random() < 0.50 && this.tribe.res.wood >= 5) {
      this.tribe._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.WORKER);
      this.tribe.res.wood = Math.max(0, this.tribe.res.wood - 5);
      return;
    }

    if (capitol && scouts < maxScouts && Math.random() < 0.40 && this.tribe.res.food >= 5) {
      this.tribe._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.SCOUT);
      this.tribe.res.food = Math.max(0, this.tribe.res.food - 5);
    }
  }

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
    this.tribe._attackTimer++;
    const aggRate = Math.max(12, 70 - this.tribe.techLevel * 6);
    if (this.tribe._attackTimer < aggRate) return;
    this.tribe._attackTimer = 0;

    // Diplomacy check — don't attack if relations prevent it
    if (typeof Game !== 'undefined' && Game.diplomacy) {
      if (!Game.diplomacy.shouldAttack(this.tribe.id, this.tribe._enemy.id, Game.day || 0)) return;
    }

    const moralePenalty = this.tribe.debuffs.morale_loss || 0;
    if (Math.random() < moralePenalty * 0.5) return;

    const idleWarriors = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WARRIOR && u.state === 'idle');
    if (idleWarriors.length < 2) return;

    if (!this.tribe._enemy.buildings.length) return;

    const priorityOrder = [
      CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.BARRACKS, CONFIG.ENTITY.FARM,
      CONFIG.ENTITY.FORT, CONFIG.ENTITY.STOREHOUSE,
    ];
    let target = null;
    for (const ptype of priorityOrder) {
      const opts = this.tribe._enemy.buildings.filter(b => b.type === ptype);
      if (opts.length) { target = opts[Math.floor(Math.random() * opts.length)]; break; }
    }
    if (!target) target = this.tribe._enemy.buildings[Math.floor(Math.random() * this.tribe._enemy.buildings.length)];

    // ── Army formation with supply logistics ────────────────────────────
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
    const minArmy = (typeof DEV !== 'undefined' && DEV.ARMY_MIN_SIZE) || CONFIG.ARMY_MIN_SIZE || 3;
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
    const maxArmy = (typeof DEV !== 'undefined' && DEV.ARMY_MAX_SIZE) || CONFIG.ARMY_MAX_SIZE || 50;
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
    const supplyMult = (typeof DEV !== 'undefined') ? (DEV.ARMY_SUPPLY_MULT || 1) : 1;

    // Estimate campaign distance
    const cap = this.tribe.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL) || this.tribe.buildings[0];
    const campaignDist = cap ? Math.sqrt((target.x - cap.x) ** 2 + (target.y - cap.y) ** 2) : 30;

    // Food needed per soldier: distance × supply rate × buffer
    const supplyPerUnit = Math.ceil(
      campaignDist * (CONFIG.ARMY_SUPPLY_PER_TILE || 0.25) * (CONFIG.ARMY_SUPPLY_BUFFER || 1.3) * supplyMult
    );

    // How many soldiers can we feed?
    const availableFood = Math.floor(this.tribe.res.food * 0.6); // never commit more than 60% of food
    const maxFeedable = supplyPerUnit > 0 ? Math.floor(availableFood / supplyPerUnit) : idleWarriors.length;

    let desiredSize = Math.min(
      idleWarriors.length,
      maxArmy,
      3 + Math.floor(this.tribe.techLevel * 1.5) + Math.floor(idleWarriors.length * 0.5)
    );
    desiredSize = Math.min(desiredSize, maxFeedable);

    if (desiredSize < minArmy) return; // can't feed even a minimal force

    const group = idleWarriors.slice(0, desiredSize);

    // Leader and scouts join (they carry their own food)
    const idleLeader = this.tribe.units.find(u => u.type === CONFIG.ENTITY.LEADER && u.state === 'idle');
    if (idleLeader) group.push(idleLeader);
    const idleScouts = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.SCOUT && u.state === 'idle').slice(0, 2);
    group.push(...idleScouts);

    // Provision the army — draw food from tribe reserves into each unit's carry
    const totalFoodCost = group.length * supplyPerUnit;
    this.tribe.res.food = Math.max(0, this.tribe.res.food - totalFoodCost);

    group.forEach(u => {
      u.carriedFood = Math.max(u.carriedFood || 0, supplyPerUnit);
      u.carriedFoodMax = Math.max(u.carriedFoodMax || 0, supplyPerUnit);
      u.state = 'marching';
      u.targetX = target.x + Math.floor(Math.random() * 3) - 1;
      u.targetY = target.y + Math.floor(Math.random() * 3) - 1;
    });

    if (Math.random() < 0.35) {
      const msgs = [
        `${this.tribe.name} launches an assault! ${group.length} fighters march on ${this.tribe._enemy.name}'s ${target.type.replace('_',' ')}.`,
        `${this.tribe.name} warriors advance on ${this.tribe._enemy.name}. War drums beat across the land.`,
        `${this.tribe.name} sends ${group.length} soldiers to destroy a ${this.tribe._enemy.name} ${target.type.replace('_',' ')}.`,
      ];
      Game.eventLog(msgs[Math.floor(Math.random() * msgs.length)], 'danger');
    }
  }

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
    this.tribe._towerTimer++;
    if (this.tribe._towerTimer < 6) return;
    this.tribe._towerTimer = 0;

    const towers = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.TOWER);
    for (const tower of towers) {
      const level  = tower.level || 1;
      const range  = CONFIG.TOWER_RANGE  + (level - 1) * 2;
      const dmg    = CONFIG.TOWER_DAMAGE * (1 + (level - 1) * 0.4);

      const inRange = this.tribe._enemy.units.filter(eu =>
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

      target.hp -= this.tribe._applyDefenseReduction(target, dmg);
      tower.attackTarget = { x: target.x, y: target.y, id: target.id };
      target._underFire = 4;

      if (target.hp <= 0) {
        this.tribe._enemy._despawnUnitByObject(target);
        this.tribe._enemy.military = this.tribe._enemy.units.length;
        this.tribe._enemy.casualties++;
        tower.attackTarget = null;
      }
    }
  }

}

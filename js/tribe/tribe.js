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

    // ── Subsystems (composition; shared state lives here on the Tribe) ──────
    this.econ = new TribeEconomy(this);
    this.bld  = new TribeBuilding(this);
    this.mil  = new TribeMilitary(this);
    this.pop  = new TribePopulation(this);
    this.ai   = new TribeUnitAI(this);
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
    this.bld._seedStartingHomes(p.x, p.y);

    // Starting units
    const ox = this.id === 'a' ? 1 : -1;
    this._spawnUnit(p.x + ox * 2, p.y,     CONFIG.ENTITY.WARRIOR);
    this._spawnUnit(p.x + ox * 2, p.y + 1, CONFIG.ENTITY.WARRIOR);
    this._spawnUnit(p.x + ox * 3, p.y,     CONFIG.ENTITY.SCOUT);
    this._spawnUnit(p.x,          p.y + 1, CONFIG.ENTITY.WORKER);
    this.pop._syncPopulationUnits();
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
    this.pop._growPopulation();
    this.econ._gatherResources();
    this.pop._updateHunger();
    this.bld._doBuildLogic();
    this.bld._doUpgradeLogic();
    this.mil._doMilitaryLogic();
    this.mil._doAttackLogic();
    this.ai._updateUnits();
    this.mil._updateTowers();
    this.pop._syncPopulationUnits();
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

  // ── Resources ──

  // ── Building Logic ──

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




  // ── Building Upgrades ──



  // ── Military Spawning ──

  // ── Attack Logic ──

  // ── Unit AI ──

  // ── Tower Auto-Attack ──────────────────────────────────────────────────

  // ── Movement helpers — now use spatial hash for wall checks ────────────



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
    if (type === CONFIG.ENTITY.FARM) this.bld._ensureFarmFarmland(b);
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

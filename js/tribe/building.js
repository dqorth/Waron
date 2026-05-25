// Building: construction, upgrades, placement, farm expansion.
class TribeBuilding {
  constructor(tribe) {
    this.tribe = tribe;
  }

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
    this.tribe._buildTimer++;
    if (this.tribe._buildTimer < 15) return;
    this.tribe._buildTimer = 0;

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
    const count = (type) => this.tribe.buildings.filter(b => b.type === type).length;
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
    if (forts < 2 && this.tribe.population > 50) return this._buildNew(CONFIG.ENTITY.FORT, true);
    if (towers < 5) return this._buildNew(CONFIG.ENTITY.TOWER, true);
    if (barracksNum < 3 && this.tribe.population > 80) return this._buildNew(CONFIG.ENTITY.BARRACKS, false);
    if (storehouses < 2) return this._buildNew(CONFIG.ENTITY.STOREHOUSE, false);
    if (homes < 6 && this.tribe.population > 80) return this._buildNew(CONFIG.ENTITY.HOME, false);
    const walls = count(CONFIG.ENTITY.WALL);
    if (walls < 8 && this.tribe.population > 80) return this._buildNew(CONFIG.ENTITY.WALL, true);
    if (foodHalls < 3 && this.tribe.population > 100) return this._buildNew(CONFIG.ENTITY.FARM, false);
    if (storehouses < 3 && this.tribe.population > 120) return this._buildNew(CONFIG.ENTITY.STOREHOUSE, false);
    if (towers < 8 && this.tribe.population > 150) return this._buildNew(CONFIG.ENTITY.TOWER, true);
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
    const farms = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    if (!farms.length) return false;

    const candidates = farms
      .filter(f => (f.size || 1) < this.tribe.econ._getFarmMaxTiles(f.level || 1))
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

    if (!this.tribe._canAfford(cost)) return false;
    if (this.tribe.population < 45 + nextSize * 12) return false;

    const newPlot = this._findExpandableFarmPlot(f);
    if (!newPlot) return false;

    this.tribe._payCost(cost);
    f.size = nextSize;
    f.farmland.push(newPlot);
    f.maxHp += 50;
    f.hp = Math.min(f.maxHp, f.hp + 30);
    Game.eventLog(`${this.tribe.name} expands a farm to size ${nextSize}.`, 'good');
    return true;
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
    if (!cost || !this.tribe._canAfford(cost)) return;

    const anchor = this.tribe.buildings[Math.floor(Math.random() * this.tribe.buildings.length)];
    const ox = this.tribe.id === 'a' ? 1 : -1;
    const spread = facingEnemy ? ox * (3 + Math.floor(Math.random() * 5)) : ox * -(Math.floor(Math.random() * 4));
    const dx = spread + Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 7) - 3;
    const nx = anchor.x + dx, ny = anchor.y + dy;
    const p = this.tribe._world.findNearestWalkable(nx, ny);
    if (!p) return;

    const occupied = this.tribe._world.getEntitiesAt(p.x, p.y);
    if (occupied.some(e => e.type && CONFIG.BUILDING_HP[e.type])) return;

    this.tribe._placeBuilding(p.x, p.y, type);
    this.tribe._payCost(cost);
    const resStr = Object.entries(cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
    Game.eventLog(`${this.tribe.name} builds a ${type.replace('_', ' ')}${resStr ? ' (' + resStr + ')' : ''}.`);
  }

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
    this.tribe._upgradeTimer++;
    if (this.tribe._upgradeTimer < 40) return;
    this.tribe._upgradeTimer = 0;

    const upgradeable = this.tribe.buildings.filter(b => {
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
    if (!this.tribe._canAfford(cost)) return;

    this.tribe._payCost(cost);
    candidate.level = (candidate.level || 1) + 1;
    const baseHp = CONFIG.BUILDING_HP[candidate.type] || 200;
    candidate.maxHp = Math.round(baseHp * (1 + (candidate.level - 1) * 0.25));
    candidate.hp = Math.min(candidate.maxHp, candidate.hp + baseHp * 0.25);
    Game.eventLog(`${this.tribe.name} upgrades ${candidate.type.replace('_',' ')} to level ${candidate.level}.`, 'good');
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
    if (!building || building.tribe !== this.tribe.id) return;
    const maxLv = CONFIG.BUILDING_MAX_LEVEL[building.type] || 1;
    if ((building.level || 1) >= maxLv) return;
    const cost = this._upgradeCost(building);
    if (!this.tribe._canAfford(cost)) return;
    this.tribe._payCost(cost);
    building.level = (building.level || 1) + 1;
    const baseHp = CONFIG.BUILDING_HP[building.type] || 200;
    building.maxHp = Math.round(baseHp * (1 + (building.level - 1) * 0.25));
    building.hp = Math.min(building.maxHp, building.hp + baseHp * 0.25);
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
      const around = this.tribe._world.getNeighbors(farm.x, farm.y).filter(n => this.tribe._world.isWalkable(n.x, n.y));
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
    for (const fb of this.tribe.buildings) {
      if (fb.type !== CONFIG.ENTITY.FARM || !fb.farmland) continue;
      for (const p of fb.farmland) occupiedByFarms.add(`${p.x},${p.y}`);
    }

    const frontier = [{ x: farm.x, y: farm.y }, ...(farm.farmland || [])];
    for (const p of frontier) {
      const ns = this.tribe._world.getNeighbors(p.x, p.y);
      for (const n of ns) {
        if (!this.tribe._world.isWalkable(n.x, n.y)) continue;
        const k = `${n.x},${n.y}`;
        if (occupiedByFarms.has(k)) continue;
        const blocked = this.tribe._world.getEntitiesAt(n.x, n.y).some(e => !!CONFIG.BUILDING_HP[e.type]);
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
    const neededHomes = Math.max(1, Math.ceil(this.tribe.population / this.tribe.pop._homeCapacityByLevel(1)));
    let placed = 0;
    for (let r = 1; r <= 7 && placed < neededHomes; r++) {
      for (let dy = -r; dy <= r && placed < neededHomes; dy++) {
        for (let dx = -r; dx <= r && placed < neededHomes; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this.tribe._world.isWalkable(nx, ny)) continue;
          const occ = this.tribe._world.getEntitiesAt(nx, ny);
          if (occ.some(e => !!CONFIG.BUILDING_HP[e.type])) continue;
          this.tribe._placeBuilding(nx, ny, CONFIG.ENTITY.HOME);
          placed++;
        }
      }
    }
  }

}

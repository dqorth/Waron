// Economy: resource gathering, farms, tech, passive trickle.
class TribeEconomy {
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
    const farms   = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    const homes   = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.HOME).length;
    const capitol = this.tribe.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL) ? 1 : 0;

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
    const weatherType = (this.tribe._world.weather && this.tribe._world.weather.type) || CONFIG.WEATHER.SUNSHINE;
    const weatherTileMult = this._getWeatherFarmTileFactor(weatherType);
    const farmOutput = farms.reduce((sum, f) => {
      this.tribe.bld._ensureFarmFarmland(f);
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
        const tile = this.tribe._world.getTile(plot.x, plot.y);
        const biomeBase = this._getFarmBiomeBaseYield(tile ? tile.type : CONFIG.TILE.GRASS);
        const perTile = Math.max(0, Math.min(5, biomeBase * weatherTileMult * levelMult * workerMult));
        farmFood += perTile;
      }
      return sum + farmFood;
    }, 0);
    const farmMult = this.tribe._world.weatherMods ? this.tribe._world.weatherMods.farmMult : 1;
    this.tribe.res.food = Math.min(foodCap, this.tribe.res.food + farmOutput * farmMult);

    // Capitol food trickle — ensures tribes survive before first farm
    if (this.tribe.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL)) {
      this.tribe.res.food = Math.min(foodCap, this.tribe.res.food + 2);
    }

    // Food spoilage
    this.tribe.res.food = Math.max(0, this.tribe.res.food - this.tribe.res.food * CONFIG.FOOD_SPOIL_RATE);

    // Resource storage caps
    const storehouses = this.tribe.buildings.filter(b => b.type === CONFIG.ENTITY.STOREHOUSE);
    const storageCap  = CONFIG.STORAGE_BASE_CAP
      + storehouses.reduce((s, b) => s + CONFIG.STORAGE_PER_STOREHOUSE * (b.level || 1), 0);

    // Workers harvest from landscape tiles
    const workers = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WORKER);
    for (const w of workers) {
      const gained = this.tribe._world.harvestTile(w.x, w.y, 1 + this.tribe.techLevel * 0.1);
      if (gained) {
        for (const [res, amt] of Object.entries(gained)) {
          if (res === 'food') continue;
          if (res in this.tribe.res) this.tribe.res[res] = Math.min(storageCap, this.tribe.res[res] + amt);
        }
      }
      if (w.state === 'idle' && this.tribe.res.stone >= 2) {
        this.tribe._world.setRoad(w.x, w.y);
        this.tribe.res.stone = Math.max(0, this.tribe.res.stone - 0.5);
      }
    }

    // Passive trickle — fractional accumulator so low pop still produces
    const passiveMult = 1 + this.tribe.techLevel * 0.04;
    const rawPassive = this.tribe.population * 0.004 * passiveMult;
    this.tribe._metalAccum = (this.tribe._metalAccum || 0) + rawPassive;
    this.tribe._stoneAccum = (this.tribe._stoneAccum || 0) + rawPassive;
    const metalGain = Math.floor(this.tribe._metalAccum);
    const stoneGain = Math.floor(this.tribe._stoneAccum);
    this.tribe._metalAccum -= metalGain;
    this.tribe._stoneAccum -= stoneGain;
    this.tribe.res.metal = Math.min(storageCap, this.tribe.res.metal + Math.max(metalGain, 1));
    this.tribe.res.stone = Math.min(storageCap, this.tribe.res.stone + Math.max(stoneGain, 1));
    this.tribe._techTimer++;
    const techRate = Math.max(4, 14 - this.tribe.techLevel);
    if (this.tribe._techTimer >= techRate) {
      this.tribe._techTimer = 0;
      const boost   = this.tribe.debuffs.research_boost || 0;
      const penalty = this.tribe.debuffs.research_slow  || 0;
      this.tribe.knowledge += Math.max(0, 2 + Math.round(boost * 3) - Math.round(penalty * 2));
    }
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

    const workers = this.tribe.units.filter(u => u.type === CONFIG.ENTITY.WORKER);
    const available = workers.slice();

    for (const f of farms) {
      this.tribe.bld._ensureFarmFarmland(f);
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

}

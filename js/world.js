class World {
  /**
   * Initializes a new World instance with map dimensions, tile data, entities, and spatial indexing structures.
   *
   * @description The constructor sets up the foundational properties of the game world. It initializes the map dimensions based on `CONFIG`, prepares empty arrays for `tiles` and `entities`, and sets up internal tracking for entity IDs, weather, and a tree map. Crucially, it establishes a spatial hash grid for efficient entity lookups and caches for territory counts and resource regeneration, then calls `generate()` to populate the world.
   *
   * @workflow
   * 1. Initialize `W` and `H` (width and height) from `CONFIG.MAP_W` and `CONFIG.MAP_H`.
   * 2. Initialize empty arrays for `tiles` and `entities`.
   * 3. Set `_nextEntityId` to 1.
   * 4. Define initial `weather` conditions and `weatherMods` multipliers.
   * 5. Initialize an empty `treeMap` object for tracking trees.
   * 6. Set up spatial hash properties: `_spatialCellSize`, an empty `_spatialGrid` object, and an empty `_entityById` object.
   * 7. Initialize territory cache: `_territoryCount` and `_territoryDirty` flag.
   * 8. Initialize `_regenTiles` as an empty array for resource tick optimization.
   * 9. Call the `generate()` method to populate the world with tiles, resources, and initial entities.
   *
   * @param {void}
   * @returns {void} This is a constructor, it does not explicitly return a value.
   *
   * @dependencies CONFIG (for MAP_W, MAP_H, WEATHER.SUNSHINE). this.generate().
   * @modifies this.W, this.H, this.tiles, this.entities, this._nextEntityId, this.weather, this.weatherMods, this.treeMap, this._spatialCellSize, this._spatialGrid, this._entityById, this._territoryCount, this._territoryDirty, this._regenTiles.
   * @triggers Called automatically when a new `World` object is instantiated. Immediately calls `this.generate()`.
   * @performance O(1) for initialization, but the subsequent call to `generate()` will have higher complexity.
   */
  constructor() {
    this.W = CONFIG.MAP_W;
    this.H = CONFIG.MAP_H;
    this.tiles = [];
    this.entities = [];
    this._nextEntityId = 1;
    this.weather = { type: CONFIG.WEATHER.SUNSHINE, intensity: 1.0 };
    this.weatherMods = { foodSpoilMult: 1, moveMult: 1, farmMult: 1 };
    this.treeMap = {};  // key: "x,y" → { x, y, growth:1-5, growthTicks:0 }

    // ── Spatial hash for O(1) entity lookups ──────────────────────────────
    this._spatialCellSize = 8;
    this._spatialGrid = {};    // "cx,cy" → Set of entity ids
    this._entityById = {};     // id → entity

    // ── Territory cache ──────────────────────────────────────────────────
    this._territoryCount = { a: 0, b: 0 };
    this._territoryDirty = true;

    // ── Resource tick optimization: track non-full tiles ─────────────────
    this._regenTiles = [];     // [{x,y}] — tiles needing regen

    this.generate();
  }

  /**
   * Populates the game world with tiles, assigns biomes based on noise, and spawns initial resources and trees.
   *
   * @description This method resets the `tiles` array and then iteratively creates each tile in the `W`x`H` grid. It uses multiple Perlin noise layers (elevation, moisture, temperature, ruins) to determine the biome type and resource availability for each tile. It also ensures a traversable corridor in the map's center and spawns trees on appropriate biome tiles before rebuilding the resource regeneration list.
   *
   * @workflow
   * 1. Clear `this.tiles` array.
   * 2. Calculate a `seedOffset` from `CONFIG.MAP_SEED`.
   * 3. Generate four noise maps: `elevNoise`, `moistNoise`, `tempNoise`, `ruinNoise` using `_buildNoise` with different seeds.
   * 4. Iterate through each `(x, y)` coordinate from `(0,0)` to `(W-1, H-1)`:
   *    - Calculate raw elevation `h`, moisture `m`, and temperature `temp` for the tile, adjusting `h` by `edgeDist`.
   *    - Determine `type` based on `h`, `m`, and `temp` using a series of conditional checks against `CONFIG.TILE` thresholds.
   *    - If `type` is `GRASS` or `SAVANNA` and `ruinNoise` is high, set `type` to `RUINS`.
   *    - Determine `resourceNode` properties (max, amount) if the tile type is not `WATER` or `MOUNTAIN` and has a `TILE_YIELD` entry.
   *    - Assign the constructed tile object to `this.tiles[y][x]`.
   * 5. Iterate through a central corridor region (`y` from 12 to `H-12`, `x` from `midX-4` to `midX+4`):
   *    - If a tile in this region is `WATER` or `MOUNTAIN`, force its `type` to `GRASS` and assign a default `resourceNode`.
   * 6. Initialize `this.treeMap`.
   * 7. Iterate through all `(tx2, ty2)` coordinates:
   *    - If the tile type is `FOREST` or `JUNGLE` and `Math.random()` exceeds `CONFIG.TREE_SPAWN_CHANCE`, spawn a tree:
   *        - Generate random `growth` (1-5) and `growthTicks`.
   *        - Add the tree object to `this.treeMap` with key `${tx2},${ty2}`.
   * 8. Call `this._rebuildRegenList()` to initialize the list of tiles requiring resource regeneration.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies CONFIG (for MAP_W, MAP_H, MAP_SEED, TILE, TILE_YIELD, TILE_RESOURCE_MAX, TREE_SPAWN_CHANCE, TREE_TICKS_PER_STAGE). this._buildNoise(), this._rebuildRegenList().
   * @modifies this.tiles, this.treeMap, this._regenTiles.
   * @triggers Called once by the `constructor` after world initialization.
   * @performance O(W * H * octaves) due to nested loops for tile generation and noise calculation, plus additional loops for corridor adjustment and tree spawning. This is a one-time setup cost.
   */
  generate() {
    this.tiles = [];
    const W = this.W;
    const H = this.H;
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
    const seedOffset = (CONFIG.MAP_SEED % 999983) / 999983;

    const elevNoise = this._buildNoise(W, H, 7, seedOffset);
    const moistNoise = this._buildNoise(W, H, 4, seedOffset + 0.37);
    const tempNoise = this._buildNoise(W, H, 3, seedOffset + 0.73);
    const ruinNoise = this._buildNoise(W, H, 2, seedOffset + 1.17);

    const TILE = CONFIG.TILE;

    for (let y = 0; y < H; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < W; x++) {
        const raw = elevNoise[y][x];
        const m = moistNoise[y][x];
        const tv = tempNoise[y][x];

        const edgeDist = Math.min(x, y, W - 1 - x, H - 1 - y);
        const h = raw * Math.min(1, edgeDist / 10);

        const latHeat = 1 - 2 * Math.abs(y / H - 0.5);
        const temp = latHeat * 0.75 + tv * 0.25;

        let type;
        if (h < 0.10) {
          type = TILE.WATER;
        } else if (h > 0.82) {
          type = temp < 0.32 ? TILE.SNOW : TILE.MOUNTAIN;
        } else if (h > 0.68) {
          type = temp < 0.28 ? TILE.TUNDRA : TILE.STONE;
        } else if (temp < 0.18) {
          type = m > 0.55 ? TILE.SNOW : TILE.TUNDRA;
        } else if (temp < 0.36) {
          type = m > 0.62 ? TILE.FOREST : (m < 0.22 ? TILE.TUNDRA : TILE.GRASS);
        } else if (temp > 0.72) {
          if (m > 0.68) type = TILE.JUNGLE;
          else if (m > 0.42) type = TILE.SAVANNA;
          else type = TILE.DESERT;
        } else {
          if (m > 0.70 && h < 0.28) type = TILE.WETLAND;
          else if (m > 0.54) type = TILE.FOREST;
          else if (m < 0.18) type = TILE.DESERT;
          else type = TILE.GRASS;
        }

        if ((type === TILE.GRASS || type === TILE.SAVANNA) && ruinNoise[y][x] > 0.91) {
          type = TILE.RUINS;
        }

        const yieldTable = CONFIG.TILE_YIELD[type];
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
        const resourceNode = (yieldTable && type !== TILE.WATER && type !== TILE.MOUNTAIN)
          ? {
              max: CONFIG.TILE_RESOURCE_MAX,
              amount: CONFIG.TILE_RESOURCE_MAX * (0.5 + 0.5 * m),
            }
          : null;

        this.tiles[y][x] = {
          type,
          elevation: h,
          owner: null,
          fertility: m,
          temperature: temp,
          road: false,
          resourceNode,
        };
      }
    }

    // Ensure a center corridor remains traversable.
    const midX = Math.floor(W / 2);
    for (let ty = 12; ty < H - 12; ty++) {
      for (let dx = -4; dx <= 4; dx++) {
        const tx = midX + dx;
        if (tx < 0 || tx >= W) continue;
        const t = this.tiles[ty][tx];
        if (t.type === TILE.WATER || t.type === TILE.MOUNTAIN) {
          t.type = TILE.GRASS;
          t.resourceNode = {
            max: CONFIG.TILE_RESOURCE_MAX,
            amount: CONFIG.TILE_RESOURCE_MAX * 0.5,
          };
        }
      }
    }

    // Spawn tree entities on FOREST and JUNGLE tiles.
    this.treeMap = {};
    const TREE_BIOMES = new Set([TILE.FOREST, TILE.JUNGLE]);
    for (let ty2 = 0; ty2 < H; ty2++) {
      for (let tx2 = 0; tx2 < W; tx2++) {
        const tile = this.tiles[ty2][tx2];
        if (!TREE_BIOMES.has(tile.type)) continue;
        if (Math.random() > CONFIG.TREE_SPAWN_CHANCE) continue;
        const growth = 1 + Math.floor(Math.random() * 5);
        this.treeMap[`${tx2},${ty2}`] = {
          x: tx2, y: ty2,
          growth,
          growthTicks: Math.floor(Math.random() * CONFIG.TREE_TICKS_PER_STAGE),
        };
      }
    }

    // Build initial regen list (tiles not at max)
    this._rebuildRegenList();
  }

  // ── Spatial hash helpers ────────────────────────────────────────────────
  /**
   * Calculates a spatial hash grid key for a given coordinate.
   *
   * @description This private helper function takes world coordinates `x` and `y` and converts them into a string key for the spatial hash grid. The key identifies the cell within the grid that corresponds to the given coordinates, based on the predefined `_spatialCellSize`.
   *
   * @workflow
   * 1. Retrieve `_spatialCellSize` from `this`.
   * 2. Divide `x` by `_spatialCellSize` and perform a bitwise OR with 0 to effectively floor the result (integer division).
   * 3. Divide `y` by `_spatialCellSize` and perform a bitwise OR with 0 to effectively floor the result.
   * 4. Concatenate the results with a comma to form the string key "cx,cy".
   *
   * @param {number} x - The X-coordinate in the world.
   * @param {number} y - The Y-coordinate in the world.
   * @returns {string} A string representing the spatial grid cell key (e.g., "3,5").
   *
   * @dependencies this._spatialCellSize.
   * @modifies None.
   * @triggers Called internally by `_spatialInsert`, `_spatialMove`, `getEntitiesAt`, `hasEnemyWall`.
   * @performance O(1) constant time operation.
   */
  _spatialKey(x, y) {
    const cs = this._spatialCellSize;
    return ((x / cs) | 0) + ',' + ((y / cs) | 0);
  }

  /**
   * Adds an entity to the spatial hash grid and entity lookup map.
   *
   * @description This private method inserts a given entity into the world's spatial indexing system. It calculates the appropriate spatial grid cell key for the entity's current position and adds the entity's ID to a Set associated with that key. It also stores a reference to the entity in a direct ID-to-entity map and updates the entity with its calculated spatial key.
   *
   * @workflow
   * 1. Calculate the `key` for the entity's `x` and `y` coordinates using `_spatialKey()`.
   * 2. If `this._spatialGrid[key]` does not exist, initialize it as a new `Set`.
   * 3. Add the `entity.id` to the `Set` at `this._spatialGrid[key]`.
   * 4. Store a direct reference to the `entity` in `this._entityById` using its `id`.
   * 5. Assign the calculated `key` to `entity._spatialKey` for future quick removal/update.
   *
   * @param {object} entity - The entity object to insert. Must have `id`, `x`, `y` properties.
   * @returns {void}
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById.
   * @modifies this._spatialGrid, this._entityById, entity._spatialKey.
   * @triggers Called by `addEntity` when a new entity is added to the world, and by `_spatialMove` when an entity changes spatial grid cells.
   * @performance O(1) on average for Set operations and map lookups.
   */
  _spatialInsert(entity) {
    const key = this._spatialKey(entity.x, entity.y);
    if (!this._spatialGrid[key]) this._spatialGrid[key] = new Set();
    this._spatialGrid[key].add(entity.id);
    this._entityById[entity.id] = entity;
    entity._spatialKey = key;
  }

  /**
   * Removes an entity from the spatial hash grid and entity lookup map.
   *
   * @description This private method removes an entity from the world's spatial indexing structures. It uses the `_spatialKey` stored on the entity to locate its entry in the `_spatialGrid` and removes its ID. If the cell becomes empty, the cell itself is removed from the grid. The entity is also removed from the direct ID-to-entity map.
   *
   * @workflow
   * 1. Retrieve the `key` from `entity._spatialKey`.
   * 2. If the `key` exists and the corresponding `Set` in `this._spatialGrid` exists:
   *    - Remove `entity.id` from the `Set`.
   *    - If the `Set` becomes empty after removal, delete the `key` from `this._spatialGrid`.
   * 3. Delete the `entity.id` entry from `this._entityById`.
   * 4. Set `entity._spatialKey` to `undefined` to clear its spatial tracking reference.
   *
   * @param {object} entity - The entity object to remove. Must have `id` and `_spatialKey` properties.
   * @returns {void}
   *
   * @dependencies this._spatialGrid, this._entityById.
   * @modifies this._spatialGrid, this._entityById, entity._spatialKey.
   * @triggers Called by `removeEntity` when an entity is removed from the world, and by `_spatialMove` when an entity changes spatial grid cells.
   * @performance O(1) on average for Set operations and map lookups.
   */
  _spatialRemove(entity) {
    const key = entity._spatialKey;
    if (key && this._spatialGrid[key]) {
      this._spatialGrid[key].delete(entity.id);
      if (this._spatialGrid[key].size === 0) delete this._spatialGrid[key];
    }
    delete this._entityById[entity.id];
    entity._spatialKey = undefined;
  }

  /**
   * Updates an entity's position within the spatial hash grid if it has moved to a different cell.
   *
   * @description This private method is called when an entity's coordinates might have changed. It calculates a new spatial key for the entity and compares it to the entity's previously stored key. If the keys differ, indicating the entity has moved to a new spatial grid cell, the entity is first removed from its old cell and then inserted into its new cell.
   *
   * @workflow
   * 1. Calculate the `newKey` for the entity's current `x` and `y` using `_spatialKey()`.
   * 2. If `newKey` is the same as `entity._spatialKey`, return immediately as no spatial grid change is needed.
   * 3. Call `_spatialRemove(entity)` to remove the entity from its old grid cell.
   * 4. Call `_spatialInsert(entity)` to insert the entity into its new grid cell.
   *
   * @param {object} entity - The entity object that has potentially moved. Must have `x`, `y`, `id`, and `_spatialKey` properties.
   * @returns {void}
   *
   * @dependencies this._spatialKey(), this._spatialRemove(), this._spatialInsert().
   * @modifies this._spatialGrid and this._entityById indirectly via `_spatialRemove` and `_spatialInsert`, and `entity._spatialKey`.
   * @triggers Called by `notifyEntityMoved` after an entity's position has been updated (e.g., a unit has moved).
   * @performance O(1) on average if the entity changes cells, O(1) if it stays in the same cell.
   */
  _spatialMove(entity) {
    const newKey = this._spatialKey(entity.x, entity.y);
    if (newKey === entity._spatialKey) return;
    this._spatialRemove(entity);
    this._spatialInsert(entity);
  }

  // ── Resource regen optimization ─────────────────────────────────────────
  /**
   * Reconstructs the list of tiles that require resource regeneration.
   *
   * @description This private method iterates through every tile in the world and identifies those with `resourceNode` objects whose current `amount` is less than their `max` capacity. These tiles are added to `_regenTiles`, an optimized list used by `tickResources` to efficiently update only the relevant tiles, rather than scanning the entire map each tick.
   *
   * @workflow
   * 1. Clear the existing `this._regenTiles` array.
   * 2. Iterate through every `y` coordinate from `0` to `H-1`.
   * 3. For each `y`, iterate through every `x` coordinate from `0` to `W-1`.
   * 4. Access the `resourceNode` of the current tile `this.tiles[y][x]`.
   * 5. If a `resourceNode` exists AND its `amount` is less than its `max` amount:
   *    - Add an object `{ x, y }` to `this._regenTiles`.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies this._regenTiles.
   * @triggers Called once during world initialization by `generate()`.
   * @performance O(W * H) as it iterates through every tile on the map. This is performed rarely (once at init).
   */
  _rebuildRegenList() {
    this._regenTiles = [];
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const node = this.tiles[y][x].resourceNode;
        if (node && node.amount < node.max) {
          this._regenTiles.push({ x, y });
        }
      }
    }
  }

  /**
   * Adds a specific tile's coordinates to the resource regeneration list.
   *
   * @description This private helper function is used to add the coordinates of a tile `(x, y)` to the `_regenTiles` list. This optimization ensures that tiles whose resources have been harvested below their maximum capacity are tracked and will be processed for regeneration by `tickResources`. It uses a simple push, accepting minor duplicates which are cleaned up during the `tickResources` processing.
   *
   * @workflow
   * 1. Push an object `{ x, y }` representing the tile's coordinates into the `this._regenTiles` array.
   *
   * @param {number} x - The X-coordinate of the tile.
   * @param {number} y - The Y-coordinate of the tile.
   * @returns {void}
   *
   * @dependencies this._regenTiles.
   * @modifies this._regenTiles.
   * @triggers Called by `harvestTile` when resources are taken from a tile, making it eligible for regeneration.
   * @performance O(1) constant time for array push.
   */
  _markTileNeedsRegen(x, y) {
    // Only add if not already tracked (simple — we accept minor dupes, cleaned on tick)
    this._regenTiles.push({ x, y });
  }

  // ── Noise generation (unchanged) ───────────────────────────────────────
  /**
   * Generates a 2D Perlin noise map for terrain generation.
   *
   * @description This private utility function constructs a 2D array of noise values, commonly used for procedural terrain generation. It applies a multi-octave Perlin-like noise algorithm, where each octave adds more detail at a higher frequency and lower amplitude. This process smooths the noise values and allows for complex, natural-looking patterns.
   *
   * @workflow
   * 1. Initialize an empty 2D array `data`.
   * 2. Iterate through each `y` coordinate from `0` to `H-1`.
   * 3. For each `y`, initialize `data[y]` as an empty array.
   * 4. Iterate through each `x` coordinate from `0` to `W-1`.
   * 5. For each `(x, y)`:
   *    - Initialize `value`, `amp`, `freq`, and `norm` for noise calculation.
   *    - Loop `octaves` times:
   *        - Calculate `value` by adding the result of `_smoothNoise()` (scaled by `amp`) using `x`, `y`, and `seedShift`.
   *        - Add `amp` to `norm`.
   *        - Halve `amp` (multiplied by 0.55) for the next octave.
   *        - Double `freq` for the next octave.
   *    - Divide `value` by `norm` (normalized sum of amplitudes) to get the final noise value for `data[y][x]`.
   * 6. Return the `data` 2D array.
   *
   * @param {number} W - The width of the noise map.
   * @param {number} H - The height of the noise map.
   * @param {number} octaves - The number of noise layers to combine for detail.
   * @param {number} seedShift - A unique seed offset to create different noise patterns.
   * @returns {number[][]} A 2D array `[y][x]` containing normalized noise values between 0 and 1.
   *
   * @dependencies this._smoothNoise().
   * @modifies None, generates new data.
   * @triggers Called by `generate()` to create elevation, moisture, temperature, and ruin noise maps.
   * @performance O(W * H * octaves) due to nested loops and repeated `_smoothNoise` calls. This is a one-time calculation during world generation.
   */
  _buildNoise(W, H, octaves, seedShift) {
    const data = [];
    for (let y = 0; y < H; y++) {
      data[y] = [];
      for (let x = 0; x < W; x++) {
        let value = 0;
        let amp = 1;
        let freq = 0.012;
        let norm = 0;

        for (let i = 0; i < octaves; i++) {
          value += this._smoothNoise((x + seedShift * 997) * freq, (y + seedShift * 733) * freq) * amp;
          norm += amp;
          amp *= 0.55;
          freq *= 2;
        }

        data[y][x] = value / Math.max(0.0001, norm);
      }
    }
    return data;
  }

  /**
   * Calculates a 2D smooth noise value using cubic interpolation.
   *
   * @description This private utility function generates a single smooth noise value for a given `(x, y)` coordinate. It implements a form of Perlin noise interpolation by determining the four surrounding integer grid points, generating pseudo-random values for each of those points, and then smoothly blending them based on the fractional parts of `x` and `y` using a cubic (3x^2 - 2x^3) easing curve.
   *
   * @workflow
   * 1. Extract integer parts `ix`, `iy` and fractional parts `fx`, `fy` from `x`, `y`.
   * 2. Calculate cubic interpolation weights `ux` and `uy` from `fx` and `fy`.
   * 3. Define an inline helper function `r(nx, ny)`:
   *    - Generates a pseudo-random value between 0 and 1 for integer coordinates `(nx, ny)` using a deterministic sine function.
   * 4. Calculate the weighted sum of `r` values for the four surrounding grid points: `(ix, iy)`, `(ix+1, iy)`, `(ix, iy+1)`, `(ix+1, iy+1)`.
   * 5. Return the interpolated noise value.
   *
   * @param {number} x - The X-coordinate for noise calculation (can be fractional).
   * @param {number} y - The Y-coordinate for noise calculation (can be fractional).
   * @returns {number} A smooth noise value, typically between 0 and 1 (though can be outside this range without explicit clamping).
   *
   * @dependencies Math.floor(), Math.sin().
   * @modifies None.
   * @triggers Called repeatedly by `_buildNoise` for each point and octave.
   * @performance O(1) constant time per call, involving fixed number of mathematical operations.
   */
  _smoothNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    /**
     * Generates a pseudo-random value between 0 and 1 based on integer coordinates.
     *
     * @description This local helper function, defined within `_smoothNoise`, provides a deterministic pseudo-random number for any given integer `(nx, ny)` coordinate. It uses a mathematical sine function with large, arbitrary constants to create a fractional output that appears random but is consistent for the same input coordinates, crucial for reproducible noise generation.
     *
     * @workflow
     * 1. Calculate a value `n` using `Math.sin()` with `nx`, `ny`, and several large magic numbers.
     * 2. Subtract the floor of `n` from `n` to get the fractional part, effectively mapping `n` to `[0, 1)`.
     * 3. Return the resulting pseudo-random float.
     *
     * @param {number} nx - The integer X-coordinate.
     * @param {number} ny - The integer Y-coordinate.
     * @returns {number} A pseudo-random float between 0 (inclusive) and 1 (exclusive).
     *
     * @dependencies Math.sin(), Math.floor().
     * @modifies None.
     * @triggers Called four times by `_smoothNoise` for the four grid points surrounding the input `(x, y)`.
     * @performance O(1) constant time due to fixed mathematical operations.
     */
    const r = (nx, ny) => {
      const n = Math.sin(nx * 127.1 + ny * 311.7 + 43758.5453) * 43758.5453;
      return n - Math.floor(n);
    };

    return r(ix, iy) * (1 - ux) * (1 - uy)
      + r(ix + 1, iy) * ux * (1 - uy)
      + r(ix, iy + 1) * (1 - ux) * uy
      + r(ix + 1, iy + 1) * ux * uy;
  }

  /**
   * Retrieves the tile object at specified world coordinates.
   *
   * @description This method provides safe access to the game world's tile data. It takes `x` and `y` coordinates and returns the corresponding tile object from `this.tiles`. Before accessing, it performs bounds checking to ensure the coordinates are within the map's dimensions, returning `null` if they are out of bounds.
   *
   * @workflow
   * 1. Check if `x` is less than 0 or greater than or equal to `this.W`.
   * 2. Check if `y` is less than 0 or greater than or equal to `this.H`.
   * 3. If any of these conditions are true (coordinates are out of bounds), return `null`.
   * 4. Otherwise, return the tile object located at `this.tiles[y][x]`.
   *
   * @param {number} x - The X-coordinate of the tile.
   * @param {number} y - The Y-coordinate of the tile.
   * @returns {object|null} The tile object at `(x, y)` if within bounds, otherwise `null`.
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies None.
   * @triggers Frequently called by various methods that need to inspect or modify specific tiles, such as `isWalkable`, `setRoad`, `harvestTile`, `plantTree`, `updateTerritory`, `findNearestWalkable`.
   * @performance O(1) constant time due to direct array access and simple bounds checking.
   */
  getTile(x, y) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return null;
    return this.tiles[y][x];
  }

  // ── Optimized: only iterate tiles that actually need regen ─────────────
  /**
   * Processes the regeneration of resources on tiles in the world.
   *
   * @description This method simulates the natural regeneration of resources on tiles. It iterates specifically through the `_regenTiles` list, which contains only tiles that need regeneration. For each such tile, it increments the `resourceNode.amount` up to its `max`. Tiles that reach their maximum resource amount are removed from the `_regenTiles` list, while those still needing regeneration remain for subsequent ticks. After processing resources, it calls `tickTrees()` to handle tree growth.
   *
   * @workflow
   * 1. Get `regen` amount from `CONFIG.TILE_RESOURCE_REGEN`.
   * 2. Initialize an empty array `surviving` to hold tiles that still need regeneration.
   * 3. Loop through each `p` (tile coordinate `{x,y}`) in `this._regenTiles`.
   * 4. Retrieve the `resourceNode` from `this.tiles[p.y][p.x]`.
   * 5. If `resourceNode` is null, skip to the next tile.
   * 6. If `resourceNode.amount` is already at `node.max`, skip to the next tile.
   * 7. Increase `node.amount` by `regen`, capping it at `node.max`.
   * 8. If `node.amount` is still less than `node.max` after regeneration, add `p` to the `surviving` list.
   * 9. Replace `this._regenTiles` with the `surviving` list.
   * 10. Call `this.tickTrees()` to advance tree growth.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies CONFIG.TILE_RESOURCE_REGEN, this.tiles, this._regenTiles, this.tickTrees().
   * @modifies this.tiles[y][x].resourceNode.amount` for tiles in `_regenTiles`, `this._regenTiles`.
   * @triggers Called once per game tick by the main game loop (presumably).
   * @performance O(R) where R is the number of tiles in `this._regenTiles`. This is an optimization over O(W * H) as only active resource nodes are processed. In a sparse or well-maintained world, R should be much smaller than W*H.
   */
  tickResources() {
    const regen = CONFIG.TILE_RESOURCE_REGEN;
    const surviving = [];
    for (let i = 0; i < this._regenTiles.length; i++) {
      const p = this._regenTiles[i];
      const node = this.tiles[p.y][p.x].resourceNode;
      if (!node) continue;
      if (node.amount >= node.max) continue;
      node.amount = Math.min(node.max, node.amount + regen);
      if (node.amount < node.max) surviving.push(p);
    }
    this._regenTiles = surviving;
    this.tickTrees();
  }

  /**
   * Advances the growth stage of all trees in the world.
   *
   * @description This method simulates the growth of trees by iterating through all tracked trees in `this.treeMap`. For each tree that has not reached its maximum growth stage (level 5), it increments its `growthTicks`. Once `growthTicks` reaches `CONFIG.TREE_TICKS_PER_STAGE`, the tree's `growth` level is incremented, and `growthTicks` is reset, signifying progression to the next growth stage.
   *
   * @workflow
   * 1. Iterate over the keys of `this.treeMap`.
   * 2. For each `key`, retrieve the `tree` object.
   * 3. If `tree.growth` is already 5 (maximum), skip to the next tree.
   * 4. Increment `tree.growthTicks`.
   * 5. If `tree.growthTicks` is greater than or equal to `CONFIG.TREE_TICKS_PER_STAGE`:
   *    - Increment `tree.growth`.
   *    - Reset `tree.growthTicks` to 0.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.treeMap, CONFIG.TREE_TICKS_PER_STAGE.
   * @modifies tree.growth, tree.growthTicks` for trees in `this.treeMap`.
   * @triggers Called once per game tick by `tickResources()`.
   * @performance O(T) where T is the number of trees in `this.treeMap`.
   */
  tickTrees() {
    for (const key of Object.keys(this.treeMap)) {
      const tree = this.treeMap[key];
      if (tree.growth >= 5) continue;
      tree.growthTicks++;
      if (tree.growthTicks >= CONFIG.TREE_TICKS_PER_STAGE) {
        tree.growth++;
        tree.growthTicks = 0;
      }
    }
  }

  /**
   * Harvests a tree at specified coordinates, removing it and returning its wood yield.
   *
   * @description This method allows a tree located at `(x, y)` to be harvested. It looks up the tree in `this.treeMap`. If a tree is found, its `growth` level determines the amount of wood yielded. The tree is then removed from the `treeMap`, and the harvested wood quantity is returned. If no tree exists at the given coordinates, it returns 0.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}` for the tree map lookup.
   * 2. Retrieve the `tree` object from `this.treeMap` using the `key`.
   * 3. If no `tree` is found (it's `null` or `undefined`), return 0.
   * 4. Store the `tree.growth` value as `wood`.
   * 5. Delete the tree entry from `this.treeMap` using the `key`.
   * 6. Return the `wood` amount.
   *
   * @param {number} x - The X-coordinate of the tree.
   * @param {number} y - The Y-coordinate of the tree.
   * @returns {number} The amount of wood harvested (equal to the tree's growth stage), or 0 if no tree was found.
   *
   * @dependencies this.treeMap.
   * @modifies this.treeMap (removes the harvested tree).
   * @triggers Called when an entity (e.g., a unit) attempts to harvest wood from a tile.
   * @performance O(1) constant time due to direct map lookup and deletion.
   */
  harvestTree(x, y) {
    const key = `${x},${y}`;
    const tree = this.treeMap[key];
    if (!tree) return 0;
    const wood = tree.growth;
    delete this.treeMap[key];
    return wood;
  }

  /**
   * Plants a new sapling at specified coordinates if conditions allow.
   *
   * @description This method attempts to plant a new tree at the given `(x, y)` coordinates. It first checks if a tree already exists at that location or if the tile is unsuitable (water or mountain). If conditions are met, a new tree object with initial growth (level 1) and growth ticks (0) is added to `this.treeMap`, and the method returns `true`. Otherwise, it returns `false`.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}`.
   * 2. Check if `this.treeMap[key]` already exists; if so, return `false`.
   * 3. Retrieve the tile at `(x, y)` using `this.getTile()`.
   * 4. If the tile is null (out of bounds) or its type is `CONFIG.TILE.WATER` or `CONFIG.TILE.MOUNTAIN`, return `false`.
   * 5. Create a new tree object `{ x, y, growth: 1, growthTicks: 0 }`.
   * 6. Add the new tree object to `this.treeMap` using the `key`.
   * 7. Return `true` to indicate successful planting.
   *
   * @param {number} x - The X-coordinate for planting.
   * @param {number} y - The Y-coordinate for planting.
   * @returns {boolean} `true` if the tree was successfully planted, `false` otherwise.
   *
   * @dependencies this.treeMap, this.getTile(), CONFIG.TILE.WATER, CONFIG.TILE.MOUNTAIN.
   * @modifies this.treeMap (adds a new tree).
   * @triggers Called when an entity (e.g., a unit) attempts to plant a tree.
   * @performance O(1) constant time due to map lookup and `getTile` which is also O(1).
   */
  plantTree(x, y) {
    const key = `${x},${y}`;
    if (this.treeMap[key]) return false;
    const tile = this.getTile(x, y);
    if (!tile || tile.type === CONFIG.TILE.WATER || tile.type === CONFIG.TILE.MOUNTAIN) return false;
    this.treeMap[key] = { x, y, growth: 1, growthTicks: 0 };
    return true;
  }

  /**
   * Retrieves a tree object at specific coordinates.
   *
   * @description This method allows direct lookup of a tree at a particular `(x, y)` location. It constructs a key from the coordinates and queries `this.treeMap`. If a tree exists at that precise location, the tree object is returned; otherwise, `null` is returned.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}`.
   * 2. Return the value found at `this.treeMap[key]`, or `null` if it doesn't exist.
   *
   * @param {number} x - The X-coordinate to check.
   * @param {number} y - The Y-coordinate to check.
   * @returns {object|null} The tree object if found, otherwise `null`.
   *
   * @dependencies this.treeMap.
   * @modifies None.
   * @triggers Called when an entity needs to check for a tree at a specific location, or to interact with it.
   * @performance O(1) constant time due to direct map lookup.
   */
  getTreeAt(x, y) {
    return this.treeMap[`${x},${y}`] || null;
  }

  /**
   * Finds the nearest tree within a specified range of given coordinates.
   *
   * @description This method searches for the closest tree to a given `(x, y)` position, within an optional maximum `range`. It iterates through all trees in `this.treeMap`, calculates the Manhattan distance to each, and keeps track of the nearest tree found within the `range`.
   *
   * @workflow
   * 1. Initialize `nearest` to `null` and `nearestDist` to `Infinity`.
   * 2. Iterate over the keys of `this.treeMap`.
   * 3. For each `key`, retrieve the `tree` object.
   * 4. Calculate the Manhattan distance `d` between the input `(x, y)` and `tree.x`, `tree.y`.
   * 5. If `d` is less than or equal to `range` AND `d` is less than `nearestDist`:
   *    - Update `nearestDist` to `d`.
   *    - Set `nearest` to the current `tree`.
   * 6. After checking all trees, return the `nearest` tree found.
   *
   * @param {number} x - The X-coordinate to search from.
   * @param {number} y - The Y-coordinate to search from.
   * @param {number} [range=8] - The maximum Manhattan distance to consider a tree as "nearby". Defaults to 8.
   * @returns {object|null} The nearest tree object found within range, or `null` if no tree is within range.
   *
   * @dependencies this.treeMap.
   * @modifies None.
   * @triggers Called when an entity needs to locate a tree resource within its operational range.
   * @performance O(T) where T is the total number of trees in `this.treeMap`, as it iterates through all trees.
   */
  getNearbyTree(x, y, range = 8) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const key of Object.keys(this.treeMap)) {
      const tree = this.treeMap[key];
      const d = Math.abs(tree.x - x) + Math.abs(tree.y - y);
      if (d <= range && d < nearestDist) { nearestDist = d; nearest = tree; }
    }
    return nearest;
  }

  /**
   * Harvests resources from a tile, reducing its resource amount and returning the yield.
   *
   * @description This method extracts resources from a `resourceNode` on a specific tile at `(tx, ty)`. It first validates if the tile exists and has a harvestable `resourceNode`. If so, it calculates the amount of each resource to take based on the `TILE_YIELD` configuration and an optional `multiplier`, then reduces the tile's `resourceNode.amount`. If the node is not fully depleted, the tile is marked for future regeneration.
   *
   * @workflow
   * 1. Retrieve the `tile` object at `(tx, ty)` using `this.getTile()`.
   * 2. If `tile` is null or `tile.resourceNode` is null, return `null`.
   * 3. Get the `node` (resourceNode) from the tile.
   * 4. If `node.amount` is less than 1 (no resources left), return `null`.
   * 5. Retrieve the `yieldTable` from `CONFIG.TILE_YIELD` based on `tile.type`.
   * 6. If `yieldTable` is null, return `null`.
   * 7. Initialize an empty object `gained` to store harvested resources.
   * 8. Iterate through each resource `res` and its `base` yield in `yieldTable`:
   *    - Calculate `take` as the minimum of `node.amount` and `base * multiplier`.
   *    - Add `take` to `gained[res]`.
   *    - Subtract `take` from `node.amount`.
   * 9. If `node.amount` is still less than `node.max` after harvesting, call `this._markTileNeedsRegen(tx, ty)`.
   * 10. Return the `gained` object containing harvested resources.
   *
   * @param {number} tx - The X-coordinate of the tile to harvest.
   * @param {number} ty - The Y-coordinate of the tile to harvest.
   * @param {number} [multiplier=1] - A multiplier to adjust the amount of resources harvested. Defaults to 1.
   * @returns {object|null} An object mapping resource names to harvested amounts, or `null` if the tile cannot be harvested.
   *
   * @dependencies this.getTile(), CONFIG.TILE_YIELD, this._markTileNeedsRegen().
   * @modifies tile.resourceNode.amount` for the harvested tile, `this._regenTiles` indirectly via `_markTileNeedsRegen`.
   * @triggers Called when an entity (e.g., a worker) harvests resources from a tile.
   * @performance O(1) constant time, as `getTile` is O(1) and the loop iterates over a small, fixed number of resource types.
   */
  harvestTile(tx, ty, multiplier = 1) {
    const tile = this.getTile(tx, ty);
    if (!tile || !tile.resourceNode) return null;

    const node = tile.resourceNode;
    if (node.amount < 1) return null;

    const yieldTable = CONFIG.TILE_YIELD[tile.type];
    if (!yieldTable) return null;

    const gained = {};
    for (const [res, base] of Object.entries(yieldTable)) {
      const take = Math.min(node.amount, base * multiplier);
      gained[res] = take;
      node.amount -= take;
    }
    // Track this tile for regen
    if (node.amount < node.max) this._markTileNeedsRegen(tx, ty);
    return gained;
  }

  /**
   * Checks if a tile at specified coordinates is traversable by entities.
   *
   * @description This method determines whether an entity can walk on the tile located at `(x, y)`. It retrieves the tile using `getTile()` and returns `false` if the tile is out of bounds or if its type is `WATER` or `MOUNTAIN`, as defined in `CONFIG.TILE`. Otherwise, it returns `true`.
   *
   * @workflow
   * 1. Retrieve the `t` (tile) object at `(x, y)` using `this.getTile()`.
   * 2. If `t` is null (out of bounds), return `false`.
   * 3. Check if `t.type` is equal to `CONFIG.TILE.WATER` or `CONFIG.TILE.MOUNTAIN`.
   * 4. If it is either of these types, return `false`.
   * 5. Otherwise, return `true`.
   *
   * @param {number} x - The X-coordinate of the tile to check.
   * @param {number} y - The Y-coordinate of the tile to check.
   * @returns {boolean} `true` if the tile is walkable, `false` otherwise.
   *
   * @dependencies this.getTile(), CONFIG.TILE.WATER, CONFIG.TILE.MOUNTAIN.
   * @modifies None.
   * @triggers Called by pathfinding algorithms or unit movement logic to validate movement targets.
   * @performance O(1) constant time, dependent on `getTile` which is O(1).
   */
  isWalkable(x, y) {
    const t = this.getTile(x, y);
    if (!t) return false;
    return t.type !== CONFIG.TILE.WATER && t.type !== CONFIG.TILE.MOUNTAIN;
  }

  // Flat-top odd-q offset neighbors.
  /**
   * Returns a list of valid neighboring tile coordinates for a given hexagonal tile.
   *
   * @description This method calculates the coordinates of all six direct neighbors for a hexagonal tile at `(tx, ty)`. It accounts for the "odd-q" offset coordinate system, where the offsets for neighbors differ based on whether the `tx` (column) coordinate is even or odd. It then filters out any neighbor coordinates that fall outside the world's boundaries.
   *
   * @workflow
   * 1. Define `dirs`, an array of `[dx, dy]` offset pairs. The specific offsets depend on whether `tx` is even or odd (flat-top odd-q offset system).
   * 2. Map `dirs` to create a new array of objects `{ x: tx + dx, y: ty + dy }` for each potential neighbor.
   * 3. Filter this new array, keeping only those neighbor coordinates `n` where `n.x` is within `[0, W-1]` and `n.y` is within `[0, H-1]`.
   * 4. Return the filtered array of valid neighbor coordinates.
   *
   * @param {number} tx - The X-coordinate of the central tile.
   * @param {number} ty - The Y-coordinate of the central tile.
   * @returns {Array<object>} An array of objects, each with `x` and `y` properties, representing valid neighboring tile coordinates.
   *
   * @dependencies this.W, this.H.
   * @modifies None.
   * @triggers Called by pathfinding, area-of-effect calculations, or logic requiring adjacency information for hexagonal tiles.
   * @performance O(1) constant time, as it calculates for a fixed number of neighbors (6) and performs simple filtering.
   */
  getNeighbors(tx, ty) {
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
    const dirs = (tx % 2 === 0)
      ? [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [0, 1]]
      : [[1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1], [0, 1]];

    return dirs
      .map(([dx, dy]) => ({ x: tx + dx, y: ty + dy }))
      .filter(n => n.x >= 0 && n.x < this.W && n.y >= 0 && n.y < this.H);
  }

  /**
   * Marks a tile as having a road, if it's not a water tile.
   *
   * @description This method sets the `road` property of a tile at `(tx, ty)` to `true`. It first retrieves the tile using `getTile()` and checks if it exists and is not a water tile. Roads cannot be built on water tiles.
   *
   * @workflow
   * 1. Retrieve the `t` (tile) object at `(tx, ty)` using `this.getTile()`.
   * 2. If `t` exists AND `t.type` is not equal to `CONFIG.TILE.WATER`:
   *    - Set `t.road` to `true`.
   *
   * @param {number} tx - The X-coordinate of the tile to modify.
   * @param {number} ty - The Y-coordinate of the tile to modify.
   * @returns {void}
   *
   * @dependencies this.getTile(), CONFIG.TILE.WATER.
   * @modifies this.tiles[ty][tx].road.
   * @triggers Called when a road-building action is performed by an entity.
   * @performance O(1) constant time due to direct tile lookup and property modification.
   */
  setRoad(tx, ty) {
    const t = this.getTile(tx, ty);
    if (t && t.type !== CONFIG.TILE.WATER) t.road = true;
  }

  /**
   * Adds a new entity to the world, assigns it an ID, and inserts it into the spatial hash.
   *
   * @description This method registers a new entity within the game world. It assigns a unique ID to the entity from `_nextEntityId`, adds it to the main `entities` list, and crucially, inserts it into the spatial hash grid for efficient proximity lookups.
   *
   * @workflow
   * 1. Assign `this._nextEntityId` to `entity.id`, then increment `this._nextEntityId`.
   * 2. Push the `entity` onto the `this.entities` array.
   * 3. Call `this._spatialInsert(entity)` to add the entity to the spatial hash grid.
   * 4. Return the added `entity` (now with its ID).
   *
   * @param {object} entity - The entity object to add.
   * @returns {object} The entity object after it has been assigned an ID and registered.
   *
   * @dependencies this._nextEntityId, this.entities, this._spatialInsert().
   * @modifies entity.id, this._nextEntityId, this.entities, this._spatialGrid, this._entityById, entity._spatialKey` (via `_spatialInsert`).
   * @triggers Called when new units, buildings, or other interactable objects are created and need to be part of the world.
   * @performance O(1) constant time on average, as array push and spatial insert are typically O(1).
   */
  addEntity(entity) {
    entity.id = this._nextEntityId++;
    this.entities.push(entity);
    this._spatialInsert(entity);
    return entity;
  }

  /**
   * Removes an entity from the world by its ID.
   *
   * @description This method de-registers an entity from the game world using its unique `id`. It first attempts to remove the entity from the spatial hash grid using `_spatialRemove()` for cleanup. Then, it filters the entity out of the main `this.entities` array, effectively removing it from the world.
   *
   * @workflow
   * 1. Retrieve the `entity` object from `this._entityById` using the provided `id`.
   * 2. If `entity` is found, call `this._spatialRemove(entity)` to remove it from the spatial hash and ID lookup.
   * 3. Filter `this.entities` to create a new array containing all entities except the one with the given `id`.
   * 4. Assign the new filtered array back to `this.entities`.
   *
   * @param {number} id - The unique ID of the entity to remove.
   * @returns {void}
   *
   * @dependencies this._entityById, this._spatialRemove(), this.entities.
   * @modifies this._entityById` and `this._spatialGrid` (via `_spatialRemove`), `this.entities`.
   * @triggers Called when an entity is destroyed, despawns, or otherwise needs to be removed from the game world.
   * @performance O(N) where N is the total number of entities, due to `this.entities.filter()`. Spatial removal is O(1) on average. This can be optimized if `this.entities` was also a map or a different data structure.
   */
  removeEntity(id) {
    const entity = this._entityById[id];
    if (entity) this._spatialRemove(entity);
    this.entities = this.entities.filter(e => e.id !== id);
  }

  // ── O(1) spatial lookup instead of O(N) linear scan ────────────────────
  /**
   * Retrieves all entities located at a specific world coordinate `(x, y)`.
   *
   * @description This method efficiently finds all entities present at a precise `(x, y)` location using the spatial hash grid. It calculates the spatial key for the coordinates, retrieves potential entities from that grid cell, and then filters them to ensure only entities exactly at `(x, y)` are returned (since a cell can contain entities from nearby coordinates).
   *
   * @workflow
   * 1. Calculate the `key` for `(x, y)` using `this._spatialKey()`.
   * 2. Retrieve the `ids` (a Set of entity IDs) from `this._spatialGrid[key]`.
   * 3. If `ids` is null or empty, return an empty array.
   * 4. Initialize an empty array `result`.
   * 5. Iterate through each `id` in the `ids` Set:
   *    - Retrieve the actual `e` (entity) object from `this._entityById[id]`.
   *    - If `e` exists AND its `x` and `y` coordinates exactly match the input `x` and `y`:
   *        - Add `e` to the `result` array.
   * 6. Return the `result` array.
   *
   * @param {number} x - The X-coordinate to check.
   * @param {number} y - The Y-coordinate to check.
   * @returns {Array<object>} An array of entity objects found at `(x, y)`. Returns an empty array if no entities are found.
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById.
   * @modifies None.
   * @triggers Called when interactions need to target entities at a specific tile, such as combat, resource gathering, or construction.
   * @performance O(C) where C is the number of entities within the relevant spatial grid cell. This is typically much faster than O(N) (total entities) for sparse entity distributions.
   */
  getEntitiesAt(x, y) {
    const key = this._spatialKey(x, y);
    const ids = this._spatialGrid[key];
    if (!ids || ids.size === 0) return [];
    const result = [];
    for (const id of ids) {
      const e = this._entityById[id];
      if (e && e.x === x && e.y === y) result.push(e);
    }
    return result;
  }

  // Check if a wall belonging to a specific tribe blocks a tile
  /**
   * Checks if an enemy wall belonging to a different tribe blocks a specific tile.
   *
   * @description This method determines if a particular `(x, y)` tile is occupied by a wall entity that belongs to an opposing tribe. It uses the spatial hash grid to efficiently find entities at the given coordinates. If any entity at `(x, y)` is a `CONFIG.ENTITY.WALL` and its `tribe` ID does not match `myTribeId`, the method returns `true`.
   *
   * @workflow
   * 1. Calculate the `key` for `(x, y)` using `this._spatialKey()`.
   * 2. Retrieve the `ids` (a Set of entity IDs) from `this._spatialGrid[key]`.
   * 3. If `ids` is null, return `false`.
   * 4. Iterate through each `id` in the `ids` Set:
   *    - Retrieve the actual `e` (entity) object from `this._entityById[id]`.
   *    - If `e` exists AND its `type` is `CONFIG.ENTITY.WALL` AND its `tribe` is not `myTribeId` AND its `x` and `y` coordinates exactly match the input `x` and `y`:
   *        - Return `true` immediately.
   * 5. If the loop completes without finding an enemy wall, return `false`.
   *
   * @param {number} x - The X-coordinate to check for an enemy wall.
   * @param {number} y - The Y-coordinate to check for an enemy wall.
   * @param {string} myTribeId - The ID of the current tribe to differentiate friendly from enemy walls.
   * @returns {boolean} `true` if an enemy wall is found at `(x, y)`, `false` otherwise.
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById, CONFIG.ENTITY.WALL.
   * @modifies None.
   * @triggers Called by unit movement, pathfinding, or attack logic to determine if a tile is blocked by an enemy structure.
   * @performance O(C) where C is the number of entities within the relevant spatial grid cell. Faster than O(N) by leveraging the spatial hash.
   */
  hasEnemyWall(x, y, myTribeId) {
    const key = this._spatialKey(x, y);
    const ids = this._spatialGrid[key];
    if (!ids) return false;
    for (const id of ids) {
      const e = this._entityById[id];
      if (e && e.type === CONFIG.ENTITY.WALL && e.tribe !== myTribeId && e.x === x && e.y === y) return true;
    }
    return false;
  }

  /**
   * Filters and returns all entities belonging to a specific tribe.
   *
   * @description This method provides a way to retrieve a collection of all entities in the world that are associated with a given `tribeId`. It iterates through the main `this.entities` array and creates a new array containing only those entities whose `tribe` property matches the input `tribeId`.
   *
   * @workflow
   * 1. Use the `filter` method on `this.entities`.
   * 2. For each `e` (entity) in `this.entities`, include `e` in the new array if `e.tribe` is equal to `tribeId`.
   * 3. Return the resulting filtered array.
   *
   * @param {string} tribeId - The ID of the tribe whose entities are to be retrieved.
   * @returns {Array<object>} An array of entity objects belonging to the specified tribe.
   *
   * @dependencies this.entities.
   * @modifies None.
   * @triggers Called by tribe AI or management logic to get an overview of its units or buildings.
   * @performance O(N) where N is the total number of entities in the world, as it iterates through the entire `this.entities` array.
   */
  getEntitiesByTribe(tribeId) {
    return this.entities.filter(e => e.tribe === tribeId);
  }

  // ── Cached territory count ─────────────────────────────────────────────
  /**
   * Returns the cached territory count for a specified tribe, recomputing if necessary.
   *
   * @description This method provides the number of tiles owned by a `tribeId`. It leverages a cached `_territoryCount` to return the value quickly. If the `_territoryDirty` flag is set (indicating a change in territory ownership), it first triggers a full recomputation of territory counts across the entire map before returning the result.
   *
   * @workflow
   * 1. Check if `this._territoryDirty` is `true`.
   * 2. If `true`:
   *    - Call `this._recomputeTerritoryCount()` to update the cache.
   *    - Set `this._territoryDirty` to `false`.
   * 3. Return the count for `tribeId` from `this._territoryCount`, defaulting to 0 if not found.
   *
   * @param {string} tribeId - The ID of the tribe (e.g., 'a' or 'b') for which to count territory.
   * @returns {number} The number of tiles owned by the specified tribe.
   *
   * @dependencies this._territoryDirty, this._recomputeTerritoryCount(), this._territoryCount.
   * @modifies this._territoryDirty, this._territoryCount` (indirectly via `_recomputeTerritoryCount`).
   * @triggers Called by game logic, UI, or AI that needs to know a tribe's territory size.
   * @performance O(1) if cache is clean. O(W * H) if `_recomputeTerritoryCount` is triggered, which happens only when territory changes.
   */
  countTerritory(tribeId) {
    if (this._territoryDirty) {
      this._recomputeTerritoryCount();
      this._territoryDirty = false;
    }
    return this._territoryCount[tribeId] || 0;
  }

  /**
   * Fully recomputes the territory count for all tribes by scanning the entire map.
   *
   * @description This private method performs a comprehensive scan of every tile in the game world to determine ownership. It resets the `_territoryCount` cache and then iterates through all `(x, y)` coordinates, incrementing the count for the respective `owner` of each tile. This ensures the `_territoryCount` cache is accurate after any changes to tile ownership.
   *
   * @workflow
   * 1. Reset `this._territoryCount` to `{ a: 0, b: 0 }`.
   * 2. Iterate through each `y` coordinate from `0` to `this.H - 1`.
   * 3. For each `y`, iterate through each `x` coordinate from `0` to `this.W - 1`.
   * 4. Retrieve the `owner` property of the current tile `this.tiles[y][x]`.
   * 5. If an `owner` is present (not null), increment the corresponding count in `this._territoryCount[owner]`.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies this._territoryCount.
   * @triggers Called by `countTerritory()` only when the `_territoryDirty` flag is set.
   * @performance O(W * H) as it iterates through every tile on the map. This is an expensive operation but is optimized to run only when needed.
   */
  _recomputeTerritoryCount() {
    this._territoryCount = { a: 0, b: 0 };
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const owner = this.tiles[y][x].owner;
        if (owner) this._territoryCount[owner]++;
      }
    }
  }

  /**
   * Recalculates and updates tile ownership based on building influence of two tribes.
   *
   * @description This method reassigns tile ownership across the map for two specified tribes (`tribeA` and `tribeB`). It first clears all existing non-water tile ownership. Then, for each building of both tribes, it marks tiles within a specific radius (determined by building type) as owned by that tribe. This simulation reflects how buildings expand territorial control. After updating, it flags the territory count as dirty for recomputation.
   *
   * @workflow
   * 1. Clear `owner` property for all non-water tiles in `this.tiles` to `null`.
   * 2. Define a local helper function `mark(tx, ty, tribe, radius)`:
   *    - Calculates a square bounding box around `(tx, ty)` with `radius`.
   *    - Iterates through tiles `(nx, ny)` within this box.
   *    - If `(nx, ny)` is within the circular `radius` of `(tx, ty)` (using `dx*dx + dy*dy > r2`) AND the tile is not `CONFIG.TILE.WATER`:
   *        - If the tile has no `owner`, assign `tribe` as its `owner`.
   * 3. Define a local helper function `getRadius(btype)`:
   *    - Returns 7 for `CONFIG.ENTITY.CAPITOL`.
   *    - Returns 5 for `CONFIG.ENTITY.FORT`.
   *    - Returns 2 for other building types.
   * 4. For each building in `tribeA.buildings`:
   *    - Call `mark()` with building's `x`, `y`, tribe 'a', and `getRadius(b.type)`.
   * 5. For each building in `tribeB.buildings`:
   *    - Call `mark()` with building's `x`, `y`, tribe 'b', and `getRadius(b.type)`.
   * 6. Set `this._territoryDirty` to `true` to signal that territory counts need recomputation.
   * 7. Increment `this._territoryGen` for internal tracking.
   *
   * @param {object} tribeA - The first tribe object, containing a `buildings` array.
   * @param {object} tribeB - The second tribe object, containing a `buildings` array.
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles, CONFIG.TILE.WATER, CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.FORT.
   * @modifies this.tiles[y][x].owner` for many tiles, `this._territoryDirty`, `this._territoryGen`.
   * @triggers Called whenever tribe buildings are added, removed, or the game state requires a territory re-evaluation.
   * @performance O(W * H + (B_A + B_B) * R^2) where W*H is for clearing owners, B_A and B_B are number of buildings for tribe A and B, and R is the maximum radius of influence (7). Can be significant, so only run when territory changes.
   */
  updateTerritory(tribeA, tribeB) {
    const W = this.W;
    const H = this.H;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.tiles[y][x].type !== CONFIG.TILE.WATER) this.tiles[y][x].owner = null;
      }
    }

    /**
     * Marks tiles within a specified radius around a point as owned by a tribe.
     *
     * @description This local helper function, used within `updateTerritory`, iterates through a square bounding box around a central point `(tx, ty)` with a given `radius`. For each tile within this square that also falls within the circular `radius` and is not a water tile, it attempts to assign `tribe` as its `owner` if the tile is currently unowned.
     *
     * @workflow
     * 1. Calculate `r2` (radius squared) for circular distance check.
     * 2. Determine `yMin`, `yMax`, `xMin`, `xMax` for a square bounding box, clamped to world boundaries.
     * 3. Iterate `ny` from `yMin` to `yMax`.
     * 4. For each `ny`, iterate `nx` from `xMin` to `xMax`.
     * 5. Calculate `dx` and `dy` from `nx, ny` to `tx, ty`.
     * 6. If `dx*dx + dy*dy` is greater than `r2`, skip (outside circular radius).
     * 7. Retrieve tile `t` at `(ny, nx)`.
     * 8. If `t.type` is `CONFIG.TILE.WATER`, skip.
     * 9. If `t.owner` is currently null, set `t.owner` to `tribe`.
     *
     * @param {number} tx - The X-coordinate of the center of influence.
     * @param {number} ty - The Y-coordinate of the center of influence.
     * @param {string} tribe - The ID of the tribe ('a' or 'b') that will own the tiles.
     * @param {number} radius - The radius of influence around the center point.
     * @returns {void}
     *
     * @dependencies this.W, this.H, this.tiles, CONFIG.TILE.WATER.
     * @modifies this.tiles[ny][nx].owner` for affected tiles.
     * @triggers Called by `updateTerritory` for each building of a tribe.
     * @performance O(radius^2) due to nested loops iterating within the square bounding box.
     */
    const mark = (tx, ty, tribe, radius) => {
      const r2 = radius * radius;
      const yMin = Math.max(0, ty - radius);
      const yMax = Math.min(H - 1, ty + radius);
      const xMin = Math.max(0, tx - radius);
      const xMax = Math.min(W - 1, tx + radius);
      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const dx = nx - tx;
          const dy = ny - ty;
          if (dx * dx + dy * dy > r2) continue;
          const t = this.tiles[ny][nx];
          if (t.type === CONFIG.TILE.WATER) continue;
          if (!t.owner) t.owner = tribe;
        }
      }
    };

    /**
     * Determines the territory influence radius for a given building type.
     *
     * @description This local helper function, used within `updateTerritory`, takes a `btype` (building type) and returns an integer representing the radius of territory influence that building exerts. Capitols have the largest influence, followed by forts, and then other buildings have a smaller, default radius.
     *
     * @workflow
     * 1. If `btype` is `CONFIG.ENTITY.CAPITOL`, return 7.
     * 2. Else if `btype` is `CONFIG.ENTITY.FORT`, return 5.
     * 3. Otherwise (default case), return 2.
     *
     * @param {string} btype - The type of the building (e.g., `CONFIG.ENTITY.CAPITOL`).
     * @returns {number} The radius of influence for the specified building type.
     *
     * @dependencies CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.FORT.
     * @modifies None.
     * @triggers Called by `updateTerritory` for each building to determine its influence range for the `mark` function.
     * @performance O(1) constant time due to simple conditional checks.
     */
    const getRadius = (btype) => {
      if (btype === CONFIG.ENTITY.CAPITOL) return 7;
      if (btype === CONFIG.ENTITY.FORT) return 5;
      return 2;
    };

    tribeA.buildings.forEach(b => mark(b.x, b.y, 'a', getRadius(b.type)));
    tribeB.buildings.forEach(b => mark(b.x, b.y, 'b', getRadius(b.type)));

    this._territoryDirty = true;
    this._territoryGen = (this._territoryGen || 0) + 1;
  }

  /**
   * Finds the nearest walkable tile to a given coordinate within a limited search radius.
   *
   * @description This method searches for the closest walkable tile to a starting point `(x, y)`. It uses an expanding spiral search pattern, checking tiles in concentric squares around the starting point up to a radius of 10. The first walkable tile encountered is returned. If no walkable tile is found within this radius, it defaults to returning the original `(x, y)` coordinates.
   *
   * @workflow
   * 1. Iterate `r` (radius) from `0` to `9`.
   * 2. For each `r`, iterate `dy` from `-r` to `r`.
   * 3. For each `dy`, iterate `dx` from `-r` to `r`.
   * 4. Calculate candidate coordinates `nx = x + dx` and `ny = y + dy`.
   * 5. Call `this.isWalkable(nx, ny)`.
   * 6. If `isWalkable` returns `true`, immediately return `{ x: nx, y: ny }`.
   * 7. If the loops complete without finding a walkable tile, return the original `{ x, y }`.
   *
   * @param {number} x - The starting X-coordinate for the search.
   * @param {number} y - The starting Y-coordinate for the search.
   * @returns {object} An object `{ x, y }` representing the coordinates of the nearest walkable tile, or the original coordinates if none found within radius 10.
   *
   * @dependencies this.isWalkable().
   * @modifies None.
   * @triggers Called when an entity needs to be placed or moved to a valid, walkable tile near a specific point.
   * @performance O(R^2) where R is the search radius (max 10). In the worst case, it checks `(2R+1)^2` tiles. Given R=10, this is `21*21 = 441` calls to `isWalkable`, which is O(1). So overall, it's a fixed small number of operations.
   */
  findNearestWalkable(x, y) {
    for (let r = 0; r < 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return { x, y };
  }

  // Notify spatial grid that an entity moved (called by Tribe after unit steps)
  /**
   * Informs the spatial hash grid that an entity has changed its position.
   *
   * @description This method acts as a public interface for the internal spatial hash system. It receives an entity object and delegates to the private `_spatialMove` method, ensuring that the entity's position is correctly updated within the spatial grid. This is crucial for maintaining the efficiency of spatial queries after an entity (like a unit) moves.
   *
   * @workflow
   * 1. Call `this._spatialMove(entity)`.
   *
   * @param {object} entity - The entity object that has moved.
   * @returns {void}
   *
   * @dependencies this._spatialMove().
   * @modifies this._spatialGrid`, `this._entityById`, `entity._spatialKey` (indirectly via `_spatialMove`).
   * @triggers Called by the `Tribe` or unit logic whenever an entity's `x` or `y` coordinates are updated.
   * @performance O(1) on average, delegated to `_spatialMove`.
   */
  notifyEntityMoved(entity) {
    this._spatialMove(entity);
  }
}

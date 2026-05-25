// Territory ownership calculation, counting, and cache.
class Territory {
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
  constructor(world) {
    this.world = world;
  }

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
    if (this.world._territoryDirty) {
      this._recomputeTerritoryCount();
      this.world._territoryDirty = false;
    }
    return this.world._territoryCount[tribeId] || 0;
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
    this.world._territoryCount = { a: 0, b: 0 };
    for (let y = 0; y < this.world.H; y++) {
      for (let x = 0; x < this.world.W; x++) {
        const owner = this.world.tiles[y][x].owner;
        if (owner) this.world._territoryCount[owner]++;
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
    const W = this.world.W;
    const H = this.world.H;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.world.tiles[y][x].type !== CONFIG.TILE.WATER) this.world.tiles[y][x].owner = null;
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
          const t = this.world.tiles[ny][nx];
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

    this.world._territoryDirty = true;
    this.world._territoryGen = (this.world._territoryGen || 0) + 1;
  }

}

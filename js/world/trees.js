// Tree spawn/growth, harvest, planting, nearby search.
class TreeManager {
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
    for (const key of Object.keys(this.world.treeMap)) {
      const tree = this.world.treeMap[key];
      const cap = tree.maxGrowth || 5;
      if (tree.growth >= cap) continue;
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
    const tree = this.world.treeMap[key];
    if (!tree) return 0;
    const wood = tree.growth;
    delete this.world.treeMap[key];
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
    if (this.world.treeMap[key]) return false;
    const tile = this.world.getTile(x, y);
    if (!tile || tile.type === CONFIG.TILE.WATER || tile.type === CONFIG.TILE.MOUNTAIN) return false;
    this.world.treeMap[key] = { x, y, biome: tile.type, maxGrowth: 5, growth: 1, growthTicks: 0 };
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
    return this.world.treeMap[`${x},${y}`] || null;
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
    for (const key of Object.keys(this.world.treeMap)) {
      const tree = this.world.treeMap[key];
      const d = Math.abs(tree.x - x) + Math.abs(tree.y - y);
      if (d <= range && d < nearestDist) { nearestDist = d; nearest = tree; }
    }
    return nearest;
  }

}

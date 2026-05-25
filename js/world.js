class World {
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

  generate() {
    this.tiles = [];
    const W = this.W;
    const H = this.H;
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
  _spatialKey(x, y) {
    const cs = this._spatialCellSize;
    return ((x / cs) | 0) + ',' + ((y / cs) | 0);
  }

  _spatialInsert(entity) {
    const key = this._spatialKey(entity.x, entity.y);
    if (!this._spatialGrid[key]) this._spatialGrid[key] = new Set();
    this._spatialGrid[key].add(entity.id);
    this._entityById[entity.id] = entity;
    entity._spatialKey = key;
  }

  _spatialRemove(entity) {
    const key = entity._spatialKey;
    if (key && this._spatialGrid[key]) {
      this._spatialGrid[key].delete(entity.id);
      if (this._spatialGrid[key].size === 0) delete this._spatialGrid[key];
    }
    delete this._entityById[entity.id];
    entity._spatialKey = undefined;
  }

  _spatialMove(entity) {
    const newKey = this._spatialKey(entity.x, entity.y);
    if (newKey === entity._spatialKey) return;
    this._spatialRemove(entity);
    this._spatialInsert(entity);
  }

  // ── Resource regen optimization ─────────────────────────────────────────
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

  _markTileNeedsRegen(x, y) {
    // Only add if not already tracked (simple — we accept minor dupes, cleaned on tick)
    this._regenTiles.push({ x, y });
  }

  // ── Noise generation (unchanged) ───────────────────────────────────────
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

  _smoothNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const r = (nx, ny) => {
      const n = Math.sin(nx * 127.1 + ny * 311.7 + 43758.5453) * 43758.5453;
      return n - Math.floor(n);
    };

    return r(ix, iy) * (1 - ux) * (1 - uy)
      + r(ix + 1, iy) * ux * (1 - uy)
      + r(ix, iy + 1) * (1 - ux) * uy
      + r(ix + 1, iy + 1) * ux * uy;
  }

  getTile(x, y) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return null;
    return this.tiles[y][x];
  }

  // ── Optimized: only iterate tiles that actually need regen ─────────────
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

  harvestTree(x, y) {
    const key = `${x},${y}`;
    const tree = this.treeMap[key];
    if (!tree) return 0;
    const wood = tree.growth;
    delete this.treeMap[key];
    return wood;
  }

  plantTree(x, y) {
    const key = `${x},${y}`;
    if (this.treeMap[key]) return false;
    const tile = this.getTile(x, y);
    if (!tile || tile.type === CONFIG.TILE.WATER || tile.type === CONFIG.TILE.MOUNTAIN) return false;
    this.treeMap[key] = { x, y, growth: 1, growthTicks: 0 };
    return true;
  }

  getTreeAt(x, y) {
    return this.treeMap[`${x},${y}`] || null;
  }

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

  isWalkable(x, y) {
    const t = this.getTile(x, y);
    if (!t) return false;
    return t.type !== CONFIG.TILE.WATER && t.type !== CONFIG.TILE.MOUNTAIN;
  }

  // Flat-top odd-q offset neighbors.
  getNeighbors(tx, ty) {
    const dirs = (tx % 2 === 0)
      ? [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [0, 1]]
      : [[1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1], [0, 1]];

    return dirs
      .map(([dx, dy]) => ({ x: tx + dx, y: ty + dy }))
      .filter(n => n.x >= 0 && n.x < this.W && n.y >= 0 && n.y < this.H);
  }

  setRoad(tx, ty) {
    const t = this.getTile(tx, ty);
    if (t && t.type !== CONFIG.TILE.WATER) t.road = true;
  }

  addEntity(entity) {
    entity.id = this._nextEntityId++;
    this.entities.push(entity);
    this._spatialInsert(entity);
    return entity;
  }

  removeEntity(id) {
    const entity = this._entityById[id];
    if (entity) this._spatialRemove(entity);
    this.entities = this.entities.filter(e => e.id !== id);
  }

  // ── O(1) spatial lookup instead of O(N) linear scan ────────────────────
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

  getEntitiesByTribe(tribeId) {
    return this.entities.filter(e => e.tribe === tribeId);
  }

  // ── Cached territory count ─────────────────────────────────────────────
  countTerritory(tribeId) {
    if (this._territoryDirty) {
      this._recomputeTerritoryCount();
      this._territoryDirty = false;
    }
    return this._territoryCount[tribeId] || 0;
  }

  _recomputeTerritoryCount() {
    this._territoryCount = { a: 0, b: 0 };
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const owner = this.tiles[y][x].owner;
        if (owner) this._territoryCount[owner]++;
      }
    }
  }

  updateTerritory(tribeA, tribeB) {
    const W = this.W;
    const H = this.H;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.tiles[y][x].type !== CONFIG.TILE.WATER) this.tiles[y][x].owner = null;
      }
    }

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
  notifyEntityMoved(entity) {
    this._spatialMove(entity);
  }
}

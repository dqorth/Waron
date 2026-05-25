// ══════════════════════════════════════════════════════════════════════════════
// Wildlife System — Huntable Animals
// ══════════════════════════════════════════════════════════════════════════════
// Animals spawn on eligible biome tiles. Units can hunt them for carried food.
// Animals wander, flee from nearby units, and respawn over time.
// Loaded after world.js, before tribe.js.
// ══════════════════════════════════════════════════════════════════════════════

class Wildlife {
  constructor(world) {
    this._world = world;
    this.animals = [];       // [{x, y, type, hp, maxHp, _wanderTimer, _dead, _respawnTimer, _homeX, _homeY}]
    this._nextId = 1;
    this._spawnMap = {};     // "x,y" → animal ref (for quick lookup)
  }

  // Populate the map with initial wildlife
  populate() {
    const W = this._world.W;
    const H = this._world.H;
    const cfg = CONFIG.ANIMAL;
    const biomeMap = cfg.BIOME_ANIMALS || {};
    const chance = (cfg.SPAWN_CHANCE || 0.08) * ((typeof DEV !== 'undefined') ? (DEV.ANIMAL_SPAWN_MULT || 1) : 1);
    const maxPop = cfg.MAX_POPULATION || 200;

    for (let y = 0; y < H && this.animals.length < maxPop; y++) {
      for (let x = 0; x < W && this.animals.length < maxPop; x++) {
        const tile = this._world.tiles[y][x];
        const animalType = biomeMap[tile.type];
        if (!animalType) continue;
        if (Math.random() > chance) continue;

        const hp = (cfg.HP && cfg.HP[animalType]) || 3;
        this.animals.push({
          id: this._nextId++,
          x, y, type: animalType,
          hp, maxHp: hp,
          _wanderTimer: Math.floor(Math.random() * (cfg.WANDER_INTERVAL || 8)),
          _dead: false,
          _respawnTimer: 0,
          _homeX: x, _homeY: y,
        });
        this._spawnMap[`${x},${y}`] = this.animals[this.animals.length - 1];
      }
    }
  }

  // Called each tick
  tick(tribeA, tribeB) {
    const cfg = CONFIG.ANIMAL;
    const wanderInterval = cfg.WANDER_INTERVAL || 8;
    const wanderRange = cfg.WANDER_RANGE || 2;
    const fleeRange = cfg.FLEE_RANGE || 3;
    const respawnTicks = cfg.RESPAWN_TICKS || 150;

    // Collect all unit positions for flee checks (sparse — only check nearby)
    const allUnits = [];
    if (tribeA) allUnits.push(...tribeA.units);
    if (tribeB && tribeB.units.length) allUnits.push(...tribeB.units);

    for (const a of this.animals) {
      // Handle dead animals (respawn timer)
      if (a._dead) {
        a._respawnTimer--;
        if (a._respawnTimer <= 0) {
          a._dead = false;
          a.hp = a.maxHp;
          a.x = a._homeX;
          a.y = a._homeY;
          delete this._spawnMap[`${a.x},${a.y}`]; // clear old key
          this._spawnMap[`${a._homeX},${a._homeY}`] = a;
        }
        continue;
      }

      // Wander
      a._wanderTimer++;
      if (a._wanderTimer >= wanderInterval) {
        a._wanderTimer = 0;

        // Check for nearby units — flee if any within range
        let fleeX = 0, fleeY = 0, fleeing = false;
        for (const u of allUnits) {
          const d = Math.abs(u.x - a.x) + Math.abs(u.y - a.y);
          if (d <= fleeRange) {
            fleeX += Math.sign(a.x - u.x);
            fleeY += Math.sign(a.y - u.y);
            fleeing = true;
          }
        }

        let nx, ny;
        if (fleeing) {
          nx = a.x + Math.sign(fleeX);
          ny = a.y + Math.sign(fleeY);
        } else {
          nx = a.x + Math.floor(Math.random() * (wanderRange * 2 + 1)) - wanderRange;
          ny = a.y + Math.floor(Math.random() * (wanderRange * 2 + 1)) - wanderRange;
        }

        if (this._world.isWalkable(nx, ny)) {
          delete this._spawnMap[`${a.x},${a.y}`];
          a.x = nx;
          a.y = ny;
          this._spawnMap[`${nx},${ny}`] = a;
        }
      }
    }
  }

  // Get an animal at or adjacent to (x, y), or null
  getHuntable(x, y, range = 1) {
    for (const a of this.animals) {
      if (a._dead) continue;
      if (Math.abs(a.x - x) + Math.abs(a.y - y) <= range) return a;
    }
    return null;
  }

  // Hunt an animal — returns food gained, or 0
  hunt(animal, damage = 3) {
    if (!animal || animal._dead) return 0;
    const cfg = CONFIG.ANIMAL;
    const foodMult = (typeof DEV !== 'undefined') ? (DEV.ANIMAL_FOOD_MULT || 1) : 1;

    animal.hp -= damage;
    if (animal.hp <= 0) {
      animal._dead = true;
      animal._respawnTimer = cfg.RESPAWN_TICKS || 150;
      delete this._spawnMap[`${animal.x},${animal.y}`];
      const yield_ = ((cfg.FOOD_YIELD && cfg.FOOD_YIELD[animal.type]) || 3) * foodMult;
      return Math.ceil(yield_);
    }
    return 0; // still alive, keep attacking
  }

  // Get all living animals for rendering
  getLiving() {
    return this.animals.filter(a => !a._dead);
  }
}

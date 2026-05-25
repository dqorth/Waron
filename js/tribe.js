class Tribe {
  constructor(id, name, startX, startY, color) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.startX = startX;
    this.startY = startY;

    this.population = 20 + Math.floor(Math.random() * 10);
    this.military = 0;

    // ── Specific resource stockpiles ──────────────────────────────────────
    this.res = { wood: 80, food: 150, metal: 40, stone: 40 };

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

  _updateAge(year) { this.age = getAgeByYear(year); }

  _computePower() {
    this.power = (this.population * 0.5)
               + (this.military   * 3)
               + (this.techLevel  * 10)
               + (this.buildings.length * 6)
               + (this.morale     * 20);
  }

  // ── Population ──
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
  _gatherResources() {
    const farms   = this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    const homes   = this.buildings.filter(b => b.type === CONFIG.ENTITY.HOME).length;
    const capitol = this.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL) ? 1 : 0;

    this._assignFarmWorkers(farms);

    const farmStorageCap = farms.reduce((sum, f) => sum + CONFIG.FOOD_STORAGE_PER_FARM * (f.level || 1) * (f.size || 1), 0);
    const foodCap        = CONFIG.FOOD_STORAGE_BASE + farmStorageCap;
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

    // Passive trickle
    const passiveMult = 1 + this.techLevel * 0.04;
    this.res.metal = Math.min(storageCap, this.res.metal + Math.floor(this.population * 0.004 * passiveMult));
    this.res.stone = Math.min(storageCap, this.res.stone + Math.floor(this.population * 0.004 * passiveMult));
    this._techTimer++;
    const techRate = Math.max(4, 22 - this.techLevel);
    if (this._techTimer >= techRate) {
      this._techTimer = 0;
      const boost   = this.debuffs.research_boost || 0;
      const penalty = this.debuffs.research_slow  || 0;
      this.knowledge += Math.max(0, 1 + Math.round(boost * 3) - Math.round(penalty * 2));
    }
  }

  // ── Building Logic ──
  _doBuildLogic() {
    this._buildTimer++;
    if (this._buildTimer < 25) return;
    this._buildTimer = 0;

    if (this._expandFarmLand()) return;

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

  _canAfford(costObj) {
    for (const [res, amt] of Object.entries(costObj)) {
      if ((this.res[res] || 0) < amt) return false;
    }
    return true;
  }

  _payCost(costObj) {
    for (const [res, amt] of Object.entries(costObj)) {
      this.res[res] = Math.max(0, (this.res[res] || 0) - amt);
    }
  }

  _expandFarmLand() {
    const farms = this.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    if (!farms.length) return false;

    const candidates = farms
      .filter(f => (f.size || 1) < this._getFarmMaxTiles(f.level || 1))
      .sort((a, b) => (a.size || 1) - (b.size || 1));
    if (!candidates.length) return false;

    const f = candidates[0];
    this._ensureFarmFarmland(f);
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

  _assignFarmWorkers(farms) {
    if (!farms.length) return;

    for (const f of farms) f._workers = [];

    const workers = this.units.filter(u => u.type === CONFIG.ENTITY.WORKER);
    const available = workers.slice();

    for (const f of farms) {
      this._ensureFarmFarmland(f);
      const cap = Math.min(8, 2 + (f.size || 1) * 2 + (f.level || 1));
      available.sort((a, b) => {
        const da = (a.x - f.x) ** 2 + (a.y - f.y) ** 2;
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

  _upgradeCost(building) {
    const base = CONFIG.BUILDING_COST[building.type] || { wood: 20, metal: 10, stone: 10 };
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
          if (canAct && Math.random() < 0.15) {
            const cap = this.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL);
            if (cap) {
              u.targetX = cap.x + Math.floor(Math.random() * 5) - 2;
              u.targetY = cap.y + Math.floor(Math.random() * 5) - 2;
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
  _stepToward(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this._world.getNeighbors(u.x, u.y);
    let best = null, bestDist = Infinity;
    for (const n of neighbors) {
      if (!this._world.isWalkable(n.x, n.y)) continue;
      if (this._world.hasEnemyWall(n.x, n.y, this.id)) continue;
      const d = (tx - n.x) ** 2 + (ty - n.y) ** 2;
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (best) {
      u.x = best.x;
      u.y = best.y;
      this._world.notifyEntityMoved(u);
    }
  }

  _stepTowardVaried(u, tx, ty) {
    if (u.x === tx && u.y === ty) return;
    const neighbors = this._world.getNeighbors(u.x, u.y);
    const options = [];
    for (const n of neighbors) {
      if (!this._world.isWalkable(n.x, n.y)) continue;
      if (this._world.hasEnemyWall(n.x, n.y, this.id)) continue;
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

  _nearbyLeader(u) {
    return this.units.some(other =>
      other.type === CONFIG.ENTITY.LEADER &&
      Math.abs(other.x - u.x) <= 3 && Math.abs(other.y - u.y) <= 3
    );
  }

  _applyDebuffDecay() {
    for (const key of Object.keys(this.debuffs)) {
      this.debuffs[key] = Math.max(0, this.debuffs[key] - 0.008);
      if (this.debuffs[key] <= 0) delete this.debuffs[key];
    }
  }

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

  _spawnUnit(x, y, type) {
    const p = this._world.findNearestWalkable(x, y);
    const stats = this._rollUnitStats(type);
    const baseHp = CONFIG.UNIT_HP[type] || 10;
    const maxHp = this._getUnitMaxHp(baseHp, stats);
    const u = {
      x: p.x, y: p.y, type, hp: maxHp, maxHp,
      state: 'idle', targetX: p.x, targetY: p.y,
      tribe: this.id, _moveTimer: 0,
      stats,
      hunger: 0, _hungerFullTicks: 0, _hungerTarget: null,
    };
    this.units.push(u);
    this._world.addEntity(u);
  }

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

  _getWorkerBuildSpeed(unit) {
    const strength = unit.stats ? unit.stats.strength : (CONFIG.UNIT_STATS_BASE[CONFIG.ENTITY.WORKER]?.strength || 5);
    return 1.2 + strength * 0.32;
  }

  _getUnitMaxHp(baseHp, stats) {
    const enduranceMult = 0.6 + (stats.endurance / 10) * 0.8;
    return Math.max(2, Math.round(baseHp * enduranceMult));
  }

  _agilityFactor(stats) {
    const f = 1.0 - (stats.agility - 5) * 0.06;
    return Math.max(0.55, Math.min(1.45, f));
  }

  _applyDefenseReduction(unit, rawDamage) {
    const defense = unit.stats ? unit.stats.defense : (CONFIG.UNIT_STATS_BASE[unit.type]?.defense || 5);
    const reduction = Math.max(0, Math.min(0.60, defense * 0.04));
    return rawDamage * (1 - reduction);
  }

  _shouldRetreat(unit) {
    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    if (hpFrac > 0.55) return false;

    const tenacity = unit.stats ? unit.stats.tenacity : 5;
    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    const holdChance = Math.max(0.08, Math.min(0.96, (tenacity * 0.07) + (loyalty * 0.03) + hpFrac * 0.18));
    return Math.random() > holdChance;
  }

  _tryDefect(unit) {
    if (unit.type === CONFIG.ENTITY.LEADER) return false;

    const loyalty = unit.stats ? unit.stats.loyalty : 5;
    if (loyalty >= 6.0) return false;

    const hpFrac = unit.hp / Math.max(1, unit.maxHp);
    const moralePenalty = Math.max(0, 0.7 - this.morale);
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

  _rollUnitStats(type) {
    const base = CONFIG.UNIT_STATS_BASE[type] || {
      strength: 5, loyalty: 5, agility: 5, tenacity: 5, endurance: 5, defense: 5,
    };
    const v = CONFIG.UNIT_STATS_VARIANCE || 0.8;
    const techAdj = Math.max(0, (this.techLevel - 1) * 0.08);
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
  _updateHunger() {
    const foodBuildings = this.buildings.filter(b =>
      b.type === CONFIG.ENTITY.STOREHOUSE || b.type === CONFIG.ENTITY.CAPITOL
    );

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];

      u.hunger = Math.min(CONFIG.HUNGER_MAX, (u.hunger || 0) + CONFIG.HUNGER_RATE);

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

      if (u.hunger >= CONFIG.HUNGER_EAT_THRESHOLD && this.res.food >= 1 && foodBuildings.length) {
        let nearestFB = null, nearFBDist = Infinity;
        for (const fb of foodBuildings) {
          const d = Math.abs(fb.x - u.x) + Math.abs(fb.y - u.y);
          if (d < nearFBDist) { nearFBDist = d; nearestFB = fb; }
        }
        if (nearestFB && nearFBDist <= 1) {
          const foodNeeded = Math.ceil(u.hunger / CONFIG.HUNGER_FOOD_RESTORE);
          const foodEaten  = Math.min(foodNeeded, Math.floor(this.res.food), 6);
          if (foodEaten > 0) {
            u.hunger           = Math.max(0, u.hunger - foodEaten * CONFIG.HUNGER_FOOD_RESTORE);
            this.res.food      = Math.max(0, this.res.food - foodEaten);
            u._hungerFullTicks = 0;
            u._hungerTarget    = null;
          }
        } else if (nearestFB) {
          u._hungerTarget = { x: nearestFB.x, y: nearestFB.y };
        }
      } else {
        u._hungerTarget = null;
      }
    }
  }

  _homeCapacityByLevel(level) {
    if (level >= 3) return 6;
    if (level === 2) return 4;
    return 3;
  }

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

  _getFarmMaxTiles(level) {
    if (level <= 1) return 3;
    if (level === 2) return 6;
    return 10;
  }

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

  _ensureFarmFarmland(farm) {
    if (!farm.farmland) farm.farmland = [];
    if (!farm.farmland.length) {
      const around = this._world.getNeighbors(farm.x, farm.y).filter(n => this._world.isWalkable(n.x, n.y));
      farm.farmland.push(...around.slice(0, Math.min(2, around.length)).map(p => ({ x: p.x, y: p.y })));
      if (!farm.farmland.length) farm.farmland.push({ x: farm.x, y: farm.y });
      farm.size = farm.farmland.length;
    }
  }

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

  _despawnUnitAtIndex(index) {
    const u = this.units[index];
    if (!u) return;
    if (u.id != null) this._world.removeEntity(u.id);
    this.units.splice(index, 1);
  }

  _despawnUnitByObject(unit) {
    const idx = this.units.indexOf(unit);
    if (idx !== -1) this._despawnUnitAtIndex(idx);
  }

  _randName() {
    const names = ['Uruk','Karan','Shet','Borak','Mira','Neth','Cyra','Dorath','Elka','Forath'];
    return names[Math.floor(Math.random() * names.length)];
  }

  // ── Player Influence API ──
  applyDebuff(key, strength) {
    this.debuffs[key] = Math.min(1, (this.debuffs[key] || 0) + strength);
  }

  killLeader() {
    const old = this.leader.name;
    this.leader = { name: this._randName(), strength: 0.3 + Math.random() * 0.4 };
    this.morale = Math.max(0.1, this.morale - 0.2);
    const leaderUnits = this.units.filter(u => u.type === CONFIG.ENTITY.LEADER);
    leaderUnits.forEach(u => { u.hp = 0; });
    Game.eventLog(`${this.name} leader ${old} is eliminated. Command fractures.`, 'warn');
  }

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

  boostResearch()      { this.applyDebuff('research_boost', 0.5); }
  boostMorale()        { this.morale = Math.min(1, this.morale + 0.3); }
  damageMorale(amount) { this.morale = Math.max(0.05, this.morale - amount); this.applyDebuff('morale_loss', amount); }

  sabotageFood(amount) {
    this.res.food = Math.max(0, this.res.food - amount);
    this.applyDebuff('food', 0.4);
  }

  causeDisease(severity) {
    this.applyDebuff('disease', severity);
    const killed = Math.floor(this.population * severity * 0.2);
    this.population = Math.max(5, this.population - killed);
    Game.eventLog(`Disease ravages ${this.name}. ${killed} perish.`, 'danger');
  }

  giftWeapons() {
    this.techLevel = Math.min(this.age.tribeMaxTech, this.techLevel + 2);
    const b = this.buildings.find(bd => bd.type === CONFIG.ENTITY.BARRACKS) || this.buildings[0];
    if (b) {
      for (let i = 0; i < 3; i++) this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR);
    }
    Game.eventLog(`${this.name} receives mysterious weapons. Their army grows.`, 'warn');
  }

  // ── Fixed: direct resource manipulation instead of broken setter ──
  drainResources(amount) {
    const total = this.res.wood + this.res.metal + this.res.stone;
    if (total <= 0) return;
    const drain = Math.min(amount, total);
    const ratio = (total - drain) / total;
    this.res.wood  *= ratio;
    this.res.metal *= ratio;
    this.res.stone *= ratio;
  }

  isEliminated() {
    return !this.buildings.some(b => b.type === CONFIG.ENTITY.CAPITOL);
  }
}

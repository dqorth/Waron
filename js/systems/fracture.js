// Fracture event — handles a single united tribe splitting into two, the splinter
// caravan's migration, and the founding of the second tribe's settlement.
// Holds the fracture lifecycle state that game.js used to keep as loose closure vars.
class FractureSystem {
  constructor() {
    this.mode = false;          // true when the game started with one tribe
    this.done = false;          // true once the fracture has fired
    this.tick = 0;              // tick at which the fracture fires
    this.founded = false;       // true once the splinter tribe founds its settlement
    this._settleTarget = null;  // {x, y} where the splinter tribe will found
    this._caravanRes = null;    // resources the caravan carries
  }

  reset() {
    this.mode = false;
    this.done = false;
    this.tick = 0;
    this.founded = false;
    this._settleTarget = null;
    this._caravanRes = null;
  }

  // Single-tribe start: schedule the fracture for a random tick in range.
  schedule(devFractureCfg) {
    const fCfg = devFractureCfg || { tickMin: 120, tickMax: 250 };
    this.mode = true;
    this.done = false;
    this.founded = false;
    this.tick = fCfg.tickMin + Math.floor(Math.random() * (fCfg.tickMax - fCfg.tickMin));
  }

  // Classic two-tribe start: skip fracture entirely.
  markClassicStart() {
    this.mode = false;
    this.done = true;
    this.founded = true;
  }

  maybeTrigger(world, tribeA, tribeB, totalTicks) {
    if (this.mode && !this.done && totalTicks >= this.tick) {
      this._trigger(world, tribeA, tribeB);
    }
  }

  maybeFound(world, tribeA, tribeB, renderer) {
    if (this.done && !this.founded) {
      this._checkFounding(world, tribeA, tribeB, renderer);
    }
  }

  _trigger(world, tribeA, tribeB) {
    if (this.done) return;
    this.done = true;
    this.founded = false;

    const fCfg = (typeof DEV !== 'undefined') ? DEV.FRACTURE : {};
    const ratio = fCfg.splitRatio ?? 0.42;

    // Pick cause
    const causes = fCfg.causes || {};
    const causeKeys = Object.keys(causes);
    let causeKey = fCfg.cause || 'random';
    if (causeKey === 'random' && causeKeys.length) {
      causeKey = causeKeys[Math.floor(Math.random() * causeKeys.length)];
    }
    const cause = causes[causeKey] || {
      title: 'THE FRACTURE',
      announcement: 'The tribe tears itself apart. Two peoples emerge from the ruins of one.',
      logMessages: ['Unity is an illusion. Conflict is inevitable.'],
    };

    if (!tribeA.buildings.length) return;

    // ── Calculate what the caravan needs to carry ───────────────────────
    const splitPop = Math.floor(tribeA.population * ratio);
    const homesNeeded = Math.max(2, Math.ceil(splitPop / 3));
    const homeCost = CONFIG.BUILDING_COST[CONFIG.ENTITY.HOME] || { wood: 20, stone: 5 };

    // Resources needed to found: homes + starting reserves
    const caravanNeed = {
      wood:  homesNeeded * (homeCost.wood  || 0) + 60,
      food:  Math.max(200, splitPop * 8),  // enough food for early survival
      metal: homesNeeded * (homeCost.metal || 0) + 30,
      stone: homesNeeded * (homeCost.stone || 0) + 40,
    };

    // Deduct from tribeA — take what we can, minimum 60% of need
    this._caravanRes = {};
    for (const [res, need] of Object.entries(caravanNeed)) {
      const available = tribeA.res[res] || 0;
      const take = Math.min(available, need);
      this._caravanRes[res] = Math.max(take, Math.floor(need * 0.6));
      tribeA.res[res] = Math.max(0, available - this._caravanRes[res]);
    }

    // ── Find settlement location ────────────────────────────────────────
    const cap = tribeA.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL) || tribeA.buildings[0];

    // Calculate max journey distance based on food carry
    // Journey rations per unit: we'll give enough for the trip
    const moveInterval = CONFIG.UNIT_MOVE_INTERVAL;
    const eatInterval = CONFIG.FOOD_CARRY_EAT_INTERVAL || 5;
    // Target distance: 25-45 tiles, capped by map
    const targetDist = 25 + Math.floor(Math.random() * 20);

    this._settleTarget = this._findSettlementLocation(world, cap.x, cap.y, targetDist);

    // Actual distance after location search
    const actualDist = Math.sqrt((this._settleTarget.x - cap.x) ** 2 + (this._settleTarget.y - cap.y) ** 2);
    const actualJourneyFood = Math.ceil((actualDist * moveInterval) / eatInterval) + 3;

    // ── Select splinter units ───────────────────────────────────────────
    const giveUnits = [];
    const keepUnits = [];

    const unitsByType = {};
    for (const u of tribeA.units) {
      (unitsByType[u.type] = unitsByType[u.type] || []).push(u);
    }

    for (const [type, units] of Object.entries(unitsByType)) {
      const takeCount = Math.max(1, Math.floor(units.length * ratio));
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [units[i], units[j]] = [units[j], units[i]];
      }
      for (let i = 0; i < units.length; i++) {
        if (i < takeCount) {
          units[i].tribe = tribeB.id;
          giveUnits.push(units[i]);
        } else {
          keepUnits.push(units[i]);
        }
      }
    }

    // ── Pack journey rations — enough food to reach the settlement ──────
    for (const u of giveUnits) {
      u.carriedFood = actualJourneyFood;
      u.carriedFoodMax = actualJourneyFood; // temporary oversize for journey
      u._carryEatTimer = 0;
      u.hunger = 0;
      u._hungerFullTicks = 0;
      u._hungerTarget = null;
      u.state = 'marching';
      u.targetX = this._settleTarget.x + Math.floor(Math.random() * 5) - 2;
      u.targetY = this._settleTarget.y + Math.floor(Math.random() * 5) - 2;
    }

    // ── Update tribeA ──────────────────────────────────────────────────
    tribeA.population -= splitPop;
    tribeA.units = keepUnits;
    tribeA.military = keepUnits.filter(u =>
      u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER
    ).length;
    tribeA.morale = Math.max(0.4, tribeA.morale - 0.15);

    // ── Initialize tribeB as a migrating tribe (no buildings yet) ──────
    const cfgB = ((typeof DEV !== 'undefined') && DEV.TRIBES && DEV.TRIBES[1])
      ? DEV.TRIBES[1]
      : { id: 'b', name: 'Koru', color: '#2a6ec8' };

    tribeB.name = cfgB.name;
    tribeB.color = cfgB.color;
    tribeB.population = splitPop;
    tribeB.res = { wood: 0, food: 0, metal: 0, stone: 0 }; // resources are in the caravan
    tribeB.buildings = [];
    tribeB.units = giveUnits;
    tribeB.military = giveUnits.filter(u =>
      u.type === CONFIG.ENTITY.WARRIOR || u.type === CONFIG.ENTITY.LEADER
    ).length;
    tribeB.techLevel = Math.max(1, tribeA.techLevel);
    tribeB.morale = 0.8;
    tribeB.leader = { name: tribeB._randName(), strength: 0.4 + Math.random() * 0.5 };
    tribeB._world = world;
    tribeB._enemy = tribeA;
    tribeA._enemy = tribeB;

    // Initialize diplomatic relations — start wary (just fractured)
    if (Game.diplomacy) {
      Game.diplomacy.initRelation('a', 'b', -40);
    }
    tribeB.startX = this._settleTarget.x;
    tribeB.startY = this._settleTarget.y;

    // ── Dramatic announcement ──────────────────────────────────────────
    Game.notify(cause.title, 'danger');
    Game.eventLog(`— ${cause.title} —`, 'age');
    Game.eventLog(cause.announcement, 'danger');
    for (const msg of cause.logMessages) {
      Game.eventLog(msg, 'warn');
    }
    const daysJourney = Math.ceil(actualDist * moveInterval / CONFIG.TICKS_PER_DAY);
    Game.eventLog(`${splitPop} people gather supplies and march into the wilderness. A ${daysJourney}-day journey awaits.`, 'danger');

    if (typeof DEV !== 'undefined' && DEV.DEBUG_LOG) {
      console.log(`[FRACTURE] Cause: ${causeKey}`);
      console.log(`[FRACTURE] Target: (${this._settleTarget.x}, ${this._settleTarget.y}), dist=${actualDist.toFixed(0)}`);
      console.log(`[FRACTURE] Journey food per unit: ${actualJourneyFood}`);
      console.log(`[FRACTURE] Caravan resources:`, this._caravanRes);
      console.log(`[FRACTURE] ${tribeA.name}: ${tribeA.population} pop (stays)`);
      console.log(`[FRACTURE] ${tribeB.name}: ${tribeB.population} pop (migrating)`);
    }
  }

  // ── Check if the migrating tribe has reached their destination ─────────
  _checkFounding(world, tribeA, tribeB, renderer) {
    if (this.founded || !this._settleTarget || !this.done) return;

    // Check if any tribeB unit is within 3 tiles of the target
    const arrived = tribeB.units.some(u =>
      Math.abs(u.x - this._settleTarget.x) + Math.abs(u.y - this._settleTarget.y) <= 3
    );
    if (!arrived) return;

    this.founded = true;

    // ── Found the settlement ──────────────────────────────────────────
    // Place capitol
    tribeB._placeBuilding(this._settleTarget.x, this._settleTarget.y, CONFIG.ENTITY.CAPITOL);

    // Place starting homes from caravan resources
    const homeCost = CONFIG.BUILDING_COST[CONFIG.ENTITY.HOME] || { wood: 20, stone: 5 };
    const homesNeeded = Math.max(2, Math.ceil(tribeB.population / 3));
    let homesPlaced = 0;
    for (let r = 1; r <= 7 && homesPlaced < homesNeeded; r++) {
      for (let dy = -r; dy <= r && homesPlaced < homesNeeded; dy++) {
        for (let dx = -r; dx <= r && homesPlaced < homesNeeded; dx++) {
          const nx = this._settleTarget.x + dx;
          const ny = this._settleTarget.y + dy;
          if (!world.isWalkable(nx, ny)) continue;
          const occ = world.getEntitiesAt(nx, ny);
          if (occ.some(e => !!CONFIG.BUILDING_HP[e.type])) continue;
          tribeB._placeBuilding(nx, ny, CONFIG.ENTITY.HOME);
          // Deduct from caravan
          for (const [res, amt] of Object.entries(homeCost)) {
            this._caravanRes[res] = Math.max(0, (this._caravanRes[res] || 0) - amt);
          }
          homesPlaced++;
        }
      }
    }

    // Transfer remaining caravan resources to tribeB
    for (const [res, amt] of Object.entries(this._caravanRes)) {
      tribeB.res[res] = (tribeB.res[res] || 0) + amt;
    }
    this._caravanRes = null;

    // Reset unit carry caps to normal and stop marching
    const normalCap = tribeB._getFoodCarryCapacity();
    for (const u of tribeB.units) {
      u.carriedFoodMax = normalCap;
      u.carriedFood = Math.min(u.carriedFood, normalCap);
      if (u.state === 'marching') u.state = 'idle';
    }

    // Territory update
    world.updateTerritory(tribeA, tribeB);
    renderer.markTilesDirty();

    // ── Founding announcement ──────────────────────────────────────────
    Game.notify(`${tribeB.name.toUpperCase()} IS FOUNDED`, 'good');
    Game.eventLog(`— ${tribeB.name.toUpperCase()} IS FOUNDED —`, 'age');
    Game.eventLog(`The wanderers plant their banner. A new settlement rises from the earth.`, 'good');
    Game.eventLog(`${homesPlaced} homes built. The war begins. Keep them balanced. Be never discovered.`, 'age');
  }

  // Find settlement location within reachable distance
  _findSettlementLocation(world, originX, originY, targetDist) {
    const W = CONFIG.MAP_W;
    const H = CONFIG.MAP_H;
    const margin = 15;
    const minDist = Math.max(20, targetDist * 0.6);
    const maxDist = Math.min(targetDist * 1.4, Math.max(W, H) * 0.4);

    let best = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      let tx = Math.floor(originX + Math.cos(angle) * dist);
      let ty = Math.floor(originY + Math.sin(angle) * dist);

      // Bias away from origin
      if (originX < W / 2) tx = Math.max(tx, originX + Math.floor(minDist * 0.7));
      else tx = Math.min(tx, originX - Math.floor(minDist * 0.7));

      tx = Math.max(margin, Math.min(W - margin, tx));
      ty = Math.max(margin, Math.min(H - margin, ty));

      const p = world.findNearestWalkable(tx, ty);
      const d = Math.sqrt((p.x - originX) ** 2 + (p.y - originY) ** 2);

      // Score: prefer target distance, penalize too close or too far
      const distScore = -Math.abs(d - targetDist);
      // Bonus for fertile land
      const tile = world.getTile(p.x, p.y);
      const fertilityBonus = tile ? tile.fertility * 5 : 0;
      const score = distScore + fertilityBonus;

      if (d >= minDist && score > bestScore) {
        best = p;
        bestScore = score;
      }
    }

    if (!best) {
      const fallbackX = originX < W / 2 ? W - 35 : 35;
      best = world.findNearestWalkable(fallbackX, Math.floor(H / 2));
    }

    return best;
  }
}

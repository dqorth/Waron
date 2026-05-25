// Main game controller — accessed globally as `Game`
const Game = (() => {
  let world, tribeA, tribeB, player, renderer, ui;
  let speed = 1;
  let running = false;
  let tickAccum = 0;
  let lastTime = 0;
  let totalTicks = 0;
  let territoryUpdateTimer = 0;

  // ── Fracture state ──────────────────────────────────────────────────────
  let fractureMode = false;   // true when starting with 1 tribe
  let fractured = false;      // true after fracture fires
  let fractureTick = 0;       // tick when fracture will fire

  let _cal = { timePeriodIdx:0, timePeriodName:'Dawn', day:1, dayInMonth:1, month:1,
               monthName:'Ashveil', year:1, season:'spring', seasonName:'Spring' };

  function init() {
    const canvas = document.getElementById('game-canvas');
    renderer = new Renderer(canvas);
    ui = new UI();
    _requestLoop();
  }

  function start() {
    world = new World();
    player = new Player();

    // Apply DEV overrides
    if (typeof DEV !== 'undefined') {
      player.essence = DEV.STARTING_ESSENCE ?? 150;
      speed = DEV.DEFAULT_SPEED ?? 1;
    }

    const devTribes = (typeof DEV !== 'undefined') ? DEV.STARTING_TRIBES : 2;
    const tribeConfigs = (typeof DEV !== 'undefined' && DEV.TRIBES) ? DEV.TRIBES : [
      { id: 'a', name: 'Ashan', color: '#c8502a' },
      { id: 'b', name: 'Koru',  color: '#2a6ec8' },
    ];

    if (devTribes === 1) {
      // ── Single tribe start → fracture mode ──────────────────────────────
      fractureMode = true;
      fractured = false;

      const cfg = tribeConfigs[0];
      const cx = Math.floor(CONFIG.MAP_W / 2);
      const cy = Math.floor(CONFIG.MAP_H / 2);

      tribeA = new Tribe(cfg.id, cfg.name, cx, cy, cfg.color);

      // Give the unified tribe more starting pop and resources
      tribeA.population = Math.floor(tribeA.population * 1.8);
      const rm = (typeof DEV !== 'undefined') ? (DEV.STARTING_RESOURCE_MULT || 1) : 1;
      tribeA.res.wood  = Math.floor(tribeA.res.wood  * 1.5 * rm);
      tribeA.res.food  = Math.floor(tribeA.res.food  * 1.5 * rm);
      tribeA.res.metal = Math.floor(tribeA.res.metal * 1.5 * rm);
      tribeA.res.stone = Math.floor(tribeA.res.stone * 1.5 * rm);

      // Create a placeholder tribeB (empty, not initialized)
      const cfgB = tribeConfigs[1] || { id: 'b', name: 'Koru', color: '#2a6ec8' };
      tribeB = new Tribe(cfgB.id, cfgB.name, cx + 30, cy, cfgB.color);
      tribeB.population = 0;
      tribeB.buildings = [];
      tribeB.units = [];

      // Only init tribeA — tribeB will be initialized on fracture
      tribeA.init(world, tribeB);
      // Give tribeB a world ref so it doesn't crash if accessed before fracture
      tribeB._world = world;
      tribeB._enemy = tribeA;

      // Schedule fracture
      const fCfg = (typeof DEV !== 'undefined') ? DEV.FRACTURE : { tickMin: 120, tickMax: 250 };
      fractureTick = fCfg.tickMin + Math.floor(Math.random() * (fCfg.tickMax - fCfg.tickMin));

      world.updateTerritory(tribeA, tribeB);

      running = true;
      totalTicks = 0;

      ui.updateActionsList(player);
      eventLog(`The ${cfg.name} settle the land. A single people, united — for now.`, 'age');
      eventLog('Tend the tribe. Watch for cracks. Your time will come.', 'warn');

    } else {
      // ── Classic two-tribe start ─────────────────────────────────────────
      fractureMode = false;
      fractured = true; // skip fracture logic

      const cfgA = tribeConfigs[0];
      const cfgB = tribeConfigs[1];
      const ax = cfgA.startX ?? 35;
      const ay = cfgA.startY ?? Math.floor(CONFIG.MAP_H / 2);
      const bx = cfgB.startX ?? (CONFIG.MAP_W - 35);
      const by = cfgB.startY ?? Math.floor(CONFIG.MAP_H / 2);

      tribeA = new Tribe(cfgA.id, cfgA.name, ax, ay, cfgA.color);
      tribeB = new Tribe(cfgB.id, cfgB.name, bx, by, cfgB.color);

      // Apply resource multiplier
      const rm = (typeof DEV !== 'undefined') ? (DEV.STARTING_RESOURCE_MULT || 1) : 1;
      if (rm !== 1) {
        for (const t of [tribeA, tribeB]) {
          t.res.wood  = Math.floor(t.res.wood  * rm);
          t.res.food  = Math.floor(t.res.food  * rm);
          t.res.metal = Math.floor(t.res.metal * rm);
          t.res.stone = Math.floor(t.res.stone * rm);
        }
      }

      tribeA.init(world, tribeB);
      tribeB.init(world, tribeA);
      world.updateTerritory(tribeA, tribeB);

      running = true;
      totalTicks = 0;

      ui.updateActionsList(player);
      eventLog('The first war begins. Two tribes clash. You watch from the shadows.', 'age');
      eventLog('Keep them fighting. Keep them balanced. Be never discovered.', 'warn');
    }

    year = 1;
    speed = (typeof DEV !== 'undefined' && DEV.DEFAULT_SPEED) ? DEV.DEFAULT_SPEED : 1;
  }

  function reset() {
    running = false;
    speed = 1;
    totalTicks = 0;
    fractureMode = false;
    fractured = false;
  }

  function setSpeed(s) { speed = s; }
  function eventLog(msg, type) { if (ui) ui.addLog(msg, type); }
  function notify(msg, type) { if (ui) ui.notify(msg, type); }

  // ══════════════════════════════════════════════════════════════════════════
  // FRACTURE EVENT
  // ══════════════════════════════════════════════════════════════════════════

  // ── Fracture state: migration tracking ──────────────────────────────────
  let _settleTarget = null;    // {x, y} where splinter tribe will found
  let _caravanRes = null;      // resources the caravan carries
  let _founded = false;        // true after splinter tribe founds settlement

  function _triggerFracture() {
    if (fractured) return;
    fractured = true;
    _founded = false;

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
    _caravanRes = {};
    for (const [res, need] of Object.entries(caravanNeed)) {
      const available = tribeA.res[res] || 0;
      const take = Math.min(available, need);
      _caravanRes[res] = Math.max(take, Math.floor(need * 0.6));
      tribeA.res[res] = Math.max(0, available - _caravanRes[res]);
    }

    // ── Find settlement location ────────────────────────────────────────
    const cap = tribeA.buildings.find(b => b.type === CONFIG.ENTITY.CAPITOL) || tribeA.buildings[0];

    // Calculate max journey distance based on food carry
    // Journey rations per unit: we'll give enough for the trip
    const moveInterval = CONFIG.UNIT_MOVE_INTERVAL;
    const eatInterval = CONFIG.FOOD_CARRY_EAT_INTERVAL || 5;
    // Target distance: 25-45 tiles, capped by map
    const targetDist = 25 + Math.floor(Math.random() * 20);
    const journeyTicks = targetDist * moveInterval;
    const journeyFood = Math.ceil(journeyTicks / eatInterval) + 3; // +3 buffer

    _settleTarget = _findSettlementLocation(cap.x, cap.y, targetDist);

    // Actual distance after location search
    const actualDist = Math.sqrt((_settleTarget.x - cap.x) ** 2 + (_settleTarget.y - cap.y) ** 2);
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
      u.targetX = _settleTarget.x + Math.floor(Math.random() * 5) - 2;
      u.targetY = _settleTarget.y + Math.floor(Math.random() * 5) - 2;
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
    tribeB.startX = _settleTarget.x;
    tribeB.startY = _settleTarget.y;

    // ── Dramatic announcement ──────────────────────────────────────────
    notify(cause.title, 'danger');
    eventLog(`— ${cause.title} —`, 'age');
    eventLog(cause.announcement, 'danger');
    for (const msg of cause.logMessages) {
      eventLog(msg, 'warn');
    }
    const daysJourney = Math.ceil(actualDist * moveInterval / CONFIG.TICKS_PER_DAY);
    eventLog(`${splitPop} people gather supplies and march into the wilderness. A ${daysJourney}-day journey awaits.`, 'danger');

    if (typeof DEV !== 'undefined' && DEV.DEBUG_LOG) {
      console.log(`[FRACTURE] Cause: ${causeKey}`);
      console.log(`[FRACTURE] Target: (${_settleTarget.x}, ${_settleTarget.y}), dist=${actualDist.toFixed(0)}`);
      console.log(`[FRACTURE] Journey food per unit: ${actualJourneyFood}`);
      console.log(`[FRACTURE] Caravan resources:`, _caravanRes);
      console.log(`[FRACTURE] ${tribeA.name}: ${tribeA.population} pop (stays)`);
      console.log(`[FRACTURE] ${tribeB.name}: ${tribeB.population} pop (migrating)`);
    }
  }

  // ── Check if the migrating tribe has reached their destination ─────────
  function _checkFounding() {
    if (_founded || !_settleTarget || !fractured) return;

    // Check if any tribeB unit is within 3 tiles of the target
    const arrived = tribeB.units.some(u =>
      Math.abs(u.x - _settleTarget.x) + Math.abs(u.y - _settleTarget.y) <= 3
    );
    if (!arrived) return;

    _founded = true;

    // ── Found the settlement ──────────────────────────────────────────
    // Place capitol
    tribeB._placeBuilding(_settleTarget.x, _settleTarget.y, CONFIG.ENTITY.CAPITOL);

    // Place starting homes from caravan resources
    const homeCost = CONFIG.BUILDING_COST[CONFIG.ENTITY.HOME] || { wood: 20, stone: 5 };
    const homesNeeded = Math.max(2, Math.ceil(tribeB.population / 3));
    let homesPlaced = 0;
    for (let r = 1; r <= 7 && homesPlaced < homesNeeded; r++) {
      for (let dy = -r; dy <= r && homesPlaced < homesNeeded; dy++) {
        for (let dx = -r; dx <= r && homesPlaced < homesNeeded; dx++) {
          const nx = _settleTarget.x + dx;
          const ny = _settleTarget.y + dy;
          if (!world.isWalkable(nx, ny)) continue;
          const occ = world.getEntitiesAt(nx, ny);
          if (occ.some(e => !!CONFIG.BUILDING_HP[e.type])) continue;
          tribeB._placeBuilding(nx, ny, CONFIG.ENTITY.HOME);
          // Deduct from caravan
          for (const [res, amt] of Object.entries(homeCost)) {
            _caravanRes[res] = Math.max(0, (_caravanRes[res] || 0) - amt);
          }
          homesPlaced++;
        }
      }
    }

    // Transfer remaining caravan resources to tribeB
    for (const [res, amt] of Object.entries(_caravanRes)) {
      tribeB.res[res] = (tribeB.res[res] || 0) + amt;
    }
    _caravanRes = null;

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
    notify(`${tribeB.name.toUpperCase()} IS FOUNDED`, 'good');
    eventLog(`— ${tribeB.name.toUpperCase()} IS FOUNDED —`, 'age');
    eventLog(`The wanderers plant their banner. A new settlement rises from the earth.`, 'good');
    eventLog(`${homesPlaced} homes built. The war begins. Keep them balanced. Be never discovered.`, 'age');
  }

  // Find settlement location within reachable distance
  function _findSettlementLocation(originX, originY, targetDist) {
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

  // ══════════════════════════════════════════════════════════════════════════
  // TICK
  // ══════════════════════════════════════════════════════════════════════════

  function _tick() {
    if (!running) return;

    totalTicks++;
    _cal = _getCalendar(totalTicks);

    // Check for fracture event
    if (fractureMode && !fractured && totalTicks >= fractureTick) {
      _triggerFracture();
    }

    // Check if migrating tribe has arrived and should found their settlement
    if (fractured && !_founded) {
      _checkFounding();
    }

    world.tickResources();

    _tickWeather(_cal.season);
    world.weather     = _weather;
    world.weatherMods = _weatherMods[_weather.type] || { foodSpoilMult: 1, moveMult: 1, farmMult: 1 };

    // Apply DEV debug flags
    const dev = (typeof DEV !== 'undefined') ? DEV : {};

    // Tick tribeA always
    tribeA.tick(_cal.year);

    // Tick tribeB only if it exists and has been fractured (or classic mode)
    if (fractured || !fractureMode) {
      tribeB.tick(_cal.year);
    }

    player.tick(tribeA, tribeB, _cal.year);

    // Periodic territory update
    territoryUpdateTimer++;
    if (territoryUpdateTimer >= 10) {
      territoryUpdateTimer = 0;
      world.updateTerritory(tribeA, tribeB);
      renderer.markTilesDirty();
    }

    _advanceTribeTech(tribeA);
    if (fractured || !fractureMode) {
      _advanceTribeTech(tribeB);
    }

    // Update UI
    ui.updateHUD(player, tribeA, tribeB, _cal);
    if (totalTicks % 5 === 0) ui.updateActionsList(player);

    _checkEndConditions();
  }

  function _advanceTribeTech(tribe) {
    const maxTech = tribe.age.tribeMaxTech;
    const techThreshold = 50 + tribe.techLevel * 30;
    if (tribe.knowledge >= techThreshold && tribe.techLevel < maxTech) {
      tribe.techLevel++;
      tribe.knowledge = 0;
      if (tribe.techLevel % 3 === 0) {
        eventLog(`${tribe.name} achieves new technology (Level ${tribe.techLevel}).`, 'good');
      }
    }
  }

  function _checkEndConditions() {
    // Don't check balance/elimination before founding
    if (fractureMode && (!fractured || !_founded)) return;

    const totalPower = tribeA.power + tribeB.power || 1;
    const fracA = tribeA.power / totalPower;
    const fracB = tribeB.power / totalPower;

    // Dev: invincible tribes
    if (typeof DEV !== 'undefined' && DEV.INVINCIBLE_TRIBES) return;

    if (tribeA.isEliminated()) {
      _gameOver(`<strong>${tribeA.name.toUpperCase()} IS DESTROYED.</strong><br>${tribeB.name} stands triumphant. Without a war to feed, they turn their gaze to the shadows — and find you.`, true);
      return;
    }
    if (tribeB.isEliminated()) {
      _gameOver(`<strong>${tribeB.name.toUpperCase()} IS DESTROYED.</strong><br>${tribeA.name} reigns supreme. In their victory songs, they speak of a hidden hand — and hunt it down.`, true);
      return;
    }

    if (fracA >= CONFIG.BALANCE_LOSE || fracB >= CONFIG.BALANCE_LOSE) {
      const winner = fracA > fracB ? tribeA : tribeB;
      const loser = fracA > fracB ? tribeB : tribeA;
      _gameOver(`<strong>${winner.name.toUpperCase()} DOMINATES.</strong><br>${loser.name} is broken. The victors celebrate — then notice a pattern in every war they've ever fought. They trace it to you.`, true);
      return;
    }

    if (typeof DEV === 'undefined' || !DEV.NO_SUSPICION) {
      if (player.suspicionA >= CONFIG.SUSPICION_LOSE) {
        _gameOver(`<strong>${tribeA.name.toUpperCase()} HAS DISCOVERED YOU.</strong><br>A keen elder pieced together the signs. ${tribeB.name}, their eternal enemy, is alerted. Both tribes now march against the Shadow Keeper.`, false);
        return;
      }
      if (player.suspicionB >= CONFIG.SUSPICION_LOSE) {
        _gameOver(`<strong>${tribeB.name.toUpperCase()} HAS DISCOVERED YOU.</strong><br>A captain noticed the pattern of sabotage. ${tribeA.name} is told. For the first time in history, both tribes unite — to destroy you.`, false);
        return;
      }
    }

    // Balance warnings
    if (fracA >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog(`WARNING: ${tribeA.name} grows too powerful. Intervene!`, 'danger');
      notify(`${tribeA.name.toUpperCase()} IS DOMINATING — ACT NOW`, 'danger');
    }
    if (fracB >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog(`WARNING: ${tribeB.name} grows too powerful. Intervene!`, 'danger');
      notify(`${tribeB.name.toUpperCase()} IS DOMINATING — ACT NOW`, 'danger');
    }

    if (player.suspicionA >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog(`${tribeA.name} suspects a hidden influence. Lower their suspicion!`, 'warn');
    }
    if (player.suspicionB >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog(`${tribeB.name} suspects a hidden influence. Lower their suspicion!`, 'warn');
    }
  }

  function _gameOver(reason, byBalance) {
    running = false;
    const stats = `
      Days survived: <strong>${_cal.day}</strong><br>
      Years elapsed: <strong>${_cal.year}</strong><br>
      Age reached: <strong>${player.age.name}</strong><br>
      Total essence harvested: <strong>${Math.floor(player.totalEssence)}</strong><br>
      Actions used: <strong>${player.actionsUsed}</strong><br>
      Combined casualties: <strong>${tribeA.casualties + tribeB.casualties}</strong>
    `;
    ui.showGameOver(reason, stats);
  }

  function _requestLoop() {
    function loop(timestamp) {
      requestAnimationFrame(loop);

      if (!running) {
        if (renderer && world) renderer.render(world, tribeA || {buildings:[],units:[]}, tribeB || {buildings:[],units:[]}, _weather);
        return;
      }

      const dt = timestamp - lastTime;
      lastTime = timestamp;

      const tickMs = (typeof DEV !== 'undefined' && DEV.TICK_MS_OVERRIDE) || CONFIG.TICK_MS;
      const tickInterval = speed > 0 ? tickMs / speed : Infinity;
      tickAccum += dt;

      if (speed > 0 && tickAccum >= tickInterval) {
        tickAccum -= tickInterval;
        _tick();
      }

      renderer.render(world, tribeA, tribeB, _weather);
    }

    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  return {
    get world() { return world; },
    get player() { return player; },
    get tribeA() { return tribeA; },
    get tribeB() { return tribeB; },
    get ui() { return ui; },
    get year() { return _cal ? _cal.year : 1; },
    get day()  { return _cal ? _cal.day  : 1; },
    get calendar() { return _cal; },
    get fractured() { return fractured; },
    get founded() { return _founded; },
    init,
    start,
    reset,
    setSpeed,
    eventLog,
    notify,
  };
})();

// ── Calendar helper ────────────────────────────────────────────────────────────
function _getCalendar(ticks) {
  const TPD = CONFIG.TICKS_PER_DAY;
  const DPM = CONFIG.DAYS_PER_MONTH;
  const MPY = CONFIG.MONTHS_PER_YEAR;
  const DPY = CONFIG.DAYS_PER_YEAR;

  const timePeriodIdx = ticks % TPD;
  const totalDays     = Math.floor(ticks / TPD);
  const dayInMonth    = (totalDays % DPM) + 1;
  const monthIdx      = Math.floor(totalDays / DPM) % MPY;
  const month         = monthIdx + 1;
  const year          = Math.floor(totalDays / DPY) + 1;

  let season;
  if      (month <= 3)  season = CONFIG.SEASON.SPRING;
  else if (month <= 6)  season = CONFIG.SEASON.SUMMER;
  else if (month <= 9)  season = CONFIG.SEASON.AUTUMN;
  else                  season = CONFIG.SEASON.WINTER;

  return {
    timePeriodIdx,
    timePeriodName: CONFIG.TIME_PERIOD_NAMES[timePeriodIdx],
    day:       totalDays + 1,
    dayInMonth,
    month,
    monthName: CONFIG.MONTH_NAMES[monthIdx],
    year,
    season,
    seasonName: season.charAt(0).toUpperCase() + season.slice(1),
  };
}

// ── Weather state machine ──────────────────────────────────────────────────────
const _weather = { type: CONFIG.WEATHER.SUNSHINE, intensity: 1.0, timer: 0, duration: 120 };

const _weatherMods = {
  sunshine: { foodSpoilMult: 1.0,  moveMult: 1.0, farmMult: 1.15 },
  overcast: { foodSpoilMult: 0.95, moveMult: 1.0, farmMult: 0.95 },
  rain:     { foodSpoilMult: 0.9,  moveMult: 1.3, farmMult: 1.10 },
  storm:    { foodSpoilMult: 1.1,  moveMult: 1.7, farmMult: 0.75 },
  drought:  { foodSpoilMult: 2.0,  moveMult: 1.0, farmMult: 0.50 },
  flood:    { foodSpoilMult: 1.2,  moveMult: 1.9, farmMult: 0.60 },
  snow:     { foodSpoilMult: 1.0,  moveMult: 2.2, farmMult: 0.40 },
};

const _seasonWeatherWeights = {
  spring: { sunshine:0.30, overcast:0.25, rain:0.30, storm:0.08, drought:0.05, flood:0.02, snow:0.00 },
  summer: { sunshine:0.45, overcast:0.15, rain:0.12, storm:0.18, drought:0.10, flood:0.00, snow:0.00 },
  autumn: { sunshine:0.18, overcast:0.32, rain:0.28, storm:0.14, drought:0.00, flood:0.06, snow:0.02 },
  winter: { sunshine:0.10, overcast:0.28, rain:0.08, storm:0.10, drought:0.00, flood:0.04, snow:0.40 },
};

const _weatherEventMsgs = {
  sunshine: ['The skies clear. Warm sunshine bathes the land.','Golden light spills across the hills — a fine day.'],
  overcast: ['Heavy clouds roll in, casting long shadows.','The sky dims. An overcast mood settles on the land.'],
  rain:     ['Rain begins to fall. Rivers swell and fields drink deeply.','A steady drizzle soaks the earth. Roads turn to mud.','Cold rain lashes the hills. Movement slows.'],
  storm:    ['A violent storm erupts! Thunder shakes the hills and lightning splits the sky.','Howling winds and torrential rain — a storm rages across the land.','Soldiers take shelter. The storm is merciless.'],
  drought:  ['A brutal drought grips the land. Crops wither. Rivers shrink.','The sun beats down without mercy. Food stores dwindle.','Parched earth cracks in the heat. Farmers despair.'],
  flood:    ['Floodwaters surge across the lowlands. Fields vanish beneath muddy water.','The river bursts its banks. Homes and roads are swamped.','Soldiers wade through flooded plains. Progress is agonizing.'],
  snow:     ['Snow falls silently, blanketing the land in white.','A bitter snowstorm sweeps through the valleys.','Ice and snow grip the land. Movement becomes treacherous.'],
};

function _tickWeather(season) {
  _weather.timer++;
  if (_weather.timer < _weather.duration) return;
  _weather.timer = 0;
  _weather.duration = CONFIG.WEATHER_DURATION_MIN
    + Math.floor(Math.random() * (CONFIG.WEATHER_DURATION_MAX - CONFIG.WEATHER_DURATION_MIN));

  const weights = _seasonWeatherWeights[season] || _seasonWeatherWeights.spring;
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total   = entries.reduce((s, [, w]) => s + w, 0);
  const r = Math.random() * total;
  let acc = 0;
  let nextType = _weather.type;
  for (const [type, w] of entries) {
    acc += w;
    if (r <= acc) { nextType = type; break; }
  }

  if (nextType !== _weather.type) {
    const msgs = _weatherEventMsgs[nextType];
    if (msgs) Game.eventLog(msgs[Math.floor(Math.random() * msgs.length)], 'event');
  }
  _weather.type      = nextType;
  _weather.intensity = 0.55 + Math.random() * 0.45;
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

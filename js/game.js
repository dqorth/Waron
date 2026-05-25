// Main game controller — accessed globally as `Game`
const Game = (() => {
  let world, tribeA, tribeB, player, renderer, ui;
  let fog = null;
  let diplomacy = null;
  let wildlife = null;
  let weather = null;
  let speed = 1;
  let running = false;
  let tickAccum = 0;
  let lastTime = 0;
  let totalTicks = 0;
  let territoryUpdateTimer = 0;

  // ── Fracture lifecycle (single-tribe split → migration → founding) ───────
  const fracture = new FractureSystem();

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
    fog = new FogOfWar(CONFIG.MAP_W, CONFIG.MAP_H);
    diplomacy = new Diplomacy();
    wildlife = new Wildlife(world);
    weather = new WeatherSystem();
    fracture.reset();
    if (typeof DEV === 'undefined' || DEV.ANIMALS_ENABLED !== false) {
      wildlife.populate();
    }

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
      fracture.schedule((typeof DEV !== 'undefined') ? DEV.FRACTURE : null);

      world.updateTerritory(tribeA, tribeB);

      running = true;
      totalTicks = 0;

      ui.updateActionsList(player);
      eventLog(`The ${cfg.name} settle the land. A single people, united — for now.`, 'age');
      eventLog('Tend the tribe. Watch for cracks. Your time will come.', 'warn');

    } else {
      // ── Classic two-tribe start ─────────────────────────────────────────
      fracture.markClassicStart(); // skip fracture logic

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
    fracture.reset();
  }

  function setSpeed(s) { speed = s; }
  function eventLog(msg, type) { if (ui) ui.addLog(msg, type); }
  function notify(msg, type) { if (ui) ui.notify(msg, type); }

  // ══════════════════════════════════════════════════════════════════════════
  // TICK
  // ══════════════════════════════════════════════════════════════════════════

  function _tick() {
    if (!running) return;

    totalTicks++;
    _cal = getCalendar(totalTicks);

    // Check for fracture event
    fracture.maybeTrigger(world, tribeA, tribeB, totalTicks);

    // Check if migrating tribe has arrived and should found their settlement
    fracture.maybeFound(world, tribeA, tribeB, renderer);

    world.tickResources();

    weather.tick(_cal.season);
    world.weather     = weather.current;
    world.weatherMods = weather.currentMods;

    // Apply DEV debug flags
    const dev = (typeof DEV !== 'undefined') ? DEV : {};

    // Tick tribeA always
    tribeA.tick(_cal.year);

    // Tick tribeB only if it exists and has been fractured (or classic mode)
    if (fracture.done || !fracture.mode) {
      tribeB.tick(_cal.year);
    }

    player.tick(tribeA, tribeB, _cal.year);

    // Periodic territory + fog update
    territoryUpdateTimer++;
    if (territoryUpdateTimer >= 10) {
      territoryUpdateTimer = 0;
      world.updateTerritory(tribeA, tribeB);
      renderer.markTilesDirty();
    }

    // Fog of war — update visibility every 5 ticks (each game day)
    if (fog && totalTicks % 5 === 0) {
      fog.update(tribeA, tribeB);
    }

    // Wildlife tick
    if (wildlife && totalTicks % 3 === 0) {
      wildlife.tick(tribeA, tribeB);
    }

    // Diplomacy tick
    if (diplomacy) {
      diplomacy.tick(totalTicks);
      // Log any diplomatic events
      for (const evt of diplomacy.drainEvents()) {
        if (evt.reason === 'treaty expired') {
          eventLog(`The treaty between the tribes has expired. Tensions rise.`, 'warn');
        } else if (evt.from !== evt.to) {
          eventLog(`Relations shift: ${evt.from} → ${evt.to} (${evt.reason}).`, 'warn');
        }
      }
    }

    _advanceTribeTech(tribeA);
    if (fracture.done || !fracture.mode) {
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
    if (fracture.mode && (!fracture.done || !fracture.founded)) return;

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
        if (renderer && world) renderer.render(world, tribeA || {buildings:[],units:[]}, tribeB || {buildings:[],units:[]}, weather ? weather.current : null);
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

      renderer.render(world, tribeA, tribeB, weather.current);
    }

    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  return {
    get world() { return world; },
    get player() { return player; },
    get tribeA() { return tribeA; },
    get tribeB() { return tribeB; },
    get fog() { return fog; },
    get diplomacy() { return diplomacy; },
    get wildlife() { return wildlife; },
    get ui() { return ui; },
    get year() { return _cal ? _cal.year : 1; },
    get day()  { return _cal ? _cal.day  : 1; },
    get calendar() { return _cal; },
    get fractured() { return fracture.done; },
    get founded() { return fracture.founded; },
    init,
    start,
    reset,
    setSpeed,
    eventLog,
    notify,
  };
})();

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

// Main game controller — accessed globally as `Game`
const Game = (() => {
  let world, tribeA, tribeB, player, renderer, ui;
  let speed = 1;       // 0 = paused
  let running = false;
  let tickAccum = 0;
  let lastTime = 0;
  let totalTicks = 0;
  let territoryUpdateTimer = 0;

  // Derived from totalTicks each tick.
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

    // Tribe A: left side of map (west)
    tribeA = new Tribe('a', 'Ashan', 35, Math.floor(CONFIG.MAP_H / 2), '#c8502a');
    // Tribe B: right side of map (east)
    tribeB = new Tribe('b', 'Koru', CONFIG.MAP_W - 35, Math.floor(CONFIG.MAP_H / 2), '#2a6ec8');

    tribeA.init(world, tribeB);
    tribeB.init(world, tribeA);
    world.updateTerritory(tribeA, tribeB);

    year = 1;
    speed = 1;
    running = true;
    totalTicks = 0;

    ui.updateActionsList(player);
    eventLog('The first war begins. Two tribes clash. You watch from the shadows.', 'age');
    eventLog('Keep them fighting. Keep them balanced. Be never discovered.', 'warn');
  }

  function reset() {
    running = false;
    speed = 1;
    totalTicks = 0;
  }

  function setSpeed(s) {
    speed = s;
  }

  function eventLog(msg, type) {
    if (ui) ui.addLog(msg, type);
  }

  function notify(msg, type) {
    if (ui) ui.notify(msg, type);
  }

  function _tick() {
    if (!running) return;

    totalTicks++;
    _cal = _getCalendar(totalTicks);

    // Regenerate landscape resource nodes (and tick trees).
    world.tickResources();

    // Weather tick (season-aware).
    _tickWeather(_cal.season);
    world.weather     = _weather;
    world.weatherMods = _weatherMods[_weather.type] || { foodSpoilMult: 1, moveMult: 1, farmMult: 1 };

    // Tribe ticks
    tribeA.tick(_cal.year);
    tribeB.tick(_cal.year);

    // Player tick
    player.tick(tribeA, tribeB, _cal.year);

    // Periodic territory update (every 10 ticks)
    territoryUpdateTimer++;
    if (territoryUpdateTimer >= 10) {
      territoryUpdateTimer = 0;
      world.updateTerritory(tribeA, tribeB);
      renderer.markTilesDirty();
    }

    // Tech progression from knowledge
    _advanceTribeTech(tribeA);
    _advanceTribeTech(tribeB);

    // Update UI
    ui.updateHUD(player, tribeA, tribeB, _cal);
    if (totalTicks % 5 === 0) ui.updateActionsList(player);

    // Win/lose checks
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
    const totalPower = tribeA.power + tribeB.power || 1;
    const fracA = tribeA.power / totalPower;
    const fracB = tribeB.power / totalPower;

    // Tribe elimination check
    if (tribeA.isEliminated()) {
      _gameOver(
        `<strong>ASHAN IS DESTROYED.</strong><br>Koru stands triumphant. Without a war to feed, they turn their gaze to the shadows — and find you.`,
        true
      );
      return;
    }
    if (tribeB.isEliminated()) {
      _gameOver(
        `<strong>KORU IS DESTROYED.</strong><br>Ashan reigns supreme. In their victory songs, they speak of a hidden hand — and hunt it down.`,
        true
      );
      return;
    }

    // Massive imbalance = one side about to win
    if (fracA >= CONFIG.BALANCE_LOSE || fracB >= CONFIG.BALANCE_LOSE) {
      const winner = fracA > fracB ? tribeA : tribeB;
      const loser = fracA > fracB ? tribeB : tribeA;
      _gameOver(
        `<strong>${winner.name.toUpperCase()} DOMINATES.</strong><br>${loser.name} is broken. The victors celebrate — then notice a pattern in every war they've ever fought. They trace it to you.`,
        true
      );
      return;
    }

    // Suspicion discovery
    if (player.suspicionA >= CONFIG.SUSPICION_LOSE) {
      _gameOver(
        `<strong>ASHAN HAS DISCOVERED YOU.</strong><br>A keen elder pieced together the signs. Koru, their eternal enemy, is alerted. Both tribes now march against the Shadow Keeper.`,
        false
      );
      return;
    }
    if (player.suspicionB >= CONFIG.SUSPICION_LOSE) {
      _gameOver(
        `<strong>KORU HAS DISCOVERED YOU.</strong><br>A captain noticed the pattern of sabotage. Ashan is told. For the first time in history, both tribes unite — to destroy you.`,
        false
      );
      return;
    }

    // Balance warnings
    if (fracA >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog('WARNING: Ashan grows too powerful. Intervene!', 'danger');
      notify('ASHAN IS DOMINATING — ACT NOW', 'danger');
    }
    if (fracB >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog('WARNING: Koru grows too powerful. Intervene!', 'danger');
      notify('KORU IS DOMINATING — ACT NOW', 'danger');
    }

    // Suspicion warnings
    if (player.suspicionA >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog('ASHAN suspects a hidden influence. Lower their suspicion!', 'warn');
    }
    if (player.suspicionB >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog('KORU suspects a hidden influence. Lower their suspicion!', 'warn');
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

      // Accumulate time for ticks
      const tickInterval = speed > 0 ? CONFIG.TICK_MS / speed : Infinity;
      tickAccum += dt;

      if (speed > 0 && tickAccum >= tickInterval) {
        tickAccum -= tickInterval;
        _tick();
      }

      // Always render
      renderer.render(world, tribeA, tribeB, _weather);
    }

    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  // Expose public API
  return {
    get world() { return world; },
    get player() { return player; },
    get tribeA() { return tribeA; },
    get tribeB() { return tribeB; },
    get ui() { return ui; },
    get year() { return _cal ? _cal.year : 1; },
    get day()  { return _cal ? _cal.day  : 1; },
    get calendar() { return _cal; },
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
  const TPD = CONFIG.TICKS_PER_DAY;   // 5
  const DPM = CONFIG.DAYS_PER_MONTH;  // 27
  const MPY = CONFIG.MONTHS_PER_YEAR; // 13
  const DPY = CONFIG.DAYS_PER_YEAR;   // 351

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

// ── Weather state machine (module-level) ──────────────────────────────────────
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

// Season-based weather probability weights (replaces transition table).
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

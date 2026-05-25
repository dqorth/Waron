// Weather state machine — owns the current weather, season weighting, and event copy.
// game.js ticks it each frame and mirrors `current`/`currentMods` onto `world`.
class WeatherSystem {
  constructor() {
    this.state = { type: CONFIG.WEATHER.SUNSHINE, intensity: 1.0, timer: 0, duration: 120 };

    this._mods = {
      sunshine: { foodSpoilMult: 1.0,  moveMult: 1.0, farmMult: 1.15 },
      overcast: { foodSpoilMult: 0.95, moveMult: 1.0, farmMult: 0.95 },
      rain:     { foodSpoilMult: 0.9,  moveMult: 1.3, farmMult: 1.10 },
      storm:    { foodSpoilMult: 1.1,  moveMult: 1.7, farmMult: 0.75 },
      drought:  { foodSpoilMult: 2.0,  moveMult: 1.0, farmMult: 0.50 },
      flood:    { foodSpoilMult: 1.2,  moveMult: 1.9, farmMult: 0.60 },
      snow:     { foodSpoilMult: 1.0,  moveMult: 2.2, farmMult: 0.40 },
    };

    this._seasonWeights = {
      spring: { sunshine:0.30, overcast:0.25, rain:0.30, storm:0.08, drought:0.05, flood:0.02, snow:0.00 },
      summer: { sunshine:0.45, overcast:0.15, rain:0.12, storm:0.18, drought:0.10, flood:0.00, snow:0.00 },
      autumn: { sunshine:0.18, overcast:0.32, rain:0.28, storm:0.14, drought:0.00, flood:0.06, snow:0.02 },
      winter: { sunshine:0.10, overcast:0.28, rain:0.08, storm:0.10, drought:0.00, flood:0.04, snow:0.40 },
    };

    this._eventMsgs = {
      sunshine: ['The skies clear. Warm sunshine bathes the land.','Golden light spills across the hills — a fine day.'],
      overcast: ['Heavy clouds roll in, casting long shadows.','The sky dims. An overcast mood settles on the land.'],
      rain:     ['Rain begins to fall. Rivers swell and fields drink deeply.','A steady drizzle soaks the earth. Roads turn to mud.','Cold rain lashes the hills. Movement slows.'],
      storm:    ['A violent storm erupts! Thunder shakes the hills and lightning splits the sky.','Howling winds and torrential rain — a storm rages across the land.','Soldiers take shelter. The storm is merciless.'],
      drought:  ['A brutal drought grips the land. Crops wither. Rivers shrink.','The sun beats down without mercy. Food stores dwindle.','Parched earth cracks in the heat. Farmers despair.'],
      flood:    ['Floodwaters surge across the lowlands. Fields vanish beneath muddy water.','The river bursts its banks. Homes and roads are swamped.','Soldiers wade through flooded plains. Progress is agonizing.'],
      snow:     ['Snow falls silently, blanketing the land in white.','A bitter snowstorm sweeps through the valleys.','Ice and snow grip the land. Movement becomes treacherous.'],
    };
  }

  get current() { return this.state; }

  get currentMods() {
    return this._mods[this.state.type] || { foodSpoilMult: 1, moveMult: 1, farmMult: 1 };
  }

  tick(season) {
    const w = this.state;
    w.timer++;
    if (w.timer < w.duration) return;
    w.timer = 0;
    w.duration = CONFIG.WEATHER_DURATION_MIN
      + Math.floor(Math.random() * (CONFIG.WEATHER_DURATION_MAX - CONFIG.WEATHER_DURATION_MIN));

    const weights = this._seasonWeights[season] || this._seasonWeights.spring;
    const entries = Object.entries(weights).filter(([, wt]) => wt > 0);
    const total   = entries.reduce((s, [, wt]) => s + wt, 0);
    const r = Math.random() * total;
    let acc = 0;
    let nextType = w.type;
    for (const [type, wt] of entries) {
      acc += wt;
      if (r <= acc) { nextType = type; break; }
    }

    if (nextType !== w.type) {
      const msgs = this._eventMsgs[nextType];
      if (msgs) Game.eventLog(msgs[Math.floor(Math.random() * msgs.length)], 'event');
    }
    w.type      = nextType;
    w.intensity = 0.55 + Math.random() * 0.45;
  }
}

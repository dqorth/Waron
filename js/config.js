const CONFIG = {
  CANVAS_W: 1280,
  CANVAS_H: 720,

  MAP_SEED: Date.now(),

  // Flat-top hex map geometry.
  HEX_SIZE: 28,
  HEX_V_SCALE: 0.58,

  MAP_W: 192,
  MAP_H: 192,

  TICK_MS: 500,
  DAYS_PER_TICK: 1,

  UNIT_MOVE_INTERVAL: 4,
  UNIT_ROAD_DIVISOR: 2,
  SCOUT_MOVE_INTERVAL: 2,

  BALANCE_WARN: 0.70,
  BALANCE_CRIT: 0.82,
  BALANCE_LOSE: 0.95,

  SUSPICION_WARN: 0.6,
  SUSPICION_CRIT: 0.8,
  SUSPICION_LOSE: 1.0,
  SUSPICION_DECAY: 0.002,

  CAM_SPEED: 8,
  CAM_ZOOM_MIN: 0.10,
  CAM_ZOOM_MAX: 2.0,
  CAM_ZOOM_DEFAULT: 0.28,

  TILE: {
    WATER: 0,
    GRASS: 1,
    FOREST: 2,
    MOUNTAIN: 3,
    STONE: 4,
    DESERT: 5,
    SNOW: 6,
    RUINS: 7,
    WETLAND: 8,
    JUNGLE: 9,
    SAVANNA: 10,
    TUNDRA: 11,
  },

  RESOURCE: {
    WOOD: 'wood',
    FOOD: 'food',
    METAL: 'metal',
    STONE: 'stone',
  },

  TILE_YIELD: {
    1: { food: 3 },
    2: {},                    // Forest: wood only from tree entities
    3: { metal: 4 },
    4: { stone: 4 },
    5: { food: 1 },
    6: { stone: 2 },
    7: { metal: 2, stone: 2 },
    8: { food: 4 },           // Wetland: wood from trees only
    9: { food: 5 },           // Jungle: wood from trees only
    10: { food: 2 },
    11: { stone: 3, metal: 1 },
  },

  TILE_RESOURCE_MAX: 200,
  TILE_RESOURCE_REGEN: 0.15,

  FOOD_SPOIL_RATE: 0.0025,
  FOOD_STORAGE_BASE: 100,
  FOOD_STORAGE_PER_FARM: 200,

  STORAGE_BASE_CAP: 200,
  STORAGE_PER_STOREHOUSE: 600,

  ENTITY: {
    CAPITOL: 'capitol',
    FORT: 'fort',
    BARRACKS: 'barracks',
    FARM: 'farm',
    TOWER: 'tower',
    HOME: 'home',
    STOREHOUSE: 'storehouse',
    WALL: 'wall',
    WARRIOR: 'warrior',
    WORKER: 'worker',
    SCOUT: 'scout',
    LEADER: 'leader',
    NORMAL: 'normal',
    TREE: 'tree',
  },

  BUILDING_HP: {
    capitol: 1500,
    fort: 800,
    barracks: 450,
    farm: 350,
    tower: 200,
    home: 180,
    storehouse: 400,
    wall: 800,
  },

  BUILDING_COST: {
    capitol: { wood: 0, food: 0, metal: 0, stone: 0 },
    fort: { wood: 40, food: 20, metal: 30, stone: 20 },
    barracks: { wood: 30, food: 0, metal: 20, stone: 10 },
    farm: { wood: 25, food: 0, metal: 0, stone: 10 },
    tower: { wood: 10, food: 0, metal: 15, stone: 20 },
    home: { wood: 20, food: 0, metal: 0, stone: 5 },
    storehouse: { wood: 35, food: 0, metal: 0, stone: 25 },
    wall: { wood: 5, food: 0, metal: 10, stone: 30 },
  },

  BUILDING_MAX_LEVEL: {
    capitol: 3,
    fort: 3,
    barracks: 3,
    farm: 3,
    tower: 3,
    home: 3,
    storehouse: 3,
    wall: 2,
  },

  BUILDING_UPGRADE_MULT: 1.5,

  UNIT_HP: {
    warrior: 15,
    worker: 8,
    scout: 6,
    leader: 30,
    normal: 7,
  },

  // Base unit stats used to derive behavior.
  // strength: attack power for warriors/scouts, build speed for workers.
  // loyalty: willingness to fight + resistance to defection.
  // agility: move and attack speed.
  // tenacity: chance to keep fighting while wounded.
  // endurance: max health factor.
  // defense: damage reduction.
  UNIT_STATS_BASE: {
    warrior: { strength: 8.0, loyalty: 7.2, agility: 6.2, tenacity: 8.0, endurance: 8.5, defense: 6.8 },
    scout: { strength: 5.8, loyalty: 6.4, agility: 9.1, tenacity: 5.5, endurance: 5.2, defense: 4.2 },
    worker: { strength: 6.5, loyalty: 7.8, agility: 5.1, tenacity: 6.6, endurance: 6.4, defense: 4.8 },
    leader: { strength: 9.0, loyalty: 9.4, agility: 6.8, tenacity: 9.3, endurance: 10.0, defense: 8.0 },
    normal: { strength: 3.0, loyalty: 6.8, agility: 4.9, tenacity: 4.4, endurance: 5.4, defense: 3.7 },
  },
  UNIT_STATS_VARIANCE: 0.9,

  TOWER_RANGE: 3,
  TOWER_DAMAGE: 2.0,

  WEATHER: {
    SUNSHINE: 'sunshine',
    OVERCAST: 'overcast',
    RAIN: 'rain',
    STORM: 'storm',
    SNOW: 'snow',
    DROUGHT: 'drought',
    FLOOD: 'flood',
  },
  WEATHER_DURATION_MIN: 80,
  WEATHER_DURATION_MAX: 280,

  // ── Calendar ─────────────────────────────────────────────────────────────
  TICKS_PER_DAY: 5,       // each game tick = 1 time period; 5 periods = 1 day
  DAYS_PER_MONTH: 27,
  MONTHS_PER_YEAR: 13,
  DAYS_PER_YEAR: 351,     // 13 × 27
  TIME_PERIOD_NAMES: ['Dawn', 'Morning', 'Day', 'Dusk', 'Night'],
  MONTH_NAMES: [
    'Ashveil', 'Blossomtide', 'Planting',
    'Verdant', 'Highsun', 'Burnmoon',
    'Harvestide', 'Redfall', 'Frostmarch',
    'Bleakmoon', 'Deepwinter', 'Icemoth', 'Snowthaw',
  ],
  SEASON: {
    SPRING: 'spring',
    SUMMER: 'summer',
    AUTUMN: 'autumn',
    WINTER: 'winter',
  },

  // ── Trees ─────────────────────────────────────────────────────────────────
  // 30-day full growth, 4 stages (1→5). 30 days × 5 ticks/day ÷ 4 stages = ~38 ticks/stage.
  TREE_TICKS_PER_STAGE: 38,
  TREE_SPAWN_CHANCE: 0.35, // fraction of FOREST/JUNGLE tiles that get a tree entity

  // ── Hunger ───────────────────────────────────────────────────────────────
  HUNGER_MAX: 60,
  HUNGER_RATE: 2.0,          // hunger gained per tick (1 time period)
  HUNGER_FOOD_RESTORE: 15,   // hunger removed per food unit consumed
  HUNGER_DEATH_TICKS: 50,    // ticks at max hunger before starvation death (~10 days)
  HUNGER_EAT_THRESHOLD: 25,  // unit seeks food when hunger exceeds this
};

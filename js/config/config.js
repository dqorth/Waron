const CONFIG = {
  CANVAS_W: 1280,
  CANVAS_H: 720,

  MAP_SEED: Date.now(),

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
    WATER: 0, GRASS: 1, FOREST: 2, MOUNTAIN: 3, STONE: 4,
    DESERT: 5, SNOW: 6, RUINS: 7, WETLAND: 8, JUNGLE: 9,
    SAVANNA: 10, TUNDRA: 11,
  },

  RESOURCE: { WOOD: 'wood', FOOD: 'food', METAL: 'metal', STONE: 'stone' },

  TILE_YIELD: {
    1: { food: 3 },          // Grass
    2: {},                    // Forest: wood from tree entities only
    3: { metal: 4 },         // Mountain
    4: { stone: 4 },         // Stone
    5: { food: 1 },          // Desert
    6: { stone: 2 },         // Snow
    7: { metal: 2, stone: 2 }, // Ruins
    8: { food: 4 },           // Wetland
    9: { food: 5 },           // Jungle
    10: { food: 2 },          // Savanna
    11: { stone: 3, metal: 1 }, // Tundra
  },

  TILE_RESOURCE_MAX: 200,
  TILE_RESOURCE_REGEN: 0.15,

  FOOD_SPOIL_RATE: 0.0025,
  FOOD_STORAGE_BASE: 100,
  FOOD_STORAGE_PER_FARM: 200,

  STORAGE_BASE_CAP: 200,
  STORAGE_PER_STOREHOUSE: 600,

  // ── Entity Types ─────────────────────────────────────────────────────
  ENTITY: {
    CAPITOL: 'capitol', FORT: 'fort', BARRACKS: 'barracks', FARM: 'farm',
    TOWER: 'tower', HOME: 'home', STOREHOUSE: 'storehouse', WALL: 'wall',
    WARRIOR: 'warrior', WORKER: 'worker', SCOUT: 'scout', LEADER: 'leader',
    NORMAL: 'normal', TREE: 'tree',
    // Wildlife
    DEER: 'deer', BOAR: 'boar', FISH: 'fish',
  },

  // ── Building Stats ───────────────────────────────────────────────────
  BUILDING_HP: {
    capitol: 1500, fort: 800, barracks: 450, farm: 350,
    tower: 200, home: 180, storehouse: 400, wall: 800,
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
    capitol: 3, fort: 3, barracks: 3, farm: 3,
    tower: 3, home: 3, storehouse: 3, wall: 2,
  },

  BUILDING_UPGRADE_MULT: 1.5,

  // ── Unit Stats ───────────────────────────────────────────────────────
  UNIT_HP: { warrior: 15, worker: 8, scout: 6, leader: 30, normal: 7 },

  UNIT_STATS_BASE: {
    warrior: { strength: 8.0, loyalty: 7.2, agility: 6.2, tenacity: 8.0, endurance: 8.5, defense: 6.8 },
    scout:   { strength: 5.8, loyalty: 6.4, agility: 9.1, tenacity: 5.5, endurance: 5.2, defense: 4.2 },
    worker:  { strength: 6.5, loyalty: 7.8, agility: 5.1, tenacity: 6.6, endurance: 6.4, defense: 4.8 },
    leader:  { strength: 9.0, loyalty: 9.4, agility: 6.8, tenacity: 9.3, endurance: 10.0, defense: 8.0 },
    normal:  { strength: 3.0, loyalty: 6.8, agility: 4.9, tenacity: 4.4, endurance: 5.4, defense: 3.7 },
  },
  UNIT_STATS_VARIANCE: 0.9,

  TOWER_RANGE: 3,
  TOWER_DAMAGE: 2.0,

  // ── Army & Logistics ─────────────────────────────────────────────────
  ARMY_MIN_SIZE: 3,            // minimum warriors to launch an attack
  ARMY_MAX_SIZE: 50,           // cap per army group
  ARMY_SUPPLY_PER_TILE: 0.25,  // food per unit per tile of march distance
  ARMY_SUPPLY_BUFFER: 1.3,     // multiply estimated supply by this (safety margin)
  ARMY_RETREAT_HUNGER: 45,     // average hunger threshold that triggers army retreat

  // ── Weather ──────────────────────────────────────────────────────────
  WEATHER: {
    SUNSHINE: 'sunshine', OVERCAST: 'overcast', RAIN: 'rain', STORM: 'storm',
    SNOW: 'snow', DROUGHT: 'drought', FLOOD: 'flood',
  },
  WEATHER_DURATION_MIN: 80,
  WEATHER_DURATION_MAX: 280,

  // ── Calendar ─────────────────────────────────────────────────────────
  TICKS_PER_DAY: 5,
  DAYS_PER_MONTH: 27,
  MONTHS_PER_YEAR: 13,
  DAYS_PER_YEAR: 351,
  TIME_PERIOD_NAMES: ['Dawn', 'Morning', 'Day', 'Dusk', 'Night'],
  MONTH_NAMES: [
    'Ashveil', 'Blossomtide', 'Planting', 'Verdant', 'Highsun', 'Burnmoon',
    'Harvestide', 'Redfall', 'Frostmarch', 'Bleakmoon', 'Deepwinter', 'Icemoth', 'Snowthaw',
  ],
  SEASON: { SPRING: 'spring', SUMMER: 'summer', AUTUMN: 'autumn', WINTER: 'winter' },

  // ── Trees ────────────────────────────────────────────────────────────
  TREE_TICKS_PER_STAGE: 38,
  TREE_SPAWN_CHANCE: 0.35,

  // ── Hunger ───────────────────────────────────────────────────────────
  HUNGER_MAX: 60,
  HUNGER_RATE: 2.0,
  HUNGER_FOOD_RESTORE: 15,
  HUNGER_DEATH_TICKS: 50,
  HUNGER_EAT_THRESHOLD: 25,

  // ── Personal Food Carry ──────────────────────────────────────────────
  FOOD_CARRY_BASE_DAYS: 3,
  FOOD_CARRY_PER_AGE_DAYS: 1,
  FOOD_CARRY_REFILL_RANGE: 2,
  FOOD_CARRY_EAT_INTERVAL: 5,

  // ── Wildlife / Huntable Animals ──────────────────────────────────────
  ANIMAL: {
    // Spawn density: fraction of eligible tiles that get an animal
    SPAWN_CHANCE: 0.08,
    // Which biomes spawn which animals
    BIOME_ANIMALS: {
      1:  'deer',    // Grass → deer
      2:  'boar',    // Forest → boar
      8:  'fish',    // Wetland → fish
      9:  'boar',    // Jungle → boar
      10: 'deer',    // Savanna → deer
    },
    // Food yield when hunted
    FOOD_YIELD: { deer: 4, boar: 6, fish: 3 },
    // HP (how hard to hunt — units attack them)
    HP: { deer: 3, boar: 8, fish: 1 },
    // Respawn time in ticks after hunted
    RESPAWN_TICKS: 150,
    // Maximum animals on the map at once
    MAX_POPULATION: 200,
    // Movement: animals wander randomly every N ticks
    WANDER_INTERVAL: 8,
    WANDER_RANGE: 2,
    // Flee range: animals flee from units within this distance
    FLEE_RANGE: 3,
  },

  // ── Fog of War ───────────────────────────────────────────────────────
  FOG: {
    UPDATE_INTERVAL: 5,     // ticks between recalculation
    // Sight ranges by entity type (overridable by FOG.SIGHT in fog.js)
    SIGHT_CAPITOL: 8,
    SIGHT_FORT: 6,
    SIGHT_TOWER: 7,
    SIGHT_BARRACKS: 4,
    SIGHT_FARM: 3,
    SIGHT_HOME: 3,
    SIGHT_STOREHOUSE: 3,
    SIGHT_WALL: 2,
    SIGHT_WARRIOR: 3,
    SIGHT_WORKER: 3,
    SIGHT_SCOUT: 6,
    SIGHT_LEADER: 5,
    SIGHT_NORMAL: 2,
    // Render opacity
    UNEXPLORED_ALPHA: 0.85,
    EXPLORED_ALPHA: 0.40,
  },

  // ── Diplomacy ────────────────────────────────────────────────────────
  DIPLOMACY: {
    START_SCORE: -40,       // relation score after fracture
    EQUILIBRIUM: -30,       // resting hostility
    DECAY_RATE: 0.05,       // drift per tick toward equilibrium
    ATTACK_SHIFT: -3,       // per attack launched
    CASUALTY_SHIFT: -1,     // per unit killed
    DESTROY_SHIFT: -8,      // per building destroyed
    TREATY_BOOST: 15,       // from peace treaty
    TREATY_DURATION: 200,   // ticks a treaty lasts
    // Attack probability by state
    ATTACK_PROB: {
      hostile: 1.0,
      wary: 0.70,
      neutral: 0.35,
      cordial: 0.08,
      allied: 0.0,
    },
  },

  // ── Terrain Rendering Thresholds ─────────────────────────────────────
  RENDER: {
    DEPTH_FACES_MIN_ZOOM: 0.30,     // zoom above which depth faces render
    GRID_LINES_MIN_ZOOM: 0.50,      // zoom above which grid lines render
    TREE_DETAIL_MIN_ZOOM: 0.35,     // zoom above which tree sprites render
    RESOURCE_ICON_MIN_ZOOM: 0.65,   // zoom above which resource icons render
    BIOME_DETAIL_MIN_ZOOM: 0.40,    // zoom above which biome details render (snow dots, wetland arcs)
    NORMAL_UNIT_MIN_ZOOM: 0.35,     // zoom above which civilian units render
    BUILDING_DETAIL_MIN_ZOOM: 0.45, // zoom above which building fine detail renders
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// WARON — Developer Configuration
// ══════════════════════════════════════════════════════════════════════════════
// Tweak these values to prototype gameplay changes without touching core files.
// Loaded before all other scripts in index.html.
// ══════════════════════════════════════════════════════════════════════════════

const DEV = {

  // ── Tribe Setup ──────────────────────────────────────────────────────────
  // 1 = single tribe that fractures into two (narrative start)
  // 2 = classic two-tribe start (original behavior)
  STARTING_TRIBES: 1,

  TRIBES: [
    { id: 'a', name: 'Ashan',  color: '#c8502a', startX: null, startY: null },
    { id: 'b', name: 'Koru',   color: '#2a6ec8', startX: null, startY: null },
  ],

  // ── Fracture Event ─────────────────────────────────────────────────────
  FRACTURE: {
    enabled: true,
    tickMin: 120,
    tickMax: 250,
    splitRatio: 0.42,
    cause: 'random',   // 'random', 'succession', 'religious', 'territorial', 'famine', 'betrayal'
    causes: {
      succession:  { title: 'SUCCESSION CRISIS',   announcement: 'The elder has died without naming an heir. Two claimants rise — the tribe splits.', logMessages: ['Families choose sides. Blood bonds fracture.', 'Half the warriors march east under the usurper\'s banner.', 'The old ways are broken. Two peoples emerge from one.'] },
      religious:   { title: 'RELIGIOUS SCHISM',     announcement: 'A prophet declares the old gods false. Believers and heretics can no longer share a fire.', logMessages: ['Temples are desecrated. Sacred ground is divided.', 'Priests of the old faith curse the departing.', 'Two truths. Two peoples. One hatred.'] },
      territorial: { title: 'TERRITORIAL DISPUTE',  announcement: 'The eastern clans refuse to send tribute. They declare independence and fortify their borders.', logMessages: ['Trade routes are severed overnight.', 'Border stones are planted with defiant totems.', 'What was one land is now two — divided by pride.'] },
      famine:      { title: 'FAMINE REVOLT',        announcement: 'The harvest failed. The starving eastern villages seize the granaries and break away.', logMessages: ['Hungry mouths breed desperate measures.', 'The capitol hoards grain while the edges starve — until they don\'t.', 'Survival splits the tribe more cleanly than any blade.'] },
      betrayal:    { title: 'THE BETRAYAL',          announcement: 'The war-chief turns against the elder council. Loyalists and rebels draw steel.', logMessages: ['Oaths are broken in blood.', 'The war-chief takes the barracks. The council holds the capitol.', 'Trust dies. Two armies are born.'] },
    },
  },

  // ── Resource Multipliers ──────────────────────────────────────────────
  STARTING_RESOURCE_MULT: 1.0,
  FOOD_PRODUCTION_MULT:   1.0,
  PASSIVE_RESOURCE_MULT:  1.0,
  HUNGER_RATE_MULT:       1.0,

  // ── Population ────────────────────────────────────────────────────────
  STARTING_POP_MULT:      1.0,
  GROWTH_RATE_MULT:       1.0,
  MAX_POP_MULT:           1.0,

  // ── Military & Armies ─────────────────────────────────────────────────
  ATTACK_RATE_MULT:       1.0,    // army launch frequency
  UNIT_DAMAGE_MULT:       1.0,
  SPAWN_RATE_MULT:        1.0,
  ARMY_SUPPLY_MULT:       1.0,    // multiplies army supply requirements (lower = easier logistics)
  ARMY_MIN_SIZE:          null,   // null = use CONFIG value
  ARMY_MAX_SIZE:          null,

  // ── Economy ───────────────────────────────────────────────────────────
  BUILD_SPEED_MULT:       1.0,
  TECH_SPEED_MULT:        1.0,
  UPGRADE_SPEED_MULT:     1.0,

  // ── Player ────────────────────────────────────────────────────────────
  STARTING_ESSENCE:       150,
  ESSENCE_GAIN_MULT:      1.0,
  SUSPICION_MULT:         1.0,
  COOLDOWN_MULT:          1.0,

  // ── Fog of War ────────────────────────────────────────────────────────
  FOG_ENABLED:            true,
  FOG_UPDATE_INTERVAL:    5,      // ticks between fog recalculation
  FOG_SIGHT_MULT:         1.0,    // multiplies all sight ranges
  FOG_UNEXPLORED_ALPHA:   0.85,   // darkness for never-seen tiles
  FOG_EXPLORED_ALPHA:     0.40,   // dimness for seen-but-not-visible tiles

  // ── Diplomacy ─────────────────────────────────────────────────────────
  DIPLOMACY_ENABLED:      true,
  DIPLOMACY_START_SCORE:  -40,    // relation score after fracture
  DIPLOMACY_DECAY_RATE:   0.05,   // drift per tick toward equilibrium
  DIPLOMACY_EQUILIBRIUM:  -30,    // resting hostility score
  DIPLOMACY_ATTACK_SHIFT: -3,     // score shift per attack launched
  DIPLOMACY_DESTROY_SHIFT:-8,     // score shift per building destroyed
  DIPLOMACY_TREATY_BOOST: 15,     // score boost from treaty

  // ── Wildlife ──────────────────────────────────────────────────────────
  ANIMALS_ENABLED:        true,
  ANIMAL_SPAWN_MULT:      1.0,    // multiplies spawn density
  ANIMAL_FOOD_MULT:       1.0,    // multiplies food gained from hunting

  // ── Terrain Rendering ─────────────────────────────────────────────────
  TERRAIN_DETAIL_LEVEL:   2,      // 0=minimal, 1=low, 2=balanced, 3=full detail
  TERRAIN_DEPTH_FACES:    true,   // render 3D depth on hex tiles
  TERRAIN_GRID_LINES:     true,   // render hex grid outlines

  // ── Time ──────────────────────────────────────────────────────────────
  TICK_MS_OVERRIDE:       null,
  DEFAULT_SPEED:          1,

  // ── Debug ─────────────────────────────────────────────────────────────
  DEBUG_LOG:              false,
  DEBUG_SHOW_FPS:         false,
  INVINCIBLE_TRIBES:      false,
  INSTANT_BUILD:          false,
  NO_HUNGER:              false,
  NO_SUSPICION:           false,
  REVEAL_MAP:             false,  // disables fog of war
};

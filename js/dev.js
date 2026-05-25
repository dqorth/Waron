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
  // 3+ = experimental multi-faction (future)
  STARTING_TRIBES: 1,

  // Tribe definitions — id, name, color, start position (null = auto-place)
  TRIBES: [
    { id: 'a', name: 'Ashan',  color: '#c8502a', startX: null, startY: null },
    { id: 'b', name: 'Koru',   color: '#2a6ec8', startX: null, startY: null },
  ],

  // ── Fracture Event (when STARTING_TRIBES = 1) ──────────────────────────
  FRACTURE: {
    enabled: true,

    // Tick window when fracture can trigger (randomized within range)
    tickMin: 120,
    tickMax: 250,

    // What fraction of population/resources/buildings goes to the splinter tribe
    splitRatio: 0.42,

    // Cause selection: 'random' picks from the list below, or force a specific one
    cause: 'random',

    // Available fracture narratives
    causes: {
      succession: {
        title: 'SUCCESSION CRISIS',
        announcement: 'The elder has died without naming an heir. Two claimants rise — the tribe splits.',
        logMessages: [
          'Families choose sides. Blood bonds fracture.',
          'Half the warriors march east under the usurper\'s banner.',
          'The old ways are broken. Two peoples emerge from one.',
        ],
      },
      religious: {
        title: 'RELIGIOUS SCHISM',
        announcement: 'A prophet declares the old gods false. Believers and heretics can no longer share a fire.',
        logMessages: [
          'Temples are desecrated. Sacred ground is divided.',
          'Priests of the old faith curse the departing.',
          'Two truths. Two peoples. One hatred.',
        ],
      },
      territorial: {
        title: 'TERRITORIAL DISPUTE',
        announcement: 'The eastern clans refuse to send tribute. They declare independence and fortify their borders.',
        logMessages: [
          'Trade routes are severed overnight.',
          'Border stones are planted with defiant totems.',
          'What was one land is now two — divided by pride.',
        ],
      },
      famine: {
        title: 'FAMINE REVOLT',
        announcement: 'The harvest failed. The starving eastern villages seize the granaries and break away.',
        logMessages: [
          'Hungry mouths breed desperate measures.',
          'The capitol hoards grain while the edges starve — until they don\'t.',
          'Survival splits the tribe more cleanly than any blade.',
        ],
      },
      betrayal: {
        title: 'THE BETRAYAL',
        announcement: 'The war-chief turns against the elder council. Loyalists and rebels draw steel.',
        logMessages: [
          'Oaths are broken in blood.',
          'The war-chief takes the barracks. The council holds the capitol.',
          'Trust dies. Two armies are born.',
        ],
      },
    },
  },

  // ── Resource Multipliers ──────────────────────────────────────────────────
  STARTING_RESOURCE_MULT: 1.0,    // multiplies all starting resources
  FOOD_PRODUCTION_MULT:   1.0,    // multiplies farm output
  PASSIVE_RESOURCE_MULT:  1.0,    // multiplies metal/stone passive trickle
  HUNGER_RATE_MULT:       1.0,    // multiplies hunger rate (lower = easier)

  // ── Population ────────────────────────────────────────────────────────────
  STARTING_POP_MULT:      1.0,    // multiplies starting population
  GROWTH_RATE_MULT:       1.0,    // multiplies population growth amount
  MAX_POP_MULT:           1.0,    // multiplies age-based population cap

  // ── Military ──────────────────────────────────────────────────────────────
  ATTACK_RATE_MULT:       1.0,    // lower = less frequent attacks
  UNIT_DAMAGE_MULT:       1.0,    // multiplies all combat damage
  SPAWN_RATE_MULT:        1.0,    // multiplies military spawn speed

  // ── Economy ───────────────────────────────────────────────────────────────
  BUILD_SPEED_MULT:       1.0,    // lower build timer = faster building
  TECH_SPEED_MULT:        1.0,    // multiplies knowledge gain rate
  UPGRADE_SPEED_MULT:     1.0,    // multiplies upgrade timer

  // ── Player ────────────────────────────────────────────────────────────────
  STARTING_ESSENCE:       150,    // override player starting essence
  ESSENCE_GAIN_MULT:      1.0,    // multiplies essence income
  SUSPICION_MULT:         1.0,    // multiplies suspicion gain (lower = stealthier)
  COOLDOWN_MULT:          1.0,    // multiplies action cooldowns (lower = faster)

  // ── Time ──────────────────────────────────────────────────────────────────
  TICK_MS_OVERRIDE:       null,   // null = use CONFIG.TICK_MS, or set ms per tick
  DEFAULT_SPEED:          1,      // starting game speed (1, 2, 4)

  // ── Debug Flags ───────────────────────────────────────────────────────────
  DEBUG_LOG:              false,  // log simulation events to console
  DEBUG_SHOW_FPS:         false,  // show FPS counter on screen
  INVINCIBLE_TRIBES:      false,  // tribes can't be eliminated
  INSTANT_BUILD:          false,  // buildings appear immediately
  NO_HUNGER:              false,  // disable hunger system
  NO_SUSPICION:           false,  // player suspicion never increases
  REVEAL_MAP:             false,  // all territory visible (future fog-of-war)
};

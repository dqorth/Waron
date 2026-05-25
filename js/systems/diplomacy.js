// ══════════════════════════════════════════════════════════════════════════════
// Diplomacy System
// ══════════════════════════════════════════════════════════════════════════════
// Manages relations between tribes. Relations affect attack frequency,
// trade willingness, and can be manipulated by the player.
//
// Relation score: -100 (blood feud) to +100 (devoted allies)
// States derived from score:
//   -100 to -60  HOSTILE    — attacks on sight, no trade, full aggression
//    -59 to -20  WARY       — frequent skirmishes, border tensions
//    -19 to +19  NEUTRAL    — occasional raids, cautious coexistence
//    +20 to +59  CORDIAL    — rare conflict, open to trade
//    +60 to +100 ALLIED     — no attacks, mutual defense (rare/unstable)
//
// Relations decay toward hostility over time (war is the natural state).
// Events shift relations. Player actions can accelerate shifts.
// ══════════════════════════════════════════════════════════════════════════════

const DIPLOMACY_STATES = {
  HOSTILE:  'hostile',
  WARY:    'wary',
  NEUTRAL: 'neutral',
  CORDIAL: 'cordial',
  ALLIED:  'allied',
};

/**
 * One-line summary.
 *
 * @description MANDATORY detailed explanation (2-5 sentences).
 *
 * @workflow
 * 1. Specific numbered steps
 * 2. Include conditionals and loops
 *
 * @param {Type} name - Description
 * @returns {Type} Description
 *
 * @dependencies stateManager.get(), etc.
 * @modifies What state/DOM changes
 * @triggers When/how called
 * @performance O(n) complexity notes
 */
function getDiplomacyState(score) {
  if (score <= -60) return DIPLOMACY_STATES.HOSTILE;
  if (score <= -20) return DIPLOMACY_STATES.WARY;
  if (score <= 19)  return DIPLOMACY_STATES.NEUTRAL;
  if (score <= 59)  return DIPLOMACY_STATES.CORDIAL;
  return DIPLOMACY_STATES.ALLIED;
}

class Diplomacy {
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  constructor() {
    // Relations indexed by "tribeIdA:tribeIdB" (alphabetical order)
    this._relations = {};
    this._events = [];       // recent diplomatic events for log
    this._eventCooldown = 0; // ticks until next autonomous event
  }

  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  _key(idA, idB) {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }

  // Initialize a relationship between two tribes
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  initRelation(idA, idB, startingScore = -30) {
    const key = this._key(idA, idB);
    this._relations[key] = {
      score: startingScore,
      state: getDiplomacyState(startingScore),
      lastAttackTick: 0,
      lastTradeTick: 0,
      treatyUntilTick: 0,   // if > current tick, a treaty is active
      warDeclaredTick: 0,
    };
  }

  // Get the current relation between two tribes
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  getRelation(idA, idB) {
    const key = this._key(idA, idB);
    if (!this._relations[key]) {
      this.initRelation(idA, idB);
    }
    return this._relations[key];
  }

  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  getState(idA, idB) {
    return this.getRelation(idA, idB).state;
  }

  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  getScore(idA, idB) {
    return this.getRelation(idA, idB).score;
  }

  // Shift relation score (clamped -100 to 100)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  shift(idA, idB, amount, reason = '') {
    const rel = this.getRelation(idA, idB);
    const oldState = rel.state;
    rel.score = Math.max(-100, Math.min(100, rel.score + amount));
    rel.state = getDiplomacyState(rel.score);

    if (rel.state !== oldState && reason) {
      this._events.push({
        tick: 0, // set by caller
        from: oldState,
        to: rel.state,
        reason,
        tribeA: idA,
        tribeB: idB,
      });
    }
  }

  // Record that an attack happened (worsens relations)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  recordAttack(attackerId, defenderId, currentTick) {
    const rel = this.getRelation(attackerId, defenderId);
    rel.lastAttackTick = currentTick;
    // Each attack shifts relations negative
    this.shift(attackerId, defenderId, -3, 'border attack');
  }

  // Record a kill (bigger hit to relations)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  recordCasualty(attackerId, defenderId, currentTick) {
    this.shift(attackerId, defenderId, -1);
  }

  // Record building destruction (major diplomatic incident)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  recordBuildingDestroyed(attackerId, defenderId, currentTick) {
    this.shift(attackerId, defenderId, -8, 'building destroyed');
  }

  // Propose/activate a treaty (temporary ceasefire)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  proposeTreaty(idA, idB, durationTicks, currentTick) {
    const rel = this.getRelation(idA, idB);
    rel.treatyUntilTick = currentTick + durationTicks;
    this.shift(idA, idB, 15, 'peace treaty signed');
  }

  // Check if a treaty is active
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  hasTreaty(idA, idB, currentTick) {
    const rel = this.getRelation(idA, idB);
    return rel.treatyUntilTick > currentTick;
  }

  // Should tribe A attack tribe B? (considers diplomacy)
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  shouldAttack(attackerId, defenderId, currentTick) {
    const rel = this.getRelation(attackerId, defenderId);

    // Active treaty prevents attacks
    if (rel.treatyUntilTick > currentTick) return false;

    // Base attack probability by state
    switch (rel.state) {
      case DIPLOMACY_STATES.HOSTILE:  return true;                     // always willing
      case DIPLOMACY_STATES.WARY:     return Math.random() < 0.70;     // usually
      case DIPLOMACY_STATES.NEUTRAL:  return Math.random() < 0.35;     // sometimes
      case DIPLOMACY_STATES.CORDIAL:  return Math.random() < 0.08;     // rarely
      case DIPLOMACY_STATES.ALLIED:   return false;                    // never
      default:                        return Math.random() < 0.5;
    }
  }

  // Natural drift each tick — relations decay toward hostility
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  tick(currentTick) {
    for (const key of Object.keys(this._relations)) {
      const rel = this._relations[key];

      // Drift toward slight hostility (-30 is the equilibrium)
      if (rel.score > -30) {
        rel.score = Math.max(-30, rel.score - 0.05);
      } else if (rel.score < -80) {
        // Extreme hatred slowly moderates (exhaustion)
        rel.score = Math.min(-80, rel.score + 0.02);
      }

      // Treaty expiry
      if (rel.treatyUntilTick > 0 && rel.treatyUntilTick <= currentTick) {
        rel.treatyUntilTick = 0;
        const [idA, idB] = key.split(':');
        this._events.push({
          tick: currentTick,
          from: rel.state,
          to: rel.state,
          reason: 'treaty expired',
          tribeA: idA,
          tribeB: idB,
        });
      }

      rel.state = getDiplomacyState(rel.score);
    }

    // Autonomous diplomatic events
    this._eventCooldown = Math.max(0, this._eventCooldown - 1);
  }

  // Get and clear pending events for the event log
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  drainEvents() {
    const events = this._events.splice(0);
    return events;
  }

  // Get a human-readable summary
  /**
   * One-line summary.
   *
   * @description MANDATORY detailed explanation (2-5 sentences).
   *
   * @workflow
   * 1. Specific numbered steps
   * 2. Include conditionals and loops
   *
   * @param {Type} name - Description
   * @returns {Type} Description
   *
   * @dependencies stateManager.get(), etc.
   * @modifies What state/DOM changes
   * @triggers When/how called
   * @performance O(n) complexity notes
   */
  getSummary(idA, idB) {
    const rel = this.getRelation(idA, idB);
    return {
      score: rel.score,
      state: rel.state,
      hasTreaty: rel.treatyUntilTick > 0,
      stateLabel: rel.state.charAt(0).toUpperCase() + rel.state.slice(1),
    };
  }
}

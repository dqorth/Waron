class Player {
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
    this.essence = 150;     // Starting essence so first actions are immediately available
    this.knowledge = 0;     // Unlocks age progression
    this.ageIndex = 0;      // Current player age index (separate from tribes)
    this.age = AGES[0];

    // Suspicion levels per tribe (0-1)
    this.suspicionA = 0;
    this.suspicionB = 0;

    // Essence gain rate multipliers
    this.essencePerBattle = 20;
    this.essencePerYear = 4;

    // Cooldowns per action id (ticks remaining)
    this.cooldowns = {};

    // Stats
    this.totalEssence = 0;
    this.actionsUsed = 0;
    this.yearsKept = 0;
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
  tick(tribeA, tribeB, year) {
    // Passive essence from ongoing war activity
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
    const battleActivity = (tribeA.casualties + tribeB.casualties) * 0.01;
    const essenceGain = this.essencePerYear + battleActivity * this.essencePerBattle;
    this.essence += essenceGain;
    this.totalEssence += essenceGain;

    // Passive knowledge gain (slower than tribes)
    this.knowledge += 0.3 + this.ageIndex * 0.1;

    // Suspicion natural decay
    this.suspicionA = Math.max(0, this.suspicionA - CONFIG.SUSPICION_DECAY);
    this.suspicionB = Math.max(0, this.suspicionB - CONFIG.SUSPICION_DECAY);

    // Sync tribe suspicion
    tribeA.suspicion = this.suspicionA;
    tribeB.suspicion = this.suspicionB;

    // Cooldown ticks
    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - 1);
      if (this.cooldowns[key] <= 0) delete this.cooldowns[key];
    }

    this.yearsKept = year;

    // Check age advancement
    this._checkAgeUp();
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
  _checkAgeUp() {
    const next = getNextAge(this.age.id);
    if (!next) return;
    if (this.essence >= next.essenceThreshold && this.knowledge >= next.knowledgeThreshold) {
      this.ageIndex = getAgeIndex(next.id);
      this.age = next;
      Game.eventLog(`You advance to the ${next.name}! New influence actions unlocked.`, 'age');
      Game.notify(`AGE ADVANCED: ${next.name.toUpperCase()}`, 'good');
    }
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
  canAfford(cost) {
    return this.essence >= cost;
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
  spendEssence(amount) {
    this.essence = Math.max(0, this.essence - amount);
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
  addSuspicion(tribeId, amount) {
    if (tribeId === 'a') {
      this.suspicionA = Math.min(1, this.suspicionA + amount);
    } else {
      this.suspicionB = Math.min(1, this.suspicionB + amount);
    }
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
  isOnCooldown(actionId) {
    return (this.cooldowns[actionId] || 0) > 0;
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
  setCooldown(actionId, ticks) {
    this.cooldowns[actionId] = ticks;
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
  hasAction(actionId) {
    return this.age.actions.includes(actionId);
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
  getSuspicion(tribeId) {
    return tribeId === 'a' ? this.suspicionA : this.suspicionB;
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
  getAgeProgressFraction() {
    const next = getNextAge(this.age.id);
    if (!next) return 1;
    const eProgress = Math.min(1, this.essence / next.essenceThreshold);
    const kProgress = Math.min(1, this.knowledge / next.knowledgeThreshold);
    return (eProgress + kProgress) / 2;
  }
}

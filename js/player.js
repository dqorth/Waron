class Player {
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

  tick(tribeA, tribeB, year) {
    // Passive essence from ongoing war activity
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

  canAfford(cost) {
    return this.essence >= cost;
  }

  spendEssence(amount) {
    this.essence = Math.max(0, this.essence - amount);
  }

  addSuspicion(tribeId, amount) {
    if (tribeId === 'a') {
      this.suspicionA = Math.min(1, this.suspicionA + amount);
    } else {
      this.suspicionB = Math.min(1, this.suspicionB + amount);
    }
  }

  isOnCooldown(actionId) {
    return (this.cooldowns[actionId] || 0) > 0;
  }

  setCooldown(actionId, ticks) {
    this.cooldowns[actionId] = ticks;
  }

  hasAction(actionId) {
    return this.age.actions.includes(actionId);
  }

  getSuspicion(tribeId) {
    return tribeId === 'a' ? this.suspicionA : this.suspicionB;
  }

  getAgeProgressFraction() {
    const next = getNextAge(this.age.id);
    if (!next) return 1;
    const eProgress = Math.min(1, this.essence / next.essenceThreshold);
    const kProgress = Math.min(1, this.knowledge / next.knowledgeThreshold);
    return (eProgress + kProgress) / 2;
  }
}

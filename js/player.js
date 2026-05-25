class Player {
  /**
   * Initializes a new Player instance with default game statistics and states.
   *
   * @description This constructor sets up the player's core resources like essence and knowledge, tracks their current age, and initializes suspicion levels for two tribes. It also defines essence gain rates, an empty object for action cooldowns, and various lifetime statistics such as total essence gained and actions used. This ensures the player starts with a base configuration, including enough essence for immediate actions.
   *
   * @workflow
   * 1. Initialize `essence` to 150, providing an initial resource pool.
   * 2. Initialize `knowledge` to 0.
   * 3. Set `ageIndex` to 0 and `age` to the first element in the global `AGES` array.
   * 4. Set `suspicionA` and `suspicionB` to 0.
   * 5. Define `essencePerBattle` as 20 and `essencePerYear` as 4.
   * 6. Initialize an empty object `cooldowns` for tracking action cooldowns.
   * 7. Initialize `totalEssence`, `actionsUsed`, and `yearsKept` to 0 for tracking lifetime statistics.
   *
   * @param {void}
   * @returns {Player} A new instance of the Player class.
   *
   * @dependencies AGES (global constant).
   * @modifies this.essence, this.knowledge, this.ageIndex, this.age, this.suspicionA, this.suspicionB, this.essencePerBattle, this.essencePerYear, this.cooldowns, this.totalEssence, this.actionsUsed, this.yearsKept.
   * @triggers Called when a new `Player` object is instantiated, typically at the start of a new game.
   * @performance O(1) - constant time initialization.
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
   * Advances the player's state for a single game year, processing passive gains, decays, and cooldowns.
   *
   * @description This method calculates passive essence gain based on battle activity and a base rate, and updates total essence. It also increments passive knowledge and reduces suspicion levels for both tribes due to natural decay, then synchronizes these with the tribe objects. Finally, it decrements and removes expired action cooldowns and checks for player age advancement.
   *
   * @workflow
   * 1. Calculate `battleActivity` based on `tribeA.casualties` and `tribeB.casualties`.
   * 2. Calculate `essenceGain` using `this.essencePerYear` and `battleActivity` multiplied by `this.essencePerBattle`.
   * 3. Add `essenceGain` to `this.essence` and `this.totalEssence`.
   * 4. Increment `this.knowledge` by a base amount (0.3) plus an age-based bonus (`this.ageIndex * 0.1`).
   * 5. Decrease `this.suspicionA` and `this.suspicionB` by `CONFIG.SUSPICION_DECAY`, ensuring they don't drop below 0 using `Math.max`.
   * 6. Synchronize `tribeA.suspicion` and `tribeB.suspicion` with the player's updated `this.suspicionA` and `this.suspicionB`.
   * 7. Iterate through `Object.keys(this.cooldowns)`:
   *    a. Decrement the cooldown value for each key by 1 using `Math.max(0, ...)`.
   *    b. If the cooldown reaches 0 or less, delete the entry from `this.cooldowns`.
   * 8. Update `this.yearsKept` with the current `year`.
   * 9. Call `this._checkAgeUp()` to evaluate age progression conditions.
   *
   * @param {object} tribeA - The state object for Tribe A, containing properties like `casualties` and `suspicion`.
   * @param {object} tribeB - The state object for Tribe B, containing properties like `casualties` and `suspicion`.
   * @param {number} year - The current game year.
   * @returns {void}
   *
   * @dependencies CONFIG.SUSPICION_DECAY, Object.keys(), this._checkAgeUp().
   * @modifies this.essence, this.totalEssence, this.knowledge, this.suspicionA, this.suspicionB, tribeA.suspicion, tribeB.suspicion, this.cooldowns, this.yearsKept.
   * @triggers Called once per game year by the main game loop.
   * @performance O(C) where C is the number of active cooldowns (due to loop over `this.cooldowns`). In most cases, C is relatively small, so practically O(1).
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
   * Determines if the player has met the requirements to advance to the next age.
   *
   * @description This private method attempts to retrieve the details of the next available age based on the player's current age ID. If a next age exists and the player's current essence and knowledge levels meet or exceed the thresholds defined for that age, the player's age is updated. Successful age advancement triggers game events and notifications to inform the user.
   *
   * @workflow
   * 1. Call `getNextAge(this.age.id)` to find the data for the potential next age.
   * 2. If no `next` age object is returned (meaning the player is at the highest age), exit the function.
   * 3. Check if `this.essence` is greater than or equal to `next.essenceThreshold` AND `this.knowledge` is greater than or equal to `next.knowledgeThreshold`.
   * 4. If both conditions are met:
   *    a. Update `this.ageIndex` using `getAgeIndex(next.id)`.
   *    b. Set `this.age` to the `next` age object.
   *    c. Log an age advancement event using `Game.eventLog()` with a specific message and category.
   *    d. Display a notification using `Game.notify()` to the user.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies getNextAge(), getAgeIndex(), Game.eventLog(), Game.notify().
   * @modifies this.ageIndex, this.age.
   * @triggers Called internally by `this.tick()` at the end of each game year.
   * @performance O(1) - involves a few property lookups and comparisons.
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
   * Checks if the player has enough essence to cover a specified cost.
   *
   * @description This simple utility method compares the player's current essence balance against a given numerical cost. It returns true if the player's essence is sufficient, indicating they can afford the action or item, and false otherwise. This is a primary check before attempting to spend essence on any game action.
   *
   * @workflow
   * 1. Compare the value of `this.essence` with the `cost` parameter.
   * 2. Return `true` if `this.essence` is greater than or equal to `cost`, otherwise return `false`.
   *
   * @param {number} cost - The amount of essence required.
   * @returns {boolean} `true` if the player has enough essence, `false` otherwise.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by UI components or game logic before attempting to execute an action that requires essence.
   * @performance O(1) - a single comparison.
   */
  canAfford(cost) {
    return this.essence >= cost;
  }

  /**
   * Decreases the player's essence by a specified amount.
   *
   * @description This method reduces the player's current essence by the given amount. It ensures that the essence level does not drop below zero, preventing negative essence values, by using `Math.max`. This is typically called after `canAfford` has confirmed sufficient essence, as it doesn't perform an affordability check itself.
   *
   * @workflow
   * 1. Subtract the `amount` from `this.essence`.
   * 2. Update `this.essence` to be the maximum of 0 or the calculated new essence value, preventing negative essence.
   *
   * @param {number} amount - The amount of essence to deduct.
   * @returns {void}
   *
   * @dependencies None.
   * @modifies this.essence.
   * @triggers Called by game logic when an action requiring essence is successfully performed.
   * @performance O(1) - a single subtraction and `Math.max` operation.
   */
  spendEssence(amount) {
    this.essence = Math.max(0, this.essence - amount);
  }

  /**
   * Increases the suspicion level for a specific tribe.
   *
   * @description This method adds a given `amount` to the suspicion level of either Tribe A or Tribe B, identified by `tribeId`. The suspicion level is clamped at a maximum value of 1 using `Math.min`, ensuring it remains within a valid range (0-1). This prevents suspicion from exceeding its defined upper limit.
   *
   * @workflow
   * 1. Check if the `tribeId` parameter is exactly 'a'.
   * 2. If `tribeId` is 'a', add `amount` to `this.suspicionA` and clamp the result to a maximum of 1.
   * 3. Else (if `tribeId` is 'b' or any other value), add `amount` to `this.suspicionB` and clamp the result to a maximum of 1.
   *
   * @param {string} tribeId - The identifier for the tribe ('a' or 'b').
   * @param {number} amount - The amount of suspicion to add (positive value).
   * @returns {void}
   *
   * @dependencies None.
   * @modifies this.suspicionA or this.suspicionB.
   * @triggers Called by game logic when the player performs an action that increases suspicion with a particular tribe.
   * @performance O(1) - an if-else condition, addition, and `Math.min` operation.
   */
  addSuspicion(tribeId, amount) {
    if (tribeId === 'a') {
      this.suspicionA = Math.min(1, this.suspicionA + amount);
    } else {
      this.suspicionB = Math.min(1, this.suspicionB + amount);
    }
  }

  /**
   * Checks if a specific action is currently on cooldown.
   *
   * @description This method determines whether a given action, identified by its `actionId`, has any remaining cooldown ticks. It returns `true` if the action is on cooldown (meaning its cooldown value is greater than 0) and `false` otherwise. This is crucial for controlling action availability and preventing spamming.
   *
   * @workflow
   * 1. Access the value associated with `actionId` in the `this.cooldowns` object, defaulting to 0 if the action is not found or has no cooldown set.
   * 2. Check if this value is greater than 0.
   * 3. Return `true` if the value is greater than 0, indicating an active cooldown; otherwise, return `false`.
   *
   * @param {string} actionId - The unique identifier of the action to check.
   * @returns {boolean} `true` if the action is on cooldown, `false` otherwise.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by UI components or game logic before displaying or executing an action that might have a cooldown.
   * @performance O(1) - a single object property lookup and comparison.
   */
  isOnCooldown(actionId) {
    return (this.cooldowns[actionId] || 0) > 0;
  }

  /**
   * Sets or resets the cooldown for a specific action.
   *
   * @description This method assigns a new cooldown duration, specified in `ticks`, to an action identified by its `actionId`. This effectively puts the action on cooldown, preventing its immediate reuse until the specified number of game ticks have passed. A value of 0 or less effectively removes it from cooldown immediately.
   *
   * @workflow
   * 1. Assign the provided `ticks` value to the property corresponding to `actionId` within the `this.cooldowns` object.
   *
   * @param {string} actionId - The unique identifier of the action.
   * @param {number} ticks - The number of game ticks the action should be on cooldown.
   * @returns {void}
   *
   * @dependencies None.
   * @modifies this.cooldowns.
   * @triggers Called by game logic when an action that has a cooldown is performed.
   * @performance O(1) - a single object property assignment.
   */
  setCooldown(actionId, ticks) {
    this.cooldowns[actionId] = ticks;
  }

  /**
   * Checks if the player's current age unlocks a specific action.
   *
   * @description This method verifies whether a given `actionId` is included in the list of actions available to the player at their current `age`. It's used to determine if an action can be performed based on the player's progression and unlocked capabilities. This is vital for dynamically enabling or disabling UI elements.
   *
   * @workflow
   * 1. Access the `actions` array nested within the `this.age` object (e.g., `this.age.actions`).
   * 2. Call the `includes(actionId)` method on that array to check for the presence of the `actionId`.
   * 3. Return the boolean result indicating whether the action is found.
   *
   * @param {string} actionId - The unique identifier of the action to check.
   * @returns {boolean} `true` if the action is available at the current age, `false` otherwise.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by UI components or game logic to determine action availability based on age progression.
   * @performance O(N) where N is the number of actions in `this.age.actions`, due to `Array.prototype.includes()`. N is expected to be small in this context, making it practically O(1).
   */
  hasAction(actionId) {
    return this.age.actions.includes(actionId);
  }

  /**
   * Retrieves the current suspicion level for a specified tribe.
   *
   * @description This method provides access to the player's current suspicion level with either Tribe A or Tribe B, based on the `tribeId` provided. It returns a numerical value representing the suspicion, which typically ranges between 0 and 1. This is useful for displaying tribe relations or influencing game logic based on player actions.
   *
   * @workflow
   * 1. Check if the `tribeId` parameter is exactly 'a'.
   * 2. If `tribeId` is 'a', return the value of `this.suspicionA`.
   * 3. Else (if `tribeId` is 'b' or any other value), return the value of `this.suspicionB`.
   *
   * @param {string} tribeId - The identifier for the tribe ('a' or 'b').
   * @returns {number} The current suspicion level for the specified tribe.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by UI components or game logic to display or use tribe suspicion levels.
   * @performance O(1) - a single conditional check and property access.
   */
  getSuspicion(tribeId) {
    return tribeId === 'a' ? this.suspicionA : this.suspicionB;
  }

  /**
   * Calculates the player's progress towards the next age as a fraction (0-1).
   *
   * @description This method determines how far the player has progressed towards unlocking the next age. It first retrieves the requirements for the next age. It then calculates the individual progress for both essence and knowledge thresholds, clamping each at a maximum of 1. Finally, it returns the average of these two progress values, providing a combined fractional representation of age advancement.
   *
   * @workflow
   * 1. Call `getNextAge(this.age.id)` to retrieve information about the requirements for the potential next age.
   * 2. If no `next` age exists (meaning the player is currently at the maximum age), return 1 to indicate full progress.
   * 3. Calculate `eProgress` by dividing `this.essence` by `next.essenceThreshold`, then clamping the result at a maximum of 1 using `Math.min`.
   * 4. Calculate `kProgress` by dividing `this.knowledge` by `next.knowledgeThreshold`, then clamping the result at a maximum of 1 using `Math.min`.
   * 5. Return the average of `eProgress` and `kProgress` (i.e., `(eProgress + kProgress) / 2`).
   *
   * @param {void}
   * @returns {number} A fraction between 0 and 1 representing the progress towards the next age. Returns 1 if at the maximum age.
   *
   * @dependencies getNextAge().
   * @modifies None.
   * @triggers Called by UI components to display age progress to the player.
   * @performance O(1) - a few calculations and comparisons.
   */
  getAgeProgressFraction() {
    const next = getNextAge(this.age.id);
    if (!next) return 1;
    const eProgress = Math.min(1, this.essence / next.essenceThreshold);
    const kProgress = Math.min(1, this.knowledge / next.knowledgeThreshold);
    return (eProgress + kProgress) / 2;
  }
}

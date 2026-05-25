class UI {
  /**
   * Initializes the UI class, setting up internal state and binding essential event listeners.
   *
   * @description This constructor sets up the initial state for user interactions, specifically for selecting actions and targets. It also creates vital DOM elements like the notification container and tooltip, appending them to the game container. Finally, it binds event listeners to critical UI components such as speed control buttons, game start/restart buttons, and modal action buttons, ensuring the UI is interactive from the beginning.
   *
   * @workflow
   * 1. Initializes `_selectedAction` and `_selectedTarget` to `null`.
   * 2. Calls `_createNotifContainer()` to create and store a reference to the notification container in `_notifContainer`.
   * 3. Calls `_createTooltip()` to create and store a reference to the tooltip element in `_tooltip`.
   * 4. Calls `_bindSpeedButtons()` to attach click listeners to speed control buttons.
   * 5. Calls `_bindStartButton()` to attach click listeners to game start and restart buttons.
   * 6. Calls `_bindModalButtons()` to attach click listeners to action modal interaction buttons.
   *
   * @returns {void} The constructor implicitly returns the `UI` instance.
   *
   * @dependencies document.createElement(), document.getElementById(), _createNotifContainer(), _createTooltip(), _bindSpeedButtons(), _bindStartButton(), _bindModalButtons().
   * @modifies `this._selectedAction`, `this._selectedTarget`, `this._notifContainer`, `this._tooltip`. Adds notification container and tooltip `div` elements to the `game-container` in the DOM.
   * @triggers Called automatically when a new `UI` instance is created (e.g., `new UI()`).
   * @performance O(1) for direct assignments and calls, O(N) potentially for `_bindSpeedButtons` if many speed buttons exist, but practically constant for typical game setups.
   */
  constructor() {
    this._selectedAction = null;
    this._selectedTarget = null;

    this._notifContainer = this._createNotifContainer();
    this._tooltip = this._createTooltip();

    this._bindSpeedButtons();
    this._bindStartButton();
    this._bindModalButtons();
  }

  /**
   * Creates and appends the main notification container to the game UI.
   *
   * @description This private method is responsible for dynamically generating the `div` element that will house all in-game notifications. It assigns a specific ID (`notifications`) to this container for easy access and styling. The container is then appended as a child to the main `game-container` element in the document, making it part of the visible game interface.
   *
   * @workflow
   * 1. Creates a new `div` element using `document.createElement('div')`.
   * 2. Sets the `id` of the created `div` to `'notifications'`.
   * 3. Finds the `game-container` element by its ID.
   * 4. Appends the newly created notification `div` to the `game-container`.
   * 5. Returns the created `div` element.
   *
   * @returns {HTMLElement} The newly created notification container `div` element.
   *
   * @dependencies document.createElement(), document.getElementById().
   * @modifies Adds a new `div#notifications` element to the DOM inside `div#game-container`.
   * @triggers Called internally by the `UI` constructor during initialization.
   * @performance O(1) - involves direct DOM creation and appending.
   */
  _createNotifContainer() {
    const div = document.createElement('div');
    div.id = 'notifications';
    document.getElementById('game-container').appendChild(div);
    return div;
  }

  /**
   * Creates and appends the tooltip element to the game UI.
   *
   * @description This private method generates the `div` element that will function as the universal tooltip for the game interface. It assigns a unique ID (`tooltip`) to this element for styling and programmatic access. Similar to the notification container, this tooltip `div` is appended to the `game-container` element, ensuring it's available and positioned within the primary game area.
   *
   * @workflow
   * 1. Creates a new `div` element using `document.createElement('div')`.
   * 2. Sets the `id` of the created `div` to `'tooltip'`.
   * 3. Finds the `game-container` element by its ID.
   * 4. Appends the newly created tooltip `div` to the `game-container`.
   * 5. Returns the created `div` element.
   *
   * @returns {HTMLElement} The newly created tooltip `div` element.
   *
   * @dependencies document.createElement(), document.getElementById().
   * @modifies Adds a new `div#tooltip` element to the DOM inside `div#game-container`.
   * @triggers Called internally by the `UI` constructor during initialization.
   * @performance O(1) - involves direct DOM creation and appending.
   */
  _createTooltip() {
    const div = document.createElement('div');
    div.id = 'tooltip';
    document.getElementById('game-container').appendChild(div);
    return div;
  }

  /**
   * Binds click event listeners to all game speed control buttons.
   *
   * @description This private method iterates through all elements with the CSS class `speed-btn` and attaches a click event listener to each. When a speed button is clicked, it first deactivates all other speed buttons by removing their `active` class. Then, it activates the clicked button and updates the game's simulation speed by calling `Game.setSpeed()` with the speed value parsed from the button's `data-speed` attribute.
   *
   * @workflow
   * 1. Selects all elements with the class `speed-btn` using `document.querySelectorAll()`.
   * 2. Iterates over each found button.
   * 3. For each button, adds an `addEventListener` for the `click` event.
   * 4. Inside the click handler:
   *    a. Selects all `speed-btn` elements again.
   *    b. Iterates through them to remove the `active` class from all.
   *    c. Adds the `active` class to the currently clicked button.
   *    d. Parses the `data-speed` attribute of the clicked button to an integer.
   *    e. Calls `Game.setSpeed()` with the parsed speed value.
   *
   * @returns {void}
   *
   * @dependencies document.querySelectorAll(), Game.setSpeed().
   * @modifies `classList` of `.speed-btn` elements (adds/removes `active` class). Updates game speed via `Game.setSpeed()`.
   * @triggers Called internally by the `UI` constructor during initialization. Triggered by user clicks on speed buttons.
   * @performance O(N) for initial binding (where N is the number of speed buttons). O(N) for click handler (re-queries all buttons and iterates to remove `active` class). Typically, N is small, so practically constant time.
   */
  _bindSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Game.setSpeed(parseInt(btn.dataset.speed));
      });
    });
  }

  /**
   * Binds click event listeners to the start and restart buttons.
   *
   * @description This private method attaches event listeners to two critical UI elements: the "Start Game" button and the "Restart Game" button. Clicking the "Start Game" button hides the `start-screen` and initiates the game by calling `Game.start()`. Conversely, clicking the "Restart Game" button hides the `gameover-screen`, reveals the `start-screen`, and resets the game state by invoking `Game.reset()`.
   *
   * @workflow
   * 1. Finds the `btn-start` element by ID.
   * 2. Adds a `click` event listener to `btn-start`:
   *    a. Adds the `hidden` class to the `start-screen` element.
   *    b. Calls `Game.start()`.
   * 3. Finds the `btn-restart` element by ID.
   * 4. Adds a `click` event listener to `btn-restart`:
   *    a. Adds the `hidden` class to the `gameover-screen` element.
   *    b. Removes the `hidden` class from the `start-screen` element.
   *    c. Calls `Game.reset()`.
   *
   * @returns {void}
   *
   * @dependencies document.getElementById(), Game.start(), Game.reset().
   * @modifies `classList` of `start-screen` and `gameover-screen` elements. Triggers game state changes.
   * @triggers Called internally by the `UI` constructor during initialization. Triggered by user clicks on start/restart buttons.
   * @performance O(1) - involves direct DOM manipulation and function calls.
   */
  _bindStartButton() {
    document.getElementById('btn-start').addEventListener('click', () => {
      document.getElementById('start-screen').classList.add('hidden');
      Game.start();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('gameover-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      Game.reset();
    });
  }

  /**
   * Binds click event listeners to the action modal's control buttons and target selection buttons.
   *
   * @description This private method sets up interaction for the action modal. It binds a click listener to `modal-cancel` to close the modal and to `modal-confirm` to execute the selected action. Additionally, it binds listeners to `target-a` and `target-b` buttons, allowing the user to select a target tribe, visually updating their `selected` class, and updating the internal `_selectedTarget` state.
   *
   * @workflow
   * 1. Finds the `modal-cancel` button and adds a `click` listener that calls `this._closeModal()`.
   * 2. Finds the `modal-confirm` button and adds a `click` listener that calls `this._executeAction()`.
   * 3. Finds the `target-a` button and adds a `click` listener:
   *    a. Sets `this._selectedTarget` to `'a'`.
   *    b. Adds the `selected` class to `target-a`.
   *    c. Removes the `selected` class from `target-b`.
   * 4. Finds the `target-b` button and adds a `click` listener:
   *    a. Sets `this._selectedTarget` to `'b'`.
   *    b. Adds the `selected` class to `target-b`.
   *    c. Removes the `selected` class from `target-a`.
   *
   * @returns {void}
   *
   * @dependencies document.getElementById(), this._closeModal(), this._executeAction().
   * @modifies `this._selectedTarget`. `classList` of `target-a` and `target-b` elements (adds/removes `selected` class).
   * @triggers Called internally by the `UI` constructor during initialization. Triggered by user clicks on modal control buttons and target selection buttons.
   * @performance O(1) - involves direct DOM manipulation and function calls.
   */
  _bindModalButtons() {
    document.getElementById('modal-cancel').addEventListener('click', () => {
      this._closeModal();
    });

    document.getElementById('modal-confirm').addEventListener('click', () => {
      this._executeAction();
    });

    document.getElementById('target-a').addEventListener('click', () => {
      this._selectedTarget = 'a';
      document.getElementById('target-a').classList.add('selected');
      document.getElementById('target-b').classList.remove('selected');
    });

    document.getElementById('target-b').addEventListener('click', () => {
      this._selectedTarget = 'b';
      document.getElementById('target-b').classList.add('selected');
      document.getElementById('target-a').classList.remove('selected');
    });
  }

  /**
   * Executes the currently selected action, applying its effects to the game state and tribes.
   *
   * @description This private method attempts to execute the action stored in `_selectedAction`. It first validates if an action is selected, if the player can afford it, and if a target is chosen when required. If all conditions are met, it calls the action's `execute` method on the player and appropriate tribe(s), deducts essence, sets a cooldown, and updates the player's action count. Finally, it updates the world territory, closes the modal, and refreshes the actions list.
   *
   * @workflow
   * 1. Checks if `this._selectedAction` is `null`; if so, returns immediately.
   * 2. Retrieves `action` from `this._selectedAction`, `player` from `Game.player`, `tribeA` from `Game.tribeA`, and `tribeB` from `Game.tribeB`.
   * 3. **Conditional**: If `player.canAfford(action.cost)` is `false`, calls `this.notify('Not enough Essence.', 'warn')` and returns.
   * 4. **Conditional**: If `action.requiresTarget` is `true` AND `this._selectedTarget` is `null`, calls `this.notify('Select a target tribe first.', 'warn')` and returns.
   * 5. **Conditional**: If `action.requiresTarget` is `true`:
   *    a. Determines the target `tribe` based on `this._selectedTarget`.
   *    b. Calls `action.execute(player, tribe)`.
   *    c. Calls `player.addSuspicion(this._selectedTarget, action.suspicion)`.
   * 6. **Else (if action does not require a target)**:
   *    a. Calls `action.execute(player, tribeA, tribeB)`.
   *    b. Calls `player.addSuspicion('a', action.suspicion * 0.5)`.
   *    c. Calls `player.addSuspicion('b', action.suspicion * 0.5)`.
   * 7. Calls `player.spendEssence(action.cost)`.
   * 8. Calls `player.setCooldown(action.id, action.cooldownTicks)`.
   * 9. Increments `player.actionsUsed`.
   * 10. Calls `Game.world.updateTerritory(tribeA, tribeB)`.
   * 11. Calls `this._closeModal()`.
   * 12. Calls `this.updateActionsList(player)`.
   *
   * @returns {void}
   *
   * @dependencies Game.player, Game.tribeA, Game.tribeB, Game.world, player.canAfford(), this.notify(), action.execute(), player.addSuspicion(), player.spendEssence(), player.setCooldown(), Game.world.updateTerritory(), this._closeModal(), this.updateActionsList().
   * @modifies `player.essence`, `player.suspicionA`, `player.suspicionB`, `player.cooldowns`, `player.actionsUsed`. Game world territory. Calls `_closeModal()` which modifies modal visibility and `_selectedAction`/`_selectedTarget`. Calls `updateActionsList()` which modifies the actions list DOM.
   * @triggers Called internally by the `click` event listener on `modal-confirm` button, bound in `_bindModalButtons()`.
   * @performance O(1) - involves a fixed number of checks, method calls, and arithmetic operations, assuming `action.execute` and related game methods are efficient.
   */
  _executeAction() {
    if (!this._selectedAction) return;

    const action = this._selectedAction;
    const player = Game.player;
    const tribeA = Game.tribeA;
    const tribeB = Game.tribeB;

    if (!player.canAfford(action.cost)) {
      this.notify('Not enough Essence.', 'warn');
      return;
    }

    if (action.requiresTarget && !this._selectedTarget) {
      this.notify('Select a target tribe first.', 'warn');
      return;
    }

    // Execute
    if (action.requiresTarget) {
      const tribe = this._selectedTarget === 'a' ? tribeA : tribeB;
      action.execute(player, tribe);
      player.addSuspicion(this._selectedTarget, action.suspicion);
    } else {
      action.execute(player, tribeA, tribeB);
      player.addSuspicion('a', action.suspicion * 0.5);
      player.addSuspicion('b', action.suspicion * 0.5);
    }

    player.spendEssence(action.cost);
    player.setCooldown(action.id, action.cooldownTicks);
    player.actionsUsed++;

    // Update territory after building changes
    Game.world.updateTerritory(tribeA, tribeB);

    this._closeModal();
    this.updateActionsList(player);
  }

  /**
   * Hides the action modal and resets its internal state.
   *
   * @description This private method is responsible for visually closing the action modal and clearing any selections made within it. It adds the `hidden` class to the `action-modal` element, making it invisible. Additionally, it removes the `selected` class from both target buttons (`target-a` and `target-b`) and resets the internal `_selectedAction` and `_selectedTarget` properties to `null`, ensuring the modal is clean for future use.
   *
   * @workflow
   * 1. Adds the `hidden` class to the `action-modal` element.
   * 2. Removes the `selected` class from the `target-a` element.
   * 3. Removes the `selected` class from the `target-b` element.
   * 4. Sets `this._selectedAction` to `null`.
   * 5. Sets `this._selectedTarget` to `null`.
   *
   * @returns {void}
   *
   * @dependencies document.getElementById().
   * @modifies `classList` of `action-modal`, `target-a`, `target-b`. `this._selectedAction`, `this._selectedTarget`.
   * @triggers Called internally by `_bindModalButtons()` (when `modal-cancel` is clicked) and `_executeAction()` (after an action is successfully executed).
   * @performance O(1) - involves direct DOM manipulation and property assignments.
   */
  _closeModal() {
    document.getElementById('action-modal').classList.add('hidden');
    document.getElementById('target-a').classList.remove('selected');
    document.getElementById('target-b').classList.remove('selected');
    this._selectedAction = null;
    this._selectedTarget = null;
  }

  /**
   * Displays the action modal with details of a specific action and configures target selection.
   *
   * @description This method takes an action object and populates the action modal with its details, such as name, description, cost, and suspicion. It updates the internal `_selectedAction` state. Crucially, it dynamically shows or hides the target selection section based on whether the action `requiresTarget`, also resetting `_selectedTarget` if targets are not needed. Finally, it removes the `hidden` class from the modal to make it visible.
   *
   * @workflow
   * 1. Sets `this._selectedAction` to the provided `action` object.
   * 2. Sets `this._selectedTarget` to `null`.
   * 3. Updates the `textContent` of `modal-title` with `action.name` (uppercased).
   * 4. Updates the `textContent` of `modal-desc` with `action.desc`.
   * 5. Updates the `textContent` of `modal-cost` with formatted cost and suspicion.
   * 6. Retrieves `modal-targets` and `modal-target-label` elements.
   * 7. **Conditional**: If `action.requiresTarget` is `true`:
   *    a. Sets `modal-targets.style.display` to `'flex'`.
   *    b. Sets `modal-target-label.style.display` to `'block'`.
   * 8. **Else (if action does not require a target)**:
   *    a. Sets `modal-targets.style.display` to `'none'`.
   *    b. Sets `modal-target-label.style.display` to `'none'`.
   *    c. Sets `this._selectedTarget` to `null`.
   * 9. Removes the `selected` class from `target-a`.
   * 10. Removes the `selected` class from `target-b`.
   * 11. Removes the `hidden` class from `action-modal` to display it.
   *
   * @param {Object} action - The action object containing `id`, `name`, `desc`, `cost`, `suspicion`, `requiresTarget`, `cooldownTicks`, and `execute` properties.
   * @returns {void}
   *
   * @dependencies document.getElementById().
   * @modifies `this._selectedAction`, `this._selectedTarget`. `textContent` of `modal-title`, `modal-desc`, `modal-cost`. `style.display` of `modal-targets` and `modal-target-label`. `classList` of `target-a`, `target-b`, and `action-modal`.
   * @triggers Called by the `click` event listener on action buttons within the `actions-list`, set up by `updateActionsList()`.
   * @performance O(1) - involves direct DOM manipulation and property assignments.
   */
  openActionModal(action) {
    this._selectedAction = action;
    this._selectedTarget = null;

    document.getElementById('modal-title').textContent = action.name.toUpperCase();
    document.getElementById('modal-desc').textContent = action.desc;
    document.getElementById('modal-cost').textContent = `Cost: ${action.cost} Essence  |  Suspicion: +${(action.suspicion*100).toFixed(0)}%`;

    const targetSection = document.getElementById('modal-targets');
    const targetLabel = document.getElementById('modal-target-label');
    if (action.requiresTarget) {
      targetSection.style.display = 'flex';
      targetLabel.style.display = 'block';
    } else {
      targetSection.style.display = 'none';
      targetLabel.style.display = 'none';
      this._selectedTarget = null;
    }

    document.getElementById('target-a').classList.remove('selected');
    document.getElementById('target-b').classList.remove('selected');
    document.getElementById('action-modal').classList.remove('hidden');
  }

  /**
   * Updates all Head-Up Display (HUD) elements with current game data.
   *
   * @description This comprehensive method refreshes various sections of the game's HUD, including the power balance bar, player statistics (age, essence, knowledge, suspicion), tribe statistics (population, military, technology, territory, resources), and the game's calendar/weather display. It handles both a modern `cal` object and a legacy `day, year` signature for the calendar. It also dynamically colors suspicion values based on their magnitude.
   *
   * @workflow
   * 1. **Conditional**: Checks if `cal` is a number (legacy signature). If so, it reconstructs a basic `cal` object from `cal` (day) and `arguments[4]` (year).
   * 2. **Balance Bar**:
   *    a. Calculates `totalPower` from `tribeA.power` and `tribeB.power`.
   *    b. Calculates `fracA` and `fracB` (fractional power for each tribe), defaulting to 0.5 if `totalPower` is 0.
   *    c. Sets `width` style for `balance-fill-a` and `balance-fill-b` based on calculated fractions.
   * 3. **Player Stats**:
   *    a. Updates `textContent` for `stat-age`, `stat-essence`, `stat-knowledge`.
   *    b. Sets `width` style for `age-progress-fill` based on `player.getAgeProgressFraction()`.
   *    c. Calculates rounded suspicion percentages (`suspA`, `suspB`).
   *    d. Updates `textContent` for `stat-susp-a` and `stat-susp-b`.
   *    e. **Conditional**: Sets `color` style for `stat-susp-a` and `stat-susp-b` based on suspicion thresholds (low, medium, high).
   * 4. **Tribe A Stats**:
   *    a. Updates `textContent` for `a-pop`, `a-mil`, `a-tech`, `a-terr`.
   *    b. Formats and updates `textContent` for `a-res` with wood, food, metal, stone.
   * 5. **Tribe B Stats**:
   *    a. Updates `textContent` for `b-pop`, `b-mil`, `b-tech`, `b-terr`.
   *    b. Formats and updates `textContent` for `b-res` with wood, food, metal, stone.
   * 6. **Time + Weather**:
   *    a. Determines `weatherType` from `Game.world.weather` or defaults to `'sunshine'`.
   *    b. Updates `textContent` for `time-display` with formatted date, season, year, and weather.
   *    c. Updates `textContent` for `age-display` with the current age name.
   *
   * @param {Player} player - The current player object, containing stats like age, essence, knowledge, and suspicion.
   * @param {Tribe} tribeA - The object representing Tribe A, containing stats like population, military, tech, and resources.
   * @param {Tribe} tribeB - The object representing Tribe B, containing stats like population, military, tech, and resources.
   * @param {object|number} cal - The calendar object containing `day`, `monthName`, `month`, `year`, `seasonName`, `timePeriodName`, or a number representing the current day (legacy).
   * @returns {void}
   *
   * @dependencies document.getElementById(), Game.world, getAgeByYear().
   * @modifies `textContent` and `style` properties of numerous HUD elements in the DOM.
   * @triggers Called repeatedly as the game state updates, typically per game tick, to reflect real-time changes to the player, tribes, and world.
   * @performance O(1) - involves a fixed number of DOM lookups and updates, string manipulations, and arithmetic operations. The number of elements updated is constant regardless of game state complexity.
   */
  updateHUD(player, tribeA, tribeB, cal) {
    // Support legacy callers that pass (player, tribeA, tribeB, day, year).
    if (typeof cal === 'number') {
      // old signature: cal=day, 5th arg=year — reconstruct a minimal cal object
      const yr = arguments[4] || 1;
      cal = { day: cal, dayInMonth: cal, month: 1, monthName: 'Ashveil', year: yr,
               season: 'spring', seasonName: 'Spring', timePeriodName: 'Day' };
    }
    // Balance bar
    const totalPower = tribeA.power + tribeB.power;
    const fracA = totalPower > 0 ? tribeA.power / totalPower : 0.5;
    const fracB = 1 - fracA;
    document.getElementById('balance-fill-a').style.width = (fracA * 100) + '%';
    document.getElementById('balance-fill-b').style.width = (fracB * 100) + '%';

    // Player stats
    document.getElementById('stat-age').textContent = player.age.name;
    document.getElementById('stat-essence').textContent = Math.floor(player.essence);
    document.getElementById('stat-knowledge').textContent = Math.floor(player.knowledge);
    document.getElementById('age-progress-fill').style.width = (player.getAgeProgressFraction() * 100) + '%';

    const suspA = Math.round(player.suspicionA * 100);
    const suspB = Math.round(player.suspicionB * 100);
    const sA = document.getElementById('stat-susp-a');
    const sB = document.getElementById('stat-susp-b');
    sA.textContent = suspA + '%';
    sB.textContent = suspB + '%';
    sA.style.color = suspA > 60 ? '#e04030' : suspA > 30 ? '#c08020' : '#c8c0a8';
    sB.style.color = suspB > 60 ? '#e04030' : suspB > 30 ? '#c08020' : '#c8c0a8';

    // Tribe A
    document.getElementById('a-pop').textContent = tribeA.population.toLocaleString();
    document.getElementById('a-mil').textContent = tribeA.military;
    document.getElementById('a-tech').textContent = `${tribeA.techLevel} (${tribeA.age.name.split(' ')[0]})`;
    document.getElementById('a-terr').textContent = Game.world.countTerritory('a') + ' tiles';
    const rA = tribeA.res || {};
    document.getElementById('a-res').textContent =
      `🪵${Math.floor(rA.wood||0)}  🌾${Math.floor(rA.food||0)}  ⚙${Math.floor(rA.metal||0)}  🪨${Math.floor(rA.stone||0)}`;

    // Tribe B
    document.getElementById('b-pop').textContent = tribeB.population.toLocaleString();
    document.getElementById('b-mil').textContent = tribeB.military;
    document.getElementById('b-tech').textContent = `${tribeB.techLevel} (${tribeB.age.name.split(' ')[0]})`;
    document.getElementById('b-terr').textContent = Game.world.countTerritory('b') + ' tiles';
    const rB = tribeB.res || {};
    document.getElementById('b-res').textContent =
      `🪵${Math.floor(rB.wood||0)}  🌾${Math.floor(rB.food||0)}  ⚙${Math.floor(rB.metal||0)}  🪨${Math.floor(rB.stone||0)}`;

    // Time + weather
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
    const weatherType = (Game.world && Game.world.weather && Game.world.weather.type)
      ? Game.world.weather.type
      : 'sunshine';
    document.getElementById('time-display').textContent =
      `${cal.timePeriodName}  •  Day ${cal.dayInMonth}/${cal.monthName} (Mo.${cal.month})  •  ${cal.seasonName}  •  Year ${cal.year}  •  ${weatherType}`;
    document.getElementById('age-display').textContent = getAgeByYear(cal.year).name.toUpperCase();
  }

  /**
   * Populates and updates the list of available actions for the player.
   *
   * @description This method dynamically generates the list of actions a player can take, based on their current age. It clears the existing action list, then iterates through actions relevant to the player's age. For each action, it creates a button, checks if the action is on cooldown or unaffordable, and applies appropriate styling (e.g., `on-cooldown` class, `disabled` attribute). It displays action name, cost, suspicion, and cooldown status. Finally, it binds a click listener to each button to open the action modal.
   *
   * @workflow
   * 1. Retrieves the `actions-list` element.
   * 2. Clears its `innerHTML`.
   * 3. Calls `getActionsForAge(player.age)` to get available actions.
   * 4. Iterates over each `action` in the retrieved list:
   *    a. Creates a new `button` element with class `action-btn`.
   *    b. Checks `player.isOnCooldown(action.id)` and `player.canAfford(action.cost)`.
   *    c. **Conditional**: If on cooldown, adds `on-cooldown` class to the button.
   *    d. Disables the button if `onCooldown` or `!canAfford`.
   *    e. Retrieves cooldown ticks from `player.cooldowns`.
   *    f. Sets the `innerHTML` of the button to display action name, cost, suspicion, and cooldown if applicable.
   *    g. Sets the `title` attribute of the button to `action.desc`.
   *    h. Adds a `click` event listener to the button:
   *       i. **Conditional**: If the button is not disabled, calls `this.openActionModal(action)`.
   *    i. Appends the created `btn` to the `actions-list`.
   *
   * @param {Player} player - The current player object, used to determine available actions, cooldowns, and affordability.
   * @returns {void}
   *
   * @dependencies document.getElementById(), getActionsForAge(), player.isOnCooldown(), player.canAfford(), this.openActionModal().
   * @modifies `innerHTML` of `actions-list` (clears and repopulates), adds new `button` elements to the DOM, modifies `classList` and `disabled` attribute of these buttons.
   * @triggers Called after game state changes affecting player actions (e.g., `_executeAction()` completion, tick updates).
   * @performance O(M * K), where M is the number of actions for the current age, and K is the average complexity of creating/modifying a button. `getActionsForAge()` and player methods are assumed O(1) or O(log N) for typical game scenarios. Practically, M is small, so it's efficient.
   */
  updateActionsList(player) {
    const list = document.getElementById('actions-list');
    list.innerHTML = '';

    const actions = getActionsForAge(player.age);
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';

      const onCooldown = player.isOnCooldown(action.id);
      const canAfford = player.canAfford(action.cost);

      if (onCooldown) btn.classList.add('on-cooldown');
      btn.disabled = onCooldown || !canAfford;

      const cdTicks = player.cooldowns[action.id] || 0;
      btn.innerHTML = `
        <span class="a-name">${action.name}</span>
        <span class="a-cost">Essence: ${action.cost} | Susp: +${(action.suspicion*100).toFixed(0)}%</span>
        ${onCooldown ? `<span class="a-cooldown">Cooldown: ${cdTicks} ticks</span>` : ''}
      `;

      btn.title = action.desc;
      btn.addEventListener('click', () => {
        if (!btn.disabled) this.openActionModal(action);
      });

      list.appendChild(btn);
    });
  }

  /**
   * Displays a temporary, dismissible notification message to the user.
   *
   * @description This method creates a new `div` element to serve as a notification, populating it with the provided message. It optionally applies a CSS `type` class for different visual styles (e.g., 'warn'). The notification is appended to the internal `_notifContainer` and automatically removed from the DOM after a 3-second delay, providing transient feedback to the player without requiring interaction.
   *
   * @workflow
   * 1. Creates a new `div` element.
   * 2. Sets its `className` to `notif`, appending the `type` if provided.
   * 3. Sets its `textContent` to the `msg`.
   * 4. Appends the new `div` to `this._notifContainer`.
   * 5. Sets a `setTimeout` to remove the `div` from its parent after 3000 milliseconds.
   *
   * @param {string} msg - The message content for the notification.
   * @param {string} [type=''] - An optional string indicating the type of notification (e.g., 'warn', 'info'), used for CSS styling.
   * @returns {void}
   *
   * @dependencies document.createElement(), setTimeout().
   * @modifies Adds a new `div` element to `_notifContainer` in the DOM, then removes it after a delay.
   * @triggers Called by various game logic methods (e.g., `_executeAction()`) to inform the player of outcomes or issues.
   * @performance O(1) - involves direct DOM creation, appending, and a `setTimeout` call.
   */
  notify(msg, type = '') {
    const div = document.createElement('div');
    div.className = `notif${type ? ' ' + type : ''}`;
    div.textContent = msg;
    this._notifContainer.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  /**
   * Adds a new entry to the in-game event log, maintaining a fixed history size.
   *
   * @description This method creates a new `div` element representing an event log entry, populating it with the given message and optionally applying a `type` class for styling. The new entry is prepended to the `event-log` container, ensuring the latest events appear at the top. To prevent the log from growing indefinitely, it enforces a maximum of 60 entries, removing the oldest entry when the limit is exceeded.
   *
   * @workflow
   * 1. Retrieves the `event-log` element.
   * 2. Creates a new `div` element for the log entry.
   * 3. Sets the `className` to `log-entry`, appending `log-` and `type` if provided.
   * 4. Sets the `textContent` to the `msg`.
   * 5. Prepends the `entry` to the `log` element.
   * 6. **Loop**: While `log.children.length` is greater than 60:
   *    a. Removes the `log.lastChild` (oldest entry).
   *
   * @param {string} msg - The message content for the log entry.
   * @param {string} [type=''] - An optional string indicating the type of log entry, used for CSS styling (e.g., 'event', 'important').
   * @returns {void}
   *
   * @dependencies document.getElementById(), document.createElement().
   * @modifies Adds a new `div` element to `event-log` in the DOM. Potentially removes old `div` elements from `event-log`.
   * @triggers Called by various game logic methods (e.g., `Game.advanceTurn()`) to record significant game events for the player.
   * @performance O(1) for adding an entry. O(N) in the worst case for removing old entries (where N is `log.children.length`), but typically O(1) as it only removes one element when the limit is exceeded.
   */
  addLog(msg, type = '') {
    const log = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `log-entry${type ? ' log-' + type : ''}`;
    entry.textContent = msg;
    log.prepend(entry);

    // Keep only last 60 entries
    while (log.children.length > 60) log.removeChild(log.lastChild);
  }

  /**
   * Displays the game over screen with a specified reason and game statistics.
   *
   * @description This method is responsible for presenting the game over state to the player. It updates the `gameover-subtitle` with the reason for the game's conclusion and populates the `gameover-stats` element with relevant statistics from the completed game. Finally, it removes the `hidden` class from the `gameover-screen` element, making the game over UI visible to the user.
   *
   * @workflow
   * 1. Retrieves the `gameover-subtitle` element and sets its `innerHTML` to `reason`.
   * 2. Retrieves the `gameover-stats` element and sets its `innerHTML` to `stats`.
   * 3. Removesthe `hidden` class from the `gameover-screen` element.
   *
   * @param {string} reason - A descriptive string explaining why the game ended (e.g., "Tribe A destroyed").
   * @param {string} stats - A formatted HTML string containing the final game statistics to display.
   * @returns {void}
   *
   * @dependencies document.getElementById().
   * @modifies `innerHTML` of `gameover-subtitle` and `gameover-stats`. `classList` of `gameover-screen`.
   * @triggers Called by the `Game` class when a game-ending condition is met.
   * @performance O(1) - involves direct DOM manipulation.
   */
  showGameOver(reason, stats) {
    document.getElementById('gameover-subtitle').innerHTML = reason;
    document.getElementById('gameover-stats').innerHTML = stats;
    document.getElementById('gameover-screen').classList.remove('hidden');
  }
}

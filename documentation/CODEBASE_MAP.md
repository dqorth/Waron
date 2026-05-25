# Waron - Codebase Map

This document provides a verbose breakdown of the codebase, its categories, functions, and specific JSDocs.

## Category: JavaScript App

### File: `js/ui.js`

#### Functions

**Function: `constructor`**
```javascript
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
```

**Function: `_createNotifContainer`**
```javascript
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
```

**Function: `_createTooltip`**
```javascript
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
```

**Function: `_bindSpeedButtons`**
```javascript
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
```

**Function: `_bindStartButton`**
```javascript
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
```

**Function: `_bindModalButtons`**
```javascript
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
```

**Function: `_executeAction`**
```javascript
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
```

**Function: `_closeModal`**
```javascript
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
```

**Function: `openActionModal`**
```javascript
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
```

**Function: `updateHUD`**
```javascript
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
```

**Function: `weatherType`**
```javascript
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
```

**Function: `updateActionsList`**
```javascript
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
```

**Function: `notify`**
```javascript
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
```

**Function: `addLog`**
```javascript
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
```

**Function: `showGameOver`**
```javascript
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
```

---

### File: `js/game.js`

#### Functions

**Function: `Game`**
```javascript
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
```

**Function: `init`**
```javascript
/**
   * Initializes the game's core components and starts the main rendering loop.
   *
   * @description This function sets up the essential visual and interactive elements of the game. It creates a new `Renderer` instance, associating it with the 'game-canvas' HTML element, and initializes the `UI` system. Finally, it invokes `_requestLoop` to begin the continuous animation and game update cycle.
   *
   * @workflow
   * 1. Retrieves the 'game-canvas' HTML element from the DOM.
   * 2. Instantiates a new `Renderer` object, passing the canvas element.
   * 3. Instantiates a new `UI` object.
   * 4. Calls the private `_requestLoop` function to start the game's main loop.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies document.getElementById, Renderer constructor, UI constructor, _requestLoop.
   * @modifies Global `renderer` and `ui` variables.
   * @triggers Called once when the `DOMContentLoaded` event fires on the window.
   * @performance O(1) for initialization, sets up a continuous render loop.
   */
```

**Function: `start`**
```javascript
/**
   * Initializes a new game session, creating the world, player, and two rival tribes.
   *
   * @description This function sets up all dynamic entities and initial game state for a new playthrough. It creates the `World`, `Player`, and two `Tribe` instances with specific starting positions and colors. It then initializes the tribes, updates the initial territory, resets game progress variables, and displays introductory messages in the event log.
   *
   * @workflow
   * 1. Instantiates a new `World` object.
   * 2. Instantiates a new `Player` object.
   * 3. Creates `tribeA` (Ashan) and `tribeB` (Koru) with specified IDs, names, starting coordinates, and colors based on `CONFIG` constants.
   * 4. Calls `init` on both `tribeA` and `tribeB`, passing the `world` and the opposing tribe.
   * 5. Calls `world.updateTerritory` to establish initial territorial control.
   * 6. Resets game state variables: `year` to 1, `speed` to 1, `running` to true, and `totalTicks` to 0.
   * 7. Updates the UI's actions list for the player.
   * 8. Logs two introductory game messages using `eventLog`.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies World constructor, Player constructor, Tribe constructor, CONFIG, tribeA.init, tribeB.init, world.updateTerritory, ui.updateActionsList, eventLog.
   * @modifies Global `world`, `player`, `tribeA`, `tribeB`, `speed`, `running`, `totalTicks` variables, and the UI.
   * @triggers Called by a user action, likely from a "New Game" button in the UI.
   * @performance O(N) where N is the number of tiles or initial entities for world and tribe initialization, but generally fast for game start.
   */
```

**Function: `reset`**
```javascript
/**
   * Resets core game state variables to a paused, initial state.
   *
   * @description This function prepares the game for a potential restart or re-initialization by stopping its active simulation and resetting key progress metrics. It sets the `running` flag to `false` to halt game ticks, restores the game `speed` to its default value, and clears the `totalTicks` counter. Note that it does not re-instantiate `world`, `player`, or `tribes`.
   *
   * @workflow
   * 1. Sets the `running` flag to `false`, pausing game updates.
   * 2. Resets `speed` to its default value of 1.
   * 3. Resets `totalTicks` to 0.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies None.
   * @modifies Global `running`, `speed`, `totalTicks` variables.
   * @triggers Called by a user action, likely from a "Reset Game" or "Game Over" screen.
   * @performance O(1).
   */
```

**Function: `setSpeed`**
```javascript
/**
   * Sets the current simulation speed of the game.
   *
   * @description This function allows external control over how fast the game simulation progresses. The provided `s` value directly dictates the `speed` at which game ticks occur relative to real-time. A value of 0 typically pauses the game, while higher values accelerate it.
   *
   * @workflow
   * 1. Assigns the input value `s` directly to the global `speed` variable.
   *
   * @param {number} s - The desired speed multiplier for the game. 0 means paused, 1 is normal speed, >1 is accelerated.
   * @returns {void}
   *
   * @dependencies None.
   * @modifies Global `speed` variable.
   * @triggers Called by UI elements (e.g., speed buttons or a slider).
   * @performance O(1).
   */
```

**Function: `eventLog`**
```javascript
/**
   * Adds a message to the game's event log if the UI is available.
   *
   * @description This is a utility function for logging important game events or messages to the user interface. It acts as a wrapper around the `ui.addLog` method, ensuring that messages are only processed and displayed if the `ui` object has been successfully initialized. This prevents errors if an event is logged before the UI is ready.
   *
   * @workflow
   * 1. Checks if the `ui` object exists and is initialized.
   * 2. If `ui` exists, calls `ui.addLog`, passing the provided `msg` and `type`.
   *
   * @param {string} msg - The message string to be logged.
   * @param {string} type - The type or category of the message (e.g., 'age', 'warn', 'good', 'event', 'danger'), which may influence its styling.
   * @returns {void}
   *
   * @dependencies ui.addLog.
   * @modifies The game's UI by adding a new log entry.
   * @triggers Called internally by various game logic components (e.g., `start`, `_advanceTribeTech`, `_checkEndConditions`, `_tickWeather`) to inform the player about significant events.
   * @performance O(1), assuming `ui.addLog` is O(1).
   */
```

**Function: `notify`**
```javascript
/**
   * Displays a temporary notification message through the UI if available.
   *
   * @description This utility function is designed to show transient, often critical, notifications to the player. It acts as a safeguard around the `ui.notify` method, ensuring that a notification is only displayed if the `ui` component has been successfully initialized. This prevents runtime errors when attempting to display notifications before the UI is ready.
   *
   * @workflow
   * 1. Checks if the `ui` object exists and is initialized.
   * 2. If `ui` exists, calls `ui.notify`, passing the provided `msg` and `type`.
   *
   * @param {string} msg - The message string to be displayed as a notification.
   * @param {string} type - The type or category of the notification (e.g., 'warn', 'danger'), which may influence its visual presentation.
   * @returns {void}
   *
   * @dependencies ui.notify.
   * @modifies The game's UI by displaying a temporary notification.
   * @triggers Called internally by `_checkEndConditions` to warn the player about impending game over conditions.
   * @performance O(1), assuming `ui.notify` is O(1).
   */
```

**Function: `_tick`**
```javascript
/**
   * Executes a single step of the game simulation, advancing time and updating all game entities.
   *
   * @description This central function drives the game's progression, being called at a regular interval. It increments the global tick counter, updates the calendar, and orchestrates the updates for the world, weather, both tribes, and the player. It also handles periodic tasks like territory recalculations, technology advancements, UI updates, and checks for game-ending conditions.
   *
   * @workflow
   * 1. Checks if `running` is false; if so, exits immediately.
   * 2. Increments `totalTicks`.
   * 3. Updates the internal `_cal` object by calling `_getCalendar` with `totalTicks`.
   * 4. Calls `world.tickResources()` to update landscape resources.
   * 5. Calls `_tickWeather()` with the current season to advance weather state.
   * 6. Assigns the current `_weather` and its corresponding `_weatherMods` to the `world` object.
   * 7. Calls `tick` method on `tribeA`, `tribeB`, and `player`, passing relevant data like the current year.
   * 8. Increments `territoryUpdateTimer`.
   * 9. If `territoryUpdateTimer` reaches 10:
   *    a. Resets `territoryUpdateTimer` to 0.
   *    b. Calls `world.updateTerritory` for both tribes.
   *    c. Calls `renderer.markTilesDirty()` to signal a need for re-rendering.
   * 10. Calls `_advanceTribeTech` for both `tribeA` and `tribeB`.
   * 11. Updates the HUD using `ui.updateHUD`.
   * 12. If `totalTicks` is a multiple of 5, calls `ui.updateActionsList` for the player.
   * 13. Calls `_checkEndConditions` to evaluate win/loss states.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies _getCalendar, world.tickResources, _tickWeather, tribeA.tick, tribeB.tick, player.tick, world.updateTerritory, renderer.markTilesDirty, _advanceTribeTech, ui.updateHUD, ui.updateActionsList, _checkEndConditions, _weather, _weatherMods, CONFIG.
   * @modifies Global `totalTicks`, `_cal`, `world`, `_weather`, `tribeA`, `tribeB`, `player`, `territoryUpdateTimer`, and the UI state.
   * @triggers Called by the `loop` function (within `_requestLoop`) at regular intervals based on `CONFIG.TICK_MS` and `speed`.
   * @performance O(N) where N is the sum of operations within `world.tickResources`, `tribe.tick`, `player.tick`, and `world.updateTerritory`, which can be significant depending on map size and entity count.
   */
```

**Function: `_advanceTribeTech`**
```javascript
/**
   * Manages the technological advancement of a given tribe.
   *
   * @description This function evaluates if a tribe has accumulated enough knowledge to reach the next technology level, up to a maximum allowed by their current age. If the knowledge threshold is met and the tribe hasn't reached its age's max tech, its `techLevel` is incremented, and its `knowledge` is reset. Significant tech advancements (every 3 levels) are logged to the player.
   *
   * @workflow
   * 1. Retrieves the `tribeMaxTech` from the tribe's current age.
   * 2. Calculates the `techThreshold` required for the next level based on current `techLevel`.
   * 3. Checks if `tribe.knowledge` is greater than or equal to `techThreshold` AND if `tribe.techLevel` is less than `maxTech`.
   * 4. If both conditions are true:
   *    a. Increments `tribe.techLevel`.
   *    b. Resets `tribe.knowledge` to 0.
   *    c. If the new `tribe.techLevel` is a multiple of 3, logs a "good" event message indicating the tribe's technological achievement.
   *
   * @param {Tribe} tribe - The tribe object whose technology level is to be checked and potentially advanced.
   * @returns {void}
   *
   * @dependencies tribe.age.tribeMaxTech, tribe.knowledge, tribe.techLevel, eventLog.
   * @modifies The `tribe.techLevel` and `tribe.knowledge` properties of the input `tribe` object, and the game's UI via `eventLog`.
   * @triggers Called for each tribe during every game `_tick`.
   * @performance O(1).
   */
```

**Function: `_checkEndConditions`**
```javascript
/**
   * Evaluates various conditions that could lead to game over or trigger in-game warnings.
   *
   * @description This function is invoked periodically to determine if the player has won or lost, or if critical game states require a warning. It checks for tribe elimination, extreme power imbalances between tribes, and whether the player's hidden influence has been discovered by either tribe. Additionally, it provides critical and warning notifications through the UI if imbalances or suspicions are high but not yet game-ending.
   *
   * @workflow
   * 1. Calculates `totalPower` of both tribes and their individual power fractions (`fracA`, `fracB`). Uses `|| 1` to prevent division by zero if both tribes have 0 power.
   * 2. **Tribe Elimination Check:**
   *    a. If `tribeA.isEliminated()` returns true, calls `_gameOver` with a specific Ashan elimination message and `true` for `byBalance`, then returns.
   *    b. If `tribeB.isEliminated()` returns true, calls `_gameOver` with a specific Koru elimination message and `true` for `byBalance`, then returns.
   * 3. **Massive Imbalance Check:**
   *    a. If `fracA` or `fracB` meets `CONFIG.BALANCE_LOSE` threshold, determines the `winner` and `loser`.
   *    b. Calls `_gameOver` with an imbalance-specific message including winner/loser names and `true` for `byBalance`, then returns.
   * 4. **Suspicion Discovery Check:**
   *    a. If `player.suspicionA` meets `CONFIG.SUSPICION_LOSE` threshold, calls `_gameOver` with an Ashan discovery message and `false` for `byBalance`, then returns.
   *    b. If `player.suspicionB` meets `CONFIG.SUSPICION_LOSE` threshold, calls `_gameOver` with a Koru discovery message and `false` for `byBalance`, then returns.
   * 5. **Balance Warnings (every 20 ticks):**
   *    a. If `fracA` meets `CONFIG.BALANCE_CRIT` threshold and `totalTicks` is a multiple of 20, logs a "danger" event and displays a "danger" notification.
   *    b. If `fracB` meets `CONFIG.BALANCE_CRIT` threshold and `totalTicks` is a multiple of 20, logs a "danger" event and displays a "danger" notification.
   * 6. **Suspicion Warnings (every 30 ticks):**
   *    a. If `player.suspicionA` meets `CONFIG.SUSPICION_CRIT` threshold and `totalTicks` is a multiple of 30, logs a "warn" event.
   *    b. If `player.suspicionB` meets `CONFIG.SUSPICION_CRIT` threshold and `totalTicks` is a multiple of 30, logs a "warn" event.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies tribeA.power, tribeB.power, tribeA.isEliminated, tribeB.isEliminated, player.suspicionA, player.suspicionB, CONFIG.BALANCE_LOSE, CONFIG.SUSPICION_LOSE, CONFIG.BALANCE_CRIT, CONFIG.SUSPICION_CRIT, _gameOver, eventLog, notify, totalTicks.
   * @modifies Calls `_gameOver` which modifies the `running` state and UI. Calls `eventLog` and `notify` which modify the UI.
   * @triggers Called at the end of every game `_tick`.
   * @performance O(1) as it involves simple arithmetic, property lookups, and conditional checks.
   */
```

**Function: `_gameOver`**
```javascript
/**
   * Ends the game, stops the simulation, and displays the game over screen with stats.
   *
   * @description This function is called when any game-ending condition is met. It immediately pauses the game by setting the `running` flag to `false`. It then compiles a detailed summary of the player's performance and game progress, including days survived, years elapsed, age reached, essence harvested, actions used, and combined casualties. Finally, it delegates to the UI component to display the game over message and these generated statistics to the player.
   *
   * @workflow
   * 1. Sets the `running` flag to `false`, halting further game ticks.
   * 2. Constructs an HTML string `stats` using template literals, incorporating current game metrics such as `_cal.day`, `_cal.year`, `player.age.name`, `player.totalEssence`, `player.actionsUsed`, `tribeA.casualties`, and `tribeB.casualties`.
   * 3. Calls `ui.showGameOver`, passing the `reason` for game over and the generated `stats` string.
   *
   * @param {string} reason - A message explaining why the game ended.
   * @param {boolean} byBalance - A flag indicating if the game ended due to tribal power imbalance (currently unused in the function's logic beyond being passed).
   * @returns {void}
   *
   * @dependencies _cal.day, _cal.year, player.age.name, player.totalEssence, player.actionsUsed, tribeA.casualties, tribeB.casualties, ui.showGameOver.
   * @modifies Global `running` variable, and the game's UI by showing the game over screen.
   * @triggers Called by `_checkEndConditions` when a game over condition (tribe elimination, extreme imbalance, or player discovery) is met.
   * @performance O(1).
   */
```

**Function: `_requestLoop`**
```javascript
/**
   * Initiates and manages the primary game loop using `requestAnimationFrame`.
   *
   * @description This function sets up the game's continuous update and rendering cycle. It defines a nested `loop` function that is recursively called by `requestAnimationFrame`. This `loop` calculates delta time, accumulates it for game ticks, and triggers `_tick` at intervals determined by `CONFIG.TICK_MS` and the current `speed`. It also ensures that the game world is always rendered, even when paused.
   *
   * @workflow
   * 1. Defines an inner function `loop(timestamp)` which will serve as the actual animation frame callback.
   * 2. The outer `_requestLoop` function then makes an initial call to `requestAnimationFrame`.
   *    a. This first call primes `lastTime` with the initial timestamp.
   *    b. It then immediately calls `requestAnimationFrame` again, passing the `loop` function to start the recurring cycle.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies requestAnimationFrame, loop (inner function).
   * @modifies Global `lastTime`.
   * @triggers Called once by `Game.init` to start the main game loop.
   * @performance O(1) for setup. The actual loop's performance depends on the `loop` function.
   */
```

**Function: `loop`**
```javascript
/**
     * The core game loop function that handles frame updates, game state ticks, and rendering.
     *
     * @description This function is the heart of the game's real-time simulation, invoked by `requestAnimationFrame` roughly 60 times per second. It first schedules itself for the next frame. If the game is paused, it only performs rendering. Otherwise, it calculates delta time, accumulates it towards the next game tick, and calls the `_tick` function when enough time has passed, adjusted by the game `speed`. Finally, it renders the current game state to the canvas.
     *
     * @workflow
     * 1. Immediately requests the next animation frame, recursively calling `loop` itself.
     * 2. **If `running` is false (game is paused):**
     *    a. Checks if `renderer` and `world` exist.
     *    b. If they exist, calls `renderer.render` to draw the current world state, providing placeholder empty arrays for tribes if they haven't been initialized yet, and the current `_weather`.
     *    c. Returns, skipping game logic updates.
     * 3. Calculates `dt` (delta time) as the difference between the current `timestamp` and `lastTime`.
     * 4. Updates `lastTime` to the current `timestamp`.
     * 5. Calculates `tickInterval` based on `CONFIG.TICK_MS` and `speed`. If `speed` is 0, `tickInterval` is `Infinity`.
     * 6. Adds `dt` to `tickAccum`.
     * 7. **If `speed` is greater than 0 AND `tickAccum` is greater than or equal to `tickInterval`:**
     *    a. Subtracts `tickInterval` from `tickAccum`.
     *    b. Calls the private `_tick` function to advance game state.
     * 8. Calls `renderer.render` to draw the current `world`, `tribeA`, `tribeB`, and `_weather` to the canvas.
     *
     * @param {DOMHighResTimeStamp} timestamp - The current time in milliseconds, passed by `requestAnimationFrame`.
     * @returns {void}
     *
     * @dependencies requestAnimationFrame, running, renderer, world, tribeA, tribeB, _weather, lastTime, CONFIG.TICK_MS, speed, tickAccum, _tick.
     * @modifies Global `lastTime`, `tickAccum`. Calls `_tick` which modifies various game state variables. Calls `renderer.render` which modifies the canvas.
     * @triggers Recursively called by `requestAnimationFrame` after an initial setup call from `_requestLoop`.
     * @performance O(1) for the loop's own logic. The overall performance is dominated by `renderer.render` and `_tick`, potentially O(N) where N is map size/entity count.
     */
```

**Function: `_getCalendar`**
```javascript
/**
 * Calculates and returns the current calendar date and time period based on total game ticks.
 *
 * @description This helper function translates the game's internal `totalTicks` into a human-readable calendar format. It uses `CONFIG` constants for `TICKS_PER_DAY`, `DAYS_PER_MONTH`, `MONTHS_PER_YEAR`, and `DAYS_PER_YEAR` to derive the current time period index, total days, day within the month, month, and year. It also determines the current season based on the month.
 *
 * @workflow
 * 1. Retrieves time-related constants from `CONFIG`: `TPD`, `DPM`, `MPY`, `DPY`.
 * 2. Calculates `timePeriodIdx` by taking `ticks` modulo `TPD`.
 * 3. Calculates `totalDays` by dividing `ticks` by `TPD` and flooring the result.
 * 4. Calculates `dayInMonth` by taking `totalDays` modulo `DPM` and adding 1.
 * 5. Calculates `monthIdx` by dividing `totalDays` by `DPM`, flooring, and then taking modulo `MPY`.
 * 6. Calculates `month` by adding 1 to `monthIdx`.
 * 7. Calculates `year` by dividing `totalDays` by `DPY`, flooring, and then adding 1.
 * 8. Determines `season` based on the calculated `month` using a series of `if-else if` statements mapping month ranges to `CONFIG.SEASON` values.
 * 9. Returns an object containing: `timePeriodIdx`, `timePeriodName` (from `CONFIG.TIME_PERIOD_NAMES`), `day` (totalDays + 1), `dayInMonth`, `month`, `monthName` (from `CONFIG.MONTH_NAMES`), `year`, `season`, and `seasonName` (capitalized season string).
 *
 * @param {number} ticks - The total number of game ticks that have elapsed since the start of the game.
 * @returns {object} An object containing detailed calendar information:
 *   - `{number} timePeriodIdx` - Index of the current time period within a day (0-4).
 *   - `{string} timePeriodName` - Name of the current time period (e.g., 'Dawn').
 *   - `{number} day` - The total number of days elapsed since game start (1-indexed).
 *   - `{number} dayInMonth` - The current day within the month (1-indexed).
 *   - `{number} month` - The current month number (1-indexed).
 *   - `{string} monthName` - Name of the current month (e.g., 'Ashveil').
 *   - `{number} year` - The current year (1-indexed).
 *   - `{string} season` - The current season (e.g., 'spring').
 *   - `{string} seasonName` - The capitalized name of the current season (e.g., 'Spring').
 *
 * @dependencies CONFIG.TICKS_PER_DAY, CONFIG.DAYS_PER_MONTH, CONFIG.MONTHS_PER_YEAR, CONFIG.DAYS_PER_YEAR, CONFIG.TIME_PERIOD_NAMES, CONFIG.MONTH_NAMES, CONFIG.SEASON.
 * @modifies None (pure function).
 * @triggers Called by `Game._tick` during every game tick to update the global `_cal` variable.
 * @performance O(1), involves a fixed number of arithmetic operations and lookups.
 */
```

**Function: `dayInMonth`**
```javascript
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
```

**Function: `_tickWeather`**
```javascript
/**
 * Updates the game's weather state based on season and random probabilities.
 *
 * @description This function manages the dynamic weather system. It increments an internal timer, and once the current weather duration expires, it determines a new weather type based on season-specific probability weights. A random duration is set for the new weather. If the weather type changes, a descriptive event message is logged. Finally, the weather's intensity is randomized.
 *
 * @workflow
 * 1. Increments `_weather.timer`.
 * 2. If `_weather.timer` is less than `_weather.duration`, returns early (current weather cycle is not over).
 * 3. Resets `_weather.timer` to 0.
 * 4. Sets a new random `_weather.duration` between `CONFIG.WEATHER_DURATION_MIN` and `CONFIG.WEATHER_DURATION_MAX`.
 * 5. Retrieves `_seasonWeatherWeights` for the given `season`, defaulting to 'spring' if the season is not found.
 * 6. Filters `weights` to include only weather types with a probability greater than 0, then calculates their `total` weight.
 * 7. Generates a random number `r` between 0 and `total`.
 * 8. Iterates through the `entries` of `weights`:
 *    a. Accumulates weights in `acc`.
 *    b. If `r` is less than or equal to `acc`, sets `nextType` to the current weather `type` and breaks the loop (this selects the new weather).
 * 9. **If `nextType` is different from `_weather.type` (weather changed):**
 *    a. Retrieves an array of messages `msgs` from `_weatherEventMsgs` for the `nextType`.
 *    b. If `msgs` exist, logs a random message from the array using `Game.eventLog` with type 'event'.
 * 10. Updates `_weather.type` to `nextType`.
 * 11. Randomizes `_weather.intensity` to a value between 0.55 and 1.0.
 *
 * @param {string} season - The current season (e.g., 'spring', 'summer') which dictates weather probabilities.
 * @returns {void}
 *
 * @dependencies _weather.timer, _weather.duration, _weather.type, _weather.intensity, CONFIG.WEATHER_DURATION_MIN, CONFIG.WEATHER_DURATION_MAX, _seasonWeatherWeights, _weatherEventMsgs, Game.eventLog, Math.random, Math.floor, Object.entries, Array.prototype.filter, Array.prototype.reduce.
 * @modifies Global `_weather` object (its `timer`, `duration`, `type`, and `intensity` properties), and potentially the UI via `Game.eventLog`.
 * @triggers Called by `Game._tick` during every game tick.
 * @performance O(N) where N is the number of possible weather types (small constant, typically 7), due to iteration over weights. Effectively O(1).
 */
```

---

### File: `js/player.js`

#### Functions

**Function: `constructor`**
```javascript
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
```

**Function: `tick`**
```javascript
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
```

**Function: `battleActivity`**
```javascript
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
```

**Function: `_checkAgeUp`**
```javascript
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
```

**Function: `canAfford`**
```javascript
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
```

**Function: `spendEssence`**
```javascript
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
```

**Function: `addSuspicion`**
```javascript
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
```

**Function: `isOnCooldown`**
```javascript
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
```

**Function: `setCooldown`**
```javascript
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
```

**Function: `hasAction`**
```javascript
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
```

**Function: `getSuspicion`**
```javascript
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
```

**Function: `getAgeProgressFraction`**
```javascript
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
```

---

### File: `js/world.js`

#### Functions

**Function: `constructor`**
```javascript
/**
   * Initializes a new World instance with map dimensions, tile data, entities, and spatial indexing structures.
   *
   * @description The constructor sets up the foundational properties of the game world. It initializes the map dimensions based on `CONFIG`, prepares empty arrays for `tiles` and `entities`, and sets up internal tracking for entity IDs, weather, and a tree map. Crucially, it establishes a spatial hash grid for efficient entity lookups and caches for territory counts and resource regeneration, then calls `generate()` to populate the world.
   *
   * @workflow
   * 1. Initialize `W` and `H` (width and height) from `CONFIG.MAP_W` and `CONFIG.MAP_H`.
   * 2. Initialize empty arrays for `tiles` and `entities`.
   * 3. Set `_nextEntityId` to 1.
   * 4. Define initial `weather` conditions and `weatherMods` multipliers.
   * 5. Initialize an empty `treeMap` object for tracking trees.
   * 6. Set up spatial hash properties: `_spatialCellSize`, an empty `_spatialGrid` object, and an empty `_entityById` object.
   * 7. Initialize territory cache: `_territoryCount` and `_territoryDirty` flag.
   * 8. Initialize `_regenTiles` as an empty array for resource tick optimization.
   * 9. Call the `generate()` method to populate the world with tiles, resources, and initial entities.
   *
   * @param {void}
   * @returns {void} This is a constructor, it does not explicitly return a value.
   *
   * @dependencies CONFIG (for MAP_W, MAP_H, WEATHER.SUNSHINE). this.generate().
   * @modifies this.W, this.H, this.tiles, this.entities, this._nextEntityId, this.weather, this.weatherMods, this.treeMap, this._spatialCellSize, this._spatialGrid, this._entityById, this._territoryCount, this._territoryDirty, this._regenTiles.
   * @triggers Called automatically when a new `World` object is instantiated. Immediately calls `this.generate()`.
   * @performance O(1) for initialization, but the subsequent call to `generate()` will have higher complexity.
   */
```

**Function: `generate`**
```javascript
/**
   * Populates the game world with tiles, assigns biomes based on noise, and spawns initial resources and trees.
   *
   * @description This method resets the `tiles` array and then iteratively creates each tile in the `W`x`H` grid. It uses multiple Perlin noise layers (elevation, moisture, temperature, ruins) to determine the biome type and resource availability for each tile. It also ensures a traversable corridor in the map's center and spawns trees on appropriate biome tiles before rebuilding the resource regeneration list.
   *
   * @workflow
   * 1. Clear `this.tiles` array.
   * 2. Calculate a `seedOffset` from `CONFIG.MAP_SEED`.
   * 3. Generate four noise maps: `elevNoise`, `moistNoise`, `tempNoise`, `ruinNoise` using `_buildNoise` with different seeds.
   * 4. Iterate through each `(x, y)` coordinate from `(0,0)` to `(W-1, H-1)`:
   *    - Calculate raw elevation `h`, moisture `m`, and temperature `temp` for the tile, adjusting `h` by `edgeDist`.
   *    - Determine `type` based on `h`, `m`, and `temp` using a series of conditional checks against `CONFIG.TILE` thresholds.
   *    - If `type` is `GRASS` or `SAVANNA` and `ruinNoise` is high, set `type` to `RUINS`.
   *    - Determine `resourceNode` properties (max, amount) if the tile type is not `WATER` or `MOUNTAIN` and has a `TILE_YIELD` entry.
   *    - Assign the constructed tile object to `this.tiles[y][x]`.
   * 5. Iterate through a central corridor region (`y` from 12 to `H-12`, `x` from `midX-4` to `midX+4`):
   *    - If a tile in this region is `WATER` or `MOUNTAIN`, force its `type` to `GRASS` and assign a default `resourceNode`.
   * 6. Initialize `this.treeMap`.
   * 7. Iterate through all `(tx2, ty2)` coordinates:
   *    - If the tile type is `FOREST` or `JUNGLE` and `Math.random()` exceeds `CONFIG.TREE_SPAWN_CHANCE`, spawn a tree:
   *        - Generate random `growth` (1-5) and `growthTicks`.
   *        - Add the tree object to `this.treeMap` with key `${tx2},${ty2}`.
   * 8. Call `this._rebuildRegenList()` to initialize the list of tiles requiring resource regeneration.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies CONFIG (for MAP_W, MAP_H, MAP_SEED, TILE, TILE_YIELD, TILE_RESOURCE_MAX, TREE_SPAWN_CHANCE, TREE_TICKS_PER_STAGE). this._buildNoise(), this._rebuildRegenList().
   * @modifies this.tiles, this.treeMap, this._regenTiles.
   * @triggers Called once by the `constructor` after world initialization.
   * @performance O(W * H * octaves) due to nested loops for tile generation and noise calculation, plus additional loops for corridor adjustment and tree spawning. This is a one-time setup cost.
   */
```

**Function: `seedOffset`**
```javascript
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
```

**Function: `resourceNode`**
```javascript
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
```

**Function: `_spatialKey`**
```javascript
/**
   * Calculates a spatial hash grid key for a given coordinate.
   *
   * @description This private helper function takes world coordinates `x` and `y` and converts them into a string key for the spatial hash grid. The key identifies the cell within the grid that corresponds to the given coordinates, based on the predefined `_spatialCellSize`.
   *
   * @workflow
   * 1. Retrieve `_spatialCellSize` from `this`.
   * 2. Divide `x` by `_spatialCellSize` and perform a bitwise OR with 0 to effectively floor the result (integer division).
   * 3. Divide `y` by `_spatialCellSize` and perform a bitwise OR with 0 to effectively floor the result.
   * 4. Concatenate the results with a comma to form the string key "cx,cy".
   *
   * @param {number} x - The X-coordinate in the world.
   * @param {number} y - The Y-coordinate in the world.
   * @returns {string} A string representing the spatial grid cell key (e.g., "3,5").
   *
   * @dependencies this._spatialCellSize.
   * @modifies None.
   * @triggers Called internally by `_spatialInsert`, `_spatialMove`, `getEntitiesAt`, `hasEnemyWall`.
   * @performance O(1) constant time operation.
   */
```

**Function: `_spatialInsert`**
```javascript
/**
   * Adds an entity to the spatial hash grid and entity lookup map.
   *
   * @description This private method inserts a given entity into the world's spatial indexing system. It calculates the appropriate spatial grid cell key for the entity's current position and adds the entity's ID to a Set associated with that key. It also stores a reference to the entity in a direct ID-to-entity map and updates the entity with its calculated spatial key.
   *
   * @workflow
   * 1. Calculate the `key` for the entity's `x` and `y` coordinates using `_spatialKey()`.
   * 2. If `this._spatialGrid[key]` does not exist, initialize it as a new `Set`.
   * 3. Add the `entity.id` to the `Set` at `this._spatialGrid[key]`.
   * 4. Store a direct reference to the `entity` in `this._entityById` using its `id`.
   * 5. Assign the calculated `key` to `entity._spatialKey` for future quick removal/update.
   *
   * @param {object} entity - The entity object to insert. Must have `id`, `x`, `y` properties.
   * @returns {void}
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById.
   * @modifies this._spatialGrid, this._entityById, entity._spatialKey.
   * @triggers Called by `addEntity` when a new entity is added to the world, and by `_spatialMove` when an entity changes spatial grid cells.
   * @performance O(1) on average for Set operations and map lookups.
   */
```

**Function: `_spatialRemove`**
```javascript
/**
   * Removes an entity from the spatial hash grid and entity lookup map.
   *
   * @description This private method removes an entity from the world's spatial indexing structures. It uses the `_spatialKey` stored on the entity to locate its entry in the `_spatialGrid` and removes its ID. If the cell becomes empty, the cell itself is removed from the grid. The entity is also removed from the direct ID-to-entity map.
   *
   * @workflow
   * 1. Retrieve the `key` from `entity._spatialKey`.
   * 2. If the `key` exists and the corresponding `Set` in `this._spatialGrid` exists:
   *    - Remove `entity.id` from the `Set`.
   *    - If the `Set` becomes empty after removal, delete the `key` from `this._spatialGrid`.
   * 3. Delete the `entity.id` entry from `this._entityById`.
   * 4. Set `entity._spatialKey` to `undefined` to clear its spatial tracking reference.
   *
   * @param {object} entity - The entity object to remove. Must have `id` and `_spatialKey` properties.
   * @returns {void}
   *
   * @dependencies this._spatialGrid, this._entityById.
   * @modifies this._spatialGrid, this._entityById, entity._spatialKey.
   * @triggers Called by `removeEntity` when an entity is removed from the world, and by `_spatialMove` when an entity changes spatial grid cells.
   * @performance O(1) on average for Set operations and map lookups.
   */
```

**Function: `_spatialMove`**
```javascript
/**
   * Updates an entity's position within the spatial hash grid if it has moved to a different cell.
   *
   * @description This private method is called when an entity's coordinates might have changed. It calculates a new spatial key for the entity and compares it to the entity's previously stored key. If the keys differ, indicating the entity has moved to a new spatial grid cell, the entity is first removed from its old cell and then inserted into its new cell.
   *
   * @workflow
   * 1. Calculate the `newKey` for the entity's current `x` and `y` using `_spatialKey()`.
   * 2. If `newKey` is the same as `entity._spatialKey`, return immediately as no spatial grid change is needed.
   * 3. Call `_spatialRemove(entity)` to remove the entity from its old grid cell.
   * 4. Call `_spatialInsert(entity)` to insert the entity into its new grid cell.
   *
   * @param {object} entity - The entity object that has potentially moved. Must have `x`, `y`, `id`, and `_spatialKey` properties.
   * @returns {void}
   *
   * @dependencies this._spatialKey(), this._spatialRemove(), this._spatialInsert().
   * @modifies this._spatialGrid and this._entityById indirectly via `_spatialRemove` and `_spatialInsert`, and `entity._spatialKey`.
   * @triggers Called by `notifyEntityMoved` after an entity's position has been updated (e.g., a unit has moved).
   * @performance O(1) on average if the entity changes cells, O(1) if it stays in the same cell.
   */
```

**Function: `_rebuildRegenList`**
```javascript
/**
   * Reconstructs the list of tiles that require resource regeneration.
   *
   * @description This private method iterates through every tile in the world and identifies those with `resourceNode` objects whose current `amount` is less than their `max` capacity. These tiles are added to `_regenTiles`, an optimized list used by `tickResources` to efficiently update only the relevant tiles, rather than scanning the entire map each tick.
   *
   * @workflow
   * 1. Clear the existing `this._regenTiles` array.
   * 2. Iterate through every `y` coordinate from `0` to `H-1`.
   * 3. For each `y`, iterate through every `x` coordinate from `0` to `W-1`.
   * 4. Access the `resourceNode` of the current tile `this.tiles[y][x]`.
   * 5. If a `resourceNode` exists AND its `amount` is less than its `max` amount:
   *    - Add an object `{ x, y }` to `this._regenTiles`.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies this._regenTiles.
   * @triggers Called once during world initialization by `generate()`.
   * @performance O(W * H) as it iterates through every tile on the map. This is performed rarely (once at init).
   */
```

**Function: `_markTileNeedsRegen`**
```javascript
/**
   * Adds a specific tile's coordinates to the resource regeneration list.
   *
   * @description This private helper function is used to add the coordinates of a tile `(x, y)` to the `_regenTiles` list. This optimization ensures that tiles whose resources have been harvested below their maximum capacity are tracked and will be processed for regeneration by `tickResources`. It uses a simple push, accepting minor duplicates which are cleaned up during the `tickResources` processing.
   *
   * @workflow
   * 1. Push an object `{ x, y }` representing the tile's coordinates into the `this._regenTiles` array.
   *
   * @param {number} x - The X-coordinate of the tile.
   * @param {number} y - The Y-coordinate of the tile.
   * @returns {void}
   *
   * @dependencies this._regenTiles.
   * @modifies this._regenTiles.
   * @triggers Called by `harvestTile` when resources are taken from a tile, making it eligible for regeneration.
   * @performance O(1) constant time for array push.
   */
```

**Function: `_buildNoise`**
```javascript
/**
   * Generates a 2D Perlin noise map for terrain generation.
   *
   * @description This private utility function constructs a 2D array of noise values, commonly used for procedural terrain generation. It applies a multi-octave Perlin-like noise algorithm, where each octave adds more detail at a higher frequency and lower amplitude. This process smooths the noise values and allows for complex, natural-looking patterns.
   *
   * @workflow
   * 1. Initialize an empty 2D array `data`.
   * 2. Iterate through each `y` coordinate from `0` to `H-1`.
   * 3. For each `y`, initialize `data[y]` as an empty array.
   * 4. Iterate through each `x` coordinate from `0` to `W-1`.
   * 5. For each `(x, y)`:
   *    - Initialize `value`, `amp`, `freq`, and `norm` for noise calculation.
   *    - Loop `octaves` times:
   *        - Calculate `value` by adding the result of `_smoothNoise()` (scaled by `amp`) using `x`, `y`, and `seedShift`.
   *        - Add `amp` to `norm`.
   *        - Halve `amp` (multiplied by 0.55) for the next octave.
   *        - Double `freq` for the next octave.
   *    - Divide `value` by `norm` (normalized sum of amplitudes) to get the final noise value for `data[y][x]`.
   * 6. Return the `data` 2D array.
   *
   * @param {number} W - The width of the noise map.
   * @param {number} H - The height of the noise map.
   * @param {number} octaves - The number of noise layers to combine for detail.
   * @param {number} seedShift - A unique seed offset to create different noise patterns.
   * @returns {number[][]} A 2D array `[y][x]` containing normalized noise values between 0 and 1.
   *
   * @dependencies this._smoothNoise().
   * @modifies None, generates new data.
   * @triggers Called by `generate()` to create elevation, moisture, temperature, and ruin noise maps.
   * @performance O(W * H * octaves) due to nested loops and repeated `_smoothNoise` calls. This is a one-time calculation during world generation.
   */
```

**Function: `_smoothNoise`**
```javascript
/**
   * Calculates a 2D smooth noise value using cubic interpolation.
   *
   * @description This private utility function generates a single smooth noise value for a given `(x, y)` coordinate. It implements a form of Perlin noise interpolation by determining the four surrounding integer grid points, generating pseudo-random values for each of those points, and then smoothly blending them based on the fractional parts of `x` and `y` using a cubic (3x^2 - 2x^3) easing curve.
   *
   * @workflow
   * 1. Extract integer parts `ix`, `iy` and fractional parts `fx`, `fy` from `x`, `y`.
   * 2. Calculate cubic interpolation weights `ux` and `uy` from `fx` and `fy`.
   * 3. Define an inline helper function `r(nx, ny)`:
   *    - Generates a pseudo-random value between 0 and 1 for integer coordinates `(nx, ny)` using a deterministic sine function.
   * 4. Calculate the weighted sum of `r` values for the four surrounding grid points: `(ix, iy)`, `(ix+1, iy)`, `(ix, iy+1)`, `(ix+1, iy+1)`.
   * 5. Return the interpolated noise value.
   *
   * @param {number} x - The X-coordinate for noise calculation (can be fractional).
   * @param {number} y - The Y-coordinate for noise calculation (can be fractional).
   * @returns {number} A smooth noise value, typically between 0 and 1 (though can be outside this range without explicit clamping).
   *
   * @dependencies Math.floor(), Math.sin().
   * @modifies None.
   * @triggers Called repeatedly by `_buildNoise` for each point and octave.
   * @performance O(1) constant time per call, involving fixed number of mathematical operations.
   */
```

**Function: `r`**
```javascript
/**
     * Generates a pseudo-random value between 0 and 1 based on integer coordinates.
     *
     * @description This local helper function, defined within `_smoothNoise`, provides a deterministic pseudo-random number for any given integer `(nx, ny)` coordinate. It uses a mathematical sine function with large, arbitrary constants to create a fractional output that appears random but is consistent for the same input coordinates, crucial for reproducible noise generation.
     *
     * @workflow
     * 1. Calculate a value `n` using `Math.sin()` with `nx`, `ny`, and several large magic numbers.
     * 2. Subtract the floor of `n` from `n` to get the fractional part, effectively mapping `n` to `[0, 1)`.
     * 3. Return the resulting pseudo-random float.
     *
     * @param {number} nx - The integer X-coordinate.
     * @param {number} ny - The integer Y-coordinate.
     * @returns {number} A pseudo-random float between 0 (inclusive) and 1 (exclusive).
     *
     * @dependencies Math.sin(), Math.floor().
     * @modifies None.
     * @triggers Called four times by `_smoothNoise` for the four grid points surrounding the input `(x, y)`.
     * @performance O(1) constant time due to fixed mathematical operations.
     */
```

**Function: `getTile`**
```javascript
/**
   * Retrieves the tile object at specified world coordinates.
   *
   * @description This method provides safe access to the game world's tile data. It takes `x` and `y` coordinates and returns the corresponding tile object from `this.tiles`. Before accessing, it performs bounds checking to ensure the coordinates are within the map's dimensions, returning `null` if they are out of bounds.
   *
   * @workflow
   * 1. Check if `x` is less than 0 or greater than or equal to `this.W`.
   * 2. Check if `y` is less than 0 or greater than or equal to `this.H`.
   * 3. If any of these conditions are true (coordinates are out of bounds), return `null`.
   * 4. Otherwise, return the tile object located at `this.tiles[y][x]`.
   *
   * @param {number} x - The X-coordinate of the tile.
   * @param {number} y - The Y-coordinate of the tile.
   * @returns {object|null} The tile object at `(x, y)` if within bounds, otherwise `null`.
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies None.
   * @triggers Frequently called by various methods that need to inspect or modify specific tiles, such as `isWalkable`, `setRoad`, `harvestTile`, `plantTree`, `updateTerritory`, `findNearestWalkable`.
   * @performance O(1) constant time due to direct array access and simple bounds checking.
   */
```

**Function: `tickResources`**
```javascript
/**
   * Processes the regeneration of resources on tiles in the world.
   *
   * @description This method simulates the natural regeneration of resources on tiles. It iterates specifically through the `_regenTiles` list, which contains only tiles that need regeneration. For each such tile, it increments the `resourceNode.amount` up to its `max`. Tiles that reach their maximum resource amount are removed from the `_regenTiles` list, while those still needing regeneration remain for subsequent ticks. After processing resources, it calls `tickTrees()` to handle tree growth.
   *
   * @workflow
   * 1. Get `regen` amount from `CONFIG.TILE_RESOURCE_REGEN`.
   * 2. Initialize an empty array `surviving` to hold tiles that still need regeneration.
   * 3. Loop through each `p` (tile coordinate `{x,y}`) in `this._regenTiles`.
   * 4. Retrieve the `resourceNode` from `this.tiles[p.y][p.x]`.
   * 5. If `resourceNode` is null, skip to the next tile.
   * 6. If `resourceNode.amount` is already at `node.max`, skip to the next tile.
   * 7. Increase `node.amount` by `regen`, capping it at `node.max`.
   * 8. If `node.amount` is still less than `node.max` after regeneration, add `p` to the `surviving` list.
   * 9. Replace `this._regenTiles` with the `surviving` list.
   * 10. Call `this.tickTrees()` to advance tree growth.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies CONFIG.TILE_RESOURCE_REGEN, this.tiles, this._regenTiles, this.tickTrees().
   * @modifies this.tiles[y][x].resourceNode.amount` for tiles in `_regenTiles`, `this._regenTiles`.
   * @triggers Called once per game tick by the main game loop (presumably).
   * @performance O(R) where R is the number of tiles in `this._regenTiles`. This is an optimization over O(W * H) as only active resource nodes are processed. In a sparse or well-maintained world, R should be much smaller than W*H.
   */
```

**Function: `tickTrees`**
```javascript
/**
   * Advances the growth stage of all trees in the world.
   *
   * @description This method simulates the growth of trees by iterating through all tracked trees in `this.treeMap`. For each tree that has not reached its maximum growth stage (level 5), it increments its `growthTicks`. Once `growthTicks` reaches `CONFIG.TREE_TICKS_PER_STAGE`, the tree's `growth` level is incremented, and `growthTicks` is reset, signifying progression to the next growth stage.
   *
   * @workflow
   * 1. Iterate over the keys of `this.treeMap`.
   * 2. For each `key`, retrieve the `tree` object.
   * 3. If `tree.growth` is already 5 (maximum), skip to the next tree.
   * 4. Increment `tree.growthTicks`.
   * 5. If `tree.growthTicks` is greater than or equal to `CONFIG.TREE_TICKS_PER_STAGE`:
   *    - Increment `tree.growth`.
   *    - Reset `tree.growthTicks` to 0.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.treeMap, CONFIG.TREE_TICKS_PER_STAGE.
   * @modifies tree.growth, tree.growthTicks` for trees in `this.treeMap`.
   * @triggers Called once per game tick by `tickResources()`.
   * @performance O(T) where T is the number of trees in `this.treeMap`.
   */
```

**Function: `harvestTree`**
```javascript
/**
   * Harvests a tree at specified coordinates, removing it and returning its wood yield.
   *
   * @description This method allows a tree located at `(x, y)` to be harvested. It looks up the tree in `this.treeMap`. If a tree is found, its `growth` level determines the amount of wood yielded. The tree is then removed from the `treeMap`, and the harvested wood quantity is returned. If no tree exists at the given coordinates, it returns 0.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}` for the tree map lookup.
   * 2. Retrieve the `tree` object from `this.treeMap` using the `key`.
   * 3. If no `tree` is found (it's `null` or `undefined`), return 0.
   * 4. Store the `tree.growth` value as `wood`.
   * 5. Delete the tree entry from `this.treeMap` using the `key`.
   * 6. Return the `wood` amount.
   *
   * @param {number} x - The X-coordinate of the tree.
   * @param {number} y - The Y-coordinate of the tree.
   * @returns {number} The amount of wood harvested (equal to the tree's growth stage), or 0 if no tree was found.
   *
   * @dependencies this.treeMap.
   * @modifies this.treeMap (removes the harvested tree).
   * @triggers Called when an entity (e.g., a unit) attempts to harvest wood from a tile.
   * @performance O(1) constant time due to direct map lookup and deletion.
   */
```

**Function: `plantTree`**
```javascript
/**
   * Plants a new sapling at specified coordinates if conditions allow.
   *
   * @description This method attempts to plant a new tree at the given `(x, y)` coordinates. It first checks if a tree already exists at that location or if the tile is unsuitable (water or mountain). If conditions are met, a new tree object with initial growth (level 1) and growth ticks (0) is added to `this.treeMap`, and the method returns `true`. Otherwise, it returns `false`.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}`.
   * 2. Check if `this.treeMap[key]` already exists; if so, return `false`.
   * 3. Retrieve the tile at `(x, y)` using `this.getTile()`.
   * 4. If the tile is null (out of bounds) or its type is `CONFIG.TILE.WATER` or `CONFIG.TILE.MOUNTAIN`, return `false`.
   * 5. Create a new tree object `{ x, y, growth: 1, growthTicks: 0 }`.
   * 6. Add the new tree object to `this.treeMap` using the `key`.
   * 7. Return `true` to indicate successful planting.
   *
   * @param {number} x - The X-coordinate for planting.
   * @param {number} y - The Y-coordinate for planting.
   * @returns {boolean} `true` if the tree was successfully planted, `false` otherwise.
   *
   * @dependencies this.treeMap, this.getTile(), CONFIG.TILE.WATER, CONFIG.TILE.MOUNTAIN.
   * @modifies this.treeMap (adds a new tree).
   * @triggers Called when an entity (e.g., a unit) attempts to plant a tree.
   * @performance O(1) constant time due to map lookup and `getTile` which is also O(1).
   */
```

**Function: `getTreeAt`**
```javascript
/**
   * Retrieves a tree object at specific coordinates.
   *
   * @description This method allows direct lookup of a tree at a particular `(x, y)` location. It constructs a key from the coordinates and queries `this.treeMap`. If a tree exists at that precise location, the tree object is returned; otherwise, `null` is returned.
   *
   * @workflow
   * 1. Construct the `key` string `${x},${y}`.
   * 2. Return the value found at `this.treeMap[key]`, or `null` if it doesn't exist.
   *
   * @param {number} x - The X-coordinate to check.
   * @param {number} y - The Y-coordinate to check.
   * @returns {object|null} The tree object if found, otherwise `null`.
   *
   * @dependencies this.treeMap.
   * @modifies None.
   * @triggers Called when an entity needs to check for a tree at a specific location, or to interact with it.
   * @performance O(1) constant time due to direct map lookup.
   */
```

**Function: `getNearbyTree`**
```javascript
/**
   * Finds the nearest tree within a specified range of given coordinates.
   *
   * @description This method searches for the closest tree to a given `(x, y)` position, within an optional maximum `range`. It iterates through all trees in `this.treeMap`, calculates the Manhattan distance to each, and keeps track of the nearest tree found within the `range`.
   *
   * @workflow
   * 1. Initialize `nearest` to `null` and `nearestDist` to `Infinity`.
   * 2. Iterate over the keys of `this.treeMap`.
   * 3. For each `key`, retrieve the `tree` object.
   * 4. Calculate the Manhattan distance `d` between the input `(x, y)` and `tree.x`, `tree.y`.
   * 5. If `d` is less than or equal to `range` AND `d` is less than `nearestDist`:
   *    - Update `nearestDist` to `d`.
   *    - Set `nearest` to the current `tree`.
   * 6. After checking all trees, return the `nearest` tree found.
   *
   * @param {number} x - The X-coordinate to search from.
   * @param {number} y - The Y-coordinate to search from.
   * @param {number} [range=8] - The maximum Manhattan distance to consider a tree as "nearby". Defaults to 8.
   * @returns {object|null} The nearest tree object found within range, or `null` if no tree is within range.
   *
   * @dependencies this.treeMap.
   * @modifies None.
   * @triggers Called when an entity needs to locate a tree resource within its operational range.
   * @performance O(T) where T is the total number of trees in `this.treeMap`, as it iterates through all trees.
   */
```

**Function: `harvestTile`**
```javascript
/**
   * Harvests resources from a tile, reducing its resource amount and returning the yield.
   *
   * @description This method extracts resources from a `resourceNode` on a specific tile at `(tx, ty)`. It first validates if the tile exists and has a harvestable `resourceNode`. If so, it calculates the amount of each resource to take based on the `TILE_YIELD` configuration and an optional `multiplier`, then reduces the tile's `resourceNode.amount`. If the node is not fully depleted, the tile is marked for future regeneration.
   *
   * @workflow
   * 1. Retrieve the `tile` object at `(tx, ty)` using `this.getTile()`.
   * 2. If `tile` is null or `tile.resourceNode` is null, return `null`.
   * 3. Get the `node` (resourceNode) from the tile.
   * 4. If `node.amount` is less than 1 (no resources left), return `null`.
   * 5. Retrieve the `yieldTable` from `CONFIG.TILE_YIELD` based on `tile.type`.
   * 6. If `yieldTable` is null, return `null`.
   * 7. Initialize an empty object `gained` to store harvested resources.
   * 8. Iterate through each resource `res` and its `base` yield in `yieldTable`:
   *    - Calculate `take` as the minimum of `node.amount` and `base * multiplier`.
   *    - Add `take` to `gained[res]`.
   *    - Subtract `take` from `node.amount`.
   * 9. If `node.amount` is still less than `node.max` after harvesting, call `this._markTileNeedsRegen(tx, ty)`.
   * 10. Return the `gained` object containing harvested resources.
   *
   * @param {number} tx - The X-coordinate of the tile to harvest.
   * @param {number} ty - The Y-coordinate of the tile to harvest.
   * @param {number} [multiplier=1] - A multiplier to adjust the amount of resources harvested. Defaults to 1.
   * @returns {object|null} An object mapping resource names to harvested amounts, or `null` if the tile cannot be harvested.
   *
   * @dependencies this.getTile(), CONFIG.TILE_YIELD, this._markTileNeedsRegen().
   * @modifies tile.resourceNode.amount` for the harvested tile, `this._regenTiles` indirectly via `_markTileNeedsRegen`.
   * @triggers Called when an entity (e.g., a worker) harvests resources from a tile.
   * @performance O(1) constant time, as `getTile` is O(1) and the loop iterates over a small, fixed number of resource types.
   */
```

**Function: `isWalkable`**
```javascript
/**
   * Checks if a tile at specified coordinates is traversable by entities.
   *
   * @description This method determines whether an entity can walk on the tile located at `(x, y)`. It retrieves the tile using `getTile()` and returns `false` if the tile is out of bounds or if its type is `WATER` or `MOUNTAIN`, as defined in `CONFIG.TILE`. Otherwise, it returns `true`.
   *
   * @workflow
   * 1. Retrieve the `t` (tile) object at `(x, y)` using `this.getTile()`.
   * 2. If `t` is null (out of bounds), return `false`.
   * 3. Check if `t.type` is equal to `CONFIG.TILE.WATER` or `CONFIG.TILE.MOUNTAIN`.
   * 4. If it is either of these types, return `false`.
   * 5. Otherwise, return `true`.
   *
   * @param {number} x - The X-coordinate of the tile to check.
   * @param {number} y - The Y-coordinate of the tile to check.
   * @returns {boolean} `true` if the tile is walkable, `false` otherwise.
   *
   * @dependencies this.getTile(), CONFIG.TILE.WATER, CONFIG.TILE.MOUNTAIN.
   * @modifies None.
   * @triggers Called by pathfinding algorithms or unit movement logic to validate movement targets.
   * @performance O(1) constant time, dependent on `getTile` which is O(1).
   */
```

**Function: `getNeighbors`**
```javascript
/**
   * Returns a list of valid neighboring tile coordinates for a given hexagonal tile.
   *
   * @description This method calculates the coordinates of all six direct neighbors for a hexagonal tile at `(tx, ty)`. It accounts for the "odd-q" offset coordinate system, where the offsets for neighbors differ based on whether the `tx` (column) coordinate is even or odd. It then filters out any neighbor coordinates that fall outside the world's boundaries.
   *
   * @workflow
   * 1. Define `dirs`, an array of `[dx, dy]` offset pairs. The specific offsets depend on whether `tx` is even or odd (flat-top odd-q offset system).
   * 2. Map `dirs` to create a new array of objects `{ x: tx + dx, y: ty + dy }` for each potential neighbor.
   * 3. Filter this new array, keeping only those neighbor coordinates `n` where `n.x` is within `[0, W-1]` and `n.y` is within `[0, H-1]`.
   * 4. Return the filtered array of valid neighbor coordinates.
   *
   * @param {number} tx - The X-coordinate of the central tile.
   * @param {number} ty - The Y-coordinate of the central tile.
   * @returns {Array<object>} An array of objects, each with `x` and `y` properties, representing valid neighboring tile coordinates.
   *
   * @dependencies this.W, this.H.
   * @modifies None.
   * @triggers Called by pathfinding, area-of-effect calculations, or logic requiring adjacency information for hexagonal tiles.
   * @performance O(1) constant time, as it calculates for a fixed number of neighbors (6) and performs simple filtering.
   */
```

**Function: `dirs`**
```javascript
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
```

**Function: `setRoad`**
```javascript
/**
   * Marks a tile as having a road, if it's not a water tile.
   *
   * @description This method sets the `road` property of a tile at `(tx, ty)` to `true`. It first retrieves the tile using `getTile()` and checks if it exists and is not a water tile. Roads cannot be built on water tiles.
   *
   * @workflow
   * 1. Retrieve the `t` (tile) object at `(tx, ty)` using `this.getTile()`.
   * 2. If `t` exists AND `t.type` is not equal to `CONFIG.TILE.WATER`:
   *    - Set `t.road` to `true`.
   *
   * @param {number} tx - The X-coordinate of the tile to modify.
   * @param {number} ty - The Y-coordinate of the tile to modify.
   * @returns {void}
   *
   * @dependencies this.getTile(), CONFIG.TILE.WATER.
   * @modifies this.tiles[ty][tx].road.
   * @triggers Called when a road-building action is performed by an entity.
   * @performance O(1) constant time due to direct tile lookup and property modification.
   */
```

**Function: `addEntity`**
```javascript
/**
   * Adds a new entity to the world, assigns it an ID, and inserts it into the spatial hash.
   *
   * @description This method registers a new entity within the game world. It assigns a unique ID to the entity from `_nextEntityId`, adds it to the main `entities` list, and crucially, inserts it into the spatial hash grid for efficient proximity lookups.
   *
   * @workflow
   * 1. Assign `this._nextEntityId` to `entity.id`, then increment `this._nextEntityId`.
   * 2. Push the `entity` onto the `this.entities` array.
   * 3. Call `this._spatialInsert(entity)` to add the entity to the spatial hash grid.
   * 4. Return the added `entity` (now with its ID).
   *
   * @param {object} entity - The entity object to add.
   * @returns {object} The entity object after it has been assigned an ID and registered.
   *
   * @dependencies this._nextEntityId, this.entities, this._spatialInsert().
   * @modifies entity.id, this._nextEntityId, this.entities, this._spatialGrid, this._entityById, entity._spatialKey` (via `_spatialInsert`).
   * @triggers Called when new units, buildings, or other interactable objects are created and need to be part of the world.
   * @performance O(1) constant time on average, as array push and spatial insert are typically O(1).
   */
```

**Function: `removeEntity`**
```javascript
/**
   * Removes an entity from the world by its ID.
   *
   * @description This method de-registers an entity from the game world using its unique `id`. It first attempts to remove the entity from the spatial hash grid using `_spatialRemove()` for cleanup. Then, it filters the entity out of the main `this.entities` array, effectively removing it from the world.
   *
   * @workflow
   * 1. Retrieve the `entity` object from `this._entityById` using the provided `id`.
   * 2. If `entity` is found, call `this._spatialRemove(entity)` to remove it from the spatial hash and ID lookup.
   * 3. Filter `this.entities` to create a new array containing all entities except the one with the given `id`.
   * 4. Assign the new filtered array back to `this.entities`.
   *
   * @param {number} id - The unique ID of the entity to remove.
   * @returns {void}
   *
   * @dependencies this._entityById, this._spatialRemove(), this.entities.
   * @modifies this._entityById` and `this._spatialGrid` (via `_spatialRemove`), `this.entities`.
   * @triggers Called when an entity is destroyed, despawns, or otherwise needs to be removed from the game world.
   * @performance O(N) where N is the total number of entities, due to `this.entities.filter()`. Spatial removal is O(1) on average. This can be optimized if `this.entities` was also a map or a different data structure.
   */
```

**Function: `getEntitiesAt`**
```javascript
/**
   * Retrieves all entities located at a specific world coordinate `(x, y)`.
   *
   * @description This method efficiently finds all entities present at a precise `(x, y)` location using the spatial hash grid. It calculates the spatial key for the coordinates, retrieves potential entities from that grid cell, and then filters them to ensure only entities exactly at `(x, y)` are returned (since a cell can contain entities from nearby coordinates).
   *
   * @workflow
   * 1. Calculate the `key` for `(x, y)` using `this._spatialKey()`.
   * 2. Retrieve the `ids` (a Set of entity IDs) from `this._spatialGrid[key]`.
   * 3. If `ids` is null or empty, return an empty array.
   * 4. Initialize an empty array `result`.
   * 5. Iterate through each `id` in the `ids` Set:
   *    - Retrieve the actual `e` (entity) object from `this._entityById[id]`.
   *    - If `e` exists AND its `x` and `y` coordinates exactly match the input `x` and `y`:
   *        - Add `e` to the `result` array.
   * 6. Return the `result` array.
   *
   * @param {number} x - The X-coordinate to check.
   * @param {number} y - The Y-coordinate to check.
   * @returns {Array<object>} An array of entity objects found at `(x, y)`. Returns an empty array if no entities are found.
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById.
   * @modifies None.
   * @triggers Called when interactions need to target entities at a specific tile, such as combat, resource gathering, or construction.
   * @performance O(C) where C is the number of entities within the relevant spatial grid cell. This is typically much faster than O(N) (total entities) for sparse entity distributions.
   */
```

**Function: `hasEnemyWall`**
```javascript
/**
   * Checks if an enemy wall belonging to a different tribe blocks a specific tile.
   *
   * @description This method determines if a particular `(x, y)` tile is occupied by a wall entity that belongs to an opposing tribe. It uses the spatial hash grid to efficiently find entities at the given coordinates. If any entity at `(x, y)` is a `CONFIG.ENTITY.WALL` and its `tribe` ID does not match `myTribeId`, the method returns `true`.
   *
   * @workflow
   * 1. Calculate the `key` for `(x, y)` using `this._spatialKey()`.
   * 2. Retrieve the `ids` (a Set of entity IDs) from `this._spatialGrid[key]`.
   * 3. If `ids` is null, return `false`.
   * 4. Iterate through each `id` in the `ids` Set:
   *    - Retrieve the actual `e` (entity) object from `this._entityById[id]`.
   *    - If `e` exists AND its `type` is `CONFIG.ENTITY.WALL` AND its `tribe` is not `myTribeId` AND its `x` and `y` coordinates exactly match the input `x` and `y`:
   *        - Return `true` immediately.
   * 5. If the loop completes without finding an enemy wall, return `false`.
   *
   * @param {number} x - The X-coordinate to check for an enemy wall.
   * @param {number} y - The Y-coordinate to check for an enemy wall.
   * @param {string} myTribeId - The ID of the current tribe to differentiate friendly from enemy walls.
   * @returns {boolean} `true` if an enemy wall is found at `(x, y)`, `false` otherwise.
   *
   * @dependencies this._spatialKey(), this._spatialGrid, this._entityById, CONFIG.ENTITY.WALL.
   * @modifies None.
   * @triggers Called by unit movement, pathfinding, or attack logic to determine if a tile is blocked by an enemy structure.
   * @performance O(C) where C is the number of entities within the relevant spatial grid cell. Faster than O(N) by leveraging the spatial hash.
   */
```

**Function: `getEntitiesByTribe`**
```javascript
/**
   * Filters and returns all entities belonging to a specific tribe.
   *
   * @description This method provides a way to retrieve a collection of all entities in the world that are associated with a given `tribeId`. It iterates through the main `this.entities` array and creates a new array containing only those entities whose `tribe` property matches the input `tribeId`.
   *
   * @workflow
   * 1. Use the `filter` method on `this.entities`.
   * 2. For each `e` (entity) in `this.entities`, include `e` in the new array if `e.tribe` is equal to `tribeId`.
   * 3. Return the resulting filtered array.
   *
   * @param {string} tribeId - The ID of the tribe whose entities are to be retrieved.
   * @returns {Array<object>} An array of entity objects belonging to the specified tribe.
   *
   * @dependencies this.entities.
   * @modifies None.
   * @triggers Called by tribe AI or management logic to get an overview of its units or buildings.
   * @performance O(N) where N is the total number of entities in the world, as it iterates through the entire `this.entities` array.
   */
```

**Function: `countTerritory`**
```javascript
/**
   * Returns the cached territory count for a specified tribe, recomputing if necessary.
   *
   * @description This method provides the number of tiles owned by a `tribeId`. It leverages a cached `_territoryCount` to return the value quickly. If the `_territoryDirty` flag is set (indicating a change in territory ownership), it first triggers a full recomputation of territory counts across the entire map before returning the result.
   *
   * @workflow
   * 1. Check if `this._territoryDirty` is `true`.
   * 2. If `true`:
   *    - Call `this._recomputeTerritoryCount()` to update the cache.
   *    - Set `this._territoryDirty` to `false`.
   * 3. Return the count for `tribeId` from `this._territoryCount`, defaulting to 0 if not found.
   *
   * @param {string} tribeId - The ID of the tribe (e.g., 'a' or 'b') for which to count territory.
   * @returns {number} The number of tiles owned by the specified tribe.
   *
   * @dependencies this._territoryDirty, this._recomputeTerritoryCount(), this._territoryCount.
   * @modifies this._territoryDirty, this._territoryCount` (indirectly via `_recomputeTerritoryCount`).
   * @triggers Called by game logic, UI, or AI that needs to know a tribe's territory size.
   * @performance O(1) if cache is clean. O(W * H) if `_recomputeTerritoryCount` is triggered, which happens only when territory changes.
   */
```

**Function: `_recomputeTerritoryCount`**
```javascript
/**
   * Fully recomputes the territory count for all tribes by scanning the entire map.
   *
   * @description This private method performs a comprehensive scan of every tile in the game world to determine ownership. It resets the `_territoryCount` cache and then iterates through all `(x, y)` coordinates, incrementing the count for the respective `owner` of each tile. This ensures the `_territoryCount` cache is accurate after any changes to tile ownership.
   *
   * @workflow
   * 1. Reset `this._territoryCount` to `{ a: 0, b: 0 }`.
   * 2. Iterate through each `y` coordinate from `0` to `this.H - 1`.
   * 3. For each `y`, iterate through each `x` coordinate from `0` to `this.W - 1`.
   * 4. Retrieve the `owner` property of the current tile `this.tiles[y][x]`.
   * 5. If an `owner` is present (not null), increment the corresponding count in `this._territoryCount[owner]`.
   *
   * @param {void}
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles.
   * @modifies this._territoryCount.
   * @triggers Called by `countTerritory()` only when the `_territoryDirty` flag is set.
   * @performance O(W * H) as it iterates through every tile on the map. This is an expensive operation but is optimized to run only when needed.
   */
```

**Function: `updateTerritory`**
```javascript
/**
   * Recalculates and updates tile ownership based on building influence of two tribes.
   *
   * @description This method reassigns tile ownership across the map for two specified tribes (`tribeA` and `tribeB`). It first clears all existing non-water tile ownership. Then, for each building of both tribes, it marks tiles within a specific radius (determined by building type) as owned by that tribe. This simulation reflects how buildings expand territorial control. After updating, it flags the territory count as dirty for recomputation.
   *
   * @workflow
   * 1. Clear `owner` property for all non-water tiles in `this.tiles` to `null`.
   * 2. Define a local helper function `mark(tx, ty, tribe, radius)`:
   *    - Calculates a square bounding box around `(tx, ty)` with `radius`.
   *    - Iterates through tiles `(nx, ny)` within this box.
   *    - If `(nx, ny)` is within the circular `radius` of `(tx, ty)` (using `dx*dx + dy*dy > r2`) AND the tile is not `CONFIG.TILE.WATER`:
   *        - If the tile has no `owner`, assign `tribe` as its `owner`.
   * 3. Define a local helper function `getRadius(btype)`:
   *    - Returns 7 for `CONFIG.ENTITY.CAPITOL`.
   *    - Returns 5 for `CONFIG.ENTITY.FORT`.
   *    - Returns 2 for other building types.
   * 4. For each building in `tribeA.buildings`:
   *    - Call `mark()` with building's `x`, `y`, tribe 'a', and `getRadius(b.type)`.
   * 5. For each building in `tribeB.buildings`:
   *    - Call `mark()` with building's `x`, `y`, tribe 'b', and `getRadius(b.type)`.
   * 6. Set `this._territoryDirty` to `true` to signal that territory counts need recomputation.
   * 7. Increment `this._territoryGen` for internal tracking.
   *
   * @param {object} tribeA - The first tribe object, containing a `buildings` array.
   * @param {object} tribeB - The second tribe object, containing a `buildings` array.
   * @returns {void}
   *
   * @dependencies this.W, this.H, this.tiles, CONFIG.TILE.WATER, CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.FORT.
   * @modifies this.tiles[y][x].owner` for many tiles, `this._territoryDirty`, `this._territoryGen`.
   * @triggers Called whenever tribe buildings are added, removed, or the game state requires a territory re-evaluation.
   * @performance O(W * H + (B_A + B_B) * R^2) where W*H is for clearing owners, B_A and B_B are number of buildings for tribe A and B, and R is the maximum radius of influence (7). Can be significant, so only run when territory changes.
   */
```

**Function: `mark`**
```javascript
/**
     * Marks tiles within a specified radius around a point as owned by a tribe.
     *
     * @description This local helper function, used within `updateTerritory`, iterates through a square bounding box around a central point `(tx, ty)` with a given `radius`. For each tile within this square that also falls within the circular `radius` and is not a water tile, it attempts to assign `tribe` as its `owner` if the tile is currently unowned.
     *
     * @workflow
     * 1. Calculate `r2` (radius squared) for circular distance check.
     * 2. Determine `yMin`, `yMax`, `xMin`, `xMax` for a square bounding box, clamped to world boundaries.
     * 3. Iterate `ny` from `yMin` to `yMax`.
     * 4. For each `ny`, iterate `nx` from `xMin` to `xMax`.
     * 5. Calculate `dx` and `dy` from `nx, ny` to `tx, ty`.
     * 6. If `dx*dx + dy*dy` is greater than `r2`, skip (outside circular radius).
     * 7. Retrieve tile `t` at `(ny, nx)`.
     * 8. If `t.type` is `CONFIG.TILE.WATER`, skip.
     * 9. If `t.owner` is currently null, set `t.owner` to `tribe`.
     *
     * @param {number} tx - The X-coordinate of the center of influence.
     * @param {number} ty - The Y-coordinate of the center of influence.
     * @param {string} tribe - The ID of the tribe ('a' or 'b') that will own the tiles.
     * @param {number} radius - The radius of influence around the center point.
     * @returns {void}
     *
     * @dependencies this.W, this.H, this.tiles, CONFIG.TILE.WATER.
     * @modifies this.tiles[ny][nx].owner` for affected tiles.
     * @triggers Called by `updateTerritory` for each building of a tribe.
     * @performance O(radius^2) due to nested loops iterating within the square bounding box.
     */
```

**Function: `getRadius`**
```javascript
/**
     * Determines the territory influence radius for a given building type.
     *
     * @description This local helper function, used within `updateTerritory`, takes a `btype` (building type) and returns an integer representing the radius of territory influence that building exerts. Capitols have the largest influence, followed by forts, and then other buildings have a smaller, default radius.
     *
     * @workflow
     * 1. If `btype` is `CONFIG.ENTITY.CAPITOL`, return 7.
     * 2. Else if `btype` is `CONFIG.ENTITY.FORT`, return 5.
     * 3. Otherwise (default case), return 2.
     *
     * @param {string} btype - The type of the building (e.g., `CONFIG.ENTITY.CAPITOL`).
     * @returns {number} The radius of influence for the specified building type.
     *
     * @dependencies CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.FORT.
     * @modifies None.
     * @triggers Called by `updateTerritory` for each building to determine its influence range for the `mark` function.
     * @performance O(1) constant time due to simple conditional checks.
     */
```

**Function: `findNearestWalkable`**
```javascript
/**
   * Finds the nearest walkable tile to a given coordinate within a limited search radius.
   *
   * @description This method searches for the closest walkable tile to a starting point `(x, y)`. It uses an expanding spiral search pattern, checking tiles in concentric squares around the starting point up to a radius of 10. The first walkable tile encountered is returned. If no walkable tile is found within this radius, it defaults to returning the original `(x, y)` coordinates.
   *
   * @workflow
   * 1. Iterate `r` (radius) from `0` to `9`.
   * 2. For each `r`, iterate `dy` from `-r` to `r`.
   * 3. For each `dy`, iterate `dx` from `-r` to `r`.
   * 4. Calculate candidate coordinates `nx = x + dx` and `ny = y + dy`.
   * 5. Call `this.isWalkable(nx, ny)`.
   * 6. If `isWalkable` returns `true`, immediately return `{ x: nx, y: ny }`.
   * 7. If the loops complete without finding a walkable tile, return the original `{ x, y }`.
   *
   * @param {number} x - The starting X-coordinate for the search.
   * @param {number} y - The starting Y-coordinate for the search.
   * @returns {object} An object `{ x, y }` representing the coordinates of the nearest walkable tile, or the original coordinates if none found within radius 10.
   *
   * @dependencies this.isWalkable().
   * @modifies None.
   * @triggers Called when an entity needs to be placed or moved to a valid, walkable tile near a specific point.
   * @performance O(R^2) where R is the search radius (max 10). In the worst case, it checks `(2R+1)^2` tiles. Given R=10, this is `21*21 = 441` calls to `isWalkable`, which is O(1). So overall, it's a fixed small number of operations.
   */
```

**Function: `notifyEntityMoved`**
```javascript
/**
   * Informs the spatial hash grid that an entity has changed its position.
   *
   * @description This method acts as a public interface for the internal spatial hash system. It receives an entity object and delegates to the private `_spatialMove` method, ensuring that the entity's position is correctly updated within the spatial grid. This is crucial for maintaining the efficiency of spatial queries after an entity (like a unit) moves.
   *
   * @workflow
   * 1. Call `this._spatialMove(entity)`.
   *
   * @param {object} entity - The entity object that has moved.
   * @returns {void}
   *
   * @dependencies this._spatialMove().
   * @modifies this._spatialGrid`, `this._entityById`, `entity._spatialKey` (indirectly via `_spatialMove`).
   * @triggers Called by the `Tribe` or unit logic whenever an entity's `x` or `y` coordinates are updated.
   * @performance O(1) on average, delegated to `_spatialMove`.
   */
```

---

### File: `js/ages.js`

#### Functions

**Function: `getAgeByYear`**
```javascript
/**
 * Retrieves the historical age object corresponding to a given year.
 *
 * @description This function iterates through the `AGES` array in reverse order to find the correct historical age. It checks if the provided year falls within or after the `yearStart` of an age. This approach ensures that if a year falls into the range of a later age, that specific age is returned, otherwise it defaults to the earliest age.
 *
 * @workflow
 * 1. Initialize a loop counter `i` to `AGES.length - 1` (the last index of the `AGES` array).
 * 2. Continue the loop as long as `i` is greater than or equal to `0`.
 * 3. In each iteration, check if the input `year` is greater than or equal to `AGES[i].yearStart`.
 * 4. If the condition is true, return the `AGES[i]` object immediately.
 * 5. If the loop completes without finding a matching age (i.e., the year is before the `yearStart` of the first age), return `AGES[0]` (the Stone Age).
 *
 * @param {number} year - The specific year for which to find the corresponding historical age.
 * @returns {object} The age object from the `AGES` array that encompasses the given year, or the first age (`AGES[0]`) if no later age matches.
 *
 * @dependencies AGES (global constant array).
 * @modifies None.
 * @triggers Called when a specific historical age needs to be determined based on a year, likely for displaying game state or applying year-based logic.
 * @performance O(n) where `n` is the number of ages in the `AGES` array, as it iterates through the array in the worst case.
 */
```

**Function: `getAgeIndex`**
```javascript
/**
 * Finds the index of an age in the `AGES` array based on its unique ID.
 *
 * @description This utility function searches the `AGES` array for an age object whose `id` property matches the provided `ageId`. It leverages the `findIndex` method for efficient searching. This is useful for internal operations that require an age's position within the ordered list.
 *
 * @workflow
 * 1. Call the `findIndex` method on the global `AGES` array.
 * 2. Pass a callback function `a => a.id === ageId` to `findIndex`.
 * 3. The callback compares the `id` property of each age object (`a`) with the input `ageId`.
 * 4. `findIndex` returns the index of the first element for which the callback returns true, or -1 if no element satisfies the condition.
 *
 * @param {string} ageId - The unique identifier of the age to find (e.g., 'stone', 'bronze').
 * @returns {number} The zero-based index of the age in the `AGES` array, or -1 if the `ageId` is not found.
 *
 * @dependencies AGES (global constant array).
 * @modifies None.
 * @triggers Called internally by other functions (e.g., `getNextAge`) that need to locate an age by its ID to perform subsequent operations.
 * @performance O(n) where `n` is the number of ages in the `AGES` array, as `findIndex` iterates through the array in the worst case.
 */
```

**Function: `getNextAge`**
```javascript
/**
 * Retrieves the next chronological age object following a given current age.
 *
 * @description This function first determines the index of the `currentAgeId` using `getAgeIndex`. It then checks if there is an age at the subsequent index in the `AGES` array. If the current age is not the last age in the sequence, it returns the next age object; otherwise, it returns `null` to indicate that no further age exists.
 *
 * @workflow
 * 1. Call `getAgeIndex` with `currentAgeId` to get the index of the current age. Store this in `idx`.
 * 2. Check if `idx` is less than `AGES.length - 1`. This condition verifies if the current age is not the last age in the array.
 * 3. If the condition is true, return the age object at `AGES[idx + 1]`.
 * 4. If the condition is false (meaning `idx` is the last index or `currentAgeId` was not found), return `null`.
 *
 * @param {string} currentAgeId - The ID of the current historical age.
 * @returns {object|null} The next chronological age object, or `null` if the current age is the last one in the sequence or the `currentAgeId` is invalid.
 *
 * @dependencies AGES (global constant array), getAgeIndex.
 * @modifies None.
 * @triggers Called when advancing the game's historical epoch or displaying information about the upcoming age.
 * @performance O(n) due to the call to `getAgeIndex`, where `n` is the number of ages in the `AGES` array.
 */
```

---

### File: `js/renderer.js`

#### Functions

**Function: `constructor`**
```javascript
/**
   * Initializes the Renderer instance, setting up canvas context, camera state, internal buffers, and event listeners.
   *
   * @description This constructor establishes the foundational state for rendering the game world. It takes a canvas element, gets its 2D rendering context, and initializes camera properties like position and zoom. It also sets up various internal flags, caches, and buffers for performance optimization, such as the color cache, hex corner offsets, and the offscreen tile buffer. Finally, it binds event handlers for user interaction and resizes the canvas to fit its container.
   *
   * @workflow
   * 1. Assign the provided `canvas` to `this.canvas`.
   * 2. Obtain the 2D rendering context from the canvas and assign it to `this.ctx`.
   * 3. Initialize `camX`, `camY` to 0, and `zoom` to `CONFIG.CAM_ZOOM_DEFAULT`.
   * 4. Calculate `TW` and `TH` based on `CONFIG.HEX_SIZE` and `CONFIG.HEX_V_SCALE`.
   * 5. Initialize private properties for drag state, mouse position, hovered entity, and hover throttle.
   * 6. Initialize arrays for weather particles (`_clouds`, `_rainDrops`, `_snowFlakes`), current weather type, and lightning flash state.
   * 7. Initialize `_colorCache` for performance.
   * 8. Initialize `_hexCornersZoom`, `_hexCorners`, and `_hexCornersVS` for hex geometry pre-computation.
   * 9. Initialize offscreen tile buffer properties (`_tileCanvas`, `_tileCtx`, `_tileBufDirty`, `_tileBufZoom`, `_tileBufCamX`, `_tileBufCamY`, `_tileBufW`, `_tileBufH`, `_tileBufPadding`) and external dirty signals (`_tileBufWeatherType`, `_tileBufTerritoryGen`, `_territoryGen`).
   * 10. Call `_setupEvents()` to set up mouse and wheel event listeners.
   * 11. Call `_resize()` to set initial canvas dimensions and camera position.
   * 12. Call `_initWeatherParticles()` to initialize weather effects.
   * 13. Add a `resize` event listener to the window to call `_resize()` on window dimension changes.
   *
   * @param {HTMLCanvasElement} canvas - The HTML canvas element to render upon.
   * @returns {void}
   *
   * @dependencies CONFIG.CAM_ZOOM_DEFAULT, CONFIG.HEX_SIZE, CONFIG.HEX_V_SCALE, CONFIG.WEATHER.SUNSHINE, window.addEventListener, this._setupEvents(), this._resize(), this._initWeatherParticles()
   * @modifies this.canvas, this.ctx, this.camX, this.camY, this.zoom, this.TW, this.TH, this._drag, this._dragStart, this._camStart, this._mouseX, this._mouseY, this._hoveredEntity, this._hoverFrame, this._clouds, this._rainDrops, this._snowFlakes, this._currentWeatherType, this._lightningFlash, this._colorCache, this._hexCornersZoom, this._hexCorners, this._hexCornersVS, this._tileCanvas, this._tileCtx, this._tileBufDirty, this._tileBufZoom, this._tileBufCamX, this._tileBufCamY, this._tileBufW, this._tileBufH, this._tileBufPadding, this._tileBufWeatherType, this._tileBufTerritoryGen, this._territoryGen, this.W, this.H
   * @triggers Instantiated once at application startup.
   * @performance O(1) for initialization, though some initial calls (`_resize`, `_initWeatherParticles`) involve loops.
   */
```

**Function: `markTilesDirty`**
```javascript
/**
   * Marks the offscreen tile buffer as dirty, forcing a re-render during the next frame.
   *
   * @description This method is crucial for ensuring that the tile layer, which is rendered to an offscreen buffer for performance, reflects any changes in the game state. When called, it invalidates the current tile buffer by setting a flag and increments a generation counter. This signals to the renderer that the tiles need to be redrawn to the buffer before being blitted to the main canvas.
   *
   * @workflow
   * 1. Set `this._tileBufDirty` to `true`.
   * 2. Increment `this._territoryGen` by 1.
   *
   * @returns {void}
   *
   * @dependencies None explicitly, but relies on game state updates.
   * @modifies this._tileBufDirty, this._territoryGen
   * @triggers Called by `game.js` (or similar game logic) whenever the underlying territory/tile state changes, such as after `updateTerritory()` completes.
   * @performance O(1)
   */
```

**Function: `_resize`**
```javascript
/**
   * Adjusts the canvas dimensions to match its CSS size and re-centers the camera on the map, marking the tile buffer dirty.
   *
   * @description This private method responds to changes in the renderer's container size. It updates the canvas `width` and `height` properties to match the client's `offsetWidth` and `offsetHeight`. After adjusting the canvas dimensions, it calculates a new camera position to keep the center of the game map visually centered on the screen. Finally, it flags the tile buffer as dirty to ensure the rendered tiles scale correctly with the new canvas size.
   *
   * @workflow
   * 1. Set `this.canvas.width` to `this.canvas.offsetWidth`.
   * 2. Set `this.canvas.height` to `this.canvas.offsetHeight`.
   * 3. Update `this.W` and `this.H` to the new canvas width and height.
   * 4. Calculate the screen coordinates (`p.sx`, `p.sy`) for the center tile of the map (`CONFIG.MAP_W / 2`, `CONFIG.MAP_H / 2`) using `_tileToScreen`.
   * 5. Adjust `this.camX` and `this.camY` to center the calculated `p.sx`, `p.sy` on the canvas.
   * 6. Set `this._tileBufDirty` to `true`.
   *
   * @returns {void}
   *
   * @dependencies CONFIG.MAP_W, CONFIG.MAP_H, this.canvas.offsetWidth, this.canvas.offsetHeight, this._tileToScreen()
   * @modifies this.canvas.width, this.canvas.height, this.W, this.H, this.camX, this.camY, this._tileBufDirty
   * @triggers Called during `Renderer` construction and whenever the browser `window` emits a `resize` event.
   * @performance O(1)
   */
```

**Function: `_setupEvents`**
```javascript
/**
   * Configures event listeners on the canvas for mouse interactions (dragging, hover) and zooming.
   *
   * @description This private method attaches event listeners to the rendering canvas to enable user input. It handles `mousedown` to initiate dragging, `mousemove` to update mouse coordinates and pan the camera if dragging, `mouseup` and `mouseleave` to stop dragging, and `wheel` to control the camera zoom level. The zoom functionality includes clamping values within a defined min/max range.
   *
   * @workflow
   * 1. Get a reference to `this.canvas`.
   * 2. Add a `mousedown` listener:
   *    - Set `this._drag` to `true`.
   *    - Store current mouse coordinates in `this._dragStart`.
   *    - Store current camera position in `this._camStart`.
   * 3. Add a `mousemove` listener:
   *    - Update `this._mouseX` and `this._mouseY` based on event client coordinates relative to canvas.
   *    - If `this._drag` is `true`, update `this.camX` and `this.camY` to pan the camera based on drag delta.
   * 4. Add a `mouseup` listener:
   *    - Set `this._drag` to `false`.
   * 5. Add a `mouseleave` listener:
   *    - Set `this._drag` to `false`.
   *    - Reset `this._mouseX` and `this._mouseY` to sentinel values.
   * 6. Add a `wheel` listener:
   *    - Prevent default scrolling behavior.
   *    - Determine `zoomDelta` based on scroll direction.
   *    - Update `this.zoom` by multiplying with `zoomDelta`, clamping between `CONFIG.CAM_ZOOM_MIN` and `CONFIG.CAM_ZOOM_MAX`.
   *
   * @returns {void}
   *
   * @dependencies CONFIG.CAM_ZOOM_MIN, CONFIG.CAM_ZOOM_MAX, this.canvas, this.W, this.H
   * @modifies this._drag, this._dragStart, this._camStart, this._mouseX, this._mouseY, this.camX, this.camY, this.zoom
   * @triggers Called once during `Renderer` construction.
   * @performance O(1) for event setup. Each event handler is O(1) per event.
   */
```

**Function: `_updateHexCorners`**
```javascript
/**
   * Pre-computes the screen-space corner offsets for a hexagonal tile based on the current zoom level.
   *
   * @description This private method calculates and caches the six vertex offsets for a standard hexagonal tile. These offsets are crucial for efficiently drawing hex tiles without re-calculating trigonometric values for each tile. The calculation is only performed if the zoom level has changed since the last update, ensuring that the geometry scales correctly with the view while avoiding redundant computations.
   *
   * @workflow
   * 1. Check if `this._hexCornersZoom` is equal to the current `this.zoom`. If so, return immediately as no update is needed.
   * 2. Update `this._hexCornersZoom` to the current `this.zoom`.
   * 3. Calculate `sz` as `CONFIG.HEX_SIZE * this.zoom`.
   * 4. Get `vs` from `CONFIG.HEX_V_SCALE`.
   * 5. Initialize `this._hexCorners` as an empty array.
   * 6. Loop `i` from 0 to 5 (inclusive):
   *    - Calculate angle `a` as `Math.PI / 3 * i`.
   *    - Push an object `{ dx: sz * Math.cos(a), dy: sz * Math.sin(a) * vs }` to `this._hexCorners`.
   *
   * @returns {void}
   *
   * @dependencies CONFIG.HEX_SIZE, CONFIG.HEX_V_SCALE
   * @modifies this._hexCornersZoom, this._hexCorners
   * @triggers Called internally by `_renderTileBuffer()` before drawing tiles to ensure hex geometry is up-to-date with the current zoom.
   * @performance O(1) as it's a fixed loop of 6 iterations.
   */
```

**Function: `_tileToScreen`**
```javascript
/**
   * Converts game world tile coordinates (tx, ty) to screen-space world coordinates (sx, sy) before camera and zoom transformations.
   *
   * @description This private utility function takes a tile's grid coordinates (`tx`, `ty`) and converts them into an isometric screen coordinate system. It accounts for the staggered layout of pointy-top hexagons, where odd columns are offset vertically. This base conversion is crucial for positioning all elements within the game world correctly before applying camera pan and zoom.
   *
   * @workflow
   * 1. Get `sz` from `CONFIG.HEX_SIZE` and `vs` from `CONFIG.HEX_V_SCALE`.
   * 2. Calculate `sq3` as `Math.sqrt(3)`.
   * 3. Calculate `sx` as `tx * sz * 1.5`.
   * 4. Determine `col0` by flooring `tx`.
   * 5. Calculate `frac` as the fractional part of `tx`.
   * 6. Calculate `off0`: 0.5 if `col0` is odd, else 0.0.
   * 7. Calculate `off1`: 0.5 if `(col0 + 1)` is odd, else 0.0.
   * 8. Calculate `off` by interpolating between `off0` and `off1` using `frac`.
   * 9. Calculate `sy` as `(ty + off) * sq3 * sz * vs`.
   * 10. Return an object `{ sx, sy }`.
   *
   * @param {number} tx - The tile's X-coordinate in the game grid.
   * @param {number} ty - The tile's Y-coordinate in the game grid.
   * @returns {{sx: number, sy: number}} An object containing the screen-space world X (sx) and Y (sy) coordinates.
   *
   * @dependencies CONFIG.HEX_SIZE, CONFIG.HEX_V_SCALE
   * @modifies None.
   * @triggers Called by various rendering functions to position tiles, entities, and calculate world bounds, e.g., `_resize()`, `_renderTileBuffer()`, `_findHoveredEntity()`, `_drawTooltip()`, `_drawBuilding()`, `_drawUnit()`, `_drawBattleLine()`, `_drawAttackLines()`, `_drawTowerBeams()`.
   * @performance O(1)
   */
```

**Function: `off0`**
```javascript
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
```

**Function: `off1`**
```javascript
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
```

**Function: `sy`**
```javascript
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
```

**Function: `_worldToScreen`**
```javascript
/**
   * Transforms a world-space coordinate to a pixel coordinate on the canvas, applying camera pan and zoom.
   *
   * @description This private utility function converts a given world-space coordinate pair (`sx`, `sy`) into actual pixel coordinates (`x`, `y`) on the renderer's canvas. It applies the current camera offset (`this.camX`, `this.camY`) and zoom level (`this.zoom`), effectively translating and scaling world positions to the viewport. This is fundamental for rendering any game object in its correct screen location.
   *
   * @workflow
   * 1. Calculate `x` by subtracting `this.camX` from `sx`, multiplying by `this.zoom`, and adding half of `this.W`.
   * 2. Calculate `y` by subtracting `this.camY` from `sy`, multiplying by `this.zoom`, and adding half of `this.H`.
   * 3. Return an object `{ x, y }`.
   *
   * @param {number} sx - The world-space X-coordinate.
   * @param {number} sy - The world-space Y-coordinate.
   * @returns {{x: number, y: number}} An object containing the pixel X and Y coordinates on the canvas.
   *
   * @dependencies this.camX, this.camY, this.zoom, this.W, this.H
   * @modifies None.
   * @triggers Called by rendering functions to position elements on the screen, such as `_findHoveredEntity()`, `_drawTooltip()`, `_drawBuilding()`, `_drawUnit()`, `_drawBattleLine()`, `_drawAttackLines()`, `_drawTowerBeams()`.
   * @performance O(1)
   */
```

**Function: `_worldToScreenParallax`**
```javascript
/**
   * Transforms a world-space coordinate to a pixel coordinate on the canvas with parallax scrolling, applying camera pan and zoom.
   *
   * @description This private utility function is similar to `_worldToScreen` but incorporates a parallax effect. It takes world-space coordinates and applies camera pan and zoom, but the camera's influence on the X and Y coordinates can be independently scaled by `px` and `py` factors. This is typically used for background elements like clouds to make them appear further away by moving them slower than the foreground.
   *
   * @workflow
   * 1. Calculate `x` by subtracting `this.camX * px` from `sx`, multiplying by `this.zoom`, and adding half of `this.W`.
   * 2. Calculate `y` by subtracting `this.camY * py` from `sy`, multiplying by `this.zoom`, and adding half of `this.H`.
   * 3. Return an object `{ x, y }`.
   *
   * @param {number} sx - The world-space X-coordinate.
   * @param {number} sy - The world-space Y-coordinate.
   * @param {number} px - The parallax factor for the X-axis (how much `camX` affects `sx`).
   * @param {number} [py=px] - The parallax factor for the Y-axis (defaults to `px` if not provided).
   * @returns {{x: number, y: number}} An object containing the pixel X and Y coordinates on the canvas with parallax applied.
   *
   * @dependencies this.camX, this.camY, this.zoom, this.W, this.H
   * @modifies None.
   * @triggers Called by `_drawWeatherParticles()` for rendering parallax background elements like clouds.
   * @performance O(1)
   */
```

**Function: `_screenToWorld`**
```javascript
/**
   * Converts a pixel coordinate on the canvas back to a world-space coordinate.
   *
   * @description This private utility function performs the inverse transformation of `_worldToScreen`. Given pixel coordinates (`x`, `y`) on the canvas, it calculates the corresponding world-space coordinates (`sx`, `sy`) by reversing the camera pan and zoom operations. This is essential for converting user input (e.g., mouse clicks) from screen space to game world coordinates.
   *
   * @workflow
   * 1. Calculate `sx` by subtracting half of `this.W` from `x`, dividing by `this.zoom`, and adding `this.camX`.
   * 2. Calculate `sy` by subtracting half of `this.H` from `y`, dividing by `this.zoom`, and adding `this.camY`.
   * 3. Return an object `{ sx, sy }`.
   *
   * @param {number} x - The pixel X-coordinate on the canvas.
   * @param {number} y - The pixel Y-coordinate on the canvas.
   * @returns {{sx: number, sy: number}} An object containing the world-space X (sx) and Y (sy) coordinates.
   *
   * @dependencies this.camX, this.camY, this.zoom, this.W, this.H
   * @modifies None.
   * @triggers Called by `_getVisibleTileBounds()` and `_renderTileBuffer()` to determine the visible area in world coordinates.
   * @performance O(1)
   */
```

**Function: `_getVisibleTileBounds`**
```javascript
/**
   * Calculates the minimum and maximum tile coordinates currently visible on screen, with padding.
   *
   * @description This private method determines the rectangular range of tile coordinates that are within or slightly outside the current viewport. It converts padded screen corners to world coordinates and then to tile coordinates. This bounding box is used to efficiently iterate only over tiles that need to be drawn, optimizing rendering performance by avoiding computations for off-screen elements.
   *
   * @workflow
   * 1. Define a padding value `pad`.
   * 2. Convert the top-left (`-pad`, `-pad`) and bottom-right (`this.W + pad`, `this.H + pad`) screen coordinates to world coordinates using `this._screenToWorld()`.
   * 3. Determine `minSx`, `maxSx`, `minSy`, `maxSy` from the converted world coordinates.
   * 4. Calculate `sxStep` and `syStep` based on `CONFIG.HEX_SIZE` and `CONFIG.HEX_V_SCALE`.
   * 5. Estimate `xMin`, `xMax`, `yMin`, `yMax` by dividing world bounds by step sizes and applying an additional buffer.
   * 6. Clamp `xMin`, `yMin` to `0` and `xMax`, `yMax` to `world.W - 1` and `world.H - 1` respectively, ensuring they stay within map boundaries.
   * 7. Return an object `{ xMin, xMax, yMin, yMax }`.
   *
   * @param {object} world - The game world object, containing `W` and `H` for map dimensions.
   * @returns {{xMin: number, xMax: number, yMin: number, yMax: number}} An object containing the minimum and maximum tile X and Y indices.
   *
   * @dependencies CONFIG.HEX_SIZE, CONFIG.HEX_V_SCALE, this.W, this.H, this._screenToWorld()
   * @modifies None.
   * @triggers Potentially used by a main render loop (though `_renderTileBuffer` has its own similar calculation).
   * @performance O(1)
   */
```

**Function: `_updateWorldBounds`**
```javascript
/**
   * Calculates and stores the min/max screen-space world coordinates covered by the entire game map.
   *
   * @description This private method computes the overall bounding box of the entire game world in screen-space world coordinates. It does this by converting the four corner tiles of the game map into screen coordinates and then finding the minimum and maximum X and Y values among them. This `_worldBounds` property is useful for culling off-screen weather particles and other global calculations.
   *
   * @workflow
   * 1. Convert the four corner tile coordinates (0,0), (world.W-1, 0), (0, world.H-1), and (world.W-1, world.H-1) to screen-space world coordinates using `this._tileToScreen()`.
   * 2. Calculate `minSx`, `maxSx`, `minSy`, `maxSy` by finding the minimum and maximum values among the `sx` and `sy` components of the four corner points.
   * 3. Store these bounds in `this._worldBounds`.
   *
   * @param {object} world - The game world object, containing `W` and `H` for map dimensions.
   * @returns {void}
   *
   * @dependencies this._tileToScreen()
   * @modifies this._worldBounds
   * @triggers Called once per `render` frame to ensure world bounds are updated, especially after camera changes or zoom, though the actual values don't change unless `world.W` or `world.H` change.
   * @performance O(1)
   */
```

**Function: `_isOnScreen`**
```javascript
/**
   * Checks if a given screen pixel coordinate is currently within the visible canvas area, optionally with a margin.
   *
   * @description This private utility function determines whether a point represented by screen pixel coordinates (`x`, `y`) falls within the boundaries of the canvas. An optional `margin` can be provided to extend the "on-screen" area, allowing objects slightly off-screen to still be considered visible, which helps prevent pop-in effects. This is used for culling rendered elements.
   *
   * @workflow
   * 1. Check if `x` is greater than `-margin` AND `x` is less than `this.W + margin`.
   * 2. Check if `y` is greater than `-margin` AND `y` is less than `this.H + margin`.
   * 3. Return `true` if both conditions are met, otherwise `false`.
   *
   * @param {number} x - The screen pixel X-coordinate.
   * @param {number} y - The screen pixel Y-coordinate.
   * @param {number} [margin=100] - An optional padding around the screen bounds to consider elements visible.
   * @returns {boolean} `true` if the coordinate is on screen (with margin), `false` otherwise.
   *
   * @dependencies this.W, this.H
   * @modifies None.
   * @triggers Called by `_drawBuilding()`, `_drawUnit()`, and `_drawWeatherParticles()` to cull elements that are not visible.
   * @performance O(1)
   */
```

**Function: `_isTileBufferValid`**
```javascript
/**
   * Checks if the offscreen tile buffer is up-to-date and suitable for reuse in the current frame.
   *
   * @description This private method determines if the existing offscreen tile buffer can be blitted directly to the main canvas or if it needs to be re-rendered. It checks several conditions, including whether an explicit `_tileBufDirty` flag is set, if the zoom or canvas dimensions have changed, if the weather type has shifted, or if the camera has panned beyond a specified padding threshold. This intelligent caching mechanism significantly boosts rendering performance by avoiding redundant tile drawing.
   *
   * @workflow
   * 1. If `this._tileBufDirty` is `true`, return `false`.
   * 2. If `this._tileBufZoom` does not match `this.zoom`, return `false`.
   * 3. If `this._tileBufW` does not match `this.W` or `this._tileBufH` does not match `this.H`, return `false`.
   * 4. Extract the current weather type, defaulting to 'sunshine' if `weather` is undefined. If it doesn't match `this._tileBufWeatherType`, return `false`.
   * 5. Check `this._tileBufTerritoryGen` against `this._worldRef?._territoryGen`. If they don't match, return `false`.
   * 6. Calculate the absolute difference (`dx`, `dy`) between the current camera position (`this.camX`, `this.camY`) and the camera position when the buffer was last rendered (`this._tileBufCamX`, `this._tileBufCamY`).
   * 7. If `dx` is greater than `this._tileBufPadding` OR `dy` is greater than `this._tileBufPadding`, return `false`.
   * 8. If all checks pass, return `true`.
   *
   * @param {object} weather - The current weather object, potentially containing a `type` property.
   * @returns {boolean} `true` if the tile buffer is valid and can be reused, `false` otherwise.
   *
   * @dependencies this.zoom, this.W, this.H, this.camX, this.camY, this._tileBufDirty, this._tileBufZoom, this._tileBufW, this._tileBufH, this._tileBufWeatherType, this._tileBufTerritoryGen, this._tileBufCamX, this._tileBufCamY, this._tileBufPadding, this._worldRef
   * @modifies None.
   * @triggers Called at the beginning of the `render()` loop to decide whether to reuse or regenerate the tile buffer.
   * @performance O(1)
   */
```

**Function: `_ensureTileBuffer`**
```javascript
/**
   * Creates or resizes the offscreen canvas used for tile rendering to match the necessary dimensions.
   *
   * @description This private method guarantees that an offscreen canvas (`_tileCanvas`) and its 2D rendering context (`_tileCtx`) are available and correctly sized for the tile buffer. It calculates the required buffer dimensions by adding padding to the main canvas's width and height. If the buffer canvas doesn't exist or its dimensions don't match the required size, a new canvas is created and its context obtained, preparing it for a fresh tile render.
   *
   * @workflow
   * 1. Calculate `bw` (buffer width) and `bh` (buffer height) by adding `this._tileBufPadding * 2` to `this.W` and `this.H` respectively.
   * 2. Check if `this._tileCanvas` is null OR `this._tileCanvas.width` does not equal `bw` OR `this._tileCanvas.height` does not equal `bh`.
   * 3. If any of the conditions in step 2 are true:
   *    - Create a new `canvas` element and assign it to `this._tileCanvas`.
   *    - Set `this._tileCanvas.width` to `bw`.
   *    - Set `this._tileCanvas.height` to `bh`.
   *    - Get the 2D rendering context from `this._tileCanvas` and assign it to `this._tileCtx`.
   *
   * @returns {void}
   *
   * @dependencies this.W, this.H, this._tileBufPadding
   * @modifies this._tileCanvas, this._tileCtx
   * @triggers Called by `_renderTileBuffer()` before drawing tiles to the buffer.
   * @performance O(1), involving DOM creation/manipulation only when the buffer size changes.
   */
```

**Function: `_renderTileBuffer`**
```javascript
/**
   * Renders all visible hexagonal tiles to an offscreen canvas buffer for performance optimization.
   *
   * @description This private method is responsible for drawing the entire tile layer of the game world onto an offscreen canvas. It first ensures the buffer is correctly sized, then clears it. It calculates the extended bounds of tiles that could be visible within the padded buffer area, converts them to screen coordinates, and iterates through them. For each tile, it calls `_drawTileToBuffer` to render its specific details, and then updates the buffer's metadata to reflect its current camera, zoom, and state.
   *
   * @workflow
   * 1. Call `this._ensureTileBuffer()` to prepare the offscreen canvas.
   * 2. Get a reference to `this._tileCtx` and the buffer dimensions (`bw`, `bh`).
   * 3. Clear the entire buffer canvas using `bufCtx.clearRect(0, 0, bw, bh)`.
   * 4. Calculate `pad` from `this._tileBufPadding`.
   * 5. Convert the screen corners `(-pad - 140, -pad - 140)` and `(this.W + pad + 140, this.H + pad + 140)` to world coordinates using `this._screenToWorld()`.
   * 6. Determine `minSx`, `maxSx`, `minSy`, `maxSy` from the converted world coordinates.
   * 7. Calculate `sxStep` and `syStep` based on `CONFIG.HEX_SIZE` and `CONFIG.HEX_V_SCALE`.
   * 8. Determine the `xMin`, `xMax`, `yMin`, `yMax` range of tiles to draw by converting world bounds to tile indices and clamping them within `world.W` and `world.H`.
   * 9. Call `this._updateHexCorners()` to ensure hex geometry is up-to-date.
   * 10. Get the pre-computed `corners` and scale `sz` for rendering.
   * 11. Loop through `y` from `yMin` to `yMax`:
   *     - Loop through `x` from `xMin` to `xMax`:
   *       - Get the `tile` object from `world.tiles[y][x]`.
   *       - Convert tile coordinates (`x`, `y`) to screen-space world coordinates (`p.sx`, `p.sy`) using `this._tileToScreen()`.
   *       - Convert `p.sx`, `p.sy` to buffer pixel coordinates (`bx`, `by`) by applying camera offset, zoom, and padding.
   *       - If the tile is outside a significantly padded buffer area, `continue` to the next tile.
   *       - Call `this._drawTileToBuffer(bufCtx, x, y, tile, bx, by, sz, vs, corners)`.
   * 12. Update `this._tileBufCamX`, `this._tileBufCamY`, `this._tileBufZoom`, `this._tileBufW`, `this._tileBufH`, `this._tileBufWeatherType`, `this._tileBufTerritoryGen`, and set `this._tileBufDirty` to `false` to mark the buffer as current.
   *
   * @param {object} world - The game world object containing `tiles` and dimensions (`W`, `H`).
   * @param {object} weather - The current weather object, used for `_tileBufWeatherType`.
   * @returns {void}
   *
   * @dependencies CONFIG.HEX_SIZE, CONFIG.HEX_V_SCALE, this.W, this.H, this.camX, this.camY, this.zoom, this._tileCtx, this._tileCanvas, this._tileBufPadding, this._ensureTileBuffer(), this._screenToWorld(), this._updateHexCorners(), this._tileToScreen(), this._drawTileToBuffer()
   * @modifies this._tileCtx, this._tileBufCamX, this._tileBufCamY, this._tileBufZoom, this._tileBufW, this._tileBufH, this._tileBufWeatherType, this._tileBufTerritoryGen, this._tileBufDirty
   * @triggers Called by `render()` when `_isTileBufferValid()` returns `false`.
   * @performance O(N), where N is the number of visible tiles (potentially N * constant factors for detail rendering). Optimizations like culling and an offscreen buffer are used.
   */
```

**Function: `bx`**
```javascript
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
```

**Function: `by`**
```javascript
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
```

**Function: `_drawTileToBuffer`**
```javascript
/**
   * Draws a single hexagonal game tile and its details onto the provided canvas context.
   *
   * @description This highly optimized private method draws a single hexagonal tile, including its base color, depth faces (at higher zoom), territory tint, road overlays, grid lines, and various detail sprites like trees or resource icons. It takes pre-computed corner offsets and buffer coordinates for efficiency. The level of detail rendered is dynamically adjusted based on the current zoom level, from a simple filled hexagon at very low zooms to full sprite details at high zooms.
   *
   * @workflow
   * 1. Get the `color` for the tile using `this._getTileColor()`.
   * 2. Translate the pre-computed `corners` offsets to the tile's buffer position (`sx`, `sy`) to get absolute corner coordinates.
   * 3. **If `this.zoom < 0.18` (Ultra-low LOD):**
   *    - Begin a new path, move to `c0x, c0y`, draw lines to `c1x` through `c5x`, close the path.
   *    - Set `ctx.fillStyle` to `color` and `ctx.fill()`.
   *    - Return.
   * 4. **If `this.zoom >= 0.3` (Medium LOD - draw depth faces):**
   *    - Calculate `depthY` based on `tile.type` and `CONFIG.TILE` constants.
   *    - If `depthY > 0`:
   *      - Set `ctx.fillStyle` to `this._darken(color, 0.45)`. Draw and fill the bottom-left depth face (c3-c4 extended).
   *      - Set `ctx.fillStyle` to `this._darken(color, 0.3)`. Draw and fill the bottom depth face (c4-c5 extended).
   *      - Set `ctx.fillStyle` to `this._darken(color, 0.18)`. Draw and fill the bottom-right depth face (c5-c0 extended).
   * 5. **Draw Main Hex Face:**
   *    - Begin a new path, move to `c0x, c0y`, draw lines to `c1x` through `c5x`, close the path.
   *    - Set `ctx.fillStyle` to `color` and `ctx.fill()`.
   * 6. **If `tile.owner` exists:**
   *    - Set `ctx.fillStyle` to a semi-transparent color based on `tile.owner`.
   *    - Call `ctx.fill()` (reusing the existing path).
   * 7. **If `tile.road` exists:**
   *    - Set `ctx.fillStyle` for the road.
   *    - Call `ctx.fill()`.
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth` for the road.
   *    - Call `ctx.stroke()`.
   * 8. **If `this.zoom > 0.3` (Medium+ zoom - draw grid lines):**
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth`.
   *    - Call `ctx.stroke()` (reusing the existing path).
   * 9. **If `this.zoom > 0.45` (High zoom - draw detail sprites):**
   *    - **If `tile.type` is `FOREST` or `JUNGLE`:**
   *      - Retrieve `tree` from `this._worldRef.treeMap`.
   *      - If `tree` exists, call `this._drawTreeSprite()` with appropriate parameters.
   *    - **If `tile.type` is `MOUNTAIN`:** Draw a simple triangular mountain peak.
   *    - **If `tile.type` is `WETLAND`:** Draw arcs for water ripples.
   *    - **If `tile.type` is `SNOW` or `TUNDRA`:** Draw small white circles for snow patches.
   * 10. **If `this.zoom > 0.55` (Resource icons):**
   *     - If `tile.resourceNode` exists and `amount >= 5`:
   *       - Calculate `frac` of resource amount.
   *       - Determine icon character and color based on `CONFIG.TILE_YIELD` and `res`.
   *       - Set `ctx.globalAlpha`, `ctx.fillStyle`, `ctx.font`, `ctx.textAlign`, `ctx.textBaseline`.
   *       - Draw text using `ctx.fillText()`.
   *       - Reset `ctx.globalAlpha` to 1.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the offscreen buffer.
   * @param {number} tx - The tile's X-coordinate in the game grid.
   * @param {number} ty - The tile's Y-coordinate in the game grid.
   * @param {object} tile - The tile object containing its type, owner, road status, and resource node.
   * @param {number} sx - The buffer pixel X-coordinate for the tile's center.
   * @param {number} sy - The buffer pixel Y-coordinate for the tile's center.
   * @param {number} sz - The scaled hex size for the current zoom level.
   * @param {number} vs - The vertical scale factor for hexes (`CONFIG.HEX_V_SCALE`).
   * @param {Array<object>} corners - Pre-computed hex corner offsets [{dx, dy}] for the current zoom.
   * @returns {void}
   *
   * @dependencies CONFIG.TILE.*, CONFIG.TILE_YIELD, CONFIG.HEX_V_SCALE, this.zoom, this._worldRef, this._getTileColor(), this._darken(), this._drawTreeSprite()
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_renderTileBuffer()` for each visible tile.
   * @performance O(1) per tile, with variable constant factors based on zoom level and tile features (number of drawing operations).
   */
```

**Function: `_findHoveredEntity`**
```javascript
/**
   * Identifies the game entity (unit or building) currently under the mouse cursor.
   *
   * @description This private method iterates through all active buildings and units belonging to both tribes to determine which, if any, is currently being hovered over by the mouse. It converts each entity's world position to screen coordinates and checks if the mouse cursor falls within a circular hit area around that entity. The closest entity to the mouse is selected as the `_hoveredEntity`.
   *
   * @workflow
   * 1. Initialize `best` to `null` and `bestDist` to `Infinity`.
   * 2. Combine `tribeA.buildings`, `tribeB.buildings`, `tribeA.units`, and `tribeB.units` into a single `all` array.
   * 3. Loop through each `e` (entity) in `all`:
   *    - Calculate the entity's effective world tile X (`ex`) and Y (`ey`) coordinates, accounting for potential lerped positions (`_lx`, `_ly`) and offsets (`_ox`, `_oy`, `_gaitY`).
   *    - Convert `ex`, `ey` to screen-space world coordinates (`p.sx`, `p.sy`) using `this._tileToScreen()`.
   *    - Convert `p.sx`, `p.sy` to canvas pixel coordinates (`s.x`, `s.y`) using `this._worldToScreen()`.
   *    - Determine `isBuilding` based on `CONFIG.BUILDING_HP`.
   *    - Calculate the entity's interaction radius `r` (larger for buildings, smaller for units).
   *    - Calculate the Euclidean distance `dist` between the mouse coordinates (`mx`, `my`) and the entity's screen position (`s.x`, `s.y`).
   *    - If `dist` is less than `r` AND `dist` is less than `bestDist`:
   *      - Set `best` to `e`.
   *      - Set `bestDist` to `dist`.
   * 4. Return `best`.
   *
   * @param {number} mx - The mouse X-coordinate on the canvas.
   * @param {number} my - The mouse Y-coordinate on the canvas.
   * @param {object} tribeA - The object representing Tribe A, containing `buildings` and `units` arrays.
   * @param {object} tribeB - The object representing Tribe B, containing `buildings` and `units` arrays.
   * @returns {object|null} The entity object being hovered over, or `null` if no entity is under the cursor.
   *
   * @dependencies CONFIG.BUILDING_HP, this.TH, this.zoom, this._tileToScreen(), this._worldToScreen()
   * @modifies None.
   * @triggers Called at a throttled rate (every 3 frames) by the `render()` loop to update the `_hoveredEntity`.
   * @performance O(N), where N is the total number of buildings and units in the game. This could be significant for very large maps/armies.
   */
```

**Function: `ex`**
```javascript
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
```

**Function: `ey`**
```javascript
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
```

**Function: `_drawTooltip`**
```javascript
/**
   * Renders a detailed tooltip displaying information about a given game entity.
   *
   * @description This private method draws a contextual information box next to a specified `entity`. The tooltip dynamically adjusts its content and position based on whether the entity is a building or a unit, displaying relevant details like HP, tribe name, level, and unit stats. It also handles repositioning the tooltip if it would go off-screen and provides visual cues for entities under attack.
   *
   * @workflow
   * 1. If `entity` is `null`, return immediately.
   * 2. Calculate the entity's effective world tile X (`ex`) and Y (`ey`) coordinates, accounting for potential lerped positions (`_lx`, `_ly`) and offsets (`_ox`, `_oy`, `_gaitY`).
   * 3. Convert `ex`, `ey` to screen-space world coordinates (`p.sx`, `p.sy`) using `this._tileToScreen()`.
   * 4. Convert `p.sx`, `p.sy` to canvas pixel coordinates (`s.x`, `s.y`) using `this._worldToScreen()`.
   * 5. Determine `isBuilding` based on `CONFIG.BUILDING_HP`.
   * 6. Prepare various label strings for `label`, `tribeName`, `hpPct`, `level`, and `state`.
   * 7. Initialize `lines` array with primary information.
   * 8. If `!isBuilding` and `entity.stats` exist, add unit stats lines.
   * 9. If `!isBuilding` and `entity.hunger` exists, add a hunger bar line.
   * 10. If `isBuilding` and `entity._underAttack` is true, add an 'UNDER ATTACK' line.
   * 11. Get `this.ctx` and define `pad`, `lh`, `fSize`.
   * 12. Set `ctx.font` and calculate `maxW` from the widest line.
   * 13. Calculate `bw` (tooltip width) and `bh` (tooltip height).
   * 14. Determine initial `bx` and `by` for tooltip position relative to the entity.
   * 15. Adjust `bx` if the tooltip would extend beyond `this.W`, and `by` if it would extend above 0.
   * 16. Set `ctx.fillStyle` to background color, `ctx.strokeStyle` to tribe color, and `ctx.lineWidth`.
   * 17. If `ctx.roundRect` is supported:
   *     - Begin path, draw `ctx.roundRect()`, `ctx.fill()`, `ctx.stroke()`.
   * 18. Else (fallback for `roundRect`):
   *     - Draw `ctx.fillRect()` and `ctx.strokeRect()`.
   * 19. Set `ctx.textAlign` to 'left' and `ctx.textBaseline` to 'top'.
   * 20. Loop through `lines` to draw each line:
   *     - Set `ctx.fillStyle` and `ctx.font` based on the line content (e.g., gold for first line, red for 'UNDER ATTACK').
   *     - Draw text using `ctx.fillText()`.
   *
   * @param {object} entity - The game entity for which to draw the tooltip.
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_HP, CONFIG.BUILDING_MAX_LEVEL, CONFIG.HUNGER_MAX, this.TH, this.zoom, this.W, this.H, this.ctx, this._tileToScreen(), this._worldToScreen()
   * @modifies The `this.ctx` (draws shapes and text, sets styles).
   * @triggers Called by the `render()` loop if `this._hoveredEntity` is not null.
   * @performance O(L), where L is the number of lines in the tooltip, due to text measurement and drawing operations.
   */
```

**Function: `_getTileColor`**
```javascript
/**
   * Determines the final rendered color for a tile, blending its base type color with an owner's territory tint.
   *
   * @description This private method takes a tile object and, optionally, colors for Tribe A and Tribe B. It first retrieves the base color corresponding to the tile's `type` from a predefined map. If the tile has an `owner` ('a' or 'b'), it then blends this base color with the specified tribe color to create a tinted appearance, visually representing territory control.
   *
   * @workflow
   * 1. Define `baseColors` map for all `CONFIG.TILE` types.
   * 2. Get the `base` color from `baseColors` using `tile.type`, defaulting to a green if not found.
   * 3. If `tile.owner` is 'a', blend `base` with `tribeAColor` by 20% using `this._blendColor()`.
   * 4. If `tile.owner` is 'b', blend `base` with `tribeBColor` by 20% using `this._blendColor()`.
   * 5. Return the final `base` color.
   *
   * @param {object} tile - The tile object, containing `type` and `owner` properties.
   * @param {string} tribeAColor - The hex or rgb string color for Tribe A.
   * @param {string} tribeBColor - The hex or rgb string color for Tribe B.
   * @returns {string} The final CSS color string (e.g., 'rgb(R,G,B)') for the tile.
   *
   * @dependencies CONFIG.TILE.*, this._blendColor()
   * @modifies None.
   * @triggers Called by `_drawTileToBuffer()` for each tile being rendered to determine its fill color.
   * @performance O(1)
   */
```

**Function: `_blendColor`**
```javascript
/**
   * Blends two RGB colors by a specified interpolation factor.
   *
   * @description This private utility function takes two CSS color strings (`c1`, `c2`) and an interpolation factor (`t`, where 0 <= t <= 1). It parses both colors into their RGB components, then linearly interpolates between their red, green, and blue values based on `t`. The result is a new `rgb()` color string that represents the blend. It relies on `_parseColor` to convert color strings to RGB arrays.
   *
   * @workflow
   * 1. Parse `c1` into `p1` (an [R,G,B] array) using `this._parseColor()`.
   * 2. Parse `c2` into `p2` (an [R,G,B] array) using `this._parseColor()`.
   * 3. Calculate `r` by interpolating between `p1[0]` and `p2[0]` using `t`, then rounding.
   * 4. Calculate `g` by interpolating between `p1[1]` and `p2[1]` using `t`, then rounding.
   * 5. Calculate `b` by interpolating between `p1[2]` and `p2[2]` using `t`, then rounding.
   * 6. Return the blended color as an `rgb(r,g,b)` string.
   *
   * @param {string} c1 - The first CSS color string (e.g., '#RRGGBB' or 'rgb(R,G,B)').
   * @param {string} c2 - The second CSS color string.
   * @param {number} t - The interpolation factor, a float between 0 and 1. 0 returns `c1`, 1 returns `c2`.
   * @returns {string} The blended color as an 'rgb(R,G,B)' string.
   *
   * @dependencies this._parseColor()
   * @modifies None.
   * @triggers Called by `_getTileColor()` to apply territory tints.
   * @performance O(1)
   */
```

**Function: `_parseColor`**
```javascript
/**
   * Parses a hex or RGB color string into an `[R, G, B]` array, utilizing a cache for efficiency.
   *
   * @description This private utility function converts a CSS color string (either hexadecimal like '#RRGGBB' or RGB like 'rgb(R,G,B)') into a numerical array `[red, green, blue]`. It first checks an internal `_colorCache` to avoid re-parsing frequently used colors. If the color is not cached, it uses regular expressions to extract the RGB components. If parsing fails, it defaults to a grey color. The parsed result is then stored in the cache for future use.
   *
   * @workflow
   * 1. Check if `color` exists in `this._colorCache`. If so, return the cached value.
   * 2. Try to match `color` against a hex pattern using `color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)`.
   * 3. If `hex` matches:
   *    - Parse the hex components to integers and store in `result`.
   * 4. Else, try to match `color` against an RGB pattern using `color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i)`.
   * 5. If `rgb` matches:
   *    - Parse the RGB components to integers and store in `result`.
   * 6. Else (no match):
   *    - Set `result` to `[128, 128, 128]` (grey).
   * 7. Store `result` in `this._colorCache[color]`.
   * 8. Return `result`.
   *
   * @param {string} color - The CSS color string to parse (e.g., '#RRGGBB' or 'rgb(R,G,B)').
   * @returns {number[]} An array `[R, G, B]` representing the color components.
   *
   * @dependencies None.
   * @modifies this._colorCache
   * @triggers Called by `_blendColor()` and `_darken()` to process color strings.
   * @performance O(1) on cache hit. O(L) on cache miss, where L is the length of the color string for regex matching, but very fast in practice due to small string length and caching.
   */
```

**Function: `_darken`**
```javascript
/**
   * Darkens a given color by a specified factor, returning a new `rgb()` color string.
   *
   * @description This private utility function takes a CSS color string and a darkening `factor` (a float between 0 and 1). It first parses the input color into its RGB components using `_parseColor`. Then, it multiplies each R, G, and B component by `(1 - factor)` to reduce its intensity, effectively making the color darker. The resulting `rgb()` string is returned.
   *
   * @workflow
   * 1. Parse `color` into an `[r, g, b]` array using `this._parseColor()`.
   * 2. Calculate new `r`, `g`, `b` values by multiplying each component by `(1 - factor)` and rounding.
   * 3. Return the darkened color as an `rgb(r,g,b)` string.
   *
   * @param {string} color - The CSS color string to darken.
   * @param {number} factor - The darkening factor, a float between 0 and 1. 0 means no change, 1 means black.
   * @returns {string} The darkened color as an 'rgb(R,G,B)' string.
   *
   * @dependencies this._parseColor()
   * @modifies None.
   * @triggers Called by `_drawTileToBuffer()` to render depth faces and by various `_drawBuilding` methods for shading.
   * @performance O(1)
   */
```

**Function: `_drawTreeSprite`**
```javascript
/**
   * Draws a multi-stage tree sprite onto the canvas, varying detail based on growth stage and type.
   *
   * @description This private method renders a polygonal tree sprite at a given `x, y` coordinate. The appearance of the tree is determined by its `stage` of growth (1 to 5) and whether it's a `Jungle` type, influencing its colors and complexity. The size of the tree scales with the `zoom` level. This function effectively represents the visual progression of tree growth within the game world.
   *
   * @workflow
   * 1. Calculate base `s` (size) from `zoom * 5`.
   * 2. Define `darkCol`, `midCol`, `lightCol`, `trunkCol` based on `isJungle`.
   * 3. Use a `switch` statement on `stage` (defaulting to 5 if `stage` is unknown):
   *    - **Case 1 (Seedling):** Draw a single, small circular canopy.
   *    - **Case 2:** Draw a short rectangular trunk and a triangular canopy.
   *    - **Case 3:** Draw a slightly taller trunk and two stacked triangular canopies.
   *    - **Case 4:** Draw a taller trunk and two larger stacked triangular canopies.
   *    - **Case 5 (Full-grown):** Draw the tallest trunk and three distinct stacked triangular canopies with varying shades.
   * 4. For each case, set `ctx.fillStyle`, define a path with `ctx.beginPath()`, `ctx.moveTo()`, `ctx.lineTo()` (or `ctx.arc()`), `ctx.closePath()`, and call `ctx.fill()`.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the tree's base.
   * @param {number} y - The screen Y-coordinate for the tree's base (offset for vertical scaling).
   * @param {number} zoom - The current zoom level, influencing sprite scale.
   * @param {number} stage - The growth stage of the tree (1-5).
   * @param {boolean} [isJungle=false] - `true` if the tree is a jungle tree, influencing its color palette.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawTileToBuffer()` when rendering `FOREST` or `JUNGLE` tiles at high zoom.
   * @performance O(1) as it draws a fixed number of primitive shapes based on `stage`.
   */
```

**Function: `_drawBuilding`**
```javascript
/**
   * Renders a specific game building sprite at its screen position, including health bars and damage indicators.
   *
   * @description This private method draws a single `entity` that is identified as a building. It first checks if the building is on-screen to perform frustum culling. Then, it uses a `switch` statement to call the appropriate specialized drawing function based on the building's `type` (e.g., `_drawCapitol`, `_drawFort`). After drawing the base building, it adds visual overlays such as a health bar if the building is damaged, a pulsing red outline if it's under attack, and a level indicator if applicable, all scaled by zoom.
   *
   * @workflow
   * 1. Convert `entity.x`, `entity.y` to screen pixel coordinates (`sPos.x`, `sPos.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   * 2. If `sPos` is not on screen (checked by `this._isOnScreen()`), return.
   * 3. Get `this.ctx` and calculate `tw`, `th`, `s` (scaled dimensions based on zoom).
   * 4. Determine `isA` (if tribe 'a'), `color`, `darkColor`, `lightColor`, `roofColor` based on the entity's tribe.
   * 5. Use a `switch` statement on `entity.type` to call the appropriate `_draw[BuildingType]` helper function, passing `ctx`, `sPos.x`, `sPos.y`, `tw`, `th`, `s`, and color variants.
   * 6. **If `hpFrac < 1` (damaged):**
   *    - Calculate health bar width `bw` and Y-position `barY` (based on building type specific `topOffsets`).
   *    - Draw a dark background rectangle for the health bar.
   *    - Draw a colored foreground rectangle for current HP, color-coded by HP percentage.
   * 7. **If `entity._underAttack` is greater than 0:**
   *    - Calculate `topY` based on building type specific `topOffsets`.
   *    - Calculate `pulse` intensity.
   *    - Save `ctx` state.
   *    - Set `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.shadowColor`, `ctx.shadowBlur`.
   *    - Draw a pulsing stroke rectangle around the building.
   *    - Restore `ctx` state.
   * 8. **If `s > 0.55` and `entity.level > 1`:**
   *    - Calculate `lbx` and `lby` for level text position.
   *    - Set `ctx.fillStyle`, `ctx.font`, `ctx.textAlign`.
   *    - Draw "LvX" text using `ctx.fillText()`.
   *
   * @param {object} entity - The building entity object to draw, containing properties like `x`, `y`, `type`, `tribe`, `hp`, `maxHp`, `level`, `_underAttack`.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.*, CONFIG.BUILDING_HP, this.TW, this.TH, this.zoom, this.ctx, this._tileToScreen(), this._worldToScreen(), this._isOnScreen(), this._drawCapitol(), this._drawFort(), ..., this._drawWall(), this._darken()
   * @modifies The `this.ctx` (draws shapes, fills, strokes, sets styles, potentially `globalAlpha`, `shadowBlur`).
   * @triggers Called by the `render()` loop for each visible building.
   * @performance O(1) per building, with fixed constant factors for drawing operations.
   */
```

**Function: `_drawCapitol`**
```javascript
/**
   * Draws a capitol building sprite onto the canvas.
   *
   * @description This private method renders the detailed visual representation of a Capitol building. It constructs the building using various colored rectangles and an ellipse, giving it a distinct shape and shading. At higher zoom levels, it includes additional details like columns on the building facade. The colors used are derived from the building's tribe to ensure consistent theming.
   *
   * @workflow
   * 1. Define `w` and `h` for the main body dimensions relative to `tw`, `th`.
   * 2. Set `ctx.fillStyle` to `lightColor` and draw a wide base rectangle.
   * 3. Draw the main body rectangle.
   * 4. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 5. **If `s > 0.45` (medium+ zoom):**
   *    - Define `colW`.
   *    - Set `ctx.fillStyle` to a slightly darker `lightColor`.
   *    - Loop 4 times to draw vertical column rectangles.
   * 6. Set `ctx.fillStyle` to `darkColor` and draw a horizontal band.
   * 7. Set `ctx.fillStyle` to `color` and draw an upper body rectangle.
   * 8. Set `ctx.fillStyle` to `roofColor` and draw a small rectangular base for the dome.
   * 9. Draw and fill an ellipse for the dome.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.CAPITOL`.
   * @performance O(1) due to a fixed number of drawing operations.
   */
```

**Function: `_drawFort`**
```javascript
/**
   * Draws a fort building sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Fort building. It constructs the fort using several rectangles to form the main body and two flanking towers. The top of the fort features battlements, which are drawn as a series of small rectangles. The colors used are theme-appropriate shades of the building's tribe color.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body and `tW`, `tH` for the towers.
   * 2. Set `ctx.fillStyle` to a slightly darker shade of `color` (using `this._darken`).
   * 3. Draw two rectangular towers on either side of the main fort body.
   * 4. Set `ctx.fillStyle` to `color` and draw the main rectangular body of the fort.
   * 5. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 6. Define `mW` and `mH` for the battlements.
   * 7. Loop 5 times to draw individual battlement rectangles on top of the main body.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.FORT`.
   * @performance O(1) due to a fixed number of drawing operations and loops with constant iterations.
   */
```

**Function: `_drawBarracks`**
```javascript
/**
   * Draws a barracks building sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Barracks building. It consists of a rectangular main structure with a triangular roof. At higher zoom levels, a small flagpole with a banner is added to the peak of the roof. The colors used reflect the building's tribe theme.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body dimensions.
   * 2. Set `ctx.fillStyle` to `color` and draw the main rectangular body.
   * 3. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 4. Set `ctx.fillStyle` to `roofColor`.
   * 5. Begin a path, define a triangle for the roof using `ctx.moveTo()` and `ctx.lineTo()`, close the path, and fill it.
   * 6. **If `s > 0.45` (medium+ zoom):**
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth` for the flagpole.
   *    - Draw a vertical line for the flagpole.
   *    - Set `ctx.fillStyle` for the banner.
   *    - Draw and fill a triangular banner shape.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.BARRACKS`.
   * @performance O(1) due to a fixed number of drawing operations.
   */
```

**Function: `_drawFarm`**
```javascript
/**
   * Draws a farm building sprite with associated fields, scaling based on entity size and level.
   *
   * @description This private method renders the visual representation of a Farm building, including its main structure, two side silos, and surrounding agricultural fields. The size of the farm and the number of furrows in its fields dynamically scale with the `entity.size` and `entity.level` properties. At sufficient zoom, the fields are drawn with a semi-transparent fill and stroke to indicate furrows. The farm building itself has a rounded roof and a stylized door.
   *
   * @workflow
   * 1. Get `size` and `lv` from the `entity` (defaulting to 1 if not present).
   * 2. Calculate `sizeScale`, `w`, `h` for the main building and `sW`, `sH` for silos based on `size` and `lv`.
   * 3. **If `s > 0.22` (low+ zoom):**
   *    - Calculate `fieldW`, `fieldH` for the surrounding field.
   *    - Set `ctx.fillStyle` for the field and draw a rectangle.
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth` for furrows.
   *    - Calculate `furrows` count (based on `size`).
   *    - Loop `furrows` times to draw horizontal furrow lines across the field.
   * 4. Calculate X positions (`s1x`, `s2x`) for the two silos.
   * 5. Set `ctx.fillStyle` to a slightly darker shade of `color` (using `this._darken`).
   * 6. Draw two rectangular silo bodies.
   * 7. Set `ctx.fillStyle` to `roofColor`.
   * 8. Draw and fill two ellipses for the silo roofs.
   * 9. Set `ctx.fillStyle` to `color` and draw the main rectangular farm building.
   * 10. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 11. Set `ctx.fillStyle` to `roofColor`.
   * 12. Draw and fill an ellipse for the main building's roof.
   * 13. **If `s > 0.5` (medium+ zoom - draw door):**
   *     - Define `dW`, `dH` for the door.
   *     - Set `ctx.fillStyle` to `darkColor`.
   *     - Draw a rectangular door body.
   *     - Draw and fill an arc for the rounded top of the door.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @param {object} entity - The farm entity object, containing `size` and `level` properties.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.FARM`.
   * @performance O(1) due to fixed number of drawing operations and a loop with constant iterations (furrows).
   */
```

**Function: `_drawTower`**
```javascript
/**
   * Draws a tower building sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Tower building. It constructs a tall, slender rectangular body with a wider base and a pointed, conical roof. At higher zoom levels, small slit windows are added to the tower's body to enhance detail. The colors used are derived from the building's tribe, providing a consistent visual theme.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body dimensions.
   * 2. Set `ctx.fillStyle` to `color` and draw the main rectangular tower body.
   * 3. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 4. **If `s > 0.55` (medium+ zoom - draw slits):**
   *    - Define `slW`, `slH` for the slits.
   *    - Set `ctx.fillStyle` to `darkColor`.
   *    - Draw two rectangular slits on the tower.
   * 5. Set `ctx.fillStyle` to a slightly darker shade of `color` (using `this._darken`) and draw a wide base for the top section.
   * 6. Set `ctx.fillStyle` to `roofColor`.
   * 7. Begin a path, define a triangle for the roof, close the path, and fill it.
   * 8. Set `ctx.fillStyle` to a semi-transparent white and draw a small triangular highlight on the roof for a light reflection.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.TOWER`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawHome`**
```javascript
/**
   * Draws a home building sprite onto the canvas, including a chimney and smoke at higher zoom levels.
   *
   * @description This private method renders the visual representation of a Home building. It features a rectangular body with a pitched roof. At higher zoom levels, a chimney is added to the roof, and animated "smoke" circles are drawn emanating from it. The colors used are themed according to the building's tribe.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body dimensions.
   * 2. Set `ctx.fillStyle` to `lightColor` and draw the main rectangular body.
   * 3. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 4. Set `ctx.fillStyle` to `roofColor`.
   * 5. Begin a path, define a triangle for the roof, close the path, and fill it.
   * 6. **If `s > 0.45` (medium+ zoom - draw chimney):**
   *    - Define `chiW`, `chiH` for the chimney.
   *    - Set `ctx.fillStyle` to a darker shade of `color` (using `this._darken`).
   *    - Draw the chimney rectangle.
   *    - **If `s > 0.75` (high zoom - draw smoke):**
   *      - Calculate `chimneyX`.
   *      - Set `ctx.fillStyle` to semi-transparent white.
   *      - Draw two circular smoke puffs with slight offsets and size differences.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.HOME`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawStorehouse`**
```javascript
/**
   * Draws a storehouse building sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Storehouse building. It features a robust rectangular body with a sloped, rounded roof. At higher zoom levels, a stylized door with horizontal planks is added to the facade. The colors used are derived from the building's tribe, maintaining a consistent visual theme.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body dimensions.
   * 2. Set `ctx.fillStyle` to a slightly darker shade of `lightColor` (using `this._darken`) and draw the main rectangular body.
   * 3. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 4. Set `ctx.fillStyle` to `roofColor`.
   * 5. Begin a path, define a triangular roof shape with extra width for overhang, close the path, and fill it.
   * 6. **If `s > 0.5` (medium+ zoom - draw door):**
   *    - Set `ctx.fillStyle` to a darker shade of `color` (using `this._darken`).
   *    - Draw the main door rectangle.
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth` for door planks.
   *    - Loop 3 times to draw horizontal lines across the door.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @param {string} lightColor - A lighter shade of the primary color.
   * @param {string} roofColor - The color for the building's roof.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.STOREHOUSE`.
   * @performance O(1) due to fixed number of drawing operations and a loop with constant iterations.
   */
```

**Function: `_drawWall`**
```javascript
/**
   * Draws a wall building sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Wall segment. It consists of a wide, low rectangular body with battlements on top. The colors used are derived from the building's tribe, ensuring a consistent visual theme for fortifications.
   *
   * @workflow
   * 1. Define `w`, `h` for the main body dimensions.
   * 2. Set `ctx.fillStyle` to a darker shade of `color` (using `this._darken`) and draw the main rectangular wall body.
   * 3. Set `ctx.fillStyle` to `darkColor` and draw a side shadow/depth rectangle.
   * 4. Define `mW` and `mH` for the battlements.
   * 5. Set `ctx.fillStyle` to an even darker shade of `color` (using `this._darken`).
   * 6. Loop 4 times to draw individual battlement rectangles on top of the main wall body.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the building's center.
   * @param {number} y - The screen Y-coordinate for the building's base.
   * @param {number} tw - The scaled tile width.
   * @param {number} th - The scaled tile height.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the building.
   * @param {string} darkColor - A darker shade of the primary color.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, sets styles).
   * @triggers Called by `_drawBuilding()` when rendering an `ENTITY.WALL`.
   * @performance O(1) due to fixed number of drawing operations and a loop with constant iterations.
   */
```

**Function: `_drawUnit`**
```javascript
/**
   * Renders a game unit sprite at its screen position, including combat indicators and health bars.
   *
   * @description This private method draws a single `entity` identified as a unit. It first interpolates the unit's position for smooth movement, calculates visual offsets based on its state and movement, and performs frustum culling to prevent drawing off-screen units. It then calls the specific drawing function for the unit's `type` (e.g., `_drawWarrior`, `_drawWorker`). After drawing the base unit, it adds visual overlays such as pulsing circles for fighting units, a flashing red border if under fire, and a health bar if damaged, all scaled by zoom.
   *
   * @workflow
   * 1. Calculate the unit's effective world tile X (`vx`) and Y (`vy`) coordinates, accounting for potential lerped positions (`_lx`, `_ly`) and offsets (`_ox`, `_oy`, `_gaitY`).
   * 2. Convert `vx`, `vy` to screen pixel coordinates (`sPos.x`, `sPos.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   * 3. If `sPos` is not on screen (checked by `this._isOnScreen()`), return.
   * 4. Get `this.ctx` and `s` (scaled zoom factor).
   * 5. Determine `isA` (if tribe 'a'), `color`, `darkColor` based on the entity's tribe.
   * 6. Use a `switch` statement on `entity.type` to call the appropriate `_draw[UnitType]` helper function, passing `ctx`, `sPos.x`, `sPos.y`, `s`, `color`, and `darkColor`.
   * 7. **If `entity.state` is 'fighting':**
   *    - Calculate `pulseR`.
   *    - Set `ctx.strokeStyle`, `ctx.lineWidth`.
   *    - Draw a pulsing yellow circle around the unit.
   * 8. **If `entity._underFire` is greater than 0:**
   *    - Calculate `r`.
   *    - Save `ctx` state.
   *    - Set `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.shadowColor`, `ctx.shadowBlur`.
   *    - Draw a pulsing red circle around the unit.
   *    - Restore `ctx` state.
   * 9. **If `hpFrac < 1` and `s > 0.45` (damaged and zoomed in):**
   *    - Calculate health bar width `bw`.
   *    - Calculate Y-position `barY`.
   *    - Draw a dark background rectangle for the health bar.
   *    - Draw a colored foreground rectangle for current HP, color-coded by HP percentage.
   *
   * @param {object} entity - The unit entity object to draw, containing properties like `x`, `y`, `_lx`, `_ly`, `_ox`, `_oy`, `_gaitY`, `type`, `tribe`, `state`, `attackTarget`, `hp`, `maxHp`, `_underFire`.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.*, this.zoom, this.ctx, this._tileToScreen(), this._worldToScreen(), this._isOnScreen(), this._drawWarrior(), this._drawWorker(), ..., this._drawNormal()
   * @modifies The `this.ctx` (draws shapes, fills, strokes, sets styles, potentially `globalAlpha`, `shadowBlur`).
   * @triggers Called by the `render()` loop for each visible unit.
   * @performance O(1) per unit, with fixed constant factors for drawing operations.
   */
```

**Function: `vx`**
```javascript
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
```

**Function: `vy`**
```javascript
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
```

**Function: `pulseR`**
```javascript
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
```

**Function: `r`**
```javascript
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
```

**Function: `_drawWarrior`**
```javascript
/**
   * Draws a warrior unit sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Warrior unit. It is depicted as a robust circular shape. At higher zoom levels, a simple cross symbol is drawn inside the circle, resembling a shield or target, providing additional detail. The unit's color and outline reflect its tribe.
   *
   * @workflow
   * 1. Define `r` (radius) and `cy` (circle Y-center) scaled by `s`.
   * 2. Set `ctx.fillStyle` to `color`.
   * 3. Begin path, draw a circle (`ctx.arc()`), fill it.
   * 4. Set `ctx.strokeStyle` to `darkColor`, `ctx.lineWidth`, and stroke the circle.
   * 5. **If `s > 0.45` (medium+ zoom - draw cross):**
   *    - Set `ctx.strokeStyle` to semi-transparent white, `ctx.lineWidth`.
   *    - Draw a vertical and horizontal line segment forming a cross inside the circle.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the unit's center.
   * @param {number} y - The screen Y-coordinate for the unit's base.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the unit.
   * @param {string} darkColor - A darker shade of the primary color for outlines.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawUnit()` when rendering an `ENTITY.WARRIOR`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawWorker`**
```javascript
/**
   * Draws a worker unit sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Worker unit. It is depicted as a square rotated 45 degrees (a diamond shape). The unit's color and outline reflect its tribe.
   *
   * @workflow
   * 1. Define `r` (half-width/height) and `cy` (center Y) scaled by `s`.
   * 2. Set `ctx.fillStyle` to `color`.
   * 3. Begin path, define a diamond shape using `ctx.moveTo()` and `ctx.lineTo()` for its four cardinal points, close the path, and fill it.
   * 4. Set `ctx.strokeStyle` to `darkColor`, `ctx.lineWidth`, and stroke the shape.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the unit's center.
   * @param {number} y - The screen Y-coordinate for the unit's base.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the unit.
   * @param {string} darkColor - A darker shade of the primary color for outlines.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawUnit()` when rendering an `ENTITY.WORKER`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawScout`**
```javascript
/**
   * Draws a scout unit sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Scout unit. It is depicted as a simple triangular shape. The unit's color and outline reflect its tribe.
   *
   * @workflow
   * 1. Define `r` (half-base/height) and `cy` (center Y) scaled by `s`.
   * 2. Set `ctx.fillStyle` to `color`.
   * 3. Begin path, define a triangle shape using `ctx.moveTo()` and `ctx.lineTo()` for its vertices, close the path, and fill it.
   * 4. Set `ctx.strokeStyle` to `darkColor`, `ctx.lineWidth`, and stroke the shape.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the unit's center.
   * @param {number} y - The screen Y-coordinate for the unit's base.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the unit.
   * @param {string} darkColor - A darker shade of the primary color for outlines.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawUnit()` when rendering an `ENTITY.SCOUT`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawLeader`**
```javascript
/**
   * Draws a leader unit sprite onto the canvas, including a crown at higher zoom levels.
   *
   * @description This private method renders the visual representation of a Leader unit. It is depicted as a larger, more prominent circular shape with a double-ring outline. At higher zoom levels, a detailed golden crown is drawn on top of the circle to signify its leadership status. The unit's color and outline reflect its tribe.
   *
   * @workflow
   * 1. Define `r` (radius) and `cy` (circle Y-center) scaled by `s`.
   * 2. Set `ctx.fillStyle` to `color`.
   * 3. Begin path, draw a large circle (`ctx.arc()`), fill it.
   * 4. Set `ctx.strokeStyle` to `darkColor`, `ctx.lineWidth`, and stroke the circle.
   * 5. Set `ctx.strokeStyle` to a semi-transparent gold, `ctx.lineWidth`, and draw a smaller inner circle.
   * 6. **If `s > 0.4` (medium+ zoom - draw crown):**
   *    - Calculate `crownY`.
   *    - Set `ctx.fillStyle` to gold.
   *    - Begin path, define a jagged crown shape using `ctx.moveTo()` and `ctx.lineTo()`, close the path, and fill it.
   *    - Set `ctx.strokeStyle` to a darker gold, `ctx.lineWidth`, and stroke the crown.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the unit's center.
   * @param {number} y - The screen Y-coordinate for the unit's base.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the unit.
   * @param {string} darkColor - A darker shade of the primary color for outlines.
   * @returns {void}
   *
   * @dependencies None explicitly, relies on context methods.
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawUnit()` when rendering an `ENTITY.LEADER`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawNormal`**
```javascript
/**
   * Draws a normal civilian unit sprite onto the canvas.
   *
   * @description This private method renders the visual representation of a Normal civilian unit. It is depicted as a small, simple circular shape, slightly darker than other units. At higher zoom levels, a subtle vertical line is added to indicate a body, providing a hint of detail. The unit's color and outline reflect its tribe.
   *
   * @workflow
   * 1. Define `r` (radius) and `cy` (circle Y-center) scaled by `s`.
   * 2. Set `ctx.fillStyle` to a slightly darker shade of `color` (using `this._darken`).
   * 3. Begin path, draw a circle (`ctx.arc()`), fill it.
   * 4. **If `s > 0.5` (medium+ zoom - draw body line):**
   *    - Set `ctx.strokeStyle` to `darkColor`, `ctx.lineWidth`.
   *    - Draw a short vertical line segment below the circle.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {number} x - The screen X-coordinate for the unit's center.
   * @param {number} y - The screen Y-coordinate for the unit's base.
   * @param {number} s - The current zoom scale factor.
   * @param {string} color - The primary color for the unit.
   * @param {string} darkColor - A darker shade of the primary color for outlines.
   * @returns {void}
   *
   * @dependencies this._darken()
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by `_drawUnit()` when rendering an `ENTITY.NORMAL`.
   * @performance O(1) due to fixed number of drawing operations.
   */
```

**Function: `_drawBattleLine`**
```javascript
/**
   * Draws a dashed vertical line representing the battlefront across the center of the map.
   *
   * @description This private method renders a visual indicator for the "battle line" or front line in the game. It calculates the screen positions corresponding to the middle X-coordinate of the game map from its top to bottom edges. Then, it draws a dashed, semi-transparent golden line between these points, providing a subtle visual reference for players.
   *
   * @workflow
   * 1. Get `this.ctx`.
   * 2. Calculate `midX` as `CONFIG.MAP_W / 2`.
   * 3. Convert the tile coordinates `(midX, 0)` and `(midX, CONFIG.MAP_H)` to screen-space world coordinates using `this._tileToScreen()`.
   * 4. Convert these world coordinates to canvas pixel coordinates (`top.x`, `top.y`, `bot.x`, `bot.y`) using `this._worldToScreen()`.
   * 5. Set `ctx.strokeStyle`, `ctx.lineWidth`.
   * 6. Set `ctx.setLineDash([6, 6])` to create a dashed line.
   * 7. Begin path, move to `top.x, top.y`, draw a line to `bot.x, bot.y`, and stroke the path.
   * 8. Reset `ctx.setLineDash([])` to clear the dashed line style.
   *
   * @returns {void}
   *
   * @dependencies CONFIG.MAP_W, CONFIG.MAP_H, this.ctx, this._tileToScreen(), this._worldToScreen()
   * @modifies The `this.ctx` (draws lines, sets styles, modifies line dash pattern).
   * @triggers Called by the `render()` loop to display the battlefront.
   * @performance O(1)
   */
```

**Function: `_initWeatherParticles`**
```javascript
/**
   * Initializes or re-initializes weather particle arrays (clouds, raindrops, snowflakes) and sets the current weather type.
   *
   * @description This private method sets up the initial state for the various weather particle systems used in the renderer. It takes a `type` argument to determine which particles to generate. If the weather type has changed since the last call, it resets the particle arrays (clouds, raindrops, snowflakes) by populating them with new, randomly positioned particles. This ensures that weather effects are consistent with the current game weather state.
   *
   * @workflow
   * 1. Get `W`, `H` (canvas dimensions) or default values.
   * 2. Set `this._currentWeatherType` to the provided `type` (defaulting to `CONFIG.WEATHER.SUNSHINE`).
   * 3. Get `wb` (world bounds) from `this._worldBounds` or default values.
   * 4. Initialize `this._clouds`: Create an array of 30 cloud objects, each with random `wx`, `wy` (world coordinates), `r` (radius), `v` (velocity), `a` (alpha), and `layer` (parallax factor).
   * 5. Calculate `rainCount` based on screen area.
   * 6. Initialize `this._rainDrops`: Create an array of `rainCount` raindrop objects, each with random `x`, `y` (screen coordinates), `v` (vertical velocity), and `l` (length).
   * 7. Calculate `snowCount` based on screen area.
   * 8. Initialize `this._snowFlakes`: Create an array of `snowCount` snowflake objects, each with random `x`, `y` (screen coordinates), `v` (vertical velocity), `w` (horizontal wobble), `r` (radius), and `p` (phase for sinusoidal motion).
   *
   * @param {string} [type=CONFIG.WEATHER.SUNSHINE] - The type of weather to initialize particles for (e.g., 'RAIN', 'SNOW').
   * @returns {void}
   *
   * @dependencies CONFIG.WEATHER.SUNSHINE, this.W, this.H, this._worldBounds
   * @modifies this._currentWeatherType, this._clouds, this._rainDrops, this._snowFlakes
   * @triggers Called during `Renderer` construction and by `_updateWeatherParticles()` when the weather type changes.
   * @performance O(N) where N is the total number of particles (fixed constants like 30 for clouds, plus calculated counts for rain/snow based on screen size).
   */
```

**Function: `_drawWeatherBackground`**
```javascript
/**
   * Draws a gradient background color based on the current weather type.
   *
   * @description This private method sets the atmospheric background of the scene by drawing a full-screen linear gradient. The top and bottom colors of this gradient are selected from predefined presets associated with the current `weather.type`. Additionally, specific weather types like `DROUGHT`, `STORM`, or `FLOOD` may have semi-transparent overlay rectangles applied to further enhance the mood and visual effect.
   *
   * @workflow
   * 1. Get `type` from `weather` (defaulting to `CONFIG.WEATHER.SUNSHINE`).
   * 2. Define `presets` map where each weather type maps to `[topColor, bottomColor]`.
   * 3. Get `top` and `bottom` colors from `presets` for the current `type`.
   * 4. Create a linear gradient `grad` from top to bottom of the canvas.
   * 5. Add color stops to `grad` at 0 (top) and 1 (bottom).
   * 6. Set `ctx.fillStyle` to `grad` and fill the entire canvas (`ctx.fillRect(0, 0, this.W, this.H)`).
   * 7. **If `type` is `DROUGHT`:** Draw a semi-transparent orange overlay.
   * 8. **If `type` is `STORM`:** Draw a semi-transparent dark overlay.
   * 9. **If `type` is `FLOOD`:** Draw a semi-transparent blue overlay over the bottom portion of the screen.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {object} weather - The current weather object, containing a `type` property.
   * @returns {void}
   *
   * @dependencies CONFIG.WEATHER.*, this.W, this.H, this.ctx
   * @modifies The provided `ctx` (draws fills, sets styles).
   * @triggers Called by the `render()` loop at the beginning of each frame.
   * @performance O(1) due to drawing a single gradient and a few optional rectangles.
   */
```

**Function: `_updateWeatherParticles`**
```javascript
/**
   * Updates the positions and states of weather particles (clouds, raindrops, snowflakes) for animation.
   *
   * @description This private method advances the animation state of all weather particles in the scene. It first checks if the weather `type` has changed and re-initializes particles if needed. Then, it iterates through each particle type, updating their positions based on their velocities and applying wrap-around logic for particles that move off-screen, ensuring continuous animation. It also manages the `_lightningFlash` state for storm weather.
   *
   * @workflow
   * 1. Get `type` from `weather` (defaulting to `CONFIG.WEATHER.SUNSHINE`).
   * 2. If `type` does not match `this._currentWeatherType`, call `this._initWeatherParticles(type)`.
   * 3. Get `wb` (world bounds) from `this._worldBounds` or default values.
   * 4. Loop through each `c` (cloud) in `this._clouds`:
   *    - Update `c.wx` by adding `c.v`.
   *    - If `c.wx - c.r` is greater than `wb.maxSx + 400`, reset `c.wx` and `c.wy` to wrap around from the left/top.
   * 5. **If `type` is `RAIN` or `STORM` or `FLOOD`:**
   *    - Loop through each `d` (raindrop) in `this._rainDrops`:
   *      - Update `d.x` and `d.y` based on velocity.
   *      - If `d.y` goes off the bottom, reset `d.y` and `d.x` to wrap around from the top/left.
   *      - If `d.x` goes off the right, reset `d.x` to wrap around from the left.
   * 6. **If `type` is `SNOW`:**
   *    - Loop through each `f` (snowflake) in `this._snowFlakes`:
   *      - Update `f.p` (phase).
   *      - Update `f.x` and `f.y` based on wobble, sine wave, and velocity.
   *      - If `f.y` goes off the bottom, reset `f.y` and `f.x` to wrap around from the top/left.
   *      - If `f.x` goes off either horizontal edge, reset `f.x` to wrap around from the opposite side.
   * 7. **If `type` is `STORM`:**
   *    - If `this._lightningFlash` is greater than 0, decrease it.
   *    - Else if `Math.random() < 0.004`, set `this._lightningFlash` to `0.8` (trigger a flash).
   * 8. **Else (not storm):** Set `this._lightningFlash` to `0`.
   *
   * @param {object} weather - The current weather object, containing a `type` property.
   * @returns {void}
   *
   * @dependencies CONFIG.WEATHER.*, this.W, this.H, this._currentWeatherType, this._clouds, this._rainDrops, this._snowFlakes, this._lightningFlash, this._worldBounds, this._initWeatherParticles()
   * @modifies this._clouds, this._rainDrops, this._snowFlakes, this._lightningFlash
   * @triggers Called by the `render()` loop in each frame.
   * @performance O(N) where N is the total number of weather particles (clouds + raindrops + snowflakes).
   */
```

**Function: `_drawWeatherParticles`**
```javascript
/**
   * Draws various weather particles (clouds, rain, snow) and atmospheric effects on top of the scene.
   *
   * @description This private method renders the animated weather particles and atmospheric effects like lightning flashes onto the canvas. It first draws parallax-scrolling clouds, culling them if off-screen. Depending on the `weather.type`, it then draws either raindrops, snowflakes, or stylistic drought lines. Finally, if the weather is a `STORM` and `_lightningFlash` is active, it draws a temporary full-screen white flash effect.
   *
   * @workflow
   * 1. Get `type` from `weather` (defaulting to `CONFIG.WEATHER.SUNSHINE`).
   * 2. Loop through each `c` (cloud) in `this._clouds`:
   *    - Convert `c.wx`, `c.wy` to screen pixel coordinates with parallax using `this._worldToScreenParallax()`.
   *    - If the cloud is not on screen (checked by `this._isOnScreen()`), continue to next cloud.
   *    - Set `ctx.fillStyle` to `rgba(255,255,255,${c.a})`.
   *    - Draw three overlapping circles to form a puffy cloud shape.
   * 3. **If `type` is `RAIN` or `STORM` or `FLOOD`:**
   *    - Set `ctx.strokeStyle` and `ctx.lineWidth` for raindrops, color-coded by storm intensity.
   *    - Loop through each `d` (raindrop) in `this._rainDrops`:
   *      - Draw a short line segment for each raindrop.
   * 4. **If `type` is `SNOW`:**
   *    - Set `ctx.fillStyle` for snowflakes.
   *    - Loop through each `f` (snowflake) in `this._snowFlakes`:
   *      - Draw a small circle for each snowflake.
   * 5. **If `type` is `DROUGHT`:**
   *    - Set `ctx.strokeStyle` for drought lines.
   *    - Loop 20 times to draw wavy horizontal lines across the screen, offset by `Date.now()`.
   * 6. **If `this._lightningFlash > 0`:**
   *    - Set `ctx.fillStyle` to semi-transparent white, opacity based on `_lightningFlash`.
   *    - Fill the entire canvas rectangle.
   *
   * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to draw on.
   * @param {object} weather - The current weather object, containing a `type` property.
   * @returns {void}
   *
   * @dependencies CONFIG.WEATHER.*, this.W, this.H, this.zoom, this._lightningFlash, this._worldToScreenParallax(), this._isOnScreen()
   * @modifies The provided `ctx` (draws shapes, fills, strokes, sets styles).
   * @triggers Called by the `render()` loop in each frame.
   * @performance O(N) where N is the total number of weather particles (clouds + raindrops + snowflakes + drought lines).
   */
```

**Function: `_unitVisualSeed`**
```javascript
/**
   * Generates and caches a consistent pseudo-random seed for a unit's visual variations.
   *
   * @description This private utility function computes a unique, stable numerical seed for a given unit. This seed is used to introduce subtle visual variations (like lane offsets for marching units) that remain consistent for that specific unit throughout its existence, making units visually distinguishable without being entirely random each frame. The seed is calculated based on the unit's ID, tribe, and type, and then cached directly on the unit object to prevent re-computation.
   *
   * @workflow
   * 1. Check if `u._visSeed` is already defined. If so, return it.
   * 2. Calculate `n` using a combination of `u.id`, `u.tribe`, and `u.type` characters summed and multiplied by prime numbers, then taking the modulo 10007.
   * 3. Assign `n` to `u._visSeed`.
   * 4. Return `n`.
   *
   * @param {object} u - The unit entity object.
   * @returns {number} A pseudo-random integer seed unique and consistent for the unit.
   *
   * @dependencies None explicitly, relies on unit properties `id`, `tribe`, `type`.
   * @modifies u._visSeed (caches the computed seed on the unit object).
   * @triggers Called by `_computePurposeOffset()` to retrieve a unit's visual seed.
   * @performance O(1) on cache hit. O(L) on cache miss, where L is the length of the `u.type` string, but very fast in practice due to small string length and caching.
   */
```

**Function: `n`**
```javascript
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
```

**Function: `_computePurposeOffset`**
```javascript
/**
   * Calculates dynamic visual offsets and animation parameters for a unit based on its state and movement.
   *
   * @description This private method determines subtle visual adjustments (offsets, gait parameters) for a unit, simulating more natural movement and stances. It takes into account the unit's current `state` (e.g., 'marching', 'fighting', 'idle'), whether it's actively `moving`, and its direction of movement. A unit's unique `_visSeed` is used to introduce slight, consistent variations. The function calculates horizontal offsets (forward, side) and animation speeds/amplitudes for its gait, making unit groups look less uniform.
   *
   * @workflow
   * 1. Get `seed` using `this._unitVisualSeed(u)`.
   * 2. Calculate `lane` offset using `seed`.
   * 3. Calculate `sign` using `seed`.
   * 4. Initialize `nx`, `ny` (normalized movement direction) to 0.
   * 5. Calculate `mLen` from `mdx`, `mdy`.
   * 6. **If `mLen > 0.0001`:** Normalize `mdx`, `mdy` into `nx`, `ny`.
   * 7. **Else if `u.targetX` and `u.targetY` exist:**
   *    - Calculate `tx`, `ty` towards the target.
   *    - Calculate `tLen`.
   *    - **If `tLen > 0.0001`:** Normalize `tx`, `ty` into `nx`, `ny`.
   * 8. Calculate `px`, `py` (perpendicular direction for side offset).
   * 9. Initialize `forward`, `side`, `stanceSpeed`, `gaitAmp` with default values for idle/unknown state.
   * 10. Use a `switch` statement on `u.state` to adjust `forward`, `side`, `stanceSpeed`, `gaitAmp` based on specific behaviors ('marching', 'patrolling', 'fighting', 'working', 'wandering', 'idle').
   * 11. Apply additional type-specific adjustments for `WORKER` and `SCOUT` units.
   * 12. Return an object `{ ox, oy, stanceSpeed, gaitAmp }`.
   *
   * @param {object} u - The unit entity object, containing properties like `state`, `x`, `y`, `_lx`, `_ly`, `targetX`, `targetY`, `type`, `tribe`.
   * @param {boolean} moving - `true` if the unit is actively moving, `false` otherwise.
   * @param {number} mdx - The delta X for unit movement in the current frame.
   * @param {number} mdy - The delta Y for unit movement in the current frame.
   * @returns {{ox: number, oy: number, stanceSpeed: number, gaitAmp: number}} An object containing calculated X and Y offsets, stance animation speed, and gait animation amplitude.
   *
   * @dependencies CONFIG.ENTITY.*, CONFIG.HEX_V_SCALE, this.zoom, this._unitVisualSeed()
   * @modifies None directly on the unit, but the returned values are used to update `u._ox`, `u._oy`, `u._stanceP`, `u._gaitP`, `u._gaitY` in the `render` loop.
   * @triggers Called by the `render()` loop for each unit to determine its visual pose and movement offsets.
   * @performance O(1)
   */
```

**Function: `lane`**
```javascript
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
```

**Function: `render`**
```javascript
/**
   * The main rendering loop that draws the entire game scene, including background, tiles, entities, weather, and UI elements.
   *
   * @description This is the core method of the `Renderer` class, invoked each frame to update the visual output on the canvas. It orchestrates the drawing process by clearing the canvas, updating world bounds, drawing the weather background, and either reusing or regenerating the offscreen tile buffer before blitting it. It then draws game entities (buildings and units) sorted by depth, followed by combat indicators and weather particle overlays. Finally, it handles throttled hover detection and renders tooltips.
   *
   * @workflow
   * 1. Clear the entire canvas using `ctx.clearRect(0, 0, this.W, this.H)`.
   * 2. Store `world` in `this._worldRef`.
   * 3. Call `this._updateWorldBounds(world)`.
   * 4. **Weather background:**
   *    - Call `this._drawWeatherBackground(ctx, weather)`.
   *    - Call `this._updateWeatherParticles(weather)`.
   * 5. **Tile layer (using offscreen buffer):**
   *    - If `!this._isTileBufferValid(weather)`:
   *      - Call `this._renderTileBuffer(world, weather)`.
   *    - Calculate `offsetX` and `offsetY` based on the difference between the buffer's camera position and the current camera position, scaled by zoom.
   *    - Draw `this._tileCanvas` to `ctx` with padding and calculated offsets.
   * 6. **Battle line:** Call `this._drawBattleLine()`.
   * 7. **Buildings:**
   *    - Combine `tribeA.buildings` and `tribeB.buildings` into `buildings` array.
   *    - Sort `buildings` by their `y` and `x` coordinates for correct isometric depth rendering.
   *    - Loop through each `b` (building):
   *      - If `b._underAttack` exists, decrement it.
   *      - Call `this._drawBuilding(b)`.
   * 8. **Units:**
   *    - Combine `tribeA.units` and `tribeB.units` into `allUnits` array.
   *    - Determine `cullNormals` flag based on `this.zoom`.
   *    - Initialize `drawUnits` array.
   *    - Loop through each `u` (unit) in `allUnits`:
   *      - If `cullNormals` and `u.type` is `CONFIG.ENTITY.NORMAL`, `continue`.
   *      - Initialize `u._lx`, `u._ly` if undefined or significantly off.
   *      - Update `u._lx` and `u._ly` using linear interpolation (`lerp`) for smooth movement, `lerp` value scales with zoom.
   *      - Calculate `mdx`, `mdy` (movement delta).
   *      - Determine `moving` status.
   *      - Call `this._computePurposeOffset(u, moving, mdx, mdy)` to get visual offsets and animation parameters.
   *      - Update `u._ox`, `u._oy`, `u._stanceP`, `u._gaitP`, `u._gaitY` based on the computed profile, applying interpolation.
   *      - If `u._underFire` exists, decrement it.
   *      - Add `u` to `drawUnits`.
   *    - Sort `drawUnits` by `y` and `x` (using `_ly`, `_lx`) for correct isometric depth rendering.
   *    - Loop through each `u` in `drawUnits` and call `this._drawUnit(u)`.
   * 9. **Attack lines & tower beams:**
   *    - Call `this._drawAttackLines(tribeA, tribeB)`.
   *    - Call `this._drawTowerBeams(tribeA, tribeB)`.
   * 10. **Weather particles (on top):** Call `this._drawWeatherParticles(ctx, weather)`.
   * 11. **Hover detection & tooltip:**
   *     - Increment `this._hoverFrame`.
   *     - If `this._hoverFrame >= 3` (throttle check):
   *       - Reset `this._hoverFrame` to 0.
   *       - If `tribeA` and `tribeB` exist, call `this._findHoveredEntity(this._mouseX, this._mouseY, tribeA, tribeB)` and update `this._hoveredEntity`.
   *     - If `this._hoveredEntity` is not null, call `this._drawTooltip(this._hoveredEntity)`.
   *
   * @param {object} world - The game world state object.
   * @param {object} tribeA - The object containing Tribe A's units and buildings.
   * @param {object} tribeB - The object containing Tribe B's units and buildings.
   * @param {object} weather - The current weather state object.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.NORMAL, this.W, this.H, this.zoom, this.ctx, this._mouseX, this._mouseY, this._tileCanvas, this._tileBufPadding, this._tileBufCamX, this._tileBufCamY, this._worldRef, this._updateWorldBounds(), this._drawWeatherBackground(), this._updateWeatherParticles(), this._isTileBufferValid(), this._renderTileBuffer(), this._drawBattleLine(), this._drawBuilding(), this._computePurposeOffset(), this._drawUnit(), this._drawAttackLines(), this._drawTowerBeams(), this._drawWeatherParticles(), this._findHoveredEntity(), this._drawTooltip()
   * @modifies The `this.ctx` (clears, draws everything), `this._worldRef`, `this._hoverFrame`, `this._hoveredEntity`, `entity._underAttack`, `entity._lx`, `entity._ly`, `entity._ox`, `entity._oy`, `entity._stanceP`, `entity._gaitP`, `entity._gaitY`, `entity._underFire` (on units/buildings).
   * @triggers Called repeatedly in the game's main animation loop (e.g., `requestAnimationFrame`).
   * @performance Dominated by drawing tiles (O(N_tiles)), buildings (O(N_buildings)), and units (O(N_units)). Sorting steps are O(N log N) for entities. Overall, highly optimized with offscreen buffering and culling.
   */
```

**Function: `offsetX`**
```javascript
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
```

**Function: `offsetY`**
```javascript
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
```

**Function: `_drawAttackLines`**
```javascript
/**
   * Draws animated dashed lines and arrowheads from attacking units to their targets.
   *
   * @description This private method visually represents combat by drawing lines from each attacking unit to its designated target. It iterates through all units of both tribes and, if a unit has an `attackTarget`, it calculates the screen coordinates for both the unit and its target. A dashed, tribe-colored line with a glowing effect is drawn between them, culminating in an arrowhead at the target's end. This provides clear visual feedback for ongoing battles.
   *
   * @workflow
   * 1. Get `this.ctx`.
   * 2. Combine `tribeA.units` and `tribeB.units` into `allUnits`.
   * 3. Loop through each `u` (unit) in `allUnits`:
   *    - If `!u.attackTarget`, continue to the next unit.
   *    - Calculate the unit's effective world tile X (`ux`) and Y (`uy`) coordinates, accounting for potential lerped positions and offsets.
   *    - Get the target's tile X (`tx`) and Y (`ty`) coordinates.
   *    - Convert `ux`, `uy` to screen pixel coordinates (`s1.x`, `s1.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   *    - Convert `tx`, `ty` to screen pixel coordinates (`s2.x`, `s2.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   *    - Determine `color` based on `u.tribe`.
   *    - Save `ctx` state.
   *    - Set `ctx.strokeStyle`, `ctx.lineWidth`.
   *    - Set `ctx.setLineDash()` for a dashed line, scaled by zoom.
   *    - Set `ctx.shadowColor` and `ctx.shadowBlur` for a glowing effect.
   *    - Begin path, move to `s1`, draw line to `s2` (with slight Y offset), and stroke.
   *    - Reset `ctx.setLineDash([])` and restore `ctx` state.
   *    - Calculate `angle` of the line.
   *    - Define `aLen` for arrowhead size, scaled by zoom.
   *    - Save `ctx` state.
   *    - Set `ctx.fillStyle`, `ctx.shadowColor`, `ctx.shadowBlur` for the arrowhead.
   *    - Begin path, define a triangle for the arrowhead at `s2`, close path, and fill.
   *    - Restore `ctx` state.
   *
   * @param {object} tribeA - The object representing Tribe A, containing `units` array.
   * @param {object} tribeB - The object representing Tribe B, containing `units` array.
   * @returns {void}
   *
   * @dependencies this.zoom, this.ctx, this._tileToScreen(), this._worldToScreen()
   * @modifies The `this.ctx` (draws lines, shapes, fills, strokes, sets styles, modifies line dash pattern, shadow).
   * @triggers Called by the `render()` loop after drawing all units.
   * @performance O(N), where N is the total number of units with an `attackTarget`.
   */
```

**Function: `ux`**
```javascript
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
```

**Function: `uy`**
```javascript
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
```

**Function: `_drawTowerBeams`**
```javascript
/**
   * Draws visual beams from attacking towers to their targets.
   *
   * @description This private method visualizes tower attacks by drawing energetic beams. It iterates through all buildings of both tribes, specifically targeting `CONFIG.ENTITY.TOWER` instances that have an `attackTarget`. For each attacking tower, it calculates the screen coordinates of the tower (with an offset to appear from its top) and its target. A glowing, colored line is drawn between these points, with a small circle indicating the point of impact on the target.
   *
   * @workflow
   * 1. Get `this.ctx`.
   * 2. Loop through `tribeA` and `tribeB`:
   *    - Loop through each `tower` in `tribe.buildings`:
   *      - If `tower.type` is not `CONFIG.ENTITY.TOWER` or `!tower.attackTarget`, continue.
   *      - Convert `tower.x`, `tower.y` to screen pixel coordinates (`s1.x`, `s1.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   *      - Get target's tile X (`tx`) and Y (`ty`) coordinates.
   *      - Convert `tx`, `ty` to screen pixel coordinates (`s2.x`, `s2.y`) using `this._tileToScreen()` and `this._worldToScreen()`.
   *      - Determine `col` (color) based on `tribe.id`.
   *      - Get scaled tile height `th`.
   *      - Save `ctx` state.
   *      - Set `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.shadowColor`, `ctx.shadowBlur` for the beam.
   *      - Begin path, move from `s1.x, s1.y - th * 2.5` (top of tower) to `s2.x, s2.y - 4 * this.zoom` (target point), and stroke.
   *      - Set `ctx.lineWidth` for the impact circle.
   *      - Draw and stroke a small circle at the target impact point.
   *      - Restore `ctx` state.
   *
   * @param {object} tribeA - The object representing Tribe A, containing `buildings` array.
   * @param {object} tribeB - The object representing Tribe B, containing `buildings` array.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.TOWER, this.zoom, this.TH, this.ctx, this._tileToScreen(), this._worldToScreen()
   * @modifies The `this.ctx` (draws lines, shapes, strokes, sets styles, shadow).
   * @triggers Called by the `render()` loop after drawing all units.
   * @performance O(N), where N is the total number of towers with an `attackTarget`.
   */
```

---

### File: `js/time_dilation.js`

#### Functions

**Function: `init`**
```javascript
/**
   * Translates the raw checkpoints into processed entries with pre-calculated day ranges.
   * 
   * @description This initialization method iterates over the configured checkpoints and calculates the exact simulation day bounds (`dayStart` and `dayEnd`) for each era. This eliminates the need to recursively recalculate offsets on every single game tick.
   * 
   * @workflow
   * 1. Initialize a day counter `currentDayOffset` to 0.
   * 2. Iterate through the array of configuration checkpoints.
   * 3. For each checkpoint, determine the number of years spanned.
   * 4. Multiply years by `daysPerYear` to find the total simulation days spanned by that era.
   * 5. Store the calculated start day and end day bounds in a new processed checkpoint object.
   * 6. Increment the day counter by the era's day span.
   * 7. Save the processed checkpoints list internally.
   * 
   * @returns {void}
   * 
   * @dependencies TIME_DILATION_CONFIG
   * @modifies this._processedCheckpoints
   * @triggers Automatically called on the first execution of `getYearFromDays`.
   * @performance O(N) where N is the number of era checkpoints. Run once as setup.
   */
```

**Function: `getYearFromDays`**
```javascript
/**
   * Calculates the virtual calendar year based on the total accumulated days of simulation.
   * 
   * @description If time dilation is disabled, it falls back to a standard linear calculation using the configured days per year. If enabled, it identifies the active era checkpoint matching the simulation day, calculates the fractional years elapsed in that era, and adds it to the era's starting year.
   * 
   * @workflow
   * 1. If `TIME_DILATION_CONFIG.enabled` is false, calculate and return `totalDays / CONFIG.DAYS_PER_YEAR + 1`.
   * 2. If `_processedCheckpoints` is empty, call `this.init()`.
   * 3. Loop through each processed checkpoint:
   *    a. If `totalDays` falls within `cp.dayStart` (inclusive) and `cp.dayEnd` (exclusive):
   *       i. Find `daysInCurrentEra` by subtracting `cp.dayStart` from `totalDays`.
   *       ii. Calculate `yearsElapsedInEra` by dividing `daysInCurrentEra` by `cp.daysPerYear` and flooring.
   *       iii. Return the starting year of the era plus the years elapsed.
   * 4. Return 1 as a fallback if no checkpoint matches.
   * 
   * @param {number} totalDays - The total number of days elapsed in the simulation.
   * @returns {number} The current virtual calendar year (1-indexed).
   * 
   * @dependencies TIME_DILATION_CONFIG, CONFIG.DAYS_PER_YEAR, this.init()
   * @modifies None
   * @triggers Called on every game tick to update the calendar display and age-related logic.
   * @performance O(C) where C is the number of era checkpoints (typically very small, ~8).
   */
```

---

### File: `js/tribe.js`

#### Functions

**Function: `constructor`**
```javascript
/**
   * Initializes a new Tribe instance with core attributes, resources, and timers.
   *
   * @description This constructor sets up all fundamental properties for a new tribe, including its identity, starting location, initial population, military strength, and resource stockpiles. It also initializes various internal timers and collections for buildings and units, preparing the tribe for simulation.
   *
   * @workflow
   * 1. Assigns `id`, `name`, `color`, `startX`, `startY` from parameters to instance properties.
   * 2. Initializes `population` to a random value between 20 and 29.
   * 3. Sets `military` to 0.
   * 4. Initializes `res` (wood, food, metal, stone) to default starting values.
   * 5. Sets `techLevel` to 1, `knowledge` to 0, `morale` to 0.7.
   * 6. Creates a `leader` object with a random name and strength.
   * 7. Initializes empty arrays for `buildings` and `units`.
   * 8. Sets `suspicion` to 0, `debuffs` to an empty object, `agentCount` to 0.
   * 9. Sets `age` to the first age in `AGES` constant.
   * 10. Initializes `casualties` and `power` to 0.
   * 11. Initializes various internal timers (`_growthTimer`, `_techTimer`, etc.) to 0.
   *
   * @param {string} id - Unique identifier for the tribe.
   * @param {string} name - Display name of the tribe.
   * @param {number} startX - Initial X coordinate for the tribe's starting area.
   * @param {number} startY - Initial Y coordinate for the tribe's starting area.
   * @param {string} color - Hex color code for the tribe.
   * @returns {Tribe} A newly created Tribe instance.
   *
   * @dependencies Math.floor(), Math.random(), AGES (global constant), this._randName().
   * @modifies this.id, this.name, this.color, this.startX, this.startY, this.population, this.military, this.res, this.techLevel, this.knowledge, this.morale, this.leader, this.buildings, this.units, this.suspicion, this.debuffs, this.agentCount, this.age, this.casualties, this.power, and all internal timers.
   * @triggers Called once when a new Tribe object is instantiated.
   * @performance O(1) as it involves fixed-number assignments and basic calculations.
   */
```

**Function: `init`**
```javascript
/**
   * Initializes the tribe within the game world, placing initial buildings and units.
   *
   * @description This method connects the tribe to the game world and its enemy, then proceeds to establish its starting infrastructure and military. It finds a suitable starting location, places a capitol, seeds initial homes, and spawns a basic set of warriors, scouts, and workers to kickstart the tribe's development and defense.
   *
   * @workflow
   * 1. Assigns the `world` object to `this._world`.
   * 2. Assigns the `enemyTribe` object to `this._enemy`.
   * 3. Calls `world.findNearestWalkable(this.startX, this.startY)` to get a valid starting point `p`.
   * 4. Calls `this._placeBuilding(p.x, p.y, CONFIG.ENTITY.CAPITOL)` to place the tribe's capitol.
   * 5. Calls `this._seedStartingHomes(p.x, p.y)` to place initial homes around the capitol.
   * 6. Determines an `ox` offset based on the tribe's `id` for unit spawning direction.
   * 7. Spawns two `WARRIOR` units relative to the capitol.
   * 8. Spawns one `SCOUT` unit relative to the capitol.
   * 9. Spawns one `WORKER` unit relative to the capitol.
   * 10. Calls `this._syncPopulationUnits()` to ensure the population count matches the spawned units.
   *
   * @param {World} world - The game world instance.
   * @param {Tribe} enemyTribe - The opposing tribe instance.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.CAPITOL, CONFIG.ENTITY.WARRIOR, CONFIG.ENTITY.SCOUT, CONFIG.ENTITY.WORKER, world.findNearestWalkable(), this._placeBuilding(), this._seedStartingHomes(), this._spawnUnit(), this._syncPopulationUnits().
   * @modifies this._world, this._enemy, this.buildings, this.units, world (by adding entities).
   * @triggers Called once after tribe creation, usually by the game's initialization logic.
   * @performance O(1) for fixed number of building/unit placements and world interactions, but `_seedStartingHomes` and `_syncPopulationUnits` might involve small loops (bounded by `neededHomes` and population).
   */
```

**Function: `tick`**
```javascript
/**
   * Advances the tribe's simulation state by one year, processing all periodic logic.
   *
   * @description This is the main update loop for the tribe, executed every game year. It orchestrates a series of internal methods that manage population growth, resource gathering, unit actions, building construction and upgrades, military operations, and debuff decay, ensuring the tribe evolves and reacts to the game environment.
   *
   * @workflow
   * 1. Calls `this._applyDebuffDecay()` to reduce active debuff strengths.
   * 2. Calls `this._updateAge(year)` to update the tribe's current age based on the game year.
   * 3. Calls `this._growPopulation()` to potentially increase the tribe's population.
   * 4. Calls `this._gatherResources()` to collect resources from farms and workers.
   * 5. Calls `this._updateHunger()` to manage unit hunger and food consumption.
   * 6. Calls `this._doBuildLogic()` to determine and initiate new building construction.
   * 7. Calls `this._doUpgradeLogic()` to determine and initiate building upgrades.
   * 8. Calls `this._doMilitaryLogic()` to handle military unit spawning.
   * 9. Calls `this._doAttackLogic()` to plan and execute attacks on the enemy.
   * 10. Calls `this._updateUnits()` to update the state and actions of all tribe units.
   * 11. Calls `this._updateTowers()` to handle tower auto-attacks.
   * 12. Calls `this._syncPopulationUnits()` to ensure the number of normal units matches the population.
   * 13. Calls `this._computePower()` to recalculate the tribe's overall power score.
   *
   * @param {number} year - The current game year.
   * @returns {void}
   *
   * @dependencies All the internal methods called within the tick.
   * @modifies this.debuffs, this.age, this.population, this.res, this.units, this.buildings, this.military, this.power, and various internal timers and unit/building properties via sub-methods.
   * @triggers Called by the main game loop, typically once per game year.
   * @performance O(N) where N is the total number of units and buildings, as many sub-methods iterate over these collections.
   */
```

**Function: `_updateAge`**
```javascript
/**
   * Updates the tribe's current age based on the given game year.
   *
   * @description This private helper function is responsible for keeping the tribe's `age` property synchronized with the game's progression. It delegates the logic of determining the age to a global `getAgeByYear` function, ensuring the tribe's attributes and capabilities evolve with the game era.
   *
   * @workflow
   * 1. Assigns the result of `getAgeByYear(year)` to `this.age`.
   *
   * @param {number} year - The current game year.
   * @returns {void}
   *
   * @dependencies getAgeByYear() (global function).
   * @modifies this.age.
   * @triggers Called by `tick()`.
   * @performance O(1).
   */
```

**Function: `_computePower`**
```javascript
/**
   * Calculates and updates the tribe's overall power score.
   *
   * @description This private method aggregates various tribal statistics, such as population, military strength, technological advancement, number of buildings, and morale, into a single numerical `power` score. This score provides a simplified metric for comparing tribe strength and can influence AI decisions or game events.
   *
   * @workflow
   * 1. Calculates `this.power` using a weighted sum of:
   *    - `this.population * 0.5`
   *    - `this.military * 3`
   *    - `this.techLevel * 10`
   *    - `this.buildings.length * 6`
   *    - `this.morale * 20`
   * 2. Assigns the result to `this.power`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies None (accesses internal properties).
   * @modifies this.power.
   * @triggers Called by `tick()`.
   * @performance O(1) as it's a fixed number of calculations and property accesses.
   */
```

**Function: `_growPopulation`**
```javascript
/**
   * Manages the tribe's population growth based on housing capacity, food supply, and debuffs.
   *
   * @description This private method periodically attempts to increase the tribe's population. It checks if enough time has passed since the last growth, then assesses the maximum population allowed by homes and the current age. Growth is further influenced by food availability and active disease or food debuffs, ensuring that population expansion is tied to the tribe's well-being and infrastructure.
   *
   * @workflow
   * 1. Increments `this._growthTimer`.
   * 2. Calculates `growRate` based on `techLevel`, clamped between 4 and 16.
   * 3. If `this._growthTimer` is less than `growRate`, the function returns (not time to grow yet).
   * 4. Resets `this._growthTimer` to 0.
   * 5. Filters `this.buildings` to get all `HOME` buildings.
   * 6. Calculates `homeCap`, the total population capacity provided by all homes, summing capacities by their levels.
   * 7. Calculates `ageCap` based on `this.age.tribeMaxPop` and `this.techLevel`.
   * 8. Determines `maxPop` as the minimum of `ageCap` and `homeCap`, clamped to a minimum of 4.
   * 9. If `this.population` is already greater than or equal to `maxPop`, the function returns (no room for growth).
   * 10. Filters `this.buildings` to get all `FARM` buildings.
   * 11. Calculates `farmStorageCap` based on farms' levels and sizes.
   * 12. Determines `foodCap` as `CONFIG.FOOD_STORAGE_BASE + farmStorageCap`.
   * 13. Calculates `foodFill` as the ratio of `this.res.food` to `foodCap`, capped at 1.
   * 14. Retrieves `diseaseDebuff` and `foodDebuff` from `this.debuffs`.
   * 15. Calculates `growAmt` as a percentage of current population, adjusted by `foodFill`, `diseaseDebuff`, and `foodDebuff`, ensuring it's not negative.
   * 16. Updates `this.population` by adding `growAmt`, capped at `maxPop`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.HOME, CONFIG.ENTITY.FARM, CONFIG.FOOD_STORAGE_PER_FARM, CONFIG.FOOD_STORAGE_BASE, Math.floor(), Math.random(), Math.max(), Math.min(), this._homeCapacityByLevel().
   * @modifies this._growthTimer, this.population.
   * @triggers Called by `tick()`.
   * @performance O(B) where B is the number of buildings (due to filters and reduces), but generally small B.
   */
```

**Function: `_gatherResources`**
```javascript
/**
   * Handles the periodic collection and management of all tribe resources.
   *
   * @description This private method orchestrates the tribe's resource economy, processing food production from farms, resource collection by workers, passive resource generation, and knowledge accumulation. It accounts for building capacities, weather conditions, unit stats, and resource spoilage, ensuring the tribe's stockpiles are updated and managed each tick.
   *
   * @workflow
   * 1. Filters `this.buildings` to get all `FARM`, `HOME`, and `CAPITOL` buildings.
   * 2. Calls `this._assignFarmWorkers(farms)` to assign available workers to farms.
   * 3. Calculates `farmStorageCap` based on farm levels and sizes.
   * 4. Determines `foodCap` as `CONFIG.FOOD_STORAGE_BASE + farmStorageCap`.
   * 5. Retrieves `weatherType` from `this._world.weather` or defaults to `CONFIG.WEATHER.SUNSHINE`.
   * 6. Calls `this._getWeatherFarmTileFactor(weatherType)` to get a weather-based yield multiplier.
   * 7. Initializes `farmOutput` to 0.
   * 8. For each `f` in `farms`:
   *    a. Calls `this._ensureFarmFarmland(f)` to ensure the farm has farmland plots initialized.
   *    b. Gets the farm's `level` and assigned `workers`.
   *    c. Calculates `workerPower` based on workers' strength and agility stats.
   *    d. Calculates `workerMult` and `levelMult` for output.
   *    e. For each `plot` in `f.farmland`:
   *       i. Gets the tile type at `plot.x, plot.y` from `this._world`.
   *       ii. Calls `this._getFarmBiomeBaseYield(tile.type)` to get the biome base.
   *       iii. Calculates `perTile` yield incorporating biome, weather, level, and worker multipliers.
   *       iv. Adds `perTile` to `farmFood`.
   *    f. Adds `farmFood` to `farmOutput`.
   * 9. Retrieves `farmMult` from `this._world.weatherMods`.
   * 10. Updates `this.res.food` by adding `farmOutput * farmMult`, capped at `foodCap`.
   * 11. Applies food spoilage by reducing `this.res.food` by `CONFIG.FOOD_SPOIL_RATE`.
   * 12. Filters `this.buildings` to get all `STOREHOUSE` buildings.
   * 13. Calculates `storageCap` based on storehouse levels.
   * 14. Filters `this.units` to get all `WORKER` units.
   * 15. For each `w` in `workers`:
   *    a. Calls `this._world.harvestTile(w.x, w.y)` to attempt harvesting.
   *    b. If `gained` resources are returned:
   *       i. For each `res, amt` entry in `gained`:
   *          1. If `res` is not 'food' and exists in `this.res`, add `amt` to `this.res[res]`, capped at `storageCap`.
   *    c. If `w.state` is 'idle' and `this.res.stone` is at least 2:
   *       i. Calls `this._world.setRoad(w.x, w.y)`.
   *       ii. Reduces `this.res.stone` by 0.5.
   * 16. Calculates `passiveMult` based on `this.techLevel`.
   * 17. Increases `this.res.metal` and `this.res.stone` by a small passive amount, capped at `storageCap`.
   * 18. Increments `this._techTimer`.
   * 19. Calculates `techRate` based on `this.techLevel`.
   * 20. If `this._techTimer` is greater than or equal to `techRate`:
   *    a. Resets `this._techTimer` to 0.
   *    b. Retrieves `boost` and `penalty` from `this.debuffs` for research.
   *    c. Increases `this.knowledge` by `1 + round(boost * 3) - round(penalty * 2)`, ensuring it's not negative.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.FARM, CONFIG.ENTITY.HOME, CONFIG.ENTITY.CAPITOL, CONFIG.FOOD_STORAGE_PER_FARM, CONFIG.FOOD_STORAGE_BASE, CONFIG.WEATHER.SUNSHINE, CONFIG.TILE.GRASS, CONFIG.FOOD_SPOIL_RATE, CONFIG.ENTITY.STOREHOUSE, CONFIG.STORAGE_BASE_CAP, CONFIG.STORAGE_PER_STOREHOUSE, CONFIG.ENTITY.WORKER, this._world.weather, this._world.weatherMods, this._world.getTile(), this._world.harvestTile(), this._world.setRoad(), this._assignFarmWorkers(), this._ensureFarmFarmland(), this._getWeatherFarmTileFactor(), this._getFarmBiomeBaseYield(), Math.min(), Math.max(), Object.entries(), Math.floor().
   * @modifies this.res.food, this.res.wood, this.res.metal, this.res.stone, this.knowledge, this._techTimer, farm._workers, farm.farmland, world (by setting roads or harvesting trees), unit `w.state`.
   * @triggers Called by `tick()`.
   * @performance O(B + U + F*P) where B is buildings, U is units, F is farms, and P is plots per farm. Can be significant depending on map density and unit count.
   */
```

**Function: `weatherType`**
```javascript
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
```

**Function: `_doBuildLogic`**
```javascript
/**
   * Manages the tribe's automatic construction of new buildings.
   *
   * @description This private method periodically evaluates the tribe's building needs and attempts to construct new structures based on predefined priorities and resource availability. It prioritizes expanding farmland if possible, then progresses through a sequence of essential buildings like farms, homes, storehouses, barracks, forts, towers, and walls, ensuring a balanced infrastructure development.
   *
   * @workflow
   * 1. Increments `this._buildTimer`.
   * 2. If `this._buildTimer` is less than 25, returns immediately.
   * 3. Resets `this._buildTimer` to 0.
   * 4. Calls `this._expandFarmLand()`. If it successfully expands farmland, returns immediately.
   * 5. Defines a helper function `count(type)` to count buildings of a specific type.
   * 6. Gets counts for `CAPITOL`, `FARM`, `HOME`, `BARRACKS`, `FORT`, `TOWER` buildings.
   * 7. If no capitol exists, returns immediately (critical building missing).
   * 8. Checks for various building types in a prioritized order and calls `this._buildNew()` if a need is identified and conditions (like population or existing buildings) are met:
   *    - Farms (up to 2)
   *    - Homes (up to 4)
   *    - Storehouses (up to 1)
   *    - Barracks (up to 2)
   *    - Forts (if population > 50, up to 2)
   *    - Towers (up to 5)
   *    - Barracks (if population > 80, up to 3)
   *    - Storehouses (up to 2)
   *    - Homes (if population > 80, up to 6)
   *    - Walls (if population > 80, up to 8)
   *    - Farms (if population > 100, up to 3)
   *    - Storehouses (if population > 120, up to 3)
   *    - Towers (if population > 150, up to 8)
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, this.buildings, this.population, this._expandFarmLand(), this._buildNew().
   * @modifies this._buildTimer, this.buildings, this.res (via `_buildNew`).
   * @triggers Called by `tick()`.
   * @performance O(B) where B is the number of buildings for initial filtering, then a series of O(1) checks.
   */
```

**Function: `count`**
```javascript
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
```

**Function: `_canAfford`**
```javascript
/**
   * Checks if the tribe can afford a given set of resources.
   *
   * @description This private helper function iterates through a provided cost object, which maps resource names to required amounts. For each resource, it checks if the tribe's current stockpile is greater than or equal to the required amount. If any resource requirement is not met, the function immediately returns `false`.
   *
   * @workflow
   * 1. For each `[res, amt]` pair in `costObj`:
   *    a. If `this.res[res]` (or 0 if undefined) is less than `amt`, returns `false`.
   * 2. If all resource requirements are met, returns `true`.
   *
   * @param {Object.<string, number>} costObj - An object mapping resource names to their required amounts.
   * @returns {boolean} True if the tribe can afford all resources, false otherwise.
   *
   * @dependencies Object.entries().
   * @modifies None.
   * @triggers Called by `_doBuildLogic()`, `_buildNew()`, `_expandFarmLand()`, `_doUpgradeLogic()`, `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in `costObj` (usually a small constant).
   */
```

**Function: `_payCost`**
```javascript
/**
   * Deducts the specified resource costs from the tribe's stockpiles.
   *
   * @description This private helper function iterates through a provided cost object and subtracts the corresponding amounts from the tribe's resources. It ensures that resource values do not drop below zero, effectively consuming the resources required for a building, upgrade, or other action.
   *
   * @workflow
   * 1. For each `[res, amt]` pair in `costObj`:
   *    a. Subtracts `amt` from `this.res[res]`.
   *    b. Ensures `this.res[res]` is not less than 0 by clamping it with `Math.max(0, ...)`.
   *
   * @param {Object.<string, number>} costObj - An object mapping resource names to their amounts to be deducted.
   * @returns {void}
   *
   * @dependencies Math.max(), Object.entries().
   * @modifies this.res (for affected resources).
   * @triggers Called by `_buildNew()`, `_expandFarmLand()`, `_doUpgradeLogic()`, `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in `costObj` (usually a small constant).
   */
```

**Function: `_expandFarmLand`**
```javascript
/**
   * Attempts to expand the farmland of an existing farm building.
   *
   * @description This private method periodically tries to increase the number of farm plots for a suitable farm. It prioritizes farms with the smallest current size, checks if the tribe can afford the expansion cost and has enough population, then attempts to find a new walkable plot adjacent to the farm. If successful, it updates the farm's properties and logs the event.
   *
   * @workflow
   * 1. Filters `this.buildings` to get all `FARM` buildings.
   * 2. If no farms exist, returns `false`.
   * 3. Filters farms into `candidates` that have not reached their `_getFarmMaxTiles` capacity.
   * 4. Sorts `candidates` by current farm size in ascending order.
   * 5. If no `candidates` are found, returns `false`.
   * 6. Selects the first farm `f` from `candidates`.
   * 7. Calls `this._ensureFarmFarmland(f)` to initialize farmland if it's missing.
   * 8. Calculates `nextSize` (current size + 1).
   * 9. Calculates `cost` for the expansion based on `nextSize`.
   * 10. Calls `this._canAfford(cost)`. If `false`, returns `false`.
   * 11. If `this.population` is less than the required amount (`45 + nextSize * 12`), returns `false`.
   * 12. Calls `this._findExpandableFarmPlot(f)` to find a suitable new plot. If `null`, returns `false`.
   * 13. Calls `this._payCost(cost)` to deduct resources.
   * 14. Updates `f.size` to `nextSize`.
   * 15. Adds `newPlot` to `f.farmland`.
   * 16. Increases `f.maxHp` and `f.hp`.
   * 17. Logs the expansion event using `Game.eventLog()`.
   * 18. Returns `true`.
   *
   * @param {void} -
   * @returns {boolean} True if farmland was successfully expanded, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.FARM, Game.eventLog(), this.buildings, this.population, this._getFarmMaxTiles(), this._ensureFarmFarmland(), this._canAfford(), this._findExpandableFarmPlot(), this._payCost(), Math.floor().
   * @modifies f.size, f.farmland, f.maxHp, f.hp, this.res (via `_payCost`).
   * @triggers Called by `_doBuildLogic()`.
   * @performance O(B) for filtering and sorting buildings, then O(N) for `_findExpandableFarmPlot` where N is neighbors, in the worst case might iterate around existing farmland. Overall bounded by B.
   */
```

**Function: `nextSize`**
```javascript
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
```

**Function: `_assignFarmWorkers`**
```javascript
/**
   * Assigns available worker units to farms based on proximity and capacity.
   *
   * @description This private method distributes idle worker units among existing farm buildings to maximize food production. It clears previous worker assignments, identifies all available workers, and then iterates through each farm, sorting workers by distance and assigning them up to the farm's capacity. Assigned workers have their state updated to 'working_farm'.
   *
   * @workflow
   * 1. If no `farms` are provided, returns immediately.
   * 2. For each `f` in `farms`, clears its `_workers` array.
   * 3. Filters `this.units` to get all `WORKER` units and creates a shallow copy `available`.
   * 4. For each `f` in `farms`:
   *    a. Calls `this._ensureFarmFarmland(f)` to ensure farmland is initialized.
   *    b. Calculates `cap`, the maximum workers for the farm based on its size and level.
   *    c. Sorts `available` workers by their squared distance to the farm `f` in ascending order.
   *    d. Iterates through sorted `available` workers from end to start (closest first):
   *       i. Selects worker `w`.
   *       ii. Calculates `dist` from `w` to `f`.
   *       iii. If `dist` is too far (`> 4 + (f.size || 1) * 0.8`), continues to the next worker.
   *       iv. Adds `w` to `f._workers`.
   *       v. If `w.state` is 'idle', sets `w.state` to 'working_farm'.
   *       vi. Removes `w` from `available`.
   *
   * @param {Array<Object>} farms - An array of farm building objects.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.WORKER, this.units, this._ensureFarmFarmland(), Math.min(), Math.sqrt().
   * @modifies farm._workers for each farm, unit.state for assigned workers, available array (by splicing).
   * @triggers Called by `_gatherResources()`.
   * @performance O(F * W log W) where F is the number of farms and W is the number of workers, due to sorting workers for each farm.
   */
```

**Function: `da`**
```javascript
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
```

**Function: `db`**
```javascript
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
```

**Function: `_buildNew`**
```javascript
/**
   * Attempts to build a new structure of a specified type at a suitable location.
   *
   * @description This private method handles the logic for placing new buildings. It first checks if the tribe can afford the building's cost. If so, it randomly selects an existing building as an anchor, calculates a potential new position, finds the nearest walkable and unoccupied tile, and then places the new building, deducting the resources and logging the event.
   *
   * @workflow
   * 1. Retrieves `cost` for `type` from `CONFIG.BUILDING_COST`.
   * 2. If `cost` is not defined or `this._canAfford(cost)` returns `false`, returns immediately.
   * 3. Selects a random `anchor` building from `this.buildings`.
   * 4. Calculates `dx` and `dy` for a new position relative to the anchor, with an `ox` offset depending on the tribe's `id` and `facingEnemy` flag for strategic placement.
   * 5. Calculates `nx`, `ny` (potential new coordinates).
   * 6. Calls `this._world.findNearestWalkable(nx, ny)` to find a valid position `p`.
   * 7. If `p` is null, returns immediately.
   * 8. Calls `this._world.getEntitiesAt(p.x, p.y)` to check for occupied tiles.
   * 9. If any existing building entity is at `p.x, p.y`, returns immediately.
   * 10. Calls `this._placeBuilding(p.x, p.y, type)` to create the building.
   * 11. Calls `this._payCost(cost)` to deduct resources.
   * 12. Formats a resource string for logging.
   * 13. Logs the building event using `Game.eventLog()`.
   *
   * @param {string} type - The type of building to construct (e.g., `CONFIG.ENTITY.FARM`).
   * @param {boolean} facingEnemy - A flag indicating if the building should be placed closer to the enemy border.
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_COST, CONFIG.BUILDING_HP, Game.eventLog(), this.buildings, this.id, this._world.findNearestWalkable(), this._world.getEntitiesAt(), this._canAfford(), this._payCost(), this._placeBuilding(), Math.floor(), Math.random(), Object.entries().
   * @modifies this.buildings, this.res (via `_payCost`), world (via `_placeBuilding`).
   * @triggers Called by `_doBuildLogic()`.
   * @performance O(B) in worst case for checking entities at a location. Finding nearest walkable is O(W) (bounded by world size). Random selection and fixed operations are O(1).
   */
```

**Function: `_doUpgradeLogic`**
```javascript
/**
   * Manages the tribe's automatic upgrading of existing buildings.
   *
   * @description This private method periodically assesses which buildings are eligible for an upgrade and attempts to perform one. It prioritizes upgrading key defensive and resource-related buildings, checking resource affordability, and then applies the upgrade, increasing the building's level, maximum HP, and current HP, and logs the event.
   *
   * @workflow
   * 1. Increments `this._upgradeTimer`.
   * 2. If `this._upgradeTimer` is less than 40, returns immediately.
   * 3. Resets `this._upgradeTimer` to 0.
   * 4. Filters `this.buildings` to create an `upgradeable` list, including only buildings whose `level` is less than their `CONFIG.BUILDING_MAX_LEVEL`.
   * 5. If `upgradeable` is empty, returns immediately.
   * 6. Defines a `priority` array for building types (Capitol first, then Storehouse, Tower, Fort, Barracks, Farm, Wall, Home).
   * 7. Sorts `upgradeable` buildings based on the `priority` order.
   * 8. Selects the first `candidate` building from the sorted list.
   * 9. Calls `this._upgradeCost(candidate)` to determine the cost.
   * 10. Calls `this._canAfford(cost)`. If `false`, returns immediately.
   * 11. Calls `this._payCost(cost)` to deduct resources.
   * 12. Increments `candidate.level`.
   * 13. Calculates `baseHp` from `CONFIG.BUILDING_HP` for the building type.
   * 14. Updates `candidate.maxHp` based on `baseHp` and new level.
   * 15. Updates `candidate.hp` by adding a portion of `baseHp`, capped at `maxHp`.
   * 16. Logs the upgrade event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_MAX_LEVEL, CONFIG.BUILDING_HP, CONFIG.ENTITY constants, Game.eventLog(), this.buildings, this._upgradeCost(), this._canAfford(), this._payCost(), Math.round(), Math.min().
   * @modifies this._upgradeTimer, building.level, building.maxHp, building.hp for the upgraded building, this.res (via `_payCost`).
   * @triggers Called by `tick()`.
   * @performance O(B log B) where B is the number of buildings, due to filtering and sorting.
   */
```

**Function: `_upgradeCost`**
```javascript
/**
   * Calculates the resource cost for upgrading a specific building to its next level.
   *
   * @description This private helper function determines the resources required to upgrade a given building. It starts with the building's base construction cost, applies a level-based multiplier, and then ensures certain minimum costs for wood and stone are met, making upgrades progressively more expensive.
   *
   * @workflow
   * 1. Retrieves `base` cost from `CONFIG.BUILDING_COST` for the `building.type`, defaulting to a generic cost.
   * 2. Gets the current `lv` (level) of the building.
   * 3. Calculates `mult` using `CONFIG.BUILDING_UPGRADE_MULT` and the current `lv`.
   * 4. Initializes an empty `cost` object.
   * 5. For each `[res, amt]` pair in `base` cost:
   *    a. Calculates `cost[res]` by multiplying `amt` by `mult` and rounding up.
   * 6. Ensures `cost.wood` is at least `30 * lv`.
   * 7. Ensures `cost.stone` is at least `20 * lv`.
   * 8. Returns the calculated `cost` object.
   *
   * @param {Object} building - The building object for which to calculate upgrade costs. Must have `type` and `level` properties.
   * @returns {Object.<string, number>} An object mapping resource names to their required amounts for the upgrade.
   *
   * @dependencies CONFIG.BUILDING_COST, CONFIG.BUILDING_UPGRADE_MULT, Math.ceil(), Math.max(), Object.entries().
   * @modifies None.
   * @triggers Called by `_doUpgradeLogic()` and `upgradeBuilding()`.
   * @performance O(R) where R is the number of unique resources in the base cost (usually a small constant).
   */
```

**Function: `lv`**
```javascript
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
```

**Function: `upgradeBuilding`**
```javascript
/**
   * Externally callable method to upgrade a specific building if conditions are met.
   *
   * @description This public API method allows external game systems (e.g., player interaction) to initiate a building upgrade for a specific building belonging to this tribe. It performs checks for ownership, maximum level, and resource affordability, then applies the upgrade, increasing the building's level and health attributes.
   *
   * @workflow
   * 1. If `building` is null or its `tribe` ID does not match `this.id`, returns immediately.
   * 2. Retrieves `maxLv` from `CONFIG.BUILDING_MAX_LEVEL` for the building type.
   * 3. If `building.level` is already greater than or equal to `maxLv`, returns immediately.
   * 4. Calls `this._upgradeCost(building)` to get the upgrade cost.
   * 5. Calls `this._canAfford(cost)`. If `false`, returns immediately.
   * 6. Calls `this._payCost(cost)` to deduct resources.
   * 7. Increments `building.level`.
   * 8. Calculates `baseHp` from `CONFIG.BUILDING_HP`.
   * 9. Updates `building.maxHp` based on `baseHp` and the new `level`.
   * 10. Updates `building.hp` by adding a portion of `baseHp`, capped at `building.maxHp`.
   *
   * @param {Object} building - The building object to upgrade. Must belong to this tribe.
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_MAX_LEVEL, CONFIG.BUILDING_HP, this.id, this._upgradeCost(), this._canAfford(), this._payCost(), Math.round(), Math.min().
   * @modifies building.level, building.maxHp, building.hp, this.res (via `_payCost`).
   * @triggers Called by player actions or other external game systems.
   * @performance O(1) for checks and calculations.
   */
```

**Function: `_doMilitaryLogic`**
```javascript
/**
   * Manages the periodic spawning of military and worker units.
   *
   * @description This private method periodically assesses the tribe's unit composition and attempts to spawn new units like warriors, leaders, workers, and scouts. It checks for sufficient food and population, availability of barracks or capitol, and resource costs, ensuring that the tribe maintains a balanced and growing force based on strategic needs and resources.
   *
   * @workflow
   * 1. Increments `this._militaryTimer`.
   * 2. Calculates `spawnRate` based on `this.techLevel`, clamped between 5 and 30.
   * 3. If `this._militaryTimer` is less than `spawnRate`, returns immediately.
   * 4. Resets `this._militaryTimer` to 0.
   * 5. If `this.res.food` is less than 5 or `this.population` is less than 6, returns immediately.
   * 6. Filters `this.buildings` to find `BARRACKS` and `CAPITOL` buildings.
   * 7. Counts existing `WARRIOR`, `WORKER`, `SCOUT`, and `LEADER` units.
   * 8. Calculates `maxWarriors`, `maxWorkers`, `maxScouts`, `maxLeaders` based on population, barracks count, and tech level.
   * 9. If barracks exist, warriors are below `maxWarriors`, and `this.res.metal` is sufficient:
   *    a. Selects a random barracks `b`.
   *    b. Calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR)`.
   *    c. Deducts food (5) and metal (3) resources.
   *    d. Returns.
   * 10. If barracks exist, leaders are below `maxLeaders`, a random check passes (0.18 chance), and `this.res.metal` is sufficient:
   *    a. Selects the first barracks `b`.
   *    b. Calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.LEADER)`.
   *    c. Deducts food (12) and metal (10) resources.
   *    d. Returns.
   * 11. If capitol exists, workers are below `maxWorkers`, a random check passes (0.50 chance), and `this.res.wood` is sufficient:
   *    a. Calls `this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.WORKER)`.
   *    c. Deducts wood (5) resource.
   *    d. Returns.
   * 12. If capitol exists, scouts are below `maxScouts`, a random check passes (0.40 chance), and `this.res.food` is sufficient:
   *    a. Calls `this._spawnUnit(capitol.x, capitol.y, CONFIG.ENTITY.SCOUT)`.
   *    b. Deducts food (5) resource.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, this.res, this.population, this.techLevel, this.buildings, this.units, this._spawnUnit(), Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies this._militaryTimer, this.res.food, this.res.metal, this.res.wood, this.units, world (via `_spawnUnit`).
   * @triggers Called by `tick()`.
   * @performance O(U + B) where U is the number of units and B is the number of buildings (for filtering).
   */
```

**Function: `_doAttackLogic`**
```javascript
/**
   * Coordinates the tribe's offensive military actions against the enemy.
   *
   * @description This private method periodically decides whether to launch an attack and, if so, which enemy building to target and which units to send. It considers factors like attack frequency, morale, and the availability of idle warriors, leaders, and scouts. It then assigns marching orders to the selected units, directing them towards the target and logging the offensive action.
   *
   * @workflow
   * 1. Increments `this._attackTimer`.
   * 2. Calculates `aggRate` based on `this.techLevel`, clamped between 12 and 70.
   * 3. If `this._attackTimer` is less than `aggRate`, returns immediately.
   * 4. Resets `this._attackTimer` to 0.
   * 5. Retrieves `moralePenalty` from `this.debuffs`.
   * 6. If a random check (`Math.random() < moralePenalty * 0.5`) indicates a morale-based deterrence, returns immediately.
   * 7. Filters `this.units` to find idle `WARRIOR` units.
   * 8. If fewer than 2 idle warriors are available, returns immediately.
   * 9. If the `_enemy.buildings` array is empty, returns immediately (no targets).
   * 10. Defines a `priorityOrder` for enemy building types to target (Capitol, Barracks, Farm, Fort, Storehouse).
   * 11. Initializes `target` to `null`.
   * 12. For each `ptype` in `priorityOrder`:
   *    a. Filters `_enemy.buildings` for `opts` of that `ptype`.
   *    b. If `opts` are found, selects a random `target` from `opts` and breaks the loop.
   * 13. If no prioritized `target` was found, selects a random building from `_enemy.buildings`.
   * 14. Calculates `maxGroup` size based on idle warriors, tech level, and population percentage.
   * 15. Creates `group` by taking `maxGroup` idle warriors.
   * 16. Finds an idle `LEADER` unit. If found, adds it to `group`.
   * 17. Finds up to 2 idle `SCOUT` units. Adds them to `group`.
   * 18. For each `u` in `group`:
   *    a. Sets `u.state` to 'marching'.
   *    b. Sets `u.targetX` and `u.targetY` to coordinates near the `target` building.
   * 19. If a random check passes (0.35 chance), logs an attack message using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, Game.eventLog(), this.debuffs, this.units, this.techLevel, this.population, this._enemy.buildings, Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies this._attackTimer, unit.state, unit.targetX, unit.targetY for selected units.
   * @triggers Called by `tick()`.
   * @performance O(U + B) where U is the number of units and B is the number of enemy buildings, due to filtering and iterating.
   */
```

**Function: `_updateUnits`**
```javascript
/**
   * Iterates through all tribe units, updating their state, movement, and combat actions.
   *
   * @description This comprehensive private method is the core AI logic for individual units. It processes movement timers, handles hunger-driven movement, and defines specific behaviors for warriors, leaders (marching, fighting, retreating, defecting), workers (resource gathering, repairing, planting), scouts (patrolling, detecting enemies), and normal units (wandering). It also manages unit health, attacks, and despawning upon death or defection.
   *
   * @workflow
   * 1. Iterates backwards through `this.units` array:
   *    a. Selects unit `u`.
   *    b. Ensures `u.stats` are initialized by calling `this._rollUnitStats()`.
   *    c. Calculates `baseMI` (move interval) based on unit type.
   *    d. Retrieves `weatherMult` from `this._world.weatherMods`.
   *    e. Gets the tile `u` is on and determines `roadDiv` if a road is present.
   *    f. Calls `this._agilityFactor(stats)` to get an agility-based multiplier.
   *    g. Calculates `moveInterval` (clamped between 1 and `baseMI` * multipliers).
   *    h. Increments `u._moveTimer`.
   *    i. Sets `canAct` if `u._moveTimer` meets `moveInterval`. If `canAct`, resets `u._moveTimer`.
   *    j. If `u` has `_pauseTicks` and it's greater than 0:
   *       i. Decrements `u._pauseTicks` and continues to next unit.
   *    k. If `u.state` is not 'fighting' and `canAct`:
   *       i. If a random check passes (chance based on unit type), sets `u._pauseTicks` for a short duration and continues.
   *    l. If `u` has `_hungerTarget` and `u.state` is not 'fighting':
   *       i. If `canAct`, calls `this._stepTowardVaried(u, u._hungerTarget.x, u._hungerTarget.y)`.
   *       ii. If `u` is close to `_hungerTarget`, clears `u._hungerTarget` and continues.
   *    m. If `u.type` is `WARRIOR` or `LEADER`:
   *       i. If `u.state` is 'marching' and `canAct`:
   *          1. If `u` is close to `u.targetX, u.targetY`, sets `u.state` to 'fighting'.
   *          2. Else, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       ii. If `u.state` is 'fighting':
   *          1. If not `canAct`, continues.
   *          2. Calls `this._tryDefect(u)`. If `true`:
   *             A. Calls `this._despawnUnitAtIndex(i)`.
   *             B. Adds `u` to `_enemy.units`.
   *             C. Recalculates `_enemy.military` and `this.military`.
   *             D. Continues to next unit.
   *          3. Calls `this._shouldRetreat(u)`. If `true`:
   *             A. Sets `u.state` to 'idle', clears `u.attackTarget`.
   *             B. Continues.
   *          4. Checks for `leaderNearby` and calculates `leaderBonus`.
   *          5. Filters `_enemy.units` and `_enemy.buildings` within range.
   *          6. Calculates `atkPower` based on unit stats, tech level, and leader strength/bonus.
   *          7. If `enemyUnits` are found:
   *             A. Selects first `tgt`.
   *             B. Calculates `dmg`, applies defense reduction to `tgt.hp`.
   *             C. Sets `u.attackTarget`.
   *             D. If `tgt.hp <= 0`, despawns `tgt` from enemy, increments enemy casualties, logs kill message.
   *             E. Calculates `retaliation` damage, applies defense reduction to `u.hp`.
   *          8. Else if `enemyBuildings` are found:
   *             A. Selects first `bld`.
   *             B. Calculates `bldDmg`, applies it to `bld.hp`.
   *             C. Sets `u.attackTarget`, sets `bld._underAttack` timer.
   *             D. If `bld.hp <= 0`, removes `bld` from enemy buildings, logs destroy message.
   *             E. Reduces `u.hp` by a small amount.
   *          9. Else (no enemies in range), sets `u.state` to 'idle', clears `u.attackTarget`.
   *       iii. If `u.hp <= 0` (after fighting or retaliation):
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Increments `this.casualties`.
   *          3. Recalculates `this.military`.
   *    n. If `u.type` is `WORKER`:
   *       i. Finds `STOREHOUSE` buildings and calculates `storageCap`.
   *       ii. Finds `nearTree` within range.
   *       iii. If `nearTree` exists and `this.res.wood` is below 80% capacity:
   *          1. If `u` is at `nearTree`'s location: harvests tree, updates `this.res.wood`, potentially plants new tree.
   *          2. Else if `canAct`, calls `this._stepTowardVaried(u, nearTree.x, nearTree.y)` and sets `u.state` to 'working'.
   *          3. Continues.
   *       iv. If `this.res.wood` is low and `canAct` (10% chance), randomly plants a tree.
   *       v. Finds `damaged` buildings (hp < maxHp), sorted by health fraction.
   *       vi. If `damaged` buildings exist:
   *          1. Selects `target`.
   *          2. If `u` is close to `target`: if `canAct`, repairs building using `_getWorkerBuildSpeed`, updates `target.hp`.
   *          3. Else if `canAct`: calls `this._stepTowardVaried(u, target.x, target.y)`.
   *          4. Sets `u.state` to 'working'.
   *       vii. Else (no work):
   *          1. If `canAct` (15% chance), sets `u.targetX, u.targetY` to a random spot around capitol.
   *          2. If `canAct` and `u.targetX` is defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *          3. Sets `u.state` to 'idle'.
   *    o. If `u.type` is `SCOUT`:
   *       i. If not `canAct`, continues.
   *       ii. Checks for `closeEnemy` within range.
   *       iii. If `closeEnemy` found: attacks it, applies damage, sets `u.attackTarget`. If enemy dies, despawns it from enemy, increments enemy casualties, recalculates enemy military. Continues.
   *       iv. Calculates `distToMid` based on `u.x` and `CONFIG.MAP_W`.
   *       v. If `u.state` is 'idle' or `u.patrolDir` is not set: sets `u.patrolDir` based on distance to map center, sets `u.state` to 'patrolling'.
   *       vi. If `u.state` is 'patrolling':
   *          1. Calculates `tx, ty` for movement.
   *          2. If `_world.isWalkable(tx, ty)`, moves `u` and notifies `_world`.
   *          3. Checks for `nearEnemy` within range. If found (5% chance), logs warning.
   *          4. Adjusts `u.patrolDir` if `u` is too close or far from map center.
   *    p. If `u.type` is `NORMAL`:
   *       i. If not `canAct`, continues.
   *       ii. If `u.state` is 'idle' (28% chance), finds a home or first building, sets `u.targetX, u.targetY` to a random spot around it, and sets `u.state` to 'wandering'.
   *       iii. If `u.targetX, u.targetY` are defined, calls `this._stepTowardVaried(u, u.targetX, u.targetY)`.
   *       iv. If `u` is close to target, sets `u.state` to 'idle'.
   * 2. Recalculates `this.military` after the loop.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY constants, CONFIG.SCOUT_MOVE_INTERVAL, CONFIG.UNIT_MOVE_INTERVAL, CONFIG.UNIT_ROAD_DIVISOR, CONFIG.UNIT_HP, CONFIG.UNIT_STATS_BASE, CONFIG.MAP_W, Game.eventLog(), this.units, this.buildings, this._world.weatherMods, this._world.getTile(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), this._world.getEntitiesAt(), this._world.getNearbyTree(), this._world.harvestTree(), this._world.plantTree(), this._enemy.units, this._enemy.buildings, this._enemy._despawnUnitByObject(), this._rollUnitStats(), this._agilityFactor(), this._stepTowardVaried(), this._tryDefect(), this._shouldRetreat(), this._nearbyLeader(), this._getUnitAttackValue(), this._applyDefenseReduction(), this._despawnUnitAtIndex(), this._getWorkerBuildSpeed(), Math.abs(), Math.sqrt(), Math.round(), Math.min(), Math.max(), Math.floor(), Math.random().
   * @modifies unit._moveTimer, unit._pauseTicks, unit._hungerTarget, unit.state, unit.targetX, unit.targetY, unit.attackTarget, unit.hp, unit.tribe, this.res.wood, this.res.food, this.units, this.military, this.casualties, this._enemy.units, this._enemy.military, this._enemy.casualties, this._enemy.buildings, building._underAttack, world (by moving/removing entities, harvesting/planting trees).
   * @triggers Called by `tick()`.
   * @performance O(U * R) where U is the number of units and R is the average range check (small constant for neighbors, or limited range for enemies/buildings). Dominant factor is U.
   */
```

**Function: `roadDiv`**
```javascript
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
```

**Function: `_updateTowers`**
```javascript
/**
   * Manages the automatic attack logic for all defensive towers.
   *
   * @description This private method periodically processes all tower buildings, allowing them to automatically target and attack nearby enemy units. It calculates tower range and damage based on level, prioritizes the closest enemy unit, applies damage, and despawns enemy units if their health drops to zero, updating enemy military stats.
   *
   * @workflow
   * 1. Increments `this._towerTimer`.
   * 2. If `this._towerTimer` is less than 6, returns immediately.
   * 3. Resets `this._towerTimer` to 0.
   * 4. Filters `this.buildings` to get all `TOWER` buildings.
   * 5. For each `tower` in `towers`:
   *    a. Gets `level` of the tower.
   *    b. Calculates `range` and `dmg` based on `level` and `CONFIG` constants.
   *    c. Filters `this._enemy.units` to find units `inRange` of the tower.
   *    d. If no units `inRange`, clears `tower.attackTarget` and continues to next tower.
   *    e. Sorts `inRange` units by their Manhattan distance to the tower (closest first).
   *    f. Selects the first unit as `target`.
   *    g. Applies defense reduction to `target.hp` using `dmg`.
   *    h. Sets `tower.attackTarget` to the target's coordinates and ID.
   *    i. Sets `target._underFire` timer.
   *    j. If `target.hp <= 0`:
   *       i. Calls `this._enemy._despawnUnitByObject(target)`.
   *       ii. Recalculates `this._enemy.military`.
   *       iii. Increments `this._enemy.casualties`.
   *       iv. Clears `tower.attackTarget`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.TOWER, CONFIG.TOWER_RANGE, CONFIG.TOWER_DAMAGE, this.buildings, this._enemy.units, this._enemy._despawnUnitByObject(), this._applyDefenseReduction(), Math.abs().
   * @modifies this._towerTimer, tower.attackTarget, unit.hp, unit._underFire for attacked units, this._enemy.units, this._enemy.military, this._enemy.casualties.
   * @triggers Called by `tick()`.
   * @performance O(T * U) where T is the number of towers and U is the number of enemy units (due to filtering and sorting for each tower). Can be significant.
   */
```

**Function: `_stepToward`**
```javascript
/**
   * Moves a unit one step closer to a target coordinate, avoiding obstacles and enemy walls.
   *
   * @description This private helper function calculates the best adjacent walkable tile for a unit to move towards a specific target (`tx`, `ty`). It evaluates all neighboring tiles, filtering out non-walkable terrain and tiles containing enemy walls, then selects the neighbor that minimizes the Euclidean distance to the target. The unit's position is updated, and the world is notified of the movement.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately (already at target).
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes `best` to `null` and `bestDist` to `Infinity`.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. If `d` is less than `bestDist`: updates `bestDist` to `d` and `best` to `n`.
   * 5. If `best` is found:
   *    a. Updates `u.x` to `best.x` and `u.y` to `best.y`.
   *    b. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by internal unit movement logic (e.g., in early versions or specific scenarios).
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors (e.g., 4 or 8).
   */
```

**Function: `d`**
```javascript
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
```

**Function: `_stepTowardVaried`**
```javascript
/**
   * Moves a unit one step closer to a target coordinate, with a slight random variation to prevent predictable paths.
   *
   * @description This private helper function moves a unit towards a target `tx, ty` similar to `_stepToward`, but introduces randomness. It evaluates all valid neighboring tiles, filters obstacles and enemy walls, then sorts them by distance. It usually picks the closest, but has a chance to pick a slightly less optimal but still close tile, leading to more natural and less "grid-like" movement patterns.
   *
   * @workflow
   * 1. If `u.x` is `tx` and `u.y` is `ty`, returns immediately.
   * 2. Calls `this._world.getNeighbors(u.x, u.y)` to get adjacent tiles.
   * 3. Initializes an `options` array.
   * 4. For each `n` in `neighbors`:
   *    a. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *    b. If `this._world.hasEnemyWall(n.x, n.y, this.id)` is `true`, continues.
   *    c. Calculates squared Euclidean distance `d` from `n` to `tx, ty`.
   *    d. Pushes `{ n, d }` to `options`.
   * 5. If `options` is empty, returns immediately (no valid moves).
   * 6. Sorts `options` by distance `d` in ascending order.
   * 7. Sets `pick` to the first (closest) option.
   * 8. If `options.length` is greater than 1 and a random check passes (0.22 chance):
   *    a. Filters `options` to `alt` containing options whose distance is within 2.0 of the closest.
   *    b. Selects a random `pick` from `alt`.
   * 9. Updates `u.x` to `pick.n.x` and `u.y` to `pick.n.y`.
   * 10. Calls `this._world.notifyEntityMoved(u)`.
   *
   * @param {Object} u - The unit object to move. Must have `x` and `y` properties.
   * @param {number} tx - The target X coordinate.
   * @param {number} ty - The target Y coordinate.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), this._world.hasEnemyWall(), this._world.notifyEntityMoved(), Math.random().
   * @modifies u.x, u.y, world (via `notifyEntityMoved`).
   * @triggers Called by `_updateUnits()` for most unit movement.
   * @performance O(1) as `getNeighbors` returns a small constant number of neighbors, and sorting/filtering is on a very small array.
   */
```

**Function: `_nearbyLeader`**
```javascript
/**
   * Checks if a leader unit from the same tribe is within a short range of a given unit.
   *
   * @description This private helper function determines if any of the tribe's leader units are in close proximity (within a 3x3 square radius) to a specified unit. This check is primarily used to apply combat bonuses to units operating near their leader, simulating the effect of leadership on battlefield performance.
   *
   * @workflow
   * 1. Iterates through `this.units`.
   * 2. For each `other` unit:
   *    a. If `other.type` is `CONFIG.ENTITY.LEADER` AND `Math.abs(other.x - u.x)` is less than or equal to 3 AND `Math.abs(other.y - u.y)` is less than or equal to 3, returns `true`.
   * 3. If no such leader is found after checking all units, returns `false`.
   *
   * @param {Object} u - The unit object to check for nearby leaders.
   * @returns {boolean} True if a leader is within 3 tiles (inclusive) horizontally and vertically, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, this.units, Math.abs().
   * @modifies None.
   * @triggers Called by `_updateUnits()` when processing warrior/leader combat logic.
   * @performance O(U) where U is the number of units in the tribe.
   */
```

**Function: `_applyDebuffDecay`**
```javascript
/**
   * Decrements the strength of all active debuffs affecting the tribe.
   *
   * @description This private method is called periodically to simulate the natural decay or weakening of debuffs over time. It iterates through all active debuffs in `this.debuffs`, reduces their strength by a small amount, and removes any debuffs that have completely decayed (strength falls to zero or below).
   *
   * @workflow
   * 1. For each `key` in `Object.keys(this.debuffs)`:
   *    a. Decrements `this.debuffs[key]` by 0.008, ensuring it doesn't go below 0.
   *    b. If `this.debuffs[key]` is less than or equal to 0, deletes the `key` from `this.debuffs`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies Object.keys(), Math.max().
   * @modifies this.debuffs (values reduced, properties potentially deleted).
   * @triggers Called by `tick()`.
   * @performance O(D) where D is the number of active debuffs (usually a small constant).
   */
```

**Function: `_placeBuilding`**
```javascript
/**
   * Creates and places a new building on the game map.
   *
   * @description This private method instantiates a new building object with specified coordinates and type, assigns it initial health, and adds it to the tribe's `buildings` array and the game world. Special handling is included for farms to initialize their size and worker arrays. For farms, it also ensures initial farmland plots are established.
   *
   * @workflow
   * 1. Retrieves `maxHp` for `type` from `CONFIG.BUILDING_HP` or defaults to 200.
   * 2. Creates a `b` (building) object with `x, y, type, hp, maxHp, tribe, level`.
   * 3. If `type` is `CONFIG.ENTITY.FARM`:
   *    a. Sets `b.size` to 1.
   *    b. Initializes `b._workers` to an empty array.
   *    c. Initializes `b.farmland` to an empty array.
   * 4. Pushes `b` to `this.buildings`.
   * 5. Calls `this._world.addEntity(b)` to add the building to the game world.
   * 6. If `type` is `CONFIG.ENTITY.FARM`, calls `this._ensureFarmFarmland(b)` to establish initial farmland.
   *
   * @param {number} x - The X coordinate for the building.
   * @param {number} y - The Y coordinate for the building.
   * @param {string} type - The type of building (e.g., `CONFIG.ENTITY.CAPITOL`).
   * @returns {void}
   *
   * @dependencies CONFIG.BUILDING_HP, CONFIG.ENTITY.FARM, this.id, this._world.addEntity(), this._ensureFarmFarmland().
   * @modifies this.buildings, world (by adding entity).
   * @triggers Called by `init()`, `_doBuildLogic()`, `_seedStartingHomes()`.
   * @performance O(1) for object creation and array push, plus O(N) for `_ensureFarmFarmland` in the worst case (small N).
   */
```

**Function: `_spawnUnit`**
```javascript
/**
   * Creates and places a new unit on the game map.
   *
   * @description This private method instantiates a new unit object of a specified type at a given location. It finds the nearest walkable tile, rolls initial stats for the unit, calculates its maximum health, and then adds the unit to the tribe's `units` array and the game world. It also initializes unit-specific properties like state and hunger.
   *
   * @workflow
   * 1. Calls `this._world.findNearestWalkable(x, y)` to get a valid spawning position `p`.
   * 2. Calls `this._rollUnitStats(type)` to generate random stats for the unit.
   * 3. Retrieves `baseHp` for `type` from `CONFIG.UNIT_HP` or defaults to 10.
   * 4. Calls `this._getUnitMaxHp(baseHp, stats)` to calculate `maxHp`.
   * 5. Creates a `u` (unit) object with `x, y, type, hp, maxHp, state, targetX, targetY, tribe, _moveTimer, stats, hunger, _hungerFullTicks, _hungerTarget`.
   * 6. Pushes `u` to `this.units`.
   * 7. Calls `this._world.addEntity(u)` to add the unit to the game world.
   *
   * @param {number} x - The desired X coordinate for unit spawning.
   * @param {number} y - The desired Y coordinate for unit spawning.
   * @param {string} type - The type of unit to spawn (e.g., `CONFIG.ENTITY.WARRIOR`).
   * @returns {void}
   *
   * @dependencies CONFIG.UNIT_HP, this.id, this._world.findNearestWalkable(), this._world.addEntity(), this._rollUnitStats(), this._getUnitMaxHp().
   * @modifies this.units, world (by adding entity).
   * @triggers Called by `init()`, `_doMilitaryLogic()`, `_syncPopulationUnits()`, `giftWeapons()`.
   * @performance O(W) for `findNearestWalkable` (bounded by world size), otherwise O(1) for object creation and array push.
   */
```

**Function: `_getUnitAttackValue`**
```javascript
/**
   * Calculates the base attack value of a unit based on its type and stats.
   *
   * @description This private helper function computes the offensive power of a given unit or unit type. It uses a base attack value determined by the unit's class (Warrior, Leader, Scout, Worker, Normal) and then scales it further by the unit's individual `strength` statistic, providing a dynamic combat rating.
   *
   * @workflow
   * 1. Determines `type` from `unitOrType` (either a string or an object with a `type` property).
   * 2. Determines `stats` from `unitOrType` if it's an object, otherwise uses base stats for the type.
   * 3. Retrieves `strength` from `stats` or defaults to 5.
   * 4. If `type` is `CONFIG.ENTITY.WARRIOR`, returns `1.8 + strength * 0.30`.
   * 5. If `type` is `CONFIG.ENTITY.LEADER`, returns `2.7 + strength * 0.34`.
   * 6. If `type` is `CONFIG.ENTITY.SCOUT`, returns `0.9 + strength * 0.22`.
   * 7. If `type` is `CONFIG.ENTITY.WORKER`, returns `0.4 + strength * 0.10`.
   * 8. If `type` is `CONFIG.ENTITY.NORMAL`, returns `0.2 + strength * 0.05`.
   * 9. Else (default/fallback), returns `1.5 + strength * 0.2`.
   *
   * @param {Object|string} unitOrType - Either a unit object with `type` and `stats` properties, or a string representing the unit type.
   * @returns {number} The calculated attack value.
   *
   * @dependencies CONFIG.ENTITY constants, CONFIG.UNIT_STATS_BASE.
   * @modifies None.
   * @triggers Called by `_updateUnits()` (for unit combat).
   * @performance O(1).
   */
```

**Function: `_getWorkerBuildSpeed`**
```javascript
/**
   * Calculates the build/repair speed of a worker unit based on its strength.
   *
   * @description This private helper function determines how effectively a worker unit can contribute to building construction or repair. It takes the worker's individual `strength` statistic into account, providing a base speed that increases with higher strength, simulating a more efficient builder.
   *
   * @workflow
   * 1. Retrieves `strength` from `unit.stats` or defaults to 5 if stats are not present or worker type base strength.
   * 2. Returns `1.2 + strength * 0.32`.
   *
   * @param {Object} unit - The worker unit object. Must have a `stats` property with `strength`.
   * @returns {number} The calculated build/repair speed value.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, CONFIG.ENTITY.WORKER.
   * @modifies None.
   * @triggers Called by `_updateUnits()` (for worker repair logic).
   * @performance O(1).
   */
```

**Function: `_getUnitMaxHp`**
```javascript
/**
   * Calculates a unit's maximum hit points based on its base HP and endurance stats.
   *
   * @description This private helper function determines the total health a unit can have. It takes a base health value and modifies it with an endurance multiplier derived from the unit's `endurance` statistic. Higher endurance directly translates to a greater maximum HP, making units more resilient. The result is always at least 2 HP.
   *
   * @workflow
   * 1. Calculates `enduranceMult` using `stats.endurance` (scaled from 0.6 to 1.4).
   * 2. Returns `Math.max(2, Math.round(baseHp * enduranceMult))`, ensuring a minimum of 2 HP.
   *
   * @param {number} baseHp - The inherent base hit points for the unit type.
   * @param {Object} stats - The unit's stat object, containing an `endurance` property.
   * @returns {number} The calculated maximum hit points for the unit.
   *
   * @dependencies Math.max(), Math.round().
   * @modifies None.
   * @triggers Called by `_spawnUnit()`.
   * @performance O(1).
   */
```

**Function: `_agilityFactor`**
```javascript
/**
   * Calculates a movement speed factor based on a unit's agility.
   *
   * @description This private helper function determines how a unit's `agility` statistic influences its movement speed. Higher agility results in a lower factor (faster movement), while lower agility results in a higher factor (slower movement). The factor is clamped within a reasonable range to prevent extreme speeds.
   *
   * @workflow
   * 1. Calculates `f` as `1.0 - (stats.agility - 5) * 0.06`.
   * 2. Returns `Math.max(0.55, Math.min(1.45, f))`, clamping the factor between 0.55 and 1.45.
   *
   * @param {Object} stats - The unit's stat object, containing an `agility` property.
   * @returns {number} The calculated agility movement factor (lower means faster).
   *
   * @dependencies Math.max(), Math.min().
   * @modifies None.
   * @triggers Called by `_updateUnits()` when calculating unit move intervals.
   * @performance O(1).
   */
```

**Function: `_applyDefenseReduction`**
```javascript
/**
   * Calculates the effective damage taken by a unit after applying its defense stat.
   *
   * @description This private helper function simulates a unit's defensive capabilities against incoming damage. It takes the raw damage dealt and reduces it by a percentage derived from the unit's `defense` statistic. Higher defense leads to a greater reduction in damage, making the unit more durable in combat. The reduction is capped at 60%.
   *
   * @workflow
   * 1. Retrieves `defense` from `unit.stats` or defaults to 5.
   * 2. Calculates `reduction` as `defense * 0.04`, clamped between 0 and 0.60.
   * 3. Returns `rawDamage * (1 - reduction)`.
   *
   * @param {Object} unit - The unit object taking damage. Must have a `stats` property with `defense`.
   * @param {number} rawDamage - The initial damage value before defense is applied.
   * @returns {number} The final damage value after defense reduction.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, Math.max(), Math.min().
   * @modifies None.
   * @triggers Called by `_updateUnits()` and `_updateTowers()` when applying damage to units.
   * @performance O(1).
   */
```

**Function: `_shouldRetreat`**
```javascript
/**
   * Determines if a unit should attempt to retreat from combat.
   *
   * @description This private helper function assesses whether a unit, particularly in combat, decides to retreat. It primarily considers the unit's current health fraction and its `tenacity` and `loyalty` stats. Units with low health or low morale are more likely to retreat, while tenacious and loyal units will hold their ground longer.
   *
   * @workflow
   * 1. Calculates `hpFrac` (current HP / max HP).
   * 2. If `hpFrac` is greater than 0.55, returns `false` (not low enough health).
   * 3. Retrieves `tenacity` and `loyalty` from `unit.stats` or defaults to 5.
   * 4. Calculates `holdChance` based on `tenacity`, `loyalty`, and `hpFrac`, clamped between 0.08 and 0.96.
   * 5. Returns `true` if `Math.random()` is greater than `holdChance` (meaning the unit fails to hold), otherwise `false`.
   *
   * @param {Object} unit - The unit object to evaluate for retreat. Must have `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit should retreat, false otherwise.
   *
   * @dependencies Math.max(), Math.min(), Math.random().
   * @modifies None.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
```

**Function: `_tryDefect`**
```javascript
/**
   * Determines if a unit defects to the enemy tribe during combat.
   *
   * @description This private helper function simulates the possibility of a non-leader unit abandoning its tribe and joining the enemy. It's influenced by the unit's `loyalty` stat, its current health, and the tribe's overall morale. Units with lower loyalty, low health, or poor tribal morale are more prone to defection. If a unit defects, its tribe is switched, and a game event is logged.
   *
   * @workflow
   * 1. If `unit.type` is `CONFIG.ENTITY.LEADER`, returns `false` (leaders cannot defect).
   * 2. Retrieves `loyalty` from `unit.stats` or defaults to 5.
   * 3. If `loyalty` is 6.0 or higher, returns `false` (too loyal).
   * 4. Calculates `hpFrac` (current HP / max HP).
   * 5. Calculates `moralePenalty` based on `this.morale`.
   * 6. Calculates `baseChance` for defection, incorporating `loyalty`, `moralePenalty`, and `hpFrac`.
   * 7. Clamps `baseChance` to `chance` between 0 and 0.16.
   * 8. If `Math.random()` is greater than or equal to `chance`, returns `false`.
   * 9. Sets `unit.tribe` to `this._enemy.id`.
   * 10. Sets `unit.state` to 'idle' and clears `unit.targetX, unit.targetY`.
   * 11. Logs the defection event using `Game.eventLog()`.
   * 12. Returns `true`.
   *
   * @param {Object} unit - The unit object to evaluate for defection. Must have `type`, `hp`, `maxHp`, and `stats` properties.
   * @returns {boolean} True if the unit defects, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.LEADER, Game.eventLog(), this._enemy.id, this.morale, Math.max(), Math.min(), Math.random().
   * @modifies unit.tribe, unit.state, unit.targetX, unit.targetY.
   * @triggers Called by `_updateUnits()` for warrior/leader combat logic.
   * @performance O(1).
   */
```

**Function: `baseChance`**
```javascript
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
```

**Function: `_rollUnitStats`**
```javascript
/**
   * Generates random combat and behavioral statistics for a new unit.
   *
   * @description This private helper function creates a new set of statistics (strength, loyalty, agility, tenacity, endurance, defense) for a unit of a given type. It uses base stats defined in `CONFIG.UNIT_STATS_BASE` and applies a random variance, further adjusting them based on the tribe's `techLevel` to reflect technological advancement. Stats are clamped between 1 and 10.
   *
   * @workflow
   * 1. Retrieves `base` stats from `CONFIG.UNIT_STATS_BASE` for the given `type` or uses a default.
   * 2. Retrieves `v` (variance) from `CONFIG.UNIT_STATS_VARIANCE`.
   * 3. Calculates `techAdj` based on `this.techLevel`.
   * 4. Defines a `roll(k)` helper function:
   *    a. Calculates `r` by taking `base[k]`, adding a random variance (between -v and +v), and adding `techAdj`.
   *    b. Clamps `r` between 1 and 10, and converts to a float with 2 decimal places.
   *    c. Returns `r`.
   * 5. Returns an object containing rolled `strength`, `loyalty`, `agility`, `tenacity`, `endurance`, and `defense` stats.
   *
   * @param {string} type - The type of unit for which to roll stats.
   * @returns {Object.<string, number>} An object containing the generated stats.
   *
   * @dependencies CONFIG.UNIT_STATS_BASE, CONFIG.UNIT_STATS_VARIANCE, this.techLevel, Math.random(), Math.max(), Math.min(), parseFloat(), toFixed().
   * @modifies None.
   * @triggers Called by `_spawnUnit()` and `_updateUnits()` (if a unit's stats haven't been rolled yet).
   * @performance O(1) for a fixed number of stat rolls.
   */
```

**Function: `roll`**
```javascript
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
```

**Function: `_updateHunger`**
```javascript
/**
   * Manages the hunger levels of all units and applies consequences of starvation.
   *
   * @description This private method processes the hunger of every unit in the tribe. Units continuously get hungrier; if they reach a critical hunger level, they attempt to eat from nearby food storage buildings. If a unit goes without food for too long, it will eventually die, impacting population and morale.
   *
   * @workflow
   * 1. Filters `this.buildings` to get `STOREHOUSE` and `CAPITOL` buildings as `foodBuildings`.
   * 2. Iterates backwards through `this.units`:
   *    a. Selects unit `u`.
   *    b. Increments `u.hunger` by `CONFIG.HUNGER_RATE`, capped at `CONFIG.HUNGER_MAX`.
   *    c. If `u.hunger` reaches `CONFIG.HUNGER_MAX`:
   *       i. Increments `u._hungerFullTicks`.
   *       ii. If `u._hungerFullTicks` reaches `CONFIG.HUNGER_DEATH_TICKS`:
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Decrements `this.population` (min 0).
   *          3. Decrements `this.morale` (min 0.05).
   *          4. If a random check passes (30% chance), logs death message.
   *          5. Continues to next unit.
   *    d. Else (`u` is not fully hungry), resets `u._hungerFullTicks` to 0.
   *    e. If `u.hunger` is at or above `CONFIG.HUNGER_EAT_THRESHOLD` AND `this.res.food` is at least 1 AND `foodBuildings` exist:
   *       i. Finds the `nearestFB` (food building) and `nearFBDist`.
   *       ii. If `nearestFB` is found and `u` is adjacent (distance <= 1):
   *          1. Calculates `foodNeeded` based on current hunger.
   *          2. Calculates `foodEaten` (min of `foodNeeded`, `this.res.food`, and 6).
   *          3. If `foodEaten` is greater than 0:
   *             A. Reduces `u.hunger`.
   *             B. Reduces `this.res.food`.
   *             C. Resets `u._hungerFullTicks` and `u._hungerTarget`.
   *       iii. Else if `nearestFB` is found (but not adjacent):
   *          1. Sets `u._hungerTarget` to `nearestFB`'s coordinates.
   *    f. Else (not hungry enough or no food/buildings), clears `u._hungerTarget`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.STOREHOUSE, CONFIG.ENTITY.CAPITOL, CONFIG.HUNGER_MAX, CONFIG.HUNGER_RATE, CONFIG.HUNGER_DEATH_TICKS, CONFIG.HUNGER_EAT_THRESHOLD, CONFIG.HUNGER_FOOD_RESTORE, Game.eventLog(), this.buildings, this.units, this.res.food, this._despawnUnitAtIndex(), Math.min(), Math.max(), Math.floor(), Math.ceil(), Math.abs(), Math.random().
   * @modifies unit.hunger, unit._hungerFullTicks, unit._hungerTarget, this.res.food, this.population, this.morale, this.units (via `_despawnUnitAtIndex`).
   * @triggers Called by `tick()`.
   * @performance O(U * B) where U is the number of units and B is the number of food buildings (for finding nearest).
   */
```

**Function: `_homeCapacityByLevel`**
```javascript
/**
   * Returns the population capacity provided by a home building at a given level.
   *
   * @description This private helper function determines how many population units a "home" building can house based on its current upgrade level. It provides a simple lookup for varying capacities, with higher-level homes accommodating more people.
   *
   * @workflow
   * 1. If `level` is 3 or greater, returns 6.
   * 2. Else if `level` is 2, returns 4.
   * 3. Else (level 1 or below), returns 3.
   *
   * @param {number} level - The current level of the home building.
   * @returns {number} The population capacity provided by the home.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by `_growPopulation()`, `_syncPopulationUnits()`.
   * @performance O(1).
   */
```

**Function: `_syncPopulationUnits`**
```javascript
/**
   * Synchronizes the number of "normal" units with the tribe's population, creating or despawning as needed.
   *
   * @description This private method ensures that the number of generic "normal" units accurately reflects the tribe's `population` count, after accounting for all specialized units (warriors, workers, scouts, leaders). If the population is higher than the current special + normal units, it spawns new normal units, primarily near homes. If the population is lower, it despawns excess normal units.
   *
   * @workflow
   * 1. Filters `this.units` into `special` (non-normal units) and `normal` (normal units).
   * 2. If `this.population` is less than the count of `special` units, adjusts `this.population` to `special.length`.
   * 3. Calculates `desiredNormals` as `Math.max(0, this.population - special.length)`.
   * 4. If `normal.length` is greater than `desiredNormals`:
   *    a. Calculates `removeCount` (`normal.length - desiredNormals`).
   *    b. Iterates backwards through `this.units`:
   *       i. If the unit is `NORMAL` and `removeCount` is greater than 0:
   *          1. Calls `this._despawnUnitAtIndex(i)`.
   *          2. Decrements `removeCount`.
   *    c. Recalculates `desiredNormals` after despawning.
   * 5. Counts `currentNormals` (normal units after potential despawning).
   * 6. While `currentNormals` is less than `desiredNormals`:
   *    a. Finds a `HOME` building or the first building available as a spawn point.
   *    b. If no home is found, breaks the loop.
   *    c. Calls `this._spawnUnit(home.x, home.y, CONFIG.ENTITY.NORMAL)`.
   *    d. Increments `currentNormals`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.NORMAL, CONFIG.ENTITY.HOME, this.population, this.units, this.buildings, this._despawnUnitAtIndex(), this._spawnUnit(), this._homeCapacityByLevel(), Math.max(), Math.ceil().
   * @modifies this.population, this.units (by adding/removing units), world (via `_spawnUnit`, `_despawnUnitAtIndex`).
   * @triggers Called by `init()` and `tick()`.
   * @performance O(U + B) in the worst case, as it iterates units for filtering and potentially multiple times for spawning/despawning. Spawning/despawning also involves `_spawnUnit` which has `findNearestWalkable` (O(W)).
   */
```

**Function: `_getFarmMaxTiles`**
```javascript
/**
   * Returns the maximum number of farmland tiles a farm building can have at a given level.
   *
   * @description This private helper function specifies the maximum size (number of arable plots) a farm building can achieve, dependent on its upgrade level. Higher levels allow for significantly more plots, enabling greater food production capacity.
   *
   * @workflow
   * 1. If `level` is 1 or less, returns 3.
   * 2. Else if `level` is 2, returns 6.
   * 3. Else (level 3 or greater), returns 10.
   *
   * @param {number} level - The current level of the farm building.
   * @returns {number} The maximum number of farmland tiles.
   *
   * @dependencies None.
   * @modifies None.
   * @triggers Called by `_expandFarmLand()`.
   * @performance O(1).
   */
```

**Function: `_getFarmBiomeBaseYield`**
```javascript
/**
   * Returns the base food yield multiplier for a farm tile based on its biome type.
   *
   * @description This private helper function determines the inherent fertility of a specific map tile for farming purposes. Different biome types, represented by `tileType` constants, have varying base yields, simulating the environmental suitability for agriculture. Tiles like water or mountain have zero yield, while wetlands and jungles are highly productive.
   *
   * @workflow
   * 1. Uses a series of `if/else if` statements to check `tileType` against `CONFIG.TILE` constants.
   * 2. Returns a specific base yield multiplier for known tile types (e.g., 0 for WATER/MOUNTAIN, 4.5 for JUNGLE).
   * 3. Defaults to 2.0 if `tileType` is not recognized.
   *
   * @param {string} tileType - The type of the map tile (e.g., `CONFIG.TILE.GRASS`).
   * @returns {number} The base food yield multiplier for that biome.
   *
   * @dependencies CONFIG.TILE constants.
   * @modifies None.
   * @triggers Called by `_gatherResources()`.
   * @performance O(1).
   */
```

**Function: `_getWeatherFarmTileFactor`**
```javascript
/**
   * Returns a food yield multiplier for farm tiles based on the current weather type.
   *
   * @description This private helper function applies environmental modifiers to farm production based on the prevailing weather conditions. Different weather types, represented by `CONFIG.WEATHER` constants, can positively or negatively impact crop growth, simulating the effects of sunshine, rain, drought, or snow on agricultural output.
   *
   * @workflow
   * 1. Uses a series of `if/else if` statements to check `type` against `CONFIG.WEATHER` constants.
   * 2. Returns a specific multiplier for known weather types (e.g., 1.15 for SUNSHINE, 0.32 for DROUGHT).
   * 3. Defaults to 1.0 if `type` is not recognized.
   *
   * @param {string} type - The type of weather (e.g., `CONFIG.WEATHER.RAIN`).
   * @returns {number} The weather-based food yield multiplier.
   *
   * @dependencies CONFIG.WEATHER constants.
   * @modifies None.
   * @triggers Called by `_gatherResources()`.
   * @performance O(1).
   */
```

**Function: `_ensureFarmFarmland`**
```javascript
/**
   * Ensures a farm building has initial farmland plots assigned to it.
   *
   * @description This private helper function guarantees that every farm building has at least some workable land. If a farm is created without any `farmland` or if its `farmland` array is empty, it attempts to assign up to two walkable neighboring tiles as initial plots. If no walkable neighbors exist, it defaults to the farm's own tile. It also updates the farm's `size` property.
   *
   * @workflow
   * 1. If `farm.farmland` is not defined, initializes it to an empty array.
   * 2. If `farm.farmland` is empty:
   *    a. Calls `this._world.getNeighbors(farm.x, farm.y)` to get adjacent tiles.
   *    b. Filters neighbors to include only `isWalkable` tiles.
   *    c. Adds up to the first 2 walkable neighbors (as `{x, y}` objects) to `farm.farmland`.
   *    d. If `farm.farmland` is still empty (no walkable neighbors), adds the farm's own tile `{ x: farm.x, y: farm.y }` to `farmland`.
   *    e. Sets `farm.size` to `farm.farmland.length`.
   *
   * @param {Object} farm - The farm building object to ensure farmland for. Must have `x`, `y` properties.
   * @returns {void}
   *
   * @dependencies this._world.getNeighbors(), this._world.isWalkable(), Math.min().
   * @modifies farm.farmland, farm.size.
   * @triggers Called by `_gatherResources()`, `_placeBuilding()`, `_expandFarmLand()`, `_assignFarmWorkers()`.
   * @performance O(1) as `getNeighbors` is a small constant operation.
   */
```

**Function: `_findExpandableFarmPlot`**
```javascript
/**
   * Searches for a new, valid, and unoccupied tile to expand a farm's farmland.
   *
   * @description This private helper function attempts to locate an adjacent tile that can be added to a farm's arable land. It considers the farm's current plots and direct neighbors, ensuring the candidate tile is walkable and not already occupied by another farm's plots or by any existing building. This allows for organic farm expansion on the map.
   *
   * @workflow
   * 1. Creates `occupiedByFarms` set to store coordinates of all existing farmland plots from all farms.
   * 2. Initializes `frontier` with the `farm`'s own coordinates and its existing `farmland` plots.
   * 3. For each `p` (plot) in `frontier`:
   *    a. Calls `this._world.getNeighbors(p.x, p.y)` to get `ns` (neighbors).
   *    b. For each `n` in `ns`:
   *       i. If `this._world.isWalkable(n.x, n.y)` is `false`, continues.
   *       ii. Creates a key `k` for `n.x, n.y`.
   *       iii. If `occupiedByFarms` already has `k`, continues.
   *       iv. Calls `this._world.getEntitiesAt(n.x, n.y)` to check for blocking entities.
   *       v. If `blocked` by any building with `CONFIG.BUILDING_HP`, continues.
   *       vi. Returns `{ x: n.x, y: n.y }` (found a valid plot).
   * 4. If no valid plot is found after checking all neighbors, returns `null`.
   *
   * @param {Object} farm - The farm building object to find an expansion plot for.
   * @returns {Object|null} An object `{ x, y }` for a new plot, or `null` if none found.
   *
   * @dependencies CONFIG.ENTITY.FARM, CONFIG.BUILDING_HP, this.buildings, this._world.getNeighbors(), this._world.isWalkable(), this._world.getEntitiesAt().
   * @modifies None.
   * @triggers Called by `_expandFarmLand()`.
   * @performance O(B + F * N) where B is total buildings (for `occupiedByFarms` setup), F is `farm.farmland.length`, and N is number of neighbors (small constant).
   */
```

**Function: `_seedStartingHomes`**
```javascript
/**
   * Places initial home buildings around a central point during tribe initialization.
   *
   * @description This private method ensures a new tribe has enough homes to support its initial population. It calculates the required number of homes and then strategically places them in concentric squares around a given central coordinate (`cx`, `cy`), checking for walkable and unoccupied tiles, ensuring a compact starting settlement.
   *
   * @workflow
   * 1. Calculates `neededHomes` based on `this.population` and the capacity of a level 1 home.
   * 2. Initializes `placed` homes to 0.
   * 3. Iterates `r` (radius) from 1 to 7:
   *    a. Iterates `dy` from `-r` to `r`:
   *       i. Iterates `dx` from `-r` to `r`:
   *          1. Calculates `nx`, `ny` (potential home coordinates).
   *          2. If `this._world.isWalkable(nx, ny)` is `false`, continues.
   *          3. Calls `this._world.getEntitiesAt(nx, ny)` to check for occupied tiles.
   *          4. If `occ` contains any building, continues.
   *          5. Calls `this._placeBuilding(nx, ny, CONFIG.ENTITY.HOME)`.
   *          6. Increments `placed`.
   *          7. If `placed` has reached `neededHomes`, breaks all loops.
   *
   * @param {number} cx - The central X coordinate for home placement.
   * @param {number} cy - The central Y coordinate for home placement.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.HOME, CONFIG.BUILDING_HP, this.population, this._homeCapacityByLevel(), this._world.isWalkable(), this._world.getEntitiesAt(), this._placeBuilding(), Math.max(), Math.ceil().
   * @modifies this.buildings, world (via `_placeBuilding`).
   * @triggers Called by `init()`.
   * @performance O(R^2) where R is the max radius (7), so O(49) in worst case (constant and small).
   */
```

**Function: `_despawnUnitAtIndex`**
```javascript
/**
   * Removes a unit from the tribe's `units` array and the game world by its array index.
   *
   * @description This private helper function handles the complete removal of a unit from the simulation. It identifies the unit at the specified index, notifies the game world to remove the entity from its spatial hash, and then removes the unit object from the tribe's internal `units` array.
   *
   * @workflow
   * 1. Retrieves unit `u` from `this.units[index]`.
   * 2. If `u` is `null` or `undefined`, returns immediately.
   * 3. If `u.id` is not `null` (meaning it was added to the world), calls `this._world.removeEntity(u.id)`.
   * 4. Removes the unit at `index` from `this.units` using `splice()`.
   *
   * @param {number} index - The index of the unit in the `this.units` array.
   * @returns {void}
   *
   * @dependencies this.units, this._world.removeEntity().
   * @modifies this.units (element removed), world (via `removeEntity`).
   * @triggers Called by `_updateUnits()` (unit death/defection), `_updateTowers()` (unit death by tower), `_syncPopulationUnits()` (excess normal units), `_updateHunger()` (unit starvation), `killUnits()`.
   * @performance O(U) where U is the number of units (due to array splice), but usually small U.
   */
```

**Function: `_despawnUnitByObject`**
```javascript
/**
   * Removes a specific unit object from the tribe's `units` array and the game world.
   *
   * @description This private helper function provides a convenient way to remove a unit by its object reference rather than its array index. It finds the unit's index within the `units` array and then delegates the actual removal process to `_despawnUnitAtIndex`.
   *
   * @workflow
   * 1. Finds the `idx` of the `unit` object in `this.units`.
   * 2. If `idx` is not -1 (unit is found), calls `this._despawnUnitAtIndex(idx)`.
   *
   * @param {Object} unit - The unit object to remove.
   * @returns {void}
   *
   * @dependencies this.units, this._despawnUnitAtIndex().
   * @modifies this.units (via `_despawnUnitAtIndex`), world (via `_despawnUnitAtIndex`).
   * @triggers Called by `_updateUnits()` (enemy unit death), `_updateTowers()` (enemy unit death), `_enemy._despawnUnitByObject` (indirectly called by this tribe for enemy units).
   * @performance O(U) where U is the number of units (due to `indexOf` and `splice`).
   */
```

**Function: `_randName`**
```javascript
/**
   * Generates a random name from a predefined list.
   *
   * @description This private helper function provides a simple way to obtain a random name, primarily used for assigning names to new tribe leaders or in other contexts requiring a generic identifier. It selects a name from a fixed array using a random index.
   *
   * @workflow
   * 1. Defines a `names` array with several predefined names.
   * 2. Returns a randomly selected name from the `names` array.
   *
   * @param {void} -
   * @returns {string} A randomly chosen name.
   *
   * @dependencies Math.floor(), Math.random().
   * @modifies None.
   * @triggers Called by `constructor()`, `killLeader()`.
   * @performance O(1).
   */
```

**Function: `applyDebuff`**
```javascript
/**
   * Applies or strengthens a specific debuff on the tribe.
   *
   * @description This public API method allows external systems to inflict various negative status effects (debuffs) on the tribe. It takes a debuff `key` and `strength` value, adding or increasing the debuff's intensity, up to a maximum of 1.0. Debuffs can influence various aspects of tribe performance, like research or morale.
   *
   * @workflow
   * 1. Retrieves the current strength of `this.debuffs[key]` or defaults to 0.
   * 2. Adds `strength` to the current value.
   * 3. Caps the new value at 1.0 using `Math.min()`.
   * 4. Assigns the result to `this.debuffs[key]`.
   *
   * @param {string} key - The identifier for the debuff (e.g., 'disease', 'research_slow').
   * @param {number} strength - The amount to add to the debuff's current strength.
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.debuffs.
   * @triggers Called by player influence actions (`damageMorale`, `sabotageFood`, `causeDisease`, `boostResearch`).
   * @performance O(1).
   */
```

**Function: `killLeader`**
```javascript
/**
   * Eliminates the current tribe leader, assigning a new one with reduced stats and impacting morale.
   *
   * @description This public API method simulates the death of the tribe's leader, causing immediate consequences for the tribe. It replaces the old leader with a new, weaker one, significantly reduces tribe morale, and explicitly sets all existing leader units' HP to zero, causing them to be despawned during the next unit update. A warning event is logged.
   *
   * @workflow
   * 1. Stores the `old` leader's name.
   * 2. Assigns a new `leader` object with a random name (via `_randName()`) and a reduced strength (0.3 to 0.7).
   * 3. Reduces `this.morale` by 0.2, ensuring it doesn't drop below 0.1.
   * 4. Filters `this.units` to find all `LEADER` units.
   * 5. For each `u` in `leaderUnits`, sets `u.hp` to 0.
   * 6. Logs a warning event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.LEADER, Game.eventLog(), this.units, this._randName(), Math.random(), Math.max().
   * @modifies this.leader, this.morale, unit.hp for leader units.
   * @triggers Called by player influence actions or specific game events.
   * @performance O(U) where U is the number of units (for filtering leader units).
   */
```

**Function: `killUnits`**
```javascript
/**
   * Kills a specified number of warrior units from the tribe.
   *
   * @description This public API method allows external systems to inflict casualties on the tribe's military. It identifies the specified `count` of warrior units and sets their health to zero, causing them to be removed during the next unit update. It increments the tribe's `casualties` count and updates the `military` size.
   *
   * @workflow
   * 1. Filters `this.units` to get all `WARRIOR` units.
   * 2. Calculates `toKill` as the minimum of `count` and the number of available warriors.
   * 3. For each `i` from 0 up to `toKill - 1`:
   *    a. Finds the `idx` of the warrior `warriors[i]` in `this.units`.
   *    b. If `idx` is found, calls `this._despawnUnitAtIndex(idx)`.
   * 4. Increments `this.casualties` by `toKill`.
   * 5. Recalculates `this.military` based on remaining warrior and leader units.
   *
   * @param {number} count - The number of warrior units to kill.
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.WARRIOR, CONFIG.ENTITY.LEADER, this.units, this._despawnUnitAtIndex(), Math.min().
   * @modifies this.units (via `_despawnUnitAtIndex`), this.casualties, this.military, world (via `_despawnUnitAtIndex`).
   * @triggers Called by player influence actions or specific game events.
   * @performance O(U) for filtering, then O(count * U) in worst case for despawning (due to `indexOf` and `splice`).
   */
```

**Function: `boostResearch`**
```javascript
/**
   * Applies a temporary boost to the tribe's research speed.
   *
   * @description This public API method triggers a positive effect on the tribe's knowledge accumulation. It calls `applyDebuff` with a 'research_boost' key, increasing the associated debuff strength. Although named 'debuff', it is used here to represent a positive modifier in the `_gatherResources` logic, effectively speeding up tech gain.
   *
   * @workflow
   * 1. Calls `this.applyDebuff('research_boost', 0.5)`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies this.applyDebuff().
   * @modifies this.debuffs (specifically 'research_boost').
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
```

**Function: `boostMorale`**
```javascript
/**
   * Increases the tribe's overall morale.
   *
   * @description This public API method provides a way to improve the tribe's morale, representing a positive influence or event. It directly increases the `this.morale` property, capping it at a maximum of 1.0, which can positively affect unit behavior and tribe performance.
   *
   * @workflow
   * 1. Increases `this.morale` by 0.3, capped at 1.0 using `Math.min()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.morale.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
```

**Function: `damageMorale`**
```javascript
/**
   * Decreases the tribe's morale and applies a temporary morale loss debuff.
   *
   * @description This public API method simulates events that negatively impact the tribe's morale. It reduces the `this.morale` property by the specified `amount`, ensuring it doesn't drop below a minimum of 0.05. Additionally, it applies a 'morale_loss' debuff, which can temporarily influence combat decisions and prevent attacks.
   *
   * @workflow
   * 1. Decreases `this.morale` by `amount`, ensuring it doesn't drop below 0.05.
   * 2. Calls `this.applyDebuff('morale_loss', amount)`.
   *
   * @param {number} amount - The value to subtract from morale and apply as debuff strength.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Math.max().
   * @modifies this.morale, this.debuffs (specifically 'morale_loss').
   * @triggers Called by player influence actions or specific game events.
   * @performance O(1).
   */
```

**Function: `sabotageFood`**
```javascript
/**
   * Destroys a specified amount of food and applies a temporary food shortage debuff.
   *
   * @description This public API method simulates an act of sabotage targeting the tribe's food supply. It directly reduces `this.res.food` by the given `amount`, ensuring it doesn't drop below zero. Furthermore, it applies a 'food' debuff, which negatively impacts population growth, simulating the consequences of food scarcity.
   *
   * @workflow
   * 1. Reduces `this.res.food` by `amount`, ensuring it doesn't drop below 0.
   * 2. Calls `this.applyDebuff('food', 0.4)`.
   *
   * @param {number} amount - The amount of food to destroy.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Math.max().
   * @modifies this.res.food, this.debuffs (specifically 'food').
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
```

**Function: `causeDisease`**
```javascript
/**
   * Inflicts a disease on the tribe, reducing population and applying a temporary disease debuff.
   *
   * @description This public API method simulates the outbreak of a disease within the tribe. It applies a 'disease' debuff with a given `severity`, which can further impact population growth. Immediately, it also causes a percentage of the tribe's population to die, directly reducing `this.population`, and logs a warning event.
   *
   * @workflow
   * 1. Calls `this.applyDebuff('disease', severity)`.
   * 2. Calculates `killed` population based on `this.population` and `severity`.
   * 3. Reduces `this.population` by `killed`, ensuring it stays above a minimum of 5.
   * 4. Logs a warning event using `Game.eventLog()`.
   *
   * @param {number} severity - The intensity of the disease to apply as a debuff.
   * @returns {void}
   *
   * @dependencies this.applyDebuff(), Game.eventLog(), Math.floor(), Math.max().
   * @modifies this.debuffs (specifically 'disease'), this.population.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
```

**Function: `giftWeapons`**
```javascript
/**
   * Boosts the tribe's tech level and spawns new warrior units.
   *
   * @description This public API method simulates a beneficial external intervention for the tribe, such as receiving advanced weaponry. It immediately increases the tribe's `techLevel` up to the maximum allowed by its current age. Additionally, it spawns three new warrior units, typically near a barracks or the first available building, reinforcing the tribe's military strength and logging a warning event.
   *
   * @workflow
   * 1. Increases `this.techLevel` by 2, capped at `this.age.tribeMaxTech`.
   * 2. Finds a `BARRACKS` building or the first available building `b`.
   * 3. If `b` is found, calls `this._spawnUnit(b.x, b.y, CONFIG.ENTITY.WARRIOR)` three times.
   * 4. Logs a warning event using `Game.eventLog()`.
   *
   * @param {void} -
   * @returns {void}
   *
   * @dependencies CONFIG.ENTITY.BARRACKS, CONFIG.ENTITY.WARRIOR, Game.eventLog(), this.techLevel, this.age.tribeMaxTech, this.buildings, this._spawnUnit(), Math.min().
   * @modifies this.techLevel, this.units (via `_spawnUnit`), world (via `_spawnUnit`).
   * @triggers Called by player influence actions.
   * @performance O(B) for finding barracks, then O(1) for fixed number of unit spawns.
   */
```

**Function: `drainResources`**
```javascript
/**
   * Reduces the tribe's non-food resources proportionally by a specified amount.
   *
   * @description This public API method simulates a negative external event that causes the tribe to lose a portion of its material wealth. It calculates the total non-food resources (wood, metal, stone) and then drains the specified `amount` by proportionally reducing each resource type. This ensures that the resource distribution remains balanced even after a loss.
   *
   * @workflow
   * 1. Calculates `total` as the sum of `this.res.wood`, `this.res.metal`, and `this.res.stone`.
   * 2. If `total` is less than or equal to 0, returns immediately.
   * 3. Calculates `drain` as the minimum of `amount` and `total`.
   * 4. Calculates `ratio` as `(total - drain) / total`.
   * 5. Multiplies `this.res.wood` by `ratio`.
   * 6. Multiplies `this.res.metal` by `ratio`.
   * 7. Multiplies `this.res.stone` by `ratio`.
   *
   * @param {number} amount - The total amount of resources to drain.
   * @returns {void}
   *
   * @dependencies Math.min().
   * @modifies this.res.wood, this.res.metal, this.res.stone.
   * @triggers Called by player influence actions.
   * @performance O(1).
   */
```

**Function: `ratio`**
```javascript
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
```

**Function: `isEliminated`**
```javascript
/**
   * Checks if the tribe has been eliminated from the game.
   *
   * @description This public API method determines the tribe's survival status. A tribe is considered eliminated if it no longer possesses a `CAPITOL` building, which is its central and most vital structure.
   *
   * @workflow
   * 1. Checks if `this.buildings` contains any building with `type` equal to `CONFIG.ENTITY.CAPITOL`.
   * 2. Returns `true` if no capitol is found, `false` otherwise.
   *
   * @param {void} -
   * @returns {boolean} True if the tribe has no capitol and is eliminated, false otherwise.
   *
   * @dependencies CONFIG.ENTITY.CAPITOL, this.buildings.
   * @modifies None.
   * @triggers Called by game state checks, UI updates.
   * @performance O(B) where B is the number of buildings (due to `some()` method).
   */
```

---

### File: `js/actions.js`

#### Functions

**Function: `execute`**
```javascript
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
```

**Function: `getActionsForAge`**
```javascript
/**
 * Retrieves a list of available actions for a specific game age.
 *
 * @description This function takes an age object, which contains an array of action IDs, and maps these IDs to their corresponding action objects defined in the global `ACTIONS` constant. It filters out any potential `null` or `undefined` results if an action ID doesn't exist, ensuring only valid action objects are returned. This allows the game to present context-appropriate actions to the player based on the current game age.
 *
 * @workflow
 * 1. Access the `actions` array from the `age` object.
 * 2. Map each `id` in `age.actions` to its corresponding action object in `ACTIONS[id]`.
 * 3. Filter the resulting array to remove any `null` or `undefined` entries (using `Boolean` as a predicate).
 * 4. Return the filtered array of action objects.
 *
 * @param {object} age - An object representing a specific game age, expected to have an `actions` property which is an array of action IDs.
 * @returns {Array<object>} An array of action objects available for the given age.
 *
 * @dependencies ACTIONS (global constant)
 * @modifies None.
 * @triggers Typically called by a game state manager or UI component to populate available actions when the game age changes or the action list needs to be refreshed.
 * @performance O(N) where N is the number of actions defined for the age, due to `map` and `filter` operations.
 */
```

---


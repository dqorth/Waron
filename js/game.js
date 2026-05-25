// Main game controller — accessed globally as `Game`
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
const Game = (() => {
  let world, tribeA, tribeB, player, renderer, ui;
  let speed = 1;       // 0 = paused
  let running = false;
  let tickAccum = 0;
  let lastTime = 0;
  let totalTicks = 0;
  let territoryUpdateTimer = 0;

  // Derived from totalTicks each tick.
  let _cal = { timePeriodIdx:0, timePeriodName:'Dawn', day:1, dayInMonth:1, month:1,
               monthName:'Ashveil', year:1, season:'spring', seasonName:'Spring' };

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
  function init() {
    const canvas = document.getElementById('game-canvas');
    renderer = new Renderer(canvas);
    ui = new UI();
    _requestLoop();
  }

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
  function start() {
    world = new World();
    player = new Player();

    // Tribe A: left side of map (west)
    tribeA = new Tribe('a', 'Ashan', 35, Math.floor(CONFIG.MAP_H / 2), '#c8502a');
    // Tribe B: right side of map (east)
    tribeB = new Tribe('b', 'Koru', CONFIG.MAP_W - 35, Math.floor(CONFIG.MAP_H / 2), '#2a6ec8');

    tribeA.init(world, tribeB);
    tribeB.init(world, tribeA);
    world.updateTerritory(tribeA, tribeB);

    year = 1;
    speed = 1;
    running = true;
    totalTicks = 0;

    ui.updateActionsList(player);
    eventLog('The first war begins. Two tribes clash. You watch from the shadows.', 'age');
    eventLog('Keep them fighting. Keep them balanced. Be never discovered.', 'warn');
  }

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
  function reset() {
    running = false;
    speed = 1;
    totalTicks = 0;
  }

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
  function setSpeed(s) {
    speed = s;
  }

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
  function eventLog(msg, type) {
    if (ui) ui.addLog(msg, type);
  }

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
  function notify(msg, type) {
    if (ui) ui.notify(msg, type);
  }

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
  function _tick() {
    if (!running) return;

    totalTicks++;
    _cal = _getCalendar(totalTicks);

    // Regenerate landscape resource nodes (and tick trees).
    world.tickResources();

    // Weather tick (season-aware).
    _tickWeather(_cal.season);
    world.weather     = _weather;
    world.weatherMods = _weatherMods[_weather.type] || { foodSpoilMult: 1, moveMult: 1, farmMult: 1 };

    // Tribe ticks
    tribeA.tick(_cal.year);
    tribeB.tick(_cal.year);

    // Player tick
    player.tick(tribeA, tribeB, _cal.year);

    // Periodic territory update (every 10 ticks)
    territoryUpdateTimer++;
    if (territoryUpdateTimer >= 10) {
      territoryUpdateTimer = 0;
      world.updateTerritory(tribeA, tribeB);
      renderer.markTilesDirty();
    }

    // Tech progression from knowledge
    _advanceTribeTech(tribeA);
    _advanceTribeTech(tribeB);

    // Update UI
    ui.updateHUD(player, tribeA, tribeB, _cal);
    if (totalTicks % 5 === 0) ui.updateActionsList(player);

    // Win/lose checks
    _checkEndConditions();
  }

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
  function _advanceTribeTech(tribe) {
    const maxTech = tribe.age.tribeMaxTech;
    const techThreshold = 50 + tribe.techLevel * 30;
    if (tribe.knowledge >= techThreshold && tribe.techLevel < maxTech) {
      tribe.techLevel++;
      tribe.knowledge = 0;
      if (tribe.techLevel % 3 === 0) {
        eventLog(`${tribe.name} achieves new technology (Level ${tribe.techLevel}).`, 'good');
      }
    }
  }

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
  function _checkEndConditions() {
    const totalPower = tribeA.power + tribeB.power || 1;
    const fracA = tribeA.power / totalPower;
    const fracB = tribeB.power / totalPower;

    // Tribe elimination check
    if (tribeA.isEliminated()) {
      _gameOver(
        `<strong>ASHAN IS DESTROYED.</strong><br>Koru stands triumphant. Without a war to feed, they turn their gaze to the shadows — and find you.`,
        true
      );
      return;
    }
    if (tribeB.isEliminated()) {
      _gameOver(
        `<strong>KORU IS DESTROYED.</strong><br>Ashan reigns supreme. In their victory songs, they speak of a hidden hand — and hunt it down.`,
        true
      );
      return;
    }

    // Massive imbalance = one side about to win
    if (fracA >= CONFIG.BALANCE_LOSE || fracB >= CONFIG.BALANCE_LOSE) {
      const winner = fracA > fracB ? tribeA : tribeB;
      const loser = fracA > fracB ? tribeB : tribeA;
      _gameOver(
        `<strong>${winner.name.toUpperCase()} DOMINATES.</strong><br>${loser.name} is broken. The victors celebrate — then notice a pattern in every war they've ever fought. They trace it to you.`,
        true
      );
      return;
    }

    // Suspicion discovery
    if (player.suspicionA >= CONFIG.SUSPICION_LOSE) {
      _gameOver(
        `<strong>ASHAN HAS DISCOVERED YOU.</strong><br>A keen elder pieced together the signs. Koru, their eternal enemy, is alerted. Both tribes now march against the Shadow Keeper.`,
        false
      );
      return;
    }
    if (player.suspicionB >= CONFIG.SUSPICION_LOSE) {
      _gameOver(
        `<strong>KORU HAS DISCOVERED YOU.</strong><br>A captain noticed the pattern of sabotage. Ashan is told. For the first time in history, both tribes unite — to destroy you.`,
        false
      );
      return;
    }

    // Balance warnings
    if (fracA >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog('WARNING: Ashan grows too powerful. Intervene!', 'danger');
      notify('ASHAN IS DOMINATING — ACT NOW', 'danger');
    }
    if (fracB >= CONFIG.BALANCE_CRIT && totalTicks % 20 === 0) {
      eventLog('WARNING: Koru grows too powerful. Intervene!', 'danger');
      notify('KORU IS DOMINATING — ACT NOW', 'danger');
    }

    // Suspicion warnings
    if (player.suspicionA >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog('ASHAN suspects a hidden influence. Lower their suspicion!', 'warn');
    }
    if (player.suspicionB >= CONFIG.SUSPICION_CRIT && totalTicks % 30 === 0) {
      eventLog('KORU suspects a hidden influence. Lower their suspicion!', 'warn');
    }
  }

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
  function _gameOver(reason, byBalance) {
    running = false;
    const stats = `
      Days survived: <strong>${_cal.day}</strong><br>
      Years elapsed: <strong>${_cal.year}</strong><br>
      Age reached: <strong>${player.age.name}</strong><br>
      Total essence harvested: <strong>${Math.floor(player.totalEssence)}</strong><br>
      Actions used: <strong>${player.actionsUsed}</strong><br>
      Combined casualties: <strong>${tribeA.casualties + tribeB.casualties}</strong>
    `;
    ui.showGameOver(reason, stats);
  }

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
  function _requestLoop() {
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
    function loop(timestamp) {
      requestAnimationFrame(loop);

      if (!running) {
        if (renderer && world) renderer.render(world, tribeA || {buildings:[],units:[]}, tribeB || {buildings:[],units:[]}, _weather);
        return;
      }

      const dt = timestamp - lastTime;
      lastTime = timestamp;

      // Accumulate time for ticks
      const tickInterval = speed > 0 ? CONFIG.TICK_MS / speed : Infinity;
      tickAccum += dt;

      if (speed > 0 && tickAccum >= tickInterval) {
        tickAccum -= tickInterval;
        _tick();
      }

      // Always render
      renderer.render(world, tribeA, tribeB, _weather);
    }

    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  // Expose public API
  return {
    get world() { return world; },
    get player() { return player; },
    get tribeA() { return tribeA; },
    get tribeB() { return tribeB; },
    get ui() { return ui; },
    get year() { return _cal ? _cal.year : 1; },
    get day()  { return _cal ? _cal.day  : 1; },
    get calendar() { return _cal; },
    init,
    start,
    reset,
    setSpeed,
    eventLog,
    notify,
  };
})();

// ── Calendar helper ────────────────────────────────────────────────────────────
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
function _getCalendar(ticks) {
  const TPD = CONFIG.TICKS_PER_DAY;   // 5
  const DPM = CONFIG.DAYS_PER_MONTH;  // 27
  const MPY = CONFIG.MONTHS_PER_YEAR; // 13
  const DPY = CONFIG.DAYS_PER_YEAR;   // 351

  const timePeriodIdx = ticks % TPD;
  const totalDays     = Math.floor(ticks / TPD);
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
  const dayInMonth    = (totalDays % DPM) + 1;
  const monthIdx      = Math.floor(totalDays / DPM) % MPY;
  const month         = monthIdx + 1;
  const year          = Math.floor(totalDays / DPY) + 1;

  let season;
  if      (month <= 3)  season = CONFIG.SEASON.SPRING;
  else if (month <= 6)  season = CONFIG.SEASON.SUMMER;
  else if (month <= 9)  season = CONFIG.SEASON.AUTUMN;
  else                  season = CONFIG.SEASON.WINTER;

  return {
    timePeriodIdx,
    timePeriodName: CONFIG.TIME_PERIOD_NAMES[timePeriodIdx],
    day:       totalDays + 1,
    dayInMonth,
    month,
    monthName: CONFIG.MONTH_NAMES[monthIdx],
    year,
    season,
    seasonName: season.charAt(0).toUpperCase() + season.slice(1),
  };
}

// ── Weather state machine (module-level) ──────────────────────────────────────
const _weather = { type: CONFIG.WEATHER.SUNSHINE, intensity: 1.0, timer: 0, duration: 120 };

const _weatherMods = {
  sunshine: { foodSpoilMult: 1.0,  moveMult: 1.0, farmMult: 1.15 },
  overcast: { foodSpoilMult: 0.95, moveMult: 1.0, farmMult: 0.95 },
  rain:     { foodSpoilMult: 0.9,  moveMult: 1.3, farmMult: 1.10 },
  storm:    { foodSpoilMult: 1.1,  moveMult: 1.7, farmMult: 0.75 },
  drought:  { foodSpoilMult: 2.0,  moveMult: 1.0, farmMult: 0.50 },
  flood:    { foodSpoilMult: 1.2,  moveMult: 1.9, farmMult: 0.60 },
  snow:     { foodSpoilMult: 1.0,  moveMult: 2.2, farmMult: 0.40 },
};

// Season-based weather probability weights (replaces transition table).
const _seasonWeatherWeights = {
  spring: { sunshine:0.30, overcast:0.25, rain:0.30, storm:0.08, drought:0.05, flood:0.02, snow:0.00 },
  summer: { sunshine:0.45, overcast:0.15, rain:0.12, storm:0.18, drought:0.10, flood:0.00, snow:0.00 },
  autumn: { sunshine:0.18, overcast:0.32, rain:0.28, storm:0.14, drought:0.00, flood:0.06, snow:0.02 },
  winter: { sunshine:0.10, overcast:0.28, rain:0.08, storm:0.10, drought:0.00, flood:0.04, snow:0.40 },
};

const _weatherEventMsgs = {
  sunshine: ['The skies clear. Warm sunshine bathes the land.','Golden light spills across the hills — a fine day.'],
  overcast: ['Heavy clouds roll in, casting long shadows.','The sky dims. An overcast mood settles on the land.'],
  rain:     ['Rain begins to fall. Rivers swell and fields drink deeply.','A steady drizzle soaks the earth. Roads turn to mud.','Cold rain lashes the hills. Movement slows.'],
  storm:    ['A violent storm erupts! Thunder shakes the hills and lightning splits the sky.','Howling winds and torrential rain — a storm rages across the land.','Soldiers take shelter. The storm is merciless.'],
  drought:  ['A brutal drought grips the land. Crops wither. Rivers shrink.','The sun beats down without mercy. Food stores dwindle.','Parched earth cracks in the heat. Farmers despair.'],
  flood:    ['Floodwaters surge across the lowlands. Fields vanish beneath muddy water.','The river bursts its banks. Homes and roads are swamped.','Soldiers wade through flooded plains. Progress is agonizing.'],
  snow:     ['Snow falls silently, blanketing the land in white.','A bitter snowstorm sweeps through the valleys.','Ice and snow grip the land. Movement becomes treacherous.'],
};

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
function _tickWeather(season) {
  _weather.timer++;
  if (_weather.timer < _weather.duration) return;
  _weather.timer = 0;
  _weather.duration = CONFIG.WEATHER_DURATION_MIN
    + Math.floor(Math.random() * (CONFIG.WEATHER_DURATION_MAX - CONFIG.WEATHER_DURATION_MIN));

  const weights = _seasonWeatherWeights[season] || _seasonWeatherWeights.spring;
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total   = entries.reduce((s, [, w]) => s + w, 0);
  const r = Math.random() * total;
  let acc = 0;
  let nextType = _weather.type;
  for (const [type, w] of entries) {
    acc += w;
    if (r <= acc) { nextType = type; break; }
  }

  if (nextType !== _weather.type) {
    const msgs = _weatherEventMsgs[nextType];
    if (msgs) Game.eventLog(msgs[Math.floor(Math.random() * msgs.length)], 'event');
  }
  _weather.type      = nextType;
  _weather.intensity = 0.55 + Math.random() * 0.45;
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

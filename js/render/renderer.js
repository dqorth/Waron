class Renderer {
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
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.zoom = CONFIG.CAM_ZOOM_DEFAULT;
    this.TW = CONFIG.HEX_SIZE * 2;
    this.TH = CONFIG.HEX_SIZE * Math.sqrt(3) * CONFIG.HEX_V_SCALE;

    this._drag = false;
    this._dragStart = { x: 0, y: 0 };
    this._camStart = { x: 0, y: 0 };

    this._mouseX = -9999;
    this._mouseY = -9999;
    this._hoveredEntity = null;
    this._hoverFrame = 0;  // throttle hover detection
    this._mouseDown = { x: 0, y: 0 };
    this._selectedTile = null; // { x, y }

    this._clouds = [];
    this._rainDrops = [];
    this._snowFlakes = [];
    this._currentWeatherType = CONFIG.WEATHER.SUNSHINE;
    this._lightningFlash = 0;

    // ── Color parse cache ──────────────────────────────────────────────────
    this._colorCache = {};

    // ── Pre-computed hex corner offsets (recomputed on zoom change) ────────
    this._hexCornersZoom = -1;
    this._hexCorners = [];  // [{dx, dy}] × 6
    this._hexCornersVS = CONFIG.HEX_V_SCALE;

    // ── Offscreen tile buffer ──────────────────────────────────────────────
    this._tileCanvas = null;
    this._tileCtx = null;
    this._tileBufDirty = true;
    this._tileBufZoom = -1;
    this._tileBufCamX = -Infinity;
    this._tileBufCamY = -Infinity;
    this._tileBufW = 0;
    this._tileBufH = 0;
    // How far camera can pan before buffer re-render (pixels)
    this._tileBufPadding = 200;
    // Track external dirty signals
    this._tileBufWeatherType = '';
    this._tileBufTerritoryGen = 0;
    this._territoryGen = 0;  // incremented by game when territory updates

    // ── Subsystem renderers (composition; state lives here on the Renderer) ─
    this.tiles   = new TileRenderer(this);
    this.bldg    = new BuildingRenderer(this);
    this.units   = new UnitRenderer(this);
    this.effects = new EffectsRenderer(this);
    this.combat  = new CombatRenderer(this);

    this._setupEvents();
    this._resize();
    this.effects._initWeatherParticles(this._currentWeatherType);
    window.addEventListener('resize', () => this._resize());
  }

  // Call this from game.js after updateTerritory()
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
  markTilesDirty() {
    this._tileBufDirty = true;
    this._territoryGen++;
  }

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
  _resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    const midTileX = CONFIG.MAP_W / 2;
    const midTileY = CONFIG.MAP_H / 2;
    const p = this._tileToScreen(midTileX, midTileY);
    this.camX = p.sx - this.W / 2;
    this.camY = p.sy - this.H / 2;

    this._tileBufDirty = true;
  }

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
  _setupEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this._drag = true;
      this._dragStart = { x: e.clientX, y: e.clientY };
      this._mouseDown = { x: e.clientX, y: e.clientY };
      this._camStart = { x: this.camX, y: this.camY };
    });

    c.addEventListener('mousemove', e => {
      const rect = c.getBoundingClientRect();
      this._mouseX = e.clientX - rect.left;
      this._mouseY = e.clientY - rect.top;
      if (this._drag) {
        this.camX = this._camStart.x - (e.clientX - this._dragStart.x);
        this.camY = this._camStart.y - (e.clientY - this._dragStart.y);
      }
    });

    c.addEventListener('mouseup', e => {
      const dragDist = Math.hypot(e.clientX - this._mouseDown.x, e.clientY - this._mouseDown.y);
      this._drag = false;

      // Treat tiny mouse movement as a click and inspect that tile.
      if (dragDist <= 6) {
        const rect = c.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._selectTileAtScreen(mx, my);
      }
    });
    c.addEventListener('mouseleave', () => { this._drag = false; this._mouseX = -9999; this._mouseY = -9999; });

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(CONFIG.CAM_ZOOM_MIN, Math.min(CONFIG.CAM_ZOOM_MAX, this.zoom * zoomDelta));
    }, { passive: false });
  }

  // ── Pre-compute hex corner offsets for current zoom ──────────────────────
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
  _updateHexCorners() {
    if (this._hexCornersZoom === this.zoom) return;
    this._hexCornersZoom = this.zoom;
    const sz = CONFIG.HEX_SIZE * this.zoom;
    const vs = CONFIG.HEX_V_SCALE;
    this._hexCorners = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      this._hexCorners.push({ dx: sz * Math.cos(a), dy: sz * Math.sin(a) * vs });
    }
  }

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
  _tileToScreen(tx, ty) {
    const sz = CONFIG.HEX_SIZE;
    const vs = CONFIG.HEX_V_SCALE;
    const sq3 = Math.sqrt(3);

    const sx = tx * sz * 1.5;
    const col0 = Math.floor(tx);
    const frac = tx - col0;
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
    const off0 = (col0 % 2 !== 0) ? 0.5 : 0.0;
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
    const off1 = ((col0 + 1) % 2 !== 0) ? 0.5 : 0.0;
    const off = off0 + (off1 - off0) * frac;
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
    const sy = (ty + off) * sq3 * sz * vs;

    return { sx, sy };
  }

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
  _worldToScreen(sx, sy) {
    return {
      x: (sx - this.camX) * this.zoom + this.W / 2,
      y: (sy - this.camY) * this.zoom + this.H / 2,
    };
  }

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
  _worldToScreenParallax(sx, sy, px, py = px) {
    return {
      x: (sx - this.camX * px) * this.zoom + this.W / 2,
      y: (sy - this.camY * py) * this.zoom + this.H / 2,
    };
  }

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
  _screenToWorld(x, y) {
    return {
      sx: (x - this.W / 2) / this.zoom + this.camX,
      sy: (y - this.H / 2) / this.zoom + this.camY,
    };
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
  _selectTileAtScreen(mx, my) {
    if (!this._worldRef) {
      this._selectedTile = null;
      return;
    }
    const picked = this._pickTileAtScreen(mx, my, this._worldRef);
    this._selectedTile = picked ? { x: picked.x, y: picked.y } : null;
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
  _pickTileAtScreen(mx, my, world) {
    const w = this._screenToWorld(mx, my);
    const sz = CONFIG.HEX_SIZE;
    const vs = CONFIG.HEX_V_SCALE;
    const sq3 = Math.sqrt(3);

    const approxX = Math.round(w.sx / (sz * 1.5));
    this._updateHexCorners();
    const corners = this._hexCorners;

    let best = null;
    let bestDist = Infinity;

    for (let x = approxX - 3; x <= approxX + 3; x++) {
      if (x < 0 || x >= world.W) continue;

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
      const off = (x % 2 !== 0) ? 0.5 : 0.0;
      const approxY = Math.round(w.sy / (sq3 * sz * vs) - off);

      for (let y = approxY - 3; y <= approxY + 3; y++) {
        if (y < 0 || y >= world.H) continue;

        const p = this._tileToScreen(x, y);
        const s = this._worldToScreen(p.sx, p.sy);

        if (this._pointInHex(mx, my, s.x, s.y, corners)) {
          const d = Math.hypot(mx - s.x, my - s.y);
          if (d < bestDist) {
            best = { x, y };
            bestDist = d;
          }
        }
      }
    }

    return best;
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
  _pointInHex(px, py, cx, cy, corners) {
    // Standard even-odd polygon test against the 6-corner hex.
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const xi = cx + corners[i].dx;
      const yi = cy + corners[i].dy;
      const xj = cx + corners[j].dx;
      const yj = cy + corners[j].dy;

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
      const intersects = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
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
  _tileTypeName(type) {
    const T = CONFIG.TILE;
    const names = {
      [T.WATER]: 'Water',
      [T.GRASS]: 'Grassland',
      [T.FOREST]: 'Forest',
      [T.MOUNTAIN]: 'Mountain',
      [T.STONE]: 'Stone',
      [T.DESERT]: 'Desert',
      [T.SNOW]: 'Snow',
      [T.RUINS]: 'Ruins',
      [T.WETLAND]: 'Wetland',
      [T.JUNGLE]: 'Jungle',
      [T.SAVANNA]: 'Savanna',
      [T.TUNDRA]: 'Tundra',
    };
    return names[type] || 'Unknown';
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
  _drawSelectedTileTooltip(world) {
    if (!this._selectedTile || !world) return;

    const tx = this._selectedTile.x;
    const ty = this._selectedTile.y;
    if (tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) return;

    const tile = world.tiles?.[ty]?.[tx];
    if (!tile) return;

    const p = this._tileToScreen(tx, ty);
    const s = this._worldToScreen(p.sx, p.sy);
    this._updateHexCorners();

    const ctx = this.ctx;
    const corners = this._hexCorners;

    // Highlight selected tile.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1, this.zoom * 1.8);
    ctx.beginPath();
    ctx.moveTo(s.x + corners[0].dx, s.y + corners[0].dy);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(s.x + corners[i].dx, s.y + corners[i].dy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const lines = [];
    lines.push(`Tile ${tx}, ${ty} - ${this._tileTypeName(tile.type)}`);
    lines.push(`Elevation: ${(tile.elevation || 0).toFixed(3)}`);
    lines.push(`Walkable: ${world.isWalkable ? (world.isWalkable(tx, ty) ? 'yes' : 'no') : 'n/a'}`);
    lines.push(`Owner: ${tile.owner ? tile.owner.toUpperCase() : 'none'}`);
    lines.push(`Road: ${tile.road ? 'yes' : 'no'}`);

    const yieldEntry = CONFIG.TILE_YIELD[tile.type] || {};
    const yieldParts = Object.entries(yieldEntry).map(([k, v]) => `${k}:${v}`);
    lines.push(`Base yield: ${yieldParts.length ? yieldParts.join('  ') : 'none'}`);

    const node = tile.resourceNode;
    if (node) {
      const pct = Math.round((node.amount / Math.max(1, node.max)) * 100);
      const resName = node.resource || Object.keys(yieldEntry)[0] || 'resource';
      lines.push(`Amount of ${resName}: ${Math.round(node.amount)} / ${node.max} (${pct}%)`);
    } else {
      const fallbackRes = Object.keys(yieldEntry)[0] || 'resource';
      lines.push(`Amount of ${fallbackRes}: none`);
    }

    const tree = world.treeMap ? world.treeMap[`${tx},${ty}`] : null;
    if (tree) {
      const gMax = tree.maxGrowth || 5;
      lines.push(`Tree: stage ${tree.growth}/${gMax}`);
    } else {
      lines.push('Tree: none');
    }

    const pad = 8;
    const lh = 14;
    const fSize = 11;
    ctx.font = `${fSize}px sans-serif`;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bw = maxW + pad * 2;
    const bh = lines.length * lh + pad * 1.5;

    let bx = s.x + 14;
    let by = s.y - bh - 10;
    if (bx + bw > this.W) bx = s.x - bw - 14;
    if (bx < 6) bx = 6;
    if (by < 6) by = s.y + 12;
    if (by + bh > this.H - 6) by = this.H - bh - 6;

    ctx.fillStyle = 'rgba(12,10,20,0.90)';
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 1.4;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? `bold ${fSize}px sans-serif` : `${fSize}px sans-serif`;
      ctx.fillStyle = i === 0 ? '#e8d8a0' : '#b0c8d0';
      ctx.fillText(line, bx + pad, by + pad * 0.75 + i * lh);
    });
  }

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
  _getVisibleTileBounds(world) {
    const pad = 140;
    const nw = this._screenToWorld(-pad, -pad);
    const se = this._screenToWorld(this.W + pad, this.H + pad);

    const minSx = Math.min(nw.sx, se.sx);
    const maxSx = Math.max(nw.sx, se.sx);
    const minSy = Math.min(nw.sy, se.sy);
    const maxSy = Math.max(nw.sy, se.sy);

    const sxStep = CONFIG.HEX_SIZE * 1.5;
    const syStep = Math.sqrt(3) * CONFIG.HEX_SIZE * CONFIG.HEX_V_SCALE;

    let xMin = Math.floor(minSx / sxStep) - 3;
    let xMax = Math.ceil(maxSx / sxStep) + 3;
    let yMin = Math.floor(minSy / syStep) - 4;
    let yMax = Math.ceil(maxSy / syStep) + 4;

    xMin = Math.max(0, xMin);
    yMin = Math.max(0, yMin);
    xMax = Math.min(world.W - 1, xMax);
    yMax = Math.min(world.H - 1, yMax);

    return { xMin, xMax, yMin, yMax };
  }

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
  _updateWorldBounds(world) {
    const c1 = this._tileToScreen(0, 0);
    const c2 = this._tileToScreen(world.W - 1, 0);
    const c3 = this._tileToScreen(0, world.H - 1);
    const c4 = this._tileToScreen(world.W - 1, world.H - 1);

    this._worldBounds = {
      minSx: Math.min(c1.sx, c2.sx, c3.sx, c4.sx),
      maxSx: Math.max(c1.sx, c2.sx, c3.sx, c4.sx),
      minSy: Math.min(c1.sy, c2.sy, c3.sy, c4.sy),
      maxSy: Math.max(c1.sy, c2.sy, c3.sy, c4.sy),
    };
  }

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
  _isOnScreen(x, y, margin = 100) {
    return x > -margin && x < this.W + margin && y > -margin && y < this.H + margin;
  }

  // ── Offscreen tile buffer management ──────────────────────────────────────



  // ── Optimized tile draw: pre-computed corners, takes buffer ctx + coords ──

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
  _findHoveredEntity(mx, my, tribeA, tribeB) {
    let best = null;
    let bestDist = Infinity;

    const all = [
      ...tribeA.buildings, ...tribeB.buildings,
      ...tribeA.units, ...tribeB.units,
    ];

    for (const e of all) {
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
      const ex = (e._lx ?? e.x) + (e._ox || 0);
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
      const ey = (e._ly ?? e.y) + (e._oy || 0) + (e._gaitY || 0);
      const p = this._tileToScreen(ex, ey);
      const s = this._worldToScreen(p.sx, p.sy);
      const isBuilding = !!CONFIG.BUILDING_HP[e.type];
      const r = isBuilding ? this.TH * this.zoom * 1.2 : 7 * this.zoom;
      const dist = Math.hypot(mx - s.x, my - s.y);
      if (dist < r && dist < bestDist) {
        best = e;
        bestDist = dist;
      }
    }

    return best;
  }

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
  _drawTooltip(entity) {
    if (!entity) return;

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
    const ex = (entity._lx ?? entity.x) + (entity._ox || 0);
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
    const ey = (entity._ly ?? entity.y) + (entity._oy || 0) + (entity._gaitY || 0);
    const p = this._tileToScreen(ex, ey);
    const s = this._worldToScreen(p.sx, p.sy);

    const isBuilding = !!CONFIG.BUILDING_HP[entity.type];
    const label = entity.type.replace(/_/g, ' ').toUpperCase();
    const tribeName = entity.tribeName || (entity.tribe === 'a' ? 'ASHAN' : 'KORU');
    const hpPct = Math.max(0, Math.ceil((entity.hp / entity.maxHp) * 100));
    const level = entity.level ? ` Lv ${entity.level}/${CONFIG.BUILDING_MAX_LEVEL[entity.type] || 1}` : '';
    const state = entity.state ? ` ${entity.state}` : '';

    const lines = [
      `${tribeName} - ${label}${level}${state}`,
      `HP: ${Math.ceil(entity.hp)} / ${entity.maxHp} (${hpPct}%)`,
    ];
    if (!isBuilding && entity.stats) {
      lines.push(`STR ${entity.stats.strength.toFixed(1)} | LOY ${entity.stats.loyalty.toFixed(1)} | AGI ${entity.stats.agility.toFixed(1)}`);
      lines.push(`TEN ${entity.stats.tenacity.toFixed(1)} | END ${entity.stats.endurance.toFixed(1)} | DEF ${entity.stats.defense.toFixed(1)}`);
    }
    if (!isBuilding && entity.hunger !== undefined) {
      const hPct = Math.round((entity.hunger / CONFIG.HUNGER_MAX) * 100);
      const bar  = '█'.repeat(Math.round(hPct / 10)) + '░'.repeat(10 - Math.round(hPct / 10));
      lines.push(`HUNGER: ${bar} ${hPct}%`);
    }
    if (isBuilding && entity._underAttack) lines.push('UNDER ATTACK');

    const ctx = this.ctx;
    const pad = 8;
    const lh = 14;
    const fSize = 11;
    ctx.font = `${fSize}px sans-serif`;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bw = maxW + pad * 2;
    const bh = lines.length * lh + pad * 1.5;

    let bx = s.x + 10;
    let by = s.y - bh - this.TH * this.zoom;
    if (bx + bw > this.W) bx = s.x - bw - 10;
    if (by < 0) by = s.y + 10;

    ctx.fillStyle = 'rgba(12,10,20,0.88)';
    ctx.strokeStyle = entity.tribe === 'a' ? '#c8502a' : '#2a6ec8';
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      if (i === 0) {
        ctx.fillStyle = '#e8d8a0';
        ctx.font = `bold ${fSize}px sans-serif`;
      } else if (line.startsWith('UNDER ATTACK')) {
        ctx.fillStyle = '#ff5050';
        ctx.font = `bold ${fSize}px sans-serif`;
      } else {
        ctx.fillStyle = '#b0c8d0';
        ctx.font = `${fSize}px sans-serif`;
      }
      ctx.fillText(line, bx + pad, by + pad * 0.75 + i * lh);
    });
  }

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
  // Draws scattered small resource indicator shapes within a tile.
  // Uses a deterministic scatter based on tile coords so positions are stable
  // across frames without storing any state.


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
  _blendColor(c1, c2, t) {
    const p1 = this._parseColor(c1);
    const p2 = this._parseColor(c2);
    const r = Math.round(p1[0] + (p2[0] - p1[0]) * t);
    const g = Math.round(p1[1] + (p2[1] - p1[1]) * t);
    const b = Math.round(p1[2] + (p2[2] - p1[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

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
  _parseColor(color) {
    const cached = this._colorCache[color];
    if (cached) return cached;

    let result;
    const hex = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hex) {
      result = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
    } else {
      const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
      if (rgb) {
        result = [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
      } else {
        result = [128, 128, 128];
      }
    }
    this._colorCache[color] = result;
    return result;
  }

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
  _darken(color, factor) {
    const [r, g, b] = this._parseColor(color);
    return `rgb(${Math.round(r * (1 - factor))},${Math.round(g * (1 - factor))},${Math.round(b * (1 - factor))})`;
  }

  // Lightens a color towards white by the given factor (0 = no change, 1 = white).
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
  _lighten(color, factor) {
    const [r, g, b] = this._parseColor(color);
    return `rgb(${Math.min(255, Math.round(r + (255 - r) * factor))},${Math.min(255, Math.round(g + (255 - g) * factor))},${Math.min(255, Math.round(b + (255 - b) * factor))})`;
  }

  // 5-stage tree sprite. Stage 1=seedling … Stage 5=full-grown canopy tree.
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
  // Draws a biome-appropriate tree sprite at (x, y).
  // biome is a CONFIG.TILE.* integer; stage is the growth level (1-5).


  // ═══════════════════════════════════════════════════════════════════════════
  // Building sprite methods (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════









  // ═══════════════════════════════════════════════════════════════════════════
  // Unit sprite methods (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════







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


  // ═══════════════════════════════════════════════════════════════════════════
  // Weather system (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════







  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER — uses offscreen tile buffer
  // ═══════════════════════════════════════════════════════════════════════════

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
  render(world, tribeA, tribeB, weather) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this._worldRef = world;
    this._updateWorldBounds(world);

    // 1. Weather background (always redrawn — it's just a gradient)
    this.effects._drawWeatherBackground(ctx, weather);
    this.effects._updateWeatherParticles(weather);

    // 2. Tile layer — use cached offscreen buffer
    if (!this.tiles._isTileBufferValid(weather)) {
      this.tiles._renderTileBuffer(world, weather);
    }
    // Blit tile buffer to main canvas with camera offset
    const pad = this._tileBufPadding;
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
    const offsetX = (this._tileBufCamX - this.camX) * this.zoom;
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
    const offsetY = (this._tileBufCamY - this.camY) * this.zoom;
    ctx.drawImage(this._tileCanvas, -pad + offsetX, -pad + offsetY);

    // 2b. Fog of war overlay
    if (typeof Game !== 'undefined' && Game.fog) {
      this.effects._drawFogOverlay(ctx, world, Game.fog);
    }

    // 3. Battle line
    this.effects._drawBattleLine();

    // 4. Buildings (sorted by depth)
    const buildings = [...tribeA.buildings, ...tribeB.buildings];
    buildings.sort((a, b) => (a.y + a.x * 0.2) - (b.y + b.x * 0.2));
    for (const b of buildings) {
      if (b._underAttack) b._underAttack--;
      this.bldg._drawBuilding(b);
    }

    // 5. Wildlife (between buildings and units — same depth layer)
    if (typeof Game !== 'undefined' && Game.wildlife) {
      this.units.drawAnimals(ctx, Game.wildlife, Game.fog || null);
    }

    // 6. Units — update lerp, cull NORMAL at low zoom
    const allUnits = [...tribeA.units, ...tribeB.units];
    const cullNormals = this.zoom < 0.35;
    const drawUnits = [];

    for (const u of allUnits) {
      // Skip NORMAL civilians at low zoom (huge unit count reducer)
      if (cullNormals && u.type === CONFIG.ENTITY.NORMAL) continue;

      if (u._lx === undefined || Math.abs((u._lx ?? u.x) - u.x) > 3) u._lx = u.x;
      if (u._ly === undefined || Math.abs((u._ly ?? u.y) - u.y) > 3) u._ly = u.y;

      const lerp = Math.max(0.08, Math.min(0.85, 0.22 / Math.max(0.2, this.zoom)));
      u._lx += (u.x - u._lx) * lerp;
      u._ly += (u.y - u._ly) * lerp;

      const mdx = u.x - u._lx;
      const mdy = u.y - u._ly;
      const moving = Math.hypot(mdx, mdy) > 0.03;

      const prof = this.units._computePurposeOffset(u, moving, mdx, mdy);
      u._ox = (u._ox || 0) + (prof.ox - (u._ox || 0)) * 0.24;
      u._oy = (u._oy || 0) + (prof.oy - (u._oy || 0)) * 0.24;
      u._stanceP = (u._stanceP || 0) + prof.stanceSpeed;
      u._gaitP = (u._gaitP || 0) + (moving ? 0.22 : 0.06);
      u._gaitY = Math.sin(u._gaitP * 2.0) * prof.gaitAmp;

      if (u._underFire) u._underFire--;
      drawUnits.push(u);
    }

    drawUnits.sort((a, b) => ((a._ly ?? a.y) + (a._lx ?? a.x) * 0.2) - ((b._ly ?? b.y) + (b._lx ?? b.x) * 0.2));
    for (const u of drawUnits) this.units._drawUnit(u);

    // 6. Attack lines & tower beams
    this.combat._drawAttackLines(tribeA, tribeB);
    this.combat._drawTowerBeams(tribeA, tribeB);

    // 7. Weather particles (on top)
    this.effects._drawWeatherParticles(ctx, weather);

    // 8. Hover detection — throttled to every 3 frames
    this._hoverFrame++;
    if (this._hoverFrame >= 3) {
      this._hoverFrame = 0;
      if (tribeA && tribeB) {
        this._hoveredEntity = this._findHoveredEntity(this._mouseX, this._mouseY, tribeA, tribeB);
      }
    }
    this._drawSelectedTileTooltip(world);
    if (this._hoveredEntity) this._drawTooltip(this._hoveredEntity);
  }


}

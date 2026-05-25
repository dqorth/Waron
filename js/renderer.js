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

    this._setupEvents();
    this._resize();
    this._initWeatherParticles(this._currentWeatherType);
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
      this._drag = true;
      this._dragStart = { x: e.clientX, y: e.clientY };
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

    c.addEventListener('mouseup', () => { this._drag = false; });
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
  _isTileBufferValid(weather) {
    if (this._tileBufDirty) return false;
    if (this._tileBufZoom !== this.zoom) return false;
    if (this._tileBufW !== this.W || this._tileBufH !== this.H) return false;
    const wt = weather?.type || 'sunshine';
    if (this._tileBufWeatherType !== wt) return false;
    if (this._tileBufTerritoryGen !== (this._worldRef?._territoryGen || 0)) return false;
    // Camera pan within padding?
    const dx = Math.abs(this.camX - this._tileBufCamX);
    const dy = Math.abs(this.camY - this._tileBufCamY);
    if (dx > this._tileBufPadding || dy > this._tileBufPadding) return false;
    return true;
  }

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
  _ensureTileBuffer() {
    const bw = this.W + this._tileBufPadding * 2;
    const bh = this.H + this._tileBufPadding * 2;
    if (!this._tileCanvas || this._tileCanvas.width !== bw || this._tileCanvas.height !== bh) {
      this._tileCanvas = document.createElement('canvas');
      this._tileCanvas.width = bw;
      this._tileCanvas.height = bh;
      this._tileCtx = this._tileCanvas.getContext('2d');
    }
  }

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
  _renderTileBuffer(world, weather) {
    this._ensureTileBuffer();
    const bufCtx = this._tileCtx;
    const bw = this._tileCanvas.width;
    const bh = this._tileCanvas.height;

    bufCtx.clearRect(0, 0, bw, bh);

    // The buffer is centered on current camera position
    // Offset: buffer pixel (0,0) corresponds to screen pixel (-padding, -padding)
    const pad = this._tileBufPadding;

    // We need to draw tiles that are visible within the buffer's coverage
    // Buffer covers screen area [-pad, -pad] to [W+pad, H+pad]
    const nw = this._screenToWorld(-pad - 140, -pad - 140);
    const se = this._screenToWorld(this.W + pad + 140, this.H + pad + 140);

    const minSx = Math.min(nw.sx, se.sx);
    const maxSx = Math.max(nw.sx, se.sx);
    const minSy = Math.min(nw.sy, se.sy);
    const maxSy = Math.max(nw.sy, se.sy);

    const sxStep = CONFIG.HEX_SIZE * 1.5;
    const syStep = Math.sqrt(3) * CONFIG.HEX_SIZE * CONFIG.HEX_V_SCALE;

    let xMin = Math.max(0, Math.floor(minSx / sxStep) - 3);
    let xMax = Math.min(world.W - 1, Math.ceil(maxSx / sxStep) + 3);
    let yMin = Math.max(0, Math.floor(minSy / syStep) - 4);
    let yMax = Math.min(world.H - 1, Math.ceil(maxSy / syStep) + 4);

    this._updateHexCorners();
    const corners = this._hexCorners;
    const sz = CONFIG.HEX_SIZE * this.zoom;
    const vs = CONFIG.HEX_V_SCALE;

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const tile = world.tiles[y][x];
        const p = this._tileToScreen(x, y);
        // Convert to buffer coordinates (buffer is offset by pad from screen)
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
        const bx = (p.sx - this.camX) * this.zoom + this.W / 2 + pad;
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
        const by = (p.sy - this.camY) * this.zoom + this.H / 2 + pad;

        if (bx < -sz * 4 || bx > bw + sz * 4 || by < -sz * 4 || by > bh + sz * 4) continue;

        this._drawTileToBuffer(bufCtx, x, y, tile, bx, by, sz, vs, corners);
      }
    }

    this._tileBufCamX = this.camX;
    this._tileBufCamY = this.camY;
    this._tileBufZoom = this.zoom;
    this._tileBufW = this.W;
    this._tileBufH = this.H;
    this._tileBufWeatherType = weather?.type || 'sunshine';
    this._tileBufTerritoryGen = world._territoryGen || 0;
    this._tileBufDirty = false;
  }

  // ── Optimized tile draw: pre-computed corners, takes buffer ctx + coords ──
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
  _drawTileToBuffer(ctx, tx, ty, tile, sx, sy, sz, vs, corners) {
    const color = this._getTileColor(tile, '#c8502a', '#2a6ec8');

    // Translate pre-computed corners to tile position
    const c0x = sx + corners[0].dx, c0y = sy + corners[0].dy;
    const c1x = sx + corners[1].dx, c1y = sy + corners[1].dy;
    const c2x = sx + corners[2].dx, c2y = sy + corners[2].dy;
    const c3x = sx + corners[3].dx, c3y = sy + corners[3].dy;
    const c4x = sx + corners[4].dx, c4y = sy + corners[4].dy;
    const c5x = sx + corners[5].dx, c5y = sy + corners[5].dy;

    // Ultra-low LOD
    if (this.zoom < 0.18) {
      ctx.beginPath();
      ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y); ctx.lineTo(c2x, c2y);
      ctx.lineTo(c3x, c3y); ctx.lineTo(c4x, c4y); ctx.lineTo(c5x, c5y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    // Low LOD: skip depth faces at zoom < 0.3
    if (this.zoom >= 0.3) {
      const depthY = sz * vs * (
        tile.type === CONFIG.TILE.MOUNTAIN ? 0.75 :
        tile.type === CONFIG.TILE.STONE ? 0.42 :
        tile.type === CONFIG.TILE.TUNDRA ? 0.25 :
        tile.type === CONFIG.TILE.WATER ? 0.0 : 0.18
      );

      if (depthY > 0) {
        ctx.fillStyle = this._darken(color, 0.45);
        ctx.beginPath();
        ctx.moveTo(c3x, c3y); ctx.lineTo(c4x, c4y);
        ctx.lineTo(c4x, c4y + depthY); ctx.lineTo(c3x, c3y + depthY);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = this._darken(color, 0.3);
        ctx.beginPath();
        ctx.moveTo(c4x, c4y); ctx.lineTo(c5x, c5y);
        ctx.lineTo(c5x, c5y + depthY); ctx.lineTo(c4x, c4y + depthY);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = this._darken(color, 0.18);
        ctx.beginPath();
        ctx.moveTo(c5x, c5y); ctx.lineTo(c0x, c0y);
        ctx.lineTo(c0x, c0y + depthY); ctx.lineTo(c5x, c5y + depthY);
        ctx.closePath(); ctx.fill();
      }
    }

    // Main hex face
    ctx.beginPath();
    ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y); ctx.lineTo(c2x, c2y);
    ctx.lineTo(c3x, c3y); ctx.lineTo(c4x, c4y); ctx.lineTo(c5x, c5y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Territory tint (merged into single path — no second beginPath)
    if (tile.owner) {
      ctx.fillStyle = tile.owner === 'a' ? 'rgba(200,80,42,0.12)' : 'rgba(42,110,200,0.12)';
      ctx.fill(); // reuses same path
    }

    // Road overlay
    if (tile.road) {
      ctx.fillStyle = 'rgba(200,180,120,0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(155,120,75,0.6)';
      ctx.lineWidth = sz * 0.08;
      ctx.stroke();
    }

    // Grid lines only at medium+ zoom
    if (this.zoom > 0.3) {
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 0.5;
      ctx.stroke(); // reuses same path
    }

    // Detail sprites at high zoom
    if (this.zoom > 0.45) {
      if (tile.type === CONFIG.TILE.FOREST || tile.type === CONFIG.TILE.JUNGLE) {
        const tree = this._worldRef && this._worldRef.treeMap
          ? this._worldRef.treeMap[`${tx},${ty}`]
          : null;
        if (tree) {
          this._drawTreeSprite(ctx, sx, sy - sz * vs * 0.5, this.zoom, tree.growth,
            tile.type === CONFIG.TILE.JUNGLE);
        }
      }

      if (tile.type === CONFIG.TILE.MOUNTAIN) {
        ctx.fillStyle = '#e8eef4';
        ctx.beginPath();
        ctx.moveTo(sx, sy - sz * vs * 2.8);
        ctx.lineTo(sx + sz * 0.28, sy - sz * vs * 1.5);
        ctx.lineTo(sx - sz * 0.28, sy - sz * vs * 1.5);
        ctx.closePath();
        ctx.fill();
      }

      if (tile.type === CONFIG.TILE.WETLAND) {
        ctx.strokeStyle = 'rgba(100,160,210,0.5)';
        ctx.lineWidth = 0.8 * this.zoom;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(sx + (i - 0.5) * sz * 0.4, sy + sz * vs * (i * 0.3 - 0.1), sz * 0.22, 0, Math.PI);
          ctx.stroke();
        }
      }

      if (tile.type === CONFIG.TILE.SNOW || tile.type === CONFIG.TILE.TUNDRA) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 3; i++) {
          const px = sx + (Math.sin(tx * 31 + ty * 17 + i * 7) * 0.38) * sz;
          const py = sy + (Math.cos(tx * 13 + ty * 23 + i * 11) * 0.28) * sz * vs;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 * this.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Resource icons at medium+ zoom
    if (this.zoom > 0.55) {
      const node = tile.resourceNode;
      if (node && node.amount >= 5) {
        const frac = node.amount / node.max;
        const icons = { food: '#', wood: 'W', metal: 'M', stone: 'S' };
        const colors = { food: '#88dd44', wood: '#5a3a10', metal: '#aabbcc', stone: '#9988aa' };
        const res = Object.keys(CONFIG.TILE_YIELD[tile.type] || {})[0];
        if (res) {
          ctx.globalAlpha = 0.55 + frac * 0.45;
          ctx.fillStyle = colors[res] || '#fff';
          ctx.font = `bold ${Math.round(7 * this.zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icons[res] || '?', sx, sy - this.TH * this.zoom * 0.35);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

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
  _getTileColor(tile, tribeAColor, tribeBColor) {
    const baseColors = {
      [CONFIG.TILE.WATER]: '#1a3a5c',
      [CONFIG.TILE.GRASS]: '#3a6e2a',
      [CONFIG.TILE.FOREST]: '#1e4a1a',
      [CONFIG.TILE.MOUNTAIN]: '#5a5050',
      [CONFIG.TILE.STONE]: '#7a7060',
      [CONFIG.TILE.DESERT]: '#9a8050',
      [CONFIG.TILE.SNOW]: '#d0d8e8',
      [CONFIG.TILE.RUINS]: '#5a4040',
      [CONFIG.TILE.WETLAND]: '#3a6b4a',
      [CONFIG.TILE.JUNGLE]: '#1a4a18',
      [CONFIG.TILE.SAVANNA]: '#c8a840',
      [CONFIG.TILE.TUNDRA]: '#7a8898',
    };

    let base = baseColors[tile.type] || '#3a6e2a';
    if (tile.owner === 'a') base = this._blendColor(base, tribeAColor, 0.2);
    if (tile.owner === 'b') base = this._blendColor(base, tribeBColor, 0.2);
    return base;
  }

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
  _drawTreeSprite(ctx, x, y, zoom, stage, isJungle = false) {
    const s = zoom * 5;
    const darkCol  = isJungle ? '#0a4a08' : '#1a3a12';
    const midCol   = isJungle ? '#1a7018' : '#2a5a1a';
    const lightCol = isJungle ? '#2a8a20' : '#3a7028';
    const trunkCol = '#4a2e0a';

    switch (stage) {
      case 1:
        ctx.fillStyle = midCol;
        ctx.beginPath(); ctx.arc(x, y - s * 0.6, s * 0.55, 0, Math.PI * 2); ctx.fill();
        break;
      case 2:
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.5);
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 1.8); ctx.lineTo(x + s * 0.6, y - s * 0.2); ctx.lineTo(x - s * 0.6, y - s * 0.2);
        ctx.closePath(); ctx.fill();
        break;
      case 3:
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.14, y, s * 0.28, s * 0.6);
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2.4); ctx.lineTo(x + s * 0.9, y - s * 0.6); ctx.lineTo(x - s * 0.9, y - s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 3.0); ctx.lineTo(x + s * 0.65, y - s * 1.4); ctx.lineTo(x - s * 0.65, y - s * 1.4);
        ctx.closePath(); ctx.fill();
        break;
      case 4:
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.16, y, s * 0.32, s * 0.7);
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s, y); ctx.lineTo(x - s, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 3.2); ctx.lineTo(x + s * 0.68, y - s * 0.6); ctx.lineTo(x - s * 0.68, y - s * 0.6);
        ctx.closePath(); ctx.fill();
        break;
      case 5: default:
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.18, y, s * 0.36, s * 0.8);
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 1.2, y + s * 0.1); ctx.lineTo(x - s * 1.2, y + s * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2.8); ctx.lineTo(x + s * 0.95, y - s * 0.9); ctx.lineTo(x - s * 0.95, y - s * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = lightCol;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 3.8); ctx.lineTo(x + s * 0.62, y - s * 2.2); ctx.lineTo(x - s * 0.62, y - s * 2.2);
        ctx.closePath(); ctx.fill();
        break;
    }
  }

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
  _drawBuilding(entity) {
    const p = this._tileToScreen(entity.x, entity.y);
    const sPos = this._worldToScreen(p.sx, p.sy);
    if (!this._isOnScreen(sPos.x, sPos.y)) return;

    const ctx = this.ctx;
    const tw = this.TW * this.zoom;
    const th = this.TH * this.zoom;
    const s = this.zoom;

    const isA = entity.tribe === 'a';
    const color = isA ? '#c8502a' : '#2a6ec8';
    const darkColor = isA ? '#802010' : '#103080';
    const lightColor = isA ? '#e07050' : '#5090e0';
    const roofColor = isA ? '#601800' : '#082060';

    const topOffsets = {
      [CONFIG.ENTITY.CAPITOL]: th * 2.55,
      [CONFIG.ENTITY.FORT]: th * 1.85,
      [CONFIG.ENTITY.BARRACKS]: th * 1.55,
      [CONFIG.ENTITY.FARM]: th * 1.25,
      [CONFIG.ENTITY.TOWER]: th * 3.35,
      [CONFIG.ENTITY.HOME]: th * 1.35,
      [CONFIG.ENTITY.STOREHOUSE]: th * 1.65,
      [CONFIG.ENTITY.WALL]: th * 1.45,
    };

    switch (entity.type) {
      case CONFIG.ENTITY.CAPITOL: this._drawCapitol(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.FORT: this._drawFort(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.BARRACKS: this._drawBarracks(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.FARM: this._drawFarm(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor, entity); break;
      case CONFIG.ENTITY.TOWER: this._drawTower(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.HOME: this._drawHome(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.STOREHOUSE: this._drawStorehouse(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      case CONFIG.ENTITY.WALL: this._drawWall(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor); break;
      default:
        ctx.fillStyle = color;
        ctx.fillRect(sPos.x - tw * 0.15, sPos.y - th * 0.8, tw * 0.3, th * 0.8);
        break;
    }

    const hpFrac = entity.hp / entity.maxHp;
    if (hpFrac < 1) {
      const bw = tw * 0.42;
      const barY = sPos.y - (topOffsets[entity.type] || th * 1.2) - 5 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(sPos.x - bw / 2, barY, bw, 3 * s);
      ctx.fillStyle = hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(sPos.x - bw / 2, barY, bw * hpFrac, 3 * s);
    }

    if (entity._underAttack && entity._underAttack > 0) {
      const topY = sPos.y - (topOffsets[entity.type] || th * 1.2);
      const pulse = 0.4 + 0.6 * (entity._underAttack / 4);
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,60,${pulse})`;
      ctx.lineWidth = 2.5 * s;
      ctx.shadowColor = '#ff3030';
      ctx.shadowBlur = 10;
      ctx.strokeRect(sPos.x - tw * 0.32, topY, tw * 0.64, sPos.y - topY);
      ctx.restore();
    }

    if (s > 0.55 && entity.level && entity.level > 1) {
      const lbx = sPos.x + tw * 0.26;
      const lby = sPos.y - (topOffsets[entity.type] || th * 1.2) + 2 * s;
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.round(7 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${entity.level}`, lbx, lby);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Building sprite methods (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

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
  _drawCapitol(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.6; const h = th * 2.0;
    ctx.fillStyle = lightColor;
    ctx.fillRect(x - w * 0.68, y - th * 0.13, w * 1.36, th * 0.13);
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.14 * s, h);
    if (s > 0.45) {
      const colW = w * 0.07;
      ctx.fillStyle = this._darken(lightColor, 0.13);
      for (let i = 0; i < 4; i++) {
        const cx = x - w * 0.38 + i * (w * 0.76 / 3);
        ctx.fillRect(cx - colW / 2, y - h * 0.73, colW, h * 0.73);
      }
    }
    ctx.fillStyle = darkColor;
    ctx.fillRect(x - w / 2, y - h * 0.76, w, th * 0.1);
    ctx.fillStyle = color;
    ctx.fillRect(x - w * 0.38, y - h, w * 0.76, h * 0.26);
    ctx.fillStyle = roofColor;
    ctx.fillRect(x - w * 0.33, y - h * 1.02, w * 0.66, th * 0.08);
    ctx.beginPath(); ctx.ellipse(x, y - h, w * 0.33, th * 0.56, 0, Math.PI, 0); ctx.fill();
  }

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
  _drawFort(ctx, x, y, tw, th, s, color, darkColor) {
    const w = tw * 0.62; const h = th * 1.35;
    const tW = w * 0.18; const tH = h + th * 0.18;
    ctx.fillStyle = this._darken(color, 0.1);
    ctx.fillRect(x - w / 2 - tW * 0.4, y - tH, tW, tH);
    ctx.fillRect(x + w / 2 - tW * 0.6, y - tH, tW, tH);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.13 * s, h);
    const mW = w / 9; const mH = th * 0.22;
    for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2 + i * mW * 2, y - h - mH, mW, mH);
  }

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
  _drawBarracks(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.52; const h = th * 1.0;
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.04, y - h); ctx.lineTo(x, y - h - th * 0.38); ctx.lineTo(x + w / 2 + th * 0.04, y - h);
    ctx.closePath(); ctx.fill();
    if (s > 0.45) {
      ctx.strokeStyle = lightColor; ctx.lineWidth = 0.8 * s;
      ctx.beginPath(); ctx.moveTo(x, y - h - th * 0.38); ctx.lineTo(x, y - h - th * 0.8); ctx.stroke();
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.moveTo(x, y - h - th * 0.8); ctx.lineTo(x + th * 0.3, y - h - th * 0.68); ctx.lineTo(x, y - h - th * 0.56);
      ctx.closePath(); ctx.fill();
    }
  }

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
  _drawFarm(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor, entity) {
    const size = entity ? (entity.size || 1) : 1;
    const lv = entity ? (entity.level || 1) : 1;
    const sizeScale = 1 + (size - 1) * 0.26;
    const w = tw * 0.5 * sizeScale; const h = th * 0.88 * (1 + (lv - 1) * 0.06);
    const sW = w * 0.2; const sH = h * 0.75;
    if (s > 0.22) {
      const fieldW = w * 1.5; const fieldH = th * (0.38 + size * 0.07);
      ctx.fillStyle = 'rgba(140,120,60,0.25)';
      ctx.fillRect(x - fieldW / 2, y - th * 0.2, fieldW, fieldH);
      ctx.strokeStyle = 'rgba(90,75,40,0.3)'; ctx.lineWidth = 0.8 * s;
      const furrows = 2 + size;
      for (let i = 0; i < furrows; i++) {
        const fy = y - th * 0.2 + (i / furrows) * fieldH;
        ctx.beginPath(); ctx.moveTo(x - fieldW / 2, fy); ctx.lineTo(x + fieldW / 2, fy); ctx.stroke();
      }
    }
    const s1x = x - w / 2 - sW * 0.3; const s2x = x + w / 2 - sW * 0.7;
    ctx.fillStyle = this._darken(color, 0.08);
    ctx.fillRect(s1x, y - sH, sW, sH); ctx.fillRect(s2x, y - sH, sW, sH);
    ctx.fillStyle = roofColor;
    ctx.beginPath(); ctx.ellipse(s1x + sW / 2, y - sH, sW / 2, sW * 0.22, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s2x + sW / 2, y - sH, sW / 2, sW * 0.22, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath(); ctx.ellipse(x, y - h, w / 2, th * 0.28, 0, Math.PI, 0); ctx.fill();
    if (s > 0.5) {
      const dW = w * 0.24; const dH = th * 0.28;
      ctx.fillStyle = darkColor; ctx.fillRect(x - dW / 2, y - dH, dW, dH);
      ctx.beginPath(); ctx.arc(x, y - dH, dW / 2, Math.PI, 0); ctx.fill();
    }
  }

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
  _drawTower(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.22; const h = th * 2.3;
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);
    if (s > 0.55) {
      const slW = w * 0.18; const slH = th * 0.18;
      ctx.fillStyle = darkColor;
      ctx.fillRect(x - slW / 2, y - h * 0.72, slW, slH);
      ctx.fillRect(x - slW / 2, y - h * 0.42, slW, slH);
    }
    ctx.fillStyle = this._darken(color, 0.18);
    ctx.fillRect(x - w * 0.75, y - h, w * 1.5, th * 0.07);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x, y - h - th * 0.95); ctx.lineTo(x + w * 0.75, y - h); ctx.lineTo(x - w * 0.75, y - h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y - h - th * 0.95); ctx.lineTo(x + w * 0.2, y - h); ctx.lineTo(x, y - h);
    ctx.closePath(); ctx.fill();
  }

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
  _drawHome(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.36; const h = th * 1.02;
    ctx.fillStyle = lightColor; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.07, th * 0.07 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.04, y - h); ctx.lineTo(x, y - h - th * 0.52); ctx.lineTo(x + w / 2 + th * 0.04, y - h);
    ctx.closePath(); ctx.fill();
    if (s > 0.45) {
      const chiW = w * 0.2; const chiH = th * 0.38;
      ctx.fillStyle = this._darken(color, 0.22);
      ctx.fillRect(x + w * 0.15, y - h - chiH, chiW, chiH + th * 0.1);
      if (s > 0.75) {
        const chimneyX = x + w * 0.15 + chiW / 2;
        ctx.fillStyle = 'rgba(210,210,210,0.28)';
        ctx.beginPath(); ctx.arc(chimneyX, y - h - chiH - 2.5 * s, 2.0 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(chimneyX + s, y - h - chiH - 5.0 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

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
  _drawStorehouse(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.56; const h = th * 1.18;
    ctx.fillStyle = this._darken(lightColor, 0.08); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.08, th * 0.11 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.06, y - h); ctx.lineTo(x, y - h - th * 0.45); ctx.lineTo(x + w / 2 + th * 0.06, y - h);
    ctx.closePath(); ctx.fill();
    if (s > 0.5) {
      ctx.fillStyle = this._darken(color, 0.15);
      ctx.fillRect(x - w * 0.18, y - h * 0.52, w * 0.36, th * 0.26);
      ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 1 * s;
      for (let i = 0; i < 3; i++) {
        const yy = y - h * 0.52 + i * (th * 0.09);
        ctx.beginPath(); ctx.moveTo(x - w * 0.18, yy); ctx.lineTo(x + w * 0.18, yy); ctx.stroke();
      }
    }
  }

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
  _drawWall(ctx, x, y, tw, th, s, color, darkColor) {
    const w = tw * 0.68; const h = th * 0.58;
    ctx.fillStyle = this._darken(color, 0.15); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.04, th * 0.08 * s, h);
    const mW = w / 8; const mH = th * 0.16;
    ctx.fillStyle = this._darken(color, 0.30);
    for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + i * mW * 2, y - h - mH, mW, mH);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Unit sprite methods (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

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
  _drawUnit(entity) {
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
    const vx = (entity._lx ?? entity.x) + (entity._ox || 0);
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
    const vy = (entity._ly ?? entity.y) + (entity._oy || 0) + (entity._gaitY || 0);
    const p = this._tileToScreen(vx, vy);
    const sPos = this._worldToScreen(p.sx, p.sy);
    if (!this._isOnScreen(sPos.x, sPos.y)) return;

    const ctx = this.ctx;
    const s = this.zoom;
    const isA = entity.tribe === 'a';
    const color = isA ? '#e06030' : '#3080e0';
    const darkColor = isA ? '#802010' : '#103080';

    switch (entity.type) {
      case CONFIG.ENTITY.WARRIOR: this._drawWarrior(ctx, sPos.x, sPos.y, s, color, darkColor); break;
      case CONFIG.ENTITY.WORKER: this._drawWorker(ctx, sPos.x, sPos.y, s, color, darkColor); break;
      case CONFIG.ENTITY.SCOUT: this._drawScout(ctx, sPos.x, sPos.y, s, color, darkColor); break;
      case CONFIG.ENTITY.LEADER: this._drawLeader(ctx, sPos.x, sPos.y, s, color, darkColor); break;
      case CONFIG.ENTITY.NORMAL: this._drawNormal(ctx, sPos.x, sPos.y, s, color, darkColor); break;
      default:
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sPos.x, sPos.y - 4 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        break;
    }

    if (entity.state === 'fighting') {
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
      const pulseR = (entity.type === CONFIG.ENTITY.LEADER ? 7 : 5) * s;
      ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(sPos.x, sPos.y - pulseR, pulseR + 3 * s * (0.5 + 0.5 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (entity._underFire && entity._underFire > 0) {
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
      const r = (entity.type === CONFIG.ENTITY.LEADER ? 6.5 : 4.5) * s;
      ctx.save();
      ctx.strokeStyle = `rgba(255,80,80,${entity._underFire / 4})`; ctx.lineWidth = 2.5 * s;
      ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(sPos.x, sPos.y - r, r + 3 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    const hpFrac = entity.hp / entity.maxHp;
    if (hpFrac < 1 && s > 0.45) {
      const bw = 10 * s;
      const barY = sPos.y - (entity.type === CONFIG.ENTITY.LEADER ? 14 : 11) * s;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sPos.x - bw / 2, barY, bw, 2.5 * s);
      ctx.fillStyle = hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(sPos.x - bw / 2, barY, bw * hpFrac, 2.5 * s);
    }
  }

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
  _drawWarrior(ctx, x, y, s, color, darkColor) {
    const r = 5.0 * s; const cy = y - r * 1.2;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = darkColor; ctx.lineWidth = 1.2 * s; ctx.stroke();
    if (s > 0.45) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.9 * s;
      ctx.beginPath(); ctx.moveTo(x, cy - r * 0.52); ctx.lineTo(x, cy + r * 0.52);
      ctx.moveTo(x - r * 0.38, cy - r * 0.08); ctx.lineTo(x + r * 0.38, cy - r * 0.08); ctx.stroke();
    }
  }

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
  _drawWorker(ctx, x, y, s, color, darkColor) {
    const r = 4.5 * s; const cy = y - r;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x, cy - r); ctx.lineTo(x + r, cy); ctx.lineTo(x, cy + r); ctx.lineTo(x - r, cy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = darkColor; ctx.lineWidth = 1.0 * s; ctx.stroke();
  }

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
  _drawScout(ctx, x, y, s, color, darkColor) {
    const r = 4.0 * s; const cy = y - r;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x, cy - r); ctx.lineTo(x + r * 0.78, cy + r * 0.7); ctx.lineTo(x - r * 0.78, cy + r * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = darkColor; ctx.lineWidth = 1.0 * s; ctx.stroke();
  }

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
  _drawLeader(ctx, x, y, s, color, darkColor) {
    const r = 6.5 * s; const cy = y - r * 1.25;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = darkColor; ctx.lineWidth = 1.5 * s; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,100,0.45)'; ctx.lineWidth = 1.0 * s;
    ctx.beginPath(); ctx.arc(x, cy, r * 0.65, 0, Math.PI * 2); ctx.stroke();
    if (s > 0.4) {
      const crownY = cy - r;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, crownY); ctx.lineTo(x - r * 0.5, crownY - r * 0.5);
      ctx.lineTo(x - r * 0.15, crownY - r * 0.25); ctx.lineTo(x, crownY - r * 0.6);
      ctx.lineTo(x + r * 0.15, crownY - r * 0.25); ctx.lineTo(x + r * 0.5, crownY - r * 0.5);
      ctx.lineTo(x + r * 0.5, crownY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b8900a'; ctx.lineWidth = 0.6 * s; ctx.stroke();
    }
  }

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
  _drawNormal(ctx, x, y, s, color, darkColor) {
    const r = 3.2 * s; const cy = y - r * 1.0;
    ctx.fillStyle = this._darken(color, 0.12);
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    if (s > 0.5) {
      ctx.strokeStyle = darkColor; ctx.lineWidth = 0.8 * s;
      ctx.beginPath(); ctx.moveTo(x, cy + r * 0.95); ctx.lineTo(x, cy + r * 2.1); ctx.stroke();
    }
  }

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
  _drawBattleLine() {
    const ctx = this.ctx;
    const midX = CONFIG.MAP_W / 2;
    const topTile = this._tileToScreen(midX, 0);
    const botTile = this._tileToScreen(midX, CONFIG.MAP_H);
    const top = this._worldToScreen(topTile.sx, topTile.sy);
    const bot = this._worldToScreen(botTile.sx, botTile.sy);
    ctx.strokeStyle = 'rgba(212,168,67,0.3)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Weather system (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

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
  _initWeatherParticles(type = CONFIG.WEATHER.SUNSHINE) {
    const W = this.W || 1280; const H = this.H || 720;
    this._currentWeatherType = type;
    const wb = this._worldBounds || { minSx: -W, maxSx: W * 2, minSy: -H, maxSy: H * 1.5 };
    this._clouds = Array.from({ length: 30 }, () => {
      const layer = 0.72 + Math.random() * 0.24;
      return { wx: wb.minSx + Math.random() * (wb.maxSx - wb.minSx), wy: wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.45), r: 55 + Math.random() * 120, v: 0.15 + Math.random() * 0.35, a: 0.08 + Math.random() * 0.16, layer };
    });
    const rainCount = Math.floor((W * H) / 12000);
    this._rainDrops = Array.from({ length: rainCount }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 7 + Math.random() * 7, l: 8 + Math.random() * 10 }));
    const snowCount = Math.floor((W * H) / 16000);
    this._snowFlakes = Array.from({ length: snowCount }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 1.4, w: (Math.random() - 0.5) * 0.7, r: 1 + Math.random() * 2, p: Math.random() * Math.PI * 2 }));
  }

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
  _drawWeatherBackground(ctx, weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;
    const presets = {
      [CONFIG.WEATHER.SUNSHINE]: ['#6fb9ff', '#d7ecff'], [CONFIG.WEATHER.OVERCAST]: ['#70879f', '#c8d4df'],
      [CONFIG.WEATHER.RAIN]: ['#51657d', '#8ea3b7'], [CONFIG.WEATHER.STORM]: ['#2a3448', '#5c667a'],
      [CONFIG.WEATHER.SNOW]: ['#7b93aa', '#dce7f2'], [CONFIG.WEATHER.DROUGHT]: ['#bb8e53', '#e0c590'],
      [CONFIG.WEATHER.FLOOD]: ['#3f6b86', '#8db2c7'],
    };
    const [top, bottom] = presets[type] || presets[CONFIG.WEATHER.SUNSHINE];
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, top); grad.addColorStop(1, bottom);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, this.W, this.H);
    if (type === CONFIG.WEATHER.DROUGHT) { ctx.fillStyle = 'rgba(255,170,70,0.14)'; ctx.fillRect(0, 0, this.W, this.H); }
    if (type === CONFIG.WEATHER.STORM) { ctx.fillStyle = 'rgba(15,15,25,0.22)'; ctx.fillRect(0, 0, this.W, this.H); }
    if (type === CONFIG.WEATHER.FLOOD) { ctx.fillStyle = 'rgba(80,140,180,0.14)'; ctx.fillRect(0, this.H * 0.4, this.W, this.H * 0.6); }
  }

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
  _updateWeatherParticles(weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;
    if (type !== this._currentWeatherType) this._initWeatherParticles(type);
    const wb = this._worldBounds || { minSx: -2000, maxSx: 2000, minSy: -1200, maxSy: 1200 };
    for (const c of this._clouds) { c.wx += c.v; if (c.wx - c.r > wb.maxSx + 400) { c.wx = wb.minSx - c.r - 300; c.wy = wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.5); } }
    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      for (const d of this._rainDrops) { d.x += 2.0; d.y += d.v; if (d.y > this.H + 20) { d.y = -20; d.x = Math.random() * this.W; } if (d.x > this.W + 20) d.x = -20; }
    }
    if (type === CONFIG.WEATHER.SNOW) {
      for (const f of this._snowFlakes) { f.p += 0.03; f.x += f.w + Math.sin(f.p) * 0.35; f.y += f.v; if (f.y > this.H + 8) { f.y = -8; f.x = Math.random() * this.W; } if (f.x < -8) f.x = this.W + 8; if (f.x > this.W + 8) f.x = -8; }
    }
    if (type === CONFIG.WEATHER.STORM) { if (this._lightningFlash > 0) this._lightningFlash -= 0.05; else if (Math.random() < 0.004) this._lightningFlash = 0.8; } else { this._lightningFlash = 0; }
  }

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
  _drawWeatherParticles(ctx, weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;
    for (const c of this._clouds) {
      const cp = this._worldToScreenParallax(c.wx, c.wy, c.layer, c.layer * 0.88);
      if (!this._isOnScreen(cp.x, cp.y, c.r * this.zoom * 2.4)) continue;
      const r = c.r * this.zoom;
      ctx.fillStyle = `rgba(255,255,255,${c.a})`;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cp.x + r * 0.6, cp.y + r * 0.1, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cp.x - r * 0.6, cp.y + r * 0.12, r * 0.65, 0, Math.PI * 2); ctx.fill();
    }
    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      ctx.strokeStyle = type === CONFIG.WEATHER.STORM ? 'rgba(190,220,255,0.65)' : 'rgba(200,220,240,0.55)'; ctx.lineWidth = 1;
      for (const d of this._rainDrops) { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.35, d.y + d.l); ctx.stroke(); }
    }
    if (type === CONFIG.WEATHER.SNOW) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      for (const f of this._snowFlakes) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (type === CONFIG.WEATHER.DROUGHT) {
      ctx.strokeStyle = 'rgba(255,220,130,0.12)';
      for (let i = 0; i < 20; i++) { const y = (i / 20) * this.H; ctx.beginPath(); ctx.moveTo(0, y + Math.sin((Date.now() * 0.002) + i) * 2); ctx.lineTo(this.W, y + Math.sin((Date.now() * 0.002) + i + 1) * 2); ctx.stroke(); }
    }
    if (this._lightningFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${this._lightningFlash * 0.35})`; ctx.fillRect(0, 0, this.W, this.H); }
  }

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
  _unitVisualSeed(u) {
    if (u._visSeed !== undefined) return u._visSeed;
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
    const n = ((u.id || 0) * 131 + (u.tribe === 'a' ? 17 : 29) * 37 + (u.type || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 13) % 10007;
    u._visSeed = n;
    return n;
  }

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
  _computePurposeOffset(u, moving, mdx, mdy) {
    const seed = this._unitVisualSeed(u);
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
    const lane = ((seed % 3) - 1); const sign = (seed % 2 === 0) ? 1 : -1;
    let nx = 0, ny = 0;
    const mLen = Math.hypot(mdx, mdy);
    if (mLen > 0.0001) { nx = mdx / mLen; ny = mdy / mLen; }
    else if (u.targetX !== undefined && u.targetY !== undefined) {
      const tx = u.targetX - (u._lx ?? u.x); const ty = u.targetY - (u._ly ?? u.y);
      const tLen = Math.hypot(tx, ty);
      if (tLen > 0.0001) { nx = tx / tLen; ny = ty / tLen; }
    }
    const px = -ny; const py = nx;
    let forward = moving ? 0.10 : 0.03, side = 0;
    let stanceSpeed = moving ? 0.22 : 0.08;
    let gaitAmp = moving ? (0.018 / Math.max(0.25, this.zoom)) : (0.006 / Math.max(0.25, this.zoom));
    switch (u.state) {
      case 'marching': forward = 0.20; side = lane * 0.085; stanceSpeed = 0.27; gaitAmp *= 1.20; break;
      case 'patrolling': forward = 0.16; side = Math.sin((u._stanceP || 0) * 0.9 + seed * 0.01) * 0.06; stanceSpeed = 0.24; gaitAmp *= 1.10; break;
      case 'fighting': forward = 0.06; side = sign * 0.08; stanceSpeed = 0.30; gaitAmp *= 0.85; break;
      case 'working': case 'working_farm': forward = 0.08; side = lane * 0.05; stanceSpeed = 0.16; gaitAmp *= 0.75; break;
      case 'wandering': forward = 0.12; side = lane * 0.04; stanceSpeed = 0.18; break;
      case 'idle': default: forward = 0.02; side = lane * 0.02; stanceSpeed = 0.07; gaitAmp *= 0.45; break;
    }
    if (u.type === CONFIG.ENTITY.WORKER) side += (u.tribe === 'a' ? -1 : 1) * 0.025;
    if (u.type === CONFIG.ENTITY.SCOUT) forward += 0.02;
    if (u.type === CONFIG.ENTITY.NORMAL) forward -= 0.01;
    return { ox: nx * forward + px * side, oy: (ny * forward + py * side) * 0.85, stanceSpeed, gaitAmp };
  }

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
    this._drawWeatherBackground(ctx, weather);
    this._updateWeatherParticles(weather);

    // 2. Tile layer — use cached offscreen buffer
    if (!this._isTileBufferValid(weather)) {
      this._renderTileBuffer(world, weather);
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

    // 3. Battle line
    this._drawBattleLine();

    // 4. Buildings (sorted by depth)
    const buildings = [...tribeA.buildings, ...tribeB.buildings];
    buildings.sort((a, b) => (a.y + a.x * 0.2) - (b.y + b.x * 0.2));
    for (const b of buildings) {
      if (b._underAttack) b._underAttack--;
      this._drawBuilding(b);
    }

    // 5. Units — update lerp, cull NORMAL at low zoom
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

      const prof = this._computePurposeOffset(u, moving, mdx, mdy);
      u._ox = (u._ox || 0) + (prof.ox - (u._ox || 0)) * 0.24;
      u._oy = (u._oy || 0) + (prof.oy - (u._oy || 0)) * 0.24;
      u._stanceP = (u._stanceP || 0) + prof.stanceSpeed;
      u._gaitP = (u._gaitP || 0) + (moving ? 0.22 : 0.06);
      u._gaitY = Math.sin(u._gaitP * 2.0) * prof.gaitAmp;

      if (u._underFire) u._underFire--;
      drawUnits.push(u);
    }

    drawUnits.sort((a, b) => ((a._ly ?? a.y) + (a._lx ?? a.x) * 0.2) - ((b._ly ?? b.y) + (b._lx ?? b.x) * 0.2));
    for (const u of drawUnits) this._drawUnit(u);

    // 6. Attack lines & tower beams
    this._drawAttackLines(tribeA, tribeB);
    this._drawTowerBeams(tribeA, tribeB);

    // 7. Weather particles (on top)
    this._drawWeatherParticles(ctx, weather);

    // 8. Hover detection — throttled to every 3 frames
    this._hoverFrame++;
    if (this._hoverFrame >= 3) {
      this._hoverFrame = 0;
      if (tribeA && tribeB) {
        this._hoveredEntity = this._findHoveredEntity(this._mouseX, this._mouseY, tribeA, tribeB);
      }
    }
    if (this._hoveredEntity) this._drawTooltip(this._hoveredEntity);
  }

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
  _drawAttackLines(tribeA, tribeB) {
    const ctx = this.ctx;
    const allUnits = [...tribeA.units, ...tribeB.units];
    for (const u of allUnits) {
      if (!u.attackTarget) continue;
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
      const ux = (u._lx ?? u.x) + (u._ox || 0);
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
      const uy = (u._ly ?? u.y) + (u._oy || 0) + (u._gaitY || 0);
      const tx = u.attackTarget.x;
      const ty = u.attackTarget.y;
      const p1 = this._tileToScreen(ux, uy); const s1 = this._worldToScreen(p1.sx, p1.sy);
      const p2 = this._tileToScreen(tx, ty); const s2 = this._worldToScreen(p2.sx, p2.sy);
      const color = u.tribe === 'a' ? 'rgba(220,100,60,0.85)' : 'rgba(60,130,220,0.85)';
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 * this.zoom;
      ctx.setLineDash([4 * this.zoom, 3 * this.zoom]);
      ctx.shadowColor = color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(s1.x, s1.y - 4 * this.zoom); ctx.lineTo(s2.x, s2.y - 4 * this.zoom); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      const aLen = 7 * this.zoom;
      ctx.save();
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y - 4 * this.zoom);
      ctx.lineTo(s2.x - aLen * Math.cos(angle - 0.4), s2.y - 4 * this.zoom - aLen * Math.sin(angle - 0.4));
      ctx.lineTo(s2.x - aLen * Math.cos(angle + 0.4), s2.y - 4 * this.zoom - aLen * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

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
  _drawTowerBeams(tribeA, tribeB) {
    const ctx = this.ctx;
    for (const tribe of [tribeA, tribeB]) {
      for (const tower of tribe.buildings) {
        if (tower.type !== CONFIG.ENTITY.TOWER || !tower.attackTarget) continue;
        const p1 = this._tileToScreen(tower.x, tower.y); const s1 = this._worldToScreen(p1.sx, p1.sy);
        const tx = tower.attackTarget.x; const ty = tower.attackTarget.y;
        const p2 = this._tileToScreen(tx, ty); const s2 = this._worldToScreen(p2.sx, p2.sy);
        const col = tribe.id === 'a' ? 'rgba(255,160,60,0.9)' : 'rgba(80,180,255,0.9)';
        const th = this.TH * this.zoom;
        ctx.save();
        ctx.strokeStyle = col; ctx.lineWidth = 2.0 * this.zoom; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(s1.x, s1.y - th * 2.5); ctx.lineTo(s2.x, s2.y - 4 * this.zoom); ctx.stroke();
        ctx.lineWidth = 1 * this.zoom;
        ctx.beginPath(); ctx.arc(s2.x, s2.y - 4 * this.zoom, 4 * this.zoom, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

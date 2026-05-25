// Tile layer: offscreen buffer, hex tile drawing, biome colors, trees, resource icons.
class TileRenderer {
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
  constructor(r) {
    this.r = r;
  }

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
    if (this.r._tileBufDirty) return false;
    if (this.r._tileBufZoom !== this.r.zoom) return false;
    if (this.r._tileBufW !== this.r.W || this.r._tileBufH !== this.r.H) return false;
    const wt = weather?.type || 'sunshine';
    if (this.r._tileBufWeatherType !== wt) return false;
    if (this.r._tileBufTerritoryGen !== (this.r._worldRef?._territoryGen || 0)) return false;
    // Fog changes invalidate buffer (newly revealed tiles need terrain drawn)
    const fogGen = (typeof Game !== 'undefined' && Game.fog) ? Game.fog.generation : 0;
    if (this._tileBufFogGen !== fogGen) return false;
    // Camera pan within padding?
    const dx = Math.abs(this.r.camX - this.r._tileBufCamX);
    const dy = Math.abs(this.r.camY - this.r._tileBufCamY);
    if (dx > this.r._tileBufPadding || dy > this.r._tileBufPadding) return false;
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
    const bw = this.r.W + this.r._tileBufPadding * 2;
    const bh = this.r.H + this.r._tileBufPadding * 2;
    if (!this.r._tileCanvas || this.r._tileCanvas.width !== bw || this.r._tileCanvas.height !== bh) {
      this.r._tileCanvas = document.createElement('canvas');
      this.r._tileCanvas.width = bw;
      this.r._tileCanvas.height = bh;
      this.r._tileCtx = this.r._tileCanvas.getContext('2d');
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
    const bufCtx = this.r._tileCtx;
    const bw = this.r._tileCanvas.width;
    const bh = this.r._tileCanvas.height;

    bufCtx.clearRect(0, 0, bw, bh);

    // The buffer is centered on current camera position
    // Offset: buffer pixel (0,0) corresponds to screen pixel (-padding, -padding)
    const pad = this.r._tileBufPadding;

    // We need to draw tiles that are visible within the buffer's coverage
    // Buffer covers screen area [-pad, -pad] to [W+pad, H+pad]
    const nw = this.r._screenToWorld(-pad - 140, -pad - 140);
    const se = this.r._screenToWorld(this.r.W + pad + 140, this.r.H + pad + 140);

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

    this.r._updateHexCorners();
    const corners = this.r._hexCorners;
    const sz = CONFIG.HEX_SIZE * this.r.zoom;
    const vs = CONFIG.HEX_V_SCALE;

    const visibleTiles = [];
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const tile = world.tiles[y][x];
        const p = this.r._tileToScreen(x, y);
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
        const bx = (p.sx - this.r.camX) * this.r.zoom + this.r.W / 2 + pad;
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
        const by = (p.sy - this.r.camY) * this.r.zoom + this.r.H / 2 + pad;

        if (bx < -sz * 4 || bx > bw + sz * 4 || by < -sz * 4 || by > bh + sz * 4) continue;

        // Skip fully unexplored tiles — fog overlay covers them, no need to render terrain
        if (typeof Game !== 'undefined' && Game.fog
            && Game.fog.getVisibility(x, y) === 0) continue;

        visibleTiles.push({ x, y, tile, bx, by });
      }
    }

    // Painter's order: draw deeper (lower on screen) tiles first.
    // This prevents row-major overdraw from creating directional shadow bias.
    visibleTiles.sort((a, b) => {
      if (a.by !== b.by) return b.by - a.by;
      return b.bx - a.bx;
    });

    for (const vt of visibleTiles) {
      this._drawTileToBuffer(bufCtx, vt.x, vt.y, vt.tile, vt.bx, vt.by, sz, vs, corners);
    }

    this.r._tileBufCamX = this.r.camX;
    this.r._tileBufCamY = this.r.camY;
    this.r._tileBufZoom = this.r.zoom;
    this.r._tileBufW = this.r.W;
    this.r._tileBufH = this.r.H;
    this.r._tileBufWeatherType = weather?.type || 'sunshine';
    this.r._tileBufTerritoryGen = world._territoryGen || 0;
    this._tileBufFogGen = (typeof Game !== 'undefined' && Game.fog) ? Game.fog.generation : 0;
    this.r._tileBufDirty = false;
  }

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
    const elev  = tile.elevation || 0;
    const world = this.r._worldRef;

    // Translate pre-computed corners to tile position
    const c0x = sx + corners[0].dx, c0y = sy + corners[0].dy;
    const c1x = sx + corners[1].dx, c1y = sy + corners[1].dy;
    const c2x = sx + corners[2].dx, c2y = sy + corners[2].dy;
    const c3x = sx + corners[3].dx, c3y = sy + corners[3].dy;
    const c4x = sx + corners[4].dx, c4y = sy + corners[4].dy;
    const c5x = sx + corners[5].dx, c5y = sy + corners[5].dy;

    const tileDepth = tile.type === CONFIG.TILE.WATER
      ? 0
      : sz * vs * Math.min(2.45, Math.pow(elev, 1.06) * 3.15);

    // For each visible lower edge, compare this tile's depth against the
    // neighbor sharing that edge; only the exposed delta gets a side face.
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
    const evenCol = (tx % 2 === 0);
    const lowerRightNeighbor = evenCol ? { x: tx + 1, y: ty } : { x: tx + 1, y: ty + 1 };
    const lowerLeftNeighbor = evenCol ? { x: tx - 1, y: ty } : { x: tx - 1, y: ty + 1 };
    const bottomNeighbor = { x: tx, y: ty + 1 };

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
    const getDepthAt = (nx, ny) => {
      if (!world || nx < 0 || ny < 0 || nx >= world.W || ny >= world.H) return 0;
      const nt = world.tiles[ny][nx];
      if (!nt || nt.type === CONFIG.TILE.WATER) return 0;
      const ne = nt.elevation || 0;
      return sz * vs * Math.min(2.45, Math.pow(ne, 1.06) * 3.15);
    };

    // Exaggerate exposed deltas so subtle slopes are easier to read.
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
    const exaggerateFace = (d) => {
      if (d <= 0) return 0;
      const boosted = Math.pow(d / (sz * vs), 0.72) * (sz * vs) * 1.35;
      return Math.min(sz * vs * 2.65, boosted);
    };

    const faceDepthRight = exaggerateFace(Math.max(0, tileDepth - getDepthAt(lowerRightNeighbor.x, lowerRightNeighbor.y)));
    const faceDepthBottom = exaggerateFace(Math.max(0, tileDepth - getDepthAt(bottomNeighbor.x, bottomNeighbor.y)));
    const faceDepthLeft = exaggerateFace(Math.max(0, tileDepth - getDepthAt(lowerLeftNeighbor.x, lowerLeftNeighbor.y)));

    // Ultra-low LOD — just fill the hex and add a tiny exposed-face hint.
    if (this.r.zoom < 0.16) {
      ctx.beginPath();
      ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y); ctx.lineTo(c2x, c2y);
      ctx.lineTo(c3x, c3y); ctx.lineTo(c4x, c4y); ctx.lineTo(c5x, c5y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      // Thin shadow strip on lower-left edge where this tile is truly exposed.
      if (faceDepthLeft > 0.01) {
        const miniD = Math.min(faceDepthLeft, sz * vs * 0.55);
        ctx.fillStyle = this.r._darken(color, 0.68);
        ctx.beginPath();
        ctx.moveTo(c2x, c2y); ctx.lineTo(c3x, c3y);
        ctx.lineTo(c3x, c3y + miniD); ctx.lineTo(c2x, c2y + miniD);
        ctx.closePath(); ctx.fill();
      }
      return;
    }

    // ── Q*bert-style elevation blocks ────────────────────────────────────
    // Corner layout (flat-top hex, canvas Y positive = down, vs compressed):
    //   c5 (upper-right)  c4 (upper-left)
    //   c0 (right)        c3 (left)
    //   c1 (lower-right)  c2 (lower-left)
    //
    // The three LOWER edges face the viewer; depth faces hang downward from them:
    //   c0→c1  lower-right face  → lightest (lit side)
    //   c1→c2  bottom face       → mid shadow
    //   c2→c3  lower-left face   → darkest (shadow side)
    //
    // The three UPPER edges (c3→c4→c5→c0) get the rim highlight.
    if (this.r.zoom >= 0.16) {
      // Lower-left face — deep shadow
      if (faceDepthLeft > 0.01) {
        ctx.fillStyle = this.r._darken(color, 0.72);
        ctx.beginPath();
        ctx.moveTo(c2x, c2y); ctx.lineTo(c3x, c3y);
        ctx.lineTo(c3x, c3y + faceDepthLeft); ctx.lineTo(c2x, c2y + faceDepthLeft);
        ctx.closePath(); ctx.fill();
      }

      // Bottom face — mid shadow
      if (faceDepthBottom > 0.01) {
        ctx.fillStyle = this.r._darken(color, 0.54);
        ctx.beginPath();
        ctx.moveTo(c1x, c1y); ctx.lineTo(c2x, c2y);
        ctx.lineTo(c2x, c2y + faceDepthBottom); ctx.lineTo(c1x, c1y + faceDepthBottom);
        ctx.closePath(); ctx.fill();
      }

      // Lower-right face — lightest (most lit)
      if (faceDepthRight > 0.01) {
        ctx.fillStyle = this.r._darken(color, 0.32);
        ctx.beginPath();
        ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y);
        ctx.lineTo(c1x, c1y + faceDepthRight); ctx.lineTo(c0x, c0y + faceDepthRight);
        ctx.closePath(); ctx.fill();
      }
    }

    // Main hex top face
    ctx.beginPath();
    ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y); ctx.lineTo(c2x, c2y);
    ctx.lineTo(c3x, c3y); ctx.lineTo(c4x, c4y); ctx.lineTo(c5x, c5y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Territory tint (merged into single path — no second beginPath)
    if (tile.owner) {
      ctx.fillStyle = tile.owner === 'a' ? 'rgba(200,80,42,0.05)' : 'rgba(42,110,200,0.05)';
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
    if (this.r.zoom > 0.3) {
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 0.5;
      ctx.stroke(); // reuses same path
    }

    // Top-edge rim highlight — upper edges catch the light
    if (tileDepth > 0 && this.r.zoom >= 0.16) {
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth = Math.max(0.65, this.r.zoom * 1.05);
      ctx.beginPath();
      ctx.moveTo(c3x, c3y); ctx.lineTo(c4x, c4y);
      ctx.lineTo(c5x, c5y); ctx.lineTo(c0x, c0y);
      ctx.stroke();
    }

    // Detail sprites at high zoom
    if (this.r.zoom > 0.45) {
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
        ctx.lineWidth = 0.8 * this.r.zoom;
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
          ctx.arc(px, py, 1.2 * this.r.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Trees drawn on top of all other biome decor.
      // The treeMap only has entries for tiles that actually have trees, so this
      // lookup is O(1) and safe for every tile type.
      const tree = this.r._worldRef && this.r._worldRef.treeMap
        ? this.r._worldRef.treeMap[`${tx},${ty}`]
        : null;
      if (tree) {
        // Small deterministic jitter so trees don't sit dead-centre every tile.
        const tjx = Math.sin(tx * 73.1 + ty * 31.7) * sz * 0.22;
        const tjy = Math.cos(tx * 47.3 + ty * 61.1) * sz * vs * 0.15;
        this._drawTreeSprite(ctx, sx + tjx, sy - sz * vs * 0.5 + tjy, this.r.zoom, tree.growth,
          tree.biome !== undefined ? tree.biome : tile.type);
      }
    }

    // Resource indicators at medium+ zoom.
    // Only shown for tiles whose primary yield is >= 3 to avoid food cluttering
    // every grass/savanna tile.  Drawn as scattered small shapes, not text.
    if (this.r.zoom > 0.55) {
      const node = tile.resourceNode;
      const yieldEntry = CONFIG.TILE_YIELD[tile.type];
      if (node && yieldEntry) {
        const res = Object.keys(yieldEntry)[0];
        const yieldVal = res ? (yieldEntry[res] || 0) : 0;
        if (yieldVal >= 3 && node.amount >= node.max * 0.12) {
          this._drawResourceIndicators(ctx, sx, sy, sz, vs, res, node.amount / node.max, tx, ty);
        }
      }
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
  _drawResourceIndicators(ctx, sx, sy, sz, vs, res, fillFrac, tx, ty) {
    // Number of indicators scales with how full the resource node is.
    const count = 1 + Math.floor(fillFrac * 3);
    const alpha = 0.52 + fillFrac * 0.38;

    const colors = {
      food:  '#68cc30',
      metal: '#9ab4c8',
      stone: '#a89880',
      wood:  '#7a4a18',
    };
    ctx.fillStyle = colors[res] || '#aaa';
    ctx.globalAlpha = alpha;

    for (let i = 0; i < count; i++) {
      // Fibonacci-angle scatter for even spread; LCG hash for radius variation.
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
      const seed = (tx * 73 + ty * 31 + i * 17) | 0;
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
      const lcg  = ((seed * 1664525 + 1013904223) >>> 0) / 0xFFFFFFFF;
      const angle = i * 2.39996; // golden angle in radians
      const r = sz * (0.10 + lcg * 0.20);
      const ox = Math.sin(angle + tx * 0.7 + ty * 0.4) * r;
      const oy = Math.cos(angle + tx * 0.5 + ty * 0.6) * r * vs;

      if (res === 'food') {
        // Berry / grain: small filled circle
        ctx.beginPath();
        ctx.arc(sx + ox, sy + oy, sz * 0.06, 0, Math.PI * 2);
        ctx.fill();
      } else if (res === 'stone') {
        // Rock: small rounded square
        const h = sz * 0.06;
        ctx.beginPath();
        ctx.rect(sx + ox - h, sy + oy - h * 0.7, h * 2, h * 1.4);
        ctx.fill();
      } else if (res === 'metal') {
        // Ore vein: small diamond
        const d = sz * 0.065;
        ctx.beginPath();
        ctx.moveTo(sx + ox,         sy + oy - d);
        ctx.lineTo(sx + ox + d * 0.7, sy + oy);
        ctx.lineTo(sx + ox,         sy + oy + d);
        ctx.lineTo(sx + ox - d * 0.7, sy + oy);
        ctx.closePath();
        ctx.fill();
      } else {
        // Fallback: dot
        ctx.beginPath();
        ctx.arc(sx + ox, sy + oy, sz * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
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
  _getTileColor(tile, tribeAColor, tribeBColor) {
    const baseColors = {
      [CONFIG.TILE.WATER]:    '#1e3d5a',
      [CONFIG.TILE.GRASS]:    '#4a7a3a',
      [CONFIG.TILE.FOREST]:   '#2d5428',
      [CONFIG.TILE.MOUNTAIN]: '#6a6460',
      [CONFIG.TILE.STONE]:    '#7a7568',
      [CONFIG.TILE.DESERT]:   '#a09060',
      [CONFIG.TILE.SNOW]:     '#c8d0dc',
      [CONFIG.TILE.RUINS]:    '#6a5550',
      [CONFIG.TILE.WETLAND]:  '#4a7858',
      [CONFIG.TILE.JUNGLE]:   '#2a5a26',
      [CONFIG.TILE.SAVANNA]:  '#b8a050',
      [CONFIG.TILE.TUNDRA]:   '#808a94',
    };

    let base = baseColors[tile.type] || '#4a7a3a';

    // Altitude shading — higher elevation lightens the tile, lower darkens it.
    // Water tiles shade inversely: deeper (lower h) = darker blue.
    const elev = tile.elevation || 0;
    if (tile.type === CONFIG.TILE.WATER) {
      // Depth: h near 0 is darkest, h near 0.10 is the base water colour.
      const depth = Math.max(0, (0.10 - elev) / 0.10);
      base = this.r._darken(base, depth * 0.45);
    } else {
      // Land: normalise elevation across the land range [0.10, 1.0].
      const landElev = Math.max(0, (elev - 0.10) / 0.90);
      // Shift centred at 0.4 so midlands are unaffected; peaks lighten, valleys darken.
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
      const shade = (landElev - 0.40) * 0.36;
      if (shade > 0) {
        base = this.r._lighten(base, shade);
      } else if (shade < 0) {
        base = this.r._darken(base, -shade);
      }
    }

    if (tile.owner === 'a') base = this.r._blendColor(base, tribeAColor, 0.08);
    if (tile.owner === 'b') base = this.r._blendColor(base, tribeBColor, 0.08);
    return base;
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
  _drawTreeSprite(ctx, x, y, zoom, stage, biome) {
    const s = zoom * 5;
    const T = CONFIG.TILE;
    const bm = biome !== undefined ? biome : T.FOREST;

    if (bm === T.JUNGLE) {
      // ── Jungle: wide round canopy, vivid greens ───────────────────────
      const dark = '#0a4a08', mid = '#1a7018', light = '#2a8a20', trunk = '#4a2e0a';
      switch (stage) {
        case 1:
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 0.7, s * 0.7, 0, Math.PI * 2); ctx.fill();
          break;
        case 2:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.12, y - s * 0.3, s * 0.24, s * 0.6);
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 1.4, s * 1.0, 0, Math.PI * 2); ctx.fill();
          break;
        case 3:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.15, y, s * 0.3, s * 0.7);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 1.6, s * 1.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x - s * 0.5, y - s * 2.1, s * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + s * 0.5, y - s * 2.1, s * 0.8, 0, Math.PI * 2); ctx.fill();
          break;
        case 4:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.17, y, s * 0.34, s * 0.8);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 1.8, s * 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 2.6, s * 1.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath(); ctx.arc(x, y - s * 3.2, s * 0.7, 0, Math.PI * 2); ctx.fill();
          break;
        case 5: default:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.2, y, s * 0.4, s * 0.9);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 2.0, s * 1.9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x - s * 0.6, y - s * 3.1, s * 1.0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + s * 0.6, y - s * 3.1, s * 1.0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath(); ctx.arc(x, y - s * 3.7, s * 0.9, 0, Math.PI * 2); ctx.fill();
          break;
      }

    } else if (bm === T.WETLAND) {
      // ── Wetland/mangrove: wide low ellipse canopy, exposed root hint ──
      const dark = '#2a3a10', mid = '#3a5018', trunk = '#3a2a0a';
      ctx.fillStyle = trunk;
      ctx.fillRect(x - s * 0.1, y - s * 0.15, s * 0.2, s * (0.25 + stage * 0.08));
      if (stage >= 3) {
        // Root lines
        ctx.strokeStyle = trunk; ctx.lineWidth = s * 0.09;
        ctx.beginPath(); ctx.moveTo(x - s * 0.1, y + s * 0.3); ctx.lineTo(x - s * 0.52, y + s * 0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.3); ctx.lineTo(x + s * 0.52, y + s * 0.7); ctx.stroke();
      }
      const w = s * (0.55 + stage * 0.22), h = s * (0.22 + stage * 0.06);
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(x, y - s * (0.5 + stage * 0.18), w, h, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.ellipse(x, y - s * (0.7 + stage * 0.22), w * 0.7, h * 0.65, 0, 0, Math.PI * 2); ctx.fill();

    } else if (bm === T.SAVANNA) {
      // ── Savanna/acacia: thin trunk, wide flat umbrella canopy ────────
      const canopy = '#7a8a1a', light = '#9aaa2a', trunk = '#6a4a18';
      const th = s * (0.55 + stage * 0.18);
      ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.08, y - th * 0.05, s * 0.16, th);
      // Flat ellipse canopy — wider each stage
      const cw = s * (0.7 + stage * 0.28), ch = s * (0.18 + stage * 0.05);
      ctx.fillStyle = canopy;
      ctx.beginPath(); ctx.ellipse(x, y - th, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
      if (stage >= 3) {
        ctx.fillStyle = light;
        ctx.beginPath(); ctx.ellipse(x, y - th - ch * 0.6, cw * 0.65, ch * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      }

    } else if (bm === T.GRASS) {
      // ── Grassland deciduous: rounded full canopy ──────────────────────
      const dark = '#2a5a18', mid = '#3a7028', light = '#4a8a38', trunk = '#5a3a14';
      switch (stage) {
        case 1:
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 0.5, s * 0.55, 0, Math.PI * 2); ctx.fill();
          break;
        case 2:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.1, y - s * 0.15, s * 0.2, s * 0.45);
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 1.1, s * 0.8, 0, Math.PI * 2); ctx.fill();
          break;
        case 3:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.12, y, s * 0.24, s * 0.55);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 1.3, s * 1.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath(); ctx.arc(x, y - s * 1.8, s * 0.7, 0, Math.PI * 2); ctx.fill();
          break;
        case 4:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.14, y, s * 0.28, s * 0.65);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 1.5, s * 1.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 2.1, s * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 2.1, s * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath(); ctx.arc(x, y - s * 2.5, s * 0.65, 0, Math.PI * 2); ctx.fill();
          break;
        case 5: default:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.16, y, s * 0.32, s * 0.75);
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.arc(x, y - s * 1.8, s * 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x - s * 0.5, y - s * 2.6, s * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + s * 0.5, y - s * 2.6, s * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath(); ctx.arc(x, y - s * 3.1, s * 0.8, 0, Math.PI * 2); ctx.fill();
          break;
      }

    } else if (bm === T.TUNDRA) {
      // ── Tundra: stunted grey-green shrub (max growth 2) ───────────────
      const dark = '#4a5a40', mid = '#5a6a50', trunk = '#3a2a18';
      if (stage <= 1) {
        ctx.fillStyle = mid;
        ctx.beginPath(); ctx.arc(x, y - s * 0.38, s * 0.38, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.08, y - s * 0.1, s * 0.16, s * 0.3);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x + s * 0.5, y - s * 0.1); ctx.lineTo(x - s * 0.5, y - s * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 1.9); ctx.lineTo(x + s * 0.34, y - s * 0.8); ctx.lineTo(x - s * 0.34, y - s * 0.8);
        ctx.closePath(); ctx.fill();
      }

    } else {
      // ── Forest (default): layered conifer/pine, dark greens ───────────
      const dark = '#1a3a12', mid = '#2a5a1a', light = '#3a7028', trunk = '#4a2e0a';
      switch (stage) {
        case 1:
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.arc(x, y - s * 0.6, s * 0.55, 0, Math.PI * 2); ctx.fill();
          break;
        case 2:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.5);
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.8); ctx.lineTo(x + s * 0.6, y - s * 0.2); ctx.lineTo(x - s * 0.6, y - s * 0.2);
          ctx.closePath(); ctx.fill();
          break;
        case 3:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.14, y, s * 0.28, s * 0.6);
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 2.4); ctx.lineTo(x + s * 0.9, y - s * 0.6); ctx.lineTo(x - s * 0.9, y - s * 0.6);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 3.0); ctx.lineTo(x + s * 0.65, y - s * 1.4); ctx.lineTo(x - s * 0.65, y - s * 1.4);
          ctx.closePath(); ctx.fill();
          break;
        case 4:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.16, y, s * 0.32, s * 0.7);
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s, y); ctx.lineTo(x - s, y);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 3.2); ctx.lineTo(x + s * 0.68, y - s * 0.6); ctx.lineTo(x - s * 0.68, y - s * 0.6);
          ctx.closePath(); ctx.fill();
          break;
        case 5: default:
          ctx.fillStyle = trunk; ctx.fillRect(x - s * 0.18, y, s * 0.36, s * 0.8);
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 1.2, y + s * 0.1); ctx.lineTo(x - s * 1.2, y + s * 0.1);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 2.8); ctx.lineTo(x + s * 0.95, y - s * 0.9); ctx.lineTo(x - s * 0.95, y - s * 0.9);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 3.8); ctx.lineTo(x + s * 0.62, y - s * 2.2); ctx.lineTo(x - s * 0.62, y - s * 2.2);
          ctx.closePath(); ctx.fill();
          break;
      }
    }
  }

}

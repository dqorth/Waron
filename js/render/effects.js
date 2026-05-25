// Weather particles, fog overlay, battle line.
class EffectsRenderer {
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

  // ── Fog of war overlay ──────────────────────────────────────────────────
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
  _drawFogOverlay(ctx, world, fog) {
    if (!fog) return;

    const vb = this.r._getVisibleTileBounds(world);
    this.r._updateHexCorners();
    const corners = this.r._hexCorners;
    const sz = CONFIG.HEX_SIZE * this.r.zoom;

    for (let y = vb.yMin; y <= vb.yMax; y++) {
      for (let x = vb.xMin; x <= vb.xMax; x++) {
        const vis = fog.getVisibility(x, y);
        if (vis === FOG.VISIBLE) continue; // fully visible, no overlay

        const p = this.r._tileToScreen(x, y);
        const s = this.r._worldToScreen(p.sx, p.sy);
        if (!this.r._isOnScreen(s.x, s.y, sz * 4)) continue;

        const alpha = vis === FOG.UNEXPLORED ? 0.85 : 0.4; // explored = dimmed, unexplored = dark
        ctx.fillStyle = `rgba(8,6,14,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(s.x + corners[0].dx, s.y + corners[0].dy);
        for (let i = 1; i < 6; i++) ctx.lineTo(s.x + corners[i].dx, s.y + corners[i].dy);
        ctx.closePath();
        ctx.fill();
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
  _drawBattleLine() {
    const ctx = this.r.ctx;
    const midX = CONFIG.MAP_W / 2;
    const topTile = this.r._tileToScreen(midX, 0);
    const botTile = this.r._tileToScreen(midX, CONFIG.MAP_H);
    const top = this.r._worldToScreen(topTile.sx, topTile.sy);
    const bot = this.r._worldToScreen(botTile.sx, botTile.sy);
    ctx.strokeStyle = 'rgba(212,168,67,0.3)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    ctx.setLineDash([]);
  }

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
    const W = this.r.W || 1280; const H = this.r.H || 720;
    this.r._currentWeatherType = type;
    const wb = this.r._worldBounds || { minSx: -W, maxSx: W * 2, minSy: -H, maxSy: H * 1.5 };
    this.r._clouds = Array.from({ length: 30 }, () => {
      const layer = 0.72 + Math.random() * 0.24;
      return { wx: wb.minSx + Math.random() * (wb.maxSx - wb.minSx), wy: wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.45), r: 55 + Math.random() * 120, v: 0.15 + Math.random() * 0.35, a: 0.08 + Math.random() * 0.16, layer };
    });
    const rainCount = Math.floor((W * H) / 12000);
    this.r._rainDrops = Array.from({ length: rainCount }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 7 + Math.random() * 7, l: 8 + Math.random() * 10 }));
    const snowCount = Math.floor((W * H) / 16000);
    this.r._snowFlakes = Array.from({ length: snowCount }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 1.4, w: (Math.random() - 0.5) * 0.7, r: 1 + Math.random() * 2, p: Math.random() * Math.PI * 2 }));
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
    const grad = ctx.createLinearGradient(0, 0, 0, this.r.H);
    grad.addColorStop(0, top); grad.addColorStop(1, bottom);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, this.r.W, this.r.H);
    if (type === CONFIG.WEATHER.DROUGHT) { ctx.fillStyle = 'rgba(255,170,70,0.14)'; ctx.fillRect(0, 0, this.r.W, this.r.H); }
    if (type === CONFIG.WEATHER.STORM) { ctx.fillStyle = 'rgba(15,15,25,0.22)'; ctx.fillRect(0, 0, this.r.W, this.r.H); }
    if (type === CONFIG.WEATHER.FLOOD) { ctx.fillStyle = 'rgba(80,140,180,0.14)'; ctx.fillRect(0, this.r.H * 0.4, this.r.W, this.r.H * 0.6); }
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
    if (type !== this.r._currentWeatherType) this._initWeatherParticles(type);
    const wb = this.r._worldBounds || { minSx: -2000, maxSx: 2000, minSy: -1200, maxSy: 1200 };
    for (const c of this.r._clouds) { c.wx += c.v; if (c.wx - c.r > wb.maxSx + 400) { c.wx = wb.minSx - c.r - 300; c.wy = wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.5); } }
    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      for (const d of this.r._rainDrops) { d.x += 2.0; d.y += d.v; if (d.y > this.r.H + 20) { d.y = -20; d.x = Math.random() * this.r.W; } if (d.x > this.r.W + 20) d.x = -20; }
    }
    if (type === CONFIG.WEATHER.SNOW) {
      for (const f of this.r._snowFlakes) { f.p += 0.03; f.x += f.w + Math.sin(f.p) * 0.35; f.y += f.v; if (f.y > this.r.H + 8) { f.y = -8; f.x = Math.random() * this.r.W; } if (f.x < -8) f.x = this.r.W + 8; if (f.x > this.r.W + 8) f.x = -8; }
    }
    if (type === CONFIG.WEATHER.STORM) { if (this.r._lightningFlash > 0) this.r._lightningFlash -= 0.05; else if (Math.random() < 0.004) this.r._lightningFlash = 0.8; } else { this.r._lightningFlash = 0; }
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
    for (const c of this.r._clouds) {
      const cp = this.r._worldToScreenParallax(c.wx, c.wy, c.layer, c.layer * 0.88);
      if (!this.r._isOnScreen(cp.x, cp.y, c.r * this.r.zoom * 2.4)) continue;
      const r = c.r * this.r.zoom;
      ctx.fillStyle = `rgba(255,255,255,${c.a})`;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cp.x + r * 0.6, cp.y + r * 0.1, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cp.x - r * 0.6, cp.y + r * 0.12, r * 0.65, 0, Math.PI * 2); ctx.fill();
    }
    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      ctx.strokeStyle = type === CONFIG.WEATHER.STORM ? 'rgba(190,220,255,0.65)' : 'rgba(200,220,240,0.55)'; ctx.lineWidth = 1;
      for (const d of this.r._rainDrops) { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.35, d.y + d.l); ctx.stroke(); }
    }
    if (type === CONFIG.WEATHER.SNOW) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      for (const f of this.r._snowFlakes) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (type === CONFIG.WEATHER.DROUGHT) {
      ctx.strokeStyle = 'rgba(255,220,130,0.12)';
      for (let i = 0; i < 20; i++) { const y = (i / 20) * this.r.H; ctx.beginPath(); ctx.moveTo(0, y + Math.sin((Date.now() * 0.002) + i) * 2); ctx.lineTo(this.r.W, y + Math.sin((Date.now() * 0.002) + i + 1) * 2); ctx.stroke(); }
    }
    if (this.r._lightningFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.r._lightningFlash * 0.35})`; ctx.fillRect(0, 0, this.r.W, this.r.H); }
  }

}

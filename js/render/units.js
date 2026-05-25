// Unit sprites, visual seed, gait/purpose offset.
class UnitRenderer {
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
    const p = this.r._tileToScreen(vx, vy);
    const sPos = this.r._worldToScreen(p.sx, p.sy);
    if (!this.r._isOnScreen(sPos.x, sPos.y)) return;

    const ctx = this.r.ctx;
    const s = this.r.zoom;
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
    ctx.fillStyle = this.r._darken(color, 0.12);
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    if (s > 0.5) {
      ctx.strokeStyle = darkColor; ctx.lineWidth = 0.8 * s;
      ctx.beginPath(); ctx.moveTo(x, cy + r * 0.95); ctx.lineTo(x, cy + r * 2.1); ctx.stroke();
    }
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
    let gaitAmp = moving ? (0.018 / Math.max(0.25, this.r.zoom)) : (0.006 / Math.max(0.25, this.r.zoom));
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

}

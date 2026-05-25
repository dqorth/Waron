// Attack lines and tower beams.
class CombatRenderer {
  constructor(r) {
    this.r = r;
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
    const ctx = this.r.ctx;
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
      const p1 = this.r._tileToScreen(ux, uy); const s1 = this.r._worldToScreen(p1.sx, p1.sy);
      const p2 = this.r._tileToScreen(tx, ty); const s2 = this.r._worldToScreen(p2.sx, p2.sy);
      const color = u.tribe === 'a' ? 'rgba(220,100,60,0.85)' : 'rgba(60,130,220,0.85)';
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 * this.r.zoom;
      ctx.setLineDash([4 * this.r.zoom, 3 * this.r.zoom]);
      ctx.shadowColor = color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(s1.x, s1.y - 4 * this.r.zoom); ctx.lineTo(s2.x, s2.y - 4 * this.r.zoom); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      const aLen = 7 * this.r.zoom;
      ctx.save();
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y - 4 * this.r.zoom);
      ctx.lineTo(s2.x - aLen * Math.cos(angle - 0.4), s2.y - 4 * this.r.zoom - aLen * Math.sin(angle - 0.4));
      ctx.lineTo(s2.x - aLen * Math.cos(angle + 0.4), s2.y - 4 * this.r.zoom - aLen * Math.sin(angle + 0.4));
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
    const ctx = this.r.ctx;
    for (const tribe of [tribeA, tribeB]) {
      for (const tower of tribe.buildings) {
        if (tower.type !== CONFIG.ENTITY.TOWER || !tower.attackTarget) continue;
        const p1 = this.r._tileToScreen(tower.x, tower.y); const s1 = this.r._worldToScreen(p1.sx, p1.sy);
        const tx = tower.attackTarget.x; const ty = tower.attackTarget.y;
        const p2 = this.r._tileToScreen(tx, ty); const s2 = this.r._worldToScreen(p2.sx, p2.sy);
        const col = tribe.id === 'a' ? 'rgba(255,160,60,0.9)' : 'rgba(80,180,255,0.9)';
        const th = this.r.TH * this.r.zoom;
        ctx.save();
        ctx.strokeStyle = col; ctx.lineWidth = 2.0 * this.r.zoom; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(s1.x, s1.y - th * 2.5); ctx.lineTo(s2.x, s2.y - 4 * this.r.zoom); ctx.stroke();
        ctx.lineWidth = 1 * this.r.zoom;
        ctx.beginPath(); ctx.arc(s2.x, s2.y - 4 * this.r.zoom, 4 * this.r.zoom, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

}

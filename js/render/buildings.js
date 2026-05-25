// Building sprites.
class BuildingRenderer {
  constructor(r) {
    this.r = r;
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
    const p = this.r._tileToScreen(entity.x, entity.y);
    const sPos = this.r._worldToScreen(p.sx, p.sy);
    if (!this.r._isOnScreen(sPos.x, sPos.y)) return;

    const ctx = this.r.ctx;
    const tw = this.r.TW * this.r.zoom;
    const th = this.r.TH * this.r.zoom;
    const s = this.r.zoom;

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
      ctx.fillStyle = this.r._darken(lightColor, 0.13);
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
    ctx.fillStyle = this.r._darken(color, 0.1);
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
    ctx.fillStyle = this.r._darken(color, 0.08);
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
    ctx.fillStyle = this.r._darken(color, 0.18);
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
      ctx.fillStyle = this.r._darken(color, 0.22);
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
    ctx.fillStyle = this.r._darken(lightColor, 0.08); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.08, th * 0.11 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.06, y - h); ctx.lineTo(x, y - h - th * 0.45); ctx.lineTo(x + w / 2 + th * 0.06, y - h);
    ctx.closePath(); ctx.fill();
    if (s > 0.5) {
      ctx.fillStyle = this.r._darken(color, 0.15);
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
    ctx.fillStyle = this.r._darken(color, 0.15); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor; ctx.fillRect(x + w / 2, y - h + th * 0.04, th * 0.08 * s, h);
    const mW = w / 8; const mH = th * 0.16;
    ctx.fillStyle = this.r._darken(color, 0.30);
    for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + i * mW * 2, y - h - mH, mW, mH);
  }

}

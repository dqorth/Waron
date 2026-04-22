class Renderer {
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

    this._clouds = [];
    this._rainDrops = [];
    this._snowFlakes = [];
    this._currentWeatherType = CONFIG.WEATHER.SUNSHINE;
    this._lightningFlash = 0;

    this._setupEvents();
    this._resize();
    this._initWeatherParticles(this._currentWeatherType);
    window.addEventListener('resize', () => this._resize());
  }

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
  }

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

    c.addEventListener('mouseup', () => {
      this._drag = false;
    });

    c.addEventListener('mouseleave', () => {
      this._drag = false;
      this._mouseX = -9999;
      this._mouseY = -9999;
    });

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(CONFIG.CAM_ZOOM_MIN, Math.min(CONFIG.CAM_ZOOM_MAX, this.zoom * zoomDelta));
    }, { passive: false });
  }

  _tileToScreen(tx, ty) {
    const sz = CONFIG.HEX_SIZE;
    const vs = CONFIG.HEX_V_SCALE;
    const sq3 = Math.sqrt(3);

    const sx = tx * sz * 1.5;
    const col0 = Math.floor(tx);
    const frac = tx - col0;
    const off0 = (col0 % 2 !== 0) ? 0.5 : 0.0;
    const off1 = ((col0 + 1) % 2 !== 0) ? 0.5 : 0.0;
    const off = off0 + (off1 - off0) * frac;
    const sy = (ty + off) * sq3 * sz * vs;

    return { sx, sy };
  }

  _worldToScreen(sx, sy) {
    return {
      x: (sx - this.camX) * this.zoom + this.W / 2,
      y: (sy - this.camY) * this.zoom + this.H / 2,
    };
  }

  _worldToScreenParallax(sx, sy, px, py = px) {
    return {
      x: (sx - this.camX * px) * this.zoom + this.W / 2,
      y: (sy - this.camY * py) * this.zoom + this.H / 2,
    };
  }

  _screenToWorld(x, y) {
    return {
      sx: (x - this.W / 2) / this.zoom + this.camX,
      sy: (y - this.H / 2) / this.zoom + this.camY,
    };
  }

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

  _isOnScreen(x, y, margin = 100) {
    return x > -margin && x < this.W + margin && y > -margin && y < this.H + margin;
  }

  _findHoveredEntity(mx, my, tribeA, tribeB) {
    let best = null;
    let bestDist = Infinity;

    const all = [
      ...tribeA.buildings, ...tribeB.buildings,
      ...tribeA.units, ...tribeB.units,
    ];

    for (const e of all) {
      const ex = (e._lx ?? e.x) + (e._ox || 0);
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

  _drawTooltip(entity) {
    if (!entity) return;

    const ex = (entity._lx ?? entity.x) + (entity._ox || 0);
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

  _drawResourceIcon(ctx, x, y, tile, zoom) {
    if (!tile.resourceNode || zoom < 0.55) return;
    const node = tile.resourceNode;
    if (node.amount < 5) return;

    const frac = node.amount / node.max;
    const th = this.TH * zoom;
    const icons = { food: '#', wood: 'W', metal: 'M', stone: 'S' };
    const colors = { food: '#88dd44', wood: '#5a3a10', metal: '#aabbcc', stone: '#9988aa' };

    const res = Object.keys(CONFIG.TILE_YIELD[tile.type] || {})[0];
    if (!res) return;

    ctx.globalAlpha = 0.55 + frac * 0.45;
    ctx.fillStyle = colors[res] || '#fff';
    ctx.font = `bold ${Math.round(7 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[res] || '?', x, y - th * 0.35);
    ctx.globalAlpha = 1;
  }

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

  _blendColor(c1, c2, t) {
    const p1 = this._parseColor(c1);
    const p2 = this._parseColor(c2);
    const r = Math.round(p1[0] + (p2[0] - p1[0]) * t);
    const g = Math.round(p1[1] + (p2[1] - p1[1]) * t);
    const b = Math.round(p1[2] + (p2[2] - p1[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

  _parseColor(color) {
    const hex = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];

    const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (rgb) return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];

    return [128, 128, 128];
  }

  _darken(color, factor) {
    const [r, g, b] = this._parseColor(color);
    return `rgb(${Math.round(r * (1 - factor))},${Math.round(g * (1 - factor))},${Math.round(b * (1 - factor))})`;
  }

  _drawTile(tx, ty, tile) {
    const p = this._tileToScreen(tx, ty);
    const s = this._worldToScreen(p.sx, p.sy);
    const sz = CONFIG.HEX_SIZE * this.zoom;
    const vs = CONFIG.HEX_V_SCALE;

    if (!this._isOnScreen(s.x, s.y, sz * 4)) return;

    const ctx = this.ctx;
    const color = this._getTileColor(tile, '#c8502a', '#2a6ec8');

    const corners = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      corners.push({ x: s.x + sz * Math.cos(a), y: s.y + sz * Math.sin(a) * vs });
    }

    // LOD: simplified tile path for far zoom-out.
    if (this.zoom < 0.18) {
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (tile.owner) {
        ctx.fillStyle = tile.owner === 'a' ? 'rgba(200,80,42,0.08)' : 'rgba(42,110,200,0.08)';
        ctx.fill();
      }
      return;
    }

    const depthY = sz * vs * (
      tile.type === CONFIG.TILE.MOUNTAIN ? 0.75 :
      tile.type === CONFIG.TILE.STONE ? 0.42 :
      tile.type === CONFIG.TILE.TUNDRA ? 0.25 :
      tile.type === CONFIG.TILE.WATER ? 0.0 : 0.18
    );

    if (depthY > 0) {
      ctx.beginPath();
      ctx.moveTo(corners[3].x, corners[3].y);
      ctx.lineTo(corners[4].x, corners[4].y);
      ctx.lineTo(corners[4].x, corners[4].y + depthY);
      ctx.lineTo(corners[3].x, corners[3].y + depthY);
      ctx.closePath();
      ctx.fillStyle = this._darken(color, 0.45);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(corners[4].x, corners[4].y);
      ctx.lineTo(corners[5].x, corners[5].y);
      ctx.lineTo(corners[5].x, corners[5].y + depthY);
      ctx.lineTo(corners[4].x, corners[4].y + depthY);
      ctx.closePath();
      ctx.fillStyle = this._darken(color, 0.3);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(corners[5].x, corners[5].y);
      ctx.lineTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[0].x, corners[0].y + depthY);
      ctx.lineTo(corners[5].x, corners[5].y + depthY);
      ctx.closePath();
      ctx.fillStyle = this._darken(color, 0.18);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    if (tile.owner) {
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fillStyle = tile.owner === 'a' ? 'rgba(200,80,42,0.12)' : 'rgba(42,110,200,0.12)';
      ctx.fill();
    }

    if (tile.road && this.zoom > 0.18) {
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,180,120,0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(155,120,75,0.6)';
      ctx.lineWidth = sz * 0.08;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (this.zoom > 0.4) {
      if (tile.type === CONFIG.TILE.FOREST || tile.type === CONFIG.TILE.JUNGLE) {
        const tree = this._worldRef && this._worldRef.treeMap
          ? this._worldRef.treeMap[`${tx},${ty}`]
          : null;
        if (tree) {
          this._drawTreeSprite(ctx, s.x, s.y - sz * vs * 0.5, this.zoom, tree.growth,
            tile.type === CONFIG.TILE.JUNGLE);
        }
      }

      if (tile.type === CONFIG.TILE.MOUNTAIN) {
        ctx.fillStyle = '#e8eef4';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - sz * vs * 2.8);
        ctx.lineTo(s.x + sz * 0.28, s.y - sz * vs * 1.5);
        ctx.lineTo(s.x - sz * 0.28, s.y - sz * vs * 1.5);
        ctx.closePath();
        ctx.fill();
      }

      if (tile.type === CONFIG.TILE.WETLAND) {
        ctx.strokeStyle = 'rgba(100,160,210,0.5)';
        ctx.lineWidth = 0.8 * this.zoom;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(s.x + (i - 0.5) * sz * 0.4, s.y + sz * vs * (i * 0.3 - 0.1), sz * 0.22, 0, Math.PI);
          ctx.stroke();
        }
      }

      if (tile.type === CONFIG.TILE.SNOW || tile.type === CONFIG.TILE.TUNDRA) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 3; i++) {
          const px = s.x + (Math.sin(tx * 31 + ty * 17 + i * 7) * 0.38) * sz;
          const py = s.y + (Math.cos(tx * 13 + ty * 23 + i * 11) * 0.28) * sz * vs;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 * this.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    this._drawResourceIcon(ctx, s.x, s.y, tile, this.zoom);
  }

  // 5-stage tree sprite. Stage 1=seedling … Stage 5=full-grown canopy tree.
  _drawTreeSprite(ctx, x, y, zoom, stage, isJungle = false) {
    const s = zoom * 5;
    const darkCol  = isJungle ? '#0a4a08' : '#1a3a12';
    const midCol   = isJungle ? '#1a7018' : '#2a5a1a';
    const lightCol = isJungle ? '#2a8a20' : '#3a7028';
    const trunkCol = '#4a2e0a';

    switch (stage) {
      case 1: // Seedling: small green circle
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.arc(x, y - s * 0.6, s * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 2: // Sapling: small triangle + thin trunk
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.5);
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x,          y - s * 1.8);
        ctx.lineTo(x + s * 0.6, y - s * 0.2);
        ctx.lineTo(x - s * 0.6, y - s * 0.2);
        ctx.closePath();
        ctx.fill();
        break;

      case 3: // Young tree: medium two-tier canopy
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.14, y, s * 0.28, s * 0.6);
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x,           y - s * 2.4);
        ctx.lineTo(x + s * 0.9, y - s * 0.6);
        ctx.lineTo(x - s * 0.9, y - s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x,           y - s * 3.0);
        ctx.lineTo(x + s * 0.65, y - s * 1.4);
        ctx.lineTo(x - s * 0.65, y - s * 1.4);
        ctx.closePath();
        ctx.fill();
        break;

      case 4: // Mature tree (original sprite)
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.16, y, s * 0.32, s * 0.7);
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x,        y - s * 2.2);
        ctx.lineTo(x + s,    y);
        ctx.lineTo(x - s,    y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x,           y - s * 3.2);
        ctx.lineTo(x + s * 0.68, y - s * 0.6);
        ctx.lineTo(x - s * 0.68, y - s * 0.6);
        ctx.closePath();
        ctx.fill();
        break;

      case 5: // Full-grown: wide 3-tier canopy
      default:
        ctx.fillStyle = trunkCol;
        ctx.fillRect(x - s * 0.18, y, s * 0.36, s * 0.8);
        // Lower broad layer
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.moveTo(x,            y - s * 1.6);
        ctx.lineTo(x + s * 1.2,  y + s * 0.1);
        ctx.lineTo(x - s * 1.2,  y + s * 0.1);
        ctx.closePath();
        ctx.fill();
        // Mid layer
        ctx.fillStyle = midCol;
        ctx.beginPath();
        ctx.moveTo(x,            y - s * 2.8);
        ctx.lineTo(x + s * 0.95, y - s * 0.9);
        ctx.lineTo(x - s * 0.95, y - s * 0.9);
        ctx.closePath();
        ctx.fill();
        // Top tip
        ctx.fillStyle = lightCol;
        ctx.beginPath();
        ctx.moveTo(x,            y - s * 3.8);
        ctx.lineTo(x + s * 0.62, y - s * 2.2);
        ctx.lineTo(x - s * 0.62, y - s * 2.2);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

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
      case CONFIG.ENTITY.CAPITOL:
        this._drawCapitol(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.FORT:
        this._drawFort(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.BARRACKS:
        this._drawBarracks(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.FARM:
        this._drawFarm(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor, entity);
        break;
      case CONFIG.ENTITY.TOWER:
        this._drawTower(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.HOME:
        this._drawHome(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.STOREHOUSE:
        this._drawStorehouse(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
      case CONFIG.ENTITY.WALL:
        this._drawWall(ctx, sPos.x, sPos.y, tw, th, s, color, darkColor, lightColor, roofColor);
        break;
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

  _drawCapitol(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.6;
    const h = th * 2.0;
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
    ctx.beginPath();
    ctx.ellipse(x, y - h, w * 0.33, th * 0.56, 0, Math.PI, 0);
    ctx.fill();
  }

  _drawFort(ctx, x, y, tw, th, s, color, darkColor) {
    const w = tw * 0.62;
    const h = th * 1.35;
    const tW = w * 0.18;
    const tH = h + th * 0.18;

    ctx.fillStyle = this._darken(color, 0.1);
    ctx.fillRect(x - w / 2 - tW * 0.4, y - tH, tW, tH);
    ctx.fillRect(x + w / 2 - tW * 0.6, y - tH, tW, tH);

    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.13 * s, h);

    const mW = w / 9;
    const mH = th * 0.22;
    for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2 + i * mW * 2, y - h - mH, mW, mH);
  }

  _drawBarracks(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.52;
    const h = th * 1.0;

    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.04, y - h);
    ctx.lineTo(x, y - h - th * 0.38);
    ctx.lineTo(x + w / 2 + th * 0.04, y - h);
    ctx.closePath();
    ctx.fill();

    if (s > 0.45) {
      ctx.strokeStyle = lightColor;
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - h - th * 0.38);
      ctx.lineTo(x, y - h - th * 0.8);
      ctx.stroke();

      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.moveTo(x, y - h - th * 0.8);
      ctx.lineTo(x + th * 0.3, y - h - th * 0.68);
      ctx.lineTo(x, y - h - th * 0.56);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawFarm(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor, entity) {
    const size = entity ? (entity.size || 1) : 1;
    const lv = entity ? (entity.level || 1) : 1;
    const sizeScale = 1 + (size - 1) * 0.26;
    const w = tw * 0.5 * sizeScale;
    const h = th * 0.88 * (1 + (lv - 1) * 0.06);
    const sW = w * 0.2;
    const sH = h * 0.75;

    if (s > 0.22) {
      const fieldW = w * 1.5;
      const fieldH = th * (0.38 + size * 0.07);
      ctx.fillStyle = 'rgba(140,120,60,0.25)';
      ctx.fillRect(x - fieldW / 2, y - th * 0.2, fieldW, fieldH);
      ctx.strokeStyle = 'rgba(90,75,40,0.3)';
      ctx.lineWidth = 0.8 * s;
      const furrows = 2 + size;
      for (let i = 0; i < furrows; i++) {
        const fy = y - th * 0.2 + (i / furrows) * fieldH;
        ctx.beginPath();
        ctx.moveTo(x - fieldW / 2, fy);
        ctx.lineTo(x + fieldW / 2, fy);
        ctx.stroke();
      }
    }

    const s1x = x - w / 2 - sW * 0.3;
    const s2x = x + w / 2 - sW * 0.7;
    ctx.fillStyle = this._darken(color, 0.08);
    ctx.fillRect(s1x, y - sH, sW, sH);
    ctx.fillRect(s2x, y - sH, sW, sH);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.ellipse(s1x + sW / 2, y - sH, sW / 2, sW * 0.22, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s2x + sW / 2, y - sH, sW / 2, sW * 0.22, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.ellipse(x, y - h, w / 2, th * 0.28, 0, Math.PI, 0);
    ctx.fill();

    if (s > 0.5) {
      const dW = w * 0.24;
      const dH = th * 0.28;
      ctx.fillStyle = darkColor;
      ctx.fillRect(x - dW / 2, y - dH, dW, dH);
      ctx.beginPath();
      ctx.arc(x, y - dH, dW / 2, Math.PI, 0);
      ctx.fill();
    }
  }

  _drawTower(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.22;
    const h = th * 2.3;

    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.1, th * 0.1 * s, h);

    if (s > 0.55) {
      const slW = w * 0.18;
      const slH = th * 0.18;
      ctx.fillStyle = darkColor;
      ctx.fillRect(x - slW / 2, y - h * 0.72, slW, slH);
      ctx.fillRect(x - slW / 2, y - h * 0.42, slW, slH);
    }

    ctx.fillStyle = this._darken(color, 0.18);
    ctx.fillRect(x - w * 0.75, y - h, w * 1.5, th * 0.07);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x, y - h - th * 0.95);
    ctx.lineTo(x + w * 0.75, y - h);
    ctx.lineTo(x - w * 0.75, y - h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y - h - th * 0.95);
    ctx.lineTo(x + w * 0.2, y - h);
    ctx.lineTo(x, y - h);
    ctx.closePath();
    ctx.fill();
  }

  _drawHome(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.36;
    const h = th * 1.02;

    ctx.fillStyle = lightColor;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.07, th * 0.07 * s, h);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.04, y - h);
    ctx.lineTo(x, y - h - th * 0.52);
    ctx.lineTo(x + w / 2 + th * 0.04, y - h);
    ctx.closePath();
    ctx.fill();

    if (s > 0.45) {
      const chiW = w * 0.2;
      const chiH = th * 0.38;
      ctx.fillStyle = this._darken(color, 0.22);
      ctx.fillRect(x + w * 0.15, y - h - chiH, chiW, chiH + th * 0.1);

      if (s > 0.75) {
        const chimneyX = x + w * 0.15 + chiW / 2;
        ctx.fillStyle = 'rgba(210,210,210,0.28)';
        ctx.beginPath();
        ctx.arc(chimneyX, y - h - chiH - 2.5 * s, 2.0 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(chimneyX + s, y - h - chiH - 5.0 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawStorehouse(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) {
    const w = tw * 0.56;
    const h = th * 1.18;

    ctx.fillStyle = this._darken(lightColor, 0.08);
    ctx.fillRect(x - w / 2, y - h, w, h);

    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.08, th * 0.11 * s, h);

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - th * 0.06, y - h);
    ctx.lineTo(x, y - h - th * 0.45);
    ctx.lineTo(x + w / 2 + th * 0.06, y - h);
    ctx.closePath();
    ctx.fill();

    if (s > 0.5) {
      ctx.fillStyle = this._darken(color, 0.15);
      ctx.fillRect(x - w * 0.18, y - h * 0.52, w * 0.36, th * 0.26);
      ctx.strokeStyle = '#c9a66b';
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < 3; i++) {
        const yy = y - h * 0.52 + i * (th * 0.09);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.18, yy);
        ctx.lineTo(x + w * 0.18, yy);
        ctx.stroke();
      }
    }
  }

  _drawWall(ctx, x, y, tw, th, s, color, darkColor) {
    const w = tw * 0.68;
    const h = th * 0.58;

    ctx.fillStyle = this._darken(color, 0.15);
    ctx.fillRect(x - w / 2, y - h, w, h);

    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w / 2, y - h + th * 0.04, th * 0.08 * s, h);

    const mW = w / 8;
    const mH = th * 0.16;
    ctx.fillStyle = this._darken(color, 0.30);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x - w / 2 + i * mW * 2, y - h - mH, mW, mH);
    }
  }

  _drawUnit(entity) {
    const vx = (entity._lx ?? entity.x) + (entity._ox || 0);
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
      case CONFIG.ENTITY.WARRIOR:
        this._drawWarrior(ctx, sPos.x, sPos.y, s, color, darkColor);
        break;
      case CONFIG.ENTITY.WORKER:
        this._drawWorker(ctx, sPos.x, sPos.y, s, color, darkColor);
        break;
      case CONFIG.ENTITY.SCOUT:
        this._drawScout(ctx, sPos.x, sPos.y, s, color, darkColor);
        break;
      case CONFIG.ENTITY.LEADER:
        this._drawLeader(ctx, sPos.x, sPos.y, s, color, darkColor);
        break;
      case CONFIG.ENTITY.NORMAL:
        this._drawNormal(ctx, sPos.x, sPos.y, s, color, darkColor);
        break;
      default:
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sPos.x, sPos.y - 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    if (entity.state === 'fighting') {
      const pulseR = (entity.type === CONFIG.ENTITY.LEADER ? 7 : 5) * s;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(sPos.x, sPos.y - pulseR, pulseR + 3 * s * (0.5 + 0.5 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (entity._underFire && entity._underFire > 0) {
      const r = (entity.type === CONFIG.ENTITY.LEADER ? 6.5 : 4.5) * s;
      ctx.save();
      ctx.strokeStyle = `rgba(255,80,80,${entity._underFire / 4})`;
      ctx.lineWidth = 2.5 * s;
      ctx.shadowColor = '#ff3030';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sPos.x, sPos.y - r, r + 3 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const hpFrac = entity.hp / entity.maxHp;
    if (hpFrac < 1 && s > 0.45) {
      const bw = 10 * s;
      const barY = sPos.y - (entity.type === CONFIG.ENTITY.LEADER ? 14 : 11) * s;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sPos.x - bw / 2, barY, bw, 2.5 * s);
      ctx.fillStyle = hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(sPos.x - bw / 2, barY, bw * hpFrac, 2.5 * s);
    }
  }

  _drawWarrior(ctx, x, y, s, color, darkColor) {
    const r = 5.0 * s;
    const cy = y - r * 1.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();

    if (s > 0.45) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(x, cy - r * 0.52);
      ctx.lineTo(x, cy + r * 0.52);
      ctx.moveTo(x - r * 0.38, cy - r * 0.08);
      ctx.lineTo(x + r * 0.38, cy - r * 0.08);
      ctx.stroke();
    }
  }

  _drawWorker(ctx, x, y, s, color, darkColor) {
    const r = 4.5 * s;
    const cy = y - r;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, cy - r);
    ctx.lineTo(x + r, cy);
    ctx.lineTo(x, cy + r);
    ctx.lineTo(x - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.0 * s;
    ctx.stroke();
  }

  _drawScout(ctx, x, y, s, color, darkColor) {
    const r = 4.0 * s;
    const cy = y - r;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, cy - r);
    ctx.lineTo(x + r * 0.78, cy + r * 0.7);
    ctx.lineTo(x - r * 0.78, cy + r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.0 * s;
    ctx.stroke();
  }

  _drawLeader(ctx, x, y, s, color, darkColor) {
    const r = 6.5 * s;
    const cy = y - r * 1.25;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,220,100,0.45)';
    ctx.lineWidth = 1.0 * s;
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    if (s > 0.4) {
      const crownY = cy - r;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, crownY);
      ctx.lineTo(x - r * 0.5, crownY - r * 0.5);
      ctx.lineTo(x - r * 0.15, crownY - r * 0.25);
      ctx.lineTo(x, crownY - r * 0.6);
      ctx.lineTo(x + r * 0.15, crownY - r * 0.25);
      ctx.lineTo(x + r * 0.5, crownY - r * 0.5);
      ctx.lineTo(x + r * 0.5, crownY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b8900a';
      ctx.lineWidth = 0.6 * s;
      ctx.stroke();
    }
  }

  _drawNormal(ctx, x, y, s, color, darkColor) {
    const r = 3.2 * s;
    const cy = y - r * 1.0;
    ctx.fillStyle = this._darken(color, 0.12);
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (s > 0.5) {
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(x, cy + r * 0.95);
      ctx.lineTo(x, cy + r * 2.1);
      ctx.stroke();
    }
  }

  _drawBattleLine() {
    const ctx = this.ctx;
    const midX = CONFIG.MAP_W / 2;
    const topTile = this._tileToScreen(midX, 0);
    const botTile = this._tileToScreen(midX, CONFIG.MAP_H);
    const top = this._worldToScreen(topTile.sx, topTile.sy);
    const bot = this._worldToScreen(botTile.sx, botTile.sy);

    ctx.strokeStyle = 'rgba(212,168,67,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _initWeatherParticles(type = CONFIG.WEATHER.SUNSHINE) {
    const W = this.W || 1280;
    const H = this.H || 720;
    this._currentWeatherType = type;

    const wb = this._worldBounds || { minSx: -W, maxSx: W * 2, minSy: -H, maxSy: H * 1.5 };
    const cloudCount = 30;
    this._clouds = Array.from({ length: cloudCount }, () => {
      const layer = 0.72 + Math.random() * 0.24;
      return {
        wx: wb.minSx + Math.random() * (wb.maxSx - wb.minSx),
        wy: wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.45),
        r: 55 + Math.random() * 120,
        v: 0.15 + Math.random() * 0.35,
        a: 0.08 + Math.random() * 0.16,
        layer,
      };
    });

    const rainCount = Math.floor((W * H) / 12000);
    this._rainDrops = Array.from({ length: rainCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 7 + Math.random() * 7,
      l: 8 + Math.random() * 10,
    }));

    const snowCount = Math.floor((W * H) / 16000);
    this._snowFlakes = Array.from({ length: snowCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 0.6 + Math.random() * 1.4,
      w: (Math.random() - 0.5) * 0.7,
      r: 1 + Math.random() * 2,
      p: Math.random() * Math.PI * 2,
    }));
  }

  _drawWeatherBackground(ctx, weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;

    const presets = {
      [CONFIG.WEATHER.SUNSHINE]: ['#6fb9ff', '#d7ecff'],
      [CONFIG.WEATHER.OVERCAST]: ['#70879f', '#c8d4df'],
      [CONFIG.WEATHER.RAIN]: ['#51657d', '#8ea3b7'],
      [CONFIG.WEATHER.STORM]: ['#2a3448', '#5c667a'],
      [CONFIG.WEATHER.SNOW]: ['#7b93aa', '#dce7f2'],
      [CONFIG.WEATHER.DROUGHT]: ['#bb8e53', '#e0c590'],
      [CONFIG.WEATHER.FLOOD]: ['#3f6b86', '#8db2c7'],
    };

    const [top, bottom] = presets[type] || presets[CONFIG.WEATHER.SUNSHINE];
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    if (type === CONFIG.WEATHER.DROUGHT) {
      ctx.fillStyle = 'rgba(255,170,70,0.14)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (type === CONFIG.WEATHER.STORM) {
      ctx.fillStyle = 'rgba(15,15,25,0.22)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (type === CONFIG.WEATHER.FLOOD) {
      ctx.fillStyle = 'rgba(80,140,180,0.14)';
      ctx.fillRect(0, this.H * 0.4, this.W, this.H * 0.6);
    }
  }

  _updateWeatherParticles(weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;
    if (type !== this._currentWeatherType) this._initWeatherParticles(type);

    const wb = this._worldBounds || { minSx: -2000, maxSx: 2000, minSy: -1200, maxSy: 1200 };

    for (const c of this._clouds) {
      c.wx += c.v;
      if (c.wx - c.r > wb.maxSx + 400) {
        c.wx = wb.minSx - c.r - 300;
        c.wy = wb.minSy + Math.random() * Math.max(40, (wb.maxSy - wb.minSy) * 0.5);
      }
    }

    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      for (const d of this._rainDrops) {
        d.x += 2.0;
        d.y += d.v;
        if (d.y > this.H + 20) {
          d.y = -20;
          d.x = Math.random() * this.W;
        }
        if (d.x > this.W + 20) d.x = -20;
      }
    }

    if (type === CONFIG.WEATHER.SNOW) {
      for (const f of this._snowFlakes) {
        f.p += 0.03;
        f.x += f.w + Math.sin(f.p) * 0.35;
        f.y += f.v;
        if (f.y > this.H + 8) {
          f.y = -8;
          f.x = Math.random() * this.W;
        }
        if (f.x < -8) f.x = this.W + 8;
        if (f.x > this.W + 8) f.x = -8;
      }
    }

    if (type === CONFIG.WEATHER.STORM) {
      if (this._lightningFlash > 0) {
        this._lightningFlash -= 0.05;
      } else if (Math.random() < 0.004) {
        this._lightningFlash = 0.8;
      }
    } else {
      this._lightningFlash = 0;
    }
  }

  _drawWeatherParticles(ctx, weather) {
    const type = weather?.type || CONFIG.WEATHER.SUNSHINE;

    for (const c of this._clouds) {
      const cp = this._worldToScreenParallax(c.wx, c.wy, c.layer, c.layer * 0.88);
      if (!this._isOnScreen(cp.x, cp.y, c.r * this.zoom * 2.4)) continue;
      const r = c.r * this.zoom;
      ctx.fillStyle = `rgba(255,255,255,${c.a})`;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cp.x + r * 0.6, cp.y + r * 0.1, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cp.x - r * 0.6, cp.y + r * 0.12, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    if (type === CONFIG.WEATHER.RAIN || type === CONFIG.WEATHER.STORM || type === CONFIG.WEATHER.FLOOD) {
      ctx.strokeStyle = type === CONFIG.WEATHER.STORM ? 'rgba(190,220,255,0.65)' : 'rgba(200,220,240,0.55)';
      ctx.lineWidth = 1;
      for (const d of this._rainDrops) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.l * 0.35, d.y + d.l);
        ctx.stroke();
      }
    }

    if (type === CONFIG.WEATHER.SNOW) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      for (const f of this._snowFlakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (type === CONFIG.WEATHER.DROUGHT) {
      ctx.strokeStyle = 'rgba(255,220,130,0.12)';
      for (let i = 0; i < 20; i++) {
        const y = (i / 20) * this.H;
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin((Date.now() * 0.002) + i) * 2);
        ctx.lineTo(this.W, y + Math.sin((Date.now() * 0.002) + i + 1) * 2);
        ctx.stroke();
      }
    }

    if (this._lightningFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this._lightningFlash * 0.35})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _unitVisualSeed(u) {
    if (u._visSeed !== undefined) return u._visSeed;
    const idPart = (u.id || 0) * 131;
    const tribePart = (u.tribe === 'a' ? 17 : 29) * 37;
    const typePart = (u.type || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 13;
    const n = (idPart + tribePart + typePart) % 10007;
    u._visSeed = n;
    return n;
  }

  _computePurposeOffset(u, moving, mdx, mdy) {
    const seed = this._unitVisualSeed(u);
    const lane = ((seed % 3) - 1); // -1,0,1
    const sign = (seed % 2 === 0) ? 1 : -1;

    let nx = 0;
    let ny = 0;
    const mLen = Math.hypot(mdx, mdy);
    if (mLen > 0.0001) {
      nx = mdx / mLen;
      ny = mdy / mLen;
    } else if (u.targetX !== undefined && u.targetY !== undefined) {
      const tx = u.targetX - (u._lx ?? u.x);
      const ty = u.targetY - (u._ly ?? u.y);
      const tLen = Math.hypot(tx, ty);
      if (tLen > 0.0001) {
        nx = tx / tLen;
        ny = ty / tLen;
      }
    }

    // Perpendicular for lane/strafe offsets.
    const px = -ny;
    const py = nx;

    let forward = moving ? 0.10 : 0.03;
    let side = 0;
    let stanceSpeed = moving ? 0.22 : 0.08;
    let gaitAmp = moving ? (0.018 / Math.max(0.25, this.zoom)) : (0.006 / Math.max(0.25, this.zoom));

    switch (u.state) {
      case 'marching':
        forward = 0.20;
        side = lane * 0.085;
        stanceSpeed = 0.27;
        gaitAmp *= 1.20;
        break;
      case 'patrolling':
        forward = 0.16;
        side = Math.sin((u._stanceP || 0) * 0.9 + seed * 0.01) * 0.06;
        stanceSpeed = 0.24;
        gaitAmp *= 1.10;
        break;
      case 'fighting':
        forward = 0.06;
        side = sign * 0.08;
        stanceSpeed = 0.30;
        gaitAmp *= 0.85;
        break;
      case 'working':
      case 'working_farm':
        forward = 0.08;
        side = lane * 0.05;
        stanceSpeed = 0.16;
        gaitAmp *= 0.75;
        break;
      case 'wandering':
        forward = 0.12;
        side = lane * 0.04;
        stanceSpeed = 0.18;
        break;
      case 'idle':
      default:
        forward = 0.02;
        side = lane * 0.02;
        stanceSpeed = 0.07;
        gaitAmp *= 0.45;
        break;
    }

    // Unit-role stylization nudges.
    if (u.type === CONFIG.ENTITY.WORKER) side += (u.tribe === 'a' ? -1 : 1) * 0.025;
    if (u.type === CONFIG.ENTITY.SCOUT) forward += 0.02;
    if (u.type === CONFIG.ENTITY.NORMAL) forward -= 0.01;

    return {
      ox: nx * forward + px * side,
      oy: (ny * forward + py * side) * 0.85,
      stanceSpeed,
      gaitAmp,
    };
  }

  render(world, tribeA, tribeB, weather) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this._worldRef = world;  // used by _drawTile to access treeMap

    this._updateWorldBounds(world);

    this._drawWeatherBackground(ctx, weather);
    this._updateWeatherParticles(weather);

    const vb = this._getVisibleTileBounds(world);
    for (let y = vb.yMin; y <= vb.yMax; y++) {
      for (let x = vb.xMin; x <= vb.xMax; x++) {
        this._drawTile(x, y, world.tiles[y][x]);
      }
    }

    this._drawBattleLine();

    const buildings = [...tribeA.buildings, ...tribeB.buildings];
    buildings.sort((a, b) => (a.y + a.x * 0.2) - (b.y + b.x * 0.2));
    for (const b of buildings) {
      if (b._underAttack) b._underAttack--;
      this._drawBuilding(b);
    }

    const units = [...tribeA.units, ...tribeB.units];
    for (const u of units) {
      if (u._lx === undefined || Math.abs((u._lx ?? u.x) - u.x) > 3) u._lx = u.x;
      if (u._ly === undefined || Math.abs((u._ly ?? u.y) - u.y) > 3) u._ly = u.y;

      // Keep perceived movement speed roughly consistent across zoom levels.
      const lerp = Math.max(0.08, Math.min(0.85, 0.22 / Math.max(0.2, this.zoom)));
      u._lx += (u.x - u._lx) * lerp;
      u._ly += (u.y - u._ly) * lerp;

      const mdx = u.x - u._lx;
      const mdy = u.y - u._ly;
      const moving = Math.hypot(mdx, mdy) > 0.03;

      const prof = this._computePurposeOffset(u, moving, mdx, mdy);
      const desiredOx = prof.ox;
      const desiredOy = prof.oy;

      u._ox = (u._ox || 0) + (desiredOx - (u._ox || 0)) * 0.24;
      u._oy = (u._oy || 0) + (desiredOy - (u._oy || 0)) * 0.24;

      // Subtle gait bob in screen-consistent scale (not tile-scale drift).
      u._stanceP = (u._stanceP || 0) + prof.stanceSpeed;
      u._gaitP = (u._gaitP || 0) + (moving ? 0.22 : 0.06);
      const gaitAmp = prof.gaitAmp;
      u._gaitY = Math.sin(u._gaitP * 2.0) * gaitAmp;

      if (u._underFire) u._underFire--;
    }

    units.sort((a, b) => ((a._ly ?? a.y) + (a._lx ?? a.x) * 0.2) - ((b._ly ?? b.y) + (b._lx ?? b.x) * 0.2));
    for (const u of units) this._drawUnit(u);

    this._drawAttackLines(tribeA, tribeB);
    this._drawTowerBeams(tribeA, tribeB);
    this._drawWeatherParticles(ctx, weather);

    if (tribeA && tribeB) {
      this._hoveredEntity = this._findHoveredEntity(this._mouseX, this._mouseY, tribeA, tribeB);
    }
    if (this._hoveredEntity) this._drawTooltip(this._hoveredEntity);
  }

  _drawAttackLines(tribeA, tribeB) {
    const ctx = this.ctx;
    const allUnits = [...tribeA.units, ...tribeB.units];

    for (const u of allUnits) {
      if (!u.attackTarget) continue;

      const ux = (u._lx ?? u.x) + (u._ox || 0);
      const uy = (u._ly ?? u.y) + (u._oy || 0) + (u._gaitY || 0);
      const tx = (u.attackTarget._lx ?? u.attackTarget.x) + (u.attackTarget._ox || 0);
      const ty = (u.attackTarget._ly ?? u.attackTarget.y) + (u.attackTarget._oy || 0) + (u.attackTarget._gaitY || 0);

      const p1 = this._tileToScreen(ux, uy);
      const s1 = this._worldToScreen(p1.sx, p1.sy);
      const p2 = this._tileToScreen(tx, ty);
      const s2 = this._worldToScreen(p2.sx, p2.sy);

      const color = u.tribe === 'a' ? 'rgba(220,100,60,0.85)' : 'rgba(60,130,220,0.85)';

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * this.zoom;
      ctx.setLineDash([4 * this.zoom, 3 * this.zoom]);
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y - 4 * this.zoom);
      ctx.lineTo(s2.x, s2.y - 4 * this.zoom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      const aLen = 7 * this.zoom;
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y - 4 * this.zoom);
      ctx.lineTo(s2.x - aLen * Math.cos(angle - 0.4), s2.y - 4 * this.zoom - aLen * Math.sin(angle - 0.4));
      ctx.lineTo(s2.x - aLen * Math.cos(angle + 0.4), s2.y - 4 * this.zoom - aLen * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawTowerBeams(tribeA, tribeB) {
    const ctx = this.ctx;
    const allTribes = [tribeA, tribeB];

    for (const tribe of allTribes) {
      for (const tower of tribe.buildings) {
        if (tower.type !== CONFIG.ENTITY.TOWER || !tower.attackTarget) continue;

        const p1 = this._tileToScreen(tower.x, tower.y);
        const s1 = this._worldToScreen(p1.sx, p1.sy);

        const tx = (tower.attackTarget._lx ?? tower.attackTarget.x) + (tower.attackTarget._ox || 0);
        const ty = (tower.attackTarget._ly ?? tower.attackTarget.y) + (tower.attackTarget._oy || 0) + (tower.attackTarget._gaitY || 0);
        const p2 = this._tileToScreen(tx, ty);
        const s2 = this._worldToScreen(p2.sx, p2.sy);

        const col = tribe.id === 'a' ? 'rgba(255,160,60,0.9)' : 'rgba(80,180,255,0.9)';
        const th = this.TH * this.zoom;

        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.0 * this.zoom;
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y - th * 2.5);
        ctx.lineTo(s2.x, s2.y - 4 * this.zoom);
        ctx.stroke();

        ctx.lineWidth = 1 * this.zoom;
        ctx.beginPath();
        ctx.arc(s2.x, s2.y - 4 * this.zoom, 4 * this.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

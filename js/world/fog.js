// ══════════════════════════════════════════════════════════════════════════════
// Fog of War System
// ══════════════════════════════════════════════════════════════════════════════
// Manages tile visibility for each tribe. The player (Shadow Keeper) sees the
// combined visibility of both tribes.
//
// Visibility states:
//   0 = UNEXPLORED  — never seen, fully dark
//   1 = EXPLORED    — seen before but not currently visible, dimmed
//   2 = VISIBLE     — currently in sight range of a unit or building
//
// Loaded after world.js, before renderer.js.
// ══════════════════════════════════════════════════════════════════════════════

const FOG = {
  UNEXPLORED: 0,
  EXPLORED:   1,
  VISIBLE:    2,

  // Sight ranges by entity type
  SIGHT: {
    [CONFIG.ENTITY.CAPITOL]:    8,
    [CONFIG.ENTITY.FORT]:       6,
    [CONFIG.ENTITY.TOWER]:      7,
    [CONFIG.ENTITY.BARRACKS]:   4,
    [CONFIG.ENTITY.FARM]:       3,
    [CONFIG.ENTITY.HOME]:       3,
    [CONFIG.ENTITY.STOREHOUSE]: 3,
    [CONFIG.ENTITY.WALL]:       2,
    [CONFIG.ENTITY.WARRIOR]:    3,
    [CONFIG.ENTITY.WORKER]:     3,
    [CONFIG.ENTITY.SCOUT]:      6,
    [CONFIG.ENTITY.LEADER]:     5,
    [CONFIG.ENTITY.NORMAL]:     2,
  },
};

class FogOfWar {
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
  constructor(w, h) {
    this.W = w;
    this.H = h;

    // Per-tribe visibility grids
    this.gridA = new Uint8Array(w * h); // tribe 'a'
    this.gridB = new Uint8Array(w * h); // tribe 'b'

    // Combined player visibility (union of both tribes)
    this.gridPlayer = new Uint8Array(w * h);

    // Change tracking for renderer
    this._dirtyFlag = true;
    this._generation = 0;
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
  _idx(x, y) {
    return y * this.W + x;
  }

  // Get visibility for the player (combined view)
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
  getVisibility(x, y) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return FOG.UNEXPLORED;
    return this.gridPlayer[this._idx(x, y)];
  }

  // Get tribe-specific visibility
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
  getTribeVisibility(tribeId, x, y) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return FOG.UNEXPLORED;
    const grid = tribeId === 'a' ? this.gridA : this.gridB;
    return grid[this._idx(x, y)];
  }

  // Full visibility update — call each tick or every few ticks
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
  update(tribeA, tribeB) {
    const W = this.W;
    const H = this.H;

    // Demote all VISIBLE tiles to EXPLORED (preserve exploration history)
    for (let i = 0; i < this.gridA.length; i++) {
      if (this.gridA[i] === FOG.VISIBLE) this.gridA[i] = FOG.EXPLORED;
      if (this.gridB[i] === FOG.VISIBLE) this.gridB[i] = FOG.EXPLORED;
    }

    // Reveal around tribeA entities
    if (tribeA) {
      for (const b of tribeA.buildings) {
        this._reveal(this.gridA, b.x, b.y, FOG.SIGHT[b.type] || 3);
      }
      for (const u of tribeA.units) {
        this._reveal(this.gridA, u.x, u.y, FOG.SIGHT[u.type] || 3);
      }
    }

    // Reveal around tribeB entities
    if (tribeB && (tribeB.buildings.length || tribeB.units.length)) {
      for (const b of tribeB.buildings) {
        this._reveal(this.gridB, b.x, b.y, FOG.SIGHT[b.type] || 3);
      }
      for (const u of tribeB.units) {
        this._reveal(this.gridB, u.x, u.y, FOG.SIGHT[u.type] || 3);
      }
    }

    // Player sees the union of both tribes
    for (let i = 0; i < this.gridPlayer.length; i++) {
      this.gridPlayer[i] = Math.max(this.gridA[i], this.gridB[i]);
    }

    this._dirtyFlag = true;
    this._generation++;
  }

  // Reveal tiles in a circle around (cx, cy) with given radius
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
  _reveal(grid, cx, cy, radius) {
    const W = this.W;
    const H = this.H;
    const r2 = radius * radius;

    const yMin = Math.max(0, cy - radius);
    const yMax = Math.min(H - 1, cy + radius);
    const xMin = Math.max(0, cx - radius);
    const xMax = Math.min(W - 1, cx + radius);

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          grid[y * W + x] = FOG.VISIBLE;
        }
      }
    }
  }

  // Check if dirty since last render
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
  isDirty(lastGen) {
    return this._generation !== lastGen;
  }

  get generation() {
    return this._generation;
  }
}

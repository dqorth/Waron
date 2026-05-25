# WARON — Development Status

**Last updated:** May 24, 2026  
**Files:** 14 JS, 1 CSS, 1 HTML, 3 docs  
**All files pass syntax check.**

---

## Done — Shipped & Verified (40 items)

### Performance (8)

| # | Item | Files |
|---|------|-------|
| 1 | Spatial hash on World — O(1) entity/wall lookups instead of O(N) | world.js |
| 2 | Territory count caching with dirty flag | world.js |
| 3 | Resource tick optimization — regen list instead of 36,864-tile full scan | world.js |
| 4 | Color parse cache in renderer | renderer.js |
| 5 | Offscreen tile buffer — tiles render once, blit per frame | renderer.js |
| 6 | Pre-computed hex corner offsets (eliminates 120K trig calls/frame) | renderer.js |
| 7 | NORMAL civilian unit culling at low zoom | renderer.js |
| 8 | Hover detection throttled to every 3 frames | renderer.js |

### Bug Fixes (8)

| # | Item | Files |
|---|------|-------|
| 9 | Duplicate `_updateHunger` method removed | tribe.js |
| 10 | `resources` setter was a no-op → `drainResources()` API | tribe.js, actions.js |
| 11 | `gunpowder_accident` referenced nonexistent FORTRESS/CITY entities | actions.js |
| 12 | `_drawAttackLines` read undefined `_lx/_ox/_gaitY` from attackTarget | renderer.js |
| 13 | `_drawTowerBeams` same undefined property bug | renderer.js |
| 14 | Phantom 3rd argument to `applyDebuff()` in several actions | actions.js |
| 15 | Wall collision was O(N) linear scan → `hasEnemyWall()` via spatial hash | world.js, tribe.js |
| 16 | Passive metal/stone trickle `Math.floor(0.083) = 0` → fractional accumulator with minimum 1 | tribe.js |

### Economy & Survival (6)

| # | Item | Files |
|---|------|-------|
| 17 | Capitol food trickle (+2/tick while capitol exists) | tribe.js |
| 18 | Starting resources increased (wood 80→120, food 150→200, metal 40→60, stone 40→60) | tribe.js |
| 19 | Build timer reduced (25→15 ticks) | tribe.js |
| 20 | Tech rate base 22→14, knowledge gain 1→2 per tick | tribe.js |
| 21 | Hunger rebalanced: rate 7.5→2.0, restore 10→15, death ticks 35→50, threshold 30→25 | config.js |
| 22 | Personal food carry — units carry supplies, eat from carry first, refill at food buildings, capacity scales with age (3 days base + 1 per age) | config.js, tribe.js |

### Fracture / Migration / Founding (5)

| # | Item | Files |
|---|------|-------|
| 23 | Fracture system — 5 narrative causes, random selection, configurable tick window | game.js, dev.js |
| 24 | Migration — splinter units packed with distance-calculated journey rations, march to new site | game.js |
| 25 | Founding — triggers on arrival within 3 tiles, places capitol + homes from caravan resources | game.js |
| 26 | Caravan resources — deducted from parent tribe, home costs deducted on placement | game.js |
| 27 | End conditions suspended during migration, activate on founding | game.js |

### Army Logistics (1)

| # | Item | Files |
|---|------|-------|
| 28 | Army supply calculation — estimates distance, calculates food/soldier, caps army size to what tribe can feed, provisions each unit's carry before marching | tribe.js, config.js |

### New Systems (3)

| # | Item | Files |
|---|------|-------|
| 29 | Fog of war — visibility grid (UNEXPLORED/EXPLORED/VISIBLE), per-tribe sight, combined player view, sight ranges by entity type, overlay rendering | fog.js, renderer.js, game.js |
| 30 | Diplomacy — relation score (-100 to +100), 5 states, attack probability gating, drift toward hostility, treaty system | diplomacy.js, tribe.js, game.js |
| 31 | Wildlife — deer/boar/fish spawn by biome, wander, flee from units, huntable for food, respawn timer | wildlife.js, config.js, game.js |

### UI Fixes (2)

| # | Item | Files |
|---|------|-------|
| 32 | Time display fixed width (420px, no resize jitter) | style.css |
| 33 | Event log flex layout (no bottom clipping) | style.css |

### Visual (2)

| # | Item | Files |
|---|------|-------|
| 34 | Desaturated tile palette (muted earth tones) | renderer.js |
| 35 | Territory tint reduced (blend 0.20→0.08, overlay 0.12→0.05) | renderer.js |

### Config & Documentation (5)

| # | Item | Files |
|---|------|-------|
| 36 | `dev.js` — comprehensive developer config with all system knobs | dev.js |
| 37 | `config.js` — army, animal, fog, diplomacy, render threshold configs | config.js |
| 38 | README.md — player-facing guide | README.md |
| 39 | DEVELOPMENT.md — technical reference | docs/DEVELOPMENT.md |
| 40 | DESIGN.md — game design document | docs/DESIGN.md |

---

## Remaining — Not Yet Done (11 items)

### Renderer — Fog Optimization (3)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 1 | **High** | Skip rendering UNEXPLORED tiles in tile buffer entirely — currently renders terrain under the fog overlay (wasted draw calls, biggest remaining perf win) | renderer.js |
| 2 | **High** | Tile buffer doesn't invalidate on fog generation changes — newly revealed tiles show as dark until next cache miss from camera/territory/weather | renderer.js |
| 3 | **Low** | Fog overlay uses hardcoded alpha (0.85/0.40) instead of reading `CONFIG.FOG.UNEXPLORED_ALPHA` / `EXPLORED_ALPHA` | renderer.js |

### Renderer — Config Wiring (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 4 | **Medium** | `_drawTileToBuffer` uses hardcoded zoom thresholds instead of `CONFIG.RENDER.*` values — the config exists but isn't read | renderer.js |

### Renderer — Terrain Detail Balance (2)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 5 | **Medium** | Tree sprites too aggressively hidden (threshold at 0.45, should be `CONFIG.RENDER.TREE_DETAIL_MIN_ZOOM` = 0.35) | renderer.js |
| 6 | **Low** | Biome micro-details (snow dots, wetland arcs, mountain caps) need threshold tuning for character without noise | renderer.js |

### Renderer — Wildlife Sprites (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 7 | **Medium** | Animal sprites not rendered — Wildlife system ticks but renderer doesn't draw them. Needs small sprite methods and a render pass after buildings | renderer.js |

### Wildlife — Hunting AI (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 8 | **Medium** | Unit AI doesn't hunt animals yet — workers/scouts should check `Game.wildlife.getHuntable()` when food carry is low, attack, and gain `carriedFood` | tribe.js |

### Diplomacy — Player Actions (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 9 | **Medium** | No diplomatic player actions in actions.js — need: `broker_peace` (treaty), `incite_hatred` (shift negative), `forge_alliance` (shift positive, high suspicion), `break_treaty` | actions.js |

### Diplomacy — UI (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 10 | **Low** | HUD doesn't show diplomatic state — relation score/state between tribes should be visible in the balance bar area or as an indicator | ui.js, style.css, index.html |

### Code Structure (1)

| # | Priority | Item | Files |
|---|----------|------|-------|
| 11 | **Medium** | Refactor per `docs/REFACTOR.md` — split tribe.js (6 concerns), renderer.js (5 concerns), game.js (4 concerns) into focused files using prototype extension pattern | All major files |

---

## File Inventory

| File | Current Size | Original Size | Notes |
|------|-------------|---------------|-------|
| `js/dev.js` | 7.7 KB | *new* | Developer config |
| `js/config.js` | 9.5 KB | 5.4 KB | Added army, animal, fog, diplomacy, render configs |
| `js/ages.js` | 9.3 KB | 5.0 KB | JSDoc added |
| `js/time_dilation.js` | 5.6 KB | *new* | Added externally (not by this session) |
| `js/world.js` | 71 KB | 10 KB | Spatial hash, territory cache, regen list + JSDoc |
| `js/fog.js` | 4.6 KB | *new* | Fog of war system |
| `js/diplomacy.js` | 6.9 KB | *new* | Diplomacy system |
| `js/wildlife.js` | 5.2 KB | *new* | Huntable animals |
| `js/tribe.js` | 155 KB | 52 KB | Food carry, army supply, fractional accum + JSDoc |
| `js/player.js` | 17 KB | 3.0 KB | JSDoc added |
| `js/actions.js` | 27 KB | 12.7 KB | Bug fixes, drainResources + JSDoc |
| `js/renderer.js` | 187 KB | 49 KB | Tile buffer, fog overlay, palette + JSDoc |
| `js/ui.js` | 35 KB | 9.6 KB | JSDoc added |
| `js/game.js` | 30 KB | 11.9 KB | Fracture, migration, founding, system hooks |
| `css/style.css` | 11.6 KB | 11.2 KB | Time box + event log fixes |
| `README.md` | 5.2 KB | *new* | Player-facing documentation |
| `docs/DEVELOPMENT.md` | 6.1 KB | *new* | Technical reference |
| `docs/DESIGN.md` | 5.5 KB | *new* | Game design document |
| `docs/STATUS.md` | 8.5 KB | *new* | Development status tracker |
| `docs/REFACTOR.md` | 11.9 KB | *new* | Refactoring plan |

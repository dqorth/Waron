# WARON — Refactoring Plan

## Architecture: Global Classes + Composition

Every file defines a global class. Large classes split via **composition** — each concern becomes its own class holding a reference to shared parent state. Dependencies managed by `<script>` tag load order in `index.html`. No `import`/`export`, no build tools, no server — opens from `file://`.

When TypeScript is needed: add `export`/`import`, install esbuild (single binary), run one command. The class structure stays identical — only the plumbing changes.

---

## Current State

| File | Total Lines | Code Lines | JSDoc Lines | Methods |
|------|------------|------------|-------------|---------|
| renderer.js | 3,586 | ~1,485 | ~1,806 | 52 methods across 5 concerns |
| tribe.js | 3,048 | ~1,145 | ~1,677 | 43 methods across 6 concerns |
| world.js | 1,367 | ~423 | ~852 | Map gen, spatial hash, trees, territory |
| game.js | 732 | ~500 | ~230 | Tick loop, fracture, weather, calendar |
| actions.js | 924 | ~600 | ~320 | 24 action definitions |
| ui.js | 614 | ~350 | ~260 | HUD, modals, event log |

---

## Core Problem

Three files do too many things:

**`tribe.js` (43 methods, 6 concerns):**
- Economy: `_gatherResources`, `_assignFarmWorkers`, farm helpers
- Building: `_doBuildLogic`, `_buildNew`, `_expandFarmLand`, `_doUpgradeLogic`
- Military: `_doMilitaryLogic`, `_doAttackLogic`, tower logic, army supply
- Population: `_growPopulation`, `_updateHunger`, food carry, `_syncPopulationUnits`
- Unit AI: `_updateUnits` (400+ lines — warrior, worker, scout, normal, each unique)
- Helpers: stats, movement, combat math, debuffs

**`renderer.js` (52 methods, 5 concerns):**
- Core: camera, tile buffer, hex math, coordinate conversion
- Tile drawing: `_drawTileToBuffer`, colors, depth faces, biome details
- Building sprites: 8 methods (`_drawCapitol` through `_drawWall`)
- Unit sprites: 5 methods + visual seed, purpose offset, gait
- Effects: weather particles, fog overlay, attack lines, tower beams, tooltips

**`game.js` (17 functions, 4 concerns):**
- Game loop: init, start, reset, tick, render loop
- Fracture: trigger, founding, settlement search
- Weather: state machine, season weights, event messages
- Calendar: time conversion

---

## Proposed Structure

```
Waron/
├── index.html              ← script tags in dependency order
├── README.md
│
├── css/
│   └── style.css
│
├── documentation/
│   ├── DESIGN.md
│   ├── DEVELOPMENT.md
│   ├── STATUS.md
│   └── REFACTOR.md
│
└── js/
    ├── config/
    │   ├── dev.js            → const DEV = { ... }
    │   ├── config.js         → const CONFIG = { ... }
    │   └── ages.js           → const AGES = [ ... ]
    │
    ├── world/
    │   ├── world.js          → class World { ... }
    │   ├── territory.js      → class Territory { constructor(world) }
    │   ├── trees.js          → class TreeManager { constructor(world) }
    │   ├── wildlife.js       → class Wildlife { constructor(world) }
    │   └── fog.js            → class FogOfWar { ... }
    │
    ├── tribe/
    │   ├── economy.js        → class TribeEconomy { constructor(tribe) }
    │   ├── building.js       → class TribeBuilding { constructor(tribe) }
    │   ├── military.js       → class TribeMilitary { constructor(tribe) }
    │   ├── population.js     → class TribePopulation { constructor(tribe) }
    │   ├── unit-ai.js        → class TribeUnitAI { constructor(tribe) }
    │   └── tribe.js          → class Tribe { ... }  ← loaded AFTER subsystems
    │
    ├── systems/
    │   ├── diplomacy.js      → class Diplomacy { ... }
    │   ├── fracture.js       → class FractureSystem { constructor(game) }
    │   ├── weather.js        → class WeatherSystem { ... }
    │   ├── calendar.js       → function getCalendar(ticks) { ... }
    │   ├── actions.js        → const ACTIONS = { ... }
    │   └── player.js         → class Player { ... }
    │
    ├── render/
    │   ├── tiles.js          → class TileRenderer { constructor(renderer) }
    │   ├── buildings.js      → class BuildingRenderer { constructor(renderer) }
    │   ├── units.js          → class UnitRenderer { constructor(renderer) }
    │   ├── effects.js        → class EffectsRenderer { constructor(renderer) }
    │   ├── combat.js         → class CombatRenderer { constructor(renderer) }
    │   └── renderer.js       → class Renderer { ... }  ← loaded AFTER subsystems
    │
    ├── ui/
    │   └── ui.js             → class UI { ... }
    │
    └── game.js               → const Game = (() => { ... })()
```

**30 files.** Each 100–400 lines of code + JSDoc. All globals, all script tags.

---

## The Composition Pattern

### Core Idea

Each subsystem is a global class that receives its parent's reference in the constructor. Reads and writes shared state through that reference. No inheritance, no prototypes, no modules.

### Tribe Example

```javascript
// tribe/economy.js — loaded before tribe.js
class TribeEconomy {
  constructor(tribe) {
    this.tribe = tribe;
    this._techTimer = 0;
    this._metalAccum = 0;
    this._stoneAccum = 0;
  }

  gather() {
    const tribe = this.tribe;
    const farms = tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    // ...all economy logic, accessing tribe.res, tribe.buildings, tribe._world
  }

  _assignFarmWorkers(farms) { ... }
}
```

```javascript
// tribe/tribe.js — loaded AFTER economy.js, building.js, etc.
class Tribe {
  constructor(id, name, startX, startY, color) {
    this.id = id;
    this.name = name;
    this.res = { wood: 120, food: 200, metal: 60, stone: 60 };
    this.buildings = [];
    this.units = [];
    // ...all shared state

    // Subsystems
    this.econ = new TribeEconomy(this);
    this.bld  = new TribeBuilding(this);
    this.mil  = new TribeMilitary(this);
    this.pop  = new TribePopulation(this);
    this.ai   = new TribeUnitAI(this);
  }

  init(world, enemyTribe) {
    this._world = world;
    this._enemy = enemyTribe;
    // ...
  }

  tick(year) {
    this._applyDebuffDecay();
    this._updateAge(year);
    this.pop.grow();
    this.econ.gather();
    this.pop.updateHunger();
    this.bld.tick();
    this.bld.upgrade();
    this.mil.spawn();
    this.mil.attack();
    this.ai.update();
    this.mil.updateTowers();
    this.pop.sync();
    this._computePower();
  }

  // Public API stays on Tribe
  applyDebuff(key, strength) { ... }
  killLeader() { ... }
  killUnits(count) { ... }
  drainResources(amount) { ... }
  isEliminated() { ... }
}
```

### Renderer Example

```javascript
// render/tiles.js — loaded before renderer.js
class TileRenderer {
  constructor(renderer) {
    this.r = renderer;  // access r.ctx, r.zoom, r.tileToScreen(), etc.
    this._tileCanvas = null;
    this._tileBufDirty = true;
    // ...buffer state
  }

  renderBuffer(world, weather) { ... }
  blit(ctx) { ... }
  _drawTileToBuffer(ctx, tx, ty, tile, sx, sy, sz, vs, corners) { ... }
  _getTileColor(tile) { ... }
  _drawTreeSprite(ctx, x, y, zoom, stage, isJungle) { ... }
}
```

```javascript
// render/renderer.js — loaded AFTER all render subsystems
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.zoom = CONFIG.CAM_ZOOM_DEFAULT;
    // ...core state

    // Subsystem renderers
    this.tiles   = new TileRenderer(this);
    this.bldg    = new BuildingRenderer(this);
    this.units   = new UnitRenderer(this);
    this.effects = new EffectsRenderer(this);
    this.combat  = new CombatRenderer(this);

    this._setupEvents();
    this._resize();
  }

  render(world, tribeA, tribeB, weather) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this.effects.drawWeatherBackground(ctx, weather);
    this.effects.updateWeatherParticles(weather);
    this.tiles.renderBuffer(world, weather);
    this.tiles.blit(ctx);
    this.effects.drawFogOverlay(ctx, world);
    this.bldg.drawAll(ctx, tribeA, tribeB);
    this.units.updateAndDraw(ctx, tribeA, tribeB);
    this.combat.drawAttackLines(ctx, tribeA, tribeB);
    this.combat.drawTowerBeams(ctx, tribeA, tribeB);
    this.effects.drawWeatherParticles(ctx, weather);
    this._updateHover(tribeA, tribeB);
  }

  // Shared utilities — subsystems call this.r.tileToScreen(), etc.
  tileToScreen(tx, ty) { ... }
  worldToScreen(sx, sy) { ... }
  isOnScreen(x, y, margin) { ... }
  parseColor(color) { ... }
  darken(color, factor) { ... }
  blendColor(c1, c2, t) { ... }
}
```

### World Example

```javascript
// world/territory.js — loaded before world.js
class Territory {
  constructor(world) {
    this.world = world;
    this._count = { a: 0, b: 0 };
    this._dirty = true;
  }

  update(tribeA, tribeB) { ... }
  count(tribeId) { ... }
}
```

```javascript
// world/world.js — loaded after territory.js, trees.js
class World {
  constructor() {
    this.W = CONFIG.MAP_W;
    this.H = CONFIG.MAP_H;
    this.tiles = [];
    // ...spatial hash

    this.territory = new Territory(this);
    this.trees = new TreeManager(this);

    this.generate();
  }
}
```

---

## index.html Load Order

```html
<!-- Config (no dependencies) -->
<script src="js/config/dev.js"></script>
<script src="js/config/config.js"></script>
<script src="js/config/ages.js"></script>

<!-- World subsystems (depend on CONFIG) -->
<script src="js/world/territory.js"></script>
<script src="js/world/trees.js"></script>
<script src="js/world/world.js"></script>
<script src="js/world/wildlife.js"></script>
<script src="js/world/fog.js"></script>

<!-- Tribe subsystems (depend on CONFIG, reference Game at runtime) -->
<script src="js/tribe/economy.js"></script>
<script src="js/tribe/building.js"></script>
<script src="js/tribe/military.js"></script>
<script src="js/tribe/population.js"></script>
<script src="js/tribe/unit-ai.js"></script>
<script src="js/tribe/tribe.js"></script>

<!-- Systems (depend on CONFIG, AGES) -->
<script src="js/systems/diplomacy.js"></script>
<script src="js/systems/calendar.js"></script>
<script src="js/systems/weather.js"></script>
<script src="js/systems/fracture.js"></script>
<script src="js/systems/player.js"></script>
<script src="js/systems/actions.js"></script>

<!-- Render subsystems (depend on CONFIG) -->
<script src="js/render/tiles.js"></script>
<script src="js/render/buildings.js"></script>
<script src="js/render/units.js"></script>
<script src="js/render/effects.js"></script>
<script src="js/render/combat.js"></script>
<script src="js/render/renderer.js"></script>

<!-- UI & Game (depend on everything above) -->
<script src="js/ui/ui.js"></script>
<script src="js/game.js"></script>
```

---

## TypeScript Migration (future)

When ready, three steps:

1. **Add `export`/`import`** to every file. Each `class Foo` becomes `export class Foo`. Each file that references `Foo` gets `import { Foo } from './foo.js'`. The class structure, composition, and file boundaries stay identical.

2. **Rename `.js` to `.ts`**, add type annotations.

3. **Install esbuild** (single binary, no npm ecosystem required):
```bash
esbuild js/game.ts --bundle --outfile=js/bundle.js
```
HTML becomes `<script src="js/bundle.js"></script>`. Still opens from `file://`.

### What the conversion looks like

```typescript
// tribe/economy.ts
import type { Tribe } from './tribe';

export class TribeEconomy {
  private tribe: Tribe;
  private _techTimer: number = 0;

  constructor(tribe: Tribe) {
    this.tribe = tribe;
  }

  gather(): void {
    const farms = this.tribe.buildings.filter(
      (b: Building) => b.type === CONFIG.ENTITY.FARM
    );
    // ...identical logic
  }
}
```

### Shared interfaces (future types.ts)

```typescript
export interface Resources {
  wood: number; food: number; metal: number; stone: number;
}

export interface UnitStats {
  strength: number; loyalty: number; agility: number;
  tenacity: number; endurance: number; defense: number;
}

export interface Unit {
  id: number; x: number; y: number;
  type: string; tribe: string;
  hp: number; maxHp: number; state: string;
  stats: UnitStats;
  hunger: number; carriedFood: number; carriedFoodMax: number;
}

export interface Building {
  id: number; x: number; y: number;
  type: string; tribe: string;
  hp: number; maxHp: number; level: number;
}

export interface Tile {
  type: number; elevation: number;
  owner: string | null; fertility: number;
  temperature: number; road: boolean;
  resourceNode: { max: number; amount: number } | null;
}
```

---

## Migration Path

### Phase 1: Extract from game.js (1 hr)

1. `systems/calendar.js` ← `function getCalendar(ticks)` (global function)
2. `systems/weather.js` ← `class WeatherSystem` (state machine, season weights, messages)
3. `systems/fracture.js` ← `class FractureSystem` (fracture, migration, founding)
4. `game.js` shrinks to ~200 lines (Game IIFE: tick loop, init, start, API)

### Phase 2: Extract from renderer.js (2 hr)

1. `render/tiles.js` ← `class TileRenderer` (tile buffer, hex drawing, colors, trees, resource icons)
2. `render/buildings.js` ← `class BuildingRenderer` (8 building sprite methods)
3. `render/units.js` ← `class UnitRenderer` (5 unit sprites, visual seed, gait, purpose offset)
4. `render/effects.js` ← `class EffectsRenderer` (weather particles, fog overlay, battle line)
5. `render/combat.js` ← `class CombatRenderer` (attack lines, tower beams)
6. `renderer.js` keeps: camera, buffer management, coordinate math, `render()`, hover, tooltip

### Phase 3: Extract from tribe.js (2 hr)

1. `tribe/economy.js` ← `class TribeEconomy` (resource gathering, farms, tech, passive trickle)
2. `tribe/building.js` ← `class TribeBuilding` (build logic, upgrades, placement, farm expansion)
3. `tribe/military.js` ← `class TribeMilitary` (spawn, army formation, supply, attack, towers)
4. `tribe/population.js` ← `class TribePopulation` (growth, hunger, food carry, sync, spawn)
5. `tribe/unit-ai.js` ← `class TribeUnitAI` (unit behavior, movement, combat, defection, retreat)
6. `tribe.js` keeps: constructor, `init`, `tick` orchestrator, public API, stat helpers

### Phase 4: Reorganize world.js (1 hr)

1. `world/territory.js` ← `class Territory` (ownership calculation, counting, cache)
2. `world/trees.js` ← `class TreeManager` (spawn, growth, harvest, planting, nearby search)
3. `world.js` keeps: constructor, `generate()`, spatial hash, tiles, `tickResources`, neighbors

### Phase 5: Create directory structure + update HTML (30 min)

1. Create `js/config/`, `js/world/`, `js/tribe/`, `js/systems/`, `js/render/`, `js/ui/`
2. Move files into directories
3. Update `index.html` script tags
4. Verify game boots from `file://`

### Phase 6: Verify + update docs (30 min)

1. Full playtest: fracture → migration → founding → war
2. Update `documentation/DEVELOPMENT.md` with new structure
3. Update `documentation/STATUS.md`

---

## Estimated Effort

| Phase | Time | Impact | Risk |
|-------|------|--------|------|
| 1. Extract game.js | 1 hr | Medium | Low |
| 2. Extract renderer.js | 2 hr | High | Medium |
| 3. Extract tribe.js | 2 hr | High | Medium |
| 4. Reorganize world.js | 1 hr | Medium | Low |
| 5. Directory + HTML | 30 min | Required | Low |
| 6. Verify + docs | 30 min | Required | Low |
| **Total** | **~7 hr** | | |

---

## What This Enables

| Capability | Before | After |
|-----------|--------|-------|
| TypeScript migration | Rewrite required | Add export/import + esbuild |
| Opens from file:// | Yes | Yes |
| IDE intelligence | Limited (3000-line files) | Good (focused files) |
| New developer onboarding | Read monolith | Read the subsystem you need |
| Testing a subsystem | Extract from monolith | Instantiate class with mock |
| Multiplayer extraction | Tangle | Import simulation classes without renderer |

## What NOT to Change

- **Keep JSDoc.** Every method keeps its documentation through the split.
- **No `import`/`export`.** Global classes, script tag order. Modules come with TypeScript.
- **No class inheritance.** Composition only. Flat hierarchy.
- **No framework.** Pure DOM for UI. Canvas 2D for rendering.
- **No build tools.** Until TypeScript, nothing to compile.
- **Single CSS file.** 11KB doesn't warrant splitting.

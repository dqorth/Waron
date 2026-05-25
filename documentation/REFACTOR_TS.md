# WARON — Refactoring Plan

## Architecture: ES Modules + Composition

Every file is an ES module (`import`/`export`). Large classes split via **composition** — each concern becomes its own class holding a reference to shared parent state. This structure converts to TypeScript by adding type annotations. No prototype hacking, no ambient declarations, no build tools required.

**Requires:** Serve over HTTP (e.g. `python -m http.server 8080`). Direct `file://` opens don't support ES module imports.

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

## Proposed Structure

```
Waron/
├── index.html              ← single <script type="module" src="js/main.js">
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
    ├── main.js              ← boot: imports Game, calls Game.init()
    │
    ├── config/
    │   ├── dev.js            → export const DEV = { ... }
    │   ├── config.js         → export const CONFIG = { ... }
    │   └── ages.js           → export const AGES = [ ... ]
    │
    ├── world/
    │   ├── world.js          → export class World { ... }
    │   ├── territory.js      → export class Territory { constructor(world) }
    │   ├── trees.js          → export class TreeManager { constructor(world) }
    │   ├── wildlife.js       → export class Wildlife { constructor(world) }
    │   └── fog.js            → export class FogOfWar { ... }
    │
    ├── tribe/
    │   ├── tribe.js          → export class Tribe { ... }
    │   ├── economy.js        → export class TribeEconomy { constructor(tribe) }
    │   ├── building.js       → export class TribeBuilding { constructor(tribe) }
    │   ├── military.js       → export class TribeMilitary { constructor(tribe) }
    │   ├── population.js     → export class TribePopulation { constructor(tribe) }
    │   └── unit-ai.js        → export class TribeUnitAI { constructor(tribe) }
    │
    ├── systems/
    │   ├── diplomacy.js      → export class Diplomacy { ... }
    │   ├── fracture.js       → export class FractureSystem { constructor(game) }
    │   ├── weather.js        → export class WeatherSystem { ... }
    │   ├── calendar.js       → export function getCalendar(ticks) { ... }
    │   ├── actions.js        → export const ACTIONS = { ... }
    │   └── player.js         → export class Player { ... }
    │
    ├── render/
    │   ├── renderer.js       → export class Renderer { ... }
    │   ├── tiles.js          → export class TileRenderer { constructor(renderer) }
    │   ├── buildings.js      → export class BuildingRenderer { constructor(renderer) }
    │   ├── units.js          → export class UnitRenderer { constructor(renderer) }
    │   ├── effects.js        → export class EffectsRenderer { constructor(renderer) }
    │   └── combat.js         → export class CombatRenderer { constructor(renderer) }
    │
    ├── ui/
    │   └── ui.js             → export class UI { ... }
    │
    └── game.js               → export class Game { ... }
```

**30 files.** Each 100–400 lines of code + JSDoc. Single entry point (`main.js`).

---

## The Composition Pattern

### Core Idea

Each subsystem is a class that receives a reference to its parent's state. It reads and writes shared state through that reference. No inheritance, no prototype mutation, no globals.

### Tribe Example

```javascript
// tribe/tribe.js
import { TribeEconomy } from './economy.js';
import { TribeBuilding } from './building.js';
import { TribeMilitary } from './military.js';
import { TribePopulation } from './population.js';
import { TribeUnitAI } from './unit-ai.js';
import { CONFIG } from '../config/config.js';

export class Tribe {
  constructor(id, name, startX, startY, color) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.startX = startX;
    this.startY = startY;

    this.population = 20 + Math.floor(Math.random() * 10);
    this.military = 0;
    this.res = { wood: 120, food: 200, metal: 60, stone: 60 };
    this.techLevel = 1;
    this.knowledge = 0;
    this.morale = 0.7;
    this.buildings = [];
    this.units = [];
    this.debuffs = {};
    this.casualties = 0;
    this.power = 0;
    // ...all shared state lives here

    // Subsystems — each gets `this` as their tribe reference
    this.economy    = new TribeEconomy(this);
    this.building   = new TribeBuilding(this);
    this.military   = new TribeMilitary(this);
    this.population = new TribePopulation(this);
    this.unitAI     = new TribeUnitAI(this);
  }

  init(world, enemyTribe) {
    this._world = world;
    this._enemy = enemyTribe;
    // ...placement, starting units
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
    this.unitAI.update();
    this.mil.updateTowers();
    this.pop.sync();
    this._computePower();
  }

  // Public API — thin wrappers stay on Tribe
  applyDebuff(key, strength) { ... }
  killLeader() { ... }
  killUnits(count) { ... }
  drainResources(amount) { ... }
  isEliminated() { ... }
}
```

```javascript
// tribe/economy.js
import { CONFIG } from '../config/config.js';

export class TribeEconomy {
  constructor(tribe) {
    this.tribe = tribe;
    this._techTimer = 0;
    this._metalAccum = 0;
    this._stoneAccum = 0;
  }

  gather() {
    const tribe = this.tribe;
    const farms = tribe.buildings.filter(b => b.type === CONFIG.ENTITY.FARM);
    // ...all economy logic, using tribe.res, tribe.buildings, tribe._world
  }

  _assignFarmWorkers(farms) { ... }
  // ...farm helpers
}
```

### Renderer Example

```javascript
// render/renderer.js
import { TileRenderer } from './tiles.js';
import { BuildingRenderer } from './buildings.js';
import { UnitRenderer } from './units.js';
import { EffectsRenderer } from './effects.js';
import { CombatRenderer } from './combat.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.zoom = CONFIG.CAM_ZOOM_DEFAULT;
    // ...core state

    // Subsystem renderers
    this.tiles    = new TileRenderer(this);
    this.bldg     = new BuildingRenderer(this);
    this.units    = new UnitRenderer(this);
    this.effects  = new EffectsRenderer(this);
    this.combat   = new CombatRenderer(this);

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

  // Shared utilities stay on Renderer — subsystems call this.renderer.method()
  tileToScreen(tx, ty) { ... }
  worldToScreen(sx, sy) { ... }
  isOnScreen(x, y, margin) { ... }
  parseColor(color) { ... }
  darken(color, factor) { ... }
  blendColor(c1, c2, t) { ... }
}
```

```javascript
// render/buildings.js
import { CONFIG } from '../config/config.js';

export class BuildingRenderer {
  constructor(renderer) {
    this.r = renderer;  // access r.ctx, r.zoom, r.tileToScreen(), etc.
  }

  drawAll(ctx, tribeA, tribeB) {
    const all = [...tribeA.buildings, ...tribeB.buildings];
    all.sort((a, b) => (a.y + a.x * 0.2) - (b.y + b.x * 0.2));
    for (const b of all) this._drawBuilding(ctx, b);
  }

  _drawBuilding(ctx, entity) {
    const sPos = this.r.worldToScreen(...this.r.tileToScreen(entity.x, entity.y));
    // ...sprite drawing using this.r.zoom, this.r.TW, etc.
  }

  _drawCapitol(ctx, x, y, tw, th, s, color, darkColor, lightColor, roofColor) { ... }
  _drawFort(...) { ... }
  // ...all 8 building sprite methods
}
```

### World Example

```javascript
// world/world.js
import { Territory } from './territory.js';
import { TreeManager } from './trees.js';

export class World {
  constructor() {
    this.W = CONFIG.MAP_W;
    this.H = CONFIG.MAP_H;
    this.tiles = [];
    // ...spatial hash, entity list

    this.territory = new Territory(this);
    this.trees = new TreeManager(this);

    this.generate();
  }

  tickResources() {
    // ...regen list logic
    this.trees.tick();
  }
}
```

### Game Example

```javascript
// game.js
import { World } from './world/world.js';
import { Tribe } from './tribe/tribe.js';
import { Player } from './systems/player.js';
import { Renderer } from './render/renderer.js';
import { UI } from './ui/ui.js';
import { FogOfWar } from './world/fog.js';
import { Diplomacy } from './systems/diplomacy.js';
import { Wildlife } from './world/wildlife.js';
import { WeatherSystem } from './systems/weather.js';
import { FractureSystem } from './systems/fracture.js';
import { getCalendar } from './systems/calendar.js';

export class Game {
  constructor() {
    this.world = null;
    this.tribeA = null;
    this.tribeB = null;
    this.player = null;
    this.renderer = null;
    this.fog = null;
    this.diplomacy = null;
    this.wildlife = null;
    this.weather = null;
    this.fracture = null;
  }

  init() {
    this.renderer = new Renderer(document.getElementById('game-canvas'));
    this.ui = new UI(this);
    this._requestLoop();
  }

  start() {
    this.world     = new World();
    this.player    = new Player();
    this.fog       = new FogOfWar(CONFIG.MAP_W, CONFIG.MAP_H);
    this.diplomacy = new Diplomacy();
    this.wildlife  = new Wildlife(this.world);
    this.weather   = new WeatherSystem();
    this.fracture  = new FractureSystem(this);
    // ...tribe setup
  }

  _tick() {
    this._cal = getCalendar(this.totalTicks);
    this.weather.tick(this._cal.season);
    this.fracture.check(this.totalTicks);
    this.tribeA.tick(this._cal.year);
    this.tribeB.tick(this._cal.year);
    // ...
  }
}
```

```javascript
// main.js — entry point
import { Game } from './game.js';

const game = new Game();
window.addEventListener('DOMContentLoaded', () => game.init());

// Expose for console debugging
window.Game = game;
```

```html
<!-- index.html — single script tag -->
<script type="module" src="js/main.js"></script>
```

---

## TypeScript Migration Path

Once the ES module refactor is done, converting to TypeScript is mechanical:

1. Rename `.js` to `.ts`
2. Add type annotations to function signatures and class properties
3. Define interfaces for shared data shapes (Tile, Unit, Building, Resources)
4. Run `tsc` with `--strict`
5. Fix type errors (mostly adding `!` or `?` to nullable properties)

```typescript
// tribe/economy.ts — what the conversion looks like
import { CONFIG } from '../config/config';
import type { Tribe } from './tribe';

interface FarmWorkerAssignment {
  farm: Building;
  workers: Unit[];
}

export class TribeEconomy {
  private tribe: Tribe;
  private _techTimer: number = 0;
  private _metalAccum: number = 0;
  private _stoneAccum: number = 0;

  constructor(tribe: Tribe) {
    this.tribe = tribe;
  }

  gather(): void {
    const farms = this.tribe.buildings.filter(
      (b: Building) => b.type === CONFIG.ENTITY.FARM
    );
    this._assignFarmWorkers(farms);
    // ...
  }
}
```

The structure doesn't change. The file boundaries don't change. The class relationships don't change. Only types are added.

---

## Shared Data Interfaces (future .ts)

These would be defined in a `types.ts` or `interfaces.ts` and imported everywhere:

```typescript
// types.ts
export interface Resources {
  wood: number;
  food: number;
  metal: number;
  stone: number;
}

export interface UnitStats {
  strength: number;
  loyalty: number;
  agility: number;
  tenacity: number;
  endurance: number;
  defense: number;
}

export interface Unit {
  id: number;
  x: number;
  y: number;
  type: string;
  tribe: string;
  hp: number;
  maxHp: number;
  state: string;
  stats: UnitStats;
  hunger: number;
  carriedFood: number;
  carriedFoodMax: number;
  // ...
}

export interface Building {
  id: number;
  x: number;
  y: number;
  type: string;
  tribe: string;
  hp: number;
  maxHp: number;
  level: number;
  // ...
}

export interface Tile {
  type: number;
  elevation: number;
  owner: string | null;
  fertility: number;
  temperature: number;
  road: boolean;
  resourceNode: { max: number; amount: number } | null;
}
```

---

## Migration Path

### Phase 1: Entry Point + Config (45 min)

Convert to ES modules starting from the leaves (no dependencies):

1. Create `js/main.js` as the boot entry point
2. Convert `config/dev.js`, `config/config.js`, `config/ages.js` to `export const`
3. Update `index.html`: replace all `<script>` tags with single `<script type="module" src="js/main.js">`
4. Add `import` statements to each file as you convert it
5. Verify game still boots

### Phase 2: Extract Systems from game.js (1 hr)

1. `systems/calendar.js` ← `export function getCalendar(ticks)`
2. `systems/weather.js` ← `export class WeatherSystem` (state machine, season weights, messages)
3. `systems/fracture.js` ← `export class FractureSystem` (fracture, migration, founding, settlement search)
4. `game.js` becomes `export class Game` — tick loop, init, start, reset

### Phase 3: Extract Renderer Subsystems (2 hr)

1. `render/tiles.js` ← `export class TileRenderer` (tile buffer, hex drawing, colors, trees, resource icons)
2. `render/buildings.js` ← `export class BuildingRenderer` (8 building sprite methods)
3. `render/units.js` ← `export class UnitRenderer` (5 unit sprites, visual seed, gait, purpose offset)
4. `render/effects.js` ← `export class EffectsRenderer` (weather particles, fog overlay, battle line)
5. `render/combat.js` ← `export class CombatRenderer` (attack lines, tower beams)
6. `renderer.js` keeps: camera, buffer management, coordinate math, `render()`, hover, tooltip

### Phase 4: Extract Tribe Subsystems (2 hr)

1. `tribe/economy.js` ← `export class TribeEconomy` (resource gathering, farms, tech, passive trickle)
2. `tribe/building.js` ← `export class TribeBuilding` (build logic, upgrades, placement, farm expansion)
3. `tribe/military.js` ← `export class TribeMilitary` (spawn, army formation, supply, attack, towers)
4. `tribe/population.js` ← `export class TribePopulation` (growth, hunger, food carry, sync, spawn)
5. `tribe/unit-ai.js` ← `export class TribeUnitAI` (unit behavior, movement, combat, defection, retreat)
6. `tribe.js` keeps: constructor, `init`, `tick` orchestrator, public API, stat helpers

### Phase 5: Reorganize World (1 hr)

1. `world/territory.js` ← `export class Territory` (ownership calculation, counting, cache)
2. `world/trees.js` ← `export class TreeManager` (spawn, growth, harvest, planting, nearby search)
3. `world.js` keeps: constructor, `generate()`, spatial hash, tiles, `tickResources`, neighbors

### Phase 6: Verify + Update Docs (30 min)

1. Full syntax check on all modules
2. Playtest fracture → migration → founding → war cycle
3. Update `DEVELOPMENT.md` with new structure
4. Update `STATUS.md`

---

## Estimated Effort

| Phase | Time | Impact | Risk |
|-------|------|--------|------|
| 1. Entry point + config | 45 min | Foundation | Low |
| 2. Extract game.js | 1 hr | Medium | Low |
| 3. Extract renderer.js | 2 hr | High | Medium |
| 4. Extract tribe.js | 2 hr | High | Medium |
| 5. Reorganize world.js | 1 hr | Medium | Low |
| 6. Verify + docs | 30 min | Required | Low |
| **Total** | **~7.5 hr** | | |

---

## What This Enables

| Capability | Before | After |
|-----------|--------|-------|
| TypeScript migration | Rewrite required | Rename + add types |
| Unit testing | Impossible (globals, side effects) | Import class, mock dependencies |
| Tree-shaking / bundling | N/A | Works with any bundler |
| IDE intelligence | Limited (globals) | Full (explicit imports) |
| New developer onboarding | Read 3,000-line file | Read 200-line file for the system you care about |
| Hot module replacement | N/A | Supported with Vite/webpack |
| Multiplayer extraction | Monolith tangle | Import simulation classes without renderer |

## What NOT to Change

- **Keep JSDoc.** Every method keeps its documentation. JSDoc travels with the method into the new file.
- **No class inheritance.** Composition only. Flat class hierarchy.
- **No state management library.** Direct property access through composition references.
- **No framework.** Pure DOM manipulation for UI. Canvas 2D for rendering.
- **Single CSS file.** 11KB doesn't warrant splitting.

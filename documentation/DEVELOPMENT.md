# WARON — Development Reference

## Architecture

Pure client-side JavaScript. No build tools, no bundler, no server. Scripts load in dependency order via `<script>` tags in `index.html`. All state lives in the `Game` IIFE module which exposes a public API.

Large classes are split by **composition**: a parent class (`Tribe`, `Renderer`, `World`)
holds the shared state and a back-reference is handed to each subsystem class
(`this.tribe` / `this.r` / `this.world`). Subsystems hold no state of their own — they
read and write the parent's state through the back-reference. Files are grouped under
`js/{config,world,tribe,systems,render,ui}/`.

### Load Order (critical)
```
config/{dev,config,ages,time-dilation}
world/{territory,trees,world,fog,wildlife}
systems/{diplomacy,calendar,weather,fracture,player,actions}
tribe/{economy,building,military,population,unit-ai,tribe}   ← subsystems before tribe.js
render/{tiles,buildings,units,effects,combat,renderer}        ← subsystems before renderer.js
ui/ui → game.js
```

Subsystem files must load **before** their parent class file (so `new TribeEconomy(this)`
etc. resolve). References to `Game` (defined last) must use runtime guards:
`typeof Game !== 'undefined' && Game.diplomacy`.

### Module Responsibilities

| Area | Files | Role | Hot path? |
|------|-------|------|-----------|
| World | `world/world.js` + `territory.js`, `trees.js` | Map gen, spatial hash, tiles; territory ownership; tree growth | Yes (tickResources) |
| Fog | `world/fog.js` | Visibility grid, per-tribe sight tracking | Moderate (every 5 ticks) |
| Diplomacy | `systems/diplomacy.js` | Relations, treaties, attack gating | Light (every tick, O(1)) |
| Tribe | `tribe/tribe.js` + `economy/building/military/population/unit-ai.js` | AI brain — split per concern | Yes (heaviest tick cost) |
| Render | `render/renderer.js` + `tiles/buildings/units/effects/combat.js` | Canvas 2D: tile buffer, sprites, weather, combat, fog overlay | Yes (every frame) |
| Systems | `systems/{calendar,weather,fracture}.js` | Calendar conversion, weather state machine, fracture/founding | Moderate |
| Game | `game.js` | Tick orchestration; owns `WeatherSystem` + `FractureSystem` instances | Moderate |

## Performance Architecture

### Spatial Hash (world.js)
Entity lookups (`getEntitiesAt`, `hasEnemyWall`) use a grid-cell spatial hash with 8-tile cells. O(1) instead of O(N) linear scans. Entities track their cell key; `notifyEntityMoved()` updates the hash.

### Tile Buffer (renderer.js)
Tiles render to an offscreen canvas. The buffer re-renders only when:
- Camera pans beyond 200px padding
- Zoom changes
- Territory updates (generation counter on `world._territoryGen`)
- Weather type changes

Steady-state cost: one `drawImage` blit per frame.

### Fog Overlay (renderer.js)
Fog draws **on top of** the tile buffer as a separate pass. UNEXPLORED tiles get a 85% dark hex overlay. EXPLORED tiles get 40%. VISIBLE tiles are skipped. The fog grid updates every 5 ticks.

**Optimization opportunity:** UNEXPLORED tiles in the tile buffer itself could be skipped entirely (don't render terrain under fog). Currently the terrain renders underneath and the fog overlay covers it.

### Resource Regen (world.js)
Instead of iterating all 36,864 tiles each tick, a `_regenTiles` list tracks only depleted tiles. Tiles drop off the list when they reach max. Harvesting re-adds them.

### Territory Count (world.js)
Cached with a dirty flag. `countTerritory()` only recomputes after `updateTerritory()` sets `_territoryDirty`.

## Key Systems

### Hunger & Food Carry
Units have `hunger` (0–60, increases by `HUNGER_RATE` per tick) and `carriedFood` (personal supply).

Eating priority:
1. Eat from `carriedFood` every `FOOD_CARRY_EAT_INTERVAL` ticks
2. If carry empty AND hungry → seek nearest STOREHOUSE/CAPITOL
3. At food building → eat from tribe supply AND refill carry
4. If no food anywhere → starvation timer (death after `HUNGER_DEATH_TICKS` at max hunger)

Carry capacity: `ceil((baseDays + ageIndex * perAgeDays) * TICKS_PER_DAY * HUNGER_RATE / HUNGER_FOOD_RESTORE)`

### Fracture → Migration → Founding

Lives in `systems/fracture.js` as `class FractureSystem` (game.js holds one instance as `fracture`).

**Phase 1 — Fracture** (`FractureSystem._trigger`):
- Calculates caravan resources (deducted from parent tribe)
- Calculates journey food per unit from distance
- Selects splinter units proportionally from each type
- Sets units marching with oversized carry capacity

**Phase 2 — Migration** (tick loop):
- tribeB ticks but has no buildings → subsystems no-op
- Units march and eat from carry
- `_checkFounding()` runs each tick

**Phase 3 — Founding** (`FractureSystem._checkFounding`):
- Triggers when any tribeB unit is within 3 tiles of target
- Places capitol + homes from caravan resources
- Transfers remaining caravan to tribeB.res
- Resets carry caps, stops marching

### Diplomacy Flow
`diplomacy.tick()` runs each game tick. Relations decay toward -30 (equilibrium hostility). Each attack shifts -3, building destruction shifts -8, treaties shift +15.

`tribe._doAttackLogic()` calls `diplomacy.shouldAttack()` before launching any assault. Return value is probabilistic based on relation state.

### Army System
When `_doAttackLogic` launches an assault:
1. Counts available idle warriors
2. Estimates campaign distance (manhattan to target)
3. Calculates food needed: `distance * moveInterval / eatInterval`
4. Draws food from tribe reserves into each unit's carry
5. If tribe can't supply enough, reduces army size to what it can feed
6. Army marches with full provisions

## Adding New Systems

### New Action
1. Add entry to `ACTIONS` object in `systems/actions.js`
2. Add action ID to relevant age's `actions` array in `config/ages.js`
3. `execute(player, tribe)` for targeted, `execute(player, tribeA, tribeB)` for global
4. Use `tribe.applyDebuff()`, `tribe.killUnits()`, `tribe.drainResources()` etc.

### New Building Type
1. Add to `CONFIG.ENTITY`, `CONFIG.BUILDING_HP`, `CONFIG.BUILDING_COST`, `CONFIG.BUILDING_MAX_LEVEL`
2. Add draw method `_drawMyBuilding()` in `render/buildings.js`
3. Add to the switch in `_drawBuilding()` (`render/buildings.js`)
4. Add build priority in `_doBuildLogic()` (`tribe/building.js`)

### New Unit Type
1. Add to `CONFIG.ENTITY`, `CONFIG.UNIT_HP`, `CONFIG.UNIT_STATS_BASE`
2. Add draw method in `render/units.js`
3. Add AI behavior in `_updateUnits()` (`tribe/unit-ai.js`)
4. Add spawn logic in `_doMilitaryLogic()` (`tribe/military.js`)

### New Tile Type
1. Add to `CONFIG.TILE` and `CONFIG.TILE_YIELD`
2. Add color in `_getTileColor()` baseColors (`render/tiles.js`)
3. Add biome yield in `_getFarmBiomeBaseYield()` (`tribe/economy.js`)
4. Add generation logic in `World.generate()` (`world/world.js`)

## Config Reference

All gameplay constants are in `config.js`. Developer overrides in `dev.js`. The DEV object provides multipliers that scale config values without modifying them directly.

See `dev.js` comments for every available knob.

## Debugging

- `DEV.DEBUG_LOG = true` — fracture/founding/diplomacy events to console
- `DEV.INVINCIBLE_TRIBES = true` — no lose conditions
- `DEV.NO_HUNGER = true` — disable hunger system
- `DEV.NO_SUSPICION = true` — disable suspicion
- Browser console: `Game.tribeA.res`, `Game.diplomacy.getScore('a','b')`, `Game.fog.getVisibility(x,y)`

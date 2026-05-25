# WARON — Development Reference

## Architecture

Pure client-side JavaScript. No build tools, no bundler, no server. Scripts load in dependency order via `<script>` tags in `index.html`. All state lives in the `Game` IIFE module which exposes a public API.

### Load Order (critical)
```
dev.js → config.js → ages.js → time_dilation.js → world.js → fog.js →
diplomacy.js → tribe.js → player.js → actions.js → renderer.js → ui.js → game.js
```

Later scripts may reference classes/constants from earlier ones at **load time**. References to `Game` (defined last) must use runtime guards: `typeof Game !== 'undefined' && Game.diplomacy`.

### Module Responsibilities

| File | Role | Hot path? |
|------|------|-----------|
| `world.js` | Map generation, spatial hash, tile data, territory, trees | Yes (tickResources) |
| `fog.js` | Visibility grid, per-tribe sight tracking | Moderate (every 5 ticks) |
| `diplomacy.js` | Relations, treaties, attack gating | Light (every tick, O(1)) |
| `tribe.js` | AI brain — economy, building, military, hunger, units | Yes (heaviest tick cost) |
| `renderer.js` | Canvas 2D rendering, tile buffer, sprites, weather, fog overlay | Yes (every frame) |
| `game.js` | Tick orchestration, fracture/founding, weather state machine | Moderate |

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

**Phase 1 — Fracture** (`_triggerFracture` in game.js):
- Calculates caravan resources (deducted from parent tribe)
- Calculates journey food per unit from distance
- Selects splinter units proportionally from each type
- Sets units marching with oversized carry capacity

**Phase 2 — Migration** (tick loop):
- tribeB ticks but has no buildings → subsystems no-op
- Units march and eat from carry
- `_checkFounding()` runs each tick

**Phase 3 — Founding** (`_checkFounding` in game.js):
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
1. Add entry to `ACTIONS` object in `actions.js`
2. Add action ID to relevant age's `actions` array in `ages.js`
3. `execute(player, tribe)` for targeted, `execute(player, tribeA, tribeB)` for global
4. Use `tribe.applyDebuff()`, `tribe.killUnits()`, `tribe.drainResources()` etc.

### New Building Type
1. Add to `CONFIG.ENTITY`, `CONFIG.BUILDING_HP`, `CONFIG.BUILDING_COST`, `CONFIG.BUILDING_MAX_LEVEL`
2. Add draw method `_drawMyBuilding()` in renderer.js
3. Add to the switch in `_drawBuilding()`
4. Add build priority in `_doBuildLogic()`

### New Unit Type
1. Add to `CONFIG.ENTITY`, `CONFIG.UNIT_HP`, `CONFIG.UNIT_STATS_BASE`
2. Add draw method in renderer.js
3. Add AI behavior in `_updateUnits()`
4. Add spawn logic in `_doMilitaryLogic()`

### New Tile Type
1. Add to `CONFIG.TILE` and `CONFIG.TILE_YIELD`
2. Add color in `_getTileColor()` baseColors
3. Add biome yield in `_getFarmBiomeBaseYield()`
4. Add generation logic in `World.generate()`

## Config Reference

All gameplay constants are in `config.js`. Developer overrides in `dev.js`. The DEV object provides multipliers that scale config values without modifying them directly.

See `dev.js` comments for every available knob.

## Debugging

- `DEV.DEBUG_LOG = true` — fracture/founding/diplomacy events to console
- `DEV.INVINCIBLE_TRIBES = true` — no lose conditions
- `DEV.NO_HUNGER = true` — disable hunger system
- `DEV.NO_SUSPICION = true` — disable suspicion
- Browser console: `Game.tribeA.res`, `Game.diplomacy.getScore('a','b')`, `Game.fog.getVisibility(x,y)`

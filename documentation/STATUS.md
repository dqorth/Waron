# Waron — Project Status

A living snapshot of what is built, what is partial, and what is planned in the
Waron codebase. For *what the game is*, see [`../README.md`](../README.md); for
the verbose per-function API, see [`CODEBASE_MAP.md`](CODEBASE_MAP.md).

- **Last updated:** 2026-05-25
- **Stage:** Playable prototype — the full loop (start → simulate → intervene → win/lose) runs end to end.
- **Stack:** Vanilla JS + HTML5 Canvas, no build step, no dependencies. Served as static files.
- **Architecture:** Composition pattern — subsystem classes hold parent references. Ready for ES module / TypeScript migration.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Done — implemented with real effects and wired into the running game |
| 🟡 | Partial — works but incomplete, simplified, or with known caveats |
| 🔧 | Built but not wired — code exists and loads, but nothing calls it yet |
| 📋 | Planned — referenced in code as future work, not started |

## At a Glance

| System | Status | Notes |
|---|---|---|
| Hex map & procedural generation | ✅ | 192×192 flat-top grid, 12 tile types |
| Resources, trees, harvesting | ✅ | Regenerating tile yields + tree-stage wood |
| Calendar (periods/days/months/years) | ✅ | Linear year formula + time dilation |
| Time dilation | ✅ | Per-era day scaling via `TimeDilation.getYearFromDays` |
| Weather (seasonal state machine) | ✅ | 7 types, season-weighted, applies sim modifiers |
| Tribe AI (build/grow/gather/fight) | ✅ | Autonomous factions via composition subsystems |
| Hunger + personal food carry | ✅ | Per-unit carry, age-scaled, starvation death |
| Tribe fracture / caravan / founding | ✅ | Single tribe splits, migrates, founds new settlement |
| 8-age progression (tribe + player) | ✅ | Tribe = time-based, player = threshold-based |
| Shadow actions | ✅ | 31 actions, all with real effects (27 original + 4 diplomacy) |
| Army logistics | ✅ | Supply estimation, food provisioning, army size capping |
| Fog of war | ✅ | Per-tribe visibility grid, combined player view, fog overlay, tile-skip optimization |
| Diplomacy | ✅ | Relation score, 5 states, attack gating, treaties, drift, 4 player actions, HUD indicator |
| Wildlife | ✅ | Deer/boar/fish spawn by biome, wander, flee, huntable by workers/scouts, respawn |
| Suspicion + balance | 🟡 | Win/lose works; suspicion is a synced value, not pattern-derived |
| Win / lose conditions | ✅ | Dominance, discovery, elimination |
| Canvas renderer | ✅ | Tile buffer, fog-aware tile skip, wildlife sprites, weather particles |
| HUD / modals / event log | ✅ | Full interaction layer + diplomacy indicator |
| Multi-faction (3+ tribes) | 📋 | `DEV.STARTING_TRIBES` reserves 3+ as experimental |

## Module Status (`js/`)

### Config (`js/config/`)

| File | Status | Summary |
|---|---|---|
| `dev.js` | ✅ | Developer overrides, debug flags, fracture narratives, system multipliers (fog, diplomacy, wildlife, army, terrain) |
| `config.js` | ✅ | All game constants — geometry, balance, tile yields, costs, stats, calendar, hunger, food carry, army logistics, wildlife, fog, diplomacy, render thresholds |
| `ages.js` | ✅ | 8 ages with year ranges, tribe caps, player thresholds, per-age action lists (including diplomatic actions) |
| `time-dilation.js` | ✅ | Per-era `daysPerYear` checkpoints, called by `calendar.js` |

### World (`js/world/`)

| File | Status | Summary |
|---|---|---|
| `world.js` | ✅ | Map generation, spatial hash, tiles/biomes, resource nodes, pathfinding |
| `territory.js` | ✅ | Territory ownership calculation with dirty-flag caching |
| `trees.js` | ✅ | Tree spawn, 4-stage growth, harvest, planting, nearby search |
| `wildlife.js` | ✅ | Animal spawn by biome, wander, flee from units, huntable for food, respawn timer |
| `fog.js` | ✅ | Visibility grid (UNEXPLORED/EXPLORED/VISIBLE), per-tribe sight, combined player view |

### Tribe (`js/tribe/`)

| File | Status | Summary |
|---|---|---|
| `tribe.js` | ✅ | Tribe class — state, init, tick orchestrator, public API |
| `economy.js` | ✅ | Resource gathering, farm workers, tech, passive metal/stone trickle |
| `building.js` | ✅ | Build logic, upgrades, placement, farm expansion |
| `military.js` | ✅ | Spawn, army formation with supply logistics, attack (diplomacy-gated), towers |
| `population.js` | ✅ | Growth, hunger, food carry, sync, spawning |
| `unit-ai.js` | ✅ | Unit behavior (warrior, worker, scout, normal), movement, combat, hunting AI |

### Systems (`js/systems/`)

| File | Status | Summary |
|---|---|---|
| `calendar.js` | ✅ | Time conversion with time dilation integration |
| `weather.js` | ✅ | Weather state machine, season weights, event messages |
| `fracture.js` | ✅ | Fracture trigger, caravan migration, settlement founding |
| `diplomacy.js` | ✅ | Relations, treaties, attack gating, drift, diplomatic events |
| `actions.js` | ✅ | 31 player actions (27 original + 4 diplomatic: broker_peace, incite_hatred, break_treaty, trade_disruption) |
| `player.js` | ✅ | Shadow Keeper state, essence/knowledge gain, suspicion, age progression |

### Render (`js/render/`)

| File | Status | Summary |
|---|---|---|
| `renderer.js` | ✅ | Camera, tile buffer, main render loop, hover, tooltip |
| `tiles.js` | ✅ | Tile drawing, hex geometry, colors, fog-aware tile skip |
| `buildings.js` | ✅ | 8 building sprite methods |
| `units.js` | ✅ | 5 unit sprites + 3 wildlife sprites (deer, boar, fish), gait, visual seed |
| `effects.js` | ✅ | Weather particles, fog overlay (CONFIG-driven alpha), battle line |
| `combat.js` | ✅ | Attack lines, tower beams |

### UI (`js/ui/`)

| File | Status | Summary |
|---|---|---|
| `ui.js` | ✅ | HUD, balance bar, diplomacy indicator, suspicion meters, action panel, event log |

### Game (`js/`)

| File | Status | Summary |
|---|---|---|
| `game.js` | ✅ | Main loop, speed control, system initialization (fog, diplomacy, wildlife), fracture orchestration, win/lose |

## Diplomatic Actions (new)

| Action | Unlock Age | Cost | Suspicion | Effect |
|---|---|---|---|---|
| Trade Disruption | Bronze | 140 | 8% | Relations -12, drain 80 resources from both tribes |
| Incite Hatred | Iron | 120 | 10% | Relations -20, boost both tribes' morale toward war |
| Broker Peace | Classical | 200 | 6% | Activate ceasefire treaty, relations +15 |
| Break Treaty | Medieval | 180 | 14% | Cancel active treaty, relations -25 |

## Known Gaps & Issues

- **🟡 Suspicion is a synced value, not behavior-derived.** Suspicion rises from
  action costs and decays over time, but is not yet computed from intervention
  *patterns* (frequency, repetition, targeting), so it is not adaptive.
- **🟡 Terrain detail balance.** Tree/biome detail zoom thresholds could use further
  tuning — `CONFIG.RENDER` values exist but not all are wired into the tile renderer yet.

## Planned / Future

- **📋 Multi-faction (3+ tribes).** `DEV.STARTING_TRIBES` documents `3+` as experimental.
- **📋 Pattern-derived suspicion.** Suspicion should increase based on intervention patterns, not just raw cost.
- **📋 CONFIG.RENDER wiring.** Tile renderer should read all detail thresholds from `CONFIG.RENDER` instead of hardcoded zoom values.

## Documentation

| Doc | Purpose | Status |
|---|---|---|
| `README.md` | Game overview, mechanics, how to run | ✅ |
| `documentation/CODEBASE_MAP.md` | Auto-generated verbose per-function JSDoc map | ✅ (regenerate via `generate_codebase_map.py`) |
| `documentation/STATUS.md` | This file — implementation status | ✅ |
| `documentation/DESIGN.md` | Game design document | ✅ |
| `documentation/DEVELOPMENT.md` | Technical reference for developers | ✅ |
| `documentation/REFACTOR.md` | Architecture plan (global classes + composition, TypeScript-ready) | ✅ |
| `documentation/REFACTOR_TS.md` | ES module + TypeScript migration reference | ✅ |

## Running Locally

Serve the repository root with any static server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Tune gameplay or flip debug flags
(`DEBUG_LOG`, `INSTANT_BUILD`, `NO_HUNGER`, `INVINCIBLE_TRIBES`, …) in
`js/config/dev.js` without touching core files.

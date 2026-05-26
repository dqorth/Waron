# WARON — The Shadow Keeper

A strategy simulation where two tribes clash at the dawn of civilization. You are the Shadow Keeper — an unseen force that feeds on conflict. Your goal: keep both tribes fighting forever. If either side wins, they find you. If either side discovers your influence, they unite against you.

## How to Play

Open `index.html` in a modern browser. No server needed.

**Controls:**
- Click and drag to pan the map
- Scroll wheel to zoom in/out
- Speed buttons (1x, 2x, 4x, pause) control simulation speed
- Click influence actions on the right panel to manipulate tribes
- Select a target tribe in the action modal, then execute

**Win condition:** There is none. You survive as long as possible.

**Lose conditions:**
- One tribe eliminates the other (they find you in their victory)
- One tribe's suspicion of you reaches 100% (they discover the pattern)
- Power imbalance exceeds 95% (dominant tribe conquers and notices you)

## Game Modes

### Fracture Mode (default)
One tribe begins at the center of the map. After a period of peaceful growth (120–250 ticks), an internal crisis fractures the tribe. The splinter faction packs supplies, marches to a new location, and founds a rival settlement. The war begins when they arrive.

Five fracture narratives: succession crisis, religious schism, territorial dispute, famine revolt, betrayal. Selected randomly or forced via `dev.js`.

### Classic Mode
Two tribes spawn on opposite sides of the map, already at war. Set `DEV.STARTING_TRIBES = 2` in `dev.js`.

## Systems

### Economy
Four resources: **wood** (from trees), **food** (from farms), **metal** (passive + tile harvesting), **stone** (passive + tile harvesting). Each has storage caps expanded by storehouses. Food spoils over time.

### Population
Growth requires homes (capacity) and food (fuel). Disease and food debuffs slow growth. Units spawn from buildings: warriors from barracks, workers from capitol, scouts from capitol.

### Hunger & Food Carry
Every unit has personal hunger and a **carried food supply**. Units eat from their personal carry first, only returning to food buildings when carry is empty. Carry capacity scales with age — Stone Age units carry 3 days of food, adding 1 day per age advancement. This enables long-range exploration and military campaigns.

### Military
Warriors form **armies** that estimate supply requirements before marching. Supply calculation considers distance to target and campaign duration. Armies draw food from tribe reserves. If supplies deplete mid-campaign, units eat from personal carry and eventually retreat.

### Wildlife
Huntable animals spawn across the map by biome — deer on grasslands, boar in forests, fish in wetlands. Units can hunt them for carried food, extending operational range during exploration and military campaigns. Animals wander, flee from nearby units, and respawn over time.

### Fog of War
Unexplored territory is shrouded in darkness. Units and buildings reveal surrounding tiles — scouts see farther (6 tiles), towers see far (7 tiles), civilians see little (2 tiles). Previously explored areas dim when no longer in sight range. The player sees the combined vision of both tribes.

### Diplomacy
Tribes have a relation score (-100 to +100) mapped to five states: hostile, wary, neutral, cordial, allied. Relations naturally drift toward slight hostility. Attacks worsen relations; treaties improve them temporarily. The diplomatic state gates attack probability — allied tribes never attack, hostile tribes always do.

### Weather
Seven weather types cycle seasonally: sunshine, overcast, rain, storm, drought, flood, snow. Weather affects farm output, unit movement speed, and food spoilage.

### Ages
Eight progression ages from Stone to Atomic, each unlocking new influence actions, raising population caps, and scaling military power. Ages advance when essence and knowledge thresholds are met.

## File Structure

```
Waron/
├── index.html              — Entry point, HUD layout, modals
├── README.md
├── css/
│   └── style.css           — All visual styling
├── js/
│   ├── dev.js              — Developer config (tweak without touching core)
│   ├── config.js           — Game constants and balance values
│   ├── ages.js             — Age definitions and progression
│   ├── time_dilation.js    — Time scaling system
│   ├── world.js            — Map generation, spatial hash, territory
│   ├── fog.js              — Fog of war visibility system
│   ├── diplomacy.js        — Inter-tribe relations and treaties
│   ├── wildlife.js         — Huntable animal spawning and behavior
│   ├── tribe.js            — Tribe AI, economy, military, hunger
│   ├── player.js           — Shadow Keeper state and progression
│   ├── actions.js          — Player influence actions
│   ├── renderer.js         — Canvas rendering, tile buffer, sprites
│   ├── ui.js               — HUD updates, modals, event log
│   └── game.js             — Main loop, tick, fracture, founding
└── documentation/
    ├── DEVELOPMENT.md      — Technical reference for developers
    ├── DESIGN.md           — Game design document
    ├── STATUS.md           — Development progress tracker
    └── REFACTOR.md         — Architecture and refactoring plan
```

## Quick Start for Developers

1. Open `js/dev.js` — all tunable parameters in one file
2. Set `DEV.DEBUG_LOG = true` for console output
3. Set `DEV.STARTING_TRIBES = 2` to skip fracture and test combat
4. Set `DEV.INVINCIBLE_TRIBES = true` to disable lose conditions
5. Adjust multipliers to speed up/slow down any system
6. See `documentation/DEVELOPMENT.md` for architecture details
7. See `documentation/REFACTOR.md` for the ES module migration plan

## License

[Your license here]

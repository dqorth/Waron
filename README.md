# Waron

Waron is a strategic flat-top hex-grid simulation game where two factions, **Ashan** (Tribe A) and **Koru** (Tribe B), clash in an endless conflict. 

As the player, you do not directly control units. Instead, you act as the **Shadow Keeper**—a hidden manipulator operating from the shadows. Your core objective is to **maintain balance** between the two warring tribes. If either tribe achieves total dominance, or if you act too conspicuously and a tribe discovers your influence, you lose.

---

## Core Gameplay Dynamics

### 1. The Balancing Act
The game is a delicate balancing act of power and territory.
* **Tribe A (Ashan)**: Starts on the west side of the map.
* **Tribe B (Koru)**: Starts on the east side of the map.
* **The Power Balance**: You must monitor the relative power fractions of each tribe. If one tribe achieves **`CONFIG.BALANCE_WARN` (70%)** or **`CONFIG.BALANCE_CRIT` (82%)** of the total power, you must intervene to assist the underdog. If one tribe hits **`CONFIG.BALANCE_LOSE` (95%)**, they win the war, and you lose.

### 2. Suspicion & Discovery
Interventions are not free. Every shadow action you take increases your **Suspicion** in the eyes of the targeted tribe.
* **Suspicion Decay**: Suspicion slowly decays over time by default (**`CONFIG.SUSPICION_DECAY`** per tick).
* **Thresholds**: 
  - **`CONFIG.SUSPICION_WARN` (60%)**: Tribes begin to notice patterns.
  - **`CONFIG.SUSPICION_CRIT` (80%)**: Alert levels rise.
  - **`CONFIG.SUSPICION_LOSE` (100%)**: The target tribe discovers your hand. The two tribes will immediately unite, end their war, and hunt you down (resulting in game over).

### 3. Dual Age Progression Systems
The concept of "Ages" in Waron operates under a split-progression design. The era of the tribes and the era of the player are tracked and advanced **independently**:

1. **Tribe Age (Time-Based)**: Faction progression is tied strictly to the calendar year. As years pass, the world automatically advances to later ages, which raises their maximum population capacity, technology ceilings, and military multipliers.
2. **Player Age (Threshold-Based)**: Your progression as the Shadow Keeper is tied to resource thresholds. You only advance to the next Age when you possess enough accumulated **Essence** and **Player Knowledge** (gained passively over time). Advancing your age unlocks more advanced and powerful shadow actions.

| Age | Time Period (Tribe) | Max Population (Tribe) | Max Tech Level (Tribe) | Military Scale (Tribe) | Player Requirements (Essence / Knowledge) | Unlocked Player Actions |
|---|---|---|---|---|---|---|
| **Stone Age** | Year 1 - 500 | 60 | 2 | 1.0 | 0 Essence / 0 Knowledge | Sabotage Food, Cause Disease, Gift Weapons |
| **Bronze Age** | Year 501 - 1200 | 200 | 5 | 2.5 | 300 Essence / 80 Knowledge | Incite Riot, Forge False Treaty, Border Dispute |
| **Iron Age** | Year 1201 - 2500 | 600 | 10 | 5.0 | 1,200 Essence / 250 Knowledge | Manipulate Weather, Kidnap Scholar, Forge Evidence |
| **Classical Age** | Year 2501 - 5000 | 2,000 | 18 | 10.0 | 3,500 Essence / 600 Knowledge | Poison Wells, Corrupt General, Inspire Prophet |
| **Medieval Age** | Year 5001 - 10000 | 8,000 | 30 | 20.0 | 10,000 Essence / 1,500 Knowledge | Plague Release, Economic Sabotage, Spy Network |
| **Renaissance** | Year 10001 - 20000 | 30,000 | 50 | 40.0 | 35,000 Essence / 4,000 Knowledge | Munitions Accident, Mislead Expedition, Religious Schism |
| **Industrial Age** | Year 20001 - 50000 | 200,000 | 80 | 100.0 | 120,000 Essence / 12,000 Knowledge | Industrial Sabotage, Mass Propaganda, Secret Arms Deal |
| **Atomic Age** | Year 50001+ | 2,000,000 | 150 | 500.0 | 500,000 Essence / 50,000 Knowledge | Nuclear Scare, Cyber Disruption, Satellite Interference |

---

## Technical & Simulation Mechanics

### 1. Hex-Grid Map & Resources (`js/world.js`)
The world is a flat-top hex grid of size **192 x 192**. Different tile types yield different resources:
* **Resources**: Wood, Food, Metal, Stone.
* **Tile Yields**:
  - **Grass**: Food (3)
  - **Wetland / Jungle**: High Food yields (4 - 5)
  - **Mountain**: Metal (4)
  - **Stone / Tundra**: Stone (2 - 4)
  - **Desert**: Low Food (1)
  - **Forest**: Does not yield passive resources; wood must be harvested directly from Tree entities.

### 2. Time & Weather Systems (`js/game.js`)
* **Calendar**:
  - 1 Tick = 1 Time Period (Dawn, Morning, Day, Dusk, Night).
  - 5 Ticks = 1 Day.
  - 27 Days = 1 Month (13 months per year, total of 351 days per year).
* **Weather**:
  - Weather changes dynamically, influenced by the current season.
  - Weather types like **Storm**, **Drought**, **Flood**, and **Snow** introduce simulation modifiers (e.g., snow increases movement times, droughts accelerate food spoilage and cripple farm yields).

### 3. Faction Simulation (`js/tribe.js`)
Tribes operate autonomously:
* **Buildings**: They build Capitols, Forts, Barracks, Farms, Towers, Homes, and Storehouses using their harvested resources.
* **Units**: Factions recruit Workers, Warriors, Scouts, and Leaders.
* **Unit Attributes**: Each unit has individual attributes (Strength, Loyalty, Agility, Tenacity, Endurance, Defense) with slight variances.
* **Hunger Mechanic**: Units get hungry over time. If they cannot access food, they will eventually starve.

---

## Codebase Map & Automated Documentation

The Waron codebase is fully documented using a strict, structured JSDoc layout describing the function workflow, parameters, return types, dependencies, modified states, triggers, and Big-O performance.

A Python-based AI doc-agent is provided to scan, automatically format, and inject detailed JSDocs directly into the JavaScript files.

### How to Run the Doc Generator

1. **Install Python library**:
   ```bash
   pip install google-generativeai
   ```

2. **Run the script**:
   Make sure to export your API key first. You can also override the default model.
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   export GEMINI_MODEL="gemini-2.5-flash"  # Optional: defaults to gemini-2.5-flash
   
   python3 generate_codebase_map.py
   ```

The script will:
1. Scan `/js` for all JavaScript modules.
2. Send undecorated functions to the Gemini API to analyze logic and complexities.
3. Automatically write JSDoc headers directly back into the `.js` files.
4. Output a comprehensive codebase outline in `/documentation/CODEBASE_MAP.md`.

---

## Getting Started

To run the game locally, you only need to serve the root directory. You can use any lightweight local web server.

For example, using Python:
```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

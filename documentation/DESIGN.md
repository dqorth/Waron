# WARON — Game Design Document

## Core Fantasy

You are an immortal parasite that feeds on war. Two tribes clash. You need them to keep fighting — forever. You cannot let either side win, and you cannot be discovered.

The tension: every action you take risks revealing your existence. Push too hard and they notice the pattern. Do nothing and one side dominates.

## Design Pillars

### 1. Asymmetric Information
The player sees everything both tribes see (combined fog of war). The tribes see only their own territory. This omniscience is the player's primary advantage — and the source of their power.

### 2. Emergent Narrative
The fracture cause is randomized. Diplomatic relations evolve from tribe behavior. Weather disrupts plans. The player's story is unique every playthrough, told through the event log.

### 3. Escalating Complexity
Ages unlock new influence actions. Early game: sabotage food, kill leaders. Late game: nuclear scares, satellite blackouts, cyber warfare. The tools scale but so do the consequences.

### 4. Visible Consequence
Every action has a visible ripple. Poison wells → disease spreads → population drops → military weakens → enemy attacks → buildings burn. The player watches the chain reaction they started.

## Narrative Arc

### Act I — Unity (0–250 ticks)
One tribe. Peaceful growth. The player watches, gathers essence, waits. Tension builds through event log hints — political grumbling, resource disputes, religious disagreements.

### Act II — The Fracture
A dramatic event splits the tribe. The cause colors the relationship — a religious schism produces different dynamics than a succession crisis. The splinter group packs supplies and marches across the map. The player watches the column of figures crossing dark, unexplored terrain.

### Act III — Two Nations
The splinter tribe founds a settlement. Initial relations are wary (-40). Without player intervention, the drift toward hostility is slow — diplomacy keeps them cautious. The player's job is to accelerate the slide into war.

### Act IV — Eternal War
Once hostilities begin, the player manages balance. Too much intervention raises suspicion. Too little lets one side dominate. The game becomes a juggling act — boost the weak, cripple the strong, maintain the illusion that the war is natural.

## Systems Design

### Food Carry & Logistics
Units carry personal food supplies. This creates genuine logistics — armies can't march indefinitely, scouts must plan their routes, workers range farther in later ages. The carry system makes distance meaningful.

Army supply calculation: before marching, the tribe estimates food needed for the campaign. If it can't supply enough, it sends a smaller force. Mid-campaign starvation forces retreat. This creates natural ebb and flow — tribes can overextend.

### Huntable Wildlife
Animals spawn on fertile tiles (forest, grassland, jungle, savanna). Units can hunt them for carried food, extending their operational range. This makes terrain meaningful — a forest isn't just green hexes, it's a food source for marching armies.

Animal types scale with biome: deer on grassland, boar in forests, fish in wetlands. Hunting depletes local populations which regenerate over time.

### Diplomacy as Gameplay
Relations aren't just flavor — they gate combat. CORDIAL tribes almost never fight (8% attack chance). The player must actively poison relations to generate war. This creates a new failure mode: if the player is too subtle, the tribes make peace and the player starves for essence.

Treaty system: tribes can propose ceasefires. The player can forge false treaties (to create complacency) or break real ones (to reignite war).

### Fog of War as Mystery
The shroud isn't just visual — it represents the unknown. When the splinter tribe marches into darkness, neither the player nor the remaining tribe knows exactly where they'll settle. The reveal is dramatic: a new settlement blooming from the fog.

Fog also creates strategic depth: tribes can't see each other's full territory. Scouts become critical intelligence assets. The player's omniscience (seeing both fogs combined) is their divine advantage.

### Weather as Disruption
Weather isn't background — it gates strategy. Drought devastates farming tribes, storms slow armies, floods block territory. A well-timed weather manipulation action during a drought can break a tribe's economy.

## Balance Philosophy

The game should feel like spinning plates. Each system (food, military, diplomacy, suspicion, balance) is a plate that wobbles toward failure. The player's job is to keep all plates spinning — but each touch risks toppling another.

**Key tensions:**
- Action vs. suspicion — every influence raises risk of discovery
- Balance vs. engagement — perfectly balanced tribes stop fighting
- Short-term vs. long-term — crippling a tribe now helps balance but weakens future war potential
- Essence vs. knowledge — spending essence on actions delays age advancement

## Future Considerations

- **More than 2 tribes:** The fracture system could recursively split tribes, or new tribes could migrate from map edges
- **Trade routes:** Visible caravan paths between settlements that can be disrupted
- **Culture/religion:** Distinct tribal identities that affect diplomacy and military behavior
- **Espionage:** Planted agents provide intelligence and can trigger events from within
- **Victory ages:** Late-game scenario where tribes approach nuclear capability and the player must prevent mutually assured destruction

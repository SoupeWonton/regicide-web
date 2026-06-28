---
type: index
status: current
authority: derived
topics: [kingfall, landmarks, routes, locations]
search_terms: [Kingfall landmarks, locations, map nodes, Camp Forge Lair Shrine Tower Market Abbey Events Hunt]
sources: [canon/principles/content-bar.md, canon/v3/constraints.md, canon/v3/systems/deck-and-grafts.md, proposals/open-design-questions.md, proposals/lore/context-lore.md, research/simulation/findings.md, archive/v2/systems/landmarks.md, archive/v2/systems/road.md, ../server/campaign/types.ts, ../server/campaign/maps.ts, ../server/campaign/campaign.ts]
aliases: [Landmarks, Kingfall Landmarks, Locations, Route Landmarks]
last_updated: 2026-06-21
---

# Landmarks

**Summary:** The landmark system organizes short route decisions around one legible verb while keeping active V3 locations separate from historical content.

**Landmarks** are destinations or non-standard encounters chosen along Kingfall's campaign road. A valid landmark should own one recognizable verb, create a route tradeoff, and change decisions through the existing deck or combat engine rather than add a generic reward wallet. Only a small part of the current landmark set is confirmed V3 design; many named locations come from the developed V2 campaign and require redesign. (source: [[canon/principles/content-bar|Content bar]])

## Landmark directory

| Landmark | Intended or historical role | V3 status |
|---|---|---|
| [[v3/landmarks/v2/camp|Camp]] | Full rest, reshuffle, redraw, planning | Rest behavior confirmed; cadence open |
| [[v3/landmarks/v2/forge|Forge]] | Rearrange existing replacement grafts | Accepted direction; exact verb open |
| [[v3/landmarks/v2/lair|Lair]] | Elite risk for rare payoff | Historical/exploring |
| [[v3/landmarks/v2/abbey|Abbey / Sanctum]] | Recovery, rites, or spells | Historical; conflicts with spell removal |
| [[v3/landmarks/v2/market|Market / Caravan]] | Trade, value correction, or rare offer | Historical; V3 role unresolved |
| [[archives/v2/landmarks/tower|Tower]] | Initiative or boss information | Historical; failed solo-value test |
| [[v3/landmarks/v2/shrine|Shrine]] | Partial recovery, cleanse, or blessing | Historical; role unresolved |
| [[v3/landmarks/v2/events|Events]] | Non-combat choice with run consequences | Test-grade catalog; final category open |
| [[v3/landmarks/v2/hunt|Hunt]] | Pursue a missed recruit through combat | Active proposal; not implemented |
| Fallen Heroes | Swap the class **Staff** (mix one class's ladder with another's staff) | Accepted direction; placement/cost open |

## How landmarks fit into the road

The developed road uses authored layers, partial visibility, one-way route commitment, and deterministic map generation. Camp and boss nodes are visible; other nodes may be hidden until approached. Those map rules come from older delivery and have not all been reaccepted for the continuous five-act campaign. (sources: [[archive/v2/systems/road|V2 Road]], implementation: `server/campaign/maps.ts`, `server/campaign/campaign.ts`)

The current V3 design question is smaller than “which old landmarks do we keep?” The project first asks which verbs the deck needs: rest/recover, graft rearrangement if necessary, a rare relic tradeoff, and a way to Hunt a recruit or harder reward. A named location survives only if it carries one of those decisions more clearly than an existing node. (source: [[proposals/open-design-questions|Active design questions]])

## Confirmed design

- Every landmark needs one recognizable verb and a route opportunity cost.
- Landmark rewards should affect the deck or an existing loop, not create another wallet.
- The Forge cannot mint new graft power. It also **assembles spell crystals** — combining
  suit-specific fragments into a Half, and (once unlocked) a Half/fragments into a non-castable
  Full. See [[v3/mechanics/items-and-power-vehicles|crystal spells]].
- **Fallen Heroes** swaps the class Staff (the swappable passive enabler); the class ladder stays.
- Explicit rests are the only normal reshuffle/redraw boundary.
- CT values are backend design/debug information and never player-facing. (sources: [[canon/principles/content-bar|Content bar]], [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[canon/v3/constraints|V3 constraints]])

## Current implementation

The engine currently recognizes Camp, Forge, Abbey, Market, Tower, Shrine, Lair, and Event node kinds. Hunt is not a node kind. Most current handlers implement older spells, relic slots, tokens, curses, or chapter maps, so existence in code proves shipped behavior but not V3 acceptance. (implementation: `server/campaign/types.ts`, `server/campaign/maps.ts`, `server/campaign/campaign.ts`)

## Not yet decided

- The final landmark roster and names.
- Route visibility, commitment, frequency, and act placement.
- Exact costs and reward vehicles.
- Which locations host recovery, relics, recruitment, or transformation.
- Multiplayer voting and character-specific interaction.
- Which developed handlers are migrated, replaced, or removed. (source: [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/mechanics/deck-lifecycle]]
- [[v3/stages/act-pressure-model]]
- [[v3/design/maps/v3-system-map]]
- [[v3/design/product/lore-and-terminology]]

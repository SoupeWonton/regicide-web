---
type: landmark
status: accepted-direction
authority: derived
topics: [kingfall, landmark, forge, grafts, card-identity]
search_terms: [Kingfall Forge, move graft, rearrange rank, rearrange suit, card modification]
sources: [canon/principles/content-bar.md, canon/v3/systems/deck-and-grafts.md, decisions/2026-06-18-v3-foundation.md, decisions/2026-06-20-replacement-graft-semantics.md, delivery/current-state.md, delivery/migration-v2-to-v3.md, proposals/open-design-questions.md, archive/v2/systems/landmarks.md, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Forge, Kingfall Forge, Graft Forge]
last_updated: 2026-06-21
---

# Forge

**Summary:** Forge is the proposed graft-rearrangement landmark and may reorganize earned card changes without creating new power.

The **Forge** is Kingfall's card-rearrangement landmark. Its accepted V3 direction is narrow: it may reorganize replacement grafts the player already earned through exact kills, but it cannot create new rank or suit power. The exact rearrangement action is not yet decided. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

| Quick fact | Current answer |
|---|---|
| Landmark role | Reorganize existing card transformations |
| Confirmed restriction | Creates no new graft power |
| Candidate actions | Transfer, swap, restoration, destructive overwrite |
| Current implementation | Still offers/mints older token effects |
| Migration status | Pending and explicitly drifted |

## What it is

[[v3/mechanics/replacement-grafts|Replacement grafts]] permanently change one hand card's rank or suit after an owned exact kill. The Forge is intended as a possible recovery or reconfiguration point for those decisions. It cannot become a shop that sells upgrades, because exact kills—not a landmark wallet—are the source of permanent card power. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

This restriction protects the conquest loop. If the Forge freely manufactures ranks, suits, or arbitrary tokens, a player can bypass the enemy identity and tactical precision that make the deck personal. If it rearranges too freely, it may also erase the consequence of earlier graft choices. (sources: [[decisions/2026-06-18-v3-foundation|V3 foundation]], [[proposals/open-design-questions|Active design questions]])

## Confirmed design

- The fragment wallet and post-Council fragment shop are removed.
- Exact kills apply rank-or-suit replacements.
- The Forge may reorganize existing grafts.
- The Forge does not mint new rank or suit changes. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[delivery/migration-v2-to-v3|Migration specification]])

## Current design work

Four possible verbs are being considered: **transfer** a graft between cards, **swap** properties, **restore** a previous property, or allow a **destructive overwrite**. Each creates different permanence and costs. The project is also asking whether a Forge is necessary at all before irreversible grafting demonstrates a real recovery problem. (source: [[proposals/open-design-questions|Active design questions]])

## Current implementation

The developed Forge is still part of the older token economy. Under the ascending-deck experiment it offers token stamps and uses token budgets/fragments; other modes may offer relics. This behavior conflicts with the accepted replacement-only direction and is scheduled for migration. (sources: [[delivery/current-state|Current state]], implementation: `server/campaign/campaign.ts`, `server/campaign/maps.ts`)

## Historical design

The V2 landmark upgraded card value or converted a low card into an Animal Companion at a milling cost. Later V2 designs used Forge nodes to mint a large token vocabulary. These mechanics explain the existing code but have no authority over the V3 Forge. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[delivery/migration-v2-to-v3|Migration specification]])

## Not yet decided

- Whether the Forge survives after graft playtesting.
- Which graft properties it can move.
- Transfer, swap, restoration, or overwrite semantics.
- The cost, frequency, target restrictions, and no-op rules.
- Whether rearrangement preserves visible card history.
- How Forge actions validate, persist, and display in multiplayer. (sources: [[proposals/open-design-questions|Active design questions]], [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

## Connections

Forge depends on the unresolved [[v3/mechanics/deck-lifecycle|deck lifecycle]] and the final presentation of [[v3/mechanics/replacement-grafts|transformed cards]]. It must remain a route tradeoff under the [[v3/design/foundations/content-bar|content bar]], not an automatic cleanup stop that makes every previous choice reversible. (sources: [[proposals/open-design-questions|Active design questions]], [[canon/principles/content-bar|Content bar]])

## Related pages

- [[v3/landmarks/camp]]
- [[v3/landmarks/market]]
- [[v3/mechanics/replacement-grafts]]
- [[v3/mechanics/deck-lifecycle]]

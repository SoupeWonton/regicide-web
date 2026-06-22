---
type: landmark
status: exploring
authority: derived
topics: [kingfall, landmark, hunt, recruitment, recovery, conquest]
search_terms: [Kingfall Hunt, missed recruit, find card, recruitment recovery, enemy recurrence]
sources: [canon/v3/vision.md, canon/v3/systems/deck-and-grafts.md, proposals/open-design-questions.md, proposals/systems/deck-lifecycle.md, proposals/systems/relics-and-spell-cards.md]
aliases: [Hunt, Recruit Hunt, Earned Hunt]
last_updated: 2026-06-21
---

# Hunt

**Summary:** Hunt is a proposed conquest-recovery landmark where the player selects an eligible card, fights it, and must still exact-kill it to recruit it.

A **Hunt** is a proposed V3 landmark that lets the player deliberately pursue a missed recruitment opportunity. It is not implemented and not canon. Its defining constraint is that it exposes an enemy to fight; it never grants the card directly, so acquisition remains conquest-first. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[canon/v3/vision|V3 vision]])

| Quick fact | Current answer |
|---|---|
| Proposed role | Player-authored recovery after missed recruitment |
| Player cost | Surrender another route opportunity |
| Reward | A chance to fight and exact-kill a bounded missed enemy |
| Canon status | Exploring |
| Implementation | None as a dedicated node kind |

## What it is

Missing an exact kill can leave a useful enemy outside the deck. In the earned-curation model, a Hunt allows the player to sacrifice another landmark or route reward to pursue one of a bounded set of missed enemies. The player still needs to survive the fight and land an exact kill. (source: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

This creates **controlled recurrence**: the player influences what returns without receiving a normal draft. The cost matters because an unrestricted Hunt could become mandatory whenever the deck is weak, while a free card would violate the game's core promise that every acquired card was conquered. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[canon/v3/vision|V3 vision]])

## Confirmed design

Only the boundaries around Hunt are confirmed: acquisition is conquest-first, exact kills connect combat to progression, and recovery must not create a second drafting economy. Hunt itself is not accepted. (sources: [[canon/v3/vision|V3 vision]], [[canon/v3/systems/deck-and-grafts|Deck and grafts]])

## Current design work

Hunt belongs to the proposed **earned curation** model. The current refinement presents a selection of eligible missed or unowned cards; the player chooses the target, then must fight and exact-kill that specific enemy. Hunt grants no spell or relic because its verb is authored recruitment through combat. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Not yet decided

- Whether Hunts exist.
- Which missed enemies are eligible and how they are presented.
- The route opportunity or other cost.
- Encounter difficulty and exact-kill requirements.
- Frequency, act restrictions, and protection against mandatory use.
- Whether Hunt also offers harder rewards or replaces another named landmark.
- How Hunts interact with starting ownership, royals, and multiplayer choice. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[proposals/open-design-questions|Active design questions]])

## Connections

Hunt directly connects [[v3/mechanics/conquest-first-acquisition|conquest]], [[v3/mechanics/exact-kills|precision]], and [[v3/mechanics/deck-lifecycle|recovery]]. It could also provide a V3-compatible replacement for the buying fantasy of [[v3/landmarks/market|Market]] or the combat-risk identity of [[v3/landmarks/lair|Lair]], but combining those roles would need deliberate consensus. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/landmarks/market]]
- [[v3/landmarks/lair]]
- [[v3/mechanics/conquest-first-acquisition]]
- [[v3/mechanics/deck-lifecycle]]

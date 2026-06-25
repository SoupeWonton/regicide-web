---
type: landmark
status: historical-and-unresolved
authority: derived
topics: [kingfall, landmark, abbey, sanctum, spells, recovery]
search_terms: [Kingfall Abbey, Sanctum, spell landmark, recovery landmark]
sources: [canon/principles/content-bar.md, canon/v3/systems/items.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/relics-and-spell-cards.md, delivery/migration-v2-to-v3.md, research/simulation/findings.md, archive/v2/systems/landmarks.md, archive/v2/items/spells.md, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Abbey, Kingfall Abbey, Sanctum]
last_updated: 2026-06-21
---

# Abbey

**Summary:** Abbey or Sanctum is a historically spell-aligned landmark whose exact V3 verb remains under design.

The **Abbey** is a historical recovery and spell landmark, also called the **Sanctum** in parts of the developed V2 campaign. Its name remains a worldbuilding peg, but its spell inventory, exile rites, and low-rank amplification are not confirmed V3 mechanics. (sources: [[proposals/lore/context-lore|Context lore proposal]], [[delivery/migration-v2-to-v3|Migration specification]])

| Quick fact | Current answer |
|---|---|
| Historical role | Recovery, refinement, spells/rites |
| Developed role | Sanctum rite choice or spell offer |
| V3 status | Landmark identity unresolved |
| Major conflict | Standalone spell inventory is removed from V3 |

## What it is

In older designs, the Abbey recovered or exiled cards and could temporarily amplify low ranks. In the developed ascending-deck mode, the corresponding Sanctum presents immediate rites; in other modes the Abbey offers spells. These behaviors belong to the system V3 is migrating away from. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], implementation: `server/campaign/campaign.ts`)

## Confirmed design

There is no canonical V3 Abbey mechanic. Standalone spell inventory and spell currency are removed; burst effects should live on cards or existing combat actions. Permanent card removal is an open lifecycle axis, so an old exile rite cannot be assumed valid. (sources: [[delivery/migration-v2-to-v3|Migration specification]], [[canon/v3/systems/items|Items]])

## Evidence and history

V2 gave the Abbey a disciplined-recovery identity: recover/exile discard cards or provide tightly timed low-rank doubling. Historical simulation found Forge, Market, and Abbey results statistically indistinguishable, suggesting that several named landmarks had collapsed into similar item menus. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[research/simulation/findings|Simulation findings]])

## Current design work

The golden spell-card proposal identifies Abbey/Sanctum as one possible place to awaken a dormant suit spell or upgrade a held standard spell to rare. The alternative is to put acquisition and upgrades in the hand-value Market economy instead; both locations should not become interchangeable spell menus. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Not yet decided

- Whether Abbey or Sanctum survives as a V3 location.
- Which single accepted verb it would own.
- Whether it is recovery, transformation, event fiction, or removed entirely.
- How it differs from Camp, Shrine, Forge, and rare relic encounters.
- Whether any old rite solves a demonstrated lifecycle problem. (source: [[proposals/open-design-questions|Active design questions]])

## Connections

Any future Abbey must respect [[v3/mechanics/items-and-power-vehicles|spell removal]], [[v3/mechanics/deck-lifecycle|open curation]], and [[v3/landmarks/v2/camp|Camp's]] ownership of full rest. Its strongest current value is historical: it shows why a location needs a unique verb rather than a differently themed reward screen. (sources: [[delivery/migration-v2-to-v3|Migration specification]], [[canon/principles/content-bar|Content bar]])

## Related pages

- [[v3/landmarks/v2/shrine]]
- [[v3/landmarks/v2/camp]]
- [[v3/mechanics/items-and-power-vehicles]]
- [[v3/mechanics/deck-lifecycle]]

---
type: landmark
status: historical-retired-from-active-v3
authority: derived
topics: [kingfall, landmark, tower, initiative, information, boss-intel]
search_terms: [Kingfall Tower, choose starting player, boss intel, initiative landmark]
sources: [canon/principles/content-bar.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/relics-and-spell-cards.md, research/simulation/findings.md, archive/v2/systems/landmarks.md, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Tower, Kingfall Tower, Intel Tower]
last_updated: 2026-06-21
---

# Tower

**Summary:** Tower is a retired V2 initiative and information landmark preserved for historical searchability rather than active V3 navigation.

The **Tower** is a retired historical initiative and information landmark. Its developed reward lets the party choose who starts the next encounter or study the court for boss information, but the active V3 brainstorm removes Tower because current roads are too short for that Darkest Dungeon-style role to matter. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[research/simulation/findings|Simulation findings]], [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

| Quick fact | Current answer |
|---|---|
| Historical verb | Choose the next starting player |
| Developed alternative | Reveal boss intel |
| V3 status | Retired from the active proposal; historical only |
| Main evidence | Initiative is a no-op in solo |

## What it is

In multiplayer, choosing the next starting hero can affect access to class abilities, hand state, or sequencing. In solo there is no alternative starter, so the reward does nothing. The current handler also offers an `intel` option that stores boss foreknowledge, although exact presentation and later-boss data are tied to older campaign structures. (sources: [[research/simulation/findings|Simulation findings]], implementation: `server/campaign/campaign.ts`)

## Confirmed design

There is no canonical V3 Tower mechanic. Fight rules should be visible before punishment, so information control may be valuable, but that principle does not confirm Tower as the delivery vehicle. (sources: [[canon/principles/content-bar|Content bar]], [[proposals/open-design-questions|Active design questions]])

## Evidence and history

V2 defined Tower around initiative and information, with a standard next-encounter starter choice and a stronger chapter-long version. Simulation concluded that the standard reward was literally ineffective for solo, which represented most expected play. Later developed maps retired Tower from Province 1 while leaving it in older chapter variants. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[research/simulation/findings|Simulation findings]], implementation: `server/campaign/maps.ts`)

## Current V3 disposition

Tower has no active replacement mechanic and should not receive an unrelated item offer merely to preserve its name. Its page remains for historical searchability; it is not part of the proposed V3 landmark set. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Connections

Tower overlaps [[v3/design/product/ui-ux-contract|information fairness]], [[v3/stages/act-pressure-model|telegraphed pressure]], and route planning. Its history demonstrates why a landmark must create a real decision for every supported player count. (sources: [[canon/principles/content-bar|Content bar]], [[research/simulation/findings|Simulation findings]])

## Related pages

- [[v3/landmarks/v2/events]]
- [[v3/stages/act-pressure-model]]
- [[v3/design/product/ui-ux-contract]]

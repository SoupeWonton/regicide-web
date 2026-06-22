---
type: concept
status: exploring
authority: derived
topics: [kingfall, classes, character-progression, facets]
search_terms: [Kingfall class progression, class tiers, character facets, class upgrades]
sources: [canon/principles/design-practice.md, canon/v3/classes/overview.md, decisions/2026-06-18-v3-foundation.md, proposals/classes/README.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md, proposals/open-design-questions.md]
aliases: [Class Progression, Linear Tiers versus Facets, Character Progression]
last_updated: 2026-06-21
---

# Class progression

**Summary:** Class progression deepens each class's innate loophole across the expedition, but its exact linear or facet-based structure remains proposed.

Class progression is the unresolved system that determines how a character's innate loophole becomes deeper during a five-act expedition. Progression is confirmed to exist, but its exact structure is not canon: the project is comparing a fixed three-tier ladder with a model based on mutually exclusive facets. (sources: [[canon/v3/classes/overview|Classes]], [[proposals/classes/README|Class workspace]])

| Quick fact | Current answer |
|---|---|
| Confirmed | Each class has one loophole that deepens during the expedition |
| Separate points/tree currency | Rejected for V3 |
| Model A | Fixed linear three-tier path |
| Model B | One invariant loophole plus one mutually exclusive facet |
| Current state | Exploring competing proposals |
| Implementation | Not ready for delivery |

## Confirmed design

Progression belongs to the character's innate loophole, not to relic slots, a Lair currency, or a separate skill-tree wallet. Every deepening should continue modifying the class's existing loop station rather than add another simultaneous subsystem. The class remains the verb—Block, Kill, Combine, or Persist—throughout the run. (sources: [[canon/v3/classes/overview|Classes]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Linear progression proposal

The linear proposal gives each class a predetermined ladder of three abilities. One tier deepens automatically as the campaign advances. It is easy to explain and creates a clear power arc, but it risks making two runs with the same class follow the same identity regardless of the conquered deck. Its exact abilities are documented on the individual character pages. (source: [[proposals/classes/four-core-classes|Four core classes]])

| Character | Linear direction |
|---|---|
| Sentinel | Exact block → stored/converted defense → negate and reflect |
| Executioner | Wider kill window → kill chains → royal-focused cascade |
| Quartermaster | Larger hand/draw → larger combinations → repeated refill |
| Surgeon | Repeated recovery → targeted recovery → full-deck recurrence |

## Facet progression proposal

A **facet** is one mutually exclusive expression of the permanent class verb. Sentinel always owns Block, for example, but Bastion could store defense while Riposte converts it into offense. Only one facet is active in an expedition, so unlocking more facets broadens future possibilities without stacking more passives. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

The proposed act flow is: learn the base loophole during Claim; select or discover a facet during Shape after seeing part of the deck; gain its primary payoff during Exploit; gain resilience during Adapt; and reach its capstone during Master. Delaying the facet until some cards are known is intended to make the character respond to the run rather than fully prebuild it in the lobby. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

The facet model can multiply with campaign pressure. The same Sentinel Riposte build would make different decisions under an attrition-heavy Long War than under a tempo-heavy Rising Court. This creates breadth from four deep classes instead of immediately restoring a shallow nine-character roster. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Current proposed test scope

The exploratory packet suggests four classes, two facets per class available initially, one additional unlockable facet per class, one default pressure permutation, two unlockable permutations, and a constant offer of one facet from two. This is a test budget, not accepted launch content. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Not yet decided

- Which progression model is accepted.
- The exact Act 1 loophole for each class.
- When the player commits to a facet, if facets are used.
- Whether a facet is chosen, discovered, seeded, or offered by faction.
- Exact tier/facet effects, names, values, and unlock conditions.
- Alternative starting hands and their relationship to facets.
- How progression is shared or owned in multiplayer. (sources: [[proposals/classes/README|Class workspace]], [[proposals/open-design-questions|Active design questions]])

## Implementation status

Neither proposal is ready to implement as the authoritative V3 class system. Delivery can prepare generic class hooks only if they do not silently choose linear tiers or facets. Once consensus is reached, canon, a decision record, delivery status, UI requirements, save state, and test coverage must change together. (sources: [[canon/principles/design-practice|Design practice]], [[proposals/classes/README|Class workspace]])

## Connections

Class progression depends on [[v3/mechanics/deck-lifecycle|starting ownership and deck size]] and must be tested against [[v3/stages/act-pressure-model|five-act pressure]]. It also supplies candidate unlock breadth for [[v3/stages/death-and-meta-progression|meta progression]], but cannot duplicate [[v3/mechanics/items-and-power-vehicles|relics]] or turn the class into several simultaneous systems. (sources: [[proposals/open-design-questions|Active design questions]], [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Related pages

- [[v3/classes/class-identity]]
- [[v3/classes/sentinel]]
- [[v3/classes/executioner]]
- [[v3/classes/quartermaster]]
- [[v3/classes/surgeon]]
- [[v3/stages/act-pressure-model]]

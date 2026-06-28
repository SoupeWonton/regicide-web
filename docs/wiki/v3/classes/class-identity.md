---
type: concept
status: current
authority: derived
topics: [kingfall, classes, characters, identity, combat-loop]
search_terms: [Kingfall classes, character selection, hero classes, class loophole, starting hand]
sources: [canon/v3/classes/overview.md, decisions/2026-06-18-v3-foundation.md, decisions/2026-06-20-five-act-continuous-expedition.md, delivery/current-state.md, proposals/open-design-questions.md, proposals/classes/README.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md]
aliases: [Class Model, Kingfall Classes, Character Classes]
last_updated: 2026-06-21
---

# Classes

**Summary:** A V3 class combines a distinctive starting hand with one innate exception to a specific station of the shared card loop.

Classes are Kingfall's playable character identities. A class changes how the player approaches the shared card game by giving them a distinctive starting hand and one innate **loophole**—a rule exception tied to a specific part of combat. Four class identities are confirmed for V3: [[v3/classes/sentinel|Sentinel]], [[v3/classes/executioner|Executioner]], [[v3/classes/quartermaster|Quartermaster]], and [[v3/classes/surgeon|Surgeon]]. (source: [[canon/v3/classes/overview|Classes]])

| Quick fact | Current answer |
|---|---|
| Category | Playable character / campaign identity |
| Confirmed roster | Sentinel, Executioner, Quartermaster, Surgeon |
| Identity formula | Starting hand + one innate loophole |
| Progression | The loophole deepens during the expedition |
| Separate skill currency | None |
| Exact kits | Not yet canon |
| Implementation | V3 class rewrite pending |

## What a class is

Every class plays through the same [[v3/mechanics/core-loop|combat loop]]—draw, combine, kill, block, and persist—and uses the same conquered expedition deck. The character is not a separate deckbuilder with unrelated cards or resources. Instead, its loophole changes one existing loop station so the same card can invite different decisions for different characters. (sources: [[canon/v3/classes/overview|Classes]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

The starting hand is the character's immediate introduction. It should make the class readable from the opening fight by supplying cards that demonstrate its preferred verb. As the player recruits enemies, that opening arrangement may dissolve into the larger deck; the innate loophole remains the character's persistent identity. This lets a class influence a run without deciding the finished build before play begins. (source: [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Confirmed design

The accepted V3 roster owns four different loop stations and four different strategic roles. (source: [[canon/v3/classes/overview|Classes]])

| Class | Owned station | Broad role | Intended strategic identity |
|---|---|---|---|
| [[v3/classes/sentinel|Sentinel]] | Block | Defense / inevitability | Turn blocking and survival into an engine. |
| [[v3/classes/executioner|Executioner]] | Kill | Aggression / momentum | Exploit exact-kill opportunities and cascading kills. |
| [[v3/classes/quartermaster|Quartermaster]] | Combine | Tempo / large turns | Hold and combine cards beyond ordinary limits. |
| [[v3/classes/surgeon|Surgeon]] | Persist | Recovery / recursion | Keep valuable cards and the deck engine circulating. |

Each class is a starting hand, a **Staff** (its innate loophole as a swappable passive enabler), and a **kept linear ladder** keyed to its suit. The ladder deepens across the continents without a separate point economy or purchasable skill wallet. The class ability lives in the Staff equipment slot and is swappable at **Fallen Heroes**; relics (the other four equipment slots) are a supporting system and do not carry class identity. (sources: [[canon/v3/classes/overview|Classes]], [[decisions/2026-06-24-crystals-continents-and-equipment|Crystals decision]])

The class should remain recognizable even after its starting cards mix into the conquered deck. In practical terms, a spectator should be able to identify the hero from the decisions being rewarded—precise blocks, exact kills, unusual combinations, or persistent recovery—without relying only on the portrait or class name. This is an explicit design test, not a finalized implementation rule. (source: [[proposals/open-design-questions|Active design questions]])

## How character selection fits into a run

The precise selection screen and multiplayer ownership rules are not yet specified. The accepted product direction implies that a class is chosen at the beginning of an expedition and remains part of the same continuous character-and-deck history through all five continents. The class does not grant permission to start at a later continent or construct an endgame deck independently. (sources: [[canon/v3/classes/overview|Classes]], [[decisions/2026-06-24-crystals-continents-and-equipment|Crystals decision]])

Once selected, the character begins with its starting-hand arrangement and base loophole. The player then conquers cards, applies [[v3/mechanics/replacement-grafts|replacement grafts]], finds rare relic possibilities, and responds to campaign pressure. The class biases which opportunities are attractive, while the actual build emerges from the cards and situations encountered. (sources: [[decisions/2026-06-18-v3-foundation|V3 foundation]], [[canon/v3/classes/overview|Classes]])

## Current design work

The progression **model is resolved** (2026-06-24): a **swappable Staff (passive enabler) × a kept linear ladder** keyed to the class's suit, with other suit ladders unlocking over the run. The older "linear three-tier *vs* facets" question is closed; see [[v3/classes/class-progression-model|class progression]] and [[v3/classes/facet-and-linear-candidates|the candidate pool]]. What remains is the **per-class Staff × ladder pairing** and exact numbers. (sources: [[decisions/2026-06-24-crystals-continents-and-equipment|Crystals decision]], [[proposals/classes/README|Class workspace]])

The other five V2 classes—Commander, Exile, Gambler, Oracle, and Warden—are future design runway rather than current V3 specifications. They should return only if they express an irreducible identity not already covered by the four core classes. (sources: [[canon/v3/classes/overview|Classes]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Not yet decided

- The exact starting cards and whether they change permanent starting ownership.
- The base Staff (passive enabler) available on Continent 1 for each class.
- The per-class Staff × ladder pairing, and how the other suit ladders unlock over the run.
- Exact numbers, limits, trigger timing, and UI presentation.
- How class ownership and graft choices work in multiplayer.
- Whether alternative starting-hand packages belong in initial scope. (sources: [[proposals/open-design-questions|Active design questions]], [[proposals/classes/README|Class workspace]])

## Implementation status

The four identities are accepted design, but their V3 kits and progression scaffold are not implemented as finalized systems. The developed build contains older class behavior and historical simulations, which can inform hypotheses but cannot define the current class rules. (sources: [[delivery/current-state|Current state]], [[proposals/classes/README|Class workspace]])

## Connections

Classes sit between [[v3/mechanics/core-loop|combat]] and [[v3/stages/act-pressure-model|campaign pressure]]. Their starting state influences [[v3/mechanics/deck-lifecycle|ownership and acquisition]], their loopholes reinterpret cards and grafts, and their progression is one candidate source of [[v3/stages/death-and-meta-progression|meta breadth]]. A class is successful when those connections make the same expedition meaningfully different without introducing a parallel game system. (sources: [[canon/v3/classes/overview|Classes]], [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Related pages

- [[v3/classes/class-progression-model]]
- [[v3/mechanics/core-loop]]
- [[v3/stages/act-pressure-model]]
- [[v3/stages/death-and-meta-progression]]

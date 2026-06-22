---
type: map
status: current
authority: derived
topics: [design, open-questions, dependencies]
sources: [canon/principles/design-practice.md, canon/v3/classes/overview.md, proposals/open-design-questions.md, proposals/systems/deck-lifecycle.md, proposals/classes/README.md]
aliases: [Design Queue]
last_updated: 2026-06-20
---

# Design queue

**Summary:** Dependency-ordered map of current V3 design work; this is not an implementation roadmap.

The first unresolved foundation is the complete [[v3/mechanics/deck-lifecycle|deck lifecycle]]: starting ownership, recruit recurrence, recovery, detailed graft behavior, and possible curation. Those choices determine expected deck sizes and constrain class hands, routes, balance, and onboarding. (sources: [[proposals/open-design-questions|Active design questions]], [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

The second foundation is [[v3/classes/class-progression-model|class progression]]: fixed linear tiers versus an invariant loophole with one mutually exclusive facet. Only the four loop identities are accepted. (sources: [[canon/v3/classes/overview|Classes]], [[proposals/classes/README|Class workspace]])

After those foundations, the intended order is mutation vocabulary; five-act pressure, gates, and attrition; relics, Forge, landmarks, and overdraw; UI/tutorial; then alpha scope and coarse difficulty validation. Fine numerical balance should wait because upstream decisions change the deck, power vehicles, and recovery model. (source: [[proposals/open-design-questions|Active design questions]])

| Order | Decision family | What it unlocks |
|---:|---|---|
| 1 | Starting ownership, recurrence, recovery, curation | Enemy pools, deck-size targets, routes, class hands, balance assumptions |
| 2 | Linear class paths or facets | Canonical kits, selection UI, pressure matrix, onboarding |
| 3 | Mutation vocabulary beyond replacement | Card presentation, token retirement, graft interaction rules |
| 4 | Acts, gates, attrition, difficulty | Encounter content, rests, fixtures, run pacing |
| 5 | Relics, Forge, landmarks, overdraw | Supporting-content scope and route economy |
| 6 | UI and tutorial | Trustworthy explanation of settled rules |
| 7 | Alpha scope | External test boundary and validation bar |

The queue is deliberately dependency-led. Selecting permanent removal before expected deck growth is known would treat a genre convention as a solution without naming the problem; specifying class capstones before deciding linear versus facet progression would harden one proposal through implementation. [[v3/design/foundations/design-authority-and-states|Design authority]] prevents those shortcuts from turning code into accidental consensus. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[proposals/classes/README|Class workspace]], [[canon/principles/design-practice|Design practice]])

## Related pages

- [[v3/design/status/active-design-questions]]
- [[v3/design/status/later-design-backlog]]
- [[v3/design/maps/v3-system-map]]

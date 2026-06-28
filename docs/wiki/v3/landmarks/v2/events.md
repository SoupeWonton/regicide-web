---
type: landmark
status: test-grade-and-unresolved
authority: derived
topics: [kingfall, landmark, events, road, choices, tradeoffs]
search_terms: [Kingfall Events, road event, Bonepicker, Counterfeiter, Chaos Font, Whetstone, Tithe Collector]
sources: [canon/principles/content-bar.md, canon/principles/design-practice.md, canon/v3/vision.md, canon/v3/systems/items.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/relics-and-spell-cards.md, research/simulation/findings.md, ../server/campaign/events.ts, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Events, Road Events, Strange Happenings]
last_updated: 2026-06-21
---

# Events

**Summary:** Events are deferred lore-driven road choices rather than a baseline source of spells, relics, or mechanical progression.

**Events** are non-combat road landmarks that present a choice with an immediate or continuing effect on the run. The current event catalog is explicitly test-grade: it explores mutation, card creation, deck removal, and trades, but is not balanced and often conflicts with current V3 design. (implementation: `server/campaign/events.ts`)

| Quick fact | Current answer |
|---|---|
| Landmark role | Choice-driven non-battle change |
| Current content | Five test-grade random events |
| V3 status | Event category plausible; exact catalog unconfirmed |
| Canonical constraint | One visible tradeoff that affects later decisions |

## How current Events work

Entering an Event node deterministically selects one entry from the seeded `RUN_EVENTS` catalog and opens a team reward choice. The current events are: **The Bonepicker** (remove low cards), **The Counterfeiter** (add 10s or 5s), **The Chaos Font** (change suits), **The Wandering Whetstone** (raise ranks), and **The Tithe Collector** (discard cards for spells). A refusal or no-effect option is often available. (implementation: `server/campaign/events.ts`, `server/campaign/campaign.ts`)

## Confirmed design

There is no accepted V3 event catalog. The content bar does establish what a valid event-like landmark should do: create a real choice, make its outcome attributable, remain relevant under pressure, and affect the deck or an existing loop rather than create another wallet. (source: [[canon/principles/content-bar|Content bar]])

## Current design work

Events are deferred to lore development rather than used to complete the baseline spell, relic, or landmark economy. A future authored event may exceptionally touch an item when its fiction supports the tradeoff, but Events are not a routine acquisition channel. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Conflicts with current V3

Bonepicker assumes broad card removal, which remains open. Counterfeiter grants cards outside conquest. Chaos Font and Whetstone mutate cards without exact kills. Tithe grants standalone spells, which V3 removes. These events are valuable experiments precisely because they expose possible verbs; none should be described as current rules. (sources: [[proposals/open-design-questions|Active design questions]], [[canon/v3/vision|V3 vision]], [[canon/v3/systems/items|Items]])

## Evidence

Older simulation suggested Events could behave like “free candy” compared with elite fights, though the result was partly confounded by weak bot combat. That supports adding explicit opportunity cost, refusal tradeoffs, or delayed liabilities rather than merely lowering rewards. (source: [[research/simulation/findings|Simulation findings]])

## Not yet decided

- Whether Events are a permanent V3 node category.
- The accepted event verbs and content pool.
- How randomness, preview, refusal, and delayed consequences work.
- Which events remain valid after lifecycle, relic, and mutation decisions.
- How multiplayer votes resolve and how event history is recorded.
- Frequency and relationship to authored routes. (sources: [[proposals/open-design-questions|Active design questions]], [[canon/principles/content-bar|Content bar]])

## Connections

Events are the broadest landmark container and therefore the easiest place for rejected systems to return unnoticed. Each event must be reviewed against [[v3/mechanics/deck-lifecycle|deck lifecycle]], [[v3/mechanics/replacement-grafts|mutation]], [[v3/mechanics/items-and-power-vehicles|items]], and the [[v3/design/foundations/content-bar|content bar]] before promotion from test-grade content. (sources: [[canon/principles/design-practice|Design practice]], [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/landmarks/v2/market]]
- [[v3/landmarks/v2/hunt]]
- [[v3/mechanics/deck-lifecycle]]
- [[v3/design/foundations/content-bar]]

---
type: map
status: current
authority: derived
topics: [authority, documentation]
sources: [README.md, canon/README.md, canon/principles/design-practice.md, canon/v3/systems/items.md, decisions/README.md, delivery/current-state.md, archive/README.md, research/assessments/golden-rules-2026-06-18.md]
aliases: [Documentation Authority]
last_updated: 2026-06-20
---

# Authority map

**Summary:** The hierarchy used to decide what is current, implemented, proposed, evidentiary, or historical.

Code and tests are the final authority for shipped behavior. Canon defines intended behavior, including accepted behavior that has not shipped. A mismatch between those layers is a delivery gap, not permission to reinterpret canon. (sources: [Documentation index](../../../../README.md), [[delivery/current-state|Current state]])

Accepted decisions explain why canon changed but do not override it. Proposals and research can expose alternatives or evidence, but consensus must update canon and a dated decision record before implementation proceeds. (sources: [[decisions/README|Design decisions]], [[canon/principles/design-practice|Design practice]])

Archive material preserves V0/V2 and removed mechanics. It may explain history but never answers a current V3 question unless the question explicitly asks for historical context. (sources: [Documentation index](../../../../README.md), [[archive/README|Archive]])

## Resolution order

1. Shipped behavior: code and tests.
2. Intended behavior: `canon/`.
3. Rationale: accepted records in `decisions/`.
4. Implementation gaps and sequence: `delivery/`.
5. Alternatives: `proposals/`.
6. Evidence and critique: `research/`.
7. Historical context: `archive/`.

This order answers different questions rather than ranking every file on a single scale. A test can prove what ships without deciding what should ship; [[canon/README|the canon manifest]] can describe accepted behavior that has not reached code; an accepted decision can explain the change without becoming a second specification. That separation is essential when [[v3/design/status/current-delivery-gaps|delivery drift]] is deliberate and visible. (sources: [Documentation index](../../../../README.md), [[canon/README|Canon manifest]], [[delivery/current-state|Current state]])

| Situation | Correct reading |
|---|---|
| Code contradicts canon | Record a delivery gap; do not rewrite the intended rule from code. |
| Proposal contradicts canon | Keep the alternative exploratory until consensus changes canon. |
| Research challenges canon | Treat it as evidence for a new decision, not an automatic override. |
| Decision record differs from newer canon | Use current canon and retain the record as rationale/history. |
| Archive contains a fuller mechanic | Use it only to explain lineage unless explicitly reaccepted. |

For example, additive grafts are real shipped behavior but not intended V3 behavior; [[v3/mechanics/replacement-grafts|replacement grafts]] remain canon and the mismatch belongs in delivery. For items, the accepted direction is now [[v3/mechanics/items-and-power-vehicles|five equipment slots (Staff + Cloak/Ring/Hat/Amulet) plus four crystal spells]] ([[decisions/2026-06-24-crystals-continents-and-equipment|2026-06-24 decision]], superseding the earlier slotless-relic model); older slotted relic-tree assessments remain useful evidence about synergy and width but are not the model. (sources: [[delivery/current-state|Current state]], [[research/assessments/golden-rules-2026-06-18|Golden Rules assessment]], [[canon/v3/systems/items|Items]])

## Related pages

- [[v3/design/foundations/design-authority-and-states]]
- [[v3/design/status/current-delivery-gaps]]
- [[v3/design/maps/evidence-map]]

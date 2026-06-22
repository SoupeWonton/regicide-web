---
type: status
status: current
authority: derived
topics: [delivery, implementation, drift]
sources: [delivery/README.md, delivery/current-state.md, delivery/roadmap.md]
aliases: [Code versus Canon]
last_updated: 2026-06-20
---

# Current delivery gaps

**Summary:** The developed campaign remains largely V2-shaped, with one additive graft prototype that conflicts with accepted V3 replacement semantics.

The highest-priority drift is duplicate exact-kill behavior: intended V3 replaces rank or suit, while the current slice adds `+1` or a second suit. State, UI, tests, saves, simulator assumptions, and card rendering require migration. (source: [[delivery/current-state|Current state]])

Fragment currency and its shop remain pending removal; the Forge awaits its rearrangement design; detailed classes remain proposals; rare slotless relics and spell removal are pending; and the developed campaign still uses the older chapter/Province shape rather than one continuous five-act expedition. (source: [[delivery/current-state|Current state]])

Meta progression, internal act fixtures, save compatibility, and evidence capture require delivery decisions after their upstream designs settle. Permanent card removal has no implementation scope. (sources: [[delivery/current-state|Current state]], [[delivery/roadmap|Roadmap]])

| Area | Intended V3 | Current delivery |
|---|---|---|
| Duplicate kill | Replace rank or suit | Additive prototype; migration pending |
| Fragments/shop | Removed | Cleanup pending |
| Forge | Rearrange existing grafts | Destination details pending |
| Classes | Four hand-plus-loophole identities | Kits and scaffold pending |
| Items | Rare slotless relics; no spell inventory | V2 systems remain |
| Campaign | Continuous five acts | Older chapter/Province arc remains |
| Meta | Breadth, not required stats | Existing unlocks need audit |
| Act entry | Internal fixtures only | Pending |
| Removal | Open design axis | No implementation scope |

Save policy must decide whether pre-alpha runs are invalidated, only durable Kingdom identity survives, or full active state is migrated. Evidence capture should record seed, class, act, exact/overkill outcomes, graft choices, collapse state, rests, routes, relic exposure, and tutorial abandonment so later validation can test named hypotheses. (source: [[delivery/current-state|Current state]])

Removal sequencing follows dependency rather than code convenience: fragment and spell systems have accepted destinations, while backfill, Forge, tokens, relic migration, and V2 classes wait for design consensus. (sources: [[delivery/current-state|Current state]], [[delivery/roadmap|Roadmap]])

## Related pages

- [[v3/mechanics/replacement-grafts]]
- [[v3/design/status/v2-to-v3-migration]]
- [[v3/design/maps/authority-map]]

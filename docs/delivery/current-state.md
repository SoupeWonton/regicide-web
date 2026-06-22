---
kind: delivery
edition: v3
status: active
last_verified: 2026-06-18
verified_at_commit: 7334a4b
---

# V3 implementation state

This page records delivery facts only. It is not the design agenda: accepted but
unimplemented behavior belongs here, while unexplored axes and proposals remain design
work until Landry and Gab reach consensus.

The repository is on `Design_V3`. The first redundant-exact-kill vertical slice is
built with the wrong additive interpretation (`+1` or an added suit). Accepted V3
instead replaces the chosen hand card's rank or suit with the defeated card's matching
property. Most surrounding systems still carry V2 implementation and require migration.

| Area | Intended V3 state | Delivery state |
|---|---|---|
| Redundant exact kill | Replace one hand card's rank or suit with the defeated rank or suit | Additive slice built; replacement migration pending |
| Fragment currency/shop | Removed | Migration pending |
| Forge | Rearrange existing grafts | Migration pending |
| Classes | Four starting-hand + innate-loophole classes | Pending; kits still proposed |
| Relics | Rare and slotless | Pending |
| Spells | Folded into cards/actions | Pending |
| Campaign rank bands | Two acquisition acts, then pressure | Pending |
| Full run structure | Five continuous acts; death restarts at Act 1 | Developed campaign still uses the older chapter/Province arc |
| Act duration/session flow | About one hour per act with act-boundary recap and resume | Pending |
| Meta progression | Death/milestones unlock breadth, not required stat power | Existing unlock behavior requires audit |
| Independent act testing | Seeded representative fixtures; never player act starts | Pending |
| Permanent card removal | Open design axis; no accepted mechanic | No implementation scope |

## Outstanding delivery policies

These require implementation or compatibility choices after their upstream designs are
settled; they are not active game-design questions:

- **Pre-alpha saves:** decide whether to invalidate active V2/pre-alpha runs, migrate
  only durable Kingdom identity/unlocks, or attempt full active-run migration. Current
  lean: invalidate active runs and preserve only durable data that remains meaningful.
- **Evidence capture:** derive telemetry from named hypotheses. Minimum likely fields
  include seed, class, act reached, recruit/exact/overkill outcomes, graft choices,
  collapse state, rest use, routes, relic exposure, and tutorial abandonment.
- **Removal sequence:** fragment currency/shop and standalone spell inventory are
  accepted removals. Backfill, token families, Forge behavior, relic migration, and V2
  class removal must wait for their destination designs.

This page is the only living implementation-status summary. Detailed sequencing is
kept in [`migration-v2-to-v3.md`](migration-v2-to-v3.md).

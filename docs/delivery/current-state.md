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
| Generic fragment currency/shop | Removed (no spendable wallet) | Migration pending |
| Spell-crystal fragments | **New (2026-06-24):** suit-specific combat drops, spent only at the Forge | Not built |
| Forge | Rearrange existing grafts **and assemble spell crystals** (fragments → Half → Full) | Migration pending |
| Classes | Four classes = swappable **Staff** (passive enabler) + kept linear ladder | Pending; pairings still proposed |
| Relics | Rare, held as **equipment** in four slots (Cloak/Ring/Hat/Amulet) | Pending |
| Spells | **Four suit crystals** (Fragment/Half castable, Full = win token) in a gauntlet | Pending |
| Equipment / Fallen Heroes | Five slots (Staff + 4 relics); Staff swapped at the Fallen Heroes landmark | Not built |
| Campaign rank bands | Two acquisition continents, then pressure | Pending |
| Full run structure | **V3.0 = Continent 1 + 2 only** (victory = complete C2); C3–C5 + forge-to-Full ending deferred to **V3.5** ([`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md)) | Developed campaign still uses the older chapter/Province arc |
| Continent duration/session flow | About one hour per continent with boundary recap and resume | Pending |
| Meta progression | Death/milestones unlock breadth, not required stat power | Existing unlock behavior requires audit |
| Independent continent testing | Seeded representative fixtures; never player continent starts | Pending |
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
- **Removal sequence:** the generic fragment currency/shop is an accepted removal.
  Standalone spell *inventory* is replaced by the **crystal-spell** system (suit fragments →
  Half → Full at the Forge), not removed outright. Backfill, token families, Forge crystal
  assembly, relic→equipment migration, and V2 class removal must wait for their destination
  designs ([`../decisions/2026-06-24-crystals-continents-and-equipment.md`](../decisions/2026-06-24-crystals-continents-and-equipment.md)).

This page is the only living implementation-status summary. Detailed sequencing is
kept in [`migration-v2-to-v3.md`](migration-v2-to-v3.md).

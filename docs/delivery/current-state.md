---
kind: delivery
edition: v3
status: active
last_verified: 2026-06-28
verified_at_commit: 91d3677
---

# V3 implementation state

This page records delivery facts only. It is not the design agenda: accepted but
unimplemented behavior belongs here, while unexplored axes and proposals remain design
work until Landry and Gab reach consensus.

**Branch model:** `Design_V3` holds the **design-of-record** (docs only). **V3 is implemented on
`v3-integration`, cut from the deployed live commit `91d3677`** — the baseline for this table. The live
game grafts **additively** (`+1` / added suit); **replacement grafting is NOT built.** Accepted V3
replaces the chosen hand card's rank or suit with the defeated card's matching property, and must be
**built on the new card-state model** (it is not a flag-flip). Most surrounding systems still carry the
older implementation and require migration.

| Area | Intended V3 state | Delivery state |
|---|---|---|
| Redundant exact kill | Replace one hand card's rank or suit with the defeated rank or suit | Additive slice built; replacement migration pending. **Audited 2026-07-01** ([audit](live-code-audit-91d3677.md)): `transmute` (suit-replace) committed; `reforge` (value-replace) prototype preserved on `experiments/reforge-replenish` |
| Generic fragment currency/shop | Removed (no spendable wallet) | Migration pending |
| Spell-crystal fragments | **agnostic; 50/50 drop after each encounter (2026-06-28)**; armed between encounters on a **bracelet** (4 suit holes) to set the next encounter's spell | Not built |
| Forge | **Spell forging only (2026-06-27)** — fragments → Half; graft rearrange moves to the **Sanctum** | Migration pending |
| Classes | **Home-suit path (C2 rung in V3.0) + a separate selectable Staff (2026-06-27);** clearing C2 unlocks all other paths; Staff swaps at Fallen Heroes | Pending; ladders drafted |
| Relics | Rare **equipment** in four themed slots (Cloak=roads/Ring=economy/Hat=recruitment/Amulet=activated); **one per slot, equipped from a bag**; pool = **`relic_v1_design_3.0`** (29, [`relics.md`](../canon/v3/systems/relics.md)) | Pending — old 13-relic `ITEMS` roster + `RELIC_SLOTS=2` live; migrate to v1 pool |
| Spells | **Four suit spells** in the **gauntlet** (tiers Fragment→Half→Full); agnostic fragments placed via the **bracelet** between encounters; **Forge = forge** (tier-up) — resolved 2026-06-28 | Pending |
| Equipment / Fallen Heroes | Five slots (Staff + **four relics, one per type, equipped from a bag**); Staff swapped at the Fallen Heroes landmark; equip via the between-encounter screen | Not built |
| Campaign rank bands | Two acquisition continents, then pressure | Pending |
| Full run structure | **V3.0 = Continent 1 + 2 only** (victory = complete C2); C3–C5 + forge-to-Full ending deferred to **V3.5** ([`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md)) | Developed campaign still uses the older chapter/Province arc |
| Continent duration/session flow | ~1 hour per continent with a boundary recap (**V3.0 is single-session — no mid-run resume; multi-session resume is V3.5**) | Pending |
| Meta progression | Death/milestones unlock breadth, not required stat power | Existing unlock behavior requires audit |
| Independent continent testing | Seeded representative fixtures; never player continent starts | Pending |
| Permanent card removal | Open design axis; no accepted mechanic | No implementation scope |

## Outstanding delivery policies

These require implementation or compatibility choices after their upstream designs are
settled; they are not active game-design questions:

- **Pre-alpha saves (decided 2026-06-25):** on the V3.0 cutover, **clear all existing
  lineages**; players create a fresh lineage, told that keeping it unlocks additional content
  once Continent 2 is cleared (the tree + Staff mix-and-match meta unlocks attach to the
  surviving lineage). See [`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md) Decision F.
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

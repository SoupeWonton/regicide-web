---
kind: decision
edition: v3
status: accepted
date: 2026-06-28
questions: [Q30, Q11]
amends: [2026-06-27-v3.0-question-sweep]
---

# Design decision — `relic_v1_design_3.0` (the V3.0 relic pool)

> **Status: accepted (Landry direction).** Officializes the first authored V3 relic pool —
> codename **`relic_v1_design_3.0`** — built from the slot-themed brainstorm and culled across two
> review passes. This **resolves the roster half of Q30** (which relics exist, and in which slot);
> the **per-run relic count stays open**. Source: 2026-06-28 relic authoring + review sessions
> ([`proposals/systems/relic-candidates-by-slot.md`](../proposals/systems/relic-candidates-by-slot.md)).

## What is officialized

The four relic slots (confirmed 2026-06-27) now have **locked themes** and an **authored pool**:

- **Cloak = roads** (the between-fight / route / persistence layer)
- **Ring = economy** (cards-as-resource)
- **Hat = recruitment** (exact-kill → recruit)
- **Amulet = activated** (a button; refreshes — distinct from one-use spells)

Each relic **bends one rule of the core loop in one sentence** and was checked against the class kits
([`facet-and-linear-candidates`](../wiki/v3/classes/facet-and-linear-candidates.md)) so it does not
re-skin a class ability. The catalog of record is [`canon/v3/systems/relics.md`](../canon/v3/systems/relics.md).

### The pool — 29 relics

**Cloak · roads (6):** Forked Road · Forced March · Bedroll · Vanguard · Slip Away (discard 5 to retreat) · Scout Ahead.
**Ring · economy (8):** Hoard (+2 hand) · Interest · Debt · Requisition Writ (2 cards → a fragment) · Liquidate · Last Coin · Caravan Coin · Double or Nothing.
**Hat · recruitment (8):** Conscription (overkill recruits with a −1 token) · Press-gang · Rallying Cry · Battlefield Promotion · Black Standard · Apprentice · Muster · Plunder.
**Amulet · activated (7):** Sainted Scalpel · Unbinding (cancel immunity for this play only) · Second Wind · Aegis (−5) · Bloodlust (+3) · Echo (value only) · Lodestone.

## Rules recorded alongside this pass

- **Losing a fight = death.** No flee-with-reward (killed *Funeral March*).
- **Every enemy — not just Kings — blocks exactly one lever** (suit immunity); the **Jester cancels
  immunity** but is absent in solo, which is why immunity-cancel is rare, valuable relic space.
- **Guardrails:** no alternative economy, no stacking, no new wallet; the immunity thread lives on the
  **Amulet** (a button), not bolted onto Hat recruits.

## Held back — NOT in `relic_v1_design_3.0`

Kept in the candidate docs as `proposed`, pending resolution:

- **Transmute** (Amulet — combo cap → 14): still possibly too strong.
- **Ebb** (Amulet — enemy attack → 0 by paying half in cards): needs an exact spec.
- **Spoils** (Hat — recruit a skipped card): maybe too strong; narrow first.
- **Prospector** (Ring — clear a road → 1 fragment): **defer to the fragments decision** (next session).
- **Waystone** (Cloak — double landmark visit): parked, too strong for now.

## Still open

- **Per-run relic count** (how many a run acquires/equips). Live code is `RELIC_SLOTS = 2`; the slots
  are four. To tune by playtest.
- **Fragment-touching relics** (Requisition Writ, Caravan Coin, and the held Prospector) must be
  reconciled with the upcoming **fragments** decision.
- Power baselines for every relic — a human-playtest question, never a sim number.

## On acceptance, do

- **Canon:** add [`canon/v3/systems/relics.md`](../canon/v3/systems/relics.md) (the catalog); update
  [`canon/v3/systems/items.md`](../canon/v3/systems/items.md) (themes locked, pool exists, link the catalog).
- **Delivery / integration:** [`delivery/plans/v3.0-integration.md`](../delivery/plans/v3.0-integration.md)
  §7 (roster decided → migrate the 13 live relics onto this pool) and
  [`delivery/current-state.md`](../delivery/current-state.md) (Relics row).
- **Status:** mark **Q30 roster resolved** in [`proposals/open-design-questions.md`](../proposals/open-design-questions.md),
  [`wiki/v3/design/status/active-design-questions.md`](../wiki/v3/design/status/active-design-questions.md),
  and [`wiki/v3/design/status/decisions-to-be-taken.md`](../wiki/v3/design/status/decisions-to-be-taken.md).
- **Next session:** fragments.

---
kind: decision
edition: v3
status: accepted
date: 2026-06-28
questions: [Q30, Q28, Q29]
amends: [2026-06-28-relic-v1-design-3.0, 2026-06-24-crystals-continents-and-equipment, 2026-06-27-v3.0-question-sweep]
---

# Design decision — relic slots, the fragment bracelet, and a UI/UX document

> **Status: accepted (Landry direction).** Resolves the **per-run relic count** (left open by
> [`2026-06-28-relic-v1-design-3.0`](2026-06-28-relic-v1-design-3.0.md)) and **revises the fragment
> economy**. Opens a UI/UX document for Gab. Source: 2026-06-28 session.

## Decision 1 — Relic slots: four, one per type; collected in a bag *(Q30 remainder)*

- A run has **exactly four relic slots — one each: Hat · Amulet · Ring · Cloak.** At most **one relic
  per slot** (up to four equipped).
- Relics earned at the Lair / Caravan go into a **bag** (collected, not-yet-equipped). The player
  **selects from the bag and equips each relic into its matching slot**; a relic only fits its own slot
  type. The bag may hold **more relics than slots**, so equipping is a **build choice**.
- **Supersedes** the live `RELIC_SLOTS = 2` model. The pool is
  [`relic_v1_design_3.0`](../canon/v3/systems/relics.md). **This closes the per-run relic count.**

## Decision 2 — Fragments: agnostic, 50/50 drop, armed on a bracelet between encounters *(Q28, Q29)*

- **Fragments are agnostic** — generic tokens, **not** suit-typed. *(Revises the suit-specific
  fragments of [`2026-06-24`](2026-06-24-crystals-continents-and-equipment.md) /
  [`2026-06-27` Decision 4](2026-06-27-v3.0-question-sweep.md).)*
- **A fragment drops with a 50/50 chance after each encounter.** *(Replaces "fragments pooled by
  encounter count.")*
- Between encounters, the player arms spells on a **bracelet with four suit holes (♠ ♦ ♥ ♣)**. **Slotting
  a fragment into a suit hole arms that suit's spell for the next encounter**; the screen **previews the
  card / spell** the player will have next encounter.
- This is a **between-encounter** action, surfaced on the relic-management screen (Decision 3).

**Resolved (clarified 2026-06-28):**
- **The gauntlet is the holder** (name confirmed) of the four suit crystals, each at tier **Fragment →
  Half → Full**. The **bracelet is the UI/UX screen** where the player places fragments into the gauntlet.
- **The tiers coexist — they are not replaced.** Agnostic fragments **accumulate**: inputting one is the
  same action at every tier. The player may **equip** a fragment (use that suit's spell now) or
  **sandbag** fragments to build a suit up to **Half**, then **Full** (Full = V3.5 win token).
- **Forge landmark (resolved 2026-06-28):** the Forge's verb is **forge** (retained) — it forges
  accumulated fragments into the next crystal tier. The **bracelet** places/equips/sandbags fragments
  between encounters; the **Forge** is the landmark stop where the tier-up happens. Only spell/forge
  **numbers** remain to tune.

## Decision 3 — Open a UI/UX document (Gab)

- New doc [`delivery/plans/ui-ux-v3.0.md`](../delivery/plans/ui-ux-v3.0.md), companion to the integration
  plan, is the home for **Gab-owned UI/UX**. The core new screen is the **between-encounter management
  screen**: Module A (relic bag → four slots) + Module B (fragment bracelet → next-encounter spell).
- Design supplies the **mechanical constraints**; layout/interaction/feel are **Gab's call** (per
  [`2026-06-27` Decision 9](2026-06-27-v3.0-question-sweep.md)).

## On acceptance, do

- **Canon:** [`canon/v3/systems/items.md`](../canon/v3/systems/items.md) (fragment model + four one-each
  slots + bag); [`canon/v3/systems/relics.md`](../canon/v3/systems/relics.md) (per-run count resolved).
- **Delivery / integration:** [`delivery/plans/v3.0-integration.md`](../delivery/plans/v3.0-integration.md)
  §6 (fragments) + §7 (slots + bag) + link the UI/UX doc; [`delivery/current-state.md`](../delivery/current-state.md).
- **Status:** [`proposals/open-design-questions.md`](../proposals/open-design-questions.md) (Q28 fragment
  drop/model, Q29 bracelet name, Q30 count resolved) and the wiki status mirror.
- **Reconciliation resolved 2026-06-28:** gauntlet = holder (tiers Fragment→Half→Full); bracelet = its
  between-encounter UI; **Forge = forge** (tier-up). Remaining: spell/forge **numbers** only.

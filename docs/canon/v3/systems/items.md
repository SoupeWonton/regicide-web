---
kind: canon
edition: v3
status: accepted-direction
last_reviewed: 2026-06-27
---

# Items

Source decisions: [`2026-06-24-crystals-continents-and-equipment.md`](../../../decisions/2026-06-24-crystals-continents-and-equipment.md),
[`2026-06-27-v3.0-question-sweep.md`](../../../decisions/2026-06-27-v3.0-question-sweep.md).

## Equipment (five slots)

V3 power is carried in **five equipment slots, and only these five**:

- **Staff** — a **selectable passive**. Each class has **four** passive-signature Staffs; you pick
  **one of your class's four** on the class-select screen (held one at a time). It is never a scaling
  resource, and is **decoupled from the class's suit path** (the path is the kept payoff ladder; see
  [`../classes/overview.md`](../classes/overview.md)). The **Fallen Heroes** shrine swaps the Staff
  (unlocked after Continent 1; the swap offers one randomly-drawn Staff from each of the four classes
  — one per faction, your own class included).
- **Amulet · Ring · Cloak · Hat** — **exactly four relic slots, one per type** (resolved 2026-06-28).
  A run equips **at most one relic per slot**. Relics earned at the Lair/Caravan collect in a **bag**;
  the player **selects from the bag and equips one into each matching slot** (a relic fits only its own
  slot type). The bag may hold more relics than slots, so equipping is a build choice. (Supersedes the
  live `RELIC_SLOTS = 2`.) The equip flow is a UI/UX surface — [`ui-ux-v3.0`](../../../delivery/plans/ui-ux-v3.0.md).

**Slot themes are locked (2026-06-28):** **Cloak = roads · Ring = economy · Hat = recruitment ·
Amulet = activated** (Amulet is a *button* slot — activated, refreshing, distinct from one-use spells).
The authored relic pool is **`relic_v1_design_3.0`** — 29 relics catalogued in
[`relics.md`](relics.md) ([decision](../../../decisions/2026-06-28-relic-v1-design-3.0.md)).

## Spells (crystals)

There are exactly **four spell identities — one per suit** (♣ attack · ♦ draw · ♠ block · ♥ recover),
held in the **gauntlet** (name confirmed) — the holder carries exactly four, one per suit. A spell is a
scarce one-use trump card in a dedicated area, not shuffled into the Tavern and not against the hand
limit; casting consumes it. At most one spell of each suit may be cast in a combat.

**Fragments & tiers (resolved 2026-06-28** — [decision](../../../decisions/2026-06-28-relic-slots-fragments-and-ui.md)):

- **Fragments are agnostic** (generic tokens, not suit-typed) and **drop with a 50/50 chance after each
  encounter.** *(Revises the earlier "suit-specific fragments pooled by encounter count.")*
- The **bracelet is the UI/UX screen** (between encounters) where the player **places fragments into the
  gauntlet**, one suit hole each (♠ ♦ ♥ ♣); it previews the card/spell armed for the next encounter.
- **The tiers coexist; fragments accumulate.** Inputting a fragment is the same action at every tier —
  the player may **equip** a fragment (use that suit's spell now) or **sandbag** fragments to build a
  suit up from Fragment → Half → Full:

1. **Fragment** — the floor; the suit's direct, castable emergency spell.
2. **Half** — built from accumulated fragments; the **strongest castable** expression of the suit.
3. **Full** — built further; **not castable.** Set aside, permanently unavailable the rest of the run,
   and serves as the **endgame / win token** (**V3.5**). There is no castable third tier.

**Spells sit above suit immunity** (a ♦ spell is castable against a ♦-immune enemy) — confirmed; the
visual is Gab's. **V3.0 ships the Fragment + Half castable rungs only.**

**Forge landmark (resolved 2026-06-28):** the Forge's verb is **forge** (retained) — it **forges
accumulated fragments into the next crystal tier** (Fragment → Half; Full is V3.5). The **bracelet** is
the between-encounter UI for *placing / equipping / sandbagging* fragments and previewing the next
spell; the **Forge** is the landmark stop where the tier-up actually happens. Only **numbers** remain
open: spell effect values and fragments-per-Half. *(The drop is **decided**: agnostic, 50/50 after each encounter.)*

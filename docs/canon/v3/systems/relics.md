---
kind: canon
edition: v3
status: accepted-direction
last_reviewed: 2026-06-28
---

# Relics — `relic_v1_design_3.0`

Source decision: [`2026-06-28-relic-v1-design-3.0.md`](../../../decisions/2026-06-28-relic-v1-design-3.0.md).
Philosophy & bar: [`relics philosophy`](../../../wiki/v3/relics/proposed-design/philosophy-and-design-orientation.md).
Authoring kit: [`authoring/checklists/relic.md`](../../../authoring/checklists/relic.md).

A relic is a **rare, run-defining rule-bender** held as **equipment** in one of four slots, alongside
the class **Staff** (the fifth slot; see [`items.md`](items.md)). Each relic **bends one rule of the
core loop in a single sentence**, tells a story rather than adding a stat, and does **not** duplicate a
class passive, ladder, graft, Consecrate, or spell. Most runs see only one or two; breadth grows over a
lifetime, never vertical power within a run. Earned at the **Lair** (raid) or the **Caravan**
(pay-from-hand) — never an ordinary drop.

**`relic_v1_design_3.0`** is the first authored pool (version 1). Slot themes are **locked**:

| Slot | Theme | Bends rules about |
|---|---|---|
| **Cloak** | Roads | the between-fight / route / persistence layer |
| **Ring** | Economy | cards-as-resource |
| **Hat** | Recruitment | exact-kill → recruit |
| **Amulet** | Activated | any lever, gated behind a button (refreshes; not one-use like a spell) |

## Cloak — roads (6)

| Relic | Rule it bends |
|---|---|
| **Forked Road** | At a road fork, see and choose between both branches (landmark/enemy type) before committing. |
| **Forced March** | Skip one ordinary fight per road — but take no recruit or graft from it. |
| **Bedroll** | Once per road, reshuffle your discard into the Tavern without a Camp. |
| **Vanguard** | The first enemy of each new road cannot counterattack on its first turn. |
| **Slip Away** | Discard 5 to retreat from a fight: keep your hand, but the enemy is not defeated. |
| **Scout Ahead** | See the immunity (locked lever) of the next enemy on the road before you fight it. |

## Ring — economy (8)

| Relic | Rule it bends |
|---|---|
| **Hoard** | Your maximum hand size is +2. |
| **Interest** | If you discarded nothing to the previous enemy, start the next fight +1 card. |
| **Debt** | Once per fight, draw 2 now, then discard 1 at the start of each of your next two turns. |
| **Requisition Writ** | Once per landmark, convert 2 cards of hand value into one fragment of your choice. |
| **Liquidate** | Once per fight, discard one card to draw 2. |
| **Last Coin** | Once per fight, the first time you begin a turn empty-handed, draw 3. |
| **Caravan Coin** | Your pay-from-hand cost at the Caravan / Market is reduced by 2 cards' value. |
| **Double or Nothing** | Once per fight, discard your whole hand and draw that many cards +1. |

## Hat — recruitment (8)

| Relic | Rule it bends |
|---|---|
| **Conscription** | An overkill still recruits the card, but it enters carrying a −1 token (instead of being lost to discard). |
| **Press-gang** | Cards you recruit arrive pre-shaped — choose rank-or-suit as if grafted — instead of as printed. |
| **Rallying Cry** | When you recruit, also return one card from discard to the Tavern. |
| **Battlefield Promotion** | The first card you recruit each fight enters upgraded one rank. |
| **Black Standard** | A recruited card enters the top of the Tavern (your next draw) instead of the bottom. |
| **Apprentice** | You may immediately discard a fresh recruit to draw 2. |
| **Muster** | Recruited royals (J/Q/K) enter the Tavern top instead of the bottom. |
| **Plunder** | On an exact kill, you may swap the recruit for a same-suit card already in your discard. |

> **Note — Conscription's "−1 token" is a NEW V3 relic mechanic** (the conscript enters at −1 value); it
> is **unrelated** to the retired forge/graft `tokenBudget` and the deleted token-shop. Don't conflate them.

## Amulet — activated (7)

| Relic | Rule it bends *(Activate:)* |
|---|---|
| **Sainted Scalpel** | *Once per fight:* shuffle up to N cards from discard into the Tavern and draw 1. |
| **Unbinding** | *Once per enemy:* cancel the enemy's immunity for **this play only**. |
| **Second Wind** | *Once per fight:* take an extra turn before the enemy counterattacks. |
| **Aegis** | *Once per enemy:* reduce the enemy's next counterattack by 5. |
| **Bloodlust** | *Once per enemy:* your next play deals +3 damage. |
| **Echo** | *Once per fight:* replay a card from your discard for **its value only** (its suit power does not trigger). |
| **Lodestone** | *Once per fight:* pull one specific named card from the Tavern/library into your hand. |

## Held — not yet in the pool

Tracked as `proposed` in the candidate docs, pending resolution: **Transmute** & **Ebb** (Amulet),
**Spoils** (Hat), **Waystone** (Cloak, parked), and **Prospector** (Ring — deferred to the fragments
decision). See the [decision record](../../../decisions/2026-06-28-relic-v1-design-3.0.md#held-back--not-in-relic_v1_design_30).

## Equip model (resolved 2026-06-28)

**Four slots, one per type.** A run equips **at most one relic per slot** (Hat/Amulet/Ring/Cloak).
Relics earned at the Lair/Caravan collect in a **bag**; the player equips one into each matching slot —
so a run carries up to four, chosen from what it has found.
([decision](../../../decisions/2026-06-28-relic-slots-fragments-and-ui.md) · equip UI:
[`ui-ux-v3.0`](../../../delivery/plans/ui-ux-v3.0.md).)

## Open

- **Fragment-touching relics** (Requisition Writ, Caravan Coin; the held Prospector) reconcile with the
  **agnostic-fragment** model — fragments are now generic, so "a fragment of your choice" simplifies to
  "a fragment." ([fragment decision](../../../decisions/2026-06-28-relic-slots-fragments-and-ui.md).)
- **Power baselines** — human-playtest, never a sim number.

## Related

- [`items.md`](items.md) (the five equipment slots) · [`deck-and-grafts.md`](deck-and-grafts.md) ·
  [`core-loop.md`](../core-loop.md)
- Per-slot candidate detail (with cuts recorded): [`cloak`](../../../wiki/v3/relics/proposed-design/cloak-roads-candidates.md) ·
  [`ring`](../../../wiki/v3/relics/proposed-design/ring-economy-candidates.md) ·
  [`hat`](../../../wiki/v3/relics/proposed-design/hat-recruitment-candidates.md) ·
  [`amulet`](../../../wiki/v3/relics/proposed-design/amulet-activated-candidates.md)

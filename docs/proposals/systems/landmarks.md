---
kind: proposal
edition: v3
status: accepted-direction
last_reviewed: 2026-06-27
questions: [Q13, Q12, Q33]
---

# V3 landmarks — consolidated map

**Status: roster accepted (Landry direction 2026-06-27, Q13).** Consolidates the landmark thinking
previously embedded in [`relics-and-spell-cards.md`](relics-and-spell-cards.md) into one place, and
resolves the open **Shrine** and **Sanctum** slots. See
[`../../decisions/2026-06-27-v3.0-question-sweep.md`](../../decisions/2026-06-27-v3.0-question-sweep.md).

## Principle

The expedition is **combat-heavy**: several fights build pressure, then a **short landmark
stop offers one sharp, telegraphed decision**, then combat resumes. A landmark is **one
verb, one decision** — never a generic shop or a reward buffet. Each must answer:

> *Why would this deck route here now, and what competing opportunity is surrendered?*

Acquisition stays capped (lean: ~3 item-stops per act) so landmarks punctuate combat
rather than replace it.

## The map

> **Updated 2026-06-27** ([question sweep](../../decisions/2026-06-27-v3.0-question-sweep.md)):
> the **Forge's only verb is spell forging** (fragments → Half, fragments pooled by encounter count);
> **graft rearranging moves to the Sanctum** (resolving its dead "Attune" verb); **Caravan** sells
> **relics** only; **Fallen Heroes** swaps the **Staff** (unlocked after C1; first visit = one of
> one randomly-drawn Staff from each of the four classes). **The road map needs retuning** for the re-scoped Forge/Sanctum.

| Landmark | Verb | Hands out | Notes |
|---|---|---|---|
| **Forge** | Forge spells | **Forge fragments → Half crystals** (fragments pooled by encounter count) | Spell forging **only** — no longer rearranges grafts. Never grants relics. (Q12) |
| **Sanctum** | **Deck modification** | **Up to two transfers** — move a **suit or a value** between two owned cards (no new power) | Two transfers per visit (2× suit, 2× value, or one of each). Takes over the old Forge verb, resolving the dead "Attune" slot. (Q33) |
| **Fallen Heroes** | Swap Staff | Trade your **Staff** (a selectable passive) | Unlocked after **C1**, sits mid-C2. **Just a swap** — the offer is one randomly-drawn Staff from each of the four classes (one per faction, own class included). No cost; repeatable. (Q32) |
| **Lair** | Raid | Win a unique rule-bending relic (equipment) through a dangerous fight | Advertise the relic before commitment; victory grants it. Primary relic source. |
| **Caravan** | Pay-from-hand | A costly **relic** for a visible discard-total cost | No gold/wallet — you buy by entering the road with fewer cards. Spells are no longer sold here (forge them). |
| **Camp** | Rest / prepare | **Fixed three-part rest** for the next encounter | Reshuffle discard into Tavern · redraw a fresh hand to **max hand size 5** · **first attack deals double**. The whole bundle fires (not a pick-one menu). Do not make Camp mandatory. |
| **Hunt** | Pursue | Target a missed/unowned recruit | C1 only. You still must fight and exact-kill it. Turns route opportunity into authored recruitment. |
| **Shrine** | **Consecrate** | **Permanently transmute one owned card's suit (or rank) — no kill required** | New (2026-06-22). See below. |
| **Tower** | — (removed) | — | Roads too short for its scout/initiative identity to matter. No replacement reward. |
| **Event** | Lore-driven | Exceptional only | Authored from lore later; not a baseline acquisition channel. |

## Shrine — "Consecrate" *(resolves the open landmark slot)*

Every deck-shaping verb was already owned except **player-*directed* reshape**: grafts
require a conquest (an exact kill), and the Sanctum only *rearranges* grafts already earned.
There was no way to *deliberately* fix a card without killing for it.

**Shrine's verb is Consecrate:** permanently **transmute one owned card's suit (or its
rank)** into a chosen value, without a kill. One card, one sharp choice, per visit.

Why this is the right Shrine:

- **Respects no-removal.** It *converts*, never thins — deck size is unchanged. (Card
  removal remains an unexplored axis, not introduced here.)
- **A no-kill answer to a denied axis** — the floor pain of "I keep drawing the wrong suit
  and can't exact-kill the one I need." It is a **player-authored** reshape, not a card
  faucet, so it eases the floor (Q1 #3) without trivializing card economy.
- **Complements conquest grafts** rather than duplicating them: grafts are *earned by
  killing*; Consecrate is *chosen by routing to the Shrine and paying the opportunity cost*
  of skipping a fight/relic/spell stop.
- **One legible decision** — "which card do I reshape, and into what?" — fitting the
  one-verb landmark rule.

Open tuning (for playtest, not sim): whether Consecrate is free or carries a cost
(e.g. a small discard); whether it can move rank, suit, or both; per-act frequency; and
whether it overlaps too much with the Sanctum's Rearrange or the *Split Seal* relic (if both
exist, they may need mutually-exclusive appearance rules).

## Sanctum — "Rearrange" *(deck modification — resolves Q33; inherits the old Forge verb, Q12)*

The Forge is now **spells-only**, so its old graft-rearrange verb moves to the **Sanctum**. The
Sanctum's verb is **Rearrange**: **relocate one graft you have already earned from its current card
onto a different owned card.** The source card reverts to its printed rank + suit; the target takes
the graft — its exact replaced property (suit or value) **unchanged**.

- **No new power.** Sanctum never creates, upgrades, or re-authors a graft; it only **moves** one you
  already conquered. Graft count and strength are unchanged — pure redistribution.
- **Reach.** It can move a **rank/value graft or a suit graft** (any earned graft) onto any owned
  card, wherever it sits (hand, Tavern, or discard).
- **Up to two transfers, per visit (resolved Q33).** Each transfer moves a **suit or a value** from
  one owned card to another. Three legal shapes: **two suit transfers, two value transfers, or one of
  each.** Pure redistribution — the properties moved are ones the deck already earned.
- **Why it earns a slot.** Grafts are committed in the heat of a kill under early information; the
  Sanctum lets you **re-aim** an earlier graft once the deck's shape is clear — without a faucet (you
  never gain a graft, only relocate one).
- **Distinct from the Shrine.** Shrine/**Consecrate** *authors a new* reshape without a kill (the
  floor-easer); Sanctum/**Rearrange** *relocates an existing* graft (no new power). Author-new vs.
  move-existing.

**Resolved (Q33):** the budget is **two transfers per visit** (was the open one-vs-budget question);
each moves a suit or a value between two owned cards. **Build note:** the live Forge *stamps* tokens
from a budget (`offerForge`, two-step token→card); Sanctum repurposes that machinery to **move** an
existing token instead of stamping a new one, with a budget of two moves.

## Relationship to other questions
- **Q13 (which landmarks exist):** this is the proposed answer.
- **Q12 / Q33 (Forge / Sanctum):** Forge is now **spells-only**; **Sanctum** owns *rearrange-grafts*;
  Shrine/**Consecrate** is the distinct *author-a-new-reshape* verb — three non-colliding identities.
- **Q1 #3 (recovery / death spiral):** Shrine/Consecrate is a candidate *player-authored*
  mitigation; validate with humans.

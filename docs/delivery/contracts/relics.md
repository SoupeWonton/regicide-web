---
kind: delivery
edition: v3
status: active
date: 2026-07-02
---

# Contract — relics: `relic_v1_design_3.0` (slice 7)

Implementation pins for all **29 relic contracts** per Decision 10
([build decisions](../../decisions/2026-07-01-v3.0-build-decisions.md)); catalog:
[`canon/v3/systems/relics.md`](../../canon/v3/systems/relics.md). Ids are `v3r-*`
(`server/campaign/relics.ts`). Each ⚑ is a chosen interpretation/simplification for
Landry's playtest — not a reopened design question.

**Model:** relics collect in the run's **bag** (Lair raid = pick 1 of 2 unowned;
Caravan = pay-from-hand, cost **8** placeholder, Caravan Coin −2); **one relic per
named slot** (Hat/Amulet/Ring/Cloak), equipped via `equip_relic` — **free at every
between-encounter screen, locked in combat** (Decision 7). Team-scope equipment
(solo campaign). Every legacy relic offer dries up under the flag (`itemPool` no
relics; Lair 3-way and Caravan mythic-deal retired; the 13-item roster + Hero.relicIds
survive for non-ascending until slice 9). Only Hoard and Sainted Scalpel carry forward.

## Cloak — roads

| Relic | Pin |
|---|---|
| Forked Road | All reachable NEXT nodes are revealed (known) after every move / on equip. |
| Forced March | Once per province: arriving at a skirmish/veteran offers "march past" (node consumed, no fight/recruit/graft). ⚑ Elites excluded. |
| Bedroll | Road activation, once per province: discard reshuffles into the Tavern. |
| Vanguard | ⚑ "First enemy of each new road" pinned as: the fight's first counterattack is skipped while the FIRST enemy stands. |
| Slip Away | Combat activation: pay 5+ hand value (⚑ auto-greedy smallest cards) → outcome `retreated`; hand kept; enemy stands; node retakeable. |
| Scout Ahead | ⚑ Pinned as: every fight starts with the enemy lineup revealed (the Foresight projection, permanent). |

## Ring — economy

| Relic | Pin |
|---|---|
| Hoard | Hand cap +2 (carries from live). |
| Interest | A won fight with NO discard payments arms +1 card at the next fight's start. |
| Debt | Activation, once/fight: draw 2 now; the next two counterattacks cost +1 value each. ⚑ (was "discard 1 at start of next two turns" — turn-start hooks don't exist; the payment surcharge is the equivalent bite). |
| Requisition Writ | Road activation, once per province: your two lowest cards → +1 agnostic fragment (Decision 10: agnostic simplification). |
| Liquidate | Activation, once/fight: ⚑ lowest card auto-discarded, draw 2. |
| Last Coin | Once/fight: the first time your hand is empty at a counterattack (or after paying), draw 3 — checked before the death test so it can save you. |
| Caravan Coin | Caravan cost −2. |
| Double or Nothing | Activation, once/fight: discard the whole hand (n), draw n+1. |

## Hat — recruitment

| Relic | Pin |
|---|---|
| Conscription | An overkilled UNOWNED number card is still recruited, entering **one rank down** — ⚑ implemented as §F rank provenance (`relic:conscription`), not the old −1 token (the curse system dies in slice 9; §F is the native carrier). |
| Press-gang | ⚑ "Pre-shaped, choose rank-or-suit" pinned as AUTO: recruits are rewritten to your class's HOME suit (§F provenance). Chooser UI deferred. |
| Rallying Cry | On recruit: the best discard card returns to the Tavern. |
| Battlefield Promotion | The first recruit each fight enters +1 rank (§F provenance, cap 10). |
| Black Standard | Recruits enter the Tavern TOP (next draw). |
| Apprentice | ⚑ HEAVILY simplified: on recruit, draw 1 (the discard-the-recruit-for-2 choice needs UI; revisit at playtest). |
| Muster | Royals kept at the gates enter the Tavern TOP instead of shuffling in. |
| Plunder | ⚑ AUTO: the recruit swaps positions with the strongest same-suit discard card when that card is stronger (recruit → discard; the veteran takes its route). |

## Amulet — activated

| Relic | Pin |
|---|---|
| Sainted Scalpel | Once/fight: up to 6 discards shuffle into the Tavern, draw 1 (N=6, Decision 10). |
| Unbinding | Once/enemy: arm — the next play ignores the immunity. |
| Second Wind | Once/fight: arm — the next play triggers NO counterattack (you act again). |
| Aegis | Once/enemy: arm — the next counterattack −5. |
| Bloodlust | Once/enemy: arm — the next play +3 damage. |
| Echo | Once/fight: ⚑ the BEST discard card strikes immediately for its value (no suit power; it stays in the discard; can land an exact kill). |
| Lodestone | Once/fight: ⚑ the BEST Tavern card is pulled to hand (named-card picker deferred). |

## Cross-cutting ⚑ flags

- ⚑ Caravan cost = 8 (placeholder, plan §A); pays greedily with the smallest
  cards across the party's road hands; unaffordable wares aren't offered.
- ⚑ Auto-picks ("best/lowest card") stand in for picker UIs throughout — Gab's
  equip/management screen (ui-ux screen 3) may replace them without rule changes.
- ⚑ Held candidates (Transmute, Ebb, Spoils, Waystone, Prospector) stay out of
  the pool, per the catalog.

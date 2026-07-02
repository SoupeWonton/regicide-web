---
kind: delivery
edition: v3
status: active
date: 2026-07-02
---

# Contract — Staffs & ladders (slice 4)

Implementation pins for all **32 ability contracts** (16 Staffs + 16 suit-path
ladders) per Decision 9 ([build decisions](../../decisions/2026-07-01-v3.0-build-decisions.md)).
Roster source: [`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md).
**Working code in V3.0:** the 16 Staffs + the 4 HOME C2 rungs (Bastion, Conscript,
Depot, Renewal). All other rungs are data (visible-but-locked). Each ⚑ is a chosen
interpretation for Landry's playtest — not a reopened design question.

Selection: class-select offers the class's four Staffs (one pick; server default =
first Staff when a caller omits it). Entering C2 lights the home rung automatically
(placeholder reveal = log line). Old coded class passives, class signature stamps
(Decision 1) and every siege ultimate are **retired from the V3 path** (gated off
under `ascendingDeck`; code deletion waits for slice 9).

## Sentinel Staffs

| Staff | Pin |
|---|---|
| Hold the Line | Activated, once/enemy, play phase. ⚑ **Auto-picks the highest ♠ in the discard** (a full pick UI is deferred); its value adds to shield; the card **stays in the discard**; counts as a Spade card for Bastion. |
| Reinforce | Passive. A same-rank combo may include ONE ♠ of adjacent rank (±1). No Ace combos; combo cap unchanged; the odd card adds its own value. |
| Footwork | Activated, once/enemy, play phase, targets a hand ♠: buried to the **Tavern bottom** (drawn last), then draw 1. |
| Parry | Activated, once/enemy, **discard (pay) phase**, targets a hand ♠: value adds to shield AND reduces the required payment; card is spent to the discard; counts toward Bastion. Payment reaching 0 ends the counter. |

## Executioner Staffs

| Staff | Pin |
|---|---|
| Steady Hand | Activated toggle (re-tap disarms): the next play skips the ♣ double. ⚑ Edge/lever token bonuses still fire (only the double is suppressed). |
| Whetstone | Passive, once/enemy. ⚑ **Auto-applies**: an attack overshooting by 1–2 is shaved to the exact kill (strictly beneficial — exact ≥ overkill in V3). |
| Bloodletting | Activated, once/enemy, targets a hand card: discarded now; **+⌊value/2⌋** armed onto your next attack (flat, after multipliers, like Mark). |
| Field Promotion | Passive: an exact-kill **recruit** enters your hand instead of the Tavern; ⚑ falls back to the Tavern when the hand is at cap. Stacks harmlessly with Conscript C2 (same effect). |

## Quartermaster Staffs

| Staff | Pin |
|---|---|
| Dovetail | Passive: as Reinforce but the adjacent card may be **any suit**. |
| Ace in the Hole | ⚑ Re-pinned as an **activated toggle** (the wiki's "may" needs player intent — auto-copying would wreck exact-kill fishing): the next Ace pair plays the Ace at its partner's value. |
| Stockpile | ⚑ **Re-mapped**: the engine has no forced discard-to-hand-size; the only forced give-back is the overdraw return. Pin: once/enemy, keep ONE extra card from an overdraw pool (hand may exceed cap by 1; draws stop until back under). Consumed only when actually used. |
| Provisioner | Activated, once/enemy, targets a hand card. ⚑ Order swapped to keep it one action: **discard 1, then draw 1** (net dig identical). |

## Surgeon Staffs

| Staff | Pin |
|---|---|
| Triage | Passive. ⚑ Placeholder for "choose": recoveries return the **highest-value** cards from the discard instead of the oldest (full picker UI deferred to the Gab pass). |
| Last Rites | Passive, once/enemy: the best card of a recovery goes **to hand** (cap permitting) instead of the Tavern. |
| Transfuse | Activated toggle, once/enemy: the next ♥ play skips recovery; the play's base value becomes **shield**. ⚑ The "or damage" variant is deferred (a played card already deals its value as damage). |
| Field Dressing | Passive, once/enemy: the first recovery each enemy recovers +1. |

## Ladders — C2 rungs (HOME rungs coded; the rest locked data)

| Ladder (class · suit) | C2 pin |
|---|---|
| **Bastion** (Sen ♠, **coded**) | On the enemy's death, if shield > attack: the next enemy starts with shield = ⚑ **min(#Spade cards played vs this enemy, excess shield)** ("1 per excess Spade card" made concrete). |
| Vigil (Sen ♥) | locked data |
| Fortress (Sen ♦) | locked data |
| Thornline (Sen ♣) | locked data |
| Bloodward (Exe ♠) | locked data |
| Harvest (Exe ♥) | locked data |
| Reaper (Exe ♦) | locked data |
| **Conscript** (Exe ♣, **coded**) | Exact-kill recruits enter the hand (identical to Field Promotion; both may be held). |
| Rationing (QM ♠) | locked data |
| Requisition (QM ♥) | locked data |
| **Depot** (QM ♦, **coded**) | Hand size +2 (replaces the retired legacy QM +1). |
| Munitions (QM ♣) | locked data |
| Convalescence (Sur ♠) | locked data |
| **Renewal** (Sur ♥, **coded**) | Paying a counter with 3+ cards recovers 1: ⚑ the **highest-value** card in the discard returns to the Tavern bottom. |
| Lifeline (Sur ♦) | locked data |
| Sterilize (Sur ♣) | locked data |

C3/C4 rung texts ship verbatim from the wiki table as locked data (`paths.ts`).

## Cross-cutting ⚑ flags

- ⚑ **Staff default**: a `pick_class` without a staffId gets the class's FIRST Staff
  (compat for old callers; the client always sends an explicit pick).
- ⚑ **Retired under ascending** (code deleted slice 9): Sentinel spade-commit +3,
  QM hand +1 / first-♦ draw, Surgeon +1 recovery, Executioner finisher + Regicide,
  ALL siege ultimates (Hold the Gate, Deathward, Rally, All In), class signature
  stamps. Legacy (non-ascending) campaigns keep them.
- ⚑ **C2-clear unlocks the other three paths** at the meta layer — implemented in
  slice 9 (lineage); until then non-home paths are display-only.
- ⚑ Staff swap cadence (Fallen Heroes: one random Staff per class, free, repeatable)
  lands in slice 8 with the landmark.

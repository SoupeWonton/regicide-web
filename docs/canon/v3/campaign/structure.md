---
kind: canon
edition: v3
status: accepted
last_reviewed: 2026-06-27
---

# Campaign structure

V3 is one continuous five-beat expedition. Death ends the run and the next expedition
starts at the beginning; later beats are not unlocked as alternate campaign starts.
**V3.0 ships without mid-run save/resume — a run is single-session; only the lineage meta
persists between runs** (multi-session save/resume is a later concern). The genre is an
all-in **roguelike** (an RPG built from this process is possible future work, not active scope).

Each **continent is divided into three provinces** (sub-continents); **each province is one
boss-tier** — one road ending in one boss — and a **rest/reshuffle falls at every province
boundary**. (Source decision:
[`2026-06-27-v3.0-question-sweep.md`](../../../decisions/2026-06-27-v3.0-question-sweep.md), Decision 11.)

The five-beat **pressure skeleton** — Claim · Shape · Exploit · Adapt · Master — is
retained, with a **continent lore layer** laid over it. The player, wronged by a king, is
recruited by the **God of Luck**. (Source decision:
[`2026-06-24-crystals-continents-and-equipment.md`](../../../decisions/2026-06-24-crystals-continents-and-equipment.md).)

| Pressure beat | Continent | Role |
|---|---|---|
| Claim | Continent 1 | **Recruit** number cards 6–10 by exact kill; build a full A–10 deck. Hunting (directed recovery of missed recruits) lives here only. |
| Shape | Continent 2 | **Royal gates.** Ordinary road exact-kills become grafts; royals are recruited via three gate decisions, climaxing in defeating the first King; run identity is revealed. |
| Exploit | Continent 3 | Defeat another King; push identity to the max. **Acquisition is closed** — refine the deck, do not grow it. |
| Adapt | Continent 4 | The **loop** — bigger; you always lose the God of Luck wager and are sent onward. First clear shows "You win?", then loops. You have become the king, fighting versions of yourself. |
| Master | Continent 5 | The **God of Luck showdown** — a smaller road, not a full continent — ending the run. |

Continents 1–2 are acquisition; **acquisition closes at the C2 seam** and Continents 3–5
refine a fixed deck rather than growing it. Number enemies are the C1 deck-growth targets.
**C1's three provinces recruit by tier** (P1 = 6s+7s · P2 = 8s+9s · P3 = 10s/Council);
**C2's three provinces are the Jack, Queen, and King tiers**, each a road ending in its gate
(the 3/2/1 keep decisions, one per province). The **C2 path ability** reveals on entering
C2 Province 1; the **Fallen Heroes** shrine sits at the start of C2 Province 2.
Royals are gate bosses, **and a bounded selection is recruited at the C2 gates** — a
**3 / 2 / 1 pyramid**: keep 3 of 4 Jacks (*"which Jack do you leave behind?"*), 2 of 4
Queens (*"which two follow you?"*), and 1 of 4 Kings (the King Gate — *"which crown do you
wear?"*, where the betrayer-King abdicates and you crown yourself). All six are real deck
cards (deck ≈ 46 entering C3); the royals left behind are fought but not recruited.
**Exact-killing a royal at a gate triggers a graft like any owned-card kill, but the
grafted value is capped at 10.** From C3 on, royals are bosses only. Build identity rides
on the suit ladder/crystal, not the King card. Continents 3–5 successively test
exploitation, adaptation, and mastery of the conquered deck and class loophole. (Source
decisions:
[`2026-06-25-acquisition-cadence-and-royal-gates.md`](../../../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md),
[`2026-06-27-v3.0-question-sweep.md`](../../../decisions/2026-06-27-v3.0-question-sweep.md).)

**Forgiveness and scope (V3.0).** The expedition is **solo only** for V3.0. The opening
hand **always contains at least one Diamond** so no run begins unable to draw. Recovery on
the road is the **Camp** landmark — a **fixed three-part rest**: reshuffle the discard into the
Tavern, redraw a fresh hand to a **maximum hand size of 5**, and the **first attack deals double**.
(Not a pick-one menu; the whole bundle fires.) Forgiveness is front-loaded into the opening and the
seams; difficulty is
back-loaded into the royal gates. The deck can lose a fight but cannot soft-lock.

**Finishing is opt-in.** Continent 4 can be ridden indefinitely. The run ends only when the
player forges all four spell crystals to **Full**, which strips their spells — difficulty
rises by subtracting the player's power, not buffing enemies — changing the God of Luck
wager animation and opening the Continent 5 showdown. See
[`../systems/items.md`](../systems/items.md) for crystals. The complete act contract,
duration targets, death model, internal test-fixture boundary, and meta-progression rule
live in [`run-and-progression.md`](run-and-progression.md). Road details and encounter
counts remain delivery work rather than hidden amendments to this structure.

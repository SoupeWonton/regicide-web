# Golden Rules assessment — 2026-06-18

**Rubric:** [`Roguelite.txt`](./Roguelite.txt) · **Read the scoring philosophy
first:** [`README.md`](./README.md) (we are *not* chasing 100% everywhere).

**Scored against:** V3 canon ([`../design-v3.md`](../design-v3.md),
[`../design-decision-2026-06-18.md`](../design-decision-2026-06-18.md),
[`../../ideas/four-classes-redesign.md`](../../ideas/four-classes-redesign.md))
**plus the relic-tree vehicle** described below.

## The relic-tree vehicle (the new piece being scored)

- Each class has **multiple trees**, unlocked and expressed **through relics**.
- **Continent 1:** you start with a **default class relic** — the class loophole
  (the one loop-rule you break). No choice yet; it's your on-ramp identity.
- **Subsequent continents:** you **choose which rule-bend (relic) to add**, and
  you gain **more relic space over time**, so relics **interact with one another**.
  Relic interaction is the intended vehicle for build discovery (#4) and
  multi-scale synergy (#6).
- **The loophole progresses as a branching skill tree, NOT a fixed ladder**
  (clarified 2026-06-18). Each step offers **build-defining options** — e.g.
  Sentinel: *"block everything, always"* vs *"convert block into damage"* vs
  *"blocks do double duty."* The branches **are** the builds. *(To be built.)*
- Relics "need to be clearly balanced and defined" (the author's own caveat — the
  combinatorial catalog is the hard, unbuilt part).

> ⚠ **Traceability / drift flag.** This **re-reverses the 2026-06-18 decision**,
> which killed "relic = spec tree via slots" and made the loophole **innate and
> slotless** ("relics very rare, no slots, at most once/run"). The relic-tree
> vehicle is back to **slotted, growing, interacting relics**. `design-v3.md` row 5–6
> and `design-decision-2026-06-18.md` Decisions 6–7 now contradict this and must be
> reconciled before code. Treat *this file's* relic model as the intended target.

## Build reality

Almost none of V3 is built. Only **graft-on-kill (slice 1)** ships. The relic-tree
vehicle is **entirely unbuilt**. So **as-built ≈ 60%** (≈ the prior ascending-deck
state); the table below is **as-designed** — the promise if V3 + relic-trees ship.

## Scorecard (as-designed)

| # | Rule | Score | Band |
|---|------|------|------|
| 1 | Core loop fun before progression | **90** | signature |
| 7 | Prefer mechanical over numerical | **77** | strength |
| 8 | Runs diverge meaningfully | **76** | strength |
| 11 | Cards gain meaning through context | **76** | strength |
| 4 | Builds discovered, not chosen | **74** | strength |
| 5 | Every run creates a story | **73** | strength |
| 2 | Every run starts with a meaningful choice | **72** | strength |
| 9 | Continually present interesting decisions | **70** | strength |
| 3 | Power must require tradeoffs | **70** | strength |
| 6 | Synergies at multiple scales | **68** | partial→strength |
| 10 | Repetition produces discovery | **62** | partial |

**As-designed average ≈ 75%** (up from ~67% V3-without-relic-trees, ~60% built).
The branching skill tree (clarified 2026-06-18) lifts **#4 (68→74)** and **#8
(72→76)**: builds are now *chosen branches × emergent conquered deck*, not a fixed
ladder. The remaining laggards are **#6 (synergy, capped by the width budget)** and
**#10 (repetition, mostly unbuilt)**.

---

## Per-rule detail

Each entry: **why this score · what caps it (prevents higher) · north-star
sentence** (hold this in mind and the score rises).

### 1. Core loop must be fun before progression — 90  *(signature axis)*
- **Why:** Built on proven Regicide combat; the V3 loop
  "draw → combine → kill → block → persist" puts its difficulty in **depth** (a plan
  you sequence across turns over one shared card economy), not **width** (pricing
  unlike effects at one instant). That's the elegant version of this rule. Conquest
  gives the first fight stakes without any meta. (See
  [`depth-vs-width-and-elegance.md`](./depth-vs-width-and-elegance.md).)
- **What caps it:** The relic-tree vehicle is the direct **risk** — interacting
  relics are where **width** sneaks back in if a combo must be re-computed mid-play.
  Also unmeasured (telemetry/tuning deferred), so 90 is asserted, not proven.
- **North-star sentence:** *"If you removed every relic and tree, would the first
  fight still be worth playing?"*

### 2. Every run starts with a meaningful choice — 72
- **Why:** Class = a loophole that breaks a *different loop station*
  (BLOCK/KILL/COMBINE/PERSIST) + a default relic — a real fork at second zero, far
  better than the old 9 suit-lever near-dupes.
- **What caps it:** Continent 1 gives the class relic **by default — no choice
  yet**; the first genuine relic *choice* is deferred to Continent 2. Roster is 4
  (intentional), so choice is deep but narrow.
- **North-star sentence:** *"Two players should be able to describe their run
  differently before the first counterattack."*

### 3. Power must require tradeoffs — 70
- **Why:** Power is gated behind **conquest under combat pressure** (earn it, don't
  buy it); the deck is **capped at 52** (no infinite sprawl); graft-on-kill forces a
  which-card opportunity cost. Relic *slots* reintroduce a real "which rule-bend,
  what do I forgo" cost the slotless version had removed.
- **What caps it:** Loopholes are **always-on, free** rule-bends — pure upside, no
  cost. SPEND/HOLD is the one true cost lever and it's a token-engine detail, not
  felt at the relic layer. No gold/economy means fewer competing cost axes.
- **North-star sentence:** *"The strongest relic should make you give something up —
  a slot, a suit, a safety net — not just hand you a bigger number."*

### 4. Builds should be discovered, not chosen — 74  *(relic-tree's main target; ▲ from 68)*
- **Why:** Two engines now feed it. (a) The deck is **conquered, not drafted** —
  genuinely *emergent* (the purest form of this rule). (b) The loophole is a
  **branching skill tree of build-defining options**, not a fixed ladder — Sentinel
  forks into *"block everything"* vs *"block→damage"* vs *"blocks do double duty,"*
  and that choice compounds with the deck you conquered. Floor 1 no longer comes
  close to determining the run.
- **What caps it:** A skill-tree menu is technically *chosen*, not *discovered* —
  the rule's purest form is emergence. So the **discovery half rides on how a chosen
  branch interacts with the emergent conquered deck** (a block-build playing very
  differently depending on which cards you bagged). Also Continent 1's first relic is
  a fixed default (no choice yet), and the whole tree is **unbuilt**.
- **North-star sentence:** *"Floor 1 should suggest a build; it must never lock it —
  the branch you take should still surprise you in how it reads your conquered deck."*

### 5. Every run creates a story — 73  *(signature axis)*
- **Why:** "Every card you earn is an enemy you faced"; re-skin grafts/relics as
  fantasy not arithmetic (the Balatro move); relic *combinations* generate
  "I stacked X and Y and became unkillable" anecdotes.
- **What caps it:** The story payoff lives in relic interaction, which is unbuilt
  and is the hard combinatorial design. Card-face/relic legibility flagged as the
  open risk — a story you can't *see* happening doesn't land.
- **North-star sentence:** *"After the run, the player tells a story about a
  combination they found, not a stat they accumulated."*

### 6. Synergies must exist at multiple scales — 68  *(relic-tree's main target)*
- **Why:** Minor (graft +value) and major (loophole × recruit × cascade) already
  exist; **relic-to-relic interaction is the explicit vehicle for the
  hidden/surprise tier** this rule demands.
- **What caps it:** (a) Unbuilt, and the hardest thing to build well —
  combinatorial relic design rarely survives "clearly balanced and defined." (b)
  **Structural tension with #1:** synergy you must resolve *mid-play* is **width**,
  which #1 spends its budget to avoid. Synergy is only "free" when it lives in the
  **planning layer** (assemble at camp) rather than the **resolution layer** (trace
  it to press a button). That ceiling means ~68 may be the *deliberate* cap, not a
  bug — see the elegance test.
- **North-star sentence:** *"Every relic should have at least one other relic that
  changes what it does — felt as a plan you assemble, not arithmetic you run each
  play."*

### 7. Prefer mechanical over numerical changes — 77  *(signature axis)*
- **Why:** Classes differ by **the rule they break**, not the number they buff;
  V3 explicitly mandates "re-skin tokens as fantasy, never a bare +2"; relics are
  rule-bends by definition.
- **What caps it:** A large slice of the live token catalog is still `+1/+2`
  (Hone/Temper/levers), and Continent-2 pressure is intentionally **numerical**
  (more HP/ATK). The mechanical *scaling* lane (multiplicative offense) is unbuilt.
- **North-star sentence:** *"Prefer a relic that changes a rule of the loop over one
  that changes a number in it."*

### 8. Runs must diverge meaningfully — 76  *(▲ from 72)*
- **Why:** Divergence now lands on **two axes at once**: four classes win in four
  different ways (defense/aggro/tempo/value), *and* the branching loophole tree means
  **two Sentinels can be fundamentally different builds** (*"block everything"* vs
  *"block→damage"*) on top of their differing conquered decks. That's cross-class
  *and* intra-class divergence.
- **What caps it:** The tree and relic choices are **unbuilt**, and untuned gates
  mean the spread is unproven. The branches must be tuned so no single one dominates
  (or divergence collapses back to one optimal build).
- **North-star sentence:** *"If you watched two winning Sentinel runs, the branch and
  the board should tell them apart."*

### 9. Continually present interesting decisions — 70
- **Why:** Graft-pick on every redundant kill, overdraw-and-select on every Diamond,
  per-continent relic choice + interaction planning. The draft offer rule
  ("every option contains something unobtainable elsewhere") is anti-autopick.
- **What caps it:** V3 *removes* decision points on purpose (no gold, no spell
  casting, no relic-inventory churn) to cut **width**. Fewer-but-deeper is the
  design — which is in tension with this rule's "rarely autopick" maximalism. The
  reconciliation: the decisions that remain should be **deep** (plannable), not
  merely numerous.
- **North-star sentence:** *"Every relic offer should cost the player a real think —
  never an autopick."*

### 10. Repetition must produce discovery — 62  *(weakest; partly addressed)*
- **Why:** Meta = bank **options not power**; 4 classes now + 5 on the unlock runway
  + multiple relic trees per class + cross-class diversification on death = a real
  breadth engine *in intent*.
- **What caps it:** Almost all of it is unbuilt; today only relic/spell-**pool**
  unlock-on-death exists. Multiple trees and new-class unlocks are spec. After 50
  runs *today* you'd exhaust the content fast.
- **North-star sentence:** *"After 50 runs, an unlock should still let a player try a
  verb they have never used."*

### 11. Cards gain meaning through context — 76  *(strength)*
- **Why:** A conquered royal means different things to Executioner vs Surgeon; grafts
  re-target value/suit; **your relic set is the context** that reweights every card.
- **What caps it:** The strongest context-multipliers (interacting relics, Echo/
  Wildcard, axis exploits) are unbuilt. Today the swing is real but modest.
- **North-star sentence:** *"The same conquered 7♠ should feel like a different card
  under two different relic sets."*

---

## Recommended profile (decide on purpose)

| Treat as… | Rules | Stance |
|---|---|---|
| **Signature (push past 100%, let them define the game)** | #1 core loop, #5 story, #7 mechanical identity | Protect ruthlessly. The relic-tree must never trade #1's depth for width. |
| **Strengths to keep healthy (70–85)** | #2, #8, #11, #3, #9 | Maintain; don't over-invest. |
| **The relic-tree's mandate (lift out of the hole, 50→70)** | #4 discovered builds, #6 multi-scale synergy, #10 repetition-discovery | This is what the new vehicle is *for*. Budget the width cost explicitly. |

**The one decision to make consciously:** how much **width** you'll let the
relic-tree add to buy #6. Interacting relics buy synergy and discovery, but
interaction is where width creeps in. Keep relic interaction in the **planning
layer** (between fights) and out of the **resolution layer** (mid-play); have each
relic modify *one existing station*, never add a new simultaneous one — the same
guardrail the loophole tiers already carry. Then #6 settles around its honest
ceiling (~68) **by design**, and #1 keeps its depth. (Full rule + tests:
[`depth-vs-width-and-elegance.md`](./depth-vs-width-and-elegance.md).)

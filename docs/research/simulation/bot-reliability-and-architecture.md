---
kind: research
edition: v3
status: evidence
last_run: 2026-06-22
engine_branch: claude/cloudflare-balancing-test-setup-dlanrm
topic: simulation reliability and bot architecture
audience: Landry + Gab design discussion
---

# Simulation reliability and bot architecture — discussion brief

**Status:** Evidence + proposal. Not canon. Written to open a Landry↔Gab discussion on
whether (and how) to invest in the simulator before leaning on it for V3 balance.

**One-line conclusion:** the current bots are a **floor, not a forecast**, and they are
unreliable for exactly the questions V3 cares about most (card economy, difficulty,
floor/feel). This is an **architectural** limit, not a tuning problem — so more weight
tuning or human-cloning will not fix it. Below: why, what the sim can and can't answer
today, and four avenues to fix with effort estimates.

## What happened (the evidence trail)

- Solo ascending-deck sims floor at **~0–1% win, 33% non-resolving stalls** (hand stuck
  ≤2, infinite yield). See [`v3-deck-lifecycle-q1.md`](v3-deck-lifecycle-q1.md) F2.
- The best, human-flavored persona **`gg`** (tuned from a flawless human win) was **worse**
  — 0/50 wins, 38–40% stall. The discard model barely moved it (38% vs 40%).
- A prior recorded attempt to **surface-clone Gab's actual play** (his hold-joker rule +
  Spade-first weights) **regressed** the bot: reach-ch2 19.9% → 6.5%.
- Humans, by contrast, **never starve**: median hand 6–7, ~5–8% low-hand turns, zero
  yields, reaching ch2/ch4. They fail at **gates/bosses**, not by attrition.

Three independent results, one conclusion: **the bot cannot be tuned out of this.**

## Why the simulator is unreliable

### Root cause: a foresight-less, single-ply, greedy scorer
The bot enumerates every legal play this turn, scores each with a weighted heuristic, and
takes the max (`sim-personas.ts` weights → `sim.ts` `evalPlay`). It has **no multi-turn
lookahead.** It cannot:

- **Sequence draw before starving** — play a ♦ to refill *before* the hand empties,
  rather than spending the ♦ on damage now.
- **Bank a kill** — hold a play to land an exact kill next turn.
- **Set up multi-turn combos / suit counts** — the payoff humans plan toward.
- **Value information** — scry/peek/reorder effects look near-zero because the bot can't
  use foreknowledge.

Humans do all four routinely. That gap is the whole difference between "stalls 40% of the
time" and "median hand 6–7, never yields."

### Why tuning / human-cloning can't fix it
A better *weight vector* still picks the locally-best single play; it has no horizon to
plan over. Worse, **human-style weights backfire**: `gg` is low-aggression/high-conserve
(Gab's real style), which for a horizon-less bot means it *hoards and shields into
starvation* — hence `gg` stalls **more**. Human rules assume human foresight; bolting them
onto a greedy core regresses it (the 19.9%→6.5% result). The ceiling is the **architecture**.

### Why this specifically poisons V3 questions
The bot's dominant failure (starvation stall) is one **humans do not have**. So:

- **Absolute win rates are meaningless** as difficulty signals.
- **Even relative comparisons are confounded whenever a mechanic touches the card
  economy** — which in V3 is *most* of them. Example already observed: kill-replenish
  "fixes" the bots spectacularly (3→66 wins) by curing a bot-only disease; for humans it
  would likely just trivialize the game. The sim *inverts* the design read.

## What the sim CAN and CANNOT answer

| Reliable today | Unreliable today |
|---|---|
| **Relative** comparisons that don't touch foresight/economy (e.g. is enemy modifier X deadlier than Y; rng/seed stress) | Absolute difficulty / win rate |
| **Floor / regression detection** ("did a change make the worst case worse") | Anything foresight-dependent (info items, multi-turn setups, hold/bank decisions) |
| Engine-integrity / soft-lock / crash discovery | Card-economy / starvation / recovery tuning |
| Throughput stress (many seeds fast) | Class/relic/spell balance that assumes competent play |

**Net:** the sim is a good *floor and regression harness*. It is not a difficulty or
economy oracle. Treat its numbers as a lower bound and a change-detector, never a forecast.

## Avenues to fix — with expected effort

Ordered by effort. Effort is rough dev-time for one engineer familiar with the codebase.

### A. Heuristic foresight patches (rule layer on the greedy core) — **LOW (days), low ceiling**
Add targeted rules: "never spend your last ♦ access if the hand would drop ≤2 and the
Tavern can't refill"; "hold a kill if an exact kill is reachable next turn." Cheap.
**But the cloning result shows rule-stacking on a horizon-less core has poor/negative
returns.** Likely buys a modest stall reduction, not human-like play. Low confidence.

### B. Bounded lookahead (1–2 ply expectimax) — **MEDIUM (≈1 week), good value**
Clone the (already deterministic, seeded) engine state and search 1–2 turns ahead,
scoring leaves with the existing heuristic. Catches the obvious foresight wins
(don't-self-starve, bank-the-kill, sequence-the-draw). Needs: a clean state clone/undo
(engine currently mutates in place + persists — needs a pure clone or re-sim), and a
search loop with pruning (combo branching is large). **Best effort-to-reliability ratio.**

### C. Perfect-information "ceiling" bot + keep greedy as "floor" — **MEDIUM (≈1–2 weeks)**
Because the sim is **seeded**, a search bot can legally see the upcoming Tavern order
(perfect information — no hidden-state belief modeling needed). It plays an optimistic
*ceiling*; the greedy bot is the *floor*; **humans sit between**. This gives a **band**
instead of a misleading point estimate — methodologically the strongest option for
balance work. Effort is option B's search without the partial-observability headache.

### D. MCTS / full search agent — **HIGH (≈3+ weeks + tuning)**
Monte-Carlo tree search over the engine for near-optimal play. Highest fidelity, but
heavy: rollout policy, time budget per decision, and it may *overshoot* human skill
(another non-human reference point). Probably overkill for a pre-alpha design loop.

### E. Don't fix bots; validate with humans — **LOW engineering, HIGH human-time**
Keep the greedy bot as a floor/regression harness only. Move floor/economy/difficulty/
feel questions to **structured human playtests**, using the existing trace tooling
(`analyze-trace-policy.ts`) to *measure against* human runs rather than *predict* them.
For a design-led, pre-alpha project this is arguably the correct near-term posture.

### Dead end (do not pursue): more weight tuning / human-cloning
`evolve.ts` weight search and surface human-cloning both hit the architectural ceiling.
Confirmed three times. Not worth further investment.

## Recommendation (for the Landry↔Gab discussion)

1. **Re-scope the sim now, for free:** treat it as a **floor + regression harness**, not a
   difficulty oracle. This immediately unblocks the "standstill" — the design isn't stuck,
   the *evidence tool was mis-applied*. Floor/economy/feel decisions move to human playtest.
2. **Near-term:** Option **E** (human playtests as the validation authority) — it fits the
   design-practice consensus model and needs no engine work.
3. **If/when reliable economy + difficulty sims are wanted:** build Option **C**
   (seeded perfect-info ceiling bot) so every future result is a *human-bracketing band*
   (floor = greedy, ceiling = search). ~1–2 weeks, the best reliability per unit effort.
4. **Skip** A (low ceiling), D (overkill now), and all further weight tuning (dead end).

## Consequence for the V3 standstill

The class / relic / spell redesigns are **not blocked by the sim** — they were waiting on
a tool that can't answer their questions. The path forward is: design via Landry↔Gab
consensus, validate **feel and floor with humans**, and use the sim only to catch
regressions and compare foresight-free mechanics. The "floor problem" (bad opening, no
diamonds, run destroyed early) is a **human variance** question for playtest, and the
brainstormed fixes (guaranteed-diamond/mulligan opener; hand-≤2 safety net) should be
judged by humans, not by a bot that suffers a different disease.

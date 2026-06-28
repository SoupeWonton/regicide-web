---
kind: research
edition: v3
status: evidence
last_run: 2026-06-22
engine_branch: claude/cloudflare-balancing-test-setup-dlanrm
config: EXPERIMENTS.ascendingDeck=true, provinceMode=false
question: Q1 (deck lifecycle)
---

# Results from simulations — Q1 deck lifecycle (V3 ascending deck)

**Status:** Evidence, not canon. Informs the Q1 decision; does not settle it. Authority
remains the Landry↔Gab consensus per [`../../canon/principles/design-practice.md`](../../canon/principles/design-practice.md).
Question anchor: [`../../proposals/open-design-questions.md`](../../proposals/open-design-questions.md) → Q1.

This supersedes the V2-shaped [`findings.md`](findings.md) / [`harness-notes.md`](harness-notes.md)
for the **ascending-deck (V3)** build only. Those older datasets predate the
`ascendingDeck` default and describe the province/chapter game.

## What was run

Solo campaigns (1p) on the live ascending-deck engine, 50 seeds × 5 personas = 250
runs per cell, via `server/scripts/sim.ts`. Two experimental flags (both default-off,
uncommitted scaffolding — **not** canon):

- `replacementGrafts` — redundant exact-kill +value graft **sets** the held card to the
  slain card's value (Reforge) instead of flat **+1** (Hone). Suit-graft unchanged.
- `killReplenish` — every kill recovers up to 2 discard to the Tavern, then draws up to 2.

Bot graft policy was identical across arms (value-graft onto the lowest eligible held
card), so the A/B isolates mechanics, not bot choice.

```
npx tsx scripts/sim.ts --seeds 50 --counts 1                 # additive baseline
npx tsx scripts/sim.ts --seeds 50 --counts 1 --replace       # value-replace graft
npx tsx scripts/sim.ts --seeds 50 --counts 1 --replenish     # draw2/recover2 per kill
```

## Standing caveats

- **Bots are a floor, not a forecast.** They are sub-human; relative comparisons
  (arm vs arm) are the trusted signal, absolute win rates are not.
- **Bots and humans fail differently** (the central finding below) — so for the
  death-spiral question, **human evidence outranks bot win rates.**
- Human comparison set is small: of 23 traces, ~11 are ascending-mode and only ~3 are
  deep, informative runs (the rest are one-fight quits or the older province mode).

## Findings (graded)

### F1 — Graft value-semantics are a *conditional* lever, not a constant one. **CLEAR**
Full 2×2 (graft semantics × card-access recovery), wins / 250 (stall %):

| | no replenish | + killReplenish |
|---|---|---|
| additive (+1, Hone) | 3 (33%) | 66 (22%) |
| replacement (set-to-slain value, Reforge) | 2 (34%) | **85 (20%)** |

**Without** card-access recovery, additive vs replacement is win-neutral (3 vs 2) —
even though replacement applies **+5 to +9** value swings vs +1. **With** card access
fixed, replacement **beats** additive (85 vs 66, +29% relative). Interpretation: while
starvation dominates (F2), deck power is irrelevant and graft semantics wash out; once
the deck isn't starving, the value jump converts to wins. → "Additive vs replacement" is
a **feel / strategic-texture** choice *today*, but becomes a genuine **balance** lever in
any regime where card access is healthy (i.e., for humans — see F3). Decide it with that
in mind. (Bears on Q1 boundary + Q3 mutation vocabulary.)

### F2 — The bot failure mode is card starvation, and it is *architectural*. **INFERRED (bot artifact)**
33% of solo runs soft-lock (8000-action budget) without resolving. Stalled runs sit at
hand size ≤2 for ~100% of turns: empty hand → can't kill → no ♦ refill → yield forever.
**Recalibration (2026-06-22):** re-running with the best, human-flavored persona `gg`
(tuned from a flawless human Sentinel win) did **not** help — it stalled *more* (38–40%
vs 33%, 0 wins / 50), and the discard model barely mattered (38% vs 40%). So the floor is
**not a weak-persona artifact; it is a ceiling of the foresight-less weight-scorer**
(confirmed by the prior recorded result that surface-cloning human rules regressed the
bot 19.9%→6.5% reach-ch2). See [`bot-reliability-and-architecture.md`](bot-reliability-and-architecture.md).

### F3 — Humans do not starve; they fail at gates. **CLEAR (from human traces)**
Deep "Landry's lineage" runs: median hand **6–7**, hand ≤2 only ~5–8% of turns, **zero
yields**, reaching ch2 and ch4 on a grown, un-thinned deck. The one observed human loss
was at a **ch2 boss** after 76 clean plays with a healthy hand. Humans die *at the wall,
with cards in hand* — not from attrition starvation.

### F4 — Card-access recovery is an extremely powerful lever. **CLEAR**
Draw-2/recover-2 per kill lifts both graft arms hugely: additive **3 → 66 / 250**,
replacement **2 → 85 / 250**; stall **33% → ~20–22%**; reached-2nd-boss **37 → 185–191**.
Card access was the bots' binding constraint. *Whether it helps humans is INFERRED:*
humans are already card-flush (F3), so an always-on faucet likely **trivializes** skilled
play while only the floor (bad opening hands / new players) needs it.

### F5 — The V2 single-gate wall is gone. **CLEAR**
Per-fight win rates are 86–92% across all tiers (ch1 boss won 85.9% vs V2's ~12%).
Death is now **diffuse attrition + the starvation stall**, not one castle cliff. A
structural consequence of the ascending-deck redesign worth noting for Q16/Q17.

## How this answers Q1

| Q1 decision | Verdict | Basis |
|---|---|---|
| #3 recovery to prevent a recruitment death spiral | **Largely answered:** the spiral is a **skill-floor risk, not structural**; indicates a **targeted** recovery (exact-kill-only, or a hand-≤2 safety net), **not** a blanket per-kill faucet | F2, F3, F4 |
| #4 removal vs no-removal | **Supported as-is:** "no removal" holds; humans reached ch4 on a grown deck with no bloat failure; transformation (graft) suffices and its semantics are feel, not balance | F1, F3 |
| #2 missed-recruit recurrence / Hunts | **Open — untested.** Overkill "banishes" many recruits, so it matters, but no recurrence mechanic was simulated | — |
| #1 starting-deck composition | **Open — untested.** Interacts with the starvation floor (F2) | — |

## Methodological guardrail (for this workflow)

Because bot failure (starvation) does not match human failure (gates), **Q1 #3/#4 should
be resolved primarily from human evidence**, using bots only for floor/stress probing.
Bot win-rate deltas are valid for *relative* mechanic comparisons (F1, F4), not for
predicting human difficulty.

## Suggested next evidence

- A/B a **targeted** recovery (exact-kill-only, or hand-≤2 safety net) vs blanket
  replenish — the version F3 actually supports for Q1 #3.
- **Validate the floor fix with humans, not bots** — the bot floor is architectural
  (F2) and does not match the human floor; see
  [`bot-reliability-and-architecture.md`](bot-reliability-and-architecture.md).
- More deep human runs to probe Q1 #4 (late-game deck dilution / consistency).

> **Reliability caveat:** these findings come from a floor-only harness. Read
> [`bot-reliability-and-architecture.md`](bot-reliability-and-architecture.md) before
> treating any number here as a difficulty forecast.

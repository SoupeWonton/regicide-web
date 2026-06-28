---
type: note
status: current
authority: derived
topics: [v3, evidence, simulation, bots, architecture]
sources: [research/simulation/bot-reliability-and-architecture.md, research/simulation/v3-deck-lifecycle-q1.md]
aliases: [Sim reliability, Bot architecture, Why simulations are unreliable]
last_updated: 2026-06-22
---

# Simulation reliability and bot architecture

**Summary:** The current bots are a **floor, not a forecast**. The floor is an
*architectural* limit of a foresight-less greedy scorer — not a tuning problem — so more
weight tuning or human-cloning will not fix it. The sim is reliable as a floor/regression
harness but unreliable for difficulty, card-economy, and foresight-dependent questions
(most of V3). Evidence only — not canon.

Authoritative record, full reasoning, and effort estimates:
[[research/simulation/bot-reliability-and-architecture|Bot reliability & architecture brief]].

## Why unreliable (short version)

- Bot = single-ply greedy scorer, **no multi-turn lookahead**. Can't sequence draw before
  starving, bank a kill, set up combos, or value information.
- Confirmed three times: the best human-flavored persona `gg` stalled **more** (40%);
  surface-cloning human rules **regressed** the bot (19.9%→6.5%); the discard model
  barely mattered. The ceiling is the architecture.
- The bot's failure (starvation stall) is one **humans don't have** (humans never yield,
  median hand 6–7) — so absolute win rates mislead and economy-touching A/Bs invert.

## Fix avenues (effort)

| Option | Effort | Verdict |
|---|---|---|
| A. Heuristic foresight patches | LOW (days) | Low ceiling — partial |
| B. 1–2 ply lookahead (expectimax) | MEDIUM (~1 wk) | Best value |
| C. Seeded perfect-info **ceiling** bot (+ greedy as floor) | MEDIUM (~1–2 wk) | **Recommended** — gives a human-bracketing band |
| D. MCTS / full search | HIGH (~3 wk+) | Overkill now |
| E. Validate with **human playtests** | LOW eng / HIGH human-time | **Near-term posture** |
| — More weight tuning / human-cloning | — | **Dead end, do not pursue** |

## Bearing on the standstill

The class / relic / spell redesigns are **not blocked by the sim** — they were waiting on
a tool that can't answer their questions. Re-scope the sim as a floor/regression harness,
move feel/floor/difficulty to human playtest, and the design loop unblocks.

## Related pages

- [[v3/design/evidence/deck-lifecycle-sim-results|Results from simulations — deck lifecycle (Q1)]]
- [[v3/design/evidence/index|Evidence practice]]
- [[v3/design/status/active-design-questions|Active design questions]]

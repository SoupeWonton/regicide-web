---
type: note
status: current
authority: derived
topics: [v3, evidence, simulation, deck-lifecycle, q1]
sources: [research/simulation/v3-deck-lifecycle-q1.md, proposals/open-design-questions.md]
aliases: [Results from simulations, Q1 sim results, Deck lifecycle simulation]
last_updated: 2026-06-22
---

# Results from simulations — deck lifecycle (Q1)

**Summary:** Solo simulations on the V3 ascending-deck build, compared against human
lineage traces, show that the deck "death spiral" is a skill-floor risk rather than a
structural flaw, that graft value-semantics are not a balance lever, and that
card-access recovery is a powerful but blunt lever. Evidence only — not canon.

Authoritative record and numbers: [[research/simulation/v3-deck-lifecycle-q1|Q1 sim results (research)]].

## Headline findings

- **Graft semantics are a *conditional* lever.** Additive vs replacement is win-neutral
  while starvation dominates (3 vs 2 / 250), but once card access is fixed, replacement
  beats additive (85 vs 66 / 250). Feel today, balance lever for card-flush (human) play. *(CLEAR)*
- **Bots fail by card starvation** (33% stall, hand stuck ≤2) — a bot-skill artifact. *(INFERRED)*
- **Humans never starve** (median hand 6–7, zero yields, reach ch2/ch4); they fail at
  **gates/bosses**. *(CLEAR)*
- **Draw-2/recover-2 per kill** lifts bot wins 3→66/250 and cuts stalls 33%→22%, but
  likely **trivializes** skilled play since humans are already card-flush. *(CLEAR lever / INFERRED for humans)*
- The **V2 single-gate wall is gone**; death is diffuse attrition + the stall. *(CLEAR)*

## Bearing on Q1

- **Recovery / death spiral (Q1 #3):** the spiral is a floor risk → indicates a
  **targeted** recovery (exact-kill-only or hand-≤2 safety net), not a blanket faucet.
- **Removal (Q1 #4):** "no removal" holds; transformation suffices.
- **Missed-recruit recurrence (#2) and starting deck (#1):** still untested.

## Related pages

- [[v3/design/evidence/index|Evidence practice]]
- [[v3/design/status/active-design-questions|Active design questions]]
- [[v3/design/foundations/design-authority-and-states|Design authority and states]]

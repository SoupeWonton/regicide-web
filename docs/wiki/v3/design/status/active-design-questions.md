---
type: status
status: current
authority: derived
topics: [design, open-questions]
sources: [proposals/README.md, proposals/open-design-questions.md, research/assessments/canonical-drift-blast-radius.md]
aliases: [Open Design Questions]
last_updated: 2026-06-27
---

# Active design questions

> **Sweep resolved 2026-06-27.** A Landry pass closed the class progression detail (Q31), graft
> vocabulary (Q6), royal graft-cap (Q15), Forge/Sanctum split (Q12/Q33), landmark roster (Q13),
> equipment slots (Q30), gauntlet/immunity (Q29/Q36), overdraw (Q14), forgiveness floor + Camp (Q16),
> and scope (Q18/solo, Q9/tutorial, Q8/Q17/Q21 to Gab). Deck-lifecycle leftovers (Q1/Q3/Q4/Q27) are
> **paused for playtest**. See [[decisions/2026-06-27-v3.0-question-sweep|the sweep decision]].

**Summary:** The active queue separates unresolved design from accepted-but-unimplemented delivery work.

The dependency order begins with deck lifecycle and class progression (model now resolved — staff × ladder), followed by mutation vocabulary, five-continent pressure and attrition, supporting systems (relic + spell models now resolved), player understanding, and alpha scope. (source: [[proposals/open-design-questions|Active design questions]])

Deck lifecycle and class progression are radius-five questions because they alter ownership, acquisition, recovery, card identity, class hands, encounter pressure, UI, saves, and the evidence baseline. (sources: [[proposals/open-design-questions|Active design questions]], [[research/assessments/canonical-drift-blast-radius|Blast radius]])

Supporting questions include relic cadence, Forge behavior, landmark verbs, overdraw-and-select, card presentation, tutorial boundaries, solo versus multiplayer scope, and the first alpha exit bar. None of these should be inferred from current implementation. (source: [[proposals/open-design-questions|Active design questions]])

| Family | State | Questions still requiring consensus |
|---|---|---|
| Deck lifecycle | **Acquisition resolved; leftovers PAUSED for playtest (2026-06-27)** | Starting-deck detail, recovery magnitudes, curation/removal |
| Classes | **Resolved 2026-06-27/28** (home-suit path + selectable Staff; C2 rung live; unlock-all on C2; **Staff roster = the 4 class passives, 2026-06-28**) | numeric tuning only |
| Mutation vocabulary | **Resolved 2026-06-27** — replacement grafts only (suit OR value) | — |
| Five-continent content | C1–C2 = V3.0 (1:1 lore↔pressure); C3–C5 → V3.5 | C3–C5 packages, C4 loop, opt-in ending (V3.5) |
| Supporting systems | **Resolved 2026-06-27/28** — Sanctum=deck-mod, immunity/overdraw; **relics `relic_v1_design_3.0`, 4 slots one-each + bag**; **fragments agnostic/50-50; gauntlet=holder, bracelet=UI; Forge=forge** (all 2026-06-28) | spell/forge numbers; UI calls (ui-ux-v3.0) |
| Player understanding | **Tutorial done; UI/UX = Gab (2026-06-27)** | — |
| Product scope | **Solo-only; overdraw kept (2026-06-27)** | Alpha contents (discuss w/ Gab) |

Royal configuration, attrition cadence, and difficulty sit inside five-act content because they determine whether pressure is readable and fair. Overdraw remains proposed pending evidence about planning value and modal interruption. The working lean on mutation is replacement-only until playtests demonstrate a missing verb. (source: [[proposals/open-design-questions|Active design questions]])

Resolution records should capture the decision, rationale, rejected alternatives, changed canon, reused or removed behavior, save/protocol impact, UI/tutorial impact, invalidated evidence, and follow-up validation. That record keeps a closed question from surviving elsewhere as an unexplained contradiction. (source: [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/design/maps/design-queue]]
- [[v3/mechanics/deck-lifecycle]]
- [[v3/classes/class-progression-model]]

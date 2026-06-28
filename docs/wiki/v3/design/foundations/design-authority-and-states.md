---
type: concept
status: current
authority: derived
topics: [design-practice, authority, consensus]
sources: [canon/principles/design-practice.md, decisions/2026-06-20-design-practice-and-deck-curation.md, research/assessments/canonical-drift-blast-radius.md]
aliases: [Design States]
last_updated: 2026-06-20
---

# Design authority and states

**Summary:** Regicide Web separates design consensus from implementation state and requires decisions before delivery work.

Landry owns game design and development; Gab owns UI/UX direction and contributes mechanics judgment. Accepted direction comes from their consensus, and implementation does not silently resolve open design. (sources: [[canon/principles/design-practice|Design practice]], [[decisions/2026-06-20-design-practice-and-deck-curation|Practice decision]])

Design states are accepted, unexplored, exploring, proposed, and rejected or superseded. “Unimplemented” is a delivery state, not evidence that the design is still open. (source: [[canon/principles/design-practice|Design practice]])

The required sequence is description, axes, hypotheses, developed alternatives, consensus, canon plus decision record, delivery scope, and implementation. Prototypes and simulations remain evidence until consensus changes their status. (source: [[canon/principles/design-practice|Design practice]])

This distinction changes how reviews are framed. An **accepted** rule such as [[v3/mechanics/replacement-grafts|replacement grafting]] can be unimplemented without becoming an open design question; an **exploring** topic such as [[v3/mechanics/deck-lifecycle|permanent removal]] cannot gain authority merely because a prototype is convenient. A **proposed** model is concrete enough to compare, while rejected or superseded material remains available only as history. (sources: [[canon/principles/design-practice|Design practice]], [[decisions/2026-06-20-design-practice-and-deck-curation|Practice decision]])

Reviews therefore begin with the player experience, accepted boundaries, genuine unknowns, competing hypotheses, and evidence that could distinguish them. Implementation effort matters during delivery planning, but it cannot be the default argument for accepting a weaker design. (source: [[canon/principles/design-practice|Design practice]])

When consensus changes a radius-five foundation, the documentation moves together: canon states the new answer, a decision record preserves the reasoning, [[v3/design/status/current-delivery-gaps|delivery]] records the code gap, and evidence collected under the old model is marked for revalidation. That coordinated transition is what prevents the wiki, code, and design history from becoming competing realities. (sources: [[canon/principles/design-practice|Design practice]], [[research/assessments/canonical-drift-blast-radius|Blast radius]])

## Related pages

- [[v3/design/maps/authority-map]]
- [[v3/design/status/active-design-questions]]
- [[v3/design/status/current-delivery-gaps]]

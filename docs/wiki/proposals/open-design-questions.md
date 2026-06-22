---
type: note
status: current
authority: derived
topics: [v3, open-questions, design, queue]
sources: [proposals/open-design-questions.md]
aliases: [Active design questions, Open design questions, Open questions, Active queue]
last_updated: 2026-06-22
---

# Open design questions (active queue)

**Summary:** The live design queue — questions that are unexplored, being explored, or
awaiting Landry↔Gab consensus. This is the derived wiki view; the authoritative text with
full decision packets is the source `proposals/open-design-questions.md`. Implemented
behavior is **evidence, not authority** — see [[canon/principles/design-practice|design practice]].

> To work through these on the couch, use
> [[v3/design/status/decisions-to-be-taken|🛋️ Decisions to be taken]] — it sorts every
> question below by *how it gets decided* (us now / human playtest / sim-floor) and links
> each to its proposal and evidence.

## Queue at a glance

| # | Question | State | Packet / dependency |
|---:|---|---|---|
| 1 | Deck lifecycle: recruitment, recovery, starting deck, curation | Exploring (r5) | [[proposals/systems/deck-lifecycle|deck lifecycle]] |
| 2 | Four class kits and progression model | Exploring competing models (r5) | [[proposals/classes/four-core-classes|linear]] vs [[proposals/classes/facets-and-pressure-permutations|facets]] |
| 3 | Card-mutation vocabulary beyond replacement grafts | Exploring (r5) | depends on deck + class models |
| 4 | Five-act pressure content | Frame accepted; content exploring | depends on class counterplay |
| 5 | Royals, gates, and attrition cadence | Exploring | depends on act pressures |
| 6 | Relics, Forge, landmarks, and overdraw | Exploring / proposed | depends on the deck engine |
| 7 | UI/UX and tutorial contract | Exploring | depends on settled mechanics |
| 8 | Alpha product scope and difficulty target | Exploring / unexplored | depends on the run shape |

## The questions

### Q1/Q3/Q4/Q27 — Deck lifecycle *(Exploring, radius 5)*
Accepted: conquest-first acquisition; rank-or-suit replacement grafts on duplicate exact
kills; deck persists between road encounters; removal *permitted as a possibility* but no
mechanic accepted. **Still to decide:** (1) starting-deck composition; (2) whether missed
recruits recur naturally or via Hunts; (3) what player-authored recovery prevents a
death spiral; (4) retirement / suppression / transformation / no-removal.
**Evidence:** [[v3/design/evidence/deck-lifecycle-sim-results|Q1 sim results]] — the spiral
is a *floor risk, not structural*; no-removal holds; graft semantics are a conditional lever.

### Q5 — Class progression: linear or facets? *(Exploring competing models, radius 5)*
Identities accepted (Sentinel/Block, Executioner/Kill, Quartermaster/Combine,
Surgeon/Persist — [[canon/v3/classes/overview|overview]]). Competing models:
[[proposals/classes/four-core-classes|one fixed three-tier path]] vs
[[proposals/classes/facets-and-pressure-permutations|one loophole + a chosen facet]].
Decide: base loopholes, starting hands, fixed vs facet, when identity deepens, hidden-name
recognizability, cross-class counterplay.

### Q6 — Card-mutation vocabulary *(Exploring, radius 5)*
Replacement grafts are accepted. Keep *grafts only*, add a tiny keyword set, or preserve
the broader developed token engine? **Working lean:** replacement grafts only until a
playtest demonstrates a missing verb.

### Q7 — Five-act pressure content *(Frame accepted; content exploring, radius 5)*
The continuous five acts (Claim, Shape, Exploit, Adapt, Master) are accepted. Decide which
pressure package owns each post-acquisition act, which encounter rules realize it without
invalidating a class, how Act 5 sequences earlier pressures, and the rest/route/gate
cadence for ~1 hr/act.

### Q15 — Royals & gates *(Exploring, radius 4)*
Royals are gate bosses, not ordinary recruits. Decide: one royal vs suit set vs court
sequence; whether immunities are the main adaptation pressure; what payoff replaces royal
recruitment; what is visible before commitment. *(Humans fail here — top playtest target.)*

### Q16 — Attrition & rest cadence *(Exploring, radius 5)*
Persistent hand/Tavern/discard accepted; only explicit rests reshuffle. Decide where rests
are guaranteed/optional/absent, act-boundary behavior, how much recovery is Hearts vs
routes, and how fast a lost expedition resolves.

### Q17 — Difficulty curve *(Exploring, radius 3)*
Target: ~1 hr/act, 4–5 hr/run, 15–25 hr to first win. Decide the per-act conversion curve
for new vs expert players, mechanical vs numerical pressure, fair late-run death rate.
*(The question simulations are least able to answer — humans only.)*

### Q11 — Relics *(Exploring, radius 4)*
Rare, slotless exceptions, not the class tree. Decide count per run, keep-or-sacrifice
cadence, active-relic legibility, and which relic tells a story without duplicating class
or graft identity. **Working lean:** small authored pool; most runs see one or two.

### Q12 — Forge *(Exploring detail, radius 4)*
Canon: rearranges existing grafts, no new power. Decide: move rank/suit/both; transfer vs
swap vs overwrite; whether rearrangement undermines conquest permanence; whether it's even
needed before irreversible grafting shows a real recovery problem.

### Q13 — Landmarks *(Exploring, radius 4)*
Candidate verbs: rest/recover, rearrange a graft, rare relic tradeoff, hunt a recruit.
Each must answer: *why would this deck route here now, and what is surrendered?*
See [[proposals/systems/relics-and-spell-cards|relics & spell-cards brainstorm]] for the
working acquisition map.

### Q14 — Overdraw-and-select *(Proposed; evidence required, radius 4)*
Keep the campaign Diamonds rule (draw to a pool, keep up to empty slots, current hand
visible)? Validate decision quality, interruption cost across frequent ♦ triggers, and
extreme outcomes after rank-replacement. *(UX/decision-quality — bots underprice it.)*

### Q8 — UI/UX contract *(Exploring, radius 4)*
Printed vs effective rank/suit on transformed cards; play preview (damage, suit effects,
exact/overkill, post-play risk); inspection of hand/Tavern/discard/deck/history; class &
relic trigger attribution; the act recap that makes a one-hour session feel complete.

### Q9 — Tutorial *(Exploring, radius 4)*
What must be explicitly taught vs emerge during play: play & counterattack, four suit
powers, same-rank & Ace combos, exact vs overkill, recruit vs graft, persistent attrition,
one visible class loophole.

### Q18 — Alpha: solo-first or multiplayer-complete? *(Unexplored, radius 4)*
Must address shared-deck class ownership, who chooses a graft after a communal kill, how
hands are dealt, owner-only vs party-wide loopholes, reconnection for external tests.

### Q21 — Alpha-complete run *(Exploring, radius 4)*
Full five-act alpha or a representative slice? Minimum enemy behaviors, route/landmark/
relic/class content to test divergence, whether all four classes need full Act 1–5.
Candidate exit bar: one stable run shape, four distinguishable classes, replacement grafts
+ accepted deck lifecycle, minimal landmark/relic packages, trustworthy UI + tutorial,
save/resume + evidence capture, no progression-blocking bugs.

## Decision order

Deck lifecycle → class model → mutation vocabulary → five-act pressure/gate/attrition →
relics/Forge/landmarks/overdraw → UI/tutorial → alpha scope. Avoid fine numerical balance
before the first five. *(Dependencies hold even though most questions are resolved by
consensus + human playtest, not simulation — see
[[v3/design/evidence/bot-reliability-and-architecture|why the sim is a floor, not a forecast]].)*

## Related pages

- [[v3/design/status/decisions-to-be-taken|🛋️ Decisions to be taken — couch agenda]]
- [[v3/design/status/active-design-questions|Active design questions (status view)]]
- [[v3/design/evidence/deck-lifecycle-sim-results|Results from simulations — Q1]]
- [[v3/design/evidence/bot-reliability-and-architecture|Simulation reliability & bot architecture]]

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
| 2 | Four class kits and progression model | **Model resolved 2026-06-24** (staff × ladder); pairings open | [[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] |
| 3 | Card-mutation vocabulary beyond replacement grafts | Exploring (r5) | depends on deck + class models |
| 4 | Five-continent pressure content | Frame + lore overlay accepted; content exploring | depends on class counterplay |
| 5 | Royals, gates, and attrition cadence | Exploring | depends on act pressures |
| 6 | Relics/equipment, spells/crystals, Forge, landmarks, overdraw | **Relic + spell models resolved 2026-06-24**; details open | [[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] |
| 7 | UI/UX and tutorial contract | Exploring | depends on settled mechanics |
| 8 | Alpha product scope and difficulty target | Exploring / unexplored | depends on the run shape |
| 9 | Crystal/continent/equipment **details + surfaced contradictions** (Q28–Q36) | Opened 2026-06-24 | [[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] |

## The questions

### Q1/Q3/Q4/Q27 — Deck lifecycle *(Exploring, radius 5)*
Accepted: conquest-first acquisition; rank-or-suit replacement grafts on duplicate exact
kills; deck persists between road encounters; removal *permitted as a possibility* but no
mechanic accepted. **Still to decide:** (1) starting-deck composition; (2) whether missed
recruits recur naturally or via Hunts; (3) what player-authored recovery prevents a
death spiral; (4) retirement / suppression / transformation / no-removal.
**Evidence:** [[v3/design/evidence/deck-lifecycle-sim-results|Q1 sim results]] — the spiral
is a *floor risk, not structural*; no-removal holds; graft semantics are a conditional lever.

### Q5 — Class progression *(✅ model RESOLVED 2026-06-24; pairings open)*
Identities accepted (Sentinel/Block, Executioner/Kill, Quartermaster/Combine,
Surgeon/Persist — [[canon/v3/classes/overview|overview]]). **Resolved model:** a swappable
**Staff** (passive enabler) × a **kept linear ladder** keyed to the suit; other suit ladders
unlock over the run; Staffs swap at **Fallen Heroes** ([[decisions/2026-06-24-crystals-continents-and-equipment|decision]]).
Still to decide: each base Staff, starting hands, the per-class Staff × ladder pairing and rung
values, ladder-unlock timing, hidden-name recognizability, cross-class counterplay.

### Q6 — Card-mutation vocabulary *(Exploring, radius 5)*
Replacement grafts are accepted. Keep *grafts only*, add a tiny keyword set, or preserve
the broader developed token engine? **Working lean:** replacement grafts only until a
playtest demonstrates a missing verb.

### Q7 — Five-continent pressure content *(Frame + lore overlay accepted; content exploring, radius 5)*
The five beats (Claim, Shape, Exploit, Adapt, Master) map **1:1 to five continents** with a God of
Luck lore layer and an **opt-in ending** (forge all four crystals to Full → C5 showdown). Decide
which pressure package owns each post-acquisition continent, which encounter rules realize it
without invalidating a class, how the Master beat (C5) sequences earlier pressures, how the C4 loop
scales, and the rest/route/gate cadence for ~1 hr/continent.

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

### Q11 — Relics + spells *(✅ models RESOLVED 2026-06-24; rosters/numbers open)*
**Resolved:** relics are **equipment** in four slots (Cloak/Ring/Hat/Amulet) beside the class
**Staff**; spells are **suit crystals** (Fragment → Half castable, Full = win token) in a gauntlet,
forged from combat-dropped fragments ([[decisions/2026-06-24-crystals-continents-and-equipment|decision]]).
Still open: relic count per run, slot themes, which candidate lands where, forge counts/drop rates,
and which relic tells a story without duplicating class or graft. **Working lean:** small pool; one or two per run.

### Q12 — Forge *(Exploring detail, radius 4)*
Canon: rearranges existing grafts, no new power — **and now assembles spell crystals** (fragments →
Half → Full; completing a Full is unlock-gated). Decide: move rank/suit/both; transfer vs swap vs
overwrite; whether rearrangement undermines conquest permanence; exact forge counts and the Full unlock.

### Q13 — Landmarks *(Exploring, radius 4)*
Candidate verbs: rest/recover, rearrange a graft **+ forge crystals (Forge)**, **swap the Staff
(Fallen Heroes — new)**, rare relic tradeoff (Lair/Caravan), hunt a recruit. Sanctum's spell-attune
verb is **superseded** (forge crystals instead) and needs a new role or removal. Each must answer:
*why would this deck route here now, and what is surrendered?*

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
Full five-continent alpha or a representative slice? Minimum enemy behaviors, route/landmark/
relic/class content to test divergence, whether all four classes need full Continent 1–5.
Candidate exit bar: one stable run shape, four distinguishable classes, replacement grafts
+ accepted deck lifecycle, minimal landmark/relic packages, trustworthy UI + tutorial,
save/resume + evidence capture, no progression-blocking bugs.

## Opened by the 2026-06-24 decision (Q28–Q36)

The [[decisions/2026-06-24-crystals-continents-and-equipment|crystals, continents & equipment
decision]] set the shapes but opened detail questions and surfaced two design holes. Full text in
the source [`proposals/open-design-questions.md` §8](../../proposals/open-design-questions.md).

**Contradictions surfaced:**
- **C1** *(resolved)* — "no secondary wallet / no fragments" ([[canon/v3/constraints]]) reworded so
  spell-crystal fragments are the one bounded, Forge-only exception.
- **C2** *(resolved — ratify wording)* — "no parallel inventories/subsystems" ([[canon/v3/vision]])
  reframed: the 5 equipment slots + crystal gauntlet are bounded/legible, not managed inventory.
- **C3** *(open → Q33)* — **Sanctum's** "attune a spell" verb is dead; needs a new role or removal.
- **C4** *(open → Q32)* — **Fallen Heroes** introduced but undefined (placement, cost, legal pairings).
- **C5** *(resolved)* — migration spec's old "Continent 1/2" wording disambiguated.

**New questions:**
- **Q28 — Forge economy:** fragments/drop (~1 in 4 combats), counts for Half (lean 2) / Full,
  direct-to-Full vs Half-first, what unlocks creating a Full.
- **Q29 — The gauntlet:** final name; does holding all four do anything; UI.
- **Q30 — Equipment slot identities:** confirm Cloak/Ring/Hat/Amulet themes; map each relic candidate to a slot.
- **Q31 — Class ladder unlocks** *(extends Q5):* how/when the other three suit ladders unlock; per-class pairings.
- **Q32 — Fallen Heroes:** placement, cost, legal staff↔ladder pairings, staff recoverability.
- **Q33 — Sanctum's fate:** new verb or removal.
- **Q34 — God of Luck showdown (C5):** road shape, boss rules, self-weakened balance, wager animation states.
- **Q35 — C4 loop & opt-in ending:** loop scaling/recycling, the "You win?" beat, signposting the ending as a findable-but-surprising puzzle.
- **Q36 — Spell immunity exception** *(confirm):* spells above matching suit immunity (lean yes) + visual treatment.

## Decision order

Deck lifecycle → class model *(resolved; pairings/ladder unlocks Q31)* → mutation vocabulary →
five-continent pressure/gate/attrition *(C4 loop Q35, C5 showdown Q34)* →
equipment/Forge/landmarks/overdraw *(relic + spell models resolved; Q28–Q30, Q32–Q33)* →
UI/tutorial → alpha scope. Avoid fine numerical balance before the first five. *(Dependencies hold even though most questions are resolved by
consensus + human playtest, not simulation — see
[[v3/design/evidence/bot-reliability-and-architecture|why the sim is a floor, not a forecast]].)*

## Related pages

- [[v3/design/status/decisions-to-be-taken|🛋️ Decisions to be taken — couch agenda]]
- [[v3/design/status/active-design-questions|Active design questions (status view)]]
- [[v3/design/evidence/deck-lifecycle-sim-results|Results from simulations — Q1]]
- [[v3/design/evidence/bot-reliability-and-architecture|Simulation reliability & bot architecture]]

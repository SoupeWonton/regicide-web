---
kind: proposal
edition: v3
status: active
last_reviewed: 2026-06-20
code_baseline: 7334a4b
canon_baseline: docs/canon/README.md
---

# V3 active design questions

This is the active design queue: questions that are unexplored, being explored, or
awaiting Landry–Gab consensus. It does not track implementation migration or distant
ideas.

- Accepted design: [`../canon/README.md`](../canon/README.md)
- Delivery gaps: [`../delivery/current-state.md`](../delivery/current-state.md)
- Later ideas: [`later-design-backlog.md`](later-design-backlog.md)
- Design workflow and state vocabulary:
  [`../canon/principles/design-practice.md`](../canon/principles/design-practice.md)

Implemented behavior is evidence, not authority. When consensus resolves a question,
update canon, add a dated decision record, reflect the delivery consequence, and remove
the question from this queue.

## Queue at a glance

| Order | Question | State | Decision packet or dependency |
|---:|---|---|---|
| 1 | Deck lifecycle: recruitment, recovery, starting deck, curation | **Exploring** | [`systems/deck-lifecycle.md`](systems/deck-lifecycle.md) |
| 2 | Four class kits and progression model | **Exploring competing models** | [`classes/README.md`](classes/README.md) |
| 3 | Card-mutation vocabulary beyond replacement grafts | **Exploring** | Depends on deck and class models |
| 4 | Five-act pressure content | **Accepted frame; exploring content** | Depends on class counterplay |
| 5 | Royals, gates, and attrition cadence | **Exploring** | Depends on act pressures |
| 6 | Relics, Forge, landmarks, and overdraw | **Exploring / proposed** | Depends on the primary deck engine |
| 7 | UI/UX and tutorial contract | **Exploring** | Depends on settled mechanics |
| 8 | Alpha product scope and difficulty target | **Exploring / unexplored** | Depends on the complete run shape |

---

# 1. Deck lifecycle

## Q1/Q3/Q4/Q27 — What is the complete deck lifecycle? **EXPLORING — radius 5**

Detailed foundations, axes, and alternatives live in
[`systems/deck-lifecycle.md`](systems/deck-lifecycle.md).

Accepted boundaries:

- Acquisition is conquest-first.
- Duplicate exact kills apply a rank-or-suit replacement graft to a card in hand.
- The expedition deck persists between road encounters.
- Permanent removal is permitted as a design possibility but no removal mechanic is
  accepted.

Decisions still required:

1. Which cards and opportunities form the starting deck?
2. Can missed recruits recur naturally or through directed Hunts?
3. What player-authored recovery prevents a recruitment death spiral?
4. Does rare retirement, temporary suppression, transformation, or no removal best
   preserve conquest while supporting consistency?

**Unlocks:** enemy pools, deck-size targets, class starting hands, route recovery,
landmarks, onboarding, and balance assumptions.

---

# 2. Four deep classes

## Q5 — Linear progression or facets? **EXPLORING COMPETING MODELS — radius 5**

Accepted class identities:

- Sentinel — Block.
- Executioner — Kill.
- Quartermaster — Combine.
- Surgeon — Persist.

Competing models:

- [`classes/four-core-classes.md`](classes/four-core-classes.md): one fixed linear
  three-tier path per class.
- [`classes/facets-and-pressure-permutations.md`](classes/facets-and-pressure-permutations.md):
  one invariant loophole plus one mutually exclusive facet that deepens through the
  expedition.

Decisions required:

1. What is each base loophole at Act 1?
2. What is each starting hand, and how does it relate to starting ownership?
3. Is progression fixed or facet-based?
4. When does class identity deepen across the five acts?
5. Can each class remain recognizable with names and portraits hidden?
6. How does each class exploit, adapt, and master without invalidating another class's
   route through the same pressure?

**Unlocks:** individual canonical class pages, class selection, tutorial, starting
deck, pressure matrix, and alpha balance scope.

---

# 3. Card-mutation vocabulary

## Q6 — Do any developed token families belong in V3? **EXPLORING — radius 5**

Replacement rank/suit grafts are accepted. The developed build also contains value,
hold-value, split, suit-lever, Scry, Mark, Banner, Bloodprice, and other tokens.

Alternatives:

1. **Replacement grafts only.** Retire the broader catalog for the initial V3 scope.
2. **Grafts plus a tiny keyword set.** Restore an effect only when it solves a
   demonstrated gap that class, relic, route, or graft cannot solve cleanly.
3. **Broad token engine.** Preserve developed variety and accept its additional width.

Decision test:

> Which token changes a meaningful decision that replacement grafts and the accepted
> class model cannot already create?

**Working lean:** replacement grafts only until playtests demonstrate a missing verb.

---

# 4. Five-act content

## Q7 — What content realizes the accepted journey? **EXPLORING CONTENT — radius 5**

The continuous five-act frame is accepted:

1. Claim.
2. Shape.
3. Exploit.
4. Adapt.
5. Master.

Pressure-package and permutation ideas live in
[`classes/facets-and-pressure-permutations.md`](classes/facets-and-pressure-permutations.md).

Decisions required:

1. Which pressure package owns each post-acquisition act?
2. Which encounter rules realize that pressure without invalidating a class?
3. How does Act 5 sequence earlier pressures without creating simultaneous width?
4. What rest, route, and gate cadence supports roughly one hour per act?
5. Which seeded internal fixtures represent weak, median, strong, narrow, and
   attrition-damaged act-entry states?

## Q15 — What are the royal and gate rules? **EXPLORING — radius 4**

Accepted boundary: royals are gate bosses, not ordinary recruits.

Decisions required:

- Does a gate contain one royal, a suit set, or a court sequence?
- Are royal immunities the main adaptation pressure or one package among several?
- What permanent or run-level payoff replaces royal recruitment?
- What information about later gate phases is visible before commitment?

## Q16 — What is the attrition and rest cadence? **EXPLORING — radius 5**

Persistent hands, Tavern, and discard are accepted. Only explicit rests reshuffle and
redraw.

Decisions required:

- Where are rests guaranteed, optional, or absent?
- Do act boundaries rest the deck, offer a rest decision, or preserve state unchanged?
- How much recovery belongs to Hearts versus routes and landmarks?
- How quickly should a functionally lost expedition resolve?

## Q17 — What difficulty curve produces the duration target? **EXPLORING — radius 3**

Accepted product target: approximately one hour per act, four to five hours for a
successful run, and 15–25 cumulative hours to a first victory.

Decisions required:

- What is the intended per-act conversion curve for a new player and an expert?
- Which pressure is mechanical versus numerical?
- What late-run death rate remains fair after several hours of investment?
- What evidence distinguishes player misunderstanding from insufficient deck power?

---

# 5. Supporting systems

## Q11 — What is the relic model in play? **EXPLORING — radius 4**

Accepted boundary: relics are rare, slotless exceptions and are not the class tree.

Decisions required:

- How many relic opportunities and awards occur in a complete expedition?
- Is keep-or-sacrifice a rare authored event or part of ordinary acquisition?
- Can an active relic remain legible without becoming a spell button?
- Which relic creates a story without duplicating class or graft identity?

**Working lean:** a small authored pool; most runs see one or two relics.

## Q12 — What does the Forge do? **EXPLORING DETAIL — radius 4**

Canon says the Forge rearranges existing grafts and creates no new power.

Decisions required:

- Can it move rank grafts, suit grafts, or both?
- Is movement a transfer, swap, restoration, or destructive overwrite?
- Does rearrangement undermine the permanence of earlier conquest decisions?
- Is the Forge necessary before irreversible grafting demonstrates a real recovery
  problem?

## Q13 — Which landmarks deserve to exist? **EXPLORING — radius 4**

Candidate minimal verbs:

- Rest/recover.
- Rearrange a graft, if the Forge survives.
- Encounter a rare relic tradeoff.
- Hunt a recruit or harder reward.

Every landmark must answer:

> Why would this deck route here now, and what competing opportunity is surrendered?

## Q14 — Should overdraw-and-select remain? **PROPOSED; EVIDENCE REQUIRED — radius 4**

Working direction: retain the campaign Diamonds rule, show the current hand during
selection, and validate whether its planning depth justifies modal interruption and
divergence from quick-game Regicide.

Evidence required:

- Decision quality with current-hand context visible.
- Interruption cost across frequent Diamond triggers.
- Extreme outcomes after rank-replacement grafts.

---

# 6. Player understanding

## Q8 — What is the minimum trustworthy UI/UX contract? **EXPLORING — radius 4**

Decisions required:

- How are printed and effective rank/suit shown on transformed cards?
- Does play preview show damage, suit effects, exact/overkill, and post-play risk?
- Can players inspect hand, Tavern, discard, expedition deck, and card history when
  those states affect a choice?
- How are class and relic triggers attributed?
- What act recap makes a one-hour session feel complete?

Exit test:

> An unfamiliar player completes a run segment and explains why cards, class effects,
> rewards, and failure behaved as they did without designer narration.

## Q9 — What does the tutorial teach? **EXPLORING — radius 4**

The existing [`player-experience/tutorial.md`](player-experience/tutorial.md) requires
V3 revision.

Likely required verbs:

- Play and counterattack.
- Four suit powers.
- Same-rank and Ace combinations.
- Exact kill versus overkill.
- Recruit versus replacement graft.
- Persistent expedition attrition.
- One visible class loophole.

Open boundary: which rules require explicit teaching and which should emerge during
Claim and Shape?

---

# 7. Product and alpha scope

## Q18 — Is alpha solo-first or multiplayer-complete? **UNEXPLORED — radius 4**

Alternatives must address:

- Shared-deck class ownership.
- Who chooses a graft after a communal kill.
- How starting hands are dealt.
- Owner-only versus party-wide loopholes.
- Reconnection requirements for external tests.

## Q21 — What constitutes an alpha-complete run? **EXPLORING — radius 4**

Decisions required:

- Full five-act alpha or a shorter representative validation slice?
- Minimum enemy behaviors per pressure package.
- Minimum route, landmark, relic, and class content needed to test divergence.
- Whether all four classes need complete Act 1–5 progression in the first external
  alpha.

Candidate exit bar:

- One stable representative run shape.
- Four distinguishable classes.
- Replacement grafts and an accepted deck lifecycle.
- Minimal landmark and relic packages.
- Trustworthy UI and revised tutorial.
- Save/resume, evidence capture, and no progression-blocking bugs.

---

# Decision order

1. Deck lifecycle.
2. Class progression model and four class foundations.
3. Mutation vocabulary.
4. Five-act pressure, gate, and attrition contracts.
5. Relics, Forge, landmarks, and overdraw.
6. UI/UX and tutorial around settled mechanics.
7. Alpha product scope and coarse difficulty validation.

Avoid fine numerical balance before steps 1–5. Those decisions change deck size,
effective card identity, power vehicles, run pressure, and recovery.

## Resolution record

When closing a question, capture:

```text
Decision:
Why:
Rejected alternatives:
Canon pages changed:
Developed behavior reused or removed:
Save/protocol impact:
UI/tutorial impact:
Evidence invalidated:
Follow-up validation:
```

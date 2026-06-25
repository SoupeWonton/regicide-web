---
kind: proposal
edition: v3
status: active
last_reviewed: 2026-06-25
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

> **V3.0 scope (2026-06-25):** V3.0 ships **Continent 1 + 2 only**; C3/C4/C5 questions are
> **deferred to V3.5**. Victory = complete C2; death is no-comeback permadeath. See
> [`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md).
> The live ship-gap checklist is in [`../delivery/roadmap.md`](../delivery/roadmap.md).

## Queue at a glance

| Order | Question | State | Decision packet or dependency |
|---:|---|---|---|
| 0 | Delete-vs-upgrade inventory: which V2 systems are deleted, upgraded, or kept | **Proposed; awaiting confirm** | Gates Slice 0 cutover — see integration plan |
| 1 | Deck lifecycle: recruitment, recovery, starting deck, curation | **Acquisition cadence resolved 2026-06-25; forgiveness-detail + removal open** | [`../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md) · [`systems/deck-lifecycle.md`](systems/deck-lifecycle.md) |
| 2 | Four class kits and progression model | **Model resolved 2026-06-24 (staff×ladder); kits/pairings open** | [`../decisions/2026-06-24-crystals-continents-and-equipment.md`](../decisions/2026-06-24-crystals-continents-and-equipment.md) |
| 3 | Card-mutation vocabulary beyond replacement grafts | **Exploring** | Depends on deck and class models |
| 4 | Five-beat (five-continent) pressure content | **C1–C2 = V3.0; C3–C5 deferred → V3.5** | [`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md) |
| 5 | Royals, gates, and attrition cadence | **Royal gates resolved 2026-06-25; attrition/rest cadence open** | [`../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md) |
| 6 | Relics/equipment, spells/crystals, Forge, landmarks, overdraw | **Relic + spell models resolved 2026-06-24; details open** | [`../decisions/2026-06-24-crystals-continents-and-equipment.md`](../decisions/2026-06-24-crystals-continents-and-equipment.md) |
| 7 | UI/UX and tutorial contract | **Exploring** | Depends on settled mechanics |
| 8 | Alpha product scope and difficulty target | **Exploring / unexplored** | Depends on the complete run shape |
| 9 | Crystal/continent/equipment **details + surfaced contradictions** (Q28–Q36) | **Opened 2026-06-24** | [`§8`](#8-opened-by-the-2026-06-24-crystalcontinentequipment-decision) |

---

# 0. Delete-vs-upgrade inventory

## Q0 — Which V2 systems are deleted, upgraded, or kept? **PROPOSED; AWAITING CONFIRM**

This is the implementation prerequisite for Slice 0 (cutover scaffolding). Tag each system:
**delete / upgrade / keep**.

Systems to rule on:

| System | Proposed answer |
|---|---|
| `provinceMode` scaffolding (`experiments.ts`) | **Delete** |
| Fragment wallet + graduation shop (`campaign.ts`) | **Delete** |
| `ascendingDeck` arc (the live, most-evolved path) | **Upgrade** → becomes the five-continent shape |
| `EXPERIMENTS` flags (`ascendingDeck` + `provinceMode`) | **Collapse** into a single V3 default |
| Token engine + catalog (`tokens.ts`, `TOKEN_DEFS`) | **Keep** (pruning deferred to token session) |
| Base quick-game (`game.ts`, `rooms.ts`) | **Keep** untouched |
| V2 chapter arc nodes | **Delete** (replaced by continent maps) |
| Tower landmark | **Rule on** |
| Abbey / Market landmarks | **Rule on** |
| Sanctum landmark | **Rule on** (verb is dead — see Q33) |
| Shrine landmark | **Rule on** |

**Output:** a checklist Slice 0 + Slice 2 execute against. When confirmed, add a dated decision record and update the integration plan's Slice 0 from "pending Decision 1" to ✅.

---

# 1. Deck lifecycle

## Q1/Q3/Q4/Q27 — What is the complete deck lifecycle? **ACQUISITION RESOLVED 2026-06-25; remainder EXPLORING**

Detailed foundations, axes, and alternatives live in
[`systems/deck-lifecycle.md`](systems/deck-lifecycle.md).

**Resolved 2026-06-25** ([`../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md)):
acquisition is a **closing funnel** — C1 recruits numbers 6–10 (hunting lives here only);
C2 recruits royals via a **3/2/1 gate pyramid** (3 Jacks, 2 Queens, 1 King — all real deck
cards, deck ≈ 46); from C3 on, **acquisition is closed** and the deck is refined, not grown.
Ordinary exact-kills become **grafts** from C2 onward. Axis A (recruitment boundary) and the
royal half of Axis D are settled.

Accepted boundaries:

- Acquisition is conquest-first.
- Duplicate exact kills apply a rank-or-suit replacement graft to a card in hand.
- The expedition deck persists between road encounters.
- Permanent removal is permitted as a design possibility but no removal mechanic is
  accepted.

Decisions still required:

1. **Starting deck contents + the guaranteed opening ♦/♥ engine floor** (anti-spiral
   direction agreed: forgiveness front-loaded into opening + seams; numbers open).
2. **Forgiveness detail:** clean vs. partial continent-seam reset; road structure
   (combat-gated landmarks vs. skirmish→event); guaranteed rests per continent (feeds Q16).
3. Whether leaving a royal behind at a C2 gate is purely a cost or still grants a graft/token.
4. Does rare retirement, temporary suppression, transformation, or no removal best
   preserve conquest while supporting consistency? *(removal still open)*

**Unlocks:** enemy pools, deck-size targets, class starting hands, route recovery,
landmarks, onboarding, and balance assumptions.

**Evidence (not a decision):** simulation + human-trace results bearing on #3 and #4 are
recorded in [`../research/simulation/v3-deck-lifecycle-q1.md`](../research/simulation/v3-deck-lifecycle-q1.md).
Headline: the death spiral is a skill-floor risk, not structural (humans never starve;
bots do); "no removal" holds; graft value-semantics are win-neutral (feel, not balance).
Awaits Landry↔Gab consensus before any canon change.

---

# 2. Four deep classes

## Q5 — Class progression model **RESOLVED 2026-06-24 (kits/pairings still open)**

Accepted class identities:

- Sentinel — Block.
- Executioner — Kill.
- Quartermaster — Combine.
- Surgeon — Persist.

**Model resolved:** the enabler × payoff-ladder model — a **swappable Staff (passive enabler)**
plus a **kept linear ladder** keyed to the class's suit; other suit ladders unlock over the run,
and Staffs swap at the **Fallen Heroes** landmark. The "linear three-tier *vs* facets" question is
closed. See [`../decisions/2026-06-24-crystals-continents-and-equipment.md`](../decisions/2026-06-24-crystals-continents-and-equipment.md)
and [`classes/facet-and-linear-candidates.md`](classes/facet-and-linear-candidates.md).

Still open:

1. Each class's base Staff (passive enabler) on Continent 1.
2. Each starting hand and its relation to starting ownership.
3. The per-class Staff × ladder pairing and rung values.
4. How and when the other suit ladders unlock across the continents.
5. Recognizability with names and portraits hidden (design test).
6. Exploit/adapt/master coverage without invalidating another class.

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

## Q7 — What content realizes the accepted journey? **C1–C2 in V3.0; C3–C5 DEFERRED → V3.5**

The continuous five-beat frame is accepted, mapped **1:1 to five continents** with a God of Luck
lore layer and an **opt-in ending** (forge all four spell crystals to Full → Continent 5 showdown):

1. Claim — Continent 1.
2. Shape — Continent 2.
3. Exploit — Continent 3.
4. Adapt — Continent 4 (the loop).
5. Master — Continent 5 (God of Luck showdown).

Pressure-package and permutation ideas live in
[`classes/facets-and-pressure-permutations.md`](classes/facets-and-pressure-permutations.md).

Decisions required:

1. Which pressure package owns each post-acquisition continent?
2. Which encounter rules realize that pressure without invalidating a class?
3. How does the Master beat (C5) sequence earlier pressures without creating simultaneous width?
4. What rest, route, and gate cadence supports roughly one hour per continent?
5. How the Continent-4 loop scales/recycles, and how the opt-in forge-to-Full ending paces.
6. Which seeded internal fixtures represent weak, median, strong, narrow, and
   attrition-damaged entry states?

## Q15 — What are the royal and gate rules? **RESOLVED 2026-06-25 (immunity/info detail open)**

**Resolved** ([`../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md)):
C2 is a **court sequence of three gates** — Jack Gate, Queen Gate, King Gate — each a
narrowing recruit decision (keep 3/2/1 of 4). The King Gate is the betrayer-King's
abdication where you crown yourself. Royals recruited at C2 are **real deck cards**; royals
left behind, and all royals from C3 on, are **bosses you fight but do not keep**. Royal
recruitment is no longer "replaced" — it *is* the C2 payoff. From C3, the God of Luck sends
further Kings as pure bosses.

Decisions still required:

- Are royal immunities the main adaptation pressure or one package among several?
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

## Q11 — Relic + spell models **RESOLVED 2026-06-24 (rosters/numbers open)**

**Resolved:** relics are **equipment in four slots** (Cloak/Ring/Hat/Amulet) alongside the class
**Staff**; the slotless model is withdrawn. Spells are **suit crystals** (Fragment → Half castable,
Full = non-castable win token) in a gauntlet, forged from combat-dropped fragments. See
[`../decisions/2026-06-24-crystals-continents-and-equipment.md`](../decisions/2026-06-24-crystals-continents-and-equipment.md).

Still open:

- How many relic opportunities/awards occur in a complete expedition.
- Which existing relic candidate lands in which slot; the slot themes.
- Spell forge counts (fragments → Half / Full) and drop rates.
- Which relic creates a story without duplicating class or graft identity.

**Working lean:** a small authored pool; most runs see one or two relics.

## Q12 — What does the Forge do? **EXPLORING DETAIL — radius 4**

Canon: the Forge rearranges existing grafts and creates no new graft power. **It now also assembles
spell crystals** (fragments → Half → Full; completing a Full is unlock-gated) — see the 2026-06-24
decision.

Decisions required:

- Can it move rank grafts, suit grafts, or both? Transfer, swap, restoration, or overwrite?
- Does rearrangement undermine the permanence of earlier conquest decisions?
- Spell side: exact forge counts, and when "create a Full" unlocks.

## Q13 — Which landmarks deserve to exist? **EXPLORING — radius 4**

Candidate minimal verbs:

- Rest/recover.
- Rearrange a graft + **forge spell crystals** (Forge).
- **Swap the class Staff (Fallen Heroes — new 2026-06-24).**
- Encounter a rare relic tradeoff (Lair/Caravan).
- Hunt a recruit or harder reward.
- *(Sanctum's "attune a spell" verb is superseded — needs a new role or removal.)*

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

- Full five-continent alpha or a shorter representative validation slice?
- Minimum enemy behaviors per pressure package.
- Minimum route, landmark, relic, and class content needed to test divergence.
- Whether all four classes need complete Continent 1–5 progression in the first external
  alpha.

Candidate exit bar:

- One stable representative run shape.
- Four distinguishable classes.
- Replacement grafts and an accepted deck lifecycle.
- Minimal landmark and relic packages.
- Trustworthy UI and revised tutorial.
- Save/resume, evidence capture, and no progression-blocking bugs.

---

# 8. Opened by the 2026-06-24 crystal/continent/equipment decision

The [`crystals, continents & equipment decision`](../decisions/2026-06-24-crystals-continents-and-equipment.md)
resolved the spell, relic, class-model, and campaign-shape *shapes*, but opened a set of detail
questions and surfaced two design holes. These are tracked here so they don't get lost.

## Contradictions surfaced (resolved + open)

| # | Contradiction | Status | Resolution / where it lives |
|---|---|---|---|
| C1 | `constraints.md` "no secondary wallet — redundant kills produce no **fragments**" vs. the new **spell-crystal fragments** | **Resolved** | Constraint reworded: no *generic spendable* currency; spell fragments are the one bounded, suit-specific, Forge-only exception. ([[canon/v3/constraints]]) |
| C2 | `vision.md` "depth not from parallel currencies, inventories, ability subsystems" vs. **5 equipment slots + a crystal gauntlet** | **Resolved (ratify wording)** | Vision now frames them as *bounded, legible* fixed positions, not managed inventory. Edits the core vision line — **confirm the wording at next session.** ([[canon/v3/vision]]) |
| C3 | **Sanctum's** verb was "Attune a spell"; spells now forge from fragments | **Open → Q33** | Sanctum's role is obsolete; needs a new verb or removal. |
| C4 | **Fallen Heroes** landmark introduced but undefined | **Open → Q32** | No placement, cost, or legal staff↔ladder pairing rules yet; no detail page. |
| C5 | Migration spec used "Continent 1/2" in the *old* two-chapter sense | **Resolved** | Annotated to disambiguate from continents = the five beats. ([`../delivery/migration-v2-to-v3.md`](../delivery/migration-v2-to-v3.md)) |

## Q28 — Spell-crystal forge economy **EXPLORING — radius 4**

The model is set (Fragment → Half castable; Full = non-castable win token; fragments are
suit-specific). Numbers and gating are open:

- Fragments per drop, and the drop trigger (lean: ~1 in 4 combats yields fragments).
- Count to forge a **Half** (lean: 2) and a **Full** ("a lot" — placeholder 3 or 6).
- Does the Full unlock allow **fragments → Full directly**, or must a Half exist first?
- What **unlocks the ability to create a Full** at all (endgame-gated — by what trigger)?
- Does forging happen only at the **Forge**, or is there a second source?

## Q29 — The gauntlet **EXPLORING — radius 3**

- Final name for the four-crystal holder (working: "gauntlet/bracelet").
- Does **holding all four** crystals (before any Full) do anything, or is it purely storage?
- How the gauntlet, tiers, and "a Full is set aside" read in the UI.

## Q30 — Equipment slot identities **EXPLORING — radius 4**

- Confirm/replace the placeholder themes: **Cloak ≈ roads, Ring ≈ economy, Hat ≈ recruitment,
  Amulet ≈ activated.**
- Which existing relic candidate (Split Seal, Doorstop, Crown of First Claim, Black Standard,
  Sainted Scalpel, Combat Cache, Warhorn, Hoard) is re-standardized into which slot.
- How many relic slots a normal run actually fills (lean: one or two).

## Q31 — Class ladder unlocks **EXPLORING — radius 4** *(extends Q5)*

The model is resolved (Staff = swappable passive enabler; one kept linear ladder per class). Open:

- How and when the **other three suit ladders** unlock over a run (the elegance/replayability lever).
- The per-class **Staff × ladder pairing** and rung values (Sentinel worked; others pending).

## Q32 — Fallen Heroes landmark **UNEXPLORED — radius 3** *(was C4)*

- Placement and cadence on the road; cost to swap a Staff.
- Which **staff ↔ ladder pairings** are legal and meaningful (e.g. Quartermaster ladder +
  Executioner staff) — and which are nonsense to forbid.
- Whether a swapped-out Staff is recoverable.

## Q33 — Sanctum's fate **UNEXPLORED — radius 3** *(was C3)*

The "Attune a spell" verb is dead (spells forge from fragments). Decide:

- A **new one-verb decision** that doesn't duplicate the Forge (crystals), Camp (rest), Lair
  (relics), or Shrine (consecrate) — e.g. a fragment source, a recovery/blessing rite — **or remove
  Sanctum** from the roster.

## Q34 — The God of Luck showdown (Continent 5) **DEFERRED → V3.5**

- The shape of the smaller "road" that is C5 (a short gauntlet, a single boss, or both).
- The boss fight's rules, and how the **self-weakened** state (no spells) is balanced against it.
- The **wager animation** states between continents, and the altered animation that triggers the
  showdown once all four crystals are Full.

## Q35 — Continent 4 loop & the opt-in ending **DEFERRED → V3.5**

- How the loop **scales or recycles** each pass without simply inflating enemy numbers.
- The "**You win?**" beat on first clear, and how looping is presented.
- How the opt-in ending is **signposted as a discoverable puzzle** — present enough that players can
  find it, hidden enough to preserve the surprise/betrayal — without it being a feel-bad "I missed
  the real ending for 40 hours."

## Q36 — Spell immunity exception **PROPOSED; CONFIRM — radius 3**

Current lean: a spell sits **above matching suit immunity** (a ♦ spell is castable against a
♦-immune enemy), shown explicitly. Ratify or reject, and define the visual treatment.

---

# Decision order

1. Deck lifecycle.
2. Class progression model and four class foundations *(model resolved; pairings + ladder unlocks — Q31)*.
3. Mutation vocabulary.
4. Five-continent pressure, gate, and attrition contracts; C4 loop & opt-in ending (Q35); C5 showdown (Q34).
5. Equipment/relics, crystal forge economy (Q28–Q30), Forge, landmarks (incl. Sanctum's fate Q33 and Fallen Heroes Q32), and overdraw.
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

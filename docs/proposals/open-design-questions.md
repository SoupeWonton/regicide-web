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

> **Sweep resolved (2026-06-27):** a Landry pass closed **Q5, Q6, Q7, Q12, Q13, Q14, Q15, Q16, Q17,
> Q18, Q29, Q30, Q31, Q32, Q33, Q36** (UI/visual items deferred to Gab). **Q1/Q3/Q4/Q27** (deck
> lifecycle leftovers) are **paused for human playtest**; **Q0** awaits a build-confirm; **Q34/Q35**
> and the C3–C5 half of **Q7** stay **V3.5**. See
> [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md).

> **Build sweep (2026-07-01): every remaining build blocker is closed or delegated.** Starting decks,
> cast semantics, graft/fragment separation, Camp (now **four-part**, incl. start-block 10) vs the auto
> seam reset, C2 province structure, redraw semantics, relic swap cadence, fragment banking, ability +
> relic contract delegation, placeholder UI, and full-autonomous build scope — see
> [`../decisions/2026-07-01-v3.0-build-decisions.md`](../decisions/2026-07-01-v3.0-build-decisions.md)
> and [`../delivery/plans/v3.0-build-execution.md`](../delivery/plans/v3.0-build-execution.md).
> **The V3.0 build no longer waits on any design question**; remaining tuning happens at playtest.

## Queue at a glance

| Order | Question | State | Decision packet or dependency |
|---:|---|---|---|
| 0 | Delete-vs-upgrade inventory: which live systems are deleted, upgraded, or kept | **Code-grounded 2026-06-27; awaiting build-confirm — mostly UPGRADE, only 4 true deletes** | Gates Slice 0 cutover — see integration plan |
| 1 | Deck lifecycle: recruitment, recovery, starting deck, curation | **Acquisition cadence resolved 2026-06-25; forgiveness-detail + removal open** | [`../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md) · [`systems/deck-lifecycle.md`](systems/deck-lifecycle.md) |
| 2 | Four class kits and progression model | **Resolved 2026-06-27 — path/Staff decoupled; start home path; C2 rung live; unlock-all on C2** | [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) |
| 3 | Card-mutation vocabulary beyond replacement grafts | **Resolved 2026-06-27 — grafts only (suit OR value)** | [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) |
| 4 | Five-beat (five-continent) pressure content | **C1–C2 = V3.0 (1:1 lore↔pressure); C3–C5 deferred → V3.5** | [`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md) |
| 5 | Royals, gates, and attrition cadence | **Gates + royal graft-cap-10 resolved; forgiveness floor + Camp resolved 2026-06-27; magnitudes need playtest** | [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) |
| 6 | Relics/equipment, spells/crystals, Forge, landmarks, overdraw | **All resolved by 2026-06-28** — Sanctum/landmarks/overdraw/immunity/slots; relics roster + count + bag; fragments agnostic/50-50/bracelet; gauntlet=holder; **Forge = forge**. Numbers + UI calls remain | [`../decisions/2026-06-28-relic-slots-fragments-and-ui.md`](../decisions/2026-06-28-relic-slots-fragments-and-ui.md) |
| 7 | UI/UX and tutorial contract | **Tutorial done; UI/UX = Gab (2026-06-27)** | [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) |
| 8 | Alpha product scope and difficulty target | **Solo-only + overdraw kept (2026-06-27); alpha contents to discuss with Gab** | [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) |
| 9 | Crystal/continent/equipment **details + surfaced contradictions** (Q28–Q36) | **Opened 2026-06-24** | [`§8`](#8-opened-by-the-2026-06-24-crystalcontinentequipment-decision) |

---

# 0. Delete-vs-upgrade inventory

## Q0 — Which live systems are deleted, upgraded, or kept? **PROPOSED; AWAITING BUILD-CONFIRM (code-grounded 2026-06-27)**

> **This is mostly an UPGRADE, not a rebuild.** The live `ascendingDeck` path (in the
> [`regicide-live`](../delivery/plans/v3.0-integration.md) worktree, commit `91d3677`) **already
> implements most of the V3 reward layer** behind the flag: Forge token-stamping, Sanctum rites,
> Caravan, Lair, Shrine, relic slots, spell tiers, the token/graft engine, and continent-mapped
> chapter roads. **The bias is preserve-and-repurpose; genuine deletes are few, and several have
> shared machinery that must be kept.** Build only after this is confirmed.

### What's actually in the live code (verified 2026-06-27)

- `experiments.ts` → `EXPERIMENTS` flags: `ascendingDeck:true` (the live mode), `provinceMode:false`,
  `replacementGrafts:false`, plus sim toggles (`killReplenish`, `preBossReshuffle`, `castleHearts`,
  `shortCastle`, `autoMarchAfterGates`) and `CURATION_CUT` (province class curation).
- `campaign.ts` → the ascending-deck landmark handlers already exist: `offerForge` (stamps **tokens**
  from a `tokenBudget`), `offerSanctum` (rites: Foresight / Blessing / Cleanse), `offerCaravan`
  (mythic relic, paid by a curse), `applyLairToken`, `offerShrine` (cleanse). Plus a **fragment track**:
  `tokenFragments` + `FRAGMENTS_PER_TOKEN = 6` + `presentFragmentShop` (the "graduation shop").
  **Note (2026-06-27): curses are removed from V3**, so the curse code (`undercut` tokens,
  `cursedCardIds`, the Cleanse rites, the Caravan curse-payment) is **dead** and gets cleaned up.
- `maps.ts` → `continentOf(chapter)` (ch1–3 → C1, ch4–6 → C2); node kinds
  `forge · market · abbey · tower · shrine · lair · camp · boss · recruit · draft · veteran · elite · council`;
  ascending `CONT1_CH1–3` chapter specs (the Gates/Courtyard/Throne roads) **alongside** the older
  `CHAPTER_1/2` province specs.
- `tokens.ts` / `content.ts` → the token (graft) engine, `RELIC_SLOTS`, `MYTHIC_RELIC_IDS`,
  `SPELL_UNLOCK_ORDER`, `HAILMARY_SPELL_IDS`, etc.

### Disposition — keep / upgrade / collapse / delete

| Live system (file) | Action | Careful note / dependency |
|---|---|---|
| `ascendingDeck` path | **Upgrade → the single V3 default** | This *is* the V3 base; do not rebuild |
| `EXPERIMENTS.ascendingDeck` / `provinceMode` flags | **Collapse** to one default | Remove the *branch*, not the machinery behind it |
| `replacementGrafts` flag + additive Hone path | **Collapse** → replacement is canon | Delete the additive `+1` branch only after replacement is the default (Q6) |
| Token/graft engine (`tokens.ts`) | **Keep** | It **is** the graft substrate (Reforge/Hone/temper/graft). Pruning the catalog = later token session |
| Forge handler (`offerForge`, token-stamp) | **Upgrade → spell forging** | Repurpose to fragments → Half; graft-rearrange moves to Sanctum (Q12) |
| Sanctum handler (`offerSanctum` rites) | **Upgrade → deck modification** (Q33) | Drop **Foresight** (scry) and **Cleanse** (curses gone); Blessing folds into Camp |
| **Curse system** (`undercut`, `cursedCardIds`, Cleanse, Caravan curse-payment) | **Delete** | Curses are **not a V3 mechanic** (Landry 2026-06-27) — dead code |
| Caravan / Lair / Shrine / Camp handlers | **Keep → tune to V3 verbs** | Already wired. **Caravan's curse-payment → replace with pay-from-hand discard-total**; Shrine → Consecrate; Camp → 4-axis |
| Relic slots / spell tiers (`RELIC_SLOTS`, `SPELL_UNLOCK_ORDER`, mythic) | **Upgrade** | → 5 equipment slots + crystal spells; map rosters later (Q30) |
| `maps.ts` chapter specs | **Upgrade** | Keep `CONT1_CH*`; retune; **remove Tower** node; **add Fallen Heroes** node |
| Base quick-game (`game.ts`, `rooms.ts`, `deck.ts`, `rules.ts`) | **Keep untouched** | Regicide quick-play is unrelated |
| **Fragment wallet + graduation shop** (`tokenFragments`, `presentFragmentShop`, `FRAGMENTS_PER_TOKEN`) | **Delete the spend-on-C-tier-tokens shop**; **upgrade the fragment *concept*** | Fragments survive as **spell** fragments (pooled by encounter count, forge → Half). Only the *buy-tokens-at-a-shop wallet* is removed |
| Standalone `provinceMode` arc (`CHAPTER_1/2`, `CURATION_CUT`, the `else` non-ascending offer branches) | **HOLD — under discussion (Q37)** | ⚠️ **Provinces are being redefined as sub-continents** (3 per continent). The province *machinery* (Gates/Courtyard/Throne 3-boss arc, `autoAdvanceAfterGate`) is likely **upgrade, not delete**. `CURATION_CUT` (class deck-curation at setup) is superseded by the path model and can go. Resolve **before** any removal. |
| Tower node/landmark | **Delete** (Q13) | No replacement reward |
| `tokenBudget` (forge budget for grafts) | **Delete** (resolved 2026-06-27) | **No forge/graft budget in V3.** Grafts come from kills (C1) + Sanctum transfers (C2); the Forge spends fragments, not a budget. Remove it. |

### The true deletes (everything else is upgrade/keep)
1. The **fragment graduation shop** (`presentFragmentShop` + spending fragments on C-tier tokens) — the fragment *concept* is kept and re-pointed at spells.
2. The **curse system** (`undercut`, `cursedCardIds`, Cleanse rites, Caravan curse-payment) — curses are not a V3 mechanic.
3. The **additive Hone graft** branch (once `replacementGrafts` is canon).
4. **Tower** node, the **Foresight** + **Cleanse** Sanctum rites, and `CURATION_CUT`.

**Held for discussion (Q37):** the **standalone province arc** — *not* a confirmed delete. Provinces
become **sub-continents** (3 in C1, 3 in C2); the province machinery is the substrate, so this is
expected to be an **upgrade**. See Q37.

**Output:** when Landry confirms this disposition (and Q37 lands), add it to the
[`2026-06-27 sweep`](../decisions/2026-06-27-v3.0-question-sweep.md) (or a dedicated Slice-0 record),
flip the integration plan's Q0 row to ✅, and treat the four "true deletes" as the only removal work —
everything else is a flag-collapse, rename, or repurpose.

---

# 1. Deck lifecycle

## Q1/Q3/Q4/Q27 — What is the complete deck lifecycle? **ACQUISITION RESOLVED 2026-06-25; remainder PAUSED for playtest (2026-06-27)**

> **Paused 2026-06-27:** the leftover deck-lifecycle calls (starting-deck fine detail, recovery
> magnitudes, curation/removal) can only be settled with **human playtesting** — on hold for now.
> (Mutation vocabulary itself is closed: replacement grafts only, Q6.)

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

## Q6 — Do any developed token families belong in V3? **RESOLVED 2026-06-27 — replacement grafts only**

> **Resolved:** a graft fires on an exact kill of an already-recruited card and replaces the **suit
> OR the value (rank)** of one held card — never both. The broader token catalog is retired until a
> playtest names a gap. See [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md).

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

## Q7 — What content realizes the accepted journey? **C1–C2 = 1:1 lore↔pressure (closed); C3–C5 DEFERRED → V3.5**

> **Clarified 2026-06-27:** for V3.0 the lore↔pressure mapping is **1:1** (Claim = C1, Shape = C2) and
> needs no further design. The open part is the **C3–C5 pressure packages / loop scaling** → V3.5.

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

## Q15 — What are the royal and gate rules? **RESOLVED 2026-06-25 + 2026-06-27 (immunity/info detail open)**

> **Added 2026-06-27:** exact-killing a Jack/Queen/King at a gate **triggers a graft, value capped at
> 10** — this also settles the skipped-royal question (gate kills graft regardless of the keep choice).

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

## Q16 — What is the attrition and rest cadence? **DIRECTION RESOLVED 2026-06-27; magnitudes need playtest**

> **Resolved (direction):** opening hand **always holds at least one Diamond**; road recovery is
> **Camp = a fixed three-part rest** — reshuffle discard → Tavern, redraw a fresh hand to **max hand
> size 5**, and **first attack deals double** (the whole bundle fires; not a pick-one menu). Updated
> 2026-06-27 from the earlier four-axis framing. Magnitudes/cadence numbers still want a human playtest.

Persistent hands, Tavern, and discard are accepted. Only explicit rests reshuffle and
redraw.

Decisions required:

- Where are rests guaranteed, optional, or absent?
- Do act boundaries rest the deck, offer a rest decision, or preserve state unchanged?
- How much recovery belongs to Hearts versus routes and landmarks?
- How quickly should a functionally lost expedition resolve?

## Q17 — What difficulty curve produces the duration target? **PARKED 2026-06-27 — fine for now**

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
- ✅ *Resolved 2026-06-28:* slot themes + the relic roster — **`relic_v1_design_3.0`** (29 relics,
  slotted, story-not-stats, non-overlapping with class paths). See Q30 / [`canon/v3/systems/relics`](../canon/v3/systems/relics.md).
- Spell forge counts (fragments → Half / Full) and drop rates.

**Working lean:** a small authored pool; most runs see one or two relics.

## Q12 — What does the Forge do? **RESOLVED 2026-06-27 — Forge = spells only**

> **Resolved (2026-06-27):** the **Forge's only verb is spell forging** (fragments → Half; fragments
> **pooled by encounter count**). **Graft rearranging moves to the Sanctum** (Q33). The road map
> needs retuning for the re-scoped pair.

Still open (now a **Sanctum** question): can graft-rearrange move rank, suit, or both — transfer,
swap, or overwrite? And the spell forge counts / encounter-pool numbers.

## Q13 — Which landmarks deserve to exist? **RESOLVED 2026-06-27 — roster ratified**

> **Resolved:** the [`landmarks`](systems/landmarks.md) roster is accepted, with **Forge = spells**
> and **Sanctum = deck modification** (Q12/Q33). Residuals: Fallen Heroes cost (Q32), Camp tuning.

Candidate minimal verbs:

- Rest/recover.
- Rearrange a graft + **forge spell crystals** (Forge).
- **Swap the class Staff (Fallen Heroes — new 2026-06-24).**
- Encounter a rare relic tradeoff (Lair/Caravan).
- Hunt a recruit or harder reward.
- *(Sanctum's "attune a spell" verb is superseded — needs a new role or removal.)*

Every landmark must answer:

> Why would this deck route here now, and what competing opportunity is surrendered?

## Q14 — Should overdraw-and-select remain? **RESOLVED 2026-06-27 — kept as-is**

Working direction: retain the campaign Diamonds rule, show the current hand during
selection, and validate whether its planning depth justifies modal interruption and
divergence from quick-game Regicide.

Evidence required:

- Decision quality with current-hand context visible.
- Interruption cost across frequent Diamond triggers.
- Extreme outcomes after rank-replacement grafts.

---

# 6. Player understanding

## Q8 — What is the minimum trustworthy UI/UX contract? **DEFERRED TO GAB (2026-06-27)**

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

## Q9 — What does the tutorial teach? **RESOLVED 2026-06-27 — tutorial is done**

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

## Q18 — Is alpha solo-first or multiplayer-complete? **RESOLVED 2026-06-27 — solo only for V3.0**

Alternatives must address:

- Shared-deck class ownership.
- Who chooses a graft after a communal kill.
- How starting hands are dealt.
- Owner-only versus party-wide loopholes.
- Reconnection requirements for external tests.

## Q21 — What constitutes an alpha-complete run? **DEFERRED 2026-06-27 — discuss with Gab; may be this version**

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
| C1 | `constraints.md` "no secondary wallet — redundant kills produce no **fragments**" vs. the new **spell fragments** | **Resolved (re-check wording)** | No *generic spendable* currency; spell fragments are the one bounded, **single-purpose** exception — now **agnostic + bracelet-armed** (2026-06-28), so confirm the "suit-specific, Forge-only" phrasing. ([[canon/v3/constraints]]) |
| C2 | `vision.md` "depth not from parallel currencies, inventories, ability subsystems" vs. **5 equipment slots + a crystal gauntlet** | **Resolved (ratify wording)** | Vision now frames them as *bounded, legible* fixed positions, not managed inventory. Edits the core vision line — **confirm the wording at next session.** ([[canon/v3/vision]]) |
| C3 | **Sanctum's** verb was "Attune a spell"; spells now forge from fragments | **Open → Q33** | Sanctum's role is obsolete; needs a new verb or removal. |
| C4 | **Fallen Heroes** landmark introduced but undefined | **Open → Q32** | No placement, cost, or legal staff↔ladder pairing rules yet; no detail page. |
| C5 | Migration spec used "Continent 1/2" in the *old* two-chapter sense | **Resolved** | Annotated to disambiguate from continents = the five beats. ([`../delivery/migration-v2-to-v3.md`](../delivery/migration-v2-to-v3.md)) |

## Q28 — Spell fragment economy **RESOLVED 2026-06-28 (model + Forge); numbers to tune**

> **Resolved 2026-06-28** ([decision](../decisions/2026-06-28-relic-slots-fragments-and-ui.md)):
> **fragments are agnostic** (generic, not suit-typed) and **drop 50/50 after each encounter.** The
> **bracelet** is the between-encounter UI where the player places fragments into the **gauntlet's** four
> suit holes; **tiers coexist and fragments accumulate** — **equip** to use a suit's spell now or
> **sandbag** to build **Fragment → Half → Full**. The **Forge landmark keeps its verb — forge** — it
> forges accumulated fragments into the next tier. *(Replaces "suit-specific fragments pooled by encounter
> count.")* The code's generic `tokenFragments` are **closer to this** than the old suit-specific model.

**Still open (numbers + one small call):**

- Numbers: **fragments per Half** (lean ~2), effect values, the 50/50 drop, Full counts/unlock (**V3.5**).
- **Grafts vs. fragments:** does a redundant kill (the graft trigger, Q6) *also* drop a fragment, or
  are these separated?

## Q29 — The gauntlet **RESOLVED 2026-06-28 — gauntlet = holder, bracelet = its UI**

- **Resolved:** the **gauntlet** is the four-suit-crystal holder (name confirmed); the **bracelet** is the
  between-encounter UI/UX screen where fragments are placed into it.
- Does **holding all four** (before any Full) do anything, or is it purely storage? *(open, not a blocker)*
- How the holder, tiers, and "a Full is set aside" read in the UI ([`ui-ux-v3.0`](../delivery/plans/ui-ux-v3.0.md)).

## Q30 — Equipment slot identities + relic roster **RESOLVED 2026-06-28 (themes, roster, count)**

> **Slots + themes locked:** the four relic slots are **Amulet · Ring · Cloak · Hat**, themes
> **Cloak = roads · Ring = economy · Hat = recruitment · Amulet = activated** (Amulet = a button slot).
>
> **Roster resolved (2026-06-28):** the authored pool is **`relic_v1_design_3.0`** — 29 relics
> (Cloak 6 · Ring 8 · Hat 8 · Amulet 7), catalogued in [`canon/v3/systems/relics`](../canon/v3/systems/relics.md)
> ([decision](../decisions/2026-06-28-relic-v1-design-3.0.md)). Every relic was checked against the class
> paths to avoid re-skinning a class ability.
>
> **Per-run count resolved (2026-06-28):** **one relic per slot** (up to four), equipped from a **bag**
> of collected relics via the between-encounter screen — supersedes `RELIC_SLOTS = 2`.
> ([decision](../decisions/2026-06-28-relic-slots-fragments-and-ui.md) · UI: [`ui-ux-v3.0`](../delivery/plans/ui-ux-v3.0.md).)
>
> **Code reality:** live relics carry `slot: arms | armor | trinket` with **`RELIC_SLOTS = 2`** and a
> **13-relic `ITEMS` roster** — superseded; only **Hoard** (→ Ring) and **Sainted Scalpel** (→ Amulet)
> carry forward.

**Still open:**

- **Held candidates** not yet in the pool: Transmute, Ebb (Amulet), Spoils (Hat), Waystone (Cloak).
- **Fragment-touching relics** (Requisition Writ, Caravan Coin, the held Prospector) — reconcile with
  the **fragments** decision (next session).
- **Caravan payment:** the live Caravan buys a mythic by **cursing your 2s/3s** — curses are removed,
  so its payment becomes **pay-from-hand discard-total** (see [`systems/landmarks`](systems/landmarks.md)).

## Q31 — Class ladder unlocks **RESOLVED 2026-06-27** *(extends Q5)*

> **Resolved (2026-06-27):** path and Staff are **decoupled**. A class **starts on its home-suit
> path** (Sentinel ♠, Executioner ♣, Quartermaster ♦, Surgeon ♥); **V3.0 lights only the C2 rung —
> a single ability, the ladder's first rung** (granted/revealed by an animation on entering C2; it
> does **not** rung up within C2). **Completing C2 unlocks all three other paths**, open and
> selectable on entering C2. The **Staff is a separate passive — each class has four; you pick one of
> your class's four at class-select** (menu choice), swapped at **Fallen Heroes** (unlocked after C1;
> the swap offers one randomly-drawn Staff from each of the four classes). See
> [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md).
> This supersedes 2026-06-25 Decision C ("Staff = home suit") and D ("one player-chosen tree").
>
> **Staff roster confirmed (2026-06-28):** the four Staffs per class **are the passive signatures**
> already authored in [`facet-and-linear-candidates`](../wiki/v3/classes/facet-and-linear-candidates.md)
> (16 total) — build against those; only numeric tuning remains.

## Q32 — Fallen Heroes landmark **RESOLVED 2026-06-27 (via Q31)**

> **Resolved:** verb = **swap your Staff**; **unlocked after C1**, sits mid-C2; the swap offers **one
> randomly-drawn Staff from each of the four classes** (each class has four signatures; one is drawn
> at random per faction, your own class included). Because Staff is decoupled from the suit path, *any* Staff pairs
> with *any* class — no pairing legality table needed. **It is just a swap — no cost, repeatable**
> (resolved 2026-06-27); a swapped-out Staff is recoverable by swapping back on a later visit.

## Q33 — Sanctum's fate **RESOLVED 2026-06-27 — Sanctum = "Rearrange" (deck modification)**

> **Resolved:** the Forge is now spells-only, so **Sanctum inherits the old Forge verb.** Sanctum's
> verb is **Rearrange** — **up to two transfers per visit**, each moving a **suit or a value** between
> two owned cards (three legal shapes: two suit transfers, two value transfers, or one of each). **No
> new power** — pure redistribution of properties the deck already earned. Distinct from
> Shrine/Consecrate (which *authors a new* reshape). The budget (two moves) settles the earlier
> one-vs-budget tuning question. Full spec in
> [`systems/landmarks`](systems/landmarks.md#sanctum--rearrange-deck-modification--resolves-q33-inherits-the-old-forge-verb-q12).
> **Build note:** repurpose the live `offerForge` token-stamp machinery to *move* a token, not stamp.

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

## Q36 — Spell immunity exception **RESOLVED 2026-06-27 — above immunity; visual = Gab**

> **Resolved:** a spell sits **above matching suit immunity** (a ♦ spell is castable against a
> ♦-immune enemy). The visual treatment that signals it is Gab's call.

## Q37 — Provinces as sub-continents **RESOLVED 2026-06-27**

> **Resolved:** a **province is a sub-continent**; each continent contains **three provinces**, and
> **each province is one boss-tier** (Continent → Province ×3 → road → one boss). See
> [`../decisions/2026-06-27-v3.0-question-sweep.md`](../decisions/2026-06-27-v3.0-question-sweep.md) Decision 11.
>
> - **C1 — Claim:** Province 1 = recruit **6s+7s** · Province 2 = **8s+9s** · Province 3 = **10s / Council of Tens**.
> - **C2 — Shape:** Province 1 = **Jack** tier → Jack Gate (keep 3/4) · Province 2 = **Queen** tier →
>   Queen Gate (keep 2/4) · Province 3 = **King** tier → King Gate (crown, keep 1/4). The 3/2/1 pyramid
>   spreads one royal tier per province.
> - **Seams:** a rest/reshuffle at **every province boundary** (not just continent boundaries).
> - **Save/resume:** **none in V3.0** — a run is single-session; only the **lineage meta** persists
>   between runs. (Multi-session save/resume is a later concern.)
> - **C2 path ability** reveals on **entering C2 = start of C2 Province 1**; **Fallen Heroes** sits at
>   the **start of C2 Province 2**.
> - **Code:** keep the province/gate machinery + `CONT1_CH*` maps; retire only the `provinceMode`
>   *flag*, `CURATION_CUT`, and the non-ascending `else` branches (closes the Q0 hold).

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

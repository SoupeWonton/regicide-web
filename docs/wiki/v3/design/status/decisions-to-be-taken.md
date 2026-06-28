---
type: note
status: current
authority: derived
topics: [v3, decisions, discussion, open-questions]
sources: [proposals/open-design-questions.md, research/simulation/bot-reliability-and-architecture.md, canon/principles/design-practice.md]
aliases: [Decisions to be taken, Couch discussion, Q decisions, Decision agenda]
last_updated: 2026-06-22
---

# Decisions to be taken — Landry ↔ Gab agenda

**How to use this page.** A discussion agenda for the couch. Each decision below is a
self-contained card: the **question**, the **options on the table**, **how we decide it**,
the **one thing to read first**, and a blank **verdict** line to fill in. Work top-to-bottom
— the order respects real dependencies (later cards assume earlier ones are settled).

This is a *discussion aid*, not canon. Authority is our consensus per
[[canon/principles/design-practice|design practice]]; when we agree, the decision moves to
[[decisions/README|a dated decision record]] and canon, and leaves the
[[proposals/open-design-questions|active queue]].

> **Mostly resolved 2026-06-27** (Landry pass — see [[decisions/2026-06-27-v3.0-question-sweep|the
> sweep decision]]). Closed or directional: **D1** (class = home-suit path + selectable Staff),
> **D2/D16** (Forge = spells only, **Sanctum = deck modification**, Fallen Heroes = Staff swap after
> C1 / 1-of-3 random), **D9** (relic slots Amulet/Ring/Cloak/Hat confirmed; mapping open), **D11/D20**
> (spells above immunity, gauntlet named), **D18** (start home path, C2 unlocks all). Still needs a
> human playtest: **D6 gate feel, D7 floor, D12 rests, D13 difficulty** (magnitudes only).

**Read once before we start:** [[v3/design/evidence/bot-reliability-and-architecture|Why the simulator is a floor, not a forecast]].
The sim cannot answer difficulty, card-economy, or feel — most of what's below. So "how we
decide" is almost always **us + a human playtest**, not a bot number.

## Legend — how each decision gets resolved

- 🛋️ **Decide now** — taste/structure/scope. Just us, this session.
- 🎮 **Draft → human playtest** — we design it, then players validate. Sims can't.
- 🤖 **Sim has a (narrow) role** — floor / regression / "is X deadlier than Y" only.

**Two things to hold in mind the whole time:**
1. **The sim is a floor, not a forecast.** It measures the *worst* a foresight-less bot
   does, not what humans experience. No card-economy, difficulty, or feel question is
   settled by a sim number. ([[v3/design/evidence/bot-reliability-and-architecture|why]])
2. **Many of these can't be decided alone — they lock together.** See the clusters below.

## Decision clusters — what must be decided together

Deciding one card in a cluster without the others risks rework. Settle the cluster's
*shape* together, even if details follow.

- **🧱 The deck spine** — D1 class model · D3 mutation vocabulary · D5 deck lifecycle.
  *Why together:* a class's starting hand and loophole, what a graft can do, and how the
  deck grows/recovers are the same object seen from three sides. The class model (D1) can't
  finalize starting hands until the deck lifecycle (D5) is set; the mutation vocabulary (D3)
  is the verb both rely on.
- **⚔️ The challenge** — D6 gates · D13 difficulty curve · D12 rest cadence (+ D7 floor fix).
  *Why together:* gates are *where humans fail*, so the difficulty curve and the rest/recovery
  cadence that feeds them are one tuning surface. Pick the gate shape and the rest rhythm as a pair.
- **🎁 The reward layer** — D9 relics · D11 spells · D10 landmarks.
  *Why together:* landmarks are the *delivery system* for relics and spells — you can't place
  landmarks until you know what they hand out. Spells (Sanctum) and relics (Lair) being near-settled
  means landmarks are now mostly a **consequence** to derive, not an independent choice.
- **📦 The frame** — D4 alpha scope · D8 overdraw · UI/tutorial.
  *Why together:* scope decides how much of the above ships, which sets the UI/tutorial surface.

> **Suggested couch order:** lock the **🧱 deck spine** first (it's the radius-5 keystone),
> then the **⚔️ challenge** (your real difficulty lever), then **🎁 rewards** falls out, then
> **📦 frame** scopes the alpha.

---

## Tier 1 — Decide now (🛋️), unblocks everything else

### D1. Class progression model — *passive × ladder pairing* ⭐ (model ✅ ADOPTED 2026-06-24)
**Adopted:** the **enabler-passive × payoff-ladder** model is the V3 direction — the **passive is
the Staff** (swappable equipment), the **ladder is kept** and unlocks across continents. See
[[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] (Decision C).
**Still open:** which passive × ladder pairing per class (Sentinel worked; others pending).
**Original question (for history):** adopt the enabler-passive × payoff-ladder model — each
class is one mild Continent-1 **passive** (flavor) *paired with* one **linear ladder** that rises
and multiplies across Continents 2/3/4 — over the older pure-linear or pure-facet options? And
then: which passive × ladder pairing per class?
**Where we are now:** reframed from the old "linear vs facets" binary into this hybrid pairing.
**Sentinel is fully worked** against the real engine (one royal at a time, Spade value = shield,
survive by discarding, no banks); **Executioner / Quartermaster / Surgeon still need the same
rework** (tagged "old model — pending" in the showcase).
**Design rules locked this session:**
- Passives are **mild / costed** Continent-1 flavor — they change *how/when* your key moment fires,
  never hand you a scaling resource.
- Ladders **rise C2 < C3 < C4** and are **multiplicative** — they scale with a *native quantity*
  (shield built, Spade value, combo size, discard pile) or the across-run recruit/graft snowball,
  **never "all enemies"** (single-enemy fights).
- **No bank / wallet subsystem** (canon: no secondary wallet, no new station).
**Options:** [[proposals/classes/four-core-classes|pure linear]] ·
[[proposals/classes/facets-and-pressure-permutations|pure facets]] · **the pairing showcase**
[[proposals/classes/facet-and-linear-candidates|passive × ladder candidates]] (current direction;
Sentinel reworked, rest pending). Identities (Block/Kill/Combine/Persist) already accepted:
[[canon/v3/classes/overview|class overview]].
**How we decide:** 🛋️ legibility + identity judgment — "can each class be read with names &
portraits hidden, and does a pairing feel multiplicative?" then 🎮 confirm feel in playtest.
Numbers in the showcase are illustrative.
**Cite:** Q5 in [[proposals/open-design-questions|open questions]].
**Verdict (2026-06-27):** Path and Staff are **decoupled.** Class starts on its **home-suit path**
(Sentinel ♠ / Executioner ♣ / Quartermaster ♦ / Surgeon ♥); **V3.0 lights only the C2 rung — a single
ability, the ladder's first rung** (animated reveal, not laddered within C2); clearing C2 **unlocks all
three other paths.** The **Staff is a separate passive — each class has four; you pick one of your
class's four at class-select** (menu choice), swapped at **Fallen Heroes** (after C1; the swap offers
one random Staff from each of the 4 classes).
The 16 suit-path ladders are drafted in [[proposals/classes/facet-and-linear-candidates|the showcase]].

### D2. Forge behavior
**Question:** does the Forge move rank grafts, suit grafts, or both — transfer, swap, or overwrite?
**How we decide:** 🛋️ pure mechanic design. Canon already says "rearrange, no new power."
**Cite:** Q12 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D3. Mutation vocabulary — hold the line?
**Question:** replacement grafts only, or restore a small token set?
**Working lean:** grafts only until a playtest shows a real gap. 🛋️ ratify or challenge.
**Cite:** Q6 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D4. Alpha scope — solo-first vs multiplayer-complete
**Question:** what does the first external alpha contain?
**How we decide:** 🛋️ product/scope call (Q18 + Q21). Sets the bar for everything below.
**Cite:** Q18, Q21 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D5. Deck lifecycle leftovers
**Question:** starting-deck composition (#1) and missed-recruit recurrence / Hunts (#2).
**Settled by evidence:** no-removal holds; the "death spiral" is a floor risk, not structural
— see [[v3/design/evidence/deck-lifecycle-sim-results|Q1 sim results]] (F2/F3).
**Still to decide:** 🛋️ starting deck + whether missed recruits recur.
**Cite:** Q1 in [[proposals/open-design-questions|open questions]];
[[proposals/systems/deck-lifecycle|deck lifecycle proposal]].
**Verdict:** _______________________

---

## Tier 2 — Draft together, then human playtest (🎮)

### D6. Royals & gates ⭐ where humans actually fail
**Question:** is a gate one royal, a suit set, or a court sequence? Are immunities the main
adaptation pressure? What replaces royal recruitment as payoff?
**Why first in this tier:** our evidence shows **humans die at gates/bosses**, not by attrition
([[v3/design/evidence/deck-lifecycle-sim-results|F3]]). This is the #1 playtest target.
**How we decide:** 🎮 design the gate, then watch humans hit it. Sim is foresight-blind here.
**Cite:** Q15 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D7. The floor fix — "bad opening, run dead from the start"
**Question:** mulligan / guaranteed-diamond opener, and/or a hand-≤2 safety net?
**Why:** the real floor problem is **human variance** on bad openings, not the median run.
**How we decide:** 🎮 humans only — the bot floor is a different (architectural) disease;
see [[v3/design/evidence/bot-reliability-and-architecture|reliability brief]].
**Cite:** Q1 #3 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D8. Overdraw-and-select — keep it?
**Question:** does the planning depth justify the modal interruption on every ♦ trigger?
**How we decide:** 🎮 UX / decision-quality — a human-feel question; bots underprice information.
**Cite:** Q14 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D9. Relics ⭐ (model ✅ RESOLVED 2026-06-24; roster ✅ RESOLVED 2026-06-28), and D10. Landmarks
**Resolved (relics model):** relics are **equipment** in four slots (Cloak/Ring/Hat/Amulet)
alongside the **Staff** (class ability); the slotless model is superseded. See
[[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] (Decision C).
**Resolved (relics roster, 2026-06-28):** themes locked (**Cloak=roads · Ring=economy · Hat=recruitment ·
Amulet=activated**) and the pool authored — **`relic_v1_design_3.0`**, 29 relics, in
[[canon/v3/systems/relics|relics catalog]] ([[decisions/2026-06-28-relic-v1-design-3.0|decision]]).
**Still open (relics):** per-run count; the held candidates (Transmute/Ebb/Spoils/Waystone); fragment-touching relics.
**Question (landmarks):** which verbs deserve to exist (now incl. **Fallen Heroes** = staff swap)? → **consolidated map proposed** in
[[proposals/systems/landmarks|landmarks]] (Shrine now = **Consecrate**, the no-kill reshape).
**How we decide:** 🎮 design-first, human-validate. *Note:* relic power touches the card
economy, so **don't trust a sim power-baseline** — judge by play.
**Read first:** [[proposals/systems/landmarks|landmarks]] · [[proposals/systems/relics-and-spell-cards|relics & spell-cards brainstorm]].
**Cite:** Q11, Q13 in [[proposals/open-design-questions|open questions]].
**Verdict (relics):** _______________________
**Verdict (landmarks):** _______________________

### D11. Spells — confirm the model ⭐ ✅ RESOLVED 2026-06-24
**Resolved:** spells are **crystals** — four suit identities in a gauntlet, **Fragment → Half**
castable, **Full** a non-castable endgame/win token; forged from suit-specific fragments at the
Forge; spells sit above matching immunity (lean). See
[[decisions/2026-06-24-crystals-continents-and-equipment|crystals decision]] (Decision A).
**Still open (content/tuning, not model):** Fragment/Half text & numbers, forge counts, drop rates.

### D12. Rest cadence, UI/UX contract, tutorial
**Question:** where are rests guaranteed? the minimum trustworthy UI; what the tutorial teaches.
**How we decide:** 🎮 Gab's domain + new-player testing.
**Cite:** Q16, Q8, Q9 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D13. Difficulty curve / duration target
**Question:** ~1 hr/continent, 4–5 hr/run, 15–25 hr to first win — does the real curve match?
**How we decide:** 🎮 **humans only.** This is the question sims are *least* able to answer.
**Cite:** Q17 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

---

## Tier 2½ — Follow-ups opened by the 2026-06-24 decision

These came out of the crystal/continent/equipment decision; the *shapes* are set, these are the
details + two design holes it surfaced. Full text: [[proposals/open-design-questions|open questions §8]].

### D15. Crystal forge economy 🛋️→🎮
**Question:** fragments per drop (~1 in 4 combats?), count for a **Half** (lean 2) and a **Full**
("a lot" — 3? 6?), whether fragments can go **straight to Full** once unlocked, and **what unlocks
creating a Full.**
**How we decide:** 🛋️ set placeholders now, 🎮 tune by play. **Cite:** Q28.
**Verdict:** _______________________

### D16. Sandbox holes — Sanctum's fate & Fallen Heroes ⚠️ *(surfaced contradictions C3/C4)*
**Question (Sanctum):** the "attune a spell" verb is **dead** (spells forge at the Forge). Give
Sanctum a new one-verb role (fragment source? recovery rite?) or **remove it.**
**Question (Fallen Heroes):** placement, cost, and which **staff↔ladder pairings** are legal/meaningful.
**How we decide:** 🛋️ taste/structure. **Cite:** Q33, Q32.
**Verdict (Sanctum):** _______________________
**Verdict (Fallen Heroes):** _______________________

### D17. Equipment slot identities ✅ RESOLVED 2026-06-28
**Resolved:** themes locked — **Cloak = roads · Ring = economy · Hat = recruitment · Amulet = activated** —
and the pool authored as **`relic_v1_design_3.0`** (29 relics, each slotted), in
[[canon/v3/systems/relics|relics catalog]] ([[decisions/2026-06-28-relic-v1-design-3.0|decision]]).
**Cite:** Q30. **Still open:** per-run relic count; held candidates; fragment-touching relics.
**Verdict:** **`relic_v1_design_3.0`** — themes + 29-relic roster accepted (Landry 2026-06-28).

### D18. Class ladder unlocks 🛋️ *(extends D1)*
**Question:** how/when the **other three suit ladders** unlock over a run (the replayability lever),
plus the per-class Staff × ladder pairings.
**How we decide:** 🛋️ legibility + 🎮 feel. **Cite:** Q31.
**Verdict:** _______________________

### D19. C4 loop & the opt-in ending 🎮
**Question:** how the loop scales/recycles each pass (not just bigger numbers), the "**You win?**"
beat, and how the ending is **signposted as a findable-but-surprising puzzle** (not a 40-hour miss).
**How we decide:** 🎮 humans — feel/discoverability. **Cite:** Q35, Q34.
**Verdict:** _______________________

### D20. Confirm: spells ignore matching immunity, and the gauntlet 🛋️
**Question:** ratify spells sitting **above matching suit immunity** (lean yes) + its visual; name
the **gauntlet** and decide whether holding all four (pre-Full) does anything.
**How we decide:** 🛋️. **Cite:** Q36, Q29.
**Verdict:** _______________________

### C2 to ratify — vision wording
The vision line ("no parallel inventories/subsystems") was reworded to admit the bounded equipment
slots + crystal gauntlet. **Confirm the wording** at next session ([[canon/v3/vision]]).

---

## Tier 3 — Sim keeps a narrow role (🤖)

### D14. Enemy / modifier lethality + regression
**Use the sim for:** "is modifier X deadlier than Y" (a foresight-free *relative* comparison)
and catching regressions when we ship a change. Nothing else.
**Cite:** Q7 in [[proposals/open-design-questions|open questions]];
[[v3/design/evidence/bot-reliability-and-architecture|reliability brief]] (Group C).
**Verdict:** _______________________

---

## Decision log (fill as we go)

| Date | Decision | Outcome | Moves to |
|---|---|---|---|
| 2026-06-24 | D11 spells, D9 relics model, class staff/ladder split (D1) | Crystals (Fragment/Half/Full), 5 equipment slots, 5-continent + God of Luck overlay, opt-in ending | [[decisions/2026-06-24-crystals-continents-and-equipment]] |

## Related pages

- [[v3/design/status/active-design-questions|Active design questions (full text)]]
- [[v3/design/evidence/deck-lifecycle-sim-results|Results from simulations — Q1]]
- [[v3/design/evidence/bot-reliability-and-architecture|Simulation reliability & bot architecture]]
- [[canon/v3/vision|V3 vision]] · [[canon/v3/classes/overview|Class identities]]

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

### D1. Class progression model — *linear vs facets* ⭐ our focus
**Question:** one fixed three-tier path per class, or one invariant loophole + a chosen facet?
**Options:** [[proposals/classes/four-core-classes|Four core classes — linear]] vs
[[proposals/classes/facets-and-pressure-permutations|Facets & pressure permutations]].
Identities (Block/Kill/Combine/Persist) are already accepted: [[canon/v3/classes/overview|class overview]].
**How we decide:** 🛋️ legibility + identity judgment — "can each class be read with names &
portraits hidden?" No sim can answer this. Couch call, confirm feel later in playtest.
**Read first:** the two proposal docs above + the **elimination pool**:
[[proposals/classes/facet-and-linear-candidates|facet & linear candidates]] (multiple
ladders + facet sets per class, with a KEEP/CUT worksheet). A **hybrid** (fixed tier-1 +
facet for tiers 2–3) is flagged there too.
**Cite:** Q5 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

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

### D9. Relics ⭐ our focus, and D10. Landmarks
**Question (relics):** how many per run? keep-or-sacrifice cadence? which relic tells a story
without duplicating a class or graft? → **model proposed** in
[[decisions/2026-06-22-spell-and-relic-models|spell+relic decision]] (ratify); roster TBD.
**Question (landmarks):** which verbs deserve to exist? → **consolidated map proposed** in
[[proposals/systems/landmarks|landmarks]] (Shrine now = **Consecrate**, the no-kill reshape).
**How we decide:** 🎮 design-first, human-validate. *Note:* relic power touches the card
economy, so **don't trust a sim power-baseline** — judge by play.
**Read first:** [[proposals/systems/landmarks|landmarks]] · [[proposals/systems/relics-and-spell-cards|relics & spell-cards brainstorm]].
**Cite:** Q11, Q13 in [[proposals/open-design-questions|open questions]].
**Verdict (relics):** _______________________
**Verdict (landmarks):** _______________________

### D11. Spells — confirm the model ⭐ our focus
**Question:** four fixed suit spell-cards with vertical tiers (silver→gold→purple),
ignoring enemy immunity? Acquisition at Sanctum vs Caravan?
→ **model proposed** in [[decisions/2026-06-22-spell-and-relic-models|spell+relic decision]]
(ratify with Gab); content roster authored separately.
**How we decide:** 🎮 design consensus + human feel.
**Read first:** [[proposals/systems/relics-and-spell-cards|relics & spell-cards brainstorm]] → "Spell cards".
**Verdict:** _______________________

### D12. Rest cadence, UI/UX contract, tutorial
**Question:** where are rests guaranteed? the minimum trustworthy UI; what the tutorial teaches.
**How we decide:** 🎮 Gab's domain + new-player testing.
**Cite:** Q16, Q8, Q9 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

### D13. Difficulty curve / duration target
**Question:** ~1 hr/act, 4–5 hr/run, 15–25 hr to first win — does the real curve match?
**How we decide:** 🎮 **humans only.** This is the question sims are *least* able to answer.
**Cite:** Q17 in [[proposals/open-design-questions|open questions]].
**Verdict:** _______________________

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
| | | | |

## Related pages

- [[v3/design/status/active-design-questions|Active design questions (full text)]]
- [[v3/design/evidence/deck-lifecycle-sim-results|Results from simulations — Q1]]
- [[v3/design/evidence/bot-reliability-and-architecture|Simulation reliability & bot architecture]]
- [[canon/v3/vision|V3 vision]] · [[canon/v3/classes/overview|Class identities]]

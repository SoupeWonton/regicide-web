---
kind: proposal
edition: v3
status: brainstorming
last_reviewed: 2026-06-28
topics: [v3, relics, equipment, cloak, ring, hat, amulet]
---

# Relic candidates by slot — brainstorm (2026-06-28)

> **Status: brainstorm — officialized into [[../../canon/v3/systems/relics|`relic_v1_design_3.0`]]
> (2026-06-28).** 29 of these graduated into the canon pool ([decision](../../decisions/2026-06-28-relic-v1-design-3.0.md));
> the rest are held (Transmute, Ebb, Spoils, Waystone) or deferred to fragments (Prospector). This page
> keeps the full brainstorm + cut rationale. ~10 per slot, generated then culled with
> Landry. The per-slot detail is mirrored in the wiki:
> [[../../wiki/v3/relics/proposed-design/cloak-roads-candidates|Cloak]] ·
> [[../../wiki/v3/relics/proposed-design/ring-economy-candidates|Ring]] ·
> [[../../wiki/v3/relics/proposed-design/hat-recruitment-candidates|Hat]] ·
> [[../../wiki/v3/relics/proposed-design/amulet-activated-candidates|Amulet]].

**The harness:** [`authoring/checklists/relic.md`](../../authoring/checklists/relic.md) ·
[`authoring/rules-digest.md`](../../authoring/rules-digest.md) ·
[`research/strategy/additional-strategy.md`](../../research/strategy/additional-strategy.md) ·
[`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md).

**Slot themes (locked 2026-06-28):** Cloak = roads · Ring = economy · Hat = recruitment · Amulet = activated.

**Legend:** ⚠ watch (still strong) · 👁 info-value · 🔁 brushes a class lane · 🩹 floor-relief ·
✦ added in review pass 1 · ★ kept reference · ✦spec needs exact rules.

## Review pass 1 — Landry, 2026-06-28

- **New rule recorded:** **losing a fight = death** (no flee-with-reward); every enemy (not just Kings)
  blocks one lever; the Jester cancels immunity but is absent in solo.
- **Direction:** no alternative economy, no stacking, no new wallet; the immunity thread belongs on the
  **Amulet** (a button), not bolted onto Hat recruits.

---

## CLOAK — roads *(cleanest slot — no class touches the between-fight layer)*

**Active:** Forked Road (choose both branches at a fork) · Forced March (skip one fight/road, no
conquest) · Bedroll (once/road, reshuffle discard → Tavern, no Camp) · Vanguard (first enemy of a road
can't counter on turn 1) · **Slip Away — discard 5 to retreat** (enemy not defeated) · Scout Ahead
(see next enemy's immunity).
**Parked:** Waystone (double landmark) — liked but too strong now.
**Cut:** Momentum (no stacking) · Long Shadow (off-theme) · Funeral March (losing = death).

## RING — economy *(dodge Quartermaster; no alt-economy / wallet / stacking)*

**Active:** Hoard ★ (+2 hand) · Interest (clean previous fight → +1 card) · Debt (draw 2 now, pay 1/turn
×2; *could be an Amulet*) · Requisition Writ (**2 cards** → 1 fragment at a landmark) · Liquidate (discard
1 → draw 2) · Last Coin 🩹 (**once/fight, first empty-handed turn → draw 3**) · ✦ Caravan Coin (pay-from-hand
cost −2) · ✦ Prospector (clear a road → 1 fragment; *confirm not over the no-wallet line*) · ✦ Double or
Nothing (once/fight, dump hand, draw that many +1).
**Cut:** Two-Face Ring (disliked) · Avarice (= Hoard) · The Vault, Bottomless Purse (alt economy).
*More still wanted here.*

## HAT — recruitment *(dodge Executioner; priority slot for expansion)*

**Active:** Conscription (overkill recruits with a **−1 token**) · Press-gang (recruits arrive
pre-shaped) · Rallying Cry (recruit → return a discard to Tavern) · Battlefield Promotion (first recruit
/fight +1 rank) · Spoils ⚠ (recruit a skipped card — narrow it) · ★ Black Standard (recruit → top of
Tavern; the *Hat of Familiarity* classic) · ✦ Apprentice (discard a fresh recruit → draw 2) · ✦ Muster
(recruited royals → top of Tavern) · ✦ Plunder (swap recruit for a same-suit discard card).
**Cut:** Triumph (too strong) · Usurper, Mockery (immunity-steal — confusing; move to Amulet) · Annex,
Double Draft (unclear — rework).
*Biggest rework target — recruitment rules still untapped.*

## AMULET — activated *(a button; distinct from one-use spells)*

**Active:** Sainted Scalpel ★ (once/fight: recycle N + draw 1) · Unbinding (once/enemy: cancel immunity
**for this play only**) · Transmute ⚠ (once/encounter: combo cap → 14 for one play) · Second Wind
(once/fight: extra turn) · Aegis (once/enemy: **−5** to next counterattack; a bit boring) · Bloodlust
(once/enemy: next play **+3 damage**) · Echo (once/fight: replay a discard card **for value only — no
suit power**) · Ebb ✦spec (once/enemy: enemy attack → 0 by paying half in cards) · Lodestone (once/fight:
tutor one named card to hand).
**Cut:** Last Breath (death-save, off-design).

---

## Open questions from the review

1. **Ebb** — exact rules (timing, what "paying half in cards" means).
2. **Transmute** — once/encounter may still be too strong; possible further nerf.
3. **Spoils** — how to narrow (once per road? skipped-only?).
4. **Prospector** — is granting a fragment acceptable, or does it cross the no-wallet line?
5. **Hat** — needs a second, larger expansion pass.
6. **Ring** — wants a few more clean economy ideas.

**Next step:** once these settle, survivors graduate into [`templates/relic.md`](../../authoring/templates/relic.md)
stubs through the self-review gate.

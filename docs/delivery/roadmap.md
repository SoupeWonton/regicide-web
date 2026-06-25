---
kind: delivery
edition: v3
status: active
last_reviewed: 2026-06-25
---

# V3 roadmap

## V3.0 product scope (decided 2026-06-25)

**V3.0 ships Continent 1 + Continent 2 only.** C3/C4/C5 → **V3.5**. Victory = complete C2
(defeat the first King at the King Gate). Death is **no-comeback** permadeath. See
[`../decisions/2026-06-25-v3-scope-c1-c2.md`](../decisions/2026-06-25-v3-scope-c1-c2.md) and
[`2026-06-25-acquisition-cadence-and-royal-gates.md`](../decisions/2026-06-25-acquisition-cadence-and-royal-gates.md).

### What's missing to ship V3.0 as playable

**A. Design gates still to close** (block the build that depends on them):

| # | Open design item | Question | Status |
|---|---|---|---|
| 1 | Tree-unlock count on C2 completion — one (player-chosen) / several / all | Q31 / Decision C | Active brainstorm; lean = one, player-chosen |
| 2 | Each class's base **Staff** + **starting ladder** + rung values for C1/C2 | Q5 / Q31 | Open (broadening deferred; *starting* kit is not) |
| 3 | **Forgiveness numbers** — opening ♦/♥ floor; C1→C2 seam reset (clean vs. partial) | Q1 | Direction agreed; numbers open |
| 4 | **Road structure / rest cadence** — combat-gated landmarks vs. skirmish→event; guaranteed rests | Q16 | Open |
| 5 | **Fallen Heroes** detail — swap cost, legal cross-class pairings, recoverability | Q32 | Placement (mid-C2) set; rest open |
| 6 | **Crystal/spell layer in V3.0** — do castable Fragment/Half spells appear, given Full/win is deferred? | Q28 | Open (new, from scope cut) |
| 7 | **Overdraw-and-select** — keep or cut | Q14 | Proposed; evidence required |
| 8 | **Landmark roster for C1/C2** incl. Sanctum's fate | Q13 / Q33 | Open |
| 9 | **Token scope** — grafts-only vs. wider | Q6 | Lean = grafts only |
| 10 | **Equipment slots + relic roster** | Q30 / Q11 | Deferred to dedicated session (may ship minimal/empty) |
| 11 | **UI/UX contract** + **revised tutorial** | Q8 / Q9 | Open |
| 12 | **Solo vs. multiplayer** for V3.0 | Q18 | Lean = solo-first |

**B. Build gates still to do** (delivery, mostly downstream of A):

- Migrate redundant-exact-kill from additive Hone to **rank-or-suit replacement graft**.
- Remove the fragment wallet/shop; repurpose Forge around grafts.
- **C1 content:** recruit numbers 6–10 by exact kill; hunting; chapter backfill; full A–10 by C1 end.
- **C2 content:** graft-on-kill on roads; the **3/2/1 royal gate pyramid** (Jack/Queen/King gates, the crown decision).
- **No-comeback permadeath** + the **C1→C2 seam reset**.
- **Tree-unlock meta** on C2 completion.
- Four-class scaffold (Staff + starting ladder).
- Save/resume across the two continents; boundary recap.
- Evidence capture; no progression-blocking defects.

## Now

1. Migrate the redundant-exact-kill slice from additive Hone/added-suit behavior to
   accepted rank-or-suit replacement grafts, including state, UI, tests, and saves.
2. Audit and accept or revise the V3 foundation decision and four-class proposal.
3. Remove the fragment wallet/shop and repurpose Forge around existing grafts.
4. Keep smoke coverage green while separating V3 behavior from quick-game Regicide.

Design exploration is not inferred from this implementation sequence. In particular,
permanent card removal has no implementation scope until its design axes are explored
and Landry and Gab reach consensus.

## Next

1. Implement the four-class scaffold: a swappable **Staff** (passive enabler) + a kept linear ladder, and starting hands.
2. Replace V2 relic slots and spell inventory with the V3 item model — **five equipment slots**
   (Staff + Cloak/Ring/Hat/Amulet) and **four crystal spells** (fragment/half/full, forged at the Forge).
3. Build the **five-continent** journey (Claim→Master) with the God of Luck overlay, the **opt-in
   forge-to-Full ending**, two acquisition continents, boundary recap/resume, full-reset death, and
   internal seeded fixtures.
4. Update onboarding around the accepted journey and replacement graft.

## Later

- Tune encounters and later-continent pressure from playtest and simulation evidence.
- Reintroduce additional classes one at a time only after the four core roles are distinct.
- Expand accepted content without adding parallel currencies; implement deck curation
  only if a specific design reaches consensus.

Completed work leaves this page and is recorded in Git history or a dated delivery note.

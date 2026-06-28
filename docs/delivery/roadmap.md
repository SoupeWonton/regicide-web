---
kind: delivery
edition: v3
status: active
last_reviewed: 2026-06-28
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
| 1 | Path unlocks on C2 completion | Q31 | ✅ **Decided 2026-06-27** — clearing C2 unlocks **all** other suit paths |
| 2 | Class = **home-suit path (C2 rung in V3.0) + a separate selectable Staff** | Q5 / Q31 | ✅ **Decided 2026-06-27** — path/Staff decoupled; siege retired; **C2 rung = a single ability**; **Staff = pick 1 of class's 4 passive signatures (16 total)**; ladder/staff content in the candidates doc |
| 3 | **Forgiveness floor** — guaranteed opening **Diamond** | Q16 | ✅ **Decided 2026-06-27**; seam-reset shape + numbers → playtest |
| 4 | **Road recovery / rest cadence** — **Camp = fixed three-part rest** | Q16 | ✅ **Camp resolved 2026-06-27** (reshuffle + redraw-to-5 + double first attack); magnitudes → playtest |
| 5 | **Fallen Heroes** detail — swap, after C1, to **one random Staff from each of the 4 classes** | Q32 | ✅ **Decided 2026-06-27** — just a swap, no cost, repeatable |
| 6 | **Crystal/spell layer in V3.0** | Q28 | ✅ **Decided (revised 2026-06-28)** — gauntlet holds 4 suit crystals (Fragment→Half→Full); **fragments agnostic, 50/50 drop after each encounter**, placed via the **bracelet** (between-encounter UI); **Forge = forge** (tier-up); Full → V3.5. Numbers → playtest |
| 7 | **Overdraw-and-select** — keep or cut | Q14 | ✅ **Decided 2026-06-27** — kept as-is |
| 8 | **Landmark roster for C1/C2** | Q13 / Q33 | ✅ **Ratified 2026-06-27** — Forge=spells, **Sanctum=deck modification**; map needs retuning |
| 9 | **Token scope** — grafts-only vs. wider | Q6 | ✅ **Decided 2026-06-27** — grafts only (suit OR value); royal grafts cap at 10 |
| 10 | **Equipment slots + relic roster** | Q30 / Q11 | ✅ **Decided 2026-06-28** — **4 slots, one per type** (Amulet/Ring/Cloak/Hat), equipped from a **bag**; pool = **`relic_v1_design_3.0`** (29). Many relics still need exact implementation contracts |
| 11 | **UI/UX contract** + **revised tutorial** | Q8 / Q9 | ✅ Tutorial **done**; UI/UX = **Gab** (2026-06-27) |
| 12 | **Solo vs. multiplayer** for V3.0 | Q18 | ✅ **Decided 2026-06-27** — solo only |

**B. Build gates still to do** (delivery, mostly downstream of A):

- Migrate redundant-exact-kill from additive Hone to **rank-or-suit replacement graft**.
- Remove the fragment wallet/shop; repurpose Forge around grafts.
- **C1 content:** recruit numbers 6–10 by exact kill; hunting; chapter backfill; full A–10 by C1 end.
- **C2 content:** graft-on-kill on roads; the **3/2/1 royal gate pyramid** (Jack/Queen/King gates, the crown decision).
- **No-comeback permadeath** + the **C1→C2 seam reset**.
- **Tree-unlock meta** on C2 completion.
- Four-class scaffold (Staff + starting ladder).
- **No mid-run save/resume** (single-session run; lineage meta persists); continent/province boundary recap.
- Evidence capture; no progression-blocking defects.

## Now

1. **Build the versioned card-state model first** (stable physical IDs + printed-vs-effective
   rank/suit + graft provenance), then migrate the redundant-exact-kill slice from additive
   Hone/added-suit to **rank-or-suit replacement grafts** — including state, UI, tests, and saves.
   **Replacement grafting is not on live; build it (audit `91d3677` first), don't enable a flag.**
2. Audit and accept or revise the V3 foundation decision and four-class proposal.
3. Remove the fragment wallet/shop; the **Forge forges spell crystals** (graft rearranging is the
   **Sanctum's** verb), and fragments become **agnostic, 50/50-drop**, placed via the bracelet.
4. Keep smoke coverage green while separating V3 behavior from quick-game Regicide.

Design exploration is not inferred from this implementation sequence. In particular,
permanent card removal has no implementation scope until its design axes are explored
and Landry and Gab reach consensus.

## Next

1. Implement the four-class scaffold: a swappable **Staff** (passive enabler) + a kept linear ladder, and starting hands.
2. Replace V2 relic slots and spell inventory with the V3 item model — **5 equipment slots** (Staff +
   **one relic per slot** Cloak/Ring/Hat/Amulet, from a bag) and the **gauntlet** of four crystal spells
   (Fragment/Half castable; Full → V3.5), armed via the **bracelet** with agnostic fragments.
3. Build the **V3.0 slice = Continent 1 + 2 only** (Claim + Shape), victory = clear C2, **no-comeback
   death**, **no mid-run resume** (single-session); + internal seeded fixtures. *(The full five-continent
   journey, God-of-Luck opt-in ending, and multi-session resume are **V3.5**.)*
4. Update onboarding around the accepted journey and replacement graft.

## Later

- Tune encounters and later-continent pressure from playtest and simulation evidence.
- Reintroduce additional classes one at a time only after the four core roles are distinct.
- Expand accepted content without adding parallel currencies; implement deck curation
  only if a specific design reaches consensus.

Completed work leaves this page and is recorded in Git history or a dated delivery note.

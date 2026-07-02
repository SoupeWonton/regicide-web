---
kind: delivery
edition: v3
status: active
date: 2026-07-01
branch: v3-integration
---

# V3.0 build status — living checklist

**Lives on `v3-integration` only** (delivery state, not design). Tick a slice when its
acceptance gate passes (smoke ✅ + typecheck ✅ + slice smoke case + commit). Plan:
[`plans/v3.0-build-execution.md`](plans/v3.0-build-execution.md).

| # | Slice | Status | Commit | Notes |
|---|---|---|---|---|
| 1 | §F card-state model (`physicalId`, printed/effective, provenance, schema ver) | ☑ done | `fca06cb` | `cards.ts` registry; deck built from it (Card.id = physicalId); royal cap structural; legacy saves migrate |
| 2 | Replacement grafts (rank-OR-suit, C1 too, royal cap 10; retire additive offer) | ☑ done | `adde34d` | kill trigger rewrites a held card to the slain face; no fragment (D3); tutorial guarded; additive stamps off the offer (deletion = slice 9) |
| 3 | C2 royal gates — 3/2/1 pyramid + crown; victory = King Gate | ☐ not started | — | |
| 4 | Classes — A–5×4 start deck; Staff pick (16); C2 home rung; siege retired | ☐ not started | — | contracts → `contracts/staffs-and-ladders.md` |
| 5 | Forgiveness — opening ♦ guarantee; 4-part Camp (incl. block 10); auto seam reset | ☐ not started | — | |
| 6 | Spells — gauntlet + bracelet; agnostic 50/50 fragments; consume-to-empty; Forge tier-up | ☐ not started | — | contracts → `contracts/spells.md`; frags/Half = 2 |
| 7 | Equipment — 4 named slots + bag; `relic_v1_design_3.0` (29); free swaps | ☐ not started | — | contracts → `contracts/relics.md` |
| 8 | Landmarks + provinces — roster (Hunt = NEW), chapter→province, C2 mirrors C1, recap | ☐ not started | — | |
| 9 | Meta/lineage + cutover — lineage wipe, no save/resume, §11 deletes, e2e run | ☐ not started | — | deletes only here |

**Definition of done:** fresh `npm run dev` → class+Staff select → C1 (3 provinces,
recruit 6–10, Hunt, landmarks) → seam recap → C2 (rung reveal, 3 gates, Fallen Heroes) →
King Gate victory; death = run over. Smoke + e2e green; contracts complete with ⚑ flags
collected for Landry's playtest.

## Session log

- **2026-07-02** — **slice 2 landed** (`adde34d`): replacement grafts. The redundant
  exact-kill trigger carries the slain face (rank royal-capped at 10 in `pendingGraft`);
  `applyGraftSelect` rewrites one held card's rank OR suit as §F provenance (live hand
  card face updates; legacy tokens rekey along). No fragment on the trigger (Decision 3).
  Additive hone/graft retired from the kill offer. Tutorial deck is §F-registered +
  `tutorialBlocksGraft` keeps the rail's tools un-rewritten. Client picker: value→N /
  suit→glyph with no-op disable. Test A2 rewritten for replacement semantics. Gates:
  smoke ✅ · vue-tsc ✅. **Next: slice 3 (C2 royal gates 3/2/1).**
- **2026-07-01 (b)** — **slice 1 landed** (`fca06cb`): §F card-state model.
  New `server/campaign/cards.ts` — stable `physicalId` + immutable printed face +
  ordered `GraftRecord` provenance; effective face derived. Ascending chapter deck now
  builds FROM the registry (`Card.id = physicalId` — identity survives rebuilds); all
  four recruit sites register identities; `schemaVersion: 2` + legacy-save migration in
  `loadCampaign`; `physicalCards` client projection + join helpers. Compat shim keeps
  `ownedCards`/`cardTokens` logical-id-keyed until slice 9. Smoke Test H added
  (replacement identity, royal cap, provenance move, round-trip, migration). Gates:
  smoke ✅ · vue-tsc ✅. **Next: slice 2 (replacement grafts).**
- **2026-07-01** — build unblocked: audit landed, all §Q decisions closed
  ([decision](../decisions/2026-07-01-v3.0-build-decisions.md)), execution plan written,
  branch CLAUDE.md rewritten for build sessions. No code yet.

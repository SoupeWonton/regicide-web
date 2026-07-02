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
| 3 | C2 royal gates — 3/2/1 pyramid + crown; victory = King Gate | ☑ done | `08816ad` | full-rank gates; royal kills graft @10, bodies banished; crown pick = won; ⚑ pins → [`contracts/royal-gates.md`](contracts/royal-gates.md) |
| 4 | Classes — A–5×4 start deck; Staff pick (16); C2 home rung; siege retired | ☑ done | `959ce58` | 16 Staffs coded + 4 home rungs; legacy passives/sieges/stamps off the V3 path; 32 pins → [`contracts/staffs-and-ladders.md`](contracts/staffs-and-ladders.md) |
| 5 | Forgiveness — opening ♦ guarantee; 4-part Camp (incl. block 10); auto seam reset | ☑ done | `a527755` | ♦ swap-in at every deal; Camp arms double+10 block; seams carry hands (§F ids) + top-up 5 |
| 6 | Spells — gauntlet + bracelet; agnostic 50/50 fragments; consume-to-empty; Forge tier-up | ☑ done | `b2bf6fb` | `spells.ts` crystals; pool = `tokenFragments`; legacy spell offers dried up; pins → [`contracts/spells.md`](contracts/spells.md) |
| 7 | Equipment — 4 named slots + bag; `relic_v1_design_3.0` (29); free swaps | ☑ done | `08aff7c` | `relics.ts` pool, all 29 working; Lair pick-of-2 + Caravan pay-from-hand (cost 8); pins → [`contracts/relics.md`](contracts/relics.md) |
| 8 | Landmarks + provinces — roster (Hunt = NEW), chapter→province, C2 mirrors C1, recap | ☑ done | `b708741` | C2 = cont2-p1/p2/p3 (one gate each, crown @ ch6); Hunt/Rearrange/Consecrate/Fallen Heroes live; wager placeholder |
| 9 | Meta/lineage + cutover — lineage wipe, no save/resume, §11 deletes, e2e run | ☑ done | `e619628` | v3 kingdom wipe; crown → `pathsUnlocked`; no-resume; all §11 deletes (−1069 lines); smoke+e2e green; ⚑ `ascendingDeck` guards remain textually (constant-true; hygiene collapse deferred) |

**Definition of done:** fresh `npm run dev` → class+Staff select → C1 (3 provinces,
recruit 6–10, Hunt, landmarks) → seam recap → C2 (rung reveal, 3 gates, Fallen Heroes) →
King Gate victory; death = run over. Smoke + e2e green; contracts complete with ⚑ flags
collected for Landry's playtest.

> **✅ ALL NINE SLICES LANDED (2026-07-02).** The engine drives the full arc (smoke
> Test D: ch1→Council→3 C2 provinces→crown victory; e2e protocol run green). ⚑ flags
> for the playtest live in [`contracts/`](contracts/) (royal-gates ·
> staffs-and-ladders · spells · relics). **Next: Landry's human playtest**, then the
> deferred hygiene pass (textual collapse of the now-constant `ascendingDeck` guards).

## Session log

- **2026-07-02 (h)** — **slice 9 landed** (`e619628`) — **THE BUILD IS COMPLETE.**
  Cutover: pre-V3 kingdoms wiped on load (v3 marker; saves purged; lobby explainer);
  crown banks `pathsUnlocked`; no mid-run save/resume (lobby lists nothing; e2e
  re-pinned). §11 deletes all landed behind their replacements: fragment shop +
  C-tier track + forge stamps + tokenBudget + caps · curse system + rites + legacy
  Shrine/Caravan deal · additive-graft draft + class signatures · Tower + legacy
  castle/province maps · provinceMode + CURATION_CUT + non-ascending branches
  (−1069 lines). `ascendingDeck` pinned as the single default (⚑ textual guard
  collapse deferred). Smoke suite cut over (Tests 9/G deleted; 7/8 re-pinned; Test O
  added). Gates: smoke ✅ · vue-tsc ✅ · **e2e ✅**. **Next: human playtest.**
- **2026-07-02 (g)** — **slice 8 landed** (`b708741`): landmarks + provinces. C2 =
  three provinces (`cont2-p1/p2/p3`, one chapter-keyed gate each; tier-duel roads;
  Fallen Heroes opens P2; crown at ch6 = victory; seams through ch5). New verbs: Hunt
  (C1-only quarry fight), Sanctum Rearrange (2 §F graft moves/visit), Shrine
  Consecrate (seeded permanent transmutes), Fallen Heroes Staff swap. Legacy rites off
  the offer path. Province wording player-facing; God-of-Luck wager placeholder.
  Tests: N added; D/I re-pinned to the 3-province arc. Gates: smoke ✅ · vue-tsc ✅.
  **Next: slice 9 (meta/lineage + cutover deletes + e2e).**
- **2026-07-02 (f)** — **slice 7 landed** (`08aff7c`): equipment. `relics.ts` = the
  full 29-relic pool with working semantics; bag + 4 named slots (`equip_relic`, free
  between fights, locked in combat); Lair = pick-of-2 raid → bag; Caravan =
  pay-from-hand (cost 8 placeholder, Caravan Coin −2); legacy relic offers dried up;
  recruit pipeline extracted (`recruitCard`) with the Hat relics; V3 activations via
  `applyActivateRelic`. Placeholder equip panel + combat buttons. 29 pins + ⚑
  simplifications in [`contracts/relics.md`](contracts/relics.md). Test M added.
  Gates: smoke ✅ · vue-tsc ✅. **Next: slice 8 (landmarks + provinces).**
- **2026-07-02 (e)** — **slice 6 landed** (`b2bf6fb`): spells. New `spells.ts` (4 suit
  crystals, Fragment+Half); gauntlet on CampaignState; pool = `tokenFragments`
  (repointed); 50/50 post-win drop; `bracelet_place` action + road/camp panel (light →
  sandbag); Forge = tier-up (2 frags → Half, one per visit; token offer retired); cast
  `gauntlet:<suit>` = consume-to-empty, per-suit per-combat, over immunity (Rally at
  the pay step, Brace during it, Commit = one free combo card). Legacy spell offers
  dried up (shop/Lair/pools; deletes in slice 9). Smoke cheat driver made token-aware
  (fixed a knife's-edge arc death from a cursed 0-value play). Test L added. Pins in
  [`contracts/spells.md`](contracts/spells.md). Gates: smoke ✅ · vue-tsc ✅.
  **Next: slice 7 (equipment — relics).**
- **2026-07-02 (d)** — **slice 5 landed** (`a527755`): forgiveness. Every dealt hand
  guarantees ≥1 ♦ (lowest non-jester card swaps with the Tavern's first ♦). Camp =
  four-part bundle (reshuffle-in keeping hands · top-up 5 · doubled first strike ·
  10 starting block, armed via `campDoubleNext`/`campBlockNext`). Province seams:
  `setupChapterDeck({seam})` — hands carry by §F physical id, reshuffle, top-up 5,
  no block/double. Smoke Test K added. Gates: smoke ✅ · vue-tsc ✅. **Next: slice 6
  (spells — gauntlet + bracelet).**
- **2026-07-02 (c)** — **slice 4 landed** (`959ce58`): classes = path + Staff. New
  `paths.ts` (16 Staffs + 16 ladders, C2/C3/C4 texts); `pick_class` takes a staffId
  (placeholder picker in ClassSelect); C2 entry lights the home rung (Bastion /
  Conscript / Depot / Renewal coded); all 16 Staffs working (new `staff_use` action +
  arena button; combo relaxations; auto hooks). Decision 1 enforced — signature stamps
  + legacy coded passives + all siege ultimates retired from the ascending path
  (deletion = slice 9). 32 pins in
  [`contracts/staffs-and-ladders.md`](contracts/staffs-and-ladders.md). Smoke Test J
  added; Test E updated (no-stamp start). Gates: smoke ✅ · vue-tsc ✅. **Next:
  slice 5 (forgiveness — opening ♦, Camp bundle, seam reset).**
- **2026-07-02 (b)** — **slice 3 landed** (`08816ad`): C2 royal gates. Gates field the
  full rank (4 royals, solo too); post-gate keep-decision (`royal_keep` PendingChoice:
  J = leave 1, Q = 2 sequential keeps, K = crown); kept royals = §F-minted real deck
  cards; C2 royal exact kills → replacement graft fixed at 10, bodies banished (no
  discard fuel); crown pick → `campaign_won`. Spoils flow extracted to
  `presentGateSpoils`, chains after intermediate keeps. ⚑ pins in
  [`contracts/royal-gates.md`](contracts/royal-gates.md). Smoke Test I added; full-arc
  Test D now drives the pyramid. Gates: smoke ✅ · vue-tsc ✅. **Next: slice 4
  (classes — path + Staff).**
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

---
kind: delivery
edition: v3
status: superseded
superseded_by: v3.0-integration.md
last_reviewed: 2026-06-28
code_baseline: Design_V3
---

# V3 integration plan — execution handoff *(SUPERSEDED)*

> **⛔ SUPERSEDED 2026-06-28 by [`v3.0-integration.md`](v3.0-integration.md) — the sole V3.0
> implementation plan.** This older plan is **`code_baseline: Design_V3`**, which is wrong: V3 code must
> be built from the **deployed live commit `91d3677`**, not `Design_V3` (whose code predates the live
> deployment — see the new plan's "Branch reality"). Kept only as history; do **not** implement from it.

This is the **file-pointed engineering plan** for upgrading the currently-playable
campaign to V3. It is the execution companion to the design migration narrative
([`../migration-v2-to-v3.md`](../migration-v2-to-v3.md), the *why*) and the canon
manifest ([`../../canon/README.md`](../../canon/README.md), the *authority*). Open
design decisions are tracked separately in
[`v3-design-decisions-agenda.md`](v3-design-decisions-agenda.md).

**How to use this doc:** each slice below is self-contained — point a Claude session
(with the full repo) at one slice at a time, in order. Every slice names the files,
the symbols to delete/upgrade, the target behavior, and the tests that must stay green.
Line numbers are approximate (baseline `Design_V3`) — confirm by symbol name.

> If a single runnable file per slice is preferred over this master doc, each
> `## Slice N` section is written to be split out verbatim.

## Locked policy (Landry, 2026-06-25)

1. **V3 is the upgrade, not a parallel flag.** Some systems are deleted, others
   upgraded; the base quick-game is untouched. The exact delete-vs-upgrade inventory is
   [Decision 1](v3-design-decisions-agenda.md#1-delete-vs-upgrade-inventory) — settle it
   before Slice 0.
2. **Saves: wipe everything.** All campaign saves + Kingdom data are cleared at
   cutover. No save-migration code, no compatibility shims.
3. **Tokens: keep the full token engine + catalog for V3 v1.** Pruning is a later
   session + playtest call. Slice 1 changes *graft semantics only* — it does **not**
   strip the token catalog.
4. Authority order on any conflict: **canon manifest > dated decision > this plan >
   migration narrative.**

## Status legend

- ✅ **ready** — design locked; build now.
- 🟡 **partly ready** — scaffold/structure buildable now; one design input pending.
- ⛔ **blocked** — needs its agenda decision closed first (linked).

## Slice order & dependencies

`0 → 1 → 2` are independent ready cleanup; land them first. Slice 3 (crystals) and the
Slice 4 scaffold are mutually independent. Slices 4–7 unblock as their agenda decisions
close. **Guardrails for every slice:** smoke suite green; base `TurnPhase` untouched
(V3 phases live on `CampaignTurnPhase`); deterministic RNG via `rng.ts` preserved; base
quick-game (`server/game.ts`, `server/rooms.ts`) never touched.

---

## Slice 0 — Cutover scaffolding & save wipe — ✅

Make V3 the default campaign mode and clear stale state on load.

- **Upgrade** `server/campaign/experiments.ts` — `EXPERIMENTS` currently runs
  `ascendingDeck: true` + `provinceMode: false`. Per
  [Decision 1](v3-design-decisions-agenda.md#1-delete-vs-upgrade-inventory), collapse to a
  single V3 default. (`ascendingDeck` is the live, most-evolved path — V3 builds on it;
  `provinceMode` scaffolding is slated for deletion.)
- **Upgrade** `server/campaign/store.ts` — add a save-version guard that drops any
  pre-V3 campaign save and Kingdom file on load (wipe, not migrate). No back-compat.
- **Touch** `server/campaign/sessions.ts` — only as needed for the default-mode change.
- **Guardrail:** `server/game.ts` / `server/rooms.ts` untouched; smoke's flag-pinning
  (`scripts/smoke.ts` saves/restores the live flags) must be updated to the new default.

**Acceptance:** fresh load starts a V3 campaign; any old save is discarded cleanly;
smoke green.

---

## Slice 1 — Replacement grafts (additive → replacement) — ✅

Canon-locked by
[`../../decisions/2026-06-20-replacement-graft-semantics.md`](../../decisions/2026-06-20-replacement-graft-semantics.md).
A redundant exact kill **replaces** a chosen hand card's rank *or* suit with the slain
card's matching property — **no `+1`, no added second suit.** For an owned `7♠` target,
the result is rank `7` or suit `♠`, replacing the chosen card's current value.

- **Server** `server/campaign/encounter.ts`
  - `resolveKill` (~1023) and the owned-card graft branch (~1063): the current build
    pauses to `graft_select` and applies an additive token. Keep the pause; change the
    effect to replacement.
  - `applyGraftSelect` (~1637): apply rank-replace or suit-replace to the chosen card's
    logical id / token set.
- **Server** `server/campaign/content.ts` — graft/transmute token defs (~264–265).
  `transmute` already `suitOp:'replace'`; the additive `graft` (`suitOp:'add'`) is
  retired *as the exact-kill effect*. **Rank replacement is new** — add a rank-replace
  token/mechanic (no rank-replace token exists today).
- **Server** `server/campaign/tokens.ts` — `cardSuits` (~33) computes effective suits
  (base + add / replace). Extend the effective-card calc to cover **rank** replacement
  too (today only suit is grafted).
- **Client** `client/src/components/campaign/EncounterBoard.vue` — graft UI (~607–639):
  replace the `+1 value` / `+{suit}` buttons with **"replace rank"** / **"replace
  suit"** choices.
- **Contract** `server/campaign/sessions.ts` — `graft_select` action: `mode:'value'|'suit'`
  → `mode:'rank'|'suit'`. Mirror in `client/.../CampaignView.vue` `act()`.
- **Keep:** the rest of the token catalog/engine untouched (policy 3).

**Acceptance:** a duplicate exact kill replaces the chosen card's rank or suit (never
adds); effective rank/suit calc and the card face reflect the replacement; legibility
shows printed-vs-effective; smoke green.

---

## Slice 2 — Remove fragment wallet/shop; repoint Forge — ✅

Delete the second currency and the post-Council graduation shop. The Forge stops
minting and instead **rearranges existing grafts** (and, after Slice 3, assembles
crystals).

- **Delete** in `server/campaign/campaign.ts`: `FRAGMENTS_PER_TOKEN` (~514),
  `applyFragmentStart` (~516), `openFragmentShop` / `presentFragmentShop` (~602/607),
  `SHOP_COST` (~591), `applyShopChoice` (~635), and the Council/backfill
  duplicate→fragment grants.
- **Delete** state/contract: `server/campaign/types.ts` `PendingChoice` kind `'shop'`
  + the `fragmentApply` flag; `server/campaign/sessions.ts` `apply_fragment` action.
- **Delete** client: the fragment counter / "Apply" button in
  `client/.../CampaignView.vue` (~456–461).
- **Keep** `server/campaign/content.ts` `C_TIER_TOKEN_IDS` (~286) — the *tokens* stay
  in the catalog (policy 3); only their **fragment delivery** is removed. Their new
  delivery path is a token-session question (agenda Decision 4).
- **Upgrade** the Forge (`offerForge` ~472, `presentForgeTokens` ~478, `applyForgeToken`
  ~534, `applyForgeCard` ~562, two-step `forge_token`/`forge_card` choice): from
  *mint-a-token-against-budget* to *rearrange existing grafts across cards*. Retire
  `tokenBudget`/`freeForge` minting semantics. (Crystal assembly is added in Slice 3.)

**Acceptance:** no fragment currency or shop anywhere; Forge moves grafts and creates
no new graft power; smoke green (update any smoke step that exercised the shop).

---

## Slice 3 — Crystal-spell system + Forge crystal assembly — ⛔

Blocked on [Decision 6 (crystal/forge economy)](v3-design-decisions-agenda.md#6-crystal-and-forge-economy).
Accepted shape (`../../decisions/2026-06-24-crystals-continents-and-equipment.md`): four
suit crystals — **Fragment** (castable) → **Half** (castable, strongest) → **Full**
(non-castable win token, set aside) — held in a four-slot gauntlet (one per suit).
Suit-specific fragments drop in combat; assembled only at the Forge; completing a Full
is endgame-unlock-gated.

- **Server** `server/campaign/content.ts` — recut the spell catalog (~168–199) to four
  suit crystals (♣ attack · ♦ draw · ♠ block · ♥ recover) with Fragment/Half effects;
  retire the ~14-spell `ITEMS` vehicle. (Exact effects/numbers are session inputs — keep
  the placeholders explicit.)
- **Server** `server/campaign/encounter.ts` — `applyCastSpell` (~1580): cast Fragment
  or Half only (consume on cast); add a fragment-drop hook in `resolveKill`; implement
  the spell-above-suit-immunity rule (Q36 lean: a ♦ spell hits a ♦-immune enemy).
- **Server** `server/campaign/campaign.ts` — Forge gains crystal assembly
  (fragments → Half → Full, Full gated); remove landmark spell grants
  (`offerSanctum`/`offerCaravan`/`offerShrine` spell paths).
- **Client** — spell UI in `CampPanel.vue` (~33–40), cast UI in `EncounterBoard.vue`,
  `ItemCard.vue`; new gauntlet display (four slots, Fragment/Half/Full states, "Full set
  aside" treatment).
- **Pending inputs (Decision 6):** fragments per drop + drop trigger, counts for
  Half/Full, the Full-unlock trigger, gauntlet name + "holding all four" behavior.

**Acceptance:** four-suit gauntlet; Fragment/Half castable, Full sets aside; fragments
are suit-specific and Forge-only; smoke green.

---

## Slice 4 — Classes: swappable Staff × kept linear ladder + 4 kits — ⛔

Model resolved (`../../decisions/2026-06-24-...md`); kits/pairings open
([Decision 3](v3-design-decisions-agenda.md#3-classes)). A class = a **Staff** (swappable
passive enabler, the fifth equipment slot) × a **kept linear ladder** (its suit/station
payoff) that deepens across continents. The four roles break different loop stations:
Sentinel/BLOCK, Executioner/KILL, Quartermaster/COMBINE, Surgeon/PERSIST.

- **Server** `server/campaign/content.ts` — rework `CLASSES` (~12), `CLASS_SIGNATURES`
  (~292), `SIGNATURE_CARDS` (~308), `TIER1_CLASSES`/`STARTING_CLASSES` (~63–73) into the
  Staff + ladder model. Park the tier-2/3 classes as meta-unlock runway.
- **Client** `ClassSelect.vue` + `cards.ts` `CLASS_SIGNATURE_PREVIEW` (~99–109).
- **Scaffold buildable now:** the Staff/ladder *data model* and the fifth equipment slot
  (shared with Slice 6). **Session inputs:** the four kits, base staffs, starting hands,
  ladder rung values, and how/when the other three suit ladders unlock.

**Acceptance (scaffold):** classes resolve as Staff + ladder data; selection shows
starting hand + the one visible loophole; smoke green. (Full kits land when Decision 3
closes.)

---

## Slice 5 — Two rank-band acquisition + Ace-as-low-1 — 🟡

Ace locked by
[`../../decisions/2026-06-18-v3-foundation.md`](../../decisions/2026-06-18-v3-foundation.md);
starting-deck composition pending
[Decision 2 (deck lifecycle)](v3-design-decisions-agenda.md#2-deck-lifecycle). Acquisition
beats = two rank-bands (2–6, then 7–A); royals are **gate bosses you fight but don't
keep**; **Ace = rank 1, a starting companion, +1 to anything.**

- **Server** `server/campaign/maps.ts` — `CONT1_CH1`/`CH2`/`CH3` (~85–138) and
  `buildMap` (~186): rebuild the acquisition roads into the two rank-bands; royals as
  gate bosses, not recruits.
- **Server** `server/campaign/campaign.ts` — `backfillAct` (~1437): rank-band backfill.
- **Server** `server/campaign/encounter.ts` — rank model + **Ace handling** (low-1,
  +1-to-anything companion). Ace logic is buildable now.
- **Pending input (Decision 2):** exact starting-deck and opportunity set.

**Acceptance:** Ace is a starting low-1 companion; acquisition runs as two rank-bands;
royals are unkept gate bosses; smoke green.

---

## Slice 6 — Equipment (5 slots) + relics + Fallen Heroes + no gold — ⛔

Blocked on [Decision 7 (equipment/relics/landmarks)](v3-design-decisions-agenda.md#7-equipment-relics-landmarks).
Five fixed slots only: **Staff** (class, Slice 4) + **Cloak · Ring · Hat · Amulet**
(relics). Relics are rare (most runs see one or two). No gold; a "purchase" is a kill you
set up.

- **Server** `server/campaign/content.ts` — relic catalog + `RELIC_SLOTS` (~132–223):
  replace the 2-slot managed inventory + unlock-order model with the five-slot equipment
  model; re-standardize existing relic candidates (Split Seal, Doorstop, Crown of First
  Claim, Black Standard, Combat Cache, Warhorn, Hoard, Sainted Scalpel) into slots.
- **Server** `server/campaign/encounter.ts` — `applyActivateRelic` (~1670) updated to
  the slot model.
- **Server** `server/campaign/campaign.ts` — Caravan becomes a **set-up kill** (no
  gold); add the **Fallen Heroes** landmark (swap the Staff).
- **Client** — `CampPanel.vue` relic UI (~43–52), `ItemCard.vue`, `RoadMap.vue` (new
  landmark).
- **Pending inputs (Decision 7):** slot themes, relic→slot mapping, opportunities/run,
  Fallen Heroes placement/cost/legal pairings, Sanctum's fate.

**Acceptance:** five equipment slots (Staff + 4 relics); no gold/buying; Fallen Heroes
swaps the Staff; smoke green.

---

## Slice 7 — Five continents + God of Luck + opt-in ending — ⛔

Blocked on [Decision 5 (continents/endgame)](v3-design-decisions-agenda.md#5-continents-gates-attrition-endgame).
Five continents (Claim → Shape → Exploit → Adapt → Master) over the five-act pressure
skeleton, with a God-of-Luck lore layer. **Win = forge all four crystals to Full**
(self-weakening, irreversible); C4 is a ridable loop ("You win?" on first clear); C5 is
the God-of-Luck showdown. Death restarts at Continent 1.

- **Server** `server/campaign/campaign.ts` — `continentOf` (~22) + the continent-seam
  transition logic generalized to five continents.
- **Server** `server/campaign/maps.ts` — continent maps for the pressure beats + the
  short C5 road.
- **Server** `server/campaign/types.ts` — run-structure state (continent index, gauntlet
  Fulls, opt-in-ending flags, recap/resume).
- **Client** `CampaignView.vue` — phase router + the God-of-Luck wager animation
  (always "loses" until all four crystals are Full, then the altered animation triggers
  C5).
- **Pending inputs (Decision 5):** per-continent pressure packages, royal/gate rules,
  rest cadence, C4 scaling, C5 shape, opt-in-ending signposting, ~1h/continent, internal
  seeded fixtures (weak/median/strong/narrow/attrition-damaged entry states).

**Acceptance:** a full five-continent run; wager animation between continents; forging
all four Fulls opens C5; C4 loops; recap/resume at boundaries; smoke green.

---

## Verification (run from `regicide-web`, after `npm run install:all` at root)

- **Smoke — must stay green every slice:** `cd server && npx tsx scripts/smoke.ts`
  (~10 checks: full run, determinism, death-ends-run, save/load, client projection, deck
  persistence, player-count scaling, ascending-deck tokens/graft). Update flag-pinning
  and any shop/fragment step as those are removed.
- **Client typecheck:** `cd client && npx vue-tsc --noEmit`.
  **Server typecheck:** the smoke run transpiles via `tsx`.
- **Sim — floor/regression only:** `cd server && npx tsx scripts/sim.ts --seeds N` (and
  `scripts/sim-base.ts`). ⚠️ The bots are an **architectural floor, not a forecast**
  (foresight-less greedy scorer). Use sims for crash/regression detection and
  foresight-free relative comparisons only — **not** difficulty, card-economy, or any
  foresight-dependent V3 question. Those need human playtests.

## Out of scope / notes

- Base quick-game (`server/game.ts`, `server/rooms.ts`) is never touched.
- Git logistics (V3 branch → deploy lineage; the known `live` → `Design_V3` rename
  conflicts) are left to Landry/Gab.
- New campaign save fields: since saves are wiped (policy 2), V3 fields can be required
  post-cutover rather than optional-guarded.

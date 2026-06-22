# Ascending Deck — STATUS / handoff (resume here)

**Single entry point for picking the work back up.** Last updated **2026-06-16**
after playtest runs #1–#4. Deep design lives in [`ascending-deck.md`](ascending-deck.md);
**the forward progression/economy/identity vision is in
[`economy-and-identity.md`](economy-and-identity.md)** (fragment shop, bridge-relic
ladder, Token-2 engines, brute-force→finesse, Sanctum/spell split, difficulty freeze);
sequenced build steps in [`ascending-deck-build-plan.md`](ascending-deck-build-plan.md);
open questions in [`open-design-questions.md`](open-design-questions.md) → Q10.

> **DIRECTION (2026-06-16):** difficulty is **FROZEN** (partner reached "ownership /
> j'ai du fun" — `Final_Update.txt`). Next work is **forward design + presentation**,
> not number-tuning.
>
> **▶ ACTIVELY BUILDING the economy/identity spine — RESUME AT PHASE 5.** Phases
> 1–4 are **built + green** (smoke 5/5 incl. **Test G** for the rites, client
> typecheck). Phases 1–3 = content + effects, the post-Council fragment shop, the
> Caravan/Lair mythic sources. **Phase 4 = Sanctum → Rites DONE**
> (`offerSanctum`/`applySanctumRite` in `campaign.ts`): Foresight (`foresightNext` →
> `foreseen` client projection; **see-only, reorder deferred**) · Blessing
> (`shrineBlessing`) · Cleanse (folds the Shrine in). **NO-EXILE (2026-06-16):** all
> card-removal was retired (Sanctum Exile rite, Exile-class camp ability, "Tithe of
> the Severed" siege ult, `exile_pick`) — **the deck only grows**; continents start
> from a complete deck. The Exile **class** is parked (roster + signature tokens kept,
> no active ability). **Phase 5 = proper shop UI + cut spells from veteran/elite/gate
> spoils** (spells become shop+Lair only). Full spec: **`economy-and-identity.md`**.

## Where we are

The **Ascending Deck is the LIVE mode and fully playable end-to-end.**
`EXPERIMENTS.ascendingDeck = true` + `provinceMode = false` (in
`server/campaign/experiments.ts`). Flip **both** back to return to the province
prototype. Smoke pins both off for canon tests.

**Built + tested (smoke Tests A–F, 5/5 deterministic):** start-small 20-card deck →
recruit number-enemies (exact kill) → draft → backfill to a full A–10 deck →
Council of Tens → Continent 2 (province) → win. Plus: the **token system** (catalog
+ forge + class signatures + card-face badges), **pure-token classes** (select by
seeing stamped cards), and the **item economy** (Caravan relics / Sanctum spells /
Shrine curse-cleanse, Kingdom-gated pools that grow on death, capped 3 item-stops/chapter).

## Run / test / playtest

```
cd server && npx tsx scripts/smoke.ts      # engine suite — must end "All smoke tests passed ✅"
cd client && ./node_modules/.bin/vue-tsc --noEmit   # client typecheck (no output = clean)
npm run dev    (repo root)  OR  play.cmd            # launches straight into ascending mode
```

Telemetry of human runs: `server/data/human-runs/runs.csv`. Per-campaign combat
logs: `server/data/logs/<campaignId>.log`.

## Continent-1 economy v2 + fragment track (2026-06-15, post-sim)

Sim of v1 (number gates, full rank sets) showed **0% bot win** — wall at the ch1
Throne (8 enemies). Redesigned the Continent-1 fight/recruit economy:

- **No `recruit` nodes.** Road fights: **skirmish** = low filler + tier card
  (ch1 = 5 + 6); **veteran** = the two tier ranks (6 & 7); **lair** = one
  next-tier card (8–9) kept + a rare. (`buildEnemyStack` `c1FightRanks`/`pickNumberStack`.)
- **THE GOLDEN RULE** (`encounter.ts` number-kill resolution): **exact kill →
  recruit if unowned, else a token fragment; overkill → nothing** (no deferred
  backfill in-fight; chapter-end backfill still completes ranks). "Owned" now
  includes the starting A–5 (so an exact-killed 5 gives a fragment, not a dup).
- **Fragment track** (parallel to the Forge): 2 fragments → apply **1 C-tier
  token** (`C_TIER_TOKEN_IDS` = Hone/Ballast/Scry/Mark), **anytime on the road**
  via the new `apply_fragment` action (reuses forge_token→forge_card, flagged
  `fragmentApply`, spends `tokenFragments`). Forge keeps its stronger F-tier budget.
- **Gates 3/rank, Throne 6** (solo; 4 in a party).
- Client: road fragment counter + "Apply token" button (`CampaignView.vue`).
- Sim harness: bot applies fragments on the road; smoke updated (ch1 = skirmish
  + 3 gates, no recruit nodes). Smoke 6/6 green, client typecheck clean.

**Playtest run #3 fixes (2026-06-16, raw feedback in `docs/Raw feedback/`):**
- **Overdraw now triggers on a kill** — was `allowPause=false` on the kill path;
  resolve the kill first, then draw-with-pause (no counter to clash with). The
  draw-select modal now **shows your current hand** so you can judge what to keep.
- **Scry** always buries the worst upcoming card whenever the Tavern has ≥1 card
  (was a no-op below 3).
- **Ballast "doesn't work"** was a display gap — the engine applied the soak
  (`holdDelta`) but the client discard total ignored it; added `hold` to
  `ClientToken` + `tokenHold`, discard total now includes it.
- **Dual-type** verified correct in the engine (a grafted ♠+♦ both shields AND
  draws); the "only 1 works" was the old single-suit preview, fixed by the v2
  token preview.
- **Tower removed** from Continent-1 maps (did nothing solo) → replaced with the
  **Caravan** (buy a relic — relevant now that nobody starts with one).
- **Forge "crystals" flood** — backfill/Council redundancy granted **Forge budget**;
  rerouted to **fragments** (Forge budget now comes only from forge nodes).
- **Enemy escalation — TRIED then REVERTED.** Off the first raw doc (Gabriel:
  "early fights feel solved; enemies should regain power each turn") I added +1 ATK
  per surviving turn on non-boss fights. The same-session **`Updated_Raw.txt`**
  follow-up (≈20 min later) flips it: "I had 0 cards and pulled off something
  insane — that was crazy." The loop becomes fun once **attrition** pressure
  appears NATURALLY, and a per-turn ATK ramp would cut short exactly those long
  comeback fights. **Verdict: tuning, not redesign** → reverted; enemies stay static.
- Still open from the feedback: **early game light on pressure** (acceptable on-ramp
  for now — do NOT force it with escalation), **boss difficulty spike**, **ch4/
  Continent-2 one-shot** difficulty, the over-upgrade-vs-exact-kill tension (a *good*
  emergent dilemma — keep), and the Continent-2 "story/class-unique cards" direction.

**Playtest run #4 (2026-06-16, log `8k5jk9uq`, Surgeon, 84 min, died ch4) → fixes:**
- **Over-upgrade trap CONFIRMED:** redundancy dumped 8+7+4 forge budget + ~10 frag
  applies → cards played +1/+2 over face → exact-kills became impossible (0 tens
  recruited at Council; "overkill — no recruit" everywhere). **Fix shipped:**
  fragment cost **2 → 6** (`FRAGMENTS_PER_TOKEN`, tunable) — tokens scarce (~1–4/
  continent), so over-stamping into overshoot is now a real cost. (Pairs with the
  earlier backfill/Council redundancy → fragments change.)
- **CANON — ch4 decapitation fixed STRUCTURALLY (not by stat nerf).** Corrected
  read (designer): 6→10 ATK entering C2 is fine; the problem was a **20-ATK King in
  ACT 1 via the Lair**. So royals keep FULL stats (J20/10·Q30/15·K40/20) and the
  **Lair is gated to ONCE, in Act III** (`PROVINCE_1`) — the "mini-throne" gamble
  (a full King for a rare) now lands when you're ready, not as an act-1 ambush.
  Tower retired from the province map too. (An earlier ATK ×0.65 scale was tried
  and **reverted** — overtuning; see the Final_Update "stop tuning" signal below.)
- **DESIGN FREEZE on difficulty (`Final_Update.txt`, 2026-06-16):** partner moved
  Criticism→Engagement→Retention→**Ownership** ("j'ai du fun" unqualified, 2 runs
  while impaired, overwriting his branch as baseline, now wants "ça look better").
  Difficulty complaints are stale → **stop tuning numbers.** Per designer: the
  **Jester reset is intentional** — the lack of early pressure is the point (you aim
  for exact-kill every time); do NOT make it scarce. Relic rebalance / spell
  hold-cap / Jester-scarcity = **shelved** (would tune the fun out). **Role split:**
  systems/economy/balance (Landry + Claude) vs visuals/UX/presentation (Gabriel).
- Possible **death→replacement leak** in Continent 2 (canon is full reset) — verify.
- **NEXT = forward design, not tuning: Token 2 (Continent-2 per-class identity).**

**No starting relic + token UI (2026-06-15):** heroes now **start with NO relic**
— every relic must be bought (Caravan) or won (Lair/gate). (`campaign.ts`
class-pick; removed the small-company-provisions grant; smoke updated.) **Token
display redesigned:** each token type has a **glyph** (`sym` in `projectToken` +
a `TOKEN_SYMBOLS` map; suit tokens show the grafted suit glyph), rendered as a
**green** badge stack **beside the card's left edge** (was tiny text at the
bottom) — the rank/suit stays the card's identity, grafted suits show as a green
♦/♠/… badge. `tone()` now greens graft/levers/scry/mark (only Undercut/curses
red). The **damage preview is token-aware**: `EncounterBoard` preview mirrors the
server order (printed + spend deltas → ×2[♣] + edge + mark → ×mult, exec) and the
shield/draw/heal numbers include Plate/Provision/Mend. New `ClientToken` fields
`sym/spend/suitOp/lever/keyword`; client helpers `tokenSpend`/`effectiveSuits`.

**Class-balance sim (4 main classes, solo, steady bot):** v2 win% =
QM 13.3% / Exec 3.3% / Sentinel 3.3% / Surgeon 3.3% (overall 5.8%, bot is a
floor — sub-human). **Quartermaster was the outlier** (reached ch2 73%). Tested
two nerfs: dropping 5♦ (blunt — weakens the shared deck, dragged Sentinel/Surgeon
to 0% and overall to 1.7%) vs **QM +1 draw once-per-fight** (surgical — only QM
moved, 13.3%→~0%, others unchanged). **SHIPPED the per-fight draw as canon**
(`encounter.ts` `qmDiamondFight` flag — was once-per-enemy, which snowballed the
new multi-enemy gates). 5♦ stays in the deck. Sentinel≈Surgeon parity is expected:
both are pure-sustain (Plate vs Mend) with no tempo/damage engine to close fights.

## Playtest run #2 (2026-06-15) — feedback → resolution

Log: `server/data/logs/camp-mqfiud61-837j.log` (solo Executioner, seed `eb6cfwlr`).

| Feedback | Status | Fix |
|---|---|---|
| "Combat Cache doesn't work" | ✅ FIXED | Server allowed combos→12 but the **client hard-capped selection at 10**. Threaded `comboMax` through `computeBoosts`→`myBoosts`; `EncounterBoard` now uses it. |
| "spells every turn / Refit/Keen Edge/Guard Up for free" | ✅ FIXED | **Skirmish AND recruit clears now grant nothing** — the recruited card is a recruit's whole reward; filler is a grind (`campaign.ts` reward dispatch). |
| "Tactical Surge isn't rare in solo" (was draw-1-each) | ✅ FIXED | Reworked to **"foresee top 5 of the Tavern, keep 2"** via the draw-select pause + a fixed `drawSelectCap`; projected `drawSelectKeep` drives the modal text (also answers "show how much you can draw"). |
| "castle is 12 royals — where are the gates? never want J/Q/K before ch4" | ✅ FIXED (restructure) | **Continent-1 ch1/ch2 are now province-style 3-gate roads of NUMBER cards** (Gates/Courtyard/Throne). ch1 = 4×6 / 4×7 / 4×6+4×7; ch2 = 8/9; ch3 = single Council. `C1_GATE_RANKS` + gate stacks in `encounter.ts`; boss-split extended to C1 in `campaign.ts`; `CONT1_CH1/2` maps rebuilt; **all C1 filler is number-enemies — no royals before ch4** (degraded-recruit fallback de-royalled too). Gate kills recruit/backfill normally. |
| "chapter reset clears temporary royals" | ✅ KEEP (blessed) | Working as intended — left as canon. |
| Diamond select skipped on a kill; tokens too small/at the bottom; "killed with honed card, unclear"; Forge "what does Hone do" reminder | ◐ UX BACKLOG | Not bugs. Kill-path auto-keeps highest (intended, but consider a pause); token badges → top-left + larger; surface a honed card's token contribution in the kill line; Forge select-step reminder text. |

## Playtest run #1 (2026-06-15) — feedback → resolution

| Feedback | Status | Fix |
|---|---|---|
| "pool of N, no popup" / draw 6 / draw 2 "disappeared" / spell+run bugged | ✅ FIXED | The overdraw `draw_select` pause was overwritten by the rest of the turn (damage+counter ran after it). Diamonds now resolve LAST and the pause suspends the turn (`pendingCounterPi`); `applyKeepDrawn` resumes the counter. |
| "punishing / two diamonds too hard / seed too hard / rostering" | ✅ FIXED (root cause) | **Continent-1 filler fights were fielding royals** (2 Jacks solo, 20HP/10ATK) — the single-royal guard required `provinceMode`. Now: solo C1 filler = 1 royal, **scaled** (`revealNextEnemy` hp×0.55/atk×0.5); **no modifiers on recruit or any Ch1 fight**; solo Ch1 recruit = 1 enemy; recruit stacks enforce **suit variety**; `numberEnemyStats` attack `v*0.55`. |
| Scry "into draw" useless | ◐ PARTIAL | Now **buries your worst upcoming card** (top-3 lowest → bottom). Full interactive reorder/keep-or-discard still TODO (needs a selection pause like draw). |
| Draft too good / missing archetypes | ✅ FIXED | 3 categories: recruit+draw3 / **graft** / clean-card (tempo still 3). |
| Class descriptions wrong | ✅ FIXED | ClassSelect rewritten to pure-token signatures. |
| Token "why is this here" / hover | ◐ PARTIAL | Badges have a native `title` (name — effect); class-select shows stamped cards. Richer explain-UX still open. |
| "bug at the end of one of the runs" | ❓ UNREPRODUCED | Need the screen/context (win screen? ch3→ch4 seam?). |

## Open items (prioritized for next session)

1. **Playtest run #2** — confirm the opener feels fair and the draw popup appears; capture the vague "end of run" bug.
2. **Interactive Scry** — player reorder + keep-on-top-or-discard (a `scry_select` pause, mirrors the draw-select deferral pattern).
3. **Deck-dry watch** — the 20-card deck can still spiral when soaking; eased, not solved. Tune number-enemy stats / starting deck / Hearts by feel.
4. **The class tree** — co-design (one ★★★★ stamp/chapter, single in-run branch, meta-unlocked diversification). Next big design beat.
5. **Guaranteed Throne relic** (only deferred item-economy piece); milestone (non-death) unlocks; castable Curse spell (Shrine does cleanse only).
6. **Filler/recruit spoils** still grant spells — Step 10 wanted small draw/recover.
7. Classes 5–9 are **parked** (drafted signatures, untuned) — only the 4 suited are tuned.
8. Deferred non-gates: Step 7 (exile cap), Step 8 (telemetry + gate re-tuning), Echo/Wildcard tokens.

## Design locks (recap — full detail in the spec)

- **Pure-token classes:** same 20-card start; class = signature tokens stamped on it (3 stamps; Exile lean 18). No global passive.
- **Tokens:** never change rank/combo identity; **SPEND vs HOLD** value split is the spine. Catalog + class signatures in `server/campaign/content.ts`.
- **Relics = rule-bends** (axis-engines retired → that role is tokens). **Caravan** (relics, dark-deal: curse 3→rare), **Sanctum** (spells, rite: spend deck top-2→rare), **Shrine** (cleanse curse). Pools Kingdom-gated, start 5 relics/4 spells, grow on death.
- **Forge** = offer-menu at forge nodes (two-step token→card pick, spends budget).

## Key files

- `server/campaign/experiments.ts` — the master flags.
- `server/campaign/content.ts` — `TOKEN_DEFS`, `CLASS_SIGNATURES`, `ITEMS`, unlock pools.
- `server/campaign/tokens.ts` — token effect helpers + projection.
- `server/campaign/encounter.ts` — combat engine, token hooks, enemy stats, draw-select.
- `server/campaign/campaign.ts` — landmarks (forge/Caravan/Sanctum/Shrine), drafts, unlock-on-death, client projection.
- `server/deck.ts` — `numberEnemyStats`.
- `server/scripts/smoke.ts` — Tests A–F.
- `client/src/components/campaign/` — `EncounterBoard.vue` (token badges, draw-select UI), `ClassSelect.vue` (select-by-cards), `cards.ts` (signature mirror + helpers).

# Ascending Deck — Build Plan (Continent 1: chapters 1–3)

> **Current state + run-#1 playtest fixes + open items live in
> [`ascending-deck-status.md`](ascending-deck-status.md) (the resume-here doc).**


**For the builder.** This is the turnkey, sequenced execution plan. Design rationale
("why") lives in [`ascending-deck.md`](ascending-deck.md); this file is "what / in
what order / how to know it's done." All decisions are **locked** and the design was
**audited** (verdict: CONFLICT = large blast radius, not a design flaw — the
guardrails below absorb it).

> **BUILD STATUS (2026-06-14, code-verified, smoke Tests A–E green):**
> **✅ DONE + tested** — Step 0, 1, 2, 3, **5 (+ 4 merged)**, 6, 9, 10. The full arc
> ch1→ch2→ch3→Council of Tens→ch4 province→**win** passes end-to-end, and
> `EXPERIMENTS.ascendingDeck` is now the **LIVE** default (paired with
> `provinceMode:false`). **Ready to playtest.**
> **Step 5 (tokens / Forge) is BUILT:** catalog in `content.ts`, engine effect
> hooks (spend/hold value, graft/transmute, levers, scry/mark/banner/bloodprice),
> the `forge` node offers tokens (offer-menu, two-step pick), class signatures stamp
> at run start, and tokens render on the card face + in class-select. Test E covers it.
> **◻ DEFERRED (not gates):** Step 7 (exile cap), Step 8 (telemetry + gate
> re-tuning), the **relic**/**spell** revamps, the **class tree**, and the exotic
> tokens (Echo/Wildcard/curses-via-spell). See Q10 in
> [`open-design-questions.md`](open-design-questions.md).

Build target = the **full playable arc**: Continent 1 (the new prequel) flowing
straight into **Continent 2 = one province = today's shipped game** as the finale.
Goal ≈ **1–2 hours total** (current province ≈ 20 min = Continent 2).

## Scope & priority (revised 2026-06-14)

The playable arc, not class polish, is the priority. Order:

1. **Steps 0–3** (in progress) — the deck-growth engine.
2. **Step 5** — tokens / Forge (the "build your deck" feel).
3. **Step 6** — drafts in rewards (also the "patch what's missing at the gates" lever).
4. **Step 9** — Continent 1 → 2 transition (flow into the existing province).
5. **Step 10** — Continent-1 road content (the real source of the 1–2 hr runtime; design-first).

**Deferred** (per "classes can be fine-tuned"): **Step 4 (class axis-owners)** — no
longer a gate; classes keep their current abilities for now. **Step 7 (exile cap)**
— optional for playtest. **Step 8 (gate tuning)** — do it by playing.

**Continent 2 is now in scope** as the finale: when `continentOf(chapter) === 2`,
reuse the existing `PROVINCE_1` map + royal-recruit + existing relic/spell systems,
**backfill and number-recruit OFF**; the grown + tokened deck and relics carry in.

---

## Ground rules (apply to every step)

1. **One master flag.** Everything ships behind `EXPERIMENTS.ascendingDeck`
   (default **false**). `smoke.ts` pins it false for canon tests; province play is
   unaffected until the flag flips.
2. **Definition of done, per step:** server typecheck clean · `smoke.ts` green with
   the flag **off** · a new test exercising the step with the flag **on** ·
   `client && vue-tsc --noEmit` clean if the client changed.
3. **Validate-then-mutate; determinism via `rng.ts`/`c.rngState` only** (no
   `Math.random` in campaign logic).
4. **Commit per step.** Each step below is sized to be one reviewable commit.

## Protected boundary — DO NOT TOUCH (from the audit)

- **`server/types.ts` `TurnPhase`** — base quick game. Do **not** add `'draw_select'`
  here. Retype `EncounterState.turnPhase` to a **campaign-local** union instead.
- **`server/deck.ts` `enemyStats` / `buildPlayerDeck`** — used by `game.ts` (base
  game). Do **not** change their signatures. Add a separate
  `numberEnemyStats(rank)` and an `isNumberRank()` guard. `enemyStats` returns NaN
  on a number rank today, so guard every stat/kill site.
- **Save compat:** new `CampaignState` fields are **optional + `?? default`-guarded**
  on load (mirror `telemetry?`). `continent` is **computed** (`Math.ceil(chapter/3)`),
  never stored.
- **Test/sim drivers spin forever** on an unhandled phase/choice. Add `draw_select`
  and `draft_pick` handlers to `smoke.ts` and every `sim*.ts` `drive()` loop **in
  the same step that introduces them.**

## Locked starting numbers (tune by play later)

| Knob | Starting value |
|---|---|
| Starting deck | **A–5, all suits = 20 cards** (keeps Hearts→Diamond pipeline + the 2–5 combo tier) |
| Backfill ladder | end ch1 → 6s+7s · end ch2 → 8s+9s · **ch3 end → 10s (Council of Tens)** |
| Exact-kill (number) | recruit the card **early**; if already owned, that copy → a token at backfill |
| Drafts | **solo per-hero** (`forPlayerId`-scoped, no casino tie-break); every option carries something unobtainable elsewhere |
| Token markets | **combo tier (2–5)** and **solo tier (6–10)** are separate; common = value (±N), scarce = suit-flex / overflow-handler |
| Exile cap | ~**10 card-equivalents** per run (flat count to start) |

---

## Sequence

### Step 0 — Foundation + protected boundary  ✅ DONE
- `EXPERIMENTS.ascendingDeck = false`.
- Widen `CampaignState.chapter` `1|2 → number`; add a `continentOf(chapter)` helper.
- Add optional guarded fields: `ownedCards?: string[]`, `tokenBudget?: number`,
  `cardTokens?: Record<string, Token[]>`.
- Retype `EncounterState.turnPhase` to a campaign-local union including `'draw_select'`.
- New types: `Token` (kind: `value` | `suit` | `keyword`), `DraftOption`.
- `numberEnemyStats(rank)` + `isNumberRank()` in `deck.ts` (base `enemyStats` untouched).
- **Done when:** typecheck clean, smoke green (flag off), a pre-feature save still loads.

### Step 1 — Overdraw-and-select (the core ♦ rule)  ✅ DONE  *(most engine-invasive)*
- Under the flag, `resolveDiamonds`/`drawForHero` draw the full value into
  `EncounterState.drawPool`, set `turnPhase='draw_select'`, and **pause**.
- New action `keep_drawn` (keep up to empty hand slots; rest returns) → dispatcher case.
- Client: `EncounterBoard.vue` selection UI; add `drawPool` to `ClientEncounterState`.
- **Add `draw_select` auto-handler to `smoke.ts` + `sim*.ts` drivers** (keep best/cheapest).
- **Done when:** smoke green flag-off; a flag-on diamond-play test selects + resolves; sims don't spin.

### Step 2 — Number-enemies + recruit  ✅ DONE
- `buildEnemyStack`: number-enemy branch (Continent-1 recruit fights) using `numberEnemyStats`.
- `resolveKill`: `isNumberRank` guard — exact → recruit (existing `unshift`); overkill
  number → **soft** (no banish; it backfills later).
- `maps.ts`: Continent-1 recruit nodes (add a `'recruit'` `NodeKind` if cleaner).
- **Done when:** a number fight resolves; exact kill recruits the card; recruit test passes.

### Step 3 — Start-small deck + backfill ladder  ✅ DONE
- `setupChapterDeck`: build the 20-card start under the flag (**supersede curation** —
  `CURATION_CUT` + the curation block go dead under the flag).
- `backfillAct(c)` at chapter checkpoints (the ladder above); owned-redundancy →
  `tokenBudget`. `ownedCards` tracking.
- `applyContinueChapter` calls `buildMap` per chapter (it doesn't today); chapter
  increments **before** the map build.
- **Done when:** a Continent-1 run reaches a complete A–10 deck; backfill test passes.

### Step 4 — Classes  ✅ DESIGN-LOCKED, build merged into Step 5  *(pure-token, 2026-06-14)*
- **Superseded:** classes are no longer "axis-owner passives." A class = **signature
  tokens stamped on the shared 20-card start** (pure-token, 3 stamps; Exile lean 18).
  No global passive. So building the token system *is* building the classes.
- **Build (with Step 5):** stamp each class's level-1 tokens at `setupChapterDeck`;
  `ClassSelect` renders the 20-card start with the class's stamped cards highlighted
  (**select-by-cards UX**). First 4 suited classes only for first playtest; 5–9 parked.
- **The class tree** (one ★★★★ stamp/chapter, single in-run branch, meta-unlocked
  diversification) is co-designed next; not required for the first token playtest.
- **Done when:** picking a class shows its stamped cards and deals the tokened start.

### Step 5 — Token economy / Forge  ✅ BUILT + tested (Test E)  *(largest; also carries Step 4)*

> **As built (2026-06-14):** token catalog `TOKEN_DEFS` + class signatures in
> `content.ts`; effect helpers in `campaign/tokens.ts`; engine hooks in
> `encounter.ts` (spend value → base, hold value → soak, graft/transmute → active
> suits, Plate/Provision/Mend/Edge levers, Mark/Edge damage, Scry tavern-tee-up,
> Banner/Bloodprice on kill); forge is an **offer-menu** at forge nodes
> (`forge_token`→`forge_card` two-step, +1 budget/node, spends earned budget);
> signatures stamped at ch1 `setupChapterDeck`; card-face badges in
> `EncounterBoard.vue` + select-by-cards stamps in `ClassSelect.vue`.
> **Simplifications to revisit:** Scry is a deterministic next-draw nudge (not a
> player reorder yet); Mark is a flat +2 damage; curses are forge-`undercut` only
> (the Shrine spell-delivery is the spell revamp). Echo/Wildcard not shipped.
- `content.ts`: token defs per the **drafted catalog** in `ascending-deck.md`
  (value spend/hold, suit/graft, lever, sequencing, trigger, curse) + the **class
  signature stamps** (Step 4).
- Real `forge` node behavior; `apply_token` action; **camp budget-spend** UI (not auto-applied).
- Token effect hooks in play resolution (read `cardTokens`) — incl. the **spend vs
  hold** value split.
- Card-face rendering: **±value green/red on top, added suit in green in the middle**.
- **Done when:** tokens apply, render, and change play math; class stamps deal in; token test passes.

### Step 6 — Drafts  ✅ DONE
- `PendingChoice.kind:'draft_pick'` (solo per-hero); offer generation enforcing the
  draft-offer rule; pools in `content.ts`.
- **Add `draft_pick` handler to `smoke.ts` + `sim*.ts` drivers.**
- **Done when:** drafts appear at milestones, a bot picks, draft test passes.

### Step 7 — Exile budget cap  ◻ DEFERRED (optional for playtest)
- Extend existing exile machinery (`exiledCards`/`exileBurden`/`applyExileAtCamp`/
  `exile_pick`) with the ~10-card cap.
- **Done when:** cap is enforced; over-cap exile is rejected (validate-then-mutate).

### Step 9 — Continent 1 → 2 transition  ✅ DONE  *(makes the arc flow into the existing game)*
- `continentOf(chapter)` gates the rules: continent 1 = number-recruit + backfill ON;
  continent 2 = those OFF, **existing province behavior ON** (royal recruit, no
  backfill, current relic/spell/encounter-modifier systems).
- Chapter 4 builds the existing `PROVINCE_1` map; the persistent deck + `cardTokens`
  + relics carry across the transition untouched.
- Chapter-complete flow advances 3 → 4 (continent 1 → 2) and shows an interlude.
- **Done when:** a run plays start → Continent-1 (ch1–3) → Continent-2 province (ch4)
  → win, with the deck/tokens/relics intact across the seam.

### Step 10 — Continent-1 road content  ✅ DONE  *(LOCKED 2026-06-14 — the runtime lever)*

Author the **3 Continent-1 chapter maps** in `maps.ts` (follow the `PROVINCE_1`
layered-graph pattern; variant ids `cont1-ch1/2/3`). `buildMap` selects them when
`ascendingDeck` and `continentOf(chapter) === 1`. **Tiers:** ch1 = 6s+7s · ch2 =
8s+9s · ch3 = 10s (+ Council).

**Node behaviors:**
- **`recruit`** — number-enemy fight. **Enemy resolved on ENTRY**, lazily, via seeded
  rng (`c.rngState`) over the *unowned* cards of the chapter's tier
  (`ownedCards` complement). Always offers a card you lack; if the tier is already
  complete, the node **degrades to `filler`**. Exact-kill → recruit early; overkill
  → soft (backfilled later); owned-card edge → token (engine already guards this).
  → **This is the dupe guard, layer 1.** Layer 2 = `resolveKill`'s owned→token.
  Generalizes later: exempt royals/Jesters from the ownership gate when dupes are wanted.
- **`filler`** — generic skirmish/veteran enemy + a modifier from the existing
  15-pack (`ENCOUNTERS`). **Non-recruiting** (presents no tier card → no dupe risk).
  End-of-fight spoil only: a small immediate **draw** or **recover** (lever-flavored,
  not generic heal). Exact-kill → **+1 token sliver** (precision incentive). **No
  items, ever.**

**Reward scarcity (hard caps per chapter):** filler → tiny draw/recover only ·
drafts → ~1–2/chapter (card/token, occasionally a spell) · relics → ~1–2/chapter,
only from a **lair** (risk) or a special stop.

**Recruit density:** place **5–8 `recruit` nodes across the branches** per chapter.
One-way fork commitment means the player traverses a *lane* and realistically lands
**2–4 exact kills** — by the nature of play, not a cap. Backfill completes the rest
at chapter end (missing an exact kill costs **tempo, not the card**). Which recruits
sit on which branch lets **route choice steer the deck** (a ♦ lane, a ♠ lane).

**Chapter 1 & 2 template (~14–16 nodes, ~25–30 min each):**
```
L1  recruit (guaranteed tier opener)            [forced]
L2  filler (modifier)
L3  FORK: recruit  |  draft
L4  filler (modifier)
L5  FORK: lair (risk → relic / strong draft)  |  recruit (safe)
L6  forge
L7  camp (rest + spend token budget)            [forced]
L8  FORK: recruit  |  filler (bigger spoil)
L9  recruit (capstone — tougher tier card)
L10 CHAPTER END → backfill completes the tier + grants token budget
```
Ch2 = same shape, longer/harder (veteran-tier filler; 9-recruits bite).

**Chapter 3 — the Council of Tens (continent boss; bigger & meaner):**
- Elite-tier filler; 10-recruit fights are beefy (`numberEnemyStats(10)`); more
  layers, at least one extra camp.
- Ends in the **Council of Tens** — a special multi-enemy fight fielding **all four
  10s at once**. Defeating it completes the 10 set (recruit unowned 10s; owned →
  token) → the number deck is complete → **ascend to Continent 2** (Step 9 fires).
- **This resolves the Step 0–3 deferred "mid-ch3 → 10s" item:** the 10s arrive at
  ch3 **end**, as the Council's reward — no mid-chapter trigger needed.

**Done when:** a run plays start → ch1 → ch2 → ch3 → Council → province (ch4) → win,
with deck / tokens / relics intact across the seam, ~1–2 hr total by feel.

### Step 8 — Telemetry + tuning  ◻ DEFERRED (after tokens land; tune by play)
- Extend `RunTelemetry` (token count, deck-size curve, draft picks) + the CSV/check
  scripts that read it (backward-compat guards).
- **Re-tune the gates** for a tokened arrival (the province was balanced for a
  curated, untokened deck). Tune by sim + play.

---

## Class → axis-owner mapping  *(⚠ SUPERSEDED 2026-06-14 — historical)*

> **Superseded by the pure-token class model.** Classes are no longer global
> axis-owner passives; each is a set of **signature tokens stamped on the shared
> 20-card start**. The live design (level-1 stamps, select-by-cards UX, the tree)
> is in `ascending-deck.md` → *Classes — level-1 selection & the tree*. The table
> below is kept only to show the axis each class's token-region derives from.

Derived from the existing `CLASSES` suits/identities. The four suited classes are
clean axis-owners (their current "first trigger +1" abilities become the **permanent
every-trigger** version); the five suitless classes own a non-suit lever.

| Class | Axis | Permanent passive (proposed) | Starting lean |
|---|---|---|---|
| **Sentinel** | ♠ Shield | every Spade played: +1 shield | extra Spades |
| **Quartermaster** | ♦ Draw | every Diamond: +1 draw; hand cap +1 | extra Diamonds |
| **Surgeon** | ♥ Recover | every Heart: +1 recovery | extra Hearts |
| **Executioner** | ♣ Edge | exact/near-exact kills hit harder (finish window) | extra Clubs |
| **Commander** | Initiative | on your kill: draw 1 (solo) / handoff (multi) | balanced |
| **Warden** | Defense | once per fight, blunt one counterattack (death insurance) | defensive |
| **Gambler** | Tempo | the wager (draw-2-or-discard bet) | balanced |
| **Exile** | Thinning | owns the exile budget (cheaper/extra thinning) | leaner start |
| **Oracle** | Consistency | scry + Mark (foresight → bonus damage) | balanced |

> **Deferred** — Step 4 is no longer on the critical path (classes keep their
> current abilities for the first playtest). Revisit this table when class feel
> becomes the priority, after the full arc is playable.

# Open Design Questions (v0)

**Status:** Living document. Updated 2026-06-11 from the Design Direction
(`Design/Design_direction_2026-06-11.md`). Most flagship forks are now **RATIFIED**;
this doc records the decision, the rationale, the corpus changes already made, and
the sub-questions that remain genuinely open (mostly pending playtest).

**Legend:** ✅ RATIFIED · ◻ PARTIALLY OPEN · ⏳ NEEDS PLAYTEST DATA

**Fixed constraints (not relitigated):** solo primary (70/30); difficulty StS↔DD;
lineage CUT + candle death model; items build-defining; Executioner is the fun
benchmark.

## Locked terminology (Q5, ratified)

- **Province** = one run attempt and one difficulty tier (replaces "chapter,"
  "run," "ascension"). Numbered: Province 1/2/3.
- **Act** = a road segment within a province: Act 1 Jacks, Act 2 Queens, Act 3 Kings.
- **Gate** = a rank climax: **Gate** (Jacks) / **Courtyard** (Queens) / **Throne**
  (Kings). Replaces the single 12-enemy castle.
- **Kingdom** = permanent meta layer. **Candle** = placeholder name for banked
  death currency. **Camp** = the deck-reset landmark.
- "Ascension" retired. "Chapter" survives only as optional story flavor.

---

## Q1 — FLAGSHIP: Regicide-with-roguelike-structure vs. full deckbuilder ✅ RATIFIED

**Decision: hybrid modification (Option B), pushed harder than the prior draft.**
Keep the fixed 52-card tavern; the roguelike layer is a **bounded card-modification
space** — suit-switching, rank-morphing, temporary card injection — plus a new
ratified direction: **each class has a signature effect on the deck itself**, not
just an ability list. The framing the team wants: *"here are your 52 cards, and
here is the range of things you can do to change them."* Not Slay the Spire, not a
full deckbuilder — **engine-building**.

**Why.** The fixed deck is a structural asset: the boss royal math (J 10/20,
Q 15/30, K 20/40) and suit immunities come pre-calibrated and only hold for the
standard distribution. A full deckbuilder throws that away and forces an ~80%
re-derivation of the corpus while competing on StS's home turf. The hybrid keeps
the math, and the modification layer is what makes runs feel unique and personal.
The per-class deck effect is also the cleanest way to make the big MMO-style
specialization trees *change the game*, not just the numbers.

**Boss math under this decision:** intact. The guardrail stands — no modification
may corrupt the global suit economy enough to break immunity math (working floor:
no single suit drops below ~7 cards in the active tavern). Temporary card injection
must be bounded (expires end of encounter / end of enemy) so the deck identity
re-converges.

**Cost acknowledged:** "It's going to be a big balancing act" — accepted as the
price of the vision. The per-class deck-effect layer is ratified as *direction*,
not yet spec'd; it needs sim support.

**Blast radius — actioned:** `campaign-bible.md` (modification layer + per-class
deck effects noted), `campaign-objective.md` (engine-building fantasy is now the
stated spine), `Design/CLASS-DESIGN.md` (per-class deck effect is principle #4),
`items/relics.md` (build-defining tier). **Still to author:** the actual
modification verbs (which spells/relics/classes may switch suit, morph rank, inject
cards) and their bounds.

⏳ Open: exact bounds of temporary card injection; per-class deck-effect specs.

---

## Q2 — Province run structure ✅ RATIFIED (highest blast radius)

**Decision: adopt the province structure (Option B) as canon.** A run = three acts
(Jacks/Queens/Kings) each climaxing in a rank gate (Gate/Courtyard/Throne), sized
2/3/4 royals by player count. The single 12-enemy castle is dissolved. The
province-select UI is a **Kingdom map**, not Chapter buttons: click the first
available province; clearing it unlocks a path to the next.

**Sub-decisions:**
- **Death = full reset.** Confirmed.
- **No second wind.** The prototype's "one road second-wind per act" is removed —
  road deaths are terminal.
- **Retreats give no rest** (no deck reshuffle on retreat).
- **Relics persist across provinces** — the cross-run personalization vector.
- **Provinces unlock permanently.** Reaching Province N lets future runs start
  directly at Province N, which grants the specialization progress you'd have
  banked clearing 1..N-1 **plus a selection of relics/spells** from your pool, to
  stay on-curve without replaying earlier tiers.
- Candles/heirlooms are **not implemented yet** but are the ratified design (see Q6).

**Why.** The old full-castle structure wiped 88% of parties that reached it and
can't scale cleanly for solo. Gates sized by player count fix both. Three climaxes
per run create three tension arcs and make deep-start runs coherent. The CT
re-derivation cost is explicitly accepted ("not really a big problem").

**Blast radius — actioned:** `campaign-bible.md` (full rewrite), `chapters.md`
(replaced with province structure), `campaign-objective.md`, `systems/road.md`,
`systems/landmarks.md`, `systems/catastrophe-tolerance.md` (v2.1 section). **Not
actioned (code):** `server/campaign/*` still models chapters/castle — engineering
follow-up.

⏳ Open: exact per-act landmark counts and gate sizes beyond the prototype; Province
2 gate modifiers.

---

## Q3 — Deck persistence ✅ RATIFIED

**Decision: deck resets fully between provinces; persists within a province until a
Camp.** Every province begins on a fresh 52-card deck. The deck is the run's **life
source** — it carries across road encounters and across acts, and **only a Camp
rest** reshuffles/redraws it. Cross-run growth is expressed through **characters
and relics, not a carried deck** (a mangled deck across provinces was rejected as
illegible).

**Camp is the keystone resource.** Canon guarantee: **at least one Camp between the
Courtyard (Queens gate) and the Throne (Kings gate)**; the pre-Throne Camp is
mandatory; earlier camps are forks. Retreats give no rest, so Camp is the only
reset.

**Tuning target (ratified):** Province 1 ≈ **50%** competent-solo clear. First-Gate
bad luck costing the run is within bounds.

**Why.** Within-province attrition is the road's whole pressure story and should
bite hardest in Act 3 — but never unfairly, hence the guaranteed Act-3 Camp.
Resetting between provinces keeps each tier legible.

**Blast radius — actioned:** `campaign-bible.md` (Deck Persistence + Camp canon),
`systems/road.md` (replaced the old "reset every encounter" rule, which
contradicted attrition canon), `systems/landmarks.md` (Camp keystone),
`systems/catastrophe-tolerance.md` (Camp as dominant tolerance lever).

⏳ Open: whether Province 1 should *also* offer an Act-1/Act-2 camp by default, or
keep them as forks; measure the 50% target on a real table.

---

## Q4 — What "solo" means ✅ RATIFIED

**Decision: solo = one player, one hero (Option A).** Accepted with its large blast
radius. **No class may have a dead mechanic at solo.** Initiative-style "choose the
next player" effects are multiplayer riders and must have solo-functional
replacements. Multiplayer is a **parallel, optional branch**: ~8 heroes, of which
1–2 may be explicitly tuned for 2–4 players (one possibly a duo companion, one for
full four), delivered via an **ability-variant layer** (a selection-screen-style
swap that changes some abilities when player count > 1).

**Why.** 70% of players play solo — abilities must be coherent for them first.
Multiplayer makes the game funnier but doesn't define the baseline.

**Kills/keeps the Initiative pillar:** for 70% of players, pure turn-handoff
Initiative is *killed* and replaced by solo-functional cores (Commander → draw on
own kill; Gambler → streak bonus cards; Executioner already solo-fine). The handoff
forms survive as multiplayer variants.

**Blast radius — actioned:** `campaign-objective.md` (solo-first stated),
`classes-overview.md`, `Design/CLASS-DESIGN.md` (principles #1–2; per-class solo
cores). **Still to do:** author the multiplayer ability-variant layer; re-measure
Initiative CT solo (sim is largely 4p).

⏳ Open: which 1–2 heroes are the multiplayer-tuned ones; the duo-vs-four split.

---

## Q5 — Naming lockdown ✅ RATIFIED

**Decision: adopt province / act / gate, difficulty tiers = Province 1/2/3, retire
ascension.** (Full terminology table at the top of this doc and in
`campaign-bible.md`.) The team will revisit exact wording later, but the corpus
should use these terms now.

**Blast radius — actioned:** terminology propagated through `campaign-bible.md`,
`chapters.md`, `campaign-objective.md`, `systems/*`, `items/*`, `classes-overview.md`.
**Not exhaustively swept:** historical per-class files and encounter docs still say
"chapter" in places — acceptable as flavor, cleaned opportunistically.

---

## Q6 — Meta-power vs. in-run power + the candle cascade ✅ RATIFIED (build deferred)

**Decision: a Darkest-Dungeon-style death currency ("candles," placeholder name)
with a soft ceiling.** Death is an opportunity, not a failure.

**Start state (fresh Kingdom, no upgrades):** 4 heroes, **one specialization branch
each**, a **small** relic pool, a small spell pool, a small preparation pool, no
persistent relics, no candles.

**Candles do two things:**
1. **Widen** (the main lever) — unlock additional specialization branches for a
   class, expand the relic/spell/preparation pools. The game gets *wider* as you
   progress; new options drive a "I need to test this next run" loop.
2. **Boost (soft ceiling)** — small, capped advantages for the next run. The cap is
   what stops a progressed Kingdom from trivializing a province.

**Meta-power band:** permanent cross-run tolerance (persistent relics + candle
boosts) must stay ≲ 50% of a province's pressure CT. Enforced by: widen-over-boost
spending, capped boosts, Kingdom-gated build-defining relics, and deeper-start
runs granting a *selection* (not the whole pool). See `catastrophe-tolerance.md`
v2.1.

**Cascade — lineage cut:**
- **Warden** is broken (its whole kit referenced the cut death fork). Re-homes onto
  the candle economy; can't be finalized until candles are built. (`warden.md`
  banner + `CLASS-DESIGN.md`.)
- **Memories** are **cut** (no surviving-hero lineage carry). Cross-run continuity
  is now candles + persistent relics. Any Memory-like reward that returns is
  **gate-scoped** (lost on reset), not lineage power. (`items/memories.md` rewritten.)
- **Death-fork / Retreat-vote / replacement** all removed from `campaign-bible.md`,
  `road.md`, `classes-overview.md`.

**Why.** Gating + widening makes death generative and keeps the early game from
overwhelming new players, while the soft ceiling preserves StS↔DD difficulty.

**Blast radius — actioned:** `campaign-bible.md` (Death/Candles + persistence
layers), `items/memories.md`, `items/relics.md`, `catastrophe-tolerance.md` v2.1,
class banners. **Not built:** the candle system itself (deferred — design only).

⏳ Open: candle earn formula and spend costs; exact branch-unlock channel (candles
vs. class-specific wins vs. both); final name for "candles."

---

## Q7 — Class rework principles + specific reworks ◻ DIRECTION SET, playtest pending

**Decision: classes get their own pillar document** (`Design/CLASS-DESIGN.md`),
separate from campaign/system philosophy. Principles ratified: the **Executioner
bar** (decision + visibility + gate-relevant capstone), **solo coherence**,
**Kingdom-gated specialization trees**, **per-class deck effects**, **Siege-axis
capstones**, **build-sharing legibility**. The honest read from our own play: the
Executioner's exact-kill dopamine loop landed; most other classes did not — closing
that gap is the core class problem and needs further playtest.

**Rework directions captured (not locked numbers):**
- **Oracle** → card-relocation (Displacement), not reveal; Omen becomes a countable
  push trigger. (Old Omen was unobservable — broken.)
- **Sentinel** → active *declared* trigger (spend now vs. hold).
- **Gambler** → odd/even prediction with a streak; solo-functional bonus cards;
  handoff is a multiplayer rider.
- **Warden** → rebuilt on the candle canvas (deferred with candles).
- **New class — The Furnace** (exile-to-boost; burn a hand card to spike another,
  precision/threshold).
- **New class — The Arbiter** (rank-pairing/combo).
Each has a stated "core decision every turn" in `CLASS-DESIGN.md`.

**Blast radius — actioned:** new `Design/CLASS-DESIGN.md`; ⛔ banners on
`warden.md` and `oracle.md`; `classes-overview.md` updated. **Not done:** per-class
file rewrites (Sentinel/Gambler/Commander still show old cores) — deliberately
deferred to the class doc + playtest, per the team's call that classes need more
play first.

⏳ Open: essentially all final class numbers; per-class deck-effect specs; new-class
validation.

---

## Q8 — Item philosophy: build-defining tier ✅ RATIFIED

**Decision: boost items hard; relics specifically need a build-defining tier, and
relic tiers + specialization branches are Kingdom-gated.** The success image is
build-sharing: *"I ran class X + branch Y in Province 6 with relic A/B — felt
invincible until the wall. Play this build."* Current items are too incremental for
that.

**Three tiers** (`items/relics.md`): Utility (~0.25, incremental, early pool) ·
Rare (~0.75, high-risk) · **Build-defining** (1.5+, Kingdom-gated, capstone
rewards). A build-defining item appears in *how you play*, not just your numbers,
and may break exactly one named rule (hand cap, double a class core, negate a suit
immunity once/gate, one off-Camp reshuffle/act, permanent deck exile). At most one
build-defining reward per province, at the Throne or a Lair capstone.

**The CT leakage-audit framework is demoted to a debug sanity check** (banner added
to `synthetic-item-pools.md`); the single-category 0.25 discipline is a floor for
utility items, not a ceiling.

**Blast radius — actioned:** `items/relics.md` (rewritten: persistence + tiers +
gating + build-defining), `items/spells.md` and `items/preparations.md` (pool
gating + terms), `items/synthetic-item-pools.md` (status banner). **Not done:**
authoring the actual build-defining items (one per class identity).

⏳ Open: the build-defining item list; whether persistent build-defining relics need
a one-per-hero cap.

---

## Consolidated open items (for the next pass)

⏳ **Needs playtest data:**
1. Province 1 hitting the **50%** competent-solo target.
2. Whether removing the second wind makes solo road too swingy.
3. Exact-killed-royal bomb cards causing runaway deck quality across Acts 2–3 under
   within-province deck carry.
4. Per-turn ergonomics of the Gambler odd/even streak (1p vs 4p).
5. Arbiter pair-window frequency (does it feel like identity or luck?).
6. Whether the Furnace's threshold precision overshadows the Executioner's niche.

◻ **Design, still to spec:**
7. Candle earn/spend formula and the final currency name.
8. The per-class deck-effect layer (verbs + bounds).
9. The bounded card-modification verbs for Q1 (suit-switch / rank-morph / inject).
10. The multiplayer ability-variant mechanism and the 1–2 multiplayer-tuned heroes.
11. Warden's final kit (blocked on candles).
12. The build-defining item list.
13. Province 2 gate modifier pool.

🔧 **Engineering follow-up (docs now ahead of code):**
14. `server/campaign/*` still models chapters/castle/lineage — migrate to
    province/act/gate, remove death-fork/replacement, add deck reset-between-
    provinces and persist-within rules, guaranteed Act-3 Camp. **Full audit in Q9.**

---

## Q9 — Engineering coherence audit 🔧 PARTLY ACTIONED

**Status added 2026-06-11 after a code read of `server/campaign/*`. Revised same day
after the `provinceMode` discovery + a gameplay-loop implementation pass.**

> **Important correction to the first audit.** The first table (below) understated
> coherence because it missed the live experiment flag. `EXPERIMENTS.provinceMode`
> is **`true`** (`experiments.ts:22`), and the engine already branches on it:
> **any hero death → full run reset, no vote, no replacement, no second wind**
> (`encounter.ts:1151–1156`); **retreats give no rest** (`campaign.ts:581`); memories
> are cleared on death (`encounter.ts:1142`). So the *live gameplay loop* was already
> ~90% aligned with the death/reset canon. The ❌ rows below are mostly **(a)** dead
> `!provinceMode` code paths (still compiled, exercised only by `smoke.ts`, which pins
> `provinceMode=false`), **(b)** internal naming (`chapter`/`castle`) under a loop that
> is already province-shaped, and **(c)** genuinely-unbuilt meta systems (candles,
> deck-mod, relic persistence).

### Implemented 2026-06-11 (gameplay-loop pass — docs given precedence, NOT committed)

Per the directive "implement only the changes that affect the gameplay loop; leave the
rest as open questions." Two live-path fixes; build + smoke + e2e green:

- **Memories cut from the winning loop (9.3).** A won Throne run no longer opens a
  memory draft — in province mode the Throne win completes the run directly
  (`campaign.ts` `checkEncounterEnd`: `completeChapter(c, loadKingdom())` instead of
  `beginMemoryDraft`). Combined with death-clears-memories, memories never accrue in
  live play. *(The `memory_draft` machinery still exists as dead code on the
  `!provinceMode` path + client — removal is an open cleanup, see below.)*
- **Guaranteed pre-Throne Camp (9.8).** `maps.ts` stop 7 changed from the
  `['camp','shrine','tower']` fork to a lone `['camp']`, so every path from the
  Courtyard to the Throne funnels through a mandatory Camp (canon Q3). Earlier camps
  (stop 4) stay forks, as canon specifies.

- **Second wind removed entirely (dead is dead).** The per-act road mercy and
  the Warden Vigil shadow of it are deleted (`encounter.ts` death path,
  `campaign.ts` mercy renewal). Any province death = full run reset, full stop.
- **Road recruit canon.** Only a strictly exact road kill (final HP = 0)
  recruits the royal into the deck; road overkills **banish** the royal
  permanently (visible log/event). Gates keep base-Regicide behavior. This is
  the deck-inflation guard. Executioner note: the 1–2 HP finisher recruits only
  when the math lands at 0 — kill assurance ≠ recruit assurance, no nerf yet.

Verification: `server/scripts/smoke.ts` ✅, `client vue-tsc --noEmit` exit 0,
`server/scripts/e2e.ts` ✅ against the live dev server (601 protocol steps).
See `Design/THE-BAR.md` (content canon) and `Design/ITEMS-V2.md` (pool rework).

### Still open (deliberately NOT implemented — not gameplay-loop, or too large)

- **9.1 naming/structure cleanup** — retire the internal `chapter: 1|2` / `castle`
  labels in favour of province/act/gate. The *loop* is already province-shaped via
  `provinceMode`; this is a large, mostly-cosmetic rename. Open.
- **Dead-code removal** — the `!provinceMode` death-fork (`death_vote`,
  `applyDeathVote`, `replace_hero`, `dealReplacementHand`, Warden Defiant) and the
  `memory_draft`/`chapter_complete` flow. Can't delete yet: `smoke.ts` pins
  `provinceMode=false` and exercises exactly these paths. Removing them requires
  migrating the tests first. Open.
- **9.4 candles, 9.5 deck-mod layer + per-class deck effects, 9.6 class reworks,
  9.7 relic persistence + Kingdom-gated tier** — meta/large, deferred by design.
  Open (see Q6/Q7/Q8 and the consolidated list above).
- **Deck reset *between* provinces** — the prototype is a single province (`chapter`
  always 1); the between-province reset is N/A until provinces 2+ ship. Open.
- **Save compatibility** — the ~9 saves in `server/data/campaigns/` encode the old
  `chapter` shape; decide keep-a-read-path vs. hard-reset on the eventual structural
  migration. Open.

---

### Original audit table (pre-correction — read with the note above)

The ratified pivot (Q1–Q8) lives in the docs; at first read the engine looked
un-migrated. Concrete gaps with the contradicting canon and code evidence:

| # | Ratified canon | Code today (evidence) | Verdict |
|---|---|---|---|
| 9.1 | Unit of play = **province** (3 acts → 3 gates); the 12-enemy castle is dissolved (Q2). | Core unit is still `chapter: 1 \| 2` (`types.ts:220`, `:354`); `castle` referenced ~51×. "province mode" in code only labels which rank a boss gate is (`types.ts:340`), it is **not** the run structure. | ❌ Not migrated |
| 9.2 | **Lineage CUT** — death = full reset, no second wind, no replacement (Q2/Q6). | Death-fork still live: `replace_hero` action (`types.ts:132`, `campaign.ts:768`), `ReplacementHand` / "replacement takes up the banner" (`encounter.ts:152–153`, `:1163`); `lineage` ~13×, retreat/replacement ~40×. | ❌ Contradicts canon |
| 9.3 | **Memories cut**; continuity = candles + persistent relics (Q6). | Memories fully wired: `memory_draft`, `chapter_complete` actions (`types.ts:133–134`); ~66 `memory` references; memory drafts still dispatched. | ❌ Contradicts canon |
| 9.4 | **Candle** death-currency economy + Kingdom widen/boost (Q6). | Not implemented — `candle` appears only in 2 *comments* as a future re-home note (`content.ts:42`, `encounter.ts:1150`). No currency, no Kingdom spend. | ❌ Missing |
| 9.5 | **Bounded card-modification layer** + **per-class deck effects** (Q1, principle #4). | Not present as a system. Only the legacy Exile `exiledCards` thinning exists (`types.ts:245`); no suit-switch / rank-morph / temporary-injection verbs, no per-class deck signatures. | ❌ Missing |
| 9.6 | Class **reworks**: Oracle→Displacement, Sentinel→declared, Gambler→streak, Warden→candle, +Furnace, +Arbiter (Q7). | Old cores still in engine, e.g. `gamblerWagerUsed` "once per chapter" (`types.ts:248`); broken Oracle/Warden kits intact; no Furnace/Arbiter. | ❌ Stale (deferred by design, but flagged) |
| 9.7 | Relics **persist across provinces**; build-defining **Kingdom-gated** tier (Q8). | Relic model is per-run/per-chapter, hero-owned, no persistence layer, no tier/gating in the economy code. | ❌ Not migrated |
| 9.8 | Deck **resets between provinces**, **persists within until a Camp**, **guaranteed Camp between Courtyard & Throne** (Q3). | Within-run persistence + Camp reset (`campRest`, 5×) roughly match; but there is no province boundary to reset *between*, and no guaranteed pre-Throne Camp invariant. | ◻ Partial |

**Net:** the docs (canon) and the engine have **forked**. Anything built on the
current engine inherits the *old* chapter/lineage/memory model, not the ratified
province/candle/deck-mod model. This is the single largest source of design-code
drift right now.

**Migration order (suggested, smallest-blast-first):**
1. **Terminology + structure** — replace `chapter: 1|2` with province/act/gate as
   the run spine; retire `castle`. (9.1) Highest blast radius; do first so the rest
   has a frame.
2. **Remove the cut systems** — death → full reset is **DONE live** (9.2, via
   `provinceMode`); memories no longer accrue (9.3, done). Remaining: physically
   delete the now-dead `!provinceMode` fork + memory machinery once `smoke.ts` is
   migrated off them.
3. **Deck rules** — guaranteed pre-Throne Camp **DONE** (9.8); province-boundary
   reset still open (N/A until provinces 2+).
4. **Relic persistence + Kingdom layer scaffold** — even before candles, stand up
   the persistence vector. (9.7)
5. **Candle economy** — then it unblocks Warden. (9.4 → 9.6 Warden)
6. **Deck-modification layer + per-class deck effects** — largest, last; needs sim
   support. (9.5)
7. **Class reworks** — per `CLASS-DESIGN.md`, after the deck-mod layer exists. (9.6)

⏳ Open (engineering): whether to migrate in place on `balance-testing` or branch a
`province-migration`; whether to keep a compatibility read path for the ~9 existing
campaign saves in `server/data/campaigns/` (they encode the old `chapter` shape) or
hard-reset Kingdom state on the cutover.

---

## Q10 — Ascending Deck: remaining steps before first playtest 🔧 IN PROGRESS

**Status added 2026-06-14 after a code read of `server/campaign/*` + a green smoke
run.** The Ascending Deck engine (`docs/design/ascending-deck.md` +
`ascending-deck-build-plan.md`) is **largely built and tested behind
`EXPERIMENTS.ascendingDeck`** (default `false`). This section records what's *done*
vs. what must be addressed before a meaningful first playtest, so the remaining
steps can be closed and then evaluated by **raw play feedback**.

### Built + tested behind the flag (smoke Tests A–D green)

- **Step 0 — Foundation/boundary.** Flag, `Token`/`DraftOption` types, optional+guarded
  `ownedCards?`/`tokenBudget?`/`cardTokens?`, campaign-local `turnPhase` union with
  `'draw_select'`, `numberEnemyStats`/`isNumberRank` in `deck.ts`, `continentOf()`.
  Base game untouched. ✅
- **Step 1 — Overdraw-and-select.** `draw_select` phase + `drawPool` + `keep_drawn`
  action + `EncounterBoard.vue` UI. ✅ (Test A)
- **Step 2 — Number-enemies + recruit.** Number-enemy stacks; exact-kill → recruit,
  overkill → soft (no banish). ✅ (Test B)
- **Step 3 — Start-small (A–5, 20 cards) + backfill ladder.** `setupChapterDeck`
  superseding curation; `backfillAct()` with owned→`tokenBudget` redundancy. ✅ (Test C)
- **Step 6 — Drafts.** `draft_pick` PendingChoice, solo per-hero. ✅ (Test B2)
- **Step 9 — Continent 1→2 seam.** Council of Tens → ascend to ch4 = `PROVINCE_1`,
  deck/relics carry across. Full arc ch1→ch2→ch3→Council→ch4→**win**. ✅ (Test D)
- **Step 10 — Continent-1 road maps** (`cont1-ch1/2/3`) with `recruit`/`filler` nodes. ✅

### ✅ Step 5 BUILT (2026-06-14) — ready to playtest

- **Token economy / the Forge is built and tested (smoke Test E).** Catalog
  (`TOKEN_DEFS`) + class signatures in `content.ts`; effect helpers in
  `campaign/tokens.ts`; engine hooks in `encounter.ts` (spend value, hold value,
  graft/transmute, Plate/Provision/Mend/Edge levers, Mark/Edge damage, Scry,
  Banner/Bloodprice); the `forge` node offers tokens (offer-menu, two-step pick,
  spends earned budget); signatures stamp at run start; tokens render on the card
  face + in class-select (select-by-cards).
- **Step 4 absorbed into Step 5 (built).** Classes are **pure-token** — no global
  passive; a class = signature tokens stamped on the shared 20-card start (3 stamps).
  First 4 suited classes are tuned/active; 5–9 are stamped-as-drafted (parked).
- **Flag flipped LIVE.** `EXPERIMENTS.ascendingDeck = true`, `provinceMode = false`
  (the tested config). Smoke pins both off for canon tests. To return to the
  province prototype, flip both back.
- **Simplifications to revisit (logged):** Scry is a deterministic next-draw nudge
  (not a player reorder); Mark is flat +2 damage; curses are forge-`undercut` only
  (Shrine spell-delivery awaits the spell revamp); Echo/Wildcard not shipped. The
  **class tree** (one ★★★★ stamp/chapter, meta-unlocked diversification) is the next
  co-design piece.

### ✅ Item economy BUILT (2026-06-15)

- **Relic/spell revamp + landmark economy done** (smoke Test F). Relics are now
  **rule-bends** (the 4 axis-dupes + 2 MP-dead relics retired); the **Caravan** (was
  Market) sells relics — 1 of 2, or a **dark deal** (curse 3 cards → rare); the
  **Sanctum** (was Abbey) gives spells — 1 of 2, or a **rite** (spend the top 2 of the
  deck → rare); the **Shrine** cleanses curses. Pools are **Kingdom-gated**
  (`unlockedRelics/Spells`, start 5/4) and **grow on death** (`*_UNLOCK_ORDER`); item
  stops are **capped at 3/chapter**. **TODO:** the guaranteed **Throne** relic
  (deferred — Caravan covers relics meanwhile); milestone unlocks (death-only for now);
  the castable Curse spell (Shrine does cleanse only).

### ◻ Deferred / pending (NOT gates for first play; tune by playing)
- **Step 7 — Exile budget cap (~10 card-equivalents).** `exileBurden` exists but the
  cap is unbuilt. Optional for playtest.
- **Step 8 — Telemetry extension + gate re-tuning.** `RunTelemetry` exists
  (`telemetry.ts`) but is **not** extended with token count / deck-size curve / draft
  picks; gates are still balanced for a curated, untokened deck. Re-tune by sim +
  play *after* tokens land.

### Open (to settle by raw feedback, per the "Still to spec" list in the spec)

⏳ Starting-deck floor (A–5 = 20 cards — does it death-spiral?); token vocabulary per
tier; number-enemy stat line; backfill cadence vs. chapter length; what an exact-kill
grants when the card is *new* vs. owned; recruit-node density feel (2–4 exact kills
per lane); whether the ch1→ch2→ch3→Council→province arc lands at ~1–2 hr.

---

## Q11 — Continent 2: scaling forces specialization ✅ DIRECTION RATIFIED (2026-06-17)

**Decision.** Continent 2 (ch4–6) is **the same game scaled up**, not new mechanics.
Chapters 4–5 are tuned so a **vanilla deck with a few +1 tokens cannot reliably
survive** (win% craters) while a deck that **specializes hard into one suit-axis**
clears. The pressure is **statistical, not mechanical** — bosses just have more
HP/attack; **no anti-class modifiers, nothing references the player's build.** A boss
should feel *bigger and meaner, not weird.*

> **Explicitly rejected:** the earlier "anti-class walls" idea (Bulwark / Bloodletter /
> Siege modifiers that mechanically force a suit — lock-and-key puzzle design). Bosses
> are never adversarial to a specific build.

**Rationale (the load-bearing math).** A fight is a race: *turns-to-kill*
(`HP / DPS`) vs. *attrition* (soak each turn without running dry). Scaling worsens both
terms together. Vanilla improves every term **linearly**; a scaled bar outpaces linear
gains. Each specialization breaks **one term non-linearly** — ♣ collapses turns-to-kill,
♥ removes attrition, ♠ makes soak free + chips HP, ♦ fuels both. You cannot beat a
non-linear bar by spreading power evenly (wrong *shape*).

**Implications ratified:**
- **Token economy split:** generic +value tokens = **linear** power (Continent 1 ramp);
  the class **level-2 axis exploit = non-linear** power (required for Continent 2).
- **Exploits = ★★★★ super-stamps** (pure-token; one/chapter → ch4/5/6 ladder), reframing
  `specialization-trees.md` Root + Branch A. The four axes: ♠ Sentinel (Aegis/Riposte),
  ♦ QM (Munitions), ♥ Surgeon (Painless/Transfusion), ♣ Executioner (Chain/Cleave).
- **Anti-wall gimmicks dropped** (QM combo-rule "Salvo", Executioner "ignore caps") —
  with no walls to crack, exploits only need to be multiplicative on their axis.

**Tuning = sim + playtest (this is a numbers problem, not content).** Human telemetry
mirrors the sim record shape, so both pool into `analyze-province.ts`. **Sims set the
win% curve** (prerequisite: two personas/class — *vanilla generalist* vs. *axis
specialist* — measure the win% delta as bosses scale; that delta is the target).
**Humans confirm the feel** (forced vs. chosen specialization; is a loss legible).
Target split: **vanilla ≈ 15–20% / specialized ≈ 50–60%.** Sequencing: collect human
rows now → build the persona split → sweep boss stats in sim → re-validate with humans.

⏳ **Open (brainstorm/data):** off-suit classes (Commander/Gambler/Oracle — which term
do they break?); Exile repurpose (owns no axis post-NO-EXILE); the actual HP/attack
curve and exploit formulas; whether Camp four-axis pips are the "raise toward ceiling"
dial under the same system; where deck-growth stops in ch5–6.

**Full design:** [`continent-2-axes-and-exploits.md`](./continent-2-axes-and-exploits.md);
structure note in `docs/design/ascending-deck.md`.

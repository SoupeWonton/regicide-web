# The Ascending Deck — solo progression spec

**Status:** Design canon, 2026-06-14. Supersedes the province "start full, curate
down" deckbuild. Numbers marked *(TBD)* are first-pass and will be tuned by the
sim/telemetry harness after implementation. Rule citations point at the live
engine so we design against what's actually coded.

> **Build status (2026-06-14, code-verified):** the engine is **largely built**
> behind `EXPERIMENTS.ascendingDeck` and the full arc wins end-to-end (smoke Tests
> A–D). Done: WS0/WS1/WS2/WS3 (Steps 0–3), WS5 drafts (Step 6), the Continent 1→2
> seam (Step 9), and the Continent-1 road maps (Step 10). **Not built: WS4 — the
> token economy / Forge (Step 5)** — the one piece left before a real playtest;
> `tokenBudget` is earned but unspendable and tokens don't yet hook play or render.
> WS-CLASS (Step 4), exile cap (Step 7), and telemetry (WS7/Step 8) are deferred.
> Tracked in [`open-design-questions.md`](open-design-questions.md) → Q10.

## The pitch

You start a campaign with a **small, low-value deck** and grow it toward the full
40-card composition as you play, then fine-tune it. By the finale you hold a
near-complete, lightly-**tokened** deck — **not** a thin high-value loop.

This is **Option A** (same recognizable ~deck, tuned by the end), chosen over
**Option B** (a ~10-card high-value loop), because B breaks three load-bearing
systems:

1. **Combos** — same-rank stacks must total ≤ 10 (`validateCampaignCombo`,
   `encounter.ts:501`). High-only decks can't make matched plays at all.
2. **Attrition** — a tiny deck with any Hearts access never runs dry; the
   death-spiral and persistent-deck attrition canon evaporate.
3. **Overflow** — high cards waste suit value (see below); a high-only deck is
   maximally wasteful on the exact lever it's built around.

## Structure: continents and chapters

A campaign spans **continents**; each continent is ~3 chapters (provinces).

- **Continent 1 — "the ramp" (chapters 1–3).** The Ascending Deck. Start small,
  recruit **number-enemies** (6–10), draft, and **backfill** ranks at chapter
  checkpoints. Tutorial-ish. Chapter 3 climaxes in the **Council of Tens** (a
  special fight against all four 10s); winning completes the number deck and
  ascends you into Continent 2. End state: a complete, lightly-tuned A–10 deck.
- **Continent 2 — "mastery" (chapters 4–6).** Royal recruiting + fine-tuning.
  **No backfill.** Exact-kill royals to recruit them; forge to sharpen.
  The deck **carries across** from Continent 1.

> **Implementation note:** Continent 2 is approximately the *currently shipped*
> province (J/Q/K gates, exact-recruit `resolveKill:661`, forge, no
> backfill). Continent 1 is the genuinely new content. **Backfill is a
> Continent-1-only rule**, gated by continent, not global.

### Continent 2 = scaling forces specialization (ratified 2026-06-17)

J/Q/K stays the boss vocabulary across Continent 2, but the **content of a chapter
is its difficulty scaling, not a new royal rank.** Chapters 4–5 are tuned so that a
**vanilla deck with a few +1 tokens cannot reliably survive** (win% craters), while a
deck that **specializes hard into one suit-axis** clears. The pressure is
**statistical, not mechanical**: bosses simply have more HP/attack — **no anti-class
modifiers, nothing references your build.** A boss feels *bigger and meaner, not weird.*

**Why scaling alone forces it:** a fight is a race between *turns-to-kill*
(`HP / damage-per-turn`) and *attrition* (soaking each turn's attack without running
dry). Scaling worsens both terms together. Vanilla improves every term *linearly*; a
scaled bar outpaces linear gains. **Each specialization breaks one term *non-linearly*
— ♣ collapses turns-to-kill, ♥ removes attrition, ♠ makes soak free + chips HP, ♦ fuels
both.** You can't beat a non-linear bar by spreading power evenly.

This sets the **token economy split**: generic **+value tokens = linear power** (enough
for Continent 1's ramp); the **class level-2 axis exploit = non-linear power** (required
for Continent 2). The exploits are delivered as **★★★★ super-stamps** (pure-token; one
per chapter → the ch4/5/6 ladder), reframing `specialization-trees.md` Root + Branch A.

Full design + the four per-class exploits + the sim/playtest tuning plan:
[`proposals/continent-2-axes-and-exploits.md`](proposals/continent-2-axes-and-exploits.md).
Target split (set by data): **vanilla ≈ 15–20% / specialized ≈ 50–60%.**

## Systems & identity (consolidation, locked 2026-06-14)

The **deck is the one engine**; every other layer gets a non-overlapping job, so
no two systems compete for "this is my build." Each play pillar has a distinct
owner:

- **Deck = engine + build + flex** (StS / Balatro / Poker Quest). Cards + tokens
  + recruited royals. "Check what I built" = your tokened deck.
- **Class = a set of signature tokens, expressed *on the cards* (pure-token,
  locked 2026-06-14).** No global axis passive. Every class starts from the **same
  20-card deck** and differs only by which tokens are pre-stamped on it. A class
  owns a **region of the token catalog** + a **unique tree**. See *Classes —
  level-1 selection & the tree* below. **This replaces the cut curation AND the
  earlier "axis-owner passive" model.**
- **Relics = passive additional abilities (revamp PENDING).** Demoted from
  flat-axis owners (that role is now tokens/classes) to situational passive riders.
  The current relic list (`content.ts`) is stale axis-owner text and **needs a
  rework**; death **expands the relic pool** (meta breadth). Not yet designed.
- **Spells = a THIN held-burst list, KEPT but revamp PENDING.** The one layer that
  doesn't build the deck — retained for the "save the ×3 for the King" decision and
  now also the **curse-delivery** vector. Current list needs a pass. Keep small.
- **Dual-type cards = a suit-token (Graft), not a distinct concept.** A two-suit
  card is just a card with a Graft token. Do not ship "dual-type cards" separately.
- **Meta = bank options, not power.** Death (and milestones) unlock *breadth* —
  **new classes, class-tree diversification branches, relic-pool expansion**,
  wisdom — never raw stats. In a single run you keep **one tree branch** and no
  cross-class builds; those unlock only on death/milestone. Options-not-power
  preserves attrition and avoids grind-to-win.

**Number-go-up note:** flat +value tokens self-limit on ♦/♥/♠ via overflow, so
the satisfying scaling must live on the **♣/offense path + recruit-bombs** —
design multiplicative/offense tokens, not just green +1s.

## The core rules

### Rule 1 — Exact-kill recruiting (whole game, never changes)

An **exact kill** — enemy reduced to *exactly* 0 HP (`exact = enemy.hp === 0`,
`encounter.ts:630`) — recruits the enemy card into your Tavern
(`s.tavern.unshift`, `:661`). Identical for number-enemies (6–10) and royals
(J/Q/K). The verb never changes, so there is **no playstyle relearn** between
continents. Reward of an exact kill = **the card, early** (tempo).

Road overkill currently *banishes* number/road royals (`:684`, the
deck-inflation guard). For **number-enemies in Continent 1 this softens** to
"you'll get it later via backfill." Royal banish behavior in Continent 2 is
unchanged.

### Rule 2 — Backfill (Continent 1 only)

At each chapter checkpoint, **complete the rank to vanilla**:

| Checkpoint | Grants |
|---|---|
| End ch1 | the 6s and 7s |
| End ch2 | the 8s and 9s |
| End ch3 (Council of Tens) | the 10s |

For any card you **already own** (recruited or drafted earlier), backfill grants
a **token instead of a duplicate** (there is only one of each card — the roster
is a hard cap, so inflation is structurally impossible).

**Rules 1 + 2 compose** into "exact-kill early → token at backfill," and the
token path **ends itself** when Continent 2 begins (royals are never backfilled).
Therefore an exact kill is **never wasted**: you either get a card you lacked
(tempo) or a token on one you owned (upgrade).

### Rule 3 — Drafts (milestone reward / road choice)

Drafts are how you **steer** the early deck. They plug into the existing reward
infra (`PendingChoice.kind`, `applyChoice`, `resolveRewardOption`,
`rewardDraw`). Per-card with **suit choice**; backfill completes whole ranks.

> **Draft offer rule (anti-obvious-pick):** every option must contain something
> **unobtainable elsewhere** — a unique upgrade (dual-type / token) **or**
> unrepeatable tempo (draw-3-now, etc.). A bare backfill-able card never appears
> as a standalone option; it may only appear *bundled* with unrepeatable tempo.

Three valid draft archetypes: **scarce vs scarce** (dual-6 vs tokened-8♠) ·
**permanence vs tempo** (dual-6 vs vanilla 8♠ + draw 3 now) · **grow vs refine**
(take a card vs forge/exile).

### Rule 4 — Overdraw-and-select (core ♦ rule)

Today a Diamond draws its value but caps at hand size (`drawForHero:396`), so a
3♦ and an 8♦ refill identically when the hand is full — high diamond value is
**wasted overflow** (confirmed in `../reference/additional-strategy.md` #7).

New base rule: **a Diamond draws its full value into a temporary pool; the player
keeps up to their empty hand slots and the rest returns.** Value becomes
**selection quality**, which can never overflow. `+draw` items (Field Satchel,
Grand Provision, Quartermaster) feed a **bigger pool**, not wasted cards.

The other three overflow handlers are **relics / tokens**, not the base rule:
**bank** the overflow (Tithe-Blade pattern), **scry-reorder** the Tavern top
(Scry Band pattern), **temp hand-cap** raise.

## The two card tiers (fixed by the ≤10 rule)

| Tier | Cards | Combo behavior | Role |
|---|---|---|---|
| **Combo** | 2–5 | same-rank stacks ≤ 10 fire multiple suit levers at once (quad of 2s = all four) | flexible multi-lever economy |
| **Solo** | 6–10 | cannot same-rank stack (6+6=12); Ace-pair only | magnitude + exact-kill reach |

6 and 8 are **both** solo-tier — combos do **not** differentiate them. Tokens on
the **combo tier are categorically stronger** (they touch multi-lever plays) →
treat combo-tier and solo-tier tokens as **separate markets**.

## Tokens — the deck-build engine (catalog, 2026-06-14)

Permanent per-card modifiers earned from backfill-redundancy (Rule 2) and the
Forge landmark. Delivered as a **budget spent at camp**, not auto-applied, so the
player paces their own power curve. **This is the layer the whole mode is built
around** — and it absorbs the class system (see *Classes plug in*, below).

**Storage:** `CampaignState.cardTokens: Record<cardId, Token[]>` — the base
`Card` type (shared with the quick game) stays untouched.

### Two locked rules (the design spine)

1. **Tokens never change the card's rank/identity.** A 5 stays a 5 — for combos,
   for exact-kill math, for everything structural. A token changes *what happens
   when you interact with the card*, not what the card *is*. No token math leaks
   into the ≤10 combo rule or the exact-kill total.
2. **A card has two values; tokens touch each independently.**
   - **SPEND value** — when you *play* the card (damage dealt + suit-lever size).
   - **HOLD value** — when you *discard* it to soak a counterattack (defense).
   Today they're the same number. Splitting them is what creates the core decision
   — *"this card hits like an 8 but soaks like a 2 — fire it, or hold it as armor?"*
   **SPEND / HOLD is the spine of the value tokens.**

### The catalog

Power: ★ common/minor · ★★ solid · ★★★ build-shaping/scarce · ★★★★ build-defining
(class-tree or capstone). Source: **F** = common Forge (the 1–2/chapter/card anyone
gets) · **C** = class-tree exclusive · **S** = spell/Shrine-applied. Numbers are
first-pass/TBD.

**A. Value — SPEND side (offense)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Hone** | +1 spend value (damage & lever) | ★ | F |
| **Temper** | +2 spend value | ★★ | F |
| **Whetstone** | +1 spend, and on ♣ the double applies *after* (the scaling lane) | ★★★ | F |
| **Undercut** *(curse)* | −1 spend — lets you *undershoot* onto an exact kill | ★ | S |

**B. Value — HOLD side (defense)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Ballast** | discards as +1 value (a 2 soaks like a 3) | ★ | F |
| **Bulwark-weave** | discards as +2 | ★★ | F |
| **Brittle** *(curse)* | −1 hold value | ★ | S |

**C. Value — SPLIT tokens (the standouts — exploit the dual-value rule)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Glasswork** | +2 spend / −1 hold (glass cannon) | ★★ | F |
| **Deadweight** | +2 hold / −1 spend (turtle armor) | ★★ | F |
| **Duelist's Edge** | choose spend-boost *or* hold-boost each use | ★★★ | C |

**D. Suit / identity**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Graft ♦/♥/♠/♣** | *add* a second suit — fires two levers, qualifies for two class passives | ★★★ | F (scarce) |
| **Transmute** | *change* the suit (fix deck colour balance) | ★★★ | F |
| **Wildcard** | counts as any suit you declare on play | ★★★★ | C (gate) |

**E. Lever magnitude (these ARE the class axes — signatures stamp them free)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Plate** (♠) | +1 shield | ★★ | F |
| **Provision** (♦) | +1 to the overdraw select-pool | ★★ | F |
| **Mend** (♥) | recover +1 | ★★ | F |
| **Edge** (♣) | first ♣ this fight hits harder | ★★ | F |

**F. Sequencing / economy (keyword)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Scry** | on play, peek + reorder top 2 Tavern (the *future*, not a draw) | ★★ | F |
| **Mark** | while on Tavern top, +2 damage when drawn-and-played | ★★ | F |
| **Vault** | +1 hand cap this enemy when played | ★★ | F |
| **Bank** | this card's overflow draw is stored, not wasted | ★★★ | C |
| **Echo** | after play, returns to *top* of Tavern instead of discard (recursion) | ★★★★ | C (gate hard) |

**G. Triggers (on-kill / on-recruit)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Banner** | on a kill with this card, draw 1 | ★★ | C |
| **Bloodprice** | on an *exact* kill with this card, +1 token budget | ★★★ | C |
| **Tribute** | a card *recruited* by this kill enters already carrying a free token | ★★★ | C |

**H. Curses (spell-delivered, Shrine-cleansed)**
| Token | Effect | Pwr | Src |
|---|---|---|---|
| **Undercut / Brittle** | the −1s above | ★ | S |
| **Hex of Silence** | card fires *no* suit power — pure vanilla value | ★★★ (downside) | S |
| **Bound** | card can't join combos | ★★ (downside) | S |

### Curses are spells; the Shrine is the curse hub

Curses aren't forged on purpose — a **spell** stamps a card (`−1` / `Hex` / `Bound`)
and it **sticks**, creating the tension *"do I keep eating this curse on my best 5,
or pay to lift it?"* The **Shrine** offers two opposed services: **cleanse** one
curse, or **acquire the Curse spell** to weaponize it (Undercut for recruit
precision, dumping curses on cards the Exile will burn, etc.). This gives
**Gambler** (generates curses), **Exile** (burns them), and a future **Furnace**
(fuels off them) three distinct verbs over the same token.

> **Classes plug in via tokens** — the class system *is* token vocabulary. Full
> model in *Classes — level-1 selection & the tree*, below.

### Power budget & display

Keep the **F** rows mostly ★–★★ (they self-limit via overflow — a `+N` on a 6–10
♦ just wastes more against the cap), and reserve ★★★+ for **C** (tree) and
capstones. **Echo** and **Wildcard** warp the boss/suit math if mistuned —
Continent-2 / Kingdom-gated only.

**Display (on the card face):** value tokens `+N` **green** / `−N` **red** at top
(spend vs hold badge *TBD*); suit/graft token = added suit in **green in the
middle**; keyword tokens = badge *(styling TBD)*.

## Classes — level-1 selection & the tree (locked 2026-06-14)

**Pure-token, locked.** Every class starts from the **same 20-card deck**
(A–5 all suits). A class is nothing but **which tokens are pre-stamped on those
cards** — no global passive. Identity lives on the cards and **grows** as you forge
more of your signature.

**Selection UX (locked).** You pick a class by **seeing it**: the class-select
screen renders the 20-card starting deck and **highlights the cards each class
stamps** (and with what). Clicking a class = previewing its tokened deck. Intuitive,
honest, no text walls. *(Client: `ClassSelect` renders the stamped start.)*

**Stamp count = 3 (locked).** Three signature stamps at level 1. Exile is the lone
exception: it trades to a **leaner 18-card** start (drops 2♦ 2♥).

### Level-1 packages

The 4 **suited** classes own a **lever token** and stamp own-suit; the 5 **suitless**
own a **token-family** and spread across suits. **C-tokens are class-owned** — you
start with your signature and deepen it in your own tree; another class's C-tokens
are only reachable via a **meta unlock** (death/milestone), never mid-run.

| Class | Owns | Level-1 stamps | Opening feel |
|---|---|---|---|
| **Sentinel** ♠ | Plate | Plate on 3♠ 4♠ 5♠ | lead spades, bank shield, soak counters — immovable |
| **Quartermaster** ♦ | Provision | Provision on 3♦ 4♦ 5♦ | diamonds overdraw a fat select-pool — always the right card |
| **Surgeon** ♥ | Mend | Mend on 3♥ 4♥ 5♥ | hearts recover extra — the deck never thins, you outlast |
| **Executioner** ♣ | Edge + precision | Edge on 4♣ 5♣ · Undercut (−1) on 2♣ | big clubs; the cursed 2♣ is your scalpel for exact kills → recruit |
| **Commander** | Banner | Banner on 3♦ 4♠ 5♣ | every kill draws you forward — snowball tempo |
| **Warden** | Bulwark-weave (hold) | on 2♠ 2♥ 3♣ | discard trivial cards to eat lethal counters — the wall |
| **Gambler** | Glasswork / Wager (split) | Glasswork on 5♦ 5♣ · Wager on 4♥ | monstrous spend, fragile hold — high variance |
| **Exile** | Brand / Transmute | leaner (18); Brand on 5♠ 5♣ | a sharper, thinner deck from turn one |
| **Oracle** | Scry / Mark | Scry on 2♦ 3♦ · Mark on 4♠ | peek + arrange the Tavern future — no bad luck |

> **Design scope (locked):** the **first 4 (suited)** classes are the **active
> design** for first playtest. Classes 5–9 are **parked — locked as drafted above,
> not further tinkered** until they get a dedicated design pass.

### The tree (in-run cadence locked; node detail co-designed next)

- **In a run = one branch, deepen only.** Your tree starts with a **single branch**
  available — you specialize *further into your signature* (the "tank goes further
  tank"). **No cross-class / hybrid builds in a run.**
- **One very-strong stamp per chapter.** Each chapter you may forge **one unique,
  VERY strong (★★★★) class ability onto a single card** (the tree pull). This runs
  *alongside* the common Forge budget (the **F** tokens, 1–2/card/chapter) — two
  streams: broad common tuning + one capstone class stamp per chapter.
- **Diversification is a meta unlock.** Branching the tree (specialize-vs-diversify),
  unlocking **new classes**, and **cross-class** access open only on **death or a
  milestone** — never mid-run. This is the "death banks options, not power" layer.
- *Still to co-design:* node count/shape per class, what each ★★★★ pull is, and
  Camp-vs-Kingdom gating of the meta unlocks.

### Knock-on revamps (flagged, not yet designed)

- **Relics — revamp pending.** New role = **passive additional abilities** (riders),
  not axis-owners. Current `content.ts` relics are stale axis-owner text. **Death
  expands the relic pool** (meta breadth). Needs a dedicated pass.
- **Spells — revamp pending.** Kept as thin held burst + the **curse-delivery**
  vector (Shrine). Current list needs a pass too.

## Exile budget

A capped trim to **refine, not transform** — ~**10 card-equivalents** per run
*(flat vs value-weighted: TBD)*. Reuses `exiledCards` / `exileBurden` /
`applyExileAtCamp` / the `exile_pick` choice.

## Canon reconciliations

- **Curation removed.** `CURATION_CUT` + the curation block in `setupChapterDeck`
  (`encounter.ts:97-112`) are superseded by the small start; cut them.
- **Anti-inflation preserved.** Growth is hard-capped by the 40-card roster;
  additions flow through the persistent `c.deck`. No per-encounter rebuilds.
- **Determinism.** All draft gen, enemy gen, and token grants go through
  `rng.ts` / `c.rngState` — never `Math.random()`.
- **Reward infra reused.** Drafts are `PendingChoice` choices (`kind:'draft_pick'`),
  **solo per-hero** (`forPlayerId`-scoped) — they bypass the `rewardDraw` casino
  tie-break (solo-first canon).
- **Overrides campaign-bible v0 scope.** `campaign/campaign-bible.md` scopes v0
  to chapters 1–2 and defers "Chapter 3+/ascension." The continent model (ch1–6)
  **consciously overrides this**, same precedent as the two-relic-slot override.
- **Base game is a hard boundary (audit 2026-06-14).** Do NOT add `'draw_select'`
  to `server/types.ts TurnPhase` — retype `EncounterState.turnPhase` to a
  campaign-local union instead. Do NOT change `deck.ts enemyStats` /
  `buildPlayerDeck` (used by `game.ts`); add a separate `numberEnemyStats()`.
  `enemyStats` returns NaN on a number rank today → guard every number-rank
  stat/kill site with `PLAYER_RANKS.includes(...)`.
- **Save backward-compat.** New `CampaignState` fields (`ownedCards`,
  `tokenBudget`, `cardTokens`) are **optional + `?? default`-guarded** on load
  (mirror `telemetry?`). `continent` is **computed** (`Math.ceil(chapter/3)`),
  not stored. `chapter` widens `1|2 → number`.
- **One master flag.** `EXPERIMENTS.ascendingDeck` (default false, like
  `provinceMode`) gates the whole mode; `smoke.ts` pins it false for canon
  tests. **Test/sim `drive()` loops MUST gain `draw_select` + `draft_pick`
  handlers before the flag goes live, or they spin to budget-exhaustion.**
- **Map rebuild per chapter.** `applyContinueChapter` must call `buildMap` at
  each chapter transition (it doesn't today); the chapter counter increments
  before the build.

## Implementation plan (workstreams)

> **Building this?** The turnkey, sequenced steps with files, protected boundaries,
> starting numbers, and per-step acceptance criteria live in
> [`ascending-deck-build-plan.md`](ascending-deck-build-plan.md). The workstreams
> below are the high-level map.

Critical path: **WS0 → WS1 ∥ (WS2+WS3) → WS5 → WS4 → WS6**, with WS7 alongside.
After WS3 the recruit/backfill loop is playable before tokens land.

- **WS0 — flag + data model + protected boundary.** `EXPERIMENTS.ascendingDeck`
  (master, default false). Widen `chapter` `1|2→number`; `continent` computed
  `Math.ceil(chapter/3)`. Add optional+guarded `ownedCards?`, `tokenBudget?`,
  `cardTokens?`. Retype `EncounterState.turnPhase` to a campaign-local union
  (+`'draw_select'`) without touching base `TurnPhase`. New `Token`/`DraftOption`
  types; `numberEnemyStats()` in `deck.ts` (base `enemyStats` untouched).
- **WS-CLASS — class axis-owners.** Replace the disabled-in-province class powers
  with one permanent axis passive per class + starting-deck lean + pool gating.
  `content.ts` (class defs), `encounter.ts` (passive hook), `setupChapterDeck`
  (lean).
- **WS1 — overdraw-and-select (most engine-invasive).** Play resolution must
  *pause* for a keep-selection → `turnPhase:'draw_select'`,
  `EncounterState.drawPool`, `keep_drawn` action + dispatcher + client UI.
- **WS2 — number-enemies + recruit.** `deck.ts` number stats; `buildEnemyStack`
  number branch; soften road-banish; `maps.ts` Continent-1 recruit nodes.
- **WS3 — start-small deck + backfill ladder.** Rewrite `setupChapterDeck`
  (supersede curation); `backfillAct(c)` at chapter checkpoints → adds vanilla
  cards + converts owned-redundancy → `tokenBudget`.
- **WS4 — token economy / Forge (largest).** `content.ts` token defs (two
  markets); real `forge` node + `apply_token` action + camp budget UI; token
  effect hooks in play resolution; card-face rendering (green/red value, green
  middle suit).
- **WS5 — drafts.** `PendingChoice.kind:'draft_pick'`; offer gen enforcing the
  draft offer rule; pools in `content.ts`.
- **WS6 — exile budget cap.** Extend existing exile machinery with the cap.
- **WS7 — sim / telemetry / tests.** Extend `RunTelemetry` (token count,
  deck-size curve, draft picks); teach `scripts/sim*.ts` the loop; `smoke.ts`
  coverage for the new flag. **Then re-tune the gates** for a tokened arrival
  (the province was balanced for a curated, untokened deck).

## Still to spec (open)

- Starting deck: **proposed A–5, all suits = 20 cards** (keeps the Hearts→Diamond
  pipeline + the 2–5 combo tier) — tune the death-spiral floor.
- **Class level-1 signature — LOCKED** (pure-token, 3 stamps, same-20-cards,
  select-by-cards UX; see *Classes* above). First 4 suited classes active; 5–9
  parked. **Next to co-design: the tree** — per-class node count/shape, each ★★★★
  pull, and Camp-vs-Kingdom gating of the meta unlocks (diversification, new-class,
  cross-class).
- **Relic revamp** — passive-rider role + death-expands-pool; current `content.ts`
  relics are stale axis-owner text. Not yet designed.
- **Spell revamp** — thin held burst + curse-delivery; current list needs a pass.
- Backfill cadence vs chapter length; token-budget math (exact-kills per chapter
  → tokens → curve vs gate difficulty).
- Token catalog is **drafted** (see *Tokens* above); still to pin: exact magnitudes,
  budget costs per token, and combo-tier vs solo-tier pricing.
- Number-enemy stat line (HP/ATK by value).
- Exile cap: flat count vs value-weighted.
- What an exact-kill grants beyond tempo when the card is *new* (suit choice?
  small token?) vs the backfill-redundancy token path.
- Continent 2 chapter count / map variants; cross-continent transition UX.

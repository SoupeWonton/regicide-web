---
kind: research
edition: v3
status: active-assessment
last_reviewed: 2026-06-20
baseline_manifest: docs/canon/README.md
---

# Canonical drift and change blast radius

This document answers: **if a canonical feature changes, how much of the game must
be reconsidered?** It is an impact map, not a source of canon. The effective rules
remain those listed in [`../../canon/README.md`](../../canon/README.md).

The inventory covers every normative feature currently present in that manifest.
Closely coupled sentences are grouped when changing one cannot sensibly leave the
other untouched.

## Rating scale

| Rating | Meaning | Expected response |
|---|---|---|
| **1 — Local** | Copy, tuning, or one isolated content entry | Edit locally; focused test |
| **2 — Subsystem** | One mechanic and its immediate UI/content | Update its spec, implementation, and focused tests |
| **3 — Cross-system** | Several mechanics or content families | Decision record, compatibility audit, broad regression tests |
| **4 — Architectural** | State model, progression, economy, or most encounters | Migration plan, save/protocol review, simulation and playtest reset |
| **5 — Foundational** | Product identity or the logic other systems are built around | New design decision; re-audit the entire canon and alpha scope |

The rating is the highest likely impact across five dimensions:

- **Design:** dependent rules and balance assumptions.
- **Engine:** state, actions, encounter resolution, maps, and content.
- **Experience:** UI, tutorial, terminology, card presentation, and feedback.
- **Persistence:** saves, client projection, protocol, and migration.
- **Evidence:** smoke tests, simulator strategy, telemetry, and prior playtest validity.

## Known drift before any new change

The manifest now contains the accepted replacement-graft correction. The developed
build remains behind it:

| Drift | Developed build | Accepted canon | Radius |
|---|---|---|---|
| **Rank graft** | Add a flat `+1` value | Replace a hand card's rank with the defeated enemy's rank | **5** |
| **Suit graft** | Add the defeated suit alongside existing suits | Replace a hand card's suit with the defeated enemy's suit | **5** |
| **Backfill** | May preserve campaign pacing | No backfill; cards are earned only through exact kills | **4** |
| **Campaign shape** | Older chapter/Province arc | Five continuous acts: Claim, Shape, Exploit, Adapt, Master | **5** |

The graft rows are an accepted correction; the other rows remain active design
conversation. Together these areas affect card identity, effective
rank/suit calculation, combo legality, suit powers, immunity, recruitment pacing,
campaign balance, UI representation, saves, smoke tests, simulator policy, and the
tutorial. They should be reconciled through an accepted decision before more canon
is built on the old wording.

## Product-principle inventory

Principle changes rarely require a direct engine migration, but their **design blast
radius is enormous** because they change the standard used to accept every feature.

| ID | Canonical feature | Radius | What must be re-audited if changed |
|---|---|---:|---|
| GR-1 | Core combat must be fun without progression | **5** | Entire progression strategy, first-fight design, alpha bar |
| GR-2 | Every run starts with a meaningful choice | **4** | Class selection, starting hands, seed/start flow, tutorial |
| GR-3 | Power requires tradeoffs | **5** | Grafts, relics, class loopholes, offers, recovery and rewards |
| GR-4 | Builds are discovered rather than predetermined | **5** | Starting identity, reward cadence, route choices, graft targeting |
| GR-5 | Every run creates a memorable story | **4** | Comeback design, telemetry, presentation, relic and landmark content |
| GR-6 | Synergies exist at minor, major, and hidden scales | **4** | Graft interactions, class/relic overlap, content pool size |
| GR-7 | Prefer mechanical changes over numerical changes | **4** | Encounter modifiers, relic catalog, difficulty tuning philosophy |
| GR-8 | Finished runs diverge meaningfully | **5** | Recruitment variance, classes, routes, grafts and replayability |
| GR-9 | Rewards continually create decisions | **4** | Every offer table, landmark reward, graft and relic acquisition |
| GR-10 | Repetition produces discovery | **5** | Campaign variation, hidden interactions, long-term content strategy |
| GR-11 | Cards gain power through context | **5** | Card/graft model, class identity, relic role and encounter pressure |
| EL-1 | Favor planning depth over instant arithmetic width | **5** | Every new mechanic and all combat UI |
| EL-2 | Loop stations compete through one shared resource: cards | **5** | Economy, spells, relic activations, currencies and action structure |
| EL-3 | New features modify an existing loop station | **5** | Feature acceptance, class loopholes, landmarks and items |
| EL-4 | Mastery should reveal deeper chains, not automate arithmetic | **4** | Preview UX, encounter complexity, graft and suit-power resolution |

## Content-governance inventory

| ID | Canonical feature | Radius | What must be re-audited if changed |
|---|---|---:|---|
| CB-1 | Content must change a decision | **4** | Whole encounter, landmark, relic and reward catalogs |
| CB-2 | Content must be immediately attributable and visible | **4** | Combat log, previews, animations, card faces and tutorial |
| CB-3 | Content remains relevant at meaningful gates | **3** | Boss tests, late-act scaling, class/relic usefulness |
| CB-4 | Each item owns one legible rule bend with a cost | **4** | Relic role, rarity, catalog and item UI |
| CB-5 | Offers present incomparable shapes, not a numerical autopick | **3** | Reward generation, route context and offer presentation |
| CB-6 | Each landmark has one verb and creates a route tradeoff | **4** | Map taxonomy, node handlers, rewards and road UI |
| CB-7 | Landmark rewards affect the deck/loop, not a new wallet | **4** | Forge, currencies, item stops and campaign state |
| CB-8 | Fight rules are visible before punishment | **4** | Encounter generation, preview UI, hidden modifiers and tutorial |
| CB-9 | Fight rules test plans without invalidating a class | **4** | Five-act pressures, immunities, bosses and class balance |
| CB-10 | Simulation finds floors; playtesting judges legibility and fun | **3** | Balance workflow, telemetry, release gates and interpretation of data |

## V3 vision and protected constraints

| ID | Canonical feature | Radius | Primary dependencies |
|---|---|---:|---|
| V3-1 | “You don't build a deck—you conquer one” | **5** | Recruitment, rewards, campaign fantasy, marketing, tutorial |
| V3-2 | Permanent cards come from the starting court or defeated enemies | **5** | Deck construction, rewards, drafting, backfill, saves |
| V3-3 | Exact kills deepen owned cards through permanent grafts | **5** | Kill resolution, card state, UI, balance, telemetry |
| V3-4 | Progression avoids parallel currencies and inventories | **5** | Fragments, spells, Forge, relics, landmarks and menus |
| CN-1 | **Superseded 2026-06-20:** NO-EXILE formerly prohibited permanent deck shrinkage | **5** | Permanent removal is now an open design axis; see the accepted 2026-06-20 decision |
| CN-2 | Progression stays inside recognizable standard-card vocabulary | **5** | Rank/suit grafts, card face, deck cap, royal handling |
| CN-3 | Deck growth and grafts are the primary progression engine | **5** | Classes, relics, landmarks, rewards and meta progression |
| CN-4 | No secondary wallet; redundant kills resolve immediately | **4** | Fragment fields/actions/UI, shop flow, reward timing |
| CN-5 | Quick-game Regicide remains isolated from campaign rules | **5** | Shared types, `deck.ts`, `game.ts`, client components and regression tests |
| CN-6 | Campaign randomness is seeded and serialized | **4** | Every shuffle/offer/map roll, replayability, saves and debugging |
| CN-7 | Expedition deck persists between road fights | **5** | Encounter start/end, rests, Hearts, death spiral, saves, UI continuity |
| CN-8 | Only explicit rests reshuffle/redraw the expedition deck | **4** | Camp actions, empty-Tavern rules, recovery balance and tutorial |

## Combat and card progression inventory

| ID | Canonical feature | Radius | Primary dependencies |
|---|---|---:|---|
| LP-1 | Combat stations are draw → combine → kill → block → persist | **5** | Turn flow, class identity, tutorial, telemetry and content taxonomy |
| LP-2 | Each station is understandable without a new simultaneous subsystem | **5** | UI density, spells, relic chains, tokens and class abilities |
| RK-1 | Exact-kill an unowned enemy to recruit it | **5** | Enemy identity, ownership, deck insertion, reward UI, simulation |
| RK-2 | Exact-kill an owned enemy to modify a card in hand | **5** | Pending phase, target validation, card identity, saves and client protocol |
| RK-3 | The exact-kill reward resolves immediately | **4** | Encounter end sequencing, target availability, disconnect/reconnect handling |
| RK-4 | Non-exact kills provide no permanent conquest reward | **4** | Difficulty snowball, player messaging, route balance and analytics |
| AC-1 | Ace is a low-rank starting companion | **4** | Starting deck, tutorial, recruitment bands and card display |
| AC-2 | One Ace may accompany another rank and contributes `+1` | **4** | Combo validation, damage preview, bots and quick-game boundary |
| DG-1 | Recruiting widens while redundant kills deepen | **5** | Entire power curve, encounter frequency and deck-size balance |
| DG-2 | Graft targets are restricted to cards currently in hand | **4** | Pending state, draw manipulation, UI, validation and reconnect behavior |
| DG-3 | Rank graft replaces the target's rank with the defeated rank | **5** | Effective rank, damage, blocking, suit power magnitude, combos, identity, saves and UI |
| DG-4 | Suit graft replaces the target's suit with the defeated suit | **5** | Effective suit, suit powers, immunity, identity, saves and UI; no dual-suit resolution |
| DG-5 | No fragment currency or graduation shop | **4** | State/schema cleanup, actions, UI, landmarks, simulator and tests |
| DG-6 | Forge rearranges existing grafts and does not mint power | **4** | Landmark identity, card-token movement, UI and targeting rules |
| DG-7 | Backfill may exist only as pacing, not as a draft economy | **4** | **Known drift:** no-backfill changes act balance and failure recovery |

## Campaign-structure inventory

| ID | Canonical feature | Radius | Primary dependencies |
|---|---|---:|---|
| CP-1 | Campaign begins with two acquisition acts | **5** | Maps, rank bands, bosses, run length, tutorial, telemetry |
| CP-2 | Low ranks precede high ranks | **4** | Enemy stats, deck curve, exact-kill difficulty and act identity |
| CP-3 | Number enemies are the primary deck-growth targets | **4** | Encounter pools, royal rules, ownership and rewards |
| CP-4 | Royals are gate bosses and not ordinary recruits | **4** | Deck ceiling, boss rewards, endgame fantasy and card pool |
| CP-5 | Post-acquisition play pressures the conquered deck/class combination | **5** | Later acts, class progression, encounter design and balance |
| CP-6 | Death ends the expedition and the next run starts at Act 1 | **5** | Failure flow, saves, meta progression, pacing and retention |
| CP-7 | Later acts are not player-selectable starts; direct entry is internal fixture infrastructure | **4** | Debug actions, test data, UI boundaries and progression |
| CP-8 | Acts target about one hour; a successful run targets four to five hours across sessions | **5** | Encounter counts, save/resume, act recaps, pacing and playtests |
| CP-9 | First victory targets 15–25 cumulative hours; mastery may extend toward 200 hours | **4** | Difficulty curve, content breadth, permutations and retention telemetry |
| CP-10 | Death/milestones unlock breadth rather than required permanent stat power | **5** | Classes, relic pools, routes, shortcuts, meta saves and economy |
| CP-11 | Road details and encounter counts are delivery decisions | **2** | Maps, pacing, content volume and playtest plan |

## Character-identity inventory

| ID | Canonical feature | Radius | Primary dependencies |
|---|---|---:|---|
| CL-1 | Class identity = starting hand + one innate loop loophole | **5** | Starting deck, selection UI, combat hooks, tutorial and balance |
| CL-2 | The loophole deepens through the campaign | **5** | Chapter transitions, save schema, UI and class content |
| CL-3 | Class progression has no separate points or relic-slot tree | **4** | Economy, Lair/landmarks, relic role and progression UI |
| CL-4 | Initial roster contains four sharply separated roles | **4** | Lobby/class select, portraits, content support and test matrix |
| CL-5 | Sentinel owns block/defense | **3** | Block hooks, starting hand, encounters and tutorial examples |
| CL-6 | Executioner owns kill/aggression | **3** | Exact-kill hooks, tempo balance and recruitment economy |
| CL-7 | Quartermaster owns combine/tempo | **3** | Combo rules, hand limits, draw and UI |
| CL-8 | Surgeon owns persist/recovery | **3** | Hearts, discard/Tavern flow, attrition and boss balance |
| CL-9 | Exact class numbers and tier effects are not yet canon | **2** | Proposal promotion process; prevents implementation assumptions |
| CL-10 | Five former V2 classes are future unlock runway | **3** | Meta progression, roster UI, save compatibility and content planning |

## Item inventory

| ID | Canonical feature | Radius | Primary dependencies |
|---|---|---:|---|
| IT-1 | Relics are very rare, slotless exceptions | **4** | Hero state, acquisition, UI, pools, content and save migration |
| IT-2 | Relics do not provide class identity/progression | **4** | Class architecture, relic catalog and synergy expectations |
| IT-3 | Keep-or-sacrifice relic decisions occur rarely | **3** | Offer cadence, pending choices, road rewards and run variance |
| IT-4 | Standalone spell inventory and currency are removed | **4** | State/actions/UI/content/simulator cleanup and save compatibility |
| IT-5 | Burst effects belong on cards or existing combat actions | **4** | Card vocabulary, relic boundaries, class actions and UX; replacement grafts remain rank/suit only |
| IT-6 | Exact relic content is intentionally unspecified | **2** | Content can iterate without rewriting structural canon |

## Highest-risk dependency clusters

Some changes combine rather than add. These are the clusters most likely to produce
unnoticed canonical drift.

### A. Card identity cluster — radius 5

`RK-1/RK-2 + DG-1..DG-4 + CN-2 + GR-11`

Changing rank or suit graft semantics affects damage, blocking, Hearts recovery,
Diamonds draw, Clubs damage, Spades shielding, combo legality, immunities, exact-kill
precision, card rendering, deck serialization, simulator strategy, and tutorial copy.

Primary code surfaces:

- `server/campaign/types.ts`, `encounter.ts`, `tokens.ts`, `campaign.ts`
- `client/src/types.ts`, `components/campaign/cards.ts`, `EncounterBoard.vue`
- `server/scripts/smoke.ts`, `sim.ts`, telemetry and trace rendering

### B. Recruitment-without-backfill cluster — radius 5

`RK-1/RK-4 + DG-7 + CP-1..CP-5 + GR-3/GR-8`

Removing backfill makes exact-kill performance control future deck strength. The main
risk is a positive-feedback spiral: players who struggle recruit less and therefore
face later pressures with fewer tools. Every act must remain beatable below the
expected recruitment rate, or the run becomes lost before the UI admits it.

Primary code surfaces:

- `server/campaign/campaign.ts` (`backfillAct`, chapter continuation, owned cards)
- maps, rank-band content, deck setup and campaign saves
- smoke Test C and full-arc tests; simulator recruitment-economy reports

### C. Five-pressure-act cluster — radius 5

`CP-1..CP-6 + CB-8/CB-9 + GR-5/GR-8/GR-10`

A five-act rule changes map count, run duration, boss cadence, rank acquisition,
class deepening, relic cadence, difficulty curve, tutorial promises, telemetry
segments, save progress, and what constitutes a complete alpha run.

The safer golden rule is not merely “five acts,” but:

> **Five acts, five pressures, one deck. Each act forces the player to reinterpret
> the deck without adding a parallel subsystem or invalidating a character.**

### D. Character-identity cluster — radius 5

`CL-1..CL-10 + LP-1 + GR-2/GR-4/GR-8`

Changing the class vehicle affects starting decks, lobby selection, combat hooks,
act progression, balance matrices, portraits/text, tutorial, saves, and whether
grafts or relics remain the primary source of run discovery.

### E. Power-vehicle cluster — radius 5

`CN-3/CN-4 + DG-5/DG-6 + IT-1..IT-5 + EL-1..EL-3`

Adding spells, currencies, token budgets, or frequent relic management does not stay
inside “items.” It changes the width budget and competes with cards, grafts, and
classes for both power and UI attention.

## Change protocol by radius

### Radius 1–2

1. Edit the owning canon page.
2. Update focused implementation/tests if applicable.
3. Run `npm run docs:check` and the focused test.

### Radius 3

1. Create or update a decision record.
2. Search the full canon for dependent claims.
3. Update delivery status and the affected subsystem tests.
4. Re-run representative simulation/playtest cases.

### Radius 4

1. Write an explicit migration section: old → new, state impact, UI impact.
2. Audit `CampaignState`, `CampaignAction`, client projections, saves and reconnects.
3. Update smoke, simulator policy, telemetry, tutorial and affected content.
4. Mark old playtest/balance evidence as pre-change.

### Radius 5

1. Record an accepted design decision before implementation.
2. Re-read every page in the canon manifest and update all contradictions together.
3. Define an alpha slice and protected boundaries.
4. Plan save compatibility or deliberately invalidate pre-alpha saves.
5. Rebaseline smoke tests, simulation, telemetry and human feedback.
6. Do not tune balance across the boundary; old balance evidence is no longer comparable.

## Practical use

Before changing a feature:

1. Find its ID in this document.
2. Inspect its dependency cluster, not only its individual row.
3. Search code and docs for both its current terminology and retired names.
4. Update canon, decision, delivery status, UI language and tests in the same change.
5. Record which earlier feedback is no longer valid after the change.

This assessment should be revised whenever the canon manifest changes. A feature
entering or leaving canon without a corresponding row here is itself a drift signal.

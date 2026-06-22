# Regicide-web simulation harness — datasets & findings

Context file for humans and LLMs. Everything below was generated on the
`balance-testing` branch on 2026-06-10. If you are a model reading this: the
goal of this project is to balance (a) base Regicide as implemented in
`server/game.ts` and (b) the roguelite campaign mode in `server/campaign/`.
Use the CSVs in this folder as evidence; treat absolute win rates as a floor
(bots are decent but sub-human) and relative comparisons as the real signal.

## What the harness is

Two simulators drive the real game engines (no mocked rules) with weighted
bot "personas" — identical decision logic, different value weights:

| persona | values | key weights |
|---|---|---|
| slayer  | max damage, greedy routes, never retreats | aggression 1.6, riskAversion 0.6 |
| bulwark | shields, safety, retreats early | shieldWeight 1.6, riskAversion 1.8 |
| hoarder | card economy: draws, recovery, minimal-waste discards | drawWeight 1.5, recoverWeight 1.3, conserve 0.7 |
| sniper  | exact kills, tempo, conserves cards | exactBonus 9, killBonus 9 |
| steady  | control group, all weights ~1.0 | — |
| mixed   | one of each (slayer+bulwark+hoarder+sniper, first N) | — |

Full weight tables: `server/scripts/sim-personas.ts`. Weights feed a scoring
function over every legal play (combos enumerated exhaustively), discard
subset choice, route choice (campaign), reward/class picks, spell timing and
death votes. Decision tie-breaks are seeded; the campaign engine itself is
fully seeded/deterministic, the base engine shuffles with Math.random.

Run commands (from `server/`):

```
npx tsx scripts/sim.ts --seeds 50                      # campaign, all counts × lineups
npx tsx scripts/sim-base.ts --runs 50                  # base game, official rules
npx tsx scripts/sim-base.ts --runs 50 --classes        # base game + tier-1 classes
npx tsx scripts/sim-base.ts --runs 100 --loo           # 3p leave-one-out class experiment
```

## Engine changes made for/by this work (all on balance-testing)

1. **Rules bug fix — `game.ts` `drawCards`**: the base game auto-reshuffled the
   discard into the tavern when drawing from an empty tavern. Official
   Regicide never does this (Hearts are the only refill). Fixed. Measured
   impact: the bug roughly DOUBLED base-game win rates (29 vs 15 wins /1150
   in back-to-back samples). Anyone who playtested quick games before this
   fix was playing on easy mode.
2. **Opt-in class layer — `game.ts` + `types.ts`**: `createGame(players,
   classIds?)` adds the four campaign tier-1 core abilities to the quick game
   (Sentinel +2 first Spade/enemy; Quartermaster +1 first Diamond draw/enemy,
   team-wide; Surgeon +1 first Heart recovery/enemy, team-wide; Executioner
   +2 finisher at 1-2 HP once/enemy, team-wide — same B2/B3 semantics as the
   campaign). Quick game is unchanged when classIds is not passed.
3. **Engine bug found, NOT fixed — base-game stalemate**: if the enemy is
   fully shielded and all hands are empty, every player yields forever; the
   game cannot end. Official rules forbid all players yielding consecutively;
   `game.ts` does not implement that rule. ~0.5-1% of bot games soft-lock
   this way (counted as `stalled` in the data; morally losses).

## Datasets in this folder

All CSVs share flat schemas with headers; `summary.json` per folder holds the
pre-aggregated tables.

### campaign-1150/ — campaign mode, 50 seeds × counts 1-4 × 6 lineups
`runs.csv`: one row per campaign — result, chapterReached, deaths, retreats,
funnel flags (reachedBoss1/beatCh1/reachedBoss2), exactKills, itemsGained,
lossNodeKind/lossModifier, deathsByPersona (`id:n|id:n`).
`encounters.csv`: one row per fight — chapter, nodeKind, tier, modifier,
bossModifier, attempt #, turns, deaths, outcome, defeated/totalEnemies.

Findings:
- Ch1 boss wipes ~88% of parties that reach it (12.4% win); 868 of 1011
  campaign losses happen at a castle. Road content wins at 55-96% by tier.
  Ch2 boss identical (12%). The castle is ~7× deadlier than any road fight.
- Funnel (reached ch1 boss → beat ch1 → won): hoarder 91.5%→18%→3.5%,
  slayer 76.5%→3.5%→0.5%. Card economy is ~5× aggression on ch1 clears.
- Player counts: solo 0% (boss is win-or-wipe), 2p 0.3%, 3p 2.0%, 4p 1.3%.
- Modifier spread: banner-of-knives is an outlier (49% won, 0.82 deaths per
  fight); bottom six (fog-marker, dry-cart, bleeder-patrol, hooked-blades,
  cracked-buckler, wrong-relay) are nearly free (93-96% won, ~0.07 deaths).
- Ch2 boss modifiers: starving-court 6.7% won vs cruel 14.3% / iron 17.2% —
  confirms prediction E5 in MECHANIC-AND-BALANCE-ISSUES.txt.
- In mixed parties, deaths by slot: slayer 213, bulwark 193, hoarder 130,
  sniper 65 (150 runs).

### base-noclasses-1150/ — base game, official rules, 50 runs × counts × lineups
`games.csv`: one row per game — result, defeated (0-12), lostAtRank (J/Q/K),
lostByClass/lostByPersona (player whose turn the loss happened on), turns,
exactKills, jesters, yields, classes, omitted (blank here).

Findings (pooled with a second 1150 sample where noted):
- Win rates: 1p 0%, 2p 0.7-1.7%, 3p 2.3%, 4p 0.3-1.0%. Avg royals defeated
  ~3.1 (1p) / ~5.5-6.0 (2-4p) of 12.
- The Queens are the wall: ~62% of losses happen 4-7 royals in; the J→Q
  attack jump (10→15) is the spike, not the Kings.
- Solo is unplayable as wired: engine deals 8 cards + 0 jesters at 1p, but
  official solo rules grant 2 jesters as lives. Structural, not bot weakness.

### base-classes-1150/ — same matrix with tier-1 classes (persona-picked)
Findings:
- Classes roughly double base-game wins (pooled fixed-rules samples:
  25/2300 → 48/2300). The committed sample: 1p 0%, 2p 1.7%, 3p 6.3%, 4p 1.3%.
- The benefit concentrates at 3p; 4p (5-card hands) stays fragile and 1p
  can't be saved by one class.
- Executioner's finisher converts near-misses into exact kills (exact
  kills/game ~2 → ~3); exact-killed royals (J=10/Q=15/K=20 value) re-enter
  the tavern as bomb cards.

### base-loo3p-2400/ — 3p leave-one-out class experiment, 100 runs × 4 subsets × 6 lineups
Class sets forced explicitly (decoupled from persona pick order); the omitted
class is the experiment variable, lineups pooled to control for persona.

Findings:
- Win rate by omitted class: without quartermaster 2.7%; without sentinel
  4.5%; without surgeon 4.2%; without executioner 4.5%.
  → No class is harmful. Quartermaster is the most load-bearing (losing it
  costs ~40% of wins, directional at n=600/cell, z≈1.6). The other three are
  roughly interchangeable in win-rate terms.
- "Who holds the bag" (loss happens on whose turn): sentinel 28.7% of its
  games, quartermaster 31.5%, executioner 31.9%, surgeon 35.1% (baseline 33%
  at 3p). Sentinel's own shields protect its turns; surgeon turns are the
  deadliest.
- Exact kills collapse without executioner (3.3-3.6 → 2.27/game) with NO
  win-rate cost — the exact-kill royal-bomb economy is fun but currently
  win-neutral in base rules.
- ANSWER to "does 3p>4p mean one class is bad?": no. Every 3-class subset at
  3p (2.7-4.5%) beats 4p with all four classes (~1%). The 3p advantage is
  structural (hand size 6 vs 5 against the same castle), not a class problem.

## Known limitations (read before trusting numbers)

- Bots don't model: saving the jester for specific royals, multi-turn team
  setups, intentional shield-stacking rotations, or hand-signal-style
  coordination. Humans should beat these numbers substantially.
- Base engine is Math.random-shuffled → samples of 50/cell have visible
  variance (±1-2pp on win rates). Campaign numbers are seed-deterministic.
- `stalled` results = the soft-lock engine bug above, not bot crashes.
- Campaign `error:*` results would indicate engine action rejections; there
  were none in the committed datasets.

## Suggested next experiments

- Ch1 boss tuning sweep: castle at 10 royals (3J/3Q/4K? or J/Q only), or a
  mid-castle checkpoint camp; target ~30-40% boss win for a decent party.
- Anti-stall rule + solo jesters in base engine, re-measure 1p.
- Per-class buff sweep on the three non-QM classes (e.g. Sentinel +3,
  Surgeon recovery 2, Executioner threshold 1-3 HP) at 3p/4p.
- 4p hand-size experiment: 6 cards at 4p (house rule) vs 5, measure the
  Queen-wall death rate.

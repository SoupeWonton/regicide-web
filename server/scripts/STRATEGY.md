# Bot Strategy — how the sim personas play, and why

**Scope:** `sim.ts` (campaign simulator). Personas/weights live in
`sim-personas.ts`. This file documents the decision model so the bot floor is
interpretable: when a sim number moves, you can tell whether the *game* moved
or the *bot* did. Update this file in the same commit as any bot-brain change.

**The bots are a floor, not a forecast.** Relative comparisons (persona A vs
B, item granted vs not, fork arm vs arm) are the trusted signal; absolute win
rates are not human win rates. Information value (peeks, intel, reorders) is
systematically underpriced by bots — treat info-item sim numbers as a floor.

---

## The rules the bot plays by

Condensed from `README.md` (base rules) + campaign canon (`CLAUDE.md`,
`Design/THE-BAR.md` shipped-canon section):

- **Combos:** single card · Ace + exactly one other · same-rank set totaling
  ≤ 10 · Jester alone.
- **Suit powers** on the played total: ♣ double damage · ♠ shield (reduces
  counterattack, accumulates per enemy) · ♥ recover discards into Tavern ·
  ♦ draw. **The enemy blocks its own suit** unless a Jester nullified it.
- **Counterattack:** survive by discarding ≥ net attack from hand; if the
  hand can't pay, the hero dies. **Dead is dead** — any province death is a
  full run reset.
- **Kill placement:** exactly 0 → royal recruits into the Tavern. Overkill on
  the **road** → royal **banished** forever; overkill at a **gate** → discard.
- **Gates** (Jacks/Queens/Kings fights): win-or-wipe, no retreat; each rank
  demands roughly a deck cycle (CT v2 measurement).
- Deck persists across road fights; only Camps reshuffle; an empty Tavern is
  refilled only by ♥ or a rest.

## Decision pipeline (per turn)

1. **Setup peeks:** reorder highest-first (draw the big cards sooner).
2. **Relic/spell window:** recovery relics when the Tavern is dry; Keen
   Edge/Crownbreaker only when they convert the best raw play into a kill
   (Crownbreaker reserved for Kings/gates unless spell-eager); draw spells on
   thin hands; shield spells against a ≥4 incoming hit; Gambler arms the wager
   only when a kill is predicted this turn.
3. **Play selection:** every legal play set + Jester + yield is scored
   (below); highest score wins.
4. **Discard checks:** minimal-waste subset that protects the persona's
   preferred suits and never burns a Jester if avoidable.
5. **Routes:** persona-weighted (greed/fight/safety × fatigue); camps gain
   value as hands thin.

## Play scoring model (evalPlay)

Each term is tied to a rule, not a vibe:

| Term | Rule it respects |
|---|---|
| `aggression × min(damage, hp+4)` | damage past lethal is waste |
| `killBonus` (+3 Commander) | a kill skips the counterattack; Press the Advantage draws |
| `exactBonus` + rank bonus | exact kill = recruit (Tavern), rank scales the prize |
| **`banishAversion × royal value`** on road overkill | road overkill destroys the royal forever |
| **`setupWeight` bonus** when the remaining hand can hit the leftover HP exactly (Clubs ×2 and the Executioner 2→0 finisher modeled) | engineering next turn's exact kill |
| shield × (fight-remaining + enemy-attack scaling) | shields are per-enemy; worth most vs hard hitters with fights left |
| draws × (fatigue + **siege bump**) | draws are the proven gate lever (CT v2) |
| recovery × (tavern-dryness + small siege bump) | ♥ is the only mid-fight refill; feeds future draws |
| **immune-suit waste penalty** | a blocked card burns its power — hold it for the next royal |
| **solvency margin penalty** | soft slope before the hard you-can't-pay death cliff |
| `conserve × base` (halved at gates) | hoarding is good on the road, fatal in a race |
| `riskAversion × net counter` / death cliff −(200·RA+120) | counterattacks are the loss condition |

**Siege mode** (gate fights): aggression ×1.35, conserve ×0.5, draw bump
+0.5, yield penalty −4. Rationale: no retreat exists, so value-banking has no
future to bank for — race the royals.

**Boss-play discipline** (the gate is where the floor was least reliable —
723/~ wipes happen here):
- **Burst hoarding.** Damage nukes (Keen Edge ×2, Crownbreaker ×3) fire only on
  worthy targets (gate royal, or a road Q/K) and only when the multiplier is
  what lands the kill — never to overkill a raw-lethal target, and Crownbreaker
  only when a double wouldn't suffice. Keeps the burst intact for the climax
  instead of spending it on a road Jack.
- **Gate exact = fuel.** The exact-kill setup bonus applies at gates (0.4× the
  road weight): a gate exact recruits the royal to the Tavern, redrawn as
  in-fight fuel. Weighted below road exacts because a gate overkill only
  discards (recoverable) whereas a road overkill banishes (permanent).
- **Jester = refresh.** The solo Jester's score gains the avoided royal
  counterattack at gates — it's a free deck cycle plus a skipped 10–20 hit.

**Live class kits modeled** (kept in sync with `content.ts` — stale models
poison every measurement): Sentinel all-Spade Commit +3 (mixed = nothing),
Oracle Marked-card +2/+3 as real damage (shifts exact math), Executioner 1–2
finisher (+2; recruits only when the math lands at 0), QM/Surgeon owner-only
first-trigger bonuses, Commander kill-draw.

## Personas (risk personalities)

| Persona | One line | banishAversion / setupWeight |
|---|---|---|
| slayer | biggest plays, fights everything | 0.15 / 0.3 — "a dead royal is a dead royal" |
| bulwark | shields, safe routes | 0.4 / 0.6 — wants recruits, never over safety |
| hoarder | card economy | 0.9 / 1.1 — a recruit *is* economy |
| sniper | tempo precision | 1.0 / 1.5 — exact when it's on the table |
| steady | control group | 0.5 / 0.8 |
| **precision** | engineers exact lines, eats survivable counters to set them up | 1.4 / 2.2 |

## Known remaining dumbness (read results with these in mind)

- **One-step horizon.** Beyond the exact-kill setup bonus there is no
  multi-turn plan: no saving a hand for a boss the map says is next, no suit
  coverage planned across a gate's 3–4 royals.
- **Information is underpriced.** Bots reorder peeks greedily but can't
  exploit knowledge the way humans do. Scry/intel items will sim near zero.
- **No team coordination** beyond "hand the turn to the biggest hand."
- **Events are answered by personality, not arithmetic** (greedy personas take
  option 1, cautious refuse).

## Strategy Update — The Lever Economy (hand-management canon)

The deck is an economy with four levers. Each suit powers one lever, and **each
enemy disables the lever of its own suit** (immunity). Good play keeps all four
levers alive while steering toward exact kills; most losses are a lever dying at
the moment you needed it.

| Lever | Suit | What it does | Disabled by |
|---|---|---|---|
| Draw    | ♦ | puts cards into HAND (only source)        | Diamond royal |
| Recover | ♥ | refills the TAVERN bottom from discard     | Heart royal   |
| Shield  | ♠ | reduces the counterattack (cumulative/enemy)| Spade royal   |
| Double  | ♣ | doubles the played total's damage          | Club royal    |

### The diamond invariant
A hand with no ♦ and a thinning Tavern is a dead hand — ♦ is the only source of
cards into hand (♥ only refills the Tavern; you still need a draw to reach them).
**Never spend the last hand-♦ unless it draws into another ♦, lands a kill, or you
die anyway.** A♦ is draw insurance (pairs with any card to draw + fire that card's
power) — keep it.

### Churn: turn a junk hand into a strong one
Goal: cycle weak cards out, strong in, until the hand can land an exact kill or
survive the next lever-King. Two modes:

- **Discard-churn** — on a turn you can't kill, eat a *small, affordable* counter
  to dump 2s/3s as forced discard. Non-lethal turns only (the killer skips the
  counter). Caveat: churned junk pollutes the discard pool ♥ later draws from at
  random — churn buys tempo now, not a cleaner deck.
- **Attack-churn (safe)** — once an enemy is shielded to net-0, dump low cards as
  *attacks* at zero risk, spent as ♦ (draw) or ♥ (recover) so the churn feeds a
  lever. Priority when blocked: ♦ > ♥ > ♣ > ♠.

Churn is bounded by the Tavern: attack-churn draws it down, over-churn decks you
out. Churn freely when the Tavern is deep; switch to killing when it's shallow.

### Redundancy rules (never-do)
- Don't shield a small hit you want to absorb for discard-churn.
- Don't play ♠ on an enemy already at net-0 (excess shield does nothing).
- Don't play a suit into the enemy that blocks it unless it's for raw damage or a
  Jester is up.

### Lever-King prep (the suit-counting payoff)
Royal suits within a rank are deducible (track seen suits; the 4th is known). Each
King steals one lever — bank it *before* entering:
- **♠K** (no shields → damage race): hold big ♣ (10♣ = 20; any ♣ in a combo
  doubles the whole total) and ♥. Scariest King.
- **♦K** (no draw): enter with a fat hand; diamond invariant suspended.
- **♥K** (no recover): ♥ up right before, enter with a fat Tavern.
- **♣K** (no double): survival intact — the easy King.
Spend the Jester to restore the one lever you can't live without against its King.

### Encodable terms (evalPlay)
- `cyclingValue` — reward absorbing a small affordable counter when the hand is
  junk-clogged and no kill is available.
- `lastDiamondPenalty` — steep cost on spending the final hand-♦.
- `blockedSpadeWaste` — zero/negative for ♠ on a net-0 enemy.
- `safeChurnSuitPriority` — ♦ > ♥ > ♣ > ♠ when net counter is 0.
- `leverPrepReserve` — hold the suit a known-incoming King will block.
- `handQuality` gate — churn until quality clears a threshold OR the Tavern goes
  shallow. Strong hand = has ♦, has burst (high ♣), has ♠ if a hard hitter is
  current/incoming, low junk ratio, an exact-kill piece for the current enemy.

### How it's encoded (the 2026-06-12 lever pass)
`handStats()` computes the lever read (suit counts, junk ratio, burst, exact
piece, a 0–1 `quality`) once per play eval. The terms above land in `evalPlay` as:
- `effectiveShield` — only shield that actually lowers the *current* net counts;
  the wasted overage is dropped and charged as `blockedSpadeWaste` (kills the
  over-shield-a-net-0-enemy mistake).
- `lastDiamondPenalty` — −14 if the last hand-♦ is spent into a dead draw
  (♦-immune enemy or empty Tavern), −4 if spent live (may not replace itself).
  `chooseDiscard` also refuses to discard a scarce ♦ or any Ace.
- `cyclingValue` — when the hand quality is low, the Tavern is deep, and a small
  counter is comfortably affordable, a non-lethal play that churns junk is
  rewarded (offsets the risk penalty so the bot *chooses* to churn a bad hand).
- `safeChurn` — at net-0, plays that fire a lever get a ♦ > ♥ > ♣ > ♠ bonus.
- `leverPrepReserve` — at a gate with royals still incoming, spending your last
  ♣ (burst) or last ♥ (recover) on a non-kill is penalized — bank it for the
  next lever-King. (Light version; full suit-deduction look-ahead still open.)

**Caveat — `leverPrepReserve` is the partial one.** It reserves burst/recovery
generically rather than deducing the *specific* incoming King's suit. True
suit-counting (track seen royal suits, hold exactly the levers the known 4th
King blocks) remains the largest unencoded skill — see the unfixed list below.

## Discard model — the four-pressure read (`discard-model.ts`)

Paying a counterattack is the bot's most consequential hidden decision: the
cards you keep ARE the position. Both sims now score every legal payment
subset by how flimsy the **remaining** hand is against four pressures, given
the state (enemy attack + immunity, tavern depth, discard depth), and pick
the least-flimsy cover. `--discard legacy` restores the old minimal-waste
heuristic; `pressure` is the default.

| Pressure | Question it asks | Capacity measured |
|---|---|---|
| Block    | can you still cut the counterattack? | ♠ total vs net attack |
| Draw     | can you still refill your hand?      | ♦ total (capped) vs tavern |
| Burst    | can you still threaten the kill?     | best ♣-doubled play vs HP |
| Recovery | can you still refill the tavern?     | ♥ total vs discard pile, × dryness |

Plus a pessimistic **survival-turns** floor: how many consecutive net hits
the remaining hand can pay with zero refill.

Hard canon encoded:
- **Never zero diamonds.** Stranding the hand at no ♦ is near-forbidden
  (cost 250) — only a Joker burn (500) is worse.
- **Draw over hand-space is the same draw value** — a ♦'s worth is
  `min(value, maxHand−1)`, so a 3♦ is excellent and a 9♦ is the *cheaper*
  payment when another ♦ already caps the draw target.
- **♥ is capped by the discard pile** and scaled by tavern dryness (the
  ♥→♦ pipeline); the payment itself feeds the pile, and the chooser scores
  against the post-payment pile.
- **Matched same-rank sets ≤10 are protected** (multi-lever premium), as
  are Aces.
- **Immunity discounts, doesn't erase** — the blocked suit keeps future-
  royal value.
- **Royal-suit weighting**: vs the ♣ royal block+recovery dominate (full
  block into ♥); vs the ♠ royal shields are unsalvageable and burst takes
  the weight (♣ race); vs the ♦ royal block+burst; vs the ♥ royal keep
  attack (you cannot run on draw alone).
- **Joker home rule**: solo Joker (hand reset + immunity off) halves draw/
  recovery pressure and adds survival turns while held.

`rankDiscards()` answers "what single card is the best to discard?" — useful
for a future UI hint. Sanity scenarios: `scripts/discard-model-check.ts`.

**Measured (sim-base, 200 runs/cell, all counts × lineups):** legacy 85 wins
/9200 vs pressure 118/9200 pooled across the plain and universal-Jester
configs (z ≈ 2.3) — fewer deaths in the Jacks, more stalls (longer games).
Solo base-game stays ~0% under both (known floor; no discard policy fixes
zero Jesters).

## Changelog

- **2026-06-12 (four-pressure discard pass)** — new shared `discard-model.ts`:
  payment subsets scored by the remaining hand's block/draw/burst/recovery
  flimsiness + survival-turns floor; default in both sims (`--discard legacy`
  to compare). See the Discard model section above.
- **2026-06-12 (lever-economy pass)** — encoded the hand-management canon:
  `handStats` lever read; effectiveShield + `blockedSpadeWaste`;
  `lastDiamondPenalty` (+ `chooseDiscard` ♦/Ace protection); `cyclingValue`
  churn; net-0 `safeChurn` lever priority; `leverPrepReserve` (partial). See the
  Lever Economy section above.
- **2026-06-12 (boss-play pass)** — burst-hoarding discipline (nukes reserved
  for worthy targets + only when the multiplier lands the kill); gate exact-kill
  fuel (setup bonus at gates, 0.4×); solo Jester valued as a gate refresh.
  Motivated by SIM-FINDINGS: the gate was the least-reliable part of the floor.
- **2026-06-12** — siege mode; immune-suit waste penalty; solvency margin;
  yield penalty at gates; live-kit sync (Sentinel commit, Oracle mark, QM/
  Surgeon owner-only, Commander +draw); recruit-economy model (banishAversion,
  setupWeight, `exactReachable`) and the `precision` persona; kill-type,
  fork-path, item-held and deck-at-Throne telemetry; `--grant` forced-
  inclusion mode (THE-BAR M1); `--persona` comma lists in class-isolation
  mode.
- Pre-2026-06-12 — original five personas, greedy single-turn scorer.

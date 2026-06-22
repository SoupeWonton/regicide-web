# Class Design (pillar document)

Classes are one of the load-bearing pillars of the game and get their own design
document, separate from the campaign/system philosophy. This file owns class
*principles* and *rework directions*; the canonical per-class spec still lives in
the per-class files in this folder (`<class>.md`), but those files are being brought in line with the
principles here and several need rework (see Status below).

> Created 2026-06-11 from the Design Direction. Reflects the ratified pivot:
> province/act/gate structure, lineage CUT (death = full reset), candles, relics
> persistent, **solo primary (70/30)**, engine-building fantasy. Many specifics
> below are *directions pending playtest*, not locked numbers — flagged inline.

---

## The benchmark: the Executioner bar

The Executioner is the fun benchmark. Its exact-kill loop delivers a fast, legible
dopamine hit — "another exact kill, another exact kill" — because the player makes
a real decision (when to close a threshold), sees an immediate attributable result
(the enemy dies *now*), and the result feeds a visible economy (exact-killed
royals re-enter the deck as bomb cards). In our own playtests most other classes
did **not** hit that note. Closing that gap is the central class-design problem.

**Every class must clear three tests (the "Executioner bar"):**
1. **Decision** — a real choice the player makes on (most) relevant turns, not an
   automatic passive.
2. **Visibility** — an immediate, attributable result you can point to this turn.
3. **Climax relevance** — a gate-relevant capstone on the Siege axis; the class
   must matter at the Gate/Courtyard/Throne, not only on the road.

A class that fails any test is a "passive bystander" and must be reworked.

## Principles (ratified)

1. **Solo coherence is mandatory.** 70% of players play solo. **No class may have
   a dead mechanic at solo.** Any "choose the next player / pass initiative" effect
   needs a solo-functional replacement that does something real for one hero
   (draw, tempo, deck shaping). Initiative as *pure* turn-handoff is a multiplayer
   rider, never a class's solo core.
2. **Multiplayer is a parallel, optional layer.** 1–2 of the ~8 heroes may be
   explicitly tuned for 2–4 players (one might shine as a duo companion, one at
   full four). The intended mechanism is an **ability-variant layer** — a
   selection-screen-style adjustment that swaps in multiplayer forms of certain
   abilities when player count > 1. Solo forms are authored first; multiplayer
   forms are added later as a branch.
3. **Specialization trees are a pillar of expression.** Per-run RPG trees (root →
   two branches → gate capstone), one node per Camp, branch-lock on the depth-2
   pick. Which branches a class can access is **Kingdom-gated** (candles / wins).
   This is where the "MMO-style skill tree that changes the game" lives.
4. **Per-class deck effects (new direction).** Beyond abilities, each class should
   have a signature **effect on the deck itself** — a way it bends the bounded
   modification layer (suit-switching, rank-morphing, temporary card injection,
   thinning). This is what makes the *engine* feel like *yours*, distinct from a
   pure ability list, without becoming a full deckbuilder. This is a big balancing
   commitment and is **direction, not yet spec'd** — author per class with sim
   support.
5. **Gate capstones are Siege-axis.** The dramatic payoff is once-per-gate. The
   roster historically had many road levers and almost no siege levers; bias new
   class power toward the gates.
6. **Engine-building, build-sharing.** A class + a branch + a relic loadout is a
   shareable build. Design abilities that read clearly in a sentence a player would
   say to a friend.

## Status of existing classes

| Class | Status | Action |
|---|---|---|
| Executioner | ✅ benchmark | Keep; it defines the bar. |
| Surgeon | ✅ reworked to tree | Reference shape for tree reworks. |
| Sentinel | ⚠ passive core | Rework: make the trigger an active declared decision. |
| Quartermaster | ◻ adequate, low drama | Add a deck-effect signature + a sharper gate capstone. |
| Commander | ⚠ solo-dead core | Initiative handoff is a multiplayer rider; needs a solo core. |
| Gambler | ⚠ solo-weak, once/chapter | Rework: odd/even prediction with a streak. |
| Oracle | ⛔ broken | Omen trigger is unobservable; rework to card-relocation, not reveal. |
| Warden | ⛔ broken | Entire kit referenced the cut death fork. Full rework on the candle canvas. |
| Exile | ◻ niche/mastery | Keep as a rewards/candle-gated unlock; solo-coherent already. |

Two **new** classes are proposed below (exile-to-boost; rank-pairing) to round the
roster toward ~8 with distinct per-turn decisions.

---

## Rework directions

These are directions, not locked numbers. Each names the **core decision every
turn** — the thing that must clear the Executioner bar. Validate against
`server/scripts/sim.ts` and real-table play before locking.

### Oracle → card-relocation, not reveal

**Interim implementation (2026-06-11):** peek top 3 + reorder at encounter start;
the card placed at the top is **Marked**; Oracle playing the Marked card deals +2
damage (+3 at boss). Passes the Executioner bar — reorder decision is meaningful,
payoff is visible and attributable.

**Full rework direction (pending client support for blind-push input):**
- **Core — Displacement:** once per enemy, choose N (1–5) and, **without looking**,
  move the top N Tavern cards to the bottom. A genuine probability bet.
- **Omen (observable):** each turn you push ≥3 cards, gain 1 Omen; at 3 Omen the
  next gate gains +1 royal. Fully mechanical.
- **Branch A — Veil Push:** once per gate, after a push, peek the top 1 card.
- **Branch B — Deep Displacement:** once per province, move any number of cards
  from the top or discard into the Tavern at a chosen position.
- **Core decision every turn:** push this turn? how many? worth the Omen?

### Sentinel → active declared trigger

**Interim implementation (2026-06-11):** "all-Spade commit" — when all cards
played in a turn are Spades, gain +3 shield. Mix any other suit: no bonus.
Creates a real decision (commit to shield or diversify for suit effects). Siege
ultimate (Hold the Gate: negate one counterattack) now live in province mode.

**Full rework direction (pending client UI for declared trigger):**
Make the bonus **declared**: before playing a Spade, the Sentinel announces the
activation to get +4; an undeclared Spade gets nothing.
- **Decision:** spend the trigger on *this* Spade now, or hold for the next one?
  Too early wastes it; too late and you took the hit.
- Keep the Bulwark / Guardian branches; both now hang off an *active* root.
- **Core decision every Spade:** declare Bastion on this play, or hold it?

### Gambler → odd/even prediction with a streak

**Interim implementation (2026-06-11):** wager now resets per encounter (was
"once per chapter" — effectively once per run in province mode). Siege "All In"
now live in province mode. The wager is still binary (enemy dies this turn or not)
but comes up every road fight instead of once ever.

**Full rework direction (pending client UI for pre-draw call):**
Replace the binary wager with a recurring prediction streak.
- **Core — The Bet:** before any draw from the Tavern, call odd/even on the drawn
  card's rank. Hit: pull a bonus card for the party. Miss: discard 1 random.
- **Streak:** consecutive hits raise the payoff (1 → +1 card; 2 → +2; 3 → +3 and,
  in multiplayer, choose next actor). A miss resets. No cap.
- **Solo-functional:** bonus-card payoff is the reward; "choose next actor" is the
  multiplayer rider.
- **Branch A — Cardsharp:** on a 3+ streak, exile the top Tavern card instead of
  drawing (controlled thinning).
- **Branch B — Fate Broker:** when a streak breaks, spend the lost streak count as
  Refit charges. Failure becomes a resource.
- **Core decision every draw:** call this draw? how confident in the distribution?

### Warden → rebuilt on the candle canvas

The Warden's entire kit (extra death-fork option, Iron Last Stand, Battle Retreat)
referenced the **cut** Retreat/Last-Stand/replacement system. It is non-functional
and must be rebuilt. Its theme — crisis management, "how do we survive
catastrophe?" — re-homes onto the new death/candle economy.

- **Core — Death Dividend (direction):** the Warden's presence converts a run's
  ending into more candles, and/or once per province lets the party convert
  accrued in-run value into an immediate relic/spell activation at a crisis moment
  (a mid-run "candle spend" before reset). The decision: spend the dividend now to
  save the run, or let it bank toward a stronger next run.
- This is the **least-settled** rework — it depends on how candles are finally
  implemented (deferred). Treat as a placeholder direction; do not build until the
  candle economy is spec'd. Flagged open.

### Commander → solo core for an initiative class

**Interim implementation (2026-06-11):** solo: draw 2 on kill (was draw 1 — not
felt). Multi: draw 1 and hand off. Siege "Rally the Line" (re-arm ally with 2 cards
on first handoff) now live in province mode. Solo siege has no equivalent yet — noted
as a future spec once the ability-variant layer ships.

**Full rework direction:**
Pure "pass the turn to an ally after a kill" is dead solo. Keep draw-2-on-kill as
the solo core (cascade momentum — kill → draw → kill again) and keep the turn-handoff
as the **multiplayer ability-variant**. Vanguard (ignore the consecutive-turn rule)
is inherently multiplayer — pair it with a solo variant under the ability-variant layer.

---

## New classes (proposed)

### The Furnace — exile-to-boost (precision/threshold)

Theme: consume to empower. Distinct from the existing **Exile** class (which thins
the deck at cost). Guiding question: *what is worth burning?*

- **Core — Offering:** once per enemy, exile a card from **hand** until end of
  enemy; one other card you play this turn gains **+ the exiled card's rank** as a
  one-time boost. The exiled card returns at enemy death (no permanent loss in the
  base form).
- **Deck effect (signature):** temporary in-hand card injection/morphing — the
  class bends card *values* on demand, the cleanest expression of the bounded
  modification layer.
- **Gate relevance:** gate royals have exact HP (J10/Q15/K20); Offering is a
  precision tool for hitting exact thresholds — strongest exactly where gates
  demand precision.
- **Branch A — Kiln:** the returned card comes back +1 for the run (each burn is a
  marginal upgrade).
- **Branch B — Pyre (capstone):** once per gate, permanently exile the burned card
  and double the boost. High risk, high payoff.
- **Core decision every enemy:** which card do I sacrifice, to pump which target,
  for which threshold?

### The Arbiter — rank-pairing / combo (pattern)

Theme: pattern recognition. Guiding question: *when does the sequence become a
pattern?*

- **Core — Matched Pair:** when the Arbiter plays a card of the same rank as the
  last card played this enemy (any hero, or their own), the pair deals +5 (or
  +the pair card's value, whichever is higher).
- **Deck effect (signature):** rewards setting up rank adjacencies — the class
  thinks about the *order* the deck is played, not just what's drawn.
- **Gate relevance:** pair bonuses reach exact-kill windows (5+pair = 10 one-shots
  a Jack); pair-hunting is actively valuable at gates.
- **Branch A — Judge:** extend the pair window to the last 2 turns (deliberate
  setup).
- **Branch B — Court Order (capstone):** on a pair, also choose the next actor
  (multiplayer) / draw 1 (solo). Merges combo with a solo-coherent payoff.
- **Core decision every turn:** play now for base value, or hold for a pair next
  turn?

---

## Open / needs playtest

- Final per-class numbers for all reworks (sim + real table).
- The **per-class deck-effect** layer is ratified as a direction but unspec'd —
  this is a large, deferred design+balance effort.
- The **multiplayer ability-variant** mechanism (how forms swap by player count) is
  a parallel branch, not yet designed.
- **Warden** cannot be finalized until the candle economy is implemented.
- Which classes are the 1–2 multiplayer-tuned heroes, and the duo-vs-four
  specialization split.
- Whether exact-killed-royal bomb cards cause runaway deck quality under the
  within-province deck-carry model (measure across Acts 2–3).

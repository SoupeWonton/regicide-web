# The Four Core Classes — Maximally-Distinct Redesign

**Status:** Design proposal (2026-06-18). Not built. **Reverses locked canon** —
see "Canon impact" at the bottom before any code. For audit + ratification first.

## The thesis

A class is **a loophole + the hand to exploit it.**

- **Starting hand** = the visible tools, legible at second zero. Suit-flavored
  stamps on the shared A–5 ×4 start. Allowed to dissolve into the deck as you
  conquer — it was never the thing carrying identity.
- **The loophole** = the one rule of the core loop this class gets to break.
  Always-on, never buried, the through-line. **It is INNATE to the class** — not an
  item you slot. *(Revised 2026-06-18: relics have no slots and are a separate sparse
  layer — the loophole is innate class progression, not an acquired relic. See
  `../design/design-decision-2026-06-18.md`.)*
- **The loophole deepens one branch per chapter, on its own.** In-run = one branch;
  cross-class diversification only on death/milestone (existing canon).

## Why these four are maximally distinct

We stop differentiating by *which suit-lever you buff* (today all four are
"+1 my own suit" — Surgeon and Quartermaster are near-duplicates as card-economy
classes). Instead **each class breaks a different station of the loop**
(draw → combine → kill → block → persist). That maps cleanly onto the four
canonical deckbuilder win-methods:

| Class | Win-method | Rule it breaks | Loop station |
|---|---|---|---|
| **Sentinel** | Defense / Inevitability | Blocking costs you nothing — it *pays* | BLOCK |
| **Executioner** | Aggression / Snowball | Kill windows widen; kills cascade & recruit | KILL |
| **Quartermaster** | Tempo / Big-Turn | Hand-cap and combo-cap are broken | COMBINE |
| **Surgeon** | Engine / Recursion | The deck never decks out; best cards return | PERSIST |

Defense / Aggro / Tempo / Value — the four corners. No two win the same way.

---

## Sentinel — The Wall *(Defense / Inevitability)*

**Starting hand:** `S3 S4 S5` stamped `Plate` (♠+1 shield) — the wall's tools.

**Breaks the BLOCK rule.** Counterattacks stop being a tax and become fuel: the
enemy hits you a thousand times and never makes you bleed. You win by outlasting.

**Loophole progression (one tier deepens per chapter, innate):**
1. **Aegis** — when you block a counterattack to 0 net damage, draw 1. Committing
   to Spades pays twice: shield now, card next turn.
2. **Bulwark** — surplus shield beyond the incoming hit converts to bonus damage
   on your next attack; heavy all-♠ turns bank a Fortify stack (max 3) that
   pre-reduces the next counterattack.
3. **Impenetrable** *(capstone)* — once per fight, fully negate a counterattack
   *and* reflect its value back at the enemy. The block becomes a win condition.

---

## Executioner — The Snowball *(Aggression)*

**Starting hand:** `C4 C5 C2` stamped `Edge Edge Undercut` — burst plus the
undershoot token to land on exact kill values.

**Breaks the KILL rule.** Your exact-kill window widens past what should be
possible, so you recruit aggressively and every kill feeds the next. Momentum
compounds faster than enemy pressure builds.

**Loophole progression (one tier per chapter, innate):**
1. **Open Season** — exact-kill window widens to **1–3 HP** on the road (boss
   stays 1–4). You kill — and recruit — cards you shouldn't reach.
2. **Kill Chain** — each exact kill draws 1; consecutive kills in one enemy
   sequence widen the window further for the rest of that encounter.
3. **Reign of Terror** *(capstone)* — recruited royals (bomb-cards) deal bonus
   damage when you play them; the first kills each boss fight cascade into draws
   and bonus damage on the next royal. The chain never ends.

---

## Quartermaster — The Overwhelm *(Tempo / Big-Turn)*

**Starting hand:** `D3 D4 D5` stamped `Provision` (♦+1 draw) — the fuel.

**Breaks the COMBINE rule.** You hold and play more cards than the rules allow,
so a single turn dumps overwhelming value. Win by tempo: one explosive turn ends
the enemy before it gets to answer.

**Loophole progression (one tier per chapter, innate):**
1. **Requisition** — hand cap +2; your first ♦ trigger each enemy draws extra.
   You hold more than legal.
2. **Arsenal** — ♦ triggers draw more on every fire; **combos may total up to 12
   instead of 10** — bigger single plays.
3. **Last Requisition** *(capstone)* — when your hand empties, refill to full,
   repeatable. Dump everything, reload, dump again.

---

## Surgeon — The Engine *(Recursion / Value)*

**Starting hand:** `H3 H4 H5` stamped `Mend` (♥+1 recover) — recursion tools.

**Breaks the PERSIST rule.** The Tavern never runs dry and your strongest
cards keep coming back. You can't be ground out; the long game is always yours.
(Distinct from Quartermaster: QM wins with *quantity-in-hand now*; Surgeon wins
with *the deck/discard never dying* — burst vs. grind.)

**Loophole progression (one tier per chapter, innate):**
1. **Triage** — ♥ triggers are no longer once-per-enemy; they fire on every Heart
   play, recycling discard back into the Tavern freely.
2. **Flush System** — recoveries return more cards, and you choose to recover your
   discarded high-value / recruited cards specifically — replay your best.
3. **Full Capacity** *(capstone)* — when the Tavern runs dry, return **all**
   discards, repeatable. You literally cannot deck out.

---

## Canon impact (read before building)

- **Reverses the pure-token / no-global-passive lock (2026-06-14):** the loophole
  relic is an always-on passive at the class level. Deliberate trade for
  legibility ("a hand + a trinket that breaks one rule" > "read your class off
  which cards are pre-stamped"). Make the reversal on purpose.
- **Folds the deferred class tree into innate class progression:**
  `specialization-trees.md`'s Root → Branch → Capstone becomes the 3-tier loophole
  progression above, unlocked one tier per chapter automatically. The point/Lair
  economy in that doc is superseded. *(2026-06-18: this is NOT a relic system —
  relics have no slots and are a separate sparse layer.)*
- **Stacking-passives risk:** 3 always-on rule-bends approach the "parallel load"
  the single-threaded loop is built to avoid. Each tier must modify *one existing
  station* of the loop — never add a new station.
- **Unbuilt systems this assumes:** per-chapter innate loophole progression;
  loophole as a class-level passive that deepens. None exist in code today.
- **The other 5 classes stay parked** as the meta-unlock runway (small-now,
  wide-over-lifetime). Tune and release one at a time.

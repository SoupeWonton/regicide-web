# Design Decision — 18 June 2026

**Status:** Brainstorm-captured, **not yet audited or ratified**. This reverses
several locked decisions on purpose (flagged inline). Run the drift-auditor before
any code. Companion spec: [`../ideas/four-classes-redesign.md`](../ideas/four-classes-redesign.md).

## Keystone answers (resolved 2026-06-18)

These three resolve the load-bearing open questions and edit the decisions below.

- **Ace = low (rank 1), and it is a companion.** It does **+1 to anything** — that's
  why it's strong. It is a *starting* card, not a late-act recruit. (Closes the D10
  keystone: the rank ladder is 2→10→royals; A stays in the opening deck.)
- **Graft-on-kill is PERMANENT.** A redundant exact-kill permanently grafts value or
  suit onto a hand card. The **Forge is repurposed to *reshuffle/rearrange* existing
  tokens**, not mint new ones — token delivery is the kill, the Forge only reorganizes.
- **No relic slots. Relics are very, very rare.** There is no managed relic inventory
  and no per-chapter slot unlock. You mostly just hold what you rarely find; a
  "keep this or sacrifice it for another" decision should happen **at most once per
  run, and even that is rare.** → This **kills Decision 6's "relic = spec tree via
  slots."** The class loophole becomes **innate class progression** (deepens per
  chapter on its own); relics are a **separate, sparse, occasional** layer.

## The through-line: "You don't build a deck — you conquer one"

The game's identity is **conscription, not curation**. The deck grows by defeating
enemy cards, not by drafting from a shop. The 52-card deck is the free literacy
(rank = power, the court = the boss) — protect it, don't denature it.

Honest phrasing (the pitch must not overstate): *every card you earn is an enemy
you faced — and the ones that slip past you wait at the chapter gate (backfill).*
End state is **near-complete, lightly-tokened**, not a guaranteed full court.

## Decisions

### 1. The hook is a single-threaded decision pipeline
The loop — **draw → combine → kill → block → persist** — is resolved in
*succession*, each station individually trivial; depth comes from the chain, not
from holding four things at once. **North-star test:** if any one step requires
holding the *other* steps in your head to resolve it, the pipeline is broken.
(This is why base Regicide's four-simultaneous-suit-powers overwhelms.)

### 2. Exact-kill resolves in one verb — recruit OR graft
- Kill a card you **don't** own → **recruit** it (deck widens).
- Kill a card you **do** own → **permanently graft** its value *or* suit onto a card
  in hand (deck deepens). This **kills the separate shard/fragment economy** — no
  second wallet, no deferred spend screen. Reinforcement, not currency.
- The **Forge no longer mints tokens** — the kill mints them. The Forge is repurposed
  to **reshuffle/rearrange** the tokens you already have across your cards.

### 3. Cap and pivot — never denature the 52
The deck is hard-capped at the complete court. Recruiting widens up to the cap;
past it, redundant kills pivot to grafts. The deck never sprawls past a
recognizable deck of cards. The complete A–K kingdom is the most evocative
ceiling. (NO-EXILE already canon: the deck only ever grows.)

### 4. Re-skin grafts/tokens as fantasy, not arithmetic
The math stays; the *presentation* becomes conquest-flavored (a knighted card, a
sworn banner, a brand on the face) — never a bare "+2" tooltip. Balatro's trick:
real math, juicy fantasy surface. Card-face legibility is the open design risk.

### 5. Class = starting hand + loophole relic
- **Starting hand** = visible tools at second zero; suit-flavored; allowed to
  dissolve into the deck.
- **Relic = the loophole** = the one rule of the loop this class breaks; always-on,
  the lasting identity. "A class is a loophole and the hand to exploit it."
- **REVERSES** the locked pure-token / no-global-passive consolidation (2026-06-14).
  Deliberate trade for legibility.

### 6. Class loophole is INNATE and deepens per chapter (no relic slots)
*(Revised by the keystone answer — supersedes the earlier "relic = spec tree via
slots" framing.)* The class loophole is **innate**: it is the class, not an item you
slot. It **deepens one branch per chapter on its own** (e.g. Sentinel:
Aegis → Bulwark → Impenetrable) — the 3-tier trees in `four-classes-redesign.md`
become innate class progression, not relic acquisitions. Cross-class diversification
only on death/milestone. **Risk:** three always-on rule-bends re-create parallel
load — each tier must modify one existing station of the loop, never add a new one.

**Relics are now a separate, sparse layer (see Decision 7):** very rare, no slots,
no managed inventory. The Lair/point economy in `specialization-trees.md` is
superseded by innate per-chapter class progression.

### 7. Economy collapses to two power-vehicles
Inelegance came from pricing four *kinds* of power against each other. Fix = reduce
the kinds, not find a currency.
- **The deck** (cards + grafts) — grown only by conquest.
- **Relics** — **very, very rare**, no slots, no managed inventory. You mostly just
  hold what you find; a "keep or sacrifice for another" decision happens at most once
  per run, rarely. Relics are *not* the class loophole (that's innate — Decision 6).
- **Fold spells into the deck** (a burst becomes a grafted card) — kill the spell
  currency.
- **Refuse gold.** No buying with coins. "Buy" = a guaranteed *kill you set up*
  (e.g. the Caravan offers a weakened target). **The battlefield is the only shop.**
  One unit of value in the whole game: the exact kill.

### 8. Roster: small now, wide over the lifetime
Engine-feeling scales with depth-per-class × build-space, **not** roster count.
Solo game → no combinatorial payoff for a wide roster (the Darkest Dungeon model
only pays when units combine). Ship **4 maximally-distinct classes** (Slay-the-Spire
model); the other 5 are the **meta-unlock runway**, tuned and released one at a
time. Small at any snapshot, wide across the lifetime.

### 9. The four core classes are maximally distinct by *rule broken*
Not by suit-lever (that made Surgeon/Quartermaster duplicates). Each breaks a
different station; the four canonical win-methods:

| Class | Breaks | Win-method |
|---|---|---|
| Sentinel — The Wall | BLOCK (blocking pays) | Defense / inevitability |
| Executioner — The Snowball | KILL (windows widen, kills cascade) | Aggression |
| Quartermaster — The Overwhelm | COMBINE (hand & combo caps) | Tempo / burst |
| Surgeon — The Engine | PERSIST (deck never decks out) | Recursion / value |

Full kits in `four-classes-redesign.md`.

### 10. Structure: two acquisition acts, then a pressure engine
Continent 1 splits into two rank-band acts (2–6, then 7–A); royals are the **gate
bosses** you fight but don't keep. Continent 2 = you only *recruit royals*, and the
mode flips from acquisition to a **pressure engine** (≈ today's province).
**Open:** Ace's value (low-1 start vs. high) needs pinning.

## Locked decisions this reverses (decide on purpose)
- Pure-token / no-global-passive class model (→ class now has a passive loophole relic).
- Deferred standalone class tree (→ folded into relics).
- `specialization-trees.md` Lair/point economy (→ relic-slot unlocks).
- Spells as a standalone item vehicle (→ folded into the deck).

## Known unbuilt systems these decisions assume
Relic slots that unlock mid-run; relic-as-tree-branch; loophole-relics as
class-level passives; graft-on-redundant-kill; two-act Continent-1 structure;
spells-as-grafted-cards; Caravan-as-guaranteed-kill. None exist in code today.

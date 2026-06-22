---
kind: decision
edition: v3
status: accepted
date: 2026-06-18
supersedes: []
last_reviewed: 2026-06-20
---

# V3 foundation — Landry and Gab brainstorming, 18 June 2026

**Status:** Accepted as the founding design session of V3. This record captures the
brainstorming result reached by Landry and Gab on 18 June 2026 and marks the beginning
of the V3 direction.

It is a historical foundation, not a substitute for current canon. Later accepted
decisions clarify or supersede individual details—especially deck curation, replacement
graft semantics, and the continuous five-act expedition. The effective rules remain in
[`../canon/README.md`](../canon/README.md). Companion class proposals live under
[`../proposals/classes/`](../proposals/classes/).

## Keystone answers (resolved 2026-06-18)

These three resolve the load-bearing open questions and edit the decisions below.

- **Ace = low (rank 1), and it is a companion.** It does **+1 to anything** — that's
  why it's strong. It is a *starting* card, not a late-act recruit. (Closes the D10
  keystone: the rank ladder is 2→10→royals; A stays in the opening deck.)
- **Graft-on-kill is PERMANENT.** A redundant exact-kill permanently grafts rank or
  suit onto a hand card. The accepted
  [`2026-06-20` correction](2026-06-20-replacement-graft-semantics.md) clarifies that
  the chosen property is replaced, not increased or added. The **Forge is repurposed
  to *reshuffle/rearrange* existing
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
- Kill a card you **do** own → **permanently replace** a card-in-hand's rank with the
  defeated rank *or* replace its suit with the defeated suit (deck deepens). This
  **kills the separate shard/fragment economy** — no
  second wallet, no deferred spend screen. Reinforcement, not currency.
- The **Forge no longer mints tokens** — the kill mints them. The Forge is repurposed
  to **reshuffle/rearrange** the tokens you already have across your cards.

### 3. Cap and pivot — never denature the 52
The deck is hard-capped at the complete court. Recruiting widens up to the cap;
past it, redundant kills pivot to grafts. The deck never sprawls past a
recognizable deck of cards. The complete A–K kingdom is the most evocative
ceiling. At the time, NO-EXILE meant the deck only ever grew; that prohibition was
withdrawn by the accepted
[`2026-06-20` decision](2026-06-20-design-practice-and-deck-curation.md), which leaves
permanent removal as an open design axis.

### 4. Present grafts as changed card identity, not arithmetic
The accepted replacement graft changes a card's rank or suit and receives a
conquest-flavored presentation (a knighted card, a sworn banner, a brand on the face),
never a bare `+1` tooltip or a second simultaneous suit. Card-face legibility remains
the open design risk.

### 5–6. Class = starting hand + innate loophole
- **Starting hand** = visible tools at second zero; suit-flavored; allowed to
  dissolve into the deck.
- **Innate loophole** = the one rule of the loop this class breaks; always-on, the
  lasting identity. "A class is a loophole and the hand to exploit it."
- **REVERSES** the locked pure-token / no-global-passive consolidation (2026-06-14).
  Deliberate trade for legibility.

The loophole is the class, not an item to slot. It deepens during the expedition
without a point economy. The exact progression model—linear tiers or mutually exclusive
facets—remains under class exploration. **Risk:** stacking always-on rule-bends can
re-create parallel load; every accepted deepening must modify the same existing loop
station rather than add a new one.

**Relics are now a separate, sparse layer (see Decision 7):** very rare, no slots,
no managed inventory. The Lair/point economy in `specialization-trees.md` is
superseded by innate per-chapter class progression.

### 7. Economy collapses to two power-vehicles
Inelegance came from pricing four *kinds* of power against each other. Fix = reduce
the kinds, not find a currency.
- **The deck** (cards + grafts) — cards are acquired through conquest.
- **Relics** — **very, very rare**, no slots, no managed inventory. You mostly just
  hold what you find; a "keep or sacrifice for another" decision happens at most once
  per run, rarely. Relics are *not* the class loophole (that's innate — Decision 6).
- **Fold spell roles into cards or existing combat actions** — kill the spell currency.
  Replacement graft remains strictly a rank-or-suit change, not a carrier for arbitrary
  burst effects.
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

Full kits are in
[`../proposals/classes/four-core-classes.md`](../proposals/classes/four-core-classes.md).

### 10. Structure: two acquisition acts, then a pressure engine
The session established the two-stage acquisition/power-test shape. It was later
completed by the accepted
[`five-act expedition`](2026-06-20-five-act-continuous-expedition.md): Claim and Shape
are the acquisition acts; Exploit, Adapt, and Master pressure the conquered deck.
Royals are gate bosses rather than ordinary recruits, and Ace is accepted as a low-rank
starting companion.

## Locked decisions this reverses (decide on purpose)
- Pure-token / no-global-passive class model → class now has an innate loophole.
- Deferred standalone class tree → class deepening belongs to the innate loophole.
- `specialization-trees.md` Lair/point economy → removed; no class point wallet.
- Spells as a standalone item vehicle → roles move to cards or existing actions.

## Delivery status

This founding record does not track implementation. Current code-versus-canon gaps live
only in [`../delivery/current-state.md`](../delivery/current-state.md).

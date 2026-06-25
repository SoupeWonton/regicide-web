---
kind: decision
edition: v3
status: superseded
superseded_by: 2026-06-24-crystals-continents-and-equipment
date: 2026-06-22
questions: [Q11]
---

# Design decision — spell and relic models *(superseded by 2026-06-24)*

> **Status: superseded** by
> [`2026-06-24-crystals-continents-and-equipment.md`](2026-06-24-crystals-continents-and-equipment.md).
> The four-suit spell framing survives, but the **silver→gold→purple** tier is replaced by the
> **fragment / half / full crystal** model (only two castable rungs; Full is a win token), and
> the **slotless** relic model is replaced by **five equipment slots** (Staff + Cloak/Ring/Hat/
> Amulet). This record is kept for history. Source brainstorm:
> [`../proposals/systems/relics-and-spell-cards.md`](../proposals/systems/relics-and-spell-cards.md).

## Decision A — Spells are four fixed suit trump-cards with a vertical tier

There are exactly **four spell identities in an expedition — one per suit** (♣ attack,
♦ draw, ♠ block, ♥ recover). The player can never hold a second spell of a suit and cannot
swap a suit's spell for a different card from a catalog. Each suit position has a vertical
tier, read at a glance by frame colour:

1. **Dormant** — the position exists but cannot be cast.
2. **Standard (silver)** — the suit's direct emergency effect.
3. **Rare (gold)** — the same identity upgraded into a stronger rule-bend.
4. **Mythic (purple)** — the final expression *(retained only if it creates a new
   trump-card *moment*, not merely a bigger number)*.

Acquiring a spell **awakens** its dormant suit at standard; a later reward **upgrades the
same physical card** (silver→gold→purple). It never adds a fifth card.

Supporting rules:
- A spell is a **scarce one-use trump card**, held in a dedicated spell area — not shuffled
  into the Tavern, not counted against the hand limit. Casting **consumes** it; the suit
  position empties and may receive a future standard spell.
- **Spells sit above suit immunity** (current lean): a ♦ spell is castable against a
  ♦-immune enemy, because a spell's purpose is to restore the axis the encounter denied.
  This exception must be visually explicit (elevated/golden frame, immunity-ignored preview).
- The strategic question is **which axis to awaken first and which to deepen**, and the
  tension of *casting now* (solve the emergency) vs *holding* (preserve the vertical
  investment toward gold/purple).

**Why:** removes inventory construction and duplicate rules from the player's load; spell
state reads as four suit positions with visible tiers; preserves the single-threaded
pipeline (no currency, no shop economy, no arbitrary text on ordinary cards).

## Decision B — Relics are rare, slotless, unique rule-benders

Relics are **rare, slotless, run-defining exceptions** — not the class tree, not a stat
boost. Each relic **bends exactly one rule of the core loop** in a legible, narratable way
(e.g. *Split Seal*: a graft may target any owned card; *Doorstop*: an exact block bounces
the Spade back to hand; *Crown of First Claim*: a fresh recruit enters hand immediately).

Supporting rules:
- A **small authored pool**; most runs see **one or two** relics. Breadth over a lifetime
  (death/milestones widen the pool), not power within a run.
- **Primary source: the Lair** (verb *raid* — earn the relic through a dangerous fight). A
  **costly alternative at the Caravan** (pay from hand). Not handed out at ordinary stops.
- A relic must **tell a story without duplicating** a class loophole or a graft. Relics
  that merely amplify a class identity need scrutiny (do they erase what makes the class
  unique when another class obtains them?).

**Why:** keeps relics exciting and sparse; matches the "horizontal breadth via choice, not
vertical power" principle shared with spells and (candidate) class facets.

## Open sub-questions deferred (not blocked by this record)
- Whether the **mythic/purple** tier ships in the first alpha or stays future design space.
- Exact effects, numbers, and the initial relic roster (authored separately; **power
  baseline is a human-playtest question — not a sim number**, see
  [`../research/simulation/bot-reliability-and-architecture.md`](../research/simulation/bot-reliability-and-architecture.md)).
- Acquisition split between Sanctum (attune) and Caravan (pay-from-hand).

## On ratification, do
- Flip status to `accepted`; record the date.
- Update canon `canon/v3/systems/items.md`.
- Remove the spell/relic portions of **Q11** from the active queue.
- Reflect delivery consequences in `delivery/current-state.md`.

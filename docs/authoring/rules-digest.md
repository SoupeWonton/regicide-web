---
kind: authoring
status: scaffold
last_reviewed: 2026-06-28
---

# Rules digest — invariants new content must respect

Fast reference only. **Canon is the source; if this disagrees with canon, canon wins.** Sources:
[`core-loop`](../canon/v3/core-loop.md) · [`constraints`](../canon/v3/constraints.md) ·
[`deck-and-grafts`](../canon/v3/systems/deck-and-grafts.md) · [`structure`](../canon/v3/campaign/structure.md).

## Core loop (starter list — verify against canon, expand)

- Loop: **draw → combine → kill → block → persist.**
- **Exact kill → recruit** (unowned card) **or graft** (owned card). **Overkill loses the card** to discard.
- A **Spade's value is its shield**; shield reduces the enemy's net attack.
- You **pay an attack by discarding cards whose total ≥ the net attack** — the real resource is **cards**.
- **Combos cap at 10** (same-rank); **Aces pair**. **One royal at a time** — no board-wide effects.
- **Graft replaces value OR suit** of one card (never both, never +1); **royal grafts cap at 10**.
- **Persistent deck:** hand, Tavern, discard carry between road fights; only explicit rests reshuffle.
- **Equipment = 5 slots** (Staff + Amulet/Ring/Cloak/Hat). **Gauntlet = 4 spells** (one per suit).
- **Determinism:** seeded RNG only, never `Math.random()`.

## The four-lever economy (what a relic actually bends)

Source: [`../research/strategy/additional-strategy.md`](../research/strategy/additional-strategy.md). The game
is a **four-lever economy** — each suit is one lever:

| Suit | Lever | A relic that touches this lever competes with… |
|---|---|---|
| ♣ Clubs | **Attack** (a Club doubles its damage) | Executioner · Clubs spell |
| ♦ Diamonds | **Draw** | Quartermaster · Diamonds spell |
| ♠ Spades | **Block** (a Spade's value is its shield) | Sentinel · Spades spell |
| ♥ Hearts | **Recover** (cards back into the deck) | Surgeon · Hearts spell |

- **Every enemy disables exactly one lever — not just Kings.** Each enemy (J/Q/K alike) is **immune to
  one suit**, so that lever is dead for the whole fight. A relic that grants or restores a lever is
  most valuable precisely against the enemy that denies it.
- **The Jester cancels the current enemy's immunity** (the one in-combat tool that unblocks a locked
  lever; it works retroactively, except Clubs played *before* the Jester don't retro-double). **In
  solo / 2p there are no immunity-Jesters** — the locked lever stays locked. ⇒ **immunity-cancel is
  open, almost-empty relic space**, and disproportionately valuable in the solo-first game.
- **Hand size is the master lever** — it is ammo, discard-payment ceiling, and draw headroom in one
  number. `+1 max hand` is one of the strongest possible effects; **guard it.**
- **Matched low cards are premium**, not junk — a quad of 2s fires all four levers at once. Anything
  that helps assemble sets is secretly a power-lever.
- **The ♥→♦ pipeline is the only escape from a dry Tavern.** No Hearts + empty Tavern = the terminal
  death spiral. Recovery must create **immediate access**, never just future circulation.

TODO: complete from canon — deck sizes, hand cap, recruit tiers, fragment economy, Camp/forgiveness.

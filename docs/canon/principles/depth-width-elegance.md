---
kind: canon
edition: all
status: accepted
last_reviewed: 2026-06-18
---

# Depth vs. Width — and the Elegance test

**Status:** Canonical design vocabulary, 2026-06-18. This is the precise statement
of the "single-threaded loop" / "parallel load" idea, **corrected** so it no longer
reads as "make the game trivial." Read alongside [`golden-rules.md`](golden-rules.md)
Rule 1 (core loop) and Rule 6 (multi-scale synergy), and the
the dated [`assessment`](../../research/assessments/golden-rules-2026-06-18.md)
entries for #1 and #6, which this refines.

> **Correction it captures:** an earlier framing said the loop's stations should be
> resolved "one at a time, individually trivial, not competing." That was wrong and
> made good design look like dumbing-down. The stations **must** compete — that
> competition *is* the depth. The real rule is about the **shape** of the competition,
> not its absence.

---

## The two axes

Every decision in the game carries mental cost. There are two kinds, and they are
near-opposites:

- **DEPTH (tall).** Reasoning *across time*: anticipating future turns, sequencing a
  plan, foreseeing that spending now starves you later. Few variables, tracked over
  many moments, held as a **narrative you can tell yourself**. Humans thrive on this.
- **WIDTH (wide).** Reasoning *at a single instant*: pricing several **incommensurable**
  effects against each other to resolve **one** atomic action, with no common unit and
  no order to think in. Many variables, one moment. Humans choke on this — it's
  **accounting**, not strategy.

**Depth is the good cost. Width is the tax.** The whole craft is to put the
difficulty in the *tall* dimension (how far ahead must I see?) and keep it out of the
*wide* dimension (how many unlike things must I compute at once?).

Base Regicide's four-suit welding is the canonical width trap: one card's single
number is *simultaneously* damage **and** draw-count **and** heal **and** shield —
four incommensurable currencies, fired at once, with a per-play immunity exception.
To choose one play you run a spreadsheet. That's why it's hard to *teach* — and that
hardness buys no depth.

---

## Elegance = depth per unit of width

This is the shared vocabulary for judging any **feature** — a relic, a token, a class
loophole, a new station:

> **A feature is elegant when it adds DEPTH (more to plan across turns) without
> adding WIDTH (more unlike things to price in one instant). Elegance is the ratio.**

- A feature that buys **depth** earns its place — it gives the player a richer plan.
- A feature that imposes **width** is bloat, even if it sounds cool — it makes one
  decision heavier without making the game deeper. It's a tax dressed as content.
- Feature *count* is not the enemy; **width** is. You can add many features and stay
  elegant **if each one couples through the existing shared currency over time**, and
  none forces new instant arithmetic.

This is why "fewer power vehicles" (V3's economy collapse) reads as elegance: it
isn't about *less game* — it's about removing **width** (four kinds of power priced
against each other) while keeping **depth** (the deck-conquest plan).

---

## The dividing line: currency × timespan × choice

The stations of the loop **(draw → combine → kill → block → persist)** *should*
compete — they all spend from the **same scarce pool: your cards.** That shared-currency
competition, resolved across turns, is the planning. Here's good coupling vs. bad:

| | **GOOD coupling (depth)** | **BAD coupling (width)** |
|---|---|---|
| **Currency** | one shared unit (cards) | many incommensurable units (dmg vs draw vs heal vs shield) |
| **Timespan** | across turns — a plan you narrate | one instant — due now |
| **Choice** | you choose *when* to pay | all of it fires whether you want it or not |

**Co-resolving several stations is encouraged** when it's one currency over time. It
becomes tax only when it's many unlike currencies at one moment.

---

## Two worked examples (co-resolution done well vs. badly)

**WIDTH — bad (base Regicide, one play).**
Enemy: King of Spades, 40 HP, 20 atk, immune to ♠. Hand: `9♦ 8♥ 5♣ 4♠ 3♦`. To pick
one play you hold at once: four damage figures, a multi-player draw-cap calc, a
heal-worth judgment, the ♠-immunity exception (`4♠` is a trap), **and** the
discard-defense cost of every card. ~6 open, incommensurable variables, one instant,
no order. That's width. Mastery just means doing the arithmetic faster or going on
autopilot — the thinking gets *automated away*.

**DEPTH — good (the play the rule must protect).**
Enemy: 14 HP, 12 atk. Hand: `5♣ 5♦ 6♥ 4♠ 3♦`. Play `5♣` (doubled → 10, enemy to **4**).
A 12 counter is coming. My only "4" is `4♠` — next turn I want to leave the enemy at
*exactly* 0 to recruit it. So: **block with `4♠` now** (safe, lose my exact-kill tool)
or **block with `6♥+3♦` and hold `4♠`** for the precise kill next turn? This
co-resolves **kill + block + next-turn kill-setup** — but in **one currency (which
cards), across two turns.** Hard, non-trivial, *and* tall. This is the heart of the
game; the rule keeps it.

The two look similar ("a hard play with lots to weigh"). The difference is the
**shape**: wide-and-instant vs. tall-and-sequenced.

---

## The golden rule (canonical statement)

> **The stations of the loop must compete for one shared resource, resolved across
> turns as a plan — never force the player to price several incommensurable effects
> against each other in a single instant.**

Corollaries:
- **Easy ≠ good. Plannable = good.** Good load can be agonizingly hard to find; the
  hardness lives in foresight depth, not arithmetic width. Don't trivialize stations
  to "reduce thinking" — that's the opposite error.
- Each new station/loophole must **modify one existing station of the loop, never add
  a new simultaneous one** — the same guardrail the class-loophole tiers already carry.

---

## The two design tests (use these on every relic/feature)

1. **The depth-vs-width test:**
   *When a play is hard, is it hard because I can't see far enough ahead (depth — keep
   it), or because I'm comparing too many unlike things at once (width — cut it)?*

2. **The mastery test (the tell):**
   *As a player masters this feature, what gets better?*
   - **Depth:** they see *deeper chains* — plan four turns ahead instead of two. The
     thinking gets richer and never automates. ✅ Stack these freely.
   - **Width:** they do the *same arithmetic faster*, or memorize a heuristic and stop
     thinking. The feature gets *solved*, then ignored. ❌ This is the tax.

A feature that survives both tests is **elegant**: it adds planning the player will
never automate away. Stack elegance; refuse width.

---

## Why this matters for the relic-tree (the live decision)

Interacting relics are the vehicle for synergy and discovery (Rules 4 & 6) — but
interaction is *where width sneaks back in.* Hold the budget:

- A relic that makes you think *"should I bank shield this turn for a kill window next
  turn?"* adds **depth** (cross-turn, one currency) → ship it.
- A relic whose effect you can't resolve without re-computing two other relics' state
  *on the same play* adds **width** (incommensurable, instant) → cut it, however cool.

Push relic interaction into the **planning layer** (between fights, "this pairing
defines my run"), not the **resolution layer** (mid-play, "trace A→B→C to press one
button"). That keeps Rule 6 climbing while protecting Rule 1 — depth bought without
width is the entire game of elegance.

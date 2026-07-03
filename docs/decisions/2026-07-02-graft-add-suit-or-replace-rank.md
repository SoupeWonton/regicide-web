---
kind: decision
edition: v3
status: accepted
date: 2026-07-02
supersedes: [2026-06-20-replacement-graft-semantics]
---

# Design decision — exact-kill graft: ADD suit OR REPLACE rank

## Decision

The duplicate exact-kill graft offers two branches on one held card:

1. **REPLACE the number** — the card's rank becomes the slain enemy's rank
   (royal-capped at 10). This is a replacement: the old number is gone.
2. **ADD the suit** — the card keeps its own suit and *also* fires the slain
   enemy's suit. This is additive: the card now belongs to two suits at once.

Example: exact-killing an already-owned `7♦` lets the player either replace one
hand card's number with `7`, or add `♦` as a second active suit to one hand card
(a `5♠` becomes a `5♠♦` — it fires both spade and diamond powers).

This **reverses** the 2026-06-20 decision, which made both branches replacements.

## Rationale

Both branches must grow the deck, but on **different axes**, or one dominates:

- If suit were *also* a replacement, replace-number would almost always be
  strictly better — you rarely want to trade one suit for another of equal
  standing, whereas a bigger number is unconditionally useful. The suit branch
  would be dead.
- Making suit *additive* gives it its own upside — a card that satisfies two
  suit needs / fires two suit-powers — so the choice is genuinely contested:
  grow the **number** axis (raw value, payment, exact-kill reach) or the **suit**
  axis (breadth of suit-power, combo/immunity flexibility).

The "width cost" the 2026-06-20 decision worried about (multi-suit simultaneous
resolution) is acceptable and, in fact, already supported by the engine
(`cardSuits` unions a card's suits; combat resolves each independently).

## Consequences

- Transmute effects that genuinely *replace* a suit (Shrine **Consecrate**,
  **Press-gang** relic) keep replacement semantics — they use the `suit` graft
  kind. Only the exact-kill graft is additive (the new `suit-add` kind).
- A `suit-add` graft is a no-op (rejected) if the card already fires that suit.
- The C2 royal graft is unchanged for the value branch (rank cap 10); its suit
  branch is additive like everywhere else.
- Implemented: `GraftRecord.kind` gains `suit-add`; `effectiveSuits()` derives
  the fired-suit set; `cardSuits()` unions it into combat; the client graft
  picker reads "replace value" / "add suit"; smoke Test A2 asserts the additive
  behavior. Canon page [[v3/mechanics/replacement-grafts]] updated.

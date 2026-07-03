---
kind: decision
edition: v3
status: superseded
superseded_by: 2026-07-02-graft-add-suit-or-replace-rank
date: 2026-06-20
supersedes: [additive-hone-and-suit-graft]
---

> **SUPERSEDED (2026-07-02).** The suit branch is now *additive* again (add a
> second active suit), while the rank branch stays a replacement — so the two
> exact-kill branches grow the deck on different axes and neither dominates. See
> [2026-07-02-graft-add-suit-or-replace-rank](2026-07-02-graft-add-suit-or-replace-rank.md).
> This page is kept for history only.

# Design decision — replacement graft semantics

## Correction

The duplicate exact-kill graft was misunderstood in earlier documentation and in the
current vertical slice. It is a replacement mechanic, not an additive bonus.

When the player exact-kills an enemy card already recruited:

1. Choose one card currently in hand.
2. Choose one of two permanent changes:
   - replace that card's rank with the defeated enemy's rank; or
   - replace that card's suit with the defeated enemy's suit.

Example: exact-killing an already-owned `7♠` lets the player replace one hand card's
rank with `7` or replace one hand card's suit with `♠`.

The reward does **not** add `+1` value and does **not** add a second suit.

## Rationale

Replacement is more elegant than additive accumulation:

- It changes card identity instead of decorating arithmetic.
- It stays inside the recognizable rank/suit vocabulary.
- It avoids multi-suit simultaneous resolution and its width cost.
- It creates a contextual tradeoff because improving one property may surrender
  another useful property.
- The defeated card's exact identity matters directly.

## Consequences

- Hone (`+1`) is not the redundant exact-kill rank reward.
- Added-suit Graft is not the redundant exact-kill suit reward.
- Current code, UI, smoke tests, simulator assumptions, saves, and card rendering encode
  the wrong additive semantics and require a later delivery migration.
- Target eligibility, repeat overwrites, no-op handling, card-history presentation, and
  Forge interaction remain detailed design questions unless separately accepted.

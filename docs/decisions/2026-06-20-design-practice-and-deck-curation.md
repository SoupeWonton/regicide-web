---
kind: decision
edition: v3
status: accepted
date: 2026-06-20
supersedes: [no-exile-constraint]
---

# Design decision — practice, authority, and deck curation

## Decision

Regicide Web is explicitly design-led:

- Landry is the game designer and developer. He describes the game, frames hypotheses,
  proposes design axes, records accepted direction, and develops accordingly.
- Gab is co-founder and UI/UX lead, with strong game-mechanics intuition contributing
  to design review.
- Implementation begins after design consensus between Landry and Gab.
- Design work focuses on unexplored axes and unresolved hypotheses. “Unimplemented” is
  tracked separately as a delivery state and must not be presented as unexplored design.

The absolute **NO-EXILE** constraint is withdrawn. Permanent removal is now an open
design axis: it is not automatically part of V3, but it is no longer forbidden. Any
specific removal mechanic still requires exploration, consensus, canon, and delivery
scope before implementation.

## Rationale

The previous workflow mixed two different questions: what the game should be and what
the current code already does. That makes implementation gaps appear to be design gaps
and can prematurely close unexplored space.

Similarly, NO-EXILE selected one answer before deck consistency, conquest identity,
removal costs, and player agency had been compared as design axes. Removing the
prohibition restores that investigation without discarding conquest-first acquisition.

## Consequences

- Reviews lead with accepted foundations, unexplored space, hypotheses, and axes.
- Prototypes and current code provide evidence but do not decide open design questions.
- Consensus converts a proposal into intended behavior; delivery then tracks and builds
  it.
- Existing behavior remains unchanged until a specific card-removal design is accepted.
- “You don't build a deck—you conquer one” remains the V3 hook: newly acquired cards
  still come from the starting court or defeated enemies.

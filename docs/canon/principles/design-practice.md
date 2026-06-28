---
kind: canon
edition: all
status: accepted
last_reviewed: 2026-06-20
---

# Design practice and authority

Regicide Web is a design-led project. Its main working material is the game design:
the game description, the hypotheses behind it, the axes along which it could develop,
and the decisions that resolve those axes.

## Roles

- **Landry — game designer and developer.** Landry owns describing the game, framing
  design hypotheses, proposing useful design axes, recording decisions, and developing
  the accepted direction.
- **Gab — co-founder and UI/UX lead.** Gab owns UI/UX direction and contributes strong
  game-mechanics judgment to design review.

Design decisions are reached through discussion and consensus between Landry and Gab.
Implementation follows consensus; implementation does not silently settle an unresolved
design question.

## Design state is not delivery state

Every topic must be described using the correct state:

- **Accepted:** consensus exists. Canon states the intended behavior and implementation
  may proceed.
- **Unexplored:** the project has not yet framed or investigated the relevant choices.
- **Exploring:** alternatives, pressures, and hypotheses are being compared; no option
  is yet authoritative.
- **Proposed:** a concrete direction is ready for consensus but is not canon.
- **Rejected or superseded:** retained only as design history.
- **Unimplemented:** accepted behavior that has not yet shipped. This is a delivery
  state, not an open design axis.

The design workplace prioritizes what is **unexplored, exploring, or awaiting
consensus**. A comparison against code must not mistake “not implemented” for “not
designed,” and a design review must not use implementation effort as the default measure
of importance.

## Required design sequence

1. Describe the player experience and the current game accurately.
2. State the unresolved question as one or more explicit axes.
3. Identify the hypotheses, pressures, tradeoffs, and consequences on each axis.
4. Develop concrete alternatives far enough for Landry and Gab to evaluate them.
5. Reach consensus and record the decision in canon and a dated decision record.
6. Reflect the accepted scope in delivery status, then implement and verify it.

Prototypes, simulations, and code experiments may inform design, but they remain
evidence until consensus makes their behavior authoritative.

## Review standard

Design reviews should lead with:

- what is already accepted;
- what is genuinely unexplored;
- which hypothesis is being tested;
- which axes offer meaningfully different player experiences;
- what evidence would distinguish the alternatives; and
- what consensus is required before implementation.

Implementation gaps belong in `docs/delivery/`. Proposals and research may expose
unexplored space, but they never override canon.

---
kind: canon
edition: v3
status: accepted
last_reviewed: 2026-06-18
---

# Core loop

The player resolves a sequence of small decisions:

**draw → combine → kill → block → persist**

Each station should be understandable on its own. New mechanics may modify one
station, but should not add another simultaneous subsystem the player must track.

An exact kill has one immediate result:

- Defeat a card not owned: recruit it.
- Defeat a card already owned: choose one card in hand and permanently replace either
  its rank with the defeated card's rank or its suit with the defeated card's suit.

Example: after exact-killing an already-owned `7♠`, choose one card in hand and either
replace its rank with `7` or replace its current suit with `♠`. The graft replaces a
property; it does not add `+1` and does not add a second suit.

A graft fires only on an exact kill of an **already-recruited** card and replaces the
**suit OR the value (rank)** of one held card — never both. **Royal grafts cap the value at
10:** exact-killing a Jack/Queen/King (e.g. at a C2 gate) triggers a graft, but a royal
cannot push a card's value above 10. (Source:
[`../../decisions/2026-06-27-v3.0-question-sweep.md`](../../decisions/2026-06-27-v3.0-question-sweep.md).)

The Ace remains a low-rank starting companion and contributes `+1` to a play.

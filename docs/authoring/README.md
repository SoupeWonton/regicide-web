---
kind: authoring
status: scaffold
last_reviewed: 2026-06-28
---

# Content Authoring Kit

**Purpose.** One place to look *before* proposing new game content — a relic, spell, class ladder,
class staff, or landmark — so a draft respects the locked rules and does not duplicate what already
exists. The rules live in canon; this kit makes them **reachable in one read** when authoring, which
is what keeps fresh drafts from drifting.

> **Status: scaffold (2026-06-28).** Skeleton seeded with what is already locked; sections marked
> `TODO` are for brainstorming to fill. This kit never overrides canon — if it disagrees with
> [canon](../canon/README.md), **canon wins.**

## How to use it (the authoring sequence)

1. **Read the invariants** — [`rules-digest.md`](rules-digest.md) + [`negative-space.md`](negative-space.md).
2. **Read the type checklist** — `checklists/<type>.md`.
3. **Check for collisions** — the relevant section of [`inventory.md`](inventory.md).
4. **Draft** into the matching `templates/<type>.md`.
5. **Run the self-review gate** at the bottom of the type checklist; only then does the draft land in
   [`../proposals/`](../proposals/README.md).

## Map

| File | Holds |
|---|---|
| [`rules-digest.md`](rules-digest.md) | The hard mechanical invariants new content must not break (index into canon) |
| [`negative-space.md`](negative-space.md) | The explicit "do NOT propose" list, with the why |
| [`inventory.md`](inventory.md) | What already exists — the collision map |
| `checklists/` | Per-type kit: the bar · pre-flight · worked example · self-review gate |
| `templates/` | Blank fill-in stubs matching the candidate format |

## Sources this kit indexes (link, do not duplicate)

- **Rules:** [`core-loop`](../canon/v3/core-loop.md) · [`constraints`](../canon/v3/constraints.md) · [`deck-and-grafts`](../canon/v3/systems/deck-and-grafts.md)
- **Bar:** [`golden-rules`](../canon/principles/golden-rules.md) · [`content-bar`](../canon/principles/content-bar.md) · [`depth-width-elegance`](../canon/principles/depth-width-elegance.md)
- **Practice:** [`design-practice`](../canon/principles/design-practice.md)

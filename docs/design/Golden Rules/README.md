# Golden Rules — index & scoring philosophy

This folder tracks how Regicide measures against the roguelite/deckbuilder design
principles in [`Roguelite.txt`](./Roguelite.txt). It exists for **traceability**:
each assessment is a dated snapshot so we can watch the profile move as the design
and the code evolve.

## Files

| File | What it is |
|---|---|
| [`Roguelite.txt`](./Roguelite.txt) | The 11 golden rules (the rubric). Source of truth — do not edit to fit the game. |
| [`depth-vs-width-and-elegance.md`](./depth-vs-width-and-elegance.md) | The shared vocabulary: **depth (tall) vs width (wide)**, elegance = depth per unit of width, and the two design tests for any new feature/relic. Refines Rule 1 & Rule 6. |
| [`assessment-2026-06-18.md`](./assessment-2026-06-18.md) | Current snapshot: per-rule score, why, what caps it, and the north-star sentence to raise it. Scored against **V3-as-designed + the relic-tree vehicle**. |

When the design moves materially, **copy** the latest `assessment-*.md` to a new
dated file and edit that — keep the old ones for the trail. Never overwrite a
dated snapshot.

## How to read the scores (the important part)

**We are NOT trying to hit 100% on every rule. That target is self-defeating.**

1. **The rules fight each other.** Rule 1 (a clean, deep core loop) is in tension
   with Rule 6 (synergies at multiple scales / unexpected combinations), because
   **synergy can sneak in as *width*** — unlike effects you must price at one
   instant — instead of as *depth* — a plan you sequence across turns. (See
   [`depth-vs-width-and-elegance.md`](./depth-vs-width-and-elegance.md); the goal is
   synergy that adds depth, not width.) Rule 9 (constant interesting decisions)
   pulls the same way. You can't maximize a tension pair; pushing one down-presses
   the other.
2. **Great roguelites are spiky, not flat.** Identity comes from what a game
   *over-delivers*, not from being uniformly competent. A flat-85 game is
   forgettable; a 130/130/60 game gets named.
3. **So we design a deliberate profile, not a ceiling:**
   - **Signature axes** — the 2–3 we intentionally push *past* 100% and let
     define the game. For V3 these are **#1 core loop, #5 story, #7 mechanical
     identity.**
   - **Floor axes** — the rest. Keep them above ~50% so they're not *holes*,
     but don't chase them.
   - The real job: tell an **intentionally-low** axis ("not our game") apart
     from an **accidentally-low** one ("we just haven't built it"). Only the
     second is a bug.

### The budget tension to hold (V3-specific)

> Interacting relics are the vehicle for multi-scale synergy and discovery (raises
> #6, #4) — but interaction is exactly where **width** sneaks back in (lowers #1,
> our signature axis). The fix is not "no interaction"; it's keeping relic
> interaction in the **planning layer** (between fights, "this pairing defines my
> run") and out of the **resolution layer** (mid-play arithmetic). Spend the width
> budget on purpose — see the elegance test in
> [`depth-vs-width-and-elegance.md`](./depth-vs-width-and-elegance.md).

## Scoring scale

Subjective design judgment, not a measured metric. ~10-point bands:

- **90–100+** — a signature strength; the game over-delivers here.
- **70–85** — solidly honored; a clear asset.
- **50–65** — present but partial; works, not yet a strength.
- **<50** — a hole: either un-built or actively contradicted. Decide if it's
  intentional (then it's a floor we accept) or a bug (then fix it).

Each entry also distinguishes **as-built** (what ships today) from
**as-designed** (what the current canon promises if built), because most of V3 is
spec, not code.

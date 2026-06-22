# Road

Road system rules for v0.

## Generation Model

- Deterministic seeds are mandatory.
- Maps are handcrafted per chapter.
- Each chapter should support multiple authored variants for A/B testing (target around 10 over time).
- Backend may apply deterministic permutations while preserving authored balance budgets.

## Landmark Visibility Model

- Players see partial map information only.
- Target visibility is about 40-50% known and 50-60% unknown.
- Unknown landmarks can resolve to one of multiple authored outcomes based on incoming path.
- The unknown presentation remains player-facing even when backend resolution differs.

## Commitment Model

- Landmark commitment is one-way until destination resolution.
- Forks may reconnect, but path commitment still matters for budget control.
- Players cannot freely pivot destination mid-travel unless a specific event explicitly allows it.

## Budget Model Integration

Road evaluation uses hidden balancing values:
- TC as travel pressure cost
- DV as destination reward value

These values are:
- backend-only
- not shown in UI
- scaled by chapter and player count

## Camps As Landmarks And Interludes

Camp appears as:
- a road landmark in authored map flow
- the mandatory pre-boss interlude
- an emergency stop after Retreat

Camp functions include:
- replacement hero onboarding
- preparation activation for next encounter
- team planning and readiness decisions

## Encounter Start Reset Rule

For v0 encounter handling, every encounter entered from camp/interlude starts fresh:
- discard is shuffled into Tavern
- players redraw to max hand size
- shield carryover is cleared

This is true for:
- normal encounters
- elite encounters
- boss encounters

## Landmark Reward Identity

Landmarks define reward identity and risk profile.

- safer nodes: lower variance rewards
- high-risk nodes: rare reward access and/or stronger tradeoffs

Rare outcomes should be tied to:
- high-risk encounters
- elite requirements
- or explicit resource sacrifice

Landmark taxonomy and CT normalization are defined in ../systems/landmarks.md.

Encounter tiering must be template-first:

- chapter templates and authored route pressure define baseline encounter tier
- party CT may apply slight scaling only
- party CT must not fully determine encounter tiering

## Implementation Notes For v0

Minimum road implementation should support:
- deterministic seed input
- deterministic chapter variant selection
- backend-forced landmark outcome for test mode
- backend-forced reward outcome for test mode
- replayable route traces for balance comparison
- node-level logging of reward CT, pressure CT, and net CT

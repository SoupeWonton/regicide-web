# Landmark Taxonomy

Landmark taxonomy for v0 CT balancing.

## Purpose

Landmarks are thematic route identities with controlled CT variance.

Canonical reward rule:

- Standard landmark reward target: about +0.25 Tolerance CT
- Rare or high-risk landmark reward target: about +0.75 Tolerance CT

If a landmark grants more than those values, it must also carry pressure, gating, or explicit cost.

## Balancing Guardrail

Do not make landmark options obviously dominant.

Every landmark should be:
- viable
- distinct
- close in expected net gain
- different in variance and risk profile

## Landmark Evaluation Formula

Net CT Gain = Reward CT - Travel Pressure CT - Explicit Cost CT

Where:
- Reward CT is tolerance gained from rewards/effects
- Travel Pressure CT is road or elite pressure required to reach/clear the node
- Explicit Cost CT is direct cost paid by the player (mill, discard, lost options)

## Landmark Profiles

## Forge

Theme: mutation and card refinement.

Standard target:
- Upgrade one card by +1 for this chapter.
- CT target: about +0.25

Rare/high-risk direction:
- Convert one 2 into an Animal Companion for this chapter.
- Add explicit mill cost (recommended baseline: mill 5).
- CT target: about +0.75 when tuned with the cost.

Design warning:
- Mill 10 is highly volatile and can over-punish road state before camp.
- If mill 10 remains, payout must be rare-tier and carefully gated.

## Abbey

Theme: disciplined recovery and refinement.

Standard target:
- Exile or recover 2 cards from discard.
- CT target: about +0.25 (up to +0.5 depending on permanence and timing).

Rare/high-risk direction:
- Low-rank amplification effect (cards below 5 doubled) with strict duration.
- Must declare duration explicitly:
  - next encounter only, or
  - until next camp, or
  - whole chapter (rare only, likely very strong).

Design warning:
- Whole-chapter low-rank doubling is likely above standard and should be rare-tier at minimum.

## Market

Theme: flexibility and value correction.

Standard target:
- Gain 1 value-adjust token.
- Example token: discard 1 to increase or decrease a played card by 1.
- CT target: about +0.25

Rare/high-risk direction:
- Gain 2 value-adjust tokens, or access wider reward choice pool.
- CT target: about +0.75 depending on token constraints.

Design note:
- Value adjustment is powerful for exact kills and survival math; cap usage tightly.

## Lair

Theme: risk spike for rare payoff.

Baseline model:
- Fight elite gate.
- Win gives rare item access.
- Lose/retreat gives nothing or partial fallback.

Pressure/reward tuning:
- Travel or encounter pressure: about +0.75 to +1.25 Pressure CT
- Reward payout: about +0.75 to +1.5 Tolerance CT

Design rule:
- Expected net gain should remain near other landmarks, with higher variance.

## Tower

Theme: initiative and information control.

Standard target:
- Choose starting player for next encounter only.
- CT target: about +0.25

Rare/high-risk direction:
- Choose starting player for each non-boss road encounter for rest of chapter.
- CT target: about +0.75

Design warning:
- Global starter control for all encounters is too strong at standard tier.
- Boss starter manipulation should be preparation-space, not baseline Tower reward.

## Shrine

Theme: deck restoration and burst access.

Standard target:
- Shuffle up to 5 discard cards into Tavern, then one player draws 2.
- CT target: about +0.25

Rare/high-risk direction:
- Shuffle up to 5 discard cards into Tavern, then each player draws 1.
- Stronger variants (including each player draws 2) should be rare-tier and gated.

Design warning:
- In 4-player, everyone draws 2 is a very large swing and not standard-tier.

## Encounter Tiering Interaction

Between landmarks, encounters consume Pressure CT.

Tuning rule:
- Use chapter template and authored route first.
- Apply party CT only as slight scaling, not full tier control.

Reason:
- If party CT fully drives encounter tier, upgrades feel like punishment.
- Progression must feel rewarding, not self-canceling.

## Implementation Hooks

For deterministic testing:
- fixed seed and route trace
- forced landmark outcome
- forced reward bundle
- logging of Reward CT, Pressure CT, and Net CT per node

## Open Tuning Targets

- Final duration rule for Abbey low-rank doubling effect.
- Final mill cost threshold for Forge Animal Companion conversion.
- Final cap and frequency for Market value-adjust tokens.
- Final Shrine group-draw ceiling by player count.
- Final Lair fallback payout rule on failure/retreat.

# Open Questions And Resolved Decisions

This file now tracks what is decided for v0 and what remains open for later iterations.

## Decided For v0

### 1) Implementation Scope

- Scope is Chapter 1 and Chapter 2 only.
- Chapter 1 is near-base Regicide with campaign systems layered on top.
- Chapter 2 is intended to be significantly harder and more rewarding.
- Existing multiplayer/lobby foundation remains in scope.
- Multiple campaigns can exist at once.
- Save state is required so progression does not reset on reload.

### 2) Campaign Start And End

- Campaign setup flow is Kingdom -> Chapter -> Team.
- Campaign identity is tied to team lineage. One death plus replacement keeps the same campaign.
- Players may start from unlocked chapters with a fresh run seed.
- Starting from later chapters does not grant assumed Memories.
- Chapter 1 start does not allow specializations.
- Campaign ends when all heroes are dead or players intentionally switch team/lineage.
- Starting with a different team is a new campaign and drops old-team Memories.
- Manual abandon keeps Kingdom unlock progression (chapter/class unlocks).

### 3) Road Generation

- Deterministic seeds are mandatory.
- Maps are handcrafted per chapter with a finite set of variants (target ~10 per chapter for A/B testing).
- Backend may apply deterministic permutations while preserving authored budgets.
- Landmark commitment is one-way until destination resolution.
- Visibility is partial by design (target about 40-50% visible, rest unknown).

### 4) Destination Value And Travel Cost

- DV and TC are backend balancing abstractions, not UI stats.
- DV and TC scale with chapter and player count.
- Rare reward outcomes require compensation, higher risk, elite challenge, or meaningful tradeoff.
- Unknown landmarks may resolve differently by incoming path while still appearing unknown to players.
- Landmark reward targets follow taxonomy normalization: standard about +0.25 CT, rare/high-risk about +0.75 CT unless explicit pressure/cost offsets are present.

### 5) CT As A System

- CT is a design/debug metric only.
- CT is not player-facing and does not need runtime display.
- CT can be recalibrated after playtests without rewriting core fantasy.

### 6) Class Loadout Rules

- Campaign starts with core heroes only.
- One player controls one hero.
- Tier 2 and Tier 3 classes unlock through progression.
- Mid-campaign replacement into Tier 2/Tier 3 is allowed through death flow and camp recruitment choices.
- Specializations unlock after Chapter 1 completion.

### 7) Death And Replacement

- On hero death, team votes on Retreat versus Last Stand.
- Dead player still participates in the vote.
- If vote is not unanimous, allow deliberation time and then resolve via game rule timeout.
- Replacement can join immediately with reduced bonus package, or at camp with stronger onboarding bonuses.
- Replacement options are a randomized subset linked to the dead hero lineage.
- Replacement class must differ from the class that died.
- On boss encounters, Retreat is disabled after death. Team must finish the boss or wipe.

### 8) Camp Rules

- Camp is a landmark/interlude system and also the emergency stop after Retreat.
- Every encounter entered from camp starts with a fresh Tavern state:
  - discard shuffled into Tavern,
  - all hands returned then redrawn to max hand size,
  - previous encounter shield state cleared.
- Camp allows dead-hero replacement.
- Preparations are camp-activated consumables and can target the next encounter (boss or non-boss).
- Preparations use Standard 0.25 CT and Rare 0.75 CT valuation.
- Suggested encounter loadout cap: 2 active preparations at a time.
- No item buying at camp in v0. Camp is activate/select, not shop.
- Relics and spells come from rewards and specific landmarks, not camp store flow.
- Boss pre-fight camp is mandatory and cannot be skipped.

### 9) Boss Structure

- Chapter 1 boss is literal base Regicide castle sequence (12 enemies), no modifier.
- Chapter 2 boss implementation remains open in detail, but must be harder and high-reward.
- Chapter 2 may use hidden boss modifiers.
- Certain landmarks may reveal boss intel as preparation support.

### 10) Item Economy

- Relics are hero-owned (one relic slot per hero in v0, swappable by discard/replace).
- Spells are team-owned resources.
- Preparations are team-owned camp activations.
- Rare item access comes from high-risk content, special terrain, or explicit tradeoffs.
- Landmark identity constrains item sourcing.
- Some standard encounters may also drop items under controlled tables.

### 11) Memories

- At chapter end, each surviving hero receives a 3-choice Memory draft.
- Draft options are drawn from a shared global pool (target ~15 total memory designs in v0).
- Memory value baseline is 0.25 CT each.
- Memory persists until that hero dies or retires.

### 12) Save Data And Meta Progression

- Kingdom progression is permanent unlock state.
- Permanent unlocks include at least: chapters and classes.
- Unlocks may come from chapter completion, deaths, and specific landmarks.
- Optional meta currency can be awarded from death, boss loss, and chapter victory.
- Meta currency can be spent in Kingdom for class/spec/chapter unlock paths.
- Campaign saves are independent from each other.

### 13) Playtest Harness

- Deterministic seed controls are required in v0.
- Admin/debug controls are required to force:
  - reward outcomes,
  - landmark outcomes,
  - unlock states.
- Debug/admin controls are for testing, not default player UI.
- Landmark test logging should capture reward CT, pressure CT, and net CT per node for balancing comparisons.

## Still Open

- Final tiebreak rule for non-unanimous death votes (majority, timeout default, or host decision).
- Exact Chapter 2 boss rules and modifier pool.
- Exact number of encounter-level preparation slots (currently proposed at 2).
- Final map variant count per chapter (target ~10, can ship lower then grow).
- Whether meta currency ships in first v0 cut or in a short follow-up.
- Final duration for Abbey low-rank doubling effect (next encounter, until next camp, or whole chapter rare-only).
- Final Forge Animal Companion mill cost threshold (recommended baseline mill 5; mill 10 only with stronger payout/gating).
- Final Market value-adjust token cap and recharge frequency.
- Final Shrine group-draw ceiling by player count and rarity gate.
- Final Lair fallback payout on loss/retreat (none versus partial currency).

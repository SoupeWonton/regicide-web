# Campaign Bible

Canonical campaign rules for v0. If another design file conflicts with this file, this file wins.

## v0 Scope

- Shipping scope is Chapter 1 and Chapter 2 only.
- Chapter 1 is near-base Regicide with campaign layering.
- Chapter 2 is intentionally harder and higher reward.
- Multiplayer remains supported on top of the existing lobby foundation.

Deferred for post-v0:
- Chapter 3+
- ascension mode structure
- final Chapter 2 boss modifier pool lock

## Campaign Identity

A campaign is one team lineage across chapters.

A campaign starts when players lock:
- Kingdom profile
- starting chapter
- team

A campaign continues if one hero dies and is replaced.

A campaign ends when:
- all heroes are dead, or
- players intentionally abandon that lineage and start with a different team.

Multiple campaigns may exist at the same time.
Campaign saves are independent from each other.

Manual abandon does not remove Kingdom-level unlock progression.

## Persistence Layers

### Kingdom layer (always persistent)

- chapter unlocks
- class unlocks
- specialization unlock permissions
- optional meta currency totals

Kingdom progression is permanent unlock state.

### Hero layer (conditional)

- hero Memories
- hero specialization state
- lineage links to replacement heroes

Hero-layer Memory rules:
- at chapter end, each surviving hero receives a 3-choice Memory draft
- draft options come from a shared global pool (target about 15 Memory designs in v0)
- baseline Memory value target is 0.25 CT each

Hero-layer progression is lost when that hero dies or retires.

### Campaign-run layer (save-bound)

- current chapter progress
- current team composition
- encounter path state
- current inventory state

Campaign-run layer persists in save files and can be resumed later.

## Start Rules

- Chapter 1 starts without specializations.
- Completing Chapter 1 unlocks specialization access for future starts where eligible.
- Starting from later unlocked chapters uses a fresh run seed and does not grant assumed Memories.
- Campaign setup flow is Kingdom -> Chapter -> Team.

## Death, Vote, And Replacement

When a hero dies outside boss lock:
- team votes Retreat or Last Stand
- dead player participates in vote
- if no unanimous vote, allow deliberation and resolve using host/game timeout rule

Replacement rules:
- replacement class must be different from the class that died
- replacement is offered from a randomized subset linked to lineage context
- replacement can join immediately with reduced onboarding bonuses, or
- replacement can join at camp/interlude with stronger onboarding bonuses

Replacement source rules:
- replacement options are a randomized subset linked to the dead hero lineage
- Tier 2 and Tier 3 classes may enter mid-campaign via this replacement flow

On boss encounters:
- Retreat is disabled after hero death
- team must defeat the boss or wipe

## Interludes And Camps

Interludes are the planning windows before and after chapter bosses. Camp is also a road landmark and emergency stop after Retreat.

Camp/interlude capabilities:
- replace dead heroes
- activate preparations for next encounter
- perform team planning actions

Boss pre-fight camp is mandatory and cannot be skipped.

Camp is not a v0 item shop. Camp/interlude is selection/activation/planning, not direct buying.

## Encounter Reset Rule

For v0, every encounter entered from camp/interlude starts from a fresh Tavern state:
- discard shuffled into Tavern
- all hands returned and redrawn to full hand size
- shield carryover cleared

This applies to normal, elite, and boss encounters entered from camp/interlude flow.

## Road Canon

Generation and structure:
- deterministic seeds are mandatory
- maps are handcrafted per chapter
- each chapter supports multiple authored variants (target around 10 over time)
- backend may apply deterministic permutations while preserving authored budgets

Visibility and commitment:
- map information is partial by design (target around 40-50% visible)
- unknown landmarks can resolve differently based on incoming path while still appearing unknown to players
- landmark commitment is one-way until destination resolution unless an explicit event overrides it

Budget model:
- Travel Cost (TC) and Destination Value (DV) are backend balancing values only
- TC and DV are not player-facing UI values
- TC and DV scale by chapter and player count
- landmark reward targets follow taxonomy normalization (standard around +0.25 CT, rare/high-risk around +0.75 CT unless offset)

Encounter tiering:
- chapter templates and authored route pressure define baseline encounter tiers
- party CT can apply slight scaling only
- party CT must not fully determine encounter tiering

## Item Ownership Model

- Relics are hero-owned.
- Spells are team-owned.
- Preparations are team-owned camp activations.

Relic slot canon for v0:
- one relic slot per hero
- relic swaps use discard/replace behavior

Preparations are not boss-only in v0. They can target the next encounter, boss or non-boss.

Preparation constraints:
- no camp purchasing flow in v0
- proposed active encounter cap is 2 preparations at once (balance target, not final lock)

## Rewards And Budgets

- Destination Value and Travel Cost are backend balancing abstractions.
- They are not exposed as player UI stats.
- They scale by chapter and player count.
- Rare outcomes require high-risk nodes, elite gates, or explicit tradeoffs.

CT usage canon:
- CT is a design/debug balancing metric
- CT is not player-facing
- CT can be recalibrated after playtests without rewriting core fantasy

## Boss Canon

### Chapter 1 boss

- literal base Regicide castle sequence (12 enemies)
- no modifier

### Chapter 2 boss

- harder than Chapter 1 by design
- exact modifier set is intentionally left open for playtest iteration
- modifiers can be hidden unless revealed by specific intel landmarks

## Meta Progression

Persistent Kingdom unlocks include:
- chapter unlocks
- class unlocks

Additional unlock channels can include:
- specialization unlocks
- class mastery tracks
- optional currency spends

Potential currency sources include death, boss loss, and chapter victory.

Class unlock model:
- campaign starts with Tier 1 core heroes
- Tier 2 and Tier 3 unlock through progression

Core Tier 1 roster:
- Sentinel
- Quartermaster
- Surgeon
- Executioner

Current Tier 2 roster:
- Commander
- Warden

Current Tier 3 roster:
- Gambler
- Exile
- Oracle

## Admin And Playtest Controls

v0 must support deterministic testing controls:
- deterministic seeds
- force reward outcome
- force landmark outcome
- force unlock states

Playtest logging should capture per-node:
- reward CT
- pressure CT
- net CT

These controls are debug/admin features, not baseline player UI.

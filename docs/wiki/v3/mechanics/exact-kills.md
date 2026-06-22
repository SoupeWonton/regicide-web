---
type: concept
status: current
authority: derived
topics: [combat, progression, exact-kill]
search_terms: [Kingfall exact kill, recruit card, overkill, owned enemy reward]
sources: [canon/v3/core-loop.md, canon/v3/constraints.md, canon/v3/systems/deck-and-grafts.md, decisions/2026-06-18-v3-foundation.md, decisions/2026-06-20-replacement-graft-semantics.md, delivery/current-state.md, proposals/open-design-questions.md, proposals/systems/deck-lifecycle.md, research/assessments/canonical-drift-blast-radius.md]
aliases: [Exact Kill Reward]
last_updated: 2026-06-20
---

# Exact kills

**Summary:** Landing an enemy exactly at zero is the bridge between tactical combat and permanent deck progression.

## What it is

An exact kill on an unowned enemy recruits that card. An exact kill on an enemy already owned pauses resolution so the player can apply a permanent rank-or-suit replacement to a card currently in hand. (sources: [[canon/v3/core-loop|Core loop]], [[canon/v3/systems/deck-and-grafts|Deck and grafts]])

The reward resolves immediately rather than creating a fragment wallet or delayed shop purchase. This preserves one progression verb and keeps the defeated card's identity meaningful. (sources: [[decisions/2026-06-18-v3-foundation|V3 foundation]], [[canon/v3/constraints|V3 constraints]])

Non-exact kills do not currently provide permanent conquest rewards. Recruitment recurrence and recovery are open because repeated misses may create either valuable consequence or an unrecoverable power spiral. (sources: [[research/assessments/canonical-drift-blast-radius|Blast radius]], [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

Exactness is both a tactical constraint and an acquisition price. Maximum damage may end an enemy safely, but preserving a numerical answer across attack, counterattack, draw, and combination can permanently improve the expedition. Widening the window through [[v3/classes/executioner|Executioner]] therefore changes the future deck, not only damage. (sources: [[canon/v3/core-loop|Core loop]], [[research/assessments/canonical-drift-blast-radius|Blast radius]])

Resolution must validate ownership, target-in-hand eligibility, property choice, and encounter sequencing before mutation. Disconnects, reconnects, and empty-target states belong to the mechanic's contract because every successful campaign action persists immediately. Telemetry should distinguish exact, overkill, missed acquisition, target card, and graft choice so pressure can be separated from misunderstanding. (sources: [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]], [[delivery/current-state|Current state]])

## Confirmed design

An unowned exact kill recruits the enemy. An owned exact kill targets one card in hand and replaces either rank or suit. The reward resolves immediately and does not create fragments. (sources: [[canon/v3/core-loop|Core loop]], [[canon/v3/systems/deck-and-grafts|Deck and grafts]])

## Not yet decided

The project still needs exact rules for illegal/no-op targets, overwrite history, reconnect edge cases, recovery after missed acquisition, and character-specific window changes. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[proposals/open-design-questions|Active design questions]])

## Implementation status

The developed reward phase exists but currently applies the wrong additive semantics. Recruitment and replacement delivery must be reverified together during migration. (source: [[delivery/current-state|Current state]])

## Related pages

- [[v3/mechanics/conquest-first-acquisition]]
- [[v3/mechanics/replacement-grafts]]
- [[v3/classes/executioner]]

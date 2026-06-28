---
type: concept
status: current
authority: derived
topics: [deck, grafts, card-identity]
search_terms: [Kingfall graft, rank replacement, suit replacement, duplicate exact kill, card upgrade]
sources: [canon/principles/golden-rules.md, canon/v3/systems/deck-and-grafts.md, decisions/2026-06-20-replacement-graft-semantics.md, delivery/current-state.md, proposals/systems/deck-lifecycle.md, research/assessments/canonical-drift-blast-radius.md]
aliases: [Rank Graft, Suit Graft]
last_updated: 2026-06-20
---

# Replacement grafts

**Summary:** A duplicate exact kill permanently replaces one hand card's rank or suit with the defeated enemy's corresponding property.

## What it is

After exact-killing an owned enemy, the player chooses one card currently in hand and either replaces its rank with the enemy rank or replaces its suit with the enemy suit. A defeated `7♠` supplies rank `7` or suit `♠`. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

Replacement changes card identity and forces a contextual tradeoff because a useful existing property may be surrendered. It never grants a flat `+1` or an additional simultaneous suit. (source: [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

Legal targets, repeat overwrites, no-op handling, card history, Forge movement, and printed-versus-effective rule interactions remain open. The developed vertical slice still implements additive Hone and added-suit behavior, so code, UI, tests, saves, and simulations require migration. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[delivery/current-state|Current state]])

Replacement creates a contextual tradeoff. Raising a low card to rank seven may improve damage and payment while losing an exact-kill number; changing suit may enter a class engine while surrendering recovery or draw. Unlike additive power, one line becomes stronger because another property is given up. (sources: [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]], [[canon/principles/golden-rules|Golden rules]])

The identity blast radius includes damage, blocking, suit-power magnitude, combination legality, immunity, exact values, rendering, saves, bots, and tutorial language. UI must show current identity and provenance without implying two active suits. (source: [[research/assessments/canonical-drift-blast-radius|Blast radius]])

No-op policy, repeated overwrites, printed history, effective-property rules, and [[v3/mechanics/forge-and-landmarks|Forge]] movement remain open because each changes permanence and ownership. They depend on expected deck sizes from the wider lifecycle decision. (source: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

## Confirmed design

The player selects one card currently in hand and replaces its rank with the defeated rank or its suit with the defeated suit. Replacement is permanent, never a flat `+1`, and never an additional active suit. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

## Not yet decided

Legal targets, no-op handling, repeated overwrites, original-card history, Forge movement, and which combat rules read printed versus effective properties remain open. (source: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

## Implementation status

The current build adds Hone value or a second suit and therefore contradicts canon. State, UI, rendering, saves, bots, and tests require migration. (source: [[delivery/current-state|Current state]])

## Related pages

- [[v3/mechanics/exact-kills]]
- [[v3/mechanics/forge-and-landmarks]]
- [[v3/design/status/current-delivery-gaps]]

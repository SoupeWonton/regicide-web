---
type: concept
status: current
authority: derived
topics: [deck, grafts, card-identity]
search_terms: [Kingfall graft, rank replacement, add suit, duplicate exact kill, card upgrade]
sources: [canon/principles/golden-rules.md, canon/v3/systems/deck-and-grafts.md, decisions/2026-07-02-graft-add-suit-or-replace-rank.md, delivery/current-state.md, proposals/systems/deck-lifecycle.md, research/assessments/canonical-drift-blast-radius.md]
aliases: [Rank Graft, Suit Graft]
last_updated: 2026-07-02
---

# Exact-kill grafts

**Summary:** A duplicate exact kill either permanently *replaces* one hand card's rank with the defeated enemy's rank, or *adds* the defeated enemy's suit to one hand card as a second active suit.

## What it is

After exact-killing an owned enemy, the player chooses one card currently in hand and either replaces its rank with the enemy rank, or adds the enemy suit as a second active suit. A defeated `7♠` supplies rank `7` (replace) or suit `♠` (add). A card given a second suit fires **both** suit-powers and counts as both for combos and immunity. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-07-02-graft-add-suit-or-replace-rank|Graft decision]])

The two branches deliberately grow the deck on different axes — the **number** axis (replace rank) or the **suit** axis (add suit) — so neither dominates. If suit were also a replacement, replace-rank would almost always win and the suit branch would be dead. The rank branch never grants a flat `+1`; it replaces (the old number is surrendered). (source: [[decisions/2026-07-02-graft-add-suit-or-replace-rank|Graft decision]])

Legal targets, repeat overwrites, no-op handling, card history, Forge movement, and printed-versus-effective rule interactions remain open. The developed vertical slice still implements additive Hone and added-suit behavior, so code, UI, tests, saves, and simulations require migration. (sources: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]], [[delivery/current-state|Current state]])

Replacement creates a contextual tradeoff. Raising a low card to rank seven may improve damage and payment while losing an exact-kill number; changing suit may enter a class engine while surrendering recovery or draw. Unlike additive power, one line becomes stronger because another property is given up. (sources: [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]], [[canon/principles/golden-rules|Golden rules]])

The identity blast radius includes damage, blocking, suit-power magnitude, combination legality, immunity, exact values, rendering, saves, bots, and tutorial language. UI must show current identity and provenance without implying two active suits. (source: [[research/assessments/canonical-drift-blast-radius|Blast radius]])

No-op policy, repeated overwrites, printed history, effective-property rules, and [[v3/mechanics/forge-and-landmarks|Forge]] movement remain open because each changes permanence and ownership. They depend on expected deck sizes from the wider lifecycle decision. (source: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

## Confirmed design

The player selects one card currently in hand and either replaces its rank with the defeated rank (royal-capped at 10) or adds the defeated suit as a second active suit. The rank branch is a replacement (never a flat `+1`); the suit branch is additive (the card keeps its own suit and gains another). A suit already fired by the card is not offered. Transmute effects that *replace* a suit outright (Consecrate, Press-gang) are a separate mechanism. (sources: [[canon/v3/systems/deck-and-grafts|Deck and grafts]], [[decisions/2026-07-02-graft-add-suit-or-replace-rank|Graft decision]])

## Not yet decided

Legal targets, no-op handling, repeated overwrites, original-card history, Forge movement, and which combat rules read printed versus effective properties remain open. (source: [[proposals/systems/deck-lifecycle|Deck lifecycle packet]])

## Implementation status

Implemented (2026-07-02). `GraftRecord.kind` carries `rank` (replace), `suit` (transmute-replace, used by Consecrate/Press-gang), and `suit-add` (the additive exact-kill suit graft). `effectiveSuits()` derives a card's fired-suit set; the engine's `cardSuits()` unions it into combat; the client graft picker offers "replace value" / "add suit" and renders the second suit beside the first. Smoke Test A2 asserts the additive behavior.

## Related pages

- [[v3/mechanics/exact-kills]]
- [[v3/mechanics/forge-and-landmarks]]
- [[v3/design/status/current-delivery-gaps]]

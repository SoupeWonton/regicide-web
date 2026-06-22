---
type: concept
status: exploring
authority: derived
topics: [ui, ux, legibility]
sources: [proposals/open-design-questions.md, canon/principles/content-bar.md, decisions/2026-06-20-replacement-graft-semantics.md, research/deckbuilding-roguelike-design-principles.md]
aliases: [Trustworthy UI]
last_updated: 2026-06-20
---

# UI/UX contract

**Summary:** The interface must make transformed card identity, consequences, triggers, and persistent deck state trustworthy without exposing debug-only information.

Open requirements include showing printed and effective rank or suit, previewing damage and exact/overkill outcomes, inspecting hand/Tavern/discard/deck history, attributing class and relic triggers, and providing an act recap suitable for multi-session play. (source: [[proposals/open-design-questions|Active design questions]])

Fight rules must be visible before they punish the player, and content outcomes must be immediately attributable. Internal CT values remain design/debug information and must never appear in the UI. (sources: [[canon/principles/content-bar|Content bar]], [[research/deckbuilding-roguelike-design-principles|Research principles]])

The exit test is whether an unfamiliar player can explain why cards, rewards, triggers, and failure behaved as they did without designer narration. This contract is exploring, not yet accepted UI canon. (source: [[proposals/open-design-questions|Active design questions]])

Transformed cards are the hardest trust problem. The interface must distinguish printed history from effective rank and suit, preview damage and suit effects, show exact versus overkill, and explain whether a proposed combination is legal. That presentation must never imply the rejected additive or dual-suit model. (sources: [[proposals/open-design-questions|Active design questions]], [[decisions/2026-06-20-replacement-graft-semantics|Replacement decision]])

Players also need access to hand, Tavern, discard, expedition deck, card history, class state, relic triggers, and upcoming pressure when those facts change a choice. Attribution matters because a powerful outcome teaches only when the player can tell whether it came from card, class, relic, or encounter. CT values remain debug-only. (sources: [[proposals/open-design-questions|Active design questions]], [[canon/principles/content-bar|Content bar]])

Act recaps should restore the mental model after a session break by showing deck evolution and carried consequences. The exit test remains explanatory: an unfamiliar player can say why the game behaved as it did without designer narration. (source: [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/design/product/tutorial]]
- [[v3/mechanics/replacement-grafts]]
- [[v3/stages/duration-and-fairness]]

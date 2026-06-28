---
kind: canon
edition: v3
status: accepted
last_reviewed: 2026-06-18
---

# V3 constraints

- **Conquest-first acquisition:** permanent cards enter the deck through the starting
  court or defeated enemies, not a generic draft or shop.
- **Deck curation remains open:** permanent card removal is neither required nor
  forbidden. Its role, cost, limits, and effect on the conquest identity must be
  explored and accepted by consensus before implementation.
- **Recognizable court:** progression never sprawls beyond a legible standard-card vocabulary.
- **One engine:** deck growth and card grafts carry the primary progression load.
- **No secondary wallet:** redundant exact kills resolve immediately (graft an owned card)
  rather than minting a generic spendable currency. The **spell-crystal fragments** are the one
  deliberate, bounded exception: they are **agnostic** tokens that **drop 50/50 after each encounter**
  and are placed (via the **bracelet**) into the **gauntlet** to build a suit's crystal — never a
  free-floating wallet. *(Revised 2026-06-28 — supersedes the earlier "suit-specific, spent at the
  Forge" wording; see [`systems/items.md`](systems/items.md) and the
  [decision](../../decisions/2026-06-28-relic-slots-fragments-and-ui.md).)*
- **Base-game boundary:** campaign rules do not change quick-game Regicide behavior.
- **Determinism:** campaign randomness uses the serialized seeded RNG, never `Math.random()`.
- **Persistent expedition deck:** hands, Tavern, and discard carry between road fights;
  only explicit rests reshuffle and redraw.

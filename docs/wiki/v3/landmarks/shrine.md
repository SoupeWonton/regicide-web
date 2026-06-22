---
type: landmark
status: proposed
authority: derived
topics: [kingfall, landmark, shrine, consecrate, transmute, reshape]
search_terms: [Kingfall Shrine, consecrate, transmute card, reshape suit, cleanse card]
sources: [canon/principles/content-bar.md, canon/v3/constraints.md, canon/v3/systems/items.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/landmarks.md, proposals/systems/relics-and-spell-cards.md, delivery/migration-v2-to-v3.md, archive/v2/systems/landmarks.md, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Shrine, Kingfall Shrine, Consecrate Shrine]
last_updated: 2026-06-22
---

# Shrine

**Summary:** Shrine's proposed V3 verb is **Consecrate** — permanently transmute one owned card's suit (or rank) **without a kill**: the only player-*directed* deck reshape.

The **Shrine** was a historical restoration landmark with a shifting identity (discard→Tavern recovery, then curse cleanse, then a next-fight blessing). Its V3 verb is now proposed as **Consecrate** (2026-06-22): grafts require a conquest and the Forge only rearranges, so the Shrine owns the one missing verb — *deliberate, no-kill reshape of a card you already hold*. (source: [[proposals/systems/landmarks|Landmarks proposal]])

| Quick fact | Current answer |
|---|---|
| Historical role | Deck restoration and burst access |
| Developed roles | Curse cleanse or next-fight blessing |
| **V3 status** | **Proposed: Consecrate (no-kill transmute of one owned card)** |
| Main overlap | Forge (rearrange) and the Split Seal relic |

## What it is

The original Shrine acted as a smaller recovery intervention than Camp: move up to five discard cards into the Tavern, then draw for one or all players. Later systems moved it toward curse cleansing or temporary preparation. This changing identity shows that the name has survived longer than its mechanical verb. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[delivery/migration-v2-to-v3|Migration specification]])

## Confirmed design

There is no canonical V3 Shrine rule. V3 does confirm a persistent deck, explicit rests, rare relics, and removal of standalone spells; any Shrine must fit those boundaries and must not duplicate [[v3/landmarks/camp|Camp]] or [[v3/classes/surgeon|Surgeon]]. (sources: [[canon/v3/constraints|V3 constraints]], [[canon/v3/systems/items|Items]])

## Historical design and implementation

V2 capped Shrine draw because group-wide recovery scaled sharply with player count. Current code either offers a card-cleanse choice in ascending-deck mode or sets a blessing that raises next-encounter draw/hand cap. Both depend on older curse, preparation, and campaign assumptions. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], implementation: `server/campaign/campaign.ts`)

## Proposed verb — Consecrate

**Consecrate:** permanently transmute one owned card's **suit (or rank)** into a chosen
value, **without a kill**. One card, one sharp choice, per visit. It **respects
no-removal** (it converts, never thins — deck size unchanged), gives a **no-kill way to fix
a denied axis** (the floor pain of drawing the wrong suit and being unable to exact-kill the
one you need), and **complements conquest grafts** rather than duplicating them (grafts are
*earned by killing*; Consecrate is *chosen by routing here and skipping a fight/relic/spell
stop*). This is a candidate **player-authored** mitigation for the Q1 death-spiral without a
card faucet. (source: [[proposals/systems/landmarks|Landmarks proposal]])

## Open tuning (for human playtest, not sim)

- Free, or carries a cost (small discard, or "curse one card to bless another" zero-sum)?
- Move rank, suit, or both? Per-act frequency?
- Overlap risk with the [[v3/landmarks/forge|Forge]] and the *Split Seal* relic — if both
  exist they may need mutually-exclusive appearance rules. (source: [[proposals/open-design-questions|Active design questions]])

## Connections

Shrine sits at the boundary between [[v3/mechanics/persistent-expedition-deck|recovery]], temporary effects, and removed item systems. It should exist only if it creates a route decision that Camp and character recovery cannot carry more cleanly. (sources: [[canon/principles/content-bar|Content bar]], [[proposals/open-design-questions|Active design questions]])

## Related pages

- [[v3/landmarks/camp]]
- [[v3/landmarks/abbey]]
- [[v3/classes/surgeon]]
- [[v3/mechanics/persistent-expedition-deck]]

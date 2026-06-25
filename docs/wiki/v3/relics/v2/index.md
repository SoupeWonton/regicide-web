---
type: note
status: superseded-by-proposed-design
authority: derived
topics: [v3, relics, v2, archive]
sources: [archive/v2/items/relics.md]
aliases: [Relics v2, V2 relic model]
last_updated: 2026-06-22
---

# Relics — V2 model (archived reference)

**Preserved reference.** How relics worked in the V2 (ascending-deck) build, kept for comparison
while the [[v3/relics/proposed-design/philosophy-and-design-orientation|proposed design]] develops.
This is *not* current V3 direction. Source: [`archive/v2/items/relics.md`](../../../../archive/v2/items/relics.md).

## V2 rework (ascending-deck, 2026-06-15, built)
- Relics became **rule-bends, not axis-engines** — the flat-axis role (every ♦ draws / every ♠
  shields) moved to the **token** system (Plate/Provision). The 4 axis-engine relics (Iron Stitch,
  Field Satchel, Grand Provision, Bastion Sigil) and 2 multiplayer-dead ones (Signal Whistle, War
  Drum) were **retired**.
- **Live relics** (`content.ts`): Bone Thread · Reliquary · Duel Charm · Last Lantern · Scry Band
  (standard) · Sainted Scalpel · Iron Reprieve · **Combat Cache** (rare; combo total → 12).
- **Two slots per hero** (`RELIC_SLOTS`); a 3rd forces a release.
- **Economy:** from **important battles** (Lair/Elite, guaranteed at the **Throne** — *grant TODO*)
  and the **Caravan** (take 1 of 2, or a **dark deal**: curse 3 cards → a rare).
- **Kingdom-gated** (`unlockedRelics`): a run started with **5**; **death unlocked more**
  (`RELIC_UNLOCK_ORDER`). Item stops **capped at 3/chapter**.

## V2 rules
- **Hero-owned** persistent effects for the active chapter (assigned to individual heroes, not a
  team pool); a hero could discard/replace a relic when obtaining a new one.
- **CT baseline:** standard relic 0.25 CT · rare 0.75 CT.
- **Design intent:** class-expression enhancers, *not* automatic power inflation — reinforce role
  identity, create replacement/swap decisions, avoid flattening heroes into one build.
- **Tradeoff pattern:** rare relics could cost heavy deck attrition, lost reward options, or extra
  encounter pressure.

## How V3 diverges
The [[v3/relics/proposed-design/philosophy-and-design-orientation|V3 proposed design]] keeps the
"rule-bend, not stat" spirit but makes relics **rare and slotless** (most runs see one or two),
earned primarily at the **Lair**, with breadth coming over a lifetime rather than slots per hero.

← back to [[v3/relics/index|Relics directory]]

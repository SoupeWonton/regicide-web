---
type: note
status: superseded-by-proposed-design
authority: derived
topics: [v3, spells, v2, archive]
sources: [archive/v2/items/spells.md]
aliases: [Spells v2, V2 spell model]
last_updated: 2026-06-22
---

# Spells — V2 model (archived reference)

**Preserved reference.** How spells worked in the V2 (ascending-deck) build, kept for comparison
while the [[v3/spells/proposed-design/philosophy-and-design-orientation|proposed design]] develops.
This is *not* current V3 direction. Source: [`archive/v2/items/spells.md`](../../../../archive/v2/items/spells.md).

## V2 economy (ascending-deck, 2026-06-15, built)
- Spells came only from the **Sanctum** (renamed from Abbey): **take 1 of 2**, or pay the **rite**
  (spend the top 2 of your deck) for a **rare** — plus the odd event.
- The **Shrine** delivered the **Curse** service (cleanse a card's curse).
- **Kingdom-gated** (`unlockedSpells`): a run started with **4**; **death unlocked more**
  (`SPELL_UNLOCK_ORDER`).
- Item stops **capped at 3/chapter**.

## V2 rules
- Spells were **team-owned** tactical resources, stored in team inventory.
- Usually **immediate one-shot** effects; sourced from reward tables and specific landmarks, not
  camp purchasing.
- Could interact with chapter deck state and encounter tempo.
- **CT baseline:** standard spell 0.25 CT · rare 0.75 CT.

## V2 design intent
Emphasis on tactical timing, chapter-level deck manipulation, and emergency access/conversion.
Example themes: exile a card · boost one card's value · reorder immediate draw quality · force a
critical initiative pivot.

**Ownership contrast (V2):** relics = hero-owned persistent chapter effects · preparations =
team-owned camp activations · spells = team-owned tactical tools.

## How V3 diverges
The [[v3/spells/proposed-design/philosophy-and-design-orientation|V3 proposed design]] replaces this
with **four fixed suit trump-cards** (one per suit), a **vertical tier** (silver→gold→purple), no
team inventory, no currency, and spells that **sit above suit immunity**.

← back to [[v3/spells/index|Spells directory]]

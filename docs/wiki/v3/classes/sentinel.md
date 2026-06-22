---
type: character
status: exploring
authority: derived
topics: [kingfall, character, class, sentinel, block, spades, defense]
search_terms: [Kingfall Sentinel, Sentinel block class, shield character, defense class]
sources: [canon/principles/depth-width-elegance.md, canon/v3/classes/overview.md, proposals/classes/README.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md, proposals/open-design-questions.md, delivery/current-state.md]
aliases: [Sentinel, Kingfall Sentinel, The Wall, Block Class, Defense Class]
last_updated: 2026-06-21
---

# Sentinel

**Summary:** Sentinel is the proposed blocking and inevitability class, turning complete defense into sustained card and combat advantage.

The **Sentinel** is Kingfall's defensive character. Its confirmed identity is **Block**: the Sentinel should turn defending against enemy counterattacks into a productive strategy rather than treating defense only as lost cards. Its exact shield bonuses, starting hand, tiers, and facets are proposals rather than canon. (source: [[canon/v3/classes/overview|Classes]])

| Quick fact | Current answer |
|---|---|
| Role | Defense / inevitability |
| Owned loop station | Block |
| Associated suit in proposals | Spades |
| Proposed starting hand | `3♠`, `4♠`, `5♠` with Plate |
| Proposed linear path | Aegis → Bulwark → Impenetrable |
| Proposed facets | Bastion, Riposte, Protector |
| Canon status | Identity confirmed; kit unconfirmed |
| Implementation | V3 rewrite pending |

## What the Sentinel is

After the player attacks, an undefeated enemy counterattacks. The player must cover the remaining attack by discarding card value, while Spades can reduce that incoming amount. The Sentinel is meant to own this part of the game: precise or surplus blocking should create future value, letting defense become a route to victory rather than merely delaying defeat. (sources: [[canon/v3/classes/overview|Classes]], [[proposals/classes/four-core-classes|Four core classes]])

## Confirmed design

Sentinel is one of four accepted V3 classes and owns Block. Its broad strategic role is defense or inevitability. Like every class, it will use a starting hand plus an innate loophole that deepens without a class-point wallet or relic tree. No exact Sentinel ability is currently canon. (source: [[canon/v3/classes/overview|Classes]])

## Linear progression proposal

The linear proposal starts Sentinel with `3♠`, `4♠`, and `5♠` carrying **Plate**, described as additional Spade shielding. **Aegis** would draw after reducing a counterattack to exactly zero; **Bulwark** would convert surplus shield into later damage and possibly bank Fortify; **Impenetrable** would once per fight negate and reflect a counterattack. Every name, trigger, value, and limit in this paragraph remains proposed. (source: [[proposals/classes/four-core-classes|Four core classes]])

This path tries to make blocking pay at several timescales: Aegis replaces immediate card cost, Bulwark stores defense across turns, and Impenetrable turns one defensive moment into a win condition. It risks adding too many always-on states or making survival self-fueling, so each tier must stay legible inside Block. (source: [[proposals/classes/four-core-classes|Four core classes]])

## Facet proposal

| Facet | Proposed expression of Block |
|---|---|
| **Bastion** | Store defensive value and spend it at a later gate. |
| **Riposte** | Convert an exact block into offense and exact-kill setup. |
| **Protector** | Preserve or recover a critical card while defending. |

Only one facet would be active. Attrition favors efficient stored defense, tempo makes Riposte conversion urgent, rotating suits change which cards can form an exact block, and a damaged deck makes Protector's preservation more valuable. These are examples showing how one Block identity could produce several builds. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Not yet decided

- Starting hand, Plate, and the Act 1 loophole.
- What counts as an exact block and whether surplus shield persists.
- Linear tiers versus facets and their timing.
- Fortify limits, reflection timing, and once-per-fight reset behavior.
- Interaction with Spade immunity, replacement suits, payment, and multiplayer.
- How encounters pressure Sentinel without simply disabling defense. (sources: [[proposals/open-design-questions|Active design questions]], [[proposals/classes/README|Class workspace]])

## Implementation status

The confirmed Sentinel identity is not yet delivered as a finalized V3 kit. Older class effects and simulation may help test shielding, but they do not authorize the proposed progression. (source: [[delivery/current-state|Current state]])

## Connections

Sentinel links [[v3/mechanics/core-loop|Block]] to [[v3/mechanics/exact-kills|future precision]] because cards spent on payment are no longer available for the next kill. It must interact with [[v3/stages/act-pressure-model|attrition and tempo]] without making the persistent deck inexhaustible or recreating several simultaneous resources. (sources: [[canon/principles/depth-width-elegance|Depth vs. width]], [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Related pages

- [[v3/classes/class-identity]]
- [[v3/classes/class-progression-model]]
- [[v3/mechanics/core-loop]]
- [[v3/stages/act-pressure-model]]

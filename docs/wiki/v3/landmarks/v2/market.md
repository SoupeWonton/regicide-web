---
type: landmark
status: historical-and-unresolved
authority: derived
topics: [kingfall, landmark, market, caravan, trade, reward]
search_terms: [Kingfall Market, Caravan, shop, trade landmark, value adjustment]
sources: [canon/v3/vision.md, decisions/2026-06-18-v3-foundation.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/relics-and-spell-cards.md, delivery/migration-v2-to-v3.md, research/simulation/findings.md, archive/v2/systems/landmarks.md, ../server/campaign/campaign.ts, ../server/campaign/maps.ts]
aliases: [Market, Kingfall Market, Caravan]
last_updated: 2026-06-21
---

# Market

**Summary:** Market or Caravan is a proposed hand-value exchange landmark for costly spells and relics without gold or relic-for-relic trading.

The **Market** is a historical trade landmark. In different developed modes it offers spells or becomes the **Caravan**, where the player accepts a curse-like cost for a mythic reward. V3 rejects gold, generic buying, fragment shops, and standalone spell inventory, so no current Market reward is canonical. (sources: [[delivery/migration-v2-to-v3|Migration specification]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

| Quick fact | Current answer |
|---|---|
| Historical role | Flexible rewards and value correction |
| Developed role | Spell choice or Caravan mythic trade |
| V3 status | Unresolved / likely redesign |
| Canonical constraint | The battlefield, not currency, is the shop |

## What it is

V2 Market design offered value-adjust tokens that could raise or lower a played card, directly helping exact-kill and survival calculations. The developed Caravan instead offers a rare item for a negative deck consequence. Both models create a trade, but both use reward vehicles that current V3 has removed or constrained. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], implementation: `server/campaign/campaign.ts`)

## Confirmed design

V3 has no gold and no generic card shop. Permanent cards are won through conquest, relics are very rare, and there is no fragment shop. A “purchase” may instead be represented as a guaranteed or weakened fight the player must still exact-kill. (sources: [[canon/v3/vision|V3 vision]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Evidence and history

Historical simulation found Market, Forge, and Abbey outcomes effectively interchangeable in one older map. This supports redesigning their verbs rather than merely tuning offers. (source: [[research/simulation/findings|Simulation findings]])

## Current design work

The current proposal makes the player's hand the exchange economy. The Market or Caravan may require discarded cards meeting a visible rank total—approximately 5 for an early spell and 10 for a later rare or mythic step are exploratory examples. Because hand state persists, the player purchases future emergency power by entering the next fight with fewer cards. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

A costly relic may also be offered here without requiring the player to exchange an existing relic. There is still no gold or fragment wallet, and the final spell costs, relic costs, offers, and relationship to Abbey/Sanctum remain undecided. (sources: [[decisions/2026-06-18-v3-foundation|V3 foundation]], [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Not yet decided

- Whether Market or Caravan remains a named V3 landmark.
- Its single verb, cost, and reward vehicle.
- Whether a trade is expressed through combat, a relic sacrifice, deck state, or route opportunity.
- How it differs from Event, Hunt, and Lair.
- Frequency, pool visibility, refusal, and multiplayer choice. (source: [[proposals/open-design-questions|Active design questions]])

## Connections

Market is the clearest test of [[v3/design/foundations/v3-vision|“you conquer a deck”]]. A future version must create a meaningful exchange without rebuilding the currency-and-shop structure V3 deliberately removed. (sources: [[canon/v3/vision|V3 vision]], [[delivery/migration-v2-to-v3|Migration specification]])

## Related pages

- [[v3/landmarks/v2/hunt]]
- [[v3/landmarks/v2/events]]
- [[v3/landmarks/v2/lair]]
- [[v3/mechanics/conquest-first-acquisition]]

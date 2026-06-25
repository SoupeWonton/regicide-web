---
type: landmark
status: historical-and-exploring
authority: derived
topics: [kingfall, landmark, lair, elite, risk, rare-reward]
search_terms: [Kingfall Lair, elite landmark, rare reward, high risk fight]
sources: [canon/principles/content-bar.md, decisions/2026-06-18-v3-foundation.md, proposals/lore/context-lore.md, proposals/open-design-questions.md, proposals/systems/relics-and-spell-cards.md, research/simulation/findings.md, archive/v2/systems/landmarks.md, ../server/campaign/campaign.ts, ../server/campaign/encounter.ts, ../server/campaign/maps.ts]
aliases: [Lair, Kingfall Lair, Elite Lair]
last_updated: 2026-06-21
---

# Lair

**Summary:** Lair is the proposed high-risk combat landmark where exceptional pressure can be accepted to win a rare relic.

The **Lair** is a high-risk combat landmark in the developed and historical campaign. Its traditional identity is an elite fight guarding an unusually rare reward. The name remains a current lore peg, but neither the Lair nor its old reward package is confirmed V3 content. (sources: [[proposals/lore/context-lore|Context lore proposal]], [[archive/v2/systems/landmarks|V2 Landmarks]])

| Quick fact | Current answer |
|---|---|
| Landmark role | Risk spike for rare payoff |
| Player activity | Fight an elite/Lair encounter |
| Current implementation | Elite fight followed by a three-way old-economy reward |
| Canon status | Not listed as confirmed V3 mechanic |
| Evidence | Older simulations found high mortality and weak visible payoff |

## What it is

Unlike a menu-only landmark, the Lair first demands combat. The current engine marks the encounter as a Lair variant, uses a heavier enemy package, and after victory may offer an old-economy choice among a mythic relic, hail-mary spell, or rare token. This is implemented behavior from the V2/ascending-deck direction, not current V3 canon. (implementation: `server/campaign/campaign.ts`, `server/campaign/encounter.ts`)

The intended experiential shape is high variance: the player voluntarily accepts more pressure for access to a rare outcome. That basic shape could satisfy the V3 [[v3/design/foundations/content-bar|content bar]] if the reward uses accepted systems, remains visible, and competes with a safer route such as [[v3/landmarks/v2/camp|Camp]]. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[canon/principles/content-bar|Content bar]])

## Confirmed design

There is no canonical V3 Lair rule. The old Lair/point economy for class progression is explicitly superseded: class loopholes deepen innately and do not use a Lair currency. Rare relics remain possible as a sparse system, but that does not confirm the Lair as their source. (source: [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Evidence from the developed campaign

An older simulation found Camp substantially stronger than Lair at a comparable fork. Roughly 40% of Lair takers died inside it, while survivors reached later content with little visible deck-state improvement. The research conclusion was that the prize needed to become real and attributable before tuning the fight. These results predate V3 and identify a design failure rather than a current balance target. (source: [[research/simulation/findings|Simulation findings]])

## Historical design

V2 specified an elite gate with a rare item payoff, no or partial reward on failure/retreat, and expected net value near other landmarks but with higher variance. Later V2 class-tree ideas tied Lair to progression points, a role now rejected. (sources: [[archive/v2/systems/landmarks|V2 Landmarks]], [[decisions/2026-06-18-v3-foundation|V3 foundation]])

## Current design work

The active proposal gives Lair one sharp V3 verb: raid a dangerous fight to win a run-defining relic. The relic or at least its mechanical family should be visible before route commitment, and victory should grant that artifact rather than opening a generic three-way item buffet. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Not yet decided

- Whether the Lair remains a V3 landmark.
- What enemy or pressure package guards it.
- Whether failure gives nothing, partial recovery, or retreat consequences.
- Which accepted reward justifies the risk.
- Frequency, placement, visibility, and multiplayer voting.
- Whether the Lair is a relic encounter, Hunt variant, or separate verb. (source: [[proposals/open-design-questions|Active design questions]])

## Connections

Lair is a test case for route risk: it competes with [[v3/landmarks/v2/camp|recovery]], affects [[v3/stages/duration-and-fairness|death fairness]], and can only survive if its reward strengthens the primary deck engine or sparse relic layer without reopening rejected economies. (sources: [[canon/principles/content-bar|Content bar]], [[research/simulation/findings|Simulation findings]])

## Related pages

- [[v3/landmarks/v2/camp]]
- [[v3/landmarks/v2/hunt]]
- [[v3/mechanics/items-and-power-vehicles]]
- [[v3/stages/act-pressure-model]]

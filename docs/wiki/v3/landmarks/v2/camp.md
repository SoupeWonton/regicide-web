---
type: landmark
status: partly-confirmed
authority: derived
topics: [kingfall, landmark, camp, rest, recovery, tavern, discard]
search_terms: [Kingfall Camp, rest landmark, reshuffle deck, redraw hand, camp rest]
sources: [canon/v3/constraints.md, canon/v3/campaign/run-and-progression.md, delivery/migration-v2-to-v3.md, proposals/open-design-questions.md, proposals/lore/context-lore.md, proposals/systems/relics-and-spell-cards.md, archive/v2/systems/road.md, ../server/campaign/campaign.ts, ../server/campaign/encounter.ts, ../server/campaign/maps.ts]
aliases: [Camp, Kingfall Camp, Rest, Camp Interlude]
last_updated: 2026-06-21
---

# Camp

**Summary:** Camp is the explicit expedition rest that reshuffles and redraws the persistent deck, with a proposed four-axis preparation package for the next fight.

The **Camp** is Kingfall's rest landmark. It is the explicit place where the persistent expedition deck may be reset: spent cards and hands are returned to the deck, the deck is shuffled, and players redraw. Camp is therefore not a generic menu between every battle; its scarcity determines how long the party must live with attrition. (sources: [[canon/v3/constraints|V3 constraints]], [[delivery/migration-v2-to-v3|Migration specification]])

| Quick fact | Current answer |
|---|---|
| Landmark role | Rest, recovery, and planning |
| Canonical verb | Reshuffle and redraw at an explicit rest |
| Player cost | Route opportunity and scarcity; exact cost unsettled |
| Current implementation | Camp node immediately performs a full deck rest |
| V3 status | Core rest behavior confirmed; placement/cadence open |

## What it is

Road encounters normally inherit the existing hand, Tavern, and discard. A Camp interrupts that attrition chain. In the current engine, entering a Camp invokes `campRest`: all living hands and the discard return to the Tavern, the Tavern is shuffled through campaign RNG, and living heroes redraw to their maximum hand size. This implementation matches the accepted rule that only explicit rests reshuffle and redraw the expedition deck. (sources: [[canon/v3/constraints|V3 constraints]], implementation: `server/campaign/encounter.ts`, `server/campaign/campaign.ts`)

Because a rest restores access to cards without erasing conquered ownership or grafts, Camp connects [[v3/mechanics/persistent-expedition-deck|persistent deck state]] to [[v3/stages/duration-and-fairness|run fairness]]. A route containing too many Camps trivializes attrition; too few can leave a doomed expedition consuming substantial time without a recovery plan. (sources: [[canon/v3/campaign/run-and-progression|Run and progression]], [[proposals/open-design-questions|Active design questions]])

## Confirmed design

- The campaign deck persists between road encounters.
- Only explicit rests reshuffle and redraw the expedition deck.
- Camp is the established name for a rare rest stop and planning moment.
- Act boundaries must provide closure and safe resume, although they are not automatically confirmed as full rests. (sources: [[canon/v3/constraints|V3 constraints]], [[canon/v3/campaign/run-and-progression|Run and progression]], [[proposals/lore/context-lore|Context lore proposal]])

## Current implementation

Camp is a `NodeKind` in the developed map system. Camp nodes are always visible, may appear at authored road layers, and often occur before bosses in older map variants. Entering one immediately changes the campaign phase to `camp` and performs the rest. Older non-Province retreat logic may also create an emergency Camp; Province-mode retreat explicitly gives no rest. These are shipped/experimental behaviors, not a complete V3 placement contract. (implementation: `server/campaign/types.ts`, `server/campaign/maps.ts`, `server/campaign/campaign.ts`)

## Historical design

V2 treated Camp as a road landmark, mandatory pre-boss interlude, and emergency stop after retreat. It also hosted replacement-hero onboarding, preparations, planning, and readiness choices. Those additional functions are historical; V3 has accepted the rest boundary but has not reaccepted the full V2 Camp menu. (source: [[archive/v2/systems/road|V2 Road]])

## Current design work

The active proposal makes Camp a four-axis preparation stop. Reshuffling the discard restores Heart-style circulation and redrawing restores Diamond-style access; proposed additions give the next encounter approximately +10 starting shield for Spades and double damage on its first card or play for Clubs. The numbers and whether both preparations are granted or chosen remain exploratory. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

This package responds to the observation that players currently avoid Camp when a plain rest does not compete with power landmarks. It may make Camp attractive, but it could also become mandatory and therefore requires route-choice testing. Camp never restores consumed spells. (source: [[proposals/systems/relics-and-spell-cards|Relics and spell cards proposal]])

## Not yet decided

- Whether each act boundary guarantees, offers, or withholds a full rest.
- The number and placement of Camps per act.
- Whether Camp offers choices beyond reshuffle/redraw.
- How Hearts recovery and other landmarks compete with Camp.
- Whether retreat ever leads to a Camp in final V3.
- How replacement heroes, multiplayer planning, and act recap interact with Camp. (source: [[proposals/open-design-questions|Active design questions]])

## Connections

Camp is the strongest recovery endpoint in [[v3/mechanics/persistent-expedition-deck|the persistent deck]], so it constrains [[v3/classes/surgeon|Surgeon's]] identity, attrition pressure, route value, and the meaning of an empty Tavern. Its narrative role also needs to support the idea that the party pauses without ending the continuous expedition. (sources: [[canon/v3/constraints|V3 constraints]], [[proposals/lore/context-lore|Context lore proposal]])

## Related pages

- [[v3/landmarks/v2/forge]]
- [[v3/landmarks/v2/lair]]
- [[v3/mechanics/persistent-expedition-deck]]
- [[v3/stages/act-pressure-model]]
- [[v3/stages/duration-and-fairness]]

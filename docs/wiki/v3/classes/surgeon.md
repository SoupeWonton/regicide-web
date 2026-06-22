---
type: character
status: exploring
authority: derived
topics: [kingfall, character, class, surgeon, persist, hearts, recovery, tavern, recursion]
search_terms: [Kingfall Surgeon, Surgeon recovery, Hearts class, Tavern refill, recursion character]
sources: [canon/v3/classes/overview.md, canon/v3/constraints.md, proposals/classes/README.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md, proposals/open-design-questions.md, research/strategy/additional-strategy.md, research/simulation/harness-notes.md, delivery/current-state.md]
aliases: [Surgeon, Kingfall Surgeon, The Engine, Persist Class, Recovery Class]
last_updated: 2026-06-21
---

# Surgeon

**Summary:** Surgeon is the proposed persistence and recovery class, keeping valuable cards circulating through prolonged expedition attrition.

The **Surgeon** is Kingfall's recovery and recursion character. Its confirmed identity is **Persist**: it should keep the expedition's card engine functioning when cards move into the discard and the Tavern approaches empty. Exact Heart triggers, targeted recovery, and full-deck refill effects remain proposals. (source: [[canon/v3/classes/overview|Classes]])

| Quick fact | Current answer |
|---|---|
| Role | Recovery / recursion / long-run value |
| Owned loop station | Persist |
| Associated suit in proposals | Hearts |
| Proposed starting hand | `3♥`, `4♥`, `5♥` with Mend |
| Proposed linear path | Triage → Flush System → Full Capacity |
| Proposed facets | Triage, Circulation, Resurrection |
| Canon status | Identity confirmed; kit unconfirmed |

## What the Surgeon is

The campaign deck persists between encounters. Cards paid or spent move away from immediate use, while Hearts and explicit rests are central ways to restore availability. Surgeon is intended to turn this recovery cycle into a character identity: not necessarily drawing the most cards now, but ensuring that valuable cards can return and the expedition does not collapse from attrition. (sources: [[canon/v3/constraints|V3 constraints]], [[research/strategy/additional-strategy|Additional strategy]])

This separates Surgeon from [[v3/classes/quartermaster|Quartermaster]]. Quartermaster assembles a large current hand; Surgeon increases the quality or continuity of cards across future turns. If both simply “draw more,” the class distinction fails. (sources: [[proposals/classes/four-core-classes|Four core classes]], [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Confirmed design

Surgeon owns Persist and represents recovery. No exact Heart frequency, chosen-card recovery, empty-Tavern trigger, or immunity interaction is canon. Persistent hands, Tavern, and discard are confirmed campaign state, and only explicit rests reshuffle/redraw the expedition deck. (sources: [[canon/v3/classes/overview|Classes]], [[canon/v3/constraints|V3 constraints]])

## Linear progression proposal

The proposed start is `3♥`, `4♥`, and `5♥` with Mend. **Triage** would allow Heart recovery more often; **Flush System** would recover more cards and target valuable transformed cards; **Full Capacity** would refill from the discard when the Tavern empties. These effects could erase attrition if repeatable without cost, so they are exploratory rather than delivery-ready. (source: [[proposals/classes/four-core-classes|Four core classes]])

## Facet proposal

| Facet | Proposed expression of Persist |
|---|---|
| **Triage** | Recover specific high-value or transformed cards. |
| **Circulation** | Keep Tavern and discard moving continuously. |
| **Resurrection** | Recover from a near-collapse state through a limited package. |

Attrition makes recurrence the main engine, tempo may force offensive recovery, adaptation changes which effective suit or rank must return, and precision may value an exact numerical answer rather than the strongest card. (source: [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Not yet decided

- Starting hand, Mend, and Act 1 loophole.
- Heart trigger frequency and recovery ordering.
- Whether recovered cards are chosen, random, or returned nearer to play.
- Empty-Tavern behavior and Full Capacity limits.
- Interaction with rests, replacement identity, immunity, and multiplayer.
- Linear progression versus facets. (sources: [[proposals/open-design-questions|Active design questions]], [[proposals/classes/README|Class workspace]])

## Implementation status

The V3 Surgeon kit is pending. Historical simulation used older recovery bonuses and found Surgeon turns vulnerable in some base-game samples; those results predate the persistent five-act design and require revalidation. (sources: [[delivery/current-state|Current state]], [[research/simulation/harness-notes|Harness notes]])

## Connections

Surgeon links [[v3/mechanics/persistent-expedition-deck|deck persistence]], [[v3/stages/act-pressure-model|attrition]], and [[v3/mechanics/replacement-grafts|valuable transformed cards]]. Its recovery should reveal comeback plans without nullifying the consequences that make the expedition deck meaningful. (sources: [[canon/v3/constraints|V3 constraints]], [[proposals/classes/facets-and-pressure-permutations|Facets and pressures]])

## Related pages

- [[v3/classes/class-identity]]
- [[v3/classes/class-progression-model]]
- [[v3/classes/quartermaster]]
- [[v3/mechanics/persistent-expedition-deck]]
- [[v3/stages/act-pressure-model]]

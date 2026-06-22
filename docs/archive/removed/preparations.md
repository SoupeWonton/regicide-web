# Preparations

> ⚠️ **REMOVED from the implementation (solo economy redesign, 2026-06).** Camp-activated
> preparations (the `p-*` items) are gone from the code. Markets and skirmish spoils now
> grant **spells** instead. This document is design history only; the camp will be reworked
> around a four-axis pip allocation (♦/♥/♠/♣). See `CLAUDE.md` → "Solo economy redesign."

Preparations are team-owned camp consumables in v0.

## Canon Rules

- Preparations are activated at camp/interlude.
- Preparations can target the next encounter, including non-boss and boss encounters.
- Preparations are not a camp shop flow in v0. They are selected/activated from available inventory.
- Boss pre-fight camp is mandatory.

## Encounter Interaction

Encounter resets from camp/interlude make some old prep designs invalid.

Because encounters already start fresh from camp/interlude, avoid preparations that only duplicate:
- redraw to hand limit
- discard shuffle into Tavern at encounter start

Preparations should provide meaningful encounter-level advantage beyond baseline reset behavior.

## Ownership And Capacity

- Preparations are team-owned, not hero-owned.
- Proposed v0 cap is 2 active preparations per encounter.
- Team may keep a broader preparation inventory and swap at later camps.

## CT Baseline

- Standard preparation value: 0.25 CT
- Rare preparation value: 0.75 CT

## Acquisition

Preparations come from:
- landmark rewards
- selected encounter rewards
- special high-risk or elite outcomes for rare preparation access

No direct camp purchasing flow is required for v0.

## Example Preparation Directions

Standard examples:
- one extra opening draw for one chosen hero in next encounter
- start next encounter with 2 bonus shield on first enemy
- once in next encounter, one played card gains +2 value

Rare examples:
- negate first counterattack in next encounter
- once in next encounter, prevent one hero death and set discard requirement to 0
- once in next encounter, reassign initiative after a kill ignoring normal restriction

# Synthetic Item Pools (CT-Aligned, Leakage Audit Pass)

Synthetic draft data for balance testing and viability review.

## Global Rules

- Memories are awarded only to heroes who complete Chapter 1.
- Every Memory in this list is fixed at 0.25 CT.
- Preparations, Relics, and Spells use two tiers:
  - Standard: 0.25 CT
  - Rare: 0.75 CT
- Relics are hero-linked and each hero can equip at most one relic at a time.
- Relics can be swapped or exchanged between heroes at camp/interlude.
- Spells are tactical effects that can affect hand state or deck state.
- Preparations activate from camp and apply at the start of the next encounter.

## CT Leakage Audit Rule

Each item must declare one primary CT category:

- Shield
- Access
- Recovery
- Initiative
- Consistency

Design guardrail:
- if an item clearly solves 2 to 3 categories at once, it is likely undercosted
- if an item has one clear category, tuning is straightforward

## Memories (Chapter 1 Completion Only)

| ID | Name | CT | Category | Effect |
|---|---|---|---|---|
| M-01 | First Blood Ledger | 0.25 | Initiative | First exact kill each encounter grants +1 reward reroll at next landmark. |
| M-02 | Steady Formation | 0.25 | Shield | First Spade played each encounter gains +1 shield value. |
| M-03 | Quartered Rations | 0.25 | Access | First Diamond trigger each encounter draws +1 card total. |
| M-04 | Surgical Notes | 0.25 | Recovery | First Heart trigger each encounter recovers +1 additional card. |
| M-05 | Clean Finish | 0.25 | Initiative | Once per encounter, if enemy would survive at 1 HP, deal +1 finishing damage. |
| M-06 | Road Instinct | 0.25 | Access | Once per encounter, one hero may discard 1 card then draw 1 card. |
| M-07 | Guard Rotation | 0.25 | Initiative | Once per encounter, after any kill, choose next acting hero. |
| M-08 | Calm Under Fire | 0.25 | Shield | First discard check each encounter is reduced by 1. |
| M-09 | Ashen Discipline | 0.25 | Consistency | Once per encounter, exile one card from hand then draw 1 card. |
| M-10 | Court Recon | 0.25 | Consistency | At encounter start, reveal top 2 Tavern cards. |
| M-11 | Burden Tolerance | 0.25 | Recovery | Once per encounter, ignore one negative modifier from a road node effect. |
| M-12 | Veteran Timing | 0.25 | Consistency | Once per encounter, one played card may be adjusted by +1 or -1. |

## Relics

Relics are hero-linked. One relic per hero equipped at once.

### Standard Relics (0.25 CT)

| ID | Name | Tier | CT | Category | Link | Mode | Effect |
|---|---|---|---|---|---|---|---|
| R-S-01 | Iron Stitch | Standard | 0.25 | Shield | Sentinel | Passive | First Spade per encounter gains +1 shield. |
| R-S-02 | Field Satchel | Standard | 0.25 | Access | Quartermaster | Passive | First Diamond trigger each encounter draws +1 card. |
| R-S-03 | Bone Thread | Standard | 0.25 | Recovery | Surgeon | Activated (1/encounter) | Recover 2 cards from discard to Tavern. |
| R-S-04 | Duel Charm | Standard | 0.25 | Initiative | Executioner | Passive | First exact kill each encounter grants +2 damage on your next attack this encounter. |
| R-S-05 | Signal Whistle | Standard | 0.25 | Initiative | Commander | Activated (1/encounter) | Choose the starting hero for the next turn cycle. |
| R-S-06 | Last Lantern | Standard | 0.25 | Recovery | Warden | Passive | First time a hero would die each encounter, reduce discard requirement by 1. |
| R-S-07 | Loaded Dice | Standard | 0.25 | Consistency | Gambler | Activated (1/encounter) | Reroll one random discard penalty target. |
| R-S-08 | Hollow Ledger | Standard | 0.25 | Consistency | Exile | Passive | First exile each encounter draws 1 replacement card. |
| R-S-09 | Scry Band | Standard | 0.25 | Consistency | Oracle | Passive | At encounter start, reveal top 2 Tavern cards; you may reorder them. |
| R-S-10 | Traveler Emblem | Standard | 0.25 | Access | Any | Activated (1/encounter) | Discard 1 card to adjust a played card by +1 or -1. |

### Rare Relics (0.75 CT)

| ID | Name | Tier | CT | Category | Link | Mode | Effect |
|---|---|---|---|---|---|---|---|
| R-R-01 | Bastion Sigil | Rare | 0.75 | Shield | Sentinel | Passive | First two Spades each encounter gain +1 shield and first net-0 attack draws 1 card for all heroes. |
| R-R-02 | Grand Provision | Rare | 0.75 | Access | Quartermaster | Passive | First two Diamond triggers each encounter each draw +1 card total. |
| R-R-03 | Sainted Scalpel | Rare | 0.75 | Recovery | Surgeon | Activated (1/encounter) | Recover up to 4 cards from discard, then one hero draws 1 card. |
| R-R-04 | Headsman's Oath | Rare | 0.75 | Initiative | Executioner | Passive | Once per encounter, after an exact kill, choose next acting hero and gain +2 damage on next attack. |
| R-R-05 | Battle Standard | Rare | 0.75 | Initiative | Commander | Activated (1/chapter) | For the next 2 non-boss encounters, choose starting hero at encounter start. |
| R-R-06 | Iron Reprieve | Rare | 0.75 | Recovery | Warden | Activated (1/chapter) | Prevent one hero death and set that discard check to 1 instead of 0. |
| R-R-07 | Fate Rig | Rare | 0.75 | Consistency | Gambler | Activated (1/encounter) | Declare high or low on top Tavern card; success draws 2, failure discard 1 random card. |
| R-R-08 | Cinder Archive | Rare | 0.75 | Consistency | Exile | Passive | First two exiles each encounter draw 1 replacement card each. |
| R-R-09 | Crown Lens | Rare | 0.75 | Consistency | Oracle | Passive | At encounter start, reveal top 2 Tavern cards; you may place one on bottom, keep one on top. |
| R-R-10 | War Reliquary | Rare | 0.75 | Recovery | Any | Activated (1/chapter) | Exchange equipped relics between any two heroes and remove one active debuff from each swapped hero. |

## Spells

Spells are one-shot team effects unless noted.

### Standard Spells (0.25 CT)

| ID | Name | Tier | CT | Category | Effect |
|---|---|---|---|---|---|
| S-S-01 | Thin Cut | Standard | 0.25 | Consistency | Exile one card from hand, then draw 1 card. |
| S-S-02 | Keen Edge | Standard | 0.25 | Initiative | Next played card this turn deals double damage value. |
| S-S-03 | Quick Muster | Standard | 0.25 | Access | One hero draws 2 cards, then discards 1 card. |
| S-S-04 | Refit | Standard | 0.25 | Recovery | Shuffle up to 3 discard cards into Tavern. |
| S-S-05 | Clear Signal | Standard | 0.25 | Initiative | Choose next acting hero once this turn sequence. |
| S-S-06 | Guard Up | Standard | 0.25 | Shield | Add +3 shield to current enemy immediately. |
| S-S-07 | Steady Hand | Standard | 0.25 | Consistency | One played card value is adjusted by +1 or -1. |
| S-S-08 | Bulwark Chant | Standard | 0.25 | Shield | Reduce the next counterattack this encounter by 2. |
| S-S-09 | Calm Pulse | Standard | 0.25 | Recovery | Reduce current discard check by 2. |
| S-S-10 | Ash Recall | Standard | 0.25 | Recovery | Return one exiled card to discard, then draw 1 card. |

### Rare Spells (0.75 CT)

| ID | Name | Tier | CT | Category | Effect |
|---|---|---|---|---|---|
| S-R-01 | Deep Purge | Rare | 0.75 | Consistency | Exile up to 2 cards from hand, then draw the same count +1. |
| S-R-02 | Crownbreaker | Rare | 0.75 | Initiative | Next played card this turn deals triple damage value. |
| S-R-03 | Tactical Surge | Rare | 0.75 | Access | Each hero draws 1 card. |
| S-R-04 | Full Recycle | Rare | 0.75 | Recovery | Shuffle up to 6 discard cards into Tavern, then one hero draws 2. |
| S-R-05 | Command Override | Rare | 0.75 | Initiative | This encounter, up to 2 times after a kill, choose the next acting hero. |
| S-R-06 | Perfect Angle | Rare | 0.75 | Consistency | For this encounter, up to 2 played cards may each be adjusted by +1 or -1. |
| S-R-07 | Defy Collapse | Rare | 0.75 | Recovery | Prevent one hero death this encounter and set that discard requirement to 1. |
| S-R-08 | Veil Split | Rare | 0.75 | Consistency | Reveal and reorder top 5 Tavern cards. |

## Preparations

Preparations are activated at camp and trigger at the start of the next encounter only.

### Standard Preparations (0.25 CT)

| ID | Name | Tier | CT | Category | Start-of-Encounter Effect |
|---|---|---|---|---|---|
| P-S-01 | Shield Drill | Standard | 0.25 | Shield | First enemy starts with +2 accumulated shield. |
| P-S-02 | Hand Brief | Standard | 0.25 | Access | One chosen hero draws +2 cards, then discards 1. |
| P-S-03 | Route Intel | Standard | 0.25 | Consistency | Reveal top 3 Tavern cards and reorder them. |
| P-S-04 | Brace Command | Standard | 0.25 | Initiative | Team chooses starting hero for this encounter. |
| P-S-05 | Reserve Kits | Standard | 0.25 | Recovery | Recover 2 cards from discard into Tavern before first turn. |
| P-S-06 | Exacting Plan | Standard | 0.25 | Consistency | First value adjustment this encounter (+1 or -1) is free and does not require discard cost. |
| P-S-07 | Light Fortify | Standard | 0.25 | Shield | First discard check this encounter is reduced by 1. |
| P-S-08 | Spare Edge | Standard | 0.25 | Initiative | First attack card this encounter gains +2 damage value. |

### Rare Preparations (0.75 CT)

| ID | Name | Tier | CT | Category | Start-of-Encounter Effect |
|---|---|---|---|---|---|
| P-R-01 | War Briefing | Rare | 0.75 | Initiative | This encounter, each time a new enemy is revealed, team chooses starting hero. |
| P-R-02 | Fortified Entry | Rare | 0.75 | Shield | First counterattack this encounter deals 0. |
| P-R-03 | Full Logistics | Rare | 0.75 | Recovery | Recover up to 5 discard cards into Tavern, then each hero draws 1 card. |
| P-R-04 | Surgical Reserve | Rare | 0.75 | Recovery | First time a hero would die this encounter, reduce that discard requirement by 3 (minimum 1). |
| P-R-05 | Precision Doctrine | Rare | 0.75 | Consistency | First two played cards this encounter may each be adjusted by +1 or -1. |
| P-R-06 | Relic Relay | Rare | 0.75 | Access | At encounter start, swap equipped relics between up to two hero pairs. |

## Category Distribution Snapshot

This pool intentionally avoids Initiative/Consistency dominance.

- Shield: present in memories, relics, spells, and preparations
- Recovery: present in memories, relics, spells, and preparations
- Access: present in memories, relics, spells, and preparations
- Initiative: present, but with tighter caps on repeat control effects
- Consistency: present, but reduced overlap with Oracle identity

## Targeted Fixes From Review

Adjusted from previous pass:

- Crown Lens: reduced from top-3 full reorder to top-2 with one-bottom control
- Battle Standard: reduced from chapter-long non-boss control to next 2 non-boss encounters
- Command Override: reduced to up to 2 initiative overrides per encounter
- Surgical Reserve: no longer full death-null; now strong reduction with minimum floor
- Duel Charm: buffed from +1 follow-up to +2 follow-up after first exact kill
- Spare Edge: buffed from +1 first attack to +2 first attack
- Scry Band: buffed from top-1 reveal to top-2 reorder

## Quick Validation Notes

- Memories are all Chapter 1 completion rewards and all fixed at 0.25 CT.
- Relics are hero-linked and assume one equipped relic per hero maximum.
- Relics include both passive and activated designs.
- Spells include deck-thinning, damage spike, hand/deck manipulation, and initiative tools.
- Preparations are strictly next-encounter start effects from camp timing.
- Every item now has a single declared primary CT category for leakage tracking.

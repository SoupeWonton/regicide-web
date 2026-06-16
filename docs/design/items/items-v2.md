# Items v2 — the pool, rebuilt against the Bar

**Status:** Design spec, 2026-06-11. Applies `the-bar.md` (I-rules /
O-rules) to every item. All numbers are first-pass — the M1 forced-inclusion
harness prices them empirically after implementation. Shapes are the decision.

**Tier shapes (I4):** Standard = **tool** · Rare = **engine** ·
Build-defining = **rule-breaker** (breaks exactly one named rule; Throne/Lair
capstone only; max one per province).

---

## Cuts

| Item | Reason |
|---|---|
| All 8 memories (`m-*`) | Dead path — memories are cut from province play. Remove from pools. |
| Iron Stitch | Automatic first (I1), invisible. |
| Field Satchel | Automatic first (I1). |
| Grand Provision | Rare-tier filler — two automatic firsts (I1, I4). |
| Bastion Sigil | A pile of automatic firsts (I1). |
| Reliquary | Invisible passive cap raise (I1, no moment — I3). |
| Last Lantern | Merged into Iron Reprieve — one insurance relic, visible (I7). |
| Bulwark Chant (spell) | Third small shield spell; Guard Up + Calm Pulse own the space. |
| Light Fortify, Spare Edge, Shield Drill (preps) | Invisible ±1/±2 automatics (I1, F1-equivalent). |

## Relics — standard (tools)

| Relic | Slot | Text | The moment / gate role |
|---|---|---|---|
| **Whetstone Charm** *(new)* | trinket | Once per encounter, after seeing your play's total: adjust it by +1 or −1. | THE precision tool — turns near-misses into recruits. Gate: turns near-misses into exact royal kills. |
| **Headsman's Mark** *(new)* | arms | Once per encounter, before your play, call the kill exact. Lands at exactly 0: draw 2. Overkill instead: discard 1. | A declared bet on your own math. Gate: rhythm tool across 3–4 royals. |
| **Banner Scrap** *(new)* | trinket | Whenever a road royal is banished, draw 1. | Failure into tempo — softens the strict road rule without unbanishing. Road-economy item (I5 indirect role stated). |
| **Duelist's Charm** *(rework)* | arms | After each of your exact kills, your next attack deals +3. | Chains precision into momentum. Gate: exact a royal, hit the next harder. |
| **Scry Band** *(rework)* | trinket | Once per encounter, at the start of any of your turns: peek the top 3 Tavern cards and reorder. | Was an automatic encounter-start peek; now the question is *when to spend the look*. |
| **Bone Thread** *(keep)* | arms | Activate once per encounter: shuffle 2 discard cards into the Tavern. | The small recovery valve. |
| **Signal Whistle** *(keep)* | trinket | Activate once per encounter: choose who acts after you. | Marked multiplayer exception (I6) — never offered solo. |

## Relics — rare (engines)

| Relic | Slot | Text | The moment |
|---|---|---|---|
| **Tithe Blade** *(new)* | arms | Your overkill damage is stored on the blade (max 10). Activate: add the stored value to this play, then empty it. | Waste becomes a charge. Visible counter ticking up all act, dumped into a King. |
| **Gravekeeper's Ring** *(new)* | trinket | Royals you recruit enter the Tavern face-up **on top**, not the bottom. | The bomb is in your next draw, and everyone can see it coming. |
| **War Drum** *(keep)* | arms | During gate assaults, every fallen royal rallies the party: everyone draws 1. | The model rare — scaling, visible, climax-native. |
| **Sainted Scalpel** *(keep)* | arms | Activate once per encounter: shuffle up to 4 discard cards into the Tavern, then draw 1. | The big recovery engine. |
| **Iron Reprieve** *(rework)* | armor | Once per **province** (automatic): prevent your death; that discard check becomes 1. **Shows lit while armed.** | The visible safety net (I7) — you know it's there, you watch it spend. Absorbs Last Lantern. |

## Relics — build-defining (rule-breakers)

One per class identity. Each breaks exactly one named rule. Throne or Lair
capstone only; at most one acquired per province. Warden's slot waits on the
candle canvas.

| Relic | Breaks the rule… | Text |
|---|---|---|
| **The Doorstop** | "shield resets between enemies" | Your shield carries over from enemy to enemy. |
| **Headsman's Ledger** | "road recruits are strictly exact" | Road kills within 2 HP of exact count as exact (recruit included) — but every miss beyond that costs you 1 discard. |
| **The Bottomless Satchel** | "hands have a cap" | You have no hand cap. |
| **Phoenix Stitch** | "only Camps rest" | Once per gate, when the Tavern runs dry, the party takes a full rest mid-fight. |
| **The Unsealed Eye** | "the deck is hidden" | The top card of the Tavern is always face-up. |
| **The Loaded Coin** | "flips are fate" | You call every coin flip. |
| **The Vanguard Crown** | "one play per turn" | Your kills grant an immediate second play (once per turn). |
| **The Hollow Crown** | "banished is gone" | At each gate, the royals you banished this act strike first: their summed value wounds the first royal. |

Class affinities are flavor, not locks — any hero can run any of these; the
build-sharing fantasy ("Sentinel + Doorstop, play it") comes free.

## Spells (team-owned one-shots — already the right shape)

Keep: Keen Edge (×2), Quick Muster (draw 2), Refit (3-card recycle), Guard Up
(+3 shield now), Calm Pulse (discard check −2, cast in the moment of crisis),
Tactical Surge (party draws 1), Crownbreaker (×3 — the bar-setter),
Full Recycle (6-card recycle + draw 2).

Add — **Executioner's Writ** *(rare)*: "This turn, your kill counts as exact
regardless of overkill." Recruit-on-demand, once. The province's single most
tempting hold-or-spend decision.

## Preparations (camp activations)

Keep: Hand Brief, Route Intel, Brace Command, Fortified Entry, Surgical
Reserve, Banner of the Last March.

Add:
- **Scout Report** *(standard)*: "Before committing your next route, the fight
  rules and enemy lineups of all reachable stops are revealed." — plans into
  the visible-rules world; route choice gets teeth (pairs with F4).
- **Sharpened Drill** *(standard)*: "Next encounter: your party's first exact
  kill also draws 2." — economy hook (I8).

## Offer construction (O-rules applied)

- Landmark offers mix shapes: one tool, one engine-or-better, one **cost-deal**
  (e.g. "Sainted Scalpel — pay: banish 2 random Tavern cards").
- Gate spoils: Gates = tools; Courtyard = engines; Throne = the province's
  build-defining drop (or a Lair capstone earlier carried it).
- Pool ratio target: ≤ 1/3 of any offer table is tools.
- The Lair's prize is rolled at map build and **shown on the map** when the
  node is known (O3). Implementation: generate at `buildMap`, expose on the
  node in the client projection.

## Implementation order

1. Cuts (pool pruning — content.ts) + Iron Reprieve province-scope + armed UI.
2. New standards/rares + reworks (Whetstone, Headsman's Mark, Banner Scrap,
   Tithe Blade, Gravekeeper's Ring, Scry Band rework, Duelist's Charm rework,
   Executioner's Writ, Scout Report, Sharpened Drill).
3. Offer construction (mixed shapes + cost-deals) and the Lair visible prize.
4. Build-defining tier (needs drop slots at Throne/Lair capstone + per-relic
   rule hooks — the largest piece; The Doorstop and The Unsealed Eye are the
   cheapest two to pilot).
5. Then the M1/M2/M3 harness pass over the whole pool.

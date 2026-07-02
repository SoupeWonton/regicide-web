---
kind: delivery
edition: v3
status: active
date: 2026-07-02
---

# Contract — spells: gauntlet + bracelet (slice 6)

Implementation pins for V3 §6 (spec:
[`../plans/v3.0-integration.md`](../plans/v3.0-integration.md) §6; decisions 2/3/8 in
[`2026-07-01-v3.0-build-decisions`](../../decisions/2026-07-01-v3.0-build-decisions.md)).
Each ⚑ is a chosen interpretation for Landry's playtest — not a reopened question.

## Model

- **Pool** = `tokenFragments` (repointed from the retired shop): agnostic,
  **uncapped** (Decision 8). Sources: the **50/50 roll after each won encounter**
  + the existing redundancy conversions (backfill / Council). No fragment on the
  graft trigger (Decision 3).
- **Gauntlet** = four suit holes `{ tier: 0|1|2, frags }`. **Bracelet** = the
  between-encounter placement action (`bracelet_place`, phases road / camp /
  chapter-complete / landmark): the first fragment **lights** a hole (castable
  Fragment); further fragments **sandbag** (`frags` counts everything invested).
- **Forge landmark** = the tier-up (spells only): a hole at tier 1 with
  ≥ **2 invested fragments** (`FRAGMENTS_PER_HALF`, placeholder) forges to
  **Half**. ⚑ One tier-up per Forge visit. Full = V3.5; extra fragments bank
  silently in `frags`.
- **Cast** (`cast_spell` with `gauntlet:<suit>`): consumes the hole **to empty**
  (tier 0, frags 0 — all sandbagged progress spent, Decision 2). **One cast per
  suit per combat.** Castable over matching-suit immunity (no immunity check by
  design). Legacy item-spells (`c.spells`) stay functional on non-ascending
  campaigns only; every V3 spell OFFER is dried up (itemPool returns no spells,
  Lair drops its hail-mary option, the seam graduation shop no longer opens,
  the C-tier fragment token track is refused) — code deletion waits for slice 9.

## Per-suit effects (numbers = placeholders, plan §A)

| Suit | Fragment | Half |
|---|---|---|
| ♣ | **Keen Edge** — next attack ×2 (the live `keenEdge` flag) | **Commit** — ⚑ the next play may include ONE extra card of ANY rank (combo cap still applies; not with an Ace pair; armed and **spent by the next play, used or not**) |
| ♦ | **Quick Muster** — draw 2 | **Rally** — ⚑ armed: at the next counterattack, draw `min(net, 5)` (`RALLY_CAP`) **before** paying |
| ♠ | **Guard Up** — shield +3 vs the current enemy | **Brace** — ⚑ cast during YOUR pay step: your **highest** hand card is spent to the discard; its value adds to shield and cuts the required payment |
| ♥ | **Refit** — return 3 discards to the Tavern, draw 1 (⚑ the "+draw 1?" is pinned IN) | **Full Recycle** — return the ENTIRE discard to the Tavern, draw 2 |

## ⚑ Flags (review at playtest)

- ⚑ Brace auto-picks the **highest** hand card (no picker UI in the placeholder).
- ⚑ Rally consumes only when a counterattack actually lands (`net > 0`); it stays
  armed across enemies within the fight until then.
- ⚑ The Forge offers a "bank the fragments" skip; holes at Half accept further
  sandbagging silently (V3.5 Full progress).
- ⚑ "Holding all four (pre-Full) does anything?" — pinned NO for V3.0.
- ⚑ Placement is any-hero (team resource); solo-only scope makes this moot.

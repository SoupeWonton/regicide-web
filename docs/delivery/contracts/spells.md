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

> **Revised 2026-07-03 (Landry playtest).** Accumulation happens in the **agnostic
> pool**, NOT inside a suit slot. Each slot holds **one crystal**. Supersedes the
> "further fragments sandbag `frags`" reading below. Full model:
> [`contracts/spells.md` top-of-file note is authoritative]. See also the amend in
> [`2026-06-28-relic-slots-fragments-and-ui`](../../decisions/2026-06-28-relic-slots-fragments-and-ui.md).

- **Pool** = `tokenFragments` (agnostic, uncapped, Decision 8) + `tokenHalves`
  (agnostic Half pool, forged). Fragment sources: the **50/50 roll after each won
  encounter** + redundancy conversions (backfill / Council). No fragment on the
  graft trigger (Decision 3).
- **Gauntlet** = four suit slots `{ tier: 0|1|2 }`. **One crystal per suit** —
  empty / Fragment / Half. No per-slot fragment count.
- **Bracelet** (`bracelet_place`, phases road / camp / chapter-complete): arms one
  pool item into an **empty** slot — a **fragment** → the suit's Fragment spell; a
  **Half** → the suit's Half spell. Occupied slots are refused (cast first).
- **Forge landmark**: **always opens its menu** (even with < 2 fragments, so the
  player sees the state). Verb = convert **2 fragments → 1 Half**
  (`FRAGMENTS_PER_HALF`), banking it in `tokenHalves`. Repeat while ≥ 2 fragments,
  then leave. The Half is placed onto a suit later, via the bracelet.
- **Cast** (`cast_spell` with `gauntlet:<suit>`): consumes the slot **to empty**
  (tier 0, Decision 2). **One cast per suit per combat.** Castable over
  matching-suit immunity.

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

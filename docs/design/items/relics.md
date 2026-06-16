# Relics

> 🔁 **Ascending-deck rework (2026-06-15, built).** Relics are now **rule-bends, not
> axis-engines** — the flat-axis role (every ♦ draws / every ♠ shields) moved to the
> **token** system (Plate/Provision), so the 4 axis-engine relics (Iron Stitch, Field
> Satchel, Grand Provision, Bastion Sigil) and the 2 multiplayer-dead ones (Signal
> Whistle, War Drum) were **retired**. Live relics (`content.ts`): Bone Thread, Reliquary,
> Duel Charm, Last Lantern, Scry Band (standard) · Sainted Scalpel, Iron Reprieve, **Combat
> Cache** (rare; combo total → 12). Two slots/hero (`RELIC_SLOTS`); a 3rd forces a release.
>
> **Economy:** relics come from **important battles** (Lair/Elite, guaranteed at the **Throne**
> — *Throne grant still TODO*) and the **Caravan** landmark (take 1 of 2, or a **dark deal**:
> curse 3 cards → a rare). The pool is **Kingdom-gated** (`unlockedRelics`): a run starts with
> 5 and **death unlocks more** (`RELIC_UNLOCK_ORDER`). Item stops are **capped at 3/chapter**.

Relics are hero-owned persistent effects for the current chapter.

## Canon Rules

- Each hero can carry one relic in v0.
- Relics are assigned to individual heroes, not shared as a team pool.
- A hero may discard/replace their current relic when obtaining a new one.
- Relic effects last for the active chapter run scope.

## CT Baseline

- Standard relic value: 0.25 CT
- Rare relic value: 0.75 CT

## Acquisition

Relics are sourced from:
- landmark rewards
- selected encounter rewards
- high-risk paths or specialized terrain for rare relic access
- explicit tradeoff events (example direction: sacrifice deck resources for rare relic roll)

## Design Intent

Relics should feel like class-expression enhancers, not automatic power inflation.

Because relics are hero-owned, they should:
- reinforce role identity
- create meaningful replacement/swap decisions
- avoid flattening all heroes into the same build

## Example Tradeoff Pattern

A high-risk rare relic offer can require cost payment such as:
- heavy deck attrition
- losing upcoming reward options
- taking additional encounter pressure

This keeps rare relics exciting without trivializing chapter bosses.

---
kind: authoring
status: scaffold
last_reviewed: 2026-06-28
---

# Authoring checklist — Relic

Read first: [`../rules-digest.md`](../rules-digest.md) · [`../negative-space.md`](../negative-space.md) ·
relic philosophy [`philosophy-and-design-orientation`](../../wiki/v3/relics/proposed-design/philosophy-and-design-orientation.md).
Draft into [`../templates/relic.md`](../templates/relic.md).

## The bar (a relic must clear all)

- **One rule of the core loop, bent once** — statable in a single sentence.
- **Story, not stats.** Must not duplicate a class loophole, a graft, a spell, or another relic.
- **Rare** — most runs see 1–2 relics; breadth grows over a lifetime, never vertical power in a run.
- **Earned** at the Lair (raid) or Caravan (pay-from-hand); never dropped at ordinary stops.
- **Lives in one of four slots:** Amulet · Ring · Cloak · Hat (the Staff is the 5th, class ability).

## The four slots (themes locked 2026-06-28)

Three slots are **passive, domain-themed**; one is a **mechanism** (an active button). A draft must fit
its slot's lane.

| Slot | Theme | Bends rules about… | The lane to stay in |
|---|---|---|---|
| **Cloak** | **Roads** | the between-fight / route / persistence layer | route choice, skipping/retreating, road-start advantage, pocket rests — *the layer no class touches* |
| **Ring** | **Economy** | cards-as-resource | fragments, overdraw, Ace economy, anti-deckout, the empty-hand floor — **avoid Quartermaster's lane** (flat hand+, combo-draw, pay-double) |
| **Hat** | **Recruitment** | exact-kill → recruit | *what* is recruitable, recruit-on-overkill, recruit royals/blockers — **avoid Executioner's lane** (recruit-to-hand, graft-any) |
| **Amulet** | **Activated** | any lever, gated behind a *button* | once-per-fight/enemy effects — **distinct from spells** (a spell is one-use & consumed; an Amulet refreshes) |

## Pre-flight (invariants relics trip on)

Check the draft against [`../negative-space.md`](../negative-space.md) and [`../rules-digest.md`](../rules-digest.md):

- **No secondary wallet** — only spell fragments exist, spent at the Forge. A relic must not mint a currency.
- **No scry / foresight** — the deck churns 3–4× per boss, so "see the top N cards" is worthless. (Route
  or next-enemy info can be real value; *deck-top* info is not.)
- **No card-removal faucet** — relics convert/recycle, never thin the deck.
- **No "all enemies" effects** — fights are one royal at a time.
- **The overlap test (the #1 filter):** open [`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md)
  and confirm the bend is **not already a class passive, ladder rung, graft, Consecrate, or spell.** If a
  *different* class equips it, does that class become unrecognizable? If yes — cut or differentiate.

## Worked example

- ✅ **Split Seal (good shape)** — "a graft may target any owned card, not just one in hand." One rule
  (graft target), one sentence, tells a story. *Caveat:* Executioner's **Conscript C4** now grafts any
  card too — so even a clean shape can collide with a class; the overlap test still cuts it.
- ❌ **Warhorn (rejected — it's a stat)** — "+2 damage to every play." A number, not a rule
  (Golden Rule 7). Kept only as a *power benchmark*, never as a template.
- ❌ **Unsealed Eye (rejected — it's scry)** — "see the next Tavern card." Dead value in a deck that
  churns 3–4× per boss. Knowing one future card never solves the access problem.

## Self-review gate (pass before proposing)

- [ ] One sentence, one rule of `draw → combine → kill → block → persist` (or the road layer)?
- [ ] Fits its **slot lane** (Cloak/roads · Ring/economy · Hat/recruitment · Amulet/activated)?
- [ ] Passes the **overlap test** — not a class passive, ladder, graft, Consecrate, or spell?
- [ ] Doesn't erase a class's identity when a *different* class equips it?
- [ ] Assigned a slot + an acquisition source (Lair raid · Caravan pay-from-hand)?
- [ ] Checked against [`../inventory.md`](../inventory.md) for duplication?

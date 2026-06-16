# Regicide — Roadmap

> **Guiding principle:** play more, modify what exists, don't add new systems until
> the core grips. Tune by playing, not by adding levers.

---

## Where we are (2026-06-14)

- **Province mode is live** (`EXPERIMENTS.provinceMode`): one run = Gates → Courtyard
  → Throne (4 Jacks / 4 Queens / 4 Kings) across seeded road acts. Death = full
  reset. Deck persists across encounters; Camp reshuffles.
- **Solo economy redesign — partly shipped:** two relic slots, memories +
  preparations cut, relics reworked to axis-owners, road restructured (`PROVINCE_1`).
- **The Ascending Deck is LARGELY BUILT behind `EXPERIMENTS.ascendingDeck`** (default
  `false`) and tested green (smoke Tests A–D), realizing the start-small-grow-up
  engine-building vision. **Done + tested:** Steps 0–3 (foundation, overdraw-and-select,
  number-enemy recruit, start-small + backfill), Step 6 (drafts), Step 9 (Continent
  1→2 seam via the Council of Tens), Step 10 (Continent-1 road maps). The full arc
  ch1→ch2→ch3→Council→ch4 province→**win** passes end-to-end. See
  [`ascending-deck-build-plan.md`](ascending-deck-build-plan.md).
- **Step 5 (token economy / Forge) is BUILT + tested (smoke Test E), and the flag
  is now LIVE** (`ascendingDeck:true`, `provinceMode:false`). Tokens forge at forge
  nodes, hook play (spend/hold value, graft, levers, scry/mark/banner/bloodprice),
  and render on the card face; classes are **pure-token** (Step 4 merged in —
  signatures stamp at run start, select-by-cards UI). **The Ascending Deck is now
  playable end-to-end.** Deferred: class tree, exile cap, telemetry/tuning, the
  relic/spell revamps, exotic tokens (Echo/Wildcard/curses-via-spell). Tracked in
  [`../ideas/open-design-questions.md`](../ideas/open-design-questions.md) → Q10.
- **Docs reorganized** into `docs/{design,ideas,reference,retired}`.

---

## The active effort — finish the Ascending Deck (Step 5: tokens / Forge)

The engine is built and the full arc wins end-to-end. The headline mechanic — the
deck as the one engine, **tuned by tokens** — is the last piece: build **Step 5**
(token economy / Forge), flip `EXPERIMENTS.ascendingDeck` to `true`, then **playtest
and capture raw feedback** to settle the open balance questions (Q10 in
[`../ideas/open-design-questions.md`](../ideas/open-design-questions.md)). Continent 2
(chapters 4–6 — royal recruiting, no backfill) ≈ today's province and already runs as
the arc finale (ch4).

➡ **The sequenced, turnkey build steps + acceptance criteria live in
[`ascending-deck-build-plan.md`](ascending-deck-build-plan.md). Hand that to the
builder.**

**Standing gate — the Executioner bar.** Every class must (1) make a real decision
most turns, (2) show an immediately attributable result, (3) matter at the gates.
In the Ascending Deck each class becomes a permanent **axis-owner** (see the build
plan's class table) — that's how they clear the bar without parallel ability sprawl.

---

## After Continent 1 — the meta layer ("death banks options, not power")

Decided direction (see [`ascending-deck.md`](ascending-deck.md) → *Systems & identity*):

- **Relic/pool persistence + roster** — death unlocks *breadth* (classes, token/relic
  pool entries, wisdom), never raw stats.
- **Specialization trees** ([`../ideas/specialization-trees.md`](../ideas/specialization-trees.md))
  — one node per Camp, Kingdom-gated. Build after Continent 1 grips.
- **Candle / meta currency** — only the "one earn, one spend" skeleton, and only
  once the in-run loop is proven.

---

## Later

- **Continent 2 (chapters 4–6)** — extend existing province machinery; gate
  modifiers; no backfill.
- **Multiplayer ability-variant layer** — solo-first for now; the party economy
  still runs on old single-relic assumptions.
- **New classes; Warden rework** — blocked on the death-fork / candle canvas.

---

## Anti-bloat guardrails — what NOT to build yet

- No new road node types beyond what Continent 1 needs (a recruit node).
- No new class from scratch until existing classes clear the Executioner bar in the
  new axis-owner model.
- No meta currency beyond "one earn, one spend" until the skeleton is tested.
- No Continent 2 until Continent 1 hits its win-rate target (~50% competent solo at
  the first gate band).
- No balance tuning via new systems — tune by playing.

---

The design direction is settled (the Ascending Deck). The **order** is what this
file protects.

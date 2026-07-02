---
kind: delivery
edition: v3
status: active
date: 2026-07-02
---

# Contract — C2 royal gates (slice 3)

Implementation pins for the 3/2/1 pyramid (spec:
[`../plans/v3.0-integration.md`](../plans/v3.0-integration.md) §3; built in slice 3,
see [`../BUILD-STATUS.md`](../BUILD-STATUS.md)). Each ⚑ is a chosen interpretation
for Landry's playtest review — not a reopened design question.

## Pinned behavior

- **A gate fields all four royals of its rank** — solo included (the live solo-3
  split is retired inside ascending C2; legacy province mode keeps it).
- **Keep-decision UI shape:** Jack Gate = pick the **one left behind** (1 tap,
  keeps 3); Queen Gate = **two sequential keep picks**; King Gate = pick the
  crown (1 tap). Rendered through the generic choice modal (placeholder UI).
- **Kept royals** are §F-minted physical cards, appended to `ownedCards`, and
  spliced into the live tavern at seeded positions; they persist through deck
  rebuilds via the registry.
- **Royal exact kills graft at value 10** (the cap is structural — `cards.ts`
  rejects rank grafts above 10), through the same `graft_select` flow as number
  grafts. Applies to **every** C2 royal kill (gates *and* road duels).
- **Victory** = King Gate cleared **and** crown picked → `campaign_won`
  (`completeChapter` fires from the crown finalize, not from encounter end).

## ⚑ Flags (chosen interpretation, review at playtest)

- ⚑ **Overkilled C2 royals are banished** — they do NOT drop into the player
  discard (the old boss-tier behavior made every overkilled royal recoverable
  player fuel, which would smuggle royals into the deck around the keep-decision).
  This makes overkills at gates strictly reward-less; exact = graft is the only
  in-fight payoff.
- ⚑ **The "Queens have fallen" mid-castle checkpoint does not fire in C2 gates**
  (it was full-court logic: reshuffle discard→tavern at 2/3 defeated). Gate
  recovery is the seam rest + Camp (slice 5). If gates prove too punishing,
  reintroduce as a gate-clear reshuffle.
- ~~⚑ Gate rank from boss-node order~~ — **resolved in slice 8**: C2 is three
  provinces (ch4/ch5/ch6), one gate each; the rank keys off the chapter
  (ch4 = Jack · ch5 = Queen · ch6 = King). C2 road fights field the province's
  royal tier as duels. Victory = the ch6 crown.
- ⚑ **Duel Charm no longer primes off C2 royal kills** (its hook lives in the
  legacy royal path). It is superseded in slice 7 anyway; not worth a shim.
- ⚑ **No fragment roll on royal kills** — mirrors Decision 3 (graft trigger
  grants no fragment).

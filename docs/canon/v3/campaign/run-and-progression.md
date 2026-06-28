---
kind: canon
edition: v3
status: accepted
last_reviewed: 2026-06-24
amended_by: 2026-06-24-crystals-continents-and-equipment
---

# Five-beat expedition and meta progression

> **Amended 2026-06-24.** The five-beat *pressure skeleton* below (Claim · Shape · Exploit ·
> Adapt · Master) is retained, with a **continent lore layer** (Continents 1–5 + the God of Luck)
> laid over it, and an **opt-in ending**. See
> [`2026-06-24-crystals-continents-and-equipment.md`](../../../decisions/2026-06-24-crystals-continents-and-equipment.md)
> and [`structure.md`](structure.md). Genre: all-in roguelike.

## One continuous run

A V3 expedition is one continuous five-beat run, themed as **five continents**, each divided into
**three provinces** (sub-continents; one boss-tier each). The same conquered deck, grafts, class
identity, hand, Tavern, discard, and expedition consequences travel through the journey.

**V3.0 has no mid-run save/resume — a run is single-session; only the lineage meta persists between
runs** (see [`2026-06-27-v3.0-question-sweep.md`](../../../decisions/2026-06-27-v3.0-question-sweep.md),
Decision 11). Multi-session save/resume — dividing one run across sessions — is a V3.5+ concern; the
multi-session duration targets below apply to the full five-continent run, not the C1+C2 V3.0 slice.

Death ends the expedition. The next expedition starts again at the beginning (Continent 1).
Players do not unlock later beats as alternative campaign starting points and do not construct an
arbitrary deck to enter the finale.

Beats may be launched independently with seeded, representative state fixtures for
development, balance, and UI testing. Those fixtures are test infrastructure, not
player progression.

## The continent lore layer

The player, wronged by a king, is recruited by the **God of Luck**. Continents 1–3 recruit and
defeat successive kings; **Continent 4 is the loop** (you always lose the God of Luck wager and are
sent onward — you have become the king, fighting versions of yourself), and it can be ridden
indefinitely. **Finishing is opt-in:** the run ends only when the player forges all four
[spell crystals](../systems/items.md) to **Full**, which strips their spells (difficulty rises by
subtracting the player's power, not buffing enemies), changes the God of Luck wager animation, and
opens the **Continent 5 showdown** against the God of Luck. The wager between continents is an
animation only (the player may pick the top card but always "loses").

## The five-beat journey (one beat per continent)

Each beat/continent asks one dominant question using the same card engine:

1. **Claim — Can you recruit deliberately?** Teach and test exact-kill precision while
   establishing the low-rank conquered deck.
2. **Shape — Can you create an identity?** Complete high-rank acquisition while class,
   recruits, and replacement grafts reveal what the run is becoming.
3. **Exploit — Can the unique deck survive focused pressure?** Let its primary engine
   feel powerful, then test how far that interaction can be pushed.
4. **Adapt — Can the player fall back on fundamentals?** Disrupt the preferred line
   without switching off the build; test secondary lines, recovery, and core Regicide
   play.
5. **Master — Can the player handle immense, layered pressure?** Synthesize earlier
   tests through telegraphed pressures sequenced across time. The finale tests foresight,
   not several new subsystems or unrelated calculations in one instant.

The first two continents remain the acquisition beats. Continents 3–5 pressure the conquered
deck and class loophole in increasingly demanding ways, with the **Master** beat realized as the
opt-in **God of Luck showdown** (Continent 5).

## Duration targets

- Budget approximately **one hour per continent** for a first-time or deliberate playthrough.
- Familiar continents may compress toward **35–45 minutes through mastery and riskier routes**,
  never by skipping the need to conquer the deck.
- A successful expedition should take approximately **four to five hours**, playable
  across multiple sessions.
- The target for a player's first complete victory is approximately **15–25 cumulative
  hours** across attempts, centered near 20 hours.
- Completing the game across factions and meaningful permutations may support roughly
  **200 hours** of mastery play. That longevity must come from divergent options and
  tests, not padding one expedition.

These are experience targets to validate through playtesting, not excuses to preserve
slow encounters or excessive content.

## Time-respect and death fairness

- Continent boundaries provide strong closure, a deck/run recap, and a safe resume point.
- A late death must be attributable to visible decisions and previously introduced
  pressure; the finale does not reveal a surprise *mechanical* rule that invalidates the prior
  journey. The God of Luck reveal is a **narrative** turn, and the endgame difficulty spike is
  **player-triggered** (forging the four Fulls strips your own spells) — not an ambush rule.
- A run that has become functionally unwinnable must resolve quickly or present a real
  recovery plan. It must not consume another continent before admitting failure.
- Mastery should accelerate familiar decisions and may unlock faster, riskier routes,
  but never direct access to a later beat.

## Meta progression widens options

Death and milestones may unlock new possibilities for future expeditions, including
classes or factions, relic possibilities, routes, starting alternatives with tradeoffs,
expert shortcuts, and challenge permutations.

Meta progression widens the possibility space; it does not provide mandatory permanent
stat power that repairs an underdeveloped core loop. Reaching a milestone remains
recognized even if the expedition later ends in death. Exact unlocks, triggers, and
content remain to be designed and accepted separately.

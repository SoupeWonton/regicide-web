# Sim Findings

**Status:** Living log of what the simulator has told us, graded by confidence.
Each entry is tagged **CLEAR** (robust regardless of bot quality), **INFERRED**
(the number reflects how the bot reasons — may be a bot artifact), or
**DISCUSS** (a design judgment the data can't settle).

**Standing caveats** (apply to every entry unless noted):
- Bots are a *floor*, not a forecast. Humans clear Ch1 ~7/8; bots ~4–5%.
- Relative comparisons (persona vs persona, grant vs baseline, fork arm vs arm)
  are the trusted signal; absolute win rates are not.
- Information value (peeks, intel, reorders) is structurally underpriced by
  bots — info-item numbers are a floor only.
- All data so far is **one map (prov1-a), solo, old bot brain** (pre the
  2026-06-12 boss-play upgrade). Re-run pending.

---

## Run 2026-06-12T03-52-20 — baseline 1200 + 5 forced-inclusion grants (×200 each)

Config: `--province --seeds 50`, 6 personas × 4 base classes; grants on the
`steady` persona, seed-paired against the steady baseline cells.

### CLEAR

- **Camp ≫ Lair at the stop-4 fork** (n=825, exclusive same-layer fork — clean
  natural experiment). Camp 6.7% win / 28.0% reach-Throne; Lair 2.3% / 10.9%.
  Camp roughly triples both. ~40% of Lair-takers wipe inside the Lair
  (loss-location table). Lair survivors reach the Throne with the *same* 47-card
  deck and only +0.7 royals — **the prize doesn't register in deck state.**
  → Fix is design, not tuning: make the Lair prize real and visible
  (`THE-BAR.md` O3; `SPECIALIZATION-TREES.md` Lair = tree point).
- **Tower is dead at solo.** Reward is "choose who starts next encounter" — a
  literal no-op at 1 player (70% of play). Confirmed by 56.6% reach-Throne vs
  Camp's 92.9%, but the conclusion is deductive from the rules, not the sim.
  → Cut from solo maps or give a solo effect (intel).
- **Forge / Market / Abbey are interchangeable** (stop-2 fork: 3.1% / 2.7% /
  3.7%, within noise). Three same-shape item menus → identical outcomes.
  "Menu of equals." → `THE-BAR.md` O1.
- **The recruit economy works as designed.** Overkill play is now measurably
  costly: slayer 0.5% wins / 1.9 banished per run; exact-favoring personas
  banish ~0.3–1.0. Relative-across-personas-on-identical-seeds, so robust.

### INFERRED

- **"No item moves outcomes."** Forced-inclusion deltas vs the 5.5% steady
  baseline are all within noise (n=200, ±2.8pp): field-satchel −2.5pp,
  war-drum −3.5pp, iron-reprieve −3.0pp, crownbreaker −2.5pp (but **+0.11
  gates**, the only positive movement), last-march −1.0pp. The observational
  table agrees directionally (cut-list items bottom quartile; keeps top). BUT a
  dumb bot produces flat deltas whether items are weak *or* whether the bot
  can't use them — **the sim cannot yet separate the two.** This is the central
  open question (see DISCUSS).
- **"Events are free candy"** (stop-8: event 21.4% vs elite 9.5% reach-Throne).
  Partly real (no opt-out cost — L2 violation), partly inflated by the bot
  being bad at the elite fight it avoids.
- **"precision banishes least"** is partly tautological — we built it to prefer
  exact kills. It validates the persona implements its intent; it does **not**
  show exact play wins more (precision ≈ steady on wins).

### DISCUSS

- **Are items flat because they're weak, or because the bot can't use them?**
  The whole pool question hinges on this. Resolve with the smart-bot re-run +
  a human run before redesigning the pool.
- **Is gate difficulty correct, or bot-can't-play-bosses?** 723 of the wipes
  are at gates; bot ~4% vs human ~87%. The gap is so large the boss number may
  not point the right direction on tuning. **This finding directly motivated
  the 2026-06-12 boss-play upgrade below.**
- **Deck density at the Throne ~47 cards / 8 royals, path-independent.** Is
  stable-at-47 the anti-inflation win, or a sign recruits don't accumulate
  enough to matter? Target-state design call.
- **Is a 40%-mortality Lair the right risk shape** for a dead-is-dead game even
  once its prize is real? Judgment call.
- **Generalization:** all of the above is one authored map. Unknown across the
  planned 6–7 provinces.

---

## Bot-reliability work log

The DISCUSS items above are dominated by one problem: **the bot is dumbest
exactly where the game is decided (the gate), so the floor under-reports gate
conversion.** Boss-play rules audited and tightened 2026-06-12 — see
`server/scripts/STRATEGY.md` changelog. Re-run the same batch on the new brain
to measure how much gate difficulty was real vs. bot blindness.

### Boss-play weaknesses identified (the questions that drove the fixes)

1. **Burst wasted on road trash.** Keen Edge fired on any enemy where double
   reached lethal — so the bot blew it on a 20-HP road Jack and arrived at the
   gate with no nuke. *Fixed:* damage nukes (Keen Edge, Crownbreaker) only on
   worthy targets (gate royal, or road Q/K) and only when the multiplier is
   what lands the kill (never to overkill a raw-lethal target). Crownbreaker
   reserved for when a double isn't enough.
2. **Exact kills not valued at gates.** The recruit-setup bonus was road-only,
   but a gate exact recruits a high-value royal to the Tavern as *in-fight
   fuel* (you redraw it in the same fight). *Fixed:* setup bonus now applies at
   gates too, at 0.4× road weight (a gate overkill only goes to discard, so it's
   recoverable — worth less than dodging a permanent road banish).
3. **Solo Jester undervalued at gates.** The solo Jester is a full hand-refresh
   with no counterattack — at a depleting gate that's a free deck cycle *and*
   skips a royal's 10–20 hit. *Fixed:* its score now adds the avoided
   counterattack value at boss tier.

### Boss-play weaknesses NOT fixed (still floor-depressing — for discussion)

- **No multi-royal look-ahead.** The bot fights each gate royal greedily; it
  doesn't plan suit coverage or shield/card budget across the 3–4 royals it
  knows are coming. A human does. This is the largest remaining gap.
- **Information still underpriced** (peeks, intel) — unchanged.
- **No cross-royal suit sequencing** (holding a suit for the royal it isn't
  immune to).

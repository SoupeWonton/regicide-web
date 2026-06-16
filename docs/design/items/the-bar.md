# The Bar — content design canon

**Status:** Canon as of 2026-06-11. Every new item, landmark, and fight rule is
reviewed against this document before it ships. Numbers stay provisional until
sim + table data; *shapes* are canon.

The Executioner set the standard: a real decision, an immediate attributable
payoff, and relevance at the climax. This generalizes the three tests to all
content. A piece of content that fails a test gets redesigned or cut — not
nerfed, not buffed: **reshaped**.

## The three tests

1. **Decision** — the content creates a choice. For an item: *when* to fire it,
   or a state the player must engineer. For a landmark: a tradeoff with real
   axes. For a fight rule: the party must change its plan.
2. **Visibility** — the payoff is immediate and attributable. The player can
   point at the screen and say "that was my relic."
3. **Climax relevance** — it matters at a gate, or it explicitly feeds the gate
   (and says how).

If you can't name the decision, see the moment, and state the gate role in
three sentences, the content is not ready.

---

## Item rules (I-rules)

- **I1 — No automatic firsts.** "Your first X each encounter gains +1" is
  banned. A passive trigger is legal only if it's a state the player
  *engineers*: an exact kill, a fully-shielded counterattack, an emptied hand,
  a banished royal. Time-based and order-based auto-triggers fail the bar.
- **I2 — Actives need a window, not a button.** An active must pose a real
  "when?" (Crownbreaker: which fight, which play?). If the right answer is
  always "immediately," it's a passive in disguise — reshape it.
- **I3 — Every item names its moment.** Write the sentence the player says
  after the run: *"I held Crownbreaker for the last King."* Can't write it →
  cut it.
- **I4 — Tier = shape, not size.**
  - **Standard = tool**: small, reliable, active or engineered-trigger.
  - **Rare = engine**: charges, counters, scaling — visibly swings a fight.
  - **Build-defining = rule-breaker**: breaks exactly **one named rule** of
    the game. Drops only at Throne or Lair capstone, max one per province.
- **I5 — State the gate role.** Each item declares what it does at a gate.
  "Nothing" is allowed only for road-economy items that feed the gate
  indirectly (recruit enablers) — and that role must be written down.
- **I6 — Solo-first.** No item may be dead at 1 player. (Signal Whistle is the
  marked multiplayer exception: gated, never offered solo.)
- **I7 — Insurance announces itself.** Death-prevention effects show an
  armed/spent state. Tension comes from knowing the net is there; drama comes
  from watching it spend.
- **I8 — Hook the core economy.** Prefer designs touching exact kills,
  recruits, banished royals, deck thinning. Items braid into the run's central
  skill; they don't run parallel to it.

## Offer rules (O-rules) — acquisition is where picks live

- **O1 — No menus of equals.** Never offer three same-tier, same-shape items.
  Offers mix shapes: a tool vs. an engine vs. a cost-deal.
- **O2 — Power costs.** The strongest option in any offer carries an explicit
  price (banish 2 random Tavern cards / +1 pressure next fight / forfeit the
  next reward). A pick between unequal-but-priced options is a decision; a
  pick between equals is a menu.
- **O3 — Visible stakes.** Risk-gated nodes show the actual prize. **The Lair
  displays its relic on the map** — "risk the elite for *that*" beats "risk
  the elite for a mystery roll."

## Landmark rules (L-rules)

- **L1 — One landmark, one dilemma.** Each type owns a named tension (Lair:
  risk-for-prize; Camp fork: rest vs. greed; Forge: power vs. deck damage;
  Events: chaos trades). Two types sharing a dilemma get merged or one gets
  cut.
- **L2 — No opt-outs.** Every option transacts. If "walk away" exists, it
  costs something — otherwise it doesn't exist. (Current events: 4 of 5 have
  a free "nothing happens" — all get replaced or priced.)
- **L3 — The road is short.** Fewer, heavier stops beat many light ones. A
  stop that can't carry a real decision gets deleted, not decorated.

## Fight rules (F-rules)

- **F1 — The rule is the fight.** One sentence, visible at reveal, and it must
  change the party's plan. If the party plays exactly as they would without
  the rule, the rule failed. (±1-on-first-trigger modifiers are the canonical
  failure — the old 15-modifier pool is retired as the primary pool.)
- **F2 — Clocks over walls.** Escalating pressure (enrage, shrinking
  resources) beats flat stat inflation. Clocks create a pacing decision every
  turn; walls create none.
- **F3 — Gates ask build questions.** Courtyard/Throne modifiers test a named
  capability — precision, suit coverage, hand economy, attrition. A build
  without the answer should feel the wall. That wall *is* the game's
  difficulty identity (sharpest at Province 3+).
- **F4 — Telegraph, then test.** Rules are knowable at or before fight start
  (Tower/Scout intel can reveal them earlier). No hidden gotchas after the
  route is committed.

---

## The six visible fight rules (road pool v2)

Each is one sentence, shown at fight start, and asks one question.

| Rule | Text | The question |
|---|---|---|
| **The Clock** | +2 ATK at the start of every full round. | Can you go fast? |
| **The Drillmaster** | Your first non-exact kill summons a Jack reinforcement. | Precision under pressure? |
| **The Taxman** | End your turn holding 5+ cards: he strikes the holder for 2. | Spend or bank? |
| **The Shieldwall** | Shield contributions below 4 do nothing. | Commit to Spades or abandon them? |
| **The Duelist** | Only the highest card in each combo deals damage; the rest still trigger suits. | Reshape your combos? |
| **The Glutton** | At the end of each round he devours 2 discard cards (banished). | Recover early, or lose the fuel forever? |

The Drillmaster and the Glutton braid directly into the recruit/banish
economy (I8 applied to fights).

## Gate modifiers (build questions, escalating)

Gates run clean at Province 1's Gates; Courtyard takes 1 modifier; Throne 1–2.
Higher provinces escalate the asks. Starting pool:

- **Iron Court** — all royals +5 HP *(stamina)*
- **Cruel Court** — all royals +2 ATK *(shield economy)*
- **Starving Court** — hand cap −1 *(hand economy; Throne-tier)*
- **Veiled Court** — royal suits hidden until first struck *(information)*
- **Barren Court** — no recruits at this gate, exact or not *(economy denial)*
- **Court of Mirrors** — the gate's royals are all immune to the suit you
  played most this act *(build diversity; Throne-tier, Province 2+)*

---

## Measurement protocol (replaces tolerance-CT pricing)

What the sim proved (catastrophe-tolerance.md v2): road-pressure CT predicts
loss rates (Spearman 0.94) — **keep it as a map-authoring tool.** Tolerance
CT pricing of items/classes produced a uniform micro-trinket pool — **retired.**
Content is now priced empirically:

- **M1 — Forced-inclusion delta** ("what about that item?"): 400 seeds ×
  persona, item granted at province start vs. baseline → Δ win%, Δ deaths,
  Δ Tavern size at the Throne. |Δ| ≈ noise → dead item. Δ huge → dominant.
- **M2 — Usage telemetry:** log activations per active item. Never fired →
  dead or its window is bot-invisible; flag for human review. (Bots undervalue
  information — info items' sim numbers are a floor, not a verdict.)
- **M3 — Kill-type telemetry:** exact / overkill / banish rates per fight
  tier. Measures whether the recruit economy is actually producing precision
  play.
- **M4 — Outcome bands are the balance target:** P1 ≈ 50% competent solo,
  P2 ≈ 30–35%, P3 ≈ 15–20% (the wall). With 6–7 provinces planned, the band
  keeps falling — exact floors per province decided when P4+ are authored.
  Tune content until the band holds; never tune to ingredient prices.

**Sim gap to close:** current bot personas don't *aim* for exact kills. The
recruit economy needs a **precision persona** (prefers exact-lethal lines when
available) before M1/M3 numbers mean anything for it.

## Shipped canon recorded here (2026-06-11)

- **Dead is dead.** Second wind removed entirely; any province death is a full
  run reset (`encounter.ts` death path; per-act mercy renewal deleted).
- **Road recruit is strictly exact.** Final HP exactly 0 → royal recruits
  (Tavern bottom). Any road overkill → royal **banished**, never enters the
  player pool. Gates keep base-Regicide behavior (exact → Tavern, overkill →
  discard). This is the deck-inflation guard.
- Note: the Executioner's 1–2 HP finisher now recruits only when the math
  lands at 0 (enemy at 2 → +2 → exact; enemy at 1 → overkill → banish). Kill
  assurance and recruit assurance are naturally separated — no nerf needed
  until data says otherwise.

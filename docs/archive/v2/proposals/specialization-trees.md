# Specialization Trees

**Status:** Design suggestion — not yet implemented. For review and playtest
validation before coding. Treat all numbers as first-draft targets.

> **2026-06-17 reframe:** under the ascending-deck model, this tree's **Root +
> Branch A** is now read as each class's **level-2 "axis exploit"** — the
> non-linear power that scaled-up Continent 2 bosses require (vanilla win% craters;
> the pressure is **statistical scaling, not anti-class mechanics**). See
> [`continent-2-axes-and-exploits.md`](./continent-2-axes-and-exploits.md) for the
> four-axis framing and the reconciliation. Two carry-over changes: **(1)** the
> in-run unlock is the branch at the continent seam; **Branch B / depth = cross-run
> candle meta** (Q6). **(2)** The **Exile tree is RETIRED** — it is built on
> exile/deck-thinning, which the **NO-EXILE** rule bans; the Exile class is parked
> pending a non-thinning repurpose. The point economy below (Lair/province-clear
> across runs) is superseded; re-map the earn side when candles (Q6) are specified.

## Framework

### How points are earned

Specialization points come from **accomplishment, not rest**. Camp resets your deck
— it does not give points. Two and only two events earn a point:

1. **Clear a Lair** — survive the elite encounter inside and kill the boss. The Lair
   is the high-risk fork (stop 4: Camp or Lair). Taking the Lair and surviving pays
   off immediately in tree progress. Dying in a Lair costs you the point *and* the
   run.
2. **Complete a Province** — defeat the Throne (4 Kings). One point awarded at
   province-end, banked into the Kingdom for next run.

Points bank in the Kingdom and carry across runs. A fresh Kingdom has 0 points.

### Province 1 point budget

| Path | Points earned |
|---|---|
| Skip Lair → Camp → win Province | 1 (province clear) |
| Take Lair, win → win Province | 2 (lair + province clear) |
| Take Lair, win → lose Province | 1 (lair only) |
| Skip Lair → Camp → lose Province | 0 |

**The Lair becomes the mid-run tree investment.** The risk is real — you forgo the
deck reset at Camp, take a harder fight, and earn a point if you live. A Province
clear guarantees at least 1 point regardless of path.

### Tree structure

```
0 points: no tree (Province 1, fresh Kingdom, no Lair clear this run)
           │
1 point:  ROOT + branch pick (A or B — branch lock-in, cannot change)
           │
2 points: depth-2 node in chosen branch
           │
3 points: Gate capstone (active at boss fights from this point forward)
```

Three nodes to fill. Three earned across two provinces of clean play — or faster if
you consistently take the Lair risk. The capstone is not a day-1 reward; it's what
a player who commits to a build across multiple runs unlocks.

**Camp is free from tree pressure.** It does one thing: reset the deck. Players can
rest without asking "does this cost me a point?" The Lair vs. Camp fork is now a
genuine dilemma — rest and survive comfortably, or gamble for tree progress.

### Branch B gating

Branch B is additionally Kingdom-gated (candle spend required to unlock access).
Even with 1 point, a fresh Kingdom can only pick Branch A. Branch B becomes
available after spending candles — the "second run identity" layer.

**Executioner bar** applied to every node: it must have a Decision, produce a
visible result, and matter at the Gate/Courtyard/Throne.

---

## Executioner — Thresholds / Finish

**Base:** Once per enemy, if damage leaves the enemy at 1–2 HP, deal +2 finishing
damage. Boss: finish royals from 1–4 HP (Regicide).

**Root — "Open Season"**
Exact-kill window widens to **1–3 HP** on road encounters. Boss window stays 1–4 HP
(Regicide already handles boss). Each exact kill this province grants a permanent
+0.5 window increase (tracked), capping at **1–5 HP road / 1–6 HP boss** after 4
kills.

---

### Branch A — The Kill Chain *(momentum / solo cascade)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Coup de Grâce** | Exact kills draw 1 card. |
| 2nd | **Relentless** | Each consecutive exact kill in the same enemy sequence widens your road window by +1 HP for the rest of that encounter. |

**Gate Capstone — Reign of Terror**
In boss fights, the first 3 exact kills each draw 2 cards and deal 2 bonus damage
to the next royal. The kill chain never ends — momentum feeds itself.

*Decision every turn:* can I set up the exact kill now, or do I chip and wait?
*Visibility:* extra cards on kill are immediate and countable.
*Gate:* three boss royals = three payoff windows.

---

### Branch B — Bomb Arsenal *(Kingdom-gated: candle unlock required)*

The bomb-card loop: royals you exact-kill re-enter the deck as high-value cards.
This branch makes those cards dangerous, not just useful.

| Point | Node | Effect |
|---|---|---|
| 1st | **Condemned** | Bomb cards (dead royals in the deck) deal **+3 bonus damage** when played by the Executioner. |
| 2nd | **Scaffold** | When you play a bomb card against an enemy with ≤5 HP, it kills the enemy outright. Counts as an exact kill. |

**Gate Capstone — Last Rights**
Once per boss fight, declare a target HP value before attacking. If your attack
kills the royal at exactly that value: deal the card's face value as bonus damage
to the next royal. High risk, high payoff — the Executioner bets on their own
precision.

---

## Surgeon — Recovery / Precision

**Base:** First Heart trigger each enemy recovers +1 card.
Boss siege: when Tavern runs dry, return up to 8 discard cards to it (Field Triage).

**Root — "Triage Protocol"**
Heart triggers are no longer limited to once-per-enemy — they can fire multiple
times per enemy (once per card play that triggers Hearts). Camp rests recover
3 extra cards into the Tavern on top of the standard reshuffle.

---

### Branch A — Rapid Response *(pure sustain engine)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Stabilize** | Once per enemy, if the party has fewer than 6 total cards in hand across all heroes, trigger Hearts for free (no Heart card required — emergency recovery). |
| 2nd | **Flush System** | Heart triggers recover +2 per fire (was +1). Camp rests recover 5 cards into the Tavern (was standard 3). |

**Gate Capstone — Full Capacity**
When the Tavern runs dry during a boss fight, return **all** discards to it
(unlimited, not the 8-card Field Triage cap). Can fire multiple times per boss.

*Decision:* do I wait for a Heart play to trigger naturally, or spend the free
Stabilize trigger now when hands are thin?
*Visibility:* card count recovery is immediate.
*Gate:* boss fights drain the Tavern hardest — Full Capacity is a genuine fight-saver.

---

### Branch B — Precision Medicine *(Kingdom-gated)*

Synergy with exact kills. The Surgeon benefits from kills, not just sustain.

| Point | Node | Effect |
|---|---|---|
| 1st | **Clean Incision** | Any hero's exact kill recovers 1 card into the Tavern. |
| 2nd | **Vital Strike** | Hearts triggers on the same turn as an exact kill recover 2 extra cards. Hand cap +1 for all heroes. |

**Gate Capstone — Crisis Response**
At the start of each boss fight (Gates, Courtyard, and Throne separately), all
heroes draw to full hand size from the Tavern before the first royal appears.
The party enters every climax at full strength.

---

## Sentinel — Shield / Stability

**Base:** All-Spade turn → +3 shield. Mix any other suit → no bonus.
Boss siege: Hold the Gate — once per boss fight, one counterattack against the
Sentinel is fully negated.

**Root — "Shield Wall"**
When a counterattack against you is fully blocked (net damage = 0), draw 1 card.
Committing to Spades pays off twice: shield now, card for next turn.

---

### Branch A — Rampart *(pure shield / solo dominant)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Iron Hide** | All-Spade turns gain **+4 shield** (was +3). Any surplus shield beyond the counterattack value converts to 1 bonus damage on your next attack. |
| 2nd | **Fortify** | Once per enemy, if your all-Spade turn generates ≥6 total shield, gain a Fortify stack (max 3). Each stack reduces the next counterattack by 2. |

**Gate Capstone — Impenetrable**
During boss fights, each fully-blocked counterattack draws **2 cards** (was 1 from
Root). Hold the Gate (the existing siege ult) now triggers from any surplus shield
turn, not just once per fight.

*Decision:* commit to all Spades for max shield and card draw, or mix suits for
Hearts/Diamonds utility at the cost of the bonus?
*Visibility:* surplus shield → bonus damage is immediate arithmetic.
*Gate:* boss counterattacks are heaviest — Fortify stacks matter most here.

---

### Branch B — Guardian *(Kingdom-gated)*

Protect others. Solo-functional variant: Intercept protects your own turn.

| Point | Node | Effect |
|---|---|---|
| 1st | **Intercept** | Once per enemy, when any hero (or yourself in solo) would take ≥3 damage, play 1 Spade from hand to reduce that damage by the Spade's shield value. |
| 2nd | **Bastion** | Your all-Spade turns grant +1 shield to all other living heroes (in addition to your own shield). Solo: +2 shield to yourself instead. |

**Gate Capstone — Last Stand**
Once per boss fight, when any hero would take lethal counterattack damage: the
Sentinel may sacrifice their entire current hand. Reduce the lethal damage by 2
per card sacrificed. Solo: applies to your own lethal hit — burn your hand, survive.

---

## Quartermaster — Draw / Access

**Base:** First Diamond trigger each enemy draws +1 extra. Hand cap +1.
Boss siege: Last Requisition — when hand empties, whole party draws back to full.

**Root — "Advance Logistics"**
Diamond triggers draw +1 on **every** trigger (not just the first per enemy).
Hand cap is permanently +1 (stacks with base, so +2 total from root onwards).

---

### Branch A — Full Supply *(raw card access)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Bulk Order** | Diamond triggers draw **+2** per fire (was +1 from Root). Camp rests draw 3 bonus cards on top of the standard reshuffle. |
| 2nd | **Arsenal** | Hand cap becomes +3 total. During boss fights, when your hand empties, draw 4 cards instead of the standard redraw. |

**Gate Capstone — Last Requisition+**
When the Quartermaster's hand empties during a boss fight, **all heroes** draw to
full hand size (not just the party — unlimited, not just Quartermaster). Can fire
multiple times per boss.

*Decision:* which Diamond plays to prioritize, and when to let hand run dry to
trigger the Arsenal refill?
*Visibility:* card counts are always visible.
*Gate:* the boss fight is long; sustaining hand size across 4 royals is the whole game.

---

### Branch B — Intel Network *(Kingdom-gated)*

Information-based play. Knowing what's coming is a resource.

| Point | Node | Effect |
|---|---|---|
| 1st | **Forward Scout** | At the start of each encounter, look at the top 5 Tavern cards and reorder them freely (without marking — pure setup). |
| 2nd | **Strategic Reserve** | Once per enemy, draw from the **bottom** of the Tavern instead of the top. The bottom holds high-density cards since low cards cycle into discard first. |

**Gate Capstone — Full Visibility**
Once per boss fight, reveal the entire current Tavern to all players (sorted display).
For the rest of that fight, you know exactly what's coming. Full information on demand.

---

## Commander — Initiative / Sequencing

**Base:** After your kill: draw 2 cards solo / draw 1 and pass turn multi.
Boss siege: Rally the Line — first boss handoff to an ally re-arms them with 2 cards.

**Root — "Chain of Command"**
Kills that follow another kill within 2 of your turns draw +1 extra (chain kill bonus):
solo kill chain = draw 3 on second consecutive kill, draw 4 on third. Resets on any
non-kill turn.

---

### Branch A — Blitz *(solo cascade / kill-chain engine)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Pursuit** | After each kill, your next attack (this turn or next) deals **+3 bonus damage**. |
| 2nd | **Relentless Assault** | Kill chain multiplier increases: kill 1 = +2, kill 2 = +4, kill 3 = +6 cards drawn (solo). Each kill also deals 2 bonus damage to the following royal. |

**Gate Capstone — Storm the Gates**
After your 3rd kill in a single boss fight: immediately draw 3 cards and deal 5 bonus
damage to the next royal. No per-turn restriction — the cascade earns this.

*Decision:* which enemy to kill to set up the chain? Preserve chain or break for
suit utility?
*Visibility:* kill → draw is immediate; chain count is trackable.
*Gate:* three royals per act = three chain-building opportunities.

---

### Branch B — Coordination *(Kingdom-gated; multiplayer-shines, solo-functional)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Rally** | After each kill, all heroes draw 1 card. Solo: draw 1 extra in addition to Press the Advantage (so 3 total). |
| 2nd | **War Council** | At each Camp rest, choose one hero — they begin the next encounter with +3 cards in hand. Solo: you begin the next encounter with +3 cards in hand. |

**Gate Capstone — Combined Arms**
Once per boss fight, the Commander's next kill deals bonus damage equal to the total
cards in all heroes' hands at that moment. Solo: damage = your hand size × 2.

---

## Gambler — Uncertainty / Tempo

**Base:** Once per encounter, wager before a play: if the enemy dies this turn,
draw 2 cards and choose who acts next; if not, discard 1 random.
Boss siege: All In — first strike doubled or halved on a coin flip.

**Root — "The House Rules"**
Wager wins that happen on your own kill draw **3 cards** instead of 2.
Wager failures discard from the top of the Tavern (not your hand) — you lose
information, not cards.

---

### Branch A — High Roller *(pure variance, lives in the swings)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Double Down** | When your wager wins, you may arm a second wager immediately for the same turn. Second wager win: draw 2 more. Second wager fail: discard 2 from the Tavern top. |
| 2nd | **Jackpot** | Three consecutive wager wins in a province without a loss grant one free item look at the next Camp rest (pick 1 from 3 shown, no candle cost). Streak resets on any loss. |

**Gate Capstone — All In+**
Boss All In now has three outcomes:
- Jackpot (double damage): fire the original result.
- Bust (half damage): add a draw 3 consolation — the risk always pays something.
- Call it: before the flip, declare "double" or "half." If right, deal triple.

*Decision:* wager every enemy (high risk / high reward) or save for the right moment?
*Visibility:* wager win/loss is instant and memorable.
*Gate:* All In at the boss turns every attack into a gamble.

---

### Branch B — Card Counter *(Kingdom-gated; calculated risk)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Loaded Dice** | Before arming a wager, look at the top card of the Tavern. Knowing the next draw helps you judge whether the kill is realistic this turn. |
| 2nd | **Calculated Risk** | Wager failures no longer discard anything (not your hand, not the Tavern top). The upside remains; the downside is gone. Information is the trade — you lost nothing, but you also revealed your hesitation. |

**Gate Capstone — Favorable Odds**
Once per boss fight, before attacking, call the exact HP you'll leave the royal at.
If exactly right: deal double damage and draw 4. No penalty if wrong — the Gambler
plays to win, not to avoid losing.

---

## Oracle — Displacement / Foresight

**Base:** At encounter start, peek top 3, reorder, mark the top card.
Playing the marked card: +2 damage (road), +3 damage (boss — Throne Sight).

**Root — "Seer's Eye"**
Once per enemy (in addition to the encounter-start peek), you may re-peek the top
2 Tavern cards and update the mark. The Oracle's foresight refreshes with each new
enemy, not just each fight.

---

### Branch A — Prescience *(deep foresight chain)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Chain Sight** | When the marked card is played, the next card drawn from the Tavern is **automatically marked** (chain carries the bonus forward). The mark never expires mid-encounter. |
| 2nd | **Second Sight** | Encounter-start peek extends to top **5 cards**. Mark **2 cards** instead of 1. Playing either marked card deals the Displacement bonus. |

**Gate Capstone — Foreseen End**
At boss fights, Displacement bonus is +5 (was +3). Each marked-card play also draws
1 card. Chain Sight extends through every kill — if the chain is active, every draw
could be the marked card.

*Decision:* which card to surface and mark? What does it cost to chain the mark
rather than mixing suit plays?
*Visibility:* the mark is explicit; +2/+3/+5 on play is always attributable.
*Gate:* boss fights are long enough to chain marks across multiple royals.

---

### Branch B — Interference *(Kingdom-gated; disruption / deck shaping)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Temporal Shift** | Once per Camp rest, look at the top 8 Tavern cards and reorder them freely. Deep pre-encounter planning — shape the entire next fight's draw order. |
| 2nd | **Redirect** | Once per enemy, send 1 card from your hand to the bottom of the Tavern and draw 1 from the top. Bury bad cards; surface good ones. The oracle controls the flow both ways. |

**Gate Capstone — Ordained**
At the start of a boss fight, the Oracle sees all current royals' HP totals. For each
royal, dedicate 1 card from your hand (face-down until it's played against that
specific royal). If you play the dedicated card against its royal: deal **+5 damage**
and recover 2 cards. A run built on prediction.

---

## Exile — Deck Evolution

**Base:** Once per Camp rest, exile 1 card from the deck permanently. Every 2nd exile
adds Burden (the next non-boss enemy deals +2 counterattack).
Boss siege: Tithe of the Severed — exile top 2 Tavern cards; their value wounds
the first royal.

**Root — "The Severance"**
Exiled cards improve deck density immediately: each exile is visible (you see what
was cut). Burden is now a **resource** — each Burden stack also adds +1 damage to
the Exile's attacks until it's consumed by a counterattack.

---

### Branch A — Purity *(surgical exile, low Burden)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Selective Cut** | Before exiling, view the top 5 Tavern cards and choose 1 to exile. Informed, not random — the Exile controls exactly what leaves. |
| 2nd | **Cleansing Sacrifice** | Each exile permanently widens the Exile's exact-kill window by 1 HP for the province (caps at +4 total over 4 exiles). Precision grows with sacrifice. |

**Gate Capstone — Total Sacrifice**
At the Throne, before combat begins: exile up to 3 cards from hand. Each exiled card
deals its **face value in damage** to the first King, then the fight begins with a
leaner, denser deck. The ultimate opening salvo.

*Decision:* which cards are worth cutting? Does the density gain outweigh losing
the card's play value?
*Visibility:* exile is permanent and visible; damage bonus from Burden is always on.
*Gate:* Tithe + Total Sacrifice can wound the first King for 15–25 before combat.

---

### Branch B — Burden as Power *(Kingdom-gated; lean into the pain)*

| Point | Node | Effect |
|---|---|---|
| 1st | **Pain is Power** | Burden stacks don't add enemy counterattack pressure. Instead, each Burden adds +2 to the Exile's own damage permanently until the province resets. Pain becomes fuel. |
| 2nd | **Masochism** | Whenever the party takes counterattack damage, recover 1 card from the discard to the Tavern. Hits refuel you — the Exile wants the enemy to hit back. |

**Gate Capstone — Martyr's Will**
At the Throne fight, before the first King appears: each Burden stack deals **5
damage** to the first King (pre-combat wound). The more you've suffered building
to this moment, the harder the Throne falls.

---

## Warden — ⛔ DISABLED (candle canvas not built)

Warden cannot be played until the candle economy is implemented (roadmap Tier 2b).
The tree direction is preserved here for when it ships.

**Tree direction:** the Warden's two branches express the two ways to use the death
currency — **convert a run's ending into more candles** (Branch A: "Death Dividend,"
generosity that builds the Kingdom), or **spend Burden mid-run to survive** (Branch B:
"Iron Will," converting accrued run value into an emergency relic/spell activation
at a crisis moment). Gate capstone: once per province, prevent a wipe by trading
all your candle gains from this run for an emergency action.

See `CLASS-DESIGN.md` Warden section. Do not spec this tree until
`Design/OPEN-DESIGN-QUESTIONS-v0.md Q6` is resolved.

---

## Cross-tree notes

**Camp is not a point source.** Camp resets the deck (and activates any camp-rest
bonuses from nodes already unlocked). It does not award tree points. This keeps
Camp a pure survival tool — the Lair vs. Camp fork is a genuine risk/rest dilemma,
not a points tradeoff.

**The Lair is the mid-run tree accelerator.** A player who consistently takes the
Lair earns points twice as fast: one Lair clear mid-Province 1 + province completion
= 2 points, enough to pick a branch and unlock depth-2 before Province 2.

**Province 1 no-Lair baseline:** a player who always takes the safe Camp path earns
1 point per province (province-clear only). After Province 1: root unlocked. After
Province 2: branch picked. After Province 3: depth-2. Capstone is a 4-province
investment for the cautious player — and a 2–3 province investment for the bold.

**Balance target:** Province 1 at ~50% competent-solo clear rate. The tree should
not push it above 65% at branch-pick. Root alone should feel like "this class got
sharper" — not "I win now."

**Ordering to build:** Executioner (benchmark) → Surgeon → Sentinel → Quartermaster
→ then Tier 2/3 classes. Validate each with sim before moving to the next.

**Kingdom gating:** all Branch B nodes are inert until the candle economy (Tier 2b)
ships. Don't surface them in the UI yet. Even with 2 points banked, a fresh Kingdom
can only access Branch A.

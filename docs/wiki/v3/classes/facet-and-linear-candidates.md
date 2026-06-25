---
type: note
status: brainstorming
authority: derived
topics: [v3, classes, facets, linear, progression, personality, q5]
sources: [proposals/classes/facet-and-linear-candidates.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md]
aliases: [Facet and linear candidates, Class candidate pool, Class personality pool]
last_updated: 2026-06-22
---

# Class progression — enabler passives × payoff ladders (for pairing)

**Showcase for the Q5 session.** Two **orthogonal** menus per class — a pool of **Passive
enablers** and a pool of **Linear payoff ladders** — meant to be **paired** live (e.g.
*Ironclad × Counter*). Over-generated; cut hard. **The Rule is the thing to vote on.** Source:
[[proposals/classes/facet-and-linear-candidates|candidate pool (source)]].

> **Mapped to equipment ([[decisions/2026-06-24-crystals-continents-and-equipment|2026-06-24 decision]]):**
> the **Passive enabler is the Staff** — held in the Staff equipment slot and **swappable** at the
> **Fallen Heroes** landmark. The **Linear payoff ladder is kept, not swapped**; a class starts
> with the ladder matching its suit and **unlocks the other suit ladders over the run**. So a
> pairing like *Quartermaster ladder × Executioner staff* is reachable mid-run.

## What the classes are meant to be — and how they fail today

A class should be **one rule of the core loop, bent so hard the turn reorganizes around it.**
Today all four are a flavor of **"+1 my own suit"** (Sentinel ♠, Executioner ♣, Quartermaster ♦,
Surgeon ♥) — a number, not a rule. Each class instead gets a **different station of the loop to
break** (Block / Kill / Combine / Persist), and each station has **one key moment**:

| Class | Station | Key moment |
|---|---|---|
| **Sentinel** | Block | a **block** (reducing a counterattack; exact = to 0) |
| **Executioner** | Kill | an **exact kill** (and the recruit it earns) |
| **Quartermaster** | Combine | a **big combine** / a full hand dumped in one turn |
| **Surgeon** | Persist | a **recovery** (a card returned from discard) |

## The fix — two orthogonal menus

The previous draft made passives and ladders the *same axis* (each passive was just its ladder's
first rung). Split them so any pairing is meaningful:

> - **Passive = the ENABLER.** A flat, always-on rule that changes *how you reach or trigger* the
>   key moment — its timing, scope, cost, reachability, or consistency. **It never grants a scaling
>   resource.**
> - **Linear ladder = the PAYOFF ENGINE.** An escalating rule for *what the key moment gives you*,
>   one rung unlocking at **Continent 2 / 3 / 4**. **A rung never restates a passive.**

Discipline for adding options: if a passive hands you draw/damage/recruit/recovery, it's secretly
a ladder — rewrite it as an *enabler*. If a ladder rung reads like a flat always-on rule, it's
secretly a passive.

## The power rule — multiplicative, rising, power-fantasy

Continents 2/3/4 **rise in difficulty**, so the ladder must **rise in power** to stay ahead:
each rung is strictly stronger than the last, and every rung is stronger than the (deliberately
low-power) Continent-1 passive.

- **Multiplicative, not additive.** A rung must *double, repeat, or scale with a native quantity
  you control* (shield built, Spade value, combo size, discard pile) — not stack small flat
  bonuses, and never "all enemies" (one royal at a time).
- **The multiplication is frequency × magnitude.** The **passive raises how often** your key
  moment fires; the **ladder raises how much each firing is worth, and makes it scale.** A ladder
  rung that scales with a quantity the passive feeds (shield banked, kills this fight, combo size,
  discard pile) multiplies — it doesn't add.
- **C4 is a power fantasy.** The capstone should feel broken-in-a-good-way.

## How to use this

For each class pick **one Passive** and **pair one Ladder**, e.g.
*Sentinel = Phalanx × Thornline*. Drop the rest. 🪜 = floor-relevant (eases card-starvation).

**Engine grounding (why the old draft broke):** fights are **one royal at a time** (the 12-card
castle J→Q→K), so *no* board-wide effects. A **Spade's value is its shield** (a 2♠ = 2 shield),
and shield **reduces the enemy's net attack**; you survive by **discarding cards ≥ net attack**, so
the real resource being spent is **cards**. **Exact kill → recruit/graft; overkill → card lost.**
**No banks/wallets** (canon: no secondary subsystem). Multiplicative power must therefore scale
with a **native quantity** — shield built, Spade value, cards in hand/discard, combo size — or the
**across-run recruit/graft snowball**, never enemy count.

**The survivor test (what passes the cut):**
- **Passives are whispers** — fire once per enemy or relax one rule, *costed*, producing **concrete**
  value. **Never information/scry** (you churn the deck 3–4× per boss, so foresight is worthless),
  never a free resource, never another suit's job.
- **Ladders convert the key action into ONE resource that matters — and only four do: cards,
  library/deck-size, damage, deck-quality (recruits/grafts).** Anything scaling on selection,
  draw-order, or an already-neutralized threat is dead.
- **Ramp small → full;** the C4 reframes a whole resource onto your axis (a new *tension*, e.g.
  "your deck size is your defense"), never free value.
- **Frequency × magnitude:** the passive changes how *often* the key action fires; the ladder
  changes what it's *worth*.

---

## **SENTINEL** — Block
*Key moment: **a full block** — building enough Spade shield that the enemy's net attack hits 0 and
you discard nothing. The resource you're protecting is your hand. Outlasts where others race.*

### Passive signatures — *featherweight Continent-1 flavor* (pick one)
> A whisper, never an engine: small, costed, single nudge. Never free shield/draw/recovery, never another suit's job.

| Passive | Rule | Why it stays light |
|---|---|---|
| **Hold the Line** | Once per enemy, replay one Spade from your discard **for shield only** (no combo, no draw). | One card, once per enemy, shield only — not recovery (doesn't refill the Tavern like Hearts). |
| **Reinforce** | Your Spades still grant their shield when played **alongside one non-Spade card**. | Just relaxes a combo restriction — grants no extra value. |
| **Footwork** 🪜 | Once per enemy, **bury a Spade** from hand to the Tavern bottom and **draw 1**. | Net-zero cards — unclogs a bricked hand, once per enemy. |
| **Parry** | Once per enemy, play a Spade from hand as **emergency shield during the enemy's attack** (react instead of pre-committing). | Pure timing flexibility — the card is still spent. |

### Linear payoff ladders — *what blocking gives, rising C2→C4* (pair one)
**Confirmed** — each converts defense into one resource and ramps small → full:

| Ladder                                 | Continent 2                                                                                     | Continent 3                                                                     | Continent 4                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **A · Fortress** *(defense → cards)*   | Fully block (net 0) → draw 1.                                                                   | Draw **1 per 5 excess shield** beyond the attack.                               | Start of turn, draw **1 per 5 shield active — defense is a deck engine.                                              |
| **B · Thornline** *(defense → damage)* | Fully block → deal **3**.                                                                       | Fully block → deal **half your shield value**.                                  | **Every card of Spade deals double damage** to the enemy.                                                            |
| **C · Vigil** *(defense → library)* 🪜 | Once per enemy, **reclaim a Spade you blocked with** to hand (it can't block again this fight). | Cover a block shortfall from the **Tavern top** (up to 5) instead of your hand. | You **never discard from hand to block** — all shortfall comes off the Tavern top. Your deck size *is* your defense. |

---

## **EXECUTIONER** — Kill
*Key moment: an **exact kill** — damage exactly equal to the enemy's remaining HP. A new card is
recruited; an owned card grafts (replace one card's rank or suit). Overkill loses the card to
discard. The skill is hitting the number; the multiplier is the **deck getting better across all
12 enemies**.*

### Passive signatures — *featherweight: how you land the exact* (pick one)

| Passive | Rule | Why it stays light |
|---|---|---|
| **Steady Hand** | You may choose **not to double** a Club's damage (play it at base value). | A toggle to control your total — no extra value, just helps you hit exact. |
| **Whetstone** | Once per enemy, **shave up to 2** off one attack to land an exact kill. | Tiny reach, once per enemy. |
| **Bloodletting** 🪜 | Once per enemy, discard a card to add **half its value** (round down) to an attack. | Costs a card; halved so a big discard isn't a free nuke. |
| **Field Promotion** | A card you recruit enters your **hand** instead of the Tavern bottom. | You'd draw it soon anyway (deck churns) — just faster, no extra card. |

### Linear payoff ladders — *what an exact kill gives, rising C2→C4* (pair one)

| Ladder                                     | Continent 2                                                                                     | Continent 3                                                              | Continent 4                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **A · Conscript** *(kill → deck snowball)* | An exact kill on a **new** card recruits it to **hand**; on an **owned** card, graft as normal. | When you graft an owned card, apply that graft to **two** of your cards. | Every exact kill **both recruits the card and grafts** one of yours — the deck deepens with each head. |
| **B · Reaper** *(kill → cards)*            | An exact kill draws 1.                                                                          | An exact kill draws **2** and your next attack this turn deals **+2**.   | An exact kill **returns the cards you spent on it to your hand** — the kill pays for itself.           |
| **C · Warpath** *(kill → damage snowball)* | Each exact kill: **+1 damage** to all your attacks for the rest of the act.                     | **+2** per exact kill; an overkill still gives **+1**.                   | The accumulated bonus **doubles at each gate** — you reach every boss already overwhelming.            |

---

## **QUARTERMASTER** — Combine
*Key moment: a **big combine** — one turn that dumps a large total (same-rank combos cap at 10,
Aces pair). The native quantity is **how much you play in a single turn**.*

### Passive signatures — *featherweight: how you assemble the turn* (pick one)

| Passive | Rule | Why it stays light |
|---|---|---|
| **Dovetail** | Your combos may include **one card of an adjacent rank** (e.g. a 6 with 7s), still under the combo limit. | Bends the same-rank rule by one card — small reach, no extra value. |
| **Ace in the Hole** | Your Aces may copy the **rank** of one card played with them (not the suit). | The toned-down wild — flexibility, not a free anything. |
| **Stockpile** | Once per enemy, **exempt one card** from the forced discard-to-hand-size. | Keeps a single key card — not the infinite hand. |
| **Provisioner** 🪜 | Once per enemy, **draw 1 then discard 1** (dig one card deep). | Net-zero — unclogs a hand, once per enemy. |

### Linear payoff ladders — *what a big combine gives, rising C2→C4* (pair one)

| Ladder                                            | Continent 2                                  | Continent 3                                                             | Continent 4                                                                                                         |
| ------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **A · Arsenal** *(combine → damage ceiling)*      | Combos may total up to **12** instead of 10. | A combo of 4+ cards deals **+half its value again** (a 12 hits for 18). | **No combo cap** — your whole hand is one combo; emptying it **draws you back to full once per fight**.             |
| **B · Depot** *(combine → cards)*                 | Hand size **+1**.                            | Playing a combo of 3+ cards **draws 1**.                                | Start each turn by **drawing until your hand is full** — always at max (drains the library → deckbuilding tension). |
| **C · Double Issue** *(combine → action economy)* | Once per turn, play a **second** combo.      | **No limit** on combos per turn (each 2+ cards).                        | Play your **entire hand** in one turn as any number of combos; emptying it draws you back to full.                  |

---

## **SURGEON** — Persist
*Key moment: a **recovery** — a Heart moves cards from discard back into the Tavern. The native
quantity is the **discard pile** (a second deck). Distinct from Sentinel: Surgeon survives by
*recycling*, not shielding — and here choosing a **specific known card** to recover is real value
(not blind draw-scry).*

### Passive signatures — *featherweight: how/when you recover* (pick one)

| Passive | Rule | Why it stays light |
|---|---|---|
| **Triage** | When you recover, **choose** which card(s) return from discard. | Retrieving a *known* card is real value (not blind scry) — grants no extra card. |
| **Last Rites** | Once per enemy, recover a card **directly to your hand** instead of the Tavern. | Skips the deck churn for one card — faster, not more. |
| **Transfuse** | Once per enemy, play a Heart for its **shield or damage value** instead of recovering. | Just uses the card's value flexibly; costs the recovery. |
| **Field Dressing** 🪜 | Once per enemy, recover **1 extra** card. | One extra, once per enemy. |

### Linear payoff ladders — *what a recovery gives, rising C2→C4* (pair one)

| Ladder | Continent 2 | Continent 3 | Continent 4 |
|---|---|---|---|
| **A · Perpetuum** *(recovery → volume / anti-deckout)* | Each Heart recovers **+1** card. | Hearts recover on **every** Heart played (not once per enemy), recycling continuously. | When your Tavern empties, **return your entire discard — once per act**. You reset the well, but only once. |
| **B · Reanimator** *(recovery → quality / replay your best)* | You may recover your **recruited / high-value** cards specifically. | Recovered cards return **to hand**, replayable the same turn. | Once per fight, **resurrect up to 3 chosen cards** from discard straight to hand. |
| **C · Contagion** *(recovery → damage)* | Each card you recover deals **1 damage** to the enemy. | Recovery deals **2**; recovering on a turn you also attacked adds **+2** to that attack. | Recovery damage **scales with your discard pile size** — the longer the game runs, the harder it bites. |

---

## Cross-cutting (for the cut)
- **Vote on the Rule.** If a passive reads as a reward, it's a mislabeled ladder; if a ladder rung
  reads as a flat rule, it's a mislabeled passive. Re-file before voting.
- **Elegance check:** each survivor bends an *existing* rule, never adds a screen/subsystem.
- **Collisions to resolve in pairing:** Sentinel-**Vigil** (hand-preservation) vs Surgeon (persist);
  Sentinel-**Fortress** (block→draw) vs Surgeon/QM draw; QM-**Logistician** vs Surgeon's draw.
- **Floor coverage:** keep ≥1 🪜 option per class if the card-starvation fix lands at the class layer.

## Related pages
- [[v3/design/status/decisions-to-be-taken|Decisions to be taken — D1]]
- [[canon/v3/classes/overview|Class identities (canon)]]
- [[v3/design/status/active-design-questions|Active design questions — Q5]]
- [[proposals/classes/four-core-classes|Linear proposal]] · [[proposals/classes/facets-and-pressure-permutations|Facets proposal]]

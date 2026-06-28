---
type: note
status: accepted-direction
authority: derived
topics: [v3, classes, facets, linear, progression, personality, q5]
sources: [proposals/classes/facet-and-linear-candidates.md, proposals/classes/four-core-classes.md, proposals/classes/facets-and-pressure-permutations.md]
aliases: [Facet and linear candidates, Class candidate pool, Class personality pool]
last_updated: 2026-06-27
---

# Class progression — suit paths × selectable Staff

**Locked content (2026-06-27).** Two **orthogonal** menus per class — four **Passive signatures**
(the Staffs) and four **Linear payoff ladders** (the suit paths). Both menus ship in full: 16 Staffs
and 16 ladders, all approved. Source:
[[proposals/classes/facet-and-linear-candidates|candidate pool (source)]].

> **Mapped to the model ([[decisions/2026-06-27-v3.0-question-sweep|2026-06-27 sweep]], clarifying
> [[decisions/2026-06-24-crystals-continents-and-equipment|2026-06-24]]):** the four ladders below per
> class are its **four suit paths**; a class **starts on its home-suit path** (Sentinel ♠ / Executioner
> ♣ / Quartermaster ♦ / Surgeon ♥). **V3.0 lights only the C2 rung — a single ability, the ladder's
> first rung** (not laddered within C2); clearing C2 **unlocks all three other paths.** The **Staff is
> a separate passive — each class has four; you pick one of your class's four at class-select**
> (menu choice), **swapped at the Fallen Heroes shrine** (unlocked after C1; the swap offers one
> randomly-drawn Staff from each of the four classes). Path and Staff are **decoupled** — any
> Staff pairs with any class.

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

## The four ladders per class — one per suit axis (♠ ♥ ♦ ♣)

Every class now carries a **full suit set** of four payoff ladders. The suit names the **resource
the key moment is converted into** — not the trigger:

- **♠ survival** — the key moment hardens you (shield / payment efficiency).
- **♥ recycle** — it feeds the discard ⇄ library loop (Hearts, recovery, anti-deckout).
- **♦ cards** — it draws / grows the hand.
- **♣ damage** — it converts into killing power.

A class starts with the ladder matching **its own suit** and unlocks the other three over the run.

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

**Model confirmed (2026-06-27) — nothing is dropped.** Both menus ship in full:

- **All four ladders per class are kept** — they are the class's four **suit paths** (♠ ♥ ♦ ♣). A class
  starts on its home-suit ladder (only the **C2 rung** is live in V3.0); clearing C2 unlocks the other
  three. (The old "pair one ladder, drop the rest" framing is retired.)
- **All four passives per class are kept** — they are the class's four **Staffs**. At class-select you
  **pick one of your class's four**; **Fallen Heroes** later offers **one randomly-drawn Staff per
  other class** to swap into. 🪜 = floor-relevant (eases card-starvation).

† marked six ladders as proposed this pass (Bloodward, Harvest, Rationing, Munitions, Convalescence,
Lifeline); they are now **approved (2026-06-27)** — **all 16 ladders are locked.** All six are
*non-home* paths, so they affect only the post-C2 unlock layer, not a first V3.0 run.

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
| **Hold the Line** | Once per enemy, replay one Spade from your discard **for shield only** (no combo, no draw). That card doesn't do any damage | One card, once per enemy, shield only — not recovery (doesn't refill the Tavern like Hearts). |
| **Reinforce** | Combo but with +/-1 but one card and that card needs to be spade | Just relaxes a combo restriction — grants no extra value. |
| **Footwork** 🪜 | Once per enemy, **bury a Spade** from hand to the Tavern bottom and **draw 1**. | Net-zero cards — unclogs a bricked hand, once per enemy. |
| **Parry** | Once per enemy, play a Spade from hand as **emergency shield during the enemy's attack** (react instead of pre-committing). | Pure timing flexibility — the card is still spent. |

### Linear payoff ladders — *what blocking gives, one per suit axis, rising C2→C4*

| Ladder | Continent 2 | Continent 3 | Continent 4 |
|---|---|---|---|
| **♠ · Bastion** *(block → survival)* | **Excess** Spade shield (beyond the enemy's attack) carries to the next enemy: **1 shield per excess Spade card**. | **3 shield** per excess Spade card carried forward. | Carry forward **half each excess Spade's value** — over-block is never wasted; the wall spills fight to fight (still resets its accrual — never compounds into immortality). |
| **♥ · Vigil** *(block → recycle)* 🪜 | Once per enemy, **reclaim a Spade you blocked with** to hand (it can't block again this fight). | Cover a block shortfall from the **Tavern top** (up to 5) instead of your hand. | You **never discard from hand to block** — all shortfall comes off the Tavern top. Your deck size *is* your defense. |
| **♦ · Fortress** *(block → cards)* | Fully block (net 0) → draw 1. | Draw **1 per 5 excess shield** beyond the attack. | Start of turn, draw **1 per 5 shield active** — defense is a deck engine. |
| **♣ · Thornline** *(block → damage)* | Fully block → deal **3**. | Fully block → deal **half your shield value**. | **Every card of Spade deals double damage** to the enemy. |

---

## **EXECUTIONER** — Kill
*Key moment: an **exact kill** — damage exactly equal to the enemy's remaining HP. A new card is
recruited; an owned card grafts (replace one card's rank or suit). Overkill loses the card to
discard. The skill is hitting the number; the multiplier is the **deck getting better across all
12 enemies**. The ♠/♥ ladders deliberately read off **overkill** and **Clubs** so the kit isn't
"exact kill does X" four times over.*

### Passive signatures — *featherweight: how you land the exact* (pick one)

| Passive | Rule | Why it stays light |
|---|---|---|
| **Steady Hand** | You may choose **not to double** a Club's damage (play it at base value). | A toggle to control your total — no extra value, just helps you hit exact. |
| **Whetstone** | Once per enemy, **shave up to 2** off one attack to land an exact kill. | Tiny reach, once per enemy. |
| **Bloodletting** 🪜 | Once per enemy, discard a card to add **half its value** (round down) to an attack. | Costs a card; halved so a big discard isn't a free nuke. |
| **Field Promotion** | A card you recruit enters your **hand** instead of the Tavern bottom. | You'd draw it soon anyway (deck churns) — just faster, no extra card. |

### Linear payoff ladders — *what the kill gives, one per suit axis, rising C2→C4*

| Ladder | Continent 2 | Continent 3 | Continent 4 |
|---|---|---|---|
| **♠ · Bloodward** *(overkill → survival)* † | An **overkill** grants shield equal to the overkill amount (max **5**) against the next enemy — wasted force becomes armor. | The overkill shield is **uncapped**. | The overkill shield is **doubled** — even your sloppy kills wall you completely. |
| **♥ · Harvest** *(Clubs → recycle)* † | Each **Club** you play also shuffles **1 card** from your discard into the Tavern. | **2 cards** per Club. | Cards equal to **half the Club's value** — your damage suit is also your engine of return. |
| **♦ · Reaper** *(kill → cards)* | An exact kill **draws 1**. | An exact kill lets you **look at the top 5 and draw 2**. | **Bounce-back** — an exact kill returns its card to your **hand**, plus look at the top 5 and draw 2. |
| **♣ · Conscript** *(kill → deck-quality)* | An exact kill recruits the card straight to your **hand**. | …and the graft applies **both** properties (rank **and** suit), not just one. | …and you may graft **any** card — in hand **or** the Tavern — applying both properties. The deck deepens with every head. |

---

## **QUARTERMASTER** — Combine
*Key moment: a **big combine** — one turn that dumps a large total (same-rank combos cap at 10,
Aces pair). The native quantity is **how much you play in a single turn**. The ♠/♣ ladders read off
**hand size** and **payment**, not combos, so the kit isn't "play a combo, get X" four times over.*

### Passive signatures — *featherweight: how you assemble the turn* (pick one)

| Passive | Rule | Why it stays light |
|---|---|---|
| **Dovetail** | Your combos may include **one card of an adjacent rank** (e.g. a 6 with 7s), still under the combo limit. | Bends the same-rank rule by one card — small reach, no extra value. |
| **Ace in the Hole** | Your Aces may copy the **rank** of one card played with them (not the suit). | The toned-down wild — flexibility, not a free anything. |
| **Stockpile** | Once per enemy, **exempt one card** from the forced discard-to-hand-size. | Keeps a single key card — not the infinite hand. |
| **Provisioner** 🪜 | Once per enemy, **draw 1 then discard 1** (dig one card deep). | Net-zero — unclogs a hand, once per enemy. |

### Linear payoff ladders — *what a big combine gives, one per suit axis, rising C2→C4*

| Ladder | Continent 2 | Continent 3 | Continent 4 |
|---|---|---|---|
| **♠ · Rationing** *(payment → survival)* † | When you pay an attack, the **first card** discarded counts as **double** its value (pay more with fewer cards). | The **first two** cards discarded count double. | You may pay attacks from the **top of the Tavern** instead of your hand — your supply line absorbs the hits. |
| **♥ · Requisition** *(combine → recycle)* | When you play a combo, **one of its cards** goes to the **top of the library** instead of the discard. | A combo (or same-value cards) you discard goes to the **top of the Tavern** instead of the discard. | Once per enemy, **search the discard or library** for cards that complete a combo and take them. |
| **♦ · Depot** *(combine → cards)* | **Hand size +2.** | Hand size +2; **playing a combo draws 1**. | Hand size +2; playing a combo lets you **look at the top 5 and draw 2** (on top of the above). |
| **♣ · Munitions** *(hand size → damage)* † | Your **first attack each turn** deals **+1 per 3 cards in hand**. | **+1 per 2 cards** in hand. | Add your **full hand size** to your first attack's damage — a stocked hold is a lethal one. |

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

### Linear payoff ladders — *what a recovery gives, one per suit axis, rising C2→C4*

| Ladder | Continent 2 | Continent 3 | Continent 4 |
|---|---|---|---|
| **♠ · Convalescence** *(recover → survival)* † | Each card you **recover** also grants **1 shield** this fight. | **3 shield** per recovered card. | Shield equal to **half each recovered card's value** — scales with the discard pile (your second deck). |
| **♥ · Renewal** *(discard → recycle)* | When you discard **3+ cards** to pay an attack, **recover 1**. | …and your **first attack each fight** sends its paid cards to the **Tavern** instead of the discard. | **Every** attack sends paid cards to the **bottom of the library** instead of the discard — you never truly lose a card. |
| **♦ · Lifeline** *(recover → cards)* † | When you recover, also **draw 1**. | Recovering lets you **look at the top 5 and draw 2**. | Recovery becomes direct refill — cards you recover go **straight to your hand** instead of the Tavern. |
| **♣ · Sterilize** *(empty discard → damage)* | Before the enemy attacks, if your **discard is empty**, deal **2**. | If your discard holds **1 or fewer**, deal **3**. | Deal **5 − X**, where X = cards in your discard — a clean discard is a scalpel. |

---

## Cross-cutting (for the cut)
- **Vote on the Rule.** If a passive reads as a reward, it's a mislabeled ladder; if a ladder rung
  reads as a flat rule, it's a mislabeled passive. Re-file before voting.
- **Elegance check:** each survivor bends an *existing* rule, never adds a screen/subsystem.
- **Collisions to resolve in pairing:** Sentinel-**Vigil** (hand-preservation) vs Surgeon (persist);
  Sentinel-**Fortress** (block→draw) vs Surgeon/QM draw; QM-**Depot** draw vs Surgeon-**Lifeline**.
- **Floor coverage:** keep ≥1 🪜 option per class if the card-starvation fix lands at the class layer.

## Related pages
- [[v3/design/status/decisions-to-be-taken|Decisions to be taken — D1]]
- [[canon/v3/classes/overview|Class identities (canon)]]
- [[v3/design/status/active-design-questions|Active design questions — Q5]]
- [[proposals/classes/four-core-classes|Linear proposal]] · [[proposals/classes/facets-and-pressure-permutations|Facets proposal]]

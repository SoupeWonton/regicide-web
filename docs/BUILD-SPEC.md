# Regicide — Unity Build Specification (v3.0 alpha)

**Read this whole document before writing code.** It is the complete, self-contained
specification for building *Regicide* as a **single-player desktop game in Unity (C#)**.
There is an existing web prototype; **you are not porting it** — you are building a clean
implementation from this spec. Where this spec gives exact numbers, use them; where it
says "placeholder / tunable," keep the value but centralize it so it's easy to change.

- **Engine:** Unity (LTS, 2022.3+ or Unity 6). C#. **No multiplayer, no networking, no server.**
- **Target:** Windows/Mac standalone (Steam/itch). Mouse-first desktop UI.
- **Scope of this build (the alpha):** Continent 1 + Continent 2 (class select → build a
  full A–10 deck by conquest → three royal gates → crown = victory). Continents 3–5 are
  described in §13 for context only — **do not build them.**

---

## 1. What the game is

*Regicide* is a solo roguelike deckbuilder built on the card game Regicide. The core
fantasy: **"You don't build a deck — you conquer one."**

You start with a tiny 20-card deck. Every permanent card you add is an enemy you defeated
(recruited on an *exact kill*) or a member of the royal court you claimed at a gate. There
is **no generic card draft and no shop for cards.** You fight up a branching road, growing
and reshaping a standard 52-card deck, until you defeat a King and crown yourself.

### Design pillars (obey these — they are the point of the game)
1. **Conquest-first acquisition.** Permanent cards enter *only* from the starting court or
   from defeated enemies. Never a generic draft/shop for cards.
2. **One engine.** Deck growth + card grafts carry the primary progression. Do not add
   parallel currencies/inventories/ability subsystems. The one shared resource is *your cards*.
3. **Legible vocabulary.** Never sprawl past the standard 52-card language. A "7♠" always
   means a 7 of spades.
4. **Depth over width.** Depth = reasoning across turns (good). Width = pricing several
   incommensurable effects in a single instant (bad — humans choke on it). Every new
   mechanic must **modify one existing station of the loop, never add a new simultaneous one.**
5. **Bounded, at-a-glance power.** All non-deck power lives in exactly **five fixed
   equipment slots** (one class **Staff** + four **relics**) plus **four spell crystals**
   (one per suit in a "gauntlet"). No open inventory, no free-floating currency.
6. **No soft-locks.** A deck can lose a fight but must never be unable to act. Forgiveness
   is front-loaded (opening hand, seam rests); difficulty is back-loaded (royal gates).
7. **Determinism.** All randomness flows through one **seeded RNG** (see §11). Never call
   `UnityEngine.Random` in game logic.

---

## 2. Technical architecture (build it this way)

Split the project into **two assemblies** with a hard dependency rule:

```
Regicide.Core   (pure C#, NO UnityEngine dependency)   ← all rules, state, RNG
Regicide.Unity  (MonoBehaviours, UI, assets)           ← depends on Core, never the reverse
```

**Why:** The design *demands* a legible, testable rules engine. Keeping Core free of
Unity types means the entire game can be simulated and unit-tested headlessly, and the UI
is a pure function of state. This is the single most important architectural decision.

### Regicide.Core
- Plain C# classes/structs for all state (§4) and a deterministic RNG (§11).
- A **command/reducer** shape: the UI submits an `IAction` (e.g. `PlayCards`, `Discard`,
  `PickReward`, `CastSpell`); Core validates, mutates state, and returns either an error or
  a list of **events** (§10) describing what happened. **Validate-then-mutate:** an invalid
  action returns an error and mutates nothing.
- A single entry point, e.g. `GameSession` holding `CampaignState`, exposing:
  `IReadOnlyState State { get; }`, `Result Dispatch(IAction a)`.
- No `async`, no threads, no time — a turn is a synchronous function call.

### Regicide.Unity
- **Scenes:** `MainMenu`, `Run` (one scene drives the whole run via a state machine keyed
  on `CampaignPhase`, §4). Keep it simple; screens are panels toggled by phase, not
  separate scenes.
- **Presentation = pure view of Core state.** After every `Dispatch`, re-render from
  `State` and play back the returned `events` as animations/popups.
- **Content as ScriptableObjects** (§12): classes, staffs, relics, spells, ladder rungs,
  encounter/enemy defs, road-map templates. Designers tune data without recompiling Core.
  Core references content by **string id**; the Unity layer resolves ids → ScriptableObjects
  for display. (Core may hold its own plain-C# copy of the content tables, or receive them
  injected at startup — either is fine as long as Core has no UnityEngine reference.)
- **Input:** mouse click/drag to select and play cards. Keyboard shortcuts optional.
- **UI framework:** uGUI or UI Toolkit — your choice; UI Toolkit is recommended for the
  data-heavy panels (deck viewer, relic bag, gauntlet).

### Persistence
- **No mid-run save/resume.** A run is a single session. If the app closes mid-run, the run
  is gone.
- **Only the lineage/meta persists** (§14): a small JSON file (Newtonsoft or `JsonUtility`)
  in `Application.persistentDataPath`. Meta banks *options, not power*.

---

## 3. Base Regicide combat (exact rules & math)

This is the tactical core every fight runs on. All numbers are exact.

### Cards
- **Suits:** Clubs `C` (♣), Diamonds `D` (♦), Hearts `H` (♥), Spades `S` (♠).
- **Ranks & attack value:** A=**1**, 2–10 = face value, J=**10**, Q=**15**, K=**20**.
  (Jesters/Jokers from base Regicide are **cut** — solo has zero jesters. Do not implement them.)
- A card has a stable identity (see §5 physical cards), a **printed** face, and an
  **effective** face derived from grafts.

### Enemies (royals)
| Royal | HP | Attack |
|---|---|---|
| Jack (J) | 20 | 10 |
| Queen (Q) | 30 | 15 |
| King (K) | 40 | 20 |

An enemy also has a **suit** (its card's suit) which drives **immunity** (below), a running
**shield** (starts 0), and a per-fight `immunityNullified` flag (rarely set; see relics/spells).

Number-card enemies (C1 recruiting targets, ranks 6–10) use scaled stats:
**HP = rank × 3, Attack = max(2, round(rank × 0.55))**. (E.g. a 6 → HP 18, ATK 3; a 10 →
HP 30, ATK 6.) These are the enemies you recruit in Continent 1.

### The turn loop (one actor — the player)
Each turn the player either **plays cards** or **yields**, then the enemy counterattacks
(unless it just died), then if needed the player **discards to defend**.

**1. Play phase.** Player plays a legal set of cards (see combos). Compute
`baseAttack = sum of effective values of played cards`. Then resolve the suit powers of the
**distinct effective suits present**, minus any suit the enemy is immune to:
- **Immunity:** `immuneSuit = enemy.suit` (unless `immunityNullified`). Any played suit equal
  to `immuneSuit` still contributes its *value to damage* but its *power is blocked*.
  (E.g. vs a Spades enemy, spade cards deal damage but grant **no shield**.)
- **♣ Clubs — double damage:** if Clubs is an active suit, `damage = baseAttack × 2`
  (doubles the *entire* play's value, not just the club cards). Else `damage = baseAttack`.
- **♠ Spades — shield:** if active, `enemy.shield += baseAttack` (cumulative; reduces the
  enemy's counterattack this and future turns while it lives).
- **♥ Hearts — recover:** if active, take `min(baseAttack, discardCount)` cards from the
  discard pile, shuffle them (seeded), place them on the **bottom** of the Tavern (draw pile).
- **♦ Diamonds — draw:** if active, draw up to `baseAttack` cards from the Tavern into hand,
  capped at max hand size (see below). (Solo: just "draw up to N, capped at hand limit.")

Apply `damage` to `enemy.hp`. Played cards go to the discard pile.

**2. Kill check.**
- `enemy.hp == 0` → **exact kill.** This is the reward trigger (see §6 recruiting/graft).
  The enemy card leaves play. **Same player plays again immediately — no counterattack.**
- `enemy.hp < 0` → **overkill.** Enemy defeated but *no* recruit reward (card is discarded/
  banished; C2 gate overkills are banished entirely). Same player plays again, no counterattack.
- `enemy.hp > 0` → enemy survives → counterattack (step 3).
- When the fight's last enemy dies, the fight is **won**.

**3. Counterattack (only if the enemy survived).**
- `netAttack = max(0, enemy.attack − enemy.shield)`.
- If `netAttack == 0` (fully shielded): no damage, turn ends (play again next turn).
- Else the player must **defend by discarding**: `maxCoverable = sum of values of all cards
  in hand`. **If `maxCoverable < netAttack` → the player DIES (run ends).** Otherwise the
  player selects cards whose summed value `≥ netAttack`; those cards go to discard. Only the
  *total value* matters — the player chooses which cards to sacrifice.

**Yield:** instead of playing, the player may yield (play nothing) — skip straight to the
counterattack with the same defend math. (No "all players yield" guard needed; solo.)

### Combos (legal multi-card plays)
- **1 card:** always legal.
- **Ace pairing ("animal companion"):** exactly one Ace + exactly one non-Ace card of any
  rank/suit. Both suits' powers fire. Combined value = 1 + partner's value.
- **Same-rank set:** 2+ cards all sharing one rank, with **total value ≤ 10**. All suits
  present fire their powers. (So a pair of 5s, three 3s, etc. Royals can't combo — a single
  J already = 10.)
- Any other multi-card combination is illegal.

### Hand & deck setup (solo)
- **Max hand size: 5** in the campaign. (Note: base quick-Regicide used 8 for solo; the
  campaign uses **5** as the hand cap — relics/staffs can raise it, e.g. Hoard +2, Depot +2.)
- The player's deck, Tavern (draw pile), and discard **persist between road fights**
  (attrition is canon). **Only explicit rests reshuffle/redraw** (§9). When the Tavern is
  empty, draws simply fizzle — it is *not* auto-recycled; only Hearts or a rest refills it.

---

## 4. State model & run flow

### CampaignState (the root — Core owns it)
Key fields (name them clearly; this is the shape, not literal code):
- `id`, `seed` (string), `rngState` (serialized RNG cursor), `createdAt`
- `phase: CampaignPhase`
- `continent: int` (1–2 in this build), `province: int` (1–3 within a continent),
  `chapter: int` (1–6 overall: C1 = ch1–3, C2 = ch4–6)
- `hero: Hero` (single hero — solo)
- `map: RoadMapState | null`, `encounter: EncounterState | null`
- `deck: { tavern, discard, hand } | null` (the persistent deck between fights; the live
  copy lives in `encounter` during a fight and is written back on fight end)
- `ownedCards`, `cards` (physical-card registry, §5)
- `gauntlet` (four suit slots), `tokenFragments`, `tokenHalves` (spell economy, §7)
- `relicBag`, `relicSlots` (four named slots, §8)
- `pendingChoice: PendingChoice | null` (reward/gate/graft decisions awaiting input)
- `log: string[]`

### CampaignPhase (drives the UI state machine)
`class_select` → `road` → (`landmark` | `encounter` | `death` | `camp`) → … →
`chapter_complete` → … → `campaign_won` | `campaign_lost`.

### Hero (solo)
- `classId`, `staffId` (chosen at class select; swappable at Fallen Heroes)
- `pathC2` (the home-suit C2 ladder rung, lit on entering C2)
- `alive`

### Run flow (top level)
1. **`class_select`** — pick 1 of 4 classes and 1 of that class's 4 Staffs (§10). Start with
   the 20-card A–5×4 deck. This is the first meaningful choice (pillar).
2. **Continent 1 (Claim) — chapters 1–3.** Three provinces, each a branching road ending in
   a boss. **Recruit number cards 6–10 by exact kill** to grow toward a full A–10 deck.
   - Province 1 fields **6s and 7s**; Province 2 **8s and 9s**; Province 3 **10s / Council**.
   - The **Hunt** landmark (C1 only) lets you chase a specific recruit you missed.
3. **Seam rest** at each province boundary (§9).
4. **Continent 2 (Shape) — chapters 4–6.** Number deck is complete; ordinary road exact-kills
   now **graft** (§6). Three **royal gates**, one per province:
   - **ch4 Jack Gate** — fight all four Jacks; **keep 3, leave 1**.
   - **ch5 Queen Gate** — fight all four Queens; **keep 2 of 4** (two sequential picks).
   - **ch6 King Gate** — fight all four Kings; **keep 1 (the crown)** → **victory**.
   - Entering C2 lights your home-suit **path C2 rung** (§10). The **Fallen Heroes** shrine
     at the start of C2 Province 2 lets you swap your Staff.
5. **Victory** on picking the crown at the King Gate → `campaign_won`. Death anywhere →
   `campaign_lost`, run over (no revive, no save).

Target length for this alpha slice (C1+C2): roughly ~2 hours for a deliberate first clear;
tune later.

---

## 5. Cards, grafts & the physical-card model

Cards need **stable identity** because grafts permanently rewrite them and the deck is
rebuilt/reshuffled repeatedly.

- Every owned card is a **PhysicalCard**: `{ physicalId, printed: {suit, rank}, grafts: [] }`.
  `physicalId` is minted from a per-run counter and survives reshuffles and rank/suit changes.
- The **printed** face never changes. The **effective** face is *derived* (never stored) by
  applying grafts in order.
- A **GraftRecord**: `{ seq, kind: 'rank'|'suit'|'suit-add', from, to, source }`.
  - `rank` — **replace** the effective rank (A–10 only; **royal cap: never above 10**).
  - `suit` — **replace** the primary suit (transmute; from Consecrate / Press-gang).
  - `suit-add` — **add** a second active suit (the exact-kill graft — see §6). The card keeps
    its primary suit *and also* fires the added suit.
- **Effective suits** = the primary effective suit ∪ all `suit-add` suits. In combat, a
  card fires the power of **each** of its effective suits (subject to immunity). E.g. a
  `5♠` with a `suit-add ♦` is a `5♠♦`: playing it deals 5 damage and triggers both shield
  (♠) and draw (♦).
- Runtime deck cards carry their `physicalId` so any view can join to the registry for
  printed-vs-effective display and graft provenance.

---

## 6. The acquisition engine (recruit / graft) — the heart of the game

Everything hangs off the **exact kill** (dealing damage exactly equal to the enemy's HP).

- **Exact kill of an enemy you do NOT own → recruit it.** The card becomes a new PhysicalCard
  added to your owned cards and shuffled into your Tavern (relics can change where it lands).
  This is how C1 grows your deck from A–5 to a full A–10.
- **Exact kill of a card you ALREADY own → graft** (a redundant kill). You choose **one card
  in hand** and apply **one of two branches** (the player picks):
  1. **Replace rank** — that hand card's rank becomes the slain enemy's rank (**capped at 10**).
  2. **Add suit** — that hand card gains the slain enemy's suit as a *second* active suit
     (`suit-add`; additive, keeps its own suit). Rejected as a no-op if the card already
     fires that suit.
  - These are the two ways the deck deepens: rank grafts grow the *number* axis; suit-add
    grafts grow the *suit* axis. Keep them competitive.
- **Overkill** (hp < 0) gives **no** recruit/graft (the card is lost/banished). Exact
  precision is the skill the game rewards.
- **Grafts come ONLY from exact kills.** No fragment currency for grafts, no graft shop.
- **Royal kills** (C2 gates and C2 road duels) graft like any owned kill, but the rank cap of
  **10** means a royal can never push a card above 10.

**C2 royal gates (the 3/2/1 pyramid).** After clearing a gate fight (all four royals of that
rank appear as duels), a `PendingChoice` (`royal_keep`) resolves which royals you recruit:
- **Jack Gate:** keep 3 — the player picks the **one Jack to leave behind**.
- **Queen Gate:** keep 2 — two sequential "which follows you" picks.
- **King Gate:** keep 1 — pick the **crown**; the other kings are left. This **finalizes
  victory** (`campaign_won`). The crown is a flavorful capstone card choice — build identity
  rides on your suit ladder/crystal, *not* on which King you kept.
- Kept royals are minted as real PhysicalCards and shuffled into the Tavern. Left-behind and
  overkilled royals are **not** recruited (gate overkills are banished, no discard drop).
- Final deck entering C3 (post-alpha) is ≈46 cards (40 numbers + 6 royals) — a good sanity
  check that the pyramid is wired right.

---

## 7. Spells — crystals, gauntlet, bracelet, forge

A **bounded, legible** spell system — the *only* sanctioned exception to "no secondary wallet."

- **Four spell identities, one per suit:** ♣ = attack, ♦ = draw, ♠ = block, ♥ = recover.
- A spell is a **scarce one-use trump** in a dedicated area — **not** shuffled into the
  Tavern, **not** counted against the hand limit. **At most one spell per suit may be cast
  per combat.** Spells sit **above** suit immunity (a ♦ spell works vs a ♦-immune enemy).

### Crystal tiers
Each suit's crystal can be at tier **0 (empty)**, **1 (Fragment)**, or **2 (Half)**.
- **Fragment** — the suit's basic castable emergency spell.
- **Half** — forged from fragments; the strongest castable expression.
- **Full** — a non-castable win token — **NOT in this build.** (Progress toward Full is a
  post-alpha/V3.5 concept; do not implement the Full tier or the endgame it triggers.)

### The fragment economy (agnostic)
- **Fragments are generic** (not suit-typed). Kept as two integer pools on the state:
  `tokenFragments` and `tokenHalves`.
- **A fragment drops with 50% chance after each won encounter.** (Also from redundancy
  conversions if you implement Council backfill — optional.)
- **No fragment from a graft trigger** — grafts and fragments are separate systems.

### The gauntlet (four suit slots)
- `gauntlet: { S, D, H, C } → { tier: 0|1|2 }`. **One crystal per suit.**
- Between encounters, on the **bracelet** screen, the player **arms** a pool item into an
  **empty** slot: a fragment → that suit's Fragment spell; a Half → that suit's Half spell.
  Occupied slots are refused (must cast/empty first). The bracelet also previews what's armed
  for the next fight, and lets the player *sandbag* fragments (hold them to forge Halves).
- **Cast** (`cast_spell` targeting a suit): resolves the effect, then **empties that slot to
  tier 0** (casting consumes the whole slot). One cast per suit per combat.

### The Forge (a landmark)
- Verb = **convert 2 fragments → 1 Half** (`FRAGMENTS_PER_HALF = 2`), banked into
  `tokenHalves`. The menu always opens (even with <2 fragments); repeatable while you have ≥2.
  The Half is later armed onto a suit via the bracelet.

### Spell effects (placeholder numbers — centralize them)
| Suit | Fragment | Half |
|---|---|---|
| ♣ | **Keen Edge** — next attack ×2 | **Commit** — next play may include ONE extra card of any rank (combo cap still applies; not with an Ace pair) |
| ♦ | **Quick Muster** — draw 2 | **Rally** — armed: at the next counterattack, draw `min(net, 5)` before paying |
| ♠ | **Guard Up** — enemy shield +3 | **Brace** — during your pay step, spend your highest hand card to discard; its value adds to shield and cuts the required payment |
| ♥ | **Refit** — return 3 discards to Tavern, draw 1 | **Full Recycle** — return the *entire* discard to Tavern, draw 2 |

---

## 8. Relics — five... four slots + the bag

Relics are **rare, run-defining rule-benders**, each bending *one* rule of the core loop in
a single sentence. They are equipment, held one per **named slot**:

- **Four relic slots, one relic each:** **Hat, Amulet, Ring, Cloak.**
  (Together with the class **Staff**, that's the "five fixed equipment slots" of pillar 5.)
- Relics earned at the **Lair** (raid — pick 1 of 2 unowned) or **Caravan** (pay-from-hand,
  cost 8 card-value, placeholder) collect in a **bag**. The player equips from the bag into
  the matching slot; a relic fits **only** its own slot type. The bag can hold more than four,
  so equipping is a build choice.
- **Swaps are free at any between-encounter screen; locked during combat.**

**Slot themes (locked):** Cloak = roads/between-fight layer · Ring = economy/cards-as-resource
· Hat = recruitment (exact-kill→recruit) · Amulet = activated button (refreshes; not one-use).

### The 29 relics (implement all)

**Cloak (roads) — 6**
- **Forked Road** — at a road fork, reveal both branches (landmark/enemy type) before choosing.
- **Forced March** — skip one ordinary fight per province (skirmish/veteran; not elites) — but gain no recruit/graft from it.
- **Bedroll** — once per province, reshuffle discard into Tavern without a Camp.
- **Vanguard** — the first enemy of each new road can't counterattack on its first turn.
- **Slip Away** — discard 5 (value) to retreat from a fight: keep your hand, enemy not defeated.
- **Scout Ahead** — see the next enemy's immunity before you fight it (fights start with lineup revealed).

**Ring (economy) — 8**
- **Hoard** — max hand size +2.
- **Interest** — if you paid no discards in the previous fight, start the next fight +1 card.
- **Debt** — once per fight, draw 2 now, then discard 1 at the start of each of your next two turns.
- **Requisition Writ** — once per province, convert your two lowest cards into one fragment.
- **Liquidate** — once per fight, discard one card to draw 2.
- **Last Coin** — the first time you begin a turn empty-handed each fight, draw 3 (before the death test).
- **Caravan Coin** — Caravan pay-from-hand cost reduced by 2 (card value).
- **Double or Nothing** — once per fight, discard your whole hand (n cards) and draw n+1.

**Hat (recruitment) — 8**
- **Conscription** — an overkill still recruits the card, but it enters with a **−1 value token** (one rank down).
- **Press-gang** — recruited cards arrive rewritten to your class **home suit** (a suit *replace*, not add).
- **Rallying Cry** — when you recruit, also return one card from discard to the Tavern.
- **Battlefield Promotion** — the first card you recruit each fight enters +1 rank (cap 10).
- **Black Standard** — a recruited card enters the **top** of the Tavern (your next draw).
- **Apprentice** — you may immediately discard a fresh recruit to draw 2 (or: on recruit, draw 1).
- **Muster** — recruited (gate-kept) royals enter the Tavern top.
- **Plunder** — on an exact kill, swap the recruit for a stronger same-suit card in your discard.

**Amulet (activated buttons; refresh as noted) — 7**
- **Sainted Scalpel** — once/fight: shuffle up to 6 cards from discard into Tavern, draw 1.
- **Unbinding** — once/enemy: cancel the enemy's immunity for this play only.
- **Second Wind** — once/fight: take an extra turn before the enemy counterattacks.
- **Aegis** — once/enemy: reduce the enemy's next counterattack by 5.
- **Bloodlust** — once/enemy: your next play deals +3 damage.
- **Echo** — once/fight: replay a card from your discard for its **value only** (no suit power).
- **Lodestone** — once/fight: pull one specific named card from the Tavern into your hand.

> Note: the "−1 value token" from Conscription is a small per-card value modifier on a
> recruited card — implement it as a graft-like value adjustment on that PhysicalCard. It is
> unrelated to the spell fragments.

---

## 9. Rests: seam reset & Camp

Two distinct recovery mechanics — keep them separate:

- **Seam reset (automatic).** At every province boundary (3 per continent), on the recap
  screen: reshuffle discard into Tavern, then **draw up to 5** (keep current hand, draw until
  holding 5). No block, no double attack.
- **Camp (optional road landmark) — a 4-part bundle, all fires:**
  1. reshuffle discard → Tavern,
  2. draw up to 5,
  3. the **first attack of the next fight deals double**,
  4. **start the next fight with 10 block** (i.e. 10 shield already on the first enemy).

**Opening-hand forgiveness:** every dealt hand must contain **at least one Diamond** so no
fight begins unable to draw. (Implement by swapping the lowest card for the Tavern's first ♦
at each deal.)

---

## 10. Classes, Staffs & paths (the character system)

A class = **a Staff (its home-suit passive)** + **a suit-path tree** (the *other three*
suit axes, unlocked one per continent). In this build, only the **home-suit C2 rung** is live;
all other rungs are visible-but-locked greyed data (teasers). All four classes **start from
the identical 20-card A–5×4 deck** — class identity comes only from Staff + path, no deck skew.

| Class | Role | Home suit | Home C2 rung (lit on entering C2) |
|---|---|---|---|
| **Sentinel** | block/defense | ♠ | **Bastion** — on enemy death, if shield > attack, next enemy starts with shield = min(#spade cards played vs this enemy, excess shield) |
| **Executioner** | kill/aggression | ♣ | **Conscript** — exact-kill recruits enter your **hand** (not the Tavern) |
| **Quartermaster** | combine/tempo | ♦ | **Depot** — max hand size +2 |
| **Surgeon** | persist/recovery | ♥ | **Renewal** — paying a counter with 3+ cards recovers 1 (highest-value discard returns to Tavern bottom) |

### The 16 Staffs (4 per class — pick one at class select)
**Sentinel (♠)**
- *Hold the Line* (activated, once/enemy) — auto-take the highest ♠ in discard, add its value to shield; the card stays in discard.
- *Reinforce* (passive) — a same-rank combo may include ONE ♠ of any rank.
- *Footwork* (activated) — bury a hand ♠ to the Tavern bottom, draw 1.
- *Parry* (activated, pay step) — spend a hand ♠: its value adds to shield and reduces the payment owed.

**Executioner (♣)**
- *Steady Hand* (toggle) — the next play skips the ♣ double (deal single damage on purpose).
- *Whetstone* (passive, once/enemy) — auto-shave a 1–2 point overshoot down to an exact kill.
- *Bloodletting* (activated) — discard a card, add ⌊value/2⌋ to the next attack.
- *Field Promotion* (passive) — exact-kill recruits enter your hand (not the Tavern).

**Quartermaster (♦)**
- *Dovetail* (passive) — a same-rank combo may include ONE adjacent-value card of any suit.
- *Ace in the Hole* (activated toggle) — the next Ace pair plays the Ace at the partner's value.
- *Stockpile* (once/enemy) — keep one extra overdraw card; hand may exceed cap by 1.
- *Provisioner* (activated) — discard 1, then draw 1.

**Surgeon (♥)**
- *Triage* (passive) — recovery pauses (a `recover_select` step): pick any cards up to the recovered amount from discard → Tavern.
- *Last Rites* (passive, once/enemy) — pick any one recovered card into your hand.
- *Transfuse* (toggle, once/enemy) — the next ♥ play skips recovery; its base value becomes shield instead.
- *Field Dressing* (passive, once/enemy) — the first recovery each enemy recovers +1.

### The path tree (16 ladders = 4 classes × 4 suits)
- The **diagonal** (each class's home suit) is its **Staff** axis.
- The **9 off-diagonal** cells are **tree branches** — each converts the class's key moment
  into a different suit's resource, unlocking **one branch per continent** (C2 / C3 / C4).
- **In this build, only the C2 home-suit rung is functional** (the four rungs in the table
  above: Bastion / Conscript / Depot / Renewal). All other ladders/rungs are **locked data**
  shown greyed-out as future teasers. Ship their names/text as data but don't implement effects.
  (Locked ladder names, for the teaser UI — Sentinel: Vigil ♥, Fortress ♦, Thornline ♣;
  Executioner: Bloodward ♠, Harvest ♥, Reaper ♦; Quartermaster: Rationing ♠, Requisition ♥,
  Munitions ♣; Surgeon: Convalescence ♠, Lifeline ♦, Sterilize ♣.)

### Fallen Heroes (landmark, start of C2 Province 2 / ch5)
Swap your Staff: offered **one random Staff drawn from each of the four classes** (your own
class included, so it may re-roll within your class). Free, repeatable at that stop.

---

## 11. Determinism & RNG (critical)

- Implement one **seeded RNG** in Core. Port **mulberry32** with a string→uint seed hash so a
  given seed reproduces a run exactly:
  - Seed hash (FNV-like): `h = 1779033703 ^ length; for each char: h = imul(h ^ code, 3432918353); h = (h<<13)|(h>>>19); return h >>> 0`.
  - `next()`: `a = (a + 0x6D2B79F5); t = imul(a ^ (a>>>15), 1|a); t = (t + imul(t ^ (t>>>7), 61|t)) ^ t; return ((t ^ (t>>>14)) >>> 0) / 4294967296` → [0,1).
  - Provide `Int(max)`, `Pick(list)`, `Shuffle(list)` (Fisher–Yates), and `State()` to
    serialize the cursor. In C#, use `unchecked` and `uint`/`int` casts to mirror JS `imul`
    and `>>> 0` semantics.
- **Every** shuffle/roll (deck build, map generation, Hearts recovery, fragment 50/50 drop,
  reward offers) goes through this one RNG instance, its cursor stored in `CampaignState.rngState`.
- **Never** use `UnityEngine.Random` or `System.Random` in Core. (The old web prototype had a
  bug where deck shuffles used unseeded `Math.random()` — do **not** reproduce that; route
  *all* randomness through the seeded RNG.)
- A seed field at run creation makes runs reproducible for playtesting.

---

## 12. Content & data (ScriptableObjects)

Author these as ScriptableObject assets (Unity layer), keyed by string id (Core references ids):
- **ClassDef** — id, name, role, home suit, home C2 rung text, the four Staff ids, the 16
  ladder rung texts (mostly locked).
- **StaffDef** — id, class, name, kind (passive/activated/toggle), rules text, effect hook id.
- **RelicDef** — id, slot (Hat/Amulet/Ring/Cloak), name, rules text, effect hook id.
- **SpellDef** — suit, tier (Fragment/Half), name, effect, numbers.
- **EnemyDef / EncounterDef** — royal or number-enemy stats, suit, tier
  (skirmish/veteran/elite/boss/gate), any modifier text.
- **RoadTemplate** — per-chapter node graph template (node kinds, layers, forks); the actual
  map is generated per-seed from the template (§ maps below).

Effects should be implemented as small C# handlers in Core keyed by an effect id on the def,
so content is data + a registered behavior — not a giant switch you must edit for every asset.

### Road maps
- Each chapter is a **branching, one-way** node graph: a start, layered forks, and a boss.
- **Node kinds:** `start, skirmish, veteran, elite, boss, recruit` (C1 number-enemy fight),
  `hunt` (C1-only directed recruit), `camp, forge, sanctum, lair, caravan, shrine, event,
  `heroes` (Fallen Heroes, C2-P2), and the royal **gate** boss for C2 provinces.
- Nodes have partial visibility (`known` flag): unknown nodes show `?` until adjacent/visited.
- Generate maps deterministically from a per-chapter template + the seeded RNG. Each C1
  province guarantees a fight + a bonus fork + a lair-vs-safe fork, ramping skirmish→veteran→
  elite into the boss. C2 provinces mirror the same shape but the boss is the royal gate.

---

## 13. Post-alpha arc (context only — DO NOT build)

So you understand the whole shape (helps you avoid architectural dead-ends), the full game is
a five-continent expedition: **C1 Claim** (recruit A–10) · **C2 Shape** (royal gates — *this
build ends here with the crown = win*) · **C3 Exploit** (defeat another King; acquisition
closed; refine a fixed deck) · **C4 Adapt** (the loop — you've become the king, fighting
versions of yourself) · **C5 Master** (God of Luck showdown). The opt-in true-win is forging
all four crystals to **Full** (which strips your spells and opens C5). **None of C3–C5, the
Full crystal tier, mid-run save/resume, or the other five classes are in this build.** Keep
`continent`/`chapter` as general ints and keep systems data-driven so these can be added later
without a rewrite.

---

## 14. Meta / lineage (persists between runs)

- One small JSON file. Death or milestones **bank options, not power**: e.g. unlock another
  suit-tree branch to start with, or Staff mix-and-match (pair one class's Staff with another
  class's tree) — future-facing. **Meta must never grant mandatory permanent stat power** that
  papers over a weak core loop. A reached milestone stays banked even if the run then dies.
- For this alpha, minimal meta is fine: track runs, wins, and whether C2 has been cleared
  (unlocks the extra path option). Keep the hook so more can be added.

---

## 15. Build order (recommended)

Build Core first, verify each layer headlessly (a tiny console/test harness driving
`Dispatch`) before wiring Unity UI.

1. **Core foundations** — card model, PhysicalCard registry, seeded RNG, deck build (A–5×4),
   hand/Tavern/discard, state + phases.
2. **Base combat** — play/yield, suit powers with immunity, combos, counterattack + discard
   defense, exact/overkill/win/lose. (Fully playable single fight.)
3. **Grafts & recruiting** — exact-kill recruit; rank-graft & suit-add graft with the
   `graft_select` choice; royal cap 10.
4. **Road & run flow** — map generation, node navigation, C1 three provinces recruiting 6–10,
   Hunt, seam resets, chapter transitions.
5. **C2 & gates** — royal duels, the 3/2/1 keep pyramid, crown = victory; the C2 home rung.
6. **Classes & Staffs** — class select, the 4 home rungs, 16 Staffs, Fallen Heroes swap.
7. **Spells** — gauntlet, agnostic fragments (50/50 drop), bracelet arming, Forge (2→Half),
   cast-to-empty, the 8 spell effects.
8. **Relics** — bag + 4 slots, Lair/Caravan acquisition, all 29 relics, free swaps.
9. **Camp** (4-part) & remaining landmarks (Sanctum graft-rearrange, Shrine).
10. **Meta/lineage** save; main menu; polish, events playback, UI.
11. **Unity presentation** grows alongside from step 2 (a play surface you can click) — but
    keep Core authoritative and the UI a pure view.

---

## 16. UI / screens (single-player desktop)

- **Main Menu** — new run (optional seed field), continue is absent (no mid-run save), meta/
  lineage summary, quit.
- **Class Select** — 4 classes; selecting shows its 4 Staffs and the greyed path tree; confirm.
- **Road Map** — the branching node graph, current position, reachable nodes highlighted,
  node-kind icons, `?` for unknown. Persistent hand + a deck/discard viewer (sorted by suit,
  draw order hidden) reachable here.
- **Encounter** — enemy (HP/attack/suit/shield), your hand (click/drag to select & play),
  Tavern/discard counts + inspectors, the gauntlet (4 crystals, cast buttons), equipped
  relics (Amulet activate buttons), event popups (Balatro-style trigger feedback), the
  discard-to-defend prompt with a running "covered vs needed" total.
- **Bracelet** (between encounters) — arm fragments/Halves into empty gauntlet suit slots,
  preview next fight, sandbag.
- **Landmark panels** — Forge (forge menu), Lair (pick 1 of 2 relics), Caravan (pay-from-hand),
  Fallen Heroes (Staff swap), reward/graft/gate choice dialogs.
- **Recap / seam** — province-clear summary + the auto seam reset.
- **Win / Loss** — crown screen (win) / run-over screen (loss), then back to menu.

Show printed-vs-effective faces on grafted cards (e.g. a badge for an added suit or a changed
rank) so the player can read what their conquest has done to each card. Never surface the
internal balancing/CT numbers — they are design-only.

---

*End of spec. Build Core clean and deterministic; keep the UI a pure view of it; obey the
seven design pillars. When a number here is a placeholder, centralize it so playtesting can
tune it without touching logic.*

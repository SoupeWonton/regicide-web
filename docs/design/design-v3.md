# Design V3 — Migration Spec (what we cut, what replaces it)

**Status:** Active spec for the `Design_V3` branch. Started 2026-06-18. This is the
**old → new** view: every system being removed and exactly what takes its place,
across mechanics, gameplay, and design intent. Companion docs:
[`design-decision-2026-06-18.md`](./design-decision-2026-06-18.md) (the decisions),
[`../ideas/four-classes-redesign.md`](../ideas/four-classes-redesign.md) (class kits).
Where they disagree, **this file wins** for V3.

## The vision in one line

**You don't build a deck — you conquer one.** Conscription, not curation: the deck
grows only by defeating enemy cards, the 52-card deck stays sacred (capped, never
denatured), and depth comes from a single-threaded decision pipeline, not from
juggling parallel systems.

---

## Migration table (at a glance)

| # | System | OUT (V2 / ascending-deck v1) | IN (V3) | Dimension |
|---|---|---|---|---|
| 1 | Redundant-kill reward | Token **fragment** currency banked toward a forge spend | **Permanent graft**: pick a hand card, +1 value or the slain suit | Mechanics |
| 2 | Fragment shop | Post-Council "graduation shop" (spend fragments on tokens/spells/relics) | **Removed** — no banked currency to spend | Economy |
| 3 | Forge | **Mints** new tokens at forge nodes (budget spent at camp) | **Reshuffles/rearranges** the tokens you already own — the *kill* mints them | Mechanics |
| 4 | Class identity | **Pure-token**: same 20-card deck, differs only by 3 pre-stamped signature tokens; no passive | **Starting hand + an innate LOOPHOLE** (the one loop-rule the class breaks) | Design |
| 5 | Class progression | Deferred standalone class tree; Lair/point economy | **Innate loophole deepens one tier per chapter** (no relic slots) | Gameplay |
| 6 | Relics | Managed inventory, 2 slots, picked often | **Very rare, no slots**; "keep or sacrifice" at most once/run, rarely | Economy |
| 7 | Spells | Standalone item vehicle (14 spells, cast action, pools) | **Folded into the deck** — a burst becomes a grafted card; spell currency gone | Mechanics |
| 8 | Gold / buying | (planned) buy cards/items with currency | **No gold.** "Buy" = a guaranteed kill you set up; the battlefield is the only shop | Economy |
| 9 | Roster | 9 classes all start-available for playtest | **4 maximally-distinct classes**; other 5 = meta-unlock runway, tuned 1 at a time | Design |
| 10 | The 4 core classes | Differ by which **suit-lever** they buff (Surgeon/QM near-duplicates) | Differ by which **loop-rule** they break: BLOCK / KILL / COMBINE / PERSIST | Gameplay |
| 11 | Continent 1 structure | ch1 recruits 6–7, ch2 8–9, ch3 Council of Tens | **Two rank-band acts** (2–6, then 7–A); royals = gate bosses you don't keep | Gameplay |
| 12 | Ace | (start card, value 1) | **Low-1 companion: +1 to anything**, stays a starting card | Mechanics |

---

## Detailed old → new

### 1. The reward loop — fragments → permanent graft  *(BUILT — slice 1)*
- **Out:** an exact-kill on an owned card incremented a hidden `tokenFragments`
  counter; 2–6 fragments later you'd spend them at a forge/shop for a weak C-tier
  token. A second, deferred currency — exactly the "shard economy" we judged inelegant.
- **In:** the exact-kill itself is the reward. Combat pauses, you pick a card in
  hand and **permanently** add **+1 value** (Hone) or the **slain card's suit**
  (Graft). The conquered card reinforces what you hold.
- **Why:** every exact-kill resolves in one verb — recruit (unowned) or graft
  (owned). No wallet, no deferred screen. Reinforcement reads as fantasy, not math.

### 2–3. The Forge — mint → reshuffle
- **Out:** forge nodes minted brand-new tokens against a budget spent at camp; a
  graduation shop let you buy your way into Continent 2 with banked fragments.
- **In:** the **kill** mints tokens now, so the Forge is repurposed to **reshuffle/
  rearrange** the tokens you already have across your cards (re-target a graft, move
  a suit). The graduation shop is removed outright.
- **Net code:** retire `tokenFragments`, `FRAGMENTS_PER_TOKEN`, `applyFragmentStart`,
  `openFragmentShop`/`presentFragmentShop`/`resolveShopPick`, `SHOP_COST`,
  `PendingChoice.kind:'shop'`, and the Council/backfill duplicate→fragment grants.

### 4–5. Class = starting hand + innate loophole (no slots)
- **Out:** "pure-token" — a class was *only* which 3 signature tokens got stamped on
  the shared 20-card start; no always-on effect. A separate class tree and a
  Lair/point economy were deferred on top.
- **In:** a class is **a loophole and the hand to exploit it.** The **starting hand**
  (suit-flavored stamps) is the legible on-ramp; the **loophole** is an innate,
  always-on rule-bend that is the lasting identity. It **deepens one tier per
  chapter on its own** (e.g. Sentinel: Aegis → Bulwark → Impenetrable) — this *is*
  the class tree, with no relic slots and no point economy.
- **Reversal flagged:** this overturns the locked "pure-token / no-global-passive"
  decision on purpose. (Note: the live code already ran 4 global class passives, so
  this formalizes reality and retires the spec lock.)
- **Risk to hold:** 3 always-on rule-bends approach "parallel load." Each tier must
  modify **one existing station** of the loop — never add a new station.

### 6. Relics — sparse, slotless
- **Out:** a managed relic inventory with 2 slots, offered often, the loophole-tree.
- **In:** relics are a **separate, very rare** layer — no slots, no inventory churn.
  You mostly just hold what you find; a "keep this or sacrifice it for another"
  decision happens **at most once per run, and even that is rare.** Relics are *not*
  the class identity (that's innate) — they're occasional spice.

### 7. Spells — folded into the deck
- **Out:** a full standalone vehicle: ~14 spell items, a `cast_spell` action, spell
  pools, Abbey/Market/Sanctum spell acquisition, UI buttons.
- **In:** the one-shot-burst role moves **onto cards as grafts** — there is no spell
  currency or inventory. (Depends on graft existing — slice 1 first, then this.)
- **Why:** it was the most generic, most "mathy" of the four power-kinds; cutting it
  takes the economy from four kinds of power down to two (deck + rare relics).

### 8. Economy — two vehicles, no gold
- **Out:** pricing four different *kinds* of power against each other; planned gold/buying.
- **In:** exactly two vehicles — **the deck** (cards + grafts, grown only by conquest)
  and **very-rare relics** (offered, not bought). **No gold.** A "purchase" is a
  guaranteed **kill you set up** (e.g. the Caravan offers a weakened target). One unit
  of value in the whole game: the exact kill. **The battlefield is the only shop.**

### 9–10. Roster & the four core classes
- **Out:** 9 classes start-available; the core four differ only by which suit-lever
  they buff, making Surgeon and Quartermaster near-duplicate card-economy classes.
- **In:** ship **4 maximally-distinct** classes, each breaking a different station of
  the loop; the other 5 become **meta-unlock content**, released and tuned one at a
  time (small at any snapshot, wide across the lifetime).

| Class | Breaks | Win-method |
|---|---|---|
| **Sentinel — The Wall** | BLOCK (blocking pays: draw / reflect) | Defense / inevitability |
| **Executioner — The Snowball** | KILL (windows widen, kills cascade) | Aggression |
| **Quartermaster — The Overwhelm** | COMBINE (hand-cap + combo-cap broken) | Tempo / burst |
| **Surgeon — The Engine** | PERSIST (the deck never decks out) | Recursion / value |

### 11–12. Structure & the Ace
- **Out:** ch1 recruits 6–7, ch2 8–9, ch3 = Council of Tens; royals only in Continent 2.
- **In:** Continent 1 = **two rank-band acquisition acts** (2–6, then 7–A); royals are
  the **gate bosses you fight but don't keep**. Continent 2 = recruit royals only +
  the **pressure engine** (≈ today's province).
- **Ace = low (rank 1), a companion: +1 to anything.** It is a starting card, not a
  late-act recruit. This pins every rank-band boundary in the new structure.

### The hook (unchanged, now protected by design)
The loop is a **single-threaded pipeline** — draw → combine → kill → block → persist —
resolved in *succession*, each station individually trivial. **North-star test:** if
any step ever requires holding the *other* steps in your head to resolve it, the
pipeline is broken. (This is why base Regicide's four-simultaneous-suit-powers
overwhelms; V3 never reintroduces parallel load.)

---

## What stays untouched (do NOT change)

- **Base quick game** (`game.ts`/`rooms.ts`) — unchanged.
- **NO-EXILE rule** — the deck only ever grows; no mechanic may thin it. (V3 deepens
  via graft, never removes.)
- **Continuous deck** — carries across encounters; only camp/interlude rests reshuffle.
- **Deterministic RNG** — every campaign shuffle/roll through `rng.ts`.
- **The token *engine*** — `TOKEN_DEFS`, `tokens.ts` (spend/hold/suit/lever), overdraw-
  and-select, `ownedCards`, `cardTokens`, `stampToken`. V3 changes how tokens are
  *delivered* and *named*, not the engine.
- **CT values** — design/debug only, never shown to players.

---

## Build sequence & status

| # | Slice | Effort | Status |
|---|---|---|---|
| 1 | Graft-on-kill (interactive, permanent) | L | ✅ Built + tested (smoke Test A2 green) |
| 2 | Retire fragment economy (Cluster A); Forge → reshuffle | L | ⏭ Next |
| 3 | Fold/retire spells (Cluster B) — needs graft first | L | Pending |
| 4 | Innate loophole progression + 4 class rewrites (C/E) | XL | Pending |
| 5 | Two-act Continent 1 + Ace-as-low-1 (D) | XL | Pending |
| 6 | Relics → very-rare sparse layer; no gold; Caravan = set-up kill | M | Pending |

**Interdependencies:** slice 1 before 3 (spell-as-graft needs graft); slice 4's
loophole scaffold before its class abilities; slice 5 blocked on the Ace answer
(resolved: low-1 companion). Slices 2 and 3 are independent cleanup and can land first.

**Guardrails:** keep `EXPERIMENTS.ascendingDeck` gating intact; base `TurnPhase`
untouched (V3 phases live on `CampaignTurnPhase`); new save fields stay optional +
guarded; smoke suite must stay green at every slice.

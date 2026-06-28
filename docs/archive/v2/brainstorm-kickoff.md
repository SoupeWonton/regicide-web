# Regicide Campaign — Design Brainstorm Brief

> **How to use this file:** Paste it whole into a fresh LLM chat. It is self-contained —
> it tells the model what the game is, what is already locked (so it doesn't relitigate
> settled decisions), what is built, and the live open questions. Then pick a question
> from the list (or bring your own) and brainstorm. A short "house rules for the LLM"
> section at the bottom keeps the session productive.

---

## 1. What this is

A browser adaptation of the co-op card game **Regicide**, extended into a solo-first
**roguelite campaign**. You play a hand of cards against escalating enemies; the campaign
wraps that combat in a seeded road map, an item economy, and a deck that **grows over a
run**.

**The core combat (unchanged base game):** play cards to deal damage to a royal enemy;
suits have effects (♥ heal/recover cards, ♦ draw, ♠ shield, ♣ double damage); the enemy
hits back and you discard cards to pay the damage; if you can't pay, you die. Jesters are
wild resets.

**The campaign layer (what we're designing):**
- A run is **continents → chapters → a road of nodes → gate bosses**.
- **Continent 1 (ch 1–3) = the ramp.** You start with a tiny deck (A–5, 20 cards) and
  *grow it* by recruiting enemies. An **exact kill recruits the enemy card** into your
  deck; at chapter checkpoints you **backfill** the next rank tier. By the end of
  Continent 1 you have a complete A–10 deck. Continent 1 ends with the **Council of Tens**.
- **Continent 2 (ch 4–6) = mastery.** Royal recruiting and fine-tuning; **no backfill**;
  this is roughly the older "province" prototype. The deck carries across continents.

**Identity systems layered on the deck:**
- **Classes are pure-token.** Every class starts from the *same* 20-card deck and differs
  only by which **signature tokens** are pre-stamped onto specific cards (3 stamps at run
  start). You pick a class by *seeing which cards it stamps*. There is no global passive.
- **Tokens / the Forge.** Permanent stamps on individual cards: ±value (spend side),
  hold-value (soak/defense), graft/transmute (change suits), and special levers
  (Plate/Provision/Mend/Edge/Mark/Scry/Banner…). You apply them at **Forge** nodes from an
  offer menu. Curses are negative tokens.
- **Relics** = passive rule-bends, two slots per hero (hand-cap raises, death insurance,
  reshuffle, combo→12). From the **Caravan** (paid with a curse) and important fights.
- **Spells** = thin held bursts, from the **Sanctum**. The **Shrine** cleanses curses.
- Pools are **Kingdom-gated** (meta unlocks that bank *options, not power* — new classes,
  tree diversification, relic-pool expansion — and grow on death).

**Hard design rules (do not propose violating these):**
- **NO-EXILE.** Nothing may thin the deck. The deck *only ever grows*. No card removal, no
  exile, no "trim your deck" service — ever. (This killed the old Exile class's ability,
  the Sanctum exile rite, etc.)
- **Death is death.** Any hero death ends the run — no revive, no replacement, no second
  wind, no retreat-to-safety. Meta progress (Kingdom unlocks) is the only thing that
  persists.
- **Determinism.** Every shuffle/roll is seeded; same seed = same run.

---

## 2. What is LOCKED (settled — brainstorm *within* these, don't reopen)

These were ratified in `docs/ideas/open-design-questions.md`. Treat them as constraints.

| # | Locked decision |
|---|---|
| Q1 | It's **Regicide-with-roguelike-structure**, not a from-scratch deckbuilder. The base combat stays recognizable. |
| Q2 | Run structure = **continent / chapter / road / gate** (not "castle/lineage"). |
| Q3 | **Deck persists within a chapter**; only a **Camp/rest** reshuffles; deck **resets fresh each continent** but carries recruited cards; a **Camp is guaranteed before each gate boss**. |
| Q4 | **Solo-first.** Multiplayer/party is left on older assumptions for now. |
| Q6 | **Death = full reset.** Meta currency ("candles") banks *options, not raw power*. |
| Q8 | Items have a **build-defining tier** that is Kingdom-gated. |
| — | **Ascending Deck** model (start-small-grow-up, exact-kill recruit, backfill→tokens for owned cards, overdraw-and-select ♦, pure-token classes). |
| — | **NO-EXILE** and **Death-is-death** (above). |

---

## 3. What is BUILT and PLAYABLE right now

The live default is the Ascending Deck arc (ch1→ch3 ramp → Council of Tens → ch4 province
→ win). Verified by an end-to-end smoke test.

**Working:** the full arc start→win; exact-kill recruit; backfill; overdraw-and-select ♦;
tokens + Forge offer-menu; two relic slots + "release one when a third is offered";
Caravan/Sanctum/Shrine item economy (cap 3 item-stops/chapter); deck persistence;
determinism. Four "main" suited classes are tuned (Sentinel/Quartermaster/Surgeon/
Executioner); Commander/Gambler/Oracle are functional; **Exile is parked**.

**Pre-alpha readiness: ~Yellow (≈65%).** It's mechanically completable and doesn't crash,
but a first friends' session would hit rough edges (see §4 "Build-readiness gaps").

---

## 4. OPEN QUESTIONS — the brainstorm menu

Pick any of these. Grouped by type. The juiciest design-space ones are flagged ⭐.

### A. The biggest unbuilt system — between-continent class progression ⭐
Right now a class gets its **three signature tokens once, at run start, and never again.**
There is **no class tree, no mid-run upgrade, no Continent-1→2 "graduation" power.** The
spec gestures at "one ★★★★ stamp per chapter (in-run = one branch); cross-class
diversification only on death/milestone," but none of it is built (`specializationsUnlocked`
is a write-only stub).
- What should a class *become* over a run? One escalating branch? A choice of 2–3 forks?
- What is the **Continent-1→2 upgrade moment** specifically — when your deck is "complete,"
  how does your *class* level up to match?
- How do ★★★★ stamps differ from ordinary Forge tokens — bigger numbers, or new *verbs*?
- How does this stay legible (you pick a class by *seeing its stamps* — does the tree keep
  that "show, don't tell" property)?
- **Live thread:** see [`continent-2-axes-and-exploits.md`](proposals/continent-2-axes-and-exploits.md)
  — Continent 2 is being designed so the level-2 *axis exploit* is mandatory (vanilla play
  dies); the four suit-axes (♦/♥/♠/♣) are the frame, and `specialization-trees.md` Root +
  Branch A is the source material.

### B. Meta progression — the candle cascade ⭐
The death currency ("candles," name not final) is **ratified in principle but unbuilt.**
Rule: it banks **options, not power** (new classes, tree branches, relic-pool width).
- Earn formula: what generates candles, and how much (depth reached? enemies recruited?
  exact-kills? boss kills?)?
- Spend menu: what's the unlock tree, and what's the *first* thing a new player buys?
- How do we keep "options not power" honest — what stops it from becoming a stat-stick?

### C. Class identity & reworks ◻ direction set, needs play
- **Gambler** uses an old "once-per-encounter wager" core; the intended design is a
  **streak / odd-even** system. What's the actual loop?
- **Warden** kit is blocked on candles (its old ability referenced the cut death-fork).
  What's its non-revive, non-thinning identity?
- **Exile** keeps its roster slot + Transmute signature but is parked — find it a
  **non-thinning** repurpose (it can't remove cards; what does an "exile" *do* now?).
- Are 9 classes the right number, or fewer-but-deeper?

### D. Token vocabulary & the Forge ⭐
- The per-tier **token catalog** — what verbs exist at each rarity, and what's the
  spend-value vs. hold-value tension (every card is both a damage source and a payment)?
- The **over-upgrade trap**: stamping +value makes a card hit harder but also makes it
  *cost more to discard*. Is that tension fun, or punishing? How do we tune it?
- **Curses** are currently only delivered by the Forge `undercut`. Should the Shrine/
  spells deliver them too? What makes a curse interesting rather than just "−value, bad"?

### E. Recruiting & deck-growth feel ⏳ needs playtest
- Does the **A–5 starting floor (20 cards)** death-spiral, or feel good?
- **Recruit density** — how many exact-kills per lane (2–4?) feels like a choice vs. a tax?
- Exact-kill is precise on purpose — does demanding *exact* damage feel skillful or fiddly?
- What does an exact-kill grant when the card is **new** vs. **already owned** (currently:
  the card, vs. a token fragment)?
- Does within-chapter deck-carry let **bomb cards** (recruited royals) snowball too hard?

### F. Pacing & shape ⏳ needs playtest
- Does the ch1→ch2→ch3→Council→province arc land at **~1–2 hours**?
- Backfill cadence vs. chapter length — does the deck "complete" at the right moment?
- Is the **Council of Tens** a satisfying Continent-1 finale, or just another boss?

### G. Build-readiness gaps (smaller, mostly UI — for "can friends play it unattended")
1. Chapter-complete / road-title UI is **hardcoded to Chapter 1** text — wrong at the
   ch2→ch3 seam (testers will think it broke).
2. **Invisible resources** — Forge budget and token fragments have no on-screen counter.
3. **Parked classes** (Exile, Warden) are selectable with no "not in this playtest" flag.
4. **No onboarding** — tokens, exact-kill recruit, overdraw-select, the continental arc
   are never explained in-UI; a designer currently has to narrate.

---

## 5. House rules for the LLM (paste these expectations)

- **Respect the locked list (§2) and the hard rules** (NO-EXILE, death-is-death,
  Regicide-not-a-new-deckbuilder, solo-first). If an idea needs to break one, say so
  explicitly and justify it — don't quietly assume it away.
- **Diverge first, then converge.** Give me 3–5 genuinely different directions before
  recommending one. Don't anchor on the first idea.
- **Tie every idea back to the existing systems** (tokens, recruit, deck-growth, the
  Forge, Kingdom unlocks). New mechanics should reuse what's built, not bolt on a parallel
  system.
- **Name the cost.** For each idea: what does it add to player cognitive load, what does it
  ask of the engine, and what existing thing might it overshadow (e.g. does a class-tree
  +value branch just make the Executioner redundant)?
- **Flag what needs playtest data** vs. what's a pure design call — don't over-tune in the
  abstract.
- Keep "show, don't tell" in mind: the game's pitch is *you read a class by the cards it
  stamps*. Prefer mechanics that are legible on the card face.

---

*Source of truth in the repo:* `docs/design/campaign/campaign-bible.md` wins design
conflicts; `docs/ideas/open-design-questions.md` holds the full ratified/open log;
`docs/design/ascending-deck.md` is the current progression spec; `CLAUDE.md` records the
live build status.

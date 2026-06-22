---
kind: proposal
edition: v3
status: needs-v3-revision
last_reviewed: 2026-06-18
---

# Tutorial — Requirements & Script ("First Blood")

**Status:** Requirements, 2026-06-18. Not built. A scripted, seeded opening encounter
that teaches the campaign's core verbs through forced-obvious plays. Lives at the start
of Chapter 1; skippable; never repeats once a Kingdom has cleared it.

---

## Goal

Get a first-time player through the campaign's load-bearing mechanics in **~2–3 minutes
and ~8 plays**, by *doing*, not reading. A tutorial is a **rail, not a fair fight** — the
deck and enemy draws are fixed so the right play is always the obvious play, and every
"oh no" beat is harmless (it can never end the run).

---

## Mechanics it MUST teach

These are non-negotiable — the doc exists so none get dropped for length:

| # | Mechanic | Why it's mandatory |
|---|---|---|
| M1 | **♥ Hearts — the lifeline** | Recovery (discard→Tavern) is *why you don't run dry*; the whole attrition game is invisible until taught. |
| M2 | **♠ Shields — blunt the blow** | Block now → pay fewer cards. The core defensive verb; without it players just take full hits and die. |
| M3 | **Aces — the Animal Companion** | An Ace pairs with any card to add its value. Unique rule, unintuitive, must be shown once. |
| M4 | **Exact kill = recruit** ⭐ | The signature ascending-deck hook. Land an enemy at *exactly* 0 → its card joins your deck. The reason the campaign is not vanilla Regicide. |
| M4b | **Owned exact kill = replacement graft** | Exact-kill an enemy already owned, choose a card in hand, then replace its rank with the defeated rank or its suit with the defeated suit. Never teach `+1` or a second suit. |
| M5 | **Boss immunity** | A royal seals one suit — your tool gets switched off. Players must *feel* this before a real fight. |
| M6 | **Jester — break & reload** ⭐ | The Jester cancels immunity **and** refills the hand. The panic button; framed as "reload." |

## Mechanics it SHOULD weave in (supporting, not their own lecture)

- Basic attack (a card's number = damage dealt).
- ♦ Diamonds = draw ("fill your hand *before* you pay").
- ♣ Clubs = double damage (can be shown implicitly on the first strike).
- The discard-to-pay loop (cover the enemy's hit or die).
- Combos (same/summed value ≤ 10 played together).

## Explicitly OUT of scope (tooltip-tier or learn-by-losing)

Yield/pass, overdrawing your Hearts away, the Forge/tokens, the four-axis Camp pips,
relics/spells. Keep the tutorial to *combat verbs only* — meta systems are taught at
their first node, not up front.

---

## Required structure — two short fights

### Fight 1 — the Training Dummy *(the loop + ♦ + ♠ + recruit)*
Low-HP, harmless target. Teaches attack → draw → shield → pay → exact-kill-recruit.

| Beat | Teaches | Scripted setup (illustrative) | Guide line (≤1) |
|---|---|---|---|
| 1 | Attack | Hand leads 5♣; Dummy ~10 HP | "Play a card. Its number is the wound." |
| 2 | ♦ draw | 3♦ highlighted | "Diamonds draw — fill your hand before you pay." |
| 3 | **♠ shield (M2)** | Dummy winds up a big hit; 6♠ in hand | "Spades blunt the next blow. Block now, pay less." |
| 4 | Discard-to-pay | reduced hit after the block | "Now cover what's left." |
| 5 | **Exact kill → recruit (M4)** ⭐ | Dummy at 3; a 3 highlighted (a 5 also present) | "It has 3 left. Hit it for **exactly** 3 — it joins your deck." |

### Fight 2 — the Gatekeeper *(♥ + Ace + immunity + Jester + recruit a royal)*
A royal (e.g. a ♦-immune Jack). Teaches the rest, ends on the dopamine of recruiting a
royal and opening the road.

| Beat | Teaches | Scripted setup (illustrative) | Guide line (≤1) |
|---|---|---|---|
| 6 | **♥ Hearts lifeline (M1)** | Tavern nearly empty (scripted); a ♥ in hand | "Hearts shuffle your spent cards back — this is why you don't run dry." |
| 7 | **Ace / Animal Companion (M3)** | an Ace + a number card highlighted | "An Ace sticks to any card and adds its value. Pair them." |
| 8 | **Immunity (M5)** | Gatekeeper ♦-immune; player nudged to play a ♦ | "...its crest seals that suit. The draw fizzles." |
| 9 | **Jester reload (M6)** ⭐ | Jester in hand; hand thin | "The Jester answers no crown — break the seal and reload your hand." |
| 10 | **Exact kill a royal → recruit (M4)** ⭐ | Gatekeeper at 5; 2 + 3 combo highlighted | "Five left. Two and three make exactly five. Bring it home." |

> **Trim rule:** if it runs long, the six **M** beats are sacred; the SHOULD beats
> (attack/draw/pay/combo) may be merged or implied, never the MUST beats. Target ≤ 10
> beats; floor of 8 (the six M + attack + one suit).

**End card (the whole game in three lines):**
> "Recruit what you kill cleanly. Spend before you pay. When a crown seals your hand — break it."

---

## Design requirements (hold the writer/builder to these)

1. **One concept per beat**, taught by a *forced-obvious* play. Never explain two things at once.
2. **Act, don't read.** Guide speaks ≤ 1 short line per beat; the *card play* is the teacher. No modal walls of text.
3. **Stacked deck.** Seeded/fixed hands and enemy draws so the lesson is unmissable.
4. **Every "oh no" beat is harmless** — immunity fizzle, low-Tavern scare, any near-death — none can actually end the run.
5. **End on a recruit, not a rule.** Last feeling is the reward loop.
6. **Skippable from beat 1**, and **never repeated** (Kingdom flag).

---

## Functional / technical requirements

- **Seeded scripted encounter.** A dedicated `TUTORIAL` node/map with a *fixed* player
  deck and a *fixed* enemy draw order (no RNG variance), so every beat lands identically.
- **Beat/trigger list.** The encounter steps through an ordered list of beats; each beat =
  { guide line, highlighted card(s)/action, completion condition }. Advancing requires the
  player to perform the (highlighted) action — it does not auto-play for them.
- **Highlight + soft-gate.** The taught card/action is visually highlighted; ideally other
  inputs are softly discouraged (not hard-locked — let a curious player poke, but the rail
  pulls them back).
- **Skip control.** A persistent "Skip tutorial" affordance from the first beat.
- **Kingdom flag.** `tutorialDone` (Kingdom-level) — once set, Chapter 1 starts at the
  normal first node; the tutorial node is bypassed. New Kingdoms see it once.
- **No new combat rules.** The tutorial uses only accepted verbs (suits, combos,
  Ace pairing, immunity, Jester, exact-kill recruit, replacement graft). It is *scripting on top of the
  engine*, not a parallel mode — base combat stays untouched.
- **Determinism intact.** All scripting flows through the seeded `rng.ts` path like any
  campaign encounter; no `Math.random()`.

---

## Open questions

1. **Guide voice** — who narrates (the Quartermaster companion? a raven? the Kingdom?),
   and tone. Needs 1–2 line variants per beat to pick from.
2. **Soft-gate strength** — how hard to discourage off-script inputs without feeling
   patronizing (poke-and-bounce vs. fully locked).
3. **Class in the tutorial** — fixed class (e.g. Sentinel, so ♠ is on-theme) or the
   player's chosen class? Fixed is simpler and guarantees the shield beat reads.
4. **Placement** — a pre-Chapter-1 node, or beats folded into the first two real
   encounters? (Standalone is cleaner to skip and to script.)

---

*See also:* [`../../canon/v3/core-loop.md`](../../canon/v3/core-loop.md),
[`../../canon/v3/systems/deck-and-grafts.md`](../../canon/v3/systems/deck-and-grafts.md), and the implemented
campaign combat rules.

---
kind: decision
edition: v3
status: accepted
date: 2026-06-25
questions: [Q1, Q15]
amends: [2026-06-24-crystals-continents-and-equipment, 2026-06-20-five-act-continuous-expedition]
---

# Design decision — acquisition cadence and the C2 royal gates

> **Status: accepted.** **Decision B (the 3/2/1 royal-gate pyramid) is Gab-approved (2026-06-27).**
> Decision A (the acquisition cadence) remains Landry-direction pending Gab ratification. Resolves the
> end-to-end acquisition curve and the royal-recruitment rules. **Amends**
> [`2026-06-24-crystals-continents-and-equipment.md`](2026-06-24-crystals-continents-and-equipment.md)
> (adds C1/C2 acquisition detail and the graft-from-C2 rule, consistent with its continent
> table) and the "royals are gate bosses, not ordinary recruits" line in
> [`../canon/v3/campaign/structure.md`](../canon/v3/campaign/structure.md). Source:
> 2026-06-25 Landry design session.

## Decision A — Acquisition is a closing funnel that ends at the C2 seam

Deck growth and deck refinement are **separated in time**. Each continent owns a distinct
deck verb:

| Continent | Beat | Verb | Acquisition |
|---|---|---|---|
| C1 | Claim | **Recruit** | Exact-kill recruits number cards **6–10**. Hunting (directed recovery of missed recruits) lives here and **only** here. Deck reaches a full A–10. |
| C2 | Shape | **Royal gates** | Ordinary road exact-kills are now **grafts** (the number deck is complete, so every owned-kill reshapes a held card). Royal acquisition happens at three gate decisions (Decision B). Climaxes in defeating the first King. |
| C3 | Exploit | **Specialize / test** | No recruitment. Optimize the closed deck via Forge, tokens, equipment, crystals. The God of Luck sends another King to test the finished build. |
| C4+ | Adapt | **Loop** | No recruitment. Recurring fights against other versions of your King (loop detail deferred). |

**Acquisition closes at the end of C2.** From C3 on, power keeps climbing through *depth*
(grafts, equipment, crystal ladders) on a **fixed card pool**, never through new cards.

**Why:** answers the "you can't hunt forever" problem — hunting was always a Continent-1
verb, not a whole-game economy. Every continent gets a distinct feel without a new system,
and the graft-everywhere-from-C2 rule keeps post-recruitment roads from going dead (every
kill still reshapes a card).

## Decision B — The C2 royal gates: a 3 / 2 / 1 recruitment pyramid

C2 contains three gates, each a narrowing identity decision made *after* the gate fight:

- **Jack Gate** — *"which Jack do you leave behind?"* Keep **3 of 4** Jacks.
- **Queen Gate** — *"which two Queens follow you?"* Keep **2 of 4** Queens.
- **King Gate** — *"which crown do you wear?"* The betrayer-King abdicates; you crown
  yourself by keeping **1 of 4** Kings.

Rules:

- **All six recruited royals are real deck cards** (3 Jacks + 2 Queens + 1 King), shuffled
  into the expedition deck. Final deck entering C3 ≈ **46 cards** (40 numbers + 6 royals).
- The royals you **leave behind** are still fought at the gate; you simply do not recruit
  them. C2 is a full royal-court gauntlet from which you keep a scarce selection.
- **Specialization does not live in the King.** Build identity rides on the suit
  **ladder/crystal** (per the 2026-06-24 decision); the King Gate is a flavorful capstone
  *card* choice, decoupled from mechanical spec.
- **The crown is fixed through C3** for now. Whether the C4 loop allows **re-crowning**
  (defeat a rival King → take his crown) is **deferred** to loop design (see open below).

**Why:** the 3/2/1 pyramid is a built-in scarcity gradient — breadth at the Jack tier,
commitment at the King — that funnels toward identity without authored narrowing. Folding
the betrayer-King and the recruited-King into one abdication moment resolves the
narrative-vs-mechanical King tension.

## Decision C — Forgiveness is front-loaded (directional; details still open)

The death-spiral is an **opening-stability** problem (observed losses: draw engine starved
of ♦, or no ♥ to recover), not a late-game difficulty problem. Direction agreed:

- **Guaranteed opening engine floor** — the small starting court always contains at least
  one low ♦ and one low ♥ alongside the starting Ace, so no run can begin unable to draw or
  heal.
- **Continent-seam breathing room** — a rest/reshuffle/heal at continent boundaries so a
  stall can't carry across a seam.
- Philosophy: **forgiveness front-loaded into the opening and the seams; difficulty
  back-loaded into the royal gates.** The deck can lose a fight but cannot soft-lock.

This is recorded as **direction, not locked numbers.** The exact opening guarantee, whether
the seam reset is a clean heal/reshuffle or partial, and the road structure (combat-gated
landmarks vs. pure event nodes) remain in the active queue under Q1/Q16.

## Open / to-be-defined (not blocked by this record)
- **C4 re-crown:** whether the loop lets you swap crowns each pass.
- **Forgiveness numbers:** exact opening ♦/♥ guarantee; clean vs. partial seam reset.
- **Road structure:** combat-gated landmarks vs. current skirmish→event→skirmish→event;
  how many guaranteed rest nodes per continent (feeds Q16).
- **Skipped-royal handling:** is leaving a Jack behind purely a cost, or does the gate fight
  still grant a graft/token?
- **46-card draw health:** validate the fat C3 deck cycles its ♦/♥ adequately in sim.

## On acceptance, do
- Update canon: `canon/v3/campaign/structure.md` (C1/C2 acquisition detail, royal gates,
  graft-from-C2, royals-recruited-at-C2 amendment).
- Update `proposals/systems/deck-lifecycle.md` (Axis A resolved: closing funnel; Axis D
  recovery direction front-loaded).
- Remove the acquisition/royal portions of **Q1** and **Q15** from the active queue; leave
  the forgiveness-detail and removal portions open.

---
kind: delivery
edition: v3
status: active
last_reviewed: 2026-06-25
---

# V3 design-decisions agenda — what to settle before building

The [integration plan](v3-integration-plan.md) marks several slices ⛔ **blocked**: they
need a design decision closed before code starts. This doc is the **agenda for the
Landry+Gab sessions** that close them. Each decision lists: the slice it unblocks, the
open sub-questions (with their canon Q-numbers from
[`../../proposals/open-design-questions.md`](../../proposals/open-design-questions.md)),
and a **proposed answer** (the documented "lean") so each session is a confirm/adjust,
not a blank page.

When a decision closes: update the relevant `canon/v3/...` page, add a dated decision
record in `../../decisions/`, remove the question from the open queue, and flip the slice
from ⛔/🟡 to ✅ in the integration plan.

**Already locked (no session needed):** replacement-graft semantics, fragment-shop
removal, Ace-as-low-1, saves-wiped, tokens-kept-for-v1. These are in the plan as ✅.

## Suggested session order

Follows the canon decision order (open-design-questions §"Decision order"): settle
shape before numbers. **1 → 2 → 3 → 5 → 6 → 7** unblock the build; **4, 8, 9** can run in
parallel or after.

---

## 1. Delete-vs-upgrade inventory

*Unblocks Slice 0 · raised by Landry.*

Go system by system and tag each **delete / upgrade / keep**. This is the inventory
behind "V3 is the upgrade, some stuff deleted, some upgraded."

Candidates to rule on: province-mode scaffolding; ascending-only nodes; V2 chapter arc;
the Tower; the Abbey/Market/Sanctum/Shrine landmarks; the fragment plumbing; the
`EXPERIMENTS` flags.

**Proposed:** *delete* province-mode scaffolding + fragment plumbing + the graduation
shop; *upgrade* the ascending-deck arc into the five-continent shape (it is the
most-evolved, live path); *keep* the token engine + base quick-game untouched. Collapse
`EXPERIMENTS.ascendingDeck`/`provinceMode` into a single V3 default.

**Output:** a checklist that Slice 0 + Slice 2 execute against.

---

## 2. Deck lifecycle

*Unblocks Slice 5 · canon Q1/Q3/Q4/Q27.*

Open: starting-deck composition & opportunities; whether missed recruits recur
(naturally or via directed Hunts); the player-authored recovery that prevents a
recruitment death-spiral; whether rare retirement / suppression / transformation / no
removal best preserves conquest.

**Proposed:** **no removal** mechanic for v1 (kept as an open axis, unbuilt); recovery
via Hearts + landmarks; rely on the evidence that *humans never starve* and the death
spiral is a skill-floor risk, not structural (see
[`../../research/simulation/v3-deck-lifecycle-q1.md`](../../research/simulation/v3-deck-lifecycle-q1.md)).
Decide the exact starting deck + whether missed recruits recur.

---

## 3. Classes

*Unblocks Slice 4 kits · canon Q5/Q31.*

Model is resolved (Staff = swappable passive enabler × kept linear ladder). Open: each
class's **base Staff** on Continent 1; each **starting hand**; the per-class **Staff ×
ladder pairing + rung values**; **how/when the other three suit ladders unlock** across
the run; recognizability with names/portraits hidden.

**Proposed:** lock one ladder per role keyed to its suit/station (Sentinel/♠ block,
Executioner/♣ kill, Quartermaster/♦ combine, Surgeon/♥ persist); start with the
suit-matched ladder and broaden later. Sentinel's pairing is reportedly worked; spec the
other three. Use
[`../../proposals/classes/four-core-classes.md`](../../proposals/classes/four-core-classes.md)
and `facet-and-linear-candidates.md` as the starting kits.

---

## 4. Tokens

*Informs Slices 1–2 (not blocking) · canon Q6 · Landry-mandated session.*

**Locked for v1:** keep the full token engine + catalog; do not prune. This session +
the V3 playtest decide long-term survival.

Open: which token families (value / hold / split / lever / keyword: hone, temper, plate,
provision, mend, edge, scry, mark, banner, bloodprice…) earn a permanent place, and —
since the fragment wallet is gone — **how kept tokens are delivered** (Forge rearrange
only? a new source? signature stamps only?).

**Decision test (from canon):** which token changes a meaningful decision that
replacement grafts + the class model cannot already create? Default lean is
*replacement-grafts-only*, **overridden to keep-all for v1** by Landry pending playtest.

---

## 5. Continents, gates, attrition, endgame

*Unblocks Slice 7 · canon Q7/Q15/Q16/Q17/Q34/Q35.*

Frame accepted (five continents over the five-act skeleton + God of Luck + opt-in
forge-to-Full ending). Open: the **pressure package** per post-acquisition continent;
**royal/gate rules** (one royal vs suit-set vs court sequence; immunities as the main
adaptation pressure?); **rest cadence** (where rests are guaranteed/optional/absent; do
act boundaries reshuffle?); the **C4 loop** scaling + the "You win?" beat + how looping
reads; the **C5 God-of-Luck showdown** shape (short gauntlet vs single boss) and how the
self-weakened (no-spells) state is balanced; **opt-in-ending signposting** (discoverable
but not a feel-bad miss); the **~1h/continent** duration curve.

**Proposed:** keep the validated five-beat pressure curve; pressure rises by
*subtracting player power* (the forge-to-Full self-weakening), **not** enemy stat
inflation; the inter-continent wager animation always "loses" until all four crystals are
Full. Define internal seeded fixtures (weak/median/strong/narrow/attrition-damaged) for
testing — never real continent starts.

---

## 6. Crystal and forge economy

*Unblocks Slice 3 · canon Q28/Q29/Q36.*

Model is set (Fragment castable → Half castable → Full = non-castable win token;
suit-specific fragments; Forge-only assembly; Full is unlock-gated). Open numbers/gating.

**Proposed leans (confirm/adjust):** ~**1 in 4** combats drops fragments; **Half = 2**
fragments; **Full = "a lot"** (placeholder 3 or 6); decide whether Full allows
fragments→Full directly or requires a Half first, and **what unlocks Full-creation** at
all (endgame trigger). Name the **gauntlet/bracelet** and decide whether *holding all
four* does anything before they go Full. **Q36:** a spell sits **above** matching suit
immunity (♦ spell hits a ♦-immune enemy) — ratify + define the explicit visual.

---

## 7. Equipment, relics, landmarks

*Unblocks Slice 6 · canon Q30/Q13/Q32/Q33.*

Five-slot model set (Staff + Cloak/Ring/Hat/Amulet). Open: **slot themes** (placeholder:
Cloak ≈ roads, Ring ≈ economy, Hat ≈ recruitment, Amulet ≈ activated); **which existing
relic** (Split Seal, Doorstop, Crown of First Claim, Black Standard, Sainted Scalpel,
Combat Cache, Warhorn, Hoard) lands in **which slot**; **how many relic opportunities** a
run actually offers; **Fallen Heroes** placement/cost + legal staff↔ladder pairings +
whether a swapped-out Staff is recoverable; **Sanctum's fate** (its "attune a spell" verb
is dead — give it a new one-verb role that doesn't duplicate Forge/Camp/Lair/Shrine, or
remove it).

**Proposed:** a **small authored relic pool**, most runs see **one or two**; Sanctum is
**removed** unless a non-duplicative verb is found; Fallen Heroes is a relatively early
landmark; forbid only nonsense staff↔ladder pairings.

---

## 8. UI/UX and tutorial

*Parallel; firms up after mechanics settle · canon Q8/Q9/Q14.*

Open: how **printed vs effective** rank/suit show on transformed (grafted) cards; whether
play-preview shows damage / suit effects / exact-vs-overkill / post-play risk;
inspectability of hand/Tavern/discard/expedition-deck/card-history; how class & relic
triggers are attributed; the **act recap** that makes a one-hour session feel complete;
the **tutorial verbs** (play+counterattack, four suit powers, same-rank & Ace combos,
exact vs overkill, recruit vs replacement graft, persistent attrition, one visible
loophole); whether **overdraw-and-select** stays (Q14 — evidence required: does its
planning depth justify the modal interruption?).

**Exit test:** an unfamiliar player completes a run segment and explains why cards, class
effects, rewards, and failure behaved as they did — without designer narration.

---

## 9. Alpha scope and difficulty

*Parallel; gates external testing · canon Q18/Q21/Q17.*

Open: **solo-first vs multiplayer-complete** alpha (shared-deck ownership, who picks a
graft after a communal kill, how starting hands are dealt, owner-only vs party-wide
loopholes, reconnection); what counts as an **alpha-complete run** (full five-continent
vs a representative slice; minimum enemy behaviors/routes/landmarks/relics; do all four
classes need full C1–C5?); the coarse **difficulty target** (~1h/act, 4–5h/successful
run, 15–25h to first win).

**Proposed:** **solo-first** (70/30 solo/co-op product target); candidate exit bar — one
stable representative run shape, four distinguishable classes, replacement grafts + an
accepted deck lifecycle, minimal landmark/relic packages, trustworthy UI + revised
tutorial, save/resume + evidence capture + no progression-blocking bugs.

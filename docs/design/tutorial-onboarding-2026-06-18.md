# Tutorial & Onboarding — Implementation Design (18 Jun 2026)

**Status:** Approved design, ready for an implementation plan. Companion to
[`tutorial.md`](./tutorial.md) (the tutorial requirements/script — still the
source of truth for the *beats*). This doc covers the **entry flow**, the
**class-roster restriction**, and the **tutorial build** that delivers it.

Branch: `claude/cloudflare-balancing-test-setup-dlanrm` (the up-to-date web-host
stack: Kingfall rebrand, solo lobby, redesigned token UI, graft-on-kill).

---

## Goal

A first-time player clicks **Start**, is asked if it's their first run, and — if
so — is dropped into a short scripted tutorial before their real Chapter 1. New
players see only the 4 core classes.

---

## 1. Entry flow

- **Rename** the lobby's `Begin a new lineage` button → **`Start`** (`Room.vue`).
- **On Start:** if `localStorage['kingfall-tutorial-done']` is **unset**, show an
  **"Is this your first run?"** modal (reuse `OverlayModal`), two buttons:
  - **Yes** → launch the tutorial (see §3).
  - **No** → set `kingfall-tutorial-done = '1'`, proceed to the normal campaign
    setup (chapter/seed → class select → Chapter 1).
- **Completing _or_ skipping** the tutorial also sets `kingfall-tutorial-done`.
- Once the flag is set, **Start** goes straight to setup — no popup.

**Persistence rationale:** the flag is **client-only** (`localStorage`, same
mechanism as `kingfall-muted`). The server `Kingdom` is a single global
`kingdom.json` with no per-player keying, so a server flag would skip the
tutorial for *every* visitor on the hosted instance after the first. localStorage
correctly scopes "first run" to the individual browser/visitor.

> Related, out of scope: the global `Kingdom` also shares `unlockedChapters` /
> `unlockedClasses` across all hosted visitors. Real issue for a public deploy;
> noted, not solved here.

---

## 2. Class-roster restriction

**Problem today:** `ClassSelect.vue` hardcodes all 9 classes as selectable. Warden
is labelled "Locked" and Exile "parked," but both are still clickable; the footer
says "All classes are unlocked for playtesting."

**Fix:**
- `ClassSelect.vue` renders **only the 4 core**: `sentinel`, `quartermaster`,
  `surgeon`, `executioner`. The other 5 (`commander`, `warden`, `gambler`,
  `oracle`, `exile`) are **hidden entirely** until a meta-unlock exists.
- Update stale copy ("all nine banners answer the call", "All classes are unlocked
  for playtesting") to reflect the 4.
- **Server guard:** `pick_class` rejects any class not in an `AVAILABLE_CLASSES`
  set, so a stale client or save can't select a hidden class. Structure the set so
  future meta-unlocks can widen it.

**Out of scope:** the deeper V3 "rule-broken" class rework (Wall / Snowball /
Overwhelm / Engine in `design-v3.md`). The existing 4 core kits are kept as-is;
only the roster is gated.

---

## 3. Tutorial — architecture

- A dedicated **`TUTORIAL` scripted node**, run before Chapter 1, with a **fixed
  Sentinel**, **fixed seed**, **fixed player deck**, and **fixed enemy draw
  order**. Pure scripting on top of the existing combat engine — **no new combat
  rules**; all randomness flows through `rng.ts` (determinism intact).
- Reuses the existing campaign render pipeline (`CampaignView` → `EncounterBoard`)
  — the tutorial is an encounter, not a parallel mode.
- **Beat runner:** the encounter steps through an ordered beat list. Each beat =
  `{ guideLine, highlight (card id / action), completionCondition }`. Advancing
  requires the player to perform the highlighted action; it never auto-plays.
- **Soft-gate = poke-and-bounce:** the taught card/action is highlighted; off-script
  inputs are gently ignored (not hard-locked). Implemented as client presentation
  driven by a projected beat; the rail pulls the player back rather than blocking.
- **Narrator:** a single terse voice, **"the Steward"** (≤1 line per beat). Easy to
  re-skin; tone matches the dark-fantasy surface.
- **Skip** affordance visible from beat 1 → sets the flag, routes to setup.
- **Graft is taught, on a controlled rail:** graft fires on an exact-kill of an
  *owned* card, so the script controls it precisely — **recruit beats use unowned
  (6+) enemies** (exact-kill → recruit), and the dedicated **graft beat uses an
  owned (≤5) enemy** (exact-kill → `graft_select` picker). The rail enters
  `graft_select` **only** at that scripted beat; no other beat may accidentally
  trigger it.
- **On completion / skip:** set `kingfall-tutorial-done`, then route to the normal
  new-run flow (campaign setup → class select → Chapter 1).

---

## 4. Tutorial — the beats

Extends `tutorial.md`: **all four suits are now explicit** (it had ♣ as
"implicit") and **grafting is taught** (it had Forge/tokens out of scope). This
spec supersedes those two scoping notes for this build. ~12 beats — over
tutorial.md's ≤10 target, accepted on purpose to cover all four suits + graft.
The six **M** beats remain sacred.

**Fight 1 — Training Dummy** (the loop + all four suits + recruit + graft):
1. **Attack — ♣ double damage:** "Clubs strike twice — double damage." (basic
   attack + the ♣ suit, now explicit)
2. **♦ draw:** "Diamonds draw — fill your hand before you pay."
3. **♠ shield (M2):** "Spades blunt the next blow. Block now, pay less."
4. **Discard-to-pay:** "Now cover what's left."
5. **Exact-kill → recruit (M4)** — an **unowned (6+)** enemy at exact HP:
   "Hit it for *exactly* N — it joins your deck."
6. **Exact-kill → graft (NEW)** — an **owned (≤5)** enemy at exact HP triggers the
   `graft_select` picker: "You already hold this one — *reinforce* a card you have:
   add **+1 value** or its **suit**." (the recruit/graft contrast: widen vs. deepen)

**Fight 2 — Gatekeeper** (♦-immune royal): **♥ recovery (M1)** →
**Ace pairing (M3)** → **immunity fizzle (M5)** → **Jester reload (M6)** →
**exact-kill a royal → recruit (M4)**.

> All four suits land in Fight 1 (♣/♦/♠) and Fight 2 (♥). Graft is taught in
> Fight 1 right after recruit; the overall tutorial still **ends on the royal
> recruit** (the dopamine beat), then the end card.

**End card (replaces the old flavor triplet):**
> **You've got it.**
> `[ Begin your run → ]`

---

## Build slices

1. **Entry flow + class restriction** — button rename, first-run popup +
   localStorage flag, hide non-core classes, server `pick_class` guard. Small,
   shippable on its own; no tutorial content required.
2. **Tutorial scaffold** — `TUTORIAL` node/session, fixed Sentinel + fixed deck +
   fixed enemy order, beat-runner state + skip, projection of the current beat to
   the client. Verify `graft_select` is entered **only** at the scripted graft beat
   (owned ≤5 enemy), never elsewhere.
3. **Beat content + guide UI** — the 10 beats, highlight rendering + Steward lines
   in `EncounterBoard`, the end card, completion → flag → route to setup.

Each slice keeps the smoke suite green; tutorial logic is gated so base combat and
the live campaign are untouched.

---

## Open implementation choices (resolve during planning)

- **How "Yes" launches the tutorial:** a new `start_tutorial` socket action that
  builds a tutorial session, vs. `start_campaign` with a `tutorial: true` flag.
  (Leaning: a dedicated action — cleaner to special-case the scripted deck/map.)
- **Beat completion detection:** server-side (the scripted encounter knows the
  expected action and emits the next beat) vs. client-driven. Leaning server-side
  for determinism, with the client only rendering the projected beat + highlight.
- **Soft-gate strength:** confirm poke-and-bounce vs. fully ignoring off-script
  taps once the highlight UI exists.

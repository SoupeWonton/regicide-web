# Design decisions

Decision records capture why canon changed. Their status may be `proposed`,
`accepted`, `rejected`, or `superseded`. Accepted decisions must be reflected in
canonical pages; decision records are not a second layer of overrides.

Naming convention: `YYYY-MM-DD-short-title.md`.

- [`2026-06-18-v3-foundation.md`](2026-06-18-v3-foundation.md) — accepted record of the
  Landry–Gab brainstorming session that began V3; later decisions clarify individual
  details.
- [`2026-06-20-design-practice-and-deck-curation.md`](2026-06-20-design-practice-and-deck-curation.md)
  — establishes design authority and workflow, and withdraws NO-EXILE as an absolute
  constraint while leaving card removal unexplored.
- [`2026-06-20-replacement-graft-semantics.md`](2026-06-20-replacement-graft-semantics.md)
  — corrects redundant exact-kill grafts to replace rank or suit rather than adding
  `+1` or a second suit.
- [`2026-06-20-five-act-continuous-expedition.md`](2026-06-20-five-act-continuous-expedition.md)
  — accepts one continuous five-act, full-reset expedition with multi-session duration
  targets and breadth-not-power meta progression.
- [`2026-06-22-spell-and-relic-models.md`](2026-06-22-spell-and-relic-models.md)
  — **superseded** by 2026-06-24: staged the four fixed suit spell-cards (silver→gold→purple)
  and slotless relics.
- [`2026-06-24-crystals-continents-and-equipment.md`](2026-06-24-crystals-continents-and-equipment.md)
  — **accepted** V3 direction: spells become **fragment/half/full crystals** (two castable rungs;
  Full = win token) in a four-slot gauntlet; the campaign gains a **five-continent + God of Luck**
  lore layer over the five-act pressure skeleton with an **opt-in ending**; relics + the class
  ability become **five equipment slots** (Staff = swappable passive enabler; Cloak/Ring/Hat/Amulet
  = relics), swapped at the **Fallen Heroes** landmark.
- [`2026-06-25-acquisition-cadence-and-royal-gates.md`](2026-06-25-acquisition-cadence-and-royal-gates.md)
  — **accepted**: acquisition is a **closing funnel** (C1 recruits numbers + Hunt; C2 royals via a
  **3/2/1 gate pyramid**; closed from C3); forgiveness front-loaded.
- [`2026-06-25-v3-scope-c1-c2.md`](2026-06-25-v3-scope-c1-c2.md)
  — **accepted**: **V3.0 ships Continent 1 + 2 only** (C3–C5 → V3.5); no-comeback permadeath; class =
  Staff + tree; lineage meta wipe.
- [`2026-06-27-v3.0-question-sweep.md`](2026-06-27-v3.0-question-sweep.md)
  — **accepted**: closes ~16 open questions — class = **home-suit path + selectable Staff** (decoupled;
  C2 unlocks all paths); **grafts only** (suit OR value; royal cap 10); **Forge = spells only, Sanctum =
  deck modification**; landmark roster ratified; slots confirmed; spells above immunity; **solo only**;
  opening **Diamond** + **Camp 4-axis** recovery.
- [`2026-06-28-relic-v1-design-3.0.md`](2026-06-28-relic-v1-design-3.0.md)
  — **accepted**: officializes **`relic_v1_design_3.0`**, the first authored relic pool (29 relics) with
  **locked slot themes** (Cloak = roads · Ring = economy · Hat = recruitment · Amulet = activated);
  resolves the **roster half of Q30**. Catalog: [`canon/v3/systems/relics.md`](../canon/v3/systems/relics.md).
  Per-run count + fragment-touching relics stay open.
- [`2026-06-28-relic-slots-fragments-and-ui.md`](2026-06-28-relic-slots-fragments-and-ui.md)
  — **accepted**: **four relic slots, one per type, equipped from a bag** (resolves per-run count);
  **fragments revised** — agnostic, **50/50 drop after each encounter**, armed between encounters on a
  **bracelet** (4 suit holes) that previews the next spell; opens a **UI/UX doc** for Gab
  ([`delivery/plans/ui-ux-v3.0.md`](../delivery/plans/ui-ux-v3.0.md)). Gauntlet = holder (tiers
  Fragment→Half→Full); **Forge = forge** (tier-up); Staff roster = the 4 class passives — all resolved.
- [`2026-07-01-v3.0-build-decisions.md`](2026-07-01-v3.0-build-decisions.md)
  — **accepted**: closes **every remaining §Q build blocker** in one sweep (12 decisions): identical
  A–5×4 starting decks; cast = consume-to-empty; graft trigger rolls no fragment; auto seam reset +
  **four-part Camp (adds start-block 10; redraw = draw up to 5)**; C2 provinces mirror the C1 skeleton;
  free relic swaps; uncapped fragment pool; ability/relic contracts delegated to engineering (⚑-flagged);
  placeholder UI; **fully autonomous 9-slice build** until playtest
  ([`delivery/plans/v3.0-build-execution.md`](../delivery/plans/v3.0-build-execution.md)).

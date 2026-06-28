---
kind: delivery
edition: v3
status: active
owner: Gab
date: 2026-06-28
---

# UI/UX — V3.0 *(Gab's domain)*

Companion to [`v3.0-integration.md`](v3.0-integration.md). This is the home for the **UI/UX surfaces
V3.0 needs.** **Design supplies the mechanical constraints here (✅ = decided); the layout, interaction,
and feel are Gab's** (per [`2026-06-27` Decision 9](../../decisions/2026-06-27-v3.0-question-sweep.md): UI/UX = Gab).

> Scope = the screens implied by the [builder-ready change list](v3.0-integration.md#builder-ready-change-list--what-changes-vs-live-91d3677).
> **Two parts for Gab:** the **screen inventory** below (what to design) and the **Decisions to be taken**
> at the bottom (the only open UI calls). The two priority screens (Landry, 2026-06-28) are the
> **skill-tree / path selection** and the **equip menu** (relics + fragments).

## Screen inventory

| # | Screen | When | Mechanics (design) | Gab designs |
|---|---|---|---|---|
| 1 | **Class select + Staff** | Run start (C1) | ✅ pick 1 of 4 classes; pick **1 of that class's 4 Staffs** | the picker, Staff cards |
| 2 | **Skill-tree / path selection** ⭐ | Entering C2 | ✅ C2 grants the home-path rung (animated); post-C2-clear runs **choose among 4 open paths** | the tree view, the reveal animation |
| 3 | **Equip menu** (relics + fragments) ⭐ | Between encounters | ✅ relic **bag → 4 slots**; **bracelet** places agnostic fragments into the **gauntlet** | the whole management screen |
| 4 | **In-combat gauntlet / cast** | In combat | ✅ cast a suit spell (consumes); **castable vs. a matching-immune enemy** | cast affordance + the above-immunity cue |
| 5 | **Landmark decision** | At each landmark | ✅ one telegraphed decision, one verb | each landmark's single-decision card |
| 6 | **Royal gate keep-decision** | C2 gates | ✅ keep **3 / 2 / 1** of four royals (after the gate fight) | the keep/leave-behind chooser |
| 7 | **God-of-Luck wager** | Between continents | ✅ animation only in V3.0 (pick top card, always "lose") | the wager animation |
| 8 | **Seam / continent recap** | Province & continent seams | ✅ a recap that makes a session feel complete | the recap screen |

---

## 1. Class select + Staff *(§2)*

Pick one of **Sentinel ♠ · Executioner ♣ · Quartermaster ♦ · Surgeon ♥**, then pick **one of that
class's four Staffs** (the selectable passive). The class sets the **home-suit path**; the Staff is
orthogonal. The four Staffs per class are the **passive signatures** already authored in
[`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md) (resolved
2026-06-28) — build the picker against those.

## 2. Skill-tree / path selection ⭐ *(§2)*

The class's progression is **four suit paths (♠/♥/♦/♣ ladders)**; see
[`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md).

- **First run:** you **start on your home-suit path.** **Entering Continent 2 grants its C2 rung** — a
  single ability, revealed by an **animation** (Gab: how it shows). C3/C4/C5 rungs are shown
  **visible-but-locked** so the ladder reads as a tree to grow into.
- **After clearing C2:** the **other three paths open** and become **selectable on entering C2** on later
  runs — this is the replayability choice.
- **Decoupled from the Staff** — the tree view shows the path ladder; the Staff is a separate slot
  (swapped at Fallen Heroes, screen 5).

**Gab designs:** the tree/ladder layout (locked vs. live rungs), the C2 grant animation, and how
"choose your path" reads on a post-C2 run.

## 3. Equip menu — relics + fragments ⭐ *(§6, §5)*

The **between-encounter management screen.** Two modules.

### Module A — Relic bag → four slots ✅

- **Four slots, one each: Hat · Amulet · Ring · Cloak.** A run equips **at most one relic per slot.**
- Relics won at the **Lair**/**Caravan** land in a **bag** (collected, not-yet-equipped). The player
  **drags/selects from the bag into the matching slot** — a relic only fits its own slot type.
- The bag can hold **more relics than slots**, so equipping is a **build choice.** Pool: the 29 of
  [`relic_v1_design_3.0`](../../canon/v3/systems/relics.md); each card shows its one-line rule.

**Gab designs:** bag↔slot layout, equipped vs. bagged states, swap interaction, the relic card face.

### Module B — Fragment bracelet → the gauntlet ✅

- The **gauntlet** holds the four suit crystals (♠ ♦ ♥ ♣), each at tier **Fragment → Half → Full**. The
  **bracelet** is the UI to manage it.
- **Fragments are agnostic** (any fragment fits any suit) and **drop 50/50 after each encounter.** The
  player **places fragments into a suit hole** — **equip** (use that suit's spell next encounter at its
  current tier) or **sandbag** (keep stacking toward **Half**, then **Full**).
- The screen **previews the card / spell** armed for the next encounter, and shows each suit's **current
  tier** and how close it is to the next.

**Gab designs:** the bracelet/hole affordance, the place/stack interaction, the tier + next-encounter
**spell preview**, and how an empty vs. armed vs. sandbagging suit reads at a glance.

**Note:** the **Forge landmark** (screen 5) performs the **forge** (fragments → next tier); the bracelet
only *places/equips/sandbags*. Only the **fragments-per-Half** number is open.

## 4. In-combat gauntlet / cast *(§6)*

Cast one armed suit spell (consumes it; cap one per suit per combat). The key visual: a spell is
**castable against an enemy immune to its suit** — the cue must make that legible.

## 5. Landmark decision *(§8)*

Each landmark is **one sharp, telegraphed decision, one verb** — never a shop buffet:
**Forge** (forge — fragments → next crystal tier), **Sanctum** (Rearrange — 2 transfers), **Caravan**
(pay-from-hand for a relic), **Lair** (raid a relic), **Camp** (the 3-part rest), **Shrine**
(Consecrate), **Hunt** (C1 — pursue a recruit), **Fallen Heroes** (swap Staff — one random Staff per class).

**Gab designs:** the shared "one decision" landmark card, telegraphed before commit.

## 6. Royal gate keep-decision *(§3)*

After each C2 gate fight, choose which royals follow you: **Jack Gate keep 3/4 · Queen Gate keep 2/4 ·
King Gate keep 1/4** (the crown). Royals left behind were still fought; you just don't recruit them.

## 7. God-of-Luck wager *(§9)*

Between continents, an **animation only** in V3.0: the player picks the top card and always "loses"
(faked bad RNG). The flip that *changes* (all four crystals Full) is V3.5.

## 8. Seam / continent recap *(§10)*

A run is **single-session** (no mid-run save). A **rest falls at every province seam**; a recap at
province/continent boundaries should make a ~one-hour session feel complete.

## Decisions to be taken (UI/UX — Landry + Gab)

These are **the only open items**; none block design starting. They are UI-shaped, not mechanics:

- **Relic swapping:** re-equip from the bag at every between-encounter screen, or only certain stops? Cost?
- **Bracelet timing:** is a suit locked once the next encounter starts? Can a fragment move suits before committing?
- **Fragment overflow:** what happens to fragments when a suit is at Full / no useful hole remains?
- **One screen or two:** relic management and the bracelet on one screen, or separate stops?

*(Resolved 2026-06-28: the **Forge node stays** — verb = forge; the **Staff roster** = the four passive
signatures per class; **gauntlet** = holder, **bracelet** = its UI.)*

## Related

- [`v3.0-integration.md`](v3.0-integration.md) (build plan + the builder-ready change list) ·
  [`canon/v3/systems/items`](../../canon/v3/systems/items.md) (equipment + spells) ·
  [`canon/v3/systems/relics`](../../canon/v3/systems/relics.md) (relic pool) ·
  [`facet-and-linear-candidates`](../../wiki/v3/classes/facet-and-linear-candidates.md) (paths/Staffs).

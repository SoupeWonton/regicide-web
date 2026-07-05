# Kingfall — Regicide (Unity)

A single-player desktop roguelike deckbuilder. Clean rebuild of the *Regicide* web
prototype in Unity/C#. **The full build spec is [`docs/BUILD-SPEC.md`](docs/BUILD-SPEC.md) —
read it before writing code.**

## Architecture (enforced)
Two assemblies:
- **`Assets/Regicide.Core/`** — pure C# rules/state/RNG. Its asmdef has
  `"noEngineReferences": true`, so it **cannot** reference `UnityEngine` — the whole game
  simulates and unit-tests headlessly. This is authoritative.
- **`Assets/Regicide.Unity/`** — MonoBehaviours, UI, assets. References Core. A **pure view**
  over Core state: submit an action → `Dispatch` → re-render from state + play back events.

**Status: Core is feature-complete for the alpha** (spec §15 steps 1–10): base combat,
the recruit/graft engine, roads & run flow, the three royal gates with the 3/2/1 keep
pyramid and crown victory, the four home C2 rungs, all 16 Staffs + Fallen Heroes, the
full spell system (gauntlet/bracelet/Forge/8 effects), all 29 relics with Lair/Caravan
acquisition, Sanctum/Shrine, and meta/lineage persistence.

Verify Core headlessly (no Unity needed):
```
dotnet run --project Tools/Headless
```
That runs the assertion suite (1350+ checks, including a full campaign played to
coronation) and then a scripted demo fight. It compiles `Assets/Regicide.Core` directly
with LangVersion pinned to 9.0 for Unity parity.

## Scope of this build (alpha)
Continent 1 + Continent 2: class select → conquer a full A–10 deck by exact-kill recruiting
→ three royal gates (keep 3 / 2 / 1) → crown = victory. Continents 3–5, the "Full crystal"
endgame, mid-run save, and the other five classes are **post-alpha** (spec §13).

## Open
1. Install a Unity **6000.0.x LTS** editor via Unity Hub (update `ProjectSettings/ProjectVersion.txt`
   to match), add this folder as a project, and open it — Unity generates `.meta` files,
   `Library/`, and the rest of `ProjectSettings/` on first open.
2. Build order: see BUILD-SPEC.md §15 — Core first, verify headlessly, then grow the UI.

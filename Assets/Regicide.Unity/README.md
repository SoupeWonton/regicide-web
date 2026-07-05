# Regicide.Unity — the presentation layer

A **pure view** over `Regicide.Core` (BUILD-SPEC.md §2, §16). Every screen is built
from code with UI Toolkit; every click submits an `IAction` through
`GameSession.Dispatch`; after each dispatch the whole UI re-renders from
`session.State` and the returned events append to the scrolling log. No rules live
on this side.

## Opening the project the first time

1. In Unity Hub, add `C:\kingfall` and open it with **Unity 6000.0.78f1** (the
   pinned version — see `ProjectSettings/ProjectVersion.txt`). First import
   generates `Library/` and `.meta` files; **commit the `.meta` files** (the
   `.gitignore` already excludes `Library/`).
2. Create the single scene: `Assets/Scenes/Run.unity` — an empty GameObject named
   `RunApp` with the `RunApp` component on it. That's the whole scene; screens are
   panels the component builds and swaps by `CampaignPhase`.
3. (Recommended) Create a PanelSettings asset — *Assets ▸ Create ▸ UI Toolkit ▸
   Panel Settings* — and drag it onto the `RunApp` component's **Panel Settings**
   field so the default theme/fonts apply. If left empty, a bare PanelSettings is
   created at runtime (functional, but unthemed).
4. Press Play. Main menu → seed field → New Run.

## Files

| File | What it holds |
|---|---|
| `RunApp.cs` | Entry MonoBehaviour, dispatch loop, render router, UI kit, picker overlay |
| `RunApp.Menu.cs` | Main menu, class/staff select, recap, win/loss screens |
| `RunApp.Road.cs` | Road map, bracelet, relic bag/slots, Forge/Caravan/Heroes/Sanctum panels |
| `RunApp.Encounter.cs` | Enemy readout, hand/play/yield, staff & spell & relic combat actions |
| `RunApp.Dialogs.cs` | Blocking pending-choice overlays (defend, graft, gate keeps, …) |
| `ContentText.cs` | All display text keyed by Core's content ids |
| `Defs.cs` | ScriptableObject shells (ClassDef/StaffDef/RelicDef/SpellDef, §12) for later authoring |

## Meta / lineage

`MetaState` saves to `Application.persistentDataPath/lineage.json` — runs, wins,
C2-cleared. There is **no mid-run save** (§2): closing the app forfeits the run.

## Headless compile check

`dotnet build Tools/UnityCheck` compiles Core + this layer against the installed
Unity module DLLs without opening the editor. Run it after any change here.

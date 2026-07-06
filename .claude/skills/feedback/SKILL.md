---
name: feedback
description: Playtest-feedback collection mode. The user fires feedback items across multiple messages that must NOT be implemented yet; sort and log them until the user gives the go-ahead ("do it", "ok I'm done", "go ahead", "code it", "ship it"...), then plan and implement the whole batch. Use when the user invokes /feedback.
---

# Feedback collection mode

The user is playtesting (usually Kingfall, `C:\kingfall`) and will send feedback
items one or more messages at a time. Your job splits into two phases.

## Phase A — collect (starts NOW, on invocation)

1. **Enter plan mode immediately** (EnterPlanMode) — it enforces read-only while
   collecting. Create/overwrite the plan file as a ledger with these buckets:
   *Cards & hand · Battle screen · Road & map · Menus & meta screens · Sounds & FX ·
   Rules/balance flags · Unsorted (needs clarification)*, plus a pre-drafted
   "Agent split" section (see Phase B).
2. **For every message the user sends**: sort each item into its bucket in the
   plan file with (a) what the user asked in their words, (b) your read on the
   fix and which files it touches, (c) a flag when it's a confirmed bug vs a
   design ask vs a rules/balance question. Reply with a SHORT confirmation
   (1–3 sentences) — answer any direct question in the item (e.g. "what is this
   box?"), surface useful diagnosis, but write NO code and change NO files
   except the plan file.
3. Ask a clarifying question ONLY when an item is genuinely ambiguous — one
   short question, then keep collecting.
4. Do not exit plan mode, do not implement, no matter how obvious an item is.

## Phase B — the go-ahead

Trigger phrases (loose matching, they vary): "do it", "ok I'm done", "code it
all", "go ahead", "that's it", "make it happen", "ship it". When it arrives:

1. Rewrite the plan file as a final executable plan: Context (what playtest
   round, which build), the sorted items as concrete work orders, the split,
   and verification. Then **ExitPlanMode** for approval.
2. Implement with the established Kingfall protocol:
   - Shared-kit/Core changes FIRST, by you (CardView/Widgets/Theme/Fx/Sfx/Tips/
     ContentText/RunApp.cs chrome, anything in Regicide.Core) — compile-check,
     then commit locally so agents fork from it.
   - Per-screen files in PARALLEL via fork agents, one file-set each, in
     detached worktrees you create manually (`git worktree add --detach
     ../kingfall-wt-<name> HEAD`; the built-in worktree isolation does not work
     from this session's cwd). Agents: own files only, no git, verify with
     `dotnet build Tools\UnityCheck` inside their worktree, report back.
   - Integrate: harvest files, remove worktrees, `dotnet build Tools/UnityCheck`
     (0 errors), `dotnet run --project Tools/Headless` (all green),
     headless player build (`-executeMethod Kingfall.EditorTools.KingfallSetup.BuildWindows`),
     12-second boot smoke with exception grep.
   - **Commit locally only. NEVER push or refresh `desktop-releases` unless the
     go-ahead itself said to ship** (see the no-auto-push memory). If it did
     ("ship it"), also: push the branch, recompile the installer (ISCC +
     `Tools\Installer\kingfall.iss`), zip with
     `C:\Windows\System32\tar.exe --options zip:compression=deflate -a -cf`
     (survives the game running), push both binaries to `desktop-releases`,
     verify the live link byte-for-byte.

## Standing constraints (memory-backed — verify there if unsure)

- The web version's UX is the reference: minimal chrome, no invented surfaces.
- The runtime font renders ONLY the suit pips ♠♥♦♣ and Latin-1 punctuation —
  any other symbol must be a Painter2D MiniIcon, a letter, or a word.
- Core balance is spec-defined; flag rules questions back to the user instead
  of changing numbers silently.
- Tooltips exist (`Tips.Attach`); FX exist (`Fx`, event-driven via `PlayEventFx`);
  sounds are the web recipes (`Sfx`) — extend these, don't invent parallel systems.

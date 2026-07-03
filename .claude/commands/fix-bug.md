---
description: Reproduce a Regicide bug deterministically via the replay oracle, locate the divergence, fix the one named handler, and freeze it as a regression fixture.
argument-hint: "<trace.jsonl | seed> [bug description]"
---

Debug a Regicide engine bug **cheaply and deterministically**. The engine is a
deterministic state machine, so a recorded trace (seed + actions) re-executes to
the exact same state. `scripts/replay.ts` is the oracle: it re-runs the trace
through the real dispatch table and tells you, by **exit code**, whether the
engine still agrees with the recording — and if not, *which step and which
handler* diverged. You read one screen and one file, not the whole codebase.

Argument: `$ARGUMENTS` — a trace path, or a seed, optionally followed by a
free-text symptom.

## The loop

### 1. Get a trace (the reproduction)
- **Already have one?** Live games and sims write to `server/data/traces/`.
  Invariant violations during a sim auto-dump `violation-*.jsonl` there. Use it
  directly.
- **Only a seed?** Record it: from `server/`,
  ```
  npx tsx scripts/sim.ts --lineups <persona> --counts 1 --seeds <N> --trace --trace-only <seed>
  ```
  (`<N>` large enough that the seed's index is generated). The trace lands in
  `data/traces/`. Seeds look like `sim-steady-1p-0`.
- **A human-observed bug with no trace?** Ask the user for the seed + the exact
  actions, or reproduce in the running game (`npm run dev`) with trace recording
  on, then use that trace.

### 2. Run the oracle
From `server/`:
```
npx tsx scripts/replay.ts <trace.jsonl> --packet
```
`--packet` prints a **one-screen debug context**: the verdict, the failing
action, the exact handler file to open, the pre-step state, and the diff. That
packet is your whole context — do not go read unrelated files.

### 3. Branch on the verdict (exit code IS the protocol)

| Code | Verdict | Meaning | Do |
|---|---|---|---|
| `0` | **clean** | Trace replays byte-identically. No engine bug is captured here. | The bug is human-observed, not caught by invariants/view. Use the packet's step states to investigate the symptom by hand, or ask the user which step looked wrong. |
| `2` | **invariant** | The engine corrupted its own state at step N (dup card, dead actor acting, bad rng). **A real bug.** | Open the `HANDLER` file named in the packet. The bug is on that action's path. Fix it. |
| `3` | **divergence** | Engine behavior changed vs the recording at step N. **A real regression _or_ an intended rules/copy change.** | Read the diff. If it's an *intended* change (reworded text, a new field, a rebalanced value), the recording is just stale — re-record, don't "fix." If it's unintended, open the `HANDLER` file and fix. |
| `4` | **dispatch_error** | The engine rejected an action it once accepted, or the trace is label-only (pre-v3 bot trace). Not replayable. | Re-record with the current sim (`--trace`). |
| `5` | **expired** | The stored-hands RNG canary mismatched: the engine consumes the RNG stream differently than when recorded. **NOT a bug.** | Any change that adds/removes/reorders an `rng()` call re-scrambles later draws. Re-record the trace. If you did *not* intend to change RNG consumption, check your diff for a stray `rng()` call. |

### 4. Fix (only for verdicts 2 / 3-unintended)
- Change **only** the handler path the packet points at. Re-run step 2 — the
  verdict should flip to `clean` (or `expired`, if your fix legitimately shifted
  RNG consumption, in which case re-record).
- Run the engine suite: `npx tsx scripts/smoke.ts` must end
  `All smoke tests passed ✅`. Add a smoke case for the rule you fixed.

### 5. Freeze the bug as a permanent regression test
```
npx tsx scripts/replay.ts <trace.jsonl> --shrink
```
This writes the **minimal reproducing prefix** (determinism makes it exactly
`[0..failing step]`) to `scripts/fixtures/bugs/<name>-stepN.jsonl`. Then author a
sibling `<name>-stepN.expect.json` capturing the **correct** post-fix behavior:
```json
{ "atEnd": { "encounter.currentEnemy.hp": 12, "heroes.0.alive": true } }
```
Thereafter `npx tsx scripts/replay.ts <fixture> --assert <expect.json>` guards
the fix (exit `3` = `assert_failed` if it ever regresses). The shrunk fixture is
lite (views dropped, hands kept as the RNG canary), so it survives unrelated
engine changes longer than a full-state golden answer would.

## Rules
- **Trust the verdict.** `expired`/`dispatch_error` are *not* bugs — never "fix"
  the engine to match a stale recording. That's how you introduce real bugs.
- **Read one file.** The packet names the handler. The whole point of this
  architecture is to not load the codebase into context. Resist wandering.
- Never commit a `fixtures/bugs/*` entry for a stale-recording divergence — only
  for a genuine bug you fixed.
- Build only on `v3-integration` (see `CLAUDE.md`).

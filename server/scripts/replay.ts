// The bug oracle: re-execute a recorded trace through the REAL engine.
//
//   npx tsx scripts/replay.ts <trace.jsonl> [--packet] [--shrink] [--assert <expect.json>] [--json]
//
// Rebuilds the campaign from the trace header (seed + players + chapter +
// kingdom snapshot) and re-dispatches every recorded action through
// campaign/dispatch.ts — the same table the live server uses. Per step it
// runs the engine invariants, compares the stored hands (the RNG-stream
// canary) and deep-diffs the recomputed client view against the stored one.
//
// EXIT CODES ARE THE PROTOCOL (the /fix-bug skill branches on them):
//   0 clean          — the whole trace replays byte-identically
//   2 invariant      — engine corrupted its own state at step N (a bug)
//   3 divergence     — engine behavior changed vs the recording at step N (a bug, or an intended rules change)
//   4 dispatch error — an action the engine accepted before is now rejected /
//                      the trace is not replayable (pre-v3 label-only bot trace)
//   5 expired        — stored hands mismatch: the engine's RNG consumption
//                      changed since recording. NOT a bug — re-record the trace.
//   1 usage / IO
//
// --packet   emit the compact LLM debug packet (~1 screen) instead of prose.
// --shrink   on failure, write the minimal reproducing fixture (the prefix up
//            to the failing step — determinism makes that minimal) into
//            scripts/fixtures/bugs/ plus an .expect.json skeleton.
// --assert   check dot-path expectations against the FINAL CampaignState.
//
// Determinism is fragile by design: any engine change that adds/removes/
// reorders an rng() call re-scrambles every later draw. The hands canary
// turns that into a crisp "expired" verdict instead of a confusing diff.

import fs from 'fs'
import path from 'path'
import { createCampaign, buildClientCampaign } from '../campaign/campaign'
import { applyAction, HANDLER_LOCATIONS } from '../campaign/dispatch'
import type { CampaignAction } from '../campaign/dispatch'
import { checkInvariants } from '../campaign/invariants'
import { REPLAY_KINGDOM, writeActionTrace } from '../campaign/trace'
import type { CampaignState, KingdomState } from '../campaign/types'
import { cardLabel } from '../deck'
import { applyTraceDiet, normalizeIds, deepDiff, stateSummary, getPath, type DiffEntry } from './replay-diff'

const REPLAY_HOST = '__replay__'

export interface ReplayResult {
  status: 'clean' | 'invariant' | 'divergence' | 'dispatch_error' | 'expired' | 'assert_failed' | 'io_error'
  step?: number              // 1-based index of the first failing action
  action?: Record<string, unknown>
  detail: string[]           // violations / diff lines / error text
  steps: number              // actions replayed
  packet?: string
  finalState?: CampaignState
}

interface TraceStep { action: Record<string, unknown>; actorIdx?: number; view?: any; hands?: string[][] }

export function replayTrace(file: string, opts: { packet?: boolean; shrink?: boolean; assertFile?: string } = {}): ReplayResult {
  let lines: string[]
  try { lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) } catch (e) {
    return { status: 'io_error', detail: [`cannot read ${file}: ${e}`], steps: 0 }
  }
  const header = JSON.parse(lines[0]!)
  if (!header.trace) return { status: 'io_error', detail: ['not a trace file (no header)'], steps: 0 }
  const steps: TraceStep[] = lines.slice(1).map(l => JSON.parse(l))

  // rebuild the campaign exactly as the recording started it
  const players = (header.players as string[]).map((name, i) => ({ id: `p${i + 1}`, name }))
  const kingdom: KingdomState = header.kingdom ?? {
    ...REPLAY_KINGDOM,
    unlockedChapters: [1, 2, 3, 4, 5, 6],   // v2 traces carry no snapshot — permissive
  }
  const { campaign: c, error } = createCampaign(players, header.chapter, header.seed, kingdom, header.name)
  if (error || !c) return { status: 'io_error', detail: [`createCampaign: ${error}`], steps: 0 }
  c.recordRun = false

  const fail = (status: ReplayResult['status'], i: number, detail: string[], pre: string[]): ReplayResult => {
    const step = steps[i]!
    const r: ReplayResult = { status, step: i + 1, action: step.action, detail, steps: i, finalState: c }
    if (opts.packet) r.packet = buildPacket(file, header, r, pre, steps.length)
    if (opts.shrink) r.detail.push(shrink(file, header, steps, i, c, kingdom))
    return r
  }

  let preState: string[] = stateSummary(c)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    const action = step.action as CampaignAction
    if (action.type === 'abandon_campaign') break   // session-scoped terminal
    if (!(action.type in HANDLER_LOCATIONS))
      return fail('dispatch_error', i, [`unknown action type '${action.type}'`], preState)
    // pre-v3 bot traces recorded labels only ({type:'play'} without payloads)
    const needsPayload = ['play_cards', 'discard_damage', 'keep_drawn', 'setup_reorder'].includes(action.type)
    if (needsPayload && Object.keys(action).length === 1)
      return fail('dispatch_error', i, [`label-only trace (pre-v3) — re-record with the current sim/--trace`], preState)

    const actorIdx = step.actorIdx ?? step.view?.myHeroIndex ?? 0
    const playerId = c.heroes[actorIdx]?.playerId ?? c.heroes[0]!.playerId
    const hostId = c.heroes[0]!.playerId

    // the beforeEnd slot mirrors where traceAction recorded the step: compare
    // hands (RNG canary) and the projected view BEFORE checkEncounterEnd settles
    let expired: string[] | null = null
    let diverged: DiffEntry[] | null = null
    const r = applyAction(c, playerId, hostId, action, kingdom, () => {
      if (step.hands) {
        const now = (c.encounter ? c.encounter.hands : c.deck?.hands ?? []).map(h => h.map(cardLabel))
        if (JSON.stringify(now) !== JSON.stringify(step.hands))
          expired = [`stored hands ${JSON.stringify(step.hands)}`, `replayed hands ${JSON.stringify(now)}`]
      }
      if (!expired && step.view) {
        const storedIds = (step.view.heroes ?? []).map((h: any) => h.playerId)
        const mine = applyTraceDiet(buildClientCampaign(c, playerId, REPLAY_HOST, REPLAY_KINGDOM))
        const diffs = deepDiff(
          normalizeIds(step.view, storedIds),
          normalizeIds(JSON.parse(JSON.stringify(mine)), c.heroes.map(h => h.playerId)),
        )
        if (diffs.length) diverged = diffs
      }
    })

    if (r.error) return fail('dispatch_error', i, [r.error], preState)
    if (expired) return fail('expired', i, expired, preState)
    if (diverged) return fail('divergence', i,
      (diverged as DiffEntry[]).map(d => `${d.path}: stored=${JSON.stringify(d.stored)} replayed=${JSON.stringify(d.replayed)}`), preState)
    const viol = checkInvariants(c)
    if (viol.length) return fail('invariant', i, viol, preState)
    preState = stateSummary(c)
  }

  // optional final-state assertions (regression fixtures)
  if (opts.assertFile) {
    const expect = JSON.parse(fs.readFileSync(opts.assertFile, 'utf8'))
    const misses: string[] = []
    for (const [p, want] of Object.entries(expect.atEnd ?? {})) {
      const got = getPath(c, p)
      if (JSON.stringify(got) !== JSON.stringify(want)) misses.push(`${p}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`)
    }
    if (misses.length) {
      const r: ReplayResult = { status: 'assert_failed', detail: misses, steps: steps.length, finalState: c }
      if (opts.packet) r.packet = buildPacket(file, header, r, stateSummary(c), steps.length)
      return r
    }
  }

  return { status: 'clean', detail: [], steps: steps.length, finalState: c }
}

// ── the LLM debug packet: one screenful, everything needed, nothing else ─────

function buildPacket(file: string, header: any, r: ReplayResult, preState: string[], total: number): string {
  const L: string[] = []
  L.push(`TRACE ${path.basename(file)} · seed=${header.seed} ch=${header.chapter} classes=${(header.classes ?? []).join('+')} · ${total} actions · trace v${header.trace}${header.lite ? ' (lite)' : ''}`)
  L.push(`VERDICT ${r.status.toUpperCase()} at step ${r.step}/${total}`)
  if (r.status === 'expired') {
    L.push('Meaning: the engine consumed the RNG stream differently than when this was')
    L.push('recorded — NOT a bug. Re-record the trace (or, if you did not intend to change')
    L.push('RNG consumption, check your diff for added/removed rng() calls).')
  }
  if (r.action) {
    L.push(`ACTION ${JSON.stringify(r.action)}`)
    const loc = HANDLER_LOCATIONS[(r.action as any).type as keyof typeof HANDLER_LOCATIONS]
    if (loc) L.push(`HANDLER ${loc}   ← read THIS file; the bug (if any) is in this action's path`)
  }
  L.push('', 'STATE BEFORE THE STEP:')
  for (const s of preState) L.push('  ' + s)
  L.push('', r.status === 'divergence' ? 'DIFF (stored recording vs this engine):' : 'DETAIL:')
  for (const d of r.detail.slice(0, 12)) L.push('  ' + d)
  const log = r.finalState?.log?.slice(0, 5) ?? []
  if (log.length) { L.push('', 'LAST LOG LINES:'); for (const ln of log) L.push('  ' + ln) }
  return L.join('\n')
}

// ── shrink: freeze the failing prefix as a regression fixture ────────────────
// Determinism makes the minimal reproducing prefix exactly [0..failStep] — no
// search needed. Views are dropped (lite): the replayer recomputes state.

function shrink(file: string, header: any, steps: TraceStep[], failIdx: number, c: CampaignState, kingdom: KingdomState): string {
  const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'fixtures', 'bugs')
  fs.mkdirSync(dir, { recursive: true })
  const name = path.basename(file, '.jsonl') + `-step${failIdx + 1}`
  const lite = steps.slice(0, failIdx + 1).map(s => ({
    action: s.action,
    actorIdx: s.actorIdx ?? s.view?.myHeroIndex ?? 0,
    hands: s.hands,   // kept: the canary distinguishes 'expired' from 'bug'
  }))
  const out = path.join(dir, `${name}.jsonl`)
  const headerOut = { ...header, lite: true, shrunkFrom: path.basename(file), kingdom: header.kingdom ?? kingdom }
  fs.writeFileSync(out, [JSON.stringify(headerOut), ...lite.map(s => JSON.stringify(s))].join('\n') + '\n')
  void writeActionTrace   // (kept for API symmetry; direct write preserves hands)
  return `shrunk fixture → ${out} (add a ${name}.expect.json with atEnd assertions once fixed)`
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const EXIT: Record<ReplayResult['status'], number> = {
  clean: 0, io_error: 1, invariant: 2, divergence: 3, dispatch_error: 4, expired: 5, assert_failed: 3,
}

if (!process.env.REPLAY_NO_MAIN) {
  const args = process.argv.slice(2)
  const file = args.find(a => !a.startsWith('--'))
  if (!file) { console.error('usage: npx tsx scripts/replay.ts <trace.jsonl> [--packet] [--shrink] [--assert <expect.json>] [--json]'); process.exit(1) }
  const assertIdx = args.indexOf('--assert')
  // Mute engine chatter (map-gen [CT] lines, etc.) so the packet/verdict is the
  // ONLY thing on stdout — the /fix-bug skill reads stdout as its whole context.
  const realLog = console.log
  console.log = () => {}
  const res = replayTrace(file, {
    packet: args.includes('--packet'),
    shrink: args.includes('--shrink'),
    assertFile: assertIdx >= 0 ? args[assertIdx + 1] : undefined,
  })
  console.log = realLog
  if (args.includes('--json')) {
    const { finalState: _f, ...slim } = res
    console.log(JSON.stringify(slim, null, 1))
  } else if (res.packet) {
    console.log(res.packet)
  } else {
    console.log(`${res.status.toUpperCase()}${res.step ? ` at step ${res.step}` : ''} (${res.steps} actions replayed)`)
    for (const d of res.detail.slice(0, 12)) console.log('  ' + d)
  }
  process.exit(EXIT[res.status])
}

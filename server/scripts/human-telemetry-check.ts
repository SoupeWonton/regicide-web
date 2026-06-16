// Runtime check for human-run telemetry (campaign + quick game).
// Run: npx tsx scripts/human-telemetry-check.ts
// Creates a throwaway solo province campaign through the REAL session
// dispatcher, walks one road step, abandons; then a quick game through
// rooms.ts, one play, restart. Verifies counters move and CSV rows land.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { startCampaignSession, dispatchCampaignAction, getSession } from '../campaign/sessions'
import { EXPERIMENTS } from '../campaign/experiments'
import { createRoom, joinRoom, startGame, playCards, restartGame } from '../rooms'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RUNS = path.join(HERE, '..', 'data', 'human-runs', 'runs.csv')
const QUICK = path.join(HERE, '..', 'data', 'human-runs', 'quick.csv')
const tail = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').pop() : '(missing)')

let failed = false
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed = true
}

// ── campaign path ────────────────────────────────────────────────────────────
EXPERIMENTS.provinceMode = true
const players = [{ id: 'p1', name: 'TeleCheck' }]
const start = startCampaignSession('TELE', players, 1, 'tele-check-seed')
check('campaign session starts', !start.error)
const c = getSession('TELE')!

let r = dispatchCampaignAction('TELE', 'p1', 'p1', { type: 'pick_class', classId: 'executioner' })
check(`class pick ok${r.error ? ` (${r.error})` : ''}`, !r.error)
check('telemetry initialized by dispatch', !!c.telemetry)

// walk the road until an encounter starts (max 4 steps through landmarks)
for (let step = 0; step < 4 && !c.encounter; step++) {
  if (c.phase === 'landmark' && c.pendingChoice) {
    r = dispatchCampaignAction('TELE', 'p1', 'p1', { type: 'choice_pick', optionId: c.pendingChoice.options[0]!.id })
    check(`landmark resolved${r.error ? ` (${r.error})` : ''}`, !r.error)
    continue
  }
  if (c.phase !== 'road' || !c.map) break
  const cur = c.map.nodes.find(n => n.id === c.map!.currentNodeId)!
  r = dispatchCampaignAction('TELE', 'p1', 'p1', { type: 'road_choose', nodeId: cur.next[0]! })
  check(`road step ok${r.error ? ` (${r.error})` : ''}`, !r.error)
}
if (c.encounter) {
  check('encounter counted', c.telemetry!.encountersFought === 1)
  check('encounter marked seen (no double count)', c.encounter.flags['teleSeen'] === true)
}
console.log(`  telemetry: ${JSON.stringify({ ...c.telemetry, itemsSeen: c.telemetry!.itemsSeen.length })}`)

const before = fs.existsSync(RUNS) ? fs.readFileSync(RUNS, 'utf8').split('\n').length : 0
r = dispatchCampaignAction('TELE', 'p1', 'p1', { type: 'abandon_campaign' })
check('abandon ok', !r.error)
const after = fs.existsSync(RUNS) ? fs.readFileSync(RUNS, 'utf8').split('\n').length : 0
check('campaign CSV row appended', after === before + 1 || (before === 0 && after >= 2))
console.log(`  row: ${tail(RUNS)}`)

// ── opt-out + run naming ─────────────────────────────────────────────────────
const start2 = startCampaignSession('TEL2', [{ id: 'p1', name: 'TeleCheck' }], 1, 'tele-seed-2', { runName: 'My Named Run', record: false })
check('named no-record session starts', !start2.error)
const c2 = getSession('TEL2')!
check('run name applied', c2.name === 'My Named Run')
check('recordRun=false stored', c2.recordRun === false)
dispatchCampaignAction('TEL2', 'p1', 'p1', { type: 'pick_class', classId: 'executioner' })
const optBefore = fs.existsSync(RUNS) ? fs.readFileSync(RUNS, 'utf8').split('\n').length : 0
dispatchCampaignAction('TEL2', 'p1', 'p1', { type: 'abandon_campaign' })
const optAfter = fs.existsSync(RUNS) ? fs.readFileSync(RUNS, 'utf8').split('\n').length : 0
check('opt-out run writes NO row', optAfter === optBefore)

// ── quick game path ──────────────────────────────────────────────────────────
const room = createRoom('q1', 'TeleHost')
joinRoom(room.code, 'q2', 'TeleFriend')
const sg = startGame(room.code, 'q1')
check('quick game starts', !sg.error)
const pc = playCards(room.code, 'q1', [0])   // a single card is always legal
check(`quick play ok${pc.error ? ` (${pc.error})` : ''}`, !pc.error)
const qBefore = fs.existsSync(QUICK) ? fs.readFileSync(QUICK, 'utf8').split('\n').length : 0
restartGame(room.code)
const qAfter = fs.existsSync(QUICK) ? fs.readFileSync(QUICK, 'utf8').split('\n').length : 0
check('quick CSV abandoned row appended', qAfter === qBefore + 1 || (qBefore === 0 && qAfter >= 2))
console.log(`  row: ${tail(QUICK)}`)

console.log(failed ? '\nTELEMETRY CHECK FAILED ✗' : '\nTelemetry check passed ✅')
process.exit(failed ? 1 : 0)

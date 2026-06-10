// Repro: "next fight" effects (preparations / Tower starter / Shrine blessing)
// with a non-fight event between activation and the fight.
// Run: npx tsx scripts/repro-prep.ts

import { createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyActivatePreparation, applyBreakCamp } from '../campaign/campaign'
import { loadKingdom } from '../campaign/store'
import type { CampaignState, RoadNode } from '../campaign/types'

const kingdom = loadKingdom()
const P1 = 's1', P2 = 's2'
const players = [{ id: P1, name: 'Gab' }, { id: P2, name: 'Jerome' }]

let failures = 0
function check(cond: unknown, msg: string) {
  console.log(`  ${cond ? '✓' : '❌'} ${msg}`)
  if (!cond) failures++
}

function mkNode(id: string, kind: RoadNode['kind'], layer: number, next: string[]): RoadNode {
  return { id, kind, layer, next, known: true, visited: false, rewardCT: 0, pressureCT: 0 }
}

function freshCampaign(): CampaignState {
  const c = createCampaign(players, 1, 'repro', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'surgeon')
  return c
}

// scenario: camp → <middle node> → skirmish, with a prep activated at camp
function runScenario(middle: 'shrine' | 'market' | 'tower' | 'none', prep = 'p-shield-drill') {
  const c = freshCampaign()
  // fabricate a tiny controlled map
  const nodes = middle === 'none'
    ? [mkNode('n0', 'camp', 0, ['n2']), mkNode('n2', 'skirmish', 1, [])]
    : [mkNode('n0', 'camp', 0, ['n1']), mkNode('n1', middle, 1, ['n2']), mkNode('n2', 'skirmish', 2, [])]
  c.map = { variant: 'repro', nodes, currentNodeId: 'n0' }
  c.phase = 'camp'
  c.preparations = [prep]

  let r = applyActivatePreparation(c, P1, prep, P1)
  check(!r.error, `activate ${prep}: ${r.error ?? 'ok'}`)
  check(c.activePreparations.includes(prep) || prep === 'p-brace-command', 'prep is armed')

  r = applyBreakCamp(c, P1, P1)
  check(!r.error, `break camp: ${r.error ?? 'ok'}`)
  console.log(`    phase after break camp: ${c.phase}`)

  if (middle !== 'none') {
    r = applyRoadChoose(c, P1, 'n1', P1)
    check(!r.error, `travel to ${middle}: ${r.error ?? 'ok'}`)
    console.log(`    phase at ${middle}: ${c.phase}, armed preps: [${c.activePreparations.join(', ')}]`)
    if (c.phase === 'landmark' && c.pendingChoice) {
      r = applyChoice(c, P1, c.pendingChoice.options[0]!.id, P1)
      check(!r.error, `resolve ${middle} choice: ${r.error ?? 'ok'}`)
    }
    console.log(`    after ${middle}: phase=${c.phase}, armed preps: [${c.activePreparations.join(', ')}]`)
  }

  r = applyRoadChoose(c, P1, 'n2', P1)
  check(!r.error, `travel to fight: ${r.error ?? 'ok'}`)
  check(c.phase === 'encounter', `fight started (phase=${c.phase})`)
  const shield = c.encounter?.currentEnemy?.shield ?? -1
  check(shield === 2, `Shield Drill fired: first enemy shield = ${shield} (want 2)`)
  check(c.activePreparations.length === 0, 'prep consumed')
}

console.log('Scenario A: camp → fight directly (control)')
runScenario('none')

console.log('Scenario B: camp → SHRINE → fight')
runScenario('shrine')

console.log('Scenario C: camp → MARKET (choice) → fight')
runScenario('market')

console.log('Scenario D: camp → TOWER (choice) → fight')
runScenario('tower')

console.log('Scenario F: camp → UNKNOWN (?) node that reveals as a fight')
{
  const c = freshCampaign()
  const hidden = mkNode('n2', 'skirmish', 1, [])
  hidden.known = false   // shows as '?' until committed
  c.map = { variant: 'repro', nodes: [mkNode('n0', 'camp', 0, ['n2']), hidden], currentNodeId: 'n0' }
  c.phase = 'camp'
  c.preparations = ['p-shield-drill']
  applyActivatePreparation(c, P1, 'p-shield-drill', P1)
  applyBreakCamp(c, P1, P1)
  const r = applyRoadChoose(c, P1, 'n2', P1)
  check(!r.error, `commit to ? node: ${r.error ?? 'ok'}`)
  check(c.phase === 'encounter', `? node revealed as fight (phase=${c.phase})`)
  const shield = c.encounter?.currentEnemy?.shield ?? -1
  check(shield === 2, `Shield Drill fired on ?-revealed fight: shield = ${shield} (want 2)`)
}

console.log('Scenario E: Brace Command at camp (choice prep), then fight')
{
  const c = freshCampaign()
  c.map = { variant: 'repro', nodes: [mkNode('n0', 'camp', 0, ['n2']), mkNode('n2', 'skirmish', 1, [])], currentNodeId: 'n0' }
  c.phase = 'camp'
  c.preparations = ['p-brace-command']
  let r = applyActivatePreparation(c, P1, 'p-brace-command', P1)
  check(!r.error, `activate brace command: ${r.error ?? 'ok'}`)
  console.log(`    phase: ${c.phase} (should be landmark with hero choice)`)
  if (c.pendingChoice) {
    r = applyChoice(c, P1, 'hero-1', P1)
    check(!r.error, `pick starter: ${r.error ?? 'ok'}`)
  }
  console.log(`    phase after pick: ${c.phase} (BUG if 'road' — should return to 'camp')`)
  check(c.phase === 'camp', `returns to camp after Brace Command pick (got ${c.phase})`)
  check(c.nextStarterIndex === 1, `starter armed: ${c.nextStarterIndex}`)
}

console.log(failures === 0 ? '\nAll repro checks passed — bug is elsewhere' : `\n${failures} failing check(s) — bug reproduced`)

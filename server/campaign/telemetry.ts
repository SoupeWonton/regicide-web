import type { CampaignState, EncounterState, RunTelemetry } from './types'
import { appendHumanRun } from '../human-runs'
import { EXPERIMENTS } from './experiments'

// Human-run telemetry observer. Hooked ONLY into sessions.dispatchCampaignAction
// (the human path) — simulators call the engine directly and never produce
// rows. Counters live on campaign.telemetry so they persist through saves, and
// field semantics deliberately mirror scripts/sim.ts RunRecord so human rows
// pool straight into analyze-province.ts:
//
//   npx tsx scripts/analyze-province.ts ../human-runs
//
// Observation model: snapshot tiny facts before the action (was a Jester about
// to be played? how many heroes alive?), then diff after it. Encounter starts
// and ends are detected with one-shot flags on the encounter itself, so a
// save/reload mid-fight never double-counts. Legacy death-vote retreats that
// consume the encounter inside the action may be missed — province mode (the
// live ruleset) has no such path.

function freshTele(): RunTelemetry {
  return {
    startedAt: new Date().toISOString(),
    encountersFought: 0, encountersWon: 0, retreats: 0, heroDeaths: 0,
    exactKills: 0, royalsBanished: 0, jesters: 0, yields: 0, itemsGained: 0,
    gatesCleared: 0, deckAtThrone: 0, royalsAtThrone: 0,
    itemsSeen: [], lossNodeKind: '', lossModifier: '', recorded: false,
  }
}

export function ensureTele(c: CampaignState): RunTelemetry {
  if (!c.telemetry) c.telemetry = freshTele()
  return c.telemetry
}

function ownedItemIds(c: CampaignState): string[] {
  const out: string[] = [...c.spells]
  for (const h of c.heroes) {
    out.push(...h.relicIds)
  }
  return out
}

export interface ActionSnapshot {
  jester: boolean
  yieldAction: boolean
  aliveBefore: number
}

export function observeBefore(
  c: CampaignState,
  playerId: string,
  action: { type: string; cardIndices?: number[] },
): ActionSnapshot {
  ensureTele(c)
  let jester = false
  if (action.type === 'play_cards' && c.encounter && Array.isArray(action.cardIndices)) {
    const hi = c.heroes.findIndex(h => h.playerId === playerId)
    const hand = c.encounter.hands[hi]
    jester = !!hand && action.cardIndices.some(i => hand[i]?.rank === 'Jo')
  }
  return {
    jester,
    yieldAction: action.type === 'yield_turn',
    aliveBefore: c.heroes.filter(h => h.alive).length,
  }
}

function observeEncounter(c: CampaignState, s: EncounterState, t: RunTelemetry) {
  if (!s.flags['teleSeen']) {
    s.flags['teleSeen'] = true
    t.encountersFought++
    // entering the Throne = boss fight with both prior gates cleared (sim semantics)
    if (s.tier === 'boss' && t.gatesCleared === 2) {
      t.deckAtThrone = s.tavern.length + s.discard.length + s.hands.reduce((a, h) => a + h.length, 0)
      t.royalsAtThrone = [...s.tavern, ...s.discard, ...s.hands.flat()]
        .filter(card => card.rank === 'J' || card.rank === 'Q' || card.rank === 'K').length
    }
  }
  if (s.outcome !== 'active' && !s.flags['teleEnded']) {
    s.flags['teleEnded'] = true
    const exacts = (s.flags['exactKills'] as number) ?? 0
    t.exactKills += exacts
    // road canon: every non-exact road defeat banished its royal
    if (s.tier !== 'boss') t.royalsBanished += Math.max(0, s.defeatedCount - exacts)
    if (s.outcome === 'won') {
      t.encountersWon++
      if (s.tier === 'boss') t.gatesCleared++
    }
    if (s.outcome === 'retreated') t.retreats++
    if (s.outcome === 'wiped') {
      t.lossNodeKind = c.map?.nodes.find(n => n.id === s.nodeId)?.kind ?? s.tier
      t.lossModifier = s.modifierId ?? ''
    }
  }
}

export function observeAfter(c: CampaignState, snap: ActionSnapshot) {
  const t = ensureTele(c)
  if (snap.jester) t.jesters++
  if (snap.yieldAction) t.yields++
  const deaths = snap.aliveBefore - c.heroes.filter(h => h.alive).length
  if (deaths > 0) t.heroDeaths += deaths
  for (const id of ownedItemIds(c))
    if (!t.itemsSeen.includes(id)) { t.itemsSeen.push(id); t.itemsGained++ }
  if (c.encounter) observeEncounter(c, c.encounter, t)
}

/** Append the CSV row once the run is over (or abandoned). Idempotent. */
export function recordRunEnd(c: CampaignState, resultOverride?: 'abandoned') {
  if (c.recordRun === false) return   // lobby opt-out
  const t = ensureTele(c)
  if (t.recorded) return
  const result = resultOverride ??
    (c.phase === 'campaign_won' ? 'won' : c.phase === 'campaign_lost' ? 'lost' : null)
  if (!result) return
  t.recorded = true
  const classes = c.heroes.map(h => h.classId).join('+')
  const path = c.map
    ? c.map.nodes.filter(n => n.visited).sort((a, b) => a.layer - b.layer).map(n => n.kind).join('>')
    : ''
  appendHumanRun('runs', {
    runId: c.id,
    name: c.name,
    seed: c.seed,
    playerCount: c.heroes.length,
    lineup: `human:${classes}`,
    personas: c.heroes.map(h => h.playerName).join('+'),
    result,
    chapterReached: c.chapter,
    encountersFought: t.encountersFought,
    encountersWon: t.encountersWon,
    retreats: t.retreats,
    heroDeaths: t.heroDeaths,
    exactKills: t.exactKills,
    royalsBanished: t.royalsBanished,
    jesters: t.jesters,
    yields: t.yields,
    itemsGained: t.itemsGained,
    gatesCleared: t.gatesCleared,
    deckAtThrone: t.deckAtThrone,
    royalsAtThrone: t.royalsAtThrone,
    path,
    itemsList: t.itemsSeen.join('|'),
    lossNodeKind: t.lossNodeKind,
    lossModifier: t.lossModifier,
    classes,
    provinceMode: 0,   // flag deleted at the V3.0 cutover (CSV column kept for continuity)
    startedAt: t.startedAt,
    endedAt: new Date().toISOString(),
  })
}

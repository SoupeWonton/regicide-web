import type { CampaignState, ClientCampaignState, KingdomState } from './types'
import { createCampaign, buildClientCampaign, startTutorial } from './campaign'
import { applyAction } from './dispatch'
import type { CampaignAction } from './dispatch'
import { advanceTutorialStep } from './tutorial'
import { loadKingdom, saveKingdom, saveCampaign, loadCampaign, listCampaigns, deleteCampaign, findResumableCampaign } from './store'
import type { SaveSummary } from './store'
import { observeBefore, observeAfter, recordRunEnd } from './telemetry'
import { traceAction } from './trace'

// Campaign session manager: binds room codes to live campaign states and
// dispatches actions. Persistence: every successful action writes the save.

const sessions = new Map<string, CampaignState>()   // room code → campaign
let kingdom: KingdomState = loadKingdom()

export function getKingdom(): KingdomState { return kingdom }
export function getSaves(): SaveSummary[] { return listCampaigns() }
export function getSession(code: string): CampaignState | undefined { return sessions.get(code) }

export function startCampaignSession(
  code: string,
  players: { id: string; name: string }[],
  chapter: number,
  seed: string | undefined,
  opts?: { runName?: string; record?: boolean },
): { error?: string } {
  const { campaign, error } = createCampaign(players, chapter, seed, kingdom, opts?.runName)
  if (error || !campaign) return { error }
  campaign.recordRun = opts?.record !== false
  sessions.set(code, campaign)
  saveCampaign(campaign)
  return {}
}

export function startTutorialSession(
  code: string,
  players: { id: string; name: string }[],
): { error?: string } {
  const { campaign, error } = createCampaign(players, 1, 'tutorial', kingdom)
  if (error || !campaign) return { error }
  campaign.recordRun = false   // the tutorial never writes telemetry
  startTutorial(campaign)
  sessions.set(code, campaign)
  saveCampaign(campaign)
  return {}
}

export function resumeCampaignSession(
  code: string,
  campaignId: string,
  players: { id: string; name: string }[],
): { error?: string } {
  const c = loadCampaign(campaignId)
  if (!c) return { error: 'Save not found.' }
  if (c.phase === 'campaign_lost') return { error: 'That lineage has ended.' }
  if (players.length !== c.heroes.length)
    return { error: `This save needs exactly ${c.heroes.length} player${c.heroes.length > 1 ? 's' : ''}.` }
  // re-bind heroes to the current sockets in join order; lineage names persist
  c.heroes.forEach((h, i) => {
    h.playerId = players[i]!.id
    h.playerName = players[i]!.name
  })
  if (c.classPicks) {
    const oldPicks = Object.values(c.classPicks)
    c.classPicks = Object.fromEntries(players.map((p, i) => [p.id, oldPicks[i] ?? null]))
  }
  sessions.set(code, c)
  c.log.unshift('💾 Campaign resumed.')
  saveCampaign(c)
  return {}
}

export function endSession(code: string) { sessions.delete(code) }

/**
 * Dev same-session reconnection helper: the newest still-live solo run for this
 * player (and its lineage name), so index.ts can rehydrate a run into its room
 * after a server restart. Returns undefined when there is nothing to restore.
 */
export function findResumableFor(playerId: string): { id: string; name: string } | undefined {
  const id = findResumableCampaign(playerId)
  if (!id) return undefined
  const c = loadCampaign(id)
  const hero = c?.heroes.find(h => h.playerId === playerId)
  return { id, name: hero?.playerName ?? 'Player' }
}

// The action union + engine dispatch table live in dispatch.ts (shared with
// the trace replayer — one table, no drift); re-exported so importers keep
// their `from './sessions'` path.
export type { CampaignAction } from './dispatch'

export function dispatchCampaignAction(
  code: string,
  playerId: string,
  hostId: string,
  action: CampaignAction,
): { error?: string } {
  const c = sessions.get(code)
  if (!c) return { error: 'No campaign in this room.' }

  // manual abandon keeps Kingdom unlocks (canon); save is removed.
  // Session-scoped (store + session deletion) so it stays out of applyAction.
  if (action.type === 'abandon_campaign') {
    if (playerId !== hostId) return { error: 'Only the host can abandon the lineage.' }
    recordRunEnd(c, 'abandoned')
    deleteCampaign(c.id)
    sessions.delete(code)
    return {}
  }

  const snap = observeBefore(c, playerId, action)
  const result = applyAction(c, playerId, hostId, action, kingdom, () => {
    // pre-checkEncounterEnd slot: these must see the outcome before it is consumed
    observeAfter(c, snap)
    if (c.tutorial && c.encounter) advanceTutorialStep(c, c.encounter)
    if (c.recordRun !== false) traceAction(c, 'human', c.id, action)
  })

  if (!result.error) {
    recordRunEnd(c)         // appends the human-runs CSV row on won/lost
    // refresh kingdom snapshot in case chapter completion updated it
    kingdom = loadKingdom()
    saveCampaign(c)
  }
  return result
}

export function buildCampaignStates(
  code: string,
  players: { id: string }[],
  hostId: string,
): Map<string, ClientCampaignState> {
  const out = new Map<string, ClientCampaignState>()
  const c = sessions.get(code)
  if (!c) return out
  for (const p of players) out.set(p.id, buildClientCampaign(c, p.id, hostId, kingdom))
  return out
}

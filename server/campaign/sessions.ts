import type { CampaignState, ClientCampaignState, KingdomState } from './types'
import {
  createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyDeathVote,
  applyBreakCamp, beginReplacement, applyFragmentStart,
  applyContinueChapter, buildClientCampaign, checkEncounterEnd,
} from './campaign'
import {
  applyEncounterPlay, applyEncounterDiscard, applyEncounterYield,
  applyEncounterChooseNext, applyCastSpell, applyActivateRelic, applyArmWager,
  applySetupReorder, applyKeepDrawn, applyGraftSelect,
} from './encounter'
import { loadKingdom, saveKingdom, saveCampaign, loadCampaign, listCampaigns, deleteCampaign } from './store'
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

export type CampaignAction =
  | { type: 'pick_class'; classId: string }
  | { type: 'road_choose'; nodeId: string }
  | { type: 'choice_pick'; optionId: string }
  | { type: 'setup_reorder'; order: number[] }
  | { type: 'play_cards'; cardIndices: number[] }
  | { type: 'discard_damage'; cardIndices: number[] }
  | { type: 'yield_turn' }
  | { type: 'choose_next'; targetIndex: number; keepTurn?: boolean }
  | { type: 'cast_spell'; spellId: string }
  | { type: 'activate_relic'; targetIndex?: number; relicId?: string }
  | { type: 'arm_wager' }
  | { type: 'keep_drawn'; keepIndices: number[] }   // ascending-deck: overdraw selection
  | { type: 'graft_select'; cardIndex: number; mode: 'value' | 'suit' }   // ascending-deck: redundant-kill graft
  | { type: 'apply_fragment' }                       // fragment track: spend 2 → apply a C-tier token
  | { type: 'death_vote'; vote: string }
  | { type: 'begin_replacement' }
  | { type: 'break_camp' }
  | { type: 'continue_chapter' }
  | { type: 'abandon_campaign' }
  | { type: 'debug_force'; encounterId?: string; rewardId?: string }

export function dispatchCampaignAction(
  code: string,
  playerId: string,
  hostId: string,
  action: CampaignAction,
): { error?: string } {
  const c = sessions.get(code)
  if (!c) return { error: 'No campaign in this room.' }

  const snap = observeBefore(c, playerId, action)
  let result: { error?: string }
  switch (action.type) {
    case 'pick_class': result = applyClassPick(c, playerId, action.classId as never); break
    case 'road_choose': result = applyRoadChoose(c, playerId, action.nodeId, hostId); break
    case 'choice_pick': result = applyChoice(c, playerId, action.optionId, hostId); break
    case 'setup_reorder': result = applySetupReorder(c, playerId, action.order); break
    case 'play_cards': result = applyEncounterPlay(c, playerId, action.cardIndices); break
    case 'discard_damage': result = applyEncounterDiscard(c, playerId, action.cardIndices); break
    case 'yield_turn': result = applyEncounterYield(c, playerId); break
    case 'choose_next': result = applyEncounterChooseNext(c, playerId, action.targetIndex, !!action.keepTurn); break
    case 'cast_spell': result = applyCastSpell(c, playerId, action.spellId); break
    case 'activate_relic': result = applyActivateRelic(c, playerId, action.targetIndex, action.relicId); break
    case 'arm_wager': result = applyArmWager(c, playerId); break
    case 'keep_drawn': result = applyKeepDrawn(c, playerId, action.keepIndices); break
    case 'graft_select': result = applyGraftSelect(c, playerId, action.cardIndex, action.mode); break
    case 'apply_fragment': result = applyFragmentStart(c, playerId, hostId); break
    case 'death_vote': result = applyDeathVote(c, playerId, action.vote); break
    case 'begin_replacement': result = beginReplacement(c, kingdom); break
    case 'break_camp': result = applyBreakCamp(c, playerId, hostId); break
    case 'continue_chapter': result = applyContinueChapter(c, playerId, hostId); break
    case 'abandon_campaign': {
      // manual abandon keeps Kingdom unlocks (canon); save is removed
      if (playerId !== hostId) { result = { error: 'Only the host can abandon the lineage.' }; break }
      recordRunEnd(c, 'abandoned')
      deleteCampaign(c.id)
      sessions.delete(code)
      return {}
    }
    case 'debug_force': {
      if (playerId !== hostId) { result = { error: 'Host only.' }; break }
      c.debug.forceNextEncounterId = action.encounterId
      c.debug.forceNextRewardId = action.rewardId
      result = {}
      break
    }
    default: result = { error: 'Unknown action.' }
  }

  if (!result.error) {
    observeAfter(c, snap)   // must see the encounter outcome before it is consumed
    if (c.recordRun !== false) traceAction(c, 'human', c.id, action)
    if (c.encounter && c.encounter.outcome !== 'active') checkEncounterEnd(c, kingdom)
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

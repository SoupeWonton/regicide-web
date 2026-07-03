// Pure action dispatch — THE single action.type → engine-function table.
// Shared by the live session layer (sessions.ts, which adds persistence +
// telemetry side effects around it) and the trace replayer (scripts/replay.ts,
// the bug oracle). Keeping one table means the replayer can never drift from
// what the server actually does.

import type { CampaignState, KingdomState } from './types'
import {
  applyClassPick, applyRoadChoose, applyChoice, applyDeathVote,
  applyBreakCamp, beginReplacement, applyBraceletPlace, applyEquipRelic,
  applyContinueChapter, checkEncounterEnd,
} from './campaign'
import {
  applyEncounterPlay, applyEncounterDiscard, applyEncounterYield,
  applyEncounterChooseNext, applyCastSpell, applyActivateRelic, applyArmWager,
  applySetupReorder, applyKeepDrawn, applyGraftSelect, applyStaffUse,
} from './encounter'

export type CampaignAction =
  | { type: 'pick_class'; classId: string; staffId?: string }   // V3 §2: class + Staff pick
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
  | { type: 'staff_use'; cardIndex?: number }        // V3 §2: activated-Staff use (slice 4)
  | { type: 'bracelet_place'; suit: string; crystal?: 'fragment' | 'half' }  // V3 §6: arm a fragment/Half onto a gauntlet suit
  | { type: 'equip_relic'; slot: string; relicId: string | null }   // V3 §7: bag ↔ slot swap
  | { type: 'death_vote'; vote: string }
  | { type: 'begin_replacement' }
  | { type: 'break_camp' }
  | { type: 'continue_chapter' }
  | { type: 'abandon_campaign' }                     // handled in sessions.ts (store/session side effects)
  | { type: 'debug_force'; encounterId?: string; rewardId?: string }

/** Where each action's engine handler lives — powers the replay debug packet
 * ("read THIS one file"). Keep in sync with the imports above. */
export const HANDLER_LOCATIONS: Record<CampaignAction['type'], string> = {
  pick_class: 'server/campaign/campaign.ts applyClassPick',
  road_choose: 'server/campaign/campaign.ts applyRoadChoose',
  choice_pick: 'server/campaign/campaign.ts applyChoice',
  setup_reorder: 'server/campaign/encounter.ts applySetupReorder',
  play_cards: 'server/campaign/encounter.ts applyEncounterPlay',
  discard_damage: 'server/campaign/encounter.ts applyEncounterDiscard',
  yield_turn: 'server/campaign/encounter.ts applyEncounterYield',
  choose_next: 'server/campaign/encounter.ts applyEncounterChooseNext',
  cast_spell: 'server/campaign/encounter.ts applyCastSpell',
  activate_relic: 'server/campaign/encounter.ts applyActivateRelic',
  arm_wager: 'server/campaign/encounter.ts applyArmWager',
  keep_drawn: 'server/campaign/encounter.ts applyKeepDrawn',
  graft_select: 'server/campaign/encounter.ts applyGraftSelect',
  staff_use: 'server/campaign/encounter.ts applyStaffUse',
  bracelet_place: 'server/campaign/campaign.ts applyBraceletPlace',
  equip_relic: 'server/campaign/campaign.ts applyEquipRelic',
  death_vote: 'server/campaign/campaign.ts applyDeathVote',
  begin_replacement: 'server/campaign/campaign.ts beginReplacement',
  break_camp: 'server/campaign/campaign.ts applyBreakCamp',
  continue_chapter: 'server/campaign/campaign.ts applyContinueChapter',
  abandon_campaign: 'server/campaign/sessions.ts dispatchCampaignAction',
  debug_force: 'server/campaign/dispatch.ts applyAction',
}

/**
 * Apply one action to campaign state — the complete state evolution for a
 * turn, INCLUDING the post-action checkEncounterEnd settlement.
 *
 * `beforeEnd` runs after a successful action but BEFORE checkEncounterEnd
 * consumes a finished encounter — the slot where the session layer records
 * telemetry + the trace (they must see the outcome), and where the replayer
 * projects its comparison view (so it sees exactly what the trace saw).
 */
export function applyAction(
  c: CampaignState,
  playerId: string,
  hostId: string,
  action: CampaignAction,
  kingdom: KingdomState,
  beforeEnd?: () => void,
): { error?: string } {
  let result: { error?: string }
  switch (action.type) {
    case 'pick_class': result = applyClassPick(c, playerId, action.classId as never, action.staffId); break
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
    case 'staff_use': result = applyStaffUse(c, playerId, action.cardIndex); break
    case 'bracelet_place': result = applyBraceletPlace(c, playerId, action.suit, action.crystal); break
    case 'equip_relic': result = applyEquipRelic(c, playerId, action.slot, action.relicId); break
    case 'death_vote': result = applyDeathVote(c, playerId, action.vote); break
    case 'begin_replacement': result = beginReplacement(c, kingdom); break
    case 'break_camp': result = applyBreakCamp(c, playerId, hostId); break
    case 'continue_chapter': result = applyContinueChapter(c, playerId, hostId); break
    case 'abandon_campaign': result = { error: 'abandon_campaign is session-scoped (sessions.ts).' }; break
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
    beforeEnd?.()
    if (c.encounter && c.encounter.outcome !== 'active') checkEncounterEnd(c, kingdom)
  }
  return result
}

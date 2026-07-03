// Engine-state invariants (the bug-oracle's tripwires). Pure + cheap — meant
// to run after EVERY action in sims (scripts/sim.ts afterAction) and smoke
// (scripts/smoke.ts step). Returns terse violation strings ([] = healthy).
//
// Call AFTER checkEncounterEnd has settled the state (both call sites do) —
// transient mid-resolution shapes (outcome set but encounter not yet reclaimed)
// are legal and not checked here.

import type { CampaignState } from './types'
import type { Card } from '../types'
import { maxHandSize } from './encounter'

export function checkInvariants(c: CampaignState): string[] {
  const v: string[] = []
  const s = c.encounter

  // 1 — RNG state is a serializable uint32 (a NaN/float here poisons every draw)
  if (!Number.isInteger(c.rngState) || c.rngState < 0 || c.rngState >= 2 ** 32)
    v.push(`rng-state:${c.rngState}`)

  // 2 — no card exists in two zones at once (the conservation check that
  // catches dupes without fighting legit total changes: exile, grafts, rebuilds)
  const zones: [string, Card[]][] = []
  if (s && s.outcome === 'active') {
    s.hands.forEach((h, i) => zones.push([`enc.hands[${i}]`, h]))
    zones.push(['enc.tavern', s.tavern], ['enc.discard', s.discard])
    if (s.drawPool) zones.push(['enc.drawPool', s.drawPool])
  } else if (c.deck) {
    c.deck.hands.forEach((h, i) => zones.push([`deck.hands[${i}]`, h]))
    zones.push(['deck.tavern', c.deck.tavern], ['deck.discard', c.deck.discard])
  }
  const seen = new Map<string, string>()
  for (const [zone, cards] of zones) {
    for (const card of cards) {
      const prev = seen.get(card.id)
      if (prev !== undefined) v.push(`dup-card:${card.id} in ${prev}+${zone}`)
      else seen.set(card.id, zone)
    }
  }

  // 3 — hands array parallels heroes; caps enforced only in settled fight
  // phases (draw_select holds the overdraw pool aside; road hands may legally
  // exceed the base cap after a +cap fight ends)
  const hands = s && s.outcome === 'active' ? s.hands : c.deck?.hands
  if (hands && hands.length !== c.heroes.length)
    v.push(`hands-shape:${hands.length}!=${c.heroes.length}`)
  if (s && s.outcome === 'active' && ['play', 'discard', 'choose_next', 'setup'].includes(s.turnPhase)) {
    s.hands.forEach((h, i) => {
      const cap = maxHandSize(c, i)
      if (h.length > cap) v.push(`hand-over-cap:hero${i}:${h.length}>${cap}`)
    })
  }

  // 4 — the actor is a live hero with sane indices (a dead hero holding the
  // turn is the classic soft-lock)
  if (s && s.outcome === 'active' && c.phase === 'encounter') {
    if (s.currentPlayerIndex < 0 || s.currentPlayerIndex >= c.heroes.length)
      v.push(`actor-range:${s.currentPlayerIndex}`)
    else if (!c.heroes[s.currentPlayerIndex]!.alive)
      v.push(`dead-actor:hero${s.currentPlayerIndex}`)
    if (s.nextPlayerIndex < 0 || s.nextPlayerIndex >= c.heroes.length)
      v.push(`next-range:${s.nextPlayerIndex}`)
  }

  // 5 — phase/state coherence
  if (c.phase === 'encounter' && !s) v.push('phase-encounter-no-state')
  if (s && s.outcome === 'active' && c.deck !== null) v.push('deck-live-during-fight')
  if (!s && !c.deck && !['class_select', 'campaign_won', 'campaign_lost', 'tutorial_done'].includes(c.phase))
    v.push(`no-deck:phase=${c.phase}`)
  if (c.phase === 'landmark' && !c.pendingChoice) v.push('landmark-no-choice')
  if (c.phase === 'death_vote' && !c.deathVote) v.push('death-vote-no-state')
  if (s && s.turnPhase === 'draw_select' && !s.drawPool) v.push('draw-select-no-pool')
  if (s && s.turnPhase === 'graft_select' && !s.pendingGraft) v.push('graft-select-no-pending')

  return v
}

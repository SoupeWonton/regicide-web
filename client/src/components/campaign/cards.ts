import type { Card } from '../../types'

export function cardValue(rank: string): number {
  if (rank === 'A') return 1
  if (rank === 'Jo') return 0
  if (rank === 'J') return 10
  if (rank === 'Q') return 15
  if (rank === 'K') return 20
  return parseInt(rank) || 0
}

export function suitSymbol(suit: string): string {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit] ?? suit
}

export function suitColor(suit: string): string {
  return suit === 'H' || suit === 'D' ? 'text-red-400' : 'text-base-content'
}

export function cardLabel(c: Card): string {
  if (c.rank === 'Jo') return '🃏'
  return `${c.rank}${suitSymbol(c.suit)}`
}

// Class and node glyphs moved from emoji to the game-icons.net SVG set —
// render them with <GameIcon :name="classId | nodeKind" /> (src/gameIcons.ts).

export const NODE_LABELS: Record<string, string> = {
  start: 'Trailhead', camp: 'Camp', boss: 'The Castle', skirmish: 'Skirmish',
  veteran: 'Veterans', elite: 'Elite', forge: 'Forge', abbey: 'Abbey',
  market: 'Market', tower: 'Tower', shrine: 'Shrine', lair: 'Lair',
  event: 'Event', unknown: '???',
}

export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: 'Where the lineage set out.',
  camp: 'Rest: the deck is reshuffled, hands redrawn to full. Activate preparations, replace fallen heroes.',
  boss: 'The full castle — 12 royals. No retreat once a hero falls.',
  skirmish: 'A light fight (2 Jacks) with a minor twist. Your hand and deck carry over from the road.',
  veteran: 'A harder fight (Jacks + a Queen) with a nastier twist.',
  elite: 'A dangerous fight (Jack, Queen, King) with a punishing rule.',
  forge: 'The Forge offers its work — choose a relic for a hero.',
  abbey: 'The Abbey shares its rites — choose a spell for the team.',
  market: 'The Market trades in readiness — choose a preparation.',
  tower: 'The Tower grants initiative — pick who starts the next fight, or study the boss for intel.',
  shrine: 'A blessing: next encounter everyone draws 1 and the hand cap is +1.',
  lair: 'An elite gate guards a rare prize. High risk, rare reward.',
  event: 'A strange happening on the road. A choice with real consequences — fortune, bargains, or chaos.',
  unknown: 'Unscouted. You will only know what it is once you commit.',
}

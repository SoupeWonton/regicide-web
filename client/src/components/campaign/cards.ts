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

export const CLASS_ICONS: Record<string, string> = {
  sentinel: '🛡', quartermaster: '📦', surgeon: '⚕️', executioner: '🪓',
  commander: '⚜️', warden: '🏮', gambler: '🎲', exile: '🔥', oracle: '🔮',
}

export const NODE_ICONS: Record<string, string> = {
  start: '🏁', camp: '🏕', boss: '👑', skirmish: '⚔️', veteran: '🗡',
  elite: '💀', forge: '⚒️', abbey: '⛪', market: '🛒', tower: '🗼',
  shrine: '⛩', lair: '🕸', unknown: '❓',
}

export const NODE_LABELS: Record<string, string> = {
  start: 'Trailhead', camp: 'Camp', boss: 'The Castle', skirmish: 'Skirmish',
  veteran: 'Veterans', elite: 'Elite', forge: 'Forge', abbey: 'Abbey',
  market: 'Market', tower: 'Tower', shrine: 'Shrine', lair: 'Lair', unknown: '???',
}

import type { Card, Suit, Rank } from './types'

const SUITS: Suit[] = ['C', 'D', 'H', 'S']
const PLAYER_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const ENEMY_RANKS: Rank[] = ['J', 'Q', 'K']

let _uid = 0
function uid() { return String(++_uid) }

export function cardValue(rank: Rank): number {
  if (rank === 'A')  return 1
  if (rank === 'Jo') return 0
  if (rank === 'J')  return 10
  if (rank === 'Q')  return 15
  if (rank === 'K')  return 20
  return parseInt(rank)
}

export function enemyStats(rank: 'J' | 'Q' | 'K'): { hp: number; attack: number } {
  if (rank === 'J') return { hp: 20, attack: 10 }
  if (rank === 'Q') return { hp: 30, attack: 15 }
  return { hp: 40, attack: 20 }
}

/** Returns true for the player number ranks (2-10) used in Continent-1 recruit fights. */
export function isNumberRank(rank: string): rank is '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' {
  return PLAYER_RANKS.includes(rank as Rank) && rank !== 'A'
}

/**
 * Stats for number-card enemies used in Continent-1 recruit fights.
 * Kept entirely separate from enemyStats (which is used by game.ts) so the
 * base quick game is never touched.
 * Stat line: HP = rank value * 3, ATK = Math.ceil(rank value * 0.8).
 */
export function numberEnemyStats(rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'): { hp: number; attack: number } {
  const v = parseInt(rank)
  // Continent-1 ramp: HP scales with rank, but ATTACK is gentle early — a 20-card
  // A–5 deck must survive a fight where one suit lever is denied by immunity.
  return { hp: v * 3, attack: Math.max(2, Math.round(v * 0.55)) }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function buildPlayerDeck(jesterCount: number): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS)
    for (const rank of PLAYER_RANKS)
      cards.push({ suit, rank, id: uid() })
  for (let i = 0; i < jesterCount; i++)
    cards.push({ suit: 'C', rank: 'Jo', id: uid() }) // suit irrelevant for jesters
  return shuffle(cards)
}

// Jacks on top, Queens middle, Kings on bottom (face down, top = first drawn)
export function buildEnemyDeck(): Card[] {
  const jacks  = shuffle(SUITS.map(suit => ({ suit, rank: 'J' as Rank, id: uid() })))
  const queens = shuffle(SUITS.map(suit => ({ suit, rank: 'Q' as Rank, id: uid() })))
  const kings  = shuffle(SUITS.map(suit => ({ suit, rank: 'K' as Rank, id: uid() })))
  return [...jacks, ...queens, ...kings]
}

export function handSize(playerCount: number): number {
  return { 1: 8, 2: 7, 3: 6, 4: 5 }[playerCount] ?? 5
}

export function jesterCount(playerCount: number): number {
  return { 1: 0, 2: 0, 3: 1, 4: 2 }[playerCount] ?? 0
}

export function suitSymbol(suit: Suit): string {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit]
}

export function cardLabel(card: Card): string {
  if (card.rank === 'Jo') return '🃏'
  return `${card.rank}${suitSymbol(card.suit)}`
}

// Validate whether a set of cards is a legal combo to play together
export function validateCombo(cards: Card[]): string | null {
  if (cards.length === 0) return 'No cards selected.'
  if (cards.length === 1) return null // always valid

  // Jesters can only be played alone
  if (cards.some(c => c.rank === 'Jo')) return 'Jesters must be played alone.'

  const aces    = cards.filter(c => c.rank === 'A')
  const nonAces = cards.filter(c => c.rank !== 'A')

  // Ace + exactly one other card (any suit)
  if (aces.length === 1 && nonAces.length === 1) return null

  // Multiple aces not allowed in a combo
  if (aces.length > 1) return 'Can only include one Ace in a combo.'

  // Same rank, total value ≤ 10 (no aces)
  const ranks = new Set(cards.map(c => c.rank))
  if (ranks.size > 1) return 'Cards must be the same rank (or use an Ace).'

  const total = cards.reduce((s, c) => s + cardValue(c.rank), 0)
  if (total > 10) return `Combo total (${total}) exceeds 10.`

  return null
}

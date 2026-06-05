import type { Card, Suit, Rank } from './types'

const SUITS: Suit[] = ['C', 'D', 'H', 'S']
const PLAYER_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const ENEMY_RANKS: Rank[] = ['J', 'Q', 'K']

export function cardValue(rank: Rank): number {
  if (rank === 'A') return 1
  if (rank === 'J') return 10
  if (rank === 'Q') return 15
  if (rank === 'K') return 20
  return parseInt(rank)
}

export function enemyStats(rank: 'J' | 'Q' | 'K'): { hp: number; attack: number } {
  if (rank === 'J') return { hp: 20, attack: 10 }
  if (rank === 'Q') return { hp: 30, attack: 15 }
  return { hp: 40, attack: 20 }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function buildPlayerDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS)
    for (const rank of PLAYER_RANKS)
      cards.push({ suit, rank })
  return shuffle(cards)
}

// Enemy deck: shuffled Jacks on top, then Queens, then Kings
export function buildEnemyDeck(): Card[] {
  const jacks  = shuffle(SUITS.map(suit => ({ suit, rank: 'J' as Rank })))
  const queens = shuffle(SUITS.map(suit => ({ suit, rank: 'Q' as Rank })))
  const kings  = shuffle(SUITS.map(suit => ({ suit, rank: 'K' as Rank })))
  return [...jacks, ...queens, ...kings]
}

export function handSize(playerCount: number): number {
  const sizes: Record<number, number> = { 1: 8, 2: 7, 3: 6, 4: 5 }
  return sizes[playerCount] ?? 5
}

export function suitName(suit: Suit): string {
  return { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' }[suit]
}

export function rankDisplay(rank: Rank): string {
  return rank
}

export function cardLabel(card: Card): string {
  const suitSymbol = { C: '♣', D: '♦', H: '♥', S: '♠' }[card.suit]
  return `${card.rank}${suitSymbol}`
}

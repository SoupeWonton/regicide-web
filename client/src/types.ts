// Mirrors server/types.ts — keep in sync

export type Suit = 'C' | 'D' | 'H' | 'S'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card { suit: Suit; rank: Rank }

export interface Enemy {
  card: Card
  hp: number
  maxHp: number
  attack: number
  shieldThisTurn: number
}

export interface ClientPlayer {
  id: string
  name: string
  handSize: number
  hand?: Card[]
  isCurrentPlayer: boolean
  connected: boolean
}

export type GamePhase = 'lobby' | 'playing' | 'won' | 'lost'
export type TurnPhase = 'play' | 'discard'

export interface ClientGameState {
  phase: GamePhase
  turnPhase: TurnPhase
  players: ClientPlayer[]
  currentPlayerIndex: number
  enemiesRemaining: number
  currentEnemy: Enemy | null
  defeatedCount: number
  tavernCount: number
  drawCount: number
  discardNeeded: number
  log: string[]
  lastPlayed: Card[]
  myIndex: number
}

export interface RoomInfo {
  code: string
  hostId: string
  players: { id: string; name: string; ready: boolean }[]
}

export type Suit = 'C' | 'D' | 'H' | 'S'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Jo'

export interface Card { suit: Suit; rank: Rank; id: string }

export interface Enemy {
  card: Card
  hp: number
  maxHp: number
  attack: number
  shield: number
  immunityNullified: boolean
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
export type TurnPhase = 'play' | 'discard' | 'choose_next'

export interface ClientGameState {
  phase: GamePhase
  turnPhase: TurnPhase
  players: ClientPlayer[]
  currentPlayerIndex: number
  nextPlayerIndex: number
  enemiesRemaining: number
  currentEnemy: Enemy | null
  defeatedCount: number
  discardCount: number   // discard pile (played player cards)
  tavernCount: number    // tavern = draw deck
  discardNeeded: number  // minimum total value to pay as damage
  log: string[]
  lastPlayed: Card[]
  myIndex: number
}

export interface RoomInfo {
  code: string
  hostId: string
  players: { id: string; name: string; ready: boolean }[]
}

export type Suit = 'C' | 'D' | 'H' | 'S'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Jo'

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export interface Enemy {
  card: Card
  hp: number
  maxHp: number
  attack: number
  shield: number
  immunityNullified: boolean
}

export interface ServerPlayer {
  id: string
  name: string
  hand: Card[]
  connected: boolean
}

export type GamePhase = 'lobby' | 'playing' | 'won' | 'lost'
export type TurnPhase = 'play' | 'discard' | 'choose_next'

export interface GameState {
  phase: GamePhase
  turnPhase: TurnPhase
  players: ServerPlayer[]
  // optional class layer (balance-testing): campaign tier-1 core abilities in
  // the quick game. Undefined → pure base rules (quick game is unchanged).
  classIds?: (string | null)[]      // parallel to players
  abilityFlags?: Record<string, boolean>  // once-per-enemy trackers, reset on reveal
  currentPlayerIndex: number
  nextPlayerIndex: number
  enemyDeck: Card[]       // castle deck (face cards not yet revealed)
  currentEnemy: Enemy | null
  defeatedEnemies: Card[]
  discard: Card[]         // played player cards (Hearts recovers from here)
  tavern: Card[]          // the draw deck players draw from
  discardNeeded: number   // minimum total value player must pay as damage
  log: string[]
  lastPlayed: Card[]
}

export interface ClientPlayer {
  id: string
  name: string
  handSize: number
  hand?: Card[]
  isCurrentPlayer: boolean
  connected: boolean
}

export interface ClientGameState {
  phase: GamePhase
  turnPhase: TurnPhase
  players: ClientPlayer[]
  currentPlayerIndex: number
  nextPlayerIndex: number
  enemiesRemaining: number
  currentEnemy: Enemy | null
  defeatedCount: number
  discardCount: number    // discard pile size
  tavernCount: number     // draw deck size
  discardNeeded: number
  log: string[]
  lastPlayed: Card[]
  myIndex: number
  classIds?: (string | null)[]
  myClassId?: string | null
}

export interface RoomInfo {
  code: string
  hostId: string
  players: { id: string; name: string; ready: boolean }[]
  classSelections?: Record<string, string>  // playerId → classId
  selecting?: boolean                         // quick-game class-selection step is open
}

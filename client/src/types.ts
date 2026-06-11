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

// ── Campaign mode ────────────────────────────────────────────────────────────

export type CampaignPhase =
  | 'class_select' | 'road' | 'landmark' | 'encounter' | 'death_vote'
  | 'camp' | 'replace_hero' | 'memory_draft' | 'chapter_complete'
  | 'campaign_won' | 'campaign_lost'

export interface ItemView { id: string; name: string; text: string; tier: 'standard' | 'rare' }

export interface ClientHero {
  playerId: string
  playerName: string
  classId: string
  picked: boolean
  className: string
  abilityText: string
  alive: boolean
  memories: { id: string; name: string; text: string }[]
  relic: ItemView | null
  handSize: number
  isCurrentPlayer: boolean
}

export interface ClientRoadNode {
  id: string
  kind: string
  layer: number
  next: string[]
  visited: boolean
  current: boolean
  reachable: boolean
}

export interface ClientEncounterState {
  tier: 'skirmish' | 'veteran' | 'elite' | 'boss'
  modifier: { id: string; name: string; text: string } | null
  bossModifier: { id: string; name: string; text: string } | null
  preps: { id: string; name: string; text: string }[]
  turnPhase: string
  currentPlayerIndex: number
  enemiesRemaining: number
  totalEnemies: number
  defeatedCount: number
  currentEnemy: Enemy | null
  discardCount: number
  tavernCount: number
  discardNeeded: number
  lastPlayed: Card[]
  outcome: string
  myHand: Card[]
  setupPeek: { mine: boolean; cards: Card[]; canReorder: boolean; source: string } | null
  pendingChooseNext: boolean
  wagerArmed: boolean
  canWager: boolean
  myRelicActivatable: boolean
  myBoosts: SuitBoosts
  siegeRank: 'J' | 'Q' | 'K' | null
  tavernCards: Card[]
  discardCards: Card[]
  events: EncounterEvent[]
  eventSeq: number
}

export interface SuitBoosts {
  S: number
  D: number
  H: number
  dmgPlus: number
  dmgMult: number
  execReady: boolean
  dCap: number | null
  hHalf: boolean
}

export interface EncounterEvent {
  kind: string
  text: string
  tone: 'gold' | 'blood' | 'info' | 'plain'
  big?: boolean
}

export interface PendingChoiceView {
  kind: string
  forPlayerId: string | null
  prompt: string
  options: { id: string; label: string; detail?: string }[]
  mine: boolean
  teamVote: boolean
  myVote: string | null
  votesIn: number
  votesNeeded: number
}

export interface ClientCampaignState {
  id: string
  name: string
  seed: string
  phase: CampaignPhase
  chapter: number
  heroes: ClientHero[]
  myHeroIndex: number
  myHand: Card[]
  isHost: boolean
  map: { nodes: ClientRoadNode[]; currentNodeId: string } | null
  encounter: ClientEncounterState | null
  lastFight: { tier: string; rank: 'J' | 'Q' | 'K' | null; handSizes: number[]; tavern: number; discard: number } | null
  spells: ItemView[]
  preparations: ItemView[]
  activePreparations: ItemView[]
  pendingChoice: PendingChoiceView | null
  rewardDraw: { seq: number; options: { id: string; label: string; detail?: string }[]; winnerId: string; tie: boolean } | null
  deathVote: { deadHeroName: string; options: string[]; votes: Record<string, string>; myVote: string | null; isBoss: boolean } | null
  memoryDraft: { myOptions: ItemView[] | null; waitingOn: string[] } | null
  exileAvailable: boolean
  kingdom: { unlockedChapters: number[]; unlockedClasses: string[]; specializationsUnlocked: boolean }
  log: string[]
}

export interface SaveSummary {
  id: string
  name: string
  chapter: number
  phase: string
  heroes: { name: string; classId: string; alive: boolean }[]
  createdAt: string
}

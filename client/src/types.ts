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
  | 'camp' | 'replace_hero' | 'chapter_complete'
  | 'campaign_won' | 'campaign_lost' | 'tutorial_done'

export interface ItemView { id: string; name: string; text: string; tier: 'standard' | 'rare' }

export interface ClientHero {
  playerId: string
  playerName: string
  classId: string
  picked: boolean
  className: string
  abilityText: string
  alive: boolean
  relics: ItemView[]
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
  activatableRelics: string[]
  myBoosts: SuitBoosts
  siegeRank: 'J' | 'Q' | 'K' | null
  tavernCards: Card[]
  discardCards: Card[]
  events: EncounterEvent[]
  eventSeq: number
  // ascending-deck: overdraw pool waiting for player keep-selection
  drawPool?: Card[]
  // how many of the drawPool the viewing hero may keep
  drawSelectKeep?: number
  // ascending-deck: redundant exact-kill graft picker — the slain card's suit
  // (offered as the +suit option; +value is always a flat +1). Present only for
  // the hero choosing, during graft_select.
  graftSelect?: { suit: string }
  // scripted tutorial: current guide beat (line + which hand card to highlight)
  tutorialBeat?: { line: string; highlightCardId?: string; step: number; total: number }
  // scripted tutorial: render the current enemy as a Training Dummy (no suit)
  tutorialDummy?: boolean
  // scripted tutorial: fodder card ids to flash during discard-to-pay
  tutorialDiscard?: string[]
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`)
  cardTokens?: Record<string, ClientToken[]>
}

// ascending-deck Step 5: a token projected for display on a card face
export interface ClientToken {
  defId: string
  name: string
  short: string
  sym: string
  kind: 'value' | 'suit' | 'lever' | 'keyword'
  suit?: string
  spend: number
  hold: number
  suitOp?: 'add' | 'replace'
  lever?: 'shield' | 'draw' | 'recover' | 'edge'
  keyword?: 'scry' | 'mark' | 'banner' | 'bloodprice'
  tone: 'good' | 'bad' | 'neutral'
  text: string
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
  comboMax: number   // max combo total — Combat Cache raises it 10→12
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
  // persistent deck snapshot for the map's deck/discard viewer (sorted; order secret)
  deckTavern: Card[]
  deckDiscard: Card[]
  isHost: boolean
  map: { nodes: ClientRoadNode[]; currentNodeId: string } | null
  encounter: ClientEncounterState | null
  lastFight: { tier: string; rank: 'J' | 'Q' | 'K' | null; handSizes: number[]; tavern: number; discard: number } | null
  spells: ItemView[]
  pendingChoice: PendingChoiceView | null
  rewardDraw: { seq: number; options: { id: string; label: string; detail?: string }[]; winnerId: string; tie: boolean } | null
  deathVote: { deadHeroName: string; options: string[]; votes: Record<string, string>; myVote: string | null; isBoss: boolean } | null
  kingdom: { unlockedChapters: number[]; unlockedClasses: string[]; specializationsUnlocked: boolean }
  log: string[]
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`)
  cardTokens?: Record<string, ClientToken[]>
  // ascending-deck: unspent forge budget
  tokenBudget?: number
  // fragment track: token fragments held (2 → apply a C-tier token on the road)
  tokenFragments?: number
  // ascending-deck mode active (drives token UI: class-select stamps, card badges)
  ascendingDeck?: boolean
}

export interface SaveSummary {
  id: string
  name: string
  chapter: number
  phase: string
  heroes: { name: string; classId: string; alive: boolean }[]
  createdAt: string
}

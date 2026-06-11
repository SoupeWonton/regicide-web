import type { Card, Enemy, TurnPhase } from '../types'

// ── Content identifiers ──────────────────────────────────────────────────────

export type ClassId =
  | 'sentinel' | 'quartermaster' | 'surgeon' | 'executioner'   // Tier 1
  | 'commander' | 'warden'                                     // Tier 2
  | 'gambler' | 'exile' | 'oracle'                             // Tier 3

export type CtCategory = 'Shield' | 'Access' | 'Recovery' | 'Initiative' | 'Consistency'

export type ItemKind = 'relic' | 'spell' | 'preparation' | 'memory'
export type ItemTier = 'standard' | 'rare'

export interface ItemDef {
  id: string
  kind: ItemKind
  tier: ItemTier
  name: string
  ct: number
  category: CtCategory
  text: string
}

export interface ClassDef {
  id: ClassId
  tier: 1 | 2 | 3
  name: string
  theme: string
  suit: string | null
  ct: number
  abilityText: string
}

// ── Encounter modifiers (Chapter 1 encounter pack) ──────────────────────────

export type EncounterTier = 'skirmish' | 'veteran' | 'elite' | 'boss'

export interface EncounterDef {
  id: string
  name: string
  tier: EncounterTier
  pressure: number          // CT pressure rating (design/debug only)
  category: CtCategory
  mechanicText: string
}

// ── Road ─────────────────────────────────────────────────────────────────────

export type NodeKind =
  | 'start' | 'camp' | 'boss'
  | 'skirmish' | 'veteran' | 'elite'
  | 'forge' | 'abbey' | 'market' | 'tower' | 'shrine' | 'lair'

export interface RoadNode {
  id: string
  kind: NodeKind
  known: boolean            // partial visibility: unknown nodes show '?' until visited
  layer: number
  next: string[]            // ids of reachable nodes (one-way commitment)
  visited: boolean
  // backend balancing values — never shown in player UI (CT canon)
  rewardCT: number
  pressureCT: number
}

export interface RoadMapState {
  variant: string
  nodes: RoadNode[]
  currentNodeId: string
}

// ── Heroes / campaign ────────────────────────────────────────────────────────

export interface Hero {
  playerId: string          // socket id of controlling player (re-bound on resume)
  playerName: string
  classId: ClassId
  alive: boolean
  memories: string[]        // memory item ids (hero-bound, lost on death)
  relicId: string | null    // one relic slot per hero (v0 canon)
}

export type CampaignPhase =
  | 'class_select'
  | 'road'                  // choosing the next node
  | 'landmark'              // resolving a landmark reward choice
  | 'encounter'             // active fight (see encounter state)
  | 'death_vote'            // Retreat vs Last Stand
  | 'camp'                  // camp/interlude planning
  | 'replace_hero'          // dead player picks replacement class
  | 'memory_draft'          // chapter end memory drafts
  | 'chapter_complete'      // interlude between chapters / campaign won screen
  | 'campaign_won'
  | 'campaign_lost'

export interface PendingChoice {
  kind: 'landmark_reward' | 'replacement' | 'exile_pick' | 'memory'
  forPlayerId: string | null   // null → host decides
  prompt: string
  options: { id: string; label: string; detail?: string }[]
  returnTo?: 'camp' | 'road'   // phase to restore after the pick (default road)
}

export interface DeathVoteState {
  deadHeroIndex: number
  votes: Record<string, 'retreat' | 'last_stand' | 'defiant_stand'>
  defiantAvailable: boolean   // Warden once-per-run extra fork option
}

export interface MemoryDraftState {
  // one draft (3 options) per surviving hero, resolved in any order
  drafts: { heroIndex: number; options: string[]; picked: string | null }[]
}

// ── Encounter runtime state ──────────────────────────────────────────────────

export interface EncounterFlags {
  // generic one-shot trackers used by modifiers / classes / items
  [key: string]: number | boolean | string | undefined
}

// Structured combat events — the client plays these back as Balatro-style
// trigger popups. One batch per action (eventSeq increments per batch).
export interface EncounterEvent {
  kind: 'play' | 'suit' | 'proc' | 'mod' | 'damage' | 'kill' | 'counter' | 'death' | 'spell' | 'relic' | 'wager' | 'reveal' | 'info'
  text: string
  tone: 'gold' | 'blood' | 'info' | 'plain'
  big?: boolean
}

export interface EncounterState {
  nodeId: string
  tier: EncounterTier
  modifierId: string | null      // null for Chapter 1 boss (canon: no modifier)
  bossModifierId: string | null  // Chapter 2 boss hidden modifier
  bossModifierRevealed: boolean  // Tower intel can reveal it
  preps: string[]                // preparations that fired at this encounter's start (for UI)

  turnPhase: TurnPhase | 'setup' | 'over'
  currentPlayerIndex: number     // index into campaign.heroes
  nextPlayerIndex: number
  enemyDeck: Card[]
  currentEnemy: Enemy | null
  defeatedCount: number
  totalEnemies: number
  hands: Card[][]                // parallel to heroes
  discard: Card[]
  tavern: Card[]
  discardNeeded: number
  lastPlayed: Card[]
  outcome: 'active' | 'won' | 'retreated' | 'wiped'

  // setup-phase peeks (Oracle / Scry Band / Route Intel)
  setupPeek: { playerId: string; cards: Card[]; canReorder: boolean; source: string } | null

  // gambler wager (armed before a play resolves)
  wagerArmedBy: number | null

  // commander/jester handoff after kill
  pendingChooseNext: boolean

  flags: EncounterFlags          // modifier + ability one-shot bookkeeping

  events: EncounterEvent[]       // current action's event batch (playback)
  eventSeq: number               // increments per batch so clients detect new ones
}

// ── Campaign root ────────────────────────────────────────────────────────────

export interface CampaignState {
  id: string
  name: string
  seed: string
  rngState: number
  createdAt: string
  phase: CampaignPhase
  chapter: 1 | 2
  heroes: Hero[]
  map: RoadMapState | null
  encounter: EncounterState | null

  // Persistent deck state — carries across road encounters (attrition canon).
  // Only camp/interlude rests reshuffle and redraw. Null while an encounter is
  // active (the live state lives in encounter.* and is written back on end).
  deck: { tavern: Card[]; discard: Card[]; hands: Card[][] } | null

  spells: string[]               // team-owned spell inventory (item ids)
  preparations: string[]         // owned, not yet activated
  activePreparations: string[]   // activated at camp; consumed at next encounter start (cap 2)

  exiledCards: { suit: string; rank: string }[]  // Exile: removed from deck builds this chapter
  exileBurden: number
  wardenDefiantUsed: boolean     // once per run
  gamblerWagerUsed: boolean      // once per chapter
  ironReprieveUsed: boolean      // rare relic, once per chapter

  nextStarterIndex: number | null // Tower / Brace Command
  shrineBlessing: boolean         // +1 hand size next encounter

  pendingChoice: PendingChoice | null
  deathVote: DeathVoteState | null
  memoryDraft: MemoryDraftState | null

  classPicks: Record<string, ClassId | null>  // during class_select, by playerId

  log: string[]
  // debug/playtest controls (admin canon: deterministic testing support)
  debug: { forceNextEncounterId?: string; forceNextRewardId?: string }
}

// ── Kingdom (permanent unlock state) ─────────────────────────────────────────

export interface KingdomState {
  unlockedChapters: number[]     // [1] initially
  unlockedClasses: ClassId[]     // Tier 1 initially
  specializationsUnlocked: boolean
  campaignsWon: number
  heroesLost: number
}

// ── Client projections ───────────────────────────────────────────────────────

export interface ClientHero {
  playerId: string
  playerName: string
  classId: ClassId
  picked: boolean          // class_select: whether this player has locked a class
  className: string
  abilityText: string
  alive: boolean
  memories: { id: string; name: string; text: string }[]
  relic: { id: string; name: string; text: string; tier: ItemTier } | null
  handSize: number
  isCurrentPlayer: boolean
}

export interface ClientRoadNode {
  id: string
  kind: NodeKind | 'unknown'
  layer: number
  next: string[]
  visited: boolean
  current: boolean
  reachable: boolean
}

export interface ClientEncounterState {
  tier: EncounterTier
  modifier: { id: string; name: string; text: string } | null
  bossModifier: { id: string; name: string; text: string } | null  // only if revealed (or over)
  preps: { id: string; name: string; text: string }[]              // fired at encounter start
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
  // live once-per-enemy boosts for the viewing player (UI previews)
  myBoosts: {
    S: number; D: number; H: number
    dmgPlus: number; dmgMult: number
    execReady: boolean; dCap: number | null; hHalf: boolean
  }
  events: EncounterEvent[]
  eventSeq: number
}

export interface ClientCampaignState {
  id: string
  name: string
  seed: string
  phase: CampaignPhase
  chapter: number
  heroes: ClientHero[]
  myHeroIndex: number
  myHand: Card[]            // persistent hand — visible on the road/camp too
  isHost: boolean
  map: { nodes: ClientRoadNode[]; currentNodeId: string } | null
  encounter: ClientEncounterState | null
  spells: { id: string; name: string; text: string; tier: ItemTier }[]
  preparations: { id: string; name: string; text: string; tier: ItemTier }[]
  activePreparations: { id: string; name: string; text: string }[]
  pendingChoice: (PendingChoice & { mine: boolean }) | null
  deathVote: { deadHeroName: string; options: string[]; votes: Record<string, string>; myVote: string | null; isBoss: boolean } | null
  memoryDraft: { myOptions: { id: string; name: string; text: string }[] | null; waitingOn: string[] } | null
  exileAvailable: boolean
  kingdom: { unlockedChapters: number[]; unlockedClasses: ClassId[]; specializationsUnlocked: boolean }
  log: string[]
}

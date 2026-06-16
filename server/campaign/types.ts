import type { Card, Enemy } from '../types'

// ── Content identifiers ──────────────────────────────────────────────────────

export type ClassId =
  | 'sentinel' | 'quartermaster' | 'surgeon' | 'executioner'   // Tier 1
  | 'commander' | 'warden'                                     // Tier 2
  | 'gambler' | 'exile' | 'oracle'                             // Tier 3

export type CtCategory = 'Shield' | 'Access' | 'Recovery' | 'Initiative' | 'Consistency'

export type ItemKind = 'relic' | 'spell'
export type ItemTier = 'standard' | 'rare'

export type GearSlot = 'armor' | 'arms' | 'trinket'

export interface ItemDef {
  id: string
  kind: ItemKind
  tier: ItemTier
  name: string
  ct: number          // Road CT (linear axis — see docs/design/systems/catastrophe-tolerance.md v2)
  siegeCt?: number    // Siege CT (castle axis; 1.0 ≈ +10pp castle conversion). Omitted = 0.
  slot?: GearSlot     // relics only — gear-slot taxonomy (armor 1 / arms 2 / trinket 4 per hero)
  category: CtCategory
  text: string
}

export interface ClassDef {
  id: ClassId
  tier: 1 | 2 | 3
  name: string
  theme: string
  suit: string | null
  ct: number          // Road CT
  siegeCt?: number    // Siege CT of the class's once-per-castle ultimate
  abilityText: string
  siegeText?: string  // once-per-castle ultimate description
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

// ── Ascending Deck types (Step 0, gated behind EXPERIMENTS.ascendingDeck) ────

/**
 * A permanent per-card modifier instance (Step 5). References a TokenDef in the
 * catalog (`content.ts` TOKEN_DEFS) by id; `suit` is the resolved target suit for
 * graft/transmute tokens. Keyed in `CampaignState.cardTokens` by logical card id
 * (`${suit}${rank}`, e.g. 'S6').
 */
export interface Token {
  defId: string
  /** Resolved suit for graft (add) / transmute (replace) tokens. */
  suit?: string
}

/** Catalog entry describing a token's effect, power, and forge availability. */
export interface TokenDef {
  id: string
  name: string
  short: string          // card-face badge text, e.g. '+1', '♦', 'Scry'
  kind: 'value' | 'suit' | 'lever' | 'keyword'
  spend?: number         // value delta applied when the card is PLAYED (offense + lever size)
  hold?: number          // value delta applied when the card is DISCARDED to soak (defense)
  suitOp?: 'add' | 'replace'                       // suit tokens
  lever?: 'shield' | 'draw' | 'recover' | 'edge'   // lever-magnitude tokens (+1 / edge +2 dmg)
  keyword?: 'scry' | 'mark' | 'banner' | 'bloodprice'
  power: 1 | 2 | 3 | 4
  source: 'F' | 'C' | 'S'   // Forge-common / Class-tree / Spell-Shrine
  needsSuit?: boolean       // graft/transmute: the forge offer must resolve a suit
  forgeable?: boolean       // appears in forge-node offers
  text: string
}

/** Token projected for the client (resolved display info; no catalog needed). */
export interface ClientToken {
  defId: string
  name: string
  short: string
  sym: string                        // single card-face glyph (suit tokens → suit glyph)
  kind: TokenDef['kind']
  suit?: string
  spend: number                      // played-value delta (for the damage preview)
  suitOp?: 'add' | 'replace'         // suit tokens: graft (add) vs transmute (replace)
  lever?: TokenDef['lever']          // shield/draw/recover/edge magnitude tokens
  keyword?: TokenDef['keyword']      // scry/mark/banner/bloodprice
  tone: 'good' | 'bad' | 'neutral'   // green / red / neutral badge
  text: string
}

/** A single option in a solo per-hero draft offer. */
export interface DraftOption {
  id: string
  label: string
  detail?: string
  /** What the player receives on pick (card id, token spec, or tempo action). */
  payload: { cardId?: string; token?: Token; tempoDraw?: number }
}

export type NodeKind =
  | 'start' | 'camp' | 'boss'
  | 'skirmish' | 'veteran' | 'elite'
  | 'recruit'                              // Continent-1: number-enemy fight
  | 'draft'                                // Continent-1: steer the deck (solo per-hero pick)
  | 'forge' | 'abbey' | 'market' | 'tower' | 'shrine' | 'lair'
  | 'event'

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
  relicIds: string[]        // up to RELIC_SLOTS relics per hero; a further one forces a release
}

export type CampaignPhase =
  | 'class_select'
  | 'road'                  // choosing the next node
  | 'landmark'              // resolving a landmark reward choice
  | 'encounter'             // active fight (see encounter state)
  | 'death_vote'            // Retreat vs Last Stand
  | 'camp'                  // camp/interlude planning
  | 'replace_hero'          // dead player picks replacement class
  | 'chapter_complete'      // interlude between chapters / campaign won screen
  | 'campaign_won'
  | 'campaign_lost'

export interface PendingChoice {
  kind: 'landmark_reward' | 'replacement' | 'exile_pick' | 'relic_full' | 'draft_pick'
       | 'forge_token' | 'forge_card'      // ascending-deck Step 5: two-step forge
  forPlayerId: string | null   // null → team vote (or host when solo)
  prompt: string
  options: { id: string; label: string; detail?: string }[]
  returnTo?: 'camp' | 'road'   // phase to restore after the pick (default road)
  votes?: Record<string, string>   // team rewards: playerId → optionId (secret ballot)
  // forge_card step: the token chosen at the forge_token step, awaiting a target card
  forgeToken?: Token
  // true when this forge_token/forge_card flow is the fragment track (spends 2
  // token fragments + only offers C-tier tokens) rather than the Forge budget.
  fragmentApply?: boolean
}

export interface DeathVoteState {
  deadHeroIndex: number
  votes: Record<string, 'retreat' | 'last_stand' | 'defiant_stand'>
  defiantAvailable: boolean   // Warden once-per-run extra fork option
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

/**
 * Campaign-local turn phase union. NEVER add 'draw_select' to server/types.ts
 * TurnPhase — that is the base quick-game type and must stay untouched.
 * 'draw_select' is a campaign-only pause: the player chose which cards to keep
 * from the overdraw pool.
 */
export type CampaignTurnPhase =
  | 'play' | 'discard' | 'choose_next'   // mirrors base TurnPhase
  | 'setup'                               // encounter setup peek
  | 'draw_select'                         // ascending-deck: overdraw hold
  | 'over'                                // encounter finished

export interface EncounterState {
  nodeId: string
  tier: EncounterTier
  modifierId: string | null      // null for Chapter 1 boss (canon: no modifier)
  bossModifierId: string | null  // Chapter 2 boss hidden modifier
  bossModifierRevealed: boolean  // Tower intel can reveal it

  turnPhase: CampaignTurnPhase
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

  // ascending-deck: overdraw pool waiting for player keep-selection.
  // Only populated when turnPhase === 'draw_select'.
  drawPool?: Card[]
  // ascending-deck: which hero index the draw_select belongs to
  drawSelectHeroIdx?: number
  // keep-limit override for the current draw_select. Diamonds leave this unset
  // (limit = empty hand slots); Tactical Surge sets a fixed cap ("keep 2 of 5").
  drawSelectCap?: number

  flags: EncounterFlags          // modifier + ability one-shot bookkeeping

  events: EncounterEvent[]       // current action's event batch (playback)
  eventSeq: number               // increments per batch so clients detect new ones
}

// ── Campaign root ────────────────────────────────────────────────────────────

// Run telemetry for human-runs vs bot-floor comparison. Counted at the same
// event sites the simulator observes (scripts/sim.ts RunRecord semantics) and
// appended to data/human-runs/runs.csv when the run ends. Optional so saves
// from before this field load fine (a resumed old save counts from resume).
export interface RunTelemetry {
  startedAt: string
  encountersFought: number
  encountersWon: number
  retreats: number
  heroDeaths: number
  exactKills: number
  royalsBanished: number
  jesters: number
  yields: number
  itemsGained: number
  gatesCleared: number
  deckAtThrone: number
  royalsAtThrone: number
  itemsSeen: string[]      // every item id held at any point
  lossNodeKind: string
  lossModifier: string
  recorded: boolean        // CSV row already written for this run
}

export interface CampaignState {
  id: string
  name: string
  seed: string
  rngState: number
  createdAt: string
  phase: CampaignPhase
  chapter: number      // widened from 1|2 — ascending-deck uses chapters 1-6
  heroes: Hero[]
  map: RoadMapState | null
  encounter: EncounterState | null

  // Persistent deck state — carries across road encounters (attrition canon).
  // Only camp/interlude rests reshuffle and redraw. Null while an encounter is
  // active (the live state lives in encounter.* and is written back on end).
  deck: { tavern: Card[]; discard: Card[]; hands: Card[][] } | null

  // Final tableau of the last WON fight — the encounter is nulled on win, so
  // this lets the client show the killing turn's end result (hands/tavern)
  // before the spoils appear.
  lastFight?: {
    tier: EncounterTier
    rank: 'J' | 'Q' | 'K' | null
    handSizes: number[]
    tavern: number
    discard: number
  } | null

  spells: string[]               // team-owned spell inventory (item ids)

  exiledCards: { suit: string; rank: string }[]  // Exile: removed from deck builds this chapter
  exileBurden: number
  wardenDefiantUsed: boolean     // once per run
  gamblerWagerUsed: boolean      // once per chapter
  ironReprieveUsed: boolean      // rare relic, once per chapter

  nextStarterIndex: number | null // Tower / Brace Command
  shrineBlessing: boolean         // +1 hand size next encounter

  pendingChoice: PendingChoice | null
  // last resolved team-reward vote — the client confirms the winner (and
  // plays the casino draw on ties)
  rewardDraw?: {
    seq: number
    options: { id: string; label: string; detail?: string }[]
    winnerId: string
    tie: boolean
  } | null
  deathVote: DeathVoteState | null

  classPicks: Record<string, ClassId | null>  // during class_select, by playerId

  log: string[]
  // debug/playtest controls (admin canon: deterministic testing support)
  debug: { forceNextEncounterId?: string; forceNextRewardId?: string }

  // human-run telemetry — maintained by campaign/telemetry.ts via the session
  // dispatcher only, so simulator-driven campaigns never write human rows.
  // recordRun: player opt-out from the lobby checkbox (undefined = record)
  telemetry?: RunTelemetry
  recordRun?: boolean

  // ── Ascending Deck fields (EXPERIMENTS.ascendingDeck, optional + guarded) ──
  // All three are optional so saves from before this feature load fine.
  // Guards: always access via `c.ownedCards ?? []` etc.
  ownedCards?: string[]                          // card ids recruited this run
  tokenBudget?: number                           // Forge (F-tier) token budget
  tokenFragments?: number                        // fragment track: 2 → 1 C-tier token (road apply)
  cardTokens?: Record<string, Token[]>           // cardId → token list
  // item-economy: unlocked pools snapshotted from the Kingdom at run creation
  unlockedRelics?: string[]
  unlockedSpells?: string[]
  // cap on relic/spell-granting landmarks per chapter (extra ones give forge budget)
  itemStopsThisChapter?: number
}

// ── Kingdom (permanent unlock state) ─────────────────────────────────────────

export interface KingdomState {
  unlockedChapters: number[]     // [1] initially
  unlockedClasses: ClassId[]     // Tier 1 initially
  specializationsUnlocked: boolean
  campaignsWon: number
  heroesLost: number
  // ascending-deck meta: the item pool starts small and grows on death/milestone.
  // Optional so pre-existing kingdom.json files load (defaulted on load).
  unlockedRelics?: string[]
  unlockedSpells?: string[]
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
  relics: { id: string; name: string; text: string; tier: ItemTier }[]
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
  activatableRelics: string[]   // relic ids the viewing hero can activate right now
  // live once-per-enemy boosts for the viewing player (UI previews)
  myBoosts: {
    S: number; D: number; H: number
    dmgPlus: number; dmgMult: number
    execReady: boolean; dCap: number | null; hHalf: boolean
    comboMax: number   // max combo total — Combat Cache raises it 10→12
  }
  // province mode: which rank gate a boss fight is (J=Gates, Q=Courtyard, K=Throne)
  siegeRank: 'J' | 'Q' | 'K' | null
  // pile contents, sorted (draw order hidden) — players may inspect the piles
  tavernCards: Card[]
  discardCards: Card[]
  events: EncounterEvent[]
  eventSeq: number
  // ascending-deck: overdraw selection pool (only present during draw_select)
  drawPool?: Card[]
  // how many of the drawPool the viewing hero may keep (empty slots, or a spell cap)
  drawSelectKeep?: number
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`)
  cardTokens?: Record<string, ClientToken[]>
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
  lastFight: { tier: EncounterTier; rank: 'J' | 'Q' | 'K' | null; handSizes: number[]; tavern: number; discard: number } | null
  spells: { id: string; name: string; text: string; tier: ItemTier }[]
  pendingChoice: (Omit<PendingChoice, 'votes'> & {
    mine: boolean
    teamVote: boolean
    myVote: string | null
    votesIn: number
    votesNeeded: number
  }) | null
  rewardDraw: { seq: number; options: { id: string; label: string; detail?: string }[]; winnerId: string; tie: boolean } | null
  deathVote: { deadHeroName: string; options: string[]; votes: Record<string, string>; myVote: string | null; isBoss: boolean } | null
  exileAvailable: boolean
  kingdom: { unlockedChapters: number[]; unlockedClasses: ClassId[]; specializationsUnlocked: boolean }
  log: string[]
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`).
  // Lets the road/camp/class-select screens render tokened cards.
  cardTokens?: Record<string, ClientToken[]>
  // ascending-deck: unspent forge budget (tokens you may still stamp)
  tokenBudget?: number
  // fragment track: how many token fragments held (2 → apply a C-tier token)
  tokenFragments?: number
  // ascending-deck mode is active (drives token UI: class-select stamps, badges)
  ascendingDeck?: boolean
}

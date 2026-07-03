import type { Card, Enemy } from '../types'

// ── Content identifiers ──────────────────────────────────────────────────────

export type ClassId =
  | 'sentinel' | 'quartermaster' | 'surgeon' | 'executioner'   // Tier 1
  | 'commander' | 'warden'                                     // Tier 2
  | 'gambler' | 'exile' | 'oracle'                             // Tier 3

export type CtCategory = 'Shield' | 'Access' | 'Recovery' | 'Initiative' | 'Consistency'

export type ItemKind = 'relic' | 'spell'
export type ItemTier = 'standard' | 'rare' | 'mythic'   // mythic = the Item-3 shiny-decoy relics

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
  hold: number                       // discard-soak delta (Ballast +1, …) for the discard total
  suitOp?: 'add' | 'replace'         // suit tokens: graft (add) vs transmute (replace)
  lever?: TokenDef['lever']          // shield/draw/recover/edge magnitude tokens
  keyword?: TokenDef['keyword']      // scry/mark/banner/bloodprice
  tone: 'good' | 'bad' | 'neutral'   // green / red / neutral badge
  text: string
}

// ── §F card-state model (V3.0 slice 1) ───────────────────────────────────────

/** A card face — printed or effective. Loose strings, matching Token.suit style. */
export interface CardFace {
  suit: string   // C | D | H | S
  rank: string   // A | 2…10 | J | Q | K
}

/**
 * One graft on a physical card (V3 §1 semantics). Ordered by `seq`; the card's
 * EFFECTIVE face is the printed face with each graft applied in order.
 *   - `rank`: REPLACE the rank (last rank graft wins; A–10 only — the royal cap).
 *   - `suit`: REPLACE the primary suit (transmute — Consecrate, Press-gang).
 *   - `suit-add`: ADD a second active suit (the exact-kill graft). The card keeps
 *     its primary suit and ALSO fires the added suit — deck grows on the suit
 *     axis (vs. `rank` growing the number axis), so the two exact-kill branches
 *     stay competitive (decisions/2026-07-02-graft-add-suit-or-replace-rank.md).
 * A graft is movable (Sanctum) without losing the card underneath — the printed
 * face never changes.
 */
export interface GraftRecord {
  seq: number              // application order; stable handle for Sanctum moves
  kind: 'rank' | 'suit' | 'suit-add'
  from: string             // what this replaced (effective value at application time; = `to` for suit-add)
  to: string               // the replacement/addition (rank grafts: A–10 only — the royal cap)
  source: string           // provenance, e.g. 'kill:H7', 'royal:SK', 'sanctum'
}

/**
 * §F: a card with stable physical identity. `physicalId` survives rank/suit
 * replacement AND deck rebuilds; `printed` is what is inked on the card and
 * never changes; the effective face is DERIVED (cards.ts effectiveFace), never
 * stored. Registry lives in CampaignState.cards.
 */
export interface PhysicalCard {
  physicalId: string       // `pc<n>`, unique per campaign (CampaignState.cardSeq)
  printed: CardFace
  grafts: GraftRecord[]
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
  | 'forge' | 'abbey' | 'market' | 'shrine' | 'lair'
  | 'event'
  | 'hunt'                                 // V3 §8: pursue a missed recruit (C1 only — NEW)
  | 'heroes'                               // V3 §8: Fallen Heroes — free Staff swap (C2-P2)

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
  // V3 §2 — class = path + Staff (slice 4)
  staffId?: string          // the selected Staff (one of the class's four; swaps at Fallen Heroes)
  pathC2?: string           // ladder id of the granted C2 rung (home path; lit on entering C2)
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
  | 'tutorial_done'         // scripted tutorial finished — show the end card

export interface PendingChoice {
  // (forge_token / forge_card / shop kinds were deleted at the V3.0 cutover)
  kind: 'landmark_reward' | 'replacement' | 'relic_full' | 'draft_pick'
       | 'royal_keep'                      // V3 §3: post-gate 3/2/1 keep-decision
  forPlayerId: string | null   // null → team vote (or host when solo)
  prompt: string
  options: { id: string; label: string; detail?: string }[]
  returnTo?: 'camp' | 'road'   // phase to restore after the pick (default road)
  votes?: Record<string, string>   // team rewards: playerId → optionId (secret ballot)
  // royal_keep (V3 §3): the gate's royal pool + picks so far. mode 'leave' =
  // pick the ONE left behind (Jack Gate keeps 3); 'keep' = sequential keep
  // picks (Queen Gate ×2, King Gate ×1 — the crown).
  royalKeep?: { rank: 'J' | 'Q' | 'K'; pool: string[]; kept: string[]; mode: 'keep' | 'leave'; nodeId: string }
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
  | 'graft_select'                        // ascending-deck: redundant exact-kill graft pick
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

  // Replacement graft (V3 §1): a redundant exact-kill pauses to rewrite one
  // held card. Only populated when turnPhase === 'graft_select'. `suit`/`rank`
  // are the slain card's face (rank already royal-capped at 10); `slain` is the
  // slain card's printed label for provenance (e.g. 'D2', 'SK').
  pendingGraft?: { heroIdx: number; suit: string; rank: string; slain: string }

  // scripted tutorial: index into the beat list (campaign/tutorial.ts).
  tutorialStep?: number

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
  // V3 Camp bundle (slice 5, Decision 4): armed at a Camp visit, consumed by
  // the next fight — doubled first attack + starting block.
  campDoubleNext?: boolean
  campBlockNext?: number
  // V3 §6: the draft "Bulwark" bargain — a one-shot malus on the FIRST attack of
  // the next encounter (paired with a campBlockNext block). Consumed on use.
  attackMalusNext?: number

  // ── V3 §7 (slice 7): relics — the BAG (found, unequipped) and the four
  // named slots (hat/amulet/ring/cloak, one relic each; solo-scope equipment).
  // Swaps are free between encounters, locked in combat (Decision 7). The
  // legacy Hero.relicIds model survives for non-ascending runs until slice 9.
  relicBag?: string[]
  relicEquipment?: Partial<Record<'cloak' | 'ring' | 'hat' | 'amulet', string>>
  // Interest (Ring): armed when a whole fight was paid without discards
  interestNext?: boolean

  // ── V3 §6 (slice 6, revised 2026-07-03): the gauntlet — four suit slots,
  // ONE crystal each. tier: 0 empty · 1 Fragment (castable) · 2 Half (stronger).
  // Accumulation lives in the agnostic pools (tokenFragments / tokenHalves), not
  // in a slot. Cast = consume the slot to EMPTY (Decision 2).
  gauntlet?: Record<string, { tier: 0 | 1 | 2 }>
  foresightNext?: boolean         // Sanctum Foresight rite: reveal the next encounter's enemy lineup

  pendingChoice: PendingChoice | null
  // V3 §7: an in-progress Caravan purchase — the player picks WHICH road-hand
  // cards to discard as the price (iterative choice_pick). `pool` = the relics
  // offered this visit; `relicId` set once a wares is chosen; `picked` = the
  // hand indices selected so far toward `cost`.
  pendingCaravan?: { cost: number; pool: string[]; picked: number[]; relicId?: string }
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

  // scripted onboarding tutorial: when true, deck/enemies are fixed (see
  // campaign/tutorial.ts) and the run is isolated from the live campaign.
  tutorial?: boolean

  // human-run telemetry — maintained by campaign/telemetry.ts via the session
  // dispatcher only, so simulator-driven campaigns never write human rows.
  // recordRun: player opt-out from the lobby checkbox (undefined = record)
  telemetry?: RunTelemetry
  recordRun?: boolean

  // ── Ascending Deck fields (EXPERIMENTS.ascendingDeck, optional + guarded) ──
  // All three are optional so saves from before this feature load fine.
  // Guards: always access via `c.ownedCards ?? []` etc.
  ownedCards?: string[]                          // card ids recruited this run
  // (tokenBudget, the fragment shop and the mythic/item-stop caps were deleted
  // at the V3.0 cutover, §11 slice 9)
  tokenFragments?: number                        // V3 §6: the agnostic fragment pool
  tokenHalves?: number                           // V3 §6: the agnostic Half pool (forged, 2 frags → 1)
  cardTokens?: Record<string, Token[]>           // cardId → token list (dormant V3 content)
  // item-economy: unlocked pools snapshotted from the Kingdom at run creation
  unlockedRelics?: string[]
  unlockedSpells?: string[]

  // ── §F card-state model (V3.0 slice 1) ─────────────────────────────────────
  // Persisted-format version. Absent = legacy v1 (logical-id keying only);
  // 2 = physical card registry below. Bump on breaking shape changes;
  // store.loadCampaign migrates old saves forward (cards.migrateCampaign).
  schemaVersion?: number
  // physicalId → card. The §F registry: canonical identity for every card the
  // run owns (the A–5 start + recruits; royals join at the C2 gates). The
  // legacy ownedCards/cardTokens above stay logical-id-keyed through the
  // cards.ts shim until the additive-token systems retire (slice 9).
  cards?: Record<string, PhysicalCard>
  // monotonic per-campaign counter minting physicalIds and graft seqs
  cardSeq?: number
}

// ── Kingdom (permanent unlock state) ─────────────────────────────────────────

export interface KingdomState {
  // V3.0 cutover marker (slice 9): kingdoms without it are wiped on load —
  // the lineage reset. Meta banks OPTIONS, not power.
  v3?: boolean
  unlockedChapters: number[]     // [1] initially
  unlockedClasses: ClassId[]     // Tier 1 initially
  specializationsUnlocked: boolean
  // V3 §10: clearing C2 (the crown) opens the three non-home suit paths
  pathsUnlocked?: boolean
  campaignsWon: number
  heroesLost: number
  // ascending-deck meta: the item pool starts small and grows on death/milestone.
  // Optional so pre-existing kingdom.json files load (defaulted on load).
  unlockedRelics?: string[]
  unlockedSpells?: string[]
}

// ── Client projections ───────────────────────────────────────────────────────

/** §F projection: printed vs effective display data for one physical card.
 * Runtime deck cards carry their physicalId as Card.id — the client joins on it. */
export interface ClientPhysicalCard {
  physicalId: string
  printed: CardFace
  effective: CardFace
  suits: string[]          // all suits the card fires (effective primary + additive grafts)
  grafts: { kind: 'rank' | 'suit' | 'suit-add'; from: string; to: string; source: string }[]
}

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
  // V3 §2: the selected Staff + the lit C2 path rung (if entered C2)
  staff?: { id: string; name: string; text: string } | null
  pathRung?: { id: string; name: string; suit: string; text: string } | null
  // V3 §2: the full skill tree — the class's four suit ladders, each with
  // C2/C3/C4 rungs. V3.0 lights only the home-suit C2 rung; the rest are locked.
  path?: HeroPath | null
}

export interface HeroPath {
  homeSuit: string
  ladders: {
    id: string; name: string; suit: string; theme: string; isHome: boolean
    rungs: { tier: 'C2' | 'C3' | 'C4'; text: string; lit: boolean }[]
  }[]
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
  // Replacement graft (V3 §1): present during graft_select for the hero
  // choosing — the slain card's suit + royal-capped rank. The player rewrites
  // one held card's value OR suit to these.
  graftSelect?: { suit: string; rank: string } | undefined
  // scripted tutorial: the current guide beat (line + which hand card to highlight)
  tutorialBeat?: { line: string; highlightCardId?: string; step: number; total: number }
  // scripted tutorial: render the current enemy as a Training Dummy (no suit)
  tutorialDummy?: boolean
  // scripted tutorial: fodder card ids to flash during discard-to-pay
  tutorialDiscard?: string[]
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`)
  cardTokens?: Record<string, ClientToken[]>
  // Sanctum Foresight rite: the upcoming enemy lineup (labels), revealed this fight
  foreseen?: string[]
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
  // persistent deck snapshot for the map's deck/discard viewer (sorted by suit;
  // draw order stays secret). Reflects c.deck between fights.
  deckTavern: Card[]
  deckDiscard: Card[]
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
  kingdom: { unlockedChapters: number[]; unlockedClasses: ClassId[]; specializationsUnlocked: boolean; pathsUnlocked?: boolean }
  log: string[]
  // ascending-deck: tokens stamped on cards, keyed by logical id (`${suit}${rank}`).
  // Lets the road/camp/class-select screens render tokened cards.
  cardTokens?: Record<string, ClientToken[]>
  // V3 §6: the agnostic pools (armed onto suits via the bracelet)
  tokenFragments?: number
  tokenHalves?: number
  // ascending-deck mode is active (drives token UI: class-select stamps, badges)
  ascendingDeck?: boolean
  // §F: physicalId → printed/effective faces + graft provenance. Deck cards
  // carry their physicalId as Card.id, so any card view can join on it.
  physicalCards?: Record<string, ClientPhysicalCard>
  // V3 §6: the gauntlet per suit — tier (0 empty / 1 Fragment / 2 Half), the
  // spell name/text for the current tier, and whether it can be cast right now.
  gauntlet?: Record<string, { tier: 0 | 1 | 2; name: string; text: string; castable: boolean }>
  // V3 §7: relic bag + the four named slots (equipped relic or null each)
  relicBag?: { id: string; slot: string; name: string; text: string }[]
  relicSlots?: Record<string, { id: string; name: string; text: string; activated: boolean } | null>
}

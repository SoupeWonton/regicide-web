import type { Card, Enemy, Suit } from '../types'
import { cardValue, cardLabel, suitSymbol, enemyStats, isNumberRank, numberEnemyStats, jesterCount } from '../deck'
import { createRng } from '../rng'
import type { CampaignState, CampaignTurnPhase, EncounterState, EncounterTier, EncounterEvent } from './types'
import { getEncounterDef, getItem, encountersOf, BOSS_MODIFIERS, CLASSES, CLASS_SIGNATURES, SIGNATURE_CARDS } from './content'
import { EXPERIMENTS, CURATION_CUT } from './experiments'
import { appendGameLog } from './store'
import { spendDelta, holdDelta, cardSuits, leverBonus, markDamage, hasKeyword, rekeyCardTokens } from './tokens'
import { syncCardRegistry, effectiveFace, registerLogicalCard, physicalById, applyGraft } from './cards'
import { tutorialEnemies, tutorialEnemyMeta, tutorialBlocksPlay, tutorialBlocksDiscard, tutorialBlocksGraft, recordTutorialPlay } from './tutorial'

/** Returns the continent number for a given chapter. Inlined to avoid circular import with campaign.ts. */
function continentOf(chapter: number): number { return Math.ceil(chapter / 3) }

// Campaign encounter engine. A superset of the base Regicide rules with hook
// points for encounter modifiers, class core abilities, relics, and spells.
// Operates by mutating campaign.encounter in place; all actions validate
// before mutating.

const SUITS: Suit[] = ['C', 'D', 'H', 'S']
const PLAYER_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const

let _uid = 1000
const uid = () => `c${++_uid}`

function clog(c: CampaignState, msg: string) {
  c.log.unshift(msg)
  if (c.log.length > 60) c.log.pop()
  appendGameLog(c.id, msg)
}

// ── Event stream (Balatro-style playback on the client) ─────────────────────
function ev(s: EncounterState, kind: EncounterEvent['kind'], text: string, tone: EncounterEvent['tone'] = 'plain', big = false) {
  s.events.push({ kind, text, tone, big })
}
/** Start a fresh event batch — call after validation, before mutation. */
function beginEvents(s: EncounterState) {
  s.events = []
  s.eventSeq++
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function aliveIndices(c: CampaignState): number[] {
  return c.heroes.map((h, i) => (h.alive ? i : -1)).filter(i => i >= 0)
}

export function maxHandSize(c: CampaignState, heroIdx?: number): number {
  const base = { 1: 8, 2: 7, 3: 6, 4: 5 }[c.heroes.length] ?? 5
  const s = c.encounter
  let size = base
  if (s?.flags['shrineBlessing']) size += 1
  if (s?.bossModifierId === 'starving-court') size -= 1
  // Reliquary relic: hand cap +1 (every encounter)
  if (s && c.heroes.some(h => h.alive && h.relicIds.includes('r-reliquary'))) size += 1
  // Hoard (mythic): the OWNER's hand cap +2 (the coast-vanilla comfort relic)
  if (heroIdx !== undefined && c.heroes[heroIdx]?.alive && c.heroes[heroIdx]!.relicIds.includes('r-hoard')) size += 2
  // Quartermaster: hand cap +1 for the Quartermaster's OWN hand (playtest
  // canon 2026-06-11: class powers affect only the player running the class)
  if (heroIdx !== undefined && c.heroes[heroIdx]?.alive && c.heroes[heroIdx]!.classId === 'quartermaster') size += 1
  return Math.max(2, size)
}

function rng(c: CampaignState) {
  const r = createRng(c.rngState)
  return {
    r,
    done() { c.rngState = r.state() },
  }
}

function flagKey(base: string, idx?: number): string { return idx === undefined ? base : `${base}:${idx}` }

function once(s: EncounterState, key: string): boolean {
  if (s.flags[key]) return false
  s.flags[key] = true
  return true
}

// ── Persistent deck (attrition canon) ────────────────────────────────────────
// The deck carries across road encounters. It is built once per chapter and
// only reshuffled/redrawn at camp/interlude rests (and Hearts mid-encounter).

// Campaign jester counts differ from base (balance-testing): low player
// counts get jesters back so jester tools aren't dead, and the solo jester
// doubles as the official-style panic button (full hand refresh).
const CAMPAIGN_JESTERS: Record<number, number> = { 1: 2, 2: 1, 3: 1, 4: 2 }

function buildCampaignDeck(c: CampaignState, shuffler: <T>(a: T[]) => T[]): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS)
    for (const rank of PLAYER_RANKS)
      cards.push({ suit, rank, id: uid() })
  const jesters = CAMPAIGN_JESTERS[c.heroes.length] ?? jesterCount(c.heroes.length)
  for (let i = 0; i < jesters; i++) cards.push({ suit: 'C', rank: 'Jo', id: uid() })
  return shuffler(cards)
}

/** Chapter start: fresh full deck, full hands. */
export function setupChapterDeck(c: CampaignState) {
  const { r, done } = rng(c)

  // ── Ascending-deck (Continent 1): start-small 20-card deck ────────────────
  // A–5, all 4 suits = 20 cards + jesters. Curation block is DEAD under this
  // flag (superseded by the small start canon). Recruited number-cards carry
  // in via c.ownedCards — they are injected back into the tavern on setup.
  if (EXPERIMENTS.ascendingDeck) {
    // Stamp each class's level-1 signature tokens once, at run start (ch1).
    // First tokens of the run → empty cardTokens means not yet signed.
    if (c.chapter === 1 && Object.keys(c.cardTokens ?? {}).length === 0) {
      c.cardTokens ??= {}
      for (const hi of aliveIndices(c)) {
        const cls = c.heroes[hi]!.classId
        const sig = CLASS_SIGNATURES[cls] ?? []
        const slots = SIGNATURE_CARDS[cls] ?? []
        for (let i = 0; i < sig.length && i < slots.length; i++) {
          const cardId = slots[i]!
          ;(c.cardTokens[cardId] ??= []).push(sig[i]!)
        }
        if (sig.length) clog(c, `✒ ${c.heroes[hi]!.playerName} (${CLASSES[cls].name}) stamps ${sig.length} signature tokens.`)
      }
    }
    // §F: the deck is built FROM the physical registry — the A–5 start plus
    // every recruit each yield one runtime card carrying its EFFECTIVE face and
    // its physicalId as Card.id, so identity survives deck rebuilds (the old
    // per-setup uid() ids did not) and rank/suit replacement (slice 2).
    syncCardRegistry(c)
    const cards: Card[] = []
    for (const pc of Object.values(c.cards ?? {})) {
      const f = effectiveFace(pc)
      cards.push({ suit: f.suit as Suit, rank: f.rank as Card['rank'], id: pc.physicalId })
    }
    const jesters = CAMPAIGN_JESTERS[c.heroes.length] ?? 0
    for (let i = 0; i < jesters; i++) cards.push({ suit: 'C', rank: 'Jo', id: uid() })
    const recruited = (c.ownedCards ?? []).length
    const tavern = r.shuffle(cards)
    c.deck = { tavern, discard: [], hands: c.heroes.map(() => []) }
    for (const hi of aliveIndices(c))
      for (let i = 0; i < maxHandSize(c, hi); i++)
        if (c.deck.tavern.length) c.deck.hands[hi]!.push(c.deck.tavern.pop()!)
    done()
    clog(c, `🃏 Ascending Deck: ${cards.length - jesters} cards (A–5 + ${recruited} recruited). Hands drawn.`)
    return
  }

  let tavern = buildCampaignDeck(c, a => r.shuffle(a))
  // Province mode — class curation (deckbuild option B): each suited class
  // removes its N lowest own-suit cards. Quality up, total runway down.
  if (EXPERIMENTS.provinceMode) {
    const cut = CURATION_CUT[c.heroes.length] ?? 2
    for (const h of c.heroes) {
      const suit = CLASSES[h.classId].suit
      // suited classes cut their own suit's lowest; suitless (support/weird)
      // classes trim the lowest cards deck-wide — generalist quality
      const pool = tavern
        .filter(cd => cd.rank !== 'Jo' && (!suit || cd.suit === suit))
        .sort((a, b) => cardValue(a.rank) - cardValue(b.rank))
        .slice(0, cut)
      const ids = new Set(pool.map(cd => cd.id))
      tavern = tavern.filter(cd => !ids.has(cd.id))
      if (pool.length)
        clog(c, `🃏 ${h.playerName} curates the deck: ${pool.length} low ${suit ? suitSymbol(suit as Suit) : ''} cards are cut.`)
    }
  }
  c.deck = { tavern, discard: [], hands: c.heroes.map(() => []) }
  for (const hi of aliveIndices(c))
    for (let i = 0; i < maxHandSize(c, hi); i++)
      if (c.deck.tavern.length) c.deck.hands[hi]!.push(c.deck.tavern.pop()!)
  done()
  clog(c, '🃏 The expedition deck is assembled and hands are drawn.')
}

/** Camp/interlude rest: shuffle discard + hands into the Tavern, redraw full. */
export function campRest(c: CampaignState) {
  const deck = c.deck
  if (!deck) return
  const pool = [...deck.tavern, ...deck.discard, ...deck.hands.flat()]
  const { r, done } = rng(c)
  deck.tavern = r.shuffle(pool)
  deck.discard = []
  deck.hands = c.heroes.map(() => [])
  for (const hi of aliveIndices(c))
    for (let i = 0; i < maxHandSize(c, hi); i++)
      if (deck.tavern.length) deck.hands[hi]!.push(deck.tavern.pop()!)
  done()
  clog(c, '🔄 The party rests — the deck is reshuffled and hands are redrawn.')
}

/** Camp replacement: the new hero draws a full hand. */
export function dealReplacementHand(c: CampaignState, heroIdx: number) {
  const deck = c.deck
  if (!deck) return
  const max = maxHandSize(c, heroIdx)
  deck.hands[heroIdx] = []
  for (let i = 0; i < max; i++)
    if (deck.tavern.length) deck.hands[heroIdx]!.push(deck.tavern.pop()!)
}

// Encounter composition scales with party size (balance-testing): the boss
// castle is canon and never scales, but road fights shed a body at low
// counts so pressure tracks the party's total hand capacity.
/** Tier ranks for each Continent-1 chapter. */
export const RECRUIT_RANKS_BY_CHAPTER: Record<number, string[]> = {
  1: ['6', '7'],
  2: ['8', '9'],
  3: ['10'],
}

// Continent-1 number gates (ascending-deck): each chapter's three boss nodes are
// Gates / Courtyard / Throne, made of NUMBER cards (never royals before ch4).
//   ch1 → Gates 4×6 · Courtyard 4×7 · Throne 4×6 + 4×7
//   ch2 → Gates 4×8 · Courtyard 4×9 · Throne 4×8 + 4×9
// (ch3's boss is the Council of Tens — handled separately.) Killing a gate enemy
// recruits/backfills it exactly like a road recruit; pre-recruited cards yield a
// forge token instead (the existing number-enemy kill resolution handles both).
export const C1_GATE_RANKS: Record<number, string[][]> = {
  1: [['6'], ['7'], ['6', '7']],
  2: [['8'], ['9'], ['8', '9']],
}

/**
 * Build a recruit-encounter enemy stack for Continent-1 ascending-deck mode.
 * Enemies are lazily selected from the **unowned** cards of the chapter's tier
 * so the player is always offered a card they need (dupe-guard layer 1).
 * If the entire tier is already owned the stack falls back to a filler fight
 * (generic veteran-tier royals) — the caller degrades the tier accordingly.
 * Solo gets 2 enemies, party gets 3.
 */
function buildRecruitStack(
  chapter: number, players: number,
  shuffler: <T>(a: T[]) => T[],
  ownedCards: string[],
): { cards: Card[]; degraded: boolean } {
  const rankPool = RECRUIT_RANKS_BY_CHAPTER[chapter] ?? ['6', '7']
  const allSuits: Suit[] = ['C', 'D', 'H', 'S']

  // Build the full unowned pool for this tier
  const unowned: { suit: Suit; rank: string }[] = []
  for (const rank of rankPool) {
    for (const suit of allSuits) {
      if (!ownedCards.includes(`${suit}${rank}`)) {
        unowned.push({ suit, rank })
      }
    }
  }

  // Tier complete → degrade to filler. Continent 1 NEVER fields royals, so the
  // fallback is owned cards of this tier (a re-fight that pays forge tokens),
  // not the old J/Q/K stack.
  if (unowned.length === 0) {
    const owned = shuffler(rankPool.flatMap(rank => allSuits.map(suit => ({ suit, rank }))))
    const n = players === 1 ? 2 : 3
    const degraded: Card[] = owned.slice(0, n).map(e => ({ suit: e.suit, rank: e.rank as Card['rank'], id: uid() }))
    return { cards: degraded, degraded: true }
  }

  // Ramp the opener: solo Chapter 1 is a SINGLE enemy (a 20-card deck shouldn't
  // face two fights-worth of immunity at once); solo later chapters field 2.
  const enemyCount = players === 1 ? (chapter === 1 ? 1 : 2) : 3
  // Shuffle the unowned pool and take enemyCount cards, preferring SUIT VARIETY so
  // you never face two same-suit enemies (which would deny the same lever twice).
  const pool = shuffler([...unowned])
  const cards: Card[] = []
  const usedSuits = new Set<Suit>()
  for (const e of pool) {
    if (cards.length >= enemyCount) break
    if (usedSuits.has(e.suit)) continue
    usedSuits.add(e.suit)
    cards.push({ suit: e.suit, rank: e.rank as Card['rank'], id: uid() })
  }
  // top up from the rest if variety left us short
  for (const e of pool) {
    if (cards.length >= enemyCount) break
    if (cards.some(card => card.suit === e.suit && card.rank === e.rank)) continue
    cards.push({ suit: e.suit, rank: e.rank as Card['rank'], id: uid() })
  }
  // If pool smaller than enemyCount, pad from the full tier (may repeat a suit/rank)
  while (cards.length < enemyCount) {
    const extra = shuffler([...allSuits])[0]!
    const rank = shuffler([...rankPool])[0]! as Card['rank']
    cards.push({ suit: extra, rank, id: uid() })
  }
  return { cards, degraded: false }
}

/**
 * Build the Council of Tens enemy stack: all four 10s at once.
 * This is the Continent-1 boss — defeating it completes the 10-set and
 * triggers the Continent 1→2 transition.
 */
function buildCouncilStack(shuffler: <T>(a: T[]) => T[]): Card[] {
  const suits: Suit[] = ['C', 'D', 'H', 'S']
  return shuffler(suits.map(suit => ({ suit, rank: '10' as Card['rank'], id: uid() })))
}

// Continent-1 number-fight ranks per chapter (no royals): the tier the chapter
// recruits, the low filler one rank below it, and the "next tier" a Lair pulls.
function c1FightRanks(chapter: number): { tier: string[]; lo: string; next: string[] } {
  const tier = RECRUIT_RANKS_BY_CHAPTER[chapter] ?? ['6', '7']
  const nextByCh: Record<number, string[]> = { 1: ['8', '9'], 2: ['10'], 3: ['10'] }
  return { tier, lo: String(Number(tier[0]) - 1), next: nextByCh[chapter] ?? ['10'] }
}

// Pick `perRank` enemies of each rank, preferring UNOWNED suits (so you face the
// cards you still need to recruit); falls back to owned suits (which on exact
// kill yield a token fragment instead).
function pickNumberStack(ranks: string[], perRank: number, owned: string[], shuffler: <T>(a: T[]) => T[]): Card[] {
  const allSuits: Suit[] = ['C', 'D', 'H', 'S']
  const out: Card[] = []
  for (const rank of ranks) {
    const unowned = shuffler(allSuits.filter(s => !owned.includes(`${s}${rank}`)))
    const ownedS = shuffler(allSuits.filter(s => owned.includes(`${s}${rank}`)))
    for (const suit of [...unowned, ...ownedS].slice(0, perRank))
      out.push({ suit, rank: rank as Card['rank'], id: uid() })
  }
  return out
}

function buildEnemyStack(tier: EncounterTier, isLair: boolean, players: number, shuffler: <T>(a: T[]) => T[], rankOnly?: 'J' | 'Q' | 'K', isRecruit?: boolean, chapter?: number, ownedCards?: string[], isCouncil?: boolean, gateRanks?: string[]): { cards: Card[]; recruitDegraded?: boolean } {
  const owned = ownedCards ?? []
  // Council of Tens (Continent-1 ch3 boss): all four 10s at once
  if (isCouncil && EXPERIMENTS.ascendingDeck) {
    return { cards: buildCouncilStack(shuffler) }
  }
  // Continent-1 number gates (ch1/ch2 boss nodes): 3 per rank solo (Throne = 6),
  // 4 in a party. Gate kills recruit via the number-enemy resolution.
  if (gateRanks && gateRanks.length) {
    return { cards: shuffler(pickNumberStack(gateRanks, players === 1 ? 3 : 4, owned, shuffler)) }
  }
  // Continent-1 recruit fights (legacy node kind; maps no longer emit these)
  if (isRecruit && EXPERIMENTS.ascendingDeck) {
    const result = buildRecruitStack(chapter ?? 1, players, shuffler, owned)
    return { cards: result.cards, recruitDegraded: result.degraded }
  }
  // Continent-1 (ascending): NO royals before ch4. Road fights are number-enemies.
  //   skirmish = [low filler + tier card]  (kill the tier card → recruit; low → fragment)
  //   veteran  = the tier ranks (6 & 7)    (auto-recruit on any kill — flagged at start)
  //   lair     = one next-tier card (8-9)  (recruit it + the rare lair bonus)
  if (EXPERIMENTS.ascendingDeck && continentOf(chapter ?? 1) === 1 && tier !== 'boss') {
    const { tier: tierRanks, lo, next } = c1FightRanks(chapter ?? 1)
    if (isLair) return { cards: pickNumberStack([shuffler([...next])[0]!], 1, owned, shuffler) }
    if (tier === 'veteran') return { cards: pickNumberStack(tierRanks, 1, owned, shuffler) }
    return { cards: pickNumberStack([lo, tierRanks[0]!], 1, owned, shuffler) }   // skirmish
  }
  const mk = (rank: 'J' | 'Q' | 'K', suits: Suit[]) => suits.map(suit => ({ suit, rank: rank as Card['rank'], id: uid() }))
  if (tier === 'boss') {
    // V3 §3 (ascending C2): a gate IS the full rank — all four royals fought,
    // and the 3/2/1 keep-decision after the fight covers all four. Legacy
    // province mode keeps the party-size split (solo 3 / party 4).
    if (rankOnly) {
      const fullGate = EXPERIMENTS.ascendingDeck && continentOf(chapter ?? 1) === 2
      const suits = fullGate ? shuffler([...SUITS]) : shuffler([...SUITS]).slice(0, players === 1 ? 3 : 4)
      return { cards: shuffler(mk(rankOnly, suits)) }
    }
    if (EXPERIMENTS.shortCastle) {
      const ranks: ('J' | 'Q' | 'K')[] = ['J', 'Q', 'K']
      return { cards: ranks.flatMap(rank => shuffler(mk(rank, shuffler([...SUITS]).slice(0, 3)))) }
    }
    return { cards: [
      ...shuffler(mk('J', [...SUITS])),
      ...shuffler(mk('Q', [...SUITS])),
      ...shuffler(mk('K', [...SUITS])),
    ] }
  }
  const pickSuits = (n: number) => shuffler([...SUITS]).slice(0, n)
  // Solo road fights are single-royal duels (a solo "skirmish" of 2 Jacks was
  // effectively a gate fight). Applies in province mode AND ascending Continent-1
  // filler (where a 20-card A–5 deck cannot face two royals at once).
  const soloProvince = players === 1 && (
    EXPERIMENTS.provinceMode || (EXPERIMENTS.ascendingDeck && continentOf(chapter ?? 1) === 1))
  if (tier === 'skirmish') return { cards: mk('J', pickSuits(soloProvince ? 1 : 2)) }
  if (tier === 'veteran') {
    if (soloProvince) return { cards: mk('Q', pickSuits(1)) }
    return { cards: players <= 2
      ? [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1))]
      : [...mk('J', pickSuits(2)), ...mk('Q', pickSuits(1))] }
  }
  // elite (lair variant is shorter but heavier)
  if (isLair) return { cards: players === 1 ? mk('K', pickSuits(1)) : [...mk('Q', pickSuits(1)), ...mk('K', pickSuits(1))] }
  return { cards: players === 1
    ? [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1))]
    : [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1)), ...mk('K', pickSuits(1))] }
}

// ── Encounter creation ───────────────────────────────────────────────────────

export function startEncounter(c: CampaignState, nodeId: string, tier: EncounterTier, opts: { isLair?: boolean; isRecruit?: boolean; isCouncil?: boolean } = {}) {
  const { r, done } = rng(c)
  const shuffler = <T>(a: T[]) => r.shuffle(a)

  // modifier pick (boss Ch1 has none — canon; boss Ch2 uses hidden boss modifier)
  // Council of Tens (ascending-deck boss) also has no modifier — it IS the event.
  let modifierId: string | null = null
  let bossModifierId: string | null = null
  // Ascending-deck ramp: NO modifier on recruit fights (the recruiting tutorial)
  // or on Chapter 1 at all — a 20-card A–5 deck shouldn't also fight a rule-bend.
  const noModifier = c.tutorial || (EXPERIMENTS.ascendingDeck && (opts.isRecruit || c.chapter === 1))
  if (tier !== 'boss' && !noModifier) {
    // debug override (playtest canon: force outcomes)
    const pool = c.debug.forceNextEncounterId
      ? [getEncounterDef(c.debug.forceNextEncounterId)]
      : encountersOf(tier)
    modifierId = pool.length ? r.pick(pool).id : null
    c.debug.forceNextEncounterId = undefined
  } else if (c.chapter === 2 && !opts.isCouncil) {
    bossModifierId = r.pick(BOSS_MODIFIERS).id
    // Oracle siege ultimate — Unveil the Court: the hidden court modifier is
    // read in advance and nullified.
    if (c.heroes.some(h => h.alive && h.classId === 'oracle')) {
      const unveiled = BOSS_MODIFIERS.find(m => m.id === bossModifierId)!
      clog(c, `🔮 UNVEIL THE COURT! The Oracle reads the court's secret — ${unveiled.name} is nullified.`)
      bossModifierId = null
    }
  }

  // Province mode: a boss node is one rank of the split castle — which rank
  // depends on how many rank gates lie behind us (Gates → Courtyard → Throne).
  let rankOnly: 'J' | 'Q' | 'K' | undefined
  let gateRanks: string[] | undefined   // Continent-1 number gates (ch1/ch2)
  // Which gate are we at? 0 = Gates, 1 = Courtyard, 2 = Throne.
  const gateIndex = (nodeId: string) => {
    const node = c.map!.nodes.find(n => n.id === nodeId)!
    return Math.min(c.map!.nodes.filter(n => n.kind === 'boss' && n.layer < node.layer).length, 2)
  }
  // Province-style rank split: gate = one rank per boss node.
  // Active in province mode OR in ascending-deck continent-2 (which also uses PROVINCE_1).
  const useProvinceBossSplit = EXPERIMENTS.provinceMode || (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2)
  if (tier === 'boss' && useProvinceBossSplit && !opts.isCouncil) {
    rankOnly = (['J', 'Q', 'K'] as const)[gateIndex(nodeId)]
  } else if (tier === 'boss' && EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1 && !opts.isCouncil) {
    // Continent-1 ch1/ch2: number gates (Gates/Courtyard/Throne) — never royals.
    gateRanks = C1_GATE_RANKS[c.chapter]?.[gateIndex(nodeId)]
  }

  const heroesAlive = aliveIndices(c)
  // Tutorial: a fixed, scripted enemy order instead of the seeded stack.
  const stackResult = c.tutorial
    ? { cards: tutorialEnemies() }
    : buildEnemyStack(tier, !!opts.isLair, heroesAlive.length, shuffler, rankOnly, opts.isRecruit, c.chapter, c.ownedCards ?? [], opts.isCouncil, gateRanks)
  // If the recruit tier was fully owned, the node degrades to a filler fight
  // (the player already has all the cards — enemies are now generic royals)
  if (stackResult.recruitDegraded) {
    clog(c, `   ⚡ All ${RECRUIT_RANKS_BY_CHAPTER[c.chapter]?.join('+')} cards already owned — recruit node degrades to filler fight.`)
  }
  const s: EncounterState = {
    nodeId, tier, modifierId, bossModifierId,
    bossModifierRevealed: false,
    turnPhase: 'setup',
    currentPlayerIndex: heroesAlive[0]!,
    nextPlayerIndex: heroesAlive[1 % heroesAlive.length]!,
    enemyDeck: stackResult.cards,
    currentEnemy: null,
    defeatedCount: 0,
    totalEnemies: 0,
    hands: c.heroes.map(() => []),
    discard: [],
    tavern: [],
    discardNeeded: 0,
    lastPlayed: [],
    outcome: 'active',
    setupPeek: null,
    wagerArmedBy: null,
    pendingChooseNext: false,
    flags: {},
    events: [],
    eventSeq: 0,
  }
  s.totalEnemies = s.enemyDeck.length
  c.encounter = s

  if (c.shrineBlessing) { s.flags['shrineBlessing'] = true; c.shrineBlessing = false }

  // adopt the persistent deck — no reshuffle between road encounters (canon:
  // only encounters entered from camp/interlude start from a fresh state, and
  // the camp rest itself performs that reset)
  if (tier === 'boss' && EXPERIMENTS.preBossReshuffle) {
    campRest(c)
    clog(c, '🏰 The party regroups at the castle gates — full rest before the assault.')
  }
  const deck = c.deck!
  s.tavern = deck.tavern
  s.discard = deck.discard
  s.hands = deck.hands
  c.deck = null   // live state belongs to the encounter until it ends

  // Shrine blessing: hand cap +1 for this encounter, each hero draws 1 now
  if (s.flags['shrineBlessing']) {
    for (const hi of heroesAlive) drawForHero(c, s, hi, 1)
    clog(c, '⛩ The Shrine’s blessing: everyone draws 1 (hand cap +1 this encounter).')
  }

  // starting hero: Tower / Brace Command override
  if (c.nextStarterIndex !== null && c.heroes[c.nextStarterIndex]?.alive) {
    s.currentPlayerIndex = c.nextStarterIndex
    clog(c, `🏰 ${c.heroes[s.currentPlayerIndex]!.playerName} takes the first turn (planned).`)
  }
  c.nextStarterIndex = null
  s.nextPlayerIndex = nextAliveAfter(c, s.currentPlayerIndex)

  const def = modifierId ? getEncounterDef(modifierId) : null
  // Continent-1 number gates get their own labels (Gates/Courtyard/Throne of numbers).
  const gateNumLabel = gateRanks
    ? gateRanks.length > 1
      ? `THE THRONE — every ${gateRanks.join(' and ')} rises. Complete the rank.`
      : `THE ${gateIndex(nodeId) === 0 ? 'GATES' : 'COURTYARD'} — four ${gateRanks[0]}s bar the way.`
    : null
  const bossLabel = opts.isCouncil ? 'THE COUNCIL OF TENS — all four 10s rise. Defeat them all to ascend.'
    : gateNumLabel ? gateNumLabel
    : rankOnly === 'J' ? 'THE GATES — four Jacks bar the way.'
    : rankOnly === 'Q' ? 'THE COURTYARD — four Queens hold the yard.'
    : rankOnly === 'K' ? 'THE THRONE — four Kings. No retreat.'
    : c.chapter === 1 ? 'The Castle stands before you — 12 royals.' : 'The Broken Court awaits — 12 royals, and something is wrong.'
  clog(c, `⚔️ ${tier === 'boss' ? bossLabel : `Encounter: ${def?.name ?? tier}`}`)
  if (def) clog(c, `   ${def.mechanicText}`)

  revealNextEnemy(c, s)
  // Sanctum Foresight rite: lay the upcoming enemy lineup bare for this fight.
  if (c.foresightNext) {
    s.flags['foreseen'] = true
    c.foresightNext = false
    const upcoming = s.enemyDeck.map(card => cardLabel(card))
    clog(c, upcoming.length
      ? `👁 Foresight reveals what's coming: ${upcoming.join(', ')}.`
      : '👁 Foresight: this foe stands alone.')
  }
  setupPeekPhase(c, s)
  done()
}

function nextAliveAfter(c: CampaignState, idx: number): number {
  const n = c.heroes.length
  for (let step = 1; step <= n; step++) {
    const j = (idx + step) % n
    if (c.heroes[j]!.alive) return j
  }
  return idx
}

// Setup peek priority: Route Intel (top 3, reorder) > Oracle (top 3, reorder)
// > Scry Band (top 2, reorder) > Court Recon memory (top 2, view only).
function setupPeekPhase(c: CampaignState, s: EncounterState) {
  const fog = s.modifierId === 'fog-marker' ? 1 : 0   // Fog Marker hides the top card
  const peek = (heroIdx: number, n: number, canReorder: boolean, source: string) => {
    const cards = s.tavern.slice(-(n + fog), s.tavern.length - fog).reverse()  // top first
    if (!cards.length) return false
    s.setupPeek = { playerId: c.heroes[heroIdx]!.playerId, cards, canReorder, source }
    s.turnPhase = 'setup'
    clog(c, `🔮 ${c.heroes[heroIdx]!.playerName} consults ${source} (top ${cards.length}${fog ? ', one card fogged' : ''}).`)
    return true
  }

  const oracle = c.heroes.findIndex(h => h.alive && h.classId === 'oracle')
  if (oracle >= 0 && peek(oracle, 3, true, "the Oracle’s sight")) {
    return
  }
  const scry = c.heroes.findIndex(h => h.alive && h.relicIds.includes('r-scry-band'))
  if (scry >= 0 && peek(scry, 3, true, 'the Scry Band')) return
  s.turnPhase = 'play'
  clog(c, `👉 ${c.heroes[s.currentPlayerIndex]!.playerName}'s turn.`)
}

export function applySetupReorder(c: CampaignState, playerId: string, order: number[]): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'setup' || !s.setupPeek) return { error: 'No setup peek active.' }
  if (s.setupPeek.playerId !== playerId) return { error: 'Not your peek.' }
  const n = s.setupPeek.cards.length
  const isOracleReorder = c.heroes.find(h => h.playerId === playerId)?.classId === 'oracle'
  if (s.setupPeek.canReorder && order.length === n && [...order].sort().every((v, i) => v === i)) {
    const fog = s.modifierId === 'fog-marker' ? 1 : 0
    const reordered = order.map(i => s.setupPeek!.cards[i]!)
    // write back: top of tavern is end of array
    const base = s.tavern.length - fog - n
    for (let i = 0; i < n; i++) s.tavern[base + i] = reordered[n - 1 - i]!
    clog(c, `🔮 Top of the Tavern rearranged.`)
    // Oracle Displacement: mark the card now at the top so it pays off when played
    if (isOracleReorder && s.tavern.length > 0) {
      const topCard = s.tavern[s.tavern.length - 1 - fog]!
      s.flags['oracleMarked'] = `${topCard.suit}${topCard.rank}`
      clog(c, `🔮 ${topCard.rank}${topCard.suit} marked — Displacement primed.`)
    }
  }
  s.setupPeek = null
  s.turnPhase = 'play'
  clog(c, `👉 ${c.heroes[s.currentPlayerIndex]!.playerName}'s turn.`)
  return {}
}

// ── Enemy lifecycle ──────────────────────────────────────────────────────────

function revealNextEnemy(c: CampaignState, s: EncounterState) {
  if (s.enemyDeck.length === 0) {
    s.currentEnemy = null
    s.outcome = 'won'
    s.turnPhase = 'over'
    return
  }
  const card = s.enemyDeck.shift()!
  ev(s, 'reveal', `${cardLabel(card)} steps forward`, 'blood')
  // Guard: number-rank enemies (Continent-1 recruit fights) use numberEnemyStats;
  // royal-rank enemies use enemyStats. Never pass a number rank to enemyStats —
  // it returns NaN (it only accepts 'J'|'Q'|'K').
  let { hp, attack } = isNumberRank(card.rank)
    ? numberEnemyStats(card.rank as '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10')
    : enemyStats(card.rank as 'J'|'Q'|'K')
  // Continent-1 filler royals (degraded recruit nodes, generic skirmishes) are
  // scaled to the small A–5 deck — a full-stat Jack (20 HP / 10 ATK) is lethal.
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1 && !isNumberRank(card.rank)) {
    hp = Math.ceil(hp * 0.55)
    attack = Math.max(3, Math.ceil(attack * 0.5))
  }
  // Continent-2 royals keep FULL stats (J 20/10 · Q 30/15 · K 40/20). The ch4
  // "decapitation" (8k5jk9uq) wasn't the stats — 6→10 ATK entering C2 is fine; the
  // problem was a 20-ATK King appearing in ACT 1 via the Lair. Fixed structurally:
  // the Lair (with its King) is gated to the end of the continent (see PROVINCE_1).
  // Tutorial: explicit, scripted enemy stats (so every exact-kill is exact).
  if (c.tutorial) {
    const m = tutorialEnemyMeta(card)
    if (m) { hp = m.hp; attack = m.atk; s.flags['tut.reward'] = m.reward }
  }
  const enemy: Enemy = { card, hp, maxHp: hp, attack, shield: 0, immunityNullified: false }
  // Tutorial: the bag / recruit / graft targets seal NO suit (a training dummy
  // doesn't block) — only the royal Gatekeeper keeps immunity, to teach it.
  if (c.tutorial && s.flags['tut.reward'] !== 'kill') enemy.immunityNullified = true

  if (s.bossModifierId === 'iron-court') { enemy.hp += 5; enemy.maxHp += 5 }
  if (s.bossModifierId === 'cruel-court') enemy.attack += 2

  // (Exile's "Tithe of the Severed" siege ultimate was retired — no mechanic may
  // remove a card from the deck. The deck only ever grows. See the Exile class note.)

  // per-enemy hooks reset
  for (const k of Object.keys(s.flags)) if (k.startsWith('enemy.')) delete s.flags[k]
  if (s.modifierId === 'blackwall-captain') s.flags['enemy.guard'] = 3

  s.currentEnemy = enemy
  clog(c, `⚔️ New enemy: ${cardLabel(card)} — ${enemy.hp} HP / ${enemy.attack} ATK${s.flags['enemy.guard'] ? ' / Guard 3' : ''}`)
}

// ── Suit power resolution ────────────────────────────────────────────────────

function drawForHero(c: CampaignState, s: EncounterState, heroIdx: number, n: number): number {
  // No automatic discard recycling: Hearts and camp rests are the only ways
  // the discard returns to the Tavern (attrition canon).
  let drawn = 0
  const max = maxHandSize(c, heroIdx)
  for (let i = 0; i < n; i++) {
    if (s.tavern.length === 0) {
      if (!s.flags['tavernDryLogged']) { s.flags['tavernDryLogged'] = true; clog(c, '🫗 The Tavern runs dry — only ♥ Hearts or a camp rest can refill it.') }
      break
    }
    if (s.hands[heroIdx]!.length >= max) break
    s.hands[heroIdx]!.push(s.tavern.pop()!)
    drawn++
  }
  return drawn
}

function resolveDiamonds(c: CampaignState, s: EncounterState, playerIdx: number, amount: number, leverExtra = 0, allowPause = true) {
  if (leverExtra) { amount += leverExtra; clog(c, `   ♦ Provision: +${leverExtra} to the draw pool.`); ev(s, 'proc', `♦ Provision +${leverExtra}`, 'gold') }
  // modifiers
  if (s.modifierId === 'dry-cart' && once(s, 'dryCartDone')) {
    amount = Math.max(1, amount - 1)
    clog(c, '   🛒 Dry Cart: this draw is reduced by 1.')
  }
  if (s.modifierId === 'starved-caravan') {
    const count = ((s.flags['caravanCount'] as number) ?? 0) + 1
    s.flags['caravanCount'] = count
    if (count % 2 === 1 && amount > 2) {
      amount = 2
      clog(c, '   🐫 Starved Caravan: draw capped at 2.')
    }
  }
  // class / relic / memory access boosts
  // owner-only (playtest canon 2026-06-11): only the Quartermaster's own Diamonds proc
  const qmActive = c.heroes[playerIdx]!.classId === 'quartermaster'
  // Quartermaster: +1 draw ONCE PER FIGHT (canon 2026-06-15 — was once per enemy,
  // which snowballed the multi-enemy number gates). `qmDiamondFight` has no
  // `enemy.` prefix so it survives enemy resets; a fresh encounter clears it.
  if (qmActive && once(s, 'qmDiamondFight')) { amount += 1; clog(c, '   📦 Quartermaster: +1 draw.'); ev(s, 'proc', '📦 Quartermaster +1 draw', 'gold') }
  // (Diamond axis-engine relics retired 2026-06-14 — that role is the Provision token.)

  // ── Ascending-deck: overdraw-and-select ──────────────────────────────────
  // Under the flag, all cards go into a temporary pool; the active player
  // picks which to keep (up to empty hand slots). The rest return to the top
  // of the Tavern. This makes diamond value a selection-quality lever (never
  // wasteful overflow) without touching the multi-hero clockwise logic below.
  if (EXPERIMENTS.ascendingDeck) {
    const pool: Card[] = []
    for (let i = 0; i < amount && s.tavern.length > 0; i++) {
      pool.push(s.tavern.pop()!)
    }
    if (pool.length === 0) {
      clog(c, '   ♦ Tavern empty — nothing to draw.')
      ev(s, 'suit', '♦ Draw 0 (empty)', 'info')
      return
    }
    const emptySlots = maxHandSize(c, playerIdx) - s.hands[playerIdx]!.length
    // Tutorial: scripted reload — draw the top cards in fixed Tavern order, no
    // overdraw-select pause (a rail, not a choice).
    if (c.tutorial) {
      const take = Math.min(pool.length, Math.max(0, emptySlots))
      s.hands[playerIdx]!.push(...pool.slice(0, take))
      for (const card of pool.slice(take).reverse()) s.tavern.push(card)
      clog(c, `   ♦ Reload: drew ${take}.`)
      ev(s, 'suit', `♦ Draw ${take}`, 'info')
      return
    }
    if (emptySlots <= 0 || pool.length <= emptySlots || !allowPause) {
      // Hand is full, pool fits exactly, or pausing is disallowed (kill path) —
      // no selection needed, keep the highest-value cards that fit.
      const take = Math.min(pool.length, Math.max(0, emptySlots))
      pool.sort((a, b) => cardValue(b.rank) - cardValue(a.rank))
      const keep = pool.slice(0, take)
      const ret = pool.slice(take)
      s.hands[playerIdx]!.push(...keep)
      // return the excess to the top of the Tavern (in reverse draw order)
      for (const card of ret.reverse()) s.tavern.push(card)
      clog(c, `   ♦ Drew ${keep.length} card${keep.length !== 1 ? 's' : ''} (${ret.length} returned).`)
      ev(s, 'suit', `♦ Draw ${keep.length}`, 'info')
    } else {
      // Player must choose: pause in draw_select phase
      s.drawPool = pool
      s.drawSelectHeroIdx = playerIdx
      s.turnPhase = 'draw_select'
      clog(c, `   ♦ Drew ${pool.length} into pool — keep up to ${emptySlots} (${pool.length - emptySlots} returns).`)
      ev(s, 'suit', `♦ Pool of ${pool.length} — select ${emptySlots} to keep`, 'info')
    }
    return
  }

  // ── Standard (non-ascending) clockwise draw among alive heroes ────────────
  let remaining = amount
  let idx = playerIdx
  let passes = 0
  while (remaining > 0 && passes < c.heroes.length && s.tavern.length > 0) {
    if (c.heroes[idx]!.alive && s.hands[idx]!.length < maxHandSize(c, idx)) {
      if (drawForHero(c, s, idx, 1) > 0) { remaining--; passes = 0 } else passes++
    } else passes++
    idx = (idx + 1) % c.heroes.length
  }
  clog(c, `   ♦ Drew ${amount - remaining} card${amount - remaining !== 1 ? 's' : ''}.`)
  ev(s, 'suit', `♦ Draw ${amount - remaining}`, 'info')
}

function resolveHearts(c: CampaignState, s: EncounterState, playerIdx: number, amount: number, leverExtra = 0) {
  if (leverExtra) { amount += leverExtra; clog(c, `   ♥ Mend: +${leverExtra} recovery.`); ev(s, 'proc', `♥ Mend +${leverExtra}`, 'gold') }
  if (s.modifierId === 'pale-bell-matron' && ((s.flags['exactKills'] as number) ?? 0) < 2) {
    amount = Math.ceil(amount / 2)
    clog(c, '   🔔 Pale Bell Matron: recovery halved.')
  }
  if (s.modifierId === 'rot-ward') {
    const pen = (s.flags['rotPenalty'] as number) ?? 2
    if (pen > 0) {
      amount = Math.max(0, amount - 1)
      s.flags['rotPenalty'] = pen - 1
      clog(c, '   🦠 Rot Ward: recovery reduced by 1.')
    }
  }
  if (s.tier === 'boss' && EXPERIMENTS.castleHearts) {
    amount *= 2
    clog(c, '   🏰 Castle Hearts: recovery doubled.')
  }
  // owner-only (playtest canon 2026-06-11): only the Surgeon's own Hearts proc
  const surgeonActive = c.heroes[playerIdx]!.classId === 'surgeon'
  if (surgeonActive && once(s, 'enemy.surgeonHeart')) { amount += 1; clog(c, '   ⚕️ Surgeon: +1 recovery.'); ev(s, 'proc', '⚕️ Surgeon +1 recovery', 'gold') }

  const toRecover = Math.min(amount, s.discard.length)
  if (toRecover > 0) {
    const recovered = s.discard.splice(0, toRecover)
    const { r, done } = rng(c)
    s.tavern.unshift(...r.shuffle(recovered))
    done()
  }
  clog(c, `   ♥ Recovered ${toRecover} card${toRecover !== 1 ? 's' : ''} into the Tavern.`)
  ev(s, 'suit', `♥ ${toRecover} back to the Tavern`, 'info')
}

function resolveSpades(c: CampaignState, s: EncounterState, playerIdx: number, amount: number, leverExtra = 0) {
  const enemy = s.currentEnemy!
  let bonus = leverExtra
  if (leverExtra) { clog(c, `   ♠ Plate: +${leverExtra} shield.`); ev(s, 'proc', `♠ Plate +${leverExtra}`, 'gold') }
  const holder = c.heroes[playerIdx]!
  // Sentinel — Spade Commit: all-Spade turn gains +3; mixed-suit turn gains nothing.
  // Decision: commit to Spades for max shield, or mix suits for recovery/draw/damage.
  if (holder.classId === 'sentinel' && s.lastPlayed.every(cd => cd.suit === 'S')) {
    bonus += 3; clog(c, '   🛡 Sentinel: Spade commit — +3 shield.'); ev(s, 'proc', '🛡 Sentinel +3', 'gold')
  }
  // (Spade axis-engine relics retired 2026-06-14 — that role is the Plate token.)

  enemy.shield += amount + bonus
  // spade-reactive modifiers
  s.flags['enemy.spadePlayed'] = true
  s.flags['spadeThisTurn'] = true
  if (s.modifierId === 'blackwall-captain') {
    const g = (s.flags['enemy.guard'] as number) ?? 0
    if (g > 0) { s.flags['enemy.guard'] = g - 1; clog(c, '   ⚫ Guard stripped (remaining: ' + (g - 1) + ').') }
  }
  clog(c, `   ♠ Shield +${amount + bonus} (total ${enemy.shield}, net ATK ${Math.max(0, enemy.attack - enemy.shield)}).`)
  ev(s, 'suit', `♠ Shield +${amount + bonus} → net ${Math.max(0, enemy.attack - enemy.shield)}`, 'info')
}

/**
 * Scry token: foresee the top of the Tavern and **bury your worst upcoming card**
 * to the bottom (drawn last), so your next draws skew higher. By definition it
 * ALWAYS buries one whenever the Tavern has a card (looks at up to the top 3).
 * Tavern is drawn from the END (`pop`), so "top" = the last cards.
 */
function scryTopTavern(c: CampaignState, s: EncounterState) {
  const n = s.tavern.length
  if (n < 1) return
  const k = Math.min(3, n)
  const top = Array.from({ length: k }, (_, i) => n - 1 - i)
  let worst = top[0]!
  for (const i of top) if (cardValue(s.tavern[i]!.rank) < cardValue(s.tavern[worst]!.rank)) worst = i
  const [buried] = s.tavern.splice(worst, 1)
  s.tavern.unshift(buried!)   // to the bottom (drawn last)
  clog(c, `   👁 Scry: you foresee the Tavern and bury ${cardLabel(buried!)} — better draws ahead.`)
  ev(s, 'proc', '👁 Scry — bury worst', 'gold')
}

// ── Core actions ─────────────────────────────────────────────────────────────

function validateCampaignCombo(cards: Card[], maxTotal = 10): string | null {
  if (cards.length === 0) return 'No cards selected.'
  if (cards.length === 1) return null
  if (cards.some(card => card.rank === 'Jo')) return 'Jesters must be played alone.'
  const aces = cards.filter(card => card.rank === 'A')
  const nonAces = cards.filter(card => card.rank !== 'A')
  if (aces.length === 1 && nonAces.length === 1) return null
  if (aces.length > 1) return 'Only one Ace per combo.'
  if (new Set(cards.map(card => card.rank)).size > 1) return 'Cards must share a rank (or pair with an Ace).'
  if (cards.reduce((t, card) => t + cardValue(card.rank), 0) > maxTotal) return `Combo total exceeds ${maxTotal}.`
  return null
}

export function applyEncounterPlay(c: CampaignState, playerId: string, cardIndices: number[]): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active') return { error: 'No active encounter.' }
  if (s.turnPhase !== 'play') return { error: 'Not in play phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }

  const hand = s.hands[pi]!
  const sorted = [...new Set(cardIndices)].sort((a, b) => b - a)
  if (sorted.some(i => i < 0 || i >= hand.length)) return { error: 'Invalid card index.' }
  const cards = sorted.map(i => hand[i]!).reverse()
  // Combat Cache relic: matched combos may total up to 12 instead of 10.
  const comboMax = c.heroes[pi]!.relicIds.includes('r-combat-cache') ? 12 : 10
  const comboError = validateCampaignCombo(cards, comboMax)
  if (comboError) return { error: comboError }
  // Tutorial rail: while a gated beat highlights a card, bounce off-script plays.
  const tutBlock = tutorialBlocksPlay(c, s, hand, cards.map(cd => cd.id))
  if (tutBlock) return { error: tutBlock }

  beginEvents(s)
  for (const i of sorted) hand.splice(i, 1)
  s.lastPlayed = cards
  s.flags['spadeThisTurn'] = false
  recordTutorialPlay(c, s, cards)   // record beat flags before a kill clears lastPlayed
  const hero = c.heroes[pi]!

  // ── Jester ────────────────────────────────────────────────────────────────
  if (cards[0]!.rank === 'Jo') {
    clog(c, `🃏 ${hero.playerName} plays the Jester!`)
    ev(s, 'play', `🃏 ${hero.playerName} plays the Jester!`, 'gold', true)
    s.discard.push(...cards)
    if (s.currentEnemy) { s.currentEnemy.immunityNullified = true; ev(s, 'proc', 'Suit immunity nullified', 'gold') }
    if (aliveIndices(c).length === 1) {
      // solo rule (balance-testing): the Jester is a panic button — discard
      // your whole hand and redraw to full, then keep playing
      s.discard.push(...hand.splice(0))
      const drawn = drawForHero(c, s, pi, maxHandSize(c))
      s.turnPhase = 'play'
      clog(c, `   Solo Jester: hand refreshed (${drawn} card${drawn !== 1 ? 's' : ''} drawn). No counterattack.`)
      ev(s, 'proc', `Hand refreshed — ${drawn} drawn`, 'gold', true)
      return {}
    }
    s.turnPhase = 'choose_next'
    s.pendingChooseNext = false
    return {}
  }

  const enemy = s.currentEnemy!
  const tok = EXPERIMENTS.ascendingDeck   // token effects gated by the flag
  const hasRelic = (id: string) => hero.relicIds.includes(id)
  let base = cards.reduce((sum, card) => sum + cardValue(card.rank), 0)
  if (tok) {
    let sd = cards.reduce((sum, card) => sum + spendDelta(c, card), 0)
    // Catalyst (mythic bridge): once per turn, the value tokens on your FIRST play
    // count double — the abstract amplifier that compounds with a tokened deck.
    if (sd && hasRelic('r-catalyst') && !s.flags[flagKey('catalystUsed', pi)]) {
      s.flags[flagKey('catalystUsed', pi)] = true
      sd *= 2
      clog(c, '   ⚡ Catalyst: first-play token value doubled.')
      ev(s, 'proc', '⚡ Catalyst ×2', 'gold')
    }
    if (sd) {
      base = Math.max(0, base + sd)
      clog(c, `   ✒ Tokens: ${sd > 0 ? '+' : ''}${sd} value (base ${base}).`)
      ev(s, 'proc', `✒ ${sd > 0 ? '+' : ''}${sd} value`, sd > 0 ? 'gold' : 'blood')
    }
    // Glass Core (mythic): your TOKENED cards deal +2 each (the over-token bait).
    const tokenedPlayed = cards.filter(cd => (c.cardTokens?.[`${cd.suit}${cd.rank}`]?.length ?? 0) > 0).length
    if (hasRelic('r-glass-core') && tokenedPlayed) {
      base += 2 * tokenedPlayed
      clog(c, `   💎 Glass Core: +${2 * tokenedPlayed} (tokened cards).`)
      ev(s, 'proc', `💎 Glass Core +${2 * tokenedPlayed}`, 'gold')
    }
  }
  // Warhorn (mythic): flat +2 damage on every play.
  if (hasRelic('r-warhorn')) {
    base += 2
    clog(c, '   📯 Warhorn: +2 damage.')
    ev(s, 'proc', '📯 Warhorn +2', 'gold')
  }
  clog(c, `${hero.playerName} plays ${cards.map(cardLabel).join(' + ')} (base ${base}).`)
  ev(s, 'play', `${hero.playerName}: ${cards.map(cardLabel).join(' + ')}`, 'plain')

  if (s.flags[flagKey('duelCharmReady', pi)]) {
    base += 3
    s.flags[flagKey('duelCharmReady', pi)] = false
    clog(c, '   🏅 Duel Charm: +3 damage.')
    ev(s, 'proc', '🏅 Duel Charm +3', 'gold')
  }

  // Effective suits: under the flag a card fires its base/transmuted suit + grafts.
  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const activeSuits = new Set<string>()
  let immuneBlocked = false
  for (const card of cards) {
    const suits = tok ? cardSuits(c, card) : new Set<string>([card.suit])
    for (const su of suits) { if (su === immuneSuit) immuneBlocked = true; else activeSuits.add(su) }
  }
  if (immuneBlocked) clog(c, `   ${suitSymbol(enemy.card.suit)} power blocked by enemy immunity.`)

  // Lever-magnitude token bonuses (only count cards that actually fire that suit).
  const plateB = tok ? leverBonus(c, cards, 'shield', 'S') : 0
  const drawB = tok ? leverBonus(c, cards, 'draw', 'D') : 0
  const mendB = tok ? leverBonus(c, cards, 'recover', 'H') : 0
  const edgeB = tok ? leverBonus(c, cards, 'edge', 'C') : 0

  let damage = base
  if (activeSuits.has('C')) { damage *= 2; clog(c, `   ♣ Damage doubled: ${base} → ${damage}.`); ev(s, 'suit', `♣ DOUBLE! ${base} → ${damage}`, 'blood', true) }
  if (activeSuits.has('C') && edgeB) { damage += edgeB * 2; clog(c, `   ♣ Edge: +${edgeB * 2} damage → ${damage}.`); ev(s, 'proc', `♣ Edge +${edgeB * 2}`, 'gold') }
  if (tok) { const md = markDamage(c, cards); if (md) { damage += md; clog(c, `   ✦ Mark: +${md} damage → ${damage}.`); ev(s, 'proc', `✦ Mark +${md}`, 'gold') } }
  if (s.flags[flagKey('keenEdge', pi)]) { damage *= 2; s.flags[flagKey('keenEdge', pi)] = false; clog(c, `   ✨ Keen Edge: damage doubled → ${damage}.`); ev(s, 'proc', `✨ Keen Edge ×2 → ${damage}`, 'gold', true) }
  if (s.flags[flagKey('crownbreaker', pi)]) { damage *= 3; s.flags[flagKey('crownbreaker', pi)] = false; clog(c, `   👑 Crownbreaker: damage tripled → ${damage}.`); ev(s, 'proc', `👑 Crownbreaker ×3 → ${damage}`, 'gold', true) }

  if (activeSuits.has('S')) resolveSpades(c, s, pi, base, plateB)
  if (activeSuits.has('H')) resolveHearts(c, s, pi, base, mendB)
  // Diamonds (the draw) resolve AFTER damage/kill below — the draw-select pause
  // must be the LAST thing in the turn so it can suspend the counterattack
  // cleanly instead of being overwritten by it.
  if (tok && hasKeyword(c, cards, 'scry')) scryTopTavern(c, s)

  // Oracle — Displacement: playing the marked card deals +2 damage (+3 at boss)
  if (s.flags['oracleMarked'] && hero.classId === 'oracle' && damage > 0 &&
      cards.some(cd => `${cd.suit}${cd.rank}` === s.flags['oracleMarked']) &&
      once(s, 'oracleMarkUsed')) {
    const bonus = s.tier === 'boss' ? 3 : 2
    damage += bonus
    clog(c, `   🔮 Displacement: the foreseen card strikes — +${bonus} damage.`)
    ev(s, 'proc', `🔮 Displacement +${bonus}`, 'gold')
  }

  // Gambler siege ultimate — All In: once per castle, the Gambler's first
  // strike is doubled or halved on a coin flip.
  if (s.tier === 'boss' && hero.classId === 'gambler' && damage > 0 && once(s, 'ult.gambler')) {
    const { r, done } = rng(c)
    const jackpot = r.next() < 0.5
    done()
    if (jackpot) {
      damage *= 2
      clog(c, `🎲 ALL IN — jackpot! Damage doubled to ${damage}.`)
      ev(s, 'proc', `🎲 ALL IN — ${damage} damage!`, 'gold', true)
    } else {
      damage = Math.max(1, Math.floor(damage / 2))
      clog(c, `🎲 ALL IN — bust. Damage halved to ${damage}.`)
      ev(s, 'proc', '🎲 ALL IN — bust', 'blood', true)
    }
  }

  // ── Damage + threshold abilities ──────────────────────────────────────────
  enemy.hp -= damage
  ev(s, 'damage', `💥 ${damage} damage`, 'blood', true)
  // owner-only (playtest canon 2026-06-11): only the Executioner's own attacks finish
  const execActive = hero.classId === 'executioner'
  // Siege upgrade — Regicide: in the castle, the Executioner's OWN attacks
  // finish royals from 1-4 HP (still once per enemy).
  const regicideWindow = s.tier === 'boss' && !EXPERIMENTS.provinceMode && hero.classId === 'executioner' && enemy.hp >= 1 && enemy.hp <= 4
  if (regicideWindow && once(s, 'enemy.execFinish')) {
    clog(c, `   🪓 REGICIDE! The Executioner finishes the royal from ${enemy.hp} HP.`)
    ev(s, 'proc', '🪓 REGICIDE — finished!', 'gold', true)
    enemy.hp = 0
  } else if ((enemy.hp === 1 || enemy.hp === 2) && execActive && once(s, 'enemy.execFinish')) {
    enemy.hp -= 2
    clog(c, '   🪓 Executioner: +2 finishing damage.')
    ev(s, 'proc', '🪓 Executioner +2 — finish!', 'gold', true)
  }
  clog(c, `   💥 ${damage} damage → ${cardLabel(enemy.card)} at ${Math.max(0, enemy.hp)} HP.`)
  s.discard.push(...cards)

  const wagered = s.wagerArmedBy === pi
  if (enemy.hp <= 0) {
    // Resolve the kill first (reveal the next enemy / set turn state), THEN draw.
    // A kill has no counterattack, so the overdraw selection pause is safe here —
    // on resume `applyKeepDrawn` just returns to play (no `pendingCounterPi`).
    resolveKill(c, s, pi, enemy.hp === 0)
    if (s.outcome === 'active' && s.turnPhase === 'play' && activeSuits.has('D'))
      resolveDiamonds(c, s, pi, base, drawB, true)
    if (wagered) {
      s.wagerArmedBy = null
      const got = drawForHero(c, s, pi, 2)
      clog(c, `🎲 Wager won! The Gambler draws ${got}.`)
      ev(s, 'wager', '🎲 WAGER WON — draw 2', 'gold', true)
      // choose-next is a multiplayer privilege; solo the Gambler just plays on
      if (s.outcome === 'active' && aliveIndices(c).length > 1) { s.turnPhase = 'choose_next'; s.pendingChooseNext = false }
    }
    return {}
  }

  if (wagered) {
    s.wagerArmedBy = null
    const { r, done } = rng(c)
    if (hand.length > 0) {
      const lost = hand.splice(r.int(hand.length), 1)[0]!
      s.discard.push(lost)
      clog(c, `🎲 Wager lost — ${hero.playerName} discards ${cardLabel(lost)}.`)
      ev(s, 'wager', `🎲 Wager lost — ${cardLabel(lost)} gone`, 'blood', true)
    }
    done()
  }

  // (Enemy attack escalation was tried 2026-06-16 off the *first* raw feedback —
  // reverted: the "Updated_Raw" same-session follow-up shows the loop becomes fun
  // once attrition pressure appears NATURALLY, and a per-turn ATK ramp would cut
  // short the long comeback fights that made it click. Keep enemies static.)

  // Enemy survives: now resolve the diamond draw. If it pauses for selection,
  // SUSPEND here — the counterattack runs after the player picks (applyKeepDrawn).
  if (activeSuits.has('D')) resolveDiamonds(c, s, pi, base, drawB, true)
  if (s.turnPhase === 'draw_select') {
    s.flags['pendingCounterPi'] = pi
    return {}
  }

  return counterattack(c, s, pi)
}

function resolveKill(c: CampaignState, s: EncounterState, killerIdx: number, exact: boolean) {
  const enemy = s.currentEnemy!
  s.defeatedCount++
  const numberEnemy = isNumberRank(enemy.card.rank)

  // ── Token kill-triggers (Banner / Bloodprice) on the cards that landed it ──
  if (EXPERIMENTS.ascendingDeck && s.lastPlayed.length) {
    if (hasKeyword(c, s.lastPlayed, 'banner')) {
      const got = drawForHero(c, s, killerIdx, 1)
      if (got) { clog(c, '   ⚑ Banner: the kill draws 1.'); ev(s, 'proc', '⚑ Banner — draw 1', 'gold') }
    }
    if (exact && hasKeyword(c, s.lastPlayed, 'bloodprice')) {
      c.tokenBudget = (c.tokenBudget ?? 0) + 1
      clog(c, '   🩸 Bloodprice: exact kill — +1 forge budget.')
      ev(s, 'proc', '🩸 Bloodprice +1 budget', 'gold')
    }
  }
  // Bloodhound (mythic): every exact kill draws a card — the finesse "win-more".
  if (exact && c.heroes[killerIdx]!.relicIds.includes('r-bloodhound')) {
    const got = drawForHero(c, s, killerIdx, 1)
    if (got) { clog(c, '   🐺 Bloodhound: exact kill draws 1.'); ev(s, 'proc', '🐺 Bloodhound — draw 1', 'gold') }
  }

  // ── Ascending-deck: number-rank enemy resolution (THE GOLDEN RULE) ─────────
  // Exact (perfect) kill → recruit the card if unowned, else a PERMANENT graft
  // onto a hand card (Design_V3: the redundant kill reinforces what you hold —
  // the deck deepens instead of widening; no shard currency).
  // Overkill → nothing: the enemy just dies (no recruit, no graft, no defer).
  if (EXPERIMENTS.ascendingDeck && numberEnemy) {
    const cardId = `${enemy.card.suit}${enemy.card.rank}`
    // "Owned" = a recruited card OR a starting-deck card (A–5 are always in hand).
    // So exact-killing a skirmish low card (a 5) grafts, not a dup recruit.
    const alreadyOwned = cardValue(enemy.card.rank) <= 5 || (c.ownedCards ?? []).includes(cardId)
    // Tutorial punching-bag: dies with no recruit/graft (suit lessons happen on it).
    if (c.tutorial && s.flags['tut.reward'] === 'none') {
      clog(c, `✅ ${cardLabel(enemy.card)} defeated.`)
      ev(s, 'kill', `✅ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
      advanceAfterNumberKill(c, s, killerIdx)
      return
    }
    if (exact && !alreadyOwned) {
      // First time recruiting this number-enemy: card enters the Tavern.
      // §F: the recruit gets its physical identity now — the runtime card that
      // slides under the Tavern carries the physicalId from this moment on.
      enemy.card.id = registerLogicalCard(c, cardId).physicalId
      s.tavern.unshift(enemy.card)
      c.ownedCards = [...(c.ownedCards ?? []), cardId]
      s.flags['exactKills'] = ((s.flags['exactKills'] as number) ?? 0) + 1
      clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} recruited — slides under the Tavern.`)
      ev(s, 'kill', `✨ RECRUIT — ${cardLabel(enemy.card)} joins the Tavern`, 'gold', true)
      if (c.tutorial) s.flags['tut.recruited'] = true
    } else if (exact) {
      // Replacement graft (V3 §1): an exact kill on a card you already own
      // rewrites the RANK or the SUIT of one held card to the slain card's —
      // never +1, never a second suit. Royal grafts cap the value at 10 (§3).
      // Decision 3 (2026-07-01): the graft trigger grants no fragment.
      s.flags['exactKills'] = ((s.flags['exactKills'] as number) ?? 0) + 1
      const graftRank = cardValue(enemy.card.rank) >= 10 ? '10' : enemy.card.rank
      // Only pause if a held card can take a meaningful rewrite: it must be
      // registry-backed (§F — jesters/phantoms cannot graft) and differ from
      // the slain face in rank or suit.
      const hand = s.hands[killerIdx] ?? []
      const hasTarget = hand.some(card => !!physicalById(c, card.id)
        && (card.rank !== graftRank || card.suit !== enemy.card.suit))
      if (hasTarget) {
        s.currentEnemy = null
        s.pendingGraft = {
          heroIdx: killerIdx, suit: enemy.card.suit, rank: graftRank,
          slain: `${enemy.card.suit}${enemy.card.rank}`,
        }
        s.turnPhase = 'graft_select'
        clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} already owned — rewrite a card you hold.`)
        ev(s, 'kill', `⚔ GRAFT — rewrite a card you hold`, 'gold', true)
        if (c.tutorial) s.flags['tut.grafted'] = true
        return   // PAUSE: applyGraftSelect resumes via advanceAfterNumberKill
      }
      clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} already owned — nothing to rewrite.`)
      ev(s, 'kill', `✅ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
    } else {
      // Overkill: golden rule — you get nothing but the kill. (Unrecruited tier
      // cards are still completed by the chapter-end backfill.)
      clog(c, `✅ ${cardLabel(enemy.card)} defeated (overkill — no recruit).`)
      ev(s, 'kill', `✅ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
    }
    advanceAfterNumberKill(c, s, killerIdx)
    return
  }

  // ── V3 §3: Continent-2 royals never join by kill — exact kills GRAFT ───────
  // Royals are acquired ONLY at the gates (the 3/2/1 keep-decision). An exact
  // kill on any C2 royal triggers a replacement graft with the value capped at
  // 10; the body is banished either way — no tavern slide, no discard fuel
  // (an overkilled gate royal must not sneak into the player pool).
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2) {
    if (exact) {
      s.flags['exactKills'] = ((s.flags['exactKills'] as number) ?? 0) + 1
      if (s.modifierId === 'rot-ward') {
        const pen = (s.flags['rotPenalty'] as number) ?? 2
        if (pen > 0) s.flags['rotPenalty'] = pen - 1
      }
      const graftRank = '10'   // royal cap (§3)
      const hand = s.hands[killerIdx] ?? []
      const hasTarget = hand.some(card => !!physicalById(c, card.id)
        && (card.rank !== graftRank || card.suit !== enemy.card.suit))
      if (hasTarget) {
        s.currentEnemy = null
        s.pendingGraft = {
          heroIdx: killerIdx, suit: enemy.card.suit, rank: graftRank,
          slain: `${enemy.card.suit}${enemy.card.rank}`,
        }
        s.turnPhase = 'graft_select'
        clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} falls — its power grafts (value capped at 10).`)
        ev(s, 'kill', `⚔ ROYAL GRAFT — rewrite a card you hold`, 'gold', true)
        return   // PAUSE: applyGraftSelect resumes via advanceAfterNumberKill
      }
      clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} falls — nothing to rewrite.`)
      ev(s, 'kill', `✅ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
    } else {
      clog(c, `☠️ ${cardLabel(enemy.card)} defeated — royals swear fealty only at the gates.`)
      ev(s, 'kill', `☠️ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
    }
    advanceAfterNumberKill(c, s, killerIdx)
    return
  }

  // ── Standard royal kill resolution ───────────────────────────────────────
  if (exact) {
    s.tavern.unshift(enemy.card)
    s.flags['exactKills'] = ((s.flags['exactKills'] as number) ?? 0) + 1
    clog(c, `✨ Exact kill! ${cardLabel(enemy.card)} slides under the Tavern.`)
    ev(s, 'kill', `✨ EXACT KILL — ${cardLabel(enemy.card)} joins the Tavern`, 'gold', true)
    if (s.modifierId === 'rot-ward') {
      const pen = (s.flags['rotPenalty'] as number) ?? 2
      if (pen > 0) s.flags['rotPenalty'] = pen - 1
    }
    const hero = c.heroes[killerIdx]!
    // Duel Charm — Edge engine: after EVERY exact kill, prime +3 on the next attack.
    if (hero.relicIds.includes('r-duel-charm')) {
      s.flags[flagKey('duelCharmReady', killerIdx)] = true
      clog(c, '   🏅 Duel Charm primed: +3 on your next attack.')
    }
  } else if (s.tier === 'boss') {
    // Gate royals keep base-Regicide behavior: overkill → discard (recoverable).
    s.discard.push(enemy.card)
    clog(c, `✅ ${cardLabel(enemy.card)} defeated!`)
    ev(s, 'kill', `☠️ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
  } else {
    // Road recruit canon (2026-06-11): only a strictly exact kill recruits a
    // road royal into the deck. Overkilled road royals are banished — they
    // never enter the player pool. This is the deck-inflation guard.
    clog(c, `🪦 ${cardLabel(enemy.card)} overkilled — the royal is banished, never recruited.`)
    ev(s, 'kill', `🪦 ${cardLabel(enemy.card)} BANISHED — no recruit`, 'blood', true)
  }
  s.currentEnemy = null
  revealNextEnemy(c, s)
  if (s.outcome === 'won') {
    clog(c, '🎉 Encounter cleared!')
    ev(s, 'kill', '🎉 ENCOUNTER CLEARED', 'gold', true)
    return
  }

  // Castle checkpoint (canon): once the Queens fall, the discard is shuffled
  // back into the Tavern — fuel for the Kings, but hands are not redrawn.
  // (Tuned down from two full rests, which overshot to ~50% bot wins; the
  // siege ultimates cover hand recovery.)
  if (s.tier === 'boss' && !EXPERIMENTS.provinceMode && s.defeatedCount === Math.ceil((2 * s.totalEnemies) / 3) && s.discard.length > 0) {
    const { r, done } = rng(c)
    s.tavern.push(...r.shuffle(s.discard.splice(0)))
    done()
    clog(c, '🏰 The Queens have fallen — the party gathers its strength for the Kings (discard returns to the Tavern).')
    ev(s, 'proc', '🏰 CHECKPOINT — Tavern refilled', 'gold', true)
  }

  // follow-up turn: killer continues unless initiative is transferred
  s.lastPlayed = []
  const hero = c.heroes[killerIdx]!
  // owner-only (playtest canon): the handoff is the Commander's own privilege,
  // and their kill presses the advantage — draw 1
  const commanderKiller = hero.classId === 'commander'
  if (commanderKiller) {
    // Solo: draw 2 on kill (cascade momentum). Multi: draw 1 (handoff is the power).
    const pressBonus = aliveIndices(c).length === 1 ? 2 : 1
    if (drawForHero(c, s, killerIdx, pressBonus) > 0) {
      clog(c, `   ⚜️ Press the Advantage: the Commander draws ${pressBonus}.`)
      ev(s, 'proc', `⚜️ Press the Advantage +${pressBonus}`, 'gold')
    }
  }
  if (commanderKiller && aliveIndices(c).length > 1) {
    s.turnPhase = 'choose_next'
    s.pendingChooseNext = true   // optional handoff: may keep the turn
    clog(c, `   ⚜️ Initiative may be handed off — ${hero.playerName} chooses who continues.`)
  } else {
    applyKeepTurnPenalties(c, s, killerIdx)
    clog(c, `   ${hero.playerName} continues!`)
  }
}

// Modifier penalties for keeping the follow-up turn after a kill
function applyKeepTurnPenalties(c: CampaignState, s: EncounterState, killerIdx: number) {
  const hand = s.hands[killerIdx]!
  if (s.modifierId === 'wrong-relay' && once(s, 'wrongRelayDone') && hand.length > 0) {
    const { r, done } = rng(c)
    const lost = hand.splice(r.int(hand.length), 1)[0]!
    s.discard.push(lost)
    done()
    clog(c, `   📡 Wrong Relay: ${c.heroes[killerIdx]!.playerName} discards ${cardLabel(lost)}.`)
  }
  if (s.modifierId === 'command-fracture') {
    s.flags['enemy.counterBonus'] = ((s.flags['enemy.counterBonus'] as number) ?? 0) + 2
    clog(c, '   ⚡ Command Fracture: the next counterattack gains +2.')
  }
  if (s.modifierId === 'banner-of-knives') {
    const { r, done } = rng(c)
    for (let k = 0; k < 2 && hand.length > 0; k++) {
      const lost = hand.splice(r.int(hand.length), 1)[0]!
      s.discard.push(lost)
      clog(c, `   🔪 Banner of Knives: ${c.heroes[killerIdx]!.playerName} discards ${cardLabel(lost)}.`)
    }
    done()
  }
}

function counterattack(c: CampaignState, s: EncounterState, pi: number): { error?: string } {
  const enemy = s.currentEnemy!
  let attack = enemy.attack

  // pending bonuses
  const counterIdx = ((s.flags['counterCount'] as number) ?? 0) + 1
  s.flags['counterCount'] = counterIdx

  if (s.modifierId === 'cracked-buckler' && !s.flags['enemy.firstCounterDone'] && !s.flags['enemy.spadePlayed']) {
    attack += 1
    clog(c, '   🛡💔 Cracked Buckler: +1 counterattack.')
  }
  s.flags['enemy.firstCounterDone'] = true

  const pendingBonus = (s.flags['enemy.counterBonus'] as number) ?? 0
  if (pendingBonus) { attack += pendingBonus; s.flags['enemy.counterBonus'] = 0 }

  if (s.modifierId === 'shieldbreaker-line') {
    const pending = (s.flags['shieldbreakPending'] as number) ?? 0
    if (pending) { attack += pending; s.flags['shieldbreakPending'] = 0; clog(c, `   ⛓ Shieldbreaker Line: +${pending}.`) }
  }
  if (s.modifierId === 'garrison-crusher' && counterIdx % 2 === 0) {
    attack += 2
    clog(c, '   🔨 Garrison Crusher (Heavy): +2 counterattack.')
  }
  if (s.modifierId === 'blackwall-captain') {
    const g = (s.flags['enemy.guard'] as number) ?? 0
    if (g > 0) { attack += 1; s.flags['enemy.guard'] = g - 1; clog(c, '   ⚫ Guard consumed: +1 counterattack.') }
  }

  let net = Math.max(0, attack - enemy.shield)
  if (s.flags['bulwarkNegate'] && net > 0) {
    net = 0
    s.flags['bulwarkNegate'] = false
    clog(c, '   🛡 Bulwark: the counterattack is negated entirely.')
  }
  if (s.flags['bulwarkChant'] && net > 0) {
    net = Math.max(0, net - 2)
    s.flags['bulwarkChant'] = false
    clog(c, '   🛡 Bulwark Chant: counterattack reduced by 2.')
  }
  if (s.modifierId === 'hooked-blades' && net === 1 && !s.flags['spadeThisTurn'] && once(s, 'hookedDone')) {
    net = 2
    clog(c, '   🪝 Hooked Blades: 1 damage becomes 2.')
  }
  // Sentinel siege ultimate — Hold the Gate: once per castle, a counterattack
  // against the Sentinel is fully negated.
  if (net > 0 && s.tier === 'boss' && c.heroes[pi]!.classId === 'sentinel' && once(s, 'ult.sentinel')) {
    net = 0
    clog(c, '🛡 HOLD THE GATE! The Sentinel turns the blow aside completely.')
    ev(s, 'proc', '🛡 HOLD THE GATE — negated', 'gold', true)
  }

  if (net === 0) {
    clog(c, '🛡 Fully shielded — no damage taken.')
    ev(s, 'counter', '🛡 FULLY SHIELDED', 'info', true)
    advanceTurn(c, s)
    return {}
  }

  // extra discard requirements
  let needed = net
  if (s.modifierId === 'bleeder-patrol' && once(s, 'bleederDone')) { needed += 1; clog(c, '   🩸 Bleeder Patrol: +1 discard value required.') }
  if (s.modifierId === 'iron-rain-file' && counterIdx % 2 === 0) { needed += 1; clog(c, '   🌧 Iron Rain: +1 discard value required.') }

  const hero = c.heroes[pi]!

  if (needed === 0) { advanceTurn(c, s); return {} }

  // death checks with mitigation chain (HOLD value: tokens can boost/lower soak)
  const coverable = s.hands[pi]!.reduce((t, card) => t + cardValue(card.rank) + (EXPERIMENTS.ascendingDeck ? holdDelta(c, card) : 0), 0)
  if (coverable < needed && hero.relicIds.includes('r-last-lantern') && once(s, flagKey('lantern', pi))) {
    needed = Math.max(1, needed - 4)
    clog(c, '   🏮 Last Lantern: discard check reduced by 4.')
  }
  if (coverable < needed && hero.relicIds.includes('r-iron-reprieve') && !c.ironReprieveUsed) {
    c.ironReprieveUsed = true
    needed = 1
    clog(c, '   ⚙️ Iron Reprieve: death prevented — discard check set to 1.')
  }

  // Warden siege ultimate — Deathward: once per castle, the first death is
  // prevented; the hero discards what they can and stands.
  if (coverable < needed && s.tier === 'boss' && !EXPERIMENTS.provinceMode &&
      c.heroes.some(h => h.alive && h.classId === 'warden') && once(s, 'ult.warden')) {
    clog(c, `🕯 DEATHWARD! The Warden pulls ${hero.playerName} back from the brink.`)
    ev(s, 'proc', '🕯 DEATHWARD — death prevented', 'gold', true)
    if (coverable === 0) { advanceTurn(c, s); return {} }
    needed = coverable
  }

  if (coverable < needed) {
    heroDies(c, s, pi, needed)
    return {}
  }

  s.turnPhase = 'discard'
  s.discardNeeded = needed
  clog(c, `💔 Counterattack for ${needed} — ${hero.playerName} must discard ≥ ${needed}.`)
  ev(s, 'counter', `💔 COUNTERATTACK ${needed} → ${hero.playerName}`, 'blood', true)
  return {}
}

export function applyEncounterDiscard(c: CampaignState, playerId: string, cardIndices: number[]): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'discard') return { error: 'Not in discard phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }
  if (cardIndices.length === 0) return { error: 'Select at least one card.' }

  const hand = s.hands[pi]!
  const sorted = [...new Set(cardIndices)].sort((a, b) => b - a)
  if (sorted.some(i => i < 0 || i >= hand.length)) return { error: 'Invalid card index.' }
  const cards = sorted.map(i => hand[i]!)
  const total = cards.reduce((t, card) => t + cardValue(card.rank) + (EXPERIMENTS.ascendingDeck ? holdDelta(c, card) : 0), 0)
  if (total < s.discardNeeded) return { error: `Total ${total} is less than ${s.discardNeeded}.` }
  // Tutorial rail: keep players from paying counters with a card a beat still needs.
  const tutDiscardBlock = tutorialBlocksDiscard(c, hand, cards)
  if (tutDiscardBlock) return { error: tutDiscardBlock }

  beginEvents(s)
  for (const i of sorted) hand.splice(i, 1)
  s.discard.push(...cards)
  clog(c, `${c.heroes[pi]!.playerName} discards ${cards.map(cardLabel).join(', ')} (${total}/${s.discardNeeded}).`)
  ev(s, 'info', `${c.heroes[pi]!.playerName} pays ${total} in cards`, 'plain')
  s.discardNeeded = 0
  if (c.tutorial) s.flags['tut.discarded'] = true
  advanceTurn(c, s)
  return {}
}

/**
 * Ascending-deck Step 1: the player selects which cards to keep from the
 * overdraw pool. `keepIndices` is the subset of `s.drawPool` to keep;
 * the rest are returned to the top of the Tavern.
 */
export function applyKeepDrawn(c: CampaignState, playerId: string, keepIndices: number[]): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'draw_select') return { error: 'Not in draw-select phase.' }
  if (!EXPERIMENTS.ascendingDeck) return { error: 'Ascending deck is not active.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.drawSelectHeroIdx) return { error: 'Not your draw selection.' }
  const pool = s.drawPool ?? []
  if (pool.length === 0) return { error: 'Draw pool is empty.' }

  // Diamonds cap by empty hand slots; a spell (Tactical Surge) sets a fixed cap.
  const keepMax = s.drawSelectCap ?? (maxHandSize(c, pi) - s.hands[pi]!.length)
  const unique = [...new Set(keepIndices)]
  if (unique.some(i => i < 0 || i >= pool.length)) return { error: 'Invalid pool index.' }
  if (unique.length > keepMax) return { error: `Can keep at most ${keepMax} cards.` }

  // validate-then-mutate
  beginEvents(s)
  const kept: Card[] = []
  const returned: Card[] = []
  for (let i = 0; i < pool.length; i++) {
    if (unique.includes(i)) kept.push(pool[i]!)
    else returned.push(pool[i]!)
  }

  s.hands[pi]!.push(...kept)
  // return rest to top of Tavern in the original pool order (first was drawn first)
  for (const card of returned.reverse()) s.tavern.push(card)

  s.drawPool = undefined
  s.drawSelectHeroIdx = undefined
  s.drawSelectCap = undefined
  s.turnPhase = 'play'

  clog(c, `   ♦ ${c.heroes[pi]!.playerName} keeps ${kept.length} card${kept.length !== 1 ? 's' : ''}, returns ${returned.length}.`)
  ev(s, 'suit', `♦ Kept ${kept.length}, returned ${returned.length}`, 'info')

  // Resume the suspended turn: the diamond draw paused before the counterattack.
  if (s.flags['pendingCounterPi'] !== undefined) {
    const cpi = s.flags['pendingCounterPi'] as number
    delete s.flags['pendingCounterPi']
    return counterattack(c, s, cpi)
  }
  return {}
}

/** Shared post-kill advance for ascending-deck number enemies: clear the dead
 *  enemy, reveal the next, resolve win / keep-turn. Also the resume point after a
 *  graft_select pause. (Hoisted — used by the kill resolver above.) */
function advanceAfterNumberKill(c: CampaignState, s: EncounterState, killerIdx: number) {
  // Restore the play baseline (a graft_select pause may have left it elsewhere);
  // revealNextEnemy / applyKeepTurnPenalties below re-derive the real phase.
  s.turnPhase = 'play'
  s.currentEnemy = null
  revealNextEnemy(c, s)
  if (s.outcome === 'won') {
    // A gate (boss) finishes via checkEncounterEnd's boss path; only a road
    // fight announces the clear here.
    if (s.tier !== 'boss') {
      clog(c, '🎉 Encounter cleared!')
      ev(s, 'kill', '🎉 ENCOUNTER CLEARED', 'gold', true)
    }
  } else {
    s.lastPlayed = []
    const hero = c.heroes[killerIdx]!
    if (hero.classId === 'commander' && aliveIndices(c).length > 1) {
      s.turnPhase = 'choose_next'; s.pendingChooseNext = true
    } else {
      applyKeepTurnPenalties(c, s, killerIdx)
    }
  }
}

/**
 * Resolve a graft_select pause — replacement semantics (V3 §1): the slain
 * card's face rewrites one held card. mode 'value' → the target's RANK becomes
 * the slain rank (royal-capped at 10); 'suit' → the target's SUIT becomes the
 * slain suit. The rewrite is recorded as §F graft provenance on the physical
 * card (movable at the Sanctum); the printed face never changes.
 * cardIndex < 0 declines the graft. Resumes the post-kill flow.
 */
export function applyGraftSelect(
  c: CampaignState, playerId: string, cardIndex: number, mode: 'value' | 'suit',
): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'graft_select') return { error: 'Not in graft-select phase.' }
  if (!EXPERIMENTS.ascendingDeck) return { error: 'Ascending deck is not active.' }
  const g = s.pendingGraft
  if (!g) return { error: 'No pending graft.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== g.heroIdx) return { error: 'Not your graft to choose.' }

  // Decline: cardIndex < 0 skips the graft entirely.
  if (cardIndex < 0) {
    beginEvents(s)
    clog(c, '   ⚔ Graft declined.')
    ev(s, 'kill', '⚔ Graft declined', 'plain')
    s.pendingGraft = undefined
    advanceAfterNumberKill(c, s, g.heroIdx)
    return {}
  }

  const hand = s.hands[pi] ?? []
  if (cardIndex >= hand.length) return { error: 'Invalid card.' }
  if (mode !== 'value' && mode !== 'suit') return { error: 'Choose value or suit.' }
  const target = hand[cardIndex]!
  const pc = physicalById(c, target.id)
  if (!pc) return { error: 'That card cannot take a graft.' }   // jesters / phantom cards
  const tut = tutorialBlocksGraft(c, target)
  if (tut) return { error: tut }
  const oldLabel = cardLabel(target)
  const oldLogical = `${target.suit}${target.rank}`
  // validate-then-mutate: applyGraft rejects a no-op rewrite without mutating.
  const err = mode === 'value'
    ? applyGraft(c, target.id, 'rank', g.rank, `kill:${g.slain}`)
    : applyGraft(c, target.id, 'suit', g.suit, `kill:${g.slain}`)
  if (err) return { error: err }

  // Reflect the new effective face on the live hand card, and carry any legacy
  // stamped tokens (class signatures, forge marks) to the new logical key.
  const f = effectiveFace(pc)
  target.suit = f.suit as Suit
  target.rank = f.rank as Card['rank']
  rekeyCardTokens(c, oldLogical, `${f.suit}${f.rank}`)

  beginEvents(s)
  const label = mode === 'value' ? `value → ${g.rank}` : `suit → ${suitSymbol(g.suit as Suit)}`
  clog(c, `   ⚔ Graft: ${oldLabel} becomes ${cardLabel(target)} (${label}).`)
  ev(s, 'kill', `⚔ GRAFT — ${oldLabel} ➜ ${cardLabel(target)}`, 'gold', true)
  s.pendingGraft = undefined
  advanceAfterNumberKill(c, s, g.heroIdx)
  return {}
}

export function applyEncounterYield(c: CampaignState, playerId: string): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'play') return { error: 'Can only yield in play phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }
  beginEvents(s)
  s.flags['spadeThisTurn'] = false
  clog(c, `🏳 ${c.heroes[pi]!.playerName} yields.`)
  ev(s, 'info', `🏳 ${c.heroes[pi]!.playerName} yields`, 'plain')
  return counterattack(c, s, pi)
}

export function applyEncounterChooseNext(c: CampaignState, playerId: string, targetIndex: number, keepTurn: boolean): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'choose_next') return { error: 'Not in choose-next phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }

  if (s.pendingChooseNext && keepTurn) {
    // optional post-kill handoff declined
    s.pendingChooseNext = false
    s.turnPhase = 'play'
    applyKeepTurnPenalties(c, s, pi)
    clog(c, `${c.heroes[pi]!.playerName} keeps the initiative.`)
    return {}
  }
  if (targetIndex < 0 || targetIndex >= c.heroes.length || !c.heroes[targetIndex]!.alive) return { error: 'Invalid hero.' }

  if (s.pendingChooseNext) {
    // post-kill handoff (Commander): target plays immediately
    if (targetIndex === pi) {
      applyKeepTurnPenalties(c, s, pi)
    }
    s.pendingChooseNext = false
    s.currentPlayerIndex = targetIndex
    s.nextPlayerIndex = nextAliveAfter(c, targetIndex)
    s.turnPhase = 'play'
    s.lastPlayed = []
    clog(c, `⚜️ Initiative passes to ${c.heroes[targetIndex]!.playerName}.`)
    // Commander siege ultimate — Rally the Line: the first castle handoff to
    // an ally also re-arms them with 2 cards.
    if (s.tier === 'boss' && targetIndex !== pi &&
        c.heroes.some(h => h.alive && h.classId === 'commander') && once(s, 'ult.commander')) {
      const got = drawForHero(c, s, targetIndex, 2)
      if (got > 0) {
        clog(c, `⚜️ RALLY THE LINE! ${c.heroes[targetIndex]!.playerName} draws ${got}.`)
        ev(s, 'proc', `⚜️ RALLY — +${got} cards`, 'gold', true)
      }
    }
    return {}
  }

  // jester / wager: choose who takes the next turn
  s.currentPlayerIndex = targetIndex
  s.nextPlayerIndex = nextAliveAfter(c, targetIndex)
  s.turnPhase = 'play'
  s.lastPlayed = []
  clog(c, `👉 ${c.heroes[targetIndex]!.playerName}'s turn.`)
  return {}
}

function advanceTurn(c: CampaignState, s: EncounterState) {
  // round/turn bookkeeping for round-based modifiers
  const turnCount = ((s.flags['turnCount'] as number) ?? 0) + 1
  s.flags['turnCount'] = turnCount
  // Catalyst is once-per-turn: clear the per-hero spent flag as the turn passes.
  for (const k of Object.keys(s.flags)) if (k.startsWith('catalystUsed')) delete s.flags[k]

  // ── Siege ultimates + siege items (boss fights only, once per castle) ─────
  // (Class ultimates are canon-mode only; province mode replaces class power
  // with deck curation. Item effects stay live in both modes.)
  if (s.tier === 'boss') {
    // Surgeon — Field Triage: when the Tavern first runs dry, return up to 8
    // discard cards to it.
    if (!EXPERIMENTS.provinceMode &&
        c.heroes.some(h => h.alive && h.classId === 'surgeon') &&
        s.tavern.length === 0 && s.discard.length > 0 && once(s, 'ult.surgeon')) {
      const take = Math.min(8, s.discard.length)
      const back = s.discard.splice(0, take)
      const { r, done } = rng(c)
      s.tavern.push(...r.shuffle(back))
      done()
      clog(c, `⚕️ Field Triage! The Surgeon returns ${take} cards to the Tavern.`)
      ev(s, 'proc', `⚕️ FIELD TRIAGE — ${take} cards back`, 'gold', true)
    }
    // Quartermaster — Last Requisition: when the Quartermaster's hand first
    // empties, the whole party draws back to full.
    const qmIdx = EXPERIMENTS.provinceMode ? -1 : c.heroes.findIndex(h => h.alive && h.classId === 'quartermaster')
    if (qmIdx >= 0 && s.hands[qmIdx]!.length === 0 && s.tavern.length > 0 && once(s, 'ult.quartermaster')) {
      for (const hi of aliveIndices(c)) drawForHero(c, s, hi, maxHandSize(c))
      clog(c, '📦 Last Requisition! The Quartermaster re-arms the whole party.')
      ev(s, 'proc', '📦 LAST REQUISITION — party draws to full', 'gold', true)
    }
  }
  if (s.modifierId === 'shieldbreaker-line') {
    if (!s.flags['spadeThisTurn']) {
      const noSpade = ((s.flags['noSpadeTurns'] as number) ?? 0) + 1
      if (noSpade >= aliveIndices(c).length) {
        s.flags['shieldbreakPending'] = ((s.flags['shieldbreakPending'] as number) ?? 0) + 1
        s.flags['noSpadeTurns'] = 0
      } else s.flags['noSpadeTurns'] = noSpade
    } else s.flags['noSpadeTurns'] = 0
  }

  const whistle = s.flags['whistleNext']
  if (typeof whistle === 'number' && c.heroes[whistle]?.alive) {
    s.currentPlayerIndex = whistle
    delete s.flags['whistleNext']
  } else {
    s.currentPlayerIndex = nextAliveAfter(c, s.currentPlayerIndex)
  }
  s.nextPlayerIndex = nextAliveAfter(c, s.currentPlayerIndex)
  s.turnPhase = 'play'
  s.lastPlayed = []
  s.flags['spadeThisTurn'] = false
  clog(c, `👉 ${c.heroes[s.currentPlayerIndex]!.playerName}'s turn.`)
}

// ── Death ────────────────────────────────────────────────────────────────────

function heroDies(c: CampaignState, s: EncounterState, pi: number, unpayable: number) {
  const hero = c.heroes[pi]!
  hero.alive = false
  s.discard.push(...s.hands[pi]!)
  s.hands[pi] = []
  ev(s, 'death', `💀 ${hero.playerName} FALLS`, 'blood', true)
  clog(c, `💀 ${hero.playerName} the ${hero.classId} falls — ${unpayable} damage could not be paid.`)

  // Dead is dead: any hero death ends the run. No death vote, no Last Stand,
  // no Warden revive, no camp replacement — the party is offered Try Again or
  // Main Menu at the game-over screen (campaign_lost). (This was province mode's
  // rule; it now applies to every mode.)
  s.outcome = 'wiped'
  s.turnPhase = 'over'
  c.phase = 'campaign_lost'
  clog(c, '☠️ The run ends here. The Kingdom remembers where.')
}

// vote resolution is handled in campaign.ts (it owns campaign-level phases)

// ── Spells / relic activations / wager ───────────────────────────────────────

export function applyCastSpell(c: CampaignState, playerId: string, spellId: string): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active') return { error: 'No active encounter.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi < 0 || !c.heroes[pi]!.alive) return { error: 'You are not in this fight.' }
  if (pi !== s.currentPlayerIndex) return { error: 'Spells are cast on your own turn.' }
  const inv = c.spells.indexOf(spellId)
  if (inv < 0) return { error: 'The team does not have that spell.' }
  const item = getItem(spellId)

  const inPlay = s.turnPhase === 'play'
  const inDiscard = s.turnPhase === 'discard'
  if (spellId === 's-calm-pulse' ? !inDiscard : !inPlay)
    return { error: spellId === 's-calm-pulse' ? 'Calm Pulse is cast during your discard check.' : 'Cast spells during your play phase.' }

  beginEvents(s)
  ev(s, 'spell', `📖 ${item.name}!`, 'gold', true)
  switch (spellId) {
    case 's-keen-edge': s.flags[flagKey('keenEdge', pi)] = true; break
    case 's-crownbreaker': s.flags[flagKey('crownbreaker', pi)] = true; break
    case 's-quick-muster': drawForHero(c, s, pi, 2); break
    case 's-refit': {
      const n = Math.min(3, s.discard.length)
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      break
    }
    case 's-full-recycle': {
      const n = Math.min(6, s.discard.length)
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      drawForHero(c, s, pi, 2)
      break
    }
    case 's-guard-up': if (!s.currentEnemy) return { error: 'No enemy.' }; s.currentEnemy.shield += 3; break
    case 's-bulwark-chant': s.flags['bulwarkChant'] = true; break
    // ── Hail-mary spells (Item 2) ──────────────────────────────────────────────
    case 's-overdrive': s.flags[flagKey('crownbreaker', pi)] = true; break   // next play ×3
    case 's-bulwark': s.flags['bulwarkNegate'] = true; break                 // negate next counter
    case 's-mass-muster': drawForHero(c, s, pi, 4); break
    case 's-full-recovery': {
      const { r, done } = rng(c)
      const n = s.discard.length
      if (n) s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      drawForHero(c, s, pi, maxHandSize(c, pi))   // draw to a full hand
      break
    }
    case 's-execute': {
      if (!s.currentEnemy) return { error: 'No enemy to execute.' }
      if (s.currentEnemy.hp > 10) return { error: 'Execute only finishes an enemy at 10 HP or less.' }
      clog(c, `   ☠️ Execute! ${cardLabel(s.currentEnemy.card)} is cut down.`)
      ev(s, 'kill', `☠️ EXECUTE — ${cardLabel(s.currentEnemy.card)}`, 'gold', true)
      s.currentEnemy.hp = 0
      c.spells.splice(inv, 1)
      clog(c, `📖 ${c.heroes[pi]!.playerName} casts ${item.name}.`)
      resolveKill(c, s, pi, false)   // a save, not a recruit (non-exact)
      return {}
    }
    case 's-tactical-surge': {
      // Rare (rework 2026-06-15): foresee the top 5 of the Tavern and keep 2 —
      // a selective draw worth its rarity in solo (plain draw-1-each was a dud).
      const n = Math.min(5, s.tavern.length)
      if (n === 0) return { error: 'The Tavern is empty — nothing to foresee.' }
      const pool: Card[] = []
      for (let i = 0; i < n; i++) pool.push(s.tavern.pop()!)
      s.drawPool = pool
      s.drawSelectHeroIdx = pi
      s.drawSelectCap = Math.min(2, n)
      s.turnPhase = 'draw_select'
      clog(c, `   🔭 Tactical Surge: foresee the top ${n} — keep ${Math.min(2, n)}.`)
      ev(s, 'proc', `🔭 Top ${n} — keep ${Math.min(2, n)}`, 'gold')
      break
    }
    case 's-calm-pulse': {
      s.discardNeeded = Math.max(0, s.discardNeeded - 2)
      if (s.discardNeeded === 0) { clog(c, `🧘 Calm Pulse clears the check entirely.`); advanceTurn(c, s) }
      break
    }
    default: return { error: 'Spell not implemented.' }
  }
  c.spells.splice(inv, 1)
  clog(c, `📖 ${c.heroes[pi]!.playerName} casts ${item.name}.`)
  return {}
}

const ACTIVATABLE_RELIC_IDS = ['r-bone-thread', 'r-sainted-scalpel']

export function applyActivateRelic(c: CampaignState, playerId: string, targetIndex?: number, relicId?: string): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active') return { error: 'No active encounter.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi < 0 || !c.heroes[pi]!.alive) return { error: 'You are not in this fight.' }
  if (pi !== s.currentPlayerIndex || s.turnPhase !== 'play') return { error: 'Activate relics during your play phase.' }
  const activatable = c.heroes[pi]!.relicIds.filter(r => ACTIVATABLE_RELIC_IDS.includes(r))
  if (activatable.length === 0) return { error: 'No activatable relic equipped.' }
  const relic = relicId && activatable.includes(relicId) ? relicId
    : activatable.length === 1 ? activatable[0]!
    : undefined
  if (!relic) return { error: 'Choose which relic to activate.' }
  if (s.flags[`relicUsed:${relic}:${pi}`]) return { error: 'Relic already used this encounter.' }

  beginEvents(s)
  ev(s, 'relic', `🏺 ${getItem(relic).name}!`, 'gold', true)
  switch (relic) {
    case 'r-bone-thread': {
      const n = Math.min(4, s.discard.length)
      if (n === 0) return { error: 'Discard pile is empty.' }
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      break
    }
    case 'r-sainted-scalpel': {
      const n = Math.min(6, s.discard.length)
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      drawForHero(c, s, pi, 2)
      break
    }
    default: return { error: 'This relic is passive.' }
  }
  s.flags[`relicUsed:${relic}:${pi}`] = true
  clog(c, `🔮 ${c.heroes[pi]!.playerName} activates ${getItem(relic).name}.`)
  return {}
}

// ── Live boost computation (client UI preview) ──────────────────────────────
// Mirrors the once-per-enemy bonuses in the resolve functions so the client
// can show "this card is currently boosted/penalized" without leaking flags.

export interface SuitBoosts {
  S: number
  D: number
  H: number
  dmgPlus: number
  dmgMult: number
  execReady: boolean
  dCap: number | null
  hHalf: boolean
  comboMax: number   // max combo total (Combat Cache raises it 10→12)
}

export function computeBoosts(c: CampaignState, s: EncounterState, hi: number): SuitBoosts {
  const b: SuitBoosts = { S: 0, D: 0, H: 0, dmgPlus: 0, dmgMult: 1, execReady: false, dCap: null, hHalf: false, comboMax: 10 }
  const hero = c.heroes[hi]
  if (!hero?.alive || s.outcome !== 'active') return b
  if (hero.relicIds.includes('r-combat-cache')) b.comboMax = 12

  // spades
  if (hero.classId === 'sentinel') b.S += 3  // max preview; actual fires only on all-Spade turn
  // diamonds
  if (c.heroes.some(h => h.alive && h.classId === 'quartermaster') && !s.flags['qmDiamondFight']) b.D += 1
  if (s.modifierId === 'dry-cart' && !s.flags['dryCartDone']) b.D -= 1
  if (s.modifierId === 'starved-caravan' && (((s.flags['caravanCount'] as number) ?? 0) + 1) % 2 === 1) b.dCap = 2
  // hearts
  if (c.heroes.some(h => h.alive && h.classId === 'surgeon') && !s.flags['enemy.surgeonHeart']) b.H += 1
  if (s.modifierId === 'rot-ward' && ((s.flags['rotPenalty'] as number) ?? 2) > 0) b.H -= 1
  if (s.modifierId === 'pale-bell-matron' && ((s.flags['exactKills'] as number) ?? 0) < 2) b.hHalf = true
  // damage
  if (s.flags[flagKey('keenEdge', hi)]) b.dmgMult *= 2
  if (s.flags[flagKey('crownbreaker', hi)]) b.dmgMult *= 3
  if (s.flags[flagKey('duelCharmReady', hi)]) b.dmgPlus += 3
  b.execReady = c.heroes[hi]?.classId === 'executioner' && !s.flags['enemy.execFinish']   // owner-only canon
  return b
}

export function applyArmWager(c: CampaignState, playerId: string): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active' || s.turnPhase !== 'play') return { error: 'Wager during your play phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }
  if (c.heroes[pi]!.classId !== 'gambler') return { error: 'Only the Gambler wagers.' }
  if (s.flags['gamblerWagerUsed']) return { error: 'The wager is spent this encounter.' }
  if (s.wagerArmedBy !== null) return { error: 'Wager already armed.' }
  beginEvents(s)
  s.wagerArmedBy = pi
  s.flags['gamblerWagerUsed'] = true
  clog(c, `🎲 ${c.heroes[pi]!.playerName} wagers: the enemy dies this turn — or pays for it.`)
  ev(s, 'wager', `🎲 ${c.heroes[pi]!.playerName} WAGERS — kill or pay`, 'gold', true)
  return {}
}

import type { Card, Enemy, Suit } from '../types'
import { cardValue, cardLabel, suitSymbol, enemyStats, jesterCount } from '../deck'
import { createRng } from '../rng'
import type { CampaignState, EncounterState, EncounterTier, EncounterEvent, Hero } from './types'
import { getEncounterDef, getItem, encountersOf, BOSS_MODIFIERS, CLASSES } from './content'
import { EXPERIMENTS, CURATION_CUT } from './experiments'

// Campaign encounter engine. A superset of the base Regicide rules with hook
// points for encounter modifiers, class core abilities, relics, spells,
// preparations and memories. Operates by mutating campaign.encounter in place;
// all actions validate before mutating.

const SUITS: Suit[] = ['C', 'D', 'H', 'S']
const PLAYER_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const

let _uid = 1000
const uid = () => `c${++_uid}`

function clog(c: CampaignState, msg: string) {
  c.log.unshift(msg)
  if (c.log.length > 60) c.log.pop()
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

export function maxHandSize(c: CampaignState): number {
  const base = { 1: 8, 2: 7, 3: 6, 4: 5 }[c.heroes.length] ?? 5
  const s = c.encounter
  let size = base
  if (s?.flags['shrineBlessing']) size += 1
  if (s?.bossModifierId === 'starving-court') size -= 1
  // Reliquary relic: hand cap +1 during boss fights
  if (s?.tier === 'boss' && c.heroes.some(h => h.alive && h.relicId === 'r-reliquary')) size += 1
  // Quartermaster: the party's hand cap is +1 while the Quartermaster stands
  // (Access identity; solo parity fix — measured weakest solo class 2026-06-11)
  if (c.heroes.some(h => h.alive && h.classId === 'quartermaster')) size += 1
  return Math.max(2, size)
}

function rng(c: CampaignState) {
  const r = createRng(c.rngState)
  return {
    r,
    done() { c.rngState = r.state() },
  }
}

function heroHasMemory(h: Hero, id: string): boolean { return h.memories.includes(id) }

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
  let tavern = buildCampaignDeck(c, a => r.shuffle(a))
  // Province mode — class curation (deckbuild option B): each suited class
  // removes its N lowest own-suit cards. Quality up, total runway down.
  if (EXPERIMENTS.provinceMode) {
    const cut = CURATION_CUT[c.heroes.length] ?? 2
    for (const h of c.heroes) {
      const suit = CLASSES[h.classId].suit
      if (!suit) continue
      const lowest = tavern
        .filter(cd => cd.suit === suit && cd.rank !== 'Jo')
        .sort((a, b) => cardValue(a.rank) - cardValue(b.rank))
        .slice(0, cut)
      const ids = new Set(lowest.map(cd => cd.id))
      tavern = tavern.filter(cd => !ids.has(cd.id))
      if (lowest.length)
        clog(c, `🃏 ${h.playerName} curates the deck: ${lowest.length} low ${suitSymbol(suit as Suit)} cards are cut.`)
    }
  }
  c.deck = { tavern, discard: [], hands: c.heroes.map(() => []) }
  const max = maxHandSize(c)
  for (const hi of aliveIndices(c))
    for (let i = 0; i < max; i++)
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
  const max = maxHandSize(c)
  for (const hi of aliveIndices(c))
    for (let i = 0; i < max; i++)
      if (deck.tavern.length) deck.hands[hi]!.push(deck.tavern.pop()!)
  done()
  clog(c, '🔄 The party rests — the deck is reshuffled and hands are redrawn.')
}

/** In-fight full rest: shuffle everything into the Tavern, redraw all hands. */
function castleCheckpoint(c: CampaignState, s: EncounterState) {
  const pool = [...s.tavern, ...s.discard, ...s.hands.flat()]
  const { r, done } = rng(c)
  s.tavern = r.shuffle(pool)
  s.discard = []
  s.hands = c.heroes.map(() => [])
  const max = maxHandSize(c)
  for (const hi of aliveIndices(c))
    for (let i = 0; i < max; i++)
      if (s.tavern.length) s.hands[hi]!.push(s.tavern.pop()!)
  done()
}

/** Camp replacement: the new hero draws a full hand. */
export function dealReplacementHand(c: CampaignState, heroIdx: number) {
  const deck = c.deck
  if (!deck) return
  const max = maxHandSize(c)
  deck.hands[heroIdx] = []
  for (let i = 0; i < max; i++)
    if (deck.tavern.length) deck.hands[heroIdx]!.push(deck.tavern.pop()!)
}

// Encounter composition scales with party size (balance-testing): the boss
// castle is canon and never scales, but road fights shed a body at low
// counts so pressure tracks the party's total hand capacity.
function buildEnemyStack(tier: EncounterTier, isLair: boolean, players: number, shuffler: <T>(a: T[]) => T[], rankOnly?: 'J' | 'Q' | 'K'): Card[] {
  const mk = (rank: 'J' | 'Q' | 'K', suits: Suit[]) => suits.map(suit => ({ suit, rank: rank as Card['rank'], id: uid() }))
  if (tier === 'boss') {
    // province rank fight: one rank, sized by party (solo 2 / duo 3 / party 4)
    if (rankOnly) return shuffler(mk(rankOnly, shuffler([...SUITS]).slice(0, players === 1 ? 2 : players === 2 ? 3 : 4)))
    if (EXPERIMENTS.shortCastle) {
      const ranks: ('J' | 'Q' | 'K')[] = ['J', 'Q', 'K']
      return ranks.flatMap(rank => shuffler(mk(rank, shuffler([...SUITS]).slice(0, 3))))
    }
    return [
      ...shuffler(mk('J', [...SUITS])),
      ...shuffler(mk('Q', [...SUITS])),
      ...shuffler(mk('K', [...SUITS])),
    ]
  }
  const pickSuits = (n: number) => shuffler([...SUITS]).slice(0, n)
  // Province mode: solo road fights are single-royal duels (a solo "skirmish"
  // of 2 Jacks was effectively a gate fight — measurement 2026-06-11).
  const soloProvince = EXPERIMENTS.provinceMode && players === 1
  if (tier === 'skirmish') return mk('J', pickSuits(soloProvince ? 1 : 2))
  if (tier === 'veteran') {
    if (soloProvince) return mk('Q', pickSuits(1))
    return players <= 2
      ? [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1))]
      : [...mk('J', pickSuits(2)), ...mk('Q', pickSuits(1))]
  }
  // elite (lair variant is shorter but heavier)
  if (isLair) return players === 1 ? mk('K', pickSuits(1)) : [...mk('Q', pickSuits(1)), ...mk('K', pickSuits(1))]
  return players === 1
    ? [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1))]
    : [...mk('J', pickSuits(1)), ...mk('Q', pickSuits(1)), ...mk('K', pickSuits(1))]
}

// ── Encounter creation ───────────────────────────────────────────────────────

export function startEncounter(c: CampaignState, nodeId: string, tier: EncounterTier, opts: { isLair?: boolean } = {}) {
  const { r, done } = rng(c)
  const shuffler = <T>(a: T[]) => r.shuffle(a)

  // modifier pick (boss Ch1 has none — canon; boss Ch2 uses hidden boss modifier)
  let modifierId: string | null = null
  let bossModifierId: string | null = null
  if (tier !== 'boss') {
    // debug override (playtest canon: force outcomes)
    const pool = c.debug.forceNextEncounterId
      ? [getEncounterDef(c.debug.forceNextEncounterId)]
      : encountersOf(tier)
    modifierId = pool.length ? r.pick(pool).id : null
    c.debug.forceNextEncounterId = undefined
  } else if (c.chapter === 2) {
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
  if (tier === 'boss' && EXPERIMENTS.provinceMode) {
    const node = c.map!.nodes.find(n => n.id === nodeId)!
    const ranksBefore = c.map!.nodes.filter(n => n.kind === 'boss' && n.layer < node.layer).length
    rankOnly = (['J', 'Q', 'K'] as const)[Math.min(ranksBefore, 2)]
  }

  const heroesAlive = aliveIndices(c)
  const s: EncounterState = {
    nodeId, tier, modifierId, bossModifierId,
    bossModifierRevealed: false,
    preps: [...c.activePreparations],
    turnPhase: 'setup',
    currentPlayerIndex: heroesAlive[0]!,
    nextPlayerIndex: heroesAlive[1 % heroesAlive.length]!,
    enemyDeck: buildEnemyStack(tier, !!opts.isLair, heroesAlive.length, shuffler, rankOnly),
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

  // preparations fire at encounter start, then are consumed (camp canon)
  for (const pid of c.activePreparations) {
    const item = getItem(pid)
    clog(c, `🎒 Preparation active: ${item.name}.`)
    if (pid === 'p-hand-brief') {
      for (let i = 0; i < 2; i++) if (s.tavern.length) s.hands[s.currentPlayerIndex]!.push(s.tavern.pop()!)
    }
    if (pid === 'p-shield-drill') s.flags['prepShieldDrill'] = true
    if (pid === 'p-light-fortify') s.flags['prepLightFortify'] = true
    if (pid === 'p-spare-edge') s.flags['prepSpareEdge'] = true
    if (pid === 'p-fortified-entry') s.flags['prepFortifiedEntry'] = true
    if (pid === 'p-surgical-reserve') s.flags['prepSurgicalReserve'] = true
    if (pid === 'p-route-intel') s.flags['prepRouteIntel'] = true
    if (pid === 'p-last-march') s.flags['prepLastMarch'] = true
    // p-brace-command is consumed at camp (starting hero choice)
  }
  c.activePreparations = []

  const def = modifierId ? getEncounterDef(modifierId) : null
  const bossLabel = rankOnly === 'J' ? 'THE GATES — four Jacks bar the way.'
    : rankOnly === 'Q' ? 'THE COURTYARD — four Queens hold the yard.'
    : rankOnly === 'K' ? 'THE THRONE — four Kings. No retreat.'
    : c.chapter === 1 ? 'The Castle stands before you — 12 royals.' : 'The Broken Court awaits — 12 royals, and something is wrong.'
  clog(c, `⚔️ ${tier === 'boss' ? bossLabel : `Encounter: ${def?.name ?? tier}`}`)
  if (def) clog(c, `   ${def.mechanicText}`)

  revealNextEnemy(c, s)
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

  if (s.flags['prepRouteIntel'] && peek(s.currentPlayerIndex, 3, true, 'Route Intel')) return
  const oracle = c.heroes.findIndex(h => h.alive && h.classId === 'oracle')
  if (oracle >= 0 && peek(oracle, 3, true, 'the Oracle’s sight')) return
  const scry = c.heroes.findIndex(h => h.alive && h.relicId === 'r-scry-band')
  if (scry >= 0 && peek(scry, 2, true, 'the Scry Band')) return
  const recon = c.heroes.findIndex(h => h.alive && heroHasMemory(h, 'm-court-recon'))
  if (recon >= 0 && peek(recon, 2, false, 'Court Recon')) return

  s.turnPhase = 'play'
  clog(c, `👉 ${c.heroes[s.currentPlayerIndex]!.playerName}'s turn.`)
}

export function applySetupReorder(c: CampaignState, playerId: string, order: number[]): { error?: string } {
  const s = c.encounter
  if (!s || s.turnPhase !== 'setup' || !s.setupPeek) return { error: 'No setup peek active.' }
  if (s.setupPeek.playerId !== playerId) return { error: 'Not your peek.' }
  const n = s.setupPeek.cards.length
  if (s.setupPeek.canReorder && order.length === n && [...order].sort().every((v, i) => v === i)) {
    const fog = s.modifierId === 'fog-marker' ? 1 : 0
    const reordered = order.map(i => s.setupPeek!.cards[i]!)
    // write back: top of tavern is end of array
    const base = s.tavern.length - fog - n
    for (let i = 0; i < n; i++) s.tavern[base + i] = reordered[n - 1 - i]!
    clog(c, `🔮 Top of the Tavern rearranged.`)
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
  const { hp, attack } = enemyStats(card.rank as 'J' | 'Q' | 'K')
  const enemy: Enemy = { card, hp, maxHp: hp, attack, shield: 0, immunityNullified: false }

  if (s.bossModifierId === 'iron-court') { enemy.hp += 5; enemy.maxHp += 5 }
  if (s.bossModifierId === 'cruel-court') enemy.attack += 2

  // Exile siege ultimate — Tithe of the Severed: at the first royal's reveal,
  // permanently exile the top 2 Tavern cards; their value wounds the royal
  // (cannot kill outright).
  if (s.tier === 'boss' && !EXPERIMENTS.provinceMode && c.heroes.some(h => h.alive && h.classId === 'exile') &&
      s.tavern.length >= 2 && once(s, 'ult.exile')) {
    const sacrificed = [s.tavern.pop()!, s.tavern.pop()!]
    const wound = Math.min(sacrificed.reduce((t, cd) => t + cardValue(cd.rank), 0), enemy.hp - 1)
    enemy.hp -= wound
    clog(c, `🗡 TITHE OF THE SEVERED! Two cards are exiled forever — ${cardLabel(enemy.card)} takes ${wound} damage.`)
    ev(s, 'proc', `🗡 TITHE — ${wound} damage`, 'gold', true)
  }

  // per-enemy hooks reset
  for (const k of Object.keys(s.flags)) if (k.startsWith('enemy.')) delete s.flags[k]
  if (s.modifierId === 'blackwall-captain') s.flags['enemy.guard'] = 3
  if (s.flags['prepShieldDrill']) { enemy.shield += 2; s.flags['prepShieldDrill'] = false }

  s.currentEnemy = enemy
  clog(c, `⚔️ New enemy: ${cardLabel(card)} — ${enemy.hp} HP / ${enemy.attack} ATK${s.flags['enemy.guard'] ? ' / Guard 3' : ''}`)
}

// ── Suit power resolution ────────────────────────────────────────────────────

function drawForHero(c: CampaignState, s: EncounterState, heroIdx: number, n: number): number {
  // No automatic discard recycling: Hearts and camp rests are the only ways
  // the discard returns to the Tavern (attrition canon).
  let drawn = 0
  const max = maxHandSize(c)
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

function resolveDiamonds(c: CampaignState, s: EncounterState, playerIdx: number, amount: number) {
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
  const qmActive = EXPERIMENTS.ownerOnlyClassTriggers
    ? c.heroes[playerIdx]!.classId === 'quartermaster'
    : c.heroes.some(h => h.alive && h.classId === 'quartermaster')
  if (qmActive && once(s, 'enemy.qmDiamond')) { amount += 1; clog(c, '   📦 Quartermaster: +1 draw.'); ev(s, 'proc', '📦 Quartermaster +1 draw', 'gold') }
  const holder = c.heroes[playerIdx]!
  if (holder.relicId === 'r-field-satchel' && once(s, flagKey('satchel', playerIdx))) amount += 1
  if (holder.relicId === 'r-grand-provision') {
    const used = ((s.flags[flagKey('provision', playerIdx)] as number) ?? 0)
    if (used < 2) { amount += 1; s.flags[flagKey('provision', playerIdx)] = used + 1 }
  }
  if (heroHasMemory(holder, 'm-quartered-rations') && once(s, flagKey('m-rations', playerIdx))) amount += 1

  // clockwise draw among alive heroes
  let remaining = amount
  let idx = playerIdx
  let passes = 0
  const max = maxHandSize(c)
  while (remaining > 0 && passes < c.heroes.length && s.tavern.length > 0) {
    if (c.heroes[idx]!.alive && s.hands[idx]!.length < max) {
      if (drawForHero(c, s, idx, 1) > 0) { remaining--; passes = 0 } else passes++
    } else passes++
    idx = (idx + 1) % c.heroes.length
  }
  clog(c, `   ♦ Drew ${amount - remaining} card${amount - remaining !== 1 ? 's' : ''}.`)
  ev(s, 'suit', `♦ Draw ${amount - remaining}`, 'info')
}

function resolveHearts(c: CampaignState, s: EncounterState, playerIdx: number, amount: number) {
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
  const surgeonActive = EXPERIMENTS.ownerOnlyClassTriggers
    ? c.heroes[playerIdx]!.classId === 'surgeon'
    : c.heroes.some(h => h.alive && h.classId === 'surgeon')
  if (surgeonActive && once(s, 'enemy.surgeonHeart')) { amount += 1; clog(c, '   ⚕️ Surgeon: +1 recovery.'); ev(s, 'proc', '⚕️ Surgeon +1 recovery', 'gold') }
  const holder = c.heroes[playerIdx]!
  if (heroHasMemory(holder, 'm-surgical-notes') && once(s, flagKey('m-notes', playerIdx))) amount += 1

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

function resolveSpades(c: CampaignState, s: EncounterState, playerIdx: number, amount: number) {
  const enemy = s.currentEnemy!
  let bonus = 0
  const holder = c.heroes[playerIdx]!
  if (holder.classId === 'sentinel' && once(s, 'enemy.sentinelSpade')) { bonus += 2; clog(c, '   🛡 Sentinel: +2 shield.'); ev(s, 'proc', '🛡 Sentinel +2 shield', 'gold') }
  if (holder.relicId === 'r-iron-stitch' && once(s, flagKey('stitch', playerIdx))) bonus += 1
  if (holder.relicId === 'r-bastion-sigil') {
    const used = ((s.flags[flagKey('bastion', playerIdx)] as number) ?? 0)
    if (used < 2) { bonus += 1; s.flags[flagKey('bastion', playerIdx)] = used + 1 }
  }
  if (heroHasMemory(holder, 'm-steady-formation') && once(s, flagKey('m-formation', playerIdx))) bonus += 1

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

// ── Core actions ─────────────────────────────────────────────────────────────

function validateCampaignCombo(cards: Card[]): string | null {
  if (cards.length === 0) return 'No cards selected.'
  if (cards.length === 1) return null
  if (cards.some(card => card.rank === 'Jo')) return 'Jesters must be played alone.'
  const aces = cards.filter(card => card.rank === 'A')
  const nonAces = cards.filter(card => card.rank !== 'A')
  if (aces.length === 1 && nonAces.length === 1) return null
  if (aces.length > 1) return 'Only one Ace per combo.'
  if (new Set(cards.map(card => card.rank)).size > 1) return 'Cards must share a rank (or pair with an Ace).'
  if (cards.reduce((t, card) => t + cardValue(card.rank), 0) > 10) return 'Combo total exceeds 10.'
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
  const comboError = validateCampaignCombo(cards)
  if (comboError) return { error: comboError }

  beginEvents(s)
  for (const i of sorted) hand.splice(i, 1)
  s.lastPlayed = cards
  s.flags['spadeThisTurn'] = false
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
  let base = cards.reduce((sum, card) => sum + cardValue(card.rank), 0)
  clog(c, `${hero.playerName} plays ${cards.map(cardLabel).join(' + ')} (base ${base}).`)
  ev(s, 'play', `${hero.playerName}: ${cards.map(cardLabel).join(' + ')}`, 'plain')

  if (s.flags['prepSpareEdge'] && once(s, 'spareEdgeDone')) {
    base += 2
    s.flags['prepSpareEdge'] = false
    clog(c, '   🗡 Spare Edge: +2 damage.')
    ev(s, 'proc', '🗡 Spare Edge +2', 'gold')
  }
  if (s.flags[flagKey('duelCharmReady', pi)]) {
    base += 2
    s.flags[flagKey('duelCharmReady', pi)] = false
    clog(c, '   🏅 Duel Charm: +2 damage.')
    ev(s, 'proc', '🏅 Duel Charm +2', 'gold')
  }

  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const activeSuits = new Set(cards.map(card => card.suit).filter(su => su !== immuneSuit))
  if (cards.some(card => card.suit === immuneSuit))
    clog(c, `   ${suitSymbol(enemy.card.suit)} power blocked by enemy immunity.`)

  let damage = base
  if (activeSuits.has('C')) { damage *= 2; clog(c, `   ♣ Damage doubled: ${base} → ${damage}.`); ev(s, 'suit', `♣ DOUBLE! ${base} → ${damage}`, 'blood', true) }
  if (s.flags[flagKey('keenEdge', pi)]) { damage *= 2; s.flags[flagKey('keenEdge', pi)] = false; clog(c, `   ✨ Keen Edge: damage doubled → ${damage}.`); ev(s, 'proc', `✨ Keen Edge ×2 → ${damage}`, 'gold', true) }
  if (s.flags[flagKey('crownbreaker', pi)]) { damage *= 3; s.flags[flagKey('crownbreaker', pi)] = false; clog(c, `   👑 Crownbreaker: damage tripled → ${damage}.`); ev(s, 'proc', `👑 Crownbreaker ×3 → ${damage}`, 'gold', true) }

  if (activeSuits.has('S')) resolveSpades(c, s, pi, base)
  if (activeSuits.has('H')) resolveHearts(c, s, pi, base)
  if (activeSuits.has('D')) resolveDiamonds(c, s, pi, base)

  // Gambler siege ultimate — All In: once per castle, the Gambler's first
  // strike is doubled or halved on a coin flip.
  if (s.tier === 'boss' && !EXPERIMENTS.provinceMode && hero.classId === 'gambler' && damage > 0 && once(s, 'ult.gambler')) {
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
  if (enemy.hp === 1 && heroHasMemory(hero, 'm-clean-finish') && once(s, 'cleanFinishDone')) {
    enemy.hp -= 1
    clog(c, '   📜 Clean Finish: +1 finishing damage.')
    ev(s, 'proc', '📜 Clean Finish +1', 'gold')
  }
  const execActive = EXPERIMENTS.ownerOnlyClassTriggers
    ? hero.classId === 'executioner'
    : c.heroes.some(h => h.alive && h.classId === 'executioner')
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
    resolveKill(c, s, pi, enemy.hp === 0)
    if (wagered) {
      s.wagerArmedBy = null
      clog(c, '🎲 Wager won! Choose who acts next.')
      ev(s, 'wager', '🎲 WAGER WON', 'gold', true)
      if (s.outcome === 'active') { s.turnPhase = 'choose_next'; s.pendingChooseNext = false }
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

  return counterattack(c, s, pi)
}

function resolveKill(c: CampaignState, s: EncounterState, killerIdx: number, exact: boolean) {
  const enemy = s.currentEnemy!
  s.defeatedCount++
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
    if (hero.relicId === 'r-duel-charm' && once(s, flagKey('duelCharmKill', killerIdx))) {
      s.flags[flagKey('duelCharmReady', killerIdx)] = true
      clog(c, '   🏅 Duel Charm primed: +2 on your next attack.')
    }
    if (heroHasMemory(hero, 'm-first-blood-ledger') && once(s, flagKey('m-ledger', killerIdx))) {
      drawForHero(c, s, killerIdx, 1)
      clog(c, '   📒 First Blood Ledger: drew 1 card.')
    }
  } else {
    s.discard.push(enemy.card)
    clog(c, `✅ ${cardLabel(enemy.card)} defeated!`)
    ev(s, 'kill', `☠️ ${cardLabel(enemy.card)} DEFEATED`, 'gold', true)
  }
  // War Drum relic: in the castle, every fallen royal rallies the party.
  if (s.tier === 'boss' && c.heroes.some(h => h.alive && h.relicId === 'r-war-drum')) {
    for (const hi of aliveIndices(c)) drawForHero(c, s, hi, 1)
    clog(c, '🥁 The War Drum sounds — everyone draws 1.')
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
  const commanderAlive = c.heroes.some(h => h.alive && h.classId === 'commander')
  const guardRotation = heroHasMemory(hero, 'm-guard-rotation') && !s.flags[flagKey('m-rotation', killerIdx)]
  if (commanderAlive || guardRotation) {
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
  if (s.flags['bulwarkChant'] && net > 0) {
    net = Math.max(0, net - 2)
    s.flags['bulwarkChant'] = false
    clog(c, '   🛡 Bulwark Chant: counterattack reduced by 2.')
  }
  if (s.flags['prepFortifiedEntry'] && once(s, 'fortifiedDone')) {
    s.flags['prepFortifiedEntry'] = false
    if (net > 0) { net = 0; clog(c, '   🏯 Fortified Entry: counterattack negated.') }
  }
  if (s.modifierId === 'hooked-blades' && net === 1 && !s.flags['spadeThisTurn'] && once(s, 'hookedDone')) {
    net = 2
    clog(c, '   🪝 Hooked Blades: 1 damage becomes 2.')
  }
  // Sentinel siege ultimate — Hold the Gate: once per castle, a counterattack
  // against the Sentinel is fully negated.
  if (net > 0 && s.tier === 'boss' && !EXPERIMENTS.provinceMode && c.heroes[pi]!.classId === 'sentinel' && once(s, 'ult.sentinel')) {
    net = 0
    clog(c, '🛡 HOLD THE GATE! The Sentinel turns the blow aside completely.')
    ev(s, 'proc', '🛡 HOLD THE GATE — negated', 'gold', true)
  }

  if (net === 0) {
    clog(c, '🛡 Fully shielded — no damage taken.')
    ev(s, 'counter', '🛡 FULLY SHIELDED', 'info', true)
    const hero = c.heroes[pi]!
    if (hero.relicId === 'r-bastion-sigil' && once(s, flagKey('bastionDraw', pi))) {
      drawForHero(c, s, pi, 1)
      clog(c, '   🪨 Bastion Sigil: drew 1 card.')
    }
    advanceTurn(c, s)
    return {}
  }

  // extra discard requirements
  let needed = net
  if (s.modifierId === 'bleeder-patrol' && once(s, 'bleederDone')) { needed += 1; clog(c, '   🩸 Bleeder Patrol: +1 discard value required.') }
  if (s.modifierId === 'iron-rain-file' && counterIdx % 2 === 0) { needed += 1; clog(c, '   🌧 Iron Rain: +1 discard value required.') }

  const hero = c.heroes[pi]!
  if (heroHasMemory(hero, 'm-calm-under-fire') && once(s, flagKey('m-calm', pi))) { needed = Math.max(0, needed - 1) }
  if (s.flags['prepLightFortify'] && once(s, 'lightFortifyDone')) { needed = Math.max(0, needed - 1); s.flags['prepLightFortify'] = false; clog(c, '   🧱 Light Fortify: discard check reduced by 1.') }

  if (needed === 0) { advanceTurn(c, s); return {} }

  // death checks with mitigation chain
  const coverable = s.hands[pi]!.reduce((t, card) => t + cardValue(card.rank), 0)
  if (coverable < needed) {
    if (s.flags['prepSurgicalReserve'] && once(s, 'surgicalDone')) {
      s.flags['prepSurgicalReserve'] = false
      needed = Math.max(1, needed - 3)
      clog(c, '   🚑 Surgical Reserve: discard check reduced by 3.')
    }
  }
  if (coverable < needed && hero.relicId === 'r-last-lantern' && once(s, flagKey('lantern', pi))) {
    needed = Math.max(1, needed - 2)
    clog(c, '   🏮 Last Lantern: discard check reduced by 2.')
  }
  if (coverable < needed && hero.relicId === 'r-iron-reprieve' && !c.ironReprieveUsed) {
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
  const total = cards.reduce((t, card) => t + cardValue(card.rank), 0)
  if (total < s.discardNeeded) return { error: `Total ${total} is less than ${s.discardNeeded}.` }

  beginEvents(s)
  for (const i of sorted) hand.splice(i, 1)
  s.discard.push(...cards)
  clog(c, `${c.heroes[pi]!.playerName} discards ${cards.map(cardLabel).join(', ')} (${total}/${s.discardNeeded}).`)
  ev(s, 'info', `${c.heroes[pi]!.playerName} pays ${total} in cards`, 'plain')
  s.discardNeeded = 0
  advanceTurn(c, s)
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
    // post-kill handoff (Commander / Guard Rotation): target plays immediately
    const hero = c.heroes[pi]!
    if (heroHasMemory(hero, 'm-guard-rotation') && !c.heroes.some(h => h.alive && h.classId === 'commander'))
      s.flags[flagKey('m-rotation', pi)] = true
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
    if (s.tier === 'boss' && !EXPERIMENTS.provinceMode && targetIndex !== pi &&
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
    // Banner of the Last March (preparation): one full rest when the Tavern
    // first runs dry.
    if (s.flags['prepLastMarch'] && s.tavern.length === 0 && (s.discard.length > 0 || s.hands.some(h => h.length > 0))) {
      s.flags['prepLastMarch'] = false
      castleCheckpoint(c, s)
      clog(c, '🚩 The Banner of the Last March is raised — the party takes a full rest.')
      ev(s, 'proc', '🚩 LAST MARCH — full rest', 'gold', true)
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
  clog(c, `   Their memories fade with them.`)
  hero.memories = []

  // Province mode: any death is a full run reset — no votes, no replacements.
  // The Kingdom records where the run ended (rewards-on-death hook).
  if (EXPERIMENTS.provinceMode) {
    // Second wind (once per act, road fights only): the first death is a
    // collapse — the hero stands back up at the cost of their hand and the
    // fight. Rank gates grant no such mercy, and the second fall is final.
    // (Clearing a rank gate restores the mercy — see campaign.ts.)
    const cx = c as CampaignState & { secondWindUsed?: boolean }
    if (s.tier !== 'boss' && !cx.secondWindUsed) {
      cx.secondWindUsed = true
      hero.alive = true
      s.outcome = 'retreated'
      s.turnPhase = 'over'
      clog(c, `🩸 ${hero.playerName} collapses — and crawls back up. One mercy per act; the next fall is final.`)
      ev(s, 'proc', '🩸 SECOND WIND — spent', 'blood', true)
      return
    }
    s.outcome = 'wiped'
    s.turnPhase = 'over'
    c.phase = 'campaign_lost'
    clog(c, '☠️ The run ends here. The Kingdom remembers where.')
    return
  }

  const alive = aliveIndices(c)
  if (alive.length === 0) {
    // solo death insurance (balance-testing): outside boss fights, a solo
    // hero's death drags the lineage to an emergency camp where a forced
    // replacement takes up the banner — memories and relic die with the hero
    if (c.heroes.length === 1 && s.tier !== 'boss') {
      s.outcome = 'retreated'
      s.turnPhase = 'over'
      clog(c, '🩸 The hero falls — and is dragged from the field by their own stubborn lineage.')
      clog(c, '   A successor must take up the banner at camp.')
      return
    }
    s.outcome = 'wiped'
    s.turnPhase = 'over'
    c.phase = 'campaign_lost'
    clog(c, '☠️ The lineage ends here. The Kingdom remembers.')
    return
  }

  if (s.tier === 'boss') {
    // boss canon: Retreat disabled after death — defeat the boss or wipe
    clog(c, '⚔️ No retreat at the castle gates. The fight continues.')
    if (s.currentPlayerIndex === pi) advanceTurn(c, s)
    return
  }

  // death fork: Retreat vs Last Stand (+ Warden Defiant Stand, once per run)
  const wardenAlive = c.heroes.some(h => h.alive && h.classId === 'warden')
  c.phase = 'death_vote'
  c.deathVote = {
    deadHeroIndex: pi,
    votes: {},
    defiantAvailable: wardenAlive && !c.wardenDefiantUsed,
  }
  clog(c, '🗳 The party must decide: Retreat or Last Stand?' + (c.deathVote.defiantAvailable ? ' (The Warden offers a third path.)' : ''))
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
    case 's-tactical-surge': for (const hi of aliveIndices(c)) drawForHero(c, s, hi, 1); break
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

export function applyActivateRelic(c: CampaignState, playerId: string, targetIndex?: number): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active') return { error: 'No active encounter.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi < 0 || !c.heroes[pi]!.alive) return { error: 'You are not in this fight.' }
  if (pi !== s.currentPlayerIndex || s.turnPhase !== 'play') return { error: 'Activate relics during your play phase.' }
  const relic = c.heroes[pi]!.relicId
  if (!relic) return { error: 'No relic equipped.' }
  if (s.flags[flagKey('relicUsed', pi)]) return { error: 'Relic already used this encounter.' }

  beginEvents(s)
  ev(s, 'relic', `🏺 ${getItem(relic).name}!`, 'gold', true)
  switch (relic) {
    case 'r-bone-thread': {
      const n = Math.min(2, s.discard.length)
      if (n === 0) return { error: 'Discard pile is empty.' }
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      break
    }
    case 'r-sainted-scalpel': {
      const n = Math.min(4, s.discard.length)
      const { r, done } = rng(c)
      s.tavern.unshift(...r.shuffle(s.discard.splice(0, n)))
      done()
      drawForHero(c, s, pi, 1)
      break
    }
    case 'r-signal-whistle': {
      if (targetIndex === undefined || !c.heroes[targetIndex]?.alive) return { error: 'Choose a living hero.' }
      s.flags['whistleNext'] = targetIndex
      break
    }
    default: return { error: 'This relic is passive.' }
  }
  s.flags[flagKey('relicUsed', pi)] = true
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
}

export function computeBoosts(c: CampaignState, s: EncounterState, hi: number): SuitBoosts {
  const b: SuitBoosts = { S: 0, D: 0, H: 0, dmgPlus: 0, dmgMult: 1, execReady: false, dCap: null, hHalf: false }
  const hero = c.heroes[hi]
  if (!hero?.alive || s.outcome !== 'active') return b

  // spades
  if (hero.classId === 'sentinel' && !s.flags['enemy.sentinelSpade']) b.S += 2
  if (hero.relicId === 'r-iron-stitch' && !s.flags[flagKey('stitch', hi)]) b.S += 1
  if (hero.relicId === 'r-bastion-sigil' && ((s.flags[flagKey('bastion', hi)] as number) ?? 0) < 2) b.S += 1
  if (heroHasMemory(hero, 'm-steady-formation') && !s.flags[flagKey('m-formation', hi)]) b.S += 1
  // diamonds
  if (c.heroes.some(h => h.alive && h.classId === 'quartermaster') && !s.flags['enemy.qmDiamond']) b.D += 1
  if (hero.relicId === 'r-field-satchel' && !s.flags[flagKey('satchel', hi)]) b.D += 1
  if (hero.relicId === 'r-grand-provision' && ((s.flags[flagKey('provision', hi)] as number) ?? 0) < 2) b.D += 1
  if (heroHasMemory(hero, 'm-quartered-rations') && !s.flags[flagKey('m-rations', hi)]) b.D += 1
  if (s.modifierId === 'dry-cart' && !s.flags['dryCartDone']) b.D -= 1
  if (s.modifierId === 'starved-caravan' && (((s.flags['caravanCount'] as number) ?? 0) + 1) % 2 === 1) b.dCap = 2
  // hearts
  if (c.heroes.some(h => h.alive && h.classId === 'surgeon') && !s.flags['enemy.surgeonHeart']) b.H += 1
  if (heroHasMemory(hero, 'm-surgical-notes') && !s.flags[flagKey('m-notes', hi)]) b.H += 1
  if (s.modifierId === 'rot-ward' && ((s.flags['rotPenalty'] as number) ?? 2) > 0) b.H -= 1
  if (s.modifierId === 'pale-bell-matron' && ((s.flags['exactKills'] as number) ?? 0) < 2) b.hHalf = true
  // damage
  if (s.flags[flagKey('keenEdge', hi)]) b.dmgMult *= 2
  if (s.flags[flagKey('crownbreaker', hi)]) b.dmgMult *= 3
  if (s.flags['prepSpareEdge'] && !s.flags['spareEdgeDone']) b.dmgPlus += 2
  if (s.flags[flagKey('duelCharmReady', hi)]) b.dmgPlus += 2
  b.execReady = c.heroes.some(h => h.alive && h.classId === 'executioner') && !s.flags['enemy.execFinish']
  return b
}

export function applyArmWager(c: CampaignState, playerId: string): { error?: string } {
  const s = c.encounter
  if (!s || s.outcome !== 'active' || s.turnPhase !== 'play') return { error: 'Wager during your play phase.' }
  const pi = c.heroes.findIndex(h => h.playerId === playerId)
  if (pi !== s.currentPlayerIndex) return { error: 'Not your turn.' }
  if (c.heroes[pi]!.classId !== 'gambler') return { error: 'Only the Gambler wagers.' }
  if (c.gamblerWagerUsed) return { error: 'The wager is spent this chapter.' }
  if (s.wagerArmedBy !== null) return { error: 'Wager already armed.' }
  beginEvents(s)
  s.wagerArmedBy = pi
  c.gamblerWagerUsed = true
  clog(c, `🎲 ${c.heroes[pi]!.playerName} wagers: the enemy dies this turn — or pays for it.`)
  ev(s, 'wager', `🎲 ${c.heroes[pi]!.playerName} WAGERS — kill or pay`, 'gold', true)
  return {}
}

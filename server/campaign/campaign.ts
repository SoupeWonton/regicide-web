import { createRng, hashSeed } from '../rng'
import type { Suit, Card } from '../types'
import { suitSymbol, cardValue } from '../deck'
import type {
  CampaignState, ClassId, ClientCampaignState, ClientHero, ClientRoadNode,
  Hero, KingdomState, NodeKind, PendingChoice, Token,
} from './types'
import { CLASSES, TIER1_CLASSES, getItem, itemsOf, RELIC_SLOTS, getEncounterDef, BOSS_MODIFIERS, FORGEABLE_TOKEN_IDS, C_TIER_TOKEN_IDS, getTokenDef, RELIC_UNLOCK_ORDER, SPELL_UNLOCK_ORDER, HAILMARY_SPELL_IDS, MYTHIC_RELIC_IDS, BRIDGE_RELIC_ID, MYTHIC_PER_CONTINENT } from './content'
import { stampToken, projectCardTokens, MAX_TOKENS_PER_CARD } from './tokens'
import { CAMPAIGN_SCHEMA_VERSION, registerLogicalCard, projectPhysicalCards } from './cards'
import { buildMap } from './maps'
import {
  startEncounter, maxHandSize, setupChapterDeck, campRest, dealReplacementHand,
  computeBoosts, RECRUIT_RANKS_BY_CHAPTER,
} from './encounter'
import { buildTutorialDeck, tutorialBeatProjection, tutorialDiscardHints } from './tutorial'
import { loadKingdom, saveKingdom, saveCampaign, appendGameLog } from './store'
import { EXPERIMENTS } from './experiments'
import { RUN_EVENTS } from './events'

// ── Continent helpers (ascending-deck) ───────────────────────────────────────

/** Returns the continent number for a given chapter (ch 1-3 → C1, ch 4-6 → C2, …). */
export function continentOf(chapter: number): number {
  return Math.ceil(chapter / 3)
}

// item pool with party-size gating: relics that need bodies to matter are
// skipped at low counts (Signal Whistle is dead weight under 3 players)
function itemPool(c: CampaignState, kind: 'relic' | 'spell', tier?: 'standard' | 'rare') {
  // Gated by the run's unlocked pool (snapshotted from the Kingdom at creation).
  // Falls back to all items if the snapshot is absent (legacy saves / non-ascending).
  const unlocked = kind === 'relic' ? c.unlockedRelics : c.unlockedSpells
  return itemsOf(kind, tier).filter(i => !unlocked || unlocked.includes(i.id))
}

let _evUid = 50000
const evUid = () => `evc${++_evUid}`

function clog(c: CampaignState, msg: string) {
  c.log.unshift(msg)
  if (c.log.length > 60) c.log.pop()
  appendGameLog(c.id, msg)
}

function rng(c: CampaignState) {
  const r = createRng(c.rngState)
  return { r, done() { c.rngState = r.state() } }
}

// ── Creation / class select ──────────────────────────────────────────────────

export function createCampaign(
  players: { id: string; name: string }[],
  chapter: number,
  seed: string | undefined,
  kingdom: KingdomState,
  runName?: string,
): { campaign?: CampaignState; error?: string } {
  if (players.length < 1 || players.length > 4) return { error: 'Campaign supports 1-4 players.' }
  if (!kingdom.unlockedChapters.includes(chapter)) return { error: `Chapter ${chapter} is not unlocked.` }
  const realSeed = seed?.trim() || Math.random().toString(36).slice(2, 10)
  const c: CampaignState = {
    id: `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    name: runName?.trim().slice(0, 60) || `${players[0]!.name}'s lineage`,
    seed: realSeed,
    rngState: hashSeed(realSeed),
    createdAt: new Date().toISOString(),
    phase: 'class_select',
    chapter,
    heroes: players.map(p => ({
      playerId: p.id, playerName: p.name, classId: 'sentinel' as ClassId,
      alive: true, relicIds: [],
    })),
    map: null,
    encounter: null,
    deck: null,
    spells: [],
    exiledCards: [],
    exileBurden: 0,
    wardenDefiantUsed: false,
    gamblerWagerUsed: false,
    ironReprieveUsed: false,
    nextStarterIndex: null,
    shrineBlessing: false,
    pendingChoice: null,
    deathVote: null,
    classPicks: Object.fromEntries(players.map(p => [p.id, null])),
    log: [],
    debug: {},
    // snapshot the Kingdom's unlocked item pools for this run (meta: grows on death)
    unlockedRelics: [...(kingdom.unlockedRelics ?? [])],
    unlockedSpells: [...(kingdom.unlockedSpells ?? [])],
    itemStopsThisChapter: 0,
  }
  clog(c, `🏰 A new lineage sets out. Seed: ${realSeed}. Chapter ${chapter}.`)
  clog(c, '⚔️ Choose your heroes — the campaign starts with the core roster.')
  return { campaign: c }
}

export function applyClassPick(c: CampaignState, playerId: string, classId: ClassId): { error?: string } {
  if (c.phase !== 'class_select') return { error: 'Not selecting classes.' }
  // New players get only the 4 core classes (TIER1); the other 5 are meta-unlock
  // runway, hidden in the UI and rejected here until unlocks ship. Mirrors the
  // client AVAILABLE_CLASSES list in ClassSelect.vue.
  if (!TIER1_CLASSES.includes(classId)) return { error: 'That class has not been unlocked yet.' }
  if (!(playerId in c.classPicks)) return { error: 'You are not in this campaign.' }
  const taken = Object.entries(c.classPicks).some(([pid, cid]) => pid !== playerId && cid === classId)
  if (taken) return { error: 'That class is already claimed.' }
  c.classPicks[playerId] = classId
  const hero = c.heroes.find(h => h.playerId === playerId)!
  hero.classId = classId
  clog(c, `${hero.playerName} will march as the ${CLASSES[classId].name}.`)

  if (Object.values(c.classPicks).every(v => v !== null)) {
    const { r, done } = rng(c)
    c.map = buildMap(c.chapter, r)
    // No starting relic (canon 2026-06-15): every relic must be purposefully
    // bought (Caravan) or won (Lair / gate spoils). Heroes set out bare.
    done()
    setupChapterDeck(c)
    c.phase = 'road'
    clog(c, `🗺 The road to ${c.chapter === 1 ? 'the First Ascension' : 'the Broken Court'} unfolds. Choose your path.`)
    logNodeCT(c)
  }
  return {}
}

// Launch the scripted onboarding tutorial: force a solo Sentinel, skip class
// select, and drop straight into a fixed-deck / fixed-enemy encounter. Isolated
// behind c.tutorial so the live campaign engine is untouched.
export function startTutorial(c: CampaignState) {
  c.tutorial = true
  c.chapter = 1
  for (const h of c.heroes) { h.classId = 'sentinel'; c.classPicks[h.playerId] = 'sentinel' }
  c.map = {
    variant: 'tutorial',
    nodes: [{ id: 'tut', kind: 'skirmish', known: true, layer: 0, next: [], visited: true, rewardCT: 0, pressureCT: 0 }],
    currentNodeId: 'tut',
  }
  buildTutorialDeck(c)
  startEncounter(c, 'tut', 'skirmish')
  c.phase = 'encounter'
  clog(c, '🎓 Tutorial — First Blood. A safe fight to learn the verbs.')
}

// playtest logging canon: per-node reward/pressure/net CT (server log only)
function logNodeCT(c: CampaignState) {
  if (!c.map) return
  for (const n of c.map.nodes) {
    if (n.kind === 'start') continue
    console.log(`[CT] ${c.id} ${c.map.variant} ${n.id} ${n.kind} reward=${n.rewardCT} pressure=${n.pressureCT} net=${(n.rewardCT - n.pressureCT).toFixed(2)}`)
  }
}

// ── Road movement ────────────────────────────────────────────────────────────

export function applyRoadChoose(c: CampaignState, playerId: string, nodeId: string, hostId: string): { error?: string } {
  if (c.phase !== 'road') return { error: 'Not on the road.' }
  if (playerId !== hostId) return { error: 'The host commits the route (table consensus assumed).' }
  const map = c.map!
  const cur = map.nodes.find(n => n.id === map.currentNodeId)!
  if (!cur.next.includes(nodeId)) return { error: 'That landmark is not reachable — commitment is one-way.' }
  const node = map.nodes.find(n => n.id === nodeId)!
  map.currentNodeId = nodeId
  node.visited = true
  node.known = true
  clog(c, `🥾 The party commits to ${labelOf(node.kind)}.`)
  resolveNode(c, node.id, node.kind)
  return {}
}

// Province canon: the fall of a rank gate sweeps the party forward — the road
// out of a gate commits automatically (pursuit, not planning). Self-guards on
// phase and node kind, so it is safe to call after any choice resolution.
function autoAdvanceAfterGate(c: CampaignState) {
  if (!EXPERIMENTS.autoMarchAfterGates) return
  if (!EXPERIMENTS.provinceMode || c.phase !== 'road' || !c.map) return
  const cur = c.map.nodes.find(n => n.id === c.map!.currentNodeId)
  if (!cur || cur.kind !== 'boss' || cur.next.length === 0) return
  const { r, done } = rng(c)
  const nextId = cur.next.length === 1 ? cur.next[0]! : r.pick(cur.next)
  done()
  const node = c.map.nodes.find(n => n.id === nextId)!
  c.map.currentNodeId = node.id
  node.visited = true
  node.known = true
  clog(c, `🥾 The momentum of the breach carries the party onward — ${labelOf(node.kind)} ahead.`)
  resolveNode(c, node.id, node.kind)
}

function labelOf(kind: NodeKind): string {
  return {
    start: 'the trailhead', camp: 'a camp', boss: 'the castle gates',
    skirmish: 'a skirmish', veteran: 'a veteran patrol', elite: 'an elite warband',
    recruit: 'a recruit encounter', draft: 'a draft',
    forge: 'the Forge', abbey: 'the Abbey', market: 'the Market',
    tower: 'the Tower', shrine: 'the Shrine', lair: 'a Lair',
    event: 'a strange happening',
  }[kind]
}

function resolveNode(c: CampaignState, nodeId: string, kind: NodeKind) {
  switch (kind) {
    case 'skirmish': case 'veteran': case 'elite':
      startEncounter(c, nodeId, kind)
      c.phase = 'encounter'
      break
    case 'recruit':
      // Continent-1: fight number-card enemies that can be recruited on exact kill
      startEncounter(c, nodeId, 'skirmish', { isRecruit: true })
      c.phase = 'encounter'
      break
    case 'lair':
      clog(c, '🕸 The Lair: an elite gate guards a rare prize.')
      startEncounter(c, nodeId, 'elite', { isLair: true })
      c.phase = 'encounter'
      break
    case 'boss': {
      // Council of Tens: ascending-deck mode, chapter 3 (continent 1 finale)
      const isCouncil = EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1 && c.chapter === 3
      if (isCouncil) {
        clog(c, '⚔️ THE COUNCIL OF TENS awaits. All four 10s block the ascent.')
        startEncounter(c, nodeId, 'boss', { isCouncil: true })
      } else {
        startEncounter(c, nodeId, 'boss')
      }
      c.phase = 'encounter'
      break
    }
    case 'camp':
      c.phase = 'camp'
      campRest(c)   // reset canon: rests reshuffle the deck and redraw hands
      clog(c, '🏕 The party makes camp. Plan, prepare, recover.')
      break
    case 'draft': offerDraft(c); break
    case 'forge':
      // Ascending-deck: the Forge stamps TOKENS (offer-menu). Otherwise: a relic.
      if (EXPERIMENTS.ascendingDeck) offerForge(c)
      else offerItems(c, 'relic', 'standard', 2, 'The Forge offers its work — choose a relic.')
      break
    case 'abbey':
      if (EXPERIMENTS.ascendingDeck) offerSanctum(c)
      else offerItems(c, 'spell', 'standard', 2, 'The Abbey shares its rites — choose a spell.')
      break
    case 'market':
      if (EXPERIMENTS.ascendingDeck) offerCaravan(c)
      else offerItems(c, 'spell', 'standard', 3, 'The Market trades in readiness — choose a spell.')
      break
    case 'tower': {
      c.phase = 'landmark'
      c.pendingChoice = {
        kind: 'landmark_reward', forPlayerId: null,
        prompt: 'The Tower grants initiative: choose who starts the next encounter.',
        options: c.heroes.filter(h => h.alive).map(h => ({
          id: `hero-${c.heroes.indexOf(h)}`, label: `${h.playerName} (${CLASSES[h.classId].name})`,
        })),
      }
      // intel canon: certain landmarks reveal boss intel
      if (c.chapter === 2 && c.encounter?.bossModifierId) c.encounter.bossModifierRevealed = true
      c.pendingChoice.options.push({ id: 'intel', label: 'Study the court instead (reveal boss intel)' })
      break
    }
    case 'shrine':
      if (EXPERIMENTS.ascendingDeck) { offerShrine(c); break }
      c.shrineBlessing = true
      clog(c, '⛩ The Shrine blesses the party: next encounter, everyone draws 1 and the hand cap is raised by 1.')
      c.phase = 'road'
      break
    case 'event': {
      const { r, done } = rng(c)
      const event = r.pick(RUN_EVENTS)
      done()
      c.phase = 'landmark'
      c.pendingChoice = {
        kind: 'landmark_reward', forPlayerId: null,
        prompt: `${event.name} — ${event.prompt}`,
        options: event.options.map(o => ({ id: `ev:${event.id}:${o.id}`, label: o.label, detail: o.detail })),
      }
      clog(c, `🎭 ${event.name}.`)
      break
    }
    default:
      c.phase = 'road'
  }
}

// reward CT scales with party size (bible canon: TC/DV scale by player count)
// — small parties see one extra option per reward to close the tolerance gap
function rewardBonus(c: CampaignState): number {
  return c.heroes.length <= 2 ? 1 : 0
}

function offerItems(c: CampaignState, kind: 'relic' | 'spell', tier: 'standard' | 'rare', n: number, prompt: string) {
  const { r, done } = rng(c)
  const owned = new Set([...c.spells, ...c.heroes.flatMap(h => h.relicIds)])
  let pool = itemPool(c, kind, tier).filter(i => !owned.has(i.id))
  if (c.debug.forceNextRewardId) {
    pool = [getItem(c.debug.forceNextRewardId)]
    c.debug.forceNextRewardId = undefined
  }
  const options = r.shuffle(pool).slice(0, n + rewardBonus(c))
  done()
  if (options.length === 0) { clog(c, 'Nothing new on offer here.'); c.phase = 'road'; return }
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null, prompt,
    options: options.map(i => ({ id: i.id, label: `${i.name}${i.tier === 'rare' ? ' ★' : ''}`, detail: i.text })),
  }
}

// ── Ascending-deck item economy (relics/spells from specific places) ─────────
// Relics from the Caravan + important battles; spells from the Sanctum. Both
// draw from the run's unlocked pool. A per-chapter cap keeps item stops to 2-3.

const ITEM_STOPS_PER_CHAPTER = 3

/** True (and counts) if another relic/spell stop is allowed this chapter. */
function consumeItemStop(c: CampaignState): boolean {
  const n = c.itemStopsThisChapter ?? 0
  if (n >= ITEM_STOPS_PER_CHAPTER) return false
  c.itemStopsThisChapter = n + 1
  return true
}

/** Logical card ids carrying a curse (a token with negative spend or hold). */
function cursedCardIds(c: CampaignState): string[] {
  const out: string[] = []
  for (const [id, list] of Object.entries(c.cardTokens ?? {})) {
    if (list.some(t => { const d = getTokenDef(t.defId); return !!d && ((d.spend ?? 0) < 0 || (d.hold ?? 0) < 0) })) out.push(id)
  }
  return out
}

// The Caravan — a MYTHIC relic, paid for by cursing all your 2s (or 3s).
function offerCaravan(c: CampaignState) {
  if (!consumeItemStop(c)) {
    c.tokenBudget = (c.tokenBudget ?? 0) + 1
    clog(c, '🐫 The Caravan has moved on — you salvage a measure of forge budget instead.')
    c.phase = 'road'; autoAdvanceAfterGate(c); return
  }
  const ownedR = new Set(c.heroes.flatMap(h => h.relicIds))
  const pool = MYTHIC_RELIC_IDS.filter(id => !ownedR.has(id))
  if (mythicCapLeft(c) <= 0 || pool.length === 0) {
    clog(c, '🐫 The Caravan has no mythic to offer you.'); c.phase = 'road'; autoAdvanceAfterGate(c); return
  }
  const { r, done } = rng(c)
  const offered = r.shuffle(pool).slice(0, 2)
  done()
  // each offered mythic is bought with a curse on a whole low rank (2s / 3s)
  const options = offered.map((id, i) => {
    const rank = i % 2 === 0 ? '2' : '3'
    return { id: `caravan:mythic:${rank}:${id}`, label: `${getItem(id).name} ★ — curse all your ${rank}s`,
      detail: `${getItem(id).text}  ·  stamps −1 on every ${rank} you own` }
  })
  options.push({ id: 'caravan:skip', label: 'Wave the Caravan on', detail: 'Take no mythic and no curse.' })
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: '🐫 The Caravan — a mythic, for a curse.', options }
}

function applyCaravanMythic(c: CampaignState, optionId: string): { error?: string } {
  const [, , rank, relicId] = optionId.split(':')   // caravan:mythic:<rank>:<relicId>
  c.pendingChoice = null
  if (!relicId || mythicCapLeft(c) <= 0) { c.phase = 'road'; autoAdvanceAfterGate(c); return {} }
  for (const suit of ['C', 'D', 'H', 'S'] as Suit[]) stampToken(c, `${suit}${rank}`, { defId: 'undercut' })
  clog(c, `🖤 The Caravan's price: every ${rank} you own is cursed (−1) — ${getItem(relicId).name} is yours.`)
  if (grantMythic(c, relicId)) return {}   // relic slots full → release choice awaits
  c.phase = 'road'; autoAdvanceAfterGate(c); return {}
}

// Lair "rare token" reward — stamp one strong F-tier token onto a card, free.
function applyLairToken(c: CampaignState): { error?: string } {
  if (!eligibleForgeCards(c).length) { c.pendingChoice = null; c.phase = 'road'; autoAdvanceAfterGate(c); return {} }
  const { r, done } = rng(c)
  const options = ['temper', 'graft', 'edge', 'glasswork'].map(id => {
    const d = getTokenDef(id)!
    if (d.needsSuit) { const suit = r.pick(['C', 'D', 'H', 'S'] as Suit[]); return { id: `forge:${id}:${suit}`, label: `${d.name} ${suitSymbol(suit)}`, detail: d.text } }
    return { id: `forge:${id}`, label: d.name, detail: d.text }
  })
  done()
  options.push({ id: 'forge:done', label: 'Skip the token' })
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'forge_token', forPlayerId: null, freeForge: true, returnTo: 'road', prompt: '🕸 A rare token — stamp it free onto a card.', options }
  return {}
}

// The Sanctum — RITES (economy-and-identity §5). No longer sells held spells (those
// are shop/Lair-only now). Sells immediate, consumed-on-pick transforms applied NOW,
// between fights: Foresight the next fight / Blessing / Cleanse (folds the Shrine in).
// The verb split: Camp rests · Sanctum transforms (now) · Spells answer.
// NOTE: there is deliberately NO "Exile" rite — no mechanic may remove a card from
// the deck. The deck only ever grows (recruit royals; never thin).
function offerSanctum(c: CampaignState) {
  if (!consumeItemStop(c)) {
    c.tokenBudget = (c.tokenBudget ?? 0) + 1
    clog(c, '✨ The Sanctum is spent — you draw a measure of forge budget from its embers.')
    c.phase = 'road'; autoAdvanceAfterGate(c); return
  }
  const options: PendingChoice['options'] = []
  options.push({ id: 'sanctum:foresight', label: '👁 Foresight — read the next encounter', detail: 'See the full enemy lineup of your next fight before it begins.' })
  if (!c.shrineBlessing)
    options.push({ id: 'sanctum:blessing', label: '✨ Blessing — enter the next fight emboldened', detail: 'Next encounter: everyone draws 1 and the hand cap is +1.' })
  if (cursedCardIds(c).length)
    options.push({ id: 'sanctum:cleanse', label: '⛩ Cleanse — lift a curse', detail: 'Removes one −1 curse from a card.' })
  if (options.length === 0) { clog(c, '✨ The Sanctum has no rite you need.'); c.phase = 'road'; autoAdvanceAfterGate(c); return }
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: '✨ The Sanctum — choose a rite (consumed now).', options }
}

function applySanctumRite(c: CampaignState, optionId: string): { error?: string } {
  c.pendingChoice = null
  switch (optionId) {
    case 'sanctum:foresight':
      c.foresightNext = true
      clog(c, '👁 Foresight: the next encounter\'s enemies will be laid bare before the first blow.')
      c.phase = 'road'; autoAdvanceAfterGate(c); return {}
    case 'sanctum:blessing':
      c.shrineBlessing = true
      clog(c, '✨ The Sanctum\'s blessing: next encounter everyone draws 1 and the hand cap is +1.')
      c.phase = 'road'; autoAdvanceAfterGate(c); return {}
    case 'sanctum:cleanse': {
      const cursed = cursedCardIds(c)
      if (cursed.length === 0) { clog(c, '⛩ Nothing to cleanse.'); c.phase = 'road'; autoAdvanceAfterGate(c); return {} }
      c.phase = 'landmark'
      c.pendingChoice = {
        kind: 'landmark_reward', forPlayerId: null,
        prompt: '⛩ The Sanctum — lift a curse from one of your cards.',
        options: cursed.map(id => ({ id: `shrine:cleanse:${id}`, label: `Cleanse ${cardLabelFromId(id)}`, detail: 'Removes one −1 curse.' })),
      }
      return {}
    }
  }
  c.phase = 'road'; autoAdvanceAfterGate(c); return {}
}

// The Shrine — cleanse a curse (or, with none, the old blessing).
function offerShrine(c: CampaignState) {
  const cursed = cursedCardIds(c)
  if (cursed.length === 0) {
    c.shrineBlessing = true
    clog(c, '⛩ The Shrine blesses the party: next encounter everyone draws 1 and the hand cap is +1.')
    c.phase = 'road'; autoAdvanceAfterGate(c); return
  }
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: '⛩ The Shrine — lift a curse from one of your cards.',
    options: cursed.map(id => ({ id: `shrine:cleanse:${id}`, label: `Cleanse ${cardLabelFromId(id)}`, detail: 'Removes one −1 curse.' })),
  }
}

function applyShrineCleanse(c: CampaignState, cardId: string): { error?: string } {
  const list = c.cardTokens?.[cardId]
  if (list) {
    const idx = list.findIndex(t => { const d = getTokenDef(t.defId); return !!d && ((d.spend ?? 0) < 0 || (d.hold ?? 0) < 0) })
    if (idx >= 0) { list.splice(idx, 1); if (list.length === 0) delete c.cardTokens![cardId] }
  }
  clog(c, `⛩ The Shrine lifts a curse from ${cardLabelFromId(cardId)}.`)
  c.pendingChoice = null
  c.phase = 'road'; autoAdvanceAfterGate(c); return {}
}

// ── Ascending-deck forge (Step 5) — stamp tokens on cards ────────────────────
// Offer-menu model: a forge node contributes +1 budget, then offers tokens to
// stamp; each stamp spends 1 budget. Earned budget (backfill redundancy, Council,
// Bloodprice) is spent here too. Two-step pick: choose a token → choose a card.

function cardLabelFromId(id: string): string {
  const suit = id[0]!
  const rank = id.slice(1)
  return `${rank}${suitSymbol(suit as Suit)}`
}

/** Logical card ids in the persistent deck that can still take a token. */
function eligibleForgeCards(c: CampaignState): string[] {
  const deck = c.deck
  if (!deck) return []
  const ids = new Set<string>()
  for (const card of [...deck.tavern, ...deck.discard, ...deck.hands.flat()]) {
    if (card.rank === 'Jo') continue
    const id = `${card.suit}${card.rank}`
    if ((c.cardTokens?.[id]?.length ?? 0) < MAX_TOKENS_PER_CARD) ids.add(id)
  }
  return [...ids].sort()
}

function tokenSummary(c: CampaignState, cardId: string): string | undefined {
  const list = c.cardTokens?.[cardId]
  if (!list?.length) return undefined
  return list.map(t => getTokenDef(t.defId)?.short ?? t.defId).join(' ')
}

function offerForge(c: CampaignState) {
  c.tokenBudget = (c.tokenBudget ?? 0) + 1   // the forge's own contribution
  clog(c, '⚒️ The Forge fires up — stamp tokens onto your cards.')
  presentForgeTokens(c)
}

function presentForgeTokens(c: CampaignState) {
  const budget = c.tokenBudget ?? 0
  if (budget <= 0 || eligibleForgeCards(c).length === 0) {
    if (budget > 0) clog(c, '⚒️ No cards can take more tokens right now.')
    c.pendingChoice = null
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return
  }
  const { r, done } = rng(c)
  const ids = r.shuffle([...FORGEABLE_TOKEN_IDS]).slice(0, 3)
  const options = ids.map(id => {
    const d = getTokenDef(id)!
    if (d.needsSuit) {
      const suit = r.pick(['C', 'D', 'H', 'S'] as Suit[])
      return { id: `forge:${id}:${suit}`, label: `${d.name} ${suitSymbol(suit)}`, detail: d.text }
    }
    return { id: `forge:${id}`, label: d.name, detail: d.text }
  })
  done()
  options.push({ id: 'forge:done', label: 'Leave the forge', detail: `Keep ${budget} budget for later.` })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'forge_token', forPlayerId: null,
    prompt: `The Forge offers its work (budget: ${budget}). Choose a token to stamp.`,
    options,
  }
}

// Fragment track (Continent 1): spend 2 token fragments to apply a weak C-tier
// token, triggerable any time the player is on the road. Reuses the forge_token
// → forge_card two-step, flagged `fragmentApply` so it spends fragments (not the
// Forge budget) and returns to the road instead of looping the forge menu.
// How many fragments buy one C-tier token. Deliberately scarce (~1–4 per
// continent) so the over-upgrade trap is a real choice: too many +value stamps
// and your cards overshoot the exact-kill threshold (playtest 2026-06-16).
export const FRAGMENTS_PER_TOKEN = 6

export function applyFragmentStart(c: CampaignState, _playerId: string, _hostId: string): { error?: string } {
  if (!EXPERIMENTS.ascendingDeck) return { error: 'Fragments are an ascending-deck feature.' }
  if (c.phase !== 'road') return { error: 'Apply fragment tokens from the road.' }
  if (c.pendingChoice) return { error: 'Resolve the current choice first.' }
  if ((c.tokenFragments ?? 0) < FRAGMENTS_PER_TOKEN) return { error: `Collect ${FRAGMENTS_PER_TOKEN} fragments to apply a token.` }
  if (eligibleForgeCards(c).length === 0) return { error: 'No card can take another token.' }
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'forge_token', forPlayerId: null, fragmentApply: true, returnTo: 'road',
    prompt: `Apply a token (${c.tokenFragments}/${FRAGMENTS_PER_TOKEN} fragments). Choose a C-tier token to stamp.`,
    options: [
      ...C_TIER_TOKEN_IDS.map(id => { const d = getTokenDef(id)!; return { id: `forge:${id}`, label: d.name, detail: d.text } }),
      { id: 'forge:done', label: 'Not now', detail: 'Keep your fragments for later.' },
    ],
  }
  return {}
}

function applyForgeToken(c: CampaignState, optionId: string): { error?: string } {
  const fragmentApply = !!c.pendingChoice?.fragmentApply
  const freeForge = !!c.pendingChoice?.freeForge
  const returnTo = c.pendingChoice?.returnTo
  if (optionId === 'forge:done') {
    c.pendingChoice = null
    if (returnTo === 'shop') { presentFragmentShop(c); return {} }   // back to the shop menu
    if (freeForge) { c.phase = 'road'; autoAdvanceAfterGate(c); return {} }   // Lair: skip the free token
    c.phase = fragmentApply ? (returnTo ?? 'road') : 'road'
    if (!fragmentApply) autoAdvanceAfterGate(c)
    return {}
  }
  const [, defId, suit] = optionId.split(':')
  if (!defId || !getTokenDef(defId)) return { error: 'Unknown token.' }
  if (fragmentApply && !C_TIER_TOKEN_IDS.includes(defId)) return { error: 'Fragments apply only C-tier tokens.' }
  const token: Token = suit ? { defId, suit } : { defId }
  const cards = eligibleForgeCards(c)
  if (cards.length === 0) { if (fragmentApply || freeForge) { c.pendingChoice = null; c.phase = returnTo ?? 'road' } else presentForgeTokens(c); return {} }
  const d = getTokenDef(defId)!
  c.pendingChoice = {
    kind: 'forge_card', forPlayerId: c.pendingChoice?.forPlayerId ?? null, forgeToken: token,
    fragmentApply, freeForge, returnTo,
    prompt: `Stamp ${d.name}${suit ? ' ' + suitSymbol(suit as Suit) : ''} on which card?`,
    options: cards.map(id => ({ id, label: cardLabelFromId(id), detail: tokenSummary(c, id) })),
  }
  return {}
}

function applyForgeCard(c: CampaignState, optionId: string, token: Token): { error?: string } {
  const fragmentApply = !!c.pendingChoice?.fragmentApply
  const freeForge = !!c.pendingChoice?.freeForge
  const returnTo = c.pendingChoice?.returnTo
  const err = stampToken(c, optionId, token)
  if (err) return { error: err }
  const d = getTokenDef(token.defId)!
  if (freeForge) {   // Lair rare token — no cost
    clog(c, `   🕸 Stamped ${d.name}${token.suit ? ' ' + suitSymbol(token.suit as Suit) : ''} onto ${cardLabelFromId(optionId)} (free).`)
    c.pendingChoice = null
    c.phase = 'road'; autoAdvanceAfterGate(c)
    return {}
  }
  if (fragmentApply) {
    c.tokenFragments = Math.max(0, (c.tokenFragments ?? 0) - FRAGMENTS_PER_TOKEN)
    clog(c, `   ✦ Applied ${d.name} onto ${cardLabelFromId(optionId)} (${FRAGMENTS_PER_TOKEN} fragments spent).`)
    c.pendingChoice = null
    if (returnTo === 'shop') { presentFragmentShop(c); return {} }
    c.phase = returnTo ?? 'road'
    return {}
  }
  c.tokenBudget = Math.max(0, (c.tokenBudget ?? 0) - 1)
  clog(c, `   ✒ Forged ${d.name}${token.suit ? ' ' + suitSymbol(token.suit as Suit) : ''} onto ${cardLabelFromId(optionId)}.`)
  presentForgeTokens(c)   // offer again while budget remains, else leave the forge
  return {}
}

// ── Post-Council fragment shop (economy-and-identity.md §1) ───────────────────
// Appears at the Continent 1→2 seam; spend banked fragments across four tiers.
const SHOP_COST = { token: FRAGMENTS_PER_TOKEN, spell: 18, relic: 24, premium: 36 }

// ── Mythic relic cap — Caravan + Lair + shop share 3 per continent ───────────
function mythicCapLeft(c: CampaignState): number {
  return Math.max(0, MYTHIC_PER_CONTINENT - (c.mythicThisContinent ?? 0))
}
function grantMythic(c: CampaignState, id: string): boolean {
  c.mythicThisContinent = (c.mythicThisContinent ?? 0) + 1
  return grantItem(c, id)   // true → relic-slot-full release choice pending
}

export function openFragmentShop(c: CampaignState) {
  c.shop = { spellsLeft: 2, premiumLeft: 1 }
  presentFragmentShop(c)
}

function presentFragmentShop(c: CampaignState) {
  const shop = c.shop
  if (!shop) { c.pendingChoice = null; finishChapterTransition(c); return }
  const frags = c.tokenFragments ?? 0
  const { r, done } = rng(c)
  const options: { id: string; label: string; detail?: string }[] = []
  if (frags >= SHOP_COST.token && eligibleForgeCards(c).length)
    options.push({ id: 'shop:token', label: `Stamp a C-tier token  (−${SHOP_COST.token}✦)`, detail: 'Hone / Ballast / Scry / Mark onto one of your cards.' })
  if (frags >= SHOP_COST.spell && shop.spellsLeft > 0)
    for (const id of r.shuffle(HAILMARY_SPELL_IDS.filter(s => !c.spells.includes(s))).slice(0, 2))
      options.push({ id: `shop:spell:${id}`, label: `${getItem(id).name}  (−${SHOP_COST.spell}✦)`, detail: getItem(id).text })
  if (frags >= SHOP_COST.relic && mythicCapLeft(c) > 0) {
    const owned = new Set(c.heroes.flatMap(h => h.relicIds))
    for (const id of r.shuffle(MYTHIC_RELIC_IDS.filter(m => !owned.has(m))).slice(0, 2))
      options.push({ id: `shop:relic:${id}`, label: `${getItem(id).name} ★  (−${SHOP_COST.relic}✦)`, detail: getItem(id).text })
  }
  if (frags >= SHOP_COST.premium && shop.premiumLeft > 0 && !c.heroes.some(h => h.relicIds.includes(BRIDGE_RELIC_ID)))
    options.push({ id: 'shop:premium', label: `${getItem(BRIDGE_RELIC_ID).name} ★★  (−${SHOP_COST.premium}✦)`, detail: getItem(BRIDGE_RELIC_ID).text })
  done()
  options.push({ id: 'shop:done', label: 'Leave — march into Continent 2' })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'shop', forPlayerId: null,
    prompt: `✦ Graduation shop — ${frags} fragments banked. Buy your way into Continent 2.`,
    options,
  }
}

export function applyShopChoice(c: CampaignState, optionId: string): { error?: string } {
  if (!c.shop) return { error: 'The shop is closed.' }
  const frags = c.tokenFragments ?? 0
  if (optionId === 'shop:done') { c.shop = undefined; c.pendingChoice = null; finishChapterTransition(c); return {} }
  if (optionId === 'shop:token') {
    if (frags < SHOP_COST.token || !eligibleForgeCards(c).length) return { error: 'Cannot apply a token now.' }
    c.pendingChoice = {
      kind: 'forge_token', forPlayerId: null, fragmentApply: true, returnTo: 'shop',
      prompt: `Apply a token (−${SHOP_COST.token}✦). Choose a C-tier token.`,
      options: [...C_TIER_TOKEN_IDS.map(id => { const d = getTokenDef(id)!; return { id: `forge:${id}`, label: d.name, detail: d.text } }), { id: 'forge:done', label: 'Back' }],
    }
    return {}
  }
  if (optionId.startsWith('shop:spell:')) {
    const id = optionId.slice('shop:spell:'.length)
    if (frags < SHOP_COST.spell || c.shop.spellsLeft <= 0) return { error: 'Cannot buy that spell.' }
    c.tokenFragments = frags - SHOP_COST.spell; c.shop.spellsLeft--; c.spells.push(id)
    clog(c, `🛒 Bought the spell ${getItem(id).name} (−${SHOP_COST.spell}✦).`)
    presentFragmentShop(c); return {}
  }
  if (optionId.startsWith('shop:relic:')) {
    const id = optionId.slice('shop:relic:'.length)
    if (frags < SHOP_COST.relic || mythicCapLeft(c) <= 0) return { error: 'Cannot buy that relic.' }
    c.tokenFragments = frags - SHOP_COST.relic
    clog(c, `🛒 Bought the mythic relic ${getItem(id).name} (−${SHOP_COST.relic}✦).`)
    if (grantMythic(c, id)) { if (c.pendingChoice) c.pendingChoice.returnTo = 'shop'; return {} }   // slot full → release
    presentFragmentShop(c); return {}
  }
  if (optionId === 'shop:premium') {
    if (frags < SHOP_COST.premium || c.shop.premiumLeft <= 0) return { error: 'Cannot buy the bridge.' }
    c.tokenFragments = frags - SHOP_COST.premium; c.shop.premiumLeft--
    clog(c, `🛒 Bought ${getItem(BRIDGE_RELIC_ID).name} (−${SHOP_COST.premium}✦).`)
    if (grantItem(c, BRIDGE_RELIC_ID)) { if (c.pendingChoice) c.pendingChoice.returnTo = 'shop'; return {} }
    presentFragmentShop(c); return {}
  }
  return { error: 'Unknown shop option.' }
}

// ── Ascending-deck drafts (Step 6) — steer the early deck ────────────────────
// A draft is a solo per-hero pick (forPlayerId-scoped, so it bypasses the
// casino tie-break). Each option bundles an unowned tier card with an immediate
// tempo burst (draw-N-now) — per the locked offer rule, a bare backfill-able
// card never stands alone; it must carry something unobtainable elsewhere, and
// unrepeatable tempo is that thing. (Token / dual-type / forge-exile draft
// archetypes depend on the Step-5 token economy and are intentionally deferred.)
const DRAFT_TEMPO = 3

function offerDraft(c: CampaignState) {
  // Drafts are a Continent-1 deck-steering tool. Outside Continent 1 (or with
  // the flag off) the node degrades to a market so the road never spins.
  if (!(EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1)) {
    offerItems(c, 'spell', 'standard', 3, 'The caravan trades in readiness — choose a spell.')
    return
  }
  const tierRanks = RECRUIT_RANKS_BY_CHAPTER[c.chapter] ?? ['6', '7']
  const suits: Suit[] = ['C', 'D', 'H', 'S']
  const owned = new Set(c.ownedCards ?? [])
  const unowned: { suit: Suit; rank: string }[] = []
  for (const rank of tierRanks)
    for (const suit of suits)
      if (!owned.has(`${suit}${rank}`)) unowned.push({ suit, rank })

  const { r, done } = rng(c)
  const pool = r.shuffle(unowned)
  done()

  const cardOption = (card: { suit: Suit; rank: string }) => ({
    id: `draft:${card.suit}${card.rank}:${DRAFT_TEMPO}`,
    label: `${card.rank}${suitSymbol(card.suit)} + draw ${DRAFT_TEMPO}`,
    detail: `Recruit ${card.rank}${suitSymbol(card.suit)} into your deck now and immediately draw ${DRAFT_TEMPO}.`,
  })
  const plainCardOption = (card: { suit: Suit; rank: string }) => ({
    id: `draft:${card.suit}${card.rank}:0`,
    label: `${card.rank}${suitSymbol(card.suit)} (just the card)`,
    detail: `Recruit ${card.rank}${suitSymbol(card.suit)} into your deck. No tempo rider — a clean add.`,
  })
  const tempoOption = (n: number) => ({
    id: `draft:tempo:${n}`,
    label: `Draw ${n} now`,
    detail: `Pure tempo — immediately draw ${n} cards. Nothing joins the deck.`,
  })
  // Graft archetype (needs Step-5 tokens): add a 2nd suit to one of your cards.
  const graftOption = () => {
    const suit = r.pick(suits)
    return {
      id: `draft:graft:${suit}`,
      label: `Graft ${suitSymbol(suit)} onto a card`,
      detail: `Add ${suitSymbol(suit)} as a second suit to your best eligible card — it then fires two levers.`,
    }
  }
  const canGraft = eligibleForgeCards(c).length > 0

  // Three distinct draft categories (locked 2026-06-15):
  //   A — recruit a tier card you lack + draw 3 (tempo)
  //   B — graft a 2nd suit onto one of your cards (token archetype)
  //   C — a clean tier card, no rider ("just the card")
  // Pad toward three real options; degrade gracefully when the tier runs dry.
  const options: { id: string; label: string; detail?: string }[] = []
  if (pool.length >= 1) options.push(cardOption(pool[0]!))      // A
  if (canGraft) options.push(graftOption())                    // B
  if (pool.length >= 2) options.push(plainCardOption(pool[1]!)) // C
  if (options.length < 3) options.push(tempoOption(DRAFT_TEMPO + 2))
  if (options.length < 2) options.push(tempoOption(DRAFT_TEMPO))
  options.splice(3)   // at most three

  const owner = c.heroes.find(h => h.alive) ?? c.heroes[0]!
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'draft_pick', forPlayerId: owner.playerId,
    prompt: 'A draft — steer your deck. Every option carries an immediate tempo burst.',
    options,
  }
}

export function applyChoice(c: CampaignState, playerId: string, optionId: string, hostId: string): { error?: string } {
  const pc = c.pendingChoice
  if (!pc) return { error: 'Nothing to choose.' }
  const teamVote = pc.kind === 'landmark_reward' && pc.forPlayerId === null && c.heroes.length > 1
  if (!teamVote) {
    const decider = pc.forPlayerId ?? hostId
    if (playerId !== decider) return { error: 'Not your decision.' }
  } else if (!c.heroes.some(h => h.playerId === playerId)) {
    return { error: 'You are not in this campaign.' }
  }
  if (!pc.options.some(o => o.id === optionId)) return { error: 'Invalid option.' }

  if (pc.kind === 'shop') return applyShopChoice(c, optionId)

  if (pc.kind === 'landmark_reward') {
    if (teamVote) {
      // team rewards are a secret ballot: everyone votes, majority wins,
      // ties go to the wheel of fate (client plays the casino draw)
      pc.votes = pc.votes ?? {}
      const firstVote = !(playerId in pc.votes)
      pc.votes[playerId] = optionId
      if (firstVote) {
        const who = c.heroes.find(h => h.playerId === playerId)!
        clog(c, `🗳 ${who.playerName} locks a vote (${Object.keys(pc.votes).length}/${c.heroes.length}).`)
      }
      if (Object.keys(pc.votes).length < c.heroes.length) return {}

      const tally = new Map<string, number>()
      for (const v of Object.values(pc.votes)) tally.set(v, (tally.get(v) ?? 0) + 1)
      const top = Math.max(...tally.values())
      const leaders = [...tally.entries()].filter(([, n]) => n === top).map(([id]) => id)
      let winner = leaders[0]!
      const tie = leaders.length > 1
      if (tie) {
        const { r, done } = rng(c)
        winner = r.pick(leaders)
        done()
        clog(c, '🎰 The vote is tied — fate spins the wheel.')
      } else {
        clog(c, '🗳 The vote settles it.')
      }
      c.rewardDraw = {
        seq: (c.rewardDraw?.seq ?? 0) + 1,
        options: pc.options.filter(o => leaders.includes(o.id)).map(o => ({ id: o.id, label: o.label, detail: o.detail })),
        winnerId: winner,
        tie,
      }
      return resolveRewardOption(c, winner, pc)
    }
    return resolveRewardOption(c, optionId, pc)
  }

  if (pc.kind === 'replacement') {
    return applyReplacementPick(c, playerId, optionId)
  }

  // (exile_pick retired — no mechanic may remove a card from the deck; the deck only grows.)

  if (pc.kind === 'draft_pick') {
    return resolveDraftPick(c, pc, optionId)
  }

  if (pc.kind === 'forge_token') {
    return applyForgeToken(c, optionId)
  }

  if (pc.kind === 'forge_card') {
    if (!pc.forgeToken) { c.pendingChoice = null; c.phase = 'road'; return { error: 'No token to forge.' } }
    return applyForgeCard(c, optionId, pc.forgeToken)
  }

  if (pc.kind === 'relic_full') {
    // optionId is the relic to RELEASE; the holder keeps the other two
    const target = c.heroes.find(h => h.playerId === pc.forPlayerId) ?? c.heroes.find(h => h.alive)!
    const backToShop = pc.returnTo === 'shop'
    target.relicIds = pc.options.map(o => o.id).filter(id => id !== optionId)
    clog(c, `   ${target.playerName} releases ${getItem(optionId).name}; carries ${target.relicIds.map(id => getItem(id).name).join(' & ')}.`)
    c.pendingChoice = null
    if (backToShop) { presentFragmentShop(c); return {} }
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }

  return { error: 'Unhandled choice.' }
}

// resolve a landmark_reward option (after a vote or a direct pick)
function resolveRewardOption(c: CampaignState, optionId: string, pc: PendingChoice): { error?: string } {
  // ascending-deck item-economy special options (Caravan / Sanctum / Shrine)
  if (optionId === 'caravan:skip') {
    c.pendingChoice = null
    clog(c, '🐫 You wave the Caravan on — no mythic, no curse.')
    c.phase = 'road'; autoAdvanceAfterGate(c); return {}
  }
  if (optionId.startsWith('caravan:mythic:')) return applyCaravanMythic(c, optionId)
  if (optionId === 'lair:token') return applyLairToken(c)
  if (optionId.startsWith('sanctum:')) return applySanctumRite(c, optionId)
  if (optionId.startsWith('shrine:cleanse:')) return applyShrineCleanse(c, optionId.slice('shrine:cleanse:'.length))
  if (optionId.startsWith('hero-')) {
    c.nextStarterIndex = parseInt(optionId.slice(5))
    clog(c, `🗼 ${c.heroes[c.nextStarterIndex]!.playerName} will take the first turn of the next encounter.`)
    c.pendingChoice = null
    c.phase = pc.returnTo ?? 'road'   // Brace Command picks return to camp
    return {}
  }
  if (optionId.startsWith('ev:')) {
    const [, eventId, optId] = optionId.split(':')
    applyRunEvent(c, eventId!, optId!)
    c.pendingChoice = null
    c.phase = 'road'
    return {}
  }
  if (optionId === 'intel') {
    clog(c, c.chapter === 2 ? '🗼 The Tower reveals the court’s corruption.' : '🗼 The Tower reveals little — the First Ascension hides no tricks.')
    c.debug = { ...c.debug }
    c.pendingChoice = null
    c.phase = 'road'
    // reveal applies to the *next* boss encounter — store on campaign
    ;(c as CampaignState & { bossIntel?: boolean }).bossIntel = true
    return {}
  }
  // mythic relics (e.g. from the Lair) count against the 3/continent cap
  const grant = MYTHIC_RELIC_IDS.includes(optionId) ? grantMythic(c, optionId) : grantItem(c, optionId)
  if (grant) return {}   // relic slots full: release choice awaits
  c.pendingChoice = null
  c.phase = 'road'
  autoAdvanceAfterGate(c)   // province: gates sweep the party forward
  return {}
}

// Resolve a draft pick: optionId is `draft:<cardId>:<tempo>` (recruit a tier
// card + tempo burst) or `draft:tempo:<n>` (pure tempo). Determinism is moot
// here — the choice is the player's and the cards drawn come off the (already
// seeded) Tavern in order.
function resolveDraftPick(c: CampaignState, pc: PendingChoice, optionId: string): { error?: string } {
  const [, body, tempoStr] = optionId.split(':')
  const tempo = parseInt(tempoStr ?? '0') || 0
  const deck = c.deck

  // Graft archetype: add a 2nd suit to the player's best eligible card.
  if (body === 'graft') {
    const suit = tempoStr as Suit
    const target = eligibleForgeCards(c)
      .filter(id => id[0] !== suit && !(c.cardTokens?.[id]?.some(t => t.defId === 'graft' && t.suit === suit)))
      .sort((a, b) => cardValue(b.slice(1)) - cardValue(a.slice(1)))[0]
    if (target) {
      stampToken(c, target, { defId: 'graft', suit })
      clog(c, `🃏 Draft: grafts ${suitSymbol(suit)} onto ${cardLabelFromId(target)} — now a dual-type card.`)
    } else {
      c.tokenBudget = (c.tokenBudget ?? 0) + 1
      clog(c, '🃏 Draft: no card could take the graft — +1 forge budget instead.')
    }
    c.pendingChoice = null
    c.phase = 'road'
    return {}
  }

  if (body && body !== 'tempo') {
    const cardId = body                 // e.g. 'S6'
    const suit = cardId[0] as Suit
    const rank = cardId.slice(1) as Card['rank']
    if ((c.ownedCards ?? []).includes(cardId)) {
      // already owned (shouldn't happen — offers are unowned) → redundancy token
      c.tokenBudget = (c.tokenBudget ?? 0) + 1
      clog(c, `🃏 Draft: ${rank}${suitSymbol(suit)} already owned — +1 token budget.`)
    } else {
      c.ownedCards = [...(c.ownedCards ?? []), cardId]
      // §F: the drafted card carries its physical identity from the start
      if (deck) deck.tavern.unshift({ suit, rank, id: registerLogicalCard(c, cardId).physicalId })
      clog(c, `🃏 Draft: ${rank}${suitSymbol(suit)} joins the deck.`)
    }
  }

  // Tempo burst: draw into the owning hero's hand from the Tavern (cap-bound).
  if (tempo > 0 && deck) {
    const ownerIdx = Math.max(0, c.heroes.findIndex(h => h.playerId === pc.forPlayerId))
    const hand = deck.hands[ownerIdx] ?? []
    const cap = maxHandSize(c, ownerIdx)
    let drawn = 0
    while (drawn < tempo && deck.tavern.length > 0 && hand.length < cap) {
      hand.push(deck.tavern.shift()!)
      drawn++
    }
    deck.hands[ownerIdx] = hand
    if (drawn > 0) clog(c, `🃏 Draft tempo: ${c.heroes[ownerIdx]!.playerName} draws ${drawn}.`)
  }

  c.pendingChoice = null
  c.phase = 'road'
  return {}
}

// ── Road events: non-battle run impact (TEST-GRADE, see events.ts) ──────────

const SUITS = ['C', 'D', 'H', 'S'] as const
const cardVal = (rank: string) => (rank === 'A' ? 1 : rank === 'Jo' ? 0 : parseInt(rank) || 0)

function applyRunEvent(c: CampaignState, eventId: string, optId: string) {
  const deck = c.deck
  if (!deck) { clog(c, '🎭 The moment passes — nothing happens mid-fight.'); return }
  const { r, done } = rng(c)
  const finish = (msg: string) => { done(); clog(c, `🎭 ${msg}`) }
  const key = `${eventId}:${optId}`

  switch (key) {
    case 'bonepicker:cull': {
      const sorted = [...deck.tavern].filter(card => card.rank !== 'Jo')
        .sort((a, b) => cardVal(a.rank) - cardVal(b.rank)).slice(0, 4)
      const ids = new Set(sorted.map(card => card.id))
      deck.tavern = deck.tavern.filter(card => !ids.has(card.id))
      return finish(`The Bonepicker feeds: ${sorted.map(card => card.rank + card.suit).join(', ')} are devoured.`)
    }
    case 'counterfeiter:commission': {
      for (let i = 0; i < 2; i++) deck.tavern.splice(r.int(deck.tavern.length + 1), 0, { suit: r.pick([...SUITS]), rank: '10', id: evUid() })
      return finish('Two counterfeit 10s slip into the Tavern. They look... fine.')
    }
    case 'counterfeiter:small-bills': {
      for (let i = 0; i < 3; i++) deck.tavern.splice(r.int(deck.tavern.length + 1), 0, { suit: r.pick([...SUITS]), rank: '5', id: evUid() })
      return finish('Three counterfeit 5s slip into the Tavern.')
    }
    case 'chaos-font:drink': {
      const from = r.pick([...SUITS])
      const to = r.pick(SUITS.filter(su => su !== from))
      let n = 0
      for (const card of deck.tavern) if (card.suit === from && card.rank !== 'Jo') { card.suit = to; n++ }
      return finish(`The font surges — ${n} ${from} cards in the Tavern turn to ${to}.`)
    }
    case 'chaos-font:sip': {
      const pool = deck.tavern.filter(card => card.rank !== 'Jo')
      for (const card of r.shuffle(pool).slice(0, 3)) card.suit = r.pick(SUITS.filter(su => su !== card.suit))
      return finish('A sip. Three Tavern cards shimmer into new suits.')
    }
    case 'whetstone:hone': {
      const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']
      const pool = deck.tavern.filter(card => card.rank !== 'Jo' && card.rank !== '10')
      const picks = r.shuffle(pool).slice(0, 3)
      for (const card of picks) card.rank = RANKS[RANKS.indexOf(card.rank) + 1]! as typeof card.rank
      return finish(`${picks.length} Tavern cards are honed +1.`)
    }
    case 'whetstone:temper': {
      const low = [...deck.tavern].filter(card => card.rank !== 'Jo')
        .sort((a, b) => cardVal(a.rank) - cardVal(b.rank))[0]
      if (low) { const was = low.rank + low.suit; low.rank = '10'; return finish(`${was} is tempered into a 10${low.suit}.`) }
      return finish('Nothing worth tempering.')
    }
    case 'tithe:pay': {
      for (let hi = 0; hi < c.heroes.length; hi++) {
        if (!c.heroes[hi]!.alive || !deck.hands[hi]?.length) continue
        const hand = deck.hands[hi]!
        const top = hand.reduce((best, card, i) => (cardVal(card.rank) > cardVal(hand[best]!.rank) ? i : best), 0)
        deck.discard.push(...hand.splice(top, 1))
      }
      const pool = itemPool(c, 'spell', 'rare').filter(i => !c.spells.includes(i.id))
      if (pool.length) { const sp = r.pick(pool); c.spells.push(sp.id); return finish(`The tithe is paid. The clerk hands over ${sp.name} ★.`) }
      return finish('The tithe is paid. The clerk has nothing left to give.')
    }
    case 'tithe:haggle': {
      const hand = deck.hands.find((h, i) => c.heroes[i]?.alive && h.length > 0)
      if (hand) deck.discard.push(...hand.splice(r.int(hand.length), 1))
      const pool = itemPool(c, 'spell', 'standard').filter(i => !c.spells.includes(i.id))
      if (pool.length) { const sp = r.pick(pool); c.spells.push(sp.id); return finish(`A deal is struck: ${sp.name} for pocket change.`) }
      return finish('A deal is struck for... nothing. The clerk smirks.')
    }
    default:
      return finish('The party walks on. Nothing happens.')
  }
}

// Returns true if granting the item raised a follow-up choice (relic slots full)
// that the caller must leave pending instead of advancing the road.
function grantItem(c: CampaignState, itemId: string): boolean {
  const item = getItem(itemId)
  if (item.kind === 'spell') {
    c.spells.push(itemId)
    clog(c, `📖 The team gains the spell ${item.name}.`)
  } else if (item.kind === 'relic') {
    // up to RELIC_SLOTS relics per hero; fill an open slot, else the holder
    // must release one (the choice is theirs — canon: no silent overwrite)
    const free = c.heroes.find(h => h.alive && h.relicIds.length < RELIC_SLOTS)
    if (free) {
      free.relicIds.push(itemId)
      clog(c, `🏺 ${free.playerName} equips ${item.name}.`)
      return false
    }
    const target = c.heroes.find(h => h.alive)!
    c.phase = 'landmark'
    c.pendingChoice = {
      kind: 'relic_full', forPlayerId: target.playerId,
      prompt: `${target.playerName}'s relic slots are full — release one to make room for ${item.name}.`,
      options: [...target.relicIds, itemId].map(rid => ({
        id: rid, label: `${getItem(rid).name}${rid === itemId ? ' (new)' : ''}`, detail: getItem(rid).text,
      })),
    }
    return true
  }
  return false
}

// ── Encounter end hooks (called by rooms layer after each encounter action) ──

// hand live deck state back to the campaign when an encounter ends
function reclaimDeck(c: CampaignState) {
  const s = c.encounter
  if (s) c.deck = { tavern: s.tavern, discard: s.discard, hands: s.hands }
}

// Meta: death/milestone grows the Kingdom item pool (breadth, not power). Loads
// and saves the persistent Kingdom directly so it applies to FUTURE runs.
function unlockNextItems(relics: number, spells: number): boolean {
  const k = loadKingdom()
  let changed = false
  for (let i = 0; i < relics; i++) {
    const next = RELIC_UNLOCK_ORDER.find(id => !(k.unlockedRelics ?? []).includes(id))
    if (next) { (k.unlockedRelics ??= []).push(next); changed = true }
  }
  for (let i = 0; i < spells; i++) {
    const next = SPELL_UNLOCK_ORDER.find(id => !(k.unlockedSpells ?? []).includes(id))
    if (next) { (k.unlockedSpells ??= []).push(next); changed = true }
  }
  if (changed) saveKingdom(k)
  return changed
}

export function checkEncounterEnd(c: CampaignState, kingdom?: KingdomState) {
  const s = c.encounter
  if (!s || s.outcome === 'active') return
  // Tutorial: the scripted fight just ended — show the end card, don't run any
  // chapter/road advancement (the tutorial map has no real next node).
  if (c.tutorial) { c.phase = 'tutorial_done'; c.encounter = null; return }
  reclaimDeck(c)
  if (s.outcome === 'wiped') {
    c.encounter = null
    // death banks options: the next run's relic/spell pool grows by one each.
    if (EXPERIMENTS.ascendingDeck && unlockNextItems(1, 1))
      clog(c, '🕯 In death the Kingdom remembers — new relics and spells await the next run.')
    return
  }

  if (s.outcome === 'won') {
    // snapshot the killing turn's end result before the encounter is nulled —
    // the client shows it in the victory moment (playtest note 2026-06-11)
    const rankNode = c.map?.nodes.find(n => n.id === s.nodeId)
    c.lastFight = {
      tier: s.tier,
      rank: s.tier === 'boss' && (EXPERIMENTS.provinceMode || (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2)) && rankNode
        ? (['J', 'Q', 'K'] as const)[Math.min(c.map!.nodes.filter(n => n.kind === 'boss' && n.layer < rankNode.layer).length, 2)]!
        : null,
      handSizes: s.hands.map(h => h.length),
      tavern: s.tavern.length,
      discard: s.discard.length,
    }
    const node = c.map!.nodes.find(n => n.id === s.nodeId)!
    if (s.tier === 'boss') {
      // ── Council of Tens victory (ascending-deck, ch3) ──────────────────────
      // Complete the 10-set: recruit any unowned 10s into ownedCards;
      // owned 10s → tokenBudget. Then flow into chapter_complete (→ continent seam).
      if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1 && c.chapter === 3) {
        const SUITS_ALL = ['C', 'D', 'H', 'S'] as const
        let granted = 0, tokensGranted = 0
        for (const suit of SUITS_ALL) {
          const cardId = `${suit}10`
          if ((c.ownedCards ?? []).includes(cardId)) {
            c.tokenFragments = (c.tokenFragments ?? 0) + 1   // redundancy → fragment
            tokensGranted++
          } else {
            c.ownedCards = [...(c.ownedCards ?? []), cardId]
            registerLogicalCard(c, cardId)   // §F identity (injected at next deck setup)
            granted++
          }
        }
        clog(c, `👑 THE COUNCIL OF TENS FALLS! ${granted} 10s recruited, ${tokensGranted} fragments from duplicates.`)
        clog(c, '   The number deck is complete. The ascent begins.')
        c.encounter = null
        if (kingdom) completeChapter(c, kingdom)
        else c.phase = 'chapter_complete'
        return
      }

      // Province / ascending-deck: the Gates and the Courtyard are intermediate
      // gate fights — pay spoils and march on; only the Throne completes the
      // chapter. Continent 1 (ch1/ch2) uses number gates with the same flow.
      // (Ch3's Council of Tens is handled above and never reaches here.)
      const useProvinceBossSplit = EXPERIMENTS.provinceMode
        || (EXPERIMENTS.ascendingDeck && (continentOf(c.chapter) === 2
          || (continentOf(c.chapter) === 1 && c.chapter !== 3)))
      if (useProvinceBossSplit && node.next.length > 0) {
        const { r, done } = rng(c)
        const isCourtyard = c.map!.nodes.some(n => n.kind === 'boss' && n.layer < node.layer)
        const pool = (isCourtyard
          ? [...itemPool(c, 'relic', 'rare'), ...itemPool(c, 'spell', 'rare')]
          : [...itemPool(c, 'spell', 'standard'), ...itemPool(c, 'relic', 'standard')])
          .filter(i => !c.spells.includes(i.id) && !c.heroes.some(h => h.relicIds.includes(i.id)))
        const options = r.shuffle(pool).slice(0, 3 + rewardBonus(c))
        done()
        c.encounter = null
        clog(c, isCourtyard ? '👑 The Courtyard is yours. The Throne room lies ahead.' : '🏰 The Gates have fallen. The Courtyard awaits.')
        if (options.length) {
          c.phase = 'landmark'
          c.pendingChoice = {
            kind: 'landmark_reward', forPlayerId: null,
            prompt: isCourtyard ? 'Spoils of the Courtyard — claim a rare prize.' : 'Spoils of the Gates — choose your reward.',
            options: options.map(i => ({ id: i.id, label: `${i.name}${i.tier === 'rare' ? ' ★' : ''}`, detail: i.text })),
          }
        } else {
          c.phase = 'road'
          autoAdvanceAfterGate(c)
        }
        return
      }
      c.encounter = null
      if (kingdom) completeChapter(c, kingdom)
      else { c.phase = 'campaign_won' }   // defensive: real boss clears always pass kingdom
      return
    }
    // ── Lair: a 3-way reward screen — pick a mythic relic, a hail-mary spell,
    // or a rare token (the gamble's payoff). Mythic shares the 3/continent cap.
    if (node.kind === 'lair') {
      const { r, done } = rng(c)
      c.encounter = null
      const ownedR = new Set(c.heroes.flatMap(h => h.relicIds))
      const options: { id: string; label: string; detail?: string }[] = []
      const mythic = mythicCapLeft(c) > 0 ? r.shuffle(MYTHIC_RELIC_IDS.filter(m => !ownedR.has(m)))[0] : undefined
      if (mythic) options.push({ id: mythic, label: `${getItem(mythic).name} ★ (mythic relic)`, detail: getItem(mythic).text })
      const spell = r.shuffle(HAILMARY_SPELL_IDS.filter(s => !c.spells.includes(s)))[0]
      if (spell) options.push({ id: spell, label: `${getItem(spell).name} (hail-mary spell)`, detail: getItem(spell).text })
      if (eligibleForgeCards(c).length)
        options.push({ id: 'lair:token', label: 'A rare token — stamp it now', detail: 'Stamp one strong F-tier token (Temper / Graft / a lever) onto a card, free.' })
      done()
      if (options.length) {
        c.phase = 'landmark'
        c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: 'The Lair’s hoard lies open — claim one prize.', options }
      } else c.phase = 'road'
      return
    }
    // standard encounter drops: skirmish/recruit → no spoils (the fight is a
    // "test your engine" grind; a recruit's reward IS the recruited card);
    // veteran/elite → choice. (Canon 2026-06-15: filler no longer leaks spells.)
    const { r, done } = rng(c)
    if (node.kind === 'skirmish' || node.kind === 'recruit') {
      done()
      c.encounter = null
      c.phase = 'road'
      return
    }
    const pool = [...itemPool(c, 'spell', 'standard'), ...(node.kind === 'elite' ? itemPool(c, 'relic', 'rare') : [])]
      .filter(i => !c.spells.includes(i.id) && !c.heroes.some(h => h.relicIds.includes(i.id)))
    const options = r.shuffle(pool).slice(0, (node.kind === 'elite' ? 3 : 2) + rewardBonus(c))
    done()
    c.encounter = null
    if (options.length) {
      c.phase = 'landmark'
      c.pendingChoice = {
        kind: 'landmark_reward', forPlayerId: null,
        prompt: 'Spoils of the fight — choose your reward.',
        options: options.map(i => ({ id: i.id, label: `${i.name}${i.tier === 'rare' ? ' ★' : ''}`, detail: i.text })),
      }
    } else c.phase = 'road'
    return
  }

  if (s.outcome === 'retreated') {
    c.encounter = null
    c.phase = 'camp'
    if (EXPERIMENTS.provinceMode) {
      // Province canon: retreating buys another attempt but NO rest — camps
      // are scarce, and a retreat must not be a free one.
      clog(c, '🏳 The party falls back, winded. No rest — the fight can be retaken as you stand.')
    } else {
      campRest(c)   // emergency camp is an interlude: full rest applies
      clog(c, '🏕 The party falls back to an emergency camp. The fight can be retaken from here.')
    }
  }
}

// ── Death vote ───────────────────────────────────────────────────────────────

export function applyDeathVote(c: CampaignState, playerId: string, vote: string): { error?: string } {
  if (c.phase !== 'death_vote' || !c.deathVote) return { error: 'No vote in progress.' }
  // dead player participates in the vote (canon)
  if (!c.heroes.some(h => h.playerId === playerId)) return { error: 'You are not in this campaign.' }
  const valid = ['retreat', 'last_stand', ...(c.deathVote.defiantAvailable ? ['defiant_stand'] : [])]
  if (!valid.includes(vote)) return { error: 'Invalid vote.' }
  c.deathVote.votes[playerId] = vote as 'retreat' | 'last_stand' | 'defiant_stand'

  if (Object.keys(c.deathVote.votes).length < c.heroes.length) return {}

  // all votes in: majority wins; host-order tiebreak (open canon: host decides)
  const tally: Record<string, number> = {}
  for (const v of Object.values(c.deathVote.votes)) tally[v] = (tally[v] ?? 0) + 1
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const winner = best.length > 1 && best[0]![1] === best[1]![1]
    ? c.deathVote.votes[c.heroes[0]!.playerId] ?? best[0]![0]
    : best[0]![0]

  const s = c.encounter!
  const deadIdx = c.deathVote.deadHeroIndex
  c.deathVote = null

  if (winner === 'defiant_stand') {
    c.wardenDefiantUsed = true
    const hero = c.heroes[deadIdx]!
    hero.alive = true
    for (let i = 0; i < 2; i++) if (s.tavern.length) s.hands[deadIdx]!.push(s.tavern.pop()!)
    clog(c, `🛡 Defiant Stand! The Warden drags ${hero.playerName} back to their feet (2 cards).`)
    c.phase = 'encounter'
    if (s.currentPlayerIndex === deadIdx) { /* hero resumes their stand */ }
    else if (!c.heroes[s.currentPlayerIndex]!.alive) bumpTurn(c)
    s.turnPhase = 'play'
    s.discardNeeded = 0
    return {}
  }

  if (winner === 'last_stand') {
    clog(c, '⚔️ Last Stand — the party fights on.')
    c.phase = 'encounter'
    if (!c.heroes[s.currentPlayerIndex]!.alive) bumpTurn(c)
    s.turnPhase = 'play'
    s.discardNeeded = 0
    return {}
  }

  // retreat
  clog(c, '🏳 The party retreats, carrying their dead.')
  s.outcome = 'retreated'
  checkEncounterEnd(c)
  return {}
}

function bumpTurn(c: CampaignState) {
  const s = c.encounter!
  const n = c.heroes.length
  for (let step = 1; step <= n; step++) {
    const j = (s.currentPlayerIndex + step) % n
    if (c.heroes[j]!.alive) { s.currentPlayerIndex = j; break }
  }
  for (let step = 1; step <= n; step++) {
    const j = (s.currentPlayerIndex + step) % n
    if (c.heroes[j]!.alive) { s.nextPlayerIndex = j; break }
  }
  clog(c, `👉 ${c.heroes[s.currentPlayerIndex]!.playerName}'s turn.`)
}

// ── Camp ─────────────────────────────────────────────────────────────────────

// (applyExileAtCamp retired — no mechanic may remove a card from the deck. The
// Exile class keeps its roster slot + signature tokens but has no exile ability;
// it is parked for a later repurpose.)

export function applyBreakCamp(c: CampaignState, playerId: string, hostId: string): { error?: string } {
  if (c.phase !== 'camp') return { error: 'Not at camp.' }
  if (playerId !== hostId) return { error: 'The host breaks camp.' }
  if (c.heroes.some(h => !h.alive)) return { error: 'Fallen heroes must be replaced before moving on.' }
  const map = c.map!
  const cur = map.nodes.find(n => n.id === map.currentNodeId)!
  if (cur.kind !== 'camp') {
    // emergency camp after retreat — the road continues by retaking this node
    clog(c, '🥾 The party returns to the fight.')
    resolveNode(c, cur.id, cur.kind)
    return {}
  }
  c.phase = 'road'
  clog(c, '🥾 The party breaks camp.')
  return {}
}

// ── Replacement ──────────────────────────────────────────────────────────────

export function beginReplacement(c: CampaignState, kingdom: KingdomState): { error?: string } {
  if (c.phase !== 'camp') return { error: 'Replacement happens at camp.' }
  const deadIdx = c.heroes.findIndex(h => !h.alive)
  if (deadIdx < 0) return { error: 'No fallen hero to replace.' }
  const dead = c.heroes[deadIdx]!
  const inUse = new Set(c.heroes.filter(h => h.alive).map(h => h.classId))
  const { r, done } = rng(c)
  // randomized subset linked to lineage; Tier 2/3 may enter via replacement (canon)
  let pool = (kingdom.unlockedClasses as ClassId[]).filter(cid => cid !== dead.classId && !inUse.has(cid))
  let offerCount = Math.max(1, 3 - c.exileBurden)   // Burden makes death forks harsher
  const offers = r.shuffle(pool).slice(0, offerCount)
  done()
  if (offers.length === 0) return { error: 'No classes available for replacement.' }
  c.phase = 'replace_hero'
  c.pendingChoice = {
    kind: 'replacement', forPlayerId: dead.playerId,
    prompt: `A new hero answers ${dead.playerName}'s lineage. Choose their class.`,
    options: offers.map(cid => ({ id: cid, label: CLASSES[cid].name, detail: CLASSES[cid].abilityText + (CLASSES[cid].siegeText ? ` ⚔ Siege: ${CLASSES[cid].siegeText}` : '') })),
  }
  return {}
}

function applyReplacementPick(c: CampaignState, playerId: string, classId: string): { error?: string } {
  const deadIdx = c.heroes.findIndex(h => !h.alive && h.playerId === playerId)
  if (deadIdx < 0) return { error: 'No fallen hero of yours.' }
  const hero = c.heroes[deadIdx]!
  const prevRelics = hero.relicIds   // died with the hero — don't deal them right back
  hero.classId = classId as ClassId
  hero.alive = true
  hero.relicIds = []

  // camp join canon: stronger onboarding bonus — a standard relic
  const { r, done } = rng(c)
  const pool = itemPool(c, 'relic', 'standard')
    .filter(i => !prevRelics.includes(i.id) && !c.heroes.some(h => h.relicIds.includes(i.id)))
  if (pool.length) {
    const gid = r.pick(pool).id
    hero.relicIds.push(gid)
    clog(c, `   Onboarding: equipped ${getItem(gid).name}.`)
  }
  done()
  dealReplacementHand(c, deadIdx)
  clog(c, `🎖 ${hero.playerName} returns as the ${CLASSES[hero.classId].name}.`)
  c.pendingChoice = null
  c.phase = 'camp'
  return {}
}

// ── Chapter transitions ──────────────────────────────────────────────────────

function completeChapter(c: CampaignState, kingdom: KingdomState) {
  if (EXPERIMENTS.provinceMode && c.chapter === 1) {
    // Province 1 liberated: the run is complete; further provinces unlock at
    // the kingdom level (chapter 2 content is out of scope for the prototype).
    if (!kingdom.unlockedChapters.includes(2)) kingdom.unlockedChapters.push(2)
    for (const cid of ['commander', 'warden', 'gambler', 'exile', 'oracle'] as ClassId[])
      if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
    kingdom.campaignsWon++
    saveKingdom(kingdom)
    c.phase = 'campaign_won'
    clog(c, '👑 The Throne is taken — the province is liberated. New provinces open to the Kingdom.')
    return
  }

  // ── Ascending-deck: Continent 1 chapter transitions (1 → 2 → 3 → seam → 4) ─
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1) {
    if (c.chapter < 3) {
      // ch1 → ch2, ch2 → ch3: interlude within Continent 1
      if (!kingdom.unlockedChapters.includes(c.chapter + 1)) kingdom.unlockedChapters.push(c.chapter + 1)
      saveKingdom(kingdom)
      c.phase = 'chapter_complete'
      clog(c, `🏰 Chapter ${c.chapter} complete. The path deepens — Chapter ${c.chapter + 1} awaits.`)
      return
    }
    // ch3 complete (Council of Tens defeated) → continent seam → ch4 (province)
    if (!kingdom.unlockedChapters.includes(4)) kingdom.unlockedChapters.push(4)
    for (const cid of ['commander', 'warden'] as ClassId[])
      if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
    kingdom.specializationsUnlocked = true
    saveKingdom(kingdom)
    c.phase = 'chapter_complete'
    clog(c, '🌅 Continent 1 conquered — the number deck is complete.')
    clog(c, '   The royals await. Rest, then ascend to Continent 2.')
    return
  }

  if (c.chapter === 1) {
    // kingdom unlocks: chapter 2, specializations, Tier 2 classes
    if (!kingdom.unlockedChapters.includes(2)) kingdom.unlockedChapters.push(2)
    kingdom.specializationsUnlocked = true
    for (const cid of ['commander', 'warden'] as ClassId[])
      if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
    saveKingdom(kingdom)
    c.phase = 'chapter_complete'
    clog(c, '🏰 Kingdom unlocks: Chapter 2, specializations, Commander, Warden.')
    clog(c, 'Rest now. The Broken Court waits beyond the interlude.')
  } else {
    // ── Ascending-deck: Continent-2 province victory ────────────────────────
    if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2) {
      for (const cid of ['gambler', 'exile', 'oracle'] as ClassId[])
        if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
      kingdom.campaignsWon++
      saveKingdom(kingdom)
      c.phase = 'campaign_won'
      clog(c, '👑 The province falls. Continent 2 is yours — the full campaign is won!')
      return
    }
    for (const cid of ['gambler', 'exile', 'oracle'] as ClassId[])
      if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
    kingdom.campaignsWon++
    saveKingdom(kingdom)
    c.phase = 'campaign_won'
    clog(c, '👑 The campaign is won. Kingdom unlocks: Gambler, Exile, Oracle.')
  }
}

/**
 * Ascending-deck Step 3 — backfill ladder (Continent 1 only).
 * Grants the tier of number-cards for the completed chapter:
 *   ch1 → 6s+7s   ch2 → 8s+9s   mid ch3 → 10s
 * For any card already owned (recruited via exact-kill earlier), grants
 * a +1 tokenBudget instead of a duplicate (redundancy → token path).
 */
export function backfillAct(c: CampaignState) {
  const SUITS: Suit[] = ['C', 'D', 'H', 'S']
  // which ranks to backfill for each chapter number
  const BACKFILL_RANKS: Record<number, string[]> = {
    1: ['6', '7'],
    2: ['8', '9'],
    3: ['10'],
  }
  const ranks = BACKFILL_RANKS[c.chapter]
  if (!ranks || ranks.length === 0) return  // no backfill for this chapter

  let granted = 0
  let tokensGranted = 0
  for (const rank of ranks) {
    for (const suit of SUITS) {
      const cardId = `${suit}${rank}`
      const owned = c.ownedCards ?? []
      if (owned.includes(cardId)) {
        // already recruited — redundancy → a token FRAGMENT (not Forge budget,
        // which would flood the forge; 2 fragments → 1 C-tier token on the road)
        c.tokenFragments = (c.tokenFragments ?? 0) + 1
        tokensGranted++
      } else {
        // new card — add to ownedCards (will be injected into deck on next setupChapterDeck)
        c.ownedCards = [...owned, cardId]
        registerLogicalCard(c, cardId)   // §F identity
        granted++
      }
    }
  }
  clog(c, `📖 Backfill (ch${c.chapter}): ${granted} new cards (${ranks.join('+')}) + ${tokensGranted} fragments from duplicates.`)
}

export function applyContinueChapter(c: CampaignState, playerId: string, hostId: string): { error?: string } {
  if (c.phase !== 'chapter_complete') return { error: 'No chapter transition pending.' }
  if (playerId !== hostId) return { error: 'The host leads the march.' }

  // ── Ascending-deck: backfill at end of each chapter, then increment ────────
  // Backfill must run BEFORE the chapter counter advances (uses current chapter
  // to determine which rank tier to grant). Canon: Continent 1 only.
  // Ch3 is EXEMPT — the Council of Tens victory already handled the 10-set
  // backfill directly (recruit unowned 10s + owned → tokenBudget).
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1 && c.chapter !== 3) {
    backfillAct(c)
  }

  // chapter counter increments BEFORE the map build (ascending-deck canon:
  // buildMap receives the new chapter number)
  c.chapter = c.chapter + 1

  // chapter-scoped state resets
  c.exiledCards = []
  c.exileBurden = 0
  c.gamblerWagerUsed = false
  c.ironReprieveUsed = false
  c.itemStopsThisChapter = 0   // relic/spell-stop budget refreshes each chapter

  const { r, done } = rng(c)
  c.map = buildMap(c.chapter, r)
  done()

  // ── Continent 1→2 seam: the graduation fragment shop (post-Council) ────────
  // Spend banked fragments here before the Continent-2 deck is built. The shop
  // resumes the transition via finishChapterTransition on "Leave".
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2 && (c.tokenFragments ?? 0) >= FRAGMENTS_PER_TOKEN) {
    openFragmentShop(c)
    return {}
  }
  finishChapterTransition(c)
  return {}
}

// Build the chapter deck and drop onto the road — the tail of a chapter
// transition (also called when the post-Council shop closes). For the
// Continent seam, setupChapterDeck builds the FULL A-10 deck from ownedCards.
function finishChapterTransition(c: CampaignState) {
  // entering a new continent (ch1, ch4, ch7…): the mythic 3/continent cap resets
  if (((c.chapter - 1) % 3) === 0) c.mythicThisContinent = 0
  setupChapterDeck(c)
  c.phase = 'road'
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2)
    clog(c, `🗺 CONTINENT 2 — Chapter ${c.chapter}: the province awaits. Your complete deck marches with you.`)
  else
    clog(c, `🗺 Chapter ${c.chapter}: the road deepens.`)
  logNodeCT(c)
}

// ── Client projection ────────────────────────────────────────────────────────

// pile contents for the viewer: sorted by suit then value so the actual
// draw order leaks nothing
function sortedPile(cards: { suit: string; rank: string; id: string }[]) {
  const suitOrder: Record<string, number> = { C: 0, D: 1, H: 2, S: 3 }
  const val = (rank: string) => (rank === 'A' ? 1 : rank === 'Jo' ? 0 : parseInt(rank) || 0)
  return [...cards].sort((a, b) =>
    (suitOrder[a.suit] ?? 9) - (suitOrder[b.suit] ?? 9) || val(a.rank) - val(b.rank))
}

export function buildClientCampaign(c: CampaignState, forPlayerId: string, hostId: string, kingdom: KingdomState): ClientCampaignState {
  const myHeroIndex = c.heroes.findIndex(h => h.playerId === forPlayerId)
  const s = c.encounter

  const heroes: ClientHero[] = c.heroes.map((h, i) => ({
    playerId: h.playerId,
    playerName: h.playerName,
    classId: h.classId,
    picked: c.phase !== 'class_select' || c.classPicks[h.playerId] !== null,
    className: CLASSES[h.classId].name,
    abilityText: CLASSES[h.classId].abilityText +
      (CLASSES[h.classId].siegeText ? ` ⚔ Siege: ${CLASSES[h.classId].siegeText}` : ''),
    alive: h.alive,
    relics: h.relicIds.map(rid => ({ id: rid, name: getItem(rid).name, text: getItem(rid).text, tier: getItem(rid).tier })),
    handSize: s ? s.hands[i]!.length : (c.deck?.hands[i]?.length ?? 0),
    isCurrentPlayer: !!s && s.currentPlayerIndex === i && s.outcome === 'active',
  }))

  let map: ClientCampaignState['map'] = null
  if (c.map) {
    const cur = c.map.nodes.find(n => n.id === c.map!.currentNodeId)!
    map = {
      currentNodeId: c.map.currentNodeId,
      nodes: c.map.nodes.map<ClientRoadNode>(n => ({
        id: n.id,
        kind: n.known || n.visited ? n.kind : 'unknown',
        layer: n.layer,
        next: n.next,
        visited: n.visited,
        current: n.id === c.map!.currentNodeId,
        reachable: c.phase === 'road' && cur.next.includes(n.id),
      })),
    }
  }

  let encounter: ClientCampaignState['encounter'] = null
  if (s) {
    const mod = s.modifierId ? getEncounterDef(s.modifierId) : null
    const bossMod = s.bossModifierId ? BOSS_MODIFIERS.find(b => b.id === s.bossModifierId)! : null
    const revealBoss = !!bossMod && (s.bossModifierRevealed || (c as CampaignState & { bossIntel?: boolean }).bossIntel === true || s.outcome !== 'active')
    const me = myHeroIndex >= 0 ? c.heroes[myHeroIndex] : null
    const activatable = ['r-bone-thread', 'r-sainted-scalpel', 'r-signal-whistle']
    encounter = {
      tier: s.tier,
      modifier: mod ? { id: mod.id, name: mod.name, text: mod.mechanicText } : null,
      bossModifier: revealBoss && bossMod ? bossMod : (bossMod ? { id: 'hidden', name: '???', text: 'Something is wrong with this court…' } : null),
      turnPhase: s.turnPhase,
      currentPlayerIndex: s.currentPlayerIndex,
      enemiesRemaining: s.enemyDeck.length,
      totalEnemies: s.totalEnemies,
      defeatedCount: s.defeatedCount,
      currentEnemy: s.currentEnemy,
      discardCount: s.discard.length,
      tavernCount: s.tavern.length,
      discardNeeded: s.discardNeeded,
      lastPlayed: s.lastPlayed,
      outcome: s.outcome,
      myHand: myHeroIndex >= 0 ? s.hands[myHeroIndex]! : [],
      setupPeek: s.setupPeek
        ? {
            mine: s.setupPeek.playerId === forPlayerId,
            cards: s.setupPeek.playerId === forPlayerId ? s.setupPeek.cards : [],
            canReorder: s.setupPeek.canReorder,
            source: s.setupPeek.source,
          }
        : null,
      pendingChooseNext: s.pendingChooseNext,
      events: s.events,
      eventSeq: s.eventSeq,
      wagerArmed: s.wagerArmedBy !== null,
      canWager: !!me && me.classId === 'gambler' && me.alive && !s.flags['gamblerWagerUsed'] && s.outcome === 'active',
      activatableRelics: me ? me.relicIds.filter(r => activatable.includes(r) && !s.flags[`relicUsed:${r}:${myHeroIndex}`]) : [],
      myBoosts: computeBoosts(c, s, myHeroIndex),
      // pile contents are public knowledge, but SORTED — draw order stays hidden
      tavernCards: sortedPile(s.tavern),
      discardCards: sortedPile(s.discard),
      // ascending-deck: draw pool is per-player; only the active hero sees theirs
      drawPool: s.turnPhase === 'draw_select' && s.drawSelectHeroIdx === myHeroIndex
        ? (s.drawPool ?? [])
        : undefined,
      drawSelectKeep: s.turnPhase === 'draw_select' && s.drawSelectHeroIdx === myHeroIndex
        ? (s.drawSelectCap ?? Math.max(0, maxHandSize(c, myHeroIndex) - s.hands[myHeroIndex]!.length))
        : undefined,
      // ascending-deck: graft picker — only the hero who landed the kill chooses
      graftSelect: s.turnPhase === 'graft_select' && s.pendingGraft?.heroIdx === myHeroIndex
        ? { suit: s.pendingGraft.suit }
        : undefined,
      // scripted tutorial: the current guide beat for the viewing hero
      tutorialBeat: tutorialBeatProjection(c, s, myHeroIndex >= 0 ? s.hands[myHeroIndex]! : []),
      // scripted tutorial: present the no-reward enemy as a Training Dummy, and
      // flash the safe cards to pay with during discard.
      tutorialDummy: c.tutorial && s.flags['tut.reward'] === 'none' ? true : undefined,
      tutorialDiscard: tutorialDiscardHints(c, s, myHeroIndex >= 0 ? s.hands[myHeroIndex]! : []),
      cardTokens: projectCardTokens(c),
      // Sanctum Foresight rite: the upcoming enemy lineup, laid bare this fight
      foreseen: s.flags['foreseen'] ? s.enemyDeck.map(card => cardLabelFromId(`${card.suit}${card.rank}`)) : undefined,
      siegeRank: (() => {
        // province mode or ascending-deck continent-2: which rank gate this boss node is
        const useRankSplit = EXPERIMENTS.provinceMode || (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2)
        if (s.tier !== 'boss' || !useRankSplit || !c.map) return null
        const node = c.map.nodes.find(n => n.id === s.nodeId)
        if (!node) return null
        const before = c.map.nodes.filter(n => n.kind === 'boss' && n.layer < node.layer).length
        return (['J', 'Q', 'K'] as const)[Math.min(before, 2)]!
      })(),
    }
  }

  const itemView = (id: string) => {
    const it = getItem(id)
    return { id, name: it.name, text: it.text, tier: it.tier }
  }

  return {
    id: c.id,
    name: c.name,
    seed: c.seed,
    phase: c.phase,
    chapter: c.chapter,
    heroes,
    myHeroIndex,
    myHand: myHeroIndex < 0 ? [] : (s ? s.hands[myHeroIndex]! : (c.deck?.hands[myHeroIndex] ?? [])),
    deckTavern: sortedPile(c.deck?.tavern ?? []),
    deckDiscard: sortedPile(c.deck?.discard ?? []),
    isHost: forPlayerId === hostId,
    map,
    encounter,
    lastFight: c.lastFight ?? null,
    spells: c.spells.map(itemView),
    pendingChoice: c.pendingChoice
      ? (() => {
          const { votes, ...pub } = c.pendingChoice
          const teamVote = c.pendingChoice.kind === 'landmark_reward' && c.pendingChoice.forPlayerId === null && c.heroes.length > 1
          return {
            ...pub,
            mine: teamVote || (c.pendingChoice.forPlayerId ?? hostId) === forPlayerId,
            teamVote,
            myVote: votes?.[forPlayerId] ?? null,   // ballots stay secret — you only see your own
            votesIn: Object.keys(votes ?? {}).length,
            votesNeeded: c.heroes.length,
          }
        })()
      : null,
    rewardDraw: c.rewardDraw ?? null,
    deathVote: c.deathVote
      ? {
          deadHeroName: c.heroes[c.deathVote.deadHeroIndex]!.playerName,
          options: ['retreat', 'last_stand', ...(c.deathVote.defiantAvailable ? ['defiant_stand'] : [])],
          votes: c.deathVote.votes,
          myVote: c.deathVote.votes[forPlayerId] ?? null,
          isBoss: false,
        }
      : null,
    kingdom: {
      unlockedChapters: kingdom.unlockedChapters,
      unlockedClasses: kingdom.unlockedClasses,
      specializationsUnlocked: kingdom.specializationsUnlocked,
    },
    log: c.log,
    cardTokens: projectCardTokens(c),
    tokenBudget: c.tokenBudget,
    tokenFragments: c.tokenFragments,
    ascendingDeck: EXPERIMENTS.ascendingDeck,
    physicalCards: projectPhysicalCards(c),
  }
}

export function persist(c: CampaignState) {
  saveCampaign(c)
}

export { loadKingdom, maxHandSize }

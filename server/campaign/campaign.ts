import { createRng, hashSeed } from '../rng'
import type { Suit, Card } from '../types'
import { suitSymbol, cardValue } from '../deck'
import type {
  CampaignState, ClassId, ClientCampaignState, ClientHero, ClientRoadNode,
  Hero, KingdomState, NodeKind, PendingChoice, RoadNode, Token,
} from './types'
import { CLASSES, TIER1_CLASSES, getItem, itemsOf, RELIC_SLOTS, getEncounterDef, BOSS_MODIFIERS, getTokenDef, RELIC_UNLOCK_ORDER, SPELL_UNLOCK_ORDER } from './content'
import { stampToken, projectCardTokens, rekeyCardTokens, MAX_TOKENS_PER_CARD } from './tokens'
import { CAMPAIGN_SCHEMA_VERSION, registerLogicalCard, projectPhysicalCards, effectiveFace, logicalOf, moveGraft, applyGraft } from './cards'
import { staffsOf, getStaff, getLadder, homeLadder, laddersOf, HOME_SUIT } from './paths'
import { CRYSTALS, FRAGMENTS_PER_HALF, GAUNTLET_SUITS, gauntletOf, projectGauntlet } from './spells'
import { V3_RELICS, RELIC_SLOT_ORDER, getV3Relic, relicBagOf, equipmentOf, relicEquipped, relicsOwned, type RelicSlot } from './relics'
import { buildMap } from './maps'
import {
  startEncounter, maxHandSize, setupChapterDeck, campRest, campBundle, dealReplacementHand,
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
  // V3 §6 (slice 6): spells are no longer items — the gauntlet + fragments are
  // the only spell economy. Every legacy spell offer dries up under the flag
  // (the 14-entry roster survives in content.ts until the slice-9 delete).
  if (EXPERIMENTS.ascendingDeck && kind === 'spell') return []
  // V3 §7 (slice 7): the legacy 13-relic ITEMS roster is superseded — relics
  // now come ONLY from the Lair (raid) and the Caravan (pay-from-hand), out of
  // relic_v1_design_3.0. Legacy relic offers dry up the same way.
  if (EXPERIMENTS.ascendingDeck && kind === 'relic') return []
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
  }
  clog(c, `🏰 A new lineage sets out. Seed: ${realSeed}. Chapter ${chapter}.`)
  clog(c, '⚔️ Choose your heroes — the campaign starts with the core roster.')
  return { campaign: c }
}

export function applyClassPick(c: CampaignState, playerId: string, classId: ClassId, staffId?: string): { error?: string } {
  if (c.phase !== 'class_select') return { error: 'Not selecting classes.' }
  // New players get only the 4 core classes (TIER1); the other 5 are meta-unlock
  // runway, hidden in the UI and rejected here until unlocks ship. Mirrors the
  // client AVAILABLE_CLASSES list in ClassSelect.vue.
  if (!TIER1_CLASSES.includes(classId)) return { error: 'That class has not been unlocked yet.' }
  if (!(playerId in c.classPicks)) return { error: 'You are not in this campaign.' }
  const taken = Object.entries(c.classPicks).some(([pid, cid]) => pid !== playerId && cid === classId)
  if (taken) return { error: 'That class is already claimed.' }
  // V3 §2: pick one of the class's four Staffs. Omitted → the class's first
  // Staff (compat for old callers; the client always sends one).
  const staffs = staffsOf(classId)
  const staff = staffId ? staffs.find(st => st.id === staffId) : staffs[0]
  if (staffId && !staff) return { error: 'That Staff does not belong to this class.' }
  c.classPicks[playerId] = classId
  const hero = c.heroes.find(h => h.playerId === playerId)!
  hero.classId = classId
  hero.staffId = staff?.id
  clog(c, `${hero.playerName} will march as the ${CLASSES[classId].name}${staff ? ` — Staff: ${staff.name}` : ''}.`)

  if (Object.values(c.classPicks).every(v => v !== null)) {
    const { r, done } = rng(c)
    c.map = buildMap(c.chapter, r)
    // No starting relic (canon 2026-06-15): every relic must be purposefully
    // bought (Caravan) or won (Lair / gate spoils). Heroes set out bare.
    done()
    setupChapterDeck(c)
    grantC2Rungs(c)   // a run starting inside C2 lights the home rung immediately
    c.phase = 'road'
    clog(c, `🗺 The road to ${c.chapter === 1 ? 'the First Ascension' : 'the Broken Court'} unfolds. Choose your path.`)
    logNodeCT(c)
  }
  return {}
}

// V3 §2 (slice 4): entering Continent 2 lights each hero's HOME-suit path C2
// rung — a single ability, the ladder's first rung. The reveal animation is a
// placeholder log line (Gab styles it later). C3/C4 rungs + the other three
// paths stay visible-but-locked; C2-clear unlocks them at the meta layer (slice 9).
function grantC2Rungs(c: CampaignState) {
  if (!EXPERIMENTS.ascendingDeck || continentOf(c.chapter) !== 2) return
  for (const h of c.heroes) {
    if (h.pathC2) continue
    const ladder = homeLadder(h.classId)
    if (!ladder) continue
    h.pathC2 = ladder.id
    clog(c, `✨ PATH REVEALED — ${h.playerName} lights ${ladder.name} (${ladder.theme}): ${ladder.c2}`)
  }
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
  revealForkedRoad(c)
  return {}
}

// V3 §7 — Forked Road (Cloak): every reachable next node is revealed before
// you commit. Called after movement and on equip so the map stays honest.
export function revealForkedRoad(c: CampaignState) {
  if (!EXPERIMENTS.ascendingDeck || !c.map || !relicEquipped(c, 'v3r-forked-road')) return
  const cur = c.map.nodes.find(n => n.id === c.map!.currentNodeId)
  if (!cur) return
  for (const id of cur.next) {
    const n = c.map.nodes.find(x => x.id === id)
    if (n && !n.known) { n.known = true; clog(c, `🔱 Forked Road: ${labelOf(n.kind)} lies ahead.`) }
  }
}

// Province canon: the fall of a rank gate sweeps the party forward — the road
// out of a gate commits automatically (pursuit, not planning). Self-guards on
// phase and node kind, so it is safe to call after any choice resolution.
function autoAdvanceAfterGate(c: CampaignState) {
  if (!EXPERIMENTS.autoMarchAfterGates) return
  if (c.phase !== 'road' || !c.map) return
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
    forge: 'the Forge', abbey: 'the Sanctum', market: 'the Caravan',
    shrine: 'the Shrine', lair: 'a Lair',
    event: 'a strange happening',
    hunt: 'a Hunt', heroes: 'the Fallen Heroes',
  }[kind]
}

function resolveNode(c: CampaignState, nodeId: string, kind: NodeKind) {
  switch (kind) {
    case 'skirmish': case 'veteran': case 'elite':
      // V3 §7 — Forced March (Cloak): once per province, an ordinary fight
      // (skirmish/veteran) may be marched past — no fight, no recruit, no graft.
      if (EXPERIMENTS.ascendingDeck && kind !== 'elite' && relicEquipped(c, 'v3r-forced-march')
          && !(c.relicChapterUses ??= {})['v3r-forced-march']) {
        c.phase = 'landmark'
        c.pendingChoice = {
          kind: 'landmark_reward', forPlayerId: null,
          prompt: '🥾 Forced March — slip past this fight? (No recruit, no graft.)',
          options: [
            { id: `march:${nodeId}:${kind}`, label: 'March past', detail: 'Skip the fight entirely — once per province.' },
            { id: `fight:${nodeId}:${kind}`, label: 'Stand and fight', detail: 'Take the fight as normal.' },
          ],
        }
        return
      }
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
      // V3 Camp (slice 5): the fixed four-part bundle; legacy full rest otherwise
      if (EXPERIMENTS.ascendingDeck) campBundle(c)
      else campRest(c)   // reset canon: rests reshuffle the deck and redraw hands
      clog(c, '🏕 The party makes camp. Plan, prepare, recover.')
      break
    case 'draft': offerDraft(c); break
    // V3.0 cutover (slice 9): the non-ascending offerItems fallbacks and the
    // Tower node are DELETED (§11) — every landmark is its V3 verb.
    case 'forge': offerForge(c); break
    case 'abbey': offerSanctumV3(c, SANCTUM_TRANSFERS); break
    case 'market': offerCaravan(c); break
    case 'hunt':
      // V3 §8 — Hunt (C1 only, NEW): pursue a missed recruit. Still an exact kill.
      offerHunt(c, nodeId)
      break
    case 'heroes':
      // V3 §8 — Fallen Heroes (C2-P2 start): free Staff swap — one randomly-
      // drawn Staff per class (own class included). Just a swap; repeatable.
      offerFallenHeroes(c)
      break
    case 'shrine': offerShrineV3(c); break
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

// (offerItems, the per-chapter item-stop cap, consumeItemStop and the curse
// system — cursedCardIds, the Caravan mythic deal, Cleanse — were DELETED at
// the V3.0 cutover, §11 slice 9. Relics = Lair/Caravan; spells = the gauntlet.)

// V3 §7 (slice 7): Caravan pay-from-hand. Cost = a visible discard-total paid
// from your ROAD hand (greedy smallest cards), Caravan Coin −2. Placeholder
// number: CARAVAN_COST = 8 (plan §A). Bought relics land in the BAG.
const CARAVAN_COST = 8

function offerCaravanV3(c: CampaignState) {
  const owned = relicsOwned(c)
  const { r, done } = rng(c)
  const pool = r.shuffle(V3_RELICS.filter(rd => !owned.has(rd.id))).slice(0, 2)
  done()
  const cost = Math.max(1, CARAVAN_COST - (relicEquipped(c, 'v3r-caravan-coin') ? 2 : 0))
  const handTotal = (c.deck?.hands ?? []).flat().reduce((t, cd) => t + cardValue(cd.rank), 0)
  if (handTotal < cost || pool.length === 0) {
    clog(c, `🐫 The Caravan's prices are beyond your hand (${handTotal}/${cost}). It moves on.`)
    c.phase = 'road'; autoAdvanceAfterGate(c); return
  }
  c.pendingCaravan = { cost, pool: pool.map(rd => rd.id), picked: [] }
  presentCaravanBuy(c)
}

// Step 1 — pick which wares to buy (the price is chosen at the next step).
function presentCaravanBuy(c: CampaignState) {
  const pc = c.pendingCaravan!
  const options: PendingChoice['options'] = pc.pool.map(id => {
    const rd = getV3Relic(id)!
    return { id: `v3buy:${id}`, label: `${rd.name} (${rd.slot}) — pay ${pc.cost} from hand`, detail: rd.text }
  })
  options.push({ id: 'caravan:skip', label: 'Wave the Caravan on', detail: 'Buy nothing.' })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: `🐫 The Caravan — a relic for a visible price (${pc.cost} of hand value, cards of your choosing).`,
    options,
  }
}

// Step 2 — choose WHICH road-hand cards to discard as the price. Each tap adds a
// card; the sale closes once the picked total covers the cost (overpay allowed).
function presentCaravanPay(c: CampaignState) {
  const pc = c.pendingCaravan!
  const rd = getV3Relic(pc.relicId!)!
  const hand = c.deck?.hands[0] ?? []
  const paid = pc.picked.reduce((t, i) => t + cardValue(hand[i]!.rank), 0)
  const lbl = (cd: Card) => `${cd.rank}${suitSymbol(cd.suit as Suit)}`
  const options: PendingChoice['options'] = hand
    .map((cd, i) => ({ cd, i }))
    .filter(({ cd, i }) => cd.rank !== 'Jo' && !pc.picked.includes(i))
    .map(({ cd, i }) => ({ id: `caravanpay:${i}`, label: `Discard ${lbl(cd)}`, detail: `value ${cardValue(cd.rank)}` }))
  const chosen = pc.picked.map(i => lbl(hand[i]!)).join(', ') || '—'
  options.push({ id: 'caravan:back', label: '← Choose different wares', detail: 'Put these cards back.' })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: `🐫 Pay ${pc.cost} for ${rd.name} — paid ${paid}/${pc.cost}. Chosen: ${chosen}. Tap cards to discard.`,
    options,
  }
}

// V3.0 cutover (§11 slice 9): offerCaravan IS the pay-from-hand Caravan; the
// mythic-for-a-curse deal and the Lair's free token stamp are deleted.
function offerCaravan(c: CampaignState) {
  offerCaravanV3(c)
}

// ── V3 §8 (slice 8): out-of-combat §F rewrites + the new landmark handlers ───

/** After a graft moves/lands between fights: refresh the runtime faces of the
 * touched cards in the road deck and carry their legacy token keys along. */
function syncCardFaces(c: CampaignState, physicalIds: string[], before: Record<string, string>) {
  for (const id of physicalIds) {
    const pc = c.cards?.[id]
    if (!pc) continue
    const f = effectiveFace(pc)
    const now = `${f.suit}${f.rank}`
    if (before[id] && before[id] !== now) rekeyCardTokens(c, before[id]!, now)
    const piles = c.deck ? [c.deck.tavern, c.deck.discard, ...c.deck.hands] : []
    for (const pile of piles)
      for (const cd of pile)
        if (cd.id === id) {
          cd.suit = f.suit as Suit
          cd.rank = f.rank as Card['rank']
        }
  }
}

function captureFaces(c: CampaignState, physicalIds: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const id of physicalIds) {
    const pc = c.cards?.[id]
    if (pc) out[id] = logicalOf(effectiveFace(pc))
  }
  return out
}

function moveGraftSynced(c: CampaignState, fromId: string, seq: number, toId: string): string | null {
  const before = captureFaces(c, [fromId, toId])
  const err = moveGraft(c, fromId, seq, toId)
  if (err) return err
  syncCardFaces(c, [fromId, toId], before)
  return null
}

function applyGraftSynced(c: CampaignState, physicalId: string, kind: 'rank' | 'suit', to: string, source: string): string | null {
  const before = captureFaces(c, [physicalId])
  const err = applyGraft(c, physicalId, kind, to, source)
  if (err) return err
  syncCardFaces(c, [physicalId], before)
  return null
}

// V3 §8 — Sanctum = REARRANGE: up to two transfers per visit, each relocating
// an earned graft between owned cards (no new power, pure redistribution).
// ⚑ Targets are the current road hand (placeholder for the full deck picker).
const SANCTUM_TRANSFERS = 2

function movableGrafts(c: CampaignState): { pcId: string; seq: number; label: string }[] {
  const out: { pcId: string; seq: number; label: string }[] = []
  for (const pc of Object.values(c.cards ?? {}))
    for (const g of pc.grafts)
      out.push({
        pcId: pc.physicalId, seq: g.seq,
        label: `${g.kind === 'suit' ? `→${suitSymbol(g.to as Suit)}` : `→${g.to}`} on ${cardLabelFromId(logicalOf(effectiveFace(pc)))}`,
      })
  return out
}

function offerSanctumV3(c: CampaignState, remaining: number) {
  const movable = movableGrafts(c)
  if (!movable.length) {
    clog(c, '✨ The Sanctum finds nothing to rearrange — no grafts ride your deck yet.')
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return
  }
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: `✨ The Sanctum — Rearrange: relocate a graft (${remaining} transfer${remaining !== 1 ? 's' : ''} left this visit).`,
    options: [
      ...movable.slice(0, 6).map(m => ({
        id: `sanctum:move:${m.pcId}:${m.seq}:${remaining}`,
        label: m.label,
        detail: 'Move this graft to a held card — the card underneath is never lost.',
      })),
      { id: 'sanctum:done', label: 'Leave', detail: 'Rearrange nothing further.' },
    ],
  }
}

// V3 §8 — Shrine = CONSECRATE: permanently transmute one owned card's suit or
// rank — no kill required. ⚑ Placeholder: three seeded offers instead of a
// full any-card/any-value picker.
function offerShrineV3(c: CampaignState) {
  const owned = Object.values(c.cards ?? {})
  if (!owned.length) { c.phase = 'road'; autoAdvanceAfterGate(c); return }
  const { r, done } = rng(c)
  const seen = new Set<string>()
  const options: PendingChoice['options'] = []
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  for (let i = 0; i < 4 && options.length < 3; i++) {
    const pc = r.pick(owned)
    const f = effectiveFace(pc)
    if (i === 1) {
      const idx = RANKS.indexOf(f.rank)
      const up = idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1]! : null
      if (!up) continue
      const id = `shrine:cons:${pc.physicalId}:rank:${up}`
      if (seen.has(id)) continue
      seen.add(id)
      options.push({ id, label: `${f.rank}${suitSymbol(f.suit as Suit)} → ${up}${suitSymbol(f.suit as Suit)}`, detail: 'Consecrate: the card is permanently transmuted.' })
    } else {
      const to = r.pick((['C', 'D', 'H', 'S'] as const).filter(su => su !== f.suit))
      const id = `shrine:cons:${pc.physicalId}:suit:${to}`
      if (seen.has(id)) continue
      seen.add(id)
      options.push({ id, label: `${f.rank}${suitSymbol(f.suit as Suit)} → ${f.rank}${suitSymbol(to)}`, detail: 'Consecrate: the card is permanently transmuted.' })
    }
  }
  done()
  if (!options.length) { c.phase = 'road'; autoAdvanceAfterGate(c); return }
  options.push({ id: 'shrine:skip', label: 'Leave the Shrine', detail: 'Consecrate nothing.' })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: '⛩ The Shrine — Consecrate one owned card (permanent, no kill required).',
    options,
  }
}

// V3 §8 — Hunt (C1 only, NEW): pick a missed recruit from the tiers seen so
// far; the fight is that single card — an exact kill still recruits it.
function offerHunt(c: CampaignState, nodeId: string) {
  const suits: Suit[] = ['C', 'D', 'H', 'S']
  const ranks = Object.entries(RECRUIT_RANKS_BY_CHAPTER)
    .filter(([ch]) => Number(ch) <= c.chapter)
    .flatMap(([, r2]) => r2)
  const owned = new Set(c.ownedCards ?? [])
  const targets: string[] = []
  for (const rank of ranks) for (const su of suits) { const id = `${su}${rank}`; if (!owned.has(id)) targets.push(id) }
  if (!targets.length) {
    clog(c, '🏹 The Hunt finds no missing quarry — a skirmish blocks the trail instead.')
    startEncounter(c, nodeId, 'skirmish')
    c.phase = 'encounter'
    return
  }
  const { r, done } = rng(c)
  const picks = r.shuffle(targets).slice(0, 4)
  done()
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: '🏹 The Hunt — choose your quarry (an exact kill still recruits it).',
    options: picks.map(id => ({
      id: `hunt:${id}:${nodeId}`,
      label: cardLabelFromId(id),
      detail: 'Track it down. Exact-kill to recruit; overkill and it slips away.',
    })),
  }
}

// V3 §8 — Fallen Heroes: a free, repeatable Staff swap — one randomly-drawn
// Staff from each of the four classes (own class included).
function offerFallenHeroes(c: CampaignState) {
  const { r, done } = rng(c)
  const hero = c.heroes[0]!
  const options: PendingChoice['options'] = []
  for (const cls of TIER1_CLASSES) {
    const pool = staffsOf(cls).filter(st => st.id !== hero.staffId)
    if (!pool.length) continue
    const pick = r.pick(pool)
    options.push({ id: `heroes:${pick.id}`, label: `${pick.name} — ${CLASSES[cls].name}`, detail: pick.text })
  }
  done()
  options.push({ id: 'heroes:keep', label: 'Keep your Staff', detail: getStaff(hero.staffId)?.text ?? '' })
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: '🪦 The Fallen Heroes — take up a fallen champion’s Staff (free; yours is set aside).',
    options,
  }
}

// (The Sanctum RITES — Foresight/Blessing/Cleanse — the legacy Shrine, the
// curse Cleanse, and the token-forge machinery were DELETED at the V3.0
// cutover, §11 slice 9. The Sanctum is Rearrange; the Shrine is Consecrate.)

function cardLabelFromId(id: string): string {
  const suit = id[0]!
  const rank = id.slice(1)
  return `${rank}${suitSymbol(suit as Suit)}`
}

function offerForge(c: CampaignState) {
  // V3 §6 (revised 2026-07-03): the Forge ALWAYS opens a menu — even with < 2
  // fragments — so the player can see their banked pools. Its verb converts
  // FRAGMENTS_PER_HALF fragments → 1 agnostic Half crystal (armed onto a suit
  // later, via the bracelet, for the stronger spell). Forge repeatedly, then leave.
  const frags = c.tokenFragments ?? 0
  const halves = c.tokenHalves ?? 0
  c.phase = 'landmark'
  const options = []
  if (frags >= FRAGMENTS_PER_HALF) {
    options.push({
      id: 'forge:make',
      label: `Forge ${FRAGMENTS_PER_HALF} fragments → 1 Half crystal`,
      detail: 'A Half armed onto a suit casts the stronger spell. Forge again or leave after.',
    })
  }
  options.push({
    id: 'forge:done',
    label: 'Leave the Forge',
    detail: frags < FRAGMENTS_PER_HALF
      ? `You have ${frags} fragment${frags === 1 ? '' : 's'} — the Forge needs ${FRAGMENTS_PER_HALF} to make a Half.`
      : 'Keep the rest banked.',
  })
  c.pendingChoice = {
    kind: 'landmark_reward', forPlayerId: null,
    prompt: `⚒️ The Forge — turn ${FRAGMENTS_PER_HALF} fragments into a Half crystal. Banked: ${frags}✦ fragment${frags === 1 ? '' : 's'} · ${halves}◆ half${halves === 1 ? '' : 'ves'}.`,
    options,
  }
}

// (presentForgeTokens, the fragment C-tier track, applyForgeToken/Card, the
// mythic cap and the post-Council graduation shop were DELETED at the V3.0
// cutover, §11 slice 9 — fragments feed the gauntlet; relics come from the
// Lair and the Caravan's pay-from-hand.)

// ── Ascending-deck drafts (Step 6) — steer the early deck ────────────────────
// A draft is a solo per-hero pick (forPlayerId-scoped, so it bypasses the
// casino tie-break). Each option bundles an unowned tier card with an immediate
// tempo burst (draw-N-now) — per the locked offer rule, a bare backfill-able
// card never stands alone; it must carry something unobtainable elsewhere, and
// unrepeatable tempo is that thing. (Token / dual-type / forge-exile draft
// archetypes depend on the Step-5 token economy and are intentionally deferred.)
const DRAFT_TEMPO = 3

function offerDraft(c: CampaignState) {
  // Drafts are a Continent-1 deck-steering tool. Outside Continent 1 the node
  // degrades to a Caravan so the road never spins.
  if (continentOf(c.chapter) !== 1) {
    offerCaravan(c)
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
  // Draft categories (V3.0 cutover: the additive-graft archetype is DELETED —
  // grafts come only from kills):
  //   A — recruit a tier card you lack + draw 3 (tempo)
  //   B — a clean tier card, no rider ("just the card")
  // Pad toward three real options; degrade gracefully when the tier runs dry.
  const options: { id: string; label: string; detail?: string }[] = []
  if (pool.length >= 1) options.push(cardOption(pool[0]!))      // A
  if (pool.length >= 2) options.push(plainCardOption(pool[1]!)) // B
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

  if (pc.kind === 'royal_keep') return applyRoyalKeep(c, pc, optionId)

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

  // (forge_token / forge_card / shop kinds were DELETED at the V3.0 cutover.)

  if (pc.kind === 'relic_full') {
    // optionId is the relic to RELEASE; the holder keeps the other two
    const target = c.heroes.find(h => h.playerId === pc.forPlayerId) ?? c.heroes.find(h => h.alive)!
    target.relicIds = pc.options.map(o => o.id).filter(id => id !== optionId)
    clog(c, `   ${target.playerName} releases ${getItem(optionId).name}; carries ${target.relicIds.map(id => getItem(id).name).join(' & ')}.`)
    c.pendingChoice = null
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
    c.pendingCaravan = undefined
    clog(c, '🐫 You wave the Caravan on.')
    c.phase = 'road'; autoAdvanceAfterGate(c); return {}
  }
  // Caravan step 2: back out of a purchase to the wares menu (cards untouched)
  if (optionId === 'caravan:back' && c.pendingCaravan) {
    c.pendingCaravan.relicId = undefined
    c.pendingCaravan.picked = []
    presentCaravanBuy(c)
    return {}
  }
  // Caravan step 2: tap a road-hand card to add it to the price
  if (optionId.startsWith('caravanpay:') && c.pendingCaravan?.relicId) {
    const pcv = c.pendingCaravan
    const hand = c.deck?.hands[0] ?? []
    const i = Number(optionId.slice('caravanpay:'.length))
    if (!Number.isInteger(i) || i < 0 || i >= hand.length || hand[i]!.rank === 'Jo' || pcv.picked.includes(i))
      return { error: 'That card is not available to spend.' }
    pcv.picked.push(i)
    const paid = pcv.picked.reduce((t, k) => t + cardValue(hand[k]!.rank), 0)
    if (paid < pcv.cost) { presentCaravanPay(c); return {} }
    // price met — discard the chosen cards (high index first) and take the relic
    const def = getV3Relic(pcv.relicId)
    if (!def || !c.deck) { c.pendingChoice = null; c.pendingCaravan = undefined; c.phase = 'road'; return { error: 'The Caravan lost the wares.' } }
    for (const k of [...pcv.picked].sort((a, b) => b - a)) c.deck.discard.push(...c.deck.hands[0]!.splice(k, 1))
    relicBagOf(c).push(pcv.relicId)
    clog(c, `🐫 Paid ${paid} from hand (your pick) — ${def.name} (${def.slot}) joins the bag.`)
    c.pendingChoice = null
    c.pendingCaravan = undefined
    c.phase = 'road'; autoAdvanceAfterGate(c); return {}
  }
  // V3 §8 — Hunt: the chosen quarry becomes the whole fight
  if (optionId.startsWith('hunt:')) {
    const [, cardId, nodeId] = optionId.split(':')
    c.pendingChoice = null
    clog(c, `🏹 The Hunt begins — ${cardLabelFromId(cardId!)} is the quarry.`)
    startEncounter(c, nodeId!, 'skirmish', { huntCardId: cardId })
    c.phase = 'encounter'
    return {}
  }
  // V3 §8 — Fallen Heroes: the Staff swap
  if (optionId.startsWith('heroes:')) {
    const staffId = optionId.slice('heroes:'.length)
    c.pendingChoice = null
    if (staffId !== 'keep') {
      const st = getStaff(staffId)
      if (st) {
        c.heroes[0]!.staffId = st.id
        clog(c, `🪦 ${c.heroes[0]!.playerName} takes up ${st.name} — the fallen champion's Staff.`)
      }
    } else {
      clog(c, '🪦 You keep your own Staff.')
    }
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  // V3 §8 — Sanctum Rearrange: pick a graft, then its new home (road hand)
  if (optionId.startsWith('sanctum:move:')) {
    const [, , pcId, seqStr, remStr] = optionId.split(':')
    const targets = (c.deck?.hands[0] ?? []).filter(cd => cd.id !== pcId && !!c.cards?.[cd.id])
    if (!targets.length) {
      clog(c, '✨ No held card can receive the graft right now.')
      c.pendingChoice = null
      c.phase = 'road'
      autoAdvanceAfterGate(c)
      return {}
    }
    c.pendingChoice = {
      kind: 'landmark_reward', forPlayerId: null,
      prompt: '✨ Rearrange — onto which held card?',
      options: [
        ...targets.slice(0, 8).map(cd => ({ id: `sanctum:to:${pcId}:${seqStr}:${cd.id}:${remStr}`, label: `${cd.rank}${suitSymbol(cd.suit)}` })),
        { id: 'sanctum:done', label: 'Cancel' },
      ],
    }
    return {}
  }
  if (optionId.startsWith('sanctum:to:')) {
    const [, , srcId, seqStr, dstId, remStr] = optionId.split(':')
    c.pendingChoice = null
    const err = moveGraftSynced(c, srcId!, Number(seqStr), dstId!)
    if (err) clog(c, `✨ The rite fizzles: ${err}`)
    else clog(c, '✨ Rearranged — the graft finds a new home.')
    const rem = Number(remStr) - 1
    if (rem > 0 && movableGrafts(c).length) { offerSanctumV3(c, rem); return {} }
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  // V3 §8 — Shrine Consecrate: a permanent §F transmute, no kill required
  if (optionId.startsWith('shrine:cons:')) {
    const [, , pcId, kind, to] = optionId.split(':')
    c.pendingChoice = null
    const err = applyGraftSynced(c, pcId!, kind as 'rank' | 'suit', to!, 'shrine:consecrate')
    if (err) clog(c, `⛩ The Consecration fails: ${err}`)
    else clog(c, `⛩ Consecrated — the card is permanently transmuted.`)
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  if (optionId === 'shrine:skip') {
    c.pendingChoice = null
    clog(c, '⛩ You leave the Shrine untouched.')
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  // V3 §7 — Forced March resolution: skip the fight, or take it after all
  if (optionId.startsWith('march:') || optionId.startsWith('fight:')) {
    const [verb, nodeId, kind] = optionId.split(':')
    c.pendingChoice = null
    if (verb === 'march') {
      ;(c.relicChapterUses ??= {})['v3r-forced-march'] = true
      clog(c, '🥾 Forced March: the party slips past the fight — nothing gained, nothing risked.')
      c.phase = 'road'
      autoAdvanceAfterGate(c)
      return {}
    }
    c.phase = 'road'
    startEncounter(c, nodeId!, kind as 'skirmish' | 'veteran')
    c.phase = 'encounter'
    return {}
  }
  // V3 §7: a raided relic (Lair) drops straight into the bag
  if (optionId.startsWith('v3relic:')) {
    const id = optionId.slice('v3relic:'.length)
    const def = getV3Relic(id)
    if (def && !relicsOwned(c).has(id)) {
      relicBagOf(c).push(id)
      clog(c, `🏺 ${def.name} (${def.slot}) joins the bag — equip it between fights.`)
    }
    c.pendingChoice = null
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  // V3 §7: a Caravan purchase — choose the wares, then pick WHICH cards to
  // discard as the price (presentCaravanPay drives the selection).
  if (optionId.startsWith('v3buy:')) {
    const id = optionId.slice('v3buy:'.length)
    const def = getV3Relic(id)
    if (!def || !c.deck) { c.pendingChoice = null; c.pendingCaravan = undefined; c.phase = 'road'; return { error: 'The Caravan lost the wares.' } }
    // Recover the visit state if a stale offer was picked (e.g. after reconnect).
    if (!c.pendingCaravan) c.pendingCaravan = { cost: Math.max(1, CARAVAN_COST - (relicEquipped(c, 'v3r-caravan-coin') ? 2 : 0)), pool: [id], picked: [] }
    c.pendingCaravan.relicId = id
    c.pendingCaravan.picked = []
    presentCaravanPay(c)
    return {}
  }
  // V3 §6 (revised 2026-07-03): Forge — convert 2 fragments → 1 agnostic Half.
  if (optionId === 'forge:make') {
    if ((c.tokenFragments ?? 0) >= FRAGMENTS_PER_HALF) {
      c.tokenFragments = (c.tokenFragments ?? 0) - FRAGMENTS_PER_HALF
      c.tokenHalves = (c.tokenHalves ?? 0) + 1
      clog(c, `⚒️ Forged! ${FRAGMENTS_PER_HALF} fragments become a Half crystal (${c.tokenHalves} banked). Arm it on a suit via the bracelet.`)
    }
    offerForge(c)   // re-present the menu with updated pools (forge again or leave)
    return {}
  }
  if (optionId === 'forge:done') {
    clog(c, '⚒️ You leave the Forge.')
    c.pendingChoice = null
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  // V3 §8: 'sanctum:done' closes the Rearrange menu (the legacy rites and the
  // curse Cleanse were deleted at the cutover; the Tower's hero-/intel picks too)
  if (optionId === 'sanctum:done') {
    c.pendingChoice = null
    clog(c, '✨ You leave the Sanctum as it stands.')
    c.phase = 'road'
    autoAdvanceAfterGate(c)
    return {}
  }
  if (optionId.startsWith('ev:')) {
    const [, eventId, optId] = optionId.split(':')
    applyRunEvent(c, eventId!, optId!)
    c.pendingChoice = null
    c.phase = 'road'
    return {}
  }
  // legacy item grants (the pools are empty under V3 — kept for stray options)
  const grant = grantItem(c, optionId)
  if (grant) return {}   // relic slots full: release choice awaits
  c.pendingChoice = null
  c.phase = 'road'
  autoAdvanceAfterGate(c)
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

  // (The additive-graft draft archetype was DELETED at the cutover — grafts
  // come only from kills. Any stray 'graft' option degrades to a fragment.)
  if (body === 'graft') {
    c.tokenFragments = (c.tokenFragments ?? 0) + 1
    clog(c, '🃏 Draft: the graft archetype is retired — +1 fragment instead.')
    c.pendingChoice = null
    c.phase = 'road'
    return {}
  }

  if (body && body !== 'tempo') {
    const cardId = body                 // e.g. 'S6'
    const suit = cardId[0] as Suit
    const rank = cardId.slice(1) as Card['rank']
    if ((c.ownedCards ?? []).includes(cardId)) {
      // already owned (shouldn't happen — offers are unowned) → redundancy → fragment
      c.tokenFragments = (c.tokenFragments ?? 0) + 1
      clog(c, `🃏 Draft: ${rank}${suitSymbol(suit)} already owned — +1 fragment.`)
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
    // V3 §7 — Interest (Ring): a fight paid without a single discard arms +1
    // card at the next fight's start.
    if (EXPERIMENTS.ascendingDeck && relicEquipped(c, 'v3r-interest') && !s.flags['paidDiscard'])
      c.interestNext = true

    // V3 §6 (slice 6): the agnostic fragment — a 50/50 roll after each won
    // encounter (with redundancy conversions, the only fragment sources).
    if (EXPERIMENTS.ascendingDeck && !c.tutorial) {
      const { r, done } = rng(c)
      const drop = r.next() < 0.5
      done()
      if (drop) {
        c.tokenFragments = (c.tokenFragments ?? 0) + 1
        clog(c, `💠 A crystal fragment glints in the wreckage (+1 — ${c.tokenFragments} banked).`)
      }
    }

    // snapshot the killing turn's end result before the encounter is nulled —
    // the client shows it in the victory moment (playtest note 2026-06-11)
    const rankNode = c.map?.nodes.find(n => n.id === s.nodeId)
    c.lastFight = {
      tier: s.tier,
      rank: s.tier === 'boss' && EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2 && rankNode
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

      // ── V3 §3: ascending C2 — a royal gate falls → the keep-decision ───────
      // (3/2/1 pyramid). Slice 8: the gate rank keys off the CHAPTER (one gate
      // per province: ch4 Jack · ch5 Queen · ch6 King). The seam (intermediate
      // provinces) or the crown + victory (ch6) resume in finalizeRoyalKeep.
      if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2) {
        const gateIdx = Math.min(Math.max(c.chapter - 4, 0), 2)
        c.encounter = null
        presentRoyalKeep(c, (['J', 'Q', 'K'] as const)[gateIdx]!, node.id)
        return
      }

      // Continent-1 number gates: the Gates and the Courtyard are intermediate
      // gate fights — pay spoils and march on; only the Throne completes the
      // chapter. (Ch3's Council of Tens is handled above and never gets here;
      // C2 gates short-circuit into the keep-decision above.)
      const useProvinceBossSplit = EXPERIMENTS.ascendingDeck
        && ((continentOf(c.chapter) === 1 && c.chapter !== 3) || continentOf(c.chapter) === 2)
      if (useProvinceBossSplit && node.next.length > 0) {
        c.encounter = null
        presentGateSpoils(c, node)
        return
      }
      c.encounter = null
      if (kingdom) completeChapter(c, kingdom)
      else { c.phase = 'campaign_won' }   // defensive: real boss clears always pass kingdom
      return
    }
    if (node.kind === 'lair') {
      const { r, done } = rng(c)
      c.encounter = null
      // V3 §7: the Lair is the relic RAID — the dangerous fight pays one of
      // two pool relics into the bag. (The legacy mythic/hail-mary/token
      // 3-way was DELETED at the cutover, §11 slice 9.)
      const owned = relicsOwned(c)
      const pool = r.shuffle(V3_RELICS.filter(rd => !owned.has(rd.id))).slice(0, 2)
      done()
      if (!pool.length) {
        c.tokenFragments = (c.tokenFragments ?? 0) + 1
        clog(c, '🕸 The Lair holds nothing new — a fragment glints instead (+1).')
        c.phase = 'road'
        return
      }
      c.phase = 'landmark'
      c.pendingChoice = {
        kind: 'landmark_reward', forPlayerId: null,
        prompt: '🕸 The Lair’s hoard lies open — claim one relic for the bag.',
        options: pool.map(rd => ({ id: `v3relic:${rd.id}`, label: `${rd.name} (${rd.slot})`, detail: rd.text })),
      }
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
    // V3: a retreat (Slip Away) buys another attempt with NO rest — the
    // fight is retaken as you stand (the legacy emergency full rest died
    // with the cutover).
    c.encounter = null
    c.phase = 'camp'
    clog(c, '🏳 The party falls back, winded. No rest — the fight can be retaken as you stand.')
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

/**
 * V3 §6 (slice 6, revised 2026-07-03): the BRACELET — arm ONE agnostic pool
 * item onto an EMPTY gauntlet suit slot between encounters. `crystal: 'fragment'`
 * (default) arms the suit's Fragment spell; `'half'` arms the stronger Half spell
 * (Halves are forged, 2 fragments → 1). One crystal per suit — an occupied slot
 * is refused (cast it first). Casting empties the slot (Decision 2).
 */
export function applyBraceletPlace(c: CampaignState, playerId: string, suit: string, crystal: 'fragment' | 'half' = 'fragment'): { error?: string } {
  if (!EXPERIMENTS.ascendingDeck) return { error: 'The bracelet is not active.' }
  if (!['road', 'camp', 'chapter_complete', 'landmark'].includes(c.phase)) return { error: 'Fragments are placed between encounters.' }
  if (!c.heroes.some(h => h.playerId === playerId)) return { error: 'You are not in this campaign.' }
  if (!(GAUNTLET_SUITS as readonly string[]).includes(suit)) return { error: 'Unknown suit.' }
  const hole = gauntletOf(c)[suit]!
  if (hole.tier !== 0) return { error: 'That suit already holds a crystal — cast it or pick an empty suit.' }
  if (crystal === 'half') {
    if ((c.tokenHalves ?? 0) < 1) return { error: 'No Half crystals available — forge two fragments first.' }
    c.tokenHalves = (c.tokenHalves ?? 0) - 1
    hole.tier = 2
    clog(c, `💠 Bracelet: a Half crystal arms ${suitSymbol(suit as Suit)} — ${CRYSTALS[suit]!.half.name} is castable.`)
  } else {
    if ((c.tokenFragments ?? 0) < 1) return { error: 'No fragments to place.' }
    c.tokenFragments = (c.tokenFragments ?? 0) - 1
    hole.tier = 1
    clog(c, `💠 Bracelet: a fragment arms ${suitSymbol(suit as Suit)} — ${CRYSTALS[suit]!.fragment.name} is castable.`)
  }
  return {}
}

/**
 * V3 §7 (slice 7): equip/unequip a relic between encounters — free at every
 * between-encounter screen, locked in combat (Decision 7). `relicId: null`
 * empties the slot back into the bag.
 */
export function applyEquipRelic(c: CampaignState, playerId: string, slot: string, relicId: string | null): { error?: string } {
  if (!EXPERIMENTS.ascendingDeck) return { error: 'The equipment slots are not active.' }
  if (c.phase === 'encounter') return { error: 'Relics are locked during a fight.' }
  if (!c.heroes.some(h => h.playerId === playerId)) return { error: 'You are not in this campaign.' }
  if (!RELIC_SLOT_ORDER.includes(slot as RelicSlot)) return { error: 'Unknown slot.' }
  const equipment = equipmentOf(c)
  const bag = relicBagOf(c)
  const current = equipment[slot as RelicSlot]
  if (relicId === null) {
    if (!current) return { error: 'That slot is already empty.' }
    delete equipment[slot as RelicSlot]
    bag.push(current)
    clog(c, `🎒 ${getV3Relic(current)?.name ?? current} returns to the bag.`)
    return {}
  }
  const def = getV3Relic(relicId)
  if (!def) return { error: 'Unknown relic.' }
  if (def.slot !== slot) return { error: `${def.name} is a ${def.slot} relic.` }
  const bagIdx = bag.indexOf(relicId)
  if (bagIdx < 0) return { error: 'That relic is not in the bag.' }
  bag.splice(bagIdx, 1)
  if (current) bag.push(current)
  equipment[slot as RelicSlot] = relicId
  clog(c, `🎽 ${def.name} equipped (${def.slot})${current ? ` — ${getV3Relic(current)?.name} returns to the bag` : ''}.`)
  revealForkedRoad(c)   // an equipped Forked Road takes effect immediately
  return {}
}

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

// Intermediate gate cleared (Gates/Courtyard style): offer spoils, or march on.
function presentGateSpoils(c: CampaignState, node: RoadNode) {
  const { r, done } = rng(c)
  const isCourtyard = c.map!.nodes.some(n => n.kind === 'boss' && n.layer < node.layer)
  const pool = (isCourtyard
    ? [...itemPool(c, 'relic', 'rare'), ...itemPool(c, 'spell', 'rare')]
    : [...itemPool(c, 'spell', 'standard'), ...itemPool(c, 'relic', 'standard')])
    .filter(i => !c.spells.includes(i.id) && !c.heroes.some(h => h.relicIds.includes(i.id)))
  const options = r.shuffle(pool).slice(0, 3 + rewardBonus(c))
  done()
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
}

// ── V3 §3: royal gates — the 3/2/1 keep-decision ─────────────────────────────
// A C2 gate fields all four royals of its rank; after the fight the player
// narrows: Jack Gate keeps 3 of 4 (pick the one LEFT), Queen Gate keeps 2
// (two sequential keep picks), King Gate keeps 1 — the crown; the other Kings
// abdicate. Kept royals become REAL deck cards (§F minted + owned + shuffled
// into the live tavern). Victory = the King Gate cleared + crowned.

const ROYAL_KEEP: Record<'J' | 'Q' | 'K', { keep: number; mode: 'keep' | 'leave'; prompt: string }> = {
  J: { keep: 3, mode: 'leave', prompt: '⚜ The Jack Gate falls — which Jack do you leave behind?' },
  Q: { keep: 2, mode: 'keep', prompt: '⚜ The Queen Gate falls — which Queens follow you? Pick the first.' },
  K: { keep: 1, mode: 'keep', prompt: '👑 The King Gate falls — which crown do you wear?' },
}

function presentRoyalKeep(c: CampaignState, rank: 'J' | 'Q' | 'K', nodeId: string) {
  const cfg = ROYAL_KEEP[rank]
  const pool = (['S', 'H', 'C', 'D'] as const).map(su => `${su}${rank}`)
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'royal_keep', forPlayerId: null,
    prompt: cfg.prompt,
    options: pool.map(id => ({
      id,
      label: cardLabelFromId(id),
      detail: cfg.mode === 'leave'
        ? 'Tap to leave this one behind — the other three join your deck.'
        : rank === 'K'
          ? 'Your crown — this King rides in your deck; the others abdicate.'
          : 'This Queen joins your deck as a real card.',
    })),
    royalKeep: { rank, pool, kept: [], mode: cfg.mode, nodeId },
  }
  clog(c, cfg.prompt)
}

function applyRoyalKeep(c: CampaignState, pc: PendingChoice, optionId: string): { error?: string } {
  const rk = pc.royalKeep
  if (!rk) { c.pendingChoice = null; c.phase = 'road'; return { error: 'No gate decision pending.' } }
  const cfg = ROYAL_KEEP[rk.rank]
  if (rk.mode === 'leave') {
    clog(c, `   ${cardLabelFromId(optionId)} is left at the gate.`)
    return finalizeRoyalKeep(c, rk, rk.pool.filter(id => id !== optionId))
  }
  rk.kept.push(optionId)
  if (rk.kept.length < cfg.keep) {
    pc.options = pc.options.filter(o => o.id !== optionId)
    pc.prompt = `⚜ ${cardLabelFromId(optionId)} follows you — and the next?`
    clog(c, `   ${cardLabelFromId(optionId)} swears fealty.`)
    return {}
  }
  return finalizeRoyalKeep(c, rk, rk.kept)
}

function finalizeRoyalKeep(c: CampaignState, rk: NonNullable<PendingChoice['royalKeep']>, kept: string[]): { error?: string } {
  // §F: kept royals become real deck cards — minted physical identities,
  // owned, and shuffled into the live tavern at seeded positions.
  const { r, done } = rng(c)
  const muster = relicEquipped(c, 'v3r-muster')   // V3 §7: kept royals ride the top
  for (const id of kept) {
    if (!(c.ownedCards ?? []).includes(id)) c.ownedCards = [...(c.ownedCards ?? []), id]
    const pcard = registerLogicalCard(c, id)
    const runtime = { suit: id[0] as Suit, rank: id.slice(1) as Card['rank'], id: pcard.physicalId }
    if (c.deck) {
      if (muster) c.deck.tavern.push(runtime)
      else c.deck.tavern.splice(r.int(c.deck.tavern.length + 1), 0, runtime)
    }
  }
  done()
  if (muster && kept.length) clog(c, '🎺 Muster: your royals ride at the top of the Tavern.')
  const left = rk.pool.filter(id => !kept.includes(id))
  clog(c, rk.rank === 'K'
    ? `👑 ${kept.map(cardLabelFromId).join(', ')} is crowned — the crown rides in your deck. The other Kings abdicate.`
    : `⚜ ${kept.map(cardLabelFromId).join(' + ')} shuffle into your deck.${left.length ? ` Left behind: ${left.map(cardLabelFromId).join(', ')}.` : ''}`)
  c.pendingChoice = null
  const node = c.map!.nodes.find(n => n.id === rk.nodeId)!
  if (node.next.length === 0) {
    // The King Gate — V3.0 victory. sessions re-syncs its kingdom from disk
    // after every action, so a fresh load here is safe.
    completeChapter(c, loadKingdom())
    return {}
  }
  presentGateSpoils(c, node)
  return {}
}

function completeChapter(c: CampaignState, kingdom: KingdomState) {
  // (The provinceMode prototype's win path was DELETED at the cutover.)

  // ── Ascending-deck: Continent 1 chapter transitions (1 → 2 → 3 → seam → 4) ─
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 1) {
    if (c.chapter < 3) {
      // ch1 → ch2, ch2 → ch3: interlude within Continent 1
      if (!kingdom.unlockedChapters.includes(c.chapter + 1)) kingdom.unlockedChapters.push(c.chapter + 1)
      saveKingdom(kingdom)
      c.phase = 'chapter_complete'
      clog(c, `🏰 Province ${c.chapter} of Continent 1 is Claimed. Province ${c.chapter + 1} awaits beyond the seam.`)
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
    // ── Ascending-deck: Continent-2 province transitions + the crown ────────
    // V3 §8/§9: C2 = three provinces (ch4 Jack · ch5 Queen · ch6 King); the
    // King Gate's crown is the V3.0 victory.
    if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2) {
      if (c.chapter < 6) {
        if (!kingdom.unlockedChapters.includes(c.chapter + 1)) kingdom.unlockedChapters.push(c.chapter + 1)
        saveKingdom(kingdom)
        c.phase = 'chapter_complete'
        clog(c, `⚜ Province ${c.chapter - 3} of Continent 2 is Shaped. ${c.chapter === 4 ? 'The Queen Gate' : 'The King Gate'} waits beyond the seam.`)
        return
      }
      for (const cid of ['gambler', 'exile', 'oracle'] as ClassId[])
        if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
      // V3 §10 (slice 9): the crown unlocks the three non-home suit paths —
      // meta banks OPTIONS, not power (in-run breadth is V3.5).
      kingdom.pathsUnlocked = true
      kingdom.campaignsWon++
      saveKingdom(kingdom)
      c.phase = 'campaign_won'
      clog(c, '👑 The King Gate falls and the crown is yours — Continent 2 is Shaped. The campaign is WON!')
      clog(c, '   ✨ The other three suit paths open to your lineage (visible from your next run).')
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
  grantC2Rungs(c)   // crossing the continent seam lights the home-path C2 rung

  // V3 §9 (slice 8): the God-of-Luck wager at the continent seam — an
  // animation-only beat (the player always "loses"; Gab styles it later).
  if (EXPERIMENTS.ascendingDeck && c.chapter === 4) {
    clog(c, '🎲 At the seam, the God of Luck fans three cards. You pick — and lose. He smiles; the wager stands. (Animation placeholder.)')
  }

  // chapter-scoped state resets
  c.exiledCards = []
  c.exileBurden = 0
  c.gamblerWagerUsed = false
  c.ironReprieveUsed = false
  c.relicChapterUses = {}      // V3 §7: once-per-province relic uses refresh

  const { r, done } = rng(c)
  c.map = buildMap(c.chapter, r)
  done()

  // (The C1→C2 graduation fragment shop is retired — V3 §6: fragments feed the
  // gauntlet via the bracelet, never a shop. Code deleted in slice 9.)
  finishChapterTransition(c)
  return {}
}

// Build the chapter deck and drop onto the road — the tail of a chapter
// transition (also called when the post-Council shop closes). For the
// Continent seam, setupChapterDeck builds the FULL A-10 deck from ownedCards.
function finishChapterTransition(c: CampaignState) {
  // V3 seam reset (slice 5): a chapter/province boundary carries hands + tops
  // up to 5 — the automatic, lighter cousin of the Camp bundle (Decision 4).
  setupChapterDeck(c, { seam: true })
  c.phase = 'road'
  if (EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2)
    clog(c, `🗺 CONTINENT 2 · Province ${c.chapter - 3} — ${['the Jack Gate', 'the Queen Gate', 'the King Gate'][Math.min(c.chapter - 4, 2)]} lies at its end. Your deck marches with you.`)
  else if (EXPERIMENTS.ascendingDeck)
    clog(c, `🗺 Province ${c.chapter} of Continent 1: the road deepens.`)
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

  const heroes: ClientHero[] = c.heroes.map((h, i) => {
    const staff = getStaff(h.staffId)
    const rung = getLadder(h.pathC2)
    // V3 §2: the skill tree — the class's four suit ladders (home + three), each
    // with C2/C3/C4 rungs. V3.0 lights ONLY the home-suit C2 rung (on entering
    // Continent 2, via grantC2Rungs); everything else is visible-but-locked.
    const homeSuit = HOME_SUIT[h.classId]
    const ladders = laddersOf(h.classId)
    const path = ladders.length ? {
      homeSuit: homeSuit ?? '',
      ladders: ladders.map(l => ({
        id: l.id, name: l.name, suit: l.suit, theme: l.theme,
        isHome: l.suit === homeSuit,
        rungs: [
          { tier: 'C2' as const, text: l.c2, lit: l.id === h.pathC2 },
          { tier: 'C3' as const, text: l.c3, lit: false },
          { tier: 'C4' as const, text: l.c4, lit: false },
        ],
      })),
    } : null
    return {
      playerId: h.playerId,
      playerName: h.playerName,
      classId: h.classId,
      picked: c.phase !== 'class_select' || c.classPicks[h.playerId] !== null,
      className: CLASSES[h.classId].name,
      // V3 (ascending): identity = Staff + path rung; the legacy passive +
      // siege line only shows on non-ascending (quick-canon) campaigns.
      abilityText: EXPERIMENTS.ascendingDeck
        ? (staff ? `Staff — ${staff.name}: ${staff.text}` : CLASSES[h.classId].abilityText)
        : CLASSES[h.classId].abilityText +
          (CLASSES[h.classId].siegeText ? ` ⚔ Siege: ${CLASSES[h.classId].siegeText}` : ''),
      alive: h.alive,
      relics: h.relicIds.map(rid => ({ id: rid, name: getItem(rid).name, text: getItem(rid).text, tier: getItem(rid).tier })),
      handSize: s ? s.hands[i]!.length : (c.deck?.hands[i]?.length ?? 0),
      isCurrentPlayer: !!s && s.currentPlayerIndex === i && s.outcome === 'active',
      staff: staff ? { id: staff.id, name: staff.name, text: staff.text } : null,
      pathRung: rung ? { id: rung.id, name: rung.name, suit: rung.suit, text: rung.c2 } : null,
      path,
    }
  })

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
      // V3 §7: the equipped pool's activated relics (combat ones only — the
      // road-activated pair surfaces on the equipment panel instead)
      activatableRelics: EXPERIMENTS.ascendingDeck
        ? Object.values(equipmentOf(c)).filter((id): id is string => {
            const def = getV3Relic(id ?? undefined)
            return !!def?.activated && !def.road
          })
        : (me ? me.relicIds.filter(r => activatable.includes(r) && !s.flags[`relicUsed:${r}:${myHeroIndex}`]) : []),
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
        ? { suit: s.pendingGraft.suit, rank: s.pendingGraft.rank }
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
        // ascending-deck continent-2: which rank gate this boss node is
        const useRankSplit = EXPERIMENTS.ascendingDeck && continentOf(c.chapter) === 2
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
      pathsUnlocked: !!kingdom.pathsUnlocked,
    },
    log: c.log,
    cardTokens: projectCardTokens(c),
    tokenFragments: c.tokenFragments,
    tokenHalves: c.tokenHalves,
    ascendingDeck: EXPERIMENTS.ascendingDeck,
    physicalCards: projectPhysicalCards(c),
    gauntlet: EXPERIMENTS.ascendingDeck ? projectGauntlet(c) : undefined,
    // V3 §7: the bag + the four named slots
    relicBag: EXPERIMENTS.ascendingDeck
      ? relicBagOf(c).map(id => {
          const d = getV3Relic(id)!
          return { id, slot: d.slot, name: d.name, text: d.text }
        })
      : undefined,
    relicSlots: EXPERIMENTS.ascendingDeck
      ? Object.fromEntries(RELIC_SLOT_ORDER.map(slot => {
          const id = equipmentOf(c)[slot]
          const d = getV3Relic(id)
          return [slot, d ? { id: d.id, name: d.name, text: d.text, activated: !!d.activated } : null]
        }))
      : undefined,
  }
}

export function persist(c: CampaignState) {
  saveCampaign(c)
}

export { loadKingdom, maxHandSize }

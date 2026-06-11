import { createRng, hashSeed } from '../rng'
import type {
  CampaignState, ClassId, ClientCampaignState, ClientHero, ClientRoadNode,
  Hero, KingdomState, NodeKind, PendingChoice,
} from './types'
import { CLASSES, TIER1_CLASSES, getItem, itemsOf, MEMORY_POOL, ACTIVE_PREP_CAP, getEncounterDef, BOSS_MODIFIERS } from './content'
import { buildMap } from './maps'
import {
  startEncounter, maxHandSize, setupChapterDeck, campRest, dealReplacementHand,
} from './encounter'
import { loadKingdom, saveKingdom, saveCampaign } from './store'
import { EXPERIMENTS } from './experiments'

function clog(c: CampaignState, msg: string) {
  c.log.unshift(msg)
  if (c.log.length > 60) c.log.pop()
}

function rng(c: CampaignState) {
  const r = createRng(c.rngState)
  return { r, done() { c.rngState = r.state() } }
}

// ── Creation / class select ──────────────────────────────────────────────────

export function createCampaign(
  players: { id: string; name: string }[],
  chapter: 1 | 2,
  seed: string | undefined,
  kingdom: KingdomState,
): { campaign?: CampaignState; error?: string } {
  if (players.length < 1 || players.length > 4) return { error: 'Campaign supports 1-4 players.' }
  if (!kingdom.unlockedChapters.includes(chapter)) return { error: `Chapter ${chapter} is not unlocked.` }
  const realSeed = seed?.trim() || Math.random().toString(36).slice(2, 10)
  const c: CampaignState = {
    id: `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${players[0]!.name}'s lineage`,
    seed: realSeed,
    rngState: hashSeed(realSeed),
    createdAt: new Date().toISOString(),
    phase: 'class_select',
    chapter,
    heroes: players.map(p => ({
      playerId: p.id, playerName: p.name, classId: 'sentinel' as ClassId,
      alive: true, memories: [], relicId: null,
    })),
    map: null,
    encounter: null,
    deck: null,
    spells: [],
    preparations: [],
    activePreparations: [],
    exiledCards: [],
    exileBurden: 0,
    wardenDefiantUsed: false,
    gamblerWagerUsed: false,
    ironReprieveUsed: false,
    nextStarterIndex: null,
    shrineBlessing: false,
    pendingChoice: null,
    deathVote: null,
    memoryDraft: null,
    classPicks: Object.fromEntries(players.map(p => [p.id, null])),
    log: [],
    debug: {},
  }
  clog(c, `🏰 A new lineage sets out. Seed: ${realSeed}. Chapter ${chapter}.`)
  clog(c, '⚔️ Choose your heroes — the campaign starts with the core roster.')
  return { campaign: c }
}

export function applyClassPick(c: CampaignState, playerId: string, classId: ClassId): { error?: string } {
  if (c.phase !== 'class_select') return { error: 'Not selecting classes.' }
  // campaign start canon: core (Tier 1) heroes only; Tier 2/3 enter via replacement
  if (!TIER1_CLASSES.includes(classId)) return { error: 'Campaigns start with core heroes only.' }
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
    // small-company provisions (balance-testing): at 1-2 players each hero
    // starts with a standard relic to close the party-CT gap vs 4 players
    if (c.heroes.length <= 2) {
      for (const h of c.heroes) {
        const pool = itemsOf('relic', 'standard').filter(i => !c.heroes.some(o => o.relicId === i.id))
        if (pool.length) {
          h.relicId = r.pick(pool).id
          clog(c, `🏺 Small company provisions: ${h.playerName} sets out with ${getItem(h.relicId).name}.`)
        }
      }
    }
    done()
    setupChapterDeck(c)
    c.phase = 'road'
    clog(c, `🗺 The road to ${c.chapter === 1 ? 'the First Ascension' : 'the Broken Court'} unfolds. Choose your path.`)
    logNodeCT(c)
  }
  return {}
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

function labelOf(kind: NodeKind): string {
  return {
    start: 'the trailhead', camp: 'a camp', boss: 'the castle gates',
    skirmish: 'a skirmish', veteran: 'a veteran patrol', elite: 'an elite warband',
    forge: 'the Forge', abbey: 'the Abbey', market: 'the Market',
    tower: 'the Tower', shrine: 'the Shrine', lair: 'a Lair',
  }[kind]
}

function resolveNode(c: CampaignState, nodeId: string, kind: NodeKind) {
  switch (kind) {
    case 'skirmish': case 'veteran': case 'elite':
      startEncounter(c, nodeId, kind)
      c.phase = 'encounter'
      break
    case 'lair':
      clog(c, '🕸 The Lair: an elite gate guards a rare prize.')
      startEncounter(c, nodeId, 'elite', { isLair: true })
      c.phase = 'encounter'
      break
    case 'boss':
      startEncounter(c, nodeId, 'boss')
      c.phase = 'encounter'
      break
    case 'camp':
      c.phase = 'camp'
      campRest(c)   // reset canon: rests reshuffle the deck and redraw hands
      clog(c, '🏕 The party makes camp. Plan, prepare, recover.')
      break
    case 'forge': offerItems(c, 'relic', 'standard', 2, 'The Forge offers its work — choose a relic.'); break
    case 'abbey': offerItems(c, 'spell', 'standard', 2, 'The Abbey shares its rites — choose a spell.'); break
    case 'market': offerItems(c, 'preparation', 'standard', 3, 'The Market trades in readiness — choose a preparation.'); break
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
      c.shrineBlessing = true
      clog(c, '⛩ The Shrine blesses the party: next encounter, everyone draws 1 and the hand cap is raised by 1.')
      c.phase = 'road'
      break
    default:
      c.phase = 'road'
  }
}

// reward CT scales with party size (bible canon: TC/DV scale by player count)
// — small parties see one extra option per reward to close the tolerance gap
function rewardBonus(c: CampaignState): number {
  return c.heroes.length <= 2 ? 1 : 0
}

function offerItems(c: CampaignState, kind: 'relic' | 'spell' | 'preparation', tier: 'standard' | 'rare', n: number, prompt: string) {
  const { r, done } = rng(c)
  const owned = new Set([...c.spells, ...c.preparations, ...c.heroes.map(h => h.relicId).filter(Boolean) as string[]])
  let pool = itemsOf(kind, tier).filter(i => !owned.has(i.id))
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

export function applyChoice(c: CampaignState, playerId: string, optionId: string, hostId: string): { error?: string } {
  const pc = c.pendingChoice
  if (!pc) return { error: 'Nothing to choose.' }
  const decider = pc.forPlayerId ?? hostId
  if (playerId !== decider) return { error: 'Not your decision.' }
  if (!pc.options.some(o => o.id === optionId)) return { error: 'Invalid option.' }

  if (pc.kind === 'landmark_reward') {
    if (optionId.startsWith('hero-')) {
      c.nextStarterIndex = parseInt(optionId.slice(5))
      clog(c, `🗼 ${c.heroes[c.nextStarterIndex]!.playerName} will take the first turn of the next encounter.`)
      c.pendingChoice = null
      c.phase = pc.returnTo ?? 'road'   // Brace Command picks return to camp
      return {}
    } else if (optionId === 'intel') {
      clog(c, c.chapter === 2 ? '🗼 The Tower reveals the court’s corruption.' : '🗼 The Tower reveals little — the First Ascension hides no tricks.')
      c.debug = { ...c.debug }
      c.pendingChoice = null
      c.phase = 'road'
      // reveal applies to the *next* boss encounter — store on campaign
      ;(c as CampaignState & { bossIntel?: boolean }).bossIntel = true
      return {}
    } else {
      grantItem(c, optionId)
    }
    c.pendingChoice = null
    c.phase = 'road'
    return {}
  }

  if (pc.kind === 'replacement') {
    return applyReplacementPick(c, playerId, optionId)
  }

  if (pc.kind === 'exile_pick') {
    const [suit, ...rank] = optionId.split('')
    // physically remove the card from the persistent deck (tavern first, then discard)
    const deck = c.deck
    if (deck) {
      const match = (card: { suit: string; rank: string }) => card.suit === suit && card.rank === rank.join('')
      let i = deck.tavern.findIndex(match)
      if (i >= 0) deck.tavern.splice(i, 1)
      else {
        i = deck.discard.findIndex(match)
        if (i >= 0) deck.discard.splice(i, 1)
      }
    }
    c.exiledCards.push({ suit: suit!, rank: rank.join('') })
    const exiles = c.exiledCards.length
    if (exiles % 2 === 0) {
      c.exileBurden++
      clog(c, `🔥 ${optionId} is exiled from the deck. Burden grows (${c.exileBurden}).`)
    } else {
      clog(c, `🔥 ${optionId} is exiled from the deck for this chapter.`)
    }
    c.pendingChoice = null
    c.phase = 'camp'
    return {}
  }

  return { error: 'Unhandled choice.' }
}

function grantItem(c: CampaignState, itemId: string) {
  const item = getItem(itemId)
  if (item.kind === 'spell') {
    c.spells.push(itemId)
    clog(c, `📖 The team gains the spell ${item.name}.`)
  } else if (item.kind === 'preparation') {
    c.preparations.push(itemId)
    clog(c, `🎒 The team gains the preparation ${item.name}.`)
  } else if (item.kind === 'relic') {
    // one relic slot per hero; goes to the first living hero without one,
    // otherwise replaces the current player's relic (discard/replace canon)
    const free = c.heroes.find(h => h.alive && !h.relicId)
    const target = free ?? c.heroes.find(h => h.alive)!
    if (target.relicId) clog(c, `   ${target.playerName} discards ${getItem(target.relicId).name}.`)
    target.relicId = itemId
    clog(c, `🏺 ${target.playerName} equips ${item.name}.`)
  }
}

// ── Encounter end hooks (called by rooms layer after each encounter action) ──

// hand live deck state back to the campaign when an encounter ends
function reclaimDeck(c: CampaignState) {
  const s = c.encounter
  if (s) c.deck = { tavern: s.tavern, discard: s.discard, hands: s.hands }
}

export function checkEncounterEnd(c: CampaignState) {
  const s = c.encounter
  if (!s || s.outcome === 'active') return
  reclaimDeck(c)
  if (s.outcome === 'wiped') { c.encounter = null; return }

  if (s.outcome === 'won') {
    const node = c.map!.nodes.find(n => n.id === s.nodeId)!
    if (s.tier === 'boss') {
      // Province mode: the Gates and the Courtyard are intermediate rank
      // fights — pay spoils and march on. Only the Throne completes the run.
      if (EXPERIMENTS.provinceMode && node.next.length > 0) {
        const { r, done } = rng(c)
        const isCourtyard = c.map!.nodes.some(n => n.kind === 'boss' && n.layer < node.layer)
        const pool = (isCourtyard
          ? [...itemsOf('relic', 'rare'), ...itemsOf('spell', 'rare')]
          : [...itemsOf('spell', 'standard'), ...itemsOf('preparation', 'standard'), ...itemsOf('relic', 'standard')])
          .filter(i => !c.spells.includes(i.id) && !c.preparations.includes(i.id) && !c.heroes.some(h => h.relicId === i.id))
        const options = r.shuffle(pool).slice(0, 3 + rewardBonus(c))
        done()
        c.encounter = null
        ;(c as CampaignState & { secondWindUsed?: boolean }).secondWindUsed = false   // mercy renews each act
        clog(c, isCourtyard ? '👑 The Courtyard is yours. The Throne room lies ahead.' : '🏰 The Gates have fallen. The Courtyard awaits.')
        if (options.length) {
          c.phase = 'landmark'
          c.pendingChoice = {
            kind: 'landmark_reward', forPlayerId: null,
            prompt: isCourtyard ? 'Spoils of the Courtyard — claim a rare prize.' : 'Spoils of the Gates — choose your reward.',
            options: options.map(i => ({ id: i.id, label: `${i.name}${i.tier === 'rare' ? ' ★' : ''}`, detail: i.text })),
          }
        } else c.phase = 'road'
        return
      }
      c.encounter = null
      beginMemoryDraft(c)
      return
    }
    // encounter rewards (controlled drop tables)
    if (node.kind === 'lair') {
      const { r, done } = rng(c)
      const pool = [...itemsOf('relic', 'rare'), ...itemsOf('spell', 'rare')]
        .filter(i => !c.spells.includes(i.id) && !c.heroes.some(h => h.relicId === i.id))
      const options = r.shuffle(pool).slice(0, 2 + rewardBonus(c))
      done()
      c.encounter = null
      if (options.length) {
        c.phase = 'landmark'
        c.pendingChoice = {
          kind: 'landmark_reward', forPlayerId: null,
          prompt: 'The Lair’s hoard lies open — claim a rare prize.',
          options: options.map(i => ({ id: i.id, label: `${i.name} ★`, detail: i.text })),
        }
      } else c.phase = 'road'
      return
    }
    // standard encounter drops: skirmish → random standard prep; veteran/elite → choice
    const { r, done } = rng(c)
    if (node.kind === 'skirmish') {
      const pool = itemsOf('preparation', 'standard').filter(i => !c.preparations.includes(i.id))
      if (pool.length) {
        const item = r.pick(pool)
        c.preparations.push(item.id)
        clog(c, `🎒 Spoils: the team gains ${item.name}.`)
      }
      done()
      c.encounter = null
      c.phase = 'road'
      return
    }
    const pool = [...itemsOf('spell', 'standard'), ...itemsOf('preparation', 'standard'), ...(node.kind === 'elite' ? itemsOf('relic', 'rare') : [])]
      .filter(i => !c.spells.includes(i.id) && !c.preparations.includes(i.id) && !c.heroes.some(h => h.relicId === i.id))
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

export function applyActivatePreparation(c: CampaignState, playerId: string, prepId: string, hostId: string): { error?: string } {
  if (c.phase !== 'camp') return { error: 'Preparations are activated at camp.' }
  if (playerId !== hostId) return { error: 'The host activates preparations (table consensus assumed).' }
  const i = c.preparations.indexOf(prepId)
  if (i < 0) return { error: 'The team does not own that preparation.' }
  if (c.activePreparations.length >= ACTIVE_PREP_CAP) return { error: `At most ${ACTIVE_PREP_CAP} preparations may be active (v0 cap).` }
  if (prepId === 'p-brace-command') {
    // consumed at camp: choose starting hero now, then return to camp
    c.preparations.splice(i, 1)
    c.phase = 'landmark'
    c.pendingChoice = {
      kind: 'landmark_reward', forPlayerId: null,
      prompt: 'Brace Command: choose who starts the next encounter.',
      options: c.heroes.filter(h => h.alive).map(h => ({ id: `hero-${c.heroes.indexOf(h)}`, label: h.playerName })),
      returnTo: 'camp',
    }
    return {}
  }
  c.preparations.splice(i, 1)
  c.activePreparations.push(prepId)
  clog(c, `🎒 ${getItem(prepId).name} will trigger at the next encounter.`)
  return {}
}

export function applyExileAtCamp(c: CampaignState, playerId: string): { error?: string } {
  if (c.phase !== 'camp') return { error: 'Exile works at camp.' }
  const hero = c.heroes.find(h => h.playerId === playerId)
  if (!hero?.alive || hero.classId !== 'exile') return { error: 'Only a living Exile can do this.' }
  if (c.encounter?.flags?.['exiledThisCamp']) return { error: 'Once per camp.' }
  const flagged = (c as CampaignState & { exileCampFlag?: string }).exileCampFlag
  if (flagged === c.map!.currentNodeId) return { error: 'Once per camp.' }
  ;(c as CampaignState & { exileCampFlag?: string }).exileCampFlag = c.map!.currentNodeId

  // pick a card actually present in the Tavern/discard right now (canon: exile
  // one Tavern card; hands are private and stay untouchable)
  const present = new Set<string>()
  for (const card of [...(c.deck?.tavern ?? []), ...(c.deck?.discard ?? [])])
    if (card.rank !== 'Jo') present.add(`${card.suit}${card.rank}`)
  const options: PendingChoice['options'] = []
  for (const suit of ['C', 'D', 'H', 'S']) {
    for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']) {
      const key = `${suit}${rank}`
      if (present.has(key)) options.push({ id: key, label: `${rank}${{ C: '♣', D: '♦', H: '♥', S: '♠' }[suit]}` })
    }
  }
  if (options.length === 0) return { error: 'No cards available to exile right now.' }
  c.phase = 'landmark'
  c.pendingChoice = {
    kind: 'exile_pick', forPlayerId: playerId,
    prompt: 'Exile one card from the deck for the rest of this chapter. (Every second exile adds Burden.)',
    options,
  }
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
  hero.classId = classId as ClassId
  hero.alive = true
  hero.memories = []
  hero.relicId = null

  // camp join canon: stronger onboarding bonus — a standard relic
  const { r, done } = rng(c)
  const pool = itemsOf('relic', 'standard').filter(i => !c.heroes.some(h => h.relicId === i.id))
  if (pool.length) {
    hero.relicId = r.pick(pool).id
    clog(c, `   Onboarding: equipped ${getItem(hero.relicId).name}.`)
  }
  done()
  dealReplacementHand(c, deadIdx)
  clog(c, `🎖 ${hero.playerName} returns as the ${CLASSES[hero.classId].name}.`)
  c.pendingChoice = null
  c.phase = 'camp'
  return {}
}

// ── Memory draft + chapter transitions ───────────────────────────────────────

function beginMemoryDraft(c: CampaignState) {
  const survivors = c.heroes.map((h, i) => (h.alive ? i : -1)).filter(i => i >= 0)
  const { r, done } = rng(c)
  c.memoryDraft = {
    drafts: survivors.map(hi => {
      const owned = new Set(c.heroes[hi]!.memories)
      const options = r.shuffle(MEMORY_POOL.filter(m => !owned.has(m))).slice(0, 3)
      return { heroIndex: hi, options, picked: null }
    }),
  }
  done()
  c.phase = 'memory_draft'
  clog(c, `👑 ${c.chapter === 1 ? 'The First Ascension is complete!' : 'The Broken Court has fallen!'} Each survivor drafts a Memory.`)
}

export function applyMemoryPick(c: CampaignState, playerId: string, memoryId: string, kingdom: KingdomState): { error?: string } {
  if (c.phase !== 'memory_draft' || !c.memoryDraft) return { error: 'No draft in progress.' }
  const hi = c.heroes.findIndex(h => h.playerId === playerId)
  const draft = c.memoryDraft.drafts.find(d => d.heroIndex === hi)
  if (!draft) return { error: 'You have no draft (only survivors draft).' }
  if (draft.picked) return { error: 'Already picked.' }
  if (!draft.options.includes(memoryId)) return { error: 'Not one of your options.' }
  draft.picked = memoryId
  c.heroes[hi]!.memories.push(memoryId)
  clog(c, `🧠 ${c.heroes[hi]!.playerName} keeps the memory: ${getItem(memoryId).name}.`)

  if (c.memoryDraft.drafts.every(d => d.picked)) {
    c.memoryDraft = null
    completeChapter(c, kingdom)
  }
  return {}
}

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
    for (const cid of ['gambler', 'exile', 'oracle'] as ClassId[])
      if (!kingdom.unlockedClasses.includes(cid)) kingdom.unlockedClasses.push(cid)
    kingdom.campaignsWon++
    saveKingdom(kingdom)
    c.phase = 'campaign_won'
    clog(c, '👑 The campaign is won. Kingdom unlocks: Gambler, Exile, Oracle.')
  }
}

export function applyContinueChapter(c: CampaignState, playerId: string, hostId: string): { error?: string } {
  if (c.phase !== 'chapter_complete') return { error: 'No chapter transition pending.' }
  if (playerId !== hostId) return { error: 'The host leads the march.' }
  c.chapter = 2
  // chapter-scoped state resets
  c.exiledCards = []
  c.exileBurden = 0
  c.gamblerWagerUsed = false
  c.ironReprieveUsed = false
  c.activePreparations = []
  const { r, done } = rng(c)
  c.map = buildMap(2, r)
  done()
  setupChapterDeck(c)   // each chapter starts with a fresh full deck
  c.phase = 'road'
  clog(c, '🗺 Chapter 2: the Broken Court. The road is harder and the rewards are richer.')
  logNodeCT(c)
  return {}
}

// ── Client projection ────────────────────────────────────────────────────────

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
    memories: h.memories.map(m => ({ id: m, name: getItem(m).name, text: getItem(m).text })),
    relic: h.relicId ? { id: h.relicId, name: getItem(h.relicId).name, text: getItem(h.relicId).text, tier: getItem(h.relicId).tier } : null,
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
      preps: s.preps.map(p => ({ id: p, name: getItem(p).name, text: getItem(p).text })),
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
      canWager: !!me && me.classId === 'gambler' && me.alive && !c.gamblerWagerUsed && s.outcome === 'active',
      myRelicActivatable: !!me?.relicId && activatable.includes(me.relicId) && !s.flags[`relicUsed:${myHeroIndex}`],
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
    isHost: forPlayerId === hostId,
    map,
    encounter,
    spells: c.spells.map(itemView),
    preparations: c.preparations.map(itemView),
    activePreparations: c.activePreparations.map(itemView),
    pendingChoice: c.pendingChoice
      ? { ...c.pendingChoice, mine: (c.pendingChoice.forPlayerId ?? hostId) === forPlayerId }
      : null,
    deathVote: c.deathVote
      ? {
          deadHeroName: c.heroes[c.deathVote.deadHeroIndex]!.playerName,
          options: ['retreat', 'last_stand', ...(c.deathVote.defiantAvailable ? ['defiant_stand'] : [])],
          votes: c.deathVote.votes,
          myVote: c.deathVote.votes[forPlayerId] ?? null,
          isBoss: false,
        }
      : null,
    memoryDraft: c.memoryDraft
      ? {
          myOptions: (() => {
            const d = c.memoryDraft!.drafts.find(dd => dd.heroIndex === myHeroIndex && !dd.picked)
            return d ? d.options.map(itemView) : null
          })(),
          waitingOn: c.memoryDraft.drafts.filter(d => !d.picked).map(d => c.heroes[d.heroIndex]!.playerName),
        }
      : null,
    exileAvailable:
      c.phase === 'camp' &&
      myHeroIndex >= 0 &&
      c.heroes[myHeroIndex]!.alive &&
      c.heroes[myHeroIndex]!.classId === 'exile' &&
      (c as CampaignState & { exileCampFlag?: string }).exileCampFlag !== c.map?.currentNodeId,
    kingdom: {
      unlockedChapters: kingdom.unlockedChapters,
      unlockedClasses: kingdom.unlockedClasses,
      specializationsUnlocked: kingdom.specializationsUnlocked,
    },
    log: c.log,
  }
}

export function persist(c: CampaignState) {
  saveCampaign(c)
}

export { loadKingdom, maxHandSize }

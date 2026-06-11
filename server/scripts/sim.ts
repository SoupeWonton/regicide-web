// Campaign balance simulator — runs full campaigns with weighted bot "personas"
// across all player counts and reports win/loss data.
//
// Run:  npx tsx scripts/sim.ts [--seeds 25] [--counts 1,2,3,4] [--lineups slayer,bulwark,hoarder,sniper,steady,mixed]
//
// Output: server/data/sim/<stamp>/runs.csv, encounters.csv, summary.json
// (server/data is gitignored). kingdom.json is snapshotted and restored so
// simulation does not pollute real progression.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyDeathVote,
  applyActivatePreparation, applyExileAtCamp, applyBreakCamp, beginReplacement,
  applyMemoryPick, applyContinueChapter, checkEncounterEnd,
} from '../campaign/campaign'
import {
  applyEncounterPlay, applyEncounterDiscard, applyEncounterYield,
  applyEncounterChooseNext, applySetupReorder, applyCastSpell,
  applyActivateRelic, applyArmWager, maxHandSize,
} from '../campaign/encounter'
import { getItem } from '../campaign/content'
import { EXPERIMENTS } from '../campaign/experiments'
import { cardValue } from '../deck'
import { createRng, type Rng } from '../rng'
import type { Card, Suit } from '../types'
import type { CampaignState, ClassId, CtCategory, EncounterState, KingdomState } from '../campaign/types'

// ── Personas ─────────────────────────────────────────────────────────────────
// Weight profiles shared with sim-base.ts — same values, same decision logic;
// the game mode is the experiment variable.

import { PERSONAS, MIXED_ORDER, type Persona } from './sim-personas'

// ── Small helpers ────────────────────────────────────────────────────────────

const val = (card: Card) => cardValue(card.rank)
const handVal = (h: Card[]) => h.reduce((t, card) => t + val(card), 0)

function suitPref(p: Persona): Record<Suit, number> {
  return { C: p.aggression, S: p.shieldWeight, D: p.drawWeight, H: p.recoverWeight }
}

function fatigue(c: CampaignState): number {
  // 0 = everyone at full hand, 1 = everyone empty
  const alive = c.heroes.filter(h => h.alive).length || 1
  const hands = c.encounter ? c.encounter.hands : c.deck?.hands ?? []
  const total = hands.reduce((t, h) => t + h.length, 0)
  return Math.max(0, 1 - total / (alive * maxHandSize(c)))
}

// ── Play-phase evaluation ────────────────────────────────────────────────────

interface PlayOption {
  kind: 'play' | 'yield'
  idxs: number[]
  score: number
  kills: boolean
  dies: boolean
}

function legalPlaySets(hand: Card[]): number[][] {
  const out: number[][] = []
  for (let i = 0; i < hand.length; i++) out.push([i])
  // ace + one other (no jesters)
  const aces = hand.map((card, i) => ({ card, i })).filter(x => x.card.rank === 'A')
  for (const a of aces)
    for (let i = 0; i < hand.length; i++)
      if (i !== a.i && hand[i]!.rank !== 'Jo' && hand[i]!.rank !== 'A') out.push([a.i, i])
  // same-rank sets, total ≤ 10
  const byRank = new Map<string, number[]>()
  for (let i = 0; i < hand.length; i++) {
    const r = hand[i]!.rank
    if (r === 'Jo' || r === 'A') continue
    if (!byRank.has(r)) byRank.set(r, [])
    byRank.get(r)!.push(i)
  }
  for (const [rank, idxs] of byRank) {
    const v = cardValue(rank as Card['rank'])
    for (let size = 2; size <= idxs.length && size * v <= 10; size++)
      out.push(idxs.slice(0, size))
  }
  return out
}

function evalPlay(c: CampaignState, s: EncounterState, pi: number, idxs: number[], p: Persona): PlayOption {
  const hand = s.hands[pi]!
  const cards = idxs.map(i => hand[i]!)
  const enemy = s.currentEnemy!
  const hero = c.heroes[pi]!
  const base = cards.reduce((t, card) => t + val(card), 0)

  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const suits = new Set(cards.map(card => card.suit).filter(su => su !== immuneSuit))

  let mult = 1
  if (suits.has('C')) mult *= 2
  if (s.flags[`keenEdge:${pi}`]) mult *= 2
  if (s.flags[`crownbreaker:${pi}`]) mult *= 3
  const damage = base * mult

  let hpAfter = enemy.hp - damage
  const execReady = hpAfter > 0 && hpAfter <= 2 &&
    c.heroes.some(h => h.alive && h.classId === 'executioner') && !s.flags['enemy.execFinish']
  if (execReady) hpAfter -= 2
  const kills = hpAfter <= 0
  const exact = hpAfter === 0

  let shieldGain = 0
  if (suits.has('S')) {
    shieldGain = base
    if (hero.classId === 'sentinel' && !s.flags['enemy.sentinelSpade']) shieldGain += 2
  }
  const draws = suits.has('D') ? Math.min(base, s.tavern.length) : 0
  const recov = suits.has('H') ? Math.min(base, s.discard.length) : 0

  // context scaling: recovery matters most when the Tavern is nearly dry
  // (attrition canon: Hearts are the only mid-fight refill), draws matter
  // most when hands are thin, shields matter more the longer the fight ahead
  const alive = c.heroes.filter(h => h.alive).length
  const tavernLow = s.tavern.length <= alive * 2 ? 1.6 : s.tavern.length <= alive * 4 ? 0.7 : 0
  const f = fatigue(c)

  let counterCost = 0
  let dies = false
  let fullyShielded = false
  if (!kills) {
    const net = Math.max(0, enemy.attack - (enemy.shield + shieldGain))
    fullyShielded = shieldGain > 0 && net === 0
    counterCost = net
    const remaining = handVal(hand) - base
    if (remaining < net) dies = true
  }

  let score =
    p.aggression * Math.min(damage, enemy.hp + 4) +
    (kills ? p.killBonus : 0) +
    (exact ? p.exactBonus + (enemy.card.rank === 'K' ? 3 : enemy.card.rank === 'Q' ? 2 : 1) : 0) +
    p.shieldWeight * shieldGain * (kills ? 0.2 : 1 + s.enemyDeck.length * 0.08) +
    (fullyShielded ? p.shieldWeight * 3 : 0) +
    p.drawWeight * draws * (0.6 + f * 1.6) +
    p.recoverWeight * recov * (1 + tavernLow) -
    p.conserve * base -
    (kills ? 0 : p.riskAversion * counterCost) -
    (dies ? 200 * p.riskAversion + 120 : 0)
  return { kind: 'play', idxs, score, kills, dies }
}

function evalYield(c: CampaignState, s: EncounterState, pi: number, p: Persona): PlayOption {
  const enemy = s.currentEnemy!
  const net = Math.max(0, enemy.attack - enemy.shield)
  const dies = handVal(s.hands[pi]!) < net
  // fully-shielded yields are pure stalling — attacking costs nothing extra
  const score = p.yieldBias + p.conserve * 3 - p.riskAversion * net -
    (net === 0 ? 8 : 0) - (dies ? 200 * p.riskAversion + 120 : 0)
  return { kind: 'yield', idxs: [], score, kills: false, dies }
}

function evalJester(c: CampaignState, s: EncounterState, pi: number, p: Persona, jesterIdx: number): PlayOption {
  const enemy = s.currentEnemy
  const alive = c.heroes.filter(h => h.alive).length
  let score = 0
  if (alive === 1) {
    // solo panic button: full hand refresh — shines when the hand is weak
    const hv = handVal(s.hands[pi]!)
    score = (maxHandSize(c) * 5.5 - hv) * 0.3 - 4
  } else if (enemy && !enemy.immunityNullified) {
    const unlock = { C: p.aggression * 8, S: p.shieldWeight * 5, D: p.drawWeight * 5, H: p.recoverWeight * 5 }[enemy.card.suit]
    score = unlock - 2
  } else {
    score = -6 // immunity already gone: jester is mostly a wasted turn
  }
  return { kind: 'play', idxs: [jesterIdx], score, kills: false, dies: false }
}

// minimal-waste discard: meet the requirement while keeping the cards this
// persona values (suit preference) and wasting as little value as possible
function chooseDiscard(hand: Card[], needed: number, p: Persona): number[] {
  const prefs = suitPref(p)
  let best: { idxs: number[]; cost: number } | null = null
  const n = hand.length
  for (let mask = 1; mask < 1 << n; mask++) {
    let total = 0
    let keepLoss = 0
    const idxs: number[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const card = hand[i]!
        total += val(card)
        keepLoss += card.rank === 'Jo' ? 6 : prefs[card.suit] * val(card) * 0.2
        idxs.push(i)
      }
    }
    if (total < needed) continue
    const cost = (total - needed) * 2 + keepLoss + idxs.length * 0.1
    if (!best || cost < best.cost) best = { idxs, cost }
  }
  return best ? best.idxs : hand.map((_, i) => i)
}

// ── Stats ────────────────────────────────────────────────────────────────────

interface EncRecord {
  ref: EncounterState
  chapter: number
  nodeKind: string
  tier: string
  modifier: string
  bossModifier: string
  attempt: number
  turns: number
  deaths: number
  outcome: string
  defeated: number
  totalEnemies: number
}

interface RunRecord {
  runId: string
  seed: string
  playerCount: number
  lineup: string
  personas: string
  result: string
  chapterReached: number
  actions: number
  encountersFought: number
  encountersWon: number
  retreats: number
  heroDeaths: number
  exactKills: number
  jesters: number
  yields: number
  itemsGained: number
  lossNodeKind: string
  lossModifier: string
  reachedBoss1: number   // 0/1 — reached the chapter 1 castle
  beatCh1: number        // 0/1 — completed chapter 1
  reachedBoss2: number   // 0/1 — reached the chapter 2 castle
  deathsByPersona: string
  classes: string        // starting classes, in seat order
  deathsByClass: string  // classId:count|... (classId at time of death)
}

// ── Bot driver ───────────────────────────────────────────────────────────────

function runCampaign(
  lineupId: string,
  personas: Persona[],
  seed: string,
  kingdom: KingdomState,
  encOut: EncRecord[],
  runId: string,
  forcedClasses?: ClassId[],   // class-isolation mode: seat i plays forcedClasses[i]
): RunRecord {
  const players = personas.map((p, i) => ({ id: `p${i + 1}`, name: `${p.id}-${i + 1}` }))
  const HOST = players[0]!.id
  const decide: Rng = createRng(`decide-${seed}-${lineupId}`)
  const personaOf = (pi: number) => personas[pi]!
  const personaById = (pid: string) => personas[players.findIndex(pl => pl.id === pid)]!

  const rec: RunRecord = {
    runId, seed, playerCount: personas.length, lineup: lineupId,
    personas: personas.map(p => p.id).join('+'),
    result: 'stalled', chapterReached: 1, actions: 0,
    encountersFought: 0, encountersWon: 0, retreats: 0, heroDeaths: 0,
    exactKills: 0, jesters: 0, yields: 0, itemsGained: 0,
    lossNodeKind: '', lossModifier: '',
    reachedBoss1: 0, beatCh1: 0, reachedBoss2: 0, deathsByPersona: '',
    classes: '', deathsByClass: '',
  }
  const deathTally = new Map<string, number>()
  const classDeathTally = new Map<string, number>()

  const { campaign: c, error } = createCampaign(players, 1, seed, kingdom)
  if (error || !c) { rec.result = `error:${error}`; return rec }

  // class select: forced assignment (class-isolation mode) or each player picks
  // their persona's highest available pref
  for (let i = 0; i < players.length; i++) {
    const pl = players[i]!
    let pick: ClassId
    if (forcedClasses) {
      pick = forcedClasses[i]!
    } else {
      const p = personaById(pl.id)
      const taken = new Set(Object.values(c.classPicks).filter(Boolean))
      pick = p.classPref.find(cid =>
        ['sentinel', 'quartermaster', 'surgeon', 'executioner'].includes(cid) && !taken.has(cid))!
    }
    applyClassPick(c, pl.id, pick)
  }
  rec.classes = players.map(pl => c.classPicks[pl.id]).join('+')

  let aliveBefore = c.heroes.map(h => h.alive)
  let cur: EncRecord | null = null
  const retreatsAtNode = new Map<string, number>()
  let prevItems = 0

  const countItems = () =>
    c.spells.length + c.preparations.length + c.activePreparations.length +
    c.heroes.reduce((t, h) => t + h.memories.length + (h.relicId ? 1 : 0), 0)
  prevItems = countItems()

  function afterAction() {
    rec.actions++
    // hero deaths
    c.heroes.forEach((h, i) => {
      if (aliveBefore[i] && !h.alive) {
        rec.heroDeaths++
        if (cur) cur.deaths++
        const pid = personaOf(i).id
        deathTally.set(pid, (deathTally.get(pid) ?? 0) + 1)
        const cls = c.heroes[i]!.classId
        classDeathTally.set(cls, (classDeathTally.get(cls) ?? 0) + 1)
      }
    })
    aliveBefore = c.heroes.map(h => h.alive)
    const items = countItems()
    if (items > prevItems) rec.itemsGained += items - prevItems
    prevItems = items
    // encounter end bookkeeping. Two paths: we call checkEncounterEnd ourselves
    // after most actions, but applyDeathVote (retreat) calls it internally —
    // detect that by the encounter object disappearing under us.
    const s = c.encounter
    if (s && s.outcome !== 'active') {
      finalizeCur()
      checkEncounterEnd(c)
    } else if (cur && (!s || s !== cur.ref)) {
      finalizeCur()
    }
  }

  function finalizeCur() {
    if (!cur) return
    const s = cur.ref
    cur.outcome = s.outcome === 'active' ? 'abandoned' : s.outcome
    cur.defeated = s.defeatedCount
    rec.exactKills += (s.flags['exactKills'] as number) ?? 0
    if (s.outcome === 'won') rec.encountersWon++
    if (s.outcome === 'retreated') {
      rec.retreats++
      retreatsAtNode.set(s.nodeId, (retreatsAtNode.get(s.nodeId) ?? 0) + 1)
    }
    if (s.outcome === 'wiped') { rec.lossNodeKind = cur.nodeKind; rec.lossModifier = cur.modifier || cur.bossModifier }
    encOut.push(cur)
    cur = null
  }

  function act(fn: () => { error?: string }, label: string): boolean {
    const r = fn()
    if (r.error) {
      rec.result = `error:${label}:${r.error}`
      return false
    }
    afterAction()
    return true
  }

  let budget = 8000
  while (budget-- > 0) {
    if (c.phase === 'campaign_won') { rec.result = 'won'; break }
    if (c.phase === 'campaign_lost') { rec.result = 'lost'; break }
    rec.chapterReached = c.chapter

    switch (c.phase) {
      case 'road': {
        const map = c.map!
        const node = map.nodes.find(n => n.id === map.currentNodeId)!
        const p = personaOf(0) // host commits the route; host persona steers
        const f = fatigue(c)
        let bestId = node.next[0]!
        let bestScore = -Infinity
        for (const nid of node.next) {
          const n = map.nodes.find(nn => nn.id === nid)!
          let score: number
          if (!n.known) {
            score = 0.4 + p.routeGreed * 0.2
          } else if (['skirmish', 'veteran', 'elite', 'lair', 'boss'].includes(n.kind)) {
            score = p.routeGreed * n.rewardCT * 2 + p.routeFight * 0.5 - p.riskAversion * n.pressureCT * (0.5 + f)
          } else if (n.kind === 'camp') {
            score = p.routeSafety * (0.4 + 2.2 * f)
          } else {
            const cat: CtCategory =
              n.kind === 'tower' ? 'Initiative' : n.kind === 'shrine' ? 'Access' :
              n.kind === 'abbey' ? 'Recovery' : n.kind === 'forge' ? 'Shield' : 'Consistency'
            score = p.routeSafety * 0.8 + p.catPrefs[cat] * 0.5
          }
          score += decide.next() * 0.15 // tiny noise to break symmetric ties
          if (score > bestScore) { bestScore = score; bestId = nid }
        }
        if (!act(() => applyRoadChoose(c, HOST, bestId, HOST), 'road')) return rec
        break
      }

      case 'landmark':
      case 'replace_hero': {
        const pc = c.pendingChoice!
        const deciderId = pc.forPlayerId ?? HOST
        const p = personaById(deciderId) ?? personaOf(0)
        let optId = pc.options[0]!.id
        if (pc.kind === 'replacement') {
          optId = p.classPref.find(cid => pc.options.some(o => o.id === cid)) ?? optId
        } else if (pc.kind === 'exile_pick') {
          // exile the lowest card of the least-valued suit
          const prefs = suitPref(p)
          let best = Infinity
          for (const o of pc.options) {
            const suit = o.id[0] as Suit
            const v = cardValue(o.id.slice(1) as Card['rank'])
            const cost = v * 2 + prefs[suit]
            if (cost < best) { best = cost; optId = o.id }
          }
        } else {
          // landmark_reward: items by category pref; tower/brace = hero pick or intel
          let bestScore = -Infinity
          for (const o of pc.options) {
            let score: number
            if (o.id.startsWith('hero-')) {
              const hi = parseInt(o.id.slice(5))
              const hands = c.encounter ? c.encounter.hands : c.deck?.hands ?? []
              score = (handVal(hands[hi] ?? []) / 10) + 0.5
            } else if (o.id === 'intel') {
              score = c.chapter === 2 ? 0.5 + p.riskAversion * 0.6 : -1
            } else {
              const item = getItem(o.id)
              score = p.catPrefs[item.category] + (item.tier === 'rare' ? p.rarePref : 0)
            }
            score += decide.next() * 0.1
            if (score > bestScore) { bestScore = score; optId = o.id }
          }
        }
        if (!act(() => applyChoice(c, deciderId, optId, HOST), `choice:${pc.kind}`)) return rec
        break
      }

      case 'encounter': {
        const s = c.encounter!
        // fresh encounter? start a record (also counts re-entries as new attempts)
        if (!cur || cur.ref !== s) {
          const node = c.map!.nodes.find(n => n.id === s.nodeId)
          if (s.tier === 'boss') {
            if (c.chapter === 1) rec.reachedBoss1 = 1
            else rec.reachedBoss2 = 1
          }
          cur = {
            ref: s, chapter: c.chapter, nodeKind: node?.kind ?? s.tier, tier: s.tier,
            modifier: s.modifierId ?? '', bossModifier: s.bossModifierId ?? '',
            attempt: (retreatsAtNode.get(s.nodeId) ?? 0) + 1,
            turns: 0, deaths: 0, outcome: 'active', defeated: 0, totalEnemies: s.totalEnemies,
          } as EncRecord
          rec.encountersFought++
        }

        if (s.turnPhase === 'setup') {
          const peek = s.setupPeek!
          // put the highest cards on top — they are drawn first
          const order = peek.cards.map((card, i) => ({ i, v: val(card) }))
            .sort((a, b) => b.v - a.v).map(x => x.i)
          if (!act(() => applySetupReorder(c, peek.playerId, order), 'setup')) return rec
          break
        }

        const pi = s.currentPlayerIndex
        const pid = c.heroes[pi]!.playerId
        const p = personaOf(pi)

        if (s.turnPhase === 'choose_next') {
          // target the living hero with the strongest hand (self allowed)
          let target = pi
          let bestV = -1
          c.heroes.forEach((h, i) => {
            if (!h.alive) return
            const v = handVal(s.hands[i]!) + (i === pi ? 1 : 0) // slight keep bias
            if (v > bestV) { bestV = v; target = i }
          })
          const keep = s.pendingChooseNext && target === pi
          if (!act(() => applyEncounterChooseNext(c, pid, target, keep), 'choose_next')) return rec
          break
        }

        if (s.turnPhase === 'discard') {
          if (c.spells.includes('s-calm-pulse') && s.discardNeeded >= 3 && p.spellEagerness > 0.3) {
            if (!act(() => applyCastSpell(c, pid, 's-calm-pulse'), 'calm-pulse')) return rec
            break
          }
          const idxs = chooseDiscard(s.hands[pi]!, s.discardNeeded, p)
          if (!act(() => applyEncounterDiscard(c, pid, idxs), 'discard')) return rec
          break
        }

        // ── play phase ──
        cur.turns++
        const hand = s.hands[pi]!
        const enemy = s.currentEnemy

        // utility relics when the tavern runs dry
        const relic = c.heroes[pi]!.relicId
        if (relic && !s.flags[`relicUsed:${pi}`] && s.tavern.length === 0 && s.discard.length >= 2 &&
            (relic === 'r-bone-thread' || relic === 'r-sainted-scalpel')) {
          if (!act(() => applyActivateRelic(c, pid), 'relic')) return rec
          break
        }

        // spells (one action per loop iteration, then replan)
        if (enemy && hand.length > 0) {
          const opts = legalPlaySets(hand).filter(ix => hand[ix[0]!]!.rank !== 'Jo')
            .map(ix => evalPlay(c, s, pi, ix, p))
          const best = opts.length ? opts.reduce((a, b) => (b.score > a.score ? b : a)) : null
          const bestDmg = best ? hand.length && best.idxs.reduce((t, i) => t + val(hand[i]!), 0) : 0
          const canKill = best?.kills ?? false

          if (!canKill && best && p.spellEagerness > 0.3) {
            const immune = !enemy.immunityNullified && enemy.card.suit === 'C'
            const rawBest = Math.max(...opts.map(o => {
              const b = o.idxs.reduce((t, i) => t + val(hand[i]!), 0)
              const hasClub = o.idxs.some(i => hand[i]!.suit === 'C') && !immune
              return b * (hasClub ? 2 : 1)
            }))
            if (c.spells.includes('s-keen-edge') && rawBest * 2 >= enemy.hp) {
              if (!act(() => applyCastSpell(c, pid, 's-keen-edge'), 'keen-edge')) return rec
              break
            }
            if (c.spells.includes('s-crownbreaker') && rawBest * 3 >= enemy.hp &&
                (s.tier === 'boss' || enemy.card.rank === 'K' || p.spellEagerness > 0.7)) {
              if (!act(() => applyCastSpell(c, pid, 's-crownbreaker'), 'crownbreaker')) return rec
              break
            }
            void bestDmg
          }
          if (c.spells.includes('s-quick-muster') && hand.length <= 2 && s.tavern.length > 0 && p.spellEagerness > 0.2) {
            if (!act(() => applyCastSpell(c, pid, 's-quick-muster'), 'quick-muster')) return rec
            break
          }
          if (c.spells.includes('s-tactical-surge') && fatigue(c) > 0.6 && s.tavern.length > 0 && p.spellEagerness > 0.3) {
            if (!act(() => applyCastSpell(c, pid, 's-tactical-surge'), 'tactical-surge')) return rec
            break
          }
          if (c.spells.includes('s-refit') && s.tavern.length === 0 && s.discard.length >= 3) {
            if (!act(() => applyCastSpell(c, pid, 's-refit'), 'refit')) return rec
            break
          }
          if (c.spells.includes('s-full-recycle') && s.tavern.length === 0 && s.discard.length >= 4) {
            if (!act(() => applyCastSpell(c, pid, 's-full-recycle'), 'full-recycle')) return rec
            break
          }
          if (!canKill && enemy.attack - enemy.shield >= 4 && p.spellEagerness > 0.4) {
            if (c.spells.includes('s-guard-up')) {
              if (!act(() => applyCastSpell(c, pid, 's-guard-up'), 'guard-up')) return rec
              break
            }
            if (c.spells.includes('s-bulwark-chant')) {
              if (!act(() => applyCastSpell(c, pid, 's-bulwark-chant'), 'bulwark-chant')) return rec
              break
            }
          }
          // gambler wager: arm when we predict a kill this turn
          if (canKill && c.heroes[pi]!.classId === 'gambler' && !c.gamblerWagerUsed &&
              s.wagerArmedBy === null && p.spellEagerness > 0.5) {
            if (!act(() => applyArmWager(c, pid), 'wager')) return rec
            break
          }
        }

        // choose among plays / jester / yield
        if (hand.length === 0) {
          rec.yields++
          if (!act(() => applyEncounterYield(c, pid), 'yield-empty')) return rec
          break
        }
        const options: PlayOption[] = []
        const jesterIdx = hand.findIndex(card => card.rank === 'Jo')
        for (const ix of legalPlaySets(hand)) {
          if (hand[ix[0]!]!.rank === 'Jo') continue
          if (enemy) options.push(evalPlay(c, s, pi, ix, p))
        }
        if (jesterIdx >= 0) options.push(evalJester(c, s, pi, p, jesterIdx))
        if (enemy) options.push(evalYield(c, s, pi, p))
        const choice = options.reduce((a, b) => (b.score > a.score ? b : a))
        if (choice.kind === 'yield') {
          rec.yields++
          if (!act(() => applyEncounterYield(c, pid), 'yield')) return rec
        } else {
          if (hand[choice.idxs[0]!]!.rank === 'Jo') rec.jesters++
          if (!act(() => applyEncounterPlay(c, pid, choice.idxs), 'play')) return rec
        }
        break
      }

      case 'death_vote': {
        const s = c.encounter!
        const dv = c.deathVote!
        const node = s.nodeId
        const forcedStand = (retreatsAtNode.get(node) ?? 0) >= 2 // stop retreat ping-pong
        for (const h of c.heroes) {
          if (!c.deathVote) break
          const p = personaById(h.playerId)
          const enemy = s.currentEnemy
          let desire = p.lastStandBase +
            (enemy && enemy.hp <= 12 ? 0.25 : 0) +
            (s.defeatedCount / Math.max(1, s.totalEnemies)) * 0.2 -
            fatigue(c) * 0.3
          if (forcedStand) desire = 1
          const wantsFight = decide.next() < desire
          const vote = wantsFight
            ? (dv.defiantAvailable ? 'defiant_stand' : 'last_stand')
            : 'retreat'
          const r = applyDeathVote(c, h.playerId, vote)
          if (r.error) { rec.result = `error:vote:${r.error}`; return rec }
          afterAction()
        }
        break
      }

      case 'camp': {
        // 1) replace the fallen
        if (c.heroes.some(h => !h.alive)) {
          if (!act(() => beginReplacement(c, kingdom), 'begin-replacement')) return rec
          break
        }
        // 2) activate up to 2 preps, best category fit first
        if (c.preparations.length > 0 && c.activePreparations.length < 2) {
          const p = personaOf(0)
          const ranked = [...c.preparations].sort((a, b) => {
            const ia = getItem(a), ib = getItem(b)
            return (p.catPrefs[ib.category] + (ib.tier === 'rare' ? p.rarePref : 0)) -
                   (p.catPrefs[ia.category] + (ia.tier === 'rare' ? p.rarePref : 0))
          })
          if (!act(() => applyActivatePreparation(c, HOST, ranked[0]!, HOST), 'prep')) return rec
          break
        }
        // 3) exile a weak card if an Exile is in the party (max 3 per chapter)
        const exIdx = c.heroes.findIndex(h => h.alive && h.classId === 'exile')
        if (exIdx >= 0 && c.exiledCards.length < 3 &&
            (c as CampaignState & { exileCampFlag?: string }).exileCampFlag !== c.map!.currentNodeId) {
          const r = applyExileAtCamp(c, c.heroes[exIdx]!.playerId)
          if (!r.error) { afterAction(); break }
          // fall through if nothing to exile
        }
        if (!act(() => applyBreakCamp(c, HOST, HOST), 'break-camp')) return rec
        break
      }

      case 'memory_draft': {
        const d = c.memoryDraft!.drafts.find(dd => !dd.picked)!
        const pid = c.heroes[d.heroIndex]!.playerId
        const p = personaOf(d.heroIndex)
        const pick = [...d.options].sort((a, b) => p.catPrefs[getItem(b).category] - p.catPrefs[getItem(a).category])[0]!
        if (!act(() => applyMemoryPick(c, pid, pick, kingdom), 'memory')) return rec
        break
      }

      case 'chapter_complete': {
        if (!act(() => applyContinueChapter(c, HOST, HOST), 'continue')) return rec
        break
      }

      default:
        rec.result = `error:phase:${c.phase}`
        return rec
    }
  }

  if (rec.result === 'stalled') rec.lossNodeKind = c.phase
  rec.chapterReached = c.chapter
  if (c.chapter === 2 || rec.result === 'won') rec.beatCh1 = 1
  rec.deathsByPersona = [...deathTally.entries()].map(([k, v]) => `${k}:${v}`).join('|')
  rec.deathsByClass = [...classDeathTally.entries()].map(([k, v]) => `${k}:${v}`).join('|')
  return rec
}

// ── CSV / output ─────────────────────────────────────────────────────────────

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0]!)
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(col => esc(r[col])).join(','))].join('\n')
}

function pct(n: number, d: number): string {
  return d === 0 ? '—' : `${((100 * n) / d).toFixed(1)}%`
}

// ── Main ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, dflt: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && args[i + 1] ? args[i + 1]! : dflt
  }
  return {
    seeds: parseInt(get('--seeds', '25')),
    counts: get('--counts', '1,2,3,4').split(',').map(Number),
    lineups: get('--lineups', 'slayer,bulwark,hoarder,sniper,steady,mixed').split(','),
    // class-isolation mode: comma-separated combos of +-joined classes, all seats
    // played by --persona (default steady). Overrides --counts/--lineups.
    classCombos: get('--classes', '').split(',').filter(Boolean).map(s => s.split('+') as ClassId[]),
    persona: get('--persona', 'steady'),
    ownerOnly: args.includes('--owner-only'),
    bossReshuffle: args.includes('--boss-reshuffle'),
    castleHearts: args.includes('--castle-hearts'),
    shortCastle: args.includes('--short-castle'),
    province: args.includes('--province'),
  }
}

const { seeds, classCombos, persona: personaFlag, ownerOnly, bossReshuffle, castleHearts, shortCastle, province } = parseArgs()
let { counts, lineups } = parseArgs()
if (classCombos.length) {
  lineups = classCombos.map(cc => cc.join('+'))
  counts = [...new Set(classCombos.map(cc => cc.length))]
}
EXPERIMENTS.ownerOnlyClassTriggers = ownerOnly
EXPERIMENTS.preBossReshuffle = bossReshuffle
EXPERIMENTS.castleHearts = castleHearts
EXPERIMENTS.shortCastle = shortCastle
EXPERIMENTS.provinceMode = province
const active = Object.entries(EXPERIMENTS).filter(([, v]) => v).map(([k]) => k)
if (active.length) console.log(`experiments: ${active.join(', ')}`)

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(HERE, '..', 'data')
const KINGDOM_FILE = path.join(DATA_DIR, 'kingdom.json')
const kingdomBackup = fs.existsSync(KINGDOM_FILE) ? fs.readFileSync(KINGDOM_FILE, 'utf-8') : null

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const OUT_DIR = path.join(DATA_DIR, 'sim', stamp)
fs.mkdirSync(OUT_DIR, { recursive: true })

const runs: RunRecord[] = []
const encs: (EncRecord & { runId: string; playerCount: number; lineup: string })[] = []

const t0 = Date.now()
let runCounter = 0

function runBatch(lineupId: string, count: number, personas: Persona[], forcedClasses?: ClassId[]) {
  for (let si = 0; si < seeds; si++) {
    const kingdom: KingdomState = {
      unlockedChapters: [1, 2],
      unlockedClasses: ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden', 'gambler', 'exile', 'oracle'],
      specializationsUnlocked: true, campaignsWon: 0, heroesLost: 0,
    }
    const runId = `r${++runCounter}`
    const seed = `sim-${lineupId}-${count}p-${si}`
    const encBuf: EncRecord[] = []
    const r = runCampaign(lineupId, personas, seed, kingdom, encBuf, runId, forcedClasses)
    runs.push(r)
    for (const e of encBuf) {
      const { ref: _ref, ...rest } = e
      encs.push({ ...rest, runId, playerCount: count, lineup: lineupId } as typeof encs[number])
    }
    if (r.result.startsWith('error')) console.error(`  ⚠ ${runId} ${seed}: ${r.result}`)
  }
  const slice = runs.filter(r => r.playerCount === count && r.lineup === lineupId)
  const w = slice.filter(r => r.result === 'won').length
  console.log(`${count}p ${lineupId.padEnd(8)} — ${w}/${slice.length} won (${pct(w, slice.length)})`)
}

try {
  if (classCombos.length) {
    const p = PERSONAS[personaFlag]
    if (!p) { console.error(`Unknown persona: ${personaFlag}`); process.exit(1) }
    for (const combo of classCombos) {
      runBatch(combo.join('+'), combo.length, combo.map(() => p), combo)
    }
  } else {
    for (const count of counts) {
      for (const lineupId of lineups) {
        if (lineupId === 'mixed' && count === 1) continue // mixed needs 2+
        const personas: Persona[] =
          lineupId === 'mixed'
            ? Array.from({ length: count }, (_, i) => PERSONAS[MIXED_ORDER[i % MIXED_ORDER.length]!]!)
            : Array.from({ length: count }, () => PERSONAS[lineupId]!)
        if (personas.some(p => !p)) { console.error(`Unknown lineup: ${lineupId}`); process.exit(1) }
        runBatch(lineupId, count, personas)
      }
    }
  }
} finally {
  // restore real kingdom progression
  if (kingdomBackup !== null) fs.writeFileSync(KINGDOM_FILE, kingdomBackup)
  else if (fs.existsSync(KINGDOM_FILE)) fs.unlinkSync(KINGDOM_FILE)
}

// ── Write outputs ────────────────────────────────────────────────────────────

const encRows = encs.map(({ ref: _r, ...e }) => e as unknown as Record<string, unknown>)
fs.writeFileSync(path.join(OUT_DIR, 'runs.csv'), csv(runs as unknown as Record<string, unknown>[]))
fs.writeFileSync(path.join(OUT_DIR, 'encounters.csv'), csv(encRows))

// ── Summary ──────────────────────────────────────────────────────────────────

interface Agg { runs: number; wins: number; losses: number; stalled: number; deaths: number; retreats: number }
function agg(rs: RunRecord[]): Agg {
  return {
    runs: rs.length,
    wins: rs.filter(r => r.result === 'won').length,
    losses: rs.filter(r => r.result === 'lost').length,
    stalled: rs.filter(r => r.result !== 'won' && r.result !== 'lost').length,
    deaths: rs.reduce((t, r) => t + r.heroDeaths, 0),
    retreats: rs.reduce((t, r) => t + r.retreats, 0),
  }
}

const summary: Record<string, unknown> = {}
console.log('\n══════════ SUMMARY ══════════')

console.log('\nWin rate by player count:')
const byCount: Record<string, unknown> = {}
for (const count of counts) {
  const rs = runs.filter(r => r.playerCount === count)
  const a = agg(rs)
  byCount[`${count}p`] = a
  console.log(`  ${count}p: ${pct(a.wins, a.runs)} won (${a.wins}/${a.runs}) — avg deaths ${(a.deaths / a.runs).toFixed(2)}, avg retreats ${(a.retreats / a.runs).toFixed(2)}`)
}
summary['byCount'] = byCount

console.log('\nWin rate by lineup × player count:')
const byLineup: Record<string, unknown> = {}
for (const lineupId of lineups) {
  const row: string[] = []
  for (const count of counts) {
    const rs = runs.filter(r => r.playerCount === count && r.lineup === lineupId)
    if (!rs.length) { row.push('   —  '); continue }
    const a = agg(rs)
    row.push(pct(a.wins, a.runs).padStart(6))
    byLineup[`${lineupId}-${count}p`] = {
      ...a,
      reachedBoss1: rs.filter(r => r.reachedBoss1).length,
      beatCh1: rs.filter(r => r.beatCh1).length,
      reachedBoss2: rs.filter(r => r.reachedBoss2).length,
    }
  }
  console.log(`  ${lineupId.padEnd(8)} ${row.join('  ')}`)
}
summary['byLineup'] = byLineup

console.log('\nProgression funnel by lineup (all counts pooled): reached ch1 boss → beat ch1 → reached ch2 boss → won')
for (const lineupId of lineups) {
  const rs = runs.filter(r => r.lineup === lineupId)
  if (!rs.length) continue
  const f1 = rs.filter(r => r.reachedBoss1).length
  const f2 = rs.filter(r => r.beatCh1).length
  const f3 = rs.filter(r => r.reachedBoss2).length
  const f4 = rs.filter(r => r.result === 'won').length
  console.log(`  ${lineupId.padEnd(8)} ${pct(f1, rs.length).padStart(6)} → ${pct(f2, rs.length).padStart(6)} → ${pct(f3, rs.length).padStart(6)} → ${pct(f4, rs.length).padStart(6)}`)
}

console.log('\nDeaths per persona slot (mixed lineups — who dies in a diverse party):')
const mixedDeaths: Record<string, number> = {}
let mixedRuns = 0
for (const r of runs.filter(rr => rr.lineup === 'mixed')) {
  mixedRuns++
  for (const part of r.deathsByPersona.split('|').filter(Boolean)) {
    const [pid, n] = part.split(':')
    mixedDeaths[pid!] = (mixedDeaths[pid!] ?? 0) + parseInt(n!)
  }
}
for (const [pid, n] of Object.entries(mixedDeaths).sort((a, b) => b[1] - a[1]))
  console.log(`  ${pid.padEnd(8)} ${n} deaths across ${mixedRuns} mixed runs`)
summary['mixedDeaths'] = mixedDeaths

console.log('\nCampaign losses by location (node kind where the wipe happened):')
const lossLoc: Record<string, number> = {}
for (const r of runs.filter(rr => rr.result === 'lost')) {
  const k = `${r.lossNodeKind}${r.lossModifier ? ` (${r.lossModifier})` : ''} ch${r.chapterReached}`
  lossLoc[k] = (lossLoc[k] ?? 0) + 1
}
for (const [k, n] of Object.entries(lossLoc).sort((a, b) => b[1] - a[1])) console.log(`  ${n}× ${k}`)
summary['lossLocations'] = lossLoc

console.log('\nEncounter outcomes by tier (chapter 1 / chapter 2):')
const byTier: Record<string, unknown> = {}
for (const ch of [1, 2]) {
  for (const tier of ['skirmish', 'veteran', 'elite', 'boss']) {
    const es = encs.filter(e => e.tier === tier && e.chapter === ch)
    if (!es.length) continue
    const won = es.filter(e => e.outcome === 'won').length
    const retreated = es.filter(e => e.outcome === 'retreated').length
    const wiped = es.filter(e => e.outcome === 'wiped').length
    const deaths = es.reduce((t, e) => t + e.deaths, 0)
    byTier[`ch${ch}-${tier}`] = { fights: es.length, won, retreated, wiped, deaths }
    console.log(`  ch${ch} ${tier.padEnd(8)}: ${es.length} fights — won ${pct(won, es.length)}, retreat ${pct(retreated, es.length)}, wiped ${wiped}, deaths/fight ${(deaths / es.length).toFixed(2)}`)
  }
}
summary['byTier'] = byTier

console.log('\nDeadliest encounter modifiers (deaths per fight, min 5 fights):')
const byMod: Record<string, { fights: number; deaths: number; retreats: number; winRate: number }> = {}
for (const e of encs.filter(ee => ee.modifier)) {
  const m = (byMod[e.modifier] ??= { fights: 0, deaths: 0, retreats: 0, winRate: 0 })
  m.fights++
  m.deaths += e.deaths
  if (e.outcome === 'retreated') m.retreats++
  if (e.outcome === 'won') m.winRate++
}
const modRows = Object.entries(byMod).filter(([, m]) => m.fights >= 5)
  .sort((a, b) => b[1].deaths / b[1].fights - a[1].deaths / a[1].fights)
for (const [id, m] of modRows)
  console.log(`  ${id.padEnd(20)} ${m.fights} fights — deaths/fight ${(m.deaths / m.fights).toFixed(2)}, won ${pct(m.winRate, m.fights)}, retreats ${m.retreats}`)
summary['byModifier'] = byMod

console.log('\nBoss-modifier win rates (chapter 2 castle):')
const byBossMod: Record<string, { fights: number; won: number; deaths: number }> = {}
for (const e of encs.filter(ee => ee.tier === 'boss' && ee.chapter === 2)) {
  const key = e.bossModifier || 'none'
  const m = (byBossMod[key] ??= { fights: 0, won: 0, deaths: 0 })
  m.fights++
  if (e.outcome === 'won') m.won++
  m.deaths += e.deaths
}
for (const [id, m] of Object.entries(byBossMod))
  console.log(`  ${id.padEnd(16)} ${m.fights} fights — won ${pct(m.won, m.fights)}, deaths/fight ${(m.deaths / m.fights).toFixed(2)}`)
summary['byBossModifier'] = byBossMod

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2))

const errs = runs.filter(r => r.result.startsWith('error'))
if (errs.length) {
  console.log(`\n⚠ ${errs.length} runs hit engine errors (see runs.csv):`)
  for (const r of errs.slice(0, 5)) console.log(`  ${r.runId} ${r.seed}: ${r.result}`)
}

console.log(`\n${runs.length} campaigns, ${encs.length} encounters in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log(`Data: ${OUT_DIR}`)

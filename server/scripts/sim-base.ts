// Base-game (quick game) Regicide simulator — the same weighted personas as
// the campaign simulator (sim.ts), driving the unmodified base engine in
// game.ts: 12 royals, discard auto-recycles into the tavern, one unpayable
// counterattack loses the game outright.
//
// Run:  npx tsx scripts/sim-base.ts [--runs 50] [--counts 1,2,3,4] [--lineups slayer,bulwark,hoarder,sniper,steady,mixed]
//
// Note: the base engine shuffles with Math.random (no seeded RNG), so runs
// are statistically reproducible but not replayable card-for-card.
//
// Output: server/data/sim-base/<stamp>/games.csv, summary.json

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createGame, applyPlayCards, applyDiscard, applyYield, applyChooseNext } from '../game'
import { cardValue, handSize, validateCombo } from '../deck'
import { createRng } from '../rng'
import type { Card, GameState, Suit } from '../types'
import { PERSONAS, MIXED_ORDER, type Persona } from './sim-personas'

const val = (card: Card) => cardValue(card.rank)
const handVal = (h: Card[]) => h.reduce((t, card) => t + val(card), 0)

function suitPref(p: Persona): Record<Suit, number> {
  return { C: p.aggression, S: p.shieldWeight, D: p.drawWeight, H: p.recoverWeight }
}

// ── Move generation / evaluation (base-game flavour of sim.ts logic) ────────

function legalPlaySets(hand: Card[]): number[][] {
  const out: number[][] = []
  for (let i = 0; i < hand.length; i++) out.push([i])
  const aces = hand.map((card, i) => ({ card, i })).filter(x => x.card.rank === 'A')
  for (const a of aces)
    for (let i = 0; i < hand.length; i++)
      if (i !== a.i && hand[i]!.rank !== 'Jo' && hand[i]!.rank !== 'A') out.push([a.i, i])
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
  return out.filter(ix => !validateCombo(ix.map(i => hand[i]!)))
}

interface PlayOption { kind: 'play' | 'yield'; idxs: number[]; score: number; kills: boolean; dies: boolean }

function fatigue(g: GameState): number {
  const max = handSize(g.players.length)
  const total = g.players.reduce((t, pl) => t + pl.hand.length, 0)
  return Math.max(0, 1 - total / (g.players.length * max))
}

function evalPlay(g: GameState, pi: number, idxs: number[], p: Persona): PlayOption {
  const hand = g.players[pi]!.hand
  const cards = idxs.map(i => hand[i]!)
  const enemy = g.currentEnemy!
  const base = cards.reduce((t, card) => t + val(card), 0)
  const classes = g.classIds ?? []
  const flags = g.abilityFlags ?? {}

  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const suits = new Set(cards.map(card => card.suit).filter(su => su !== immuneSuit))

  const damage = suits.has('C') ? base * 2 : base
  let hpAfter = enemy.hp - damage
  if (hpAfter > 0 && hpAfter <= 2 && classes.includes('executioner') && !flags['execFinish']) hpAfter -= 2
  const kills = hpAfter <= 0
  const exact = hpAfter === 0

  let shieldGain = suits.has('S') ? base : 0
  if (shieldGain > 0 && classes[pi] === 'sentinel' && !flags['sentinelSpade']) shieldGain += 2
  // official rules: the Tavern is never reshuffled — Hearts are the only refill
  const draws = suits.has('D') ? Math.min(base, g.tavern.length) : 0
  const recov = suits.has('H') ? Math.min(base, g.discard.length) : 0
  const f = fatigue(g)
  const tavernLow = g.tavern.length <= g.players.length * 2 ? 1.6 : g.tavern.length <= g.players.length * 4 ? 0.7 : 0

  let counterCost = 0
  let dies = false
  let fullyShielded = false
  if (!kills) {
    const net = Math.max(0, enemy.attack - (enemy.shield + shieldGain))
    fullyShielded = shieldGain > 0 && net === 0
    counterCost = net
    if (handVal(hand) - base < net) dies = true
  }

  const score =
    p.aggression * Math.min(damage, enemy.hp + 4) +
    (kills ? p.killBonus : 0) +
    (exact ? p.exactBonus + (enemy.card.rank === 'K' ? 3 : enemy.card.rank === 'Q' ? 2 : 1) : 0) +
    p.shieldWeight * shieldGain * (kills ? 0.2 : 1 + g.enemyDeck.length * 0.08) +
    (fullyShielded ? p.shieldWeight * 3 : 0) +
    p.drawWeight * draws * (0.6 + f * 1.6) +
    p.recoverWeight * recov * (1 + tavernLow) -
    p.conserve * base -
    (kills ? 0 : p.riskAversion * counterCost) -
    (dies ? 400 * p.riskAversion + 300 : 0)   // base game: a death IS the loss
  return { kind: 'play', idxs, score, kills, dies }
}

function evalYield(g: GameState, pi: number, p: Persona): PlayOption {
  const enemy = g.currentEnemy!
  const net = Math.max(0, enemy.attack - enemy.shield)
  const dies = handVal(g.players[pi]!.hand) < net
  // fully-shielded yields are pure stalling — attacking costs nothing extra
  const score = p.yieldBias + p.conserve * 3 - p.riskAversion * net -
    (net === 0 ? 8 : 0) - (dies ? 400 * p.riskAversion + 300 : 0)
  return { kind: 'yield', idxs: [], score, kills: false, dies }
}

function evalJester(g: GameState, p: Persona, jesterIdx: number): PlayOption {
  const enemy = g.currentEnemy
  let score = -6
  if (enemy && !enemy.immunityNullified) {
    score = { C: p.aggression * 8, S: p.shieldWeight * 5, D: p.drawWeight * 5, H: p.recoverWeight * 5 }[enemy.card.suit] - 2
  }
  return { kind: 'play', idxs: [jesterIdx], score, kills: false, dies: false }
}

function chooseDiscard(hand: Card[], needed: number, p: Persona): number[] {
  const prefs = suitPref(p)
  let best: { idxs: number[]; cost: number } | null = null
  for (let mask = 1; mask < 1 << hand.length; mask++) {
    let total = 0
    let keepLoss = 0
    const idxs: number[] = []
    for (let i = 0; i < hand.length; i++) {
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

// ── One game ─────────────────────────────────────────────────────────────────

interface GameRecord {
  runId: string
  playerCount: number
  lineup: string
  personas: string
  classes: string
  omitted: string           // leave-one-out experiments: the class NOT in play
  result: string
  defeated: number          // royals down (0-12) at game end
  lostAtRank: string        // J / Q / K ('' on win)
  lostByClass: string       // class of the player who couldn't pay ('' on win / no classes)
  lostByPersona: string
  turns: number
  exactKills: number
  jesters: number
  yields: number
}

const TIER1 = ['sentinel', 'quartermaster', 'surgeon', 'executioner']

function playGame(runId: string, lineupId: string, personas: Persona[], decideSeed: string, withClasses: boolean, classSet?: string[]): GameRecord {
  const players = personas.map((p, i) => ({ id: `p${i + 1}`, name: `${p.id}-${i + 1}` }))
  // class picks mirror the campaign: each player takes their persona's highest
  // tier-1 preference that is still free. --classset overrides (leave-one-out
  // experiments: decouples the class set from persona pick order).
  let classIds: string[] | undefined
  if (classSet) {
    classIds = personas.map((_, i) => classSet[i % classSet.length]!)
  } else if (withClasses) {
    const taken = new Set<string>()
    classIds = personas.map(p => {
      const pick = p.classPref.find(cid => TIER1.includes(cid) && !taken.has(cid))!
      taken.add(pick)
      return pick
    })
  }
  let g = createGame(players, classIds)
  const decide = createRng(decideSeed)

  const rec: GameRecord = {
    runId, playerCount: personas.length, lineup: lineupId,
    personas: personas.map(p => p.id).join('+'),
    classes: classIds?.join('+') ?? '',
    omitted: '',
    result: 'stalled', defeated: 0, lostAtRank: '', lostByClass: '', lostByPersona: '', turns: 0,
    exactKills: 0, jesters: 0, yields: 0,
  }

  let budget = 2000
  while (budget-- > 0 && g.phase === 'playing') {
    const pi = g.currentPlayerIndex
    const p = personas[pi]!
    const hand = g.players[pi]!.hand

    if (g.turnPhase === 'choose_next') {
      // jester handoff: strongest hand takes the next turn
      let target = pi
      let bestV = -1
      g.players.forEach((pl, i) => {
        const v = handVal(pl.hand) + (i === pi ? 1 : 0)
        if (v > bestV) { bestV = v; target = i }
      })
      const r = applyChooseNext(g, pi, target)
      if (r.error) { rec.result = `error:choose:${r.error}`; break }
      g = r.state
      continue
    }

    if (g.turnPhase === 'discard') {
      const idxs = chooseDiscard(hand, g.discardNeeded, p)
      const r = applyDiscard(g, pi, idxs)
      if (r.error) { rec.result = `error:discard:${r.error}`; break }
      g = r.state
      continue
    }

    // play phase
    rec.turns++
    if (hand.length === 0) {
      rec.yields++
      const r = applyYield(g, pi)
      if (r.error) { rec.result = `error:yield:${r.error}`; break }
      g = r.state
      continue
    }
    const options: PlayOption[] = []
    const jesterIdx = hand.findIndex(card => card.rank === 'Jo')
    for (const ix of legalPlaySets(hand)) {
      if (hand[ix[0]!]!.rank === 'Jo') continue
      options.push(evalPlay(g, pi, ix, p))
    }
    if (jesterIdx >= 0) options.push(evalJester(g, p, jesterIdx))
    options.push(evalYield(g, pi, p))
    // deterministic tie-break noise
    for (const o of options) o.score += decide.next() * 0.01
    const choice = options.reduce((a, b) => (b.score > a.score ? b : a))

    if (choice.kind === 'yield') {
      rec.yields++
      const r = applyYield(g, pi)
      if (r.error) { rec.result = `error:yield:${r.error}`; break }
      g = r.state
    } else {
      if (hand[choice.idxs[0]!]!.rank === 'Jo') rec.jesters++
      const r = applyPlayCards(g, pi, choice.idxs)
      if (r.error) { rec.result = `error:play:${r.error}`; break }
      g = r.state
    }
  }

  rec.defeated = 12 - g.enemyDeck.length - (g.currentEnemy ? 1 : 0)
  rec.exactKills = rec.defeated - g.defeatedEnemies.length
  if (g.phase === 'won') rec.result = 'won'
  else if (g.phase === 'lost') {
    rec.result = 'lost'
    rec.lostAtRank = g.currentEnemy?.card.rank ?? ''
    // the loss always happens on the current player's counter check
    rec.lostByClass = g.classIds?.[g.currentPlayerIndex] ?? ''
    rec.lostByPersona = personas[g.currentPlayerIndex]!.id
  }
  return rec
}

// ── Batch ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, dflt: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && args[i + 1] ? args[i + 1]! : dflt
  }
  return {
    runsPerCell: parseInt(get('--runs', '50')),
    counts: get('--counts', '1,2,3,4').split(',').map(Number),
    lineups: get('--lineups', 'slayer,bulwark,hoarder,sniper,steady,mixed').split(','),
    withClasses: args.includes('--classes'),
    loo: args.includes('--loo'),   // 3p leave-one-out class experiment
  }
}

const { runsPerCell, counts, lineups, withClasses, loo } = parseArgs()

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0]!)
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(col => esc(r[col])).join(','))].join('\n')
}
const pct = (n: number, d: number) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)}%`)

const HERE = path.dirname(fileURLToPath(import.meta.url))
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const OUT_DIR = path.join(HERE, '..', 'data', 'sim-base', stamp + (loo ? '-loo' : withClasses ? '-classes' : ''))
fs.mkdirSync(OUT_DIR, { recursive: true })
console.log(`Mode: base Regicide ${loo ? '3p LEAVE-ONE-OUT class experiment' : withClasses ? 'WITH tier-1 classes' : '(no classes)'}\n`)

const games: GameRecord[] = []
const t0 = Date.now()
let runCounter = 0

function lineupPersonas(lineupId: string, count: number): Persona[] {
  const personas: Persona[] =
    lineupId === 'mixed'
      ? Array.from({ length: count }, (_, i) => PERSONAS[MIXED_ORDER[i % MIXED_ORDER.length]!]!)
      : Array.from({ length: count }, () => PERSONAS[lineupId]!)
  if (personas.some(p => !p)) { console.error(`Unknown lineup: ${lineupId}`); process.exit(1) }
  return personas
}

if (loo) {
  // 3 players, every 3-of-4 class subset, every lineup: the omitted class is
  // the experiment variable, persona is controlled for by pooling lineups.
  const count = 3
  for (const omit of TIER1) {
    const set = TIER1.filter(cid => cid !== omit)
    for (const lineupId of lineups) {
      const personas = lineupPersonas(lineupId, count)
      for (let i = 0; i < runsPerCell; i++) {
        const runId = `b${++runCounter}`
        const r = playGame(runId, lineupId, personas, `loo-${omit}-${lineupId}-${i}`, true, set)
        r.omitted = omit
        games.push(r)
      }
    }
    const slice = games.filter(r => r.omitted === omit)
    const w = slice.filter(r => r.result === 'won').length
    console.log(`without ${omit.padEnd(13)} — ${w}/${slice.length} won (${pct(w, slice.length)})`)
  }
} else {
  for (const count of counts) {
    for (const lineupId of lineups) {
      if (lineupId === 'mixed' && count === 1) continue
      const personas = lineupPersonas(lineupId, count)
      for (let i = 0; i < runsPerCell; i++) {
        const runId = `b${++runCounter}`
        games.push(playGame(runId, lineupId, personas, `base-${lineupId}-${count}p-${i}`, withClasses))
      }
      const slice = games.filter(r => r.playerCount === count && r.lineup === lineupId)
      const w = slice.filter(r => r.result === 'won').length
      console.log(`${count}p ${lineupId.padEnd(8)} — ${w}/${slice.length} won (${pct(w, slice.length)})`)
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'games.csv'), csv(games as unknown as Record<string, unknown>[]))

// ── Leave-one-out summary ────────────────────────────────────────────────────

if (loo) {
  const summary: Record<string, unknown> = {}
  console.log('\n══════════ LEAVE-ONE-OUT SUMMARY (3p, all lineups pooled) ══════════')

  console.log('\nWin rate / progress by omitted class:')
  const byOmit: Record<string, unknown> = {}
  for (const omit of TIER1) {
    const rs = games.filter(r => r.omitted === omit)
    const w = rs.filter(r => r.result === 'won').length
    const avgDef = rs.reduce((t, r) => t + r.defeated, 0) / rs.length
    const ex = rs.reduce((t, r) => t + r.exactKills, 0) / rs.length
    byOmit[omit] = { games: rs.length, won: w, avgDefeated: +avgDef.toFixed(2), exactKills: +ex.toFixed(2) }
    console.log(`  without ${omit.padEnd(13)}: ${pct(w, rs.length).padStart(6)} won — avg royals ${avgDef.toFixed(2)}/12, exact kills/game ${ex.toFixed(2)}`)
  }
  summary['byOmittedClass'] = byOmit

  console.log('\nWin rate by omitted class × lineup:')
  console.log(`  ${''.padEnd(16)}${lineups.map(l => l.padStart(8)).join('')}`)
  for (const omit of TIER1) {
    const row: string[] = []
    for (const lineupId of lineups) {
      const rs = games.filter(r => r.omitted === omit && r.lineup === lineupId)
      row.push(rs.length ? pct(rs.filter(r => r.result === 'won').length, rs.length).padStart(8) : '       —')
    }
    console.log(`  without ${omit.padEnd(13)}${row.join('')}`)
  }

  console.log('\nWho holds the bag (class of the player who could not pay, losses only):')
  const lostBy: Record<string, number> = {}
  const presence: Record<string, number> = {}
  for (const r of games) {
    for (const cid of r.classes.split('+')) presence[cid] = (presence[cid] ?? 0) + 1
    if (r.result === 'lost' && r.lostByClass) lostBy[r.lostByClass] = (lostBy[r.lostByClass] ?? 0) + 1
  }
  for (const cid of TIER1) {
    const n = lostBy[cid] ?? 0
    const pres = presence[cid] ?? 0
    console.log(`  ${cid.padEnd(13)} ${String(n).padStart(4)} fatal turns in ${pres} games present → ${pct(n, pres)} of its games end on its turn`)
  }
  summary['lostByClass'] = lostBy
  summary['classPresence'] = presence

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\n${games.length} games in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`Data: ${OUT_DIR}`)
  process.exit(0)
}

// ── Summary ──────────────────────────────────────────────────────────────────

const summary: Record<string, unknown> = {}
console.log('\n══════════ SUMMARY (base Regicide) ══════════')

console.log('\nWin rate by player count:')
const byCount: Record<string, unknown> = {}
for (const count of counts) {
  const rs = games.filter(r => r.playerCount === count)
  const w = rs.filter(r => r.result === 'won').length
  const avgDef = rs.reduce((t, r) => t + r.defeated, 0) / rs.length
  byCount[`${count}p`] = { games: rs.length, won: w, avgDefeated: +avgDef.toFixed(2) }
  console.log(`  ${count}p: ${pct(w, rs.length)} won (${w}/${rs.length}) — avg royals defeated ${avgDef.toFixed(2)}/12`)
}
summary['byCount'] = byCount

console.log('\nWin rate by lineup × player count:')
const byLineup: Record<string, unknown> = {}
for (const lineupId of lineups) {
  const row: string[] = []
  for (const count of counts) {
    const rs = games.filter(r => r.playerCount === count && r.lineup === lineupId)
    if (!rs.length) { row.push('   —  '); continue }
    const w = rs.filter(r => r.result === 'won').length
    row.push(pct(w, rs.length).padStart(6))
    byLineup[`${lineupId}-${count}p`] = {
      games: rs.length, won: w,
      avgDefeated: +(rs.reduce((t, r) => t + r.defeated, 0) / rs.length).toFixed(2),
    }
  }
  console.log(`  ${lineupId.padEnd(8)} ${row.join('  ')}`)
}
summary['byLineup'] = byLineup

console.log('\nAvg royals defeated by lineup (all counts pooled):')
for (const lineupId of lineups) {
  const rs = games.filter(r => r.lineup === lineupId)
  if (!rs.length) continue
  const avg = rs.reduce((t, r) => t + r.defeated, 0) / rs.length
  const ex = rs.reduce((t, r) => t + r.exactKills, 0) / rs.length
  console.log(`  ${lineupId.padEnd(8)} ${avg.toFixed(2)}/12 — exact kills/game ${ex.toFixed(2)}`)
}

console.log('\nLosses by royal rank (which wall kills runs):')
const byRank: Record<string, number> = {}
for (const r of games.filter(rr => rr.result === 'lost')) byRank[r.lostAtRank || '?'] = (byRank[r.lostAtRank || '?'] ?? 0) + 1
for (const [rank, n] of Object.entries(byRank).sort((a, b) => b[1] - a[1])) console.log(`  ${rank}: ${n}`)
summary['lossByRank'] = byRank

console.log('\nProgress distribution (royals defeated when the run ended, losses only):')
const buckets = [0, 0, 0, 0]   // 0-3, 4-7 (jacks->queens), 8-11 (kings), 12=win
for (const r of games.filter(rr => rr.result === 'lost')) {
  if (r.defeated <= 3) buckets[0]!++
  else if (r.defeated <= 7) buckets[1]!++
  else buckets[2]!++
}
console.log(`  died in Jacks (0-3 down): ${buckets[0]}  |  died in Queens (4-7 down): ${buckets[1]}  |  died in Kings (8-11 down): ${buckets[2]}`)
summary['progressBuckets'] = { jacks: buckets[0], queens: buckets[1], kings: buckets[2] }

const errs = games.filter(r => r.result.startsWith('error') || r.result === 'stalled')
if (errs.length) console.log(`\n⚠ ${errs.length} games errored/stalled`)

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(`\n${games.length} games in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log(`Data: ${OUT_DIR}`)

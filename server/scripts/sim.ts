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
  applyBreakCamp, beginReplacement,
  applyContinueChapter, checkEncounterEnd, applyFragmentStart,
} from '../campaign/campaign'
import {
  applyEncounterPlay, applyEncounterDiscard, applyEncounterYield,
  applyEncounterChooseNext, applySetupReorder, applyCastSpell,
  applyActivateRelic, applyArmWager, applyKeepDrawn, maxHandSize,
} from '../campaign/encounter'
import { getItem, STARTING_RELICS, STARTING_SPELLS } from '../campaign/content'
import { EXPERIMENTS } from '../campaign/experiments'
import { cardValue } from '../deck'
import { createRng, type Rng } from '../rng'
import type { Card, Suit } from '../types'
import type { CampaignState, ClassId, CtCategory, EncounterState, KingdomState } from '../campaign/types'

// ── Personas ─────────────────────────────────────────────────────────────────
// Weight profiles shared with sim-base.ts — same values, same decision logic;
// the game mode is the experiment variable.

import { PERSONAS, MIXED_ORDER, type Persona } from './sim-personas'
import { chooseDiscardPressure, type PressureState } from './discard-model'
import { traceAction } from '../campaign/trace'

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

// Can the remaining hand land exactly `target` damage on a later turn? Cheap
// model: base totals, Clubs double unless the enemy is club-immune, and the
// Executioner finisher turns a leave-at-2 into an exact 0 (canon: leave-at-1
// overkills). Used by setupWeight to price chip-and-wait lines.
function exactReachable(remaining: Card[], target: number, immuneSuit: Suit | null, isExec: boolean, execSpent: boolean): boolean {
  if (target <= 0) return false
  for (const ix of legalPlaySets(remaining)) {
    const cards = ix.map(i => remaining[i]!)
    if (cards[0]!.rank === 'Jo') continue
    const base = cards.reduce((t, card) => t + val(card), 0)
    const dmg = cards.some(card => card.suit === 'C') && immuneSuit !== 'C' ? base * 2 : base
    if (dmg === target) return true
    if (isExec && !execSpent && target - dmg === 2) return true
  }
  return false
}

// Lever-economy hand read (STRATEGY.md "The Lever Economy"): the four suits are
// four levers (♦ draw, ♥ recover, ♠ shield, ♣ double); each enemy blocks its
// own. Quality 0..1 rewards a live draw lever, real burst, low junk, and a
// piece that can land an exact kill on the current enemy.
interface HandStats {
  diamonds: number; hearts: number; clubs: number; spades: number
  junk: number; burst: number; quality: number; hasExactPiece: boolean
}
function handStats(hand: Card[], enemyHp: number | null, immuneSuit: Suit | null, isExec: boolean, execSpent: boolean): HandStats {
  let diamonds = 0, hearts = 0, clubs = 0, spades = 0, junk = 0, burst = 0, n = 0
  for (const card of hand) {
    if (card.rank === 'Jo') continue
    n++
    const v = val(card)
    if (card.suit === 'D') diamonds++
    else if (card.suit === 'H') hearts++
    else if (card.suit === 'C') { clubs++; if (v > burst) burst = v }
    else spades++
    if (card.rank !== 'A' && v <= 3) junk++
  }
  const hasExactPiece = enemyHp != null && exactReachable(hand, enemyHp, immuneSuit, isExec, execSpent)
  let q = 0
  if (diamonds > 0) q += 0.3                       // a live draw lever
  if (burst >= 7) q += 0.25; else if (clubs > 0) q += 0.1
  q += Math.max(0, 0.25 - (n ? junk / n : 0) * 0.4) // low junk ratio
  if (hasExactPiece) q += 0.25
  return { diamonds, hearts, clubs, spades, junk, burst, quality: Math.min(1, q), hasExactPiece }
}

function evalPlay(c: CampaignState, s: EncounterState, pi: number, idxs: number[], p: Persona): PlayOption {
  const hand = s.hands[pi]!
  const cards = idxs.map(i => hand[i]!)
  const enemy = s.currentEnemy!
  const hero = c.heroes[pi]!
  const base = cards.reduce((t, card) => t + val(card), 0)

  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const suits = new Set(cards.map(card => card.suit).filter(su => su !== immuneSuit))
  const stats = handStats(hand, enemy.hp, immuneSuit, hero.classId === 'executioner', !!s.flags['enemy.execFinish'])

  let mult = 1
  if (suits.has('C')) mult *= 2
  if (s.flags[`keenEdge:${pi}`]) mult *= 2
  if (s.flags[`crownbreaker:${pi}`]) mult *= 3
  let damage = base * mult
  // Oracle Displacement (live kit): playing the Marked card adds +2 (+3 at a
  // gate) — real damage, so it shifts the exact-kill arithmetic too
  if (hero.classId === 'oracle' && s.flags['oracleMarked'] && !s.flags['oracleMarkUsed'] &&
      cards.some(card => `${card.suit}${card.rank}` === s.flags['oracleMarked']))
    damage += s.tier === 'boss' ? 3 : 2

  let hpAfter = enemy.hp - damage
  const execReady = hpAfter > 0 && hpAfter <= 2 &&
    hero.classId === 'executioner' && !s.flags['enemy.execFinish']   // owner-only canon
  if (execReady) hpAfter -= 2
  const kills = hpAfter <= 0
  const exact = hpAfter === 0

  let shieldGain = 0
  if (suits.has('S')) {
    shieldGain = base
    // Sentinel Spade Commit (live kit): all-Spade play → +3, mixed → nothing
    if (hero.classId === 'sentinel' && cards.every(card => card.suit === 'S')) shieldGain += 3
  }
  // Lever canon: shield beyond the current net counterattack does nothing
  // (don't shield a net-0 enemy). Only the portion that lowers the live counter
  // is effective; the overage is waste, charged below as blockedSpadeWaste.
  const curNet = Math.max(0, enemy.attack - enemy.shield)
  const effectiveShield = Math.min(shieldGain, curNet)
  const wastedShield = shieldGain - effectiveShield
  // own-class triggers (owner-only canon): QM first Diamond +1, Surgeon first Heart +1
  let draws = suits.has('D') ? Math.min(base, s.tavern.length) : 0
  if (draws > 0 && hero.classId === 'quartermaster' && !s.flags['enemy.qmDiamond']) draws += 1
  let recov = suits.has('H') ? Math.min(base, s.discard.length) : 0
  if (recov > 0 && hero.classId === 'surgeon' && !s.flags['enemy.surgeonHeart']) recov += 1

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

  // Road recruit canon (2026-06-11): an exact kill recruits the royal into the
  // deck; a road overkill banishes it forever. Gates keep discard behavior, so
  // the banish penalty applies on the road only. setupWeight prices the
  // chip-and-wait line: leave the enemy at an HP the rest of the hand can hit
  // exactly next turn (the persona's risk knobs still charge the counterattack
  // taken while waiting).
  const road = s.tier !== 'boss'
  const banishLoss = road && kills && !exact ? p.banishAversion * val(enemy.card) * 0.4 : 0
  let setupBonus = 0
  if (!kills && !dies && hpAfter > 0 && p.setupWeight > 0) {
    const remainingHand = hand.filter((_, i) => !idxs.includes(i))
    if (exactReachable(remainingHand, hpAfter, immuneSuit, hero.classId === 'executioner', !!s.flags['enemy.execFinish']))
      // Road: an exact kill dodges a permanent banish — full weight. Gate: an
      // exact recruits the royal to the Tavern as in-fight fuel, but a gate
      // overkill only goes to discard (recoverable), so it's worth less (0.4×).
      // The counterattack taken while chipping is still charged by riskAversion,
      // so a gate setup only happens when it's actually safe in the race.
      setupBonus = p.setupWeight * (2 + val(enemy.card) * 0.15) * (road ? 1 : 0.4)
  }

  // Siege mode (rules: gates are win-or-wipe, no retreat, and a gate demands
  // roughly a deck cycle per rank): race the royals — damage and draws count
  // for more, hoarding for less. Draws are the proven siege lever (CT v2);
  // recovery only feeds future draws, so it gets a smaller bump.
  const siege = !road
  // Immune-suit waste (rules: the enemy blocks its own suit's power): a
  // blocked card still deals damage but burns its power for nothing — a
  // better player holds it for the next royal unless this play kills.
  let immuneWaste = 0
  if (immuneSuit && !kills) {
    const prefs = suitPref(p)
    for (const card of cards)
      if (card.suit === immuneSuit) immuneWaste += prefs[card.suit] * val(card) * 0.12
  }
  // Solvency margin (rules: you lose the moment a counterattack can't be
  // paid): charge plays that leave the hand thin against the incoming hit —
  // a soft slope in front of the binary death cliff.
  let solvencyRisk = 0
  if (!kills && !dies && counterCost > 0) {
    const remainVal = handVal(hand) - base
    if (remainVal < counterCost * 1.5)
      solvencyRisk = p.riskAversion * (counterCost * 1.5 - remainVal) * 1.2
  }

  // ── Lever-economy terms (STRATEGY.md) ──────────────────────────────────────
  // The diamond invariant: ♦ is the only source of cards into HAND. Spending
  // the last hand-♦ into a dead draw (♦-immune enemy or empty Tavern) throws
  // away draw insurance; spending it live may still fail to replace itself.
  const playedDiamonds = cards.filter(card => card.suit === 'D').length
  const playsLastDiamond = playedDiamonds > 0 && playedDiamonds === stats.diamonds
  let lastDiamondPenalty = 0
  if (playsLastDiamond && !kills && !dies)
    lastDiamondPenalty = (immuneSuit === 'D' || s.tavern.length === 0) ? 14 : 4

  // Don't shield a net-0 enemy: the wasted shield (computed above) is dead value.
  const blockedSpadeWaste = wastedShield * 0.6

  // Churn: when the hand is junk-clogged and no kill is on, eat a small,
  // comfortably affordable counter to dump junk and cycle toward a strong hand —
  // but only while the Tavern is deep enough to redraw (over-churn decks you out).
  let cyclingValue = 0
  if (!kills && !dies && counterCost >= 1 && counterCost <= 5 &&
      stats.quality < 0.55 && s.tavern.length > alive * 3 &&
      (handVal(hand) - base) >= counterCost * 2)
    cyclingValue = 2 + stats.junk * 0.5

  // Safe attack-churn: once the enemy is at net-0, dumping low cards as attacks
  // is free — spend them as the most valuable live lever (♦ > ♥ > ♣ > ♠).
  let safeChurn = 0
  if (curNet === 0 && !kills)
    safeChurn = suits.has('D') ? 2 : suits.has('H') ? 1.4 : suits.has('C') ? 0.6 : 0.1

  // Lever-King prep: at a gate with royals still incoming, bank your burst (♣)
  // and recovery (♥) for the next lever-King — don't spend your last one on a
  // non-kill. (Partial: reserves generically, not by the deduced incoming suit.)
  let leverPrepReserve = 0
  if (siege && s.enemyDeck.length > 0 && !kills) {
    const playedClubs = cards.filter(card => card.suit === 'C').length
    const playedHearts = cards.filter(card => card.suit === 'H').length
    if (playedClubs > 0 && playedClubs === stats.clubs && stats.burst >= 7) leverPrepReserve += 3
    if (playedHearts > 0 && playedHearts === stats.hearts) leverPrepReserve += 2
  }

  let score =
    p.aggression * (siege ? 1.35 : 1) * Math.min(damage, enemy.hp + 4) +
    (kills ? p.killBonus + (hero.classId === 'commander' ? 3 : 0) : 0) +
    (exact ? p.exactBonus + (enemy.card.rank === 'K' ? 3 : enemy.card.rank === 'Q' ? 2 : 1) : 0) +
    p.shieldWeight * effectiveShield * (kills ? 0.2 : 1 + s.enemyDeck.length * 0.08 + Math.max(0, enemy.attack - 10) * 0.04) +
    (fullyShielded ? p.shieldWeight * 3 : 0) +
    p.drawWeight * draws * (0.6 + f * 1.6 + (siege ? 0.5 : 0)) +
    p.recoverWeight * recov * (1 + tavernLow + (siege ? 0.2 : 0)) +
    setupBonus +
    cyclingValue +
    safeChurn -
    lastDiamondPenalty -
    blockedSpadeWaste -
    leverPrepReserve -
    banishLoss -
    immuneWaste -
    solvencyRisk -
    p.conserve * (siege ? 0.5 : 1) * base -
    (kills ? 0 : p.riskAversion * counterCost) -
    (dies ? 200 * p.riskAversion + 120 : 0)
  return { kind: 'play', idxs, score, kills, dies }
}

function evalYield(c: CampaignState, s: EncounterState, pi: number, p: Persona): PlayOption {
  const enemy = s.currentEnemy!
  const net = Math.max(0, enemy.attack - enemy.shield)
  const dies = handVal(s.hands[pi]!) < net
  // fully-shielded yields are pure stalling — attacking costs nothing extra.
  // At a gate, yielding eats a royal counterattack for zero progress in a
  // win-or-wipe fight — extra penalty.
  const score = p.yieldBias + p.conserve * 3 - p.riskAversion * net -
    (net === 0 ? 8 : 0) - (s.tier === 'boss' ? 4 : 0) -
    (dies ? 200 * p.riskAversion + 120 : 0)
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
    // at a gate the refresh also skips a royal's counterattack (10-20) and
    // buys a free deck cycle in a win-or-wipe race — both worth more here
    if (s.tier === 'boss' && enemy) score += Math.max(0, enemy.attack - enemy.shield) * 0.25 + 2
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
  // Diamond invariant: ♦ is draw insurance — refuse to churn away a scarce one,
  // and protect Aces (A♦ especially; any Ace is flexible draw-pairing value).
  const diamondsInHand = hand.filter(card => card.suit === 'D' && card.rank !== 'Jo').length
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
        if (card.suit === 'D' && diamondsInHand <= 1) keepLoss += 10  // last draw lever
        if (card.rank === 'A') keepLoss += 4                          // draw-pairing insurance
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
  exactKills: number
  banished: number   // road overkills — royals lost to the banish rule
  deckSize: number       // tavern + hands + discard at encounter start
  royalsInDeck: number   // recruited J/Q/K in the player pool at encounter start
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
  royalsBanished: number
  jesters: number
  yields: number
  itemsGained: number
  gatesCleared: number     // province rank gates won (0-3)
  deckAtThrone: number     // deck size entering the Throne (0 = never reached)
  royalsAtThrone: number   // recruited royals in the pool entering the Throne
  path: string             // visited node kinds in layer order, '>'-joined
  itemsList: string        // every item id held at any point, '|'-joined
  grants: string           // forced-inclusion items granted at start (M1 mode)
  lossNodeKind: string
  lossModifier: string
  reachedBoss1: number   // 0/1 — reached the chapter 1 castle
  beatCh1: number        // 0/1 — completed chapter 1
  reachedBoss2: number   // 0/1 — reached the chapter 2 castle
  deathsByPersona: string
  classes: string        // starting classes, in seat order
  deathsByClass: string  // classId:count|... (classId at time of death)
  fragsC1: number        // token fragments banked entering Continent 2 (-1 = never reached)
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

  // landmark_reward: items by category pref; tower/brace = hero pick or intel
  function scoreLandmarkOption(c: CampaignState, pc: NonNullable<CampaignState['pendingChoice']>, p: Persona): string {
    let optId = pc.options[0]!.id
    let bestScore = -Infinity
    for (const o of pc.options) {
      let score: number
      if (o.id.startsWith('ev:')) {
        // road events (test-grade): greedy personas take the first
        // (active) option, cautious ones lean toward refusing
        score = pc.options.indexOf(o) === 0 ? p.routeGreed * 0.8 : p.riskAversion * 0.6
      } else if (o.id.startsWith('hero-')) {
        const hi = parseInt(o.id.slice(5))
        const hands = c.encounter ? c.encounter.hands : c.deck?.hands ?? []
        score = (handVal(hands[hi] ?? []) / 10) + 0.5
      } else if (o.id === 'intel') {
        score = c.chapter === 2 ? 0.5 + p.riskAversion * 0.6 : -1
      } else if (o.id.includes(':')) {
        // special landmark actions (not items): Shrine cleanse, Caravan dark-deal,
        // Sanctum rite, Tithe, etc. Cleansing a curse is ~always worth it; the
        // pay-for-a-rare gambles scale with the persona's rare appetite.
        if (o.id.startsWith('shrine:cleanse')) score = 5
        else if (o.id === 'caravan:darkdeal' || o.id === 'sanctum:rite') score = p.rarePref * 1.2 - 0.6
        else score = 0
      } else {
        const item = getItem(o.id)
        score = p.catPrefs[item.category] + (item.tier === 'rare' ? p.rarePref : 0)
      }
      score += decide.next() * 0.1
      if (score > bestScore) { bestScore = score; optId = o.id }
    }
    return optId
  }

  const rec: RunRecord = {
    runId, seed, playerCount: personas.length, lineup: lineupId,
    personas: personas.map(p => p.id).join('+'),
    result: 'stalled', chapterReached: 1, actions: 0,
    encountersFought: 0, encountersWon: 0, retreats: 0, heroDeaths: 0,
    exactKills: 0, royalsBanished: 0, jesters: 0, yields: 0, itemsGained: 0,
    gatesCleared: 0, deckAtThrone: 0, royalsAtThrone: 0, path: '', itemsList: '',
    grants: GRANTS.join('|'),
    lossNodeKind: '', lossModifier: '',
    reachedBoss1: 0, beatCh1: 0, reachedBoss2: 0, deathsByPersona: '',
    classes: '', deathsByClass: '', fragsC1: -1,
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

  // forced-inclusion grants (THE-BAR M1): relic to seat 0 (replaces the solo
  // provision relic — the delta reads "vs an average standard relic"),
  // spells/relics into the team pool
  for (const gid of GRANTS) {
    const it = getItem(gid)
    if (it.kind === 'relic') { if (!c.heroes[0]!.relicIds.includes(gid)) c.heroes[0]!.relicIds.push(gid) }
    else if (it.kind === 'spell') c.spells.push(gid)
  }

  let aliveBefore = c.heroes.map(h => h.alive)
  let cur: EncRecord | null = null
  const retreatsAtNode = new Map<string, number>()
  let prevItems = 0

  const countItems = () =>
    c.spells.length +
    c.heroes.reduce((t, h) => t + h.relicIds.length, 0)
  prevItems = countItems()

  // every item id held at any point (provisions + grants + pickups; relic
  // swaps keep the old id — "held at some point" is the analysis unit)
  const ownedSeen = new Set<string>()
  const scanOwned = () => {
    for (const id of c.spells) ownedSeen.add(id)
    for (const h of c.heroes) for (const id of h.relicIds) ownedSeen.add(id)
  }
  scanOwned()

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
    scanOwned()
    // encounter end bookkeeping. Two paths: we call checkEncounterEnd ourselves
    // after most actions, but applyDeathVote (retreat) calls it internally —
    // detect that by the encounter object disappearing under us.
    const s = c.encounter
    if (s && s.outcome !== 'active') {
      finalizeCur()
      checkEncounterEnd(c, kingdom)
    } else if (cur && (!s || s !== cur.ref)) {
      finalizeCur()
    }
  }

  function finalizeCur() {
    if (!cur) return
    const s = cur.ref
    cur.outcome = s.outcome === 'active' ? 'abandoned' : s.outcome
    cur.defeated = s.defeatedCount
    const exacts = (s.flags['exactKills'] as number) ?? 0
    cur.exactKills = exacts
    // road canon: every non-exact road defeat banished its royal
    cur.banished = s.tier !== 'boss' ? Math.max(0, s.defeatedCount - exacts) : 0
    rec.exactKills += exacts
    rec.royalsBanished += cur.banished
    if (cur.tier === 'boss' && s.outcome === 'won') rec.gatesCleared++
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
    // --trace: dump the action-by-action replay for the sandbox (#/sandbox).
    // --trace-only restricts output to specific seeds (to curate a few runs).
    if (TRACE && (TRACE_ONLY.length === 0 || TRACE_ONLY.includes(seed)))
      traceAction(c, 'bot', `bot-${runId}-${lineupId}-${seed}`, { type: label })
    afterAction()
    return true
  }

  let budget = 8000
  while (budget-- > 0) {
    if (c.phase === 'campaign_won') { rec.result = 'won'; break }
    if (c.phase === 'campaign_lost') { rec.result = 'lost'; break }
    rec.chapterReached = c.chapter
    // capture fragments banked through Continent 1 (what you'd bring to the
    // post-Council shop) the moment we reach Continent 2.
    if (c.chapter >= 4 && rec.fragsC1 < 0) rec.fragsC1 = c.tokenFragments ?? 0

    switch (c.phase) {
      case 'road': {
        // Post-Council shop model (2026-06-16): fragments ACCUMULATE through a
        // continent and are spent at the graduation store on the way out — so the
        // bot no longer applies them on the road. We just measure how many it banks.
        void applyFragmentStart   // (kept imported; road-apply intentionally disabled)
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
          } else if (['skirmish', 'veteran', 'elite', 'lair', 'boss', 'recruit'].includes(n.kind)) {
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
        // team rewards are a vote: every persona votes its own preference
        // (disagreements + tie wheels are part of what we're measuring)
        if (pc.kind === 'landmark_reward' && pc.forPlayerId === null && c.heroes.length > 1) {
          let okAll = true
          for (let hi = 0; hi < c.heroes.length; hi++) {
            if (!c.pendingChoice) break
            const voter = c.heroes[hi]!.playerId
            const choiceId = scoreLandmarkOption(c, pc, personaOf(hi))
            if (!act(() => applyChoice(c, voter, choiceId, HOST), `vote:${pc.kind}`)) { okAll = false; break }
          }
          if (!okAll) return rec
          break
        }
        const deciderId = pc.forPlayerId ?? HOST
        const p = personaById(deciderId) ?? personaOf(0)
        let optId = pc.options[0]!.id
        if (pc.kind === 'replacement') {
          optId = p.classPref.find(cid => pc.options.some(o => o.id === cid)) ?? optId
        } else if (pc.kind === 'draft_pick') {
          // ascending-deck drafts: prefer recruiting a card (permanence) over
          // pure tempo, then defer to the first such option.
          optId = pc.options.find(o => !o.id.startsWith('draft:tempo'))?.id ?? pc.options[0]!.id
        } else if (pc.kind === 'forge_token') {
          // ascending-deck forge: spend budget on offense — value/edge tokens
          // first, then any token; only leave if nothing else is offered.
          const rank = (id: string) =>
            /forge:(temper|edge)\b/.test(id) ? 4
            : /forge:(hone|mark|graft)\b/.test(id) ? 3
            : id === 'forge:done' ? 0 : 2
          optId = [...pc.options].sort((a, b) => rank(b.id) - rank(a.id))[0]!.id
        } else if (pc.kind === 'forge_card') {
          // stamp on a Club workhorse if offered (doubling pays best), else the
          // lowest-value owned card.
          const club = pc.options.find(o => o.id[0] === 'C')
          optId = club?.id
            ?? [...pc.options].sort((a, b) =>
              cardValue(a.id.slice(1) as Card['rank']) - cardValue(b.id.slice(1) as Card['rank']))[0]!.id
        } else {
          optId = scoreLandmarkOption(c, pc, p)
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
          const deckSize = s.tavern.length + s.discard.length + s.hands.reduce((t, h) => t + h.length, 0)
          const royalsInDeck = [...s.tavern, ...s.discard, ...s.hands.flat()]
            .filter(card => card.rank === 'J' || card.rank === 'Q' || card.rank === 'K').length
          // entering the Throne = boss fight with both prior gates cleared
          if (s.tier === 'boss' && rec.gatesCleared === 2) {
            rec.deckAtThrone = deckSize
            rec.royalsAtThrone = royalsInDeck
          }
          cur = {
            ref: s, chapter: c.chapter, nodeKind: node?.kind ?? s.tier, tier: s.tier,
            modifier: s.modifierId ?? '', bossModifier: s.bossModifierId ?? '',
            attempt: (retreatsAtNode.get(s.nodeId) ?? 0) + 1,
            turns: 0, deaths: 0, outcome: 'active', defeated: 0, totalEnemies: s.totalEnemies,
            exactKills: 0, banished: 0, deckSize, royalsInDeck,
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

        // ascending-deck: keep best cards from overdraw pool
        if (s.turnPhase === 'draw_select') {
          const selHero = s.drawSelectHeroIdx!
          const selPid = c.heroes[selHero]!.playerId
          const pool = s.drawPool ?? []
          const slots = maxHandSize(c, selHero) - (s.hands[selHero]?.length ?? 0)
          // keep highest-value cards (greedy strategy)
          const ranked = pool.map((card, i) => ({ i, v: val(card) }))
            .sort((a, b) => b.v - a.v)
          const keepIdxs = ranked.slice(0, Math.max(0, slots)).map(x => x.i)
          if (!act(() => applyKeepDrawn(c, selPid, keepIdxs), 'draw_select')) return rec
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
          const idxs = DISCARD_MODEL === 'pressure'
            ? chooseDiscardPressure(s.hands[pi]!, s.discardNeeded, {
                enemyAttack: s.currentEnemy?.attack ?? 0,
                enemyShield: s.currentEnemy?.shield ?? 0,
                enemyHp: s.currentEnemy?.hp ?? 0,
                enemySuit: s.currentEnemy ? s.currentEnemy.card.suit : null,
                immunityNullified: s.currentEnemy?.immunityNullified ?? true,
                tavernCount: s.tavern.length,
                discardCount: s.discard.length,
                playerCount: c.heroes.filter(h => h.alive).length || 1,
                maxHand: maxHandSize(c),
              } satisfies PressureState)
            : chooseDiscard(s.hands[pi]!, s.discardNeeded, p)
          // The discard model is base-value only; HOLD-token soak (holdDelta) can
          // make it under-select on rare hands. If the engine rejects, fall back
          // to discarding the whole hand (whole-hand soak ≥ needed, or it's death).
          const r = applyEncounterDiscard(c, pid, idxs)
          if (r.error) {
            const all = s.hands[pi]!.map((_, i) => i)
            if (!act(() => applyEncounterDiscard(c, pid, all), 'discard')) return rec
          } else { if (TRACE && (TRACE_ONLY.length === 0 || TRACE_ONLY.includes(seed))) traceAction(c, 'bot', `bot-${runId}-${lineupId}-${seed}`, { type: 'discard' }); afterAction() }
          break
        }

        // ── play phase ──
        cur.turns++
        const hand = s.hands[pi]!
        const enemy = s.currentEnemy

        // utility relics when the tavern runs dry
        const relic = c.heroes[pi]!.relicIds.find(r =>
          (r === 'r-bone-thread' || r === 'r-sainted-scalpel') && !s.flags[`relicUsed:${r}:${pi}`])
        if (relic && s.tavern.length === 0 && s.discard.length >= 2) {
          if (!act(() => applyActivateRelic(c, pid, undefined, relic), 'relic')) return rec
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
            // Burst discipline: a damage nuke is a scarce climax tool. Spend it
            // only on a target worth it (a gate royal, or a Q/K on the road),
            // and only when the multiplier is what lands the kill — never to
            // overkill something a raw play already finishes. This stops the bot
            // wasting Keen Edge on a road Jack and arriving at the gate empty.
            const worthNuke = s.tier === 'boss' || enemy.card.rank === 'K' || enemy.card.rank === 'Q'
            if (worthNuke && c.spells.includes('s-keen-edge') && rawBest < enemy.hp && rawBest * 2 >= enemy.hp) {
              if (!act(() => applyCastSpell(c, pid, 's-keen-edge'), 'keen-edge')) return rec
              break
            }
            // Crownbreaker (×3) only when a double isn't enough but a triple is.
            if (worthNuke && c.spells.includes('s-crownbreaker') && rawBest * 2 < enemy.hp && rawBest * 3 >= enemy.hp) {
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
          // gambler wager: arm when we predict a kill this turn (per-encounter flag)
          if (canKill && c.heroes[pi]!.classId === 'gambler' && !s.flags['gamblerWagerUsed'] &&
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
        // (exile-at-camp retired — the deck only grows; nothing to thin here)
        if (!act(() => applyBreakCamp(c, HOST, HOST), 'break-camp')) return rec
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
  if (c.map) rec.path = c.map.nodes.filter(n => n.visited).sort((a, b) => a.layer - b.layer).map(n => n.kind).join('>')
  rec.itemsList = [...ownedSeen].join('|')
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
    // forced-inclusion item test (THE-BAR M1): grant these item ids at start
    grants: get('--grant', '').split(',').map(s => s.trim()).filter(Boolean),
    bossReshuffle: args.includes('--boss-reshuffle'),
    castleHearts: args.includes('--castle-hearts'),
    shortCastle: args.includes('--short-castle'),
    province: args.includes('--province'),
    discardModel: get('--discard', 'pressure') as 'legacy' | 'pressure',
    trace: args.includes('--trace'),   // write data/traces/bot-*.jsonl replays
    // when set with --trace, only these exact seeds are traced (curate N runs)
    traceOnly: get('--trace-only', '').split(',').map(s => s.trim()).filter(Boolean),
  }
}

const { seeds, classCombos, persona: personaFlag, grants: GRANTS, bossReshuffle, castleHearts, shortCastle, province, discardModel: DISCARD_MODEL, trace: TRACE, traceOnly: TRACE_ONLY } = parseArgs()
let { counts, lineups } = parseArgs()
for (const gid of GRANTS) getItem(gid)   // fail fast on item-id typos
if (GRANTS.length) console.log(`grants (forced inclusion): ${GRANTS.join(', ')}`)
if (classCombos.length) {
  lineups = classCombos.map(cc => cc.join('+'))
  counts = [...new Set(classCombos.map(cc => cc.length))]
}
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
      // seed the ascending-deck item pools (the real store does this; without it
      // no relics/spells are ever offered and item patterns vanish)
      unlockedRelics: [...STARTING_RELICS], unlockedSpells: [...STARTING_SPELLS],
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
  const ex = slice.reduce((t, r) => t + r.exactKills, 0)
  const ban = slice.reduce((t, r) => t + r.royalsBanished, 0)
  const gates = slice.reduce((t, r) => t + r.gatesCleared, 0)
  console.log(`${count}p ${lineupId.padEnd(20)} — ${w}/${slice.length} won (${pct(w, slice.length)}) · gates ${(gates / slice.length).toFixed(2)} · exacts/run ${(ex / slice.length).toFixed(1)} · banished/run ${(ban / slice.length).toFixed(1)}`)
}

try {
  if (classCombos.length) {
    // class-isolation mode: --persona accepts a comma list — each persona
    // plays every class combo (lineup id = persona:classes)
    const personaIds = personaFlag.split(',').map(x => x.trim()).filter(Boolean)
    for (const pid of personaIds) {
      const p = PERSONAS[pid]
      if (!p) { console.error(`Unknown persona: ${pid}`); process.exit(1) }
      for (const combo of classCombos) {
        runBatch(`${pid}:${combo.join('+')}`, combo.length, combo.map(() => p), combo)
      }
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

// include persona-prefixed lineup ids (class-isolation mode) in the summaries
lineups = [...new Set(runs.map(r => r.lineup))]

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
  console.log(`  ${lineupId.padEnd(24)} ${row.join('  ')}`)
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
  console.log(`  ${lineupId.padEnd(24)} ${pct(f1, rs.length).padStart(6)} → ${pct(f2, rs.length).padStart(6)} → ${pct(f3, rs.length).padStart(6)} → ${pct(f4, rs.length).padStart(6)}`)
}

console.log('\nRecruit economy by lineup (road kills: exact = recruit, overkill = banish):')
const byEconomy: Record<string, unknown> = {}
for (const lineupId of lineups) {
  const rs = runs.filter(r => r.lineup === lineupId)
  if (!rs.length) continue
  const roadEncs = encs.filter(e => e.lineup === lineupId && e.tier !== 'boss')
  const ex = roadEncs.reduce((t, e) => t + e.exactKills, 0)
  const ban = roadEncs.reduce((t, e) => t + e.banished, 0)
  const rate = ex + ban > 0 ? ex / (ex + ban) : 0
  byEconomy[lineupId] = { roadExacts: ex, roadBanished: ban, exactRate: rate }
  console.log(`  ${lineupId.padEnd(24)} road exacts ${String(ex).padStart(4)} · banished ${String(ban).padStart(4)} · exact rate ${(rate * 100).toFixed(1)}%`)
}
summary['recruitEconomy'] = byEconomy

// ── Fork analysis (province): the map's exclusive same-layer choices are
// natural experiments — every run takes exactly one node per layer.
// Pooled across personas (route choice is persona-biased; per-persona splits
// live in runs.csv), so read relative gaps, not absolutes.
if (province) {
  console.log('\nFork analysis — outcome by which node the run took at each branching stop:')
  const withPath = runs.filter(r => r.path)
  const maxLen = Math.max(0, ...withPath.map(r => r.path.split('>').length))
  const forks: Record<string, unknown> = {}
  for (let li = 0; li < maxLen; li++) {
    const kindsAt = new Set(withPath.map(r => r.path.split('>')[li]).filter(Boolean))
    if (kindsAt.size < 2) continue
    console.log(`  stop ${li}:`)
    for (const kind of [...kindsAt].sort()) {
      const rs = withPath.filter(r => r.path.split('>')[li] === kind)
      const w = rs.filter(r => r.result === 'won').length
      const gates = rs.reduce((t, r) => t + r.gatesCleared, 0) / rs.length
      const thr = rs.filter(r => r.deckAtThrone > 0)
      const dk = thr.length ? thr.reduce((t, r) => t + r.deckAtThrone, 0) / thr.length : 0
      const ry = thr.length ? thr.reduce((t, r) => t + r.royalsAtThrone, 0) / thr.length : 0
      forks[`stop${li}:${kind}`] = { n: rs.length, wins: w, avgGates: gates, reachedThrone: thr.length, avgDeckAtThrone: dk, avgRoyalsAtThrone: ry }
      console.log(`    ${kind.padEnd(9)} n=${String(rs.length).padStart(4)}  won ${pct(w, rs.length).padStart(6)}  gates ${gates.toFixed(2)}  reach-throne ${pct(thr.length, rs.length).padStart(6)}  deck@throne ${dk.toFixed(0)} (${ry.toFixed(1)} royals)`)
    }
  }
  summary['forks'] = forks
}

// Observational item table — survivors collect more items, so this is biased
// upward for late-game pickups. Read the extremes and confirm with --grant.
console.log('\nItem table (observational; confirm causally with --grant):')
const itemStats: Record<string, { n: number; wins: number; gates: number }> = {}
for (const r of runs) {
  for (const id of r.itemsList.split('|').filter(Boolean)) {
    const m = (itemStats[id] ??= { n: 0, wins: 0, gates: 0 })
    m.n++
    m.gates += r.gatesCleared
    if (r.result === 'won') m.wins++
  }
}
const itemRows = Object.entries(itemStats).filter(([, m]) => m.n >= 15)
  .sort((a, b) => b[1].wins / b[1].n - a[1].wins / a[1].n)
for (const [id, m] of itemRows)
  console.log(`  ${id.padEnd(22)} n=${String(m.n).padStart(4)}  won ${pct(m.wins, m.n).padStart(6)}  avg gates ${(m.gates / m.n).toFixed(2)}`)
summary['itemTable'] = itemStats

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

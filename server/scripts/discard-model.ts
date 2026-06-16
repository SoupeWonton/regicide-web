// Four-pressure discard model — "which card is best to discard?"
//
// A hand is read as a position against four pressures; each pressure is the
// risk that a lever is dead when the game demands it (lever economy,
// STRATEGY.md). Given a state (enemy attack + immunity, tavern depth, discard
// depth) every candidate payment subset is scored by how flimsy the REMAINING
// hand is, and the least-flimsy cover wins.
//
//   Block pressure    — you can't reduce the counterattack (♠ vs net attack)
//   Draw pressure     — you can't refill your hand (♦ vs tavern)
//   Burst pressure    — you can't threaten the kill (♣-doubled best play vs HP)
//   Recovery pressure — you can't refill the tavern (♥ vs discard pile)
//
// Hard canon encoded here:
//   - It is NEVER fine to have no diamonds. Discarding the last ♦ is treated
//     as near-forbidden (only when no cover exists without it).
//   - Draw over hand-space is the same draw value: a ♦'s draw worth is
//     min(value, handSize-1) — a 3♦ is excellent, a 9♦ is not 3× better.
//   - ♥ worth is capped by the discard pile (recover can't grab what isn't
//     there) and scales with tavern dryness — the ♥→♦ pipeline is the only
//     escape from a dry tavern. Paying a counterattack FEEDS the discard, so
//     the chooser values ♥ against the post-payment pile.
//   - Combos are same-rank totaling ≤10 (pair 5s/4s/3s/2s, triple 3s/2s,
//     quad 2s) or Ace+one. Matched low cards are premium, not junk.
//   - The enemy's own suit is dead for this fight (immunity) unless
//     nullified — but keeps future-royal value, so it's discounted, not zero.
//   - ♠ keep-value rises with value and with the hitter's attack; vs the ♠
//     royal shields are unsalvageable and the weight shifts to burst.
//   - Joker home rule: solo = immunity off + full hand redraw (a held Joker
//     mitigates draw/recovery pressure and adds survival turns); 2p+ =
//     immunity off only. A Joker is never discarded if any other cover exists.
//
// Royal-suit conditioning (which pressure the current royal punishes):
//   ♣ royal — full block into ♥ is the line: block + recovery weighted up.
//   ♠ royal — shields dead, ♣ race: burst weighted up, block weight ~0.
//   ♦ royal — no refill mid-fight: block + burst up, enter-fat logic.
//   ♥ royal — less pressure overall, but you cannot run on draw alone:
//             keep some attack, recovery weight 0 (blocked anyway).

import type { Card, Suit } from '../types'
import { cardValue, handSize } from '../deck'

const val = (card: Card) => cardValue(card.rank)

export interface PressureState {
  /** Gross attack of the current enemy (0 if none). */
  enemyAttack: number
  /** Shield already accumulated against it. */
  enemyShield: number
  /** Remaining HP of the current enemy (0 if none). */
  enemyHp: number
  /** Suit of the current enemy, null if none. */
  enemySuit: Suit | null
  /** True once a Jester has cancelled its immunity. */
  immunityNullified: boolean
  tavernCount: number
  discardCount: number
  playerCount: number
  /** Max hand size when it differs from the base-game table (campaign mods). */
  maxHand?: number
}

export interface PressureProfile {
  block: number      // 0 safe .. 1 fully exposed
  draw: number
  burst: number
  recovery: number
  survivalTurns: number
  flimsiness: number // weighted blend of the four, 0..1
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function immuneSuit(st: PressureState): Suit | null {
  return st.immunityNullified ? null : st.enemySuit
}

function netAttack(st: PressureState): number {
  return Math.max(0, st.enemyAttack - st.enemyShield)
}

// Best single-turn damage the hand can put on the current enemy: singles,
// Ace + one, and same-rank sets ≤ 10. Damage always lands; only the ♣ double
// is lost to a ♣-immune enemy.
export function bestBurst(hand: Card[], blockedSuit: Suit | null): number {
  let best = 0
  const consider = (cards: Card[]) => {
    const base = cards.reduce((t, c) => t + val(c), 0)
    const doubled = cards.some(c => c.suit === 'C') && blockedSuit !== 'C'
    best = Math.max(best, doubled ? base * 2 : base)
  }
  const real = hand.filter(c => c.rank !== 'Jo')
  for (const c of real) consider([c])
  const aces = real.filter(c => c.rank === 'A')
  if (aces.length > 0)
    for (const c of real) if (c.rank !== 'A') consider([aces[0]!, c])
  const byRank = new Map<string, Card[]>()
  for (const c of real) {
    if (c.rank === 'A') continue
    if (!byRank.has(c.rank)) byRank.set(c.rank, [])
    byRank.get(c.rank)!.push(c)
  }
  for (const cards of byRank.values()) {
    const v = val(cards[0]!)
    for (let n = 2; n <= cards.length && n * v <= 10; n++) consider(cards.slice(0, n))
  }
  return best
}

// Pessimistic survival floor: how many consecutive net counterattacks the
// hand can pay with NO refill. Greedy minimal-waste payment each turn.
export function survivalTurns(hand: Card[], st: PressureState): number {
  const net = netAttack(st)
  if (net === 0) return 9
  let pool = hand.filter(c => c.rank !== 'Jo').map(val).sort((a, b) => a - b)
  let turns = 0
  while (turns < 9) {
    let owed = net
    const next: number[] = []
    for (const v of pool) {
      if (owed <= 0) { next.push(v); continue }
      owed -= v
    }
    if (owed > 0) break
    pool = next
    turns++
  }
  // solo Joker home rule: full redraw is roughly two more royal hits of armor
  const hasJoker = hand.some(c => c.rank === 'Jo')
  if (hasJoker && st.playerCount === 1)
    turns += Math.max(1, Math.floor(((st.maxHand ?? handSize(1)) * 5.5) / Math.max(net, 5) / 2))
  return Math.min(turns, 9)
}

// Pressure weights conditioned on the current royal's suit (which lever it
// punishes). Order: [block, draw, burst, recovery]. Diamonds are necessary
// always, all the time — draw never drops below 0.30.
function weights(st: PressureState): [number, number, number, number] {
  const blocked = immuneSuit(st)
  switch (blocked) {
    case 'C': return [0.30, 0.30, 0.10, 0.30]  // full block into ♥ vs the ♣ royal
    case 'S': return [0.02, 0.33, 0.50, 0.15]  // shields dead — ♣ race
    case 'D': return [0.28, 0.30, 0.32, 0.10]  // block + pressure for the ♦ royal
    case 'H': return [0.20, 0.32, 0.33, 0.15]  // can't run on draw alone — keep attack
    default:  return [0.25, 0.35, 0.25, 0.15]
  }
}

export function pressureProfile(hand: Card[], st: PressureState): PressureProfile {
  const blocked = immuneSuit(st)
  const net = netAttack(st)
  const maxH = st.maxHand ?? handSize(st.playerCount)
  const drawCapPerCard = maxH - 1            // draw over hand space is the same draw value
  const soloJoker = st.playerCount === 1 && hand.some(c => c.rank === 'Jo')

  let drawNow = 0, drawAlways = 0, blockCap = 0, recovCap = 0, diamonds = 0
  for (const c of hand) {
    if (c.rank === 'Jo') continue
    const v = val(c)
    if (c.suit === 'D') {
      diamonds++
      const worth = Math.min(v, drawCapPerCard)
      drawAlways += worth
      if (blocked !== 'D') drawNow += worth
    } else if (c.suit === 'S') {
      if (blocked !== 'S') blockCap += v
    } else if (c.suit === 'H') {
      if (blocked !== 'H') recovCap += Math.min(v, st.discardCount)
    }
  }

  // ── Draw pressure: target is one full refill reachable through the tavern
  const drawTarget = drawCapPerCard
  const tavernCappedNow = Math.min(drawNow, st.tavernCount)
  const tavernCappedFut = Math.min(drawAlways, st.tavernCount)
  let draw = diamonds === 0
    ? 1
    : 1 - clamp01((0.65 * tavernCappedNow + 0.35 * tavernCappedFut) / drawTarget)
  if (soloJoker) draw *= 0.4                 // redraw-8 is draw insurance

  // ── Block pressure: can the hand neutralize the live hit
  const block = net === 0 ? 0 : 1 - clamp01(blockCap / net)

  // ── Burst pressure: can the hand still threaten this enemy's kill
  const burst = st.enemyHp <= 0 ? 0 : 1 - clamp01(bestBurst(hand, blocked) / st.enemyHp)

  // ── Recovery pressure: the ♥→♦ pipeline, scaled by tavern dryness
  const dryness = st.tavernCount === 0 ? 1
    : st.tavernCount <= st.playerCount * 2 ? 0.75
    : st.tavernCount <= st.playerCount * 4 ? 0.45 : 0.2
  const recovTarget = Math.min(Math.max(4, drawCapPerCard), Math.max(1, st.discardCount))
  let recovery = (1 - clamp01(recovCap / recovTarget)) * dryness
  if (soloJoker) recovery *= 0.5             // the reset also resets a dead position

  const [wB, wD, wA, wR] = weights(st)
  const flimsiness = wB * block + wD * draw + wA * burst + wR * recovery
  return { block, draw, burst, recovery, survivalTurns: survivalTurns(hand, st), flimsiness }
}

// ── The chooser ──────────────────────────────────────────────────────────────

export interface DiscardChoice {
  idxs: number[]
  profile: PressureProfile
  cost: number
}

/**
 * Pick the payment subset (total ≥ needed) whose REMAINING hand is least
 * flimsy. Hard rules: never strand the hand at zero ♦ and never burn a Joker
 * unless no other cover exists; protect matched same-rank sets and Aces.
 */
export function chooseDiscardPressure(hand: Card[], needed: number, st: PressureState): number[] {
  const n = hand.length
  const diamondsInHand = hand.filter(c => c.suit === 'D' && c.rank !== 'Jo').length
  const rankFreq = new Map<string, number>()
  for (const c of hand) if (c.rank !== 'Jo' && c.rank !== 'A')
    rankFreq.set(c.rank, (rankFreq.get(c.rank) ?? 0) + 1)

  let best: DiscardChoice | null = null
  for (let mask = 1; mask < 1 << n; mask++) {
    let total = 0
    let hardLoss = 0
    let discardedDiamonds = 0
    const idxs: number[] = []
    const remaining: Card[] = []
    for (let i = 0; i < n; i++) {
      const c = hand[i]!
      if (mask & (1 << i)) {
        idxs.push(i)
        total += val(c)
        if (c.rank === 'Jo') hardLoss += 500
        if (c.suit === 'D' && c.rank !== 'Jo') discardedDiamonds++
        if (c.rank === 'A') hardLoss += 2.5
        // breaking a playable matched set (n·v ≤ 10) costs the multi-lever turn
        const freq = rankFreq.get(c.rank) ?? 0
        if (freq >= 2 && freq * val(c) <= 10) hardLoss += 2 + val(c) * 0.2
      } else {
        remaining.push(c)
      }
    }
    if (total < needed) continue
    // NEVER zero diamonds — near-forbidden, beaten only by Joker loss
    if (diamondsInHand > 0 && discardedDiamonds === diamondsInHand) hardLoss += 250

    // the payment itself feeds the discard pile the ♥ lever recovers from
    const after: PressureState = { ...st, discardCount: st.discardCount + idxs.length }
    const profile = pressureProfile(remaining, after)
    const survShort = Math.max(0, 2 - profile.survivalTurns)
    const cost =
      profile.flimsiness * 30 +
      survShort * 6 +
      (total - needed) * 1.5 +    // overpay is wasted hand value
      idxs.length * 0.15 +
      hardLoss
    if (!best || cost < best.cost) best = { idxs, profile, cost }
  }
  return best ? best.idxs : hand.map((_, i) => i)
}

/**
 * "What card is the best to discard?" — rank every card by how little the
 * hand misses it: flimsiness of (hand minus that card) plus its hard-rule
 * value. First entry = best discard, last = the card to protect.
 */
export function rankDiscards(hand: Card[], st: PressureState): Array<{ index: number; card: Card; loss: number }> {
  const diamondsInHand = hand.filter(c => c.suit === 'D' && c.rank !== 'Jo').length
  const rankFreq = new Map<string, number>()
  for (const c of hand) if (c.rank !== 'Jo' && c.rank !== 'A')
    rankFreq.set(c.rank, (rankFreq.get(c.rank) ?? 0) + 1)
  const after: PressureState = { ...st, discardCount: st.discardCount + 1 }
  const out = hand.map((card, index) => {
    const remaining = hand.filter((_, i) => i !== index)
    let loss = pressureProfile(remaining, after).flimsiness * 30
    if (card.rank === 'Jo') loss += 500
    if (card.suit === 'D' && card.rank !== 'Jo' && diamondsInHand <= 1) loss += 250
    if (card.rank === 'A') loss += 2.5
    const freq = rankFreq.get(card.rank) ?? 0
    if (freq >= 2 && freq * val(card) <= 10) loss += 2 + val(card) * 0.2
    return { index, card, loss }
  })
  return out.sort((a, b) => a.loss - b.loss)
}

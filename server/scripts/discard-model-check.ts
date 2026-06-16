// Sanity scenarios for the four-pressure discard model.
// Run: npx tsx scripts/discard-model-check.ts
import type { Card, Suit, Rank } from '../types'
import { chooseDiscardPressure, rankDiscards, pressureProfile, type PressureState } from './discard-model'
import { cardLabel } from '../deck'

let uid = 0
const c = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: String(++uid) })

const base: PressureState = {
  enemyAttack: 15, enemyShield: 0, enemyHp: 30, enemySuit: 'C',
  immunityNullified: false, tavernCount: 20, discardCount: 8, playerCount: 1,
}

function show(name: string, hand: Card[], needed: number, st: PressureState) {
  const pr = pressureProfile(hand, st)
  const pick = chooseDiscardPressure(hand, needed, st)
  const rank = rankDiscards(hand, st)
  console.log(`\n── ${name} (pay ${needed}, enemy ${st.enemySuit ?? '-'} atk ${st.enemyAttack} hp ${st.enemyHp}, tavern ${st.tavernCount}, discard ${st.discardCount})`)
  console.log(`   hand: ${hand.map(cardLabel).join(' ')}`)
  console.log(`   pressures  block ${pr.block.toFixed(2)}  draw ${pr.draw.toFixed(2)}  burst ${pr.burst.toFixed(2)}  recov ${pr.recovery.toFixed(2)}  | flimsy ${pr.flimsiness.toFixed(2)}  survives ${pr.survivalTurns}t`)
  console.log(`   discards:  ${pick.map(i => cardLabel(hand[i]!)).join(' ')}`)
  console.log(`   best→worst discard: ${rank.map(r => cardLabel(r.card)).join(' > ')}`)
}

// 1. The diamond invariant: paying 10 must not strand the hand at zero ♦.
show('diamond invariant', [c('D', '3'), c('S', '10'), c('C', '7'), c('H', '4'), c('S', '5'), c('C', '2')], 10,
  { ...base, enemySuit: 'C', enemyAttack: 10, enemyHp: 20 })

// 2. Draw cap: a 9♦ and a 3♦ — the 9♦ pays more for the same capped draw value.
show('draw value cap', [c('D', '9'), c('D', '3'), c('H', '6'), c('S', '4'), c('C', '5')], 9,
  { ...base, enemySuit: 'S', enemyAttack: 15 })

// 3. Joker protection + matched set: quad 2s is premium, never burn the Joker.
show('joker + quad 2s', [c('C', 'Jo'), c('D', '2'), c('H', '2'), c('S', '2'), c('C', '2'), c('S', '9'), c('H', '7')], 8,
  { ...base, enemySuit: 'H', enemyAttack: 15 })

// 4. Dry tavern: hearts become the most protected non-♦ cards.
show('dry tavern', [c('H', '8'), c('C', '8'), c('S', '6'), c('D', '4'), c('C', '3')], 8,
  { ...base, tavernCount: 0, discardCount: 20, enemySuit: 'D', enemyAttack: 20, enemyHp: 40 })

// 5. Spade royal: shields are dead — clubs (burst) must be protected instead.
show('spade king race', [c('S', '10'), c('S', '8'), c('C', '10'), c('D', '5'), c('H', '3'), c('C', '4')], 18,
  { ...base, enemySuit: 'S', enemyAttack: 20, enemyHp: 40, tavernCount: 12 })

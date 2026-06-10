import type { Card, GameState, ServerPlayer } from './types'
import { buildPlayerDeck, buildEnemyDeck, handSize, jesterCount, cardValue, enemyStats, cardLabel, suitSymbol, shuffle, validateCombo } from './deck'

function clone(state: GameState): GameState { return JSON.parse(JSON.stringify(state)) }

function log(state: GameState, msg: string) {
  state.log.unshift(msg)
  if (state.log.length > 40) state.log.pop()
}

function maxHand(state: GameState): number { return handSize(state.players.length) }

function drawCards(state: GameState, player: ServerPlayer, n: number): number {
  // official rules: an empty Tavern is never reshuffled — only ♥ Hearts
  // return discard cards to it. Draws simply fizzle.
  let drawn = 0
  for (let i = 0; i < n; i++) {
    if (state.tavern.length === 0) break
    player.hand.push(state.tavern.pop()!)
    drawn++
  }
  return drawn
}

function revealNextEnemy(state: GameState) {
  if (state.enemyDeck.length === 0) {
    state.phase = 'won'
    log(state, '🎉 All enemies defeated — you win!')
    return
  }
  const card = state.enemyDeck.shift()!
  const rank = card.rank as 'J' | 'Q' | 'K'
  const { hp, attack } = enemyStats(rank)
  state.currentEnemy = { card, hp, maxHp: hp, attack, shield: 0, immunityNullified: false }
  if (state.classIds) state.abilityFlags = {}   // class abilities are once per enemy
  log(state, `⚔️  New enemy: ${cardLabel(card)} — ${hp} HP / ${attack} ATK`)
}

function advanceTurn(state: GameState) {
  state.currentPlayerIndex = state.nextPlayerIndex
  state.nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  state.turnPhase = 'play'
  state.lastPlayed = []
  log(state, `👉 ${state.players[state.currentPlayerIndex]!.name}'s turn.`)
}

export function createGame(players: { id: string; name: string }[], classIds?: (string | null)[]): GameState {
  const count   = players.length
  const hSize   = handSize(count)
  const jCount  = jesterCount(count)
  const deck    = buildPlayerDeck(jCount)
  const enemies = buildEnemyDeck()

  const serverPlayers: ServerPlayer[] = players.map(p => ({ ...p, hand: [], connected: true }))
  for (const p of serverPlayers)
    for (let i = 0; i < hSize; i++)
      p.hand.push(deck.pop()!)

  const state: GameState = {
    phase: 'playing',
    turnPhase: 'play',
    players: serverPlayers,
    currentPlayerIndex: 0,
    nextPlayerIndex: 1 % count,
    enemyDeck: enemies,
    currentEnemy: null,
    defeatedEnemies: [],
    discard: [],
    tavern: deck,
    discardNeeded: 0,
    log: [],
    lastPlayed: [],
  }
  if (classIds) {
    state.classIds = classIds
    state.abilityFlags = {}
  }

  revealNextEnemy(state)
  log(state, `🃏 Game started (${count}p, ${jCount} Jester${jCount !== 1 ? 's' : ''}). ${serverPlayers[0]!.name} goes first.`)
  return state
}

export function applyPlayCards(
  state: GameState,
  playerIndex: number,
  cardIndices: number[]
): { state: GameState; error?: string } {
  const s = clone(state)
  if (s.phase !== 'playing')  return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'play') return { state, error: 'Not in play phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }

  const player = s.players[playerIndex]!
  const sorted = [...new Set(cardIndices)].sort((a, b) => b - a)
  if (sorted.some(i => i < 0 || i >= player.hand.length)) return { state, error: 'Invalid card index.' }

  const cards: Card[] = sorted.map(i => player.hand[i]!).reverse()
  const comboError = validateCombo(cards)
  if (comboError) return { state, error: comboError }

  for (const i of sorted) player.hand.splice(i, 1)
  s.lastPlayed = cards

  // ── Jester ──────────────────────────────────────────────────────────────────
  if (cards[0]!.rank === 'Jo') {
    log(s, `🃏 ${player.name} plays the Jester!`)
    s.discard.push(...cards)
    if (s.currentEnemy) {
      s.currentEnemy.immunityNullified = true
      log(s, `   Enemy immunity removed. No counterattack this turn.`)
    }
    s.turnPhase = 'choose_next'
    return { state: s }
  }

  const enemy = s.currentEnemy!
  const baseAttack = cards.reduce((sum, c) => sum + cardValue(c.rank), 0)
  log(s, `${player.name} plays ${cards.map(cardLabel).join(' + ')} (base: ${baseAttack}).`)

  const immuneSuit = enemy.immunityNullified ? null : enemy.card.suit
  const activeSuits = new Set(cards.map(c => c.suit).filter(suit => suit !== immuneSuit))
  if (cards.some(c => c.suit === immuneSuit))
    log(s, `   ${suitSymbol(enemy.card.suit)} power blocked by enemy immunity.`)

  // class layer (balance-testing): tier-1 core abilities, once per enemy,
  // mirroring the campaign implementations (B2/B3: QM/Surgeon/Exec team-wide)
  const classes = s.classIds ?? []
  const flags = (s.abilityFlags ??= {})
  const onceAbility = (k: string) => (flags[k] ? false : (flags[k] = true))

  // ── ♣ Clubs: double damage ─────────────────────────────────────────────────
  let damage = baseAttack
  if (activeSuits.has('C')) {
    damage = baseAttack * 2
    log(s, `   ♣ Damage doubled: ${baseAttack} → ${damage}.`)
  }

  // ── ♠ Spades: cumulative shield ────────────────────────────────────────────
  if (activeSuits.has('S')) {
    let gain = baseAttack
    if (classes[playerIndex] === 'sentinel' && onceAbility('sentinelSpade')) {
      gain += 2
      log(s, `   🛡 Sentinel: +2 shield.`)
    }
    enemy.shield += gain
    log(s, `   ♠ Shield +${gain} (total: ${enemy.shield}, net ATK: ${Math.max(0, enemy.attack - enemy.shield)}).`)
  }

  // ── ♥ Hearts: recover cards from discard into tavern ──────────────────────
  if (activeSuits.has('H')) {
    let amount = baseAttack
    if (classes.includes('surgeon') && onceAbility('surgeonHeart')) {
      amount += 1
      log(s, `   ⚕️ Surgeon: +1 recovery.`)
    }
    const toRecover = Math.min(amount, s.discard.length)
    const recovered = s.discard.splice(0, toRecover)
    // Place under the tavern (bottom of draw deck)
    s.tavern.unshift(...shuffle(recovered))
    log(s, `   ♥ Recovered ${recovered.length} card${recovered.length !== 1 ? 's' : ''} from discard into tavern.`)
  }

  // ── ♦ Diamonds: all players draw clockwise ─────────────────────────────────
  if (activeSuits.has('D')) {
    const max = maxHand(s)
    let drawTotal = baseAttack
    if (classes.includes('quartermaster') && onceAbility('qmDiamond')) {
      drawTotal += 1
      log(s, `   📦 Quartermaster: +1 draw.`)
    }
    let remaining = drawTotal
    let idx = playerIndex
    let passes = 0
    const drawn: string[] = []
    while (remaining > 0 && passes < s.players.length) {
      const p = s.players[idx]!
      if (p.hand.length < max) {
        drawCards(s, p, 1)
        remaining--
        drawn.push(p.name)
        passes = 0
      } else {
        passes++
      }
      idx = (idx + 1) % s.players.length
    }
    log(s, `   ♦ Drew ${drawTotal - remaining} card${drawTotal - remaining !== 1 ? 's' : ''} (${drawn.join(', ') || 'nobody at max hand'}).`)
  }

  // ── Deal damage ────────────────────────────────────────────────────────────
  enemy.hp -= damage
  if ((enemy.hp === 1 || enemy.hp === 2) && classes.includes('executioner') && onceAbility('execFinish')) {
    enemy.hp -= 2
    log(s, `   🪓 Executioner: +2 finishing damage.`)
  }
  log(s, `   💥 ${damage} damage → ${cardLabel(enemy.card)} has ${Math.max(0, enemy.hp)} HP left.`)
  s.discard.push(...cards)

  // ── Enemy defeated ─────────────────────────────────────────────────────────
  if (enemy.hp <= 0) {
    if (enemy.hp === 0) {
      // Exact kill: enemy goes to bottom of tavern (draw deck)
      s.tavern.unshift(enemy.card)
      log(s, `✨ Exact kill! ${cardLabel(enemy.card)} placed under the tavern.`)
    } else {
      // Overkill: enemy goes to discard pile
      s.discard.push(enemy.card)
      s.defeatedEnemies.push(enemy.card)
      log(s, `✅ ${cardLabel(enemy.card)} defeated!`)
    }
    s.currentEnemy = null
    revealNextEnemy(s)
    if (s.phase === 'won') return { state: s }
    s.lastPlayed = []
    log(s, `   ${player.name} plays again!`)
    return { state: s }
  }

  // ── Enemy counterattack ────────────────────────────────────────────────────
  const netAttack = Math.max(0, enemy.attack - enemy.shield)
  if (netAttack === 0) {
    log(s, `🛡️  Fully shielded! No damage taken.`)
    advanceTurn(s)
    return { state: s }
  }

  // Check if player can cover the damage (at least one card, or total value can reach it)
  const maxCoverable = player.hand.reduce((sum, c) => sum + cardValue(c.rank), 0)
  if (maxCoverable < netAttack) {
    s.phase = 'lost'
    log(s, `💀 ${player.name} can't cover ${netAttack} damage (max hand value: ${maxCoverable}). Game over.`)
    return { state: s }
  }

  s.turnPhase = 'discard'
  s.discardNeeded = netAttack
  log(s, `💔 Enemy attacks for ${netAttack} — ${player.name} must discard cards totalling ≥ ${netAttack}.`)
  return { state: s }
}

export function applyDiscard(
  state: GameState,
  playerIndex: number,
  cardIndices: number[]
): { state: GameState; error?: string } {
  const s = clone(state)
  if (s.phase !== 'playing')     return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'discard') return { state, error: 'Not in discard phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }
  if (cardIndices.length === 0)  return { state, error: 'Select at least one card.' }

  const player = s.players[playerIndex]!
  const sorted = [...new Set(cardIndices)].sort((a, b) => b - a)
  if (sorted.some(i => i < 0 || i >= player.hand.length)) return { state, error: 'Invalid card index.' }

  const cards = sorted.map(i => player.hand[i]!)
  const totalValue = cards.reduce((sum, c) => sum + cardValue(c.rank), 0)

  if (totalValue < s.discardNeeded)
    return { state, error: `Total value ${totalValue} is less than damage ${s.discardNeeded}.` }

  for (const i of sorted) player.hand.splice(i, 1)
  s.discard.push(...cards)
  log(s, `${player.name} discards ${cards.map(cardLabel).join(', ')} (value: ${totalValue}, needed: ${s.discardNeeded}).`)

  s.discardNeeded = 0
  advanceTurn(s)
  return { state: s }
}

export function applyYield(
  state: GameState,
  playerIndex: number
): { state: GameState; error?: string } {
  const s = clone(state)
  if (s.phase !== 'playing')  return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'play') return { state, error: 'Can only yield during play phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }

  const player = s.players[playerIndex]!
  log(s, `🏳️  ${player.name} yields (no attack played).`)

  const netAttack = Math.max(0, s.currentEnemy!.attack - s.currentEnemy!.shield)
  if (netAttack === 0) {
    log(s, `🛡️  Fully shielded! No damage taken.`)
    advanceTurn(s)
    return { state: s }
  }

  const maxCoverable = player.hand.reduce((sum, c) => sum + cardValue(c.rank), 0)
  if (maxCoverable < netAttack) {
    s.phase = 'lost'
    log(s, `💀 ${player.name} can't cover ${netAttack} damage after yielding. Game over.`)
    return { state: s }
  }

  s.turnPhase = 'discard'
  s.discardNeeded = netAttack
  log(s, `💔 Enemy attacks for ${netAttack} — discard cards totalling ≥ ${netAttack}.`)
  return { state: s }
}

export function applyChooseNext(
  state: GameState,
  playerIndex: number,
  targetIndex: number
): { state: GameState; error?: string } {
  const s = clone(state)
  if (s.phase !== 'playing')         return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'choose_next') return { state, error: 'Not in choose-next phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }
  if (targetIndex < 0 || targetIndex >= s.players.length) return { state, error: 'Invalid player.' }

  s.nextPlayerIndex = targetIndex
  log(s, `${s.players[playerIndex]!.name} sends play to ${s.players[targetIndex]!.name}.`)
  advanceTurn(s)
  return { state: s }
}

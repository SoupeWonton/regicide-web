import type { Card, GameState, ServerPlayer } from './types'
import { buildPlayerDeck, buildEnemyDeck, handSize, cardValue, enemyStats, cardLabel, suitName } from './deck'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

function addLog(state: GameState, msg: string) {
  state.log.unshift(msg)
  if (state.log.length > 30) state.log.pop()
}

// Draw up to n cards from drawPile; refill from tavern if needed
function drawCards(state: GameState, player: ServerPlayer, n: number) {
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.tavern.length === 0) break
      state.drawPile = shuffle(state.tavern)
      state.tavern = []
      addLog(state, '🔄 Tavern reshuffled into draw pile.')
    }
    const card = state.drawPile.pop()!
    player.hand.push(card)
  }
}

function advanceTurn(state: GameState) {
  if (!state.currentEnemy) return
  state.currentEnemy.shieldThisTurn = 0
  state.lastPlayed = []
  state.turnPhase = 'play'
  // next living player
  const n = state.players.length
  let next = (state.currentPlayerIndex + 1) % n
  state.currentPlayerIndex = next
  const name = state.players[state.currentPlayerIndex]?.name ?? '?'
  addLog(state, `👉 ${name}'s turn.`)
}

function revealNextEnemy(state: GameState) {
  if (state.enemyDeck.length === 0) {
    state.phase = 'won'
    addLog(state, '🎉 All enemies defeated! You win!')
    return
  }
  const card = state.enemyDeck.shift()!
  const rank = card.rank as 'J' | 'Q' | 'K'
  const { hp, attack } = enemyStats(rank)
  state.currentEnemy = { card, hp, maxHp: hp, attack, shieldThisTurn: 0 }
  const symbol = { C: '♣', D: '♦', H: '♥', S: '♠' }[card.suit]
  addLog(state, `⚔️  New enemy: ${rank}${symbol} — ${hp} HP / ${attack} ATK`)
}

export function createGame(players: { id: string; name: string }[]): GameState {
  const playerDeck = buildPlayerDeck()
  const enemyDeck  = buildEnemyDeck()
  const count = players.length
  const hSize = handSize(count)

  const serverPlayers: ServerPlayer[] = players.map(p => ({ ...p, hand: [], connected: true }))

  // Deal hands
  for (const player of serverPlayers)
    for (let i = 0; i < hSize; i++)
      player.hand.push(playerDeck.pop()!)

  const state: GameState = {
    phase: 'playing',
    turnPhase: 'play',
    players: serverPlayers,
    currentPlayerIndex: 0,
    enemyDeck,
    currentEnemy: null,
    defeatedEnemies: [],
    tavern: [],
    drawPile: playerDeck,
    discardNeeded: 0,
    log: [],
    lastPlayed: [],
  }

  revealNextEnemy(state)
  addLog(state, `🃏 Game started with ${count} player${count > 1 ? 's' : ''}. ${state.players[0]?.name} goes first.`)
  return state
}

export function applyPlayCard(
  state: GameState,
  playerIndex: number,
  cardIndex: number
): { state: GameState; error?: string } {
  const s = clone(state)

  if (s.phase !== 'playing') return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'play') return { state, error: 'Not in play phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }

  const player = s.players[playerIndex]!
  if (cardIndex < 0 || cardIndex >= player.hand.length) return { state, error: 'Invalid card.' }

  const [card] = player.hand.splice(cardIndex, 1)
  if (!card) return { state, error: 'Card not found.' }

  s.lastPlayed = [card]
  const val = cardValue(card.rank)
  const enemy = s.currentEnemy!

  addLog(s, `${player.name} plays ${cardLabel(card)}.`)

  // ── Suit power ──────────────────────────────────────────────────────────────
  if (card.suit === 'C') {
    // Clubs: shield
    enemy.shieldThisTurn += val
    addLog(s, `♣ Shield +${val} (enemy attack reduced to ${Math.max(0, enemy.attack - enemy.shieldThisTurn)})`)
  }

  if (card.suit === 'D') {
    // Diamonds: draw
    drawCards(s, player, val)
    addLog(s, `♦ Drew ${val} card${val !== 1 ? 's' : ''}.`)
  }

  if (card.suit === 'H') {
    // Hearts: heal (recover cards from tavern into draw pile)
    const recovered = s.tavern.splice(0, val)
    s.drawPile.push(...shuffle(recovered))
    addLog(s, `♥ Recovered ${recovered.length} card${recovered.length !== 1 ? 's' : ''} from tavern.`)
  }

  // ── Attack ───────────────────────────────────────────────────────────────────
  let damage = val
  if (card.suit === 'S') {
    damage = val * 2
    addLog(s, `♠ Attack doubled: ${val} → ${damage}`)
  }

  enemy.hp -= damage
  addLog(s, `💥 Dealt ${damage} damage to ${enemy.card.rank}. (${Math.max(0, enemy.hp)} HP left)`)
  s.tavern.push(card)

  // ── Enemy defeated ───────────────────────────────────────────────────────────
  if (enemy.hp <= 0) {
    s.defeatedEnemies.push(enemy.card)
    s.currentEnemy = null
    addLog(s, `✅ ${enemy.card.rank} defeated!`)
    revealNextEnemy(s)
    if (s.phase === 'won') return { state: s }

    // Same player goes again after defeating an enemy
    s.turnPhase = 'play'
    s.lastPlayed = []
    addLog(s, `${player.name} plays again!`)
    return { state: s }
  }

  // ── Enemy attacks ────────────────────────────────────────────────────────────
  const netDamage = Math.max(0, enemy.attack - enemy.shieldThisTurn)

  if (netDamage === 0) {
    addLog(s, `🛡️  Fully shielded! No damage taken.`)
    advanceTurn(s)
    return { state: s }
  }

  if (player.hand.length < netDamage) {
    // Not enough cards to pay → game over
    s.phase = 'lost'
    addLog(s, `💀 ${player.name} couldn't pay ${netDamage} damage. Game over.`)
    return { state: s }
  }

  s.turnPhase = 'discard'
  s.discardNeeded = netDamage
  addLog(s, `💔 ${player.name} takes ${netDamage} damage — discard ${netDamage} card${netDamage !== 1 ? 's' : ''}.`)
  return { state: s }
}

export function applyDiscard(
  state: GameState,
  playerIndex: number,
  cardIndices: number[]
): { state: GameState; error?: string } {
  const s = clone(state)

  if (s.phase !== 'playing') return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'discard') return { state, error: 'Not in discard phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }
  if (cardIndices.length !== s.discardNeeded) return { state, error: `Must discard exactly ${s.discardNeeded} card(s).` }

  const player = s.players[playerIndex]!
  const sorted = [...new Set(cardIndices)].sort((a, b) => b - a)
  if (sorted.some(i => i < 0 || i >= player.hand.length)) return { state, error: 'Invalid card index.' }

  const discarded: Card[] = []
  for (const i of sorted) {
    const [c] = player.hand.splice(i, 1)
    if (c) discarded.push(c)
  }
  s.tavern.push(...discarded)
  addLog(s, `${player.name} discards: ${discarded.map(cardLabel).join(', ')}.`)

  s.discardNeeded = 0
  advanceTurn(s)
  return { state: s }
}

export function applyYield(
  state: GameState,
  playerIndex: number
): { state: GameState; error?: string } {
  const s = clone(state)

  if (s.phase !== 'playing') return { state, error: 'Game is not active.' }
  if (s.turnPhase !== 'play') return { state, error: 'Can only yield during play phase.' }
  if (s.currentPlayerIndex !== playerIndex) return { state, error: 'Not your turn.' }

  const player = s.players[playerIndex]!
  const discarded = [...player.hand]
  s.tavern.push(...discarded)
  player.hand = []

  addLog(s, `🏳️  ${player.name} yields — discards hand (${discarded.length} cards), no damage.`)
  advanceTurn(s)
  return { state: s }
}

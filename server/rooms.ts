import type { GameState, ClientGameState, RoomInfo } from './types'
import { createGame, applyPlayCards, applyDiscard, applyYield, applyChooseNext } from './game'
import { handSize } from './deck'
import { appendHumanRun } from './human-runs'

interface QuickStats {
  startedAt: string
  turns: number      // play/yield actions taken
  jesters: number
  yields: number
  recorded: boolean
}

interface Room {
  code: string
  hostId: string
  players: { id: string; name: string; ready: boolean }[]
  state: GameState | null
  stats: QuickStats | null
}

// human-run telemetry: one CSV row per finished (or abandoned) quick game,
// comparable against scripts/sim-base.ts bot data
function recordQuickEnd(room: Room, resultOverride?: 'abandoned') {
  const g = room.state
  const st = room.stats
  if (!g || !st || st.recorded) return
  const result = resultOverride ?? (g.phase === 'won' ? 'won' : g.phase === 'lost' ? 'lost' : null)
  if (!result) return
  st.recorded = true
  const defeated = 12 - g.enemyDeck.length - (g.currentEnemy ? 1 : 0)
  appendHumanRun('quick', {
    playerCount: g.players.length,
    players: g.players.map(p => p.name).join('+'),
    result,
    defeated,
    exactKills: defeated - g.defeatedEnemies.length,
    jesters: st.jesters,
    yields: st.yields,
    turns: st.turns,
    startedAt: st.startedAt,
    endedAt: new Date().toISOString(),
  })
}

const rooms = new Map<string, Room>()

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }
  while (rooms.has(code))
  return code
}

export function buildClientState(state: GameState, forPlayerId: string): ClientGameState {
  const myIndex = state.players.findIndex(p => p.id === forPlayerId)
  return {
    phase: state.phase,
    turnPhase: state.turnPhase,
    players: state.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand.length,
      hand: p.id === forPlayerId ? p.hand : undefined,
      isCurrentPlayer: i === state.currentPlayerIndex,
      connected: p.connected,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    nextPlayerIndex: state.nextPlayerIndex,
    enemiesRemaining: state.enemyDeck.length,
    currentEnemy: state.currentEnemy,
    defeatedCount: state.defeatedEnemies.length,
    discardCount: state.discard.length,
    tavernCount: state.tavern.length,
    discardNeeded: state.discardNeeded,
    log: state.log,
    lastPlayed: state.lastPlayed,
    myIndex,
  }
}

export function createRoom(hostId: string, hostName: string): RoomInfo {
  const code = genCode()
  rooms.set(code, { code, hostId, players: [{ id: hostId, name: hostName, ready: false }], state: null, stats: null })
  return roomInfo(code)!
}

/**
 * Return the room for `code`, creating it (with this client as host) if it does
 * not exist. Used to rehydrate a room after a dev server restart so a refresh
 * back into /room/<code> restores the seat (see index.ts get_room).
 */
export function ensureRoom(code: string, hostId: string, hostName: string): RoomInfo {
  if (!rooms.get(code))
    rooms.set(code, { code, hostId, players: [{ id: hostId, name: hostName, ready: false }], state: null, stats: null })
  return roomInfo(code)!
}

export function joinRoom(code: string, playerId: string, playerName: string): { room?: RoomInfo; error?: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'Room not found.' }
  if (room.state) return { error: 'Game already in progress.' }
  if (room.players.length >= 4) return { error: 'Room is full.' }
  if (room.players.find(p => p.id === playerId)) return { room: roomInfo(code)! }
  room.players.push({ id: playerId, name: playerName, ready: false })
  return { room: roomInfo(code)! }
}

export function setReady(code: string, playerId: string, ready: boolean): RoomInfo | null {
  const room = rooms.get(code)
  if (!room) return null
  const p = room.players.find(p => p.id === playerId)
  if (p) p.ready = ready
  return roomInfo(code)!
}

export function startGame(code: string, requesterId: string): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'Room not found.' }
  if (room.hostId !== requesterId) return { error: 'Only the host can start.' }
  room.state = createGame(room.players.map(p => ({ id: p.id, name: p.name })))
  room.stats = { startedAt: new Date().toISOString(), turns: 0, jesters: 0, yields: 0, recorded: false }
  return { states: buildAllStates(room) }
}

export function playCards(code: string, playerId: string, cardIndices: number[]): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const jester = cardIndices.some(i => room.state!.players[pi]?.hand[i]?.rank === 'Jo')
  const result = applyPlayCards(room.state, pi, cardIndices)
  if (result.error) return { error: result.error }
  room.state = result.state
  if (room.stats) {
    room.stats.turns++
    if (jester) room.stats.jesters++
  }
  recordQuickEnd(room)
  return { states: buildAllStates(room) }
}

export function discardDamage(code: string, playerId: string, cardIndices: number[]): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyDiscard(room.state, pi, cardIndices)
  if (result.error) return { error: result.error }
  room.state = result.state
  recordQuickEnd(room)
  return { states: buildAllStates(room) }
}

export function yieldTurn(code: string, playerId: string): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyYield(room.state, pi)
  if (result.error) return { error: result.error }
  room.state = result.state
  if (room.stats) {
    room.stats.turns++
    room.stats.yields++
  }
  recordQuickEnd(room)
  return { states: buildAllStates(room) }
}

export function chooseNext(code: string, playerId: string, targetIndex: number): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyChooseNext(room.state, pi, targetIndex)
  if (result.error) return { error: result.error }
  room.state = result.state
  recordQuickEnd(room)
  return { states: buildAllStates(room) }
}

export function restartGame(code: string): { room?: RoomInfo; error?: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'Room not found.' }
  if (room.state?.phase === 'playing') recordQuickEnd(room, 'abandoned')
  room.state = null
  room.stats = null
  for (const p of room.players) p.ready = false
  return { room: roomInfo(code)! }
}

export function playerDisconnect(playerId: string, keepRoom?: (code: string) => boolean) {
  for (const [code, room] of rooms) {
    const sp = room.state?.players.find(p => p.id === playerId)
    if (sp) sp.connected = false
    const rp = room.players.find(p => p.id === playerId)
    if (rp && !room.state && !keepRoom?.(code)) {
      room.players = room.players.filter(p => p.id !== playerId)
      if (room.players.length === 0) rooms.delete(code)
      else if (room.hostId === playerId) room.hostId = room.players[0]!.id
    }
  }
}

/** Host tears the room down — everyone gets sent home. */
export function deleteRoom(code: string) {
  rooms.delete(code)
}

/** A player walks out. Host seat passes on; empty rooms evaporate. */
export function leaveRoom(code: string, playerId: string): RoomInfo | null {
  const room = rooms.get(code)
  if (!room) return null
  room.players = room.players.filter(p => p.id !== playerId)
  const sp = room.state?.players.find(p => p.id === playerId)
  if (sp) sp.connected = false
  if (room.players.length === 0) { rooms.delete(code); return null }
  if (room.hostId === playerId) room.hostId = room.players[0]!.id
  return roomInfo(code)
}

export function roomInfo(code: string): RoomInfo | null {
  const room = rooms.get(code)
  if (!room) return null
  return { code, hostId: room.hostId, players: room.players }
}

/** Room codes this player belongs to (for reconnect auto-rejoin). */
export function findRoomsByPlayer(playerId: string): string[] {
  const codes: string[] = []
  for (const [code, room] of rooms)
    if (room.players.some(p => p.id === playerId) || room.state?.players.some(p => p.id === playerId))
      codes.push(code)
  return codes
}

/** Mark a reconnected player as connected again in any active game. */
export function markConnected(playerId: string) {
  for (const room of rooms.values()) {
    const sp = room.state?.players.find(p => p.id === playerId)
    if (sp) sp.connected = true
  }
}

/** Current quick-game state for one player (null if no game running). */
export function gameStateFor(code: string, playerId: string): ClientGameState | null {
  const room = rooms.get(code)
  if (!room?.state) return null
  if (!room.state.players.some(p => p.id === playerId)) return null
  return buildClientState(room.state, playerId)
}

function buildAllStates(room: Room): Map<string, ClientGameState> {
  const map = new Map<string, ClientGameState>()
  if (!room.state) return map
  for (const p of room.players)
    map.set(p.id, buildClientState(room.state, p.id))
  return map
}

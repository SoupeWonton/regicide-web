import type { GameState, ClientGameState, RoomInfo } from './types'
import { createGame, applyPlayCards, applyDiscard, applyYield, applyChooseNext } from './game'
import { handSize } from './deck'

interface Room {
  code: string
  hostId: string
  players: { id: string; name: string; ready: boolean }[]
  state: GameState | null
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
  rooms.set(code, { code, hostId, players: [{ id: hostId, name: hostName, ready: false }], state: null })
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
  return { states: buildAllStates(room) }
}

export function playCards(code: string, playerId: string, cardIndices: number[]): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyPlayCards(room.state, pi, cardIndices)
  if (result.error) return { error: result.error }
  room.state = result.state
  return { states: buildAllStates(room) }
}

export function discardDamage(code: string, playerId: string, cardIndices: number[]): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyDiscard(room.state, pi, cardIndices)
  if (result.error) return { error: result.error }
  room.state = result.state
  return { states: buildAllStates(room) }
}

export function yieldTurn(code: string, playerId: string): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyYield(room.state, pi)
  if (result.error) return { error: result.error }
  room.state = result.state
  return { states: buildAllStates(room) }
}

export function chooseNext(code: string, playerId: string, targetIndex: number): { states?: Map<string, ClientGameState>; error?: string } {
  const room = rooms.get(code)
  if (!room?.state) return { error: 'No active game.' }
  const pi = room.state.players.findIndex(p => p.id === playerId)
  const result = applyChooseNext(room.state, pi, targetIndex)
  if (result.error) return { error: result.error }
  room.state = result.state
  return { states: buildAllStates(room) }
}

export function restartGame(code: string): { room?: RoomInfo; error?: string } {
  const room = rooms.get(code)
  if (!room) return { error: 'Room not found.' }
  room.state = null
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

export function roomInfo(code: string): RoomInfo | null {
  const room = rooms.get(code)
  if (!room) return null
  return { code, hostId: room.hostId, players: room.players }
}

function buildAllStates(room: Room): Map<string, ClientGameState> {
  const map = new Map<string, ClientGameState>()
  if (!room.state) return map
  for (const p of room.players)
    map.set(p.id, buildClientState(room.state, p.id))
  return map
}

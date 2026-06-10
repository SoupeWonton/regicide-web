import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import {
  createRoom, joinRoom, setReady, startGame, playCards, discardDamage, yieldTurn,
  chooseNext, restartGame, playerDisconnect, roomInfo, findRoomsByPlayer,
  markConnected, gameStateFor,
} from './rooms'
import {
  startCampaignSession, resumeCampaignSession, dispatchCampaignAction,
  buildCampaignStates, getSaves, getKingdom, getSession, endSession,
} from './campaign/sessions'
import type { CampaignAction } from './campaign/sessions'

const app = express()
const http = createServer(app)
const io = new Server(http, { cors: { origin: '*' } })

app.get('/health', (_, res) => res.json({ ok: true }))

// Players are keyed by a stable client id (sent via socket auth, persisted in
// the browser's localStorage) instead of the volatile socket id. This map
// tracks which live socket currently speaks for each client id, so phones
// that sleep / drop connection rejoin their seat automatically.
const socketsByClient = new Map<string, string>()   // clientId → socket.id

io.on('connection', socket => {
  const cid: string = typeof socket.handshake.auth?.clientId === 'string' && socket.handshake.auth.clientId
    ? socket.handshake.auth.clientId
    : socket.id
  socketsByClient.set(cid, socket.id)
  console.log(`+ ${socket.id} (client ${cid})`)

  function socketFor(clientId: string) {
    const sid = socketsByClient.get(clientId)
    return sid ? io.sockets.sockets.get(sid) : undefined
  }

  function broadcastCampaign(code: string) {
    const info = roomInfo(code)
    if (!info) return
    const states = buildCampaignStates(code, info.players, info.hostId)
    states.forEach((state, playerId) => socketFor(playerId)?.emit('campaign_state', state))
  }

  function broadcast(states: Map<string, import('./types').ClientGameState>) {
    states.forEach((state, playerId) => socketFor(playerId)?.emit('game_state', state))
  }

  // ── Auto-rejoin: put a reconnecting client back into its rooms ─────────────
  for (const code of findRoomsByPlayer(cid)) {
    socket.join(code)
    markConnected(cid)
    const info = roomInfo(code)
    if (info) socket.emit('room_update', info)
    const game = gameStateFor(code, cid)
    if (game) socket.emit('game_state', game)
    if (getSession(code)) {
      const states = buildCampaignStates(code, info?.players ?? [], info?.hostId ?? '')
      const mine = states.get(cid)
      if (mine) socket.emit('campaign_state', mine)
    }
    console.log(`  ↩ ${cid} rejoined room ${code}`)
  }

  socket.on('create_room', ({ name }: { name: string }) => {
    const room = createRoom(cid, name)
    socket.join(room.code)
    socket.emit('room_update', room)
  })

  socket.on('join_room', ({ code, name }: { code: string; name: string }) => {
    const upper = code.toUpperCase()
    // returning member of a campaign room may rejoin; strangers may not
    if (getSession(upper)) {
      const info = roomInfo(upper)
      if (!info?.players.some(p => p.id === cid)) {
        socket.emit('error', 'A campaign is already in progress in that room.')
        return
      }
      socket.join(upper)
      markConnected(cid)
      socket.emit('room_update', info)
      broadcastCampaign(upper)
      return
    }
    const { room, error } = joinRoom(upper, cid, name)
    if (error) { socket.emit('error', error); return }
    socket.join(upper)
    io.to(upper).emit('room_update', room)
  })

  socket.on('get_room', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (info) socket.emit('room_update', info)
  })

  socket.on('set_ready', ({ code, ready }: { code: string; ready: boolean }) => {
    const room = setReady(code, cid, ready)
    if (room) io.to(code).emit('room_update', room)
  })

  socket.on('start_game', ({ code }: { code: string }) => {
    const { states, error } = startGame(code, cid)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('play_cards', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = playCards(code, cid, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('discard_damage', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = discardDamage(code, cid, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('yield_turn', ({ code }: { code: string }) => {
    const { states, error } = yieldTurn(code, cid)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('restart_game', ({ code }: { code: string }) => {
    const { room, error } = restartGame(code)
    if (error) { socket.emit('error', error); return }
    io.to(code).emit('room_update', room)
    io.to(code).emit('game_reset')
  })

  socket.on('choose_next', ({ code, targetIndex }: { code: string; targetIndex: number }) => {
    const { states, error } = chooseNext(code, cid, targetIndex)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  // ── Campaign mode ──────────────────────────────────────────────────────────

  socket.on('list_campaigns', () => {
    socket.emit('campaign_saves', { saves: getSaves(), kingdom: getKingdom() })
  })

  socket.on('start_campaign', ({ code, chapter, seed }: { code: string; chapter: number; seed?: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can start a campaign.'); return }
    const { error } = startCampaignSession(code, info.players.map(p => ({ id: p.id, name: p.name })), (chapter === 2 ? 2 : 1), seed)
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('resume_campaign', ({ code, campaignId }: { code: string; campaignId: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can resume a campaign.'); return }
    const { error } = resumeCampaignSession(code, campaignId, info.players.map(p => ({ id: p.id, name: p.name })))
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('campaign_action', ({ code, action }: { code: string; action: CampaignAction }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    const { error } = dispatchCampaignAction(code, cid, info.hostId, action)
    if (error) { socket.emit('error', error); return }
    if (action.type === 'abandon_campaign') {
      io.to(code).emit('campaign_ended')
      io.to(code).emit('room_update', roomInfo(code))
      return
    }
    broadcastCampaign(code)
  })

  socket.on('end_campaign_session', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (info?.hostId === cid) {
      endSession(code)
      io.to(code).emit('campaign_ended')
      io.to(code).emit('room_update', roomInfo(code))
    }
  })

  socket.on('disconnect', () => {
    console.log(`- ${socket.id} (client ${cid})`)
    // only forget the mapping if a newer connection hasn't replaced it
    if (socketsByClient.get(cid) === socket.id) socketsByClient.delete(cid)
    // keep seats in rooms with an active campaign OR an active quick game;
    // pure lobbies still drop the player (they can simply rejoin)
    playerDisconnect(cid, code => !!getSession(code))
  })
})

const PORT = process.env.PORT ?? 3001
http.listen(PORT, () => console.log(`Regicide server on :${PORT}`))

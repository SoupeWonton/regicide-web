import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createRoom, joinRoom, setReady, startGame, playCards, discardDamage, yieldTurn, chooseNext, restartGame, playerDisconnect, roomInfo } from './rooms'
import {
  startCampaignSession, resumeCampaignSession, dispatchCampaignAction,
  buildCampaignStates, getSaves, getKingdom, getSession, endSession,
} from './campaign/sessions'
import type { CampaignAction } from './campaign/sessions'

const app = express()
const http = createServer(app)
const io = new Server(http, { cors: { origin: '*' } })

app.get('/health', (_, res) => res.json({ ok: true }))

io.on('connection', socket => {
  console.log(`+ ${socket.id}`)

  socket.on('create_room', ({ name }: { name: string }) => {
    const room = createRoom(socket.id, name)
    socket.join(room.code)
    socket.emit('room_update', room)
  })

  socket.on('join_room', ({ code, name }: { code: string; name: string }) => {
    if (getSession(code.toUpperCase())) { socket.emit('error', 'A campaign is already in progress in that room.'); return }
    const { room, error } = joinRoom(code.toUpperCase(), socket.id, name)
    if (error) { socket.emit('error', error); return }
    socket.join(code.toUpperCase())
    io.to(code.toUpperCase()).emit('room_update', room)
  })

  socket.on('get_room', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (info) socket.emit('room_update', info)
  })

  socket.on('set_ready', ({ code, ready }: { code: string; ready: boolean }) => {
    const room = setReady(code, socket.id, ready)
    if (room) io.to(code).emit('room_update', room)
  })

  socket.on('start_game', ({ code }: { code: string }) => {
    const { states, error } = startGame(code, socket.id)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('play_cards', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = playCards(code, socket.id, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('discard_damage', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = discardDamage(code, socket.id, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('yield_turn', ({ code }: { code: string }) => {
    const { states, error } = yieldTurn(code, socket.id)
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
    const { states, error } = chooseNext(code, socket.id, targetIndex)
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
    if (info.hostId !== socket.id) { socket.emit('error', 'Only the host can start a campaign.'); return }
    const { error } = startCampaignSession(code, info.players.map(p => ({ id: p.id, name: p.name })), (chapter === 2 ? 2 : 1), seed)
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('resume_campaign', ({ code, campaignId }: { code: string; campaignId: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== socket.id) { socket.emit('error', 'Only the host can resume a campaign.'); return }
    const { error } = resumeCampaignSession(code, campaignId, info.players.map(p => ({ id: p.id, name: p.name })))
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('campaign_action', ({ code, action }: { code: string; action: CampaignAction }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    const { error } = dispatchCampaignAction(code, socket.id, info.hostId, action)
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
    if (info?.hostId === socket.id) {
      endSession(code)
      io.to(code).emit('campaign_ended')
      io.to(code).emit('room_update', roomInfo(code))
    }
  })

  function broadcastCampaign(code: string) {
    const info = roomInfo(code)
    if (!info) return
    const states = buildCampaignStates(code, info.players, info.hostId)
    states.forEach((state, playerId) => {
      const s = io.sockets.sockets.get(playerId)
      s?.emit('campaign_state', state)
    })
  }

  socket.on('disconnect', () => {
    console.log(`- ${socket.id}`)
    playerDisconnect(socket.id, code => !!getSession(code))
  })

  function broadcast(states: Map<string, import('./types').ClientGameState>) {
    states.forEach((state, playerId) => {
      const s = [...io.sockets.sockets.values()].find(s => s.id === playerId)
      s?.emit('game_state', state)
    })
  }
})

const PORT = process.env.PORT ?? 3001
http.listen(PORT, () => console.log(`Regicide server on :${PORT}`))

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createRoom, joinRoom, setReady, startGame, playCards, discardDamage, yieldTurn, chooseNext, restartGame, playerDisconnect, roomInfo } from './rooms'

const app  = express()
const http = createServer(app)
const io   = new Server(http, { cors: { origin: '*' } })

app.get('/health', (_, res) => res.json({ ok: true }))

io.on('connection', socket => {
  console.log(`+ ${socket.id}`)

  socket.on('create_room', ({ name }: { name: string }) => {
    const room = createRoom(socket.id, name)
    socket.join(room.code)
    socket.emit('room_update', room)
  })

  socket.on('join_room', ({ code, name }: { code: string; name: string }) => {
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

  socket.on('disconnect', () => {
    console.log(`- ${socket.id}`)
    playerDisconnect(socket.id)
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

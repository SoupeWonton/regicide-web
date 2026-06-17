import { io } from 'socket.io-client'

// Connect back to same host — Vite proxies /socket.io → localhost:3001
// This means the phone only needs port 5173, no firewall issues
const SERVER = import.meta.env.VITE_SERVER_URL
  ?? `${window.location.protocol}//${window.location.host}`

// Stable per-browser identity: survives socket reconnects (phone sleep,
// network blips) and page reloads. The server keys players by this id,
// not by the volatile socket id, and auto-rejoins us to our rooms.
function getClientId(): string {
  const KEY = 'kingfall-client-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

export const myId = getClientId()

export const socket = io(SERVER, { autoConnect: true, auth: { clientId: myId } })

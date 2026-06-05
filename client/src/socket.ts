import { io } from 'socket.io-client'

// Connect back to same host — Vite proxies /socket.io → localhost:3001
// This means the phone only needs port 5173, no firewall issues
const SERVER = import.meta.env.VITE_SERVER_URL
  ?? `${window.location.protocol}//${window.location.host}`

export const socket = io(SERVER, { autoConnect: true })

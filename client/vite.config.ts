import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Read launcher-provided ports without pulling in @types/node (this file is
// type-checked by the app's vue-tsc, which has no node globals).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const clientPort = Number(env.VITE_CLIENT_PORT ?? 5173)
const serverPort = env.VITE_SERVER_PORT ?? '3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: clientPort,
    proxy: {
      '/socket.io': {
        target: `http://localhost:${serverPort}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { socket } from '../socket'
import type { ClientGameState, RoomInfo } from '../types'
import GameBoard from './GameBoard.vue'

const route  = useRoute()
const code   = (route.params.code as string).toUpperCase()
const room   = ref<RoomInfo | null>(null)
const game   = ref<ClientGameState | null>(null)
const error  = ref('')
const copied = ref(false)

socket.on('room_update', (r: RoomInfo) => { room.value = r })
socket.on('game_state',  (s: ClientGameState) => { game.value = s })
socket.on('error',       (msg: string) => { error.value = msg })
socket.on('game_reset',  () => { game.value = null })

onMounted(() => socket.emit('get_room', { code }))

const isHost = computed(() => room.value?.hostId === socket.id)
const allReady = computed(() => room.value?.players.every(p => p.ready) ?? false)

function toggleReady() {
  const me = room.value?.players.find(p => p.id === socket.id)
  socket.emit('set_ready', { code, ready: !me?.ready })
}

function startGame() {
  socket.emit('start_game', { code })
}

function copyCode() {
  navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <!-- In-game -->
  <GameBoard v-if="game && game.phase !== 'lobby'" :state="game" :code="code" />

  <!-- Lobby -->
  <div v-else class="min-h-screen flex items-center justify-center p-4">
    <div class="card bg-base-100 shadow-2xl w-full max-w-sm">
      <div class="card-body gap-4">

        <div class="text-center">
          <p class="text-xs text-base-content/40 uppercase tracking-widest">Room code</p>
          <button class="btn btn-ghost btn-lg font-mono text-3xl tracking-widest mt-1 w-full" @click="copyCode">
            {{ code }}
            <span class="text-xs text-base-content/40 ml-1">{{ copied ? '✓' : '⧉' }}</span>
          </button>
          <p class="text-xs text-base-content/40">Tap to copy · Share with friends</p>
        </div>

        <div class="divider my-1" />

        <div class="space-y-2">
          <div
            v-for="p in room?.players"
            :key="p.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ p.name }}</span>
              <span v-if="p.id === room?.hostId" class="badge badge-xs badge-primary">host</span>
              <span v-if="p.id === socket.id"    class="badge badge-xs badge-ghost">you</span>
            </div>
            <span :class="['badge badge-sm', p.ready ? 'badge-success' : 'badge-ghost']">
              {{ p.ready ? 'Ready' : 'Waiting' }}
            </span>
          </div>
        </div>

        <div v-if="error" class="alert alert-error text-sm py-2">{{ error }}</div>

        <div class="flex gap-2 pt-1">
          <button class="btn btn-outline flex-1" @click="toggleReady">
            {{ room?.players.find(p => p.id === socket.id)?.ready ? 'Not Ready' : 'Ready' }}
          </button>
          <button
            v-if="isHost"
            class="btn btn-primary flex-1"
            :disabled="!allReady || (room?.players.length ?? 0) < 1"
            @click="startGame"
          >
            Start
          </button>
        </div>

        <p v-if="isHost && !allReady" class="text-xs text-center text-base-content/40">
          All players must be ready to start.
        </p>

      </div>
    </div>
  </div>
</template>

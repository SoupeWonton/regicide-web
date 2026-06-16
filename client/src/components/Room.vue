<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket, myId } from '../socket'
import type { ClientGameState, RoomInfo, ClientCampaignState, SaveSummary } from '../types'
import GameBoard from './GameBoard.vue'
import CampaignView from './campaign/CampaignView.vue'
import OverlayModal from './campaign/OverlayModal.vue'

const route  = useRoute()
const router = useRouter()
const code   = (route.params.code as string).toUpperCase()
const room   = ref<RoomInfo | null>(null)
const game   = ref<ClientGameState | null>(null)
const campaign = ref<ClientCampaignState | null>(null)
const error  = ref('')
const copied = ref(false)

// campaign setup controls
const showCampaignSetup = ref(false)
const chapter = ref(1)
const seed = ref('')
const runName = ref('')
const recordRun = ref(true)
const saves = ref<SaveSummary[]>([])
const unlockedChapters = ref<number[]>([1])

socket.on('room_update', (r: RoomInfo) => { room.value = r })
socket.on('game_state',  (s: ClientGameState) => { game.value = s })
socket.on('campaign_state', (s: ClientCampaignState) => { campaign.value = s })
socket.on('campaign_ended', () => { campaign.value = null })
socket.on('campaign_saves', (data: { saves: SaveSummary[]; kingdom: { unlockedChapters: number[] } }) => {
  saves.value = data.saves
  unlockedChapters.value = data.kingdom.unlockedChapters
})
socket.on('error',       (msg: string) => { error.value = msg })
socket.on('game_reset',  () => { game.value = null })
socket.on('room_closed', () => {
  campaign.value = null
  game.value = null
  room.value = null
  router.push('/')
})

// ── Leave / kill room (any state) ────────────────────────────────────────────
const confirmLeave = ref(false)
function leaveRoom() {
  confirmLeave.value = false
  socket.emit('leave_room', { code })
}

onMounted(() => {
  socket.emit('get_room', { code })
  socket.emit('list_campaigns')
})

const isHost = computed(() => room.value?.hostId === myId)
const allReady = computed(() => room.value?.players.every(p => p.ready) ?? false)

function toggleReady() {
  const me = room.value?.players.find(p => p.id === myId)
  socket.emit('set_ready', { code, ready: !me?.ready })
}

function startGame() { socket.emit('start_game', { code }) }

function startCampaign() {
  socket.emit('start_campaign', {
    code,
    chapter: chapter.value,
    seed: seed.value || undefined,
    runName: runName.value.trim() || undefined,
    record: recordRun.value,
  })
}

function resumeCampaign(campaignId: string) {
  socket.emit('resume_campaign', { code, campaignId })
}

function copyCode() {
  navigator.clipboard?.writeText(code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <!-- Leave / kill room — reachable from every state -->
  <button
    class="fixed top-1.5 right-1.5 z-40 w-8 h-8 rounded-full flex items-center justify-center text-base-content/35 hover:text-error hover:bg-error/10 transition-colors"
    :title="isHost ? 'Close the room for everyone' : 'Leave the room'"
    @click="confirmLeave = true"
  >🚪</button>

  <OverlayModal v-if="confirmLeave" tone="error" dismissable @close="confirmLeave = false">
    <h3 class="text-lg font-bold text-center">{{ isHost ? '🚪 Close the room?' : '🚪 Leave the room?' }}</h3>
    <p class="text-sm text-center text-base-content/60">
      {{ isHost
        ? 'The room ends for everyone and all players return to the lobby.'
        : 'You return to the lobby; the others play on.' }}
      <span v-if="campaign" class="block mt-1 text-success/80">Campaign progress is saved — resume any time.</span>
    </p>
    <button class="btn btn-error w-full" @click="leaveRoom">{{ isHost ? 'Close the room' : 'Leave' }}</button>
    <button class="btn btn-ghost btn-sm" @click="confirmLeave = false">Stay</button>
  </OverlayModal>

  <!-- Campaign mode -->
  <CampaignView v-if="campaign" :state="campaign" :code="code" />

  <!-- Quick game -->
  <GameBoard v-else-if="game && game.phase !== 'lobby'" :state="game" :code="code" />

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
              <span v-if="p.id === myId"    class="badge badge-xs badge-ghost">you</span>
            </div>
            <span :class="['badge badge-sm', p.ready ? 'badge-success' : 'badge-ghost']">
              {{ p.ready ? 'Ready' : 'Waiting' }}
            </span>
          </div>
        </div>

        <div v-if="error" class="alert alert-error text-sm py-2" @click="error = ''">{{ error }}</div>

        <div class="flex gap-2 pt-1">
          <button class="btn btn-outline flex-1" @click="toggleReady">
            {{ room?.players.find(p => p.id === myId)?.ready ? 'Not Ready' : 'Ready' }}
          </button>
          <button
            v-if="isHost"
            class="btn btn-neutral flex-1"
            :disabled="!allReady || (room?.players.length ?? 0) < 1"
            @click="startGame"
          >Quick Game</button>
        </div>

        <!-- Campaign -->
        <template v-if="isHost">
          <button
            class="btn btn-primary w-full"
            :disabled="!allReady || (room?.players.length ?? 0) < 1"
            @click="showCampaignSetup = !showCampaignSetup"
          >⚜️ Campaign</button>

          <div v-if="showCampaignSetup" class="space-y-3 border border-base-content/10 rounded-lg p-3">
            <div class="flex gap-2 items-center">
              <span class="text-xs text-base-content/50 w-16">Chapter</span>
              <div class="join">
                <button
                  v-for="ch in [1, 2]" :key="ch"
                  class="btn btn-sm join-item"
                  :class="chapter === ch ? 'btn-primary' : 'btn-outline'"
                  :disabled="!unlockedChapters.includes(ch)"
                  @click="chapter = ch"
                >{{ ch }}{{ !unlockedChapters.includes(ch) ? ' 🔒' : '' }}</button>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span class="text-xs text-base-content/50 w-16">Name</span>
              <input v-model="runName" maxlength="60" class="input input-bordered input-sm flex-1" placeholder="(auto)" />
            </div>
            <div class="flex gap-2 items-center">
              <span class="text-xs text-base-content/50 w-16">Seed</span>
              <input v-model="seed" class="input input-bordered input-sm flex-1 font-mono" placeholder="(random)" />
            </div>
            <label class="flex gap-2 items-center cursor-pointer">
              <span class="text-xs text-base-content/50 w-16">Record</span>
              <input v-model="recordRun" type="checkbox" class="checkbox checkbox-sm checkbox-primary" />
              <span class="text-xs text-base-content/60">save this run's stats (bot vs human data)</span>
            </label>
            <button class="btn btn-primary btn-sm w-full" @click="startCampaign">Begin a new lineage</button>

            <template v-if="saves.length">
              <div class="divider my-0 text-xs text-base-content/40">or resume</div>
              <button
                v-for="s in saves" :key="s.id"
                class="btn btn-outline btn-sm w-full justify-start text-left h-auto py-2"
                @click="resumeCampaign(s.id)"
              >
                <span class="font-semibold">{{ s.name }}</span>
                <span class="text-xs text-base-content/50 font-normal">
                  Ch.{{ s.chapter }} · {{ s.phase.replace(/_/g, ' ') }} ·
                  {{ s.heroes.map(h => `${h.name} (${h.classId}${h.alive ? '' : ' †'})`).join(', ') }}
                </span>
              </button>
            </template>
          </div>
        </template>

        <p v-if="isHost && !allReady" class="text-xs text-center text-base-content/40">
          All players must be ready to start.
        </p>

      </div>
    </div>
  </div>
</template>

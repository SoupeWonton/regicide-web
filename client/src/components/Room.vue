<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket, myId } from '../socket'
import type { ClientGameState, RoomInfo, ClientCampaignState, SaveSummary } from '../types'
import { CLASS_DEFS } from './campaign/classData'
import GameBoard from './GameBoard.vue'
import CampaignView from './campaign/CampaignView.vue'
import HeroPortrait from './campaign/HeroPortrait.vue'
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

// Quick game now runs through a class-selection step: host opens it, everyone
// picks, host begins. The picker is no longer parked permanently in the lobby.
const selecting = computed(() => room.value?.selecting ?? false)

function openClassSelect() { socket.emit('set_class_select', { code, value: true }) }
function backToLobby()     { socket.emit('set_class_select', { code, value: false }) }
function startGame()       { socket.emit('start_game', { code }) }

function startCampaign() {
  socket.emit('start_campaign', { code, chapter: chapter.value, seed: seed.value || undefined })
}

function resumeCampaign(campaignId: string) {
  socket.emit('resume_campaign', { code, campaignId })
}

function copyCode() {
  navigator.clipboard?.writeText(code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

// ── Quick-game class picking ──────────────────────────────────────────────────
const myClassId = computed(() => room.value?.classSelections?.[myId] ?? null)

function pickClass(classId: string) {
  const next = myClassId.value === classId ? null : classId
  socket.emit('pick_class_quick', { code, classId: next })
}

function classNameFor(id: string) {
  return CLASS_DEFS.find(c => c.id === id)?.name ?? id
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
  <div v-else class="min-h-screen flex flex-col items-center justify-start p-4 pt-8 gap-6">

    <!-- Main lobby card -->
    <div v-if="!selecting" class="card bg-base-100 shadow-2xl w-full max-w-sm">
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
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium truncate">{{ p.name }}</span>
              <span v-if="p.id === room?.hostId" class="badge badge-xs badge-primary shrink-0">host</span>
              <span v-if="p.id === myId"    class="badge badge-xs badge-ghost shrink-0">you</span>
              <span
                v-if="room?.classSelections?.[p.id]"
                class="badge badge-xs badge-accent shrink-0"
              >{{ classNameFor(room!.classSelections![p.id]) }}</span>
            </div>
            <span :class="['badge badge-sm shrink-0', p.ready ? 'badge-success' : 'badge-ghost']">
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
            @click="openClassSelect"
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
              <span class="text-xs text-base-content/50 w-16">Seed</span>
              <input v-model="seed" class="input input-bordered input-sm flex-1 font-mono" placeholder="(random)" />
            </div>
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

    <!-- Class picker — only after the host hits Quick Game -->
    <div v-if="selecting" class="w-full max-w-3xl pb-8">
      <div class="text-center mb-4 rise-in">
        <p class="font-flavor text-primary/60 text-xs tracking-[0.3em] uppercase">quick game</p>
        <h2 class="text-2xl font-display font-bold gold-title mt-1">Choose Your Class</h2>
        <div class="h-px mt-2 mx-auto w-40 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <p class="text-xs text-base-content/40 mt-2">Optional · Sentinel, QM, Surgeon &amp; Executioner abilities are active</p>
      </div>

      <!-- Host controls / waiting note -->
      <div class="flex items-center justify-center gap-2 mb-5">
        <button class="btn btn-ghost btn-sm" @click="backToLobby">← Back</button>
        <button
          v-if="isHost"
          class="btn btn-primary"
          :disabled="!allReady || (room?.players.length ?? 0) < 1"
          @click="startGame"
        >⚔️ Begin Quick Game</button>
        <span v-else class="text-xs text-base-content/40">Waiting for the host to begin…</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          v-for="(cls, i) in CLASS_DEFS" :key="cls.id"
          :class="[`rise-in-${Math.min(i + 1, 4)}`, 'class-card group relative text-left flex flex-col',
            myClassId === cls.id ? 'class-card-chosen' : '',
            room?.classSelections?.[cls.id] && room.classSelections[cls.id] !== myId ? 'class-card-taken' : '']"
          @click="pickClass(cls.id)"
        >
          <!-- suit watermark -->
          <span class="absolute bottom-1 right-2 text-6xl opacity-[0.07] font-black select-none pointer-events-none"
            :class="cls.suit === '♥' || cls.suit === '♦' ? 'text-error' : 'text-base-content'">{{ cls.suit }}</span>

          <!-- portrait -->
          <div class="class-medallion class-medallion-lg mx-auto mt-4 group-hover:scale-110 transition-transform">
            <HeroPortrait :class-id="cls.id" />
          </div>

          <div class="px-3 pb-3 pt-2 text-center flex-1 flex flex-col">
            <h3 class="font-display font-black tracking-wide text-base text-primary/95">{{ cls.name }}</h3>
            <p class="text-[10px] uppercase tracking-[0.2em] text-base-content/40">{{ cls.theme }} {{ cls.suit }}</p>
            <p class="font-flavor text-xs text-base-content/60 italic mt-1.5 leading-snug">"{{ cls.question }}"</p>
            <p class="text-[11px] text-base-content/70 mt-2 leading-snug flex-1">{{ cls.text }}</p>

            <!-- pillar dots -->
            <div class="flex justify-center gap-3 mt-2.5">
              <div v-for="[pillar, dots] in cls.pillars" :key="pillar" class="text-center">
                <div class="flex gap-0.5 justify-center">
                  <span v-for="d in 3" :key="d" class="w-1.5 h-1.5 rounded-full"
                    :class="d <= dots ? 'bg-primary' : 'bg-base-content/15'" />
                </div>
                <span class="text-[8px] uppercase tracking-wider text-base-content/40">{{ pillar }}</span>
              </div>
            </div>
          </div>

          <!-- claimed ribbon / chosen seal -->
          <div v-if="myClassId === cls.id || (room?.classSelections && Object.entries(room.classSelections).some(([pid, cid]) => cid === cls.id))"
            class="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border shadow"
              :class="myClassId === cls.id
                ? 'bg-primary text-primary-content border-primary'
                : 'bg-base-300 text-base-content/70 border-base-content/20'">
              {{ myClassId === cls.id ? '⚜ YOURS' : room?.players.find(p => p.id === Object.entries(room!.classSelections!).find(([, cid]) => cid === cls.id)?.[0])?.name }}
            </span>
          </div>
        </button>
      </div>

      <p class="text-center text-xs text-base-content/40 mt-4">
        Tap a class to pick it · tap again to unpick · classes are shared with everyone in the room.
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socket } from '../socket'
import type { ClientCampaignState, SaveSummary } from '../types'
import CampaignView from './campaign/CampaignView.vue'
import OverlayModal from './campaign/OverlayModal.vue'

const route  = useRoute()
const router = useRouter()
const code   = (route.params.code as string).toUpperCase()
const campaign = ref<ClientCampaignState | null>(null)
const error  = ref('')

// campaign setup controls
const chapter = ref(1)
const seed = ref('')
const runName = ref('')
const recordRun = ref(true)
const saves = ref<SaveSummary[]>([])
const unlockedChapters = ref<number[]>([1])

socket.on('campaign_state', (s: ClientCampaignState) => { campaign.value = s })
socket.on('campaign_ended', () => { campaign.value = null })
socket.on('campaign_saves', (data: { saves: SaveSummary[]; kingdom: { unlockedChapters: number[] } }) => {
  saves.value = data.saves
  unlockedChapters.value = data.kingdom.unlockedChapters
})
socket.on('error',       (msg: string) => { error.value = msg })
socket.on('room_closed', () => {
  campaign.value = null
  router.push('/')
})

// ── Leave — back to the title screen (any state) ─────────────────────────────
const confirmLeave = ref(false)
function leaveRoom() {
  confirmLeave.value = false
  socket.emit('leave_room', { code })
}

onMounted(() => {
  // get_room re-binds this socket to the room (e.g. after a reload); the
  // campaign launcher itself needs no roster.
  socket.emit('get_room', { code })
  socket.emit('list_campaigns')
})

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

// ── First-run / tutorial gate ────────────────────────────────────────────────
// Per-visitor flag (the server Kingdom is global, so it can't scope "first run").
const TUTORIAL_FLAG = 'kingfall-tutorial-done'
const firstRunPrompt = ref(false)

function onStart() {
  if (localStorage.getItem(TUTORIAL_FLAG)) { startCampaign(); return }
  firstRunPrompt.value = true
}
function chooseTutorial() {
  localStorage.setItem(TUTORIAL_FLAG, '1')   // answered once — don't ask again
  firstRunPrompt.value = false
  socket.emit('start_tutorial', { code })
}
function skipTutorial() {
  localStorage.setItem(TUTORIAL_FLAG, '1')
  firstRunPrompt.value = false
  startCampaign()
}
</script>

<template>
  <!-- Leave — back to the title screen, reachable from every state -->
  <button
    class="fixed top-1.5 right-1.5 z-40 w-8 h-8 rounded-full flex items-center justify-center text-base-content/35 hover:text-error hover:bg-error/10 transition-colors"
    title="Back to the title screen"
    @click="confirmLeave = true"
  >🚪</button>

  <OverlayModal v-if="confirmLeave" tone="error" dismissable @close="confirmLeave = false">
    <h3 class="text-lg font-bold text-center">🚪 Leave?</h3>
    <p class="text-sm text-center text-base-content/60">
      Return to the title screen.
      <span v-if="campaign" class="block mt-1 text-success/80">Campaign progress is saved — resume any time.</span>
    </p>
    <button class="btn btn-error w-full" @click="leaveRoom">Leave</button>
    <button class="btn btn-ghost btn-sm" @click="confirmLeave = false">Stay</button>
  </OverlayModal>

  <!-- First-run prompt: offer the tutorial -->
  <OverlayModal v-if="firstRunPrompt" tone="primary" dismissable @close="firstRunPrompt = false">
    <h3 class="text-lg font-bold text-center">Is this your first run?</h3>
    <p class="text-sm text-center text-base-content/60">
      We'll walk you through the basics in a short scripted fight — about two minutes.
    </p>
    <button class="btn btn-primary w-full" @click="chooseTutorial">Yes — show me the ropes</button>
    <button class="btn btn-ghost btn-sm" @click="skipTutorial">No — straight to the run</button>
  </OverlayModal>

  <!-- Campaign mode -->
  <CampaignView v-if="campaign" :state="campaign" :code="code" />

  <!-- Solo campaign launcher -->
  <div v-else class="min-h-screen flex items-center justify-center p-4">
    <div class="card bg-base-100 shadow-2xl w-full max-w-sm">
      <div class="card-body gap-4">

        <div class="text-center">
          <p class="font-flavor text-primary/60 text-sm tracking-widest">the crown must fall</p>
          <h1 class="gold-title text-3xl mt-1">KINGFALL</h1>
        </div>

        <div v-if="error" class="alert alert-error text-sm py-2" @click="error = ''">{{ error }}</div>

        <div class="space-y-3">
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
          <button class="btn btn-primary w-full" @click="onStart">Start</button>

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

      </div>
    </div>
  </div>
</template>

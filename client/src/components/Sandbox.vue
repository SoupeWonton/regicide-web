<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { ClientCampaignState } from '../types'
import EncounterBoard from './campaign/EncounterBoard.vue'
import RoadMap from './campaign/RoadMap.vue'
import CampPanel from './campaign/CampPanel.vue'

// Replay sandbox: load a run trace (data/traces/*.jsonl — human runs are
// recorded automatically when the lobby Record box is on; bot runs come from
// `npx tsx scripts/sim.ts --trace`) and step through it action by action.
//
// Trace v2: each step carries the real client projection, so the replay
// renders the EXACT same UI as a player — EncounterBoard for fights (hand fan,
// royal card, thrown cards), RoadMap for the road, CampPanel for camps. The
// view follows the actor: the fan is the hand of whoever held the turn.

interface TraceHeader {
  trace: number
  source: 'human' | 'bot'
  id: string
  name: string
  seed: string
  chapter: number
  players: string[]
  classes: string[]
  startedAt: string
}
interface TraceStep {
  action: { type: string; [k: string]: unknown }
  view: ClientCampaignState
  hands: string[][]
}

const header = ref<TraceHeader | null>(null)
const steps = ref<TraceStep[]>([])
const idx = ref(0)
const parseError = ref('')
const showHands = ref(true)

const step = computed(() => steps.value[idx.value] ?? null)
const prevStep = computed(() => steps.value[idx.value - 1] ?? null)
const view = computed(() => step.value?.view ?? null)

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  parseError.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const lines = String(reader.result).split('\n').filter(l => l.trim())
      const head = JSON.parse(lines[0]!)
      if (!head.trace) throw new Error('Not a trace file (missing header).')
      if (head.trace < 2) throw new Error('Old trace format (v1) — re-record it: bot runs with `npx tsx scripts/sim.ts --trace`, human runs with the lobby Record box.')
      header.value = head
      steps.value = lines.slice(1).map(l => JSON.parse(l))
      idx.value = 0
    } catch (err) {
      header.value = null
      steps.value = []
      parseError.value = `Could not parse: ${(err as Error).message}`
    }
  }
  reader.readAsText(file)
}

function go(n: number) {
  idx.value = Math.max(0, Math.min(steps.value.length - 1, n))
}
function findNext(pred: (s: TraceStep) => boolean, dir: 1 | -1) {
  for (let i = idx.value + dir; i >= 0 && i < steps.value.length; i += dir)
    if (pred(steps.value[i]!)) { idx.value = i; return }
}
const isFightEnd = (s: TraceStep) => !!s.view.encounter && s.view.encounter.outcome !== 'active'
const isEnemyReveal = (s: TraceStep) => {
  const i = steps.value.indexOf(s)
  const prev = steps.value[i - 1]
  const cur = s.view.encounter?.currentEnemy
  return !!cur && cur.card.id !== prev?.view.encounter?.currentEnemy?.card.id
}
const isRoad = (s: TraceStep) => s.view.phase === 'road'

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  if (e.key === 'ArrowRight') go(idx.value + 1)
  if (e.key === 'ArrowLeft') go(idx.value - 1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const red = (card: string) => card.includes('♥') || card.includes('♦')

// what changed in this hand vs the previous step (played/discarded = gone)
function handDiff(hi: number): Set<string> {
  const prev = prevStep.value?.hands[hi]
  const cur = step.value?.hands[hi]
  if (!prev || !cur) return new Set()
  const curCount = new Map<string, number>()
  for (const c of cur) curCount.set(c, (curCount.get(c) ?? 0) + 1)
  const gone = new Set<string>()
  for (const c of prev) {
    const n = curCount.get(c) ?? 0
    if (n === 0) gone.add(c)
    else curCount.set(c, n - 1)
  }
  return gone
}

// which real game view this step renders (mirrors CampaignView's routing)
const board = computed<'encounter' | 'road' | 'camp' | 'other'>(() => {
  const v = view.value
  if (!v) return 'other'
  if ((v.phase === 'encounter' || v.phase === 'death_vote') && v.encounter) return 'encounter'
  if (v.phase === 'road' || ((v.phase === 'landmark' || v.phase === 'replace_hero') && v.map)) return 'road'
  if (v.phase === 'camp') return 'camp'
  return 'other'
})
</script>

<template>
  <div class="min-h-screen flex flex-col">

    <!-- ═══ Sandbox chrome: file + stepper (sticky so it survives long boards) ═══ -->
    <div class="sticky top-0 z-[70] bg-base-300/95 backdrop-blur border-b border-base-content/10 px-3 py-2 flex flex-col gap-1.5">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-base font-bold">🔬 Run Sandbox</h1>
        <input type="file" accept=".jsonl,application/jsonl,text/plain" class="file-input file-input-bordered file-input-xs" @change="onFile" />
        <template v-if="header">
          <span class="badge badge-sm" :class="header.source === 'bot' ? 'badge-secondary' : 'badge-primary'">{{ header.source }}</span>
          <span class="font-semibold text-sm">{{ header.name }}</span>
          <span class="font-mono text-xs text-base-content/50">seed {{ header.seed }}</span>
          <span class="text-xs text-base-content/60 hidden md:inline">{{ header.players.map((p, i) => `${p} (${header!.classes[i]})`).join(' · ') }}</span>
        </template>
        <router-link to="/" class="btn btn-ghost btn-xs ml-auto">← lobby</router-link>
      </div>

      <div v-if="header && step" class="flex items-center gap-2 flex-wrap">
        <button class="btn btn-xs" @click="go(0)">⏮</button>
        <button class="btn btn-xs" @click="go(idx - 1)">←</button>
        <span class="font-mono text-xs w-24 text-center">{{ idx + 1 }} / {{ steps.length }}</span>
        <button class="btn btn-xs" @click="go(idx + 1)">→</button>
        <button class="btn btn-xs" @click="go(steps.length - 1)">⏭</button>
        <input
          type="range" min="0" :max="steps.length - 1" :value="idx" class="range range-xs flex-1 min-w-32"
          @input="go(Number(($event.target as HTMLInputElement).value))"
        />
        <div class="flex gap-1">
          <button class="btn btn-xs btn-outline" title="previous fight end" @click="findNext(isFightEnd, -1)">⇤ fight</button>
          <button class="btn btn-xs btn-outline" title="next fight end" @click="findNext(isFightEnd, 1)">fight ⇥</button>
          <button class="btn btn-xs btn-outline" title="next enemy reveal" @click="findNext(isEnemyReveal, 1)">enemy ⇥</button>
          <button class="btn btn-xs btn-outline" title="next road stop" @click="findNext(isRoad, 1)">road ⇥</button>
          <button class="btn btn-xs" :class="showHands ? 'btn-active' : ''" title="toggle the all-hands strip" @click="showHands = !showHands">🂠</button>
        </div>
      </div>

      <!-- this step's action -->
      <div v-if="header && step" class="flex items-center gap-2 flex-wrap text-xs">
        <span class="badge badge-accent font-mono">{{ step.action.type }}</span>
        <span v-if="step.action.cardIndices" class="font-mono text-base-content/60">idx {{ (step.action.cardIndices as number[]).join(',') }}</span>
        <span class="badge badge-ghost">{{ view?.phase }}</span>
        <span v-if="view?.encounter && view.encounter.outcome !== 'active'" class="badge badge-error">{{ view.encounter.outcome }}</span>
        <span v-if="view?.deathVote" class="badge badge-error badge-outline">💀 death vote: {{ view.deathVote.deadHeroName }}</span>
        <span v-if="view?.pendingChoice" class="badge badge-warning badge-outline">choice: {{ view.pendingChoice.prompt }}</span>
      </div>
    </div>

    <p v-if="parseError" class="text-error text-sm px-4 py-2">{{ parseError }}</p>
    <p v-if="!header" class="text-sm text-base-content/50 px-4 py-2">
      Load a trace from <code class="font-mono">server/data/traces/</code> — human runs are recorded automatically
      (lobby “Record” box), bot runs via <code class="font-mono">npx tsx scripts/sim.ts --trace</code>.
      Step with ← → once loaded.
    </p>

    <!-- ═══ THE GAME, exactly as the player saw it ═══ -->
    <template v-if="header && view">
      <div class="flex-1">
        <EncounterBoard v-if="board === 'encounter'" :key="'enc'" :state="view" code="sandbox" />
        <RoadMap v-else-if="board === 'road'" :key="'road'" :state="view" code="sandbox" />
        <CampPanel v-else-if="board === 'camp'" :key="'camp'" :state="view" code="sandbox" />
        <div v-else class="flex items-center justify-center py-16 text-base-content/50">
          <div class="text-center space-y-2">
            <p class="text-2xl font-display font-bold">{{ view.phase }}</p>
            <p v-if="view.pendingChoice" class="text-sm max-w-md">
              {{ view.pendingChoice.prompt }}
              <span class="block mt-1 font-mono text-xs">{{ view.pendingChoice.options.map(o => o.label).join(' · ') }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- pending choice readout (the real overlay only renders for the chooser) -->
      <div v-if="view.pendingChoice && board !== 'other'" class="mx-3 mb-2 px-3 py-2 rounded-box bg-warning/10 border border-warning/30 text-xs">
        <span class="font-bold">{{ view.pendingChoice.prompt }}</span>
        <span class="text-base-content/60 ml-2">{{ view.pendingChoice.options.map(o => o.label).join(' · ') }}</span>
      </div>

      <!-- all-hands analysis strip (cards that left since the previous step are struck red) -->
      <div v-if="showHands && step!.hands.length" class="bg-base-200 border-t border-base-content/10 px-3 py-2 flex flex-col gap-1">
        <div class="text-[10px] uppercase tracking-widest text-base-content/40">all hands · struck = left this action</div>
        <div v-for="(hand, hi) in step!.hands" :key="hi" class="flex items-center gap-2 flex-wrap">
          <span class="text-xs w-24 truncate"
            :class="view.encounter && view.encounter.currentPlayerIndex === hi && view.encounter.outcome === 'active' ? 'font-bold text-primary' : 'text-base-content/50'">
            {{ view.heroes[hi]?.playerName }}
          </span>
          <span
            v-for="(card, ci) in hand" :key="ci"
            class="font-mono px-1.5 py-0.5 rounded bg-base-100 text-sm"
            :class="red(card) ? 'text-error' : ''"
          >{{ card }}</span>
          <span
            v-for="card in handDiff(hi)" :key="'gone' + card"
            class="font-mono px-1.5 py-0.5 rounded text-sm line-through opacity-40 text-error"
            title="left the hand this action"
          >{{ card }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, ClientHero } from '../../types'
import ClassSelect from './ClassSelect.vue'
import RoadMap from './RoadMap.vue'
import EncounterBoard from './EncounterBoard.vue'
import CampPanel from './CampPanel.vue'
import { suitSymbol, suitColor, CLASS_ICONS } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const errorMsg = ref('')
socket.on('error', (msg: string) => { errorMsg.value = msg })

const phase = computed(() => props.state.phase)
const choice = computed(() => props.state.pendingChoice)

const voteLabels: Record<string, string> = {
  retreat: '🏳 Retreat — fall back to an emergency camp',
  last_stand: '⚔️ Last Stand — fight on without them',
  defiant_stand: '🛡 Defiant Stand — the Warden brings them back (once per run)',
}

function act(action: Record<string, unknown>) {
  errorMsg.value = ''
  socket.emit('campaign_action', { code: props.code, action })
}

// persistent hand: the deck carries across road encounters (camp rests reset it)
const showHandStrip = computed(() =>
  ['road', 'camp', 'landmark', 'replace_hero', 'memory_draft'].includes(phase.value) && props.state.myHand.length > 0)

function heroTooltip(h: ClientHero): string {
  const lines = [`${h.className} — ${h.abilityText}`]
  if (h.relic) lines.push(`🏺 ${h.relic.name}: ${h.relic.text}`)
  for (const m of h.memories) lines.push(`🧠 ${m.name}: ${m.text}`)
  if (!h.alive) lines.push('💀 Fallen — can be replaced at camp.')
  return lines.join('\n')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">

    <!-- Campaign header -->
    <div class="bg-base-100 border-b border-base-content/10 px-4 py-2 flex items-center justify-between text-xs">
      <span class="font-bold">⚜️ Chapter {{ state.chapter }} <span class="text-base-content/40 font-normal">· {{ state.chapter === 1 ? 'First Ascension' : 'Broken Court' }}</span></span>
      <span class="text-base-content/40 font-mono">seed {{ state.seed }}</span>
    </div>

    <div v-if="errorMsg" class="alert alert-error text-sm py-2 mx-4 mt-2" @click="errorMsg = ''">{{ errorMsg }}</div>

    <!-- Phase routing -->
    <ClassSelect v-if="phase === 'class_select'" :state="state" :code="code" />
    <RoadMap v-else-if="phase === 'road'" :state="state" :code="code" />
    <EncounterBoard v-else-if="(phase === 'encounter' || phase === 'death_vote') && state.encounter" :state="state" :code="code" />
    <CampPanel v-else-if="phase === 'camp'" :state="state" :code="code" />

    <!-- Memory draft -->
    <div v-else-if="phase === 'memory_draft'" class="max-w-lg mx-auto p-4 space-y-4 w-full">
      <div class="text-center">
        <h2 class="text-2xl font-bold">🧠 Memories</h2>
        <p class="text-sm text-base-content/50">Each survivor keeps one memory of this chapter.</p>
      </div>
      <template v-if="state.memoryDraft?.myOptions">
        <button
          v-for="m in state.memoryDraft.myOptions" :key="m.id"
          class="btn btn-outline w-full justify-start text-left h-auto py-3"
          @click="act({ type: 'memory_pick', memoryId: m.id })"
        >
          <span class="font-semibold">{{ m.name }}</span>
          <span class="text-xs text-base-content/50 font-normal">{{ m.text }}</span>
        </button>
      </template>
      <p v-else class="text-center text-sm text-base-content/50">
        Waiting on: {{ state.memoryDraft?.waitingOn.join(', ') }}
      </p>
    </div>

    <!-- Chapter complete -->
    <div v-else-if="phase === 'chapter_complete'" class="flex-1 flex items-center justify-center p-4">
      <div class="card bg-base-100 shadow-xl text-center py-10 px-8 gap-3 flex flex-col items-center max-w-md">
        <div class="text-6xl">🏰</div>
        <h2 class="text-3xl font-bold">Chapter 1 complete!</h2>
        <p class="text-sm text-base-content/60">
          Kingdom unlocks: <b>Chapter 2</b>, <b>specializations</b>, <b>Commander</b> and <b>Warden</b> (via replacement).
        </p>
        <p class="text-xs text-base-content/40">The Broken Court is harder and richer. Your memories and relics carry forward.</p>
        <button v-if="state.isHost" class="btn btn-primary btn-lg mt-2" @click="act({ type: 'continue_chapter' })">
          March into Chapter 2
        </button>
        <p v-else class="text-xs text-base-content/40">Waiting for the host…</p>
      </div>
    </div>

    <!-- Endings -->
    <div v-else-if="phase === 'campaign_won' || phase === 'campaign_lost'" class="flex-1 flex items-center justify-center p-4">
      <div class="card bg-base-100 shadow-xl text-center py-10 px-8 gap-3 flex flex-col items-center max-w-md">
        <div class="text-6xl">{{ phase === 'campaign_won' ? '👑' : '☠️' }}</div>
        <h2 class="text-3xl font-bold">{{ phase === 'campaign_won' ? 'The Court has fallen!' : 'The lineage ends' }}</h2>
        <p class="text-sm text-base-content/60">
          {{ phase === 'campaign_won'
            ? 'Both chapters conquered. Gambler, Exile and Oracle join the Kingdom roster.'
            : 'Every hero is dead — but the Kingdom keeps its unlocks. The next lineage will know better.' }}
        </p>
        <button class="btn btn-primary mt-2" @click="socket.emit('end_campaign_session', { code })">
          Back to the lobby
        </button>
      </div>
    </div>

    <!-- Death vote overlay -->
    <div v-if="state.deathVote" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="card bg-base-100 shadow-2xl w-full max-w-md">
        <div class="card-body gap-3">
          <h3 class="text-xl font-bold text-center">💀 {{ state.deathVote.deadHeroName }} has fallen</h3>
          <p class="text-sm text-center text-base-content/60">The party must decide. Everyone votes — including the dead.</p>
          <button
            v-for="opt in state.deathVote.options" :key="opt"
            class="btn w-full justify-start text-left h-auto py-3"
            :class="state.deathVote.myVote === opt ? 'btn-primary' : 'btn-outline'"
            @click="act({ type: 'death_vote', vote: opt })"
          >{{ voteLabels[opt] }}</button>
          <p class="text-xs text-center text-base-content/40">
            {{ Object.keys(state.deathVote.votes).length }}/{{ state.heroes.length }} votes in
          </p>
        </div>
      </div>
    </div>

    <!-- Pending choice overlay (landmark rewards, replacement, exile rite) -->
    <div v-if="choice && (phase === 'landmark' || phase === 'replace_hero')" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="card bg-base-100 shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div class="card-body gap-3">
          <h3 class="text-lg font-bold text-center">{{ choice.prompt }}</h3>
          <template v-if="choice.mine">
            <div :class="choice.kind === 'exile_pick' ? 'grid grid-cols-5 gap-1' : 'space-y-2'">
              <button
                v-for="opt in choice.options" :key="opt.id"
                class="btn btn-outline justify-start text-left h-auto py-2 w-full"
                :class="choice.kind === 'exile_pick' ? 'btn-sm font-mono justify-center' : ''"
                @click="act({ type: 'choice_pick', optionId: opt.id })"
              >
                <span class="font-semibold">{{ opt.label }}</span>
                <span v-if="opt.detail" class="text-xs text-base-content/50 font-normal">{{ opt.detail }}</span>
              </button>
            </div>
          </template>
          <p v-else class="text-sm text-center text-base-content/50">
            {{ choice.forPlayerId ? 'Their decision to make…' : 'The host decides…' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Party strip (road) — hover a hero for class/relic/memory details -->
    <div v-if="phase === 'road'" class="flex gap-2 px-3 max-w-lg mx-auto w-full">
      <div
        v-for="h in state.heroes" :key="h.playerId"
        :title="heroTooltip(h)"
        :class="['flex-1 rounded-lg px-2 py-1.5 text-center text-xs border cursor-help',
          h.alive ? 'border-base-content/10 bg-base-100 text-base-content/60' : 'border-error/40 bg-error/5 opacity-50']"
      >
        <div class="font-semibold truncate">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}</div>
        <div class="text-base-content/40">{{ h.handSize }} cards{{ h.relic ? ' · 🏺' : '' }}{{ h.memories.length ? ' · 🧠' + h.memories.length : '' }}</div>
      </div>
    </div>

    <!-- Persistent hand (carries between encounters; camp rests redraw it) -->
    <div v-if="showHandStrip" class="px-3 max-w-lg mx-auto w-full">
      <p class="text-[10px] text-base-content/40 mb-1" title="Your hand carries over between fights. Only a camp rest reshuffles the deck and redraws everyone to full.">
        Your hand ({{ state.myHand.length }}) — carries to the next fight
      </p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="card in state.myHand" :key="card.id"
          class="w-9 h-12 rounded border border-base-content/15 bg-base-100 flex flex-col items-center justify-center font-mono text-xs"
        >
          <span :class="suitColor(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
          <span :class="suitColor(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
        </span>
      </div>
    </div>

    <!-- Log -->
    <div class="card bg-base-100 m-3 mt-auto" v-if="!['campaign_won', 'campaign_lost'].includes(phase)">
      <div class="card-body py-3 px-4">
        <p class="text-xs font-semibold text-base-content/30 uppercase tracking-wider mb-1">Chronicle</p>
        <div class="space-y-1 max-h-28 overflow-y-auto">
          <p v-for="(entry, i) in state.log" :key="i" class="text-xs text-base-content/60 leading-snug">{{ entry }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

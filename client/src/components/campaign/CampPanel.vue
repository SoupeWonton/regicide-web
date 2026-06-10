<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import { CLASS_ICONS } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const deadHeroes = computed(() => props.state.heroes.filter(h => !h.alive))
const nextIsBoss = computed(() => {
  const map = props.state.map
  if (!map) return false
  const cur = map.nodes.find(n => n.id === map.currentNodeId)
  return !!cur?.next.some(id => map.nodes.find(n => n.id === id)?.kind === 'boss')
})

function act(action: Record<string, unknown>) {
  socket.emit('campaign_action', { code: props.code, action })
}
</script>

<template>
  <div class="max-w-lg mx-auto p-4 space-y-4">
    <div class="text-center">
      <h2 class="text-2xl font-bold">🏕 Camp</h2>
      <p class="text-sm text-base-content/50">
        {{ nextIsBoss ? 'The castle looms ahead. This is the last calm before the storm.' : 'Plan, prepare, recover.' }}
      </p>
    </div>

    <!-- Fallen heroes -->
    <div v-if="deadHeroes.length" class="card bg-base-100 border border-error/40">
      <div class="card-body p-4 gap-2">
        <p class="font-semibold text-sm">💀 Fallen: {{ deadHeroes.map(h => h.playerName).join(', ') }}</p>
        <p class="text-xs text-base-content/50">A new hero can answer the lineage here — camp replacements arrive well-equipped.</p>
        <button v-if="state.isHost" class="btn btn-sm btn-error btn-outline" @click="act({ type: 'begin_replacement' })">
          Call for a replacement
        </button>
      </div>
    </div>

    <!-- Preparations -->
    <div class="card bg-base-100">
      <div class="card-body p-4 gap-2">
        <div class="flex items-center justify-between">
          <p class="font-semibold text-sm">🎒 Preparations</p>
          <span class="text-xs text-base-content/40">{{ state.activePreparations.length }}/2 active</span>
        </div>

        <div v-if="state.activePreparations.length" class="space-y-1">
          <div v-for="p in state.activePreparations" :key="p.id" class="text-xs px-2 py-1 rounded bg-success/10 text-success">
            ✓ {{ p.name }} — {{ p.text }}
          </div>
        </div>

        <div v-if="state.preparations.length" class="space-y-1">
          <button
            v-for="p in state.preparations" :key="p.id"
            class="btn btn-sm btn-outline w-full justify-start text-left h-auto py-2"
            :disabled="!state.isHost || state.activePreparations.length >= 2"
            @click="act({ type: 'activate_prep', prepId: p.id })"
          >
            <span class="font-semibold">{{ p.name }}{{ p.tier === 'rare' ? ' ★' : '' }}</span>
            <span class="text-xs text-base-content/50 font-normal">{{ p.text }}</span>
          </button>
        </div>
        <p v-else-if="!state.activePreparations.length" class="text-xs text-base-content/40">No preparations owned. Markets and victories provide them.</p>
        <p v-if="!state.isHost" class="text-xs text-base-content/30">The host activates preparations.</p>
      </div>
    </div>

    <!-- Team inventory -->
    <div v-if="state.spells.length" class="card bg-base-100">
      <div class="card-body p-4 gap-1">
        <p class="font-semibold text-sm">📖 Spells (cast in combat)</p>
        <p v-for="sp in state.spells" :key="sp.id" class="text-xs text-base-content/60">
          {{ sp.name }}{{ sp.tier === 'rare' ? ' ★' : '' }} — {{ sp.text }}
        </p>
      </div>
    </div>

    <!-- Exile camp action -->
    <div v-if="state.exileAvailable" class="card bg-base-100 border border-warning/40">
      <div class="card-body p-4 gap-2">
        <p class="font-semibold text-sm">🔥 The Exile's rite</p>
        <p class="text-xs text-base-content/50">Remove one card from the deck for the rest of the chapter. Every second exile adds Burden.</p>
        <button class="btn btn-sm btn-warning btn-outline" @click="act({ type: 'exile_camp' })">Begin the rite</button>
      </div>
    </div>

    <!-- Heroes recap -->
    <div class="grid grid-cols-2 gap-2">
      <div v-for="h in state.heroes" :key="h.playerId" class="card bg-base-100">
        <div class="card-body p-3 gap-1">
          <p class="text-sm font-semibold">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}
            <span class="text-xs font-normal text-base-content/50">{{ h.className }}</span>
          </p>
          <p class="text-[11px] text-base-content/50">{{ h.abilityText }}</p>
          <p v-if="h.relic" class="text-[11px] text-accent">🏺 {{ h.relic.name }} — {{ h.relic.text }}</p>
          <p v-for="m in h.memories" :key="m.id" class="text-[11px] text-info">🧠 {{ m.name }} — {{ m.text }}</p>
        </div>
      </div>
    </div>

    <button
      v-if="state.isHost"
      class="btn btn-primary w-full"
      :disabled="deadHeroes.length > 0"
      @click="act({ type: 'break_camp' })"
    >
      {{ deadHeroes.length ? 'Replace the fallen before moving on' : nextIsBoss ? '⚔️ March on the castle' : 'Break camp' }}
    </button>
    <p v-else class="text-center text-xs text-base-content/40">Waiting for the host to break camp…</p>
  </div>
</template>

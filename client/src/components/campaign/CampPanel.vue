<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import { CLASS_ICONS } from './cards'
import ItemCard from './ItemCard.vue'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

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
    <div class="text-center rise-in">
      <h2 class="text-2xl font-display font-bold gold-title"><span class="flicker inline-block">🔥</span> Camp</h2>
      <div class="splash-rule h-px mt-2 mx-auto w-40 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <p class="text-sm text-base-content/50 mt-2 font-flavor tracking-wide">
        {{ nextIsBoss ? 'The castle looms ahead. This is the last calm before the storm.' : 'Plan, prepare, recover.' }}
      </p>
    </div>

    <!-- Team inventory -->
    <div v-if="state.spells.length" class="card bg-base-100">
      <div class="card-body p-4 gap-2">
        <p class="font-semibold text-sm">📖 Spells (cast in combat)</p>
        <div class="flex gap-2 flex-wrap">
          <ItemCard v-for="sp in state.spells" :key="sp.id" :id="sp.id" :name="sp.name" :text="sp.text" :tier="sp.tier" sm />
        </div>
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
          <p v-for="rl in h.relics" :key="rl.id" class="text-[11px] text-accent">🏺 {{ rl.name }} — {{ rl.text }}</p>
        </div>
      </div>
    </div>

    <button
      v-if="state.isHost"
      class="btn btn-primary w-full"
      @click="act({ type: 'break_camp' })"
    >
      {{ nextIsBoss ? '⚔️ March on the castle' : 'Break camp' }}
    </button>
    <p v-else class="text-center text-xs text-base-content/40">Waiting for the host to break camp…</p>
  </div>
</template>

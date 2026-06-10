<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import { CLASS_ICONS } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

// campaign start canon: core (Tier 1) roster only
const CORE = [
  { id: 'sentinel', name: 'Sentinel', theme: 'Shield / Stability', text: 'Once per enemy, your first Spade gains +2 shield value.' },
  { id: 'quartermaster', name: 'Quartermaster', theme: 'Draw / Access', text: 'The first Diamond trigger each enemy draws +1 extra card.' },
  { id: 'surgeon', name: 'Surgeon', theme: 'Recovery / Precision', text: 'The first Heart trigger each enemy recovers +1 additional card.' },
  { id: 'executioner', name: 'Executioner', theme: 'Thresholds / Initiative', text: 'Once per enemy, if damage leaves the enemy at 1-2 HP, deal +2 finishing damage.' },
]

const takenBy = computed(() => {
  const map: Record<string, string> = {}
  for (const h of props.state.heroes) if (h.picked) map[h.classId] = h.playerName
  return map
})

const myHero = computed(() => props.state.heroes[props.state.myHeroIndex])

function pick(classId: string) {
  socket.emit('campaign_action', { code: props.code, action: { type: 'pick_class', classId } })
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 space-y-4">
    <div class="text-center rise-in">
      <h2 class="text-2xl font-display font-bold gold-title">Assemble the Lineage</h2>
      <div class="splash-rule h-px mt-2 mx-auto w-48 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <p class="text-sm text-base-content/50 mt-2 font-flavor tracking-wide">Chapter {{ state.chapter }} — choose your hero. The campaign starts with the core roster.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="(cls, i) in CORE" :key="cls.id"
        :class="[`rise-in-${i + 1}`, 'card bg-base-100 text-left border border-base-content/10 hover:ring-2 ring-primary hover:-translate-y-0.5 transition-all',
          { 'ring-2 ring-success': myHero?.picked && myHero?.classId === cls.id }]"
        @click="pick(cls.id)"
      >
        <div class="card-body p-4 gap-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-lg">{{ CLASS_ICONS[cls.id] }} {{ cls.name }}</span>
            <span v-if="takenBy[cls.id]" class="badge badge-sm badge-neutral">{{ takenBy[cls.id] }}</span>
          </div>
          <p class="text-xs text-primary/80">{{ cls.theme }}</p>
          <p class="text-xs text-base-content/60">{{ cls.text }}</p>
        </div>
      </button>
    </div>

    <p class="text-center text-xs text-base-content/40">
      Tier 2 and 3 heroes (Commander, Warden, Gambler, Exile, Oracle) join mid-campaign through the replacement flow once unlocked.
    </p>
  </div>
</template>

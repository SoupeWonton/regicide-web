<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, ClientRoadNode } from '../../types'
import { NODE_ICONS, NODE_LABELS, NODE_DESCRIPTIONS } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const layers = computed(() => {
  const map = props.state.map
  if (!map) return []
  const byLayer = new Map<number, ClientRoadNode[]>()
  for (const n of map.nodes) {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, [])
    byLayer.get(n.layer)!.push(n)
  }
  return [...byLayer.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes]) => nodes)
})

// SVG edge lines between layers (vertical layout, layers as rows)
const positions = computed(() => {
  const pos = new Map<string, { x: number; y: number }>()
  layers.value.forEach((nodes, li) => {
    nodes.forEach((n, ni) => {
      pos.set(n.id, {
        x: ((ni + 1) / (nodes.length + 1)) * 100,
        y: li * 92 + 46,
      })
    })
  })
  return pos
})

const totalHeight = computed(() => layers.value.length * 92)

const edges = computed(() => {
  const out: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = []
  for (const n of props.state.map?.nodes ?? []) {
    const from = positions.value.get(n.id)
    if (!from) continue
    for (const nid of n.next) {
      const to = positions.value.get(nid)
      if (!to) continue
      out.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, active: n.current })
    }
  }
  return out
})

function choose(node: ClientRoadNode) {
  if (!node.reachable || !props.state.isHost) return
  socket.emit('campaign_action', { code: props.code, action: { type: 'road_choose', nodeId: node.id } })
}
</script>

<template>
  <div class="max-w-lg mx-auto p-3">
    <div class="text-center mb-2">
      <h2 class="text-xl font-bold">{{ state.chapter === 1 ? 'The First Ascension' : 'The Broken Court' }}</h2>
      <p class="text-xs text-base-content/50">
        {{ state.isHost ? 'Choose the next landmark — commitment is one-way.' : 'The host commits the route.' }}
      </p>
    </div>

    <div class="relative card bg-base-100 overflow-hidden" :style="{ height: totalHeight + 'px' }">
      <svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <line
          v-for="(e, i) in edges" :key="i"
          :x1="e.x1 + '%'" :y1="e.y1" :x2="e.x2 + '%'" :y2="e.y2"
          :stroke="e.active ? 'oklch(var(--p))' : 'currentColor'"
          :stroke-opacity="e.active ? 0.9 : 0.12"
          :stroke-width="e.active ? 2.5 : 1.5"
          stroke-dasharray="4 4"
        />
      </svg>

      <button
        v-for="n in state.map?.nodes" :key="n.id"
        class="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-all"
        :class="[
          n.reachable && state.isHost ? 'cursor-pointer hover:scale-110' : 'cursor-default',
          n.visited && !n.current ? 'opacity-35' : '',
        ]"
        :style="{ left: positions.get(n.id)?.x + '%', top: positions.get(n.id)?.y + 'px' }"
        :title="`${NODE_LABELS[n.kind] ?? '???'} — ${NODE_DESCRIPTIONS[n.kind] ?? ''}`"
        @click="choose(n)"
      >
        <span
          class="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 bg-base-200"
          :class="[
            n.current ? 'border-primary ring-2 ring-primary/40 bg-primary/15' :
            n.reachable ? 'border-success ring-2 ring-success/30 animate-pulse' :
            'border-base-content/15',
          ]"
        >{{ NODE_ICONS[n.kind] ?? '❓' }}</span>
        <span class="text-[10px] font-semibold" :class="n.reachable ? 'text-success' : 'text-base-content/50'">
          {{ NODE_LABELS[n.kind] ?? '???' }}
        </span>
      </button>
    </div>
  </div>
</template>

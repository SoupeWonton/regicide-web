<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, ClientRoadNode } from '../../types'
import { NODE_ICONS, NODE_LABELS, NODE_DESCRIPTIONS } from './cards'
import { sfx } from '../../sound'

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

const ROW = 96
const positions = computed(() => {
  const pos = new Map<string, { x: number; y: number }>()
  layers.value.forEach((nodes, li) => {
    nodes.forEach((n, ni) => {
      pos.set(n.id, {
        x: ((ni + 1) / (nodes.length + 1)) * 100,
        y: li * ROW + ROW / 2,
      })
    })
  })
  return pos
})

const totalHeight = computed(() => layers.value.length * ROW)
const nodeById = computed(() => new Map(props.state.map?.nodes.map(n => [n.id, n]) ?? []))

const edges = computed(() => {
  const out: { d: string; state: 'active' | 'traveled' | 'idle' }[] = []
  for (const n of props.state.map?.nodes ?? []) {
    const from = positions.value.get(n.id)
    if (!from) continue
    for (const nid of n.next) {
      const to = positions.value.get(nid)
      if (!to) continue
      const ym = (from.y + to.y) / 2
      const d = `M ${from.x} ${from.y + 10} C ${from.x} ${ym}, ${to.x} ${ym}, ${to.x} ${to.y - 10}`
      const target = nodeById.value.get(nid)
      const state = n.current && target?.reachable ? 'active'
        : n.visited && target?.visited ? 'traveled'
        : 'idle'
      out.push({ d, state })
    }
  }
  return out
})

const currentLayer = computed(() => {
  const cur = props.state.map?.nodes.find(n => n.current)
  return (cur?.layer ?? 0)
})

// province mode: successive boss nodes are the three rank gates
const gateInfo = computed(() => {
  const bosses = (props.state.map?.nodes ?? []).filter(n => n.kind === 'boss').sort((a, b) => a.layer - b.layer)
  const m = new Map<string, { icon: string; label: string; desc: string }>()
  if (bosses.length >= 3) {
    const meta = [
      { icon: '🏰', label: 'The Gates', desc: 'The first rank gate — the Jacks bar the way. Win to advance the siege.' },
      { icon: '🏛', label: 'Courtyard', desc: 'The second rank gate — the Queens hold the yard.' },
      { icon: '👑', label: 'The Throne', desc: 'The Kings. No retreat, no second wind. Take it and the province is liberated.' },
    ]
    bosses.forEach((b, i) => m.set(b.id, meta[Math.min(i, 2)]!))
  }
  return m
})

function choose(node: ClientRoadNode) {
  if (!node.reachable || !props.state.isHost) return
  sfx.footsteps()
  socket.emit('campaign_action', { code: props.code, action: { type: 'road_choose', nodeId: node.id } })
}

const LEGEND = [
  ['⚔️', 'fight'], ['🛒', 'boon'], ['🏕', 'camp'], ['👑', 'the castle'], ['❓', 'unscouted'],
] as const
</script>

<template>
  <div class="max-w-lg lg:max-w-2xl mx-auto p-3 w-full">
    <div class="text-center mb-2 rise-in">
      <h2 class="text-xl font-display font-bold gold-title">{{ state.chapter === 1 ? 'The First Ascension' : 'The Broken Court' }}</h2>
      <p class="text-xs text-base-content/50 font-flavor tracking-wide">
        {{ state.isHost ? 'Choose the next landmark — commitment is one-way.' : 'The host commits the route.' }}
        <span class="text-base-content/30"> · leg {{ currentLayer + 1 }} of {{ layers.length }}</span>
      </p>
    </div>

    <!-- the expedition map: ink on parchment -->
    <div class="relative map-parchment overflow-hidden rise-in-1" :style="{ height: totalHeight + 'px' }">
      <!-- candlelight wash that follows the party -->
      <div class="absolute inset-x-0 h-48 pointer-events-none transition-all duration-1000 z-10"
        :style="{ top: `${currentLayer * ROW - 48}px`, background: 'radial-gradient(ellipse 65% 70% at 50% 50%, rgba(201,140,30,0.14), transparent 70%)' }" />

      <svg class="absolute inset-0 w-full h-full pointer-events-none"
        :viewBox="`0 0 100 ${totalHeight}`" preserveAspectRatio="none">
        <path
          v-for="(e, i) in edges" :key="i"
          :d="e.d"
          fill="none"
          vector-effect="non-scaling-stroke"
          :class="e.state === 'active' ? 'path-draw' : ''"
          :stroke="e.state === 'idle' ? '#5a4426' : e.state === 'traveled' ? '#6b4f24' : '#8a5c14'"
          :stroke-opacity="e.state === 'active' ? 0.95 : e.state === 'traveled' ? 0.65 : 0.28"
          :stroke-width="e.state === 'active' ? 2.5 : e.state === 'traveled' ? 2 : 1.5"
          :stroke-dasharray="e.state === 'traveled' ? 'none' : '4 4'"
        />
      </svg>

      <!-- positioning lives on the button; the entrance animation lives on an
           inner wrapper so its keyframe transform never clobbers the centering -->
      <button
        v-for="n in state.map?.nodes" :key="n.id"
        class="absolute -translate-x-1/2 -translate-y-1/2 block z-20"
        :class="[
          n.reachable && state.isHost ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default',
          n.visited && !n.current ? 'node-visited opacity-45' : '',
          !n.visited && !n.reachable && !n.current ? 'opacity-65' : '',
        ]"
        :style="{ left: positions.get(n.id)?.x + '%', top: positions.get(n.id)?.y + 'px' }"
        :title="`${gateInfo.get(n.id)?.label ?? NODE_LABELS[n.kind] ?? '???'} — ${gateInfo.get(n.id)?.desc ?? NODE_DESCRIPTIONS[n.kind] ?? ''}`"
        @click="choose(n)"
      >
        <div class="map-node-enter relative flex flex-col items-center gap-0.5" :style="{ animationDelay: `${n.layer * 70}ms` }">
          <span v-if="n.current" class="here-marker text-base">⚜️</span>
          <span
            class="map-medallion relative"
            :class="[
              n.kind === 'boss' ? 'map-medallion-boss' : '',
              n.current ? 'map-medallion-here' :
              n.reachable ? 'map-medallion-reachable node-reachable' : '',
            ]"
          >
            {{ gateInfo.get(n.id)?.icon ?? NODE_ICONS[n.kind] ?? '❓' }}
            <span v-if="n.visited && !n.current" class="absolute -bottom-1 -right-1 text-[10px] bg-[#d8c89f] text-[#3a2d18] rounded-full w-4 h-4 flex items-center justify-center border border-[#8a6d1c]">✓</span>
          </span>
          <span class="text-[10px] font-semibold font-display tracking-wide" :class="n.reachable ? 'text-[#7a5510]' : 'text-[#5a4830]/85'">
            {{ gateInfo.get(n.id)?.label ?? NODE_LABELS[n.kind] ?? '???' }}
          </span>
        </div>
      </button>
    </div>

    <div class="flex justify-center gap-3 mt-2 text-[10px] text-base-content/40">
      <span v-for="[icon, label] in LEGEND" :key="label">{{ icon }} {{ label }}</span>
    </div>
  </div>
</template>

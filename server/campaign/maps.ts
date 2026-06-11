import type { NodeKind, RoadMapState, RoadNode } from './types'
import type { Rng } from '../rng'
import { EXPERIMENTS } from './experiments'

// Handcrafted chapter maps (road canon: authored variants + deterministic
// permutations that preserve the authored budgets). Each layer lists node
// kinds; the seeded permutation shuffles kinds *within* a layer, which keeps
// per-layer reward/pressure budgets intact. Visibility targets ~40-50% known.

interface LayerSpec {
  kinds: NodeKind[]
  // edges to next layer are generated: node i connects to next-layer nodes
  // [i, i+1] clamped — guarantees forks and reconnections without dead ends.
}

interface ChapterSpec {
  variant: string
  layers: LayerSpec[]
}

// CT bookkeeping per node kind (design/debug only — logged, never shown in UI)
const NODE_CT: Record<NodeKind, { reward: number; pressure: number }> = {
  start:    { reward: 0,    pressure: 0 },
  camp:     { reward: 0.25, pressure: 0 },
  boss:     { reward: 1.0,  pressure: 5 },
  skirmish: { reward: 0.25, pressure: 0.25 },
  veteran:  { reward: 0.4,  pressure: 0.5 },
  elite:    { reward: 0.75, pressure: 0.9 },
  forge:    { reward: 0.25, pressure: 0 },
  abbey:    { reward: 0.25, pressure: 0 },
  market:   { reward: 0.25, pressure: 0 },
  tower:    { reward: 0.25, pressure: 0 },
  shrine:   { reward: 0.25, pressure: 0 },
  lair:     { reward: 1.0,  pressure: 1.1 },
  event:    { reward: 0.25, pressure: 0.1 },   // run events: impact varies (test-grade)
}

const CHAPTER_1: ChapterSpec = {
  variant: 'ch1-a',
  layers: [
    { kinds: ['start'] },
    { kinds: ['skirmish', 'skirmish'] },
    { kinds: ['forge', 'market', 'abbey'] },
    { kinds: ['veteran', 'skirmish', 'veteran'] },
    { kinds: ['tower', 'shrine', 'lair'] },
    { kinds: ['veteran', 'veteran'] },
    { kinds: ['camp'] },   // mandatory pre-boss camp (cannot be skipped — canon)
    { kinds: ['boss'] },
  ],
}

const CHAPTER_2: ChapterSpec = {
  variant: 'ch2-a',
  layers: [
    { kinds: ['start'] },
    { kinds: ['veteran', 'skirmish'] },
    { kinds: ['market', 'forge', 'tower'] },
    { kinds: ['elite', 'veteran', 'elite'] },
    { kinds: ['camp', 'abbey'] },          // mid-chapter breather fork
    { kinds: ['lair', 'shrine', 'elite'] },
    { kinds: ['elite', 'veteran'] },
    { kinds: ['camp'] },
    { kinds: ['boss'] },
  ],
}

// Province prototype: one run = 8 road stops + 3 rank fights. The 12-royal
// base-Regicide castle is split across the acts — Gates (4 Jacks), Courtyard
// (4 Queens), Throne (4 Kings). The camp/lair fork in act 2 is the central
// routing dilemma: rest, or gamble for a rare with no rest until the Throne.
const PROVINCE_1: ChapterSpec = {
  variant: 'prov1-a',
  layers: [
    { kinds: ['start'] },
    { kinds: ['skirmish', 'skirmish'] },          // stop 1
    { kinds: ['forge', 'market', 'abbey'] },      // stop 2
    { kinds: ['boss'] },                          // THE GATES — 4 Jacks
    { kinds: ['veteran', 'event', 'skirmish'] },  // stop 3 — fight, or roll the dice
    { kinds: ['camp', 'lair'] },                  // stop 4 — rest or gamble
    { kinds: ['veteran', 'veteran'] },            // stop 5
    { kinds: ['boss'] },                          // THE COURTYARD — 4 Queens
    { kinds: ['veteran', 'elite', 'event'] },     // stop 6 — fight, or roll the dice
    { kinds: ['camp', 'shrine', 'tower'] },       // stop 7 — breather before the Kings (or push on for blessings)
    { kinds: ['elite', 'veteran'] },              // stop 8
    { kinds: ['boss'] },                          // THE THRONE — 4 Kings
  ],
}

export function buildMap(chapter: 1 | 2, rng: Rng): RoadMapState {
  const spec = EXPERIMENTS.provinceMode && chapter === 1 ? PROVINCE_1 : chapter === 1 ? CHAPTER_1 : CHAPTER_2
  const nodes: RoadNode[] = []
  const layerIds: string[][] = []

  spec.layers.forEach((layer, li) => {
    // deterministic permutation within layer (preserves layer budget)
    const kinds = layer.kinds.length > 1 ? rng.shuffle(layer.kinds) : [...layer.kinds]
    const ids: string[] = []
    kinds.forEach((kind, ni) => {
      const id = `n${li}-${ni}`
      const fixedVisible = kind === 'start' || kind === 'camp' || kind === 'boss'
      nodes.push({
        id, kind, layer: li,
        known: fixedVisible ? true : rng.next() < 0.45,   // ~40-50% visible canon
        next: [],
        visited: kind === 'start',
        rewardCT: NODE_CT[kind].reward,
        pressureCT: NODE_CT[kind].pressure,
      })
      ids.push(id)
    })
    layerIds.push(ids)
  })

  // edges: node i in layer L → nodes [i, i+1] (clamped) in layer L+1,
  // and every next-layer node is guaranteed at least one inbound edge.
  for (let li = 0; li < layerIds.length - 1; li++) {
    const cur = layerIds[li]!, nxt = layerIds[li + 1]!
    for (let i = 0; i < cur.length; i++) {
      const node = nodes.find(n => n.id === cur[i])!
      const targets = new Set<string>()
      const a = Math.min(i, nxt.length - 1)
      targets.add(nxt[a]!)
      if (a + 1 < nxt.length) targets.add(nxt[a + 1]!)
      node.next = [...targets]
    }
    for (let j = 0; j < nxt.length; j++) {
      if (!nodes.some(n => cur.includes(n.id) && n.next.includes(nxt[j]!))) {
        const src = nodes.find(n => n.id === cur[Math.min(j, cur.length - 1)])!
        src.next.push(nxt[j]!)
      }
    }
  }

  return { variant: spec.variant, nodes, currentNodeId: layerIds[0]![0]! }
}

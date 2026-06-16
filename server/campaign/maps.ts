import type { NodeKind, RoadMapState, RoadNode } from './types'
import type { Rng } from '../rng'
import { EXPERIMENTS } from './experiments'

/** Returns the continent number for a given chapter (ch 1-3 → C1, ch 4-6 → C2, …). */
function continentOf(chapter: number): number {
  return Math.ceil(chapter / 3)
}

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
  recruit:  { reward: 0.3,  pressure: 0.3 },   // Continent-1 number-enemy fight
  draft:    { reward: 0.3,  pressure: 0 },      // Continent-1 deck-steering pick
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

// ── Continent-1 chapter maps (ascending-deck, chapters 1–3) ─────────────────
//
// Tier mapping: ch1 = 6s+7s · ch2 = 8s+9s · ch3 = 10s (Council of Tens).
// Structure (2026-06-15 v2): three number gates per chapter (Gates/Courtyard/
// Throne), 3 per rank solo (Throne = 6). Road fights (NO `recruit` nodes):
//   skirmish = a low filler + the tier card (exact-kill the tier card → recruit;
//              the low card → token fragment; overkill → nothing)
//   veteran  = the two tier ranks (6 & 7), both recruitable on exact kill
//   lair     = one next-tier card (8-9) you keep + a rare relic/spell
// ch3 keeps a single boss — the Council of Tens — with a longer, tougher road.

const CONT1_CH1: ChapterSpec = {
  variant: 'cont1-ch1',
  layers: [
    { kinds: ['start'] },
    // ── Act I — the approach to the Gates (6s) ──
    { kinds: ['skirmish'] },                      // guaranteed opener (5 + 6)
    { kinds: ['forge', 'market'] },               // bonus
    { kinds: ['veteran', 'lair'] },               // tier fight, or gamble a Lair
    { kinds: ['boss'] },                          // THE GATES — 3×6
    // ── Act II — the Courtyard (7s) ──
    { kinds: ['skirmish'] },
    { kinds: ['market', 'abbey', 'shrine'] },
    { kinds: ['camp', 'lair'] },                  // REST or gamble
    { kinds: ['veteran', 'draft'] },              // tier fight, or steer the deck
    { kinds: ['tower', 'forge'] },
    { kinds: ['boss'] },                          // THE COURTYARD — 3×7
    // ── Act III — the Throne (6s+7s) ──
    { kinds: ['skirmish'] },
    { kinds: ['forge', 'market', 'shrine'] },
    { kinds: ['camp', 'lair'] },                  // guaranteed-ish rest before the Throne
    { kinds: ['veteran', 'lair'] },
    { kinds: ['boss'] },                          // THE THRONE — 3×6 + 3×7 → backfill 6s+7s
  ],
}

const CONT1_CH2: ChapterSpec = {
  variant: 'cont1-ch2',
  layers: [
    { kinds: ['start'] },
    // ── Act I — the Gates (8s) ──
    { kinds: ['skirmish'] },
    { kinds: ['forge', 'market'] },
    { kinds: ['veteran', 'lair'] },
    { kinds: ['boss'] },                          // THE GATES — 3×8
    // ── Act II — the Courtyard (9s) ──
    { kinds: ['skirmish'] },
    { kinds: ['market', 'abbey', 'shrine'] },
    { kinds: ['camp', 'lair'] },
    { kinds: ['veteran', 'draft'] },
    { kinds: ['tower', 'forge'] },
    { kinds: ['boss'] },                          // THE COURTYARD — 3×9
    // ── Act III — the Throne (8s+9s) ──
    { kinds: ['skirmish'] },
    { kinds: ['forge', 'market', 'shrine'] },
    { kinds: ['camp', 'lair'] },
    { kinds: ['veteran', 'lair'] },
    { kinds: ['boss'] },                          // THE THRONE — 3×8 + 3×9 → backfill 8s+9s
  ],
}

// Chapter 3: 10s tier + Council of Tens finale — a single boss, but the road is
// deliberately harder/longer (more fights + lairs, fewer breathers) before the
// Council. The boss node is the Council of Tens (all four 10s at once).
const CONT1_CH3: ChapterSpec = {
  variant: 'cont1-ch3',
  layers: [
    { kinds: ['start'] },
    { kinds: ['skirmish'] },                     // guaranteed opener (9 + 10)
    { kinds: ['veteran', 'lair'] },              // harder opener
    { kinds: ['skirmish', 'draft'] },            // FORK: fight | draft
    { kinds: ['forge', 'market'] },
    { kinds: ['veteran', 'lair'] },              // FORK: fight | gamble
    { kinds: ['camp'] },                         // mid-chapter breath
    { kinds: ['skirmish'] },                     // capstone fight
    { kinds: ['lair', 'veteran'] },              // last gamble before gearing up
    { kinds: ['forge', 'abbey'] },               // gear up before the Council
    { kinds: ['camp'] },                         // mandatory pre-Council camp
    { kinds: ['boss'] },                         // Council of Tens (all four 10s)
  ],
}

// Province prototype: one run = 12 road stops + 3 rank gates. The 12-royal
// base-Regicide castle is split across the acts — Gates (4 Jacks), Courtyard
// (4 Queens), Throne (4 Kings). Each act guarantees one fight and one bonus on
// the road to its gate, plus a lair-vs-safe fork (the gamble for a rare). The
// camp/lair forks are the central routing dilemma: rest, or push on with no
// rest, gambling a Lair for a rare relic. Acts ramp skirmish → veteran → elite.
const PROVINCE_1: ChapterSpec = {
  variant: 'prov1-b',
  layers: [
    { kinds: ['start'] },
    // ── Act I — the approach to the Gates ──
    { kinds: ['skirmish'] },                      // stop 1 — guaranteed fight
    { kinds: ['forge', 'market'] },               // stop 2 — guaranteed bonus
    { kinds: ['skirmish', 'lair'] },              // stop 3 — easy fight, or gamble a Lair for a rare
    { kinds: ['boss'] },                          // THE GATES — 4 Jacks
    // ── Act II — the Courtyard ──
    { kinds: ['veteran'] },                       // stop 4 — guaranteed fight
    { kinds: ['market', 'abbey', 'shrine'] },     // stop 5 — guaranteed bonus
    { kinds: ['camp', 'lair'] },                  // stop 6 — REST or gamble a Lair
    { kinds: ['veteran', 'elite'] },              // stop 7 — fight (push harder for more)
    { kinds: ['tower', 'forge'] },                // stop 8 — bonus before the Queens
    { kinds: ['boss'] },                          // THE COURTYARD — 4 Queens
    // ── Act III — the Throne ──
    { kinds: ['elite'] },                         // stop 9 — guaranteed fight
    { kinds: ['forge', 'market', 'shrine'] },     // stop 10 — guaranteed bonus
    { kinds: ['camp', 'lair'] },                  // stop 11 — REST or gamble a Lair
    { kinds: ['elite', 'veteran'] },              // stop 12 — the last fight before the Kings
    { kinds: ['boss'] },                          // THE THRONE — 4 Kings
  ],
}

export function buildMap(chapter: number, rng: Rng): RoadMapState {
  // Continent-1 ascending-deck maps (chapters 1–3)
  let spec: ChapterSpec
  if (EXPERIMENTS.ascendingDeck && continentOf(chapter) === 1) {
    spec = chapter === 1 ? CONT1_CH1 : chapter === 2 ? CONT1_CH2 : CONT1_CH3
  } else if (EXPERIMENTS.provinceMode && chapter <= 1) {
    // Province mode uses PROVINCE_1 for the first (and currently only) chapter;
    // continent-2 chapters (ch4+) in ascending-deck also use it.
    spec = PROVINCE_1
  } else if (EXPERIMENTS.ascendingDeck && continentOf(chapter) === 2) {
    // Continent-2 (ascending-deck): the province IS the finale; chapter 4 → PROVINCE_1.
    spec = PROVINCE_1
  } else {
    spec = chapter === 1 ? CHAPTER_1 : CHAPTER_2
  }
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

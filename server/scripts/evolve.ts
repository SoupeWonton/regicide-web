// Evolutionary persona tuner.
//
// A genome IS a bot Persona (the ~20 weights in sim-personas.ts that drive every
// play / route / recruit / class decision). Each generation:
//   1. Evaluate a population of N genomes over S shared seeds  (N*S = runs/gen).
//   2. Keep the top 5% by fitness (the "best percentile winners").
//   3. Breed the next generation from those elites (elitism + crossover + mutation).
// Repeat for GENERATIONS, then report win-rate growth.
//
// Run:  npx tsx scripts/evolve.ts            (from server/)
// Output: console table + sim-results/evolve-<stamp>.json
//
// NOTE: importing sim.ts must NOT run its CLI, so we set SIM_NO_MAIN before the
// dynamic import. The campaign engine persists kingdom.json + campaign saves to
// disk during a run; we back up kingdom.json and delete sim-created saves after.

process.env.SIM_NO_MAIN = '1'   // must precede the dynamic import of sim.ts below

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRng } from '../rng'
import { STARTING_RELICS, STARTING_SPELLS } from '../campaign/content'
import type { ClassId, CtCategory, KingdomState } from '../campaign/types'
import { PERSONAS, type Persona } from './sim-personas'

// Redirect ALL engine persistence to a throwaway temp dir BEFORE importing the
// engine (via sim.ts) so 3000 sims never touch the live game's data/.
const TMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'regicide-evolve-'))
process.env.REGICIDE_DATA_DIR = TMP_DATA

const { runCampaign } = await import('./sim.ts')   // SIM_NO_MAIN guard skips its main

// ── Config ───────────────────────────────────────────────────────────────────
const POP = Number(process.env.EVO_POP ?? 50)               // genomes per generation
const SEEDS_PER_GENOME = Number(process.env.EVO_SEEDS ?? 20) // shared seeds each genome plays → POP*SEEDS = runs/gen
const GENERATIONS = Number(process.env.EVO_GENS ?? 3)
const ELITE_FRAC = 0.05      // top 5% are copied/bred forward
const MUT_RATE = 0.4         // per-field probability of a gaussian nudge
const MUT_SCALE = 0.15       // nudge sd as a fraction of the field's range

const rng = createRng('evolve-v1')   // deterministic, reproducible experiment

const CLASSES: ClassId[] = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden', 'gambler', 'exile', 'oracle']
const CAT_KEYS: CtCategory[] = ['Shield', 'Access', 'Recovery', 'Initiative', 'Consistency']

// numeric gene ranges (min, max) — mutations clamp to these
const RANGES: Record<string, [number, number]> = {
  aggression: [0.5, 2.0], killBonus: [4, 14], exactBonus: [1, 12], shieldWeight: [0.2, 2.0],
  drawWeight: [0.2, 2.0], recoverWeight: [0.2, 1.6], conserve: [0.05, 0.9], riskAversion: [0.4, 2.0],
  yieldBias: [-4, 2], banishAversion: [0.05, 1.6], setupWeight: [0.2, 2.5],
  routeGreed: [0.4, 1.6], routeFight: [0.4, 1.4], routeSafety: [0.3, 1.6],
  rarePref: [0.5, 1.1], spellEagerness: [0, 1], lastStandBase: [0, 1],
}
const CAT_RANGE: [number, number] = [0.2, 1.7]
const NUM_KEYS = Object.keys(RANGES)

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o))
function gauss(): number {
  const u = Math.max(1e-9, rng.next())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next())
}

function randomGenome(id: string): Persona {
  const g: any = { id }
  for (const k of NUM_KEYS) { const [lo, hi] = RANGES[k]!; g[k] = lo + rng.next() * (hi - lo) }
  g.catPrefs = Object.fromEntries(CAT_KEYS.map(c => [c, CAT_RANGE[0] + rng.next() * (CAT_RANGE[1] - CAT_RANGE[0])])) as Record<CtCategory, number>
  g.classPref = rng.shuffle(CLASSES)
  return g as Persona
}

function mutate(parent: Persona, id: string): Persona {
  const g: any = clone(parent); g.id = id
  for (const k of NUM_KEYS) {
    if (rng.next() < MUT_RATE) { const [lo, hi] = RANGES[k]!; g[k] = clamp(g[k] + gauss() * MUT_SCALE * (hi - lo), lo, hi) }
  }
  for (const c of CAT_KEYS) {
    if (rng.next() < MUT_RATE) g.catPrefs[c] = clamp(g.catPrefs[c] + gauss() * MUT_SCALE * (CAT_RANGE[1] - CAT_RANGE[0]), CAT_RANGE[0], CAT_RANGE[1])
  }
  // class pick order: a couple of random swaps
  for (let s = 0; s < 2; s++) if (rng.next() < 0.3) {
    const i = rng.int(CLASSES.length), j = rng.int(CLASSES.length)
    ;[g.classPref[i], g.classPref[j]] = [g.classPref[j], g.classPref[i]]
  }
  return g as Persona
}

function crossover(a: Persona, b: Persona, id: string): Persona {
  const g: any = { id }
  for (const k of NUM_KEYS) g[k] = (rng.next() < 0.5 ? a : b)[k as keyof Persona]
  g.catPrefs = Object.fromEntries(CAT_KEYS.map(c => [c, (rng.next() < 0.5 ? a : b).catPrefs[c]])) as Record<CtCategory, number>
  g.classPref = [...(rng.next() < 0.5 ? a : b).classPref]
  return g as Persona
}

function freshKingdom(): KingdomState {
  return {
    unlockedChapters: [1, 2],
    unlockedClasses: [...CLASSES],
    specializationsUnlocked: true, campaignsWon: 0, heroesLost: 0,
    unlockedRelics: [...STARTING_RELICS], unlockedSpells: [...STARTING_SPELLS],
  }
}

// fitness: wins dominate, with progress milestones giving a gradient even before
// a genome can win outright (reach boss1 → beat ch1 → reach boss2 → win).
function score(rec: any): number {
  return (rec.result === 'won' ? 1000 : 0)
    + (rec.beatCh1 ? 200 : 0) + (rec.reachedBoss2 ? 120 : 0) + (rec.reachedBoss1 ? 60 : 0)
    + rec.gatesCleared * 15 + rec.encountersWon * 3
}

interface Scored { genome: Persona; fitness: number; winRate: number }

function evaluate(pop: Persona[], seeds: string[]): Scored[] {
  return pop.map(genome => {
    let fit = 0, wins = 0
    for (const seed of seeds) {
      const rec: any = runCampaign('evo', [genome], seed, freshKingdom(), [], `evo-${genome.id}-${seed}`)
      fit += score(rec)
      if (rec.result === 'won') wins++
    }
    return { genome, fitness: fit / seeds.length, winRate: wins / seeds.length }
  })
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

// engine persistence is redirected to TMP_DATA (set above), so the live game's
// data/ is never touched. We just remove the temp dir when done.
const HERE = path.dirname(fileURLToPath(import.meta.url))

// ── Evolve ───────────────────────────────────────────────────────────────────
const eliteCount = Math.max(2, Math.ceil(ELITE_FRAC * POP))
const t0 = Date.now()
const history: { gen: number; popMeanWin: number; eliteMeanWin: number; bestWin: number; popMeanFit: number; eliteMeanFit: number; bestGenome: string }[] = []
let summaryElites: Scored[] = []

console.log(`▶ Evolving personas: ${POP} genomes × ${SEEDS_PER_GENOME} seeds = ${POP * SEEDS_PER_GENOME} runs/gen, ${GENERATIONS} generations (top ${eliteCount} carried forward)\n`)

try {
  // Generation 1 population: the 6 hand-tuned personas + random genomes for spread.
  let pop: Persona[] = Object.values(PERSONAS).map((p, i) => ({ ...clone(p), id: `g1-named-${p.id}` }))
  let k = 0
  while (pop.length < POP) pop.push(randomGenome(`g1-rand-${k++}`))

  for (let gen = 1; gen <= GENERATIONS; gen++) {
    const seeds = Array.from({ length: SEEDS_PER_GENOME }, (_, si) => `evo-g${gen}-s${si}`)
    const scored = evaluate(pop, seeds).sort((a, b) => b.fitness - a.fitness)
    const elites = scored.slice(0, eliteCount)
    summaryElites = elites

    const row = {
      gen,
      popMeanWin: mean(scored.map(s => s.winRate)),
      eliteMeanWin: mean(elites.map(s => s.winRate)),
      bestWin: scored[0]!.winRate,
      popMeanFit: mean(scored.map(s => s.fitness)),
      eliteMeanFit: mean(elites.map(s => s.fitness)),
      bestGenome: scored[0]!.genome.id,
    }
    history.push(row)
    console.log(
      `Gen ${gen}: pop win ${(row.popMeanWin * 100).toFixed(1)}%  ·  elite(top ${eliteCount}) win ${(row.eliteMeanWin * 100).toFixed(1)}%  ·  best ${(row.bestWin * 100).toFixed(1)}% (${row.bestGenome})  ·  fit pop ${row.popMeanFit.toFixed(0)} / elite ${row.eliteMeanFit.toFixed(0)}`,
    )

    if (gen === GENERATIONS) break
    // Breed: elitism (carry elites verbatim) + crossover/mutated children.
    const next: Persona[] = elites.map((e, i) => ({ ...clone(e.genome), id: `g${gen + 1}-elite-${i}` }))
    let c = 0
    while (next.length < POP) {
      const base = elites.length >= 2 && rng.next() < 0.5
        ? crossover(rng.pick(elites).genome, rng.pick(elites).genome, 'x')
        : clone(rng.pick(elites).genome)
      next.push(mutate(base, `g${gen + 1}-child-${c++}`))
    }
    pop = next
  }
} finally {
  try { fs.rmSync(TMP_DATA, { recursive: true, force: true }) } catch {}
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n════════ WIN-RATE GROWTH ════════`)
const g1 = history[0]!, gN = history[history.length - 1]!
console.log(`Population mean win rate: ${(g1.popMeanWin * 100).toFixed(1)}%  →  ${(gN.popMeanWin * 100).toFixed(1)}%   (Δ ${((gN.popMeanWin - g1.popMeanWin) * 100).toFixed(1)} pts)`)
console.log(`Elite mean win rate:      ${(g1.eliteMeanWin * 100).toFixed(1)}%  →  ${(gN.eliteMeanWin * 100).toFixed(1)}%   (Δ ${((gN.eliteMeanWin - g1.eliteMeanWin) * 100).toFixed(1)} pts)`)
console.log(`Best genome win rate:     ${(g1.bestWin * 100).toFixed(1)}%  →  ${(gN.bestWin * 100).toFixed(1)}%   (Δ ${((gN.bestWin - g1.bestWin) * 100).toFixed(1)} pts)`)

const best = summaryElites[0]
console.log(`\nBest evolved genome (${best?.genome.id}, ${(best!.winRate * 100).toFixed(1)}% win):`)
console.log(JSON.stringify(best?.genome, null, 2))

const stamp = new Date(t0).toISOString().replace(/[:.]/g, '-').slice(0, 19)
const OUT = path.join(HERE, '..', '..', 'sim-results', `evolve-${stamp}.json`)
fs.writeFileSync(OUT, JSON.stringify({ config: { POP, SEEDS_PER_GENOME, GENERATIONS, eliteCount }, history, bestGenome: best?.genome, bestWinRate: best?.winRate }, null, 2))
console.log(`\n${POP * SEEDS_PER_GENOME * GENERATIONS} campaigns in ${((Date.now() - t0) / 1000).toFixed(1)}s · saved ${OUT}`)

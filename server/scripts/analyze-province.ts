// Province-1 solo deep-dig: pools runs.csv files from several sim.ts output
// dirs (class-isolation sweeps, one persona each) and slices the data by
// class, persona (= path policy), road composition, items, and Jester usage.
//
// Run: npx tsx scripts/analyze-province.ts <dir...>   (dirs under data/sim/)
//      with no args: pools the most recent 6 dirs.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SIM_DIR = path.join(HERE, '..', 'data', 'sim')

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.length)
  const split = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out
  }
  const cols = split(lines[0]!)
  return lines.slice(1).map(l => {
    const vals = split(l)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => { row[c] = vals[i] ?? '' })
    return row
  })
}

let dirs = process.argv.slice(2)
if (dirs.length === 0) {
  dirs = fs.readdirSync(SIM_DIR)
    .filter(d => fs.existsSync(path.join(SIM_DIR, d, 'runs.csv')))
    .sort()
    .slice(-6)
}
interface Run {
  cls: string; persona: string; won: boolean; gates: number
  deckAtThrone: number; royalsAtThrone: number; exacts: number; banished: number
  jesters: number; yields: number; itemsGained: number; encounters: number; encWon: number
  path: string[]; items: string[]; lossNodeKind: string; reachedThrone: boolean
}
const runs: Run[] = []
for (const d of dirs) {
  const file = path.isAbsolute(d) ? path.join(d, 'runs.csv') : path.join(SIM_DIR, d, 'runs.csv')
  for (const r of parseCsv(fs.readFileSync(file, 'utf8'))) {
    const lineup = r['lineup'] ?? ''             // persona:class in isolation mode
    const [persona, cls] = lineup.includes(':') ? lineup.split(':') : ['?', lineup]
    runs.push({
      cls: cls ?? '?', persona: persona ?? '?',
      won: r['result'] === 'won',
      gates: +(r['gatesCleared'] ?? 0),
      deckAtThrone: +(r['deckAtThrone'] ?? 0),
      royalsAtThrone: +(r['royalsAtThrone'] ?? 0),
      exacts: +(r['exactKills'] ?? 0),
      banished: +(r['royalsBanished'] ?? 0),
      jesters: +(r['jesters'] ?? 0),
      yields: +(r['yields'] ?? 0),
      itemsGained: +(r['itemsGained'] ?? 0),
      encounters: +(r['encountersFought'] ?? 0),
      encWon: +(r['encountersWon'] ?? 0),
      path: (r['path'] ?? '').split('>').filter(Boolean),
      items: (r['itemsList'] ?? '').split('|').filter(Boolean),
      lossNodeKind: r['lossNodeKind'] ?? '',
      reachedThrone: +(r['deckAtThrone'] ?? 0) > 0,
    })
  }
}
console.log(`pooled ${runs.length} solo province runs from ${dirs.length} dirs\n`)

const pct = (n: number, d: number) => (d === 0 ? '   — ' : `${((100 * n) / d).toFixed(1)}%`.padStart(5))
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function table(label: string, key: (r: Run) => string) {
  const groups = new Map<string, Run[]>()
  for (const r of runs) {
    const k = key(r)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  const rows = [...groups.entries()].sort((a, b) =>
    avg(b[1].map(r => r.gates)) - avg(a[1].map(r => r.gates)))
  console.log(`══ ${label} ${'═'.repeat(Math.max(0, 100 - label.length))}`)
  console.log(`${'group'.padEnd(15)} ${'n'.padStart(5)}  won%   gate1  gate2  throne  win@thr  gates  deck@thr  jesters  exacts`)
  for (const [k, rs] of rows) {
    const n = rs.length
    const thr = rs.filter(r => r.reachedThrone)
    console.log(
      `${k.padEnd(15)} ${String(n).padStart(5)}  ` +
      `${pct(rs.filter(r => r.won).length, n)}  ` +
      `${pct(rs.filter(r => r.gates >= 1).length, n)}  ` +
      `${pct(rs.filter(r => r.gates >= 2).length, n)}  ` +
      `${pct(thr.length, n)}   ` +
      `${pct(thr.filter(r => r.won).length, thr.length)}   ` +
      `${avg(rs.map(r => r.gates)).toFixed(2)}  ` +
      `${avg(thr.map(r => r.deckAtThrone)).toFixed(1).padStart(7)}  ` +
      `${avg(rs.map(r => r.jesters)).toFixed(2).padStart(7)}  ` +
      `${avg(rs.map(r => r.exacts)).toFixed(1).padStart(6)}`)
  }
  console.log()
}

table('BY CLASS (pooled over personas — 1200/class)', r => r.cls)
table('BY PERSONA = path policy (pooled over classes — 1800/persona)', r => r.persona)

// class × persona gates matrix
const classes = [...new Set(runs.map(r => r.cls))].sort()
const personas = [...new Set(runs.map(r => r.persona))].sort()
console.log(`══ CLASS × PERSONA — avg gates cleared (win% in parens) ${'═'.repeat(40)}`)
console.log(`${''.padEnd(15)}${personas.map(p => p.padStart(16)).join('')}`)
for (const c of classes) {
  const cells = personas.map(p => {
    const rs = runs.filter(r => r.cls === c && r.persona === p)
    if (!rs.length) return '—'.padStart(16)
    return `${avg(rs.map(r => r.gates)).toFixed(2)} (${((100 * rs.filter(r => r.won).length) / rs.length).toFixed(0)}%)`.padStart(16)
  })
  console.log(`${c.padEnd(15)}${cells.join('')}`)
}
console.log()

// ── Path composition: does visiting more X correlate with progress? ─────────
const KINDS = ['camp', 'market', 'forge', 'abbey', 'shrine', 'tower', 'lair', 'elite', 'veteran', 'skirmish', 'event']
console.log(`══ PATH — avg gates by # of node-kind visits (n in parens) ${'═'.repeat(38)}`)
console.log(`${'kind'.padEnd(10)} ${'0 visits'.padStart(14)} ${'1 visit'.padStart(14)} ${'2 visits'.padStart(14)} ${'3+ visits'.padStart(14)}`)
for (const kind of KINDS) {
  const bucket = (lo: number, hi: number) => {
    const rs = runs.filter(r => {
      const k = r.path.filter(x => x === kind).length
      return k >= lo && k <= hi
    })
    return rs.length ? `${avg(rs.map(r => r.gates)).toFixed(2)} (${rs.length})`.padStart(14) : '—'.padStart(14)
  }
  console.log(`${kind.padEnd(10)} ${bucket(0, 0)} ${bucket(1, 1)} ${bucket(2, 2)} ${bucket(3, 99)}`)
}
console.log()

// real road decisions: path = start > skirmish (forced) > LANDMARK > gate1 > ACT-2 PICK > ...
function pickTable(label: string, idx: number, filter?: (r: Run) => boolean) {
  console.log(`══ PATH — ${label} ${'═'.repeat(Math.max(0, 88 - label.length))}`)
  const groups = new Map<string, Run[]>()
  for (const r of runs) {
    if (filter && !filter(r)) continue
    const f = r.path[idx]
    if (!f) continue
    if (!groups.has(f)) groups.set(f, [])
    groups.get(f)!.push(r)
  }
  for (const [k, rs] of [...groups.entries()].sort((a, b) => avg(b[1].map(r => r.gates)) - avg(a[1].map(r => r.gates))))
    console.log(`  ${k.padEnd(10)} n=${String(rs.length).padStart(5)}  gates ${avg(rs.map(r => r.gates)).toFixed(2)}  won ${pct(rs.filter(r => r.won).length, rs.length)}`)
  console.log()
}
pickTable('layer-2 landmark pick vs outcome', 2)
// act-2 first pick — condition on having cleared gate 1 so survivorship doesn't pollute it
pickTable('first act-2 pick vs outcome (gate-1 clearers only)', 4, r => r.gates >= 1)

// where runs die
console.log(`══ LOSSES by node kind ${'═'.repeat(74)}`)
const losses = new Map<string, number>()
for (const r of runs.filter(r => !r.won && r.lossNodeKind)) losses.set(r.lossNodeKind, (losses.get(r.lossNodeKind) ?? 0) + 1)
for (const [k, n] of [...losses.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(10)} ${String(n).padStart(5)}  (${pct(n, runs.filter(r => !r.won).length)} of losses)`)
console.log()

// items: presence vs progress (observational — confirm causally with --grant)
console.log(`══ ITEMS — avg gates with vs without (min 80 runs holding it) ${'═'.repeat(35)}`)
const itemRuns = new Map<string, Run[]>()
for (const r of runs) for (const it of new Set(r.items)) {
  if (!itemRuns.has(it)) itemRuns.set(it, [])
  itemRuns.get(it)!.push(r)
}
const overallGates = avg(runs.map(r => r.gates))
const itemRows = [...itemRuns.entries()].filter(([, rs]) => rs.length >= 80)
  .map(([it, rs]) => ({ it, n: rs.length, g: avg(rs.map(r => r.gates)), w: rs.filter(r => r.won).length / rs.length }))
  .sort((a, b) => b.g - a.g)
for (const { it, n, g, w } of itemRows)
  console.log(`  ${it.padEnd(22)} n=${String(n).padStart(5)}  gates ${g.toFixed(2)} (${(g - overallGates >= 0 ? '+' : '')}${(g - overallGates).toFixed(2)} vs avg)  won ${(100 * w).toFixed(1)}%`)
console.log()

// jester usage vs progress
console.log(`══ JESTER (solo home rule: immunity off + hand reset) ${'═'.repeat(43)}`)
for (const j of [0, 1, 2]) {
  const rs = runs.filter(r => (j < 2 ? r.jesters === j : r.jesters >= 2))
  if (!rs.length) continue
  console.log(`  played ${j === 2 ? '2+' : j}  n=${String(rs.length).padStart(5)}  gates ${avg(rs.map(r => r.gates)).toFixed(2)}  won ${pct(rs.filter(r => r.won).length, rs.length)}`)
}

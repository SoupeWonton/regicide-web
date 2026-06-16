// Throwaway analysis of a sim run dir: per-class patterns for the 4 main classes.
// Usage: npx tsx scripts/_analyze.ts <sim-dir>
import fs from 'fs'
import path from 'path'

const dir = process.argv[2]!
const parse = (file: string) => {
  const text = fs.readFileSync(path.join(dir, file), 'utf-8').trim()
  const [head, ...rows] = text.split('\n')
  const cols = head!.split(',')
  return rows.map(line => {
    // naive split is safe here: no embedded commas in our fields
    const vals = line.split(',')
    const o: Record<string, string> = {}
    cols.forEach((c, i) => (o[c] = vals[i] ?? ''))
    return o
  })
}

const runs = parse('runs.csv')
const encs = parse('encounters.csv')
const classOf = (lineup: string) => lineup.split(':')[1] ?? lineup
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—')

const classes = ['sentinel', 'quartermaster', 'surgeon', 'executioner']
console.log(`\n=== PER-CLASS (n=${runs.length} runs) ===\n`)
console.log('class          runs   win%   beatCh1  reachCh2  avgChapter  exact/run  banish/run')
for (const cl of classes) {
  const rs = runs.filter(r => classOf(r.lineup!) === cl)
  if (!rs.length) continue
  const w = rs.filter(r => r.result === 'won').length
  const b1 = rs.filter(r => r.beatCh1 === '1').length
  const b2 = rs.filter(r => r.reachedBoss2 === '1').length
  const ch = rs.reduce((t, r) => t + +r.chapterReached!, 0) / rs.length
  const ex = rs.reduce((t, r) => t + +r.exactKills!, 0) / rs.length
  const ban = rs.reduce((t, r) => t + +r.royalsBanished!, 0) / rs.length
  console.log(`${cl.padEnd(14)} ${String(rs.length).padStart(4)}  ${pct(w, rs.length).padStart(6)}  ${pct(b1, rs.length).padStart(7)}  ${pct(b2, rs.length).padStart(8)}  ${ch.toFixed(2).padStart(9)}  ${ex.toFixed(1).padStart(8)}  ${ban.toFixed(1).padStart(9)}`)
}

// where do runs die
console.log('\n=== WHERE RUNS DIE (lossNodeKind + chapter) ===')
const loss: Record<string, number> = {}
for (const r of runs.filter(r => r.result === 'lost'))
  loss[`${r.lossNodeKind} ch${r.chapterReached}`] = (loss[`${r.lossNodeKind} ch${r.chapterReached}`] ?? 0) + 1
for (const [k, n] of Object.entries(loss).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}× ${k}`)

// deck size + recruited royals entering each boss, by chapter
console.log('\n=== DECK SIZE entering bosses (by chapter) ===')
for (const ch of [1, 2, 3]) {
  const es = encs.filter(e => e.tier === 'boss' && +e.chapter! === ch)
  if (!es.length) continue
  const dk = es.reduce((t, e) => t + +e.deckSize!, 0) / es.length
  const won = es.filter(e => e.outcome === 'won').length
  console.log(`  ch${ch} boss: ${es.length} fights, avg deck ${dk.toFixed(1)}, won ${pct(won, es.length)}`)
}

// encounter outcomes by node kind (ascending: recruit + boss dominate C1)
console.log('\n=== ENCOUNTER OUTCOMES by nodeKind (ch1) ===')
const byKind: Record<string, { n: number; won: number; wiped: number; deck: number }> = {}
for (const e of encs.filter(e => +e.chapter! === 1)) {
  const m = (byKind[e.nodeKind!] ??= { n: 0, won: 0, wiped: 0, deck: 0 })
  m.n++; m.deck += +e.deckSize!
  if (e.outcome === 'won') m.won++
  if (e.outcome === 'wiped') m.wiped++
}
for (const [k, m] of Object.entries(byKind).sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${k.padEnd(9)} ${String(m.n).padStart(4)} fights — won ${pct(m.won, m.n).padStart(6)}, wiped ${m.wiped}, avg deck ${(m.deck / m.n).toFixed(1)}`)

// top relics/spells held, with win correlation, per class
console.log('\n=== TOP ITEMS held (relics r-*, spells s-*) by win-rate, min 8 ===')
const items: Record<string, { n: number; w: number }> = {}
for (const r of runs)
  for (const id of (r.itemsList ?? '').split('|').filter(Boolean)) {
    const m = (items[id] ??= { n: 0, w: 0 })
    m.n++; if (r.result === 'won') m.w++
  }
for (const [id, m] of Object.entries(items).filter(([, m]) => m.n >= 8).sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${id.padEnd(20)} held in ${String(m.n).padStart(4)} runs — win ${pct(m.w, m.n)}`)

// best + typical-low candidates (for trace curation)
console.log('\n=== TRACE CANDIDATES ===')
for (const cl of classes) {
  const rs = runs.filter(r => classOf(r.lineup!) === cl)
  if (!rs.length) continue
  const sorted = [...rs].sort((a, b) =>
    (+b.chapterReached! - +a.chapterReached!) || (+b.exactKills! - +a.exactKills!))
  const best = sorted[0]!, median = sorted[Math.floor(sorted.length / 2)]!
  console.log(`  ${cl.padEnd(13)} BEST seed=${best.seed} (ch${best.chapterReached}, ${best.result}, exact ${best.exactKills})  | MEDIAN seed=${median.seed} (ch${median.chapterReached}, ${median.result})`)
}
// global best + a typical low (died ch1)
const gBest = [...runs].sort((a, b) => (+b.chapterReached! - +a.chapterReached!) || (+b.exactKills! - +a.exactKills!))[0]!
const lows = runs.filter(r => r.result === 'lost' && r.beatCh1 === '0')
const typicalLow = lows.sort((a, b) => +a.exactKills! - +b.exactKills!)[Math.floor(lows.length / 2)]
console.log(`\n  GLOBAL BEST: seed=${gBest.seed} class=${classOf(gBest.lineup!)} ch${gBest.chapterReached} ${gBest.result} exact=${gBest.exactKills} items=${gBest.itemsList}`)
if (typicalLow) console.log(`  TYPICAL LOW: seed=${typicalLow.seed} class=${classOf(typicalLow.lineup!)} ch${typicalLow.chapterReached} ${typicalLow.result} exact=${typicalLow.exactKills} (died at ${typicalLow.lossNodeKind})`)

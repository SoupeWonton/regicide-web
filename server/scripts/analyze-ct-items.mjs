// Item dose-response among ch1-boss losers: their run item total ≈ items held at
// boss entry (no post-boss pickups), so this avoids the winners-gain-more-items confound.
import { readFileSync } from 'fs'
import { join } from 'path'

const dir = process.argv[2] ?? join(import.meta.dirname, '..', '..', 'sim-results', '2026-06-10T22-54-16')
const parse = f => {
  const L = readFileSync(join(dir, f), 'utf8').trim().split(/\r?\n/)
  const h = L[0].split(',')
  return L.slice(1).map(l => { const c = l.split(','); const r = {}; h.forEach((k, i) => (r[k] = c[i])); return r })
}
const runs = parse('runs.csv'), encs = parse('encounters.csv')

const losers = new Map(runs.filter(r => r.lossNodeKind === 'boss' && r.chapterReached === '1').map(r => [r.runId, +r.itemsGained]))
const best = new Map()
for (const e of encs) {
  if (e.tier !== 'boss' || e.chapter !== '1' || !losers.has(e.runId)) continue
  best.set(e.runId, Math.max(best.get(e.runId) ?? 0, +e.defeated))
}

const bucketOf = n => (n <= 2 ? '0-2' : n <= 4 ? '3-4' : n <= 6 ? '5-6' : '7+')
const buckets = {}
for (const [rid, items] of losers) {
  if (!best.has(rid)) continue
  const k = bucketOf(items)
  buckets[k] ??= { n: 0, sum: 0, deep: 0 }
  buckets[k].n++
  buckets[k].sum += best.get(rid)
  if (best.get(rid) >= 9) buckets[k].deep++ // reached the Kings (enemies 9-12)
}
console.log('Items at boss entry (ch1-boss losers only) vs best castle progress (of 12 enemies):')
for (const k of ['0-2', '3-4', '5-6', '7+']) {
  const b = buckets[k]
  if (!b) continue
  console.log(`  ${k} items: avg defeated ${(b.sum / b.n).toFixed(2)}   reached-Kings ${((100 * b.deep) / b.n).toFixed(1)}%   (n=${b.n})`)
}

console.log('\nSame, by player count (items scale with party size):')
for (const pc of ['1', '2', '3', '4']) {
  const ids = new Set(runs.filter(r => r.playerCount === pc).map(r => r.runId))
  const bk = {}
  for (const [rid, items] of losers) {
    if (!ids.has(rid) || !best.has(rid)) continue
    const k = bucketOf(items)
    bk[k] ??= { n: 0, sum: 0 }
    bk[k].n++
    bk[k].sum += best.get(rid)
  }
  const line = ['0-2', '3-4', '5-6', '7+']
    .filter(k => bk[k] && bk[k].n >= 10)
    .map(k => `${k}: ${(bk[k].sum / bk[k].n).toFixed(2)} (n=${bk[k].n})`)
    .join('   ')
  console.log(`  ${pc}p avg defeated by items — ${line}`)
}

// Winner item counts at fixed player count for the boss-entry comparison ceiling
const winners = runs.filter(r => r.beatCh1 === '1')
console.log(`\nFor reference: ${winners.length} runs beat ch1; ${losers.size} fell at the ch1 boss.`)

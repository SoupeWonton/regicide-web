// One-off analysis: does the CT model's assigned pressure/tolerance match sim outcomes?
// Usage: node scripts/analyze-ct.mjs [path-to-sim-results-dir]
import { readFileSync } from 'fs'
import { join } from 'path'

const dir = process.argv[2] ?? join(import.meta.dirname, '..', '..', 'sim-results', '2026-06-10T22-54-16')

function parseCsv(file) {
  const lines = readFileSync(join(dir, file), 'utf8').trim().split(/\r?\n/)
  const head = lines[0].split(',')
  return lines.slice(1).map(l => {
    // naive split is fine: no quoted commas except deathsByPersona (last col, semicolon-free check)
    const cells = l.split(',')
    const row = {}
    head.forEach((h, i) => (row[h] = cells[i]))
    return row
  })
}

const runs = parseCsv('runs.csv')
const encs = parseCsv('encounters.csv')

// ── 1. Modifier pressure CT vs observed difficulty ──────────────────────────
const PRESSURE = {
  'cracked-buckler': 0.25, 'bleeder-patrol': 0.25, 'dry-cart': 0.25,
  'wrong-relay': 0.25, 'fog-marker': 0.25, 'hooked-blades': 0.25,
  'shieldbreaker-line': 0.5, 'rot-ward': 0.5, 'starved-caravan': 0.5,
  'command-fracture': 0.5, 'iron-rain-file': 0.5,
  'blackwall-captain': 0.75, 'pale-bell-matron': 0.75, 'banner-of-knives': 0.75,
  'garrison-crusher': 1.0,
}

const byMod = {}
for (const e of encs) {
  const m = e.modifier
  if (!m || !(m in PRESSURE)) continue
  byMod[m] ??= { fights: 0, won: 0, retreated: 0, wiped: 0, deaths: 0, turns: 0 }
  const b = byMod[m]
  b.fights++
  b.deaths += +e.deaths
  b.turns += +e.turns
  if (e.outcome === 'won') b.won++
  else if (e.outcome === 'retreated') b.retreated++
  else b.wiped++
}

console.log('── Modifier: assigned pressure CT vs observed ──')
console.log('modifier              CT    fights  win%   retreat%  wipe%  deaths/fight')
const rows = Object.entries(byMod).sort((a, b) => PRESSURE[a[0]] - PRESSURE[b[0]] || (a[1].won / a[1].fights) - (b[1].won / b[1].fights))
for (const [m, b] of rows) {
  console.log(
    m.padEnd(22) + String(PRESSURE[m]).padEnd(6) + String(b.fights).padEnd(8) +
    ((100 * b.won) / b.fights).toFixed(1).padStart(5) + '  ' +
    ((100 * b.retreated) / b.fights).toFixed(1).padStart(7) + '  ' +
    ((100 * b.wiped) / b.fights).toFixed(1).padStart(5) + '  ' +
    (b.deaths / b.fights).toFixed(3).padStart(8)
  )
}

// Spearman rank correlation: pressure vs (1 - win rate)
function spearman(pairs) {
  const rank = arr => {
    const sorted = [...arr].map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
    const r = Array(arr.length)
    let i = 0
    while (i < sorted.length) {
      let j = i
      while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++
      const avg = (i + j) / 2 + 1
      for (let k = i; k <= j; k++) r[sorted[k][1]] = avg
      i = j + 1
    }
    return r
  }
  const xs = rank(pairs.map(p => p[0]))
  const ys = rank(pairs.map(p => p[1]))
  const n = pairs.length
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n
  let num = 0, dx = 0, dy = 0
  for (let k = 0; k < n; k++) {
    num += (xs[k] - mx) * (ys[k] - my)
    dx += (xs[k] - mx) ** 2
    dy += (ys[k] - my) ** 2
  }
  return num / Math.sqrt(dx * dy)
}
const pairs = Object.entries(byMod).map(([m, b]) => [PRESSURE[m], 1 - b.won / b.fights])
console.log(`\nSpearman(assigned CT, loss rate) across ${pairs.length} modifiers: ${spearman(pairs).toFixed(3)}`)

// Implied CT: linear fit of loss-rate -> CT using tier means, then place each modifier
const tierMean = {}
for (const [m, b] of Object.entries(byMod)) {
  const t = PRESSURE[m]
  tierMean[t] ??= { loss: 0, n: 0 }
  tierMean[t].loss += 1 - b.won / b.fights
  tierMean[t].n++
}
console.log('\ntier-CT  mean observed loss rate')
for (const [ct, v] of Object.entries(tierMean).sort((a, b) => +a[0] - +b[0]))
  console.log(`  ${ct}     ${(100 * v.loss / v.n).toFixed(1)}%`)

// ── 2. Item tolerance CT vs boss success ────────────────────────────────────
// Among runs that reached boss 1, does itemsGained predict beating chapter 1?
console.log('\n── Items gained vs beating Ch1 boss (runs that reached boss 1) ──')
for (const pc of ['1', '2', '3', '4', 'all']) {
  const pool = runs.filter(r => r.reachedBoss1 === '1' && (pc === 'all' || r.playerCount === pc))
  if (!pool.length) continue
  const buckets = {}
  for (const r of pool) {
    const g = Math.min(+r.itemsGained, 9)
    const k = g <= 2 ? '0-2' : g <= 4 ? '3-4' : g <= 6 ? '5-6' : '7+'
    buckets[k] ??= { n: 0, beat: 0 }
    buckets[k].n++
    if (r.beatCh1 === '1') buckets[k].beat++
  }
  const line = ['0-2', '3-4', '5-6', '7+']
    .filter(k => buckets[k])
    .map(k => `${k} items: ${((100 * buckets[k].beat) / buckets[k].n).toFixed(1)}% (n=${buckets[k].n})`)
    .join('   ')
  console.log(`${pc === 'all' ? 'ALL' : pc + 'p'}: ${line}`)
}

// Same but continuous: mean itemsGained for boss-beaters vs boss-losers (controls tier reached)
const reached = runs.filter(r => r.reachedBoss1 === '1')
const beat = reached.filter(r => r.beatCh1 === '1')
const lost = reached.filter(r => r.beatCh1 !== '1')
const mean = a => a.reduce((t, r) => t + +r.itemsGained, 0) / a.length
console.log(`\nMean items gained — beat Ch1: ${mean(beat).toFixed(2)} (n=${beat.length})  vs  fell at boss: ${mean(lost).toFixed(2)} (n=${lost.length})`)

// Boss fight stats by attempt (was it close?)
const bossFights = encs.filter(e => e.tier === 'boss' && e.chapter === '1')
const defeatedDist = {}
for (const f of bossFights) {
  const k = `${f.defeated}/${f.totalEnemies}`
  defeatedDist[k] = (defeatedDist[k] ?? 0) + 1
}
console.log('\nCh1 boss fights — castle enemies defeated before wipe/win:')
for (const [k, n] of Object.entries(defeatedDist).sort((a, b) => b[1] - a[1]))
  console.log(`  ${k}: ${n} fights (${((100 * n) / bossFights.length).toFixed(1)}%)`)

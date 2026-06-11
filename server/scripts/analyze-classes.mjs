// Class leave-one-out analysis: same persona on every seat, forced class lineups,
// same seeds. The funnel gap when a class is missing = that class's marginal value.
// Usage: node scripts/analyze-classes.mjs <simDir> [<simDir2> ...]
import { readFileSync } from 'fs'
import { join } from 'path'

const SHORT = { sentinel: 'Sent', quartermaster: 'Qmas', surgeon: 'Surg', executioner: 'Exec' }
const QUARTET = 'sentinel+quartermaster+surgeon+executioner'

for (const dir of process.argv.slice(2)) {
  const L = readFileSync(join(dir, 'runs.csv'), 'utf8').trim().split(/\r?\n/)
  const h = L[0].split(',')
  const runs = L.slice(1).map(l => { const c = l.split(','); const r = {}; h.forEach((k, i) => (r[k] = c[i])); return r })

  console.log(`\n═══ ${dir.split(/[\\/]/).pop()} — persona ${runs[0].personas.split('+')[0]} ═══`)
  console.log('lineup                missing   reachBoss1  beatCh1  reachBoss2  won   deaths/run')
  const lineups = [...new Set(runs.map(r => r.lineup))]
  for (const lu of lineups) {
    const rs = runs.filter(r => r.lineup === lu)
    const missing = lu === QUARTET ? '—' : ['sentinel', 'quartermaster', 'surgeon', 'executioner'].find(c => !lu.includes(c))
    const p = k => ((100 * rs.filter(r => r[k] === '1').length) / rs.length).toFixed(0) + '%'
    const won = ((100 * rs.filter(r => r.result === 'won').length) / rs.length).toFixed(0) + '%'
    const dpr = (rs.reduce((t, r) => t + +r.heroDeaths, 0) / rs.length).toFixed(2)
    const label = lu.split('+').map(c => SHORT[c] ?? c).join('+')
    console.log(
      label.padEnd(22) + String(SHORT[missing] ?? missing).padEnd(10) +
      p('reachedBoss1').padStart(6) + '   ' + p('beatCh1').padStart(8) + '  ' +
      p('reachedBoss2').padStart(8) + '  ' + won.padStart(5) + '  ' + dpr.padStart(7)
    )
  }

  // deaths by class across all lineups (class at time of death; normalized by seats fielded)
  const deaths = {}, seats = {}
  for (const r of runs) {
    for (const c of r.classes.split('+')) seats[c] = (seats[c] ?? 0) + 1
    for (const part of (r.deathsByClass || '').split('|').filter(Boolean)) {
      const [cls, n] = part.split(':')
      deaths[cls] = (deaths[cls] ?? 0) + +n
    }
  }
  console.log('deaths per seat fielded:')
  for (const [c, n] of Object.entries(deaths).sort((a, b) => b[1] / (seats[b[0]] ?? 1) - a[1] / (seats[a[0]] ?? 1))) {
    const s = seats[c]
    console.log(`  ${(SHORT[c] ?? c).padEnd(14)} ${n} deaths / ${s ?? 0} seats${s ? ' = ' + (n / s).toFixed(2) : ' (replacements only)'}`)
  }
}

// Province funnel: where do runs end? Road stops vs the three rank gates.
// Rank index = order of boss fights within the run (1st = Gates, 2nd = Courtyard, 3rd = Throne).
// Usage: node scripts/analyze-province.mjs <simDir> [...]
import { readFileSync } from 'fs'
import { join } from 'path'

for (const dir of process.argv.slice(2)) {
  const parse = f => {
    const L = readFileSync(join(dir, f), 'utf8').trim().split(/\r?\n/)
    const h = L[0].split(',')
    return L.slice(1).map(l => { const c = l.split(','); const r = {}; h.forEach((k, i) => (r[k] = c[i])); return r })
  }
  const runs = parse('runs.csv'), encs = parse('encounters.csv')

  // boss fights per run in chronological order → rank index
  const bossFightsByRun = new Map()
  for (const e of encs) {
    if (e.tier !== 'boss') continue
    if (!bossFightsByRun.has(e.runId)) bossFightsByRun.set(e.runId, [])
    bossFightsByRun.get(e.runId).push(e)
  }

  console.log(`\n═══ ${dir.split(/[\\/]/).pop()} — persona ${runs[0].personas.split('+')[0]} ═══`)
  console.log('lineup           runs   won    road-death  Gates  Courtyard  Throne  stalled  fights/run')
  for (const lu of [...new Set(runs.map(r => r.lineup))]) {
    const rs = runs.filter(r => r.lineup === lu)
    const won = rs.filter(r => r.result === 'won').length
    const stalled = rs.filter(r => r.result !== 'won' && r.result !== 'lost').length
    let road = 0, gates = 0, courtyard = 0, throne = 0
    for (const r of rs.filter(rr => rr.result === 'lost')) {
      if (r.lossNodeKind !== 'boss') { road++; continue }
      // no retreat at gates + death ends the run → each gate appears once;
      // the count of boss rows is the rank reached (1 Gates, 2 Courtyard, 3 Throne)
      const ranksFought = (bossFightsByRun.get(r.runId) ?? []).length
      if (ranksFought <= 1) gates++
      else if (ranksFought === 2) courtyard++
      else throne++
    }
    const fpr = (rs.reduce((t, r) => t + +r.encountersFought, 0) / rs.length).toFixed(1)
    const pc = n => ((100 * n) / rs.length).toFixed(0).padStart(4) + '%'
    console.log(lu.padEnd(17) + String(rs.length).padEnd(7) + pc(won) + '  ' + pc(road).padStart(9) + '  ' +
      pc(gates) + '  ' + pc(courtyard).padStart(8) + '  ' + pc(throne) + '  ' + pc(stalled).padStart(6) + '  ' + fpr.padStart(8))
  }
}

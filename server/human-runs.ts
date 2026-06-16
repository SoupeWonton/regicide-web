import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Human-run telemetry sink. Every finished human game — campaign/province or
// quick game — appends one CSV row here so human play can be laid against the
// bot-floor sims (scripts/sim.ts, scripts/sim-base.ts, analyze-province.ts).
//
//   data/human-runs/runs.csv   campaign runs (same columns as sim runs.csv,
//                              so analyze-province.ts can pool it directly:
//                              npx tsx scripts/analyze-province.ts ../human-runs)
//   data/human-runs/quick.csv  base quick games
//
// data/ is gitignored; telemetry must never break the game — every write is
// wrapped, and a failed append is silently dropped.

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(HERE, 'data', 'human-runs')

const esc = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function appendHumanRun(file: 'runs' | 'quick', row: Record<string, unknown>) {
  try {
    fs.mkdirSync(DIR, { recursive: true })
    const target = path.join(DIR, `${file}.csv`)
    const cols = Object.keys(row)
    if (!fs.existsSync(target)) fs.writeFileSync(target, cols.join(',') + '\n')
    fs.appendFileSync(target, cols.map(k => esc(row[k])).join(',') + '\n')
  } catch { /* telemetry never breaks the game */ }
}

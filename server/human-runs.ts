import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dbEnabled, insertRun } from './db'

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
//
// PROD persistence: Render's disk is ephemeral, so when DATABASE_URL is set we
// ALSO write each run to Postgres (see db.ts). The DB insert is fire-and-forget;
// the CSV append above always runs as the local/dev source of truth.

const HERE = path.dirname(fileURLToPath(import.meta.url))
// honor REGICIDE_DATA_DIR (like store.ts) so prod writes land on the persistent
// disk, not the ephemeral default — must match the dir the /data endpoint serves
const DIR = path.join(process.env.REGICIDE_DATA_DIR || path.join(HERE, 'data'), 'human-runs')

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
  // also persist to Postgres in prod (no-op without DATABASE_URL); fire-and-forget
  if (dbEnabled()) insertRun(file, row).catch(() => { /* logged in db.ts; CSV stands */ })
}

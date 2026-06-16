import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Reorganize sim output from flat timestamped dirs into date/attempt structure:
// server/data/sim/2026-06-12T17-06-51/ → server/data/sim/2026-06-12/attempt-1-steady-2p/
//
// Run: npx tsx scripts/organize-sims.ts
// Backup is created before any moves: server/data/sim.backup-YYYYMMDD-HHMMSS/

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SIM_DIR = path.join(HERE, '..', 'data', 'sim')

interface RunInfo {
  lineup: string
  playerCount: number
  result: string
}

function parseRunsCsv(filePath: string): RunInfo[] {
  const csv = fs.readFileSync(filePath, 'utf-8')
  const lines = csv.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const header = lines[0]!.split(',')
  const lineupIdx = header.indexOf('lineup')
  const countIdx = header.indexOf('playerCount')
  const resultIdx = header.indexOf('result')

  const runs: RunInfo[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const lineup = cols[lineupIdx]?.trim() || 'unknown'
    const count = parseInt(cols[countIdx] || '0')
    const result = cols[resultIdx]?.trim() || 'unknown'
    runs.push({ lineup, playerCount: count, result })
  }
  return runs
}

function summarizeRuns(runs: RunInfo[]): string {
  if (runs.length === 0) return 'empty'
  const lineups = [...new Set(runs.map(r => r.lineup))]
  const counts = [...new Set(runs.map(r => r.playerCount))].sort()

  // Abbreviated names for common lineups
  const abbrev: Record<string, string> = {
    'mixed': 'mx', 'steady': 'st', 'slayer': 'sl', 'bulwark': 'bw', 'hoarder': 'hd',
    'sniper': 'sn', 'precision': 'pr',
  }

  // For class combos, replace colons and truncate
  const short = lineups.map(l => {
    const clean = l.replace(/:/g, '').replace(/[^a-z0-9]/gi, '')
    return abbrev[l] || clean.slice(0, 6)
  }).join('-')

  const countStr = counts.join('p-') + 'p'
  const name = `${short}-${countStr}`

  // Truncate if still too long (Windows 260 char path limit)
  return name.length > 80 ? `lineup-${counts.join('p-')}p` : name
}

function getDateFromTimestamp(dir: string): string {
  // Extract YYYY-MM-DD from dir name like "2026-06-12T17-06-51"
  const match = dir.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1]! : ''
}

try {
  if (!fs.existsSync(SIM_DIR)) {
    console.log(`SIM_DIR not found: ${SIM_DIR}`)
    process.exit(0)
  }

  // Backup original
  const now = new Date()
  const backupName = `sim.backup-${now.toISOString().replace(/[:.]/g, '').slice(0, 15)}`
  const backupPath = path.join(SIM_DIR, '..', backupName)
  console.log(`📦 Backing up to ${backupName}...`)
  fs.cpSync(SIM_DIR, backupPath, { recursive: true })
  console.log(`   Backup complete`)

  // Scan timestamped dirs
  const entries = fs.readdirSync(SIM_DIR)
  const timestampDirs = entries.filter(e => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(e))

  if (timestampDirs.length === 0) {
    console.log('No timestamped sim directories found')
    process.exit(0)
  }

  console.log(`\n Found ${timestampDirs.length} sim run(s) to reorganize\n`)

  // Group by date
  const byDate = new Map<string, string[]>()
  for (const dir of timestampDirs) {
    const date = getDateFromTimestamp(dir)
    if (!date) continue
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(dir)
  }

  let moved = 0

  // For each date, create attempt dirs
  for (const [date, dirs] of byDate) {
    const dateDir = path.join(SIM_DIR, date)
    if (!fs.existsSync(dateDir)) fs.mkdirSync(dateDir, { recursive: true })

    // Sort by timestamp so we number attempts in order, continuing from the
    // highest attempt number already present in the date folder
    const sorted = dirs.sort()
    let nextAttempt = 1 + Math.max(0, ...fs.readdirSync(dateDir)
      .map(e => parseInt(e.match(/^attempt-(\d+)-/)?.[1] ?? '0')))

    for (let i = 0; i < sorted.length; i++) {
      const timestampDir = sorted[i]!
      const srcPath = path.join(SIM_DIR, timestampDir)
      const runsFile = path.join(srcPath, 'runs.csv')

      if (!fs.existsSync(runsFile)) {
        console.log(`⚠ No runs.csv in ${timestampDir}, skipping`)
        continue
      }

      const runs = parseRunsCsv(runsFile)
      const summary = summarizeRuns(runs)
      const attemptNum = nextAttempt++
      const attemptDir = `attempt-${attemptNum}-${summary}`
      const destPath = path.join(dateDir, attemptDir)

      // Avoid collision
      if (fs.existsSync(destPath)) {
        console.log(`⚠ ${destPath} exists, skipping`)
        continue
      }

      fs.renameSync(srcPath, destPath)
      console.log(`✓ attempt-${attemptNum}  ${summary}`)
      console.log(`  └─ ${runs.length} runs, ${runs.filter(r => r.result === 'won').length} won`)
      moved++
    }
  }

  // Clean up: delete the old timestamped dirs if any (after reorganization)
  const remaining = fs.readdirSync(SIM_DIR)
    .filter(e => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(e))
  if (remaining.length > 0) {
    console.log(`\n⚠ ${remaining.length} timestamp dir(s) still present (likely have errors):`)
    remaining.forEach(d => console.log(`  - ${d}`))
  }

  console.log(`\n✅ Reorganized ${moved} sim run(s)`)
  console.log(`📁 Structure: server/data/sim/YYYY-MM-DD/attempt-N-lineup-info/`)
} catch (err) {
  console.error('❌ Error:', (err as Error).message)
  process.exit(1)
}

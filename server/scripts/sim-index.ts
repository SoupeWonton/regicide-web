import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Generate an index of all organized sim runs by date and attempt.
// Run: npx tsx scripts/sim-index.ts
// Output: server/data/sim/INDEX.md

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SIM_DIR = path.join(HERE, '..', 'data', 'sim')

interface AttemptInfo {
  name: string
  runs: number
  won: number
  winRate: number
  chapters: number[]
}

function getAttemptInfo(dir: string): AttemptInfo | null {
  const runsFile = path.join(dir, 'runs.csv')
  if (!fs.existsSync(runsFile)) return null

  const csv = fs.readFileSync(runsFile, 'utf-8')
  const lines = csv.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const header = lines[0]!.split(',')
  const resultIdx = header.indexOf('result')
  const chapIdx = header.indexOf('chapterReached')

  let won = 0
  const chapters = new Set<number>()

  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const result = cols[resultIdx]?.trim()
    const chap = parseInt(cols[chapIdx] || '1')

    if (result === 'won') won++
    chapters.add(chap)
  }

  const runs = Math.max(1, lines.length - 1)
  const winRate = (100 * won) / runs

  return {
    name: path.basename(dir),
    runs,
    won,
    winRate,
    chapters: [...chapters].sort((a, b) => b - a),
  }
}

try {
  if (!fs.existsSync(SIM_DIR)) {
    console.log('No sim data found')
    process.exit(0)
  }

  const dates = fs.readdirSync(SIM_DIR)
    .filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e))
    .sort()
    .reverse()

  let index = '# Simulation Run Index\n\n'
  let totalRuns = 0
  let totalWins = 0

  for (const date of dates) {
    const dateDir = path.join(SIM_DIR, date)
    const attempts = fs.readdirSync(dateDir)
      .filter(e => e.startsWith('attempt-'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)![0]!)
        const bNum = parseInt(b.match(/\d+/)![0]!)
        return aNum - bNum
      })

    if (attempts.length === 0) continue

    index += `\n## ${date}\n\n`
    index += '| Attempt | Lineup | Runs | Won | Rate |\n'
    index += '|---------|--------|------|-----|------|\n'

    for (const attemptDir of attempts) {
      const info = getAttemptInfo(path.join(dateDir, attemptDir))
      if (!info) continue

      totalRuns += info.runs
      totalWins += info.won

      // Extract lineup from dir name (attempt-1-steady-1p → steady-1p)
      const lineup = info.name.replace(/^attempt-\d+-/, '')
      const rate = info.winRate.toFixed(1)
      index += `| [${info.name.split('-')[0]}](${date}/${info.name}) | ${lineup} | ${info.runs} | ${info.won} | ${rate}% |\n`
    }
  }

  index += `\n---\n**Total:** ${totalRuns} runs, ${totalWins} won (${((100 * totalWins) / totalRuns).toFixed(1)}%)\n`

  fs.writeFileSync(path.join(SIM_DIR, 'INDEX.md'), index)
  console.log(`✅ Generated INDEX.md (${dates.length} date(s), ${totalRuns} total runs)`)
} catch (err) {
  console.error('Error:', (err as Error).message)
  process.exit(1)
}

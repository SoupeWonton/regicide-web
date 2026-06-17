// Parallel sim runner. Full campaigns are independent — the persona is fixed and
// nothing learns between runs — so a big --seeds batch is embarrassingly parallel.
// This shards the batch across N worker processes, each running scripts/sim.ts
// over a disjoint seed range in an isolated REGICIDE_DATA_DIR, then merges the
// per-shard runs.csv and prints combined chapter-progress totals.
//
//   npx tsx scripts/sim-par.ts --workers 12 --seeds 1000 --persona gg --classes sentinel
//
// All flags except --workers/--seeds/--seed-start are forwarded verbatim to sim.ts.
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const get = (flag: string, dflt: string) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1]! : dflt
}

const total = parseInt(get('--seeds', '100'))
const workers = Math.max(1, Math.min(total, parseInt(get('--workers', String(Math.max(1, os.cpus().length - 2))))))

// forward everything except the flags we set per shard (each takes one value)
const drop = new Set(['--workers', '--seeds', '--seed-start'])
const passthrough: string[] = []
for (let i = 0; i < args.length; i++) {
  if (drop.has(args[i]!)) { i++; continue }
  passthrough.push(args[i]!)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const ROOT = path.join(os.tmpdir(), 'regicide-simpar', stamp)
fs.mkdirSync(ROOT, { recursive: true })

// split `total` across workers, spreading the remainder over the first shards
const base = Math.floor(total / workers)
const rem = total % workers
let offset = 0
const plan = Array.from({ length: workers }, (_, k) => base + (k < rem ? 1 : 0))
  .filter(size => size > 0)
  .map(size => { const start = offset; offset += size; return { size, start } })

console.log(`Parallel sim: ${total} runs across ${plan.length} workers (≈${plan[0]!.size}/worker)`)
console.log(`forwarding: ${passthrough.join(' ')}`)

function runShard(idx: number, size: number, start: number): Promise<{ dataDir: string; code: number | null }> {
  return new Promise(resolve => {
    const dataDir = path.join(ROOT, `shard${idx}`)
    fs.mkdirSync(dataDir, { recursive: true })
    const child = spawn(
      'npx',
      ['tsx', path.join(HERE, 'sim.ts'), ...passthrough, '--seeds', String(size), '--seed-start', String(start)],
      { cwd: path.join(HERE, '..'), env: { ...process.env, REGICIDE_DATA_DIR: dataDir }, shell: process.platform === 'win32' },
    )
    let err = ''
    child.stdout.on('data', () => { /* discard the noisy per-run [CT] logs */ })
    child.stderr.on('data', d => { err += d })
    child.on('close', code => {
      if (code !== 0) console.error(`  shard ${idx} exited ${code}: ${err.slice(-400)}`)
      resolve({ dataDir, code })
    })
  })
}

const t0 = Date.now()
const results = await Promise.all(plan.map((p, i) => runShard(i, p.size, p.start)))

// merge every shard's runs.csv (each lives at <shard>/sim/<childStamp>/runs.csv)
let header = ''
const rows: string[] = []
for (const r of results) {
  const simDir = path.join(r.dataDir, 'sim')
  if (!fs.existsSync(simDir)) continue
  for (const d of fs.readdirSync(simDir)) {
    const f = path.join(simDir, d, 'runs.csv')
    if (!fs.existsSync(f)) continue
    const lines = fs.readFileSync(f, 'utf-8').trim().split('\n')
    if (lines.length < 2) continue
    header = lines[0]!
    rows.push(...lines.slice(1))
  }
}

if (!rows.length) { console.error('No runs produced — check shard errors above.'); process.exit(1) }

// persist the merged dataset under the live data dir for later analysis
const OUT = path.join(HERE, '..', 'data', 'sim', `par-${stamp}`)
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'runs.csv'), header + '\n' + rows.join('\n') + '\n')

// tally chapter progression
const cols = header.split(',')
const ix = (name: string) => cols.indexOf(name)
const iB1 = ix('reachedBoss1'), iBeatCh1 = ix('beatCh1'), iB2 = ix('reachedBoss2'), iResult = ix('result')
const truthy = (v: string | undefined) => v === 'true' || v === '1'
let reachedB1 = 0, beatCh1 = 0, reachedB2 = 0, won = 0
for (const line of rows) {
  const c = line.split(',')
  if (truthy(c[iB1])) reachedB1++
  if (truthy(c[iBeatCh1])) beatCh1++
  if (truthy(c[iB2])) reachedB2++
  if (c[iResult] === 'won') won++
}
const n = rows.length
const pct = (a: number) => `${(100 * a / n).toFixed(1)}%`
console.log(`\n════════ ${n} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s ════════`)
console.log(`reached ch1 boss            : ${reachedB1}  (${pct(reachedB1)})`)
console.log(`reached chapter 2 (beat ch1): ${beatCh1}  (${pct(beatCh1)})`)
console.log(`reached ch2 boss            : ${reachedB2}  (${pct(reachedB2)})`)
console.log(`beat chapter 2 (won campaign): ${won}  (${pct(won)})`)
console.log(`\nmerged runs.csv → ${OUT}/runs.csv`)

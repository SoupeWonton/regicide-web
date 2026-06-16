import fs from 'fs'
import path from 'path'
const dir = process.argv[2]!
const [h, ...rows] = fs.readFileSync(path.join(dir, 'runs.csv'), 'utf8').trim().split('\n')
const cols = h!.split(',')
const R = rows.map(l => { const v = l.split(','); const o: Record<string, string> = {}; cols.forEach((c, i) => o[c] = v[i] ?? ''); return o })
const cls = (l: string) => l.split(':')[1] ?? l
for (const c of ['sentinel', 'quartermaster', 'surgeon', 'executioner']) {
  const rs = R.filter(r => cls(r.lineup!) === c)
  const clean = rs.filter(r => r.result === 'lost')
  clean.sort((a, b) => (+b.chapterReached! - +a.chapterReached!) || (+b.exactKills! - +a.exactKills!))
  console.log(`\n== ${c} == clean losses ${clean.length}/${rs.length}`)
  const deep = clean[0]!, med = clean[Math.floor(clean.length / 2)]!
  const ch1 = clean.filter(r => r.chapterReached === '1')
  console.log(`  DEEP   ${deep.seed}  ch${deep.chapterReached} exact=${deep.exactKills} gates=${deep.gatesCleared} items=${(deep.itemsList || '').split('|').filter(Boolean).length}`)
  console.log(`  MED    ${med.seed}  ch${med.chapterReached} exact=${med.exactKills}`)
  if (ch1.length) { const cm = ch1[Math.floor(ch1.length / 2)]!; console.log(`  CH1DIE ${cm.seed}  exact=${cm.exactKills} (died ${cm.lossNodeKind})`) }
}

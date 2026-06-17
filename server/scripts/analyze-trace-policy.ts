// Behavioral-cloning rule miner. Loads a human run trace (data/traces/<id>.jsonl)
// and extracts the player's decision rules, each validated against the trace, so
// they can be encoded as a sim policy (see sim-personas.ts holdJokers etc.).
//
//   npx tsx scripts/analyze-trace-policy.ts data/traces/camp-mqhh4xhn-iy7j.jsonl
//
// KEY: the trace records each line AFTER the action resolves (sessions.ts traces
// post-apply). So an action's cardIndices index into the PREVIOUS line's hand —
// that previous hand is the true decision-time state. Reading the same line's
// hand (post-refresh) is wrong; this miner uses the previous line throughout.
import fs from 'fs'

const file = process.argv[2]
if (!file) { console.error('usage: tsx scripts/analyze-trace-policy.ts <trace.jsonl>'); process.exit(1) }

const val = (r: string) => r === 'A' ? 1 : r === 'Jo' ? 0 : r === 'J' ? 10 : r === 'Q' ? 15 : r === 'K' ? 20 : (parseInt(r) || 0)
type Card = { rank: string; suit: string }
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
const header = lines[0]
const steps = lines.slice(1)
const encOf = (o: any) => (o?.view?.encounter) || {}

console.log(`trace: ${header.name} · ${header.classes?.join('+')} · seed ${header.seed} · ${steps.length} actions`)

// ── decision-time reconstruction: pre-state(i) = post-state(i-1) ──────────────
type Decision = { action: any; preHand: Card[]; preEnemy: any }
const decisions: Decision[] = []
for (let i = 0; i < steps.length; i++) {
  const pre = i === 0 ? encOf(lines[0]) : encOf(steps[i - 1])  // previous line is the decision-time state
  decisions.push({ action: steps[i].action, preHand: pre.myHand || [], preEnemy: pre.currentEnemy || null })
}

// ── Rule 1: jester discipline ─────────────────────────────────────────────────
const plays = decisions.filter(d => d.action.type === 'play_cards')
let jesterPlays = 0, jesterAllJester = 0, jesterCantBlock = 0
const comboSizes: Record<number, number> = {}
const suit: Record<string, number> = {}
for (const d of plays) {
  const idx: number[] = d.action.cardIndices || []
  const played = idx.map(j => d.preHand[j]).filter(Boolean) as Card[]
  if (!played.length) continue
  comboSizes[played.length] = (comboSizes[played.length] || 0) + 1
  for (const c of played) if (c.rank !== 'Jo') suit[c.suit] = (suit[c.suit] || 0) + 1
  if (played.some(c => c.rank === 'Jo')) {
    jesterPlays++
    const nonJoker = d.preHand.filter(c => c.rank !== 'Jo')
    const maxBlock = nonJoker.reduce((s, c) => s + val(c.rank), 0)
    if (nonJoker.length === 0) jesterAllJester++
    if (maxBlock < (d.preEnemy?.attack || 0)) jesterCantBlock++
  }
}

const pctOf = (a: number, n: number) => n ? `${(100 * a / n).toFixed(0)}%` : 'n/a'
console.log('\n── Rule: jester as last resort ──')
console.log(`  jester plays: ${jesterPlays}`)
console.log(`  …with an all-jester hand (no real card left): ${jesterAllJester}/${jesterPlays} (${pctOf(jesterAllJester, jesterPlays)})`)
console.log(`  …unable to block the incoming hit:            ${jesterCantBlock}/${jesterPlays} (${pctOf(jesterCantBlock, jesterPlays)})`)
console.log(`  → encode as holdJokers=${jesterPlays > 0 && jesterAllJester / jesterPlays >= 0.8}`)

// ── Rule 2: play size (combo discipline) ──────────────────────────────────────
const totalPlays = Object.values(comboSizes).reduce((a, b) => a + b, 0)
const cards = Object.entries(comboSizes).reduce((a, [k, v]) => a + Number(k) * v, 0)
console.log('\n── Play-size profile ──')
console.log(`  plays ${totalPlays} · cards ${cards} · avg combo ${(cards / totalPlays).toFixed(2)}`)
console.log(`  size distribution: ${JSON.stringify(comboSizes)}`)
console.log(`  → low aggression / high conserve if avg ≲ 1.4 and singles dominate`)

// ── Rule 3: suit / economy lean ───────────────────────────────────────────────
const suitTot = Object.values(suit).reduce((a, b) => a + b, 0)
console.log('\n── Suit lean (non-jester cards played) ──')
for (const s of ['C', 'D', 'H', 'S']) console.log(`  ${s}: ${suit[s] || 0} (${pctOf(suit[s] || 0, suitTot)})`)

// ── Action mix ────────────────────────────────────────────────────────────────
const mix: Record<string, number> = {}
for (const d of decisions) mix[d.action.type] = (mix[d.action.type] || 0) + 1
console.log('\n── Action mix ──')
console.log(`  ${JSON.stringify(mix)}`)
console.log(`  blocks(discard_damage): ${mix['discard_damage'] || 0} · yields: ${mix['yield_turn'] || 0} · spells: ${mix['cast_spell'] || 0} · relics: ${mix['activate_relic'] || 0}`)

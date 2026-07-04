// Diff/normalize/packet helpers for the trace replayer (replay.ts).
// Token economy is the design constraint: everything emitted here is meant to
// be READ BY AN LLM as its whole debugging context — terse, information-dense.

import type { CampaignState } from '../campaign/types'
import { cardLabel } from '../deck'

// ── view normalization ────────────────────────────────────────────────────────

/** Paths (dot notation, [] = any index) that legitimately differ between the
 * recording and a replay — regenerated ids and time-derived fields. Built
 * empirically: replay a known-clean trace and whitelist what still diffs. */
const VOLATILE_PATHS = new Set([
  'id',                       // campaign id is minted per run (Date.now + random)
])

/** Apply the same "trace diet" trace.ts applies before storing a view, so the
 * recomputed view is byte-comparable to the stored one. */
export function applyTraceDiet(view: any): any {
  if (view?.encounter) {
    view.encounter.tavernCards = []
    view.encounter.discardCards = []
    if (view.phase === 'encounter' || view.phase === 'death_vote') view.map = null
  }
  return view
}

/** Replace every occurrence of a hero's playerId (socket ids in recordings,
 * p1..pN in replays) with a stable '#h<i>' token — in string values AND record
 * keys (votes are keyed by playerId). Also canonicalizes process-global
 * counter ids (runtime Card.id `c<n>` from encounter.ts uid(), event uids
 * `evc<n>`) by first-appearance order: the counters offset between processes,
 * but a REAL difference (a swapped card) still changes the id topology and
 * diffs. Physical ids (`pc<n>`) are per-campaign deterministic — left alone. */
export function normalizeIds(node: any, heroIds: string[]): any {
  const volatile = new Map<string, string>()   // one map for the WHOLE traversal
  const sub = (s: string) => {
    const i = heroIds.indexOf(s)
    if (i >= 0) return `#h${i}`
    if (/^(c|evc)\d+$/.test(s)) {
      if (!volatile.has(s)) volatile.set(s, `#v${volatile.size}`)
      return volatile.get(s)!
    }
    return s
  }
  const walk = (n: any): any => {
    if (typeof n === 'string') return sub(n)
    if (Array.isArray(n)) return n.map(walk)
    if (n && typeof n === 'object') {
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(n)) out[sub(k)] = walk(v)
      return out
    }
    return n
  }
  return walk(node)
}

// ── deep diff ─────────────────────────────────────────────────────────────────

export interface DiffEntry { path: string; stored: unknown; replayed: unknown }

/** First-N structural differences between two normalized views. */
export function deepDiff(stored: any, replayed: any, base = '', out: DiffEntry[] = [], cap = 12): DiffEntry[] {
  if (out.length >= cap) return out
  const wild = base.replace(/\[\d+\]/g, '[]').replace(/^\./, '')
  if (VOLATILE_PATHS.has(wild)) return out
  if (stored === replayed) return out
  const to = typeof stored, tr = typeof replayed
  if (stored && replayed && to === 'object' && tr === 'object') {
    const keys = new Set([...Object.keys(stored), ...Object.keys(replayed)])
    for (const k of keys) {
      const p = Array.isArray(stored) ? `${base}[${k}]` : `${base}.${k}`
      deepDiff(stored[k], replayed[k], p, out, cap)
      if (out.length >= cap) break
    }
    return out
  }
  out.push({ path: wild || base.replace(/^\./, ''), stored, replayed })
  return out
}

// ── compact state summary (the packet's pre-state block) ────────────────────

export function stateSummary(c: CampaignState): string[] {
  const L: string[] = []
  L.push(`phase=${c.phase} chapter=${c.chapter} rng=${c.rngState} frags=${c.tokenFragments ?? 0}`)
  if (c.map) {
    const node = c.map.nodes.find(n => n.id === c.map!.currentNodeId)
    L.push(`node=${c.map.currentNodeId}(${node?.kind}) next=[${node?.next.join(',')}]`)
  }
  const s = c.encounter
  if (s) {
    const e = s.currentEnemy
    L.push(`fight: ${s.tier} turnPhase=${s.turnPhase} actor=hero${s.currentPlayerIndex} ` +
      `enemy=${e ? `${cardLabel(e.card)} hp=${e.hp}/${e.maxHp} atk=${e.attack} shield=${e.shield}${e.immunityNullified ? ' (immunity off)' : ''}` : 'none'} ` +
      `defeated=${s.defeatedCount}/${s.totalEnemies} tavern=${s.tavern.length} discard=${s.discard.length} discardNeeded=${s.discardNeeded}`)
    s.hands.forEach((h, i) => L.push(`hand${i}(${c.heroes[i]?.classId}${c.heroes[i]?.alive ? '' : ' DEAD'}): ${h.map(cardLabel).join(' ') || '(empty)'}`))
    if (s.drawPool) L.push(`drawPool: ${s.drawPool.map(cardLabel).join(' ')}`)
    if (s.recoverPool) L.push(`recoverPool(${s.recoverMode}): ${s.recoverPool.map(cardLabel).join(' ')}`)
    if (s.pendingGraft) L.push(`pendingGraft: hero${s.pendingGraft.heroIdx} ${s.pendingGraft.rank}${s.pendingGraft.suit} (slain ${s.pendingGraft.slain})`)
  } else if (c.deck) {
    c.deck.hands.forEach((h, i) => L.push(`hand${i}(${c.heroes[i]?.classId}): ${h.map(cardLabel).join(' ') || '(empty)'}`))
    L.push(`deck: tavern=${c.deck.tavern.length} discard=${c.deck.discard.length}`)
  }
  if (c.pendingChoice) L.push(`pendingChoice: ${c.pendingChoice.kind} options=[${c.pendingChoice.options.map(o => o.id).join(' | ')}]`)
  if (c.deathVote) L.push(`deathVote: dead=hero${c.deathVote.deadHeroIndex} votes=${JSON.stringify(c.deathVote.votes)}`)
  const relics = c.relicEquipment ? Object.entries(c.relicEquipment).map(([k, v]) => `${k}:${v}`).join(' ') : ''
  if (relics) L.push(`relics: ${relics}${c.relicBag?.length ? ` bag=[${c.relicBag.join(',')}]` : ''}`)
  if (c.spells.length) L.push(`spells: ${c.spells.join(' ')}`)
  return L
}

// ── dot-path assertion (fixture .expect.json) ────────────────────────────────

export function getPath(obj: any, path: string): unknown {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

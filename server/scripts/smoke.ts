// Campaign state-machine smoke test (deterministic).
// Run: npx tsx scripts/smoke.ts
// Exercises: class select → road → encounters (cheat-kill + real-play modes)
// → landmarks → camp/preps → boss → memory draft → chapter 2 → campaign win,
// plus death → vote → retreat → replacement, and save/load round-trip.

import { createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyDeathVote, applyActivatePreparation, applyBreakCamp, beginReplacement, applyMemoryPick, applyContinueChapter, buildClientCampaign, checkEncounterEnd } from '../campaign/campaign'
import { applyEncounterPlay, applyEncounterDiscard, applyEncounterYield, applyEncounterChooseNext, applySetupReorder, applyCastSpell } from '../campaign/encounter'
import { loadKingdom, saveCampaign, loadCampaign } from '../campaign/store'
import { cardValue } from '../deck'
import { EXPERIMENTS } from '../campaign/experiments'
import type { CampaignState } from '../campaign/types'

// Tests 1-8 assert CANON rules regardless of the live experiment toggles;
// Test 9 covers province mode explicitly.
const LIVE_PROVINCE = EXPERIMENTS.provinceMode
EXPERIMENTS.provinceMode = false

let failures = 0
function assert(cond: unknown, msg: string) {
  if (!cond) { failures++; console.error(`  ❌ ${msg}`) }
}
function ok(label: string) { console.log(`  ✓ ${label}`) }

const kingdom = loadKingdom()
kingdom.unlockedChapters = [1, 2]
kingdom.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']

const P1 = 'sock-1', P2 = 'sock-2'
const players = [{ id: P1, name: 'Gab' }, { id: P2, name: 'Jerome' }]

function step(c: CampaignState, who: string, fn: () => { error?: string }, label: string) {
  const r = fn()
  assert(!r.error, `${label} (${who}): ${r.error}`)
  if (c.encounter && c.encounter.outcome !== 'active') checkEncounterEnd(c)
}

// Drive whatever phase we're in until a target phase or step budget runs out.
function drive(c: CampaignState, opts: { cheatKill: boolean; budget?: number; stopAt?: string[] }): string {
  let budget = opts.budget ?? 3000
  while (budget-- > 0) {
    if (opts.stopAt?.includes(c.phase)) return c.phase
    switch (c.phase) {
      case 'road': {
        const cur = c.map!.nodes.find(n => n.id === c.map!.currentNodeId)!
        const target = cur.next[0]!
        step(c, 'host', () => applyRoadChoose(c, P1, target, P1), `road→${target}`)
        break
      }
      case 'landmark':
      case 'replace_hero': {
        const pc = c.pendingChoice!
        const decider = pc.forPlayerId ?? P1
        step(c, decider, () => applyChoice(c, decider, pc.options[0]!.id, P1), `choice ${pc.kind}`)
        break
      }
      case 'encounter': {
        const s = c.encounter!
        if (s.turnPhase === 'setup') {
          const peekerId = s.setupPeek!.playerId
          step(c, peekerId, () => applySetupReorder(c, peekerId, s.setupPeek!.cards.map((_, i) => i)), 'setup reorder')
          break
        }
        const pi = s.currentPlayerIndex
        const pid = c.heroes[pi]!.playerId
        if (s.turnPhase === 'choose_next') {
          step(c, pid, () => applyEncounterChooseNext(c, pid, pi, s.pendingChooseNext), 'choose next')
          break
        }
        if (s.turnPhase === 'discard') {
          // greedy discard
          const hand = s.hands[pi]!
          const idx = hand.map((card, i) => ({ i, v: cardValue(card.rank) })).sort((a, b) => b.v - a.v)
          const pick: number[] = []
          let total = 0
          for (const { i, v } of idx) { if (total >= s.discardNeeded) break; pick.push(i); total += v }
          step(c, pid, () => applyEncounterDiscard(c, pid, pick), 'discard')
          break
        }
        // play phase
        if (opts.cheatKill && s.currentEnemy) s.currentEnemy.hp = 1   // any play kills
        const hand = s.hands[pi]!
        if (hand.length === 0) {
          step(c, pid, () => applyEncounterYield(c, pid), 'yield(empty)')
          break
        }
        // play single highest non-jester card; jester last resort
        const best = hand.map((card, i) => ({ i, card, v: cardValue(card.rank) }))
          .filter(x => x.card.rank !== 'Jo')
          .sort((a, b) => b.v - a.v)[0]
        const playIdx = best ? best.i : 0
        step(c, pid, () => applyEncounterPlay(c, pid, [playIdx]), 'play')
        break
      }
      case 'death_vote': {
        for (const h of c.heroes) {
          if (!c.deathVote) break
          const r = applyDeathVote(c, h.playerId, 'retreat')
          assert(!r.error, `vote: ${r.error}`)
        }
        break
      }
      case 'camp': {
        // replace dead heroes first
        if (c.heroes.some(h => !h.alive)) {
          step(c, 'host', () => beginReplacement(c, kingdom), 'begin replacement')
          break
        }
        // activate one prep if owned
        if (c.preparations.length > 0 && c.activePreparations.length === 0 && c.preparations[0] !== 'p-brace-command') {
          step(c, 'host', () => applyActivatePreparation(c, P1, c.preparations[0]!, P1), 'activate prep')
          break
        }
        step(c, 'host', () => applyBreakCamp(c, P1, P1), 'break camp')
        break
      }
      case 'memory_draft': {
        const d = c.memoryDraft!.drafts.find(dd => !dd.picked)!
        const pid = c.heroes[d.heroIndex]!.playerId
        step(c, pid, () => applyMemoryPick(c, pid, d.options[0]!, kingdom), 'memory pick')
        break
      }
      case 'chapter_complete': {
        step(c, 'host', () => applyContinueChapter(c, P1, P1), 'continue to ch2')
        break
      }
      case 'campaign_won': return 'campaign_won'
      case 'campaign_lost': return 'campaign_lost'
      default:
        assert(false, `unexpected phase ${c.phase}`)
        return c.phase
    }
  }
  return `budget-exhausted@${c.phase}`
}

// ── Test 1: full happy-path campaign (cheat kills) ───────────────────────────
console.log('Test 1: full campaign run (cheat-kill mode)')
{
  const { campaign: c, error } = createCampaign(players, 1, 'smoke-seed', kingdom)
  assert(!error && c, `create: ${error}`)
  if (c) {
    assert(c.phase === 'class_select', 'starts in class_select')
    step(c, P1, () => applyClassPick(c, P1, 'sentinel'), 'pick sentinel')
    step(c, P2, () => applyClassPick(c, P2, 'surgeon'), 'pick surgeon')
    assert(c.phase === 'road', 'road after picks')
    assert(c.map!.nodes.some(n => !n.known), 'some nodes are hidden (partial visibility)')
    const end = drive(c, { cheatKill: true })
    assert(end === 'campaign_won', `campaign won (got ${end})`)
    // dead-at-the-end heroes legitimately have no memories (lost on death;
    // boss fights forbid retreat) — only survivors must have drafted
    assert(c.heroes.filter(h => h.alive).every(h => h.memories.length >= 1), 'survivors drafted memories')
    assert(c.heroes.some(h => h.memories.length >= 1), 'at least one hero carried a memory home')
    ok(`campaign completed: ${end}; ch2 boss modifier exercised`)
  }
}

// ── Test 2: determinism — same seed, same map ────────────────────────────────
console.log('Test 2: deterministic seed')
{
  const a = createCampaign(players, 1, 'det-seed', kingdom).campaign!
  const b = createCampaign(players, 1, 'det-seed', kingdom).campaign!
  for (const x of [a, b]) {
    applyClassPick(x, P1, 'quartermaster')
    applyClassPick(x, P2, 'executioner')
  }
  assert(JSON.stringify(a.map!.nodes.map(n => [n.id, n.kind, n.known, n.next])) ===
         JSON.stringify(b.map!.nodes.map(n => [n.id, n.kind, n.known, n.next])),
         'same seed → identical map')
  ok('maps identical for identical seeds')
}

// ── Test 3: death → vote → retreat → camp replacement ────────────────────────
console.log('Test 3: death fork and replacement')
{
  const c = createCampaign(players, 1, 'death-seed', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'surgeon')
  drive(c, { cheatKill: true, stopAt: ['encounter'], budget: 50 })
  assert(c.phase === 'encounter', `reached an encounter (at ${c.phase})`)
  const s = c.encounter!
  // force a lethal situation for the current player
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  const pi = s.currentPlayerIndex
  s.hands[pi] = [{ suit: 'C', rank: '2', id: 'doom' }]
  s.currentEnemy!.attack = 99
  s.currentEnemy!.shield = 0
  s.currentEnemy!.hp = 999
  const pid = c.heroes[pi]!.playerId
  const r = applyEncounterYield(c, pid)
  assert(!r.error, `yield into doom: ${r.error}`)
  assert(c.phase === 'death_vote', `death vote triggered (got ${c.phase})`)
  assert(!c.heroes[pi]!.alive, 'hero is dead')
  for (const h of c.heroes) if (c.deathVote) applyDeathVote(c, h.playerId, 'retreat')
  assert(c.phase === 'camp', `retreat → emergency camp (got ${c.phase})`)
  const rep = beginReplacement(c, kingdom)
  assert(!rep.error, `replacement offered: ${rep.error}`)
  const pc = c.pendingChoice!
  assert(pc.forPlayerId === pid, 'dead player decides replacement')
  const rr = applyChoice(c, pid, pc.options[0]!.id, P1)
  assert(!rr.error, `replacement picked: ${rr.error}`)
  assert(c.heroes[pi]!.alive, 'hero replaced and alive')
  assert(c.heroes[pi]!.classId !== 'sentinel' || pi !== 0, 'replacement class differs from the dead class')
  // re-enter the fight from emergency camp
  const back = applyBreakCamp(c, P1, P1)
  assert(!back.error, `re-enter fight: ${back.error}`)
  assert(c.phase === 'encounter', 'back in the encounter from camp')
  ok('death → vote → retreat → replace → re-engage works')
}

// ── Test 4: save / load round-trip ───────────────────────────────────────────
console.log('Test 4: persistence round-trip')
{
  const c = createCampaign(players, 1, 'save-seed', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'executioner')
  drive(c, { cheatKill: true, stopAt: ['camp', 'landmark', 'encounter'], budget: 10 })
  saveCampaign(c)
  const loaded = loadCampaign(c.id)
  assert(!!loaded, 'campaign loads')
  assert(JSON.stringify(loaded) === JSON.stringify(JSON.parse(JSON.stringify(c))), 'save round-trips losslessly')
  ok('save/load round-trip')
}

// ── Test 5: real-play bot survives the engine (no crashes) ──────────────────
console.log('Test 5: real-play bot (no cheat) — engine robustness')
{
  for (const seed of ['real-1', 'real-2', 'real-3']) {
    const c = createCampaign(players, 1, seed, kingdom).campaign!
    applyClassPick(c, P1, 'sentinel')
    applyClassPick(c, P2, 'surgeon')
    const end = drive(c, { cheatKill: false, budget: 5000 })
    assert(['campaign_won', 'campaign_lost'].includes(end) || end.startsWith('budget'), `run ends sanely (${end})`)
    console.log(`  seed ${seed}: ${end}`)
  }
  ok('real-play runs complete without crashes')
}

// ── Test 6: client projection doesn't leak hidden state ─────────────────────
console.log('Test 6: client projection')
{
  const c = createCampaign(players, 2, 'proj-seed', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'surgeon')
  drive(c, { cheatKill: true, stopAt: ['encounter'], budget: 60 })
  const view = buildClientCampaign(c, P2, P1, kingdom)
  assert(view.map!.nodes.filter(n => n.kind === 'unknown').length > 0 || c.map!.nodes.every(n => n.known || n.visited), 'unknown nodes masked')
  if (c.encounter?.bossModifierId) assert(view.encounter!.bossModifier?.id === 'hidden', 'ch2 boss modifier hidden without intel')
  const other = buildClientCampaign(c, P1, P1, kingdom)
  assert(other.encounter!.myHand !== view.encounter!.myHand, 'hands are per-player')
  ok('projection masks hidden info')
}

// ── Test 7: deck persists across encounters; only camps reset it ─────────────
console.log('Test 7: deck persistence (attrition canon)')
{
  const c = createCampaign(players, 1, 'persist-seed', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'surgeon')
  assert(!!c.deck, 'chapter deck exists at road start')
  const idsBefore = new Set([...c.deck!.tavern, ...c.deck!.hands.flat()].map(card => card.id))

  drive(c, { cheatKill: true, stopAt: ['encounter'], budget: 20 })
  assert(c.phase === 'encounter' && c.deck === null, 'encounter adopts the deck (campaign.deck is null while fighting)')
  const s1 = c.encounter!
  const inFight = [...s1.tavern, ...s1.hands.flat()].filter(card => idsBefore.has(card.id)).length
  assert(inFight > 30, `encounter uses the same physical cards (${inFight} matched)`)

  // finish this encounter, then reach the next one without passing a camp
  drive(c, { cheatKill: true, stopAt: ['road'], budget: 60 })
  const handsAfterFight = c.deck!.hands.map(h => h.length)
  drive(c, { cheatKill: true, stopAt: ['encounter'], budget: 60 })
  const s2 = c.encounter!
  const sameHands = s2.hands.every((h, i) => h.length === handsAfterFight[i])
  assert(sameHands, 'hands carry over between road encounters (no redraw)')
  const carried = [...s2.tavern, ...s2.hands.flat()].filter(card => idsBefore.has(card.id)).length
  assert(carried > 20, `second encounter still uses the chapter deck (${carried} original cards present)`)

  // drive to a camp and confirm the rest redraws everyone to full
  drive(c, { cheatKill: true, stopAt: ['camp'], budget: 400 })
  if (c.phase === 'camp') {
    const full = c.deck!.hands.every((h, i) => !c.heroes[i]!.alive || h.length === 6) // 2 players → hand size 7? see PLAYER_SETUP
    assert(c.deck!.discard.length === 0, 'camp rest shuffles the discard away')
    assert(c.deck!.hands.filter((_, i) => c.heroes[i]!.alive).every(h => h.length === 7), 'camp rest redraws hands to full (7 for 2 players)')
    void full
  } else {
    assert(false, `expected to reach a camp (got ${c.phase})`)
  }
}

// ── Test 8: player-count scaling (balance-testing) ───────────────────────────
console.log('Test 8: player-count scaling')
{
  // solo campaign
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'solo-seed', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  const allCards = [...c.deck!.tavern, ...c.deck!.hands.flat()]
  assert(allCards.filter(card => card.rank === 'Jo').length === 2, 'solo deck has 2 jesters')
  assert(c.heroes[0]!.relicId !== null, 'solo hero starts with a provision relic')

  // fabricate camp → veteran to check composition + death insurance
  const nodes = [
    { id: 'n0', kind: 'camp' as const, layer: 0, next: ['n1'], known: true, visited: true, rewardCT: 0, pressureCT: 0 },
    { id: 'n1', kind: 'veteran' as const, layer: 1, next: [], known: true, visited: false, rewardCT: 0, pressureCT: 0 },
  ]
  c.map = { variant: 'test', nodes, currentNodeId: 'n0' }
  c.phase = 'camp'
  step(c, 'host', () => applyBreakCamp(c, P1, P1), 'break camp (solo)')
  step(c, 'host', () => applyRoadChoose(c, P1, 'n1', P1), 'enter veteran (solo)')
  const s = c.encounter!
  assert(s.totalEnemies === 2, `solo veteran is J+Q (${s.totalEnemies} enemies, want 2)`)
  while (s.turnPhase === 'setup') applySetupReorder(c, c.heroes[0]!.playerId, s.setupPeek!.cards.map((_, i) => i))

  // solo jester = hand refresh, stay in play phase
  s.hands[0] = [{ suit: 'C', rank: 'Jo', id: 'jo-test' }]
  const jr = applyEncounterPlay(c, P1, [0])
  assert(!jr.error, `solo jester plays: ${jr.error ?? 'ok'}`)
  assert(s.turnPhase === 'play', `solo jester keeps the turn (phase=${s.turnPhase})`)
  assert(s.hands[0]!.length === 8, `solo jester refreshed hand to 8 (got ${s.hands[0]!.length})`)

  // solo death outside boss → emergency camp, not campaign over
  s.hands[0] = [{ suit: 'C', rank: '2', id: 'doom2' }]
  s.currentEnemy!.attack = 99
  s.currentEnemy!.shield = 0
  step(c, P1, () => applyEncounterYield(c, P1), 'solo doom yield')
  assert(c.phase === 'camp', `solo death → emergency camp (got ${c.phase})`)
  assert(!c.heroes[0]!.alive, 'solo hero is dead, successor required')
  const rep = beginReplacement(c, kingdom)
  assert(!rep.error, `solo replacement offered: ${rep.error ?? 'ok'}`)

  // 2-player: 1 jester + bigger reward choices
  const d = createCampaign(players, 1, 'duo-seed', kingdom).campaign!
  applyClassPick(d, P1, 'sentinel')
  applyClassPick(d, P2, 'surgeon')
  const duoCards = [...d.deck!.tavern, ...d.deck!.hands.flat()]
  assert(duoCards.filter(card => card.rank === 'Jo').length === 1, 'duo deck has 1 jester')
  assert(d.heroes.every(h => h.relicId !== null), 'duo heroes start with provision relics')
  d.map = {
    variant: 'test',
    nodes: [
      { id: 'm0', kind: 'start', layer: 0, next: ['m1'], known: true, visited: true, rewardCT: 0, pressureCT: 0 },
      { id: 'm1', kind: 'market', layer: 1, next: [], known: true, visited: false, rewardCT: 0, pressureCT: 0 },
    ],
    currentNodeId: 'm0',
  }
  d.phase = 'road'
  step(d, 'host', () => applyRoadChoose(d, P1, 'm1', P1), 'duo market')
  assert((d.pendingChoice?.options.length ?? 0) === 4, `duo market shows 4 options (got ${d.pendingChoice?.options.length})`)
}

// ── Test 9: province mode (Gates → Courtyard → Throne) ──────────────────────
console.log('Test 9: province mode')
{
  EXPERIMENTS.provinceMode = true
  // note: province cheat-kill runs can legitimately die at a gate (no rests);
  // this seed is verified to reach the Throne under the drive() policy
  const c = createCampaign(players, 1, 'prov-probe-2', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  applyClassPick(c, P2, 'surgeon')
  const bosses = c.map!.nodes.filter(n => n.kind === 'boss')
  assert(bosses.length === 3, `province map has 3 rank gates (got ${bosses.length})`)
  assert(c.map!.variant.startsWith('prov'), `province map variant (${c.map!.variant})`)

  // curation: suited classes cut their lowest own-suit cards at deck build
  const all = [...c.deck!.tavern, ...c.deck!.hands.flat()]
  const spades = all.filter(card => card.suit === 'S' && card.rank !== 'Jo').length
  assert(spades < 10, `sentinel curated spades (${spades}/10 remain)`)

  const end = drive(c, { cheatKill: true, budget: 4000 })
  assert(end === 'campaign_won', `throne taken → campaign won at chapter 1 (got ${end})`)
  assert(c.chapter === 1, 'province run never enters chapter 2')
  ok('province: 3 rank gates, curation, throne win')

  // second wind: first road-fight death stands back up, once per act
  const d = createCampaign(players, 1, 'prov-wind', kingdom).campaign!
  applyClassPick(d, P1, 'sentinel')
  applyClassPick(d, P2, 'surgeon')
  drive(d, { cheatKill: true, stopAt: ['encounter'], budget: 50 })
  const s = d.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(d, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  const pi = s.currentPlayerIndex
  s.hands[pi] = [{ suit: 'C', rank: '2', id: 'doom-p' }]
  s.currentEnemy!.attack = 99
  s.currentEnemy!.shield = 0
  const pid = d.heroes[pi]!.playerId
  const r = applyEncounterYield(d, pid)
  assert(!r.error, `province doom yield: ${r.error}`)
  assert(d.heroes[pi]!.alive, 'second wind: the hero stands back up')
  assert(d.phase !== 'campaign_lost' && d.phase !== 'death_vote', `no vote, run continues (${d.phase})`)
  ok('province: second wind spends the act mercy')
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

console.log(failures === 0 ? '\nAll smoke tests passed ✅' : `\n${failures} failure(s) ❌`)
process.exit(failures === 0 ? 0 : 1)

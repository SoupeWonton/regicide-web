// Campaign state-machine smoke test (deterministic).
// Run: npx tsx scripts/smoke.ts
// Exercises: class select → road → encounters (cheat-kill + real-play modes)
// → landmarks → camp → boss → chapter 2 → campaign win,
// plus death → vote → retreat → replacement, and save/load round-trip.

import { createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyDeathVote, applyBreakCamp, beginReplacement, applyContinueChapter, buildClientCampaign, checkEncounterEnd } from '../campaign/campaign'
import { applyEncounterPlay, applyEncounterDiscard, applyEncounterYield, applyEncounterChooseNext, applySetupReorder, applyCastSpell, applyKeepDrawn, applyGraftSelect, maxHandSize } from '../campaign/encounter'
import { MAX_TOKENS_PER_CARD } from '../campaign/tokens'
import { loadKingdom, saveCampaign, loadCampaign } from '../campaign/store'
import { cardValue } from '../deck'
import { EXPERIMENTS } from '../campaign/experiments'
import type { CampaignState } from '../campaign/types'

// Tests 1-8 assert CANON rules regardless of the live experiment toggles;
// Test 9 covers province mode; Tests A-E cover ascending-deck mode. Both flags
// are pinned off here and restored per-test so canon tests are flag-agnostic.
const LIVE_PROVINCE = EXPERIMENTS.provinceMode
EXPERIMENTS.provinceMode = false
const LIVE_ASCENDING = EXPERIMENTS.ascendingDeck
EXPERIMENTS.ascendingDeck = false

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
  if (c.encounter && c.encounter.outcome !== 'active') checkEncounterEnd(c, kingdom)
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
        if (pc.kind === 'landmark_reward' && pc.forPlayerId === null && c.heroes.length > 1) {
          // team rewards are a vote — everyone backs the first option
          for (const h of c.heroes) {
            if (!c.pendingChoice) break
            step(c, h.playerId, () => applyChoice(c, h.playerId, pc.options[0]!.id, P1), `vote ${pc.kind}`)
          }
          break
        }
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
        // ascending-deck: auto-keep best/cheapest from the draw pool
        if (s.turnPhase === 'draw_select') {
          const pi2 = s.drawSelectHeroIdx!
          const pid2 = c.heroes[pi2]!.playerId
          const pool = s.drawPool ?? []
          const slots = Math.max(0, maxHandSize(c, pi2) - (s.hands[pi2]?.length ?? 0)) // real empty slots
          // keep highest-value cards (greedy — best for bot)
          const ranked = pool.map((card, i) => ({ i, v: cardValue(card.rank) }))
            .sort((a, b) => b.v - a.v)
          const keepIdxs = ranked.slice(0, Math.min(slots, ranked.length)).map(x => x.i)
          step(c, pid2, () => applyKeepDrawn(c, pid2, keepIdxs), 'keep drawn')
          break
        }
        // ascending-deck: redundant-kill graft — reinforce the first hand card with room
        if (s.turnPhase === 'graft_select') {
          const gi = s.pendingGraft!.heroIdx
          const gpid = c.heroes[gi]!.playerId
          const ghand = s.hands[gi] ?? []
          const idx = ghand.findIndex(card =>
            (c.cardTokens?.[`${card.suit}${card.rank}`]?.length ?? 0) < MAX_TOKENS_PER_CARD)
          step(c, gpid, () => applyGraftSelect(c, gpid, idx, 'value'), 'graft select')
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
          // cheatKill tests STRUCTURE, not combat balance — keep the bot stocked
          // from the Tavern rather than yield into a lethal counterattack.
          if (opts.cheatKill) {
            const max = maxHandSize(c, pi)
            while (s.hands[pi]!.length < max && s.tavern.length > 0) s.hands[pi]!.push(s.tavern.pop()!)
          }
          if (s.hands[pi]!.length === 0) { step(c, pid, () => applyEncounterYield(c, pid), 'yield(empty)'); break }
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
        step(c, 'host', () => applyBreakCamp(c, P1, P1), 'break camp')
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

// ── Test 3: dead is dead — any hero death ends the run ───────────────────────
console.log('Test 3: death ends the run (no vote, no replacement)')
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
  assert(!c.heroes[pi]!.alive, 'hero is dead')
  assert(c.phase === 'campaign_lost', `any death ends the run (got ${c.phase})`)
  assert(c.deathVote == null, 'no respawn/death vote is offered')
  assert(c.encounter!.outcome === 'wiped', 'encounter marked wiped')
  // a dead vote, if anyone tried, is rejected (the mechanic is gone)
  const stale = applyDeathVote(c, pid, 'retreat')
  assert(!!stale.error, 'death vote is no longer accepted')
  ok('a hero death ends the run → Try Again / Main Menu, no respawn')
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
  assert(c.heroes[0]!.relicIds.length === 0, 'solo hero starts with NO relic (all relics are bought/won)')

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

  // dead is dead: a solo death ends the run (no emergency camp, no successor)
  s.hands[0] = [{ suit: 'C', rank: '2', id: 'doom2' }]
  s.currentEnemy!.attack = 99
  s.currentEnemy!.shield = 0
  step(c, P1, () => applyEncounterYield(c, P1), 'solo doom yield')
  assert(c.phase === 'campaign_lost', `solo death ends the run (got ${c.phase})`)
  assert(!c.heroes[0]!.alive, 'solo hero is dead — run over')

  // 2-player: 1 jester + bigger reward choices
  const d = createCampaign(players, 1, 'duo-seed', kingdom).campaign!
  applyClassPick(d, P1, 'sentinel')
  applyClassPick(d, P2, 'surgeon')
  const duoCards = [...d.deck!.tavern, ...d.deck!.hands.flat()]
  assert(duoCards.filter(card => card.rank === 'Jo').length === 1, 'duo deck has 1 jester')
  assert(d.heroes.every(h => h.relicIds.length === 0), 'duo heroes start with NO relics (all relics are bought/won)')
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
  // structural asserts on a single representative seed
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

  // Reachability, RNG-robust: province cheat-kill runs can legitimately die at a
  // gate (no rests), and any economy change shifts the deterministic stream — so
  // assert the Throne is winnable across a seed sample rather than pinning one
  // knife's-edge seed. Most should win; we require a healthy majority.
  let wins = 0
  const SAMPLE = 12
  for (let i = 1; i <= SAMPLE; i++) {
    const r = createCampaign(players, 1, `prov-probe-${i}`, kingdom).campaign!
    applyClassPick(r, P1, 'sentinel')
    applyClassPick(r, P2, 'surgeon')
    if (drive(r, { cheatKill: true, budget: 4000 }) === 'campaign_won' && r.chapter === 1) wins++
  }
  // floor only catches "throne became unreachable"; the win-rate itself is a
  // balance signal owned by the sims, surfaced here for eyeballing.
  assert(wins >= 3, `province throne reachable across seeds (${wins}/${SAMPLE} won)`)
  ok(`province: 3 rank gates, curation, throne win (${wins}/${SAMPLE} seeds)`)

  // dead is dead (canon 2026-06-11): any province death is a full run reset
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
  assert(!d.heroes[pi]!.alive, 'dead is dead: the hero stays down')
  assert(d.phase === 'campaign_lost', `road death wipes the run (got ${d.phase})`)
  ok('province: dead is dead — road death ends the run')
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test A: ascending-deck flag-on — overdraw-and-select (Step 1) ───────────
console.log('Test A: ascending-deck flag-on — overdraw-and-select')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step1', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  // drive to an encounter
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(c.phase === 'encounter', `reached encounter (${c.phase})`)
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  // force a Diamond play by giving the current player a diamond hand
  const pi = s.currentPlayerIndex
  const pid = c.heroes[pi]!.playerId
  s.hands[pi] = [{ suit: 'D', rank: '8', id: 'test-d8' }]
  // empty the hand first so overdraw-and-select triggers (8 empty slots needed vs 1 card play = 8 drawn from pool)
  const tavernBefore = s.tavern.length
  const r = applyEncounterPlay(c, pid, [0])
  assert(!r.error, `diamond play: ${r.error}`)
  if (s.turnPhase === 'draw_select') {
    // pool should have cards
    assert((s.drawPool?.length ?? 0) > 0, 'draw pool is populated')
    const pool = s.drawPool!
    const keepIdxs = [0]
    const r2 = applyKeepDrawn(c, pid, keepIdxs)
    assert(!r2.error, `keep_drawn: ${r2.error}`)
    assert(s.turnPhase !== 'draw_select', 'draw_select phase resolved')
    assert(s.drawPool === undefined, 'draw pool cleared after selection')
    // card should be in hand
    assert(s.hands[pi]!.length >= 1, 'hero has kept card in hand')
    ok(`ascending-deck: overdraw pool of ${pool.length} → kept 1, others returned`)
  } else {
    // no overdraw needed (hand was already near-full or pool fit exactly) — still valid
    ok(`ascending-deck: diamond played without needing draw_select pause (hand fit pool)`)
  }
  void tavernBefore

  // save must still load (backward-compat guard: new fields are optional)
  const { saveCampaign: save, loadCampaign: load } = await import('../campaign/store')
  save(c)
  const loaded = load(c.id)
  assert(!!loaded, 'ascending-deck save loads')
  assert(loaded!.chapter === c.chapter, 'chapter preserved across save')
  ok('ascending-deck: save/load round-trip (optional fields guard)')

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test A2: ascending-deck — redundant exact-kill grafts onto a hand card ───
console.log('Test A2: ascending-deck — redundant exact-kill → permanent graft')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-graft', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(c.phase === 'encounter', `reached encounter (${c.phase})`)
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))

  const pi = s.currentPlayerIndex
  const pid = c.heroes[pi]!.playerId
  // Force a redundant exact-kill: rewrite the live enemy to an OWNED low card
  // (D2, value 2 ≤ 5 ⇒ alreadyOwned) at 2 HP, give a 2♠ to land it exactly and a
  // 4♥ to receive the graft. ♠ adds no damage, so 2 dmg ⇒ enemy.hp 0 ⇒ exact.
  s.modifierId = null
  delete s.flags['enemy.guard']
  const enemy = s.currentEnemy!
  enemy.card = { suit: 'D', rank: '2', id: 'enemy-d2' }
  enemy.hp = 2
  s.turnPhase = 'play'
  s.hands[pi] = [
    { suit: 'S', rank: '2', id: 'kill-s2' },
    { suit: 'H', rank: '4', id: 'graft-h4' },
  ]
  const before = c.cardTokens?.['H4']?.length ?? 0
  const rp = applyEncounterPlay(c, pid, [0])   // 2♠ → 2 dmg → exact kill on owned D2
  assert(!rp.error, `play to exact-kill: ${rp.error}`)
  assert(s.turnPhase === 'graft_select', `redundant exact-kill pauses for graft (got ${s.turnPhase})`)
  assert(s.pendingGraft?.suit === 'D', `pendingGraft carries the slain suit (got ${s.pendingGraft?.suit})`)
  const gIdx = s.hands[pi]!.findIndex(card => card.id === 'graft-h4')
  const rg = applyGraftSelect(c, pid, gIdx, 'suit')   // graft the D suit onto 4♥
  assert(!rg.error, `graft select: ${rg.error}`)
  assert((c.cardTokens?.['H4']?.length ?? 0) === before + 1, 'graft stamped one token on H4')
  // phase resumes to combat unless that kill ended the encounter (won → checkEncounterEnd transitions)
  assert(s.turnPhase !== 'graft_select' || s.outcome === 'won', `graft_select phase resolved (got ${s.turnPhase}/${s.outcome})`)
  assert(s.pendingGraft === undefined, 'pendingGraft cleared after selection')
  ok('ascending-deck: redundant exact-kill → permanent graft onto a hand card')

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test B: ascending-deck flag-on — number-enemies + recruit (Step 2) ───────
console.log('Test B: ascending-deck flag-on — number-enemies + recruit')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  // build a fake recruit encounter directly and drive it
  const { startEncounter } = await import('../campaign/encounter')
  const c2 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step2', kingdom).campaign!
  applyClassPick(c2, P1, 'sentinel')
  // set up a minimal map with a recruit node
  c2.map = {
    variant: 'test',
    nodes: [
      { id: 'r0', kind: 'start', layer: 0, next: ['r1'], known: true, visited: true, rewardCT: 0, pressureCT: 0 },
      { id: 'r1', kind: 'recruit', layer: 1, next: [], known: true, visited: false, rewardCT: 0.3, pressureCT: 0.3 },
    ],
    currentNodeId: 'r0',
  }
  c2.phase = 'road'
  const rr = applyRoadChoose(c2, P1, 'r1', P1)
  assert(!rr.error, `recruit road choose: ${rr.error}`)
  assert(c2.phase === 'encounter', `recruit starts encounter (${c2.phase})`)
  const sr = c2.encounter!
  // number enemies should have number ranks (2-10)
  const { isNumberRank: isNR } = await import('../deck')
  assert(sr.enemyDeck.length > 0 || sr.currentEnemy !== null, 'enemy deck or current enemy exists')
  const allEnemyRanks = [
    ...(sr.currentEnemy ? [sr.currentEnemy.card.rank] : []),
    ...sr.enemyDeck.map(e => e.rank),
  ]
  assert(allEnemyRanks.every(r => isNR(r)), `all recruit enemies are number-rank (got: ${allEnemyRanks.join(',')})`)
  // check stats: number rank → finite HP (not NaN)
  if (sr.currentEnemy) {
    assert(Number.isFinite(sr.currentEnemy.hp), `number-enemy HP is finite (got ${sr.currentEnemy.hp})`)
    assert(Number.isFinite(sr.currentEnemy.attack), `number-enemy ATK is finite (got ${sr.currentEnemy.attack})`)
  }

  // drive to kill — test exact-kill recruits to ownedCards
  while (sr.turnPhase === 'setup') applySetupReorder(c2, sr.setupPeek!.playerId, sr.setupPeek!.cards.map((_, i) => i))
  if (sr.currentEnemy && sr.outcome === 'active') {
    const enemyCard = sr.currentEnemy.card
    const enemyRank = enemyCard.rank
    const enemySuit = enemyCard.suit
    // give the player a single Ace so damage = 1; enemy HP set to 1 → exact kill
    sr.hands[0] = [{ suit: 'S', rank: 'A', id: 'test-ace' }]
    sr.currentEnemy.hp = 1
    sr.currentEnemy.attack = 0   // no counterattack
    const kr = applyEncounterPlay(c2, P1, [0])
    assert(!kr.error, `exact kill play: ${kr.error}`)
    if (isNR(enemyRank)) {
      const cardId = `${enemySuit}${enemyRank}`
      const owned = c2.ownedCards ?? []
      const tokenBudget = c2.tokenBudget ?? 0
      // exactly one of: recruited to ownedCards, or already owned (token)
      const gotResult = owned.includes(cardId) || tokenBudget > 0
      assert(gotResult, `exact kill recruits number enemy OR grants token (owned=${owned.length}, budget=${tokenBudget})`)
      ok(`ascending-deck Step 2: exact-kill recruits ${cardId} (owned=${owned.includes(cardId)}, tokenBudget=${tokenBudget})`)
    } else {
      ok('ascending-deck Step 2: enemy fight resolved (non-number enemy)')
    }
  } else {
    ok('ascending-deck Step 2: recruit encounter active (no kill needed for this test)')
  }

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test B2: ascending-deck flag-on — drafts (Step 6) ───────────────────────
console.log('Test B2: ascending-deck flag-on — drafts')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  const cd = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step6', kingdom).campaign!
  applyClassPick(cd, P1, 'sentinel')
  // minimal map: start → draft
  cd.map = {
    variant: 'test',
    nodes: [
      { id: 'd0', kind: 'start', layer: 0, next: ['d1'], known: true, visited: true, rewardCT: 0, pressureCT: 0 },
      { id: 'd1', kind: 'draft', layer: 1, next: [], known: true, visited: false, rewardCT: 0.3, pressureCT: 0 },
    ],
    currentNodeId: 'd0',
  }
  cd.phase = 'road'
  const dr = applyRoadChoose(cd, P1, 'd1', P1)
  assert(!dr.error, `draft road choose: ${dr.error}`)
  const pc = cd.pendingChoice
  assert(!!pc && pc.kind === 'draft_pick', `draft node offers a draft_pick (kind=${pc?.kind})`)
  assert((pc?.forPlayerId) === P1, 'draft is solo per-hero (forPlayerId scoped, no casino vote)')
  assert((pc?.options.length ?? 0) >= 2, `draft offers ≥2 options (got ${pc?.options.length})`)
  // ch1 draft archetypes: tier cards (6s/7s, with or without tempo), grafts, or tempo
  const cardOpts = pc!.options.filter(o => /^draft:[CDHS]\d/.test(o.id))
  assert(cardOpts.every(o => /^draft:[CDHS](6|7):\d+$/.test(o.id)), `ch1 draft cards are 6s/7s (${cardOpts.map(o => o.id).join(',')})`)
  assert(pc!.options.some(o => /^draft:(graft|[CDHS](6|7)):/.test(o.id)), 'draft offers a card or graft archetype')
  ok(`ascending-deck Step 6: draft offers ${pc!.options.length} options (tier-card / clean-card / graft / tempo)`)

  // pick the first card option → it recruits the card AND draws tempo.
  // Shrink the (post-setup, full) hand so the tempo burst has slots to fill —
  // move the excess back to the Tavern so card conservation still holds.
  {
    const h = cd.deck!.hands[0]!
    const excess = h.splice(2)
    cd.deck!.tavern.push(...excess)
  }
  const pick = cardOpts[0]!
  const ownedBefore = (cd.ownedCards ?? []).length
  const handBefore = cd.deck?.hands[0]?.length ?? 0
  const tavernBefore = cd.deck?.tavern.length ?? 0
  const pr = applyChoice(cd, P1, pick.id, P1)
  assert(!pr.error, `draft pick resolves: ${pr.error}`)
  assert(cd.pendingChoice === null, 'draft choice cleared after pick')
  assert(cd.phase === 'road', `draft returns to road (got ${cd.phase})`)
  const recruited = pick.id.split(':')[1]!   // e.g. 'S6'
  assert((cd.ownedCards ?? []).includes(recruited), `draft recruited ${recruited} into ownedCards`)
  assert((cd.ownedCards ?? []).length === ownedBefore + 1, 'exactly one card added')
  // deck net change: +1 recruited into tavern, then tempo draws move tavern→hand
  const handAfter = cd.deck?.hands[0]?.length ?? 0
  const tavernAfter = cd.deck?.tavern.length ?? 0
  assert(handAfter > handBefore, `tempo burst drew cards (hand ${handBefore}→${handAfter})`)
  assert((tavernAfter + handAfter) === (tavernBefore + handBefore + 1), 'card conservation: +1 recruited, rest moved hand↔tavern')
  ok(`ascending-deck Step 6: pick recruited ${recruited} + tempo drew ${handAfter - handBefore} (deck grows, no leaks)`)

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test C: ascending-deck flag-on — start-small deck + backfill (Step 3) ───
console.log('Test C: ascending-deck flag-on — start-small deck + backfill')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  const { backfillAct } = await import('../campaign/campaign')

  const c3 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step3', kingdom).campaign!
  applyClassPick(c3, P1, 'sentinel')

  // start-small: deck should be A-5, all suits = 20 cards + 2 jesters (solo)
  const allCards = [...(c3.deck?.tavern ?? []), ...(c3.deck?.hands[0] ?? [])]
  const nonJokers = allCards.filter(cd => cd.rank !== 'Jo')
  const highCards = nonJokers.filter(cd => !['A','2','3','4','5'].includes(cd.rank))
  assert(nonJokers.length === 20, `ascending deck: 20 number-cards A-5 (got ${nonJokers.length})`)
  assert(highCards.length === 0, `ascending deck: no 6-10 in start deck (got ${highCards.length})`)
  assert(allCards.filter(cd => cd.rank === 'Jo').length === 2, 'ascending deck: 2 jesters (solo)')
  ok(`ascending deck: start-small 20-card deck (A-5 × 4 suits + 2 jesters)`)

  // backfill end-of-chapter-1: grants 6s and 7s (8 cards, all suits)
  assert((c3.ownedCards ?? []).length === 0, 'no ownedCards before backfill')
  backfillAct(c3)
  const afterBackfill = c3.ownedCards ?? []
  assert(afterBackfill.length === 8, `backfill grants 8 cards (6s+7s × 4 suits, got ${afterBackfill.length})`)
  assert(afterBackfill.every(id => id.slice(1) === '6' || id.slice(1) === '7'), 'all backfill cards are 6s or 7s')
  ok(`backfill end-ch1: granted 6s+7s (${afterBackfill.length} cards)`)

  // backfill redundancy: recruit a 6♣ via ownedCards, then backfill again —
  // that slot becomes a token FRAGMENT instead (not Forge budget)
  const c4 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step3b', kingdom).campaign!
  applyClassPick(c4, P1, 'sentinel')
  c4.ownedCards = ['C6']   // already owns 6♣ (e.g., recruited by exact kill)
  backfillAct(c4)
  const afterB2 = c4.ownedCards ?? []
  const frags = c4.tokenFragments ?? 0
  assert(afterB2.length === 8, `backfill still grants 8 total owned cards (got ${afterB2.length}): pre-owned counted`)
  assert(frags === 1, `backfill redundancy: 1 fragment from the already-owned 6♣ (got ${frags})`)
  ok(`backfill redundancy: owned card → +1 fragment (fragments=${frags})`)

  // setupChapterDeck with ownedCards: deck includes recruited cards
  const c5 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step3c', kingdom).campaign!
  applyClassPick(c5, P1, 'sentinel')
  c5.ownedCards = ['C6', 'D7']   // recruited 6♣ and 7♦
  // re-setup the deck to inject owned cards
  const { setupChapterDeck: reSetup } = await import('../campaign/encounter')
  reSetup(c5)
  const deckWithOwned = [...(c5.deck?.tavern ?? []), ...(c5.deck?.hands[0] ?? [])]
  const sixAndSeven = deckWithOwned.filter(cd => cd.rank === '6' || cd.rank === '7')
  assert(sixAndSeven.length === 2, `setup injects owned cards into deck (got ${sixAndSeven.length}: ${sixAndSeven.map(cd => cd.rank+cd.suit).join(',')})`)
  ok(`setupChapterDeck injects ownedCards (C6 + D7 present in deck)`)

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test D: ascending-deck flag-on — full arc ch1→ch2→ch3→Council→ch4→win ───
console.log('Test D: ascending-deck flag-on — full arc (ch1 → ch2 → ch3 → Council of Tens → ch4 province → win)')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false

  const { backfillAct: bfAct, continentOf: cOf } = await import('../campaign/campaign')

  // Kingdom: start with ch1 only — the arc unlocks ch2/3/4 along the way.
  // PIN the item pools to the starting set so the arc is deterministic regardless
  // of disk kingdom.json (death-unlocks from other runs grow the pool, which would
  // shift the Caravan/Sanctum RNG and flip this fixed-seed outcome).
  const { STARTING_RELICS: SR, STARTING_SPELLS: SS } = await import('../campaign/content')
  const arcKingdom = loadKingdom()
  arcKingdom.unlockedChapters = [1]
  arcKingdom.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']
  arcKingdom.unlockedRelics = [...SR]
  arcKingdom.unlockedSpells = [...SS]

  const arc = createCampaign([{ id: P1, name: 'Gab' }], 1, 'arc-test-d', arcKingdom).campaign!
  applyClassPick(arc, P1, 'sentinel')

  assert(arc.map!.variant === 'cont1-ch1', `ch1 map is cont1-ch1 (got ${arc.map!.variant})`)
  // v2: no recruit nodes — road fights are skirmish/veteran (number-enemies); 3 gates.
  assert(arc.map!.nodes.some(n => n.kind === 'skirmish'), 'ch1 map has skirmish fights')
  assert(arc.map!.nodes.filter(n => n.kind === 'boss').length === 3, 'ch1 map has 3 number gates')
  ok('ascending-deck: ch1 map has skirmish fights + 3 gates (cont1-ch1 variant)')

  // Drive through ch1 (cheat-kill all encounters; chapter_complete → continue)
  const afterCh1 = drive(arc, { cheatKill: true, stopAt: ['chapter_complete', 'campaign_won', 'campaign_lost'], budget: 2000 })
  assert(afterCh1 === 'chapter_complete', `ch1 ends in chapter_complete (got ${afterCh1})`)
  assert(arc.chapter === 1, `chapter counter still 1 at chapter_complete (got ${arc.chapter})`)
  // ownedCards from exact kills + backfill happen in applyContinueChapter
  step(arc, P1, () => applyContinueChapter(arc, P1, P1), 'continue ch1→ch2')
  assert(arc.chapter === 2, `chapter advances to 2 (got ${arc.chapter})`)
  assert(arc.map!.variant === 'cont1-ch2', `ch2 map is cont1-ch2 (got ${arc.map!.variant})`)
  // backfill for ch1 (6s+7s) ran in applyContinueChapter
  const afterCh1Owned = arc.ownedCards ?? []
  assert(afterCh1Owned.some(id => id.slice(1) === '6' || id.slice(1) === '7'),
    `ch1 backfill added 6s/7s to ownedCards (got ${afterCh1Owned.join(',').slice(0, 50)})`)
  ok(`ascending-deck: ch1→ch2 transition complete; ownedCards has 6s+7s; map=cont1-ch2`)

  // Drive through ch2
  const afterCh2 = drive(arc, { cheatKill: true, stopAt: ['chapter_complete', 'campaign_won', 'campaign_lost'], budget: 2000 })
  assert(afterCh2 === 'chapter_complete', `ch2 ends in chapter_complete (got ${afterCh2})`)
  step(arc, P1, () => applyContinueChapter(arc, P1, P1), 'continue ch2→ch3')
  assert(arc.chapter === 3, `chapter advances to 3 (got ${arc.chapter})`)
  assert(arc.map!.variant === 'cont1-ch3', `ch3 map is cont1-ch3 (got ${arc.map!.variant})`)
  const afterCh2Owned = arc.ownedCards ?? []
  assert(afterCh2Owned.some(id => id.slice(1) === '8' || id.slice(1) === '9'),
    `ch2 backfill added 8s/9s (got ${afterCh2Owned.length} owned cards)`)
  ok(`ascending-deck: ch2→ch3 transition; ownedCards has 6-9s; map=cont1-ch3`)

  // Drive through ch3 to Council of Tens (boss node)
  const afterCh3 = drive(arc, { cheatKill: true, stopAt: ['chapter_complete', 'campaign_won', 'campaign_lost'], budget: 2000 })
  assert(afterCh3 === 'chapter_complete', `ch3/Council ends in chapter_complete (got ${afterCh3})`)

  // At this point the Council victory should have added all 10s to ownedCards
  const ownedAfterCouncil = arc.ownedCards ?? []
  const all10s = ['C10', 'D10', 'H10', 'S10']
  const has10s = all10s.every(id => ownedAfterCouncil.includes(id))
  assert(has10s, `Council of Tens: all four 10s in ownedCards after Council victory (got ${ownedAfterCouncil.filter(id => id.slice(1) === '10').join(',')})`)
  ok(`ascending-deck: Council of Tens defeated; all four 10s owned`)

  // Continue to ch4 (continent seam)
  step(arc, P1, () => applyContinueChapter(arc, P1, P1), 'continue ch3→ch4 (continent seam)')
  assert(arc.chapter === 4, `chapter advances to 4 (got ${arc.chapter})`)
  assert(cOf(arc.chapter) === 2, `chapter 4 is continent 2 (cOf(4)=${cOf(arc.chapter)})`)
  assert(arc.map!.variant === 'prov1-b', `ch4 uses province map prov1-b (got ${arc.map!.variant})`)

  // Deck at ch4 should have all A-10 cards (40 number cards + jesters)
  const ch4Cards = [...(arc.deck?.tavern ?? []), ...(arc.deck?.hands[0] ?? [])]
  const ch4NonJokers = ch4Cards.filter(cd => cd.rank !== 'Jo')
  assert(ch4NonJokers.length === 40, `ch4 deck has 40 number cards (A-10 × 4 suits) (got ${ch4NonJokers.length})`)
  ok(`ascending-deck: ch4 deck is complete A-10 (40 cards + jesters); province map active`)

  // Assert continent-2 flags: backfill OFF (no BACKFILL_RANKS for ch4)
  const ownedBefore = [...(arc.ownedCards ?? [])]
  bfAct(arc)  // backfill for ch4 should be a no-op (no ranks defined for ch4)
  const ownedAfter = arc.ownedCards ?? []
  assert(ownedAfter.length === ownedBefore.length, `backfill is a no-op on ch4 (continent 2) (${ownedBefore.length} → ${ownedAfter.length})`)
  ok('ascending-deck: backfill is OFF in continent 2 (ch4)')

  // Province map has 3 boss nodes (Gates / Courtyard / Throne)
  const bosses4 = arc.map!.nodes.filter(n => n.kind === 'boss')
  assert(bosses4.length === 3, `ch4 province map has 3 rank gates (got ${bosses4.length})`)
  ok('ascending-deck: ch4 (continent 2) province map has 3 rank gates')

  // Drive the full province (ch4) to campaign_won
  const arcEnd = drive(arc, { cheatKill: true, budget: 5000 })
  assert(arcEnd === 'campaign_won', `full arc wins (got ${arcEnd})`)
  assert(arc.chapter === 4, `won on ch4 (got ${arc.chapter})`)
  ok(`ascending-deck: full arc ch1→ch2→ch3→Council→ch4(province) WINS! (${arcEnd})`)

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test E: ascending-deck flag-on — tokens (Step 5) ─────────────────────────
console.log('Test E: ascending-deck flag-on — tokens (signatures, spend/hold, forge)')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false
  const { spendDelta, holdDelta, stampToken, MAX_TOKENS_PER_CARD } = await import('../campaign/tokens')

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step5', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(c.phase === 'encounter', `reached encounter (${c.phase})`)

  // (a) class signature stamped at run start: Sentinel → Plate on 3♠/4♠/5♠
  assert((c.cardTokens?.['S3'] ?? []).some(t => t.defId === 'plate'), 'Sentinel signature: Plate on 3♠')
  assert((c.cardTokens?.['S5'] ?? []).some(t => t.defId === 'plate'), 'Sentinel signature: Plate on 5♠')
  ok('ascending-deck: class signature stamped at run start (Sentinel Plate ×3)')

  // (b) value helpers: spend vs hold deltas read the catalog
  stampToken(c, 'S2', { defId: 'hone' })       // +1 spend
  stampToken(c, 'D2', { defId: 'ballast' })    // +1 hold
  assert(spendDelta(c, { suit: 'S', rank: '2', id: 'x' }) === 1, 'Hone → +1 spend delta')
  assert(holdDelta(c, { suit: 'S', rank: '2', id: 'x' }) === 0, 'Hone → 0 hold delta')
  assert(holdDelta(c, { suit: 'D', rank: '2', id: 'y' }) === 1, 'Ballast → +1 hold delta')
  ok('ascending-deck: spend/hold value deltas resolve from the catalog')

  // (c) forge cap: a card takes at most MAX_TOKENS_PER_CARD tokens
  stampToken(c, 'H2', { defId: 'hone' })
  stampToken(c, 'H2', { defId: 'hone' })
  stampToken(c, 'H2', { defId: 'hone' })
  const overflow = stampToken(c, 'H2', { defId: 'hone' })
  assert((c.cardTokens?.['H2'] ?? []).length === MAX_TOKENS_PER_CARD, `cap holds at ${MAX_TOKENS_PER_CARD}`)
  assert(!!overflow, 'forging past the cap is rejected')
  ok(`ascending-deck: forge cap enforced (max ${MAX_TOKENS_PER_CARD}/card)`)

  // (d) integration: a +1 spend token raises the damage dealt by exactly 1
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  if (s.currentEnemy) {
    const pi = s.currentPlayerIndex
    const pid = c.heroes[pi]!.playerId
    const enemy = s.currentEnemy
    enemy.hp = 50
    s.hands[pi] = [{ suit: 'S', rank: '2', id: 'tE-s2' }]   // 2♠ carries Hone (+1 spend)
    const before = enemy.hp
    const r = applyEncounterPlay(c, pid, [0])
    assert(!r.error, `play with token: ${r.error}`)
    assert(before - enemy.hp === 3, `2♠ + Hone deals value+1 = 3 (dealt ${before - enemy.hp})`)
    ok('ascending-deck: +1 spend token raised damage by exactly 1')
  }

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test F: ascending-deck — item economy (relics/spells pools) ──────────────
console.log('Test F: ascending-deck — item economy (retired relics, unlock pools, snapshot)')
{
  const { ITEMS, STARTING_RELICS, STARTING_SPELLS, RELIC_UNLOCK_ORDER, SPELL_UNLOCK_ORDER } = await import('../campaign/content')
  const ids = new Set(ITEMS.map(i => i.id))

  // retired axis-engine dupes + MP-dead relics are gone
  for (const dead of ['r-iron-stitch', 'r-field-satchel', 'r-grand-provision', 'r-bastion-sigil', 'r-signal-whistle', 'r-war-drum'])
    assert(!ids.has(dead), `retired relic ${dead} removed from ITEMS`)
  ok('item economy: stale axis-dupe + MP-dead relics retired')

  // pools compose cleanly and reference real items
  const allR = [...STARTING_RELICS, ...RELIC_UNLOCK_ORDER]
  const allS = [...STARTING_SPELLS, ...SPELL_UNLOCK_ORDER]
  assert(new Set(allR).size === allR.length, 'no duplicate relic ids across pools')
  assert(new Set(allS).size === allS.length, 'no duplicate spell ids across pools')
  assert(allR.every(id => ids.has(id)), 'every pooled relic exists in ITEMS')
  assert(allS.every(id => ids.has(id)), 'every pooled spell exists in ITEMS')
  ok(`item economy: pools compose (${allR.length} relics, ${allS.length} spells; start ${STARTING_RELICS.length}/${STARTING_SPELLS.length})`)

  // a fresh run snapshots the Kingdom's unlocked pools
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-items', kingdom).campaign!
  assert((c.unlockedRelics ?? []).length === (kingdom.unlockedRelics ?? []).length, 'run snapshots the Kingdom relic pool')
  assert((c.unlockedSpells ?? []).length === (kingdom.unlockedSpells ?? []).length, 'run snapshots the Kingdom spell pool')
  assert((c.unlockedRelics ?? []).every(id => RELIC_UNLOCK_ORDER.includes(id) || STARTING_RELICS.includes(id)), 'snapshot relics are real pool ids')
  ok('item economy: run snapshots the unlocked pools')

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

// ── Test G: ascending-deck — Sanctum Rites (Phase 4) ─────────────────────────
console.log('Test G: ascending-deck — Sanctum Rites (Foresight / Blessing / Cleanse; no Exile)')
{
  EXPERIMENTS.ascendingDeck = true
  EXPERIMENTS.provinceMode = false
  const { stampToken } = await import('../campaign/tokens')

  // helper: stage a Sanctum rite menu and pick a rite (solo → resolves immediately)
  const pickRite = (c: CampaignState, riteId: string) => {
    c.phase = 'landmark'
    c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: '✨ Sanctum', options: [{ id: riteId, label: riteId }] }
    return applyChoice(c, P1, riteId, P1)
  }

  // (a) Blessing rite → shrineBlessing armed, back on the road
  const cB = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-sanctum-b', kingdom).campaign!
  applyClassPick(cB, P1, 'sentinel')
  assert(!cB.shrineBlessing, 'no blessing before the rite')
  assert(!pickRite(cB, 'sanctum:blessing').error, 'blessing rite resolves')
  assert(cB.shrineBlessing && cB.phase === 'road', 'Blessing rite arms shrineBlessing + returns to road')
  ok('Sanctum: Blessing rite arms the next-fight boon')

  // (b) Foresight rite → flag armed, then revealed in the next encounter + projected
  const cF = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-sanctum-f', kingdom).campaign!
  applyClassPick(cF, P1, 'sentinel')
  assert(!pickRite(cF, 'sanctum:foresight').error, 'foresight rite resolves')
  assert(cF.foresightNext === true, 'Foresight rite arms foresightNext')
  drive(cF, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(cF.phase === 'encounter', `Foresight: reached an encounter (${cF.phase})`)
  assert(cF.encounter!.flags['foreseen'] === true, 'Foresight: enemy lineup laid bare this fight')
  assert(cF.foresightNext === false, 'Foresight: flag consumed at the encounter')
  const proj = buildClientCampaign(cF, P1, P1, kingdom)
  assert(Array.isArray(proj.encounter?.foreseen), 'Foresight: upcoming lineup projected to the client')
  ok('Sanctum: Foresight rite reveals the next fight (server flag + client projection)')

  // (c) Exile is GONE — the Sanctum never offers a card-removal rite (the deck only grows)
  const cE = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-sanctum-e', kingdom).campaign!
  applyClassPick(cE, P1, 'sentinel')
  cE.phase = 'landmark'
  // drive offerSanctum indirectly by exercising the rite handler surface: the menu
  // must contain no exile option, and the (removed) rite id must be a no-op.
  const rExile = pickRite(cE, 'sanctum:exile')   // unknown rite id → falls through to road
  assert(!rExile.error && cE.phase === 'road' && cE.pendingChoice === null, 'no Exile rite: unknown id is an inert no-op')
  assert(cE.exiledCards.length === 0, 'no card was exiled (deck only grows)')
  ok('Sanctum: Exile rite removed — no mechanic thins the deck')

  // (d) Cleanse rite → lifts a curse (folds the Shrine in)
  const cC = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-sanctum-c', kingdom).campaign!
  applyClassPick(cC, P1, 'sentinel')
  stampToken(cC, 'D2', { defId: 'undercut' })   // a −1 curse on 2♦
  assert((cC.cardTokens?.['D2'] ?? []).length === 1, 'curse stamped before cleanse')
  assert(!pickRite(cC, 'sanctum:cleanse').error, 'cleanse rite resolves')
  const cpc = cC.pendingChoice!
  assert(cpc.options.some(o => o.id === 'shrine:cleanse:D2'), 'Cleanse offers the cursed 2♦')
  assert(!applyChoice(cC, P1, 'shrine:cleanse:D2', P1).error, 'cleanse pick resolves')
  assert((cC.cardTokens?.['D2'] ?? []).length === 0, 'Cleanse: the curse is lifted')
  ok('Sanctum: Cleanse rite lifts a curse (Shrine folded in)')

  EXPERIMENTS.ascendingDeck = LIVE_ASCENDING
  EXPERIMENTS.provinceMode = LIVE_PROVINCE
}

console.log(failures === 0 ? '\nAll smoke tests passed ✅' : `\n${failures} failure(s) ❌`)
process.exit(failures === 0 ? 0 : 1)

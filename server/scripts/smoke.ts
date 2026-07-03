// Campaign state-machine smoke test (deterministic).
// Run: npx tsx scripts/smoke.ts
// Exercises: class select → road → encounters (cheat-kill + real-play modes)
// → landmarks → camp → boss → chapter 2 → campaign win,
// plus death → vote → retreat → replacement, and save/load round-trip.

import { createCampaign, applyClassPick, applyRoadChoose, applyChoice, applyDeathVote, applyBreakCamp, beginReplacement, applyContinueChapter, buildClientCampaign, checkEncounterEnd, startTutorial } from '../campaign/campaign'
import { advanceTutorialStep } from '../campaign/tutorial'
import { applyEncounterPlay, applyEncounterDiscard, applyEncounterYield, applyEncounterChooseNext, applySetupReorder, applyCastSpell, applyKeepDrawn, applyGraftSelect, maxHandSize } from '../campaign/encounter'
import { spendDelta } from '../campaign/tokens'
import { loadKingdom, saveCampaign, loadCampaign } from '../campaign/store'
import { checkInvariants } from '../campaign/invariants'
import { cardValue } from '../deck'
import { EXPERIMENTS } from '../campaign/experiments'
import type { CampaignState } from '../campaign/types'

// V3.0 cutover (slice 9): ascendingDeck IS the game — the provinceMode flag
// and the non-ascending branches are deleted. Every test runs the V3 rules.

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
  // bug-oracle tripwires: every action across every test must leave a sane state
  const viol = checkInvariants(c)
  assert(viol.length === 0, `invariant after ${label}: ${viol.join(' | ')}`)
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
        // the happy-path driver waves the Caravan on (buying is a multi-step
        // discard selection — exercised explicitly in Test M, not here)
        const pick = pc.options.find(o => o.id === 'caravan:skip')?.id ?? pc.options[0]!.id
        if (pc.kind === 'landmark_reward' && pc.forPlayerId === null && c.heroes.length > 1) {
          // team rewards are a vote — everyone backs the same option
          for (const h of c.heroes) {
            if (!c.pendingChoice) break
            step(c, h.playerId, () => applyChoice(c, h.playerId, pick, P1), `vote ${pc.kind}`)
          }
          break
        }
        const decider = pc.forPlayerId ?? P1
        step(c, decider, () => applyChoice(c, decider, pick, P1), `choice ${pc.kind}`)
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
        // replacement graft: rewrite the first valid hand card (value mode if the
        // rank differs, else suit mode), or decline when nothing can change
        if (s.turnPhase === 'graft_select') {
          const g = s.pendingGraft!
          const gpid = c.heroes[g.heroIdx]!.playerId
          const ghand = s.hands[g.heroIdx] ?? []
          const backed = (card: { id: string }) => !!c.cards?.[card.id]
          const vIdx = ghand.findIndex(card => backed(card) && card.rank !== g.rank)
          const sIdx = ghand.findIndex(card => backed(card) && card.suit !== g.suit && card.rank !== 'Jo')
          if (vIdx >= 0) step(c, gpid, () => applyGraftSelect(c, gpid, vIdx, 'value'), 'graft select')
          else if (sIdx >= 0) step(c, gpid, () => applyGraftSelect(c, gpid, sIdx, 'suit'), 'graft select')
          else step(c, gpid, () => applyGraftSelect(c, gpid, -1, 'value'), 'graft decline')
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
        // play the single highest non-jester card (TOKEN-AWARE: an undercut-
        // cursed 2 plays as 0 and cannot cheat-kill — prefer real value);
        // jester last resort
        const best = hand.map((card, i) => ({ i, card, v: cardValue(card.rank) + (EXPERIMENTS.ascendingDeck ? spendDelta(c, card) : 0) }))
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
  // V3: the start deck is 20 cards + 1 jester (duo) — most must carry over
  const inFight = [...s1.tavern, ...s1.hands.flat()].filter(card => idsBefore.has(card.id)).length
  assert(inFight > 14, `encounter uses the same physical cards (${inFight} matched)`)

  // finish this encounter, then reach the next one without passing a camp
  drive(c, { cheatKill: true, stopAt: ['road'], budget: 60 })
  const handsAfterFight = c.deck!.hands.map(h => h.length)
  drive(c, { cheatKill: true, stopAt: ['encounter'], budget: 60 })
  const s2 = c.encounter!
  const sameHands = s2.hands.every((h, i) => h.length === handsAfterFight[i])
  assert(sameHands, 'hands carry over between road encounters (no redraw)')
  const carried = [...s2.tavern, ...s2.hands.flat()].filter(card => idsBefore.has(card.id)).length
  assert(carried > 8, `second encounter still uses the chapter deck (${carried} original cards present)`)

  // drive to a camp: the V3 bundle shuffles the discard in and tops hands to 5
  drive(c, { cheatKill: true, stopAt: ['camp'], budget: 400 })
  if (c.phase === 'camp') {
    assert(c.deck!.discard.length === 0, 'Camp reshuffles the discard into the Tavern')
    assert(c.deck!.hands.filter((_, i) => c.heroes[i]!.alive).every(h => h.length >= 5) || c.deck!.tavern.length === 0,
      'Camp tops every hand up to 5 (Decision 6)')
    assert(c.campDoubleNext === true && (c.campBlockNext ?? 0) > 0, 'Camp arms the double + block bundle')
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
  // V3: the Caravan offers 2 pay-from-hand relics + the skip
  assert((d.pendingChoice?.options.length ?? 0) === 3, `duo Caravan shows 2 relics + skip (got ${d.pendingChoice?.options.length})`)
}

// (Test 9 — province mode — DELETED at the V3.0 cutover with the provinceMode flag.)

// ── Test A: ascending-deck flag-on — overdraw-and-select (Step 1) ───────────
console.log('Test A: ascending-deck flag-on — overdraw-and-select')
{

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

}

// ── Test A2: graft (V3 §1) — redundant exact-kill: ADD suit or REPLACE value ─
console.log('Test A2: graft — redundant exact-kill adds a suit (or replaces the value)')
{
  const { physicalByPrinted, physicalById, effectiveFace, effectiveSuits, applyGraft } = await import('../campaign/cards')

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-graft', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(c.phase === 'encounter', `reached encounter (${c.phase})`)
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))

  const pi = s.currentPlayerIndex
  const pid = c.heroes[pi]!.playerId
  // Force a redundant exact-kill: rewrite the live enemy to an OWNED low card
  // (D2, value 2 ≤ 5 ⇒ alreadyOwned) at 2 HP; hand = the real 2♠ (to land the
  // exact kill) + the real 4♥ (to receive the graft) — registry-backed ids.
  s.modifierId = null
  delete s.flags['enemy.guard']
  const enemy = s.currentEnemy!
  enemy.card = { suit: 'D', rank: '2', id: 'enemy-d2' }
  enemy.hp = 2
  s.turnPhase = 'play'
  const s2pc = physicalByPrinted(c, 'S2')!
  const h4pc = physicalByPrinted(c, 'H4')!
  const c2pc = physicalByPrinted(c, 'C2')!   // same-rank probe for the no-op guard
  s.hands[pi] = [
    { suit: 'S', rank: '2', id: s2pc.physicalId },
    { suit: 'H', rank: '4', id: h4pc.physicalId },
    { suit: 'C', rank: '2', id: c2pc.physicalId },
  ]
  const fragsBefore = c.tokenFragments ?? 0
  const rp = applyEncounterPlay(c, pid, [0])   // 2♠ → 2 dmg → exact kill on owned D2
  assert(!rp.error, `play to exact-kill: ${rp.error}`)
  assert(s.turnPhase === 'graft_select', `redundant exact-kill pauses for graft (got ${s.turnPhase})`)
  assert(s.pendingGraft?.suit === 'D' && s.pendingGraft?.rank === '2',
    `pendingGraft carries the slain face (got ${s.pendingGraft?.suit}${s.pendingGraft?.rank})`)

  // a no-op rewrite is rejected: the 2♣'s rank is already the slain rank (2)
  const c2Idx = s.hands[pi]!.findIndex(card => card.id === c2pc.physicalId)
  assert(c2Idx >= 0, 'no-op probe (2♣) still in hand after the kill')
  assert(!!applyGraftSelect(c, pid, c2Idx, 'value').error, 'same-rank rewrite is rejected (no-op guard)')

  // suit graft is ADDITIVE: 4♥ keeps ♥ and ALSO fires ♦ — primary face unchanged,
  // the physical card underneath untouched (decision 2026-07-02).
  const gIdx = s.hands[pi]!.findIndex(card => card.id === h4pc.physicalId)
  const rg = applyGraftSelect(c, pid, gIdx, 'suit')
  assert(!rg.error, `graft select: ${rg.error}`)
  const h4f = effectiveFace(h4pc)
  assert(h4f.suit === 'H' && h4f.rank === '4', `4♥ keeps its primary face (got ${h4f.suit}${h4f.rank})`)
  const h4suits = effectiveSuits(h4pc)
  assert(h4suits.includes('H') && h4suits.includes('D'), `4♥ now fires BOTH ♥ and ♦ (got ${h4suits.join('')})`)
  assert(h4pc.printed.suit === 'H', 'printed face unchanged (♥ underneath)')
  assert(h4pc.grafts.find(g => g.kind === 'suit-add')?.source === 'kill:D2', `provenance records the slain card (got ${h4pc.grafts[0]?.source})`)
  // the added suit fires in combat: cardSuits (the engine's read) sees ♦ too
  const { cardSuits } = await import('../campaign/tokens')
  const liveCard = s.hands[pi]!.find(card => card.id === h4pc.physicalId)!
  assert(cardSuits(c, liveCard).has('D') && cardSuits(c, liveCard).has('H'), 'engine cardSuits unions the added ♦ with the printed ♥')
  // a second suit graft of a suit it ALREADY fires is a no-op
  assert(!!applyGraft(c, h4pc.physicalId, 'suit-add', 'H', 'test') , 'adding an already-present suit is rejected')
  assert(physicalById(c, h4pc.physicalId) === h4pc, 'physicalId stable through the graft')
  // the trigger grants NO fragment (Decision 3)
  assert((c.tokenFragments ?? 0) === fragsBefore, 'no fragment on the graft trigger (Decision 3)')
  // phase resumes to combat unless that kill ended the encounter (won → checkEncounterEnd transitions)
  assert(s.turnPhase !== 'graft_select' || s.outcome === 'won', `graft_select phase resolved (got ${s.turnPhase}/${s.outcome})`)
  assert(s.pendingGraft === undefined, 'pendingGraft cleared after selection')
  ok('graft: exact kill on an owned card ADDS a suit to a held card (4♥ → fires ♥+♦)')

}

// ── Test B: ascending-deck flag-on — number-enemies + recruit (Step 2) ───────
console.log('Test B: ascending-deck flag-on — number-enemies + recruit')
{

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

}

// ── Test B2: ascending-deck flag-on — drafts (Step 6) ───────────────────────
console.log('Test B2: ascending-deck flag-on — drafts')
{

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
  // revised 2026-07-03: three tactical trades — dig / bulwark / salvage
  const ids = pc!.options.map(o => o.id).sort()
  assert(JSON.stringify(ids) === JSON.stringify(['draft:bulwark', 'draft:dig', 'draft:salvage']), `draft offers the three trades (got ${ids.join(',')})`)
  ok('ascending-deck Step 6: draft offers dig / bulwark / salvage')

  // Dig: draw 3 (cap-bound), then mill 6 Tavern → discard. Shrink the full hand
  // so the draw has slots; card conservation across all zones must hold.
  {
    const h = cd.deck!.hands[0]!
    cd.deck!.tavern.push(...h.splice(2))
  }
  const total = (d: NonNullable<typeof cd.deck>) => d.hands.reduce((n, hh) => n + hh.length, 0) + d.tavern.length + d.discard.length
  const before = total(cd.deck!)
  const handBefore = cd.deck!.hands[0]!.length
  const discardBefore = cd.deck!.discard.length
  const pr = applyChoice(cd, P1, 'draft:dig', P1)
  assert(!pr.error, `draft dig resolves: ${pr.error}`)
  assert(cd.pendingChoice === null && cd.phase === 'road', 'draft returns to road')
  assert(total(cd.deck!) === before, 'Dig conserves cards across all zones (nothing created/destroyed)')
  assert(cd.deck!.hands[0]!.length > handBefore, `Dig drew into hand (${handBefore}→${cd.deck!.hands[0]!.length})`)
  assert(cd.deck!.discard.length > discardBefore, `Dig milled Tavern → discard (${discardBefore}→${cd.deck!.discard.length})`)
  ok('ascending-deck Step 6: Dig draws then mills, conserving cards')

  // Bulwark: arms the next fight (+block, first attack dulled)
  const cb = createCampaign([{ id: P1, name: 'Gab' }], 1, 'draft-bw', kingdom).campaign!
  applyClassPick(cb, P1, 'sentinel', 'footwork')
  cb.phase = 'landmark'
  cb.pendingChoice = { kind: 'draft_pick', forPlayerId: P1, prompt: 'd', options: [{ id: 'draft:bulwark', label: 'b' }] }
  assert(!applyChoice(cb, P1, 'draft:bulwark', P1).error, 'draft bulwark resolves')
  assert((cb.campBlockNext ?? 0) >= 6 && (cb.attackMalusNext ?? 0) >= 3, `Bulwark arms next fight (block=${cb.campBlockNext}, malus=${cb.attackMalusNext})`)
  ok('ascending-deck Step 6: Bulwark arms +block / −attack for the next encounter')

}

// ── Test C: ascending-deck flag-on — start-small deck + backfill (Step 3) ───
console.log('Test C: ascending-deck flag-on — start-small deck + backfill')
{

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

}

// ── Test D: ascending-deck flag-on — full arc ch1→ch2→ch3→Council→ch4→win ───
console.log('Test D: ascending-deck flag-on — full arc (ch1 → ch2 → ch3 → Council of Tens → ch4 province → win)')
{

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
  assert(arc.map!.variant === 'cont2-p1', `ch4 uses the C2 P1 province map (got ${arc.map!.variant})`)

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

  // V3 §8: each C2 province carries ONE royal gate (ch4 J · ch5 Q · ch6 K)
  const bosses4 = arc.map!.nodes.filter(n => n.kind === 'boss')
  assert(bosses4.length === 1, `ch4 province map has ONE gate (got ${bosses4.length})`)
  ok('ascending-deck: ch4 (C2 P1) carries a single royal gate')

  // Drive the three C2 provinces to the crown
  const arcEnd = drive(arc, { cheatKill: true, budget: 8000 })
  assert(arcEnd === 'campaign_won', `full arc wins (got ${arcEnd})`)
  assert(arc.chapter === 6, `won at the ch6 King Gate (got ch${arc.chapter})`)
  ok(`ascending-deck: full arc ch1→ch2→ch3→Council→C2 provinces→CROWN WINS! (${arcEnd})`)

}

// ── Test E: ascending-deck flag-on — tokens (Step 5) ─────────────────────────
console.log('Test E: ascending-deck flag-on — tokens (signatures, spend/hold, forge)')
{
  const { spendDelta, holdDelta, stampToken, MAX_TOKENS_PER_CARD } = await import('../campaign/tokens')

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-step5', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  assert(c.phase === 'encounter', `reached encounter (${c.phase})`)

  // (a) Decision 1 (2026-07-01): starting decks are IDENTICAL — no class
  // signature stamps, no pre-applied grafts. Class identity = Staff + path.
  assert(Object.keys(c.cardTokens ?? {}).length === 0, 'no signature tokens at run start (identical decks — Decision 1)')
  ok('ascending-deck: identical A–5 start — no class signature stamps (Decision 1)')

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
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-items', kingdom).campaign!
  assert((c.unlockedRelics ?? []).length === (kingdom.unlockedRelics ?? []).length, 'run snapshots the Kingdom relic pool')
  assert((c.unlockedSpells ?? []).length === (kingdom.unlockedSpells ?? []).length, 'run snapshots the Kingdom spell pool')
  assert((c.unlockedRelics ?? []).every(id => RELIC_UNLOCK_ORDER.includes(id) || STARTING_RELICS.includes(id)), 'snapshot relics are real pool ids')
  ok('item economy: run snapshots the unlocked pools')

}

// (Test G — Sanctum rites / curse Cleanse — DELETED at the V3.0 cutover with those systems.)

// ── Test H: §F card-state model (V3.0 slice 1) ───────────────────────────────
console.log('Test H: §F card-state — physical ids, printed vs effective, provenance, schema')
{
  const { CAMPAIGN_SCHEMA_VERSION, applyGraft, moveGraft, effectiveFace, physicalById, physicalByLogical, migrateCampaign, projectPhysicalCards } = await import('../campaign/cards')

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'asc-cardstate', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel')

  // (a) schema version + registry: 20 physical cards behind the A–5 start
  assert(c.schemaVersion === CAMPAIGN_SCHEMA_VERSION, `fresh run carries schemaVersion ${CAMPAIGN_SCHEMA_VERSION} (got ${c.schemaVersion})`)
  const reg = Object.values(c.cards ?? {})
  assert(reg.length === 20, `registry holds the 20-card start (got ${reg.length})`)
  assert(reg.every(pc => pc.grafts.length === 0), 'no grafts at run start')
  const runtime = [...(c.deck?.tavern ?? []), ...(c.deck?.hands[0] ?? [])].filter(cd => cd.rank !== 'Jo')
  assert(runtime.length === 20 && runtime.every(cd => {
    const pc = physicalById(c, cd.id)
    if (!pc) return false
    const f = effectiveFace(pc)
    return f.suit === cd.suit && f.rank === cd.rank
  }), 'every runtime deck card is registry-backed (Card.id = physicalId, face = effective)')
  ok('§F: fresh run → schema v2, 20 registry entries, registry-backed runtime deck')

  // (b) rank graft: identity survives replacement; the printed face never changes
  const s2 = physicalByLogical(c, 'S2')
  assert(!!s2, 'S2 resolves through the logical shim')
  assert(applyGraft(c, s2!.physicalId, 'rank', '7', 'kill:H7') === null, 'rank graft applies')
  const f1 = effectiveFace(s2!)
  assert(f1.rank === '7' && f1.suit === 'S', `effective face is now 7♠ (got ${f1.suit}${f1.rank})`)
  assert(s2!.printed.rank === '2' && s2!.printed.suit === 'S', 'printed face unchanged (2♠)')
  assert(physicalByLogical(c, 'S7')?.physicalId === s2!.physicalId, 'the shim resolves the NEW effective id to the SAME physical card')
  ok('§F: rank replacement — same physicalId, printed 2♠ / effective 7♠')

  // (c) royal cap: a rank graft can never make a royal (structural §3 invariant)
  assert(applyGraft(c, s2!.physicalId, 'rank', 'J', 'royal:SK') !== null, 'rank graft to J is rejected (cap 10)')
  assert(applyGraft(c, s2!.physicalId, 'rank', '10', 'royal:SK') === null, 'rank graft to 10 allowed')
  ok('§F: royal cap — rank grafts top out at 10')

  // (d) suit graft + provenance: the full replacement history stays on the card
  assert(applyGraft(c, s2!.physicalId, 'suit', 'D', 'sanctum') === null, 'suit graft applies')
  const f2 = effectiveFace(s2!)
  assert(f2.suit === 'D' && f2.rank === '10', `effective face is 10♦ (got ${f2.suit}${f2.rank})`)
  assert(s2!.grafts.length === 3, `provenance keeps all three grafts (got ${s2!.grafts.length})`)
  assert(s2!.grafts[0]!.from === '2' && s2!.grafts[0]!.to === '7' && s2!.grafts[0]!.source === 'kill:H7', 'a graft records what replaced what + its source')
  ok('§F: provenance — replacement history retained (2→7→10, S→D)')

  // (e) move a graft (Sanctum): the card underneath is never lost
  const h3 = physicalByLogical(c, 'H3')!
  const suitGraft = s2!.grafts.find(g => g.kind === 'suit')!
  assert(moveGraft(c, s2!.physicalId, suitGraft.seq, h3.physicalId) === null, 'suit graft moves 2♠→3♥')
  assert(effectiveFace(s2!).suit === 'S', 'source card reverts to its underlying suit (♠)')
  const h3f = effectiveFace(h3)
  assert(h3f.suit === 'D' && h3f.rank === '3', `target now carries the graft (3♦, got ${h3f.suit}${h3f.rank})`)
  assert(h3.grafts[0]!.from === 'H' && h3.grafts[0]!.source === 'sanctum', 'moved graft re-anchors `from` + keeps its source')
  ok('§F: graft moved between cards — both faces re-derive; nothing lost')

  // (f) serialization round-trip + legacy-save migration
  saveCampaign(c)
  const re = loadCampaign(c.id)
  assert(re?.schemaVersion === CAMPAIGN_SCHEMA_VERSION, 'round-trip keeps the schema version')
  const reS2 = re ? physicalById(re, s2!.physicalId) : undefined
  assert(!!reS2 && effectiveFace(reS2).rank === '10' && reS2.printed.rank === '2', 'round-trip keeps printed + grafts (effective re-derives)')
  const legacy = JSON.parse(JSON.stringify(re)) as CampaignState
  delete legacy.schemaVersion
  delete legacy.cards
  delete legacy.cardSeq
  legacy.ownedCards = ['C6']
  migrateCampaign(legacy)
  assert(legacy.schemaVersion === CAMPAIGN_SCHEMA_VERSION, 'legacy save migrates to v2')
  assert(Object.values(legacy.cards ?? {}).length === 21, `migration registers start + owned (got ${Object.values(legacy.cards ?? {}).length})`)
  ok('§F: serialization survives; legacy saves migrate forward')

  // (g) client projection: printed vs effective display data
  const proj = projectPhysicalCards(c)
  const pj = proj?.[s2!.physicalId]
  assert(!!pj && pj.printed.rank === '2' && pj.effective.rank === '10', 'projection carries printed vs effective')
  const view = buildClientCampaign(c, P1, P1, kingdom)
  assert(!!view.physicalCards?.[s2!.physicalId], 'client state carries the physicalCards map')
  ok('§F: client projection — printed vs effective display data')

}

// ── Test I: V3 §3 — C2 royal gates (full rank, royal graft cap 10, keep 3/2/1, crown) ─
console.log('Test I: royal gates — 4-royal gates, royal graft (cap 10), keep-decision, crown victory')
{
  const { physicalByPrinted, physicalById, effectiveFace } = await import('../campaign/cards')
  const { startEncounter } = await import('../campaign/encounter')

  const kd = loadKingdom()
  kd.unlockedChapters = [1, 2, 3, 4, 5, 6]
  kd.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']
  const c = createCampaign([{ id: P1, name: 'Gab' }], 4, 'royal-gates', kd).campaign!
  applyClassPick(c, P1, 'sentinel')
  // V3 §8: one gate per province — the rank keys off the chapter
  const bosses = c.map!.nodes.filter(n => n.kind === 'boss').sort((a, b) => a.layer - b.layer)
  assert(bosses.length === 1, `the P1 map carries one gate (got ${bosses.length})`)

  // helper: clear the rest of a gate with overkills (never exact, never recruit)
  const overkillAll = (cx: CampaignState, sx: NonNullable<CampaignState['encounter']>) => {
    let guard = 30
    while (sx.outcome === 'active' && guard-- > 0) {
      if (sx.turnPhase === 'discard') {
        const hand2 = sx.hands[0]!
        const pick: number[] = []; let tot = 0
        for (let i2 = 0; i2 < hand2.length && tot < sx.discardNeeded; i2++) { pick.push(i2); tot += cardValue(hand2[i2]!.rank) }
        const rd = applyEncounterDiscard(cx, P1, pick)
        assert(!rd.error, `gate discard: ${rd.error}`)
        continue
      }
      if (sx.turnPhase !== 'play' || !sx.currentEnemy) break
      const en = sx.currentEnemy
      en.hp = 1; en.attack = 0; en.shield = 0
      sx.hands[0] = [{ suit: 'S', rank: '4', id: `ti-kill-${guard}` }]   // 4 dmg vs 1 hp = overkill
      const r2 = applyEncounterPlay(cx, P1, [0])
      assert(!r2.error, `gate overkill play: ${r2.error}`)
    }
  }

  // (a) the Jack Gate fields ALL FOUR Jacks (solo no longer gets 3)
  startEncounter(c, bosses[0]!.id, 'boss')
  c.phase = 'encounter'
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  const gateCards = [...(s.currentEnemy ? [s.currentEnemy.card] : []), ...s.enemyDeck]
  assert(gateCards.length === 4 && gateCards.every(cd => cd.rank === 'J'),
    `Jack Gate fields all four Jacks (got ${gateCards.map(cd => cd.suit + cd.rank).join(',')})`)
  ok('royal gates: a gate is the full rank — four royals, solo included')

  // (b) exact royal kill → replacement graft capped at 10; the body is banished
  const enemy = s.currentEnemy!
  enemy.hp = 2; enemy.attack = 0; enemy.shield = 0
  s.turnPhase = 'play'
  const s2pc = physicalByPrinted(c, 'S2')!
  const h4pc = physicalByPrinted(c, 'H4')!
  s.hands[0] = [
    { suit: 'S', rank: '2', id: s2pc.physicalId },
    { suit: 'H', rank: '4', id: h4pc.physicalId },
  ]
  const rp = applyEncounterPlay(c, P1, [0])   // 2♠ → 2 dmg → exact kill on the Jack
  assert(!rp.error, `royal exact-kill play: ${rp.error}`)
  assert(s.turnPhase === 'graft_select', `royal exact kill pauses for graft (got ${s.turnPhase})`)
  assert(s.pendingGraft?.rank === '10', `royal graft value is capped at 10 (got ${s.pendingGraft?.rank})`)
  assert(!s.tavern.some(cd => cd.rank === 'J') && !s.discard.some(cd => cd.rank === 'J'),
    'slain royal is banished — no tavern slide, no discard fuel')
  const gIdx = s.hands[0]!.findIndex(cd => cd.id === h4pc.physicalId)
  assert(!applyGraftSelect(c, P1, gIdx, 'value').error, 'royal graft resolves')
  assert(effectiveFace(h4pc).rank === '10', `4♥ became 10♥ via the royal graft (got ${effectiveFace(h4pc).rank})`)
  ok('royal gates: exact royal kill → replacement graft (cap 10); royals never join by kill')

  // (c) clear the gate → the Jack keep-decision (leave 1, keep 3)
  overkillAll(c, s)
  assert(s.outcome === 'won', `Jack Gate cleared (${s.outcome})`)
  checkEncounterEnd(c, kd)
  const pcJ = c.pendingChoice
  assert(pcJ?.kind === 'royal_keep' && pcJ.royalKeep?.rank === 'J',
    `Jack keep-decision presented (got ${pcJ?.kind}/${pcJ?.royalKeep?.rank})`)
  assert(pcJ!.options.length === 4, 'all four Jacks on the table')
  const leave = pcJ!.options[0]!.id
  assert(!applyChoice(c, P1, leave, P1).error, 'leave pick resolves')
  const ownedJ = (c.ownedCards ?? []).filter(id => id.slice(1) === 'J')
  assert(ownedJ.length === 3 && !ownedJ.includes(leave), `three Jacks kept (${ownedJ.join(',')}); ${leave} left behind`)
  const tavJ = (c.deck?.tavern ?? []).filter(cd => cd.rank === 'J')
  assert(tavJ.length === 3 && tavJ.every(cd => !!physicalById(c, cd.id)),
    'kept Jacks shuffled into the tavern as §F-backed real deck cards')
  ok('royal gates: Jack Gate keeps 3 of 4 — kept royals are real deck cards')

  // (d) Queen Gate (ch5): keep 2 of 4 via two sequential picks
  const cQ = createCampaign([{ id: P1, name: 'Gab' }], 5, 'royal-gates-q', kd).campaign!
  applyClassPick(cQ, P1, 'sentinel')
  const qBoss = cQ.map!.nodes.find(n => n.kind === 'boss')!
  startEncounter(cQ, qBoss.id, 'boss')
  cQ.phase = 'encounter'
  const sQ = cQ.encounter!
  while (sQ.turnPhase === 'setup') applySetupReorder(cQ, sQ.setupPeek!.playerId, sQ.setupPeek!.cards.map((_, i) => i))
  const qCards = [...(sQ.currentEnemy ? [sQ.currentEnemy.card] : []), ...sQ.enemyDeck]
  assert(qCards.length === 4 && qCards.every(cd => cd.rank === 'Q'),
    `the ch5 gate fields four Queens (got ${qCards.map(cd => cd.suit + cd.rank).join(',')})`)
  overkillAll(cQ, sQ)
  assert(sQ.outcome === 'won', `Queen Gate cleared (${sQ.outcome})`)
  checkEncounterEnd(cQ, kd)
  const pcQ = cQ.pendingChoice
  assert(pcQ?.kind === 'royal_keep' && pcQ.royalKeep?.rank === 'Q', 'Queen keep-decision presented')
  const q1 = pcQ!.options[0]!.id
  assert(!applyChoice(cQ, P1, q1, P1).error, 'first Queen pick resolves')
  assert(cQ.pendingChoice?.kind === 'royal_keep' && cQ.pendingChoice.options.length === 3,
    'second Queen pick pending from the remaining three')
  const q2 = cQ.pendingChoice!.options[0]!.id
  assert(!applyChoice(cQ, P1, q2, P1).error, 'second Queen pick resolves')
  const ownedQ = (cQ.ownedCards ?? []).filter(id => id.slice(1) === 'Q')
  assert(ownedQ.length === 2 && ownedQ.includes(q1) && ownedQ.includes(q2), `two Queens kept (${ownedQ.join(',')})`)
  ok('royal gates: Queen Gate keeps 2 of 4 — sequential picks')

  // (e) King Gate (ch6): four Kings, keep 1 — the crown — the V3.0 victory
  const cK = createCampaign([{ id: P1, name: 'Gab' }], 6, 'royal-gates-k', kd).campaign!
  applyClassPick(cK, P1, 'sentinel')
  const kBoss = cK.map!.nodes.find(n => n.kind === 'boss')!
  startEncounter(cK, kBoss.id, 'boss')
  cK.phase = 'encounter'
  const sK = cK.encounter!
  while (sK.turnPhase === 'setup') applySetupReorder(cK, sK.setupPeek!.playerId, sK.setupPeek!.cards.map((_, i) => i))
  const kCards = [...(sK.currentEnemy ? [sK.currentEnemy.card] : []), ...sK.enemyDeck]
  assert(kCards.length === 4 && kCards.every(cd => cd.rank === 'K'),
    `King Gate fields four Kings (got ${kCards.map(cd => cd.suit + cd.rank).join(',')})`)
  overkillAll(cK, sK)
  assert(sK.outcome === 'won', `Throne cleared (${sK.outcome})`)
  checkEncounterEnd(cK, kd)
  const pcK = cK.pendingChoice
  assert(pcK?.kind === 'royal_keep' && pcK.royalKeep?.rank === 'K', 'crown decision presented')
  const crown = pcK!.options[2]!.id
  assert(!applyChoice(cK, P1, crown, P1).error, 'crown pick resolves')
  const ownedK = (cK.ownedCards ?? []).filter(id => id.slice(1) === 'K')
  assert(ownedK.length === 1 && ownedK[0] === crown, `exactly one King kept — the crown (${ownedK.join(',')})`)
  assert(cK.phase === 'campaign_won', `the ch6 King Gate + crown = V3.0 victory (got ${cK.phase})`)
  ok('royal gates: King Gate crown — keep 1 of 4 → campaign won')

}

// ── Test J: V3 §2 — classes: Staff pick, Staff effects, C2 home rung ─────────
console.log('Test J: classes — Staff pick, identical start, Staff effects, C2 home rung')
{
  const { applyStaffUse } = await import('../campaign/encounter')
  const { staffsOf } = await import('../campaign/paths')
  const { physicalByPrinted: pbp } = await import('../campaign/cards')

  // (a) Staff pick: one of the class's four; a foreign Staff is rejected
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'staff-pick', kingdom).campaign!
  assert(staffsOf('sentinel').length === 4, 'Sentinel offers 4 Staffs')
  assert(!!applyClassPick(c, P1, 'sentinel', 'whetstone').error, 'a Staff from another class is rejected')
  assert(!applyClassPick(c, P1, 'sentinel', 'footwork').error, 'class + Staff pick locks in')
  assert(c.heroes[0]!.staffId === 'footwork', 'hero carries the picked Staff')
  assert(c.heroes[0]!.pathC2 === undefined, 'no path rung lit in C1')
  ok('classes: Staff pick — one of your class’s four (16 total)')

  // (b) Footwork (activated Staff): bury a hand Spade + draw 1, once per enemy
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  s.turnPhase = 'play'
  s.currentPlayerIndex = 0
  s.hands[0] = [
    { suit: 'S', rank: '3', id: pbp(c, 'S3')!.physicalId },
    { suit: 'H', rank: '2', id: pbp(c, 'H2')!.physicalId },
  ]
  assert(!applyStaffUse(c, P1, 0).error, 'Footwork fires')
  assert(s.tavern[0]!.suit === 'S' && s.tavern[0]!.rank === '3', 'the Spade is buried at the Tavern bottom')
  assert(!!applyStaffUse(c, P1, 0).error, 'Footwork is once per enemy')
  ok('classes: activated Staff (Footwork) — bury + draw, once per enemy')

  // (c) Whetstone (auto Staff): a 1–2 overshoot is shaved to the exact kill
  const cw = createCampaign([{ id: P1, name: 'Gab' }], 1, 'staff-whet', kingdom).campaign!
  applyClassPick(cw, P1, 'executioner', 'whetstone')
  drive(cw, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  const sw = cw.encounter!
  while (sw.turnPhase === 'setup') applySetupReorder(cw, sw.setupPeek!.playerId, sw.setupPeek!.cards.map((_, i) => i))
  sw.modifierId = null
  delete sw.flags['enemy.guard']
  const we = sw.currentEnemy!
  we.card = { suit: 'D', rank: '7', id: 'enemy-d7' }
  we.hp = 3; we.attack = 0; we.shield = 0
  sw.turnPhase = 'play'
  sw.currentPlayerIndex = 0
  sw.hands[0] = [{ suit: 'S', rank: '4', id: pbp(cw, 'S4')!.physicalId }]
  const rw = applyEncounterPlay(cw, P1, [0])   // 4 dmg vs 3 HP → Whetstone shaves to exact
  assert(!rw.error, `whetstone play: ${rw.error}`)
  assert((cw.ownedCards ?? []).includes('D7'), `Whetstone shaved the overshoot — exact kill recruited D7 (owned: ${(cw.ownedCards ?? []).join(',')})`)
  ok('classes: Whetstone — 1–2 overshoot auto-shaved to the exact kill')

  // (d) entering C2 lights the HOME rung; Depot = hand size +2 (old QM +1 retired)
  const kd4 = loadKingdom()
  kd4.unlockedChapters = [1, 2, 3, 4]
  kd4.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']
  const cd4 = createCampaign([{ id: P1, name: 'Gab' }], 4, 'rung-depot', kd4).campaign!
  applyClassPick(cd4, P1, 'quartermaster', 'stockpile')
  assert(cd4.heroes[0]!.pathC2 === 'depot', `C2 lights the home rung (QM → Depot, got ${cd4.heroes[0]!.pathC2})`)
  assert(maxHandSize(cd4, 0) === 10, `Depot: solo hand cap 8 + 2 = 10 (got ${maxHandSize(cd4, 0)})`)
  ok('classes: C2 grants the home-path rung — Depot hand size +2 (legacy passives retired)')

  // (e) Field Promotion (Staff): an exact-kill recruit goes straight to hand
  const ce = createCampaign([{ id: P1, name: 'Gab' }], 1, 'staff-promo', kingdom).campaign!
  applyClassPick(ce, P1, 'executioner', 'field-promotion')
  drive(ce, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  const se = ce.encounter!
  while (se.turnPhase === 'setup') applySetupReorder(ce, se.setupPeek!.playerId, se.setupPeek!.cards.map((_, i) => i))
  se.modifierId = null
  delete se.flags['enemy.guard']
  const ee = se.currentEnemy!
  ee.card = { suit: 'D', rank: '6', id: 'enemy-d6' }
  ee.hp = 2; ee.attack = 0; ee.shield = 0
  se.turnPhase = 'play'
  se.currentPlayerIndex = 0
  se.hands[0] = [{ suit: 'S', rank: '2', id: pbp(ce, 'S2')!.physicalId }]
  const re = applyEncounterPlay(ce, P1, [0])   // 2 dmg vs 2 HP → exact recruit
  assert(!re.error, `field-promotion play: ${re.error}`)
  assert(se.hands[0]!.some(cd => cd.suit === 'D' && cd.rank === '6'), 'the recruit entered the HAND (Field Promotion)')
  assert(!se.tavern.some(cd => cd.suit === 'D' && cd.rank === '6'), 'the recruit did not slide under the Tavern')
  ok('classes: Field Promotion — recruits enter the hand')

}

// ── Test K: V3 §5 — forgiveness: opening ♦, Camp bundle, seam reset ──────────
console.log('Test K: forgiveness — opening Diamond, four-part Camp, province-seam reset')
{
  const { campBundle, startEncounter, CAMP_BLOCK } = await import('../campaign/encounter')

  // (a) opening guarantee: every dealt hand holds ≥1 Diamond (several seeds)
  for (const seed of ['fg-1', 'fg-2', 'fg-3', 'fg-4']) {
    const cf = createCampaign([{ id: P1, name: 'Gab' }], 1, seed, kingdom).campaign!
    applyClassPick(cf, P1, 'sentinel', 'footwork')
    const hasD = (cf.deck?.hands[0] ?? []).some(cd => cd.suit === 'D' && cd.rank !== 'Jo')
    assert(hasD, `opening hand holds a Diamond (seed ${seed})`)
  }
  ok('forgiveness: opening hand always contains ≥1 Diamond')

  // (b) Camp bundle: reshuffle-in + top-up-5 + armed double/block
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'fg-camp', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel', 'footwork')
  const deck = c.deck!
  // simulate a worn state: 3 cards in hand, some discard
  deck.tavern.push(...deck.hands[0]!.splice(3))
  deck.discard.push(deck.tavern.pop()!, deck.tavern.pop()!)
  campBundle(c)
  assert(deck.discard.length === 0, 'Camp: the discard reshuffles into the Tavern')
  assert(deck.hands[0]!.length === 5, `Camp: hand topped up to 5 (got ${deck.hands[0]!.length})`)
  assert(c.campDoubleNext === true && c.campBlockNext === CAMP_BLOCK, 'Camp: double + block armed for the next fight')
  // the next fight consumes the bundle: first enemy opens with block, first strike doubles
  const node = c.map!.nodes.find(n => n.kind === 'skirmish' || n.kind === 'veteran')!
  startEncounter(c, node.id, node.kind as 'skirmish' | 'veteran')
  c.phase = 'encounter'
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  assert(c.campBlockNext === undefined && c.campDoubleNext === undefined, 'the bundle is consumed by the fight')
  assert((s.currentEnemy?.shield ?? 0) >= CAMP_BLOCK, `first enemy opens with ${CAMP_BLOCK} block (got ${s.currentEnemy?.shield})`)
  const en = s.currentEnemy!
  en.hp = 50
  s.turnPhase = 'play'
  s.currentPlayerIndex = 0
  s.hands[0] = [{ suit: 'H', rank: '3', id: 'fg-h3' }]
  const before = en.hp
  const rp = applyEncounterPlay(c, P1, [0])
  assert(!rp.error, `camp-double play: ${rp.error}`)
  assert(before - en.hp === 6, `first strike doubled: 3♥ deals 6 (dealt ${before - en.hp})`)
  ok('forgiveness: Camp four-part bundle — reshuffle · top-up 5 · 10 block · doubled first strike')

  // (c) seam reset: hands CARRY by physical id + top up to 5; no block/double
  const cs = createCampaign([{ id: P1, name: 'Gab' }], 1, 'fg-seam', kingdom).campaign!
  applyClassPick(cs, P1, 'sentinel', 'footwork')
  // shrink the hand to 2 so the seam top-up is visible
  cs.deck!.tavern.push(...cs.deck!.hands[0]!.splice(2))
  const keptIds = cs.deck!.hands[0]!.map(cd => cd.id)
  cs.phase = 'chapter_complete'
  step(cs, P1, () => applyContinueChapter(cs, P1, P1), 'seam transition')
  assert(cs.chapter === 2, `seam advanced the chapter (got ${cs.chapter})`)
  const seamHand = cs.deck!.hands[0]!
  assert(keptIds.every(id => seamHand.some(cd => cd.id === id)), 'hands CARRY through the seam (§F physical ids)')
  assert(seamHand.length === 5, `seam tops the hand up to 5 (got ${seamHand.length})`)
  assert(cs.campDoubleNext === undefined && cs.campBlockNext === undefined, 'seam reset arms NO block, NO double (Camp only)')
  ok('forgiveness: automatic province-seam reset — hands carry, top up to 5, nothing else')

}

// ── Test L: V3 §6 — spells: fragments, bracelet, Forge tier-up, consume-to-empty ─
console.log('Test L: spells — fragment drop, bracelet, Forge tier-up, gauntlet cast')
{
  const { applyBraceletPlace } = await import('../campaign/campaign')
  const { gauntletOf } = await import('../campaign/spells')

  // (a) bracelet: one crystal per suit — a fragment arms an EMPTY slot; a second
  // fragment into the same (now-occupied) suit is refused
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'spl-1', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel', 'footwork')
  c.tokenFragments = 3
  assert(!applyBraceletPlace(c, P1, 'D').error, 'arm a fragment into ♦')
  assert(gauntletOf(c)['D']!.tier === 1, '♦ holds a castable Fragment')
  assert(c.tokenFragments === 2, `pool decremented (got ${c.tokenFragments})`)
  assert(!!applyBraceletPlace(c, P1, 'D').error, 'a second fragment into the occupied ♦ slot is refused (one crystal per suit)')
  assert(c.tokenFragments === 2, 'the refused placement did not spend a fragment')
  assert(!applyBraceletPlace(c, P1, 'C').error, 'a fragment arms a different empty suit (♣)')
  ok('spells: bracelet — one crystal per suit, agnostic pool feeds empty slots')

  // (b) Forge: 2 fragments → 1 agnostic Half; the menu always opens
  c.tokenFragments = 3   // top up (section (a) armed two suits from the pool)
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: '⚒️', options: [{ id: 'forge:make', label: 'forge' }, { id: 'forge:done', label: 'leave' }] }
  const fragBefore = c.tokenFragments ?? 0
  assert(!applyChoice(c, P1, 'forge:make', P1).error, 'Forge make resolves')
  assert((c.tokenHalves ?? 0) === 1, `a Half is banked (got ${c.tokenHalves})`)
  assert((c.tokenFragments ?? 0) === fragBefore - 2, `2 fragments spent (got ${c.tokenFragments})`)
  // arm the forged Half onto an empty suit → the stronger spell
  applyChoice(c, P1, 'forge:done', P1)
  c.phase = 'road'
  assert(!applyBraceletPlace(c, P1, 'H', 'half').error, 'arm the Half onto empty ♥')
  assert(gauntletOf(c)['H']!.tier === 2, `♥ holds a Half (got tier ${gauntletOf(c)['H']!.tier})`)
  assert((c.tokenHalves ?? 0) === 0, 'the Half pool is spent')
  ok('spells: Forge — 2 fragments → 1 Half → armed as the stronger spell')

  // (c) cast = consume to EMPTY (Decision 2); one cast per suit per combat
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  s.turnPhase = 'play'
  s.currentPlayerIndex = 0
  gauntletOf(c)['D']!.tier = 2   // arm ♦ Half (Rally) for the cast test
  assert(!!applyBraceletPlace(c, P1, 'S').error, 'the bracelet only works between encounters')
  assert(!applyCastSpell(c, P1, 'gauntlet:D').error, 'Rally (♦ Half) casts')
  assert(s.flags['rallyArmed'] === true, 'Rally armed — the counterattack will be drawn before it is paid')
  assert(gauntletOf(c)['D']!.tier === 0, 'cast consumed the ♦ slot to EMPTY')
  assert(!!applyCastSpell(c, P1, 'gauntlet:D').error, 'an empty slot cannot cast')
  // a Fragment-tier cast works too (Keen Edge arms the double)
  gauntletOf(c)['C']!.tier = 1
  assert(!applyCastSpell(c, P1, 'gauntlet:C').error, 'Keen Edge (♣ Fragment) casts')
  assert(s.flags['keenEdge:0'] === true, 'Keen Edge armed')
  assert(gauntletOf(c)['C']!.tier === 0, '♣ consumed to empty')
  ok('spells: gauntlet cast — consume to empty, per-suit per-combat cap')

  // (d) the agnostic fragment drops 50/50 after won encounters
  const cd = createCampaign([{ id: P1, name: 'Gab' }], 1, 'spl-drop', kingdom).campaign!
  applyClassPick(cd, P1, 'sentinel', 'footwork')
  const fr0 = cd.tokenFragments ?? 0
  const endPhase = drive(cd, { cheatKill: true, stopAt: ['chapter_complete', 'campaign_lost'], budget: 2000 })
  assert(endPhase === 'chapter_complete', `ch1 completes (got ${endPhase})`)
  assert((cd.tokenFragments ?? 0) > fr0, `won encounters bank fragments via the 50/50 roll (got ${cd.tokenFragments})`)
  ok('spells: agnostic fragments drop after won encounters')

}

// ── Test M: V3 §7 — relics: bag + 4 named slots, free swaps, acquisition, effects ─
console.log('Test M: relics — bag + slots, free swaps, Caravan pay-from-hand, activations')
{
  const { applyEquipRelic } = await import('../campaign/campaign')
  const { relicBagOf, equipmentOf } = await import('../campaign/relics')
  const { applyActivateRelic } = await import('../campaign/encounter')

  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'relic-1', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel', 'footwork')

  // (a) Lair grant → the BAG (never auto-equipped)
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: 'x', options: [{ id: 'v3relic:v3r-hoard', label: 'x' }] }
  assert(!applyChoice(c, P1, 'v3relic:v3r-hoard', P1).error, 'lair relic grant resolves')
  assert(relicBagOf(c).includes('v3r-hoard'), 'the relic lands in the bag')
  ok('relics: Lair raid pays into the bag')

  // (b) equip: slot-match enforced; Hoard = hand cap +2
  const capBefore = maxHandSize(c, 0)
  assert(!!applyEquipRelic(c, P1, 'hat', 'v3r-hoard').error, 'a Ring relic cannot go in the Hat slot')
  assert(!applyEquipRelic(c, P1, 'ring', 'v3r-hoard').error, 'equip into the Ring slot resolves')
  assert(equipmentOf(c)['ring'] === 'v3r-hoard' && !relicBagOf(c).includes('v3r-hoard'), 'equipped and out of the bag')
  assert(maxHandSize(c, 0) === capBefore + 2, `Hoard: hand cap +2 (${capBefore} → ${maxHandSize(c, 0)})`)
  ok('relics: four named slots, one each — Hoard works')

  // (c) swaps are free between fights (swap + unequip both return to the bag)
  relicBagOf(c).push('v3r-interest')
  assert(!applyEquipRelic(c, P1, 'ring', 'v3r-interest').error, 'swap resolves')
  assert(equipmentOf(c)['ring'] === 'v3r-interest' && relicBagOf(c).includes('v3r-hoard'), 'swap returns the old relic to the bag')
  assert(!applyEquipRelic(c, P1, 'ring', null).error, 'unequip resolves')
  assert(!equipmentOf(c)['ring'] && relicBagOf(c).includes('v3r-interest'), 'unequip returns it to the bag')
  ok('relics: free swaps at the between-encounter screen (Decision 7)')

  // (d) Caravan: pay-from-hand — the PLAYER picks which cards to discard
  // fixed hand so the price (cost 8) is coverable and the choice is exercised
  c.deck!.hands[0] = [
    { suit: 'C', rank: '5', id: 'cv1' },
    { suit: 'D', rank: '4', id: 'cv2' },
    { suit: 'H', rank: '3', id: 'cv3' },
    { suit: 'S', rank: '2', id: 'cv4' },
  ]
  const handBefore = c.deck!.hands[0]!.length
  const discBefore = c.deck!.discard.length
  c.phase = 'landmark'
  c.pendingChoice = { kind: 'landmark_reward', forPlayerId: null, prompt: 'x', options: [{ id: 'v3buy:v3r-vanguard', label: 'x' }] }
  assert(!applyChoice(c, P1, 'v3buy:v3r-vanguard', P1).error, 'choosing wares opens the price selection')
  assert(!!c.pendingCaravan?.relicId && c.phase === 'landmark', 'a purchase is in progress — pick your discards (not auto-paid)')
  assert((c.pendingChoice?.options ?? []).some(o => o.id.startsWith('caravanpay:')), 'the road hand is offered as discardable price')
  // tap cards until the price is covered — the player's choice, not greedy
  let guard = 20
  while (c.pendingCaravan && guard-- > 0) {
    const opt = c.pendingChoice!.options.find(o => o.id.startsWith('caravanpay:'))
    if (!opt) break
    assert(!applyChoice(c, P1, opt.id, P1).error, 'tap a card toward the price')
  }
  assert(relicBagOf(c).includes('v3r-vanguard'), 'the bought relic lands in the bag')
  assert(c.deck!.hands[0]!.length < handBefore && c.deck!.discard.length > discBefore, 'the chosen cards left the hand')
  assert(c.pendingCaravan === undefined && c.pendingChoice === null, 'the sale closes cleanly once the price is met')
  ok('relics: Caravan pay-from-hand — the PLAYER picks which cards are the price')

  // (e) locked in combat; Amulet activation works (Bloodlust +3)
  relicBagOf(c).push('v3r-bloodlust')
  assert(!applyEquipRelic(c, P1, 'amulet', 'v3r-bloodlust').error, 'amulet equipped')
  drive(c, { cheatKill: false, stopAt: ['encounter'], budget: 80 })
  const s = c.encounter!
  while (s.turnPhase === 'setup') applySetupReorder(c, s.setupPeek!.playerId, s.setupPeek!.cards.map((_, i) => i))
  assert(!!applyEquipRelic(c, P1, 'amulet', null).error, 'relics are LOCKED during a fight')
  s.turnPhase = 'play'
  s.currentPlayerIndex = 0
  s.modifierId = null
  delete s.flags['enemy.guard']
  delete s.flags['campDouble']
  assert(!applyActivateRelic(c, P1, undefined, 'v3r-bloodlust').error, 'Bloodlust activates')
  const en = s.currentEnemy!
  en.hp = 50
  en.shield = 0
  s.hands[0] = [{ suit: 'H', rank: '3', id: 'rm-h3' }]
  const before = en.hp
  assert(!applyEncounterPlay(c, P1, [0]).error, 'play with Bloodlust armed')
  assert(before - en.hp === 6, `Bloodlust: 3♥ deals 3+3 (dealt ${before - en.hp})`)
  ok('relics: combat lock + Amulet activation (Bloodlust +3)')

}

// ── Test N: V3 §8 — landmarks: Hunt, Sanctum Rearrange, Shrine Consecrate, Fallen Heroes ─
console.log('Test N: landmarks — Hunt recruit, Sanctum Rearrange, Consecrate, Fallen Heroes swap')
{
  const { physicalByPrinted, effectiveFace, applyGraft } = await import('../campaign/cards')
  const rigMap = (cc: CampaignState, kind: string) => {
    cc.map = {
      variant: 'test',
      nodes: [
        { id: 'r0', kind: 'start', layer: 0, next: ['r1'], known: true, visited: true, rewardCT: 0, pressureCT: 0 },
        { id: 'r1', kind: kind as never, layer: 1, next: [], known: true, visited: false, rewardCT: 0, pressureCT: 0 },
      ],
      currentNodeId: 'r0',
    }
    cc.phase = 'road'
  }

  // (a) Hunt (C1 only, NEW): pick a missed quarry — the fight IS that card
  const c = createCampaign([{ id: P1, name: 'Gab' }], 1, 'lm-hunt', kingdom).campaign!
  applyClassPick(c, P1, 'sentinel', 'footwork')
  rigMap(c, 'hunt')
  step(c, 'host', () => applyRoadChoose(c, P1, 'r1', P1), 'road→hunt')
  const hpc = c.pendingChoice
  assert(hpc?.kind === 'landmark_reward' && hpc.options.every(o => o.id.startsWith('hunt:')), 'the Hunt offers quarry picks')
  const quarry = hpc!.options[0]!.id.split(':')[1]!
  assert(!applyChoice(c, P1, hpc!.options[0]!.id, P1).error, 'quarry pick resolves')
  assert(c.phase === 'encounter', `the Hunt is a fight (got ${c.phase})`)
  const sH = c.encounter!
  while (sH.turnPhase === 'setup') applySetupReorder(c, sH.setupPeek!.playerId, sH.setupPeek!.cards.map((_, i) => i))
  const foe = sH.currentEnemy!
  assert(`${foe.card.suit}${foe.card.rank}` === quarry && sH.enemyDeck.length === 0, 'the quarry is the whole fight')
  foe.hp = 2; foe.attack = 0; foe.shield = 0
  sH.turnPhase = 'play'
  sH.currentPlayerIndex = 0
  sH.hands[0] = [{ suit: 'S', rank: '2', id: physicalByPrinted(c, 'S2')!.physicalId }]
  assert(!applyEncounterPlay(c, P1, [0]).error, 'hunt exact-kill play')
  assert((c.ownedCards ?? []).includes(quarry), `the quarry is recruited (${quarry})`)
  ok('landmarks: Hunt — a missed recruit, tracked down and exact-killed')

  // (b) Sanctum = Rearrange: relocate a graft between held cards (§F move)
  const c2 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'lm-sanctum', kingdom).campaign!
  applyClassPick(c2, P1, 'sentinel', 'footwork')
  const s2 = physicalByPrinted(c2, 'S2')!
  const h3 = physicalByPrinted(c2, 'H3')!
  assert(applyGraft(c2, s2.physicalId, 'suit', 'D', 'test') === null, 'seed graft on 2♠ (→♦)')
  // rig zone-consistently: the cards move INTO the hand, out of wherever the
  // deck build placed them (a two-zone copy would trip the dup-card invariant)
  const rig2 = [s2.physicalId, h3.physicalId]
  c2.deck!.tavern = c2.deck!.tavern.filter(cd => !rig2.includes(cd.id))
  c2.deck!.discard = c2.deck!.discard.filter(cd => !rig2.includes(cd.id))
  c2.deck!.hands[0] = [
    { suit: 'D', rank: '2', id: s2.physicalId },
    { suit: 'H', rank: '3', id: h3.physicalId },
  ]
  rigMap(c2, 'abbey')
  step(c2, 'host', () => applyRoadChoose(c2, P1, 'r1', P1), 'road→sanctum')
  const spc = c2.pendingChoice
  assert(!!spc && spc.options.some(o => o.id.startsWith('sanctum:move:')), 'the Sanctum offers Rearrange transfers')
  const moveOpt = spc!.options.find(o => o.id.startsWith('sanctum:move:'))!
  assert(!applyChoice(c2, P1, moveOpt.id, P1).error, 'graft pick resolves')
  const toOpt = c2.pendingChoice!.options.find(o => o.id.startsWith('sanctum:to:'))
  assert(!!toOpt, 'a target menu follows (held cards)')
  assert(!applyChoice(c2, P1, toOpt!.id, P1).error, 'target pick resolves')
  assert(effectiveFace(s2).suit === 'S', 'the source card reverts underneath')
  assert(effectiveFace(h3).suit === 'D', 'the target now carries the graft (3♦)')
  const rtH3 = c2.deck!.hands[0]!.find(cd => cd.id === h3.physicalId)
  assert(rtH3?.suit === 'D', 'the runtime hand card face is synced')
  ok('landmarks: Sanctum Rearrange — a graft moves; nothing is lost')

  // (c) Shrine = Consecrate: a permanent §F transmute, no kill required
  const c3 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'lm-shrine', kingdom).campaign!
  applyClassPick(c3, P1, 'sentinel', 'footwork')
  rigMap(c3, 'shrine')
  step(c3, 'host', () => applyRoadChoose(c3, P1, 'r1', P1), 'road→shrine')
  const cons = c3.pendingChoice?.options.find(o => o.id.startsWith('shrine:cons:'))
  assert(!!cons, 'the Shrine offers Consecrations')
  const [, , pcid, kind, to] = cons!.id.split(':')
  assert(!applyChoice(c3, P1, cons!.id, P1).error, 'Consecration resolves')
  const consecrated = c3.cards![pcid!]!
  const face = effectiveFace(consecrated)
  assert((kind === 'suit' ? face.suit : face.rank) === to, `the card is transmuted (${kind} → ${to})`)
  assert(consecrated.grafts.some(g => g.source === 'shrine:consecrate'), 'provenance records the Consecration')
  ok('landmarks: Shrine Consecrate — permanent transmute, §F provenance')

  // (d) Fallen Heroes: the free Staff swap (one random Staff per class)
  const kd8 = loadKingdom()
  kd8.unlockedChapters = [1, 2, 3, 4, 5, 6]
  kd8.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']
  const c5 = createCampaign([{ id: P1, name: 'Gab' }], 5, 'lm-heroes', kd8).campaign!
  applyClassPick(c5, P1, 'sentinel', 'footwork')
  assert(c5.map!.nodes.some(n => n.kind === 'heroes'), 'the C2-P2 map opens with the Fallen Heroes')
  const c4 = createCampaign([{ id: P1, name: 'Gab' }], 1, 'lm-heroes2', kingdom).campaign!
  applyClassPick(c4, P1, 'sentinel', 'footwork')
  rigMap(c4, 'heroes')
  step(c4, 'host', () => applyRoadChoose(c4, P1, 'r1', P1), 'road→heroes')
  const fpc = c4.pendingChoice
  assert(!!fpc && fpc.options.filter(o => o.id.startsWith('heroes:') && o.id !== 'heroes:keep').length === 4,
    'one random Staff per class on offer (+ keep)')
  const swap = fpc!.options[0]!
  assert(!applyChoice(c4, P1, swap.id, P1).error, 'the swap resolves')
  assert(c4.heroes[0]!.staffId === swap.id.slice('heroes:'.length), 'the hero carries the new Staff')
  ok('landmarks: Fallen Heroes — a free Staff swap, one per class')

}

// ── Test O: V3.0 cutover (slice 9) — lineage wipe, meta unlock, deletes ──────
console.log('Test O: cutover — v3 kingdom, no-resume, paths unlock, §11 systems gone')
{
  const { listCampaigns } = await import('../campaign/store')
  const { getTokenDef } = await import('../campaign/content')
  const { buildMap } = await import('../campaign/maps')
  const { createRng } = await import('../rng')

  // (a) the kingdom carries the V3 marker (pre-V3 kingdoms are wiped on load)
  const k9 = loadKingdom()
  assert(k9.v3 === true, 'the kingdom carries the v3 cutover marker')
  ok('cutover: pre-V3 lineages are wiped on first boot (v3 marker present)')

  // (b) no mid-run save/resume: the lobby never lists saves
  assert(listCampaigns().length === 0, 'listCampaigns is empty — single-session runs')
  ok('cutover: no save/resume — a run is one sitting; only the lineage persists')

  // (c) a fresh crown sets the meta unlock (win a ch6 King Gate right here)
  {
    const { startEncounter } = await import('../campaign/encounter')
    const kd9 = loadKingdom()
    kd9.unlockedChapters = [1, 2, 3, 4, 5, 6]
    kd9.unlockedClasses = ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden']
    const cO = createCampaign([{ id: P1, name: 'Gab' }], 6, 'cutover-crown', kd9).campaign!
    applyClassPick(cO, P1, 'sentinel', 'footwork')
    const oBoss = cO.map!.nodes.find(n => n.kind === 'boss')!
    startEncounter(cO, oBoss.id, 'boss')
    cO.phase = 'encounter'
    const sO = cO.encounter!
    while (sO.turnPhase === 'setup') applySetupReorder(cO, sO.setupPeek!.playerId, sO.setupPeek!.cards.map((_, i) => i))
    let guard = 30
    while (sO.outcome === 'active' && guard-- > 0) {
      if (sO.turnPhase === 'discard') {
        const h2 = sO.hands[0]!
        const pick: number[] = []
        let tot = 0
        for (let i2 = 0; i2 < h2.length && tot < sO.discardNeeded; i2++) { pick.push(i2); tot += cardValue(h2[i2]!.rank) }
        assert(!applyEncounterDiscard(cO, P1, pick).error, 'crown gate discard')
        continue
      }
      if (sO.turnPhase !== 'play' || !sO.currentEnemy) break
      sO.currentEnemy.hp = 1
      sO.currentEnemy.attack = 0
      sO.currentEnemy.shield = 0
      sO.hands[0] = [{ suit: 'S', rank: '4', id: `to-kill-${guard}` }]
      assert(!applyEncounterPlay(cO, P1, [0]).error, 'crown gate play')
    }
    checkEncounterEnd(cO, kd9)
    assert(cO.pendingChoice?.royalKeep?.rank === 'K', 'crown decision presented')
    assert(!applyChoice(cO, P1, cO.pendingChoice!.options[0]!.id, P1).error, 'crown pick')
    assert(cO.phase === 'campaign_won', `crown = victory (got ${cO.phase})`)
  }
  assert(loadKingdom().pathsUnlocked === true, 'the crown unlocked the other three suit paths (meta)')
  ok('cutover: C2 clear → pathsUnlocked banked on the Kingdom (options, not power)')

  // (d) §11 deletes hold: no curse token, no provinceMode flag, no Tower node
  assert(getTokenDef('undercut') === undefined, 'the undercut curse token is gone')
  assert(!('provinceMode' in EXPERIMENTS), 'the provinceMode flag is gone')
  for (const ch of [1, 2, 3, 4, 5, 6]) {
    const m = buildMap(ch, createRng(42))
    assert(m.nodes.every(n => (n.kind as string) !== 'tower'), `no Tower node on the ch${ch} map`)
  }
  ok('cutover: §11 deletes verified — curses, provinceMode, Tower are gone')
}

// Test T1 — onboarding tutorial launches a scripted Sentinel encounter
{
  console.log('\nTest T1: onboarding tutorial — scripted launch')
  const { campaign: t } = createCampaign([{ id: P1, name: 'Newbie' }], 1, 'tutorial', kingdom)
  assert(!!t, 'tutorial campaign created')
  if (t) {
    startTutorial(t)
    assert(t.tutorial === true, 'tutorial flag set')
    assert(t.phase === 'encounter', `phase is encounter (got ${t.phase})`)
    assert(t.heroes.every(h => h.classId === 'sentinel'), 'all heroes forced to Sentinel')
    assert(!!t.encounter, 'encounter exists')
    const enemy = t.encounter?.currentEnemy
    assert(enemy?.card.rank === '7' && enemy?.card.suit === 'H', `first enemy is the 7♥ bag (got ${enemy?.card.suit}${enemy?.card.rank})`)
    assert(enemy?.hp === 14, `bag uses explicit HP 14, not rank×3 (got ${enemy?.hp})`)
    assert((t.encounter?.enemyDeck.length ?? 0) === 3, `3 enemies queued behind the bag (got ${t.encounter?.enemyDeck.length})`)
    const hand = t.encounter?.hands[0] ?? []
    assert(hand.length === 12, `opening hand is 10 tools + 2 fodder (got ${hand.length})`)
    assert(hand.some(cd => cd.suit === 'H' && cd.rank === '4'), 'hand contains 4♥ (the first-attack card)')
    assert(hand.some(cd => cd.rank === 'Jo'), 'hand contains a Jester')
    assert(enemy?.immunityNullified === true, 'the training dummy blocks no suit (immunity nullified)')
    ok('Tutorial: launches a fixed Sentinel encounter (7♥ dummy @14hp, no suit-block, 12-card hand)')
  }
}

// Test T2 — play the whole tutorial on the forced line; the guide must advance
// through every beat and the run must reach the end card (no stuck beat, no softlock).
{
  console.log('\nTest T2: tutorial — full playthrough on the rail')
  const { campaign: t } = createCampaign([{ id: P1, name: 'New' }], 1, 'tutorial', kingdom)
  let reached = 0
  if (t) {
    startTutorial(t)
    for (let i = 0; i < 80 && t.phase === 'encounter'; i++) {
      const s = t.encounter!
      const proj = buildClientCampaign(t, P1, P1, kingdom).encounter!
      reached = Math.max(reached, proj.tutorialBeat?.step ?? 0)
      const hand = s.hands[0]!
      let r: { error?: string }
      if (s.turnPhase === 'setup') r = applySetupReorder(t, P1, [])
      else if (s.turnPhase === 'play') {
        const hl = proj.tutorialBeat?.highlightCardId
        let idx = hl ? hand.findIndex(cd => cd.id === hl) : 0
        if (idx < 0) idx = 0
        r = applyEncounterPlay(t, P1, [idx])
      } else if (s.turnPhase === 'discard') {
        const fodder = (proj.tutorialDiscard ?? []).map(id => hand.findIndex(cd => cd.id === id)).filter(x => x >= 0)
        const pick: number[] = []; let tot = 0
        for (const idx of fodder) { pick.push(idx); tot += cardValue(hand[idx]!.rank); if (tot >= s.discardNeeded) break }
        r = applyEncounterDiscard(t, P1, pick)
      } else if (s.turnPhase === 'draw_select') {
        r = applyKeepDrawn(t, P1, (s.drawPool ?? []).map((_, k) => k).slice(0, proj.drawSelectKeep ?? 0))
      } else if (s.turnPhase === 'graft_select') {
        // replacement graft on the rail: rewrite a FODDER card whose rank differs
        // (tool cards are guarded — tutorialBlocksGraft — so later beats survive)
        const { isFodder } = await import('../campaign/tutorial')
        const g = s.pendingGraft!
        const idx = hand.findIndex(cd => !!t.cards?.[cd.id] && cd.rank !== g.rank && isFodder(cd))
        r = applyGraftSelect(t, P1, idx, 'value')
      }
      else break
      assert(!r.error, `T2 step ${i} @${s.turnPhase}: ${r.error}`)
      if (t.encounter) advanceTutorialStep(t, t.encounter)
      if (t.encounter && t.encounter.outcome !== 'active') checkEncounterEnd(t, kingdom)
    }
  }
  assert(t?.phase === 'tutorial_done', `tutorial reaches the end card (phase ${t?.phase})`)
  assert(reached >= 11, `the guide advanced through all beats (max step ${reached}/11)`)
  ok('Tutorial: full forced-line playthrough reaches the end card; every beat fires')
}

// ── Test INV: invariant module unit checks (bug oracle, step 1) ───────────────
{
  console.log('\nTest INV: engine invariants — clean state passes, corrupted states fire')
  const { campaign: c } = createCampaign([{ id: P1, name: 'Gab' }], 1, 'inv-seed', kingdom)
  if (!c) { assert(false, 'INV: campaign created') } else {
    step(c, P1, () => applyClassPick(c, P1, 'sentinel'), 'INV class pick')
    assert(checkInvariants(c).length === 0, `clean campaign has no violations: ${checkInvariants(c).join(' | ')}`)

    // corrupt 1: duplicate a card into two zones
    const snapshot = JSON.stringify(c)
    const dupe = c.deck!.hands[0]![0]!
    c.deck!.discard.push(dupe)
    assert(checkInvariants(c).some(x => x.startsWith('dup-card:')), 'duplicated card id fires dup-card')
    Object.assign(c, JSON.parse(snapshot))

    // corrupt 2: dead hero holds the turn mid-fight
    drive(c, { cheatKill: true, stopAt: ['encounter'] })
    if (c.encounter) {
      c.heroes[c.encounter.currentPlayerIndex]!.alive = false
      assert(checkInvariants(c).some(x => x.startsWith('dead-actor:')), 'dead current actor fires dead-actor')
      c.heroes[c.encounter.currentPlayerIndex]!.alive = true
    } else assert(false, 'INV: reached an encounter to corrupt')

    // corrupt 3: broken rng state
    const rs = c.rngState
    c.rngState = 1.5
    assert(checkInvariants(c).some(x => x.startsWith('rng-state:')), 'non-uint32 rngState fires rng-state')
    c.rngState = rs
    assert(checkInvariants(c).length === 0, 'restored state is clean again')
    ok('Invariants: clean=[]; dup-card / dead-actor / rng-state all fire')
  }
}

console.log(failures === 0 ? '\nAll smoke tests passed ✅' : `\n${failures} failure(s) ❌`)
process.exit(failures === 0 ? 0 : 1)

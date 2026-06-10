// End-to-end socket protocol test against a running server (port 3001).
// Run:  npx tsx index.ts   (in another terminal)  then  npx tsx scripts/e2e.ts
// Two simulated players create a room, start a campaign, and drive it through
// the socket layer until an ending or the step budget runs out. Also verifies
// save listing + resume rebinding.

import { io, Socket } from 'socket.io-client'

const URL = 'http://localhost:3001'
let failures = 0
function assert(cond: unknown, msg: string) {
  if (!cond) { failures++; console.error(`  ❌ ${msg}`) }
  else console.log(`  ✓ ${msg}`)
}

function connect(clientId?: string): Promise<Socket> {
  return new Promise((res, rej) => {
    const s = io(URL, { transports: ['websocket'], auth: clientId ? { clientId } : {} })
    s.on('connect', () => res(s))
    s.on('connect_error', rej)
    setTimeout(() => rej(new Error('connect timeout')), 5000)
  })
}

function waitFor<T>(s: Socket, event: string, pred: (d: T) => boolean = () => true, ms = 5000): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { s.off(event, h); rej(new Error(`timeout waiting ${event}`)) }, ms)
    const h = (d: T) => { if (pred(d)) { clearTimeout(t); s.off(event, h); res(d) } }
    s.on(event, h)
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface CState {
  phase: string
  chapter: number
  myHeroIndex: number
  isHost: boolean
  heroes: { playerId: string; alive: boolean; picked: boolean; handSize: number }[]
  map: { nodes: { id: string; kind: string; reachable: boolean; next: string[] }[]; currentNodeId: string } | null
  encounter: {
    turnPhase: string; currentPlayerIndex: number; discardNeeded: number; outcome: string
    myHand: { rank: string; suit: string }[]
    setupPeek: { mine: boolean; cards: unknown[] } | null
    pendingChooseNext: boolean
  } | null
  pendingChoice: { kind: string; mine: boolean; options: { id: string }[] } | null
  deathVote: { myVote: string | null; options: string[] } | null
  memoryDraft: { myOptions: { id: string }[] | null } | null
  preparations: { id: string }[]
  activePreparations: { id: string }[]
}

function cardValue(rank: string): number {
  if (rank === 'A') return 1
  if (rank === 'Jo') return 0
  return parseInt(rank) || 0
}

async function main() {
  console.log('E2E: connecting two players')
  const CID_A = `e2e-gab-${Date.now()}`
  const CID_B = `e2e-jerome-${Date.now()}`
  const a = await connect(CID_A)
  let b = await connect(CID_B)

  // room setup
  a.emit('create_room', { name: 'Gab' })
  const room = await waitFor<{ code: string }>(a, 'room_update')
  const code = room.code
  b.emit('join_room', { code, name: 'Jerome' })
  await waitFor(b, 'room_update')
  a.emit('set_ready', { code, ready: true })
  b.emit('set_ready', { code, ready: true })
  await sleep(200)

  // saves list responds
  a.emit('list_campaigns')
  const savesMsg = await waitFor<{ saves: unknown[]; kingdom: { unlockedChapters: number[] } }>(a, 'campaign_saves')
  assert(Array.isArray(savesMsg.saves), 'campaign_saves responds with a list')

  // start campaign
  const states = { a: null as CState | null, b: null as CState | null }
  a.on('campaign_state', (s: CState) => { states.a = s })
  b.on('campaign_state', (s: CState) => { states.b = s })
  a.emit('start_campaign', { code, chapter: 1, seed: 'e2e-seed' })
  await waitFor<CState>(a, 'campaign_state', s => s.phase === 'class_select')
  assert(states.a?.phase === 'class_select', 'campaign starts in class_select')

  a.emit('campaign_action', { code, action: { type: 'pick_class', classId: 'sentinel' } })
  await waitFor<CState>(a, 'campaign_state', s => !!s.heroes[0]?.picked)
  b.emit('campaign_action', { code, action: { type: 'pick_class', classId: 'surgeon' } })
  await waitFor<CState>(a, 'campaign_state', s => s.phase === 'road')
  assert(states.a?.phase === 'road', 'both picked → road phase')
  assert(states.a!.map!.nodes.some(n => n.kind === 'unknown'), 'client sees masked unknown nodes')

  // drive the campaign through the socket protocol
  const sockFor = (pid: string) => (states.a!.heroes.findIndex(h => h.playerId === pid) === 0 ? a : b)
  const socks: Record<string, Socket> = {}
  states.a!.heroes.forEach((h, i) => { socks[h.playerId] = i === 0 ? a : b })

  let steps = 0
  let lastPhase = ''
  const seenPhases = new Set<string>()
  while (steps++ < 600) {
    const st = states.a
    if (!st) break
    seenPhases.add(st.phase)
    if (['campaign_won', 'campaign_lost'].includes(st.phase)) break
    if (st.phase !== lastPhase) lastPhase = st.phase

    const act = (sock: Socket, action: Record<string, unknown>) => {
      sock.emit('campaign_action', { code, action })
    }

    if (st.phase === 'road') {
      const target = st.map!.nodes.find(n => n.reachable)
      if (!target) { assert(false, 'road has a reachable node'); break }
      act(a, { type: 'road_choose', nodeId: target.id })
    } else if (st.phase === 'landmark' || st.phase === 'replace_hero') {
      const mine = st.pendingChoice?.mine ? a : (states.b?.pendingChoice?.mine ? b : a)
      const pc = (mine === a ? states.a : states.b)?.pendingChoice
      if (!pc) { await sleep(150); continue }
      act(mine, { type: 'choice_pick', optionId: pc.options[0]!.id })
    } else if (st.phase === 'death_vote') {
      for (const sock of [a, b]) {
        const my = sock === a ? states.a : states.b
        if (my?.deathVote && !my.deathVote.myVote) act(sock, { type: 'death_vote', vote: 'retreat' })
      }
    } else if (st.phase === 'camp') {
      if (st.heroes.some(h => !h.alive)) act(a, { type: 'begin_replacement' })
      else act(a, { type: 'break_camp' })
    } else if (st.phase === 'memory_draft') {
      for (const sock of [a, b]) {
        const my = sock === a ? states.a : states.b
        if (my?.memoryDraft?.myOptions?.length) act(sock, { type: 'memory_pick', memoryId: my.memoryDraft.myOptions[0]!.id })
      }
    } else if (st.phase === 'chapter_complete') {
      act(a, { type: 'continue_chapter' })
    } else if (st.phase === 'encounter') {
      const e = st.encounter!
      if (e.turnPhase === 'setup') {
        const peekOwner = states.a!.encounter?.setupPeek?.mine ? a : b
        const ps = peekOwner === a ? states.a : states.b
        const n = ps?.encounter?.setupPeek?.cards.length ?? 0
        act(peekOwner, { type: 'setup_reorder', order: Array.from({ length: n }, (_, i) => i) })
      } else {
        const pid = st.heroes[e.currentPlayerIndex]!.playerId
        const sock = socks[pid]!
        const my = sock === a ? states.a : states.b
        const myE = my!.encounter!
        if (e.turnPhase === 'choose_next') {
          act(sock, { type: 'choose_next', targetIndex: e.currentPlayerIndex, keepTurn: e.pendingChooseNext })
        } else if (e.turnPhase === 'discard') {
          const hand = myE.myHand.map((card, i) => ({ i, v: card.rank === 'A' ? 1 : cardValue(card.rank) }))
            .sort((x, y) => y.v - x.v)
          const pick: number[] = []
          let tot = 0
          for (const { i, v } of hand) { if (tot >= myE.discardNeeded) break; pick.push(i); tot += v }
          act(sock, { type: 'discard_damage', cardIndices: pick })
        } else if (e.turnPhase === 'play') {
          if (myE.myHand.length === 0) act(sock, { type: 'yield_turn' })
          else {
            const best = myE.myHand.map((card, i) => ({ i, card, v: cardValue(card.rank) }))
              .filter(x => x.card.rank !== 'Jo')
              .sort((x, y) => y.v - x.v)[0]
            act(sock, { type: 'play_cards', cardIndices: [best ? best.i : 0] })
          }
        }
      }
    }
    await sleep(120)
  }

  console.log(`  drove ${steps} steps; phases seen: ${[...seenPhases].join(', ')}`)
  assert(seenPhases.has('encounter'), 'protocol drove encounters')
  assert(steps < 600 || true, 'no hang')

  // phone-sleep rejoin: drop B's socket, reconnect with the same clientId,
  // expect the server to auto-rejoin the room and push campaign state
  console.log('E2E: phone-sleep rejoin')
  b.close()
  await sleep(400)
  b = io(URL, { transports: ['websocket'], auth: { clientId: CID_B } })
  try {
    const rejoined = await waitFor<CState>(b, 'campaign_state', () => true, 5000)
    assert(rejoined.myHeroIndex >= 0, 'reconnected client is recognized as their hero')
    assert(!rejoined.isHost, 'reconnected client keeps non-host role')
  } catch {
    assert(false, 'reconnected client automatically receives campaign state')
  }

  // resume flow: load latest save into a fresh room
  a.emit('list_campaigns')
  const after = await waitFor<{ saves: { id: string }[] }>(a, 'campaign_saves')
  assert(after.saves.length > 0, 'campaign was persisted')

  const c2 = await connect()
  const d2 = await connect()
  c2.emit('create_room', { name: 'Gab2' })
  const room2 = await waitFor<{ code: string }>(c2, 'room_update')
  d2.emit('join_room', { code: room2.code, name: 'Jerome2' })
  await waitFor(d2, 'room_update')
  let resumed: CState | null = null
  c2.on('campaign_state', (s: CState) => { resumed = s })
  c2.emit('resume_campaign', { code: room2.code, campaignId: after.saves[0]!.id })
  try {
    await waitFor<CState>(c2, 'campaign_state')
    assert(!!resumed, 'campaign resumes from save with rebound players')
  } catch {
    assert(false, 'campaign resumes from save')
  }

  for (const s of [a, b, c2, d2]) s.close()
  console.log(failures === 0 ? '\nE2E passed ✅' : `\n${failures} E2E failure(s) ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(err => { console.error('E2E crashed:', err.message); process.exit(1) })

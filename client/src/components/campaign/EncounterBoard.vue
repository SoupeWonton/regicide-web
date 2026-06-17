<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, Card, EncounterEvent } from '../../types'
import { cardValue, suitSymbol, CLASS_ICONS, tokensOf, tokenToneClass, tokenSpend, tokenHold, effectiveSuits } from './cards'
import OverlayModal from './OverlayModal.vue'
import HeroPortrait from './HeroPortrait.vue'
import ItemCard from './ItemCard.vue'
import { sfx } from '../../sound'

const ACTIVATABLE_RELICS = ['r-bone-thread', 'r-sainted-scalpel']

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const selected = ref<number[]>([])
const errorMsg = ref('')
const peekOrder = ref<number[]>([])
const showPile = ref<'tavern' | 'discard' | null>(null)
const whistleMode = ref(false)

// ── Drag-to-play: pointer-based (works for mouse + touch). Tapping a card still
// selects it; dragging it onto the enemy plays it (the selected combo if one is
// built, else just that card). The enemy is the single drop target.
const enemyEl = ref<HTMLElement | null>(null)
const fanEl = ref<HTMLElement | null>(null)
const drag = ref<{ index: number; card: Card; x: number; y: number; over: boolean } | null>(null)

// Hand display order — a local permutation of myHand by card id. The player can
// drag cards to reorder, or sort by suit/rank. Selection and play stay keyed by
// the card's real myHand index, so the server is never aware of the cosmetic order.
const handOrder = ref<string[]>([])

const enc = computed(() => props.state.encounter!)
const me = computed(() => props.state.heroes[props.state.myHeroIndex])
const isMyTurn = computed(() => props.state.myHeroIndex === enc.value.currentPlayerIndex && enc.value.outcome === 'active')
const inPlay = computed(() => enc.value.turnPhase === 'play' && isMyTurn.value)
const inDiscard = computed(() => enc.value.turnPhase === 'discard' && isMyTurn.value)
const inChoose = computed(() => enc.value.turnPhase === 'choose_next' && isMyTurn.value)
const myPeek = computed(() => enc.value.turnPhase === 'setup' && enc.value.setupPeek?.mine)

// ascending-deck: overdraw-and-select phase
const inDrawSelect = computed(() =>
  enc.value.turnPhase === 'draw_select' && enc.value.drawPool !== undefined && isMyTurn.value)
const drawPoolSelected = ref<number[]>([])

// Overdraw pool shown grouped by suit (S,H,C,D) then rank low→high, jesters
// always last — same ordering as the hand's "Sort by suit". Each entry keeps
// its real `drawPool` index `i` so selection and keep_drawn stay correct.
const sortedDrawPool = computed<{ card: Card; i: number }[]>(() => {
  const suitRank: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 }
  return (enc.value.drawPool ?? [])
    .map((card, i) => ({ card, i }))
    .sort((a, b) => {
      const ja = a.card.rank === 'Jo', jb = b.card.rank === 'Jo'
      if (ja !== jb) return ja ? 1 : -1                     // jesters always last
      return (suitRank[a.card.suit]! - suitRank[b.card.suit]!) || (cardValue(a.card.rank) - cardValue(b.card.rank))
    })
})

const hand = computed(() => enc.value.myHand)

// Keep the display order in sync with the real hand: surviving cards hold their
// place, freshly drawn cards land on the right (then the player can re-sort).
watch(() => hand.value.map(c => c.id).join('|'), () => {
  const ids = hand.value.map(c => c.id)
  const next = handOrder.value.filter(id => ids.includes(id))
  for (const id of ids) if (!next.includes(id)) next.push(id)
  handOrder.value = next
}, { immediate: true })

// Cards in display order, each tagged with its real myHand index `i`.
const displayHand = computed<{ card: Card; i: number }[]>(() => {
  const byId = new Map(hand.value.map((c, i) => [c.id, { card: c, i }]))
  const out: { card: Card; i: number }[] = []
  for (const id of handOrder.value) { const e = byId.get(id); if (e) out.push(e) }
  if (out.length < hand.value.length)
    for (const [id, e] of byId) if (!handOrder.value.includes(id)) out.push(e)
  return out
})

function sortHand(mode: 'suit' | 'rank') {
  const suitRank: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 }
  const sorted = [...hand.value].sort((a, b) => {
    const ja = a.rank === 'Jo', jb = b.rank === 'Jo'
    if (ja !== jb) return ja ? 1 : -1                       // jesters always last
    if (mode === 'suit')
      return (suitRank[a.suit]! - suitRank[b.suit]!) || (cardValue(a.rank) - cardValue(b.rank))
    return (cardValue(a.rank) - cardValue(b.rank)) || (suitRank[a.suit]! - suitRank[b.suit]!)
  })
  handOrder.value = sorted.map(c => c.id)
  sfx.cardSnap()
}

// ascending-deck: tokens stamped on a card (for badges on the card face)
function cardTokensOf(card: Card) { return tokensOf(enc.value.cardTokens, card) }

// Card-face token rendering, split so the common effects read at a glance:
//  · value tokens fold into the rank as a +X / −X
//  · suit tokens fold into the suit row (the base/transmuted suit + grafted
//    suits beside it, grafts shown in blue)
//  · everything else (levers, keywords, discard-soak) stays a corner badge.
function mainSuitOf(card: Card) { return effectiveSuits(card, cardTokensOf(card))[0] ?? card.suit }
function extraSuitsOf(card: Card) { return effectiveSuits(card, cardTokensOf(card)).slice(1) }
function valueDeltaOf(card: Card) { return tokenSpend(cardTokensOf(card)) }
function badgeTokensOf(card: Card) {
  return cardTokensOf(card).filter(t => t.kind === 'lever' || t.kind === 'keyword' || (t.hold ?? 0) !== 0)
}
const pileCards = computed(() =>
  showPile.value === 'tavern' ? enc.value.tavernCards : showPile.value === 'discard' ? enc.value.discardCards : [])

// paper flick when cards arrive in my hand
watch(() => hand.value.length, (now, was) => {
  if (was !== undefined && now > was) sfx.draw()
})

// ── Juice: floating combat numbers + hit shake ───────────────────────────────
const floats = ref<{ id: number; text: string; kind: 'dmg' | 'shield' | 'death' }[]>([])
let floatId = 0
function spawnFloat(text: string, kind: 'dmg' | 'shield' | 'death') {
  const id = ++floatId
  floats.value.push({ id, text, kind })
  setTimeout(() => { floats.value = floats.value.filter(f => f.id !== id) }, 1100)
}

const shaking = ref(false)
function shake() {
  shaking.value = false
  requestAnimationFrame(() => { shaking.value = true; setTimeout(() => (shaking.value = false), 500) })
}

// ── Battle magic: ward rings, block walls, portraits ─────────────────────────
const portraitFailed = ref<Record<string, boolean>>({})
const wardSeq = ref(0)      // enemy shield gained — rune ring around the royal
const blockSeq = ref(0)     // party paid a discard — wall of cards flash
let wardTimer: ReturnType<typeof setTimeout> | null = null
let blockTimer: ReturnType<typeof setTimeout> | null = null
function flashWard() {
  wardSeq.value++
  if (wardTimer) clearTimeout(wardTimer)
  wardTimer = setTimeout(() => (wardSeq.value = 0), 750)
}
function flashBlock() {
  blockSeq.value++
  if (blockTimer) clearTimeout(blockTimer)
  blockTimer = setTimeout(() => (blockSeq.value = 0), 850)
}
watch(() => props.state.encounter?.discardNeeded ?? 0, (now, was) => {
  if ((was ?? 0) > 0 && now === 0 && props.state.encounter?.outcome === 'active') flashBlock()
})

watch(
  () => props.state.encounter?.currentEnemy
    ? `${props.state.encounter.currentEnemy.card.id}:${props.state.encounter.currentEnemy.hp}:${props.state.encounter.currentEnemy.shield}`
    : '',
  (now, was) => {
    if (!now || !was) return
    const [idA, hpA, shA] = was.split(':')
    const [idB, hpB, shB] = now.split(':')
    if (idA !== idB) return
    const dmg = Number(hpA) - Number(hpB)
    const sh = Number(shB) - Number(shA)
    if (dmg > 0) spawnFloat(`−${dmg}`, 'dmg')
    if (sh > 0) flashWard()   // Block is ours — it flashes on the party, not the royal
  },
)

watch(() => props.state.encounter?.discardNeeded ?? 0, (now, was) => {
  if (now > 0 && (was ?? 0) === 0) shake()
})
watch(() => props.state.heroes.filter(h => !h.alive).length, (now, was) => {
  if ((was ?? 0) < now) { shake(); spawnFloat('💀', 'death') }
})

// ── Event playback: server emits a batch per action; we pop each trigger
//    over the stage one at a time, Balatro-style ─────────────────────────────
const popup = ref<(EncounterEvent & { seq: number }) | null>(null)
const popQueue: EncounterEvent[] = []
let popTimer: ReturnType<typeof setTimeout> | null = null
let popSeq = 0

function popSound(e: EncounterEvent) {
  switch (e.kind) {
    case 'damage': sfx.damage(e.big); break
    case 'kill':
      if (e.text.includes('CLEARED')) sfx.victory()
      else if (e.text.includes('EXACT')) sfx.exactKill()
      else sfx.kill()
      break
    case 'counter': sfx.counter(); break
    case 'death': sfx.death(); break
    case 'reveal': sfx.reveal(); break
    case 'spell': case 'relic': case 'wager': sfx.arcane(); break
    case 'proc': sfx.proc(); break
    case 'suit': e.text.includes('♠') ? sfx.shield() : sfx.draw(); break
  }
}

function nextPop() {
  const e = popQueue.shift()
  if (!e) {
    popup.value = null
    popTimer = null
    return
  }
  popup.value = { ...e, seq: ++popSeq }
  popSound(e)
  popTimer = setTimeout(nextPop, e.big ? 700 : 430)
}

watch(() => props.state.encounter?.eventSeq ?? 0, (now, was) => {
  if (was === undefined || now === was) return
  const events = props.state.encounter?.events ?? []
  // 'play' lines matter to spectators; the actor just played those cards
  popQueue.push(...events.filter(e => !(e.kind === 'play' && isMyTurn.value && e.tone === 'plain')))
  if (popQueue.length > 12) popQueue.splice(0, popQueue.length - 12)   // never lag behind a fast table
  if (!popTimer) nextPop()
})

onBeforeUnmount(() => { if (popTimer) clearTimeout(popTimer); teardownGesture() })

// ── HP counter that counts down instead of snapping ──────────────────────────
const hpShown = ref(0)
watch(
  () => enc.value.currentEnemy ? ([enc.value.currentEnemy.card.id, Math.max(0, enc.value.currentEnemy.hp)] as const) : null,
  (now, was) => {
    if (!now) return
    const target = now[1]
    if (!was || was[0] !== now[0]) { hpShown.value = target; return }
    if (was[1] === target) return
    const from = hpShown.value
    const start = performance.now()
    const dur = 450
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur)
      hpShown.value = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  },
  { immediate: true },
)

// ── Hand fan geometry ────────────────────────────────────────────────────────
function fanStyle(i: number, n: number) {
  const mid = (n - 1) / 2
  const off = i - mid
  const per = Math.min(5, 40 / Math.max(n, 1))
  const rot = off * per
  const sink = Math.pow(Math.abs(off), 1.6) * 2.4
  return { transform: `rotate(${rot}deg) translateY(${sink}px)`, zIndex: 10 + i }
}

// ── Rules helpers (mirror server validation for instant feedback) ────────────
function comboErrorFor(cards: Card[]): string | null {
  if (cards.length <= 1) return null
  if (cards.some(c => c.rank === 'Jo')) return 'Jesters play alone'
  const aces = cards.filter(c => c.rank === 'A')
  const nonAces = cards.filter(c => c.rank !== 'A')
  if (aces.length === 1 && nonAces.length === 1) return null
  if (aces.length > 1) return 'Only one Ace per combo'
  if (new Set(cards.map(c => c.rank)).size > 1) return 'Must be same rank (or use Ace)'
  const total = cards.reduce((s, c) => s + cardValue(c.rank), 0)
  const max = enc.value.myBoosts?.comboMax ?? 10   // Combat Cache raises this to 12
  if (total > max) return `Total ${total} exceeds ${max}`
  return null
}
const comboError = computed(() => comboErrorFor(selected.value.map(i => hand.value[i]!).filter(Boolean)))

// discard coverage total — includes HOLD-token soak (Ballast +1) so the soak shows
const selectedTotal = computed(() =>
  selected.value.reduce((s, i) => {
    const card = hand.value[i]
    return card ? s + cardValue(card.rank) + tokenHold(cardTokensOf(card)) : s
  }, 0))

// per-suit live boost for MY cards (server computes from once-per-enemy flags)
function suitBoost(suit: string): number {
  const b = enc.value.myBoosts
  if (!b) return 0
  return { S: b.S, D: b.D, H: b.H }[suit] ?? 0
}

// what the selected play will actually do — boosts, penalties, kill prediction
const preview = computed(() => {
  if (!inPlay.value || selected.value.length === 0 || comboError.value) return null
  const b = enc.value.myBoosts
  const enemy = enc.value.currentEnemy
  const cards = selected.value.map(i => hand.value[i]!).filter(Boolean)
  if (!b || !enemy || !cards.length || cards[0]!.rank === 'Jo') return null

  // token-aware base: printed value + value-token deltas (Hone/Temper/…)
  const tok = (card: Card) => cardTokensOf(card)
  const base = Math.max(0, cards.reduce((s, card) => s + cardValue(card.rank) + tokenSpend(tok(card)), 0))

  const immune = enemy.immunityNullified ? null : enemy.card.suit
  // effective suits across all cards, including graft (added) / transmute (replaced)
  const suits = new Set<string>()
  let immuneBlocked = false
  for (const card of cards) for (const su of effectiveSuits(card, tok(card))) {
    if (su === immune) immuneBlocked = true; else suits.add(su)
  }
  const blocked = immuneBlocked ? [immune!] : []

  // per-card lever/keyword tokens that actually fire their suit
  const fires = (card: Card, su: string) => su !== immune && effectiveSuits(card, tok(card)).includes(su)
  const lever = (l: string, su: string) => cards.reduce((n, card) => n + (fires(card, su) ? tok(card).filter(t => t.lever === l).length : 0), 0)
  const edgeB = lever('edge', 'C'), plateB = lever('shield', 'S'), drawB = lever('draw', 'D'), mendB = lever('recover', 'H')
  const markDmg = cards.reduce((n, card) => n + tok(card).filter(t => t.keyword === 'mark').length * 2, 0)

  // mirror server order: (base+dmgPlus) ×2[♣] +edge +mark ×dmgMult, then exec
  let dmg = base + b.dmgPlus
  if (suits.has('C')) { dmg *= 2; dmg += edgeB * 2 }
  dmg += markDmg
  dmg *= b.dmgMult
  let hpAfter = enemy.hp - dmg
  let exec = false
  if (hpAfter > 0 && hpAfter <= 2 && b.execReady) { hpAfter -= 2; exec = true }

  const rawDraw = b.dCap !== null ? Math.min(base + b.D + drawB, b.dCap) : base + b.D + drawB
  const rawHeal = b.hHalf ? Math.ceil((base + b.H + mendB) / 2) : base + b.H + mendB
  return {
    base, dmg, exec,
    kills: hpAfter <= 0,
    exact: hpAfter === 0,
    blocked,
    shield: suits.has('S') ? base + b.S + plateB : null,
    draws: suits.has('D') ? Math.min(rawDraw, enc.value.tavernCount) : null,
    heal: suits.has('H') ? Math.min(rawHeal, enc.value.discardCount) : null,
  }
})

function isImmuneSuit(suit: string) {
  const enemy = enc.value.currentEnemy
  if (!enemy || enemy.immunityNullified) return false
  return enemy.card.suit === suit
}

// Token-aware versions for the fan badges. A card fires every suit in
// effectiveSuits (graft adds one, transmute replaces it), so immunity and the
// class/modifier boost must look at those, not just the printed suit:
//  · fully blocked only when EVERY effective suit is the immune suit (a graft
//    card whose other suit still fires is NOT fully blocked)
//  · the boost badge nets the boosts of the suits that actually fire.
function cardFullyBlocked(card: Card): boolean {
  const suits = effectiveSuits(card, cardTokensOf(card))
  return suits.length > 0 && suits.every(su => isImmuneSuit(su))
}
function cardBoost(card: Card): number {
  return effectiveSuits(card, cardTokensOf(card))
    .filter(su => !isImmuneSuit(su))
    .reduce((n, su) => n + suitBoost(su), 0)
}

function suitClass(suit: string) {
  return suit === 'H' || suit === 'D' ? 'suit-red' : 'suit-black'
}

const confirmAbandon = ref(false)

// ── Actions ──────────────────────────────────────────────────────────────────
function act(action: Record<string, unknown>) {
  socket.emit('campaign_action', { code: props.code, action })
  selected.value = []
  errorMsg.value = ''
}

function toggleSelect(i: number) {
  if (!inPlay.value && !inDiscard.value) return
  const idx = selected.value.indexOf(i)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(i)
  sfx.cardSnap()
}

// ── Drag-to-play gesture ──────────────────────────────────────────────────────
// A press that stays put is a tap (handled by @click → toggleSelect). A press
// that moves past the threshold becomes a drag; once dragging we preventDefault
// so the browser doesn't scroll (touch) or fire a trailing click (the tap path).
const DRAG_THRESHOLD = 8
let gesture: { startX: number; startY: number; index: number; pointerId: number; moved: boolean } | null = null

function teardownGesture() {
  window.removeEventListener('pointermove', onCardPointerMove)
  window.removeEventListener('pointerup', onCardPointerUp)
  window.removeEventListener('pointercancel', onCardPointerUp)
  gesture = null
  drag.value = null
}

function onCardPointerDown(e: PointerEvent, i: number) {
  if (!inPlay.value && !inDiscard.value) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  gesture = { startX: e.clientX, startY: e.clientY, index: i, pointerId: e.pointerId, moved: false }
  window.addEventListener('pointermove', onCardPointerMove, { passive: false })
  window.addEventListener('pointerup', onCardPointerUp)
  window.addEventListener('pointercancel', onCardPointerUp)
}

function overEnemy(x: number, y: number): boolean {
  const el = enemyEl.value
  if (!el || !enc.value.currentEnemy) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

// Is the pointer near the hand strip? (vertical band — generous, so reordering
// stays responsive, but the enemy far above never counts as "in the hand".)
function withinHandBand(y: number): boolean {
  const el = fanEl.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  return y >= r.top - 60 && y <= r.bottom + 80
}

// Live reorder: drop the dragged card into the slot its pointer X is over,
// computed against the other cards' real positions (FLIP animates the shuffle).
function reorderToPointer(draggedId: string, x: number) {
  const el = fanEl.value
  if (!el) return
  const els = [...el.querySelectorAll<HTMLElement>('[data-card-id]')].filter(c => c.dataset.cardId !== draggedId)
  let target = els.length
  for (let k = 0; k < els.length; k++) {
    const r = els[k]!.getBoundingClientRect()
    if (x < r.left + r.width / 2) { target = k; break }
  }
  const ids = els.map(c => c.dataset.cardId!)
  ids.splice(target, 0, draggedId)
  if (ids.join('|') !== handOrder.value.join('|')) handOrder.value = ids
}

function onCardPointerMove(e: PointerEvent) {
  if (!gesture || e.pointerId !== gesture.pointerId) return
  if (!gesture.moved) {
    if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < DRAG_THRESHOLD) return
    const card = hand.value[gesture.index]
    if (!card) { teardownGesture(); return }
    gesture.moved = true
    drag.value = { index: gesture.index, card, x: e.clientX, y: e.clientY, over: false }
  }
  e.preventDefault()
  const d = drag.value!
  d.x = e.clientX
  d.y = e.clientY
  d.over = overEnemy(e.clientX, e.clientY)
  // not aiming at the enemy and hovering the hand → reorder instead of play
  if (!d.over && withinHandBand(e.clientY)) reorderToPointer(d.card.id, e.clientX)
}

function onCardPointerUp(e: PointerEvent) {
  if (!gesture || e.pointerId !== gesture.pointerId) return
  const moved = gesture.moved
  const idx = gesture.index
  const over = drag.value?.over ?? false
  teardownGesture()
  if (!moved) toggleSelect(idx)       // a still press = tap to select
  else if (over) dropOnEnemy(idx)     // dragged onto the enemy = play / block
  // else: dragged within the hand = reorder (already applied live on move)
}

// Drop resolves by phase: in play it strikes (selected combo + the dropped card,
// or just the card); in discard it stacks the card onto the block and commits
// once the soak covers the incoming hit.
function dropOnEnemy(index: number) {
  if (inPlay.value) {
    const indices = selected.value.length ? Array.from(new Set([...selected.value, index])) : [index]
    const err = comboErrorFor(indices.map(i => hand.value[i]!).filter(Boolean))
    if (err) { errorMsg.value = err; return }
    sfx.cardPlay()
    act({ type: 'play_cards', cardIndices: indices })
  } else if (inDiscard.value) {
    if (!selected.value.includes(index)) selected.value.push(index)
    if (selectedTotal.value >= enc.value.discardNeeded) confirmDiscard()
    else sfx.cardSnap()
  }
}

function playSelected() {
  if (selected.value.length === 0) { errorMsg.value = 'Select a card to play.'; return }
  if (comboError.value) { errorMsg.value = comboError.value; return }
  sfx.cardPlay()
  act({ type: 'play_cards', cardIndices: [...selected.value] })
}

function confirmDiscard() {
  if (selectedTotal.value < enc.value.discardNeeded) {
    errorMsg.value = `Need total ≥ ${enc.value.discardNeeded} (currently ${selectedTotal.value}).`
    return
  }
  sfx.cardPlay()
  act({ type: 'discard_damage', cardIndices: [...selected.value] })
}

function chooseNext(targetIndex: number, keepTurn = false) {
  act({ type: 'choose_next', targetIndex, keepTurn })
}

function castSpell(spellId: string) {
  act({ type: 'cast_spell', spellId })
}

const whistleRelicId = ref<string | null>(null)

function onRelicClick(relicId: string) {
  if (!inPlay.value || !enc.value.activatableRelics.includes(relicId)) return
  if (relicId === 'r-signal-whistle') { whistleRelicId.value = relicId; whistleMode.value = true }
  else activateRelic(undefined, relicId)
}

function activateRelic(targetIndex?: number, relicId?: string) {
  whistleMode.value = false
  act({ type: 'activate_relic', targetIndex, relicId: relicId ?? whistleRelicId.value ?? undefined })
  whistleRelicId.value = null
}

function confirmPeek() {
  const n = enc.value.setupPeek?.cards.length ?? 0
  const order = peekOrder.value.length === n ? [...peekOrder.value] : Array.from({ length: n }, (_, i) => i)
  peekOrder.value = []
  act({ type: 'setup_reorder', order })
}

// ascending-deck: confirm which cards to keep from the overdraw pool
function toggleDrawPool(i: number) {
  const idx = drawPoolSelected.value.indexOf(i)
  if (idx >= 0) { drawPoolSelected.value.splice(idx, 1); return }
  // don't let the player pick more than they're allowed to keep
  if (drawPoolSelected.value.length >= (enc.value.drawSelectKeep ?? 0)) return
  drawPoolSelected.value.push(i)
}

function confirmKeepDrawn() {
  act({ type: 'keep_drawn', keepIndices: [...drawPoolSelected.value] })
  drawPoolSelected.value = []
}

function togglePeekCard(i: number) {
  if (!enc.value.setupPeek?.canReorder) return
  const idx = peekOrder.value.indexOf(i)
  if (idx >= 0) peekOrder.value.splice(idx, 1)
  else peekOrder.value.push(i)
}

socket.on('error', (msg: string) => { errorMsg.value = msg })

function heroTooltip(h: (typeof props.state.heroes)[number]): string {
  const lines = [`${h.className} — ${h.abilityText}`]
  for (const rl of h.relics) lines.push(`🏺 ${rl.name}: ${rl.text}`)
  if (!h.alive) lines.push('💀 Fallen.')
  return lines.join('\n')
}

const rankNames: Record<string, string> = { J: 'Jack', Q: 'Queen', K: 'King' }
const ROYAL_GLYPHS: Record<string, string> = { J: '♞', Q: '♛', K: '♚' }
const tierLabels: Record<string, string> = { skirmish: 'Skirmish', veteran: 'Veteran patrol', elite: 'Elite warband', boss: 'THE CASTLE' }
const GATE_LABELS: Record<string, string> = { J: 'THE GATES', Q: 'THE COURTYARD', K: 'THE THRONE' }
const tierLabel = computed(() =>
  enc.value.tier === 'boss' && enc.value.siegeRank
    ? GATE_LABELS[enc.value.siegeRank]!
    : tierLabels[enc.value.tier] ?? enc.value.tier)
const netAttack = computed(() => {
  const e = enc.value.currentEnemy
  return e ? Math.max(0, e.attack - e.shield) : 0
})
</script>

<template>
  <div class="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4 lg:items-start lg:max-w-[1280px] lg:mx-auto lg:px-4 lg:pt-3">

    <!-- ═══ CENTER: the battlefield ═══ -->
    <div class="flex flex-col gap-2 p-3 lg:p-0 max-w-lg mx-auto pb-4 w-full lg:max-w-3xl">

    <!-- Encounter banner (mobile — desktop gets the intel wing) -->
    <div class="card bg-base-100/80 border border-base-content/10 lg:hidden">
      <div class="card-body py-2 px-4 gap-0.5">
        <div class="flex items-center justify-between">
          <span class="font-display font-bold text-sm tracking-wide" :class="enc.tier === 'boss' ? 'text-error' : 'text-primary/90'">
            {{ tierLabel }}
            <span v-if="enc.modifier" class="text-base-content/80"> — {{ enc.modifier.name }}</span>
          </span>
          <span class="text-xs text-base-content/50">☠ {{ enc.defeatedCount }} slain · {{ enc.totalEnemies - enc.defeatedCount }} remain</span>
        </div>
        <p v-if="enc.modifier" class="text-xs text-base-content/60">{{ enc.modifier.text }}</p>
        <p v-if="enc.bossModifier" class="text-xs" :class="enc.bossModifier.id === 'hidden' ? 'text-warning/60 italic' : 'text-warning'">
          {{ enc.bossModifier.name }}: {{ enc.bossModifier.text }}
        </p>
      </div>
    </div>


    <!-- Ascending-deck: overdraw-and-select — choose which cards to keep -->
    <OverlayModal v-if="enc.turnPhase === 'draw_select'" tone="primary">
      <template v-if="inDrawSelect">
        <p class="text-sm font-semibold text-center">
          ♦ Overdraw pool — keep up to {{ enc.drawSelectKeep ?? 0 }}
          card{{ (enc.drawSelectKeep ?? 0) !== 1 ? 's' : '' }}
        </p>
        <div class="flex gap-2 justify-center flex-wrap">
          <button
            v-for="entry in sortedDrawPool" :key="entry.card.id"
            class="card-face w-14 h-20 font-mono flex flex-col items-center justify-center relative transition-all duration-150"
            :class="drawPoolSelected.includes(entry.i)
              ? '-translate-y-1.5 scale-105 ring-2 ring-primary bg-primary/20 shadow-lg shadow-primary/40 z-10'
              : 'ring-1 ring-base-content/10 hover:-translate-y-1'"
            @click="toggleDrawPool(entry.i)"
          >
            <span class="text-xl font-bold" :class="suitClass(entry.card.suit)">{{ entry.card.rank === 'Jo' ? '🃏' : entry.card.rank }}</span>
            <span class="text-base" :class="suitClass(entry.card.suit)">{{ entry.card.rank !== 'Jo' ? suitSymbol(entry.card.suit) : '' }}</span>
            <span v-if="drawPoolSelected.includes(entry.i)"
              class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-content text-[10px] font-bold flex items-center justify-center shadow">✓</span>
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="confirmKeepDrawn">
          Keep {{ drawPoolSelected.length }} card{{ drawPoolSelected.length !== 1 ? 's' : '' }}
        </button>
        <!-- your current hand, so you can judge which pool cards are best to keep -->
        <div v-if="hand.length" class="mt-1 pt-2 border-t border-base-content/10">
          <p class="text-[10px] uppercase tracking-widest text-base-content/40 text-center mb-1">Your hand</p>
          <div class="flex gap-1 justify-center flex-wrap">
            <span
              v-for="card in hand" :key="card.id"
              class="card-face w-9 h-12 font-mono flex flex-col items-center justify-center text-xs leading-none opacity-90"
              :title="cardTokensOf(card).map(t => `${t.name} — ${t.text}`).join('\n')"
            >
              <span class="flex items-start">
                <span class="font-bold" :class="suitClass(mainSuitOf(card))">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
                <span v-if="card.rank !== 'Jo' && valueDeltaOf(card) !== 0"
                  class="text-[8px] font-extrabold leading-none"
                  :class="valueDeltaOf(card) > 0 ? 'text-success' : 'text-error'"
                >{{ valueDeltaOf(card) > 0 ? '+' + valueDeltaOf(card) : valueDeltaOf(card) }}</span>
              </span>
              <span v-if="card.rank !== 'Jo'" class="flex items-center gap-px">
                <span :class="suitClass(mainSuitOf(card))">{{ suitSymbol(mainSuitOf(card)) }}</span>
                <span v-for="su in extraSuitsOf(card)" :key="su" class="text-info font-bold">{{ suitSymbol(su) }}</span>
              </span>
            </span>
          </div>
        </div>
      </template>
      <p v-else class="text-sm text-center text-base-content/50 soft-pulse">
        ♦ Someone is selecting from their draw pool…
      </p>
    </OverlayModal>

    <!-- Setup peek — floats over the stage, nothing else to do during setup -->
    <OverlayModal v-if="enc.turnPhase === 'setup'" tone="primary">
      <template v-if="myPeek">
        <p class="text-sm font-semibold text-center">🔮 {{ enc.setupPeek!.source }} — top of the Tavern{{ enc.setupPeek!.canReorder ? ' (tap in your preferred order, first = top)' : '' }}</p>
        <div class="flex gap-2 justify-center">
          <button
            v-for="(card, i) in enc.setupPeek!.cards" :key="card.id"
            class="card-face w-14 h-20 font-mono flex flex-col items-center justify-center relative transition-transform hover:-translate-y-1"
            :class="peekOrder.includes(i) ? 'ring-2 ring-primary' : ''"
            @click="togglePeekCard(i)"
          >
            <span class="text-xl font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
            <span class="text-base" :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
            <span v-if="peekOrder.includes(i)" class="absolute -top-1.5 -right-1.5 badge badge-primary badge-xs">{{ peekOrder.indexOf(i) + 1 }}</span>
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="confirmPeek">
          {{ enc.setupPeek!.canReorder ? 'Confirm order' : 'Got it' }}
        </button>
      </template>
      <p v-else class="text-sm text-center text-base-content/50 soft-pulse">
        🔮 Someone is consulting the cards…
      </p>
    </OverlayModal>

    <!-- ═══ STAGE + the side board (deck/discard live off-table) ═══ -->
    <div class="flex items-center gap-2 lg:gap-3">
    <div
      class="stage-swirl flex-1 min-w-0 rounded-2xl border border-base-content/10 bg-base-300/60 px-3 pt-4 pb-3"
      :class="shaking ? 'hit-shake hurt-flash' : ''"
    >
      <div class="relative flex items-center justify-between gap-2 min-h-[13rem] lg:min-h-[15rem] pb-3">

        <!-- The party, holding the line -->
        <div class="relative z-10 flex flex-col justify-center gap-1.5 shrink-0 w-16 lg:w-20">
          <div
            v-for="(h, hi) in state.heroes" :key="h.playerId"
            class="hero-figure flex flex-col items-center cursor-help"
            :class="[!h.alive ? 'hero-dead' : '', h.isCurrentPlayer ? 'hero-active' : '']"
            :style="{ animationDelay: `${hi * 0.7}s` }"
            :title="heroTooltip(h)"
          >
            <div class="hero-portrait">
              <img
                v-if="!portraitFailed[h.classId]"
                :src="`/portraits/${h.classId}.png`" alt=""
                class="w-full h-full object-cover"
                @error="portraitFailed[h.classId] = true"
              />
              <HeroPortrait v-else :class-id="h.classId" />
            </div>
            <p class="text-[9px] font-bold leading-tight mt-0.5 max-w-full truncate">{{ h.playerName }}</p>
            <p class="text-[8px] text-base-content/40 leading-none">{{ h.alive ? h.handSize + ' cards' : 'fallen' }}</p>
          </div>
          <!-- our standing Block — spades raise it, it eats the counterattack -->
          <div v-if="enc.currentEnemy && enc.currentEnemy.shield > 0" :key="`blk${enc.currentEnemy.shield}`"
            class="chip-pop self-center px-2 py-0.5 mt-1 rounded-full bg-info/15 border border-info/45 text-info font-semibold text-[11px] whitespace-nowrap">
            🛡 Block {{ enc.currentEnemy.shield }}
          </div>
          <!-- ward flash when the Block rises -->
          <div v-if="wardSeq" :key="`w${wardSeq}`" class="party-ward" aria-hidden="true" />
          <!-- the party raises a wall of cards -->
          <div v-if="blockSeq" :key="`b${blockSeq}`" class="block-ward" aria-hidden="true">🛡</div>
        </div>

        <!-- Clash zone: cards-as-spells land here on their way to the royal -->
        <div class="relative flex-1 self-stretch flex items-center justify-center min-w-0">
          <div class="flex items-end gap-1">
            <TransitionGroup name="throw">
              <div v-for="card in enc.lastPlayed" :key="card.id"
                class="thrown card-face w-10 h-14 lg:w-12 lg:h-[4.3rem] flex flex-col items-center justify-center font-mono text-xs shadow-lg"
                :class="`glow-${card.suit}`">
                <span class="font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
                <span :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
              </div>
            </TransitionGroup>
          </div>

          <!-- floating action: bottom-center of the arena (never covers the
               thrown cards). Static — click feedback is light/shadow only -->
          <Transition name="overlay">
            <div v-if="inPlay && selected.length > 0 && !comboError"
              class="absolute inset-0 z-30 flex items-end justify-center pb-1 pointer-events-none">
              <button class="arena-action btn btn-info btn-lg px-8 whitespace-nowrap pointer-events-auto" @click="playSelected">
                ⚔️ Play {{ selected.length > 1 ? 'combo' : 'card' }}
              </button>
            </div>
          </Transition>
          <Transition name="overlay">
            <div v-if="inDiscard && selected.length > 0"
              class="absolute inset-0 z-30 flex items-end justify-center pb-1 pointer-events-none">
              <button
                class="arena-action btn btn-lg px-8 whitespace-nowrap pointer-events-auto"
                :class="selectedTotal >= enc.discardNeeded ? 'btn-success' : 'btn-error'"
                :disabled="selectedTotal < enc.discardNeeded"
                @click="confirmDiscard"
              >🛡 Block {{ selectedTotal }}/{{ enc.discardNeeded }}</button>
            </div>
          </Transition>
        </div>

        <!-- Enemy royal card — also the drop target for drag-to-play -->
        <Transition name="enemy-flip" mode="out-in">
        <div v-if="enc.currentEnemy" ref="enemyEl" :key="enc.currentEnemy.card.id"
          class="relative flex flex-col items-center shrink-0 rounded-2xl transition-all duration-150"
          :class="drag?.over ? (inDiscard ? 'scale-105 ring-4 ring-info/70 ring-offset-2 ring-offset-transparent' : 'scale-105 ring-4 ring-error/70 ring-offset-2 ring-offset-transparent') : ''">
          <!-- drop hint while a card hovers over the enemy -->
          <div v-if="drag?.over" class="absolute -top-6 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap text-xs font-display font-bold px-2 py-0.5 rounded-full shadow pointer-events-none"
            :class="inDiscard ? 'bg-info text-info-content' : 'bg-error text-error-content'">
            {{ inDiscard ? '🛡 Block' : '⚔️ Strike' }}
          </div>
          <!-- floating combat numbers -->
          <div class="absolute -right-7 top-2 z-20 pointer-events-none select-none" aria-hidden="true">
            <div v-for="f in floats" :key="f.id"
              class="dmg-float absolute right-0 font-display font-black whitespace-nowrap drop-shadow"
              :class="f.kind === 'dmg' ? 'text-error text-3xl' : f.kind === 'shield' ? 'text-info text-xl' : 'text-4xl'"
            >{{ f.text }}</div>
          </div>

          <div class="royal-card w-32 h-44 flex flex-col items-center justify-between py-2 px-2 relative"
            :class="[enc.tier === 'boss' ? 'royal-boss' : '',
              enc.currentEnemy.card.suit === 'H' || enc.currentEnemy.card.suit === 'D' ? 'royal-red' : 'royal-black']">
            <span class="self-start text-sm font-display font-black leading-none" :class="suitClass(enc.currentEnemy.card.suit)">
              {{ enc.currentEnemy.card.rank }}<br>{{ suitSymbol(enc.currentEnemy.card.suit) }}
            </span>
            <span class="royal-crest" :class="suitClass(enc.currentEnemy.card.suit)">
              <span class="text-4xl leading-none font-black">{{ ROYAL_GLYPHS[enc.currentEnemy.card.rank] ?? '♚' }}</span>
              <span class="text-xl leading-none">{{ suitSymbol(enc.currentEnemy.card.suit) }}</span>
            </span>
            <span class="self-end text-sm font-display font-black leading-none rotate-180" :class="suitClass(enc.currentEnemy.card.suit)">
              {{ enc.currentEnemy.card.rank }}<br>{{ suitSymbol(enc.currentEnemy.card.suit) }}
            </span>
            <span v-if="!enc.currentEnemy.immunityNullified"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warning text-warning-content text-xs flex items-center justify-center font-bold shadow"
              :title="`Immune to ${suitSymbol(enc.currentEnemy.card.suit)} power`"
            >{{ suitSymbol(enc.currentEnemy.card.suit) }}</span>
          </div>
          <div class="royal-shadow" aria-hidden="true" />

          <p class="font-display text-xs mt-1.5 text-base-content/80 tracking-wide">
            {{ rankNames[enc.currentEnemy.card.rank] ?? enc.currentEnemy.card.rank }}
            of {{ { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' }[enc.currentEnemy.card.suit] }}
            <span v-if="enc.currentEnemy.immunityNullified" class="text-warning">· immunity off</span>
          </p>

          <!-- HP -->
          <div class="w-36 mt-1">
            <div class="flex justify-between text-[10px] text-base-content/50 mb-0.5">
              <span class="font-display font-bold text-sm text-base-content/90">{{ hpShown }} <span class="text-[10px] font-normal text-base-content/40">/ {{ enc.currentEnemy.maxHp }}</span></span>
              <span class="self-end">{{ enc.enemiesRemaining }} behind</span>
            </div>
            <div class="w-full h-2.5 rounded-full bg-base-300 overflow-hidden border border-base-content/10">
              <div class="hp-bar h-full rounded-full bg-gradient-to-r from-error to-secondary"
                :style="{ width: `${Math.max(0, enc.currentEnemy.hp) / enc.currentEnemy.maxHp * 100}%` }" />
            </div>
          </div>

          <!-- attack chip: our Block directly reduces the number shown -->
          <div class="flex gap-2 mt-1.5 text-xs">
            <span :key="netAttack" class="chip-pop px-2 py-0.5 rounded-full bg-error/15 border border-error/30 text-error font-semibold">
              ⚔️ {{ netAttack }}<s v-if="enc.currentEnemy.shield > 0" class="opacity-50 ml-1 font-normal">{{ enc.currentEnemy.attack }}</s>
            </span>
          </div>
        </div>
        </Transition>

      </div>

      <!-- pile inspector: contents sorted by suit/value — draw order stays secret -->
      <OverlayModal v-if="showPile" tone="primary" dismissable @close="showPile = null">
        <h3 class="text-lg font-bold text-center">
          {{ showPile === 'tavern' ? '🍺 The Tavern' : '🗑 The Discard' }}
          <span class="text-sm font-normal text-base-content/50">— {{ pileCards.length }} cards</span>
        </h3>
        <p class="text-[10px] text-center text-base-content/40 -mt-2">sorted by suit · the draw order stays secret</p>
        <div v-if="pileCards.length" class="flex flex-wrap gap-1 justify-center">
          <div v-for="card in pileCards" :key="card.id"
            class="card-face w-9 h-12 flex flex-col items-center justify-center font-mono text-xs">
            <span class="font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
            <span :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-center text-base-content/40">Empty.</p>
        <button class="btn btn-ghost btn-sm" @click="showPile = null">Close</button>
      </OverlayModal>

      <!-- trigger popup (event playback) -->
      <div class="absolute inset-x-0 top-2 z-30 flex justify-center pointer-events-none" aria-hidden="true">
        <Transition name="played">
          <div v-if="popup" :key="popup.seq"
            class="chip-pop px-3 py-1 rounded-full font-display font-bold shadow-xl border backdrop-blur-sm"
            :class="[
              popup.big ? 'text-base' : 'text-xs',
              popup.tone === 'gold' ? 'bg-primary/20 border-primary/60 text-primary' :
              popup.tone === 'blood' ? 'bg-error/20 border-error/60 text-error' :
              popup.tone === 'info' ? 'bg-info/15 border-info/50 text-info' :
              'bg-base-100/80 border-base-content/20 text-base-content/80',
            ]"
          >{{ popup.text }}</div>
        </Transition>
      </div>

    </div>

    <!-- the side board: deck + discard stacked beside the table, click to inspect -->
    <aside class="side-board shrink-0 self-stretch flex flex-col items-center justify-center gap-3 px-2 py-3">
      <button class="flex flex-col items-center gap-1 cursor-pointer hover:brightness-125 transition-all"
        :title="`Tavern — the draw pile (click to inspect). Empty? Only ♥ Hearts or a camp rest refill it.`"
        @click="showPile = 'tavern'">
        <div class="pile" :class="enc.tavernCount === 0 ? 'pile-empty' : ''">
          <div class="pile-layer" /><div class="pile-layer" /><div class="pile-layer" />
          <span class="absolute inset-0 flex items-center justify-center font-display font-bold text-primary/90 z-10">{{ enc.tavernCount }}</span>
        </div>
        <span class="text-[9px] uppercase tracking-widest text-base-content/40">Tavern</span>
      </button>
      <div class="h-px w-9 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <button class="flex flex-col items-center gap-1 cursor-pointer hover:brightness-125 transition-all"
        title="Discard — played and lost cards (click to inspect). ♥ Hearts recover from here."
        @click="showPile = 'discard'">
        <div class="pile" :class="enc.discardCount === 0 ? 'pile-empty' : ''">
          <div class="pile-layer" /><div class="pile-layer" /><div class="pile-layer" />
          <span class="absolute inset-0 flex items-center justify-center font-display font-bold text-base-content/70 z-10">{{ enc.discardCount }}</span>
        </div>
        <span class="text-[9px] uppercase tracking-widest text-base-content/40">Discard</span>
      </button>
    </aside>
    </div>

    <!-- Choose-next — a blocking decision, so it floats over the table -->
    <OverlayModal v-if="inChoose" tone="warning">
      <h3 class="text-lg font-bold text-center">
        {{ enc.pendingChooseNext ? '⚜️ Kill secured — hand off the initiative?' : '⚜️ Choose who goes next' }}
      </h3>
      <button
        v-if="enc.pendingChooseNext"
        class="btn btn-warning w-full"
        @click="chooseNext(state.myHeroIndex, true)"
      >Keep the turn</button>
      <button
        v-for="(h, i) in state.heroes" :key="h.playerId"
        v-show="h.alive && !(enc.pendingChooseNext && i === state.myHeroIndex)"
        class="btn btn-outline btn-warning w-full justify-start"
        @click="chooseNext(i)"
      >{{ CLASS_ICONS[h.classId] }} {{ h.playerName }} <span class="text-xs font-normal opacity-60">{{ h.handSize }} cards</span></button>
    </OverlayModal>

    <!-- Turn status -->
    <div class="text-center">
      <div v-if="inDiscard" class="badge badge-error badge-lg soft-pulse">
        Take {{ enc.discardNeeded }} damage — discard ≥ {{ enc.discardNeeded }}
      </div>
      <div v-else-if="inPlay" class="badge badge-primary badge-lg turn-beacon">
        Your turn{{ enc.wagerArmed ? ' — 🎲 WAGER LIVE' : '' }}
      </div>
      <div v-else-if="enc.turnPhase !== 'setup' && !inChoose" class="badge badge-ghost badge-lg">
        {{ state.heroes[enc.currentPlayerIndex]?.playerName }}'s turn{{ enc.turnPhase === 'choose_next' ? ' — choosing who goes next…' : '' }}
      </div>
    </div>

    <!-- Play preview: what this play will ACTUALLY do, boosts included -->
    <div v-if="inPlay && selected.length > 0" class="text-center text-xs -mt-1">
      <span v-if="comboError" class="text-error">{{ comboError }}</span>
      <div v-else-if="preview" class="flex justify-center gap-1.5 flex-wrap" :key="`${preview.dmg}-${selected.length}`">
        <span class="chip-pop px-2 py-0.5 rounded-full border font-semibold"
          :class="preview.kills ? 'bg-primary/20 border-primary/60 text-primary'
            : preview.dmg > preview.base ? 'bg-success/15 border-success/50 text-success'
            : 'bg-base-100/80 border-base-content/25 text-base-content/80'">
          ⚔️ {{ preview.dmg }}<span v-if="preview.dmg !== preview.base" class="opacity-55 line-through ml-1">{{ preview.base }}</span>
          {{ preview.exec ? ' +🪓2' : '' }}{{ preview.exact ? ' — EXACT KILL ✨' : preview.kills ? ' — kills!' : '' }}
        </span>
        <span v-if="preview.shield !== null" class="chip-pop px-2 py-0.5 rounded-full bg-info/15 border border-info/45 text-info font-semibold"
          :class="enc.myBoosts.S > 0 ? 'ring-1 ring-success/50' : ''">
          🛡 Block +{{ preview.shield }}<span v-if="enc.myBoosts.S !== 0" class="ml-1" :class="enc.myBoosts.S > 0 ? 'text-success' : 'text-error'">({{ enc.myBoosts.S > 0 ? '+' : '' }}{{ enc.myBoosts.S }})</span>
        </span>
        <span v-if="preview.draws !== null" class="chip-pop px-2 py-0.5 rounded-full bg-success/15 border border-success/45 text-success font-semibold">
          ♦ draw {{ preview.draws }}<span v-if="enc.myBoosts.D !== 0" class="ml-1" :class="enc.myBoosts.D > 0 ? 'text-success' : 'text-error'">({{ enc.myBoosts.D > 0 ? '+' : '' }}{{ enc.myBoosts.D }})</span>
        </span>
        <span v-if="preview.heal !== null" class="chip-pop px-2 py-0.5 rounded-full bg-secondary/20 border border-secondary/50 text-error font-semibold">
          ♥ {{ preview.heal }} back{{ enc.myBoosts.hHalf ? ' (halved)' : '' }}
        </span>
        <span v-for="su in preview.blocked" :key="su" class="px-2 py-0.5 rounded-full bg-error/15 border border-error/45 text-error font-semibold">
          {{ suitSymbol(su) }} blocked
        </span>
      </div>
    </div>
    <div v-if="inDiscard" class="text-center text-xs -mt-1">
      <span class="inline-block px-2 py-0.5 rounded-full border font-semibold"
        :class="selectedTotal >= enc.discardNeeded ? 'bg-success/15 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'">
        {{ selectedTotal }} / {{ enc.discardNeeded }}
      </span>
    </div>
    <div v-if="errorMsg" class="alert alert-error text-sm py-2" @click="errorMsg = ''">{{ errorMsg }}</div>

    <!-- ═══ HAND FAN ═══ -->
    <div ref="fanEl" class="mt-auto pt-3">
      <TransitionGroup name="fan" tag="div" class="flex justify-center items-end pb-6 lg:pb-8" :class="(!inPlay && !inDiscard) ? 'opacity-50' : ''">
        <div
          v-for="(entry, di) in displayHand" :key="entry.card.id"
          :data-card-id="entry.card.id"
          class="fan-slot first:ml-0 -ml-4 relative"
          :style="fanStyle(di, displayHand.length)"
        >
          <button
            class="fan-card card-face w-16 h-24 lg:w-20 lg:h-[7.25rem] flex flex-col items-center justify-center font-mono relative block touch-none"
            :class="[
              selected.includes(entry.i) ? (inDiscard ? 'fan-card-selected fan-card-discard' : 'fan-card-selected') : '',
              (!inPlay && !inDiscard) ? 'pointer-events-none' : '',
              drag?.index === entry.i ? 'opacity-30' : '',
            ]"
            @pointerdown="onCardPointerDown($event, entry.i)"
          >
            <span class="card-sway flex flex-col items-center leading-none" :style="{ animationDelay: `${(di * 0.45) % 3}s` }">
              <!-- rank, with any value-token bonus folded in as a +X / −X -->
              <span class="flex items-start">
                <span class="text-xl font-bold" :class="suitClass(mainSuitOf(entry.card))">{{ entry.card.rank === 'Jo' ? '🃏' : entry.card.rank }}</span>
                <span v-if="entry.card.rank !== 'Jo' && valueDeltaOf(entry.card) !== 0"
                  class="text-[11px] font-extrabold leading-none mt-0.5 -mr-1"
                  :class="valueDeltaOf(entry.card) > 0 ? 'text-success' : 'text-error'"
                  :title="`${valueDeltaOf(entry.card) > 0 ? '+' : ''}${valueDeltaOf(entry.card)} value when played`"
                >{{ valueDeltaOf(entry.card) > 0 ? '+' + valueDeltaOf(entry.card) : valueDeltaOf(entry.card) }}</span>
              </span>
              <!-- suit row: base/transmuted suit, plus any grafted suits beside it in blue -->
              <span v-if="entry.card.rank !== 'Jo'" class="flex items-center gap-px text-base">
                <span :class="suitClass(mainSuitOf(entry.card))">{{ suitSymbol(mainSuitOf(entry.card)) }}</span>
                <span v-for="su in extraSuitsOf(entry.card)" :key="su"
                  class="text-info font-bold" :title="`grafted ${suitSymbol(su)} — fires this lever too`"
                >{{ suitSymbol(su) }}</span>
              </span>
            </span>
            <span
              v-if="inPlay && entry.card.rank !== 'Jo' && cardFullyBlocked(entry.card)"
              class="absolute -top-1 -right-1 text-[9px] bg-error text-error-content rounded-full px-1 h-4 flex items-center justify-center font-bold"
              title="Suit power blocked by enemy immunity"
            >✕</span>
            <span
              v-else-if="inPlay && entry.card.rank !== 'Jo' && cardBoost(entry.card) !== 0"
              class="boost-badge absolute -top-1.5 -left-1.5 text-[9px] rounded-full px-1 h-4 flex items-center justify-center font-bold shadow"
              :class="cardBoost(entry.card) > 0 ? 'bg-success text-success-content' : 'bg-error text-error-content'"
              :title="cardBoost(entry.card) > 0 ? 'Boosted by your class/relic' : 'Penalized by the encounter modifier'"
            >{{ cardBoost(entry.card) > 0 ? '+' + cardBoost(entry.card) : cardBoost(entry.card) }}</span>
            <!-- ascending-deck: only the tokens that DON'T fold into the rank/suit
                 (levers, keywords, discard-soak) remain as corner badges — value
                 bonuses show as +X on the rank, grafted suits show in blue. -->
            <span
              v-if="badgeTokensOf(entry.card).length"
              class="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-[55]"
            >
              <span
                v-for="(tk, ti) in badgeTokensOf(entry.card)" :key="ti"
                class="w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[11px] leading-none font-bold shadow-sm"
                :class="tokenToneClass(tk.tone)"
                :title="tk.name + ' — ' + tk.text"
              >{{ tk.sym }}</span>
            </span>
          </button>
        </div>
        <p v-if="hand.length === 0" key="empty-hand" class="text-xs text-base-content/40 py-6">No cards — yield and pray.</p>
      </TransitionGroup>

      <!-- Sort controls (Balatro-style) + drag hint -->
      <div v-if="hand.length > 1" class="flex items-center justify-center gap-2 -mt-3 mb-1">
        <span class="text-[10px] uppercase tracking-[0.2em] text-base-content/35">Sort</span>
        <button class="btn btn-xs btn-outline" @click="sortHand('rank')" title="Sort the hand by value">⇅ Rank</button>
        <button class="btn btn-xs btn-outline" @click="sortHand('suit')" title="Group the hand by suit">⇅ Suit</button>
      </div>
      <p v-if="(inPlay || inDiscard) && hand.length && !drag" class="text-center text-[10px] text-base-content/35 mb-1 select-none">
        tap to select · drag onto the enemy to {{ inDiscard ? 'block' : 'strike' }} · drag in hand to reorder
      </p>

      <!-- Play/Block float on the table while selecting; only Yield lives here -->
      <div v-if="inPlay" class="flex justify-center -mt-3 relative z-50">
        <button class="btn btn-ghost btn-xs text-base-content/50" @click="act({ type: 'yield_turn' })">🏳 Yield</button>
      </div>

      <!-- Arsenal: the team's magic, physically on the table -->
      <div v-if="state.spells.length || me?.relics.length || (enc.canWager && !enc.wagerArmed)" class="mt-2">
        <p class="text-[9px] uppercase tracking-[0.25em] text-base-content/35 mb-1">Arsenal</p>
        <div class="flex gap-2 overflow-x-auto pb-1.5">
          <ItemCard
            v-for="sp in state.spells" :key="sp.id"
            :id="sp.id" :name="sp.name" :text="sp.text" :tier="sp.tier" sm
            :disabled="!isMyTurn || !(inPlay || (inDiscard && sp.id === 's-calm-pulse'))"
            @click="castSpell(sp.id)"
          />
          <ItemCard
            v-for="rl in me?.relics ?? []" :key="rl.id"
            :id="rl.id" :name="rl.name" :text="rl.text" :tier="rl.tier" sm
            :disabled="ACTIVATABLE_RELICS.includes(rl.id) && !(inPlay && enc.activatableRelics.includes(rl.id))"
            @click="onRelicClick(rl.id)"
          />
          <ItemCard
            v-if="enc.canWager && !enc.wagerArmed"
            id="g-wager" name="The Wager"
            text="Once per encounter: if the enemy dies this turn, draw 2 (and in multiplayer, choose who acts next); if not, discard 1 random card."
            sm :disabled="!inPlay"
            @click="act({ type: 'arm_wager' })"
          />
        </div>
      </div>

      <!-- Abandon run escape hatch (host only) -->
      <div v-if="state.isHost && enc.outcome === 'active'" class="mt-3 text-center">
        <template v-if="!confirmAbandon">
          <button class="btn btn-ghost btn-xs text-error/30 hover:text-error" @click="confirmAbandon = true">Abandon lineage</button>
        </template>
        <template v-else>
          <div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/30">
            <p class="text-xs text-error font-semibold">Abandon this run? All progress is lost.</p>
            <div class="flex gap-2">
              <button class="btn btn-error btn-xs" @click="act({ type: 'abandon_campaign' })">Yes, abandon</button>
              <button class="btn btn-ghost btn-xs" @click="confirmAbandon = false">Cancel</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Whistle target — overlay, tap outside to cancel -->
      <OverlayModal v-if="whistleMode" tone="secondary" dismissable @close="whistleMode = false">
        <h3 class="text-lg font-bold text-center">🏺 Signal Whistle</h3>
        <p class="text-sm text-center text-base-content/50">Choose who acts after you.</p>
        <button
          v-for="(h, i) in state.heroes" :key="h.playerId"
          v-show="h.alive"
          class="btn btn-outline w-full justify-start" @click="activateRelic(i)"
        >{{ CLASS_ICONS[h.classId] }} {{ h.playerName }} <span class="text-xs font-normal opacity-60">{{ h.handSize }} cards</span></button>
        <button class="btn btn-ghost btn-sm" @click="whistleMode = false">Cancel</button>
      </OverlayModal>

    </div>
    </div>

    <!-- ═══ RIGHT WING: battle intel (desktop) ═══ -->
    <aside class="hidden lg:flex flex-col gap-2 sticky top-3">
      <div class="card bg-base-100/90">
        <div class="card-body p-3 gap-1.5">
          <p class="text-[10px] font-display font-semibold text-primary/40 uppercase tracking-[0.25em]">Battle Intel</p>
          <div class="flex items-center justify-between">
            <span class="font-display font-bold text-sm tracking-wide" :class="enc.tier === 'boss' ? 'text-error' : 'text-primary/90'">
              {{ tierLabel }}
            </span>
            <span class="text-xs text-base-content/50">☠ {{ enc.defeatedCount }} slain · {{ enc.totalEnemies - enc.defeatedCount }} remain</span>
          </div>
          <template v-if="enc.modifier">
            <p class="text-xs font-bold text-base-content/80">{{ enc.modifier.name }}</p>
            <p class="text-xs text-base-content/55 leading-snug">{{ enc.modifier.text }}</p>
          </template>
          <p v-if="enc.bossModifier" class="text-xs leading-snug" :class="enc.bossModifier.id === 'hidden' ? 'text-warning/60 italic' : 'text-warning'">
            {{ enc.bossModifier.name }}: {{ enc.bossModifier.text }}
          </p>
          <p v-if="enc.wagerArmed" class="text-xs text-warning font-bold">🎲 Wager live — kill or pay</p>
        </div>
      </div>

      <div class="card bg-base-100/90">
        <div class="card-body p-3 gap-2">
          <p class="text-[10px] font-display font-semibold text-primary/40 uppercase tracking-[0.25em]">The Party</p>
          <div v-for="h in state.heroes" :key="h.playerId" class="text-xs space-y-0.5"
            :class="!h.alive ? 'opacity-50' : ''">
            <p class="font-bold">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}
              <span class="font-normal text-primary/60 font-display text-[10px]">{{ h.className }}</span>
            </p>
            <p class="text-[10px] text-base-content/50 leading-snug">{{ h.abilityText }}</p>
            <p v-for="rl in h.relics" :key="rl.id" class="text-[10px] text-accent leading-snug" :title="rl.text">🏺 {{ rl.name }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Drag ghost: a clone of the held card that follows the pointer. Teleported
         to <body> so transformed ancestors don't capture its fixed positioning. -->
    <Teleport to="body">
      <div v-if="drag"
        class="card-face w-16 h-24 lg:w-20 lg:h-[7.25rem] flex flex-col items-center justify-center font-mono shadow-2xl transition-transform duration-100"
        :class="drag.over ? 'ring-2 ring-error scale-110' : ''"
        :style="{ position: 'fixed', left: drag.x + 'px', top: drag.y + 'px', zIndex: 9999,
                  transform: `translate(-50%, -62%) rotate(${drag.over ? 0 : -5}deg)`, pointerEvents: 'none' }"
        aria-hidden="true"
      >
        <span class="text-xl font-bold" :class="suitClass(drag.card.suit)">{{ drag.card.rank === 'Jo' ? '🃏' : drag.card.rank }}</span>
        <span class="text-base" :class="suitClass(drag.card.suit)">{{ drag.card.rank !== 'Jo' ? suitSymbol(drag.card.suit) : '' }}</span>
      </div>
    </Teleport>
  </div>
</template>

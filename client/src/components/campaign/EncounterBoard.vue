<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, Card } from '../../types'
import { cardValue, suitSymbol, CLASS_ICONS } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const selected = ref<number[]>([])
const errorMsg = ref('')
const showSpells = ref(false)
const peekOrder = ref<number[]>([])
const whistleMode = ref(false)

const enc = computed(() => props.state.encounter!)
const me = computed(() => props.state.heroes[props.state.myHeroIndex])
const isMyTurn = computed(() => props.state.myHeroIndex === enc.value.currentPlayerIndex && enc.value.outcome === 'active')
const inPlay = computed(() => enc.value.turnPhase === 'play' && isMyTurn.value)
const inDiscard = computed(() => enc.value.turnPhase === 'discard' && isMyTurn.value)
const inChoose = computed(() => enc.value.turnPhase === 'choose_next' && isMyTurn.value)
const myPeek = computed(() => enc.value.turnPhase === 'setup' && enc.value.setupPeek?.mine)

const hand = computed(() => enc.value.myHand)

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
    if (sh > 0) spawnFloat(`🛡+${sh}`, 'shield')
  },
)

watch(() => props.state.encounter?.discardNeeded ?? 0, (now, was) => {
  if (now > 0 && (was ?? 0) === 0) shake()
})
watch(() => props.state.heroes.filter(h => !h.alive).length, (now, was) => {
  if ((was ?? 0) < now) { shake(); spawnFloat('💀', 'death') }
})

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
const comboError = computed(() => {
  const cards = selected.value.map(i => hand.value[i]!).filter(Boolean)
  if (cards.length <= 1) return null
  if (cards.some(c => c.rank === 'Jo')) return 'Jesters play alone'
  const aces = cards.filter(c => c.rank === 'A')
  const nonAces = cards.filter(c => c.rank !== 'A')
  if (aces.length === 1 && nonAces.length === 1) return null
  if (aces.length > 1) return 'Only one Ace per combo'
  if (new Set(cards.map(c => c.rank)).size > 1) return 'Must be same rank (or use Ace)'
  const total = cards.reduce((s, c) => s + cardValue(c.rank), 0)
  if (total > 10) return `Total ${total} exceeds 10`
  return null
})

const selectedTotal = computed(() =>
  selected.value.reduce((s, i) => s + cardValue(hand.value[i]?.rank ?? 'A'), 0))

function isImmuneSuit(suit: string) {
  const enemy = enc.value.currentEnemy
  if (!enemy || enemy.immunityNullified) return false
  return enemy.card.suit === suit
}

function suitClass(suit: string) {
  return suit === 'H' || suit === 'D' ? 'suit-red' : 'suit-black'
}

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
}

function playSelected() {
  if (selected.value.length === 0) { errorMsg.value = 'Select a card to play.'; return }
  if (comboError.value) { errorMsg.value = comboError.value; return }
  act({ type: 'play_cards', cardIndices: [...selected.value] })
}

function confirmDiscard() {
  if (selectedTotal.value < enc.value.discardNeeded) {
    errorMsg.value = `Need total ≥ ${enc.value.discardNeeded} (currently ${selectedTotal.value}).`
    return
  }
  act({ type: 'discard_damage', cardIndices: [...selected.value] })
}

function chooseNext(targetIndex: number, keepTurn = false) {
  act({ type: 'choose_next', targetIndex, keepTurn })
}

function castSpell(spellId: string) {
  showSpells.value = false
  act({ type: 'cast_spell', spellId })
}

function activateRelic(targetIndex?: number) {
  whistleMode.value = false
  act({ type: 'activate_relic', targetIndex })
}

function confirmPeek() {
  const n = enc.value.setupPeek?.cards.length ?? 0
  const order = peekOrder.value.length === n ? [...peekOrder.value] : Array.from({ length: n }, (_, i) => i)
  peekOrder.value = []
  act({ type: 'setup_reorder', order })
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
  if (h.relic) lines.push(`🏺 ${h.relic.name}: ${h.relic.text}`)
  for (const m of h.memories) lines.push(`🧠 ${m.name}: ${m.text}`)
  if (!h.alive) lines.push('💀 Fallen — can be replaced at camp.')
  return lines.join('\n')
}

const rankNames: Record<string, string> = { J: 'Jack', Q: 'Queen', K: 'King' }
const tierLabels: Record<string, string> = { skirmish: 'Skirmish', veteran: 'Veteran patrol', elite: 'Elite warband', boss: 'THE CASTLE' }
const netAttack = computed(() => {
  const e = enc.value.currentEnemy
  return e ? Math.max(0, e.attack - e.shield) : 0
})
</script>

<template>
  <div class="flex flex-col gap-2 p-3 max-w-lg mx-auto pb-4 w-full">

    <!-- Encounter banner -->
    <div class="card bg-base-100/80 border border-base-content/10">
      <div class="card-body py-2 px-4 gap-0.5">
        <div class="flex items-center justify-between">
          <span class="font-display font-bold text-sm tracking-wide" :class="enc.tier === 'boss' ? 'text-error' : 'text-primary/90'">
            {{ tierLabels[enc.tier] }}
            <span v-if="enc.modifier" class="text-base-content/80"> — {{ enc.modifier.name }}</span>
          </span>
          <span class="text-xs text-base-content/50">⚔️ {{ enc.defeatedCount }}/{{ enc.totalEnemies }}</span>
        </div>
        <p v-if="enc.modifier" class="text-xs text-base-content/60">{{ enc.modifier.text }}</p>
        <p v-if="enc.bossModifier" class="text-xs" :class="enc.bossModifier.id === 'hidden' ? 'text-warning/60 italic' : 'text-warning'">
          {{ enc.bossModifier.name }}: {{ enc.bossModifier.text }}
        </p>
        <p v-for="p in enc.preps" :key="p.id" class="text-xs text-success/90" :title="p.text">
          🎒 {{ p.name }} — active this fight
        </p>
      </div>
    </div>

    <!-- Heroes -->
    <div class="flex gap-2">
      <div
        v-for="h in state.heroes" :key="h.playerId"
        :title="heroTooltip(h)"
        :class="['flex-1 rounded-lg px-2 py-1.5 text-center text-xs border transition-all duration-300 cursor-help',
          !h.alive ? 'border-error/40 bg-error/5 opacity-50' :
          h.isCurrentPlayer ? 'border-primary bg-primary/10 text-primary turn-beacon' : 'border-base-content/10 bg-base-100 text-base-content/60']"
      >
        <div class="font-semibold truncate">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}</div>
        <div class="text-base-content/40">{{ h.alive ? h.handSize + ' cards' : 'fallen' }}</div>
      </div>
    </div>

    <!-- Setup peek -->
    <div v-if="enc.turnPhase === 'setup'" class="card bg-base-100 border border-primary/40">
      <div class="card-body py-3 px-4 gap-2">
        <template v-if="myPeek">
          <p class="text-sm font-semibold">🔮 {{ enc.setupPeek!.source }} — top of the Tavern{{ enc.setupPeek!.canReorder ? ' (tap in your preferred order, first = top)' : '' }}</p>
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
      </div>
    </div>

    <!-- ═══ STAGE ═══ -->
    <div
      class="stage-swirl rounded-2xl border border-base-content/10 bg-base-300/60 px-3 pt-4 pb-3"
      :class="shaking ? 'hit-shake hurt-flash' : ''"
    >
      <div class="relative flex items-start justify-center gap-3 min-h-[11rem]">

        <!-- Tavern pile -->
        <div class="flex flex-col items-center gap-1 mt-6 shrink-0" :title="`Tavern — the draw pile. Empty? Only ♥ Hearts or a camp rest refill it.`">
          <div class="pile" :class="enc.tavernCount === 0 ? 'pile-empty' : ''">
            <div class="pile-layer" /><div class="pile-layer" /><div class="pile-layer" />
            <span class="absolute inset-0 flex items-center justify-center font-display font-bold text-primary/90 z-10">{{ enc.tavernCount }}</span>
          </div>
          <span class="text-[9px] uppercase tracking-widest text-base-content/40">Tavern</span>
        </div>

        <!-- Enemy royal card -->
        <Transition name="enemy-flip" mode="out-in">
        <div v-if="enc.currentEnemy" :key="enc.currentEnemy.card.id" class="relative flex flex-col items-center">
          <!-- floating combat numbers -->
          <div class="absolute -right-7 top-2 z-20 pointer-events-none select-none" aria-hidden="true">
            <div v-for="f in floats" :key="f.id"
              class="dmg-float absolute right-0 font-display font-black whitespace-nowrap drop-shadow"
              :class="f.kind === 'dmg' ? 'text-error text-3xl' : f.kind === 'shield' ? 'text-info text-xl' : 'text-4xl'"
            >{{ f.text }}</div>
          </div>

          <div class="royal-card w-28 h-40 flex flex-col items-center justify-between py-2 px-2 relative"
            :class="enc.tier === 'boss' ? 'royal-boss' : ''">
            <span class="self-start text-sm font-display font-black leading-none" :class="suitClass(enc.currentEnemy.card.suit)">
              {{ enc.currentEnemy.card.rank }}<br>{{ suitSymbol(enc.currentEnemy.card.suit) }}
            </span>
            <span class="text-5xl font-black font-display" :class="suitClass(enc.currentEnemy.card.suit)">
              {{ suitSymbol(enc.currentEnemy.card.suit) }}
            </span>
            <span class="self-end text-sm font-display font-black leading-none rotate-180" :class="suitClass(enc.currentEnemy.card.suit)">
              {{ enc.currentEnemy.card.rank }}<br>{{ suitSymbol(enc.currentEnemy.card.suit) }}
            </span>
            <span v-if="!enc.currentEnemy.immunityNullified"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warning text-warning-content text-xs flex items-center justify-center font-bold shadow"
              :title="`Immune to ${suitSymbol(enc.currentEnemy.card.suit)} power`"
            >{{ suitSymbol(enc.currentEnemy.card.suit) }}</span>
          </div>

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

          <!-- stat chips -->
          <div class="flex gap-2 mt-1.5 text-xs">
            <span class="px-2 py-0.5 rounded-full bg-error/15 border border-error/30 text-error font-semibold">⚔️ {{ enc.currentEnemy.attack }}</span>
            <span v-if="enc.currentEnemy.shield > 0" :key="enc.currentEnemy.shield" class="chip-pop px-2 py-0.5 rounded-full bg-info/15 border border-info/30 text-info font-semibold">
              🛡 {{ enc.currentEnemy.shield }} → {{ netAttack }}
            </span>
          </div>
        </div>
        </Transition>

        <!-- Discard pile -->
        <div class="flex flex-col items-center gap-1 mt-6 shrink-0" title="Discard — played and lost cards. ♥ Hearts recover from here.">
          <div class="pile" :class="enc.discardCount === 0 ? 'pile-empty' : ''">
            <div class="pile-layer" /><div class="pile-layer" /><div class="pile-layer" />
            <span class="absolute inset-0 flex items-center justify-center font-display font-bold text-base-content/70 z-10">{{ enc.discardCount }}</span>
          </div>
          <span class="text-[9px] uppercase tracking-widest text-base-content/40">Discard</span>
        </div>
      </div>

      <!-- last played, on the stage felt -->
      <div class="flex justify-center items-end gap-1 min-h-[3.2rem] mt-1">
        <TransitionGroup name="played">
          <div v-for="card in enc.lastPlayed" :key="card.id"
            class="card-face w-9 h-12 flex flex-col items-center justify-center font-mono text-xs shadow-lg">
            <span class="font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
            <span :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- Turn / choose-next -->
    <div class="text-center">
      <div v-if="inChoose" class="space-y-1.5">
        <div class="badge badge-warning badge-lg">
          {{ enc.pendingChooseNext ? 'Kill secured — hand off the initiative?' : 'Choose who goes next' }}
        </div>
        <div class="flex gap-2 justify-center flex-wrap">
          <button
            v-if="enc.pendingChooseNext"
            class="btn btn-sm btn-warning"
            @click="chooseNext(state.myHeroIndex, true)"
          >Keep the turn</button>
          <button
            v-for="(h, i) in state.heroes" :key="h.playerId"
            v-show="h.alive && !(enc.pendingChooseNext && i === state.myHeroIndex)"
            class="btn btn-sm btn-outline btn-warning"
            @click="chooseNext(i)"
          >{{ h.playerName }}</button>
        </div>
      </div>
      <div v-else-if="inDiscard" class="badge badge-error badge-lg soft-pulse">
        Take {{ enc.discardNeeded }} damage — discard ≥ {{ enc.discardNeeded }}
      </div>
      <div v-else-if="inPlay" class="badge badge-primary badge-lg turn-beacon">
        Your turn{{ enc.wagerArmed ? ' — 🎲 WAGER LIVE' : '' }}
      </div>
      <div v-else-if="enc.turnPhase !== 'setup'" class="badge badge-ghost badge-lg">
        {{ state.heroes[enc.currentPlayerIndex]?.playerName }}'s turn
      </div>
    </div>

    <!-- Combo hint / error -->
    <div v-if="inPlay && selected.length > 0" class="text-center text-xs -mt-1">
      <span v-if="comboError" class="text-error">{{ comboError }}</span>
      <span v-else class="chip-pop inline-block px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold" :key="selectedTotal">
        ⚔️ {{ selectedTotal }} damage
      </span>
    </div>
    <div v-if="inDiscard" class="text-center text-xs -mt-1">
      <span class="inline-block px-2 py-0.5 rounded-full border font-semibold"
        :class="selectedTotal >= enc.discardNeeded ? 'bg-success/15 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'">
        {{ selectedTotal }} / {{ enc.discardNeeded }}
      </span>
    </div>
    <div v-if="errorMsg" class="alert alert-error text-sm py-2" @click="errorMsg = ''">{{ errorMsg }}</div>

    <!-- ═══ HAND FAN ═══ -->
    <div class="mt-auto pt-3">
      <div class="flex justify-center items-end pb-2" :class="(!inPlay && !inDiscard) ? 'opacity-50' : ''">
        <div
          v-for="(card, i) in hand" :key="card.id"
          class="fan-slot first:ml-0 -ml-4 relative"
          :style="fanStyle(i, hand.length)"
        >
          <button
            class="fan-card card-face w-14 h-20 flex flex-col items-center justify-center font-mono relative block"
            :class="[
              selected.includes(i) ? (inDiscard ? 'fan-card-selected fan-card-discard' : 'fan-card-selected') : '',
              (!inPlay && !inDiscard) ? 'pointer-events-none' : '',
            ]"
            @click="toggleSelect(i)"
          >
            <span class="card-sway flex flex-col items-center" :style="{ animationDelay: `${(i * 0.45) % 3}s` }">
              <span class="text-xl font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
              <span class="text-base" :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
            </span>
            <span
              v-if="inPlay && card.rank !== 'Jo' && isImmuneSuit(card.suit)"
              class="absolute -top-1 -right-1 text-[9px] bg-warning text-warning-content rounded-full w-4 h-4 flex items-center justify-center font-bold"
              title="Power blocked by enemy immunity"
            >!</span>
          </button>
        </div>
        <p v-if="hand.length === 0" class="text-xs text-base-content/40 py-6">No cards — yield and pray.</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-1">
        <button v-if="inPlay" class="btn btn-primary flex-1" :disabled="selected.length === 0 || !!comboError" @click="playSelected">
          Play {{ selected.length > 1 ? 'combo' : 'card' }}
        </button>
        <button v-if="inPlay" class="btn btn-ghost btn-sm self-center" @click="act({ type: 'yield_turn' })">Yield</button>
        <button v-if="inDiscard" class="btn btn-error flex-1" :disabled="selectedTotal < enc.discardNeeded" @click="confirmDiscard">
          Discard ({{ selectedTotal }}/{{ enc.discardNeeded }})
        </button>
      </div>

      <!-- Campaign powers -->
      <div class="flex gap-2 mt-2 flex-wrap justify-center" v-if="isMyTurn">
        <button
          v-if="state.spells.length && (inPlay || inDiscard)"
          class="btn btn-xs btn-outline btn-secondary"
          :title="state.spells.map(sp => `${sp.name}: ${sp.text}`).join('\n')"
          @click="showSpells = !showSpells"
        >📖 Spells ({{ state.spells.length }})</button>
        <button
          v-if="enc.canWager && inPlay && !enc.wagerArmed"
          class="btn btn-xs btn-outline btn-warning"
          title="Gambler, once per chapter: if the enemy dies this turn you choose who acts next; if it survives, you discard 1 random card."
          @click="act({ type: 'arm_wager' })"
        >🎲 Wager</button>
        <button
          v-if="enc.myRelicActivatable && inPlay && me?.relic?.id !== 'r-signal-whistle'"
          class="btn btn-xs btn-outline btn-accent"
          :title="me?.relic ? `${me.relic.name}: ${me.relic.text}` : ''"
          @click="activateRelic()"
        >🏺 {{ me?.relic?.name }}</button>
        <button
          v-if="enc.myRelicActivatable && inPlay && me?.relic?.id === 'r-signal-whistle'"
          class="btn btn-xs btn-outline btn-accent"
          :title="me?.relic ? `${me.relic.name}: ${me.relic.text}` : ''"
          @click="whistleMode = !whistleMode"
        >🏺 Signal Whistle</button>
      </div>

      <div v-if="whistleMode" class="flex gap-2 mt-2 justify-center flex-wrap">
        <span class="text-xs text-base-content/50 self-center">After you:</span>
        <button
          v-for="(h, i) in state.heroes" :key="h.playerId"
          v-show="h.alive"
          class="btn btn-xs btn-outline" @click="activateRelic(i)"
        >{{ h.playerName }}</button>
      </div>

      <div v-if="showSpells" class="card bg-base-100 mt-2 border border-secondary/30">
        <div class="card-body p-3 gap-2">
          <button
            v-for="sp in state.spells" :key="sp.id"
            class="btn btn-sm btn-outline justify-start text-left h-auto py-2"
            @click="castSpell(sp.id)"
          >
            <span class="font-semibold">{{ sp.name }}{{ sp.tier === 'rare' ? ' ★' : '' }}</span>
            <span class="text-xs text-base-content/50 font-normal">{{ sp.text }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

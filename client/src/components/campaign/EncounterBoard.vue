<script setup lang="ts">
import { ref, computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, Card } from '../../types'
import { cardValue, suitSymbol, suitColor, cardLabel, CLASS_ICONS } from './cards'

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

const rankNames: Record<string, string> = { J: 'Jack', Q: 'Queen', K: 'King' }
const tierLabels: Record<string, string> = { skirmish: 'Skirmish', veteran: 'Veteran patrol', elite: 'Elite warband', boss: 'THE CASTLE' }

function heroTooltip(h: (typeof props.state.heroes)[number]): string {
  const lines = [`${h.className} — ${h.abilityText}`]
  if (h.relic) lines.push(`🏺 ${h.relic.name}: ${h.relic.text}`)
  for (const m of h.memories) lines.push(`🧠 ${m.name}: ${m.text}`)
  if (!h.alive) lines.push('💀 Fallen — can be replaced at camp.')
  return lines.join('\n')
}
</script>

<template>
  <div class="flex flex-col gap-3 p-3 max-w-lg mx-auto pb-6">

    <!-- Encounter banner -->
    <div class="card bg-base-100">
      <div class="card-body py-2 px-4">
        <div class="flex items-center justify-between">
          <span class="font-bold text-sm" :class="enc.tier === 'boss' ? 'text-warning' : ''">
            {{ tierLabels[enc.tier] }}
            <span v-if="enc.modifier"> — {{ enc.modifier.name }}</span>
          </span>
          <span class="text-xs text-base-content/50">⚔️ {{ enc.defeatedCount }}/{{ enc.totalEnemies }}</span>
        </div>
        <p v-if="enc.modifier" class="text-xs text-base-content/60">{{ enc.modifier.text }}</p>
        <p v-if="enc.bossModifier" class="text-xs" :class="enc.bossModifier.id === 'hidden' ? 'text-warning/60 italic' : 'text-warning'">
          {{ enc.bossModifier.name }}: {{ enc.bossModifier.text }}
        </p>
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
              class="btn btn-outline font-mono flex-col gap-0 w-14 h-20 relative"
              :class="peekOrder.includes(i) ? 'btn-primary' : ''"
              @click="togglePeekCard(i)"
            >
              <span :class="['text-xl', suitColor(card.suit)]">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
              <span :class="suitColor(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
              <span v-if="peekOrder.includes(i)" class="absolute -top-1 -right-1 badge badge-primary badge-xs">{{ peekOrder.indexOf(i) + 1 }}</span>
            </button>
          </div>
          <button class="btn btn-primary btn-sm" @click="confirmPeek">
            {{ enc.setupPeek!.canReorder ? 'Confirm order' : 'Got it' }}
          </button>
        </template>
        <p v-else class="text-sm text-center text-base-content/50">
          🔮 Someone is consulting the cards…
        </p>
      </div>
    </div>

    <!-- Enemy -->
    <div class="card bg-base-100 shadow-xl" v-if="enc.currentEnemy">
      <div class="card-body py-4 px-5">
        <div class="flex items-center gap-4">
          <div :class="['text-5xl font-black w-16 text-center shrink-0', suitColor(enc.currentEnemy.card.suit)]">
            {{ enc.currentEnemy.card.rank }}{{ suitSymbol(enc.currentEnemy.card.suit) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-semibold">
                {{ rankNames[enc.currentEnemy.card.rank] ?? enc.currentEnemy.card.rank }}
                of {{ { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' }[enc.currentEnemy.card.suit] }}
                <span v-if="enc.currentEnemy.immunityNullified" class="badge badge-xs badge-warning ml-1">immunity off</span>
              </span>
              <span class="text-base-content/50 text-xs">{{ Math.max(0, enc.currentEnemy.hp) }}/{{ enc.currentEnemy.maxHp }} HP</span>
            </div>
            <progress class="progress progress-error w-full h-3" :value="Math.max(0, enc.currentEnemy.hp)" :max="enc.currentEnemy.maxHp" />
            <div class="flex gap-3 mt-2 text-xs text-base-content/60 flex-wrap">
              <span>⚔️ ATK {{ enc.currentEnemy.attack }}</span>
              <span v-if="enc.currentEnemy.shield > 0" class="text-info">🛡 Shield {{ enc.currentEnemy.shield }} (net {{ Math.max(0, enc.currentEnemy.attack - enc.currentEnemy.shield) }})</span>
              <span>{{ enc.enemiesRemaining }} behind</span>
            </div>
            <div v-if="!enc.currentEnemy.immunityNullified" class="mt-1 text-xs text-warning/70">
              Immune to {{ suitSymbol(enc.currentEnemy.card.suit) }} power
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Heroes -->
    <div class="flex gap-2">
      <div
        v-for="h in state.heroes" :key="h.playerId"
        :title="heroTooltip(h)"
        :class="['flex-1 rounded-lg px-2 py-2 text-center text-xs border transition-colors cursor-help',
          !h.alive ? 'border-error/40 bg-error/5 opacity-50' :
          h.isCurrentPlayer ? 'border-primary bg-primary/10 text-primary' : 'border-base-content/10 bg-base-100 text-base-content/60']"
      >
        <div class="font-semibold truncate">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}</div>
        <div class="text-base-content/40 mt-0.5">{{ h.alive ? h.handSize + ' cards' : 'fallen' }}</div>
      </div>
    </div>

    <!-- Turn / choose-next -->
    <div class="text-center">
      <div v-if="inChoose" class="space-y-2">
        <div class="badge badge-warning badge-lg">
          {{ enc.pendingChooseNext ? 'Kill secured — hand off the initiative?' : 'Choose who goes next' }}
        </div>
        <div class="flex gap-2 justify-center flex-wrap mt-2">
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
      <div v-else-if="inDiscard" class="badge badge-error badge-lg">
        Take {{ enc.discardNeeded }} damage — discard ≥ {{ enc.discardNeeded }}
      </div>
      <div v-else-if="inPlay" class="badge badge-primary badge-lg">
        Your turn{{ enc.wagerArmed ? ' — 🎲 WAGER LIVE' : '' }}
      </div>
      <div v-else-if="enc.turnPhase !== 'setup'" class="badge badge-ghost badge-lg">
        {{ state.heroes[enc.currentPlayerIndex]?.playerName }}'s turn
      </div>
    </div>

    <!-- Combo hint -->
    <div v-if="inPlay && selected.length > 0" class="text-center text-xs">
      <span v-if="comboError" class="text-error">{{ comboError }}</span>
      <span v-else class="text-success">Valid · Total {{ selectedTotal }}</span>
    </div>

    <div v-if="errorMsg" class="alert alert-error text-sm py-2">{{ errorMsg }}</div>

    <!-- Hand -->
    <div class="mt-auto">
      <div class="flex items-center justify-between mb-2 px-1">
        <p class="text-xs text-base-content/40">Your hand ({{ hand.length }})</p>
        <p v-if="inDiscard" class="text-xs" :class="selectedTotal >= enc.discardNeeded ? 'text-success' : 'text-error'">
          {{ selectedTotal }} / {{ enc.discardNeeded }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2 justify-center">
        <button
          v-for="(card, i) in hand" :key="card.id"
          :class="['btn font-mono flex-col gap-0 leading-none w-14 h-20 relative',
            selected.includes(i) ? 'btn-primary ring-2 ring-primary ring-offset-1' : 'btn-outline btn-neutral',
            (!inPlay && !inDiscard) ? 'opacity-40 pointer-events-none' : '']"
          @click="toggleSelect(i)"
        >
          <span :class="['text-xl', suitColor(card.suit)]">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
          <span :class="['text-base', suitColor(card.suit)]">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
          <span
            v-if="inPlay && card.rank !== 'Jo' && isImmuneSuit(card.suit)"
            class="absolute -top-1 -right-1 text-[9px] bg-warning text-warning-content rounded-full w-4 h-4 flex items-center justify-center font-bold"
          >!</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-4 flex-wrap">
        <button v-if="inPlay" class="btn btn-primary flex-1" :disabled="selected.length === 0 || !!comboError" @click="playSelected">
          Play {{ selected.length > 1 ? 'combo' : 'card' }}
        </button>
        <button v-if="inPlay" class="btn btn-ghost btn-sm" @click="act({ type: 'yield_turn' })">Yield</button>
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

      <div v-if="showSpells" class="card bg-base-100 mt-2">
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

    <!-- Status -->
    <div class="flex items-center justify-between text-xs text-base-content/40 px-1">
      <span>🃏 Tavern {{ enc.tavernCount }}</span>
      <span v-if="enc.lastPlayed.length">Last: {{ enc.lastPlayed.map(cardLabel).join(' + ') }}</span>
      <span>🗑 Discard {{ enc.discardCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { socket } from '../socket'
import type { ClientGameState, Card } from '../types'

const props = defineProps<{ state: ClientGameState; code: string }>()

const selected = ref<number[]>([])
const errorMsg = ref('')

const me         = computed(() => props.state.players[props.state.myIndex])
const isMyTurn   = computed(() => props.state.myIndex === props.state.currentPlayerIndex)
const inPlay     = computed(() => props.state.turnPhase === 'play'        && isMyTurn.value)
const inDiscard  = computed(() => props.state.turnPhase === 'discard'     && isMyTurn.value)
const inChoose   = computed(() => props.state.turnPhase === 'choose_next' && isMyTurn.value)

// Combo validation (mirrors server logic)
const comboError = computed(() => {
  const hand = me.value?.hand ?? []
  const cards = selected.value.map(i => hand[i]!).filter(Boolean)
  if (cards.length === 0) return null
  if (cards.length === 1) return null
  if (cards.some(c => c.rank === 'Jo')) return 'Jesters play alone'
  const aces    = cards.filter(c => c.rank === 'A')
  const nonAces = cards.filter(c => c.rank !== 'A')
  if (aces.length === 1 && nonAces.length === 1) return null
  if (aces.length > 1) return 'Only one Ace per combo'
  const ranks = new Set(cards.map(c => c.rank))
  if (ranks.size > 1) return 'Must be same rank (or use Ace)'
  const total = cards.reduce((s, c) => s + cardValue(c.rank), 0)
  if (total > 10) return `Total ${total} exceeds 10`
  return null
})

const selectedTotal = computed(() => {
  const hand = me.value?.hand ?? []
  return selected.value.reduce((s, i) => s + cardValue(hand[i]?.rank ?? 'A'), 0)
})

// For play phase: combo total. For discard phase: damage coverage total.
const comboTotal = selectedTotal

function cardValue(rank: string): number {
  if (rank === 'A')  return 1
  if (rank === 'Jo') return 0
  if (rank === 'J')  return 10
  if (rank === 'Q')  return 15
  if (rank === 'K')  return 20
  return parseInt(rank) || 0
}

function suitSymbol(suit: string) {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit] ?? suit
}

function suitColor(suit: string) {
  return suit === 'H' || suit === 'D' ? 'text-red-400' : 'text-base-content'
}

function cardLabel(c: Card) {
  if (c.rank === 'Jo') return '🃏'
  return `${c.rank}${suitSymbol(c.suit)}`
}

function isImmuneSuit(suit: string) {
  const enemy = props.state.currentEnemy
  if (!enemy || enemy.immunityNullified) return false
  return enemy.card.suit === suit
}

function toggleSelect(i: number) {
  if (!inPlay.value && !inDiscard.value) return
  const idx = selected.value.indexOf(i)
  if (idx >= 0) {
    selected.value.splice(idx, 1)
    return
  }
  // In discard mode, allow selecting until total value covers the damage
  selected.value.push(i)
}

function playSelected() {
  if (selected.value.length === 0) { errorMsg.value = 'Select a card to play.'; return }
  if (comboError.value) { errorMsg.value = comboError.value; return }
  errorMsg.value = ''
  socket.emit('play_cards', { code: props.code, cardIndices: [...selected.value] })
  selected.value = []
}

function confirmDiscard() {
  if (selectedTotal.value < props.state.discardNeeded) {
    errorMsg.value = `Need total value ≥ ${props.state.discardNeeded} (currently ${selectedTotal.value}).`
    return
  }
  errorMsg.value = ''
  socket.emit('discard_damage', { code: props.code, cardIndices: [...selected.value] })
  selected.value = []
}

function yieldTurn() {
  errorMsg.value = ''
  selected.value = []
  socket.emit('yield_turn', { code: props.code })
}

function chooseNext(targetIndex: number) {
  socket.emit('choose_next', { code: props.code, targetIndex })
}

socket.on('error',      (msg: string) => { errorMsg.value = msg })
socket.on('game_state', ()            => { selected.value = []; errorMsg.value = '' })

function playAgain() {
  socket.emit('restart_game', { code: props.code })
}

const rankDisplayName: Record<string, string> = { J: 'Jack', Q: 'Queen', K: 'King' }
</script>

<template>
  <div class="min-h-screen flex flex-col gap-3 p-3 max-w-lg mx-auto pb-6">

    <!-- Status bar -->
    <div class="flex items-center justify-between text-xs text-base-content/50 px-1 pt-1">
      <span>⚔️ {{ state.defeatedCount }}/12 defeated</span>
      <span>🃏 Tavern: {{ state.tavernCount }} · 🗑 Discard: {{ state.discardCount }}</span>
    </div>

    <!-- Win / Lose -->
    <div v-if="state.phase === 'won' || state.phase === 'lost'"
         class="card bg-base-100 shadow-xl text-center py-12 px-6 gap-4 flex flex-col items-center">
      <div class="text-6xl crown-rise">{{ state.phase === 'won' ? '🎉' : '💀' }}</div>
      <h2 class="text-3xl font-display font-bold" :class="state.phase === 'won' ? 'gold-title' : 'text-error'">
        {{ state.phase === 'won' ? 'Victory!' : 'Defeated!' }}</h2>
      <p class="text-base-content/50 text-sm">{{ state.phase === 'won' ? 'You slew all 12 royals.' : 'The castle stands.' }}</p>
      <button class="btn btn-primary btn-lg mt-2" @click="playAgain">Play again</button>
    </div>

    <template v-else>

      <!-- Enemy -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body py-4 px-5">
          <div v-if="state.currentEnemy" class="flex items-center gap-4">
            <div :class="['text-5xl font-black w-16 text-center shrink-0', suitColor(state.currentEnemy.card.suit)]">
              {{ state.currentEnemy.card.rank }}{{ suitSymbol(state.currentEnemy.card.suit) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-semibold">
                  {{ rankDisplayName[state.currentEnemy.card.rank] ?? state.currentEnemy.card.rank }}
                  of {{ { C:'Clubs', D:'Diamonds', H:'Hearts', S:'Spades' }[state.currentEnemy.card.suit] }}
                  <span v-if="state.currentEnemy.immunityNullified" class="badge badge-xs badge-warning ml-1">immune nullified</span>
                </span>
                <span class="text-base-content/50 text-xs">{{ Math.max(0, state.currentEnemy.hp) }}/{{ state.currentEnemy.maxHp }} HP</span>
              </div>
              <progress
                class="progress progress-error w-full h-3"
                :value="Math.max(0, state.currentEnemy.hp)"
                :max="state.currentEnemy.maxHp"
              />
              <div class="flex gap-3 mt-2 text-xs text-base-content/60 flex-wrap">
                <span>⚔️ ATK {{ state.currentEnemy.attack }}</span>
                <span v-if="state.currentEnemy.shield > 0" class="text-info">🛡 Shield {{ state.currentEnemy.shield }} (net {{ Math.max(0, state.currentEnemy.attack - state.currentEnemy.shield) }})</span>
                <span>{{ state.enemiesRemaining }} more behind</span>
              </div>
              <!-- Immunity indicator -->
              <div v-if="!state.currentEnemy.immunityNullified" class="mt-1 text-xs text-warning/70">
                Immune to {{ suitSymbol(state.currentEnemy.card.suit) }} power
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Players -->
      <div class="flex gap-2">
        <div
          v-for="(p, i) in state.players"
          :key="p.id"
          :class="['flex-1 rounded-lg px-2 py-2 text-center text-xs border transition-colors',
            p.isCurrentPlayer
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-base-content/10 bg-base-100 text-base-content/60'
          ]"
        >
          <div class="font-semibold truncate">{{ p.name }}</div>
          <div class="text-base-content/40 mt-0.5">{{ p.handSize }} cards</div>
        </div>
      </div>

      <!-- Turn indicator / Jester choose-next -->
      <div class="text-center">
        <div v-if="inChoose" class="space-y-2">
          <div class="badge badge-warning badge-lg">You played a Jester — choose who goes next</div>
          <div class="flex gap-2 justify-center flex-wrap mt-2">
            <button
              v-for="(p, i) in state.players"
              :key="p.id"
              class="btn btn-sm btn-outline btn-warning"
              @click="chooseNext(i)"
            >{{ p.name }}</button>
          </div>
        </div>
        <div v-else-if="inDiscard" class="badge badge-error badge-lg">
          Take {{ state.discardNeeded }} damage — discard cards totalling ≥ {{ state.discardNeeded }}
        </div>
        <div v-else-if="inPlay" class="badge badge-primary badge-lg">Your turn — select card(s) to play</div>
        <div v-else class="badge badge-ghost badge-lg">{{ state.players[state.currentPlayerIndex]?.name }}'s turn</div>
      </div>

      <!-- Combo hint -->
      <div v-if="inPlay && selected.length > 0" class="text-center text-xs">
        <span v-if="comboError" class="text-error">{{ comboError }}</span>
        <span v-else class="text-success">
          Valid combo · Total: {{ comboTotal }}
          <span v-if="selected.length > 1"> ({{ selected.map(i => cardLabel(me!.hand![i]!)).join(' + ') }})</span>
        </span>
      </div>

      <!-- Last played -->
      <div v-if="state.lastPlayed.length && !inDiscard && !inChoose" class="text-center text-xs text-base-content/40">
        Last played: <span class="font-mono font-bold text-base-content/60">{{ state.lastPlayed.map(cardLabel).join(' + ') }}</span>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="alert alert-error text-sm py-2">{{ errorMsg }}</div>

      <!-- Hand -->
      <div class="mt-auto">
        <div class="flex items-center justify-between mb-2 px-1">
          <p class="text-xs text-base-content/40">
            Your hand ({{ me?.hand?.length ?? 0 }})
          </p>
          <p v-if="inPlay" class="text-xs text-base-content/40">Tap to select · combo with Ace or same rank ≤10</p>
          <p v-if="inDiscard" class="text-xs" :class="selectedTotal >= state.discardNeeded ? 'text-success' : 'text-error'">
            Value: {{ selectedTotal }} / {{ state.discardNeeded }} needed
          </p>
        </div>

        <div class="flex flex-wrap gap-2 justify-center">
          <button
            v-for="(card, i) in me?.hand"
            :key="card.id"
            :class="[
              'btn font-mono flex-col gap-0 leading-none w-14 h-20 relative hand-card',
              selected.includes(i)
                ? 'btn-primary ring-2 ring-primary ring-offset-1 hand-card-selected'
                : 'btn-outline btn-neutral',
              (!inPlay && !inDiscard) ? 'opacity-40 pointer-events-none' : '',
            ]"
            @click="toggleSelect(i)"
          >
            <span :class="['text-xl', suitColor(card.suit)]">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
            <span :class="['text-base', suitColor(card.suit)]">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
            <!-- Immunity warning -->
            <span
              v-if="inPlay && card.rank !== 'Jo' && isImmuneSuit(card.suit)"
              class="absolute -top-1 -right-1 text-[9px] bg-warning text-warning-content rounded-full w-4 h-4 flex items-center justify-center font-bold"
              title="Power blocked by enemy"
            >!</span>
          </button>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 mt-4">
          <button
            v-if="inPlay"
            class="btn btn-primary flex-1"
            :disabled="selected.length === 0 || !!comboError"
            @click="playSelected"
          >
            Play {{ selected.length > 1 ? 'combo' : 'card' }}
          </button>

          <button
            v-if="inPlay"
            class="btn btn-ghost btn-sm"
            @click="yieldTurn"
          >Yield</button>

          <button
            v-if="inDiscard"
            class="btn btn-error flex-1"
            :disabled="selectedTotal < state.discardNeeded"
            @click="confirmDiscard"
          >Discard ({{ selectedTotal }}/{{ state.discardNeeded }})</button>
        </div>
      </div>

      <!-- Log -->
      <div class="card bg-base-100 mt-1">
        <div class="card-body py-3 px-4">
          <p class="text-xs font-semibold text-base-content/30 uppercase tracking-wider mb-1">Log</p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <p v-for="(entry, i) in state.log" :key="i" class="text-xs text-base-content/60 leading-snug">{{ entry }}</p>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

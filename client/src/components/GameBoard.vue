<script setup lang="ts">
import { ref, computed } from 'vue'
import { socket } from '../socket'
import type { ClientGameState, Card } from '../types'

const props = defineProps<{ state: ClientGameState; code: string }>()

const selected      = ref<number[]>([])
const errorMsg      = ref('')

const me = computed(() => props.state.players[props.state.myIndex])
const isMyTurn = computed(() => props.state.myIndex === props.state.currentPlayerIndex)
const inDiscard = computed(() => props.state.turnPhase === 'discard' && isMyTurn.value)
const inPlay    = computed(() => props.state.turnPhase === 'play'    && isMyTurn.value)

function suitColor(suit: string) {
  return suit === 'H' || suit === 'D' ? 'text-red-400' : 'text-base-content'
}
function suitSymbol(suit: string) {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit] ?? suit
}
function cardLabel(c: Card) {
  return `${c.rank}${suitSymbol(c.suit)}`
}

function toggleSelect(i: number) {
  if (!inDiscard.value && !inPlay.value) return
  if (inPlay.value) {
    // play = single card
    selected.value = selected.value[0] === i ? [] : [i]
    return
  }
  // discard = multi-select up to needed
  const idx = selected.value.indexOf(i)
  if (idx >= 0) selected.value.splice(idx, 1)
  else if (selected.value.length < props.state.discardNeeded) selected.value.push(i)
}

function playSelected() {
  if (selected.value.length !== 1) { errorMsg.value = 'Select a card to play.'; return }
  errorMsg.value = ''
  socket.emit('play_card', { code: props.code, cardIndex: selected.value[0] })
  selected.value = []
}

function confirmDiscard() {
  if (selected.value.length !== props.state.discardNeeded) {
    errorMsg.value = `Select exactly ${props.state.discardNeeded} card(s).`
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

socket.on('error', (msg: string) => { errorMsg.value = msg })
socket.on('game_state', () => { selected.value = [] })
</script>

<template>
  <div class="min-h-screen flex flex-col p-3 gap-3 max-w-lg mx-auto">

    <!-- Status bar -->
    <div class="flex items-center justify-between text-xs text-base-content/50 px-1">
      <span>⚔️ {{ state.defeatedCount }}/12 defeated</span>
      <span>🃏 Draw: {{ state.drawCount }}  🍺 Tavern: {{ state.tavernCount }}</span>
    </div>

    <!-- Win / Lose overlay -->
    <div v-if="state.phase === 'won' || state.phase === 'lost'"
      class="card bg-base-100 shadow-xl text-center py-10">
      <div class="text-4xl mb-3">{{ state.phase === 'won' ? '🎉' : '💀' }}</div>
      <h2 class="text-2xl font-bold">{{ state.phase === 'won' ? 'Victory!' : 'Defeated!' }}</h2>
    </div>

    <template v-else>
      <!-- Enemy card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body py-4 px-5">
          <div v-if="state.currentEnemy" class="flex items-center gap-4">
            <div :class="['text-5xl font-black w-16 text-center', suitColor(state.currentEnemy.card.suit)]">
              {{ state.currentEnemy.card.rank }}{{ suitSymbol(state.currentEnemy.card.suit) }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-semibold">{{ state.currentEnemy.card.rank === 'J' ? 'Jack' : state.currentEnemy.card.rank === 'Q' ? 'Queen' : 'King' }}</span>
                <span class="text-base-content/50">{{ state.currentEnemy.hp }} / {{ state.currentEnemy.maxHp }} HP</span>
              </div>
              <progress
                class="progress progress-error w-full"
                :value="state.currentEnemy.hp"
                :max="state.currentEnemy.maxHp"
              />
              <div class="flex gap-3 mt-2 text-xs text-base-content/60">
                <span>⚔️ ATK {{ state.currentEnemy.attack }}</span>
                <span v-if="state.currentEnemy.shieldThisTurn > 0">🛡 Shield {{ state.currentEnemy.shieldThisTurn }}</span>
                <span>{{ state.enemiesRemaining }} enemies left</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-base-content/40 py-2">No enemy active</div>
        </div>
      </div>

      <!-- Players -->
      <div class="flex gap-2">
        <div
          v-for="(p, i) in state.players"
          :key="p.id"
          :class="['flex-1 rounded-lg px-2 py-1.5 text-center text-xs border',
            p.isCurrentPlayer ? 'border-primary bg-primary/10' : 'border-base-content/10 bg-base-100'
          ]"
        >
          <div class="font-medium truncate">{{ p.name }}</div>
          <div class="text-base-content/40">{{ p.handSize }} cards</div>
        </div>
      </div>

      <!-- Turn indicator -->
      <div class="text-center text-sm">
        <span v-if="inDiscard" class="badge badge-error badge-lg">
          Discard {{ state.discardNeeded }} card{{ state.discardNeeded !== 1 ? 's' : '' }} (damage)
        </span>
        <span v-else-if="inPlay" class="badge badge-primary badge-lg">Your turn — play a card</span>
        <span v-else class="badge badge-ghost badge-lg">{{ state.players[state.currentPlayerIndex]?.name }}'s turn</span>
      </div>

      <!-- Last played -->
      <div v-if="state.lastPlayed.length" class="text-center text-xs text-base-content/40">
        Last played: <span class="font-mono font-bold">{{ state.lastPlayed.map(cardLabel).join(', ') }}</span>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="alert alert-error text-sm py-2">{{ errorMsg }}</div>

      <!-- Hand -->
      <div class="mt-auto">
        <p class="text-xs text-base-content/40 mb-2 px-1">
          Your hand ({{ me?.hand?.length ?? 0 }} cards)
          <span v-if="inDiscard" class="text-error">· tap to select for discard ({{ selected.length }}/{{ state.discardNeeded }})</span>
          <span v-else-if="inPlay" class="text-primary">· tap a card to play it</span>
        </p>
        <div class="flex flex-wrap gap-2 justify-center">
          <button
            v-for="(card, i) in me?.hand"
            :key="i"
            :class="[
              'btn font-mono text-lg w-14 h-18 flex-col gap-0 leading-none',
              selected.includes(i) ? 'btn-primary' : 'btn-outline btn-neutral',
              suitColor(card.suit),
              (inPlay || inDiscard) ? '' : 'btn-disabled opacity-40'
            ]"
            @click="toggleSelect(i)"
          >
            <span class="text-xl">{{ card.rank }}</span>
            <span>{{ suitSymbol(card.suit) }}</span>
          </button>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4">
          <button
            v-if="inPlay"
            class="btn btn-primary flex-1"
            :disabled="selected.length !== 1"
            @click="playSelected"
          >Play card</button>

          <button
            v-if="inPlay"
            class="btn btn-ghost btn-sm"
            @click="yieldTurn"
          >Yield</button>

          <button
            v-if="inDiscard"
            class="btn btn-error flex-1"
            :disabled="selected.length !== state.discardNeeded"
            @click="confirmDiscard"
          >Confirm discard</button>
        </div>
      </div>

      <!-- Game log -->
      <div class="card bg-base-100 mt-2">
        <div class="card-body py-3 px-4">
          <p class="text-xs font-semibold text-base-content/40 mb-2 uppercase tracking-wider">Log</p>
          <div class="space-y-1 max-h-36 overflow-y-auto">
            <p v-for="(entry, i) in state.log" :key="i" class="text-xs text-base-content/60">{{ entry }}</p>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

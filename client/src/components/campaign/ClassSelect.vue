<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import HeroPortrait from './HeroPortrait.vue'
import { CLASS_SIGNATURE_PREVIEW, tokenToneClass } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

// province canon 2026-06-11: core four + support (Commander, Warden) + weird
// (Gambler, Oracle) are start-available; Exile remains a later unlock
const CORE = [
  {
    id: 'sentinel', name: 'Sentinel', theme: 'Shield · Stability', suit: '♠',
    question: 'How do we survive tomorrow?',
    text: 'Starts with Plate (+1 shield) stamped on three Spades — lead spades to stack shield and tank counters.',
    pillars: [['Shield', 3], ['Recovery', 1]] as const,
    accent: 'sentinel-accent',
  },
  {
    id: 'quartermaster', name: 'Quartermaster', theme: 'Draw · Access', suit: '♦',
    question: 'How do we keep options?',
    text: 'Starts with Provision (+1 draw pool) on three Diamonds — your diamonds dig deeper into the deck.',
    pillars: [['Access', 3], ['Consistency', 1]] as const,
    accent: 'quartermaster-accent',
  },
  {
    id: 'surgeon', name: 'Surgeon', theme: 'Recovery · Precision', suit: '♥',
    question: 'How do we recover mistakes?',
    text: 'Starts with Mend (+1 recover) on three Hearts — hearts return extra cards; outlast the attrition.',
    pillars: [['Recovery', 3], ['Consistency', 1]] as const,
    accent: 'surgeon-accent',
  },
  {
    id: 'executioner', name: 'Executioner', theme: 'Thresholds · Edge', suit: '♣',
    question: 'When should the enemy die?',
    text: 'Starts with Edge (+2 ♣ damage) on two Clubs and an Undercut (−1) scalpel — hit hard, then land exact kills.',
    pillars: [['Initiative', 2], ['Consistency', 1]] as const,
    accent: 'executioner-accent',
  },
  {
    id: 'commander', name: 'Commander', theme: 'Initiative · Sequencing', suit: '⚜',
    question: 'Who strikes next?',
    text: 'Starts with Banner on three cards — every kill with a Banner card draws you forward. (Parked — untuned.)',
    pillars: [['Initiative', 3], ['Access', 1]] as const,
    accent: 'commander-accent',
  },
  {
    id: 'warden', name: 'Warden', theme: 'Defense · Hold', suit: '🕯',
    question: 'Who carries the fallen?',
    text: 'Starts with Bulwark-weave (+2 soak) on three low cards — cheap cards become heavy armor. (Parked — untuned.)',
    pillars: [['Shield', 2], ['Recovery', 2]] as const,
    accent: 'warden-accent',
  },
  {
    id: 'gambler', name: 'Gambler', theme: 'Risk · Tempo', suit: '🎲',
    question: 'What is it worth to you?',
    text: 'Starts with Glasswork (+2 hit / −1 soak) and a Mark — monstrous swings, fragile defense. (Parked — untuned.)',
    pillars: [['Initiative', 2], ['Access', 2]] as const,
    accent: 'gambler-accent',
  },
  {
    id: 'oracle', name: 'Oracle', theme: 'Foresight · Consistency', suit: '🔮',
    question: 'What does the road hide?',
    text: 'Starts with Scry and Mark — foresee the Tavern and strike the marked card. (Parked — untuned.)',
    pillars: [['Consistency', 3], ['Initiative', 1]] as const,
    accent: 'oracle-accent',
  },
  {
    id: 'exile', name: 'Exile', theme: 'Deck Evolution', suit: '🔥',
    question: 'What must be cut away?',
    text: 'Starts leaner (18 cards) with Transmute on two cards — a sharper, thinner deck. (Parked — untuned.)',
    pillars: [['Consistency', 2], ['Recovery', 1]] as const,
    accent: 'exile-accent',
  },
]

const takenBy = computed(() => {
  const map: Record<string, string> = {}
  for (const h of props.state.heroes) if (h.picked) map[h.classId] = h.playerName
  return map
})

const myHero = computed(() => props.state.heroes[props.state.myHeroIndex])
const waitingOn = computed(() => props.state.heroes.filter(h => !h.picked).map(h => h.playerName))

function pick(classId: string) {
  socket.emit('campaign_action', { code: props.code, action: { type: 'pick_class', classId } })
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 space-y-5 w-full">
    <div class="text-center rise-in">
      <p class="font-flavor text-primary/60 text-sm tracking-[0.3em] uppercase">the kingdom calls</p>
      <h2 class="text-3xl font-display font-bold gold-title mt-1">Assemble the Lineage</h2>
      <div class="splash-rule h-px mt-3 mx-auto w-56 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <p class="text-sm text-base-content/50 mt-2 font-flavor tracking-wide">
        Chapter {{ state.chapter }} — all nine banners answer the call.
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        v-for="(cls, i) in CORE" :key="cls.id"
        :class="[`rise-in-${Math.min(i + 1, 4)}`, 'class-card group relative text-left flex flex-col',
          myHero?.picked && myHero?.classId === cls.id ? 'class-card-chosen' : '',
          takenBy[cls.id] && takenBy[cls.id] !== myHero?.playerName ? 'class-card-taken' : '']"
        @click="pick(cls.id)"
      >
        <!-- suit watermark -->
        <span class="absolute bottom-1 right-2 text-6xl opacity-[0.07] font-black select-none pointer-events-none"
          :class="cls.suit === '♥' || cls.suit === '♦' ? 'text-error' : 'text-base-content'">{{ cls.suit }}</span>

        <!-- portrait -->
        <div class="class-medallion class-medallion-lg mx-auto mt-4 group-hover:scale-110 transition-transform">
          <HeroPortrait :class-id="cls.id" />
        </div>

        <div class="px-3 pb-3 pt-2 text-center flex-1 flex flex-col">
          <h3 class="font-display font-black tracking-wide text-base text-primary/95">{{ cls.name }}</h3>
          <p class="text-[10px] uppercase tracking-[0.2em] text-base-content/40">{{ cls.theme }} {{ cls.suit }}</p>
          <p class="font-flavor text-xs text-base-content/60 italic mt-1.5 leading-snug">“{{ cls.question }}”</p>
          <p class="text-[11px] text-base-content/70 mt-2 leading-snug flex-1">{{ cls.text }}</p>

          <!-- ascending-deck: the cards this class stamps at level 1 (select-by-cards) -->
          <div v-if="state.ascendingDeck && CLASS_SIGNATURE_PREVIEW[cls.id]" class="mt-2">
            <p class="text-[8px] uppercase tracking-[0.2em] text-primary/50">Starts stamped</p>
            <div class="flex flex-wrap justify-center gap-1 mt-1">
              <span
                v-for="(sg, si) in CLASS_SIGNATURE_PREVIEW[cls.id]" :key="si"
                class="inline-flex items-center gap-0.5 text-[10px] font-mono rounded border px-1 py-px bg-base-100/60 border-base-content/15"
                :title="sg.name"
              >
                <span class="font-bold">{{ sg.card }}</span>
                <span class="text-[8px] rounded px-0.5 border font-bold leading-none" :class="tokenToneClass(sg.tone)">{{ sg.short }}</span>
              </span>
            </div>
          </div>

          <!-- pillar dots -->
          <div class="flex justify-center gap-3 mt-2.5">
            <div v-for="[pillar, dots] in cls.pillars" :key="pillar" class="text-center">
              <div class="flex gap-0.5 justify-center">
                <span v-for="d in 3" :key="d" class="w-1.5 h-1.5 rounded-full"
                  :class="d <= dots ? 'bg-primary' : 'bg-base-content/15'" />
              </div>
              <span class="text-[8px] uppercase tracking-wider text-base-content/40">{{ pillar }}</span>
            </div>
          </div>
        </div>

        <!-- claimed ribbon / chosen seal -->
        <div v-if="takenBy[cls.id]" class="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border shadow"
            :class="takenBy[cls.id] === myHero?.playerName
              ? 'bg-primary text-primary-content border-primary'
              : 'bg-base-300 text-base-content/70 border-base-content/20'">
            {{ takenBy[cls.id] === myHero?.playerName ? '⚜ YOURS' : takenBy[cls.id] }}
          </span>
        </div>
      </button>
    </div>

    <p class="text-center text-xs text-base-content/40">
      <template v-if="waitingOn.length">
        <span class="soft-pulse">Waiting on {{ waitingOn.join(', ') }}…</span>
      </template>
      All classes are unlocked for playtesting.
    </p>
    <p v-if="state.ascendingDeck" class="text-center text-[11px] text-primary/50 font-flavor tracking-wide">
      ✒ The Ascending Deck: everyone starts the same 20 cards (A–5). Your class is the
      tokens stamped on them — forge more at the Forge as you grow toward a full deck.
    </p>
    <p v-else class="text-center text-[11px] text-primary/50 font-flavor tracking-wide">
      ⚔ Province rules: each suited hero curates the deck at setup — their lowest cards of their own suit are cut.
      One Second Wind per act on the road; rank gates grant no mercy.
    </p>
  </div>
</template>

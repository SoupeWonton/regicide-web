<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import HeroPortrait from './HeroPortrait.vue'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

// province canon 2026-06-11: core four + support (Commander, Warden) + weird
// (Gambler, Oracle) are start-available; Exile remains a later unlock
const CORE = [
  {
    id: 'sentinel', name: 'Sentinel', theme: 'Shield · Stability', suit: '♠',
    question: 'How do we survive tomorrow?',
    text: 'Once per enemy, your first Spade gains +2 shield value.',
    pillars: [['Shield', 3], ['Recovery', 1]] as const,
    accent: 'sentinel-accent',
  },
  {
    id: 'quartermaster', name: 'Quartermaster', theme: 'Draw · Access', suit: '♦',
    question: 'How do we keep options?',
    text: 'Your first Diamond trigger each enemy draws +1 extra card, and your hand cap is +1.',
    pillars: [['Access', 3], ['Consistency', 1]] as const,
    accent: 'quartermaster-accent',
  },
  {
    id: 'surgeon', name: 'Surgeon', theme: 'Recovery · Precision', suit: '♥',
    question: 'How do we recover mistakes?',
    text: 'Your first Heart trigger each enemy recovers +1 additional card.',
    pillars: [['Recovery', 3], ['Consistency', 1]] as const,
    accent: 'surgeon-accent',
  },
  {
    id: 'executioner', name: 'Executioner', theme: 'Thresholds · Initiative', suit: '♣',
    question: 'When should the enemy die?',
    text: 'Once per enemy, if your damage leaves the enemy at 1-2 HP, deal +2 finishing damage.',
    pillars: [['Initiative', 2], ['Consistency', 1]] as const,
    accent: 'executioner-accent',
  },
  {
    id: 'commander', name: 'Commander', theme: 'Initiative · Sequencing', suit: '⚜',
    question: 'Who strikes next?',
    text: 'After your kill, pass the turn to any ally — and draw 1 card (Press the Advantage).',
    pillars: [['Initiative', 3], ['Access', 1]] as const,
    accent: 'commander-accent',
  },
  {
    id: 'warden', name: 'Warden', theme: 'Death Mitigation', suit: '🕯',
    question: 'Who carries the fallen?',
    text: 'Vigil: once per act, your collapse does not spend the party’s second wind.',
    pillars: [['Shield', 2], ['Recovery', 2]] as const,
    accent: 'warden-accent',
  },
  {
    id: 'gambler', name: 'Gambler', theme: 'Uncertainty · Tempo', suit: '🎲',
    question: 'What is it worth to you?',
    text: 'Once per chapter, wager: if the enemy dies this turn, draw 2 and choose who acts next; if not, lose a random card.',
    pillars: [['Initiative', 2], ['Access', 2]] as const,
    accent: 'gambler-accent',
  },
  {
    id: 'oracle', name: 'Oracle', theme: 'Hidden Information', suit: '🔮',
    question: 'What does the road hide?',
    text: 'Peek the top 3 Tavern cards each encounter and reorder them. Foresight: your first play after a peek deals +1.',
    pillars: [['Consistency', 3], ['Initiative', 1]] as const,
    accent: 'oracle-accent',
  },
  {
    id: 'exile', name: 'Exile', theme: 'Deck Evolution', suit: '🔥',
    question: 'What must be cut away?',
    text: 'Once per camp, exile one card from the deck for the rest of the chapter. Every second exile adds Burden.',
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
    <p class="text-center text-[11px] text-primary/50 font-flavor tracking-wide">
      ⚔ Province rules: each suited hero curates the deck at setup — their lowest cards of their own suit are cut.
      One Second Wind per act on the road; rank gates grant no mercy.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState } from '../../types'
import HeroPortrait from './HeroPortrait.vue'
import { STAFF_CHOICES } from './cards'

const props = defineProps<{ state: ClientCampaignState; code: string }>()

// province canon 2026-06-11: core four + support (Commander, Warden) + weird
// (Gambler, Oracle) are start-available; Exile remains a later unlock
const CORE = [
  {
    id: 'sentinel', name: 'Sentinel', theme: 'Shield · Stability', suit: '♠',
    question: 'How do we survive tomorrow?',
    text: 'Block — the wall. Build ♠ shield until the counterattack hits 0: a FULL BLOCK is your key moment. Your Staff bends how you reach it; your ♠ path pays it off from Continent 2.',
    pillars: [['Shield', 3], ['Recovery', 1]] as const,
    accent: 'sentinel-accent',
  },
  {
    id: 'quartermaster', name: 'Quartermaster', theme: 'Draw · Access', suit: '♦',
    question: 'How do we keep options?',
    text: 'Combine — the engine. Dump a big same-rank combo in one turn: the BIG COMBINE is your key moment. Your Staff bends how you assemble it; your ♦ path pays it off from Continent 2.',
    pillars: [['Access', 3], ['Consistency', 1]] as const,
    accent: 'quartermaster-accent',
  },
  {
    id: 'surgeon', name: 'Surgeon', theme: 'Recovery · Precision', suit: '♥',
    question: 'How do we recover mistakes?',
    text: 'Persist — the recycler. ♥ recoveries turn your discard into a second deck: a RECOVERY is your key moment. Your Staff bends how you recover; your ♥ path pays it off from Continent 2.',
    pillars: [['Recovery', 3], ['Consistency', 1]] as const,
    accent: 'surgeon-accent',
  },
  {
    id: 'executioner', name: 'Executioner', theme: 'Thresholds · Edge', suit: '♣',
    question: 'When should the enemy die?',
    text: 'Kill — the finisher. Land damage EXACTLY equal to remaining HP: the EXACT KILL is your key moment (recruit or graft). Your Staff bends how you hit the number; your ♣ path pays it off from Continent 2.',
    pillars: [['Initiative', 2], ['Consistency', 1]] as const,
    accent: 'executioner-accent',
  },
  {
    id: 'commander', name: 'Commander', theme: 'Initiative · Sequencing', suit: '⚜',
    question: 'Who strikes next?',
    text: 'After any kill, Press the Advantage: draw 2 solo, or draw 1 and hand your follow-up turn to an ally (multiplayer). Siege: your first castle handoff re-arms that ally with 2 cards.',
    pillars: [['Initiative', 3], ['Access', 1]] as const,
    accent: 'commander-accent',
  },
  {
    id: 'warden', name: 'Warden', theme: 'Defense · Hold', suit: '🕯',
    question: 'Who carries the fallen?',
    text: 'Defiant Stand — once per run, the death fork gains a third path: revive the fallen ally with 2 cards. Siege: once per castle, the first death is prevented outright. (Locked — not yet selectable.)',
    pillars: [['Shield', 2], ['Recovery', 2]] as const,
    accent: 'warden-accent',
  },
  {
    id: 'gambler', name: 'Gambler', theme: 'Risk · Tempo', suit: '🎲',
    question: 'What is it worth to you?',
    text: 'Once per encounter, wager on a kill: land it to draw 2 (and pick who acts next in multiplayer); miss and discard 1 at random. Siege: at the castle, your first strike is doubled or halved on a coin flip.',
    pillars: [['Initiative', 2], ['Access', 2]] as const,
    accent: 'gambler-accent',
  },
  {
    id: 'oracle', name: 'Oracle', theme: 'Foresight · Consistency', suit: '🔮',
    question: 'What does the road hide?',
    text: 'At each encounter start, reorder the top 3 Tavern cards — the one you place on top is Marked for +2 damage when played. Siege: at the castle, the Marked strike deals +3.',
    pillars: [['Consistency', 3], ['Initiative', 1]] as const,
    accent: 'oracle-accent',
  },
  {
    id: 'exile', name: 'Exile', theme: 'Deck Evolution', suit: '🔥',
    question: 'What must be reshaped?',
    text: 'Starts with Transmute stamped on two cards. (Parked — reworking; no active ability yet.)',
    pillars: [['Consistency', 2], ['Recovery', 1]] as const,
    accent: 'exile-accent',
  },
]

// New players get only the 4 core classes; the other 5 are meta-unlock runway
// (hidden until unlocked). The server enforces the same set in pick_class.
// Widen this list when meta-unlocks ship.
const AVAILABLE_CLASSES = ['sentinel', 'quartermaster', 'surgeon', 'executioner']
const VISIBLE = CORE.filter(c => AVAILABLE_CLASSES.includes(c.id))

const takenBy = computed(() => {
  const map: Record<string, string> = {}
  for (const h of props.state.heroes) if (h.picked) map[h.classId] = h.playerName
  return map
})

const myHero = computed(() => props.state.heroes[props.state.myHeroIndex])
const waitingOn = computed(() => props.state.heroes.filter(h => !h.picked).map(h => h.playerName))

// V3 §2: class → then pick one of its four Staffs (ascending only; the quick
// canon path keeps the one-tap class pick).
const pendingClass = ref<string | null>(null)
const pendingStaffs = computed(() => pendingClass.value ? (STAFF_CHOICES[pendingClass.value] ?? []) : [])

function pick(classId: string) {
  if (props.state.ascendingDeck && (STAFF_CHOICES[classId]?.length ?? 0) > 0) {
    pendingClass.value = pendingClass.value === classId ? null : classId
    return
  }
  socket.emit('campaign_action', { code: props.code, action: { type: 'pick_class', classId } })
}

function pickStaff(staffId: string) {
  if (!pendingClass.value) return
  socket.emit('campaign_action', {
    code: props.code,
    action: { type: 'pick_class', classId: pendingClass.value, staffId },
  })
  pendingClass.value = null
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 space-y-5 w-full">
    <div class="text-center rise-in">
      <p class="font-flavor text-primary/60 text-sm tracking-[0.3em] uppercase">the kingdom calls</p>
      <h2 class="text-3xl font-display font-bold gold-title mt-1">Assemble the Lineage</h2>
      <div class="splash-rule h-px mt-3 mx-auto w-56 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <p class="text-sm text-base-content/50 mt-2 font-flavor tracking-wide">
        Continent {{ Math.ceil(state.chapter / 3) }} · Province {{ ((state.chapter - 1) % 3) + 1 }} — choose your banner.
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        v-for="(cls, i) in VISIBLE" :key="cls.id"
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

          <!-- V3: the class's four Staffs (pick one after choosing the class) -->
          <div v-if="state.ascendingDeck && STAFF_CHOICES[cls.id]" class="mt-2">
            <p class="text-[8px] uppercase tracking-[0.2em] text-primary/50">Staffs</p>
            <div class="flex flex-wrap justify-center gap-1 mt-1">
              <span
                v-for="st in STAFF_CHOICES[cls.id]" :key="st.id"
                class="text-[9px] font-mono rounded border px-1 py-px bg-base-100/60 border-base-content/15"
                :title="st.text"
              >{{ st.name }}</span>
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

    <!-- V3 §2: the Staff pick — one of your class's four (swap later at Fallen Heroes) -->
    <div v-if="pendingClass" class="rounded-box border border-primary/30 bg-base-200/60 p-3 space-y-2 rise-in">
      <p class="text-center text-sm font-semibold text-primary/90">
        Choose your Staff — {{ CORE.find(c2 => c2.id === pendingClass)?.name }}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          v-for="st in pendingStaffs" :key="st.id"
          class="btn btn-sm h-auto py-2 justify-start text-left normal-case flex-col items-start gap-0.5 bg-base-100/60 border-base-content/15 hover:border-primary/50"
          @click="pickStaff(st.id)"
        >
          <span class="font-bold text-primary/90">{{ st.name }}<span v-if="st.activated" class="ml-1 text-[9px] uppercase tracking-wider text-info">· activated</span></span>
          <span class="text-[10px] leading-snug text-base-content/70 font-normal whitespace-normal">{{ st.text }}</span>
        </button>
      </div>
    </div>

    <p class="text-center text-xs text-base-content/40">
      <template v-if="waitingOn.length">
        <span class="soft-pulse">Waiting on {{ waitingOn.join(', ') }}…</span>
      </template>
      More banners unlock as your Kingdom grows.
    </p>
    <p v-if="state.ascendingDeck" class="text-center text-[11px] text-primary/50 font-flavor tracking-wide">
      ✒ Every class starts the same 20 cards (A–5). Your identity is your Staff (pick one
      of four) and your home-suit path — its first rung reveals when you reach Continent 2.
    </p>
    <p v-else class="text-center text-[11px] text-primary/50 font-flavor tracking-wide">
      ⚔ Province rules: each suited hero curates the deck at setup — their lowest cards of their own suit are cut.
      Dead is dead — no second winds; rank gates grant no mercy.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { socket } from '../../socket'
import type { ClientCampaignState, ClientHero } from '../../types'
import ClassSelect from './ClassSelect.vue'
import RoadMap from './RoadMap.vue'
import EncounterBoard from './EncounterBoard.vue'
import CampPanel from './CampPanel.vue'
import OverlayModal from './OverlayModal.vue'
import ItemCard from './ItemCard.vue'
import { suitSymbol, suitColor, CLASS_ICONS } from './cards'
import { sound, toggleMute, sfx } from '../../sound'

const muted = ref(sound.muted)
function onToggleMute() { muted.value = toggleMute() }

// ── Boss victory sequence ────────────────────────────────────────────────────
const victory = ref<{ title: string; sub: string } | null>(null)
let victoryTimer: ReturnType<typeof setTimeout> | null = null

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const errorMsg = ref('')
socket.on('error', (msg: string) => { errorMsg.value = msg })

const phase = computed(() => props.state.phase)
const choice = computed(() => props.state.pendingChoice)

// group phases so the cross-fade doesn't re-fire for overlay-only changes
const phaseKey = computed(() => {
  const p = phase.value
  if (p === 'encounter' || p === 'death_vote') return 'fight'
  if (p === 'road' || p === 'landmark' || p === 'replace_hero') return 'road'
  return p
})

// ── Splash overlays: chapter cards & encounter gates ─────────────────────────
const splash = ref<{ over: string; title: string; sub: string; tone: 'gold' | 'blood'; fx?: boolean } | null>(null)
let splashTimer: ReturnType<typeof setTimeout> | null = null

function showSplash(s: NonNullable<typeof splash.value>, ms = 2200) {
  if (splashTimer) clearTimeout(splashTimer)
  splash.value = s
  splashTimer = setTimeout(() => { splash.value = null }, ms)
}

// remember what we were fighting — the encounter is already null by the time
// the win transition fires
const lastFightTier = ref('')
watch(() => props.state.encounter?.tier, t => { if (t) lastFightTier.value = t })
const lastFightRank = ref<'J' | 'Q' | 'K' | null>(null)
watch(() => props.state.encounter, e => { if (e) lastFightRank.value = e.siegeRank }, { immediate: true })

watch(() => props.state.phase, (now, was) => {
  // a boss just fell — memory drafts only ever follow a slain castle / Throne
  if (now === 'memory_draft' && was === 'encounter') {
    victory.value = lastFightRank.value === 'K'
      ? { title: 'The Throne Is Taken', sub: 'The province is liberated. Each survivor carries a Memory of the siege.' }
      : props.state.chapter === 1
        ? { title: 'The Castle Falls', sub: 'The First Ascension is yours. Each survivor carries a Memory from the ruin.' }
        : { title: 'The Broken Court Falls', sub: 'The crown is shattered. Draft your memories — the Kingdom will remember.' }
    sfx.triumph()
    if (victoryTimer) clearTimeout(victoryTimer)
    victoryTimer = setTimeout(() => { victory.value = null }, 4200)
  }
  // a road fight or rank gate was won (retreats go to camp, wipes end the
  // campaign) — give the table its moment before the spoils appear
  if (was === 'encounter' && (now === 'landmark' || now === 'road')) {
    if (lastFightRank.value === 'J' || lastFightRank.value === 'Q') {
      // province rank gate cleared — bigger moment, full trumpets
      sfx.triumph()
      showSplash({
        over: 'The siege advances',
        title: lastFightRank.value === 'J' ? 'The Gates Have Fallen' : 'The Courtyard Is Yours',
        sub: lastFightRank.value === 'J' ? 'The Courtyard awaits beyond the rubble.' : 'Only the Throne room remains.',
        tone: 'gold',
        fx: true,
      }, 3000)
      lastFightRank.value = null
    } else {
      const titles: Record<string, string> = {
        skirmish: 'Skirmish Cleared', veteran: 'Veterans Broken', elite: 'Elite Warband Destroyed',
      }
      sfx.victory()
      showSplash({
        over: 'Victory',
        title: titles[lastFightTier.value] ?? 'Encounter Cleared',
        sub: now === 'landmark' ? 'Claim your spoils.' : 'The road continues.',
        tone: 'gold',
        fx: true,
      }, 2100)
    }
  }
  if (now === 'road' && was === 'class_select')
    showSplash({ over: 'Chapter One', title: 'The First Ascension', sub: 'The road remembers every step.', tone: 'gold' }, 2800)
  if (now === 'road' && was === 'chapter_complete')
    showSplash({ over: 'Chapter Two', title: 'The Broken Court', sub: 'Harder roads. Richer crowns.', tone: 'blood' }, 2800)
  if (now === 'encounter' && was !== 'death_vote' && was !== undefined) {
    const e = props.state.encounter
    if (!e) return
    if (e.tier === 'boss' && e.siegeRank) {
      const gates = {
        J: { title: 'The Gates', sub: `${e.totalEnemies} Jacks bar the way. Break them.` },
        Q: { title: 'The Courtyard', sub: `${e.totalEnemies} Queens hold the yard. No mercy here.` },
        K: { title: 'The Throne', sub: `${e.totalEnemies} Kings. No retreat. No second wind.` },
      }[e.siegeRank]
      showSplash({ over: e.siegeRank === 'K' ? 'The final siege' : 'The siege', title: gates.title, sub: gates.sub, tone: 'blood' }, 3000)
    } else if (e.tier === 'boss')
      showSplash({ over: 'No retreat', title: props.state.chapter === 1 ? 'The Castle' : 'The Broken Court', sub: 'Twelve royals stand between you and the crown.', tone: 'blood' }, 3000)
    else if (e.modifier)
      showSplash({ over: { skirmish: 'Skirmish', veteran: 'Veterans', elite: 'Elite' }[e.tier] ?? 'Encounter', title: e.modifier.name, sub: e.modifier.text, tone: 'gold' }, 2400)
  }
})

onBeforeUnmount(() => {
  if (splashTimer) clearTimeout(splashTimer)
  if (victoryTimer) clearTimeout(victoryTimer)
})

const voteLabels: Record<string, string> = {
  retreat: '🏳 Retreat — fall back to an emergency camp',
  last_stand: '⚔️ Last Stand — fight on without them',
  defiant_stand: '🛡 Defiant Stand — the Warden brings them back (once per run)',
}

function act(action: Record<string, unknown>) {
  errorMsg.value = ''
  socket.emit('campaign_action', { code: props.code, action })
}

// persistent hand: the deck carries across road encounters (camp rests reset
// it). Only shown once the chapter's first fight has happened — before that
// the hand is fresh and the strip is just noise.
const FIGHT_KINDS = ['skirmish', 'veteran', 'elite', 'lair', 'boss']
const hasFoughtThisChapter = computed(() =>
  props.state.map?.nodes.some(n => n.visited && FIGHT_KINDS.includes(n.kind)) ?? false)
const showHandStrip = computed(() =>
  ['road', 'camp', 'landmark', 'replace_hero', 'memory_draft'].includes(phase.value)
  && hasFoughtThisChapter.value
  && props.state.myHand.length > 0)

function heroTooltip(h: ClientHero): string {
  const lines = [`${h.className} — ${h.abilityText}`]
  if (h.relic) lines.push(`🏺 ${h.relic.name}: ${h.relic.text}`)
  for (const m of h.memories) lines.push(`🧠 ${m.name}: ${m.text}`)
  if (!h.alive) lines.push('💀 Fallen — can be replaced at camp.')
  return lines.join('\n')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">

    <!-- Campaign header -->
    <div class="chrome-bar px-4 py-2 flex items-center justify-between text-xs">
      <span class="font-display font-bold tracking-wide text-primary/90">⚜️ Chapter {{ state.chapter }}
        <span class="text-base-content/40 font-normal font-flavor tracking-wider">· {{ state.chapter === 1 ? 'The First Ascension' : 'The Broken Court' }}</span>
      </span>
      <span class="flex items-center gap-3">
        <span class="text-base-content/30 font-mono">seed {{ state.seed }}</span>
        <button class="text-base-content/40 hover:text-base-content/80 transition-colors" :title="muted ? 'Unmute' : 'Mute'" @click="onToggleMute">
          {{ muted ? '🔇' : '🔊' }}
        </button>
      </span>
    </div>

    <div v-if="errorMsg" class="alert alert-error text-sm py-2 mx-4 mt-2" @click="errorMsg = ''">{{ errorMsg }}</div>

    <!-- Phase routing -->
    <Transition name="phase" mode="out-in">
    <div :key="phaseKey" class="flex-1 flex flex-col">
    <ClassSelect v-if="phase === 'class_select'" :state="state" :code="code" />
    <RoadMap v-else-if="phase === 'road' || ((phase === 'landmark' || phase === 'replace_hero') && state.map)" :state="state" :code="code" />
    <EncounterBoard v-else-if="(phase === 'encounter' || phase === 'death_vote') && state.encounter" :state="state" :code="code" />
    <CampPanel v-else-if="phase === 'camp'" :state="state" :code="code" />

    <!-- Memory draft -->
    <div v-else-if="phase === 'memory_draft'" class="max-w-lg mx-auto p-4 space-y-4 w-full">
      <div class="text-center rise-in">
        <h2 class="text-2xl font-display font-bold gold-title">Memories</h2>
        <div class="splash-rule h-px mt-2 mx-auto w-40 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <p class="text-sm text-base-content/50 mt-2 font-flavor tracking-wide">Each survivor keeps one memory of this chapter.</p>
      </div>
      <template v-if="state.memoryDraft?.myOptions">
        <ItemCard
          v-for="m in state.memoryDraft.myOptions" :key="m.id"
          :id="m.id" :name="m.name" :text="m.text"
          @click="act({ type: 'memory_pick', memoryId: m.id })"
        />
      </template>
      <p v-else class="text-center text-sm text-base-content/50">
        Waiting on: {{ state.memoryDraft?.waitingOn.join(', ') }}
      </p>
    </div>

    <!-- Chapter complete -->
    <div v-else-if="phase === 'chapter_complete'" class="flex-1 flex items-center justify-center p-4">
      <div class="card bg-base-100/95 border border-primary/30 shadow-xl text-center py-10 px-8 gap-3 flex flex-col items-center max-w-md">
        <div class="text-6xl crown-rise">🏰</div>
        <h2 class="text-3xl font-display font-bold gold-title rise-in-2">Chapter One Complete</h2>
        <p class="text-sm text-base-content/60">
          Kingdom unlocks: <b>Chapter 2</b>, <b>specializations</b>, <b>Commander</b> and <b>Warden</b> (via replacement).
        </p>
        <p class="text-xs text-base-content/40">The Broken Court is harder and richer. Your memories and relics carry forward.</p>
        <button v-if="state.isHost" class="btn btn-primary btn-lg mt-2" @click="act({ type: 'continue_chapter' })">
          March into Chapter 2
        </button>
        <p v-else class="text-xs text-base-content/40">Waiting for the host…</p>
      </div>
    </div>

    <!-- Endings -->
    <div v-else-if="phase === 'campaign_won' || phase === 'campaign_lost'" class="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      <!-- victory: a rain of suits · defeat: embers of the pyre -->
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <template v-if="phase === 'campaign_won'">
          <span v-for="i in 14" :key="i"
            class="suit-fall text-xl"
            :class="i % 2 ? 'text-primary/40' : 'text-secondary/40'"
            :style="{ left: `${(i * 7.1) % 100}%`, animationDuration: `${5 + (i % 5)}s`, animationDelay: `${i * -0.7}s` }"
          >{{ ['♠', '♥', '♣', '♦'][i % 4] }}</span>
        </template>
        <template v-else>
          <span v-for="i in 10" :key="i" class="ember"
            :style="{ left: `${(i * 9.7) % 100}%`, animationDuration: `${6 + (i % 4)}s`, animationDelay: `${i * -1.1}s`, '--drift': `${(i % 5 - 2) * 14}px` }"
          />
        </template>
      </div>

      <div class="card bg-base-100/95 border shadow-xl text-center py-10 px-8 gap-3 flex flex-col items-center max-w-md"
        :class="phase === 'campaign_won' ? 'border-primary/30' : 'border-error/30'">
        <div class="text-6xl crown-rise">{{ phase === 'campaign_won' ? '👑' : '☠️' }}</div>
        <h2 class="text-3xl font-display font-bold rise-in-2" :class="phase === 'campaign_won' ? 'gold-title' : 'text-error'">
          {{ phase === 'campaign_won' ? 'The Court Has Fallen' : 'The Lineage Ends' }}
        </h2>
        <div class="splash-rule h-px w-40 bg-gradient-to-r from-transparent to-transparent"
          :class="phase === 'campaign_won' ? 'via-primary/60' : 'via-error/60'" />
        <p class="text-sm text-base-content/60 rise-in-3">
          {{ phase === 'campaign_won'
            ? 'Both chapters conquered. Gambler, Exile and Oracle join the Kingdom roster.'
            : 'Every hero is dead — but the Kingdom keeps its unlocks. The next lineage will know better.' }}
        </p>
        <button class="btn btn-primary mt-2 rise-in-4" @click="socket.emit('end_campaign_session', { code })">
          Back to the lobby
        </button>
      </div>
    </div>
    </div>
    </Transition>

    <!-- Boss victory sequence -->
    <Transition name="splash">
      <div v-if="victory" class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden"
        style="background: radial-gradient(ellipse at center, rgba(38, 28, 8, 0.93) 0%, rgba(11, 9, 24, 0.97) 100%)">
        <div class="victory-rays" aria-hidden="true" />
        <span v-for="i in 18" :key="i"
          class="suit-fall text-2xl" :class="i % 2 ? 'text-primary/60' : 'text-secondary/50'"
          :style="{ left: `${(i * 5.3) % 100}%`, animationDuration: `${2.4 + (i % 5) * 0.7}s`, animationDelay: `${(i * 0.17) % 1.4}s` }"
        >{{ ['♠', '♥', '♣', '♦'][i % 4] }}</span>
        <div class="text-center px-6 relative">
          <div class="text-7xl crown-rise">👑</div>
          <p class="font-flavor tracking-[0.35em] uppercase text-sm text-primary/70 rise-in-2 mt-2">Victory</p>
          <h2 class="splash-title font-display font-black text-4xl sm:text-6xl gold-title mt-1">{{ victory.title }}</h2>
          <div class="splash-rule h-px mt-4 mx-auto w-64 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <p class="text-base-content/60 text-sm mt-3 rise-in-4 max-w-sm mx-auto">{{ victory.sub }}</p>
        </div>
      </div>
    </Transition>

    <!-- Chapter / encounter splash -->
    <Transition name="splash">
      <div v-if="splash" class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        :style="{ background: splash.tone === 'blood'
          ? 'radial-gradient(ellipse at center, rgba(20,6,8,0.93) 0%, rgba(11,9,24,0.97) 100%)'
          : 'radial-gradient(ellipse at center, rgba(16,13,30,0.93) 0%, rgba(11,9,24,0.97) 100%)' }">
        <template v-if="splash.fx">
          <span v-for="i in 10" :key="i"
            class="suit-fall text-xl" :class="i % 2 ? 'text-primary/50' : 'text-secondary/40'"
            :style="{ left: `${(i * 9.7) % 100}%`, animationDuration: `${2 + (i % 4) * 0.6}s`, animationDelay: `${(i * 0.13) % 1}s` }"
          >{{ ['♠', '♥', '♣', '♦'][i % 4] }}</span>
        </template>
        <div class="text-center px-6">
          <p class="font-flavor tracking-[0.35em] uppercase text-sm rise-in-1"
            :class="splash.tone === 'blood' ? 'text-error/80' : 'text-primary/70'">{{ splash.over }}</p>
          <h2 class="splash-title font-display font-black text-4xl sm:text-5xl mt-2"
            :class="splash.tone === 'blood' ? 'text-error' : 'gold-title'">{{ splash.title }}</h2>
          <div class="splash-rule h-px mt-4 mx-auto w-56 bg-gradient-to-r from-transparent to-transparent"
            :class="splash.tone === 'blood' ? 'via-error/60' : 'via-primary/60'" />
          <p class="text-base-content/60 text-sm mt-3 rise-in-4 max-w-xs mx-auto">{{ splash.sub }}</p>
        </div>
      </div>
    </Transition>

    <!-- Death vote overlay -->
    <OverlayModal v-if="state.deathVote" tone="error">
      <h3 class="text-xl font-bold text-center">💀 {{ state.deathVote.deadHeroName }} has fallen</h3>
      <p class="text-sm text-center text-base-content/60">The party must decide. Everyone votes — including the dead.</p>
      <button
        v-for="opt in state.deathVote.options" :key="opt"
        class="btn w-full justify-start text-left h-auto py-3"
        :class="state.deathVote.myVote === opt ? 'btn-primary' : 'btn-outline'"
        @click="act({ type: 'death_vote', vote: opt })"
      >{{ voteLabels[opt] }}</button>
      <p class="text-xs text-center text-base-content/40">
        {{ Object.keys(state.deathVote.votes).length }}/{{ state.heroes.length }} votes in
      </p>
    </OverlayModal>

    <!-- Pending choice overlay (landmark rewards, replacement, exile rite) -->
    <OverlayModal v-if="choice && (phase === 'landmark' || phase === 'replace_hero')" tone="primary">
      <h3 class="text-lg font-bold text-center">{{ choice.prompt }}</h3>
      <template v-if="choice.mine">
        <div :class="choice.kind === 'exile_pick' ? 'grid grid-cols-5 gap-1' : 'space-y-2'">
          <template v-for="opt in choice.options" :key="opt.id">
            <!-- items are physical cards; everything else stays a button -->
            <ItemCard
              v-if="choice.kind === 'landmark_reward' && /^[rspm]-/.test(opt.id)"
              :id="opt.id" :name="opt.label" :text="opt.detail"
              @click="act({ type: 'choice_pick', optionId: opt.id })"
            />
            <button
              v-else
              class="btn btn-outline justify-start text-left h-auto py-2 w-full"
              :class="choice.kind === 'exile_pick' ? 'btn-sm font-mono justify-center' : ''"
              @click="act({ type: 'choice_pick', optionId: opt.id })"
            >
              <span class="font-semibold">{{ opt.label }}</span>
              <span v-if="opt.detail" class="text-xs text-base-content/50 font-normal">{{ opt.detail }}</span>
            </button>
          </template>
        </div>
      </template>
      <p v-else class="text-sm text-center text-base-content/50 soft-pulse">
        {{ choice.forPlayerId ? 'Their decision to make…' : 'The host decides…' }}
      </p>
    </OverlayModal>

    <!-- Party strip (road) — hover a hero for class/relic/memory details -->
    <div v-if="phase === 'road'" class="flex gap-2 px-3 max-w-lg mx-auto w-full">
      <div
        v-for="h in state.heroes" :key="h.playerId"
        :title="heroTooltip(h)"
        :class="['flex-1 rounded-lg px-2 py-1.5 text-center text-xs border cursor-help',
          h.alive ? 'border-base-content/10 bg-base-100 text-base-content/60' : 'border-error/40 bg-error/5 opacity-50']"
      >
        <div class="font-semibold truncate">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}</div>
        <div class="text-base-content/40">{{ h.handSize }} cards{{ h.relic ? ' · 🏺' : '' }}{{ h.memories.length ? ' · 🧠' + h.memories.length : '' }}</div>
      </div>
    </div>

    <!-- Persistent hand (carries between encounters; camp rests redraw it) -->
    <div v-if="showHandStrip" class="px-3 max-w-lg mx-auto w-full">
      <p class="text-[10px] text-base-content/40 mb-1" title="Your hand carries over between fights. Only a camp rest reshuffles the deck and redraws everyone to full.">
        Your hand ({{ state.myHand.length }}) — carries to the next fight
      </p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="card in state.myHand" :key="card.id"
          class="w-9 h-12 rounded border border-base-content/15 bg-base-100 flex flex-col items-center justify-center font-mono text-xs"
        >
          <span :class="suitColor(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
          <span :class="suitColor(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
        </span>
      </div>
    </div>

    <!-- Log (never during a battle — the battlefield speaks for itself) -->
    <div class="card bg-base-100 m-3 mt-auto" v-if="!['campaign_won', 'campaign_lost'].includes(phase) && phaseKey !== 'fight'">
      <div class="card-body py-3 px-4">
        <p class="text-xs font-display font-semibold text-primary/40 uppercase tracking-[0.25em] mb-1">Chronicle</p>
        <TransitionGroup name="log" tag="div" class="space-y-1 max-h-28 overflow-y-auto">
          <p v-for="(entry, i) in state.log" :key="state.log.length - i"
            class="text-xs leading-snug"
            :class="i === 0 ? 'text-base-content/90' : 'text-base-content/50'"
          >{{ entry }}</p>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

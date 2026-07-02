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
import { suitSymbol, suitColor, suitClass, CLASS_ICONS } from './cards'
import { sound, toggleMute, sfx } from '../../sound'

const muted = ref(sound.muted)
function onToggleMute() { muted.value = toggleMute() }

// ── Boss victory sequence ────────────────────────────────────────────────────
const victory = ref<{ title: string; sub: string } | null>(null)
let victoryTimer: ReturnType<typeof setTimeout> | null = null

// ── Vote resolution: confirm the winner; tied votes spin the wheel of fate ───
const draw = ref<{ options: { id: string; label: string; detail?: string }[]; winnerId: string; tie: boolean; detail?: string } | null>(null)
const drawActiveId = ref('')
const drawSettled = ref(false)
let drawTimers: ReturnType<typeof setTimeout>[] = []

const props = defineProps<{ state: ClientCampaignState; code: string }>()

const errorMsg = ref('')
socket.on('error', (msg: string) => { errorMsg.value = msg })

// deck/discard viewer (road & camp) — mirrors the in-fight deck viewer
const showDeck = ref(false)

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

// the killing turn's end result, snapshotted by the server before the
// encounter is nulled — "see the result of the final turn" (playtest note)
function fightTableau(): string {
  const lf = props.state.lastFight
  if (!lf) return ''
  const hands = lf.handSizes
    .map((n, i) => ({ n, h: props.state.heroes[i] }))
    .filter(x => x.h?.alive)
    .map(x => `${x.h!.playerName} ${x.n}🂠`)
    .join(' · ')
  return `\n${hands} — Tavern ${lf.tavern}`
}

// remember what we were fighting — the encounter is already null by the time
// the win transition fires
const lastFightTier = ref('')
watch(() => props.state.encounter?.tier, t => { if (t) lastFightTier.value = t })
const lastFightRank = ref<'J' | 'Q' | 'K' | null>(null)
watch(() => props.state.encounter, e => { if (e) lastFightRank.value = e.siegeRank }, { immediate: true })

// every vote resolution confirms the winner; ties additionally spin a
// decelerating wheel that always lands on the server's pick
watch(() => props.state.rewardDraw?.seq, (now, was) => {
  const rd = props.state.rewardDraw
  if (!rd || was === undefined || now === was) return
  drawTimers.forEach(clearTimeout)
  drawTimers = []
  const winnerDetail = rd.options.find(o => o.id === rd.winnerId)?.detail
  if (!rd.tie || rd.options.length < 2) {
    // clean majority — show what won and what it does, no wheel
    draw.value = { options: rd.options, winnerId: rd.winnerId, tie: false, detail: winnerDetail }
    drawActiveId.value = rd.winnerId
    drawSettled.value = true
    sfx.arcane()
    drawTimers.push(setTimeout(() => { draw.value = null }, 2800))
    return
  }
  draw.value = { options: rd.options, winnerId: rd.winnerId, tie: true, detail: winnerDetail }
  drawSettled.value = false
  const n = rd.options.length
  const winIdx = Math.max(0, rd.options.findIndex(o => o.id === rd.winnerId))
  const steps = n * 4 + winIdx          // always ends on the winner
  let t = 400                            // beat before the wheel starts
  let delay = 85
  for (let s = 0; s <= steps; s++) {
    const id = rd.options[s % n]!.id
    const isLast = s === steps
    drawTimers.push(setTimeout(() => {
      drawActiveId.value = id
      sfx.click()
      if (isLast) {
        drawSettled.value = true
        sfx.victory()
        drawTimers.push(setTimeout(() => { draw.value = null }, 1700))
      }
    }, t))
    if (s > steps - n) delay *= 1.4      // decelerate on the final lap
    t += delay
  }
})

watch(() => props.state.phase, (now, was) => {
  // the final boss just fell — chapter clear (ch1) or the run's end (Throne / ch2)
  if (was === 'encounter' && (now === 'chapter_complete' || now === 'campaign_won')) {
    victory.value = lastFightRank.value === 'K'
      ? { title: 'The Throne Is Taken', sub: 'The province is liberated. The Kingdom will remember.' }
      : props.state.chapter === 1
        ? { title: 'The Castle Falls', sub: 'The First Ascension is yours.' }
        : { title: 'The Broken Court Falls', sub: 'The crown is shattered. The Kingdom will remember.' }
    sfx.triumph()
    if (victoryTimer) clearTimeout(victoryTimer)
    victoryTimer = setTimeout(() => { victory.value = null }, 4200)
  }
  // a road fight or rank gate was won (retreats go to camp, wipes end the
  // campaign) — give the table its moment before the spoils appear, and show
  // the killing turn's end result (hands + Tavern) so the table can read it
  if (was === 'encounter' && (now === 'landmark' || now === 'road')) {
    const tableau = fightTableau()
    if (lastFightRank.value === 'J' || lastFightRank.value === 'Q') {
      // province rank gate cleared — bigger moment, full trumpets
      sfx.triumph()
      showSplash({
        over: 'The siege advances',
        title: lastFightRank.value === 'J' ? 'The Gates Have Fallen' : 'The Courtyard Is Yours',
        sub: (lastFightRank.value === 'J' ? 'The Courtyard awaits beyond the rubble.' : 'Only the Throne room remains.') + tableau,
        tone: 'gold',
        fx: true,
      }, 3600)
      lastFightRank.value = null
    } else {
      const titles: Record<string, string> = {
        skirmish: 'Skirmish Cleared', veteran: 'Veterans Broken', elite: 'Elite Warband Destroyed',
      }
      sfx.victory()
      showSplash({
        over: 'Victory',
        title: titles[lastFightTier.value] ?? 'Encounter Cleared',
        sub: (now === 'landmark' ? 'Claim your spoils.' : 'The road continues.') + tableau,
        tone: 'gold',
        fx: true,
      }, 2800)
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
        K: { title: 'The Throne', sub: `${e.totalEnemies} Kings. No retreat. No mercy.` },
      }[e.siegeRank]
      showSplash({ over: e.siegeRank === 'K' ? 'The final siege' : 'The siege', title: gates.title, sub: gates.sub, tone: 'blood' }, 3000)
    } else if (e.tier === 'boss') {
      const royals = e.totalEnemies
      const boss = props.state.chapter <= 1
        ? { over: 'The First Ascension', title: 'The Castle Awaits', sub: `${royals} royals hold the keep — take the crown and let your lineage endure.` }
        : props.state.chapter === 2
        ? { over: 'The Broken Court', title: 'The Shattered Throne', sub: `${royals} royals bar the way — break the court and the province breathes free.` }
        : { over: 'The Final Ascent', title: 'One Last Crown', sub: `${royals} royals between you and victory — stand together and make it count.` }
      showSplash({ over: boss.over, title: boss.title, sub: boss.sub, tone: 'blood' }, 3000)
    } else if (e.modifier)
      showSplash({ over: { skirmish: 'Skirmish', veteran: 'Veterans', elite: 'Elite' }[e.tier] ?? 'Encounter', title: e.modifier.name, sub: e.modifier.text, tone: 'gold' }, 2400)
  }
})

onBeforeUnmount(() => {
  if (splashTimer) clearTimeout(splashTimer)
  if (victoryTimer) clearTimeout(victoryTimer)
  drawTimers.forEach(clearTimeout)
})


function act(action: Record<string, unknown>) {
  errorMsg.value = ''
  socket.emit('campaign_action', { code: props.code, action })
}

// V3 §7: the road-activated Cloak/Ring utilities (once per province)
const ROAD_ACTIVATED = ['v3r-bedroll', 'v3r-requisition-writ']
const roadActivatable = computed(() => {
  const slots = props.state.relicSlots
  if (!slots || props.state.phase !== 'road') return []
  return Object.values(slots)
    .filter((r): r is { id: string; name: string; text: string; activated: boolean } => !!r && ROAD_ACTIVATED.includes(r.id))
})

// persistent hand: the deck carries across road encounters (camp rests reset
// it). Only shown once the chapter's first fight has happened — before that
// the hand is fresh and the strip is just noise.
const FIGHT_KINDS = ['skirmish', 'veteran', 'elite', 'lair', 'boss']
const hasFoughtThisChapter = computed(() =>
  props.state.map?.nodes.some(n => n.visited && FIGHT_KINDS.includes(n.kind)) ?? false)
const showHandStrip = computed(() =>
  ['road', 'camp', 'landmark', 'replace_hero'].includes(phase.value)
  && hasFoughtThisChapter.value
  && props.state.myHand.length > 0)

function heroTooltip(h: ClientHero): string {
  const lines = [`${h.className} — ${h.abilityText}`]
  for (const rl of h.relics) lines.push(`🏺 ${rl.name}: ${rl.text}`)
  if (!h.alive) lines.push('💀 Fallen.')
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

    <!-- Tutorial complete — end on the win, one plain line, then into a real run -->
    <div v-else-if="phase === 'tutorial_done'" class="flex-1 flex items-center justify-center p-4">
      <div class="card bg-base-100/95 border border-primary/30 shadow-xl text-center py-10 px-8 gap-4 flex flex-col items-center max-w-sm">
        <div class="text-5xl crown-rise">⚜️</div>
        <h2 class="text-2xl font-display font-bold gold-title rise-in-2">You've got it.</h2>
        <button class="btn btn-primary btn-lg mt-2" @click="socket.emit('start_campaign', { code, chapter: 1 })">
          Begin your run →
        </button>
      </div>
    </div>

    <!-- Chapter complete -->
    <div v-else-if="phase === 'chapter_complete'" class="flex-1 flex items-center justify-center p-4">
      <div class="card bg-base-100/95 border border-primary/30 shadow-xl text-center py-10 px-8 gap-3 flex flex-col items-center max-w-md">
        <div class="text-6xl crown-rise">🏰</div>
        <h2 class="text-3xl font-display font-bold gold-title rise-in-2">Chapter One Complete</h2>
        <p class="text-sm text-base-content/60">
          Kingdom unlocks: <b>Chapter 2</b>, <b>specializations</b>, <b>Commander</b> and <b>Warden</b>.
        </p>
        <p class="text-xs text-base-content/40">The Broken Court is harder and richer. Your relics carry forward.</p>
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
            : 'Your lineage has fallen — but the Kingdom keeps its unlocks. The next run will know better.' }}
        </p>
        <div class="flex flex-wrap gap-2 justify-center mt-2 rise-in-4">
          <button v-if="state.isHost" class="btn btn-primary" @click="socket.emit('restart_campaign', { code })">
            {{ phase === 'campaign_won' ? '⚔ Run it again' : '⚔ Try Again' }}
          </button>
          <button class="btn" :class="state.isHost ? 'btn-ghost' : 'btn-primary'" @click="socket.emit('end_campaign_session', { code })">
            Main Menu
          </button>
        </div>
        <p v-if="!state.isHost" class="text-[11px] text-base-content/40">The host can start a new run for the party.</p>
      </div>
    </div>
    </div>
    </Transition>

    <!-- Casino draw: a tied vote spins the wheel of fate -->
    <Transition name="splash">
      <div v-if="draw" class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        style="background: radial-gradient(ellipse at center, rgba(28, 20, 8, 0.92) 0%, rgba(11, 9, 24, 0.97) 100%)">
        <div class="text-center px-6 w-full max-w-md">
          <p class="font-flavor tracking-[0.35em] uppercase text-sm rise-in-1"
            :class="draw.tie ? 'text-warning/80' : 'text-primary/70'">
            {{ draw.tie ? 'The vote is tied' : 'The vote is in' }}
          </p>
          <h2 class="font-display font-black text-4xl gold-title mt-1 mb-5">
            {{ draw.tie ? 'Fate Decides' : 'The Party Chooses' }}
          </h2>
          <div class="space-y-2">
            <div
              v-for="o in draw.options" :key="o.id"
              class="rounded-xl border-2 px-4 py-3 font-display font-bold transition-all duration-100"
              :class="drawActiveId === o.id
                ? (drawSettled && o.id === draw.winnerId
                  ? 'border-primary bg-primary/25 text-primary scale-105 shadow-2xl'
                  : 'border-warning bg-warning/20 text-warning scale-[1.03]')
                : 'border-base-content/15 bg-base-100/70 text-base-content/45'"
            >
              {{ drawSettled && o.id === draw.winnerId ? '✨ ' : '' }}{{ o.label }}
              <p v-if="drawSettled && o.id === draw.winnerId && draw.detail"
                class="text-xs font-normal font-sans text-base-content/65 mt-1.5 leading-snug">{{ draw.detail }}</p>
            </div>
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

    <!-- Pending choice overlay (landmark rewards, replacement, exile rite).
         Renders whenever a choice is pending, regardless of phase — a reward
         must never be skippable or lost to a phase mismatch (playtest note). -->
    <OverlayModal v-if="choice" tone="primary">
      <h3 class="text-lg font-bold text-center">{{ choice.prompt }}</h3>
      <template v-if="choice.mine">
        <div :class="(choice.kind === 'exile_pick' || choice.kind === 'forge_card') ? 'flex flex-wrap gap-1.5 justify-center' : 'space-y-2'">
          <template v-for="opt in choice.options" :key="opt.id">
            <!-- items are physical cards; everything else stays a button -->
            <ItemCard
              v-if="choice.kind === 'landmark_reward' && /^[rspm]-/.test(opt.id)"
              :id="opt.id" :name="opt.label" :text="opt.detail"
              :class="choice.teamVote && choice.myVote === opt.id ? 'ring-2 ring-primary' : ''"
              @click="act({ type: 'choice_pick', optionId: opt.id })"
            />
            <!-- card pickers (exile rite / forge stamp) — rendered like the in-fight deck viewer -->
            <button
              v-else-if="choice.kind === 'exile_pick' || choice.kind === 'forge_card'"
              class="card-face w-12 h-16 font-mono flex flex-col items-center justify-center relative transition-transform hover:-translate-y-1"
              :class="choice.teamVote && choice.myVote === opt.id ? 'ring-2 ring-primary' : ''"
              :title="opt.detail"
              @click="act({ type: 'choice_pick', optionId: opt.id })"
            >
              <span class="text-lg font-bold" :class="suitClass(opt.id[0])">{{ opt.id.slice(1) }}</span>
              <span :class="suitClass(opt.id[0])">{{ suitSymbol(opt.id[0]) }}</span>
            </button>
            <button
              v-else
              class="btn btn-outline justify-start text-left h-auto py-2 w-full"
              :class="choice.teamVote && choice.myVote === opt.id ? 'ring-2 ring-primary' : ''"
              @click="act({ type: 'choice_pick', optionId: opt.id })"
            >
              <span class="font-semibold">{{ opt.label }}</span>
              <span v-if="opt.detail" class="text-xs text-base-content/50 font-normal">{{ opt.detail }}</span>
            </button>
          </template>
        </div>
        <p v-if="choice.teamVote" class="text-[11px] text-center text-base-content/40">
          🗳 {{ choice.votesIn }}/{{ choice.votesNeeded }} votes in · secret ballot · majority wins, ties spin the wheel
          <span v-if="choice.myVote" class="text-primary/60">· tap again to change your vote</span>
        </p>
      </template>
      <p v-else class="text-sm text-center text-base-content/50 soft-pulse">
        {{ choice.forPlayerId ? 'Their decision to make…' : 'The host decides…' }}
      </p>
    </OverlayModal>

    <!-- Deck & discard viewer — mirrors the in-fight deck viewer -->
    <OverlayModal v-if="showDeck" tone="primary" dismissable @close="showDeck = false">
      <h3 class="text-lg font-bold text-center">🂠 The Deck</h3>
      <p class="text-[10px] text-center text-base-content/40 -mt-2">sorted by suit · the draw order stays secret</p>

      <p class="text-sm font-semibold text-center mt-2">🍺 Tavern
        <span class="font-normal text-base-content/50">— {{ state.deckTavern?.length ?? 0 }} cards</span></p>
      <div v-if="state.deckTavern?.length" class="flex flex-wrap gap-1 justify-center">
        <div v-for="card in (state.deckTavern ?? [])" :key="card.id"
          class="card-face w-9 h-12 flex flex-col items-center justify-center font-mono text-xs">
          <span class="font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
          <span :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-center text-base-content/40">Empty.</p>

      <p class="text-sm font-semibold text-center mt-2">🗑 Discard
        <span class="font-normal text-base-content/50">— {{ state.deckDiscard?.length ?? 0 }} cards</span></p>
      <div v-if="state.deckDiscard?.length" class="flex flex-wrap gap-1 justify-center">
        <div v-for="card in (state.deckDiscard ?? [])" :key="card.id"
          class="card-face w-9 h-12 flex flex-col items-center justify-center font-mono text-xs">
          <span class="font-bold" :class="suitClass(card.suit)">{{ card.rank === 'Jo' ? '🃏' : card.rank }}</span>
          <span :class="suitClass(card.suit)">{{ card.rank !== 'Jo' ? suitSymbol(card.suit) : '' }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-center text-base-content/40">Empty.</p>

      <button class="btn btn-ghost btn-sm" @click="showDeck = false">Close</button>
    </OverlayModal>

    <!-- V3 §6: the BRACELET — place agnostic fragments into the gauntlet's suit
         holes between encounters (equip a Fragment now, or sandbag toward Half) -->
    <div v-if="(phase === 'road' || phase === 'camp' || phase === 'chapter_complete') && state.ascendingDeck && state.gauntlet"
      class="rounded-box border border-info/20 bg-base-200/50 px-3 py-2 max-w-lg mx-auto w-full space-y-1.5">
      <p class="text-[10px] uppercase tracking-[0.2em] text-info/60 text-center">
        💠 Bracelet — fragments banked: <span class="font-mono">{{ state.tokenFragments ?? 0 }}</span>
      </p>
      <div class="grid grid-cols-4 gap-1.5">
        <div v-for="su in ['S', 'D', 'H', 'C']" :key="su"
          class="rounded border border-base-content/10 bg-base-100/60 p-1.5 text-center space-y-1">
          <div class="text-xs font-bold" :class="suitClass(su)">{{ suitSymbol(su) }}
            <span class="text-[9px] font-normal text-base-content/50">{{ state.gauntlet[su]!.tier === 2 ? 'HALF ★' : state.gauntlet[su]!.tier === 1 ? 'Fragment' : 'empty' }}</span>
          </div>
          <div class="text-[9px] leading-tight text-base-content/60 min-h-[2rem]" :title="state.gauntlet[su]!.text">
            {{ state.gauntlet[su]!.tier > 0 ? state.gauntlet[su]!.name : '—' }}
            <span v-if="state.gauntlet[su]!.frags > 1" class="text-info">·{{ state.gauntlet[su]!.frags }}✦</span>
          </div>
          <button class="btn btn-xs btn-outline btn-info w-full"
            :disabled="(state.tokenFragments ?? 0) < 1"
            @click="act({ type: 'bracelet_place', suit: su })"
          >place ✦</button>
        </div>
      </div>
      <p class="text-[9px] text-center text-base-content/40">
        First fragment lights a castable spell · more sandbag toward the Forge's tier-up · casting empties the hole.
      </p>
    </div>

    <!-- V3 §7: equipment — bag → four named slots (free between encounters) -->
    <div v-if="(phase === 'road' || phase === 'camp' || phase === 'chapter_complete') && state.ascendingDeck && state.relicSlots"
      class="rounded-box border border-warning/20 bg-base-200/50 px-3 py-2 max-w-lg mx-auto w-full space-y-1.5">
      <p class="text-[10px] uppercase tracking-[0.2em] text-warning/60 text-center">
        🏺 Equipment — free swaps until the next fight
      </p>
      <div class="grid grid-cols-4 gap-1.5">
        <div v-for="slot in ['hat', 'amulet', 'ring', 'cloak']" :key="slot"
          class="rounded border border-base-content/10 bg-base-100/60 p-1.5 text-center space-y-1">
          <div class="text-[9px] uppercase tracking-wider text-base-content/50">{{ slot }}</div>
          <button v-if="state.relicSlots[slot]"
            class="btn btn-xs btn-ghost w-full h-auto py-1 leading-tight normal-case"
            :title="state.relicSlots[slot]!.text + ' — tap to unequip'"
            @click="act({ type: 'equip_relic', slot, relicId: null })"
          >{{ state.relicSlots[slot]!.name }}</button>
          <div v-else class="text-[9px] text-base-content/30 py-1">— empty —</div>
        </div>
      </div>
      <div v-if="state.relicBag?.length" class="flex flex-wrap gap-1 justify-center">
        <button v-for="r in state.relicBag" :key="r.id"
          class="btn btn-xs btn-outline btn-warning normal-case"
          :title="`${r.text} — tap to equip (${r.slot})`"
          @click="act({ type: 'equip_relic', slot: r.slot, relicId: r.id })"
        >{{ r.name }} · {{ r.slot }}</button>
      </div>
      <div v-if="roadActivatable.length" class="flex justify-center gap-1">
        <button v-for="r in roadActivatable" :key="r.id"
          class="btn btn-xs btn-outline btn-accent normal-case"
          :title="r.text"
          @click="act({ type: 'activate_relic', relicId: r.id })"
        >⚡ {{ r.name }}</button>
      </div>
    </div>

    <!-- Party strip (road) — hover a hero for class/relic details -->
    <div v-if="phase === 'road'" class="flex gap-2 px-3 max-w-lg mx-auto w-full">
      <div
        v-for="h in state.heroes" :key="h.playerId"
        :title="heroTooltip(h)"
        :class="['flex-1 rounded-lg px-2 py-1.5 text-center text-xs border cursor-help',
          h.alive ? 'border-base-content/10 bg-base-100 text-base-content/60' : 'border-error/40 bg-error/5 opacity-50']"
      >
        <div class="font-semibold truncate">{{ h.alive ? CLASS_ICONS[h.classId] : '💀' }} {{ h.playerName }}</div>
        <div class="text-base-content/40">{{ h.handSize }} cards{{ h.relics.length ? ' · 🏺' + h.relics.length : '' }}</div>
      </div>
    </div>

    <!-- Deck & discard viewer trigger (road / camp / landmark) -->
    <div v-if="(phase === 'road' || phase === 'camp' || phase === 'landmark') && state.map" class="flex justify-center px-3">
      <button class="btn btn-ghost btn-xs gap-1 text-base-content/60" @click="showDeck = true">
        🂠 View deck &amp; discard
        <span class="opacity-50">({{ state.deckTavern?.length ?? 0 }}/{{ state.deckDiscard?.length ?? 0 }})</span>
      </button>
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

    <!-- No chronicle on screen — the full game log is written to
         server/data/logs/<campaign-id>.log for post-game arguments. -->
  </div>
</template>

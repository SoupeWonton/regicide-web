<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '../socket'

const router  = useRouter()
const name    = ref('')
const code    = ref('')
const error   = ref('')
const loading = ref(false)

socket.on('room_update', (room) => {
  loading.value = false
  router.push(`/room/${room.code}`)
})

socket.on('error', (msg: string) => {
  loading.value = false
  error.value = msg
})

function create() {
  if (!name.value.trim()) { error.value = 'Enter your name first.'; return }
  error.value = ''
  loading.value = true
  socket.emit('create_room', { name: name.value.trim() })
}

function join() {
  if (!name.value.trim()) { error.value = 'Enter your name first.'; return }
  if (!code.value.trim()) { error.value = 'Enter a room code.'; return }
  error.value = ''
  loading.value = true
  socket.emit('join_room', { code: code.value.trim().toUpperCase(), name: name.value.trim() })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <!-- drifting suit marks, barely there -->
    <div class="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      <span v-for="(s, i) in ['♠', '♥', '♣', '♦', '♠', '♦']" :key="i"
        class="suit-fall text-2xl"
        :class="s === '♥' || s === '♦' ? 'text-secondary/20' : 'text-base-content/10'"
        :style="{ left: `${8 + i * 16}%`, animationDuration: `${14 + i * 3}s`, animationDelay: `${i * -5}s` }"
      >{{ s }}</span>
    </div>

    <div class="card bg-base-100/90 backdrop-blur shadow-2xl w-full max-w-sm border border-primary/15 rise-in">
      <div class="card-body gap-5">

        <div class="text-center">
          <p class="font-flavor text-primary/60 text-sm tracking-widest rise-in-1">the crown must fall</p>
          <h1 class="gold-title text-4xl mt-1 rise-in-2">REGICIDE</h1>
          <div class="splash-rule h-px mt-3 mx-6 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <p class="text-base-content/50 text-xs mt-2 rise-in-3">A cooperative campaign of treason &amp; cards</p>
        </div>

        <div class="form-control gap-1">
          <label class="label py-0"><span class="label-text text-xs">Your name</span></label>
          <input
            v-model="name"
            class="input input-bordered w-full"
            placeholder="e.g. Gabe"
            maxlength="20"
          />
        </div>

        <!-- two equal doors: host a table, or walk into one -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl border border-primary/20 bg-base-200/40 p-3 flex flex-col gap-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.25em] text-base-content/40">Host a table</p>
            <p class="text-xs text-base-content/50 flex-1 leading-snug">Open a room and share the 4-letter code.</p>
            <button class="btn btn-primary w-full" :disabled="loading" @click="create">
              <span v-if="loading" class="loading loading-spinner loading-sm" />
              ⚜ Create
            </button>
          </div>
          <div class="rounded-xl border border-primary/20 bg-base-200/40 p-3 flex flex-col gap-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.25em] text-base-content/40">Join a table</p>
            <input
              v-model="code"
              class="input input-bordered input-sm w-full uppercase tracking-[0.3em] font-mono text-center flex-1"
              placeholder="XXXX"
              maxlength="4"
              @keyup.enter="join"
            />
            <button class="btn btn-secondary w-full" :disabled="loading" @click="join">
              <span v-if="loading" class="loading loading-spinner loading-sm" />
              🚪 Join
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-error text-sm py-2">{{ error }}</div>

        <!-- CC BY attribution — required by the icon/pattern licenses (CREDITS.md) -->
        <p class="text-[10px] text-base-content/30 text-center leading-relaxed">
          Icons by <a href="https://game-icons.net" target="_blank" rel="noopener" class="underline">game-icons.net</a> (CC BY 3.0)
          · patterns by <a href="https://heropatterns.com" target="_blank" rel="noopener" class="underline">Hero Patterns</a> (CC BY 4.0)
          · card art by Byron Knoll (public domain)
        </p>

      </div>
    </div>
  </div>
</template>

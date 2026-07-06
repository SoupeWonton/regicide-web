<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '../socket'

const router  = useRouter()
const name    = ref('')
const error   = ref('')
const loading = ref(false)

// Solo: entering a name opens a fresh room and drops you straight into the
// campaign launcher. No code-sharing / join flow.
socket.on('room_update', (room) => {
  loading.value = false
  router.push(`/room/${room.code}`)
})

socket.on('error', (msg: string) => {
  loading.value = false
  error.value = msg
})

function begin() {
  if (!name.value.trim()) { error.value = 'Enter your name first.'; return }
  error.value = ''
  loading.value = true
  socket.emit('create_room', { name: name.value.trim() })
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
          <h1 class="gold-title text-4xl mt-1 rise-in-2">KINGFALL</h1>
          <div class="splash-rule h-px mt-3 mx-6 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <p class="text-base-content/50 text-xs mt-2 rise-in-3">A campaign of treason &amp; cards</p>
        </div>

        <div class="form-control gap-1">
          <label class="label py-0"><span class="label-text text-xs">Your name</span></label>
          <input
            v-model="name"
            class="input input-bordered w-full"
            placeholder="e.g. Gabe"
            maxlength="20"
            @keyup.enter="begin"
          />
        </div>

        <button class="btn btn-primary w-full" :disabled="loading" @click="begin">
          <span v-if="loading" class="loading loading-spinner loading-sm" />
          ⚜ Begin
        </button>

        <div v-if="error" class="alert alert-error text-sm py-2">{{ error }}</div>

        <!-- The desktop rebuild (Unity): a one-click, no-admin installer. -->
        <div class="text-center">
          <div class="splash-rule h-px mb-3 mx-6 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <a
            class="btn btn-secondary btn-outline w-full"
            href="https://raw.githubusercontent.com/SoupeWonton/regicide-web/desktop-releases/Kingfall-Setup.exe"
            download
          >
            ⬇ Download for Windows — desktop alpha
          </a>
          <p class="text-base-content/40 text-xs mt-1">
            the new single-player version · installs without admin ·
            <a
              class="underline hover:text-base-content/70"
              href="https://raw.githubusercontent.com/SoupeWonton/regicide-web/desktop-releases/Kingfall-win64.zip"
              download
            >portable zip</a>
          </p>
        </div>

        <router-link to="/sandbox" class="text-xs text-base-content/30 hover:text-base-content/60 text-center">
          🔬 run sandbox (replay viewer)
        </router-link>

      </div>
    </div>
  </div>
</template>

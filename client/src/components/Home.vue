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
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="card bg-base-100 shadow-2xl w-full max-w-sm">
      <div class="card-body gap-5">

        <div class="text-center">
          <h1 class="text-3xl font-bold tracking-tight">REGICIDE</h1>
          <p class="text-base-content/50 text-sm mt-1">Cooperative card game</p>
        </div>

        <div class="form-control gap-1">
          <label class="label py-0"><span class="label-text text-xs">Your name</span></label>
          <input
            v-model="name"
            class="input input-bordered w-full"
            placeholder="e.g. Gabe"
            maxlength="20"
            @keyup.enter="create"
          />
        </div>

        <button class="btn btn-primary btn-lg w-full" :disabled="loading" @click="create">
          <span v-if="loading" class="loading loading-spinner loading-sm" />
          Create Room
        </button>

        <div class="divider text-xs text-base-content/40">or join existing</div>

        <div class="flex gap-2">
          <input
            v-model="code"
            class="input input-bordered flex-1 uppercase tracking-widest font-mono text-center"
            placeholder="XXXX"
            maxlength="4"
            @keyup.enter="join"
          />
          <button class="btn btn-outline btn-neutral" :disabled="loading" @click="join">
            Join
          </button>
        </div>

        <div v-if="error" class="alert alert-error text-sm py-2">{{ error }}</div>

      </div>
    </div>
  </div>
</template>

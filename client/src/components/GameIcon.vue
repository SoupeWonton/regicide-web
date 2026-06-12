<script setup lang="ts">
// One inline icon from the game-icons.net set (CC BY 3.0 — CREDITS.md).
// Drop-in replacement for the old emoji glyphs: 1em square, tinted by the
// surrounding text color, so it sits inside labels exactly like a character.
import { computed } from 'vue'
import { GAME_ICONS } from '../gameIcons'

const props = defineProps<{ name: string }>()
const def = computed(() => GAME_ICONS[props.name])
</script>

<template>
  <svg v-if="def" viewBox="0 0 512 512" class="game-icon" aria-hidden="true" v-html="def.body" />
  <span v-else>❓</span>
</template>

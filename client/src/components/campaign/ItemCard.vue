<script setup lang="ts">
import { computed } from 'vue'

// A physical item card. Kind is inferred from the item id prefix
// (r- relic, s- spell, g- gambit/special).
const props = defineProps<{
  id: string
  name: string
  text?: string
  tier?: string
  sm?: boolean
  disabled?: boolean
}>()
defineEmits<{ click: [] }>()

const KINDS: Record<string, { label: string; icon: string; color: string }> = {
  r: { label: 'Relic', icon: '🏺', color: '#c98a2e' },
  s: { label: 'Spell', icon: '📖', color: '#8a6fd0' },
  g: { label: 'Gambit', icon: '🎲', color: '#d08a2e' },
}
const kind = computed(() => KINDS[props.id[0] ?? ''] ?? KINDS['r']!)
</script>

<template>
  <button
    class="item-card"
    :class="[sm ? 'item-card-sm' : 'w-full', disabled ? 'item-card-disabled' : '']"
    :style="{ '--ic': kind.color, '--icg': kind.color + '55' }"
    :title="sm ? `${name} — ${text ?? ''}` : undefined"
    type="button"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 min-w-0">
      <span class="item-icon shrink-0">{{ kind.icon }}</span>
      <span class="font-display font-bold leading-tight flex-1 min-w-0" :class="sm ? 'text-xs truncate' : 'text-sm'">
        {{ name }}<span v-if="tier === 'rare'" class="text-primary"> ★</span>
      </span>
    </div>
    <p v-if="text && !sm" class="text-[11px] text-base-content/65 leading-snug mt-1.5 text-left">{{ text }}</p>
    <p class="text-[8px] uppercase tracking-[0.22em] mt-1 text-left" :style="{ color: kind.color }">{{ kind.label }}</p>
  </button>
</template>

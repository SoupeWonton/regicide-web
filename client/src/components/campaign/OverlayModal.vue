<script setup lang="ts">
// Reusable decision overlay: floats above the current interface with a
// blurred backdrop instead of pushing boxes into the page flow. Mount/unmount
// it with v-if at the call site; the 'overlay' transition handles the rest.
const props = defineProps<{
  tone?: 'primary' | 'error' | 'warning' | 'secondary'
  dismissable?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const borders = {
  primary: 'border-primary/30',
  error: 'border-error/30',
  warning: 'border-warning/40',
  secondary: 'border-secondary/30',
}

function onBackdrop() {
  if (props.dismissable) emit('close')
}
</script>

<template>
  <Transition name="overlay" appear>
    <div
      class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="onBackdrop"
    >
      <div
        class="overlay-card card bg-base-100 border shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative"
        :class="borders[tone ?? 'primary']"
      >
        <span class="corner corner-tl" /><span class="corner corner-tr" />
        <span class="corner corner-bl" /><span class="corner corner-br" />
        <div class="card-body gap-3">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

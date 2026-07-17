<script setup>
import { useToast } from '@/composables/useToast.js';
const { mensaje, tipo, visible } = useToast();
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="fixed left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-medium text-center"
      :class="{
        'bg-dean-700': tipo === 'success',
        'bg-red-600': tipo === 'error',
        'bg-dean-900': tipo === 'info'
      }"
      :style="{ bottom: 'calc(env(safe-area-inset-bottom, 0) + 5.5rem)' }"
      role="status"
      aria-live="polite"
    >
      {{ mensaje }}
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>

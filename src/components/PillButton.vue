<script setup>
defineProps({
  cargando: { type: Boolean, default: false }
});
defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    @click="$emit('click')"
    :disabled="cargando"
    class="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-300 text-white font-bold text-2xl py-8 px-6 rounded-2xl shadow-lg transition-colors min-h-[120px] flex items-center justify-center gap-3 select-none"
    aria-label="Registrar toma de pastilla"
  >
    <span
      v-if="cargando"
      class="inline-block h-7 w-7 border-4 border-white border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    ></span>
    <span>{{ cargando ? 'Registrando...' : 'Dar pastilla ahora' }}</span>
  </button>
</template>

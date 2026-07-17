<script setup>
import DeanLogo from '@/components/DeanLogo.vue';

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
    class="w-full bg-dean-500 hover:bg-dean-600 active:bg-dean-700 disabled:bg-dean-200 text-dean-50 font-extrabold text-2xl py-7 px-6 rounded-3xl shadow-lg shadow-dean-500/30 transition-all active:scale-[0.98] min-h-[120px] flex items-center justify-center gap-3 select-none"
    aria-label="Registrar pastilla para Dean"
  >
    <span
      v-if="cargando"
      class="inline-block h-7 w-7 border-4 border-dean-50 border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    ></span>
    <template v-else>
      <DeanLogo :size="44" :rounded="false" class="!bg-dean-50/20 !text-dean-50" />
      <span>{{ cargando ? 'Registrando...' : 'Dar pastilla a Dean' }}</span>
    </template>
  </button>
</template>

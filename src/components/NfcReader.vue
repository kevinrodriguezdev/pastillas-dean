<script setup>
import { useNfc } from '@/composables/useNfc.js';

const emit = defineEmits(['tag-read']);

const { disponible, escaneando, error, start, stop } = useNfc();

async function toggle() {
  if (escaneando.value) {
    stop();
  } else {
    await start(() => {
      emit('tag-read');
    });
  }
}
</script>

<template>
  <div v-if="disponible" class="bg-white rounded-2xl shadow p-4">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-gray-900">Lector NFC</p>
        <p class="text-sm text-gray-500 truncate">
          {{ escaneando ? 'Acerca el tag al móvil' : 'Toca para activar el escaneo' }}
        </p>
      </div>
      <button
        type="button"
        @click="toggle"
        :class="[
          'shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition',
          escaneando
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        {{ escaneando ? 'Escaneando...' : 'Activar NFC' }}
      </button>
    </div>
    <p v-if="error" class="text-xs text-red-500 mt-2">{{ error }}</p>
  </div>
</template>

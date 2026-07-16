<script setup>
import { onMounted, ref, computed } from 'vue';
import { useTomas } from '@/composables/useTomas.js';

const { todas, cargando, cargarHistorial, appendMas } = useTomas();
const TAM_PAGINA = 50;
const cargandoMas = ref(false);
const fin = ref(false);

async function cargarInicial() {
  fin.value = false;
  await cargarHistorial(TAM_PAGINA);
}

async function cargarMas() {
  if (cargandoMas.value || fin.value) return;
  cargandoMas.value = true;
  try {
    const res = await appendMas(TAM_PAGINA);
    if (!res || res.length < TAM_PAGINA) fin.value = true;
  } catch (e) {
    console.error('Error cargando más tomas:', e);
  } finally {
    cargandoMas.value = false;
  }
}

const tomasFormateadas = computed(() =>
  todas.value.map((t) => ({
    ...t,
    fechaTexto: new Date(t.fecha_hora).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    esNfc: t.metodo === 'nfc'
  }))
);

onMounted(cargarInicial);
</script>

<template>
  <main class="min-h-screen bg-gray-50 pb-24">
    <div class="max-w-md mx-auto p-4 space-y-3">
      <header class="pt-2">
        <h1 class="text-2xl font-bold text-gray-900">Historial</h1>
        <p class="text-sm text-gray-500">
          {{ todas.length }} toma{{ todas.length === 1 ? '' : 's' }} registrada{{ todas.length === 1 ? '' : 's' }}
        </p>
      </header>

      <div
        v-if="cargando && todas.length === 0"
        class="text-center py-12 text-gray-400"
      >
        Cargando...
      </div>

      <div
        v-else-if="todas.length === 0"
        class="text-center py-12 text-gray-400"
      >
        Aún no hay tomas registradas.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="t in tomasFormateadas"
          :key="t.id"
          class="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-900">{{ t.fechaTexto }}</p>
            <p class="text-xs text-gray-500 uppercase tracking-wide">
              {{ t.esNfc ? 'NFC' : 'Manual' }}
            </p>
          </div>
          <span
            class="text-2xl ml-3"
            :class="t.esNfc ? 'text-blue-500' : 'text-emerald-500'"
            aria-hidden="true"
          >✓</span>
        </li>
      </ul>

      <button
        v-if="!fin && todas.length > 0"
        type="button"
        @click="cargarMas"
        :disabled="cargandoMas"
        class="w-full py-3 text-sm text-emerald-600 font-semibold disabled:opacity-50"
      >
        {{ cargandoMas ? 'Cargando...' : 'Cargar más' }}
      </button>

      <p
        v-if="fin && todas.length > 0"
        class="text-center text-xs text-gray-400 py-4"
      >
        Fin del historial
      </p>
    </div>
  </main>
</template>

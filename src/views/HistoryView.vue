<script setup>
import { onMounted, ref, computed } from 'vue';
import { useTomas } from '@/composables/useTomas.js';
import { useToast } from '@/composables/useToast.js';

const { todas, cargando, cargarHistorial, appendMas, eliminarToma } = useTomas();
const { show } = useToast();

const TAM_PAGINA = 50;
const cargandoMas = ref(false);
const fin = ref(false);
const eliminandoId = ref(null);

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

async function onEliminar(t) {
  const fechaTxt = t.fecha_hora
    ? new Date(t.fecha_hora).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';
  const ok = window.confirm(
    `¿Eliminar la toma del ${fechaTxt}? Esta acción no se puede deshacer.`
  );
  if (!ok) return;

  eliminandoId.value = t.id;
  try {
    await eliminarToma(t.id);
    show('Toma eliminada', 'success');
  } catch (e) {
    show(e.message || 'No se pudo eliminar la toma', 'error');
  } finally {
    eliminandoId.value = null;
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
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-gray-900">{{ t.fechaTexto }}</p>
            <p class="text-xs text-gray-500 uppercase tracking-wide">
              {{ t.esNfc ? 'NFC' : 'Manual' }}
            </p>
          </div>
          <span
            class="text-2xl ml-2"
            :class="t.esNfc ? 'text-blue-500' : 'text-emerald-500'"
            aria-hidden="true"
          >✓</span>
          <button
            type="button"
            @click="onEliminar(t)"
            :disabled="eliminandoId === t.id"
            class="ml-3 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition disabled:opacity-50"
            aria-label="Eliminar toma"
          >
            <span v-if="eliminandoId === t.id" class="inline-block h-5 w-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" aria-hidden="true"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
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

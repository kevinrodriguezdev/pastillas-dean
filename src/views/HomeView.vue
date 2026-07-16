<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useTomas } from '@/composables/useTomas.js';
import { usePushNotifications } from '@/composables/usePushNotifications.js';
import { useToast } from '@/composables/useToast.js';
import StatusCard from '@/components/StatusCard.vue';
import PillButton from '@/components/PillButton.vue';
import NfcReader from '@/components/NfcReader.vue';

const {
  ultimaToma,
  tomasHoy,
  proximaTomaEsperada,
  cargando,
  cargarHistorial,
  registrarToma
} = useTomas();

const { activar: activarPush, comprobarInicial, suscrito, permiso } = usePushNotifications();
const { show } = useToast();

const registrando = ref(false);
let refreshInterval = null;

function formatearHora(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function refrescar() {
  await cargarHistorial(50);
}

async function handleManual() {
  if (registrando.value) return;
  registrando.value = true;
  try {
    const res = await registrarToma('manual');
    const hora = res?.toma?.fecha_hora ? formatearHora(res.toma.fecha_hora) : '';
    show(hora ? `Pastilla registrada a las ${hora}` : 'Pastilla registrada', 'success');
  } catch (e) {
    show(e.message || 'No se pudo registrar la toma', 'error');
  } finally {
    registrando.value = false;
  }
}

async function handleNfc() {
  if (registrando.value) return;
  registrando.value = true;
  try {
    const res = await registrarToma('nfc');
    const hora = res?.toma?.fecha_hora ? formatearHora(res.toma.fecha_hora) : '';
    show(hora ? `Pastilla registrada por NFC a las ${hora}` : 'Pastilla registrada por NFC', 'success');
  } catch (e) {
    show(e.message || 'No se pudo registrar la toma', 'error');
  } finally {
    registrando.value = false;
  }
}

function onVis() {
  if (document.visibilityState === 'visible') refrescar();
}

onMounted(async () => {
  await refrescar();
  await comprobarInicial();
  refreshInterval = setInterval(refrescar, 30 * 1000);
  document.addEventListener('visibilitychange', onVis);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  document.removeEventListener('visibilitychange', onVis);
});
</script>

<template>
  <main class="min-h-screen bg-gray-50 pb-24">
    <div class="max-w-md mx-auto p-4 space-y-4">
      <header class="pt-2">
        <h1 class="text-2xl font-bold text-gray-900">Pastillas del perro</h1>
        <p class="text-sm text-gray-500">Una pastilla cada 12 horas</p>
      </header>

      <StatusCard
        :ultima-toma="ultimaToma"
        :proxima-toma-esperada="proximaTomaEsperada"
        :tomas-hoy="tomasHoy.length"
      />

      <PillButton :cargando="registrando" @click="handleManual" />

      <NfcReader @tag-read="handleNfc" />

      <div
        v-if="permiso === 'denied'"
        class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800"
      >
        Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador
        para recibir recordatorios.
      </div>

      <button
        v-if="permiso !== 'denied' && !suscrito"
        type="button"
        @click="activarPush"
        class="w-full bg-white border-2 border-emerald-500 text-emerald-600 font-semibold py-3 rounded-2xl shadow-sm hover:bg-emerald-50 transition"
      >
        🔔 Activar recordatorios push
      </button>

      <div
        v-else-if="suscrito"
        class="text-center text-sm text-emerald-600 font-medium py-1"
      >
        ✓ Recordatorios push activados
      </div>

      <button
        type="button"
        @click="refrescar"
        class="w-full text-sm text-gray-500 font-medium py-2 disabled:opacity-50"
        :disabled="cargando"
      >
        {{ cargando ? 'Actualizando...' : 'Actualizar' }}
      </button>
    </div>
  </main>
</template>

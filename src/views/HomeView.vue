<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useTomas } from '@/composables/useTomas.js';
import { usePushNotifications } from '@/composables/usePushNotifications.js';
import { useToast } from '@/composables/useToast.js';
import StatusCard from '@/components/StatusCard.vue';
import PillButton from '@/components/PillButton.vue';
import NfcReader from '@/components/NfcReader.vue';
import DeanLogo from '@/components/DeanLogo.vue';

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
    show(hora ? `¡Listo! Dean tiene su pastilla de las ${hora} 🐾` : '¡Pastilla registrada! 🐾', 'success');
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
    show(hora ? `Tag leído · Pastilla de las ${hora} 🐾` : 'Tag leído 🐾', 'success');
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
  <main class="min-h-screen pb-24">
    <div class="max-w-md mx-auto p-4 space-y-4">
      <header class="pt-2 flex items-center gap-3">
        <DeanLogo :size="56" />
        <div class="min-w-0">
          <h1 class="text-2xl font-extrabold text-dean-800 leading-tight">
            Pastillas para Dean
          </h1>
          <p class="text-sm text-dean-600">Una cada 12 horas, sin olvidarnos 🐾</p>
        </div>
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
        class="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-900"
      >
        Tienes las notificaciones bloqueadas. Actívalas en los ajustes para que la
        familia avise cuando Dean necesite su pastilla.
      </div>

      <button
        v-if="permiso !== 'denied' && !suscrito"
        type="button"
        @click="activarPush"
        class="w-full bg-white border-2 border-dean-500 text-dean-700 font-semibold py-3 rounded-2xl shadow-sm hover:bg-dean-50 active:bg-dean-100 transition"
      >
        🔔 Activar avisos de Dean
      </button>

      <div
        v-else-if="suscrito"
        class="text-center text-sm text-dean-600 font-medium py-1"
      >
        ✓ Recibirás avisos cuando le toque pastilla a Dean
      </div>

      <button
        type="button"
        @click="refrescar"
        class="w-full text-sm text-dean-600 font-medium py-2 disabled:opacity-50"
        :disabled="cargando"
      >
        {{ cargando ? 'Actualizando...' : 'Actualizar' }}
      </button>
    </div>
  </main>
</template>

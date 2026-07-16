<script setup>
import { computed, toRef } from 'vue';
import { useCountdown } from '@/composables/useCountdown.js';

const props = defineProps({
  ultimaToma: { type: Object, default: null },
  proximaTomaEsperada: { type: Date, default: null },
  tomasHoy: { type: Number, default: 0 },
  objetivo: { type: Number, default: 2 }
});

const targetRef = toRef(props, 'proximaTomaEsperada');
const { texto: countdown, vencido } = useCountdown(targetRef);

const ultimaTomaTexto = computed(() => {
  if (!props.ultimaToma) return 'Nunca';
  return new Date(props.ultimaToma.fecha_hora).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
});

const ultimaTomaHace = computed(() => {
  if (!props.ultimaToma) return '';
  const diff = Date.now() - new Date(props.ultimaToma.fecha_hora).getTime();
  if (diff < 0) return 'recién';
  const horas = Math.floor(diff / (60 * 60 * 1000));
  const minutos = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (horas > 0) return `hace ${horas}h ${minutos}m`;
  if (minutos > 0) return `hace ${minutos}m`;
  return 'hace un momento';
});

const metodoLabel = computed(() => {
  if (!props.ultimaToma) return '';
  return props.ultimaToma.metodo === 'nfc' ? 'NFC' : 'manual';
});
</script>

<template>
  <div class="bg-white rounded-2xl shadow p-5 space-y-4">
    <div>
      <p class="text-xs uppercase tracking-wide text-gray-500">Última toma</p>
      <p class="text-2xl font-bold text-gray-900">{{ ultimaTomaTexto }}</p>
      <p v-if="ultimaToma" class="text-sm text-gray-500">
        {{ ultimaTomaHace }} · {{ metodoLabel }}
      </p>
      <p v-else class="text-sm text-gray-500">
        Aún no se ha registrado ninguna toma
      </p>
    </div>

    <div>
      <p class="text-xs uppercase tracking-wide text-gray-500">Próxima toma</p>
      <p
        class="text-2xl font-bold tabular-nums"
        :class="vencido ? 'text-red-600' : 'text-emerald-600'"
      >
        {{ proximaTomaEsperada ? countdown : '—' }}
      </p>
      <p v-if="vencido" class="text-sm text-red-600 font-medium">
        ¡Toca dar la pastilla!
      </p>
    </div>

    <div class="flex items-center justify-between pt-3 border-t border-gray-100">
      <span class="text-sm text-gray-600">Tomas de hoy</span>
      <span class="text-lg font-semibold text-gray-900">
        {{ tomasHoy }} / {{ objetivo }}
      </span>
    </div>
  </div>
</template>

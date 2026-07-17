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
  return props.ultimaToma.metodo === 'nfc' ? 'con NFC' : 'manual';
});
</script>

<template>
  <div class="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-dean-100 p-5 space-y-4">
    <div>
      <p class="text-xs uppercase tracking-wider text-dean-500 font-semibold">
        Última pastilla de Dean
      </p>
      <p class="text-2xl font-bold text-dean-900 mt-1">{{ ultimaTomaTexto }}</p>
      <p v-if="ultimaToma" class="text-sm text-dean-600 mt-0.5">
        {{ ultimaTomaHace }} · {{ metodoLabel }}
      </p>
      <p v-else class="text-sm text-dean-600 mt-0.5">
        Aún no le hemos dado ninguna pastilla a Dean
      </p>
    </div>

    <div class="pt-3 border-t border-dean-100">
      <p class="text-xs uppercase tracking-wider text-dean-500 font-semibold">
        Le toca en
      </p>
      <p
        class="text-3xl font-extrabold tabular-nums mt-1"
        :class="vencido ? 'text-red-600' : 'text-dean-700'"
      >
        {{ proximaTomaEsperada ? countdown : '—' }}
      </p>
      <p v-if="vencido" class="text-sm text-red-600 font-semibold mt-0.5">
        ¡Es hora de la pastilla de Dean!
      </p>
    </div>

    <div class="flex items-center justify-between pt-3 border-t border-dean-100">
      <span class="text-sm text-dean-700 font-medium">Pastillas de hoy</span>
      <span class="text-lg font-extrabold text-dean-900">
        {{ tomasHoy }} / {{ objetivo }}
      </span>
    </div>
  </div>
</template>

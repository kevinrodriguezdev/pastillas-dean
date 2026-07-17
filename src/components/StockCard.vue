<script setup>
import { ref, computed } from 'vue';
import { useStock } from '@/composables/useStock.js';
import { useToast } from '@/composables/useToast.js';
import DeanLogo from '@/components/DeanLogo.vue';

const { cantidad, nivel, etiquetaDias, cargar, reponer } = useStock();
const { show } = useToast();

const reponiendo = ref(false);
const cantidadInput = ref(null);
const guardando = ref(false);

const colorClasses = computed(() => {
  if (nivel.value === 'critico') {
    return {
      card: 'bg-red-50 border-red-300',
      label: 'text-red-700',
      value: 'text-red-900',
      icon: 'text-red-600'
    };
  }
  if (nivel.value === 'bajo') {
    return {
      card: 'bg-amber-50 border-amber-300',
      label: 'text-amber-700',
      value: 'text-amber-900',
      icon: 'text-amber-600'
    };
  }
  return {
    card: 'bg-white/80 border-dean-100',
    label: 'text-dean-500',
    value: 'text-dean-900',
    icon: 'text-dean-500'
  };
});

const cantidadLabel = computed(() => {
  const n = cantidad.value;
  if (n === 0) return '0 pastillas';
  if (n === 1) return '1 pastilla';
  return `${n} pastillas`;
});

function abrirReponer() {
  reponiendo.value = true;
  cantidadInput.value = null;
}

function cancelar() {
  reponiendo.value = false;
  cantidadInput.value = null;
}

async function confirmar() {
  const c = Number(cantidadInput.value);
  if (!Number.isInteger(c) || c < 1) {
    show('Introduce una cantidad válida', 'error');
    return;
  }
  guardando.value = true;
  try {
    await reponer(c);
    reponiendo.value = false;
    cantidadInput.value = null;
    show(`¡Repuesto! +${c} pastillas en la caja 🐾`, 'success');
  } catch (e) {
    show(e.message || 'No se pudo reponer', 'error');
  } finally {
    guardando.value = false;
  }
}

defineExpose({ cargar });
</script>

<template>
  <div
    class="rounded-2xl shadow-sm border p-4 transition-colors"
    :class="colorClasses.card"
  >
    <div class="flex items-center gap-3">
      <DeanLogo :size="44" :rounded="false" :class="['!bg-transparent', colorClasses.icon]" />
      <div class="flex-1 min-w-0">
        <p class="text-xs uppercase tracking-wider font-semibold" :class="colorClasses.label">
          Pastillas en la caja
        </p>
        <p class="text-lg font-extrabold leading-tight" :class="colorClasses.value">
          {{ cantidadLabel }}
          <span class="text-sm font-medium opacity-75">· {{ etiquetaDias }}</span>
        </p>
      </div>
      <button
        v-if="!reponiendo"
        type="button"
        @click="abrirReponer"
        class="shrink-0 bg-dean-500 hover:bg-dean-600 active:bg-dean-700 text-dean-50 font-bold w-11 h-11 rounded-full text-2xl active:scale-95 transition shadow-sm"
        aria-label="Reponer pastillas"
      >
        +
      </button>
    </div>

    <p
      v-if="nivel === 'bajo'"
      class="text-sm text-amber-800 font-semibold mt-2"
    >
      ⚠️ Quedan pocas, toca reponer
    </p>
    <p
      v-else-if="nivel === 'critico'"
      class="text-sm text-red-800 font-bold mt-2"
    >
      🚨 {{ cantidad === 0 ? '¡Sin pastillas!' : 'Quedan muy pocas, ¡compra ya!' }}
    </p>
    <p
      v-else-if="cantidad === 0"
      class="text-sm text-dean-600 mt-2"
    >
      Toca <span class="font-semibold">+</span> para añadir las pastillas que has comprado
    </p>

    <div
      v-if="reponiendo"
      class="mt-3 pt-3 border-t border-dean-200/60 space-y-2"
    >
      <p class="text-sm text-dean-700 font-medium">
        ¿Cuántas has comprado?
      </p>
      <input
        v-model.number="cantidadInput"
        type="number"
        min="1"
        inputmode="numeric"
        placeholder="30"
        class="w-full px-4 py-3 rounded-xl border-2 border-dean-200 text-2xl font-bold text-center focus:border-dean-500 outline-none bg-white"
      />
      <div class="flex gap-2">
        <button
          type="button"
          @click="cancelar"
          class="flex-1 py-2 rounded-xl text-dean-700 font-semibold hover:bg-dean-100 active:bg-dean-200 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="confirmar"
          :disabled="!cantidadInput || cantidadInput < 1 || guardando"
          class="flex-1 py-2 rounded-xl bg-dean-500 text-dean-50 font-semibold hover:bg-dean-600 active:bg-dean-700 disabled:opacity-50 transition"
        >
          {{ guardando ? 'Guardando...' : 'Añadir' }}
        </button>
      </div>
    </div>
  </div>
</template>

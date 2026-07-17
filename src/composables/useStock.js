import { ref, computed } from 'vue';

const cantidad = ref(0);
const nivel = ref('normal');
const cargando = ref(false);
let inicialComprobado = false;

async function cargar() {
  cargando.value = true;
  try {
    const res = await fetch('/api/stock');
    if (!res.ok) {
      console.error('useStock cargar:', res.status);
      return;
    }
    const data = await res.json();
    cantidad.value = typeof data.cantidad === 'number' ? data.cantidad : 0;
    nivel.value = data.nivel || 'normal';
  } catch (e) {
    console.error('useStock cargar:', e);
  } finally {
    cargando.value = false;
  }
}

async function reponer(cantidadAnadir) {
  if (!Number.isInteger(cantidadAnadir) || cantidadAnadir < 1) {
    throw new Error('Cantidad inválida');
  }
  const res = await fetch('/api/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidad: cantidadAnadir })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  const data = await res.json();
  cantidad.value = data.cantidad;
  nivel.value = data.nivel;
  return data;
}

const diasRestantes = computed(() => {
  if (cantidad.value == null) return null;
  return Math.floor(cantidad.value / 2);
});

const etiquetaDias = computed(() => {
  if (cantidad.value === 0) return 'Agotadas';
  if (cantidad.value === 1) return 'menos de 1 día';
  const d = diasRestantes.value;
  return `${d} ${d === 1 ? 'día' : 'días'}`;
});

export function useStock() {
  async function comprobarInicial() {
    if (inicialComprobado) return;
    inicialComprobado = true;
    await cargar();
  }

  return {
    cantidad,
    nivel,
    diasRestantes,
    etiquetaDias,
    cargando,
    cargar,
    reponer,
    comprobarInicial
  };
}

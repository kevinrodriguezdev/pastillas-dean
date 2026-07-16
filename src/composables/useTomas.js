import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase.js';

// Estado global compartido por todas las vistas (singleton de módulo)
const todas = ref([]);
const cargando = ref(false);
const error = ref(null);

const INTERVALO_HORAS = 12;
const MS_HORA = 60 * 60 * 1000;

async function cargarHistorial(limite = 50) {
  cargando.value = true;
  error.value = null;
  try {
    const { data, error: err } = await supabase
      .from('tomas')
      .select('id, fecha_hora, metodo')
      .order('fecha_hora', { ascending: false })
      .limit(limite);
    if (err) throw err;
    todas.value = data || [];
  } catch (e) {
    error.value = 'No se pudo cargar el historial';
    console.error('useTomas cargarHistorial:', e);
  } finally {
    cargando.value = false;
  }
}

async function appendMas(limite) {
  const { data, error: err } = await supabase
    .from('tomas')
    .select('id, fecha_hora, metodo')
    .order('fecha_hora', { ascending: false })
    .range(todas.value.length, todas.value.length + limite - 1);
  if (err) throw err;
  if (data && data.length) todas.value.push(...data);
  return data || [];
}

async function registrarToma(metodo) {
  if (metodo !== 'manual' && metodo !== 'nfc') {
    throw new Error('método inválido');
  }
  error.value = null;
  const apiKey = import.meta.env.VITE_API_KEY;
  const res = await fetch('/api/registrar-toma', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify({ metodo })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  const data = await res.json();
  await cargarHistorial();
  return data;
}

const ultimaToma = computed(() => todas.value[0] || null);

const tomasHoy = computed(() => {
  const ahora = new Date();
  const inicio = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  ).getTime();
  return todas.value.filter(
    (t) => new Date(t.fecha_hora).getTime() >= inicio
  );
});

const proximaTomaEsperada = computed(() => {
  if (!ultimaToma.value) return null;
  return new Date(
    new Date(ultimaToma.value.fecha_hora).getTime() + INTERVALO_HORAS * MS_HORA
  );
});

export function useTomas() {
  return {
    todas,
    ultimaToma,
    tomasHoy,
    proximaTomaEsperada,
    intervaloHoras: INTERVALO_HORAS,
    cargando,
    error,
    cargarHistorial,
    appendMas,
    registrarToma
  };
}

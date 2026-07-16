import { ref, onUnmounted } from 'vue';

// Web NFC solo está disponible en Android/Chrome. Singleton a nivel de módulo
// porque solo se permite un NDEFReader escaneando simultáneamente en la mayoría
// de navegadores.
const disponible = typeof window !== 'undefined' && 'NDEFReader' in window;

let ndef = null;
let initPromise = null;
const escaneando = ref(false);
const error = ref(null);
let listening = false;
let currentHandler = null;

async function ensureReader() {
  if (ndef) return ndef;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const reader = new NDEFReader();
    await reader.scan();
    reader.addEventListener('readingerror', () => {
      error.value = 'Error al leer el tag NFC. Acércalo más al móvil.';
    });
    ndef = reader;
    return reader;
  })().catch((e) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

export function useNfc() {
  async function start(onReading) {
    error.value = null;
    if (!disponible) {
      error.value = 'NFC no soportado en este navegador';
      return false;
    }
    if (listening && currentHandler && currentHandler !== onReading) {
      // Si ya hay otro handler, lo reemplazamos
      try { ndef?.removeEventListener('reading', currentHandler); } catch (e) { /* noop */ }
    }
    try {
      const reader = await ensureReader();
      if (currentHandler && currentHandler !== onReading) {
        currentHandler = onReading;
      } else if (!currentHandler) {
        currentHandler = onReading;
      }
      reader.addEventListener('reading', onReading);
      listening = true;
      escaneando.value = true;
      return true;
    } catch (e) {
      error.value = e.message || 'No se pudo iniciar NFC';
      console.error('NFC start error:', e);
      return false;
    }
  }

  function stop() {
    if (ndef && currentHandler) {
      try { ndef.removeEventListener('reading', currentHandler); } catch (e) { /* noop */ }
    }
    listening = false;
    currentHandler = null;
    escaneando.value = false;
  }

  onUnmounted(() => {
    // No cerramos el reader para que esté listo la próxima vez, pero dejamos
    // de escuchar al desuscribirse el componente.
  });

  return {
    disponible,
    escaneando,
    error,
    start,
    stop
  };
}

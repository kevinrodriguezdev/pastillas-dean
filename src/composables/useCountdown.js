import { ref, computed, onUnmounted } from 'vue';

// Cuenta atrás en tiempo real a una fecha objetivo reactiva.
// targetDate debe ser un Ref<Date | null> o un getter reactivo.
export function useCountdown(targetDate) {
  const ahora = ref(Date.now());
  let timer = null;

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      ahora.value = Date.now();
    }, 1000);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  const ms = computed(() => {
    const t = typeof targetDate === 'function' ? targetDate() : targetDate?.value;
    if (!t) return 0;
    return new Date(t).getTime() - ahora.value;
  });

  const vencido = computed(() => ms.value <= 0);

  const texto = computed(() => {
    const t = typeof targetDate === 'function' ? targetDate() : targetDate?.value;
    if (!t) return '—';
    const diff = ms.value;
    if (diff <= 0) return 'Toca dar la pastilla';
    const horas = Math.floor(diff / (60 * 60 * 1000));
    const minutos = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const segundos = Math.floor((diff % (60 * 1000)) / 1000);
    return `${horas}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`;
  });

  start();
  onUnmounted(stop);

  return { ms, texto, vencido, start, stop };
}

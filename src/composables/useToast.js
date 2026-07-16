import { ref } from 'vue';

// Toast global (singleton de módulo). useToast() siempre devuelve la misma
// instancia, así cualquier componente puede mostrar mensajes sin prop drilling.
const mensaje = ref('');
const tipo = ref('info'); // 'info' | 'success' | 'error'
const visible = ref(false);
let timer = null;

function show(msg, t = 'info', duracion = 3000) {
  mensaje.value = msg;
  tipo.value = t;
  visible.value = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    visible.value = false;
  }, duracion);
}

export function useToast() {
  return {
    mensaje,
    tipo,
    visible,
    show
  };
}

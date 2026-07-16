import { ref } from 'vue';

const permiso = ref(
  typeof Notification !== 'undefined' ? Notification.permission : 'default'
);
const suscrito = ref(false);
const error = ref(null);
let inicialComprobado = false;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getVapidPublicKey() {
  const res = await fetch('/api/vapid-key');
  if (!res.ok) throw new Error('No se pudo obtener la VAPID public key');
  const data = await res.json();
  if (!data.publicKey) throw new Error('VAPID public key vacía');
  return data.publicKey;
}

async function getOrCreateSubscription() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker no soportado en este navegador');
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub) return sub;

  const vapidKey = await getVapidPublicKey();
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });
  return sub;
}

export function usePushNotifications() {
  async function activar() {
    error.value = null;
    try {
      if (!('Notification' in window)) {
        throw new Error('Notificaciones no soportadas en este navegador');
      }
      // iOS Safari exige gesto del usuario para mostrar el prompt
      const result = await Notification.requestPermission();
      permiso.value = result;
      if (result !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }
      const sub = await getOrCreateSubscription();
      const res = await fetch('/api/suscribir-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status} al guardar suscripción`);
      }
      suscrito.value = true;
      return true;
    } catch (e) {
      error.value = e.message || 'Error al activar notificaciones';
      console.error('Push error:', e);
      return false;
    }
  }

  async function comprobarInicial() {
    if (inicialComprobado) return;
    inicialComprobado = true;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      suscrito.value = !!sub;
      if (Notification.permission) permiso.value = Notification.permission;
    } catch (e) {
      console.error('Error comprobando suscripción:', e);
    }
  }

  return {
    permiso,
    suscrito,
    error,
    activar,
    comprobarInicial
  };
}

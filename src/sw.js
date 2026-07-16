// =============================================================================
// Service Worker - Pastillas Perro NFC
// Estrategia: injectManifest de vite-plugin-pwa. No usamos precache de
// Workbox (los datos siempre se piden frescos a Supabase), por lo que no
// necesitamos un punto de inyección. Mantenemos este comentario como
// referencia por si más adelante se quisiera activar.
// =============================================================================

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Web Push: mostrar notificación cuando llega un push del servidor ---
self.addEventListener('push', (event) => {
  const defaults = {
    title: 'Pastillas del perro',
    body: 'Toca dar la pastilla al perro, han pasado más de 12h.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/'
  };

  let payload = defaults;
  if (event.data) {
    try {
      payload = { ...defaults, ...event.data.json() };
    } catch (e) {
      payload = { ...defaults, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: 'pastilla-recordatorio',
      renotify: true,
      data: { url: payload.url }
    })
  );
});

// --- Click en notificación: abrir o enfocar la app ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            // Si la app ya está abierta, traerla al frente
            try {
              client.navigate(targetUrl);
            } catch (e) {
              // algunos navegadores no permiten navigate, fallback a focus
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

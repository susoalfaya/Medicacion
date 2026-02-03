const CACHE_NAME = 'medigestion-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './index.css'
];

// --- INSTALACIÓN Y CACHÉ ---
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// --- ESTRATEGIA DE RED (Network First, fallback to Cache) ---
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// --- GESTIÓN DE NOTIFICACIONES ---

// Escuchar el evento 'push' (desde un servidor) o mensajes locales
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: '💊 Recordatorio de Medicación',
    body: 'Es hora de tu próxima toma.'
  };

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    vibrate: [200, 100, 200],
    tag: 'medication-reminder',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'taken', title: '✅ Tomada' },
      { action: 'dismiss', title: '❌ Omitir' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clics en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Lógica de los botones de acción
  if (event.action === 'taken') {
    // Aquí podrías usar BroadcastChannel para avisar a la App
    console.log('Usuario marcó como tomada');
  }

  // Abrir o enfocar la App
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// Limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
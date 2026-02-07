// Advanced Service Worker for PWA
const CACHE_NAME = 'medigestion-v5';
// Use relative paths for GitHub Pages compatibility
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean http (como chrome-extension)
  if (!event.request.url.startsWith('http')) return;
  
  // Ignorar peticiones a extensiones o recursos inválidos
  if (event.request.url.includes('chrome-extension')) return;
  if (event.request.url.includes('invalid/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la clonamos y actualizamos el caché
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Evitar cachear URLs inválidas
            if (event.request.method === 'GET') {
              cache.put(event.request, responseToCache).catch(() => {});
            }
          });
        return response;
      })
      .catch(() => {
        // Si falla la red (offline), buscamos en el caché
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no está en caché, devolver index.html para que la SPA maneje la ruta
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

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
  // Tomar control de todas las páginas inmediatamente
  return self.clients.claim();
});

// ========== SOPORTE PARA NOTIFICACIONES ==========

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  // Manejar acciones de la notificación
  if (event.action === 'taken') {
    // El usuario marcó que tomó el medicamento
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Enviar mensaje a la app para marcar como tomado
        clientList.forEach(client => {
          client.postMessage({
            type: 'MEDICATION_TAKEN',
            treatmentId: event.notification.data?.treatmentId
          });
        });
      })
    );
  } else if (event.action === 'snooze') {
    // Posponer 10 minutos
    event.waitUntil(
      self.registration.showNotification(
        event.notification.title,
        {
          ...event.notification.options,
          timestamp: Date.now() + 10 * 60 * 1000
        }
      )
    );
  } else {
    // Click sin acción específica - abrir la app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('./');
      })
    );
  }
});

// Listener para mostrar notificaciones programadas desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, treatmentId, medicationType } = event.data;
    
    self.registration.showNotification(title, {
      body: body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: `medication-${treatmentId}`,
      requireInteraction: true,
      data: { treatmentId, medicationType },
      actions: [
        {
          action: 'taken',
          title: '✓ Tomado',
          icon: './icon-192.png'
        },
        {
          action: 'snooze',
          title: '⏰ 10 min',
          icon: './icon-192.png'
        }
      ]
    });
  }
});
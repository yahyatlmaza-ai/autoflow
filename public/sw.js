const CACHE  = 'autoflow-v2.1.0';
const ASSETS = ['/', '/index.html', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'autoflow', body: 'New notification' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/logo-icon.png', badge: '/logo-icon.png', data: { url: data.url || '/' } }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data?.url || '/')); });

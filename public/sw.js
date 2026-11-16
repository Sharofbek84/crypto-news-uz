/* GOLDENWEB.UZ — service worker (cache + web push) */
const CACHE = 'goldenweb-v2'
const PRECACHE = ['/', '/obuna', '/yangiliklar', '/premium']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sign-')) {
    return
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(req, copy))
        return res
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'GOLDENWEB.UZ', body: 'Yangi signal', url: '/premium', tag: 'signal' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'GOLDENWEB.UZ', {
      body: data.body || '',
      icon: '/icons/192',
      badge: '/icons/192',
      tag: data.tag || 'signal',
      renotify: true,
      data: { url: data.url || '/premium' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/premium'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(target)
    })
  )
})

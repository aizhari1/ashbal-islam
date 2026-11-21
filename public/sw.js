const CACHE = 'ashbal-v5'
const PRECACHE = ['/', '/login', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((url) => c.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return
  if (url.hostname.includes('supabase')) return

  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const fetchPromise = fetch(e.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(e.request, copy))
            }
            return res
          })
          .catch(() => hit)
        return hit || fetchPromise
      })
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
        .catch(() => hit || new Response('Offline', { status: 503 }))
      return net
    })
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'أشبال الإسلام', body: 'عندك تنبيه جديد', url: '/teacher' }
  try {
    if (event.data) {
      const j = event.data.json()
      data = { ...data, ...j }
    }
  } catch {
    try {
      data.body = event.data ? event.data.text() : data.body
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'أشبال الإسلام', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/teacher' },
      dir: 'rtl',
      lang: 'ar',
      vibrate: [120, 60, 120],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/teacher'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

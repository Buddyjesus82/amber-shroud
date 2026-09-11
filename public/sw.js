const CACHE = 'amber-shroud-v2'
const SCOPE = self.location.pathname.replace(/sw\.js$/, '')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        SCOPE,
        `${SCOPE}manifest.webmanifest`,
        `${SCOPE}favicon.svg`,
        `${SCOPE}covers/world.png`,
        `${SCOPE}covers/hunger.png`,
      ]),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(SCOPE))),
  )
})

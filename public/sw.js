const CACHE = 'amber-shroud-v30'
const SCOPE = self.location.pathname.replace(/sw\.js$/, '')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        `${SCOPE}manifest.webmanifest`,
        `${SCOPE}favicon.png`,
        `${SCOPE}favicon-48.png`,
        `${SCOPE}icons/icon-192.png`,
        `${SCOPE}icons/icon-512.png`,
        `${SCOPE}icons/apple-touch.png`,
        `${SCOPE}covers/world.png`,
        `${SCOPE}covers/hunger.png`,
        `${SCOPE}covers/camp04.jpg`,
        `${SCOPE}covers/spine.jpg`,
        `${SCOPE}covers/threshold.jpg`,
        `${SCOPE}covers/valerius.jpg`,
        `${SCOPE}covers/hound.jpg`,
        `${SCOPE}covers/sybella.jpg`,
        `${SCOPE}covers/thalia.jpg`,
        `${SCOPE}covers/zafir.jpg`,
        `${SCOPE}covers/ossa.jpg`,
        `${SCOPE}covers/kaelen.jpg`,
        `${SCOPE}covers/oiltooth.jpg`,
        `${SCOPE}covers/silas.jpg`,
        `${SCOPE}covers/nim.jpg`,
        `${SCOPE}covers/oram.jpg`,
        `${SCOPE}covers/brin.jpg`,
        `${SCOPE}covers/rell.jpg`,
      ]),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        for (const client of clients) client.postMessage({ type: 'SW_UPDATED', cache: CACHE })
      }),
  )
})

function preferNetwork(req) {
  const dest = req.destination
  if (req.mode === 'navigate' || dest === 'document') return true
  if (dest === 'script' || dest === 'style' || dest === 'worker') return true
  try {
    const path = new URL(req.url).pathname
    return /\.(js|mjs|css|html|map)$/.test(path) || path.endsWith('/amber-shroud') || path.endsWith('/amber-shroud/')
  } catch {
    return false
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (preferNetwork(req)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req).then((hit) => hit || caches.match(SCOPE))),
    )
    return
  }
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

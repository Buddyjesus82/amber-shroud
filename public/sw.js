const CACHE = 'amber-shroud-v197'
const SCOPE = self.location.pathname.replace(/sw\.js$/, '')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      addEach(cache, [
        `${SCOPE}manifest.webmanifest`,
        `${SCOPE}favicon.png`,
        `${SCOPE}favicon-48.png`,
        `${SCOPE}icons/icon-192.png`,
        `${SCOPE}icons/icon-512.png`,
        `${SCOPE}icons/apple-touch.png`,
        `${SCOPE}covers/world.jpg`,
        `${SCOPE}covers/stairs.jpg`,
        `${SCOPE}covers/ch2-dark.jpg`,
        `${SCOPE}covers/ch2-p-supply.jpg`,
        `${SCOPE}covers/ch2-p-drillrun.jpg`,
        `${SCOPE}covers/ch2-survivor.jpg`,
        `${SCOPE}covers/ch2-approach.jpg`,
        `${SCOPE}covers/ch2-ditch.jpg`,
        `${SCOPE}covers/ch2-gully.jpg`,
        `${SCOPE}covers/ch2-irongut.jpg`,
        `${SCOPE}covers/ch2-ribs.jpg`,
        `${SCOPE}covers/ch2-ribs-lift-solo.jpg`,
        `${SCOPE}covers/ch2-vein.jpg`,
        `${SCOPE}covers/ch2-cache.jpg`,
        `${SCOPE}covers/ch2-heart.jpg`,
        `${SCOPE}covers/ch2-trapped.jpg`,
        `${SCOPE}covers/ch2-end.jpg`,
        `${SCOPE}covers/ch2-gate.jpg`,
        `${SCOPE}covers/ch2-fight-dragoon.jpg`,
        `${SCOPE}covers/ch2-fight-drill-lead.jpg`,
        `${SCOPE}covers/ch2-fight-patrol.jpg`,
        `${SCOPE}covers/ch2-o-abyss.jpg`,
        `${SCOPE}covers/ch2-o-bounty.jpg`,
        `${SCOPE}covers/ch2-o-cage.jpg`,
        `${SCOPE}covers/ch2-o-hounds.jpg`,
        `${SCOPE}covers/ch2-o-root.jpg`,
        `${SCOPE}covers/ch2-o-stakes.jpg`,
        `${SCOPE}covers/ch2-o-stilts.jpg`,
        `${SCOPE}covers/ch2-o-strays.jpg`,
        `${SCOPE}covers/ch2-o-wash.jpg`,
        `${SCOPE}covers/ch2-p-abyss.jpg`,
        `${SCOPE}covers/ch2-p-bays.jpg`,
        `${SCOPE}covers/ch2-p-bilge.jpg`,
        `${SCOPE}covers/ch2-p-haul.jpg`,
        `${SCOPE}covers/ch2-p-jaws.jpg`,
        `${SCOPE}covers/ch2-p-shaft.jpg`,
        `${SCOPE}covers/ch2-p-sift.jpg`,
        `${SCOPE}covers/ch2-v-bleed.jpg`,
        `${SCOPE}covers/ch2-v-blown.jpg`,
        `${SCOPE}covers/ch2-v-garden.jpg`,
        `${SCOPE}covers/ch2-v-greg.jpg`,
        `${SCOPE}covers/ch2-v-murch.jpg`,
        `${SCOPE}covers/ch2-v-outpost.jpg`,
        `${SCOPE}covers/ch2-v-ribs.jpg`,
        `${SCOPE}covers/ch2-v-scar.jpg`,
        `${SCOPE}covers/ch2-v-stair.jpg`,
        `${SCOPE}covers/ch2-v-test.jpg`,
        `${SCOPE}covers/hunger.png`,
        `${SCOPE}covers/spine.jpg`,
        `${SCOPE}covers/threshold.jpg`,
        `${SCOPE}covers/valerius.jpg`,
        `${SCOPE}covers/hound.jpg`,
        `${SCOPE}covers/sybella.jpg`,
        `${SCOPE}covers/thalia.jpg`,
        `${SCOPE}covers/bonewright.jpg`,
        `${SCOPE}covers/maw-lip.jpg`,
        `${SCOPE}covers/maw-ribs.jpg`,
        `${SCOPE}covers/maw-hold.jpg`,
        `${SCOPE}covers/maw-wreck.jpg`,
        `${SCOPE}covers/handler.jpg`,
        `${SCOPE}covers/last-fence.jpg`,
        `${SCOPE}covers/noon-country.jpg`,
        `${SCOPE}covers/hymn-road.jpg`,
        `${SCOPE}covers/cache-run.jpg`,
        `${SCOPE}covers/lash-holds.jpg`,
        `${SCOPE}covers/valued-thing.jpg`,
        `${SCOPE}covers/ch1-end.jpg`,
        `${SCOPE}covers/under-jaw.jpg`,
        `${SCOPE}covers/masked-figure.jpg`,
        `${SCOPE}covers/masked-far.jpg`,
        `${SCOPE}covers/south-wind.jpg`,
        `${SCOPE}covers/holding-cells.jpg`,
        `${SCOPE}covers/prisoner-opening.jpg`,
        `${SCOPE}covers/rim-cutter.jpg`,
        `${SCOPE}covers/waste-scavenger.jpg`,
        `${SCOPE}covers/amber-husk.jpg`,
        `${SCOPE}covers/dust-jackal.jpg`,
        `${SCOPE}covers/rib-worm.jpg`,
        `${SCOPE}covers/vat-leech.jpg`,
        `${SCOPE}covers/hymn-moth.jpg`,
        `${SCOPE}covers/amber-tick.jpg`,
        `${SCOPE}covers/shard-pup.jpg`,
        `${SCOPE}covers/ossa.jpg`,
        `${SCOPE}covers/kaelen.jpg`,
        `${SCOPE}covers/oiltooth.jpg`,
        `${SCOPE}covers/silas.jpg`,
        `${SCOPE}covers/drennick.jpg`,
        `${SCOPE}covers/oram.jpg`,
        `${SCOPE}covers/brin.jpg`,
        `${SCOPE}covers/rell.jpg`,
        `${SCOPE}covers/skiffbay.jpg`,
        `${SCOPE}covers/bay_pike.jpg`,
        `${SCOPE}covers/corvin.jpg`,
        `${SCOPE}covers/guard.jpg`,
        `${SCOPE}covers/yard.jpg`,
        `${SCOPE}covers/steam-vents.jpg`,
        `${SCOPE}covers/korvan.jpg`,
        `${SCOPE}covers/camp-storm.jpg`,
        `${SCOPE}covers/jaxson-reunion.jpg`,
        `${SCOPE}covers/mira.jpg`,
        `${SCOPE}covers/bootprints.jpg`,
        `${SCOPE}covers/camp-shiv.jpg`,
        `${SCOPE}covers/bay_sarn.jpg`,
        `${SCOPE}covers/bay_vetch.jpg`,
        `${SCOPE}covers/hotwire.jpg`,
        `${SCOPE}covers/carapace.jpg`,
        `${SCOPE}covers/jodi.jpg`,
        `${SCOPE}covers/hoard.jpg`,
        `${SCOPE}covers/rim-gullet.jpg`,
        `${SCOPE}covers/rim-bonewash.jpg`,
        `${SCOPE}covers/rim-pilgrims-scar.jpg`,
        `${SCOPE}covers/courtguard.jpg`,
        `${SCOPE}covers/down.jpg`,
        `${SCOPE}covers/resin-vault.jpg`,
        `${SCOPE}covers/extraction-rig.jpg`,
        `${SCOPE}covers/skiff-bay-docks.jpg`,
        `${SCOPE}covers/stray-collector.jpg`,
        `${SCOPE}covers/stall-empty.jpg`,
        `${SCOPE}covers/greg.jpg`,
        `${SCOPE}covers/murch.jpg`,
        `${SCOPE}covers/vex.jpg`,
        `${SCOPE}intro/world.jpg`,
        `${SCOPE}intro/sap.jpg`,
        `${SCOPE}intro/cartel.jpg`,
        `${SCOPE}intro/seekers.jpg`,
        `${SCOPE}intro/strays.jpg`,
        `${SCOPE}intro/doors.jpg`,
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
  // v173: images are cache-first. A precached cover paints at once, even on a stalled or captive connection;
  // a cache miss goes to the network with a timeout and is stored for next time.
  if (req.destination === 'image' || /\/covers\/[^/]+\.(jpg|jpeg|png)$/.test(new URL(req.url).pathname)) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(
        (hit) =>
          hit ||
          withTimeout(fetch(req), 10000)
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone()
                caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
              }
              return res
            })
            .catch(() => Response.error()),
      ),
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
      .catch(() =>
        // v147: covers are requested with ?v=; the precache has them without it. Never answer an image with the page.
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.destination === 'image' ? Response.error() : caches.match(SCOPE))),
      ),
  )
})

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

/** v173: precache file by file. One failed cover no longer fails the whole install and strands an old worker. */
function addEach(cache, urls) {
  return Promise.all(urls.map((u) => cache.add(u).catch(() => {})))
}

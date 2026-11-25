/** v254: Barrow (and Chapter Two) map labels clear of each other, and a green smoke run (Jeramie). */
import { readFileSync } from 'node:fs'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import { edgeSap } from '../src/game/map.ts'
import { estimateLabel, layoutLabels, layoutProblems, type Box } from '../src/game/mapLabels.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const assert = ok

ok(readFileSync('src/version.ts', 'utf8').includes("'v257'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v257'"), 'build v254')

// Barrow geography holds: the chain and the Causeway -> Ossuary sunken road.
{
  const m = HUB_MAPS.barrow
  const has = (a: string, b: string) => m.edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))
  ok(has('causeway', 'ossuary'), 'barrow: the Causeway still runs on to the Ossuary')
  const n = (id: string) => m.nodes.find((x) => x.id === id)!
  ok(n('ossuary').y < n('causeway').y && Math.abs(n('ossuary').x - n('causeway').x) < 10, 'barrow: the Ossuary sits straight on from the Causeway')
  // v255: Causeway moved down with its label below so the Ossuary stem reads clear (see scripts/v255.ts).
  for (const id of ['siphon', 'ossuary']) ok(n(id).labelSide === 'above', `barrow: ${id} label sits above`)
}

// The smoke label check, every map and every "you are here" node: zero clashes.
{
  const W = 341
  const labelClashes: string[] = []
  for (const map of Object.values(HUB_MAPS)) {
    const H = (W * map.height) / map.width
    const ex = estimateLabel(map.maw.label, null, 200)
    const exitBox: Box = map.hubId === 'camp04' ? { x: -999, y: -999, w: 0, h: 0 } : {
      x: Math.min(Math.max((map.maw.x / map.width) * W - ex.w / 2, 6), W - 6 - ex.w),
      y: Math.min(Math.max((map.maw.y / map.height) * H - ex.h / 2, 6), H - 6 - ex.h),
      w: ex.w,
      h: ex.h,
    }
    const compass: Box = { x: W / 2 - 42, y: (4 / map.width) * W, w: 84, h: 16 }
    const px = (id: string) => {
      const n = map.nodes.find((m) => m.id === id)!
      return [(n.x / map.width) * W, (n.y / map.height) * H] as const
    }
    const edges = map.edges.map((e) => [...px(e.a), ...px(e.b)] as [number, number, number, number])
    for (const here of map.nodes) {
      const adj = new Set(map.edges.flatMap((e) => (e.a === here.id ? [e.b] : e.b === here.id ? [e.a] : [])))
      const nodes = map.nodes.map((n) => {
        const mine = n.id === here.id
        const sap = adj.has(n.id) ? edgeSap(map, here.id, n.id) : null
        // Mirrors MapSheet subFor: a free road (0 Sap) shows no sub-line.
        const sub = mine ? 'you' : sap ? `−${sap} sap` : sap === 0 ? '' : 'far'
        return { id: n.id, x: (n.x / map.width) * W, y: (n.y / map.height) * H, ...estimateLabel(n.short ?? n.name, map.hubId === 'camp04' ? null : sub, 118), here: mine, side: n.labelSide }
      })
      const input = { width: W, height: H, nodes, edges, obstacles: [exitBox, compass] }
      const placed = layoutLabels(input)
      placed.forEach((p, i) => {
        const n = nodes[i]
        const above = p.box.y + p.box.h <= n.y
        const below = p.box.y >= n.y
        assert(above || below, `${map.hubId}/${here.id}: ${n.id} label sits above or below its marker`)
        assert(n.x >= p.box.x && n.x <= p.box.x + p.box.w, `${map.hubId}/${here.id}: ${n.id} label is centred over its marker column`)
      })
      for (const b of layoutProblems(input, placed)) labelClashes.push(`${map.hubId} (here=${here.id}): ${b}`)
    }
  }
  assert(!labelClashes.length, `map labels collide: ${labelClashes.join('; ')}`)
  if (!labelClashes.length) console.log('labels clean on every map')
}

if (fails) { console.log(`v254: ${fails} failure(s)`); process.exit(1) }
console.log('v254 checks OK')

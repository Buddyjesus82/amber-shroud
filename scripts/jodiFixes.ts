// v219 (jodi-fixes): the Hollow rename, Sable's tent art, fog + walk rows on every home hub, and the pin holding off-map.
import { ALL_SCENES } from '../src/game/content'
import { HUB_MAPS } from '../src/game/content/maps'
import { applyEffect, isChoiceOn, newGame, visibleChoices } from '../src/game/engine'
import { currentNode, drawnMap, markCampSeen, travelGate } from '../src/game/map'
import { playCoverFile, playCoverKey } from '../src/game/art'
import type { GameState } from '../src/game/types'
import { voiceForSpeaker } from '../src/game/voices'
import { readFileSync } from 'node:fs'

function assert(c: unknown, m: string) { if (!c) throw new Error(m) }

// 1. No player-facing "Vex" left in Chapter 2 (Vex Ironhand is a different man).
const ch2 = readFileSync('src/game/content/intoTheMaw.ts', 'utf8') + readFileSync('src/game/voices.ts', 'utf8')
const strays = [...ch2.matchAll(/['"`][^'"`\n]*\bVex\b(?! Ironhand)[^'"`\n]*['"`]/g)].map((m) => m[0])
assert(!strays.length, `Chapter 2 still says Vex: ${strays.join(' | ')}`)

for (const id of ['ch2:p-sift', 'ch2:v-bleed', 'ch2:o-cage']) assert(voiceForSpeaker('The Hollow', id)?.lines.length, `${id}: Hollow has own voice`)

// 2. Sable has her own tent art on every door.
for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const st = { ...newGame(door), sceneId: 'spine:sable', hubId: 'spine' } as GameState
  const file = playCoverFile(playCoverKey(st, ALL_SCENES.find((s) => s.id === 'spine:sable')!))
  assert(file.includes('p1-sable-tent.jpg'), `${door}: Sable resolves to ${file}`)
}
assert(readFileSync('public/sw.js', 'utf8').includes('p1-sable-tent.jpg'), 'sw precaches Sable art')

// 3. Fog + walk rows on the Spine and the Threshold; buttons alone reach every place.
for (const [door, hub] of [['outcast', 'spine'], ['vessel', 'threshold']] as const) {
  const map = HUB_MAPS[hub]
  const start = { ...newGame(door), hubId: hub, sceneId: map.nodes.find((n) => n.sceneId.startsWith(hub === 'spine' ? 'spine:' : 'thresh:'))!.sceneId } as GameState
  const d0 = drawnMap(markCampSeen(start))!
  assert(d0.nodes.length < map.nodes.length, `${hub} starts fogged`)
  assert(map.nodes.some((n) => visibleChoices({ ...start, sceneId: n.sceneId }).some((c) => c.id.startsWith('walk-'))), `${hub} has Walk to rows`)
  const got = new Map<string, GameState>([[start.sceneId, markCampSeen(start)]])
  const q = [markCampSeen(start)]
  while (q.length) {
    const st = q.shift()!
    for (const c of visibleChoices(st)) {
      if (!c.effects?.goto || !isChoiceOn(st, c.enable)) continue
      const nx = markCampSeen(applyEffect({ ...st, sap: 99 } as GameState, c.effects))
      if (nx.hubId === hub && !got.has(nx.sceneId)) { got.set(nx.sceneId, nx); q.push(nx) }
    }
  }
  for (const n of map.nodes) {
    if (!n.sceneId.startsWith(hub === 'spine' ? 'spine:' : 'thresh:')) continue
    assert(got.has(n.sceneId), `${hub}: ${n.name} reachable by buttons`)
  }
  let explored = markCampSeen(start)
  for (const n of map.nodes.filter((n) => got.has(n.sceneId))) explored = markCampSeen({ ...explored, sceneId: n.sceneId })
  assert(drawnMap(explored)!.nodes.length === map.nodes.length, `${hub} draws in as walked (including exit)`)
  for (const e of map.edges) {
    for (const [from, to] of [[e.a, e.b], [e.b, e.a]]) {
      const a = map.nodes.find((n) => n.id === from)!
      const b = map.nodes.find((n) => n.id === to)!
      if (!a.sceneId.startsWith(hub === 'spine' ? 'spine:' : 'thresh:') || !b.sceneId.startsWith(hub === 'spine' ? 'spine:' : 'thresh:')) continue
      const at = { ...start, sceneId: a.sceneId }
      const c = visibleChoices(at).find((c) => c.effects?.goto === b.sceneId || c.effects?.travel === b.sceneId)
      assert(c, `${hub}: button road ${from} -> ${to}`)
      if (c!.id.startsWith('walk-')) assert(c!.effects.sap === -(e.sap ?? 1), `${hub}: Walk road retains Sap cost`)
    }
  }
}

// 4. Off-map screens hold the last pin instead of the hub default.
const camp = HUB_MAPS.camp04
const guard = camp.nodes.find((n) => n.id !== camp.defaultNode)!
let s = markCampSeen({ ...newGame('prisoner'), hubId: 'camp04', sceneId: guard.sceneId } as GameState)
for (const off of ['camp:gate', 'crisis:camp', 'crisis:camp-alone', 'camp:sift-gate', 'camp:log-vents', 'camp:log-deck', 'camp:orla']) {
  const at = markCampSeen({ ...s, sceneId: off })
  assert(currentNode(at)?.id === guard.id, `${off} holds the pin at ${guard.id} (got ${currentNode(at)?.id})`)
}
for (const hub of ['spine', 'threshold'] as const) {
  const map = HUB_MAPS[hub]
  const n = map.nodes.find((x) => x.id !== map.defaultNode)!
  const t = markCampSeen({ ...newGame(hub === 'spine' ? 'outcast' : 'vessel'), hubId: hub, sceneId: n.sceneId } as GameState)
  const off = hub === 'spine' ? 'crisis:spine' : 'crisis:thresh'
  assert(currentNode({ ...t, sceneId: off })?.id === n.id, `${hub}: ${off} holds the pin`)
}
// The actual Overlook pin, old-save fallback, and cross-hub pin isolation.
const overlook = markCampSeen({ ...s, sceneId: 'camp:overlook' })
assert(currentNode(overlook)?.id === 'overlook', 'Overlook X stays at Overlook')
assert(currentNode({ ...overlook, sceneId: 'camp:gate' })?.id === 'overlook', 'off-map holds Overlook X')
assert(travelGate({ ...overlook, sceneId: 'camp:gate' }, 'camp:cages').ok, 'off-map roads use the same held pin as the X')
assert(currentNode({ ...overlook, hubId: 'spine', sceneId: 'unknown' })?.id === HUB_MAPS.spine.defaultNode, 'pin never leaks across hubs')
console.log('jodiFixes OK')

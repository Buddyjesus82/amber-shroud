/** v253: the Ossuary Cut, at the end of the Causeway's sunken road (Jeramie). */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { applyEffect, newGame, sceneOf, sceneProse, travelTo, visibleChoices } from '../src/game/engine.ts'
import { coverBand, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { ch3MapLocked, drawnMap } from '../src/game/map.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v259'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v259'"), 'build v253')

const BODY = 'The flagstones tip down into a dry wash. Bleached ribs stick out of the sand like fence posts, and Cartel mile-markers lie snapped and half-buried among them. Boot tracks come in from every direction. Far fewer lead back out.'
const ROWS: [string, string, string | undefined, string | undefined][] = [
  ['read-markers', 'Read the mile-markers', 'Cartel paint, sun-stripped.', 'The numbers count down toward Red Maw on one stone, toward nothing on another. Someone chiseled the second one blank.'],
  ['follow-tracks', 'Follow the tracks in', 'Most of them stop here.', 'The prints crowd together at the choke, then thin to a few pairs. One set ends at a rib, as if whoever made it simply sat down.'],
  ['toward-redmaw', 'Toward Red Maw', 'Where Wren pointed.', 'The wash bends east toward the red cuts. Not yet.'],
  ['unmarked-track', 'The unmarked track', "Off the Cartel's books.", 'A narrow trail slips between the ribs, scuffed by hand-carts. Not yet.'],
  ['back-causeway', 'Back up the causeway', undefined, undefined],
]

const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const press = (s: GameState, id: string) => { const c = row(s, id); if (!c) throw new Error(`no ${id} on ${s.sceneId}: ${ids(s).join()}`); return applyEffect(s, c.effects) }
const g = newGame('outcast')
const at = (sceneId: string, flags: GameState['flags'] = {}): GameState => ({
  ...g, sceneId, hubId: 'barrow', chapterId: 'luminspire', sap: 4, health: 5,
  items: { ...g.items, scrap: 2, salve: 0 }, heat: { ...g.heat, cartel: 2, seekers: 1, strays: 1 },
  flags: { ...g.flags, ch3Started: true, ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, ch3TentOpen: true, ch3VaultDone: true, crosshavenCablesCut: true, crosshavenGateOpen: true, barrowMap: true, martaMet: true, causewayCrossed: true, noMasked: true, ...flags },
} as GameState)

// ── The sunken road walks on, same label and sub ──
const cw = at('ch3:causeway')
const road = row(cw, 'sunken-road')
ok(road?.label === 'Follow the sunken road' && road.sub === 'Deeper into the Barrow Trails.', 'sunken road row unchanged')
const os = press(cw, 'sunken-road')
ok(os.sceneId === 'ch3:ossuary' && !os.flash && os.sap === 4 && os.health === 5, 'sunken road: to the Ossuary Cut, free, no line')
ok(!readFileSync('src/game/content/luminspire.ts', 'utf8').includes('down toward a low choke in the rock. Not yet.'), 'old road placeholder gone')

// ── The node ──
const sc = sceneOf(os)
ok(sc.title === 'The Ossuary Cut' && sc.hubId === 'barrow' && sc.kind === 'story', 'title, hub')
ok(sceneProse(os) === BODY, 'body exact')
ok(ids(os).join() === ROWS.map((r) => r[0]).join(), `rows: ${ids(os).join()}`)
for (const [id, label, sub, flash] of ROWS) {
  const r = row(os, id)
  ok(r?.label === label && r.sub === sub && !r.locked, `${id}: label and sub`)
  const after = press(os, id)
  if (flash) {
    ok(after.sceneId === 'ch3:ossuary' && after.flash === flash, `${id}: stays, flash exact`)
    ok(press({ ...after, flash: undefined }, id).flash === flash, `${id}: repeatable`)
  } else {
    ok(after.sceneId === 'ch3:causeway' && !after.flash, 'back up the causeway, no extra line')
  }
  ok(after.sap === os.sap && after.health === os.health && JSON.stringify(after.items) === JSON.stringify(os.items) && JSON.stringify(after.heat) === JSON.stringify(os.heat), `${id}: no reward, no Heat`)
}
ok(!visibleChoices(os).some((x) => /^Walk to/.test(x.label)), 'no auto Walk rows')

// ── Map ──
const map = HUB_MAPS.barrow
ok(map.nodes.some((n) => n.id === 'ossuary' && n.name === 'The Ossuary Cut' && n.sceneId === 'ch3:ossuary') && map.edges.some((e) => e.a === 'causeway' && e.b === 'ossuary' && e.sap === 0 && !e.oneWay) && map.sceneNode['ch3:ossuary'] === 'ossuary', 'ossuary node, free road to the Causeway')
const notCrossed = at('ch3:rustvein', { causewayCrossed: false })
ok(ch3MapLocked(notCrossed, 'ch3:ossuary'), 'not crossed: map cannot reach the Ossuary Cut')
ok(!ch3MapLocked(cw, 'ch3:ossuary'), 'crossed: map walk opens')
const walked = travelTo(at('ch3:causeway'), 'ch3:ossuary')
ok(walked.sceneId === 'ch3:ossuary' && walked.sap === 4 && walked.heat.cartel === 2, 'map walk from the Causeway: free, no Heat')
ok(drawnMap(os)?.nodes.some((n) => n.id === 'ossuary') && drawnMap(os)?.edges.some((e) => e.b === 'ossuary'), 'ossuary on the drawn sheet (barrowMap)')
const fogged = at('ch3:ossuary', { barrowMap: false })
ok(drawnMap(fogged)?.nodes.some((n) => n.id === 'ossuary'), 'fogged sheet: standing there reveals it')

// ── Art ──
const f = 'public/covers/ch3-ossuary.jpg'
ok(playCoverKey(os, sc) === 'ch3_ossuary' && playCoverFile('ch3_ossuary') === 'ch3-ossuary.jpg' && existsSync(f) && statSync(f).size > 20000, 'ossuary art')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/ch3-ossuary.jpg'), 'ossuary art cached offline')
const [bt, bb] = coverBand('ch3_ossuary')
ok(bt === 0.08 && bb === 0.8, 'ossuary band [0.08, 0.80]')

if (fails) { console.log(`v253: ${fails} failure(s)`); process.exit(1) }
console.log('v253 ok')

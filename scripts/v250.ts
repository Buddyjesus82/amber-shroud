/** v250: the Barrow Causeway past the Rustvein toll (Jeramie, t1275u). */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { applyEffect, newGame, sceneOf, sceneProse, travelTo, visibleChoices } from '../src/game/engine.ts'
import { coverBand, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { ch3MapLocked, drawnMap } from '../src/game/map.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v254'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v254'"), 'build v253')

const BODY = 'Past the gate, the trade road sinks into the earth. Old flagstones run on under a skin of wind-packed grit, split by drainage ribs that broke long ago. Along the ridge above, low barrow mounds stand in a crooked line against the sky.'
const PAID = "Nobody calls out behind you. Whatever Marta wrote, it wasn't trouble."
const SLIP = 'You keep low under the shutter. The pen stops scratching for a breath, then starts again.'
// v252: the mounds placeholder became the cairn pickup (see scripts/v252.ts).
const MOUNDS = "Halfway up the ridge, a flat slate sits balanced on three dark stones, the same mark inked on your map. Under it, someone left a wrapped bundle.\n\nResin +1.\nScrap +1."
// v253: the sunken road's 'Not yet.' placeholder became the walk to ch3:ossuary.

const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const press = (s: GameState, id: string) => { const c = row(s, id); if (!c) throw new Error(`no ${id} on ${s.sceneId}: ${ids(s).join()}`); return applyEffect(s, c.effects) }
const g = newGame('outcast')
const at = (sceneId: string, flags: GameState['flags'] = {}, cartel = 2): GameState => ({
  ...g, sceneId, hubId: 'barrow', chapterId: 'luminspire', sap: 4, health: 5,
  items: { ...g.items, scrap: 2 }, heat: { ...g.heat, cartel },
  flags: { ...g.flags, ch3Started: true, ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, ch3TentOpen: true, ch3VaultDone: true, crosshavenCablesCut: true, crosshavenGateOpen: true, barrowMap: true, martaMet: true, noMasked: true, ...flags },
} as GameState)
const crossing = (s: GameState) => ids(s).filter((id) => ['walk-causeway-paid', 'slip-toll', 'walk-causeway'].includes(id))

// ── Paid toll: free walk, arrival line once ──
const paid = at('ch3:rustvein', { martaTollPaid: true })
ok(crossing(paid).join() === 'walk-causeway-paid', `paid: one crossing row (${crossing(paid)})`)
const pr = row(paid, 'walk-causeway-paid')
ok(pr?.label === 'Walk the causeway' && !pr.sub, 'paid: Walk the causeway, no sub')
let c = press(paid, 'walk-causeway-paid')
ok(c.sceneId === 'ch3:causeway' && c.flash === PAID && c.sap === 4 && c.heat.cartel === 2 && c.flags.causewayCrossed, 'paid: free, arrival line, crossed')
const backP = press({ ...c, flash: undefined }, 'back-rustvein')
ok(backP.sceneId === 'ch3:rustvein' && crossing(backP).join() === 'walk-causeway', 'paid: back at the gate, plain walk now')
const again = press(backP, 'walk-causeway')
ok(again.sceneId === 'ch3:causeway' && !again.flash && again.heat.cartel === 2 && again.sap === 4, 'paid: later walk has no line, no Heat, no Sap')

// ── Unpaid: slip for Cartel Heat +1 ──
const unpaid = at('ch3:rustvein')
ok(crossing(unpaid).join() === 'slip-toll', `unpaid: one crossing row (${crossing(unpaid)})`)
const sr = row(unpaid, 'slip-toll')
ok(sr?.label === 'Slip past the toll hut' && sr.sub === 'Cartel Heat +1.', 'slip row and sub')
const s1 = press(unpaid, 'slip-toll')
ok(s1.sceneId === 'ch3:causeway' && s1.heat.cartel === 3 && s1.flash === `${SLIP}\nCartel Heat +1.` && s1.flags.causewayCrossed, 'slip: Cartel Heat +1 with the line')
const capped = press(at('ch3:rustvein', {}, 8), 'slip-toll')
ok(capped.sceneId === 'ch3:causeway' && capped.heat.cartel === 8 && capped.flash === SLIP, 'slip at Cartel 8: no Heat line')
const backS = press({ ...s1, flash: undefined }, 'back-rustvein')
ok(crossing(backS).join() === 'walk-causeway', 'slipped: later a plain walk')
const s2 = press(backS, 'walk-causeway')
ok(s2.heat.cartel === 3 && !s2.flash, 'slipped: later walk costs no Heat')
// Paying after slipping does not bring the arrival line back.
const lateP = press(at('ch3:rustvein', { causewayCrossed: true }), 'pay-toll')
ok(crossing(lateP).join() === 'walk-causeway', 'paying after crossing: still the plain walk')

// ── The Causeway ──
const cw = at('ch3:causeway', { causewayCrossed: true })
ok(sceneOf(cw).title === 'The Barrow Causeway' && sceneProse(cw) === BODY, 'title and body')
ok(ids(cw).join() === 'climb-mounds,sunken-road,back-rustvein', `causeway rows: ${ids(cw).join()}`)
ok(row(cw, 'climb-mounds')?.label === 'Climb to the barrow mounds' && row(cw, 'climb-mounds')?.sub === 'A stack of stones on the crest.', 'mounds row (v252 sub)')
ok(row(cw, 'sunken-road')?.label === 'Follow the sunken road' && row(cw, 'sunken-road')?.sub === 'Deeper into the Barrow Trails.', 'road row')
ok(row(cw, 'back-rustvein')?.label === 'Back to the Rustvein Gateway', 'back row')
const m = press(cw, 'climb-mounds')
ok(m.sceneId === 'ch3:causeway' && m.flash === MOUNDS && m.sap === 4 && m.health === 5, 'mounds: stays, flash')
const r = press(cw, 'sunken-road')
ok(r.sceneId === 'ch3:ossuary' && r.sap === 4, 'road: (v253) walks on to the Ossuary Cut, free')
ok(press(m, 'climb-mounds-empty').flash === 'The slate sits empty on its stones.' , 'cairn repeatable (v252: empty after)')
ok(press(cw, 'back-rustvein').sceneId === 'ch3:rustvein', 'back to Rustvein')

// ── Map ──
const map = HUB_MAPS.barrow
ok(map.nodes.some((n) => n.id === 'causeway' && n.name === 'The Barrow Causeway' && n.sceneId === 'ch3:causeway') && map.edges.some((e) => e.a === 'rustvein' && e.b === 'causeway' && e.sap === 0 && !e.oneWay), 'causeway node, free road to Rustvein')
ok(ch3MapLocked(unpaid, 'ch3:causeway') && travelTo(unpaid, 'ch3:causeway').sceneId === 'ch3:rustvein', 'map cannot cross the toll for you')
ok(ch3MapLocked(paid, 'ch3:causeway'), 'paid but not crossed: the button crosses, not the map')
ok(!ch3MapLocked(backS, 'ch3:causeway') && travelTo(backS, 'ch3:causeway').sceneId === 'ch3:causeway', 'crossed: map walk opens')
ok(travelTo(backS, 'ch3:causeway').heat.cartel === 3 && travelTo(backS, 'ch3:causeway').sap === 4, 'crossed: map walk free, no Heat')
ok(!visibleChoices(unpaid).some((x) => /^Walk to/.test(x.label)) && !visibleChoices(cw).some((x) => /^Walk to/.test(x.label)), 'no auto Walk rows')
ok(drawnMap(s1)?.nodes.some((n) => n.id === 'causeway') && drawnMap(s1)?.edges.some((e) => e.b === 'causeway'), 'causeway on the drawn sheet')

// ── Art ──
const f = 'public/covers/ch3-causeway.jpg'
ok(playCoverKey(cw, sceneOf(cw)) === 'ch3_causeway' && playCoverFile('ch3_causeway') === 'ch3-causeway.jpg' && existsSync(f) && statSync(f).size > 20000, 'causeway art')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/ch3-causeway.jpg'), 'causeway art cached offline')
const [bt, bb] = coverBand('ch3_causeway')
ok(bt === 0.2 && bb === 0.85, 'causeway band')

if (fails) { console.log(`v250: ${fails} failure(s)`); process.exit(1) }
console.log('v250 ok')

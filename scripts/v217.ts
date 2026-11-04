/** v217: Camp-04 sketch map — draws in as you explore, Overlook pickup, walk buttons. npx tsx scripts/v217.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { campSeen, drawnMap, HUB_MAPS, markCampSeen } from '../src/game/map.ts'
import { readFileSync } from 'node:fs'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const g0 = { ...newGame('prisoner' as never), hubId: 'camp04', sceneId: 'camp:cages' } as GameState
let s = markCampSeen(g0)
ok([...campSeen(s)].join() === 'pens', 'blank scrap starts with the Pens')
s = { ...s, sceneId: 'camp:overlook' }
const take = visibleChoices(s).find((c) => c.id === 'take-map')
ok(take?.label === 'Take the camp map' && take?.sub === 'Pinned under a rock.', 'pickup button copy')
s = applyEffect(s, take!.effects)
ok(s.flash === 'A charcoal scrap of the whole camp. Every road is on it.', 'pickup message')
ok(drawnMap(s)!.nodes.length === HUB_MAPS.camp04.nodes.length, 'pickup reveals the whole camp')
ok(visibleChoices({ ...g0, sceneId: 'camp:guard' } as GameState).some((c) => c.id === 'walk-vents'), 'walk buttons before the map')
ok(readFileSync('src/game/scavenge.ts', 'utf8').includes('Wire. Bent nail.'), 'bent nail')
ok(readFileSync('src/version.ts', 'utf8').includes("'v217'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v217'"), 'build v217')
console.log(fails ? `v217: ${fails} FAIL` : 'v217: all pass')
process.exit(fails ? 1 : 0)

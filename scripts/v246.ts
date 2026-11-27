/** v246: open-gate Crosshaven Fringe text and new Sable tent art. */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { newGame, sceneProse } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v259'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v259'"), 'build v253')

const CLOSED = "The noise of the perimeter drops behind you, replaced by the low hum of Crosshaven's outer filters. Lantern light cuts through the grease-haze on the shanties. You've made it off the flats, but the inner gates are locked tight."
const OPEN = 'The noise of the perimeter drops behind you. The portcullis hangs high on its rusted drum, and the way in stands open.'
const g = newGame('outcast')
const at = (flags: GameState['flags']): GameState => ({ ...g, sceneId: 'ch3:crosshaven', hubId: 'barrow', flags: { ...g.flags, ch3Out: true, ...flags } } as GameState)
ok(sceneProse(at({})) === CLOSED, 'closed Fringe body unchanged')
ok(sceneProse(at({ crosshavenCablesCut: true })) === CLOSED, 'cables cut, gate shut: closed body')
ok(sceneProse(at({ crosshavenCablesCut: true, crosshavenGateOpen: true })) === OPEN, 'open Fringe body')

const f = 'public/covers/p1-sable-tent.jpg'
ok(existsSync(f) && statSync(f).size > 20000, 'Sable tent art exists')
const b = readFileSync(f)
ok(b.readUInt16BE(0) === 0xffd8, 'Sable tent art is jpg')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/p1-sable-tent.jpg'), 'Sable art cached offline')
const sk = playCoverKey({ ...g, sceneId: 'spine:sable', hubId: 'spine' } as GameState, getScene('spine:sable'))
ok(sk === 'p1_sable_tent' && playCoverFile(sk) === 'p1-sable-tent.jpg', 'spine:sable shows Sable tent art')

if (fails) { console.log(`v246: ${fails} failure(s)`); process.exit(1) }
console.log('v246 ok')

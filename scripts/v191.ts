/** v191: Prisoner opening art. npx tsx scripts/v191.ts */
import { readFileSync, existsSync } from 'node:fs'
import { newGame } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { playCoverKey } from '../src/game/art.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v191'"), 'SW cache v191')
ok(readFileSync('src/version.ts', 'utf8').includes("'v191'"), 'Build label v191')
ok(existsSync('public/covers/prisoner-opening.jpg'), 'opening art file')
const p = newGame('prisoner')
ok(playCoverKey({ ...p, sceneId: 'open:prisoner' }, getScene('open:prisoner')) === 'prisoner_opening', 'open:prisoner -> opening art')
ok(playCoverKey({ ...p, sceneId: 'camp:cages' }, getScene('camp:cages')) === 'holding_cells', 'camp:cages -> holding cells')
console.log(fails ? `v191: ${fails} fail(s)` : 'v191: ok')
if (fails) process.exit(1)

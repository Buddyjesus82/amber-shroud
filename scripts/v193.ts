/** v193: Offering Bowl description. npx tsx scripts/v193.ts */
import { readFileSync } from 'node:fs'
import { ITEMS } from '../src/game/content/index.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v193')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v193')
ok(ITEMS.offering_bowl?.desc === 'A cracked clay offering bowl from the stair rubble. You notice a sticky amber residue in the bottom. It could hold a Drop.', 'Offering Bowl description')
console.log(fails ? `v193: ${fails} fail(s)` : 'v193: ok')
if (fails) process.exit(1)

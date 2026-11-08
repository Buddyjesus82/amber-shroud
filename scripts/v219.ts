/** v219: skiff fight, wrench, Shock Baton, Seeker Extractor. Build label. npx tsx scripts/v219.ts */
import { readFileSync } from 'node:fs'
import { ITEMS } from '../src/game/content/catalog.ts'
import { BATON_SKIP_LINE, BATON_STUN_LINE, PIERCE_LINE, SKIFF_HULL_LINE } from '../src/game/v203Lines.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v226'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v226'"), 'build v219')
ok(ITEMS.wrench.strike === 4 && ITEMS.wrench.twoHanded === true && !ITEMS.wrench.offhand, 'wrench Strike 4, two-handed')
ok(ITEMS.ironwood_baton.strike === 3, 'Shock Baton Strike 3')
ok(ITEMS.seeker_extractor.strike === 5 && ITEMS.seeker_extractor.desc.includes(PIERCE_LINE), 'Seeker Extractor Strike 5, Piercing')
ok(SKIFF_HULL_LINE === 'Hardened Hull: plain melee damage capped at 1.', 'hull line')
ok(BATON_STUN_LINE === 'Stun: the runner skips the next action.' && BATON_SKIP_LINE === 'The runner skips this action.', 'stun lines')

console.log(fails ? `v219: ${fails} FAIL` : 'v219: all pass')
process.exit(fails ? 1 : 0)

/** v218: heat relief (bribe, Lay Low, Clean Passage runner), Barrow caches. npx tsx scripts/v218.ts */
import { readFileSync } from 'node:fs'
import { BARROW_CACHE_SCENES } from '../src/game/heatRelief.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(BARROW_CACHE_SCENES.size === 5, 'five barrow caches')
ok(readFileSync('src/version.ts', 'utf8').includes("'v231'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v231'"), 'build v218')
console.log(fails ? `v218: ${fails} FAIL` : 'v218: all pass')
process.exit(fails ? 1 : 0)

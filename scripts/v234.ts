/** v234: Court Guard art redrawn so he grips the falchion by the handle. */
import { readFileSync, statSync } from 'node:fs'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v236'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v236'"), 'build v234')
ok(readFileSync('src/game/art.ts', 'utf8').includes("courtguard: 'courtguard.jpg'"), 'court guard art still mapped')
ok(statSync('public/covers/courtguard.jpg').size > 20000, 'court guard art present')

if (fails) { console.log(`v234: ${fails} failure(s)`); process.exit(1) }
console.log('v234 ok')

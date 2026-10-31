/** v177: Prisoner opening names Oil-Tooth again; new holding-cells art. npx tsx scripts/v177.ts */
import { readFileSync, statSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const o = readFileSync('src/game/content/openings.ts', 'utf8')
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v180'"), 'SW cache v177')
ok(readFileSync('src/version.ts', 'utf8').includes("'v180'"), 'Build label v177')
ok(o.includes('Jaxson "Oil-Tooth" Vance is hollering from the next bunk'), 'opening names Oil-Tooth')
ok(o.includes("label: 'Sit up. Acknowledge Oil-Tooth.'"), 'button names Oil-Tooth')
ok(statSync('public/covers/holding-cells.jpg').size > 20000, 'art present')
if (fails) { console.log(`v177: ${fails} fail`); process.exit(1) } else console.log('v177 ok')

/** v178: quiet holding-cells backdrop (Jaxson alone, still). npx tsx scripts/v178.ts */
import { readFileSync, statSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v178')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v178')
ok(statSync('public/covers/holding-cells.jpg').size > 20000, 'art present')
if (fails) { console.log(`v178: ${fails} fail`); process.exit(1) } else console.log('v178 ok')

/** v189: End of Chapter One card text. npx tsx scripts/v189.ts */
import { readFileSync } from 'node:fs'
import { redMawScenes } from '../src/game/content/redMaw.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v189')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v189')
const body = redMawScenes.find((s) => s.id === 'ch1:end')?.body ?? ''
ok(body.includes('Chapter One ends here. Continue to go down into the Maw.'), 'new End card line')
ok(!/More of the story is coming|keep playing from the Rim/.test(body), 'old text gone')
console.log(fails ? `v189: ${fails} fail(s)` : 'v189: ok')
if (fails) process.exit(1)

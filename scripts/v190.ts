/** v190: End of Chapter One Continue sub-label. npx tsx scripts/v190.ts */
import { readFileSync } from 'node:fs'
import { redMawScenes } from '../src/game/content/redMaw.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v195'"), 'SW cache v190')
ok(readFileSync('src/version.ts', 'utf8').includes("'v195'"), 'Build label v190')
const c = redMawScenes.find((s) => s.id === 'ch1:end')?.choices.find((x) => x.id === 'continue')
ok(c?.sub === 'Go down into the Maw.', 'Continue sub-label')
console.log(fails ? `v190: ${fails} fail(s)` : 'v190: ok')
if (fails) process.exit(1)

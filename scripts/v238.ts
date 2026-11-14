/** v238: Sable's join line after her waves carries her name, so it can't read as the beaten collector talking. */
import { readFileSync } from 'node:fs'
import { SABLE_WON_LINE } from '../src/game/encounterLines.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v239'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v239'"), 'build v238')
ok(SABLE_WON_LINE.startsWith('Sable Varn: "Nice footwork.'), 'join line names Sable Varn')
ok(readFileSync('src/game/encounter.ts', 'utf8').includes('\\n\\n${SABLE_WON_LINE}'), 'join line sits on its own paragraph')

if (fails) { console.log(`v238: ${fails} failure(s)`); process.exit(1) }
console.log('v238 ok')

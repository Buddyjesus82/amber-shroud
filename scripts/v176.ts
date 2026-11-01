/** v176: three hands, three rescues; the fourth fall ends the run at once. npx tsx scripts/v176.ts */
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const e = readFileSync('src/game/engine.ts', 'utf8')
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v196'"), 'SW cache v176')
ok(readFileSync('src/version.ts', 'utf8').includes("'v196'"), 'Build label v176')
ok(e.includes('if (handsLeft(next) > 0) next.hands = handsLeft(next) - 1') && e.includes("handsLeft(next) <= 0) {"), 'run ends only on a fall at 0 hands')
ok(readFileSync('src/components/PlayScreen.tsx', 'utf8').includes('the next fall ends the run'), '0 hands reads as last chance')
if (fails) { console.log(`v176: ${fails} fail`); process.exit(1) } else console.log('v176 ok')

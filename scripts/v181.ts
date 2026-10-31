/** v181: no-Murch lift art. npx tsx scripts/v181.ts */
import { readFileSync, existsSync } from 'node:fs'
import { chapterTwoFromCode, sceneOf } from '../src/game/engine.ts'
import { playCoverKey, playCoverFile } from '../src/game/art.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v188'"), 'SW cache v181')
ok(readFileSync('src/version.ts', 'utf8').includes("'v188'"), 'Build label v181')
const v = chapterTwoFromCode('vessel')
const k = (flags: object) => { const s = { ...v, sceneId: 'ch2:ribs', flags: { ...v.flags, ...flags } } as GameState; return playCoverKey(s, sceneOf(s)) }
ok(k({ liftDone: true, murchProtected: true, murchShop: 'full' }) === 'ch2_s_ribs_lift', 'Murch ran it: Murch art')
ok(k({ liftDone: true, murchProtected: true }) === 'ch2_s_ribs_lift_solo', 'forced by hand: solo art')
ok(k({ liftDone: true }) === 'ch2_s_ribs_lift_solo', 'no Murch: solo art')
ok(k({ liftDone: true, liftLadder: true }) === 'ch2_s_ribs', 'ladder: old art')
ok(existsSync('public/covers/ch2-ribs-lift-solo.jpg') && /ch2-ribs-lift-solo/.test(playCoverFile('ch2_s_ribs_lift_solo')), 'solo file')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v181 ok')

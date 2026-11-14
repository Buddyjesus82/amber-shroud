/** v236: Stray Heat 8 on the Spine brings Nim every 4 scenes, not every 2. */
import { readFileSync } from 'node:fs'
import { newGame, noticeHunt, SPINE_TOP_HEAT_GAP, huntGap } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v238'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v238'"), 'build v236')
ok(SPINE_TOP_HEAT_GAP === 4, 'Spine Heat 8 gap is 4')
ok(huntGap(8) === 2, 'other grounds keep their Heat 8 pace')
ok(/heat >= 8 && spineGround\(state\)\) gap = Math\.max\(gap, SPINE_TOP_HEAT_GAP\)/.test(readFileSync('src/game/engine.ts', 'utf8')), 'Spine hunt uses the 4-scene gap')

const base = newGame('outcast')
const spine = (quiet: number): GameState => ({ ...base, hubId: 'spine', sceneId: 'spine:well', heat: { ...base.heat, strays: 8 }, flags: { ...base.flags, huntQuiet: quiet } })
ok(!noticeHunt(spine(1)).flags.hunterHere, 'notice at Heat 8 waits when only 1 quiet scene passed')
ok(!noticeHunt(spine(3)).flags.hunterHere, 'notice at Heat 8 waits at 3 quiet scenes')
ok(!!noticeHunt(spine(4)).flags.hunterHere, 'notice at Heat 8 hunts after 4 quiet scenes')

if (fails) { console.log(`v236: ${fails} failure(s)`); process.exit(1) }
console.log('v236 ok')

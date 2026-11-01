/** v182: retest fixes. npx tsx scripts/v182.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, bodyOf, visibleChoices, applyEffect } from '../src/game/engine.ts'
import { fightStartFlags, resolveEncounter } from '../src/game/encounter.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v193'"), 'SW cache v182')
ok(readFileSync('src/version.ts', 'utf8').includes("'v193'"), 'Build label v182')
const v = chapterTwoFromCode('vessel')
const at = (flags: object) => ({ ...v, sceneId: 'ch2:ribs', flags: { ...v.flags, ...flags } }) as GameState
// 3: text follows the lift
for (const f of [{ liftDone: true, murchProtected: true, murchShop: 'full', vexFreed: true }, { liftDone: true }, { liftDone: true, liftLadder: true }]) {
  const b = bodyOf(at(f))
  ok(!/swearing|jammed/.test(b), `no dead-lift lines ${JSON.stringify(f)}`)
}
ok(bodyOf(at({ liftDone: true })).includes('The lift is ready.'), 'lift ready line')
const lad = bodyOf(at({ liftDone: true, liftLadder: true }))
ok(!lad.includes('The lift is ready') && lad.includes('emergency ladder'), 'ladder text: no ready lift')
ok(/hangs dead/.test(bodyOf(at({}))), 'before: dead lift')
// 4: Descend shows with the lift, locked until Vex is settled
const pend = visibleChoices(at({ liftDone: true, vexFreed: true }))
const ride = pend.find((c) => c.id === 'ride')
ok(ride && ride.enable && ride.locked === 'Vex is still at the vein.', 'Descend shown, locked by Vex')
ok(visibleChoices(at({ liftDone: true, vexFreed: true, vexFate: 'scout' })).some((c) => c.id === 'ride'), 'Descend after Vex')
// 2: a mutual-win log says why you stand
let seen = 0
for (let t = 0; t < 200; t++) {
  const b = { ...v, sceneId: 'ch2:v-blown', ticks: t, health: 1 } as GameState
  const s = { ...b, flags: { ...b.flags, ...fightStartFlags(b, 'seekerpatrol') } } as GameState
  const r = resolveEncounter(s, 'fight')
  const card = String(r.fx.flag?.encounterClash ?? '')
  const after = applyEffect(s, r.fx)
  if (/hits (back|you) for [1-9]/.test(card) && after.health > 0) { seen++; ok(/you drop .* first\./.test(card), `log matches survival t${t}`) }
}
ok(seen > 0, 'mutual win sampled')
// 6: the drill line alone is not held
ok(/DRILL_LINES as readonly string\[\]\)\.includes\(next\.flash/.test(readFileSync('src/components/PlayScreen.tsx', 'utf8')), 'clock line not held')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v182 ok')

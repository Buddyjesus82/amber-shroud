/** v184: no Map back to Chapter One in Chapter Two. npx tsx scripts/v184.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, visibleChoices, applyEffect, interpret, travelTo, CH2_BACKTRACK } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v186'"), 'SW cache v184')
ok(readFileSync('src/version.ts', 'utf8').includes("'v186'"), 'Build label v184')
ok(CH2_BACKTRACK === 'The upper wash is behind you. The descent only goes deeper.', 'exact line')
const v = chapterTwoFromCode('vessel')
let s = applyEffect(v, visibleChoices(v)[0].effects)
ok(s.flags.ch2Started, 'ch2Started set on entering Chapter Two')
const at = (sceneId: string, flags: object = {}) => ({ ...s, sceneId, hubId: 'redmaw', flags: { ...s.flags, ...flags } }) as GameState
const pick = (x: GameState, id: string) => applyEffect(x, visibleChoices(x).find((c) => c.id === id)!.effects)
// Map clicks to Chapter One Red Maw places stay put
for (const from of ['ch2:approach', 'ch2:v-outpost']) {
  const t = travelTo(at(from), 'maw:gate')
  ok(t.sceneId === from && t.flash === CH2_BACKTRACK, `map blocked from ${from}`)
}
const mk = pick(at('ch2:v-outpost'), 'market')
ok(mk.sceneId === 'maw:market', 'Vessel market row')
const t2 = travelTo(mk, 'maw:stilt'); ok(t2.sceneId === 'maw:market' && t2.flash === CH2_BACKTRACK, 'map blocked from Ch2 market')
const ty = interpret(mk, 'go to the stilt shade'); ok(ty.sceneId === 'maw:market', 'typed go-to blocked from Ch2 market')
ok(pick(mk, 'back-ch2').sceneId === 'ch2:v-outpost', 'Back still works')
ok(interpret(at('ch2:v-outpost'), 'go to the bone market').sceneId === 'maw:market', 'typed Vessel market row still works')
ok(/chapterTwoLocked\(state\) \?/.test(readFileSync('src/components/MapSheet.tsx', 'utf8')), 'Map sheet shows no Ch1 places in Ch2')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v184 ok')

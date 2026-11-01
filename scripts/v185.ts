/** v185: run-4 Chapter Two bug fixes. npx tsx scripts/v185.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, visibleChoices, applyEffect, sceneOf } from '../src/game/engine.ts'
import { resolveBody } from '../src/game/content/index.ts'
import { playCoverKey } from '../src/game/art.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v198'"), 'SW cache v185')
ok(readFileSync('src/version.ts', 'utf8').includes("'v198'"), 'Build label v185')
const v = chapterTwoFromCode('vessel')
const s = applyEffect(v, visibleChoices(v)[0].effects)
const at = (sceneId: string, flags: object = {}) => ({ ...s, sceneId, flags: { ...s.flags, ...flags } }) as GameState
const ids = (x: GameState) => visibleChoices(x).map((c) => c.id)
const pick = (x: GameState, id: string) => applyEffect(x, visibleChoices(x).find((c) => c.id === id)!.effects)
// #2 cup passed: no Cover Blown
const p = pick(at('ch2:cache', { spireKey: true, cupPassed: true }), 'back')
ok(p.sceneId === 'ch2:v-blown' && !p.flags.coverBlown, 'cup passed keeps cover')
ok(sceneOf(p).title === 'The Drill Line' && !resolveBody(sceneOf(p), (c) => !c || ('flagUnset' in c && !p.flags[(c as {flagUnset: string}).flagUnset])).includes('False cup'), 'no False cup after passing')
const f = pick(at('ch2:cache', { spireKey: true }), 'back')
ok(f.flags.coverBlown && sceneOf(f).title === 'Cover Blown', 'still blown without the cup')
// #3 outpost rows keep their own rules
const o = ids(at('ch2:v-outpost', { coverBlown: true, murchProtected: true }))
ok(o.includes('greg') && o.includes('bleed') && o.includes('garden'), 'gate/bleed/garden stay after cover blown')
ok(!ids(at('ch2:v-outpost', { statueSiphoned: true, vexFreed: true, gregDealt: true })).some((i) => ['greg', 'bleed', 'garden'].includes(i)), 'rows still close on their own flags')
// #5 Valerius
ok(!sceneOf(at('ch2:v-test', { valeriusMoved: true, cupFailed: true })).body.includes('moved on'), 'still there after a loss')
// #6 Ribs art
ok(playCoverKey(at('ch2:ribs'), sceneOf(at('ch2:ribs'))) === 'ch2_s_ribs_lift_solo', 'solo art when nobody works')
// #8 forced gear -> Descend
const g = pick(at('ch2:ribs', { murchProtected: true }), 'force')
ok(ids(g).includes('ride') && !ids(g).includes('climb'), 'forced gear shows Descend the lift')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v185 ok')

/** v186: chapter release switch + Vessel cup-test fallbacks. npx tsx scripts/v186.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, visibleChoices, applyEffect, newGame, CHAPTER_ONE_END } from '../src/game/engine.ts'
import { RELEASED_CHAPTERS } from '../src/game/chapters.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v193'"), 'SW cache v186')
ok(readFileSync('src/version.ts', 'utf8').includes("'v193'"), 'Build label v186')
// 1 release switch (v187: Chapter Two released): End card Continue opens Chapter Two in place
ok(RELEASED_CHAPTERS.two === true, 'Chapter Two released')
const end = { ...newGame('vessel'), sceneId: CHAPTER_ONE_END, flags: { ...newGame('vessel').flags, chapter1EndSeen: true } } as GameState
const cont = applyEffect(end, visibleChoices(end).find((c) => c.id === 'continue')!.effects)
ok(!!cont.flags.chapter2Unlocked, 'released: Continue opens Chapter Two')
// 2 fallbacks
const v = chapterTwoFromCode('vessel')
const s = applyEffect(v, visibleChoices(v)[0].effects)
const at = (flags: object, inv: Record<string, number> = {}) => ({ ...s, sceneId: 'ch2:v-test', items: { ...inv }, flags: { ...s.flags, ...flags } }) as unknown as GameState
const ids = (x: GameState) => visibleChoices(x).map((c) => c.id)
const pick = (x: GameState, id: string) => applyEffect(x, visibleChoices(x).find((c) => c.id === id)!.effects)
ok(!ids(at({})).includes('vent') && !ids(at({})).includes('siphon-trick'), 'hidden before a failed test')
ok(!ids(at({ cupFailed: true }, { vial_drop: 1 })).includes('vent'), 'hidden while a vial can still pass')
const stuck = at({ cupFailed: true }, { scrap: 2 })
ok(ids(stuck).includes('vent') && ids(stuck).includes('siphon-trick'), 'shown with no pass route left')
const vent = pick(stuck, 'vent')
ok(vent.sceneId === 'ch2:v-stair' && vent.flags.cupPassed && vent.items.scrap === 1, 'vent costs a scrap and lands on the stair')
const tool = pick(at({ cupFailed: true }, { maw_plate: 1 }), 'vent')
ok(tool.sceneId === 'ch2:v-stair' && tool.health === stuck.health, 'vent free with heavy gear')
const tr = pick(stuck, 'siphon-trick')
ok(tr.flags.cupPassed && tr.heat.seekers === (stuck.heat.seekers ?? 0) + 1, 'siphoned trick passes, Seeker Heat +1')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v186 ok')

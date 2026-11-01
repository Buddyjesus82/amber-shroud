/** v187: Vessel run fixes + Chapter Two released. npx tsx scripts/v187.ts */
import { readFileSync } from 'node:fs'
import { visibleChoices, applyEffect, newGame, CHAPTER_ONE_END } from '../src/game/engine.ts'
import { RELEASED_CHAPTERS } from '../src/game/chapters.ts'
import { MASKED_TOLL_LINE } from '../src/game/maskedLines.ts'
import { gearLookLine } from '../src/game/kit.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v197'"), 'SW cache v187')
ok(readFileSync('src/version.ts', 'utf8').includes("'v197'"), 'Build label v187')
ok(RELEASED_CHAPTERS.two === true, 'Chapter Two released')
const pick = (x: GameState, id: string) => applyEffect(x, visibleChoices(x).find((c) => c.id === id)!.effects)
// Release: Continue opens Chapter Two in place, every door; siphon comes with it
for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const g = newGame(door)
  const end = { ...g, sceneId: CHAPTER_ONE_END, flags: { ...g.flags, chapter1Done: true, chapter1EndSeen: true } } as GameState
  const c = pick(end, 'continue')
  ok(c.flags.chapter2Unlocked && c.sceneId !== 'maw:rim', `${door}: Continue opens Chapter Two (${c.sceneId})`)
  ok((c.items.memory_siphon ?? 0) === 1, `${door}: siphon with Chapter Two`)
}
// #2 siphon not granted by finishing Chapter One alone
{
  const g = newGame('vessel')
  const a = { ...g, sceneId: 'maw:rim', hubId: 'redmaw', flags: { ...g.flags, chapter1EndSeen: true } } as GameState
  const b = applyEffect(a, { flag: { chapter1Done: true } })
  ok(!b.items.memory_siphon, 'no siphon from chapter1Done alone')
}
// #3 Strider ready: no roaming fight
{
  const g = newGame('vessel')
  for (let i = 0; i < 20; i++) {
    const a = { ...g, sceneId: 'thresh:paddock', hubId: 'threshold', items: { ...g.items, strider_bit: 1 }, sap: 6, heat: { ...g.heat, seekers: 5 }, flags: { ...g.flags, roadFightSeen: true, seedBump: i } } as unknown as GameState
    const r = pick(a, 'ready')
    ok(r.flags.striderReady && !r.flags.encounterHere && r.sceneId === 'thresh:paddock', `ready is quiet (${i})`)
  }
}
// #4 Sealed Way climb-back sets holdClimbed; repeat climb draws no fight
{
  const g = newGame('vessel')
  const a = { ...g, sceneId: 'maw:hold', hubId: 'redmaw', flags: { ...g.flags, chapter1EndSeen: true, rimRoadSeen: true, holdClimbed: true } } as GameState
  for (let i = 0; i < 10; i++) ok(!pick({ ...a, flags: { ...a.flags, seedBump: i } } as GameState, 'back').flags.encounterHere, `repeat climb no fight ${i}`)
  ok(pick({ ...a, flags: { ...a.flags, holdClimbed: undefined } } as GameState, 'back').flags.holdClimbed, 'first climb marks')
}
ok(/ONCE_GEAR/.test(readFileSync('src/game/encounter.ts', 'utf8')), 'gear drops once')
// #5 Brin's pour shown without a Drop, locked
{
  const g = newGame('vessel')
  const a = { ...g, sceneId: 'ch1:v-runners', items: {} } as GameState
  const c = visibleChoices(a).find((x) => x.id === 'pour')
  ok(c && c.locked === 'Needs: a Drop', 'pour shown, locked')
}
// #7 toll attributed
ok(MASKED_TOLL_LINE === 'The masked figure takes one scrap from your pack and leaves a Drop in its place. You never felt it.', 'toll line')
// #8 off-hand shiv reads +1
{
  const g = newGame('vessel')
  const a = { ...g, items: { ...g.items, shiv: 2 }, equipped: { ...g.equipped, weapon: 'shiv', offhand: 'shiv' } } as GameState
  ok(gearLookLine(a).includes('Blood Shiv (Strike +1)'), 'look line off-hand +1')
}
ok(readFileSync('src/game/helpTopics.ts', 'utf8').includes('Shell tops out at 4; Shell 5 opens past the Maw.'), 'help Shell cap')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v187 ok')

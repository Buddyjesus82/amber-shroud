/** v183: gully horn, turret run, Vessel market/stilt. npx tsx scripts/v183.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, bodyOf, visibleChoices, applyEffect, interpret } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v183')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v183')
const v = chapterTwoFromCode('vessel')
const at = (sceneId: string, items: object = {}, flags: object = {}) => ({ ...v, sceneId, health: 10, items: { ...v.items, ...items }, flags: { ...v.flags, ...flags } }) as GameState
const pick = (s: GameState, id: string) => applyEffect(s, visibleChoices(s).find((c) => c.id === id)!.effects)
// 1: no Miller in the gully
const raw = at('ch2:gully', { cartel_transponder: 0 })
ok(!/Miller/.test(bodyOf(raw)), 'gully body')
for (const c of visibleChoices(raw)) ok(!/Miller/.test(JSON.stringify(c)), `gully row ${c.id}`)
const spl = at('ch2:gully', { cartel_transponder: 1 })
for (const c of visibleChoices(spl)) ok(!/Miller/.test(JSON.stringify(c)), `gully splice row ${c.id}`)
// 2: raw run is severe; with the splice it is as before
const r = pick(raw, 'run'); ok(r.health === 4 && r.heat.cartel === raw.heat.cartel + 3, 'raw run −6 / +3')
const r2 = pick(spl, 'run'); ok(r2.health === 6 && r2.heat.cartel === spl.heat.cartel + 2, 'spliced run −4 / +2')
// 3: Vessel market and stilt, there and back
for (const from of ['ch2:v-outpost', 'ch2:v-stair']) {
  for (const [id, to] of [['market', 'maw:market'], ['stilt', 'maw:stilt']]) {
    const s = pick(at(from), id); ok(s.sceneId === to, `${from} -> ${to}`)
    const b = pick(s, 'back-ch2'); ok(b.sceneId === from, `${to} back -> ${from}`)
  }
  for (const [w, to] of [['bone market', 'maw:market'], ['go to the market', 'maw:market'], ['where is ossa', 'maw:stilt'], ['stilt', 'maw:stilt'], ['ossa', 'maw:stilt']]) ok(interpret(at(from), w).sceneId === to, `${from} typed '${w}'`)
}
ok(!visibleChoices(at('maw:market')).some((c) => c.id === 'back-ch2'), 'Ch1 market unchanged')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v183 ok')

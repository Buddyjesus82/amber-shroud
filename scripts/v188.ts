/** v188: Sealed Way forward, stub bypass, Ossa on Vessel, tick Drop once, Vessel Drop, Sybella push, Vessel label. npx tsx scripts/v188.ts */
import { readFileSync } from 'node:fs'
import { visibleChoices, applyEffect, newGame, CHAPTER_ONE_END } from '../src/game/engine.ts'
import { DOORS } from '../src/game/content/catalog.ts'
import { VOICES } from '../src/game/voices.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v196'"), 'SW cache v188')
ok(readFileSync('src/version.ts', 'utf8').includes("'v196'"), 'Build label v188')
const pick = (x: GameState, id: string) => { const c = visibleChoices(x).find((c) => c.id === id); ok(c, `choice ${id} on ${x.sceneId}`); return applyEffect(x, c!.effects) }
const at = (door: 'vessel' | 'prisoner' | 'outcast', sceneId: string, flags: Record<string, unknown> = {}, items: Record<string, number> = {}) => {
  const g = newGame(door)
  return { ...g, sceneId, hubId: 'redmaw', items: { ...g.items, ...items }, flags: { ...g.flags, chapter1EndSeen: true, rimRoadSeen: true, ...flags } } as GameState
}
// #1 Sealed Way forward
ok(pick(at('vessel', 'maw:hold'), 'down').sceneId === CHAPTER_ONE_END, 'hold: Ch1 not done -> Ch1 end')
{ const r = pick(at('vessel', 'maw:hold', { chapter1Done: true }), 'down'); ok(r.sceneId === 'ch2:gate' && r.flags.chapter2Unlocked, 'hold: Ch1 done -> Ch2 gate') }
ok(pick(at('vessel', 'maw:hold', { chapter1Done: true, chapter2Unlocked: true }), 'down').sceneId === 'ch2:gate', 'hold: unlocked -> gate')
ok(pick(at('vessel', 'maw:hold'), 'back').sceneId !== 'maw:hold', 'hold: climb back still there')
ok(pick(at('vessel', 'maw:rim', { ribOpen: true, chapter1Done: true }), 'hold').sceneId === 'ch2:gate', 'gear-marked rib -> forward')
// #2 stub never shown
for (const f of [{}, { chapter1Done: true }, { chapter1Done: true, chapter2Unlocked: true }]) ok(applyEffect(at('outcast', 'maw:rim', f), { goto: 'ch2:stub' }).sceneId !== 'ch2:stub', 'stub bypassed')
ok(!readFileSync('src/game/look.ts', 'utf8').includes('as far as this road is written'), 'stub look gone')
// #3 Ossa on Vessel
ok(VOICES.ossa.want.includes('twice'), 'robbed line kept')
{
  const a = at('vessel', 'maw:ossa', { ossaAlly: true })
  const d = pick(a, 'day-vessel')
  ok(d.sceneId === 'maw:ossa-day' && d.flags.ossaStillness, 'Vessel reaches The Day')
  const e = pick(d, 'back-knot')
  ok((e.items.ossa_token ?? 0) === 1 && e.flags.ossaToldDay, 'Vessel earns the Knot')
  ok(!visibleChoices(at('vessel', 'maw:ossa', { ossaRobbed: true })).some((c) => c.id === 'day-vessel'), 'robbed Vessel: no Day')
  ok(!visibleChoices(at('prisoner', 'maw:ossa')).some((c) => c.id === 'day-vessel'), 'Vessel-only path')
}
ok(readFileSync('src/game/politeAsk.ts', 'utf8').includes('ossaRobbed'), 'twice line gated on ossaRobbed')
// #4 tick
{ const s = readFileSync('src/game/encounter.ts', 'utf8'); ok(s.includes("state.flags.tickDropped ? { scrap: 1 }") && s.includes('tickDropped: true'), 'tick Drop once') }
// #5 Vessel Drop on hymn-road
{
  const a = at('vessel', 'ch1:v-hymn', {}, {})
  const r = pick(a, 'scrape')
  ok((r.items.vial_drop ?? 0) === (a.items.vial_drop ?? 0) + 1 && r.sceneId === 'ch1:v-hymn' && !r.flags.encounterHere, 'hymn Drop')
  ok(!visibleChoices(r).some((c) => c.id === 'scrape'), 'hymn Drop once')
}
// #6 Sybella push open sand
{ const s = readFileSync('src/game/content/cacheRun.ts', 'utf8'); ok(s.includes('run for the open sand past her skiff') && !s.includes('choked bulkhead'), 'open-sand push') }
// #7
ok(DOORS.vessel.role === 'Vessel', 'Vessel label')
console.log(fails ? `v188: ${fails} fail(s)` : 'v188: ok')
if (fails) process.exit(1)

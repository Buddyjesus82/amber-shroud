/** v195: Kaelen's grate escape (Prisoner) and Jaxson's road reunion. npx tsx scripts/v195.ts */
import { readFileSync, existsSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { ITEMS } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v195'"), 'SW cache v195')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/jaxson-reunion.jpg'), 'reunion cover precached')
ok(existsSync('public/covers/jaxson-reunion.jpg'), 'reunion cover file')
ok(readFileSync('src/version.ts', 'utf8').includes("'v195'"), 'Build label v195')
ok(ITEMS.wire_cutter_shim?.desc === 'An improvised scrap shim Kaelen filed down for the perimeter wire.', 'shim desc')
const at = (sceneId: string, flags: Record<string, unknown>, door: 'prisoner' | 'outcast' = 'prisoner', pressure = 0): GameState => {
  const g = newGame(door)
  return { ...g, hubId: 'camp04', sceneId, pressure, flags: { ...g.flags, noMasked: true, ...flags } } as GameState
}
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const pick = (s: GameState, id: string) => { const c = visibleChoices(s).find((x) => x.id === id); ok(c, `${s.sceneId}: ${id} visible (${ids(s)})`); return c ? applyEffect(s, c.effects) : s }
// Availability.
ok(!ids(at('camp:kaelen', {})).includes('grate'), 'no grate at calm with no plan')
ok(ids(at('camp:kaelen', { jaxsonPlan: true })).includes('grate'), 'grate after Jaxson plan')
ok(ids(at('camp:kaelen', {}, 'prisoner', 8)).includes('grate'), 'grate at pressure 8')
ok(!ids(at('camp:kaelen', { jaxsonPlan: true, guardDown: true })).includes('grate'), 'no grate once guard down')
ok(!ids(at('camp:kaelen', { jaxsonPlan: true, striderHot: true })).includes('grate'), 'no grate once runner hot')
ok(!ids(at('camp:kaelen', { jaxsonPlan: true }, 'outcast')).includes('grate'), 'outcast untouched')
// Escape with the guard up.
let s = at('camp:kaelen', { jaxsonPlan: true })
const heat0 = s.heat.cartel
s = pick(s, 'grate')
ok(s.sceneId === 'ch1:storm' && s.chapterId === 'cache-run', `grate leaves through the storm (${s.sceneId})`)
ok(s.heat.cartel === heat0 + 2, `Cartel Heat +2 (${heat0}→${s.heat.cartel})`)
ok(s.items.wire_cutter_shim === 1, 'shim granted')
ok(s.flags.kaelenEscape && s.flags.jaxsonCold && s.flags.hungerKnown && !s.flags.cacheBlind, 'escape flags')
s = pick(s, 'continue')
ok(s.sceneId === 'ch1:p-reunion', `reunion appears (${s.sceneId})`)
ok(ids(s).join() === 'kaelen,sorry', 'two reunion replies')
for (const id of ['kaelen', 'sorry']) {
  const r = pick(s, id)
  ok(r.sceneId === 'ch1:leave' && r.flags.striderHot && r.flags.jaxsonReunion, `${id}: on the runner to ch1:leave`)
  ok(String(r.flash).includes("We're outside the wire, that's what counts—but don't expect me to hold the door next time."), `${id}: Jaxson's reply`)
  ok(String(r.flash).includes('Kaelen pries the loose grate'), `${id}: grate flash carried`)
  ok(r.heat.cartel === heat0 + 2, `${id}: heat kept`)
  ok(ids(r).includes('go') || r.flags.encounterHere, `${id}: road continues (${ids(r)})`)
}
// Favors locked.
const cold = { jaxsonCold: true, jaxsonFavor: true, striderHot: true }
ok(!ids(at('camp:cages', cold)).includes('stash'), 'stash locked')
ok(!ids(at('camp:jaxson', cold)).includes('paid'), 'paid locked')
// Normal Jaxson route unchanged.
ok(ids(at('camp:cages', { jaxsonFavor: true })).includes('stash'), 'stash still there normally')
const storm = applyEffect(at('camp:forced', { guardDown: true, striderHot: true, hungerKnown: true }), { startChapter: 'cache-run', goto: 'ch1:leave' })
ok(ids(storm).join() === 'continue', 'normal storm has one Continue')
ok(pick(storm, 'continue').sceneId === 'ch1:leave', 'normal storm → ch1:leave')
console.log(fails ? `v195: ${fails} fail(s)` : 'v195: ok')
if (fails) process.exit(1)

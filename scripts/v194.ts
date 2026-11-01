/** v194: Prisoner camp wire exits need the guard station dropped; on foot costs more. npx tsx scripts/v194.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, visibleChoices, WIRE_BLOCKED } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v194')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v194')
ok(WIRE_BLOCKED === "The Overseer's tower is still live—searchlights cut the sand to ribbons. You can't break the wire until that station is dropped.", 'block line verbatim')
const at = (sceneId: string, flags: Record<string, unknown>): GameState => {
  const g = newGame('prisoner')
  return { ...g, hubId: 'camp04', sceneId, flags: { ...g.flags, noMasked: true, ...flags }, health: 6, sap: 8 } as GameState
}
const press = (s: GameState, id: string) => {
  const c = visibleChoices(s).find((x) => x.id === id)
  ok(c, `${s.sceneId}: ${id} visible`)
  return c ? applyEffect(s, c.effects) : s
}
const exits: [string, string, Record<string, unknown>][] = [
  ['camp:hunter', 'hunter-run', { hungerKnown: true, hunterHere: true }],
  ['camp:hunter', 'hunter-blind', { hunterHere: true }],
  ['camp:hunter', 'run', { hungerKnown: true, }],
  ['camp:hunter', 'blind', { }],
  ['camp:forced', 'go', { hungerKnown: true }],
  ['camp:forced', 'blind', {}],
]
for (const [scene, id, f] of exits) {
  // Guard up: choice stays, press blocks with the flash, nothing moves.
  const s0 = at(scene, f)
  const b = press(s0, id)
  ok(b.sceneId === scene && !b.chapterId && b.flash === WIRE_BLOCKED, `${scene}/${id}: guard up blocks`)
  ok(b.health === s0.health && b.sap === s0.sap && !b.flags.cacheBlind, `${scene}/${id}: block costs nothing`)
  // Guard down, no runner: leaves on foot, Health -3 and Sap -1 more than before.
  const s1 = at(scene, { ...f, guardDown: true })
  const a = press(s1, id)
  ok(a.chapterId === 'cache-run', `${scene}/${id}: guard down leaves`)
  const { wireExit: _w, ...plain } = visibleChoices(s1).find((x) => x.id === id)!.effects
  const base = applyEffect(s1, plain)
  ok(a.health === base.health - 3, `${scene}/${id}: Health -3 (${a.health} vs ${base.health})`)
  ok(a.sap === base.sap - 1, `${scene}/${id}: Sap -1 (${a.sap} vs ${base.sap})`)
  ok(String(a.flash).includes('Health -3. Sap -1.'), `${scene}/${id}: stat line`)
  // Guard down, runner hot: no extra cost.
  const s2 = at(scene, { ...f, guardDown: true, striderHot: true })
  const r = applyEffect(s2, visibleChoices(s2).find((x) => x.id === id)!.effects)
  ok(r.chapterId === 'cache-run' && r.health === s2.health && !String(r.flash ?? '').includes('Health -3'), `${scene}/${id}: runner hot, no attrition`)
}
// Other doors untouched.
{ const g = newGame('outcast'); const o = { ...g, hubId: 'camp04', sceneId: 'camp:forced', flags: { ...g.flags, hungerKnown: true } } as GameState
  ok(applyEffect(o, visibleChoices(o).find((c) => c.id === 'go')!.effects).chapterId === 'cache-run', 'outcast not gated') }
// Non-exit choices kept.
ok(visibleChoices(at('camp:forced', {})).some((c) => c.id === 'stay'), 'forced stay kept')
// Typed Do equivalents block too.
for (const cmd of ['hunger', 'gullet', 'run', 'take the gullet', 'break the wire anyway']) {
  for (const scene of ['camp:hunter', 'camp:forced']) {
    const t = interpret(at(scene, { hunterHere: true, hungerKnown: true }), cmd)
    ok(t.sceneId === scene && !t.chapterId, `typed "${cmd}" at ${scene} does not leave (${t.sceneId})`)
  }
}
// Jaxson's runner from the sweep still works with the guard down.
const j = at('camp:hunter', { hunterHere: true, hungerKnown: true, guardDown: true, striderHot: true, jaxsonInside: true, jaxsonPlan: true })
const ride = visibleChoices(j).find((c) => c.id === 'hunter-ride')
ok(ride, 'runner row on the sweep')
if (ride) { const r = applyEffect(j, ride.effects); ok(r.chapterId === 'cache-run' && r.health === j.health, 'Jaxson runner ride') }
console.log(fails ? `v194: ${fails} fail(s)` : 'v194: ok')
if (fails) process.exit(1)

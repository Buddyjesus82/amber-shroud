/** v192: End of Chapter One Continue always lands on the Approach. npx tsx scripts/v192.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { CH2_ENTRY } from '../src/game/content/intoTheMaw.ts'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v192'"), 'SW cache v192')
ok(readFileSync('src/version.ts', 'utf8').includes("'v192'"), 'Build label v192')
const cont = getScene('ch1:end').choices.find((c) => c.id === 'continue')!.effects
const cases: [string, Record<string, unknown>, number][] = [
  ['fresh', {}, 0],
  ['old, unlocked unset, siphon unset', { chapter1Done: true }, 0],
  ['old, unlocked unset, siphon set', { chapter1Done: true, siphonGot: true }, 1],
  ['old, unlocked set, siphon unset', { chapter1Done: true, chapter2Unlocked: true }, 0],
  ['old, unlocked set, siphon set', { chapter1Done: true, chapter2Unlocked: true, siphonGot: true }, 1],
  ['old, unlocked + ch2Started set', { chapter1Done: true, chapter2Unlocked: true, siphonGot: true, ch2Started: true }, 1],
]
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const [name, flags, had] of cases) {
    const g = newGame(door)
    const s: GameState = { ...g, sceneId: 'ch1:end', hubId: 'redmaw', flags: { ...g.flags, ...flags } as GameState['flags'], items: { ...g.items, ...(had ? { memory_siphon: 1 } : {}) } }
    const n = applyEffect(s, cont)
    ok(n.sceneId === CH2_ENTRY, `${door} ${name}: lands on ${CH2_ENTRY} (got ${n.sceneId})`)
    ok(n.flags.chapter2Unlocked && n.flags.ch2Started && n.flags.siphonGot, `${door} ${name}: flags`)
    ok(n.items.memory_siphon === 1, `${door} ${name}: exactly one Memory Siphon (got ${n.items.memory_siphon})`)
    for (const f of ['kalliksMark', 'thaliaDeal', 'sybellaSkiff']) ok(!(f in n.flags), `${door} ${name}: no ${f}`)
  }
}
// Scavenge the debris on the Stairs: once a run, 1 Scrap, 1 in 3 for a second.
{
  let seen1 = false, seen2 = false
  for (let t = 0; t < 30; t++) {
    const g = newGame('vessel')
    const s: GameState = { ...g, sceneId: 'thresh:stairs', ticks: t, items: { ...g.items, scrap: 0 } }
    const row = getScene('thresh:stairs').choices.find((c) => c.id === 'scavenge')!
    const n = applyEffect(s, row.effects)
    const got = n.items.scrap ?? 0
    ok(n.sceneId === 'thresh:stairs', 'scavenge stays on the Stairs')
    ok(n.flags.stairScavenged === true, 'scavenge sets stairScavenged')
    ok(got === 1 || got === 2, `scavenge gives 1 or 2 Scrap (got ${got})`)
    if (got === 1) { seen1 = true; ok(n.flash === 'You pull 1 Scrap from the rubble.\n\nYou pull an Offering Bowl from the rubble.', 'one-Scrap flash') }
    if (got === 2) { seen2 = true; ok(n.flash === 'You pull 1 Scrap from the rubble.\n\nYou pull an Offering Bowl from the rubble.\n\nYou pull 1 more Scrap from the rubble.', 'extra on its own line') }
    ok(n.items.offering_bowl === 1, 'scavenge gives the Offering Bowl')
    ok(n.flash?.includes('\n\nYou pull an Offering Bowl from the rubble.'), 'bowl line on its own line')
    ok(row.show && 'flagUnset' in row.show && row.show.flagUnset === 'stairScavenged', 'hidden after use')
  }
  ok(seen1 && seen2, 'both outcomes happen')
}
// Vessel run: Stairs -> bowl -> the cup test passes, the Drop spent into it.
{
  const g = newGame('vessel')
  const row = getScene('thresh:stairs').choices.find((c) => c.id === 'scavenge')!
  const got = applyEffect({ ...g, sceneId: 'thresh:stairs' }, row.effects)
  const again = visibleChoices(got).map((c) => c.id)
  ok(!again.includes('scavenge'), 'Scavenge the debris hidden after use')
  const atTest: GameState = { ...got, sceneId: 'ch2:v-test', hubId: null, chapterId: 'walking-amber', items: { ...got.items, vial_drop: 1 }, flags: { ...got.flags, chapter2Unlocked: true, ch2Started: true } }
  const vis = visibleChoices(atTest).map((c) => c.id)
  ok(vis.includes('bowl'), 'cup test offers the Offering Bowl')
  const bowl = getScene('ch2:v-test').choices.find((c) => c.id === 'bowl')!
  const passed = applyEffect(atTest, bowl.effects)
  ok(passed.flags.cupPassed === true, 'Offering Bowl passes the cup test')
  ok((passed.items.vial_drop ?? 0) === 0, 'the Drop is spent into the bowl')
  ok(passed.items.offering_bowl === 1, 'the bowl is kept')
  const noBowl: GameState = { ...atTest, items: { ...atTest.items, offering_bowl: 0 } }
  ok(!visibleChoices(noBowl).map((c) => c.id).includes('bowl'), 'no bowl, no bowl row')
}
console.log(fails ? `v192: ${fails} fail(s)` : 'v192: ok')
if (fails) process.exit(1)

/**
 * v158: stall scenes are safe from Heat-notice hunts; typed fights name the real hunter; a fight's end spends the next timing notice.
 *   npx tsx scripts/v158.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, noticeOn, scavenge, timingNotice, visibleChoices } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v165'"), 'SW cache v158')

const g = newGame('prisoner')
const at = (scene: string, cartel: number, extra: Record<string, unknown> = {}, ticks = 44): GameState => ({
  ...g, hubId: 'camp04', sceneId: scene, ticks, health: 6, sap: 8, heat: { ...g.heat, cartel },
  items: { ...g.items, wrench: 1, scrap: 6 }, equipped: { weapon: 'wrench' },
  flags: { ...g.flags, noMasked: true, jaxsonInside: true, guardDown: true, ...extra },
} as GameState)

// 1. Stall scenes: no notice, no hunt (scavenge or timing) at Heat 8. The Yard still hunts.
for (const scene of ['camp:jaxson', 'camp:jaxson-cache', 'camp:jaxson-drop', 'camp:lean']) {
  ok(!noticeOn(at(scene, 8)), `${scene} is not notice ground`)
  let hunted = false
  for (let t = 0; t < 40; t++) for (let k = 0; k < 5; k++) { if (scavenge(at(scene, 8, {}, 30 + t * 3)).flags.hunterHere) hunted = true }
  ok(!hunted, `${scene}: scavenge at Heat 8 opens no hunt`)
  ok(!timingNotice(at(scene, 8), 'stall').flags.hunterHere && !timingNotice(at(scene, 8), 'rush').flags.hunterHere, `${scene}: timing notice opens no hunt`)
  ok(timingNotice(at(scene, 7), 'rush').heat.cartel === 7, `${scene}: no Heat from timing`)
}
{
  ok(noticeOn(at('camp:yard', 8)), 'Yard is still notice ground')
  ok(!!timingNotice(at('camp:yard', 8), 'stall').flags.hunterHere, 'Yard at Heat 8 still hunts on a timing notice')
  let hunted = false
  for (let t = 0; t < 40; t++) for (let k = 0; k < 5; k++) if (scavenge(at('camp:yard', 8, {}, 30 + t * 3)).flags.hunterHere) hunted = true
  ok(hunted, 'Yard at Heat 8 still hunts on scavenge')
}

// 2. Typed fights follow the active hunter.
const hunt = (scene: string, cartel: number, handler: boolean) => at(scene, cartel, {
  metHandler: true, hunterHere: true, hunterFrom: scene, hunterAt: 44, huntQuiet: 0, huntNoValerius: handler,
  ...(handler ? { valeriusRest: true, valeriusQuiet: 1 } : {}),
})
for (const scene of ['camp:yard', 'camp:jaxson']) {
  for (const t of ['fight handler', 'fight the hound-handler', 'attack the handler', 'fight valerius', 'attack the overseer', 'fight', 'kill the man with the leash']) {
    const v = interpret(hunt(scene, 8, false), t)
    ok(v.flags.encounterKind === 'overseer' && /Valerius/.test(String(v.flash)) && !/the man with the leash/.test(String(v.flash)), `Valerius active, "${t}" fights Valerius (${v.flags.encounterKind})`)
    for (const c of [8, 5]) {
      const h = interpret(hunt(scene, c, true), t)
      ok(h.flags.encounterKind === 'handler' && !/Valerius/.test(String(h.flash)), `handler active (Cartel ${c}), "${t}" fights the handler (${h.flags.encounterKind})`)
    }
  }
  for (const t of ['fight the hound', 'attack hound', 'kill the dog']) {
    ok(interpret(hunt(scene, 8, false), t).flags.encounterKind === 'hound', `Valerius active, "${t}" fights the hound`)
    ok(interpret(hunt(scene, 5, true), t).flags.encounterKind === 'hound', `handler active, "${t}" fights the hound`)
  }
  // Typed and button start the same fight.
  const s = hunt(scene, 8, false)
  const button = applyEffect(s, visibleChoices(s).find((c) => c.id === 'hunter-fight')!.effects)
  ok(interpret(s, 'fight handler').flags.encounterKind === button.flags.encounterKind, 'typed = button (Valerius)')
  const hs = hunt(scene, 8, true)
  const hb = applyEffect(hs, visibleChoices(hs).find((c) => c.id === 'hunter-fight')!.effects)
  ok(interpret(hs, 'fight handler').flags.encounterKind === hb.flags.encounterKind, 'typed = button (handler)')
}

// 3. A Valerius win's Cartel -1 is not undone by the next quick rush notice in that scene.
{
  let found = 0
  for (let t = 0; t < 80 && !found; t++) {
    let s = hunt('camp:jaxson', 8, false)
    s = { ...s, ticks: 44 + t, flags: { ...s.flags, hunterAt: 44 + t } }
    s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'hunter-fight')!.effects)
    for (let i = 0; i < 40 && s.flags.encounterHere && !s.flags.encounterDone; i++) s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'enc-fight')!.effects)
    if (s.health <= 0 || !s.flags.valeriusBeaten) continue
    found++
    const after = applyEffect(s, visibleChoices(s).find((c) => c.id === 'enc-continue')!.effects)
    ok(after.heat.cartel === 7, 'Valerius win: Cartel 8 -> 7')
    // Even on notice ground, the first rush or stall after the fight is spent.
    const yardAfter = { ...after, sceneId: s.sceneId }
    ok(timingNotice(yardAfter, 'rush').heat.cartel === 7 && timingNotice(yardAfter, 'stall').heat.cartel === 7, 'rush/stall right after the fight add no Heat')
  }
  ok(found === 1, 'found a Valerius win to test')
  // Yard version (notice ground): the fight's end spends the notice there too.
  let yard = 0
  for (let t = 0; t < 80 && !yard; t++) {
    let s = hunt('camp:yard', 8, false)
    s = { ...s, ticks: 44 + t, flags: { ...s.flags, hunterAt: 44 + t } }
    s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'hunter-fight')!.effects)
    for (let i = 0; i < 40 && s.flags.encounterHere && !s.flags.encounterDone; i++) s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'enc-fight')!.effects)
    if (s.health <= 0 || !s.flags.valeriusBeaten) continue
    yard++
    const after = applyEffect(s, visibleChoices(s).find((c) => c.id === 'enc-continue')!.effects)
    ok(after.sceneId === 'camp:yard' && noticeOn(after), 'Yard: back on notice ground after the win')
    ok(timingNotice(after, 'rush').heat.cartel === after.heat.cartel, 'Yard: rush right after the Valerius win adds no Heat')
  }
  ok(yard === 1, 'found a Yard Valerius win to test')
}
console.log(fails ? `v158: ${fails} failure(s)` : 'v158: all ok')
process.exit(fails ? 1 : 0)

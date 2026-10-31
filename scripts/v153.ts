/**
 * v153: a hound or handler win keeps only Valerius away for 10 quiet scenes. Camp-04 hunts still come,
 * as the regular handler. His own win still stops all Camp-04 hunts (v145/v152).
 *   npx tsx scripts/v153.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, sceneOf, travelTo, valeriusCooling, visibleChoices } from '../src/game/engine.ts'
import { playCoverKey } from '../src/game/art.ts'
import { pressureFace as hunterSpeaker } from '../src/game/hunter.ts'
import { campHuntIsValerius, VALERIUS_REST, valeriusResting } from '../src/game/valeriusRest.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v187'"), 'SW cache v153')

function huntAt(flags: Record<string, unknown>, cartel = 7): GameState {
  const g = newGame('prisoner')
  return { ...g, hubId: 'camp04', sceneId: 'camp:yard', ticks: 40, health: 6, sap: 8, heat: { ...g.heat, cartel }, items: { ...g.items, wrench: 1, scrap: 6 }, equipped: { weapon: 'wrench' }, flags: { ...g.flags, noMasked: true, jaxsonInside: true, guardDown: true, cartelNotice: true, ...flags } } as GameState
}
function win(kind: 'hunter-hound' | 'hunter-fight', cartel: number): GameState | null {
  for (let t = 0; t < 60; t++) {
    let s = { ...huntAt({ hunterHere: true, hunterFrom: 'camp:yard' }, cartel), ticks: 40 + t, equipped: { weapon: 'wrench', armor: 'hide_wrap' } as GameState['equipped'], items: { wrench: 1, hide_wrap: 1, shock_baton: 1 } as GameState['items'] }
    s = applyEffect(s, visibleChoices(s).find((c) => c.id === kind)!.effects)
    for (let i = 0; i < 30 && s.flags.encounterHere && !s.flags.encounterDone; i++) s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'enc-fight')!.effects)
    const cont = visibleChoices(s).find((c) => c.id === 'enc-continue')
    if (!cont || s.health <= 0) continue
    const after = applyEffect(s, cont.effects)
    if (after.flags.valeriusRest) return after
  }
  return null
}
// 1. Hound win (and handler win) sets the Valerius-only rest, not the full cooldown.
for (const [kind, cartel] of [['hunter-hound', 6], ['hunter-fight', 5]] as const) {
  const w = win(kind, cartel)
  ok(w, `${kind}: a win was found`)
  if (!w) continue
  ok(w.flags.valeriusRest && valeriusResting(w) && !valeriusCooling(w), `${kind} win: Valerius rest on, full cooldown off`)
}
// 2. During the rest, a Cartel 7+ hunt still comes, as the handler (rows, face, art).
{
  const rest = huntAt({ valeriusRest: true, valeriusQuiet: 0, huntQuiet: 9 }, 8)
  let w = rest
  let hunt: GameState | null = null
  const spots = ['camp:vents', 'camp:yard']
  for (let i = 0; i < 30 && !hunt; i++) {
    w = travelTo({ ...w, sap: 8, health: 6 }, spots[i % 2])
    if (w.flags.encounterHere) w = { ...w, flags: { ...w.flags, encounterHere: false, encounterKind: undefined as never } }
    if (w.flags.hunterHere) hunt = w
  }
  ok(hunt, 'a Camp-04 hunt still comes during the Valerius rest')
  if (hunt) {
    ok(Number(hunt.flags.valeriusQuiet) < VALERIUS_REST, `hunt came inside the rest (${hunt.flags.valeriusQuiet})`)
    ok(!campHuntIsValerius(hunt) && hunterSpeaker(hunt) === 'Hound-handler', `rest hunt is the handler (${hunterSpeaker(hunt)})`)
    ok(visibleChoices(hunt).some((c) => c.label === 'Fight the Hound-handler') && !visibleChoices(hunt).some((c) => c.label === 'Fight Valerius'), 'rest hunt rows: the handler, not Valerius')
    ok(playCoverKey(hunt, sceneOf(hunt)) === 'handler', 'rest hunt art: the handler')
  }
}
// 3. After 10 quiet scenes, Valerius can come again.
{
  const done = huntAt({ valeriusRest: true, valeriusQuiet: VALERIUS_REST, hunterHere: true, hunterFrom: 'camp:yard' }, 8)
  ok(!valeriusResting(done) && campHuntIsValerius({ ...done, flags: { ...done.flags, huntNoValerius: false } }), 'after the rest, a Cartel 7+ hunt is Valerius again')
  ok(campHuntIsValerius(huntAt({ hunterHere: true }, 7)), 'no rest: Cartel 7 hunt is Valerius')
}
// 4. His own win still stops all Camp-04 hunts.
ok(valeriusCooling({ flags: { valeriusCool: true, huntQuiet: 3 } }), 'Valerius win: full cooldown unchanged')
console.log(fails ? `v153: ${fails} failure(s)` : 'v153: all ok')
process.exit(fails ? 1 : 0)

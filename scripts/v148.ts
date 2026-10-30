/**
 * v148: Hands. 3 get-ups per chapter attempt; the next Down restores the chapter checkpoint.
 *   npx tsx scripts/v148.ts
 */
import { applyEffect, bodyOf, interpret, newGame, persist, visibleChoices } from '../src/game/engine.ts'
import { HANDS_MAX, handsLeft, RUN_OVER_FLASH, RUN_OVER_LABEL, RUN_OVER_NOTE, RUN_OVER_SAP_NOTE } from '../src/game/hands.ts'
import { clearSessionCache, loadDoor } from '../src/game/save.ts'
const reload = () => (clearSessionCache(), loadDoor('prisoner'))
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
/** Knock Health to 0 the way a fight hit does. */
const down = (s: GameState) => applyEffect(s, { health: -99 })
const wake = (s: GameState) => applyEffect(s, row(s, 'wake')!.effects)

// 1. New game: 3 hands, checkpoint is the opening.
const g = newGame('prisoner')
ok(handsLeft(g) === 3 && g.checkpoint && g.checkpoint.sceneId === g.sceneId, 'new game: 3 hands, checkpoint at the opening')
let s: GameState = persist({ ...g, sceneId: 'camp:yard', hubId: 'camp04', ticks: 20, items: { ...g.items, scrap: 4 }, flags: { ...g.flags, guardDown: true, noMasked: true } })

// 2. Each Down spends one, shown on the button.
// v175: the last hand is the run. Two rescues, then the third Down ends it.
for (let i = 3; i >= 2; i--) {
  s = down(s)
  ok(s.flags.downed && handsLeft(s) === i - 1, `Down #${4 - i}: hands ${i} -> ${i - 1}`)
  ok(row(s, 'wake')!.sub === `Hands left: ${i - 1}`, `Down button sub "Hands left: ${i - 1}"`)
  // 6. Reload can't dodge: the save already has the spent hand.
  ok(reload()?.hands === i - 1 && reload()?.flags.downed, 'save written before the Down screen')
  s = wake(s)
  ok(!s.flags.downed && s.health > 0, 'got up')
}
// 3. Out of hands: the next Down ends the attempt; typed "wake" cannot dodge it.
s = down(s)
ok(s.flags.runOver && bodyOf(s) === RUN_OVER_NOTE, 'third Down (last hand): run over note')
ok(visibleChoices(s).length === 1 && visibleChoices(s)[0].label === RUN_OVER_LABEL, 'run over: one button')
ok(reload()?.flags.runOver, 'run over is saved')
const typed = interpret(s, 'wake')
ok(typed.sceneId === g.sceneId && typed.flash === RUN_OVER_FLASH && handsLeft(typed) === 3, 'typed wake restores the checkpoint too')
s = applyEffect(s, visibleChoices(s)[0].effects)
ok(s.sceneId === g.sceneId && !s.flags.guardDown && handsLeft(s) === HANDS_MAX && !s.flags.downed && s.health === g.health, 'run over: back at the opening, chapter reset, 3 hands')

// 4. Sap-zero rescue spends a hand; with none left it ends the attempt. Own Drop is free.
{
  let t: GameState = persist({ ...g, sceneId: 'camp:yard', hubId: 'camp04', sap: 1, items: {}, flags: { ...g.flags, noMasked: true } })
  t = applyEffect(t, { sap: -1, goto: 'camp:vents' })
  ok(t.sceneId.startsWith('crisis:') && handsLeft(t) === 2, 'Sap-zero rescue spends a hand')
  let d: GameState = persist({ ...g, sceneId: 'camp:yard', hubId: 'camp04', sap: 1, items: { vial_drop: 1 }, flags: { ...g.flags, noMasked: true } })
  d = applyEffect(d, { sap: -1, goto: 'camp:vents' })
  ok(handsLeft(d) === 3 && d.sap === 3, 'own Drop: no hand spent')
  let z: GameState = persist({ ...g, sceneId: 'camp:yard', hubId: 'camp04', sap: 1, hands: 0, items: {}, checkpoint: { ...g, flags: { ...g.flags, chapter1Done: true } }, flags: { ...g.flags, noMasked: true, chapter1Done: true } })
  z = applyEffect(z, { sap: -1, goto: 'camp:vents' })
  ok(z.flags.runOver && bodyOf(z) === RUN_OVER_SAP_NOTE && !z.sceneId.startsWith('crisis:'), 'Sap zero with no hands (incl. the anonymous camp rescue): run over')
}
// 5. Ossa's Knot is free.
{
  let k: GameState = persist({ ...g, sceneId: 'maw:ribs', hubId: 'redmaw', hands: 1, equipped: { head: 'knotted_wrap' }, items: { knotted_wrap: 1 }, flags: { ...g.flags, noMasked: true } })
  k = down(k)
  ok(handsLeft(k) === 1 && row(k, 'wake')!.sub === "Ossa's Knot. No hand spent.", 'Knot rescue spends no hand')
  k = wake(k)
  k = down(k)
  ok(handsLeft(k) === 0 && k.flags.knotRescued && k.flags.runOver, 'after the Knot, the next Down spends the last hand: run over')
}
// 7. Chapter Two checkpoint keeps Chapter One; run over there restores the Maw arrival.
{
  let c: GameState = persist({ ...g, sceneId: 'ch1:p-ossa', chapterId: 'cache-run', flags: { ...g.flags, guardDown: true, noMasked: true } })
  c = applyEffect(c, { goto: 'ch1:land' })
  ok(c.flags.chapter1Done && c.checkpoint?.flags.chapter1Done && c.checkpoint.sceneId === 'ch1:land', 'Chapter Two checkpoint at the Maw arrival')
  c = persist({ ...c, sceneId: 'maw:ribs', hubId: 'redmaw', hands: 0, flags: { ...c.flags, ribOpen: true } })
  c = down(c)
  c = applyEffect(c, visibleChoices(c)[0].effects)
  ok(c.sceneId === 'ch1:land' && c.flags.chapter1Done && c.flags.guardDown && !c.flags.ribOpen && handsLeft(c) === 3, 'run over in Ch2: Ch1 kept, Ch2 reset')
}
// 8. Old save with no hands or checkpoint: 3 hands; checkpoint added on first write.
{
  const { checkpoint: _c, hands: _h, ...old } = g
  const o = persist({ ...(old as GameState), sceneId: 'camp:yard', hubId: 'camp04' })
  ok(handsLeft(o) === 3 && o.checkpoint?.sceneId === g.sceneId, 'old save: 3 hands, opening checkpoint')
}
// 9. Mutual-0 tie is a win at Health 1: no Down, no hand.
{
  const src = (await import('node:fs')).readFileSync('src/game/encounter.ts', 'utf8')
  ok(/mutualWin\) \{\s*yourHp = 1/.test(src), 'tie sets you to Health 1')
}
console.log(fails ? `v148: ${fails} failure(s)` : 'v148: all ok')
process.exit(fails ? 1 : 0)

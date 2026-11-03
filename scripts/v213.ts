import { newGame, applyEffect, visibleChoices } from '../src/game/engine'
import { RUN_OVER_FLASH, RUN_OVER_GEAR_LOST } from '../src/game/hands'
import { chapterTwoSummary, GREG_LAST_STAND } from '../src/game/content/intoTheMaw'
import { getScene } from '../src/game/content'
import { gearStat } from '../src/game/kit'
import { ITEMS } from '../src/game/content/catalog'
import { chapterTwoAfter } from '../src/game/ch2'
import type { GameState } from '../src/game/types'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL ' + m) } }
ok(RUN_OVER_FLASH.includes(RUN_OVER_GEAR_LOST) && RUN_OVER_GEAR_LOST === 'Gear found this chapter is lost.', 'restart line')
const card = chapterTwoSummary({ sybellaBargain: true, ossaAlly: true, bayPikeTook: true, thaliaFavor: true, kaelenKnown: true, valeriusCheated: true }, {})
for (const l of ['Sybella: bargain struck', 'Ossa: ally', 'Pike: took from his bay', 'Thalia: favor taken', 'Kaelen: met', 'Valerius cheated: yes']) ok(card.includes(l), 'card ' + l)
ok(chapterTwoSummary({}, {}).includes('Valerius cheated: no'), 'card default no')
ok(gearStat(ITEMS.ossa_token) === 'Relic' && !!ITEMS.ossa_token.perk, 'Knot is a Relic')
ok(gearStat(ITEMS.knotted_wrap) === 'Shell 1', 'wrap keeps Shell 1')
// Greg dead: no Greg fight rows anywhere.
const gregRows = (s: GameState) => visibleChoices(s).filter((c) => c.effects.ambush?.kind === 'greg')
let found = 0
for (const id of ['ch2:p-cage', 'ch2:p-sift', 'ch2:gate', 'ch2:greg-toll', 'ch2:o-water', 'ch2:v-stair']) {
  try { getScene(id) } catch { continue }
  const s = applyEffect(newGame('prisoner'), { goto: id })
  const alive = gregRows({ ...s, health: 5, flags: { ...s.flags, millerHeard: true } })
  found += alive.length
  ok(gregRows({ ...s, health: 5, flags: { ...s.flags, millerHeard: true, gregDead: true } }).length === 0, 'no Greg fight once dead ' + id)
}
void GREG_LAST_STAND
{
  const b = applyEffect(newGame('prisoner'), { goto: 'ch2:p-sift' })
  const pre = { ...b, health: 5, flags: { ...b.flags, ch2Fight: 'sift', encounterHere: true } }
  const post = chapterTwoAfter(pre, { ...pre, flags: { ...pre.flags, encounterHere: false } })
  ok(post.flags.gregDead === true && post.flags.reckoningDone === true, 'won Sift Line fight kills Greg')
}
if (fails) { console.log(`${fails} v213 fail(s)`); process.exit(1) }
console.log('v213 ok', found)

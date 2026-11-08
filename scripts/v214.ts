import { newGame, applyEffect, visibleChoices, equipItem, sceneProse } from '../src/game/engine'
import { chapterTwoSummary } from '../src/game/content/intoTheMaw'
import { gearStat, KNOT_TAG } from '../src/game/kit'
import { ITEMS } from '../src/game/content/catalog'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL ' + m) } }
// 1. Cage hidden until Murch is paid; a way back shows instead.
{
  const s = applyEffect(newGame('prisoner'), { goto: 'ch2:p-shaft' })
  const ids = visibleChoices(s).map((c) => c.id)
  ok(!ids.includes('sealed'), 'cage hidden unpaid')
  ok(ids.includes('back'), 'back row unpaid')
  const paid = visibleChoices({ ...s, flags: { ...s.flags, murchScrap: true } }).map((c) => c.id)
  ok(!paid.includes('back'), 'no back row once paid')
}
// 3. End card name.
ok(chapterTwoSummary({ kaelenKnown: true }, {}).includes('The trader: met'), 'trader before name')
ok(chapterTwoSummary({ metKaelen: true, kaelenIntroSeen: true }, {}).includes('Kaelen: met'), 'Kaelen once named')
ok(chapterTwoSummary({}, {}).includes('The trader: not met'), 'trader not met')
// 5. Knot tag.
ok(KNOT_TAG === 'Relic: Ancient Ward' && gearStat(ITEMS.ossa_token) === KNOT_TAG, 'Knot tag')
// Baton moves from the off hand to the main hand.
{
  const b = newGame('prisoner')
  const s = { ...b, items: { ...b.items, ironwood_baton: 1 }, equipped: { offhand: 'ironwood_baton' } } as typeof b
  const m = equipItem(s, 'ironwood_baton', 'weapon')
  ok(m.equipped?.weapon === 'ironwood_baton' && !m.equipped?.offhand, 'baton to main hand')
  const back = equipItem(m, 'ironwood_baton', 'offhand')
  ok(back.equipped?.offhand === 'ironwood_baton' && !back.equipped?.weapon, 'baton back to off hand')
}
// Main Gate after Greg is dead: no Greg on his platform.
{
  const s = applyEffect(newGame('prisoner'), { goto: 'ch2:greg-toll' })
  const dead = sceneProse({ ...s, flags: { ...s.flags, gregDead: true } })
  ok(dead === "Greg's platform stands empty. Horn static, then a long low whistle.", 'gate after Greg dies')
  ok(!/Ambergrin|paint the sand/.test(dead), 'living Greg is gone from the dead gate')
  ok(/Greg/.test(sceneProse(s)), 'gate text keeps Greg alive')
}
console.log(fails ? `v214 FAILED ${fails}` : 'v214 ok')
if (fails) process.exit(1)

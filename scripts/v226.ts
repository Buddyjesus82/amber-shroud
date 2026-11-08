/** v226: Knot perk line, the unpaid shaft row, the Collapse leftover cut, the empty gate. */
import { existsSync, readFileSync } from 'node:fs'
import { applyEffect, bodyOf, isChoiceOn, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { playCoverKey } from '../src/game/art.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import { KNOT_STRAYS_NOTE } from '../src/game/kit.ts'
import { GREG_GATE_EMPTY, GREG_SCRIP_FLASH, GREG_SCRIP_LOCKED, GREG_TOLL_SCRIP } from '../src/game/content/intoTheMaw.ts'
import type { DoorId } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const LINE = 'The Knot at your brow. Strays who know Ossa ease off.'
const CUT = "You used her name at the gate. She'll know. So will I."

ok(readFileSync('src/version.ts', 'utf8').includes("'v227'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v227'"), 'build v226')
ok(ITEMS.ossa_token.perk === LINE && KNOT_STRAYS_NOTE === LINE, 'Knot perk line')

{
  const base = newGame('outcast')
  const worn = { ...base, heat: { ...base.heat, strays: 0 }, items: { ...base.items, ossa_token: 1 }, equipped: { ...base.equipped, head: 'ossa_token' } }
  const n = applyEffect(worn, { heat: { strays: 2 }, flash: 'They notice.' })
  ok(n.heat.strays === 1 && (n.flash ?? '').includes(LINE), 'worn Knot eases Stray Heat and says so')
}

{
  const s = applyEffect(newGame('prisoner'), { goto: 'ch2:p-shaft' })
  const back = visibleChoices(s).find((c) => c.id === 'back')
  ok(back?.label === 'Back to the bays' && back.sub === "Murch's lift is still dead.", 'unpaid shaft names the dead lift')
  const paid = visibleChoices({ ...s, flags: { ...s.flags, murchScrap: true } })
  ok(!paid.some((c) => c.id === 'back'), 'paid shaft hides the way back')
}

for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  const s = applyEffect(newGame(door), { goto: 'ch2:v-ribs' })
  const named = { ...s, flags: { ...s.flags, ch2SybellaNamed: true } }
  ok(!bodyOf(named).includes(CUT) && bodyOf(named) === bodyOf(s), `${door}: the Collapse leftover is gone`)
  const gate = applyEffect(newGame(door), { goto: 'ch2:greg-toll' })
  const dead = bodyOf({ ...gate, flags: { ...gate.flags, gregDead: true } })
  ok(dead === GREG_GATE_EMPTY, `${door}: empty platform after Greg dies`)
  ok(bodyOf(gate).includes('Greg Ambergrin'), `${door}: living Greg keeps the toll`)
  ok(playCoverKey(gate, sceneOf(gate)) === 'greg', `${door}: living Greg keeps his portrait`)
  const empty = { ...gate, flags: { ...gate.flags, gregDead: true } }
  ok(playCoverKey(empty, sceneOf(empty)) === 'greg_empty', `${door}: dead Greg swaps to the empty platform`)
  for (const heat of [0, 8]) {
    const broke = { ...gate, heat: { cartel: heat, seekers: heat, strays: heat }, items: { ...gate.items, scrip: 0 } }
    const row = visibleChoices(broke).find((c) => c.id === 'scrip')
    ok(!!row && row.label === GREG_TOLL_SCRIP && row.sub === '1 scrip.' && row.locked === GREG_SCRIP_LOCKED && !isChoiceOn(broke, row.enable), `${door} heat ${heat}: scrip row shows and locks at 0`)
    const paid = { ...broke, items: { ...broke.items, scrip: 1 } }
    const open = visibleChoices(paid).find((c) => c.id === 'scrip')!
    ok(isChoiceOn(paid, open.enable), `${door} heat ${heat}: one scrip enables the row`)
    const next = applyEffect(paid, open.effects)
    ok(next.sceneId === 'ch2:irongut' && (next.items.scrip ?? 0) === 0 && !next.flags.ch2SybellaNamed && next.flash === GREG_SCRIP_FLASH && next.flags.gregStanding === 'paid', `${door} heat ${heat}: scrip pays through to Iron-Gut`)
  }
  const bluff = visibleChoices(gate).filter((c) => c.id === 'sybella')
  if (door === 'prisoner') ok(bluff.length === 0, 'prisoner still has no Sybella bluff')
  else ok(bluff.length === 1 && bluff[0].sub === '3 scrap.' && !!bluff[0].effects.flag?.ch2SybellaNamed, `${door}: the 3-scrap bluff stays`)
}
ok(existsSync('public/covers/greg-empty.jpg') && readFileSync('public/sw.js', 'utf8').includes('covers/greg-empty.jpg'), 'empty platform is precached')

console.log(fails ? `v226 FAILED ${fails}` : 'v226: all pass')
if (fails) process.exit(1)

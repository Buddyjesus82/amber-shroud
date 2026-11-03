import { newGame, applyEffect, visibleChoices } from '../src/game/engine'
import { PENS_STASH } from '../src/game/content/camp04'
import type { GameState } from '../src/game/types'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL ' + m) } }
const pick = (s: GameState, id: string) => applyEffect(s, visibleChoices(s).find((c) => c.id === id)!.effects)
let s = applyEffect(newGame('prisoner'), { goto: 'camp:cages', enterHub: 'camp04' })
s = { ...s, sap: 4 }
const o = pick(s, 'overlook')
ok(o.sap === 4 && o.sceneId === 'camp:overlook', 'Pens spots are free to walk')
ok(pick(o, 'pens').sap === 4, 'back to the Pens is free')
const out = pick(s, 'yard')
ok(out.sap === 3 && (out.items.vial_drop ?? 0) === (s.items.vial_drop ?? 0) + 2 && out.flash === PENS_STASH, 'stash on leaving the cell, once')
const back = applyEffect({ ...out, flash: undefined }, { goto: 'camp:cages' })
const out2 = pick(back, 'yard')
ok((out2.items.vial_drop ?? 0) === (out.items.vial_drop ?? 0), 'stash only once')
if (fails) { console.log(`${fails} v212 fail(s)`); process.exit(1) }
console.log('v212 ok')

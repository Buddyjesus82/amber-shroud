/**
 * v143: a piece on your body is never sold, traded or clamped away; a lost wrench comes back once.
 *   npx tsx scripts/v143.ts
 */
import { applyEffect, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { isChoiceOn } from '../src/game/engine.ts'
import { repairLoadedState, restoreLostWrench } from '../src/game/repair.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

const SHOPS = ['camp:kaelen', 'thresh:kaelen', 'roam:kaelen', 'maw:zafir', 'maw:market', 'spine:silas', 'spine:silas-drop']
const WORN = 'Unequip it in Gear first.'
function at(door: DoorId, sceneId: string, extra: Partial<GameState> = {}, flags: GameState['flags'] = {}): GameState {
  const g = newGame(door)
  return { ...g, sceneId, ...extra, flags: { ...g.flags, ...flags } } as GameState
}

// 1. Every shop, every door, both hands: a worn wrench never sells, by button or by typing.
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const scene of SHOPS) {
    for (const eq of [{ weapon: 'wrench' }, { weapon: 'shiv', offhand: 'wrench' }] as const) {
      const g = newGame(door)
      const s = at(door, scene, { items: { ...g.items, wrench: 1, shiv: 1, scrap_buckler: 1 }, equipped: { ...eq } as GameState['equipped'] }, { shopShelf: 'sell' })
      ok(!visibleChoices(s).some((c) => c.id === 'sell-wrench'), `${door} ${scene}: no Sell row for a worn wrench`)
      for (const t of ['sell wrench', 'sell the wrench', 'sell oversized wrench', 'pawn wrench']) {
        const n = interpret(s, t)
        ok(n.flash === WORN || n.flash?.includes('Unequipped only') || n.flash?.includes('not a pawn'), `${door} ${scene}: "${t}" answers (${n.flash})`)
        ok((n.items.wrench ?? 0) === 1 && n.equipped.weapon === s.equipped.weapon && n.equipped.offhand === s.equipped.offhand, `${door} ${scene}: "${t}" keeps the worn wrench`)
        ok(n.items.scrap_buckler === 1 && !('scrap_buckler' in (n.equipped as object)) === !('scrap_buckler' in (s.equipped as object)), `${door} ${scene}: nothing turns into a buckler`)
      }
      const typedOnClosed = interpret({ ...s, flags: { ...s.flags, shopShelf: undefined as never } }, 'sell wrench')
      ok((typedOnClosed.items.wrench ?? 0) === 1, `${door} ${scene}: typed sell with the shelf shut keeps the wrench`)
    }
    // Unequipped, it still sells (once), nothing else changes, and the sale leaves a record.
    const g = newGame(door)
    const s = at(door, scene, { items: { ...g.items, wrench: 1 }, equipped: {} }, { shopShelf: 'sell' })
    const n = interpret(s, 'sell wrench')
    ok(!(n.items.wrench ?? 0) && n.flags.wrenchSold === true && Object.keys(n.items).every((k) => k === 'wrench' || k in s.items || k === 'scrap'), `${door} ${scene}: a spare wrench sells for scrap only`)
  }
}
// The worn line is a plain locked line; a spare second wrench is still sellable while one stays on.
{
  const g = newGame('prisoner')
  const s = at('prisoner', 'camp:kaelen', { items: { ...g.items, wrench: 2 }, equipped: { weapon: 'wrench' } }, { shopShelf: 'sell' })
  const row = visibleChoices(s).find((c) => c.id === 'sell-wrench')
  ok(!!row, 'a second wrench is saleable')
  const n = applyEffect(s, row!.effects)
  ok(n.items.wrench === 1 && n.equipped.weapon === 'wrench', 'selling the spare keeps the worn one')
}

// 2. Bay trades: Pike, Sarn and Vetch will not take a worn wrench, by button or by typing.
const BAY = [
  ['camp:bay-pike', 'trade-pike', 'trade wrench to pike'],
  ['camp:bay-sarn', 'trade-sarn', 'trade wrench to sarn'],
  ['camp:bay-vetch', 'trade-vetch', 'trade wrench to vetch'],
] as const
for (const [scene, id, typed] of BAY) {
  const g = newGame('prisoner')
  const flags = { jaxsonInside: true, guardDown: true }
  const worn = at('prisoner', scene, { items: { ...g.items, wrench: 1 }, equipped: { weapon: 'wrench' } }, flags)
  const row = visibleChoices(worn).find((c) => c.id === id)
  ok(row && !isChoiceOn(worn, row.enable) && row.locked === WORN, `${id}: locked with "${WORN}" while worn`)
  const t = interpret(worn, typed)
  ok((t.items.wrench ?? 0) === 1 && t.equipped.weapon === 'wrench' && !t.flags.wrenchBayTrade && t.flash === WORN, `${typed}: refused while worn with "${WORN}" (${t.flash})`)
  const bare = at('prisoner', scene, { items: { ...g.items, wrench: 1 }, equipped: {} }, flags)
  const row2 = visibleChoices(bare).find((c) => c.id === id)
  ok(row2 && isChoiceOn(bare, row2.enable), `${id}: open once unequipped`)
  const t2 = applyEffect(bare, row2!.effects)
  ok(!(t2.items.wrench ?? 0) && !!t2.flags.wrenchBayTrade, `${id}: trades the spare wrench`)
  const t3 = interpret(bare, typed)
  ok(!(t3.items.wrench ?? 0), `${typed}: trades once unequipped`)
}

// 3. Ossa's clamp will not take the worn wrench; leaving a spare one still works.
{
  const g = newGame('prisoner')
  const worn = at('prisoner', 'ch1:p-ossa', { items: { ...g.items, wrench: 1 }, equipped: { weapon: 'wrench' } })
  const clamp = visibleChoices(worn).find((c) => c.id === 'clamp')
  ok(clamp && !isChoiceOn(worn, clamp.enable) && clamp.locked === WORN, 'clamp is locked while the wrench is worn')
  const bare = { ...worn, equipped: {} }
  const c2 = visibleChoices(bare).find((c) => c.id === 'clamp')
  ok(c2 && isChoiceOn(bare, c2.enable), 'clamp opens once it is unequipped')
  const lever = visibleChoices(worn).find((c) => c.id === 'wrench')
  ok(lever && isChoiceOn(worn, lever.enable), 'the lever option keeps the worn wrench (it is not given away)')
}

// 4. Chapter One's loss takes a spare piece before the one on your body.
{
  const s = at('prisoner', 'ch1:p-ossa', { items: { wrench: 1, shiv: 1 }, equipped: { weapon: 'wrench' } })
  const n = applyEffect(s, { goto: 'ch1:hollow' })
  ok(n.items.wrench === 1 && !n.items.shiv && n.equipped.weapon === 'wrench', 'the spare shiv goes, the worn wrench stays')
  const only = applyEffect({ ...s, items: { wrench: 1 } }, { goto: 'ch1:hollow' })
  ok(!only.items.wrench && only.flags.buriedItem === 'wrench', 'with nothing else left the crisis still takes it, and records it')
  ok(!repairLoadedState({ ...only, flags: { ...only.flags, jaxsonInside: true } }).items.wrench, 'that loss is not "restored"')
}

// 5. Recovery: a save that took the job and has no wrench and no record of a trade gets it back once, unequipped.
{
  const g = newGame('prisoner')
  const lost = at('prisoner', 'camp:cages', { items: { ...g.items }, equipped: { offhand: 'scrap_buckler' } }, { jaxsonInside: true })
  const r = repairLoadedState({ ...lost, items: { ...lost.items, scrap_buckler: 1 } })
  ok(r.items.wrench === 1 && !r.equipped.weapon && r.flags.wrenchRestored === true, 'lost wrench comes back once, in the pack')
  const again = repairLoadedState({ ...r, items: { ...r.items, wrench: 0 } as never })
  ok(!(again.items.wrench) , 'and not a second time')
  for (const flag of ['wrenchBayTrade', 'wrenchClamped', 'wrenchSold']) {
    ok(!restoreLostWrench({ ...lost, flags: { ...lost.flags, [flag]: flag === 'wrenchBayTrade' ? 'sarn' : true } }).items.wrench, `a deliberate loss (${flag}) stays lost`)
  }
  ok(!restoreLostWrench({ ...lost, flags: { ...lost.flags, jaxsonInside: undefined as never } }).items.wrench, 'no wrench before the job is taken')
  ok(!restoreLostWrench({ ...lost, door: 'outcast' } as GameState).items.wrench, 'only the Prisoner door')
  ok(restoreLostWrench({ ...lost, items: { ...lost.items, wrench: 1 } }).items.wrench === 1, 'a held wrench is left alone')
}

if (fails) {
  console.log(`v143: ${fails} failures`)
  process.exit(1)
}
console.log('v143 checks OK')

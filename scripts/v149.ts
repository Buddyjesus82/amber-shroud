/**
 * v149: a new chapter refills the hands to 3, at the same moment its checkpoint is saved.
 *   npx tsx scripts/v149.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, persist } from '../src/game/engine.ts'
import { CHAPTER_DONE_FLAGS, handsLeft } from '../src/game/hands.ts'
import { clearSessionCache, loadDoor } from '../src/game/save.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v184'"), 'SW cache v149')
ok(CHAPTER_DONE_FLAGS[0] === 'chapter1Done', 'chapter list starts with Chapter One')
const g = newGame('prisoner')
let s: GameState = persist({ ...g, sceneId: 'ch1:p-ossa', chapterId: 'cache-run', hands: 0, flags: { ...g.flags, noMasked: true } })
ok(handsLeft(s) === 0, 'Chapter One: 0 hands left before the Maw')
s = applyEffect(s, { goto: 'ch1:land' })
ok(s.flags.chapter1Done && handsLeft(s) === 3, 'first reach of Red Maw Approach: hands refill to 3')
ok(s.checkpoint?.sceneId === 'ch1:land' && s.checkpoint.hands === 3, 'Chapter Two checkpoint stores hands = 3')
clearSessionCache()
ok(handsLeft(loadDoor('prisoner')!) === 3, 'refill is saved')
// Spending in Chapter Two does not refill again; coming back to the Approach does not either.
s = applyEffect(s, { health: -99 })
s = applyEffect(s, { unsetFlag: ['downed'], health: 3, goto: 'maw:ribs' })
ok(handsLeft(s) === 2, 'Chapter Two Down spends a hand')
s = applyEffect(s, { goto: 'ch1:land' })
ok(handsLeft(s) === 2, 'no second refill in the same chapter')
console.log(fails ? `v149: ${fails} failure(s)` : 'v149: all ok')
process.exit(fails ? 1 : 0)

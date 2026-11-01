/**
 * v154: Threshold Court shows the hall (threshold.jpg), not Thalia's portrait. Thalia and the Stairs keep hers.
 *   npx tsx scripts/v154.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v192'"), 'SW cache v154')
const g = newGame('vessel')
const at = (id: string, flags: Record<string, unknown> = {}) => ({ ...g, sceneId: id, hubId: 'threshold', flags: { ...g.flags, noMasked: true, stairsCleared: true, ...flags } }) as GameState
const art = (s: GameState) => playCoverFile(playCoverKey(s, sceneOf(s)))
for (const f of [{}, { metThalia: true }, { chapter1Done: true }]) {
  ok(art(at('thresh:court', f)) === 'threshold.jpg', `Court shows the hall ${JSON.stringify(f)}`)
}
ok(art(at('thresh:thalia')) === 'thalia.jpg' && art(at('thresh:crucible-stairs')) === 'thalia.jpg', 'Thalia and the Stairs keep her portrait')
// Walk Court -> Thalia -> back -> Court: two different screens, and the way back works.
let s = at('thresh:court')
s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'thalia')!.effects)
ok(s.sceneId === 'thresh:thalia', `climb the dais reaches Thalia (${s.sceneId})`)
s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'back')!.effects)
ok(s.sceneId === 'thresh:court' && art(s) === 'threshold.jpg', `back to the Court, hall art (${s.sceneId})`)
console.log(fails ? `v154: ${fails} failure(s)` : 'v154: all ok')
process.exit(fails ? 1 : 0)

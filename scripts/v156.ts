/**
 * v156: the Court's 'Climb the dais' goes through The Stairs (if not cleared), then to the dais Thalia scene.
 *   npx tsx scripts/v156.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v182'"), 'SW cache v156')
const pick = (s: GameState, id: string) => applyEffect({ ...s, flash: undefined }, visibleChoices(s).find((c) => c.id === id)!.effects)
const base = newGame('vessel')
const court = (f: Record<string, unknown> = {}) => ({ ...base, sceneId: 'thresh:court', hubId: 'threshold', flags: { ...base.flags, noMasked: true, ...f } }) as GameState
const art = (s: GameState) => playCoverFile(playCoverKey(s, sceneOf(s)))

const st = pick(court(), 'thalia')
ok(st.sceneId === 'thresh:stairs' && art(st) === 'stairs.jpg', `Court dais -> The Stairs (${st.sceneId})`)
for (const id of ['clear', 'climb']) {
  const n = pick(st, id)
  ok(n.sceneId === 'thresh:thalia' && n.flags.stairsCleared && !n.flags.stairsTo, `${id} -> dais Thalia (${n.sceneId})`)
  ok(n.hubId === 'threshold', 'still in the Threshold hub')
}
const typed = interpret(st, 'clear the debris')
ok(typed.sceneId === 'thresh:thalia', `Do box on the Stairs -> dais Thalia (${typed.sceneId})`)
const direct = pick(court({ stairsCleared: true }), 'thalia')
ok(direct.sceneId === 'thresh:thalia', 'cleared: Court dais goes straight to Thalia')
const back = pick(pick(st, 'clear'), 'back')
ok(back.sceneId === 'thresh:court' && pick(back, 'thalia').sceneId === 'thresh:thalia', 'second climb skips the Stairs')
// Opening route still ends at the opening Thalia.
const rig = { ...base, sceneId: 'thresh:crucible-rig', flags: { ...base.flags, noMasked: true } } as GameState
const open = pick(pick(rig, 'slip'), 'clear')
ok(open.sceneId === 'thresh:crucible-stairs', `opening -> opening Thalia (${open.sceneId})`)
// Save round-trip mid-Stairs keeps the destination.
const saved = JSON.parse(JSON.stringify(st)) as GameState
ok(pick(saved, 'climb').sceneId === 'thresh:thalia', 'save mid-Stairs keeps the dais destination')
console.log(fails ? `v156: ${fails} failure(s)` : 'v156: all ok')
process.exit(fails ? 1 : 0)

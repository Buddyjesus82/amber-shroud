/**
 * v150: Jaxson's Stall after Chapter One shows stall-empty.jpg, never the camp fence cover.
 *   npx tsx scripts/v150.ts
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { newGame, sceneOf } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v170'"), 'SW cache v150')
ok(sw.includes('covers/stall-empty.jpg`'), 'stall-empty.jpg precached')
ok(existsSync('public/covers/stall-empty.jpg') && statSync('public/covers/stall-empty.jpg').size < 160_000, 'stall-empty.jpg in the repo, cover-sized')
const at = (door: DoorId, flags: Record<string, unknown>) => {
  const g = newGame(door)
  const s = { ...g, hubId: 'camp04', sceneId: 'camp:lean', flags: { ...g.flags, noMasked: true, metOiltooth: true, ...flags } } as GameState
  return playCoverFile(playCoverKey(s, sceneOf(s)))
}
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  ok(at(door, { chapter1Done: true }) === 'stall-empty.jpg', `${door}: empty stall after Ch1 uses stall-empty.jpg`)
  ok(at(door, { chapter1Done: true, jaxsonInside: true, guardDown: true, striderHot: true }) === 'stall-empty.jpg', `${door}: rode with him, still stall-empty.jpg`)
}
ok(at('prisoner', {}) === 'oiltooth.jpg', 'before Ch1 the stall keeps his portrait')
console.log(fails ? `v150: ${fails} failure(s)` : 'v150: all ok')
process.exit(fails ? 1 : 0)

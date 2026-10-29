/**
 * v151: the fence cover (camp04.jpg) is retired. No scene, fallback, or precache entry uses it.
 *   npx tsx scripts/v151.ts
 */
import { readFileSync } from 'node:fs'
import { newGame, sceneOf } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey, type CoverKey } from '../src/game/art.ts'
import { allSceneIds } from '../src/game/content/index.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v166'"), 'SW cache v151')
ok(!sw.includes('camp04.jpg'), 'camp04.jpg not precached')
ok(!readFileSync('src/components/PlayScreen.tsx', 'utf8').includes("playCoverFile('camp04')"), 'failed-image fallback is not camp04')
ok(playCoverFile('nope' as CoverKey) === 'yard.jpg', 'unknown key falls back to yard.jpg')
const FLAGS: Record<string, unknown>[] = [
  {},
  { chapter1Done: true, metOiltooth: true },
  { jaxsonInside: true, guardDown: true },
  { hunterHere: true },
  { encounterHere: true, encounterKind: 'jackal' },
  { encounterHere: true, encounterKind: 'scavenger' },
]
let n = 0
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const id of allSceneIds()) {
    for (const f of FLAGS) {
      for (const hubId of [null, 'camp04']) {
        const g = newGame(door)
        const s = { ...g, sceneId: id, hubId, flags: { ...g.flags, noMasked: true, ...f } } as GameState
        const file = playCoverFile(playCoverKey(s, sceneOf(s)))
        n++
        ok(file !== 'camp04.jpg', `${door} ${id} ${hubId} ${JSON.stringify(f)}: no fence cover`)
      }
    }
  }
}
const want: [string, Record<string, unknown>, string][] = [
  ['camp:cages', { chapter1Done: true }, 'holding-cells.jpg'],
  ['camp:jaxson', { chapter1Done: true }, 'stall-empty.jpg'],
  ['camp:jaxson-cache', { chapter1Done: true }, 'stall-empty.jpg'],
  ['camp:jaxson-drop', { chapter1Done: true }, 'stall-empty.jpg'],
  ['crisis:camp', { chapter1Done: true }, 'down.jpg'],
  ['crisis:spine', {}, 'down.jpg'],
  ['crisis:thresh', {}, 'down.jpg'],
  ['camp:gate', {}, 'guard.jpg'],
  ['camp:forced', {}, 'camp-storm.jpg'],
]
for (const [id, f, file] of want) {
  const g = newGame('prisoner')
  const s = { ...g, sceneId: id, hubId: 'camp04', flags: { ...g.flags, noMasked: true, metOiltooth: true, ...f } } as GameState
  const got = playCoverFile(playCoverKey(s, sceneOf(s)))
  ok(got === file, `${id}: ${got} (want ${file})`)
}
console.log(fails ? `v151: ${fails} failure(s)` : `v151: all ok (${n} scene states, no fence cover)`)
process.exit(fails ? 1 : 0)

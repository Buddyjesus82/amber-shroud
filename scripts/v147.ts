/**
 * v147: every scene, on every door, in every Jaxson/chapter state, resolves to a cover file that exists and is precached.
 *   npx tsx scripts/v147.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { newGame, sceneOf } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
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
ok(sw.includes("CACHE = 'amber-shroud-v196'"), 'SW cache v147')
ok(sw.includes('ignoreSearch: true') && sw.includes("req.destination === 'image' ? Response.error()"), 'SW: covers match without ?v=, images never answered with the page')
const FLAGS: Record<string, unknown>[] = [
  {},
  { chapter1Done: true, metOiltooth: true },
  { jaxsonInside: true, guardDown: true, planHeard: true, jaxsonPlan: true },
  { jaxsonInside: true, guardDown: true, striderHot: true, chapter1Done: true, metOiltooth: true },
  { downed: true },
]
let n = 0
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const id of allSceneIds()) {
    for (const f of FLAGS) {
      const g = newGame(door)
      const s = { ...g, sceneId: id, flags: { ...g.flags, noMasked: true, ...f } } as GameState
      let file = ''
      try {
        file = playCoverFile(playCoverKey(s, sceneOf(s)))
      } catch (e) {
        ok(false, `${door} ${id} ${JSON.stringify(f)}: threw ${e}`)
        continue
      }
      n++
      ok(file && existsSync(`public/covers/${file}`), `${door} ${id} ${JSON.stringify(f)}: cover "${file}" exists`)
      ok(sw.includes(`covers/${file}\``), `${door} ${id}: cover "${file}" is precached`)
    }
  }
}
// After Chapter One, the stripped Jaxson scenes use non-Jaxson art.
for (const [id, want] of [['camp:lean', 'stall-empty.jpg'], ['camp:cages', 'holding-cells.jpg'], ['camp:jaxson', 'stall-empty.jpg'], ['camp:bay', 'skiff-bay-docks.jpg'], ['crisis:camp-alone', 'down.jpg']]) {
  const g = newGame('prisoner')
  const s = { ...g, hubId: 'camp04', sceneId: id, flags: { ...g.flags, chapter1Done: true, metOiltooth: true, jaxsonInside: true, guardDown: true } } as GameState
  const file = playCoverFile(playCoverKey(s, sceneOf(s)))
  ok(file === want, `${id} after Ch1: ${file} (want ${want})`)
}
console.log(fails ? `v147: ${fails} failure(s)` : `v147: all ok (${n} scene states)`)
process.exit(fails ? 1 : 0)

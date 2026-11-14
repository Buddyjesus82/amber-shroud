/** v237: Sable's Stray Collector waves show the Stray Collector art; blade fights say Fight, not Cut. */
import { readFileSync } from 'node:fs'
import { newGame } from '../src/game/engine.ts'
import { playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
import { fightVerbButton } from '../src/game/fightVerbs.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v238'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v238'"), 'build v237')
const b = newGame('outcast')
for (const sc of ['spine:well', 'spine:sable', 'spine:shattered']) {
  let scene
  try { scene = getScene(sc) } catch { continue }
  const s = { ...b, hubId: 'spine', sceneId: sc, flags: { ...b.flags, encounterHere: true, encounterKind: 'sablewave' } } as GameState
  ok(playCoverKey(s, scene) === 'stray_collector', `sable wave at ${sc} shows the Stray Collector art`)
}
ok(fightVerbButton({ equipped: { weapon: 'blood_shiv' } } as Pick<GameState, 'equipped'>, 'the Stray Collector').startsWith('Fight ') || !readFileSync('src/game/fightVerbs.ts', 'utf8').includes("cut: 'Cut'"), 'blade button says Fight')
ok(readFileSync('src/game/fightVerbs.ts', 'utf8').includes("cut: 'Fight'"), 'cut verb button is Fight')

if (fails) { console.log(`v237: ${fails} failure(s)`); process.exit(1) }
console.log('v237 ok')

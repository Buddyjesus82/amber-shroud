/** v204: Heat list "+", Hound-handler help Pack Call, rig skiff line. npx tsx scripts/v204.ts */
import { heatFactions } from '../src/game/heat.ts'
import { HELP_TOPICS } from '../src/game/helpTopics.ts'
import { ch2SkiffHunt, roadHunterKind } from '../src/game/roadHunt.ts'
import { newGame } from '../src/game/engine.ts'
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const all = JSON.stringify([heatFactions(), heatFactions('vessel'), heatFactions('outcast'), heatFactions('prisoner')])
ok(all.includes('at Seeker Heat 4+') && !/at Seeker Heat 4[^+]/.test(all), 'Seeker 4+')
ok(all.includes('at Cartel Heat 6+') && !/at Cartel Heat 6[^+]/.test(all), 'Cartel 6+')
ok(JSON.stringify(HELP_TOPICS).includes('Pack Call: if he lasts past round 2, his Shard-Hound comes at you when he falls.'), 'help Pack Call')
const g = (sceneId: string, chapterId: string) => { const s = newGame('prisoner' as never); return { ...s, sceneId, chapterId, heat: { ...s.heat, cartel: 6 } } as never }
ok(ch2SkiffHunt(g('ch2:gate', 'into-the-maw'), g('deep:rubble', 'into-the-maw'))?.line === 'A Cartel skiff in the rig. A turret on its deck.', 'rig skiff line')
ok(roadHunterKind(g('ch1:leave', 'cache-run'), g('ch1:p-pipe', 'cache-run'))?.kind === 'skiff', 'road skiff still')
ok(readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v217'") && readFileSync('src/version.ts', 'utf8').includes("'v217'"), 'v204 bump')
console.log(fails ? `v204: ${fails} FAIL` : 'v204: all ok')
process.exit(fails ? 1 : 0)

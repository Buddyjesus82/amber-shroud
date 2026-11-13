/** v220: fixed Sap on the Spine and Threshold map edges. Build label. npx tsx scripts/v220.ts */
import { readFileSync } from 'node:fs'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import { edgeSap } from '../src/game/map.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v232'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v232'"), 'build v220')

const spine = HUB_MAPS.spine
const thresh = HUB_MAPS.threshold
ok(spine.edges.length === 6 && thresh.edges.length === 5, 'every existing link stays')
for (const e of spine.edges) ok(e.sap != null, `spine ${e.a}-${e.b} sets sap`)
for (const e of thresh.edges) ok(e.sap != null, `threshold ${e.a}-${e.b} sets sap`)
ok(edgeSap(spine, 'ridge', 'shade') === 1 && edgeSap(spine, 'ridge', 'well') === 1 && edgeSap(spine, 'shade', 'well') === 1, 'spine short roads are 1')
ok(edgeSap(spine, 'well', 'hound') === 1 && edgeSap(spine, 'shade', 'hound') === 1, 'well-hound and shade-hound are 1')
ok(edgeSap(spine, 'hound', 'wash') === 2 && edgeSap(spine, 'wash', 'hound') === 2, 'hound-wash is 2 both ways')
ok(edgeSap(thresh, 'court', 'cell') === 1 && edgeSap(thresh, 'court', 'paddock') === 1 && edgeSap(thresh, 'court', 'sift') === 1 && edgeSap(thresh, 'paddock', 'sift') === 1, 'threshold short roads are 1')
ok(edgeSap(thresh, 'paddock', 'guard') === 2 && edgeSap(thresh, 'guard', 'paddock') == null, 'paddock to guard is 2 and one way')
ok(thresh.edges.find((e) => e.a === 'paddock' && e.b === 'guard')?.oneWay === true, 'oneWay stays')

console.log(fails ? `v220: ${fails} FAIL` : 'v220: all pass')
process.exit(fails ? 1 : 0)

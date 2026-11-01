/** v180: Ch2 tester run 2 fixes (gully scrap, turrets, Key patrol, canister, vein, drill lines, lift verbs, ribs). npx tsx scripts/v180.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, bodyOf, chapterTwoFromCode, isChoiceOn, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { encounterSpec } from '../src/game/encounter.ts'
import { playCoverKey } from '../src/game/art.ts'
const coverFor = (s: GameState) => playCoverKey(s, sceneOf(s))
import { DRILL_BREACH, DRILL_LINES, GULLY_SCRAP, LIFT_HUMS } from '../src/game/content/intoTheMaw.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v194'"), 'SW cache v180')
ok(readFileSync('src/version.ts', 'utf8').includes("'v194'"), 'Build label v180')
const v = chapterTwoFromCode('vessel')
const at = (sceneId: string, extra: Partial<GameState> = {}, flags: object = {}): GameState => ({ ...v, sceneId, ...extra, flags: { ...v.flags, ...flags } }) as GameState
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const count = (h: string, n: string) => h.split(n).length - 1
// 1 gully scrap once
const g = at('ch2:gully', { items: { ...v.items, scrap: 0 } })
const pried = applyEffect(g, row(g, 'casing')!.effects)
ok(pried.items.scrap === 2 && pried.flash?.includes(GULLY_SCRAP), 'casing gives 2 scrap')
ok(!row(pried, 'casing'), 'casing once only')
// 2 turrets
const t = applyEffect(at('ch2:gully', { health: 6 }), row(at('ch2:gully'), 'run')!.effects)
// v183: without the splice the raw run is Health −6, Cartel Heat +3 (see v183.ts).
ok(t.health === 0 && row(at('ch2:gully'), 'run')!.sub === 'Health −6. Cartel Heat +3.', 'raw turrets cost 6 Health')
// 3 Key patrol
const c = at('ch2:cache')
const keyed = applyEffect(c, row(c, 'key')!.effects)
const onRun = applyEffect(keyed, row(keyed, 'back')!.effects)
ok(onRun.flags.encounterHere && onRun.flags.encounterKind === 'seekerpatrol' && onRun.flags.keyPatrolMet, 'Key: a Seeker patrol waits at the drill run')
ok(encounterSpec(onRun).strike === 3, 'Key: Seeker patrol Strike +1')
ok(encounterSpec({ ...onRun, flags: { ...onRun.flags, spireKey: false } }).strike === 2, 'no Key: normal Strike')
// 4 canister
const low = at('ch2:cache', { sap: 1 })
ok(!isChoiceOn(low, row(low, 'niche')!.enable), 'canister needs Sap to spare')
const lift = applyEffect(at('ch2:cache', { sap: 4 }), row(at('ch2:cache', { sap: 4 }), 'niche')!.effects)
ok(lift.sap === 3 && lift.items.hydraulic_fluid === 1, 'canister costs 1 Sap')
// 5 vein
const r = at('ch2:ribs', { items: { ...v.items, memory_siphon: 1 } })
const once = applyEffect(r, row(r, 'vein')!.effects)
const again = row(once, 'vein')!
ok(!isChoiceOn(once, again.enable) && again.locked === 'The vein is already dry.', 'vein once; repeat is dry')
const vx = at('ch2:ribs', { items: { ...v.items, memory_siphon: 1 } }, { vexFreed: true })
const vs = applyEffect(vx, row(vx, 'siphon')!.effects)
ok(vs.flags.veinSiphoned && !isChoiceOn(vs, row(vs, 'vein')!.enable), 'siphon-first also dries the vein')
// 6 drill lines once
for (const st of [0, 1, 2, 3]) {
  const b = bodyOf(at('ch2:v-blown', {}, { drillStage: st }))
  ok(count(b, DRILL_BREACH) === 1 && DRILL_LINES.slice(1).every((l) => !b.includes(l)), `blown stage ${st}: one breach line`)
  const gb = bodyOf(at('ch2:gully', {}, { drillStage: st }))
  ok(DRILL_LINES.slice(1).filter((l) => gb.includes(l)).length === (st ? 1 : 0) && (!st || gb.includes(DRILL_LINES[st])), `gully stage ${st} line`)
}
const walk = applyEffect(at('ch2:approach', {}, { ch2Steps: 5, drillStage: 0 }), { goto: 'ch2:gully' })
ok(walk.flags.drillStage === 1 && count(`${bodyOf(walk)}\n${walk.flash ?? ''}`, DRILL_LINES[1]) === 1, 'stage line prints once on arrival')
// 7 lift verbs
const ribsSrc = JSON.stringify(sceneOf(at('ch2:ribs', {}, { murchProtected: true })))
ok(!/make the climb/.test(ribsSrc) && /Descend the lift/.test(JSON.stringify(sceneOf(at('ch2:ribs')).choices)), 'downward verbs')
// 8 ribs ready
const ready = at('ch2:ribs', {}, { liftDone: true, murchProtected: true, murchShop: 'full' })
ok(bodyOf(ready).includes(LIFT_HUMS) && coverFor(ready) === 'ch2_s_ribs_lift', 'ribs: humming lift text and art')
ok(coverFor(at('ch2:ribs', {}, { murchProtected: true })) === 'ch2_s_ribs', 'ribs: dead lift art before')
if (fails) { console.log(`${fails} FAILED`); process.exit(1) }
console.log('v180 ok')

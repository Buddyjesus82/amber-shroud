/** v232: one full-reveal map pickup on each hub sheet that did not have one. */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import { ch3MapLocked, drawnMap, fogged } from '../src/game/map.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { ROAD_NOT_NOW } from '../src/game/returnRoad.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v238'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v238'"), 'build v232')

const PICKS: { door: GameState['door']; sceneId: GameState['sceneId']; hubId: NonNullable<GameState['hubId']>; label: string; flag: string; flash: string }[] = [
  {
    door: 'outcast',
    sceneId: 'spine:shade',
    hubId: 'spine',
    label: 'Take the Spine survey chart',
    flag: 'spineMap',
    flash: 'You pry open the dented lock-box on the bench. Inside rests a crisp, grease-sealed vellum sheet charting every ridge, dry wash, and shelter marker along the Bleached Spine.',
  },
  {
    door: 'vessel',
    sceneId: 'thresh:sift',
    hubId: 'threshold',
    label: 'Take the Threshold plan',
    flag: 'threshMap',
    flash: 'You pull a heavy waxed-hide floor plan from behind the cracked slate housing. The inner court, paddock perimeter, and vessel cells are cleanly marked in faded blue ink.',
  },
  {
    door: 'prisoner',
    sceneId: 'maw:rim',
    hubId: 'redmaw',
    label: 'Take the Maw marker map',
    flag: 'mawMap',
    flash: 'You unclip a heavy hide marker map pinned to the wooden guide-post. All six rim paths, trading stalls, and wreckage drops across the Maw are clearly laid out.',
  },
  {
    door: 'vessel',
    sceneId: 'ch3:relay',
    hubId: 'barrow',
    label: "Take the trail-runner's map",
    flag: 'barrowMap',
    flash: 'You crack the wax off a battered tin tube wedged beneath the relay housing and unroll a stitched hide map. All the old runoff paths and dead-end cuts through the Barrow Trails are drawn in clean charcoal.',
  },
]

for (const pick of PICKS) {
  const base = newGame(pick.door)
  let s: GameState = { ...base, sceneId: pick.sceneId, hubId: pick.hubId, sap: 6, items: { ...base.items } }
  delete s.items.vial_drop
  const row = visibleChoices(s).find((c) => c.label === pick.label)
  ok(!!row && row.tone === 'quiet' && !row.sub && row.show && 'flagUnset' in (row.show ?? {}) && row.effects.flag?.[pick.flag] === true, `${pick.label} is a quiet one-time pickup with no subtitle`)
  ok(row?.effects.flash === pick.flash, `${pick.label} flash is the approved line`)
  const taken = applyEffect(s, row!.effects)
  ok(taken.flags[pick.flag] === true && taken.flash === pick.flash && !visibleChoices(taken).some((c) => c.label === pick.label), `${pick.label} sets ${pick.flag} and does not offer again`)
  ok(fogged(s) && !fogged(taken), `${pick.hubId} fog lifts when the map is taken`)
}

const fresh = applyEffect({ ...newGame('prisoner'), items: {} }, { goto: 'maw:rim' })
const freshNodes = drawnMap({ ...fresh, hubId: 'redmaw' })?.nodes.map((n) => n.id) ?? []
ok(fogged(fresh) && freshNodes.includes('rim') && freshNodes.length < (HUB_MAPS.redmaw?.nodes.length ?? 0), 'a new Rim arrival still draws in, it does not start with the whole sheet')

const old = repairLoadedState({ ...newGame('prisoner'), sceneId: 'maw:market', hubId: 'redmaw', flags: { ...newGame('prisoner').flags, chapter1Done: true, zafirMet: true } })
const kept = new Set(String(old.flags.mawSeen ?? '').split(','))
ok(!old.flags.mawMap && (HUB_MAPS.redmaw?.nodes ?? []).every((n) => kept.has(n.id)), 'an older Maw save keeps every node it could already see')
ok(drawnMap(old)?.nodes.length === HUB_MAPS.redmaw?.nodes.length, 'the seeded sheet still draws those nodes')

let relay = applyEffect({ ...newGame('vessel'), sap: 6, items: {} }, { goto: 'ch3:relay', flag: { ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, barrowMap: true } })
ok(!fogged(relay) && ch3MapLocked(relay, 'ch3:capture'), 'a full Barrow sheet still seals the Exit')
const refused = travelTo(relay, 'ch3:capture')
ok(refused.sceneId === 'ch3:relay' && refused.flash === ROAD_NOT_NOW && refused.sap === relay.sap, 'the full sheet does not walk through a locked beat')

let dry = applyEffect({ ...newGame('vessel'), sap: 4, items: {} }, { goto: 'ch3:relay', flag: { ch3Stripped: true, ch3Out: true, barrowMap: true, spineMap: true } })
dry = { ...dry, sap: 1, items: {}, checkpoint: undefined }
const spent = applyEffect(dry, { sap: -1, goto: 'ch3:wagon' })
ok(spent.checkpoint?.flags?.barrowMap === true && spent.checkpoint?.flags?.spineMap === undefined, 'a Chapter 3 restart keeps the Barrow map and treats the Spine map like the camp map')

console.log(fails ? `v232 FAILED ${fails}` : 'v232: all pass')
process.exit(fails ? 1 : 0)

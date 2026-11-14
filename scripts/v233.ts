/** v233: three Chapter 2 sheets, one per door, each with one map pickup. */
import { readFileSync } from 'node:fs'
import { applyEffect, CACHE_CONFIRM, CACHE_STAY, CACHE_TAKE, CH2_BACKTRACK, interpret, newGame, travelTo, TURN_BACK, TURN_BACK_FLASH, TURN_BACK_SUB, visibleChoices } from '../src/game/engine.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import { restoreCheckpoint } from '../src/game/hands.ts'
import { ch2MapLocked, drawnMap, fogged, hubMapOf, showMapButton } from '../src/game/map.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { ROAD_NOT_NOW } from '../src/game/returnRoad.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v238'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v238'"), 'build v233')

const PICKS = [
  {
    door: 'prisoner' as const,
    sceneId: 'ch2:p-bays' as const,
    hub: 'ch2p',
    label: 'Take the shaft survey chart',
    flag: 'ch2pMap',
    flash: 'You slide a folded, grease-smudged hide chart out from a parts drawer beneath the gantry. The Sift Line, the Old Shaft, and the Drill Line dropping down toward the Shaft Foot are marked in heavy charcoal.',
  },
  {
    door: 'outcast' as const,
    sceneId: 'ch2:o-hermit' as const,
    hub: 'ch2o',
    label: 'Take the Spine Root chart',
    flag: 'ch2oMap',
    flash: "You pull a tightly rolled piece of cured hide from a hollowed rib-bone beside the ash-pit. Every switchback from the Stake Line and Deep Camp out to Ossa's Stilt-Walk and the Spine Root's Foot is scratched in dark pigment.",
  },
  {
    door: 'vessel' as const,
    sceneId: 'ch2:v-outpost' as const,
    hub: 'ch2v',
    label: 'Take the inner sanctum plan',
    flag: 'ch2vMap',
    flash: "You slide a stiff vellum plan out from beneath a brass weight on the desk. The Pilgrim Stair, the Cup Test, and the lower passages running past the Transport Bay toward Oram's Lower Stair are inked in sharp detail.",
  },
]

for (const pick of PICKS) {
  const base = newGame(pick.door)
  const s: GameState = { ...base, sceneId: pick.sceneId, chapterId: 'into-the-maw', hubId: null, sap: 6, flags: { ...base.flags, ch2Started: true } }
  const sheet = hubMapOf(s)
  ok(sheet?.hubId === pick.hub && fogged(s) && showMapButton(s), `${pick.hub} sheet is fogged and the map button shows`)
  ok(!sheet?.nodes.some((n) => n.sceneId.startsWith('ch1:') || n.sceneId.startsWith('maw:')), `${pick.hub} has no Chapter One ground`)
  const row = visibleChoices(s).find((c) => c.label === pick.label)
  ok(!!row && row.tone === 'quiet' && !row.sub && row.effects.flash === pick.flash, `${pick.label} is the approved quiet pickup`)
  const taken = applyEffect(s, row!.effects)
  ok(taken.flags[pick.flag] === true && taken.flash === pick.flash && !fogged(taken) && !visibleChoices(taken).some((c) => c.label === pick.label), `${pick.label} un-fogs once`)
  const full = drawnMap(taken)
  ok(full?.nodes.length === sheet?.nodes.length, `${pick.hub} draws every node after the pickup`)
}

const prisoner = hubMapOf({ ...newGame('prisoner'), sceneId: 'ch2:p-jaws', chapterId: 'into-the-maw' })
const outcast = hubMapOf({ ...newGame('outcast'), sceneId: 'ch2:o-wash', chapterId: 'into-the-maw' })
const vessel = hubMapOf({ ...newGame('vessel'), sceneId: 'ch2:v-scar', chapterId: 'into-the-maw' })
ok(prisoner?.hubId === 'ch2p' && !prisoner.nodes.some((n) => n.sceneId.startsWith('ch2:o-') || n.sceneId.startsWith('ch2:v-')), 'the prisoner sheet is only the prisoner route')
ok(outcast?.hubId === 'ch2o' && !outcast.nodes.some((n) => n.sceneId.startsWith('ch2:p-') || n.sceneId.startsWith('ch2:v-')), 'the outcast sheet is only the outcast route')
ok(vessel?.hubId === 'ch2v' && !vessel.nodes.some((n) => n.sceneId.startsWith('ch2:p-') || n.sceneId.startsWith('ch2:o-')), 'the vessel sheet is only the vessel route')
for (const id of ['ch2:v-blown', 'ch2:v-ribs', 'ch2:o-bounty', 'ch2:survivor', 'ch2:cache']) {
  ok(![prisoner, outcast, vessel].some((sheet) => sheet?.nodes.some((n) => n.sceneId === id) && (id === 'ch2:v-blown' || id === 'ch2:v-ribs' || id === 'ch2:survivor' || id === 'ch2:cache')), `${id} stays off the sheets`)
}
ok(outcast?.nodes.some((n) => n.sceneId === 'ch2:o-bounty'), 'the bounty is a place on the outcast sheet, not a skipped beat')

function at(door: GameState['door'], sceneId: GameState['sceneId'], flags: GameState['flags'] = {}): GameState {
  const base = newGame(door)
  return { ...base, sceneId, chapterId: 'into-the-maw', hubId: null, sap: 6, items: {}, flags: { ...base.flags, ch2Started: true, ...flags } }
}

const jaws = at('prisoner', 'ch2:p-jaws')
ok(travelTo(jaws, 'ch2:p-haul').sceneId === 'ch2:p-haul', 'an open descent road can be walked')
ok(travelTo(jaws, 'maw:rim').sceneId === 'ch2:p-jaws' && travelTo(jaws, 'maw:rim').flash === CH2_BACKTRACK, 'Chapter Two still cannot walk back to Chapter One ground')
ok(travelTo(jaws, 'ch1:leave').flash === CH2_BACKTRACK, 'the Bone Wash is not a Chapter Two exit')
const bays = at('prisoner', 'ch2:p-bays')
ok(ch2MapLocked(bays, 'ch2:p-shaft') && travelTo(bays, 'ch2:p-shaft').sceneId === 'ch2:p-bays' && travelTo(bays, 'ch2:p-shaft').flash === ROAD_NOT_NOW, 'the shaft stays shut until Murch is paid')
ok(travelTo({ ...bays, flags: { ...bays.flags, murchScrap: true } }, 'ch2:p-shaft').sceneId === 'ch2:p-shaft', 'paying Murch opens the shaft road')
const drill = at('prisoner', 'ch2:p-drillrun')
ok(travelTo(drill, 'ch2:p-abyss').sceneId === 'ch2:p-drillrun', 'the drill beat cannot be skipped')
ok(travelTo({ ...drill, flags: { ...drill.flags, drillPast: true } }, 'ch2:p-abyss').sceneId === 'ch2:p-abyss', 'after the drills, the Shaft Foot opens')
const scar = at('vessel', 'ch2:v-scar')
ok(travelTo(scar, 'ch2:v-outpost').sceneId === 'ch2:v-scar' && travelTo(scar, 'ch2:v-outpost').flash === ROAD_NOT_NOW, 'the Pilgrim Stair toll cannot be skipped')
const hermit = at('outcast', 'ch2:o-root', { hermitTraded: true })
ok(travelTo(hermit, 'ch2:o-hermit').sceneId === 'ch2:o-root', 'a finished hermit visit is not a road back in')

const old = repairLoadedState(at('prisoner', 'ch2:p-bays'))
ok(old.flags.ch2pSeen === 'bays' && drawnMap(old)?.nodes.some((n) => n.id === 'bays'), 'a mid-route save shows the node it is standing on')
const deep = repairLoadedState(at('prisoner', 'ch2:cache'))
ok(String(deep.flags.ch2pSeen ?? '').split(',').length === (HUB_MAPS.ch2p?.nodes.length ?? 0), 'a save past the route still opens the whole sheet')

let restarted = applyEffect(newGame('prisoner'), { goto: 'ch2:p-jaws' })
restarted = applyEffect(restarted, { flag: { ch2pMap: true } })
const again = restoreCheckpoint(restarted)
ok(!!again && !again.flags.ch2pMap && !!again.flags.ch2Started, 'a chapter restart clears the Chapter 2 map the way a camp map taken after the checkpoint does')
ok(!showMapButton({ ...jaws, flags: { ...jaws.flags, encounterHere: true } }), 'a fight hides the map')

function ready(door: GameState['door'], sceneId: GameState['sceneId'], hubId: GameState['hubId']): GameState {
  const base = newGame(door)
  return { ...base, sceneId, hubId, sap: 4, flags: { ...base.flags, hungerKnown: true }, items: { ...base.items } }
}
function ids(s: GameState) {
  return visibleChoices(s).map((c) => c.id)
}
const wash = ready('outcast', 'spine:ridge', 'spine')
const asked = applyEffect(wash, visibleChoices(wash).find((c) => c.id === 'hunger')!.effects)
ok(asked.sceneId === 'spine:ridge' && asked.sap === wash.sap && asked.chapterId !== 'cache-run' && asked.flash === CACHE_CONFIRM, 'the Bone Wash road asks before it starts')
ok(ids(asked).join(',') === 'cache-take,cache-stay' && visibleChoices(asked).every((c) => !c.effects.sap), 'only Take the road and Stay, and Stay has no cost')
const stayed = applyEffect(asked, visibleChoices(asked).find((c) => c.label === CACHE_STAY)!.effects)
ok(stayed.sceneId === 'spine:ridge' && stayed.sap === wash.sap && !stayed.flags.cachePending && stayed.chapterId !== 'cache-run', 'Stay puts nothing on the road')
const mapped = travelTo(wash, 'ch1:leave')
ok(mapped.sceneId === 'spine:ridge' && mapped.flash === CACHE_CONFIRM && mapped.sap === wash.sap, 'a map hop onto the Bone Wash asks first')
const typed = interpret(wash, 'walk the gullet')
ok(typed.sceneId === 'spine:ridge' && typed.flash === CACHE_CONFIRM, 'typing the road asks first')
const hound = ready('outcast', 'spine:hound', 'spine')
const walk = visibleChoices(hound).find((c) => c.effects.goto === 'ch1:leave')
ok(!!walk && applyEffect(hound, walk.effects).flash === CACHE_CONFIRM && applyEffect(hound, walk.effects).sap === hound.sap, 'the camp walk onto the Bone Wash asks first')
const camp = applyEffect(ready('prisoner', 'camp:wire', 'camp04'), { startChapter: 'cache-run', goto: 'ch1:leave', wireExit: true })
ok(camp.sceneId === 'camp:wire' && camp.flash === CACHE_CONFIRM, 'the Wire asks before the Cache Run')
const paddock = applyEffect(ready('vessel', 'thresh:paddock', 'threshold'), { startChapter: 'cache-run', goto: 'ch1:leave' })
ok(paddock.sceneId === 'thresh:paddock' && paddock.flash === CACHE_CONFIRM, 'the Strider Paddock asks before the Cache Run')
const took = applyEffect(asked, visibleChoices(asked).find((c) => c.label === CACHE_TAKE)!.effects)
ok(took.chapterId === 'cache-run' && took.sceneId === 'ch1:leave' && took.flags.cacheFirst === 'ch1:leave', 'Take the road still opens the Cache Run')
const quiet = { ...took, flags: { ...took.flags, encounterHere: false } }
const back = visibleChoices(quiet).find((c) => c.label === TURN_BACK)
ok(!!back && back.sub === TURN_BACK_SUB && !back.effects.sap, 'Turn back is on the first beat and costs nothing')
const home = applyEffect(quiet, back!.effects)
ok(home.sceneId === 'spine:ridge' && home.hubId === 'spine' && home.chapterId !== 'cache-run' && home.flash === TURN_BACK_FLASH && !!home.flags.encounterHere, 'Turn back is free, lands home, and starts a fight')
ok(home.sap === wash.sap && !home.flags.hungerLocked && !home.flags.cacheFirst, 'turning back clears the run so it can be taken again')
const onward = applyEffect(took, { goto: 'ch1:o-noon', sap: -1, ticks: 1 })
ok(!visibleChoices(onward).some((c) => c.label === TURN_BACK), 'Turn back is gone after the first beat')
const campAsk = applyEffect(ready('prisoner', 'camp:yard', 'camp04'), { startChapter: 'cache-run', goto: 'ch1:leave' })
const stormed = applyEffect(campAsk, { cacheCommit: true })
ok(stormed.sceneId === 'ch1:storm' && visibleChoices(stormed).some((c) => c.label === TURN_BACK), 'the Prisoner lands on the storm, and that is the beat they can leave')

console.log(fails ? `v233 FAILED ${fails}` : 'v233: all pass')
process.exit(fails ? 1 : 0)

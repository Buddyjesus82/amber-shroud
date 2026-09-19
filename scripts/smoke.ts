import { readFileSync } from 'node:fs'
import {
  applyEffect,
  bodyOf,
  equipItem,
  interpret,
  newGame,
  scavenge,
  sceneOf,
  skim,
  travelTo,
  visibleChoices,
} from '../src/game/engine.ts'
import { DOORS, HUBS, ITEMS } from '../src/game/content/catalog.ts'
import { PEOPLE } from '../src/game/people.ts'
import { rollScavenge } from '../src/game/scavenge.ts'
import { canTravelTo, edgeSap, HUB_MAPS, nodeIdForScene, route } from '../src/game/map.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function pick(s: GameState, id: string) {
  const c = visibleChoices(s).find((x) => x.id === id)
  if (!c) {
    throw new Error(
      `missing choice ${id} at ${s.sceneId} have ${visibleChoices(s)
        .map((x) => x.id)
        .join(',')}`,
    )
  }
  return applyEffect(s, c.effects)
}

function ids(s: GameState) {
  return visibleChoices(s).map((x) => x.id)
}

function walkTo(s: GameState, destScene: string): GameState {
  const hubId = s.hubId
  assert(hubId, `walkTo ${destScene} needs a hub`)
  const map = HUB_MAPS[hubId]
  assert(map, `missing map ${hubId}`)
  const from = nodeIdForScene(map, s.sceneId, true)
  const to = nodeIdForScene(map, destScene, false)
  assert(from && to, `no map nodes for ${s.sceneId} → ${destScene}`)
  const path = route(map, from, to)
  assert(path, `no route ${from} → ${to}`)
  let cur = s
  if (from === to) {
    return cur.sceneId === destScene ? cur : travelTo(cur, destScene)
  }
  for (let i = 1; i < path.length; i++) {
    const nodeId = path[i]
    const node = map.nodes.find((n) => n.id === nodeId)
    assert(node, `missing node ${nodeId}`)
    const dest = i === path.length - 1 ? destScene : node.sceneId
    const cost = edgeSap(map, path[i - 1], nodeId) ?? 1
    if (cur.sap <= cost) cur = applyEffect(cur, { sap: cost + 1 - cur.sap })
    cur = travelTo(cur, dest)
    if (cur.sceneId !== dest && String(cur.sceneId).includes('hunter')) {
      cur = applyEffect(cur, { goto: dest, pressure: -4 })
    }
    assert(cur.sceneId === dest, `walk ${path[i - 1]}→${nodeId} wanted ${dest} got ${cur.sceneId}`)
  }
  return cur
}

const prisoner = DOORS.prisoner
const outcast = DOORS.outcast
const vessel = DOORS.vessel

assert(prisoner.items.scrip === 2 && !prisoner.items.wrench && !prisoner.items.vial_drop, 'prisoner kit: scrip only')
assert(!prisoner.items.scrap && !prisoner.items.silas_tip && !prisoner.items.oram_map, 'prisoner kit unique')
assert(prisoner.heat.cartel === 3, 'prisoner cartel heat')

assert(outcast.items.vial_empty === 1 && outcast.items.silas_tip === 1, 'outcast kit: empty vial + silas tip')
assert(!outcast.items.wrench && !outcast.items.scrip && !outcast.items.oram_map, 'outcast kit unique')
assert(outcast.sap === 2, 'outcast sap is thin')
assert(outcast.heat.strays === 2, 'outcast stray lean')

assert(vessel.items.rusted_dagger === 1 && vessel.items.oram_map === 1, 'vessel kit: dagger + oram map')
assert(vessel.items.ceremonial_cloth === 1 && vessel.items.vial_drop === 1, 'vessel cloth + drop')
assert(!vessel.items.wrench && !vessel.items.silas_tip, 'vessel kit unique')
assert(vessel.heat.seekers === 3, 'vessel seeker pressure')

assert(ITEMS.wrench.bite === 3 && ITEMS.shiv.bite === 2 && ITEMS.needle_knife.bite === 3, 'weapons have Bite')
assert(ITEMS.ironwood_baton.bite === 4 && ITEMS.rusted_dagger.bite === 2, 'baton and dagger Bite')
assert(ITEMS.dust_cloak.hide === 3 && ITEMS.hide_wrap.hide === 4 && ITEMS.ceremonial_cloth.hide === 1, 'armor has Hide')
assert(!ITEMS.scrap.bite && !ITEMS.vial_drop.hide, 'currency is not Bite/Hide')
assert(!/(\bshe\b|\bher\b)/i.test(PEOPLE.kaelen.card), 'Kaelen card is not she/her')
assert(/\bthey\b/i.test(PEOPLE.kaelen.card), 'Kaelen card uses they')
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('kit-strip'),
  'kit strip removed from play',
)
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('hub-act'),
  'Scavenge is not a fat pinned hub button',
)
assert(
  readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('scavenge-chip'),
  'Scavenge is a compact hub chip',
)

for (const hub of Object.values(HUBS)) {
  const map = HUB_MAPS[hub.id]
  assert(map?.ready, `hub ${hub.id} has a ready map`)
  const ids = new Set(map.nodes.map((n) => n.id))
  assert(ids.has(map.defaultNode), `${hub.id} default node exists`)
  for (const p of hub.places) {
    assert(
      map.nodes.some((n) => n.id === p.id && n.sceneId === p.sceneId),
      `${hub.id} place ${p.id} is a map node`,
    )
  }
  for (const e of map.edges) {
    assert(ids.has(e.a) && ids.has(e.b), `${hub.id} edge ${e.a}–${e.b}`)
  }
  for (const n of map.nodes) {
    assert(route(map, map.defaultNode, n.id), `${hub.id} ${n.id} reachable from default`)
  }
}

const camp = HUB_MAPS.camp04
assert(edgeSap(camp, 'pens', 'wire') == null, 'pens have no road to the Wire')
assert(edgeSap(camp, 'pens', 'bay') == null, 'pens have no road to the bay')
assert(edgeSap(camp, 'pens', 'yard') === 1, 'pens connect to the Yard')
assert(edgeSap(camp, 'pens', 'lean') === 1, 'pens connect to the stall')
assert(route(camp, 'pens', 'wire')?.join('→') === 'pens→lean→bay→wire', 'mechanic corridor is the short Wire path')
assert(edgeSap(camp, 'bay', 'wire') === 2, 'camp Maw-leg from bay to Wire is long')
assert(HUBS.camp04.mawLegs > HUBS.spine.mawLegs, 'Camp-04 is farther from the Maw than the Spine')
assert(HUBS.spine.mawLegs > HUBS.threshold.mawLegs, 'Spine is farther from the Maw than Outer Threshold')
assert(HUB_MAPS.spine.edges.some((e) => e.sap === 2), 'Spine has a long 2-Sap road')

let s = newGame('prisoner')
assert(s.items.scrip === 2 && !s.items.wrench, 'newGame copies penniless prisoner kit')
s = pick(s, 'pens')
assert(s.hubId === 'camp04' && s.sceneId === 'camp:cages', 'prisoner holding pens')
assert(!canTravelTo(s, 'camp:wire'), 'Map refuses pens→Wire teleport')
assert(!canTravelTo(s, 'camp:bay'), 'Map refuses pens→bay teleport')
const blocked = travelTo(s, 'camp:wire')
assert(blocked.sceneId === 'camp:cages', 'illegal travel stays in the pens')
assert(blocked.flash?.toLowerCase().includes('no road'), 'illegal travel explains the missing road')
s = pick(s, 'jaxson')
s = pick(s, 'inside')
assert(s.items.wrench === 1 && s.flags.jaxsonInside, 'Oil-Tooth is the inside man — wrench for hotwire')
s = equipItem(s, 'wrench')
assert(s.equipped.weapon === 'wrench', 'Gear can equip the wrench')
assert(ids(s).includes('station'), 'stall offers the west vent after the job — no hub-chip required')
s = travelTo(s, 'camp:vats')
assert(ids(s).includes('wrench'), 'vat wrench path after Oil-Tooth')
s = pick(s, 'wrench')
assert((s.items.vial_drop ?? 0) >= 1, 'wrench vat extra drop, no extra heat')
assert(s.heat.cartel === 3, 'quiet wrench does not add cartel heat')

s = newGame('prisoner')
s = pick(s, 'pens')
s = travelTo(s, 'camp:lean')
s = interpret(s, 'ask about kallik cache red maw')
assert(s.sceneId === 'camp:wire' || s.sceneId === 'camp:jaxson-cache', 'cache rumor is Kaelen, not Oil-Tooth')
assert(!s.flags.hungerKnown, 'Oil-Tooth does not sell the Hunger heading')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'inside')
s = travelTo(s, 'camp:cages')
s = pick(s, 'wrench-bar')
s = pick(s, 'scrap')
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
assert(sceneOf(s).speaker === 'Kaelen the Sifter', 'Kaelen card')
assert(ids(s).includes('rumors'), 'rumor menu exists')
s = interpret(s, 'ask for rumors news')
assert(s.sceneId === 'camp:kaelen-rumors', 'asking opens the rumor counter')
s = pick(s, 'back')
s = pick(s, 'drop')
assert((s.items.vial_drop ?? 0) >= 1, 'scrap buys a Drop of Oasis Sap')
s = pick(s, 'rumors')
s = pick(s, 'relic')
s = pick(s, 'take')
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
s = pick(s, 'glint')
s = pick(s, 'hunger-paid')
assert(s.flags.hungerKnown, 'paid Glint intel')
s = applyEffect(s, { sap: 3, pressure: -20 })
s = walkTo(s, 'camp:guard')
s = pick(s, 'sabotage')
s = pick(s, 'do')
assert(s.flags.guardDown, 'sabotage guard station')
s = pick(s, 'hotwire')
assert(s.flags.striderHot, 'Oil-Tooth hotwires the Strider')
s = applyEffect(s, { sap: 4 })
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(s.sceneId === 'ch1:trail', 'beat 1 trail')
assert(ids(s).includes('wrench'), 'cache run wrench branch from Oil-Tooth kit')
assert(!ids(s).includes('silas'), 'prisoner has no silas cut')
s = pick(s, 'wrench')
assert(s.flags.wrenchCut, 'wrench cut flag')
assert(ids(s).includes('wrench'), 'ossa wrench lash')
s = pick(s, 'wrench')
assert(s.flags.ossaAlly, 'wrench lash allies Ossa')
assert(s.sceneId === 'ch1:zafir', 'beat 3 zafir')
assert(ids(s).includes('scrip'), 'zafir takes scrip')
s = pick(s, 'scrip')
assert(s.sceneId === 'ch1:sybella', 'hard choice')
assert(ids(s).includes('false'), 'false trail available')
s = pick(s, 'false')
assert(s.flags.climax === 'false', 'climax is spend')
assert(s.flags.falseSpent, 'false trail consumed kit')
assert(s.sceneId === 'ch1:land', 'land after spend')
s = pick(s, 'hub')
assert(s.hubId === 'redmaw', 'red maw hub')

s = newGame('outcast')
assert(s.sap === 2, 'outcast starts thin')
s = pick(s, 'stand')
assert(s.hubId === 'spine')
assert(ids(s).includes('tip'), 'silas tip on ridge')
assert(ids(s).includes('hunger'), 'First Drop offers Hunger on the ridge card — no hook-chip required')
s = pick(s, 'tip')
assert(s.sceneId === 'spine:tip')
s = pick(s, 'fill')
assert(s.items.vial_drop === 1 && !s.items.vial_empty, 'empty vial filled from tip smear')
assert(s.sap >= 3, 'smear sap bite reversed a little')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(ids(s).includes('silas'), 'cache run silas branch')
assert(!ids(s).includes('wrench'), 'outcast cannot wrench')
const sapBeforeCut = s.sap
s = pick(s, 'silas')
assert(s.sap === sapBeforeCut, 'silas cut does not spend sap')
s = pick(s, 'skip')
assert(s.sceneId === 'ch1:zafir')
assert(ids(s).includes('silas'), 'zafir can spend the tip')
s = pick(s, 'news')
assert(s.sceneId === 'ch1:sybella')
assert(ids(s).includes('false'), 'tip or ossa still gates false trail')
s = pick(s, 'false')
assert(s.flags.climax === 'false')
assert(s.flags.falseSpent === 'silas_tip', 'outcast spends the tip on the false trail')

s = newGame('outcast')
s = pick(s, 'stand')
s = pick(s, 'hunger')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'ridge Hunger button starts Cache Run')
s = pick(s, 'go')
s = pick(s, 'silas')
s = pick(s, 'skip')
s = pick(s, 'news')
assert(s.sceneId === 'ch1:sybella', 'outcast reaches Sybella poker')
assert(ids(s).includes('maw'), 'Approach is a first-class Sybella exit')
assert(ids(s).includes('brand'), 'outcast gets a hunt-mark, not a bargain')
assert(!ids(s).includes('bargain'), 'Sybella does not bargain with Dune-Strays')
assert(!ids(s).includes('bargain-drop'), 'Sybella does not take a furnace Drop from Strays')
assert(ids(s).includes('hollow'), 'Silas tip can bait Hollows')
s = pick(s, 'maw')
assert(s.sceneId === 'ch1:land' && s.flags.chapter1Done, 'push climax lands the chapter')
assert(s.flags.climax === 'push', 'outcast Maw push is a climax')
assert(!s.flags.sybellaBargain, 'outcast push is hunt, not a bargain')
s = pick(s, 'hub')
assert(s.hubId === 'redmaw' && s.sceneId === 'maw:rim', 'outcast enters Red Maw Approach')
assert(s.sceneId !== 'ch1:sybella' && s.sceneId !== 'spine:ridge', 'no bounce back to Spine or Sybella')

s = newGame('outcast')
s = pick(s, 'stand')
s = pick(s, 'shade')
s = pick(s, 'talk')
s = pick(s, 'cache')
assert(ids(s).includes('now'), 'Silas Maw talk can start Cache Run without returning to shade')
s = pick(s, 'now')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'Kallik heading walks now')
s = pick(s, 'go')
s = pick(s, ids(s).includes('silas') ? 'silas' : 'stilts')
if (s.sceneId === 'ch1:ossa-meet') s = pick(s, 'skip')
if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
if (s.sceneId === 'ch1:zafir') {
  s = interpret(s, 'walk the red maw heading')
  assert(s.sceneId === 'ch1:sybella', 'Zafir maw-talk advances to Sybella, does not sit the cairn')
}
if (s.sceneId === 'ch1:sybella') {
  s = interpret(s, 'take the maw approach')
  assert(s.sceneId === 'ch1:land' && s.flags.chapter1Done, 'typing maw at Sybella lands the chapter')
}
assert(s.hubId !== 'spine', 'climax does not bounce to the Spine')

s = newGame('outcast')
s = pick(s, 'stand')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
s = pick(s, 'silas')
assert(ids(s).includes('vial'), 'empty vial still a verb if unfilled')
s = pick(s, 'vial')
assert(s.flags.ossaAlly && s.flags.emptyShown, 'empty-vial honesty allies Ossa')

s = newGame('vessel')
s = pick(s, 'keep')
assert(s.hubId === 'threshold')
assert(s.equipped.weapon === 'rusted_dagger' && s.equipped.armor === 'ceremonial_cloth', 'Vessel starts with dagger and cloth equipped')
assert(s.heat.seekers >= 4, 'opening + start heat = thalia pressure')
assert(s.items.oram_map === 1 && s.items.rusted_dagger === 1)
s = travelTo(s, 'thresh:guard')
s = pick(s, 'talk')
assert(ids(s).includes('dagger'), 'guard dagger verb')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(ids(s).includes('oram'), 'cache run oram heading')
s = pick(s, 'oram')
assert(s.flags.oramHeading, 'oram heading flag')
s = pick(s, 'skip')
assert(s.sceneId === 'ch1:zafir')
assert(ids(s).includes('oram'), 'zafir oram map skip fee')
assert(ids(s).includes('dagger'), 'zafir dagger threaten')
s = pick(s, 'oram')
assert(s.flags.zafirPaid, 'map shown counts as paid')
assert(s.items.oram_map === 1, 'oram map kept')
assert(s.sceneId === 'ch1:sybella')
assert(ids(s).includes('bargain'), 'Vessel may bargain — Seekers-only')
const flee = visibleChoices(s).find((c) => c.id === 'flee')
assert(flee, 'flee exists')
s = pick(s, 'flee')
assert(s.flags.climax === 'flee', 'flee is spend+heat climax')
assert(s.heat.seekers >= 6, 'flee bruises seeker heat')
assert(s.sceneId === 'ch1:land')
assert(bodyOf(s).includes('lungs') || bodyOf(s).includes('weather'), 'flee consequence on land')

s = newGame('outcast')
s = pick(s, 'stand')
s = travelTo(s, 'spine:well')
assert(s.sap === 1, 'first walk bites sap')
s = travelTo(s, 'spine:hound')
assert(sceneOf(s).kind === 'crisis' || s.sap === 0, 'second walk empties or crises')
if (sceneOf(s).kind === 'crisis') {
  assert(s.sceneId === 'crisis:spine', 'authored spine crisis')
  s = pick(s, 'up')
  assert(s.sap === 3, 'crisis restores sap')
}

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: -8, goto: 'camp:cages' })
assert(sceneOf(s).kind === 'crisis', 'empty sap is authored crisis')
assert(s.sceneId === 'crisis:camp')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'inside')
s = pick(s, 'station')
assert(s.sceneId === 'camp:guard', 'button-only prisoner reaches the station')
s = pick(s, 'sabotage')
s = pick(s, 'do')
assert(s.items.ironwood_baton === 1, 'loot shock-baton from the downed station')
assert(s.sceneId === 'camp:bay', 'sabotage dumps you in the bay')
s = pick(s, 'hotwire')
assert(ids(s).includes('ride-blind') || ids(s).includes('ride'), 'bay ride after hotwire')
s = ids(s).includes('ride-blind') ? pick(s, 'ride-blind') : pick(s, 'ride')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'button-only prisoner starts Cache Run')
s = pick(s, 'go')
s = pick(s, ids(s).includes('wrench') ? 'wrench' : 'stilts')
if (s.sceneId === 'ch1:ossa-meet') {
  s = pick(s, ids(s).includes('wrench') ? 'wrench' : 'skip')
}
if (s.sceneId === 'ch1:ossa-talk') s = pick(s, 'on')
if (s.sceneId === 'ch1:ossa-rob') s = pick(s, 'go')
if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
if (s.sceneId === 'ch1:zafir') s = pick(s, ids(s).includes('scrip') ? 'scrip' : 'news')
if (s.sceneId === 'ch1:sybella') {
  assert(!ids(s).includes('bargain'), 'prisoner has no Sybella bargain')
  s = pick(s, ids(s).includes('maw') ? 'maw' : 'brand')
}
if (s.sceneId === 'ch1:hollow') s = pick(s, 'on')
assert(s.sceneId === 'ch1:land' || s.flags.chapter1Done, 'button-only prisoner lands Cache Run')
if (s.sceneId === 'ch1:land') s = pick(s, 'hub')
assert(s.hubId === 'redmaw', 'button-only prisoner reaches Red Maw Approach')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { enterHub: 'redmaw', goto: 'maw:rim' })
s = applyEffect(s, { sap: -8, goto: 'maw:rim' })
assert(s.sceneId === 'crisis:maw', 'empty sap on the Approach is authored Maw crisis')
assert(!bodyOf(s).toLowerCase().includes('almost tender'), 'Sybella does not tenderly feed Cartel mouths')
assert(ids(s).includes('up'), 'Cartel crisis stands without her hand')
assert(!ids(s).includes('up-vessel'), 'her Drop is Seekers-only')

s = newGame('prisoner')
s = pick(s, 'pens')
assert(bodyOf(s).includes('cybernetic brass jaw'), 'first Oil-Tooth meet is the full card')
assert(ids(s).includes('who-oiltooth'), 'who-is choice on hub NPC')
s = interpret(s, 'who is oil-tooth')
assert(s.flash?.includes('cybernetic brass jaw'), 'who is Oil-Tooth returns the full card')
assert(s.flags.metOilTooth, 'asking who marks the meet')
assert(!bodyOf(s).includes('cybernetic brass jaw'), 'later pens show what he is doing now')
s = interpret(s, 'xyzzy poetry please')
assert(s.flash?.toLowerCase().includes('miss'), 'free-text miss is named a miss')

s = newGame('prisoner')
s = pick(s, 'pens')
const beforeScrap = (s.items.scrap ?? 0) + (s.items.glints ?? 0) + (s.items.vial_drop ?? 0) + (s.items.scrip ?? 0)
s = scavenge(s)
const afterScrap = (s.items.scrap ?? 0) + (s.items.glints ?? 0) + (s.items.vial_drop ?? 0) + (s.items.scrip ?? 0)
assert(afterScrap > beforeScrap, 'Scavenge yields saleable loot')
s = scavenge(s)
assert(s.flash?.toLowerCase().includes('already'), 'same-patch Scavenge is sticky, not infinite')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:vents')
s = skim(s)
assert((s.items.vial_drop ?? 0) >= 1, 'risky skim yields a Drop')
assert(s.heat.cartel >= 4, 'skim costs Cartel Heat')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:wire')
assert(bodyOf(s).includes('diminutive merchant'), 'first Kaelen sighting is the full card')
s = interpret(s, 'who is kaelen')
assert(s.flash?.includes('diminutive merchant'), 'who is Kaelen returns the full card')
assert(/\bthey\b/i.test(s.flash ?? ''), 'Kaelen card uses they')
assert(!/(\bshe\b|\bher\b)/i.test(s.flash ?? ''), 'Kaelen is not she')
s = pick(s, 'kaelen')
assert(sceneOf(s).speaker === 'Kaelen the Sifter', 'Kaelen talk after the card')
assert(!bodyOf(s).includes('diminutive merchant'), 'later Kaelen is only what they are doing now')
s = applyEffect(s, { add: { scrap: 1 } })
assert(ids(s).includes('drop'), 'scrap→Drop still on the counter')
s = pick(s, 'drop')
assert((s.items.vial_drop ?? 0) >= 1, 'Kaelen still trades scrap for a Drop')

let dropHunt = newGame('prisoner')
dropHunt = pick(dropHunt, 'pens')
let foundDrop = false
for (let i = 0; i < 24; i++) {
  const roll = rollScavenge(dropHunt)
  if (roll.drop) {
    foundDrop = true
    break
  }
  dropHunt = applyEffect(dropHunt, { ticks: 1 })
}
assert(foundDrop, 'Scavenge can yield a Drop of Sap, not only crisis rescues')

console.log('OK', {
  prisoner: Object.keys(DOORS.prisoner.items),
  outcast: Object.keys(DOORS.outcast.items),
  vessel: Object.keys(DOORS.vessel.items),
})

void (['prisoner', 'outcast', 'vessel'] as DoorId[])

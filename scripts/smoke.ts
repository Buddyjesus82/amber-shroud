import { readFileSync } from 'node:fs'
import {
  applyEffect,
  bodyOf,
  equipItem,
  interpret,
  isChoiceOn,
  newGame,
  scavenge,
  sceneOf,
  skim,
  travelTo,
  unequipSlot,
  visibleChoices,
} from '../src/game/engine.ts'
import { DOORS, HUBS, ITEMS } from '../src/game/content/catalog.ts'
import { getScene } from '../src/game/content/index.ts'
import { PEOPLE } from '../src/game/people.ts'
import { rollScavenge } from '../src/game/scavenge.ts'
import {
  IDLE_DOOR,
  tapDoor,
  tapOverwriteAsk,
  tapOverwriteConfirm,
  tapResume,
} from '../src/game/doorPick.ts'
import type { GameState } from '../src/game/types.ts'
import { playCoverKey } from '../src/game/art.ts'
import { canTravelTo, edgeSap, HUB_MAPS, nodeIdForScene, route } from '../src/game/map.ts'
import {
  clearAllSaves,
  clearSave,
  hasDoorSave,
  lastSavedAt,
  lastSavedDoor,
  lastWriteStatus,
  listSaves,
  loadDoor,
  loadSave,
  peekLegacySave,
  plantLegacySave,
  clearSessionCache,
  clearLocalDiskOnly,
  flushSave,
  hydrateSaves,
  writeSave,
} from '../src/game/save.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function dismissFight(s: GameState): GameState {
  if (!s.flags.encounterHere) return s
  if (!s.flags.encounterDone) s = applyEffect(s, { resolveEncounter: 'skip' })
  if (s.flags.encounterDone) {
    const row = visibleChoices(s).find((x) => x.id === 'enc-continue')
    if (row) s = applyEffect(s, row.effects)
  }
  return s
}

function pick(s: GameState, id: string) {
  if (s.flags.encounterHere && id !== 'enc-fight' && id !== 'enc-skip' && id !== 'enc-cloak' && id !== 'enc-continue') {
    s = dismissFight(s)
  }
  if (s.flags.hunterHere && (s.hubId === 'redmaw' || s.sceneId.startsWith('maw:')) && !id.startsWith('sybella-')) {
    s = applyEffect(s, { returnHunterFrom: true, unsetFlag: ['hunterHere', 'hunterFrom'] })
  }
  if (
    s.flags.hunterHere &&
    (s.sceneId === 'camp:wire' || s.sceneId.startsWith('camp:kaelen')) &&
    !id.startsWith('hunter-')
  ) {
    s = applyEffect(s, { returnHunterFrom: true, unsetFlag: ['hunterHere', 'hunterFrom'] })
  }
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

function openShop(s: GameState, shelf: 'buy' | 'sell') {
  const id = shelf === 'buy' ? 'shop-buy' : 'shop-sell'
  if (ids(s).includes(id)) return pick(s, id)
  if (s.flags.shopShelf === shelf) return s
  if (ids(s).includes('shop-back')) s = pick(s, 'shop-back')
  return pick(s, id)
}

function prisonerToSybella(s: GameState): GameState {
  s = pick(s, 'go')
  assert(s.sceneId === 'ch1:p-pipe', `prisoner Hunger is the Cartel fence (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('wrench') ? 'wrench' : 'crawl')
  assert(s.sceneId === 'ch1:p-clerk', `prisoner meets Clerk Rell (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('scrip') ? 'scrip' : 'bolt')
  assert(s.sceneId === 'ch1:p-oil', `prisoner meets Oil-Tooth on the stolen hull (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('ride') ? 'ride' : ids(s).includes('tag') ? 'tag' : 'walk')
  assert(s.sceneId === 'ch1:p-ossa', `prisoner meets Ossa as escaped property (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('wrench') ? 'wrench' : 'skip')
  if (s.sceneId === 'ch1:ossa-talk') s = pick(s, 'on')
  if (s.sceneId === 'ch1:ossa-rob') s = pick(s, 'go')
  if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
  return s
}

function outcastToSybella(s: GameState): GameState {
  s = pick(s, 'go')
  assert(s.sceneId === 'ch1:o-noon', `outcast Hunger is noon country (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('silas') ? 'silas' : 'noon')
  if (s.sceneId === 'ch1:o-silas') s = pick(s, 'on')
  assert(s.sceneId === 'ch1:o-tax', `outcast meets Nim the Cut-Fee (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('tip') ? 'tip' : 'run')
  assert(s.sceneId === 'ch1:o-ossa', `outcast meets Ossa as kin (got ${s.sceneId})`)
  s = pick(s, 'skip')
  if (s.sceneId === 'ch1:ossa-talk') s = pick(s, 'on')
  if (s.sceneId === 'ch1:ossa-rob') s = pick(s, 'go')
  if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
  return s
}

function vesselToSybella(s: GameState): GameState {
  s = pick(s, 'go')
  assert(s.sceneId === 'ch1:v-hymn', `vessel Hunger is the hymn-road (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('oram') ? 'oram' : 'hymn')
  assert(s.sceneId === 'ch1:v-runners', `vessel meets Seeker runners (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('cloth') ? 'cloth' : ids(s).includes('bolt') ? 'bolt' : 'map')
  assert(s.sceneId === 'ch1:v-zafir', `vessel meets Zafir who will not shop a cup (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('oram') ? 'oram' : 'news')
  if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
  return s
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
    if (cur.flags.encounterHere) cur = dismissFight(cur)
    if (cur.flags.hunterHere && (cur.hubId === 'redmaw' || cur.sceneId.startsWith('maw:'))) {
      cur = applyEffect(cur, { returnHunterFrom: true, unsetFlag: ['hunterHere', 'hunterFrom'] })
    }
    cur = travelTo(cur, dest)
    if (cur.flags.encounterHere) cur = dismissFight(cur)
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
assert(!/(\bshe\b|\bher\b)/i.test(PEOPLE.kaelen.later['thresh:kaelen'] ?? ''), 'Threshold later card is they/them')
assert(PEOPLE.kaelen.scenes.includes('thresh:kaelen'), 'who-is Kaelen knows Cup-Shadow')
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('kit-strip'),
  'kit strip removed from play',
)
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('hub-act'),
  'Scavenge is not a fat pinned hub button',
)
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('scavenge-chip'),
  'Scavenge is not a Heat-row chip',
)
assert(
  !readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('Who is'),
  'no dedicated Who is button',
)
assert(
  readFileSync(new URL('../src/components/TitleScreen.tsx', import.meta.url), 'utf8').includes('Jeramie Algieri'),
  'title credit names Jeramie Algieri',
)
assert(
  readFileSync(new URL('../src/components/TitleScreen.tsx', import.meta.url), 'utf8').includes("Gamer NERD"),
  'title credit carries Gamer NERD\'s Human',
)
assert(
  !readFileSync(new URL('../src/components/TitleScreen.tsx', import.meta.url), 'utf8').includes('bigjerm21'),
  'title credit is not the handle',
)
assert(
  readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('who is kaelen'),
  'Do placeholder still teaches who is',
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
s = openShop(s, 'buy')
s = pick(s, 'drop')
assert((s.items.vial_drop ?? 0) >= 1, 'scrap buys a Drop of Oasis Sap')
s = pick(s, 'shop-back')
s = pick(s, 'rumors')
s = pick(s, 'rumor-side')
s = pick(s, 'relic')
assert(
  s.sceneId === 'camp:kaelen-rumors' || s.sceneId === 'camp:kaelen' || s.sceneId === 'camp:wire',
  `relic rumor stays on the Wire (got ${s.sceneId})`,
)
assert(s.flags.relicRumor, 'paid scrap for the Valerius relic heading')
assert(s.sceneId !== 'camp:yard' && s.sceneId !== 'camp:relic', 'buying the relic rumor does not dump you in the Yard')
assert(!canTravelTo(s, 'camp:yard'), 'Map still refuses Wire→Yard')
{
  const blockedYard = travelTo(s, 'camp:yard')
  assert(blockedYard.sceneId === s.sceneId, 'travelGate keeps you on the Wire after the relic lead')
  assert(blockedYard.flash?.toLowerCase().includes('no road'), 'Wire→Yard explains the missing road')
}
assert(ids(s).includes('relic-walk'), 'Walk the Yard is an explicit gated choice')
{
  const tried = pick(s, 'relic-walk')
  assert(tried.sceneId === s.sceneId, 'walk-the-Yard uses the gate — no silent teleport')
  s = tried
}
s = walkTo(s, 'camp:yard')
assert(s.sceneId === 'camp:yard', 'Yard for the hoard is Map-connected travel')
assert(ids(s).includes('relic'), 'hoard is a Yard choice after the rumor')
s = pick(s, 'relic')
assert(s.sceneId === 'camp:relic', 'hoard beat is local to the Yard')
s = pick(s, 'take')
assert(s.flags.relicTaken, 'looting the hoard')
assert(s.sceneId === 'camp:yard', 'leaving the hoard stays in the Yard')
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
s = pick(s, 'glint')
s = pick(s, 'rumor-intel')
s = pick(s, 'hunger-paid')
assert(s.flags.hungerKnown, 'paid Glint intel')
s = applyEffect(s, { sap: 6, pressure: -20 })
s = walkTo(s, 'camp:guard')
s = pick(s, 'sabotage')
s = pick(s, 'do')
assert(s.flags.guardDown, 'sabotage guard station')
s = pick(s, 'hotwire')
assert(s.flags.striderHot, 'Oil-Tooth hotwires the Strider')
s = applyEffect(s, { sap: 4 })
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(s.sceneId === 'ch1:p-pipe', 'prisoner beat 1 is the last Cartel fence')
assert(ids(s).includes('wrench'), 'cache run wrench branch from Oil-Tooth kit')
assert(!ids(s).includes('silas'), 'prisoner fence has no Silas cut')
assert(!ids(s).includes('oram'), 'prisoner fence has no Oram heading')
s = pick(s, 'wrench')
assert(s.flags.wrenchCut, 'wrench cut flag')
assert(s.sceneId === 'ch1:p-clerk', 'prisoner meets Clerk Rell, not Ossa yet')
assert(ids(s).includes('scrip'), 'Rell takes scrip as fake papers')
s = pick(s, 'scrip')
assert(s.sceneId === 'ch1:p-oil', 'Oil-Tooth is on the stolen hull, not a cairn shop')
s = pick(s, 'walk')
assert(s.sceneId === 'ch1:p-ossa', 'Ossa on escape terms')
assert(ids(s).includes('wrench'), 'ossa wrench lash still a tool')
s = pick(s, 'wrench')
assert(s.flags.ossaAlly, 'wrench lash allies Ossa')
assert(s.sceneId === 'ch1:sybella', 'prisoner skips Zafir and still spends at Sybella')
assert(ids(s).includes('false'), 'false trail available')
s = pick(s, 'false')
assert(s.flags.climax === 'false', 'climax is spend')
assert(s.flags.falseSpent, 'false trail consumed kit')
assert(s.sceneId === 'ch1:land', 'land after spend')
s = pick(s, 'hub')
assert(s.hubId === 'redmaw', 'red maw hub')

s = newGame('outcast')
assert(s.sap === 2, 'outcast starts thin')
{
  const button = pick(s, 'stand')
  for (const typed of ['stand up into the noon', 'stand up', 'into the noon']) {
    const viaDo = interpret(s, typed)
    assert(viaDo.sceneId === button.sceneId, `Do "${typed}" walks the same road as the button`)
    assert(viaDo.hubId === button.hubId, `Do "${typed}" enters the Spine like the button`)
    assert(viaDo.flash === button.flash, `Do "${typed}" uses the button flash`)
    assert(!/miss/i.test(viaDo.flash ?? ''), `Do "${typed}" is not a miss`)
  }
  const miss = interpret(s, 'xyzzy poetry please')
  assert(/miss/i.test(miss.flash ?? ''), 'garbage Do on First Drop is still a miss')
}
{
  const open = newGame('prisoner')
  const button = pick(open, 'pens')
  const viaDo = interpret(open, 'sit up')
  assert(viaDo.sceneId === button.sceneId && viaDo.hubId === button.hubId, 'Do sit up is the Prisoner button')
}
{
  const open = newGame('vessel')
  const button = pick(open, 'keep')
  const viaDo = interpret(open, 'walk the court')
  assert(viaDo.sceneId === button.sceneId && viaDo.heat.seekers === button.heat.seekers, 'Do walk the court is the Vessel button')
}
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
assert(s.sceneId === 'ch1:o-noon', 'outcast beat 1 is noon country')
assert(ids(s).includes('silas'), 'cache run silas branch')
assert(!ids(s).includes('wrench'), 'outcast cannot wrench the noon slope')
assert(!ids(s).includes('oram'), 'outcast noon has no Oram heading')
const sapBeforeCut = s.sap
s = pick(s, 'silas')
assert(s.sap === sapBeforeCut, 'silas cut does not spend sap')
assert(s.sceneId === 'ch1:o-silas', 'Silas is on the cut, tent packed')
s = pick(s, 'on')
assert(s.sceneId === 'ch1:o-tax', 'Nim collects the shade-road')
assert(ids(s).includes('tip'), 'Nim reads Silas scratch as a password — tip stays a tool')
s = pick(s, 'tip')
assert(s.items.silas_tip === 1, 'showing the scratch does not spend the tip')
assert(s.sceneId === 'ch1:o-ossa', 'Ossa as kin, not a stranger on sticks')
s = pick(s, 'skip')
assert(s.sceneId === 'ch1:sybella')
assert(ids(s).includes('false'), 'tip or ossa still gates false trail')
s = pick(s, 'false')
assert(s.flags.climax === 'false')
assert(s.flags.falseSpent === 'silas_tip', 'outcast spends the tip on the false trail')

s = newGame('outcast')
s = pick(s, 'stand')
s = pick(s, 'hunger')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'ridge Hunger button starts Cache Run')
s = outcastToSybella(s)
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
s = outcastToSybella(s)
assert(s.sceneId === 'ch1:sybella', 'outcast spoke still lands at Sybella')
s = interpret(s, 'take the maw approach')
assert(s.sceneId === 'ch1:land' && s.flags.chapter1Done, 'typing maw at Sybella lands the chapter')
assert(s.hubId !== 'spine', 'climax does not bounce to the Spine')

s = newGame('outcast')
s = pick(s, 'stand')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1, sap: 4 })
s = pick(s, 'go')
s = pick(s, 'noon')
assert(s.sceneId === 'ch1:o-tax', 'unfilled vial still walks Nim')
s = pick(s, 'run')
assert(ids(s).includes('vial'), 'empty vial still a verb if unfilled')
s = pick(s, 'vial')
assert(s.flags.ossaAlly && s.flags.emptyShown, 'empty-vial honesty allies Ossa')
assert(s.flags.ossaKin, 'Outcast Ossa is kin-height, not a cage-smell meet')

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
assert(s.sceneId === 'ch1:v-hymn', 'vessel beat 1 is the hymn-road')
assert(ids(s).includes('oram'), 'cache run oram heading')
assert(!ids(s).includes('wrench'), 'vessel hymn-road has no Cartel grate')
assert(!ids(s).includes('silas'), 'vessel hymn-road has no Silas cut')
s = pick(s, 'oram')
assert(s.flags.oramHeading, 'oram heading flag')
assert(s.sceneId === 'ch1:v-runners', 'Seeker runners, not Ossa')
s = pick(s, ids(s).includes('cloth') ? 'cloth' : 'bolt')
assert(s.sceneId === 'ch1:v-zafir')
assert(ids(s).includes('oram'), 'Zafir still sees Oram map — will not shop a cup')
assert(ids(s).includes('dagger'), 'zafir dagger threaten')
assert(ids(s).includes('news'), 'free news is the walk when he will not sell a heading')
s = pick(s, 'oram')
assert(s.flags.zafirCup, 'cup-hostile cairn, not a paid shop beat')
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

s = newGame('vessel')
s = pick(s, 'keep')
s = applyEffect(s, { sap: 6, startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = vesselToSybella(s)
assert(s.sceneId === 'ch1:sybella' && ids(s).includes('bargain'), 'vessel helper still lands Seekers-only bargain')

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
s = prisonerToSybella(s)
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
assert(!ids(s).some((id) => id.startsWith('who-')), 'no dedicated Who is button')
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
assert(ids(s).includes('shop-buy'), 'Kaelen counter offers Buy')
s = openShop(s, 'buy')
assert(ids(s).includes('drop'), 'scrap→Drop is on the Buy shelf')
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

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
assert(ids(s).includes('inside'), 'first Oil-Tooth pitch offers the inside job')
s = pick(s, 'leave')
assert(!s.flags.jaxsonInside && !s.items.wrench, 'leaving the pitch does not take the job')
assert(ids(s).includes('inside'), 'stall still offers the job after you walk off')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
assert(s.sceneId === 'camp:kaelen' && !s.flags.jaxsonInside, 'Kaelen is open without sabotage')
assert(ids(s).includes('rumors'), 'Kaelen counter works before the vent job')
s = pick(s, 'back')
s = walkTo(s, 'camp:lean')
assert(ids(s).includes('inside'), 'return to the stall still takes the job')
s = pick(s, 'inside')
assert(s.flags.jaxsonInside && s.items.wrench === 1, 'job stays takeable after Kaelen')
assert(s.sceneId === 'camp:lean', 'accepting at the stall stays at the stall')
assert(ids(s).includes('station'), 'accepted job offers the west vent from the stall')

s = newGame('prisoner')
s = pick(s, 'pens')
s = interpret(s, 'sabotage vent pipes')
assert(s.flags.jaxsonInside && s.items.wrench === 1, 'Do sabotage vent pipes takes the job')
assert(s.sceneId === 'camp:guard', 'Do sabotage routes to the station')
s = interpret(s, 'west steam-vent')
assert(s.sceneId === 'camp:sabotage', 'Do west steam-vent starts the beat at the station')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'leave')
s = interpret(s, 'take the inside job')
assert(s.flags.jaxsonInside && s.sceneId === 'camp:lean', 'Do take-the-job accepts without leaving the stall')
s = applyEffect(s, { sap: 4 })
s = walkTo(s, 'camp:yard')
assert(ids(s).includes('station'), 'Yard offers the station after the job')
s = interpret(s, 'guard station')
assert(s.sceneId === 'camp:guard', 'Do guard station from the Yard walks the job')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:vents')
s = interpret(s, 'sabotage the guard station')
assert(s.flags.jaxsonInside, 'Do sabotage from the vents takes the open job')
assert(s.sceneId === 'camp:guard', 'Do sabotage from the vents reaches the station')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
s = interpret(s, 'sabotage vent pipes')
assert(s.flags.jaxsonInside && s.items.wrench === 1, 'Do sabotage at Kaelen still takes the job')
assert(s.sceneId === 'camp:kaelen', 'Do sabotage at Kaelen does not yank you off the Wire')

s = newGame('prisoner')
s = pick(s, 'pens')
const pensAfter = scavenge(s)
assert(pensAfter.sceneId === 'camp:cages', 'pens Scavenge stays in the pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:yard')
const yardId = s.sceneId
s = scavenge(s)
assert(s.sceneId === yardId, 'Yard Scavenge stays Yard')
s = walkTo(s, 'camp:vents')
const ventsId = s.sceneId
s = scavenge(s)
assert(s.sceneId === ventsId, 'vents Scavenge stays at the vents')
s = applyEffect(s, { sap: 4 })
s = walkTo(s, 'camp:wire')
assert(s.sceneId === 'camp:wire', 'walk lands on the Wire')
const wireId = s.sceneId
s = scavenge(s)
assert(s.sceneId === wireId && s.hubId === 'camp04', 'Wire Scavenge stays on the Wire')
assert(s.sceneId !== 'camp:yard', 'Wire Scavenge never dumps you in the Yard')
s = pick(s, 'kaelen')
const kaelenId = s.sceneId
s = scavenge(s)
assert(s.sceneId === kaelenId, 'Kaelen Scavenge stays at Kaelen')
s = { ...s, sap: 0, pressure: 12, ticks: 8 }
s = scavenge(s)
assert(s.sceneId === kaelenId, 'Scavenge never relocates even when sap is empty and hunters are close')

function stressScavenge(sceneId: string) {
  let cur = newGame('prisoner')
  cur = pick(cur, 'pens')
  cur = applyEffect(cur, { sap: 6, goto: sceneId, enterHub: 'camp04' })
  assert(cur.sceneId === sceneId, `stress starts on ${sceneId}`)
  for (const ticks of [3, 4, 7, 8, 11, 12]) {
    cur = {
      ...cur,
      sceneId,
      hubId: 'camp04',
      chapterId: null,
      sap: 0,
      pressure: 12,
      ticks,
      flags: { ...cur.flags, [`scavenge:${sceneId}`]: -99 },
    }
    const after = scavenge(cur)
    assert(after.sceneId === sceneId, `Scavenge at ${sceneId} ticks=${ticks} stayed put (got ${after.sceneId})`)
    assert(after.sceneId !== 'camp:yard' && after.sceneId !== 'camp:hunter', `Scavenge at ${sceneId} did not hunter/Yard`)
  }
  return cur
}
stressScavenge('camp:wire')
stressScavenge('camp:kaelen')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6, goto: 'camp:wire', enterHub: 'camp04' })
s = { ...s, pressure: 8, ticks: 7, flags: { ...s.flags, 'scavenge:camp:wire': -99 } }
s = scavenge(s)
assert(s.sceneId === 'camp:wire', 'threshold Scavenge stays Wire')
assert(!s.flags.hunterHere, 'Scavenge itself does not start a hunter')
const afterKaelen = applyEffect(s, { goto: 'camp:kaelen', ticks: 1, pressure: 1 })
assert(
  afterKaelen.sceneId === 'camp:kaelen' || afterKaelen.sceneId === 'camp:wire',
  `applyEffect after Wire Scavenge stayed Wire-side (got ${afterKaelen.sceneId})`,
)
assert(afterKaelen.sceneId !== 'camp:yard' && afterKaelen.sceneId !== 'camp:hunter', 'applyEffect after Scavenge is not Yard Sweep')
if (afterKaelen.flags.hunterHere) {
  assert(ids(afterKaelen).includes('hunter-hold'), 'Wire-side hunter is an in-place sweep')
  const held = pick(afterKaelen, 'hunter-hold')
  assert(held.sceneId === 'camp:kaelen' || held.sceneId === 'camp:wire', 'dismiss hunter returns Wire-side')
  assert(held.sceneId !== 'camp:yard', 'dismiss hunter is not a Yard dump')
}

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6, goto: 'camp:wire', enterHub: 'camp04' })
s = applyEffect(s, { sap: -8 })
assert(s.sceneId === 'crisis:camp', 'empty sap on the Wire is camp crisis')
assert(s.flags.crisisFrom === 'camp:wire', 'crisisFrom remembers the Wire')
s = pick(s, 'up')
assert(s.sceneId === 'camp:wire', 'crisis rescue returns to the Wire, not the stall or Yard')

s = newGame('prisoner')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
assert(!/carrying sap like a signal fire/i.test(bodyOf(s)), 'prisoner Cache Run title does not claim a signal fire at holding sap')
assert(bodyOf(s).includes('Not a lantern') || bodyOf(s).includes('holding'), 'holding sap is named honestly')
assert(bodyOf(s).includes('road is not shared') && bodyOf(s).includes('climax'), 'destination is shared; the road is not a Sap charge')
s = newGame('outcast')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
assert(!/carrying sap like a signal fire/i.test(bodyOf(s)), 'thin sap is not a signal fire')
assert(bodyOf(s).includes('thin') || bodyOf(s).includes('wick'), 'thin sap says thin')
s = newGame('vessel')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
assert(bodyOf(s).includes('signal fire'), 'warm sap may read as a signal fire')
s = newGame('prisoner')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', sap: -8 })
assert(bodyOf(s).includes('empty') || bodyOf(s).includes('not lit') || bodyOf(s).includes('dry'), 'empty sap does not claim you are lit')
assert(!/carrying sap like a signal fire/i.test(bodyOf(s)), 'empty sap is not a signal fire')

s = newGame('prisoner')
s = pick(s, 'pens')
s = interpret(s, 'hello')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'hello to Oil-Tooth is authored')
s = interpret(s, 'trade')
assert(s.flash?.toLowerCase().includes('kaelen'), 'Oil-Tooth points trade at Kaelen')
s = interpret(s, 'threaten')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'threaten Oil-Tooth is authored')
s = interpret(s, 'help')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'help Oil-Tooth is authored')
s = applyEffect(s, { sap: 6, goto: 'camp:kaelen', enterHub: 'camp04' })
s = interpret(s, 'help')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'help Kaelen is authored')
s = interpret(s, 'threaten')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'threaten Kaelen is authored')
s = interpret(s, 'who is zafir')
assert(s.flash?.toLowerCase().includes('zafir') || s.flash?.toLowerCase().includes('heading'), 'who is Zafir returns a card')
s = interpret(s, 'who is ossa')
assert(s.flash?.toLowerCase().includes('stilt'), 'who is Ossa returns a card')
s = interpret(s, 'who is sybella')
assert(s.flash?.toLowerCase().includes('kohl') || s.flash?.toLowerCase().includes('skiff'), 'who is Sybella returns a card')

s = newGame('prisoner')
s = applyEffect(s, {
  sap: 6,
  enterHub: 'redmaw',
  goto: 'maw:zafir',
  add: { glints: 4, scrap: 2 },
  flag: { zafirMet: true, chapter1Done: true },
})
assert(ids(s).includes('shop-buy'), 'Zafir counter offers Buy')
assert(ids(s).includes('shop-sell'), 'Zafir counter offers Sell')
s = openShop(s, 'buy')
assert(ids(s).includes('buy'), 'Zafir sells Drops')
assert(ids(s).includes('hide'), 'Zafir sells Hound Hide')
assert(ids(s).includes('baton'), 'Zafir sells a shock baton')
s = pick(s, 'buy')
assert(s.sceneId === 'maw:zafir', 'buying a Drop keeps you at the stall')
assert((s.items.vial_drop ?? 0) >= 1, 'Drop purchase lands')
s = interpret(s, 'trade')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'Zafir trade talk is authored')
s = pick(s, 'shop-back')
s = openShop(s, 'sell')
assert(ids(s).includes('sell-scrap'), 'Zafir buys scrap on Sell')
s = pick(s, 'sell-scrap')
assert((s.items.glints ?? 0) >= 3, 'selling scrap yields a Glint')

s = newGame('prisoner')
s = applyEffect(s, {
  sap: 6,
  enterHub: 'redmaw',
  goto: 'maw:market',
  flag: { chapter1Done: true },
  pressure: 8,
  ticks: 5,
})
assert(s.sceneId === 'maw:market', `Sybella interrupt stays on the market (got ${s.sceneId})`)
assert(s.sceneId !== 'maw:sybella-shadow' && s.sceneId !== 'maw:rim', 'Sybella interrupt does not yank to Rim')
assert(s.flags.hunterHere, 'Sybella interrupt is in-place like Valerius')
assert(ids(s).includes('sybella-hold'), 'dismiss stays put')
assert(ids(s).includes('sybella-smoke'), 'facing her is the travel choice')
assert(bodyOf(s).includes('Tick') || bodyOf(s).includes('skiff-shadow') || bodyOf(s).includes('shadow'), 'her card plays on this ground')
const syHeld = pick(s, 'sybella-hold')
assert(syHeld.sceneId === 'maw:market', 'dismiss Sybella returns to the market')
assert(!syHeld.flags.hunterHere, 'dismiss clears the overlay')
s = newGame('prisoner')
s = applyEffect(s, {
  sap: 6,
  enterHub: 'redmaw',
  goto: 'maw:lip',
  flag: { chapter1Done: true },
  pressure: 8,
  ticks: 5,
})
assert(s.sceneId === 'maw:lip', 'Sybella overlay can land on the Lip')
s = pick(s, 'sybella-smoke')
assert(s.sceneId === 'maw:sybella', 'choosing her smoke is the travel')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6, goto: 'camp:yard', enterHub: 'camp04' })
s = {
  ...s,
  flags: { ...s.flags, encounterHere: true, encounterKind: 'jackal', encounterAt: s.ticks, encounterHp: 1 },
}
assert(s.sceneId === 'camp:yard', 'forced encounter stays in the Yard')
assert(ids(s).includes('enc-fight') && ids(s).includes('enc-skip'), 'fight or skip, no dice')
assert(!bodyOf(s).includes('cooked resin'), 'encounter card does not bleed Yard prose')
assert(/Bite has to beat Hide/i.test(bodyOf(s)), 'first encounter teaches Bite/Hide/Health')
const skipped = pick(s, 'enc-skip')
assert(skipped.sceneId === 'camp:yard', 'skip stays put')
assert(skipped.flags.encounterHere && skipped.flags.encounterDone, 'skip holds the outcome card')
assert(/give the .* road/i.test(bodyOf(skipped)), 'skip card is the outcome, not the Yard')
assert(!bodyOf(skipped).includes('cooked resin'), 'skip outcome does not bleed Yard prose')
assert((skipped.items.scrap ?? 0) === (s.items.scrap ?? 0), 'skip pays no loot')
assert(skipped.flags.fightTaught, 'seeing the first card counts as taught')
const skippedOn = pick(skipped, 'enc-continue')
assert(!skippedOn.flags.encounterHere, 'On. clears the skip card')
assert(skippedOn.sceneId === 'camp:yard', 'On. returns to the Yard')
s = {
  ...skippedOn,
  flags: { ...skippedOn.flags, encounterHere: true, encounterKind: 'jackal', encounterAt: skippedOn.ticks, encounterHp: 1 },
  items: { ...skippedOn.items, shiv: 1 },
  equipped: { weapon: 'shiv' },
  sap: 6,
  health: 6,
  healthMax: 6,
}
assert(!/Bite has to beat Hide/i.test(bodyOf(s)), 'later fights skip the lecture')
assert(bodyOf(s).includes('You Bite'), 'compact card still shows compares')
const fought = pick(s, 'enc-fight')
assert(fought.sceneId === 'camp:yard', 'fight stays in the Yard')
assert(fought.flags.encounterHere && fought.flags.encounterDone, 'win holds the outcome card')
assert((fought.items.scrap ?? 0) >= 2, 'winning a jackal yields saleable scrap')
assert(fought.health < 6, 'Health takes the incoming hit, not Sap')
assert(fought.sap === 6, 'Sap is unchanged by a win')
assert(/You Bite 2 vs their Hide 1/.test(bodyOf(fought)), 'fight result shows your compare line')
assert(/Their Bite 2 vs your Hide 0/.test(bodyOf(fought)), 'fight result shows their compare line')
assert(!bodyOf(fought).includes('cooked resin'), 'outcome card does not bleed Yard prose')
assert(!(fought.flash ?? '').includes('Bite'), 'compares live on the card, not a stacked flash')
const foughtOn = pick(fought, 'enc-continue')
assert(!foughtOn.flags.encounterHere, 'On. returns to the place')
assert(/They drop/.test(foughtOn.flash ?? ''), 'hub flash is the compact loot line')
assert(!/Bite/.test(foughtOn.flash ?? ''), 'hub flash is not the full compare block')
assert(bodyOf(foughtOn).includes('cooked resin'), 'Yard prose returns after On.')

s = newGame('vessel')
s = pick(s, 'keep')
s = applyEffect(s, { goto: 'thresh:paddock', enterHub: 'threshold' })
s = {
  ...s,
  flags: { ...s.flags, encounterHere: true, encounterKind: 'jackal', encounterAt: s.ticks, encounterHp: 1 },
}
assert(!/bad architecture/i.test(bodyOf(s)), 'Vessel paddock fight does not bleed Oram/strider prose')
assert(!/Oram/i.test(bodyOf(s)), 'Vessel paddock encounter card has no Oram')
assert(/Dust-jackal|dust-jackal/i.test(bodyOf(s)), 'paddock card is the enemy')

s = newGame('vessel')
s = pick(s, 'keep')
const beforeGlints = s.items.glints ?? 0
s = {
  ...s,
  flags: { ...s.flags, encounterHere: true, encounterKind: 'pup', encounterAt: s.ticks, encounterHp: 2 },
  health: 6,
  healthMax: 6,
}
assert(/You Bite 2 vs their Hide 2/.test(bodyOf(s)), 'Vessel dagger vs pup Hide is on the card')
const loss = pick(s, 'enc-fight')
assert((loss.items.glints ?? 0) === beforeGlints, 'lose compare does not pay Glints')
assert((loss.items.scrap ?? 0) === (s.items.scrap ?? 0), 'lose compare does not pay scrap')
assert(loss.health === 3, 'Shard-pup Bite 4 vs Hide 1 deals 3 Health')
assert(loss.flags.encounterHere, 'they still stand after a scratch')
assert(/You Bite 2 vs their Hide 2 → 0/.test(bodyOf(loss)), 'Fight body is the compare, not a prose wall')
assert(/Their Bite 4 vs your Hide 1 → 3/.test(bodyOf(loss)), 'incoming compare is on the card')
const drop = pick(loss, 'enc-fight')
assert(drop.flags.encounterHere && drop.flags.encounterDone, 'dropping to 0 Health holds the outcome card')
assert(drop.health === 1, 'empty Health is a stagger, not a lock')
assert((drop.items.glints ?? 0) === beforeGlints, 'a clear loss still pays no win loot')
const dropOn = pick(drop, 'enc-continue')
assert(!dropOn.flags.encounterHere, 'On. clears a lost fight')

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  let g = newGame(door)
  assert(g.health === 6 && g.healthMax === 6, `${door} starts with full Health`)
  g = {
    ...g,
    flags: { ...g.flags, encounterHere: true, encounterKind: 'jackal', encounterHp: 1, fightTaught: true },
    equipped: { weapon: 'shiv', armor: 'dust_cloak' },
    items: { ...g.items, shiv: 1, dust_cloak: 1 },
    health: 6,
    healthMax: 6,
  }
  const won = pick(g, 'enc-fight')
  assert((won.items.scrap ?? 0) >= (g.items.scrap ?? 0) + 2, `${door} jackal drop pays scrap`)
  assert(won.flags.encounterDone, `${door} win holds the outcome card`)
  const wonOn = pick(won, 'enc-continue')
  assert(!wonOn.flags.encounterHere, `${door} On. clears the interrupt`)
}

s = newGame('prisoner')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:p-pipe', sap: 4 })
s = {
  ...s,
  flags: { ...s.flags, encounterHere: true, encounterKind: 'tick', encounterAt: s.ticks },
}
assert(ids(s).includes('enc-skip'), 'Hunger-road encounters can be declined')
s = pick(s, 'enc-skip')
assert(s.sceneId === 'ch1:p-pipe', 'skipping a fence encounter keeps the fence')
s = pick(s, 'enc-continue')
assert(s.sceneId === 'ch1:p-pipe', 'On. after a fence skip still keeps the fence')

s = newGame('vessel')
s = pick(s, 'keep')
s = applyEffect(s, {
  sap: 6,
  enterHub: 'redmaw',
  goto: 'maw:rim',
  flag: { chapter1Done: true, climax: 'bargain', sybellaHunting: true },
  pressure: 8,
})
{
  const flags = { ...s.flags, encounterHere: true, encounterKind: 'jackal', encounterHp: 1, fightTaught: true }
  delete flags.hunterHere
  delete flags.hunterFrom
  delete flags.encounterDone
  delete flags.encounterClash
  s = {
    ...s,
    ticks: 4,
    flags,
    items: { ...s.items, shiv: 1 },
    equipped: { ...s.equipped, weapon: 'shiv' },
    health: 6,
    healthMax: 6,
  }
}
const rimFight = pick(s, 'enc-fight')
assert(rimFight.sceneId === 'maw:rim', 'Maw Rim fight stays on the rim')
assert(rimFight.flags.encounterDone, 'Rim win is an outcome card')
assert(!rimFight.flags.hunterHere, 'Sybella does not land on the fight beat')
assert(!/Tick\. Tick/.test(bodyOf(rimFight)), 'outcome card is not the skiff whisper')
assert(!bodyOf(rimFight).includes('lip of rock'), 'outcome card is not the Approach intro')
assert(/They drop/.test(bodyOf(rimFight)), 'Rim outcome names the drop')
assert(ids(rimFight).includes('enc-continue') && !ids(rimFight).includes('sybella-hold'), 'only On. after the fight')
const rimOn = pick(rimFight, 'enc-continue')
assert(!rimOn.flags.encounterHere, 'On. returns to Maw Rim')
assert(!rimOn.flags.hunterHere, 'Sybella still waits for the next linger')
assert(/They drop/.test(rimOn.flash ?? ''), 'Rim hub flash is the compact loot line')
assert(!/Bite/.test(rimOn.flash ?? ''), 'Rim hub flash is not the compare block')
assert(bodyOf(rimOn).includes('lip of rock'), 'Approach body returns after On.')
assert(!bodyOf(rimOn).includes('You Bite'), 'Approach body does not keep the fight log')
assert(!/Tick\. Tick/.test(bodyOf(rimOn)), 'Sybella whisper is not stacked under the hub')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6, goto: 'camp:wire', enterHub: 'camp04', pressure: 9 })
{
  const flags = { ...s.flags, encounterHere: true, encounterKind: 'jackal', encounterHp: 1, fightTaught: true }
  delete flags.hunterHere
  delete flags.hunterFrom
  delete flags.encounterDone
  delete flags.encounterClash
  s = {
    ...s,
    ticks: 3,
    flags,
    items: { ...s.items, shiv: 1 },
    equipped: { weapon: 'shiv' },
    health: 6,
    healthMax: 6,
  }
}
const wireFight = pick(s, 'enc-fight')
assert(!wireFight.flags.hunterHere, 'Valerius does not land on the fight beat')
assert(!bodyOf(wireFight).includes('Whistles reach the Wire'), 'outcome card is not the sweep overlay')
const wireOn = pick(wireFight, 'enc-continue')
assert(!wireOn.flags.hunterHere, 'Valerius waits for the next linger')
assert(!bodyOf(wireOn).includes('Whistles reach the Wire'), 'Wire after On. is the place, not the sweep')

clearAllSaves()
let prisonerRun = newGame('prisoner')
prisonerRun = pick(prisonerRun, 'pens')
assert(prisonerRun.sceneId === 'camp:cages', 'prisoner slot at pens')
const outcastRun = newGame('outcast')
assert(outcastRun.door === 'outcast', 'outcast New Game starts Outcast')
assert(loadDoor('prisoner')?.sceneId === 'camp:cages', 'Prisoner save survives Outcast New Game')
assert(loadDoor('outcast')?.door === 'outcast', 'Outcast has its own slot')
assert(lastSavedDoor() === 'outcast', 'lastDoor tracks the last write')
assert(listSaves().includes('prisoner') && listSaves().includes('outcast'), 'title can list both doors')
assert(loadSave()?.door === 'outcast', 'Continue resumes the last door touched')
clearSave('outcast')
assert(!hasDoorSave('outcast'), 'erase Outcast only')
assert(hasDoorSave('prisoner'), 'Prisoner slot stays after Outcast erase')
assert(lastSavedDoor() === 'prisoner', 'lastDoor falls back to a remaining slot')
newGame('vessel')
assert(hasDoorSave('prisoner') && hasDoorSave('vessel') && !hasDoorSave('outcast'), 'Vessel New Game does not wipe Prisoner')
assert(loadSave()?.door === 'vessel', 'Continue follows Vessel after that write')
clearAllSaves()
assert(!loadSave() && listSaves().length === 0, 'erase all clears every door')
plantLegacySave(prisonerRun)
assert(peekLegacySave(), 'old v1 blob is planted')
const migrated = loadSave()
assert(migrated?.door === 'prisoner' && migrated.sceneId === 'camp:cages', 'v1 migrates into that door slot')
assert(!peekLegacySave(), 'legacy key is dropped after one migrate')
const afterMigrate = newGame('outcast')
assert(loadDoor('prisoner')?.sceneId === 'camp:cages', 'migrated Prisoner survives a later Outcast start')
assert(afterMigrate.door === 'outcast' && loadDoor('outcast')?.door === 'outcast', 'Outcast is a second slot')
clearAllSaves()

clearAllSaves()

const doorUi = readFileSync(new URL('../src/components/DoorSelect.tsx', import.meta.url), 'utf8')
assert(doorUi.includes('data-door-resume'), 'saved door shows a Resume control')
assert(doorUi.includes('data-door-overwrite'), 'saved door shows New / Overwrite')
assert(doorUi.includes('data-door-start'), 'overwrite confirm starts a new run')
assert(!doorUi.includes('window.confirm'), 'overwrite confirm is in-card, not a blocking dialog')
assert(DOORS.prisoner.title === 'Ironwood Break', 'Prisoner door is labeled Ironwood Break')

function fireDoor(next: ReturnType<typeof tapDoor>, onResume: (d: typeof next.door) => void, onStart: (d: typeof next.door) => void) {
  if (next.action === 'resume' && next.door) onResume(next.door)
  if (next.action === 'start' && next.door) onStart(next.door)
  return next.phase
}

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const emptyTap = tapDoor(IDLE_DOOR, [], door)
  assert(emptyTap.action === 'start' && emptyTap.door === door, `${door} empty slot starts immediately`)
  const firstTap = tapDoor(IDLE_DOOR, [door], door)
  assert(firstTap.action === undefined && firstTap.phase.kind === 'choose', `${door} saved tap asks, does not start`)
  const resumeTap = tapResume(door)
  assert(resumeTap.action === 'resume' && resumeTap.door === door, `${door} Resume fires resume`)
  const askWipe = tapOverwriteAsk(door)
  assert(askWipe.phase.kind === 'overwrite' && askWipe.action === undefined, `${door} Overwrite asks first`)
  const wipe = tapOverwriteConfirm(door)
  assert(wipe.action === 'start' && wipe.door === door, `${door} Overwrite confirm starts new`)
}

clearAllSaves()
let titleView: 'title' | 'doors' | 'play' = 'title'
titleView = 'doors'
let started: string | null = null
const emptyIronwood = tapDoor(IDLE_DOOR, listSaves(), 'prisoner')
fireDoor(emptyIronwood, () => {}, (d) => {
  started = newGame(d).sceneId
})
assert(emptyIronwood.action === 'start', 'title → New Game → Ironwood Break with no save starts')
assert(started === 'open:prisoner', 'empty Ironwood Break starts a new Prisoner run')

clearAllSaves()
let ironwood = newGame('prisoner')
ironwood = pick(ironwood, 'pens')
assert(ironwood.sceneId === 'camp:cages' && listSaves().includes('prisoner'), 'Ironwood Break now has a save')
titleView = 'title'
titleView = 'doors'
const savedTap = tapDoor(IDLE_DOOR, listSaves(), 'prisoner')
assert(savedTap.action === undefined && savedTap.phase.kind === 'choose', 'saved Ironwood Break expands; does not auto-start')
let resumedScene: string | null = null
fireDoor(tapResume('prisoner'), (d) => {
  resumedScene = loadDoor(d)?.sceneId ?? null
}, () => {})
assert(resumedScene === 'camp:cages', 'Resume Ironwood Break returns to the Prisoner save')
assert(listSaves().includes('prisoner'), 'Resume does not wipe the slot')

let overwriteStarted: string | null = null
const ask = tapOverwriteAsk('prisoner')
assert(ask.phase.kind === 'overwrite' && !ask.action, 'Overwrite requires a confirm step')
fireDoor(tapOverwriteConfirm('prisoner'), () => {}, (d) => {
  overwriteStarted = newGame(d).sceneId
})
assert(overwriteStarted === 'open:prisoner', 'Overwrite confirm starts a fresh Prisoner run')
assert(loadDoor('prisoner')?.sceneId === 'open:prisoner', 'overwrite replaces only the Prisoner slot')
assert(titleView === 'doors', 'door pick stays on the door screen until an action fires')

clearAllSaves()

const encSrc = readFileSync(new URL('../src/game/encounter.ts', import.meta.url), 'utf8')
assert(encSrc.includes("'camp:yard'"), 'Prisoner yard can roll encounters')
assert(encSrc.includes("'spine:ridge'"), 'Outcast ridge can roll encounters')
assert(encSrc.includes("'spine:hound'"), 'Outcast maw-exit can roll encounters')
assert(encSrc.includes("'thresh:court'"), 'Vessel court can roll encounters')
assert(encSrc.includes("'thresh:paddock'"), 'Vessel paddock can roll encounters')
assert(encSrc.includes("'thresh:sift'"), 'Vessel Cup-Shadow can roll encounters')
assert(encSrc.includes("'ch1:p-pipe'"), 'Prisoner fence can roll encounters')
assert(encSrc.includes("'ch1:o-noon'"), 'Outcast noon can roll encounters')
assert(encSrc.includes("'ch1:v-hymn'"), 'Vessel hymn-road can roll encounters')
assert(
  readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('hasSceneSkim'),
  'shared Skim row does not double a scene skim',
)

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { goto: 'camp:kaelen', add: { scrap: 2 } })
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Prisoner Kaelen has Buy/Sell')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Prisoner Kaelen cloak is Glint or scrap, two rows')
s = applyEffect(s, { goto: 'camp:wire' })
s = interpret(s, 'talk')
assert(/gloves|product|shelf/i.test(s.flash ?? ''), 'Do talk on the Wire hits Kaelen who is there')

s = newGame('outcast')
s = pick(s, 'stand')
s = applyEffect(s, { goto: 'spine:kaelen', add: { scrap: 2 } })
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Outcast Kaelen has Buy/Sell like Prisoner')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Outcast Kaelen cloak is Glint or scrap, two rows')
s = applyEffect(s, { goto: 'spine:well' })
s = interpret(s, 'talk')
assert(/gloves|product|shelf/i.test(s.flash ?? ''), 'Do talk at the well hits Kaelen who is there')

s = newGame('vessel')
s = pick(s, 'keep')
s = interpret(s, 'hello')
assert(/Vessel|cup|poured/i.test(s.flash ?? ''), 'Do hello at Court hits Thalia who is there')
assert(ids(s).includes('kaelen'), 'Court offers a Map walk to Cup-Shadow')
assert(canTravelTo(s, 'thresh:sift'), 'Court is connected to Cup-Shadow')
{
  const fromCell = applyEffect(s, { goto: 'thresh:cell' })
  assert(!canTravelTo(fromCell, 'thresh:sift'), 'Cell cannot teleport to Cup-Shadow')
  const blocked = travelTo(fromCell, 'thresh:sift')
  assert(blocked.sceneId === 'thresh:cell', 'travelGate keeps Vessel in the cell')
}
s = pick(s, 'kaelen')
assert(s.sceneId === 'thresh:sift', 'Court→Cup-Shadow is gated travel, not a silent hop')
s = pick(s, 'kaelen')
assert(s.sceneId === 'thresh:kaelen', 'Vessel Kaelen card is in Cup-Shadow')
assert(sceneOf(s).speaker === 'Kaelen the Sifter', 'Vessel Kaelen speaker')
assert(!/\bshe\b|\bher\b/.test(sceneOf(s).body), 'Threshold Kaelen body is not she/her')
assert(/\bthey\b/i.test(sceneOf(s).body), 'Threshold Kaelen uses they')
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Vessel Kaelen has Buy/Sell like Wire and well')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Vessel Kaelen cloak is Glint or scrap, two rows')
s = pick(s, 'shop-back')
s = pick(s, 'rumors')
assert(s.sceneId === 'thresh:kaelen-rumors', 'Vessel rumor counter is local to Cup-Shadow')
s = applyEffect(s, { add: { scrap: 1 } })
s = pick(s, 'rumor-side')
s = pick(s, 'runners')
assert(s.sceneId === 'thresh:kaelen-rumors', 'Seeker runner rumor stays at Kaelen — no Court dump')
assert(s.flags.kaelenRunnerRumor, 'paid the runner heading')
s = applyEffect(s, { add: { scrap: 1 } })
s = pick(s, 'oram-route')
assert(s.sceneId === 'thresh:kaelen-rumors', 'Oram false-route rumor stays at the counter')
assert(canTravelTo(s, 'thresh:paddock'), 'Cup-Shadow is connected to the paddock')
assert(!canTravelTo(s, 'thresh:guard'), 'Cup-Shadow cannot teleport to the Guard Post')
s = applyEffect(s, { goto: 'thresh:paddock' })
s = interpret(s, 'talk')
assert(/animals|hymn|joints|cup/i.test(s.flash ?? ''), 'Do talk at the paddock still hits Oram')

s = applyEffect(s, { goto: 'ch1:v-zafir', startChapter: 'cache-run' })
assert(!ids(s).includes('shop-buy') && !ids(s).includes('shop-sell'), 'Hunger cairn Zafir is not a shop')
assert(ids(s).includes('heading-glint') && ids(s).includes('heading-scrap'), 'cairn heading is Glint or scrap, two rows')
{
  const g = visibleChoices(s).find((c) => c.id === 'heading-glint')
  const sc = visibleChoices(s).find((c) => c.id === 'heading-scrap')
  assert(g?.label.includes('Glint'), 'heading Glint row names Glint')
  assert(sc?.label.includes('scrap'), 'heading scrap row names scrap')
  assert(!isChoiceOn(s, g?.enable), 'heading Glint locks without a Glint')
  assert(!isChoiceOn(s, sc?.enable), 'heading scrap locks without scrap')
}
{
  let paid = applyEffect(s, { add: { glints: 1, scrap: 1 } })
  const seekers = paid.heat.seekers
  paid = pick(paid, 'heading-glint')
  assert(paid.items.cache_map === 1, 'heading still grants the cache map')
  assert(!paid.items.glints, 'heading Glint row spends the Glint')
  assert(paid.items.scrap === 1, 'heading Glint row keeps scrap')
  assert(paid.flags.zafirPaid && paid.flags.zafirCup && paid.flags.zafirMet, 'heading flags stay the same')
  assert(paid.heat.seekers === seekers + 1, 'heading still raises Seekers')
  assert(paid.sceneId === 'ch1:sybella', 'paid heading still walks to Sybella')
}
{
  let scrapOnly = applyEffect(s, { add: { scrap: 1 } })
  scrapOnly = pick(scrapOnly, 'heading-scrap')
  assert(scrapOnly.items.cache_map === 1, 'scrap still buys the heading')
  assert(!scrapOnly.items.scrap, 'heading scrap row spends scrap')
  assert(scrapOnly.flags.zafirPaid, 'scrap heading still sets zafirPaid')
}
{
  let cloak = newGame('prisoner')
  cloak = pick(cloak, 'pens')
  cloak = applyEffect(cloak, { goto: 'camp:kaelen', add: { glints: 1, scrap: 2 } })
  cloak = openShop(cloak, 'buy')
  assert(ids(cloak).includes('cloak-glint') && ids(cloak).includes('cloak-scrap'), 'Kaelen cloak is two pay rows')
  cloak = pick(cloak, 'cloak-glint')
  assert(cloak.items.dust_cloak === 1, 'cloak still grants Dust Cloak')
  assert(!cloak.items.glints, 'cloak Glint row spends the Glint')
  assert((cloak.items.scrap ?? 0) === 2, 'cloak Glint row keeps scrap')
  assert(cloak.flags.kaelenSoldCloak, 'cloak once-flag stays the same')
  assert(!ids(cloak).includes('cloak-scrap'), 'buying with a Glint takes the cloak off the shelf')
}
{
  let cloak = newGame('prisoner')
  cloak = pick(cloak, 'pens')
  cloak = applyEffect(cloak, { goto: 'camp:kaelen', add: { scrap: 2 } })
  cloak = openShop(cloak, 'buy')
  cloak = pick(cloak, 'cloak-scrap')
  assert(cloak.items.dust_cloak === 1, 'two scrap still buys the cloak')
  assert(!cloak.items.scrap, 'cloak scrap row spends scrap')
  assert(cloak.flags.kaelenSoldCloak, 'scrap cloak still sets kaelenSoldCloak')
}
{
  let drop = newGame('outcast')
  drop = pick(drop, 'stand')
  drop = applyEffect(drop, { goto: 'spine:silas-drop', add: { glints: 1, scrap: 2 } })
  drop = openShop(drop, 'buy')
  assert(ids(drop).includes('drop-glint') && ids(drop).includes('drop-scrap'), 'Silas Drop is two pay rows')
  const empty = drop.items.vial_empty ?? 0
  drop = pick(drop, 'drop-glint')
  assert((drop.items.vial_drop ?? 0) >= 1, 'Silas still sells a Drop')
  assert(!drop.items.glints, 'Silas Glint row spends the Glint')
  assert((drop.items.scrap ?? 0) === 2, 'Silas Glint row keeps scrap')
  assert((drop.items.vial_empty ?? 0) === Math.max(0, empty - 1), 'Glint Drop still fills the empty vial')
  assert(drop.flags.firstDrop && drop.flags.silasGave, 'Silas Drop flags stay the same')
}
{
  let drop = newGame('outcast')
  drop = pick(drop, 'stand')
  drop = applyEffect(drop, { goto: 'spine:silas-drop', add: { scrap: 2 }, remove: { glints: 9 } })
  drop = openShop(drop, 'buy')
  const empty = drop.items.vial_empty ?? 0
  drop = pick(drop, 'drop-scrap')
  assert((drop.items.vial_drop ?? 0) >= 1, 'two scrap still buys Silas Drop')
  assert(!drop.items.scrap, 'Silas spends scrap when there is no Glint')
  assert((drop.items.vial_empty ?? 0) === empty, 'scrap Drop does not consume the empty vial')
  assert(drop.flags.firstDrop && drop.flags.silasGave, 'scrap Drop flags stay the same')
}

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  let shop = newGame(door)
  shop = applyEffect(shop, { goto: 'camp:kaelen', enterHub: 'camp04', add: { scrap: 2 } })
  assert(ids(shop).includes('shop-buy') && ids(shop).includes('shop-sell'), `${door} Kaelen Wire shop is shared`)
  shop = applyEffect(shop, { goto: 'thresh:kaelen', enterHub: 'threshold', add: { scrap: 2 } })
  assert(ids(shop).includes('shop-buy') && ids(shop).includes('shop-sell'), `${door} Kaelen Cup-Shadow shop is shared`)
  shop = applyEffect(shop, { goto: 'maw:zafir', enterHub: 'redmaw', add: { glints: 4, scrap: 2 } })
  assert(ids(shop).includes('shop-buy') && ids(shop).includes('shop-sell'), `${door} Maw Zafir shop is shared`)
}

s = newGame('prisoner')
s = applyEffect(s, {
  goto: 'maw:zafir',
  enterHub: 'redmaw',
  add: { dust_cloak: 1, hide_wrap: 1, cache_map: 1, glints: 2, scrap: 2 },
  flag: { zafirSoldHide: true },
})
s = equipItem(s, 'hide_wrap')
s = openShop(s, 'sell')
assert(ids(s).includes('sell-dust_cloak'), 'unequipped Dust Cloak can be sold')
assert(!ids(s).includes('sell-hide_wrap'), 'equipped Hound Hide stays off Sell until unequipped')
assert(!ids(s).includes('sell-cache_map'), 'quest maps are not saleable')
s = unequipSlot(s, 'armor')
assert(ids(s).includes('sell-hide_wrap'), 'unequipped Hide returns to Sell')
const glintsBefore = s.items.glints ?? 0
s = pick(s, 'sell-dust_cloak')
assert((s.items.scrap ?? 0) >= 3, 'selling a cloak pays scrap, less than buy')
assert((s.items.dust_cloak ?? 0) === 0, 'sold cloak leaves the pack')
assert((s.items.glints ?? 0) === glintsBefore, 'cloak sale pays scrap not extra Glints')

const lostVessel = getScene('ch1:trail', 'vessel')
assert(lostVessel.id === 'missing', 'unknown Hunger id still has a fallback card')
assert(!lostVessel.choices.some((c) => c.effects.goto === 'camp:yard' || c.effects.goto === 'spine:shade' || c.effects.goto === 'spine:ridge'), 'lost heading does not dump Vessel into Prisoner yard or Outcast shade')
assert(lostVessel.choices[0]?.effects.goto === 'thresh:court', 'Vessel lost heading sends them to the Court')
assert(!/find shade/i.test(lostVessel.choices[0]?.label ?? ''), 'Find shade is gone')
assert(getScene('nope:gone', 'outcast').choices[0]?.effects.goto === 'spine:ridge', 'Outcast lost heading stays on the Spine')
assert(getScene('nope:gone', 'prisoner').choices[0]?.effects.goto === 'camp:cages', 'Prisoner lost heading stays in the pens')

function reloadSlot(state: GameState) {
  writeSave(state)
  clearSessionCache()
  const loaded = loadDoor(state.door)
  assert(loaded, `${state.door} slot reloads`)
  return loaded
}

s = newGame('vessel')
s = pick(s, 'keep')
assert(s.sceneId === 'thresh:court', 'Vessel mid-hub is the Court')
s = reloadSlot(s)
assert(s.door === 'vessel' && s.sceneId === 'thresh:court', 'Vessel Continue mid-hub stays Vessel at Court')

s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:v-hymn', sap: 4 })
assert(s.sceneId === 'ch1:v-hymn', 'Vessel mid-Hunger is the hymn-road')
s = reloadSlot(s)
assert(s.door === 'vessel' && s.sceneId === 'ch1:v-hymn', 'Vessel Continue mid-Hunger stays on the hymn-road')

s = newGame('vessel')
writeSave({
  ...s,
  sceneId: 'ch1:trail',
  chapterId: 'cache-run',
  hubId: null,
  flags: { ...s.flags, hungerLocked: true, hungerKnown: true },
})
clearSessionCache()
s = loadDoor('vessel')!
assert(s.door === 'vessel', 'old trail save keeps Vessel door')
assert(s.sceneId === 'ch1:v-hymn', 'old ch1:trail migrates Vessel onto the hymn-road, not Spine shade')
assert(s.chapterId === 'cache-run', 'migrated Vessel Hunger stays in Cache Run')

s = newGame('vessel')
writeSave({
  ...s,
  sceneId: 'ch1:zafir',
  chapterId: 'cache-run',
  hubId: null,
  flags: { ...s.flags, hungerLocked: true },
})
clearSessionCache()
s = loadDoor('vessel')!
assert(s.sceneId === 'ch1:v-zafir', 'old ch1:zafir migrates Vessel to the cup-hostile stall')

s = newGame('vessel')
s = applyEffect(s, { goto: 'spine:shade', enterHub: 'spine' })
assert(s.sceneId === 'spine:shade', 'runtime can still land on an existing Spine beat')
s = reloadSlot(s)
assert(s.door === 'vessel' && s.sceneId === 'thresh:court', 'Vessel parked on Silas shade migrates to the Court')
assert(s.hubId === 'threshold', 'migrated Vessel hub is Threshold, not Spine')

s = newGame('vessel')
s = applyEffect(s, { goto: 'camp:yard', enterHub: 'camp04' })
s = reloadSlot(s)
assert(s.door === 'vessel' && s.sceneId === 'thresh:court', 'Vessel dumped in the Prisoner yard migrates to the Court')

s = newGame('prisoner')
s = pick(s, 'pens')
s = reloadSlot(s)
assert(s.door === 'prisoner' && s.sceneId === 'camp:cages', 'Prisoner Continue mid-hub stays in the pens')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:p-pipe', sap: 4 })
s = reloadSlot(s)
assert(s.door === 'prisoner' && s.sceneId === 'ch1:p-pipe', 'Prisoner Continue mid-Hunger stays on the fence')
writeSave({ ...s, sceneId: 'ch1:trail' })
clearSessionCache()
s = loadDoor('prisoner')!
assert(s.sceneId === 'ch1:p-pipe', 'old ch1:trail migrates Prisoner onto the fence')

s = newGame('outcast')
s = pick(s, 'stand')
s = reloadSlot(s)
assert(s.door === 'outcast' && s.sceneId === 'spine:ridge', 'Outcast Continue mid-hub stays on the ridge')
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:o-noon', sap: 4 })
s = reloadSlot(s)
assert(s.door === 'outcast' && s.sceneId === 'ch1:o-noon', 'Outcast Continue mid-Hunger stays in noon country')
writeSave({ ...s, sceneId: 'ch1:zafir' })
clearSessionCache()
s = loadDoor('outcast')!
assert(s.sceneId === 'ch1:sybella', 'old shared Zafir stall migrates Outcast to Sybella, not Vessel cup-shop')

clearAllSaves()
for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const run = newGame(door)
  await flushSave(run)
  clearSessionCache()
  assert(loadDoor(door)?.door === door, `${door} slot survives a RAM drop`)
}
clearAllSaves()

clearAllSaves()
let diskRun = newGame('prisoner')
diskRun = pick(diskRun, 'pens')
await flushSave(diskRun)
assert(lastWriteStatus()?.ok, 'verified disk write reports ok')
assert(lastWriteStatus()?.disk === 'both' || lastWriteStatus()?.disk === 'ls' || lastWriteStatus()?.disk === 'idb', 'write landed on at least one disk')
assert((lastSavedAt() ?? 0) > 0, 'saves have a clock, not a TTL')
assert(Date.now() - (lastSavedAt() ?? 0) < 60_000, 'no overnight expiry on a fresh save')
assert(
  !/maxAge|expiresAt|ttl\s*[:=]/i.test(readFileSync(new URL('../src/game/save.ts', import.meta.url), 'utf8')),
  'save bank has no coded TTL',
)
clearSessionCache()
assert(loadDoor('prisoner')?.sceneId === 'camp:cages', 'RAM drop still loads from localStorage')
clearSessionCache()
clearLocalDiskOnly()
assert(!loadDoor('prisoner'), 'localStorage wipe looks empty until IDB hydrate')
await hydrateSaves()
assert(loadDoor('prisoner')?.sceneId === 'camp:cages', 'IndexedDB restores the Prisoner slot after localStorage wipe')
assert(lastSavedDoor() === 'prisoner', 'Continue lastDoor returns with the IDB bank')
clearAllSaves()

function pngSize(rel: string) {
  const buf = readFileSync(new URL(rel, import.meta.url))
  assert(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${rel} is a real PNG, not a JPEG cover copy`)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}
assert(pngSize('../public/icons/icon-192.png').w === 192 && pngSize('../public/icons/icon-192.png').h === 192, 'home-screen 192 is square PNG')
assert(pngSize('../public/icons/icon-512.png').w === 512 && pngSize('../public/icons/icon-512.png').h === 512, 'home-screen 512 is square PNG')
assert(pngSize('../public/icons/apple-touch.png').w === 180 && pngSize('../public/icons/apple-touch.png').h === 180, 'apple-touch is 180 PNG from the cover')
assert(pngSize('../public/favicon.png').w === 32 && pngSize('../public/favicon.png').h === 32, 'tab favicon is 32 PNG from the cover')
assert(pngSize('../public/favicon-48.png').w === 48 && pngSize('../public/favicon-48.png').h === 48, 'tab favicon 48 is square PNG from the cover')
const man = readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
assert(man.includes('icon-192.png?v=13') && man.includes('icon-512.png?v=13'), 'manifest ships cache-busted cover-crop PNGs')
assert(!man.includes('favicon.svg'), 'manifest does not install the gold Drop SVG')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
assert(!html.includes('favicon.svg'), 'html does not link the gold Drop SVG')
assert(!html.includes('image/svg+xml'), 'html has no SVG icon link')
assert(html.includes('favicon.png?v=13'), 'tab favicon is the cover PNG')
assert(html.includes('icon-192.png?v=13') && html.includes('icon-512.png?v=13'), 'html ships cache-busted cover PNGs')
assert(html.includes('apple-touch.png?v=13'), 'apple-touch-icon is cache-busted cover crop')
{
  const p = newGame('prisoner')
  assert(playCoverKey(p, sceneOf(p)) === 'camp04', 'Prisoner opening uses Camp-04 art')
  const o = newGame('outcast')
  assert(playCoverKey(o, sceneOf(o)) === 'spine', 'Outcast opening uses Spine art')
  const v = newGame('vessel')
  assert(playCoverKey(v, sceneOf(v)) === 'threshold', 'Vessel opening uses Threshold art')
  const hunt = applyEffect(p, { goto: 'camp:hunter' })
  assert(playCoverKey(hunt, sceneOf(hunt)) === 'valerius', 'Camp hunter interrupt uses Valerius')
  const hound = applyEffect(o, { goto: 'spine:hound' })
  assert(playCoverKey(hound, sceneOf(hound)) === 'hound', 'Spine hunt uses Shard-Hound art')
  const sy = { ...v, flags: { ...v.flags, hunterHere: true }, hubId: 'redmaw', sceneId: 'maw:lip', chapterId: 'cache-run' }
  assert(playCoverKey(sy, { id: 'maw:lip', art: 'hunger' }) === 'sybella', 'Sybella overlay uses Sybella art')
  const rumors = applyEffect(p, { goto: 'camp:kaelen-rumors' })
  const rumorLabels = visibleChoices(rumors).map((c) => c.label)
  assert(rumorLabels.includes('Intel'), 'Kaelen rumor counter opens with Intel')
  assert(rumorLabels.includes('Side trouble'), 'Kaelen rumor counter opens with Side trouble')
  const intel = applyEffect(rumors, { flag: { rumorShelf: 'intel' } })
  const intelRow = visibleChoices(intel).find((c) => c.id === 'hunger-glint')
  assert(intelRow, 'Hunger lead stays on the Intel shelf without a Glint')
  assert(intelRow && !isChoiceOn(intel, intelRow.enable), 'Hunger lead locks until you have a Glint')
}

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
assert(sw.includes("CACHE = 'amber-shroud-v27'"), 'SW bumped so vendor prices split by currency')
assert(sw.includes('covers/camp04.jpg') && sw.includes('covers/sybella.jpg'), 'SW precaches door and antagonist covers')
assert(sw.includes('favicon.png') && !sw.includes('favicon.svg'), 'SW precaches the cover favicon, not the Drop SVG')
try {
  readFileSync(new URL('../public/favicon.svg', import.meta.url))
  throw new Error('public/favicon.svg still exists — Drop must not be in the icon chain')
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
}
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
assert(/\.choice \{[\s\S]*?flex:\s*0\s+0\s+auto/.test(css), 'choice rows do not shrink under split')
assert(css.includes('.choice.shop-row'), 'shop Buy/Sell rows keep their own height')
assert(css.includes('max-height: 48%'), 'play thumb docks in the viewport instead of pushing actions below the fold')
assert(/html,\s*body,\s*#root \{[\s\S]*?overflow:\s*hidden/.test(css), 'page chrome does not scroll under the play dock')
assert(css.includes('object-position: center 68%'), 'scene art crops onto the landmark, not the shared sky')
assert(css.includes('place-items: center'), 'game screen is centered on the backdrop')
assert(/html \{\s*font-size:\s*18px/.test(css), 'root type is 18px so rem UI reads on a filled phone')
assert(/\.play-screen \.scene-art \{[\s\S]*?flex:\s*1 1 auto/.test(css), 'scene art grows into leftover play space')
assert(/\.play-screen \.story \{[\s\S]*?flex:\s*0 1 auto/.test(css), 'story hugs prose so actions sit under the last line')
assert(css.includes('font-size: 1.18rem'), 'story prose is larger than the old 1.05rem')
assert(css.includes('min-aspect-ratio: 3/4'), 'wide viewports contain-scale the phone screen to the nearer edges')

console.log('OK', {
  prisoner: Object.keys(DOORS.prisoner.items),
  outcast: Object.keys(DOORS.outcast.items),
  vessel: Object.keys(DOORS.vessel.items),
})


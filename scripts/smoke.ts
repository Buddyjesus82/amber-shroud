import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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
import { equippedShell } from '../src/game/kit.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { pressureFace } from '../src/game/hunter.ts'
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

function crackVent(s: GameState): GameState {
  if (ids(s).includes('do')) return pick(s, 'do')
  if (ids(s).includes('quiet')) return pick(s, 'quiet')
  assert(!!s.flags.ventPatrol && ids(s).includes('scrap'), `watched vent is a patrol scrap (got ${ids(s).join(',')})`)
  s = pick(s, 'scrap')
  let n = 0
  while (s.flags.encounterHere && !s.flags.guardDown && n < 4) {
    s = pick(s, 'enc-fight')
    n++
  }
  assert(s.flags.guardDown, 'winning the vent scrap blinds the station')
  if (s.flags.encounterHere) s = pick(s, 'enc-continue')
  return s
}

function pick(s: GameState, id: string) {
  if (s.flags.encounterHere && id !== 'enc-fight' && id !== 'enc-skip' && id !== 'enc-cloak' && id !== 'enc-continue') {
    s = dismissFight(s)
  }
  if (
    s.flags.hunterHere &&
    !id.startsWith('sybella-') &&
    !id.startsWith('hunter-') &&
    !id.startsWith('spine-') &&
    !id.startsWith('thresh-')
  ) {
    s = applyEffect(s, { unsetFlag: ['hunterHere', 'hunterFrom'] })
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
  s = dismissFight(pick(s, 'go'))
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
  if (s.sceneId === 'ch1:ossa-fix') s = pick(s, 'thanks')
  if (s.sceneId === 'ch1:south-wind') s = pick(s, 'face')
  if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
  return s
}

function outcastToSybella(s: GameState): GameState {
  s = dismissFight(pick(s, 'go'))
  assert(s.sceneId === 'ch1:o-noon', `outcast Hunger is noon country (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('silas') ? 'silas' : 'noon')
  if (s.sceneId === 'ch1:o-silas') s = pick(s, 'on')
  assert(s.sceneId === 'ch1:o-tax', `outcast meets Nim the Cut-Fee (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('tip') ? 'tip' : 'run')
  assert(s.sceneId === 'ch1:o-ossa', `outcast meets Ossa as kin (got ${s.sceneId})`)
  s = pick(s, 'skip')
  if (s.sceneId === 'ch1:ossa-talk') s = pick(s, 'on')
  if (s.sceneId === 'ch1:ossa-rob') s = pick(s, 'go')
  if (s.sceneId === 'ch1:ossa-fix') s = pick(s, 'thanks')
  if (s.sceneId === 'ch1:south-wind') s = pick(s, 'face')
  if (s.sceneId === 'crisis:dunes') s = pick(s, 'up')
  return s
}

function vesselToSybella(s: GameState): GameState {
  s = dismissFight(pick(s, 'go'))
  assert(s.sceneId === 'ch1:v-hymn', `vessel Hunger is the hymn-road (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('oram') ? 'oram' : 'hymn')
  assert(s.sceneId === 'ch1:v-runners', `vessel meets Seeker runners (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('cloth') ? 'cloth' : ids(s).includes('bolt') ? 'bolt' : 'map')
  assert(s.sceneId === 'ch1:v-zafir', `vessel meets Zafir who will not shop a cup (got ${s.sceneId})`)
  s = pick(s, ids(s).includes('oram') ? 'oram' : 'news')
  if (s.sceneId === 'ch1:south-wind') s = pick(s, 'face')
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
    if (cur.flags.hunterHere) {
      cur = applyEffect(cur, { unsetFlag: ['hunterHere', 'hunterFrom'] })
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

assert(ITEMS.wrench.strike === 3 && ITEMS.shiv.strike === 2 && ITEMS.needle_knife.strike === 3, 'work steel is Strike 3; junk edge is Strike 2')
assert(ITEMS.ironwood_baton.strike === 4 && ITEMS.rusted_dagger.strike === 2, 'Cartel issue is Strike 4; dagger stays junk edge')
assert(ITEMS.scav_wrap.shell === 2 && ITEMS.scav_wrap.slot === 'armor', 'mid armor is Scav Wrap Shell 2')
assert(ITEMS.dust_cloak.shell === 3 && ITEMS.hide_wrap.shell === 4, 'Dust Cloak Shell 3, Hound Hide Shell 4')
assert(ITEMS.ceremonial_cloth.slot === 'garment' && ITEMS.ceremonial_cloth.shell == null, 'Vessel Cloth is garment and adds no Shell')
assert(!ITEMS.scrap.strike && !ITEMS.vial_drop.shell, 'currency is not Strike/Shell')
assert(!/(\bshe\b|\bher\b)/i.test(PEOPLE.kaelen.card), 'Kaelen card is not she/her')
assert(/\bhe\b/i.test(PEOPLE.kaelen.card), 'Kaelen card uses he')
assert(!/\bthey\b/i.test(PEOPLE.kaelen.card), 'Kaelen card is not they')
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
s = pick(s, 'look')
assert(s.flags.relicLooked, 'the latch is a gear puzzle')
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
s = crackVent(s)
assert(s.flags.guardDown, 'sabotage guard station')
s = pick(s, 'hotwire')
assert(s.flags.striderHot, 'Oil-Tooth hotwires the Strider')
s = applyEffect(s, { sap: 4 })
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(s.sceneId === 'ch1:p-pipe', 'prisoner beat 1 is the last Cartel fence')
while (s.flags.encounterHere) {
  if (ids(s).includes('enc-skip')) s = pick(s, 'enc-skip')
  else if (ids(s).includes('enc-continue')) s = pick(s, 'enc-continue')
  else break
}
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
assert(s.sceneId === 'ch1:ossa-fix', 'stilt fix offers thanks before the skiff')
s = pick(s, 'thanks')
assert(s.flags.ossaStillness, 'thanks passes Ossa\'s test')
assert(s.sceneId === 'ch1:south-wind', 'the sail shows before Sybella')
s = pick(s, 'face')
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
assert(s.sceneId === 'ch1:south-wind', 'outcast sees the sail')
s = pick(s, 'face')
assert(s.sceneId === 'ch1:sybella')
s = applyEffect(s, { add: { scrap: 1 } })
assert(ids(s).includes('false'), 'scrap in hand gates the decoy')
s = pick(s, 'false')
assert(s.flags.climax === 'false')
assert(s.flags.falseSpent === 'scrap', 'outcast throws scrap, not Silas\'s tip')

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
assert(!s.flags.hunterHere, 'entering the Approach after Sybella does not immediately re-arm her')

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
assert(s.equipped.weapon === 'rusted_dagger' && s.equipped.garment === 'ceremonial_cloth' && !s.equipped.armor, 'Vessel starts with dagger and cloth; cloth is not armor')
assert(equippedShell(s) === 0, 'worn Vessel Cloth does not add Shell')
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
assert(s.sceneId === 'ch1:south-wind' || s.sceneId === 'ch1:sybella')
if (s.sceneId === 'ch1:south-wind') s = pick(s, 'face')
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
s = crackVent(s)
assert(s.items.ironwood_baton === 1, 'loot shock-baton from the downed station')
assert(s.sceneId === 'camp:bay', 'sabotage dumps you in the bay')
assert(playCoverKey(s, sceneOf(s)) === 'oiltooth', 'lookout bay uses Oil-Tooth art')
assert(/you are the lookout/i.test(bodyOf(s)), 'lookout bay is his working beat')
assert(ids(s).includes('hotwire'), 'lookout offers the hotwire cover')
{
  const covered = interpret(s, 'talk')
  assert(/cover me/i.test(covered.flash ?? ''), 'Do talk on the lookout is Oil-Tooth')
  assert(covered.sceneId === 'camp:bay', 'lookout talk stays on the bay')
}
s = pick(s, 'hotwire')
if (s.flags.hunterHere) s = applyEffect(s, { unsetFlag: ['hunterHere', 'hunterFrom'] })
assert(playCoverKey(s, sceneOf(s)) === 'camp04', 'after the hotwire the bay is camp art again')
assert(!/you are the lookout/i.test(bodyOf(s)), 'finished hotwire is not still the lookout')
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
s = pick(s, 'jaxson')
s = pick(s, 'leave')
assert(s.flags.metOilTooth && s.sceneId === 'camp:lean', 'first Oil-Tooth talk is done at the stall')
assert(playCoverKey(s, sceneOf(s)) === 'oiltooth', 'the stall still uses Oil-Tooth art')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:bay')
assert(s.sceneId === 'camp:bay', 'Map reaches Skiff Bay after the first talk')
assert(playCoverKey(s, sceneOf(s)) === 'camp04', 'Skiff Bay uses camp art after the first talk')
assert(!/under a hull/i.test(bodyOf(s)), 'Skiff Bay does not stage Oil-Tooth after the first talk')
assert(/Pike/.test(bodyOf(s)) && /Sarn/.test(bodyOf(s)) && /Vetch/.test(bodyOf(s)), 'bay names the other prisoners')
assert(!ids(s).includes('hotwire'), 'hotwire stays off the bay until the station is down')
{
  const talked = interpret(s, 'talk to pike')
  assert(/pike/i.test(talked.flash ?? '') && !/miss/i.test(talked.flash ?? ''), 'Do talk to Pike is authored')
  assert(!talked.flags.jaxsonInside && !talked.flags.hungerKnown, 'bay talk does not open a quest')
  const named = interpret(s, 'hello sarn')
  assert(/sarn/i.test(named.flash ?? '') && !/miss/i.test(named.flash ?? ''), 'Do hello Sarn is authored')
  const absent = interpret(s, 'talk to oil-tooth')
  assert(/not under a hull/i.test(absent.flash ?? ''), 'Oil-Tooth is not working the bay after the first talk')
  const before = s.items.scrap ?? 0
  const stole = interpret(s, 'steal from pike')
  assert((stole.items.scrap ?? 0) === before + 1 && stole.flags.bayPikeTook, 'steal from Pike pays a scrap')
  assert(stole.heat.cartel > s.heat.cartel, 'steal from Pike costs Cartel Heat')
  assert(stole.flags.cartelNotice, 'stealing on the bay is cartel notice')
  const clearHunt = stole.flags.hunterHere
    ? applyEffect(stole, { unsetFlag: ['hunterHere', 'hunterFrom'] })
    : stole
  const again = interpret(clearHunt, 'rob pike')
  assert((again.items.scrap ?? 0) === (stole.items.scrap ?? 0), 'a second steal from Pike pays nothing')
  assert(again.pressure > stole.pressure, 'a second steal from Pike is a risk')
  const pocket = interpret(
    stole.flags.hunterHere ? applyEffect(stole, { unsetFlag: ['hunterHere', 'hunterFrom'] }) : stole,
    'pickpocket sarn',
  )
  assert(pocket.flags.baySarnTook && (pocket.items.scrap ?? 0) > (stole.items.scrap ?? 0), 'pickpocket Sarn pays scrap')
  const beforeSwipe = applyEffect(stole, { sap: 4 })
  const swiped = interpret(
    beforeSwipe.flags.hunterHere ? applyEffect(beforeSwipe, { unsetFlag: ['hunterHere', 'hunterFrom'] }) : beforeSwipe,
    'swipe from vetch',
  )
  assert(swiped.flags.bayVetchTook && swiped.sap < beforeSwipe.sap, 'swipe from Vetch costs Sap')
  assert(!ids(stole).some((id) => /pike|sarn|vetch/i.test(id)), 'bay prisoners stay off the buttons')
}

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'inside')
assert(s.flags.jaxsonInside && s.flags.cartelNotice && !s.flags.guardDown, 'the job is accepted before the station falls')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:bay')
assert(playCoverKey(s, sceneOf(s)) === 'camp04', 'accepted job is not yet the Skiff Bay lookout')
assert(!/you are the lookout/i.test(bodyOf(s)), 'he is not already working the bay before the sabotage')
assert(!ids(s).includes('hotwire'), 'lookout button waits for the downed station')

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
assert(/\bhe\b/i.test(s.flash ?? ''), 'Kaelen card uses he')
assert(!/\bthey\b/i.test(s.flash ?? ''), 'Kaelen card is not they')
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
if (s.flags.hunterHere) s = applyEffect(s, { unsetFlag: ['hunterHere', 'hunterFrom'] })
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
assert(s.flash?.toLowerCase().includes('have not met'), 'who is Zafir stays shut until you meet him')
s = interpret(s, 'who is ossa')
assert(s.flash?.toLowerCase().includes('have not met'), 'who is Ossa stays shut until you meet her')
s = interpret(s, 'who is sybella')
assert(s.flash?.toLowerCase().includes('have not met'), 'who is Sybella stays shut until you meet her')

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
  flag: { chapter1Done: true, huntQuiet: 8 },
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
  flag: { chapter1Done: true, huntQuiet: 8 },
  pressure: 8,
  ticks: 5,
})
assert(s.sceneId === 'maw:lip', 'Sybella overlay can land on the Lip')
s = pick(s, 'sybella-smoke')
assert(s.sceneId === 'maw:sybella', 'choosing her smoke is the travel')
assert(s.flags.hunterFrom === 'maw:lip', 'facing her smoke keeps the ground underneath')

{
  const leak = /no delay granted|cartel mouths|stray empties/i
  function atSkiff(door: GameState['door']): GameState {
    let sk = newGame(door)
    sk = applyEffect(sk, {
      sap: 6,
      health: 6,
      enterHub: 'redmaw',
      goto: 'maw:smoke',
      add: { scrap: 1 },
      flag: {
        chapter1Done: true,
        sybellaHunting: true,
        metSybella: true,
        heardWalkingAmber: true,
        huntQuiet: 8,
        encounterAt: 999,
      },
      ticks: 5,
    })
    sk = { ...sk, heat: { cartel: 7, seekers: 3, strays: 1 } }
    assert(sk.sceneId === 'maw:smoke', `${door} stands on Skiff Smoke`)
    assert(!sk.flags.hunterHere && !sk.flags.encounterHere, `${door} Skiff Smoke is not already an interrupt`)
    assert(ids(sk).includes('on'), `${door} Skiff Smoke has a way on into the Approach`)
    assert(ids(sk).includes('talk'), `${door} Skiff Smoke can still approach Sybella`)
    assert(!leak.test(bodyOf(sk)), `${door} Skiff Smoke body is not the leaked line`)
    return sk
  }

  function onward(sk: GameState): boolean {
    return ids(sk).some((id) =>
      ['look', 'hold', 'zafir', 'bury', 'listen', 'gear', 'back', 'heal', 'oram', 'talk'].includes(id),
    )
  }

  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    const smoke = atSkiff(door)
    const slipped = pick(smoke, 'on')
    assert(slipped.sceneId === 'maw:rim', `${door} can slip Skiff Smoke into the Approach`)
    assert(!slipped.flags.hunterHere, `${door} slipping the smoke does not immediately re-arm Sybella`)
    assert(ids(slipped).includes('look'), `${door} Approach still opens the ribs`)
    assert(!leak.test(slipped.flash ?? ''), `${door} slip flash is in-world`)

    const talk = pick(smoke, 'talk')
    assert(talk.sceneId === 'maw:sybella', `${door} approach opens Sybella`)
    const optionIds = ids(talk)
    assert(optionIds.includes('push'), `${door} can push past Sybella`)
    assert(optionIds.includes('false'), `${door} can throw a decoy`)
    assert(optionIds.includes('back'), `${door} can leave the smoke`)
    assert(optionIds.includes(door === 'vessel' ? 'hold' : 'help'), `${door} can ask for help`)
    if (door !== 'vessel') assert(optionIds.includes('off'), `${door} can decline her`)
    for (const id of optionIds) {
      let branch = pick(atSkiff(door), 'talk')
      const choice = visibleChoices(branch).find((c) => c.id === id)
      if (!choice || !isChoiceOn(branch, choice.enable)) continue
      const scrapBefore = branch.items.scrap ?? 0
      branch = pick(branch, id)
      assert(
        branch.sceneId !== 'maw:smoke' && branch.sceneId !== 'maw:sybella',
        `${door} ${id} leaves Skiff Smoke (got ${branch.sceneId})`,
      )
      assert(!branch.flags.hunterHere, `${door} ${id} does not immediately re-arm Sybella`)
      assert(!leak.test(branch.flash ?? '') && !leak.test(bodyOf(branch)), `${door} ${id} shows no leaked shorthand`)
      assert(onward(branch), `${door} ${id} lands with a way forward at ${branch.sceneId}: ${ids(branch).join(',')}`)
      if (id === 'false') {
        assert((branch.items.scrap ?? 0) < scrapBefore, `${door} decoy spends what was thrown`)
        assert(branch.flags.falseSpent === 'scrap', `${door} decoy records the scrap`)
        assert(!branch.flags.decoyNow, `${door} decoy flag does not stick`)
      }
      if (id === 'push') {
        assert(branch.sceneId === 'maw:rim', `${door} push past enters the Approach`)
        assert((branch.flash ?? '').includes('Seeker Heat +1'), `${door} push past keeps the Seeker Heat line`)
        assert(branch.heat.seekers === 4, `${door} push past is Seeker Heat +1`)
      }
    }
  }

  let asked = pick(atSkiff('prisoner'), 'talk')
  asked = interpret(asked, 'ask for help')
  assert(asked.sceneId !== 'maw:sybella' && !asked.flags.hunterHere, 'typing ask for help resolves and continues')
  assert(!leak.test(asked.flash ?? ''), 'ask for help is not the leaked line')
  let stepped = pick(atSkiff('prisoner'), 'talk')
  stepped = interpret(stepped, 'step out of smoke')
  assert(stepped.sceneId !== 'maw:smoke' && stepped.sceneId !== 'maw:sybella', 'step out of smoke leaves the loop')
  assert(!leak.test(stepped.flash ?? ''), 'stepping out does not show the leaked line')
  let left = pick(atSkiff('outcast'), 'talk')
  left = interpret(left, 'leave smoke')
  assert(left.sceneId !== 'maw:smoke' && !left.flags.hunterHere, 'leave smoke continues')

  let under = newGame('prisoner')
  under = applyEffect(under, {
    sap: 6,
    enterHub: 'redmaw',
    goto: 'maw:market',
    add: { scrap: 1 },
    flag: {
      chapter1Done: true,
      sybellaHunting: true,
      metSybella: true,
      huntQuiet: 8,
      encounterAt: 999,
    },
    ticks: 5,
  })
  under = { ...under, heat: { cartel: 7, seekers: 5, strays: 1 } }
  assert(under.flags.hunterHere && under.sceneId === 'maw:market', 'Sybella interrupt still takes the market')
  under = pick(under, 'sybella-smoke')
  assert(under.flags.hunterFrom === 'maw:market', 'the market is the ground under her smoke')
  const returned = pick(under, 'back')
  assert(returned.sceneId === 'maw:market' && !returned.flags.hunterHere, 'leave the smoke returns to the market')
  assert(ids(returned).includes('zafir'), 'the market still has its own way forward')
  const pushed = pick(under, 'push')
  assert(pushed.sceneId === 'maw:rim' && !pushed.flags.hunterHere, 'push past from an interrupt enters the Approach')
  assert(ids(pushed).includes('look'), 'push past can go on to the ribs')

  let hot = atSkiff('prisoner')
  hot = { ...hot, heat: { cartel: 7, seekers: 8, strays: 1 } }
  hot = pick(hot, 'on')
  assert(hot.sceneId === 'maw:rim' && hot.flags.hunterHere, 'Heat 8 may re-arm Sybella on the very next scene')

  let slip = newGame('prisoner')
  slip = applyEffect(slip, {
    sap: 6,
    startChapter: 'cache-run',
    goto: 'ch1:sybella',
    ticks: 1,
    flag: { encounterAt: 999 },
  })
  assert(bodyOf(slip).includes('The Walking Amber...'), 'Walking Amber slips on the first meeting')
  assert(slip.flags.heardWalkingAmber, 'the slip is marked heard')
  slip = pick(slip, 'maw')
  assert(slip.flags.metSybella && slip.sceneId === 'ch1:land', 'push past still lands the chapter')
  const again = applyEffect(slip, { goto: 'ch1:sybella', ticks: 1 })
  assert(!bodyOf(again).includes('The Walking Amber'), 'Walking Amber does not slip a second time')
  slip = { ...slip, flags: { ...slip.flags, huntQuiet: 9, encounterAt: 999 }, heat: { ...slip.heat, seekers: 5 } }
  slip = pick(slip, 'hub')
  assert(slip.sceneId === 'maw:rim' && !slip.flags.hunterHere, 'the first Approach does not immediately re-arm her')
  assert(ids(slip).includes('look'), 'the first Approach can go on to the ribs')

  function knockAt(door: GameState['door'], hub: 'camp04' | 'spine' | 'threshold', scene: string, cartel: number, seekers: number) {
    let kn = newGame(door)
    kn = applyEffect(kn, {
      sap: 6,
      enterHub: hub,
      goto: scene,
      add: { scrap: 1 },
      flag: { cartelNotice: true, huntQuiet: 0, encounterAt: 999 },
      ticks: 2,
    })
    kn = { ...kn, heat: { ...kn.heat, cartel, seekers }, flags: { ...kn.flags, huntQuiet: 8 } }
    return applyEffect(kn, { ticks: 1 })
  }

  const handler = knockAt('prisoner', 'camp04', 'camp:yard', 5, 0)
  assert(handler.flags.hunterHere && handler.sceneId === 'camp:yard', 'Heat 5 calls the handler in the Yard')
  assert(pressureFace(handler) === 'Hound-handler', 'Heat 5 is the handler, not Valerius')
  const handlerHeld = pick(handler, 'hunter-scrap')
  assert(!handlerHeld.flags.hunterHere, 'handler dismiss clears the knock')
  assert(handlerHeld.heat.cartel === 5, 'paying scrap does not raise Cartel Heat')
  assert(!applyEffect(handlerHeld, { ticks: 1 }).flags.hunterHere, 'handler does not re-arm on the next scene at Heat 5')

  const valerius = knockAt('prisoner', 'camp04', 'camp:yard', 7, 0)
  assert(pressureFace(valerius) === 'Valerius', 'Heat 7 brings Valerius')
  const valHeld = pick(valerius, 'hunter-scrap')
  assert(!valHeld.flags.hunterHere && valHeld.heat.cartel === 7, 'Valerius dismiss stays at Heat 7')
  assert(!applyEffect(valHeld, { ticks: 1 }).flags.hunterHere, 'Valerius does not re-arm on the next scene at Heat 7')

  const backToBack = knockAt('prisoner', 'camp04', 'camp:yard', 8, 0)
  const backHeld = pick(backToBack, 'hunter-scrap')
  assert(!backHeld.flags.hunterHere, 'Heat 8 dismiss still clears the knock')
  assert(applyEffect(backHeld, { ticks: 1 }).flags.hunterHere, 'Heat 8 can re-arm on the next scene')

  const spineVal = knockAt('outcast', 'spine', 'spine:ridge', 7, 0)
  assert(spineVal.flags.hunterHere && pressureFace(spineVal) === 'Valerius', 'Spine Heat 7 is Valerius')
  const spineHeld = pick(spineVal, 'spine-scrap')
  assert(!spineHeld.flags.hunterHere && spineHeld.sceneId === 'spine:ridge', 'Spine dismiss stays on the ridge')
  assert(!applyEffect(spineHeld, { ticks: 1 }).flags.hunterHere, 'Spine Valerius does not re-arm on the next scene at Heat 7')

  const court = knockAt('vessel', 'threshold', 'thresh:court', 0, 5)
  assert(court.flags.hunterHere && court.sceneId === 'thresh:court', 'Heat 5 calls the Court guard')
  const courtHeld = pick(court, 'thresh-hide')
  assert(!courtHeld.flags.hunterHere, 'Court dismiss clears the knock')
  assert(!applyEffect(courtHeld, { ticks: 1 }).flags.hunterHere, 'Court guard does not re-arm on the next scene at Heat 5')

  let confessed = newGame('vessel')
  confessed = applyEffect(confessed, {
    sap: 6,
    enterHub: 'threshold',
    goto: 'thresh:thalia',
    flag: { huntQuiet: 9, encounterAt: 999 },
    ticks: 4,
  })
  confessed = { ...confessed, heat: { ...confessed.heat, seekers: 2 } }
  confessed = pick(confessed, 'confess')
  assert(confessed.sceneId === 'thresh:hunter', 'confessing the cloth reaches the hunter scene')
  assert(confessed.heat.seekers === 5, 'confess climbs Seeker Heat and stays under 8')
  confessed = pick(confessed, 'oram')
  assert(
    confessed.sceneId === 'thresh:paddock' && !confessed.flags.hunterHere,
    'leaving the Court hunter does not immediately re-arm at Heat 5',
  )
}

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
assert(/Strike has to beat Shell/i.test(bodyOf(s)), 'first encounter teaches Strike/Shell/Health')
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
assert(!/Strike has to beat Shell/i.test(bodyOf(s)), 'later fights skip the lecture')
assert(bodyOf(s).includes('You Strike'), 'compact card still shows compares')
const fought = pick(s, 'enc-fight')
assert(fought.sceneId === 'camp:yard', 'fight stays in the Yard')
assert(fought.flags.encounterHere && fought.flags.encounterDone, 'win holds the outcome card')
assert((fought.items.scrap ?? 0) >= 2, 'winning a jackal yields saleable scrap')
assert(fought.health < 6, 'Health takes the incoming hit, not Sap')
assert(fought.sap === 6, 'Sap is unchanged by a win')
assert(/You Strike 2 vs their Shell 1/.test(bodyOf(fought)), 'fight result shows your compare line')
assert(/Their Strike 2 vs your Shell 0/.test(bodyOf(fought)), 'fight result shows their compare line')
assert(!bodyOf(fought).includes('cooked resin'), 'outcome card does not bleed Yard prose')
assert(!(fought.flash ?? '').includes('Strike'), 'compares live on the card, not a stacked flash')
const foughtOn = pick(fought, 'enc-continue')
assert(!foughtOn.flags.encounterHere, 'On. returns to the place')
assert(/They drop/.test(foughtOn.flash ?? ''), 'hub flash is the compact loot line')
assert(!/Strike/.test(foughtOn.flash ?? ''), 'hub flash is not the full compare block')
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
assert(/You Strike 2 vs their Shell 2/.test(bodyOf(s)), 'Vessel dagger vs pup Shell is on the card')
const loss = pick(s, 'enc-fight')
assert((loss.items.glints ?? 0) === beforeGlints, 'lose compare does not pay Glints')
assert((loss.items.scrap ?? 0) === (s.items.scrap ?? 0), 'lose compare does not pay scrap')
assert(loss.health === 2, 'Shard-pup Strike 4 vs Shell 0 deals 4 Health; cloth is not armor')
assert(loss.flags.encounterHere, 'they still stand after a scratch')
assert(/You Strike 2 vs their Shell 2 → 0/.test(bodyOf(loss)), 'Fight body is the compare, not a prose wall')
assert(/Their Strike 4 vs your Shell 0 → 4/.test(bodyOf(loss)), 'incoming compare is on the card')
const drop = pick(loss, 'enc-fight')
assert(drop.flags.downed, 'dropping to 0 Health is a downed state')
assert(drop.health === 0, 'empty Health stays at 0')
assert(!drop.flags.encounterHere, 'the downed state replaces the fight card')
assert(ids(drop).includes('wake'), 'a hand is offered when you drop')
assert((drop.items.glints ?? 0) === beforeGlints, 'a clear loss still pays no win loot')

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

const ROAD_EXCLUSIVE = ['wrench', 'needle_knife', 'hide_wrap', 'ceremonial_cloth', 'ironwood_baton'] as const

function primedFight(
  door: 'prisoner' | 'outcast' | 'vessel',
  ticks: number,
  kind: string,
  opts?: { hp?: number; taught?: boolean; arm?: boolean },
): GameState {
  const scene = door === 'outcast' ? 'spine:ridge' : door === 'vessel' ? 'thresh:court' : 'camp:yard'
  const hub = door === 'outcast' ? 'spine' : door === 'vessel' ? 'threshold' : 'camp04'
  const s = newGame(door)
  const arm = opts?.arm !== false
  return {
    ...s,
    ticks,
    sap: 6,
    pressure: 1,
    health: 6,
    healthMax: 6,
    sceneId: scene,
    hubId: hub,
    items: arm ? { ...s.items, ironwood_baton: 1 } : { ...s.items },
    equipped: arm ? { ...s.equipped, weapon: 'ironwood_baton' } : { ...s.equipped },
    flags: {
      ...s.flags,
      encounterHere: true,
      encounterKind: kind,
      encounterHp: opts?.hp ?? 1,
      ...(opts?.taught === false ? {} : { fightTaught: true }),
    },
  }
}

function gearGained(before: GameState, after: GameState): string[] {
  return (Object.keys(ITEMS) as (keyof typeof ITEMS)[]).filter(
    (id) => ITEMS[id].slot && (after.items[id] ?? 0) > (before.items[id] ?? 0),
  )
}

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const card = primedFight(door, 4, 'scavenger', { taught: false, arm: false })
  assert(/waste scavenger/i.test(bodyOf(card)), `${door} scavenger card names the robber`)
  assert(/Not fauna/.test(bodyOf(card)), `${door} scavenger card is a person, not fauna`)
  assert(/Strike has to beat Shell/i.test(bodyOf(card)), `${door} first scavenger still teaches`)
  assert(/You Strike \d+ vs their Shell 1/.test(bodyOf(card)), `${door} scavenger Shell is on the card`)
  assert(/Their Strike 2 vs your Shell/.test(bodyOf(card)), `${door} scavenger Strike is on the card`)
  const fightRow = visibleChoices(card).find((c) => c.id === 'enc-fight')
  assert(fightRow?.label === 'Fight the Waste scavenger', `${door} fight label names the scavenger`)
  assert(ids(card).includes('enc-skip'), `${door} scavenger can be skipped`)
  const skipped = pick(card, 'enc-skip')
  assert(/give the .* road/i.test(bodyOf(skipped)), `${door} scavenger skip is the outcome card`)
  assert(/No loot/.test(bodyOf(skipped)), `${door} scavenger skip names no loot`)
  assert(JSON.stringify(skipped.items) === JSON.stringify(card.items), `${door} scavenger skip pays nothing`)
  assert(skipped.equipped?.weapon === card.equipped?.weapon, `${door} skip does not equip a drop`)
  const skippedOn = pick(skipped, 'enc-continue')
  assert(!skippedOn.flags.encounterHere, `${door} On. clears a scavenger skip`)
  assert(skippedOn.sceneId === card.sceneId, `${door} scavenger skip stays on the road`)
}

{
  const scratch = primedFight('prisoner', 2, 'scavenger', { hp: 2, arm: false })
  const armed = {
    ...scratch,
    items: { ...scratch.items, shiv: 1 },
    equipped: { weapon: 'shiv' as const },
  }
  assert(/You Strike 2 vs their Shell 1/.test(bodyOf(armed)), 'shiv vs scavenger Shell is on the card')
  const stood = pick(armed, 'enc-fight')
  assert(!stood.flags.encounterDone, 'scavenger Health 2 survives one shiv hit')
  assert(/Their Health 1\/2/.test(bodyOf(stood)), 'scavenger has 2 Health')
  assert(/No loot yet/.test(bodyOf(stood)), 'a standing scavenger pays nothing')
  assert((stood.items.shiv ?? 0) === 1, 'a scratch does not drop the shiv back')
  assert((stood.items.scrap ?? 0) === (armed.items.scrap ?? 0), 'a scratch does not pay scrap')
  const killed = pick(stood, 'enc-fight')
  assert(killed.flags.encounterDone, 'second hit drops the scavenger')
  assert(/They drop/.test(bodyOf(killed)), 'scavenger kill names the drop')
  assert(killed.equipped?.weapon === 'shiv', 'a kill does not auto-equip the drop')
}

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  let sawGear = 0
  let sawEmpty = 0
  let sawWeapon = false
  let sawArmor = false
  let sawWrap = false
  let sawBoth = false
  let named = false
  for (let ticks = 0; ticks < 20; ticks++) {
    const before = primedFight(door, ticks, 'scavenger')
    const after = pick(before, 'enc-fight')
    assert(after.flags.encounterDone, `${door} scavenger kill holds the outcome`)
    assert(after.equipped?.weapon === 'ironwood_baton', `${door} scavenger gear stays in the pack`)
    assert(
      (after.equipped?.armor ?? null) === (before.equipped?.armor ?? null),
      `${door} scavenger armor drop is not auto-worn`,
    )
    const gained = gearGained(before, after)
    for (const id of ROAD_EXCLUSIVE) {
      assert((after.items[id] ?? 0) === (before.items[id] ?? 0), `${door} scavenger does not drop ${id}`)
    }
    for (const id of gained) {
      assert(
        id === 'shiv' || id === 'rusted_dagger' || id === 'dust_cloak' || id === 'scav_wrap',
        `${door} scavenger gear is junk or mid wrap, got ${id}`,
      )
    }
    if (gained.length === 0) sawEmpty++
    else {
      sawGear++
      if (gained.some((id) => ITEMS[id].slot === 'weapon')) sawWeapon = true
      if (gained.some((id) => ITEMS[id].slot === 'armor')) sawArmor = true
      if (gained.includes('scav_wrap')) sawWrap = true
      if (gained.some((id) => ITEMS[id].slot === 'weapon') && gained.some((id) => ITEMS[id].slot === 'armor')) {
        sawBoth = true
      }
      const body = bodyOf(after)
      assert(/On the body:/.test(body), `${door} gear drop names the body`)
      for (const id of gained) assert(body.includes(ITEMS[id].name), `${door} drop names ${ITEMS[id].name}`)
      named = true
      assert(/On the body:/.test(after.flags.encounterFlash as string), `${door} hub line will name the gear`)
    }
    const again = pick(primedFight(door, ticks, 'scavenger'), 'enc-fight')
    assert(JSON.stringify(again.items) === JSON.stringify(after.items), `${door} scavenger loot is seeded`)
    const skipped = pick(primedFight(door, ticks, 'scavenger'), 'enc-skip')
    assert(JSON.stringify(skipped.items) === JSON.stringify(before.items), `${door} seeded skip still pays nothing`)
  }
  assert(sawGear > 0 && sawEmpty > 0, `${door} scavenger gear is sometimes, not always`)
  assert(sawWeapon && sawArmor && sawBoth, `${door} scavenger can drop a weapon, a cloak, or both`)
  assert(sawWrap, `${door} scavenger can drop Scav Wrap`)
  assert(named, `${door} gear copy names the item`)

  let cutterGear = 0
  let cutterPlain = 0
  for (let ticks = 0; ticks < 20; ticks++) {
    const before = primedFight(door, ticks, 'cutter')
    const after = pick(before, 'enc-fight')
    const gained = gearGained(before, after)
    for (const id of gained) {
      assert(id === 'shiv' || id === 'rusted_dagger', `${door} rim cutter drops a knife, got ${id}`)
      assert(bodyOf(after).includes(ITEMS[id].name), `${door} cutter copy names ${ITEMS[id].name}`)
    }
    assert((after.items.dust_cloak ?? 0) === (before.items.dust_cloak ?? 0), `${door} cutter does not drop a cloak`)
    if (gained.length) cutterGear++
    else cutterPlain++
    assert((after.items.glints ?? 0) >= (before.items.glints ?? 0), `${door} cutter kill does not take Glints`)
  }
  assert(cutterGear > 0 && cutterPlain > 0, `${door} half-human cutter sometimes still has the knife`)
}

for (const kind of ['jackal', 'tick', 'pup'] as const) {
  for (let ticks = 0; ticks < 12; ticks++) {
    for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
      const before = primedFight(door, ticks, kind)
      const after = pick(before, 'enc-fight')
      assert(gearGained(before, after).length === 0, `${door} ${kind} kill pays no weapon or armor`)
      if (kind === 'jackal') assert((after.items.scrap ?? 0) >= (before.items.scrap ?? 0) + 2, `${door} jackal still pays scrap`)
      if (kind === 'tick') assert((after.items.vial_drop ?? 0) >= (before.items.vial_drop ?? 0) + 1, `${door} tick still pays a Drop`)
      if (kind === 'pup') {
        assert((after.items.glints ?? 0) >= (before.items.glints ?? 0) + 1, `${door} pup still pays a Glint`)
        assert((after.items.scrap ?? 0) >= (before.items.scrap ?? 0) + 1, `${door} pup still pays scrap`)
      }
    }
  }
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
const rimRan = interpret(s, 'run')
assert(rimRan.sceneId === 'maw:rim' && rimRan.flags.encounterDone, 'Rim run during a fight skips onto the outcome card')
assert(rimRan.chapterId !== 'walking-amber', 'Rim run during a fight does not take the Hunger')
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
assert(!/Strike/.test(rimOn.flash ?? ''), 'Rim hub flash is not the compare block')
assert(bodyOf(rimOn).includes('lip of rock'), 'Approach body returns after On.')
assert(!bodyOf(rimOn).includes('You Strike'), 'Approach body does not keep the fight log')
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
assert(encSrc.includes("kind: 'scavenger'"), 'shared roster includes a waste scavenger')
assert(encSrc.includes('Waste scavenger'), 'scavenger has a traveler name')
assert(!encSrc.includes('Math.random'), 'encounter outcomes stay seeded')
assert(!encSrc.includes('state.door'), 'road fights are not door-gated')
assert(
  !encSrc.includes('wrench') &&
    !encSrc.includes('ironwood_baton') &&
    !encSrc.includes('needle_knife') &&
    !encSrc.includes('hide_wrap') &&
    !encSrc.includes('ceremonial_cloth'),
  'road loot stays off shop and quest exclusives',
)
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
assert(ids(s).includes('wrap'), 'Prisoner Kaelen sells Scav Wrap')
s = pick(s, 'wrap')
assert(s.items.scav_wrap === 1 && (s.items.scrap ?? 0) === 1, 'one scrap buys Scav Wrap and leaves the rest')
s = equipItem(s, 'scav_wrap')
assert(s.equipped.armor === 'scav_wrap' && equippedShell(s) === 2, 'Scav Wrap is the only Shell when worn')
s = applyEffect(s, { goto: 'camp:wire' })
s = interpret(s, 'talk')
assert(/gloves|product|shelf/i.test(s.flash ?? ''), 'Do talk on the Wire hits Kaelen who is there')

s = newGame('outcast')
s = pick(s, 'stand')
s = applyEffect(s, { goto: 'spine:kaelen', add: { scrap: 2 } })
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Outcast Kaelen has Buy/Sell like Prisoner')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Outcast Kaelen cloak is Glint or scrap, two rows')
assert(ids(s).includes('wrap'), 'Outcast Kaelen sells Scav Wrap')
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
assert(/\bhe\b/i.test(sceneOf(s).body), 'Threshold Kaelen uses he')
assert(!/\bthey\b/i.test(sceneOf(s).body), 'Threshold Kaelen is not they')
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Vessel Kaelen has Buy/Sell like Wire and well')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Vessel Kaelen cloak is Glint or scrap, two rows')
assert(ids(s).includes('wrap'), 'Vessel Kaelen sells Scav Wrap')
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
  assert(paid.sceneId === 'ch1:south-wind', 'paid heading still walks toward Sybella')
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
{
  const legacy = newGame('vessel')
  const moved = repairLoadedState({
    ...legacy,
    equipped: { weapon: 'rusted_dagger', armor: 'ceremonial_cloth' },
  })
  assert(moved.equipped.garment === 'ceremonial_cloth', 'old cloth-on-armor save moves to garment')
  assert(!moved.equipped.armor, 'old cloth-on-armor save frees the armor slot')
  assert(moved.equipped.weapon === 'rusted_dagger', 'weapon stays when cloth migrates')
  const kept = repairLoadedState({
    ...legacy,
    items: { ...legacy.items, dust_cloak: 1 },
    equipped: { weapon: 'rusted_dagger', armor: 'dust_cloak' },
  })
  assert(kept.equipped.armor === 'dust_cloak' && !kept.equipped.garment, 'real armor stays on the armor slot')
  const bareArmor = repairLoadedState({
    ...newGame('prisoner'),
    items: { dust_cloak: 1 },
    equipped: { armor: 'dust_cloak' },
  })
  assert(bareArmor.equipped.armor === 'dust_cloak' && !bareArmor.equipped.garment, 'armor-only saves do not grow a garment')
}
{
  let cloth = newGame('vessel')
  cloth = pick(cloth, 'keep')
  cloth = applyEffect(cloth, { goto: 'thresh:kaelen', add: { dust_cloak: 1 } })
  cloth = equipItem(cloth, 'dust_cloak')
  assert(
    cloth.equipped.garment === 'ceremonial_cloth' && cloth.equipped.armor === 'dust_cloak',
    'garment and armor equip together',
  )
  assert(equippedShell(cloth) === 3, 'only armor Shell counts when cloth is also worn')
  cloth = openShop(cloth, 'sell')
  assert(!ids(cloth).includes('sell-ceremonial_cloth'), 'equipped garment stays off Sell')
  assert(!ids(cloth).includes('sell-dust_cloak'), 'equipped armor stays off Sell beside a garment')
  cloth = unequipSlot(cloth, 'garment')
  assert(ids(cloth).includes('sell-ceremonial_cloth'), 'unequipped garment returns to Sell')
}
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
  assert(playCoverKey(p, { id: 'camp:cages' }) === 'oiltooth', 'Holding Pens keep Oil-Tooth on the first-meet cover')
  assert(playCoverKey(p, { id: 'camp:jaxson' }) === 'oiltooth', 'Oil-Tooth talk uses his cover')
  const o = newGame('outcast')
  assert(playCoverKey(o, sceneOf(o)) === 'spine', 'Outcast opening uses Spine art')
  const ridge = applyEffect(pick(o, 'stand'), { sap: 6 })
  assert(ridge.sceneId === 'spine:ridge', 'Outcast stands onto the ridge')
  assert(playCoverKey(ridge, sceneOf(ridge)) === 'spine', 'Noon Spine uses Spine art, not Silas')
  const well = walkTo(ridge, 'spine:well')
  assert(playCoverKey(well, sceneOf(well)) === 'spine', 'Dry Well uses Spine art, not Kaelen')
  assert(playCoverKey(well, { id: 'spine:kaelen' }) === 'kaelen', 'Kaelen talk still uses Kaelen art')
  assert(!PEOPLE.silas.scenes.includes('spine:ridge'), 'Silas cover list excludes the ridge')
  assert(!PEOPLE.kaelen.scenes.includes('spine:well'), 'Kaelen cover list excludes the dry well')
  assert(!PEOPLE.oiltooth.scenes.includes('camp:bay'), 'Oil-Tooth cover list excludes Skiff Bay')
  const v = newGame('vessel')
  assert(playCoverKey(v, sceneOf(v)) === 'threshold', 'Vessel opening uses Threshold art')
  const hunt = applyEffect(p, { goto: 'camp:hunter' })
  assert(playCoverKey(hunt, sceneOf(hunt)) === 'valerius', 'Shiv confrontation with Valerius still uses his cover')
  const knock = {
    ...p,
    hubId: 'camp04' as const,
    sceneId: 'camp:yard',
    flags: { ...p.flags, hunterHere: true, hunterFrom: 'camp:yard' },
  }
  assert(playCoverKey(knock, sceneOf(knock)) === 'hound', 'Camp pressure interrupt uses the Hound-handler')
  assert(pressureFace(knock) === 'Hound-handler', 'Camp knock speaker is the handler')
  const hound = applyEffect(o, { goto: 'spine:hound' })
  assert(playCoverKey(hound, sceneOf(hound)) === 'hound', 'Spine hunt uses Shard-Hound art')
  const sy = { ...v, flags: { ...v.flags, hunterHere: true }, hubId: 'redmaw', sceneId: 'maw:lip', chapterId: 'cache-run' }
  assert(playCoverKey(sy, { id: 'maw:lip', art: 'hunger' }) === 'sybella', 'Sybella overlay uses Sybella art')
  const maw = applyEffect(p, { goto: 'maw:market', enterHub: 'redmaw' })
  assert(visibleChoices(maw).some((c) => c.id === 'zafir'), 'Bone Market always offers Talk to Zafir')
  assert(visibleChoices(maw).some((c) => c.id === 'shop-buy'), 'Bone Market offers Zafir Buy without having met him at the cairn')
  assert(playCoverKey(maw, { id: 'maw:market' }) === 'zafir', 'Bone Market uses Zafir art')
  assert(playCoverKey(p, { id: 'maw:zafir' }) === 'zafir', 'Zafir stall uses Zafir art')
  const rumors = applyEffect(p, { goto: 'camp:kaelen-rumors' })
  const rumorLabels = visibleChoices(rumors).map((c) => c.label)
  assert(rumorLabels.includes('Intel'), 'Kaelen rumor counter opens with Intel')
  assert(rumorLabels.includes('Side trouble'), 'Kaelen rumor counter opens with Side trouble')
  const intel = applyEffect(rumors, { flag: { rumorShelf: 'intel' } })
  const intelRow = visibleChoices(intel).find((c) => c.id === 'hunger-glint')
  assert(intelRow, 'Hunger lead stays on the Intel shelf without a Glint')
  assert(intelRow && !isChoiceOn(intel, intelRow.enable), 'Hunger lead locks until you have a Glint')
}

s = newGame('prisoner')
s = pick(s, 'pens')
{
  const looked = interpret(s, 'look around')
  assert(looked.sceneId === 'camp:cages', 'look around stays in the pens')
  assert(/pens|cage|Oil-Tooth/i.test(looked.flash ?? ''), 'look around names the pens')
  assert(!/miss/i.test(looked.flash ?? ''), 'look around is not a miss')
  const examined = interpret(s, 'examine scrip')
  assert(examined.sceneId === 'camp:cages' && /scrip|paper|Ironwood/i.test(examined.flash ?? ''), 'examine names a thing in the pack')
  const noFight = interpret(s, 'attack')
  assert(noFight.sceneId === 'camp:cages' && !noFight.flags.encounterHere, 'attack in the pens does not invent a fight')
  assert(/wrench|throat|shield|fluent|not/i.test(noFight.flash ?? '') && !/miss/i.test(noFight.flash ?? ''), 'attack on Oil-Tooth is a threaten, not a brick wall')
  const bribed = interpret(s, 'bribe')
  assert(/job|wrench|palm/i.test(bribed.flash ?? '') && !/miss/i.test(bribed.flash ?? ''), 'bribe Oil-Tooth is authored')
  const taken = interpret(s, 'take')
  assert(/shelf|button/i.test(taken.flash ?? ''), 'take from a person is refused in one line')
}
s = applyEffect(s, { sap: 6, goto: 'camp:yard', enterHub: 'camp04' })
{
  const before = s.sceneId
  const fought = interpret(s, 'fight')
  assert(fought.sceneId === before && fought.flags.encounterHere, 'fight on the Yard starts a road encounter in place')
  const hid = interpret({ ...s, flags: { ...s.flags } }, 'hide')
  assert(hid.sceneId === before && !hid.flags.encounterHere, 'hide on an empty Yard does not start a fight')
}
s = newGame('outcast')
s = pick(s, 'stand')
{
  const looked = interpret(s, 'search')
  assert(looked.sceneId === s.sceneId && /Spine|ridge|Silas/i.test(looked.flash ?? ''), 'Outcast search describes the ridge')
  const noFight = interpret(s, 'bite')
  assert(!noFight.flags.encounterHere, 'bite on Silas does not invent a jackal')
  assert(!/miss/i.test(noFight.flash ?? ''), 'bite on Silas is answered')
}
s = newGame('vessel')
s = pick(s, 'keep')
{
  const looked = interpret(s, 'examine')
  assert(/Court|Thalia|Threshold/i.test(looked.flash ?? ''), 'Vessel examine describes the court')
  assert(!looked.flags.encounterHere, 'examine does not start a fight')
}

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6, goto: 'camp:yard', enterHub: 'camp04' })
s = { ...s, pressure: 9, ticks: 0 }
s = applyEffect(s, { ticks: 4 })
assert(!s.flags.hunterHere && !s.flags.cartelNotice, 'Camp roam without noise does not call the handler')
s = dismissFight(s)
s = applyEffect(s, { flag: { cartelNotice: true, huntQuiet: 8 } })
s = applyEffect(s, { ticks: 1 })
assert(s.sceneId === 'camp:yard', `Camp knock stays in the Yard (got ${s.sceneId})`)
assert(s.sceneId !== 'camp:hunter', 'Camp knock does not open the Valerius sweep scene')
assert(s.flags.hunterHere, 'Camp knock is an overlay')
assert(bodyOf(s).includes('Hound-handler'), 'Camp knock stars the Hound-handler')
assert(!bodyOf(s).includes('Valerius does not run'), 'Camp knock does not star Valerius arriving')
assert(playCoverKey(s, sceneOf(s)) === 'hound', 'Camp knock art is the Hound')
assert(ids(s).includes('hunter-fight') && ids(s).includes('hunter-hold') && ids(s).includes('hunter-scrip'), 'Camp knock has fight, hide, and scrip stakes')
{
  const sapBefore = s.sap
  const heatBefore = s.heat.cartel
  const held = pick(s, 'hunter-hold')
  assert(held.sceneId === 'camp:yard', 'hiding from the handler stays in the Yard')
  assert(!held.flags.hunterHere, 'hide clears the knock')
  assert(held.sap < sapBefore || held.heat.cartel > heatBefore, 'hide from the handler costs Sap or Heat')
}

{
  let off = newGame('prisoner')
  off = pick(off, 'pens')
  off = applyEffect(off, { sap: 6 })
  off = walkTo(off, 'camp:guard')
  assert(off.sceneId === 'camp:guard' && !off.flags.jaxsonInside, 'the station is reachable before the job')
  assert(off.flags.cartelNotice, 'walking the station before the job is cartel notice')
}

{
  let watched = newGame('prisoner')
  watched = pick(watched, 'pens')
  watched = pick(watched, 'jaxson')
  watched = pick(watched, 'inside')
  watched = { ...watched, ticks: 1, pressure: 0, sap: 6 }
  watched = applyEffect(watched, { goto: 'camp:sabotage' })
  assert(watched.flags.ventPatrol, 'vent roll can put the patrol on the bolt')
  assert(ids(watched).includes('scrap') && !ids(watched).includes('do'), 'a watched bolt is a scrap, not a free crack')
  assert(/in place/i.test(bodyOf(watched)), 'watched bolt says the patrol is there')
  watched = crackVent(watched)
  assert(watched.flags.guardDown && watched.sceneId === 'camp:bay', 'scraping the patrol opens the bay')
  assert(playCoverKey(watched, sceneOf(watched)) === 'oiltooth', 'lookout still uses Oil-Tooth after the scrap')

  let clear = newGame('prisoner')
  clear = pick(clear, 'pens')
  clear = pick(clear, 'jaxson')
  clear = pick(clear, 'inside')
  clear = { ...clear, ticks: 2, pressure: 0, sap: 6 }
  clear = applyEffect(clear, { goto: 'camp:sabotage' })
  assert(!clear.flags.ventPatrol, 'vent roll can leave the bolt empty')
  assert(ids(clear).includes('do') && !ids(clear).includes('scrap'), 'an empty bolt is a quiet crack with risk')
  const heat = clear.heat.cartel
  clear = crackVent(clear)
  assert(clear.flags.guardDown && clear.heat.cartel > heat, 'quiet crack still costs Cartel Heat')
}

s = newGame('outcast')
s = pick(s, 'stand')
s = applyEffect(s, { sap: 6, goto: 'spine:ridge', enterHub: 'spine' })
s = { ...s, pressure: 9, ticks: 0 }
s = applyEffect(s, { ticks: 4, flag: { huntQuiet: 8 } })
assert(s.sceneId === 'spine:ridge', `Spine knock stays on the ridge (got ${s.sceneId})`)
assert(s.sceneId !== 'spine:hunter' && s.sceneId !== 'spine:shade', 'Spine knock does not yank to shade')
assert(s.flags.hunterHere, 'Spine knock is an overlay')
assert(ids(s).includes('spine-fight') && ids(s).includes('spine-hide') && ids(s).includes('spine-bargain'), 'Spine knock has fight, hide, and bargain')
{
  const sapBefore = s.sap
  const hid = pick(s, 'spine-hide')
  assert(hid.sceneId === 'spine:ridge' && !hid.flags.hunterHere, 'Spine hide stays on the ridge')
  assert(hid.sap < sapBefore || hid.heat.cartel > s.heat.cartel, 'Spine hide costs something')
}

s = newGame('vessel')
s = pick(s, 'keep')
s = applyEffect(s, { sap: 6, goto: 'thresh:court', enterHub: 'threshold' })
s = { ...s, pressure: 9, ticks: 0 }
s = applyEffect(s, { ticks: 4, flag: { huntQuiet: 8 } })
assert(s.sceneId === 'thresh:court', `Threshold knock stays in the Court (got ${s.sceneId})`)
assert(s.sceneId !== 'thresh:hunter' && s.sceneId !== 'thresh:paddock', 'Threshold knock does not yank to the paddock')
assert(ids(s).includes('thresh-fight') && ids(s).includes('thresh-hide'), 'Threshold knock has fight and hide')
{
  const heatBefore = s.heat.seekers
  const defied = pick(s, 'thresh-bargain')
  assert(defied.sceneId === 'thresh:court' && !defied.flags.hunterHere, 'Threshold bargain stays in the Court')
  assert(defied.sap < s.sap || defied.heat.seekers > heatBefore, 'Threshold bargain costs Sap or Heat')
}

s = newGame('prisoner')
s = applyEffect(s, {
  sap: 6,
  enterHub: 'redmaw',
  goto: 'maw:market',
  flag: { chapter1Done: true, huntQuiet: 8 },
  pressure: 8,
  ticks: 5,
})
assert(ids(s).includes('sybella-hold') && ids(s).includes('sybella-defy') && ids(s).includes('sybella-swing'), 'Sybella knock has costly stay, defy, and swing')
{
  const sapBefore = s.sap
  const heatBefore = s.heat.seekers
  const held = pick(s, 'sybella-hold')
  assert(held.sceneId === 'maw:market', 'Sybella stay does not yank')
  assert(held.sap < sapBefore || held.heat.seekers > heatBefore, 'Sybella stay costs Sap or Heat')
}

{
  const bad = /can't take hunger|don't understand|i don't understand/i
  let pens = newGame('prisoner')
  pens = pick(pens, 'pens')
  const ran = interpret(pens, 'run')
  assert(!/take the Hunger/.test(ran.flash ?? ''), 'pens do not offer Hunger before a heading exists')
  assert(/Pick a place/.test(ran.flash ?? ''), 'aimless run still asks for a place')
  const denied = interpret(pens, 'take the hunger')
  assert(denied.sceneId === 'camp:cages', 'blocked Hunger stays in the pens')
  assert(!bad.test(denied.flash ?? ''), 'blocked Hunger is not the old take-error')
  assert(/not a road/i.test(denied.flash ?? ''), 'blocked Hunger says the road is closed')

  let known = newGame('prisoner')
  known = pick(known, 'pens')
  known = applyEffect(known, { sap: 4, goto: 'camp:yard', flag: { hungerKnown: true } })
  const offered = interpret(known, 'walk')
  assert(/take the Hunger/.test(offered.flash ?? ''), 'a known Hunger is offered on an aimless walk')
  const started = interpret(known, 'take the hunger')
  assert(started.chapterId === 'cache-run' && started.sceneId === 'ch1:leave', 'take the hunger from the Yard starts Cache Run')
  assert(!bad.test(started.flash ?? ''), 'Yard Hunger start is not an error')

  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    let rim = newGame(door)
    rim = applyEffect(rim, {
      sap: 4,
      enterHub: 'redmaw',
      goto: 'maw:rim',
      flag: { chapter1Done: true, hungerKnown: true },
    })
    assert(rim.sceneId === 'maw:rim' && rim.hubId === 'redmaw', `${door} stands on Maw Rim`)
    rim = dismissFight(rim)
    assert(/Hunger is open\. Run, leave, or take the Hunger/.test(bodyOf(rim)), `${door} Rim walk-line is one beat`)
    for (const typed of [
      'run',
      'go',
      'leave',
      'leave the rim',
      'run to the hunger',
      'go to the hunger',
      'take the hunger',
      'take hunger',
      'take the Hunger',
      'walk the hunger',
    ]) {
      const via = interpret(rim, typed)
      assert(via.sceneId === 'ch2:stub', `${door} Do "${typed}" enters the Walking Amber`)
      assert(via.chapterId === 'walking-amber', `${door} Do "${typed}" is the next Hunger`)
      assert(!bad.test(via.flash ?? ''), `${door} Do "${typed}" has no error flash`)
    }
    const wandered = interpret(rim, 'walk')
    assert(wandered.sceneId === 'maw:rim', `${door} bare walk on the Rim does not leave`)
    assert(/Hunger is open\. Run, leave, or take the Hunger/.test(wandered.flash ?? ''), `${door} Rim walk flash is one beat`)
    assert(!/Pick a place, or take the Hunger/.test(wandered.flash ?? ''), `${door} Rim walk does not teach a second command`)

    let shut = newGame(door)
    shut = applyEffect(shut, { sap: 4, enterHub: 'redmaw', goto: 'maw:rim' })
    shut = dismissFight(shut)
    assert(!shut.flags.chapter1Done, `${door} Rim can stand before Hunger opens`)
    for (const typed of ['run', 'go', 'leave', 'leave the rim']) {
      const held = interpret(shut, typed)
      assert(held.sceneId === 'maw:rim', `${door} Do "${typed}" stays on a closed Rim`)
      assert(held.chapterId !== 'walking-amber' && held.chapterId !== 'cache-run', `${door} closed Rim does not start Hunger`)
      assert(/Nowhere to run yet/.test(held.flash ?? ''), `${door} closed Rim says nowhere to run`)
      assert(!/hunger/i.test(held.flash ?? ''), `${door} closed Rim does not offer Hunger`)
    }
    const shutNamed = interpret(shut, 'take the hunger')
    assert(shutNamed.sceneId === 'maw:rim', `${door} named Hunger on a closed Rim stays`)
    assert(/not a road/i.test(shutNamed.flash ?? ''), `${door} closed Rim Hunger is not a road`)

    let lip = { ...rim, sceneId: 'maw:lip' }
    const fromLip = interpret(lip, 'take the hunger')
    assert(fromLip.sceneId === 'ch2:stub', `${door} Hollow Lip take the hunger matches the hook`)
    const lipRun = interpret(lip, 'run')
    assert(lipRun.sceneId === 'ch2:stub' && lipRun.chapterId === 'walking-amber', `${door} Hollow Lip run is the Hunger button`)
    assert(!bad.test(lipRun.flash ?? ''), `${door} Hollow Lip run has no error flash`)

    let land = newGame(door)
    land = applyEffect(land, { sap: 4, startChapter: 'cache-run', goto: 'ch1:land' })
    const landButton = pick(land, 'hub')
    const landRun = interpret(land, 'leave')
    assert(landRun.sceneId === landButton.sceneId && landRun.hubId === landButton.hubId, `${door} Approach leave is the landing button`)
    assert(landRun.flash === landButton.flash, `${door} Approach leave uses the landing flash`)

    let market = applyEffect(rim, { goto: 'maw:market' })
    const marketRun = interpret(market, 'run')
    assert(marketRun.sceneId === 'maw:market', `${door} Bone Market run does not start Hunger`)
    assert(/take the Hunger/.test(marketRun.flash ?? ''), `${door} Market walk still names the Hunger as a second step`)
  }

  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    let road = newGame(door)
    road = applyEffect(road, { sap: 4, startChapter: 'cache-run', goto: 'ch1:leave' })
    const button = pick(road, 'go')
    const via = interpret(road, 'take the hunger')
    assert(via.sceneId === button.sceneId, `${door} take the hunger follows that door's Cache Run road`)
    assert(via.chapterId === 'cache-run', `${door} Hunger stay in Cache Run`)
  }

  let ridge = newGame('outcast')
  ridge = pick(ridge, 'stand')
  const ridgeButton = pick(ridge, 'hunger')
  const ridgeDo = interpret(ridge, 'take hunger')
  assert(ridgeDo.sceneId === ridgeButton.sceneId && ridgeDo.flash === ridgeButton.flash, 'Outcast take hunger is the ridge button')

  let court = newGame('vessel')
  court = pick(court, 'keep')
  const courtButton = pick(court, 'hunger')
  const courtDo = interpret(court, 'walk the hunger')
  assert(
    courtDo.sceneId === courtButton.sceneId && courtDo.heat.seekers === courtButton.heat.seekers,
    'Vessel walk the hunger is the Court button',
  )
}

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
assert(sw.includes("CACHE = 'amber-shroud-v37'"), 'SW bumped so Rim leave reaches Pages')
assert(sw.includes('covers/zafir.jpg') && sw.includes('covers/kaelen.jpg'), 'SW precaches NPC covers')
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
assert(css.includes('object-fit: contain'), 'scene art shows the whole cover instead of cropping heads')
assert(css.includes('object-position: center top'), 'scene art keeps faces at the top of the frame')
assert(css.includes('scene-stage'), 'story shares a stage with the cover')
assert(/top:\s*min\(28\.125cqi,\s*46cqb\)/.test(css), 'story starts at the cover midline so the upper half stays clear')
assert(css.includes('rgba(12, 7, 4, 0.58)'), 'story scrim stays translucent so cover art shows through')
assert(!css.includes('rgba(12, 7, 4, 0.88)'), 'story scrim is lighter than the v32 slab')
const playSrc = readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8')
assert(playSrc.includes('?v=37'), 'scene cover URLs are cache-busted with the service worker')
assert(!css.includes('object-position: center 68%'), 'scene art no longer crops toward the ground')
assert(!css.includes('height: 56px'), 'short phones no longer squash covers into a head-cropping strip')
assert(css.includes('place-items: center'), 'game screen is centered on the backdrop')
assert(/html \{\s*font-size:\s*18px/.test(css), 'root type is 18px so rem UI reads on a filled phone')
assert(/\.play-screen \.scene-art \{[\s\S]*?flex:\s*0\s+0\s+auto/.test(css), 'scene art keeps its frame instead of shrinking under the story')
assert(/\.play-screen \.scene-art \{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9/.test(css), 'scene art keeps the full 16:9 cover')
assert(/\.play-screen \.story \{[\s\S]*?position:\s*absolute/.test(css), 'story overlays the lower half of the cover')
assert(!/\.play-screen \.story \{[^}]*background:\s*#0c0704/.test(css), 'story panel is not a solid black slab')
assert(css.includes('font-size: 1.18rem'), 'story prose is larger than the old 1.05rem')
assert(css.includes('min-aspect-ratio: 3/4'), 'wide viewports contain-scale the phone screen to the nearer edges')
assert(/grid-template-columns:\s*1fr 1fr 1fr/.test(css), 'Gear shows weapon, armor, and garment')

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) walkTs(p, out)
    else if (/\.(ts|tsx)$/.test(name.name)) out.push(p)
  }
  return out
}
const statLabel = /\bBite\b|Hide \d|\bBite \d|vs Hide|your Hide|their Hide|Bite vs|Bite and Hide/
for (const file of walkTs(new URL('../src', import.meta.url).pathname)) {
  assert(!statLabel.test(readFileSync(file, 'utf8')), `no Bite/Hide stat label in ${file}`)
}
assert(!statLabel.test(readFileSync(new URL('../README.md', import.meta.url), 'utf8')), 'README uses Strike/Shell')

console.log('OK', {
  prisoner: Object.keys(DOORS.prisoner.items),
  outcast: Object.keys(DOORS.outcast.items),
  vessel: Object.keys(DOORS.vessel.items),
})


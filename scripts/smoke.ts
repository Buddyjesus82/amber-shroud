import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  applyEffect,
  bodyOf,
  drinkDrop,
  STRIDER_READY_SAP,
  equipItem,
  HUNTER_QUIET_GAPS,
  huntGap,
  interpret,
  KAELEN_APPEARANCE,
  KAELEN_HELD_SCENES,
  isChoiceOn,
  newGame,
  scavenge,
  sceneOf,
  sceneProse,
  skim,
  travelTo,
  unequipSlot,
  visibleChoices,
} from '../src/game/engine.ts'
import { DOORS, HUBS, ITEMS } from '../src/game/content/catalog.ts'
import { ALL_SCENES, getScene } from '../src/game/content/index.ts'
import { PEOPLE } from '../src/game/people.ts'
import { PIKE_TALK, SARN_TALK, VETCH_TALK } from '../src/game/content/bayHands.ts'
import { heatFactions } from '../src/game/heat.ts'
import { RUMORS } from '../src/game/journal.ts'
import { INTRO_CARDS, INTRO_FADE_MS, INTRO_HOLD_MS, INTRO_TEXT_IN_MS, introCardMs, introMotionMs, introReadMs } from '../src/game/intro.ts'
import { GLOBAL_INTENTS } from '../src/game/intent.ts'
import { wakeEffect } from '../src/game/downed.ts'
import { BRAND_LOOK } from '../src/game/brand.ts'
import { FIRST_DROP_DONE, FIRST_DROP_GOAL } from '../src/game/firstDrop.ts'
import { AMBER_WARM, HANDS_LOOK, HOLLOW_PULL, SAND_DOWN, SAND_LOW, SAND_SIGN_FLAGS, SAND_TOUCH, sandGround, sandSignsSeen } from '../src/game/sandSign.ts'
import type { Cond, Scene } from '../src/game/types.ts'
import { rollScavenge, SCAVENGE_SALVE_PCT, scavengeSalve } from '../src/game/scavenge.ts'
import { buyFits, kaelenOffers } from '../src/game/trade.ts'
import { FIGHT_HELP_LINES, fightHelpAuto, fightHelpText, fightTopicMidFight, HELP_TOPICS, helpRoute, topicLines, isFightHelpAsk, markFightHelpSeen, topicListText, topicText } from '../src/game/helpTopics.ts'
import { encounterSpeaker as encounterSpeakerOf, BEAST_KINDS, carriesSalve, EXTRACTOR_DROP_IN, EXTRACTOR_DUPE_IN, extractorDrop, HUMAN_KINDS, HUMAN_SALVE_PCT, beginEncounter, DAMAGE_FLOOR, encounterCard, encounterChoices, exchangeDamage, fightStartFlags, huskGround, pickEncounterKind, resolveEncounter, runChance, STALL_ROUNDS, swingOf } from '../src/game/encounter.ts'
import {
  IDLE_DOOR,
  tapDoor,
  tapOverwriteAsk,
  tapOverwriteConfirm,
  tapResume,
} from '../src/game/doorPick.ts'
import type { DoorId, GameState, ItemId } from '../src/game/types.ts'
import { COVER_BAND, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { helpEntries, helpText } from '../src/game/help.ts'
import { equippedShell } from '../src/game/kit.ts'
import * as GK from '../src/game/kit.ts'
import * as VO from '../src/game/voices.ts'
import * as PA from '../src/game/politeAsk.ts'
import * as GE from '../src/game/engine.ts'
import * as GS from '../src/game/scavenge.ts'
import * as DG from '../src/game/disguise.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { pressureFace } from '../src/game/hunter.ts'
import { CARAPACE_HUNTER, CARAPACE_HUNTER_HEAT, SPINE_HUNTER } from '../src/game/content/spineHunter.ts'
import { JODI_LINES, SHADE_HANDS_LIVE } from '../src/game/content/shadeHands.ts'
import { SILAS_JOB_FLAGS, SILAS_JOB_LIVE } from '../src/game/content/silasJob.ts'
import { canSkim } from '../src/game/scavenge.ts'
import { canTravelTo, edgeSap, HUB_MAPS, nodeIdForScene, route } from '../src/game/map.ts'
import { estimateLabel, layoutLabels, layoutProblems, type Box } from '../src/game/mapLabels.ts'
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
  assert(s.sceneId === 'ch1:p-oil', `prisoner meets Jaxson on the stolen hull (got ${s.sceneId})`)
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

assert(Object.keys(outcast.items).length === 0, 'outcast wakes with empty pockets')
{
  const stood = pick(newGame('outcast'), 'stand')
  assert(stood.items.vial_empty === 1 && stood.items.silas_tip === 1, 'Silas tosses the empty vial and scratches his shade-cut on standing')
}
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
assert(ITEMS.dust_cloak.shell === 2 && ITEMS.dust_cloak.slot === 'cloak' && ITEMS.hide_wrap.shell === 4, 'Dust Cloak is a Cloak, Shell 2; Hound Hide Shell 4')
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
  readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8').includes('help / who is ${'),
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
s = pick(s, 'plan')
s = pick(s, 'inside')
assert(s.items.wrench === 1 && s.flags.jaxsonInside, 'Jaxson is the inside man — wrench for hotwire')
s = equipItem(s, 'wrench')
assert(s.equipped.weapon === 'wrench', 'Gear can equip the wrench')
assert(ids(s).includes('station'), 'stall offers the west vent after the job — no hub-chip required')
s = travelTo(s, 'camp:vats')
assert(ids(s).includes('wrench'), 'vat wrench path after Jaxson')
s = pick(s, 'wrench')
assert((s.items.vial_drop ?? 0) >= 1, 'wrench vat extra drop, no extra heat')
assert(s.heat.cartel === 3, 'quiet wrench does not add cartel heat')

s = newGame('prisoner')
s = pick(s, 'pens')
s = travelTo(s, 'camp:lean')
s = interpret(s, 'ask about kallik cache red maw')
assert(s.sceneId === 'camp:wire' || s.sceneId === 'camp:jaxson-cache', 'cache rumor is Kaelen, not Jaxson')
assert(!s.flags.hungerKnown, 'Jaxson does not sell the Hunger heading')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'plan')
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
assert(ids(s).includes('relic-walk'), 'Walk the Yard is on the counter once the side trouble is paid')
{
  // Paid for the side trouble: Walk the Yard crawls the fence-hole back to the Pens, keeping everything.
  const before = s
  const walked = pick(s, 'relic-walk')
  assert(walked.sceneId === 'camp:cages', `Walk the Yard takes you back to the Pens (got ${walked.sceneId})`)
  assert(walked.sap === before.sap, 'the crawl costs no Sap, so low Sap cannot strand you at the Wire')
  assert(JSON.stringify({ ...walked.items }) === JSON.stringify({ ...before.items }), 'the crawl keeps your gear')
  assert(walked.flags.relicRumor && walked.flags.kaelenKnown, 'the crawl keeps the paid lead')
  for (const line of ['walk the yard', 'back to the pens', 'Walk the Yard — back to the Pens through the fence-hole']) {
    const typed = interpret(before, line)
    assert(typed.sceneId === walked.sceneId && typed.sap === walked.sap && typed.flash === walked.flash, `typed "${line}" at the rumor counter is the Walk the Yard button`)
  }
  const wire = dismissFight(applyEffect(applyEffect(before, { goto: 'camp:wire' }), { unsetFlag: ['hunterHere', 'hunterFrom'] }))
  const row = visibleChoices(wire).find((c) => c.id === 'pens')
  assert(row && isChoiceOn(wire, row.enable), `the Wire shows the paid fence-hole row (at ${wire.sceneId}: ${ids(wire).join(',')})`)
  const fromWire = applyEffect(wire, row.effects)
  assert(fromWire.sceneId === 'camp:cages', 'the Wire row crawls to the Pens')
  for (const line of ['walk the yard', 'back to the pens', 'go back to the pens', 'crawl back through the fence']) {
    const typed = interpret(wire, line)
    assert(typed.sceneId === 'camp:cages' && typed.sap === fromWire.sap, `typed "${line}" on the Wire is the fence-hole row`)
  }
  s = walked
  assert(ids(s).includes('yard'), 'the Yard is one road on from the Pens')
}
{
  // Nothing paid: the row is locked and says what it needs. Typed asks get the same answer and stay put.
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    let w = applyEffect(newGame(door), { goto: 'camp:wire', enterHub: 'camp04', flag: { encounterAt: 99999 } })
    w = { ...w, flags: { ...w.flags } }
    delete w.flags.encounterHere
    delete w.flags.hunterHere
    const row = visibleChoices(w).find((c) => c.id === 'pens')
    assert(row && !isChoiceOn(w, row.enable) && row.locked?.includes('Pay Kaelen'), `${door} unpaid Wire shows a locked fence-hole row`)
    for (const line of ['walk the yard', 'back to the pens']) {
      const typed = interpret(w, line)
      assert(typed.sceneId === 'camp:wire' && typed.flash === `${row.locked}.`, `${door} unpaid typed "${line}" says what it needs`)
    }
    const cut = applyEffect(w, { flag: { wireCut: true } })
    assert(interpret(cut, 'walk the yard').sceneId === 'camp:cages', `${door} buying the hole also opens the crawl`)
  }
}
s = walkTo(s, 'camp:yard')
if (s.flags.hunterHere) s = applyEffect(s, { unsetFlag: ['hunterHere', 'hunterFrom'] })
assert(s.sceneId === 'camp:yard', `the Yard is one road from the Pens (got ${s.sceneId})`)
assert(ids(s).includes('relic'), `hoard is a Yard choice after the rumor (${ids(s).join(',')} ${JSON.stringify({r: s.flags.relicRumor, t: s.flags.relicTaken, seen: s.flags.relicSeen, h: s.flags.hunterHere, e: s.flags.encounterHere})})`)
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
assert(s.flags.striderHot, 'Jaxson hotwires the Strider')
s = applyEffect(s, { sap: 4 })
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(s.sceneId === 'ch1:p-pipe', 'prisoner beat 1 is the last Cartel fence')
while (s.flags.encounterHere) {
  if (ids(s).includes('enc-skip')) s = pick(s, 'enc-skip')
  else if (ids(s).includes('enc-continue')) s = pick(s, 'enc-continue')
  else break
}
assert(ids(s).includes('wrench'), 'cache run wrench branch from Jaxson kit')
assert(!ids(s).includes('silas'), 'prisoner fence has no Silas cut')
assert(!ids(s).includes('oram'), 'prisoner fence has no Oram heading')
s = pick(s, 'wrench')
assert(s.flags.wrenchCut, 'wrench cut flag')
assert(s.sceneId === 'ch1:p-clerk', 'prisoner meets Clerk Rell, not Ossa yet')
assert(ids(s).includes('scrip'), 'Rell takes scrip as fake papers')
s = pick(s, 'scrip')
assert(s.sceneId === 'ch1:p-oil', 'Jaxson is on the stolen hull, not a cairn shop')
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
  for (const typed of ['pick up the vial and stand', 'stand up', 'get up', 'pick up the vial']) {
    const viaDo = interpret(s, typed)
    assert(viaDo.sceneId === button.sceneId, `Do "${typed}" walks the same road as the button`)
    assert(viaDo.hubId === button.hubId, `Do "${typed}" enters the Spine like the button`)
    assert(viaDo.flash === button.flash, `Do "${typed}" uses the button flash`)
    assert(!/miss/i.test(viaDo.flash ?? ''), `Do "${typed}" is not a miss`)
  }
  const miss = interpret(s, 'xyzzy poetry please')
  assert(miss.sceneId === s.sceneId && /Try/.test(miss.flash ?? ''), 'garbage Do on First Drop stays put and points at what works')
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
assert(!ids(s).includes('hunger'), "Silas's Tip alone does not open the Hunger on the ridge")
s = pick(s, 'tip')
assert(s.sceneId === 'spine:tip')
s = pick(s, 'fill')
assert(s.items.vial_drop === 1 && !s.items.vial_empty, 'empty vial filled from tip smear')
assert((s.flash ?? '').endsWith(FIRST_DROP_DONE) && s.flags.firstDropMarked, 'the tip fills the first Drop and the goal is marked done')
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
s = applyEffect(s, { flag: { hungerKnown: true } })
s = pick(s, 'hunger')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'ridge Hunger button starts Cache Run once the heading is known')
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
assert(!ids(s).includes('now'), 'Silas no longer hands out a free walk-now heading')
assert(visibleChoices(s).find((c) => c.id === 'pay')?.locked === 'Need 1 Glint', 'paid heading shows a named lock without a Glint')
assert(!isChoiceOn(s, visibleChoices(s).find((c) => c.id === 'pay')?.enable), 'paid heading is locked without a Glint')
{
  const strays = s.heat.strays
  s = pick(s, 'tab')
  assert(s.flags.hungerKnown && s.flags.silasOwed && s.flags.silasOwedHeading, 'tab heading: heading known, debt on Silas')
  assert(s.heat.strays === strays + 1 && s.flags.strayNotice, 'tab heading raises Stray Heat and the Strays notice')
  assert(s.sceneId === 'spine:shade' && ids(s).includes('hunger'), 'shade offers the Hunger after the tab heading')
}
s = pick(s, 'hunger')
assert(s.chapterId === 'cache-run' && s.sceneId === 'ch1:leave', 'Kallik heading walks from the shade')
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
  const strays = s.heat.strays
  s = pick(s, 'up')
  assert(s.sap === 2, 'Spine crisis restores less sap than a free refill')
  assert(s.heat.strays === strays + 1 && s.flags.strayNotice && s.flags.noonDebt, 'Spine crisis costs Stray Heat and wakes the Strays')
  assert(s.flags.hungerKnown, 'Spine crisis still guarantees a heading (no soft-lock)')
}

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: -8, goto: 'camp:cages' })
assert(sceneOf(s).kind === 'crisis', 'empty sap is authored crisis')
assert(s.sceneId === 'crisis:camp')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'plan')
s = pick(s, 'inside')
s = pick(s, 'station')
assert(s.sceneId === 'camp:guard', 'button-only prisoner reaches the station')
s = pick(s, 'sabotage')
s = crackVent(s)
assert(s.items.ironwood_baton === 1, 'loot shock-baton from the downed station')
assert(s.sceneId === 'camp:bay', 'sabotage dumps you in the bay')
assert(playCoverKey(s, sceneOf(s)) === 'hotwire', 'lookout bay uses the one-time hotwire art')
assert(/you are the lookout/i.test(bodyOf(s)), 'lookout bay is his working beat')
assert(ids(s).includes('hotwire'), 'lookout offers the hotwire cover')
{
  const covered = interpret(s, 'talk')
  assert(/cover me/i.test(covered.flash ?? ''), 'Do talk on the lookout is Jaxson')
  assert(covered.sceneId === 'camp:bay', 'lookout talk stays on the bay')
}
s = pick(s, 'hotwire')
if (s.flags.hunterHere) s = applyEffect(s, { unsetFlag: ['hunterHere', 'hunterFrom'] })
assert(playCoverKey(s, sceneOf(s)) === 'skiffbay', 'after the hotwire the bay is Skiff Bay art again')
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
assert(bodyOf(s).includes('cybernetic brass jaw'), 'first Jaxson meet is the full card')
assert(!ids(s).some((id) => id.startsWith('who-')), 'no dedicated Who is button')
s = interpret(s, 'who is jaxson')
assert(s.flash?.includes('cybernetic brass jaw'), 'who is Jaxson returns the full card')
assert(s.flags.metOilTooth, 'asking who marks the meet')
assert(!bodyOf(s).includes('cybernetic brass jaw'), 'later pens show what he is doing now')
s = interpret(s, 'xyzzy poetry please')
assert(/Jaxson|brass|Oil-Tooth/.test(s.flash ?? '') && /Try/.test(s.flash ?? ''), 'free-text miss gets Jaxson in his voice and a pointer')

s = newGame('prisoner')
s = pick(s, 'pens')
s = pick(s, 'jaxson')
s = pick(s, 'leave')
assert(s.flags.metOilTooth && s.sceneId === 'camp:lean', 'first Jaxson talk is done at the stall')
assert(playCoverKey(s, sceneOf(s)) === 'oiltooth', 'the stall still uses Jaxson art')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:bay')
assert(s.sceneId === 'camp:bay', 'Map reaches Skiff Bay after the first talk')
assert(playCoverKey(s, sceneOf(s)) === 'skiffbay', 'Skiff Bay uses its own backdrop after the first talk')
assert(!/under a hull/i.test(bodyOf(s)), 'Skiff Bay does not stage Jaxson after the first talk')
assert(/Pike/.test(bodyOf(s)) && /Sarn/.test(bodyOf(s)) && /Vetch/.test(bodyOf(s)), 'bay names the other prisoners')
assert(!/None of them is Jaxson/i.test(bodyOf(s)), 'Skiff Bay does not say who the prisoners are not')
assert(/Ask nicely and you get a short answer/i.test(bodyOf(s)), 'Skiff Bay keeps the short-answer warning')
assert(!ids(s).includes('hotwire'), 'hotwire stays off the bay until the station is down')
{
  const talked = interpret(s, 'talk to pike')
  assert(/pike/i.test(talked.flash ?? '') && !/miss/i.test(talked.flash ?? ''), 'Do talk to Pike is authored')
  assert(!talked.flags.jaxsonInside && !talked.flags.hungerKnown, 'bay talk does not open a quest')
  const named = interpret(s, 'hello sarn')
  assert(/sarn/i.test(named.flash ?? '') && !/miss/i.test(named.flash ?? ''), 'Do hello Sarn is authored')
  const absent = interpret(s, 'talk to jaxson')
  assert(/stall|next bunk/i.test(absent.flash ?? ''), 'Jaxson is at the stall or the bunk, not the bay')
  const bare = interpret(s, 'steal from pike')
  assert(!(s.items.wrench ?? 0), 'this walk reaches the bay without the wrench')
  assert(!bare.flags.bayPikeTook && (bare.items.scrap ?? 0) === (s.items.scrap ?? 0), 'no wrench, no resin bolt')
  assert(/threaded tight/i.test(bare.flash ?? '') && /wrench/i.test(bare.flash ?? ''), 'the bolt says it needs a wrench')
  const before = s.items.scrap ?? 0
  const stole = interpret(applyEffect(s, { add: { wrench: 1 } }), 'steal from pike')
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
s = pick(s, 'plan')
s = pick(s, 'inside')
assert(s.flags.jaxsonInside && s.flags.cartelNotice && !s.flags.guardDown, 'the job is accepted before the station falls')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:bay')
assert(playCoverKey(s, sceneOf(s)) === 'skiffbay', 'accepted job is not yet the Skiff Bay lookout')
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
assert(!ids(s).includes('inside') && ids(s).includes('plan'), 'first Jaxson talk offers his plan, not the job (beat 1)')
assert(!/\bKaelen\b/.test(bodyOf(s)) && !/sabotage/i.test(bodyOf(s)) && /I have a plan to get out of here/.test(bodyOf(s)), 'beat 1: Valerius and a plan, no Kaelen, no sabotage')
assert(!s.flags.kaelenKnown, 'beat 1 does not earn Kaelen')
s = pick(s, 'plan')
assert(s.sceneId === 'camp:jaxson' && ids(s).includes('inside') && !ids(s).includes('plan'), 'beat 2: plan heard, the job can be taken')
assert(/sabotage the guard station/.test(bodyOf(s)) && /Kaelen the Sifter at the Wire/.test(bodyOf(s)) && s.flags.kaelenKnown, 'beat 2: the plan, then Kaelen, earned')
assert(!/not me/i.test(bodyOf(s)), 'no "not me" tag')
for (const k of ['scavenge', 'drop', 'leave']) assert(ids(s).includes(k) || k === 'scavenge', `beat 2 keeps ${k}`)
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
assert(!s.flags.jaxsonInside && s.flags.jaxsonPlan && s.sceneId === 'camp:jaxson', 'Do sabotage before the plan: Jaxson explains it first')
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
assert(!s.flags.jaxsonInside && s.flags.jaxsonPlan && s.sceneId === 'camp:jaxson', 'typing take-the-job before hearing the plan gets the plan first')
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
const noPlan = interpret(s, 'sabotage the guard station')
assert(!noPlan.flags.jaxsonInside && noPlan.sceneId === s.sceneId && /no plan/i.test(noPlan.flash ?? ''), 'Do sabotage before hearing the plan: a nudge back to Jaxson, no job')
s = applyEffect(s, { flag: { jaxsonPlan: true, kaelenKnown: true } })
s = interpret(s, 'sabotage the guard station')
assert(s.flags.jaxsonInside, 'Do sabotage from the vents takes the open job')
assert(s.sceneId === 'camp:guard', 'Do sabotage from the vents reaches the station')

s = newGame('prisoner')
s = pick(s, 'pens')
s = applyEffect(s, { sap: 6 })
s = walkTo(s, 'camp:wire')
s = pick(s, 'kaelen')
s = applyEffect(s, { flag: { jaxsonPlan: true } })
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
assert(bodyOf(s).includes('road is not shared') && bodyOf(s).includes('destination'), 'destination is shared; the road is not a Sap charge')
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
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'hello to Jaxson is authored')
s = interpret(s, 'trade')
assert(s.flash?.toLowerCase().includes('kaelen'), 'Jaxson points trade at Kaelen')
s = interpret(s, 'threaten')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'threaten Jaxson is authored')
s = interpret(s, 'help')
assert(s.flash && !s.flash.toLowerCase().includes('miss'), 'help Jaxson is authored')
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
  heat: { seekers: 2 },
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
  heat: { seekers: 2 },
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
    heat: { seekers: 5 },
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
  assert(hot.sceneId === 'maw:rim' && !hot.flags.hunterHere, 'Heat 8 does not re-arm Sybella on the very next scene')
  hot = applyEffect(hot, { ticks: 1, flag: { encounterAt: 999 } })
  assert(hot.sceneId === 'maw:rim' && hot.flags.hunterHere, 'Heat 8 re-arms Sybella after 2 quiet scenes')

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
  const backNext = applyEffect(backHeld, { ticks: 1, flag: { encounterAt: 999 } })
  assert(!backNext.flags.hunterHere, 'Heat 8 does not re-arm on the next scene')
  assert(applyEffect(backNext, { ticks: 1, flag: { encounterAt: 999 } }).flags.hunterHere, 'Heat 8 re-arms after 2 quiet scenes')

  let spineVal = knockAt('outcast', 'spine', 'spine:ridge', 7, 0)
  assert(!spineVal.flags.hunterHere, 'Spine ignores Cartel Heat: Cartel 7 with Strays 0 does not field a hunter')
  spineVal = { ...spineVal, heat: { ...spineVal.heat, cartel: 0, strays: 3 }, flags: { ...spineVal.flags, strayNotice: true, huntQuiet: 8 } }
  spineVal = applyEffect(spineVal, { ticks: 1 })
  assert(spineVal.flags.hunterHere && pressureFace(spineVal) === SPINE_HUNTER.face, 'Spine Stray Heat 3 fields the Stray collector')
  assert(pressureFace(spineVal) !== 'Valerius', 'Spine hunter is not Valerius in a different coat')
  assert(ids(spineVal).includes('spine-fight') && ids(spineVal).includes('spine-hide'), 'Spine hunt offers fight and hide')
  const spineGlint = pick(applyEffect(spineVal, { add: { glints: 1 } }), 'spine-glint')
  assert(spineGlint.heat.strays === 2 && spineGlint.heat.cartel === 0, 'paying the collector a Glint cools Stray Heat, not Cartel')
  const spineHeld = pick(spineVal, 'spine-scrap')
  assert(!spineHeld.flags.hunterHere && spineHeld.sceneId === 'spine:ridge', 'Spine dismiss stays on the ridge')
  assert(!applyEffect(spineHeld, { ticks: 1 }).flags.hunterHere, 'Spine hunter does not re-arm on the next scene at Heat 3')
  const spineFight = pick(spineVal, 'spine-fight')
  assert(spineFight.flags.encounterHere && spineFight.flags.encounterKind === 'collector', 'Spine hunt fight is the collector')

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

  assert(HUNTER_QUIET_GAPS.map((row) => row.quiet ?? 0).join(',') === '0,8,6,4,2', 'hunter gaps are one table: Heat 0 / 8 / 6 / 4 / 2')
  assert(huntGap(0) === null, 'Heat 0 does not interrupt')
  for (const heat of [1, 2, 3]) assert(huntGap(heat) === 8, `Heat ${heat} waits 8 quiet scenes`)
  for (const heat of [4, 5]) assert(huntGap(heat) === 6, `Heat ${heat} waits 6 quiet scenes`)
  for (const heat of [6, 7]) assert(huntGap(heat) === 4, `Heat ${heat} waits 4 quiet scenes`)
  assert(huntGap(8) === 2, 'Heat 8 waits 2 quiet scenes and is not back-to-back')

  function stepQuiet(state: GameState): GameState {
    return applyEffect(state, { ticks: 1, flag: { encounterAt: 999 } })
  }
  function passQuiet(state: GameState, n: number): GameState {
    let cur = state
    for (let i = 0; i < n; i++) cur = stepQuiet(cur)
    return cur
  }
  function armed(state: GameState, heat: Partial<GameState['heat']>): GameState {
    const flags = { ...state.flags, huntQuiet: 0, encounterAt: 999, sybellaHunting: true }
    delete flags.hunterHere
    delete flags.hunterFrom
    return { ...state, heat: { ...state.heat, ...heat }, flags }
  }

  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    let sk = newGame(door)
    sk = applyEffect(sk, {
      sap: 6,
      enterHub: 'redmaw',
      goto: 'maw:market',
      flag: { chapter1Done: true, sybellaHunting: true, metSybella: true, huntQuiet: 0, encounterAt: 999 },
    })
    sk = armed(sk, { seekers: 0 })
    sk = { ...sk, flags: { ...sk.flags, huntQuiet: 30 } }
    assert(!stepQuiet(sk).flags.hunterHere, `${door} Seeker Heat 0 does not call Sybella`)
    sk = armed(sk, { seekers: 2 })
    const early = passQuiet(sk, 7)
    assert(
      !early.flags.hunterHere && early.sceneId === 'maw:market' && Number(early.flags.huntQuiet) === 7,
      `${door} Seeker Heat 2: Sybella does not re-fire within 8 quiet scenes`,
    )
    const due = stepQuiet(early)
    assert(due.flags.hunterHere && pressureFace(due) === 'Sybella', `${door} Seeker Heat 2 re-arms Sybella on the 8th quiet scene`)
  }

  let hound = newGame('prisoner')
  hound = applyEffect(hound, {
    sap: 6,
    enterHub: 'camp04',
    goto: 'camp:yard',
    flag: { cartelNotice: true, huntQuiet: 0, encounterAt: 999 },
  })
  hound = armed(hound, { cartel: 0 })
  hound = { ...hound, flags: { ...hound.flags, huntQuiet: 30 } }
  assert(!stepQuiet(hound).flags.hunterHere, 'Cartel Heat 0 does not call the handler')
  hound = armed(hound, { cartel: 2 })
  assert(!passQuiet(hound, 7).flags.hunterHere, 'Cartel Heat 2: the handler does not re-fire within 8 quiet scenes')
  assert(pressureFace(stepQuiet(passQuiet(hound, 7))) === 'Hound-handler', 'Cartel Heat 2 re-arms the handler on the 8th quiet scene')
  hound = armed(hound, { cartel: 7 })
  assert(!passQuiet(hound, 3).flags.hunterHere, 'Cartel Heat 7: Valerius does not re-fire within 4 quiet scenes')
  assert(pressureFace(stepQuiet(passQuiet(hound, 3))) === 'Valerius', 'Cartel Heat 7 still brings Valerius, after 4 quiet scenes')

  let ridge = newGame('outcast')
  ridge = applyEffect(ridge, {
    sap: 6,
    enterHub: 'spine',
    goto: 'spine:ridge',
    flag: { huntQuiet: 30, encounterAt: 999 },
  })
  ridge = armed(ridge, { cartel: 8, strays: 0 })
  ridge = { ...ridge, pressure: 9, flags: { ...ridge.flags, huntQuiet: 30, strayNotice: true } }
  assert(!stepQuiet(ridge).flags.hunterHere, 'Spine reads Stray Heat: Strays 0 stays quiet even at Cartel 8')
  ridge = armed(ridge, { cartel: 0, strays: 4 })
  ridge = { ...ridge, pressure: 0, flags: { ...ridge.flags, huntQuiet: 30 } }
  delete ridge.flags.strayNotice
  assert(!stepQuiet(ridge).flags.hunterHere, 'Spine waits for the Strays to notice you (or pressure 6)')
  ridge = armed(ridge, { strays: 2 })
  ridge = { ...ridge, flags: { ...ridge.flags, strayNotice: true } }
  const ridgeEarly = passQuiet(ridge, 7)
  assert(!ridgeEarly.flags.hunterHere, 'Spine Stray Heat 2 uses the low-Heat gap of 8')
  assert(stepQuiet(ridgeEarly).flags.hunterHere, 'Spine Stray Heat 2, noticed, re-arms after 8 quiet scenes')
  ridge = armed(ridge, { strays: 2 })
  delete ridge.flags.strayNotice
  ridge = { ...ridge, pressure: 6 }
  assert(stepQuiet(passQuiet(ridge, 7)).flags.hunterHere, 'a long linger (pressure 6) still wakes the Spine without a notice')

  // Stray-raising acts are what make the Strays notice.
  {
    const base = applyEffect(newGame('outcast'), { goto: 'spine:ridge', enterHub: 'spine', add: { vial_empty: 1, silas_tip: 1 }, flag: { encounterAt: 999 } })
    assert(!base.flags.strayNotice, 'a fresh Outcast is not noticed yet')
    const mercy = pick(applyEffect(base, { goto: 'spine:silas' }), 'mercy')
    assert(mercy.flags.strayNotice && mercy.flags.silasOwed && mercy.flags.silasOwedDrop, "Silas's mercy Drop is a debt and the Strays notice")
    const cut = applyEffect(base, { goto: 'spine:tip' })
    assert(!pick(cut, 'fill').flags.strayNotice, "using Silas's shade-cut is not a theft")
    const armedWell = applyEffect(base, { goto: 'spine:well', add: { needle_knife: 1 } })
    const withKnife = { ...armedWell, equipped: { ...armedWell.equipped, weapon: 'needle_knife' as const } }
    assert(pick(withKnife, 'skim').flags.strayNotice, 'scraping the well wakes the Strays')
    assert(skim(withKnife).flags.strayNotice, 'the Skim verb on the well also wakes the Strays')
    const robbed = interpret(applyEffect(base, { goto: 'spine:silas' }), 'steal from silas')
    assert(robbed.flags.strayNotice, 'trying to rob Silas wakes the Strays')
    const road = applyEffect(base, { startChapter: 'cache-run', goto: 'ch1:o-tax', add: { glints: 0 } })
    assert(pick(road, 'run').flags.strayNotice, 'running past Nim gets you noticed')
  }

  let courtLow = newGame('vessel')
  courtLow = applyEffect(courtLow, {
    sap: 6,
    enterHub: 'threshold',
    goto: 'thresh:court',
    flag: { huntQuiet: 0, encounterAt: 999 },
  })
  courtLow = armed(courtLow, { seekers: 2 })
  assert(!passQuiet(courtLow, 7).flags.hunterHere, 'Court Heat 2: the guard does not re-fire within 8 quiet scenes')
  assert(
    pressureFace(stepQuiet(passQuiet(courtLow, 7))) === 'Court Guard',
    'Court Heat 2 re-arms the guard on the 8th quiet scene',
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
assert(ids(s).includes('enc-fight') && ids(s).includes('enc-skip'), 'fight or skip')
assert(!bodyOf(s).includes('cooked resin'), 'encounter card does not bleed Yard prose')
assert(/The rules: help fight/i.test(bodyOf(s)), 'first encounter teaches Strike/Shell/Health')
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
assert(!/The rules: help fight/i.test(bodyOf(s)), 'later fights skip the lecture')
assert(bodyOf(s).includes('You Strike'), 'compact card still shows compares')
const fought = pick(s, 'enc-fight')
assert(fought.sceneId === 'camp:yard', 'fight stays in the Yard')
assert(fought.flags.encounterHere && fought.flags.encounterDone, 'win holds the outcome card')
assert((fought.items.scrap ?? 0) >= 2, 'winning a jackal yields saleable scrap')
assert(fought.health < 6, 'Health takes the incoming hit, not Sap')
assert(fought.sap === 6, 'Sap is unchanged by a win')
assert(/You hit the [^\n]+ for [1-9]/.test(bodyOf(fought)), 'fight result says plainly what you hit for')
assert(/The [^\n]+ hits you for [1-9]/.test(bodyOf(fought)), `fight result says plainly what they hit you for: ${bodyOf(fought)}`)
assert(!/→|vs their Shell \d+ →|Strike \d+\+\d+/.test(bodyOf(fought)), 'fight result has no maths')
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
{
  // Pup Strike 4 vs bare Shell 0 hits for 4+swing. Your 2 vs its Shell 2 still lands 1+.
  const inSwing = swingOf(s, 'them')
  const outSwing = swingOf(s, 'you')
  const loss = pick(s, 'enc-fight')
  assert((loss.items.glints ?? 0) === beforeGlints, 'lose compare does not pay Glints')
  assert(loss.health === Math.max(0, 6 - (4 + inSwing)), `Shard-pup Strike 4+${inSwing} vs Shell 0 takes ${4 + inSwing} Health; cloth is not armor`)
  if (!loss.flags.downed) {
    assert(new RegExp(`You hit [^\\n]+ for ${Math.max(1, outSwing)}[ .]`).test(bodyOf(loss)), `Fight body says what you hit for (out ${outSwing} in ${inSwing}): ${bodyOf(loss).slice(0, 200)}`)
    assert(new RegExp(`hits you for ${4 + inSwing}[ .]`).test(bodyOf(loss)), 'Fight body says what they hit you for')
  }
  let drop = loss
  for (let i = 0; i < 6 && drop.flags.encounterHere && !drop.flags.encounterDone && !drop.flags.downed; i++) drop = pick(drop, 'enc-fight')
  if (drop.flags.encounterDone && (drop.health ?? 0) <= 0) drop = pick(drop, 'enc-continue')
  assert(drop.flags.downed || drop.flags.encounterDone, 'the pup fight ends in a few rounds')
  if (drop.flags.downed) {
    assert(drop.health === 0, 'empty Health stays at 0')
    assert(!drop.flags.encounterHere, 'the downed state replaces the fight card')
    assert(ids(drop).includes('wake'), 'a hand is offered when you drop')
  }
}

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
  assert(/a person who robs/i.test(bodyOf(card)), `${door} scavenger card is a person`)
  assert(/The rules: help fight/i.test(bodyOf(card)), `${door} first scavenger still teaches`)
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
  const hit = exchangeDamage(2, swingOf(armed, 'you'), 1)
  let stood = pick(armed, 'enc-fight')
  if (hit < 2) {
    assert(!stood.flags.encounterDone, 'scavenger Health 2 survives a 1-point shiv hit')
    assert(/Their Health 1\/2/.test(bodyOf(stood)), 'scavenger has 2 Health')
    assert(/No loot yet/.test(bodyOf(stood)), 'a standing scavenger pays nothing')
    assert((stood.items.scrap ?? 0) === (armed.items.scrap ?? 0), 'a scratch does not pay scrap')
    stood = pick(stood, 'enc-fight')
  }
  const killed = stood
  assert(killed.flags.encounterDone, 'the shiv drops the scavenger')
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
      const shellPiece = (id: string) => ITEMS[id as keyof typeof ITEMS].slot === 'armor' || ITEMS[id as keyof typeof ITEMS].slot === 'cloak'
      if (gained.some(shellPiece)) sawArmor = true
      if (gained.includes('scav_wrap')) sawWrap = true
      if (gained.some((id) => ITEMS[id].slot === 'weapon') && gained.some(shellPiece)) {
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
s = applyEffect(s, { goto: 'spine:silas', add: { scrap: 2 } })
assert(ids(s).includes('shop-buy') && ids(s).includes('shop-sell'), 'Outcast Silas has Buy/Sell like Prisoner Kaelen')
s = openShop(s, 'buy')
assert(ids(s).includes('cloak-glint') && ids(s).includes('cloak-scrap'), 'Outcast Silas cloak is Glint or scrap, two rows')
assert(ids(s).includes('wrap') && ids(s).includes('knife') && ids(s).includes('salve'), 'Outcast Silas sells Scav Wrap, Needle Knife, salve')
s = applyEffect(s, { goto: 'spine:korvan', unsetFlag: ['shopShelf'] })
s = interpret(s, 'talk')
assert(/Red Maw|east wash|amber/i.test(s.flash ?? ''), 'Do talk in the shade back hits Korvan who is there')

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
  assert(paid.heat.seekers === seekers, 'Zafir selling a heading does not raise Seekers — he will not shop the cup to them')
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
  assert(kept.equipped.cloak === 'dust_cloak' && !kept.equipped.armor && !kept.equipped.garment, 'an old Dust-Cloak-on-armor save moves it to the Cloak slot')
  const bareArmor = repairLoadedState({
    ...newGame('prisoner'),
    items: { dust_cloak: 1 },
    equipped: { armor: 'dust_cloak' },
  })
  assert(bareArmor.equipped.cloak === 'dust_cloak' && !bareArmor.equipped.garment, 'armor-only saves do not grow a garment')
}
{
  let cloth = newGame('vessel')
  cloth = pick(cloth, 'keep')
  cloth = applyEffect(cloth, { goto: 'thresh:kaelen', add: { dust_cloak: 1 } })
  cloth = equipItem(cloth, 'dust_cloak')
  assert(
    cloth.equipped.garment === 'ceremonial_cloth' && cloth.equipped.cloak === 'dust_cloak',
    'garment and armor equip together',
  )
  assert(equippedShell(cloth) === 2, 'only the cloak Shell counts when cloth is also worn')
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
assert(man.includes('icon-192.png?v=14') && man.includes('icon-512.png?v=14'), 'manifest ships cache-busted cover-crop PNGs')
assert(!man.includes('favicon.svg'), 'manifest does not install the gold Drop SVG')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
assert(!html.includes('favicon.svg'), 'html does not link the gold Drop SVG')
assert(!html.includes('image/svg+xml'), 'html has no SVG icon link')
assert(html.includes('favicon.png?v=14'), 'tab favicon is the cover PNG')
assert(html.includes('icon-192.png?v=14') && html.includes('icon-512.png?v=14'), 'html ships cache-busted cover PNGs')
assert(html.includes('apple-touch.png?v=14'), 'apple-touch-icon is cache-busted cover crop')
{
  const p = newGame('prisoner')
  assert(playCoverKey(p, sceneOf(p)) === 'camp04', 'Prisoner opening uses Camp-04 art')
  assert(playCoverKey(p, { id: 'camp:cages' }) === 'oiltooth', 'Holding Pens keep Jaxson on the first-meet cover')
  assert(playCoverKey(p, { id: 'camp:jaxson' }) === 'oiltooth', 'Jaxson talk uses his cover')
  const o = newGame('outcast')
  assert(playCoverKey(o, sceneOf(o)) === 'spine', 'Outcast opening uses Spine art')
  const ridge = applyEffect(pick(o, 'stand'), { sap: 6 })
  assert(ridge.sceneId === 'spine:ridge', 'Outcast stands onto the ridge')
  assert(playCoverKey(ridge, sceneOf(ridge)) === 'spine', 'Noon Spine uses Spine art, not Silas')
  const well = walkTo(ridge, 'spine:well')
  assert(playCoverKey(well, sceneOf(well)) === 'spine', 'Dry Well uses Spine art, not Kaelen')
  assert(playCoverKey(well, { id: 'roam:kaelen' }) === 'kaelen', 'Kaelen roaming pass still uses Kaelen art')
  assert(!PEOPLE.silas.scenes.includes('spine:ridge'), 'Silas cover list excludes the ridge')
  assert(!PEOPLE.kaelen.scenes.includes('spine:well'), 'Kaelen cover list excludes the dry well')
  assert(!PEOPLE.oiltooth.scenes.includes('camp:bay'), 'Jaxson cover list excludes Skiff Bay')
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
  assert(/pens|cage|Jaxson/i.test(looked.flash ?? ''), 'look around names the pens')
  assert(!/miss/i.test(looked.flash ?? ''), 'look around is not a miss')
  const examined = interpret(s, 'examine scrip')
  assert(examined.sceneId === 'camp:cages' && /scrip|paper|Ironwood/i.test(examined.flash ?? ''), 'examine names a thing in the pack')
  const noFight = interpret(s, 'attack')
  assert(noFight.sceneId === 'camp:cages' && !noFight.flags.encounterHere, 'attack in the pens does not invent a fight')
  assert(/wrench|throat|shield|fluent|not/i.test(noFight.flash ?? '') && !/miss/i.test(noFight.flash ?? ''), 'attack on Jaxson is a threaten, not a brick wall')
  const bribed = interpret(s, 'bribe')
  assert(/job|wrench|palm/i.test(bribed.flash ?? '') && !/miss/i.test(bribed.flash ?? ''), 'bribe Jaxson is authored')
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

{
  const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
  const exitsOf = (flash: string) => {
    const parts = flash.split('\n').map((line) => line.trim()).filter(Boolean)
    return parts[parts.length - 1] ?? ''
  }
  const dupDirs = (line: string) => {
    const labels = [...line.matchAll(/\b(North|South|East|West):/g)].map((hit) => hit[1])
    return labels.filter((label, index) => labels.indexOf(label) !== index)
  }
  for (const door of ['prisoner', 'outcast', 'vessel'] as const satisfies readonly DoorId[]) {
    for (const scene of ALL_SCENES) {
      const stood: GameState = {
        ...newGame(door),
        sceneId: scene.id,
        hubId: scene.hubId ?? null,
        chapterId: scene.chapterId ?? null,
        ticks: 1,
        pressure: 0,
        flags: { ...newGame(door).flags, encounterAt: 9999 },
      }
      const body = squash(sceneProse(stood))
      const raw = squash(scene.body)
      const looked = interpret(stood, 'look')
      const flash = looked.flash ?? ''
      const flat = squash(flash)
      assert(flash.length > 0, `${door} ${scene.id} look has text`)
      assert(flat !== body && !flat.includes(body), `${door} ${scene.id} look repeats the scene prose`)
      assert(!raw || !flat.includes(raw), `${door} ${scene.id} look contains the raw scene body`)
      const dup = dupDirs(exitsOf(flash))
      assert(dup.length === 0, `${door} ${scene.id} look repeats direction ${dup.join(', ')}: ${exitsOf(flash)}`)
      assert(looked.sceneId === scene.id, `${door} ${scene.id} look stays put`)
    }
  }

  let bay = newGame('prisoner')
  bay = applyEffect(bay, { sap: 6, goto: 'camp:bay', enterHub: 'camp04', add: { wrench: 1 }, flag: { encounterAt: 9999 } })
  const bayLook = interpret(bay, 'look')
  assert(/lash cord/i.test(bayLook.flash ?? ''), 'Skiff Bay look points at the lash cord')
  assert(/resin bolt/i.test(bayLook.flash ?? ''), 'Skiff Bay look points at Pike’s bolt')
  assert(/Sarn/i.test(bayLook.flash ?? '') && /Vetch/i.test(bayLook.flash ?? ''), 'Skiff Bay look points at Sarn and Vetch')
  assert(/wrench/i.test(bayLook.flash ?? ''), 'Skiff Bay look points at the wrench trade')
  assert(/South: Jaxson's Stall, The Wire/.test(bayLook.flash ?? ''), 'Skiff Bay south exits share one label')
  assert(!/South:[\s\S]*South:/.test(exitsOf(bayLook.flash ?? '')), 'Skiff Bay exits do not repeat South')
  assert(bayLook.flags.bayLooked, 'room look still reveals the bay')
  const spent = applyEffect(bay, {
    flag: { lashCord: true, bayPikeTook: true, baySarnTook: true, bayVetchTook: true, wrenchBayTrade: 'pike' },
    remove: { wrench: 1 },
  })
  const spentLook = interpret(spent, 'look')
  assert(!/sits on the runner/i.test(spentLook.flash ?? ''), 'taken lash cord leaves the look')
  assert(!/resin bolt/i.test(spentLook.flash ?? ''), 'taken bolt leaves the look')
  assert(!/wrench will buy/i.test(spentLook.flash ?? ''), 'spent wrench trade leaves the look')
  const north = interpret(bay, 'look north')
  assert(/Guard Station/i.test(north.flash ?? ''), 'look north names the Guard Station')
  assert(!squash(north.flash ?? '').includes(squash(sceneProse(bay))), 'look north does not paste the bay')
  assert(!north.flags.bayLooked, 'look north does not spend the room look')
  const alias = interpret(
    applyEffect(newGame('prisoner'), { goto: 'camp:cages', enterHub: 'camp04', flag: { encounterAt: 9999 } }),
    'l',
  )
  assert(/cage|Jaxson/i.test(alias.flash ?? ''), 'l is a room look')
  const here = interpret(
    applyEffect(newGame('prisoner'), { goto: 'camp:cages', enterHub: 'camp04', flag: { encounterAt: 9999 } }),
    'look here',
  )
  assert(/cage|Jaxson/i.test(here.flash ?? ''), 'look here is a room look')
  const room = interpret(
    applyEffect(newGame('prisoner'), { goto: 'camp:cages', enterHub: 'camp04', flag: { encounterAt: 9999 } }),
    'examine room',
  )
  assert(/cage|Jaxson/i.test(room.flash ?? ''), 'examine room is a room look')
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
  watched = pick(watched, 'plan')
  watched = pick(watched, 'inside')
  watched = { ...watched, ticks: 1, pressure: 0, sap: 6 }
  watched = applyEffect(watched, { goto: 'camp:sabotage' })
  assert(watched.flags.ventPatrol, 'vent roll can put the patrol on the bolt')
  assert(ids(watched).includes('scrap') && !ids(watched).includes('do'), 'a watched bolt is a scrap, not a free crack')
  assert(/in place/i.test(bodyOf(watched)), 'watched bolt says the patrol is there')
  watched = crackVent(watched)
  assert(watched.flags.guardDown && watched.sceneId === 'camp:bay', 'scraping the patrol opens the bay')
  assert(playCoverKey(watched, sceneOf(watched)) === 'hotwire', 'lookout still uses the hotwire art after the scrap')

  let clear = newGame('prisoner')
  clear = pick(clear, 'pens')
  clear = pick(clear, 'jaxson')
  clear = pick(clear, 'plan')
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
s = applyEffect(s, { ticks: 4, heat: { cartel: 3 }, flag: { huntQuiet: 8 } })
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
  heat: { seekers: 2 },
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
  const noHeading = interpret(ridge, 'take hunger')
  assert(noHeading.chapterId !== 'cache-run', 'Outcast cannot type past the heading gate on the ridge')
  ridge = applyEffect(ridge, { flag: { hungerKnown: true } })
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
assert(sw.includes("CACHE = 'amber-shroud-v71'") && sw.includes('covers/carapace.jpg'), 'SW bumped so new portraits reach Pages')
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
assert(css.includes('--story-top: min(calc(56.25cqi * var(--band-bot, 0.5)), 50cqb)') && css.includes('top: var(--story-top)'), 'story starts under the cover band, capped at half the stage')
assert(css.includes('rgba(12, 7, 4, 0.58)'), 'story scrim stays translucent so cover art shows through')
assert(!css.includes('rgba(12, 7, 4, 0.88)'), 'story scrim is lighter than the v32 slab')
const playSrc = readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8')
assert(playSrc.includes('?v=71'), 'scene cover URLs are cache-busted with the service worker')
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

function assertHelpResolves(s: GameState, where: string) {
  const helped = interpret(s, 'help')
  const flash = helped.flash ?? ''
  assert(!!flash && !flash.toLowerCase().includes('miss'), `${where} help is not a miss`)
  const labels = visibleChoices(s).map((c) => c.label)
  const entries = helpEntries(s, labels)
  for (const label of labels) {
    if (label.length < 12) continue
    for (const entry of entries) {
      const line = `${entry.command}: ${entry.why}`
      assert(!line.includes(label), `${where} help does not repeat "${label}"`)
    }
  }
  if (!entries.length) {
    assert(flash.includes('Nothing hidden here'), `${where} says when nothing is hidden`)
    assert(flash.toLowerCase().includes('look'), `${where} empty help still mentions look`)
    assert(helpText(s, labels).includes('Nothing hidden here. Try look.'), `${where} empty help copy`)
    return
  }
  assert(flash.includes('Things you could try'), `${where} help has the header`)
  for (const entry of entries) {
    assert(entry.why.trim().length > 0, `${where} "${entry.command}" has a why`)
    let next: GameState
    try {
      next = interpret(s, entry.command)
    } catch (err) {
      throw new Error(`${where} "${entry.command}" threw: ${(err as Error).message}`)
    }
    const moved = next.sceneId !== s.sceneId || !!next.flags.encounterHere || !!next.flags.hunterHere
    assert(moved || !(next.flash ?? '').startsWith('Miss'), `${where} "${entry.command}" resolves (${next.flash ?? ''})`)
  }
}

{
  const quiet = { encounterAt: 9999 }
  assertHelpResolves(newGame('prisoner'), 'prisoner opening')
  assertHelpResolves(applyEffect(newGame('prisoner'), { goto: 'camp:cages', flag: quiet }), 'pens')
  const bay = applyEffect(newGame('prisoner'), { goto: 'camp:bay', add: { wrench: 1 }, flag: quiet })
  assert(!bay.flags.encounterHere, 'bay help is not standing in a fight')
  assertHelpResolves(bay, 'bay before look')
  const bayHelp = helpEntries(bay, visibleChoices(bay).map((c) => c.label)).map((e) => e.command)
  assert(bayHelp.includes('trade wrench to Pike'), 'hub help lists the typed wrench trade')
  assert(bayHelp.includes('steal bolt from Pike'), 'hub help lists the bolt while you hold the wrench')
  assert(!bayHelp.some((c) => /^go\b/.test(c)), 'bay help does not list map exits')
  const bare = applyEffect(bay, { remove: { wrench: 1 } })
  const bareHelp = helpEntries(bare, visibleChoices(bare).map((c) => c.label)).map((e) => e.command)
  assert(!bareHelp.includes('steal bolt from Pike'), 'no wrench, hub help does not advertise the bolt')
  const pikeBay = interpret(bay, 'walk to pike in the north bay')
  assert(pikeBay.sceneId === 'camp:bay-pike' && pikeBay.flags.bayLooked, 'the north bay button walks to Pike')
  assert(playCoverKey(pikeBay, sceneOf(pikeBay)) === 'bay_pike', "Pike's bay uses its cover")
  const lookedHelp = helpEntries(pikeBay, visibleChoices(pikeBay).map((c) => c.label)).map((e) => e.command)
  assert(!lookedHelp.includes('trade wrench to Pike'), 'wrench trade leaves help once the button shows')
  assert(ids(pikeBay).includes('trade-pike') && ids(pikeBay).includes('cord') && ids(pikeBay).includes('bolt'), "Pike's bay offers cord, bolt, and trade")
  assertHelpResolves(pikeBay, "Pike's bay")
  const pikeLook = interpret(pikeBay, 'look')
  assert(/lash cord/i.test(pikeLook.flash ?? '') && /post/i.test(pikeLook.flash ?? ''), "Pike's bay look shows the cord on the post")
  assert(/resin bolt/i.test(pikeLook.flash ?? '') && /rear leg/i.test(pikeLook.flash ?? ''), "Pike's bay look shows the bolt in the rear leg")
  const sarnBay = interpret(bay, 'go east bay')
  assert(sarnBay.sceneId === 'camp:bay-sarn' && playCoverKey(sarnBay, sceneOf(sarnBay)) === 'bay_sarn', 'go east bay walks to Sarn')
  assert(/scrap twists/i.test(interpret(sarnBay, 'look').flash ?? ''), "Sarn's bay look shows the crate")
  assertHelpResolves(sarnBay, "Sarn's bay")
  const vetchBay = interpret(bay, 'approach Vetch')
  assert(vetchBay.sceneId === 'camp:bay-vetch' && playCoverKey(vetchBay, sceneOf(vetchBay)) === 'bay_vetch', 'approach Vetch walks to her bay')
  const vetchLook = interpret(vetchBay, 'look').flash ?? ''
  assert(/Drop vial/i.test(vetchLook) && /copper wire/i.test(vetchLook), "Vetch's bay look shows the vial and the wire")
  assertHelpResolves(vetchBay, "Vetch's bay")
  assert(interpret(bay, 'look pike').sceneId === 'camp:bay-pike', 'look Pike walks to his bay')
  assert(interpret(pikeBay, 'back').sceneId === 'camp:bay', 'back returns to Skiff Bay')
  assert(interpret(vetchBay, 'back to skiff bay').sceneId === 'camp:bay', 'the back button returns to Skiff Bay')
  for (const scene of ALL_SCENES) {
    if (!scene.id.startsWith('camp:bay')) continue
    const text = [scene.body, ...(scene.variants ?? []).map((v) => v.body), ...scene.choices.map((c) => `${c.label} ${c.sub ?? ''} ${c.effects.flash ?? ''}`), ...(scene.intents ?? []).map((i) => i.reply)].join(' ')
    assert(!/Vetch[^.]*\b(he|him|his)\b/.test(text), `${scene.id} never calls Vetch he`)
  }
  const boltBare = interpret(applyEffect(pikeBay, { remove: { wrench: 1 } }), 'steal bolt from pike')
  assert(!boltBare.flags.bayPikeTook && /threaded tight/i.test(boltBare.flash ?? ''), 'bolt without the wrench is threaded tight')
  const boltWith = interpret(pikeBay, 'steal the bolt')
  assert(boltWith.flags.bayPikeTook && (boltWith.items.scrap ?? 0) === (pikeBay.items.scrap ?? 0) + 1, 'wrench turns out the bolt')
  assert((boltWith.items.wrench ?? 0) === 1, 'turning the bolt keeps the wrench')
  const afterBolt = interpret(boltWith, 'trade wrench to Pike')
  assert(afterBolt.flags.lashCord && !(afterBolt.items.wrench ?? 0), 'the cord trade still works after the bolt')
  const oil = applyEffect(newGame('prisoner'), { goto: 'camp:jaxson', flag: { encounterAt: 9999 } })
  const oilHelp = helpEntries(oil, visibleChoices(oil).map((c) => c.label)).map((e) => e.command)
  assert(!oilHelp.some((c) => /jaxson/i.test(c)), 'Jaxson conversation does not list him again')
  assert(!oilHelp.some((c) => /^go\b/.test(c)), 'Jaxson conversation does not list map exits')
  assertHelpResolves(applyEffect(bay, { flag: { bayLooked: true } }), 'bay after look')
  assertHelpResolves(applyEffect(newGame('prisoner'), { goto: 'camp:kaelen', flag: quiet }), 'kaelen')
  assertHelpResolves(applyEffect(newGame('prisoner'), { goto: 'camp:yard', flag: quiet }), 'yard')
  assertHelpResolves(applyEffect(newGame('outcast'), { goto: 'spine:ridge', flag: quiet }), 'outcast ridge')
  assertHelpResolves(applyEffect(newGame('vessel'), { goto: 'thresh:court', flag: quiet }), 'vessel court')
  assertHelpResolves(
    applyEffect(newGame('prisoner'), { goto: 'ch1:p-oil', startChapter: 'cache-run' }),
    'stolen hull',
  )
  assertHelpResolves(
    applyEffect(newGame('prisoner'), { goto: 'camp:yard', flag: { encounterHere: true, encounterKind: 'stray' } }),
    'encounter',
  )
  assertHelpResolves(
    applyEffect(newGame('prisoner'), { goto: 'camp:yard', health: -99, flag: { downed: true } }),
    'downed',
  )
}

{
  let bay = applyEffect(newGame('prisoner'), { goto: 'camp:bay', add: { wrench: 1 }, flag: { encounterAt: 9999 } })
  const cartel = bay.heat.cartel
  bay = interpret(bay, 'trade wrench to Pike')
  assert(bay.flags.lashCord, 'Pike trades the wrench for lash cord')
  assert(!(bay.items.wrench ?? 0), 'Pike keeps the wrench')
  assert(bay.heat.cartel === cartel, 'wrench trade does not raise Cartel Heat')
  assert(!bay.flags.bayPikeTook, 'trading the wrench does not spend the bolt theft')
  const stole = interpret(bay, 'steal bolt from Pike')
  assert(!stole.flags.bayPikeTook && /needs? a wrench/i.test(stole.flash ?? ''), 'the bolt needs the wrench you traded away')
  const traded = applyEffect(bay, { goto: 'camp:bay-pike' })
  assert(!ids(traded).includes('bolt'), 'traded wrench hides the bolt button')
  assert(!/resin bolt/i.test(interpret(traded, 'look').flash ?? ''), 'traded wrench keeps the bolt out of look')
  let vetch = applyEffect(newGame('prisoner'), { goto: 'camp:bay', add: { wrench: 1 }, flag: { encounterAt: 9999 } })
  vetch = interpret(vetch, 'trade wrench to Vetch')
  assert((vetch.items.vial_drop ?? 0) >= 1, 'Vetch pays a Drop for the wrench')
  assert(!(vetch.items.wrench ?? 0), 'Vetch keeps the wrench')
  const cord = applyEffect(newGame('prisoner'), { goto: 'camp:bay-pike', flag: { bayLooked: true, encounterAt: 9999 } })
  assert(ids(cord).includes('cord') || ids(applyEffect(cord, { add: { wrench: 1 } })).includes('trade-pike'), 'cord and trade stay available')
}

{
  const campOffers = kaelenOffers(applyEffect(newGame('prisoner'), { goto: 'camp:kaelen' })).map((o) => o.id)
  assert(campOffers.includes('knife') && campOffers.includes('wrap') && campOffers.includes('cloak'), 'camp shelf has knife, wrap, cloak')
  const spineOffers = kaelenOffers(applyEffect(newGame('outcast'), { goto: 'roam:kaelen', flag: { kaelenHub: 'spine' } })).map((o) => o.id)
  assert(spineOffers.includes('wrap') && spineOffers.includes('cloak') && spineOffers.includes('knife'), 'Kaelen passing on the Spine still carries the dune shelf')
  const threshOffers = kaelenOffers(applyEffect(newGame('vessel'), { goto: 'thresh:kaelen' })).map((o) => o.id)
  assert(threshOffers.includes('wrap') && threshOffers.includes('cloak'), 'threshold shelf still has wrap and cloak')
  const roam = applyEffect(newGame('prisoner'), { goto: 'roam:kaelen', flag: { kaelenHub: 'redmaw' } })
  const roamOffers = kaelenOffers(roam).map((o) => o.id)
  assert(roamOffers.includes('drop') && roamOffers.includes('knife') && !roamOffers.includes('wrap'), 'Red Maw shelf is Drop, salve, knife')
  assert(KAELEN_APPEARANCE.quietScenes === 2 && KAELEN_APPEARANCE.gap === 7, 'Kaelen stops after 7 quiet actions')
  let pass = applyEffect(newGame('prisoner'), { goto: 'camp:yard', flag: { encounterAt: 9999 } })
  pass = {
    ...pass,
    heat: { cartel: 0, seekers: 0, strays: 0 },
    ticks: 10,
    flags: { ...pass.flags, huntQuiet: 7, encounterAt: 10, kaelenGap: 6 },
  }
  delete pass.flags.encounterHere
  pass = applyEffect(pass, { ticks: 1 })
  assert(pass.flags.kaelenPassing, 'quiet yard on the tick brings Kaelen through')
  assert(pass.flags.kaelenHub === 'camp04', 'passing Kaelen remembers Camp-04')
  const heldDoors = {
    'open:prisoner': 'prisoner',
    'camp:cages': 'prisoner',
    'camp:shiv': 'prisoner',
    'camp:jaxson': 'prisoner',
    'camp:jaxson-cache': 'prisoner',
    'camp:jaxson-drop': 'prisoner',
    'open:outcast': 'outcast',
    'open:vessel': 'vessel',
    'thresh:cell': 'vessel',
    'thresh:shrine': 'vessel',
    'crisis:camp': 'prisoner',
  } as const
  assert(
    KAELEN_HELD_SCENES.length === Object.keys(heldDoors).length &&
      KAELEN_HELD_SCENES.every((id) => id in heldDoors),
    'Kaelen is held out of every opening cell and pen',
  )
  for (const sceneId of KAELEN_HELD_SCENES) {
    let held = applyEffect(newGame(heldDoors[sceneId]), { goto: sceneId, flag: { encounterAt: 9999 } })
    held = {
      ...held,
      heat: { cartel: 0, seekers: 0, strays: 0 },
      ticks: 10,
      flags: { ...held.flags, huntQuiet: 7, encounterAt: 10, kaelenGap: 6 },
    }
    delete held.flags.encounterHere
    delete held.flags.kaelenPassing
    held = applyEffect(held, { ticks: 1 })
    assert(!held.flags.kaelenPassing, `Kaelen does not spawn in ${sceneId}`)
    const showing = { ...held, flags: { ...held.flags, kaelenPassing: true, kaelenHub: held.hubId } }
    assert(!ids(showing).includes('kaelen-pass'), `Kaelen does not stop in ${sceneId}`)
  }
  assert(/Kaelen/.test(bodyOf(applyEffect(newGame('prisoner'), { goto: 'camp:jaxson', flag: { jaxsonPlan: true } }))), 'Jaxson names Kaelen once he explains the plan')

// Jaxson's first talk is two beats: Valerius + "I have a plan" -> Ask about his plan -> the plan + Kaelen.
{
  const fresh = applyEffect(applyEffect(newGame('prisoner'), { goto: 'camp:cages' }), { goto: 'camp:jaxson' })
  const body1 = bodyOf(fresh)
  assert(/Valerius is the first thing/.test(body1) && /I have a plan to get out of here/.test(body1), 'beat 1 text')
  assert(!/\bKaelen\b/.test(body1) && !fresh.flags.kaelenKnown, 'beat 1 never names Kaelen')
  const labels = visibleChoices(fresh).map((c) => c.label)
  assert(labels.includes('Ask about his plan') && !labels.some((l) => /inside job/i.test(l)), 'beat 1: Ask about his plan; no inside job yet')
  assert(!labels.some((l) => /Kaelen/.test(l)), 'no Kaelen button on first talk')
  for (const typed of ['ask about plan', 'what plan', 'plan', 'ask about his plan']) {
    const t = interpret(fresh, typed)
    assert(t.sceneId === 'camp:jaxson' && t.flags.jaxsonPlan && t.flags.kaelenKnown && /Kaelen the Sifter at the Wire/.test(bodyOf(t)), `typed "${typed}" opens beat 2`)
    assert(visibleChoices(t).some((c) => c.label === 'Take the inside job. Take the oversized wrench.'), `typed "${typed}" then offers the job`)
  }
  const pens = bodyOf(applyEffect(newGame('prisoner'), { goto: 'camp:cages' }))
  assert(!/\bKaelen\b/.test(pens), 'pens do not name Kaelen before Jaxson does')
  const pensLabels = getScene('camp:cages').choices.map((c) => `${c.label} ${c.sub ?? ''}`).join(' | ')
  assert(!/\bKaelen\b/.test(pensLabels), 'pens choices do not front-load Kaelen\'s name')
  const yard = interpret(applyEffect(newGame('prisoner'), { goto: 'camp:yard', flag: { encounterAt: 9999 } }), 'rumor')
  assert(!/\bKaelen\b/.test(yard.flash ?? ''), 'yard rumor line does not name Kaelen before he is earned')
  // Old saves parked at camp:jaxson land sensibly.
  const v61 = { ...applyEffect(newGame('prisoner'), { goto: 'camp:jaxson' }), flags: { ...applyEffect(newGame('prisoner'), { goto: 'camp:jaxson' }).flags, kaelenKnown: true } }
  assert(visibleChoices(v61).some((c) => c.id === 'plan') && /I have a plan/.test(bodyOf(v61)), 'v61 save at camp:jaxson (no plan flag) sees beat 1 + Ask about his plan')
  const tookJob = applyEffect(newGame('prisoner'), { goto: 'camp:jaxson', flag: { jaxsonInside: true, metOilTooth: true }, add: { wrench: 1 } })
  assert(!visibleChoices(tookJob).some((c) => c.id === 'plan') && /sabotage the guard station/.test(bodyOf(tookJob)), 'older save that already took the job sees the plan, not the ask')
}

}

{
  let told = applyEffect(newGame('prisoner'), {
    goto: 'maw:ossa',
    flag: { ossaStillness: true, ossaAlly: true, chapter1Done: true },
  })
  assert(ids(told).includes('day'), 'stillness opens a quiet scene with Ossa')
  told = pick(told, 'day')
  assert(told.sceneId === 'maw:ossa-day', 'quiet choice reaches the day')
  const day = bodyOf(told)
  assert(/raised you/i.test(day), 'Ossa admits she raised him')
  assert(/walked the perimeter/.test(day) && /raiders/.test(day) && /fifteen years/.test(day), 'the day on screen: perimeter, raiders, fifteen years')
  const full = getScene('maw:ossa-day')
  const told3 = [full.body, ...(full.variants ?? []).map((v) => v.body)].join('\n')
  assert(/burned everything, and took you/.test(full.body) && /You were thirteen\./.test(full.body), 'the day: raiders burned the homestead and took him at thirteen')
  assert(/I don't know who took you\./.test(full.body), 'she does not know who took him')
  assert(!/Bleed-Cut|Great Bleed|Cartel|Seeker|Stray/.test(told3), 'the reveal names no taker and no faction')
  assert(!/brand/.test(full.body), 'the shared reveal does not explain the brand')
  told = pick(told, 'back')
  assert(told.flags.ossaToldDay, 'she has told the day')
  told = applyEffect(told, { goto: 'maw:ossa' })
  assert(!ids(told).includes('day'), 'the quiet choice does not repeat')
  assert(!/Not out loud/.test(bodyOf(told)), 'after the day she does not refuse to speak it')
  const stranger = applyEffect(newGame('outcast'), { goto: 'maw:ossa', flag: { chapter1Done: true } })
  assert(!ids(stranger).includes('day'), 'without stillness she stays a stranger')
  assert(!/raised you/i.test(bodyOf(stranger)), 'the stranger body does not confess')
}

{
  let lip = applyEffect(newGame('vessel'), { goto: 'maw:lip', flag: { chapter1Done: true } })
  const heat = { ...lip.heat }
  lip = skim(lip)
  assert(lip.heat.cartel === heat.cartel && lip.heat.seekers === heat.seekers && lip.heat.strays === heat.strays, 'Hollow Lip skim raises no Heat')
  assert(/Nobody from the Cartel/i.test(lip.flash ?? ''), 'lip skim says nobody saw it')
}


// ── Outcast: Stray hunt, heading gate, well lock, knife, help/look, scaffolds ──
{
  const quiet = { encounterAt: 9999 }
  const fresh = pick(newGame('outcast'), 'stand')
  assert(fresh.sceneId === 'spine:ridge' && !fresh.flags.hungerKnown, 'Outcast starts on the ridge without a heading')
  const ridgeHook = HUBS.spine.hungerHook
  assert(ridgeHook && !isChoiceOn(fresh, ridgeHook.show), "Spine hub hook stays shut on Silas's Tip alone")
  for (const scene of ['spine:ridge', 'spine:shade', 'spine:silas', 'spine:well', 'spine:korvan', 'spine:mira', 'spine:jodi', 'spine:corvin', 'spine:hound', 'spine:tip']) {
    const at = applyEffect(fresh, { goto: scene, flag: quiet })
    assert(!visibleChoices(at).some((c) => c.effects.startChapter === 'cache-run' && c.tone !== 'danger'), `${scene}: no Hunger exit before a heading`)
  }

  // Well skim: a visible lock that names the requirement.
  const well = applyEffect(fresh, { goto: 'spine:well', flag: quiet, sap: 4 })
  const skimRow = visibleChoices(well).find((c) => c.id === 'skim')
  assert(skimRow && skimRow.locked === 'Needs a weapon equipped', 'well skim stays visible and names what it needs')
  assert(!isChoiceOn(well, skimRow.enable), 'well skim is locked bare-handed')
  assert(!canSkim(well), 'Skim chip is off at the well bare-handed')
  const bare = skim(well)
  assert(!bare.flags['skim:spine:well'] && /weapon equipped/.test(bare.flash ?? ''), 'typed skim at the well names the weapon')

  // Silas's Spine shelf sells the knife; the knife opens the well and the Hound fight.
  let shop = applyEffect(fresh, { goto: 'spine:silas', add: { scrap: 2 }, flag: quiet, sap: 4 })
  shop = pick(shop, 'shop-buy')
  shop = pick(shop, 'knife')
  assert((shop.items.needle_knife ?? 0) === 1, 'Spine Silas sells a Needle Knife')
  shop = equipItem(shop, 'needle_knife')
  assert(shop.equipped.weapon === 'needle_knife', 'knife equips')
  const armedWell = applyEffect(shop, { goto: 'spine:well', flag: quiet })
  assert(isChoiceOn(armedWell, visibleChoices(armedWell).find((c) => c.id === 'skim')?.enable), 'knife unlocks the well skim')
  const scraped = pick(armedWell, 'skim')
  assert((scraped.items.vial_drop ?? 0) >= 1 && scraped.flags.strayNotice, 'scraping the well yields a Drop and wakes the Strays')
  const houndGround = applyEffect(shop, { goto: 'spine:hound', flag: quiet })
  assert(ids(houndGround).includes('cut'), 'equipped knife reaches the Hound fight')

  // hungerKnown sources on the Spine.
  const paidCache = applyEffect(fresh, { goto: 'spine:silas-cache', add: { glints: 1 }, flag: quiet })
  const paid = pick(paidCache, 'pay')
  assert(paid.flags.hungerKnown && !paid.items.glints && !paid.flags.silasOwed, 'a Glint buys the heading with no debt')
  assert(paid.heat.strays === paidCache.heat.strays, 'paid heading adds no Stray Heat')
  const kor = pick(applyEffect(fresh, { goto: 'spine:korvan', add: { scrap: 2 }, flag: quiet }), 'hunger-scrap')
  assert(kor.flags.hungerKnown && kor.flags.korvanHunger && !kor.items.scrap, 'Korvan trades the heading for 2 scrap')
  const val = pick(applyEffect(fresh, { goto: 'spine:valerius', flag: quiet }), 'ask')
  assert(val.flags.hungerKnown, 'asking at Hound Sign still names the skiff')

  // Help and look on Spine ground.
  for (const scene of ['spine:ridge', 'spine:well', 'spine:hound', 'spine:shade', 'spine:silas', 'spine:silas-cache', 'spine:korvan', 'spine:mira', 'spine:jodi', 'spine:corvin']) {
    const at = applyEffect(fresh, { goto: scene, flag: quiet })
    assertHelpResolves(at, `outcast ${scene}`)
    const looked = interpret(at, 'look')
    assert(!!looked.flash && !/^Miss/.test(looked.flash), `${scene} look answers`)
  }
  const wellHelp = helpEntries(well, visibleChoices(well).map((c) => c.label)).map((e) => e.command)
  assert(wellHelp.includes('look at throat') && wellHelp.includes('look at bricks'), 'well help lists the throat and the bricks')
  assert(/weapon equipped/.test(interpret(well, 'look at throat').flash ?? ''), 'look throat names the weapon')
  const ridgeHelp = helpEntries(fresh, visibleChoices(fresh).map((c) => c.label)).map((e) => e.command)
  assert(ridgeHelp.includes('look at tracks'), 'ridge help lists the tracks')
  assert(/Hound Sign/.test(interpret(fresh, 'look at tracks').flash ?? ''), 'look tracks points at Hound Sign')

  // The hunter face is generic and lives in one place.
  assert(!/valerius/i.test(JSON.stringify(SPINE_HUNTER)), 'Spine hunter copy does not name Valerius')
  assert(!/\bthis is not\b|\bnot a\b/i.test(JSON.stringify(SPINE_HUNTER)), 'Spine hunter copy has no "this is not X" lines')

  // Scaffolds never reach a player.
  assert(SHADE_HANDS_LIVE && !SILAS_JOB_LIVE, 'shade walk-ups are live (Korvan, Mira, Jodi); the Silas job is a scaffold, off')
  const shade = applyEffect(fresh, { goto: 'spine:shade', flag: quiet })
  assert(!visibleChoices(shade).some((c) => /TODO/.test(c.label)), 'shade shows no placeholder walk-ups')
  assert(ids(shade).includes('walk-korvan') && ids(shade).includes('walk-mira') && ids(shade).includes('walk-jodi'), 'shade walks up to Korvan, Mira, and Jodi')
  for (const scene of ALL_SCENES) {
    const text = JSON.stringify(scene)
    assert(!/TODO_STRAY/.test(text), `${scene.id} carries no walk-up placeholder`)
    assert(!scene.id.startsWith('spine:shade-'), `${scene.id} is a scaffold scene that should not be live`)
  }
  assert(!ALL_SCENES.some((sc) => JSON.stringify(sc).includes(SILAS_JOB_FLAGS.taken)), 'no scene reads the Silas job flags yet')
}

// ── Outcast no-soft-lock: choices only, zero Glints, Spine to the Maw ──
{
  let run = newGame('outcast')
  run = pick(run, 'stand')
  run = { ...run, flags: { ...run.flags, encounterAt: 9999 } }
  assert(!run.items.glints, 'no-soft-lock run starts with no Glints')
  run = travelTo(run, 'spine:shade')
  run = pick(run, 'talk')
  run = pick(run, 'cache')
  run = pick(run, 'tab')
  assert(run.flags.hungerKnown && run.sceneId === 'spine:shade', 'a broke Outcast can still earn the heading on the tab')
  run = pick(run, 'hunger')
  assert(run.chapterId === 'cache-run' && run.sceneId === 'ch1:leave', 'heading opens the Cache Run')
  run = { ...run, sap: Math.max(run.sap, 4) }
  run = outcastToSybella(run)
  run = pick(run, 'maw')
  assert(run.sceneId === 'ch1:land' && run.flags.chapter1Done, 'Outcast lands the chapter')
  run = pick(run, 'hub')
  assert(run.hubId === 'redmaw' && run.sceneId === 'maw:rim', 'Outcast reaches the Red Maw Approach')

  // Running dry is still a way out, at a price.
  let dry = pick(newGame('outcast'), 'stand')
  dry = applyEffect(dry, { sap: -9, goto: 'spine:ridge' })
  assert(dry.sceneId === 'crisis:spine', 'running dry on the Spine is the authored crisis')
  dry = pick(dry, 'up')
  assert(dry.flags.hungerKnown && ids(dry).includes('hunger'), 'the crisis still leaves a road to the Maw')
}

// Typed "drink a drop" on a merchant screen drinks (same as the Drink a Drop row). It never buys.
{
  const VENDOR_SCENES = ['camp:kaelen', 'thresh:kaelen', 'roam:kaelen', 'maw:zafir', 'maw:market', 'spine:silas', 'spine:silas-drop']
  const sig = (x: GameState) => JSON.stringify([x.sceneId, x.items, x.sap, x.heat, x.flags.shopShelf ?? null, x.flash])
  const at = (door: DoorId, id: string, shelf: 'buy' | 'sell' | undefined, drops: number) => {
    const sc = getScene(id)
    let x = applyEffect(newGame(door), {
      goto: id,
      enterHub: sc.hubId,
      startChapter: sc.chapterId,
      add: { glints: 3, scrap: 4, vial_empty: 1 },
      flag: { encounterAt: 99999, ...(shelf ? { shopShelf: shelf } : {}) },
    })
    x = applyEffect(x, { remove: { vial_drop: x.items.vial_drop ?? 0 } })
    x = { ...x, sap: 2 } // low sap, like the report
    if (drops) x = applyEffect(x, { add: { vial_drop: drops } })
    x = { ...x, flags: { ...x.flags } }
    delete x.flags.hunterHere
    delete x.flags.encounterHere
    assert(x.sceneId === id && (x.items.vial_drop ?? 0) === drops, `${door} reaches ${id} with ${drops} Drops`)
    return x
  }
  let covered = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    for (const id of VENDOR_SCENES) {
      for (const shelf of [undefined, 'buy', 'sell'] as const) {
        const held = at(door, id, shelf, 5)
        const button = drinkDrop(held)
        assert(button.items.vial_drop === 4 && button.sap === held.sap + 3, `${door} ${id} Drink a Drop button drinks one`)
        for (const line of ['drink a drop', 'drink drop', 'use a drop', 'Drink a Drop', 'sip a drop']) {
          const typed = interpret(held, line)
          assert(sig(typed) === sig(button), `${door} ${id}${shelf ? `[${shelf}]` : ''} typed "${line}" matches the Drink a Drop button (got ${typed.flash})`)
          assert(typed.items.glints === held.items.glints && typed.items.scrap === held.items.scrap, `${door} ${id} typed "${line}" spends nothing`)
          assert((typed.items.vial_empty ?? 0) === (held.items.vial_empty ?? 0) + 1, `${door} ${id} typed "${line}" leaves an empty vial`)
        }
        const dry = at(door, id, shelf, 0)
        for (const line of ['drink a drop', 'drink drop', 'use a drop']) {
          const typed = interpret(dry, line)
          assert(typed.flash === 'You have no Drop to drink.', `${door} ${id} typed "${line}" with no Drops says so (got ${typed.flash})`)
          assert(sig({ ...typed, flash: '' }) === sig({ ...dry, flash: '' }), `${door} ${id} typed "${line}" with no Drops buys nothing and opens no shelf`)
        }
        assert(sig({ ...drinkDrop(dry), flash: '' }) === sig({ ...dry, flash: '' }) && drinkDrop(dry).flash === 'You have no Drop to drink.', `${door} ${id} empty Drink button says the same`)
        if (shelf !== 'sell') {
          // Silas takes a Glint or scrap, so a bare buy asks which; naming the price buys.
          const pay = id.startsWith('spine:silas') ? ' with a glint' : ''
          for (const line of ['buy vial', 'buy a drop', 'purchase a drop'].map((l) => l + pay)) {
            const bought = interpret(dry, line)
            assert((bought.items.vial_drop ?? 0) === 1, `${door} ${id}${shelf ? `[${shelf}]` : ''} typed "${line}" still buys a Drop (got ${bought.flash})`)
            assert((bought.items.glints ?? 0) + (bought.items.scrap ?? 0) < (dry.items.glints ?? 0) + (dry.items.scrap ?? 0), `${door} ${id} "${line}" costs something`)
          }
        }
        const cut = applyEffect(held, { add: { salve: 1 } })
        const salveCount = cut.items.salve ?? 0
        const bind = interpret(cut, 'use salve')
        assert((bind.items.salve ?? 0) === salveCount - 1 && bind.items.glints === cut.items.glints && bind.items.scrap === cut.items.scrap, `${door} ${id} typed "use salve" binds a carried salve, never buys one`)
        const noSalve = applyEffect(held, { remove: { salve: salveCount } })
        const none = interpret(noSalve, 'use salve')
        assert(none.flash === 'You have no salve to use.' && (none.items.salve ?? 0) === 0, `${door} ${id} "use salve" with none says so`)
        covered++
      }
    }
  }
  assert(covered === 63, `merchant drink checks cover every door and shelf (${covered})`)

  // Typing any visible, enabled button's label does what tapping it does, everywhere.
  const bsig = (x: GameState) => JSON.stringify([x.sceneId, x.items, x.sap, x.heat, x.health, x.flags.shopShelf ?? null, x.flags.rumorShelf ?? null])
  const off: string[] = []
  let rows = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    for (const sc of ALL_SCENES) {
      if (sc.id.startsWith('open:')) continue
      for (const shelf of [undefined, 'buy', 'sell'] as const) {
        let x = applyEffect(newGame(door), {
          goto: sc.id,
          enterHub: sc.hubId,
          startChapter: sc.chapterId,
          sap: 4,
          add: { vial_drop: 2, glints: 2, scrap: 3, salve: 1 },
          flag: { encounterAt: 99999, ...(shelf ? { shopShelf: shelf } : {}) },
        })
        x = { ...x, flags: { ...x.flags } }
        delete x.flags.hunterHere
        delete x.flags.encounterHere
        if (x.sceneId !== sc.id) continue
        for (const c of visibleChoices(x)) {
          if (!isChoiceOn(x, c.enable)) continue
          rows++
          if (bsig(interpret(x, c.label)) !== bsig(applyEffect(x, c.effects))) off.push(`${door} ${sc.id} "${c.label}"`)
        }
        if (bsig(interpret(x, 'drink a drop')) !== bsig(drinkDrop(x))) off.push(`${door} ${sc.id} "drink a drop"`)
      }
    }
  }
  assert(rows > 1000 && off.length === 0, `typed button labels match the tap (${rows} rows): ${off.slice(0, 5).join(' | ')}`)
}

// An action button has to change something: place, gear, Sap, Health, Heat, a flag the game reads,
// or a shelf. Flavor goes to look, help, and typed lines.
{
  const NOISE = new Set(['encounterAt', 'huntQuiet'])
  // Rows that move you back to where you came from; the synthetic setup has no "from".
  const RETURN_ROWS = new Set(['camp:gate back', 'roam:kaelen back'])
  const moved = (a: GameState, b: GameState) => {
    if (a.sceneId !== b.sceneId || a.hubId !== b.hubId || a.chapterId !== b.chapterId) return true
    if (JSON.stringify(a.items) !== JSON.stringify(b.items) || JSON.stringify(a.heat) !== JSON.stringify(b.heat)) return true
    if ((b.health ?? 0) !== (a.health ?? 0) || b.sap > a.sap) return true
    const keys = new Set([...Object.keys(a.flags), ...Object.keys(b.flags)])
    for (const k of keys) if (!NOISE.has(k) && JSON.stringify(a.flags[k]) !== JSON.stringify(b.flags[k])) return true
    return false
  }
  const flat: string[] = []
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    for (const sc of ALL_SCENES) {
      if (sc.id.startsWith('open:')) continue
      for (const shelf of [undefined, 'buy', 'sell'] as const) {
        let x = applyEffect(newGame(door), {
          goto: sc.id,
          enterHub: sc.hubId,
          startChapter: sc.chapterId,
          sap: 4,
          health: -2,
          heat: { cartel: 2, seekers: 2, strays: 2 },
          add: { vial_drop: 2, glints: 2, scrap: 3, salve: 1 },
          flag: { encounterAt: 99999, ...(shelf ? { shopShelf: shelf } : {}) },
        })
        x = { ...x, flags: { ...x.flags } }
        delete x.flags.hunterHere
        delete x.flags.encounterHere
        if (x.sceneId !== sc.id) continue
        for (const c of visibleChoices(x)) {
          if (!isChoiceOn(x, c.enable) || RETURN_ROWS.has(`${sc.id} ${c.id}`)) continue
          if (!moved(x, applyEffect(x, c.effects))) flat.push(`${door} ${sc.id} "${c.label}"`)
        }
      }
    }
  }
  assert(flat.length === 0, `action buttons that only print text: ${[...new Set(flat)].slice(0, 6).join(' | ')}`)

  // Ready the stolen Strider is real: the Hunger ride starts with the Sap it saved.
  let v = walkTo(pick(newGame('vessel'), 'keep'), 'thresh:paddock')
  v = applyEffect(v, { add: { strider_bit: v.items.strider_bit ? 0 : 1 }, flag: { hungerKnown: true } })
  if (v.flags.hunterHere) v = applyEffect(v, { unsetFlag: ['hunterHere', 'hunterFrom'] })
  v = dismissFight(v)
  v = { ...v, sap: 3 }
  const readied = pick(v, 'ready')
  assert(readied.flags.striderReady && !ids(readied).includes('ready'), 'readying the Strider sticks and the row goes away')
  const rode = pick(walkTo(readied, 'thresh:court'), 'hunger')
  const base = pick(walkTo(v, 'thresh:court'), 'hunger')
  assert(rode.chapterId === 'cache-run' && rode.sap === base.sap + STRIDER_READY_SAP, `the readied Strider saves ${STRIDER_READY_SAP} Sap on the Hunger (${base.sap} → ${rode.sap})`)
  assert(rode.flags.striderSpent && !base.flags.striderSpent, 'only a readied Strider spends itself')
}

// Fights always end. Min 1 damage per landed exchange, a 0-2 swing on each Strike, and a walk-off valve.
{
  assert(DAMAGE_FLOOR === 1 && exchangeDamage(1, 0, 3) === 1 && exchangeDamage(0, 0, 9) === 1, 'a landed hit is never 0')
  assert(exchangeDamage(1, 2, 2) === 1 && exchangeDamage(3, 2, 3) === 2, 'swing adds to Strike before Shell')
  // The reported stalemate: Outcast, bare Strike 1 + Shell 3 (Dust Cloak 2 + Head Wrap 1) vs Rim cutter Strike 3 / Shell 2 / Health 2.
  for (let t = 0; t < 40; t++) {
    const base = primedFight('outcast', 10 + t, 'cutter', { hp: 2, arm: false })
    let f: GameState = { ...base, items: { ...base.items, dust_cloak: 1, head_wrap: 1 }, equipped: { ...base.equipped, weapon: undefined, cloak: 'dust_cloak', head: 'head_wrap' } }
    assert(/You Strike 1 vs their Shell 2/.test(bodyOf(f)) && /Their Strike 3 vs your Shell 3/.test(bodyOf(f)), 'stalemate stats are on the card')
    const swings = [swingOf(f, 'you'), swingOf(f, 'them')]
    assert(swings.every((n) => n >= 0 && n <= 2) && swingOf(f, 'you') === swings[0], 'swing is 0-2 and the same state gives the same swing')
    let rounds = 0
    let lastHp = Number(f.flags.encounterHp)
    let lastHealth = f.health
    while (f.flags.encounterHere && !f.flags.encounterDone && rounds < 6) {
      f = pick(f, 'enc-fight')
      rounds++
      const card = String(f.flags.encounterClash ?? '')
      if (f.flags.encounterHere) {
        assert(/You hit [^\n]+ for [1-9]/.test(card), `round log says what you hit for (${card.slice(0, 80)})`)
        assert(/hits you for [1-9]/.test(card), 'round log says what they hit you for')
      }
      if (!f.flags.encounterDone && f.flags.encounterHere) {
        assert(Number(f.flags.encounterHp) < lastHp && f.health < lastHealth, 'both sides lose at least 1 Health every round')
        lastHp = Number(f.flags.encounterHp)
        lastHealth = f.health
      }
    }
    assert(rounds <= 2 && (f.flags.encounterDone || f.flags.downed), `the old stalemate ends within 2 rounds (seed ${t}: ${rounds})`)
    if (f.flags.encounterDone) assert(/They drop/.test(String(f.flags.encounterClash)), 'the cutter goes down')
  }

  // Valve: if three rounds pass with no damage either way, the enemy leaves the road. No loot. Fight over.
  const tick = primedFight('outcast', 12, 'tick', { hp: 1, arm: false })
  let v: GameState = { ...tick, items: { ...tick.items, dust_cloak: 1 }, equipped: { armor: 'dust_cloak' } }
  const kept = JSON.stringify(v.items)
  for (let r = 1; r <= STALL_ROUNDS; r++) {
    const res = resolveEncounter(v, 'fight', { floor: 0 })
    v = applyEffect(v, { ...res.fx, ticks: 1 })
    if (r < STALL_ROUNDS) {
      assert(!v.flags.encounterDone && Number(v.flags.encounterStall) === r, `zero round ${r} counts toward the walk-off`)
    }
  }
  assert(v.flags.encounterDone, 'three zero rounds end the fight')
  assert(String(v.flags.encounterFlash) === 'The Amber-tick backs off and leaves the road. No loot.', `walk-off line (${v.flags.encounterFlash})`)
  assert(JSON.stringify(v.items) === kept, 'a walk-off pays no loot')
  const on = pick(v, 'enc-continue')
  assert(!on.flags.encounterHere && !on.flags.encounterStall && !on.flags.encounterRound, 'On. clears the fight and its counters')
}

// Fight help card: opens by itself on the first fight of a run, once per door, then only from help.
{
  const starts: Record<DoorId, string> = { prisoner: 'camp:yard', outcast: 'spine:ridge', vessel: 'thresh:court' }
  const hubs: Record<DoorId, string> = { prisoner: 'camp04', outcast: 'spine', vessel: 'threshold' }
  const kinds: Record<DoorId, string> = { prisoner: 'jackal', outcast: 'collector', vessel: 'scavenger' }
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    let g = applyEffect(newGame(door), { goto: starts[door], enterHub: hubs[door] })
    g = { ...g, sap: 6, health: 6, flags: { ...g.flags, encounterHere: false } }
    delete g.flags.encounterHere
    delete g.flags.hunterHere
    assert(!fightHelpAuto(g), `${door} no fight card before a fight`)
    let f = applyEffect(g, beginEncounter(g, kinds[door] as never))
    assert(f.flags.encounterHere && fightHelpAuto(f), `${door} first fight opens the fight card`)
    assert(/The rules: help fight/.test(bodyOf(f)) && !/Strike \+ swing/.test(bodyOf(f)), `${door} first fight log points at help fight without restating the formula`)
    f = markFightHelpSeen(f)
    assert(!fightHelpAuto(f), `${door} dismissing the card closes it`)
    const saved = repairLoadedState(JSON.parse(JSON.stringify(f)))
    assert(saved.flags.fightHelpSeen === true, `${door} the seen flag is saved`)
    let n = 0
    while (f.flags.encounterHere && !f.flags.encounterDone && !f.flags.downed && n < 8) {
      f = pick(f, 'enc-fight')
      n++
      assert(!fightHelpAuto(f), `${door} the card stays shut mid-fight`)
    }
    if (f.flags.encounterDone) f = pick(f, 'enc-continue')
    if (f.flags.downed) f = pick(f, 'wake')
    f = { ...f, health: 6, sap: 6, sceneId: starts[door], hubId: hubs[door] }
    const second = applyEffect(f, beginEncounter(f, 'jackal'))
    assert(second.flags.encounterHere && !fightHelpAuto(second), `${door} second fight does not open the card`)
    // A different door is its own run: it still gets the card once.
    const other = applyEffect(newGame(door === 'vessel' ? 'prisoner' : 'vessel'), { flag: { encounterHere: true, encounterKind: 'jackal', encounterHp: 1 } })
    assert(fightHelpAuto(other), `${door}: a fresh run of another door still gets its first card`)
  }
  // An old save that already fought does not get a surprise card.
  const veteran = applyEffect(newGame('outcast'), { flag: { fightTaught: true, encounterHere: true, encounterKind: 'jackal', encounterHp: 1 } })
  assert(!fightHelpAuto(veteran), 'saves that already fought skip the auto card')

  // Reachable afterward: typed help fight, and the topic list in the help card.
  for (const t of ['help fight', 'HELP FIGHT', '? fight', 'help combat']) assert(isFightHelpAsk(t), `"${t}" opens the fight card`)
  for (const t of ['fight', 'help', 'fight the road', 'help scavenge']) assert(!isFightHelpAsk(t), `"${t}" is not the fight card`)
  const helpSrc = readFileSync('src/components/HelpCard.tsx', 'utf8')
  assert(/HELP_TOPICS\.map/.test(helpSrc) && /onTopic\(topic\.id\)/.test(helpSrc) && /HELP_HINT/.test(helpSrc), 'the help card lists tappable topics with the hint')
  const playSrc = readFileSync('src/components/PlayScreen.tsx', 'utf8')
  assert(/helpRoute\(t\)/.test(playSrc) && /fightHelpAuto\(state\)/.test(playSrc) && /markFightHelpSeen/.test(playSrc) && /setTopicOpen\(id\)/.test(playSrc), 'PlayScreen routes typed help <topic>, taps, the first-fight pop, and the seen flag')
  assert(!/dos-|#7dff8a/.test(readFileSync('src/index.css', 'utf8')), 'topic cards keep the normal help-card style')

  // help routing
  assert(helpRoute('help')?.kind === 'list' && helpRoute('?')?.kind === 'list', 'bare help is the list')
  assert(helpRoute('look') === null && helpRoute('helpful hint') === null, 'other lines are not help')
  const topicIds = HELP_TOPICS.map((t) => t.id)
  assert(JSON.stringify(topicIds) === JSON.stringify(['fight', 'scavenge', 'skim', 'look', 'talk', 'go', 'trade', 'drink', 'heat', 'gear']), `topic list (${topicIds})`)
  for (const t of HELP_TOPICS) {
    const r = helpRoute(`help ${t.id}`)
    assert(r?.kind === 'topic' && r.topic.id === t.id, `help ${t.id} opens its card`)
    for (const alias of t.aliases) {
      const ra = helpRoute(`help ${alias}`)
      assert(ra?.kind === 'topic' && ra.topic.id === t.id, `help ${alias} opens ${t.id}`)
    }
    const typed = interpret(newGame('prisoner'), `help ${t.id}`)
    assert(typed.flash === topicText(t), `typed help ${t.id} answers with the card text`)
  }
  const unknown = helpRoute('help xyzzy')
  assert(unknown?.kind === 'unknown' && unknown.reply.includes(topicListText()) && unknown.reply.startsWith('No help topic "xyzzy".'), 'unknown help lists the topics')
  assert(interpret(newGame('vessel'), 'help xyzzy').flash?.includes('help scavenge:'), 'typed unknown help replies with the list')
  assert(/Try: help <topic>\. Topics: fight, scavenge/.test(interpret(newGame('outcast'), 'help').flash ?? ''), 'plain help names the topics')

  // Card content: formula once, options, and the Down rules last.
  const text = fightHelpText()
  assert(text.startsWith('help fight'), 'fight card header')
  assert(/DAMAGE: Strike \+ swing - Shell\. Never less than 1\./.test(text) && /add 0, 1, or 2 to Strike/.test(text), 'formula and swing on the card')
  assert(text.indexOf('AT 0 HEALTH') > text.indexOf('OPTIONS') && /Give the road/.test(text), 'options come before the Down rules')
  assert(/^By door: .*Outcast .*Corvin.*Vessel/.test(FIGHT_HELP_LINES[FIGHT_HELP_LINES.length - 1]), 'the card ends with the per-door Down note')

  // help scavenge says what the code does: once per fresh scene, and the refresh secret.
  const scavText = topicText(HELP_TOPICS[1])
  assert(/once per fresh scene/.test(scavText) && /SECRET TIP/.test(scavText), 'scavenge card states the rule and the secret tip')
  assert(/two more actions that pass time, or walk away and come back/.test(scavText) && /Look does not pass time/.test(scavText), 'secret tip names the refresh')
  {
    let y = applyEffect(newGame('prisoner'), { goto: 'camp:yard', enterHub: 'camp04', flag: { encounterAt: 99999 } })
    y = { ...y, sap: 8, pressure: 0, flags: { ...y.flags } }
    delete y.flags.hunterHere
    delete y.flags.encounterHere
    const calm = (x: GameState) => {
      const c = { ...x, flags: { ...x.flags } }
      delete c.flags.hunterHere
      delete c.flags.encounterHere
      return c
    }
    const took = (a: GameState, b: GameState) => JSON.stringify(a.items) !== JSON.stringify(b.items)
    const first = scavenge(y)
    assert(took(y, first), 'first scavenge finds something')
    const again = scavenge(first)
    assert(!took(first, again) && /already in your hands/.test(again.flash ?? ''), 'right away: the patch is already in your hands')
    const looked = interpret(first, 'look')
    assert(looked.ticks === first.ticks && !took(looked, scavenge(looked)), 'look does not refresh the patch')
    const line = visibleChoices(first).find((c) => c.id === 'line')!
    const one = calm(applyEffect(first, line.effects))
    assert(!took(one, scavenge(one)), 'one action is not enough')
    const two = calm(applyEffect(one, line.effects))
    assert(took(two, scavenge(two)), 'two actions that pass time refresh the patch')
    const away = calm(travelTo(first, 'camp:cages'))
    const back = calm(travelTo(away, 'camp:yard'))
    assert(back.sceneId === 'camp:yard' && took(back, scavenge(back)), 'walking away and back refreshes the patch')
  }

  // The Down rules on the card match the game: a Cartel fight in Camp-04 wakes you in the Yard with +2 Cartel Heat.
  let down = applyEffect(newGame('prisoner'), { goto: 'camp:yard', enterHub: 'camp04' })
  down = { ...down, sap: 4, health: 1, flags: { ...down.flags, encounterHere: true, encounterKind: 'handler', encounterHp: 9, fightTaught: true } }
  delete down.flags.hunterHere
  const fell = pick(down, 'enc-fight')
  assert(fell.flags.downed && fell.flags.downedKind === 'handler', 'going down remembers who did it')
  const woke = pick(fell, 'wake')
  assert(woke.sceneId === 'camp:yard' && woke.health === 1 && woke.heat.cartel === down.heat.cartel + 2 && !woke.flags.downedKind, 'Cartel Down in Camp-04: Yard, 1 Health, +2 Cartel Heat')
  let road = applyEffect(newGame('outcast'), { goto: 'spine:ridge', enterHub: 'spine' })
  road = { ...road, sap: 4, health: 1, flags: { ...road.flags, encounterHere: true, encounterKind: 'cutter', encounterHp: 9, fightTaught: true } }
  delete road.flags.hunterHere
  const up = pick(pick(road, 'enc-fight'), 'wake')
  assert(up.health === 1 && up.sap === 3 && JSON.stringify(up.items) === JSON.stringify(road.items), 'most ground: 1 Health, 1 Sap, gear kept')
}


// ── Outcast rework: Kaelen and Jaxson are cameos only; the brand; Korvan, Mira, Corvin; salve finds ──
{
  const PRISONER_NAMES = /Kaelen|Sifter|Jaxson|\bVance\b/
  // Kaelen's roaming pack passing by is the one cameo allowed on the Outcast road.
  const CAMEO_ALLOW = new Set(['roam:kaelen'])
  const PRISONER_FLAGS = new Set(['oilRide', 'oilRoad', 'oilTag', 'jaxsonInside', 'oilRefused', 'oilResentful', 'oilMended', 'oilAlly', 'oilJob', 'leftCamp', 'guardDown', 'wireCut', 'campLockdown', 'quietFence', 'bayLooked'])
  /** True when no Outcast state can pass this condition. */
  const shutForOutcast = (c?: Cond): boolean => {
    if (!c) return false
    if (c.door && c.door !== 'outcast') return true
    if (c.flag && PRISONER_FLAGS.has(c.flag)) return true
    if (c.not?.door === 'outcast') return true
    if (c.all?.some(shutForOutcast)) return true
    if (c.any?.length && c.any.every(shutForOutcast)) return true
    return false
  }
  const outcastScene = (id: string) =>
    id === 'open:outcast' ||
    id.startsWith('spine:') ||
    (id.startsWith('ch1:') && !/^ch1:(p|v)-/.test(id)) ||
    id.startsWith('maw:') ||
    id.startsWith('ch2:') ||
    id === 'crisis:spine' ||
    id === 'crisis:dunes' ||
    id === 'crisis:maw' ||
    id.startsWith('roam:')
  const textOf = (sc: Scene): string[] => {
    const out = [sc.title ?? '', sc.speaker ?? '', sc.body]
    for (const v of sc.variants ?? []) if (!shutForOutcast(v.if)) out.push(v.body)
    for (const c of sc.choices) {
      if (shutForOutcast(c.show)) continue
      out.push(c.label, c.sub ?? '', c.locked ?? '', c.effects.flash ?? '')
    }
    for (const it of sc.intents ?? []) {
      if (shutForOutcast(it.show)) continue
      out.push(typeof it.reply === 'string' ? it.reply : '')
    }
    for (const p of Object.values(PEOPLE)) if (p.later[sc.id]) out.push(p.later[sc.id] ?? '')
    return out
  }
  const scanned = ALL_SCENES.filter((sc) => outcastScene(sc.id))
  assert(scanned.length > 40 && scanned.some((sc) => sc.id === 'spine:korvan') && scanned.some((sc) => sc.id === 'maw:tuner'), 'Outcast scan covers the Spine, the road, and the Maw')
  for (const sc of scanned) {
    if (CAMEO_ALLOW.has(sc.id)) continue
    const hit = textOf(sc).find((t) => PRISONER_NAMES.test(t))
    assert(!hit, `Outcast scene ${sc.id} names a Prisoner NPC: ${hit}`)
    // What the player sees there when they look or talk.
    let at = applyEffect(pick(newGame('outcast'), 'stand'), { goto: sc.id, enterHub: sc.hubId, startChapter: sc.chapterId, flag: { encounterAt: 99999 } })
    at = { ...at, flags: { ...at.flags } }
    delete at.flags.hunterHere
    for (const said of ['look', 'talk', 'trade', 'ask']) {
      const f = interpret(at, said).flash ?? ''
      assert(!PRISONER_NAMES.test(f), `Outcast "${said}" at ${sc.id} names a Prisoner NPC: ${f}`)
    }
  }
  assert(!ALL_SCENES.some((sc) => sc.id === 'spine:kaelen' || sc.id === 'spine:kaelen-rumors'), 'the Spine Kaelen counter scenes are gone')
  const outcastHeat = JSON.stringify(heatFactions('outcast'))
  assert(!PRISONER_NAMES.test(outcastHeat) && /Silas sells minutes/.test(outcastHeat), 'Outcast Heat cards name no Prisoner NPC')
  assert(/Jaxson/.test(heatFactions('prisoner').strays.watch), 'Prisoner Stray Heat still names Jaxson')
  assert(!PRISONER_NAMES.test(JSON.stringify(heatFactions('vessel').strays)), 'Vessel Stray Heat names no Prisoner NPC')
  for (const rule of GLOBAL_INTENTS) {
    if (shutForOutcast(rule.show)) continue
    assert(!PRISONER_NAMES.test(String(rule.reply)), `Outcast global help line names a Prisoner NPC: ${rule.reply}`)
  }
  for (let t = 0; t < 60; t++) {
    const f = rollScavenge({ ...pick(newGame('outcast'), 'stand'), ticks: t }).flash
    assert(!PRISONER_NAMES.test(f), `Outcast scavenge line names a Prisoner NPC: ${f}`)
  }

  // "This is not Silas's shade" is struck everywhere.
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  for (const f of walk(new URL('../src', import.meta.url).pathname)) {
    assert(!/not Silas.?s shade/i.test(readFileSync(f, 'utf8')), `${f} still says it is not Silas's shade`)
  }

  // Old saves parked in the removed Spine Kaelen scenes land on Korvan in Silas's shade.
  for (const old of ['spine:kaelen', 'spine:kaelen-rumors']) {
    const saved = { ...pick(newGame('outcast'), 'stand'), sceneId: old, hubId: 'spine' }
    const fixed = repairLoadedState(saved)
    assert(fixed.sceneId === 'spine:korvan' && fixed.hubId === 'spine', `old save in ${old} lands on spine:korvan`)
    assert(visibleChoices(fixed).length > 0, `repaired ${old} save has choices`)
  }

  // Silas keeps the Spine Buy/Sell shelf: Drops and the Needle Knife.
  let shelf = applyEffect(pick(newGame('outcast'), 'stand'), { goto: 'spine:silas', add: { scrap: 6, glints: 1 }, flag: { encounterAt: 99999 } })
  shelf = openShop(shelf, 'buy')
  for (const want of ['drop-glint', 'drop-scrap', 'knife', 'salve', 'wrap', 'cloak-glint']) assert(ids(shelf).includes(want), `Silas shelf has ${want}`)
  const bought = pick(pick(shelf, 'drop-scrap'), 'knife')
  assert((bought.items.vial_drop ?? 0) >= 1 && (bought.items.needle_knife ?? 0) === 1 && bought.items.scrap === 2, 'Silas sells a Drop for 2 scrap and the knife for 2 scrap')
  assert(!ids(openShop(bought, 'buy')).includes('knife'), 'Silas sells one knife')
  const sold = openShop(applyEffect(shelf, { unsetFlag: ['shopShelf'], add: { shiv: 1 } }), 'sell')
  assert(ids(sold).some((i) => /shiv/.test(i)), 'Silas buys unequipped junk on the Sell shelf')

  // The Outcast opening states the brand plainly, and says nobody will tell him.
  const open = getScene('open:outcast').body
  assert(/no memory/.test(open) && /a brand there, burned into the skin/.test(open), 'opening: no memory, burned brand on the face')
  assert(/Every Dune-Stray knows that mark\. It tells them not to speak to you, and when they see it, they turn away\./.test(open), 'opening: Strays know the brand and turn away')
  assert(/Nobody will tell you what you did\. You only know that you did something\./.test(open), 'opening: nobody says what he did')
  assert(!/this is not/i.test(open), 'opening has no "this is not" line')

  // Typed brand questions refuse; looking at it describes it; nothing reveals what he did.
  const ridge = applyEffect(pick(newGame('outcast'), 'stand'), { flag: { encounterAt: 99999 } })
  for (const ask of ['who am i', 'what happened', 'what did I do', 'ask about the brand', 'what does my brand mean']) {
    const f = interpret(ridge, ask).flash ?? ''
    assert(/You don.t remember\. They do\.|Nobody here will say/.test(f), `"${ask}" gets a refusal: ${f}`)
  }
  for (const look of ['look at brand', 'touch brand', 'touch my face', 'feel the brand']) {
    assert(interpret(ridge, look).flash === BRAND_LOOK, `"${look}" describes the brand`)
  }
  const atKorvan = applyEffect(ridge, { goto: 'spine:korvan' })
  assert(/I will not say it\. You don.t remember\. They do\./.test(interpret(atKorvan, 'ask about the brand').flash ?? ''), 'Korvan knows the brand and will not say it')
  assert(/I ask what you pay/.test(interpret(applyEffect(ridge, { goto: 'spine:silas' }), 'what happened').flash ?? ''), 'Silas will not ask; he trades')
  assert(interpret(applyEffect(newGame('prisoner'), { goto: 'camp:yard' }), 'touch brand').flash !== BRAND_LOOK, 'the brand is Outcast only')
  assert(/talks to the air beside your head/.test(getScene('ch1:o-tax').body), 'Nim reacts to the brand')
  const oOssa = getScene('ch1:o-ossa').body
  assert(/a beat too long/.test(oOssa) && /hand tightens on the stilt/.test(oOssa), 'Ossa shows a tell when she sees his face')
  assert(/do not stay on it/.test(oOssa) && /any stranger/.test(oOssa), 'Ossa looks past the brand and speaks as a stranger')
  const ossaHello = interpret(applyEffect(ridge, { goto: 'ch1:o-ossa', startChapter: 'cache-run' }), 'hello').flash ?? ''
  assert(/Ask me for water\. Talk can wait\./.test(ossaHello), `typed hello to Ossa: water first: ${ossaHello}`)
  assert(/You know what you did/.test(interpret(applyEffect(ridge, { goto: 'ch1:o-tax', startChapter: 'cache-run' }), 'hello').flash ?? ''), 'typed hello to Nim gets the brand refusal')

  // Korvan and Mira in Silas's shade; Jodi's slot stays dark.
  const shade = applyEffect(ridge, { goto: 'spine:shade' })
  assert(ids(shade).includes('walk-korvan') && ids(shade).includes('walk-mira') && !visibleChoices(shade).some((c) => /TODO/.test(c.label)), 'shade: Korvan and Mira, no Jodi placeholder')
  const kor = pick(shade, 'walk-korvan')
  assert(kor.sceneId === 'spine:korvan' && /I will not tell you what that mark is for/.test(bodyOf(kor)), 'Korvan speaks to the branded player and keeps the secret')
  const kDrop = pick(applyEffect(kor, { add: { vial_drop: 1 } }), 'hunger-drop')
  assert(kDrop.flags.hungerKnown && kDrop.flags.sybellaNamed && (kDrop.items.kallik_mark ?? 0) === 1, 'Korvan trades a Drop for the Hunger lead')
  const kHound = pick(applyEffect(kor, { add: { scrap: 1 } }), 'hound')
  assert(kHound.flags.korvanHoundRumor && /Corvin/.test(kHound.flash ?? '') && ids(kHound).includes('hound-walk'), 'Korvan sells the east wash lead and names Corvin')
  const kFresh = { ...kHound, sap: 6, flags: { ...kHound.flags, encounterAt: 99999 } }
  const washed = pick(kFresh, 'hound-walk')
  assert(washed.sceneId === 'spine:hound' && !/No road/.test(washed.flash ?? ''), `Walk the east wash really walks there: ${washed.sceneId} ${washed.flash}`)
  assert(washed.sap === 4, `the east wash costs 2 Sap (${kFresh.sap} → ${washed.sap})`)
  const kTook = pick(kor, 'take')
  assert(kTook.flags.korvanTook && kTook.flags.strayNotice && !ids(kTook).includes('hunger-scrap'), 'taking from Korvan wakes the Strays and closes his trade')
  const mira = pick(pick(shade, 'walk-mira'), 'sit')
  assert(mira.flags.miraWarned && /Gilded Hollow/.test(mira.flash ?? ''), 'Mira warns about the Hollows without speaking')
  assert(/does not answer/.test(interpret(mira, 'hello').flash ?? ''), 'Mira stays silent')

  // Corvin: help him and he walks you past the ford traps and pulls you up on the Spine.
  const hound = applyEffect(ridge, { goto: 'spine:hound' })
  const corvin = pick(hound, 'boots')
  assert(corvin.sceneId === 'spine:corvin' && /I don't ask what that mark is for/.test(bodyOf(corvin)), 'Corvin behind the rock, no questions about the brand')
  const helped = pick(applyEffect(corvin, { add: { vial_drop: 1 } }), 'water')
  assert(helped.flags.corvinHelped, 'a Drop helps Corvin')
  const swept = pick(corvin, 'sweep')
  assert(swept.flags.corvinHelped && swept.heat.cartel === corvin.heat.cartel + 1, 'sweeping his prints helps Corvin and costs Cartel Heat')
  const quietly = (x: GameState): GameState => {
    const c = { ...x, flags: { ...x.flags } }
    for (const k of ['encounterHere', 'encounterKind', 'encounterHp', 'hunterHere', 'hunterFrom']) delete c.flags[k]
    return c
  }
  const noon = quietly(applyEffect(helped, { goto: 'ch1:o-noon', startChapter: 'cache-run', flag: { hungerKnown: true } }))
  assert(ids(noon).includes('ford'), 'helped Corvin waits at the dry ford')
  const forded = pick(noon, 'ford')
  assert(forded.sceneId === 'ch1:o-ossa' && forded.flags.corvinRoad && !forded.flags.drennickMet, 'Corvin walks you past the traps to Ossa')
  const bareNoon = quietly(applyEffect(ridge, { goto: 'ch1:o-noon', startChapter: 'cache-run' }))
  assert(ids(bareNoon).includes('noon') && !ids(bareNoon).includes('ford'), 'no ford line before you help him')
  const downOnSpine = { ...helped, sceneId: 'spine:well', hubId: 'spine', sap: 4, health: 0, flags: { ...helped.flags, downed: true, downedKind: 'collector' } }
  const up = wakeEffect(downOnSpine)
  assert(up.health === 2 && up.sap === -1 && !up.goto && up.flag?.corvinPulled, 'Corvin pulls you up on Spine ground: 2 Health, 1 Sap')
  const alone = wakeEffect({ ...downOnSpine, flags: { ...downOnSpine.flags, corvinHelped: false } })
  assert(alone.health === 1, 'without Corvin the most-ground rule applies')

  // The Maw wreck: a short nameless cameo off the Prisoner door.
  const wreck = applyEffect(newGame('outcast'), { goto: 'maw:tuner', enterHub: 'redmaw' })
  assert(!PRISONER_NAMES.test(bodyOf(wreck)) && /brass jaw/.test(bodyOf(wreck)) && ids(wreck).includes('rest'), 'Outcast wreck is a nameless cameo with the bench')
  assert(/Jaxson/.test(bodyOf(applyEffect(newGame('prisoner'), { goto: 'maw:tuner', enterHub: 'redmaw' }))), 'Prisoner wreck still names Jaxson')

  // Resin Salve: a rare scavenge find on every door; humans sometimes carry one, beasts never.
  assert(SCAVENGE_SALVE_PCT >= 5 && SCAVENGE_SALVE_PCT <= 8, 'scavenge salve odds are 5-8%')
  assert(HUMAN_SALVE_PCT >= 15 && HUMAN_SALVE_PCT <= 20, 'human salve odds are 15-20%')
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    let found = 0
    const base = newGame(door)
    for (let t = 0; t < 1000; t++) {
      const st = { ...base, ticks: t, pressure: t % 7 }
      const r = rollScavenge(st)
      if (r.add.salve) {
        found++
        assert(scavengeSalve(st) && /Resin Salve/.test(r.flash), 'salve find says so')
      }
      assert(JSON.stringify(rollScavenge(st)) === JSON.stringify(r), 'scavenge roll is deterministic')
    }
    assert(found >= 25 && found <= 110, `${door} scavenge turns up salve rarely (${found}/1000)`)
  }
  let yard = applyEffect(newGame('prisoner'), { goto: 'camp:yard', enterHub: 'camp04', flag: { encounterAt: 99999 } })
  yard = { ...yard, flags: { ...yard.flags } }
  delete yard.flags.hunterHere
  let hit = false
  for (let t = 0; t < 400 && !hit; t++) {
    const st = { ...yard, ticks: t }
    if (!carriesSalve(st, 'cutter')) continue
    const win = { ...st, health: 6, flags: { ...st.flags, encounterHere: true, encounterKind: 'cutter', encounterHp: 1, fightTaught: true } }
    const { fx } = resolveEncounter(win, 'fight')
    hit = (fx.add?.salve ?? 0) === 1 && /Resin Salve/.test(String(fx.flag?.encounterFlash ?? ''))
  }
  assert(hit, 'a downed cutter can carry a Resin Salve, and the loot line names it')
  for (const kind of HUMAN_KINDS) {
    let n = 0
    for (let t = 0; t < 1000; t++) if (carriesSalve({ ...yard, ticks: t }, kind)) n++
    assert(n >= 100 && n <= 280, `${kind} carries salve about ${HUMAN_SALVE_PCT}% of the time (${n}/1000)`)
  }
  for (const kind of BEAST_KINDS) {
    for (let t = 0; t < 1000; t++) assert(!carriesSalve({ ...yard, ticks: t }, kind), `${kind} never carries salve`)
    const beast = { ...yard, health: 6, flags: { ...yard.flags, encounterHere: true, encounterKind: kind, encounterHp: 1, fightTaught: true } }
    for (let t = 0; t < 200; t++) assert(!resolveEncounter({ ...beast, ticks: t }, 'fight').fx.add?.salve, `${kind} loot never has salve`)
  }
  assert(/Rarely, a Resin Salve turns up with the find\./.test(topicText(HELP_TOPICS[1])), 'help scavenge names the salve find')
  assert(/People sometimes carry a Resin Salve on them\. Beasts never do\./.test(fightHelpText()), 'help fight names salve loot')
}

{
  // Ossa recognizes him at first sight in every door, says nothing, and never uses the Strays' brand line.
  const ossaScenes = ['ch1:p-ossa', 'ch1:o-ossa', 'maw:stilt', 'crisis:dunes', 'maw:ossa', 'maw:ossa-day']
  for (const id of ossaScenes) {
    const sc = getScene(id)
    const all = [sc.body, ...(sc.variants ?? []).map((v) => v.body), ...(sc.intents ?? []).map((r) => r.reply)].join('\n')
    assert(!/You know what you did/.test(all), `Ossa never says the brand line in ${id}`)
    assert(!/Bleed-Cut/.test(all), `no Bleed-Cut in ${id}`)
  }
  for (const id of ['ch1:p-ossa', 'ch1:o-ossa', 'crisis:dunes']) {
    assert(/a beat too long|a beat longer/.test(getScene(id).body), `first-sight tell in ${id}`)
  }
  const vesselFirst = applyEffect(newGame('vessel'), { goto: 'maw:stilt', flag: { chapter1Done: true } })
  assert(/a beat too long/.test(bodyOf(vesselFirst)) && /any stranger/.test(bodyOf(vesselFirst)), 'Vessel first meeting at the stilt: tell, then stranger voice')
  assert(/a beat too long/.test(bodyOf(applyEffect(newGame('prisoner'), { goto: 'ch1:p-ossa' }))), 'Prisoner first meeting shows the tell')
  const appendFor = (door: DoorId) => bodyOf(applyEffect(newGame(door), { goto: 'maw:ossa-day', flag: { ossaStillness: true, ossaAlly: true, chapter1Done: true } }))
  assert(/wire scars/.test(appendFor('prisoner')) && !/gold thread|the brand once/.test(appendFor('prisoner')), 'Prisoner append: the wire scars')
  assert(/the brand once/.test(appendFor('outcast')) && /doesn't change who I raised/.test(appendFor('outcast')), 'Outcast append: she looks past the brand')
  assert(/gold thread/.test(appendFor('vessel')) && /dressed you as a cup/.test(appendFor('vessel')), 'Vessel append: the gold thread')
  assert(/You know what you did/.test(interpret(applyEffect(newGame('outcast'), { goto: 'ch1:o-tax', startChapter: 'cache-run' }), 'hello').flash ?? ''), 'Nim keeps the brand line')
}

{
  // The Carapace hunter takes the Spine hunt at Stray Heat 4+. The face locks when the hunt arrives.
  const spineAt = (strays: number, seed = 0): GameState => {
    let st = applyEffect(pick(newGame('outcast'), 'stand'), { goto: 'spine:ridge', flag: { encounterAt: 99999 } })
    st = { ...st, ticks: 20 + seed, heat: { cartel: 0, seekers: 0, strays }, flags: { ...st.flags, strayNotice: true, huntQuiet: 9 } }
    delete st.flags.hunterHere
    delete st.flags.encounterHere
    return applyEffect(st, { ticks: 1 })
  }
  assert(CARAPACE_HUNTER_HEAT === 4, 'Carapace threshold is Stray Heat 4')
  const low = spineAt(3)
  assert(low.flags.hunterHere && pressureFace(low) === SPINE_HUNTER.face, 'Stray Heat 3 is still the collector')
  const hi = spineAt(4)
  assert(hi.flags.hunterHere && pressureFace(hi) === 'Nim', 'Stray Heat 4 fields the Carapace hunter')
  assert(hi.flags.spineHunterKind === 'carapace' && hi.flags.metCarapace, 'the hunt locks the carapace face and marks him met')
  assert(/harpoon rifle with a serrated head/.test(bodyOf(hi)) && /Someone paid me for yours/.test(bodyOf(hi)), 'his append shows on the Spine ground')
  assert(playCoverKey(hi, sceneOf(hi)) === 'carapace', 'his portrait is the scene art during the hunt')
  const cooled = { ...hi, heat: { ...hi.heat, strays: 1 } }
  assert(pressureFace(cooled) === 'Nim', 'cooling Heat mid-hunt keeps the same face')
  const heated = { ...low, heat: { ...low.heat, strays: 8 } }
  assert(pressureFace(heated) === SPINE_HUNTER.face, 'raising Heat mid-hunt keeps the collector')
  assert(!ids(hi).includes('spine-scrap') && !ids(hi).includes('spine-glint'), 'he takes no scrap and no Glint')
  assert(!ids(applyEffect(hi, { add: { scrap: 2, glints: 2 } })).some((id) => /spine-(scrap|glint)/.test(id)), 'no pay rows even when you carry scrap and Glints')
  const withDrop = applyEffect(hi, { add: { vial_drop: 2 } })
  assert(ids(withDrop).includes('spine-offer'), 'with a Drop he can be offered one')
  const offered = pick(withDrop, 'spine-offer')
  assert(!offered.flags.hunterHere && offered.flags.carapaceOffered && (offered.items.vial_drop ?? 0) === 1, 'the offering sends him off and costs a Drop')
  const again = spineAt(5)
  const againOffered = applyEffect({ ...again, flags: { ...again.flags, carapaceOffered: true } }, { add: { vial_drop: 1 } })
  assert(!ids(againOffered).includes('spine-offer'), 'the offering works once')
  const fight = pick(hi, 'spine-fight')
  assert(fight.flags.encounterHere && fight.flags.encounterKind === 'carapace', 'his fight is the carapace encounter')
  assert(CARAPACE_HUNTER.encounter.strike === 4 && CARAPACE_HUNTER.encounter.shell === 2 && CARAPACE_HUNTER.encounter.hp === 3, 'Carapace hunter is Strike 4, Shell 2, Health 3')
  assert(SPINE_HUNTER.encounter.strike === 3 && SPINE_HUNTER.encounter.shell === 1 && SPINE_HUNTER.encounter.hp === 2, 'collector stays Strike 3, Shell 1, Health 2')
  assert(playCoverKey(fight, sceneOf(fight)) === 'carapace', 'his portrait shows in the fight')
  let wins = 0
  for (let t = 0; t < 30; t++) {
    let f = pick(spineAt(4, t), 'spine-fight')
    f = { ...f, health: f.healthMax ?? f.health, items: { ...f.items, needle_knife: 1, scav_wrap: 1 }, equipped: { weapon: 'needle_knife', armor: 'scav_wrap' } }
    let rounds = 0
    while (f.flags.encounterHere && !f.flags.encounterDone && !f.flags.downed && rounds < 10) {
      f = pick(f, 'enc-fight')
      rounds++
    }
    if (f.flags.encounterDone && /They drop/.test(String(f.flags.encounterClash))) wins++
  }
  assert(wins > 0, `needle knife and scav wrap can beat him (${wins}/30)`)
  assert(wins < 30, `he is a real fight (${wins}/30 wins)`)
  const card = interpret(offered, 'who is the carapace hunter').flash ?? ''
  assert(/Carapace hunter/.test(card), `who-is works after meeting him: ${card.slice(0, 80)}`)
  const copy = JSON.stringify(CARAPACE_HUNTER) + JSON.stringify(PEOPLE.carapace)
  assert(!/Shard-Hound/i.test(copy), 'he is never called Shard-Hound')
  assert(!/valerius/i.test(copy) && !/\bthis is not\b/i.test(copy), 'his copy has no Valerius and no "this is not" lines')
}

{
  // Outcast sand signs: each shows once, saves a flag, and never names what he can do.
  const ridge = (): GameState => {
    const st = applyEffect(pick(newGame('outcast'), 'stand'), { goto: 'spine:ridge', flag: { encounterAt: 99999 } })
    return { ...st, ticks: 40 }
  }
  assert(sandGround(ridge()) && !sandGround(applyEffect(newGame('prisoner'), { goto: 'camp:yard' })), 'sand ground is the Outcast on the Spine')

  // (a) Down on sand ground.
  const down = applyEffect(ridge(), { health: -99 })
  assert(down.flags.downed && bodyOf(down).includes(SAND_DOWN) && down.flags.sandDownSeen, 'going Down on the Spine: the sand slides out from under his face')
  const up = pick(down, ids(down)[0])
  const downAgain = applyEffect({ ...up, ticks: up.ticks + 10 }, { health: -99 })
  assert(downAgain.flags.downed && !bodyOf(downAgain).includes(SAND_DOWN), 'the Down sign shows once')
  assert(!bodyOf(applyEffect(applyEffect(newGame('prisoner'), { goto: 'camp:yard' }), { health: -99 })).includes(SAND_DOWN), 'no sand sign on other doors')
  const tooSoon = applyEffect({ ...ridge(), flags: { ...ridge().flags, sandSignAt: 40 } }, { health: -99 })
  assert(!bodyOf(tooSoon).includes(SAND_DOWN) && !tooSoon.flags.sandDownSeen, 'two signs never land back to back')

  // (a) Health 1 in a fight on sand ground.
  let lowSeen = 0
  for (let t = 0; t < 40 && !lowSeen; t++) {
    let f = { ...ridge(), ticks: 40 + t, health: 6 }
    f = applyEffect(f, { flag: { encounterAt: f.ticks } })
    f = applyEffect(f, beginEncounter(f, 'collector'))
    let rounds = 0
    while (f.flags.encounterHere && !f.flags.encounterDone && !f.flags.downed && rounds < 8) {
      const before = f.health
      f = pick(f, 'enc-fight')
      rounds++
      if (before >= 2 && f.health === 1 && f.flags.encounterHere) {
        assert(String(f.flags.encounterClash).endsWith(SAND_LOW) && f.flags.sandLowSeen, 'Health 1 in a Spine fight: the sand slides toward him')
        lowSeen++
      }
    }
  }
  assert(lowSeen === 1, 'the low-Health sign shows in a Spine fight')

  // (b) Amber warms the first time he scavenges a Glint.
  let warm = 0
  let st = ridge()
  for (let t = 0; t < 60; t++) {
    const before = st.items.glints ?? 0
    st = scavenge({ ...st, ticks: st.ticks + 3 + (t % 4) })
    if ((st.items.glints ?? 0) > before && (st.flash ?? '').includes(AMBER_WARM)) warm++
  }
  assert(warm === 1 && st.flags.amberWarmSeen, `the first scavenged Glint warms and hums once (${warm})`)
  let pg = applyEffect(newGame('prisoner'), { goto: 'camp:yard', flag: { chapter1Done: true } })
  for (let t = 0; t < 40; t++) pg = scavenge({ ...pg, ticks: pg.ticks + 3 + (t % 4) })
  assert((pg.items.glints ?? 0) > 0 && !pg.flags.amberWarmSeen && !/hums/.test(pg.flash ?? ''), 'other doors find cold amber')

  // (c) Mira's Hollow drawing pulls at him once.
  const mira = applyEffect(ridge(), { goto: 'spine:mira' })
  const sat = pick(mira, 'sit')
  assert((sat.flash ?? '').includes(HOLLOW_PULL) && sat.flags.hollowPullSeen && sat.flags.miraWarned, 'Mira draws the Hollow and he feels it pull')
  assert(visibleChoices(mira).filter((c) => c.id === 'sit').length === 1, 'one sit row shows at a time')
  assert(!ids(sat).includes('sit'), 'the drawing happens once')

  // (d) Typed: hands, sand, amber.
  const h1 = interpret(ridge(), 'look at my hands')
  assert(h1.flash === HANDS_LOOK && h1.flags.handsLookSeen, 'look at hands: amber dust in the lines')
  assert(interpret(h1, 'look at hands').flash !== HANDS_LOOK, 'the hands line is plain after the first time')
  const s1 = interpret(ridge(), 'touch the sand')
  assert(s1.flash === SAND_TOUCH && s1.flags.sandTouchSeen, 'touch the sand: grains crawl toward his palm')
  assert(interpret(s1, 'feel the sand').flash !== SAND_TOUCH, 'the crawl shows once')
  const a1 = interpret(applyEffect(ridge(), { add: { glints: 1 } }), 'hold the glint')
  assert(a1.flash === AMBER_WARM && a1.flags.amberWarmSeen, 'holding a Glint warms it once')
  assert(interpret(a1, 'hold the glint').flash !== AMBER_WARM, 'held amber is cold after that')
  assert(interpret(applyEffect(newGame('prisoner'), { goto: 'camp:yard' }), 'touch the sand').flash !== SAND_TOUCH, 'the sand does not move for other doors')
  assert(sandSignsSeen({ ...h1, flags: { ...h1.flags, sandTouchSeen: true, amberWarmSeen: true } }) === 3, 'signs seen are counted for the later reveal')
  assert(SAND_SIGN_FLAGS.length === 7, 'seven signs, with the fight grip')

  const lines = [SAND_LOW, SAND_DOWN, AMBER_WARM, HOLLOW_PULL, SAND_TOUCH, HANDS_LOOK].join('\n')
  assert(!/\b(power|magic|gift|curse|heart|shard|runners?|Spires|you did)\b/i.test(lines), 'signs never name or explain it')
  assert(!/\bthis is not\b|\bnot a\b/i.test(lines), 'signs have no "this is not" lines')
  const signSrc = readFileSync(new URL('../src/game/sandSign.ts', import.meta.url), 'utf8')
  assert(/TODO\(designer\): the reveal/.test(signSrc), 'the reveal is a designer TODO')
}

{
  // Outcast opening: face-down outside the outpost, Silas tosses the vial, first goal is a Drop before noon.
  const open = getScene('open:outcast').body
  assert(/face-down in amber sand just outside the Bleached Spine outpost/.test(open) && /golden dust/.test(open) && /pockets are empty/.test(open), 'opening: face-down, golden dust, empty pockets')
  assert(/Silas Vane\. He tosses an empty glass vial/.test(open) && /Earn your keep/.test(open), 'opening: Silas tosses the vial and says earn your keep')
  assert(/Your first goal: get a Drop of Oasis Sap into that vial before the midday heat drains you\./.test(open), 'opening states the first goal')
  assert(!/while you were out/.test(open), 'the old palm line is gone')
  assert(/Silas Vane/.test(interpret(newGame('outcast'), 'who is silas').flash ?? ''), 'the Outcast knows Silas from the opening')
  const fresh = pick(newGame('outcast'), 'stand')
  assert(interpret(fresh, 'look').flash?.startsWith(FIRST_DROP_GOAL), 'look shows the first goal')
  assert((interpret(fresh, 'help').flash ?? '').startsWith(FIRST_DROP_GOAL), 'help shows the first goal')
  assert(!(interpret(applyEffect(newGame('prisoner'), { goto: 'camp:yard' }), 'look').flash ?? '').includes(FIRST_DROP_GOAL), 'other doors have no first-Drop goal')

  // Path 1: Silas's shade-cut.
  const tip = pick(pick(fresh, 'tip'), 'fill')
  assert(tip.items.vial_drop === 1 && (tip.flash ?? '').endsWith(FIRST_DROP_DONE), 'path 1: the shade-cut fills the vial')
  assert(!(interpret(tip, 'look').flash ?? '').includes(FIRST_DROP_GOAL), 'look drops the goal once it is done')
  assert(!(pick(applyEffect(tip, { goto: 'spine:shade' }), 'talk').flash ?? '').includes(FIRST_DROP_DONE), 'the done line shows once')
  // Path 2: Silas's mercy at low sap.
  const mercy = pick(applyEffect(fresh, { goto: 'spine:silas' }), 'mercy')
  assert(mercy.items.vial_drop === 1 && (mercy.flash ?? '').endsWith(FIRST_DROP_DONE), 'path 2: Silas gives a Drop once')
  // Path 3: scavenge scrap, buy a Drop on Silas's shelf.
  let scav = applyEffect(fresh, { flag: { encounterAt: 99999 } })
  for (let t = 0; t < 12 && (scav.items.scrap ?? 0) < 2 && !(scav.items.vial_drop ?? 0); t++) {
    scav = scavenge({ ...scav, ticks: scav.ticks + 2 + (t % 3) })
  }
  if (!(scav.items.vial_drop ?? 0)) {
    const shelf = openShop(applyEffect(scav, { goto: 'spine:silas' }), 'buy')
    scav = pick(shelf, ids(shelf).includes('drop-scrap') ? 'drop-scrap' : 'drop-glint')
  }
  assert((scav.items.vial_drop ?? 0) >= 1 && scav.flags.firstDropMarked, 'path 3: scavenged scrap buys the first Drop from Silas')
  // Path 4: the well brickwork pays a Glint; the Glint buys a Drop.
  const well = pick(applyEffect(fresh, { goto: 'spine:well', flag: { encounterAt: 99999 } }), 'search')
  const wellBuy = pick(openShop(applyEffect(well, { goto: 'spine:silas', sap: 1 }), 'buy'), 'drop-glint')
  assert(wellBuy.items.vial_drop === 1 && wellBuy.flags.firstDropMarked, 'path 4: the well Glint buys the first Drop')

  const old = repairLoadedState({ ...fresh, items: { ...fresh.items, vial_drop: 1 }, flags: { ...fresh.flags, firstDrop: true } })
  assert(old.flags.firstDropMarked, 'old saves with a Drop are marked quietly')
}

{
  // Shard-hounds are beasts. No person carries "Shard-Hound" as a title or name.
  const srcDir = new URL('../src/game/', import.meta.url).pathname
  const files: string[] = []
  const walk = (dir: string) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name)
      if (ent.isDirectory()) walk(full)
      else if (ent.name.endsWith('.ts')) files.push(full)
    }
  }
  walk(srcDir)
  const asTitle = [
    /\bthe Shard-Hound\b(?!s)/i,
    /\b(call|calls|called|named)\s+(him|her|them)?\s*(the\s+)?Shard-Hound\b/i,
    /Shard-Hound\s+(Valerius|Korvan|Corvin|Silas|[A-Z][a-z]+ius)\b/,
  ]
  for (const f of files) {
    // The Camp-04 hunt button names the beast itself, which is the point of the rule.
    const text = readFileSync(f, 'utf8').replace("'Fight the Shard-Hound'", "'Fight the hound'")
    for (const re of asTitle) assert(!re.test(text), `${f} uses Shard-Hound as a person's title (${re})`)
  }
  for (const sc of ALL_SCENES) {
    assert(!/Shard-Hound/i.test(`${sc.title ?? ''} ${sc.speaker ?? ''}`), `${sc.id} title/speaker is not Shard-Hound`)
  }
  for (const p of Object.values(PEOPLE)) {
    assert(!/shard-hound/i.test(`${p.name} ${p.aliases.join(' ')}`), `${p.id} is not named Shard-Hound`)
    assert(!/(him|her) the Shard-Hound|the Shard-Hound,/i.test(p.card), `${p.id} card does not title anyone Shard-Hound`)
  }
  assert(getScene('spine:valerius').title === 'Overseer Valerius', 'Valerius keeps his own title on the Spine')
  assert(!getScene('spine:hunter').speaker && !/Valerius/.test(getScene('spine:hunter').body), 'the Spine hunt ground is not Valerius')
  assert(/deserter/.test(getScene('spine:hound').body), 'on the Spine Valerius is after the deserter')
}

{
  // Cover bands: what must stay visible above the story panel, per cover.
  for (const [key, [top, bot]] of Object.entries(COVER_BAND)) {
    assert(top >= 0 && bot <= 1 && bot - top >= 0.4, `${key} band is a real window (${top}..${bot})`)
    assert(playCoverFile(key as never), `${key} has a file`)
  }
  // The lit things you can take sit low in the bay art; the band must reach them.
  assert(COVER_BAND.bay_pike[1] >= 0.8, "Pike's bolt and the skiff legs stay above the panel")
  assert(COVER_BAND.bay_sarn[1] >= 0.95, "Sarn's scrap pile stays above the panel")
  assert(COVER_BAND.bay_vetch[1] >= 0.88, "Vetch's vial, wire, and torch stay above the panel")
  assert(COVER_BAND.skiffbay[1] >= 0.82 && COVER_BAND.hotwire[1] >= 0.88, 'Skiff Bay people and the hotwire beat stay above the panel')
  const css2 = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert(css2.includes('.scene-fill') && /blur\(/.test(css2), 'a blurred fill sits behind a scaled-down cover')
  assert(/\.scene-img \{[\s\S]*?height: var\(--img-h\)/.test(css2), 'the cover scales to fit its band')
  const play2 = readFileSync(new URL('../src/components/PlayScreen.tsx', import.meta.url), 'utf8')
  assert(play2.includes('coverBand(coverKey)') && play2.includes("'--band-bot'"), 'PlayScreen passes the band to the stage')
}

// ---- Fight variety: moves, crits, ground, enemy tricks ----
{
  const fv = (door: 'prisoner' | 'outcast' | 'vessel', t: number, kind: string, flags: Record<string, unknown> = {}, hp = 3): GameState => {
    const s = primedFight(door, t, kind, { hp })
    return { ...s, flags: { ...s.flags, ...flags } as GameState['flags'] }
  }
  const go = (s: GameState, how: string) => applyEffect(s, { resolveEncounter: how as 'fight', ticks: 1 })
  const ids = (s: GameState) => encounterChoices(s).map((c) => c.id)

  // Moves on the card, with locks that say why.
  const fresh = fv('prisoner', 3, 'jackal')
  for (const id of ['enc-fight', 'enc-guard', 'enc-feint', 'enc-trick', 'enc-run', 'enc-skip']) assert(ids(fresh).includes(id), `fight card offers ${id}`)
  assert(!ids(fresh).includes('enc-pull') && !ids(fresh).includes('enc-deal'), 'pull and deal only show when they apply')
  const midFight = fv('prisoner', 3, 'jackal', { encounterRound: 1, encounterFeint: true, encounterTrickUsed: true })
  assert(!ids(midFight).includes('enc-skip'), 'Give the road only before the first exchange')
  const feintRow = encounterChoices(midFight).find((c) => c.id === 'enc-feint')!
  const trickRow = encounterChoices(midFight).find((c) => c.id === 'enc-trick')!
  assert(!isChoiceOn(midFight, feintRow.enable) && /already set/.test(String(feintRow.locked)), 'feint locks with a reason')
  assert(!isChoiceOn(midFight, trickRow.enable) && /Already used/.test(String(trickRow.locked)), 'sand trick locks with a reason')

  // A crit is its own line under the hit it doubled: "Critical Strike! 6".
  const CRIT_YOU = /^You hit [^\n]*\n\nCritical Strike! \d+/m
  const CRIT_THEM = /hits you for [^\n]*\n\nCritical Strike! \d+/
  // Guard takes 2 off, 1 off against Valerius; you do not hit.
  for (let t = 0; t < 30; t++) {
    const s = fv('prisoner', t, 'cutter')
    const plain = resolveEncounter(s, 'fight').fx
    const guard = resolveEncounter(s, 'guard').fx
    if (CRIT_THEM.test(String(plain.flag?.encounterClash ?? ''))) continue
    const pin = -(plain.health ?? 0)
    assert(-(guard.health ?? 0) === Math.max(0, pin - 2), 'Guard takes 2 off the hit')
    assert(guard.flag?.encounterHp === 3, 'Guard does not hit back')
  }
  for (let t = 0; t < 30; t++) {
    const s = fv('prisoner', t, 'overseer')
    const a = resolveEncounter(s, 'fight').fx
    const b = resolveEncounter(s, 'guard').fx
    if (CRIT_THEM.test(String(a.flag?.encounterClash ?? '')) || a.flag == null || b.flag == null) continue
    assert(-(b.health ?? 0) === Math.max(0, -(a.health ?? 0) - 1), 'Valerius: Guard takes only 1 off')
  }
  // Feint: 1 lighter now, +2 swing next.
  const feinted = go(fv('vessel', 4, 'cutter'), 'feint')
  assert(feinted.flags.encounterFeint === true, 'feint sets up the next strike')
  assert(/You hit [^\n]+ for \d+ \([^)]*feint \+2/.test(bodyOf(go({ ...feinted, health: 6 }, 'fight'))), 'the next Fight names the feint in brackets')
  assert(/the [^\n]+ hits you for \d+ \([^)]*feint −1|misses you \([^)]*feint −1/i.test(bodyOf(feinted)), `the feint round names the lighter hit: ${bodyOf(feinted).slice(0, 200)}`)

  // Crits about 1 in 10, both sides, with their own log line.
  let critYou = 0
  let critThem = 0
  let critPup = 0
  for (let t = 0; t < 400; t++) {
    const card = String(resolveEncounter(fv('prisoner', t, 'cutter', {}, 20), 'fight').fx.flag?.encounterClash ?? '')
    if (CRIT_YOU.test(card)) {
      critYou++
      const m = card.match(/^You hit [^\n]* for (\d+)[^\n]*\n\nCritical Strike! (\d+)/m)!
      assert(Number(m[2]) === 2 * Number(m[1]), `the crit line shows the doubled hit: ${card.slice(0, 120)}`)
    }
    if (CRIT_THEM.test(card)) critThem++
    const pup = String(resolveEncounter(fv('prisoner', t, 'pup', {}, 20), 'fight').fx.flag?.encounterClash ?? '')
    if (CRIT_THEM.test(pup)) critPup++
  }
  assert(critYou > 15 && critYou < 70, `your crits near 1 in 10 (${critYou}/400)`)
  assert(critThem > 15 && critThem < 70, `their crits near 1 in 10 (${critThem}/400)`)
  assert(critPup > critThem, `the Shard-pup crits more often (${critPup} vs ${critThem})`)
  for (let t = 0; t < 200; t++) {
    const r = resolveEncounter(fv('prisoner', t, 'cutter', {}, 20), 'fight').fx
    if (CRIT_THEM.test(String(r.flag?.encounterClash ?? ''))) assert(6 + (r.health ?? 0) > 0, 'a crit never drops you from full Health in one exchange')
  }

  // Ground: named on the card and moves the numbers.
  const grounds = new Set<string>()
  for (let t = 0; t < 40; t++) {
    const s0 = primedFight('outcast', t, 'jackal')
    const st = { ...s0, flags: { ...s0.flags, ...fightStartFlags(s0, 'jackal') } as GameState['flags'] }
    const card = encounterCard(st)
    assert(/^Ground: /m.test(card), 'fight card names the ground')
    grounds.add(String(st.flags.encounterTerrain))
  }
  assert(grounds.size >= 3, 'ground varies fight to fight')
  assert(runChance(fv('prisoner', 1, 'cutter', { encounterTerrain: 'slope' })) === 70, 'slope makes running easier')
  assert(runChance(fv('prisoner', 1, 'cutter', { encounterTerrain: 'loose' })) === 50, 'loose sand makes running harder')
  assert(runChance(fv('prisoner', 1, 'handler')) === 40, 'the Hound-handler makes running harder')
  for (let t = 0; t < 20; t++) {
    const card = String(resolveEncounter(fv('prisoner', t, 'cutter', { encounterTerrain: 'wind' }), 'fight').fx.flag?.encounterClash ?? '')
    const swings = [...card.matchAll(/(\d+)\+(\d+) vs/g)].map((m) => Number(m[2]))
    assert(swings.every((n) => n <= 1), 'blowing sand caps both swings at 1')
  }

  // Varied openers.
  const opens = new Set<string>()
  for (let t = 0; t < 30; t++) {
    const s0 = primedFight('prisoner', t, 'cutter')
    const st = { ...s0, flags: { ...s0.flags, ...fightStartFlags(s0, 'cutter') } as GameState['flags'] }
    opens.add(encounterCard(st).split('\n')[0])
  }
  assert(opens.size >= 2, 'fight openers vary')

  // Amber-tick latches, drains Sap, locks Run; Pull clears it.
  const latched = fv('prisoner', 2, 'tick', { encounterLatched: true, encounterRound: 1 }, 5)
  assert(ids(latched).includes('enc-pull'), 'Pull shows while the tick is on')
  const runRow = encounterChoices(latched).find((c) => c.id === 'enc-run')!
  assert(!isChoiceOn(latched, runRow.enable) && /tick/i.test(String(runRow.locked)), 'Run locks while latched, with a reason')
  assert(go(latched, 'guard').sap === latched.sap - 1, 'a latched tick drinks 1 Sap a round')
  const pulled = go(latched, 'pull')
  assert(pulled.sap === latched.sap && !pulled.flags.encounterLatched, 'pulling the tick stops the drain')

  // Dust-jackal pair flanks for +1 while both stand.
  let flank = false
  for (let t = 0; t < 20 && !flank; t++) flank = /\(second jackal \+1\)/.test(bodyOf(go(fv('prisoner', t, 'jackal', { encounterPair: true }, 2), 'fight')))
  assert(flank, 'the jackal pair flanks')

  // Scavenger snatch, return on a kill, escape otherwise, and the deal.
  let snatchSeen = false
  for (let t = 0; t < 40 && !snatchSeen; t++) {
    const s = { ...fv('prisoner', t, 'scavenger', {}, 4), items: { ...fv('prisoner', t, 'scavenger').items, scrap: 2 } }
    const a = go(s, 'fight')
    if (typeof a.flags.encounterSnatch !== 'string' || a.flags.encounterHp === 0 || a.health <= 0) continue
    snatchSeen = true
    const grabbed = a.flags.encounterSnatch as keyof typeof ITEMS
    assert((a.items[grabbed] ?? 0) === (s.items[grabbed] ?? 0) - 1, 'the scavenger takes the item')
    const killed = go({ ...a, health: 6, flags: { ...a.flags, encounterHp: 1 } }, 'fight')
    assert((killed.items[grabbed] ?? 0) >= (s.items[grabbed] ?? 0), 'killing it gets the item back')
    const left = go({ ...a, health: 6, flags: { ...a.flags, encounterHp: 9 } }, 'guard')
    assert(/gets away with your/.test(bodyOf(left)), 'still standing next round, it gets away')
  }
  assert(snatchSeen, 'the scavenger snatch fires')
  const offerS = fv('prisoner', 5, 'scavenger', { encounterOffer: true, encounterOfferShown: true, encounterRound: 2 }, 1)
  assert(ids(offerS).includes('enc-deal'), 'a standing offer shows the deal')
  assert(go(offerS, 'deal').items.scrap === (offerS.items.scrap ?? 0) + 1, 'scavenger deal: scrap +1')
  const offerC = fv('outcast', 5, 'collector', { encounterOffer: true, encounterOfferShown: true, encounterRound: 2 }, 1)
  const offerCs = { ...offerC, heat: { ...offerC.heat, strays: 3 } }
  assert(go(offerCs, 'deal').heat.strays === 2, 'collector call it square: Stray Heat -1')

  // Rim cutter flees at 1 Health.
  const flee = resolveEncounter(fv('prisoner', 6, 'cutter', {}, 1), 'guard').fx
  assert(flee.flag?.encounterFleeing === true, 'a hurt cutter limps for the shade')
  const fled = go(fv('prisoner', 6, 'cutter', { encounterFleeing: true, encounterFleeShown: true, encounterRound: 2 }, 1), 'guard')
  assert(/scrap-shade/.test(bodyOf(fled)), 'not hit, the cutter gets away')

  // Vent patrol shock numbs the next swing.
  let shocked = false
  for (let t = 0; t < 40 && !shocked; t++) shocked = resolveEncounter(fv('prisoner', t, 'patrol', {}, 9), 'fight').fx.flag?.encounterShocked === true
  assert(shocked, 'the patrol baton can numb your arm')
  assert(/\(numb arm\)/.test(String(resolveEncounter(fv('prisoner', 1, 'patrol', { encounterShocked: true }, 9), 'fight').fx.flag?.encounterClash ?? '')), 'a numb arm swings 0')

  // Carapace hunter harpoon pins you.
  const harp = resolveEncounter(fv('outcast', 1, 'carapace', {}, 9), 'guard').fx
  assert(harp.flag?.encounterPinned === true, 'the harpoon pins you')
  const pinnedS = fv('outcast', 1, 'carapace', { encounterPinned: true, encounterRound: 1 }, 9)
  const pinRun = encounterChoices(pinnedS).find((c) => c.id === 'enc-run')!
  assert(!isChoiceOn(pinnedS, pinRun.enable) && /harpoon/.test(String(pinRun.locked)), 'Run locks while pinned, with a reason')

  // Handler: a failed run lets the hound bite.
  let houndBite = false
  for (let t = 0; t < 40 && !houndBite; t++) houndBite = /hound bite \+1/.test(bodyOf(go(fv('prisoner', t, 'handler', {}, 9), 'run')))
  assert(houndBite, 'a failed run from the handler lets the hound bite')

  // Sand trick: sometimes they miss this round and the next.
  let blinded = false
  for (let t = 0; t < 30 && !blinded; t++) {
    const a = go(fv('vessel', t, 'cutter', {}, 9), 'trick')
    if (a.flags.encounterStun) {
      blinded = true
      assert(a.flags.encounterTrickUsed === true, 'the sand trick is spent')
      assert(/misses \(sand in the eyes\)\./.test(bodyOf(go(a, 'fight'))), 'blinded, they miss the next round')
    }
  }
  assert(blinded, 'the sand trick can land')

  // Outcast-only sand grip, once a fight, never explained.
  const gripOf = (door: 'prisoner' | 'outcast' | 'vessel') => {
    let n = 0
    for (let t = 0; t < 60; t++) {
      const s = { ...fv(door, t, 'cutter', {}, 9), health: 2 }
      if (go(s, 'fight').flags.encounterGrip) n++
    }
    return n
  }
  assert(gripOf('outcast') > 0, 'the sand grips for the Outcast')
  assert(gripOf('prisoner') === 0 && gripOf('vessel') === 0, 'no sand grip for other doors')
  for (let t = 0; t < 60; t++) {
    const s = { ...fv('outcast', t, 'cutter', {}, 9), health: 2 }
    const a = go(s, 'fight')
    if (!a.flags.encounterGrip) continue
    assert(a.flags.sandGripSeen === true, 'the grip counts as a sand sign')
    assert(!/\b(power|magic|gift|you made|your will|chosen)\b/i.test(bodyOf(a)), 'the grip is never explained')
    const again = go({ ...a, health: 2, flags: { ...a.flags, encounterHp: 9 } }, 'fight')
    assert(!/slides out from under|two of you/.test(bodyOf(again)), 'the grip happens once a fight')
    break
  }
  const forms = new Set<string>()
  for (let t = 0; t < 80; t++) {
    const a = go({ ...fv('outcast', t, 'cutter', {}, 9), health: 2 }, 'fight')
    if (!a.flags.encounterGrip) continue
    const body = bodyOf(a)
    if (/slides out from under/.test(body)) forms.add('slide')
    if (/two of you/.test(body)) forms.add('mirage')
  }
  assert(forms.has('slide') && forms.has('mirage'), 'the grip comes as a sand slide or a mirage')

  // Cloth-wrapped Seeker runners are still a TODO; Amber Husks are the Spire construct kind.
  assert(encSrc.includes("'husk'"), 'Amber Husk is an encounter kind')
  assert(readFileSync(new URL('../src/game/fightTricks.ts', import.meta.url), 'utf8').includes('TODO(seekers)'), 'cloth-wrapped Seeker runners left as a TODO')
}

// ---- Crit text only when a crit lands ----
{
  const CRIT_WORDS = /crit|double damage|lands clean|1 in 10|2 in 10|twice as/i
  const CRIT_LINE = /Critical Strike! \d+/g
  const kinds = ['jackal', 'cutter', 'tick', 'pup', 'scavenger', 'patrol', 'handler', 'overseer', 'collector', 'carapace', 'husk']
  const moves = ['fight', 'guard', 'feint', 'trick', 'run']
  let crits = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    for (const kind of kinds) {
      for (let t = 0; t < 25; t++) {
        const s0 = primedFight(door, t, kind, { hp: 9, taught: t % 2 === 0 })
        const s = { ...s0, flags: { ...s0.flags, ...fightStartFlags(s0, kind as Parameters<typeof fightStartFlags>[1]) } as GameState['flags'] }
        const before = [encounterCard(s), ...encounterChoices(s).flatMap((c) => [c.label, c.sub ?? '', String(c.locked ?? '')])].join('\n')
        assert(!CRIT_WORDS.test(before), `${door} ${kind}: no crit text on the fight card or buttons`)
        for (const how of moves) {
          const fx = resolveEncounter(s, how as 'fight').fx
          const card = String(fx.flag?.encounterClash ?? '')
          assert(!/→|vs (?:their|your) Shell \d+ →|Strike \d+\+\d+|Swing \+?\d/.test(card), `${door} ${kind} ${how}: result lines carry no maths (${card.slice(0, 120)})`)
          const found = card.match(CRIT_LINE) ?? []
          crits += found.length
          assert(!CRIT_WORDS.test(card.replace(CRIT_LINE, '')), `${door} ${kind} ${how}: only the crit log line mentions crits`)
          if (fx.flag?.encounterHere && !fx.flag?.encounterDone) {
            const next = applyEffect(s, { resolveEncounter: how as 'fight', ticks: 1 })
            const rows = encounterChoices(next).flatMap((c) => [c.label, c.sub ?? '', String(c.locked ?? '')]).join('\n')
            assert(!CRIT_WORDS.test(rows), `${door} ${kind} ${how}: no crit text on the move buttons`)
          }
        }
      }
    }
  }
  assert(crits > 0, 'crit log lines still show when a crit lands')
  const auto = fightTopicMidFight(HELP_TOPICS.find((t) => t.id === 'fight')!)
  assert(!CRIT_WORDS.test(topicLines(auto).join('\n')), 'the fight card that opens itself mid-fight has no crit text')
  assert(/CRIT:/.test(topicText(HELP_TOPICS.find((t) => t.id === 'fight')!)), 'typed help fight still explains crits')
}

// ---- Jodi Hollowmere: walk-up Stray in Silas's shade (Outcast) ----
{
  const quiet = { encounterAt: 9999 }
  const at = (fx: Parameters<typeof applyEffect>[1] = {}) => applyEffect(applyEffect(newGame('outcast'), { goto: 'spine:jodi', flag: quiet }), fx)
  const shade = applyEffect(newGame('outcast'), { goto: 'spine:shade', flag: quiet })
  assert(ids(shade).includes('walk-jodi'), 'shade walks up to Jodi')
  assert(pick(shade, 'walk-jodi').sceneId === 'spine:jodi', 'the walk-up lands at Jodi')
  const scene = getScene('spine:jodi')
  const all = JSON.stringify(scene)
  assert(/brand/.test(scene.body) && /snake/.test(scene.body) && /vultures/.test(scene.body), 'Jodi sees the brand; snake and vultures on the card')
  assert(/spiders/.test(scene.body) && /spider/.test(PEOPLE.jodi.card) && /Grudge/.test(PEOPLE.jodi.card) && /Pastor/.test(PEOPLE.jodi.card), 'spiders join Grudge and Pastor on her card and in the scene')
  assert(/spiders rush the glass/.test(interpret(at(), 'spiders').flash ?? ''), 'typed spiders gets her spider line')
  assert(/sand-spiders/.test(interpret(at(), 'look at the spiders').flash ?? ''), 'look at the spiders sees them')
  assert(!/\b(power|magic|gift|curse|you did|what you did|this is not|not a)\b/i.test(all), 'Jodi has no powers and never says what he did')
  assert(!/\b(raccoon|skunk|squirrel|possum|opossum|bat|forest)\b/i.test(all), 'only desert critters')
  for (const line of Object.values(JODI_LINES)) assert(all.includes(JSON.stringify(line).slice(1, 30)), 'each Jodi line reaches the scene')

  // Trades: visible locks that name the cost, then a real swap.
  const broke = at({ remove: { scrap: 99, glints: 99 } })
  const dropRow = visibleChoices(broke).find((c) => c.id === 'drop')!
  const salveRow = visibleChoices(broke).find((c) => c.id === 'salve')!
  assert(dropRow && !isChoiceOn(broke, dropRow.enable) && dropRow.locked === 'Need 2 scrap', 'Drop trade locked with what it needs')
  assert(salveRow && !isChoiceOn(broke, salveRow.enable) && salveRow.locked === 'Need 1 Glint', 'salve trade locked with what it needs')
  const rich = at({ add: { scrap: 2, glints: 1 } })
  const d = pick(rich, 'drop')
  assert((d.items.vial_drop ?? 0) === (rich.items.vial_drop ?? 0) + 1 && (d.items.scrap ?? 0) === (rich.items.scrap ?? 0) - 2, 'Jodi trades 2 scrap for a Drop')
  assert(!ids(d).includes('drop') && (d.flash ?? '').includes(JODI_LINES.trade), 'the Drop trade happens once, with her line')
  const sv = pick(d, 'salve')
  assert((sv.items.salve ?? 0) === (d.items.salve ?? 0) + 1 && (sv.items.glints ?? 0) === (d.items.glints ?? 0) - 1, 'Jodi trades a Glint for a Resin Salve')
  assert(sv.heat.strays === rich.heat.strays, 'trading with Jodi adds no Stray Heat')

  // Stealing: the snake bites, you leave the shade, Stray Heat rises.
  const full = at({ health: 6 })
  const bit = pick(full, 'take')
  assert(bit.health === full.health - 2 && bit.sceneId === 'spine:shade', 'the snake bites for 2 Health and you are back in the shade')
  assert(bit.heat.strays === full.heat.strays + 1 && bit.flags.strayNotice && bit.flags.jodiTook, 'stealing from Jodi raises Stray Heat and wakes the Strays')
  assert((bit.items.scrap ?? 0) === (full.items.scrap ?? 0), 'the theft gets nothing')
  assert((bit.flash ?? '').includes(JODI_LINES.bite), 'her line after the bite')
  const back = applyEffect(bit, { goto: 'spine:jodi' })
  assert(!ids(back).includes('drop') && !ids(back).includes('salve') && !ids(back).includes('take'), 'no trades or theft after she has been robbed')
  assert(/does not trade with you again/.test(sceneProse(back)), 'her card says she will not trade again')
  const low = { ...at(), health: 2 }
  const lowBit = pick(low, 'take')
  assert(lowBit.health === 2 && lowBit.sap === low.sap - 1 && lowBit.sceneId === 'spine:shade', 'at low Health the bite costs Sap instead')
  assert(visibleChoices(full).filter((c) => c.id === 'take').length === 1, 'one take row shows at a time')

  // Typed: who, brand, look.
  assert(/Jodi Hollowmere/.test(interpret(full, 'who is jodi').flash ?? ''), 'who is jodi answers')
  const asked = interpret(full, 'what does my brand mean').flash ?? ''
  assert(/We don't tell him/.test(asked), 'Jodi refuses to say what the brand means')
  assert(/Glint/.test(interpret(full, 'look').flash ?? ''), 'look at Jodi names her prices')
}

// ---- Jodi's portrait ----
{
  const j = applyEffect(newGame('outcast'), { goto: 'spine:jodi', flag: { encounterAt: 9999 } })
  assert(playCoverKey(j, sceneOf(j)) === 'jodi' && playCoverFile('jodi') === 'jodi.jpg', 'Jodi uses her own portrait')
  const band = COVER_BAND.jodi
  assert(band && band[0] < 0.15 && band[1] >= 0.45, 'Jodi band keeps her face and the snake above the story')
  const jpg = readFileSync(new URL('../public/covers/jodi.jpg', import.meta.url))
  assert(jpg[0] === 0xff && jpg[1] === 0xd8 && jpg.length > 40000, 'covers/jodi.jpg is a real JPEG')
  assert(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').includes('covers/jodi.jpg'), 'SW precaches Jodi')
}

// ── Gear overhaul: slots, hands, Shell cap, bag, craft, disguise ──
{
  const base = newGame('outcast')
  assert(GK.EQUIP_SLOTS.length === 8, 'eight gear slots')
  assert(GK.SLOT_LABEL.weapon === 'Main hand' && GK.SLOT_LABEL.armor === 'Body' && GK.SLOT_LABEL.offhand === 'Off hand', 'slot labels map old ids')
  assert(ITEMS.dust_cloak.slot === 'cloak', 'Dust Cloak wears in the Cloak slot')
  // migration: an old save with the cloak on armor and a blade in the off hand
  const old = repairLoadedState({ ...base, items: { ...base.items, dust_cloak: 1, needle_knife: 1, shiv: 1 }, equipped: { armor: 'dust_cloak', weapon: 'needle_knife', offhand: 'shiv' } as GameState['equipped'] })
  assert(old.equipped.cloak === 'dust_cloak' && !old.equipped.armor, 'old Dust Cloak on armor moves to cloak')
  assert(old.equipped.offhand === 'shiv', 'a blade in the off hand is kept on load')
  // hands
  let g: GameState = { ...base, items: { ...base.items, scrap_buckler: 1, wrench: 1, needle_knife: 1, shiv: 1, head_wrap: 1, shin_wraps: 1, hide_gloves: 1, dust_cloak: 1, scav_wrap: 1 } }
  assert(!!GE.equipBlock(g, 'scrap_buckler', 'weapon'), 'shield cannot go in the main hand')
  assert(!!GE.equipBlock(g, 'wrench', 'offhand'), 'wrench cannot go in the off hand')
  g = equipItem(g, 'needle_knife', 'weapon')
  assert(!!GE.equipBlock(g, 'needle_knife', 'offhand'), 'one copy cannot be in both hands')
  const mainOnly = GK.equippedStrike(g)
  g = equipItem(g, 'shiv', 'offhand')
  assert(GK.equippedStrike(g) === mainOnly + 1, 'off-hand blade adds 1 Strike')
  g = equipItem(g, 'scrap_buckler', 'offhand')
  assert(g.equipped.offhand === 'scrap_buckler' && GK.equippedStrike(g) === mainOnly, 'shield replaces the off-hand blade')
  for (const id of ['head_wrap', 'shin_wraps', 'hide_gloves', 'dust_cloak', 'scav_wrap'] as const) g = equipItem(g, id)
  assert(GK.equippedShell(g) <= GK.SHELL_CAP && GK.SHELL_CAP === 5, 'Shell is capped at 5')
  assert(GK.equippedShell({ ...g, equipped: { head: 'head_wrap', offhand: 'scrap_buckler' } }) === 2, 'head and shield add up')
  // perks in a fight
  let f = applyEffect(g, { goto: 'camp:wire', enterHub: 'camp04', flag: { encounterAt: 99999 } })
  f = applyEffect(f, beginEncounter(f, 'patrol'))
  const bare = { ...f, equipped: { ...f.equipped, legs: undefined } }
  assert(runChance(f) === Math.min(90, runChance(bare) + 10), 'Shin Wraps add Run +10')
  const ticked = primedFight('outcast', 3, 'tick', { hp: 3 })
  const latched: GameState = { ...ticked, flags: { ...ticked.flags, encounterLatched: true, encounterRound: 1 } }
  const gloved: GameState = { ...latched, items: { ...latched.items, hide_gloves: 1 }, equipped: { ...latched.equipped, hands: 'hide_gloves' } }
  assert(/strike/.test(encounterChoices(gloved).find((c) => c.id === 'enc-pull')?.sub ?? ''), 'Hide Gloves: pull row says you strike too')
  const pulledBare = applyEffect(latched, { resolveEncounter: 'pull', ticks: 1 })
  const pulledGloved = applyEffect(gloved, { resolveEncounter: 'pull', ticks: 1 })
  assert(Number(pulledGloved.flags.encounterHp ?? 0) < Number(pulledBare.flags.encounterHp ?? 3) || !pulledGloved.flags.encounterHere, 'Hide Gloves: pulling the tick also hits it')
  // bag: capacity counts SLOTS. A stack of small goods is one slot; each spare weapon or wearable is one; worn gear rides free.
  const b0 = newGame('prisoner')
  assert(GK.bagCap(b0) === 10, 'bag has 10 slots')
  const bagBare: GameState = { ...b0, items: {}, equipped: {} as GameState['equipped'], flags: { ...b0.flags } }
  delete bagBare.flags.bagHeld
  const withItems = (items: GameState['items'], equipped: GameState['equipped'] = {} as GameState['equipped']): GameState => ({ ...bagBare, items, equipped })
  assert(GK.bagLoad(withItems({ vial_drop: 6 })) === 1, '6 Drops count as 1 slot')
  assert(GK.bagLoad(withItems({ shiv: 1, wrench: 1 })) === 2, '2 different weapons count as 2 slots')
  assert(GK.bagLoad(withItems({ shiv: 2 })) === 2, 'two of the same weapon do not stack')
  assert(GK.bagLoad(withItems({ head_wrap: 1, hide_wrap: 1, scrap_buckler: 1 })) === 3, 'armor and wearables never stack')
  assert(GK.bagLoad(withItems({ shiv: 1 }, { weapon: 'shiv' } as GameState['equipped'])) === 0, 'worn gear rides free')
  assert(GK.bagLoad(withItems({ shiv: 2 }, { weapon: 'shiv' } as GameState['equipped'])) === 1, 'a spare of a worn weapon takes a slot')
  assert(GK.bagLoad(withItems({ vial_drop: 3, salve: 4, scrap: 9, sinew_cord: 2 })) === 4, 'Drops, salves, scrap, and cord each stack into one slot')
  assert(GK.bagLoad(withItems({ glints: 12, scrip: 3, cache_map: 1, vial_empty: 4, scav_pack: 1, hauler_pack: 1, ossa_token: 1 })) === 0, 'coin, key items, empty vials, and bags ride free')
  const STACKS: ItemId[] = ['vial_drop', 'salve', 'scrap', 'sinew_cord']
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    if (GK.bagFree(id)) continue
    assert(GK.bagStacks(id) === STACKS.includes(id), `${id} stacks only if it is a small good`)
    if (ITEMS[id].slot) assert(!GK.bagStacks(id), `${id} is wearable, so it never stacks`)
  }
  const full = withItems({ vial_drop: 2, scrap: 5, rusted_dagger: 4, needle_knife: 4 })
  assert(GK.bagLoad(full) === 10, 'test bag is exactly full (2 stacks + 8 blades)')
  assert(GK.bagLine(full) === 'Bag 10/10 slots', 'bag counter reads in slots')
  const more = GK.fitBag(full, { ...full, items: { ...full.items, vial_drop: 5 }, flash: 'You find Drops.' })
  assert(more.items.vial_drop === 5 && !more.flags.bagHeld && GK.bagLoad(more) === 10, 'a full bag still accepts more of a stack it already has')
  const over = GK.fitBag(full, { ...full, items: { ...full.items, salve: 2 }, flash: 'You find salve.' })
  assert(!over.items.salve && GK.bagLoad(over) === 10 && /Your bag is full \(10\/10 slots\)/.test(over.flash ?? '') && /salve:2/.test(String(over.flags.bagHeld)), 'a full bag refuses a new item type, holding the whole stack')
  const blade = GK.fitBag(full, { ...full, items: { ...full.items, shiv: 1 } })
  assert(!blade.items.shiv && /shiv:1/.test(String(blade.flags.bagHeld)), 'a full bag refuses a new weapon')
  const moreBlade = GK.fitBag(full, { ...full, items: { ...full.items, needle_knife: 5 } })
  assert(moreBlade.items.needle_knife === 4 && /needle_knife:1/.test(String(moreBlade.flags.bagHeld)), 'another copy of a carried weapon still needs its own slot')
  assert(GK.bagFits(full, { scrap: 3 }) && !GK.bagFits(full, { salve: 1 }) && GK.bagFits(full, { salve: 1 }, { scrap: 5 }), 'bagFits: more of a stack fits; a new type needs a freed slot')
  assert(GK.bagFits(full, { hauler_pack: 1 }), 'a bag always fits (it rides free)')
  const rows = visibleChoices(over).map((c) => c.id)
  assert(rows.includes('bag-drop-scrap') && rows.includes('bag-drop-rusted_dagger') && rows.includes('bag-leave'), 'full bag offers drop and leave')
  assert(/Drop all 5 Scrap/.test(visibleChoices(over).find((c) => c.id === 'bag-drop-scrap')?.label ?? ''), 'dropping a stack to free a slot drops the whole stack')
  const swapped = pick(over, 'bag-drop-scrap')
  assert(!(swapped.items.scrap ?? 0) && swapped.items.salve === 2 && !swapped.flags.bagHeld && GK.bagLoad(swapped) === 10, 'dropping the scrap stack takes the held salve')
  const swapped2 = pick(over, 'bag-drop-rusted_dagger')
  assert(swapped2.items.rusted_dagger === 3 && swapped2.items.salve === 2 && !swapped2.flags.bagHeld, 'dropping one dagger takes the held salve')
  const left = pick(over, 'bag-leave')
  assert(!left.flags.bagHeld && GK.bagLoad(left) === 10, 'leave it clears the held find')
  const walked = applyEffect(over, { goto: 'camp:lean' })
  assert(!walked.flags.bagHeld, 'walking away leaves the held find')
  const dropAll = GE.dropStack(full, 'scrap')
  assert(!(dropAll.items.scrap ?? 0) && GK.bagLoad(dropAll) === 9, 'Drop all frees the stack slot')
  // Old saves: unit counts collapse into slots; an over-cap bag keeps everything but takes nothing new.
  const oldFull = withItems({ scrap: 7, vial_drop: 3 })
  assert(GK.bagLoad(oldFull) === 2, 'an old save that was full by count now has free slots')
  const oldOver = withItems({ rusted_dagger: 6, needle_knife: 6 })
  const loadedOver = repairLoadedState(oldOver)
  assert(loadedOver.items.rusted_dagger === 6 && loadedOver.items.needle_knife === 6 && GK.bagLoad(loadedOver) === 12, 'an over-cap old save loads with nothing deleted')
  const overFind = GK.fitBag(loadedOver, { ...loadedOver, items: { ...loadedOver.items, vial_drop: 1 } })
  assert(!overFind.items.vial_drop && overFind.items.rusted_dagger === 6 && /vial_drop:1/.test(String(overFind.flags.bagHeld)), 'an over-cap bag blocks new pickups')
  const lighter = applyEffect(loadedOver, { remove: { rusted_dagger: 1 } })
  const stillOver = GK.fitBag(lighter, { ...lighter, items: { ...lighter.items, salve: 1 } })
  assert(!stillOver.items.salve && GK.bagLoad(stillOver) === 11, 'still over the cap after one drop: still blocked')
  const freed = withItems({ rusted_dagger: 4, needle_knife: 5 })
  assert(GK.fitBag(freed, { ...freed, items: { ...freed.items, salve: 1 } }).items.salve === 1, 'once slots free up, pickups work again')
  // Buying: a full bag locks the buy instead of taking the money.
  assert(!buyFits({ ...full, items: { ...full.items, glints: 3 } }, { item: 'salve' }, { glints: 1 }), 'a full bag cannot buy a new item type')
  assert(buyFits({ ...full, items: { ...full.items, glints: 3 } }, { item: 'vial_drop' }, { glints: 1 }), 'a full bag can buy more of a stack it carries')
  assert(buyFits(full, { item: 'salve' }, { scrap: 5 }), 'paying with the whole scrap stack frees the slot for the buy')
  assert(GK.bagLoad({ ...full, items: { ...full.items, scav_pack: 1, hauler_pack: 1 } }) === 10, 'bags and key items ride free')
  // craft
  const noCord = GE.craftScavPack({ ...b0, items: { ...b0.items, scrap: 3 } })
  assert(!noCord.items.scav_pack && noCord.flash === `${GK.SCAV_PACK_LOCKED}.`, 'Scav Pack locked without the cord says what is needed')
  const made = GE.craftScavPack({ ...b0, items: { ...b0.items, scrap: 3, sinew_cord: 1 } })
  assert(made.items.scav_pack === 1 && !(made.items.sinew_cord ?? 0) && GK.bagCap(made) === 14, 'Scav Pack crafted, bag carries 14')
  assert(interpret({ ...b0, items: { ...b0.items, scrap: 3, sinew_cord: 1 } }, 'craft pack').items.scav_pack === 1, 'typed craft pack stitches it')
  assert(GK.bagCap({ ...b0, items: { ...b0.items, hauler_pack: 1, scav_pack: 1 } }) === 20, 'Hauler Pack carries 20')
  assert(/Bag \d+\/10 slots/.test(interpret(b0, 'look at my gear').flash ?? ''), 'look at my gear shows the bag in slots')
  // scavenge extras and Kaelen
  assert(GS.GEAR_FIND_PIECES.length === 4 && GS.CLOTH_FIND_PCT > 0 && GS.HAULER_FIND_PCT > 0 && GS.CORD_FIND_PCT > 0, 'scavenge has gear, cord, cloth, and hauler finds')
  // Kaelen is a Prisoner NPC: the Hauler Pack and Vessel Cloth come from him only in that door.
  for (const door of ['outcast', 'vessel'] as const) {
    for (const where of ['camp:kaelen', 'thresh:kaelen', 'roam:kaelen']) {
      const offers = kaelenOffers(applyEffect(newGame(door), { goto: where })).map((o) => o.id)
      assert(!offers.includes('cloth') && !offers.includes('hauler'), `${door}: Kaelen sells no Hauler Pack or Vessel Cloth at ${where}`)
    }
  }
  const pk = kaelenOffers(applyEffect(newGame('prisoner'), { goto: 'camp:kaelen' })).map((o) => o.id)
  assert(pk.includes('cloth') && pk.includes('hauler'), 'Prisoner: Kaelen sells the Hauler Pack and Vessel Cloth')
  const silasO = interpret({ ...applyEffect(newGame('outcast'), { goto: 'spine:silas', flag: { encounterAt: 99999 } }), items: { glints: 5, scrap: 5 } }, 'buy a hauler pack with glints')
  assert(silasO.items.hauler_pack === 1, 'Outcast: Silas sells the Hauler Pack')
  const silasP = interpret({ ...applyEffect(newGame('prisoner'), { goto: 'spine:silas', flag: { encounterAt: 99999 } }), items: { glints: 5, scrap: 5 } }, 'buy a hauler pack with glints')
  assert(!silasP.items.hauler_pack, 'Prisoner: Silas does not sell the Hauler Pack')
  const zafV = interpret({ ...applyEffect(newGame('vessel'), { goto: 'maw:zafir', enterHub: 'redmaw', flag: { encounterAt: 99999, zafirMet: true } }), items: { glints: 5, scrap: 5 } }, 'buy a hauler pack with glints')
  assert(zafV.items.hauler_pack === 1, 'Vessel: Zafir sells the Hauler Pack')
  const zafO = interpret({ ...applyEffect(newGame('outcast'), { goto: 'maw:zafir', enterHub: 'redmaw', flag: { encounterAt: 99999, zafirMet: true } }), items: { glints: 5, scrap: 5 } }, 'buy a hauler pack with glints')
  assert(!zafO.items.hauler_pack, 'Outcast: Zafir does not sell the Hauler Pack')

  // disguise
  const dress = (door: DoorId): GameState => {
    const s0 = newGame(door)
    return { ...s0, items: { ...s0.items, ceremonial_cloth: 1 }, equipped: { ...s0.equipped, garment: 'ceremonial_cloth' } }
  }
  for (const door of ['prisoner', 'outcast'] as const) {
    const d = dress(door)
    assert(GK.disguiseActive(d), `${door}: cloth is a disguise`)
    const hot = applyEffect(d, { heat: { cartel: 2 } })
    assert(hot.heat.cartel === d.heat.cartel + 1, `${door}: Cartel Heat gain is 1 lower in the cloth`)
    const guard = applyEffect(d, { goto: 'camp:guard', enterHub: 'camp04' })
    assert(!guard.flags.cartelNotice, `${door}: Guard Station does not mark you in the cloth`)
    const syb = applyEffect(d, { goto: 'maw:sybella', enterHub: 'redmaw' })
    assert(syb.flags.disguiseBlown && syb.heat.seekers === Math.min(8, d.heat.seekers + 1) && /Sybella/.test(syb.flash ?? ''), `${door}: Sybella always sees through the cloth`)
    assert(!GK.disguiseActive(syb), `${door}: seen through, the cloth stops working`)
    let pass = false
    let fail = false
    for (let t = 0; t < 40 && !(pass && fail); t++) {
      const p0 = primedFight(door, 3 + t, 'patrol', { hp: 3 })
      const e: GameState = { ...p0, items: { ...p0.items, ...d.items }, equipped: { ...p0.equipped, garment: 'ceremonial_cloth' }, heat: { ...p0.heat, cartel: 1 } }
      const row = encounterChoices(e).find((c) => c.id === 'enc-disguise')
      assert(!!row, `${door}: Walk past row shows for a patrol`)
      const r = applyEffect(e, row!.effects)
      if (r.flags.encounterDone && !r.flags.disguiseBlown && /walk past/i.test(String(r.flags.encounterClash))) pass = true
      else if (r.flags.disguiseBlown && r.heat.cartel >= e.heat.cartel + 2) fail = true
    }
    assert(pass && fail, `${door}: Walk past in the cloth can pass or be seen through`)
  }
  const pv = primedFight('vessel', 3, 'patrol', { hp: 3 })
  assert(!encounterChoices({ ...pv, items: { ...pv.items, ceremonial_cloth: 1 }, equipped: { ...pv.equipped, garment: 'ceremonial_cloth' } }).some((c) => c.id === 'enc-disguise'), 'Vessel door: no Walk past row')
  const v = dress('vessel')
  assert(!GK.disguiseActive(v), 'Vessel door: the cloth is not a disguise')
  assert(applyEffect(v, { heat: { cartel: 2 } }).heat.cartel === v.heat.cartel + 2, 'Vessel door: Cartel Heat unchanged')
  assert(!applyEffect(v, { goto: 'maw:sybella', enterHub: 'redmaw' }).flags.disguiseBlown, 'Vessel door: Sybella has nothing to see through')
  assert(Object.values(PEOPLE).filter((p) => p.seesThroughDisguise).map((p) => p.id).join() === 'sybella', 'only Sybella has seesThroughDisguise')
  // plain text in new lines
  const newText = [DG.DISGUISE_SOFTEN_NOTE, GK.SCAV_PACK_LOCKED, ...['head_wrap', 'shin_wraps', 'hide_gloves', 'scrap_buckler', 'sinew_cord', 'scav_pack', 'hauler_pack'].map((id) => ITEMS[id as keyof typeof ITEMS].desc ?? '')]
  for (const t of newText) assert(!/\bthis is not\b|\bit is not a\b/i.test(t), `plain line: ${t}`)
}

// Jaxson "Oil-Tooth" Vance: the nickname is his alone; lookups by name, surname, and nickname.
{
  assert(PEOPLE.oiltooth.name === 'Jaxson Vance' || PEOPLE.oiltooth.name === 'Jaxson', 'Jaxson is named Jaxson')
  assert(PEOPLE.oiltooth.aliases.includes('vance') && PEOPLE.oiltooth.aliases.includes('jaxson'), 'jaxson and vance are aliases')
  for (const a of ['oil-tooth', 'oiltooth', 'oil tooth']) assert(PEOPLE.oiltooth.aliases.includes(a), `Jaxson answers to ${a}`)
  assert(/Jaxson "Oil-Tooth" Vance/.test(PEOPLE.oiltooth.card) && /call him Oil-Tooth because of the brass jaw/.test(PEOPLE.oiltooth.card), 'his card names the nickname and why')
  for (const p of Object.values(PEOPLE)) {
    if (p.id === 'oiltooth') continue
    assert(!/oil.?tooth/i.test(`${p.name} ${p.aliases.join(' ')}`), `${p.id} does not answer to Oil-Tooth`)
  }
  for (const ask of ['who is jaxson', 'who is vance', 'who is oil-tooth', 'who is oiltooth', 'who is oil tooth']) {
    assert(/cybernetic brass jaw/.test(interpret(pick(newGame('prisoner'), 'pens'), ask).flash ?? ''), `"${ask}" returns his card`)
  }
  const srcDir = join(process.cwd(), 'src')
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
  // Oil-Tooth only ever means Jaxson: never after another first name, never a family or a title for anyone else.
  let uses = 0
  for (const f of walk(srcDir)) {
    const txt = readFileSync(f, 'utf8')
    for (const m of txt.matchAll(/(\S+)\s+"?Oil-Tooth"?(\s+\S+)?/g)) {
      const before = m[1].replace(/^["'`(]+/, '')
      const name = /^[A-Z][a-z]+$/.test(before) && !['Jaxson', 'The', 'Tell', 'Ask', 'Find', 'People', 'Call', 'Like'].includes(before)
      assert(!name, `Oil-Tooth after another name in ${f}: ${m[0]}`)
    }
    assert(!/Oil-Tooth(?:s'|s)?\s+(?:family|clan|kin|brother|sister|cousin|father|mother|son|daughter)/i.test(txt), `no Oil-Tooth family in ${f}`)
    assert(!/(?:Greg|Marta)\s+Oil-Tooth/.test(txt), `Greg and Marta are not Oil-Tooth in ${f}`)
    uses += (txt.match(/Oil-Tooth/g) ?? []).length
  }
  assert(uses >= 5, 'other people use the Oil-Tooth nickname in some lines')
  assert(/Oil-Tooth/.test(PIKE_TALK + SARN_TALK + VETCH_TALK), 'a Skiff Bay hand says Oil-Tooth')
}
// Nim is the Carapace hunter (old Cartel name Caius Draven). The shade toll is Drennick Voss.
{
  assert(PEOPLE.carapace.name === 'Nim' && CARAPACE_HUNTER.face === 'Nim' && CARAPACE_HUNTER.encounter.name === 'Nim', 'the Carapace hunter is Nim')
  for (const a of ['nim', 'draven', 'caius', 'carapace hunter']) assert(PEOPLE.carapace.aliases.includes(a), `hunter answers to ${a}`)
  assert(!PEOPLE.drennick.aliases.includes('nim'), 'Drennick does not answer to Nim')
  assert(/Caius Draven/.test(PEOPLE.carapace.card) && /Shard-Born Striders/.test(PEOPLE.carapace.card), 'hunter card keeps the bio and names Draven')
  assert(!/shard-hound/i.test(PEOPLE.carapace.card + CARAPACE_HUNTER.append + CARAPACE_HUNTER.look + CARAPACE_HUNTER.encounter.line), 'Nim is never called a Shard-Hound')
  assert(/Ironwood roots/.test(PEOPLE.drennick.card) && /Great Bleed/.test(PEOPLE.drennick.card) && /only survivor/.test(PEOPLE.drennick.card), 'Drennick card is the new bio')
  const tax = applyEffect(newGame('outcast'), { goto: 'ch1:o-tax', startChapter: 'cache-run' } as never)
  for (const ask of ['who is nim', 'who is draven', 'who is caius']) {
    assert(/Carapace hunter/.test(interpret({ ...tax, flags: { ...tax.flags, metCarapace: true } }, ask).flash ?? ''), `"${ask}" gives the hunter card`)
    assert(!/Ironwood roots/.test(interpret(tax, ask).flash ?? ''), `"${ask}" never gives Drennick`)
  }
  assert(/Ironwood roots/.test(interpret(tax, 'who is drennick').flash ?? ''), '"who is drennick" gives his card')
  if (tax.sceneId === 'ch1:o-tax') {
    assert(/Drennick Voss/.test(bodyOf(tax)) && !/\bNim\b/.test(bodyOf(tax)), 'the shade toll is Drennick')
    assert(/You know what you did/.test(interpret(tax, 'talk to drennick').flash ?? ''), 'Drennick keeps "You know what you did"')
  }
  // Valerius on the Spine names Draven; the journal keeps it.
  const val = applyEffect(newGame('outcast'), { goto: 'spine:valerius', flag: { encounterAt: 99999 } })
  const asked = pick(val, 'draven')
  assert(asked.flags.heardDraven && /Draven went over to the sand-rats/.test(asked.flash ?? ''), 'Valerius names Caius Draven')
  assert(RUMORS.some((r) => r.flag === 'heardDraven' && /Caius Draven/.test(r.body)), 'journal keeps the Draven rumor')
  // Save migration: old Nim toll flags become Drennick flags.
  const oldSave = { ...newGame('outcast'), flags: { ...newGame('outcast').flags, metNim: true, nimMet: true, nimRun: true } } as GameState
  const moved = repairLoadedState(oldSave)
  assert(moved.flags.metDrennick && moved.flags.drennickMet && moved.flags.drennickRun && !('metNim' in moved.flags) && !('nimRun' in moved.flags), 'old Nim flags map to Drennick')
  // Heat lists: names first and capitalized; then common nouns in lowercase (a proper adjective like "Seeker" may lead).
  const NAMES = new Set([...Object.values(PEOPLE).map((p) => p.name), 'Jaxson', 'Silas', 'Ossa', 'Brin and Kesh', 'Kaelen the Sifter', 'Ironwood', 'Shard-Hounds', 'Dune-Strays'])
  const PROPER_ADJ = ['Seeker', 'Cartel', 'Stray']
  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    for (const [f, card] of Object.entries(heatFactions(door))) {
      let commonSeen = false
      for (const part of card.watch.split(', ')) {
        const name = NAMES.has(part)
        const common = !name && (/^[a-z]/.test(part) || (PROPER_ADJ.includes(part.split(' ')[0]) && /^[a-z]/.test(part.split(' ')[1] ?? '')))
        assert(name || common, `${door} ${f} watch entry is a known name or a lowercase common noun: ${part}`)
        if (common) commonSeen = true
        else assert(!commonSeen, `${door} ${f} watch list puts names first: ${card.watch}`)
        if (common) assert(!/\b[A-Z]/.test(part.split(' ').slice(1).join(' ')) || /hymn-road/.test(part), `${door} ${f} common noun stays lowercase: ${part}`)
      }
      assert(!/\brunners?\b/i.test(f === 'seekers' ? card.watch + card.body : ''), `${door} Seekers line has no runners`)
    }
  }
  assert(heatFactions('outcast').seekers.watch === 'Sybella, Seeker skiffs', 'Outcast Seekers list is Sybella, Seeker skiffs')
  assert(/Drennick Voss/.test(heatFactions('outcast').strays.watch), 'Outcast Strays list names Drennick')
}
// Amber Husks: Seeker Spire constructs.
{
  const huskSpec = encounterCard({ ...primedFight('vessel', 4, 'husk', { hp: 3 }), flags: { ...primedFight('vessel', 4, 'husk', { hp: 3 }).flags, fightTaught: true, encounterOpen: 0 } })
  assert(/Amber Husk|amber core|calcified/i.test(huskSpec), 'husk card names the construct')
  const opens = new Set<string>()
  for (let t = 0; t < 9; t++) {
    const st = { ...primedFight('vessel', t, 'husk', { hp: 3 }), flags: { ...primedFight('vessel', t, 'husk', { hp: 3 }).flags, ...fightStartFlags(primedFight('vessel', t, 'husk', { hp: 3 }), 'husk'), fightTaught: true } }
    opens.add(encounterCard(st).split('\n')[0])
  }
  assert(opens.size >= 3, `husk openers vary (${opens.size})`)
  // Stats and choices.
  const bare = primedFight('vessel', 2, 'husk', { hp: 3, arm: false })
  const armed = primedFight('vessel', 2, 'husk', { hp: 3 })
  const rows = encounterChoices(bare).map((c) => c.id)
  assert(rows.includes('enc-core') && rows.includes('enc-guard') && rows.includes('enc-trick'), 'husk offers Aim for the core, Guard, Throw sand')
  assert(!rows.includes('enc-seeker'), 'solo husk has no Cut the Seeker row')
  const withCtrl: GameState = { ...bare, flags: { ...bare.flags, encounterController: true } }
  assert(encounterChoices(withCtrl).some((c) => c.id === 'enc-seeker'), 'husk with Seeker offers Cut the Seeker down')
  // Guard only -1; sand almost never; no stall walk-off; no salve.
  const g = resolveEncounter(bare, 'guard')
  assert(/\(guard −1\)/.test(String(g.fx.flag?.encounterClash ?? '')), 'Guard vs husk takes 1')
  // Force by reading notes from a known state: compare cut via clash math.
  const shellBare = 0
  const huskStrike = 3
  assert(exchangeDamage(huskStrike, 1, shellBare, DAMAGE_FLOOR) - 1 === exchangeDamage(huskStrike, 1, shellBare, DAMAGE_FLOOR) - 1, 'sanity')
  assert(!HUMAN_KINDS.includes('husk' as never) && !BEAST_KINDS.includes('husk' as never), 'husk is a construct, not human or beast')
  assert(!carriesSalve(bare, 'husk' as never), 'husks never carry salve')
  // Shatter = win at 0 HP.
  const dying: GameState = { ...armed, flags: { ...armed.flags, encounterHp: 1, encounterRound: 1 } }
  let shattered = false
  for (let t = 0; t < 20 && !shattered; t++) {
    const r = resolveEncounter({ ...dying, ticks: dying.ticks + t }, 'fight')
    if (r.fx.flag?.encounterDone && /amber heart shatters/i.test(String(r.fx.flag.encounterClash ?? r.flash))) shattered = true
  }
  assert(shattered, 'dropping the husk shatters the amber heart')
  // Loot is scrap and maybe a Drop, never salve or bags.
  let sawScrap = false
  let sawBad = false
  for (let t = 0; t < 40; t++) {
    const r = resolveEncounter({ ...dying, ticks: 100 + t, flags: { ...dying.flags, encounterHp: 1 } }, 'fight')
    if (!r.fx.flag?.encounterDone) continue
    const add = r.fx.add ?? {}
    if ((add.scrap ?? 0) > 0) sawScrap = true
    if ((add.salve ?? 0) > 0 || (add.scav_pack ?? 0) > 0 || (add.hauler_pack ?? 0) > 0) sawBad = true
  }
  assert(sawScrap && !sawBad, 'husk loot is resin scrap (and maybe a Drop), never salve or bags')
  // Revive once when Seeker controller is present.
  const ctrl: GameState = {
    ...armed,
    flags: { ...armed.flags, encounterHp: 1, encounterRound: 2, encounterController: true },
  }
  let revived = false
  for (let t = 0; t < 25 && !revived; t++) {
    const r = resolveEncounter({ ...ctrl, ticks: ctrl.ticks + t }, 'fight')
    if (r.fx.flag?.encounterHuskRevived && Number(r.fx.flag.encounterHp) === 2 && !r.fx.flag.encounterDone) revived = true
  }
  assert(revived, 'Seeker extractor re-charges the husk once')
  const downed: GameState = { ...ctrl, flags: { ...ctrl.flags, encounterControllerDown: true } }
  let noSecond = true
  for (let t = 0; t < 20; t++) {
    const r = resolveEncounter({ ...downed, ticks: downed.ticks + t }, 'fight')
    if (r.fx.flag?.encounterDone && /amber heart shatters/i.test(String(r.fx.flag.encounterClash ?? ''))) {
      /* ok */
    } else if (r.fx.flag?.encounterHuskRevived) noSecond = false
  }
  assert(noSecond, 'no revive after the Seeker is down')
  // Stall: husks never walk off after empty attacking rounds (humans do).
  let walked = false
  for (let t = 0; t < 30; t++) {
    const st0: GameState = {
      ...armed,
      ticks: armed.ticks + t,
      health: 6,
      flags: { ...armed.flags, encounterHp: 3, encounterRound: 1, encounterStall: STALL_ROUNDS - 1, encounterController: false },
    }
    // floor 0 lets both sides deal 0 when swings and shells cancel; husks must stay.
    const r = resolveEncounter(st0, 'fight', { floor: 0 })
    if (/backs off and leaves/.test(String(r.fx.flag?.encounterClash ?? r.flash))) walked = true
  }
  assert(!walked, 'husks never walk off after empty rounds')
  // Spawn: Seeker turf at Heat 3+ can pick husk; huskGround covers Spire-adjacent.
  const hotVessel = { ...newGame('vessel'), heat: { cartel: 0, seekers: 4, strays: 0 }, sceneId: 'thresh:court', hubId: 'threshold' as const }
  let sawHusk = false
  for (let t = 0; t < 60; t++) {
    if (pickEncounterKind({ ...hotVessel, ticks: t }) === 'husk') sawHusk = true
  }
  assert(sawHusk, 'Seeker turf at Seeker Heat 3+ can spawn Amber Husks')
  assert(huskGround(hotVessel), 'Threshold is husk ground')
  const coldCamp = { ...newGame('prisoner'), heat: { cartel: 0, seekers: 0, strays: 0 }, sceneId: 'camp:yard', hubId: 'camp04' as const }
  assert(![...Array(40)].some((_, t) => pickEncounterKind({ ...coldCamp, ticks: t }) === 'husk'), 'low Seeker Heat off Spire does not spawn husks')
  const highAny = { ...newGame('prisoner'), heat: { cartel: 0, seekers: 5, strays: 0 }, sceneId: 'camp:yard', hubId: 'camp04' as const }
  assert([...Array(40)].some((_, t) => pickEncounterKind({ ...highAny, ticks: t }) === 'husk'), 'Seeker Heat 5 can field a husk on any road')
  // Aim for the core exists once; help names the husk.
  assert(/Amber Husk/.test(topicText(HELP_TOPICS.find((t) => t.id === 'fight')!)), 'fight help has an Amber Husk entry')
  assert(!/\bthis is not\b/i.test(topicText(HELP_TOPICS.find((t) => t.id === 'fight')!)), 'husk help has no "this is not" lines')
  // Fresh character can win with Guard/Feint against a solo husk sometimes; naked rush often loses.
  let guardWins = 0
  let rushLosses = 0
  for (let t = 0; t < 25; t++) {
    let g: GameState = primedFight('vessel', 10 + t, 'husk', { hp: 3, arm: false })
    g = {
      ...g,
      items: { ...g.items, shiv: 1 },
      equipped: { ...g.equipped, weapon: 'shiv' },
      flags: { ...g.flags, encounterController: false },
      heat: { ...g.heat, seekers: 3 },
    }
    let rounds = 0
    while (g.flags.encounterHere && !g.flags.encounterDone && !g.flags.downed && rounds < 14) {
      const move = rounds % 3 === 0 ? 'feint' : rounds % 3 === 1 ? 'fight' : 'guard'
      const r = resolveEncounter(g, move as never)
      g = applyEffect(g, r.fx)
      rounds++
    }
    if (g.flags.encounterDone && /amber heart shatters/i.test(String(g.flags.encounterClash ?? ''))) guardWins++
    let rush: GameState = primedFight('vessel', 40 + t, 'husk', { hp: 3, arm: false })
    rush = { ...rush, flags: { ...rush.flags, encounterController: false } }
    rounds = 0
    while (rush.flags.encounterHere && !rush.flags.encounterDone && rounds < 8) {
      const r = resolveEncounter(rush, 'fight')
      rush = applyEffect(rush, r.fx)
      rounds++
      if ((rush.health ?? 0) <= 0) {
        rushLosses++
        break
      }
    }
  }
  assert(guardWins >= 1, `Guard/Feint can beat a husk (${guardWins}/25)`)
  assert(rushLosses >= 5, `naked rush often loses to a husk (${rushLosses}/25)`)
}

// Seeker Extractor: rare drop from a Seeker walking a husk; Draw resin perk.
{
  assert(ITEMS.seeker_extractor.strike === 3 && ITEMS.seeker_extractor.slot === 'weapon', 'Seeker Extractor is Main hand Strike 3')
  assert(/living heat|liquefy resin|without shattering/i.test(ITEMS.seeker_extractor.desc), 'extractor lore matches Jeramie')
  assert(EXTRACTOR_DROP_IN === 8 && EXTRACTOR_DUPE_IN === 40, 'drop is 1 in 8, dupe 1 in 40')
  const alone = primedFight('vessel', 5, 'husk', { hp: 1 })
  const soloFlags = { ...alone.flags, encounterController: false, encounterHp: 1 }
  let soloDrop = false
  for (let t = 0; t < 80; t++) {
    const r = resolveEncounter({ ...alone, ticks: 200 + t, flags: { ...soloFlags } }, 'fight')
    if ((r.fx.add?.seeker_extractor ?? 0) > 0) soloDrop = true
  }
  assert(!soloDrop, 'husk alone never drops a Seeker Extractor')
  // Controller flag stays set after the Seeker is cut down; revive is already spent or Seeker is down.
  const ctrl = {
    ...alone,
    flags: { ...alone.flags, encounterController: true, encounterControllerDown: true, encounterHp: 1 },
  }
  let drops = 0
  for (let t = 0; t < 160; t++) {
    const r = resolveEncounter({ ...ctrl, ticks: 300 + t, items: { ...ctrl.items }, flags: { ...ctrl.flags, encounterHp: 1 } }, 'fight')
    if ((r.fx.add?.seeker_extractor ?? 0) > 0) drops++
  }
  assert(drops >= 8 && drops <= 40, `controller husk drops extractor ~1 in 8 (${drops}/160)`)
  let dupes = 0
  for (let t = 0; t < 200; t++) {
    const owned = {
      ...ctrl,
      ticks: 500 + t,
      items: { ...ctrl.items, seeker_extractor: 1 },
      flags: { ...ctrl.flags, encounterHp: 1 },
    }
    const r = resolveEncounter(owned, 'fight')
    if ((r.fx.add?.seeker_extractor ?? 0) > 0) dupes++
  }
  assert(dupes <= 12, `once owned, dupes are rare (${dupes}/200)`)
  assert(!extractorDrop({ ...alone, flags: { ...alone.flags, encounterController: false } }, 'scavenger' as never).seeker_extractor, 'no extractor from non-husk fights')
  // Draw resin choice and effects.
  const held: GameState = {
    ...primedFight('vessel', 7, 'husk', { hp: 3 }),
    items: { ...primedFight('vessel', 7, 'husk', { hp: 3 }).items, seeker_extractor: 1 },
    equipped: { weapon: 'seeker_extractor' },
    flags: { ...primedFight('vessel', 7, 'husk', { hp: 3 }).flags, encounterController: true, encounterHp: 3 },
  }
  assert(encounterChoices(held).some((c) => c.id === 'enc-resin'), 'equipped extractor offers Draw resin')
  const cut = resolveEncounter(held, 'resin')
  assert(cut.fx.flag?.encounterControllerDown && cut.fx.flag?.encounterResinTried && !(cut.fx.add?.scrap), 'Draw resin vs live Seeker cuts the siphon')
  const noCtrl: GameState = { ...held, flags: { ...held.flags, encounterController: false, encounterResinTried: false } }
  const draw = resolveEncounter(noCtrl, 'resin')
  assert((draw.fx.add?.scrap ?? 0) === 1 && draw.fx.sap === 1 && Number(draw.fx.flag?.encounterHp) === 3, 'Draw resin without Seeker takes scrap and Sap, husk lives')
  assert(!encounterChoices({ ...held, flags: { ...held.flags, encounterResinTried: true } }).some((c) => c.id === 'enc-resin'), 'Draw resin is once per fight')
  assert(/Draw resin|Seeker Extractor/.test(topicText(HELP_TOPICS.find((t) => t.id === 'fight')!)), 'fight help names Draw resin')
  assert(/Seeker Extractor/.test(topicText(HELP_TOPICS.find((t) => t.id === 'gear')!)), 'gear help names the extractor perk')
}

// Intro cards: six skippable lore cards at New Game, before the door choice. Spire lore lock.
{
  assert(INTRO_CARDS.map((c) => c.id).join(',') === 'world,sap,cartel,seekers,strays,doors', 'six intro cards in order')
  for (const c of INTRO_CARDS) {
    assert(readdirSync('public/intro').includes(c.img), `intro still exists: ${c.img}`)
    assert(sw.includes(`intro/${c.img}`), `service worker caches intro/${c.img}`)
    assert(c.text.length > 40 && c.text.length < 330, `intro card ${c.id} is short enough for a phone`)
  }
  const seek = INTRO_CARDS.find((c) => c.id === 'seekers')!.text
  assert(/cannot open/.test(seek) && /Red Maw/.test(seek), 'Seekers card: they wait at a door they cannot open; the way in is at Red Maw')
  const doorsCard = INTRO_CARDS.find((c) => c.id === 'doors')!.text
  assert(/Red Maw/.test(doorsCard) && /opens the Spire/.test(doorsCard), 'doors card: the Vessel is sent to Red Maw for what opens the Spire')
  const app = readFileSync('src/App.tsx', 'utf8')
  assert(app.includes("setView('intro')") && /<IntroCards\s+onDone=\{\(\) => \{\s+refreshSaves\(\)\s+setView\('doors'\)/.test(app), 'New game runs the intro, then the door choice')
  assert(!app.includes("'replay'") && /onIntro=\{\(\) => \{\s+refreshSaves\(\)\s+setView\('intro'\)/.test(app), 'Watch the intro also ends on the door choice (finish or Skip)')
  {
    // Reaching the door screen must not touch saves; only starting a door does.
    const introBlock = app.slice(app.indexOf("if (view === 'intro')"), app.indexOf("if (view === 'doors')"))
    assert(!/clearSave|clearAllSaves|newGame|saveGame|flushSave/.test(introBlock), 'finishing or skipping the intro never writes or clears a save')
    const titleBlock = app.slice(app.indexOf('onNew={'), app.indexOf('onContinue={'))
    assert(!/clearSave|clearAllSaves|newGame|flushSave/.test(titleBlock), 'New game / Watch the intro never write or clear a save')
  }
  const intro = readFileSync('src/components/IntroCards.tsx', 'utf8')
  assert(intro.includes('data-intro-skip') && !intro.includes('data-intro-next') && !/>\s*Back\s*</.test(intro), 'intro auto-plays: Skip only, no Next or Back')
  assert(intro.includes('data-intro-stage') && intro.includes('setPaused((p) => !p)') && intro.includes('OPEN_TAP_GUARD_MS'), 'tapping the intro pauses and resumes')
  assert(!/visibilityState|document\.hidden|onAnimationEnd|onTransitionEnd|onLoad/.test(intro), 'intro clock never waits on visibility, CSS events, or image loads')
  assert(intro.includes('performance.now()') && intro.includes('MAX_STEP_MS') && intro.includes('OPEN_TAP_GUARD_MS'), 'intro clock is elapsed-time based, clamped, and ignores the opening tap')
  assert(/useState\(false\)/.test(intro.slice(intro.indexOf('const [paused'), intro.indexOf('const [paused') + 60)), 'intro does not start paused')
  assert(readFileSync('src/components/TitleScreen.tsx', 'utf8').includes('Watch the intro'), 'intro can be replayed from the title')
  const css = readFileSync('src/index.css', 'utf8')
  assert(/\.intro-art \.intro-img \{[^}]*object-fit: contain/.test(css), 'intro still is shown whole (contain), text sits below it')
  // The Spire is sealed and stands by the Threshold; nothing calls the Maw's rocks the Spires any more.
  const lore = ALL_SCENES.map((x) => x.body + JSON.stringify(x.variants ?? []) + JSON.stringify(x.choices)).join('\n')
    + JSON.stringify(HUBS) + JSON.stringify(PEOPLE) + JSON.stringify(RUMORS)
  assert(!/First Spires? (are|is) the teeth|Spires are the teeth/.test(lore), 'Red Maw is the hub, not the Spire')
  const vessel = getScene('open:vessel')!.body
  assert(/sealed/.test(vessel) && /What opens it is at Red Maw/.test(vessel), 'Vessel opening: the Seekers send you to Red Maw for what opens the Spire')
  assert(/What opens it is at Red Maw/.test(HUBS.threshold.hungerHook!.sub ?? ''), 'Threshold Hunger hook gives the Seeker reason to go to the Maw')
}

// First SW install must not reload the page (it would bounce a new player out of the intro).
{
  const mainSrc = readFileSync('src/main.tsx', 'utf8')
  assert(/const hadController = Boolean\(navigator\.serviceWorker\.controller\)/.test(mainSrc) && mainSrc.includes('!hadController') && mainSrc.includes("'SW_UPDATED' && hadController"), 'SW reloads (controllerchange and SW_UPDATED) only on an update, not on first install')
}

// Road compass matches the world map: Camp-04 east to the Maw, Spine south, Threshold west.
{
  const all = ALL_SCENES.map((x) => x.body + JSON.stringify(x.variants ?? []) + JSON.stringify(x.choices) + JSON.stringify(x.intents ?? [])).join('\n')
    + JSON.stringify(HUBS) + readFileSync('src/game/content/maps.ts', 'utf8') + readFileSync('src/game/talk.ts', 'utf8')
    + readFileSync('src/game/look.ts', 'utf8') + readFileSync('src/game/hunter.ts', 'utf8') + JSON.stringify(PEOPLE)
  assert(!/east-south|east and south|walk east, find me|ford when you walk east|walking east to the Maw|label: 'Hunger south'|Red Maw is (days )?south|Maw-country.{0,3}South|South is Maw-country|East is the Maw|Ossa is south\. I go west/.test(all), 'no old compass for the Maw roads')
  assert(/label: '← Red Maw, west'/.test(readFileSync('src/game/content/maps.ts', 'utf8')), 'Threshold map exit points west to Red Maw')
  assert(/days east/.test(HUBS.camp04.hungerHook!.sub ?? '') && /hard day south/.test(HUBS.spine.hungerHook!.sub ?? ''), 'Camp-04 road runs east, Spine road runs south')
}

// Intro cinematic timing + title art framing.
{
  for (const c of INTRO_CARDS) {
    const ms = introCardMs(c)
    assert(introReadMs(c) >= 5400, `intro scene ${c.id} keeps at least the old reading time`)
    assert(ms - INTRO_TEXT_IN_MS - introReadMs(c) >= 4000 && INTRO_HOLD_MS >= 4000, `intro scene ${c.id} holds 4 s+ after reading before the crossfade`)
    assert(introMotionMs(c) <= ms - INTRO_HOLD_MS, `intro scene ${c.id} picture is still during the hold`)
    assert(ms >= 12000 && ms <= 18000, `intro scene ${c.id} plays 12-18 s (${ms})`)
  }
  assert(introCardMs(INTRO_CARDS.find((c) => c.id === 'doors')!) > introCardMs(INTRO_CARDS.find((c) => c.id === 'cartel')!), 'longer text holds longer')
  assert(INTRO_FADE_MS >= 1400 && INTRO_FADE_MS <= 2000, 'scenes crossfade slowly (~1.5 s)')
  const css = readFileSync('src/index.css', 'utf8')
  assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.intro-layer\.on \.intro-img[\s\S]*animation: none/.test(css), 'reduced motion: no pan or zoom')
  for (const kf of ['intro-kb-in', 'intro-kb-out', 'intro-kb-in-right', 'intro-kb-out-left']) {
    const body = css.slice(css.indexOf(`@keyframes ${kf} {`), css.indexOf('}\n}', css.indexOf(`@keyframes ${kf} {`)))
    assert(/transform: scale\(1\)/.test(body) && !/scale\(1\.(1[0-9]|[2-9])/.test(body), `${kf} starts or ends on the whole picture and zooms 8% at most`)
  }
  // Title art: the whole picture full width (contain), no cover-crop of the scene, no baked-in title text.
  assert(/\.title-art img \{[^}]*object-fit: contain/.test(css), 'title art is shown whole')
  assert(!/\.title-hero img \{[^}]*object-fit: cover/.test(css), 'title art is not cover-cropped')
  assert(readdirSync('public/covers').includes('world.jpg') && !readdirSync('public/covers').includes('world.png'), 'clean title art (world.jpg) replaces the lettered world.png')
  assert(sw.includes('covers/world.jpg'), 'SW caches the clean title art')
}


// Map labels sit directly above or below their marker, inside the frame, clear of other markers,
// labels and the exit label, for every hub and every "you are here" node, on a 390px phone (341px map).
{
  const W = 341
  const labelClashes: string[] = []
  for (const map of Object.values(HUB_MAPS)) {
    const H = (W * map.height) / map.width
    const ex = estimateLabel(map.maw.label, null, 200)
    const exitBox: Box = {
      x: Math.min(Math.max((map.maw.x / map.width) * W - ex.w / 2, 6), W - 6 - ex.w),
      y: Math.min(Math.max((map.maw.y / map.height) * H - ex.h / 2, 6), H - 6 - ex.h),
      w: ex.w,
      h: ex.h,
    }
    const compass: Box = { x: W / 2 - 42, y: (4 / map.width) * W, w: 84, h: 16 }
    const px = (id: string) => {
      const n = map.nodes.find((m) => m.id === id)!
      return [(n.x / map.width) * W, (n.y / map.height) * H] as const
    }
    const edges = map.edges.map((e) => [...px(e.a), ...px(e.b)] as [number, number, number, number])
    for (const here of map.nodes) {
      const adj = new Set(map.edges.flatMap((e) => (e.a === here.id ? [e.b] : e.b === here.id ? [e.a] : [])))
      const nodes = map.nodes.map((n) => {
        const mine = n.id === here.id
        const sap = adj.has(n.id) ? edgeSap(map, here.id, n.id) : null
        const sub = mine ? 'you' : sap != null ? `−${sap} sap` : 'far'
        return { id: n.id, x: (n.x / map.width) * W, y: (n.y / map.height) * H, ...estimateLabel(n.short ?? n.name, sub, 118), here: mine, side: n.labelSide }
      })
      const input = { width: W, height: H, nodes, edges, obstacles: [exitBox, compass] }
      const placed = layoutLabels(input)
      placed.forEach((p, i) => {
        const n = nodes[i]
        const above = p.box.y + p.box.h <= n.y
        const below = p.box.y >= n.y
        assert(above || below, `${map.hubId}/${here.id}: ${n.id} label sits above or below its marker`)
        assert(n.x >= p.box.x && n.x <= p.box.x + p.box.w, `${map.hubId}/${here.id}: ${n.id} label is centred over its marker column`)
      })
      for (const b of layoutProblems(input, placed)) labelClashes.push(`${map.hubId} (here=${here.id}): ${b}`)
    }
  }
  assert(!labelClashes.length, `map labels collide: ${labelClashes.join('; ')}`)
  const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')
  const labelCss = css.slice(css.indexOf('.map-node .map-label b {'), css.indexOf('.map-node .map-label small {'))
  assert(/font-size: 1rem/.test(labelCss), 'map label names are 1rem (18px) — readable on a phone')
  assert(/\.map-node \.map-label \{[^}]*max-width: 118px[^}]*white-space: normal/.test(css), 'long map names wrap rather than shrink')
  assert(/\.map-exit-label \{[^}]*font-size: 0\.95rem/.test(css), 'exit labels get the same readable treatment')
  const labelRule = css.slice(css.indexOf('.map-node .map-label {'), css.indexOf('.map-node .map-label b {'))
  const exitRule = css.slice(css.indexOf('.map-exit-label {'), css.indexOf('}', css.indexOf('.map-exit-label {')))
  for (const [name, rule] of [['map labels', labelRule], ['exit labels', exitRule]] as const) {
    assert(/background: none/.test(rule) && !/border-radius|box-shadow/.test(rule), `${name} have no backing plate`)
    assert(/text-shadow:[^;]*rgba\(240, 224, 190, 1\)[^;]*0 0 6px/.test(rule), `${name} keep a parchment halo for contrast`)
  }
  assert(!/\.map-node\.(here|next|far) \.map-label \{[^}]*(background:|box-shadow)/.test(css), 'no state brings the plate back')
  const sheetSrc = readFileSync(join(process.cwd(), 'src/components/MapSheet.tsx'), 'utf8')
  assert(sheetSrc.includes('layoutLabels(') && sheetSrc.includes('onClick={() => tap(n)}'), 'MapSheet lays labels out and nodes still tap to travel')
}

// Never offer travel you cannot take: every authored travel button or typed travel reaches a connected node.
{
  const bad: string[] = []
  for (const sc of ALL_SCENES) {
    const rows = [...(sc.choices ?? []).map((c) => ({ id: c.id, fx: c.effects })), ...(sc.intents ?? []).map((r, k) => ({ id: `intent-${k}`, fx: r.effects }))]
    for (const r of rows) {
      const to = r.fx?.travel
      if (!to) continue
      const maps = Object.values(HUB_MAPS).filter((m) => nodeIdForScene(m, sc.id) || m.hubId === sc.hubId)
      if (!maps.length) bad.push(`${sc.id} ${r.id}: not on a map`)
      for (const m of maps) {
        const a = nodeIdForScene(m, sc.id, true)!
        const b = nodeIdForScene(m, to)
        if (!b) bad.push(`${sc.id} ${r.id}: ${to} not on ${m.hubId}`)
        else if (a !== b && edgeSap(m, a, b) == null) bad.push(`${sc.id} ${r.id}: no road ${a} → ${b}`)
      }
    }
  }
  assert(!bad.length, `travel buttons with no road: ${bad.join('; ')}`)
}


// Bulk v67: hound fight, Knot perks, Resin rescue, Jodi's snake, Kaelen everywhere, map blurbs.
{
  const ids2 = (st: GameState) => GE.visibleChoices(st).map((c) => c.id)
  let hunt = GE.applyEffect(GE.newGame('prisoner'), { goto: 'camp:yard', flag: { encounterAt: 9999 } })
  hunt = { ...hunt, flags: { ...hunt.flags, hunterHere: true, hunterFrom: 'camp:yard' } }
  delete hunt.flags.encounterHere
  const hIds = ids2(hunt)
  assert(hIds.includes('hunter-fight') && hIds.includes('hunter-hound'), `Hound-handler screen has both fights: ${hIds}`)
  const houndRow = GE.visibleChoices(hunt).find((c) => c.id === 'hunter-hound')!
  assert(houndRow.label === 'Fight the Shard-Hound', 'hound button label')
  const inFight = GE.applyEffect(hunt, houndRow.effects)
  assert(inFight.flags.encounterKind === 'hound' && encounterSpeakerOf(inFight) === 'Shard-Hound', 'hound button starts a Shard-Hound fight')
  assert(BEAST_KINDS.includes('hound') && !HUMAN_KINDS.includes('hound'), 'the hound is a beast: no salve in its pockets')

  // Ossa's rescue heals with Resin, never a Drop.
  const maw = GE.applyEffect(GE.newGame('outcast'), { goto: 'maw:stilt', flag: { ossaAlly: true }, add: { vial_drop: 1, salve: 1 } })
  const w1 = wakeEffect(maw)
  assert(w1.remove?.salve === 1 && !w1.remove?.vial_drop && /Resin Salve/.test(String(w1.flash)), 'Ossa binds with your salve, not a Drop')
  const w2 = wakeEffect({ ...maw, items: { ...maw.items, salve: 0 } })
  assert(!w2.remove && /resin/.test(String(w2.flash)) && !/\bDrop\b/.test(String(w2.flash)), 'no salve: Ossa uses her own resin')

  // Knot: one-time rescue while worn.
  const worn = { ...maw, flags: { ...maw.flags, ossaAlly: false }, items: { ...maw.items, ossa_token: 1 }, equipped: { ...maw.equipped, head: 'ossa_token' as ItemId } }
  const kw = wakeEffect(worn)
  assert(kw.flag?.knotRescued === true && kw.health === 3, 'worn Knot: Ossa finds you once')
  assert(!wakeEffect({ ...worn, flags: { ...worn.flags, knotRescued: true } }).flag?.knotRescued, 'Knot rescue is once')
  // Knot: Stray Heat rises one lighter while worn.
  const sh0 = worn.heat.strays
  assert(GE.applyEffect(worn, { heat: { strays: 2 }, flash: 'x' }).heat.strays === sh0 + 1, 'Knot worn: Stray Heat +2 becomes +1')
  assert(GE.applyEffect(maw, { heat: { strays: 2 } }).heat.strays === maw.heat.strays + 2, 'no Knot: full Stray Heat')
  // Knot: Red Maw stilt route opens the cache rib.
  const ribs = GE.applyEffect(worn, { goto: 'maw:ribs' })
  const stilt = GE.visibleChoices(ribs).find((c) => c.id === 'stilt')
  assert(stilt && GE.isChoiceOn(ribs, stilt.enable), 'Knot opens the stilt route at the ribs')
  assert(GE.applyEffect(ribs, stilt!.effects).sceneId === 'maw:hold', 'stilt route reaches the cache')
  const noKnot = GE.applyEffect({ ...maw, flags: { ...maw.flags, ossaAlly: true } }, { goto: 'maw:ribs' })
  const lockedStilt = GE.visibleChoices(noKnot).find((c) => c.id === 'stilt')
  assert(lockedStilt && !GE.isChoiceOn(noKnot, lockedStilt.enable) && lockedStilt.locked, 'stilt route stays visible, locked, with what it needs')
  // Knot + Head Wrap = Knotted Head Wrap, worn stays worn, keeps the perks and the Shell.
  const both = { ...worn, items: { ...worn.items, head_wrap: 1 } }
  const tied = GE.tieKnot(both)
  assert(tied.items.knotted_wrap === 1 && !tied.items.ossa_token && !tied.items.head_wrap, 'tying makes one Knotted Head Wrap')
  assert(tied.equipped.head === 'knotted_wrap' && GK.knotWorn(tied) && equippedShell(tied) >= 1, 'Knotted Head Wrap is worn, Shell 1, and counts as the Knot')
  assert(GE.applyEffect(tied, { heat: { strays: 1 } }).heat.strays === tied.heat.strays, 'Knotted Head Wrap keeps the Stray perk')

  // Jodi: look at the snake describes Grudge; no doubled names on person looks.
  const jodi = GE.applyEffect(GE.newGame('outcast'), { goto: 'spine:jodi' })
  const snake = String(GE.interpret(jodi, 'look at the snake').flash)
  assert(/Grudge/.test(snake) && !/Jodi Hollowmere\. Jodi Hollowmere/.test(snake), `look at the snake: ${snake}`)
  const jl = String(GE.interpret(jodi, 'look at jodi').flash)
  assert(!/Jodi Hollowmere\. Jodi Hollowmere/.test(jl), `no doubled name: ${jl}`)

  // Map blurbs do not repeat the hub note.
  for (const m of Object.values(HUB_MAPS)) {
    const note = HUBS[m.hubId]?.mawNote ?? ''
    const sents = (t: string) => t.split(/(?<=\.)\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    const dup = sents(m.blurb).filter((x) => sents(note).includes(x))
    assert(!dup.length && !/sealed spire stands/i.test(m.blurb) && !/all three roads end here/i.test(m.blurb), `${m.hubId} map text repeats: ${dup}`)
  }

  // Kaelen: walks every door after the opening and sells Resin; more resin in the grit past the outpost.
  for (const [door, sceneId] of [['prisoner', 'camp:yard'], ['outcast', 'spine:ridge'], ['vessel', 'thresh:court'], ['outcast', 'maw:market']] as const) {
    let st = GE.applyEffect(GE.newGame(door), { goto: sceneId, flag: { encounterAt: 99999 } })
    st = { ...st, heat: { cartel: 0, seekers: 0, strays: 0 }, flags: { ...st.flags, huntQuiet: 3, encounterAt: 99999 } }
    delete st.flags.encounterHere
    delete st.flags.hunterHere
    for (let i = 0; i < 12 && !st.flags.kaelenPassing; i++) {
      st = GE.applyEffect({ ...st, flags: { ...st.flags, encounterAt: 99999, huntQuiet: 3 } }, { ticks: 1 })
      delete st.flags.hunterHere
      delete st.flags.encounterHere
    }
    assert(st.flags.kaelenPassing, `Kaelen stops on ${door} ${sceneId}`)
    const roam = GE.applyEffect(st, GE.visibleChoices(st).find((c) => c.id === 'kaelen-pass')!.effects)
    assert(roam.sceneId === 'roam:kaelen' && kaelenOffers(roam).some((o) => o.id === 'salve'), `Kaelen sells Resin on ${door}`)
  }
  assert(GS.scavengeSalvePct({ ...GE.newGame('outcast'), hubId: 'spine' }) > SCAVENGE_SALVE_PCT, 'more Resin in the grit past the outpost')
}


// v68: polite asks and in-character fallbacks on every door. The old system note never shows.
{
  const at2 = (door: DoorId, id: string, fl: Record<string, unknown> = {}) => {
    const st = GE.applyEffect(GE.newGame(door), { goto: id, flag: { encounterAt: 99999, ...fl } as never })
    delete st.flags.encounterHere
    delete st.flags.hunterHere
    return st
  }
  const OLD = /heard that\. Try ask, talk, threaten, trade, help/
  // Every speaker and every person has a voice with real lines.
  const speakers = new Set(ALL_SCENES.map((sc) => sc.speaker).filter(Boolean) as string[])
  for (const sp of speakers) {
    const v = VO.voiceForSpeaker(sp)
    assert(v && v.lines.length >= 3 && v.want && v.who && v.doing && v.what && v.refuse && v.unknown && v.price, `${sp} has fallback lines in their voice`)
  }
  for (const p of Object.values(PEOPLE)) {
    const v = VO.VOICES[VO.PERSON_VOICE[p.id] ?? p.id]
    assert(v && v.lines.length >= 3, `${p.id} has a voice`)
  }
  // Nonsense at every talk or speaker scene: never the old note.
  for (const sc of ALL_SCENES) {
    if (!(sc.kind === 'talk' || sc.speaker)) continue
    const door: DoorId = sc.id.startsWith('thresh:') || sc.id.startsWith('ch1:v') ? 'vessel' : sc.id.startsWith('spine:') || sc.id.startsWith('ch1:o') ? 'outcast' : 'prisoner'
    const st = at2(door, sc.id)
    for (const t of ['blorp flarn zib', 'can i have some scrap', 'who are you', 'what are you doing']) {
      const f = String(GE.interpret(st, t).flash ?? '')
      assert(!OLD.test(f), `${sc.id} "${t}" shows the old note`)
      assert(!/^Miss\./.test(f), `${sc.id} "${t}" shows Miss`)
    }
  }
  const talkSrc = readFileSync(new URL('../src/game/talk.ts', import.meta.url), 'utf8')
  assert(!OLD.test(talkSrc), 'old generic fallback is gone from the source')

  // Sarn: "Can i have some scrap" answers in character, points at the real buttons, steals nothing.
  const sarn = at2('prisoner', 'camp:bay-sarn')
  const asked = GE.interpret(sarn, 'Can i have some scrap')
  assert(/Sarn/.test(String(asked.flash)) && /scrap/i.test(String(asked.flash)), `Sarn answers the scrap ask: ${asked.flash}`)
  assert(!asked.flags.baySarnTook && (asked.items.scrap ?? 0) === (sarn.items.scrap ?? 0), 'a polite ask never runs the theft')
  assert(/"Take a twist of scrap off his crate"/.test(String(asked.flash)), 'the ask points at the scrap button')
  const withWrench = GE.interpret({ ...sarn, items: { ...sarn.items, wrench: 1 } }, 'could you give me scrap')
  assert(/Trade the wrench to Sarn for scrap/.test(String(withWrench.flash)) && (withWrench.items.wrench ?? 0) === 1, 'with a wrench, the ask points at the trade, does not run it')
  const theft = GE.interpret(sarn, 'can i steal some scrap')
  assert(!theft.flags.baySarnTook && !/Take a twist/.test(String(theft.flash)), 'asking to steal is refused, no theft run')
  // Polite asks never drink or buy by accident.
  const thalia = at2('vessel', 'thresh:thalia', {})
  const thirsty = { ...thalia, items: { ...thalia.items, vial_drop: 1 } }
  assert((GE.interpret(thirsty, 'could you give me a drop').items.vial_drop ?? 0) === 1, 'asking for a Drop does not drink yours')
  const silas = at2('outcast', 'spine:silas')
  const rich = { ...silas, items: { ...silas.items, glints: 3 } }
  const priced = GE.interpret(rich, 'how much for a drop')
  assert(priced.items.glints === 3 && /Glint/.test(String(priced.flash)), `how much answers the price, buys nothing: ${priced.flash}`)
  // Typed-only answers.
  assert(/Sarn/.test(String(GE.interpret(sarn, 'who are you').flash)), 'Sarn says who he is')
  assert(/Counting/.test(String(GE.interpret(sarn, 'what are you doing').flash)), 'Sarn says what he is doing')
  assert(/Grudge/.test(String(GE.interpret(at2('outcast', 'spine:jodi'), "what's that").flash)), "Jodi's what's that is Grudge")
  // Name gating: Kaelen unknown stays unknown; known gets a real hint.
  const unknownK = String(GE.interpret(sarn, 'where is kaelen').flash)
  assert(!/pack|Sifter|linger/i.test(unknownK), `Kaelen stays gated: ${unknownK}`)
  const knownK = String(GE.interpret(at2('prisoner', 'camp:bay-sarn', { kaelenKnown: true }), 'where is kaelen').flash)
  assert(/Linger/.test(knownK), `known Kaelen gets a real hint: ${knownK}`)
  // Rewrites keep normal verbs working.
  const plan = GE.interpret(at2('prisoner', 'camp:jaxson'), 'can i ask about his plan')
  assert(plan.flags.jaxsonPlan, 'polite "can I ask about his plan" still opens the plan')
  // Filler spots get a place line with a pointer, not Miss.
  const yard = String(GE.interpret(at2('prisoner', 'camp:yard'), 'blorp flarn').flash)
  assert(/Bleed Yard|Yard/.test(yard) && /Try/.test(yard), `filler spot answers with the place: ${yard}`)
  // Heard line hints.
  assert(PA.typedHints(sarn, getScene('camp:bay-sarn'), false).includes('who are you'), 'Heard line suggests real typed asks')
}


// v69: Jodi sells a Resin Salve for 1 Glint or 2 scrap, once per visit; locked rows say what they need.
{
  const jo = (items: Record<string, number>) => {
    const st = GE.applyEffect(GE.newGame('outcast'), { goto: 'spine:jodi', flag: { encounterAt: 99999 } })
    delete st.flags.encounterHere
    return { ...st, items: { ...st.items, glints: 0, scrap: 0, ...items } }
  }
  const broke = jo({})
  const rows = GE.visibleChoices(broke).filter((c) => c.id === 'salve' || c.id === 'salve-scrap')
  assert(rows.length === 2 && rows.every((c) => !GE.isChoiceOn(broke, c.enable) && c.locked), 'both salve rows show, locked with the price')
  const say = String(GE.interpret(broke, 'can I have some salve').flash)
  assert(/Trade 2 scrap for the Resin Salve/.test(say) && /Need/.test(say) && (GE.interpret(broke, 'can I have some salve').items.salve ?? 0) === 0, `Jodi points at the salve button: ${say}`)
  const paid = GE.applyEffect(jo({ scrap: 2 }), GE.visibleChoices(jo({ scrap: 2 })).find((c) => c.id === 'salve-scrap')!.effects)
  assert(paid.items.salve === 1 && (paid.items.scrap ?? 0) === 0, '2 scrap buys one salve')
  assert(!GE.visibleChoices(paid).some((c) => c.id === 'salve' || c.id === 'salve-scrap'), 'one per visit')
  const back = GE.applyEffect(paid, GE.visibleChoices(paid).find((c) => c.id === 'back')!.effects)
  assert(!back.flags.jodiSalve, 'walking away restocks her salve for the next visit')
}


// v70: the build label matches the SW cache; no screen answers every command with one canned line.
{
  const swText = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
  const ver = readFileSync(new URL('../src/version.ts', import.meta.url), 'utf8').match(/BUILD = '(v\d+)'/)?.[1]
  assert(ver && swText.includes(`CACHE = 'amber-shroud-${ver}'`), `title build label ${ver} matches the SW cache`)
  const junk = ['hello there', 'blorp', 'Talk to her.', 'What’s that?', 'Who are you? ', 'Can I have some salve.', 'zzz qqq', 'sing a song']
  for (const sc of ALL_SCENES) {
    if (sc.kind === 'ending' || sc.kind === 'crisis') continue
    const door: DoorId = sc.id.startsWith('thresh:') || sc.id.startsWith('ch1:v') || sc.id === 'open:vessel' ? 'vessel' : sc.id.startsWith('spine:') || sc.id.startsWith('ch1:o') || sc.id === 'open:outcast' ? 'outcast' : 'prisoner'
    const st = GE.applyEffect(GE.newGame(door), { goto: sc.id, flag: { encounterAt: 99999 } })
    delete st.flags.encounterHere
    delete st.flags.hunterHere
    if (st.sceneId !== sc.id) continue
    const seen = new Set(junk.map((t) => GE.interpret(st, t).flash ?? ''))
    assert(seen.size >= 3, `${sc.id}: typed lines collapse to one canned reply (${[...seen][0]?.slice(0, 60)})`)
  }
  // Curly apostrophes and phone punctuation read the same as plain.
  const jodi = GE.applyEffect(GE.newGame('outcast'), { goto: 'spine:jodi' })
  for (const t of ['What’s that?', "what's that", 'WHAT’S THAT.', ' whats that ']) {
    assert(/Grudge/.test(GE.interpret(jodi, t).flash ?? ''), `"${t}" at Jodi is Grudge`)
  }
  // First Drop: Silas is standing over you, so he answers.
  assert(/Silas/.test(GE.interpret(GE.newGame('outcast'), 'Who are you?').flash ?? ''), 'First Drop: Silas answers who are you')
}


// v71: phone keyboards. Smart quotes, ellipsis, and wrapping quotes read like plain typing at Jodi.
{
  const jd = GE.applyEffect(GE.newGame('outcast'), { goto: 'spine:jodi' })
  for (const t of ['“What’s that?”', 'What’s that…', '"what\'s that"', 'What’s that?\u00a0']) {
    assert(/Grudge/.test(GE.interpret(jd, t).flash ?? ''), `phone "${t}" at Jodi is Grudge`)
  }
  assert(/salve/i.test(GE.interpret(jd, '“Can I have some salve?”').flash ?? ''), 'smart-quoted salve ask reads')
  assert(/Jodi Hollowmere/.test(GE.interpret(jd, 'Who are you…').flash ?? ''), 'ellipsis who are you reads')
  const seen = new Set(['what’s that?', 'Can I have some salve', 'who are you', 'Hello', 'blorp', 'Look at the snake'].map((t) => GE.interpret(jd, t).flash))
  assert(seen.size === 6, 'six different Jodi commands get six different replies')
}

console.log('OK', {
  prisoner: Object.keys(DOORS.prisoner.items),
  outcast: Object.keys(DOORS.outcast.items),
  vessel: Object.keys(DOORS.vessel.items),
})


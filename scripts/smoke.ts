import {
  applyEffect,
  bodyOf,
  interpret,
  newGame,
  sceneOf,
  travelTo,
  visibleChoices,
} from '../src/game/engine.ts'
import { DOORS } from '../src/game/content/catalog.ts'
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

const prisoner = DOORS.prisoner
const outcast = DOORS.outcast
const vessel = DOORS.vessel

assert(prisoner.items.wrench === 1 && prisoner.items.scrip === 2, 'prisoner kit: wrench + scrip')
assert(prisoner.items.vial_drop === 1 && prisoner.items.scrap === 1, 'prisoner kit: drop + scrap')
assert(!prisoner.items.silas_tip && !prisoner.items.oram_map && !prisoner.items.rusted_dagger, 'prisoner kit unique')
assert(prisoner.heat.cartel === 3, 'prisoner cartel heat')

assert(outcast.items.vial_empty === 1 && outcast.items.silas_tip === 1, 'outcast kit: empty vial + silas tip')
assert(!outcast.items.wrench && !outcast.items.scrip && !outcast.items.oram_map, 'outcast kit unique')
assert(outcast.sap === 2, 'outcast sap is thin')
assert(outcast.heat.strays === 2, 'outcast stray lean')

assert(vessel.items.rusted_dagger === 1 && vessel.items.oram_map === 1, 'vessel kit: dagger + oram map')
assert(vessel.items.ceremonial_cloth === 1 && vessel.items.vial_drop === 1, 'vessel cloth + drop')
assert(!vessel.items.wrench && !vessel.items.silas_tip, 'vessel kit unique')
assert(vessel.heat.seekers === 3, 'vessel seeker pressure')

let s = newGame('prisoner')
assert(s.items.wrench === 1 && s.items.scrip === 2, 'newGame copies prisoner kit')
s = pick(s, 'crawl')
assert(s.hubId === 'camp04' && s.sap === 4, 'prisoner hub')
s = travelTo(s, 'camp:vats')
assert(ids(s).includes('wrench'), 'vat wrench path')
s = pick(s, 'wrench')
assert(s.items.vial_drop === 2, 'wrench vat extra drop, no extra heat')
assert(s.heat.cartel === 3, 'quiet wrench does not add cartel heat')

s = newGame('prisoner')
s = pick(s, 'crawl')
s = travelTo(s, 'camp:lean')
s = interpret(s, 'ask about kallik cache red maw')
s = pick(s, 'scrip')
assert(s.flags.hungerKnown, 'scrip buys heading')
assert((s.items.scrip ?? 0) === 1, 'scrip consumed')
assert(s.heat.cartel === 4, 'scrip trail raises cartel heat')

s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
assert(s.sceneId === 'ch1:trail', 'beat 1 trail')
assert(ids(s).includes('wrench'), 'cache run wrench branch')
assert(!ids(s).includes('silas'), 'prisoner has no silas cut')
s = pick(s, 'wrench')
assert(s.flags.wrenchCut, 'wrench cut flag')
assert(s.heat.cartel === 5, 'wrench culvert bruises cartel heat')
assert(ids(s).includes('wrench'), 'ossa wrench lash')
s = pick(s, 'wrench')
assert(s.flags.ossaAlly, 'wrench lash allies Ossa')
assert(s.sceneId === 'ch1:zafir', 'beat 3 zafir')
assert(ids(s).includes('scrip'), 'zafir takes scrip')
s = pick(s, 'scrap')
assert(s.sceneId === 'ch1:sybella', 'hard choice')
assert(ids(s).includes('false'), 'false trail available via wrench leftover or ossa')
assert(ids(s).includes('hollow'), 'hollow bait via remaining kit')
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
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
s = pick(s, 'go')
s = pick(s, 'silas')
assert(ids(s).includes('vial'), 'empty vial still a verb if unfilled')
s = pick(s, 'vial')
assert(s.flags.ossaAlly && s.flags.emptyShown, 'empty-vial honesty allies Ossa')

s = newGame('vessel')
s = pick(s, 'keep')
assert(s.hubId === 'threshold')
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
s = pick(s, 'crawl')
s = applyEffect(s, { sap: -8, goto: 'camp:yard' })
assert(sceneOf(s).kind === 'crisis', 'empty sap is authored crisis')
assert(s.sceneId === 'crisis:camp')

console.log('OK', {
  prisoner: Object.keys(DOORS.prisoner.items),
  outcast: Object.keys(DOORS.outcast.items),
  vessel: Object.keys(DOORS.vessel.items),
})

void (['prisoner', 'outcast', 'vessel'] as DoorId[])

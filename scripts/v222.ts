/** v222: Chapter 3 Barrow Trails map, fog, story gates, and the Alpha Siphon cache. */
import { readFileSync } from 'node:fs'
import { applyEffect, isChoiceOn, newGame, scavenge, travelTo, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import {
  BARROW_BYPASS_LOCK,
  BARROW_CACHE_SCENES,
  BARROW_CARTEL_2,
  BARROW_CARTEL_3,
  BARROW_EMPTY,
  BARROW_HEAT_DOWN_2,
  BARROW_POP_SUB,
  BARROW_SAP_2,
  BARROW_SCRAP_3,
  BARROW_SCRAP_4,
  barrowLootKey,
} from '../src/game/heatRelief.ts'
import { effectPills } from '../src/game/kit.ts'
import { drawnMap, edgeSap, seenOf } from '../src/game/map.ts'
import { canScavenge } from '../src/game/scavenge.ts'
import { ROAD_NOT_NOW } from '../src/game/returnRoad.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v227'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v227'"), 'build v222')
for (const f of ['ch3-trench.jpg', 'ch3-relay.jpg', 'ch3-siphon.jpg']) {
  ok(readFileSync('public/sw.js', 'utf8').includes(`covers/${f}`), `sw precaches ${f}`)
}

const map = HUB_MAPS.barrow
ok(map?.ready && map.nodes.length === 8 && map.edges.length === 7, 'barrow map has the trail and the siphon spur')
for (const e of map.edges) ok(e.sap === 1 && !e.oneWay && edgeSap(map, e.a, e.b) === 1 && edgeSap(map, e.b, e.a) === 1, `${e.a}-${e.b} costs 1 Sap both ways`)

const BODIES: Record<string, string> = {
  'ch3:trench': 'The earth gives way to a massive industrial gash. Heavy iron screens and severed conduit lines lie choked under drifts of amber grit. Wind whistles hollowly through the open pipe ends.',
  'ch3:relay': 'A buried junction chamber exposed by centuries of erosion. Stagnant runoff laps against brass-capped conduits, and a dull hum vibrates through the damp stone floor.',
  'ch3:siphon': 'A high-pressure bypass tap clamped directly into the main conduit line. Raw Sap beads like heavy oil along the valves, smelling sharply of ozone and old metal.',
}
for (const [id, body] of Object.entries(BODIES)) ok(getScene(id).body === body, `${id} body`)

function walk(s: GameState, sceneId: string): GameState {
  const c = visibleChoices(s).find((c) => c.id.startsWith('walk-') && c.effects?.goto === sceneId)
  if (!c) throw new Error(`no walk to ${sceneId} from ${s.sceneId}`)
  return applyEffect(s, c.effects)
}

let s = applyEffect({ ...newGame('prisoner'), sap: 8 }, { goto: 'ch3:capture' })
ok(s.sceneId === 'ch3:capture' && s.hubId === 'barrow' && s.chapterId === 'luminspire', 'capture joins the Barrow hub')
ok([...seenOf(s, 'barrow')].join() === 'capture', 'fog starts with only the Collapsed Threshold Exit')
ok(drawnMap(s)!.nodes.map((n) => n.id).join() === 'capture', 'unwalked places stay off the scrap')
const toTrench = visibleChoices(s).find((c) => c.id === 'walk-trench')
ok(toTrench?.label === 'Walk to Primary Sift Trench' && toTrench.sub === '1 Sap.' && isChoiceOn(s, toTrench.enable), 'neighbor Walk-to is open')

const sap0 = s.sap
s = walk(s, 'ch3:trench')
ok(s.sceneId === 'ch3:trench' && s.sap === sap0 - 1, 'trench costs 1 Sap')
ok(seenOf(s, 'barrow').has('trench'), 'walking reveals the trench')
ok(canScavenge(s) && !visibleChoices(s).some((c) => c.id.startsWith('barrow-')), 'trench is a normal scavenge, not a cache')
s = walk(s, 'ch3:relay')
ok(s.sceneId === 'ch3:relay' && canScavenge(s) && !visibleChoices(s).some((c) => c.id.startsWith('barrow-')), 'relay is a normal scavenge')
const drawn = drawnMap(s)!
ok(drawn.nodes.some((n) => n.id === 'wagon') && !seenOf(s, 'barrow').has('wagon'), 'Citadel Approach is drawn before it can be reached')
const toWagon = visibleChoices(s).find((c) => c.id === 'walk-wagon')
ok(toWagon && !isChoiceOn(s, toWagon.enable) && toWagon.locked === ROAD_NOT_NOW, 'Walk to the Approach is not yet reachable')
const blocked = travelTo(s, 'ch3:wagon')
ok(blocked.sceneId === 'ch3:relay' && blocked.flash === ROAD_NOT_NOW && blocked.sap === s.sap, 'a map tap does not skip the capture')
const forced = applyEffect(s, { sap: -1, goto: 'ch3:wagon' })
ok(forced.sceneId === 'ch3:relay' && forced.flash === ROAD_NOT_NOW && forced.sap === s.sap, 'a paid hop does not skip the capture')

// Story still opens the wagon, and only then does the road.
let story = applyEffect({ ...newGame('prisoner'), sap: 8, items: { scrap: 3, spire_key: 1 } }, { goto: 'ch3:capture' })
story = applyEffect(story, visibleChoices(story).find((c) => c.id === 'fight')!.effects)
ok(story.sceneId === 'ch3:wagon' && story.flags.ch3Stripped && story.sap === 0 && !story.items.spire_key, 'Fight still strips and lands on the wagon')
story = { ...story, sap: 6 }
story = walk(story, 'ch3:relay')
ok(story.sceneId === 'ch3:relay' && story.sap === 5, 'after the strip, the road back costs 1 Sap')
story = walk(story, 'ch3:wagon')
ok(story.sceneId === 'ch3:wagon' && story.flags.ch3Stripped && story.sap === 4, 'the Approach is a walk once the capture is done, and it does not strip again')
const toSupply = visibleChoices(story).find((c) => c.id === 'walk-supply')
ok(toSupply && !isChoiceOn(story, toSupply.enable), 'Supply Wagon is not yet reachable')
ok(travelTo(story, 'ch3:supply').sceneId === 'ch3:wagon', 'map tap cannot skip Slip the Wagon')
story = applyEffect(story, visibleChoices(story).find((c) => c.id === 'slip')!.effects)
ok(story.sceneId === 'ch3:supply' && story.flags.ch3SupplyOpen, 'Slip the Wagon still opens the supply')
story = { ...story, sap: 4 }
story = walk(story, 'ch3:wagon')
ok(story.sceneId === 'ch3:wagon' && story.sap === 3, 'the opened supply road costs 1 Sap')
story = walk(story, 'ch3:supply')
const toTent = visibleChoices(story).find((c) => c.id === 'walk-tent')
ok(toTent && !isChoiceOn(story, toTent.enable), 'Command Tent is not yet reachable')
story = applyEffect(story, visibleChoices(story).find((c) => c.id === 'leave')!.effects)
ok(story.sceneId === 'ch3:tent' && story.flags.ch3TentOpen, 'Leave Now still opens the tent')
const toHaven = visibleChoices({ ...story, sap: 4 }).find((c) => c.id === 'walk-crosshaven')
ok(toHaven && !isChoiceOn(story, toHaven.enable) && travelTo({ ...story, sap: 4 }, 'ch3:crosshaven').sceneId === 'ch3:tent', 'Crosshaven stays behind the vault')
const vaulted = { ...story, sap: 4, flags: { ...story.flags, ch3VaultDone: true } }
ok(isChoiceOn(vaulted, visibleChoices(vaulted).find((c) => c.id === 'go')!.enable), 'the story button still waits on the vault')
const haven = walk(vaulted, 'ch3:crosshaven')
ok(haven.sceneId === 'ch3:crosshaven' && haven.sap === 3, 'after the vault, the fringe costs 1 Sap')

// Siphon spur is a dead end and a high-yield cache.
let side = applyEffect({ ...newGame('prisoner'), sap: 8 }, { goto: 'ch3:capture' })
side = walk(walk(side, 'ch3:trench'), 'ch3:relay')
side = walk(side, 'ch3:siphon')
ok(side.sceneId === 'ch3:siphon' && !canScavenge(side), 'the siphon replaces scavenge')
ok(!visibleChoices(side).some((c) => c.id.startsWith('walk-') && c.effects?.goto !== 'ch3:relay'), 'the siphon is a dead end')
const backOnly = visibleChoices(side).filter((c) => c.id.startsWith('walk-'))
ok(backOnly.length === 1 && backOnly[0].effects.goto === 'ch3:relay' && backOnly[0].sub === '1 Sap.', 'only the relay is a walk back')

const pop = visibleChoices(side).find((c) => c.id === 'barrow-pop')!
ok(pop.sub === BARROW_POP_SUB, 'pop without a wrench keeps the v221 subtitle')
let popped = applyEffect(side, pop.effects)
ok(popped.flash === `${BARROW_SCRAP_3}\n\n${BARROW_CARTEL_2}`, 'pop without wrench lines')
ok((popped.items.scrap ?? 0) === (side.items.scrap ?? 0) + 3 && popped.heat.cartel === side.heat.cartel + 2, 'pop without wrench: Scrap +3, Cartel Heat +2')
ok(visibleChoices(popped).find((c) => c.id === 'barrow-empty')?.label === BARROW_EMPTY, 'one pick empties the cache')
popped = { ...popped, ticks: popped.ticks + 4 }
popped = walk(popped, 'ch3:relay')
popped = walk(popped, 'ch3:siphon')
ok(visibleChoices(popped).find((c) => c.id === 'barrow-empty')?.label === BARROW_EMPTY && !visibleChoices(popped).some((c) => c.id === 'barrow-pop'), 'empty state persists across time and leaving')
const typed = scavenge(popped)
ok(typed.flash === BARROW_EMPTY && (typed.items.scrap ?? 0) === (popped.items.scrap ?? 0), 'typed scavenge does not loot a spent cache')

const held = applyEffect({ ...newGame('prisoner'), sap: 8, items: { wrench: 1 }, equipped: { weapon: 'wrench' } }, { goto: 'ch3:capture' })
let armed = walk(walk(walk(held, 'ch3:trench'), 'ch3:relay'), 'ch3:siphon')
const popW = visibleChoices(armed).find((c) => c.id === 'barrow-pop')!
ok(popW.sub == null, 'equipped wrench: no heat subtitle')
const wrenched = applyEffect(armed, popW.effects)
ok(wrenched.flash === BARROW_SCRAP_3 && wrenched.heat.cartel === armed.heat.cartel && (wrenched.items.scrap ?? 0) === (armed.items.scrap ?? 0) + 3, 'pop with wrench: Scrap +3 only')

for (const key of ['rig_passkey', 'cipher_key'] as const) {
  const base = applyEffect({ ...newGame('prisoner'), sap: 8, items: { [key]: 1 } }, { goto: 'ch3:capture' })
  const atSiphon = { ...walk(walk(walk(base, 'ch3:trench'), 'ch3:relay'), 'ch3:siphon'), heat: { cartel: 1, seekers: 4, strays: 0 } }
  const bypass = visibleChoices(atSiphon).find((c) => c.id === 'barrow-bypass')!
  ok(isChoiceOn(atSiphon, bypass.enable) && bypass.locked === BARROW_BYPASS_LOCK, `${key} opens the siphon lock`)
  const n = applyEffect(atSiphon, bypass.effects)
  ok(n.flash === `${BARROW_SCRAP_4}\n\n${BARROW_HEAT_DOWN_2}`, `${key} bypass lines`)
  ok((n.items.scrap ?? 0) === (atSiphon.items.scrap ?? 0) + 4 && n.heat.seekers === atSiphon.heat.seekers - 2, `${key}: Scrap +4, Seeker Heat -2`)
}
const bare = applyEffect({ ...newGame('prisoner'), sap: 8 }, { goto: 'ch3:capture' })
const lockedSiphon = walk(walk(walk(bare, 'ch3:trench'), 'ch3:relay'), 'ch3:siphon')
const lockedBypass = visibleChoices(lockedSiphon).find((c) => c.id === 'barrow-bypass')!
ok(!isChoiceOn(lockedSiphon, lockedBypass.enable), 'bypass stays locked without a key')

const fuel = applyEffect(lockedSiphon, visibleChoices(lockedSiphon).find((c) => c.id === 'barrow-siphon')!.effects)
ok(fuel.flash === `${BARROW_SAP_2}\n\n${BARROW_CARTEL_3}`, 'siphon lines')
ok(fuel.sap === lockedSiphon.sap + 2 && fuel.heat.cartel === lockedSiphon.heat.cartel + 3, 'siphon: Sap +2, Cartel Heat +3')
ok(!visibleChoices(fuel).some((c) => c.id === 'barrow-pop'), 'siphon fuel is the one pick')

const old = applyEffect({ ...newGame('prisoner'), sap: 8, flags: { 'barrowCache:ch3:siphon': true } }, { goto: 'ch3:siphon' })
ok(!!visibleChoices(old).find((c) => c.id === 'barrow-pop') && !visibleChoices(old).find((c) => c.id === 'barrow-empty'), 'old barrowCache flag does not spend the siphon')
ok(!old.flags[barrowLootKey('ch3:siphon')], 'looted flag is the new key')

// Pop's outcome tags are the choice pills. An equipped wrench hides the subtitle and drops the Cartel tag.
ok(readFileSync('src/components/PlayScreen.tsx', 'utf8').includes('{row.sub ? <small>{row.sub}</small> : null}'), 'a missing subtitle renders no replacement')
function cacheAt(sceneId: string, extra: Partial<GameState> = {}): GameState {
  const g = newGame('prisoner')
  return {
    ...g,
    sceneId,
    hubId: sceneId.startsWith('camp:') ? 'camp04' : sceneId.startsWith('thresh:') ? 'threshold' : 'barrow',
    sap: 4,
    heat: { cartel: 1, seekers: 3, strays: 0 },
    ...extra,
    items: { ...g.items, ...(extra.items ?? {}) },
    flags: { ...g.flags, ...(extra.flags ?? {}) },
    equipped: extra.equipped ?? {},
  } as GameState
}
for (const id of BARROW_CACHE_SCENES) {
  const off = cacheAt(id)
  const bare = visibleChoices(off).find((c) => c.id === 'barrow-pop')!
  const barePills = effectPills(bare.effects, off.heat).map((p) => p.text)
  ok(bare.sub === BARROW_POP_SUB, `${id}: subtitle while the wrench is off`)
  ok(barePills.some((t) => t.startsWith('+ ') && t.includes('scrap')) && barePills.some((t) => t.startsWith('Cartel +')), `${id}: scrap and Cartel tags while the wrench is off (${barePills})`)
  const pocket = cacheAt(id, { items: { wrench: 1 } })
  ok(visibleChoices(pocket).find((c) => c.id === 'barrow-pop')?.sub === BARROW_POP_SUB, `${id}: a carried wrench still shows the subtitle`)
  const on = cacheAt(id, { items: { wrench: 1 }, equipped: { weapon: 'wrench' } })
  const armedPop = visibleChoices(on).find((c) => c.id === 'barrow-pop')!
  const armedPills = effectPills(armedPop.effects, on.heat).map((p) => p.text)
  ok(armedPop.sub == null, `${id}: equipped wrench hides the subtitle`)
  ok(armedPills.some((t) => t.includes('scrap')) && !armedPills.some((t) => /Cartel|Heat/.test(t)), `${id}: equipped wrench keeps only the scrap tag (${armedPills})`)
}

console.log(fails ? `v222: ${fails} FAIL` : 'v222: all pass')
process.exit(fails ? 1 : 0)

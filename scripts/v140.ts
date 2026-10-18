/**
 * v140: typed travel in locked states, the fight menu lock, map-walk masked block, scavenge hunt, gate loop, Spine rescue cost.
 *   npx tsx scripts/v140.ts
 */
import { applyEffect, drinkDrop, equipBlock, fightLocked, interpret, isChoiceOn, newGame, scavenge, travelTo, unequipSlot, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import { ROAD_NOT_NOW, ROAD_NEED_LOCK, roadHome } from '../src/game/returnRoad.ts'
import { scavengeLock } from '../src/game/scavenge.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

const HOMES: Record<DoorId, { hub: string; edge: string }> = {
  prisoner: { hub: 'camp04', edge: 'camp:wire' },
  outcast: { hub: 'spine', edge: 'spine:hound' },
  vessel: { hub: 'threshold', edge: 'thresh:paddock' },
}
const DOORS: DoorId[] = ['prisoner', 'outcast', 'vessel']

function home(door: DoorId, extra: Record<string, boolean | string | number> = {}, scene = HOMES[door].edge): GameState {
  const g = newGame(door)
  return {
    ...g,
    sceneId: scene,
    hubId: HOMES[door].hub,
    chapterId: null,
    sap: 6,
    health: 6,
    flags: { ...g.flags, noMasked: true, hungerKnown: true, chapter1Done: true, chapter1EndSeen: true, rimRoadSeen: true, leftCamp: true, quietFence: true, huntQuiet: 0, ...extra },
  }
}
function same(a: GameState, b: GameState, msg: string) {
  ok(a.sceneId === b.sceneId && a.sap === b.sap && a.ticks === b.ticks && a.pressure === b.pressure, `${msg}: scene/sap/ticks/pressure unchanged`)
  ok(!!a.flags.encounterHere === !!b.flags.encounterHere && !!a.flags.hunterHere === !!b.flags.hunterHere && !!a.flags.downed === !!b.flags.downed, `${msg}: fight/hunt/down state unchanged`)
}

const PHRASES = ['go home', 'walk back to red maw', 'return to camp', 'head to the spine', 'go back to the maw', 'run to red maw', 'ride to the threshold']

for (const door of DOORS) {
  const locks: Array<[string, GameState]> = [
    ['fight', home(door, { encounterHere: true, encounterKind: 'raider' })],
    ['down', home(door, { downed: true })],
    ['hunt', home(door, { hunterHere: true, hunterFrom: HOMES[door].edge })],
  ]
  for (const [name, st] of locks) {
    for (const p of PHRASES) {
      const n = interpret(st, p)
      same(n, st, `${door} ${name} "${p}"`)
      ok(n.flash === ROAD_NOT_NOW || n.sceneId === st.sceneId, `${door} ${name} "${p}" answers Not now`)
    }
    ok(fightLocked(st), `${door} ${name} is locked`)
  }
  // Too dry: the existing lock line, nothing else.
  const dry = { ...home(door), sap: 2 }
  const n = interpret(dry, 'walk back to red maw')
  same(n, dry, `${door} dry`)
  const rim = { ...dry, sceneId: 'maw:rim', hubId: 'redmaw' }
  const m = interpret(rim, 'go home')
  same(m, rim, `${door} dry rim`)
  ok(m.flash === ROAD_NEED_LOCK, `${door} dry rim says the 3 Sap lock`)
}

// The fight menu: Map, travel, gear changes, Rumors are locked; backpack use and Help are not.
{
  const g = newGame('outcast')
  const st: GameState = { ...home('outcast', { encounterHere: true, encounterKind: 'raider' }), sap: 3, items: { ...g.items, vial_drop: 1, scrap_buckler: 1 }, equipped: {} }
  ok(travelTo(st, 'spine:ridge').sceneId === st.sceneId && travelTo(st, 'spine:ridge').flash === ROAD_NOT_NOW, 'travelTo is Not now in a fight')
  ok(equipBlock(st, 'scrap_buckler', 'offhand' as never) === ROAD_NOT_NOW, 'equip is Not now in a fight')
  ok(unequipSlot(st, 'weapon').flash === ROAD_NOT_NOW, 'unequip is Not now in a fight')
  const d = drinkDrop(st)
  ok(d.sap === st.sap + 3 && d.flags.encounterHere, 'backpack: Drink still works in a fight')
  const h = interpret(st, 'help')
  ok(h.flash !== ROAD_NOT_NOW, 'Help still answers in a fight')
  const free = home('outcast')
  ok(travelTo(free, 'spine:well').sceneId === 'spine:well', `travel is open on foot (${travelTo(free, 'spine:well').flash})`)
}

// Map walks never land the masked Strike / Chase / Wait block.
{
  let blocks = 0
  let walkBlocks = 0
  for (const door of DOORS) {
    const map = HUB_MAPS[HOMES[door].hub]
    for (const e of map.edges) {
      const a = map.nodes.find((n) => n.id === e.a)!
      const b = map.nodes.find((n) => n.id === e.b)!
      for (let t = 1; t < 160; t++) {
        const st = home(door, { sceneSteps: 20 + (t % 7), maskedStep: -99 }, a.sceneId)
        const flags = { ...st.flags }
        delete flags.noMasked
        const s = { ...st, flags, ticks: t * 7 + 3, sap: 8 }
        if (applyEffect(s, { goto: b.sceneId, ticks: 1 }).flags.maskedHere) blocks++
        if (travelTo(s, b.sceneId).flags.maskedHere) walkBlocks++
      }
    }
  }
  ok(blocks > 0, 'masked block baseline is exercised by non-walk travel')
  ok(walkBlocks === 0, `map walks never raise the masked block (${walkBlocks})`)
  console.log(`  masked block: non-walk ${blocks}, map-walk ${walkBlocks}`)
}

// A scavenge cut short by a hunt: no loot, not picked clean. The Lockdown Gate never fires a hunt.
{
  for (const [door, sc] of [['prisoner', 'camp:yard'], ['prisoner', 'camp:gate'], ['prisoner', 'camp:vents']] as Array<[DoorId, string]>) {
    let hunted = 0
    for (let t = 1; t < 60; t++) {
      const st: GameState = { ...home(door, { scavCount: 5, scavArea: sc }, sc), ticks: t, heat: { cartel: 8, strays: 0, seekers: 0 } }
      const n = scavenge(st)
      if (n.flags.hunterHere) {
        hunted++
        ok(JSON.stringify(n.items) === JSON.stringify(st.items), `${sc} interrupted scavenge gives no loot`)
        ok(!scavengeLock(n), `${sc} interrupted scavenge is not picked clean`)
      }
    }
    if (sc === 'camp:gate') ok(hunted === 0, 'scavenge at the Lockdown Gate fires no hunt')
    else ok(hunted > 0, `${sc} hunt path exercised`)
  }
}

// The gate loop: Rim > walk back > gate > stay outside is net zero Sap and keeps the scene's flags.
{
  const g = newGame('prisoner')
  const rim: GameState = {
    ...home('prisoner', { campLockdown: true, restedHere: true }, 'maw:rim'),
    hubId: 'redmaw',
    flags: { ...home('prisoner').flags, quietFence: false, campLockdown: true, restedHere: true, sceneSteps: 7 },
    ticks: 40,
    items: g.items,
  }
  const road = roadHome(rim)!
  const gate = applyEffect(rim, road.effects)
  ok(gate.sceneId === 'camp:gate', 'the road home lands at the gate under lockdown')
  ok(gate.sap === rim.sap - 2, 'the gate walk is charged')
  const back = getScene('camp:gate').choices.find((c) => c.id === 'back')!
  const out = applyEffect(gate, back.effects)
  ok(out.sceneId === 'maw:rim', 'stay outside returns to the Rim')
  ok(out.sap === rim.sap, `stay outside refunds exactly what was charged (${out.sap} vs ${rim.sap})`)
  ok(out.ticks === rim.ticks, 'stay outside gives back the ticks')
  ok(out.flags.restedHere === true, 'stay outside keeps Rest used')
  ok(Number(out.flags.sceneSteps) === 7, 'stay outside does not count a new scene')
  ok(!('gatePaid' in out.flags) && !('gateTicks' in out.flags), 'gate bookkeeping is cleared')
  // Arrived free (nothing charged): nothing is refunded.
  const free = { ...gate, sap: rim.sap, flags: { ...gate.flags, gatePaid: 0 } }
  ok(applyEffect(free, back.effects).sap === rim.sap, 'no refund when nothing was charged')
}

// The Spine rescue: the first is the free First Drop, later ones cost a Glint or a scrap.
{
  const g = newGame('outcast')
  const pay = (flags: Record<string, boolean>, items: Record<string, number>) => {
    const st: GameState = { ...home('outcast', flags, 'spine:ridge'), sap: 1, items: { ...g.items, vial_drop: 0, ...items } as never }
    return applyEffect(st, { goto: 'spine:well', sap: -1, ticks: 1 })
  }
  const first = pay({}, { glints: 2 })
  ok(first.sceneId === 'crisis:spine', 'collapse at the Spine lands the crisis')
  ok((first.items.glints ?? 0) === 2, 'the first Spine rescue is free')
  const later = pay({ crisisSpine: true }, { glints: 2 })
  ok(later.sceneId === 'crisis:spine' && (later.items.glints ?? 0) === 1, 'a later Spine rescue costs a Glint')
  const scrapOnly = pay({ crisisSpine: true }, { glints: 0, scrap: 2 })
  ok((scrapOnly.items.scrap ?? 0) === 1, 'a later Spine rescue costs a scrap when there is no Glint')
}

// Stale text and exits.
{
  const sift = getScene('thresh:sift').choices
  ok(sift.some((c) => c.id === 'back' && /Court/.test(c.label)), 'Cup-Shadow has a way out')
  ok(getScene('spine:boots').choices.some((c) => c.id === 'back' && c.effects.goto === 'spine:hound'), 'Boot-Prints has a way back to the Hound Sign')
  const ridge = (sap: number, extra: Record<string, boolean> = {}) => {
    const st = { ...home('outcast', { chapter1Done: true, ...extra }, 'spine:ridge'), sap }
    return st
  }
  const body = (st: GameState) => {
    const sc = getScene('spine:ridge')
    return (sc.variants ?? []).filter((v) => isChoiceOn(st, v.if as never)).map((v) => v.body).join(' ')
  }
  ok(!/before noon/.test(body({ ...ridge(2), items: { ...ridge(2).items, vial_drop: 1 } })), 'no "before noon" on the Noon Spine after Chapter One (Drop)')
  ok(!/before noon/.test(body(ridge(2))), 'no "before noon" on the Noon Spine after Chapter One (empty vial)')
  const jax = getScene('crisis:camp')
  const st = home('prisoner', { chapter1Done: true }, 'crisis:camp')
  const text = (jax.variants ?? []).filter((v) => isChoiceOn(st, v.if as never)).map((v) => v.body).join(' ')
  ok(/Corpses don't hotwire/.test(text) && !/inside man/.test(text), 'Jaxson crisis drops the sabotage pitch after Chapter One')
  ok(/inside man/.test(jax.body), 'Jaxson crisis keeps the pitch in Chapter One')
  ok(visibleChoices(home('vessel', {}, 'thresh:sift')).some((c) => c.id === 'back'), 'Cup-Shadow exit is visible')
}

if (fails) {
  console.log(`\n${fails} v140 check(s) FAILED`)
  process.exit(1)
}
console.log('v140 checks OK')

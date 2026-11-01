/**
 * v139: Rest cools the home faction's Heat; pressure 10 and 12 at a home camp.
 *   npx tsx scripts/closing.ts
 */
import { REST_LINE, applyEffect, interpret, isChoiceOn, newGame, visibleChoices } from '../src/game/engine.ts'
import { REST_HEAT_GAP, closingNow } from '../src/game/closing.ts'
import { getScene } from '../src/game/content/index.ts'
import type { DoorId, Faction, GameState } from '../src/game/types.ts'

let fails = 0
function ok(c: unknown, m: string) {
  if (!c) {
    fails++
    console.log('FAIL', m)
  }
}

const DOORS: DoorId[] = ['prisoner', 'outcast', 'vessel']
const HOME: Record<DoorId, { hub: string; rest: string; walkTo: string; faction: Faction; name: string }> = {
  prisoner: { hub: 'camp04', rest: 'camp:yard', walkTo: 'camp:vents', faction: 'cartel', name: 'Cartel' },
  outcast: { hub: 'spine', rest: 'spine:ridge', walkTo: 'spine:well', faction: 'strays', name: 'Strays' },
  vessel: { hub: 'threshold', rest: 'thresh:court', walkTo: 'thresh:paddock', faction: 'seekers', name: 'Seekers' },
}
const ZERO = { cartel: 0, strays: 0, seekers: 0 }

function at(door: DoorId, o: Partial<GameState> = {}, flags: Record<string, boolean | string | number> = {}): GameState {
  const g = newGame(door)
  const h = HOME[door]
  return {
    ...g,
    hubId: h.hub,
    sceneId: h.rest,
    sap: 6,
    sapMax: 8,
    health: g.healthMax,
    heat: { ...ZERO, [h.faction]: 3 },
    flags: { ...g.flags, noMasked: true, hungerKnown: true, cartelNotice: true, strayNotice: true, firstDropMarked: true, ...flags },
    ...o,
  } as GameState
}
const row = (s: GameState) => visibleChoices(s).find((c) => c.id === 'rest')

for (const door of DOORS) {
  const h = HOME[door]

  // ── Rest cools Heat ──
  let s = at(door)
  ok(!!row(s), `${door}: Rest shows at full Health when Heat can cool`)
  ok(row(s)!.effects.heat?.[h.faction] === -1, `${door}: Rest lowers ${h.faction} by 1`)
  const p0 = s.pressure
  s = applyEffect(s, row(s)!.effects)
  ok(s.heat[h.faction] === 2, `${door}: Heat 3 → 2 (${s.heat[h.faction]})`)
  ok(s.pressure === p0 + 1, `${door}: Rest adds 1 Pressure (${p0}→${s.pressure})`)
  ok(s.sap === 5, `${door}: Rest costs 1 Sap`)
  ok(s.flash === `${h.name} Heat -1.`, `${door}: plain result line (${s.flash})`)
  ok(s.sceneId === h.rest, `${door}: Rest stays on the scene`)
  ok(!isChoiceOn(s, row(s)?.enable) || !row(s), `${door}: Rest once a scene`)
  // Other factions untouched.
  ok((['cartel', 'strays', 'seekers'] as Faction[]).filter((f) => f !== h.faction).every((f) => s.heat[f] === 0), `${door}: other Heat untouched`)

  // The limit: every REST_HEAT_GAP scenes.
  const stepsNow = Number(s.flags.sceneSteps ?? 0)
  for (let gap = 0; gap < REST_HEAT_GAP; gap++) {
    const later = { ...s, flags: { ...s.flags, restedHere: false, sceneSteps: stepsNow + gap } }
    const r = row(later)
    ok(!r, `${door}: full-Health Rest hidden ${gap} scenes later (no free reset)`)
    const hurt = { ...later, health: 3 }
    ok(row(hurt) && row(hurt)!.effects.heat === undefined, `${door}: hurt Rest ${gap} scenes later is the plain Rest`)
  }
  const ready = { ...s, flags: { ...s.flags, restedHere: false, sceneSteps: stepsNow + REST_HEAT_GAP } }
  ok(row(ready)?.effects.heat?.[h.faction] === -1, `${door}: Heat cools again after ${REST_HEAT_GAP} scenes`)

  // Min 0.
  const low = at(door, { heat: { ...ZERO, [h.faction]: 1 } })
  const zeroed = applyEffect(low, row(low)!.effects)
  ok(zeroed.heat[h.faction] === 0, `${door}: Heat 1 → 0`)
  const none = at(door, { heat: ZERO })
  ok(!row(none), `${door}: no Rest row at Heat 0 and full Health`)

  // Hurt: health returns too, REST_LINE then the Heat line.
  const hurt = at(door, { health: 3 })
  const hr = applyEffect(hurt, row(hurt)!.effects)
  ok(hr.health === 5 && hr.heat[h.faction] === 2 && hr.flash === `${REST_LINE}\n\n${h.name} Heat -1.`, `${door}: hurt Rest = +2 Health, Heat -1, two lines`)

  // Typed rest.
  const typed = interpret(at(door), 'rest')
  ok(typed.heat[h.faction] === 2 && typed.sap === 5, `${door}: typed rest cools Heat`)

  // Not in a fight, a hunt, a shop.
  ok(!row(at(door, {}, { encounterHere: true, encounterKind: 'jackal', encounterHp: 2 })), `${door}: no Rest in a fight`)
  // Not on the road (Cache Run) or at the Maw.
  ok(!row({ ...at(door), hubId: 'redmaw', sceneId: 'maw:rim' }) || row({ ...at(door), hubId: 'redmaw', sceneId: 'maw:rim' })!.effects.heat === undefined, `${door}: the Maw Rest does not cool home Heat`)

  // ── Pressure 10: home Heat +1, once ──
  let p = at(door, { pressure: 9, heat: ZERO })
  p = applyEffect(p, { ticks: 1, pressure: 1, goto: h.walkTo })
  ok(p.pressure === 10 && p.heat[h.faction] === 1 && p.flags.closingHeat === true, `${door}: pressure 10 raises ${h.faction} Heat by 1 (${p.heat[h.faction]})`)
  const again = applyEffect({ ...p, sceneId: h.rest }, { ticks: 1, pressure: 1, goto: h.walkTo })
  ok(again.heat[h.faction] === p.heat[h.faction], `${door}: only once`)
  const capped = applyEffect(at(door, { pressure: 9, heat: { ...ZERO, [h.faction]: 8 } }), { ticks: 1, pressure: 1, goto: h.walkTo })
  ok(capped.heat[h.faction] === 8, `${door}: Heat capped at 8`)
  const early = applyEffect(at(door, { pressure: 7, heat: ZERO }), { ticks: 1, pressure: 1, goto: h.walkTo })
  ok(early.heat[h.faction] === 0, `${door}: nothing below pressure 10`)
  ok(closingNow(p) && !closingNow({ ...p, flags: { ...p.flags, chapter1Done: true } }), `${door}: closingNow gates on Chapter One`)

  // ── From 10 on, the home hunter finds you at Heat 0 with no notice ──
  let hunts = 0
  let masked = 0
  for (let t = 0; t < 60; t++) {
    const base = at(door, { pressure: 10, heat: ZERO, ticks: t }, { closingHeat: true, cartelNotice: false, strayNotice: false, huntQuiet: 7, noMasked: false as unknown as boolean })
    const f = { ...base.flags }
    delete f.noMasked
    delete f.cartelNotice
    delete f.strayNotice
    const st = { ...base, flags: { ...f, sceneSteps: t % 5, maskedStep: -99 } }
    const n = applyEffect(st, { ticks: 1, pressure: 1, goto: h.walkTo })
    if (n.flags.hunterHere) {
      hunts++
      const rows = visibleChoices(n)
      if (!rows.some((c) => c.effects.startChapter)) ok(false, `${door}: hunt card keeps a Gullet exit (t=${t})`)
    }
    masked += Number(n.flags.maskedSeen ?? 0)
  }
  ok(hunts >= 1, `${door}: home hunter fires at pressure 10+ with Heat 0 and no notice (${hunts}/60)`)
  ok(masked === 0 || hunts > 0, `${door}: masked check ran`)
  // Below 10 and no notice: Camp/Spine/Threshold stay quiet at Heat 0.
  let calm = 0
  for (let t = 0; t < 60; t++) {
    const base = at(door, { pressure: 4, heat: ZERO, ticks: t }, { huntQuiet: 7 })
    const n = applyEffect(base, { ticks: 1, pressure: 1, goto: h.walkTo })
    if (n.flags.hunterHere) calm++
  }
  ok(calm === 0, `${door}: no hunt at Heat 0 below pressure 10 (${calm})`)

  // ── Pressure 12: the Camp Closes, Camp-04 only, once ──
  let f = at(door, { pressure: 11, heat: ZERO }, { closingHeat: true })
  const nf = applyEffect({ ...f, flags: { ...f.flags, huntQuiet: 0 } }, { ticks: 1, pressure: 1, goto: h.walkTo })
  if (door === 'prisoner') {
    ok(nf.sceneId === 'camp:forced' && nf.flags.campForcedSeen === true, `prisoner: pressure 12 opens The Camp Closes (${nf.sceneId})`)
    const ids = visibleChoices(nf).map((c) => c.id)
    ok(ids.includes('go') && ids.includes('stay') && !ids.includes('blind'), `prisoner: forced card buttons (${ids})`)
    const stay = applyEffect(nf, getScene('camp:forced').choices.find((c) => c.id === 'stay')!.effects)
    ok(stay.sceneId === 'camp:yard' && stay.hubId === 'camp04', `prisoner: Stay one more hour returns to the Yard (${stay.sceneId})`)
    const second = applyEffect({ ...stay, sceneId: 'camp:yard' }, { ticks: 1, pressure: 1, goto: 'camp:vents' })
    ok(second.sceneId !== 'camp:forced', `prisoner: forced card is once (${second.sceneId})`)
    // v194: the wire needs the guard station dropped first.
    const goFx = getScene('camp:forced').choices.find((c) => c.id === 'go')!.effects
    const held = applyEffect(nf, goFx)
    ok(held.sceneId === 'camp:forced' && !held.chapterId, `prisoner: Take the Gullet holds with the guard up (${held.sceneId})`)
    const go = applyEffect({ ...nf, flags: { ...nf.flags, guardDown: true } }, goFx)
    ok(go.chapterId === 'cache-run', `prisoner: Take the Gullet starts the run (${go.sceneId})`)
    // Not on a talk scene.
    const talk = applyEffect({ ...f, flags: { ...f.flags, huntQuiet: 0 } }, { ticks: 1, pressure: 1, goto: 'camp:kaelen' })
    ok(talk.sceneId !== 'camp:forced', `prisoner: never on a talk scene (${talk.sceneId})`)
    // Masked never touches it, whatever the seed.
    for (let t = 0; t < 60; t++) {
      const m = applyEffect({ ...f, ticks: t, flags: { ...f.flags, noMasked: undefined as unknown as boolean, huntQuiet: 0, maskedStep: -99 } }, { ticks: 1, pressure: 1, goto: h.walkTo })
      ok(!m.flags.maskedHere && !(m.flash ?? '').includes('masked'), `prisoner: masked stays off the forced card (t=${t})`)
    }
  } else {
    ok(nf.sceneId !== 'camp:forced', `${door}: no forced card off Camp-04 (${nf.sceneId})`)
  }
}

console.log(fails ? `\n${fails} FAILURES` : '\nv139 closing checks OK')
process.exit(fails ? 1 : 0)

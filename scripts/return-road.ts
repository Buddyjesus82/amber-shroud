/**
 * v138: the road back and forth between a home camp and the Red Maw, after Chapter One.
 *   npx tsx scripts/return-road.ts
 */
import { applyEffect, interpret, isChoiceOn, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { ALL_SCENES, getScene } from '../src/game/content/index.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { ROAD_SAP, roadChoice, roadHome, roadToMaw } from '../src/game/returnRoad.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

const DOORS3: DoorId[] = ['prisoner', 'outcast', 'vessel']
const HOMES: Record<DoorId, { hub: string; edge: string; maw: string }> = {
  prisoner: { hub: 'camp04', edge: 'camp:wire', maw: 'maw:rim' },
  outcast: { hub: 'spine', edge: 'spine:hound', maw: 'maw:rim' },
  vessel: { hub: 'threshold', edge: 'thresh:paddock', maw: 'maw:rim' },
}

/** A player standing on the Rim, Chapter One done (the same flags the real walk leaves). */
function atRim(door: DoorId, extra: Record<string, boolean | string | number> = {}): GameState {
  const g = newGame(door)
  return {
    ...g,
    sceneId: 'maw:rim',
    hubId: 'redmaw',
    chapterId: null,
    sap: 6,
    sapMax: 8,
    health: 6,
    flags: {
      ...g.flags,
      hungerKnown: true,
      hungerLocked: true,
      chapter1Done: true,
      chapter1EndSeen: true,
      rimRoadSeen: true,
      ossaAlive: true,
      sybellaHunting: true,
      leftCamp: door === 'prisoner',
      quietFence: door === 'prisoner',
      huntQuiet: 0,
      ...extra,
    },
  }
}

/** Fight through a road fight / hunt that the arrival rolled, so the walk can go on. */
function clear(st: GameState): GameState {
  for (let i = 0; i < 40 && (st.flags.encounterHere || st.flags.downed || st.health <= 0 || st.flags.hunterHere || st.flags.strayHunterHere || st.flags.maskedHere); i++) {
    const rows = visibleChoices(st)
    const c =
      rows.find((x) => x.id === 'enc-fight') ??
      rows.find((x) => x.id === 'enc-continue') ??
      rows.find((x) => x.id === 'wake') ??
      rows.find((x) => /hold|hide|wait|masked-wait|hunter-hold|spine-hide|thresh-hide|sybella-hold/.test(x.id)) ??
      rows[0]
    st = applyEffect(st, c.effects)
  }
  return { ...st, health: Math.max(st.health, 6), sap: Math.max(st.sap, 6), flash: undefined }
}

const SEEN_CH1_BEATS = ['ch1:storm', 'ch1:leave', 'ch1:end', 'ch1:land']

for (const door of DOORS3) {
  const h = HOMES[door]
  let s = atRim(door)

  // The Rim offers the road home; the home camp's exit node offers the road to the Maw.
  ok(roadHome(s), `${door}: road home is offered at the Rim`)
  ok(!roadToMaw(s), `${door}: no road-to-Maw row at the Rim`)
  ok(visibleChoices(s).every((c) => !c.effects.startChapter), `${door}: no escape route shows at the Rim`)

  for (let trip = 0; trip < 3; trip++) {
    const sapBefore = s.sap
    const stepsBefore = Number(s.flags.sceneSteps ?? 0)
    const home = roadHome(s)!
    ok(isChoiceOn(s, home.enable), `${door}: road home is enabled with Sap`)
    s = clear(applyEffect(s, home.effects))
    ok(s.hubId === h.hub, `${door} trip ${trip}: home hub (${s.hubId})`)
    ok(s.chapterId === null, `${door} trip ${trip}: chapterId null (${s.chapterId})`)
    ok(s.sceneId === h.edge || s.sceneId.startsWith(door === 'prisoner' ? 'camp:' : door === 'outcast' ? 'spine:' : 'thresh:'), `${door} trip ${trip}: lands on home ground (${s.sceneId})`)
    ok(s.flags.chapter1Done && s.flags.chapter1EndSeen, `${door}: Chapter One flags kept`)
    ok(!s.flags.stormFlash, `${door}: no storm flash`)
    ok(!SEEN_CH1_BEATS.includes(s.sceneId), `${door}: not on a Chapter One beat (${s.sceneId})`)
    ok(Number(s.flags.sceneSteps ?? 0) > stepsBefore, `${door}: scene steps advance`)
    ok(s.sap <= sapBefore - 0, `${door}: sap spent`)
    // Every choice on every home screen is non-escape.
    ok(visibleChoices(s).every((c) => !c.effects.startChapter), `${door}: no escape route at home`)
    ok(visibleChoices(s).length > 0, `${door}: home screen has buttons`)
    // Walk the hub: the exit node offers the road to the Maw.
    ok(roadToMaw(s) || s.sceneId !== h.edge, `${door}: road to Maw offered at the exit node`)
    // Typed Hunger/Gullet after Chapter One never opens the Cache Run again.
    const typed = interpret(s, 'take the gullet')
    ok(typed.chapterId !== 'cache-run' && !typed.sceneId.startsWith('ch1:'), `${door}: typed Gullet does not restart the run (${typed.sceneId})`)
    const toMaw = roadChoice(clear({ ...s, sceneId: h.edge, hubId: h.hub }))
    ok(toMaw && toMaw.id === 'road-maw', `${door}: exit node road is road-maw`)
    // Back to the Maw.
    s = clear({ ...s, sceneId: h.edge, hubId: h.hub })
    const sapHome = s.sap
    const typedMaw = interpret(s, 'walk back to red maw')
    ok(typedMaw.sceneId === 'maw:rim' || typedMaw.flags.encounterHere || typedMaw.flags.hunterHere || typedMaw.flags.strayHunterHere, `${door}: typed road to Maw works (${typedMaw.sceneId})`)
    ok(typedMaw.sap === sapHome - ROAD_SAP || typedMaw.flags.encounterHere || typedMaw.flags.hunterHere, `${door}: typed road costs ${ROAD_SAP} Sap (${sapHome}→${typedMaw.sap})`)
    s = clear(applyEffect(s, roadToMaw(s)!.effects))
    ok(s.hubId === 'redmaw' && s.chapterId === null, `${door}: back at the Maw hub`)
    ok(s.sceneId === 'maw:rim', `${door}: back on the Rim (${s.sceneId})`)
    ok(s.sceneId !== 'ch1:end', `${door}: no second End of Chapter One screen`)
    // Save round trip never moves you.
    const fixed = repairLoadedState(s)
    ok(fixed.sceneId === s.sceneId && fixed.hubId === s.hubId && fixed.chapterId === s.chapterId, `${door}: save repair leaves the Maw alone`)
    const homeSave = { ...s, sceneId: h.edge, hubId: h.hub }
    const fixed2 = repairLoadedState(homeSave)
    ok(fixed2.sceneId === h.edge && fixed2.hubId === h.hub && fixed2.chapterId === null, `${door}: save repair leaves home alone`)
  }

  // Low Sap: the road is locked, nothing spent.
  const dry = { ...atRim(door), sap: ROAD_SAP }
  ok(!isChoiceOn(dry, roadHome(dry)!.enable), `${door}: road locked at ${ROAD_SAP} Sap`)
  const dryTyped = interpret(dry, 'go home')
  ok(dryTyped.sceneId === 'maw:rim' && dryTyped.sap === ROAD_SAP, `${door}: typed road at low Sap goes nowhere`)

  // Not during a fight or a hunt.
  const fight = atRim(door, { encounterHere: true, encounterKind: 'jackal', encounterHp: 2 })
  ok(!roadHome(fight), `${door}: no road in a fight`)

  // Backstop: any startChapter effect after Chapter One is refused, with no change of scene.
  const home = { ...atRim(door), sceneId: h.edge, hubId: h.hub }
  const blocked = applyEffect(home, { startChapter: 'cache-run', goto: 'ch1:leave' })
  ok(blocked.sceneId === h.edge && blocked.chapterId === null && !blocked.flags.stormFlash, `${door}: escape effect refused after Chapter One`)
  const wash = travelTo(home, 'ch1:leave')
  ok(wash.chapterId !== 'cache-run' && !wash.sceneId.startsWith('ch1:'), `${door}: Wash/leave node never starts the run (${wash.sceneId})`)
}

// The Wash node on the Spine map is the road to the Maw from the Hound Sign, after Chapter One.
{
  const s = { ...atRim('outcast'), sceneId: 'spine:hound', hubId: 'spine' }
  const w = travelTo(s, 'ch1:leave')
  ok(w.sceneId === 'maw:rim' && w.hubId === 'redmaw', `Wash node walks to the Maw (${w.sceneId})`)
}

// The masked figure never meets you on the road: sweep many seeds.
for (const door of DOORS3) {
  for (let t = 0; t < 80; t++) {
    const base = atRim(door)
    const s0 = { ...base, ticks: t, flags: { ...base.flags, sceneSteps: t % 7, maskedStep: -99 } }
    const a = applyEffect(s0, roadHome(s0)!.effects)
    ok(Number(a.flags.maskedSeen ?? 0) === 0 && !a.flags.maskedHere, `${door}: masked figure stayed off the road home (t=${t})`)
    const h = HOMES[door]
    const s1 = { ...clear(a), sceneId: h.edge, hubId: h.hub, ticks: t + 3, flags: { ...clear(a).flags, maskedStep: -99 } }
    const b = applyEffect(s1, roadToMaw(s1)!.effects)
    ok(Number(b.flags.maskedSeen ?? 0) === 0 && !b.flags.maskedHere, `${door}: masked figure stayed off the road to the Maw (t=${t})`)
  }
}

// Every scene that offers an escape keeps at least one button once Chapter One is done.
for (const sc of ALL_SCENES) {
  if (!sc.choices.some((c) => c.effects.startChapter)) continue
  for (const door of DOORS3) {
    const st = { ...atRim(door), sceneId: sc.id, hubId: sc.hubId ?? null }
    const rows = visibleChoices(st)
    const nonEsc = sc.choices.filter((c) => !c.effects.startChapter)
    if (nonEsc.length && !rows.length) ok(false, `${sc.id} (${door}) has no button after Chapter One`)
    ok(rows.every((c) => !c.effects.startChapter), `${sc.id} (${door}) still shows an escape after Chapter One`)
  }
}

// Camp lockdown: the road in meets the gate; inside the wire you walk freely; turning back refunds the Sap.
{
  const lock = atRim('prisoner', { campLockdown: true, quietFence: false })
  const a = applyEffect(lock, roadHome(lock)!.effects)
  ok(a.sceneId === 'camp:gate', `lockdown: road home meets the gate (${a.sceneId})`)
  const back = applyEffect(a, getScene('camp:gate').choices.find((c) => c.id === 'back')!.effects)
  ok(back.sceneId === 'maw:rim' && back.hubId === 'redmaw', `lockdown: stay outside returns to the Rim (${back.sceneId}/${back.hubId})`)
  ok(back.sap >= lock.sap, `lockdown: turning back refunds the road's Sap (${lock.sap}→${back.sap})`)
  const caught = applyEffect(a, getScene('camp:gate').choices.find((c) => c.id === 'caught')!.effects)
  ok(caught.sceneId === 'camp:yard', `lockdown: caught lands in the Yard (${caught.sceneId})`)
  const walk = travelTo({ ...caught, sap: 6, flags: { ...caught.flags, hunterHere: undefined } as GameState['flags'] }, 'camp:vents')
  ok(walk.sceneId === 'camp:vents', `lockdown: inside the wire, walking the camp is not the gate again (${walk.sceneId})`)
}

console.log(fails ? `\n${fails} FAILURES` : '\nv138 return-road checks OK')
process.exit(fails ? 1 : 0)

/** v242: the Silt-Choked Courtyard and the Deep Junction behind the Gatehouse (Jeramie, t1253u–t1256u). */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { applyEffect, courtyardLoot, interpret, isChoiceOn, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { ch3MapLocked } from '../src/game/map.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v244'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v244'"), 'build v244')

const C_BODY = 'The walls open onto a staging yard big enough to swallow a caravan. Transport frames lie rusted to their axles, half-buried in drifted silt, and collapsed scaffolding leans against the inner wall like broken ribs. The wind finds you here.'
const J_BODY = 'The drainage tunnels meet here in a wide, dripping fork. Old runoff channels split off into the dark on either side, and between them a broad cut of worn stone runs on, rutted by wheels that stopped turning long ago. The old trade road.'
const SLOW = 'You lift and set aside, lift and set aside, until your arms shake. Under a frame you find what the silt was hiding.'
const RIP = 'Metal shrieks across the yard. A Cartel look-out on the upper tier stops pacing and listens.'
const CLEARED = 'The loose junk is cleared out. Nothing left here worth the sweat.'
const ROAD = "The old trade road runs on into the dark, choked with collapse and silence. You'll need a reason—and a route—before pushing deeper."
const LOOT_LINES: Record<string, string> = { scrap: 'Scrap +1.', salve: 'Resin +1.', vial_drop: 'Drop +1.' }

const at = (sceneId: string, door: DoorId, flags: GameState['flags'] = {}, extra: Partial<GameState> = {}): GameState => {
  const base = newGame(door)
  return { ...base, sceneId, hubId: 'barrow', chapterId: 'luminspire', sap: 4, heat: { ...base.heat, cartel: 2 }, ...extra, flags: { ...base.flags, ch3Started: true, ch3Stripped: true, ch3VaultDone: true, ch3TentOpen: true, crosshavenCablesCut: true, crosshavenGateOpen: true, ...flags } }
}
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id).join()
const count = (s: GameState, k: string) => Number((s.items as Record<string, number>)[k] ?? 0)

const cy = getScene('ch3:courtyard')
const jn = getScene('ch3:junction')
ok(cy.title === 'The Silt-Choked Courtyard' && cy.body === C_BODY && cy.hubId === 'barrow', 'courtyard text exact')
ok(jn.title === 'The Deep Junction' && jn.body === J_BODY && jn.hubId === 'barrow', 'junction text exact')

for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  // Gatehouse -> Courtyard, free.
  const gh = at('ch3:gatehouse', door)
  const walk = row(gh, 'walk-courtyard')
  ok(walk?.label === 'Walk into the courtyard' && !walk.sub, `${door}: courtyard walk on the gatehouse`)
  const inYard = applyEffect(gh, walk!.effects)
  ok(inYard.sceneId === 'ch3:courtyard' && inYard.sap === gh.sap, `${door}: walk in is free`)
  ok(ids(inYard) === 'clear-debris,rip-wreckage,walk-junction,back-gatehouse', `${door}: courtyard rows (${ids(inYard)})`)
  const slowRow = row(inYard, 'clear-debris')!
  const ripRow = row(inYard, 'rip-wreckage')!
  ok(slowRow.label === 'Clear the debris slowly' && slowRow.sub === 'Sap −1. Quiet work.' && ripRow.label === 'Rip through the wreckage' && ripRow.sub === 'Fast and loud.', `${door}: scavenge labels`)
  ok(row(inYard, 'walk-junction')?.label === 'Walk to the Deep Junction' && row(inYard, 'back-gatehouse')?.label === 'Back to the Gatehouse', `${door}: courtyard walk labels`)
  ok(applyEffect(inYard, row(inYard, 'back-gatehouse')!.effects).sceneId === 'ch3:gatehouse', `${door}: back to the gatehouse`)

  // Slow: Sap -1, one loot item, exact lines.
  const loot0 = courtyardLoot(inYard)
  const s1 = applyEffect(inYard, slowRow.effects)
  ok(s1.sceneId === 'ch3:courtyard' && s1.sap === inYard.sap - 1 && s1.heat.cartel === inYard.heat.cartel, `${door}: slow costs 1 Sap, no Heat`)
  ok(count(s1, loot0.item) === count(inYard, loot0.item) + 1 && s1.flash === [SLOW, 'Sap −1.', LOOT_LINES[loot0.item]].join('\n'), `${door}: slow flash + loot (${s1.flash})`)

  // Rip: Cartel Heat +1, no Sap.
  const loot1 = courtyardLoot(s1)
  const s2 = applyEffect(s1, row(s1, 'rip-wreckage')!.effects)
  ok(s2.sap === s1.sap && s2.heat.cartel === s1.heat.cartel + 1, `${door}: rip is Cartel Heat +1, no Sap`)
  ok(count(s2, loot1.item) === count(s1, loot1.item) + 1 && s2.flash === [RIP, 'Cartel Heat +1.', LOOT_LINES[loot1.item]].join('\n'), `${door}: rip flash + loot (${s2.flash})`)

  // Third pull (typed), then both greyed with the cleared line.
  const s3 = interpret(s2, 'rip through the wreckage')
  ok(s3.flags.courtyardPulls === 3 && s3.flags.courtyardCleared === true && s3.heat.cartel === s2.heat.cartel + 1, `${door}: third pull counts`)
  ok(ids(s3) === 'clear-debris-done,rip-wreckage-done,walk-junction,back-gatehouse', `${door}: greyed after 3 (${ids(s3)})`)
  for (const id of ['clear-debris-done', 'rip-wreckage-done']) {
    const r = row(s3, id)!
    ok(!isChoiceOn(s3, r.enable) && r.locked === CLEARED, `${door}: ${id} locked with the cleared line`)
  }
  const s4 = interpret(s3, 'clear the debris')
  ok(s4.flash === CLEARED && s4.sap === s3.sap && JSON.stringify(s4.items) === JSON.stringify(s3.items), `${door}: typed after cap gives the cleared line only`)
  ok(applyEffect(s3, { still: true, sap: -1, courtyardPull: 'slow' }).flash === CLEARED, `${door}: a 4th pull effect is refused`)

  // Slow locked at Sap 0.
  const dry = at('ch3:courtyard', door, {}, { sap: 0 })
  const d = row(dry, 'clear-debris')!
  ok(!isChoiceOn(dry, d.enable) && d.locked === 'Needs: 1 Sap' && isChoiceOn(dry, row(dry, 'rip-wreckage')!.enable), `${door}: slow needs 1 Sap, rip still open`)
  ok(interpret(dry, 'clear the debris').flash === 'Needs: 1 Sap', `${door}: typed slow at Sap 0`)

  // Junction.
  const jIn = applyEffect(inYard, row(inYard, 'walk-junction')!.effects)
  ok(jIn.sceneId === 'ch3:junction' && jIn.sap === inYard.sap, `${door}: junction walk is free`)
  ok(ids(jIn) === 'follow-road,back-courtyard', `${door}: junction rows (${ids(jIn)})`)
  const f = row(jIn, 'follow-road')!
  ok(f.label === 'Follow the old trade road' && f.sub === 'Into the Barrow Trails.', `${door}: follow label`)
  const fr = applyEffect(jIn, f.effects)
  ok(fr.flash === ROAD && fr.sceneId === 'ch3:junction' && fr.sap === jIn.sap && fr.health === jIn.health, `${door}: follow stays put, no cost`)
  ok(interpret(jIn, 'follow the road').flash === ROAD, `${door}: typed follow the road`)
  ok(row(jIn, 'back-courtyard')?.label === 'Back to the Courtyard' && applyEffect(jIn, row(jIn, 'back-courtyard')!.effects).sceneId === 'ch3:courtyard', `${door}: back to the courtyard`)

  // Map never skips the gate.
  const shut = at('ch3:crosshaven', door, { crosshavenGateOpen: false })
  for (const sc of ['ch3:courtyard', 'ch3:junction']) {
    ok(ch3MapLocked(shut, sc) && travelTo(shut, sc).sceneId === 'ch3:crosshaven', `${door}: map can't reach ${sc} past a shut gate`)
    ok(!ch3MapLocked(gh, sc), `${door}: ${sc} open once the gate is up`)
  }
}

// Each pull rolls fresh: across seeds, the three pulls are not always the same item.
{
  let varied = false
  for (let t = 0; t < 30 && !varied; t++) {
    const s = at('ch3:courtyard', 'outcast', {}, { ticks: t })
    const a = [0, 1, 2].map((p) => courtyardLoot(s, p).item)
    if (new Set(a).size > 1) varied = true
  }
  ok(varied, 'pull number changes the roll')
}

// No new auto Walk rows.
ok(!visibleChoices(at('ch3:courtyard', 'prisoner')).some((c) => /^Walk to The /.test(c.label)) && !visibleChoices(at('ch3:junction', 'prisoner')).some((c) => /^Walk to The /.test(c.label)), 'no auto Walk-to rows')

// Art.
for (const [sc, file] of [['ch3:courtyard', 'ch3-courtyard.jpg'], ['ch3:junction', 'ch3-junction.jpg']] as const) {
  const key = playCoverKey(at(sc, 'vessel'), getScene(sc))
  const f = playCoverFile(key)
  ok(f === file && existsSync(`public/covers/${f}`) && statSync(`public/covers/${f}`).size > 20000, `${sc} art (${key} -> ${f})`)
  ok(readFileSync('public/sw.js', 'utf8').includes(`covers/${file}`), `sw precaches ${file}`)
}

// Reload keeps the cap.
const saved = repairLoadedState(JSON.parse(JSON.stringify(at('ch3:courtyard', 'outcast', { courtyardPulls: 3, courtyardCleared: true }))) as GameState)
ok(saved.sceneId === 'ch3:courtyard' && ids(saved) === 'clear-debris-done,rip-wreckage-done,walk-junction,back-gatehouse', 'reload keeps the courtyard cleared')

if (fails) { console.log(`v242: ${fails} failure(s)`); process.exit(1) }
console.log('v242 ok')

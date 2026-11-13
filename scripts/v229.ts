/** v229: collared wagon roads stay shut, the Exit stays sealed, the trails open after the escape. */
import { readFileSync } from 'node:fs'
import { applyEffect, isChoiceOn, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { ch3MapLocked } from '../src/game/map.ts'
import { ROAD_NOT_NOW } from '../src/game/returnRoad.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v230'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v230'"), 'build v229')

function wagon(): GameState {
  const base = newGame('vessel')
  let s = applyEffect({ ...base, sap: 8, items: { ...base.items, spire_key: 1 } }, { goto: 'ch3:capture' })
  s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'fight')!.effects)
  return { ...s, sap: 6 }
}

function walk(state: GameState, id: string): GameState {
  const c = visibleChoices(state).find((row) => row.id === id)
  if (!c || !isChoiceOn(state, c.enable)) throw new Error(`no open ${id} from ${state.sceneId}`)
  return applyEffect(state, c.effects)
}

let s = wagon()
ok(s.sceneId === 'ch3:wagon' && !s.flags.ch3Out && !!s.flags.ch3Stripped, 'fight lands collared on the wagon')
ok(!visibleChoices(s).some((c) => c.id === 'walk-supply'), 'slip is the supply choice, so no second walk')
const relayLocked = visibleChoices(s).find((c) => c.id === 'walk-relay')
ok(!!relayLocked && !isChoiceOn(s, relayLocked.enable) && relayLocked.locked === ROAD_NOT_NOW, 'walk-relay is locked before the escape')
const hop = travelTo(s, 'ch3:relay')
ok(hop.sceneId === 'ch3:wagon' && hop.flash === ROAD_NOT_NOW && hop.sap === s.sap, 'a map hop off the wagon is refused')
const trenchHop = travelTo(s, 'ch3:trench')
ok(trenchHop.sceneId === 'ch3:wagon' && trenchHop.flash === ROAD_NOT_NOW, 'trench is not a road out while collared')

const heat = s.heat.seekers
s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'wait')!.effects)
ok(!!s.flags.ch3Waited && !s.flags.ch3Out && s.heat.seekers === heat + 1 && !visibleChoices(s).some((c) => c.id === 'slip'), 'wait keeps the heat and closes slip')
const supply = visibleChoices(s).find((c) => c.id === 'walk-supply')
const relay = visibleChoices(s).find((c) => c.id === 'walk-relay')
ok(!!supply && isChoiceOn(s, supply.enable) && supply.sub === '1 Sap.', 'after wait, only the supply walk opens')
ok(!!relay && !isChoiceOn(s, relay.enable) && relay.locked === ROAD_NOT_NOW, 'relay stays locked after wait')

ok(ch3MapLocked(s, 'ch3:capture'), 'the exit is sealed after fight')
const fromTrench = { ...s, sceneId: 'ch3:trench' as const, sap: 4 }
ok(travelTo(fromTrench, 'ch3:capture').sceneId === 'ch3:trench' && travelTo(fromTrench, 'ch3:capture').flash === ROAD_NOT_NOW, 'no hop back into the capture')

let out = wagon()
out = applyEffect(out, visibleChoices(out).find((c) => c.id === 'slip')!.effects)
ok(out.sceneId === 'ch3:supply' && !!out.flags.ch3Out && !!out.flags.ch3SupplyOpen, 'slip is the escape')
out = { ...out, sap: 8 }
out = walk(out, 'walk-wagon')
ok(out.sceneId === 'ch3:wagon' && !visibleChoices(out).some((c) => c.id === 'slip' || c.id === 'wait' || c.id === 'slip-closed'), 'walking back does not offer the collar again')
out = walk(out, 'walk-relay')
ok(out.sceneId === 'ch3:relay' && out.sap === 6, 'relay is one sap from the wagon after the escape')
const toTrench = visibleChoices(out).find((c) => c.id === 'walk-trench')
const toSiphon = visibleChoices(out).find((c) => c.id === 'walk-siphon')
ok(!!toTrench && isChoiceOn(out, toTrench.enable) && toTrench.sub === '1 Sap.', 'trench stays open')
ok(!!toSiphon && isChoiceOn(out, toSiphon.enable) && toSiphon.sub === '1 Sap.', 'siphon stays open')
ok(walk(out, 'walk-trench').sceneId === 'ch3:trench', 'the trench road arrives')
ok(walk({ ...out, sap: 8 }, 'walk-siphon').sceneId === 'ch3:siphon', 'the siphon road arrives')
const trench = walk(out, 'walk-trench')
const backExit = visibleChoices(trench).find((c) => c.id === 'walk-capture')
ok(!!backExit && !isChoiceOn(trench, backExit.enable) && backExit.locked === ROAD_NOT_NOW, 'the exit walk stays sealed')

console.log(fails ? `v229 FAILED ${fails}` : 'v229: all pass')
process.exit(fails ? 1 : 0)

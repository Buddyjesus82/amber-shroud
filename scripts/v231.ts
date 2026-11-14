/** v231: Crosshaven is playable, the Rubble Crawl pays, Kaelen cycles, Outcast costs are proposed. */
import { readFileSync } from 'node:fs'
import { DOORS } from '../src/game/content/catalog.ts'
import { KAELEN_ASKS } from '../src/game/kaelenAsks.ts'
import { RUBBLE_FORCE, RUBBLE_HEAT, RUBBLE_HEALTH, RUBBLE_PICK, RUBBLE_SAP } from '../src/game/rubble.ts'
import { applyEffect, isChoiceOn, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v234'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v234'"), 'build v231')

const FRINGE = "The noise of the perimeter drops behind you, replaced by the low hum of Crosshaven's outer filters. Lantern light cuts through the grease-haze on the shanties. You've made it off the flats, but the inner gates are locked tight."
ok(getScene('ch3:crosshaven').kind === 'story' && getScene('ch3:crosshaven').body === FRINGE, 'Crosshaven is a story scene with the fringe body')

function tent(): GameState {
  const base = newGame('vessel')
  let s = applyEffect({ ...base, sap: 8, items: { ...base.items, spire_key: 1 } }, { goto: 'ch3:capture' })
  s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'fight')!.effects)
  s = applyEffect({ ...s, sap: 6 }, visibleChoices(s).find((c) => c.id === 'slip')!.effects)
  s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'leave')!.effects)
  return { ...s, sap: 6, flags: { ...s.flags, ch3VaultDone: true } }
}

const atTent = tent()
const go = visibleChoices(atTent).find((c) => c.id === 'go')
ok(!!go && go.effects.sap === -2 && !visibleChoices(atTent).some((c) => c.id === 'walk-crosshaven'), 'the tent has one Crosshaven button and no duplicate walk')
const fringe = applyEffect(atTent, go!.effects)
ok(fringe.sceneId === 'ch3:crosshaven' && fringe.sap === 4, 'the button still spends 2 Sap')
const back = visibleChoices(fringe).find((c) => c.label === 'Walk to Command Tent')
ok(!!back && !back.sub && back.effects.sap == null && back.effects.goto === 'ch3:tent' && !visibleChoices(fringe).some((c) => c.id === 'title'), 'the only way out is a free walk to the tent')
const returned = applyEffect(fringe, back!.effects)
ok(returned.sceneId === 'ch3:tent' && returned.sap === fringe.sap, 'the walk back spends no Sap')
ok(travelTo(fringe, 'ch3:tent').sap === fringe.sap && travelTo(atTent, 'ch3:crosshaven').sap === atTent.sap - 2, 'the map agrees: 2 Sap out, free back')

const stub = repairLoadedState({
  ...newGame('vessel'),
  sceneId: 'ch3:crosshaven',
  hubId: 'barrow',
  sap: 4,
  flags: { ...newGame('vessel').flags, ch3StubSeen: true, ch3VaultDone: true },
})
ok(stub.sceneId === 'ch3:crosshaven' && getScene(stub.sceneId).kind === 'story' && !!stub.flags.ch3StubSeen, 'an old stub save loads the new scene and keeps ch3StubSeen')
ok(visibleChoices(stub).some((c) => c.label === 'Walk to Command Tent') && !visibleChoices(stub).some((c) => c.id === 'title'), 'the loaded stub can still walk')

const LOOT = ['Scrap +1.', 'Resin +1.', 'Drop +1.']
const seen = new Set<string>()
for (let ticks = 0; ticks < 24; ticks++) {
  const crawl: GameState = { ...newGame('vessel'), sceneId: 'deep:rubble', sap: 5, health: 6, ticks, items: {} }
  const picked = applyEffect(crawl, visibleChoices(crawl).find((c) => c.id === 'squeeze')!.effects)
  const lines = (picked.flash ?? '').split('\n')
  ok(picked.sceneId === 'deep:shanty' && picked.sap === 4 && lines[0] === RUBBLE_PICK && lines[1] === RUBBLE_SAP && LOOT.includes(lines[2]), `pick ${ticks} is Sap −1 plus one find`)
  const item = lines[2] === 'Scrap +1.' ? 'scrap' : lines[2] === 'Resin +1.' ? 'salve' : 'vial_drop'
  ok((picked.items[item] ?? 0) === 1, `pick ${ticks} puts the find in the bag`)
  seen.add(lines[2])
}
ok(seen.size === 3, 'the crawl can yield Scrap, Resin, or a Drop')

const armed: GameState = { ...newGame('vessel'), sceneId: 'deep:rubble', sap: 5, health: 6, items: { scrap: 1 }, heat: { cartel: 0, seekers: 0, strays: 1 } }
const force = visibleChoices(armed).find((c) => c.id === 'clear')!
const bare: GameState = { ...armed, items: {} }
ok(!isChoiceOn(bare, visibleChoices(bare).find((c) => c.id === 'clear')!.enable), 'Force still needs a heavy tool')
const shoved = applyEffect(armed, force.effects)
ok(shoved.sap === 5 && shoved.health === 5 && shoved.heat.strays === 2 && shoved.sceneId === 'deep:shanty', 'Force costs Health and Stray Heat, not Sap')
ok(shoved.flash === `${RUBBLE_FORCE}\n${RUBBLE_HEAT}\n${RUBBLE_HEALTH}`, 'Force result lines are Heat and Health')

let ask = applyEffect(newGame('vessel'), { goto: 'roam:kaelen', flag: { heardKallik: true, kaelenKnown: true } })
const heard: string[] = []
for (let n = 0; n < KAELEN_ASKS.length + 1; n++) {
  const row = visibleChoices(ask).find((c) => c.id === 'kallik-again')
  ok(!!row, 'Ask if there is anything new stays after Kallik')
  ask = applyEffect(ask, row!.effects)
  heard.push(ask.flash ?? '')
  ok(ask.flags.kaelenRumorAt === (n + 1) % KAELEN_ASKS.length, `rumor index persists at ${n}`)
}
ok(heard.slice(0, 8).join('\n') === KAELEN_ASKS.join('\n') && heard[8] === KAELEN_ASKS[0], 'the eight lines play in order and wrap')
ok(KAELEN_ASKS[0] === '"Keep your voice down. The Seeker patrols run these wire-runs twice an hour, and they don\'t like scavengers trading in the open."', 'line 1')
ok(KAELEN_ASKS[7] === '"The wind\'s shifting from the north. Means a dust-choke by morning. Stock up or get under cover while the gaps are still clear."', 'line 8')

ok(DOORS.outcast.sap === 3 && newGame('outcast').sap === 3, 'proposed: Outcast starts at Sap 3')
const ridge = applyEffect(newGame('outcast'), { goto: 'spine:ridge' })
const shade = visibleChoices(ridge).find((c) => c.id === 'shade')
ok(shade?.label === "Walk to Silas's tent" && shade.effects.sap === -1, 'proposed: the tent walk costs 1 Sap')
let shelf = applyEffect({ ...newGame('outcast'), sap: 6 }, { goto: 'spine:silas', add: { scrap: 3 } })
const buy = visibleChoices(shelf).find((c) => c.id === 'shop-buy')
if (buy) shelf = applyEffect(shelf, buy.effects)
const knife = visibleChoices(shelf).find((c) => c.id === 'knife')
ok(knife?.label === 'Buy Needle Knife — 2 scrap' && knife.effects.pay?.scrap === 2 && knife.effects.flash === '"Thin and mean. For resin and Hounds." He counts the scrap twice.', 'Silas still sells the Needle Knife for 2 scrap, with his line intact')

console.log(fails ? `v231 FAILED ${fails}` : 'v231: all pass')
process.exit(fails ? 1 : 0)

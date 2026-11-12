/** v230: capture costs, picked-clean Chapter 3 scavenge, the Do box, the empty wagon, and the 2-Sap Crosshaven leg. */
import { readFileSync } from 'node:fs'
import { CH3_WAGON_EMPTY } from '../src/game/content/luminspire.ts'
import { applyEffect, bodyOf, hideDoBox, newGame, scavenge, travelTo, visibleChoices } from '../src/game/engine.ts'
import { handsLeft } from '../src/game/hands.ts'
import { effectPills } from '../src/game/kit.ts'
import { PICKED_CLEAN, scavengeLock } from '../src/game/scavenge.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v230'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v230'"), 'build v230')

function capture(patch: Partial<GameState> = {}): GameState {
  const base = newGame('vessel')
  return applyEffect({ ...base, sap: 8, health: 6, ...patch }, { goto: 'ch3:capture' })
}

function press(state: GameState, id: string): GameState {
  const row = visibleChoices(state).find((c) => c.id === id)
  if (!row) throw new Error(`no ${id}`)
  return applyEffect(state, row.effects)
}

const ran = press(capture(), 'run')
ok(ran.sceneId === 'ch3:wagon' && !!ran.flags.ch3Stripped && ran.flags.ch3Strip == null, 'run still strips onto the wagon')
ok(ran.flags.ch3SapStash === 6 && ran.sap === 0, 'run spends Sap −2, then the strip takes what is left')
ok(ran.heat.seekers === capture().heat.seekers + 2, 'run raises Seeker Heat by 2')
ok(ran.flash?.startsWith('Sap −2.\nSeeker Heat +2.\n'), 'run result is two plain stat lines')
ok(!hideDoBox(ran), 'the collared wagon keeps the Do box')

const fought = press(capture(), 'fight')
ok(fought.sceneId === 'ch3:wagon' && !!fought.flags.ch3Stripped, 'fight still strips onto the wagon')
ok(fought.health === 5 && fought.heat.seekers === capture().heat.seekers, 'fight costs Health −1 and no heat')
ok(fought.flash?.startsWith('Health −1.\n'), 'fight result is one plain stat line')

const dry = press(capture({ sap: 2 }), 'run')
ok(dry.sceneId === 'ch3:wagon' && !!dry.flags.ch3Stripped && !dry.flags.runOver, 'a dry run stays captured on the wagon')
ok(dry.sap === 3 && handsLeft(dry) === handsLeft(capture()) - 1, 'Sap 0 on the run spends a hand and refills to 3')
ok(dry.flash?.includes('Sap −2.') && dry.flash.includes('Seeker Heat +2.') && dry.flash.includes('A hand goes to getting up.'), 'the stat lines survive the hand rescue')

const spent = press(capture({ sap: 1, hands: 0 }), 'run')
ok(spent.sceneId === 'ch3:wagon' && !!spent.flags.ch3Stripped && !!spent.flags.runOver && spent.sap === 0 && spent.health === 0, 'no hands left ends the attempt on the wagon')
ok(hideDoBox(spent), 'a spent attempt hides the Do box')

const fallen = press(capture({ health: 1 }), 'fight')
ok(fallen.sceneId === 'ch3:wagon' && !!fallen.flags.downed && !!fallen.flags.ch3Stripped && fallen.flash?.includes('Health −1.'), 'a fight to Health 0 is still the wagon strip')

const COOL = 'This patch is already in your hands. Walk, wait, or try another stretch.'
function spot(sceneId: 'ch3:trench' | 'ch3:relay' | 'camp:yard'): GameState {
  const base = newGame('vessel')
  return { ...base, sceneId, hubId: sceneId.startsWith('ch3:') ? 'barrow' : 'camp', sap: 6, ticks: 4 }
}
for (const id of ['ch3:trench', 'ch3:relay'] as const) {
  const once = scavenge(spot(id))
  const scrap = once.items.scrap ?? 0
  const later = scavenge({ ...once, ticks: once.ticks + 10 })
  ok(scavengeLock(once) === PICKED_CLEAN && scavengeLock(later) === PICKED_CLEAN, `${id} stays picked clean`)
  ok((later.items.scrap ?? 0) === scrap && later.flash === COOL, `${id} does not refill for the rest of the chapter`)
}
const yard = scavenge(spot('camp:yard'))
const rested = { ...yard, ticks: yard.ticks + 2 }
ok(scavengeLock(yard) === PICKED_CLEAN && scavengeLock(rested) === null, 'a camp patch still refills after two ticks')
ok(scavenge(rested).flash !== COOL, 'the refilled camp patch can be worked again')

const crisis = { ...newGame('vessel'), sceneId: 'crisis:thresh' as const, sap: 0 }
ok(hideDoBox(crisis), 'the Sap-zero rescue screen hides the Do box')
ok(!hideDoBox({ ...crisis, sap: 3 }), 'a recovered rescue screen keeps the Do box')

const collared = press(capture(), 'fight')
const COLLARED = 'A Retriever transport wagon. Collared. The crystal walls of Luminspire climb ahead.'
ok(bodyOf(collared).startsWith(COLLARED) && !bodyOf(collared).includes('wagon frame is empty'), 'before the escape the wagon stays collared')
ok(bodyOf({ ...collared, flags: { ...collared.flags, ch3Helper: 'wren' } }).includes("Wren Blackthorn's hand stops on the latch."), 'the Wren wagon line stays')
ok(bodyOf({ ...collared, flags: { ...collared.flags, ch3Helper: 'corvus' } }).includes('Corvus calls a false scent to the east.'), 'the Corvus wagon line stays')
let escaped = { ...collared, sap: 6 }
escaped = press(escaped, 'slip')
ok(!!escaped.flags.ch3Out && escaped.sceneId === 'ch3:supply', 'slip is the escape')
escaped = { ...escaped, sap: 4 }
const back = visibleChoices(escaped).find((c) => c.effects.goto === 'ch3:wagon' && c.id.startsWith('walk-'))
if (!back) throw new Error('no walk back to the wagon')
const emptyWagon = applyEffect(escaped, back.effects)
ok(bodyOf(emptyWagon) === CH3_WAGON_EMPTY, 'after the escape the wagon body is the empty frame')
ok(bodyOf({ ...emptyWagon, flags: { ...emptyWagon.flags, ch3Helper: 'wren' } }) === CH3_WAGON_EMPTY, 'the empty frame replaces the Wren line')
ok(bodyOf({ ...emptyWagon, flags: { ...emptyWagon.flags, ch3Helper: 'corvus' } }) === CH3_WAGON_EMPTY, 'the empty frame replaces the Corvus line')

let tent = press(escaped, 'leave')
tent = { ...tent, sap: 6, items: { ...tent.items }, flags: { ...tent.flags, ch3VaultDone: true } }
delete tent.items.vial_drop
const go = visibleChoices(tent).find((c) => c.id === 'go')
const fringeWalk = visibleChoices(tent).find((c) => c.id === 'walk-crosshaven')
ok(!!go && go.label === 'Crosshaven Fringe' && go.sub === 'Out past the perimeter.\n2 Sap.' && go.effects.sap === -2, 'the tent button keeps the perimeter line above 2 Sap')
ok(!!fringeWalk && fringeWalk.sub === '2 Sap.' && fringeWalk.effects.sap === -2, 'the walk charges 2 Sap')
ok(effectPills(go!.effects).some((p) => p.text === 'Sap -2') && effectPills(fringeWalk!.effects).some((p) => p.text === 'Sap -2'), 'both buttons show the Sap -2 chip')
const byButton = applyEffect(tent, go!.effects)
ok(byButton.sceneId === 'ch3:crosshaven' && byButton.sap === 4, 'the button spends 2 Sap and arrives')
const hopped = travelTo(tent, 'ch3:crosshaven')
ok(hopped.sceneId === 'ch3:crosshaven' && hopped.sap === 4, 'the map hop spends 2 Sap and arrives')
const backEdge = travelTo({ ...hopped, sap: 6 }, 'ch3:tent')
ok(backEdge.sceneId === 'ch3:tent' && backEdge.sap === 4, 'the road back to the tent is also 2 Sap')
const dryLeg = applyEffect({ ...tent, sap: 2 }, go!.effects)
ok(dryLeg.sceneId === 'ch3:crosshaven' && dryLeg.sap === 3 && handsLeft(dryLeg) === handsLeft(tent) - 1 && !dryLeg.flags.runOver, 'emptying the leg spends a hand and stays on the fringe')
const dryHop = travelTo({ ...tent, sap: 2 }, 'ch3:crosshaven')
ok(dryHop.sceneId === 'ch3:crosshaven' && dryHop.sap === 3 && handsLeft(dryHop) === handsLeft(tent) - 1, 'an emptying map hop uses the same rescue')

console.log(fails ? `v230 FAILED ${fails}` : 'v230: all pass')
process.exit(fails ? 1 : 0)

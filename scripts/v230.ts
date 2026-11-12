/** v230: capture Run/Fight costs, Chapter 3 scavenge stays picked clean, the Do box hides on a Sap-zero rescue. */
import { readFileSync } from 'node:fs'
import { applyEffect, hideDoBox, newGame, scavenge, visibleChoices } from '../src/game/engine.ts'
import { handsLeft } from '../src/game/hands.ts'
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

console.log(fails ? `v230 FAILED ${fails}` : 'v230: all pass')
process.exit(fails ? 1 : 0)

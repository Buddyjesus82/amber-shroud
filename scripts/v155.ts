/**
 * v155: Vessel opening. Rig -> The Stairs (new, rubble) -> Thalia (the old 'The Stairs', renamed).
 *   npx tsx scripts/v155.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v191'"), 'SW cache v155')
const pick = (s: GameState, id: string) => applyEffect(s, visibleChoices(s).find((c) => c.id === id)!.effects)
const art = (s: GameState) => playCoverFile(playCoverKey(s, sceneOf(s)))
const base = newGame('vessel')
const rig = (o: Partial<GameState> = {}) => ({ ...base, sceneId: 'thresh:crucible-rig', ...o, flags: { ...base.flags, noMasked: true, ...o.flags } }) as GameState

const st = pick(rig(), 'slip')
ok(st.sceneId === 'thresh:stairs', `rig leads to The Stairs (${st.sceneId})`)
ok(sceneOf(st).title === 'The Stairs' && sceneOf(st).body.startsWith('Rubble chokes the stairs'), 'Stairs text')
ok(art(st) === 'stairs.jpg', `Stairs art is its own (v169) (${art(st)})`)
ok(!sceneOf(st).speaker, 'no speaker on the Stairs')

const top = getTop(st, 'clear')
function getTop(s: GameState, id: string) { return pick({ ...s, flash: undefined }, id) }
ok(top.sceneId === 'thresh:crucible-stairs' && sceneOf(top).title === 'Thalia', 'Clear reaches Thalia (title Thalia)')
ok(top.sap === st.sap - 1 && top.flags.stairsCleared, 'Clear costs 1 Sap and sets the flag')
ok(top.flash === 'You haul brick aside until the steps show. Your arms ache.', `clear line (${top.flash})`)
ok(art(top) === 'thalia.jpg', 'Thalia keeps her portrait')
ok(sceneOf(top).body.startsWith('Thalia waits at the top of the stairs.') && visibleChoices(top).some((c) => c.id === 'keep'), 'Thalia text and choices unchanged')

const dry = { ...st, sap: 0 }
const clear = visibleChoices(dry).find((c) => c.id === 'clear')!
ok(!isChoiceOn(dry, clear.enable) && clear.locked === 'Needs 1 Sap.', 'Clear locked at 0 Sap')

let hits = 0, misses = 0, downs = 0
for (let t = 0; t < 60; t++) {
  const s = { ...st, ticks: t, flash: undefined }
  const n = pick(s, 'climb')
  ok(n.sceneId === 'thresh:crucible-stairs' && n.flags.stairsCleared, 'Climb reaches Thalia with the flag')
  if (n.health === s.health - 1) { hits++; ok(n.flash === 'You scramble up the loose pile. A brick shifts under your foot.\n\nHealth -1.', `hit line (${n.flash})`) }
  else { misses++; ok(n.health === s.health && n.flash === 'You scramble up the loose pile. A brick shifts under your foot.', `miss (${n.flash})`) }
  const low = pick({ ...s, health: 1 }, 'climb')
  if (low.health <= 0) { downs++; ok(low.flags.downed || sceneOf(low).kind === 'crisis', `0 Health goes Down (${low.sceneId})`) }
}
ok(hits > 8 && misses > 25, `about 1 in 3 (${hits}/${hits + misses})`)
ok(downs === hits, 'every 1-Health hit is a Down')

const back = applyEffect(rig({ flags: { ...newGame('vessel').flags, stairsCleared: true } }), { goto: 'thresh:stairs' })
ok(back.sceneId === 'thresh:crucible-stairs', 'cleared: straight to Thalia')
const typed = interpret(st, 'look')
ok(typed.sceneId === 'thresh:stairs' && !!typed.flash, 'Do box works on the Stairs')
const saved = JSON.parse(JSON.stringify(st)) as GameState
ok(sceneOf(saved).id === 'thresh:stairs' && visibleChoices(saved).length === 2, 'Stairs survives a save round-trip')
console.log(fails ? `v155: ${fails} failure(s)` : 'v155: all ok')
process.exit(fails ? 1 : 0)

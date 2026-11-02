/** v202 (draft): Heat names only real hunters, live per ground; Seeker Command Valerius win cools Seeker Heat. npx tsx scripts/v202.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { heatFactions, heatRiseLine, HEAT_TIP } from '../src/game/heat.ts'
import { heatNow } from '../src/game/heatNow.ts'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const NON = /Jaxson|Silas|Kaelen|trader|Ironwood|Drennick|Ossa|Thalia|Brin|Kesh/
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const [f, c] of Object.entries(heatFactions(door))) {
    ok(!NON.test(c.watch + c.body), `${door} ${f}: no non-hunters`)
    ok(heatRiseLine(f as never, 1, door).endsWith(`${c.watch}.`), `${door} ${f}: rise line uses the watch list`)
  }
}
ok(!NON.test(HEAT_TIP.body + HEAT_TIP.title), 'tip clean')
ok(heatFactions('prisoner').cartel.watch === 'Valerius, the Hound-handler, a paid ambusher on the roads, a Turreted Skiff at Cartel Heat 6+', 'Prisoner Cartel list')
ok(!/Valerius|Hound/.test(heatFactions('outcast').cartel.watch + heatFactions('vessel').cartel.watch), 'no Camp-04 hunters off the Prisoner door')
ok(/Nim/.test(heatFactions('outcast').strays.watch) && !/Nim/.test(heatFactions('prisoner').strays.watch), 'Nim only for Outcast')
ok(/Commander Valerius/.test(heatFactions('vessel').seekers.watch), 'v209: Vessel lists Commander Valerius')

const g = (door: DoorId, hubId: string, sceneId: string, heat: Partial<GameState['heat']>, flags: Record<string, unknown> = {}) => {
  const s = newGame(door)
  return { ...s, hubId, sceneId, heat: { ...s.heat, cartel: 0, seekers: 0, strays: 0, ...heat }, flags: { ...s.flags, ...flags } } as GameState
}
ok(heatNow(g('prisoner', 'camp04', 'camp:yard', {}), 'cartel')[0] === 'No one is after you.', 'heat 0 = no one')
ok(heatNow(g('prisoner', 'camp04', 'camp:yard', { cartel: 2 }), 'cartel').join('|') === 'At Camp-04: the Hound-handler.', 'camp handler')
ok(heatNow(g('prisoner', 'camp04', 'camp:yard', { cartel: 8 }), 'cartel').join('|') === 'At Camp-04: Valerius himself.|On the roads: a Turreted Skiff.', 'camp Valerius')
ok(heatNow(g('outcast', 'spine', 'spine:hub', { strays: 2 }), 'strays')[0] === 'On the Spine: a Stray collector.', 'spine collector')
ok(heatNow(g('outcast', 'spine', 'spine:hub', { strays: 5 }), 'strays').join('|') === 'On the Spine: Nim.|On the roads: the Stray Hunter, with a shard-hound.|On the roads: a Stray collector.', 'spine Nim')
ok(heatNow(g('vessel', 'threshold', 'thresh:court', { seekers: 6 }), 'seekers').join('|') === 'At the Threshold: a Court Guard.|At the Threshold: a Seeker Hound-Handler.|At Seeker Command: Valerius.|On the roads: Seeker runners.', 'threshold')
ok(heatNow(g('prisoner', 'redmaw', 'maw:hub', { seekers: 1 }), 'seekers')[0] === 'At Red Maw: Sybella.', 'maw Sybella')
ok(heatNow(g('prisoner', 'camp04', 'camp:yard', { seekers: 1 }), 'seekers')[0] === 'No one on this ground yet.', 'off-ground')

ok(heatNow(g('prisoner', 'redmaw', 'maw:hub', { seekers: 0 }, { thaliaFavor: true }), 'seekers')[0] === 'At Red Maw: Sybella.', 'favor: Maw counts +2')
ok(heatNow(g('vessel', 'threshold', 'thresh:court', { seekers: 0 }, { thaliaFavor: true }), 'seekers')[0] === 'At the Threshold: a Court Guard.', 'favor: Threshold counts +2')
ok(heatNow(g('prisoner', 'camp04', 'camp:yard', { seekers: 0 }, { thaliaFavor: true }), 'seekers')[0] === 'No one is after you.', 'favor: no effect off those grounds')
const enc = readFileSync('src/game/encounter.ts', 'utf8')
ok(enc.includes("state.sceneId === 'thresh:command'") && enc.includes('heat: command ? { seekers: -1 } : { cartel: -1 }'), 'Command win: Seeker Heat -1, Camp-04 unchanged')
// Live: the command-hot choice starts the fight on thresh:command.
const v = g('vessel', 'threshold', 'thresh:gate', { seekers: 6 }, { noMasked: true })
const hot = visibleChoices(v).find((c) => c.id === 'command-hot')
ok(hot, `command-hot visible (${visibleChoices(v).map((c) => c.id)})`)
if (hot) { const a = applyEffect(v, hot.effects); ok(a.sceneId === 'thresh:command', `ambush stays on thresh:command (${a.sceneId})`) }
console.log(fails ? `v202: ${fails} FAIL` : 'v202: all ok')
process.exit(fails ? 1 : 0)

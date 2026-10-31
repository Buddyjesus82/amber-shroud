/**
 * v157: The Stairs from the Court look like the opening ones: no Scavenge, no Map, no hub sub-label.
 *   npx tsx scripts/v157.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { canScavenge } from '../src/game/scavenge.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v179'"), 'SW cache v157')
const base = newGame('vessel')
const pick = (s: GameState, id: string) => applyEffect({ ...s, flash: undefined }, visibleChoices(s).find((c) => c.id === id)!.effects)
const court = { ...base, sceneId: 'thresh:court', hubId: 'threshold', flags: { ...base.flags, noMasked: true } } as GameState
ok(canScavenge(court), 'Court still scavenges')
const st = pick(court, 'thalia')
ok(st.sceneId === 'thresh:stairs' && st.hubId === 'threshold', 'Court -> Stairs, still in the hub')
ok(!canScavenge(st), 'no Scavenge on the Stairs from the Court')
ok(visibleChoices(st).map((c) => c.id).join(',') === 'clear,climb', 'only the two choices')
const typed = interpret(st, 'scavenge')
ok(typed.sceneId === 'thresh:stairs' && JSON.stringify(typed.items) === JSON.stringify(st.items), 'typed scavenge finds nothing on the Stairs')
const top = pick(st, 'clear')
ok(top.sceneId === 'thresh:thalia' && canScavenge(top), 'dais Thalia keeps its usual buttons')
const src = readFileSync('src/components/PlayScreen.tsx', 'utf8')
ok(src.includes('NO_HUB_LABEL = new Set<string>([STAIRS])') && (src.match(/!NO_HUB_LABEL\.has\(scene\.id\)/g) ?? []).length === 2, 'no hub sub-label on the Stairs (live and held)')
ok(src.includes('noNav: !showNav') && src.includes('showNav && !held?.noNav'), 'Map stays hidden on the held Stairs result')
console.log(fails ? `v157: ${fails} failure(s)` : 'v157: all ok')
process.exit(fails ? 1 : 0)

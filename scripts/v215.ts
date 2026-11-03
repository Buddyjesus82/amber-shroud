import { applyEffect, newGame, visibleChoices } from '../src/game/engine'
import type { GameState } from '../src/game/types'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL ' + m) } }
const pick = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const go = (s: GameState, id: string) => applyEffect(s, pick(s, id)!.effects)
for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const g = newGame(door)
  let s = go({ ...g, sceneId: 'spine:sable', flags: { ...g.flags, noMasked: true } } as GameState, 'sable_stand')
  for (let i = 0; i < 40 && !s.flags.sableWon; i++) { s = { ...s, health: s.healthMax }; s = go(s, pick(s, 'enc-continue') ? 'enc-continue' : 'enc-fight') }
  ok(s.flags.sableWon && String(s.flags.encounterClash).includes('Nice footwork.'), 'win line ' + door)
  s = go(s, 'enc-continue')
  ok(!pick(s, 'sable_stand') && !pick(s, 'sable_refuse') && pick(s, 'back'), 'no loop, no coward ' + door)
}
console.log(fails ? `v215 FAILED ${fails}` : 'v215 ok')
if (fails) process.exit(1)

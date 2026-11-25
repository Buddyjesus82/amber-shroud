/** v243: the Courtyard rip prints no 'Cartel Heat +1.' when Cartel Heat is already 8 (Jeramie, t1258u). */
import { readFileSync } from 'node:fs'
import { applyEffect, courtyardLoot, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
void getScene // loads content first (import order)

ok(readFileSync('src/version.ts', 'utf8').includes("'v258'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v258'"), 'build v253')

const RIP = 'Metal shrieks across the yard. A Cartel look-out on the upper tier stops pacing and listens.'
const LOOT_LINES: Record<string, string> = { scrap: 'Scrap +1.', salve: 'Resin +1.', vial_drop: 'Drop +1.' }
const yard = (door: DoorId, cartel: number): GameState => {
  const base = newGame(door)
  return { ...base, sceneId: 'ch3:courtyard', hubId: 'barrow', chapterId: 'luminspire', sap: 4, heat: { ...base.heat, cartel }, flags: { ...base.flags, ch3Started: true, ch3Stripped: true, ch3VaultDone: true, ch3TentOpen: true, crosshavenCablesCut: true, crosshavenGateOpen: true } }
}
const rip = (s: GameState) => applyEffect(s, visibleChoices(s).find((c) => c.id === 'rip-wreckage')!.effects)
const count = (s: GameState, k: string) => Number((s.items as Record<string, number>)[k] ?? 0)

for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  const s7 = yard(door, 7)
  const l7 = courtyardLoot(s7)
  const a = rip(s7)
  ok(a.heat.cartel === 8 && a.flash === [RIP, 'Cartel Heat +1.', LOOT_LINES[l7.item]].join('\n') && count(a, l7.item) === count(s7, l7.item) + 1, `${door}: at 7 the line shows and Heat goes to 8 (${a.flash})`)

  const s8 = yard(door, 8)
  const l8 = courtyardLoot(s8)
  const b = rip(s8)
  ok(b.heat.cartel === 8 && b.flash === [RIP, LOOT_LINES[l8.item]].join('\n') && count(b, l8.item) === count(s8, l8.item) + 1, `${door}: at 8 no Heat line, stays 8 (${b.flash})`)
  ok(b.flags.courtyardPulls === 1, `${door}: at 8 the pull still counts`)

  // Slow pull is untouched.
  const c = applyEffect(s8, visibleChoices(s8).find((x) => x.id === 'clear-debris')!.effects)
  ok(c.flash?.split('\n')[1] === 'Sap −1.' && c.heat.cartel === 8, `${door}: slow unchanged at 8`)
}

if (fails) { console.log(`v243: ${fails} failure(s)`); process.exit(1) }
console.log('v243 ok')

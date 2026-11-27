/** v251: button sub-lines drop a Heat line the meter can no longer take (at 8), game-wide (Jeramie). */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { capHeatSub } from '../src/game/heatLines.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v259'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v259'"), 'build v253')

const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const at = (door: DoorId, sceneId: string, heat: Partial<GameState['heat']>, flags: GameState['flags'] = {}, hubId: string | null = null): GameState => {
  const g = newGame(door)
  return { ...g, sceneId, hubId, sap: 4, health: 5, heat: { ...g.heat, ...heat }, flags: { ...g.flags, noMasked: true, ...flags } } as GameState
}

// ── Slip past the toll hut: sub is only a Heat line ──
const ch3 = { ch3Started: true, ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, ch3TentOpen: true, ch3VaultDone: true, crosshavenGateOpen: true, barrowMap: true }
const r7 = at('outcast', 'ch3:rustvein', { cartel: 7 }, ch3, 'barrow')
const r8 = at('outcast', 'ch3:rustvein', { cartel: 8 }, ch3, 'barrow')
ok(row(r7, 'slip-toll')?.sub === 'Cartel Heat +1.', 'Cartel 7: slip sub shows')
const s8 = row(r8, 'slip-toll')
ok(s8 && s8.sub === undefined && s8.label === 'Slip past the toll hut', 'Cartel 8: slip sub gone, button stays')
ok(row(at('outcast', 'ch3:rustvein', { cartel: 2, seekers: 8, strays: 8 }, ch3, 'barrow'), 'slip-toll')?.sub === 'Cartel Heat +1.', 'other meters at 8 do not touch a Cartel line')
const went = applyEffect(r8, s8!.effects)
ok(went.sceneId === 'ch3:causeway' && went.heat.cartel === 8 && went.flash === 'You keep low under the shutter. The pen stops scratching for a breath, then starts again.', 'Cartel 8: slip still works, no Heat line')

// ── Mixed sub, Seeker, with locked text: Free him quietly (ch2:v-bleed) ──
const b7 = at('vessel', 'ch2:v-bleed', { seekers: 7 })
const b8 = at('vessel', 'ch2:v-bleed', { seekers: 8 })
const q7 = row(b7, 'quiet')
const q8 = row(b8, 'quiet')
ok(q7?.sub === '1 Sap. Seeker Heat +1.', `Seeker 7: mixed sub whole (${q7?.sub})`)
ok(q8?.sub === '1 Sap.', `Seeker 8: only the Heat part goes (${q8?.sub})`)
ok(q8?.locked === 'Needs: the cloth, 1 Sap, Seeker Heat 3 or less' && q8?.locked === q7?.locked, 'locked text untouched')

// ── Mixed sub with text on both sides (Cartel): High-Risk Rig Contract ──
const contract = getScene('deep:drill-deck').choices.find((c) => c.id === 'contract')!
ok(contract.sub === '3 scrap. Cartel Heat +2. Once.' && capHeatSub(contract.sub, { cartel: 8 }) === '3 scrap. Once.' && capHeatSub(contract.sub, { cartel: 7 }) === contract.sub, 'contract: Heat part out at 8 only')
ok(capHeatSub('Wire-Cutter Shim. Cartel Heat +2. Skips Jaxson\'s job.', { cartel: 8 }) === "Wire-Cutter Shim. Skips Jaxson's job.", 'middle Heat sentence')

// ── Seeker / Stray examples ──
ok(capHeatSub('Seeker Heat +2.', { seekers: 8 }) === undefined && capHeatSub('Seeker Heat +2.', { seekers: 7 }) === 'Seeker Heat +2.', 'Seeker-only sub')
ok(capHeatSub('Seekers Heat +1.', { seekers: 8 }) === undefined, 'Seekers spelling')
ok(capHeatSub('Two Glints. Stray Heat +1.', { strays: 8 }) === 'Two Glints.' && capHeatSub('Strays Heat +1.', { strays: 8 }) === undefined, 'Stray lines')
ok(capHeatSub('Two Glints. Stray Heat +1.', { strays: 7, cartel: 8 }) === 'Two Glints. Stray Heat +1.', 'Stray below cap stays')
// v252: a ': X Heat +N.' tail inside a sentence now closes with a full stop (see scripts/v252.ts).
ok(capHeatSub('Two Glints. The collector hunts you next: Strays Heat +1.', { strays: 8 }) === 'Two Glints. The collector hunts you next.', 'in-sentence Heat tail trimmed (v252)')
// Falls and non-number Heat words are not touched.
ok(capHeatSub('Cartel Heat −1. Once.', { cartel: 8 }) === 'Cartel Heat −1. Once.' && capHeatSub('Sap and Cartel Heat.', { cartel: 8 }) === 'Sap and Cartel Heat.', 'falls and prose untouched')
ok(capHeatSub('Seeker Heat +1. Cartel Heat +2.', { seekers: 8, cartel: 8 }) === undefined && capHeatSub('Seeker Heat +1. Cartel Heat +2.', { seekers: 8 }) === 'Cartel Heat +2.', 'two lines, per meter')

// ── Below cap, nothing changes anywhere ──
const plain = at('outcast', 'ch3:rustvein', { cartel: 7, seekers: 7, strays: 7 }, ch3, 'barrow')
ok(JSON.stringify(visibleChoices(plain)) === JSON.stringify(visibleChoices({ ...plain, heat: { cartel: 0, seekers: 0, strays: 0 } })), 'no change below 8')

if (fails) { console.log(`v251: ${fails} failure(s)`); process.exit(1) }
console.log('v251 ok')

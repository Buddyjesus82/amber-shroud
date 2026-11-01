/** v197: door Siphon spots hand over the Seeker Extractor (Case A) or slot the Module (Case B). npx tsx scripts/v197.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { applyDrawResin, mawSpot } from '../src/game/scavenge.ts'
import { SIPHON_PRISONER, SIPHON_VESSEL, SIPHON_OUTCAST, SIPHON_SLOT_LABEL } from '../src/game/content/intoTheMaw.ts'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v198'"), 'SW cache v197')
ok(readFileSync('src/version.ts', 'utf8').includes("'v198'"), 'Build label v197')
const SPOTS: [DoorId, string, string, string, string, Record<string, unknown>][] = [
  ['prisoner', 'ch1:end', 'stash', SIPHON_PRISONER, 'stash', {}],
  ['vessel', 'ch2:v-outpost', 'locker', SIPHON_VESSEL, 'locker', { chapter1Done: true, chapter2Unlocked: true }],
  ['outcast', 'ch2:o-root', 'scout', SIPHON_OUTCAST, 'corpse', { chapter1Done: true, chapter2Unlocked: true }],
]
for (const [door, sceneId, id, text, where, flags] of SPOTS) {
  for (const siphonNet of [false, true]) {
    for (const blade of [false, true]) {
      const g = newGame(door)
      const items = { ...g.items, ...(blade ? { seeker_extractor: 1 } : {}), ...(siphonNet ? { memory_siphon: 1 } : {}) }
      const s = { ...g, sceneId, hubId: sceneId === 'ch1:end' ? 'redmaw' : null, items, equipped: blade ? { ...g.equipped, weapon: 'seeker_extractor' } : g.equipped, flags: { ...g.flags, noMasked: true, ...flags, ...(siphonNet ? { siphonGot: true } : {}) } } as GameState
      const tag = `${door} ${blade ? 'B' : 'A'}${siphonNet ? ' (net)' : ''}`
      const rows = visibleChoices(s).filter((c) => c.id === id)
      ok(rows.length === 1, `${tag}: one spot row (${rows.length})`)
      const c = rows[0]
      if (!c) continue
      const r = applyEffect(s, c.effects)
      ok((r.items.memory_siphon ?? 0) === 1, `${tag}: one Memory Siphon (${r.items.memory_siphon})`)
      ok((r.items.seeker_extractor ?? 0) + (r.equipped?.weapon === 'seeker_extractor' && !r.items.seeker_extractor ? 1 : 0) >= 1, `${tag}: has the Extractor`)
      ok(r.flags.siphonGot && r.flags.hasSiphonModule && r.flags.hasMemorySiphon, `${tag}: flags`)
      ok(!visibleChoices(r).some((x) => x.id === id), `${tag}: spot used up`)
      const flash = String(r.flash ?? '')
      if (!blade) {
        ok(c.label !== SIPHON_SLOT_LABEL && !r.flags.siphonTuned, `${tag}: Case A row`)
        ok(flash.includes(text.slice(0, 30)) && flash.includes(`You pull the curved Seeker blade from the ${where}. A heavy brass resin-core is already slotted into the guard, humming faintly with amber light.`), `${tag}: Case A text`)
      } else {
        ok(c.label === SIPHON_SLOT_LABEL && r.flags.siphonTuned, `${tag}: Case B row`)
        ok(/\nSap Harvest \+1\.$/.test(flash), `${tag}: Sap Harvest line`)
        ok((r.items.seeker_extractor ?? 0) === 1, `${tag}: no duplicate blade`)
      }
    }
  }
}
// Tuned resin at a Maw spot: v198 moved the bonus onto Resin (+2), no Sap.
const g = newGame('prisoner')
let spot: GameState | null = null
for (let i = 0; i < 50 && !spot; i++) { const s = { ...g, startedAt: 1000 + i, sceneId: 'ch2:ribs', hubId: null, sap: 3, items: { ...g.items, memory_siphon: 1 }, flags: { ...g.flags } } as GameState; if (mawSpot(s)) spot = s }
if (spot) {
  ok(applyDrawResin(spot).sap === 3 && (applyDrawResin(spot).items.salve ?? 0) === (spot.items.salve ?? 0) + 1, 'plain resin Resin +1, no Sap')
  { const t = applyDrawResin({ ...spot, flags: { ...spot.flags, siphonTuned: true } }); ok(t.sap === 3 && (t.items.salve ?? 0) === (spot.items.salve ?? 0) + 2, 'tuned resin Resin +2, no Sap') }
} else ok(false, 'spot')
console.log(fails ? `v197: ${fails} fail(s)` : 'v197: ok')
if (fails) process.exit(1)

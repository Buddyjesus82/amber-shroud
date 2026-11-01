/** v196: scavenge spots inside the Maw (Chapter Two) and Draw resin there. npx tsx scripts/v196.ts */
import { readFileSync } from 'node:fs'
import { newGame, scavenge, drawResin } from '../src/game/engine.ts'
import { canScavenge, canDrawResin, mawSpot, DRAW_RESIN_FLASH } from '../src/game/scavenge.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v198'"), 'SW cache v196')
ok(readFileSync('src/version.ts', 'utf8').includes("'v198'"), 'Build label v196')
const MAW = ['ch2:approach', 'ch2:gully', 'ch2:irongut', 'ch2:cache', 'ch2:ribs', 'ch2:vein', 'ch2:p-jaws', 'ch2:p-bays', 'ch2:v-scar', 'ch2:o-wash', 'ch2:o-root', 'ch2:p-sift']
for (const door of ['prisoner', 'vessel', 'outcast'] as const) {
  let on = 0, tot = 0
  for (let run = 0; run < 40; run++) {
    const g = newGame(door)
    for (const sceneId of MAW) {
      const s = { ...g, startedAt: 1_700_000_000_000 + run * 7919, sceneId, hubId: null, chapterId: 'ch2', flags: { ...g.flags, noMasked: true } } as GameState
      tot++
      if (mawSpot(s)) on++
      ok(mawSpot(s) === canScavenge(s), `${door} ${sceneId}: spot = scavenge`)
    }
  }
  ok(on > tot * 0.3 && on < tot * 0.7, `${door}: spots random about half (${on}/${tot})`)
}
const g = newGame('prisoner')
const base = { ...g, sceneId: 'ch2:ribs', hubId: null, chapterId: 'ch2', flags: { ...g.flags, noMasked: true } } as GameState
let spot: GameState | null = null
for (let i = 0; i < 50 && !spot; i++) { const s = { ...base, startedAt: 1_000 + i }; if (mawSpot(s)) spot = s }
ok(spot, 'found a spot')
if (spot) {
  const before = spot.items.scrap ?? 0
  const after = scavenge(spot)
  ok(after.sceneId === spot.sceneId && after.flash, 'scavenge stays and reports')
  ok(Object.keys(after.items).some((k) => (after.items as Record<string, number>)[k] !== (spot!.items as Record<string, number>)[k]) || after.flags.hunterHere, 'scavenge finds something')
  ok(!canDrawResin(spot), 'no Draw resin without Siphon or Extractor')
  const sip = { ...spot, sap: 3, items: { ...spot.items, memory_siphon: 1 } }
  ok(canDrawResin(sip), 'Draw resin with Memory Siphon')
  const ex = { ...spot, equipped: { ...spot.equipped, weapon: 'seeker_extractor' } } as GameState
  ok(canDrawResin(ex), 'Draw resin with Seeker Extractor')
  const r = drawResin(sip)
  ok((r.items.scrap ?? 0) === before + 1 && (r.items.salve ?? 0) === (sip.items.salve ?? 0) + 1 && r.sap === 3 && r.flash === DRAW_RESIN_FLASH, `resin: Resin +1, scrap +1, no Sap (${r.sap})`)
  ok(!canDrawResin(r), 'once per spot')
}
const ch1 = { ...base, sceneId: 'ch1:leave', chapterId: 'cache-run', startedAt: 5 } as GameState
ok(!mawSpot(ch1) && !canScavenge(ch1), 'Chapter One road unchanged')
ok(!mawSpot({ ...base, sceneId: 'ch2:end' }), 'no spot at the end')
console.log(fails ? `v196: ${fails} fail(s)` : 'v196: ok')
if (fails) process.exit(1)

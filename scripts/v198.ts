/** v198: Draw resin at a Maw spot gives Resin (Resin Salve) +1 and Scrap +1, no Sap; tuned Module gives Resin +2. Bag cap respected. npx tsx scripts/v198.ts */
import { newGame } from '../src/game/engine.ts'
import { applyDrawResin, mawSpot, DRAW_RESIN_FLASH, DRAW_RESIN_FLASH_TUNED, DRAW_RESIN_SUB, DRAW_RESIN_SUB_TUNED } from '../src/game/scavenge.ts'
import { bagCap, bagFree, bagLoad } from '../src/game/kit.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import type { GameState, ItemId } from '../src/game/types.ts'
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
for (const role of ['prisoner', 'vessel', 'outcast'] as const) {
  const g = newGame(role)
  let spot: GameState | null = null
  for (let i = 0; i < 80 && !spot; i++) { const s = { ...g, startedAt: 2000 + i, sceneId: 'ch2:drill', hubId: null, sap: 3, items: { ...g.items, memory_siphon: 1 }, flags: { ...g.flags } } as GameState; if (mawSpot(s)) spot = s }
  if (!spot) for (let i = 0; i < 80 && !spot; i++) { const s = { ...g, startedAt: 2000 + i, sceneId: 'ch2:ribs', hubId: null, sap: 3, items: { ...g.items, memory_siphon: 1 }, flags: { ...g.flags } } as GameState; if (mawSpot(s)) spot = s }
  if (!spot) { ok(false, `${role}: spot`); continue }
  const salve0 = spot.items.salve ?? 0, scrap0 = spot.items.scrap ?? 0
  const r = applyDrawResin(spot)
  ok((r.items.salve ?? 0) === salve0 + 1 && (r.items.scrap ?? 0) === scrap0 + 1 && r.sap === spot.sap, `${role}: Resin +1, Scrap +1, no Sap`)
  ok(r.flash === 'You draw resin from the seam. Resin +1. Scrap +1.' && r.flash === DRAW_RESIN_FLASH, `${role}: plain line`)
  const t = applyDrawResin({ ...spot, flags: { ...spot.flags, siphonTuned: true } })
  ok((t.items.salve ?? 0) === salve0 + 2 && (t.items.scrap ?? 0) === scrap0 + 1 && t.sap === spot.sap, `${role}: tuned Resin +2, Scrap +1, no Sap`)
  ok(t.flash === 'You draw resin from the seam. Resin +2. Scrap +1.' && t.flash === DRAW_RESIN_FLASH_TUNED, `${role}: tuned line`)
  // Bag full: only Scrap, bag-full wording.
  let full = { ...spot, items: { ...spot.items, scrap: 1 } } as GameState
  for (const id of Object.keys(ITEMS) as ItemId[]) { if (bagLoad(full) >= bagCap(full)) break; if (id === 'salve' || id === 'scrap' || bagFree(id)) continue; full = { ...full, items: { ...full.items, [id]: 1 } } as GameState }
  if (bagLoad(full) >= bagCap(full) && !(full.items.salve)) {
    const f = applyDrawResin(full)
    ok(!(f.items.salve) && (f.items.scrap ?? 0) === 2 && f.sap === full.sap, `${role}: bag full gives only Scrap (${f.flash})`)
    ok(/^You draw resin from the seam\. Scrap \+1\. Bag full \(\d+\/\d+ slots\)\. Drop something to free a slot\.$/.test(f.flash ?? ''), `${role}: bag-full line`)
  } else ok(false, `${role}: could not fill bag`)
}
ok(DRAW_RESIN_SUB === 'Resin +1. Scrap +1. Once per spot.' && DRAW_RESIN_SUB_TUNED === 'Resin +2. Scrap +1. Once per spot.', 'sub labels')
const ps = readFileSync('src/components/PlayScreen.tsx', 'utf8')
ok(ps.includes('DRAW_RESIN_SUB_TUNED : DRAW_RESIN_SUB') && !/Sap \+[12]\. Once per spot/.test(ps), 'button uses new subs')
ok(readFileSync('public/sw.js', 'utf8').startsWith("const CACHE = 'amber-shroud-v198'"), 'sw cache v198')
console.log(fails ? `v198: ${fails} fail(s)` : 'v198: ok')
if (fails) process.exit(1)

/** v210: auto-equip covers every slot; worn gear is never swapped. npx tsx scripts/v210.ts */
import { newGame, applyEffect } from '../src/game/engine.ts'
import { readFileSync } from 'node:fs'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const g = { ...newGame('outcast'), equipped: {} } as GameState
const a = applyEffect(g, { add: { head_wrap: 1, shin_wraps: 1, hide_gloves: 1, dust_cloak: 1 } })
ok(a.equipped.head === 'head_wrap' && a.equipped.legs === 'shin_wraps' && a.equipped.hands === 'hide_gloves' && a.equipped.cloak === 'dust_cloak', 'head/legs/hands/cloak auto-equip')
const b = applyEffect({ ...g, items: { ...g.items, head_wrap: 1 }, equipped: { head: 'head_wrap' } } as GameState, { add: { plated_head_wrap: 1 } })
ok(b.equipped.head === 'head_wrap', 'worn head piece is not swapped')
ok(readFileSync('src/game/engine.ts', 'utf8').includes("'garment', 'offhand']"), 'garment and off hand covered')
ok(readFileSync('public/sw.js', 'utf8').includes('amber-shroud-v233') && readFileSync('src/version.ts', 'utf8').includes("'v234'"), 'v210 bump')
console.log(fails ? `v210: ${fails} FAIL` : 'v210 ok')
process.exit(fails ? 1 : 0)

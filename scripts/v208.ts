/** v208: Kaelen's shim row waits until the grate job is done or passed up. npx tsx scripts/v208.ts */
import { newGame } from '../src/game/engine.ts'
import { offersFor, vendorFor } from '../src/game/trade.ts'
import type { GameState } from '../src/game/types.ts'
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const v = vendorFor('roam:kaelen')!
const mk = (chapterId: string | null, flags: Record<string, unknown> = {}, items: Record<string, number> = {}) => { const g = newGame('prisoner'); return { ...g, chapterId, sceneId: 'roam:kaelen', flags: { ...g.flags, ...flags }, items: { ...g.items, ...items } } as GameState }
const has = (s: GameState) => offersFor(s, v).some((o) => o.id === 'shim')
ok(!has(mk(null)), 'in Camp-04, job open: no shim row')
ok(!has(mk(null, { kaelenJob: true })), 'job started, not done: no shim row')
ok(has(mk(null, { kaelenEscape: true })), 'grate job done: shim row')
ok(has(mk('cache-run')), 'left camp without the grate (declined): shim row')
ok(has(mk('into-the-maw', { kaelenJob: true })), 'declined the grate in ch2: shim row')
ok(!has(mk('cache-run', { kaelenEscape: true }, { wire_cutter_shim: 1 })), 'hidden while holding a shim')
ok(!has({ ...mk('cache-run'), door: 'outcast' } as GameState), 'prisoner only')
ok(readFileSync('public/sw.js', 'utf8').includes('amber-shroud-v216') && readFileSync('src/version.ts', 'utf8').includes("'v216'"), 'v208 bump')
console.log(fails ? `v208: ${fails} FAIL` : 'v208 ok')
process.exit(fails ? 1 : 0)

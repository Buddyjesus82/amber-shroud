/** v173: covers are cache-first in the worker, precache never fails whole, stuck-cover recovery. npx tsx scripts/v173.ts */
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v174'"), 'SW cache v173')
ok(readFileSync('src/version.ts', 'utf8').includes("'v174'"), 'Build label v173')
ok(!sw.includes('cache.addAll(') && sw.includes('addEach(cache'), 'precache file by file')
ok(sw.includes("caches.match(req, { ignoreSearch: true }).then(\n        (hit) =>\n          hit ||"), 'images cache-first')
ok(sw.includes('withTimeout(fetch(req), 10000)'), 'image network timeout')
const ps = readFileSync('src/components/PlayScreen.tsx', 'utf8')
ok(ps.includes('function recoverCovers()') && ps.includes("amber-shroud.coverRecover"), 'one-shot cover recovery')
if (fails) { console.log(`v173: ${fails} fail`); process.exit(1) } else console.log('v173 ok')

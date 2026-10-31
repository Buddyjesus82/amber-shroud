/** v169: Approach split, Kip & Mara, Memory Siphon, Abyssal Ribs finale, renames, art. npx tsx scripts/v169.ts */
import { readFileSync, existsSync } from 'node:fs'
import { getScene } from '../src/game/content/index.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const J = (x: unknown) => JSON.stringify(x)
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v182'"), 'SW cache v169')
ok(readFileSync('src/version.ts', 'utf8').includes("'v182'"), 'Build label v169')
ok(existsSync('public/covers/stairs.jpg') && existsSync('public/covers/threshold.jpg'), 'stairs art, threshold kept')
ok(readFileSync('src/game/art.ts', 'utf8').includes("'stairs'"), 'stairs cover key')
ok(J(getScene('ch2:gate').choices).includes('ch2:approach'), 'gate -> approach')
const ap = J(getScene('ch2:approach').choices)
ok(ap.includes('ch2:gully') && ap.includes('ch2:ditch') && J(getScene('ch1:end').choices).includes('memory_siphon'), 'approach split + prisoner siphon (v171: at ch1:end)')
const d = J(getScene('ch2:ditch').choices)
ok(d.includes('cartel_transponder') && d.includes('kipDistrust') && d.includes('hands') && d.includes('"strays":1'), 'Kip & Mara')
const g = J(getScene('ch2:gully').choices)
ok(g.includes('spliced lead') && g.includes('long whistle') && g.includes('ch2:irongut'), 'gully splice')
ok(getScene('ch2:irongut').title === 'The Iron-Gut Pass', 'Iron-Gut Pass')
ok(!J(getScene('ch2:v-outpost').choices).includes('Silt-Bay Docks'), 'v179: vessel locker removed')
ok(J(getScene('ch2:o-root').choices).includes('memory_siphon'), 'outcast scout')
const r = getScene('ch2:ribs')
ok(String(r.body).includes('goggles pushed up over his copper mask'), 'Murch goggles')
const rc = J(r.choices)
ok(rc.includes('"scrap":3') && rc.includes('stripped') && rc.includes('bleedCore') && rc.includes('deep_memory_pearl') && (r.intents?.length ?? 0) >= 2, 'ribs choices')
ok(J(getScene('ch2:vein').choices).includes('ch2:heart'), 'vein -> heart')
ok(String(getScene('ch2:heart').body).includes('Barge horns'), 'barge horns')
ok(readFileSync('src/game/content/cacheRun.ts', 'utf8').includes('throw your weight against the choked bulkhead'), 'Sybella Push Past')
ok(!readFileSync('src/game/content/intoTheMaw.ts', 'utf8').match(/flying/i), 'no flying')
console.log(fails ? `${fails} FAILED` : 'v169 ok'); process.exit(fails ? 1 : 0)

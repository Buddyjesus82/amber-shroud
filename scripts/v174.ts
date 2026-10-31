/** v174: plain shop subtitles. npx tsx scripts/v174.ts */
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const t = readFileSync('src/game/trade.ts', 'utf8')
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v184'"), 'SW cache v174')
ok(readFileSync('src/version.ts', 'utf8').includes("'v184'"), 'Build label v174')
ok(t.includes("sub: 'Restores 3 Sap. Limit 2 per visit.'") && t.includes("perStop: { flag: 'kaelenDropsHere', n: 2 }"), 'Kaelen Drop line matches 2-per-visit')
ok(readFileSync('src/game/engine.ts', 'utf8').match(/sap: 3,\n\s+remove: \{ vial_drop: 1 \}/), 'Drop restores 3 Sap')
ok(readFileSync('src/game/engine.ts', 'utf8').match(/remove: \{ salve: 1 \},\n\s+health: 3/), 'Salve restores 3 Health')
ok(!/Two a stop|Health, not sap|on every price/.test(t), 'old lines gone')
ok(t.includes("SEEKER_MARKUP_NOTE].filter(Boolean).join('\\n')"), 'heat note on its own line')
ok(readFileSync('src/index.css', 'utf8').includes('white-space: pre-line'), 'sub renders line breaks')
if (fails) { console.log(`v174: ${fails} fail`); process.exit(1) } else console.log('v174 ok')

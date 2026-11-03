/** v209: tester fixes from the doors report. npx tsx scripts/v209.ts */
import { newGame, applyEffect } from '../src/game/engine.ts'
import { chapterTwoSummary, VEX_CORD_LINE } from '../src/game/content/intoTheMaw.ts'
import { SPARE_SAP_LOCK } from '../src/game/sapLock.ts'
import { readFileSync } from 'node:fs'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const src = (p: string) => readFileSync(p, 'utf8')
// 1: vein route
ok(src('src/game/content/phase2Camps.ts').includes('locked: `${VALERIUS_HOLDS} ${VALERIUS_ROUTE}`'), 'vein lock names the route')
// 2: key + siphon
ok(chapterTwoSummary({}, {}).includes('Spire Key: never found'), 'no key: never found')
ok(chapterTwoSummary({}, { spire_key: 1 }).includes('Spire Key: kept'), 'key: kept')
const g = newGame('prisoner') as GameState
ok(!/endCardContinue[\s\S]{0,400}memory_siphon/.test(src('src/game/engine.ts')), 'end card grants no Siphon')
// 3: sap labels
const all = `${(await import('node:child_process')).execSync('cat src/game/*.ts src/game/content/*.ts', { maxBuffer: 1 << 26 })}`
ok(!all.includes("'Needs: 2 Sap'") && SPARE_SAP_LOCK.startsWith('Costs 1 Sap'), 'sap labels match cost')
// 4: outcast
ok(src('src/game/content/intoTheMaw.ts').includes('if: GREG_BEATEN') && VEX_CORD_LINE.length > 0, 'greg beaten variant + cord line')
// 5: typos
ok(src('src/game/content/catalog.ts').includes('Abyssal Ribs.') && !/Abyssal Rib\./.test(src('src/game/content/catalog.ts')), 'Abyssal Ribs')
ok(/PROPER_KINDS[^\n]*'greg'/.test(src('src/game/encounter.ts')) && src('src/game/encounter.ts').includes('PLURAL_KINDS'), 'names + plurals')
// 6: masked toll once
ok(src('src/game/masked.ts').includes('!next.flags.maskedTolled'), 'masked toll once a run')
// 7: art
ok(src('src/game/art.ts').includes("if (kind === 'rigpatrol') return 'rig_vent_patrol'"), 'vent patrol art')
// 8: heat
ok(src('src/game/heat.ts').includes('Commander Valerius') && !src('src/game/heat.ts').includes('Seeker Command'), 'Commander Valerius')
// 9: auto-equip
const bare = { ...g, equipped: {} } as GameState
const a = applyEffect(bare, { add: { shiv: 1, scav_wrap: 1 } })
ok(a.equipped.weapon === 'shiv' && a.equipped.armor === 'scav_wrap', 'auto-equip into empty slots')
const b = applyEffect({ ...g, items: { ...g.items, wrench: 1 }, equipped: { weapon: 'wrench' } } as GameState, { add: { shiv: 1 } })
ok(b.equipped.weapon === 'wrench', 'no swap when slot is full')
ok(src('public/sw.js').includes('amber-shroud-v213') && src('src/version.ts').includes("'v213'"), 'v209 bump')
console.log(fails ? `v209: ${fails} FAIL` : 'v209 ok')
process.exit(fails ? 1 : 0)

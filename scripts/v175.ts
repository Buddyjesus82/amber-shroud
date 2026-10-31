/** v175: QA pure-bug fixes. npx tsx scripts/v175.ts */
import { readFileSync } from 'node:fs'
import { downedNote } from '../src/game/downed'
import { guardCooling } from '../src/game/engine'
import { isHungerCommand } from '../src/game/hunger'
import type { GameState } from '../src/game/types'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v179'"), 'SW cache v175')
ok(readFileSync('src/version.ts', 'utf8').includes("'v179'"), 'Build label v175')
ok(!isHungerCommand("take the pilgrim's scar", 'vessel', true) && isHungerCommand('take the gullet', 'vessel', true) && isHungerCommand("take the pilgrim's scar", 'vessel'), 'Scar is not the Chapter Two road')
ok(readFileSync('src/game/content/redMaw.ts', 'utf8').includes("all: [{ flagUnset: 'ribOpen' }"), 'rib +3 once')
const base = { hubId: 'threshold', sceneId: 'thresh:paddock', flags: {}, items: {}, sap: 3 } as unknown as GameState
const n = downedNote({ ...base, flags: { encounterKind: 'courtguard', sybellaHunting: true } } as GameState)
ok(!n.includes('skiff-shadow'), 'Court Guard loss not Sybella line')
ok(guardCooling({ flags: { guardCool: true, huntQuiet: 0 } }) && !guardCooling({ flags: { guardCool: true, huntQuiet: 99 } }), 'guard cooldown')
const tr = readFileSync('src/game/trade.ts', 'utf8')
ok(tr.includes('A thin Maw tooth. Weapon · Strike 3. Not Hound Hide. Equip it in Gear.') && tr.includes('Weapon · Strike 4. Pawned Ironwood.') && tr.includes('Hymn-shade rag. Armor · Shell 2. Not a vow.') && tr.includes('Binds a cut. Restores 3 Health. Not Sap.'), 'shop flavor restored with rule text')
if (fails) { console.log(`v175: ${fails} fail`); process.exit(1) } else console.log('v175 ok')

/** v168: three per-door Chapter Two routes, legacy gone, art wired. npx tsx scripts/v168.ts */
import { readFileSync, existsSync } from 'node:fs'
import { ALL_SCENES, getScene } from '../src/game/content/index.ts'
import { itemDesc, PLATE_RECIPE_NAMES, PLATE_RECIPE } from '../src/game/kit.ts'
import { CH2_STARTS } from '../src/game/content/intoTheMaw.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v182'"), 'SW cache v168')
ok(readFileSync('src/version.ts', 'utf8').includes("'v182'"), 'Build label v168')
for (const id of Object.values(CH2_STARTS)) ok(getScene(id), `start ${id}`)
for (const id of ['ch2:cache', 'ch2:trapped', 'ch2:heart', 'ch2:end']) ok(getScene(id), `shared ${id}`)
ok(!ALL_SCENES.some((s) => s.id === 'ch2:legacy'), 'legacy scene gone')
ok(!readFileSync('src/game/content/redMaw.ts', 'utf8').includes('ch2:legacy'), 'Rim legacy button gone')
for (const f of ['ch2_o_stakes']) ok(readFileSync('src/game/strayHunter.ts', 'utf8').includes(f), 'stray cover')
ok(existsSync('public/intro/cartel.jpg'), 'cartel intro art')
const vz = getScene('maw:zafir')
ok(String(vz.body).includes("Keep your hands off the saws unless you're buying."), 'Varro greeting_default')
ok(String(getScene('ch1:v-zafir').body).includes("You look like you walked out of a fresh wreck."), 'Varro greeting_vessel')
const ask = vz.choices.find((c) => c.id === 'plate-ask')
ok(ask && String(ask.effects.flash).includes('turn a Seeker blade cold') && (ask.effects.flag as any)?.plateHinted, 'plate hint sets plateHinted')
ok(vz.choices.filter((c) => c.id.startsWith('plate-') && c.id !== 'plate-ask').every((c) => JSON.stringify(c.show).includes('plateHinted')), 'Plate buttons wait for plateHinted')
const HINTED = 'Maw Plate: calcified rib-worm hide. Varro at the Bone Market can work this into your gear.'
ok(itemDesc('maw_plate', { flags: {} } as any) !== HINTED && !itemDesc('maw_plate', { flags: {} } as any).includes('Varro'), 'Maw Plate desc generic before the hint')
ok(itemDesc('maw_plate', { flags: { plateHinted: true } } as any) === HINTED, 'Maw Plate desc after the hint')
ok(vz.choices.filter((c) => c.id.startsWith('plate-') && c.id !== 'plate-ask').map((c) => c.label).sort().join('|') === 'Maw Plate Armor|Maw Plate Shield', 'only Shield and Armor recipes')
ok(JSON.stringify(PLATE_RECIPE) === JSON.stringify({ maw_plate: 1, scrap: 3, sinew_cord: 1, vial_drop: 3 }) && PLATE_RECIPE_NAMES.scrap_buckler === 'Maw Plate Shield', 'recipe: plate + piece + 3 scrap + 1 cord + 3 Drops')
console.log(fails ? `${fails} FAILED` : 'v168 ok'); process.exit(fails ? 1 : 0)

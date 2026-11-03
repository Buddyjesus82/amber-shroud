/** v211: Pry the Seal, the Sifter Hermit, Greg's bluff and warning, dead foes never hit back, wake fix, Stray Hunter stays down, auto-equip gaps. npx tsx scripts/v211.ts */
import { newGame, applyEffect, visibleChoices } from '../src/game/engine.ts'
import { strayHunterArrives } from '../src/game/strayHunter.ts'
import { wakeEffect } from '../src/game/downed.ts'
import { readFileSync, existsSync } from 'node:fs'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const src = readFileSync('src/game/content/intoTheMaw.ts', 'utf8')
const at = (s: GameState, id: string) => ({ ...s, sceneId: id, chapterId: 'into-the-maw' }) as GameState
const o = { ...newGame('outcast'), equipped: {} } as GameState
// 1. Pry the Seal
const stilts = at({ ...o, items: { ...o.items, ossa_token: 0, wrench: 1 } } as GameState, 'ch2:o-stilts')
const s1 = { ...stilts, health: 6, flags: { ...stilts.flags, reckoningDone: true } } as GameState
const pry = visibleChoices(s1).find((c) => c.id === 'pry')
ok(pry && pry.sub === 'Health −2. Seeker Heat +1.' && pry.effects.goto === 'ch2:cache', 'Pry the Seal row with a tool')
const pried = applyEffect(s1, pry!.effects)
ok(pried.sceneId === 'ch2:cache' && pried.health === 4 && (pried.heat.seekers ?? 0) === (s1.heat.seekers ?? 0) + 1, 'Pry: Health -2, Seeker +1, through')
const noTool = { ...s1, items: { ...s1.items, wrench: 0 } } as GameState
ok(visibleChoices(noTool).find((c) => c.id === 'pry')?.locked?.startsWith('Needs: a heavy tool'), 'Pry: no-tool state')
ok(src.includes("locked: 'Needs: 3 Health'"), 'Pry: cannot-afford state')
// 2. Hermit
ok(src.includes("id: 'ch2:o-hermit'") && existsSync('public/covers/ch2-o-hermit.jpg') && readFileSync('src/game/art.ts', 'utf8').includes("ch2_o_hermit: 'ch2-o-hermit.jpg'"), 'Hermit scene + art')
const h = at({ ...o, items: { ...o.items, scrap: 5 } } as GameState, 'ch2:o-hermit')
const tr = applyEffect(h, visibleChoices(h).find((c) => c.id === 'mark-scrap')!.effects)
ok((tr.items.kallik_mark ?? 0) === 1 && tr.items.scrap === 2 && tr.flags.hermitTraded, 'Hermit trades the Mark once')
// 3/4. Greg
ok(src.includes("'ch2:irongut', flash: \"'Through. Fast. I never saw you.'\" }, 3)"), 'Gate bluff 3 scrap')
ok(src.includes('Greg readies a desperate last stand—engaging now will be fatal if injured'), 'Greg warning line')
const low = { ...at(o, 'ch2:o-stilts'), health: 2 } as GameState
ok(visibleChoices(low).find((c) => c.id === 'reckon')?.sub?.startsWith('Greg readies a desperate last stand'), 'Greg warning at low Health')
ok(visibleChoices(low).some((c) => c.id === 'back'), 'Back away offered')
// 5. Dead foes never hit back
ok(readFileSync('src/game/encounter.ts', 'utf8').includes('const fellFirst'), 'fellFirst rule')
// 6. Wake never empties the last Sap
ok(wakeEffect({ ...o, sap: 1, flags: {} } as GameState).sap === undefined, 'Wake at Sap 1 costs no Sap (no second rescue)')
// 7. Stray Hunter stays down
const r = at({ ...o, heat: { ...o.heat, strays: 6 }, flags: { strayHunterBeaten: true, sceneSteps: 50 } } as GameState, 'ch2:o-root')
ok(!strayHunterArrives(at(o, 'ch2:o-strays'), r), 'Beaten Stray Hunter does not respawn')
// 8. Auto-equip: Blood Shiv to Off hand when Main hand is worn
const sh = applyEffect({ ...o, items: { ...o.items, needle_knife: 1 }, equipped: { weapon: 'needle_knife' } } as GameState, { add: { shiv: 1 } })
ok(sh.equipped.offhand === 'shiv', 'Blood Shiv goes to the empty Off hand')
const gl = applyEffect(o, { add: { hide_gloves: 1, shin_wraps: 1 } })
ok(gl.equipped.hands === 'hide_gloves' && gl.equipped.legs === 'shin_wraps', 'Gloves + Shin Wraps auto-equip')
ok(readFileSync('src/game/engine.ts', 'utf8').includes('next = autoEquip(state, next)\n  return withVerb('), 'Scavenge finds auto-equip')
// Safe fixes
ok(!src.includes("locked: 'The vein is already dry.'") && src.includes("label: 'Cut the cord', show"), 'Siphon hidden when dry; Cut the cord label')
ok(readFileSync('public/sw.js', 'utf8').includes('amber-shroud-v215') && readFileSync('src/version.ts', 'utf8').includes("'v215'"), 'v211 bump')
console.log(fails ? `v211: ${fails} FAIL` : 'v211 ok')
process.exit(fails ? 1 : 0)

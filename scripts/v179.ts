/** v179: Ch2 Vessel fixes (Bluff the Ring, back gate, Name Sybella, Siphon, fight help, Guard, Valerius, typed code, seal, recap, cloak, pills). npx tsx scripts/v179.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, chapterTwoFromCode, interpret, isChoiceOn, newGame, sceneOf, visibleChoices, VALERIUS_GONE } from '../src/game/engine.ts'
import { fightStartFlags, resolveEncounter } from '../src/game/encounter.ts'
import { fightHelpAuto } from '../src/game/helpTopics.ts'
import { RING_LINE, SYBELLA_RAGS, chapterTwoSummary } from '../src/game/content/intoTheMaw.ts'
import { effectPills } from '../src/game/kit.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v196'"), 'SW cache v179')
ok(readFileSync('src/version.ts', 'utf8').includes("'v196'"), 'Build label v179')
const v = chapterTwoFromCode('vessel')
ok((v.items.memory_siphon ?? 0) === 1 && v.flags.siphonGot, 'code start grants the Siphon')
const at = (sceneId: string, extra: Partial<GameState> = {}, flags: object = {}): GameState => ({ ...v, sceneId, ...extra, flags: { ...v.flags, ...flags } }) as GameState
const rows = (s: GameState) => visibleChoices(s)
const row = (s: GameState, id: string, sub?: string) => rows(s).find((c) => c.id === id && (sub === undefined || c.sub === sub))
// 1 Bluff the Ring
ok(!row(at('ch2:v-outpost'), 'locker'), 'no transit locker')
const noMark = at('ch2:v-test', { items: { ...v.items, ossa_token: 0, knotted_wrap: 0, kallik_mark: 0 } })
const ring = row(noMark, 'ring')
ok(ring && ring.label === 'Bluff the Ring' && !isChoiceOn(noMark, ring.enable), 'ring locked without a mark')
const marked = at('ch2:v-test', { items: { ...v.items, kallik_mark: 1 } })
const rung = applyEffect(marked, row(marked, 'ring')!.effects)
ok(rung.sceneId === 'ch2:v-stair' && rung.flags.cupPassed && rung.flash?.includes(RING_LINE) && (rung.items.vial_drop ?? 0) === (marked.items.vial_drop ?? 0), 'ring passes to the stair, no Drop')
// a seal enforced
const seal = row(rung, 'down')
ok(seal && !isChoiceOn(rung, seal.enable), 'seal locked without Vex or crate key')
ok(isChoiceOn({ ...rung, flags: { ...rung.flags, crateKey: true } }, seal!.enable), 'seal opens with crate key')
const dealt = applyEffect(at('ch2:v-greg'), row(at('ch2:v-greg'), 'deal')!.effects)
ok((dealt.items.crate_key ?? 0) === 1, 'Deal puts the Crate Key in Key items')
// 1b back gate / Smuggler's Run
ok(row(at('ch2:v-bleed', {}, { vexFreed: true }), 'gate'), 'back gate stays after freeing Vex')
const blown = at('ch2:v-bleed', { sap: 5 }, { vexFreed: true, coverBlown: true })
const sm = rows(blown).filter((c) => c.id === 'smuggle')
ok(sm.length === 2 && sm.every((c) => c.label === "Smuggler's Run"), "two Smuggler's Run rows")
const ran = applyEffect(blown, sm[0].effects)
ok(ran.sap === 4 && ran.sceneId === 'ch2:v-ribs', 'run costs 1 Sap')
// c bleeding room after leaving
const left = applyEffect(at('ch2:v-bleed'), row(at('ch2:v-bleed'), 'leave')!.effects)
ok(row(left, 'bleed'), 'bleeding room still in the outpost after leaving')
ok(row({ ...left, sceneId: 'ch2:v-bleed' } as GameState, 'rite'), 'rite still there after leaving')
// 2 Name Sybella
const toll = (heat: number, items: object) => at('ch2:greg-toll', { heat: { ...v.heat, seekers: heat }, items: { ...v.items, ...items } })
const cool = toll(2, {})
ok(rows(cool).filter((c) => c.id === 'sybella').length === 1 && !row(cool, 'sybella')!.sub, 'Sybella free under Heat 4')
const broke = toll(4, { scrip: 0, scrap: 0 })
const hot = rows(broke).filter((c) => c.id === 'sybella')
ok(hot.length === 2 && hot.every((c) => !isChoiceOn(broke, c.enable) && c.locked === SYBELLA_RAGS), 'Heat 4, no pay: rags line')
const paid = toll(5, { scrip: 1, scrap: 0 })
const pr = rows(paid).find((c) => c.id === 'sybella' && c.sub === '1 scrip.')!
ok(isChoiceOn(paid, pr.enable) && (applyEffect(paid, pr.effects).items.scrip ?? 0) === 0, 'Heat 5: 1 scrip pays')
// 4 fight help
ok(!fightHelpAuto({ flags: { encounterHere: true } } as any), 'help never opens by itself')
const help = readFileSync('src/game/helpTopics.ts', 'utf8')
ok(!/roll from 1|less your Shell|No cost\./.test(help) && help.includes('No loot. Costs 1 Sap.'), 'help: no formulas, road costs 1 Sap')
// 9 Guard against Strike 2
const sp = { ...v, sceneId: 'ch2:v-outpost', hubId: null } as any
let hurt = false
for (let t = 0; t < 60; t++) { const r: any = resolveEncounter({ ...sp, ticks: t, flags: { ...sp.flags, ...fightStartFlags(sp, 'seekerpatrol') } }, 'guard'); if ((r.fx.health ?? 0) < 0) hurt = true }
ok(hurt, 'Guard: a Strike 2 hit still lands')
// crit log: each bonus once
let dup = false
for (let t = 0; t < 200; t++) { const r: any = resolveEncounter({ ...sp, ticks: t, flags: { ...sp.flags, ...fightStartFlags(sp, 'dragoon'), encounterFeint: true } }, 'fight'); const txt = String(r.fx.flash ?? r.card ?? JSON.stringify(r)); if ((txt.match(/Extra force/g) ?? []).length > 1 || (txt.match(/Feint: \+/g) ?? []).length > 1) dup = true }
ok(!dup, 'crit log lists each bonus once')
// Valerius moved
const moved = at('ch2:v-test', {}, { valeriusMoved: true, cupPassed: true })
ok(!sceneOf(moved).speaker && sceneOf(moved).body === VALERIUS_GONE, 'Valerius gone from the test chamber')
// 8 typed code
const mid = interpret(at('ch2:v-outpost'), 'LEAD-N3X7')
ok(mid.sceneId === chapterTwoFromCode('vessel').sceneId && mid.flags.ch2FromCode, 'typed code works like the title box')
// b recap
ok(!chapterTwoSummary({ gregStanding: 'worked' }, {}).includes('Miller') && chapterTwoSummary({ gregStanding: 'worked', millerHeard: true }, {}).includes('Greg and Miller'), 'recap names Miller only if met')
// f pills
ok(!effectPills({ heat: { strays: -1 } }, { cartel: 0, seekers: 0, strays: 0 }).length && effectPills({ heat: { strays: -1 } }, { cartel: 0, seekers: 0, strays: 2 }).length === 1, 'no cooling pill at 0')
{ const e = applyEffect(newGame('outcast'), { flag: { chapter1Done: true } }); ok(!e.items.memory_siphon, 'v187: Ch1 end alone does not grant the Siphon') }
{ const e = applyEffect(newGame('outcast'), { flag: { chapter2Unlocked: true } }); ok((e.items.memory_siphon ?? 0) === 1, 'Chapter Two grants the Siphon') }
if (fails) { console.log(`v179: ${fails} fail(s)`); process.exit(1) }
console.log('v179 ok')

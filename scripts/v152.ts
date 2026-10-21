/**
 * v152: Jodi's notes. Hound Sign handler text, Valerius win Cartel -1, hound/handler wins start the cooldown,
 * Valerius and Nim never fully corner you, the Lockdown Gate zaps, and the Shard-pup on Stray and Seeker ground.
 *   npx tsx scripts/v152.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, bodyOf, gateZaps, newGame, travelTo, visibleChoices, valeriusCooling } from '../src/game/engine.ts'
import { pickEncounterKind } from '../src/game/encounter.ts'
import { GATE_ZAP_LINE } from '../src/game/downed.ts'
import { handsLeft } from '../src/game/hands.ts'
import { NAMED_RUN_COST } from '../src/game/hunter.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v155'"), 'SW cache v152')
// 1. Hound Sign describes the handler.
{
  const b = getScene('spine:hound').body
  ok(b.includes('A Hound-handler walks behind it in resin gloves, the chip-lead slack in his fist. Valerius sent him out from Ironwood after a Cartel deserter who hides somewhere in this wash. When he sees you, he looks at you the way the Overseer would: loose property.'), 'Hound Sign: handler line verbatim')
  ok(!/Valerius (has come out|walks behind)/.test(b), 'Hound Sign: Valerius does not walk behind the Hound')
  const people = readFileSync('src/game/people.ts', 'utf8')
  const shade = readFileSync('src/game/content/shadeHands.ts', 'utf8')
  ok(!people.includes('Overseer Valerius walks behind the Hound') && !shade.includes('Overseer Valerius walks behind them'), 'return text and shade tip: handler, not Valerius')
}
// 2. Wins.
{
  const src = readFileSync('src/game/encounter.ts', 'utf8')
  ok(src.includes('Cartel Heat -1.${mutualWin') && src.includes('heat: { cartel: -1 }'), 'Valerius win: Cartel Heat -1')
  ok(src.includes("valeriusRest: true, valeriusQuiet: 0"), 'v153: hound and handler wins start the Valerius-only rest')
  ok(valeriusCooling({ flags: { valeriusCool: true, huntQuiet: 0 } }) && !valeriusCooling({ flags: { valeriusCool: true, huntQuiet: 10 } }), 'cooldown is 10 quiet scenes')
}
// 3. Named hunters: bargain, a Health-cost run, Nim's Drop stay open.
const open = (s: GameState) => visibleChoices(s).filter((c) => !(c.enable && (c.enable as { flag?: string }).flag === '__never__'))
{
  const g = newGame('prisoner')
  const v = { ...g, sceneId: 'camp:yard', hubId: 'camp04', ticks: 40, health: 6, sap: 6, heat: { ...g.heat, cartel: 7 }, items: { scrap: 2 }, flags: { ...g.flags, noMasked: true, hunterHere: true, hunterFrom: 'camp:yard' } } as GameState
  const ids = open(v).map((c) => c.id)
  ok(ids.includes('hunter-bargain') && ids.includes('hunter-fight'), `Valerius: bargain open (${ids})`)
  ok(!ids.includes('hunter-scrap') && !ids.includes('hunter-hold'), 'Valerius: pay and hide still cornered')
  const run = open(v).find((c) => c.id === 'hunter-blind' || c.id === 'hunter-run')
  ok(run && run.sub?.includes(NAMED_RUN_COST) && run.effects.health === -1, 'Valerius: a run that costs 1 Health')
  const handler = { ...v, heat: { ...v.heat, cartel: 6 } }
  ok(!open(handler).some((c) => c.id === 'hunter-bargain'), 'the regular handler still corners at Heat 6')
  const o = newGame('outcast')
  const nim = { ...o, sceneId: 'spine:ridge', hubId: 'spine', ticks: 40, health: 6, sap: 6, heat: { ...o.heat, strays: 7 }, items: { vial_drop: 1 }, flags: { ...o.flags, noMasked: true, hunterHere: true, hunterFrom: 'spine:ridge', ridgeVisits: 3 } } as GameState
  const nids = open(nim).map((c) => c.id)
  ok(nids.includes('spine-bargain') && nids.includes('spine-offer') && nids.includes('spine-shade'), `Nim: bargain, Drop, shade run open (${nids})`)
  ok(open(nim).find((c) => c.id === 'spine-shade')!.effects.health === -1, 'Nim: the run costs Health')
}
// 4. Gate zap.
{
  ok(gateZaps({ health: 3, ticks: 1, sap: 1, pressure: 0 }), 'sure zap at Health 3')
  let zaps = 0
  for (let t = 0; t < 300; t++) if (gateZaps({ health: 6, ticks: t, sap: 4, pressure: 1 })) zaps++
  ok(zaps > 80 && zaps < 120, `about 1 in 3 at full Health (${zaps}/300)`)
  const g = newGame('prisoner')
  const out = { ...g, sceneId: 'ch1:leave', hubId: null, chapterId: null, ticks: 50, sap: 6, health: 3, heat: { ...g.heat, cartel: 4 }, checkpoint: { ...g, flags: { ...g.flags, chapter1Done: true } }, flags: { ...g.flags, noMasked: true, leftCamp: true, campLockdown: true, chapter1Done: true } } as GameState
  const z = applyEffect(out, { goto: 'camp:wire' })
  ok(z.sceneId === 'camp:gate' && z.flags.downed && bodyOf(z) === GATE_ZAP_LINE, `zap: Down at the gate (${z.sceneId}, ${bodyOf(z).slice(0, 40)})`)
  ok(z.heat.cartel === 5 && handsLeft(z) === 2, `zap: Cartel +1 and a hand spent (${z.heat.cartel}, ${handsLeft(z)})`)
  ok(GATE_ZAP_LINE.length < 160, 'zap line is short')
}
// 7. Shard-pup on Stray and Seeker ground.
{
  const seen = { strays: false, seekers: false }
  for (const [door, sc, hub] of [['outcast', 'spine:well', 'spine'], ['vessel', 'thresh:paddock', 'threshold']] as const) {
    const g = newGame(door)
    for (let t = 0; t < 60; t++) {
      const k = pickEncounterKind({ ...g, sceneId: sc, hubId: hub, ticks: t } as GameState)
      if (k === 'pup') seen[door === 'outcast' ? 'strays' : 'seekers'] = true
    }
  }
  ok(seen.strays && seen.seekers, `pup on Stray and Seeker ground (${JSON.stringify(seen)})`)
}
void travelTo
console.log(fails ? `v152: ${fails} failure(s)` : 'v152: all ok')
process.exit(fails ? 1 : 0)

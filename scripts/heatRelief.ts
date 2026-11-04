/** v218 (unshipped): Pens heat relief + Clean Passage. npx tsx scripts/heatRelief.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { BRIBE_LINE, BRIBE_HEAT_LINE } from '../src/game/heatRelief.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const base = { ...newGame('prisoner' as never), hubId: 'camp04', sceneId: 'camp:cages' } as GameState
const at = (heat: number, items: Record<string, number>, extra: Partial<GameState> = {}) =>
  ({ ...base, heat: { ...base.heat, cartel: heat }, items: { ...base.items, ...items }, ...extra }) as GameState
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)

// Bribe
let s = at(5, { scrap: 2, scrip: 0 })
const kb = row(s, 'kick-up')
ok(kb?.label === 'Kick Up to the Block Boss', 'bribe button')
s = applyEffect(s, kb!.effects)
ok(s.heat.cartel === 3 && (s.items.scrap ?? 0) === 0, 'bribe: 2 Scrap, Cartel -2')
ok(s.flash === `${BRIBE_LINE}\n\n${BRIBE_HEAT_LINE}`, 'bribe copy')
ok(!row(s, 'kick-up'), 'bribe cools down')
ok(!row({ ...s, ticks: s.ticks + 2 } as GameState, 'kick-up') && !!row({ ...s, items: { ...s.items, scrap: 2 }, ticks: s.ticks + 3 } as GameState, 'kick-up'), 'bribe back after 3 scenes')
let p = applyEffect(at(5, { scrap: 0, scrip: 1 }), row(at(5, { scrap: 0, scrip: 1 }), 'kick-up')!.effects)
ok(p.heat.cartel === 3 && (p.items.scrip ?? 0) === 0, 'bribe: 1 Scrip')
ok(!row(at(5, { scrap: 1, scrip: 0 }), 'kick-up'), 'no bribe without pay')
ok(!row(at(5, { scrap: 2 }, { flags: { chapter1Done: true } } as never), 'kick-up'), 'no bribe once Jaxson has left')
ok(!row(at(5, { scrap: 2 }, { sceneId: 'camp:yard' }), 'kick-up'), 'bribe only in the Pens cluster')
ok(!row(at(5, { scrap: 2 }, { door: 'outcast' } as never), 'kick-up'), 'Prisoner only')

// Lay Low
s = at(7, {})
const ll = row(s, 'lay-low')!
const t0 = s.ticks, sap0 = s.sap
s = applyEffect(s, ll.effects)
ok(s.heat.cartel === 6 && s.ticks === t0 && s.sap === sap0 && s.sceneId === 'camp:cages', 'lay low: -1, no Sap, no scene advance')
ok(!row(s, 'lay-low'), 'lay low once per visit')
s = applyEffect(s, { goto: 'camp:genpop' })
ok(!row(s, 'lay-low') && !s.flags.encounterHere, 'still same visit inside cluster; passage skipped')
s = applyEffect({ ...s, flags: { ...s.flags, encounterHere: undefined } } as GameState, { goto: 'camp:yard', ticks: 1 })
s = { ...s, flags: { ...s.flags, encounterHere: undefined } } as GameState
s = applyEffect(s, { goto: 'camp:cages', ticks: 1 })
ok(!!row({ ...s, flags: { ...s.flags, encounterHere: undefined } } as GameState, 'lay-low'), 'lay low back on a new visit')

// Clean Passage: 1 in 3 at Cartel Heat 6+, existing Vent patrol
let hits = 0, low = 0
for (let t = 0; t < 300; t++) {
  const st = at(6, {}, { sceneId: 'camp:yard', ticks: t })
  if (applyEffect(st, { goto: 'camp:lean' }).flags.encounterKind === 'patrol') hits++
  if (applyEffect(at(5, {}, { sceneId: 'camp:yard', ticks: t }), { goto: 'camp:lean' }).flags.encounterHere) low++
}
ok(hits > 70 && hits < 130, `passage ~1 in 3 (${hits}/300)`)
ok(low === 0, 'no check under Cartel Heat 6')

// The check is the existing Vent patrol fight; winning it does not drop the guard station.
{
  let f: GameState | null = null
  for (let t = 0; t < 40 && !f; t++) { const n = applyEffect(at(6, {}, { sceneId: 'camp:yard', ticks: t, health: 20 } as never), { goto: 'camp:lean', ticks: 1 }); if (n.flags.passagePatrol) f = n }
  ok(f && f.sceneId === 'camp:lean' && f.flags.encounterKind === 'patrol' && f.flags.encounterNoSkip, 'passage opens the Vent patrol on arrival')
  let w = f!
  for (let i = 0; i < 30 && w.flags.encounterHere; i++) { const c = visibleChoices(w).find((x) => x.id === 'enc-fight') ?? visibleChoices(w)[0]; w = applyEffect(w, c.effects) }
  ok(!w.flags.guardDown && !w.flags.passagePatrol, `passage patrol win leaves the station up (${(w.flash ?? '').slice(0, 60)})`)
}
console.log(fails ? `heatRelief: ${fails} FAIL` : 'heatRelief: all pass')
process.exit(fails ? 1 : 0)

/**
 * v145: Valerius has Health 6, never dies (escapes at 0), Cartel +2 (v152: -1), and a 10-quiet-scene hunt cooldown.
 *   npx tsx scripts/v145.ts
 */
import { applyEffect, bodyOf, newGame, visibleChoices, VALERIUS_COOLDOWN, travelTo } from '../src/game/engine.ts'
import { beginEncounter, encounterSpec, VALERIUS_ESCAPES } from '../src/game/encounter.ts'
import { pressureAppend, VALERIUS_GRUDGE, VALERIUS_HUNT_APPEND } from '../src/game/hunter.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

function hunt(t: number, extra: Partial<GameState> = {}, gear: GameState['equipped'] = { weapon: 'wrench' }): GameState {
  const g = newGame('prisoner')
  return {
    ...g, hubId: 'camp04', sceneId: 'camp:yard', ticks: 30 + t, health: 6, sap: 8,
    heat: { ...g.heat, cartel: 7 }, items: { ...g.items, wrench: 1, scrap: 6 }, equipped: gear,
    flags: { ...g.flags, jaxsonInside: true, guardDown: true, cartelNotice: true, noMasked: true, hunterHere: true, hunterFrom: 'camp:yard' },
    ...extra,
  } as GameState
}
function fight(s: GameState, move = 'enc-fight'): GameState {
  const row = visibleChoices(s).find((c) => c.id === 'hunter-fight')!
  s = applyEffect(s, row.effects)
  for (let i = 0; i < 30 && s.flags.encounterHere && !s.flags.encounterDone; i++) {
    const c = visibleChoices(s).find((r) => r.id === move) ?? visibleChoices(s).find((r) => r.id === 'enc-fight')!
    s = applyEffect(s, c.effects)
  }
  return s
}

ok(encounterSpec({ ...newGame('prisoner'), flags: { encounterKind: 'overseer' } } as GameState).hp === 6, 'Valerius Health 6')
{
  const s = applyEffect(hunt(1), visibleChoices(hunt(1)).find((c) => c.id === 'hunter-fight')!.effects)
  ok(s.flags.encounterHp === 6 && /VALERIUS ♥ 6 ⚔ Strike 4 🛡 Shell 3/.test(bodyOf(s)), `fight card shows ♥ 6, Strike 4, Shell 3`)
}

let wins = 0
let mutual = 0
for (let t = 0; t < 300; t++) {
  const s = hunt(t, {}, { weapon: 'wrench', offhand: undefined } as never)
  const end = fight({ ...s, items: { ...s.items, ironwood_baton: 1 }, equipped: { weapon: 'ironwood_baton', offhand: 'wrench' } })
  if (!end.flags.encounterDone) continue
  const card = String(end.flags.encounterClash)
  if (!card.includes(VALERIUS_ESCAPES)) continue
  wins++
  if (/You are at 1 Health/.test(card)) mutual++
  ok(!/They drop\.|On the body:|Scrap \+|Salve \+/.test(card), `no body, no loot (${t})`)
  ok(/VALERIUS ♥ 0 ⚔ Strike 4 🛡 Shell 3/.test(card), 'stat row clean at 0')
  const on = applyEffect(end, visibleChoices(end).find((c) => c.id === 'enc-continue')!.effects)
  ok(on.heat.cartel === 7 - 1 && on.health > 0 && !on.flags.downed, `v152: Cartel -1, standing (${on.heat.cartel}, ${on.health})`)
  ok(on.flags.valeriusBeaten && on.flags.valeriusCool && !on.flags.hunterHere && !on.flags.encounterHere, 'hunt cleared, cooldown on')
  if (wins === 1) {
    // Cooldown: walk the yard at Heat 8 for 9 quiet scenes: no hunt. Then he can come again, with the grudge line.
    let w: GameState = { ...on, heat: { ...on.heat, cartel: 8 } }
    let firstHunt = -1
    const spots = ['camp:vents', 'camp:yard']
    for (let i = 0; i < 20 && firstHunt < 0; i++) {
      w = travelTo({ ...w, sap: 8, health: 6 }, spots[i % 2])
      if (w.flags.encounterHere) w = { ...w, flags: { ...w.flags, encounterHere: false, encounterKind: undefined as never } }
      if (process.env.DBG) console.log(i, w.sceneId, w.flags.huntQuiet, w.flags.valeriusCool, w.flags.hunterHere, w.flags.encounterHere, w.flash?.slice(0, 50))
      if (w.flags.hunterHere) firstHunt = Number(i + 1)
    }
    ok(firstHunt >= VALERIUS_COOLDOWN, `no Camp-04 hunt for ${VALERIUS_COOLDOWN} quiet scenes (first at ${firstHunt})`)
    ok(firstHunt > 0 && !w.flags.valeriusCool, 'after the cooldown the hunt resumes and the cooldown ends')
    ok(pressureAppend(w) === `${VALERIUS_HUNT_APPEND}\n\n${VALERIUS_GRUDGE}`, 'repeat intro carries the grudge line')
    ok(visibleChoices(w).find((c) => c.id === 'hunter-fight')?.label === 'Fight Valerius', 'at Heat 7-8 he takes the hunt again')
  }
}
ok(wins > 30, `Valerius gets beaten sometimes (${wins}/300)`)
ok(mutual >= 0, 'mutual counted')
// Mutual 0: forced. You at 1 Health, he at 1: a trade where both drop still escapes and leaves you at 1.
{
  let found = false
  for (let t = 0; t < 2000 && !found; t++) {
    const base = hunt(t, { health: 1 })
    let s = applyEffect(base, visibleChoices(base).find((c) => c.id === 'hunter-fight')!.effects)
    s = { ...s, flags: { ...s.flags, encounterHp: 1 } }
    const n = applyEffect(s, visibleChoices(s).find((r) => r.id === 'enc-fight')!.effects)
    const card = String(n.flags.encounterClash)
    if (/hits back for/.test(card) && card.includes(VALERIUS_ESCAPES)) {
      found = true
      const on = applyEffect(n, visibleChoices(n).find((c) => c.id === 'enc-continue')!.effects)
      ok(on.health === 1 && !on.flags.downed && /You are at 1 Health/.test(card), 'mutual 0: you win at 1 Health and he still escapes')
    }
  }
  ok(found, 'found a mutual-0 exchange')
}
// Before the first win the intro is unchanged.
ok(pressureAppend(hunt(3)) === VALERIUS_HUNT_APPEND, 'first intro unchanged')

if (fails) {
  console.log(`v145: ${fails} failures`)
  process.exit(1)
}
console.log(`v145 checks OK (${wins}/300 wins with a baton + wrench, ${mutual} at mutual 0)`)

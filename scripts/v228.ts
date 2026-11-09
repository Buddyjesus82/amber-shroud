/** v228: pour routes to the Pour button, the cell takes the cloth, kill loot is one line each. */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, POUR_NOWHERE } from '../src/game/engine.ts'
import { resolveEncounter } from '../src/game/encounter.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v228'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v228'"), 'build v228')

function vesselAt(sceneId: string, extra: Partial<GameState> = {}): GameState {
  const b = newGame('vessel')
  return { ...b, sceneId, chapterId: sceneId.startsWith('ch1:') ? 'cache-run' : b.chapterId, hubId: sceneId.startsWith('thresh:') ? 'threshold' : null, sap: 5, ...extra, items: { ...b.items, ...(extra.items ?? {}) }, flags: { ...b.flags, ...(extra.flags ?? {}) }, equipped: { ...b.equipped, ...(extra.equipped ?? {}) } }
}

const hymn = vesselAt('ch1:v-hymn')
const refused = interpret(hymn, 'pour a Drop for the runners')
ok(refused.sceneId === 'ch1:v-hymn' && refused.sap === 5 && (refused.items.vial_drop ?? 0) === 1 && (refused.items.vial_empty ?? 0) === 0, 'off the runners, pour does not drink the Drop')
ok(refused.flash === POUR_NOWHERE && refused.recentVerbs?.[0] === 'pour', 'the refusal is the pour line')
ok(interpret(vesselAt('thresh:court'), 'pour a Drop for the runners').flash === POUR_NOWHERE, 'the Court has nothing to pour into')

const runners = vesselAt('ch1:v-runners')
const poured = interpret(runners, 'pour a Drop for the runners')
ok(poured.sceneId === 'ch1:v-zafir' && (poured.items.vial_drop ?? 0) === 0 && (poured.items.vial_empty ?? 0) === 1 && poured.sap === 5 && poured.heat.seekers === runners.heat.seekers - 1 && poured.flags.brinPour, 'on the runners, pour is the Pour button')
ok(poured.flash?.startsWith('They watch you pour the Drop.') && !/nail of honey/.test(poured.flash ?? ''), 'the button line, not the drink line')

const dry = vesselAt('ch1:v-runners', { items: { vial_drop: 0 } })
const locked = interpret(dry, 'pour a Drop for the runners')
ok(locked.sceneId === 'ch1:v-runners' && locked.sap === 5 && locked.heat.seekers === dry.heat.seekers && locked.flash === 'Needs: a Drop' && !locked.flags.brinBolt, 'no Drop shows the lock, and runners does not bolt')

const cell = applyEffect(newGame('vessel'), { goto: 'thresh:cell' })
ok(cell.sceneId === 'thresh:cell' && !(cell.items.ceremonial_cloth ?? 0) && cell.equipped?.garment !== 'ceremonial_cloth' && !Object.values(cell.equipped ?? {}).includes('ceremonial_cloth'), 'entering the cell removes and unequips the cloth')
ok((cell.items.rusted_dagger ?? 0) === 1 && cell.equipped?.weapon === 'rusted_dagger', 'the dagger stays')
const again = applyEffect(cell, { goto: 'thresh:shrine' })
const back = applyEffect({ ...again, items: { ...again.items, ceremonial_cloth: 1 }, equipped: { ...again.equipped, garment: 'ceremonial_cloth' } }, { goto: 'thresh:cell' })
ok(!(back.items.ceremonial_cloth ?? 0) && back.equipped?.garment !== 'ceremonial_cloth', 'coming back into the cell takes a new cloth off too')

function cardOf(kind: string, ticks: number): string {
  const s = newGame('prisoner')
  const st: GameState = {
    ...s,
    ticks,
    health: 6,
    healthMax: 6,
    sceneId: 'camp:yard',
    hubId: 'camp04',
    items: { ...s.items, ironwood_baton: 1 },
    equipped: { weapon: 'ironwood_baton' },
    flags: { ...s.flags, encounterHere: true, encounterKind: kind, encounterHp: 1, fightTaught: true },
  }
  return String(resolveEncounter(st, 'fight').fx.flag?.encounterClash ?? '')
}
const pup = cardOf('pup', 1)
const pupLines = pup.split('\n\n')
ok(pupLines.includes('Glints +1.') && pupLines.includes('Scrap +1.') && !pup.includes('Glints +1, Scrap'), 'a pup pays Glints and Scrap on their own lines')
let splitGear = ''
for (let t = 0; t < 400 && !splitGear; t++) {
  const card = cardOf('scavenger', t)
  if (card.includes('On the body: Blood Shiv.') && card.includes('On the body: Dust Cloak.')) splitGear = card
}
ok(!!splitGear && !/On the body: [^.\n]+,/.test(splitGear), 'two pieces of gear are two lines')

console.log(fails ? `v228 FAILED ${fails}` : 'v228: all pass')
process.exit(fails ? 1 : 0)

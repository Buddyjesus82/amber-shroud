/** v228: pour routes to the Pour button, the cell takes the cloth, kill loot is one line each. */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, POUR_NOWHERE, visibleChoices } from '../src/game/engine.ts'
import { resolveEncounter } from '../src/game/encounter.ts'
import { showMapButton } from '../src/game/map.ts'
import { pushReportAction, REPORT_LIMIT, reportActions, reportBundle } from '../src/game/reportLog.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v231'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v231'"), 'build v228')

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

let run = applyEffect({ ...newGame('vessel'), sap: 6, items: { ...newGame('vessel').items, spire_key: 1 } }, { goto: 'ch3:capture' })
ok(showMapButton(run), 'map shows after capture')
run = applyEffect(run, visibleChoices(run).find((c) => c.id === 'fight')!.effects)
ok(run.sceneId === 'ch3:wagon' && showMapButton(run), 'map shows on the wagon')
ok(!showMapButton({ ...run, flags: { ...run.flags, encounterHere: true } }), 'map hides in a fight')
ok(!showMapButton({ ...run, health: 0, flags: { ...run.flags, downed: true } }), 'map hides when down')
const heat = run.heat.seekers
run = applyEffect(run, visibleChoices(run).find((c) => c.id === 'wait')!.effects)
ok(!!run.flags.ch3Waited && run.heat.seekers === heat + 1 && !visibleChoices(run).some((c) => c.id === 'slip'), 'wait adds seeker heat and closes slip')
const walked = { ...run, sap: 4 }
const toSupply = visibleChoices(walked).find((c) => c.id === 'walk-supply')
ok(!!toSupply && isChoiceOn(walked, toSupply.enable) && toSupply.sub === '1 Sap.' && !toSupply.locked, 'after wait, walk to supply is open at 1 sap')
run = applyEffect(walked, toSupply!.effects)
ok(run.sceneId === 'ch3:supply' && run.sap === 3 && !!run.flags.ch3SupplyOpen, 'the walk arrives and opens the supply wagon')
run = applyEffect(run, visibleChoices(run).find((c) => c.id === 'leave')!.effects)
ok(run.sceneId === 'ch3:tent' && !!run.flags.ch3TentOpen, 'leave now opens the tent')
run = { ...run, flags: { ...run.flags, ch3Helper: 'wren' } }
run = applyEffect(run, visibleChoices(run).find((c) => c.id === 'wren')!.effects)
ok((run.items.spire_key ?? 0) === 1 && !!run.flags.ch3VaultDone, 'the lockbox gives the key back')
run = applyEffect(run, visibleChoices(run).find((c) => c.id === 'go')!.effects)
ok(run.sceneId === 'ch3:crosshaven', 'crosshaven completes')

for (let i = 0; i < REPORT_LIMIT + 5; i++) pushReportAction({ kind: 'button', id: `b${i}`, label: `Move ${i}`, from: 'ch3:wagon', to: 'ch3:supply' })
const kept = reportActions()
ok(kept.length === REPORT_LIMIT && kept[0]?.id === 'b5' && kept[kept.length - 1]?.id === `b${REPORT_LIMIT + 4}`, 'the report log keeps the last 50 moves')
const bundle = reportBundle(run, 'wagon closed')
ok(bundle.includes('Build: v231') && bundle.includes('Scene: ch3:crosshaven') && bundle.includes('Sap:') && bundle.includes('Health:') && bundle.includes('Hands:') && bundle.includes('Heat:') && bundle.includes('Note: wagon closed') && bundle.includes(`b${REPORT_LIMIT + 4}`) && !bundle.includes('\n1. button [b0]'), 'the bundle has build, scene, stats, and the kept actions')

console.log(fails ? `v228 FAILED ${fails}` : 'v228: all pass')
process.exit(fails ? 1 : 0)

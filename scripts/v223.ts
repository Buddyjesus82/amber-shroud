/** v223: Prisoner playtest batch. DRAFT lines are wired. Bag cap and heat-tag style stay. */
import { readFileSync } from 'node:fs'
import { ALL_SCENES } from '../src/game/content/index.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import { interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { effectPills, bagCap } from '../src/game/kit.ts'
import { directedLookFlash } from '../src/game/look.ts'
import {
  DRAFT_BAY,
  DRAFT_BAY_RUMOR_LABEL,
  DRAFT_BAY_SURVIVE_LABEL,
  DRAFT_KAELEN_BAYS,
  DRAFT_KAELEN_SHADE,
  DRAFT_LOOK,
  DRAFT_WHO,
} from '../src/game/prisonerDraft.ts'
import { VOICES } from '../src/game/voices.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

const src = (p: string) => readFileSync(p, 'utf8')
ok(!src('src/game/kit.ts').includes('weight') && !Object.values(ITEMS).some((item) => 'weight' in item), 'no weight system')
ok(/let cap = BASE_BAG/.test(src('src/game/kit.ts')), 'bag-slot cap is unchanged')
ok(bagCap(newGame('prisoner')) === bagCap(newGame('outcast')), 'bag cap does not special-case the Prisoner')

function at(sceneId: string, extra: Partial<GameState> = {}): GameState {
  const g = newGame('prisoner')
  return {
    ...g,
    sceneId,
    hubId: 'camp04',
    sap: 6,
    health: 4,
    heat: { cartel: 3, seekers: 1, strays: 0 },
    ...extra,
    items: { ...g.items, vial_drop: 1, salve: 1, ...(extra.items ?? {}) },
    flags: { ...g.flags, heatTaught: true, ...(extra.flags ?? {}) },
    equipped: extra.equipped ?? g.equipped,
  } as GameState
}

// Who are you: evasive until a trade, Kaelen's bay talk, or Cartel Heat 6. Then the existing voice.
{
  const pike = at('camp:bay-pike')
  const shut = interpret(pike, 'who are you')
  ok(shut.flash === DRAFT_WHO.pike && shut.sap === pike.sap && shut.ticks === pike.ticks, 'Pike withholds a name, free of Sap and time')
  const trusted = interpret(at('camp:bay-pike', { flags: { wrenchBayTrade: 'pike' } }), 'who are you')
  ok(trusted.flash === VOICES.pike.who, 'a finished trade reuses Pike\'s existing name line')
  const hot = interpret(at('camp:bay-pike', { heat: { cartel: 6, seekers: 0, strays: 0 } }), 'who are you')
  ok(hot.flash === VOICES.pike.who, 'Cartel Heat 6 reuses the existing name line')
  const k = interpret(at('camp:kaelen'), 'who are you')
  ok(k.flash === DRAFT_WHO.kaelen, 'Kaelen withholds his name')
  const known = interpret(at('camp:kaelen', { flags: { kaelenKnown: true } }), 'who are you')
  ok(known.flash === VOICES.kaelen.who, 'kaelenKnown reuses Kaelen\'s existing name line')
  const out = interpret({ ...newGame('outcast'), sceneId: 'spine:shade', hubId: 'spine' }, 'who are you')
  ok(out.flash === VOICES.silas.who, 'other doors keep their existing name lines')
}

// Kaelen mentors. No items.
{
  const k = at('camp:kaelen')
  const bays = visibleChoices(k).find((c) => c.id === 'bays')!
  const shade = visibleChoices(k).find((c) => c.id === 'shade')!
  ok(!bays.effects.add && !bays.effects.remove && bays.effects.flash === DRAFT_KAELEN_BAYS, 'bay context is talk, not a handout')
  ok(!shade.effects.add && shade.effects.flash === DRAFT_KAELEN_SHADE, 'shade context is talk, not a handout')
  ok(!visibleChoices({ ...k, door: 'outcast' } as GameState).some((c) => c.id === 'bays'), 'the mentor buttons are Prisoner-only')
}

ok(DRAFT_BAY.pike.rumor === '"The Wire gets new packs when the Cartel runs the ridge. Kaelen buys low and holds heavy."' && DRAFT_BAY.pike.rumorSub === 'Ridge runs, heavy stock.', 'Pike rumor is the approved line')
ok(DRAFT_BAY.sarn.rumor === '"Seekers checked the outer fence twice before dusk. They aren\'t looking for stray scrap."' && DRAFT_BAY.sarn.rumorSub === 'Seekers at the fence.', 'Sarn rumor is the approved line')
ok(DRAFT_BAY.vetch.rumor === '"Valerius took two extra guards up the tower line. Something broke on the high conduit."' && DRAFT_BAY.vetch.rumorSub === 'Movement on the high line.', 'Vetch rumor is the approved line')
ok(!DRAFT_BAY.pike.rumor.startsWith('Pike'), 'Pike rumor stays quote-only')

// Bay buttons: survival, the existing trade, a rumor. No new loot.
for (const [id, who] of [['camp:bay-pike', 'pike'], ['camp:bay-sarn', 'sarn'], ['camp:bay-vetch', 'vetch']] as const) {
  const rows = visibleChoices(at(id, { items: { wrench: 1 } }))
  const survive = rows.find((c) => c.id === 'survive')!
  const rumor = rows.find((c) => c.id === 'rumor')!
  const trade = rows.find((c) => c.id.startsWith('trade-'))
  ok(survive?.label === DRAFT_BAY_SURVIVE_LABEL && survive.effects.flash === DRAFT_BAY[who].survive && !survive.effects.add, `${id} survival`)
  ok(rumor?.label === DRAFT_BAY_RUMOR_LABEL && rumor.sub === DRAFT_BAY[who].rumorSub && rumor.effects.flash === DRAFT_BAY[who].rumor && !rumor.effects.heat, `${id} rumor`)
  ok(!!trade, `${id} keeps its trade button`)
}

// Rest only on the existing safe nodes. Consumables still work on the Yard.
{
  const yard = at('camp:yard', { sap: 2, health: 2 })
  ok(!visibleChoices(yard).some((c) => c.id === 'rest'), 'the Yard is not a rest node')
  ok(visibleChoices(at('camp:cages')).some((c) => c.id === 'rest'), 'the pens still rest')
  ok(visibleChoices(at('camp:lean')).some((c) => c.id === 'rest'), 'the stall still rests')
  ok(visibleChoices(at('camp:bay')).some((c) => c.id === 'rest'), 'Skiff Bay still rests')
  const drank = interpret(yard, 'drink')
  ok(drank.sap === yard.sap + 3 && (drank.items.vial_drop ?? 0) === 0, 'a Drop still works mid-scene off a rest node')
  const bound = interpret(yard, 'use salve')
  ok(bound.health === yard.health + 3 && (bound.items.salve ?? 0) === 0, 'salve still works mid-scene off a rest node')
}

// Look N/S/E/W is free and uses a path hint.
{
  const pens = at('camp:cages')
  const looked = interpret(pens, 'look west')
  ok(looked.sceneId === pens.sceneId && looked.sap === pens.sap && looked.ticks === pens.ticks, 'look west costs no Sap and no time')
  ok(looked.flash?.includes('West') && looked.flash.includes(DRAFT_LOOK['camp:genpop']), 'west names the general population pens')
  const north = directedLookFlash(pens, 'North')
  ok(north.startsWith('North') && !north.includes('Sap'), 'a crowded north look stays a hint')
}

// Every Camp-04 choice that changes Heat shows the existing pill.
{
  const miss: string[] = []
  for (const sc of ALL_SCENES) {
    if (sc.hubId !== 'camp04' && !sc.id.startsWith('camp:')) continue
    const s = at(sc.id, { flags: { jaxsonInside: true, kaelenKnown: true, planHeard: true }, items: { scrap: 4, wrench: 1 } })
    for (const c of visibleChoices(s)) {
      const h = c.effects.heat
      if (!h) continue
      const pills = effectPills(c.effects, s.heat).map((p) => p.text)
      for (const [f, n] of Object.entries(h)) {
        if (!n) continue
        const label = f === 'cartel' ? 'Cartel' : f === 'seekers' ? 'Seekers' : 'Strays'
        if (!pills.some((t) => t.startsWith(label))) miss.push(`${sc.id} ${c.id} ${label} ${n}`)
      }
    }
  }
  ok(!miss.length, `heat tags: ${miss.join('; ') || 'all camp choices'}`)
}

console.log(fails ? `v223: ${fails} FAIL` : 'v223: all pass')
process.exit(fails ? 1 : 0)

/** v225: kill card, weapon verbs, one cover per shared Hunger or Maw beat. */
import { existsSync, readFileSync } from 'node:fs'
import { applyEffect, bodyOf, HAND_UP_LINE, isChoiceOn, newGame, persist, RESCUE_GLINT_LINE, visibleChoices } from '../src/game/engine.ts'
import { doorPreview } from '../src/game/doorPreview.ts'
import { CH3_TENT_BODY, CH3_TENT_KEY, CH3_WAGON_CLOSED, CH3_WAGON_GONE } from '../src/game/content/luminspire.ts'
import { VEIN_BY_LADDER, VEIN_BY_LIFT } from '../src/game/content/intoTheMaw.ts'
import { resolveEncounter } from '../src/game/encounter.ts'
import { fightVerbButton, fightVerbHit, fightVerbId } from '../src/game/fightVerbs.ts'
import { playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState, ItemId } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v232'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v232'"), 'build v225')

const verbFor: Record<string, string> = {
  wrench: 'wrench',
  ironwood_baton: 'crack',
  valerius_baton: 'crack',
  shiv: 'cut',
  rusted_dagger: 'cut',
  needle_knife: 'cut',
  seeker_extractor: 'plunge',
}
const names: Record<string, string> = { wrench: 'Wrench', crack: 'Crack', cut: 'Cut', plunge: 'Plunge', strike: 'Strike' }
for (const [id, verb] of Object.entries(verbFor)) {
  const st = { equipped: { weapon: id as ItemId } } as GameState
  ok(fightVerbId(st) === verb, `${id} is ${verb} (${fightVerbId(st)})`)
  ok(fightVerbButton(st, 'the foe') === `${names[verb]} the foe`, `${id} button word`)
}
ok(fightVerbId({ equipped: {} } as GameState) === 'strike', 'empty hands are Strike')
ok(fightVerbButton({ equipped: {} } as GameState, 'the cutter') === 'Strike the cutter', 'unarmed button')
ok(fightVerbHit({ equipped: { weapon: 'wrench' } } as GameState, 'the skiff', 1) === 'You wrench the skiff for 1.', 'wrench hit')
ok(fightVerbHit({ equipped: { weapon: 'ironwood_baton' } } as GameState, 'the runner', 2) === 'You crack the runner for 2.', 'baton hit')
ok(fightVerbHit({ equipped: { weapon: 'shiv' } } as GameState, 'the runner', 2) === 'You cut the runner for 2.', 'shiv hit')
ok(fightVerbHit({ equipped: { weapon: 'seeker_extractor' } } as GameState, 'the husk', 4) === 'You plunge into the husk for 4.', 'extractor hit')
ok(fightVerbHit({ equipped: {} } as GameState, 'the jackal', 1, true) === 'Critical Strike! You strike the jackal for 1.', 'crit keeps the verb')

function fight(weapon: ItemId | undefined, hp: number): GameState {
  const g = newGame('prisoner')
  const items = { ...g.items }
  const equipped: GameState['equipped'] = {}
  if (weapon) {
    items[weapon] = 1
    equipped.weapon = weapon
  }
  return {
    ...g,
    sceneId: 'camp:yard',
    hubId: 'camp04',
    ticks: 4,
    sap: 6,
    health: 6,
    healthMax: 6,
    items,
    equipped,
    flags: { ...g.flags, encounterHere: true, encounterKind: 'cutter', encounterHp: hp, fightTaught: true },
  }
}

const standing = applyEffect(fight('wrench', 9), { resolveEncounter: 'fight', ticks: 1 })
const standCard = String(standing.flags.encounterClash ?? '')
ok(!standing.flags.encounterDone && /^YOU ♥/.test(standCard) && /You wrench the Rim cutter for \d+\./.test(standCard), `standing blow keeps the rows (${standCard.slice(0, 120)})`)
ok(visibleChoices(fight('wrench', 9)).find((c) => c.id === 'enc-fight')?.label === 'Wrench the Rim cutter', 'button names the wrench')

const killed = applyEffect(fight('shiv', 1), { resolveEncounter: 'fight', ticks: 1 })
const killCard = String(killed.flags.encounterClash ?? '')
ok(killed.flags.encounterDone && !/YOU ♥/.test(killCard) && /^They drop\./.test(killCard), `kill card is the result (${killCard.slice(0, 160)})`)
ok(!/You cut /.test(killCard) && /\n\n/.test(killCard), 'kill card drops the swing and keeps a payout line')
ok(visibleChoices(killed).some((c) => c.id === 'enc-continue' && c.label === 'On.') && visibleChoices(killed).length === 1, 'one proceed button')

const bare = applyEffect(fight(undefined, 9), { resolveEncounter: 'fight', ticks: 1 })
ok(/You strike the Rim cutter for \d+\./.test(String(bare.flags.encounterClash ?? '')), 'unarmed hit line')

const covers: Array<[string, string, string]> = [
  ['prisoner', 'ch1:p-ossa', 'beat_escaped'],
  ['outcast', 'ch1:o-ossa', 'beat_kin'],
  ['prisoner', 'maw:stilt', 'beat_stilts'],
  ['outcast', 'maw:ossa', 'ossa'],
  ['prisoner', 'ch1:sybella', 'beat_sybella_road'],
  ['outcast', 'maw:sybella', 'sybella'],
  ['prisoner', 'maw:market', 'beat_bone_market'],
  ['prisoner', 'maw:zafir', 'zafir'],
  ['vessel', 'ch1:v-hymn', 'beat_hymn_scar'],
  ['prisoner', 'ch1:v-hymn', 'hymn_road'],
  ['outcast', 'ch1:leave', 'rim_bonewash'],
  ['outcast', 'ch1:land', 'beat_land_wash'],
  ['vessel', 'maw:rim', 'beat_rim_scar'],
  ['prisoner', 'maw:rim', 'rim_gullet'],
  ['prisoner', 'camp:wire', 'beat_the_wire'],
  ['outcast', 'spine:well', 'beat_dry_well'],
  ['vessel', 'thresh:cell', 'beat_false_cell'],
]
const seen = new Set<string>()
for (const [door, id, key] of covers) {
  const g = newGame(door as 'prisoner')
  const st = { ...g, door, sceneId: id, flags: { ...g.flags, encounterHere: false } } as GameState
  const got = playCoverKey(st, getScene(id))
  ok(got === key, `${door} ${id} -> ${key} (got ${got})`)
  if (key.startsWith('beat_')) {
    ok(!seen.has(key), `${key} is used once in this table`)
    seen.add(key)
    ok(existsSync(`public/covers/${key.replaceAll('_', '-')}.jpg`), `${key} file`)
  }
}
ok(readFileSync('public/sw.js', 'utf8').includes('covers/beat-escaped.jpg') && readFileSync('public/sw.js', 'utf8').includes('covers/beat-dry-well.jpg'), 'sw precaches the new beats')

const card = resolveEncounter(fight('ironwood_baton', 1), 'fight')
ok(!!card.fx.flag?.encounterDone && !String(card.fx.flag?.encounterClash).includes('YOU ♥'), 'baton kill has no stat row')

function fringe(door: 'prisoner' | 'outcast' | 'vessel', hands: number, key = true): GameState {
  const g = newGame(door)
  const items = { ...g.items, glints: 1 }
  delete items.vial_drop
  if (key) items.spire_key = 1
  return {
    ...g,
    sceneId: 'ch3:crosshaven',
    hubId: 'barrow',
    chapterId: 'luminspire',
    sap: 0,
    health: 1,
    hands,
    items,
    flags: {
      ...g.flags,
      chapter1Done: true,
      chapter2Done: true,
      chapter2Unlocked: true,
      ch3Started: true,
      ch3Stripped: true,
      ch3VaultDone: true,
      ch3KeyTaken: true,
      ch3SupplyOpen: true,
      ch3TentOpen: true,
      noMasked: true,
    },
  }
}

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const home = door === 'prisoner' ? 'camp:' : door === 'outcast' ? 'spine:' : 'thresh:'
  const buy = applyEffect(fringe(door, 3), { flag: { shopShelf: 'buy' }, flash: 'The shelf.' })
  ok(buy.sceneId === 'ch3:crosshaven' && buy.hands === 3 && buy.sap === 0 && !buy.flags.runOver, `${door}: Buy at Sap 0 does not rescue`)
  const trader = applyEffect(fringe(door, 3), { goto: 'roam:kaelen', ticks: 1, flag: { kaelenFrom: 'ch3:crosshaven' } })
  ok(trader.sceneId === 'roam:kaelen' && trader.hands === 3 && !trader.flags.runOver, `${door}: opening Kaelen does not rescue`)
  const walked = applyEffect(fringe(door, 3), { sap: -1, goto: 'ch3:tent' })
  ok(walked.sceneId === 'ch3:tent' && walked.chapterId === 'luminspire' && walked.hubId === 'barrow', `${door}: the tent walk stays in Chapter 3 (${walked.sceneId})`)
  ok(!walked.sceneId.startsWith(home) && !walked.sceneId.startsWith('crisis:'), `${door}: rescue does not warp home`)
  ok(walked.hands === 2 && walked.sap === 3 && (walked.items.spire_key ?? 0) === 1 && walked.flags.ch3KeyTaken, `${door}: one hand, key stays, Ash still holds the record`)
  ok(String(walked.flash).includes(HAND_UP_LINE) && String(walked.flash).includes(RESCUE_GLINT_LINE), `${door}: the hand and the Glint are on the walk`)
  const dry = applyEffect({ ...fringe(door, 0, false), items: { ...fringe(door, 0, false).items, spire_key: 0 } }, { sap: -1, goto: 'ch3:tent' })
  ok(dry.flags.runOver && dry.sceneId === 'ch3:tent' && dry.flags.ch3KeyTaken, `${door}: no hands left stays on the tent`)
  const again = applyEffect(dry, { restoreCheckpoint: true })
  ok(again.sceneId === 'ch3:wagon' && again.flags.chapter1Done && again.flags.chapter2Done && again.hands === 3, `${door}: restart is the wagon, earlier chapters kept`)
  ok(again.flags.ch3KeyTaken && !(again.items.spire_key ?? 0), `${door}: Ash still has the key after the restart`)
}

const wagon = { ...fringe('prisoner', 3), sceneId: 'ch3:wagon', sap: 4 }
const openSlip = visibleChoices(wagon).find((c) => c.id === 'slip')
ok(openSlip?.label === 'Slip the Wagon' && isChoiceOn(wagon, openSlip?.enable), 'Slip the Wagon is open before the wait')
const waited = applyEffect(wagon, visibleChoices(wagon).find((c) => c.id === 'wait')!.effects)
const shut = visibleChoices(waited).find((c) => c.id === 'slip-closed')
ok(shut?.label === CH3_WAGON_GONE && shut.sub === CH3_WAGON_CLOSED && !isChoiceOn(waited, shut?.enable), 'the wagon locks after the wait')
ok(!visibleChoices(waited).some((c) => c.id === 'slip' || c.id === 'wait'), 'Slip and Wait leave once the window closes')

const preview = persist({ ...fringe('prisoner', 3), sap: 0, sceneId: 'ch3:crosshaven' })
const shown = doorPreview('prisoner')
ok(shown.live && shown.place === 'Crosshaven Fringe' && shown.sap === preview.sap, `door card reads the save (${shown.place}, Sap ${shown.sap})`)

const wire = applyEffect(applyEffect(newGame('prisoner'), { sap: 6, goto: 'camp:wire', enterHub: 'camp04' }), { sap: -8 })
ok(wire.sceneId === 'crisis:camp', 'a Sap drain on the Wire is still the camp rescue')

for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const plain = fringe(door, 3)
  plain.flags = { ...plain.flags, ch3KeyTaken: false }
  plain.sceneId = 'ch3:tent'
  const told = { ...plain, flags: { ...plain.flags, ch3KeyTaken: true } }
  ok(bodyOf(plain) === CH3_TENT_BODY && !bodyOf(plain).includes(CH3_TENT_KEY), `${door}: the tent does not name the key`)
  ok(bodyOf(told) === `${CH3_TENT_BODY}\n\n${CH3_TENT_KEY}`, `${door}: Roth's handoff is the only prior line, so the tent adds the expectation`)
  const vein = { ...plain, sceneId: 'ch2:vein', hubId: null, chapterId: 'into-the-maw' }
  ok(bodyOf(vein).startsWith(VEIN_BY_LIFT) && !bodyOf(vein).includes(VEIN_BY_LADDER), `${door}: the lift still grinds to a stop`)
  const climbed = { ...vein, flags: { ...vein.flags, liftLadder: true, liftDone: true } }
  ok(bodyOf(climbed).startsWith(VEIN_BY_LADDER) && !bodyOf(climbed).includes('lift grinds'), `${door}: the ladder replaces the lift line`)
}

console.log(fails ? `v225: ${fails} FAIL` : 'v225: all pass')
process.exit(fails ? 1 : 0)

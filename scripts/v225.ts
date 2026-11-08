/** v225: kill card, weapon verbs, one cover per shared Hunger or Maw beat. */
import { existsSync, readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { resolveEncounter } from '../src/game/encounter.ts'
import { fightVerbButton, fightVerbHit, fightVerbId } from '../src/game/fightVerbs.ts'
import { playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState, ItemId } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v225'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v225'"), 'build v225')

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

console.log(fails ? `v225: ${fails} FAIL` : 'v225: all pass')
process.exit(fails ? 1 : 0)

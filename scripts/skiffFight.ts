/** Turreted Skiff fight and the Oversized Wrench: hull cap, weapon lines, Board & Jam, Disable Steering, two-handed Strike 4. */
import { applyEffect, equipBlock, equipItem, newGame, visibleChoices } from '../src/game/engine.ts'
import { encounterSpec, exchangeDamage, fightStartFlags, resolveEncounter } from '../src/game/encounter.ts'
import { equippedStrike, extractorHeld, gearLookLine, machineryBonus, piercedShell, shockBatonHeld } from '../src/game/kit.ts'
import { migrateEquipped } from '../src/game/repair.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import {
  SKIFF_CRASH,
  SKIFF_HIT_BARE,
  SKIFF_HIT_BLUNT,
  SKIFF_HIT_EDGE,
  SKIFF_HULL_LINE,
  SKIFF_REWARD,
  SKIFF_WIN,
  WRENCH_MECH_LINE,
  BATON_SKIP_LINE,
  BATON_STUN_LINE,
  PIERCE_LINE,
} from '../src/game/v203Lines.ts'
import type { GameState, ItemId } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => {
  if (!c) {
    fails++
    console.log('FAIL', m)
  }
}

function skiff(extra: Partial<GameState> = {}): GameState {
  const s = newGame('prisoner')
  const base = {
    ...s,
    health: 6,
    sap: 6,
    sceneId: 'ch1:p-pipe',
    items: { ...s.items, ...(extra.items ?? {}) },
    equipped: extra.equipped ?? {},
    flags: { ...s.flags, ...fightStartFlags(s, 'skiff'), encounterTerrain: 'open', ...(extra.flags ?? {}) },
  } as GameState
  return { ...base, ...extra, items: base.items, equipped: base.equipped, flags: base.flags }
}

function card(s: GameState): string {
  return String(s.flags.encounterClash ?? '')
}

function hit(weapon?: ItemId, flags: GameState['flags'] = {}, scrap = 0): GameState {
  const items: Partial<GameState['items']> = { scrap }
  if (weapon) items[weapon] = 1
  return applyEffect(skiff({ items, equipped: weapon ? { weapon } : {}, flags }), { resolveEncounter: 'fight', ticks: 1 })
}

ok(encounterSpec(skiff()).mechanical === true && encounterSpec(skiff()).hp === 5, 'skiff is mechanical, Health 5')
ok(ITEMS.wrench.strike === 4 && ITEMS.wrench.twoHanded === true && ITEMS.wrench.offhand == null, 'wrench catalog is Strike 4, two-handed, no off hand')
ok(ITEMS.wrench.desc.includes('Strike 4') && !ITEMS.wrench.desc.includes('Strike 3'), 'wrench description says Strike 4')

// Hull cap. A baton would otherwise clear the shell; the hit is still 1, and the line says so.
const baton = hit('ironwood_baton')
ok(baton.flags.encounterHp === 4, `baton melee takes 1, not a clean kill (${baton.flags.encounterHp})`)
ok(card(baton).includes(SKIFF_HULL_LINE), 'hull line')
ok(card(baton).includes(SKIFF_HIT_BLUNT.replaceAll('{weapon}', 'Shock Baton')), 'baton jams')
ok(!/You hit the Turreted Skiff for/.test(card(baton)) && !/Critical Strike/.test(card(baton)), 'no person-hit line')
ok(!card(baton).includes(WRENCH_MECH_LINE), 'baton has no machinery bonus')
ok(!/Ram/.test(visibleChoices(skiff()).map((c) => c.label).join()), 'no Ram')

const shiv = hit('shiv')
ok(card(shiv).includes(SKIFF_HIT_EDGE.replaceAll('{weapon}', 'Blood Shiv')), 'shiv plunges')
const knife = hit('needle_knife')
ok(card(knife).includes(SKIFF_HIT_EDGE.replaceAll('{weapon}', 'Needle Knife')), 'knife plunges')
const blade = hit('seeker_extractor')
ok(card(blade).includes(SKIFF_HIT_EDGE.replaceAll('{weapon}', 'Seeker Extractor')), 'Seeker blade plunges')
ok(card(blade).includes(PIERCE_LINE) && !card(blade).includes(SKIFF_HULL_LINE), 'Piercing bypasses the hull cap')
ok(/^YOU ♥ \d+ ⚔ Strike 5 🛡 Shell 0$/m.test(card(blade)), 'extractor Strike row stays 5')
ok(/SKIFF ♥ \d+ ⚔ Strike 4 🛡 Shell 3/.test(card(blade)), 'skiff Shell row stays 3')
const skiffHp = Number(/SKIFF ♥ (\d+)/.exec(card(blade))?.[1])
ok(skiffHp <= 1, `piercing hit is more than 1 (${skiffHp})`)
ok(ITEMS.seeker_extractor.strike === 5 && ITEMS.seeker_extractor.desc.includes('Strike 5') && ITEMS.seeker_extractor.desc.includes(PIERCE_LINE), 'extractor catalog')
ok(piercedShell({ equipped: { weapon: 'seeker_extractor' } }, 3) === 1 && !extractorHeld({ equipped: { weapon: 'ironwood_baton' } }), 'pierce is 2 Shell, baton does not pierce')
const bare = hit()
ok(card(bare).includes(SKIFF_HIT_BARE) && card(bare).includes(SKIFF_HULL_LINE), 'bare hands, still capped')

// Wrench +1 is real before the cap and does not raise the hit past 1.
const plain = exchangeDamage(4, 0, 3)
const boosted = exchangeDamage(4 + machineryBonus({ equipped: { weapon: 'wrench' } }, true), 0, 3)
ok(plain === 1 && boosted === 2, `wrench +1 would raise the hit before the cap (${plain} -> ${boosted})`)
const wr = hit('wrench')
ok(wr.flags.encounterHp === 4, `wrench still deals 1 through the hull (${wr.flags.encounterHp})`)
ok(card(wr).includes(WRENCH_MECH_LINE) && card(wr).includes(SKIFF_HULL_LINE), 'wrench line and hull line both show')
ok(card(wr).includes(SKIFF_HIT_BLUNT.replaceAll('{weapon}', 'Oversized Wrench')), 'wrench jams')
ok(!/to your hit\./.test(card(wr)), 'cap does not leave a +N the hull took back')
ok(/^YOU ♥ \d+ ⚔ Strike 4 🛡 Shell 0$/m.test(card(wr)), 'stat row stays the wrench Strike 4')
ok(equippedStrike(skiff({ items: { wrench: 1 }, equipped: { weapon: 'wrench', offhand: 'shiv' } })) === 4, 'stale off-hand adds nothing while the wrench is held')

// Killing blow uses the gunner line and Scrap +1, not "They drop."
let low = skiff({ items: { ironwood_baton: 1 }, equipped: { weapon: 'ironwood_baton' }, flags: { encounterHp: 1 } })
low = applyEffect(low, { resolveEncounter: 'fight', ticks: 1 })
ok(low.flags.encounterDone && card(low).includes(SKIFF_WIN) && !/They drop/.test(card(low)), 'win line')
ok((low.items.scrap ?? 0) === 1, 'win pays Scrap +1')

// Board & Jam only while Hidden, then consumes it and wins.
const hidden = skiff({ flags: { stealthHidden: true }, items: { scrap: 3 } })
const rows = visibleChoices(hidden)
ok(rows.some((c) => c.label === 'Board & Jam' && c.sub === 'Consumes Stealth: Hidden. Guaranteed win.'), 'Board & Jam shown')
ok(!visibleChoices(skiff()).some((c) => c.id === 'enc-board'), 'Board & Jam hidden without Stealth')
const boarded = applyEffect(hidden, rows.find((c) => c.id === 'enc-board')!.effects)
ok(boarded.flags.encounterDone && !boarded.flags.stealthHidden && card(boarded).includes(SKIFF_WIN), 'Board & Jam wins and consumes Hidden')
ok((boarded.items.scrap ?? 0) === 4, 'Board & Jam still pays Scrap +1')

// Disable Steering spends 2 and replaces the gunner line. The reward stays its own line.
const poor = visibleChoices(skiff({ items: { scrap: 1 } }))
ok(!poor.some((c) => c.id === 'enc-steer'), 'Disable Steering requires 2 Scrap')
const rich = skiff({ items: { scrap: 2 } })
const steer = visibleChoices(rich).find((c) => c.id === 'enc-steer')
ok(steer?.label === 'Disable Steering' && steer.sub === 'Pay 2 Scrap. Crash the skiff.', 'Disable Steering copy')
const crashed = applyEffect(rich, steer!.effects)
ok(crashed.flags.encounterDone && card(crashed).includes(SKIFF_CRASH) && !card(crashed).includes(SKIFF_WIN), 'crash line replaces the gunner line')
ok(card(crashed).includes(SKIFF_REWARD) && card(crashed).indexOf(SKIFF_CRASH) < card(crashed).indexOf(SKIFF_REWARD), 'reward line is separate')
ok((crashed.items.scrap ?? 0) === 1, 'pays 2, gains 1')
ok((resolveEncounter(skiff({ items: { scrap: 0 } }), 'steer').fx.flag?.encounterDone) !== true, 'steer without scrap does not win')

// Two-handed equip, lock, and old-save migration.
const g = newGame('prisoner')
const pack = { ...g, items: { ...g.items, wrench: 1, shiv: 1 } } as GameState
ok(equipBlock(pack, 'wrench', 'offhand') === 'Oversized Wrench takes both hands.', 'cannot equip wrench off hand')
const on = equipItem({ ...pack, equipped: { offhand: 'shiv' } }, 'wrench', 'weapon')
ok(on.equipped.weapon === 'wrench' && !on.equipped.offhand, 'equip clears the off hand')
ok(equipBlock(on, 'shiv', 'offhand') === 'Oversized Wrench takes both hands.', 'off hand locked')
ok(gearLookLine(on).includes('Oversized Wrench takes both hands.') && gearLookLine(on).includes('Strike 4'), 'look names two-handed Strike 4')

// Shock Baton is Strike 3. One landed swing in three stuns a Seeker runner for their next action.
ok(ITEMS.ironwood_baton.strike === 3 && ITEMS.ironwood_baton.desc.includes('Strike 3') && !ITEMS.ironwood_baton.desc.includes('Strike 4'), 'baton catalog is Strike 3')
ok(shockBatonHeld({ equipped: { weapon: 'ironwood_baton' } }), 'baton is in hand')
let stunned = false
for (let t = 0; t < 60 && !stunned; t++) {
  const s = newGame('vessel')
  const st = skiff({
    items: { ironwood_baton: 1 },
    equipped: { weapon: 'ironwood_baton' },
    flags: { ...fightStartFlags({ ...s, ticks: t } as GameState, 'runner'), encounterKind: 'runner', encounterHp: 8, encounterTerrain: 'open' },
  })
  const started = { ...st, ticks: t, door: 'vessel' as const, health: 6 }
  const a = applyEffect(started, { resolveEncounter: 'fight', ticks: 1 })
  if (!card(a).includes(BATON_STUN_LINE)) continue
  stunned = true
  const before = a.health
  const b = applyEffect(a, { resolveEncounter: 'fight', ticks: 1 })
  ok(b.health === before && card(b).includes(BATON_SKIP_LINE), `stunned runner skips (${b.health} vs ${before})`)
  ok(!/hits back for/.test(card(b)), 'skip is not a hit')
}
ok(stunned, 'baton stun procced within 60 swings')
let leaked = false
for (let t = 0; t < 40; t++) {
  const s = newGame('prisoner')
  const st = {
    ...s,
    ticks: t,
    health: 6,
    items: { ...s.items, ironwood_baton: 1 },
    equipped: { weapon: 'ironwood_baton' },
    flags: { ...s.flags, ...fightStartFlags(s, 'cutter'), encounterTerrain: 'open', encounterHp: 8 },
  } as GameState
  const a = applyEffect(st, { resolveEncounter: 'fight', ticks: 1 })
  if (card(a).includes(BATON_STUN_LINE)) leaked = true
}
ok(!leaked, 'stun is only for a runner')
const old = migrateEquipped({ ...pack, equipped: { weapon: 'shiv', offhand: 'wrench' } } as GameState)
ok(old.equipped.weapon === 'shiv' && !old.equipped.offhand, 'old off-hand wrench comes off')
const both = migrateEquipped({ ...pack, equipped: { weapon: 'wrench', offhand: 'shiv' } } as GameState)
ok(both.equipped.weapon === 'wrench' && !both.equipped.offhand, 'old paired off-hand comes clear')

if (fails) {
  console.log(`skiffFight: ${fails} failures`)
  process.exit(1)
}
console.log('skiffFight checks OK')

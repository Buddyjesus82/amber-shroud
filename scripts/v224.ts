/** v224: Bone Wash Stray, Silas's three warnings, Jodi's tarp before the trader. */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { effectPills } from '../src/game/kit.ts'
import { BONE_HIDE_LINE, BONE_PAY_LINE, BONE_SIGN_LINE, BONE_SLIP_LINE, BONE_WASH_HOT, BONE_WASH_SCRAP, BONE_WASH_TRADE, BONE_WASH_WIN, STRAY_KILL_LINE } from '../src/game/strayLines.ts'
import { strayHuntBody, strayHuntChoices } from '../src/game/strayHunter.ts'
import { JODI_TARP_BODY } from '../src/game/content/shadeHands.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v233'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v233'"), 'build v224')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/bone-wash-hunter.jpg') && readFileSync('public/sw.js', 'utf8').includes('covers/jodi-tarp.jpg'), 'sw precaches the new covers')

function outcast(sceneId: string, extra: Partial<GameState> = {}): GameState {
  const g = newGame('outcast')
  return {
    ...g,
    sceneId,
    hubId: sceneId.startsWith('ch1:') ? null : 'spine',
    chapterId: sceneId.startsWith('ch1:') ? 'cache-run' : null,
    sap: 6,
    health: 6,
    heat: { cartel: 1, seekers: 0, strays: 2 },
    ...extra,
    items: { ...g.items, scrap: 5, dust_cloak: 1, hide_wrap: 1, vial_drop: 1, ...(extra.items ?? {}) },
    flags: { ...g.flags, heatTaught: true, ...(extra.flags ?? {}) },
    equipped: extra.equipped ?? {},
  } as GameState
}

{
  const hot = outcast('ch1:leave', { heat: { cartel: 0, seekers: 0, strays: 5 }, flags: { strayHunterHere: true, strayHunterHound: true } })
  ok(strayHuntBody(hot) === BONE_WASH_HOT, 'high Heat Bone Wash line')
  const trade = outcast('ch1:leave', { heat: { cartel: 0, seekers: 0, strays: 1 }, items: { hide_wrap: 1 }, flags: { strayHunterHere: true } })
  ok(strayHuntBody(trade) === BONE_WASH_TRADE, 'low Heat trade line')
  const rows = strayHuntChoices(hot, { ambush: { kind: 'strayhound', line: BONE_WASH_HOT } })
  const ids = rows.map((c) => c.id)
  for (const id of ['stray-fight', 'stray-cut', 'stray-feed', 'stray-slip', 'stray-pay', 'stray-sign', 'stray-hide']) ok(ids.includes(id), `bone wash has ${id}`)
  const slip = rows.find((c) => c.id === 'stray-slip')!
  ok(slip.sub === 'Needs the Dust Cloak.' && slip.effects.flash === BONE_SLIP_LINE && slip.effects.remove?.dust_cloak === 1 && slip.effects.heat?.strays === -1, 'slip the stake')
  const pay = rows.find((c) => c.id === 'stray-pay')!
  ok(pay.sub === 'Costs 3 scrap.' && pay.effects.flash === BONE_PAY_LINE && pay.effects.remove?.scrap === 3 && pay.effects.heat?.strays === -1, 'pay the stake')
  const sign = rows.find((c) => c.id === 'stray-sign')!
  ok(sign.effects.remove?.scrap === 2 && sign.effects.flag?.straySignBought === true && sign.effects.flash === BONE_SIGN_LINE, 'buy the sign')
  const hide = rows.find((c) => c.id === 'stray-hide')!
  ok(hide.effects.remove?.hide_wrap === 1 && hide.effects.flash === BONE_HIDE_LINE && !hide.effects.heat, 'buy the hide-word')
  ok(rows.find((c) => c.id === 'stray-feed')?.label === 'Feed the hounds a Drop', 'feed the hounds')
  const paid = applyEffect(hot, pay.effects)
  ok(!paid.flags.strayHunterHere && paid.heat.strays === 4 && (paid.items.scrap ?? 0) === 2, 'pay passes and cools Stray Heat')
  ok(effectPills(pay.effects, hot.heat).some((p) => p.text.startsWith('Strays')), 'pay shows a Stray Heat tag')
}

{
  const g = newGame('outcast')
  let s = applyEffect({ ...g, hubId: 'spine', sceneId: 'spine:shade', sap: 6, items: { ...g.items, scrap: 1 } }, { goto: 'spine:well', sap: -1 })
  ok(s.sceneId === 'spine:jodi-tarp' && s.flags.jodiLegTo === 'spine:well' && getScene(s.sceneId).body === JODI_TARP_BODY, 'shade to well stops at the tarp')
  const turn = visibleChoices(s).find((c) => c.id === 'turn')!
  ok(turn.effects.heat?.cartel === 2 && turn.effects.heat?.strays === 1 && turn.effects.add?.scrap === 1, 'turn her in pills')
  const burned = applyEffect(s, turn.effects)
  ok(burned.sceneId === 'spine:well' && burned.flags.jodi_removed === true && burned.flags.jodi_traded === false, 'turn-in removes her and lands on the well')
  ok(!visibleChoices({ ...burned, sceneId: 'spine:shade' }).some((c) => c.id === 'walk-jodi'), 'the trader cameo stays dark')
  let lived = applyEffect({ ...g, hubId: 'spine', sceneId: 'spine:shade', sap: 6 }, { goto: 'spine:well' })
  lived = applyEffect(lived, visibleChoices(lived).find((c) => c.id === 'leave')!.effects)
  ok(lived.flags.jodiLeft === true && !lived.flags.jodi_removed, 'leaving her keeps her alive')
  ok(visibleChoices({ ...lived, sceneId: 'spine:shade' }).some((c) => c.id === 'walk-jodi'), 'she is the trader after she lives')
}

{
  const silas = outcast('spine:silas')
  const maw = visibleChoices(silas).find((c) => c.id === 'maw-road')!
  ok(maw.effects.flash?.includes('Bone Wash') && maw.effects.flag?.silasMawTold === true, 'Maw road')
  const cool = visibleChoices(silas).find((c) => c.id === 'trails')!
  ok(cool.effects.flash?.startsWith('Strays.'), 'trails under Cartel Heat 6')
  const hot = visibleChoices({ ...silas, heat: { ...silas.heat, cartel: 6 } }).find((c) => c.id === 'trails-hot')!
  ok(hot.effects.flash?.startsWith('Cartel Heat like that'), 'trails at Cartel Heat 6')
  const well = visibleChoices(silas).find((c) => c.id === 'well-lead')!
  ok(well.effects.flag?.silasWellTold === true && well.effects.flash?.includes("I don't keep a key"), 'Dry Well lead')
  ok(BONE_WASH_WIN === 'The cord goes slack. Another stake will come.' && BONE_WASH_SCRAP === 'Scrap +2.' && STRAY_KILL_LINE === 'Stray Heat +1.', 'win lines stay separate')
}

console.log(fails ? `v224: ${fails} FAIL` : 'v224: all pass')
process.exit(fails ? 1 : 0)

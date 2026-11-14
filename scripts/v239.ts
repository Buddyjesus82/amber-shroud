/** v239: a recruit that would replace the current helper asks first (Jeramie, t1243u). */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, SWAP_CONFIRM, visibleChoices } from '../src/game/engine.ts'
import { showMapButton } from '../src/game/map.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v239'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v239'"), 'build v239')
ok(SWAP_CONFIRM('Hester Ellery', 'Sable Varn') === 'Hester Ellery will leave the party. Take Sable Varn instead?', 'approved line')

const at = (door: GameState['door'], sceneId: string, flags: GameState['flags'], extra: Partial<GameState> = {}): GameState => {
  const base = newGame(door)
  return { ...base, sceneId, hubId: null, chapterId: null, sap: 10, ...extra, flags: { ...base.flags, ...flags } }
}

// Hester in the slot, Sable's recruit after her waves.
const s = at('outcast', 'spine:sable', { companion: 'hester', companionHp: 5, sableWon: true })
const row = visibleChoices(s).find((c) => c.id === 'sable_recruit')
ok(!!row, 'Sable recruit row shows')
const asked = applyEffect(s, row!.effects)
ok(asked.sceneId === 'spine:sable' && asked.flags.companion === 'hester', 'nothing changes yet')
ok(asked.flash === 'Hester Ellery will leave the party. Take Sable Varn instead?', 'confirm text exact')
const rows = visibleChoices(asked)
ok(rows.length === 2 && rows[0].label === 'Swap' && rows[1].label === 'Keep Hester' && !rows[0].sub && !rows[1].sub, `two buttons: ${rows.map((r) => r.label).join(' / ')}`)
ok(!showMapButton(asked), 'map hidden while confirming')

const swapped = applyEffect(asked, rows[0].effects)
ok(swapped.flags.companion === 'sable' && swapped.sceneId === 'spine:shattered' && swapped.flags.recruitPending === undefined, 'Swap recruits Sable and follows the goto')
ok((swapped.flash ?? '').includes('Hester Ellery leaves the party.') && (swapped.flash ?? '').includes('Sable Varn joins the party.'), 'old helper leaves, new one joins')

const kept = applyEffect(asked, rows[1].effects)
ok(kept.flags.companion === 'hester' && kept.sceneId === s.sceneId && kept.flags.recruitPending === undefined && !kept.flash, 'Keep leaves state unchanged')
ok(kept.sap === s.sap && JSON.stringify(kept.heat) === JSON.stringify(s.heat) && JSON.stringify(kept.items) === JSON.stringify(s.items), 'Keep spends nothing')
ok(visibleChoices(kept).some((c) => c.id === 'sable_recruit'), 'recruit row back after Keep')

// Typed answers.
ok(interpret(asked, 'swap').flags.companion === 'sable', 'typed swap')
ok(interpret(asked, 'keep hester').flags.companion === 'hester' && interpret(asked, 'keep hester').flags.recruitPending === undefined, 'typed keep')
ok(interpret(asked, 'dance').flags.recruitPending === asked.flags.recruitPending, 'other typing keeps the confirm up')

// Empty slot: no confirm.
const solo = at('outcast', 'spine:sable', { sableWon: true })
const joined = applyEffect(solo, visibleChoices(solo).find((c) => c.id === 'sable_recruit')!.effects)
ok(joined.flags.companion === 'sable' && joined.sceneId === 'spine:shattered' && joined.flags.recruitPending === undefined, 'empty slot recruits at once')

// Orla (prisoner): pay costs wait for Swap.
const o = at('prisoner', 'camp:orla', { companion: 'kelt', companionHp: 2, keltStatus: 'active', keltScenes: 0, keltMax: 4 }, { items: { ...newGame('prisoner').items, seeker_rations: 1 } })
const oRow = visibleChoices(o).find((c) => c.id === 'orla_ration')!
const oAsk = applyEffect(o, oRow.effects)
ok(oAsk.flash === "Kelt's Runner will leave the party. Take Orla Lusk instead?" && oAsk.items.seeker_rations === 1, 'Orla confirm, rations kept')
ok(visibleChoices(oAsk)[1]?.label === "Keep Kelt's Runner", "Keep Kelt's Runner")
const oSwap = applyEffect(oAsk, { recruitSwap: true })
ok(oSwap.flags.companion === 'orla' && !oSwap.items.seeker_rations && oSwap.flags.keltStatus === 'failed', 'Orla swap spends the rations, Kelt fails')

// Hester (outcast) with Sable in the slot.
const h = at('outcast', 'spine:hester', { companion: 'sable', companionHp: 3 })
const hRow = visibleChoices(h).find((c) => c.effects.recruit === 'hester')!
const hAsk = applyEffect(h, hRow.effects)
ok(hAsk.flash === 'Sable Varn will leave the party. Take Hester Ellery instead?' && visibleChoices(hAsk)[1]?.label === 'Keep Sable', 'Hester confirm')

// Kelt with Orla in the slot.
const k = at('prisoner', 'thresh:breach', { companion: 'orla', companionHp: 4 })
const kRow = visibleChoices(k).find((c) => c.id === 'as_is')
if (kRow) {
  const kAsk = applyEffect(k, kRow.effects)
  ok(kAsk.flash === "Orla Lusk will leave the party. Take Kelt's Runner instead?" && visibleChoices(kAsk)[1]?.label === 'Keep Orla' && kAsk.flags.keltStatus === undefined, 'Kelt confirm')
  ok(applyEffect(kAsk, { recruitSwap: true }).flags.companion === 'kelt', 'Kelt swap')
} else ok(false, 'Kelt row shows')

// Saves: a pending swap reloads intact; a stale one is dropped.
const re = repairLoadedState(JSON.parse(JSON.stringify(asked)) as GameState)
ok(re.flags.recruitPending === asked.flags.recruitPending && visibleChoices(re)[0]?.label === 'Swap', 'pending swap survives a reload')
const stale = repairLoadedState({ ...asked, sceneId: 'spine:shattered' })
ok(stale.flags.recruitPending === undefined, 'stale swap dropped on load')
const bad = repairLoadedState({ ...asked, flags: { ...asked.flags, recruitPending: '{oops' } })
ok(bad.flags.recruitPending === undefined, 'bad swap data dropped on load')

if (fails) { console.log(`v239: ${fails} failure(s)`); process.exit(1) }
console.log('v239 ok')

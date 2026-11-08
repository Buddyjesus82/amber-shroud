/** v221: Barrow cache replaces Scavenge. One pick, then empty. npx tsx scripts/v221.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, scavenge, visibleChoices } from '../src/game/engine.ts'
import { isChoiceOn } from '../src/game/engine.ts'
import {
  BARROW_BYPASS,
  BARROW_BYPASS_LOCK,
  BARROW_CACHE_SCENES,
  BARROW_CARTEL_1,
  BARROW_CARTEL_2,
  BARROW_EMPTY,
  BARROW_POP,
  BARROW_POP_SUB,
  BARROW_SAP_1,
  BARROW_SCRAP_1,
  BARROW_SCRAP_2,
  BARROW_SIPHON,
  BARROW_HEAT_LINE,
  barrowLootKey,
} from '../src/game/heatRelief.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v225'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v225'"), 'build v221')
ok(BARROW_BYPASS_LOCK === `Requires: ${ITEMS.rig_passkey.name} or ${ITEMS.cipher_key.name}`, 'bypass names the keys')

function at(sceneId: string, extra: Partial<GameState> = {}): GameState {
  const g = newGame('prisoner')
  return {
    ...g,
    sceneId,
    hubId: sceneId.startsWith('camp:') ? 'camp04' : sceneId.startsWith('thresh:') ? 'threshold' : null,
    sap: 4,
    heat: { cartel: 1, seekers: 3, strays: 0 },
    ...extra,
    items: { ...g.items, ...(extra.items ?? {}) },
    flags: { ...g.flags, ...(extra.flags ?? {}) },
    equipped: extra.equipped ?? {},
  } as GameState
}

function row(s: GameState, id: string) {
  return visibleChoices(s).find((c) => c.id === id)
}

for (const id of BARROW_CACHE_SCENES) {
  const s = at(id)
  ok(row(s, 'barrow-pop') && row(s, 'barrow-bypass') && row(s, 'barrow-siphon'), `${id}: three cache options`)
  ok(!visibleChoices(s).some((c) => c.label === 'Scavenge'), `${id}: cache rows are not a scavenge button`)
  const bare = scavenge(s)
  ok((bare.items.scrap ?? 0) === (s.items.scrap ?? 0) && bare.heat.seekers === 3 && !bare.flags[barrowLootKey(id)], `${id}: typed scavenge does not loot or cool Heat`)
}

// Pop, no wrench.
{
  const s = at('camp:siftline')
  const pop = row(s, 'barrow-pop')!
  ok(pop.sub === BARROW_POP_SUB && pop.label === BARROW_POP, 'pop asks for the wrench when it is not equipped')
  const n = applyEffect(s, pop.effects)
  ok(n.flash === `${BARROW_SCRAP_1}\n\n${BARROW_CARTEL_1}`, 'pop without wrench: both lines')
  ok((n.items.scrap ?? 0) === (s.items.scrap ?? 0) + 1 && n.heat.cartel === 2, 'pop without wrench: Scrap +1, Cartel Heat +1')
  ok(n.flags[barrowLootKey('camp:siftline')] === true, 'pop sets the looted flag')
  ok(!row(n, 'barrow-pop') && !row(n, 'barrow-bypass') && !row(n, 'barrow-siphon'), 'one pick removes the options')
  ok(row(n, 'barrow-empty')?.label === BARROW_EMPTY, 'spent state')
  const later = { ...n, ticks: n.ticks + 5, sceneId: 'camp:yard', flags: { ...n.flags } } as GameState
  const back = { ...later, sceneId: 'camp:siftline' } as GameState
  ok(row(back, 'barrow-empty')?.label === BARROW_EMPTY && !row(back, 'barrow-pop'), 'empty state persists across time and leaving')
}

// Pop, wrench equipped. No heat.
{
  const s = at('ch2:p-sift', { items: { wrench: 1 }, equipped: { weapon: 'wrench' } })
  const pop = row(s, 'barrow-pop')!
  ok(pop.sub == null, 'equipped wrench: no heat subtitle')
  const n = applyEffect(s, pop.effects)
  ok(n.flash === BARROW_SCRAP_1 && n.heat.cartel === 1 && (n.items.scrap ?? 0) === (s.items.scrap ?? 0) + 1, 'pop with wrench: Scrap +1, no heat')
  ok(n.equipped.weapon === 'wrench', 'wrench stays equipped')
}

// Bypass gating and both keys.
{
  const s = at('thresh:conduits')
  const locked = row(s, 'barrow-bypass')!
  ok(locked.label === BARROW_BYPASS && !isChoiceOn(s, locked.enable) && locked.locked === BARROW_BYPASS_LOCK, 'bypass locked without a key')
  for (const key of ['rig_passkey', 'cipher_key'] as const) {
    const held = at('thresh:conduits', { items: { [key]: 1 } })
    const open = row(held, 'barrow-bypass')!
    ok(isChoiceOn(held, open.enable), `${key} opens bypass`)
    const n = applyEffect(held, open.effects)
    ok(n.flash === `${BARROW_SCRAP_2}\n\n${BARROW_HEAT_LINE}`, `${key}: bypass lines`)
    ok((n.items.scrap ?? 0) === (held.items.scrap ?? 0) + 2 && n.heat.seekers === 2, `${key}: Scrap +2, Seeker Heat -1`)
    ok(row(n, 'barrow-empty')?.label === BARROW_EMPTY, `${key}: cache stays empty`)
  }
}

// Siphon.
{
  const s = at('thresh:subdrain')
  const sip = row(s, 'barrow-siphon')!
  ok(sip.label === BARROW_SIPHON, 'siphon label')
  const n = applyEffect(s, sip.effects)
  ok(n.flash === `${BARROW_SAP_1}\n\n${BARROW_CARTEL_2}`, 'siphon lines')
  ok(n.sap === 5 && n.heat.cartel === 3, 'siphon: Sap +1, Cartel Heat +2')
  ok(!row(n, 'barrow-pop'), 'siphon is the one pick')
}

// An old first-scavenge flag is not the new looted flag.
{
  const s = at('camp:siftline', { flags: { 'barrowCache:camp:siftline': true } })
  ok(!!row(s, 'barrow-pop') && !row(s, 'barrow-empty'), 'old barrowCache flag does not spend the cache')
}

console.log(fails ? `v221: ${fails} FAIL` : 'v221: all pass')
process.exit(fails ? 1 : 0)

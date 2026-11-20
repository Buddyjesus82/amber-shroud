/** v247: trench fallback blade for the Crosshaven cables. Needle Knife free; dagger or shiv costs Health 1. */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, visibleChoices } from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v250'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v250'"), 'build v250')

const DIG = 'Under a fallen iron screen, a blade someone lost to the grit. Rusted, but it still holds an edge.'
const ROUGH = 'The rust bites back. The edge skips and opens your palm, but the braids part one by one.'
const CUT = 'The rotted bindings part under the blade, one braid at a time. The drum is free of rope, but silt has welded it solid.'
const SUB = 'Needle Knife, or any blade (Health −1).'
const LOCKED = 'The cables are bound too thick to pull. You need a blade.'

const g = newGame('outcast')
const bare = (sceneId: string, items: Record<string, number>): GameState => {
  const it = { ...g.items } as Record<string, number>
  delete it.needle_knife; delete it.rusted_dagger; delete it.shiv
  return { ...g, sceneId, hubId: 'barrow', health: 5, sap: 4, items: { ...it, ...items }, flags: { ...g.flags, ch3Out: true, ch3VaultDone: true, noMasked: true } } as GameState
}
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const press = (s: GameState, id: string) => { const c = row(s, id); if (!c) throw new Error(`no ${id} on ${s.sceneId}: ${ids(s).join()}`); return applyEffect(s, c.effects) }

// ── Trench: one free pick ──
const t0 = bare('ch3:trench', {})
const dig = row(t0, 'dig-screens')
ok(dig && dig.label === 'Dig through the screens' && !dig.sub && isChoiceOn(t0, dig.enable), 'trench offers Dig through the screens, free')
const t1 = press(t0, 'dig-screens')
ok(t1.sceneId === 'ch3:trench' && t1.flash === DIG && (t1.items.rusted_dagger ?? 0) === 1 && t1.sap === 4 && t1.health === 5, 'dig gives the dagger, free, with the flash')
ok(!row(t1, 'dig-screens'), 'dig hides after')
const back = { ...t1, sceneId: 'ch3:relay' }
ok(!row({ ...back, sceneId: 'ch3:trench', flash: undefined } as GameState, 'dig-screens'), 'still hidden on a return')

// ── Cables ──
const cab = (items: Record<string, number>) => bare('ch3:crosshaven', items)
const knife = cab({ needle_knife: 1 })
const k = row(knife, 'cut-cables')
ok(k && k.sub === SUB && isChoiceOn(knife, k.enable) && !row(knife, 'cut-cables-rough'), 'knife: one cables row, enabled')
const kc = press(knife, 'cut-cables')
ok(kc.health === 5 && kc.flags.crosshavenCablesCut && kc.flash === CUT, 'knife cuts free, as before')
const kd = cab({ needle_knife: 1, rusted_dagger: 1 })
ok(press(kd, 'cut-cables').health === 5 && !row(kd, 'cut-cables-rough'), 'knife plus dagger: still free')

for (const blade of ['rusted_dagger', 'shiv']) {
  const s = cab({ [blade]: 1 })
  const r = row(s, 'cut-cables-rough')
  ok(r && r.label === 'Cut the winch cables' && r.sub === SUB && isChoiceOn(s, r.enable) && !row(s, 'cut-cables'), `${blade}: rough cables row, enabled`)
  const c = press(s, 'cut-cables-rough')
  ok(c.health === 4 && c.flags.crosshavenCablesCut && c.flash === ROUGH && (c.items[blade as 'shiv'] ?? 0) === 1, `${blade}: cuts for Health 1, keeps the blade`)
  ok(!row(c, 'cut-cables-rough') && !row(c, 'cut-cables') && row(c, 'crank-drum'), `${blade}: then the drum`)
}

const typed = interpret(cab({ rusted_dagger: 1 }), 'cut the cables')
ok(typed.flags.crosshavenCablesCut && typed.health === 4 && typed.flash === ROUGH, 'typed cut with the dagger: same as the button')
ok(interpret(cab({ needle_knife: 1 }), 'cut the cables').health === 5, 'typed cut with the knife: free')
const none = cab({})
const n = row(none, 'cut-cables-rough')
ok(n && !isChoiceOn(none, n.enable) && n.locked === LOCKED && n.sub === SUB && !row(none, 'cut-cables'), 'no blade: locked')
ok(interpret(none, 'cut the cables').flash === LOCKED && !interpret(none, 'cut the cables').flags.crosshavenCablesCut, 'typed cut with no blade: locked line')
ok(visibleChoices(none).filter((c) => c.label === 'Cut the winch cables').length === 1, 'never two cables rows')

// ── Other knife gates stay Needle Knife only ──
const src = readFileSync('src/game/content/luminspire.ts', 'utf8')
ok((src.match(/rusted_dagger/g) ?? []).length === 2 && (src.match(/'shiv'/g) ?? []).length === 1, 'dagger and shiv open only the cables')

if (fails) { console.log(`v247: ${fails} failure(s)`); process.exit(1) }
console.log('v247 ok')

/** v216: Chapter Three opening ship checks. npx tsx scripts/v216.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { resolveEncounter } from '../src/game/encounter.ts'
import { vaultSneakOdds } from '../src/game/ch3.ts'
import { playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
const coverFor = (st: GameState) => playCoverKey(st, getScene(st.sceneId))
import { readFileSync } from 'node:fs'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const pick = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const go = (s: GameState, id: string) => { const c = pick(s, id); if (!c) throw new Error(`no choice ${id} at ${s.sceneId}`); return applyEffect(s, c.effects) }
const g0 = newGame('prisoner' as never)
const base = { ...g0, sceneId: 'ch3:capture', hubId: null, chapterId: 'into-the-maw', sap: 5, items: { ...g0.items, spire_key: 1, salve: 2 }, flags: { ...g0.flags, noMasked: true } } as GameState
ok(getScene('ch3:capture').body.includes("Roth Vane: 'There's no point in running, outsider. Silence is the only mercy left.'"), 'roth line')
ok(pick(base, 'fight')?.sub && pick(base, 'run')?.sub, 'fight/run subs')
let w = go(go(go(base, 'run'), 'slip'), 'leave')
ok(!w.items.salve, 'consumables taken at capture')
let f = go(w, 'fight')
const label = visibleChoices(f).find((c: any) => c.id === 'enc-fight')?.label ?? ''
ok(label === 'Strike Vex Ironhand', `button label (${label})`)
const h = f.heat.seekers
let g: GameState = { ...f, health: 99, healthMax: 99, items: { ...f.items, valerius_baton: 1 } }
let sawAsh = false
for (let i = 0; i < 80 && g.flags.encounterHere; i++) {
  if (g.flags.encounterKind === 'ash' && !sawAsh) { sawAsh = true; ok(coverFor(g) === 'ch3_ash_fight', 'ash art') }
  if (g.flags.encounterDone) { g = applyEffect(g, visibleChoices(g)[0].effects); continue }
  g = applyEffect(g, visibleChoices(g).find((c: any) => c.id === 'enc-fight')!.effects)
}
ok(g.heat.seekers === h + 2 && g.flash?.includes('Seeker Heat +2.'), `win heat +2 (${h}->${g.heat.seekers})`)
ok(readFileSync('src/version.ts', 'utf8').includes("BUILD = 'v2") && readFileSync('public/sw.js', 'utf8').includes('covers/ch3-ash-fight.jpg'), 'build')
ok(coverFor({ ...base, sceneId: 'ch3:wagon', flags: { ch3Helper: 'wren' } } as GameState) === 'ch3_wagon_wren' && coverFor({ ...base, sceneId: 'ch3:wagon', flags: { ch3Helper: 'corvus' } } as GameState) === 'ch3_wagon', 'wren wagon art')
ok(coverFor({ ...base, sceneId: 'ch3:tent', flags: { wrenPromise: true } } as GameState) === 'ch3_wren_deal', 'wren deal art')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/ch3-wren-deal.jpg'), 'wren art precached')
ok(getScene('ch3:crosshaven').body.startsWith('The Spire Key is cold against your palm, heavy with stolen brass.'), 'crosshaven line')
console.log(fails ? `v216: ${fails} FAIL` : 'v216: all pass')
process.exit(fails ? 1 : 0)

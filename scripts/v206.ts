/** v206 DRAFT: Chapter Three opening. npx tsx scripts/v206.ts */
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

const base = (): GameState => { const g = newGame('prisoner' as never); return { ...g, sceneId: 'ch2:heart', hubId: null, chapterId: 'into-the-maw', sap: 5, items: { ...g.items, spire_key: 1, salve: 2 }, flags: { ...g.flags, noMasked: true, companion: 'orla', companionHp: 3 } } as GameState }
let s = go(go(base(), 'continue'), 'continue')
ok(s.sceneId === 'ch3:capture' && s.flags.chapter2Done, 'ch2 heart -> end card -> ch3 capture')
for (const how of ['fight', 'run']) {
  const c = go(s, how)
  ok(c.sceneId === 'ch3:wagon', `${how} lands at wagon`)
  ok(c.sap === 0 && !c.items.spire_key && !c.items.salve && !c.flags.companion && c.flags.ch3KeyTaken, `${how} strips`)
  ok(c.flash?.includes('Your companions are taken. You are alone.') && c.flash.includes('Spire Key taken.'), `${how} strip lines`)
  ok(c.flags.ch3Helper === 'wren' || c.flags.ch3Helper === 'corvus', 'helper set')
}
let w = go(s, 'fight')
const h0 = w.heat.seekers
w = go(w, 'wait')
ok(w.heat.seekers === h0 + 1 && !pick(w, 'wait'), 'wait +1 heat once')
w = go(w, 'slip')
ok(w.sceneId === 'ch3:supply', 'slip to supply')
const h1 = w.heat.seekers
w = go(w, 'sap')
ok(w.sap === 5 && w.items.salve === 2 && w.heat.seekers === h1, 'first grab free, sap+consumables back')
w = go(w, 'weapon')
ok(w.heat.seekers === h1 + 1 && w.flash?.includes('The noise carries. Seeker Heat +1.'), 'second grab +1 heat')
w = go(w, 'leave')
ok(w.sceneId === 'ch3:tent', 'to tent')
ok(vaultSneakOdds(0) === 2 && vaultSneakOdds(6) === 5 && vaultSneakOdds(20) === 9, 'sneak odds')
// Wren deal.
const wren = { ...w, flags: { ...w.flags, ch3Helper: 'wren' } }
const d = go(wren, 'wren')
ok(d.flags.wrenPromise && d.items.spire_key === 1 && d.flash?.includes('You gave Wren your word.'), 'wren deal')
ok(!pick({ ...w, flags: { ...w.flags, ch3Helper: 'corvus' } }, 'wren'), 'no wren deal with corvus')
// Forced fight: vex then ash.
let f = go(w, 'fight')
ok(f.flags.encounterHere && f.flags.encounterKind === 'vex', 'vex fight opens')
ok(coverFor(f) === 'ch3_vex_fight', 'fight art')
for (const id of ['ch3:capture', 'ch3:wagon', 'ch3:supply', 'ch3:tent', 'ch3:crosshaven']) ok(String(coverFor({ ...w, sceneId: id, flags: {} } as GameState)).startsWith('ch3_'), `art ${id}`)
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes('amber-shroud-v224') && sw.includes('covers/ch3-tent.jpg'), 'sw')
// Win both: strong player, strike until done.
let g: GameState = { ...f, health: 99, healthMax: 99, items: { ...f.items, valerius_baton: 1 } }
const kinds: string[] = []
for (let i = 0; i < 80 && g.flags.encounterHere; i++) {
  if (!kinds.includes(String(g.flags.encounterKind))) kinds.push(String(g.flags.encounterKind))
  if (g.flags.encounterDone) { const c = visibleChoices(g)[0]; g = applyEffect(g, c.effects); continue }
  g = applyEffect(g, visibleChoices(g).find((c: any) => c.id === 'enc-fight')!.effects)
}
ok(kinds.join(',') === 'vex,ash', `chain vex->ash (${kinds})`)
ok(g.items.spire_key === 1 && g.flags.ch3VaultDone && pick(g, 'go'), 'key after ash')
console.log(fails ? `${fails} FAIL` : 'v206 ok')
process.exit(fails ? 1 : 0)

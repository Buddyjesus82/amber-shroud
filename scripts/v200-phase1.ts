/** v200 DRAFT: Phase 1 pre-Maw camps. Wiring, numbers, items, no orphans. npx tsx scripts/v200-phase1.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { ALL_SCENES, getScene, hasScene } from '../src/game/content/index.ts'
import { playCoverKey } from '../src/game/art.ts'
import { existsSync } from 'node:fs'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const at = (door: DoorId, sceneId: string, extra: Partial<GameState> = {}, flags: Record<string, unknown> = {}): GameState => {
  const g = newGame(door)
  return { ...g, sceneId, sap: 8, health: 6, ...extra, flags: { ...g.flags, noMasked: true, ...flags } } as GameState
}
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const pick = (s: GameState, id: string) => { const c = visibleChoices(s).find((x) => x.id === id); ok(c, `${s.sceneId}: ${id} visible (${ids(s)})`); return c ? applyEffect(s, c.effects) : s }
const NEW = ['camp:sift-gate', 'camp:log-vents', 'camp:log-deck', 'spine:dugouts', 'spine:skimmer', 'spine:dusteye', 'thresh:echo-gate', 'thresh:conduits', 'thresh:parade']
for (const id of NEW) ok(hasScene(id), `${id} exists`)
// no orphans: every new scene is a goto target of some other scene
const targets = new Set<string>()
for (const s of ALL_SCENES) for (const c of s.choices ?? []) if (c.effects.goto && c.effects.goto !== s.id) targets.add(c.effects.goto)
for (const id of NEW) ok(targets.has(id), `${id} has an inbound door`)
ok(getScene('camp:sift-gate').body === 'A lumbering timber-framed entry suspended over a deep pit. Heavily guarded by Cartel mercenaries.', 'gate text verbatim')
// Prisoner
let p = pick(at('prisoner', 'camp:bay', { hubId: 'camp04' }), 'outpost09')
ok(p.sceneId === 'camp:sift-gate' && p.sap === 7, 'bay → gate 1 Sap')
const b = pick(p, 'bribe'); ok(b.sceneId === 'camp:log-deck' && b.sap === 6 && b.heat.cartel === p.heat.cartel + 1, 'bribe 1 Sap, Cartel +1')
const v = pick(pick(p, 'vents'), 'crawl'); ok(v.sceneId === 'camp:wire' && v.health === 4 && v.heat.cartel === p.heat.cartel, 'vents Health 2, no heat, to the Wire')
const w = pick(b, 'wire'); ok(w.sceneId === 'camp:wire' && w.sap === 5, 'deck → wire 1 Sap')
const passed = pick({ ...p, items: { ...p.items, cartel_pass: 1 } }, 'pass'); ok(passed.sceneId === 'camp:log-deck' && passed.sap === 7, 'pass: free entry')
const bought = pick({ ...b, items: { ...b.items, scrap: 1 } }, 'salve'); ok(bought.items.salve === (b.items.salve ?? 0) + 1, 'salve 1 scrap')
// Outcast
let o = pick(at('outcast', 'spine:well', { hubId: 'spine' }), 'dusteye'); ok(o.sceneId === 'spine:dugouts' && o.sap === 7, 'well → dugouts 1 Sap')
const k = pick(o, 'kin'); ok(k.sceneId === 'spine:dusteye', 'kinship')
const tp = pick(o, 'tribute'); ok(tp.sap === 6, 'tribute 1 Sap')
ok(pick(tp, 'hound').sap === 4, 'hound 2 Sap without map')
const m = pick({ ...tp, items: { ...tp.items, scrap: 2 } }, 'map'); ok(m.flags.hasStormMap && pick(m, 'hound-map').sap === 5, 'storm map: hound 1 Sap')
const sk = pick(pick(o, 'wreck'), 'salvage'); ok(sk.items.skimmer_plating === 1, 'plating')
const rs = pick({ ...k, health: 3 }, 'rest'); ok(rs.health === 5 && rs.sap === k.sap - 1 && !ids(rs).includes('rest'), 'rest +2 Health 1 Sap once')
// Vessel
let e = pick(at('vessel', 'thresh:guard', { hubId: 'threshold' }), 'echo'); ok(e.sceneId === 'thresh:echo-gate' && e.sap === 7, 'guard → echo 1 Sap')
ok(pick(e, 'creds').sceneId === 'thresh:parade', 'credentials')
ok(pick(pick(e, 'conduits'), 'navigate').sceneId === 'thresh:court', 'conduits → court')
const r = pick(pick(e, 'bribe'), 'rations'); ok(r.items.seeker_rations === 1, 'rations')
ok(pick(pick(e, 'bribe'), 'court').sceneId === 'thresh:court', 'parade → court')
for (const id of NEW) { const k = playCoverKey(at('prisoner', id), getScene(id)); ok(k && String(k).startsWith('p1_'), `${id} cover (${k})`) }
for (const f of ['sift-gate','log-vents','log-deck','dugouts','skimmer','dusteye','echo-gate','conduits','parade']) ok(existsSync(`public/covers/p1-${f}.jpg`), `art ${f}`)
console.log(fails ? `${fails} FAIL` : 'v200-phase1 OK'); process.exit(fails ? 1 : 0)

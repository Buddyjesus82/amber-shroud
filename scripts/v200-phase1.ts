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
// Prisoner: Guard Station -> Outpost 09 -> Skiff Bay
ok(!ids(at('prisoner', 'camp:bay', { hubId: 'camp04' })).includes('outpost09'), 'no entry from Skiff Bay (old backwards road)')
let p = pick(at('prisoner', 'camp:guard', { hubId: 'camp04' }), 'outpost09')
ok(p.sceneId === 'camp:sift-gate' && p.sap === 7, 'guard station -> gate 1 Sap')
const b = pick(p, 'bribe_foreman'); ok(b.sceneId === 'camp:log-deck' && b.sap === 6 && b.heat.cartel === p.heat.cartel, 'bribe_foreman 1 Sap, no heat')
ok(getScene('camp:sift-gate').choices!.find((c) => c.id === 'steal_manifest')!.effects.sneak?.kind === 'patrol', 'steal_manifest sneak, patrol fight')
const v = pick(pick(p, 'vents'), 'crawl_vents'); ok(v.sceneId === 'camp:bay' && v.health === 4, 'crawl_vents Health 2, to Skiff Bay')
const d = pick(b, 'skiffbay'); ok(d.sceneId === 'camp:bay' && d.sap === 5, 'deck -> Skiff Bay 1 Sap')
ok(ids(b).sort().join() === 'back,skiffbay', 'deck: no special actions')
const passed = pick({ ...p, items: { ...p.items, cartel_pass: 1 } }, 'pass'); ok(passed.sceneId === 'camp:log-deck' && passed.sap === 7, 'pass: free entry')
// Outcast: Dry Well -> Dust-Eye -> Hound Sign
let o = pick(at('outcast', 'spine:well', { hubId: 'spine' }), 'dusteye'); ok(o.sceneId === 'spine:dugouts' && o.sap === 7, 'well -> dugouts 1 Sap')
ok(pick(o, 'offer_sap').sap === 6, 'offer_sap 1 Sap')
const k = pick(o, 'rep_check'); ok(k.sceneId === 'spine:dusteye', 'rep_check')
ok(JSON.stringify(getScene('spine:dugouts').choices!.find((c) => c.id === 'rep_check')!.enable) === JSON.stringify({ heatMax: ['strays', 2] }), 'rep_check Stray Heat <= 2')
const sk = pick(pick(o, 'wreck'), 'salvage_part'); ok(sk.items.skimmer_plating === 1, 'plating')
const rs = pick({ ...k, health: 3 }, 'rest_dugout'); ok(rs.health === 5 && rs.sap === k.sap - 1 && !ids(rs).includes('rest_dugout'), 'rest_dugout +2 Health 1 Sap once')
ok(pick(k, 'hound').sceneId === 'spine:hound', 'dust-eye -> hound sign')
// Vessel: Guard Post -> Echo -> Court
let e = pick(at('vessel', 'thresh:guard', { hubId: 'threshold' }), 'echo'); ok(e.sceneId === 'thresh:echo-gate' && e.sap === 7, 'guard post -> echo 1 Sap')
ok(!ids(e).includes('back'), 'old loop back to Guard Post removed')
const pb = pick(e, 'bribe_clerk'); ok(pb.sceneId === 'thresh:parade' && pb.sap === 6, 'bribe_clerk 1 Sap')
ok(getScene('thresh:conduits').choices!.find((c) => c.id === 'sneak_conduits')!.effects.goto === 'thresh:court', 'sneak_conduits -> court')
ok(getScene('thresh:parade').choices!.find((c) => c.id === 'scavenge_supplies')!.effects.add?.seeker_rations === 1, 'scavenge grants rations')
ok(pick(pb, 'court').sceneId === 'thresh:court', 'parade -> court')
for (const id of NEW) { const k = playCoverKey(at('prisoner', id), getScene(id)); ok(k && String(k).startsWith('p1_'), `${id} cover (${k})`) }
for (const f of ['sift-gate','log-vents','log-deck','dugouts','skimmer','dusteye','echo-gate','conduits','parade']) ok(existsSync(`public/covers/p1-${f}.jpg`), `art ${f}`)
console.log(fails ? `${fails} FAIL` : 'v200-phase1 OK'); process.exit(fails ? 1 : 0)

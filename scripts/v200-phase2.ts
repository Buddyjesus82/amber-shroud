/** v200 DRAFT: Phase 2 deep camps. Wiring, numbers, gating, covers. npx tsx scripts/v200-phase2.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { ALL_SCENES, getScene, hasScene } from '../src/game/content/index.ts'
import { playCoverKey } from '../src/game/art.ts'
import { HEAVY_TOOL, VEIN_KEY } from '../src/game/content/newPlaces.ts'
import { existsSync } from 'node:fs'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const at = (door: DoorId, sceneId: string, extra: Partial<GameState> = {}, flags: Record<string, unknown> = {}): GameState => {
  const g = newGame(door)
  return { ...g, sceneId, sap: 8, health: 6, ...extra, flags: { ...g.flags, noMasked: true, ...flags } } as GameState
}
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const ch = (s: GameState, id: string) => visibleChoices(s).find((x) => x.id === id)
const pick = (s: GameState, id: string) => { const c = ch(s, id); ok(c, `${s.sceneId}: ${id} visible (${ids(s)})`); return c ? applyEffect(s, c.effects) : s }
const NEW = ['deep:rubble', 'deep:shanty', 'deep:anvil', 'deep:drill-deck', 'deep:vents', 'deep:vein-approach', 'deep:crucible', 'deep:lock']
for (const id of NEW) ok(hasScene(id), `${id} exists`)
const targets = new Set<string>()
for (const s of ALL_SCENES) for (const c of s.choices ?? []) if (c.effects.goto && c.effects.goto !== s.id) targets.add(c.effects.goto)
for (const id of NEW) ok(targets.has(id), `${id} has an inbound door`)
for (const t of ['ch2:p-drillrun', 'ch2:p-abyss', 'ch2:v-blown', 'ch2:cache', 'ch2:vein', 'ch2:heart']) ok(hasScene(t), `${t} exists`)
ok(getScene('deep:rubble').body === 'Dust still hangs thick in the air from the collapse. Twisted scrap and fallen ceiling slabs choke the passage.', 'rubble verbatim')
ok(getScene('deep:lock').body === 'A massive reinforced pressure door blocking access to the Bleached Heart. Heavy runes pulsate across the frame.', 'lock verbatim')
// entries gated
ok(!ids(at('prisoner', 'ch2:p-abyss')).includes('rustpockets'), 'rust-pockets hidden before Valerius')
const r0 = at('prisoner', 'ch2:p-abyss', {}, { ch2Won_valerius: true })
const r = pick(r0, 'rustpockets'); ok(r.sceneId === 'deep:rubble', 'rust-pockets after Valerius')
const sq = pick(r, 'squeeze'); ok(sq.sceneId === 'deep:shanty' && sq.sap === 7, 'squeeze 1 Sap')
ok(JSON.stringify(getScene('deep:rubble').choices!.find((c) => c.id === 'clear')!.enable) === JSON.stringify(HEAVY_TOOL), 'clear uses HEAVY_TOOL')
const rs = pick({ ...sq, health: 3 }, 'rest'); ok(rs.health === 5 && rs.sap === 6 && !ids(rs).includes('rest'), 'rest +2 Health 1 Sap once a visit')
const av = pick(rs, 'anvil'); ok(!av.flags.shantyRested, 'leaving resets rest')
ok(!ids(av).includes('tune'), 'tune hidden without Module')
const tn = pick({ ...av, items: { ...av.items, scrap: 2, memory_siphon: 1 }, flags: { ...av.flags, hasSiphonModule: true } }, 'tune')
ok(tn.flags.siphonTuned && (tn.items.scrap ?? 0) === 0 && !ids(tn).includes('tune'), 'tune 2 scrap → siphonTuned, once')
ok(pick(av, 'cache').sceneId === 'ch2:cache', 'anvil → cache')
// Rig 04
ok(!ids(at('prisoner', 'ch2:p-drillrun')).includes('rig04'), 'rig hidden before drillPast')
const d = pick(at('prisoner', 'ch2:p-drillrun', {}, { drillPast: true }), 'rig04'); ok(d.sceneId === 'deep:drill-deck', 'drill line → deck')
const ct = pick(d, 'contract'); ok(ct.items.scrap === (d.items.scrap ?? 0) + 3 && ct.heat.cartel === d.heat.cartel + 2 && !ids(ct).includes('contract'), 'contract 3 scrap, Cartel +2, once')
const pk = pick(d, 'passkey'); ok(pk.items.rig_passkey === 1 && pk.sap === 7, 'passkey 1 Sap')
const ap = pick(pk, 'approach'); ok(ap.sceneId === 'deep:vein-approach', 'passkey → approach')
const v = pick(d, 'vents'); const vb = getScene('deep:vents').choices!.filter((c) => c.id === 'bypass').map((c) => c.effects.sneak?.odds)
ok(vb.includes(4) && vb.includes(2), 'bypass odds 4 / 2 after valve')
const vl = pick({ ...v, heat: { ...v.heat, cartel: 3 } }, 'valve'); ok(vl.heat.cartel === 2 && vl.flags.rigDistracted, 'valve Cartel −1')
ok(ids(ap).includes('vein-held') && !ids(ap).includes('vein'), 'vein held by Valerius')
const apc = { ...ap, flags: { ...ap.flags, ribsCollapsed: true } }
ok(ids(apc).includes('vein'), 'vein after clear')
ok(JSON.stringify(getScene('deep:vein-approach').choices!.find((c) => c.id === 'vein')!.enable) === JSON.stringify(VEIN_KEY), 'vein uses VEIN_KEY')
ok(pick({ ...apc, items: { ...apc.items, wire_cutter_shim: 1 } }, 'vein').sceneId === 'ch2:vein', 'shim → vein')
// Crucible
const c = pick(at('vessel', 'ch2:v-blown', {}, { drillPast: true }), 'crucible'); ok(c.sceneId === 'deep:crucible', 'cover blown → crucible')
const ov = pick(c, 'overload'); ok(ov.heat.seekers === c.heat.seekers + 2 && !ids(ov).includes('overload'), 'overload Seeker +2 once')
const l = pick(c, 'lock')
ok(ids(l).includes('force') && !ids(l).includes('through'), 'lock: force only')
ok(JSON.stringify(getScene('deep:lock').choices!.find((c) => c.id === 'force')!.enable) === JSON.stringify({ flag: 'ch2Won_valerius' }), 'force gated on Valerius only')
const lf = pick({ ...l, flags: { ...l.flags, ch2Won_valerius: true } }, 'force'); ok(lf.flags.ch2Fight === 'lockboss', 'force starts lockboss fight')
ok(pick({ ...l, flags: { ...l.flags, ch2Won_lockboss: true } }, 'through').sceneId === 'ch2:heart', 'boss won → heart')
ok(ids({ ...l, items: { ...l.items, wire_cutter_shim: 1 } }).includes('shim'), 'shim row shows')
for (const id of NEW) { const k = playCoverKey(at('prisoner', id), getScene(id)); ok(k && String(k).startsWith('p2_'), `${id} cover (${k})`) }
for (const f of ['rubble','shanty','anvil','drill-deck','vents','vein-approach','crucible','lock']) ok(existsSync(`public/covers/p2-${f}.jpg`), `art ${f}`)

{
  const { chapterTwoAfter, LOCK_LOST } = await import('../src/game/ch2')
  const inFight = { ...lf, flags: { ...lf.flags, encounterHere: true, ch2Fight: 'lockboss' }, heat: { ...lf.heat, seekers: 2 } }
  const fl = { ...inFight.flags, downed: true, downedNote: 'x' } as Record<string, unknown>; delete fl.encounterHere
  const lost = chapterTwoAfter(inFight as never, { ...inFight, health: 0, flags: fl } as never)
  ok(lost.sceneId === 'deep:crucible' && lost.health === 1 && lost.heat.seekers === 3 && !lost.flags.downed && lost.flash === LOCK_LOST, 'lock lost → crucible, Health 1, Seeker Heat +1')
  ok(ids({ ...lost, sceneId: 'deep:lock' } as never).includes('force'), 'lock retry allowed')
  const { VEIN_SHUT } = await import('../src/game/content/intoTheMaw')
  const v = pick({ ...l, sceneId: 'ch2:vein', items: {}, flags: { ch2Won_valerius: true } } as never, 'sealed')
  ok(v.sceneId === 'ch2:trapped' && String(v.flash).includes(VEIN_SHUT), 'vein no key/code → trapped, telegraphed')
  console.log('extra checks OK')
}
console.log(fails ? `${fails} FAIL` : 'v200-phase2 OK'); process.exit(fails ? 1 : 0)

/** v199: the new places (plan.md, approved). Every hook reachable, numbers, flags, covers. npx tsx scripts/v199.ts */
import { readFileSync, existsSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene, hasScene } from '../src/game/content/index.ts'
import { COVER_BAND, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { encounterSpec } from '../src/game/encounter.ts'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v233'"), 'SW cache v199')
ok(readFileSync('src/version.ts', 'utf8').includes("'v234'"), 'Build v199')
const at = (door: DoorId, sceneId: string, extra: Partial<GameState> = {}, flags: Record<string, unknown> = {}): GameState => {
  const g = newGame(door)
  return { ...g, sceneId, sap: 9, health: 6, ...extra, flags: { ...g.flags, noMasked: true, ...flags } } as GameState
}
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const pick = (s: GameState, id: string) => { const c = visibleChoices(s).find((x) => x.id === id); ok(c, `${s.sceneId}: ${id} visible (${ids(s)})`); return c ? applyEffect(s, c.effects) : s }
const NEW = ['thresh:gate', 'thresh:canyon', 'thresh:command', 'camp:overlook', 'camp:siftline', 'camp:jammed', 'camp:ration', 'camp:genpop', 'spine:shattered', 'spine:ossuary', 'maw:tunnels', 'maw:bargain', 'maw:mill', 'maw:gullet', 'ch2:v-hidden']
for (const id of NEW) ok(hasScene(id), `${id} exists`)
const seen = new Set<string>()
const walk = (s: GameState, id: string) => { const n = pick(s, id); seen.add(n.sceneId); return n }

// A. Threshold (Vessel).
let v = at('vessel', 'thresh:guard', { hubId: 'threshold' })
const h0 = v.heat.seekers
v = pick(v, 'code-guard')
ok(v.flags.gateCode && v.heat.seekers === h0 + 1 && v.flash === 'A scrawled maintenance log. The gate code is on it. Seeker Heat +1.', 'guard post code')
ok(!ids(v).includes('code-guard') && !ids(v).includes('code-guard-none'), 'guard search once per run')
let c = { ...v, sceneId: 'thresh:court' }
c = pick(c, 'code-court-none')
ok(c.flash === 'Nothing new here.' && c.heat.seekers === h0 + 1, 'slate: nothing new, no heat')
const c2 = pick(at('vessel', 'thresh:court', { hubId: 'threshold' }), 'code-court')
ok(c2.flags.gateCode && c2.flash === 'A discarded slate. The gate code is scratched into it. Seeker Heat +1.', 'slate code')
let g = walk(c, 'gate')
ok(g.sceneId === 'thresh:gate' && getScene('thresh:gate').variants?.[0].body === 'The gate is locked. You have the code.', 'gate')
ok(!ids(at('vessel', 'thresh:gate')).includes('code'), 'no code: no Enter the code')
const sap0 = g.sap
const cy = walk(g, 'code')
ok(cy.sceneId === 'thresh:canyon' && cy.sap === sap0 - 1, 'canyon Sap 1')
ok(pick(cy, 'back').sceneId === 'thresh:gate' && pick(cy, 'back').sap === sap0 - 2, 'back to gate Sap 1')
const cm = walk(g, 'command')
ok(cm.sceneId === 'thresh:command' && cm.sap === sap0 - 1 && !cm.flags.encounterHere, 'command Sap 1, calm')
const mp = pick(cm, 'maps')
ok(mp.heat.seekers === cm.heat.seekers + 2 && mp.flash === 'The maps mark the Outpost and the Gullet.', 'read the maps')
ok(pick(cm, 'leave').sceneId === 'thresh:gate', 'leave')
const hot = pick({ ...g, heat: { ...g.heat, seekers: 6 } }, 'command-hot')
ok(hot.sceneId === 'thresh:command' && hot.flags.encounterHere && hot.flags.encounterKind === 'overseer', `Seeker Heat 6+: Overseer ambush (${hot.flags.encounterKind})`)
ok(pick(g, 'back').sceneId === 'thresh:court', 'back to court')

// B. Camp-04 (Prisoner).
const p = at('prisoner', 'camp:cages', { hubId: 'camp04' })
for (const id of ['overlook', 'siftline', 'ration', 'genpop']) { const n = walk(p, id); ok(n.sceneId === `camp:${id}` && n.sap === p.sap, `v212: pens → ${id} is free`) }
ok(walk(at('prisoner', 'camp:valerius', { hubId: 'camp04' }), 'overlook').sceneId === 'camp:overlook', 'overseer → overlook')
ok(walk(at('prisoner', 'camp:wire', { hubId: 'camp04' }), 'ration').sceneId === 'camp:ration', 'wire → ration')
const ov = pick(at('prisoner', 'camp:overlook'), 'watch')
ok(ov.flags.guardRotation && ov.heat.cartel === p.heat.cartel + 1, 'guard rotation')
let sl = pick(at('prisoner', 'camp:siftline'), 'work')
ok(sl.sap === 7 && sl.items.scrap === (p.items.scrap ?? 0) + 1 && sl.flags.siftWorked, 'work the line')
const rNo = { ...at('prisoner', 'camp:ration'), health: 4 }
ok(ids(rNo).includes('eat-none') && !ids(rNo).includes('eat'), 'no quota, no bowl')
const rYes = pick({ ...sl, sceneId: 'camp:ration', health: 4 }, 'eat')
ok(rYes.health === 5 && !rYes.flags.siftWorked, 'ration Health +1 once')
ok(!ids(at('prisoner', 'camp:siftline')).includes('jammed'), 'no job before Kaelen')
const jb = walk(at('prisoner', 'camp:siftline', {}, { kaelenKnown: true }), 'jammed')
ok(jb.sceneId === 'camp:jammed' && jb.flags.kaelenJob && jb.sap === 7 && jb.heat.cartel === p.heat.cartel + 1, 'jammed line')
ok(!ids(at('prisoner', 'camp:kaelen', {}, { jaxsonPlan: true })).includes('grate'), 'grate needs kaelenJob')
ok(ids(at('prisoner', 'camp:kaelen', {}, { jaxsonPlan: true, kaelenJob: true })).includes('grate'), 'grate after the job')

// C. Spine (Outcast).
const o = at('outcast', 'spine:ridge', { hubId: 'spine' })
ok(getScene('spine:ridge').body.includes('The Scout Camp perimeter runs along the ridge.'), 'scout camp line')
const sh = walk(o, 'shattered')
ok(sh.sceneId === 'spine:shattered' && sh.sap === 8, 'shattered Sap 1')
const os = walk(sh, 'ossuary')
ok(os.sceneId === 'spine:ossuary' && os.sap === 7, 'ossuary Sap 1')
const sb = pick(os, 'search')
ok(sb.items.scrap === (os.items.scrap ?? 0) + 1 && sb.flags.ossuarySearched && !ids(sb).includes('search'), 'ossuary once per run')

// D. Red Maw, both chapters.
for (const door of ['prisoner', 'vessel', 'outcast'] as const) {
  const rim = at(door, 'maw:rim', { hubId: 'redmaw' })
  const t = walk(rim, 'tunnels')
  ok(t.sceneId === 'maw:tunnels' && t.sap === 7, `${door}: rim → tunnels Sap 2`)
  ok(pick(t, 'rim').sceneId === 'maw:rim' && pick(t, 'rim').sap === 5, `${door}: back to rim Sap 2`)
  const gu = walk(t, 'gullet')
  ok(gu.sceneId === 'maw:gullet' && gu.sap === 5 && gu.heat.seekers === t.heat.seekers + 2 && (gu.health === 3 || gu.health === 1), `${door}: gullet costs (${gu.health})`)
  ok(pick(gu, 'on').sceneId === 'maw:rim', `${door}: gullet drops at rim`)
  ok(visibleChoices({ ...t, health: 3 }).find((x) => x.id === 'gullet')?.enable?.healthMin === 4, `${door}: gullet needs Health 4`)
  const ch2 = at(door, 'ch2:approach', {}, { ch2Started: true, chapter1Done: true })
  const t2 = walk(ch2, 'tunnels')
  ok(t2.sceneId === 'maw:tunnels' && pick(t2, 'approach').sceneId === 'ch2:approach' && !ids(t2).includes('rim'), `${door}: ch2 tunnels return to approach`)
  ok(pick(pick(t2, 'gullet'), 'on-ch2').sceneId === 'ch2:approach', `${door}: ch2 gullet`)
  const b = walk(t2, 'drain')
  ok(b.sceneId === 'maw:bargain', `${door}: drain → bargain`)
  const paid = pick({ ...b, items: { ...b.items, scrap: 6, glints: 0 } }, 'pay')
  ok(paid.flags.hasBargainFlag && (paid.items.scrap ?? 0) === 0 && !paid.flags.thaliaFavor, `${door}: pay 6 Scrap`)
  ok(!ids({ ...b, items: { ...b.items, scrap: 5, glints: 0 } }).includes('pay'), `${door}: pay hidden when broke`)
  const fv = pick(b, 'favor')
  ok(fv.flags.hasBargainFlag && fv.flags.thaliaFavor && fv.heat.seekers === b.heat.seekers + 3, `${door}: favor`)
  const rf = pick(b, 'refuse')
  ok(rf.flags.encounterHere && rf.flags.encounterKind === 'thaliaguard' && rf.heat.seekers === b.heat.seekers + 2 && !rf.flags.hasBargainFlag, `${door}: refuse fight`)
  const ml = walk(paid, 'mill')
  ok(ml.sceneId === 'maw:mill' && ml.sap === paid.sap, `${door}: mill Sap 0 with bargain`)
  const sp = pick(ml, 'spill')
  ok(sp.items.scrap === (ml.items.scrap ?? 0) + 1 && !ids(sp).includes('spill'), `${door}: spill once`)
  ok(ids(ml).includes('drill') === (door === 'prisoner'), `${door}: drill line only for Prisoner`)
  if (door === 'prisoner') ok(pick(ml, 'drill').sceneId === 'ch2:p-drillrun', 'mill → drill line')
}
const spec = encounterSpec({ flags: { encounterKind: 'thaliaguard' } } as unknown as GameState)
ok(spec.name === "Thalia's Guard" && spec.strike === 4 && spec.shell === 3 && spec.hp === 5, "Thalia's Guard 4/3/5")

// Primary Vein lock.
for (const [flags, label] of [[{ liftDone: true }, 'lift'], [{ liftLadder: true }, 'ladder']] as const) {
  const r = at('prisoner', 'ch2:ribs', {}, { ch2Started: true, ...flags })
  const sealed = ids(r).find((x) => x.endsWith('-sealed'))
  const rv = at('vessel', 'ch2:ribs', {}, { ch2Started: true, ...flags })
  const sx = ids(rv).find((x) => x.endsWith('-sealed-x'))
  ok(sx && pick(rv, sx).sceneId === 'ch2:trapped' && pick(rv, sx).flash === "Sealed. You need Thalia's code.", `${label}: vessel sealed line`)
  ok(sealed && !ids(r).includes(sealed.replace('-sealed', '')), `${label}: sealed without key`)
  const tr = pick(r, sealed!)
  ok(tr.sceneId === 'ch2:trapped' && tr.flash === "Sealed. You need Thalia's code or Kaelen's shim.", `${label}: sealed out`)
  for (const k of [{ flags: { hasBargainFlag: true } }, { items: { wire_cutter_shim: 1 } }]) {
    const rk = { ...r, flags: { ...r.flags, ...(k.flags ?? {}) }, items: { ...r.items, ...(k.items ?? {}) } } as GameState
    const open = ids(rk).find((x) => x === 'ride' || x === 'climb')
    ok(open, `${label}: open with ${JSON.stringify(k)}`)
    if (open) { const n = pick(rk, open); ok(n.sceneId === 'ch2:vein' && (n.items.wire_cutter_shim ?? 0) === (rk.items.wire_cutter_shim ?? 0), `${label}: vein, shim kept`) }
  }
}
// Hidden exit (Vessel).
const vo = at('vessel', 'ch2:v-outpost', {}, { ch2Started: true })
ok(!ids(vo).includes('thalia-exit'), 'no hidden exit without bargain')
const he = walk({ ...vo, flags: { ...vo.flags, hasBargainFlag: true } }, 'thalia-exit')
ok(he.sceneId === 'ch2:v-hidden' && pick(he, 'on').sceneId === 'ch2:cache', 'hidden exit → cache')
// Favor marks Seeker hunts.
const eng = readFileSync('src/game/engine.ts', 'utf8')
ok(eng.includes('state.heat.seekers + (state.flags.thaliaFavor ? 2 : 0)'), 'favor: Seeker Heat counts 2 higher')

// Covers: every new scene has its own art on disk, precached and cropped.
for (const id of NEW) {
  const s = at(id.startsWith('camp') ? 'prisoner' : id.startsWith('thresh') || id === 'ch2:v-hidden' ? 'vessel' : 'outcast', id, { hubId: getScene(id).hubId ?? null })
  const k = playCoverKey(s, getScene(id))
  const f = playCoverFile(k)
  ok(f.startsWith('np-') && existsSync(`public/covers/${f}`) && sw.includes(`covers/${f}`) && COVER_BAND[k], `${id}: cover ${f}`)
}
console.log(fails ? `v199: ${fails} fail(s)` : 'v199: ok')
if (fails) process.exit(1)

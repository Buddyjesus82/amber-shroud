/**
 * v163: Kaelen's nine side-trouble leads (three per door), home hub only, plus the road-pass shelf behind "Ask what he heard".
 *   npx tsx scripts/v163.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, isChoiceOn, newGame, visibleChoices } from '../src/game/engine.ts'
import { ALL_SCENES, getScene, hasScene } from '../src/game/content/index.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import { HEAD_GEAR, RUMOR_JOBS, WALK_SUB } from '../src/game/rumorJobs.ts'
import { hubMapOf } from '../src/game/map.ts'
import type { Choice, DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v180'"), 'SW cache v167')
ok(readFileSync('src/version.ts', 'utf8').includes("'v180'"), 'Build label v168')

// 0. Production safety: the data table and the spot scenes read neither kit nor catalog at module load.
for (const f of ['src/game/rumorJobs.ts', 'src/game/content/rumorSpots.ts']) {
  const src = readFileSync(f, 'utf8')
  ok(!/from '[^']*\/(kit|catalog)'|from '\.\/(kit|catalog)'/.test(src.replace(/^import type .*$/gm, '')), `${f} imports neither kit nor catalog`)
}
const headSlot = Object.values(ITEMS).filter((i) => i.slot === 'head' && i.id !== 'ossa_token').map((i) => i.id).sort()
ok(JSON.stringify([...HEAD_GEAR].sort()) === JSON.stringify(headSlot), 'HEAD_GEAR matches every head-slot wrap in the catalog (the Ossa token is a token, not a wrap)')

const HOME: Record<DoorId, { hub: string; counter: string; pass: string }> = {
  prisoner: { hub: 'camp04', counter: 'camp:kaelen-rumors', pass: 'camp:wire' },
  outcast: { hub: 'spine', counter: 'roam:kaelen-rumors', pass: 'spine:hound' },
  vessel: { hub: 'threshold', counter: 'thresh:kaelen-rumors', pass: 'thresh:paddock' },
}
const base = (door: DoorId) => newGame(door)
const at = (door: DoorId, scene: string, hub: string, flags: Record<string, unknown> = {}, items: Record<string, number> = {}, heat: Partial<GameState['heat']> = {}): GameState => {
  const g = base(door)
  return {
    ...g, sceneId: scene, hubId: hub, ticks: 40, health: 6, sap: 8,
    items: { ...g.items, scrap: 6, glints: 4, ...items },
    heat: { ...g.heat, ...heat },
    flags: { ...g.flags, noMasked: true, ...flags },
  } as GameState
}
const row = (s: GameState, id: string): Choice | undefined => visibleChoices(s).find((c) => c.id === id)
const press = (s: GameState, id: string): GameState => {
  const c = row(s, id)
  if (!c) { ok(false, `row ${id} visible in ${s.sceneId}`); return s }
  ok(isChoiceOn(s, c.enable), `row ${id} enabled in ${s.sceneId}`)
  return applyEffect(s, c.effects)
}
const counterFor = (door: DoorId, flags: Record<string, unknown> = {}, items: Record<string, number> = {}, heat: Partial<GameState['heat']> = {}) => {
  const h = HOME[door]
  return at(door, h.counter, h.hub, { rumorShelf: 'side', kaelenFrom: h.pass, kaelenKnown: true, ...flags }, items, heat)
}

// 1. Data: nine jobs, three per door, every spot scene exists, is a story scene, and is mapped to its host's node.
ok(RUMOR_JOBS.length === 9, 'nine jobs')
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) ok(RUMOR_JOBS.filter((j) => j.door === door).length === 3, `${door} has three jobs`)
for (const j of RUMOR_JOBS) {
  ok(hasScene(j.spotScene) && getScene(j.spotScene).kind === 'story', `${j.id}: spot scene is a story scene`)
  ok(ALL_SCENES.filter((s) => s.id === j.spotScene).length === 1, `${j.id}: spot scene registered once`)
  ok(getScene(j.spotScene).title === j.spot, `${j.id}: spot title`)
  const hostMap = hubMapOf({ ...base(j.door), hubId: j.hub } as GameState)
  ok(hostMap?.sceneNode?.[j.spotScene] && hostMap.sceneNode[j.spotScene] === hostMap.sceneNode[j.host], `${j.id}: spot sits on its host's node`)
  ok(hasScene(j.host), `${j.id}: host scene exists`)
}

// 2. Each job end to end: buy, walk row at the host, Look, Take (reward, heat, flags, back to host), no replay.
const REWARD: Record<string, { items: Record<string, number>; heat?: Record<string, number> }> = {
  scrip: { items: { scrip: 1, glints: 1 } },
  valve: { items: { vial_drop: 1 }, heat: { cartel: -1 } },
  crate: { items: { salve: 2 } },
  well: { items: { vial_drop: 2 }, heat: { strays: -1 } },
  corvin: { items: { shiv: 1 } },
  tally: { items: { glints: 2 }, heat: { strays: 1 } },
  reliquary: { items: { vial_drop: 1, salve: 1 }, heat: { seekers: 1 } },
  tack: { items: { knotted_wrap: 1 } },
  ledger: { items: {}, heat: { seekers: -2 } },
}
for (const j of RUMOR_JOBS) {
  const id = j.id
  const cost = j.cost.item === 'glints' ? { glints: 4 } : { scrap: 6 }
  let s = counterFor(j.door, {}, { ...cost, shiv: 0, head_wrap: 0, knotted_wrap: 0 }, { cartel: 2, strays: 2, seekers: 3 })
  s = { ...s, items: { ...s.items, ...cost } }
  const buy = row(s, `rumor-${id}`)
  ok(!!buy && buy.label === j.row.label && buy.sub === j.row.sub, `${id}: buy row on the Side shelf`)
  // Locked without the price.
  const poor = { ...s, items: { ...s.items, [j.cost.item]: j.cost.n - 1 } } as GameState
  ok(!!buy && !isChoiceOn(poor, row(poor, `rumor-${id}`)?.enable), `${id}: locked when you cannot pay`)
  const before = s.items[j.cost.item] ?? 0
  s = press(s, `rumor-${id}`)
  ok(s.flags[`${id}Rumor`] === true, `${id}: rumor flag set`)
  ok((s.items[j.cost.item] ?? 0) === before - j.cost.n, `${id}: paid ${j.cost.n} ${j.cost.item}`)
  ok(String(s.flash) === j.row.pitch, `${id}: Kaelen's pitch is the flash`)
  ok(!row(s, `rumor-${id}`), `${id}: buy row gone once bought`)
  // The walk row is on the host scene, not at the shelf.
  const host = { ...s, sceneId: j.host, hubId: j.hub, flags: { ...s.flags, rumorShelf: undefined } } as GameState
  delete (host.flags as Record<string, unknown>).rumorShelf
  const walk = row(host, `rumor-walk-${id}`)
  ok(!!walk && walk.label === `Walk to ${j.spot}` && walk.sub === WALK_SUB, `${id}: walk row on ${j.host}`)
  let t = applyEffect(host, walk!.effects)
  ok(t.sceneId === j.spotScene, `${id}: walk lands on the spot`)
  ok(!row(t, j.takes[0].id) && !visibleChoices(t).some((c) => c.id.startsWith('take')), `${id}: no Take before Look`)
  t = press(t, 'look')
  ok(t.flags[`${id}Looked`] === true && String(t.flash) === j.look.flash, `${id}: Look sets the flag and shows its flash`)
  ok(!row(t, 'look'), `${id}: Look is one-time`)
  const takes = visibleChoices(t).filter((c) => c.id.startsWith('take'))
  ok(takes.length === 1 && takes[0].label === j.takeLabel && takes[0].tone === 'danger', `${id}: exactly one Take row at Cartel 2 / no variant`)
  const w = REWARD[id]
  const pre = t
  t = applyEffect(t, takes[0].effects)
  ok(t.flags[`${id}Taken`] === true, `${id}: Taken flag`)
  ok(t.sceneId === j.host, `${id}: Take returns to the host`)
  for (const [k, n] of Object.entries(w.items)) ok((t.items[k as keyof typeof t.items] ?? 0) - (pre.items[k as keyof typeof pre.items] ?? 0) === n, `${id}: +${n} ${k}`)
  for (const [k, n] of Object.entries(w.heat ?? {})) {
    const was = pre.heat[k as keyof typeof pre.heat]
    const want = Math.max(0, was + n)
    ok(t.heat[k as keyof typeof t.heat] === want, `${id}: ${k} heat ${was} -> ${want} (got ${t.heat[k as keyof typeof t.heat]})`)
  }
  ok(!row(t, `rumor-walk-${id}`), `${id}: walk row gone after Take`)
  // Leave path: no reward, Seen set, back at the host, walk row gone.
  let l = applyEffect(host, walk!.effects)
  const lp = l
  l = press(l, 'leave')
  ok(l.flags[`${id}Seen`] === true && !l.flags[`${id}Taken`] && l.sceneId === j.host, `${id}: Leave sets Seen and returns`)
  ok(String(l.flash) === j.leave.flash, `${id}: Leave flash`)
  for (const k of Object.keys(w.items)) ok((l.items[k as keyof typeof l.items] ?? 0) === (lp.items[k as keyof typeof lp.items] ?? 0), `${id}: Leave pays nothing (${k})`)
  ok(!row(l, `rumor-walk-${id}`), `${id}: walk row gone after Leave`)
  // Neither shelf nor counter re-sells a finished lead.
  const again = { ...t, sceneId: HOME[j.door].counter, hubId: HOME[j.door].hub, flags: { ...t.flags, rumorShelf: 'side' } } as GameState
  ok(!row(again, `rumor-${id}`), `${id}: not for sale again`)
}

// 3. Home hub only. Elsewhere the shelf shows the sold-out row.
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  const elsewhere = at(door, 'roam:kaelen-rumors', 'redmaw', { rumorShelf: 'side', kaelenHub: 'redmaw' })
  ok(!visibleChoices(elsewhere).some((c) => c.id.startsWith('rumor-') && c.id !== 'rumor-back'), `${door}: no job rows away from home`)
  ok(!!row(elsewhere, 'side-empty'), `${door}: sold-out row away from home`)
  const there = counterFor(door)
  const rows = visibleChoices(there).filter((c) => /^rumor-[a-z]+$/.test(c.id) && c.id !== 'rumor-back' && c.id !== 'rumor-side' && c.id !== 'rumor-intel')
  ok(rows.length === 3, `${door}: three job rows at home (got ${rows.length})`)
  const other = door === 'prisoner' ? 'outcast' : 'prisoner'
  const wrongDoor = at(other, HOME[door].counter, HOME[door].hub, { rumorShelf: 'side' })
  const wd = visibleChoices(wrongDoor).filter((c) => RUMOR_JOBS.some((j) => c.id === `rumor-${j.id}` && j.door === door))
  ok(wd.length === 0, `${door}: another door never sees these jobs`)
}
// All three bought and done: the sold-out row shows on the road shelf.
{
  const flags: Record<string, unknown> = {}
  for (const j of RUMOR_JOBS.filter((x) => x.door === 'outcast')) flags[`${j.id}Rumor`] = true
  const s = at('outcast', 'roam:kaelen-rumors', 'spine', { rumorShelf: 'side', ...flags })
  ok(!visibleChoices(s).some((c) => /^rumor-(well|corvin|tally)$/.test(c.id)), 'bought jobs leave the shelf')
  ok(row(s, 'side-empty')?.label === 'No side trouble left to sell', 'sold-out row reused as is')
}

// 4. Variants.
const spot = (id: string, items: Record<string, number> = {}, heat: Partial<GameState['heat']> = {}, flags: Record<string, unknown> = {}) => {
  const j = RUMOR_JOBS.find((x) => x.id === id)!
  return at(j.door, j.spotScene, j.hub, { [`${id}Rumor`]: true, [`${id}Looked`]: true, ...flags }, items, heat)
}
const takeIds = (s: GameState) => visibleChoices(s).filter((c) => c.id.startsWith('take')).map((c) => c.id)
{
  // scrip: Cartel 4+ is the risk row.
  let s = spot('scrip', {}, { cartel: 3 })
  ok(takeIds(s).join() === 'take', 'scrip: plain at Cartel 3')
  s = spot('scrip', {}, { cartel: 4 })
  ok(takeIds(s).join() === 'take-risk', 'scrip: risk row at Cartel 4')
  const r = press(s, 'take-risk')
  ok(r.heat.cartel === 5 && String(r.flash).endsWith('Cartel Heat +1.'), 'scrip risk: Cartel +1')
  // crate: Cartel 5+ starts the Vent patrol fight.
  s = spot('crate', {}, { cartel: 4 })
  ok(takeIds(s).join() === 'take', 'crate: plain at Cartel 4')
  let c = press(s, 'take')
  ok(!c.flags.encounterHere && c.sceneId === 'camp:bay', 'crate: no fight at Cartel 4')
  s = spot('crate', {}, { cartel: 5 })
  ok(takeIds(s).join() === 'take-risk', 'crate: risk row at Cartel 5')
  c = press(s, 'take-risk')
  ok(c.items.salve === (s.items.salve ?? 0) + 2, 'crate risk: still pays two salves')
  ok(!!c.flags.encounterHere && c.flags.encounterKind === 'patrol', 'crate risk: a Vent patrol fight opens')
  ok(String(c.flash).includes('A Vent patrol is already coming.'), 'crate risk: the approved line')
  // corvin: shiv or scrap, helped set once.
  s = spot('corvin', { shiv: 0 }, {}, {})
  ok(takeIds(s).join() === 'take-shiv', 'corvin: shiv when none carried')
  let k = press(s, 'take-shiv')
  ok(k.items.shiv === 1 && k.flags.corvinHelped === true && String(k.flash).endsWith('Corvin will know whose hands lifted it.'), 'corvin: shiv, helped set, line appended')
  s = spot('corvin', { shiv: 1 }, {}, {})
  ok(takeIds(s).join() === 'take-scrap', 'corvin: scrap when a shiv is carried')
  k = press(s, 'take-scrap')
  ok(k.items.scrap === s.items.scrap + 3 && k.items.shiv === 1 && k.flags.corvinHelped === true, 'corvin: 3 scrap and helped set')
  s = spot('corvin', { shiv: 0 }, {}, { corvinHelped: true, corvinWater: true })
  ok(takeIds(s).join() === 'take-shiv-known', 'corvin: helped already, no appended line')
  k = press(s, 'take-shiv-known')
  ok(!String(k.flash).includes('Corvin will know') && k.flags.corvinWater === true, 'corvin: known path leaves his flags alone')
  s = spot('corvin', { shiv: 1 }, {}, { corvinHelped: true })
  ok(takeIds(s).join() === 'take-scrap-known', 'corvin: helped and carrying a shiv')
  // tack: wrap, or scrap with head gear.
  for (const g of HEAD_GEAR) {
    s = spot('tack', { head_wrap: 0, knotted_wrap: 0, plated_head_wrap: 0, [g]: 1 })
    ok(takeIds(s).join() === 'take-scrap', `tack: scrap when you hold ${g}`)
    const t = press(s, 'take-scrap')
    ok(t.items.scrap === s.items.scrap + 2 && (t.items.knotted_wrap ?? 0) === (g === 'knotted_wrap' ? 1 : 0), `tack: 2 scrap with ${g}, no extra wrap`)
  }
  s = spot('tack', { head_wrap: 0, knotted_wrap: 0, plated_head_wrap: 0 })
  ok(takeIds(s).join() === 'take-wrap', 'tack: wrap with no head gear')
}

// 5. Road pass: Outcast has no counter, so the road is the only way to buy. Pass -> Kaelen -> "Ask what he heard" -> Side trouble.
{
  let s = at('outcast', 'spine:ridge', 'spine', { kaelenPassing: true, noMasked: true })
  s = press(s, 'kaelen-pass')
  ok(s.sceneId === 'roam:kaelen', 'pass opens roam:kaelen')
  const heard = row(s, 'heard')
  ok(heard?.label === 'Ask what he heard' && heard?.sub === 'What he heard on the last road.', 'road pass: "Ask what he heard"')
  ok(!!row(s, 'kallik') && !!row(s, 'back'), 'road pass keeps the old Kallik ask and Let him go')
  s = press(s, 'heard')
  ok(s.sceneId === 'roam:kaelen-rumors', 'heard opens the road shelf')
  ok(!!row(s, 'rumor-intel') && !!row(s, 'rumor-side'), 'road shelf has Intel and Side trouble')
  // Intel: Kallik is free.
  let i = press(s, 'rumor-intel')
  const kal = row(i, 'kallik-free')
  ok(!!kal && !kal.sub?.includes('Glint') && isChoiceOn(i, kal.enable), 'Intel shelf: Kallik is free')
  const g0 = i.items.glints
  i = press(i, 'kallik-free')
  ok(i.flags.heardKallik === true && i.items.glints === g0, 'Kallik: heard, no Glint spent')
  ok(!row(i, 'kallik-free') && !!row(i, 'intel-empty'), 'Kallik is one-time; the Intel shelf then shows the empty row')
  // Side: the Outcast three.
  s = press(s, 'rumor-side')
  ok(['well', 'corvin', 'tally'].every((n) => !!row(s, `rumor-${n}`)), 'road Side shelf: the three Outcast leads')
  ok(!row(s, 'rumor-scrip') && !row(s, 'rumor-ledger'), 'road Side shelf: no other door\'s leads')
  s = press(s, 'rumor-well')
  ok(s.flags.wellRumor === true, 'bought the well lead on the road')
  s = press(s, 'rumor-back')
  s = press(s, 'back')
  ok(s.sceneId === 'roam:kaelen', 'Back to the pack returns to the pass')
  s = press(s, 'back')
  ok(s.sceneId === 'spine:ridge', 'Let him go returns to the road you were on')
  const w = applyEffect({ ...s, sceneId: 'spine:well' }, { flash: '' })
  ok(!!row(w, 'rumor-walk-well'), 'the lead is still there when you walk to the Well')
  ok(!row(w, 'rumor-walk-tally'), 'only bought leads show a walk row')
}

// 6. A pass that is not at home sells nothing: Outcast on the road at the Maw.
{
  let s = at('outcast', 'maw:market', 'redmaw', { kaelenPassing: true })
  s = press(s, 'kaelen-pass')
  s = press(s, 'heard')
  s = press(s, 'rumor-side')
  ok(!!row(s, 'side-empty') && !RUMOR_JOBS.some((j) => row(s, `rumor-${j.id}`)), 'away from home: sold-out row only')
}

// 7. Typed text still works on the road shelf.
{
  const s = at('outcast', 'roam:kaelen-rumors', 'spine', {})
  ok(s.sceneId === 'roam:kaelen-rumors' && getScene(s.sceneId).title === 'Rumor Counter', 'road rumor scene exists')
}

console.log(fails ? `${fails} FAILED` : 'v163 ok')
process.exit(fails ? 1 : 0)

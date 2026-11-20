/** v245: Kaelen's and Varro's side quests (Jeramie, t1261u). Free take -> spot -> gate -> reward -> log. */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { applyEffect, isChoiceOn, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { knownRumors } from '../src/game/journal.ts'
import { COILS_HEARD, SIDE_QUESTS } from '../src/game/sideQuests.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v249'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v249'"), 'build v249')

const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const press = (s: GameState, id: string) => {
  const c = row(s, id)
  if (!c) throw new Error(`no ${id} on ${s.sceneId}: ${visibleChoices(s).map((x) => x.id).join()}`)
  return applyEffect(s, c.effects)
}
const n = (s: GameState, k: string) => Number((s.items as Record<string, number>)[k] ?? 0)
const log = (s: GameState, id: string) => knownRumors(s).find((r) => r.id === id)
const base = (door: DoorId, knife: boolean): GameState => {
  const g = newGame(door)
  const items = { ...g.items, scrap: 1 } as Record<string, number>
  delete items.needle_knife
  delete items.salve
  delete items.vial_drop
  delete items.sinew_cord
  if (knife) items.needle_knife = 1
  return { ...g, items, health: 6, sap: 4, flags: { ...g.flags, noMasked: true } } as GameState
}
const at = (s: GameState, sceneId: string, hubId: string | null, flags: GameState['flags'] = {}): GameState => ({ ...s, sceneId, hubId, flags: { ...s.flags, ...flags } })

// ── K1 Basin Packing, per door ──
const K1: Record<DoorId, { stall: string; hub: string; host: string; spot: string; where: string; body: string }> = {
  outcast: { stall: 'roam:kaelen', hub: 'spine', host: 'spine:well', spot: 'spine:sq-sluice', where: 'Dry Well', body: "Behind the well's stones, a cracked sluice runs down to a catch-basin gone dry. Silt has baked over a wooden lid. One corner of a crate shows under it." },
  prisoner: { stall: 'camp:kaelen', hub: 'camp04', host: 'camp:vents', spot: 'camp:sq-sluice', where: 'vent trough', body: 'Under the pipe-run, a stone trough catches what the vents sweat. It cracked long ago and dried. A lid sits in it, caked with silt.' },
  vessel: { stall: 'thresh:kaelen', hub: 'threshold', host: 'thresh:conduits', spot: 'thresh:sq-sluice', where: 'drain conduits', body: 'Where the overflow pipes spill under the wall, a stone basin has cracked and drained. Sludge has dried to a crust over a lid.' },
}
for (const door of ['outcast', 'prisoner', 'vessel'] as DoorId[]) {
  const k = K1[door]
  for (const knife of [false, true]) {
    let s = at(base(door, knife), k.host, k.hub)
    ok(!row(s, 'sq-walk-sqBasin'), `${door}: no pin before taking`)
    s = at(s, k.stall, k.hub)
    const take = row(s, 'sq-take-sqBasin')
    ok(take?.label === 'Basin Packing' && !take.enable, `${door}: Basin Packing offered, free`)
    const before = JSON.stringify(s.items)
    s = press(s, 'sq-take-sqBasin')
    ok(JSON.stringify(s.items) === before && s.flash === `"A Stray courier dumped a crate of old packing by the ${k.where} before he bolted. Greased leather, tarred hemp. Dig it out and I'll trade you something useful."`, `${door}: take is free, door handover (${s.flash})`)
    ok(!row(s, 'sq-take-sqBasin') && !row(s, 'sq-turnin-sqBasin'), `${door}: no offer twice, no turn-in yet`)
    ok(log(s, 'sqBasin')?.body === 'A Stray courier dumped a crate of packing at a cracked basin. Kaelen will trade for it.', `${door}: log taken`)
    s = at(s, k.host, k.hub)
    ok(row(s, 'sq-walk-sqBasin')?.label === 'Walk to Cracked Sluice', `${door}: pin on the host`)
    // Other doors' hosts never show it.
    for (const other of ['outcast', 'prisoner', 'vessel'] as DoorId[]) if (other !== door) ok(!row(at(s, K1[other].host, K1[other].hub), 'sq-walk-sqBasin'), `${door}: no pin at ${K1[other].host}`)
    s = press(s, 'sq-walk-sqBasin')
    ok(s.sceneId === k.spot && getScene(k.spot).title === 'Cracked Sluice' && getScene(k.spot).body === k.body, `${door}: spot scene text`)
    ok(visibleChoices(s).map((c) => c.id).join() === 'clear,leave', `${door}: clear first`)
    const left = press(s, 'leave')
    ok(left.sceneId === k.host && left.flash === 'You leave it to the silt. Kaelen will call that a lesson.' && !!row(left, 'sq-walk-sqBasin'), `${door}: leave keeps the pin`)
    s = press(s, 'clear')
    ok(s.flash === 'You scrape the lid clean with your fingers. A crate, Stray-marked. The latch is rust all through.', `${door}: clear flash`)
    const pry = row(s, 'pry')!
    ok(pry.label === 'Pry the rusted latch' && pry.sub === 'Needs the Needle Knife.' && pry.locked === 'Needs: the Needle Knife', `${door}: pry labels`)
    if (!knife) { ok(!isChoiceOn(s, pry.enable), `${door}: pry locked without knife`); continue }
    s = press(s, 'pry')
    ok(s.sceneId === k.host && s.flash === 'The latch gives with a crack. Greased leather packing, tarred hemp rings, cured-hide seals. Old, but they still hold their shape.' && s.items.needle_knife === 1, `${door}: pry, knife kept, back on host`)
    ok(n(s, 'scrap') === 1 && n(s, 'salve') === 0, `${door}: no reward at the spot`)
    ok(!row(s, 'sq-walk-sqBasin'), `${door}: pin gone once the crate is out`)
    s = at(s, k.stall, k.hub)
    const turn = row(s, 'sq-turnin-sqBasin')
    ok(turn?.label === 'Basin Packing' && turn.sub === 'Scrap +2. Resin +1.', `${door}: turn-in row at Kaelen`)
    s = press(s, 'sq-turnin-sqBasin')
    ok(n(s, 'scrap') === 3 && n(s, 'salve') === 1, `${door}: Scrap +2, Resin +1`)
    ok(s.flash === `"Leather that still bends. Somebody's skiff runs another season." He counts it twice. "Here. Fair is fair."\n\nScrap +2.\nResin +1.`, `${door}: turn-in line`)
    ok(!row(s, 'sq-turnin-sqBasin') && !row(s, 'sq-take-sqBasin'), `${door}: no double reward`)
    ok(log(s, 'sqBasin')?.body === 'Kaelen took the packing. He paid in scrap and resin.', `${door}: log done`)
  }
}

// ── K2 Rib-Slide Chute (The Wreck), turn-in to the pack ──
{
  let s = at(base('prisoner', false), 'roam:kaelen', 'redmaw')
  s = press(s, 'sq-take-sqChute')
  ok(s.flash === `"I dropped a canvas sack of Drops down the old chute in the ribs by the Wreck. My arm's too short and my pack won't fit. You might squeeze through."`, 'K2 handover')
  s = at(s, 'maw:tuner', 'redmaw')
  s = press(s, 'sq-walk-sqChute')
  ok(s.sceneId === 'maw:sq-chute' && getScene('maw:sq-chute').body === 'A rusted iron drop-chute, wedged slantwise between two ribs above the drop. Slag and bone-dust choke the mouth. Something pale, canvas, sits a long reach down.', 'K2 spot')
  ok(row(s, 'squeeze')?.sub === 'Health −1.', 'K2 squeeze sub')
  s = press(s, 'squeeze')
  ok(s.health === 5 && s.sceneId === 'maw:tuner' && s.flash === 'You go in shoulder first. Jagged iron bites through your sleeve. Your fingers close on canvas.\n\nHealth −1.' && n(s, 'vial_drop') === 0, 'K2 squeeze: Health −1, no pay yet')
  s = press(at(s, 'roam:kaelen', 'redmaw'), 'sq-turnin-sqChute')
  ok(n(s, 'scrap') === 4 && n(s, 'vial_drop') === 1 && s.flash?.startsWith(`"All there. You didn't drink one.`), 'K2 turn-in: Scrap +3, Drop +1')
  ok(log(s, 'sqChute')?.body === 'Kaelen has his sack back. He paid his cut.', 'K2 log done')
}

// ── K3 Dead Signal Coils (Stilt Shade), pays at the spot; Kaelen's line on the next pass ──
for (const knife of [false, true]) {
  let s = at(base('vessel', knife), 'roam:kaelen', 'redmaw')
  s = press(s, 'sq-take-sqCoils')
  s = press(at(s, 'maw:stilt', 'redmaw'), 'sq-walk-sqCoils')
  ok(getScene('maw:sq-beacon').title === 'Dead Beacon Post' && getScene('maw:sq-beacon').body.includes('Charred copper coils spill from it in a tangle'), 'K3 spot (draft wording kept)')
  const cut = row(s, 'cut')!
  if (!knife) { ok(!isChoiceOn(s, cut.enable) && cut.locked === 'Needs: the Needle Knife', 'K3 locked without knife'); continue }
  s = press(s, 'cut')
  ok(n(s, 'scrap') === 5 && n(s, 'salve') === 1 && s.flags.sqCoilsDone === true && s.sceneId === 'maw:stilt', 'K3 pays at the spot: Scrap +4, Resin +1')
  ok(s.flash === 'The crust cracks under the blade. You cut the tangle away, wire by wire. The core underneath is clean copper.\n\nScrap +4.\nResin +1.', 'K3 flash')
  ok(!row(s, 'sq-walk-sqCoils') && log(s, 'sqCoils')?.body === 'You cut the copper free before the Seekers swept it.', 'K3 pin gone, log done')
  const visit = applyEffect(s, { goto: 'roam:kaelen' })
  ok(visit.flash === COILS_HEARD && !row(visit, 'sq-turnin-sqCoils'), 'K3: Kaelen line on the next pass, no turn-in')
  const again = applyEffect(applyEffect(visit, { goto: 'maw:stilt' }), { goto: 'roam:kaelen' })
  ok(again.flash !== COILS_HEARD, 'K3 line only once')
}

// ── Varro: free take at his stall, pays on the spot in Chapter 3 ──
{
  let s = at(base('outcast', true), 'maw:zafir', 'redmaw')
  for (const id of ['sqCulvert', 'sqSeam', 'sqDispatch']) {
    const before = JSON.stringify(s.items)
    s = press(s, `sq-take-${id}`)
    ok(JSON.stringify(s.items) === before && s.flash === (SIDE_QUESTS.find((q) => q.id === id)!.handover as string), `Varro ${id}: free, handover`)
  }
  ok(!visibleChoices(s).some((c) => c.id.startsWith('sq-')), 'Varro: nothing left to take')
  const ch3 = (sceneId: string, flags: GameState['flags'] = {}) => at({ ...s, chapterId: 'luminspire' }, sceneId, 'barrow', { ch3Started: true, ch3Stripped: true, ...flags })
  // V1 Culvert.
  let v = press(ch3('ch3:siphon'), 'sq-walk-sqCulvert')
  ok(v.sceneId === 'ch3:sq-culvert' && getScene(v.sceneId).title === 'Culvert Drain-Pipe', 'V1 spot')
  const s0 = n(v, 'scrap')
  v = press(v, 'reach')
  ok(n(v, 'scrap') === s0 + 3 && n(v, 'salve') === 1 && n(v, 'vial_drop') === 1 && v.sceneId === 'ch3:siphon' && !!v.flash?.startsWith('Cold sludge to the shoulder. Your fingers close on wet cloth. A pouch, knotted shut.\n\nScrap +3.\nResin +1.\nDrop +1.'), 'V1 pays on the spot')
  ok(!row(v, 'sq-walk-sqCulvert') && log(v, 'sqCulvert')?.body === "You pulled the deserter's pouch out of the culvert.", 'V1 done, no repeat')
  // V2 Seam: knife gate.
  const noKnife = { ...ch3('ch3:crosshaven'), items: { ...s.items, needle_knife: 0 } }
  const lockedSeam = press(noKnife, 'sq-walk-sqSeam')
  ok(!isChoiceOn(lockedSeam, row(lockedSeam, 'pry')!.enable) && row(lockedSeam, 'pry')!.locked === 'Needs: the Needle Knife', 'V2 locked without knife')
  v = press(ch3('ch3:crosshaven'), 'sq-walk-sqSeam')
  const s1 = n(v, 'scrap')
  v = press(v, 'pry')
  ok(n(v, 'scrap') === s1 + 4 && n(v, 'sinew_cord') === 1 && v.flash?.endsWith('Scrap +4.\nSinew Cord +1.') && v.items.needle_knife === 1, 'V2 pays: Scrap +4, Sinew Cord +1')
  ok(log(v, 'sqSeam')?.body === 'You pried the floor-seam stash outside Crosshaven.', 'V2 log done')
  // V3 Dry-Well: hidden until the escape from the collared wagon.
  ok(!row(ch3('ch3:wagon'), 'sq-walk-sqDispatch'), 'V3 hidden while collared')
  v = press(ch3('ch3:wagon', { ch3Out: true }), 'sq-walk-sqDispatch')
  ok(getScene(v.sceneId).body === 'A square shaft off the wagon road, iron rungs bolted down one wall. No water in it for a long time. Dust at the bottom, and something flat in an oilcloth wrap.', 'V3 spot')
  const s2 = n(v, 'scrap')
  v = press(v, 'climb')
  ok(n(v, 'vial_drop') === 1 && n(v, 'scrap') === s2 + 1 && log(v, 'sqDispatch')?.body === 'Varro has the dispatch. The seal was still whole.', 'V3 pays on the spot: Drop +1, Scrap +1')
  ok(!visibleChoices(at(v, 'maw:zafir', 'redmaw')).some((c) => c.id.startsWith('sq-')), 'Varro: no turn-in rows (paid on the spot)')
}

// ── Art ──
for (const q of SIDE_QUESTS) for (const p of q.pins) {
  const st = at(base(p.door ?? 'prisoner', false), p.scene, p.hub)
  const key = playCoverKey(st, getScene(p.scene))
  const file = playCoverFile(key)
  ok(file.startsWith('sq-') && existsSync(`public/covers/${file}`) && statSync(`public/covers/${file}`).size > 20000 && readFileSync('public/sw.js', 'utf8').includes(`covers/${file}`), `${p.scene} art (${file})`)
}

if (fails) { console.log(`v245: ${fails} failure(s)`); process.exit(1) }
console.log('v245 ok')

/** v240: the Crosshaven inner gates open. Cut the winch cables, then crank the drum (Jeramie, t1251u). */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, visibleChoices, winchOpens } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v256'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v256'"), 'build v253')

const LOCKED = 'The cables are bound too thick to pull. You need a blade.'
const CUT = 'The rotted bindings part under the blade, one braid at a time. The drum is free of rope, but silt has welded it solid.'
const OPEN = 'Iron groans across the fringe, a sound you feel in your teeth. The portcullis drags upward and locks high. The way in is open.'
const SLIP = "The handle kicks back and cracks your knuckles. The drum doesn't move. Yet."
const FRINGE = "The noise of the perimeter drops behind you, replaced by the low hum of Crosshaven's outer filters. Lantern light cuts through the grease-haze on the shanties. You've made it off the flats, but the inner gates are locked tight."

const fringe = (door: DoorId, knife: boolean, flags: GameState['flags'] = {}, extra: Partial<GameState> = {}): GameState => {
  const base = newGame(door)
  const items = { ...base.items }
  delete items.needle_knife
  // v247: a dagger or shiv also cuts now; the no-knife case means no blade at all.
  delete items.rusted_dagger
  delete items.shiv
  if (knife) items.needle_knife = 1
  return { ...base, sceneId: 'ch3:crosshaven', hubId: 'barrow', chapterId: 'luminspire', sap: 4, items, ...extra, flags: { ...base.flags, ch3Started: true, ch3Stripped: true, ch3VaultDone: true, ch3TentOpen: true, ...flags } }
}
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)

ok(getScene('ch3:crosshaven').body === FRINGE, 'fringe body unchanged')

for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  // No knife: the cut button is up but locked, with the approved line.
  const bare = fringe(door, false)
  // v247: with no blade the row is the rough-blade one, sub reworded.
  const cut0 = row(bare, 'cut-cables-rough')
  ok(!!cut0 && cut0.label === 'Cut the winch cables' && cut0.sub === 'Needle Knife, or any blade (Health −1).' && !isChoiceOn(bare, cut0.enable) && cut0.locked === LOCKED, `${door}: cut locked without knife`)
  ok(!row(bare, 'crank-drum'), `${door}: no crank before the cut`)
  ok(interpret(bare, 'cut the cables').flash === LOCKED && !interpret(bare, 'cut the cables').flags.crosshavenCablesCut, `${door}: typed cut, locked line`)

  // Knife: cut works and keeps the knife.
  const armed = fringe(door, true)
  const cut = applyEffect(armed, row(armed, 'cut-cables')!.effects)
  ok(cut.flash === CUT && cut.flags.crosshavenCablesCut === true && cut.items.needle_knife === 1 && cut.sceneId === 'ch3:crosshaven', `${door}: cut works, knife kept`)
  ok(!row(cut, 'cut-cables') && row(cut, 'crank-drum')?.label === 'Crank the drum' && row(cut, 'crank-drum')?.sub === 'A heavy pull. Health −1 if it slips.', `${door}: crank replaces cut`)
  ok(cut.health === armed.health && cut.sap === armed.sap, `${door}: cut costs nothing`)
  const typedCut = interpret(armed, 'cut the winch cables')
  ok(typedCut.flags.crosshavenCablesCut === true && typedCut.flash === CUT, `${door}: typed cut`)

  // Find a pull that slips and one that opens.
  let miss: GameState | null = null
  let hit: GameState | null = null
  for (let t = 0; t < 60 && (!miss || !hit); t++) {
    const s = { ...cut, ticks: t, health: 5 }
    if (winchOpens(s)) hit ??= s
    else miss ??= s
  }
  ok(!!miss && !!hit, `${door}: both outcomes reachable`)
  if (miss && hit) {
    const m = applyEffect(miss, row(miss, 'crank-drum')!.effects)
    ok(m.flash === SLIP && m.health === 4 && !m.flags.crosshavenGateOpen && !!row(m, 'crank-drum') && m.sceneId === 'ch3:crosshaven', `${door}: slip costs 1 Health, crank stays`)
    const h = applyEffect(hit, row(hit, 'crank-drum')!.effects)
    ok(h.flash === OPEN && h.flags.crosshavenGateOpen === true && h.health === 5 && h.items.needle_knife === 1, `${door}: crank opens`)
    ok(!row(h, 'crank-drum') && !row(h, 'cut-cables') && visibleChoices(h).map((c) => c.id).join() === 'walk-gatehouse,walk-tent', `${door}: buttons gone once open`)
    ok(getScene(h.sceneId).body === FRINGE, `${door}: body unchanged after opening`)
    ok(interpret(hit, 'crank the drum').flags.crosshavenGateOpen === true, `${door}: typed crank`)
    ok(interpret(miss, 'open the gate').flash === SLIP, `${door}: typed open gate pulls`)
  }

  // No cap: keep pulling, the gate opens.
  let s = { ...cut, health: 99, healthMax: 99 }
  let n = 0
  while (!s.flags.crosshavenGateOpen && n < 40) { s = applyEffect(s, row(s, 'crank-drum')!.effects); n++ }
  ok(s.flags.crosshavenGateOpen === true, `${door}: repeated pulls open it (${n})`)
}

// Health 0 on a slip goes through the normal Down / Hands flow.
{
  const cut = fringe('vessel', true, { crosshavenCablesCut: true })
  let low: GameState | null = null
  for (let t = 0; t < 60 && !low; t++) if (!winchOpens({ ...cut, ticks: t })) low = { ...cut, ticks: t, health: 1 }
  const down = applyEffect(low!, row(low!, 'crank-drum')!.effects)
  ok(down.health <= 0 && down.flags.downed === true && (down.hands ?? 3) === 2, `slip at 1 Health downs you and spends a hand (hands ${down.hands})`)
}

// Old saves without the flags load fine.
const old = repairLoadedState(JSON.parse(JSON.stringify(fringe('outcast', true))) as GameState)
ok(old.sceneId === 'ch3:crosshaven' && !!row(old, 'cut-cables') && !!row(old, 'walk-tent'), 'old save loads with the cut button')
const opened = repairLoadedState(JSON.parse(JSON.stringify(fringe('outcast', true, { crosshavenCablesCut: true, crosshavenGateOpen: true }))) as GameState)
ok(opened.flags.crosshavenGateOpen === true && !row(opened, 'crank-drum'), 'open gate survives a reload')

if (fails) { console.log(`v240: ${fails} failure(s)`); process.exit(1) }
console.log('v240 ok')

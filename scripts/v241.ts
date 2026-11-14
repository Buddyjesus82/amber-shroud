/** v241: the Iron Gatehouse behind the opened Crosshaven gate (Jeramie, t1252u). */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, travelTo, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { ch3MapLocked } from '../src/game/map.ts'
import { repairLoadedState } from '../src/game/repair.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v241'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v241'"), 'build v241')

const BODY = "A narrow vaulted passage, stone sweating in the dead air. An old Cartel post rots against the wall, a stool, a rack with no spears, and a guard who never got relieved, still sitting in what's left of his coat. A footlocker sits at his boots, padlocked and rust-sealed."
const PRY = 'The hasp gives with a crack. Inside, rusted fittings and a twist of dry rations, wrapped like someone meant to come back.'
const GUARD = 'His pockets hold sand and a Cartel tally chit, stamped and worthless now.'
const LOCKED = 'Needs: the Needle Knife'

const at = (sceneId: string, door: DoorId, knife: boolean, flags: GameState['flags'] = {}): GameState => {
  const base = newGame(door)
  const items = { ...base.items }
  delete items.needle_knife
  if (knife) items.needle_knife = 1
  return { ...base, sceneId, hubId: 'barrow', chapterId: 'luminspire', sap: 4, items, flags: { ...base.flags, ch3Started: true, ch3Stripped: true, ch3VaultDone: true, ch3TentOpen: true, crosshavenCablesCut: true, crosshavenGateOpen: true, ...flags } }
}
const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)

const g = getScene('ch3:gatehouse')
ok(g.title === 'The Iron Gatehouse' && g.body === BODY && g.hubId === 'barrow', 'gatehouse scene text exact')
ok(!visibleChoices(at('ch3:gatehouse', 'outcast', true)).some((c) => /courtyard/i.test(c.label)), 'no courtyard button yet')

for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  // Fringe: the walk only shows once the gate is open.
  const shut = at('ch3:crosshaven', door, true, { crosshavenGateOpen: false })
  ok(!row(shut, 'walk-gatehouse'), `${door}: no gatehouse walk while the gate is shut`)
  ok(ch3MapLocked(shut, 'ch3:gatehouse') && travelTo(shut, 'ch3:gatehouse').sceneId === 'ch3:crosshaven', `${door}: map can't skip the gate`)
  const open = at('ch3:crosshaven', door, true)
  const walk = row(open, 'walk-gatehouse')
  ok(walk?.label === 'Walk into the Gatehouse', `${door}: walk shows once open`)
  const inside = applyEffect(open, walk!.effects)
  ok(inside.sceneId === 'ch3:gatehouse', `${door}: walk goes in`)
  ok(!ch3MapLocked(open, 'ch3:gatehouse') && travelTo(open, 'ch3:gatehouse').sceneId === 'ch3:gatehouse', `${door}: map walks in once open`)
  ok(visibleChoices(inside).map((c) => c.id).join() === 'pry-footlocker,search-guard,back-fringe', `${door}: gatehouse rows`)

  // No knife: footlocker locked.
  const bare = at('ch3:gatehouse', door, false)
  const p0 = row(bare, 'pry-footlocker')!
  ok(p0.label === 'Pry the footlocker' && p0.sub === 'Needs the Needle Knife.' && !isChoiceOn(bare, p0.enable) && p0.locked === LOCKED, `${door}: footlocker locked without knife`)
  const typedBare = interpret(bare, 'pry the footlocker')
  ok(typedBare.flash === LOCKED && !typedBare.flags.gatehouseLockerPried && (typedBare.items.scrap ?? 0) === (bare.items.scrap ?? 0), `${door}: typed pry, locked line`)

  // Knife: once, scrap +1 and rations +1, knife kept.
  const armed = at('ch3:gatehouse', door, true)
  const pried = applyEffect(armed, row(armed, 'pry-footlocker')!.effects)
  ok(pried.flash === PRY && pried.sceneId === 'ch3:gatehouse' && pried.items.needle_knife === 1, `${door}: pry works, knife kept`)
  ok((pried.items.scrap ?? 0) === (armed.items.scrap ?? 0) + 1 && (pried.items.seeker_rations ?? 0) === (armed.items.seeker_rations ?? 0) + 1, `${door}: scrap +1, rations +1`)
  ok(!row(pried, 'pry-footlocker'), `${door}: pry gone after`)
  const typedPry = interpret(armed, 'open the footlocker')
  ok(typedPry.flash === PRY && typedPry.flags.gatehouseLockerPried === true, `${door}: typed open footlocker`)
  ok(interpret(pried, 'pry the footlocker').flash !== PRY, `${door}: typed pry does not repeat`)

  // Guard: once, no reward.
  const searched = applyEffect(armed, row(armed, 'search-guard')!.effects)
  ok(searched.flash === GUARD && searched.sceneId === 'ch3:gatehouse' && JSON.stringify(searched.items) === JSON.stringify(armed.items), `${door}: guard search, no reward`)
  ok(!row(searched, 'search-guard'), `${door}: guard search gone after`)
  ok(interpret(armed, 'search the body').flash === GUARD, `${door}: typed search the body`)
  ok(interpret(searched, 'search the guard').flash !== GUARD, `${door}: typed guard does not repeat`)

  // Back.
  const back = row(armed, 'back-fringe')!
  ok(back.label === 'Back to the Fringe' && applyEffect(armed, back.effects).sceneId === 'ch3:crosshaven', `${door}: back to the Fringe`)
}

// Art.
const key = playCoverKey(at('ch3:gatehouse', 'outcast', true), g)
ok(key === 'ch3_gatehouse', `art key (${key})`)
const file = playCoverFile(key)
ok(readFileSync('public/sw.js', 'utf8').includes('covers/ch3-gatehouse.jpg'), 'sw precaches the gatehouse art')
ok(file === 'ch3-gatehouse.jpg' && existsSync(`public/covers/${file}`) && statSync(`public/covers/${file}`).size > 20000, `art file exists (${file})`)

// A reload keeps the gatehouse state.
const done = repairLoadedState(JSON.parse(JSON.stringify(at('ch3:gatehouse', 'vessel', true, { gatehouseLockerPried: true, gatehouseGuardSearched: true }))) as GameState)
ok(done.sceneId === 'ch3:gatehouse' && visibleChoices(done).map((c) => c.id).join() === 'back-fringe', 'reload keeps the gatehouse done')

if (fails) { console.log(`v241: ${fails} failure(s)`); process.exit(1) }
console.log('v241 ok')

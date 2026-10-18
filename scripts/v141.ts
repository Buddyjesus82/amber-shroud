/**
 * v141: a win at mutual 0 Health is a win at Health 1, not a Down. Real losses still Down you.
 *   npx tsx scripts/v141.ts
 */
import { applyEffect, isChoiceOn, newGame, visibleChoices } from '../src/game/engine.ts'
import { MUTUAL_WIN_LINE, beginEncounter } from '../src/game/encounter.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

const GROUND: Record<DoorId, [string, string]> = {
  prisoner: ['camp04', 'camp:yard'],
  outcast: ['spine', 'spine:ridge'],
  vessel: ['threshold', 'thresh:paddock'],
}
const KINDS = ['tick', 'jackal', 'cutter', 'scavenger', 'pup', 'patrol', 'handler', 'hound', 'overseer', 'husk', 'collector', 'carapace', 'courtguard', 'strayhunter', 'strayhound']

function open(door: DoorId, kind: string, t: number, health: number, hp: number, extra: Record<string, boolean | number> = {}): GameState {
  const g = newGame(door)
  const [hub, scene] = GROUND[door]
  let s: GameState = { ...g, sceneId: scene, hubId: hub, ticks: 20 + t * 7, pressure: t % 9, sap: 4 + (t % 4), health, flags: { ...g.flags, noMasked: true, ...extra } }
  s = applyEffect(s, beginEncounter(s, kind as never))
  return { ...s, health, flags: { ...s.flags, encounterHp: hp } }
}
function strike(s: GameState): GameState {
  const row = visibleChoices(s).find((c) => c.id === 'enc-fight')
  if (!row || !isChoiceOn(s, row.enable)) throw new Error('no fight row')
  return applyEffect(s, row.effects)
}
function over(s: GameState): boolean {
  return !s.flags.encounterHere || !!s.flags.encounterDone || s.health <= 0 || !!s.flags.downed
}

let mutual = 0
let realLosses = 0
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (const kind of KINDS) {
    for (let t = 0; t < 40; t++) {
      // One Health each: the enemy at 1, you at 1. Whoever lands, you both land or you both fall.
      const st = open(door, kind, t, 1, 1)
      if (!st.flags.encounterHere || st.flags.encounterKind !== kind) continue
      const calm = open(door, kind, t, 6, 1)
      let a = st
      let b = calm
      for (let r = 0; r < 6 && !over(a); r++) a = strike(a)
      for (let r = 0; r < 6 && !over(b); r++) b = strike(b)
      const clash = String(a.flags.encounterClash ?? a.flash ?? '')
      if (/You are at 1 Health/.test(clash)) {
        mutual++
        ok(a.health === 1, `${door} ${kind} t${t}: mutual-0 win leaves Health 1 (got ${a.health})`)
        ok(!a.flags.downed && !a.flags.downedWon, `${door} ${kind} t${t}: mutual-0 win is not a Down`)
        ok(!/You drop|Too hurt|Health 0/.test(clash), `${door} ${kind} t${t}: no Down wording in the win`)
        ok(!!a.flags.encounterDone || !a.flags.encounterHere, `${door} ${kind} t${t}: fight is over`)
        // Same loot and the same win-side Heat as an ordinary win of that fight.
        ok(JSON.stringify(a.items) === JSON.stringify(b.items), `${door} ${kind} t${t}: loot kept (${JSON.stringify(a.items)} vs ${JSON.stringify(b.items)})`)
        ok(JSON.stringify(a.heat) === JSON.stringify(b.heat), `${door} ${kind} t${t}: no extra Heat (${JSON.stringify(a.heat)} vs ${JSON.stringify(b.heat)})`)
      } else if (a.health <= 0 || a.flags.downed) {
        realLosses++
        ok(/You drop/.test(clash) || a.flags.downed, `${door} ${kind} t${t}: a real loss still reads as one`)
        ok(!/You are at 1 Health/.test(clash), `${door} ${kind} t${t}: a loss never says you are at 1 Health`)
      }
    }
  }
}
ok(mutual > 100, `mutual-0 wins exercised (${mutual})`)
ok(realLosses > 20, `real losses exercised (${realLosses})`)

// A real loss, pinned: the enemy lives (Health 3, Shell 3), you are at 1 Health.
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  let downs = 0
  for (let t = 0; t < 30; t++) {
    let s = open(door, 'husk', t, 1, 3, { encounterController: false })
    s = { ...s, flags: { ...s.flags, encounterController: false } }
    s = strike(s)
    if (s.health <= 0 || s.flags.downed) {
      downs++
      ok(!s.flags.downedWon, `${door} t${t}: a real loss is not marked as a win`)
    }
  }
  ok(downs > 0, `${door}: a real loss still Downs you (${downs}/30)`)
}

// The masked figure: his hit never takes you below 1, and he is never "killed".
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  for (let t = 0; t < 20; t++) {
    let s = open(door, 'masked', t, 1, 3)
    s = strike(s)
    ok(s.health >= 1 && !s.flags.downed, `${door} masked t${t}: stays at 1 or more (${s.health})`)
  }
}

ok(MUTUAL_WIN_LINE.trim() === 'You are at 1 Health.', 'the added line is the single plain sentence')

if (fails) {
  console.log(`\n${fails} v141 check(s) FAILED`)
  process.exit(1)
}
console.log(`v141 checks OK (${mutual} mutual-0 wins, ${realLosses} real losses)`)

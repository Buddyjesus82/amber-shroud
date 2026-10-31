/**
 * v142: enemy hits are a roll from 1 to their own Strike (less your Shell, min 1), and Strike 1-2 enemies got +1.
 *   npx tsx scripts/v142.ts
 */
import { applyEffect, bodyOf, newGame } from '../src/game/engine.ts'
import { beginEncounter, encounterSpec, enemyHit } from '../src/game/encounter.ts'
import { FIGHT_HELP, HELP_TOPICS } from '../src/game/helpTopics.ts'
import { coverBand, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { getScene } from '../src/game/content/index.ts'
import { existsSync, readFileSync, statSync } from 'node:fs'
import type { EncounterKind } from '../src/game/encounter.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

const base = newGame('prisoner')
const spec = (kind: EncounterKind) => encounterSpec({ ...base, flags: { ...base.flags, encounterKind: kind } })

// Bump B: Strike 1 or 2 became 2 or 3. The hunters and the rest are untouched.
const BUMPED: Record<string, number> = { tick: 2, pup: 2, jackal: 3, cutter: 3, scavenger: 3, patrol: 3, handler: 3, courtguard: 3, runner: 3, husk: 3 }
const SAME: Record<string, number> = { hound: 3, overseer: 4, collector: 3, carapace: 4, strayhunter: 3, strayhound: 3, masked: 1 }
for (const [k, n] of Object.entries(BUMPED)) ok(spec(k as EncounterKind).strike === n, `${k} Strike is ${n} (got ${spec(k as EncounterKind).strike})`)
for (const [k, n] of Object.entries(SAME)) ok(spec(k as EncounterKind).strike === n, `${k} Strike stays ${n} (got ${spec(k as EncounterKind).strike})`)

// The hit: uniform 1..Strike, minus Shell, min 1. No swing on top.
for (const strike of [1, 2, 3, 4]) {
  for (const shell of [0, 1, 2, 3]) {
    const seen = new Map<number, number>()
    for (let t = 0; t < 600; t++) {
      const s: GameState = { ...base, ticks: t * 5 + 1, pressure: t % 7, sap: 2 + (t % 5), flags: { ...base.flags, encounterKind: 'jackal', encounterRound: t % 4 } }
      const d = enemyHit(s, strike, shell)
      seen.set(d, (seen.get(d) ?? 0) + 1)
    }
    const hi = Math.max(1, strike - shell)
    ok([...seen.keys()].every((d) => d >= 1 && d <= hi), `Strike ${strike} vs Shell ${shell}: hits stay 1..${hi} (${[...seen.keys()].join(',')})`)
    ok(seen.has(hi), `Strike ${strike} vs Shell ${shell}: the top hit ${hi} lands`)
    if (strike - shell >= 2) {
      // Uniform: every value 1..strike appears, each roughly a strike-th of the rolls.
      for (let v = 1; v <= strike; v++) {
        const n = seen.get(Math.max(1, v - shell)) ?? 0
        ok(n > 600 / strike / 2, `Strike ${strike} vs Shell ${shell}: value ${v} is rolled (${n}/600)`)
      }
    }
  }
}

// The card shows the bumped Strike on clean stat rows.
{
  const g = newGame('vessel')
  let s: GameState = { ...g, sceneId: 'thresh:paddock', hubId: 'threshold', ticks: 9 }
  s = applyEffect(s, beginEncounter(s, 'jackal'))
  ok(/^DUST-JACKAL ♥ \d+ ⚔ Strike 3 🛡 Shell 1$/m.test(bodyOf(s)), 'the jackal card shows Strike 3')
  s = applyEffect({ ...g, sceneId: 'thresh:paddock', hubId: 'threshold', ticks: 9 }, beginEncounter(g, 'husk'))
  ok(/^HUSK ♥ \d+ ⚔ Strike 3 🛡 Shell 3$/m.test(bodyOf(s)), 'the husk card shows Strike 3')
}

// No "Hard swing" line, no swing in enemy text.
{
  let hard = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    for (let t = 0; t < 40; t++) {
      const g = newGame(door)
      let s: GameState = { ...g, sceneId: door === 'prisoner' ? 'camp:yard' : door === 'outcast' ? 'spine:ridge' : 'thresh:paddock', hubId: door === 'prisoner' ? 'camp04' : door === 'outcast' ? 'spine' : 'threshold', ticks: 11 + t * 3, sap: 5, flags: { ...g.flags, noMasked: true } }
      s = applyEffect(s, beginEncounter(s, 'cutter'))
      s = applyEffect(s, { resolveEncounter: 'fight' })
      if (/Hard swing/.test(bodyOf(s))) hard++
    }
  }
  ok(hard === 0, `no Hard swing line (${hard})`)
}

// Masked: his hit is 1 and never drops you below Health 1.
for (let t = 0; t < 30; t++) {
  const g = newGame('outcast')
  let s: GameState = { ...g, sceneId: 'spine:ridge', hubId: 'spine', ticks: 3 + t, health: 1, flags: { ...g.flags } }
  s = applyEffect(s, beginEncounter(s, 'masked'))
  s = applyEffect(s, { resolveEncounter: 'fight' })
  ok(s.health >= 1 && !s.flags.downed, `masked t${t}: Health stays at 1 or more`)
}

// Help text agrees.
{
  const text = JSON.stringify(HELP_TOPICS) + JSON.stringify(FIGHT_HELP)
  ok(!/Strike 2, Shell 3, Health 3/.test(text), 'Help no longer says the husk is Strike 2')
  // v179: help carries no stat formulas
  ok(!/luck to both sides/.test(text), 'Help no longer says luck goes to both sides')
  ok(!/roll from 1 up/.test(text), 'v179: help has no roll formula')
}

// Hound-handler art: the new portrait everywhere; the old hound art is no longer used by any scene or card.
{
  const o = newGame('outcast')
  for (const id of ['spine:hound', 'spine:hunter']) {
    const s: GameState = { ...o, sceneId: id, hubId: 'spine' }
    ok(playCoverKey(s, getScene(id)) === 'handler', `${id} shows the handler portrait`)
  }
  const p = newGame('prisoner')
  const f = applyEffect({ ...p, sceneId: 'camp:yard', hubId: 'camp04', ticks: 5 }, beginEncounter(p, 'hound'))
  ok(f.flags.encounterKind === 'hound' && playCoverKey(f, getScene('camp:yard')) === 'handler', 'the Shard-Hound fight card shows the handler portrait')
  ok(playCoverFile('handler') === 'handler.jpg', 'the handler key is handler.jpg')
  const [top, bottom] = coverBand('handler')
  ok(top === 0 && bottom >= 0.85, `handler band keeps the face and the hound's head (${top}-${bottom})`)
  // No scene or card can reach the old file: walk every scene id x door and the fight kinds.
  let hits = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
    const g = newGame(door)
    for (const id of ['spine:hound', 'spine:hunter', 'spine:valerius', 'camp:hunter', 'camp:tower', 'camp:valerius', 'thresh:hunter', 'camp:yard', 'spine:ridge']) {
      for (const flags of [{}, { hunterHere: true }, { encounterHere: true, encounterKind: 'hound' }, { encounterHere: true, encounterKind: 'handler' }]) {
        const s: GameState = { ...g, sceneId: id, hubId: id.startsWith('spine') ? 'spine' : id.startsWith('thresh') ? 'threshold' : 'camp04', flags: { ...g.flags, ...flags } }
        try { if (playCoverKey(s, getScene(id)) === 'hound') hits++ } catch { /* scene absent for this door */ }
      }
    }
  }
  ok(hits === 0, `nothing resolves to the old hound art (${hits})`)
  // The file stays on disk and in the precache, so the service worker still installs cleanly.
  const sw = readFileSync('public/sw.js', 'utf8')
  const listed = [...sw.matchAll(/covers\/([\w.-]+\.(?:jpg|png))/g)].map((m) => m[1])
  ok(listed.includes('handler.jpg'), 'sw.js precaches handler.jpg')
  ok(listed.every((n) => existsSync(`public/covers/${n}`)), 'every precached cover exists on disk')
  ok(existsSync('public/covers/valerius.jpg') && statSync('public/covers/valerius.jpg').size > 0, 'valerius.jpg is untouched')
}

if (fails) {
  console.log(`\n${fails} v142 check(s) FAILED`)
  process.exit(1)
}
console.log('v142 checks OK')

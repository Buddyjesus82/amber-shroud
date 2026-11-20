/** v255: Ossuary sits lower on the Barrow map, and a standing guard station blocks the Prisoner's Wire at once (Jeramie). */
import { readFileSync } from 'node:fs'
import { applyEffect, CACHE_CONFIRM, interpret, newGame, visibleChoices, WIRE_BLOCKED } from '../src/game/engine.ts'
import { HUB_MAPS } from '../src/game/content/maps.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v255'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v255'"), 'build v255')

// 1. Barrow map: Ossuary in the gap between Approach and Rustvein, well clear of the Relay-Siphon road.
{
  const m = HUB_MAPS.barrow
  const n = (id: string) => m.nodes.find((x) => x.id === id)!
  const o = n('ossuary'), c = n('causeway'), a = n('wagon'), r = n('rustvein'), relay = n('relay'), siphon = n('siphon')
  ok(relay.y === siphon.y, 'the Relay-Siphon road is level')
  ok(o.x > a.x && o.x < r.x && Math.abs(o.y - a.y) <= 4 && Math.abs(o.y - r.y) <= 4, `Ossuary sits in the gap between Approach and Rustvein (${o.x},${o.y})`)
  // Phone map is 341px wide (1 unit = 3.41px). Marker (or the 17px you-are-here ring) and the label above must stay well off the road.
  const unit = 341 / m.width
  const labelTop = o.y * unit - 17 - 4 - 34
  ok(labelTop - relay.y * unit >= 14, `the Ossuary ring and label clear the Relay-Siphon road (${(labelTop - relay.y * unit).toFixed(1)}px)`)
  ok(o.labelSide === 'above' && c.labelSide === 'below', 'labels sit off the Causeway-Ossuary stem')
  ok(c.x === o.x && c.y > o.y && m.edges.some((e) => e.a === 'causeway' && e.b === 'ossuary'), 'the dead-end stem runs straight up from the Causeway')
  ok(m.edges.filter((e) => e.a === 'ossuary' || e.b === 'ossuary').length === 1, 'the Ossuary is a dead end')
}

// 2. The Prisoner's Wire: guard station standing blocks at once; guard down still asks before the road.
{
  const take = (s: GameState) => (typeof s.flags.cachePending === 'string' ? applyEffect(s, { cacheCommit: true }) : s)
  const at = (sceneId: string, flags: Record<string, unknown>): GameState => {
    const g = newGame('prisoner')
    return { ...g, hubId: 'camp04', sceneId, flags: { ...g.flags, noMasked: true, ...flags }, health: 6, sap: 8 } as GameState
  }
  const rows: [string, string, Record<string, unknown>][] = [
    ['camp:hunter', 'hunter-run', { hungerKnown: true, hunterHere: true }],
    ['camp:hunter', 'hunter-blind', { hunterHere: true }],
    ['camp:hunter', 'run', { hungerKnown: true }],
    ['camp:hunter', 'blind', {}],
    ['camp:forced', 'go', { hungerKnown: true }],
    ['camp:forced', 'blind', {}],
  ]
  for (const [scene, id, f] of rows) {
    const up = at(scene, f)
    const c = visibleChoices(up).find((x) => x.id === id)
    ok(c, `${scene}: ${id} visible`)
    if (!c) continue
    const b = applyEffect(up, c.effects)
    ok(b.flash === WIRE_BLOCKED && b.flags.cachePending === undefined && b.sceneId === scene && !b.chapterId, `${scene}/${id}: guard up blocks at once with no ask (${b.flash})`)
    ok(!visibleChoices(b).some((x) => x.id === 'cache-take' || x.id === 'cache-stay'), `${scene}/${id}: no Take the road / Stay rows`)
    ok(b.health === up.health && b.sap === up.sap && JSON.stringify(b.heat) === JSON.stringify(up.heat), `${scene}/${id}: the block costs nothing`)
    const down = at(scene, { ...f, guardDown: true })
    const asked = applyEffect(down, visibleChoices(down).find((x) => x.id === id)!.effects)
    ok(asked.flash === CACHE_CONFIRM && typeof asked.flags.cachePending === 'string' && asked.sceneId === scene, `${scene}/${id}: guard down still asks first`)
    ok(take(asked).chapterId === 'cache-run', `${scene}/${id}: Take the road leaves`)
  }
  for (const cmd of ['take the gullet', 'break the wire anyway']) {
    const t = interpret(at('camp:forced', { hungerKnown: true }), cmd)
    ok(t.flags.cachePending === undefined && !t.chapterId, `typed "${cmd}" with the guard up does not ask (${t.flash})`)
  }
  // Other doors keep the ask (no wire).
  const o = { ...newGame('outcast'), hubId: 'camp04', sceneId: 'camp:forced', flags: { ...newGame('outcast').flags, hungerKnown: true } } as GameState
  ok(applyEffect(o, visibleChoices(o).find((c) => c.id === 'go')!.effects).flash === CACHE_CONFIRM, 'outcast still asks')
}

if (fails) { console.log(`v255: ${fails} failure(s)`); process.exit(1) }
console.log('v255 checks OK')

/** v259: Ossa's name reveal is a quiet beat: no Scavenge there, and the prose fits above the fold (Jeramie). */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { canScavenge, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v259'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v259'"), 'build v259')

const at = (door: GameState['door'], sceneId: string, flags: Record<string, unknown> = {}): GameState => {
  const g = newGame(door)
  return { ...g, sceneId, hubId: 'redmaw', flags: { ...g.flags, chapter1Done: true, chapter1EndSeen: true, rimRoadSeen: true, noMasked: true, ossaToldDay: true, ossaStillness: true, ossaNamedZafir: true, ...flags } } as GameState
}
const NOT_HERE = 'Nothing here to pick. The road has already been picked clean — or this is not a roam.'

for (const door of ['prisoner', 'outcast', 'vessel'] as GameState['door'][]) {
  const s = at(door, 'maw:ossa-name')
  // 1. No Scavenge row (the play screen shows it only when canScavenge), one exit.
  ok(!canScavenge(s), `${door}: no Scavenge on the reveal`)
  ok(JSON.stringify(visibleChoices(s).map((c) => [c.id, c.label])) === '[["back","Give her the quiet"]]', `${door}: Give her the quiet is the only choice`)
  // 2. Typed scavenge asks do not loot: the existing generic line, nothing moves.
  for (const typed of ['scavenge', 'scavenge for scrap', 'search for scrap', 'dig for scrap']) {
    const n = interpret(s, typed)
    ok(n.sceneId === 'maw:ossa-name' && JSON.stringify(n.items) === JSON.stringify(s.items) && JSON.stringify(n.heat) === JSON.stringify(s.heat) && n.sap === s.sap, `${door} "${typed}": no loot, no Heat (${n.flash})`)
    // A typed scavenge is a no-op; other phrasings fall through to Ossa's usual talk reply (an existing line, one tick).
    if (/scaven/.test(typed)) ok(n.ticks === s.ticks, `${door} "${typed}": no tick`)
    ok(!Object.keys(n.flags).some((k) => k.startsWith('scavenge:')) && !n.flags.hunterHere && !n.flags.encounterHere, `${door} "${typed}": no picked patch, no hunt`)
    if (/scaven/.test(typed)) ok(n.flash === NOT_HERE, `${door} "${typed}": existing generic decline (${n.flash})`)
  }
  // 3. Scavenge elsewhere in the shade is unchanged.
  for (const id of ['maw:stilt', 'maw:ossa', 'maw:ossa-day']) ok(canScavenge(at(door, id)), `${door}: Scavenge still on ${id}`)
}
ok(readFileSync('src/game/scavenge.ts', 'utf8').includes(NOT_HERE), 'the decline is the existing scavenge.ts line')

// 4. ossaNamedZafir: set only by the reveal node.
{
  const files: string[] = []
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p) } }
  walk('src')
  const setters = files.flatMap((p) => (readFileSync(p, 'utf8').match(/ossaNamedZafir:\s*true/g) ?? []).map(() => p))
  ok(setters.length === 1 && setters[0].endsWith('redMaw.ts'), `one setter in src (${setters.join(', ')})`)
  ok(JSON.stringify(getScene('maw:ossa-name').onEnter) === '{"flag":{"ossaNamedZafir":true}}', 'the reveal sets it on entry')
  ok(!/zafir/i.test(JSON.stringify(visibleChoices(at('prisoner', 'maw:ossa', { ossaNamedZafir: false })).map((c) => c.label + (c.sub ?? '')))), 'the ask itself does not name him')
}

// 5. Layout: the compact prose is scoped to this node only.
{
  const play = readFileSync('src/components/PlayScreen.tsx', 'utf8')
  ok(/const COMPACT_STORY = new Set\(\['maw:ossa-name'\]\)/.test(play), 'COMPACT_STORY holds only the reveal')
  const css = readFileSync('src/index.css', 'utf8')
  ok(/\.play-screen \.story\.story-compact \{[^}]*font-size: 1\.04rem;[^}]*line-height: 1\.4;/.test(css), 'compact prose rule')
  ok(!/story-compact[^{]*\{[^}]*--story-top/.test(css) && !/story-compact[^{]*scene-(art|img)/.test(css), 'art window untouched')
}

if (fails) { console.log(`v259: ${fails} FAIL`); process.exit(1) }
console.log('v259 ok')

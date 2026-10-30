/**
 * v159: the masked figure reaches the early game. Hint buttons no longer silence a scene; the Prisoner gets a guaranteed first
 * glimpse in the home camp once the job is taken; the opening sighting is always a glimpse (the Outcast's fixed block is gone).
 *   npx tsx scripts/v159.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { FORCED_GLIMPSE_SCENES, MASKED_BLOCK_LINE, MASKED_GLIMPSE_LINE, MASKED_GLIMPSE_LINES_EXTRA, maskedQuietScene } from '../src/game/masked.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v171'"), 'SW cache v159')
const GLIMPSES = [MASKED_GLIMPSE_LINE, ...MASKED_GLIMPSE_LINES_EXTRA]
const hasGlimpse = (f: string | undefined) => !!f && GLIMPSES.some((l) => f.includes(l))

// 1. Hint buttons ("go back to Jaxson") do not make a scene quiet. Real offers, speakers, people and shops still do.
for (const id of ['camp:yard', 'camp:vents']) ok(!maskedQuietScene(id), `${id} is no longer quiet`)
for (const id of ['camp:guard', 'camp:lean', 'camp:cages', 'camp:wire', 'camp:valerius', 'camp:bay', 'camp:kaelen', 'thresh:court', 'thresh:paddock', 'spine:silas', 'maw:market', 'maw:smoke', 'ch1:p-clerk'])
  ok(maskedQuietScene(id), `${id} stays quiet`)

// 2. Prisoner: the first arrival at vents / yard / guard after the job is taken is a glimpse, whatever the roll.
const base = newGame('prisoner')
const at = (scene: string, extra: Record<string, unknown> = {}, ticks = 30): GameState =>
  ({ ...base, hubId: 'camp04', sceneId: scene, ticks, health: 6, sap: 8, flags: { ...base.flags, ...extra } }) as GameState
ok(FORCED_GLIMPSE_SCENES.join(',') === 'camp:vents,camp:yard,camp:guard', 'forced scenes are vents, yard, guard')
for (const dest of FORCED_GLIMPSE_SCENES) {
  for (const from of ['camp:lean', 'camp:cages', 'camp:yard', 'camp:vents'].filter((f) => f !== dest)) {
    let all = true, never = true, once = true, forced = 0
    for (let t = 0; t < 40; t++) {
      const job = applyEffect(at(from, { jaxsonInside: true }, 20 + t * 7), { goto: dest, ticks: 1 })
      // An arrival that opens a fight or hunt is never his; the glimpse waits for the next one.
      if (job.flags.encounterHere || job.flags.hunterHere) { if (job.flags.maskedSeen) all = false; continue }
      if (!(job.sceneId === dest && hasGlimpse(job.flash) && job.flags.maskedSeen === 1 && !job.flags.maskedHere)) all = false
      forced++
      // Not again: once seen, the same arrival rolls normally and is never forced.
      const again = applyEffect({ ...at(from, { jaxsonInside: true, maskedSeen: 1, maskedStep: Number(job.flags.sceneSteps ?? 0) + 5 }, 20 + t * 7) }, { goto: dest, ticks: 1 })
      if (again.flags.maskedSeen !== 1) once = false
      const nojob = applyEffect(at(from, {}, 20 + t * 7), { goto: dest, ticks: 1 })
      if (nojob.flags.maskedSeen && ['camp:lean', 'camp:cages'].includes(from)) never = false
    }
    ok(all && forced >= 20, `${from} -> ${dest}: forced glimpse once the job is taken (${forced}/40, rest were fights)`)
    ok(once, `${from} -> ${dest}: only the first sighting is forced`)
    ok(never, `${from} -> ${dest}: no sighting without the job`)
  }
}
ok(!applyEffect(at('camp:lean', { jaxsonInside: true }), { goto: 'camp:bay', ticks: 1 }).flags.maskedSeen, 'other camp scenes are not forced')
// The sighting is delivered on the destination: leaving a quiet scene must not be a held masked card (UI rule is in PlayScreen).
const ui = readFileSync('src/components/PlayScreen.tsx', 'utf8')
ok(ui.includes('maskedOnQuiet') && ui.includes('!maskedOnQuiet'), 'PlayScreen skips the held card when his line leaves a quiet scene')

// 3. The opening sighting is a glimpse, in every door. The block is still a normal roll later.
for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
  let s = newGame(door)
  let opener: GameState | null = null
  const first = visibleChoices(s).find((c) => c.effects.goto) ?? visibleChoices(s)[0]
  s = applyEffect(s, first.effects)
  opener = s
  ok(!opener.flags.maskedHere, `${door}: opener never blocks`)
  ok(!opener.flags.maskedSeen || hasGlimpse(opener.flash), `${door}: an opening sighting is a glimpse line`)
  ok(!String(opener.flash ?? '').includes(MASKED_BLOCK_LINE), `${door}: opener has no block line`)
}
{
  const o = applyEffect(newGame('outcast'), visibleChoices(newGame('outcast')).find((c) => c.id === 'stand')!.effects)
  ok(o.sceneId === 'spine:ridge' && o.flags.maskedSeen === 1 && o.flags.maskedLog === 'g' && hasGlimpse(o.flash), 'Outcast opens on the ridge with a glimpse, not the block')
  ok(!o.flags.maskedHere && !o.flags.encounterHere, 'Outcast: no block, no fight on the ridge')
}
{
  // Later, the block is still a normal threat roll (Outcast ridge <-> well, not from the opening).
  let blocks = 0, glimpses = 0
  const o = newGame('outcast')
  for (let t = 0; t < 400; t++) {
    const s = { ...o, sceneId: 'spine:ridge', hubId: 'spine', ticks: 40 + t * 3, health: 6, sap: 8, items: { ...o.items, scrap: 0 }, flags: { ...o.flags, sceneSteps: 9, maskedSeen: 1 } } as GameState
    const n = applyEffect(s, { goto: 'spine:well', ticks: 1 })
    if (n.flags.maskedHere) blocks++
    if (hasGlimpse(n.flash)) glimpses++
  }
  ok(blocks > 0, `the block still happens later as a normal roll (${blocks}/400)`)
  ok(glimpses > 0, 'glimpses still happen later')
}
console.log(fails ? `v159: ${fails} failure(s)` : 'v159: all ok')
process.exit(fails ? 1 : 0)

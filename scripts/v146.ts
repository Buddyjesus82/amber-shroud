/**
 * v146: Jaxson audit. Job done -> no job offer. After Chapter One -> Jaxson is gone from Camp-04.
 *   npx tsx scripts/v146.ts
 */
import { bodyOf, interpret, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { downedNote } from '../src/game/downed.ts'
import { playCoverKey } from '../src/game/art.ts'
import { talkIntentsFor } from '../src/game/talk.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}
function at(sceneId: string, flags: Record<string, unknown>): GameState {
  const g = newGame('prisoner')
  return { ...g, hubId: 'camp04', sceneId, ticks: 40, sap: 8, health: 6, flags: { ...g.flags, noMasked: true, metOiltooth: true, ...flags } } as GameState
}
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const labels = (s: GameState) => visibleChoices(s).map((c) => `${c.label} ${c.sub ?? ''}`).join(' | ')

const DONE = { planHeard: true, jaxsonPlan: true, jaxsonInside: true, guardDown: true }
// 1. Job done: "Confirm the job" is gone; the pens no longer offer the next-bunk talk.
{
  const s = at('camp:jaxson', { ...DONE })
  ok(!ids(s).includes('have'), 'Confirm the job hidden after the station is down')
  ok(!ids(at('camp:cages', DONE)).includes('jaxson'), 'pens: no "Talk to Jaxson in the next bunk" after the job')
  ok(ids(at('camp:jaxson', { planHeard: true, jaxsonPlan: true, jaxsonInside: true })).includes('have'), 'Confirm the job still there before the station')
}
// 2. After Chapter One (every leave path, with or without the ride), Jaxson is gone from camp.
const variantsAfter = [
  { ...DONE, striderHot: true, chapter1Done: true },
  { ...DONE, chapter1Done: true },
  { planHeard: true, jaxsonPlan: true, jaxsonInside: true, chapter1Done: true },
  { chapter1Done: true },
]
for (const f of variantsAfter) {
  for (const id of ['camp:cages', 'camp:lean', 'camp:bay', 'camp:guard', 'camp:yard', 'camp:vents']) {
    const s = at(id, f)
    const body = bodyOf(s)
    const row = labels(s)
    const tag = `${id} ${JSON.stringify(f)}`
    ok(!/next bunk|Confirm the job|inside job|inside man|Cover Jaxson|under a hull|under the hull|under his skiff|hotwired and ticking|Ask about his plan/i.test(row), `${tag}: no Jaxson rows (${row})`)
    ok(!/Jaxson Vance|bunk next to you|Jaxson's skiff|"Blood-Cut," he says|Cover me/.test(body), `${tag}: no Jaxson in body`)
    ok(sceneOf(s).speaker !== 'Jaxson Vance', `${tag}: no Jaxson speaker`)
    ok(playCoverKey(s, sceneOf(s)) !== 'oiltooth' && playCoverKey(s, sceneOf(s)) !== 'hotwire', `${tag}: no Jaxson art`)
    for (const cmd of ['talk to jaxson', 'hotwire', 'confirm the job', 'ask about the plan']) {
      const n = interpret(s, cmd)
      ok(!n.sceneId.startsWith('camp:jaxson'), `${tag}: "${cmd}" does not reach Jaxson`)
      ok(!/Jaxson|brass jaw turns|He grins around the brass/.test(String(n.flags.flash ?? '') + String(n.flags.reply ?? '')) || /gone/.test(String(n.flags.flash ?? '')), `${tag}: "${cmd}" no Jaxson voice`)
    }
  }
  ok(talkIntentsFor('camp:lean', at('camp:lean', f)).length === 0, 'no Jaxson talk rules at the stall after Ch1')
  // Rescue at camp: not him after Chapter One.
  const down = at('camp:bay', { ...f, downed: true })
  ok(!/Jaxson/.test(downedNote(down)), 'downed in camp after Ch1: Jaxson does not drag you')
}
// 3. Sap-0 crisis after Chapter One: nobody named.
{
  const s = at('camp:yard', { chapter1Done: true })
  const n = interpret({ ...s, sap: 0 }, 'wait')
  const c = getScene('crisis:camp-alone', 'prisoner')
  ok(c && !/Jaxson/.test(c.body) && !c.speaker, 'crisis:camp-alone has no Jaxson')
  ok(n.sceneId !== 'crisis:camp', 'Sap-0 in camp after Ch1 does not bring Jaxson')
}
// 4. Before leaving: he is still where he was.
{
  ok(/Jaxson Vance/.test(bodyOf(at('camp:cages', {}))), 'pens before Ch1: Jaxson in the next bunk')
  ok(ids(at('camp:cages', {})).includes('jaxson'), 'pens before Ch1: talk row')
  ok(ids(at('camp:bay', DONE)).includes('hotwire'), 'bay lookout before Ch1: Cover Jaxson row')
  ok(/Jaxson/.test(downedNote(at('camp:bay', { ...DONE, downed: true }))), 'bay rescue before Ch1 still Jaxson')
  ok(getScene('maw:tuner', 'prisoner') && /Jaxson/.test(bodyOf({ ...at('maw:tuner', { chapter1Done: true }), hubId: 'redmaw' })), 'Maw Wreck after Ch1: Jaxson is there')
}
console.log(fails ? `v146: ${fails} failure(s)` : 'v146: all ok')
process.exit(fails ? 1 : 0)

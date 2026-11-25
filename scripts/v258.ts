/** v258: Ossa says the name (maw:ossa-name), gated on the day plus stillness; the card flips (Jeramie). */
import { readFileSync } from 'node:fs'
import { applyEffect, bodyOf, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { playCoverKey } from '../src/game/art.ts'
import { zafirCard } from '../src/game/zafirCard.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v258'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v258'"), 'build v258')

const REVEAL = `She checks the wind over the rim first, the same as any morning. "Zafir," she says. "Your name is Zafir." Then she goes back to the cord.\n\nYou say it once, out loud. She nods, and that is all.`
const GREETING = `She does not play the stranger anymore. "Zafir," she says, by way of hello. "I'm alive. Drink slow."`
const NAMED = 'Zafir — Ossa\u2019s Boy'

const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
/** Everything a player can read on this screen: body, buttons, sub-lines, the held flash, and the card. */
const seen = (s: GameState) => {
  const card = zafirCard(s)
  return [bodyOf(s), s.flash ?? '', ...visibleChoices(s).flatMap((c) => [c.label, c.sub ?? '', c.locked ?? '']), card.title, card.text].join('\n')
}
let route = ''
const pick = (s: GameState, id: string) => {
  const c = visibleChoices(s).find((x) => x.id === id)
  ok(c, `${route}: choice ${id} on ${s.sceneId} (have ${ids(s).join(',')})`)
  const next = applyEffect(s, c!.effects)
  if (!next.flags.ossaNamedZafir) ok(!/zafir/i.test(seen(next)), `${route}: no Zafir before the reveal on ${next.sceneId}\n${seen(next)}`)
  return next
}
/** Off the Cache Run and into the Red Maw hub, carrying every flag and item. */
const toMaw = (s: GameState): GameState =>
  ({ ...s, chapterId: undefined, sceneId: 'maw:stilt', hubId: 'redmaw', flash: undefined, flags: { ...s.flags, chapter1Done: true, chapter1EndSeen: true, rimRoadSeen: true, noMasked: true } }) as GameState

function reveal(start: GameState, label: string, dayChoice: string, stopChoice: string): GameState {
  route = label
  let s = pick(toMaw(start), 'talk')
  ok(s.sceneId === 'maw:ossa' && !ids(s).includes('name'), `${label}: no ask before the day`)
  s = pick(s, dayChoice)
  ok(s.sceneId === 'maw:ossa-day', `${label}: the day`)
  s = pick(s, stopChoice)
  ok(s.flags.ossaToldDay && s.flags.ossaStillness && s.sceneId === 'maw:stilt', `${label}: told the day, stillness kept`)
  s = pick(s, 'talk')
  ok(/The rest waits until you are ready\. Ask when you can hear it\./.test(bodyOf(s)), `${label}: old greeting before the name`)
  const btn = visibleChoices(s).find((c) => c.id === 'name')
  ok(btn && btn.label === 'Ask her the rest' && btn.sub === 'She said it waits until you ask.', `${label}: ask button, approved label and sub`)
  ok(zafirCard(s).title === 'The Shroud-Touched Orphan', `${label}: card still hidden before asking`)
  s = pick(s, 'name')
  ok(s.sceneId === 'maw:ossa-name' && s.flags.ossaNamedZafir === true, `${label}: entering the reveal sets ossaNamedZafir`)
  ok(bodyOf(s) === REVEAL, `${label}: reveal text\n${bodyOf(s)}`)
  ok(getScene('maw:ossa-name').speaker === 'Ossa' && playCoverKey(s, getScene('maw:ossa-name')) === 'beat_the_day', `${label}: Ossa speaks under The Day's painting`)
  ok(JSON.stringify(visibleChoices(s).map((c) => [c.id, c.label])) === '[["back","Give her the quiet"]]', `${label}: one exit, Give her the quiet`)
  ok(zafirCard(s).title === NAMED && zafirCard(s).state === 4 && zafirCard(s).text.startsWith('Zafir. Lean'), `${label}: card flips to ${NAMED}`)
  s = pick(s, 'back')
  ok(s.sceneId === 'maw:stilt', `${label}: back to the Stilt Shade`)
  // A road encounter can land on the walk back (Maw clock); the player can step past it.
  for (let i = 0; i < 4 && s.flags.encounterHere; i++) s = pick(s, ['enc-skip', 'enc-continue', 'enc-run'].find((id) => ids(s).includes(id)) ?? 'enc-skip')
  if (s.flags.encounterHere || s.sceneId !== 'maw:stilt') ok(false, `${label}: back in the shade after the road (${s.sceneId})`)
  s = pick(s, 'talk')
  ok(bodyOf(s) === GREETING, `${label}: greeting swaps after the name\n${bodyOf(s)}`)
  ok(!ids(s).includes('name'), `${label}: ask button gone after the name`)
  return s
}

// 1. Prisoner: stilt fix, then "Your thanks is enough" (the test), then the Maw.
{
  route = 'prisoner'
  const g = newGame('prisoner')
  let s = { ...g, sceneId: 'ch1:p-ossa', chapterId: 'cache-run', items: { ...g.items, wrench: 1 } } as GameState
  s = pick(s, 'wrench')
  ok(s.sceneId === 'ch1:ossa-fix', 'prisoner: stilt fix')
  s = pick(s, 'thanks')
  ok(s.flags.ossaStillness && s.flags.ossaGift === 'thanks' && s.sceneId === 'ch1:south-wind', 'prisoner: thanks test passed')
  const end = reveal(s, 'prisoner', 'day', 'back')
  ok(zafirCard(end).title === NAMED, 'prisoner: card stays flipped')
}

// 2. Vessel: "Stay quiet with her" at the Maw.
{
  route = 'vessel'
  const g = newGame('vessel')
  const s = { ...g, flags: { ...g.flags, ossaAlly: true, ossaMet: true } } as GameState
  const end = reveal(s, 'vessel', 'day-vessel', 'back-knot')
  ok(zafirCard(end).title === NAMED && (end.items.ossa_token ?? 0) === 1, 'vessel: card flipped, knot kept')
}

// 3. Gate: hidden without stillness, without the day, and after the name.
{
  route = 'gate'
  const at = (door: GameState['door'], flags: Record<string, unknown>) => toMaw({ ...newGame(door), sceneId: 'maw:ossa', flags: { ...newGame(door).flags, ...flags } } as GameState)
  const onOssa = (s: GameState) => ({ ...s, sceneId: 'maw:ossa' }) as GameState
  for (const door of ['prisoner', 'outcast', 'vessel'] as GameState['door'][]) {
    ok(!ids(onOssa(at(door, { ossaToldDay: true }))).includes('name'), `${door}: no button without stillness`)
    ok(!ids(onOssa(at(door, { ossaStillness: true }))).includes('name'), `${door}: no button without the day`)
    ok(ids(onOssa(at(door, { ossaStillness: true, ossaToldDay: true }))).includes('name'), `${door}: button with both`)
    ok(!ids(onOssa(at(door, { ossaStillness: true, ossaToldDay: true, ossaNamedZafir: true }))).includes('name'), `${door}: no button after the name`)
    ok(bodyOf(onOssa(at(door, { ossaToldDay: true, ossaNamedZafir: true }))) === GREETING, `${door}: greeting after the name`)
  }
}

// 4. Outcast never sees it: no stilt fix on the Outcast road, so no stillness and no day.
{
  route = 'outcast'
  for (const flags of [{}, { ossaMet: true }, { ossaAlly: true, ossaMet: true }, { ossaAlly: true, ossaMet: true, ossaKin: true, emptyShown: true }]) {
    let s = toMaw({ ...newGame('outcast'), flags: { ...newGame('outcast').flags, ...flags } } as GameState)
    s = pick(s, 'talk')
    ok(!ids(s).includes('name') && !ids(s).some((id) => id.startsWith('day')), `outcast ${JSON.stringify(flags)}: no day, no ask`)
  }
  ok(!/ossaStillness/.test(JSON.stringify(getScene('ch1:o-ossa'))), 'outcast: Kin Height has no stillness test')
}

// 5. The name lives only in the approved lines (src/game/ossaName.ts, src/game/zafirCard.ts); the v92 scene files stay Zafir-free.
{
  const named = readFileSync('src/game/ossaName.ts', 'utf8')
  ok(named.includes(REVEAL) && named.includes(GREETING), 'ossaName.ts holds the exact approved lines')
  ok((named.match(/\bZafir\b/g) ?? []).length === 3, 'no other Zafir in ossaName.ts')
  ok(getScene('maw:ossa-name').body === REVEAL && getScene('maw:ossa').variants?.some((v) => v.body === GREETING && JSON.stringify(v.if) === '{"flag":"ossaNamedZafir"}'), 'scenes use the approved lines, greeting gated on the name')
}

// 6. The reveal node is only reached through the ask.
{
  const src = readFileSync('src/game/content/redMaw.ts', 'utf8') + readFileSync('src/game/content/cacheRun.ts', 'utf8')
  ok((src.match(/goto: 'maw:ossa-name'/g) ?? []).length === 1, 'one way into the reveal')
  ok((src.match(/ossaNamedZafir: true/g) ?? []).length === 1, 'only the reveal sets ossaNamedZafir')
}

if (fails) { console.log(`v258: ${fails} FAIL`); process.exit(1) }
console.log('v258 ok')

/** v256: the player character's own card (zafirPc), four states, shown first in the Gear sheet (Jeramie). */
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, readFileSync } from 'node:fs'
import { interpret, newGame } from '../src/game/engine.ts'
import { COVER_BAND, coverBand, playCoverFile } from '../src/game/art.ts'
import { PEOPLE } from '../src/game/people.ts'
import { VARRO_CARD } from '../src/game/varroCard.ts'
import { OSSA_NAMED_ZAFIR, ZAFIR_PC_ID, zafirCard, zafirCardState } from '../src/game/zafirCard.ts'
import type { GameState } from '../src/game/types.ts'

// tsx compiles JSX in classic mode outside Vite: give the components a React global, then load them.
;(globalThis as { React?: unknown }).React = React
const { InventorySheet } = await import('../src/components/InventorySheet.tsx')

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v256'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v256'"), 'build v256')

const TITLE = 'The Shroud-Touched Orphan'
const LOOK = 'Lean and sun-dark, in road-worn gear and a road wrap. Faint amber flecks run along his jaw and the backs of his hands. They catch low light, and only someone who knows what to look for would see them. His hands are rope-scarred. He sits still while others fidget, and he watches.'
const S1 = `${LOOK}\n\nHe is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber. On every road he wakes without his past. Something stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.`
const POWER = ' The sand holds memories, and slowly they begin to answer him. Sybella notices. At their first meeting she lets one name slip: The Walking Amber.'
const S2 = S1 + POWER
const P2_OSSA = 'He is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber, found half-buried and raised by Ossa the stilt-walker. On every road he wakes without his past. Some of Ossa stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.'
const S3_NO_SYBELLA = `${LOOK}\n\n${P2_OSSA}`
const S3 = S3_NO_SYBELLA + POWER
const S4 = `Zafir. ${S3}`

const at = (door: GameState['door'], flags: Record<string, unknown>): GameState => {
  const g = newGame(door)
  return { ...g, flags: { ...g.flags, ...flags } } as GameState
}
const gear = (s: GameState) => renderToStaticMarkup(createElement(InventorySheet, { state: s, onClose: () => {}, onChange: () => {} }))

const cases: [string, Record<string, unknown>, number, string, string][] = [
  ['state 1 (start)', {}, 1, TITLE, S1],
  ['state 2 (heardWalkingAmber)', { heardWalkingAmber: true }, 2, TITLE, S2],
  ['state 3 (ossaToldDay, with Sybella)', { heardWalkingAmber: true, ossaToldDay: true }, 3, TITLE, S3],
  ['state 3 (ossaToldDay, no Sybella)', { ossaToldDay: true }, 3, TITLE, S3_NO_SYBELLA],
  ['state 4 (ossaNamedZafir)', { heardWalkingAmber: true, ossaToldDay: true, [OSSA_NAMED_ZAFIR]: true }, 4, 'Zafir — Ossa\u2019s Boy', S4],
]
for (const door of ['prisoner', 'outcast', 'vessel'] as GameState['door'][]) {
  for (const [label, flags, n, title, text] of cases) {
    const s = at(door, flags)
    const c = zafirCard(s)
    ok(c.id === ZAFIR_PC_ID && ZAFIR_PC_ID === 'zafirPc', `${door} ${label}: own id zafirPc`)
    ok(zafirCardState(s) === n && c.state === n, `${door} ${label}: state ${n} (${c.state})`)
    ok(c.title === title, `${door} ${label}: title (${c.title})`)
    ok(c.text === text, `${door} ${label}: exact approved text\n${c.text}`)
    const html = gear(s)
    ok(html.includes('data-card="zafirPc"') && html.includes(`data-card-state="${n}"`), `${door} ${label}: card shows in the Gear sheet`)
    ok(html.indexOf('data-card="zafirPc"') < html.indexOf('gear-tabs'), `${door} ${label}: card sits above the gear tabs`)
    ok(html.includes(`alt="${title.replace(/'/g, '&#x27;')}"`) || html.includes(`alt="${title}"`), `${door} ${label}: cover alt is the title`)
    ok(html.includes('covers/zafir-pc.jpg'), `${door} ${label}: card cover is zafir-pc.jpg`)
    if (n < 4) {
      ok(!/zafir/i.test(c.title + c.text), `${door} ${label}: no Zafir in title or text`)
      // Only the internal id/cover file names may carry the word; nothing a player reads or a screen reader speaks.
      const spoken = html.replace(/data-card="zafirPc"/g, '').replace(/covers\/zafir-pc\.jpg/g, '')
      ok(!/zafir/i.test(spoken), `${door} ${label}: no Zafir anywhere in the Gear sheet`)
    } else {
      ok(c.text.startsWith('Zafir. Lean') && html.includes('Zafir — Ossa'), `${door} ${label}: named card`)
    }
  }
}

// Ossa's naming flag: nothing in the game sets it yet.
{
  const src = ['src/game/engine.ts', 'src/game/content/redMaw.ts', 'src/game/content/cacheRun.ts']
  ok(src.every((p) => !readFileSync(p, 'utf8').includes(OSSA_NAMED_ZAFIR)), 'no scene sets ossaNamedZafir yet')
  ok(!('zafirPc' in PEOPLE), 'zafirPc is not an NPC "who is" entry')
}

// Cover and crop.
ok(existsSync('public/covers/zafir-pc.jpg') && playCoverFile('zafir_pc') === 'zafir-pc.jpg', 'zafir_pc cover file')
ok(JSON.stringify(coverBand('zafir_pc')) === '[0,0.9]' && JSON.stringify(COVER_BAND.zafir_pc) === '[0,0.9]', 'zafir_pc crop [0.0, 0.9]')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/zafir-pc.jpg'), 'sw caches zafir-pc.jpg')

// Varro keeps the legacy zafir id, metZafir and the bonewright cover.
{
  const v = PEOPLE.zafir
  ok(v.id === 'zafir' && v.name === 'Varro' && v.metFlag === 'metZafir', 'Varro: id, name, metFlag unchanged')
  ok(v.card.startsWith('Varro the Bone-Stitcher. The Bone-Stitcher / Seeker Deserter.'), 'Varro card unchanged')
  ok(VARRO_CARD === "The Bone-Stitcher / Seeker Deserter.\n\nHe knows where the tendons anchor and where the sap runs thickest. He'll stitch you up for two resin, but he won't look you in the eyes while he pulls the wire.", 'VARRO_CARD unchanged')
  ok(playCoverFile('zafir') === 'bonewright.jpg' && JSON.stringify(coverBand('zafir')) === '[0.08,0.78]', 'Varro cover bonewright.jpg [0.08, 0.78]')
  const t = interpret(at('prisoner', { metZafir: true, ossaToldDay: true, [OSSA_NAMED_ZAFIR]: true }), 'who is varro')
  ok(t.flash === v.card && t.flags.metZafir === true, `who is varro still gives Varro's card (${t.flash?.slice(0, 40)})`)
}

if (fails) { console.log(`v256: ${fails} FAIL`); process.exit(1) }
console.log('v256 ok')

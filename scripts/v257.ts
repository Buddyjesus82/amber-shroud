/** v257: Zafir's card flags are independent (Sybella lines wait for her), and the card is a collapsed bar in Gear (Jeramie). */
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { newGame } from '../src/game/engine.ts'
import { OSSA_NAMED_ZAFIR, zafirCard } from '../src/game/zafirCard.ts'
import type { GameState } from '../src/game/types.ts'

// tsx compiles JSX in classic mode outside Vite: give the components a React global, then load them.
;(globalThis as { React?: unknown }).React = React
const { InventorySheet } = await import('../src/components/InventorySheet.tsx')
const { PlayerCard } = await import('../src/components/PlayerCard.tsx')

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v259'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v259'"), 'build v257')

const HIDDEN = 'The Shroud-Touched Orphan'
const NAMED = 'Zafir — Ossa\u2019s Boy'
const LOOK = 'Lean and sun-dark, in road-worn gear and a road wrap. Faint amber flecks run along his jaw and the backs of his hands. They catch low light, and only someone who knows what to look for would see them. His hands are rope-scarred. He sits still while others fidget, and he watches.'
const P2 = 'He is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber. On every road he wakes without his past. Something stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.'
const P2_OSSA = 'He is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber, found half-buried and raised by Ossa the stilt-walker. On every road he wakes without his past. Some of Ossa stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.'
const POWER = ' The sand holds memories, and slowly they begin to answer him. Sybella notices. At their first meeting she lets one name slip: The Walking Amber.'

const at = (door: GameState['door'], flags: Record<string, unknown>): GameState => {
  const g = newGame(door)
  return { ...g, flags: { ...g.flags, ...flags } } as GameState
}
const esc = (t: string) => t.replace(/'/g, '&#x27;')

// 1. Every combination of heardWalkingAmber, ossaToldDay and ossaNamedZafir, on every door.
for (const door of ['prisoner', 'outcast', 'vessel'] as GameState['door'][]) {
  for (const amber of [false, true]) for (const told of [false, true]) for (const named of [false, true]) {
    const label = `${door} amber=${amber} told=${told} named=${named}`
    const c = zafirCard(at(door, { ...(amber ? { heardWalkingAmber: true } : {}), ...(told ? { ossaToldDay: true } : {}), ...(named ? { [OSSA_NAMED_ZAFIR]: true } : {}) }))
    const ossa = told || named // a name reveal implies Ossa's lines
    const want = `${named ? 'Zafir. ' : ''}${LOOK}\n\n${ossa ? P2_OSSA : P2}${amber ? POWER : ''}`
    ok(c.title === (named ? NAMED : HIDDEN), `${label}: title (${c.title})`)
    ok(c.text === want, `${label}: exact text\n${c.text}`)
    ok(c.state === (named ? 4 : told ? 3 : amber ? 2 : 1), `${label}: state ${c.state}`)
    ok(amber === c.text.includes('The sand holds memories') && amber === c.text.includes('Sybella'), `${label}: sand and Sybella lines only with heardWalkingAmber`)
    if (!named) ok(!/zafir/i.test(c.title + c.text), `${label}: no Zafir before the name reveal`)

    // 2. Gear: collapsed bar by default, labelled with the title, no Zafir leak in states 1-3.
    const html = renderToStaticMarkup(createElement(InventorySheet, { state: at(door, { ...(amber ? { heardWalkingAmber: true } : {}), ...(told ? { ossaToldDay: true } : {}), ...(named ? { [OSSA_NAMED_ZAFIR]: true } : {}) }), onClose: () => {}, onChange: () => {} }))
    const bar = html.match(/<button[^>]*class="player-bar"[^>]*>/)?.[0] ?? ''
    ok(bar.includes('aria-expanded="false"') && bar.includes(`aria-label="${esc(c.title)}"`), `${label}: collapsed bar button, title as its label (${bar})`)
    ok(/<div class="player-card"/.test(html) && !/player-card open/.test(html), `${label}: Gear opens collapsed`)
    ok(html.indexOf('player-bar') < html.indexOf('kit-sap') && html.indexOf('player-bar') < html.indexOf('gear-tabs'), `${label}: bar sits at the top, above the stats and tabs`)
    ok(/<svg class="player-chevron"[^>]*aria-hidden="true"/.test(html), `${label}: chevron is a hidden icon`)
    const barStart = html.indexOf('>', html.indexOf('class="player-bar"')) + 1
    const barInner = html.slice(barStart, html.indexOf('</button>', barStart))
    ok(barInner.replace(/<[^>]+>/g, '') === c.title.replace(/'/g, '&#x27;'), `${label}: the bar's only text is the title (${barInner.replace(/<[^>]+>/g, '')})`)
    ok(/class="player-fold"[^>]*aria-hidden="true"/.test(html) && /class="player-fold"[^>]*inert/.test(html), `${label}: folded body is hidden and inert`)
    if (!named) {
      const spoken = html.replace(/data-card="zafirPc"/g, '').replace(/covers\/zafir-pc\.jpg/g, '')
      ok(!/zafir/i.test(spoken), `${label}: no Zafir anywhere in the collapsed Gear sheet`)
    }

    // 3. Expanded.
    const open = renderToStaticMarkup(createElement(PlayerCard, { state: at(door, { ...(amber ? { heardWalkingAmber: true } : {}), ...(told ? { ossaToldDay: true } : {}), ...(named ? { [OSSA_NAMED_ZAFIR]: true } : {}) }), defaultOpen: true }))
    ok(open.includes('aria-expanded="true"') && open.includes('player-card open') && !/class="player-fold"[^>]*aria-hidden="true"/.test(open), `${label}: expanded card is open`)
    ok(open.includes(`alt="${esc(c.title)}"`) && open.includes('covers/zafir-pc.jpg'), `${label}: expanded cover`)
  }
}

// 4. CSS: the fold animates and respects reduced motion.
{
  const css = readFileSync('src/index.css', 'utf8')
  ok(/\.player-fold \{[^}]*transition: grid-template-rows/.test(css) && /\.player-card\.open \.player-fold \{[^}]*1fr/.test(css), 'fold transitions smoothly')
  ok(/prefers-reduced-motion[^{]*\{\s*\.player-fold, \.player-chevron \{ transition: none/.test(css), 'reduced motion: no fold animation')
}

if (fails) { console.log(`v257: ${fails} FAIL`); process.exit(1) }
console.log('v257 ok')

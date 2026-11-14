/** v244: a Heat gain line only says what the meter really rose. At 8: no line. 7 + 2: reads +1 (Jeramie). */
import { readFileSync } from 'node:fs'
import { applyEffect, bodyOf, newGame, timingNotice, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { GATE_ZAP_LINE } from '../src/game/downed.ts'
import { honestHeatText } from '../src/game/heatLines.ts'
import { STRAY_KILL_LINE } from '../src/game/strayLines.ts'
import type { Faction, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
void getScene

ok(readFileSync('src/version.ts', 'utf8').includes("'v244'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v244'"), 'build v244')

const has = (t: unknown, line: string) => typeof t === 'string' && t.includes(line)
const anyHeat = (t: unknown, name: string) => typeof t === 'string' && new RegExp(`${name} Heat \\+\\d`).test(t)
const withHeat = (s: GameState, f: Faction, n: number): GameState => ({ ...s, heat: { ...s.heat, [f]: n } })

// 0. The helper itself: drops a lone line cleanly, trims a sentence, keeps the other words.
ok(honestHeatText('A.\n\nCartel Heat +1.\n\nScrap +1.', { cartel: 0 }) === 'A.\n\nScrap +1.', 'helper: lone line dropped, no empty paragraph')
ok(honestHeatText('The window closes. Seeker Heat +1.', { seekers: 0 }) === 'The window closes.', 'helper: trailing sentence dropped')
ok(honestHeatText('X. Cartel Heat +2.', { cartel: 1 }) === 'X. Cartel Heat +1.', 'helper: +2 from 7 reads +1')
ok(honestHeatText('Sable Varn draws the eye. Stray Heat +1. Seeker Heat +1.', { strays: 0, seekers: 1 }) === 'Sable Varn draws the eye. Seeker Heat +1.', 'helper: per faction')
ok(honestHeatText('Seeker Heat -1.', { seekers: -1 }) === 'Seeker Heat -1.', 'helper: falls untouched')

// 1. Notice lines (noticeHeat.ts) at the Yard; at 8 the hunt still starts.
{
  const g = newGame('prisoner')
  const at = (cartel: number): GameState => ({ ...g, hubId: 'camp04', sceneId: 'camp:yard', ticks: 44, health: 6, sap: 8, heat: { ...g.heat, cartel }, items: { ...g.items, wrench: 1, scrap: 6 }, equipped: { weapon: 'wrench' }, flags: { ...g.flags, noMasked: true, jaxsonInside: true, guardDown: true } } as GameState)
  const a = timingNotice(at(7), 'rush')
  ok(a.heat.cartel === 8 && a.flash === 'You moved fast and loud. Someone noticed. Cartel Heat +1.', `notice at 7 (${a.flash})`)
  const b = timingNotice(at(8), 'stall')
  ok(b.heat.cartel === 8 && b.flash === 'You stood too long in the open. Someone noticed.' && !!b.flags.hunterHere, `notice at 8: no Heat line, hunt starts (${b.flash})`)
}

// 2. Barrow caches (heatRelief.ts) at the Siphon spur.
{
  const g = newGame('prisoner')
  const at = (cartel: number): GameState => ({ ...g, sceneId: 'ch3:siphon', hubId: 'barrow', chapterId: 'luminspire', sap: 2, heat: { ...g.heat, cartel }, items: { ...g.items, wrench: 1 }, flags: { ...g.flags, ch3Started: true, ch3Stripped: true } } as GameState)
  const pop = (s: GameState) => applyEffect(s, visibleChoices(s).find((c) => c.id === 'barrow-pop')!.effects)
  const sip = (s: GameState) => applyEffect(s, visibleChoices(s).find((c) => c.id === 'barrow-siphon')!.effects)
  const p7 = pop(at(7))
  ok(p7.heat.cartel === 8 && has(p7.flash, 'Cartel Heat +1.'), `cache pop at 7 (${p7.flash})`)
  const p8 = pop(at(8))
  ok(p8.heat.cartel === 8 && !anyHeat(p8.flash, 'Cartel') && !!p8.flash, `cache pop at 8 (${p8.flash})`)
  const s7 = sip(at(7))
  ok(s7.heat.cartel === 8 && has(s7.flash, 'Cartel Heat +1.') && !/Cartel Heat \+[23]/.test(s7.flash ?? ''), `cache siphon +2/+3 from 7 reads +1 (${s7.flash})`)
  const s8 = sip(at(8))
  ok(s8.heat.cartel === 8 && !anyHeat(s8.flash, 'Cartel'), `cache siphon at 8 (${s8.flash})`)
}

// 3. Stray Hunter kill (strayLines.ts).
{
  const o = newGame('outcast')
  const at = (strays: number): GameState => ({ ...o, sceneId: 'spine:ridge', hubId: 'spine', ticks: 40, health: 6, sap: 6, heat: { ...o.heat, strays }, flags: { ...o.flags, noMasked: true, strayHuntFight: true, encounterHere: true, encounterDone: true } } as GameState)
  const end = (s: GameState) => applyEffect(s, { unsetFlag: ['encounterHere', 'encounterDone'] })
  const a = end(at(7))
  ok(a.heat.strays === 8 && has(a.flash, STRAY_KILL_LINE), `stray kill at 7 (${a.flash})`)
  const b = end(at(8))
  ok(b.heat.strays === 8 && !anyHeat(b.flash, 'Stray'), `stray kill at 8 (${b.flash})`)
}

// 4. Maw toll fight win (+2).
{
  const g = newGame('prisoner')
  const at = (cartel: number): GameState => ({ ...g, sceneId: 'maw:ribs', hubId: 'redmaw', ticks: 40, health: 6, sap: 6, heat: { ...g.heat, cartel }, flags: { ...g.flags, noMasked: true, mawTollFight: true, encounterHere: true, encounterDone: true } } as GameState)
  const end = (s: GameState) => applyEffect(s, { unsetFlag: ['encounterHere', 'encounterDone'] })
  const a = end(at(6))
  ok(a.heat.cartel === 8 && has(a.flash, 'Cartel Heat +2.'), `toll win at 6 (${a.flash})`)
  const b = end(at(7))
  ok(b.heat.cartel === 8 && has(b.flash, 'Cartel Heat +1.') && !has(b.flash, 'Cartel Heat +2.'), `toll win +2 from 7 reads +1 (${b.flash})`)
  const c = end(at(8))
  ok(c.heat.cartel === 8 && !anyHeat(c.flash, 'Cartel') && c.flags.mawTollDone === true, `toll win at 8 (${c.flash})`)
}

// 5. Fixed scene text: Kip and Mara turned away (+1 Stray) and the Crucible overload (+2 Seeker).
{
  const g = newGame('prisoner')
  const cold = (strays: number) => {
    const s = { ...g, sceneId: 'ch2:ditch', hubId: null, heat: { ...g.heat, strays }, flags: { ...g.flags, noMasked: true } } as GameState
    return applyEffect(s, getScene('ch2:ditch').choices.find((c) => c.id === 'cold')!.effects)
  }
  const c7 = cold(7)
  ok(c7.heat.strays === 8 && has(c7.flash, 'Stray Heat +1.'), `turn away at 7 (${c7.flash})`)
  const c8 = cold(8)
  ok(c8.heat.strays === 8 && !anyHeat(c8.flash, 'Stray') && has(c8.flash, 'The Strays will hear about it.'), `turn away at 8 (${c8.flash})`)
  const v = newGame('vessel')
  const over = (seekers: number) => {
    const s = { ...v, sceneId: 'deep:crucible', hubId: null, heat: { ...v.heat, seekers }, flags: { ...v.flags, noMasked: true } } as GameState
    return applyEffect(s, getScene('deep:crucible').choices.find((c) => c.id === 'overload')!.effects)
  }
  const m6 = over(6)
  ok(m6.heat.seekers === 8 && has(m6.flash, 'Seeker Heat +2.'), `overload at 6 (${m6.flash})`)
  const m7 = over(7)
  ok(m7.heat.seekers === 8 && has(m7.flash, 'Seeker Heat +1.') && !has(m7.flash, 'Seeker Heat +2.'), `overload +2 from 7 reads +1 (${m7.flash})`)
  const m8 = over(8)
  ok(m8.heat.seekers === 8 && !anyHeat(m8.flash, 'Seeker') && has(m8.flash, 'Every lamp in the dig turns your way.'), `overload at 8 (${m8.flash})`)
  // Chapter 3 Wait: 'The window closes. Seeker Heat +1.'
  const wait = (seekers: number) => {
    const s = { ...g, sceneId: 'ch3:wagon', hubId: 'barrow', chapterId: 'luminspire', heat: { ...g.heat, seekers }, flags: { ...g.flags, ch3Started: true, ch3Stripped: true } } as GameState
    return applyEffect(s, visibleChoices(s).find((c) => c.id === 'wait')!.effects)
  }
  ok(wait(7).heat.seekers === 8 && wait(7).flash === 'The window closes. Seeker Heat +1.', `ch3 wait at 7 (${wait(7).flash})`)
  ok(wait(8).heat.seekers === 8 && wait(8).flash === 'The window closes.', `ch3 wait at 8 (${wait(8).flash})`)
}

// 6. Camp-04 gate zap (downed.ts): only its Heat sentence goes at 8.
{
  const g = newGame('prisoner')
  const out = (cartel: number) => ({ ...g, sceneId: 'ch1:leave', hubId: null, chapterId: null, ticks: 50, sap: 6, health: 3, heat: { ...g.heat, cartel }, checkpoint: { ...g, flags: { ...g.flags, chapter1Done: true } }, flags: { ...g.flags, noMasked: true, leftCamp: true, campLockdown: true, chapter1Done: true } }) as GameState
  const z7 = applyEffect(out(7), { goto: 'camp:wire' })
  ok(z7.flags.downed && z7.heat.cartel === 8 && bodyOf(z7) === GATE_ZAP_LINE, `zap at 7 (${bodyOf(z7)})`)
  const z8 = applyEffect(out(8), { goto: 'camp:wire' })
  ok(z8.flags.downed && z8.heat.cartel === 8 && bodyOf(z8) === GATE_ZAP_LINE.replace(' Cartel Heat +1.', ''), `zap at 8 (${bodyOf(z8)})`)
}

// 7. Courtyard rip (v243) still honest.
{
  const g = newGame('outcast')
  const y = (cartel: number) => withHeat({ ...g, sceneId: 'ch3:courtyard', hubId: 'barrow', chapterId: 'luminspire', sap: 4, flags: { ...g.flags, ch3Started: true, ch3Stripped: true, ch3VaultDone: true, ch3TentOpen: true, crosshavenCablesCut: true, crosshavenGateOpen: true } } as GameState, 'cartel', cartel)
  const r = (s: GameState) => applyEffect(s, visibleChoices(s).find((c) => c.id === 'rip-wreckage')!.effects)
  ok(has(r(y(7)).flash, 'Cartel Heat +1.') && !anyHeat(r(y(8)).flash, 'Cartel'), 'courtyard rip')
}

if (fails) { console.log(`v244: ${fails} failure(s)`); process.exit(1) }
console.log('v244 ok')

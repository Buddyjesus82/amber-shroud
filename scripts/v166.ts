/** v166 (updated v168): LEAD-N3X7 only at ch1:end; per-door starts; trapped resets to each door's start. npx tsx scripts/v166.ts */
import { readFileSync } from 'node:fs'
import { applyEffect, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { CH2_STARTS } from '../src/game/content/intoTheMaw.ts'
import type { GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v193'"), 'SW cache v168')
for (const d of ['prisoner', 'vessel', 'outcast'] as const) {
  const g = newGame(d)
  const atEnd = { ...g, sceneId: 'ch1:end', chapterId: 'cache-run', hubId: null, health: 6, sap: 6, flags: { ...g.flags, chapter1Done: true, chapter1EndSeen: true, noMasked: true } } as GameState
  for (const where of ['maw:rim', 'camp:yard']) {
    const t = interpret({ ...atEnd, sceneId: where }, 'lead-n3x7')
    ok(t.sceneId !== where && !!t.flags.chapter2Unlocked, `${d}: v179 code starts Ch2 from ${where}`)
  }
  let s = interpret(atEnd, ' Lead-N3x7 ')
  ok(s.sceneId === 'ch2:gate' && s.flags.chapter2Unlocked, `${d}: code opens gate`)
  s = applyEffect(s, visibleChoices(s).find((c) => c.id === 'down')!.effects)
  ok(s.sceneId === 'ch2:approach' && s.checkpoint?.sceneId === 'ch2:approach' && s.hands === 3, `${d}: start ${s.sceneId}`)
  let t = { ...s, sceneId: 'ch2:trapped' } as GameState
  t = applyEffect(t, visibleChoices(t).find((c) => c.id === 'again')!.effects)
  ok(t.sceneId === 'ch2:approach' && t.flags.chapter1Done, `${d}: trapped resets to the Approach (${t.sceneId})`)
}
console.log(fails ? `${fails} FAILED` : 'v166 ok'); process.exit(fails ? 1 : 0)

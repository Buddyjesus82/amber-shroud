/**
 * v166: Chapter Two, Into the Maw. The LEAD-N3X7 code (only at ch1:end), the Legacy Redemption box,
 * the full path to ch2:end, the trapped reset, the new covers.
 *   npx tsx scripts/v166.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { applyEffect, bodyOf, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { CH3_CODE, LEGACY_BAD } from '../src/game/content/intoTheMaw.ts'
import { chapterIndex } from '../src/game/hands.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v166'"), 'SW cache v166')
ok(readFileSync('src/version.ts', 'utf8').includes("'v166'"), 'Build label v166')

const atEnd = (): GameState => {
  const g = newGame('prisoner')
  return { ...g, sceneId: 'ch1:end', chapterId: 'cache-run', hubId: null, health: 6, sap: 6, flags: { ...g.flags, chapter1Done: true, chapter1EndSeen: true, noMasked: true } } as GameState
}
const won = (s: GameState): GameState => {
  for (let i = 0; i < 30 && s.flags.encounterHere; i++) {
    const rows = visibleChoices(s)
    const c = rows.find((x) => x.id === 'enc-fight') ?? rows.find((x) => x.id === 'enc-continue') ?? rows[0]
    if (c.id === 'enc-fight') s = { ...s, health: 9, flags: { ...s.flags, encounterHp: 1 } }
    s = applyEffect(s, c.effects)
  }
  return s
}
const go = (s: GameState, id: string): GameState => {
  const c = visibleChoices(s).find((x) => x.id === id)
  ok(c, `${s.sceneId}: choice ${id} (have ${visibleChoices(s).map((x) => x.id).join(',')})`)
  if (!c) return s
  return won(applyEffect(s, c.effects))
}

// The code does nothing anywhere but ch1:end and the Legacy box.
for (const where of ['maw:rim', 'camp:yard', 'ch1:storm']) {
  const g = { ...atEnd(), sceneId: where }
  const t = interpret(g, ' lead-n3x7 ')
  ok(t.sceneId === where && !t.flags.chapter2Unlocked, `code is a no-op at ${where} (${t.sceneId})`)
}
let s = interpret(atEnd(), '  Lead-N3x7 ')
ok(s.sceneId === 'ch2:gate' && s.flags.chapter2Unlocked, `code at ch1:end opens ch2:gate (${s.sceneId})`)

// The Legacy box on the Rim.
const rim = { ...atEnd(), sceneId: 'maw:rim', hubId: 'redmaw' } as GameState
const leg = go(rim, 'legacy')
ok(leg.sceneId === 'ch2:legacy', 'Legacy Redemption opens the box')
const bad = interpret(leg, 'OPEN-SESAME')
ok(bad.sceneId === 'ch2:legacy' && bad.flash === LEGACY_BAD, 'wrong code: LEGACY_BAD')
const good = interpret(leg, 'LEAD-N3X7')
ok(good.sceneId === 'ch2:gate' && good.flags.ch2Legacy, 'right code: through to ch2:gate')
ok(!visibleChoices({ ...rim, flags: { ...rim.flags, chapter2Unlocked: true } }).some((c) => c.id === 'legacy'), 'box gone once unlocked')

// The full path.
s = go(s, 'down')
ok(s.sceneId === 'ch2:jaws' && s.chapterId === 'into-the-maw' && s.hands === 3 && s.checkpoint?.sceneId === 'ch2:jaws', 'Jaws: chapter set, hands full, checkpoint here')
s = go(s, 'fight')
ok(s.flags.ch2Won_gate, 'beat Greg at the gate')
s = go(s, 'through'); s = go(s, 'deep'); s = go(s, 'key')
ok((s.items.spire_key ?? 0) === 1, 'took the Spire Key')
const trapBase = s
s = go(s, 'back'); s = go(s, 'reckon'); s = go(s, 'fight')
ok(s.flags.reckoningDone && (s.items.spire_key ?? 0) === 1, 'won the Reckoning, kept the Key')
s = go(s, 'on'); s = go(s, 'climb'); s = go(s, 'run'); s = go(s, 'fight')
ok(s.flags.ch2Won_valerius && (s.items.valerius_baton ?? 0) === 1 && (s.items.cipher_key ?? 0) === 1, 'beat Valerius: baton and cipher key')
s = go(s, 'unlock'); s = go(s, 'continue')
ok(s.sceneId === 'ch2:end', 'reached ch2:end')
const body = bodyOf(s)
ok(body.includes(CH3_CODE) && body.includes('ABYSS-7REE'), 'end screen shows ABYSS-7REE')
s = go(s, 'title')
ok(s.flags.chapter2Done && chapterIndex(s) === 2, 'chapter2Done raises the chapter index')

// The trapped path: collapse is gone without a key or a frequency, so the airlock stays shut.
let t = go(go(trapBase, 'back'), 'reckon')
t = go(t, 'hand')
ok(t.flags.keySurrendered && !t.items.spire_key, 'handed the Key to Greg')
t = go(go(go(t, 'on'), 'climb'), 'run')
t = go(t, 'sealed')
ok(t.sceneId === 'ch2:trapped', `trapped (${t.sceneId})`)
t = go(t, 'again')
ok(t.sceneId === 'ch2:jaws' && t.hands === 3 && t.flags.chapter1Done && !t.items.spire_key, `trapped resets to the Jaws, hands 3, Chapter One kept (${t.sceneId}, ${t.hands})`)

// Covers.
for (const k of ['greg', 'murch', 'vex'] as const) {
  ok(existsSync(`public/covers/${k}.jpg`) && playCoverFile(k) === `${k}.jpg` && sw.includes(`covers/${k}.jpg\``), `${k}.jpg wired`)
}
const cov = (id: string) => playCoverKey({ ...trapBase, sceneId: id } as never, getScene(id))
ok(cov('ch2:jaws') === 'greg' && cov('ch2:murch') === 'murch' && cov('ch2:vex') === 'vex', 'portrait scenes')

console.log(fails ? `${fails} FAILED` : 'v166 ok')
process.exit(fails ? 1 : 0)

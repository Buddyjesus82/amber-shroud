/** v172: vat-leech, hymn-moth, Kaelen never during an interrupt, Chapter Two code from the title. npx tsx scripts/v172.ts */
import { readFileSync } from 'node:fs'
import { chapterTwoFromCode, newGame, visibleChoices, interruptActive } from '../src/game/engine.ts'
import { fightStartFlags, pickEncounterKind, resolveEncounter, encounterSpec, LEECH_LINE, MOTH_LINE } from '../src/game/encounter.ts'
import { isChapterTwoCode } from '../src/game/ch2.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v176'"), 'SW cache v172')
ok(readFileSync('src/version.ts', 'utf8').includes("'v176'"), 'Build label v172')
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes('covers/vat-leech.jpg') && sw.includes('covers/hymn-moth.jpg'), 'covers precached')
const kinds = (sceneId: string, hubId: string | null, door: 'prisoner' | 'vessel' = 'prisoner') => {
  const seen = new Set<string>()
  const b = newGame(door)
  for (let t = 0; t < 400; t++) seen.add(pickEncounterKind({ ...b, sceneId, hubId, ticks: t, pressure: t % 5 }))
  return seen
}
ok(kinds('camp:yard', 'camp04').has('leech') && kinds('camp:vats', 'camp04').has('leech'), 'leech at yard/vats')
ok(!kinds('camp:wire', 'camp04').has('leech'), 'no leech at the Wire')
ok(kinds('thresh:paddock', 'threshold').has('moth') && kinds('ch1:v-hymn', null, 'vessel').has('moth'), 'moth on Seeker ground')
ok(!kinds('camp:yard', 'camp04').has('moth') && !kinds('spine:ridge', 'spine').has('leech'), 'no cross-ground')
const fight = (kind: 'leech' | 'moth', extra: object = {}) => {
  const b = { ...newGame('prisoner'), sceneId: 'camp:yard', hubId: 'camp04', ...extra } as any
  return { ...b, flags: { ...b.flags, ...fightStartFlags(b, kind) } }
}
const L = encounterSpec(fight('leech')), M = encounterSpec(fight('moth'))
ok(L.strike === 2 && L.shell === 1 && L.hp === 3 && L.line === LEECH_LINE, 'leech stats')
ok(M.strike === 2 && M.shell === 0 && M.hp === 3 && M.line === MOTH_LINE, 'moth stats')
let leechDrank = false, mothLulled = false, mothHealth = false
for (let t = 0; t < 60; t++) {
  const r = resolveEncounter({ ...fight('leech'), ticks: t }, 'fight')
  if (r.fx.sap === -1 && (r.fx.health ?? 0) < 0) leechDrank = true
  const m = resolveEncounter({ ...fight('moth'), ticks: t }, 'fight')
  if ((m.fx.sap ?? 0) < 0) mothLulled = true
  if ((m.fx.health ?? 0) < 0) mothHealth = true
}
ok(leechDrank, 'leech hit takes 1 Sap'); ok(mothLulled && !mothHealth, 'moth takes Sap, not Health')
// Kaelen
const k = { ...newGame('prisoner'), sceneId: 'camp:yard', hubId: 'camp04' } as any
k.flags = { ...k.flags, kaelenPassing: true }
const ids = (s: any) => (visibleChoices as any)(s).map((c: any) => c.id) as string[]
ok(ids(k).includes('kaelen-pass'), 'Kaelen passes on a quiet place')
for (const fl of ['hunterHere', 'strayHunterHere', 'maskedHere']) {
  const s = { ...k, flags: { ...k.flags, [fl]: true } }
  ok(interruptActive(s), `${fl} is an interrupt`)
}
ok(!ids(fight('leech', { flags: { ...k.flags } })).includes('kaelen-pass'), 'no Kaelen in a fight')
ok(interruptActive({ ...k, sceneId: 'crisis:spine' }), 'crisis is an interrupt')
// Chapter Two code
ok(isChapterTwoCode(' lead-n3x7 ') && !isChapterTwoCode('ABYSS-7REE'), 'Ch2 code any case')
for (const d of ['prisoner', 'vessel', 'outcast'] as const) {
  const s = chapterTwoFromCode(d)
  ok(s.sceneId === 'ch2:gate' && s.door === d && s.flags.chapter1Done && s.flags.chapter2Unlocked, `${d} code start at gate`)
}
const t = readFileSync('src/components/TitleScreen.tsx', 'utf8')
ok(t.includes('Chapter code') && readFileSync('src/App.tsx', 'utf8').includes('chapterTwoFromCode'), 'title code box wired')
if (fails) { console.log(`v172: ${fails} fail`); process.exit(1) } else console.log('v172 ok')

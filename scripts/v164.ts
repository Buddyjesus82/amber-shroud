/**
 * v164: the far-rise cover. His far-off glimpse lines (and the interrupt) show a small hooded figure on a ridge;
 * every other line of his keeps the close portrait, and a close line wins if both are in the flash.
 *   npx tsx scripts/v164.ts
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { COVER_BAND, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { newGame } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import * as M from '../src/game/masked.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v178'"), 'SW cache v167')
ok(readFileSync('src/version.ts', 'utf8').includes("'v178'"), 'Build label v168')

// The file: 960x540 JPEG, cover-sized, precached.
const buf = readFileSync('public/covers/masked-far.jpg')
ok(buf[0] === 0xff && buf[1] === 0xd8, 'masked-far.jpg is a JPEG')
let w = 0, h = 0
for (let i = 2; i < buf.length - 9; ) {
  if (buf[i] !== 0xff) { i++; continue }
  const m = buf[i + 1]
  if (m >= 0xc0 && m <= 0xc2) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break }
  i += 2 + buf.readUInt16BE(i + 2)
}
ok(w === 960 && h === 540, `masked-far.jpg is 960x540 (got ${w}x${h})`)
ok(statSync('public/covers/masked-far.jpg').size < 160_000, 'masked-far.jpg under 160 KB')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/masked-far.jpg`'), 'masked-far.jpg precached')
ok(playCoverFile('masked_far') === 'masked-far.jpg' && existsSync('public/covers/masked-far.jpg'), 'masked_far maps to the file')
const [top, bot] = COVER_BAND.masked_far
ok(top >= 0 && bot > top && bot <= 0.7, 'masked_far band keeps the figure (0.36-0.46) and the crest above the panel')
ok(COVER_BAND.masked_far[1] >= 0.5, 'band reaches below the figure')

// The helper: far lines -> far cover, everything else -> portrait, close wins.
const FAR = [M.MASKED_GLIMPSE_LINE, ...M.MASKED_GLIMPSE_LINES_EXTRA, M.MASKED_INTERRUPT_LINE]
ok(FAR.length === 4, 'four far-off lines')
ok(M.MASKED_GLIMPSE_LINES_EXTRA.some((l) => l.includes('far rise')), 'the far-rise line is one of them')
const CLOSE = [M.MASKED_BOOTS_LINE, M.MASKED_FLAKE_LINE, M.MASKED_DROP_LINE, M.MASKED_BLOCK_LINE, M.MASKED_TOLL_LINE, M.MASKED_STRIKE_LINE, M.MASKED_WALKS_OFF_LINE, M.MASKED_CHASE_LINE, M.MASKED_WAIT_LINE]
for (const l of FAR) ok(M.maskedCoverKey(l) === 'masked_far' && M.isMaskedFlash(l), `far: ${l.slice(0, 30)}`)
for (const l of CLOSE) ok(M.maskedCoverKey(l) === 'masked_figure' && M.isMaskedFlash(l), `close: ${l.slice(0, 30)}`)
for (const f of FAR) for (const c of CLOSE) ok(M.maskedCoverKey(`${f} ${c}`) === 'masked_figure', 'a close line wins over a far one')
ok(M.maskedCoverKey(`He took a thing. ${FAR[2]}`) === 'masked_far', 'a far line after other text still counts')
ok(M.maskedCoverKey(undefined) === 'masked_figure' && M.maskedCoverKey('') === 'masked_figure', 'no flash: portrait (never read)')

// The screen: a far line on First Drop / any scene picks the far cover; the block flag and a masked fight keep the portrait.
for (const door of ['prisoner', 'outcast', 'vessel'] as const) {
  const g = newGame(door)
  for (const l of FAR) ok(playCoverKey({ ...g, flash: l }, getScene(g.sceneId)) === 'masked_far', `${door}: far line -> far cover`)
  ok(playCoverKey({ ...g, flash: M.MASKED_TOLL_LINE }, getScene(g.sceneId)) === 'masked_figure', `${door}: toll -> portrait`)
  ok(playCoverKey({ ...g, flash: FAR[2], flags: { ...g.flags, maskedHere: true } }, getScene(g.sceneId)) === 'masked_figure', `${door}: block flag -> portrait`)
  ok(playCoverKey({ ...g, flags: { ...g.flags, encounterHere: true, encounterKind: 'masked' } }, getScene(g.sceneId)) === 'masked_figure', `${door}: masked fight -> portrait`)
}

// The held screen (the First Drop case) uses the same helper, not the old portrait constant.
const ps = readFileSync('src/components/PlayScreen.tsx', 'utf8')
ok(ps.includes('maskedCoverKey') && !ps.includes('MASKED_ART') && !ps.includes('MASKED_BAND'), 'PlayScreen picks the held cover by line')
ok(ps.includes('maskedArt(next.flash).art') && ps.includes('maskedArt(next.flash).band'), 'held art and band both follow the line')

console.log(fails ? `${fails} FAILED` : 'v164 ok')
process.exit(fails ? 1 : 0)

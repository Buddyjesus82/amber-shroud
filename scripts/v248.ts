/** v248: keep Sable's head in frame on phones. Mirrors the .scene-img band math in index.css. */
import { readFileSync } from 'node:fs'
import { COVER_BAND, coverBand } from '../src/game/art.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v252'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v252'"), 'build v252')

/** Fraction of the cover hidden above the art frame, for a stage of width w and height h (px). */
function hiddenTop(key: Parameters<typeof coverBand>[0], w: number, h: number): number {
  const [top, bot] = coverBand(key)
  const full = 0.5625 * w
  const storyTop = Math.min(full * bot, h / 2)
  const win = storyTop + 11.2 // 0.7rem
  const imgH = Math.min(full, win / (bot - top))
  const offset = Math.min(0, win - bot * imgH)
  return -offset / imgH
}

// Her hair starts about 5% down the cover (27 of 540 px).
const HEAD = 27 / 540
const [t, b] = coverBand('p1_sable_tent')
ok(t === 0.02 && b === 0.92, 'Sable band is [0.02, 0.92]')

let worst = 0
for (const w of [320, 360, 375, 390, 414, 430, 844, 932]) {
  for (let h = 120; h <= 900; h += 10) worst = Math.max(worst, hiddenTop('p1_sable_tent', w, h))
}
ok(worst <= 0.02 + 1e-9 && worst < HEAD, `Sable: at most ${worst.toFixed(3)} hidden above, head at ${HEAD.toFixed(3)}`)
// 390x844 portrait: tall stage shows the whole top; a short stage (choices take the room) hid 12% before.
ok(hiddenTop('p1_sable_tent', 390, 500) === 0, '390 wide, tall stage: nothing hidden')
ok(hiddenTop('p1_sable_tent', 390, 300) < HEAD, '390 wide, short stage: head in frame')
ok(Math.abs(((0.92 * Math.min(219.375, 161.2 / 0.8)) - 161.2) / Math.min(219.375, 161.2 / 0.8) - 0.12) < 1e-9, 'the old 0.12 band hid 12% on that stage')

// Only Sable's band moved.
const art = readFileSync('src/game/art.ts', 'utf8')
ok(art.includes('p1_sable_tent: [0.02, 0.92]') && !art.includes('p1_sable_tent: [0.12'), 'one Sable band entry')
ok(COVER_BAND.p1_skimmer[0] === 0.08 && COVER_BAND.courtguard[0] === 0.05, 'neighbours unchanged')

if (fails) { console.log(`v248: ${fails} failure(s)`); process.exit(1) }
console.log('v248 ok')

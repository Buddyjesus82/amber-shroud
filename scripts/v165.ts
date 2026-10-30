/**
 * v165: Sybella's first appearance (ch1:south-wind) on the Outcast road shows her bone-white skiff on the Bone Wash,
 * not the camp dock art. Prisoner / Vessel keep their road art; Skiff Bay keeps its own.
 *   npx tsx scripts/v165.ts
 */
import { readFileSync, statSync } from 'node:fs'
import { COVER_BAND, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { newGame } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v169'"), 'SW cache v167')
ok(readFileSync('src/version.ts', 'utf8').includes("'v169'"), 'Build label v168')

const buf = readFileSync('public/covers/south-wind.jpg')
let w = 0, h = 0
for (let i = 2; i < buf.length - 9; ) {
  if (buf[i] !== 0xff) { i++; continue }
  const m = buf[i + 1]
  if (m >= 0xc0 && m <= 0xc2) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break }
  i += 2 + buf.readUInt16BE(i + 2)
}
ok(buf[0] === 0xff && buf[1] === 0xd8 && w === 960 && h === 540, `south-wind.jpg is a 960x540 JPEG (${w}x${h})`)
ok(statSync('public/covers/south-wind.jpg').size < 160_000, 'south-wind.jpg under 160 KB')
ok(sw.includes('covers/south-wind.jpg`'), 'south-wind.jpg precached')
ok(playCoverFile('south_wind') === 'south-wind.jpg', 'south_wind maps to the file')
const [top, bot] = COVER_BAND.south_wind
ok(top <= 0.1 && bot >= 0.72 && bot <= 0.8, 'band keeps the crane top and the runners above the panel')

const sc = getScene('ch1:south-wind')
const at = (door: 'prisoner' | 'outcast' | 'vessel') => playCoverKey({ ...newGame(door), chapterId: 'cache-run', sceneId: 'ch1:south-wind', hubId: undefined } as never, sc)
ok(at('outcast') === 'south_wind', 'Outcast: the skiff on the Bone Wash')
ok(at('prisoner') === 'rim_gullet', 'Prisoner unchanged')
ok(at('vessel') === 'rim_pilgrims_scar', 'Vessel unchanged')
ok(playCoverKey({ ...newGame('prisoner'), sceneId: 'camp:bay', hubId: 'camp04' } as never, getScene('camp:bay')) === 'skiff_bay_docks', 'Skiff Bay keeps the dock art')

console.log(fails ? `${fails} FAILED` : 'v165 ok')
process.exit(fails ? 1 : 0)

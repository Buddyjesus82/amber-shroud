/** v201: Jeramie's Great Bleed map on the intro's first slide. npx tsx scripts/v201.ts */
import { readFileSync, existsSync } from 'node:fs'
import { INTRO_CARDS } from '../src/game/intro.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const sw = readFileSync('public/sw.js', 'utf8')
ok(sw.includes("CACHE = 'amber-shroud-v220'"), 'SW cache v201')
ok(sw.includes('intro/great-bleed.jpg'), 'map precached')
ok(readFileSync('src/version.ts', 'utf8').includes("'v220'"), 'Build v201')
ok(existsSync('public/intro/great-bleed.jpg'), 'map file')
ok(INTRO_CARDS.length === 6, 'still six slides')
const w = INTRO_CARDS[0]
ok(w.id === 'world' && w.img === 'great-bleed.jpg' && w.tall, 'world slide shows the map, tall')
ok(w.title === 'The Amber Shroud' && w.text.startsWith('The sand is ground amber') && w.text.endsWith('the only way to the Spire.'), 'intro text unchanged')
const css = readFileSync('src/index.css', 'utf8')
ok(css.includes('.intro-tall .intro-art .intro-img') && /intro-tall\.on \.intro-img[\s\S]{0,80}animation: none/.test(css), 'contain, no pan/zoom')
console.log(fails ? `${fails} FAIL` : 'v201 OK')
process.exit(fails ? 1 : 0)

/** v170: Chapter Two scene art, each scene its own cover. npx tsx scripts/v170.ts */
import { readFileSync, existsSync } from 'node:fs'
import { getScene } from '../src/game/content/index.ts'
import { playCoverKey, playCoverFile, coverBand } from '../src/game/art.ts'
import { newGame } from '../src/game/engine.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v175'"), 'SW cache v170')
ok(readFileSync('src/version.ts', 'utf8').includes("'v175'"), 'Build label v170')
const seen = new Set<string>()
for (const n of ['p-supply', 'p-drillrun', 'survivor', 'approach', 'ditch', 'gully', 'irongut', 'ribs', 'vein', 'cache', 'heart', 'trapped', 'end', 'gate']) {
  const sc = getScene(`ch2:${n}`)
  const st = { ...newGame('prisoner'), sceneId: sc.id }
  const k = playCoverKey(st, sc), f = playCoverFile(k)
  ok(f === `ch2-${n}.jpg` && existsSync(`public/covers/${f}`) && !seen.has(f), `ch2:${n} has its own art (${f})`)
  ok(readFileSync('public/sw.js', 'utf8').includes(`covers/ch2-${n}.jpg`), `sw precaches ch2-${n}`)
  ok(coverBand(k)[1] > coverBand(k)[0], `band ${n}`)
  seen.add(f)
}
console.log(fails ? `${fails} FAILED` : 'v170 ok'); process.exit(fails ? 1 : 0)

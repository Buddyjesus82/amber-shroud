/** v167: Miller's horn speech at the Jaws; the skiff alarm is one blast then two. npx tsx scripts/v167.ts */
import { readFileSync } from 'node:fs'
import { getScene } from '../src/game/content/index.ts'
import { MILLER_TURRETS } from '../src/game/content/intoTheMaw.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v172'"), 'SW cache v167')
ok(readFileSync('src/version.ts', 'utf8').includes("'v172'"), 'Build label v168')
const body = String(getScene('ch2:p-jaws').body)
ok(body.includes('The heavy horn atop the barge pops with static, followed by a long, low whistle that echoes off the canyon walls.'), 'horn narration')
ok(body.includes(`"Greg! Tell that runner down in the dirt to stop staring up at my brass. The price is fifteen scraps or two vials of refined sap—no credit, no speeches. If they haven't dropped the weight into the bucket by the count of three... paint the sand with 'em and haul their skiff to the scrap heap."`), 'horn line word for word')
ok(body.indexOf('pops with static') > 0, 'horn in the Jaws (v168 route opens on the Gullet first)')
ok(/blasts once: a warning\. Then a second blast\./.test(MILLER_TURRETS) && MILLER_TURRETS.includes('Wake the turrets'), 'one blast warns, two fire')
console.log(fails ? `${fails} FAILED` : 'v167 ok'); process.exit(fails ? 1 : 0)

/** v171: Greg's toll scene, siphon at ch1:end, hunt card line, Valerius node cooldown, Spine/Outcast rescues. npx tsx scripts/v171.ts */
import { readFileSync } from 'node:fs'
import { getScene } from '../src/game/content/index.ts'
import { newGame, visibleChoices } from '../src/game/engine.ts'
import { campHuntIsValerius } from '../src/game/valeriusRest.ts'
import { HUNT_CORNERED_LOCK } from '../src/game/hunter.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const J = (x: unknown) => JSON.stringify(x)
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v191'"), 'SW cache v171')
ok(readFileSync('src/version.ts', 'utf8').includes("'v191'"), 'Build label v171')
const ap = J(getScene('ch2:approach').choices)
ok(ap.includes('ch2:greg-toll') && !ap.includes('memory_siphon'), 'gate -> greg-toll, no stash on approach')
const t = getScene('ch2:greg-toll')
ok(String(t.body).includes('fifteen scraps or two vials of refined sap'), 'toll speech verbatim')
const tc = J(t.choices)
for (const s of ["Here's your iron", 'drop the latch', 'haul skiff', 'delayed her run', "Ossa's", 'tollgate', 'tollguard', 'ch2:p-haul']) ok(tc.includes(s), `toll has ${s}`)
const src = readFileSync('src/game/content/intoTheMaw.ts', 'utf8')
ok(!src.includes('TOLL_PAID') && !src.includes("label: 'Pay the toll'"), 'old toll rows gone')
const vis = (door: 'prisoner' | 'vessel' | 'outcast', extra = {}) => {
  const st = { ...newGame(door), sceneId: 'ch2:greg-toll', hubId: 'redmaw', ...extra }
  return (visibleChoices as any)(st).map((c: any) => c.id) as string[]
}
try {
  const p = vis('prisoner'), v = vis('vessel')
  ok(p.includes('skiff') && !p.includes('sybella') && p.includes('iron'), 'prisoner rows')
  ok(!v.includes('skiff') && v.includes('sybella') && !v.includes('knot'), 'vessel rows')
} catch (e) { ok(false, `visibleChoices ${e}`) }
ok(J(getScene('ch1:end').choices).includes('memory_siphon'), 'siphon at ch1:end')
ok(HUNT_CORNERED_LOCK === 'The hunt is close, but the dunes still offer a gap.', 'hunt card line')
const base = newGame('prisoner')
const hot = { ...base, heat: { ...base.heat, cartel: 7 } }
ok(campHuntIsValerius(hot), 'Valerius at Cartel 7')
ok(!campHuntIsValerius({ ...hot, flags: { ...hot.flags, valeriusNodes: 2 } }), 'handler while node cooldown')
ok(campHuntIsValerius({ ...hot, flags: { ...hot.flags, valeriusNodes: 3 } }), 'Valerius after 3 nodes')
const sa = J(getScene('crisis:spine-again'))
ok(sa.includes('vial_empty') && sa.includes('"sap":2') && !sa.includes('First Drop'), 'Spine rescue either/or, no voice')
const maw = J(getScene('crisis:maw').choices)
ok(maw.includes('"scrap":2') && maw.includes('outcastRescued'), 'later Outcast rescue -2 scrap -1 sap')
ok(J(getScene('crisis:spine').choices).includes('outcastRescued'), 'Noon sets outcastRescued')
console.log(fails ? `${fails} FAILED` : 'v171 ok'); process.exit(fails ? 1 : 0)

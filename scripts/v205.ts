/** v205 DRAFT: the party. npx tsx scripts/v205.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { fightStartFlags, resolveEncounter } from '../src/game/encounter.ts'
import { strayHunterArrives } from '../src/game/strayHunter.ts'
import { STRAY_HUNT_HEAT } from '../src/game/strayHunter.ts'
import { companionOf, dismissCompanion, keltStep, LINES, sneakOdds } from '../src/game/companions.ts'
import { CONDUITS_SPOTTED, MANIFEST_SPOTTED } from '../src/game/content/phase1Camps.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const at = (door: string, sceneId: string, extra: Partial<GameState> = {}): GameState => { const g = newGame(door as never); return { ...g, sceneId, ...extra, flags: { noMasked: true, ...(extra.flags ?? {}) } } as GameState }
const pick = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const go = (s: GameState, id: string) => { const c = pick(s, id); if (!c) throw new Error(`no choice ${id} at ${s.sceneId}`); return applyEffect(s, c.effects) }

// Orla: Prisoner, Logging Deck -> her scrap heap. A ration or the duty manifest (consumed).
let p = at('prisoner', 'camp:log-deck', { sap: 6 })
p = go(p, 'orla')
ok(p.sceneId === 'camp:orla' && getScene('camp:orla').body.startsWith('A figure crouches behind a stack of rusted skiff plating'), 'orla scene')
ok(pick(p, 'orla_ration')?.sub === 'Cost: 1× seeker_ration. Adds Orla Lusk to party.', 'orla ration sub (t1044u)')
p = { ...p, items: { ...p.items, cartel_pass: 1 } }
p = go(p, 'orla_pass')
ok(companionOf(p)?.id === 'orla' && p.flags.companionHp === 4 && !p.items.cartel_pass, 'orla joins 4 hp, manifest consumed')
ok(p.flash?.includes("Where'd you lift this?") && p.flash.includes('Orla Lusk joins the party.'), 'orla reply + join line')
ok(!pick(p, 'orla'), 'orla hidden once in party')
ok(sneakOdds(p, { odds: 4, spotted: CONDUITS_SPOTTED }) === 3 && sneakOdds(p, { odds: 4, spotted: MANIFEST_SPOTTED }) === 4, 'orla sneak -1 on conduits only')
const alone = go(go(at('prisoner', 'camp:log-deck'), 'orla'), 'orla_alone')
ok(alone.flash === '"Your funeral. Watch the tripwires near the bay."' && !companionOf(alone), 'move alone')

// Hester: Outcast, Dust-Eye ledge. Free at Stray Heat <= 2, else 2 Sap. Stray Heat -1 once.
let o = at('outcast', 'spine:dusteye', { sap: 6 })
o = go({ ...o, heat: { ...o.heat, strays: 2 } }, 'hester')
ok(pick(o, 'hester_free') && !pick(o, 'hester_pay'), 'hester vouch at heat 2')
o = go(o, 'hester_free')
ok(companionOf(o)?.id === 'hester' && o.heat.strays === 1 && o.sceneId === 'spine:dusteye', 'hester joins, Stray -1')
const o2 = at('outcast', 'spine:dusteye', { sap: 6 })
const hot = go({ ...o2, heat: { ...o2.heat, strays: 4 } }, 'hester')
ok(!pick(hot, 'hester_free') && pick(hot, 'hester_pay')?.label === 'Pay Vouch Toll', 'hester toll at heat 4')
ok(go(hot, 'hester_pay').sap === 4, 'hester costs 2 Sap')
const road = (s: GameState, strays: number, mate?: string) => ({ ...s, chapterId: 'cache-run', sceneId: 'ch1:o-noon', heat: { ...s.heat, strays }, flags: { ...s.flags, ...(mate ? { companion: mate } : { companion: undefined }) } }) as GameState
const before = { ...road(o2, 0), sceneId: 'ch1:leave' } as GameState
{ const [a, b, c] = [strayHunterArrives(before, road(o2, STRAY_HUNT_HEAT)), strayHunterArrives(before, road(o2, STRAY_HUNT_HEAT, 'hester')), strayHunterArrives(before, road(o2, STRAY_HUNT_HEAT + 1, 'hester'))]; ok(a && !b && c, 'hester +1 hunt heat') }

// Sable: two waves back to back, then she asks to come. Refusing locks the node.
let sb = go(at('outcast', 'spine:shattered', { flags: { ...o.flags, noMasked: true } }), 'sable')
ok(pick(sb, 'sable_stand')?.sub === 'Draw your weapon. A hard fight: two waves of Stray Collectors (3/1/2 back-to-back).', 'sable sub (t1044u)')
sb = go(sb, 'sable_stand')
ok(sb.flags.encounterKind === 'sablewave' && sb.flags.encounterHp === 2, 'wave 1 open 3/1/2')
for (let i = 0; i < 30 && sb.flags.encounterHere && !sb.flags.sableWon && sb.health > 0; i++) {
  sb = { ...sb, health: sb.healthMax }
  const r = resolveEncounter(sb, 'fight'); sb = applyEffect(sb, r.fx)
  if (i === 0 || sb.flags.sableWave === 2) { /* keep */ }
}
ok(sb.flags.sableWon && sb.flags.sableWave === 2, 'both waves down')
ok(String(sb.flags.encounterClash).includes('Nice footwork.'), 'sable win line'); sb = go(sb, 'enc-continue')
ok(pick(sb, 'sable_recruit'), 'sable recruit after win')
// Played through the rows (Fight / On.), wave 2 opens and the win sticks: no loop back to Stand Together.
{ let u = go(at('prisoner', 'spine:sable', { health: 6 }), 'sable_stand')
  for (let i = 0; i < 40 && !u.flags.sableWon; i++) { u = { ...u, health: u.healthMax }; u = go(u, pick(u, 'enc-continue') ? 'enc-continue' : 'enc-fight') }
  ok(u.flags.sableWon && String(u.flags.encounterClash).includes('Nice footwork.'), 'row path wins both waves')
  u = go(u, 'enc-continue'); ok(pick(u, 'sable_recruit') && !pick(u, 'sable_stand') && !pick(u, 'sable_refuse'), 'no loop, no coward after a win') }
const ref = go(go(at('outcast', 'spine:shattered'), 'sable'), 'sable_refuse')
ok(ref.flags.sableRefused && !pick(ref, 'sable'), 'refuse locks')

// Swap: recruiting a second asks to swap and says who leaves.
const sw = { ...at('outcast', 'spine:sable'), flags: { ...o.flags, sableWon: true } } as GameState
ok(pick(sw, 'sable_recruit')?.sub?.endsWith('Swaps out Hester Ellery.'), 'swap sub')
const sw2 = go(sw, 'sable_recruit')
ok(companionOf(sw2)?.id === 'sable' && sw2.flash?.includes('Hester Ellery leaves the party.'), 'swap done')
ok(dismissCompanion(sw2).flags.companion === undefined, 'dismiss')

// Fight: Hester's row, her hit after yours, Guard Duty.
const fightAt = (s: GameState, kind: string) => ({ ...s, flags: { ...s.flags, ...fightStartFlags(s, kind as never) } }) as GameState
let f = fightAt({ ...o, sceneId: 'spine:shattered' }, 'collector')
const r = resolveEncounter(f, 'fight')
const card = String(r.fx.flag?.encounterClash ?? r.flash)
ok(card.includes('HESTER ELLERY ♥'), 'companion stat row')
ok(card.includes('Hester Ellery hits'), 'companion hit line')
const iYou = card.indexOf('You hit'), iMate = card.indexOf('Hester Ellery hits')
ok(iYou < 0 || iYou < iMate, 'companion hits after you')
if (card.includes('Guard Duty')) ok(r.fx.flag?.companionHp === 4, 'guard duty costs her 1')

// Sable: Lens Beam on round 2.
f = fightAt({ ...sw2, sceneId: 'spine:shattered' }, 'collector')
const r2 = resolveEncounter({ ...f, flags: { ...f.flags, encounterRound: 1 } }, 'guard')
ok(String(r2.fx.flag?.encounterClash ?? r2.flash).includes(LINES.lens), 'lens beam round 2')

// Kelt: as-is, path Breach -> Sub-Drain -> Oasis is 2 scenes.
let v = at('vessel', 'thresh:conduits', { sap: 5 })
ok(pick(v, 'breach') && !pick(v, 'subdrain'), 'breach shows, sub-drain hidden')
v = go(v, 'breach')
ok(v.sceneId === 'thresh:breach' && getScene('thresh:breach').body.includes('rust-caked drain pipe'), 'breach scene')
ok(pick(v, 'escort')?.sub === "Spend 1× Sap to stabilize his breath. Adds Kelt's Runner to party. Sets Health to 3, Timer to 6 scenes.", 'escort sub verbatim'); ok(pick(v, 'escort')?.label === 'Stabilize Wounds', 'escort label')
ok(pick(v, 'as_is')?.sub === "Take him as-is. Adds Kelt's Runner to party. Sets Health to 2, Timer to 4 scenes.", 'as-is sub verbatim')
v = go(v, 'as_is')
ok(companionOf(v)?.id === 'kelt' && v.flags.companionHp === 2 && v.flags.keltMax === 4, 'kelt joins 2/4')
ok(sneakOdds(v, { odds: 4, spotted: MANIFEST_SPOTTED }) === 3, 'kelt sneak -1')
v = go(v, 'subdrain')
ok(v.flags.keltScenes === 1, 'tick 1')
const sap0 = v.sap
v = go(v, 'oasis')
ok(v.sceneId === 'thresh:oasis' && v.flags.keltStatus === 'completed' && v.sap === sap0 + 10, 'oasis reward +10 Sap')
ok(v.flash?.includes(LINES.keltArrive) && !companionOf(v), 'arrival line, he stays')
ok(pick(v, 'runner') && pick(at('vessel', 'thresh:conduits', { flags: v.flags }), 'subdrain'), 'oasis persists')

// Kelt: the timer runs out.
let k = { ...at('vessel', 'thresh:breach'), flags: { companion: 'kelt', companionHp: 2, keltStatus: 'active', keltScenes: 1, keltMax: 4 } } as GameState
k = keltStep(k, { ...k, sceneId: 'thresh:subdrain' })
ok(k.flags.companionHp === 1 && k.flash?.includes(LINES.keltTick), 'tick banner at 1')
k = keltStep(k, { ...k, sceneId: 'thresh:conduits' })
k = keltStep(k, { ...k, sceneId: 'thresh:subdrain' })
ok(k.flags.keltStatus === 'failed' && k.items.damaged_data_cylinder === 1 && k.flash?.includes(LINES.keltFail) && k.flash.includes('Event Failed'), 'kelt fails')

// Pry.
const pr = go(go(at('vessel', 'thresh:conduits'), 'breach'), 'pry')
ok(pr.items.sealed_data_cylinder === 1 && pr.flags.keltStatus === 'failed', 'pry')

ok(readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v219'") && readFileSync('src/version.ts', 'utf8').includes("'v219'"), 'v205 bump')
console.log(fails ? `v205: ${fails} FAIL` : 'v205: all ok')
process.exit(fails ? 1 : 0)

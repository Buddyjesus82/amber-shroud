/** v207: tester fix batch (Prisoner seal, Vessel loops, Outcast Stray Hunter, shared). npx tsx scripts/v207.ts */
import { applyEffect, newGame, visibleChoices, restAllowed, VALERIUS_FOOT } from '../src/game/engine.ts'
import { encounterCard, fightStartFlags, resolveEncounter, UNARMED_LOW_WARN } from '../src/game/encounter.ts'
import { downedNote } from '../src/game/downed.ts'
import { STRAY_OUTCAST_LINE, STRAY_CUT_LINE, strayHuntChoices } from '../src/game/strayHunter.ts'
import { offersFor, vendorFor } from '../src/game/trade.ts'
import { kaelenNamed, shownText } from '../src/game/roads.ts'
import { SHAFT_FOOT_CLEAR } from '../src/game/content/intoTheMaw.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'
import { readFileSync } from 'node:fs'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const at = (door: string, sceneId: string, extra: Partial<GameState> = {}): GameState => { const g = newGame(door as never); return { ...g, chapterId: 'into-the-maw', sceneId, ...extra, flags: { noMasked: true, ...(extra.flags ?? {}) } } as GameState }
const pick = (s: GameState, id: string) => visibleChoices(s).filter((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)

// Fix 1: Prisoner. The Spire Key, BLEED-CORE, the shim or the Clearance gets you down; no key at all seals you out.
const ribs = (flags: Record<string, unknown>, items: Record<string, number> = {}) => { const s = at('prisoner', 'ch2:ribs', { flags: { liftDone: true, liftLadder: true, ...flags } }); return { ...s, items: { ...s.items, ...items } } as GameState }
ok(pick(ribs({}, { spire_key: 1 }), 'climb').length === 1 && !pick(ribs({}, { spire_key: 1 }), 'climb-sealed').length, 'ribs: Spire Key climbs down to the vein')
ok(pick(ribs({}), 'climb-sealed').length === 1, 'ribs: nothing in hand still seals you out')
const vein = (flags: Record<string, unknown>, items: Record<string, number> = {}) => { const s = at('prisoner', 'ch2:vein', { flags }); return { ...s, items: { ...s.items, ...items } } as GameState }
{ const v = vein({}, { wire_cutter_shim: 1 }); ok(pick(v, 'shim').length === 1 && !pick(v, 'sealed').length, 'vein: shim opens') ; ok(applyEffect(v, pick(v, 'shim')[0].effects).sceneId === 'ch2:heart', 'shim -> heart') }
{ const v = vein({ hasBargainFlag: true }); ok(pick(v, 'bargain').length === 1 && !pick(v, 'sealed').length, 'vein: clearance opens') }
ok(pick(vein({}), 'sealed').length === 1, 'vein: no way still sealed')
{ const s = at('prisoner', 'roam:kaelen'); const v = vendorFor('roam:kaelen')!; ok(offersFor(s, v).some((o) => o.id === 'shim' && o.cost.scrap === 4), 'Kaelen sells the Prisoner a shim')
  const held = { ...s, items: { ...s.items, wire_cutter_shim: 1 } } as GameState; ok(!offersFor(held, v).some((o) => o.id === 'shim'), 'shim hidden when held')
  ok(!offersFor(at('outcast', 'roam:kaelen'), v).some((o) => o.id === 'shim'), 'shim prisoner only') }
{ const s = at('prisoner', 'ch2:p-shaft', { flags: { murchScrap: true, gullyBypass: true } }); const hot = { ...s, heat: { ...s.heat, cartel: 7 } } as GameState
  ok(!pick(hot, 'reckon').length && pick(hot, 'ride').length === 1, 'gully bypass: Greg never reckons, the Key is not owed') }
{ const s = at('prisoner', 'ch2:cache'); const t = applyEffect(s, pick(s, 'key')[0].effects); ok((t.items.spire_key ?? 0) === 1, 'Spire Key held after Take the Key') }

// Fix 2: Vessel.
{ const s = at('vessel', 'thresh:thalia'); ok(pick(s, 'play').length === 1, 'hymn offered'); const t = applyEffect(s, pick(s, 'play')[0].effects); ok(!pick({ ...t, sceneId: 'thresh:thalia' } as GameState, 'play').length, 'hymn once only') }
{ const s = at('vessel', 'ch2:v-bleed', { health: 4, equipped: {} } as never); const hot = { ...s, heat: { ...s.heat, seekers: 8 } } as GameState; const h = pick(hot, 'hand')
  ok(h.length === 1 && h[0].effects.health === -2 && !h[0].enable?.any, 'free by hand at Seekers 8, costs 2 Health')
  const t = applyEffect(hot, h[0].effects); ok(t.flags.vexFreed && t.flags.coverBlown && t.health === 2, 'Vex freed by hand, cover blown') }
for (const id of VALERIUS_FOOT) {
  const door = id.includes(':v-') ? 'vessel' : id.includes(':o-') ? 'outcast' : 'prisoner'
  const s = at(door, id, { health: 1, sap: 5 }); ok(restAllowed(s) && ids(s).includes('rest') && ids(s).includes('fight'), `rest before Valerius at ${id}`)
  ok(!restAllowed({ ...s, flags: { ...s.flags, ch2Won_valerius: true } } as GameState), `no rest rule after Valerius at ${id}`)
}

// Fix 3: Outcast Stray Hunter.
{ const total = (g: GameState) => Object.values(g.items).reduce((n, v) => n + (v ?? 0), 0)
  const hunt = (s0: GameState) => { let f = { ...s0, flags: { ...s0.flags, ...fightStartFlags(s0, 'strayhunter') } } as GameState; const n0 = total(f); let last = ''
    for (let i = 0; i < 40 && f.flags.encounterHere && !f.flags.encounterDone; i++) { f = { ...f, health: f.healthMax } as GameState; const r = resolveEncounter(f, 'fight'); last = String(r.fx.flag?.encounterClash ?? r.flash); f = applyEffect(f, r.fx) }
    return { f, gain: total(f) - n0, last } }
  const one = hunt(at('outcast', 'ch2:o-root'))
  ok(one.gain > 0 && one.f.flags.strayLooted, 'first Stray Hunter pays, sets strayLooted')
  const two = hunt(at('outcast', 'ch2:o-root', { flags: { strayLooted: true } }))
  ok(two.f.flags.encounterDone && two.gain === 0, 'second Stray Hunter pays nothing')
  ok(two.last.includes('drop') && !two.last.includes('. .'), 'empty pockets line') }
{ const s = at('outcast', 'ch2:o-root', { sap: 5 }); const h = { ...s, flags: { ...s.flags, strayHunterHere: true } } as GameState
  const cut = strayHuntChoices(h, {}).find((c) => c.id === 'stray-cut')!
  for (let seed = 0; seed < 20; seed++) { const t = applyEffect({ ...h, flags: { ...h.flags, sceneSteps: seed } } as GameState, cut.effects); ok(!t.flags.encounterHere && !t.flags.strayHunterHere && t.flash === STRAY_CUT_LINE, `cut trail avoids fight (seed ${seed})`) } }
{ const s = at('outcast', 'ch2:o-root', { flags: { encounterKind: 'strayhunter' } }); const s2 = { ...s, hubId: 'redmaw' } as GameState; const n = downedNote(s2); ok(n.includes(STRAY_OUTCAST_LINE) && !n.includes('skiff'), 'Outcast down to a Stray Hunter: Stray line') }

// Fix 4: shared.
{ const s = at('prisoner', 'ch2:ribs', { flags: { murchProtected: true, murchScrap: true } }); const r = pick(s, 'scrap'); ok(r.length === 1 && !r[0].effects.remove && r[0].label === 'Let Murch run the lift', 'Murch charges once') }
{ const s = at('prisoner', 'ch2:ribs', { flags: { murchProtected: true } }); ok(pick(s, 'scrap')[0]?.effects.remove?.scrap === 3, 'unpaid Murch still 3 scrap') }
{ const sc = getScene('ch2:p-abyss'); ok(sc.variants?.some((v) => v.body === SHAFT_FOOT_CLEAR), 'Shaft Foot clear variant'); }
ok(!kaelenNamed({ kaelenKnown: true }) && kaelenNamed({ kaelenKnown: true, kaelenIntroSeen: true }), 'name only after the intro')
ok(shownText(at('prisoner', 'roam:kaelen', { flags: { kaelenKnown: true } }), 'Kaelen the Sifter') === 'The trader', 'Buy header says the trader until heard')
{ const s = at('prisoner', 'ch1:storm', { health: 2 }); const f = { ...s, equipped: {}, flags: { ...s.flags, ...fightStartFlags(s, 'skiff') } } as GameState; ok(encounterCard(f).includes(UNARMED_LOW_WARN), 'unarmed low Health warning')
  ok(!encounterCard({ ...f, health: 5 } as GameState).includes(UNARMED_LOW_WARN), 'no warning when healthy') }
ok(readFileSync('public/sw.js', 'utf8').includes("amber-shroud-v215") && readFileSync('src/version.ts', 'utf8').includes("'v215'"), 'v207 cache + build')
console.log(fails ? `v207: ${fails} FAIL` : 'v207 ok')
process.exit(fails ? 1 : 0)

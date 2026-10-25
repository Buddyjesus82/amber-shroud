/**
 * v160: the rib-worm (stray-ground mini-boss), the Maw Plate, and Varro's plating.
 *   npx tsx scripts/v160.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { applyEffect, bodyOf, canPlate, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { beginEncounter, encounterSpec, pickEncounterKind, BEAST_KINDS, RIBWORM_BURROW_LINE, RIBWORM_LINE, RIBWORM_WIN } from '../src/game/encounter.ts'
import { coverBand, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { equippedShell, PLATING, PLATE_BASES, PLATE_LOCKED, shellCap } from '../src/game/kit.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import { PLATE_HINT } from '../src/game/content/redMaw.ts'
import type { GameState, ItemId } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v163'"), 'SW cache v163')
ok(readFileSync('src/version.ts', 'utf8').includes("'v163'"), 'Build label v163')

// The Varro scene keeps its own literals (module load order); they must match the kit.
{
  const src = readFileSync('src/game/content/redMaw.ts', 'utf8')
  ok(src.includes(`'${PLATE_LOCKED}'`), 'redMaw locked line matches PLATE_LOCKED')
  ok(!/from '\.\.\/kit'|from '\.\/catalog'/.test(src), 'redMaw imports neither kit nor catalog at load')
  const sc = visibleChoices({ ...newGame('outcast'), sceneId: 'maw:zafir', hubId: 'redmaw', items: { ...newGame('outcast').items, maw_plate: 1, scrap: 3, sinew_cord: 1, vial_drop: 3, ...Object.fromEntries(PLATE_BASES.map((b) => [b, 1])) } } as GameState)
  for (const b of PLATE_BASES) ok(sc.some((c) => c.label === `Plate the ${ITEMS[b].name}` && c.effects.plate === b), `Varro row for ${b} matches the catalog name`)
}

// 1. The creature.
const outcast = newGame('outcast')
const spine = (extra: Partial<GameState> = {}, flags: Record<string, unknown> = {}): GameState =>
  ({ ...outcast, sceneId: 'spine:well', hubId: 'spine', ticks: 31, health: 6, sap: 8, flags: { ...outcast.flags, noMasked: true, ...flags }, ...extra }) as GameState
{
  const sp = encounterSpec({ ...outcast, flags: { ...outcast.flags, encounterKind: 'ribworm' } })
  ok(sp.name === 'Rib-worm' && sp.strike === 4 && sp.shell === 2 && sp.hp === 5, 'Rib-worm: Strike 4, Shell 2, Health 5')
  ok(sp.line === 'The dune breathes. A rib-worm noses up through the sand, ringed like an old spine, mouth all grit and grinding plates.' && RIBWORM_LINE === sp.line, 'intro line')
  ok(BEAST_KINDS.includes('ribworm'), 'a beast')
  ok(RIBWORM_WIN === 'It sinks and does not come back up. The sand settles over it.', 'win line')
}

// 2. Where it walks: stray ground only, weight about 1 in 7. Never on Cartel, Seeker or Maw ground.
{
  const count = (scene: string, hub: string) => {
    let n = 0
    const N = 700
    for (let t = 0; t < N; t++) if (pickEncounterKind({ ...spine({ sceneId: scene, hubId: hub as never, ticks: 5 + t * 3 }) }) === 'ribworm') n++
    return n / N
  }
  for (const [scene, hub] of [['spine:well', 'spine'], ['ch1:o-noon', 'ch1']] as const) {
    const r = count(scene, hub)
    ok(r > 0.08 && r < 0.22, `${scene}: rib-worm rate ~1/7 (${r.toFixed(3)})`)
  }
  ok(count('camp:yard', 'camp04') === 0, 'no rib-worm in Camp 04')
  ok(count('thresh:paddock', 'threshold') === 0, 'no rib-worm on Threshold ground')
  ok(count('spine:hound', 'spine') === 0, 'no rib-worm on the hound ground')
  ok(count('maw:rim', 'redmaw') === 0, 'no rib-worm at the Red Maw')
}

// 3. The fight: rows, art, Burrows, win, always a Maw Plate.
{
  let s = spine()
  s = applyEffect(s, beginEncounter(s, 'ribworm'))
  ok(s.flags.encounterHere && s.flags.encounterKind === 'ribworm' && s.flags.encounterHp === 5, 'the fight opens at Health 5')
  ok(/^RIB-WORM ♥ 5 ⚔ Strike 4 🛡 Shell 2$/m.test(bodyOf(s)), 'the card shows clean Strike/Shell rows')
  ok(bodyOf(s).includes(RIBWORM_LINE), 'the card carries the intro line')
  ok(playCoverKey(s, { id: 'spine:well', chapterId: 'x', hubId: 'spine' } as never) === 'rib_worm' && playCoverFile('rib_worm') === 'rib-worm.jpg', 'cover is rib-worm.jpg')
  ok(existsSync('public/covers/rib-worm.jpg'), 'cover file exists')
  ok(readFileSync('public/sw.js', 'utf8').includes('covers/rib-worm.jpg'), 'cover precached')
  ok(coverBand('rib_worm').length === 2, 'cover band set')
  ok(!/Maw Plate/.test(bodyOf(s)), 'no plate talk before the win')
}
{
  // Burrows: round 1 line only when the swing was halved; never later rounds; a halved swing never lands as 0.
  let r1 = 0, r1line = 0, r2line = 0
  for (let t = 0; t < 120; t++) {
    const base = spine({ ticks: 9 + t * 7, health: 6, items: { ...outcast.items, ironwood_baton: 1 }, equipped: { ...outcast.equipped, weapon: 'ironwood_baton' } })
    let s = applyEffect(base, beginEncounter(base, 'ribworm'))
    const r = applyEffect(s, { resolveEncounter: 'fight' })
    r1++
    if (bodyOf(r).includes(RIBWORM_BURROW_LINE)) {
      r1line++
      ok(Number(r.flags.encounterHp) <= 4, `t${t}: a halved first swing still lands at least 1`)
    }
    const later = applyEffect({ ...s, flags: { ...s.flags, encounterRound: 1 } }, { resolveEncounter: 'fight' })
    if (bodyOf(later).includes(RIBWORM_BURROW_LINE)) r2line++
  }
  ok(r1line > 0, `Burrowed line shows in round 1 (${r1line}/${r1})`)
  ok(r2line === 0, 'Burrowed line never shows after round 1')
}
{
  // Win: guaranteed plate, plain lines, loot.
  let wins = 0
  for (let t = 0; t < 60; t++) {
    const base = spine({ ticks: 11 + t * 5, health: 6 })
    let s = applyEffect(base, beginEncounter(base, 'ribworm'))
    s = { ...s, flags: { ...s.flags, encounterHp: 1, encounterRound: 1 } }
    const before = { ...s.items }
    for (let i = 0; i < 8 && s.flags.encounterHp !== undefined && !s.flags.encounterDone && s.health > 1; i++) s = applyEffect(s, { resolveEncounter: 'fight' })
    if (!s.flags.encounterDone || s.health <= 0) continue
    const body = bodyOf(s)
    if (!body.includes(RIBWORM_WIN)) continue
    wins++
    ok((s.items.maw_plate ?? 0) === 1, `win t${t}: exactly 1 Maw Plate`)
    ok((s.items.glints ?? 0) === (before.glints ?? 0) + 1 && (s.items.scrap ?? 0) >= (before.scrap ?? 0) + 2, `win t${t}: Glints +1, scrap +2`)
    ok(/^Maw Plate \+1\.$/m.test(body), `win t${t}: its own plain Maw Plate line`)
    ok(!/They drop/.test(body), `win t${t}: not the generic drop line`)
    if (wins === 1) ok(!/Maw Plate/.test(body.split(RIBWORM_WIN)[1]?.split('\n\n')[1] ?? ''), 'plate not folded into the pocket-loot line')
  }
  ok(wins >= 20, `plenty of wins reached (${wins})`)
}

// 4. The Maw Plate and plated pieces.
{
  ok(ITEMS.maw_plate.kind === 'gear' && !ITEMS.maw_plate.slot && ITEMS.maw_plate.desc.includes('crafting material'), 'Maw Plate is stacking gear and is a plain crafting material')
  const shells: Record<string, number> = { plated_buckler: 2, plated_scav_wrap: 3, plated_dust_cloak: 3, plated_head_wrap: 2, plated_shin_wraps: 2 }
  for (const [id, n] of Object.entries(shells)) ok(ITEMS[id as ItemId].shell === n, `${id} Shell ${n}`)
  ok(!PLATING.hide_wrap && !PLATING.hide_gloves, 'Hound Hide and Hide Gloves are not plated')
  ok(PLATE_BASES.length === 5, 'five plated pieces')
  ok(ITEMS.plated_dust_cloak.perk?.includes('skip') && ITEMS.plated_shin_wraps.perk?.includes('Run'), 'cloak and shin perks kept')
}

// 5. Varro.
const maw = (items: Record<string, number>, equipped: Record<string, string> = {}, flags: Record<string, unknown> = {}): GameState =>
  ({ ...newGame('outcast'), sceneId: 'maw:zafir', hubId: 'redmaw', ticks: 80, health: 6, sap: 8, items: { ...newGame('outcast').items, ...items }, equipped, flags: { ...newGame('outcast').flags, noMasked: true, chapter1Done: true, zafirMet: true, ...flags } }) as GameState
const MATS = { scrap: 3, sinew_cord: 1, vial_drop: 3, maw_plate: 1 }
{
  // No plate: no buttons; the hint is a one-time body line and the typed reply.
  const none = maw({ dust_cloak: 1 })
  ok(!visibleChoices(none).some((c) => c.label.startsWith('Plate the')), 'no plate: no plating buttons')
  ok(bodyOf(none).includes(PLATE_HINT), 'no plate: the hint shows once in the body')
  ok(PLATE_HINT.startsWith('"You lived. How rude. If a rib-worm ever leaves you its mouth-plate, don\'t pawn it. Bring it here with cord and scrap, and I will put it where it hurts them."'), 'hint is option C')
  const left = applyEffect(none, visibleChoices(none).find((c) => c.id === 'back')!.effects)
  ok(left.flags.plateHinted === true, 'leaving sets plateHinted')
  ok(!bodyOf({ ...left, sceneId: 'maw:zafir', hubId: 'redmaw' }).includes(PLATE_HINT), 'the hint does not repeat in the body')
  const typed = interpret({ ...left, sceneId: 'maw:zafir', hubId: 'redmaw' } as GameState, 'ask about a rib-worm plate')
  ok(String(typed.flash ?? '').includes('mouth-plate'), 'typed: the hint answers a worm/plate question')
  const withPlate = maw({ ...MATS, dust_cloak: 1 })
  ok(!bodyOf(withPlate).includes(PLATE_HINT), 'with a plate: no hint line')
}
for (const base of PLATE_BASES) {
  const name = ITEMS[base].name
  const plated = PLATING[base]!
  const slot = ITEMS[base].slot!
  // Unworn, base in bag.
  {
    const s = maw({ ...MATS, [base]: 1 })
    const row = visibleChoices(s).find((c) => c.label === `Plate the ${name}`)
    ok(row && row.sub === `Maw Plate, ${name}, 3 scrap, 1 Sinew Cord, 3 Drops`, `${base}: row and sub-line`)
    ok(canPlate(s, base), `${base}: affordable`)
    const n = applyEffect(s, row!.effects)
    ok((n.items.maw_plate ?? 0) === 0 && (n.items.scrap ?? 0) === 0 && (n.items.sinew_cord ?? 0) === 0 && (n.items.vial_drop ?? 0) === 0, `${base}: materials spent`)
    ok(!(n.items[base] ?? 0) && n.items[plated] === 1, `${base}: base consumed, plated made`)
    ok(Object.keys(n.equipped ?? {}).length === 0 || !Object.values(n.equipped ?? {}).includes(plated), `${base}: unworn stays unworn`)
    const rt = JSON.parse(JSON.stringify(n)) as GameState
    ok(rt.items[plated] === 1 && !(rt.items[base] ?? 0), `${base}: save round-trip`)
    // Typed.
    const t = interpret(s, `plate the ${name.toLowerCase()}`)
    ok(t.items[plated] === 1, `${base}: typed "plate the ${name.toLowerCase()}" works`)
  }
  // Worn.
  {
    const s = maw({ ...MATS, [base]: 1 }, { [slot]: base })
    const n = applyEffect(s, visibleChoices(s).find((c) => c.label === `Plate the ${name}`)!.effects)
    ok(n.equipped?.[slot] === plated && n.items[plated] === 1 && !(n.items[base] ?? 0), `${base}: worn stays worn as the plated piece`)
    ok(equippedShell(n) === Math.min(shellCap(n), ITEMS[plated].shell!), `${base}: plated Shell counts (${equippedShell(n)})`)
    const rt = JSON.parse(JSON.stringify(n)) as GameState
    ok(rt.equipped?.[slot] === plated, `${base}: worn plated piece survives a round-trip`)
  }
  // Short on a material: locked, nothing spent.
  for (const miss of ['maw_plate', 'scrap', 'sinew_cord', 'vial_drop'] as const) {
    const s = maw({ ...MATS, [miss]: 0, [base]: 1 })
    const row = visibleChoices(s).find((c) => c.label === `Plate the ${name}`)
    if (miss === 'maw_plate') ok(!row, `${base}: no plate hides the button`)
    else ok(row && row.locked === PLATE_LOCKED, `${base}: short of ${miss} is locked`)
    const t = interpret(s, `plate the ${name.toLowerCase()}`)
    ok(!(t.items[plated] ?? 0), `${base}: typed craft short of ${miss} does nothing`)
  }
}
{
  // Only at Varro: the button is on no other scene, and a typed craft elsewhere does nothing.
  const s = { ...maw({ ...MATS, dust_cloak: 1 }), sceneId: 'maw:market' } as GameState
  ok(!visibleChoices(s).some((c) => c.label.startsWith('Plate the')), 'no plating at the market')
  ok(!(interpret(s, 'plate the dust cloak').items.plated_dust_cloak ?? 0), 'typed craft elsewhere does nothing')
  // Shell cap: a full plated kit stays at the cap.
  const full = maw({}, { armor: 'plated_scav_wrap', cloak: 'plated_dust_cloak', head: 'plated_head_wrap', legs: 'plated_shin_wraps', offhand: 'plated_buckler' }, { chapter1Done: false })
  ok(equippedShell({ ...full, hubId: 'spine' } as GameState) === 4, 'early Shell cap 4 holds')
  ok(equippedShell(full) === shellCap(full), 'at the Maw the cap holds')
  // Spare base stays in the bag when the worn one is plated... (two bases)
  const two = maw({ ...MATS, dust_cloak: 2 }, { cloak: 'dust_cloak' })
  const n = applyEffect(two, visibleChoices(two).find((c) => c.label === 'Plate the Dust Cloak')!.effects)
  ok(n.equipped?.cloak === 'plated_dust_cloak' && n.items.dust_cloak === 1, 'a spare base cloak stays in the bag')
}
console.log(fails ? `v160: ${fails} failure(s)` : 'v160: all ok')
process.exit(fails ? 1 : 0)

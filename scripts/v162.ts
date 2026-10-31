/**
 * v162: nothing names Varro as the Maw Plate's crafter until Varro has said so (plateHinted).
 *   npx tsx scripts/v162.ts
 */
import { readFileSync } from 'node:fs'
import { applyEffect, bodyOf, interpret, newGame, visibleChoices } from '../src/game/engine.ts'
import { beginEncounter } from '../src/game/encounter.ts'
import { ALL_SCENES } from '../src/game/content/index.ts'
import { ITEMS } from '../src/game/content/catalog.ts'
import { HELP_TOPICS, FIGHT_HELP } from '../src/game/helpTopics.ts'
import { itemDesc, listedKit, PLATE_BASES, PLATING } from '../src/game/kit.ts'
import { typedHints } from '../src/game/politeAsk.ts'
import { getScene } from '../src/game/content/index.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
ok(readFileSync('public/sw.js', 'utf8').includes("CACHE = 'amber-shroud-v188'"), 'SW cache v167')
ok(readFileSync('src/version.ts', 'utf8').includes("'v188'"), 'Build label v168')

const PLAIN = "A curved plate pried from a rib-worm's mouth. A crafting material."
const TOLD = 'Maw Plate: calcified rib-worm hide. Varro at the Bone Market can work this into your gear.'
const KIT = { maw_plate: 1, scrap: 3, sinew_cord: 1, vial_drop: 3, scrap_buckler: 1, scav_wrap: 1, dust_cloak: 1, head_wrap: 1, shin_wraps: 1 }
const o = newGame('outcast')
const at = (scene: string, hub: string, flags: Record<string, unknown> = {}, items: Record<string, number> = KIT): GameState =>
  ({ ...o, sceneId: scene, hubId: hub, ticks: 40, health: 6, sap: 8, items: { ...o.items, ...items }, flags: { ...o.flags, noMasked: true, ...flags } }) as GameState

// 1. The catalog text is plain; the gate adds Varro only after his hint.
ok(ITEMS.maw_plate.desc === PLAIN, 'catalog description is the plain version')
ok(itemDesc('maw_plate', at('spine:well', 'spine')) === PLAIN, 'unhinted: plain')
ok(itemDesc('maw_plate', at('spine:well', 'spine', { plateHinted: true })) === TOLD, 'hinted: Varro works it')
ok(itemDesc('scrap', at('spine:well', 'spine', { plateHinted: true })) === ITEMS.scrap.desc, 'other items are untouched')
ok(listedKit({ maw_plate: 1 }).find((c) => c.id === 'maw_plate')?.desc === PLAIN, 'bag/sheet chip: plain by default')
ok(listedKit({ maw_plate: 1 }, true).find((c) => c.id === 'maw_plate')?.desc === TOLD, 'bag/sheet chip: told once hinted')
for (const [flags, want] of [[{}, PLAIN], [{ plateHinted: true }, TOLD]] as const) {
  const s = at('spine:well', 'spine', flags)
  const look = String(interpret(s, 'look at the maw plate').flash ?? '')
  ok(look.includes(want), `typed look at the plate (${JSON.stringify(flags)}) shows the right text`)
  ok(flags.plateHinted ? look.includes('Varro') : !/Varro/.test(look), `typed look: Varro only when hinted (${JSON.stringify(flags)})`)
}

// 2. No Varro anywhere else about the plate: item text, plated pieces, loot, the win card.
for (const id of ['maw_plate', ...Object.values(PLATING)] as string[]) {
  const d = ITEMS[id as keyof typeof ITEMS]
  ok(!/Varro|Bonewright/i.test(`${d.name} ${d.desc} ${d.perk ?? ''}`), `${id}: item text does not name Varro`)
}
{
  const base = at('spine:well', 'spine', {}, { scrap: 0 })
  let s = applyEffect(base, beginEncounter(base, 'ribworm'))
  s = { ...s, flags: { ...s.flags, encounterHp: 1, encounterRound: 1 } }
  for (let i = 0; i < 8 && !s.flags.encounterDone && s.health > 1; i++) s = applyEffect(s, { resolveEncounter: 'fight' })
  if (s.items.maw_plate) ok(!/Varro|Bonewright|craft/i.test(bodyOf(s)) && !/Varro/.test(String(s.flash ?? '')), 'the win card and loot line never name Varro')
  else ok(false, 'a win with a plate was reached')
}

// 3. Plating is offered only at Varro, with a plate. Not in the Craft box, not in typed hints, not in Help.
{
  const bad: string[] = []
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) {
    for (const sc of ALL_SCENES) {
      const st = { ...at(sc.id, sc.hubId ?? 'spine'), door } as GameState
      let rows: string[] = []
      try { rows = visibleChoices(st).map((c) => c.label) } catch { continue }
      if (sc.id !== 'maw:zafir' && rows.some((l) => /^Maw Plate (Shield|Armor)$/.test(l))) bad.push(`${door} ${sc.id}`)
      const none = { ...st, items: { ...st.items, maw_plate: 0 } } as GameState
      let rows2: string[] = []
      try { rows2 = visibleChoices(none).map((c) => c.label) } catch { continue }
      if (rows2.some((l) => /^Maw Plate (Shield|Armor)$/.test(l))) bad.push(`${door} ${sc.id} (no plate)`)
      const hints = typedHints(st, getScene(sc.id, door), true).join(' ')
      if (/plate|plating|worm/i.test(hints)) bad.push(`${door} ${sc.id} typed hints`)
    }
  }
  ok(bad.length === 0, `plating rows only at Varro with a plate; no typed hint names it (${bad.slice(0, 4).join('; ')})`)
  const sheet = readFileSync('src/components/InventorySheet.tsx', 'utf8')
  const craft = sheet.slice(sheet.indexOf('function CraftBox'))
  ok(!/plate|maw|varro|bonewright/i.test(craft), 'the Inventory Craft box says nothing of plating')
  const help = JSON.stringify(HELP_TOPICS) + JSON.stringify(FIGHT_HELP)
  ok(!/maw plate|plating|plate the|bonewright|rib-worm/i.test(help), 'Help never names plating, the plate or the worm')
  // Typed craft away from Varro does nothing and says nothing of plating.
  const m = at('maw:market', 'redmaw')
  for (const t of ['craft', 'plate the dust cloak', 'craft plated cloak']) {
    const r = interpret(m, t)
    ok(!PLATE_BASES.some((b) => r.items[PLATING[b]!]), `typed "${t}" away from Varro plates nothing`)
    ok(!/Varro rivets|Hold still/.test(String(r.flash ?? '')), `typed "${t}" away from Varro: no plating line`)
  }
}

// 4. At Varro: the hint (body or typed) sets the flag, and then the description reads told.
{
  const v = at('maw:zafir', 'redmaw', { zafirMet: true, chapter1Done: true })
  const left = applyEffect(v, visibleChoices(v).find((c) => c.id === 'plate-ask')!.effects)
  ok(left.flags.plateHinted === true && itemDesc('maw_plate', left) === TOLD, 'asking Varro for his hint: told')
  const typed = interpret({ ...v, items: { ...v.items, maw_plate: 0 } } as GameState, 'worm')
  ok(typed.flags.plateHinted === true && itemDesc('maw_plate', typed) === TOLD, 'his typed worm reply: told')
}
console.log(fails ? `v162: ${fails} failure(s)` : 'v162: all ok')
process.exit(fails ? 1 : 0)

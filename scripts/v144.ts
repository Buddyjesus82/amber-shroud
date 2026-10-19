/**
 * v144: Down/wake text, Gear discard confirm, shield main-hand guard, swing line, wrench recovery.
 *   npx tsx scripts/v144.ts
 */
import { applyEffect, discardAsk, DISCARD_KEEP, dropItem, equipBlock, newGame, visibleChoices, DOWN_SCRAP_LINE } from '../src/game/engine.ts'
import { beginEncounter, clashOf, foeWho } from '../src/game/encounter.ts'
import { restoreLostWrench } from '../src/game/repair.ts'
import { equippedStrike } from '../src/game/kit.ts'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import type { EncounterKind } from '../src/game/encounter.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

let fails = 0
function ok(cond: unknown, msg: string) {
  if (!cond) {
    fails++
    console.log('FAIL', msg)
  }
}

function fightOut(s: GameState): GameState {
  for (let i = 0; i < 20 && s.flags.encounterHere; i++) {
    const rows = visibleChoices(s)
    const c = rows.find((r) => r.id === 'enc-fight') ?? rows.find((r) => r.id === 'enc-continue')
    if (!c) break
    s = applyEffect(s, c.effects)
  }
  return s
}

// 1. The Skiff Bay Valerius hunt: a Down costs scrap once, and the wake does not repeat it.
{
  let checked = 0
  for (let t = 0; t < 400 && checked < 25; t++) {
    const g = newGame('prisoner')
    let s: GameState = {
      ...g, hubId: 'camp04', sceneId: 'camp:bay-sarn', ticks: 20 + t, health: 6, sap: 8,
      heat: { ...g.heat, cartel: 7 }, items: { ...g.items, scrap: 20 },
      flags: { ...g.flags, jaxsonInside: true, guardDown: true, cartelNotice: true, noMasked: true, hunterHere: true, hunterFrom: 'camp:bay-sarn' },
    }
    const row = visibleChoices(s).find((c) => c.id === 'hunter-fight')
    ok(row?.label === 'Fight Valerius', 'Cartel 7 hunt fields Valerius')
    s = fightOut(applyEffect(s, row!.effects))
    if (!s.flags.downed) continue
    checked++
    const note = String(s.flags.downedNote)
    ok(note.split(DOWN_SCRAP_LINE(10)).length === 2 && s.items.scrap === 10, `Down costs half the scrap once (${s.items.scrap})`)
    const wake = visibleChoices(s).find((c) => c.id === 'wake')!
    const up = applyEffect(s, wake.effects)
    ok(!/wake lighter/.test(String(up.flash)), `waking does not repeat the scrap line (${up.flash})`)
    ok(String(up.flash).startsWith('Fight lost. Overseer Valerius has moved on.'), `named foe has no article (${up.flash})`)
    ok(up.items.scrap === 9 && up.health > 0, `Jaxson's pull is 1 scrap, total 11 (${up.items.scrap})`)
  }
  ok(checked > 5, `sampled Valerius Downs (${checked})`)
  ok(foeWho('cutter') === 'The Rim cutter', 'unnamed foes keep "The"')
}

// 1b. No fight Downs you from full Health in one exchange, any door, any foe.
{
  const kinds: EncounterKind[] = ['overseer', 'handler', 'hound', 'cutter', 'pup', 'husk', 'courtguard', 'scavenger', 'jackal', 'tick', 'collector', 'carapace', 'patrol']
  let oneShot = 0
  for (const door of ['prisoner', 'outcast', 'vessel'] as DoorId[]) for (const kind of kinds) for (let t = 0; t < 60; t++) {
    const g = newGame(door)
    const s0: GameState = { ...g, sceneId: door === 'prisoner' ? 'camp:bay-sarn' : door === 'outcast' ? 'spine:ridge' : 'thresh:court', ticks: 5 + t * 7, health: g.healthMax }
    const s = applyEffect(s0, beginEncounter(s0, kind))
    const c = visibleChoices(s).find((r) => r.id === 'enc-fight')
    if (!c) continue
    const n = applyEffect(s, c.effects)
    if (n.flags.downed || n.health <= 0) oneShot++
  }
  ok(oneShot === 0, `no one-exchange Down from full Health (${oneShot})`)
}

// 2. Gear discard asks first; a discarded wrench is on record and is not handed back.
{
  const g = newGame('prisoner')
  const s: GameState = { ...g, items: { ...g.items, wrench: 1, scrap_buckler: 1, vial_drop: 3 }, equipped: {}, flags: { ...g.flags, jaxsonInside: true } }
  ok(discardAsk(s, 'wrench') === 'Discard the Oversized Wrench? It is gone for good.', 'one-piece ask')
  ok(discardAsk(s, 'vial_drop', true).endsWith('×3? They are gone for good.'), 'stack ask')
  ok(DISCARD_KEEP === 'Keep it', 'keep button')
  const d = dropItem(s, 'wrench')
  ok(!d.items.wrench && d.flags.wrenchDiscarded === true, 'discarding the wrench is recorded')
  ok(!restoreLostWrench(d).items.wrench, 'a deliberate discard is not restored')
  // An old save (v142/v143) that lost it to the old Discard has no record: one restore, even after v143's.
  const old = { ...s, items: { ...g.items }, flags: { ...s.flags, wrenchRestored: true } }
  const r = restoreLostWrench(old)
  ok(r.items.wrench === 1 && r.flags.wrenchRestoredV144 === true && !r.equipped.weapon, 'old Discard loss comes back once, in the pack')
  ok(!restoreLostWrench({ ...r, items: { ...g.items } }).items.wrench, 'and only once')
  const sheet = readFileSync('src/components/InventorySheet.tsx', 'utf8')
  ok(/setAsking\('one'\)/.test(sheet) && !/onClick=\{\(\) => onChange\(dropItem/.test(sheet), 'Gear Discard goes through the ask')
}

// 3. A shield is off hand only.
{
  const g = newGame('prisoner')
  const s: GameState = { ...g, items: { ...g.items, scrap_buckler: 1, wrench: 1 } }
  ok(equipBlock(s, 'scrap_buckler', 'weapon') === 'A shield goes in the Off hand.', 'the main hand refuses a shield')
  const bad = applyEffect({ ...s, equipped: { weapon: 'scrap_buckler' } }, { ticks: 1 })
  ok(!bad.equipped.weapon && bad.equipped.offhand === 'scrap_buckler' && equippedStrike(bad) === 1, 'a shield in the main hand moves to the off hand')
  const full = applyEffect({ ...s, equipped: { weapon: 'scrap_buckler', offhand: 'wrench' } }, { ticks: 1 })
  ok(!full.equipped.weapon && full.equipped.offhand === 'wrench', 'and comes off if the off hand is taken')
}

// 4. Every point of your hit is on a line: base, then each bonus. The 0-2 swing is "Extra force".
{
  let seen = 0
  let bad = 0
  for (let t = 0; t < 900; t++) {
    const g = newGame((['prisoner', 'outcast', 'vessel'] as DoorId[])[t % 3])
    const kind = (['overseer', 'cutter', 'husk', 'pup', 'scavenger'] as EncounterKind[])[t % 5]
    const s0: GameState = { ...g, sceneId: g.door === 'prisoner' ? 'camp:yard' : g.door === 'outcast' ? 'spine:ridge' : 'thresh:court', ticks: 3 + t, items: { ...g.items, wrench: 1 }, equipped: t % 2 ? { weapon: 'wrench' } : {} }
    let s = applyEffect(s0, beginEncounter(s0, kind))
    if (t % 4 === 0) {
      const fe = visibleChoices(s).find((r) => r.id === 'enc-feint')
      if (fe) s = applyEffect(s, fe.effects)
      if (!s.flags.encounterHere || !visibleChoices(s).some((r) => r.id === 'enc-fight')) continue
    }
    const c = clashOf(s)
    const n = applyEffect(s, visibleChoices(s).find((r) => r.id === 'enc-fight')!.effects)
    const card = String(n.flags.encounterClash ?? '')
    const m = /You hit [^\n]* for (\d+)\./.exec(card)
    if (!m || /Critical/.test(card)) continue
    const hit = Number(m[1])
    const base = Math.max(1, c.strike - c.spec.shell)
    const extras = [...card.matchAll(/: \+(\d+) to your hit\./g)].reduce((a, x) => a + Number(x[1]), 0)
    const minus = [...card.matchAll(/: −(\d+) to your hit\./g)].reduce((a, x) => a + Number(x[1]), 0)
    if (/Extra force/.test(card)) seen++
    if (!/Blowing sand/.test(card) && base + extras - minus !== hit) { bad++; if (bad < 3) console.log(card) }
  }
  ok(seen > 20, `Extra force line shows (${seen})`)
  ok(bad === 0, `no hit bigger than its shown parts (${bad})`)
}

// 6. No "The rth is where I said" anywhere.
{
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(`${d}/${n}`).isDirectory() ? walk(`${d}/${n}`) : [`${d}/${n}`]))
  const hits = walk('src').filter((f) => /\.tsx?$/.test(f) && /\brth is where\b/.test(readFileSync(f, 'utf8')))
  ok(hits.length === 0, `no "rth" typo (${hits.join(', ')})`)
}

if (fails) {
  console.log(`v144: ${fails} failures`)
  process.exit(1)
}
console.log('v144 checks OK')

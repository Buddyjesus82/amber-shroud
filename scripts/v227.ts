/** v227: Varro's card, Field Surgery, the Heat price, the two knowledge lines. */
import { existsSync, readFileSync } from 'node:fs'
import { applyEffect, bodyOf, interpret, isChoiceOn, newGame, sceneOf, visibleChoices } from '../src/game/engine.ts'
import { playCoverFile, playCoverKey } from '../src/game/art.ts'
import { PEOPLE } from '../src/game/people.ts'
import { FIELD_RESIN, FIELD_SCRAP, FIELD_SCRAP_HOT, FIELD_SURGERY, VARRO_BUY, VARRO_CARD, VARRO_FLAVOR, VARRO_HEAL, VARRO_KNOT, VARRO_MARKET, VARRO_NAME, VARRO_SCRIP, VARRO_SELL, VARRO_TALK, VARRO_TITLE, VARRO_WHOLE } from '../src/game/varroCard.ts'
import { getScene } from '../src/game/content/index.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v231'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v231'"), 'build v227')
ok(existsSync('public/covers/bonewright.jpg'), 'Varro portrait ships')

function at(seekers = 0, items: Record<string, number> = {}, flags: Record<string, unknown> = {}): GameState {
  const b = applyEffect(newGame('outcast'), { goto: 'maw:zafir' })
  return { ...b, health: 2, heat: { ...b.heat, seekers }, items: { ...b.items, ...items }, flags: { ...b.flags, chapter1Done: true, ...flags } }
}

const card = at()
ok(bodyOf(card) === VARRO_CARD && bodyOf(card).includes(VARRO_TITLE) && bodyOf(card).includes(VARRO_FLAVOR), 'the stall is the card')
ok(!bodyOf(card).includes(VARRO_KNOT) && !bodyOf(card).includes(VARRO_SCRIP), 'no knowledge line without the thing')
ok(bodyOf(at(0, {}, { metZafir: true })) === VARRO_CARD, 'coming back still shows the card')
ok(playCoverKey(card, sceneOf(card)) === 'zafir' && playCoverFile('zafir') === 'bonewright.jpg', 'the stall uses the new portrait')
ok(PEOPLE.zafir.name === 'Varro' && PEOPLE.zafir.card.includes(VARRO_NAME) && !PEOPLE.zafir.card.includes('Bonewright') && PEOPLE.zafir.card.includes(VARRO_TITLE) && PEOPLE.zafir.card.includes(VARRO_FLAVOR), 'the display name is Varro the Bone-Stitcher')
ok(getScene('maw:zafir').title === VARRO_NAME && readFileSync('src/components/PlayScreen.tsx', 'utf8').includes('VARRO_STALL'), 'the stall names him and the place')

ok(bodyOf(at(0, { ossa_token: 1 })).includes(VARRO_KNOT) && !bodyOf(at(0, { ossa_token: 1 })).includes(VARRO_SCRIP), 'the Knot line')
ok(bodyOf(at(0, { knotted_wrap: 1 })).includes(VARRO_KNOT), 'a tied Knot is still the Knot')
ok(bodyOf(at(0, { scrip: 1 })).includes(VARRO_SCRIP) && !bodyOf(at(0, { scrip: 1 })).includes(VARRO_KNOT), 'the scrip line')
ok(bodyOf(at(0, { ossa_token: 1, scrip: 1 })).includes(VARRO_KNOT) && bodyOf(at(0, { ossa_token: 1, scrip: 1 })).includes(VARRO_SCRIP), 'both lines when he can see both')

const rich = at(0, { salve: 2, scrap: 4, vial_drop: 3 })
const resin = visibleChoices(rich).find((c) => c.id === 'stitch-resin')!
const scrap = visibleChoices(rich).find((c) => c.id === 'stitch-scrap')!
ok(resin.label === FIELD_SURGERY && resin.sub === FIELD_RESIN && isChoiceOn(rich, resin.enable), 'resin stitch is 2 Resin')
ok(scrap.label === FIELD_SURGERY && scrap.sub === FIELD_SCRAP && isChoiceOn(rich, scrap.enable), 'scrap stitch is 4 Scrap under Heat 5')
const healed = applyEffect(rich, resin.effects)
ok(healed.health === 5 && healed.flash === VARRO_HEAL && (healed.items.salve ?? 0) === 0 && (healed.items.vial_drop ?? 0) === 3 && (healed.items.scrap ?? 0) === 4, '2 Resin heals 3, says so, and never spends a Drop')
const whole = at(0, { salve: 2, scrap: 4, vial_drop: 1 })
whole.health = 6
const lockedWhole = visibleChoices(whole).filter((c) => c.label === FIELD_SURGERY)
ok(lockedWhole.length === 2 && lockedWhole.every((c) => c.locked === VARRO_WHOLE && !isChoiceOn(whole, c.enable) && !c.effects.remove), 'full Health locks both stitches and spends nothing')
const poor = at(0, { salve: 1, scrap: 3 })
const lockedResin = visibleChoices(poor).find((c) => c.id === 'stitch-resin')!
const lockedScrap = visibleChoices(poor).find((c) => c.id === 'stitch-scrap')!
ok(!isChoiceOn(poor, lockedResin.enable) && lockedResin.locked === 'Needs: 2 Resin', 'resin stitch locks without 2 Resin')
ok(!isChoiceOn(poor, lockedScrap.enable) && lockedScrap.locked === 'Needs: 4 Scrap', 'scrap stitch locks without 4 Scrap')

const warm = at(4, { salve: 2, scrap: 5 })
ok(visibleChoices(warm).find((c) => c.id === 'stitch-scrap')?.sub === FIELD_SCRAP, 'Heat 4 keeps 4 Scrap')
const hot = at(5, { salve: 2, scrap: 5, vial_drop: 1 })
const hotScrap = visibleChoices(hot).find((c) => c.id === 'stitch-scrap')!
ok(hotScrap.sub === FIELD_SCRAP_HOT && isChoiceOn(hot, hotScrap.enable), 'Heat 5 makes the scrap line 5 Scrap')
ok(visibleChoices(hot).find((c) => c.id === 'stitch-resin')?.sub === FIELD_RESIN, 'Heat 5 leaves the resin line at 2')
const paid = applyEffect(hot, hotScrap.effects)
ok(paid.health === 5 && (paid.items.scrap ?? 0) === 0 && (paid.items.salve ?? 0) === 2 && (paid.items.vial_drop ?? 0) === 1, '5 Scrap heals 3 and does not spend Resin or a Drop')
ok(visibleChoices(at(8, { salve: 2, scrap: 5 })).some((c) => c.id === 'stitch-resin') && visibleChoices(at(8, { salve: 2, scrap: 5 })).some((c) => c.sub === FIELD_SCRAP_HOT), 'Heat 8 still stitches')
const market = applyEffect(newGame('outcast'), { goto: 'maw:market' })
ok(bodyOf(market).includes(VARRO_MARKET) && !bodyOf(market).includes('pawned shock baton'), 'the market blurb')
ok(visibleChoices(market).find((c) => c.id === 'zafir')?.sub === VARRO_TALK, 'talk subtitle')
const shelves = visibleChoices(card)
ok(shelves.find((c) => c.id === 'shop-buy')?.sub === VARRO_BUY && shelves.find((c) => c.id === 'shop-sell')?.sub === VARRO_SELL, 'Varro shelf subtitles')
const cairn = applyEffect(newGame('vessel'), { goto: 'ch1:v-zafir' })
ok(bodyOf(cairn).includes('You walked out of a wreck still open.') && bodyOf(cairn).includes('He keeps his eyes on the needle.') && bodyOf(cairn).includes('I left the lamps.') && bodyOf(cairn).includes("Oram's map is already better"), 'Bone Cairn 1-4')
ok(!bodyOf(cairn).includes('walking batteries') && !bodyOf(cairn).includes('Bonewright'), 'the cairn drops the merchant pitch')
ok(interpret(cairn, 'talk').flash === 'I do not sell a cup a road. She already knows. Walk.', 'cairn talk')
ok(interpret(card, 'talk').flash === 'You lived. Sit. I stitch. I do not keep a tray of pardons.', 'stall talk')
ok(interpret(card, 'who are you').flash === 'Varro. They called me a Seeker. I left. I stitch bone. I do not kneel.', 'who-is')
ok(bodyOf({ ...cairn, flags: { ...cairn.flags, metZafir: true } }).includes('The gold thread is still a fire.'), 'cairn return')
for (const f of ['src/game/talk.ts', 'src/game/voices.ts', 'src/game/people.ts', 'src/game/content/cacheRun.ts', 'src/game/content/redMaw.ts', 'src/game/look.ts', 'src/game/trade.ts', 'src/game/intent.ts']) {
  ok(!readFileSync(f, 'utf8').includes('Bonewright'), `${f} has no Bonewright`)
}
const kaelen = applyEffect(newGame('prisoner'), { goto: 'camp:kaelen' })
ok(visibleChoices(kaelen).find((c) => c.id === 'shop-buy')?.sub === 'His stock. Prices on the shelf.', 'Kaelen keeps his shelf line')

console.log(fails ? `v227 FAILED ${fails}` : 'v227: all pass')
if (fails) process.exit(1)

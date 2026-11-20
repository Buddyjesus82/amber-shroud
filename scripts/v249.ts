/** v249: the Rustvein Gateway, Marta Pryce, and the weapon word scrub (Jeramie, t1270u). */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { applyEffect, interpret, isChoiceOn, newGame, sceneOf, sceneProse, travelTo, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { coverBand, playCoverFile, playCoverKey } from '../src/game/art.ts'
import { ch3MapLocked, drawnMap } from '../src/game/map.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v253'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v253'"), 'build v253')

const BODY = 'The old trade road climbs out of the runoff into a cut of rust-stained rock. An iron gate spans the cut, older than Crosshaven, its bars bleeding orange down the stone. Behind it a lamp burns in a toll hut, and someone inside is still writing.'
const WREN = "Wren pointed past Red Maw toward the deep cuts—and you gave her your word you wouldn't stop halfway."
const CORVUS = "The tallies on the gate don't add up. Somebody out here is hiding what this cut gives up."
const KNOCK = "The lamp gutters. A woman opens the shutter a hand's width, ink on her fingers, a tally book pinned under her palm. 'Road's closed past dusk. Toll's still owed.'"
const GATE = 'Rows of Cartel marks, scratched deep and recent. Half the counts have been cut over and made smaller.'
const ROAD = "'Deeper. Fewer come back each season. The books say otherwise.'"
const TALLIES = "'The Cartel counts what it wants counted. I just hold the pen.'"
const NAME = 'Her pen stops over one column, a name scratched out and written back in, smaller. She turns the page before you can read it.'
const TOLL = "She takes it and writes something that isn't your name."
const JUNCTION_ROAD = "The old trade road runs on into the dark, choked with collapse and silence. You'll need a reason—and a route—before pushing deeper."

const row = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id)
const press = (s: GameState, id: string) => { const c = row(s, id); if (!c) throw new Error(`no ${id} on ${s.sceneId}: ${ids(s).join()}`); return applyEffect(s, c.effects) }
const g = newGame('outcast')
const at = (sceneId: string, flags: GameState['flags'] = {}, scrap = 2): GameState => ({
  ...g, sceneId, hubId: 'barrow', chapterId: 'luminspire', sap: 4, health: 5,
  items: { ...g.items, scrap },
  flags: { ...g.flags, ch3Started: true, ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, ch3TentOpen: true, ch3VaultDone: true, crosshavenCablesCut: true, crosshavenGateOpen: true, ch3Helper: 'wren', noMasked: true, ...flags },
} as GameState)

// ── Junction: the road needs the trail-runner's map ──
const j0 = at('ch3:junction')
const r0 = row(j0, 'follow-road')
ok(r0 && r0.label === 'Follow the old trade road' && r0.sub === 'Into the Barrow Trails.' && !row(j0, 'follow-road-map'), 'no map: the old road row')
const j0b = press(j0, 'follow-road')
ok(j0b.sceneId === 'ch3:junction' && j0b.flash === JUNCTION_ROAD, 'no map: same flash, stays put')
ok(ch3MapLocked(j0, 'ch3:rustvein') && travelTo(j0, 'ch3:rustvein').sceneId === 'ch3:junction', 'no map: map hop to Rustvein is shut')
ok(interpret(j0, 'follow the trade road').sceneId === 'ch3:junction', 'no map: typed road stays put')
const j1 = at('ch3:junction', { barrowMap: true })
const r1 = row(j1, 'follow-road-map')
ok(r1 && r1.label === 'Follow the old trade road' && r1.sub === 'Into the Barrow Trails.' && !row(j1, 'follow-road'), 'map: one road row, same label and sub')
const v = press(j1, 'follow-road-map')
ok(v.sceneId === 'ch3:rustvein' && v.hubId === 'barrow' && v.chapterId === 'luminspire' && v.sap === 4, 'map: the road walks to Rustvein, free')
ok(interpret(j1, 'follow the trade road').sceneId === 'ch3:rustvein', 'map: typed road walks too')
ok(!ch3MapLocked(j1, 'ch3:rustvein') && travelTo(j1, 'ch3:rustvein').sceneId === 'ch3:rustvein', 'map: map hop to Rustvein opens')
ok(ch3MapLocked(at('ch3:courtyard', { barrowMap: true, crosshavenGateOpen: false }), 'ch3:rustvein'), 'shut gate: Rustvein stays shut')
ok(!visibleChoices(j1).some((c) => /Rustvein/.test(c.label)) && !visibleChoices(v).some((c) => /^Walk to/.test(c.label)), 'no auto Walk rows either way')
const dm = drawnMap(v)
ok(dm?.nodes.some((n) => n.id === 'rustvein' && n.name === 'The Rustvein Gateway') && dm?.edges.some((e) => e.a === 'junction' && e.b === 'rustvein'), 'Rustvein is on the drawn sheet, joined to the Junction')

// ── The scene ──
ok(sceneOf(v).title === 'The Rustvein Gateway' && getScene('ch3:rustvein').body === BODY, 'title and body')
ok(sceneProse(at('ch3:rustvein', { ch3Helper: 'wren' })) === BODY, 'Wren helper without the deal: plain body')
ok(sceneProse(at('ch3:rustvein', { ch3Helper: 'wren', wrenPromise: true })) === `${BODY}\n\n${WREN}`, 'Wren promise appended')
ok(sceneProse(at('ch3:rustvein', { ch3Helper: 'corvus' })) === `${BODY}\n\n${CORVUS}`, 'Corvus hook appended')
ok(playCoverKey(v, sceneOf(v)) === 'ch3_rustvein' && playCoverFile('ch3_rustvein') === 'ch3-rustvein.jpg' && existsSync('public/covers/ch3-rustvein.jpg') && statSync('public/covers/ch3-rustvein.jpg').size > 20000, 'Rustvein art')
ok(readFileSync('public/sw.js', 'utf8').includes('covers/ch3-rustvein.jpg'), 'Rustvein art cached offline')
const [bt, bb] = coverBand('ch3_rustvein')
ok(bt === 0.05 && bb === 0.85, 'Rustvein band')

// Before knocking: knock, gate tallies, (v250) the slip past, back. No Marta rows, no speaker.
const s0 = at('ch3:rustvein')
ok(ids(s0).join() === 'knock,read-tallies,slip-toll,back-junction', `before knock: ${ids(s0).join()}`)
ok(row(s0, 'knock')?.label === 'Knock at the toll hut' && row(s0, 'knock')?.sub === 'Someone keeps the books out here.', 'knock row')
ok(row(s0, 'read-tallies')?.label === 'Read the gate tallies' && row(s0, 'read-tallies')?.sub === 'Cartel marks, scratched into the iron.', 'tallies row')
ok(row(s0, 'back-junction')?.label === 'Back to the Deep Junction', 'back row')
ok(!sceneOf(s0).speaker, 'no speaker before knocking')
let t = press(s0, 'read-tallies')
ok(t.sceneId === 'ch3:rustvein' && t.flash === GATE && t.sap === 4 && t.items.scrap === 2, 'gate tallies: stays, free')
t = press({ ...t, flash: undefined }, 'read-tallies')
ok(t.flash === GATE, 'gate tallies: repeatable')
const back = press(s0, 'back-junction')
ok(back.sceneId === 'ch3:junction', 'back to the Junction')

// Knock reveals Marta.
const k = press(s0, 'knock')
ok(k.sceneId === 'ch3:rustvein' && k.flash === KNOCK && k.flags.martaMet === true, 'knock flash and flag')
ok(ids(k).join() === 'read-tallies,ask-road,ask-tallies,pay-toll,slip-toll,back-junction', `after knock: ${ids(k).join()}`)
ok(sceneOf(k).speaker === 'Marta Pryce, toll clerk', 'speaker after knocking')
ok(row(k, 'ask-road')?.label === 'Ask about the road' && row(k, 'ask-road')?.sub === 'Where does the trade road go?', 'road row')
ok(row(k, 'ask-tallies')?.label === 'Ask about the tallies' && row(k, 'ask-tallies')?.sub === 'The marks on the gate.', 'tallies ask row')
ok(row(k, 'pay-toll')?.label === 'Pay the toll' && row(k, 'pay-toll')?.sub === 'Needs: 1 Scrap.', 'toll row')
const rd = press(k, 'ask-road')
ok(rd.flash === ROAD && rd.sceneId === 'ch3:rustvein' && press(rd, 'ask-road').flash === ROAD, 'road reply, repeatable')
const a1 = press(k, 'ask-tallies')
ok(a1.flash === `${TALLIES}\n\n${NAME}`, 'first tallies ask: reply and the name line')
const a2 = press(a1, 'ask-tallies-again')
ok(a2.flash === TALLIES && !a2.flash.includes('pen stops') && !row(a1, 'ask-tallies') && row(a1, 'ask-tallies-again')?.label === 'Ask about the tallies' && row(a1, 'ask-tallies-again')?.sub === 'The marks on the gate.', 'the name line only once')
const p1 = press(k, 'pay-toll')
ok(p1.flash === TOLL && p1.items.scrap === 1 && p1.flags.martaTollPaid === true && p1.sceneId === 'ch3:rustvein', 'toll: 1 Scrap, her line')
ok(!row(p1, 'pay-toll'), 'toll: once')
const broke = at('ch3:rustvein', { martaMet: true }, 0)
const pb = row(broke, 'pay-toll')
ok(pb && !isChoiceOn(broke, pb.enable) && pb.locked === 'Needs: 1 Scrap.', 'toll: blocked at 0 Scrap')

// ── Weapon words ──
const files: string[] = []
const walk = (d: string) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name)) files.push(p) } }
walk('src')
const bad = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l] as const)).filter(([, , l]) => /rifle|shot them|fire on the/i.test(l) && !/tags: \['rifle', 'spear'/.test(l) && !/^\s*\/\//.test(l))
ok(!bad.length, `no rifle left: ${bad.map(([f, n]) => `${f}:${n}`).join(' ')}`)
const people = readFileSync('src/game/people.ts', 'utf8')
ok(people.includes('When they ordered him to cut down the families, he dropped his spear and deserted into the deep sand.') && people.includes('A heavy serrated spring-harpoon.'), 'Corvin and Nim cards')
const spine = readFileSync('src/game/content/spine.ts', 'utf8')
ok(spine.includes('He carries no spear.') && spine.includes('and the Cartel cut them down for it. When they ordered me to turn on the families, I dropped my spear and walked into the deep sand.') && spine.includes('I put the spear down. That is the whole story I tell.'), 'Corvin scene lines')
ok(readFileSync('src/game/voices.ts', 'utf8').includes('I put the spear down."') && readFileSync('src/game/talk.ts', 'utf8').includes('I put the spear down. I\\\'m not picking'), 'Corvin voice lines')
const stray = readFileSync('src/game/strayLines.ts', 'utf8')
ok(stray.includes('a sinew-backed bow across the knees') && stray.includes('Same figure, bow down.'), 'Stray bow')

if (fails) { console.log(`v249: ${fails} failure(s)`); process.exit(1) }
console.log('v249 ok')

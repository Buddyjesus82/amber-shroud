/** v252: at 8, a ': X Heat +N.' tail inside a button sub closes with a full stop (Jeramie). */
import { readFileSync } from 'node:fs'
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { getScene } from '../src/game/content/index.ts'
import { capHeatSub } from '../src/game/heatLines.ts'
import { RUMOR_JOBS } from '../src/game/rumorJobs.ts'
import type { GameState } from '../src/game/types.ts'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v258'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v258'"), 'build v253')

// ── The two approved tails, from the live content ──
const WATCHER = 'He stays. A Watcher on the stair sees you: Seeker Heat +1.'
const slip = getScene('thresh:crucible-rig').choices.find((c) => c.id === 'slip')!
ok(slip.sub === WATCHER, 'crucible slip sub as written')
ok(capHeatSub(slip.sub, { seekers: 8 }) === 'He stays. A Watcher on the stair sees you.', 'Seeker 8: Watcher tail trimmed')
ok(capHeatSub(slip.sub, { seekers: 7, cartel: 8, strays: 8 }) === WATCHER, 'Seeker 7: Watcher sub whole')

const COLLECTOR = 'Two Glints. The collector hunts you next: Strays Heat +1.'
const take = RUMOR_JOBS.find((j) => j.id === 'tally')!.takes!.find((t) => t.id === 'take')!
ok(take.sub === COLLECTOR, 'tally take sub as written')
ok(capHeatSub(take.sub, { strays: 8 }) === 'Two Glints. The collector hunts you next.', 'Stray 8: collector tail trimmed')
ok(capHeatSub(take.sub, { strays: 7, seekers: 8 }) === COLLECTOR, 'Stray 7: collector sub whole')

// ── Through visibleChoices on the crucible rig ──
const g = newGame('vessel')
const rig = (seekers: number): GameState => ({ ...g, sceneId: 'thresh:crucible-rig', heat: { ...g.heat, seekers }, flags: { ...g.flags, noMasked: true } } as GameState)
const live8 = visibleChoices(rig(8)).find((c) => c.id === 'slip')
const live7 = visibleChoices(rig(7)).find((c) => c.id === 'slip')
if (live8 && live7) {
  ok(live8.sub === 'He stays. A Watcher on the stair sees you.' && live7.sub === WATCHER, 'crucible rig rows at 8 and 7')
  ok(live8.label === live7.label && live8.locked === live7.locked, 'label and locked text unchanged')
}

// ── General tail pattern ──
ok(capHeatSub('Runs at you: Cartel Heat +2.', { cartel: 8 }) === 'Runs at you.', 'Cartel tail')
ok(capHeatSub('A runner sees: Seekers Heat +1. Once.', { seekers: 8 }) === 'A runner sees. Once.', 'tail with more after it')
ok(capHeatSub('Runs at you: Cartel Heat +2.', { seekers: 8 }) === 'Runs at you: Cartel Heat +2.', 'tail of a meter below 8 stays')

// ── Left exactly as they are ──
ok(capHeatSub('3 scrap. Cartel Heat +2. Once.', { cartel: 8 }) === '3 scrap. Once.', '3 scrap. Once. (v251) unchanged')
ok(capHeatSub('Seeker Heat +2. Once.', { seekers: 8 }) === 'Once.', 'Once. (v251) unchanged')
for (const w of ['Seeker Heat rises.', 'Sap and Cartel Heat.', 'You leave the tracks. Cartel Heat still rises.', 'Cartel Heat −1. Once.', 'Needs: Seeker Heat 3 or less'])
  ok(capHeatSub(w, { cartel: 8, seekers: 8, strays: 8 }) === w, `untouched: ${w}`)

// ── The Causeway cairn ──
const CAIRN = 'Halfway up the ridge, a flat slate sits balanced on three dark stones, the same mark inked on your map. Under it, someone left a wrapped bundle.'
const EMPTY = 'The slate sits empty on its stones.'
const og = newGame('outcast')
const cw: GameState = { ...og, sceneId: 'ch3:causeway', hubId: 'barrow', chapterId: 'luminspire', sap: 4, health: 5, items: { ...og.items, scrap: 1, salve: 0 }, flags: { ...og.flags, ch3Started: true, ch3Stripped: true, ch3Out: true, ch3SupplyOpen: true, ch3TentOpen: true, ch3VaultDone: true, crosshavenGateOpen: true, barrowMap: true, causewayCrossed: true, noMasked: true } } as GameState
const rowOf = (s: GameState, id: string) => visibleChoices(s).find((c) => c.id === id)
const ids = (s: GameState) => visibleChoices(s).map((c) => c.id).join()
const press = (s: GameState, id: string) => { const c = rowOf(s, id); if (!c) throw new Error(`no ${id}: ${ids(s)}`); return applyEffect(s, c.effects) }
ok(ids(cw) === 'climb-mounds,sunken-road,back-rustvein', `causeway rows before: ${ids(cw)}`)
const climb = rowOf(cw, 'climb-mounds')
ok(climb?.label === 'Climb to the barrow mounds' && climb.sub === 'A stack of stones on the crest.', 'mounds row: label and new sub')
const got = press(cw, 'climb-mounds')
ok(got.sceneId === 'ch3:causeway' && got.flash === `${CAIRN}\n\nResin +1.\nScrap +1.`, 'cairn flash with Resin and Scrap lines')
ok(got.items.salve === 1 && got.items.scrap === 2 && got.flags.causewayCairnTaken === true && got.sap === 4 && got.health === 5, 'Resin +1, Scrap +1, flag, nothing else')
ok(ids(got) === 'climb-mounds-empty,sunken-road,back-rustvein', `causeway rows after: ${ids(got)}`)
const emptyRow = rowOf(got, 'climb-mounds-empty')
ok(emptyRow?.label === 'Climb to the barrow mounds' && emptyRow.sub === 'A stack of stones on the crest.', 'button stays after pickup')
const again = press({ ...got, flash: undefined }, 'climb-mounds-empty')
ok(again.sceneId === 'ch3:causeway' && again.flash === EMPTY && again.items.salve === 1 && again.items.scrap === 2, 'after: empty line, no reward')
ok(press(again, 'climb-mounds-empty').items.scrap === 2, 'never pays twice')
ok(rowOf(cw, 'sunken-road')?.label === 'Follow the sunken road', 'sunken road row still there (v253: it walks to the Ossuary Cut)')

if (fails) { console.log(`v252: ${fails} failure(s)`); process.exit(1) }
console.log('v252 ok')

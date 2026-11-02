/** v203 (draft): Chapter Two roster. Stats, Pack Call, Suppressing Fire, Foreman + Rig Guards, art. npx tsx scripts/v203.ts */
import { applyEffect, newGame, visibleChoices } from '../src/game/engine.ts'
import { encounterSpec, fightStartFlags, pickEncounterKind } from '../src/game/encounter.ts'
import { playCoverKey } from '../src/game/art.ts'
import { ch2SkiffHunt, roadHunterKind } from '../src/game/roadHunt.ts'
import { heatFactions } from '../src/game/heat.ts'
import { heatNow } from '../src/game/heatNow.ts'
import { getScene } from '../src/game/content/index.ts'
import { OVERTIME_LINE, PACK_CALL_LINE, PACK_HOUND_LINE, SKIFF_RUN_LINE } from '../src/game/v203Lines.ts'
import type { DoorId, GameState } from '../src/game/types.ts'
let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const g = (door: DoorId, hubId: string, sceneId: string, heat: Partial<GameState['heat']> = {}, flags: Record<string, unknown> = {}, extra: Partial<GameState> = {}) => {
  const s = newGame(door)
  return { ...s, hubId, sceneId, heat: { ...s.heat, cartel: 0, seekers: 0, strays: 0, ...heat }, flags: { ...s.flags, noMasked: true, ...flags }, ...extra } as GameState
}
const spec = (kind: string, flags: Record<string, unknown> = {}) => encounterSpec(g('prisoner', 'camp04', 'camp:yard', {}, { encounterKind: kind, ...flags }))
const stat = (kind: string, flags: Record<string, unknown> = {}) => { const s = spec(kind, flags); return `${s.strike}/${s.shell}/${s.hp}` }
ok(stat('drilllead') === '3/2/4', 'Drill Team Lead 3/2/4')
ok(stat('dragoon') === '4/2/4', 'Dragoons 4/2/4')
ok(stat('rigpatrol') === '3/1/3', 'Rig 04 vent patrol 3/1/3')
ok(stat('patrol') === '3/0/1', 'shared Vent patrol unchanged')
ok(stat('seekerhandler') === '3/2/4' && stat('packhound') === '3/2/3', 'Hound-Handler + hound')
ok(stat('skiff') === '4/3/5', 'skiff')
ok(stat('foreman') === '4/2/5' && stat('rigguard') === '3/2/3' && stat('rigguard', { foremanFought: true }) === '4/2/3', 'foreman, guards, Overtime')

// Rig 04 vents sneak uses the new kind.
const vents = getScene('deep:vents')
ok(vents.choices.filter((c) => c.id === 'bypass').every((c) => c.effects.sneak?.kind === 'rigpatrol'), 'vents use rigpatrol')

// Hound-Handler appears in the Seeker pool on Threshold / Maw rim at Seeker Heat 4+, never below 4 or off that ground.
const count = (hub: string, scene: string, heat: number) => {
  let n = 0
  for (let t = 0; t < 400; t++) if (pickEncounterKind(g('vessel', hub, scene, { seekers: heat }, {}, { ticks: t, seed: t } as never)) === 'seekerhandler') n++
  return n
}
ok(count('threshold', 'thresh:paddock', 4) > 0, 'handler at Threshold, heat 4')
ok(count('redmaw', 'maw:rim', 5) > 0, 'handler on the Maw rim')
ok(count('threshold', 'thresh:paddock', 3) === 0, 'no handler under heat 4')
ok(count('redmaw', 'maw:lip', 6) === 0, 'no handler off the rim')

// Pack Call: still up after round 2 -> flag + line; the win then opens the hound fight.
const fightIn = (kind: string, sceneId: string, extraFlags: Record<string, unknown> = {}) => {
  const s = g('vessel', 'threshold', sceneId, { seekers: 5 }, {}, { health: 6 })
  return { ...s, flags: { ...s.flags, ...fightStartFlags(s, kind as never), encounterNoSkip: true, ...extraFlags } } as GameState
}
let h = fightIn('seekerhandler', 'thresh:paddock')
h = applyEffect(h, { resolveEncounter: 'guard', ticks: 1 })
ok(!h.flags.packCalled, 'no Pack Call in round 1')
h = applyEffect(h, { resolveEncounter: 'guard', ticks: 1 })
ok(h.flags.packCalled && String(h.flags.encounterClash ?? '').includes(PACK_CALL_LINE), `Pack Call after round 2`)
// Win from here: set his Health to 0 and close.
const won = applyEffect({ ...h, flags: { ...h.flags, encounterDone: true } }, { unsetFlag: ['encounterHere', 'encounterDone', 'encounterKind', 'encounterHp', 'packCalled'] })
ok(won.flags.encounterHere && won.flags.encounterKind === 'packhound' && String(won.flash).includes(PACK_HOUND_LINE), 'hound fight follows the win')
ok(playCoverKey(won, getScene('thresh:paddock')) === 'seeker_hound_handler', 'hound uses handler art')
const fled = applyEffect({ ...h, flags: { ...h.flags, encounterFled: true } }, { unsetFlag: ['encounterHere', 'encounterKind'] })
ok(!fled.flags.encounterHere, 'running ends the chain')

// Turreted Skiff: Cartel road at Heat 6+, scavenger below.
const road = (heat: number) => roadHunterKind(g('prisoner', 'camp04', 'ch1:leave', { cartel: heat }, {}, { chapterId: 'cache-run' } as never), g('prisoner', 'camp04', 'ch1:p-pipe', { cartel: heat }, {}, { chapterId: 'cache-run' } as never))?.kind
ok(road(6) === 'skiff' && road(5) === 'scavenger', `skiff at 6 (${road(6)}, ${road(5)})`)
let ranOk = 0
for (let t = 0; t < 40 && !ranOk; t++) {
  const s = g('prisoner', 'camp04', 'ch1:p-pipe', { cartel: 6 }, {}, { ticks: t, sap: 6, health: 6 } as never)
  const f = { ...s, flags: { ...s.flags, ...fightStartFlags(s, 'skiff') } } as GameState
  const a = applyEffect(f, { resolveEncounter: 'run', ticks: 1 })
  if (a.flags.encounterFled) { ranOk = 1; ok(String(a.flags.encounterClash).includes(SKIFF_RUN_LINE) && (a.sap ?? 0) <= 5, 'run from skiff costs Sap, own line') }
}
ok(ranOk, 'a skiff run got away in 40 tries')

// Foreman: double-cross after the contract; the win opens Rig Guards with Overtime.
const deck = g('prisoner', 'camp04', 'deep:drill-deck', { cartel: 2 }, { rigContract: true }, { health: 6 } as never)
const dc = visibleChoices(deck).find((c) => c.id === 'doublecross')
ok(dc, 'double-cross shown after the contract')
ok(!visibleChoices(g('prisoner', 'camp04', 'deep:drill-deck')).some((c) => c.id === 'doublecross'), 'not before')
if (dc) {
  const a = applyEffect(deck, dc.effects)
  ok(a.flags.encounterKind === 'foreman' && a.flags.foremanFought, 'foreman fight')
  const w = applyEffect({ ...a, flags: { ...a.flags, encounterDone: true } }, { unsetFlag: ['encounterHere', 'encounterKind'] })
  ok(w.flags.encounterKind === 'rigguard' && String(w.flash).includes(OVERTIME_LINE), 'Rig Guards follow, Overtime line')
  ok(encounterSpec(w).strike === 4, 'Overtime Strike 4')
}
// Valve at Cartel Heat 4+: Rig Guards fight. Below 4: no fight.
const valve = (heat: number) => { const s = g('prisoner', 'camp04', 'deep:vents', { cartel: heat }, {}, { health: 6 } as never); const c = visibleChoices(s).find((x) => x.id === 'valve')!; return applyEffect(s, c.effects) }
ok(valve(4).flags.encounterKind === 'rigguard', 'valve at 4 brings guards')
ok(!valve(3).flags.encounterHere, 'valve at 3: no fight')

// Art.
const cov = (kind: string, sceneId: string) => playCoverKey(g('prisoner', 'camp04', sceneId, {}, { encounterHere: true, encounterKind: kind }), getScene(sceneId))
ok(cov('lockboss', 'deep:lock') === 'heavy_seeker', 'lock boss art')
ok(cov('seekerpatrol', 'thresh:sift') === 'patrol_squad', 'patrol squad art')
ok(cov('drilllead', 'deep:drill-deck') === 'drill_crew', 'drill crew art')
ok(cov('skiff', 'ch1:p-pipe') === 'turret_skiff' && cov('foreman', 'deep:drill-deck') === 'foreman_rig_guards', 'skiff + foreman art')

const cov2 = (s: GameState) => playCoverKey(s, getScene(s.sceneId))
// Follow-ups: Cartel handler Pack Call, ch2 skiff hunt, Heat card names, vent patrol art.
{
  const s0 = g('prisoner', 'camp04', 'camp:wire', { cartel: 3 }, {}, { health: 6 })
  let c = { ...s0, flags: { ...s0.flags, ...fightStartFlags(s0, 'handler'), encounterNoSkip: true } } as GameState
  c = applyEffect(c, { resolveEncounter: 'guard', ticks: 1 })
  c = applyEffect(c, { resolveEncounter: 'guard', ticks: 1 })
  ok(c.flags.packCalled, 'Cartel handler Pack Call')
  const cw = applyEffect({ ...c, flags: { ...c.flags, encounterDone: true } }, { unsetFlag: ['encounterHere', 'encounterDone', 'encounterKind', 'encounterHp', 'packCalled'] })
  ok(cw.flags.encounterKind === 'packhound' && cov2(cw) === 'handler', 'Cartel handler hound follows, Cartel art')
  const sk = (heat: number, scene: string, ch = 'into-the-maw') => ch2SkiffHunt(g('prisoner', 'redmaw', 'ch2:gate', { cartel: heat }, {}, { chapterId: ch } as never), g('prisoner', 'redmaw', scene, { cartel: heat }, {}, { chapterId: ch } as never))?.kind
  ok(sk(6, 'deep:rubble') === 'skiff' && sk(5, 'deep:rubble') === undefined && sk(6, 'ch2:v-scar') === undefined && sk(6, 'deep:rubble', 'cache-run') === undefined, 'ch2 skiff hunt')
  const hf = heatFactions()
  ok(hf.cartel.watch.includes('Turreted Skiff') && hf.seekers.watch.includes('Seeker Hound-Handler') && heatFactions('vessel').seekers.watch.includes('Seeker Hound-Handler'), 'Heat card names')
  ok(heatNow(g('vessel', 'threshold', 'thresh:paddock', { seekers: 4 }), 'seekers').includes('At the Threshold: a Seeker Hound-Handler.'), 'live handler line')
  ok(heatNow(g('prisoner', 'redmaw', 'deep:rubble', { cartel: 6 }), 'cartel').includes('In the rig: a Turreted Skiff.'), 'live skiff line')
  ok(cov('rigpatrol', 'deep:vents') === 'rig_vent_patrol', 'v209: vent patrol has its own art')
}
console.log(fails ? `v203: ${fails} FAIL` : 'v203: all ok')
process.exit(fails ? 1 : 0)

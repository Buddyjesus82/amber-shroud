import { applyDelta } from '../logic'
import { SPARE_SAP_LOCK } from '../sapLock'
import type { Choice, Cond, Effect, GameState, Scene } from '../types'
import { HEAVY_TOOL, VEIN_KEY } from './newPlaces'
import { FOREMAN_LINE, VALVE_GUARDS_LINE } from '../v203Lines'

// v200 DRAFT: Phase 2 deep camps (Jeramie's spec). Descriptions verbatim.
// Flash lines marked NEW await approval. Numbers marked PROPOSED map his 100-scale to Health 6 / Sap 8 / Heat 8.

export const RUBBLE_PICK = "You spend the energy, picking through the jagged seam block by block. It's slow work, but your hands stay clean and the salvage yields."
export const RUBBLE_FORCE = 'You wedge your shoulder against the loose slab and shove. The noise echoes down the corridor, and the rough concrete bites deep.'
export const RUBBLE_SAP = 'Sap −1.'
export const RUBBLE_HEALTH = 'Health −1.'
/** The Rubble Crawl is the Stray Rust-Pockets. Force raises the heat that route already uses. */
export const RUBBLE_HEAT = 'Stray Heat +1.'

const RUBBLE_LOOT = [
  { item: 'scrap' as const, line: 'Scrap +1.' },
  { item: 'salve' as const, line: 'Resin +1.' },
  { item: 'vial_drop' as const, line: 'Drop +1.' },
]

/** One of Scrap, Resin, or a Drop. Same seed as the rest of the crawl, so a reload does not reroll the seam. */
export function rubbleLoot(state: Pick<GameState, 'ticks' | 'sap' | 'sceneId' | 'flags'>): (typeof RUBBLE_LOOT)[number] {
  let h = (state.ticks * 17 + (state.sap + 3) * 13 + Number(state.flags.sceneSteps ?? 0)) >>> 0
  for (const ch of state.sceneId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return RUBBLE_LOOT[(h >>> 0) % RUBBLE_LOOT.length]
}

/** Stat lines land after the strip and the rescue, and a crisis flash is left alone. */
export function rubbleResolve(before: GameState, next: GameState, fx: Effect): GameState {
  if (!fx.flag?.rubblePick && !fx.flag?.rubbleForce) return next
  const flags = { ...next.flags }
  delete flags.rubblePick
  delete flags.rubbleForce
  next = { ...next, flags }
  const stayed = next.sceneId === 'deep:shanty' && !next.flags.runOver && !String(next.sceneId).startsWith('crisis:')
  if (fx.flag.rubblePick) {
    const loot = rubbleLoot(before)
    next = applyDelta(next, { add: { [loot.item]: 1 } })
    if (stayed) next.flash = [RUBBLE_PICK, RUBBLE_SAP, loot.line].join('\n')
    return next
  }
  if (stayed) next.flash = [RUBBLE_FORCE, RUBBLE_HEAT, RUBBLE_HEALTH].join('\n')
  return next
}
/** NEW */ export const SIFTER_REST = 'The fire is low and warm. Nobody bothers you.'
/** NEW */ export const SIPHON_TUNE_LINE = 'A scavenger seats the Module deeper and files the reservoir seal.\n\nSap Harvest +1.'
/** NEW */ export const SIPHON_TUNE_LOCK = 'Needs: the Memory Siphon in a Seeker Extractor, and 2 scrap'
/** NEW */ export const CONTRACT_LINE = 'You work a shift on the rams. The foreman pays in scrap and writes your face down. Cartel Heat +2.'
/** NEW */ export const PASSKEY_LINE = 'The foreman sells you a rig passage key.'
/** NEW */ export const VALVE_LINE = 'The valve screams. Every guard on the deck runs toward the steam. Cartel Heat −1.'
/** NEW */ export const VENTS_THROUGH = 'You time the bursts and slip past the valves.'
/** NEW */ export const VENTS_SPOTTED = "A rig guard sees you in the steam. 'Off the line!'"
/** NEW */ export const VEIN_APPROACH_BODY = 'The rig tunnel ends at the old seal on the Primary Vein.'
/** NEW */ export const VALERIUS_HOLDS = 'Valerius still holds the Shaft Foot.'
/** NEW */ export const OVERLOAD_LINE = 'The line shrieks and bursts. Amber sprays across the vats. Every lamp in the dig turns your way. Seeker Heat +2.'
/** NEW */ export const BOSS_LINE = 'A heavy Seeker in full plate steps out of the lock alcove. A resin maul, runes cut into the shell.'
/** NEW */ export const BOSS_WON = 'The heavy Seeker goes down against the frame. The lock gives under your weight.'
/** v209 NEW */ export const VALERIUS_ROUTE = 'Beat him at the Shaft Foot first: Drill Line, then Go on.'
/** NEW */ export const LOCK_RIBS = 'Valerius is still in the ribs behind you.'

const VALERIUS_CLEAR: Cond = { any: [{ flag: 'ch2Won_valerius' }, { flag: 'ribsCollapsed' }] }
const HAS_BLADE: Cond = { any: [{ item: 'seeker_extractor' }, { equipped: 'seeker_extractor' }] }

// Entry choices placed on the neighbor scenes.
/** After the collapse: any door's abyss foot, once Valerius is beaten or the ribs are down. */
export const rustPocketsEntry: Choice = { id: 'rustpockets', label: 'The Rust-Pockets', show: VALERIUS_CLEAR, effects: { goto: 'deep:rubble' } }
/** The Drill Line (after the drills) and the Shaft Foot. Prisoner route. */
export const rig04Entry = (show: Cond): Choice => ({ id: 'rig04', label: 'Sub-Surface Rig 04', show, effects: { goto: 'deep:drill-deck' } })
/** Cover Blown (after the drills). Vessel route. */
export const crucibleEntry: Choice = { id: 'crucible', label: 'Crucible Rig Beta', show: { flag: 'drillPast' }, effects: { goto: 'deep:crucible' } }

export const phase2Scenes: Scene[] = [
  // STRAYS: The Rust-Pockets
  {
    id: 'deep:rubble',
    kind: 'story',
    title: 'The Rubble Crawl',
    body: 'The passage is choked with split concrete and rusted lathe. Clear it with care or muscle past.',
    choices: [
      { id: 'squeeze', label: 'Pick through the Rubble', sub: '1 Sap.', effects: { sap: -1, goto: 'deep:shanty', flag: { rubblePick: true }, flash: RUBBLE_PICK } },
      { id: 'clear', label: 'Force a Clearance', sub: 'Needs a heavy tool.', enable: HEAVY_TOOL, locked: 'Needs: a heavy tool', effects: { health: -1, heat: { strays: 1 }, goto: 'deep:shanty', flag: { rubbleForce: true }, flash: RUBBLE_FORCE } },
    ],
  },
  {
    id: 'deep:shanty',
    kind: 'story',
    title: 'Sinking Shanty',
    body: 'Lanterns glow dim in makeshift shelters suspended over a dark drop. The deep Strays eye you warily from the shadows.',
    choices: [
      { id: 'rest', label: 'Rest by the Sifter Fire', sub: '+2 Health. Costs 1 Sap. Once a visit.', tone: 'quiet', show: { flagUnset: 'shantyRested' }, enable: { sapMin: 2 }, locked: SPARE_SAP_LOCK, effects: { health: 2, sap: -1, still: true, flag: { shantyRested: true }, flash: SIFTER_REST } },
      { id: 'anvil', label: 'Approach the Anvil', effects: { unsetFlag: ['shantyRested'], goto: 'deep:anvil' } },
    ],
  },
  {
    id: 'deep:anvil',
    kind: 'story',
    title: 'Black-Market Anvil',
    body: 'An illicit workshop built around a glowing thermal vent. Sparks fly as scavengers tune illegal core mods.',
    choices: [
      { id: 'tune', label: 'Tune Memory Siphon', sub: '2 scrap. Sap Harvest +1.', show: { all: [{ flagUnset: 'siphonTuned' }, { flag: 'hasSiphonModule' }] }, enable: { all: [HAS_BLADE, { item: 'memory_siphon' }, { itemMin: ['scrap', 2] }] }, locked: SIPHON_TUNE_LOCK, effects: { remove: { scrap: 2 }, flag: { siphonTuned: true }, flash: SIPHON_TUNE_LINE } },
      { id: 'cache', label: "Descend toward Kallik's Cache", sub: '1 Sap.', tone: 'hunger', effects: { sap: -1, goto: 'ch2:cache' } },
      { id: 'back', label: 'Back to the Shanty', tone: 'quiet', effects: { goto: 'deep:shanty' } },
    ],
  },

  // CARTEL: Sub-Surface Rig 04
  {
    id: 'deep:drill-deck',
    kind: 'story',
    title: 'Rig 04 Drill Deck',
    body: 'Piston rams hammer into the subterranean rock wall. High-pressure steam whistles through cracked iron piping.',
    choices: [
      { id: 'contract', label: 'Take High-Risk Rig Contract', sub: '3 scrap. Cartel Heat +2. Once.', tone: 'danger', show: { flagUnset: 'rigContract' }, effects: { add: { scrap: 3 }, heat: { cartel: 2 }, flag: { rigContract: true }, flash: CONTRACT_LINE } },
      // v203 (draft): no Operations Deck exists, so the Foreman comes when you double-cross the contract. NEW label and sub.
      { id: 'doublecross', label: 'Double-Cross the Rig Contract', sub: 'A fight: the foreman, then his Rig Guards. Win: 3 scrap. Once.', tone: 'danger', show: { all: [{ flag: 'rigContract' }, { flagUnset: 'rigCrossed' }] }, effects: { flag: { rigCrossed: true, foremanFought: true, ch2Fight: 'foreman' }, ambush: { kind: 'foreman', line: FOREMAN_LINE } } },
      { id: 'passkey', label: 'Buy Rig Passage Key', sub: '1 Sap.', show: { not: { item: 'rig_passkey' } }, enable: { sapMin: 2 }, locked: SPARE_SAP_LOCK, effects: { sap: -1, add: { rig_passkey: 1 }, flash: PASSKEY_LINE } },
      { id: 'vents', label: 'Pressure Vents', effects: { goto: 'deep:vents' } },
      { id: 'approach', label: 'The Primary Vein approach', sub: 'The rig passage key.', tone: 'hunger', enable: { item: 'rig_passkey' }, locked: 'Needs: the rig passage key', effects: { goto: 'deep:vein-approach' } },
      { id: 'back', label: 'Back to the Drill Line', tone: 'quiet', effects: { goto: 'ch2:p-drillrun' } },
    ],
  },
  {
    id: 'deep:vents',
    kind: 'story',
    title: 'Pressure Vents',
    body: 'Superheated steam valves holding back toxic gas from the lower shafts.',
    choices: [
      { id: 'valve', label: 'Blow Steam Valve', sub: 'Cartel Heat −1. Once.', show: { all: [{ flagUnset: 'rigDistracted' }, { heatMax: ['cartel', 3] }] }, effects: { heat: { cartel: -1 }, flag: { rigDistracted: true }, flash: VALVE_LINE } },
      // v203: at Cartel Heat 4+ the valve brings the Rig Guards. NEW sub.
      { id: 'valve', label: 'Blow Steam Valve', sub: 'Cartel Heat −1. Once. Rig Guards answer it: a fight.', tone: 'danger', show: { all: [{ flagUnset: 'rigDistracted' }, { heatMin: ['cartel', 4] }] }, effects: { heat: { cartel: -1 }, flag: { rigDistracted: true }, ambush: { kind: 'rigguard', line: `${VALVE_LINE}\n\n${VALVE_GUARDS_LINE}` } } },
      { id: 'bypass', label: 'Bypass Vents', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { flagUnset: 'rigDistracted' }, effects: { flag: { ventBypass: true }, goto: 'deep:vein-approach', flash: VENTS_THROUGH, sneak: { odds: 4, kind: 'rigpatrol', spotted: VENTS_SPOTTED, forfeit: true } } },
      { id: 'bypass', label: 'Bypass Vents', sub: 'The guards are at the valve. A sneak. If seen, a fight.', tone: 'danger', show: { flag: 'rigDistracted' }, effects: { flag: { ventBypass: true }, goto: 'deep:vein-approach', flash: VENTS_THROUGH, sneak: { odds: 2, kind: 'rigpatrol', spotted: VENTS_SPOTTED, forfeit: true } } },
      { id: 'back', label: 'Back to the Drill Deck', tone: 'quiet', effects: { goto: 'deep:drill-deck' } },
    ],
  },
  {
    id: 'deep:vein-approach',
    kind: 'story',
    title: 'Primary Vein Approach',
    body: VEIN_APPROACH_BODY,
    choices: [
      { id: 'vein', label: 'The Primary Vein', sub: "Thalia's code or Kaelen's shim.", tone: 'hunger', show: VALERIUS_CLEAR, enable: VEIN_KEY, locked: "Sealed. You need Thalia's code or Kaelen's shim.", effects: { goto: 'ch2:vein' } },
      { id: 'vein-held', label: 'The Primary Vein', tone: 'hunger', show: { not: VALERIUS_CLEAR }, enable: VALERIUS_CLEAR, locked: `${VALERIUS_HOLDS} ${VALERIUS_ROUTE}`, effects: { goto: 'ch2:vein' } },
      { id: 'back', label: 'Back to the Drill Deck', tone: 'quiet', effects: { goto: 'deep:drill-deck' } },
    ],
  },

  // SEEKERS: Crucible Rig Beta
  {
    id: 'deep:crucible',
    kind: 'story',
    title: 'Resin Crucible Beta',
    body: 'Vats of golden amber resin simmer under heavy Seeker guard. High-pressure lines feed down into the deep Spire roots.',
    choices: [
      { id: 'overload', label: 'Overload Crucible Line', sub: 'Seeker Heat +2. Once.', tone: 'danger', show: { flagUnset: 'crucibleBlown' }, effects: { heat: { seekers: 2 }, flag: { crucibleBlown: true }, flash: OVERLOAD_LINE } },
      { id: 'lock', label: 'Advance to Containment Lock', tone: 'hunger', effects: { goto: 'deep:lock' } },
      { id: 'back', label: 'Back to Cover Blown', tone: 'quiet', effects: { goto: 'ch2:v-blown' } },
    ],
  },
  {
    id: 'deep:lock',
    kind: 'story',
    title: 'Spire Root Containment Lock',
    body: 'A massive reinforced pressure door blocking access to the Bleached Heart. Heavy runes pulsate across the frame.',
    choices: [
      { id: 'bargain', label: "Present Thalia's Clearance", sub: "Thalia's Bargain.", tone: 'hunger', show: { flag: 'hasBargainFlag' }, enable: VALERIUS_CLEAR, locked: LOCK_RIBS, effects: { goto: 'ch2:heart' } },
      { id: 'shim', label: 'Bypass Lock with Wire-Cutter Shim', sub: "Kaelen's Shim.", tone: 'hunger', show: { item: 'wire_cutter_shim' }, enable: VALERIUS_CLEAR, locked: LOCK_RIBS, effects: { goto: 'ch2:heart' } },
      { id: 'force', label: 'Brute-Force Lock', sub: 'A heavy Seeker fight. After Valerius.', tone: 'danger', show: { flagUnset: 'ch2Won_lockboss' }, enable: { flag: 'ch2Won_valerius' }, locked: LOCK_RIBS, effects: { flag: { ch2Fight: 'lockboss' }, ambush: { kind: 'lockboss', line: BOSS_LINE } } },
      { id: 'through', label: 'Through the lock', tone: 'hunger', show: { flag: 'ch2Won_lockboss' }, effects: { goto: 'ch2:heart', flash: BOSS_WON } },
      { id: 'back', label: 'Back to the Crucible', tone: 'quiet', effects: { goto: 'deep:crucible' } },
    ],
  },
]

import type { Choice, Scene } from '../types'

// v200 DRAFT: Phase 1 pre-Maw surface camps (Jeramie's spec). Descriptions verbatim.
// Flash lines marked NEW await approval. Numbers marked PROPOSED map his 100-scale to Health 6 / Sap 8.

/** NEW */ export const BRIBE_FOREMAN = 'The foreman pockets it. He will remember your face. Cartel Heat +1.'
/** NEW */ export const MANIFEST_TAKEN = 'The duty manifest is yours. It reads as a Cartel pass.'
/** NEW */ export const MANIFEST_SPOTTED = "A mercenary sees the manifest leave the desk. 'Thief at the gate!'"
/** NEW */ export const VENTS_LINE = 'The shafts blister your hands and knees. You drop out by the Wire, unlogged.'
/** NEW */ export const PASS_LINE = 'The guard reads the pass and waves you through.'
/** NEW */ export const TRIBUTE_LINE = 'A Stray takes the Sap and steps aside.'
/** NEW */ export const KIN_LINE = 'They know an Outcast when they see one. You may pass.'
/** NEW */ export const KIN_LOCK = 'The Strays do not know you. Stray Heat must be 2 or less.'
/** NEW */ export const PLATING_LINE = 'You pry loose a sheet of heat shielding.'
/** NEW */ export const STORM_MAP_LINE = 'The map marks where the wind turns. The road to Hound Sign is shorter now.'
/** NEW */ export const OFFICER_LINE = 'The duty officer palms it and looks away.'
/** NEW */ export const RATIONS_LINE = 'A ration crate comes away under the tarp.'
/** NEW */ export const RATIONS_SPOTTED = "An officer turns. 'Hands off the crates!'"

const road = (id: string, label: string, goto: string, sap = 1, extra: Partial<Choice> = {}): Choice => ({ id, label, sub: `${sap} Sap.`, ...extra, effects: { sap: -sap, goto } })

// Entry choices placed on the neighbor scenes.
export const cartelEntry = road('outpost09', 'Cartel Logging Outpost 09', 'camp:sift-gate')
export const dustEyeEntry = road('dusteye', 'Dust-Eye Ridge', 'spine:dugouts')
export const echoEntry = road('echo', 'Forward Observation Post Echo', 'thresh:echo-gate')

const houndRoad = (id: string): Choice[] => [
  { id, label: 'Hound Sign', sub: '2 Sap.', show: { flagUnset: 'hasStormMap' }, effects: { sap: -2, unsetFlag: ['dustEyeRested'], goto: 'spine:hound' } },
  { id: `${id}-map`, label: 'Hound Sign', sub: '1 Sap. The Storm Guide Map.', show: { flag: 'hasStormMap' }, effects: { sap: -1, unsetFlag: ['dustEyeRested'], goto: 'spine:hound' } },
]

export const phase1Scenes: Scene[] = [
  // PRISONER: Cartel Logging Outpost 09
  {
    id: 'camp:sift-gate',
    hubId: 'camp04',
    kind: 'story',
    title: 'Sift-Works Gate',
    body: 'A lumbering timber-framed entry suspended over a deep pit. Heavily guarded by Cartel mercenaries.',
    choices: [
      { id: 'pass', label: 'Show the Cartel pass', show: { item: 'cartel_pass' }, effects: { goto: 'camp:log-deck', flash: PASS_LINE } },
      { id: 'bribe', label: 'Bribe the Foreman', sub: '1 Sap. Cartel Heat +1.', show: { not: { item: 'cartel_pass' } }, effects: { sap: -1, heat: { cartel: 1 }, goto: 'camp:log-deck', flash: BRIBE_FOREMAN } },
      { id: 'manifest', label: 'Steal Duty Manifest', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { not: { item: 'cartel_pass' } }, effects: { add: { cartel_pass: 1 }, goto: 'camp:log-deck', flash: MANIFEST_TAKEN, sneak: { odds: 4, kind: 'patrol', spotted: MANIFEST_SPOTTED } } },
      { id: 'vents', label: 'Logging Vents', effects: { goto: 'camp:log-vents' } },
      { id: 'back', label: 'Back to Skiff Bay', sub: '1 Sap.', tone: 'quiet', effects: { sap: -1, goto: 'camp:bay' } },
    ],
  },
  {
    id: 'camp:log-vents',
    hubId: 'camp04',
    kind: 'story',
    title: 'Logging Vents',
    body: 'Narrow, heat-blasted exhaustion shafts bypassing the main gate.',
    choices: [
      { id: 'crawl', label: 'Crawl through Vents', sub: 'Health 2. No Heat.', tone: 'danger', effects: { health: -2, goto: 'camp:wire', flash: VENTS_LINE } },
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'camp:sift-gate' } },
    ],
  },
  {
    id: 'camp:log-deck',
    hubId: 'camp04',
    kind: 'story',
    title: 'Logging Deck & Market',
    body: 'Derrick cranes hum as raw resin-soaked timber is sawn into construction beams.',
    choices: [
      { id: 'salve', label: 'Trade Scrap for Basic Supplies: Resin Salve', sub: '1 Scrap.', group: 'buy', enable: { item: 'scrap' }, locked: 'Need 1 scrap', effects: { remove: { scrap: 1 }, add: { salve: 1 } } },
      { id: 'drop', label: 'Trade Scrap for Basic Supplies: a Drop', sub: '2 Scrap. Needs an empty vial.', group: 'buy', enable: { all: [{ itemMin: ['scrap', 2] }, { item: 'vial_empty' }] }, locked: 'Need 2 scrap and an empty vial', effects: { remove: { scrap: 2, vial_empty: 1 }, add: { vial_drop: 1 } } },
      road('wire', 'Head toward the Wire Perimeter', 'camp:wire'),
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'camp:sift-gate' } },
    ],
  },
  // OUTCAST: Dust-Eye Ridge
  {
    id: 'spine:dugouts',
    hubId: 'spine',
    kind: 'story',
    title: 'Stray Dugouts',
    body: 'Subterranean burrows masked by wind-traps and bone totems. The Strays watch you with open suspicion.',
    choices: [
      { id: 'tribute', label: 'Offer Sap Tribute', sub: '1 Sap.', effects: { sap: -1, goto: 'spine:dusteye', flash: TRIBUTE_LINE } },
      { id: 'kin', label: 'Claim Outcast Kinship', sub: 'Outcasts with Stray Heat 2 or less.', enable: { all: [{ door: 'outcast' }, { heatMax: ['strays', 2] }] }, locked: KIN_LOCK, effects: { goto: 'spine:dusteye', flash: KIN_LINE } },
      { id: 'wreck', label: 'Skimmer Wreckage', effects: { goto: 'spine:skimmer' } },
      { id: 'back', label: 'Back to the Dry Well', sub: '1 Sap.', tone: 'quiet', effects: { sap: -1, goto: 'spine:well' } },
    ],
  },
  {
    id: 'spine:skimmer',
    hubId: 'spine',
    kind: 'story',
    title: 'Skimmer Wreckage',
    body: 'The stripped husk of an old sand-skimmer lodged in the rock face.',
    choices: [
      { id: 'salvage', label: 'Salvage Heat Shielding', show: { flagUnset: 'skimmerSalvaged' }, effects: { add: { skimmer_plating: 1 }, flag: { skimmerSalvaged: true }, flash: PLATING_LINE } },
      ...houndRoad('hound'),
      { id: 'back', label: 'Back to the Dugouts', tone: 'quiet', effects: { goto: 'spine:dugouts' } },
    ],
  },
  {
    id: 'spine:dusteye',
    hubId: 'spine',
    kind: 'story',
    title: 'Dust-Eye Trading Post',
    body: 'Nomadic hunters swap storm reports, dried meats, and rare dune relics.',
    choices: [
      { id: 'map', label: 'Buy Storm Guide Map', sub: '2 Scrap.', group: 'buy', show: { flagUnset: 'hasStormMap' }, enable: { itemMin: ['scrap', 2] }, locked: 'Need 2 scrap', effects: { remove: { scrap: 2 }, flag: { hasStormMap: true }, flash: STORM_MAP_LINE } },
      { id: 'rest', label: 'Rest in shelter (Heal)', sub: '+2 Health. Costs 1 Sap. Once a visit.', tone: 'quiet', show: { flagUnset: 'dustEyeRested' }, enable: { sapMin: 2 }, locked: 'Needs: 2 Sap', effects: { health: 2, sap: -1, still: true, flag: { dustEyeRested: true } } },
      ...houndRoad('hound'),
      { id: 'back', label: 'Back to the Dugouts', tone: 'quiet', effects: { goto: 'spine:dugouts' } },
    ],
  },
  // VESSEL: Forward Observation Post Echo
  {
    id: 'thresh:echo-gate',
    hubId: 'threshold',
    kind: 'story',
    title: 'Post Echo Gate',
    body: 'A fortified iron-gated palisade bristling with floodlights and Seeker archers.',
    choices: [
      { id: 'creds', label: 'Present Vessel Credentials', sub: 'A Vessel lie. At Seeker Heat 6+ it can be seen through.', effects: { ruse: true, goto: 'thresh:parade' } },
      { id: 'bribe', label: 'Bribe Duty Officer', sub: '1 Sap.', effects: { sap: -1, goto: 'thresh:parade', flash: OFFICER_LINE } },
      { id: 'conduits', label: 'Drainage Conduits', effects: { goto: 'thresh:conduits' } },
      { id: 'back', label: 'Back to the Guard Post', sub: '1 Sap.', tone: 'quiet', effects: { sap: -1, goto: 'thresh:guard' } },
    ],
  },
  {
    id: 'thresh:conduits',
    hubId: 'threshold',
    kind: 'story',
    title: 'Drainage Conduits',
    body: 'Sludge-filled overflow pipes running beneath the garrison wall.',
    choices: [
      road('navigate', 'Navigate Conduits', 'thresh:court'),
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'thresh:echo-gate' } },
    ],
  },
  {
    id: 'thresh:parade',
    hubId: 'threshold',
    kind: 'story',
    title: 'Garrison Parade',
    body: 'Seeker squads drill under strict officer supervision. Supply crates sit stacked under canvas tarps.',
    choices: [
      { id: 'rations', label: 'Steal Seeker Rations', sub: 'Seeker Heat +1. A sneak. If seen, a fight.', tone: 'danger', show: { flagUnset: 'rationsStolen' }, effects: { add: { seeker_rations: 1 }, heat: { seekers: 1 }, flag: { rationsStolen: true }, flash: RATIONS_LINE, sneak: { odds: 3, kind: 'seekerpatrol', spotted: RATIONS_SPOTTED } } },
      road('court', 'Head toward Threshold Court', 'thresh:court'),
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'thresh:echo-gate' } },
    ],
  },
]

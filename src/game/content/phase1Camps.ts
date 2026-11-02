import type { Choice, Scene } from '../types'

// v200 DRAFT: Phase 1 pre-Maw surface camps (Jeramie's FINAL polish spec). Descriptions verbatim.
// Action ids follow his spec. Flash lines marked NEW await approval. Numbers marked PROPOSED are not in his spec.

/** NEW */ export const BRIBE_FOREMAN = 'The foreman pockets it and waves you onto the deck.'
/** NEW */ export const MANIFEST_TAKEN = 'The duty manifest is yours. It reads as a Cartel pass.'
/** NEW */ export const MANIFEST_SPOTTED = "A mercenary sees the manifest leave the desk. 'Thief at the gate!'"
/** NEW */ export const VENTS_LINE = 'The shafts blister your hands and knees. You drop out at Skiff Bay, unlogged.'
/** NEW */ export const PASS_LINE = 'The guard reads the pass and waves you through.'
/** NEW */ export const TRIBUTE_LINE = 'A Stray takes the Sap and steps aside.'
/** NEW */ export const KIN_LINE = 'The Strays know your face. You may pass.'
/** NEW */ export const KIN_LOCK = 'The Strays do not know you. Stray Heat must be 2 or less.'
/** NEW */ export const PLATING_LINE = 'You pry loose a sheet of heat shielding.'
/** NEW */ export const OFFICER_LINE = 'The clerk palms it and looks away.'
/** NEW */ export const CONDUITS_LINE = 'You wade the sludge under the wall and come up inside Threshold Court.'
/** NEW */ export const CONDUITS_SPOTTED = "A lamp swings down the pipe. 'Who is in the drain?'"
/** NEW */ export const RATIONS_LINE = 'A ration crate comes away under the tarp.'
/** NEW */ export const RATIONS_SPOTTED = "An officer turns. 'Hands off the crates!'"

const road = (id: string, label: string, goto: string, sap = 1, extra: Partial<Choice> = {}): Choice => ({ id, label, sub: `${sap} Sap.`, ...extra, effects: { sap: -sap, goto } })

// Entry roads placed on the neighbor scenes: Guard Station, Dry Well, Guard Post.
export const cartelEntry = road('outpost09', 'Cartel Logging Outpost 09', 'camp:sift-gate')
export const dustEyeEntry = road('dusteye', 'Dust-Eye Ridge', 'spine:dugouts')
export const echoEntry = road('echo', 'Forward Observation Post Echo', 'thresh:echo-gate')

const bayRoad = road('skiffbay', 'Skiff Bay', 'camp:bay')
const houndRoad: Choice = { id: 'hound', label: 'Hound Sign', sub: '2 Sap.', effects: { sap: -2, unsetFlag: ['dustEyeRested'], goto: 'spine:hound' } }
const courtRoad = road('court', 'Threshold Court', 'thresh:court')

export const phase1Scenes: Scene[] = [
  // PRISONER (west): Guard Station -> Cartel Logging Outpost 09 -> Skiff Bay
  {
    id: 'camp:sift-gate',
    hubId: 'camp04',
    kind: 'story',
    title: 'Sift-Works Gate',
    body: 'A lumbering timber-framed entry suspended over a deep pit. Heavily guarded by Cartel mercenaries.',
    choices: [
      { id: 'pass', label: 'Show the Cartel pass', show: { item: 'cartel_pass' }, effects: { goto: 'camp:log-deck', flash: PASS_LINE } },
      { id: 'bribe_foreman', label: 'Bribe the Foreman', sub: '1 Sap.', show: { not: { item: 'cartel_pass' } }, effects: { sap: -1, goto: 'camp:log-deck', flash: BRIBE_FOREMAN } },
      { id: 'steal_manifest', label: 'Steal Duty Manifest', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { not: { item: 'cartel_pass' } }, effects: { add: { cartel_pass: 1 }, goto: 'camp:log-deck', flash: MANIFEST_TAKEN, sneak: { odds: 4, kind: 'patrol', spotted: MANIFEST_SPOTTED } } },
      { id: 'vents', label: 'Logging Vents', effects: { goto: 'camp:log-vents' } },
      { id: 'back', label: 'Back to the Guard Station', sub: '1 Sap.', tone: 'quiet', effects: { sap: -1, goto: 'camp:guard' } },
    ],
  },
  {
    id: 'camp:log-vents',
    hubId: 'camp04',
    kind: 'story',
    title: 'Logging Vents',
    body: 'Narrow, heat-blasted exhaustion shafts bypassing the main gate.',
    choices: [
      { id: 'crawl_vents', label: 'Crawl through Vents', sub: 'Health 2.', tone: 'danger', effects: { health: -2, goto: 'camp:bay', flash: VENTS_LINE } },
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'camp:sift-gate' } },
    ],
  },
  {
    id: 'camp:log-deck',
    hubId: 'camp04',
    kind: 'story',
    title: 'Logging Deck & Market',
    body: 'Derrick cranes hum as raw resin-soaked timber is sawn into construction beams.',
    choices: [bayRoad, { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'camp:sift-gate' } }],
  },
  // OUTCAST (north): Dry Well -> Dust-Eye Ridge -> Hound Sign
  {
    id: 'spine:dugouts',
    hubId: 'spine',
    kind: 'story',
    title: 'Stray Dugouts',
    body: 'Subterranean burrows masked by wind-traps and bone totems. The Strays watch you with open suspicion.',
    choices: [
      { id: 'offer_sap', label: 'Offer Sap Tribute', sub: '1 Sap.', effects: { sap: -1, goto: 'spine:dusteye', flash: TRIBUTE_LINE } },
      { id: 'rep_check', label: 'Claim Outcast Kinship', sub: 'Stray Heat 2 or less.', enable: { heatMax: ['strays', 2] }, locked: KIN_LOCK, effects: { goto: 'spine:dusteye', flash: KIN_LINE } },
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
      { id: 'salvage_part', label: 'Salvage Heat Shielding', show: { flagUnset: 'skimmerSalvaged' }, effects: { add: { skimmer_plating: 1 }, flag: { skimmerSalvaged: true }, flash: PLATING_LINE } },
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
      { id: 'rest_dugout', label: 'Rest in the dugout', sub: '+2 Health. Costs 1 Sap. Once a visit.', tone: 'quiet', show: { flagUnset: 'dustEyeRested' }, enable: { sapMin: 2 }, locked: 'Needs: 2 Sap', effects: { health: 2, sap: -1, still: true, flag: { dustEyeRested: true } } },
      houndRoad,
      { id: 'back', label: 'Back to the Dugouts', tone: 'quiet', effects: { goto: 'spine:dugouts' } },
    ],
  },
  // VESSEL (southeast): Guard Post -> Forward Observation Post Echo -> Threshold Court
  {
    id: 'thresh:echo-gate',
    hubId: 'threshold',
    kind: 'story',
    title: 'Vanguard Gate',
    body: 'A fortified iron-gated palisade bristling with floodlights and Seeker archers.',
    choices: [
      { id: 'bribe_clerk', label: 'Bribe the Clerk', sub: '1 Sap.', effects: { sap: -1, goto: 'thresh:parade', flash: OFFICER_LINE } },
      { id: 'conduits', label: 'Drain Conduits', effects: { goto: 'thresh:conduits' } },
    ],
  },
  {
    id: 'thresh:conduits',
    hubId: 'threshold',
    kind: 'story',
    title: 'Drain Conduits',
    body: 'Sludge-filled overflow pipes running beneath the garrison wall.',
    choices: [
      { id: 'sneak_conduits', label: 'Sneak through the Conduits', sub: 'A sneak. If seen, a fight.', tone: 'danger', effects: { goto: 'thresh:court', flash: CONDUITS_LINE, sneak: { odds: 4, kind: 'seekerpatrol', spotted: CONDUITS_SPOTTED } } },
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
      { id: 'scavenge_supplies', label: 'Scavenge Supplies', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { flagUnset: 'rationsStolen' }, effects: { add: { seeker_rations: 1 }, flag: { rationsStolen: true }, flash: RATIONS_LINE, sneak: { odds: 3, kind: 'seekerpatrol', spotted: RATIONS_SPOTTED } } },
      courtRoad,
    ],
  },
]

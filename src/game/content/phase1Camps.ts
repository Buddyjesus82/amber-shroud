import type { Choice, Scene } from '../types'
import { SABLE_WAVE1 } from '../encounterLines'

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

// v205 DRAFT: the party. Jeramie's scripts (t1043u, t1044u), verbatim. Lines marked NEW await approval.
export const ORLA_BODY = 'A figure crouches behind a stack of rusted skiff plating, her hand hovering over a crude, resin-smeared wedge. Gilded sand coats her scarf, but her eyes are sharp as broken glass.'
export const ORLA_SAYS = "Easy with the boots. You step on the wrong grate out here, and the Cartel's sift-rigs will hear us before you finish your next breath. You looking for a way past the perimeter, or just looking to die cold?"
export const HESTER_BODY = 'A tall guard in a woven reed hat stands across the narrow dugout ledge, a heavy leather pauldron anchored across her shoulder. Her gaze drills into you as you approach.'
export const HESTER_SAYS = "Halt your stride. The Dugouts don't welcome unvouched boots, and the ridge elders aren't in a forgiving mood today. State your business before my steel does the talking."
export const SABLE_BODY = 'A woman in a ruined shimmer-cloak stands over the fresh corpse of a Stray Collector, holding a brass-housed optical lens that pulses with pale violet light. High on the ridge, warning horns blow.'
export const SABLE_SAYS = "Don't move! ...Wait. You're not with the elder's raiding party. Look, we have about twenty seconds before their secondary squad flushes this trench. Help me drop them, or we both get buried here."

export const BREACH_BODY = 'A gaunt figure slumps against a rust-caked drain pipe, his boots resting in sludge. Blood slickens his fingers, which remain locked around a silver data cylinder. His breath comes in ragged, wheezing rattles.'
export const BREACH_PLEA = "Seekers... at the ridge... They cut down the whole line... but they didn't get the cylinder... Kelt needs this data at the Oasis reserve... Get me there... before my breath runs out, or the reserve stays buried..."
export const OASIS_BODY = 'The oppressive subterranean heat gives way to cool, damp air smelling of raw resin. Behind a tangle of glowing petrified roots, an ancient pre-collapse terminal hums softly.'
/** NEW */ export const SUBDRAIN_BODY = 'The overflow pipes narrow to a crawlway below the conduits.'
/** NEW */ export const RUNNER_STUB = 'Trade and rumors: not yet.'
/** NEW */ export const PRY_LINE = 'Sealed Data Cylinder +1. Cartel Heat +1. Seeker Heat +1.'
const q = (t: string) => `"${t}"`
const recruitable = (id: string): import('../types').Cond[] => [{ not: { flagEq: ['companion', id] } }, { flagUnset: `companionLost_${id}` }]
const keltOpen = { flagUnset: 'keltStatus' }
const keltOn = { flagEq: ['keltStatus', 'active'] as [string, string] }

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
      { id: 'steal_manifest', label: 'Steal Duty Manifest', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { not: { item: 'cartel_pass' } }, effects: { add: { cartel_pass: 1 }, goto: 'camp:log-deck', flash: MANIFEST_TAKEN, sneak: { odds: 4, kind: 'patrol', spotted: MANIFEST_SPOTTED, forfeit: true } } },
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
    choices: [
      // v205: Orla Lusk, among the fringe scrap heaps. Prisoner only.
      { id: 'orla', label: 'Orla Lusk', show: { all: [{ door: 'prisoner' }, ...recruitable('orla')] }, effects: { goto: 'camp:orla' } },
      bayRoad,
      { id: 'back', label: 'Back to the gate', tone: 'quiet', effects: { goto: 'camp:sift-gate' } },
    ],
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
      // v205: Hester Ellery on the dugout ledge. Outcast only.
      { id: 'hester', label: 'Hester Ellery', show: { all: [{ door: 'outcast' }, ...recruitable('hester')] }, effects: { goto: 'spine:hester' } },
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
      { id: 'breach', label: 'Conduit Drain Breach', show: keltOpen, effects: { goto: 'thresh:breach' } },
      // v205: the hidden branch. Open while Kelt's Runner is escorted, and for good once he has made it.
      { id: 'subdrain', label: 'Conduit Sub-Drain', show: { any: [keltOn, { flagEq: ['keltStatus', 'completed'] }] }, effects: { goto: 'thresh:subdrain' } },
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
      { id: 'scavenge_supplies', label: 'Scavenge Supplies', sub: 'A sneak. If seen, a fight.', tone: 'danger', show: { flagUnset: 'rationsStolen' }, effects: { add: { seeker_rations: 1 }, flag: { rationsStolen: true }, flash: RATIONS_LINE, sneak: { odds: 6, kind: 'seekerpatrol', spotted: RATIONS_SPOTTED, forfeit: true } } },
      courtRoad,
    ],
  },
  // v205: Kelt's Runner. Node 1, the hidden Sub-Drain, and Node 3.
  {
    id: 'thresh:breach',
    hubId: 'threshold',
    kind: 'story',
    title: 'Conduit Drain Breach',
    body: `${BREACH_BODY}\n\n"${BREACH_PLEA}"`,
    choices: [
      { id: 'escort', label: 'Stabilize Wounds', sub: "Spend 1× Sap to stabilize his breath. Adds Kelt's Runner to party. Sets Health to 3, Timer to 6 scenes.", show: keltOpen, enable: { sapMin: 2 }, locked: 'Needs: 2 Sap', effects: { sap: -1, recruit: 'kelt', recruitHp: 3, flag: { keltStatus: 'active', keltScenes: 0, keltMax: 6, keltHpMax: 3 }, flash: q('Ahhh... the pulse... it\'s holding... Move fast... every second counts...') } },
      { id: 'as_is', label: 'Take Him As-Is', sub: "Take him as-is. Adds Kelt's Runner to party. Sets Health to 2, Timer to 4 scenes.", show: keltOpen, effects: { recruit: 'kelt', recruitHp: 2, flag: { keltStatus: 'active', keltScenes: 0, keltMax: 4, keltHpMax: 2 }, flash: q("I'm on my feet... don't stop... whatever you do, don't stop...") } },
      { id: 'pry', label: 'Pry Cylinder from His Hands', sub: q("You're not going to make it. Give me the cylinder."), tone: 'danger', show: keltOpen, effects: { add: { sealed_data_cylinder: 1 }, heat: { cartel: 1, seekers: 1 }, flag: { keltStatus: 'failed', keltPried: true }, flash: `${q('No! Kelt... forgive me...')}\n\n${PRY_LINE}` } },
      { id: 'leave', label: 'Leave Him in the Sludge', tone: 'quiet', show: keltOpen, effects: { goto: 'thresh:conduits' } },
      { id: 'subdrain', label: 'Conduit Sub-Drain', show: keltOn, effects: { goto: 'thresh:subdrain' } },
      { id: 'back', label: 'Back to the Conduits', tone: 'quiet', show: { not: keltOpen }, effects: { goto: 'thresh:conduits' } },
    ],
  },
  {
    id: 'thresh:subdrain',
    hubId: 'threshold',
    kind: 'story',
    title: 'Conduit Sub-Drain',
    body: SUBDRAIN_BODY,
    choices: [
      { id: 'oasis', label: 'Oasis Sap Reserve', effects: { goto: 'thresh:oasis' } },
      { id: 'back', label: 'Back to the Conduits', tone: 'quiet', effects: { goto: 'thresh:conduits' } },
    ],
  },
  {
    id: 'thresh:oasis',
    hubId: 'threshold',
    kind: 'place',
    title: 'Oasis Sap Reserve',
    body: OASIS_BODY,
    choices: [
      { id: 'runner', label: "Kelt's Runner", show: { flagEq: ['keltStatus', 'completed'] }, enable: { flag: '__never__' }, locked: RUNNER_STUB, effects: {} },
      { id: 'back', label: 'Back to the Sub-Drain', tone: 'quiet', effects: { goto: 'thresh:subdrain' } },
    ],
  },
  {
    id: 'camp:orla',
    hubId: 'camp04',
    kind: 'story',
    title: 'Orla Lusk',
    body: `${ORLA_BODY}\n\n${q(ORLA_SAYS)}`,
    choices: [
      { id: 'orla_ration', label: 'Share Rations', sub: 'Cost: 1× seeker_ration. Adds Orla Lusk to party.', show: { all: recruitable('orla') }, enable: { item: 'seeker_rations' }, locked: 'Needs: Seeker Rations', effects: { remove: { seeker_rations: 1 }, recruit: 'orla', goto: 'camp:log-deck', flash: q("Real food? Haven't tasted non-silted grit in three shifts. Alright, stranger. Keep your head down—I'll point out the loose rust before we step on it.") } },
      { id: 'orla_pass', label: 'Hand Over Duty Manifest', sub: q("I've got a Cartel shift ledger. You know how to read their patrol rotas?"), show: { all: recruitable('orla') }, enable: { item: 'cartel_pass' }, locked: 'Needs: Duty Manifest', effects: { remove: { cartel_pass: 1 }, recruit: 'orla', goto: 'camp:log-deck', flash: q("Where'd you lift this? This is next shift's roster! Hell yes I can read it. Stick with me, and we'll walk right under their noses.") } },
      { id: 'orla_alone', label: 'Move Alone', sub: q('Stay out of my way.'), tone: 'quiet', effects: { goto: 'camp:log-deck', flash: q('Your funeral. Watch the tripwires near the bay.') } },
    ],
  },
  {
    id: 'spine:hester',
    hubId: 'spine',
    kind: 'story',
    title: 'Hester Ellery',
    body: `${HESTER_BODY}\n\n${q(HESTER_SAYS)}`,
    choices: [
      { id: 'hester_free', label: "Hester's Vouch", sub: q("I'm trying to cross the basin without bleeding for every yard."), show: { all: [{ heatMax: ['strays', 2] }, ...recruitable('hester')] }, effects: { recruit: 'hester', goto: 'spine:dusteye', flash: q("You don't smell like a Cartel enforcer, and your hands aren't stained with Seeker resin. I'll walk the line with you. Keep your blade sheathed, and the Strays won't touch you.") } },
      { id: 'hester_pay', label: 'Pay Vouch Toll', sub: `${q("I'll pay for your protection.")} 2 Sap.`, show: { all: [{ heatMin: ['strays', 3] }, ...recruitable('hester')] }, enable: { sapMin: 3 }, locked: 'Needs: 3 Sap', effects: { sap: -2, recruit: 'hester', goto: 'spine:dusteye', flash: q('Sap talks louder than promises on this ridge. Alright. I\'ll clear your name with the perimeter watches. Move out.') } },
      { id: 'hester_decline', label: 'Decline', sub: q("I'll find my own path."), tone: 'quiet', effects: { goto: 'spine:dusteye', flash: q("Then watch the horizon. The sand-collectors won't ask twice.") } },
    ],
  },
  {
    id: 'spine:sable',
    hubId: 'spine',
    kind: 'story',
    title: 'Sable Varn',
    body: `${SABLE_BODY}\n\n${q(SABLE_SAYS)}`,
    choices: [
      { id: 'sable_stand', label: 'Stand Together', sub: 'Draw your weapon. A hard fight: two waves of Stray Collectors (3/1/2 back-to-back).', tone: 'danger', show: { flagUnset: 'sableWon' }, effects: { flag: { sableFight: true, sableWave: 1 }, ambush: { kind: 'sablewave', line: SABLE_WAVE1 } } },
      { id: 'sable_recruit', label: 'Take Sable Varn Along', sub: 'Adds Sable Varn to party.', show: { all: [{ flag: 'sableWon' }, ...recruitable('sable')] }, effects: { recruit: 'sable', goto: 'spine:shattered' } },
      { id: 'sable_refuse', label: 'Refuse to Get Involved', sub: q("That's your fight, not mine."), tone: 'quiet', show: { flagUnset: 'sableWon' }, effects: { flag: { sableRefused: true }, goto: 'spine:shattered', flash: q('Coward. Enjoy getting lost in the dunes!') } },
      { id: 'back', label: 'Back to the Shattered Spine', tone: 'quiet', show: { flag: 'sableWon' }, effects: { goto: 'spine:shattered' } },
    ],
  },
]

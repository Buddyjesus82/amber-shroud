import type { Choice, Cond, Scene } from '../types'

// v199: the new places (plan.md, approved "Ship it"). Reached by choices; roads cost Sap on the choice.

export const VEIN_LOCKED = "Sealed. You need Thalia's code or Kaelen's shim."
/** Outcast and Vessel never meet Kaelen: the same line without his name. */
export const VEIN_LOCKED_NO_SHIM = "Sealed. You need Thalia's code."
/** Heavy enough to turn the lift gear: Scrap Buckler, Maw Plate (or plated pieces), iron scrap. v200: moved here for the Rubble Crawl. */
export const HEAVY_TOOL: Cond = { any: [{ item: 'scrap_buckler' }, { item: 'plated_buckler' }, { item: 'maw_plate' }, { item: 'plated_scav_wrap' }, { item: 'scrap' }] }
export const VEIN_KEY: Cond = { any: [{ flag: 'hasBargainFlag' }, { item: 'wire_cutter_shim' }] }
export const GATE_FOUND_GUARD = 'A scrawled maintenance log. The gate code is on it. Seeker Heat +1.'
export const GATE_FOUND_COURT = 'A discarded slate. The gate code is scratched into it. Seeker Heat +1.'
export const NOTHING_NEW = 'Nothing new here.'
export const THALIA_GUARD_LINE = 'Refusing her is a breach. Her guard is already moving.'
export const SCOUT_CAMP_LINE = 'The Scout Camp perimeter runs along the ridge.'
const OVERSEER_LINE = 'Overseer Valerius. Bald, scarred, steam baton in the fist. He came himself.'

/** Ch2 players reach the Tunnels from the approach; Ch1 players from the Rim. */
const inCh2: Cond = { flag: 'tunnelsFromCh2' }
const back = (id: string): Choice => ({ id: 'back', label: 'Back', tone: 'quiet', effects: { goto: id } })

/** Gate-code pickup: once per run, at the Guard Post and in the Court. */
export function gateCodeChoices(where: 'guard' | 'court'): Choice[] {
  const done = where === 'guard' ? 'gateGuardSearched' : 'gateSlateChecked'
  const label = where === 'guard' ? 'Search the guard post' : 'Check the discarded slate'
  return [
    {
      id: `code-${where}`,
      label,
      show: { all: [{ flagUnset: done }, { flagUnset: 'gateCode' }] },
      effects: { flag: { [done]: true, gateCode: true }, heat: { seekers: 1 }, flash: where === 'guard' ? GATE_FOUND_GUARD : GATE_FOUND_COURT },
    },
    {
      id: `code-${where}-none`,
      label,
      show: { all: [{ flagUnset: done }, { flag: 'gateCode' }] },
      effects: { flag: { [done]: true }, flash: NOTHING_NEW },
    },
  ]
}

export const gateEntry: Choice = { id: 'gate', label: 'Threshold Gate', effects: { goto: 'thresh:gate' } }

export const tunnelsEntry = (ch2: boolean): Choice => ({
  id: 'tunnels',
  label: 'The Tunnels Below',
  sub: '2 Sap.',
  effects: ch2 ? { sap: -2, flag: { tunnelsFromCh2: true }, goto: 'maw:tunnels' } : { sap: -2, unsetFlag: ['tunnelsFromCh2'], goto: 'maw:tunnels' },
})

export const campPlaceChoices = (from: 'cages' | 'valerius' | 'wire'): Choice[] => {
  const road = (id: string, label: string, goto: string): Choice => ({ id, label, sub: '1 Sap.', effects: { sap: -1, goto } })
  // v212: moving between Pens spots is free; Sap is for actions and for leaving the Pens.
  const free = (id: string, label: string, goto: string): Choice => ({ id, label, effects: { goto } })
  if (from === 'cages')
    return [
      free('overlook', "Warden's Overlook", 'camp:overlook'),
      free('siftline', 'Resin Sift Line', 'camp:siftline'),
      free('ration', 'Ration Line', 'camp:ration'),
      free('genpop', 'General Population Pens', 'camp:genpop'),
    ]
  if (from === 'valerius') return [road('overlook', "Warden's Overlook", 'camp:overlook')]
  return [road('ration', 'Ration Line', 'camp:ration')]
}

export const spinePlaceChoice: Choice = { id: 'shattered', label: 'The Shattered Spine', sub: '1 Sap.', effects: { sap: -1, goto: 'spine:shattered' } }

/** Hidden exit at Valerius's Outpost (Vessel). */
export const hiddenExitChoice: Choice = {
  id: 'thalia-exit',
  label: "Thalia's hidden exit",
  tone: 'hunger',
  show: { flag: 'hasBargainFlag' },
  effects: { goto: 'ch2:v-hidden' },
}

const sapRoad = (n: number) => ({ sap: -n })

export const newPlaceScenes: Scene[] = [
  // A. Outer Threshold
  {
    id: 'thresh:gate',
    hubId: 'threshold',
    kind: 'story',
    title: 'Threshold Gate',
    body: 'The gate is locked. It wants a code.',
    variants: [{ if: { flag: 'gateCode' }, mode: 'replace', body: 'The gate is locked. You have the code.' }],
    choices: [
      { id: 'code', label: 'Enter the code', sub: '1 Sap.', show: { flag: 'gateCode' }, effects: { ...sapRoad(1), goto: 'thresh:canyon' } },
      { id: 'command', label: 'Seeker Command', sub: '1 Sap.', show: { heatMax: ['seekers', 5] }, effects: { ...sapRoad(1), goto: 'thresh:command' } },
      { id: 'command-hot', label: 'Seeker Command', sub: '1 Sap.', tone: 'danger', show: { heatMin: ['seekers', 6] }, effects: { ...sapRoad(1), goto: 'thresh:command', ambush: { kind: 'overseer', line: OVERSEER_LINE } } },
      { id: 'back', label: 'Back to the Court', tone: 'quiet', effects: { goto: 'thresh:court' } },
    ],
  },
  {
    id: 'thresh:canyon',
    hubId: 'threshold',
    kind: 'story',
    title: 'Approach Canyon',
    body: "The canyon runs one way: toward the fallen spire. The Pilgrim's Scar and Red Maw lie northwest.",
    choices: [{ id: 'back', label: 'Back to the gate', sub: '1 Sap.', tone: 'quiet', effects: { ...sapRoad(1), goto: 'thresh:gate' } }],
  },
  {
    id: 'thresh:command',
    hubId: 'threshold',
    kind: 'story',
    title: 'Seeker Command',
    body: 'Seeker Command. Valerius keeps his maps here. The Seekers answer to him, and so does the Outpost.',
    choices: [
      { id: 'maps', label: 'Read the maps', sub: 'Seeker Heat +2.', tone: 'danger', effects: { heat: { seekers: 2 }, flash: 'The maps mark the Outpost and the Gullet.' } },
      { id: 'leave', label: 'Leave', tone: 'quiet', effects: { goto: 'thresh:gate' } },
    ],
  },
  // B. Camp-04
  {
    id: 'camp:overlook',
    hubId: 'camp04',
    kind: 'story',
    title: "Warden's Overlook",
    body: 'The Overlook watches the pens. Nothing in the yard moves unseen.',
    choices: [
      { id: 'take-map', label: 'Take the camp map', sub: 'Pinned under a rock.', tone: 'quiet', show: { flagUnset: 'camp04Map' }, effects: { flag: { camp04Map: true }, flash: 'A charcoal scrap of the whole camp. Every road is on it.' } },
      { id: 'watch', label: 'Watch the guard rotation', sub: 'Cartel Heat +1.', tone: 'danger', show: { flagUnset: 'guardRotation' }, effects: { heat: { cartel: 1 }, flag: { guardRotation: true } } },
      { id: 'pens', label: 'Holding Pens', tone: 'quiet', effects: { goto: 'camp:cages' } },
      { id: 'overseer', label: 'Overseer', sub: '1 Sap.', tone: 'quiet', effects: { ...sapRoad(1), goto: 'camp:valerius' } },
    ],
  },
  {
    id: 'camp:siftline',
    hubId: 'camp04',
    kind: 'story',
    title: 'Resin Sift Line',
    body: 'The Sift Line. Hands in the resin until the quota is met.',
    choices: [
      { id: 'work', label: 'Work the line', sub: '2 Sap. 1 Scrap.', show: { flagUnset: 'siftWorked' }, effects: { sap: -2, add: { scrap: 1 }, flag: { siftWorked: true } } },
      {
        id: 'jammed',
        label: 'Clear the jammed line',
        sub: '2 Sap. Cartel Heat +1.',
        tone: 'danger',
        show: { all: [{ door: 'prisoner' }, { flag: 'kaelenKnown' }, { flagUnset: 'kaelenJob' }, { flagUnset: 'chapter1Done' }] },
        effects: { sap: -2, heat: { cartel: 1 }, flag: { kaelenJob: true }, goto: 'camp:jammed' },
      },
      { id: 'pens', label: 'Holding Pens', tone: 'quiet', effects: { goto: 'camp:cages' } },
    ],
  },
  {
    id: 'camp:jammed',
    hubId: 'camp04',
    kind: 'story',
    title: 'The Jammed Line',
    body: 'The line is jammed. You clear it with your hands. Kaelen nods.',
    choices: [back('camp:siftline')],
  },
  {
    id: 'camp:ration',
    hubId: 'camp04',
    kind: 'story',
    title: 'Ration Line',
    body: 'The Ration Line. You eat what the quota earns.',
    choices: [
      { id: 'eat', label: 'Take the ration', show: { flag: 'siftWorked' }, effects: { health: 1, unsetFlag: ['siftWorked'] } },
      { id: 'eat-none', label: 'Take the ration', sub: 'No quota, no bowl.', show: { flagUnset: 'siftWorked' }, enable: { flag: 'siftWorked' }, locked: 'No quota, no bowl.', effects: {} },
      { id: 'pens', label: 'Holding Pens', tone: 'quiet', effects: { goto: 'camp:cages' } },
      { id: 'wire', label: 'The Wire', sub: '1 Sap.', tone: 'quiet', effects: { ...sapRoad(1), goto: 'camp:wire' } },
    ],
  },
  {
    id: 'camp:genpop',
    hubId: 'camp04',
    kind: 'story',
    title: 'General Population Pens',
    body: 'General Population. Labor quotas on every post.',
    choices: [{ id: 'pens', label: 'Holding Pens', tone: 'quiet', effects: { goto: 'camp:cages' } }],
  },
  // C. Spine
  {
    id: 'spine:shattered',
    hubId: 'spine',
    kind: 'story',
    title: 'The Shattered Spine',
    body: 'The Shattered Spine. The ruin you pulled yourself out of. Vertebrae lie scattered in the sand.',
    choices: [
      // v205: Sable Varn in the trench. Refuse her once and the node locks.
      { id: 'sable', label: 'Sable Varn', show: { all: [{ flagUnset: 'sableRefused' }, { flagUnset: 'sableWon' }, { flagUnset: 'companionLost_sable' }] }, effects: { goto: 'spine:sable' } },
      { id: 'ossuary', label: 'The Ossuary', sub: '1 Sap.', effects: { ...sapRoad(1), goto: 'spine:ossuary' } },
      { id: 'ridge', label: 'Noon Spine', sub: '1 Sap.', tone: 'quiet', effects: { ...sapRoad(1), goto: 'spine:ridge' } },
    ],
  },
  {
    id: 'spine:ossuary',
    hubId: 'spine',
    kind: 'story',
    title: 'The Ossuary',
    body: 'The Ossuary. Bones stacked to the roof.',
    choices: [
      { id: 'search', label: 'Search the bones', sub: '1 Scrap. Something may bite.', tone: 'danger', show: { flagUnset: 'ossuarySearched' }, effects: { add: { scrap: 1 }, risk: { oneIn: 3, health: 2 }, flag: { ossuarySearched: true } } },
      { id: 'shattered', label: 'The Shattered Spine', sub: '1 Sap.', tone: 'quiet', effects: { ...sapRoad(1), goto: 'spine:shattered' } },
    ],
  },
  // D. Red Maw → Chapter Two
  {
    id: 'maw:tunnels',
    kind: 'story',
    title: 'The Tunnels Below',
    body: 'Below the Rim, the tunnel networks split in every direction.',
    choices: [
      { id: 'drain', label: 'Toward the drain tunnel exits', effects: { goto: 'maw:bargain' } },
      {
        id: 'gullet',
        label: 'The Gullet Descent',
        sub: '2 Sap. 3 Health. Seeker Heat +2. It may take more.',
        tone: 'danger',
        enable: { healthMin: 4 },
        locked: 'Needs Health 4.',
        effects: { sap: -2, health: -3, heat: { seekers: 2 }, risk: { oneIn: 3, health: 2 }, goto: 'maw:gullet' },
      },
      { id: 'rim', label: 'Back to the Rim', sub: '2 Sap.', tone: 'quiet', show: { not: inCh2 }, effects: { sap: -2, goto: 'maw:rim' } },
      { id: 'approach', label: 'Back to the Rim', sub: '2 Sap.', tone: 'quiet', show: inCh2, effects: { sap: -2, goto: 'ch2:approach' } },
    ],
  },
  {
    id: 'maw:bargain',
    kind: 'story',
    title: "Thalia's Bargain",
    body: 'Thalia holds the drain tunnel exits. Her sector, her rules. She offers a clearance code through the lower extraction shafts: unmonitored, no Sap checks. The price is steep.',
    choices: [
      {
        id: 'pay',
        label: 'Pay her cut',
        sub: '6 Scrap. She takes it without counting.',
        show: { all: [{ flagUnset: 'hasBargainFlag' }, { flagUnset: 'bargainRefused' }, { any: [{ itemMin: ['scrap', 6] }, { itemMin: ['glints', 3] }] }] },
        effects: { pay: { glints: 3, scrap: 6 }, flag: { hasBargainFlag: true } },
      },
      {
        id: 'favor',
        label: 'Owe her a favor',
        sub: 'Seeker Heat +3. You are compromised.',
        tone: 'danger',
        show: { all: [{ flagUnset: 'hasBargainFlag' }, { flagUnset: 'bargainRefused' }] },
        effects: { heat: { seekers: 3 }, flag: { hasBargainFlag: true, thaliaFavor: true } },
      },
      {
        id: 'refuse',
        label: 'Refuse',
        tone: 'danger',
        show: { all: [{ flagUnset: 'hasBargainFlag' }, { flagUnset: 'bargainRefused' }] },
        effects: { heat: { seekers: 2 }, flag: { bargainRefused: true }, ambush: { kind: 'thaliaguard', line: THALIA_GUARD_LINE } },
      },
      { id: 'mill', label: 'The Mill Line', sub: 'Her code. No Sap.', show: { flag: 'hasBargainFlag' }, effects: { goto: 'maw:mill' } },
      back('maw:tunnels'),
    ],
  },
  {
    id: 'maw:mill',
    kind: 'story',
    title: 'The Mill Line',
    body: 'The Mill Line grinds day and night.',
    choices: [
      { id: 'spill', label: 'Pick the spill', tone: 'danger', show: { flagUnset: 'millPicked' }, effects: { add: { scrap: 1 }, risk: { oneIn: 3, health: 1 }, flag: { millPicked: true } } },
      { id: 'drill', label: 'The Drill Line', show: { all: [{ door: 'prisoner' }, { flag: 'ch2Started' }, { flag: 'hasBargainFlag' }] }, effects: { goto: 'ch2:p-drillrun' } },
      back('maw:bargain'),
    ],
  },
  {
    id: 'maw:gullet',
    kind: 'story',
    title: 'The Gullet Descent',
    body: 'The Gullet Descent. Straight down, straight into Red Maw from the northwest. It takes its toll.',
    choices: [
      { id: 'on', label: 'Go on', show: { not: inCh2 }, effects: { goto: 'maw:rim' } },
      { id: 'on-ch2', label: 'Go on', show: inCh2, effects: { goto: 'ch2:approach' } },
    ],
  },
  {
    id: 'ch2:v-hidden',
    kind: 'story',
    title: "Thalia's Hidden Exit",
    body: 'Behind the cloth, a crack in the rock. Her code opens it.',
    choices: [
      { id: 'on', label: 'Go on', tone: 'hunger', effects: { goto: 'ch2:cache' } },
      back('ch2:v-outpost'),
    ],
  },
]

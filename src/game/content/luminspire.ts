import type { Scene } from '../types'

/** v206 DRAFT: Chapter Three opening (Luminspire). Every line is DRAFT and awaits Jeramie's approval. */
export const CH3_CHAPTER = 'luminspire'
export const CH3_ENTRY = 'ch3:capture'

export const CH3_FIGHT_RESULT = 'It ends before it starts.'
export const CH3_RUN_RESULT = 'Dorn Vane is already there.'
export const CH3_STRIP_GEAR = 'Weapons taken. Armor taken.'
export const CH3_STRIP_SAP = 'Sap taken. Sap 0.'
export const CH3_STRIP_KEY = 'Spire Key taken.'
export const CH3_STRIP_PARTY = 'Your companions are taken. You are alone.'
export const CH3_KEY_HANDOFF = 'Roth hands the Spire Key to Ash Vane.'
export const CH3_SLIP = 'You drop into the dust. The convoy rolls on.'
export const CH3_WAIT = 'The window closes. Seeker Heat +1.'
export const CH3_WAGON_GONE = 'The wagon has moved'
export const CH3_WAGON_CLOSED = 'The window has closed.'
export const CH3_WAGON_EMPTY = 'The wagon frame is empty now, its iron shackles sprung and scored where you tore free. Nothing left here but cold timber and spilled grease.'
/** Tent, before anyone has said where the key went. */
export const CH3_TENT_BODY = "The command tent. A lockbox under Ash Vane's cot."
/** Only after captor dialogue already named the key. The lockbox itself still has to be opened. */
export const CH3_TENT_KEY = 'The Spire Key should be inside.'
export const CH3_WEAPON = 'Weapon reclaimed.'
export const CH3_ARMOR = 'Armor reclaimed.'
export const CH3_SAP = 'Sap reclaimed. Consumables reclaimed.'
export const CH3_NOISE = 'The noise carries. Seeker Heat +1.'
export const CH3_KEY_BACK = 'Spire Key +1.'
export const CH3_NO_KEY = 'The lockbox is empty.' // DRAFT, NEW: only when you had no Spire Key at capture.
export const CH3_SPOTTED = 'A board creaks. Vex Ironhand turns.'
export const CH3_VEX_IN = 'The first: Vex Ironhand.'
export const CH3_ASH_IN = 'The second: Ash Vane steps in behind him.'
export const CH3_FIGHT_HEAT = 'Seeker Heat +2.'
export const CH3_RUN_SAP = 'Sap −2.'
export const CH3_FIGHT_HEALTH = 'Health −1.'
export const CH3_WREN_LINE = "Wren Blackthorn: 'Help me end them. Not here. At the sealed Spire.'"
export const CH3_WREN_UNLATCH = 'She leaves the lockbox unlatched.'
export const CH3_WREN_WORD = 'You gave Wren your word.'

const capture = 'Smoke and silt. You crawl out of the collapse into black-iron banners.\n\nCorvus \'the Hound\' found your scent in the utility lines. The Six Retrievers close the net.\n\nRoth Vane does not raise his voice. He doesn\'t have to.\n\nRoth Vane: \'There\'s no point in running, outsider. Silence is the only mercy left.\''

export const chapterThreeScenes: Scene[] = [
  {
    id: 'ch3:capture',
    kind: 'story',
    hubId: 'barrow',
    title: 'Collapsed Threshold Exit',
    body: capture,
    choices: [
      { id: 'fight', label: 'Fight', sub: 'Six of them. One of you.', tone: 'danger', effects: { goto: 'ch3:wagon', health: -1, flag: { ch3Strip: 'fight' } } },
      { id: 'run', label: 'Run', sub: 'The perimeter is already closed.', tone: 'danger', effects: { goto: 'ch3:wagon', sap: -2, heat: { seekers: 2 }, flag: { ch3Strip: 'run' } } },
    ],
  },
  {
    id: 'ch3:wagon',
    kind: 'story',
    hubId: 'barrow',
    title: 'Luminspire Citadel Approach',
    body: 'A Retriever transport wagon. Collared. The crystal walls of Luminspire climb ahead.',
    variants: [
      { if: { flagEq: ['ch3Helper', 'wren'] }, body: "A Retriever transport wagon. Collared. The crystal walls of Luminspire climb ahead.\n\nWren Blackthorn's hand stops on the latch. She looks at Roth. She does not lock it." },
      { if: { flagEq: ['ch3Helper', 'corvus'] }, body: 'A Retriever transport wagon. Collared. The crystal walls of Luminspire climb ahead.\n\nCorvus calls a false scent to the east. The squad turns its head.' },
      { if: { flag: 'ch3Out' }, body: CH3_WAGON_EMPTY },
    ],
    choices: [
      { id: 'slip', label: 'Slip the Wagon', sub: 'Out the back while they look away.', tone: 'hunger', show: { all: [{ flagUnset: 'ch3Waited' }, { flagUnset: 'ch3Out' }] }, effects: { goto: 'ch3:supply', flash: CH3_SLIP } },
      { id: 'slip-closed', label: CH3_WAGON_GONE, sub: CH3_WAGON_CLOSED, tone: 'quiet', show: { all: [{ flag: 'ch3Waited' }, { flagUnset: 'ch3Out' }] }, enable: { flag: '__no__' }, effects: {} },
      { id: 'wait', label: 'Wait', sub: 'The window will not stay open.', tone: 'quiet', show: { all: [{ flagUnset: 'ch3Waited' }, { flagUnset: 'ch3Out' }] }, effects: { heat: { seekers: 1 }, flag: { ch3Waited: true }, flash: CH3_WAIT } },
    ],
  },
  {
    id: 'ch3:supply',
    kind: 'story',
    hubId: 'barrow',
    title: 'Supply Wagon',
    body: 'The quartermaster wagon. Your gear, tagged and crated. The outpost is shouting about the convoy.',
    choices: [
      { id: 'weapon', label: 'Take Your Weapon', sub: 'Weapon. Equip it in Gear.', tone: 'hunger', show: { flagUnset: 'ch3TookWeapon' }, effects: { flag: { ch3TookWeapon: true, ch3Grab: 'weapon' } } },
      { id: 'armor', label: 'Take Your Armor', sub: 'Armor. Equip it in Gear.', tone: 'hunger', show: { flagUnset: 'ch3TookArmor' }, effects: { flag: { ch3TookArmor: true, ch3Grab: 'armor' } } },
      { id: 'sap', label: 'Take the Sap Crate', sub: 'Your Sap and consumables.', tone: 'hunger', show: { flagUnset: 'ch3TookSap' }, effects: { flag: { ch3TookSap: true, ch3Grab: 'sap' } } },
      { id: 'leave', label: 'Leave Now', sub: 'Go before the chaos settles.', tone: 'quiet', effects: { goto: 'ch3:tent' } },
    ],
  },
  {
    id: 'ch3:tent',
    kind: 'story',
    hubId: 'barrow',
    title: 'Retriever Command Tent',
    body: CH3_TENT_BODY,
    variants: [{ if: { flag: 'ch3KeyTaken' }, mode: 'append', body: CH3_TENT_KEY }],
    choices: [
      { id: 'sneak', label: 'Solo Stealth', sub: "Alone. No one to cover you. If they hear, it's a fight.", tone: 'hunger', show: { flagUnset: 'ch3VaultDone' }, effects: { flag: { ch3VaultOpen: 'sneak' }, sneak: { odds: 2, kind: 'vex', spotted: `${CH3_SPOTTED}\n\n${CH3_VEX_IN}`, forfeit: true } } },
      { id: 'fight', label: 'Forced Fight', sub: 'A hard fight: Vex Ironhand, then Ash Vane (back-to-back).', tone: 'danger', show: { flagUnset: 'ch3VaultDone' }, effects: { ambush: { kind: 'vex', line: CH3_VEX_IN } } },
      { id: 'wren', label: "Wren's Deal", sub: 'Your word: help her dismantle the Retrievers at the sealed Spire, via Red Maw.', tone: 'quiet', show: { all: [{ flagUnset: 'ch3VaultDone' }, { flagEq: ['ch3Helper', 'wren'] }] }, effects: { flag: { ch3VaultOpen: 'wren', wrenPromise: true } } },
      { id: 'go', label: 'Crosshaven Fringe', sub: '2 Sap.', tone: 'quiet', show: { flag: 'ch3VaultDone' }, effects: { sap: -2, goto: 'ch3:crosshaven' } },
    ],
  },
  {
    id: 'ch3:trench',
    kind: 'story',
    hubId: 'barrow',
    title: 'Primary Sift Trench',
    body: 'The earth gives way to a massive industrial gash. Heavy iron screens and severed conduit lines lie choked under drifts of amber grit. Wind whistles hollowly through the open pipe ends.',
    choices: [],
  },
  {
    id: 'ch3:relay',
    kind: 'story',
    hubId: 'barrow',
    title: 'Sunken Relay',
    body: 'A buried junction chamber exposed by centuries of erosion. Stagnant runoff laps against brass-capped conduits, and a dull hum vibrates through the damp stone floor.',
    choices: [],
  },
  {
    id: 'ch3:siphon',
    kind: 'story',
    hubId: 'barrow',
    title: 'Conduit Alpha Siphon',
    body: 'A high-pressure bypass tap clamped directly into the main conduit line. Raw Sap beads like heavy oil along the valves, smelling sharply of ozone and old metal.',
    choices: [],
  },
  {
    id: 'ch3:crosshaven',
    kind: 'ending',
    hubId: 'barrow',
    title: 'Crosshaven Fringe',
    body: 'The Spire Key is cold against your palm, heavy with stolen brass. Behind you, the horn static of the Citadel perimeter fades into the freezing mist; ahead, the rot and oil-smoke of Crosshaven begin to take shape.',
    choices: [{ id: 'title', label: 'Back to the title', sub: 'Your game is saved.', tone: 'quiet', effects: { flag: { ch3StubSeen: true } } }],
  },
]

import type { Scene } from '../types'

/** v206 DRAFT: Chapter Three opening (Luminspire). Every line is DRAFT and awaits Jeramie's approval. */
export const CH3_CHAPTER = 'luminspire'
export const CH3_ENTRY = 'ch3:capture'

/** v240: the Crosshaven inner gates (Jeramie, t1251u). Approved lines, word for word. */
export const CROSSHAVEN_CABLES_LOCKED = 'The cables are bound too thick to pull. You need a blade.'
export const CROSSHAVEN_CABLES_SUB = 'Needle Knife, or any blade (Health −1).'
export const CROSSHAVEN_CABLES_ROUGH = 'The rust bites back. The edge skips and opens your palm, but the braids part one by one.'
export const CH3_TRENCH_DAGGER = 'Under a fallen iron screen, a blade someone lost to the grit. Rusted, but it still holds an edge.'
export const CROSSHAVEN_CABLES_CUT = 'The rotted bindings part under the blade, one braid at a time. The drum is free of rope, but silt has welded it solid.'
export const CROSSHAVEN_GATE_OPENS = 'Iron groans across the fringe, a sound you feel in your teeth. The portcullis drags upward and locks high. The way in is open.'
export const CROSSHAVEN_CRANK_SLIPS = "The handle kicks back and cracks your knuckles. The drum doesn't move. Yet."

/** v241: the Iron Gatehouse behind the opened gate (Jeramie, t1252u). Approved lines, word for word. */
export const GATEHOUSE_TITLE = 'The Iron Gatehouse'
export const GATEHOUSE_BODY = "A narrow vaulted passage, stone sweating in the dead air. An old Cartel post rots against the wall, a stool, a rack with no spears, and a guard who never got relieved, still sitting in what's left of his coat. A footlocker sits at his boots, padlocked and rust-sealed."
export const GATEHOUSE_PRY = 'The hasp gives with a crack. Inside, rusted fittings and a twist of dry rations, wrapped like someone meant to come back.'
export const GATEHOUSE_GUARD = 'His pockets hold sand and a Cartel tally chit, stamped and worthless now.'
export const GATEHOUSE_PRY_LOCKED = 'Needs: the Needle Knife'

/** v242: the Silt-Choked Courtyard and the Deep Junction (Jeramie, t1253u–t1256u). Approved lines, word for word. */
export const COURTYARD_TITLE = 'The Silt-Choked Courtyard'
export const COURTYARD_BODY = 'The walls open onto a staging yard big enough to swallow a caravan. Transport frames lie rusted to their axles, half-buried in drifted silt, and collapsed scaffolding leans against the inner wall like broken ribs. The wind finds you here.'
export const COURTYARD_SLOW = 'You lift and set aside, lift and set aside, until your arms shake. Under a frame you find what the silt was hiding.'
export const COURTYARD_RIP = 'Metal shrieks across the yard. A Cartel look-out on the upper tier stops pacing and listens.'
export const COURTYARD_CLEARED = 'The loose junk is cleared out. Nothing left here worth the sweat.'
/** Both scavenge buttons share this many pulls. */
export const COURTYARD_PULLS = 3
export const JUNCTION_TITLE = 'The Deep Junction'
export const JUNCTION_BODY = 'The drainage tunnels meet here in a wide, dripping fork. Old runoff channels split off into the dark on either side, and between them a broad cut of worn stone runs on, rutted by wheels that stopped turning long ago. The old trade road.'
export const JUNCTION_ROAD = "The old trade road runs on into the dark, choked with collapse and silence. You'll need a reason—and a route—before pushing deeper."

/** v249: the Rustvein Gateway and Marta Pryce (Jeramie, t1270u). Approved lines, word for word. */
export const RUSTVEIN_TITLE = 'The Rustvein Gateway'
export const RUSTVEIN_BODY = 'The old trade road climbs out of the runoff into a cut of rust-stained rock. An iron gate spans the cut, older than Crosshaven, its bars bleeding orange down the stone. Behind it a lamp burns in a toll hut, and someone inside is still writing.'
export const RUSTVEIN_WREN = "Wren pointed past Red Maw toward the deep cuts—and you gave her your word you wouldn't stop halfway."
export const RUSTVEIN_CORVUS = "The tallies on the gate don't add up. Somebody out here is hiding what this cut gives up."
export const RUSTVEIN_KNOCK = "The lamp gutters. A woman opens the shutter a hand's width, ink on her fingers, a tally book pinned under her palm. 'Road's closed past dusk. Toll's still owed.'"
export const RUSTVEIN_TALLIES = 'Rows of Cartel marks, scratched deep and recent. Half the counts have been cut over and made smaller.'
export const MARTA_SPEAKER = 'Marta Pryce, toll clerk'
export const MARTA_ROAD = "'Deeper. Fewer come back each season. The books say otherwise.'"
export const MARTA_TALLIES = "'The Cartel counts what it wants counted. I just hold the pen.'"
export const MARTA_TALLIES_NAME = 'Her pen stops over one column, a name scratched out and written back in, smaller. She turns the page before you can read it.'
export const MARTA_TOLL = "She takes it and writes something that isn't your name."

/** v250: the Barrow Causeway (Jeramie, t1275u). Approved lines, word for word. */
export const CAUSEWAY_TITLE = 'The Barrow Causeway'
export const CAUSEWAY_BODY = 'Past the gate, the trade road sinks into the earth. Old flagstones run on under a skin of wind-packed grit, split by drainage ribs that broke long ago. Along the ridge above, low barrow mounds stand in a crooked line against the sky.'
export const CAUSEWAY_PAID = "Nobody calls out behind you. Whatever Marta wrote, it wasn't trouble."
export const CAUSEWAY_SLIP = 'You keep low under the shutter. The pen stops scratching for a breath, then starts again.'
export const CAUSEWAY_SLIP_HEAT = 'Cartel Heat +1.'
/** v252: the trail-runner's cairn on the ridge (Jeramie). Approved lines, word for word. */
export const CAUSEWAY_MOUNDS_SUB = 'A stack of stones on the crest.'
export const CAUSEWAY_CAIRN = 'Halfway up the ridge, a flat slate sits balanced on three dark stones, the same mark inked on your map. Under it, someone left a wrapped bundle.'
export const CAUSEWAY_CAIRN_EMPTY = 'The slate sits empty on its stones.'
export const CAUSEWAY_CAIRN_PAY = ['Resin +1.', 'Scrap +1.']
/** v253: the Ossuary Cut, at the end of the sunken road (Jeramie). Approved lines, word for word. */
export const OSSUARY_TITLE = 'The Ossuary Cut'
export const OSSUARY_BODY = 'The flagstones tip down into a dry wash. Bleached ribs stick out of the sand like fence posts, and Cartel mile-markers lie snapped and half-buried among them. Boot tracks come in from every direction. Far fewer lead back out.'
export const OSSUARY_MARKERS = 'The numbers count down toward Red Maw on one stone, toward nothing on another. Someone chiseled the second one blank.'
export const OSSUARY_TRACKS = 'The prints crowd together at the choke, then thin to a few pairs. One set ends at a rib, as if whoever made it simply sat down.'
export const OSSUARY_REDMAW = 'The wash bends east toward the red cuts. Not yet.'
export const OSSUARY_UNMARKED = "A narrow trail slips between the ribs, scuffed by hand-carts. Not yet."

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
      { id: 'go', label: 'Crosshaven Fringe', sub: 'Out past the perimeter.\n2 Sap.', tone: 'quiet', show: { flag: 'ch3VaultDone' }, effects: { sap: -2, goto: 'ch3:crosshaven' } },
    ],
  },
  {
    id: 'ch3:trench',
    kind: 'story',
    hubId: 'barrow',
    title: 'Primary Sift Trench',
    body: 'The earth gives way to a massive industrial gash. Heavy iron screens and severed conduit lines lie choked under drifts of amber grit. Wind whistles hollowly through the open pipe ends.',
    choices: [
      {
        id: 'dig-screens',
        label: 'Dig through the screens',
        tone: 'quiet',
        show: { flagUnset: 'ch3TrenchDagger' },
        effects: { still: true, add: { rusted_dagger: 1 }, flag: { ch3TrenchDagger: true }, flash: CH3_TRENCH_DAGGER },
      },
    ],
  },
  {
    id: 'ch3:relay',
    kind: 'story',
    hubId: 'barrow',
    title: 'Sunken Relay',
    body: 'A buried junction chamber exposed by centuries of erosion. Stagnant runoff laps against brass-capped conduits, and a dull hum vibrates through the damp stone floor.',
    choices: [
      {
        id: 'take-map',
        label: "Take the trail-runner's map",
        tone: 'quiet',
        show: { flagUnset: 'barrowMap' },
        effects: {
          flag: { barrowMap: true },
          flash: 'You crack the wax off a battered tin tube wedged beneath the relay housing and unroll a stitched hide map. All the old runoff paths and dead-end cuts through the Barrow Trails are drawn in clean charcoal.',
        },
      },
    ],
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
    kind: 'story',
    hubId: 'barrow',
    title: 'Crosshaven Fringe',
    body: "The noise of the perimeter drops behind you, replaced by the low hum of Crosshaven's outer filters. Lantern light cuts through the grease-haze on the shanties. You've made it off the flats, but the inner gates are locked tight.",
    variants: [{ if: { flag: 'crosshavenGateOpen' }, mode: 'replace', body: 'The noise of the perimeter drops behind you. The portcullis hangs high on its rusted drum, and the way in stands open.' }],
    choices: [
      {
        id: 'cut-cables',
        label: 'Cut the winch cables',
        sub: CROSSHAVEN_CABLES_SUB,
        tone: 'quiet',
        show: { all: [{ flagUnset: 'crosshavenCablesCut' }, { flagUnset: 'crosshavenGateOpen' }, { item: 'needle_knife' }] },
        enable: { item: 'needle_knife' },
        locked: CROSSHAVEN_CABLES_LOCKED,
        effects: { still: true, flag: { crosshavenCablesCut: true }, flash: CROSSHAVEN_CABLES_CUT },
      },
      {
        // v247: no Needle Knife. The trench dagger or a shiv cuts the same braids, at a cost.
        id: 'cut-cables-rough',
        label: 'Cut the winch cables',
        sub: CROSSHAVEN_CABLES_SUB,
        tone: 'quiet',
        show: { all: [{ flagUnset: 'crosshavenCablesCut' }, { flagUnset: 'crosshavenGateOpen' }, { not: { item: 'needle_knife' } }] },
        enable: { any: [{ item: 'rusted_dagger' }, { item: 'shiv' }] },
        locked: CROSSHAVEN_CABLES_LOCKED,
        effects: { still: true, health: -1, flag: { crosshavenCablesCut: true }, flash: CROSSHAVEN_CABLES_ROUGH },
      },
      {
        id: 'crank-drum',
        label: 'Crank the drum',
        sub: 'A heavy pull. Health −1 if it slips.',
        tone: 'danger',
        show: { all: [{ flag: 'crosshavenCablesCut' }, { flagUnset: 'crosshavenGateOpen' }] },
        effects: { still: true, crankWinch: true },
      },
      { id: 'walk-gatehouse', label: 'Walk into the Gatehouse', tone: 'quiet', show: { flag: 'crosshavenGateOpen' }, effects: { goto: 'ch3:gatehouse' } },
      { id: 'walk-tent', label: 'Walk to Command Tent', tone: 'quiet', effects: { goto: 'ch3:tent' } },
    ],
  },
  {
    id: 'ch3:gatehouse',
    kind: 'story',
    hubId: 'barrow',
    title: GATEHOUSE_TITLE,
    body: GATEHOUSE_BODY,
    choices: [
      {
        id: 'pry-footlocker',
        label: 'Pry the footlocker',
        sub: 'Needs the Needle Knife.',
        tone: 'quiet',
        show: { flagUnset: 'gatehouseLockerPried' },
        enable: { item: 'needle_knife' },
        locked: GATEHOUSE_PRY_LOCKED,
        effects: { still: true, add: { scrap: 1, seeker_rations: 1 }, flag: { gatehouseLockerPried: true }, flash: GATEHOUSE_PRY },
      },
      {
        id: 'search-guard',
        label: 'Search the guard',
        tone: 'quiet',
        show: { flagUnset: 'gatehouseGuardSearched' },
        effects: { still: true, flag: { gatehouseGuardSearched: true }, flash: GATEHOUSE_GUARD },
      },
      { id: 'walk-courtyard', label: 'Walk into the courtyard', tone: 'quiet', effects: { goto: 'ch3:courtyard' } },
      { id: 'back-fringe', label: 'Back to the Fringe', tone: 'quiet', effects: { goto: 'ch3:crosshaven' } },
    ],
  },
  {
    id: 'ch3:courtyard',
    kind: 'story',
    hubId: 'barrow',
    title: COURTYARD_TITLE,
    body: COURTYARD_BODY,
    choices: [
      {
        id: 'clear-debris',
        label: 'Clear the debris slowly',
        sub: 'Sap −1. Quiet work.',
        tone: 'quiet',
        show: { flagUnset: 'courtyardCleared' },
        enable: { sapMin: 1 },
        locked: 'Needs: 1 Sap',
        effects: { still: true, sap: -1, courtyardPull: 'slow' },
      },
      {
        id: 'rip-wreckage',
        label: 'Rip through the wreckage',
        sub: 'Fast and loud.',
        tone: 'danger',
        show: { flagUnset: 'courtyardCleared' },
        effects: { still: true, heat: { cartel: 1 }, courtyardPull: 'rip' },
      },
      // After the third pull, both stay up but greyed, with the approved cleared line.
      { id: 'clear-debris-done', label: 'Clear the debris slowly', sub: 'Sap −1. Quiet work.', tone: 'quiet', show: { flag: 'courtyardCleared' }, enable: { flag: '__no__' }, locked: COURTYARD_CLEARED, effects: {} },
      { id: 'rip-wreckage-done', label: 'Rip through the wreckage', sub: 'Fast and loud.', tone: 'danger', show: { flag: 'courtyardCleared' }, enable: { flag: '__no__' }, locked: COURTYARD_CLEARED, effects: {} },
      { id: 'walk-junction', label: 'Walk to the Deep Junction', tone: 'quiet', effects: { goto: 'ch3:junction' } },
      { id: 'back-gatehouse', label: 'Back to the Gatehouse', tone: 'quiet', effects: { goto: 'ch3:gatehouse' } },
    ],
  },
  {
    id: 'ch3:junction',
    kind: 'story',
    hubId: 'barrow',
    title: JUNCTION_TITLE,
    body: JUNCTION_BODY,
    choices: [
      { id: 'follow-road', label: 'Follow the old trade road', sub: 'Into the Barrow Trails.', tone: 'quiet', show: { flagUnset: 'barrowMap' }, effects: { still: true, flash: JUNCTION_ROAD } },
      // v249: with the trail-runner's map, the road goes on to the Rustvein Gateway.
      { id: 'follow-road-map', label: 'Follow the old trade road', sub: 'Into the Barrow Trails.', tone: 'quiet', show: { flag: 'barrowMap' }, effects: { goto: 'ch3:rustvein' } },
      { id: 'back-courtyard', label: 'Back to the Courtyard', tone: 'quiet', effects: { goto: 'ch3:courtyard' } },
    ],
  },
  {
    id: 'ch3:rustvein',
    kind: 'story',
    hubId: 'barrow',
    title: RUSTVEIN_TITLE,
    body: RUSTVEIN_BODY,
    variants: [
      { if: { flag: 'wrenPromise' }, mode: 'append', body: RUSTVEIN_WREN },
      { if: { flagEq: ['ch3Helper', 'corvus'] }, mode: 'append', body: RUSTVEIN_CORVUS },
    ],
    choices: [
      { id: 'knock', label: 'Knock at the toll hut', sub: 'Someone keeps the books out here.', tone: 'quiet', show: { flagUnset: 'martaMet' }, effects: { still: true, flag: { martaMet: true }, flash: RUSTVEIN_KNOCK } },
      { id: 'read-tallies', label: 'Read the gate tallies', sub: 'Cartel marks, scratched into the iron.', tone: 'quiet', effects: { still: true, flash: RUSTVEIN_TALLIES } },
      { id: 'ask-road', label: 'Ask about the road', sub: 'Where does the trade road go?', tone: 'quiet', show: { flag: 'martaMet' }, effects: { still: true, flash: MARTA_ROAD } },
      { id: 'ask-tallies', label: 'Ask about the tallies', sub: 'The marks on the gate.', tone: 'quiet', show: { all: [{ flag: 'martaMet' }, { flagUnset: 'martaTalliesSeen' }] }, effects: { still: true, flag: { martaTalliesSeen: true }, flash: `${MARTA_TALLIES}\n\n${MARTA_TALLIES_NAME}` } },
      { id: 'ask-tallies-again', label: 'Ask about the tallies', sub: 'The marks on the gate.', tone: 'quiet', show: { all: [{ flag: 'martaMet' }, { flag: 'martaTalliesSeen' }] }, effects: { still: true, flash: MARTA_TALLIES } },
      { id: 'pay-toll', label: 'Pay the toll', sub: 'Needs: 1 Scrap.', tone: 'quiet', show: { all: [{ flag: 'martaMet' }, { flagUnset: 'martaTollPaid' }] }, enable: { itemMin: ['scrap', 1] }, locked: 'Needs: 1 Scrap.', effects: { still: true, remove: { scrap: 1 }, flag: { martaTollPaid: true }, flash: MARTA_TOLL } },
      // v250: the way through. One crossing row at a time; after the first crossing it is a plain free walk.
      { id: 'walk-causeway-paid', label: 'Walk the causeway', tone: 'quiet', show: { all: [{ flag: 'martaTollPaid' }, { flagUnset: 'causewayCrossed' }] }, effects: { goto: 'ch3:causeway', flag: { causewayCrossed: true }, flash: CAUSEWAY_PAID } },
      { id: 'slip-toll', label: 'Slip past the toll hut', sub: CAUSEWAY_SLIP_HEAT, tone: 'danger', show: { all: [{ flagUnset: 'martaTollPaid' }, { flagUnset: 'causewayCrossed' }] }, effects: { goto: 'ch3:causeway', heat: { cartel: 1 }, flag: { causewayCrossed: true }, flash: `${CAUSEWAY_SLIP}\n${CAUSEWAY_SLIP_HEAT}` } },
      { id: 'walk-causeway', label: 'Walk the causeway', tone: 'quiet', show: { flag: 'causewayCrossed' }, effects: { goto: 'ch3:causeway' } },
      { id: 'back-junction', label: 'Back to the Deep Junction', tone: 'quiet', effects: { goto: 'ch3:junction' } },
    ],
  },
  {
    id: 'ch3:causeway',
    kind: 'story',
    hubId: 'barrow',
    title: CAUSEWAY_TITLE,
    body: CAUSEWAY_BODY,
    choices: [
      { id: 'climb-mounds', label: 'Climb to the barrow mounds', sub: CAUSEWAY_MOUNDS_SUB, tone: 'quiet', show: { flagUnset: 'causewayCairnTaken' }, effects: { still: true, add: { salve: 1, scrap: 1 }, flag: { causewayCairnTaken: true }, flash: `${CAUSEWAY_CAIRN}\n\n${CAUSEWAY_CAIRN_PAY.join('\n')}` } },
      { id: 'climb-mounds-empty', label: 'Climb to the barrow mounds', sub: CAUSEWAY_MOUNDS_SUB, tone: 'quiet', show: { flag: 'causewayCairnTaken' }, effects: { still: true, flash: CAUSEWAY_CAIRN_EMPTY } },
      { id: 'sunken-road', label: 'Follow the sunken road', sub: 'Deeper into the Barrow Trails.', tone: 'quiet', effects: { goto: 'ch3:ossuary' } },
      { id: 'back-rustvein', label: 'Back to the Rustvein Gateway', tone: 'quiet', effects: { goto: 'ch3:rustvein' } },
    ],
  },
  {
    id: 'ch3:ossuary',
    kind: 'story',
    hubId: 'barrow',
    title: OSSUARY_TITLE,
    body: OSSUARY_BODY,
    choices: [
      { id: 'read-markers', label: 'Read the mile-markers', sub: 'Cartel paint, sun-stripped.', tone: 'quiet', effects: { still: true, flash: OSSUARY_MARKERS } },
      { id: 'follow-tracks', label: 'Follow the tracks in', sub: 'Most of them stop here.', tone: 'quiet', effects: { still: true, flash: OSSUARY_TRACKS } },
      { id: 'toward-redmaw', label: 'Toward Red Maw', sub: 'Where Wren pointed.', tone: 'quiet', effects: { still: true, flash: OSSUARY_REDMAW } },
      { id: 'unmarked-track', label: 'The unmarked track', sub: "Off the Cartel's books.", tone: 'quiet', effects: { still: true, flash: OSSUARY_UNMARKED } },
      { id: 'back-causeway', label: 'Back up the causeway', tone: 'quiet', effects: { goto: 'ch3:causeway' } },
    ],
  },
]

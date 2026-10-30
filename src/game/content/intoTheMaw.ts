import type { Choice, Cond, DoorId, Scene } from '../types'
import { STRAY_ARRIVAL_LINE, STRAY_OUTCAST_LINE } from '../strayLines'

/**
 * v166/v168: Chapter Two, "Into the Belly of the Beast". Opened only by the vault code at the Chapter One end screen.
 * v168: three routes, one per door (Prisoner ch2:p-*, Vessel ch2:v-*, Outcast ch2:o-*). Shared beats: the Cache,
 * the drills, the Heart and the end. Plain data: no kit or catalog reads at module load.
 */
export const CH2_CODE = 'LEAD-N3X7'
export const CH2_CHAPTER = 'into-the-maw'
export const CH2_STARTS: Record<DoorId, string> = { prisoner: 'ch2:p-jaws', vessel: 'ch2:v-scar', outcast: 'ch2:o-wash' }
export const CH2_START_IDS = Object.values(CH2_STARTS)
/** v169: every door comes down onto the Red Maw Approach first. The Chapter Two checkpoint sits here. */
export const CH2_ENTRY = 'ch2:approach'
/** Where the Main Gate and the Decoy Gully meet, per door. */
export const IRON_GUT_NEXT: Record<DoorId, string> = { prisoner: 'ch2:p-bays', vessel: 'ch2:v-outpost', outcast: 'ch2:o-stakes' }
export const CH3_CODE = 'ABYSS-7REE'

export const CH2_UNLOCK_LINE = 'The code leaves your mouth and the Maw answers. Warm breath rolls up out of the dark. Somewhere below, bone shifts.'
export const CH2_CARD = 'CHAPTER TWO: INTO THE BELLY OF THE BEAST'

export const DRILL_LINES = [
  '',
  'Far above, a drill bites bone. Sybella is coming down.',
  'The hammering is closer. Dust sifts from the ribs.',
  'A bulkhead behind you screams and gives. Her drill team is through.',
] as const

export const MILLER_TURRETS = 'The barge horn blasts once: a warning. Then a second blast. Barge horn, raspy: "Greg. Wake the turrets."'
export const TURRET_LINE = 'The rail turrets cough. Grit and iron chew the water beside the skiff. You make the far side bleeding.'
export const KEY_TAKEN = 'Spire Key taken. The Seekers want it. The Cartel wants it. You have it.'
export const RECKONING_LOST = "Greg weighs the rod in his palm and grins. 'Smart. Miller remembers smart.'"
export const DRILL_BREACH = "Behind you, Sybella's drills breach the bone."
export const GULLY_SPLICE = "You insert the spliced lead into the pylon's audio jack. The horn atop the pylon crackles with static, pinging Miller's command barge over the canyon ridge. After three long seconds, the turret lenses swivel away from your chest, and the heavy iron gate latch drops with a dull hydraulic thud."
export const MILLER_WHISTLE = 'Over the ridge, Miller\'s horn gives a single long whistle. Not a warning. A delivery runner, logged.'
export const PUSH_PAST = "You lower your head and throw your weight against the choked bulkhead. Sybella's warning bolt cuts the air an inch above your collar, showering your shoulders in sparks, but the momentum carries you through the gap before her dragoons can lock their grips."
export const VALERIUS_LOOT = "Valerius's shock-baton and a cipher key, left in the dust where he ran."

export const HORN_SPEECH = `The heavy horn atop the barge pops with static, followed by a long, low whistle that echoes off the canyon walls.

"Greg! Tell that runner down in the dirt to stop staring up at my brass. The price is fifteen scraps or two vials of refined sap—no credit, no speeches. If they haven't dropped the weight into the bucket by the count of three... paint the sand with 'em and haul their skiff to the scrap heap."`

// v168 lines read by ch2.ts.
export const HORN_REPAIRED = 'Somewhere above, a horn coughs, tests itself, and holds. They fixed it.'
export const HORN_MURCH_FIX = "Through the tubes, Greg: 'Mechanic. Fix the horn or lose the hands.' A minute later, the horn breathes again."
export const SUPPLY_SAFE = 'The turrets swing toward you and wait for a horn that never comes. The skiff slides into the dark.'
export const SUPPLY_HOT = 'The horn blasts once. You know what the second one means.'
export const SUPPLY_MURCH = 'The horn sounds clean. Whoever fixed it did good work. You know who.'
export const SIFT_SPOTTED = "'Stock off the line!' Greg's crew comes through the mesh."
export const RITE_HOLD = "'The Vessel takes this one.' The keeper bows. Hold."
export const RITE_FAIL = 'The keeper does not bow. He looks at your cup, then at the lamps.'
export const TOO_MANY_LAMPS = 'Too many lamps have turned your way tonight.'
export const STRAYS_THROW_OUT = "'Twice cast out. Once more and it's for keeps.'"
export const TEST_FAIL = "It rings. 'Hollow. Like you.'"

const drillVariants = [1, 2, 3].map((n) => ({ if: { flagEq: ['drillStage', n] } as Cond, mode: 'append' as const, body: DRILL_LINES[n] }))
const vexPending: Cond = { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] }
const abyssClear: Cond = { any: [{ flag: 'ch2Won_valerius' }, { flag: 'ribsCollapsed' }] }
const knot: Cond = { equipped: 'ossa_token' }
const weapon: Cond = { slot: 'weapon' }
const vesselGarb: Cond = { any: [{ equipped: 'ceremonial_cloth' }, { flag: 'fakeVessel' }] }
const reckonDue: Cond = { all: [{ flagUnset: 'reckoningDone' }, { any: [{ heatMin: ['cartel', 5] }, { flag: 'millerHeard' }] }] }
const outcastReckonDue: Cond = { all: [{ flagUnset: 'reckoningDone' }, { flagUnset: 'bountyFooled' }, { flagUnset: 'bountyBroken' }] }
const stairGreg: Cond = { all: [{ flag: 'gregSold' }, { flagUnset: 'stairGregDone' }] }
const blown: Cond = { flag: 'coverBlown' }
const unblown: Cond = { flagUnset: 'coverBlown' }

/** The Valerius foot of each route. Win the fight, or bring the ribs down with the Key, then on into the Abyssal Ribs. */
function abyssChoices(collapseLabel: string): Choice[] {
  return [
    { id: 'fight', label: 'Fight Valerius', tone: 'danger', show: { not: abyssClear }, effects: { flag: { ch2Fight: 'valerius' }, ambush: { kind: 'overseer', line: 'Overseer Valerius. Shock-baton up, the squad at his back, the rig glowing behind them.' } } },
    { id: 'collapse', label: collapseLabel, tone: 'hunger', show: { all: [{ not: abyssClear }, { item: 'spire_key' }] }, effects: { flag: { ribsCollapsed: true }, goto: 'ch2:ribs' } },
    { id: 'on', label: 'Into the Abyssal Ribs', tone: 'hunger', show: abyssClear, effects: { goto: 'ch2:ribs' } },
  ]
}

function drillChoices(next: string, kind: 'drilllead' | 'dragoon', fightLabel: string, tag: string): Choice[] {
  return [
    { id: 'on', label: 'Go on', tone: 'hunger', show: { flag: 'drillPast' }, effects: { goto: next } },
    { id: 'fight', label: fightLabel, tone: 'danger', show: { flagUnset: 'drillPast' }, effects: { flag: { ch2Fight: tag, drillPast: true }, ambush: { kind, line: kind === 'dragoon' ? 'Gold-trimmed riders come down the stair on resin-shod mounts. Seeker dragoons.' : 'The drill team lead steps out ahead of the rig, a hand-drill on a strap, goggles down.' } } },
    { id: 'run', label: 'Run', sub: 'Costs a hand.', show: { flagUnset: 'drillPast' }, effects: { flag: { drillPast: true, ch2RunHand: true }, goto: next, flash: 'You run flat out. It costs you a hand.' } },
  ]
}

const TOLL_SHOW: Cond = { all: [{ flagUnset: 'ch2Won_jaws' }, { flagUnset: 'gregStanding' }] }
const TOLL_PAID = 'The weight drops into the bucket. Greg counts it twice and waves you on toward the Iron-Gut Pass.'
export const SIPHON_PRISONER = "Under a tarp at the cairn, someone's stash from the last run: cord, a dead lamp, and a Seeker blade with a glass reservoir in the grip. Nobody's coming back for it. You take the Memory Siphon."
export const SIPHON_VESSEL = "The locker is meant for the Silt-Bay Docks: Seeker transit seals, a ledger, and a Memory Siphon in a padded case. The Vessel's hands are allowed to take what the Vessel needs."
export const SIPHON_OUTCAST = "A Stray scout lies against a vertebra, breathing wrong. He sees the brand and laughs once. 'Figures.' He presses a Seeker blade with a glass grip into your hand. 'Took it off a lamp. Don't let them have it back.' He doesn't breathe again."
export const RELAY_FIXED = "You splice a lead into the box and bind it with the Sinew-Bind. The relay clicks and starts reading numbers. Mara writes them on her arm: FREQ-774. 'Cartel courier channel. Miller's board will think you're a supply runner.'"
export const RIBS_CLIMAX = "The drill breaks through the rib above. Seeker dragoons rappel down on lines, gold trim catching the lamps. The platform drops out from under their boots and takes you down."
export const RIBS_CLIMAX_LADDER = "The drill breaks through the rib above. Seeker dragoons rappel down on lines, gold trim catching the lamps. You drop the last rungs and run."
/** Typed Do on the jammed lift gear. */
const LIFT_DO = ['use', 'wrench', 'kick', 'lever', 'gear', 'crank', 'pry', 'jam', 'bash', 'shove', 'hammer', 'buckler', 'plate']
/** Heavy enough to turn the lift gear: Scrap Buckler, Maw Plate (or plated pieces), iron scrap. */
const HEAVY_TOOL: Cond = { any: [{ item: 'scrap_buckler' }, { item: 'plated_buckler' }, { item: 'maw_plate' }, { item: 'plated_scav_wrap' }, { item: 'scrap' }] }
const BACK_TO = (id: string): Choice => ({ id: 'back', label: 'Back', tone: 'quiet', effects: { goto: id } })

export const chapterTwoScenes: Scene[] = [
  {
    id: 'ch2:gate',
    kind: 'story',
    title: CH2_CARD,
    body: `${CH2_UNLOCK_LINE}\n\n${CH2_CARD}`,
    choices: [{ id: 'down', label: 'Go down', tone: 'hunger', effects: { goto: CH2_ENTRY } }],
  },

  // ── Prisoner: "Cartel Stock" ──
  {
    id: 'ch2:p-jaws',
    kind: 'story',
    title: 'The Jaws, from the Gullet',
    body: `The Gullet spits you out at the foot of the jaws. The same iron M on every hull as on the pen gates at Camp-04. You know whose country this is. You were inventory in it.

${HORN_SPEECH}

Static. Then, lower: "...Hold on. Greg. That one walks like the pens."

Greg looks at your pen tags and doubles the talk, not the price. 'Cartel stock walking itself back. Miller'll laugh.'

His eyes go to your shaved head. "Camp-04 cut. They shave the stock so the lice can't hide."

Greg unhooks a chain from his belt. "No toll for stock. Stock goes back in the pen."`,
    choices: [
      { id: 'through', label: 'Climb into the haul', tone: 'hunger', show: { flag: 'ch2Won_jaws' }, effects: { goto: 'ch2:p-haul' } },
      { id: 'haul', label: 'Bury yourself in the scrap haul', sub: 'The haul skiffs go in under the platform.', show: { flagUnset: 'ch2Won_jaws' }, effects: { flag: { gregStanding: 'bypassed' }, goto: 'ch2:p-haul' } },
      { id: 'scrip', label: 'Pay in Cartel Scrip', sub: '2 scrip.', show: { flagUnset: 'ch2Won_jaws' }, enable: { itemMin: ['scrip', 2] }, locked: 'Needs: 2 Cartel Scrip', effects: { remove: { scrip: 2 }, flag: { gregStanding: 'paid' }, goto: 'ch2:p-haul', flash: "Greg turns the scrip over. 'Miller's own paper, coming home.' He looks away while you climb into the haul." } },
      { id: 'toll', label: 'Pay the toll', sub: '15 scrap.', show: TOLL_SHOW, enable: { itemMin: ['scrap', 15] }, locked: 'Needs: 15 scrap', effects: { remove: { scrap: 15 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'tollsap', label: 'Pay the toll in Sap', sub: '2 vials.', show: TOLL_SHOW, enable: { itemMin: ['vial_drop', 2] }, locked: 'Needs: 2 vials', effects: { remove: { vial_drop: 2 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'fight', label: "Fight Greg's chain", tone: 'danger', show: { flagUnset: 'ch2Won_jaws' }, effects: { flag: { gregStanding: 'hostile', ch2Fight: 'jaws' }, ambush: { kind: 'greg', line: "Greg swings the chain like he's done it a thousand times. He has." } } },
    ],
  },
  {
    id: 'ch2:p-haul',
    kind: 'story',
    title: 'Under the Platform',
    body: 'Scrap on your back, scrap in your mouth. The haul skiff grinds under the platform lamps. Through the gaps between plates you see boots, a turret rail, the bucket on its rope. Then dark, and the warm breath of the beast.',
    choices: [
      { id: 'still', label: 'Hold still', tone: 'danger', effects: { flag: { ch2SkiffRoll: true }, goto: 'ch2:p-bays' } },
      { id: 'short', label: "Use Jaxson's short", sub: 'Kill the lamp. No roll.', show: { any: [{ flag: 'oilMended' }, { flag: 'jaxsonStash' }] }, effects: { goto: 'ch2:p-bays', flash: 'Two wires, the way the brass jaw did it. The lamp dies. Nobody looks at a dark skiff.' } },
    ],
  },
  {
    id: 'ch2:p-bays',
    kind: 'talk',
    title: "Miller's Repair Bays",
    speaker: 'Murch',
    body: `Haul skiffs on chains, half-gutted. Welding light. A bay at the end with its tools still racked and a name scratched off the board. Someone is under the skiff in that bay, very still, holding a weighted spanner.

"Don't. Don't yell. You're off the haul. Nobody comes off the haul." He squints through amber lenses. "Pen tags. Shaved. Camp-04. Greg chains people for Camp-04. He tried to chain me."`,
    choices: [
      { id: 'help', label: 'Finish his lift motor', sub: '3 scrap.', show: { all: [{ flagUnset: 'murchScrap' }, { flagUnset: 'murchAbandoned' }] }, enable: { itemMin: ['scrap', 3] }, locked: 'Needs: 3 scrap', effects: { remove: { scrap: 3 }, flag: { murchScrap: true, murchProtected: true }, flash: "He takes the scrap like water. 'Old shaft. Goes straight down to the cache. Lift's dead. Was dead.'" } },
      { id: 'shaftask', label: 'Ask about the shaft', group: 'talk', show: { all: [{ flagUnset: 'murchAbandoned' }, { flagUnset: 'murchShaftAsked' }] }, effects: { flag: { murchShaftAsked: true }, flash: "'Under the sift line, under the barge. Miller sealed it. I can unseal anything Miller seals.'" } },
      { id: 'leave', label: 'Leave him', tone: 'quiet', show: { all: [{ flagUnset: 'murchScrap' }, { flagUnset: 'murchAbandoned' }] }, effects: { flag: { murchAbandoned: true }, flash: 'You walk. Behind you, the spanner hits the floor, and somebody shouts for Greg.' } },
      { id: 'sift', label: 'On to the sift line', effects: { goto: 'ch2:p-sift' } },
      { id: 'bilge', label: 'Under the barge', effects: { goto: 'ch2:p-bilge' } },
      { id: 'shaft', label: 'The shaft', tone: 'hunger', show: { flag: 'murchScrap' }, effects: { goto: 'ch2:p-shaft' } },
    ],
  },
  {
    id: 'ch2:p-sift',
    kind: 'talk',
    title: 'The Sift Line',
    speaker: 'Vex',
    body: `Chained diggers shake resin grit through iron mesh, row after row, under Cartel lamps. One of them is not sifting. He is listening to the ground.

Vex looks at the tags on you, then at your shaved head. 'Pens. They tagged me too, I think. I don't remember the pens. I remember the clippers.'`,
    choices: [
      { id: 'break', label: 'Break his chain', sub: '2 scrap.', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, enable: { itemMin: ['scrap', 2] }, locked: 'Needs: 2 scrap', effects: { remove: { scrap: 2 }, ticks: 1, flag: { vexFreed: true }, flash: "The chain gives. Vex doesn't run. He points down." } },
      { id: 'leave', label: 'Leave him', tone: 'quiet', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, effects: { flag: { vexLeft: true } } },
      { id: 'bilge', label: 'Under the barge', effects: { goto: 'ch2:p-bilge' } },
      BACK_TO('ch2:p-bays'),
    ],
  },
  {
    id: 'ch2:p-bilge',
    kind: 'story',
    title: "Under Miller's Barge",
    body: `Pipes, voice-tubes, the horn's cable thick as an arm. Miller's voice comes down the tubes from the bridge, too close, talking to no one: "...Greg's slow. Greg's always slow..."`,
    choices: [
      { id: 'cut', label: 'Cut the horn cable', sub: 'The skiff alarm goes quiet. For a while.', show: { all: [{ flagUnset: 'hornCut' }, { any: [{ flag: 'wireCut' }, weapon] }] }, effects: { flag: { hornCut: true }, heat: { cartel: 2 }, flash: 'The horn chokes mid-blast. Up top, somebody swears in the dark.' } },
      { id: 'tube', label: 'Speak into the tube', show: { flagUnset: 'millerHeard' }, effects: { flag: { millerHeard: true }, flash: "A long silence. Then: 'Who's in my bilge?'" } },
      { id: 'supply', label: 'On to the supply hatch', tone: 'hunger', effects: { goto: 'ch2:p-supply' } },
      { id: 'back', label: 'Back to the bays', tone: 'quiet', effects: { goto: 'ch2:p-bays' } },
    ],
  },
  {
    id: 'ch2:p-supply',
    kind: 'story',
    title: 'The Supply Run',
    body: 'A Cartel supply skiff idles at the bilge hatch, crates lashed down, its nose pointed at the dark where the old shaft opens. Turret rails track every hull that leaves the barge.',
    choices: [
      { id: 'ride', label: 'Ride the supply skiff', tone: 'danger', effects: { flag: { ch2SupplyRide: true }, goto: 'ch2:p-shaft' } },
      { id: 'stay', label: 'Stay in the bilge', sub: 'The long way, under the deck plates.', effects: { ticks: 1, heat: { cartel: 1 }, goto: 'ch2:p-shaft' } },
    ],
  },
  {
    id: 'ch2:p-shaft',
    kind: 'story',
    title: 'The Old Shaft',
    body: `Murch's lift: a cage on cables, older than Miller, older than the Bleed. He slaps the panel and it hums.

"'Down is easy. Up is the problem. Don't think about up.'"`,
    variants: [{ if: { flagUnset: 'murchScrap' }, body: "Murch's lift: a cage on cables, older than Miller, older than the Bleed." }],
    choices: [
      { id: 'reckon', label: 'Face Greg at the cage', tone: 'danger', show: { all: [reckonDue, { flagUnset: 'spireKey' }] }, effects: { flag: { ch2Fight: 'reckoning', gregStanding: 'hostile' }, ambush: { kind: 'greg', line: "'Pen stock riding Miller's lift. He'll want to watch.'" } } },
      { id: 'ride', label: 'Ride it down', tone: 'hunger', show: { all: [{ flag: 'murchScrap' }, { not: reckonDue }] }, effects: { ticks: 1, flag: { ch2LiftRoll: true }, goto: 'ch2:cache' } },
      { id: 'vex', label: 'Let Vex lead down the dead stops', sub: '1 Sap.', tone: 'hunger', show: { all: [{ flagUnset: 'murchScrap' }, { flag: 'vexFreed' }, { not: reckonDue }] }, effects: { ticks: 1, sap: -1, flag: { vexLed: true }, goto: 'ch2:cache' } },
      { id: 'sealed', label: 'Try the cage', tone: 'quiet', show: { all: [{ flagUnset: 'murchScrap' }, { flagUnset: 'vexFreed' }] }, effects: { goto: 'ch2:trapped' } },
    ],
  },
  {
    id: 'ch2:p-drillrun',
    kind: 'story',
    title: 'The Drill Line',
    body: `The shaft shakes. A drill-head comes through the wall above the cage, Sybella's team on the other side of it.\n\n${DRILL_BREACH}`,
    variants: drillVariants,
    choices: drillChoices('ch2:p-abyss', 'drilllead', 'Fight the drill lead', 'drill'),
  },
  {
    id: 'ch2:p-abyss',
    kind: 'story',
    title: 'The Shaft Foot',
    body: "'My stock. My runaway stock.'",
    variants: [
      { if: { flag: 'overseerChip' }, mode: 'append', body: "His hand goes to the chipped baton. 'You marked it. At the camp. I remember the sound.'" },
    ],
    choices: abyssChoices('Collapse the shaft with the Key'),
  },

  // ── Vessel: "The False Cup Inside" ──
  {
    id: 'ch2:v-scar',
    kind: 'story',
    title: 'The Pilgrim Stair',
    body: `The Pilgrim's Scar ends in cairns, and the cairns end in a stair cut into the jaw's side, older than Miller's platform. Oram marked it. Below, Miller's barge; above, the stair down into the beast.

${HORN_SPEECH}

The horn crackles once more: "Seekers pay the tithe, Greg. Gold dust or not."

Greg sees the gold dust on you and steps back. 'Seeker business goes through. Seeker business also pays.'`,
    choices: [
      { id: 'toll', label: 'Pay the toll', sub: '15 scrap.', show: TOLL_SHOW, enable: { itemMin: ['scrap', 15] }, locked: 'Needs: 15 scrap', effects: { remove: { scrap: 15 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'tollsap', label: 'Pay the toll in Sap', sub: '2 vials.', show: TOLL_SHOW, enable: { itemMin: ['vial_drop', 2] }, locked: 'Needs: 2 vials', effects: { remove: { vial_drop: 2 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'tithe', label: 'Pay the tithe', sub: '1 vial.', enable: { item: 'vial_drop' }, locked: 'Needs: a vial', effects: { remove: { vial_drop: 1 }, flag: { gregStanding: 'paid' }, goto: 'ch2:v-outpost' } },
      { id: 'walk', label: 'Walk as a Vessel', sub: 'Seeker Heat +1.', enable: vesselGarb, locked: 'Needs: the Seeker cloth', effects: { heat: { seekers: 1 }, goto: 'ch2:v-outpost', flash: "Greg won't touch a Vessel. He spits after you pass." } },
      { id: 'name', label: 'Name Sybella', show: { any: [{ flag: 'sybellaNamed' }, { flag: 'sybellaHelpAsked' }] }, effects: { flag: { ch2SybellaNamed: true }, goto: 'ch2:v-outpost', flash: "Greg goes pale at the name. 'Through. Fast. I never saw you.'" } },
    ],
  },
  {
    id: 'ch2:v-outpost',
    kind: 'story',
    title: "Valerius's Outpost",
    speaker: 'Overseer Valerius',
    body: `They expected you. Lamps bow. A Seeker takes your cloth's hem and kisses it. At the center, thinner than you remember, eyes too bright, Valerius watches the cup on your belt.

"'Sybella wants the Vessel. I get my name back.'"

"'Before she has you, I check you. That's my job now.'"`,
    variants: drillVariants,
    choices: [
      { id: 'test', label: 'Submit to the test', show: { all: [unblown, { flagUnset: 'cupPassed' }] }, effects: { goto: 'ch2:v-test' } },
      { id: 'murch', label: 'The transport bay', show: { all: [unblown, { flagUnset: 'murchProtected' }, { flagUnset: 'murchCaptured' }] }, effects: { goto: 'ch2:v-murch' } },
      { id: 'garden', label: 'Walk the garden rite', show: { all: [unblown, { flagUnset: 'statueSiphoned' }] }, effects: { goto: 'ch2:v-garden' } },
      { id: 'bleed', label: 'The bleeding room', show: { all: [unblown, { flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, effects: { goto: 'ch2:v-bleed' } },
      { id: 'greg', label: 'The back gate', show: { all: [unblown, { flagUnset: 'gregDealt' }, { flagUnset: 'gregSold' }] }, effects: { goto: 'ch2:v-greg' } },
      { id: 'stair', label: "Oram's lower stair", tone: 'hunger', show: { flagUnset: 'spireKey' }, enable: { all: [{ flag: 'cupPassed' }, { any: [{ flag: 'vexFreed' }, { flag: 'crateKey' }] }] }, locked: 'Needs: the test passed, and Vex or the crate key', effects: { goto: 'ch2:v-stair' } },
      { id: 'locker', label: 'Open the transit locker', sub: 'Stamped for the Silt-Bay Docks.', show: { all: [unblown, { flagUnset: 'siphonGot' }] }, effects: { add: { memory_siphon: 1 }, flag: { siphonGot: true }, flash: SIPHON_VESSEL } },
      { id: 'run', label: 'Run', tone: 'danger', show: blown, effects: { goto: 'ch2:v-blown' } },
    ],
  },
  {
    id: 'ch2:v-test',
    kind: 'story',
    title: 'The Cup Test',
    speaker: 'Overseer Valerius',
    body: 'Valerius holds your false cup up to the lamp. "Empty cups ring. Full ones don\'t." He taps it.',
    choices: [
      { id: 'drop', label: 'Bleed a Drop into it', sub: '1 vial.', show: { flagUnset: 'cupPassed' }, enable: { item: 'vial_drop' }, locked: 'Needs: a vial', effects: { remove: { vial_drop: 1 }, flag: { cupPassed: true }, flash: 'The cup goes quiet. Valerius frowns, and lets it go.' } },
      { id: 'bluff', label: 'Bluff', tone: 'danger', show: { all: [{ flagUnset: 'cupPassed' }, { flagUnset: 'cupFailed' }] }, effects: { flag: { cupPassed: true, ch2Fight: 'test' }, sneak: { odds: 5, kind: 'overseer', spotted: TEST_FAIL } } },
      BACK_TO('ch2:v-outpost'),
    ],
  },
  {
    id: 'ch2:v-garden',
    kind: 'story',
    title: 'The Garden Rite',
    body: 'The amber statues stand in rows. Seekers call it the garden of the faithful. The siphon kit hangs on a hook like a censer.',
    choices: [
      { id: 'siphon', label: 'Siphon a statue', sub: 'Needs a Seeker Extractor or the Memory Siphon.', show: { all: [{ flagUnset: 'statueSiphoned' }, { flag: 'cupPassed' }] }, enable: { any: [{ item: 'seeker_extractor' }, { item: 'memory_siphon' }] }, locked: 'You need something to draw the resin.', effects: { flag: { statueSiphoned: true }, add: { deep_memory_pearl: 1 }, goto: 'ch2:survivor', flash: "Images that aren't yours. Then the amber cracks, and a body falls into your arms, breathing." } },
      { id: 'siphon', label: 'Siphon a statue', sub: 'Needs a Seeker Extractor or the Memory Siphon.', tone: 'danger', show: { all: [{ flagUnset: 'statueSiphoned' }, { flagUnset: 'cupPassed' }] }, enable: { any: [{ item: 'seeker_extractor' }, { item: 'memory_siphon' }] }, locked: 'You need something to draw the resin.', effects: { flag: { statueSiphoned: true, ch2Fight: 'garden' }, add: { deep_memory_pearl: 1 }, goto: 'ch2:survivor', sneak: { odds: 3, kind: 'seekerpatrol', spotted: "Lamps swing your way. 'Thief at the garden!'" }, flash: "Images that aren't yours. Then the amber cracks, and a body falls into your arms, breathing." } },
      BACK_TO('ch2:v-outpost'),
    ],
  },
  {
    id: 'ch2:survivor',
    kind: 'story',
    title: 'The Amber Garden',
    body: "'You pulled me out. I won't forget it. I know where something's buried.'",
    choices: [
      { id: 'coord', label: 'Take the coordinate', show: { all: [{ flagUnset: 'stashCoord' }, { flagUnset: 'survivorSent' }] }, effects: { flag: { stashCoord: true }, goto: 'ch2:v-outpost', flash: 'A stash marker, scratched into your arm in grit. Something for later.' } },
      { id: 'send', label: 'Send them to The Bleached Spine', show: { all: [{ flagUnset: 'stashCoord' }, { flagUnset: 'survivorSent' }] }, effects: { flag: { survivorSent: true }, heat: { strays: -1 }, goto: 'ch2:v-outpost', flash: 'They go up toward the Strays. The Bleached Spine will remember the favor.' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { any: [{ flag: 'stashCoord' }, { flag: 'survivorSent' }] }, effects: { goto: 'ch2:v-outpost' } },
    ],
  },
  {
    id: 'ch2:v-bleed',
    kind: 'talk',
    title: 'The Bleeding Room',
    speaker: 'Vex',
    body: `A runner chained to a vein of raw resin, a tube in his arm, a row of cups filling from it. This is how the cups get full. This is what yours was supposed to be.

Vex stares at the cup on your belt. 'They hung one of those on me once. I think. It didn't fill.'`,
    choices: [
      { id: 'quiet', label: 'Free him quietly', sub: '1 Sap. Seeker Heat +1.', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, enable: { all: [vesselGarb, { heatMax: ['seekers', 3] }, { sapMin: 2 }] }, locked: 'Needs: the cloth, 1 Sap, Seeker Heat 3 or less', effects: { sap: -1, heat: { seekers: 1 }, flag: { vexFreed: true }, flash: 'You fold the tube and set a cup under the drip so the row still fills. Slower. Nobody counts drips.' } },
      { id: 'rite', label: 'Free him by rite', sub: 'Seeker Heat +1.', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }, { heatMax: ['seekers', 2] }] }, enable: { flag: 'cupPassed' }, locked: 'Needs: the cup test passed', effects: { heat: { seekers: 1 }, flag: { vexFreed: true }, flash: RITE_HOLD } },
      { id: 'rite', label: 'Free him by rite', sub: 'Seeker Heat +1. The keeper may doubt you.', tone: 'danger', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }, { heatMin: ['seekers', 3] }, { heatMax: ['seekers', 4] }] }, enable: { flag: 'cupPassed' }, locked: 'Needs: the cup test passed', effects: { heat: { seekers: 1 }, flag: { vexFreed: true, ch2RiteRoll: true } } },
      { id: 'rite', label: 'Free him by rite', sub: 'Your cover will not hold.', tone: 'danger', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }, { heatMin: ['seekers', 5] }] }, enable: { flag: 'cupPassed' }, locked: 'Needs: the cup test passed', effects: { flag: { vexFreed: true, coverBlown: true }, flash: `${TOO_MANY_LAMPS}\n\n${RITE_FAIL}` } },
      { id: 'force', label: 'Free him by force', sub: 'Your cover blows. Seeker Heat +2.', tone: 'danger', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, enable: weapon, locked: 'Needs: a weapon', effects: { heat: { seekers: 2 }, flag: { vexFreed: true, coverBlown: true }, flash: 'The tube comes out. The cups stop filling. Somebody will notice.' } },
      { id: 'leave', label: 'Leave him filling', tone: 'quiet', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, effects: { flag: { vexLeft: true }, goto: 'ch2:v-outpost' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { any: [{ flag: 'vexFreed' }, { flag: 'vexLeft' }] }, effects: { goto: 'ch2:v-outpost' } },
    ],
  },
  {
    id: 'ch2:v-murch',
    kind: 'talk',
    title: 'The Transport Bay',
    speaker: 'Murch',
    body: `A Seeker transport on blocks, its vents welded shut. Chained to the engine housing, a thin man in a grease-stained jumpsuit works with twitching fingers while a Seeker watches. Amber lenses flipped up. He sees your cloth and flinches.

"'I fix it, they don't weld me in it. That's the deal. That's the whole deal.'"`,
    choices: [
      { id: 'protect', label: 'Protect him', sub: "Claim him as the Vessel's mechanic. Seeker Heat +1.", show: { all: [{ flagUnset: 'murchProtected' }, { flagUnset: 'murchCaptured' }] }, effects: { heat: { seekers: 1 }, flag: { murchProtected: true }, flash: "'The Vessel needs a mechanic.' The Seeker steps back. Murch stares at you like you've lost your mind, and keeps working." } },
      { id: 'abandon', label: 'Abandon him', tone: 'quiet', show: { all: [{ flagUnset: 'murchProtected' }, { flagUnset: 'murchCaptured' }] }, effects: { flag: { murchCaptured: true, murchAbandoned: true }, goto: 'ch2:v-outpost', flash: 'You walk past. Behind you, the welding torch hisses on.' } },
      BACK_TO('ch2:v-outpost'),
    ],
  },
  {
    id: 'ch2:v-greg',
    kind: 'story',
    title: 'The Back Gate',
    body: 'Greg, out of the barge\'s shadow, unloading Cartel crates through a Seeker gate at night. He sees you and freezes. "Seeker business. Mine\'s private."',
    choices: [
      { id: 'deal', label: 'Deal', sub: 'Carry a crate in for him.', show: { all: [{ flagUnset: 'gregDealt' }, { flagUnset: 'gregSold' }] }, effects: { ticks: 1, flag: { gregDealt: true, crateKey: true, gregStanding: 'worked' }, flash: "'Keep your mouth shut, cup. This opens more than crates.'" } },
      { id: 'sell', label: 'Sell him out to Valerius', sub: 'Seeker Heat −2.', tone: 'danger', show: { all: [{ flagUnset: 'gregDealt' }, { flagUnset: 'gregSold' }] }, effects: { heat: { seekers: -2 }, flag: { gregSold: true, gregStanding: 'sold' }, goto: 'ch2:v-outpost' } },
      BACK_TO('ch2:v-outpost'),
    ],
  },
  {
    id: 'ch2:v-stair',
    kind: 'story',
    title: "Oram's Lower Stair",
    body: "Oram's marks again, Seeker-sealed. The seal answers the crate key, or Vex's hand on the stone.",
    choices: [
      { id: 'greg', label: 'Greg, in the stairwell', tone: 'danger', show: stairGreg, effects: { flag: { stairGregDone: true, ch2Fight: 'stairgreg' }, ambush: { kind: 'greg', line: "'You sold me to the lamps. Now I sell you to the dark.'" } } },
      { id: 'down', label: 'Open the seal', tone: 'hunger', show: { not: stairGreg }, effects: { goto: 'ch2:cache' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { all: [{ not: stairGreg }, unblown] }, effects: { goto: 'ch2:v-outpost' } },
    ],
  },
  {
    id: 'ch2:v-blown',
    kind: 'story',
    title: 'Cover Blown',
    body: `The lamps that bowed to you turn. 'False cup!' Sybella's drill team comes down the stair after you.\n\n${DRILL_BREACH}`,
    variants: drillVariants,
    choices: drillChoices('ch2:v-ribs', 'dragoon', 'Fight the dragoons', 'dragoons'),
  },
  {
    id: 'ch2:v-ribs',
    kind: 'story',
    title: 'The Collapse',
    body: `Valerius is ahead of you in the ribs, not behind. "She'll know I let you through. Unless I bring you back."`,
    variants: [
      { if: { flag: 'ch2SybellaNamed' }, mode: 'append', body: "'You used her name at the gate. She'll know. So will I.'" },
    ],
    choices: abyssChoices('Use the Spire Key on the ribs'),
  },

  // ── Outcast: "Cast Out Twice" ──
  {
    id: 'ch2:o-wash',
    kind: 'story',
    title: 'The Bone Wash',
    body: `The Bone Wash runs dry right to the teeth. Stakes in the riverbed, cord on them fresh. Stray Hunter work. The brand on your face itches in the heat.

${HORN_SPEECH}

The horn rasps again: "Not that one, Greg. The Strays want that one. Hold it for the price."

'A Stray at Miller's gate.' Greg spits. 'Strays pay. Once in scrap, once in manners.'

"Not today. Today you're worth more than the toll."`,
    choices: [
      { id: 'toll', label: 'Pay the toll', sub: '15 scrap.', show: TOLL_SHOW, enable: { itemMin: ['scrap', 15] }, locked: 'Needs: 15 scrap', effects: { remove: { scrap: 15 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'tollsap', label: 'Pay the toll in Sap', sub: '2 vials.', show: TOLL_SHOW, enable: { itemMin: ['vial_drop', 2] }, locked: 'Needs: 2 vials', effects: { remove: { vial_drop: 2 }, flag: { gregStanding: 'paid' }, goto: 'ch2:irongut', flash: TOLL_PAID } },
      { id: 'run', label: 'Run the wash past the platform', tone: 'danger', effects: { flag: { outcastBounty: true }, goto: 'ch2:o-stakes' } },
      { id: 'knot', label: "Show Ossa's Knot", show: knot, effects: { goto: 'ch2:o-stakes', flash: "Greg sees the stilt-cord at your brow. 'Ossa's. Huh.' He lets you go, for now." } },
    ],
  },
  {
    id: 'ch2:o-stakes',
    kind: 'story',
    title: 'The Stake Line',
    body: `${STRAY_ARRIVAL_LINE}\n\n${STRAY_OUTCAST_LINE}`,
    choices: [{ id: 'on', label: 'On to the Spine Root', tone: 'hunger', effects: { goto: 'ch2:o-root' } }],
  },
  {
    id: 'ch2:o-root',
    kind: 'story',
    title: 'The Spine Root',
    body: 'The Bleached Spine does not end at the desert. Here its vertebrae dive into the Maw like stepping stones into a throat, each one big as a shack. Strays have cut handholds. Somebody has scratched your brand\'s shape into one, and crossed it out.',
    variants: drillVariants,
    choices: [
      { id: 'strays', label: "The Strays' deep camp", effects: { goto: 'ch2:o-strays' } },
      { id: 'cage', label: 'The outpost ridge', effects: { goto: 'ch2:o-cage' } },
      { id: 'bounty', label: "Where Greg's crew waits", show: { all: [{ flagUnset: 'bountyFooled' }, { flagUnset: 'bountyBroken' }] }, effects: { goto: 'ch2:o-bounty' } },
      { id: 'scout', label: 'The dying scout', show: { flagUnset: 'siphonGot' }, effects: { add: { memory_siphon: 1 }, flag: { siphonGot: true }, flash: SIPHON_OUTCAST } },
      { id: 'stilts', label: 'Down the flooded gaps', tone: 'hunger', effects: { goto: 'ch2:o-stilts' } },
    ],
  },
  {
    id: 'ch2:o-strays',
    kind: 'talk',
    title: 'The Deep Camp',
    speaker: 'Murch',
    body: `Skiff hulls turned into roofs. Cord, resin, smoke. The Strays go quiet when they see the brand. Nobody draws. Nobody offers water.

Murch doesn't look at you. He says to the skiff he's fixing: 'Lift's at the third vertebra. Bring scrap. Don't say my name.'`,
    choices: [
      { id: 'scrap', label: 'Leave him scrap', sub: '2 scrap.', show: { flagUnset: 'murchScrap' }, enable: { itemMin: ['scrap', 2] }, locked: 'Needs: 2 scrap', effects: { remove: { scrap: 2 }, flag: { murchScrap: true, murchProtected: true }, flash: 'The scrap is gone from the stone when you look back.' } },
      { id: 'water', label: 'Beg for water', show: { all: [{ flagUnset: 'strayWater' }, { heatMax: ['strays', 2] }] }, effects: { add: { vial_drop: 1 }, flag: { strayWater: true }, flash: 'A child brings a cup and is called back before you can thank her.' } },
      BACK_TO('ch2:o-root'),
    ],
  },
  {
    id: 'ch2:o-bounty',
    kind: 'story',
    title: 'The Bounty',
    body: 'Greg\'s crew at a fire with two Stray Hunters, counting scrap into a hat. Your price. Greg is haggling. "Alive\'s worth more to Miller. Dead\'s easier to carry."',
    choices: [
      { id: 'trail', label: 'Sell them a false trail', sub: '1 Sap.', show: { all: [{ flagUnset: 'bountyFooled' }, { flagUnset: 'bountyBroken' }] }, enable: { sapMin: 2 }, locked: 'Need Sap to spare.', effects: { sap: -1, flag: { bountyFooled: true }, goto: 'ch2:o-root', flash: 'You leave stakes of your own, pointing the wrong way. By dark, Greg is arguing with the Hunters about whose fault it was.' } },
      { id: 'fight', label: 'Fight', tone: 'danger', show: { all: [{ flagUnset: 'bountyFooled' }, { flagUnset: 'bountyBroken' }] }, effects: { flag: { ch2Fight: 'bounty', gregStanding: 'hostile' }, ambush: { kind: 'greg', line: "Greg's crew comes up off the fire." } } },
      BACK_TO('ch2:o-root'),
    ],
  },
  {
    id: 'ch2:o-cage',
    kind: 'talk',
    title: 'The Outpost Ridge',
    speaker: 'Vex',
    body: `A bone cage on the ridge, Stray Hunter cord on the lock. Inside, a runner with eyes empty as an old well. Below, Valerius's lamps.

Vex touches his own face where your brand sits. 'Mine burned off. Or I don't remember it. Yours is still talking.'

'They're selling me down to the lamps. You're next on the list, I think.'

From below, Valerius: 'The Stray who cost me Camp-04.'`,
    variants: [{ if: { heatMin: ['strays', 4] }, mode: 'append', body: "'Your friends rioted my pens. You'll pay for every one.'" }],
    choices: [
      { id: 'cut', label: 'Cut the cord', sub: 'Needs a weapon.', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, enable: weapon, locked: 'Needs: a weapon', effects: { ticks: 1, flag: { vexFreed: true } } },
      { id: 'leave', label: 'Leave him', tone: 'quiet', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, effects: { flag: { vexLeft: true }, goto: 'ch2:o-root' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { any: [{ flag: 'vexFreed' }, { flag: 'vexLeft' }] }, effects: { goto: 'ch2:o-root' } },
    ],
  },
  {
    id: 'ch2:o-stilts',
    kind: 'story',
    title: "Ossa's Stilt-Walk",
    body: "Flooded gaps between the vertebrae, resin-black water. Ossa's cord at your brow. You remember how she walked: weight forward, never stop. You don't stop.",
    choices: [
      { id: 'reckon', label: 'Greg, at the water', tone: 'danger', show: { all: [outcastReckonDue, { flagUnset: 'spireKey' }] }, effects: { flag: { ch2Fight: 'reckoning', gregStanding: 'hostile' }, ambush: { kind: 'greg', line: "'Alive's worth more to Miller. Dead's easier to carry.'" } } },
      { id: 'lift', label: 'Ride the vertebra lift', tone: 'hunger', show: { all: [{ not: outcastReckonDue }, knot, { flag: 'murchScrap' }] }, effects: { ticks: 1, goto: 'ch2:cache' } },
      { id: 'walk', label: 'Walk the gaps', sub: '1 Sap.', tone: 'hunger', show: { all: [{ not: outcastReckonDue }, knot, { flagUnset: 'murchScrap' }] }, enable: { sapMin: 2 }, locked: 'Need Sap to spare.', effects: { sap: -1, ticks: 1, goto: 'ch2:cache' } },
      { id: 'vex', label: 'Follow Vex across', sub: '1 Sap.', tone: 'hunger', show: { all: [{ not: outcastReckonDue }, { not: knot }, { flag: 'vexFreed' }] }, effects: { sap: -1, ticks: 1, flag: { vexLed: true }, goto: 'ch2:cache' } },
      { id: 'wade', label: 'Wade in', tone: 'quiet', show: { all: [{ not: outcastReckonDue }, { not: knot }, { flagUnset: 'vexFreed' }] }, effects: { goto: 'ch2:trapped' } },
      BACK_TO('ch2:o-root'),
    ],
  },
  {
    id: 'ch2:o-hounds',
    kind: 'story',
    title: 'Drills and Hounds',
    body: `The drills come down the Spine Root behind you, and ahead of them, a shard-hound that already has your scent.\n\n${DRILL_BREACH}`,
    variants: drillVariants,
    choices: drillChoices('ch2:o-abyss', 'drilllead', 'Fight the drill lead', 'drill'),
  },
  {
    id: 'ch2:o-abyss',
    kind: 'story',
    title: "The Spine Root's Foot",
    body: "'The Stray who cost me Camp-04.'",
    variants: [
    ],
    choices: abyssChoices('Use the Spire Key on the vertebrae'),
  },

  // ── Shared ──
  // ── v169: the Red Maw Approach, the Ditch-Runners, the Decoy Gully, the Iron-Gut Pass ──
  {
    id: 'ch2:approach',
    kind: 'story',
    title: 'Red Maw Approach',
    body: `The Approach splits at a cairn of fused vertebrae.

To the center, the Main Gate: Greg's elevated turret barge squats across the mouth of the Maw, the toll bucket swinging on its rope. Fifteen scrap or two vials of Sap.

To the west ridge, a fissure: the Decoy Gully. A Cartel signal-pylon stands over it, its radar dish turning, two scrap-turrets on its shoulders.

Off the road, smoke rises from a drainage ditch.`,
    choices: [
      ...(Object.entries(CH2_STARTS) as [DoorId, string][]).map(([door, goto]) => ({ id: 'gate', label: 'The Main Gate', sub: "Greg's toll.", tone: 'hunger' as const, show: { door }, effects: { goto } })),
      { id: 'gully', label: 'The Decoy Gully', effects: { goto: 'ch2:gully' } },
      { id: 'ditch', label: 'The ditch camp', show: { any: [{ flagUnset: 'kipCodes' }, { flagUnset: 'kipFate' }] }, effects: { goto: 'ch2:ditch' } },
      { id: 'stash', label: 'Search the stash at the cairn', show: { all: [{ door: 'prisoner' }, { flagUnset: 'siphonGot' }] }, effects: { add: { memory_siphon: 1 }, flag: { siphonGot: true }, flash: SIPHON_PRISONER } },
    ],
  },
  {
    id: 'ch2:ditch',
    kind: 'talk',
    title: 'The Ditch-Runners',
    speaker: 'Kip and Mara',
    body: `Two Stray kids have made a camp in the ditch out of a tarp and a dead Cartel relay box. Kip, the older, keeps one hand on a knife. Mara is trying to wake the box with a bent wire.

'It talks to Miller's board,' she says. 'If it talked right, the board would think we're couriers.'`,
    variants: [
      { if: { flag: 'kipDistrust' }, mode: 'append', body: "Kip hasn't put the knife away since you opened their box." },
      { if: { flagEq: ['kipFate', 'hands'] }, mode: 'append', body: "They're packing for The Bleached Spine." },
    ],
    choices: [
      { id: 'relay', label: 'Repair the relay', sub: '2 scrap and the Sinew-Bind.', show: { all: [{ flagUnset: 'kipCodes' }, { flag: 'lashCord' }] }, enable: { itemMin: ['scrap', 2] }, locked: 'Needs: 2 scrap', effects: { remove: { scrap: 2 }, unsetFlag: ['lashCord'], add: { cartel_transponder: 1 }, flag: { kipCodes: 'fixed' }, flash: RELAY_FIXED } },
      { id: 'relay', label: 'Repair the relay', sub: '2 scrap and a Sinew-Bind.', show: { all: [{ flagUnset: 'kipCodes' }, { flagUnset: 'lashCord' }] }, enable: { all: [{ itemMin: ['scrap', 2] }, { item: 'sinew_cord' }] }, locked: 'Needs: 2 scrap and a Sinew-Bind', effects: { remove: { scrap: 2, sinew_cord: 1 }, add: { cartel_transponder: 1 }, flag: { kipCodes: 'fixed' }, flash: RELAY_FIXED } },
      { id: 'pry', label: 'Pry the codes out with a knife', tone: 'danger', show: { flagUnset: 'kipCodes' }, enable: { any: [{ item: 'needle_knife' }, { item: 'rusted_dagger' }, { item: 'shiv' }] }, locked: 'Needs: a knife', effects: { add: { cartel_transponder: 1 }, flag: { kipCodes: 'pried', kipDistrust: true }, flash: "You crack the casing with the blade and read the codes off the board yourself. FREQ-774. Kip watches your hands the whole time. Whatever they had to trade, they won't trade it to you." } },
      { id: 'water', label: 'Share your water', show: { flagUnset: 'kipFate' }, effects: { flag: { kipFate: 'hands' }, heat: { strays: -1 }, flash: "Mara drinks first. Kip drinks second, and finally lets go of the knife. 'The Bleached Spine,' he says. 'We'll work the camp there. Find us.'" } },
      { id: 'cold', label: 'Turn them away', tone: 'quiet', show: { flagUnset: 'kipFate' }, effects: { flag: { kipFate: 'gone' }, heat: { strays: 1 }, flash: "You send them up the ditch. Mara doesn't look back. Kip does. The Strays will hear about it. Stray Heat +1." } },
      BACK_TO('ch2:approach'),
    ],
  },
  {
    id: 'ch2:gully',
    kind: 'story',
    title: 'The Decoy Gully',
    body: `The fissure cuts the west ridge. Halfway up it, the Cartel signal-pylon: a radar dish, a horn on top, two auto scrap-turrets whose lenses follow anything warm. A junction box sits at its foot with an audio jack in it.

Past the pylon, an iron gate, latched.`,
    choices: [
      { id: 'splice', label: 'Splice into the junction box', sub: 'FREQ-774.', tone: 'hunger', enable: { item: 'cartel_transponder' }, locked: 'Needs: the Cartel Transponder Signal', effects: { flag: { gullyBypass: true, millerLogged: true, gregStanding: 'bypassed' }, goto: 'ch2:irongut', flash: `${GULLY_SPLICE}\n\n${MILLER_WHISTLE}` } },
      { id: 'run', label: 'Run the turrets', sub: 'Health −2. Cartel Heat +2.', tone: 'danger', effects: { health: -2, heat: { cartel: 2 }, flag: { gullyRun: true }, goto: 'ch2:irongut', flash: "The turrets cough. Scrap shot chews the fissure wall beside you, then you. You go over the gate bleeding. Up on the barge, Miller's horn blasts once." } },
      BACK_TO('ch2:approach'),
    ],
  },
  {
    id: 'ch2:irongut',
    kind: 'story',
    title: 'The Iron-Gut Pass',
    body: "The roads meet where the Maw narrows into a throat of riveted bone: the Iron-Gut Pass. Greg's platform is behind you now.",
    variants: [{ if: { flag: 'gullyBypass' }, mode: 'append', body: "Greg is still looking the other way. As far as he knows, you never came through. You could walk back up to his platform and trade, and he'd never ask for the toll." }],
    choices: (Object.entries(IRON_GUT_NEXT) as [DoorId, string][]).map(([door, goto]) => ({ id: 'on', label: 'Go on into the Maw', tone: 'hunger' as const, show: { door }, effects: { goto } })),
  },

  {
    id: 'ch2:cache',
    kind: 'story',
    title: "Kallik's Cache",
    body: `Under the true rib, Kallik's cache is still sealed: a niche cut into bone, and in it a rod of crystal crusted in pale amber. It hums against your teeth.

The Spire Key. A Pre-Collapse Crystalline Resonance Tuning Rod. It forces the lower Spire locks without tripping their purges. Everyone down here wants it. Now everyone down here wants you.`,
    choices: [
      { id: 'key', label: 'Take the Key', tone: 'hunger', show: { flagUnset: 'spireKey' }, effects: { add: { spire_key: 1 }, flag: { spireKey: true }, heat: { seekers: 2, cartel: 2 }, flash: KEY_TAKEN } },
      { id: 'niche', label: 'Search the back of the niche', show: { flagUnset: 'fluidTaken' }, effects: { add: { hydraulic_fluid: 1 }, flag: { fluidTaken: true }, flash: "Behind the rod, a sealed canister, cold and heavy, untouched since the old world fell. The label is gone. What's inside still sloshes." } },
      { id: 'back', label: 'Go on', tone: 'hunger', show: { all: [{ flag: 'spireKey' }, { door: 'prisoner' }] }, effects: { goto: 'ch2:p-drillrun' } },
      { id: 'back', label: 'Go on', tone: 'hunger', show: { all: [{ flag: 'spireKey' }, { door: 'vessel' }] }, effects: { flag: { coverBlown: true }, goto: 'ch2:v-blown' } },
      { id: 'back', label: 'Go on', tone: 'hunger', show: { all: [{ flag: 'spireKey' }, { door: 'outcast' }] }, effects: { goto: 'ch2:o-hounds' } },
    ],
  },
  {
    id: 'ch2:ribs',
    kind: 'story',
    title: 'The Abyssal Ribs',
    body: `The true ribs close overhead like a roof of bone. Between them, a Pre-Collapse lift platform hangs dead on its rails. Murch is on his back under the gear housing, goggles pushed up over his copper mask, swearing at it in a whisper.

Above you, Sybella's drill-rigs are breaking through. Every bite shakes grit down the shaft.`,
    variants: [
      { if: { flagUnset: 'murchProtected' }, body: "The true ribs close overhead like a roof of bone. Between them, a Pre-Collapse lift platform hangs dead on its rails, its gear housing jammed. Nobody is working on it.\n\nAbove you, Sybella's drill-rigs are breaking through. Every bite shakes grit down the shaft." },
      { if: { flag: 'liftDone' }, mode: 'append', body: 'The lift is ready.' },
      { if: vexPending, mode: 'append', body: "Vex has stopped walking. A raw Amber vein runs through the rib beside him, and he stares into it like it's calling him. 'It's in there. Who I was.'" },
    ],
    choices: [
      { id: 'scrap', label: 'Give Murch 3 scrap', sub: 'The lift runs. Murch keeps his kit.', show: { all: [{ flagUnset: 'liftDone' }, { flag: 'murchProtected' }] }, enable: { itemMin: ['scrap', 3] }, locked: 'Needs: 3 scrap', effects: { remove: { scrap: 3 }, flag: { liftDone: true, murchShop: 'full' }, flash: "He takes the scrap without looking. Three turns of the spanner and the platform shudders awake. 'Runs. It runs. Get on before it remembers it's dead.'" } },
      { id: 'force', label: 'Force the gear by hand', sub: 'Sap −1. Health −1.', tone: 'danger', show: { flagUnset: 'liftDone' }, enable: { sapMin: 2 }, locked: 'Need Sap to spare.', effects: { sap: -1, health: -1, flag: { liftDone: true }, flash: 'You put your whole back into the crank. Something in your shoulder gives before the gear does. Then the gear gives.' } },
      { id: 'ladder', label: 'Take the emergency ladder', sub: 'Murch dumps his tool-rig to climb.', tone: 'quiet', show: { all: [{ flagUnset: 'liftDone' }, { flag: 'murchProtected' }] }, effects: { flag: { liftDone: true, liftLadder: true, murchShop: 'stripped' }, flash: "Murch heaves his tool-rig down the shaft to make the climb. It hits bottom a long time later. 'That was everything,' he says. 'That was my whole shop.'" } },
      { id: 'ladder', label: 'Take the emergency ladder', tone: 'quiet', show: { all: [{ flagUnset: 'liftDone' }, { flagUnset: 'murchProtected' }] }, effects: { flag: { liftDone: true, liftLadder: true }, flash: 'Rung by rung, down the side of the rib. Some rungs hold.' } },
      { id: 'restrain', label: 'Restrain Vex', show: vexPending, effects: { flag: { vexFate: 'scout' }, flash: "You catch his arm and pull him off the vein. Vex blinks at the glow, then at you. Whatever he was, it stays in there. He stays with you. A scout for what comes next." } },
      { id: 'allow', label: 'Let him touch the vein', tone: 'danger', show: vexPending, effects: { flag: { vexFate: 'burn', bleedCore: true }, flash: "Vex puts both hands on the vein. The light goes into him and something goes out. When he turns, he doesn't know your face. He knows one thing. 'BLEED-CORE,' he says. 'Tell the airlock BLEED-CORE. It shuts behind you. It shuts on her.'" } },
      { id: 'siphon', label: 'Siphon the vein first', sub: 'Memory Siphon. Seeker Heat +1.', tone: 'danger', show: vexPending, enable: { item: 'memory_siphon' }, locked: 'Needs: the Memory Siphon', effects: { add: { deep_memory_pearl: 1 }, heat: { seekers: 1 }, flag: { vexFate: 'siphoned' }, flash: "You set the Siphon in the vein before he can touch it. The reservoir fills gold. The archway above you cracks down its length. Vex makes a sound like you took something from him. You did. He won't get it back now.\n\nSomewhere above, a Seeker lamp turns your way." } },
      { id: 'vein', label: 'Siphon the vein', sub: 'Memory Siphon. Seeker Heat +1.', show: { all: [{ not: vexPending }, { item: 'memory_siphon' }, { flagUnset: 'veinSiphoned' }, { flagUnset: 'vexFate' }] }, effects: { add: { deep_memory_pearl: 1 }, heat: { seekers: 1 }, flag: { veinSiphoned: true }, flash: 'The reservoir fills gold. Images that are not yours. Somewhere above, a Seeker lamp turns your way.' } },
      { id: 'ride', label: 'Ride the lift down', tone: 'hunger', show: { all: [{ flag: 'liftDone' }, { flagUnset: 'liftLadder' }, { not: vexPending }] }, effects: { goto: 'ch2:vein', flash: RIBS_CLIMAX } },
      { id: 'climb', label: 'Climb down', tone: 'hunger', show: { all: [{ flag: 'liftLadder' }, { not: vexPending }] }, effects: { goto: 'ch2:vein', flash: RIBS_CLIMAX_LADDER } },
    ],
    intents: [
      { tags: LIFT_DO, show: { all: [{ flagUnset: 'liftDone' }, HEAVY_TOOL] }, reply: 'You jam it into the gear teeth and lean. The housing groans, then turns. No blood this time.', effects: { flag: { liftDone: true } } },
      { tags: LIFT_DO, show: { flagUnset: 'liftDone' }, reply: 'Nothing you carry is heavy enough. You do it with your hands, and pay for it. Sap −1. Health −1.', effects: { sap: -1, health: -1, flag: { liftDone: true } } },
    ],
  },
  {
    id: 'ch2:vein',
    kind: 'story',
    title: 'The Primary Vein',
    body: 'The lift grinds to a stop at the foot of the ribs. A vein of raw amber resin runs into a Pre-Collapse airlock set in the bone. The airlock hums at a pitch you feel in your teeth.',
    variants: [{ if: { item: 'spire_key' }, mode: 'append', body: 'The Spire Key hums back.' }],
    choices: [
      { id: 'key', label: 'Set the Spire Key to the vein', tone: 'hunger', show: { item: 'spire_key' }, effects: { goto: 'ch2:heart', flash: 'The Key finds the pitch. The airlock opens.' } },
      { id: 'code', label: 'Speak BLEED-CORE', tone: 'hunger', show: { all: [{ not: { item: 'spire_key' } }, { any: [{ flag: 'bleedCore' }, { flag: 'airlockFreq' }] }] }, effects: { flag: { airlockSealed: true }, goto: 'ch2:heart', flash: 'The airlock takes the code, opens, and slams shut behind you. Through the bone, a drill stalls against the seal.' } },
      { id: 'seal', label: 'Speak BLEED-CORE behind you', show: { all: [{ item: 'spire_key' }, { flag: 'bleedCore' }, { flagUnset: 'airlockSealed' }] }, effects: { flag: { airlockSealed: true }, flash: "You say it to the bone. The airlock hums lower. Whatever comes down after you will find it shut." } },
      { id: 'sealed', label: 'Try the lock', tone: 'quiet', show: { all: [{ not: { item: 'spire_key' } }, { flagUnset: 'bleedCore' }, { flagUnset: 'airlockFreq' }] }, effects: { goto: 'ch2:trapped' } },
    ],
  },
  {
    id: 'ch2:trapped',
    kind: 'ending',
    title: 'Sealed Out',
    body: 'The lock wants a key you do not have. The airlock will not hum for you. Behind you, drills scream through the last bulkhead.\n\nThere is nowhere left in the beast to go.',
    variants: [
      { if: { door: 'prisoner' }, body: "The cage won't move. Up is the problem.\n\nThere is nowhere left in the beast to go." },
      { if: { door: 'outcast' }, body: 'The water rises between the bones. No cord, no guide, no key.\n\nThere is nowhere left in the beast to go.' },
    ],
    choices: [{ id: 'again', label: 'Start Chapter Two again', sub: 'Back to where your door came down. Hands refilled. Chapter One stays.', tone: 'hunger', effects: { restoreCheckpoint: true } }],
  },
  {
    id: 'ch2:heart',
    kind: 'story',
    title: 'The Bleached Heart',
    body: 'Light. The airlock opens onto a hollow of white bone, and through it runs a vein of glowing amber resin thick as a river: the Primary Amber Resin Vein. The Bleached Heart.\n\nThe door seals behind you. An alarm starts, low and endless. Barge horns answer it, echoing through the bone. Over them, a raspy voice: "Greg. We lost them."',
    choices: [{ id: 'continue', label: 'Continue', tone: 'hunger', effects: { goto: 'ch2:end' } }],
  },
  {
    id: 'ch2:end',
    kind: 'ending',
    title: 'End of Chapter Two',
    body: 'END OF CHAPTER TWO',
    choices: [{ id: 'title', label: 'Back to the title', sub: 'Your game is saved.', tone: 'quiet', effects: { flag: { chapter2Done: true } } }],
  },
]


/** The end screen summary, read from the run's flags. */
export function chapterTwoSummary(f: Record<string, unknown>, items: Record<string, number | undefined>): string {
  const key = f.keySurrendered ? 'surrendered to Greg' : 'kept'
  const statues = f.statueSiphoned ? 'freed' : 'sealed'
  const pearl = (items.deep_memory_pearl ?? 0) > 0 || f.statueSiphoned ? 'yes' : 'no'
  const vex = f.vexFate === 'scout' ? 'scout' : f.vexFate === 'burn' ? 'memory burned (BLEED-CORE)' : f.vexFate === 'siphoned' ? 'siphoned, no recovery' : f.vexFate === 'freq' ? 'gave the frequency' : 'left in chains'
  const shop = f.murchShop === 'stripped' ? ' (shop stripped)' : ''
  const kip = f.kipFate === 'hands' ? 'camp-hands at The Bleached Spine' : f.kipFate === 'gone' ? 'turned away' : 'not met'
  const murch = f.murchProtected ? 'safe: vendor ahead' : f.murchCaptured ? 'captured' : 'left behind'
  const g = f.gregStanding
  const greg = g === 'hostile' ? 'enemies' : g === 'paid' ? 'paid' : g === 'worked' ? 'worked for them' : g === 'bypassed' ? 'slipped past' : g === 'sold' ? 'sold out' : 'never settled'
  return [
    'END OF CHAPTER TWO',
    `Spire Key: ${key}`,
    `Statues: ${statues}  (Deep-Memory Pearl: ${pearl})`,
    `Vex: ${vex}`,
    `Murch "The Socket": ${murch}${shop}`,
    `Kip and Mara: ${kip}${f.kipDistrust ? ' (trust lost)' : ''}`,
    `Greg and Miller: ${greg}`,
    `Chapter Three code: ${CH3_CODE}`,
  ].join('\n\n')
}

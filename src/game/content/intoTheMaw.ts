import type { Cond, Scene } from '../types'

/**
 * v166: Chapter Two, "Into the Belly of the Beast". Opened only by the vault code at the Chapter One end screen
 * (or the Legacy Redemption box on the Rim). Plain data: no kit or catalog reads at module load.
 */
export const CH2_CODE = 'LEAD-N3X7'
export const CH2_CHAPTER = 'into-the-maw'
export const CH2_START = 'ch2:jaws'
export const CH3_CODE = 'ABYSS-7REE'

export const CH2_UNLOCK_LINE = 'The code leaves your mouth and the Maw answers. Warm breath rolls up out of the dark. Somewhere below, bone shifts.'
export const CH2_CARD = 'CHAPTER TWO: INTO THE BELLY OF THE BEAST'
export const LEGACY_OK = 'The vault code takes. The Maw remembers you.'
export const LEGACY_BAD = 'The Maw does not answer that.'

export const DRILL_LINES = [
  '',
  'Far above, a drill bites bone. Sybella is coming down.',
  'The hammering is closer. Dust sifts from the ribs.',
  'A bulkhead behind you screams and gives. Her drill team is through.',
] as const

export const MILLER_TURRETS = 'Barge horn, raspy: "Greg. Wake the turrets."'
export const TURRET_LINE = 'The rail turrets cough. Grit and iron chew the water beside the skiff. You make the far side bleeding.'
export const MURCH_LIFT_LIVE = "\"Lift's live! Shroud-tuned, no purge, no alarm. Get in or get entombed!\""
export const KEY_TAKEN = 'Spire Key taken. The Seekers want it. The Cartel wants it. You have it.'
export const RECKONING_LOST = "Greg weighs the rod in his palm and grins. 'Smart. Miller remembers smart.'"
export const VALERIUS_LOOT = "Valerius's shock-baton and a cipher key, left in the dust where he ran."

const gregFriendly: Cond = { any: [{ flagEq: ['gregStanding', 'paid'] }, { flagEq: ['gregStanding', 'worked'] }, { flag: 'gregTalkedDown' }] }
const badCartel: Cond = {
  any: [{ flagEq: ['gregStanding', 'bypassed'] }, { flagEq: ['gregStanding', 'hostile'] }, { flag: 'skiffAlarm' }, { all: [{ flagEq: ['gregStanding', 'owed'] }, { flagUnset: 'gregJobDone' }] }],
}
const notForced: Cond = { not: { flagEq: ['drillStage', 3] } }
const pastOutpost: Cond = { any: [{ flag: 'outpostPast' }, { flag: 'riotStarted' }] }
const slipHelp: Cond = { any: [{ flag: 'vexFreed' }, { flag: 'statueSiphoned' }, { flag: 'riotStarted' }] }
const OUTPOST_SPOTTED = 'A lamp finds your face. Two Seekers peel off the line.'
const DRILL_SPOTTED = 'A drill lamp swings. The team lead turns with it.'
const abyssClear: Cond = { any: [{ flag: 'ch2Won_valerius' }, { flag: 'ribsCollapsed' }] }

export const chapterTwoScenes: Scene[] = [
  {
    id: 'ch2:gate',
    kind: 'story',
    title: CH2_CARD,
    body: `${CH2_UNLOCK_LINE}\n\n${CH2_CARD}`,
    variants: [{ if: { flag: 'ch2Legacy' }, body: `${LEGACY_OK}\n\n${CH2_CARD}` }],
    choices: [{ id: 'down', label: 'Go down', tone: 'hunger', effects: { goto: CH2_START } }],
  },
  {
    id: 'ch2:legacy',
    kind: 'story',
    title: 'Legacy Redemption',
    body: 'LEGACY REDEMPTION\n\nYour run reached the Maw before the way down was opened. If you have the code, enter it here.',
    choices: [
      { id: 'code', label: 'Input Vault Code / Legacy Code', sub: 'Type it in the Do box.', effects: { still: true } },
      { id: 'back', label: 'Back', tone: 'quiet', effects: { goto: 'maw:rim', enterHub: 'redmaw' } },
    ],
  },
  {
    id: 'ch2:jaws',
    kind: 'story',
    title: 'The Petrified Jaws',
    body: `The jaws stand open forever: teeth of stone taller than skiffs, red with old marrow. Between them, Grizzled Miller's armored skiffs sit nose to nose on a platform across the choke point. Lamps on poles. Turrets on the rails.

On the platform stands Greg Ambergrin, Miller's lieutenant, in a grease-stained coat with Miller's heavy iron brand stamped on the lapel. "Miller's gate. Miller's jaws. I just collect. Fifteen scrap, or two vials of refined Oasis Sap. Nobody goes down the beast's throat for free."

Above you, the Rim goes quiet. Sybella's people are closing the surface. There is no climbing back out.`,
    variants: [
      { if: { door: 'prisoner' }, mode: 'append', body: "Greg looks at your brand and doubles the talk, not the price. 'Cartel stock walking itself back. Miller'll laugh.'" },
      { if: { door: 'outcast' }, mode: 'append', body: "'A Stray at Miller's gate.' Greg spits. 'Strays pay. Once in scrap, once in manners.'" },
      { if: { door: 'vessel' }, mode: 'append', body: "Greg sees the gold dust on you and steps back. 'Seeker business goes through. Seeker business also pays.'" },
      { if: { flag: 'gregBroke' }, mode: 'append', body: "Greg sighs. 'Then work. A Cartel supply crate went missing down in the decoy holes. Bring it back. Or plant this bug near Valerius's perimeter. Either one buys you the gate.'" },
    ],
    choices: [
      { id: 'through', label: 'Go through the jaws', tone: 'hunger', show: { any: [{ flag: 'gatePassed' }, { flag: 'ch2Won_gate' }] }, effects: { goto: 'ch2:ribs', flag: { gatePassed: true } } },
      { id: 'scrap', label: 'Pay 15 scrap', show: { flagUnset: 'gatePassed' }, enable: { itemMin: ['scrap', 15] }, locked: 'Need 15 scrap.', effects: { remove: { scrap: 15 }, flag: { gregStanding: 'paid', gatePassed: true }, goto: 'ch2:ribs', flash: "Greg counts it twice. 'Miller thanks you. I don't.'" } },
      { id: 'vials', label: 'Pay 2 vials of refined Oasis Sap', show: { flagUnset: 'gatePassed' }, enable: { itemMin: ['vial_drop', 2] }, locked: 'Need 2 vials of Sap.', effects: { remove: { vial_drop: 2 }, flag: { gregStanding: 'paid', gatePassed: true }, goto: 'ch2:ribs', flash: "He holds a vial to the lamp. 'Clean. Go on.'" } },
      { id: 'broke', label: "Tell him you're broke", show: { all: [{ flagUnset: 'gatePassed' }, { flagUnset: 'gregBroke' }] }, effects: { flag: { gregBroke: true } } },
      { id: 'crate', label: 'Take the crate job', sub: 'Find his crate in a decoy hole.', show: { all: [{ flagUnset: 'gatePassed' }, { flag: 'gregBroke' }] }, effects: { flag: { gregJob: 'crate', gregStanding: 'owed', gatePassed: true }, goto: 'ch2:ribs' } },
      { id: 'bug', label: 'Take the bug job', sub: "Plant it at Valerius's perimeter.", show: { all: [{ flagUnset: 'gatePassed' }, { flag: 'gregBroke' }] }, effects: { flag: { gregJob: 'bug', gregStanding: 'owed', gatePassed: true }, goto: 'ch2:ribs' } },
      { id: 'hotwire', label: 'Hotwire the bypass door', sub: '3 scrap, 1 Sap.', show: { flagUnset: 'gatePassed' }, enable: { all: [{ itemMin: ['scrap', 3] }, { sapMin: 2 }] }, locked: 'Need 3 scrap and Sap to spare.', effects: { remove: { scrap: 3 }, sap: -1, flag: { gregStanding: 'bypassed', gatePassed: true }, goto: 'ch2:ribs' } },
      { id: 'skiff', label: 'Take the Stray skiff route', sub: 'Risky.', tone: 'danger', show: { flagUnset: 'gatePassed' }, effects: { flag: { ch2SkiffRoll: true, gregStanding: 'bypassed', gatePassed: true }, goto: 'ch2:ribs' } },
      { id: 'fight', label: 'Fight the gate', tone: 'danger', show: { all: [{ flagUnset: 'gatePassed' }, { flagUnset: 'ch2Won_gate' }] }, effects: { flag: { gregStanding: 'hostile', ch2Fight: 'gate' }, ambush: { kind: 'greg', line: "Greg rolls his shoulders. 'Miller's going to love this.'" } } },
    ],
  },
  {
    id: 'ch2:ribs',
    kind: 'story',
    title: 'The Ribcage Approach',
    body: 'Inside, the beast is a cathedral of bone. Ribs arch overhead into the dark, and between them gaps that look like paths. Most are not. Dust hangs red and low. You can see three ribs ahead, no more.',
    variants: [
      { if: { flagEq: ['drillStage', 1] }, mode: 'append', body: DRILL_LINES[1] },
      { if: { flagEq: ['drillStage', 2] }, mode: 'append', body: DRILL_LINES[2] },
      { if: { flagEq: ['drillStage', 3] }, mode: 'append', body: DRILL_LINES[3] },
    ],
    choices: [
      { id: 'gaps', label: 'Read the gaps', show: notForced, effects: { goto: 'ch2:gaps' } },
      { id: 'statues', label: 'Go to the statues', show: notForced, effects: { goto: 'ch2:statues' } },
      { id: 'murch', label: 'Follow the hammering', show: notForced, effects: { goto: 'ch2:murch' } },
      { id: 'outpost', label: 'Follow the lamplight', show: notForced, effects: { goto: 'ch2:outpost' } },
      { id: 'deep', label: 'Take the deep gap', sub: "Kallik's Cache.", show: { flagUnset: 'spireKey' }, enable: { flag: 'truePath' }, locked: 'You have not found the true path.', effects: { goto: 'ch2:cache' } },
      { id: 'reckon', label: 'Go down to the spine', tone: 'hunger', show: { all: [{ flag: 'spireKey' }, badCartel, { flagUnset: 'reckoningDone' }] }, effects: { goto: 'ch2:toll-back' } },
      { id: 'spine', label: 'Go down to the spine', tone: 'hunger', show: { all: [{ flag: 'spireKey' }, { not: { all: [badCartel, { flagUnset: 'reckoningDone' }] } }] }, effects: { goto: 'ch2:spine' } },
    ],
  },
  {
    id: 'ch2:gaps',
    kind: 'story',
    title: 'The Gaps',
    body: 'You walk the gaps rib by rib. Some breathe. Some only look like they do. A decoy hole will take your Sap and give back dust.',
    variants: [{ if: { flag: 'truePath' }, mode: 'append', body: 'The true path runs under the third rib, down to the deep gap.' }],
    choices: [
      { id: 'read', label: 'Find the true path', sub: '1 Sap.', show: { flagUnset: 'truePath' }, enable: { sapMin: 2 }, locked: 'Need Sap to spare.', effects: { sap: -1, ticks: 1, flag: { truePath: true } } },
      { id: 'decoy', label: 'Search a decoy hole', sub: '1 Sap.', show: { all: [{ flagEq: ['gregJob', 'crate'] }, { flagUnset: 'gregJobDone' }] }, enable: { sapMin: 2 }, locked: 'Need Sap to spare.', effects: { sap: -1, ticks: 1, risk: { oneIn: 3, health: 1 }, flag: { gregJobDone: true, gregStanding: 'worked' }, flash: "Down in the third hole, under a slide of red grit: a Cartel crate, Miller's brand on the lid. A skiff runner hauls it up the jaws for Greg. The gate is paid." } },
      { id: 'back', label: 'Back', tone: 'quiet', effects: { goto: 'ch2:ribs' } },
    ],
  },
  {
    id: 'ch2:statues',
    kind: 'story',
    title: 'The Amber Garden',
    body: 'Figures stand in the red dust, sealed in amber to the throat. Hands raised. Mouths open. These are people.\n\nWhen the Shroud current passes, one of them hums. Another twitches.',
    choices: [
      { id: 'siphon', label: 'Siphon a statue', sub: 'Needs a Seeker Extractor.', show: { flagUnset: 'statueSiphoned' }, enable: { item: 'seeker_extractor' }, locked: 'You need something to draw the resin.', effects: { flag: { statueSiphoned: true, ch2Fight: 'garden' }, add: { deep_memory_pearl: 1 }, goto: 'ch2:survivor', sneak: { odds: 3, kind: 'seekerpatrol', spotted: "Lamps swing your way. 'Thief at the garden!'" }, flash: "Images that aren't yours. Then the amber cracks, and a body falls into your arms, breathing." } },
      { id: 'leave', label: 'Leave them sealed', show: { flagUnset: 'statueSiphoned' }, effects: { goto: 'ch2:ribs' } },
      { id: 'back', label: 'Back', tone: 'quiet', effects: { goto: 'ch2:ribs' } },
    ],
  },
  {
    id: 'ch2:survivor',
    kind: 'story',
    title: 'The Amber Garden',
    body: "'You pulled me out. I won't forget it. I know where something's buried.'",
    choices: [
      { id: 'coord', label: 'Take the coordinate', show: { all: [{ flagUnset: 'stashCoord' }, { flagUnset: 'survivorSent' }] }, effects: { flag: { stashCoord: true }, goto: 'ch2:ribs', flash: 'A stash marker, scratched into your arm in grit. Something for later.' } },
      { id: 'send', label: 'Send them to The Bleached Spine', show: { all: [{ flagUnset: 'stashCoord' }, { flagUnset: 'survivorSent' }] }, effects: { flag: { survivorSent: true }, heat: { strays: -1 }, goto: 'ch2:ribs', flash: 'They go up toward the Strays. The Bleached Spine will remember the favor.' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { any: [{ flag: 'stashCoord' }, { flag: 'survivorSent' }] }, effects: { goto: 'ch2:ribs' } },
    ],
  },
  {
    id: 'ch2:murch',
    kind: 'talk',
    title: 'The Dead Lift',
    body: `"Listen! You hear that high whine? That's not the wind in the ribs, friend. That's a Seeker drill-head biting into the bulkhead two levels up. Hand me that 10-millimeter cipher-tap, or we're all getting entombed in resin before this elevator cycles!"

A thin, stoop-shouldered man is elbow-deep in a Pre-Collapse lift panel. Grease-stained canvas jumpsuit, leather patches at the knees and elbows, welder's goggles with amber lenses pushed up on a sweaty forehead. A heavy spanner is strapped to his thigh. His oil-black fingers never stop tapping. He looks at you for one second, then back over his shoulder.

"Murch. The Socket. Strays' tinker. Came down chasing Kallik's Cache, got a cave-in on the upper shaft instead. This lift is the only way out that isn't a drill-head. I need scrap, I need hydraulic fluid, and I need somebody keeping Seeker dragoons off my back."`,
    variants: [
      { if: { all: [gregFriendly, { flagUnset: 'murchWarySeen' }] }, mode: 'append', body: "Murch's eyes catch the Cartel on you. \"Ambergrin's gate let you through easy, huh. His enforcers chased me into the dunes. Keep your hands where I see 'em.\"" },
      { if: { flag: 'murchLift' }, mode: 'append', body: MURCH_LIFT_LIVE },
    ],
    choices: [
      { id: 'scrap', label: 'Give him scrap', sub: '3 scrap.', show: { flagUnset: 'murchScrap' }, enable: { itemMin: ['scrap', 3] }, locked: 'Need 3 scrap.', effects: { remove: { scrap: 3 }, flag: { murchScrap: true, murchWarySeen: true }, flash: '"Scrap. Good scrap. The Adjuster likes good scrap." He taps the spanner.' } },
      { id: 'fluid', label: 'Give him hydraulic fluid', show: { flagUnset: 'murchFluid' }, enable: { item: 'hydraulic_fluid' }, locked: 'You have no hydraulic fluid.', effects: { remove: { hydraulic_fluid: 1 }, flag: { murchFluid: true, murchWarySeen: true }, flash: '"Fluid! The rams were dry as a Seeker\'s sermon."' } },
      { id: 'dragoons', label: 'Hold off the Seeker dragoons', tone: 'danger', show: { flagUnset: 'ch2Won_dragoons' }, effects: { flag: { ch2Fight: 'dragoons', murchWarySeen: true }, ambush: { kind: 'dragoon', line: 'Gold-trimmed riders come down the rib on resin-shod mounts. Seeker dragoons. Murch does not look up.' } } },
      { id: 'him', label: 'Ask about him', group: 'talk', effects: { flag: { murchWarySeen: true }, flash: '"Cartel repair bays, edge of the Maw. Kept their haul-skiffs on their runners. They told me to weld a vent shut on a Seeker container. People inside. I didn\'t. Ran before the chains got me. The Strays took me in."' } },
      { id: 'ribs', label: 'Ask about the Ribs', group: 'talk', effects: { flag: { murchWarySeen: true }, flash: '"Ask Vex. Vex knows the Ribs. Vex doesn\'t know Vex, but Vex knows the Ribs."' } },
      { id: 'leave', label: 'Leave him', tone: 'quiet', show: { all: [{ flagUnset: 'murchLift' }, { flagUnset: 'murchAbandoned' }] }, effects: { flag: { murchAbandoned: true, murchWarySeen: true }, goto: 'ch2:ribs' } },
      { id: 'back', label: 'Back', tone: 'quiet', show: { any: [{ flag: 'murchLift' }, { flag: 'murchAbandoned' }] }, effects: { goto: 'ch2:ribs', flag: { murchWarySeen: true } } },
    ],
  },
  {
    id: 'ch2:outpost',
    kind: 'story',
    title: "Valerius's Outpost",
    body: `Lamps. Mobile amber vats on runners, steaming. Workers in chains dig under shock-baton guard: captured scavengers, indebted Strays, heretics. Seeker patrols in pairs.

At the center, thinner than you remember, eyes too bright: Valerius. Camp-04 broke him. He reports to Sybella now, and he is terrified of failing her.

He sees you. He does not charge. "You. She wants you. When she has you, I am forgiven. Go down, if you like. Every road down ends at my door."`,
    variants: [
      { if: { door: 'prisoner' }, mode: 'append', body: "'My stock. My runaway stock.'" },
      { if: { door: 'outcast' }, mode: 'append', body: "'The Stray who cost me Camp-04.'" },
      { if: { door: 'vessel' }, mode: 'append', body: "'Sybella wants the Vessel. I get my name back.'" },
      { if: { flag: 'riotStarted' }, mode: 'append', body: 'The chains go slack. The workers rise. The guards have bigger problems than you.' },
    ],
    choices: [
      { id: 'sneak', label: 'Sneak past the patrols', show: { all: [{ not: pastOutpost }, { flagUnset: 'statueSiphoned' }] }, effects: { ticks: 1, flag: { outpostPast: true, ch2Fight: 'outpost' }, sneak: { odds: 4, kind: 'seekerpatrol', spotted: OUTPOST_SPOTTED } } },
      { id: 'sneak-easy', label: 'Sneak past the patrols', sub: 'The garden taught you their lamps.', show: { all: [{ not: pastOutpost }, { flag: 'statueSiphoned' }] }, effects: { ticks: 1, flag: { outpostPast: true, ch2Fight: 'outpost' }, sneak: { odds: 2, kind: 'seekerpatrol', spotted: OUTPOST_SPOTTED } } },
      { id: 'bug', label: "Plant Greg's bug", show: { all: [{ flagEq: ['gregJob', 'bug'] }, { flagUnset: 'gregJobDone' }] }, enable: pastOutpost, locked: 'The patrols are between you and the perimeter.', effects: { ticks: 1, risk: { oneIn: 3, health: 1 }, flag: { gregJobDone: true, gregStanding: 'worked' }, flash: "The bug goes into a pylon seam at the perimeter. Somewhere up the jaws, Greg's set starts listening. The gate is paid." } },
      { id: 'vex', label: 'Find Vex in the chains', enable: pastOutpost, locked: 'The patrols are between you and the chains.', show: { all: [{ flagUnset: 'vexFreed' }, { flagUnset: 'vexLeft' }] }, effects: { goto: 'ch2:vex' } },
      { id: 'pylons', label: 'Sabotage the guard pylons', sub: '2 scrap, 1 Sap. Starts a riot.', show: { flagUnset: 'riotStarted' }, enable: { all: [{ itemMin: ['scrap', 2] }, { sapMin: 2 }] }, locked: 'Need 2 scrap and Sap to spare.', effects: { remove: { scrap: 2 }, sap: -1, flag: { riotStarted: true }, heat: { seekers: 1 } } },
      { id: 'bribe', label: 'Bribe Greg to hit the perimeter', sub: '4 scrap. Starts a riot.', show: { all: [{ flagUnset: 'riotStarted' }, { not: { flagEq: ['gregStanding', 'hostile'] } }] }, enable: { itemMin: ['scrap', 4] }, locked: 'Need 4 scrap.', effects: { remove: { scrap: 4 }, flag: { riotStarted: true }, flash: 'Barge horn, raspy: "Greg. Make some noise."' } },
      { id: 'ignore', label: 'Ignore the workers', tone: 'quiet', effects: { goto: 'ch2:ribs' } },
      { id: 'back', label: 'Back away', tone: 'quiet', effects: { goto: 'ch2:ribs' } },
    ],
  },
  {
    id: 'ch2:vex',
    kind: 'talk',
    title: 'Vex "The Hollow"',
    body: `A runner in chains, eyes empty as an old well. "I don't know my name. They call me Vex. The Hollow. I know the Ribs. Every gap. And I know the vein down there has my past in it. I'm going to touch it."`,
    choices: [
      { id: 'free', label: 'Break the chain', sub: 'Vex joins you.', effects: { flag: { vexFreed: true, truePath: true }, goto: 'ch2:outpost', flash: 'The chain parts. Vex rubs his wrist and points down. "Third rib. The deep gap. No decoys."' } },
      { id: 'ask', label: 'Ask the way, then leave Vex', effects: { flag: { vexLeft: true, truePath: true }, goto: 'ch2:outpost', flash: '"Third rib. The deep gap." He goes back to digging.' } },
      { id: 'leave', label: 'Leave Vex', tone: 'quiet', effects: { flag: { vexLeft: true }, goto: 'ch2:outpost' } },
    ],
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
      { id: 'back', label: 'Back', tone: 'quiet', show: { flag: 'spireKey' }, effects: { goto: 'ch2:ribs' } },
    ],
  },
  {
    id: 'ch2:toll-back',
    kind: 'story',
    title: "Greg's Reckoning",
    body: `Skiff lamps drop over the ribs. Greg Ambergrin steps out with a crew behind him, coat open, the iron brand catching the light. "Miller heard you're carrying. Hand the rod over and you walk down with all your teeth."

Barge horn, raspy: "Greg. Take it."`,
    choices: [
      { id: 'on', label: 'Go on down', tone: 'hunger', show: { flag: 'reckoningDone' }, effects: { goto: 'ch2:spine' } },
      { id: 'hand', label: 'Hand over the Spire Key', show: { flagUnset: 'reckoningDone' }, effects: { remove: { spire_key: 1 }, flag: { keySurrendered: true, reckoningDone: true }, flash: RECKONING_LOST } },
      { id: 'talk', label: 'Talk him down', show: { all: [{ flagUnset: 'reckoningDone' }, { flag: 'gregJob' }] }, enable: { flag: 'gregJobDone' }, locked: 'You never finished his job.', effects: { flag: { reckoningDone: true, gregTalkedDown: true }, flash: "Greg hesitates. 'You did Miller a favor. This once.'" } },
      { id: 'fight', label: 'Fight for it', tone: 'danger', show: { flagUnset: 'reckoningDone' }, effects: { flag: { ch2Fight: 'reckoning', gregStanding: 'hostile' }, ambush: { kind: 'greg', line: 'Greg and his skiff crew close in. The rod hums in your pack.' } } },
    ],
  },
  {
    id: 'ch2:spine',
    kind: 'story',
    title: 'The Petrified Spine',
    body: 'The spine runs down into the dark like a stair built for something larger than people. The rib you opened in Chapter One was only the Outer Rib. Below, the Abyssal Ribs: arches of bone sealed against the pressure.',
    choices: [
      { id: 'climb', label: 'Climb down the spine', sub: '1 Sap.', effects: { sap: -1, ticks: 1, goto: 'ch2:drill' } },
      { id: 'lift', label: "Ride Murch's lift", show: { flag: 'murchLift' }, effects: { ticks: 1, flag: { murchRode: true }, goto: 'ch2:drill', flash: "\"I owe you a lift. And a discount. Mostly the lift.\"" } },
      { id: 'vex', label: 'Let Vex lead', show: { flag: 'vexFreed' }, effects: { ticks: 1, flag: { vexLed: true }, goto: 'ch2:drill' } },
    ],
  },
  {
    id: 'ch2:drill',
    kind: 'story',
    title: 'The Drill Team',
    body: 'Behind you, a bulkhead bursts. Lamps, drills, and Sybella\'s people pour through the dust. She is not with them. She does not need to be.',
    variants: [{ if: { all: [{ flagUnset: 'murchLift' }] }, mode: 'append', body: 'Through the dust you see them drag Murch off the lift, the Adjuster still strapped to his leg.' }],
    choices: [
      { id: 'on', label: 'Go on to the Abyssal Rib', tone: 'hunger', show: { flag: 'drillPast' }, effects: { goto: 'ch2:abyssal' } },
      { id: 'slip', label: 'Slip past', sub: '1 Sap.', show: { all: [{ flagUnset: 'drillPast' }, { not: slipHelp }] }, effects: { sap: -1, ticks: 1, flag: { drillPast: true, ch2Fight: 'drill' }, sneak: { odds: 5, kind: 'drilllead', spotted: DRILL_SPOTTED } } },
      { id: 'slip-easy', label: 'Slip past', sub: '1 Sap. Easier: you have help.', show: { all: [{ flagUnset: 'drillPast' }, slipHelp] }, effects: { sap: -1, ticks: 1, flag: { drillPast: true, ch2Fight: 'drill' }, sneak: { odds: 2, kind: 'drilllead', spotted: DRILL_SPOTTED } } },
      { id: 'hold', label: 'Hold them', tone: 'danger', show: { flagUnset: 'drillPast' }, effects: { flag: { ch2Fight: 'drill', drillPast: true }, ambush: { kind: 'drilllead', line: 'The drill team lead steps out ahead of the rig, a hand-drill on a strap, goggles down.' } } },
      { id: 'run', label: 'Run', sub: 'Costs a hand.', show: { flagUnset: 'drillPast' }, effects: { flag: { drillPast: true, ch2RunHand: true }, goto: 'ch2:abyssal', flash: 'You run the last ribs flat out. It costs you a hand.' } },
    ],
  },
  {
    id: 'ch2:abyssal',
    kind: 'story',
    title: 'The Abyssal Rib',
    body: `The arch is sealed bone and Pre-Collapse metal. A lock in it is shaped to the Key. Beyond it, an airlock.

Between you and it: Valerius, an execution squad, and an amber-powered drill rig, its bit glowing.

"She will be here soon," he says, and his voice shakes. "Give me the rod and the Vessel, and I live."`,
    variants: [
      { if: { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] }, mode: 'append', body: "Vex walks toward the glow. 'It's in there. Who I was.'" },
      { if: { flag: 'ribsCollapsed' }, mode: 'append', body: 'The rod sings. The pressure seals let go above them. The Abyssal Ribs come down on the squad and the rig as you throw yourself through.' },
      { if: { flagEq: ['vexFate', 'freq'] }, mode: 'append', body: 'Vex touches the vein and folds. His last words: "The airlock hums... match it..."' },
    ],
    choices: [
      { id: 'stopvex', label: 'Stop him', show: { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] }, effects: { flag: { vexFate: 'scout' }, flash: 'You catch his arm. Vex blinks at the glow, then at you. He stays. A scout for what comes next.' } },
      { id: 'letvex', label: 'Let him go', show: { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] }, effects: { flag: { vexFate: 'freq', airlockFreq: true } } },
      { id: 'fight', label: 'Fight Valerius', tone: 'danger', show: { not: abyssClear }, effects: { flag: { ch2Fight: 'valerius' }, ambush: { kind: 'overseer', line: 'Overseer Valerius. Shock-baton up, the squad at his back, the rig glowing behind them.' } } },
      { id: 'collapse', label: 'Use the Spire Key on the ribs', tone: 'hunger', show: { all: [{ not: abyssClear }, { item: 'spire_key' }] }, effects: { flag: { ribsCollapsed: true } } },
      { id: 'unlock', label: 'Unlock the Abyssal Rib', tone: 'hunger', show: { all: [abyssClear, { any: [{ item: 'spire_key' }, { flag: 'airlockFreq' }] }, { not: { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] } }] }, effects: { goto: 'ch2:heart', flash: 'The lock takes. The airlock opens.' } },
      { id: 'sealed', label: 'Try the lock', tone: 'quiet', show: { all: [{ flag: 'keySurrendered' }, { flagUnset: 'airlockFreq' }, { not: { all: [{ flag: 'vexFreed' }, { flagUnset: 'vexFate' }] } }] }, effects: { goto: 'ch2:trapped' } },
    ],
  },
  {
    id: 'ch2:trapped',
    kind: 'ending',
    title: 'Sealed Out',
    body: 'The lock wants a key you gave away. The airlock will not hum for you. Behind you, drills scream through the last bulkhead, and the lamps come down the spine one rib at a time.\n\nThere is nowhere left in the beast to go.',
    choices: [{ id: 'again', label: 'Start Chapter Two again', sub: 'Back to the Jaws. Hands refilled. Chapter One stays.', tone: 'hunger', effects: { restoreCheckpoint: true } }],
  },
  {
    id: 'ch2:heart',
    kind: 'story',
    title: 'The Bleached Heart',
    body: 'Light. The airlock opens onto a hollow of white bone, and through it runs a vein of glowing amber resin thick as a river: the Primary Amber Resin Vein. The Bleached Heart.\n\nThe door seals behind you. An alarm starts, low and endless. Over it, faint through the bone, a barge horn, and a raspy voice: "Greg. We lost them."',
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
  const vex = f.vexFate === 'scout' ? 'scout' : f.vexFate === 'freq' ? 'gave the frequency' : 'left in chains'
  const murch = f.murchLift ? 'escaped: vendor ahead' : 'taken by the drill crew'
  const g = f.gregStanding
  const greg = g === 'hostile' ? 'enemies' : g === 'paid' ? 'paid' : g === 'worked' ? 'worked for them' : g === 'bypassed' ? 'slipped past' : 'owed a job'
  return [
    'END OF CHAPTER TWO',
    `Spire Key: ${key}`,
    `Statues: ${statues}  (Deep-Memory Pearl: ${pearl})`,
    `Vex: ${vex}`,
    `Murch "The Socket": ${murch}`,
    `Greg and Miller: ${greg}`,
    `Chapter Three code: ${CH3_CODE}`,
  ].join('\n\n')
}

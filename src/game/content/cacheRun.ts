import type { Scene } from '../types'

// Cache Run: shared destination, door-different roads.
//   leave → (Prisoner pipe / Outcast noon / Vessel hymn)
//   Prisoner: Clerk Rell → Oil-Tooth on the stolen Strider → Ossa as escaped property
//   Outcast: Silas on the cut → Nim the Cut-Fee → Ossa as kin
//   Vessel: Seeker runners → Zafir who will not shop a cup → Sybella
//   All three still spend at Sybella → (hollow) → land → maw:rim
//   Unconditional finale: sybella "maw" always lands. Vessel may bargain. Prisoner/Outcast get a hunt-mark, never her help.
const done = {
  chapter1Done: true,
  ossaAlive: true,
  sybellaHunting: true,
} as const

export const cacheRunScenes: Scene[] = [
  {
    id: 'ch1:leave',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Cache Run',
    body: `You want Kallik's cache at Red Maw: a pile of Drops beside a mouth that can drink them.

Sybella wants that mouth. She rides a sand-skiff. She is looking for someone who can carry Oasis Sap and still walk.

The road is not shared. The destination is. What it costs you depends on the life you already lived.`,
    variants: [
      {
        if: { sapMin: 5 },
        mode: 'append',
        body: `Your sap is warm. You are carrying it like a signal fire.`,
      },
      {
        if: { all: [{ sapMin: 3 }, { sapMax: 4 }] },
        mode: 'append',
        body: `Your sap is holding. Enough to walk.`,
      },
      {
        if: { all: [{ sapMin: 1 }, { sapMax: 2 }] },
        mode: 'append',
        body: `Your sap is thin. No lantern. A wick, maybe. She will still smell the glass.`,
      },
      {
        if: { sapMax: 0 },
        mode: 'append',
        body: `Your sap is empty. The blonde wants a lantern that can walk. You are dry wood until you drink.`,
      },
      {
        if: { door: 'prisoner' },
        mode: 'append',
        body: `Camp-04's sirens are thinning behind you. The First Spires are days south of the wire, through Cartel country. Scrip will not buy the dunes. If the Cartel sees you leave, their Heat will.`,
      },
      {
        if: { door: 'outcast' },
        mode: 'append',
        body: `Noon follows. First Spires are a hard day east-south — closer than Ironwood, not a doorstep. The vial is still a dry throat unless you filled it.`,
      },
      {
        if: { door: 'vessel' },
        mode: 'append',
        body: `Oram's map is already a crime. The First Spires already face the paddock you left. This is the shortest road to Red Maw. If the Seekers see you, their Heat follows.`,
      },
      {
        if: { flag: 'cacheBlind' },
        mode: 'append',
        body: `You do not have a real heading. You have panic and a rumor of red rock.`,
      },
    ],
    choices: [
      {
        id: 'go',
        label: 'Crawl the last Cartel fence',
        sub: 'Leave Camp-04 through the steam pipe. Costs sap. Shard-Hounds are on the wash behind you.',
        tone: 'hunger',
        show: { door: 'prisoner' },
        effects: { goto: 'ch1:p-pipe', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        id: 'go',
        label: 'Walk noon country',
        sub: 'Walk into noon. Costs sap. Silas, then Nim, then Ossa — each one may charge you for shade.',
        tone: 'hunger',
        show: { door: 'outcast' },
        effects: { goto: 'ch1:o-noon', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        id: 'go',
        label: 'Take the hymn-road',
        sub: 'Take the road the Seekers already walk. Costs sap. Runners are looking for a Vessel.',
        tone: 'hunger',
        show: { door: 'vessel' },
        effects: { goto: 'ch1:v-hymn', ticks: 1, sap: -1, pressure: 1 },
      },
    ],
    intents: [
      {
        tags: ['go', 'walk', 'trail', 'dune', 'leave', 'hunger', 'fence', 'pipe', 'crawl', 'wire'],
        show: { door: 'prisoner' },
        reply: 'The last fence still thinks you are inventory. You crawl it anyway.',
        effects: { goto: 'ch1:p-pipe', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        tags: ['go', 'walk', 'trail', 'dune', 'leave', 'hunger', 'noon', 'shade', 'cut'],
        show: { door: 'outcast' },
        reply: 'Noon country does not care that you already paid Silas once.',
        effects: { goto: 'ch1:o-noon', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        tags: ['go', 'walk', 'trail', 'dune', 'leave', 'hunger', 'hymn', 'runner', 'cup'],
        show: { door: 'vessel' },
        reply: 'The hymn is already walking. You match it or you get collected.',
        effects: { goto: 'ch1:v-hymn', ticks: 1, sap: -1, pressure: 1 },
      },
    ],
  },

  // --- Prisoner: Cartel escape / Oil-Tooth / wire heat ---
  {
    id: 'ch1:p-pipe',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Last Fence',
    body: `This is the last Cartel fence: a steam culvert under the wire. The bolts are the cheap ones Camp-04 uses. The wire is still live.

A payroll drone ticks behind the grate. Shard-Hound tracks are in the wash. If you wait, Overseer Valerius writes your name in the grit.`,
    variants: [
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `You have the wrench. It will pry the west bolt. Then you can crawl the pipe and stay off the open wash.`,
      },
      {
        if: { heatMin: ['cartel', 3] },
        mode: 'append',
        body: `The Cartel is already watching you. You are a laborer who walked off the count.`,
      },
    ],
    choices: [
      {
        id: 'wrench',
        label: 'Wrench the west bolt',
        sub: 'Pry the grate and stay off the open wash. You keep the wrench. The Cartel still notices a broken bolt.',
        show: { item: 'wrench' },
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flag: { wrenchCut: true },
          flash: 'The bolts give. You crawl the dark pipe and stay off the open wash. The Hounds lose a minute. The Cartel still marks a broken grate.',
        },
      },
      {
        id: 'crawl',
        label: 'Crawl the hot pipe anyway',
        sub: 'No wrench. The steam burns you (more sap). You stay off the open wash. Cartel Heat rises.',
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -2,
          heat: { cartel: 2 },
          pressure: 1,
          flag: { pipeBurn: true },
        },
      },
      {
        id: 'bolt',
        label: 'Bolt the naked wash',
        sub: 'Fast, and in the open. Clerk Rell is already waiting with a tablet. Cartel Heat rises.',
        tone: 'danger',
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -2,
          pressure: 1,
          heat: { cartel: 2 },
          flag: { washRun: true },
        },
      },
    ],
    intents: [
      {
        tags: ['wrench', 'grate', 'culvert', 'pry', 'bolt', 'pipe'],
        show: { item: 'wrench' },
        reply: 'Bolts. Dark. The wash goes on without you.',
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flag: { wrenchCut: true },
        },
      },
      {
        tags: ['crawl', 'pipe', 'steam', 'dark'],
        reply: 'Steam. Knees. The fence still thinks it won.',
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -2,
          heat: { cartel: 2 },
          flag: { pipeBurn: true },
        },
      },
      {
        tags: ['run', 'wash', 'bolt', 'open'],
        reply: 'You take the naked wash. A tablet ticks on the far rib.',
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -2,
          heat: { cartel: 2 },
          flag: { washRun: true },
        },
      },
    ],
  },
  {
    id: 'ch1:p-clerk',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Payroll',
    speaker: 'Clerk Rell',
    body: `A payroll clerk with a steam-tablet and dust in the seams of a uniform that was never meant to leave Ironwood. Clerk Rell. He hunts numbers that stood up.

"Laborer 04-Bleed. You're a line that walked off the page. Show work papers — or I log you as escaped and call a Hound. Either way I'm going home to a cooler ledger."`,
    variants: [
      {
        if: { item: 'scrip' },
        mode: 'append',
        body: `He can smell Ironwood paper on you. He wants to believe it is still a leash.`,
      },
      {
        if: { item: 'overseer_chip' },
        mode: 'append',
        body: `The Overseer chip in your kit would make you a clerk's dream: property returning itself.`,
      },
    ],
    choices: [
      {
        id: 'scrip',
        label: 'Flash Cartel scrip as papers',
        sub: 'He waves you through without searching you. The scrip stays hidden. Your wash-line number stays on record. Cartel Heat still rises.',
        show: { item: 'scrip' },
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: 1 },
          flag: { rellMet: true, rellScrip: true },
          flash:
            "Clerk Rell checks your papers, but the tablet is too hot and he wants shade. He waves you through without searching you. The scrip hidden in your hem is safe. Your wash-line number is still on record.",
        },
      },
      {
        id: 'chip',
        label: 'Flash the Overseer chip',
        sub: 'He treats you as property coming back on its own. Cartel Heat drops.',
        show: { item: 'overseer_chip' },
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: -1 },
          flag: { rellMet: true, rellChip: true },
          flash: 'He salutes a chip Overseer Valerius does not know is missing. He lets you walk as property. Oil-Tooth\'s stolen Strider is coughing farther south.',
        },
      },
      {
        id: 'stall',
        label: 'Give him a name that is not yours',
        sub: 'He writes the fake name next to your real number. Cartel Heat rises.',
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: 1 },
          pressure: 1,
          flag: { rellMet: true, rellLied: true },
          flash: 'Clerk Rell writes the fake name next to your real wash-line number. He lets you pass. Cartel Heat rises. Oil-Tooth\'s stolen Strider is coughing on the far wash.',
        },
      },
      {
        id: 'bolt',
        label: 'Run. Let him file you as escaped.',
        tone: 'danger',
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          sap: -1,
          heat: { cartel: 2 },
          flag: { rellMet: true, rellBolt: true },
          flash: 'Clerk Rell does not chase you. He files you as escaped. Shard-Hounds read filings, so Cartel Heat rises harder. The next machine on the wash is Oil-Tooth\'s stolen hull.',
        },
      },
    ],
    intents: [
      {
        tags: ['scrip', 'papers', 'paper', 'flash', 'pay'],
        show: { item: 'scrip' },
        reply: 'He waves you through without searching you. The scrip stays hidden. Your number stays on record.',
        effects: { goto: 'ch1:p-oil', ticks: 1, heat: { cartel: 1 }, flag: { rellMet: true, rellScrip: true } },
      },
      {
        tags: ['chip', 'overseer', 'badge'],
        show: { item: 'overseer_chip' },
        reply: 'Property returning itself. He wants that story.',
        effects: { goto: 'ch1:p-oil', ticks: 1, heat: { cartel: -1 }, flag: { rellMet: true, rellChip: true } },
      },
      {
        tags: ['run', 'bolt', 'flee', 'leave'],
        reply: 'You run. He files. That is worse.',
        effects: { goto: 'ch1:p-oil', ticks: 1, sap: -1, heat: { cartel: 2 }, flag: { rellMet: true, rellBolt: true } },
      },
      {
        tags: ['ask', 'talk', 'hello', 'say', 'tell', 'lie', 'name'],
        reply: 'He writes extra ink. Clerks love extra ink.',
        effects: { goto: 'ch1:p-oil', ticks: 1, heat: { cartel: 1 }, flag: { rellMet: true, rellLied: true } },
      },
    ],
  },
  {
    id: 'ch1:p-oil',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Stolen Hull',
    speaker: 'Jaxson "Oil-Tooth" Vance',
    body: `The stolen Strider coughs. Oil-Tooth is under the hull.

"Bleed-Cut. The machine is hotwired. Shard-Hounds are on the wash behind you. I am going west until the brass cools. Red Maw is south of that.

Ride the last mile and I drop you with Ossa. Walk, and the Cartel keeps your trail. Or I cut the Cartel tag out of your cuff, and you are harder to track."`,
    variants: [
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `A lash on the port runner is coming loose. The wrench would seat it. He has not asked.`,
      },
      {
        if: { flag: 'jaxsonInside' },
        mode: 'append',
        body: `"You already took the job," he adds. "This is the receipt. I am still not Kaelen."`,
      },
    ],
    choices: [
      {
        id: 'ride',
        label: 'Ride the last mile',
        sub: 'Oil-Tooth drops you with Ossa. The Cartel will notice a stolen hull.',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          heat: { cartel: 1 },
          flag: { oilRoad: true, oilRide: true },
          flash: 'The stolen Strider screams. Oil-Tooth drops you on the south road, where Ossa keeps her stilts. The Cartel will notice a stolen hull.',
        },
      },
      {
        id: 'tag',
        label: 'Let him cut off your Cartel tag',
        sub: 'Harder to track. He keeps the tag as a joke. Costs a little sap. Cartel Heat drops.',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          sap: -1,
          heat: { cartel: -1 },
          flag: { oilRoad: true, oilTag: true },
          flash: 'He cuts the Cartel tag out of your cuff and pockets it as a joke. You are harder to track. You walk on toward Ossa.',
        },
      },
      {
        id: 'wrench',
        label: 'Seat the port runner. Keep the wrench.',
        sub: 'You fix the loose lash and keep the wrench. He still will not take you to Red Maw. No extra Heat.',
        show: { item: 'wrench' },
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          flag: { oilRoad: true, oilWrench: true },
          flash: 'You seat the loose joint with the wrench and keep the tool. He nods. "Ossa is south. I go west. Don\'t make me famous."',
        },
      },
      {
        id: 'walk',
        label: 'Refuse the ride. Walk south.',
        sub: 'You walk to Ossa alone. Costs sap. The Cartel does not get a stolen-hull report from this.',
        tone: 'quiet',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          sap: -1,
          pressure: 1,
          flag: { oilRoad: true, oilRefused: true },
          flash: 'He lets you go. "Your funeral. Make it interesting." The person on stilts ahead is Ossa. The walk costs sap.',
        },
      },
    ],
    intents: [
      {
        tags: ['ride', 'strider', 'hull', 'hotwire'],
        reply: 'Oil-Tooth drops you with Ossa. The stolen hull goes west without you. The Cartel will notice it.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, heat: { cartel: 1 }, flag: { oilRoad: true, oilRide: true } },
      },
      {
        tags: ['tag', 'cuff', 'rip', 'quiet'],
        reply: 'He cuts the Cartel tag out of your cuff and keeps it as a joke. You are harder to track.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, sap: -1, heat: { cartel: -1 }, flag: { oilRoad: true, oilTag: true } },
      },
      {
        tags: ['help', 'wrench', 'fix', 'seat', 'repair'],
        show: { item: 'wrench' },
        reply: 'You fix the loose lash and keep the wrench. He still will not take you to Red Maw.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, flag: { oilRoad: true, oilWrench: true } },
      },
      {
        tags: ['walk', 'refuse', 'no', 'south'],
        reply: 'He lets you walk. Ossa is south. The Cartel does not get a stolen-hull report from this.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, sap: -1, flag: { oilRoad: true, oilRefused: true } },
      },
    ],
  },
  {
    id: 'ch1:p-ossa',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Escaped Property',
    speaker: 'Ossa',
    body: `Stilts. She stops in the middle of a step and looks at your face a beat too long. Her hand tightens on the stilt-cord. Then her eyes drop to the wire still in your cuffs.

"You smell like a cage," Ossa says, the way she would say it to any stranger. "If Valerius is behind you, I fall funny and you fall first. Hail like a person who escaped. Or pass. I don't hide property."`,
    variants: [
      {
        if: { flag: 'oilRide' },
        mode: 'append',
        body: `"That hull was loud," she adds. "Stolen things always are. You included."`,
      },
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `A lash on her left stilt is failing. The wrench would make a lever. She has not asked. Cages do not get to be handy without asking.`,
      },
    ],
    choices: [
      {
        id: 'hail',
        label: 'Hail her like escaped, not inventory',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true, ossaEscape: true }, ticks: 1 },
      },
      {
        id: 'wrench',
        label: 'Lever the lash. Take the wrench back.',
        sub: 'Temporary lever. The steel stays yours.',
        show: { item: 'wrench' },
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true, ossaEscape: true, ossaFixed: true },
          ticks: 1,
          goto: 'ch1:ossa-fix',
          flash: 'Steel against cord. The stilt seats. You pull the wrench free. She watches your hands like they might still be a cage.',
        },
      },
      {
        id: 'clamp',
        label: 'Leave the wrench as a clamp',
        sub: 'The steel stays in the lash.',
        show: { item: 'wrench' },
        effects: {
          remove: { wrench: 1 },
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true, wrenchClamped: true, ossaEscape: true, ossaFixed: true },
          ticks: 1,
          goto: 'ch1:ossa-fix',
          flash: 'You leave the wrench biting the cord. The stilt holds. Your hand is empty. She nods once.',
        },
      },
      {
        id: 'cord',
        label: 'Lash it with the stolen cord',
        sub: 'Pike, Sarn, or Vetch. The cord you took.',
        show: { flag: 'lashCord' },
        effects: {
          unsetFlag: ['lashCord'],
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, ossaEscape: true, ossaFixed: true, cordLash: true },
          ticks: 1,
          goto: 'ch1:ossa-fix',
          flash: 'Stolen cord bites where the old lash failed. The stilt stands. She does not ask where you got it.',
        },
      },
      {
        id: 'steal',
        label: 'Lunge for the vial',
        tone: 'danger',
        effects: { goto: 'ch1:ossa-rob', flag: { ossaMet: true, ossaEscape: true }, ticks: 1 },
      },
      {
        id: 'skip',
        label: 'Pass her. You are still being hunted.',
        tone: 'quiet',
        effects: { goto: 'ch1:south-wind', flag: { ossaMet: true, ossaAlive: true, ossaEscape: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'grab', 'take', 'vial', 'rob'],
        reply: 'You go for the hip while the wire is still in your smell. The desert tilts.',
        effects: { goto: 'ch1:ossa-rob', flag: { ossaEscape: true } },
      },
      {
        tags: ['help', 'wrench', 'lash', 'fix', 'repair'],
        show: { item: 'wrench' },
        reply: 'You seat the lash and take the wrench back. She does not hide you.',
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true, ossaEscape: true, ossaFixed: true },
          goto: 'ch1:ossa-fix',
        },
      },
      {
        tags: ['help', 'hail', 'hello', 'talk', 'friend', 'escaped'],
        reply: 'You show empty hands that used to be cuffed. She shows you a life that still has a Drop in it.',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true, ossaEscape: true } },
      },
    ],
  },

  // --- Outcast: Stray / Silas / noon / shade-cut ---
  {
    id: 'ch1:o-noon',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Noon Country',
    body: `Noon writes the same sentence on every slope: pay for shade, or bake in the open.

The straight wash is a kiln. A rib of rock hides a cut if you know where to look. Ossa is south of here, on her stilts. No Cartel grate. No Seeker hymn. Just people who charge you for the next minute out of the sun.`,
    variants: [
      {
        if: { item: 'silas_tip' },
        mode: 'append',
        body: `Silas's scratch matches a rib the wash pretends not to have. He is under that rock, selling the next minute of shade, because his tent is already behind you.`,
      },
      {
        if: { heatMin: ['strays', 2] },
        mode: 'append',
        body: `Stray country recognizes its own. Recognition is not mercy. Recognition is a tax.`,
      },
    ],
    choices: [
      {
        id: 'silas',
        label: "Walk Silas's shade-cut",
        sub: 'Use Silas\'s scratch. You stay off the noon slope and meet him under the rock. The scratch stays in your hand.',
        show: { item: 'silas_tip' },
        effects: {
          goto: 'ch1:o-silas',
          ticks: 1,
          flag: { silasCut: true },
          flash: 'You take the shaded cut. The scratch stays in your palm — you can still show it later. Silas is already under the rock, counting what you owe.',
        },
      },
      {
        id: 'ford',
        label: 'Meet Corvin at the dry ford',
        sub: 'He walks you past the traps to Ossa. Costs sap. Nim\'s shade is off this line.',
        show: { flag: 'corvinHelped' },
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          sap: -1,
          flag: { corvinRoad: true },
          flash:
            'Corvin is waiting where the wash drops into the dry ford. He walks ahead and points: wire buried under the sand, a resin pit crusted over, a Cartel snare staked flat. At the far side he stops. "Ossa keeps her stilts south of here. Go easy on her. I don\'t go further."',
        },
      },
      {
        id: 'noon',
        label: 'Take the noon slope',
        sub: 'Faster, and the sun costs more sap. Nim the Cut-Fee is still waiting in the next shade.',
        effects: {
          goto: 'ch1:o-tax',
          ticks: 1,
          sap: -2,
          pressure: 1,
          flag: { noonRun: true },
        },
      },
      {
        id: 'rib',
        label: 'Hug the bone-rib shade',
        sub: 'Slower, and cheaper in sap. Nim the Cut-Fee still charges you at the next shade.',
        effects: {
          goto: 'ch1:o-tax',
          ticks: 1,
          sap: -1,
          flag: { ribShade: true },
        },
      },
    ],
    intents: [
      {
        tags: ['silas', 'shade', 'tip', 'cut'],
        show: { item: 'silas_tip' },
        reply: 'You take the cut he sold. He is under it, collecting.',
        effects: { goto: 'ch1:o-silas', ticks: 1, flag: { silasCut: true } },
      },
      {
        tags: ['noon', 'sun', 'wash', 'straight'],
        reply: 'Noon takes a bite. The tax is still ahead.',
        effects: { goto: 'ch1:o-tax', ticks: 1, sap: -2, flag: { noonRun: true } },
      },
      {
        tags: ['rib', 'rock', 'shade', 'hug'],
        reply: 'Bone-pale shade. Someone still owns the next minute.',
        effects: { goto: 'ch1:o-tax', ticks: 1, sap: -1, flag: { ribShade: true } },
      },
    ],
  },
  {
    id: 'ch1:o-silas',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Moving Shade',
    speaker: 'Silas',
    body: `Silas Vane is older than the well's disappointment. The tent is gone. What he has now is a rag on a rib of rock. One eye is milk. The other is counting.

"Noon-Empty. I sold you one minute of shade. This is a different minute. Talk is not free on the road either. South of here is Nim the Cut-Fee. She collects what I only sell. Pay me to sit, walk on and pay her, or become a story the wash tells."`,
    variants: [
      {
        if: { item: 'vial_empty' },
        mode: 'append',
        body: `He hears the empty glass tick. "That sound is a password if Nim is in a good religion today."`,
      },
    ],
    choices: [
      {
        id: 'minute',
        label: 'Buy the next minute of shade',
        sub: 'You rest. Sap holds. He still will not walk you to Red Maw. Nim is next.',
        effects: {
          goto: 'ch1:o-tax',
          ticks: 1,
          flag: { silasRoad: true, silasMinute: true },
          flash: 'He sells you another minute of shade. He does not fill your vial. Nim the Cut-Fee is the next person who will charge you.',
        },
      },
      {
        id: 'drop',
        label: 'Buy a smear of Drop — 1 Glint',
        sub: 'Costs 1 Glint. Sap comes back a little. Nim is still ahead.',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          sap: 2,
          goto: 'ch1:o-tax',
          ticks: 1,
          flag: { silasRoad: true, silasSold: true },
          flash: 'He spends your Glint and wets your lip from a smear in the rag. Sap comes back a little. "I still do not take Cartel scrip. Nim takes worse."',
        },
      },
      {
        id: 'on',
        label: 'Walk on. Nim collects the fee.',
        sub: 'No payment here. Nim the Cut-Fee is the next person in the shade.',
        tone: 'quiet',
        effects: {
          goto: 'ch1:o-tax',
          ticks: 1,
          flag: { silasRoad: true },
          flash: '"South. Pay her or run noon. I have buried men for less, and I am tired."',
        },
      },
    ],
    intents: [
      {
        tags: ['shade', 'minute', 'rest', 'sit', 'pay'],
        reply: 'He sells the minute. Nim sells the tax.',
        effects: { goto: 'ch1:o-tax', ticks: 1, flag: { silasRoad: true, silasMinute: true } },
      },
      {
        tags: ['drop', 'drink', 'buy', 'glint'],
        show: { item: 'glints' },
        reply: 'A smear. Not a future. Nim is still the next mouth.',
        effects: { remove: { glints: 1 }, sap: 2, goto: 'ch1:o-tax', ticks: 1, flag: { silasRoad: true, silasSold: true } },
      },
      {
        tags: ['ask', 'talk', 'hello', 'say', 'tell', 'nim', 'south', 'on'],
        reply: '"South. Nim the Cut-Fee. Shade-road is not free twice."',
        effects: { goto: 'ch1:o-tax', ticks: 1, flag: { silasRoad: true } },
      },
    ],
  },
  {
    id: 'ch1:o-tax',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Cut-Fee',
    speaker: 'Nim',
    body: `Nim the Cut-Fee sits the shade like a toll. Resin under the nails. A knife that has only ever been for minutes.

She looks at the brand once and then talks to the air beside your head. "Shade-road is not free. I collect from anyone, even you. Glint, scratch, empty glass, or you run noon and I tell the wash your name."`,
    variants: [
      {
        if: { flag: 'silasCut' },
        mode: 'append',
        body: `Her eyes snag on the scratch in your palm. "He still sending me thirsty people with his handwriting. That is almost a discount."`,
      },
      {
        if: { item: 'vial_empty' },
        mode: 'append',
        body: `She hears the empty vial tick. "Honesty about thirst is a Stray password. Spend it here, or save it for Ossa. Not both as a speech."`,
      },
    ],
    choices: [
      {
        id: 'glint',
        label: 'Pay a Glint for the shade',
        sub: 'Costs 1 Glint. She lets you through to Ossa. No extra Stray Heat.',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimPaid: true },
          flash: 'Nim pockets the Glint. "Ossa is south. She falls funny. Don\'t rob family."',
        },
      },
      {
        id: 'tip',
        label: "Show Silas's scratch as password",
        sub: 'The scratch stays in your hand. She lets you through because Silas sent you. No Glint spent.',
        show: { item: 'silas_tip' },
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimSilas: true },
          flash: 'She does not take the scratch. She takes the fact that Silas wrote it. Ossa is south of here.',
        },
      },
      {
        id: 'empty',
        label: 'Admit the empty vial',
        sub: 'You admit the vial is empty. She lets you pass and gives back a little sap.',
        show: { all: [{ item: 'vial_empty' }, { not: { item: 'vial_drop' } }] },
        effects: {
          sap: 1,
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimEmpty: true, emptyShown: true },
          flash: 'She does not fill the vial. She nods and lets you pass. A little sap comes back. "Ossa likes that sound. I like not burying you."',
        },
      },
      {
        id: 'owe',
        label: 'Owe her a Drop later',
        sub: 'You walk now. Stray Heat rises. She will collect a Drop from you later, at Red Maw.',
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          heat: { strays: 1 },
          flag: { nimMet: true, nimOwed: true },
          flash: 'She lets you walk without paying. Stray Heat rises. "I will find you at Red Maw. Ossa is first. Try not to rob family."',
        },
      },
      {
        id: 'run',
        label: 'Run through noon. Skip the fee.',
        sub: 'Costs sap. Stray Heat rises harder. She tells the wash your name.',
        tone: 'danger',
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          sap: -1,
          heat: { strays: 2 },
          flag: { nimMet: true, nimRun: true },
          flash: 'Nim does not chase you. She tells the wash your name. It costs sap, and Stray Heat rises harder. Ossa will have heard it.',
        },
      },
    ],
    intents: [
      {
        tags: ['pay', 'glint', 'buy', 'tax'],
        show: { item: 'glints' },
        reply: 'She pockets it. Kin south.',
        effects: { remove: { glints: 1 }, goto: 'ch1:o-ossa', ticks: 1, flag: { nimMet: true, nimPaid: true } },
      },
      {
        tags: ['silas', 'scratch', 'tip', 'password'],
        show: { item: 'silas_tip' },
        reply: 'She takes the fact of the scratch, not the scrap of it.',
        effects: { goto: 'ch1:o-ossa', ticks: 1, flag: { nimMet: true, nimSilas: true } },
      },
      {
        tags: ['empty', 'vial', 'thirst', 'dry'],
        show: { item: 'vial_empty' },
        reply: 'Honesty about thirst is a Stray password.',
        effects: { sap: 1, goto: 'ch1:o-ossa', ticks: 1, flag: { nimMet: true, nimEmpty: true, emptyShown: true } },
      },
      {
        tags: ['run', 'flee', 'noon', 'skip'],
        reply: 'She names you. Stilts hear names.',
        effects: { goto: 'ch1:o-ossa', ticks: 1, sap: -1, heat: { strays: 2 }, flag: { nimMet: true, nimRun: true } },
      },
      {
        tags: ['owe', 'later', 'debt', 'ask', 'talk', 'hello'],
        reply: 'She talks past your head. "You know what you did. Walk. I collect at the bite."',
        effects: { goto: 'ch1:o-ossa', ticks: 1, heat: { strays: 1 }, flag: { nimMet: true, nimOwed: true } },
      },
    ],
  },
  {
    id: 'ch1:o-ossa',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Kin Height',
    speaker: 'Ossa',
    body: `Stilts. Kin-height. The vial on her hip is half-full, honest, the way Stray throats are supposed to be.

She stops when she sees your face. She looks at it a beat too long, and her hand tightens on the stilt. Her eyes pass over the brand and do not stay on it.

"Thirsty," she says, the way she would say it to any stranger on the road. "I don't let thirsty people die on my sand. Show empty glass if you have it. Don't lunge."`,
    variants: [
      {
        if: { flag: 'nimRun' },
        mode: 'append',
        body: `"Nim named you," she adds. "I heard it. I am still here. Hiding you is a different promise."`,
      },
      {
        if: { flag: 'nimSilas' },
        mode: 'append',
        body: `"You showed his scratch. Good. Passwords are cheaper than blood."`,
      },
      {
        if: { flag: 'corvinRoad' },
        mode: 'append',
        body: `She saw Corvin turn back at the ford. "He brought you," she says to the sand beside you. That is all she says about it.`,
      },
    ],
    choices: [
      {
        id: 'hail',
        label: 'Hail her like kin',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true, ossaKin: true }, ticks: 1 },
      },
      {
        id: 'vial',
        label: 'Show the empty vial',
        sub: 'Thirst as a credential. Stray lean.',
        show: { all: [{ item: 'vial_empty' }, { not: { item: 'vial_drop' } }] },
        effects: {
          sap: 1,
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, emptyShown: true, ossaKin: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash:
            'She does not give you her Drop. She wets your lip from a smear in the lash-wax. "I don\'t die easy. Neither do empty glasses that admitted it." A twice-tied knot lands in your palm.',
        },
      },
      {
        id: 'steal',
        label: 'Lunge for the vial anyway',
        tone: 'danger',
        effects: { goto: 'ch1:ossa-rob', flag: { ossaMet: true, ossaKin: true }, ticks: 1 },
      },
      {
        id: 'skip',
        label: 'Pass her. The skiff is the heading.',
        tone: 'quiet',
        effects: { goto: 'ch1:south-wind', flag: { ossaMet: true, ossaAlive: true, ossaKin: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'grab', 'take', 'vial', 'rob'],
        reply: 'Kin-crime. The desert tilts uglier.',
        effects: { goto: 'ch1:ossa-rob', flag: { ossaKin: true } },
      },
      {
        tags: ['empty', 'vial', 'thirst', 'dry'],
        show: { item: 'vial_empty' },
        reply: 'Honesty about thirst is a Stray password.',
        effects: {
          sap: 1,
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, emptyShown: true, ossaKin: true },
          add: { ossa_token: 1 },
          goto: 'ch1:south-wind',
        },
      },
      {
        tags: ['help', 'hail', 'hello', 'talk', 'friend', 'kin'],
        reply: 'She looks past the brand to your eyes. "Ask me for water. Talk can wait."',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true, ossaKin: true } },
      },
    ],
  },

  // --- Vessel: Seeker / Oram / hymn / cup-on-the-run ---
  {
    id: 'ch1:v-hymn',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Hymn-Road',
    body: `The hymn is already on this road. Gold-dust on the wind. Seeker runners are crossing the second rib like a net.

A Vessel on the run is easy to hear. Thalia made you easy to hear. If you still have Oram's map, it is a heading you can use.`,
    variants: [
      {
        if: { item: 'oram_map' },
        mode: 'append',
        body: `Oram marked the second rib on the map. You could walk it like you already know the way. Sybella likes certainty. So do spears.`,
      },
      {
        if: { item: 'ceremonial_cloth' },
        mode: 'append',
        body: `The gold thread catches noon. Hide it and you look like a thief. Wear it and you look like a hymn the runners are allowed to collect.`,
      },
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `The Seekers are already watching. You can hear runners, still far off, already turning toward you.`,
      },
    ],
    choices: [
      {
        id: 'oram',
        label: "Follow Oram's heading",
        sub: 'Use Oram\'s map. Seeker Heat rises: the runners notice a Vessel who knows the way.',
        show: { item: 'oram_map' },
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { oramHeading: true },
          flash: 'You follow Oram\'s map. You keep it. Two Seeker runners see a Vessel who already knows the road. Seeker Heat rises.',
        },
      },
      {
        id: 'hide',
        label: 'Wrap the gold thread',
        sub: 'Hide the gold thread. Costs sap. The runners still find you, and they trust you less.',
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          flag: { clothHid: true },
          flash: 'You wrap the gold thread until it looks like a rag. The runners still find you. They are more suspicious of a Vessel who hides.',
        },
      },
      {
        id: 'hymn',
        label: 'Walk like a Vessel',
        sub: 'You stay obvious. Seeker Heat rises more. They may kneel, or they may take you.',
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 2 },
          flag: { hymnWalk: true },
        },
      },
      {
        id: 'dagger',
        label: 'Keep the rusted dagger visible',
        sub: 'They see a weapon under the hymn. Costs sap. Seeker Heat rises.',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { bladeOut: true },
          flash: 'You keep the rusted dagger where they can see it. The runners see a weapon under the hymn. Seeker Heat rises.',
        },
      },
    ],
    intents: [
      {
        tags: ['oram', 'map', 'heading', 'rib'],
        show: { item: 'oram_map' },
        reply: "Feed-pencil doesn't lie as often as hymns.",
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { oramHeading: true },
        },
      },
      {
        tags: ['hide', 'cloth', 'wrap', 'gold'],
        reply: 'The cloth becomes a rag. They still find rag-cups.',
        effects: { goto: 'ch1:v-runners', ticks: 1, sap: -1, flag: { clothHid: true } },
      },
      {
        tags: ['hymn', 'cup', 'walk', 'sing'],
        reply: 'You walk like a lantern. Spears like lanterns.',
        effects: { goto: 'ch1:v-runners', ticks: 1, sap: -1, heat: { seekers: 2 }, flag: { hymnWalk: true } },
      },
    ],
  },
  {
    id: 'ch1:v-runners',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Runners',
    speaker: 'Brin',
    body: `Two Seeker runners. One speaks. Brin has gold-dust on her cheek, the hymn still in her mouth, and a spear she treats as a kindness. Kesh flanks her and counts the glass you are carrying.

"Thalia's love made you loud. Pour a Drop so we know you are still a Vessel. Show the cloth. Or show us Oram's map and we will call it a lie we can live with. Otherwise we take you to Sybella now."`,
    variants: [
      {
        if: { flag: 'oramHeading' },
        mode: 'append',
        body: `Kesh flicks the feed-pencil crease. "Oram still thinks animals are scripture. That heading is a crime. Crimes walk faster."`,
      },
      {
        if: { flag: 'clothHid' },
        mode: 'append',
        body: `Brin's mouth sours. "You wrapped the gold. Cups that hide are already cracked."`,
      },
      {
        if: { flag: 'hymnWalk' },
        mode: 'append',
        body: `For a breath Brin almost kneels. Then remembers the hunt. Love and a spear are cousins here.`,
      },
    ],
    choices: [
      {
        id: 'pour',
        label: 'Pour a Drop so they count you a Vessel',
        sub: 'Spend 1 Drop. Seeker Heat drops. They let you walk on to Zafir.',
        show: { item: 'vial_drop' },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: -1 },
          flag: { brinMet: true, brinPour: true },
          flash: 'They watch you pour the Drop. "Useful. Do not become a hymn yet." Seeker Heat drops. Zafir is ahead, and he will not sell a heading to a Vessel. Sybella will.',
        },
      },
      {
        id: 'cloth',
        label: 'Show the Vessel cloth',
        sub: 'You show the cloth. They almost kneel, then remember they are hunting you. Seeker Heat rises.',
        show: { item: 'ceremonial_cloth' },
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: 1 },
          flag: { brinMet: true, brinCloth: true },
          flash: 'You show the gold thread. Brin starts to bow and stops. "Sybella already knows. Walk. Zafir will not help a Vessel." Seeker Heat rises.',
        },
      },
      {
        id: 'map',
        label: "Lie with Oram's heading",
        sub: 'You keep Oram\'s map. They dislike it and still let you pass. Seeker Heat rises.',
        show: { item: 'oram_map' },
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: 1 },
          flag: { brinMet: true, brinMap: true },
          flash: 'Kesh spits at the feed-dust on the map. Brin lets you keep walking. Seeker Heat rises. Zafir is ahead, and he will not sell to a Vessel.',
        },
      },
      {
        id: 'dagger',
        label: 'Crowd them with the rusted dagger',
        sub: 'You threaten them. They do not flinch. Seeker Heat rises harder. They still let you go on.',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: 2 },
          flag: { brinMet: true, brinSteel: true },
          flash: 'Spears do not flinch. "No. We are past that kind of childish." They let you spend yourself toward the cairn.',
        },
      },
      {
        id: 'bolt',
        label: 'Bolt the second rib',
        sub: 'You run. Costs more sap. They do not chase. They tell the road what you look like. Seeker Heat rises harder.',
        tone: 'danger',
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          sap: -2,
          heat: { seekers: 2 },
          flag: { brinMet: true, brinBolt: true },
          flash: 'You run. They do not chase. They sing your description ahead, so Zafir hears you coming. Seeker Heat rises harder.',
        },
      },
    ],
    intents: [
      {
        tags: ['pour', 'drop', 'drink', 'furnace', 'cup'],
        show: { item: 'vial_drop' },
        reply: 'You pour. They count. The blonde will count later.',
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
          goto: 'ch1:v-zafir',
          heat: { seekers: -1 },
          flag: { brinMet: true, brinPour: true },
        },
      },
      {
        tags: ['cloth', 'gold', 'show', 'vessel'],
        show: { item: 'ceremonial_cloth' },
        reply: 'A bow that dies. Walk.',
        effects: { goto: 'ch1:v-zafir', heat: { seekers: 1 }, flag: { brinMet: true, brinCloth: true } },
      },
      {
        tags: ['oram', 'map', 'lie', 'heading'],
        show: { item: 'oram_map' },
        reply: 'A paddock crime walks faster than a hymn.',
        effects: { goto: 'ch1:v-zafir', heat: { seekers: 1 }, flag: { brinMet: true, brinMap: true } },
      },
      {
        tags: ['run', 'bolt', 'flee', 'go'],
        reply: 'You run. They sing you ahead.',
        effects: { goto: 'ch1:v-zafir', sap: -2, heat: { seekers: 2 }, flag: { brinMet: true, brinBolt: true } },
      },
      {
        tags: ['ask', 'talk', 'hello', 'help'],
        reply: '"Help is the blonde. We are the net. Walk or pour."',
        effects: { goto: 'ch1:v-zafir', ticks: 1, heat: { seekers: 1 }, flag: { brinMet: true } },
      },
    ],
  },
  {
    id: 'ch1:v-zafir',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Bone Cairn',
    speaker: 'Zafir',
    body: `Zafir does not smile the shop smile. He looks at the gold thread like a fire in a dry stall.

"I don't sell headings to walking batteries. I sell the news that she already knows. Pay if you want a curse with better spelling. Or walk. The skiff likes cups that arrive on time."`,
    variants: [
      {
        if: { item: 'oram_map' },
        mode: 'append',
        body: `His eyes flick to the feed-pencil crease. "Oram still thinks animals are scripture. That heading is better than mine. I hate admitting that. I will not stamp it for a cup."`,
      },
      {
        if: { flag: 'brinPour' },
        mode: 'append',
        body: `"You already poured for spears. She will want the rest. I do not stock pardons."`,
      },
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `"Seekers are paying for news of a walking cup. You are expensive gossip I already sold once."`,
      },
    ],
    choices: [
      {
        id: 'oram',
        label: "Show Oram's map. Skip his price.",
        sub: 'You already have a heading. He confirms it and takes no fee. No extra Heat.',
        show: { item: 'oram_map' },
        effects: {
          flag: { zafirMet: true, zafirCup: true, oramShown: true },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'Zafir checks the second rib on Oram\'s map and will not take a fee from a Vessel. You keep the map. Sybella\'s skiff is next.',
        },
      },
      {
        id: 'heading-glint',
        label: 'Buy the heading — 1 Glint',
        sub: 'Costs 1 Glint. You get a map to the cache. Sybella\'s name is in the margin. No extra Heat.',
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          pay: { glints: 1 },
          add: { cache_map: 1 },
          flag: { zafirMet: true, zafirCup: true, zafirPaid: true },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'Zafir takes the Glint. The map he draws has Sybella\'s name in the margin. That is what you paid for. No faction saw the sale.',
        },
      },
      {
        id: 'heading-scrap',
        label: 'Buy the heading — 1 scrap',
        sub: 'Costs 1 scrap. You get a map to the cache. Sybella\'s name is in the margin. No extra Heat.',
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          pay: { scrap: 1 },
          add: { cache_map: 1 },
          flag: { zafirMet: true, zafirCup: true, zafirPaid: true },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'Zafir takes the scrap. The map he draws has Sybella\'s name in the margin. That is what you paid for. No faction saw the sale.',
        },
      },
      {
        id: 'dagger',
        label: 'Crowd him with the rusted dagger',
        sub: 'You threaten him. He still gives you a map. Stray Heat rises.',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          flag: { zafirMet: true, zafirCup: true, zafirSore: true },
          add: { cache_map: 1 },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'You crowd Zafir with the dagger. He hands you a map anyway. Stray Heat rises. He will remember the threat.',
        },
      },
      {
        id: 'news',
        label: 'Take the free news and walk',
        sub: 'No fee. No map. You walk on toward Sybella\'s skiff.',
        tone: 'quiet',
        effects: {
          flag: { zafirMet: true, zafirCup: true },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: '"Skiff is closing. She will bargain because you are Seekers. She is very good at remaining the most reasonable person in a murder."',
        },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'map', 'heading', 'maw', 'oram', 'walk'],
        reply: 'He will not stamp a cup. He lets you keep walking. The skiff is the next mouth.',
        effects: { ticks: 1, flag: { zafirMet: true, zafirCup: true }, goto: 'ch1:south-wind' },
      },
      {
        tags: ['sybella', 'skiff', 'blonde'],
        reply: '"Blindfold up. Kohl ruined. Voice like a lullaby that learned law. Do not be interesting — you already are."',
        effects: { flag: { sybellaNamed: true } },
      },
      {
        tags: ['trade', 'buy', 'sell', 'shop', 'goods', 'inventory'],
        reply:
          '"This cairn does not shop walking batteries. News is free and worse. Pay for a curse if you like ink."',
        effects: { ticks: 1, flag: { zafirMet: true, zafirCup: true } },
      },
      {
        tags: ['help', 'please', 'aid'],
        reply: '"Help is the blonde\'s word. I sell delays to people who are not lanterns."',
        effects: { ticks: 1 },
      },
      {
        tags: ['threaten', 'threat', 'crowd', 'dagger'],
        reply: 'He hands you a worse map with a better smile.',
        effects: {
          flag: { zafirMet: true, zafirCup: true, zafirSore: true },
          add: { cache_map: 1 },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'ch1:south-wind',
        },
      },
    ],
  },

  // Shared Ossa follow-through (door-different terms already set on the meet)
  {
    id: 'ch1:ossa-rob',
    chapterId: 'cache-run',
    kind: 'story',
    speaker: 'Ossa',
    title: 'An Ugly Reach',
    body: `You take the vial. She takes a fall she planned for — knees, then a tumble that keeps the stilts from spearing her.

She is alive. Angry. Breathing. "Walk," she says, from the ground. "If Sybella asks, I will describe your back."`,
    variants: [
      {
        if: { flag: 'ossaEscape' },
        mode: 'replace',
        body: `You take the vial while you still smell like a cage. She takes a fall she planned for.

"Escaped and still a thief," she says, from the ground. "Valerius would love the consistency. Walk. If Sybella asks, I will describe the cuffs you kept in your manners."`,
      },
      {
        if: { flag: 'ossaKin' },
        mode: 'replace',
        body: `You take the vial from kin. She takes a fall she planned for.

"Family," she says, from the ground, like a slur. "Nim will hear. Silas will hear. Walk. If Sybella asks, I will describe a Stray who robbed the wrong height."`,
      },
    ],
    choices: [
      {
        id: 'go',
        label: 'Take the Drop and the shame',
        effects: {
          add: { vial_drop: 1 },
          flag: { ossaRobbed: true, ossaAlive: true },
          heat: { strays: 2 },
          goto: 'ch1:south-wind',
          ticks: 1,
        },
      },
      {
        id: 'back',
        label: 'Give it back. Try to be a person.',
        effects: {
          flag: { ossaAlive: true, ossaWary: true, ossaMet: true, ossaReturned: true },
          unsetFlag: ['ossaRobbed'],
          goto: 'ch1:ossa-talk',
          flash: 'She takes the vial without thanks. Thanks would be a lie. The skiff is still ahead.',
        },
      },
    ],
  },
  {
    id: 'ch1:ossa-talk',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Ossa',
    speaker: 'Ossa',
    body: `"Kallik's cache is bait with a building around it. Sybella wants whatever walks out of the sand. If that's you, don't tell her.

I go to Red Maw because the stilts work better where the sand is honest about wanting you."`,
    variants: [
      {
        if: { flag: 'ossaEscape' },
        mode: 'append',
        body: `"You still smell like wire. I will stand when the skiff comes. I will not hide you from a Hound."`,
      },
      {
        if: { flag: 'ossaKin' },
        mode: 'append',
        body: `"Kin-height means I shorten my stride. It does not mean I pour."`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `She looks at you like weather she will outlast. The stilts are back under her. The vial is not. She is still alive. That fact is now a debt with teeth.`,
      },
      {
        if: { flag: 'ossaWary' },
        mode: 'append',
        body: `She has not forgotten your hands.`,
      },
    ],
    choices: [
      {
        id: 'share',
        label: 'Offer a Drop',
        show: { all: [{ item: 'vial_drop' }, { flagUnset: 'ossaRobbed' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaAlive: true },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash:
            'She pockets it for a worse hour. A knot of stilt-cord lands in your palm. Twice-tied. "I don\'t die easy. Neither do my debts."',
        },
      },
      {
        id: 'together',
        label: 'Ask to walk the Maw together',
        show: { flagUnset: 'ossaRobbed' },
        effects: {
          flag: { ossaAlly: true, ossaAlive: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'She shortens her stride so a person without stilts can pretend to keep up.',
        },
      },
      {
        id: 'on',
        label: 'Walk on. Sybella\'s skiff is next.',
        tone: 'quiet',
        effects: { goto: 'ch1:south-wind', flag: { ossaAlive: true, ossaMet: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'rob', 'vial', 'take'],
        show: { all: [{ flagUnset: 'ossaRobbed' }, { flagUnset: 'ossaReturned' }] },
        reply: 'Second chances at theft are how graves get filled.',
        effects: { goto: 'ch1:ossa-rob' },
      },
      {
        tags: ['ally', 'together', 'come', 'with'],
        reply: 'She nods once. Stilts and sand. A procession of two.',
        effects: { flag: { ossaAlly: true, ossaAlive: true }, add: { ossa_token: 1 }, goto: 'ch1:south-wind' },
      },
      {
        tags: ['ask', 'talk', 'hello', 'say', 'tell'],
        reply: '"Sybella wants whatever walks out of the sand. If that\'s you, don\'t tell her. I go because the sand is honest."',
        effects: { ticks: 1, flag: { ossaMet: true } },
      },
      {
        tags: ['help', 'share', 'drop', 'offer'],
        show: { all: [{ item: 'vial_drop' }, { flagUnset: 'ossaRobbed' }] },
        reply: 'She pockets it for a worse hour. A twice-tied knot lands in your palm.',
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaAlive: true },
          goto: 'ch1:south-wind',
        },
      },
      {
        tags: ['threaten', 'attack', 'fight', 'stab'],
        reply: 'Stilts plant. "I fall funny. The Maw does not need another ghost with a knife."',
        effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
      },
    ],
  },
  {
    id: 'ch1:ossa-fix',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'The Lash Holds',
    speaker: 'Ossa',
    body: `The stilt stands. She looks at the repair, then at you, the way a stranger looks when the test is already over and she has not said so.

"Take a Glint. Take a Drop. Or your thanks is enough. Get somewhere safe."

A knot of stilt-cord is already in her fingers. She will give it either way.`,
    choices: [
      {
        id: 'glint',
        label: 'Take a Glint',
        sub: 'She gives it. You give nothing back.',
        effects: {
          add: { glints: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaGift: 'glint' },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'A Glint, warm from her pocket. The knot follows. She does not call it a wage.',
        },
      },
      {
        id: 'drop',
        label: 'Take a Drop',
        sub: 'Glass. She can spare one.',
        effects: {
          add: { vial_drop: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaGift: 'drop' },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'A Drop. The knot. She watches you pocket both and does not smile.',
        },
      },
      {
        id: 'thanks',
        label: 'Your thanks is enough. Get somewhere safe.',
        tone: 'quiet',
        effects: {
          add: { ossa_token: 1 },
          flag: { ossaAlly: true, ossaStillness: true, ossaGift: 'thanks' },
          ticks: 1,
          goto: 'ch1:south-wind',
          flash: 'Stillness kept. Good.',
        },
      },
    ],
  },
  {
    id: 'ch1:south-wind',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Skiff on the South Wind',
    onEnter: { flag: { heardSybellaRumor: true } },
    body: `A sail cuts the south wind before the hull does. Resin-smoke. A blindfold pushed up on the mast, not yet a face you can bargain with.

The skiff is coming. What you have heard about the woman on it is all you get before she steps down.`,
    variants: [
      {
        if: { flag: 'ossaMet' },
        mode: 'append',
        body: `Ossa watches the sand. She suspects. She says little.`,
      },
      {
        if: { any: [{ flag: 'oilRide' }, { flag: 'oilRoad' }, { flag: 'oilTag' }, { flag: 'jaxsonInside' }] },
        mode: 'append',
        body: `Jaxson "Oil-Tooth" Vance sees the sail and does not smirk. "Seeker, run."`,
      },
      {
        if: { all: [{ flag: 'oilRefused' }, { flagUnset: 'oilRide' }, { flagUnset: 'oilRoad' }] },
        mode: 'append',
        body: `He is not on this sand. The warning from the hull still sits in the ear: Seeker, run.`,
      },
      {
        if: { flag: 'korvanStory' },
        mode: 'append',
        body: `Korvan kept the Seekers' records until they named him heretic. He said her name slowly, like it cost him.`,
      },
      {
        if: { all: [{ flag: 'kaelenKnown' }, { not: { door: 'outcast' } }] },
        mode: 'append',
        body: `Kaelen called her a Seeker of old roads, old ruins, old magiks. He does not scare easy. He was careful with her name. That is the reliable telling.`,
      },
      {
        if: { heatMin: ['cartel', 3] },
        mode: 'append',
        body: `Cartel mouths would call her a stain on their books. That is enemy spin. The sail does not care what a clerk would write.`,
      },
      {
        if: { flag: 'heardWalkingAmber' },
        mode: 'append',
        body: `You have already heard a name you were not meant to hear. Do not spend it on the sand. Not yet.`,
      },
    ],
    choices: [
      {
        id: 'face',
        label: 'Face the skiff',
        sub: 'Comply, talk, or lie. The rumors you carry are the only brief.',
        effects: { goto: 'ch1:sybella', ticks: 1 },
      },
    ],
  },
  {
    id: 'ch1:sybella',
    chapterId: 'cache-run',
    kind: 'talk',
    art: 'hunger',
    title: 'Sybella',
    speaker: 'Sybella',
    onEnter: { flag: { heardWalkingAmber: true } },
    body: `The sky goes brass. The skiff comes in low.

The sand at your feet shifts wrong for a moment. Her breath catches. Barely audible: "The Walking Amber..." Then the ice returns, and the moment is gone. She will not say it again.

Sybella steps down. Older than the hymns. Blindfold pushed up, kohl ruined on purpose. Danger, not an enemy you have earned yet. "You carry sap like a lamp in a tomb. The old roads remember that light, and so do the things that sleep under them. Give the sand something to remember you by, or I'll leave you here for it."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa does not run. Stilts planted. She watches the sand, not the woman.`,
      },
      {
        if: { flag: 'oilRide' },
        mode: 'append',
        body: `She smelled the stolen hull. "Cartel mouths arrive loud. The desert does not keep loud."`,
      },
      {
        if: { flag: 'korvanHunger' },
        mode: 'append',
        body: `Korvan's lead sits in your mouth: she hunts people who carry sap and keep walking. Use it or waste it.`,
      },
      {
        if: { all: [{ flag: 'kaelenKnown' }, { not: { door: 'outcast' } }] },
        mode: 'append',
        body: `Kaelen's telling sits in your mouth: old roads, old faith, not a clerk's enemy. Use it or waste it.`,
      },
      {
        if: { flag: 'brinMet' },
        mode: 'append',
        body: `The runners already sang your shape. She is not surprised. She is deciding what the sand gets to keep.`,
      },
      {
        if: { sapMax: 2 },
        mode: 'append',
        body: `Your sap is thin. Running is a wish unless you burn what is left.`,
      },
    ],
    choices: [
      {
        id: 'maw',
        label: 'Push past her into Red Maw Approach',
        sub: 'She follows. You still arrive.',
        tone: 'hunger',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash:
            "You walked past without paying. Sybella didn't stop you, and she didn't let you go either. She's following you into the Approach. Seeker Heat +1.",
        },
      },
      {
        id: 'sap',
        label: 'Give sap. Stand in the wash.',
        sub: 'You burn two. She lets the sand look at you.',
        enable: { sapMin: 2 },
        locked: 'Sap too thin to stand in the wash.',
        effects: {
          sap: -2,
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'sap' },
          heat: { seekers: -1 },
          goto: 'ch1:land',
          flash: 'You burn sap where she can see it. Kohl on your brow. She lets this hour pass. She is still behind you.',
        },
      },
      {
        id: 'glint',
        label: 'Offer a Glint to the sand',
        sub: 'An old rite. The spark is given. She looks away one breath.',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          flag: { ...done, climax: 'glint', sybellaOffering: true },
          heat: { seekers: -1 },
          goto: 'ch1:land',
          flash: 'You give a Glint to the sand. She tracks the spark a breath too long. The rite buys a head start. She still follows.',
        },
      },
      {
        id: 'hollow',
        label: 'Bait the Hollows',
        sub: 'Bury something you are carrying. The sand keeps it.',
        enable: {
          any: [
            { item: 'glints' },
            { item: 'vial_drop' },
            { item: 'kallik_mark' },
            { item: 'strider_bit' },
            { item: 'ceremonial_cloth' },
            { item: 'rusted_dagger' },
            { item: 'wrench' },
            { item: 'silas_tip' },
          ],
        },
        locked: 'You have nothing the sand would keep.',
        effects: { goto: 'ch1:hollow', ticks: 1 },
      },
      {
        id: 'flee',
        label: 'Flee. Spend the legs you have.',
        sub: 'Sap burns. Seeker Heat climbs.',
        tone: 'danger',
        enable: { sapMin: 1 },
        locked: 'Legs without sap are a wish.',
        effects: {
          sap: -3,
          heat: { seekers: 2 },
          flag: { ...done, climax: 'flee' },
          goto: 'ch1:land',
          flash: 'Dunes become stairs. A runner clips the slope you just left. You keep the face. You lose the easy hours.',
        },
      },
      {
        id: 'false',
        label: 'Throw a decoy',
        sub: 'Scrap, a wrench, or a map — only what is in your hands. She still follows.',
        enable: {
          any: [{ item: 'scrap' }, { item: 'wrench' }, { item: 'cache_map' }, { item: 'oram_map' }],
        },
        locked: 'You need scrap, a wrench, or a map in hand.',
        effects: {
          flag: { ...done, climax: 'false', falseTrail: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash: 'You throw what you are carrying. It buys a head start and a lie in the sand. She is a moment late. She still follows. Seeker Heat climbs.',
        },
      },
      {
        id: 'bargain-drop',
        label: 'Offer a Drop. Let her see you can carry it.',
        show: { all: [{ door: 'vessel' }, { item: 'vial_drop' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true, bargainDrop: true },
          heat: { seekers: -1 },
          goto: 'ch1:land',
          flash:
            'She watches you pour a Drop into the sand. Kohl on your brow. "The faith keeps its own. Do not crack." Seeker Heat cools. She still follows.',
        },
      },
      {
        id: 'bargain',
        label: 'Bargain empty-handed',
        tone: 'quiet',
        show: { door: 'vessel' },
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true },
          goto: 'ch1:land',
          flash: 'You talk. She listens the way old stone listens. Kohl on your brow. The faith marks you. She still follows.',
        },
      },
      {
        id: 'brand',
        label: 'Tell her to find someone else to shadow',
        sub: 'Defiance. Seeker Heat climbs.',
        show: { not: { door: 'vessel' } },
        tone: 'quiet',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push' },
          heat: { seekers: 2 },
          goto: 'ch1:land',
          flash:
            'You tell her to find someone else to shadow. She almost smiles. Kohl on your brow anyway. Seeker Heat +2. She follows.',
        },
      },
    ],
    intents: [
      {
        tags: ['bargain', 'deal', 'yes', 'useful', 'agree', 'furnace'],
        show: { door: 'vessel' },
        reply: 'You nod like an adult. She almost looks grateful. That is worse. Seekers-only.',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['walk', 'maw', 'approach', 'red', 'push'],
        reply: 'You take the Approach. She hunts. She does not help.',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['run', 'flee', 'maw', 'go'],
        show: { sapMin: 1 },
        reply: 'Sand. Breath. The skiff screams behind you.',
        effects: {
          sap: -3,
          heat: { seekers: 2 },
          flag: { ...done, climax: 'flee' },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['glint', 'burn', 'toss', 'coin', 'pay'],
        show: { item: 'glints' },
        reply: 'A spark. A delay. She hates delays.',
        effects: {
          remove: { glints: 1 },
          flag: { ...done, climax: 'glint' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['false', 'trick', 'lie', 'trail', 'ossa'],
        show: {
          any: [{ item: 'scrap' }, { item: 'wrench' }, { item: 'cache_map' }, { item: 'oram_map' }],
        },
        reply: 'You throw a decoy. She is late. She is not lost.',
        effects: {
          flag: { ...done, climax: 'false', falseTrail: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['bury', 'hollow', 'magic', 'pray', 'bait'],
        show: {
          any: [
            { item: 'glints' },
            { item: 'vial_drop' },
            { item: 'kallik_mark' },
            { item: 'strider_bit' },
            { item: 'ceremonial_cloth' },
            { item: 'rusted_dagger' },
            { item: 'wrench' },
            { item: 'silas_tip' },
          ],
        },
        reply: 'You put a valued thing in the listening sand.',
        effects: { goto: 'ch1:hollow' },
      },
      {
        tags: ['attack', 'kill', 'stab', 'hit', 'dagger'],
        reply: 'She does not flinch. "No. We are past that kind of childish." The skiff runners tick like a clock.',
        effects: { heat: { seekers: 1 } },
      },
    ],
  },
  {
    id: 'ch1:hollow',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'A Valued Thing',
    body: `You bury it. The dune takes the offering the way a lock takes a key it might not return.

For a breath the skiff sinks to one runner. Sybella's head turns as if someone said her true name in a room she had sealed. You run. Behind you, the buried thing is not silent. That is the bill.`,
    choices: [
      {
        id: 'on',
        label: 'Carry the mark into the Approach',
        tone: 'hunger',
        effects: {
          flag: { ...done, climax: 'hollow', hollowMarked: true },
          sap: -1,
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
    ],
  },
  {
    id: 'ch1:land',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Red Maw Approach',
    onEnter: { flag: { chapter1Done: true, ossaAlive: true, sybellaHunting: true } },
    body: `The Maw is a bite the land never closed. Fossil ribs. Failed holes. The cache is close enough to poison your decisions.

You are on the Approach. What you gave the sand is still on you.`,
    variants: [
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl on your brow. You talked. She listened. She is still coming.`,
      },
      {
        if: { flagEq: ['climax', 'push'] },
        mode: 'append',
        body: `You pushed past. She marked your brow with kohl. She is following.`,
      },
      {
        if: { flag: 'bargainDrop' },
        mode: 'append',
        body: `The Drop you poured is in the sand. She marked you kinder for it. Kinder is still a mark.`,
      },
      {
        if: { flagEq: ['climax', 'flee'] },
        mode: 'append',
        body: `Your lungs are knives. She is behind you like weather. Seeker Heat will not cool in the Approach.`,
      },
      {
        if: { flagEq: ['climax', 'false'] },
        mode: 'append',
        body: `The decoy bought a head start. She is still on the wind behind you.`,
      },
      {
        if: { flagEq: ['falseSpent', 'wrench'] },
        mode: 'append',
        body: `The wrench is in the sand, telling a story of someone who went west. You went on.`,
      },
      {
        if: { flagEq: ['falseSpent', 'oram_map'] },
        mode: 'append',
        body: `Oram's map is a lie pointing the other way. He would hate that. He might also understand.`,
      },
      {
        if: { flagEq: ['falseSpent', 'cache_map'] },
        mode: 'append',
        body: `Cache Scratch is in the sand, pointing at a rib you are not walking. She will check it.`,
      },
      {
        if: { flagEq: ['falseSpent', 'scrap'] },
        mode: 'append',
        body: `The scrap you threw is already half-buried. It bought a head start. Not a pardon.`,
      },
      {
        if: { flagEq: ['climax', 'hollow'] },
        mode: 'append',
        body: `Something you loved is in the sand, screaming quietly. You and the Maw can both hear it.`,
      },
      {
        if: { flagEq: ['climax', 'glint'] },
        mode: 'append',
        body: `You gave a Glint to the sand. One breath richer. She will come for the delay.`,
      },
      {
        if: { flagEq: ['climax', 'sap'] },
        mode: 'append',
        body: `You stood in the wash and gave sap. The kohl is on your brow. Your glass is lighter.`,
      },
      {
        if: { flag: 'oilRide' },
        mode: 'append',
        body: `Oil-Tooth's cough is still on the west wind. He did not stay. Cartel Heat did.`,
      },
      {
        if: { flag: 'rellBolt' },
        mode: 'append',
        body: `Clerk Rell's tablet still has your number. Filings outrun stolen hulls.`,
      },
      {
        if: { flag: 'nimOwed' },
        mode: 'append',
        body: `Nim will collect in the Approach. Shade-road debts do not cool at the bite.`,
      },
      {
        if: { flag: 'ossaKin' },
        mode: 'append',
        body: `You arrived as kin, or as kin-crime. Stray country keeps both.`,
      },
      {
        if: { flag: 'brinPour' },
        mode: 'append',
        body: `You already poured for spears. The Approach wants the rest of the glass.`,
      },
      {
        if: { flag: 'zafirCup' },
        mode: 'append',
        body: `Zafir would not shop a lantern. He sold the news instead. She already had it.`,
      },
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa is ahead in the Approach shade. She nods the way you'd nod at a grave marker. The stilts are already standing. She does not repair them again.`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'append',
        body: `You will see Ossa again. Alive. That should not comfort you as much as it does.`,
      },
    ],
    choices: [
      {
        id: 'hub',
        label: 'Enter the Approach',
        sub: 'Harder hub. Hunters. The next Hunger waits.',
        tone: 'hunger',
        effects: {
          enterHub: 'redmaw',
          goto: 'maw:rim',
          sap: 3,
          flag: { huntQuiet: 0 },
          flash: 'Red Maw Approach. The cache is close. So is she. You steal a breath. Sap returns, a little.',
        },
      },
    ],
  },
]

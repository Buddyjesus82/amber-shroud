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
    body: `Want is simple: Kallik's cache at Red Maw. A pile of Drops next to a mouth.

The problem is also simple: a blonde on a sand-skiff who needs a lantern that can walk.

The road is not shared. Same destination. Then you spend: the climax, not a Drop from your throat.`,
    variants: [
      {
        if: { sapMin: 5 },
        mode: 'append',
        body: `Your sap is warm. You are carrying it like a signal fire.`,
      },
      {
        if: { all: [{ sapMin: 3 }, { sapMax: 4 }] },
        mode: 'append',
        body: `Your sap is holding. Not a lantern. Not empty. Enough to walk.`,
      },
      {
        if: { all: [{ sapMin: 1 }, { sapMax: 2 }] },
        mode: 'append',
        body: `Your sap is thin. No lantern. A wick, maybe. She will still smell the glass.`,
      },
      {
        if: { sapMax: 0 },
        mode: 'append',
        body: `Your sap is empty. You are not lit. The blonde wants a lantern that can walk — you are dry wood until you drink.`,
      },
      {
        if: { door: 'prisoner' },
        mode: 'append',
        body: `Camp-04 sirens thin. First Spires are days south of that wire — Cartel hinterland, farthest of the three starts. Scrip will not buy dunes. Cartel Heat will.`,
      },
      {
        if: { door: 'outcast' },
        mode: 'append',
        body: `Noon follows. First Spires are a hard day east-south — closer than Ironwood, not a doorstep. The vial is still a dry throat unless you filled it.`,
      },
      {
        if: { door: 'vessel' },
        mode: 'append',
        body: `Oram's map is already a crime. First Spires already face the paddock you stole. Shortest Hunger-road of the three doors. Seeker Heat is a hymn with teeth.`,
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
        sub: 'Steam-culvert. Wire still singing. Hounds eat the wash behind you.',
        tone: 'hunger',
        show: { door: 'prisoner' },
        effects: { goto: 'ch1:p-pipe', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        id: 'go',
        label: 'Walk noon country',
        sub: 'Shade-cuts. Cut-fees. Kin who will still tax you.',
        tone: 'hunger',
        show: { door: 'outcast' },
        effects: { goto: 'ch1:o-noon', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        id: 'go',
        label: 'Take the hymn-road',
        sub: 'Runners already angling. A cup on the run is loud.',
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
    body: `The last Cartel fence is not a metaphor. Steam-culvert. Bolts Camp-04 cheap. Wire still singing like it owns you.

A payroll drone ticks somewhere behind the grate. Shard-Hound dust on the wash. Linger and Valerius writes your name in grit.`,
    variants: [
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `The wrench knows that language. Pry the west bolt and the pipe is a throat you can crawl without the naked wash.`,
      },
      {
        if: { heatMin: ['cartel', 3] },
        mode: 'append',
        body: `Cartel Heat has a smell. You are already a line that walked.`,
      },
    ],
    choices: [
      {
        id: 'wrench',
        label: 'Wrench the west bolt',
        sub: 'Pry the grate. Stay off the naked wash. Keep the wrench.',
        show: { item: 'wrench' },
        effects: {
          goto: 'ch1:p-clerk',
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flag: { wrenchCut: true },
          flash: 'Bolts complain. You crawl the dark. Hounds lose a minute. Cartel Heat does not.',
        },
      },
      {
        id: 'crawl',
        label: 'Crawl the hot pipe anyway',
        sub: 'No tool. Steam bites. The wash does not get you.',
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
        sub: 'Fast. Exposed. A clerk with a tablet is already on the far rib.',
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

"Laborer 04-bleed. You are a line that walked. Papers. Scrip as a lullaby. Or I write you for a Hound and I go home to a cooler ledger."`,
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
        sub: 'A lullaby. He wants to clock out. Heat still ticks.',
        show: { item: 'scrip' },
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: 1 },
          flag: { rellMet: true, rellScrip: true },
          flash: 'He stamps a lie because the tablet is hot and he wants shade. Scrip stays in your hem. The wash still has your number.',
        },
      },
      {
        id: 'chip',
        label: 'Flash the Overseer chip',
        sub: 'Look like property returning itself.',
        show: { item: 'overseer_chip' },
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: -1 },
          flag: { rellMet: true, rellChip: true },
          flash: 'He salutes a chip Valerius does not know is gone. You walk like inventory. The Strider coughs south of here.',
        },
      },
      {
        id: 'stall',
        label: 'Give him a name that is not yours',
        sub: 'Talk as theft. He writes anyway.',
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          heat: { cartel: 1 },
          pressure: 1,
          flag: { rellMet: true, rellLied: true },
          flash: 'He writes the lie next to the true number. Clerks love extra ink. A stolen Strider is coughing on the far wash.',
        },
      },
      {
        id: 'bolt',
        label: 'Bolt. Let the tablet eat dust.',
        tone: 'danger',
        effects: {
          goto: 'ch1:p-oil',
          ticks: 1,
          sap: -1,
          heat: { cartel: 2 },
          flag: { rellMet: true, rellBolt: true },
          flash: 'He does not chase. He files. Hounds read filings. The next cough on the wash is Oil-Tooth\'s stolen hull.',
        },
      },
    ],
    intents: [
      {
        tags: ['scrip', 'papers', 'paper', 'flash', 'pay'],
        show: { item: 'scrip' },
        reply: 'He stamps a lullaby. You keep the paper. Heat keeps you.',
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
    body: `The stolen Strider coughs like a guilty throat. Oil-Tooth is under the hull anyway — brass jaw, welding leather, corporate tags he still has not cut off.

"Bleed-Cut. I said I hotwire. I did not say I tour. Hounds eat the wash behind you. I go west until the brass cools. You want Red Maw, that is south of my cowardice.

Ride the last mile and I dump you at stilts. Walk and you own the Heat. Or I rip the Cartel tag they sewed in your cuff, and you walk quieter."`,
    variants: [
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `A lash on the port runner is walking itself loose. The wrench would seat it. He has not asked. He will not donate the heading.`,
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
        sub: 'He dumps you at stilts. Cartel Heat notices a stolen hull.',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          heat: { cartel: 1 },
          flag: { oilRoad: true, oilRide: true },
          flash: 'The Strider screams like a guilty invoice. He dumps you where the sand starts lying. Stilts on the next rib.',
        },
      },
      {
        id: 'tag',
        label: 'Let him rip the Cartel tag',
        sub: 'Walk quieter. He keeps the tag as a joke.',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          sap: -1,
          heat: { cartel: -1 },
          flag: { oilRoad: true, oilTag: true },
          flash: 'Cuff-thread pops. He pockets Ironwood property like a souvenir. You walk. Stilts wait like a second opinion.',
        },
      },
      {
        id: 'wrench',
        label: 'Seat the port runner. Keep the wrench.',
        sub: 'Help the hull. He still will not tour.',
        show: { item: 'wrench' },
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          flag: { oilRoad: true, oilWrench: true },
          flash: 'Steel against a stolen joint. He nods like a receipt. "Stilts south. I go west. Don\'t make me famous."',
        },
      },
      {
        id: 'walk',
        label: 'Refuse the ride. Walk the Heat.',
        tone: 'quiet',
        effects: {
          goto: 'ch1:p-ossa',
          ticks: 1,
          sap: -1,
          pressure: 1,
          flag: { oilRoad: true, oilRefused: true },
          flash: 'Brass ticks. "Your funeral. Make it interesting." The stilts are a rumor that turns out to be a person.',
        },
      },
    ],
    intents: [
      {
        tags: ['ride', 'strider', 'hull', 'hotwire'],
        reply: 'He dumps you at stilts. The hull goes west without you.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, heat: { cartel: 1 }, flag: { oilRoad: true, oilRide: true } },
      },
      {
        tags: ['tag', 'cuff', 'rip', 'quiet'],
        reply: 'Thread pops. You walk quieter. He keeps the joke.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, sap: -1, heat: { cartel: -1 }, flag: { oilRoad: true, oilTag: true } },
      },
      {
        tags: ['help', 'wrench', 'fix', 'seat', 'repair'],
        show: { item: 'wrench' },
        reply: 'You seat the runner. He still will not tour.',
        effects: { goto: 'ch1:p-ossa', ticks: 1, flag: { oilRoad: true, oilWrench: true } },
      },
      {
        tags: ['walk', 'refuse', 'no', 'south'],
        reply: 'Your funeral. Stilts south.',
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
    body: `Stilts. But she is not greeting a traveler. She is counting the wire still in your cuffs.

"You smell like a cage," Ossa says. "If Valerius is behind you, I fall funny and you fall first. Hail like a person who escaped. Or pass. I don't hide property."`,
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
        label: 'Lever her failing lash',
        sub: 'Use the wrench. Keep the wrench. Prove you have hands.',
        show: { item: 'wrench' },
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true, ossaEscape: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'Steel against cord. The stilt seats. She nods like a receipt, not a pardon. "Skiff south. I can stand when it comes. I still won\'t hide you from a Hound."',
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
        effects: { goto: 'ch1:sybella', flag: { ossaMet: true, ossaAlive: true, ossaEscape: true }, ticks: 1 },
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
        reply: 'You seat the lash. She lets you keep the steel. She does not hide you.',
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true, ossaEscape: true },
          add: { ossa_token: 1 },
          goto: 'ch1:sybella',
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
    body: `Noon writes the same sentence on every slope: pay for shade or become it.

The straight wash is a kiln. A rib of rock pretends not to have a cut. Stilt-country ticks south. No Cartel grate. No hymn. Just the culture that sells the minute you are not in the sun.`,
    variants: [
      {
        if: { item: 'silas_tip' },
        mode: 'append',
        body: `Silas's scratch matches a rib the wash pretends not to have. He is under it, selling the next minute because the tent is already behind you.`,
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
        sub: 'The tip keeps you off the noon slope. He is under the rib.',
        show: { item: 'silas_tip' },
        effects: {
          goto: 'ch1:o-silas',
          ticks: 1,
          flag: { silasCut: true },
          flash: 'Shade like a stolen minute. The tip is still in your palm — unused, unless you spend it later. Silas is already accounting.',
        },
      },
      {
        id: 'noon',
        label: 'Take the noon slope',
        sub: 'Fast. The sun taxes. A cut-fee waits at the next shade anyway.',
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
        sub: 'Slower. You still owe whoever owns the next minute.',
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
    body: `Silas Vane is older than the well's disappointment, and the tent is no longer a place — it is a rag on a rib. One eye milk. The other accounting.

"Noon-Empty. I sold you a minute. This is a different minute. Talk is not free on the road either. South is a Cut-Fee named Nim. She collects what I only sell. Pay me to sit, walk her tax, or become a story the wash tells."`,
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
        sub: 'Sap holds. He still will not walk you to the Maw.',
        effects: {
          goto: 'ch1:o-tax',
          ticks: 1,
          flag: { silasRoad: true, silasMinute: true },
          flash: 'Shade like a loan. He does not fill the vial. He fills the minute. Nim is the next mouth.',
        },
      },
      {
        id: 'drop',
        label: 'Buy a smear of Drop',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          sap: 2,
          goto: 'ch1:o-tax',
          ticks: 1,
          flag: { silasRoad: true, silasSold: true },
          flash: 'He wets your lip from a smear in the rag. "I still do not take Cartel scrip. Nim takes worse."',
        },
      },
      {
        id: 'on',
        label: 'Walk on. Nim collects.',
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

"Noon-Empty. Shade-road is not free. Silas sells the minute. I collect it. Glint, scratch, empty glass, or you run noon and I tell the wash your name."`,
    variants: [
      {
        if: { flag: 'silasCut' },
        mode: 'append',
        body: `Her eyes snag on the scratch in your palm. "He still sending me thirsty people with his handwriting. That is almost a discount."`,
      },
      {
        if: { item: 'vial_empty' },
        mode: 'append',
        body: `She hears the empty tick. "Honesty about thirst is a Stray password. Spend it here or spend it on stilts. Not both as a sermon."`,
      },
    ],
    choices: [
      {
        id: 'glint',
        label: 'Pay a Glint for the cut',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimPaid: true },
          flash: 'She pockets dune money like a priest. "Stilts south. Ossa falls funny. Don\'t make kin-crime your religion."',
        },
      },
      {
        id: 'tip',
        label: "Show Silas's scratch as password",
        sub: 'The tip stays in your palm. She still collects the minute.',
        show: { item: 'silas_tip' },
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimSilas: true },
          flash: 'Stray-to-stray. She does not take the scratch. She takes the fact of it. Stilts south, kin-height.',
        },
      },
      {
        id: 'empty',
        label: 'Admit the empty vial',
        sub: 'Thirst as a credential. She lets you pass thinner.',
        show: { all: [{ item: 'vial_empty' }, { not: { item: 'vial_drop' } }] },
        effects: {
          sap: 1,
          goto: 'ch1:o-ossa',
          ticks: 1,
          flag: { nimMet: true, nimEmpty: true, emptyShown: true },
          flash: 'She does not fill you. She nods like a receipt. "Ossa likes that sound. I like not burying you."',
        },
      },
      {
        id: 'owe',
        label: 'Owe her a Drop later',
        sub: 'Walk now. The Approach will collect.',
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          heat: { strays: 1 },
          flag: { nimMet: true, nimOwed: true },
          flash: 'She smiles with too many minutes. "I will find you at the bite. Stilts first. Try not to rob family."',
        },
      },
      {
        id: 'run',
        label: 'Run noon. Skip the tax.',
        tone: 'danger',
        effects: {
          goto: 'ch1:o-ossa',
          ticks: 1,
          sap: -1,
          heat: { strays: 2 },
          flag: { nimMet: true, nimRun: true },
          flash: 'She does not chase. She names you to the wash. Stilts hear names.',
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
        reply: '"Walk. I collect at the bite."',
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

"Silas still selling shade to thirsty people," she says. "That means you might be family. Family can still be cruel. Show empty glass if you have it. Don't lunge. Kin-crime is a worse religion than noon."`,
    variants: [
      {
        if: { flag: 'nimRun' },
        mode: 'append',
        body: `"Nim named you," she adds. "I heard it. I am still here. That is not the same as hiding you."`,
      },
      {
        if: { flag: 'nimSilas' },
        mode: 'append',
        body: `"You showed his scratch. Good. Passwords are cheaper than blood."`,
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
          goto: 'ch1:sybella',
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
        effects: { goto: 'ch1:sybella', flag: { ossaMet: true, ossaAlive: true, ossaKin: true }, ticks: 1 },
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
          goto: 'ch1:sybella',
        },
      },
      {
        tags: ['help', 'hail', 'hello', 'talk', 'friend', 'kin'],
        reply: 'You show empty hands. She shows you a life that still has a Drop in it.',
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
    body: `The hymn is already walking. Gold-dust on the wind. Runners angling the second rib like a net that thinks it is love.

A cup on the run is loud. Thalia made you loud. Oram's feed-pencil is a heresy you can still spend as a heading — not the only difference, just a tool.`,
    variants: [
      {
        if: { item: 'oram_map' },
        mode: 'append',
        body: `Oram's second rib is marked. You could walk like a ledger. The skiff likes certainty. So do spears.`,
      },
      {
        if: { item: 'ceremonial_cloth' },
        mode: 'append',
        body: `Gold thread catches noon. Hide it and you look like a thief. Wear it and you look like a hymn they are allowed to collect.`,
      },
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `Seeker Heat has a sound: runners, still far, already angling.`,
      },
    ],
    choices: [
      {
        id: 'oram',
        label: "Follow Oram's heading",
        sub: 'Walk like a ledger. Seeker Heat notices a confident cup.',
        show: { item: 'oram_map' },
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { oramHeading: true },
          flash: 'You walk like scripture that learned to steal. The map is still yours. Two spears like the idea of certainty.',
        },
      },
      {
        id: 'hide',
        label: 'Wrap the gold thread',
        sub: 'Look like a thief, not a sacrament. Sap burns in the cloth-heat.',
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          flag: { clothHid: true },
          flash: 'The cloth becomes a rag. Runners still find you. They find rag-cups faster than honest ones — suspicion is a hymn too.',
        },
      },
      {
        id: 'hymn',
        label: 'Walk like a cup',
        sub: 'Loud. They may kneel. They may collect.',
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
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          goto: 'ch1:v-runners',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { bladeOut: true },
          flash: 'Steel under a sacrament. The runners see both and pick a worse religion.',
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
    body: `Two runners. One speaks. Brin — gold-dust on the cheek, hymn still in the mouth, a spear that thinks it is a kindness. Kesh flanks, counting your glass.

"Thalia's love made you loud. Pour so we know you are still a cup. Show the cloth. Lie with a paddock heresy. Or we take you to the blonde already, and that is a kindness we will not name."`,
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
        label: 'Pour a Drop so they count you a furnace',
        show: { item: 'vial_drop' },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: -1 },
          flag: { brinMet: true, brinPour: true },
          flash: 'They watch you pour. "Useful. Do not become a hymn yet." The cairn ahead will not shop a cup. The skiff will.',
        },
      },
      {
        id: 'cloth',
        label: 'Show the Vessel cloth',
        sub: 'Credential. They almost kneel. They remember the hunt.',
        show: { item: 'ceremonial_cloth' },
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: 1 },
          flag: { brinMet: true, brinCloth: true },
          flash: 'Gold thread. A bow that dies mid-spine. "The blonde already knows. Walk. Zafir will not help a furnace."',
        },
      },
      {
        id: 'map',
        label: "Lie with Oram's heading",
        sub: 'Keep the map. They hate paddock heresy. They let it pass as speed.',
        show: { item: 'oram_map' },
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          heat: { seekers: 1 },
          flag: { brinMet: true, brinMap: true },
          flash: 'Kesh spits feed-dust. Brin lets a crime walk. The cairn merchant ahead looks at cups like fire in a dry stall.',
        },
      },
      {
        id: 'dagger',
        label: 'Crowd them with the rusted dagger',
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
        sub: 'Sap burns. They do not chase. They sing your shape ahead.',
        tone: 'danger',
        effects: {
          goto: 'ch1:v-zafir',
          ticks: 1,
          sap: -2,
          heat: { seekers: 2 },
          flag: { brinMet: true, brinBolt: true },
          flash: 'You run. They hymn. The cairn hears you coming as inventory.',
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
        label: "Show Oram's map. Skip his curse.",
        show: { item: 'oram_map' },
        effects: {
          flag: { zafirMet: true, zafirCup: true, oramShown: true },
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'ch1:sybella',
          flash: 'He confirms the second rib with a grimace and will not take a fee from a furnace. The skiff likes people who already know the way.',
        },
      },
      {
        id: 'heading-glint',
        label: 'Buy the cursed heading — 1 Glint',
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          pay: { glints: 1 },
          add: { cache_map: 1 },
          flag: { zafirMet: true, zafirCup: true, zafirPaid: true },
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'ch1:sybella',
          flash: 'He takes money like it is a confession. The heading he draws has her name in the margin. That is the product.',
        },
      },
      {
        id: 'heading-scrap',
        label: 'Buy the cursed heading — 1 scrap',
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          pay: { scrap: 1 },
          add: { cache_map: 1 },
          flag: { zafirMet: true, zafirCup: true, zafirPaid: true },
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'ch1:sybella',
          flash: 'He takes money like it is a confession. The heading he draws has her name in the margin. That is the product.',
        },
      },
      {
        id: 'dagger',
        label: 'Crowd him with the rusted dagger',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          flag: { zafirMet: true, zafirCup: true, zafirSore: true },
          add: { cache_map: 1 },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'He hands you a map with a smile that will outlive a cup if he gets a vote.',
        },
      },
      {
        id: 'news',
        label: 'Take the free news and walk',
        tone: 'quiet',
        effects: {
          flag: { zafirMet: true, zafirCup: true },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: '"Skiff is closing. She will bargain because you are Seekers. She is very good at remaining the most reasonable person in a murder."',
        },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'map', 'heading', 'maw', 'oram', 'walk'],
        reply: 'He will not stamp a cup. He lets you keep walking. The skiff is the next mouth.',
        effects: { ticks: 1, flag: { zafirMet: true, zafirCup: true }, goto: 'ch1:sybella' },
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
          goto: 'ch1:sybella',
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
    title: 'A Ugly Reach',
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
          goto: 'ch1:sybella',
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
    body: `"Kallik's cache is bait with a building around it. Sybella wants a walking battery. If that's you, don't tell her.

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
          goto: 'ch1:sybella',
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
          goto: 'ch1:sybella',
          flash: 'She shortens her stride so a person without stilts can pretend to keep up.',
        },
      },
      {
        id: 'on',
        label: 'On. The skiff is the heading.',
        tone: 'quiet',
        effects: { goto: 'ch1:sybella', flag: { ossaAlive: true, ossaMet: true }, ticks: 1 },
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
        effects: { flag: { ossaAlly: true, ossaAlive: true }, add: { ossa_token: 1 }, goto: 'ch1:sybella' },
      },
      {
        tags: ['ask', 'talk', 'hello', 'say', 'tell'],
        reply: '"Sybella wants a battery. If that\'s you, don\'t tell her. I go because the sand is honest."',
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
          goto: 'ch1:sybella',
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
    id: 'ch1:sybella',
    chapterId: 'cache-run',
    kind: 'talk',
    art: 'hunger',
    title: 'Sybella',
    speaker: 'Sybella',
    body: `The sky goes brass. The skiff comes in low.

Hard choice. Resource poker. No dice — only what you still have.

Sybella steps down, blindfold up like a discarded halo, kohl ruined on purpose. "You are carrying sap like a lantern. I need a lantern that can walk. Spend something, or I write the receipt myself."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa does not run. Stilts planted. A second lantern, if she wants to count.`,
      },
      {
        if: { flag: 'oilRide' },
        mode: 'append',
        body: `She smelled the stolen hull an hour ago. "Cartel mouths arrive loud. I do not aid loud."`,
      },
      {
        if: { flag: 'brinMet' },
        mode: 'append',
        body: `The runners already sang your shape. She is not surprised. She is collecting.`,
      },
      {
        if: { sapMax: 2 },
        mode: 'append',
        body: `Your sap is thin. Fleeing is a wish unless you burn what is left.`,
      },
    ],
    choices: [
      {
        id: 'maw',
        label: 'Push past her into Red Maw Approach',
        sub: 'Chapter end. She follows. You still arrive.',
        tone: 'hunger',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash:
            'You walk the last wash. She does not grant passage. She hunts the battery that delivers itself.',
        },
      },
      {
        id: 'sap',
        label: 'Spend sap. Stand in the wash.',
        sub: 'Look expensive to break.',
        enable: { sapMin: 2 },
        locked: 'Sap too thin to stand as a furnace.',
        effects: {
          sap: -2,
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'sap' },
          goto: 'ch1:land',
          flash: 'You burn fuel where she can see it. Kohl at your throat is a hunt-mark, not a kindness. You cost too much to crack today.',
        },
      },
      {
        id: 'glint',
        label: 'Burn a Glint',
        sub: 'Toss a spark. Buy a delay. Not magic — money.',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          flag: { ...done, climax: 'glint' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash: 'The Glint skips like a coin into a worse religion. She tracks the spark a breath too long. You take the Approach.',
        },
      },
      {
        id: 'hollow',
        label: 'Bait the Hollows',
        sub: 'Bury a valued thing. Low magic. A real bill.',
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
        locked: 'You must bury a valued thing — Glint, Drop, mark, bit, cloth, dagger, wrench, or Silas\'s tip.',
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
        label: 'Lay a false trail',
        sub: 'Spend scrap, wrench, a map, Silas\'s tip, the dagger, or Ossa.',
        enable: {
          any: [
            { item: 'scrap' },
            { item: 'wrench' },
            { item: 'cache_map' },
            { item: 'oram_map' },
            { item: 'rusted_dagger' },
            { item: 'silas_tip' },
            { flag: 'ossaAlly' },
          ],
        },
        locked: 'You need scrap, a tool, a heading, Silas\'s tip, or Ossa standing with you.',
        effects: {
          flag: { ...done, climax: 'false', falseTrail: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash: 'You spend what the sand can tell as a lie. She is a moment late. Reasonable people hate being late.',
        },
      },
      {
        id: 'bargain-drop',
        label: 'Bargain. Spend a Drop so she thinks you are already a furnace.',
        show: { all: [{ door: 'vessel' }, { item: 'vial_drop' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true, bargainDrop: true },
          heat: { seekers: -1 },
          goto: 'ch1:land',
          flash:
            'She watches you pour. Kohl at your throat. "Useful. Do not become a hymn." Seekers keep their own cups. Nobody else.',
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
          flash: 'She writes the receipt on your throat. You will fill at the Maw. She will use you. Kind is Seekers-only.',
        },
      },
      {
        id: 'brand',
        label: 'Take the hunt-mark. Do not ask her for help.',
        sub: 'Sybella is Seekers. She does not aid Cartel or Dune-Strays.',
        show: { not: { door: 'vessel' } },
        tone: 'quiet',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push' },
          heat: { seekers: 2 },
          goto: 'ch1:land',
          flash:
            'Kohl like a warrant. She does not feed you. She does not cool. She hunts. The Approach collects what she does not catch today.',
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
          any: [
            { item: 'scrap' },
            { item: 'wrench' },
            { item: 'cache_map' },
            { item: 'oram_map' },
            { item: 'rusted_dagger' },
            { item: 'silas_tip' },
            { flag: 'ossaAlly' },
          ],
        },
        reply: 'You spend a thing. The desert spends a direction.',
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
    body: `The Maw is a bite the land never closed. The cache is close enough to poison your decisions.

Chapter 1 holds. What you spent is the person you are now.`,
    variants: [
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl on your throat. A bargain that thinks it is a future.`,
      },
      {
        if: { flagEq: ['climax', 'push'] },
        mode: 'append',
        body: `You did not spend a pretty thing. You spent the last walk. Kohl anyway. She is still behind you.`,
      },
      {
        if: { flag: 'bargainDrop' },
        mode: 'append',
        body: `The Drop you poured bought a softer leash. Softer is still a leash.`,
      },
      {
        if: { flagEq: ['climax', 'flee'] },
        mode: 'append',
        body: `Your lungs are knives. She is behind you like weather. Seeker Heat will not cool in the Approach.`,
      },
      {
        if: { flagEq: ['climax', 'false'] },
        mode: 'append',
        body: `The false trail bought an hour. Hours are currency. You are already spending it.`,
      },
      {
        if: { flagEq: ['falseSpent', 'wrench'] },
        mode: 'append',
        body: `The wrench is in the sand now, telling a story of a prisoner who went west.`,
      },
      {
        if: { flagEq: ['falseSpent', 'oram_map'] },
        mode: 'append',
        body: `Oram's map is a lie pointing the other way. He would hate that. He might also understand.`,
      },
      {
        if: { flagEq: ['falseSpent', 'silas_tip'] },
        mode: 'append',
        body: `Silas's scratch just bought you a direction that is not yours. Stray-to-stray, spent.`,
      },
      {
        if: { flagEq: ['climax', 'hollow'] },
        mode: 'append',
        body: `Something you loved is in the sand, screaming quietly. You and the Maw can both hear it.`,
      },
      {
        if: { flagEq: ['climax', 'glint'] },
        mode: 'append',
        body: `One Glint poorer. One breath richer. She will bill the delay in Red Maw.`,
      },
      {
        if: { flagEq: ['climax', 'sap'] },
        mode: 'append',
        body: `You stood as a furnace and paid in sap. The kohl receipt is lighter. Your glass is not.`,
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
        body: `You arrived as kin, or as kin-crime. Stray country keeps receipts.`,
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
        body: `Ossa plants her stilts in the Approach shade and starts repairing a lash. She is alive. She looks at you like a plan.`,
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
          flash: 'Red Maw Approach. The cache is close. So is she. You steal a breath. Sap returns, a little.',
        },
      },
    ],
  },
]

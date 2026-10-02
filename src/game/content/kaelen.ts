import type { Scene } from '../types'

const rumorHook = `"News is inventory. I don't give it away. Scrap buys a Drop of Oasis Sap. Glints buy intel. Ask. Pay. Then you get a lead — side trouble, or the Hunger, or both if your pockets are honest."`

export const campKaelenScenes: Scene[] = [
  {
    id: 'camp:kaelen',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `He has the Wire at his back like a second pack-strap. "You're the trench story," he says. "Buy. Sell. Rumors that open roads. Pick a shelf."`,
    variants: [
      {
        if: { flag: 'kaelenSoldDrop' },
        mode: 'append',
        body: `A vial-gap in the pack where your Drop used to live. He notices you noticing. Paranoid is a lifestyle.`,
      },
    ],
    choices: [
      {
        id: 'rumors',
        label: 'Ask for rumors. News.',
        sub: 'He sells leads. Leads open trouble. Leads can point at the Hunger.',
        effects: {
          goto: 'camp:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true },
        },
      },
      {
        id: 'glint',
        label: 'Put a Glint on the pack. Buy intel.',
        show: { item: 'glints' },
        effects: {
          goto: 'camp:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true, kaelenGlintOut: true },
          flash: 'The Glint disappears into a thick glove. "Now we are talking inventory."',
        },
      },
      {
        id: 'oil',
        label: 'Ask him to muddy your name with the Cartel',
        sub: 'A rumor pointed the wrong way. Cartel Heat cools.',
        effects: {
          ticks: 1,
          heat: { cartel: -1 },
          goto: 'camp:kaelen',
          flag: { kaelenKnown: true, kaelenMud: true },
          flash:
            '"I can tell a clerk you went west with a hull you do not have." He does not smile. Cartel Heat cools. He lies for survivors.',
        },
      },
      {
        id: 'back',
        label: 'Leave the Sifter',
        tone: 'quiet',
        effects: { goto: 'camp:wire' },
      },
    ],
    intents: [
      {
        tags: ['rumor', 'rumours', 'news', 'gossip', 'intel', 'ask', 'hear'],
        reply: rumorHook,
        effects: { goto: 'camp:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['kallik', 'cache', 'hunger', 'maw', 'heading'],
        reply: '"That lead is intel. Glints. I do not donate the Hunger."',
        effects: { goto: 'camp:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['drop', 'sap', 'oasis'],
        reply: '"Scrap buys a Drop of Oasis Sap. That is Buy. Rumors are a different shelf."',
        effects: { ticks: 1 },
      },
      {
        tags: ['cut', 'hole', 'wire', 'route', 'escape'],
        reply: '"A hole is a trade route. I sell those too. Pay on the rumor shelf. Oil-Tooth still hotwires the Strider — that is not me."',
        effects: { goto: 'camp:kaelen-rumors' },
      },
      {
        tags: ['scrip', 'paper', 'cartel'],
        reply: '"Scrip is a Cartel lullaby. I do not take lullabies. Scrap. Glints. Cost. Profit."',
        effects: {},
      },
    ],
  },
  {
    id: 'camp:kaelen-rumors',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Rumor Counter',
    speaker: 'Kaelen the Sifter',
    body: `"Ask. Pay.

One: a Drop of Oasis Sap for scrap. That shelf is the shop.
Two: Glints buy intel. Kallik's cache. The Hunger. A blonde on a skiff.
Three: cheaper leads. Side trouble. Relics Valerius hunts. When the Great Bleed hits the guard station. A hole in the wire."`,
    variants: [
      {
        if: { flag: 'kaelenGlintOut' },
        mode: 'append',
        body: `Your Glint is already in the glove. He taps the pack. "Intel is paid. Point at a lead."`,
      },
    ],
    choices: [
      {
        id: 'hunger-glint',
        label: 'Buy the Hunger lead — Kallik, cache, the skiff',
        sub: 'Glints buy intel.',
        group: 'intel',
        show: { all: [{ flagUnset: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          remove: { glints: 1 },
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash:
            '"Kallik owed the Maw. Cache is real. Sybella is more real. Red Maw. Second rib. You want a Strider, that is Oil-Tooth. You wanted the heading. You have it."',
        },
      },
      {
        id: 'hunger-paid',
        label: 'Take the Hunger lead. Intel is already paid.',
        show: { all: [{ flag: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          unsetFlag: ['kaelenGlintOut'],
          ticks: 1,
          goto: 'camp:wire',
          flash:
            '"Kallik owed the Maw. Cache is real. Sybella is more real. Red Maw. Second rib. Heading is yours. Strider is still Oil-Tooth."',
        },
      },
      {
        id: 'relic',
        label: 'Buy a side-trouble lead — relics Valerius hunts',
        sub: '1 scrap. A heading. The Yard is still a walk.',
        show: { flagUnset: 'relicRumor' },
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          remove: { scrap: 1 },
          flag: { relicRumor: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Unpermitted relic hoard. Yard seam, third vat\'s shadow. Valerius hunts Sap thieves and relic hoarders. That is his joy. I sold a heading. I do not sell a door. Map the Yard."',
        },
      },
      {
        id: 'relic-walk',
        label: 'Walk the Yard for the hoard',
        sub: 'Connected roads only. The Wire is not a door into the vats.',
        show: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        effects: {
          travel: 'camp:yard',
        },
      },
      {
        id: 'bleed',
        label: 'Buy when the Great Bleed hits the guard station',
        sub: '1 scrap. Timing Oil-Tooth can use.',
        show: { flagUnset: 'bleedIntel' },
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          remove: { scrap: 1 },
          flag: { bleedIntel: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:kaelen-rumors',
          flash:
            '"Steam-vent on the west bolt. Bleed-hour. Guards look at the vats. Tell Oil-Tooth I sold a clock."',
        },
      },
      {
        id: 'route-scrap',
        label: 'Buy a hole in the wire — hidden trade route',
        sub: '2 scrap. A hole in the wire.',
        show: { flagUnset: 'wireCut' },
        enable: { itemMin: ['scrap', 2] },
        locked: 'Need 2 scrap',
        effects: {
          remove: { scrap: 2 },
          flag: { wireCut: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash:
            'He points. A person-sized gap in Ironwood property, already priced. "Route."',
        },
      },
      {
        id: 'route-glint',
        label: 'Buy a hole in the wire — 1 Glint',
        show: { flagUnset: 'wireCut' },
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          remove: { glints: 1 },
          flag: { wireCut: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash: 'Glint for a route. He smiles with no warmth. Profit.',
        },
      },
      {
        id: 'back',
        label: 'Back to the pack',
        tone: 'quiet',
        effects: { goto: 'camp:kaelen' },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'hunger', 'maw', 'heading', 'sybella'],
        reply: 'He names a price with his eyes. Glints. Then the Maw.',
        effects: { ticks: 1 },
      },
      {
        tags: ['relic', 'hoard', 'trouble', 'side'],
        reply: '"Side trouble. Scrap. The Overseer loves a relic he can punish."',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:relic',
    hubId: 'camp04',
    kind: 'story',
    title: 'Unpermitted Hoard',
    body: `Kaelen's lead is a crate in vat-shadow, tagged with a clerk mark that is not a permit. Relics. Spent amber. Things Valerius calls unpermitted because he has not finished hurting the person who held them.

You walked here. This is the side trouble you paid for, then spent roads to touch.`,
    choices: [
      {
        id: 'look',
        label: 'Look the latch over',
        show: { flagUnset: 'relicLooked' },
        effects: {
          flag: { relicLooked: true },
          ticks: 1,
          flash:
            'Nine teeth scratched on the latch. Oil-Tooth\'s stash, or a cousin of his tinkering. The crate is a fight if you force it and a haul if the teeth seat.',
        },
      },
      {
        id: 'take',
        label: 'Seat the gear. Take the haul.',
        sub: 'Scrap, a Glint, and a baton. Better than a scavenge.',
        tone: 'danger',
        show: { flag: 'relicLooked' },
        effects: {
          add: { glints: 1, scrap: 3, ironwood_baton: 1 },
          flag: { relicTaken: true },
          heat: { cartel: 2 },
          pressure: 1,
          ticks: 1,
          goto: 'camp:yard',
          flash:
            'Scrap +3. A Glint. A baton that still holds a charge — clerk steel, useful if Valerius ever leaves the tower. He will smell this. You are still in the Yard.',
        },
      },
      {
        id: 'leave',
        label: 'Leave the hoard. Keep the rumor.',
        tone: 'quiet',
        effects: {
          flag: { relicSeen: true },
          goto: 'camp:yard',
          ticks: 1,
          flash: 'You paid for a door you did not open. You are still in the Yard. Kaelen would call that a lesson. He would still charge for the next one.',
        },
      },
    ],
  },
]

export const spineKaelenScenes: Scene[] = [
  {
    id: 'spine:kaelen',
    hubId: 'spine',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `Dusk on the Spine. Less wire, more dust. "You're the empty vial," he says. "I fill those if you pay. Buy. Sell. Rumors, and what a survivor can carry."`,
    choices: [
      {
        id: 'rumors',
        label: 'Ask for rumors. News.',
        effects: { goto: 'spine:kaelen-rumors', ticks: 1, flag: { kaelenKnown: true } },
      },
      {
        id: 'glint',
        label: 'Put a Glint on the pack. Buy intel.',
        show: { item: 'glints' },
        effects: {
          goto: 'spine:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true, kaelenGlintOut: true },
          flash: 'The Glint vanishes. "Intel. Point."',
        },
      },
      {
        id: 'go',
        label: 'Let him pass',
        tone: 'quiet',
        effects: { goto: 'spine:well' },
      },
      {
        id: 'hunger',
        label: 'Walk the Hunger toward Red Maw',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'He is already counting the next customer. You spend the dusk on a road.',
        },
      },
    ],
    intents: [
      {
        tags: ['rumor', 'rumours', 'news', 'gossip', 'intel', 'kallik', 'cache', 'hunger'],
        reply: rumorHook,
        effects: { goto: 'spine:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['drop', 'sap'],
        reply: '"Scrap buys a Drop of Oasis Sap. That is Buy. Rumors are Glints, or cheaper trouble for scrap."',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'spine:kaelen-rumors',
    hubId: 'spine',
    kind: 'talk',
    title: 'Rumor Counter',
    speaker: 'Kaelen the Sifter',
    body: `"Glints buy the Hunger — Kallik's cache, the blonde on the skiff. Scrap buys smaller trouble: Hound-sign on the east wash. I do not take scrip."`,
    choices: [
      {
        id: 'hunger-glint',
        label: 'Buy the Hunger lead',
        sub: 'Glints buy intel.',
        group: 'intel',
        show: { all: [{ flagUnset: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          remove: { glints: 1 },
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          ticks: 1,
          goto: 'spine:well',
          flash:
            'He scratches Red Maw in the dirt with a boot-heel. "Kallik\'s bait. Sybella\'s skiff. Ossa on stilts if she is still alive. Do not make me collect you as bones."',
        },
      },
      {
        id: 'hunger-paid',
        label: 'Take the Hunger lead. Intel is already paid.',
        show: { all: [{ flag: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          unsetFlag: ['kaelenGlintOut'],
          ticks: 1,
          goto: 'spine:well',
          flash: '"Heading is yours. Shade is still Silas. I do not mix the jobs."',
        },
      },
      {
        id: 'hound',
        label: 'Buy a heading — Hound on the east wash',
        sub: 'Costs 1 scrap. You learn Valerius is close. You still have to walk the east wash.',
        show: { flagUnset: 'kaelenHoundRumor' },
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          remove: { scrap: 1 },
          flag: { kaelenHoundRumor: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Valerius. Shard-Hound. He hunts Sap thieves and unpermitted relic hoarders even out here. You paid to know he is close. Congratulations. I sold a heading. Map the wash."',
        },
      },
      {
        id: 'hound-walk',
        label: 'Walk the east wash for the Hound',
        sub: 'Walk the east wash yourself. Kaelen only sold you the heading.',
        show: { flag: 'kaelenHoundRumor' },
        effects: {
          travel: 'spine:hound',
        },
      },
      {
        id: 'back',
        label: 'Back to the pack',
        tone: 'quiet',
        effects: { goto: 'spine:kaelen' },
      },
      {
        id: 'walk',
        label: 'The heading is enough. Walk the Maw.',
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { flag: 'kaelenHunger' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'He does not walk with you. Inventory stays. You do not.',
        },
      },
    ],
  },
]

export const threshKaelenScenes: Scene[] = [
  {
    id: 'thresh:sift',
    hubId: 'threshold',
    kind: 'place',
    title: 'Cup-Shadow',
    body: `Shade off the Strider paddock, close enough to the Court that you can hear the chant miss a beat. A pack leans against the wall: dust-caked canvas, jars of amber, thick gloves. The merchant here buys the lie that a person can be a cup.

Kaelen the Sifter is here when the road says he is here. He will pay for a way out.`,
    variants: [
      {
        if: { flag: 'kaelenKnown' },
        mode: 'append',
        body: `He already priced you. The pack ticks like a second heart.`,
      },
    ],
    choices: [
      {
        id: 'kaelen',
        label: 'Step into the pack-shade. Kaelen the Sifter.',
        sub: 'Buy. Sell. Rumors.',
        effects: { goto: 'thresh:kaelen', ticks: 1, flag: { kaelenKnown: true } },
      },
    ],
    intents: [
      {
        tags: ['kaelen', 'sifter', 'merchant', 'pack', 'trade'],
        reply: 'Gloves. Inventory. He does not look at the cloth like it is holy.',
        effects: { goto: 'thresh:kaelen', ticks: 1, flag: { kaelenKnown: true } },
      },
    ],
  },
  {
    id: 'thresh:kaelen',
    hubId: 'threshold',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `Cup-shadow. Less wire, more hymn-dust. "You're the cup the church hasn't finished pouring," he says. "I buy false routes. I sell what a survivor can carry. Buy. Sell. Rumors. Pick a shelf."`,
    variants: [
      {
        if: { flag: 'kaelenSoldDrop' },
        mode: 'append',
        body: `A vial-gap in the pack. He notices you noticing. Paranoid is a lifestyle even in a church.`,
      },
    ],
    choices: [
      {
        id: 'rumors',
        label: 'Ask for rumors. News.',
        sub: 'Seeker Heat. Runners. Oram. The Hunger if you pay.',
        effects: {
          goto: 'thresh:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true },
        },
      },
      {
        id: 'glint',
        label: 'Put a Glint on the pack. Buy intel.',
        show: { item: 'glints' },
        effects: {
          goto: 'thresh:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true, kaelenGlintOut: true },
          flash: 'The Glint disappears. "Intel. Not a blessing. Point."',
        },
      },
      {
        id: 'ride',
        label: 'Ask if he will steal a Strider',
        effects: {
          ticks: 1,
          goto: 'thresh:kaelen',
          flag: { kaelenKnown: true },
          flash:
            '"I do not ride. Oram counts joints. Thalia counts cups. I count coin. Do not mix the jobs."',
        },
      },
      {
        id: 'back',
        label: 'Leave the Sifter',
        tone: 'quiet',
        effects: { goto: 'thresh:sift' },
      },
    ],
    intents: [
      {
        tags: ['rumor', 'rumours', 'news', 'gossip', 'intel', 'ask', 'hear'],
        reply: rumorHook,
        effects: { goto: 'thresh:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['kallik', 'cache', 'hunger', 'maw', 'heading'],
        reply: '"That lead is intel. Glints. I do not donate the Hunger. Thalia will try to."',
        effects: { goto: 'thresh:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['drop', 'sap', 'oasis'],
        reply: '"Scrap buys a Drop of Oasis Sap. That is Buy. Rumors are a different shelf. Blessings are not coin."',
        effects: { ticks: 1 },
      },
      {
        tags: ['oram', 'strider', 'ride', 'bit'],
        reply: '"Oram sells a map if you ask like a thief. I do not sell a ride. I do not steal his animals."',
        effects: { ticks: 1 },
      },
      {
        tags: ['thalia', 'cup', 'vessel', 'hymn'],
        reply: '"She will pour you if you let her. I sell a heading that is not a hymn. Cost. Profit."',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'thresh:kaelen-rumors',
    hubId: 'threshold',
    kind: 'talk',
    title: 'Rumor Counter',
    speaker: 'Kaelen the Sifter',
    body: `"Ask. Pay.

One: a Drop of Oasis Sap for scrap. That shelf is the shop.
Two: Glints buy intel. Kallik's cache. The Hunger. A blonde on a skiff. Thalia will call it a hymn. I call it inventory.
Three: cheaper leads. Seeker runners on the hymn-road. How Heat works here. Oram's false-route, if you want his map.

Scrip and blessing stay off the tray."`,
    variants: [
      {
        if: { flag: 'kaelenGlintOut' },
        mode: 'append',
        body: `Your Glint is already in the glove. He taps the pack. "Intel is paid. Point at a lead."`,
      },
    ],
    choices: [
      {
        id: 'hunger-glint',
        label: 'Buy the Hunger lead — Kallik, cache, the skiff',
        sub: 'Glints buy intel. Not a hymn.',
        group: 'intel',
        show: { all: [{ flagUnset: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          remove: { glints: 1 },
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Kallik owed the Maw. Cache is real. Sybella is more real. Thalia wants you poured first. I sold a heading. Ride is still Oram\'s stolen beast, not mine."',
        },
      },
      {
        id: 'hunger-paid',
        label: 'Take the Hunger lead. Intel is already paid.',
        show: { all: [{ flag: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          unsetFlag: ['kaelenGlintOut'],
          ticks: 1,
          flash: '"The heading is yours. The hymn is still Thalia. The Strider is still Oram. I do not mix the jobs."',
        },
      },
      {
        id: 'runners',
        label: 'Buy a heading — Seeker runners on the hymn-road',
        sub: 'Costs 1 scrap. You learn the runners are watching. The Court is still a walk from here.',
        show: { flagUnset: 'kaelenRunnerRumor' },
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          remove: { scrap: 1 },
          flag: { kaelenRunnerRumor: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Seeker runners on the hymn-road are watching for a Vessel to pour. I sold you the heading. I do not open their door."',
        },
      },
      {
        id: 'oram-route',
        label: "Buy Oram's false-route — thief, not cup",
        sub: '1 scrap. The paddock is still a walk.',
        show: { flagUnset: 'kaelenOramRumor' },
        enable: { item: 'scrap' },
        locked: 'Need 1 scrap',
        effects: {
          remove: { scrap: 1 },
          flag: { kaelenOramRumor: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Oram will give you a map if you ask like a thief, not a cup. He wants the Striders alive. I want coin. The paddock is a walk from here."',
        },
      },
      {
        id: 'oram-walk',
        label: 'Walk the paddock for Oram',
        sub: 'Connected roads. Kaelen does not dump you there.',
        show: { flag: 'kaelenOramRumor' },
        effects: {
          travel: 'thresh:paddock',
        },
      },
      {
        id: 'back',
        label: 'Back to the pack',
        tone: 'quiet',
        effects: { goto: 'thresh:kaelen' },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'hunger', 'maw', 'heading', 'sybella'],
        reply: 'He names a price with his eyes. Glints. Then the Maw. Not a hymn.',
        effects: { ticks: 1 },
      },
      {
        tags: ['runner', 'runners', 'heat', 'seeker'],
        reply: '"Side trouble. Scrap. The runners love a cup they can punish."',
        effects: { ticks: 1 },
      },
      {
        tags: ['oram', 'map', 'false', 'route'],
        reply: '"Oram keeps animals. I keep a pack. Pay if you want the difference named."',
        effects: { ticks: 1 },
      },
    ],
  },
]

export const roamKaelenScenes: Scene[] = [
  {
    id: 'roam:kaelen',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `Kaelen the Sifter, pack open, already half gone. He has been through Cartel wire, Seeker fringe, and Stray dust. The shelf matches the last road. He jitters. He will not sell anything that harms a fellow survivor.

"I do not stay. Buy if you are bleeding. Ask if you want what I heard. Then I walk."`,
    choices: [
      {
        id: 'kallik',
        label: 'Ask what he heard about the Maw',
        show: { flagUnset: 'heardKallik' },
        effects: {
          flag: { heardKallik: true, kaelenKnown: true },
          ticks: 1,
          flash:
            '"Kallik. Long dead. Buried a haul in the Red Maw and carved a nine-tooth gear on the second rib from the jaw. Blind picks waste you. The mark, the scratch, and this rumor narrow it."',
        },
      },
      {
        id: 'amber',
        label: 'Ask what The Walking Amber is',
        show: { flag: 'heardWalkingAmber' },
        effects: {
          ticks: 1,
          flash:
            '"Seeker talk. Something that walks out of the sand and should not. I will not say their word louder than this. Ask the woman in the skiff if you like breathing less."',
        },
      },
      {
        id: 'back',
        label: 'Let him go',
        tone: 'quiet',
        effects: { flag: { returnPass: true }, ticks: 1, flash: 'The pack is gone. You are where you were.' },
      },
    ],
  },
]

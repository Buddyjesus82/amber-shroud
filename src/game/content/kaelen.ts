import type { Scene } from '../types'

const look = `Kaelen the Sifter jitters — a diminutive merchant in dust-caked canvas, an overstuffed pack of vials, gears, and amber jars, thick gloves on both hands. Independent scavenger. He plays all sides. Shrewd. Paranoid. Fast-talk. Everything is cost and profit. His hidden trade routes are unmatched.`

const rumorHook = `"News is inventory. I don't give it away. Scrap buys a Drop of Oasis Sap. Glints buy intel. Ask. Pay. Then you get a lead — side trouble, or the Hunger, or both if your pockets are honest."`

export const campKaelenScenes: Scene[] = [
  {
    id: 'camp:kaelen',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `${look}

He has the Wire at his back like a second pack-strap. "You're the trench story," he says, already counting what you might be worth. "I am not Oil-Tooth. He hotwires. I sell. Drops. Intel. Rumors that open trouble. Pick a product."`,
    variants: [
      {
        if: { flag: 'kaelenSoldDrop' },
        mode: 'append',
        body: `A vial-gap in the pack where your Drop used to live. He notices you noticing. Paranoid is a lifestyle.`,
      },
    ],
    choices: [
      {
        id: 'drop',
        label: 'Trade scrap for a Drop of Oasis Sap',
        sub: 'Merchant. Arithmetic. Not charity.',
        show: { item: 'scrap' },
        effects: {
          remove: { scrap: 1 },
          add: { vial_drop: 1 },
          flag: { kaelenKnown: true, kaelenSoldDrop: true },
          ticks: 1,
          goto: 'camp:kaelen',
          flash:
            '"Scrap in. Drop out. I don\'t do charity. I do arithmetic." He gloves the vial like it might bite him back.',
        },
      },
      {
        id: 'rumors',
        label: 'Ask for rumors. News.',
        sub: 'He sells leads. They open trouble. They can point at the Hunger.',
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
        label: 'Ask if he is the inside man',
        effects: {
          ticks: 1,
          goto: 'camp:kaelen',
          flag: { kaelenKnown: true },
          flash:
            '"Oil-Tooth Vance. Bunk next to you. Brass jaw. He repairs Striders and watches the guard station. That is his job. Mine is rumors and Drops. Do not mix the invoices."',
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
        tags: ['drop', 'sap', 'oasis', 'trade', 'buy', 'sell', 'scrap'],
        reply: '"Scrap buys a Drop of Oasis Sap. That is the shop. Rumors are a different shelf."',
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
    body: `"Ask. Pay. I am not a church.

One: a Drop of Oasis Sap for scrap — that is the shop, not this shelf.
Two: Glints buy intel. Kallik's cache. The Hunger. A blonde on a skiff.
Three: cheaper leads. Side trouble. Relics Valerius hunts. When the Great Bleed hits the guard station. A hole in the wire if you want a route that is not a Strider.

Oil-Tooth remains your inside man. I remain the counter."`,
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
        show: { all: [{ item: 'glints' }, { flagUnset: 'kaelenGlintOut' }] },
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
        sub: 'One scrap. Opens trouble in the Yard.',
        show: { all: [{ item: 'scrap' }, { flagUnset: 'relicRumor' }] },
        effects: {
          remove: { scrap: 1 },
          flag: { relicRumor: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:relic',
          flash:
            '"Unpermitted relic hoard. Yard seam, third vat\'s shadow. Valerius hunts Sap thieves and relic hoarders. That is his joy. Cost is yours."',
        },
      },
      {
        id: 'bleed',
        label: 'Buy when the Great Bleed hits the guard station',
        sub: 'One scrap. Timing Oil-Tooth can use.',
        show: { all: [{ item: 'scrap' }, { flagUnset: 'bleedIntel' }] },
        effects: {
          remove: { scrap: 1 },
          flag: { bleedIntel: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:kaelen-rumors',
          flash:
            '"Steam-vent on the west bolt. Bleed-hour. Guards look at vats, not at you. Tell Oil-Tooth I do not work for him. I sold a clock."',
        },
      },
      {
        id: 'route-scrap',
        label: 'Buy a hole in the wire — hidden trade route',
        sub: 'Two scrap. Not a Strider. Not Oil-Tooth\'s job.',
        show: { all: [{ itemMin: ['scrap', 2] }, { flagUnset: 'wireCut' }] },
        effects: {
          remove: { scrap: 2 },
          flag: { wireCut: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash:
            'He does not cut. He points. A person-sized disloyalty in Ironwood property, already priced. "Route. Not a rescue."',
        },
      },
      {
        id: 'route-glint',
        label: 'Buy a hole in the wire with a Glint',
        show: { all: [{ item: 'glints' }, { flagUnset: 'wireCut' }, { flagUnset: 'kaelenGlintOut' }] },
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

This is side trouble. Not the Hunger. Not a Strider. A rumor you paid for.`,
    choices: [
      {
        id: 'take',
        label: 'Pocket a Glint and a twist of scrap',
        tone: 'danger',
        effects: {
          add: { glints: 1, scrap: 1 },
          flag: { relicTaken: true },
          heat: { cartel: 2 },
          pressure: 1,
          ticks: 1,
          goto: 'camp:yard',
          flash:
            'Profit. Also a smell Valerius is trained to love. He hunts Sap thieves and unpermitted relic hoarders. You have volunteered.',
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
          flash: 'You paid for a door you did not open. Kaelen would call that a lesson. He would still charge for the next one.',
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
    body: `${look}

Dusk on the Spine. Same pack. Same gloves. Less wire, more dust. "You're the empty vial," he says. "I fill those if you pay. I also sell rumors. Silas sold you shade. I sell inventory."`,
    choices: [
      {
        id: 'drop',
        label: 'Trade scrap for a Drop of Oasis Sap',
        show: { item: 'scrap' },
        effects: {
          remove: { scrap: 1 },
          add: { vial_drop: 1 },
          flag: { kaelenKnown: true, kaelenSoldDrop: true, firstDrop: true },
          ticks: 1,
          goto: 'spine:well',
          flash: '"Scrap in. Drop out." The glass stops ticking. He is already looking past you for the next customer.',
        },
      },
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
    ],
    intents: [
      {
        tags: ['rumor', 'rumours', 'news', 'gossip', 'intel', 'kallik', 'cache', 'hunger'],
        reply: rumorHook,
        effects: { goto: 'spine:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['drop', 'sap', 'trade', 'buy', 'scrap'],
        reply: '"Scrap buys a Drop of Oasis Sap. Rumors are Glints, or cheaper trouble for scrap."',
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
    body: `"Silas is shade. I am the counter. Glints buy the Hunger — Kallik's cache, the blonde on the skiff. Scrap buys smaller trouble: Hound-sign on the east wash. I do not take scrip. I do not hotwire. I do not pray."`,
    choices: [
      {
        id: 'hunger-glint',
        label: 'Buy the Hunger lead',
        sub: 'Glints buy intel.',
        show: { all: [{ item: 'glints' }, { flagUnset: 'kaelenGlintOut' }] },
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
          flash: '"Heading is yours. Shade is still Silas. I do not mix invoices."',
        },
      },
      {
        id: 'hound',
        label: 'Buy side trouble — Hound on the east wash',
        sub: 'One scrap.',
        show: { all: [{ item: 'scrap' }, { flagUnset: 'kaelenHoundRumor' }] },
        effects: {
          remove: { scrap: 1 },
          flag: { kaelenHoundRumor: true, kaelenKnown: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'spine:hound',
          flash:
            '"Valerius. Shard-Hound. He hunts Sap thieves and unpermitted relic hoarders even out here. You paid to know he is close. Congratulations."',
        },
      },
      {
        id: 'back',
        label: 'Back to the pack',
        tone: 'quiet',
        effects: { goto: 'spine:kaelen' },
      },
    ],
  },
]

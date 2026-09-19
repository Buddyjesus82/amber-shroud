import type { Scene } from '../types'

const look = `Kaelen the Sifter jitters — a diminutive merchant in dust-caked canvas, an overstuffed pack of vials, gears, and amber jars, thick gloves on both hands. Independent scavenger. He plays all sides. Shrewd. Paranoid. Fast-talk. Everything is cost and profit. His hidden trade routes are unmatched.`

const rumorHook = `"You asked. That is free. I do not give you a job. I give you a mouth to bother. Ask the right question there and it becomes trouble with a shape. Glints still buy a faster heading if you want to skip the walk. Scrap still buys clocks and holes. Those are products. This was a rumor."`

export const campKaelenScenes: Scene[] = [
  {
    id: 'camp:kaelen',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Kaelen the Sifter',
    speaker: 'Kaelen the Sifter',
    body: `${look}

He has the Wire at his back like a second pack-strap. "You're the trench story," he says, already counting what you might be worth. "I am not Oil-Tooth. He hotwires. I point. Ask me for a rumor and I name a mouth — not a job. Drops and intel are still for sale if you want to skip walking. Pick."`,
    variants: [
      {
        if: { flag: 'kaelenSoldDrop' },
        mode: 'append',
        body: `A vial-gap in the pack where your Drop used to live. He notices you noticing. Paranoid is a lifestyle.`,
      },
      {
        if: { flag: 'kaelenRumorKallik' },
        mode: 'append',
        body: `He already pointed you at Oil-Tooth. "Debt. Not treasure. If you asked the bay the wrong way, that is your inventory problem."`,
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
        label: 'Ask for a rumor. News.',
        sub: 'Free pointer. Not a job. Not a shop.',
        effects: {
          goto: 'camp:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true },
        },
      },
      {
        id: 'glint',
        label: 'Put a Glint on the pack. Buy a faster heading.',
        sub: 'Optional. Skips the walk to the right mouth.',
        show: { item: 'glints' },
        effects: {
          goto: 'camp:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true, kaelenGlintOut: true },
          flash: 'The Glint disappears into a thick glove. "Now we are talking inventory. The free rumor is still free."',
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
        reply: '"That is not a product I donate. I will point. Oil-Tooth. A debt. Not a map. Glints still buy the heading if you want to skip him."',
        effects: { goto: 'camp:kaelen-rumors', flag: { kaelenKnown: true } },
      },
      {
        tags: ['drop', 'sap', 'oasis', 'trade', 'buy', 'sell', 'scrap'],
        reply: '"Scrap buys a Drop of Oasis Sap. That is the shop. Rumors are a different shelf — and the first one is free."',
        effects: { ticks: 1 },
      },
      {
        tags: ['cut', 'hole', 'wire', 'route', 'escape'],
        reply: '"A hole is a trade route. I sell those. The free rumor is a mouth, not a hole. Pay on the other shelf if you want a cut."',
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
    body: `"You asked. That is free.

Oil-Tooth Vance. The stall. Do not ask him for a map, a Drop, or the Hunger. Ask him if Kallik still owes the bay. The right question is a debt. The wrong question is treasure. He will not mix the invoices for you. When he answers, it becomes a job — objective, stakes, cost. Until then it is only a rumor.

I am not a church. I am also not a quest shop. Glints still buy a faster heading: Kallik's cache, the Hunger, a blonde on a skiff, a map so you can skip the stall. Scrap still buys smaller products: relics Valerius hunts, when the Great Bleed hits the guard station, a hole in the wire.

Oil-Tooth remains your inside man. I remain the counter."`,
    onEnter: { flag: { kaelenRumorKallik: true, kaelenKnown: true } },
    variants: [
      {
        if: { flag: 'kaelenGlintOut' },
        mode: 'append',
        body: `Your Glint is already in the glove. He taps the pack. "Intel is paid. You can still walk to Oil-Tooth and ask the debt, or you can take the heading now and skip him."`,
      },
      {
        if: { flag: 'hungerKnown' },
        mode: 'append',
        body: `The Hunger already has a shape in your pocket. He shrugs. "Then you are shopping. Not asking."`,
      },
    ],
    choices: [
      {
        id: 'oil',
        label: 'I heard. Find Oil-Tooth.',
        sub: 'Ask if Kallik still owes the bay. Not for a map.',
        effects: { goto: 'camp:lean', ticks: 1 },
      },
      {
        id: 'hunger-glint',
        label: 'Pay a Glint. Take the Hunger heading now.',
        sub: 'Optional shortcut. Map and mark. Skips the stall.',
        show: { all: [{ item: 'glints' }, { flagUnset: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          remove: { glints: 1 },
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash:
            '"Kallik owed the Maw. Cache is real. Sybella is more real. Red Maw. Second rib. You skipped the stall. That is what Glints are for. Strider is still Oil-Tooth."',
        },
      },
      {
        id: 'hunger-paid',
        label: 'Take the Hunger heading. Intel is already paid.',
        sub: 'Shortcut. You already put the Glint down.',
        show: { all: [{ flag: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          unsetFlag: ['kaelenGlintOut'],
          ticks: 1,
          goto: 'camp:wire',
          flash:
            '"Kallik owed the Maw. Cache is real. Sybella is more real. Red Maw. Second rib. Heading is yours. You skipped the debt question. Strider is still Oil-Tooth."',
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
        tags: ['oil', 'tooth', 'jaxson', 'vance', 'owe', 'owes', 'debt', 'bay', 'stall'],
        reply: '"The stall. Kallik. What he still owes. Not a map."',
        effects: { goto: 'camp:lean', ticks: 1 },
      },
      {
        tags: ['kallik', 'cache', 'hunger', 'maw', 'heading', 'sybella'],
        reply: 'He names a price with his eyes. Glints skip the stall. The free rumor already pointed. Walk, or pay.',
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

Dusk on the Spine. Same pack. Same gloves. Less wire, more dust. "You're the empty vial," he says. "I fill those if you pay. Ask me for a rumor and I name a mouth — not a job. Silas sold you shade. I do not. I point."`,
    variants: [
      {
        if: { flag: 'kaelenRumorHound' },
        mode: 'append',
        body: `He already pointed you at the east wash. "The woman on the skiff. Not the cork. If you asked him the wrong way, that is not a refund."`,
      },
    ],
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
        label: 'Ask for a rumor. News.',
        sub: 'Free pointer. Not a job.',
        effects: { goto: 'spine:kaelen-rumors', ticks: 1, flag: { kaelenKnown: true } },
      },
      {
        id: 'glint',
        label: 'Put a Glint on the pack. Buy a faster heading.',
        sub: 'Optional. Skips the Hound.',
        show: { item: 'glints' },
        effects: {
          goto: 'spine:kaelen-rumors',
          ticks: 1,
          flag: { kaelenKnown: true, kaelenGlintOut: true },
          flash: 'The Glint vanishes. "Intel. You can still walk, or you can skip."',
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
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
        tags: ['drop', 'sap', 'trade', 'buy', 'scrap'],
        reply: '"Scrap buys a Drop of Oasis Sap. The first rumor is free. Faster headings are Glints."',
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
    body: `"Silas is shade. I am the counter. You asked. That is free.

East wash. Shard-Hound Valerius. Do not ask him about the cork. Do not ask him to hunt you a cache. Ask about the woman on the skiff. He answers questions that are not about you. When he answers, it becomes a job. Until then it is a rumor.

Glints still buy the Hunger outright — Kallik's cache, the blonde, a map — if you want to skip the Hound. Scrap still buys smaller trouble if you like paying to be walked there.

I do not take scrip. I do not hotwire. I do not pray."`,
    onEnter: { flag: { kaelenRumorHound: true, kaelenKnown: true } },
    variants: [
      {
        if: { flag: 'kaelenGlintOut' },
        mode: 'append',
        body: `Your Glint is in the glove. "Skip the wash, or walk it. Both are inventory."`,
      },
    ],
    choices: [
      {
        id: 'wash',
        label: 'I heard. East wash.',
        sub: 'Ask Valerius about the woman on the skiff. Not the cork.',
        effects: { goto: 'spine:hound', ticks: 1 },
      },
      {
        id: 'hunger-glint',
        label: 'Pay a Glint. Take the Hunger heading now.',
        sub: 'Optional shortcut. Skips the Hound.',
        show: { all: [{ item: 'glints' }, { flagUnset: 'kaelenGlintOut' }, { flagUnset: 'kaelenHunger' }] },
        effects: {
          remove: { glints: 1 },
          add: { kallik_mark: 1, cache_map: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, kaelenHunger: true, kaelenKnown: true },
          ticks: 1,
          goto: 'spine:well',
          flash:
            'He scratches Red Maw in the dirt with a boot-heel. "Kallik\'s bait. Sybella\'s skiff. You skipped the Hound. Do not make me collect you as bones."',
        },
      },
      {
        id: 'hunger-paid',
        label: 'Take the Hunger heading. Intel is already paid.',
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
        label: 'Pay scrap to be walked to the Hound',
        sub: 'Optional. One scrap. You already have the rumor.',
        show: { all: [{ item: 'scrap' }, { flagUnset: 'kaelenHoundRumor' }] },
        effects: {
          remove: { scrap: 1 },
          flag: { kaelenHoundRumor: true, kaelenRumorHound: true, kaelenKnown: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'spine:hound',
          flash:
            '"Valerius. Shard-Hound. He hunts Sap thieves and unpermitted relic hoarders even out here. You paid to arrive. Ask about the woman. Not the cork."',
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
        show: { any: [{ flag: 'hungerKnown' }, { flag: 'kaelenHunger' }, { item: 'silas_tip' }] },
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

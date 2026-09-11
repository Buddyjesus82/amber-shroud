import type { Scene } from '../types'

export const openingScenes: Scene[] = [
  {
    id: 'open:prisoner',
    kind: 'story',
    art: 'world',
    title: 'Ironwood Break',
    body: `The vat wall gives with a sound like wet wood splitting.

Camp-04 calls it the Bleed: amber cooked until it weeps, prisoners scraping the skin into buckets while Overseer Valerius counts hours like they are scrip. Tonight the trench floods. You go with it — a Drop stolen, Cartel scrip still in the hem they never searched, a vat-wrench riding your sleeve because the bolt came with you.

Sirens do not mean freedom. They mean the wire still thinks it owns you.`,
    choices: [
      {
        id: 'crawl',
        label: 'Crawl the trench into the Yard',
        sub: 'Kit: Drop, scrap, scrip, wrench. Cartel Heat is already on you.',
        effects: {
          enterHub: 'camp04',
          goto: 'camp:yard',
          ticks: 1,
          flash: 'You come up black to the elbows. The line of prisoners does not look. Looking is a skill they beat out of you.',
        },
      },
    ],
  },
  {
    id: 'open:outcast',
    kind: 'story',
    art: 'world',
    title: 'First Drop',
    body: `The vial is empty. It has been empty since yesterday's lie. Silas Vane pressed a shade-cut scratch into your palm before noon finished sentencing you — Stray-to-stray, on credit.

Noon on the Bleached Spine is not weather. It is a bill. Your tongue sits like cloth. Two walks will empty you. The tip might save a walk. Spend it later and it might save your life.

You came here because the Cartel would brand you and the Seekers would fill you. The Spine only asks that you empty.`,
    choices: [
      {
        id: 'stand',
        label: 'Stand up into the noon',
        sub: 'Kit: empty vial, Silas\'s tip. Sap is already thin.',
        effects: {
          enterHub: 'spine',
          goto: 'spine:ridge',
          ticks: 1,
          flash: 'Heat lays a hand on the back of your neck and leaves it there.',
        },
      },
    ],
  },
  {
    id: 'open:vessel',
    kind: 'story',
    art: 'world',
    title: 'Vessel',
    body: `They put the cloth on you because a Vessel is a walking cup and you have a spine that can still hold liquid.

You are not their Vessel. You nod like one. Outer Threshold is a church built out of dunes and bad memory. Thalia weeps gold. Oram counted Striders, then counted you, then tore a heading from his ledger because cups crack and thieves reach Red Maw. A rusted dagger sits against your ribs under the gold thread — kitchen steel, dishonest, yours.

The sacrament on your tongue is a real Drop. The rest is theater. Seeker Heat is already a hymn.`,
    choices: [
      {
        id: 'keep',
        label: 'Keep the cloth on. Walk the Court.',
        sub: 'Kit: Drop, dagger, Oram\'s map, cloth. Thalia is already watching.',
        effects: {
          enterHub: 'threshold',
          goto: 'thresh:court',
          ticks: 1,
          heat: { seekers: 1 },
          flash: 'Heads bow a half-inch. Belief is a muscle. You flex it.',
        },
      },
    ],
  },
]

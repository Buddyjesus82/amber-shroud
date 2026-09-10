import type { Scene } from '../types'

export const openingScenes: Scene[] = [
  {
    id: 'open:prisoner',
    kind: 'story',
    art: 'world',
    title: 'Ironwood Break',
    body: `The vat wall gives with a sound like wet wood splitting.

Camp-04 calls it the Bleed: amber cooked until it weeps, prisoners scraping the skin into buckets while Overseer Valerius counts hours like they are scrip. Tonight the trench floods. You go with it — glass in the palm, resin in the lungs, a Drop stolen because dying sober is a Cartel joke.

Sirens do not mean freedom. They mean the wire still thinks it owns you.`,
    choices: [
      {
        id: 'crawl',
        label: 'Crawl the trench into the Yard',
        sub: 'Stay inside the camp. For now.',
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
    body: `The vial is empty. It has been empty since yesterday's lie.

Noon on the Bleached Spine is not weather. It is a sentence. Your tongue sits like cloth. Somewhere under the ridge a well went dry in your grandmother's year and the Strays still argue about who drank the last honest Drop.

You came here because the Cartel would brand you and the Seekers would fill you. The Spine only asks that you empty.`,
    choices: [
      {
        id: 'stand',
        label: 'Stand up into the noon',
        sub: 'Shade first. Then a rumor. Then a Drop — if the desert allows.',
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

You are not their Vessel. You nod like one. Outer Threshold is a church built out of dunes and bad memory. Thalia weeps gold. Oram counts Striders. The guard wants someone holy enough to bully.

In the paddock, a Strider chews the bit you already stole. The sacrament on your tongue is a real Drop. The rest is theater.`,
    choices: [
      {
        id: 'keep',
        label: 'Keep the cloth on. Walk the Court.',
        sub: 'Fake it until the Threshold notices.',
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

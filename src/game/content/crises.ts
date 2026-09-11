import type { Scene } from '../types'

export const crisisScenes: Scene[] = [
  {
    id: 'crisis:camp',
    hubId: 'camp04',
    kind: 'crisis',
    title: 'Empty',
    speaker: 'Jaxson Oil-Tooth',
    body: `Sap hits zero in the Yard like a light going out.

You go to your knees in resin-slick dust. Jaxson is suddenly there — gold tooth, bad breath, a Drop forced against your lip. "I don't collect corpses. Corpses don't owe me. Get up. The cache at Red Maw is the only honest well left, and you are done playing prisoner."`,
    choices: [
      {
        id: 'up',
        label: 'Swallow. Get up.',
        effects: {
          sap: 3,
          flag: { hungerKnown: true, crisisCamp: true, jaxsonFavor: true },
          add: { kallik_mark: 1 },
          pressure: 2,
          goto: 'camp:forced',
          flash: 'You live. You owe Oil-Tooth. The camp has less patience than he does.',
        },
      },
    ],
  },
  {
    id: 'crisis:spine',
    hubId: 'spine',
    kind: 'crisis',
    title: 'Noon Takes Its Cut',
    body: `The Spine whites out.

You wake with sand in your teeth and a Drop in your vial you did not earn. Silas's milk eye is somewhere above you, or Kaelen's wrists, or a Hollow that smelled like both.

"First Drop," a voice says. "Last warning. East is the Maw. Stay and you become a story the well tells."`,
    choices: [
      {
        id: 'up',
        label: 'Hold the Drop. Stand.',
        effects: {
          sap: 3,
          add: { vial_drop: 1 },
          flag: { hungerKnown: true, crisisSpine: true, firstDrop: true },
          pressure: 2,
          goto: 'spine:ridge',
          flash: 'Noon returns. So does thirst, on a delay. The Hunger is no longer optional.',
        },
      },
    ],
  },
  {
    id: 'crisis:thresh',
    hubId: 'threshold',
    kind: 'crisis',
    title: 'The Cup Cracks',
    body: `The sacrament in you burns out. The cloth feels like a rag. You hit the Court stones.

Oram sloshes a real Drop against your mouth while Thalia screams a hymn that has nothing to do with you. "Ride," he says. "Be Hunger. Stay and they will pour what's left of you into a prettier liar."`,
    choices: [
      {
        id: 'up',
        label: 'Drink. Get to the paddock.',
        effects: {
          sap: 3,
          flag: { hungerKnown: true, crisisThresh: true },
          pressure: 2,
          goto: 'thresh:paddock',
          flash: 'The Strider stamps. The Court is already rewriting you as a lesson. Leave before the ink dries.',
        },
      },
    ],
  },
  {
    id: 'crisis:dunes',
    chapterId: 'cache-run',
    kind: 'crisis',
    title: 'The Wash Takes You',
    speaker: 'Ossa',
    body: `Sap gone. Knees gone. The dune tries to claim a new Hollow.

Stilts plant on either side of your head. Ossa is alive — of course she is — and furious about the extra work. A vial at your mouth. Half a Drop. Her half.

"Up," she says. "I don't bury people I haven't finished arguing with. Sybella is a brass line on the horizon. Move."`,
    choices: [
      {
        id: 'up',
        label: 'Take her Drop. Move.',
        effects: {
          sap: 3,
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, hungerKnown: true },
          add: { ossa_token: 1 },
          goto: 'ch1:sybella',
          flash: 'You stand because she requires it. The skiff is closer. So is the Maw.',
        },
      },
    ],
  },
  {
    id: 'crisis:maw',
    hubId: 'redmaw',
    kind: 'crisis',
    title: 'Approach Dry',
    speaker: 'Sybella',
    body: `You go down on the Rim with nothing left in the glass.

Sybella's shadow is cooler than the rock. She kneels — ceremonial, almost tender — and feeds you a Drop like a priest who has stopped believing in gods and started believing in tools.

"Batteries do not get to be empty," she says. "Not while I have a use. Get up. The Walking Amber is still ahead. I will not carry you. I will also not let you become a stain on my waiting room."`,
    choices: [
      {
        id: 'up',
        label: 'Take the Drop from her hand',
        effects: {
          sap: 3,
          flag: { sybellaBargain: true, sybellaHunting: true },
          add: { kohl_smear: 1 },
          heat: { seekers: 1 },
          goto: 'maw:rim',
          flash: 'You live on her terms for an hour. The kohl receipt is darker.',
        },
      },
    ],
  },
]

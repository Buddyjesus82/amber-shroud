import type { Scene } from '../types'

export const crisisScenes: Scene[] = [
  {
    id: 'crisis:camp',
    hubId: 'camp04',
    kind: 'crisis',
    title: 'Empty',
    speaker: 'Jaxson "Oil-Tooth" Vance',
    body: `Sap hits zero in the pens like a light going out.

You go to your knees in resin-slick dust. Oil-Tooth is suddenly there — burly, grease-stained, brass jaw, a skimmed Drop of Oasis Sap forced against your lip. "I don't collect corpses. Corpses don't hotwire. Get up. Guard station. Strider. I am the inside man. If you want rumors, that is Kaelen — and they still charge."`,
    choices: [
      {
        id: 'up',
        label: 'Swallow. Get up.',
        effects: {
          sap: 3,
          flag: { crisisCamp: true, jaxsonFavor: true },
          pressure: 2,
          returnCrisisFrom: true,
          goto: 'camp:lean',
          flash: 'You live. Oil-Tooth still wants the sabotage. Kaelen still charges for rumors.',
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

You wake with sand in your teeth and a Drop in your vial you did not earn. Silas's shade, or Kaelen the Sifter's thick gloves, or a Hollow that smelled like both.

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
    body: `You go down on the Rim with nothing left in the glass.

The desert does not send Sybella. She hunts Seekers' cups. Cartel property gets a clerk. Stray empty gets a scavenger. Nobody here is her battery.`,
    variants: [
      {
        if: { door: 'prisoner' },
        mode: 'replace',
        body: `You go down on the Rim with nothing left in the glass.

Valerius's Hound-handler is already there — not kind. A Drop forced against your lip like inventory maintenance. "Ironwood property stands. Sybella is Seekers. She does not feed Cartel mouths. Get up. You are still a heading I can sell."`,
      },
      {
        if: { door: 'outcast' },
        mode: 'replace',
        body: `You go down on the Rim with nothing left in the glass.

Silas's shade, or Kaelen's gloves — Stray arithmetic. A Drop you will owe. Sybella's skiff is a brass line on the horizon. She does not come. She does not feed Dune-Strays. She hunts.`,
      },
      {
        if: { door: 'vessel' },
        mode: 'replace',
        body: `You go down on the Rim with nothing left in the glass.

Sybella's shadow is cooler than the rock. She kneels — ceremonial, not tender — and feeds you a Drop because batteries do not get to be empty while she has a use.

"Get up. The Walking Amber is still ahead. I will not carry you. I keep my own cups. Cartel and Strays can die thirsty."`,
      },
    ],
    choices: [
      {
        id: 'up',
        label: 'Get up. Stay hunted.',
        show: { not: { door: 'vessel' } },
        effects: {
          sap: 3,
          flag: { sybellaHunting: true },
          heat: { seekers: 1 },
          goto: 'maw:rim',
          flash: 'You live. Not by her hand. The skiff is still a warrant.',
        },
      },
      {
        id: 'up-vessel',
        label: 'Take the Drop from her hand',
        show: { door: 'vessel' },
        effects: {
          sap: 3,
          flag: { sybellaBargain: true, sybellaHunting: true },
          add: { kohl_smear: 1 },
          heat: { seekers: 1 },
          goto: 'maw:rim',
          flash: 'You live on her terms for an hour. The kohl receipt is darker. Seekers-only.',
        },
      },
    ],
  },
]

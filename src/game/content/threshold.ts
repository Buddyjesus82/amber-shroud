import type { Scene } from '../types'

export const thresholdScenes: Scene[] = [
  {
    id: 'thresh:court',
    hubId: 'threshold',
    kind: 'place',
    title: 'Threshold Court',
    body: `The Outer Threshold is a hall of sand-brick and belief. Everyone here wants to stand near a Vessel. You are wearing the cloth, so heads tilt toward you. A chant tries to start and dies in the heat.

Thalia stands at the dais. The gold on her cheeks might be kohl and might be sap. Oram is not chanting. Oram is counting the Striders. That is why you might live.`,
    variants: [
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `Thalia's gold tracks find you even when she is not looking. Seeker Heat is a pressure behind the chant. The cloth is already a countdown.`,
      },
      {
        if: { pressureMin: 8 },
        mode: 'append',
        body: `The bowing is shallower. Someone has asked whether the cup is empty.`,
      },
    ],
    choices: [
      {
        id: 'thalia',
        label: 'Climb the dais. Speak to Thalia.',
        sub: 'She thinks you are a true Vessel. She will talk about Kallik\'s cache and Sybella.',
        effects: { goto: 'thresh:thalia', ticks: 1 },
      },
      {
        id: 'oram',
        label: 'Find Oram counting Striders.',
        sub: 'He cares about the animals, not the hymn. He may give you a heading.',
        effects: { goto: 'thresh:oram', ticks: 1 },
      },
      {
        id: 'kaelen',
        label: 'Walk the cup-shadow — a pack that is not a hymn',
        sub: 'Walk to Kaelen the Sifter. He sells rumors. He does not serve the Seekers.',
        effects: { travel: 'thresh:sift' },
      },
      {
        id: 'hunger',
        label: 'Ride the stolen Strider into Hunger',
        sub: "Oram's map. Kallik's cache. Before the cloth fails.",
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'oram_map' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          heat: { seekers: 1 },
          flash: 'The Court shrinks to a bad hymn behind you. The map is already a crime.',
        },
      },
      {
        id: 'bless',
        label: 'Offer a false blessing',
        sub: 'You pretend. Seeker Heat rises. Thalia notices.',
        effects: {
          ticks: 1,
          heat: { seekers: 1 },
          pressure: 1,
          flash: 'Heads bow a half-inch. Belief is a muscle. You flex it. Seeker Heat ticks. Thalia weeps like a countdown.',
        },
      },
    ],
    intents: [
      {
        tags: ['thalia', 'priest', 'dais', 'talk'],
        reply: 'You climb the two steps that make a person holy here.',
        effects: { goto: 'thresh:thalia', ticks: 1 },
      },
      {
        tags: ['oram', 'count', 'strider'],
        reply: 'Oram\'s feed-count is the only honest thing in the Court.',
        effects: { goto: 'thresh:oram', ticks: 1 },
      },
      {
        tags: ['kaelen', 'sifter', 'merchant', 'pack', 'shadow', 'cup-shadow'],
        reply: 'Hymn-shade off the paddock. A pack, not a stall. You walk it.',
        effects: { travel: 'thresh:sift' },
      },
      {
        tags: ['confess', 'truth', 'fake', 'lie'],
        reply: 'Not in the open. The cell is where lies can sit down.',
        effects: { goto: 'thresh:cell' },
      },
    ],
  },
  {
    id: 'thresh:cell',
    hubId: 'threshold',
    kind: 'place',
    title: 'False Vessel Cell',
    body: `They gave you a cell because a Vessel is supposed to meditate. You used it to take the cloth off and remember your own face.

A niche in the wall holds a sacrament Drop behind a lattice. Taking it from a church that already took you is almost tidy.`,
    choices: [
      {
        id: 'siphon',
        label: 'Siphon the sacrament',
        sub: 'The Drop behind the lattice. Costs sap to reach it. The Seekers will care if you take it.',
        show: { flagUnset: 'shrineDrop' },
        effects: { goto: 'thresh:shrine', ticks: 1, sap: -1 },
      },
      {
        id: 'thalia',
        label: 'Let Thalia find you without the cloth',
        sub: 'She sees you are not meditating. That is dangerous.',
        effects: { goto: 'thresh:thalia', ticks: 1, pressure: 1 },
      },
    ],
  },
  {
    id: 'thresh:shrine',
    hubId: 'threshold',
    kind: 'story',
    title: 'Sacrament Lattice',
    body: `The Drop behind the lattice is thicker than honest sap. Blessed, they say. The Hollows say nothing and take payment later.`,
    choices: [
      {
        id: 'take',
        label: 'Take it anyway',
        tone: 'danger',
        effects: {
          add: { vial_drop: 1 },
          flag: { shrineDrop: true, hollowTempt: true },
          heat: { seekers: 2 },
          ticks: 1,
          goto: 'thresh:cell',
          flash: 'The lattice leaves blood on your knuckles. The Drop does not care whose god it was.',
        },
      },
      {
        id: 'leave',
        label: 'Leave the god its drink',
        tone: 'quiet',
        effects: {
          flag: { shrineDrop: true },
          goto: 'thresh:cell',
          flash: 'You still have the paddock. You still have a Strider. Greed can wait until Red Maw.',
        },
      },
    ],
  },
  {
    id: 'thresh:thalia',
    hubId: 'threshold',
    kind: 'talk',
    title: 'Thalia',
    speaker: 'Thalia',
    body: `Thalia loves you with a violence that thinks it is worship. Gold tracks down her face.

"Vessel. Cup. The desert poured itself into a person and chose you." Her hands hover. She will not quite touch. "There is a cache the Maw keeps — Kallik's sin. If you drink it, you become what the hymns promised. Sybella already rides to keep anyone else from becoming."

"The Spire will not open for us. What opens it is at Red Maw. Go to the Maw and bring it back to the Threshold."`,
    choices: [
      {
        id: 'play',
        label: 'Play Vessel. Take the hymn as a map.',
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true, thaliaBelieves: true },
          add: { kallik_mark: 1 },
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'thresh:court',
          flash: 'She kisses the air beside your mouth. You have a heading and a lie that is now a leash.',
        },
      },
      {
        id: 'confess',
        label: 'Confess the cloth is a costume',
        tone: 'danger',
        effects: {
          flag: { hungerKnown: true, thaliaKnows: true },
          heat: { seekers: 3 },
          pressure: 3,
          ticks: 1,
          goto: 'thresh:hunter',
          flash: 'The gold on her cheeks cracks. Love turns to a verdict in one breath.',
        },
      },
      {
        id: 'sybella',
        label: 'Ask why Sybella hunts',
        effects: {
          flag: { sybellaNamed: true, heardSybellaRumor: true },
          ticks: 1,
          goto: 'thresh:thalia',
          flash:
            '"She was faithful before I was High Seeker. The Cartel and the Strays made her bitter. She would bury the road in sand before she let an enemy reach the Spire. She will reason with you. Then she will decide what the desert keeps."',
        },
      },
      { id: 'back', label: 'Bow and withdraw', tone: 'quiet', effects: { goto: 'thresh:court' } },
    ],
    intents: [
      {
        tags: ['kiss', 'love', 'comfort', 'hold'],
        reply: 'She flinches toward you and away. Holy is a no-touch rule until it isn\'t.',
        effects: { heat: { seekers: 1 } },
      },
      {
        tags: ['cache', 'kallik', 'maw', 'hunger'],
        reply: 'The hymn and the map are the same dirty sentence.',
        effects: { flag: { hungerKnown: true }, add: { kallik_mark: 1 } },
      },
    ],
  },
  {
    id: 'thresh:paddock',
    hubId: 'threshold',
    kind: 'place',
    title: 'Strider Paddock',
    body: `The Striders stand in the paddock. Too many joints. Hides with a resin shine. Mouths made for bits. The one you already mean to steal stamps when it smells the bit in your kit.

Oram is here more often than he is in the Court. He prefers the animals to the hymns. The animals do not ask to be poured full of sap.`,
    choices: [
      {
        id: 'oram',
        label: 'Talk to Oram',
        sub: 'He counts feed for the Striders. Ask him for a heading to Red Maw.',
        effects: { goto: 'thresh:oram', ticks: 1 },
      },
      {
        id: 'kaelen',
        label: 'The hymn-shade off the paddock',
        sub: 'Walk to Kaelen. He sells a false route. He will not ride the Strider for you.',
        effects: { travel: 'thresh:sift' },
      },
      {
        id: 'ready',
        label: 'Ready the stolen Strider',
        sub: 'Put the bit in. When you ride into the Hunger, it carries the first stretch: 2 Sap saved.',
        show: { all: [{ item: 'strider_bit' }, { flagUnset: 'striderReady' }] },
        effects: {
          flag: { striderReady: true },
          ticks: 1,
          flash:
            'Bit in. The Strider hates you in a workable way. When the Hunger starts, this beast will spend itself on your behalf.',
        },
      },
    ],
    intents: [
      {
        tags: ['ride', 'steal', 'mount', 'go'],
        reply: 'Not past the guard in daylight unless you want a hymn of knives. Ready it. Then pick your hour.',
        effects: {},
      },
      {
        tags: ['kaelen', 'sifter', 'merchant', 'pack', 'shadow'],
        reply: 'Cup-shadow. Same pack. You walk the fence-shade. He does not come to the bits.',
        effects: { travel: 'thresh:sift' },
      },
    ],
  },
  {
    id: 'thresh:oram',
    hubId: 'threshold',
    kind: 'talk',
    title: 'Oram',
    speaker: 'Oram',
    body: `Oram is counting feed for the Striders, and writing down heresies he has not reported.

"You're a better thief than a cup," he says, not looking up. "Good. Cups crack. Thieves reach Red Maw. Kallik buried a cache there. Sybella wants the person who can drink it and not die. I want the Striders alive. Those wants are about to collide."`,
    choices: [
      {
        id: 'map',
        label: 'Ask for a heading',
        show: { not: { item: 'oram_map' } },
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true },
          add: { cache_map: 1, kallik_mark: 1 },
          ticks: 1,
          goto: 'thresh:paddock',
          flash: 'He tears a corner off the feed-list. A crime. A kindness. Red Maw, in feed-pencil.',
        },
      },
      {
        id: 'have-map',
        label: 'Show him his own map',
        show: { item: 'oram_map' },
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true, oramKnows: true },
          ticks: 1,
          goto: 'thresh:paddock',
          flash: '"I know," he says. "I counted it leaving. Ride before Thalia finishes turning love into a net. The dagger was a poor idea and a good one."',
        },
      },
      {
        id: 'scrip',
        label: 'Lift Cartel scrip from his satchel',
        show: { flagUnset: 'oramScrip' },
        effects: {
          add: { scrip: 2 },
          flag: { oramScrip: true },
          heat: { seekers: 1 },
          ticks: 1,
          goto: 'thresh:paddock',
          flash: 'Scrip. Useless with Silas. Useful with a guard who still believes in paper.',
        },
      },
      { id: 'back', label: 'Leave him to the animals', tone: 'quiet', effects: { goto: 'thresh:paddock' } },
    ],
    intents: [
      {
        tags: ['help', 'warn', 'honest', 'confess'],
        reply: '"I know. I knew. I am still counting. Go before Thalia finishes turning love into a net."',
        effects: { flag: { hungerKnown: true } },
      },
    ],
  },
  {
    id: 'thresh:guard',
    hubId: 'threshold',
    kind: 'place',
    title: 'Guard Post',
    body: `The guard is sunburn and belief. His spear has never met the person who made it. Past him are the dunes, and the idea of leaving.`,
    choices: [
      {
        id: 'talk',
        label: 'Address the guard as a Vessel',
        sub: 'He was told to keep Vessels inside and strangers out.',
        effects: { goto: 'thresh:guard-talk', ticks: 1 },
      },
    ],
  },
  {
    id: 'thresh:guard-talk',
    hubId: 'threshold',
    kind: 'talk',
    title: 'Threshold Guard',
    speaker: 'Guard',
    body: `"Holy," he says, because he was told to. "The outer dunes are unclean. Sybella's skiff was seen at first heat. I am to keep cups inside and batteries out."`,
    choices: [
      {
        id: 'cloth',
        label: 'Let the cloth do the talking',
        show: { item: 'ceremonial_cloth' },
        effects: {
          flag: { guardBowed: true },
          ticks: 1,
          goto: 'thresh:guard',
          flash: 'He kneels badly. The path is not open. It is only confused. Confused is a start.',
        },
      },
      {
        id: 'dagger',
        label: 'Show the rusted dagger under the cloth',
        sub: 'Holy plus steel. Seeker Heat notices.',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          flag: { guardCut: true, guardBowed: true },
          heat: { seekers: 1 },
          ticks: 1,
          goto: 'thresh:guard',
          flash: 'He sees kitchen rust and a Vessel who packs it. He looks away with professional holiness. The path is confused and afraid.',
        },
      },
      {
        id: 'bribe',
        label: 'Press scrip into his palm',
        show: { item: 'scrip' },
        effects: {
          remove: { scrip: 1 },
          flag: { guardBought: true },
          ticks: 1,
          goto: 'thresh:guard',
          flash: 'Paper beats dogma if dogma is underpaid. He looks away with professional holiness.',
        },
      },
      {
        id: 'ask',
        label: 'Ask him what he knows of Kallik',
        effects: {
          flag: { hungerKnown: true },
          ticks: 1,
          goto: 'thresh:guard',
          flash:
            '"Smuggler. Buried sin at Red Maw. The hymns say the Vessel will retrieve it and become the desert\'s mouth. I think it is a hole full of knives. The hymn did not ask me to."',
        },
      },
      { id: 'back', label: 'Return to the Court', tone: 'quiet', effects: { goto: 'thresh:court' } },
    ],
    intents: [
      {
        tags: ['kill', 'stab', 'attack', 'shiv'],
        reply: 'A dead guard is a hymn with a siren. Not here.',
        effects: { pressure: 2, heat: { seekers: 2 } },
      },
    ],
  },
  {
    id: 'thresh:hunter',
    hubId: 'threshold',
    kind: 'story',
    title: 'The Cloth Fails',
    body: `The Court\'s chant stutters. Someone has used the word fraud like a knife.

Thalia\'s gold is ruined. The guard remembers he has a spear. Oram, traitor-kind, flicks his eyes at the paddock.

This is the hour a fake Vessel becomes Hunger or becomes a lesson.`,
    choices: [
      {
        id: 'ride',
        label: 'Take the Strider into Hunger',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: { startChapter: 'cache-run', goto: 'ch1:leave', heat: { seekers: 2 } },
      },
      {
        id: 'blind',
        label: 'Ride anyway — find the Maw by smell',
        tone: 'danger',
        show: { flagUnset: 'hungerKnown' },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
        },
      },
      {
        id: 'oram',
        label: 'Hide behind Oram\'s ledger',
        effects: {
          goto: 'thresh:paddock',
          ticks: 1,
          pressure: 2,
          flash: 'He puts a Strider between you and the spear. "Hour," he says. "Not two."',
        },
      },
    ],
  },
]

import type { Scene } from '../types'

const backYard = {
  id: 'back-yard',
  label: 'Back to the Bleed Yard',
  tone: 'quiet' as const,
  effects: { goto: 'camp:yard' },
}

export const campScenes: Scene[] = [
  {
    id: 'camp:yard',
    hubId: 'camp04',
    kind: 'place',
    title: 'Bleed Yard',
    body: `The Yard still stinks of cooked resin and unwashed iron. Vats tick as they cool. A line of prisoners scrape amber skin into buckets like it is nothing but work.

Camp-04 does not know you slipped the trench. Not yet. Jaxson Oil-Tooth is not in the line. That is either luck or a trap.

On the far wire, heat-haze makes a person out of nothing. The Hunger is a rumor until it isn't.`,
    variants: [
      {
        if: { flag: 'vatDripTaken' },
        mode: 'append',
        body: `The vat you robbed is quieter than the others. Guilt is a Cartel invention. Thirst is not.`,
      },
      {
        if: { pressureMin: 8 },
        mode: 'append',
        body: `Valerius has walked the Yard twice this hour. The camp is closing like a fist.`,
      },
    ],
    choices: [
      {
        id: 'vats',
        label: 'Search the cooling vats',
        sub: 'Drips hide in seams. So do eyes.',
        show: { flagUnset: 'vatDripTaken' },
        effects: { goto: 'camp:vats', ticks: 1, pressure: 1, sap: -1 },
      },
      {
        id: 'line',
        label: 'Fall into the scrape-line',
        sub: 'Look like you belong. Burn an hour.',
        effects: {
          ticks: 1,
          pressure: 1,
          sap: -1,
          heat: { cartel: -1 },
          flash:
            'You scrape. Nobody thanks you. The Cartel heat on your name cools a degree because a working prisoner is a solved prisoner.',
        },
      },
    ],
    intents: [
      {
        tags: ['steal', 'take', 'grab', 'drip', 'vat', 'sap'],
        show: { flagUnset: 'vatDripTaken' },
        reply: 'You angle toward the quiet vat. Hands remember how to be guilty.',
        effects: { goto: 'camp:vats', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        tags: ['jaxson', 'oil', 'tooth', 'lean'],
        reply: "Oil-Tooth's lean-to sits off the line, patched with vat-skin. He will want a reason.",
        effects: { goto: 'camp:lean' },
      },
    ],
  },
  {
    id: 'camp:vats',
    hubId: 'camp04',
    kind: 'story',
    title: 'Vat Seam',
    body: `The third vat leaks at a bolt the Cartel has not budgeted to replace. A Drop hangs there like a gold tooth.

Take it and you are a thief twice. Leave it and noon will take it anyway.`,
    choices: [
      {
        id: 'take',
        label: 'Pocket the Drop',
        effects: {
          add: { vial_drop: 1 },
          remove: { vial_empty: 1 },
          flag: { vatDripTaken: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'camp:yard',
          flash: 'Glass kisses glass. You have a Drop. The Yard has a story if anyone saw.',
        },
      },
      {
        id: 'leave',
        label: 'Leave it hanging',
        tone: 'quiet',
        effects: {
          flag: { vatDripTaken: true },
          goto: 'camp:yard',
          ticks: 1,
          flash: 'Mercy is not the word. You just do not want Valerius measuring your pockets today.',
        },
      },
    ],
  },
  {
    id: 'camp:cages',
    hubId: 'camp04',
    kind: 'place',
    title: 'Cage Row',
    body: `Sleeping cages. Each one a ribcage for a person. Yours still smells like the Bleed.

A bar on the third cage is loose enough to work. Jaxson stashes things here when the Yard gets religious about searches.`,
    choices: [
      {
        id: 'bar',
        label: 'Work the loose bar',
        show: { flagUnset: 'shivTaken' },
        effects: { goto: 'camp:shiv', ticks: 1, sap: -1 },
      },
      {
        id: 'stash',
        label: "Search Jaxson's stash",
        show: { all: [{ flag: 'jaxsonFavor' }, { flagUnset: 'jaxsonStash' }] },
        effects: {
          flag: { jaxsonStash: true, jaxsonPaid: true },
          add: { cache_map: 1, scrap: 1 },
          ticks: 1,
          sap: -1,
          goto: 'camp:cages',
          flash:
            "Under the pallet: a scratch-map that says RED MAW in a drunk's hand, and scrap enough to cut wire. You have paid him in risk.",
        },
      },
    ],
    intents: [
      {
        tags: ['sleep', 'lie', 'cage', 'hide'],
        reply: 'You fold into the cage. Rest is a rumor. The metal keeps your shape.',
        effects: { sap: -1, ticks: 1, pressure: 2 },
      },
      {
        tags: ['shiv', 'bar', 'weapon', 'pry'],
        show: { flagUnset: 'shivTaken' },
        reply: 'The bar complains, then agrees.',
        effects: { goto: 'camp:shiv', ticks: 1, sap: -1 },
      },
    ],
  },
  {
    id: 'camp:shiv',
    hubId: 'camp04',
    kind: 'story',
    title: 'Loose Bar',
    body: `The bar comes free with a sound you feel in your teeth. One end is a question. The other is an answer.`,
    choices: [
      {
        id: 'take',
        label: 'Keep it as a shiv',
        effects: {
          add: { shiv: 1 },
          flag: { shivTaken: true },
          goto: 'camp:cages',
          ticks: 1,
          flash: 'Weight in the sleeve. You are not safer. You are only armed.',
        },
      },
      {
        id: 'scrap',
        label: 'Break it down for scrap',
        effects: {
          add: { scrap: 2 },
          flag: { shivTaken: true },
          goto: 'camp:cages',
          ticks: 1,
          flash: 'Ugly metal for ugly trades. Kaelen on the Wire loves ugly.',
        },
      },
    ],
  },
  {
    id: 'camp:lean',
    hubId: 'camp04',
    kind: 'place',
    title: "Oil-Tooth's Lean-to",
    speaker: 'Jaxson Oil-Tooth',
    body: `Jaxson is built like a vat that learned to walk. One tooth is resin-gold from a year he will not explain. He does not look surprised to see you un-caged.

"Bleed-Cut," he says, like it is already your name. "Camp still thinks you're in the trench. I know a hole that thinks otherwise."`,
    variants: [
      {
        if: { flag: 'hungerKnown' },
        mode: 'replace',
        body: `Jaxson chews nothing and stares at the dunes beyond the wire.

"Kallik buried Drops at Red Maw and the Maw buried Kallik. Cache is still there if you can outrun a blonde on a skiff. She wants batteries that walk. You look like you learned walking the hard way."`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Sit and talk',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'rumor', 'dune'],
        reply: 'Jaxson grins with the gold tooth. He has been waiting to spend this story.',
        effects: { goto: 'camp:jaxson-cache', ticks: 1 },
      },
      {
        tags: ['valerius', 'overseer', 'tower', 'hound'],
        reply: 'You sit. The name Valerius does something ugly to the air.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['talk', 'ask', 'speak'],
        reply: 'He makes a space on the crate that is not quite hospitality.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:jaxson',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Jaxson Oil-Tooth',
    speaker: 'Jaxson Oil-Tooth',
    body: `"Valerius counts like a machine that hates fractions. Kaelen on the Wire sells fractions. Me, I sell the one rumor that still has meat on it."

He taps the lean-to pole. "You want a Drop, you want a way out, or you want the thing that's going to eat both?"`,
    choices: [
      {
        id: 'cache',
        label: "Ask about the rumor that has meat",
        effects: { goto: 'camp:jaxson-cache', ticks: 1 },
      },
      {
        id: 'drop',
        label: 'Ask him for a Drop',
        effects: { goto: 'camp:jaxson-drop', ticks: 1 },
      },
      {
        id: 'valerius',
        label: 'Ask about Valerius',
        effects: {
          ticks: 1,
          goto: 'camp:jaxson',
          flash:
            '"Overseer wants you back in a bucket. Also says a Seeker woman has been skiffing the outer dunes asking who can hold sap without dying. Blonde. Kohl ruined. Blindfold up like she got bored of holy." Jaxson spits resin. "I would not be her battery."',
          flag: { sybellaNamed: true },
        },
      },
      { id: 'leave', label: 'Leave him to his tooth', tone: 'quiet', effects: { goto: 'camp:lean' } },
    ],
    intents: [
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'red'],
        reply: 'He leans in. Gold tooth. Bad breath. True story.',
        effects: { goto: 'camp:jaxson-cache' },
      },
      {
        tags: ['kaelen', 'wire', 'escape', 'leave'],
        reply: '"Wire. Dusk. Bring scrap or Glints. He cuts holes for people who pay in things that are not prayers."',
        effects: { flag: { kaelenKnown: true }, flash: 'Kaelen. The Wire. Dusk if you can steal dusk.' },
      },
      {
        tags: ['valerius', 'overseer', 'tower', 'blonde', 'sybella', 'skiff'],
        reply: 'Jaxson spits resin and spends the name like it costs him.',
        effects: {
          ticks: 1,
          flag: { sybellaNamed: true },
          flash:
            '"Overseer wants you back in a bucket. Also says a Seeker woman has been skiffing the outer dunes asking who can hold sap without dying. Blonde. Kohl ruined. Blindfold up like she got bored of holy."',
        },
      },
      {
        tags: ['steal', 'pick', 'pocket', 'rob'],
        reply: 'His hand closes on your wrist without looking. "I like you. Do not make me unlike you."',
        effects: { heat: { strays: 1 }, pressure: 1 },
      },
    ],
  },
  {
    id: 'camp:jaxson-cache',
    hubId: 'camp04',
    kind: 'talk',
    title: "Kallik's Cache",
    speaker: 'Jaxson Oil-Tooth',
    body: `"Kallik ran Drops for the Cartel until he grew a conscience, which is a kind of tumor. He buried a cache at Red Maw — vials, Glints, a mark burned into tin. Then the Maw noticed him.

You want it, you walk Hunger. You delay, Valerius finishes counting, or the blonde on the skiff finishes choosing a battery. I can scratch you a heading. I want you to pull my stash from Cage Row so I'm not holding it when they shake the Yard."`,
    choices: [
      {
        id: 'yes',
        label: 'Take the heading. Owe him the stash.',
        effects: {
          flag: { hungerKnown: true, jaxsonFavor: true, sybellaNamed: true },
          add: { kallik_mark: 1 },
          ticks: 1,
          goto: 'camp:lean',
          flash: "Red Maw. Cache. Sybella. The camp suddenly has an outside.",
        },
      },
      {
        id: 'map',
        label: 'Pay in Glints for the scratch now',
        show: { itemMin: ['glints', 1] },
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true },
          remove: { glints: 1 },
          add: { cache_map: 1, kallik_mark: 1 },
          ticks: 1,
          goto: 'camp:lean',
          flash: 'He takes the Glint like it might hatch. You take a map that might be a suicide note.',
        },
      },
      { id: 'later', label: 'Not yet', tone: 'quiet', effects: { goto: 'camp:jaxson' } },
    ],
  },
  {
    id: 'camp:jaxson-drop',
    hubId: 'camp04',
    kind: 'talk',
    speaker: 'Jaxson Oil-Tooth',
    title: 'A Drop',
    body: `"I look like a charity?" He shows empty palms, then a vial in the palm that was not empty. "Favor first. Cage Row. My stash. Then this Drop thinks about changing pockets."`,
    choices: [
      {
        id: 'agree',
        label: 'Agree to pull the stash',
        effects: {
          flag: { jaxsonFavor: true },
          goto: 'camp:lean',
          flash: 'He hides the vial again. Trust, in Camp-04, is just delayed theft.',
        },
      },
      {
        id: 'paid',
        label: 'Remind him you already did',
        show: { all: [{ flag: 'jaxsonPaid' }, { flagUnset: 'jaxsonDropGiven' }] },
        effects: {
          add: { vial_drop: 1 },
          sap: 0,
          goto: 'camp:lean',
          flag: { jaxsonPaid: true, jaxsonDropGiven: true },
          flash: 'He flicks the Drop like it burns him. "Go be Hunger before Valerius writes your name in a book."',
        },
      },
      { id: 'no', label: 'Walk away thirsty', tone: 'quiet', effects: { goto: 'camp:lean' } },
    ],
  },
  {
    id: 'camp:tower',
    hubId: 'camp04',
    kind: 'place',
    title: 'Watchtower Drip',
    body: `The tower leaks shade and authority. Overseer Valerius stands in it like a nail stands in wood.

He is Cartel in the bones: clean cuffs, ruined patience, a ledger instead of a heart. If he has seen your empty cage, his face has not spent it yet.`,
    variants: [
      {
        if: { heatMin: ['cartel', 5] },
        mode: 'append',
        body: `His eyes snag on you. The ledger in his head turns a page.`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Approach Valerius',
        effects: { goto: 'camp:valerius', ticks: 1, heat: { cartel: 1 }, pressure: 1 },
      },
      {
        id: 'chip',
        label: "Palm a chip from the clerk's hook",
        show: { flagUnset: 'overseerChip' },
        effects: {
          add: { overseer_chip: 1 },
          flag: { overseerChip: true },
          heat: { cartel: 2 },
          ticks: 1,
          pressure: 2,
          flash: "A brass chip. Door-rights. If they count them before dusk, you will hear the counting.",
        },
      },
    ],
    intents: [
      {
        tags: ['talk', 'approach', 'valerius', 'overseer'],
        reply: 'You step into his shade. It is colder and worse.',
        effects: { goto: 'camp:valerius', ticks: 1, heat: { cartel: 1 } },
      },
    ],
  },
  {
    id: 'camp:valerius',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Overseer Valerius',
    speaker: 'Overseer Valerius',
    body: `"You are out of position," Valerius says, mild as boiled water. "The Bleed does not dismiss workers. If I write you down as escaped, Ironwood spends a Hound. If I write you down as useful, you scrape until your hands forget they were hands."

He waits. Men like him can afford waiting. You cannot.`,
    choices: [
      {
        id: 'useful',
        label: 'Play useful. Offer the line.',
        effects: {
          heat: { cartel: -1 },
          sap: -1,
          ticks: 1,
          goto: 'camp:tower',
          flash: 'He flicks you back toward the vats with two fingers. Useful is a cage that walks.',
        },
      },
      {
        id: 'bluff',
        label: 'Flash the overseer chip',
        show: { item: 'overseer_chip' },
        effects: {
          heat: { cartel: -2 },
          ticks: 1,
          goto: 'camp:tower',
          flash:
            'His mouth tightens. The chip is real. You are not. He lets the math sit unfinished. That is the kindest thing he has done all year.',
        },
      },
      {
        id: 'sybella',
        label: 'Ask who is skiffing the outer dunes',
        show: { flag: 'sybellaNamed' },
        effects: {
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'camp:tower',
          flash:
            '"Sybella." He says it like a stain. "Seeker-trained. Blindfold up. She is buying walking batteries — bodies that can hold sap and not crack. If she asks for you, I will sell you. If you run, run farther than Red Maw."',
        },
      },
      {
        id: 'shiv',
        label: 'Show the shiv. Make a point.',
        show: { item: 'shiv' },
        tone: 'danger',
        effects: {
          heat: { cartel: 3 },
          pressure: 3,
          ticks: 1,
          goto: 'camp:hunter',
          flash: 'Steel is a language. Valerius is fluent. He does not step back. He steps forward.',
        },
      },
      { id: 'back', label: 'Step out of his shade', tone: 'quiet', effects: { goto: 'camp:tower' } },
    ],
    intents: [
      {
        tags: ['lie', 'fake', 'bluff', 'chip'],
        reply: 'You try a clerk voice. It almost fits.',
        effects: { heat: { cartel: 1 }, pressure: 1 },
      },
      {
        tags: ['attack', 'stab', 'kill', 'threaten'],
        reply: 'The tower has a memory for violence. So does he.',
        effects: { goto: 'camp:hunter', heat: { cartel: 2 }, pressure: 2 },
      },
    ],
  },
  {
    id: 'camp:wire',
    hubId: 'camp04',
    kind: 'place',
    title: 'The Wire',
    body: `The perimeter. Beyond it the dunes begin to have opinions. Kaelen is sometimes a shadow here, sometimes a rumor, sometimes a man with cutters.

The Hunger lives past this line. So do Hounds.`,
    variants: [
      {
        if: { flag: 'wireCut' },
        mode: 'append',
        body: `A hole you paid for waits like a held breath.`,
      },
    ],
    choices: [
      {
        id: 'kaelen',
        label: 'Find Kaelen',
        effects: { goto: 'camp:kaelen', ticks: 1, pressure: 1 },
      },
      {
        id: 'look',
        label: 'Stare the dunes down',
        tone: 'quiet',
        effects: {
          ticks: 1,
          sap: -1,
          flash:
            'Red in the far haze. Maw-country. If Jaxson is right, a dead smuggler\'s fortune is sitting in it like bait.',
          flag: { sawMawHaze: true },
        },
      },
    ],
  },
  {
    id: 'camp:kaelen',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Kaelen',
    speaker: 'Kaelen',
    body: `Kaelen is all wrists and patience. Smuggler. Stray when it pays. Cartel when it doesn't.

"You're the trench story," he says. "I cut wire. I don't cut charity. Scrap, Glints, or you keep staring at sand until the sand stares back."`,
    choices: [
      {
        id: 'scrap',
        label: 'Pay two scrap for a hole',
        show: { itemMin: ['scrap', 2] },
        effects: {
          remove: { scrap: 2 },
          flag: { wireCut: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash: 'The cutters kiss. A person-sized disloyalty opens in Ironwood property.',
        },
      },
      {
        id: 'glint',
        label: 'Pay a Glint',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          flag: { wireCut: true, kaelenKnown: true },
          ticks: 1,
          goto: 'camp:wire',
          flash: 'He bites the Glint. Nods. The wire learns a new shape.',
        },
      },
      {
        id: 'rumor',
        label: 'Ask if he knows Kallik',
        effects: {
          flag: { hungerKnown: true },
          ticks: 1,
          goto: 'camp:kaelen',
          flash:
            '"Kallik owed me. Then he owed the Maw. Cache is real. Sybella is more real. You want a heading, talk to Oil-Tooth. You want a hole, pay."',
        },
      },
      { ...backYard, id: 'back', label: 'Leave the Wire' },
    ],
    intents: [
      {
        tags: ['cut', 'hole', 'wire', 'open', 'escape'],
        reply: 'He wiggles fingers. Pay first.',
        effects: { ticks: 1 },
      },
      {
        tags: ['trade', 'buy', 'sell', 'price'],
        reply: '"Two scrap. One Glint. I do not take scrip. Scrip is a Cartel lullaby."',
        effects: {},
      },
    ],
  },
  {
    id: 'camp:hunter',
    hubId: 'camp04',
    kind: 'story',
    title: 'Yard Sweep',
    speaker: 'Overseer Valerius',
    body: `Whistles. Boots. The Yard becomes a diagram.

Valerius does not run. He arrives. "The trench prisoner is upright. How optimistic." Behind him a Hound-handler checks a muzzle that is not for dogs.

If you still have a heading, this is the hour you spend it. If you don't, the camp will spend you.`,
    choices: [
      {
        id: 'run',
        label: 'Break for the dunes — Hunger, now',
        show: { flag: 'hungerKnown' },
        tone: 'hunger',
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 2 },
          pressure: 2,
        },
      },
      {
        id: 'blind',
        label: 'Run anyway. Heading or not.',
        show: { flagUnset: 'hungerKnown' },
        tone: 'danger',
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 2 },
        },
      },
      {
        id: 'line',
        label: 'Dive back into the scrape-line',
        effects: {
          sap: -1,
          ticks: 1,
          heat: { cartel: 1 },
          goto: 'camp:yard',
          flash: 'You become a back among backs. The Hound passes. Valerius writes something that is not your death. Yet.',
        },
      },
    ],
  },
  {
    id: 'camp:forced',
    hubId: 'camp04',
    kind: 'story',
    title: 'The Camp Closes',
    body: `Pressure has a sound. It is the vats, the whistles, the way nobody meets your eye.

You can keep playing prisoner until the Drop in you burns out. Or you can take Jaxson's ugly gift and become Hunger.`,
    choices: [
      {
        id: 'go',
        label: 'Take the Hunger',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: { startChapter: 'cache-run', goto: 'ch1:leave' },
      },
      {
        id: 'stay',
        label: 'Stay one more hour',
        tone: 'quiet',
        effects: { sap: -1, pressure: 2, ticks: 1, goto: 'camp:yard' },
      },
    ],
  },
]

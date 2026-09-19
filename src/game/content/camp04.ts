import type { Scene } from '../types'

export const campScenes: Scene[] = [
  {
    id: 'camp:yard',
    hubId: 'camp04',
    kind: 'place',
    title: 'Bleed Yard',
    body: `Ironwood Camp-04 does not quiet. Razor-wire. Steam-vents. Harvesters strip-mining petrified groves beyond the fence. Ironclad Skiff-Striders patrol like they own the heat.

The Yard stinks of cooked resin and unwashed iron. Vats tick toward the Great Bleed. A line of prisoners scrape amber skin into buckets like it is nothing but work.

Jaxson "Oil-Tooth" Vance is not in the line. He is either in the next bunk, or under a Strider. Kaelen the Sifter is a rumor at the Wire — merchant, not inside man.

Overseer Valerius is the looming shadow. First major victory: get out from under him.`,
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
      {
        id: 'wire',
        label: 'Walk the Wire',
        sub: 'Kaelen the Sifter sells rumors. Not rides.',
        effects: { goto: 'camp:wire', ticks: 1 },
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
        tags: ['jaxson', 'oil', 'tooth', 'lean', 'vance', 'bunk'],
        reply: "Oil-Tooth's stall sits off the line. The next bunk in the pens is his. He is the inside man — not Kaelen.",
        effects: { goto: 'camp:lean' },
      },
      {
        tags: ['kaelen', 'sifter', 'rumor', 'news', 'merchant', 'trade'],
        reply: 'Kaelen the Sifter works the Wire. Rumors. Drops. They do not hotwire Striders.',
        effects: { goto: 'camp:wire' },
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
        id: 'wrench',
        label: 'Wrench the bolt quieter',
        sub: 'Steel on steel. Less story for Valerius.',
        show: { all: [{ item: 'wrench' }, { flagUnset: 'wrenchVat' }] },
        effects: {
          add: { vial_drop: 1 },
          remove: { vial_empty: 1 },
          flag: { vatDripTaken: true, wrenchVat: true },
          ticks: 1,
          goto: 'camp:yard',
          flash: 'The wrench knows Camp-04 bolts. The Drop comes free without a hymn. Cartel Heat does not tick. Yet.',
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
    id: 'camp:vents',
    hubId: 'camp04',
    kind: 'place',
    title: 'Steam Vents',
    body: `West corridor. Pipes scream like a factory finding religion. The Great Bleed lives in these throats of iron.

One door back to the Yard. The other coughs toward the Skiff Bay. You cannot see the pens from here. You cannot see the dunes. Steam is a country with two roads, and Map is how you pick one.

Oil-Tooth named a west bolt at the Guard Station. That is a different throat. This one is only weather made of rust.`,
    variants: [
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `The station's scream leaks into this corridor. Patrol is late. The pipes know.`,
      },
    ],
    choices: [
      {
        id: 'listen',
        label: 'Listen to the pipes',
        tone: 'quiet',
        effects: {
          ticks: 1,
          sap: -1,
          flash:
            'Amber in the joints. Cartel in the rhythm. No heading. The Wire is still a walk from the bay, and the pens are a walk through the Yard.',
        },
      },
      {
        id: 'skim',
        label: 'Skim a drip from the scream',
        sub: 'Risky Drop. Cartel Heat. Not a crisis rescue.',
        tone: 'danger',
        show: { flagUnset: 'skim:camp:vents' },
        effects: {
          add: { vial_drop: 1 },
          remove: { vial_empty: 1 },
          sap: -1,
          heat: { cartel: 1 },
          pressure: 2,
          ticks: 1,
          flag: { 'skim:camp:vents': true, skimmed: true },
          flash:
            'You skim a Drop the pipes had not budgeted. Hands sticky. Heat ticks. Theft with a glass throat.',
        },
      },
    ],
    intents: [
      {
        tags: ['bay', 'skiff', 'strider', 'south'],
        reply: 'The bay is the next throat south-east. Open Map. Steam is not a teleport.',
        effects: { ticks: 1 },
      },
      {
        tags: ['yard', 'vat', 'pens'],
        reply: 'The Yard sits west-south of this scream. Map knows the road. The pens do not.',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:cages',
    hubId: 'camp04',
    kind: 'place',
    title: 'Holding Pens',
    body: `Holding pens. Each cage a ribcage for a penniless laborer. Yours still smells like the last Bleed. Cartel Scrip in the hem. Nothing else.

Bunk next to you: Jaxson "Oil-Tooth" Vance — burly, grease-stained, permanent smirk, cybernetic brass jaw catching the steam-light. Scorched welding leathers with corporate inventory tags. An oversized wrench when he is not hiding it.

He is the prison-break technical inside man. Reckless. Charismatic. Anti-authority. Humor as a shield. Observant of security weaknesses. He has skimmed Oasis Sap for a lifetime of repairing Ironclad Skiff-Striders.

Kaelen the Sifter is not here. Kaelen sells rumors at the Wire.`,
    choices: [
      {
        id: 'jaxson',
        label: 'Talk to Oil-Tooth in the next bunk',
        sub: 'Inside man. Hotwire. Not the rumor counter.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        id: 'bar',
        label: 'Work the loose bar',
        show: { flagUnset: 'shivTaken' },
        effects: { goto: 'camp:shiv', ticks: 1, sap: -1 },
      },
      {
        id: 'wrench-bar',
        label: 'Wrench the bar free',
        sub: 'Steel on a cage rib. Costs less sap.',
        show: { all: [{ item: 'wrench' }, { flagUnset: 'shivTaken' }] },
        effects: { goto: 'camp:shiv', ticks: 1, flag: { wrenchBar: true } },
      },
      {
        id: 'stash',
        label: "Search Jaxson's stash",
        show: { all: [{ flag: 'jaxsonFavor' }, { flagUnset: 'jaxsonStash' }] },
        effects: {
          flag: { jaxsonStash: true, jaxsonPaid: true },
          add: { scrap: 2 },
          ticks: 1,
          sap: -1,
          goto: 'camp:cages',
          flash:
            "Under the pallet: scrap enough to interest Kaelen the Sifter. Oil-Tooth does not sell headings. He sells a ride.",
        },
      },
      {
        id: 'yard',
        label: 'Walk the Bleed Yard',
        sub: 'Vats. Steam. The camp is bigger than one cage.',
        effects: { goto: 'camp:yard', ticks: 1, sap: -1 },
      },
      {
        id: 'station',
        label: 'Take the wrench to the guard station',
        sub: 'West steam-vent. That was the job.',
        tone: 'hunger',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        id: 'bay',
        label: 'The Strider bay. He is under a hull.',
        show: { flag: 'guardDown' },
        effects: { goto: 'camp:bay', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['jaxson', 'oil', 'tooth', 'vance', 'talk', 'hotwire'],
        reply: 'The brass jaw turns. Humor as a shield. He has been waiting for the Bleed.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['sleep', 'lie', 'cage', 'hide', 'bunk'],
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
          flash: 'Ugly metal for ugly trades. Kaelen the Sifter buys scrap. They sell Drops. They do not hotwire.',
        },
      },
    ],
  },
  {
    id: 'camp:lean',
    hubId: 'camp04',
    kind: 'place',
    title: "Oil-Tooth's Stall",
    speaker: 'Jaxson "Oil-Tooth" Vance',
    body: `Jaxson "Oil-Tooth" Vance is a burly grease-stained mechanic with a permanent smirk and a cybernetic brass jaw. Scorched welding leathers. Corporate inventory tags he never cut off. The oversized wrench lives in his fist like a second opinion.

Lifetime labor: repairing Ironclad Skiff-Striders. He has skimmed Oasis Sap the whole time. Reckless. Charismatic. Anti-authority. Humor as a shield. He watches security weaknesses the way other men watch the sky.

"Bleed-Cut," he says, like it is already your name. "Great Bleed is coming. You sabotage the guard station. I hotwire a Strider. That is the job. Kaelen the Sifter sells rumors at the Wire if you want news. They are not the inside man. I am."`,
    variants: [
      {
        if: { flag: 'striderHot' },
        mode: 'replace',
        body: `The smirk holds. The Strider is live. "Valerius can eat the dust-cloaks. We ride, or you linger like a fool. Kaelen's rumors still cost if you have not paid for a heading."`,
      },
      {
        if: { flag: 'jaxsonInside' },
        mode: 'append',
        body: `The wrench is yours now. Guard station. Then the bay. He will be under the hull.`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Take the inside job',
        effects: { goto: 'camp:jaxson', ticks: 1, pressure: 1 },
      },
      {
        id: 'station',
        label: 'West steam-vent. Sabotage the station.',
        sub: 'Oil-Tooth named the bolt. The wrench knows it.',
        tone: 'hunger',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        id: 'bay',
        label: 'The bay. He is under the hull.',
        show: { all: [{ flag: 'guardDown' }, { flagUnset: 'striderHot' }] },
        effects: { goto: 'camp:bay', ticks: 1 },
      },
      {
        id: 'ride',
        label: 'Ride the hotwired Strider into the dunes',
        tone: 'hunger',
        show: { all: [{ flag: 'striderHot' }, { flag: 'hungerKnown' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Oil-Tooth\'s stall.',
        },
      },
      {
        id: 'ride-blind',
        label: 'Ride anyway — no heading',
        tone: 'danger',
        show: { all: [{ flag: 'striderHot' }, { flagUnset: 'hungerKnown' }] },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash: 'You have a Strider and no rumor. Kaelen would call that bad inventory. The dunes do not care.',
        },
      },
    ],
    intents: [
      {
        tags: ['hotwire', 'strider', 'sabotage', 'guard', 'escape', 'break'],
        reply: 'The brass jaw grins. He has been waiting to spend this job.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'rumor', 'news'],
        reply: '"That is Kaelen the Sifter. Wire. Rumors for Glints. I hotwire. Do not mix the invoices."',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      {
        tags: ['valerius', 'overseer', 'tower', 'hound'],
        reply: 'You sit. The name Valerius does something ugly to the air.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['talk', 'ask', 'speak'],
        reply: 'He makes a space that is not quite hospitality.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:jaxson',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Jaxson "Oil-Tooth" Vance',
    speaker: 'Jaxson "Oil-Tooth" Vance',
    body: `"Valerius is the first major victory you have to overcome," Oil-Tooth says, smirking around the brass. "Imposing. Scarred. Reinforced iron plating over dust-cloaks. Steam-hissing shock baton. Cruel. Calculating. He hunts Sap thieves and unpermitted relic hoarders. Sadistic. Arrogant. Disciplined. Looming shadow. I have watched the guard station until I could draw it in grease.

Great Bleed hits, you sabotage that station. I hotwire an Ironclad Skiff-Strider. We leave the pens. You want rumors — Kallik, the Hunger, the blonde — that is Kaelen the Sifter at the Wire. They sell leads. I sell a ride."`,
    choices: [
      {
        id: 'inside',
        label: 'Take the inside job. Take the oversized wrench.',
        sub: 'Sabotage the guard station. He hotwires.',
        show: { flagUnset: 'jaxsonInside' },
        effects: {
          add: { wrench: 1 },
          flag: { jaxsonInside: true, wrenchPath: true, jaxsonFavor: true },
          ticks: 1,
          goto: 'camp:lean',
          flash:
            'The oversized wrench is heavier than pride. "West steam-vent. Bleed-hour. I will be under the hull. Do not make me wait. Humor is a shield. It is not a plan."',
        },
      },
      {
        id: 'have',
        label: 'Confirm the job',
        show: { flag: 'jaxsonInside' },
        effects: {
          ticks: 1,
          pressure: 1,
          goto: 'camp:lean',
          flash: '"Guard station. Then the bay. Valerius eats dust if we are fast. Kaelen still charges for news."',
        },
      },
      {
        id: 'vent',
        label: 'West steam-vent. Sabotage now.',
        sub: 'Guard station. That was the job.',
        tone: 'hunger',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        id: 'hull',
        label: 'The bay. He is under the hull.',
        show: { all: [{ flag: 'guardDown' }, { flagUnset: 'striderHot' }] },
        effects: { goto: 'camp:bay', ticks: 1 },
      },
      {
        id: 'ride',
        label: 'Ride the Strider. Leave Valerius behind.',
        tone: 'hunger',
        show: { all: [{ flag: 'striderHot' }, { flag: 'hungerKnown' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Oil-Tooth\'s stall.',
        },
      },
      {
        id: 'ride-blind',
        label: 'Ride anyway — no heading',
        tone: 'danger',
        show: { all: [{ flag: 'striderHot' }, { flagUnset: 'hungerKnown' }] },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash: 'You have a Strider and no rumor. The dunes do not care.',
        },
      },
      {
        id: 'drop',
        label: 'Ask him for a Drop of Oasis Sap',
        effects: { goto: 'camp:jaxson-drop', ticks: 1 },
      },
      {
        id: 'valerius',
        label: 'Ask how to beat Valerius',
        effects: {
          ticks: 1,
          pressure: 1,
          goto: 'camp:jaxson',
          flash:
            '"You do not beat him in a conversation. You sabotage his station, you steal his Strider, you put dunes between his shock baton and your back. First major victory. After that he is still a shadow. Shadows follow."',
        },
      },
      {
        id: 'kaelen',
        label: 'Ask where Kaelen sells rumors',
        effects: {
          flag: { kaelenKnown: true },
          ticks: 1,
          pressure: 1,
          goto: 'camp:jaxson',
          flash:
            '"The Wire. Jittery little Sifter. Dust-caked canvas. Pack full of vials. Glints buy intel. Scrap buys Drops. They play all sides. They are not me."',
        },
      },
      {
        id: 'leave',
        label: 'Leave him to the brass',
        tone: 'quiet',
        effects: { goto: 'camp:lean', ticks: 1, pressure: 1 },
      },
    ],
    intents: [
      {
        tags: ['hotwire', 'strider', 'sabotage', 'guard', 'inside', 'wrench'],
        reply: 'The brass jaw grins. Guard station. Then the bay.',
        effects: { goto: 'camp:jaxson' },
      },
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'red', 'rumor', 'news'],
        reply: '"Kaelen the Sifter. Wire. Rumors for Glints. I hotwire. Do not mix the invoices."',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      {
        tags: ['kaelen', 'wire', 'sifter'],
        reply: '"Wire. Jittery merchant. Pack of vials. They sell Drops and intel. They are not me."',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      {
        tags: ['valerius', 'overseer', 'tower'],
        reply: '"Sabotage his station. Steal his Strider. First major victory. Shadows follow."',
        effects: { ticks: 1 },
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
    title: 'Wrong Counter',
    speaker: 'Jaxson "Oil-Tooth" Vance',
    body: `"That heading is not my product," Oil-Tooth says. "Kaelen the Sifter sells rumors. Wire. Glints for intel. Scrap for Drops. I am the inside man. Guard station. Strider. Go mix your invoices with them."`,
    choices: [
      {
        id: 'wire',
        label: 'Find Kaelen the Sifter',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      { id: 'later', label: 'Back to the stall', tone: 'quiet', effects: { goto: 'camp:jaxson' } },
    ],
  },
  {
    id: 'camp:jaxson-drop',
    hubId: 'camp04',
    kind: 'talk',
    speaker: 'Jaxson "Oil-Tooth" Vance',
    title: 'A Drop',
    body: `"I skim Oasis Sap. Lifetime habit. I look like a charity?" The brass jaw ticks. "Sabotage first. Hotwire second. Then this Drop thinks about changing pockets. Kaelen will sell you one for scrap if you are impatient. Different invoice."`,
    choices: [
      {
        id: 'agree',
        label: 'Take the inside job first',
        show: { flagUnset: 'jaxsonInside' },
        effects: { goto: 'camp:jaxson' },
      },
      {
        id: 'station',
        label: 'Fine. The station first.',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        id: 'paid',
        label: 'The station is down. The Strider is live. Pay up.',
        show: { all: [{ flag: 'striderHot' }, { flagUnset: 'jaxsonDropGiven' }] },
        effects: {
          add: { vial_drop: 1 },
          goto: 'camp:lean',
          flag: { jaxsonDropGiven: true },
          flash: 'He flicks a skimmed Drop like it burns him. "Ride. Valerius is a shadow with a baton. Shadows follow."',
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
    body: `The tower leaks shade, steam, and authority. Overseer Valerius stands in it like a nail stands in wood.

Imposing. Scarred. Reinforced iron plating over dust-cloaks. A steam-hissing shock baton in the fist. Cruel. Calculating. Brutal enforcer protecting corporate interests. He hunts Sap thieves and unpermitted relic hoarders. Sadistic. Arrogant. Disciplined.

He is the immediate antagonist. The looming shadow. First major victory: get out from under him.`,
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
    body: `Valerius does not bother to raise the shock baton. Steam hisses in the grip anyway.

"You are out of position," he says, cruel and calculating, mild as boiled water. "I protect Ironwood's interests. I hunt Sap thieves and unpermitted relic hoarders. If I write you down as escaped, the company spends a Hound. If I write you down as useful, you scrape until your hands forget they were hands."

He waits. Sadistic. Arrogant. Disciplined. Men like him can afford waiting. You cannot. He is the looming shadow. First major victory: leave him behind.`,
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
        id: 'scrip',
        label: 'Put scrip on his ledger',
        sub: 'Paper that says you are still owned. Owned is safer than escaped.',
        show: { item: 'scrip' },
        effects: {
          remove: { scrip: 1 },
          heat: { cartel: -1 },
          ticks: 1,
          goto: 'camp:tower',
          flash:
            'He writes a line. You are a prisoner who paid. Cartel Heat cools a degree because owned people are solved people.',
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
            '"Sybella." He says it like a stain on corporate inventory. "If she asks for you, I will sell you. If you run, run farther than Red Maw. I hunt thieves. I do not hunt weather."',
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
    body: `The perimeter. Razor-wire. Steam-vents coughing. Beyond it the dunes begin to have opinions.

Kaelen the Sifter is here when profit says here: jittery diminutive merchant, dust-caked canvas, overstuffed pack, thick gloves. Primary early-game merchant. Also the rumor counter — if you ask. They are not the prison-break inside man. That is Oil-Tooth.

Ironclad Skiff-Striders patrol the other side of this line. The Hunger lives past it. So do Hounds.`,
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
        label: 'Find Kaelen the Sifter',
        sub: 'Merchant. Rumor counter. Not the inside man.',
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
            'Red in the far haze. Maw-country. If Kaelen sold you the heading, a dead smuggler\'s fortune is sitting in it like bait. If not, it is only weather.',
          flag: { sawMawHaze: true },
        },
      },
    ],
    intents: [
      {
        tags: ['kaelen', 'sifter', 'rumor', 'news', 'trade', 'merchant'],
        reply: 'The pack jitters. Cost. Profit. Ask.',
        effects: { goto: 'camp:kaelen', ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:guard',
    hubId: 'camp04',
    kind: 'place',
    title: 'Guard Station',
    body: `The guard station is Ironwood's fist: shock-baton racks, steam-vents, a clerk who loves a ledger more than a throat. Ironclad Skiff-Striders pass on patrol and make the wire hum.

The Great Bleed is a clock. Sabotage here, Oil-Tooth hotwires there. Valerius will take this personally. That is the point.`,
    variants: [
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `Steam screams from a vent that should not be open. The station is coughing. First cut in the looming shadow.`,
      },
      {
        if: { flag: 'bleedIntel' },
        mode: 'append',
        body: `Kaelen sold you a clock: west bolt, Bleed-hour. The Sifter does not work for Oil-Tooth. They sold a product.`,
      },
    ],
    choices: [
      {
        id: 'sabotage',
        label: 'Sabotage the west steam-vent',
        sub: 'Oil-Tooth\'s inside job. Wrench on a bolt Valerius loves.',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:sabotage', ticks: 1, sap: -1 },
      },
      {
        id: 'locked',
        label: 'Study the station',
        show: { flagUnset: 'jaxsonInside' },
        effects: {
          ticks: 1,
          sap: -1,
          flash:
            'Security weaknesses are Oil-Tooth\'s religion. Without the inside man you are only a penniless laborer staring at steam.',
        },
      },
    ],
  },
  {
    id: 'camp:sabotage',
    hubId: 'camp04',
    kind: 'story',
    title: 'Great Bleed',
    body: `The Great Bleed hits like a factory finding its scream. Vats weep. Guards look at amber, not at you.

Oil-Tooth named the west steam-vent. The oversized wrench knows the language.`,
    variants: [
      {
        if: { flag: 'bleedIntel' },
        mode: 'append',
        body: `Kaelen's clock is exact. You work in a gap Valerius has not budgeted.`,
      },
    ],
    choices: [
      {
        id: 'do',
        label: 'Crack the vent. Blind the station.',
        tone: 'danger',
        effects: {
          flag: { guardDown: true },
          add: { scrap: 1, ironwood_baton: 1 },
          heat: { cartel: 1 },
          pressure: 1,
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'Steam. Alarms that belong to the Bleed, not to you. Scrap in the palm. Shock Baton · Bite 4 from a clerk who will not need it. Equip it in Gear. Oil-Tooth will be under a hull.',
        },
      },
      {
        id: 'quiet',
        label: 'Crack it on Kaelen\'s clock',
        show: { flag: 'bleedIntel' },
        effects: {
          flag: { guardDown: true },
          add: { scrap: 1, ironwood_baton: 1 },
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'No extra hymn for Valerius. The Sifter sold timing. Shock Baton · Bite 4 from a clerk who was looking at vats. Equip it. Oil-Tooth still has to hotwire.',
        },
      },
    ],
  },
  {
    id: 'camp:bay',
    hubId: 'camp04',
    kind: 'place',
    title: 'Skiff Bay',
    body: `Ironclad Skiff-Striders stand like bad architecture — resin-sheen, too many joints, corporate inventory tags slapped on hulls Oil-Tooth has repaired until he could steal one in his sleep.

If he is your inside man, he is already under a hull with a smirk the brass jaw cannot hide.`,
    variants: [
      {
        if: { flag: 'striderHot' },
        mode: 'append',
        body: `One Strider ticks live. The dunes are a door.`,
      },
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `The station behind you is coughing steam. Patrol is late. That was the sabotage.`,
      },
    ],
    choices: [
      {
        id: 'hotwire',
        label: 'Cover Oil-Tooth while he hotwires',
        sub: 'He is the inside man. You are the extra pair of hands.',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'striderHot' }] },
        enable: { flag: 'guardDown' },
        locked: 'Sabotage the guard station first. That was the job.',
        effects: {
          flag: { striderHot: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'Welding leather. Oversized wrench. A Strider that believes it is still inventory. Oil-Tooth laughs once, a shield. "Ride, or linger, or go pay Kaelen for a heading. I did my half."',
        },
      },
      {
        id: 'ride',
        label: 'Ride the Strider into the dunes',
        tone: 'hunger',
        show: { all: [{ flag: 'striderHot' }, { flag: 'hungerKnown' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Oil-Tooth\'s stall.',
        },
      },
      {
        id: 'ride-blind',
        label: 'Ride anyway — no heading',
        tone: 'danger',
        show: { all: [{ flag: 'striderHot' }, { flagUnset: 'hungerKnown' }] },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          flash:
            'You have a Strider and no rumor. Kaelen would call that bad inventory. The dunes do not care.',
        },
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

Valerius does not run. He arrives, iron plating over dust-cloaks, shock baton hissing steam. "The penniless laborer is upright. How optimistic." Behind him a Hound-handler checks a muzzle that is not for dogs.

He hunts Sap thieves and unpermitted relic hoarders. You look like both. First major victory is leaving.`,
    choices: [
      {
        id: 'ride',
        label: 'Run for Oil-Tooth\'s hotwired Strider',
        show: { flag: 'striderHot' },
        tone: 'hunger',
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 2 },
          flag: { hungerKnown: true },
        },
      },
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
      {
        id: 'cloak',
        label: 'Let the cloak eat the glance',
        sub: 'Armor on. No extra hymn.',
        show: { slot: 'armor' },
        effects: {
          ticks: 1,
          goto: 'camp:yard',
          flash: 'Dust-cloth or hide — the glance slides. Valerius writes a different name. Gear gated that. No dice.',
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

You can keep playing prisoner until the Drop in you burns out. Or Oil-Tooth's Strider. Or Kaelen's heading. Do not mix the invoices — just spend them.`,
    choices: [
      {
        id: 'go',
        label: 'Take the Hunger',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: { startChapter: 'cache-run', goto: 'ch1:leave' },
      },
      {
        id: 'blind',
        label: 'Break the wire anyway',
        tone: 'danger',
        show: { flagUnset: 'hungerKnown' },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
        },
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

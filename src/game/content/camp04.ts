import { FENCE_HOLE_BACK, TAKE_INSIDE_JOB } from '../campJob'
import type { Scene } from '../types'
import {
  bayHandIntents,
  pikeBayChoices,
  pikeBayIntents,
  sarnBayChoices,
  sarnBayIntents,
  vetchBayChoices,
  vetchBayIntents,
} from './bayHands'

export const campScenes: Scene[] = [
  {
    id: 'camp:yard',
    hubId: 'camp04',
    kind: 'place',
    title: 'Bleed Yard',
    body: `Ironwood Camp-04 does not get quiet. Razor wire. Steam vents. Past the fence, harvesters strip petrified groves. Ironclad Skiff-Striders patrol like they own the heat.

The Bleed Yard stinks of cooked resin and unwashed iron. The vats are ticking toward the Great Bleed. A line of prisoners scrapes amber skin into buckets. To the Cartel, that is only work.

Overseer Valerius is the shadow over the Yard. Getting out from under him is the first thing you have to win.`,
    variants: [
      {
        if: { all: [{ flag: 'leftCamp' }, { flag: 'quietFence' }, { flagUnset: 'campLockdown' }] },
        mode: 'append',
        body: `You came back through the fence-hole. The camp is uneasy and quiet. Guards have not proved the hole. Jaxson's stash, if it is still in the vat-shadow, is a walk, not a war.`,
      },
      {
        if: { flag: 'campLockdown' },
        mode: 'append',
        body: `Lockdown still sits on the gates. If you are inside, you fought or you were dragged. Do not linger where a count can see your face.`,
      },
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
      {
        if: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        mode: 'append',
        body: `Kaelen sold you a seam: third vat's shadow. Unpermitted relics. The hoard is here, not at the Wire.`,
      },
    ],
    choices: [
      {
        id: 'relic',
        label: "Hunt Kaelen's vat-shadow hoard",
        sub: 'The third vat, in the shadow. You already walked here from the Wire.',
        show: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        effects: { goto: 'camp:relic', ticks: 1 },
      },
      {
        id: 'vats',
        label: 'Search the cooling vats',
        sub: 'Look for a Drop in the seams. Someone may see you. Costs sap.',
        show: { flagUnset: 'vatDripTaken' },
        effects: { goto: 'camp:vats', ticks: 1, pressure: 1, sap: -1 },
      },
      {
        id: 'line',
        label: 'Fall into the scrape-line',
        sub: 'Look like you belong. Costs sap. Cartel Heat drops, because a working prisoner looks solved.',
        effects: {
          ticks: 1,
          pressure: 1,
          sap: -1,
          heat: { cartel: -1 },
          flash:
            'You scrape amber with the line. Nobody thanks you. Cartel Heat drops, because a prisoner who is working looks like a solved problem.',
        },
      },
      {
        id: 'wire',
        label: 'Walk the Wire',
        sub: 'Kaelen the Sifter sells rumors at the Wire. He does not give you a ride.',
        effects: { goto: 'camp:wire', ticks: 1 },
      },
      {
        id: 'job',
        label: "Jaxson's inside job is still open",
        sub: 'Go to his stall. The job is the wrench and the west steam-vent. You can still see Kaelen first.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { goto: 'camp:lean', ticks: 1 },
      },
      {
        id: 'station',
        label: 'West steam-vent. Sabotage the guard station.',
        sub: 'Jaxson named the bolt. Walk to the Guard Station and sabotage it.',
        tone: 'hunger',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['relic', 'hoard', 'kaelen', 'vat-shadow', 'unpermitted'],
        show: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        reply: 'Third vat. Clerk mark that is not a permit. You walked the roads for this.',
        effects: { goto: 'camp:relic', ticks: 1 },
      },
      {
        tags: ['steal', 'take', 'grab', 'drip', 'vat', 'sap'],
        show: { flagUnset: 'vatDripTaken' },
        reply: 'You angle toward the quiet vat. Hands remember how to be guilty.',
        effects: { goto: 'camp:vats', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        tags: ['jaxson', 'lean', 'vance', 'bunk'],
        reply: "Jaxson's stall sits off the line. The next bunk in the pens is his. He hotwires. Kaelen works the Wire.",
        effects: { goto: 'camp:lean' },
      },
      {
        tags: ['kaelen', 'sifter', 'rumor', 'news', 'merchant', 'trade'],
        reply: 'Kaelen the Sifter works the Wire. Rumors. Drops.',
        effects: { goto: 'camp:wire' },
      },
      {
        tags: ['sabotage', 'inside', 'wrench', 'job'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
      },
      {
        tags: ['sabotage', 'guard', 'station', 'vent', 'bolt'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'The job is the west steam-vent on the guard station. You walk it.',
        effects: { goto: 'camp:guard', ticks: 1 },
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
    variants: [
      {
        if: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        mode: 'append',
        body: `Kaelen's clerk-mark crate sits in this same shadow. The relic hoard is a different job from the Drop.`,
      },
    ],
    choices: [
      {
        id: 'relic',
        label: "Hunt Kaelen's vat-shadow hoard",
        sub: 'The crate, not the drip.',
        show: { all: [{ flag: 'relicRumor' }, { flagUnset: 'relicTaken' }, { flagUnset: 'relicSeen' }] },
        effects: { goto: 'camp:relic', ticks: 1 },
      },
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
    body: `The west corridor. The pipes scream. The Great Bleed lives in this iron.

One door goes back toward the Bleed Yard. The other coughs toward Skiff Bay. You cannot see the pens from here, and you cannot see the dunes. Two roads. The Map is how you pick one.

Jaxson named a west bolt at the Guard Station. That is a different pipe. This corridor is only steam and rust.`,
    variants: [
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `The station's scream leaks into this corridor. Patrol is late. The pipes know.`,
      },
    ],
    choices: [
      {
        id: 'west',
        label: 'Take the west bolt',
        sub: 'It leads to the Guard Station. Not the dunes. Not the bay.',
        effects: {
          goto: 'camp:guard',
          ticks: 1,
          flash: 'West. The bolt opens on the Guard Station. Steam, then the count. The bay is the other throat.',
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
      {
        id: 'job',
        label: "Jaxson's inside job is still open",
        sub: 'This scream is weather. The west bolt is at the station.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { goto: 'camp:lean', ticks: 1 },
      },
      {
        id: 'station',
        label: 'The west bolt. Guard station.',
        sub: 'That is the job throat, not this weather.',
        tone: 'hunger',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:guard', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['listen', 'pipes', 'pipe', 'hear'],
        reply:
          'Amber in the joints. Cartel in the rhythm. No heading. The Wire is still a walk from the bay, and the pens are a walk through the Yard.',
        effects: { ticks: 1 },
      },
      {
        tags: ['bay', 'skiff', 'strider', 'south'],
        reply: 'Skiff Bay is the next road, south-east. Open the Map. The steam does not carry you there.',
        effects: { ticks: 1 },
      },
      {
        tags: ['yard', 'vat', 'pens'],
        reply: 'The Yard sits west-south of this scream. Map knows the road. The pens do not.',
        effects: { ticks: 1 },
      },
      {
        tags: ['sabotage', 'inside', 'wrench', 'job'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
      },
      {
        tags: ['sabotage', 'guard', 'station', 'bolt'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'The west bolt lives on the guard station, not in this corridor.',
        effects: { goto: 'camp:guard', ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:cages',
    hubId: 'camp04',
    kind: 'place',
    title: 'Holding Pens',
    body: `Holding pens. Each cage is a ribcage for a laborer with no money. Yours still smells like the last Bleed. Cartel scrip is hidden in your hem. Nothing else.

The bunk next to you is Jaxson Vance. He is burly and grease-stained, with a permanent smirk and a cybernetic brass jaw in the steam-light. Scorched welding leathers. Corporate tags he never cut off. An oversized wrench, when he is not hiding it.

He is the one who can break you out. He hotwires Ironclad Skiff-Striders, and he has skimmed Oasis Sap for as long as he has repaired them. The jokes are a shield. He watches the guards more closely than he lets on.

Kaelen the Sifter sells rumors at the Wire.`,
    choices: [
      {
        id: 'jaxson',
        label: 'Talk to Jaxson in the next bunk',
        sub: 'He hotwires the Striders. Kaelen, at the Wire, is the one who sells rumors.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        id: 'inside',
        label: 'Take the inside job. Take the oversized wrench.',
        sub: 'Sabotage the west steam-vent. He hotwires. Kaelen can still come first.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:cages' },
      },
      {
        id: 'bar',
        label: 'Work the loose bar',
        sub: 'Pry it out of the cage. Costs sap. You can keep it as a weapon or break it into scrap.',
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
            "Under the pallet: scrap enough to interest Kaelen the Sifter. Jaxson does not sell headings. He sells a ride.",
        },
      },
      {
        id: 'yard',
        label: 'Walk the Bleed Yard',
        sub: 'The vats and the steam are out there. Costs sap. The camp is bigger than this cage.',
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
        label: 'Skiff Bay. He is under a hull.',
        sub: 'The station is down. Jaxson is working a Strider at the bay.',
        show: { flag: 'guardDown' },
        effects: { goto: 'camp:bay', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['jaxson', 'vance', 'talk', 'hotwire'],
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
      {
        tags: ['sabotage', 'inside', 'wrench', 'job'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:cages' },
      },
      {
        tags: ['sabotage', 'guard', 'station', 'vent', 'bolt'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'West steam-vent. The wrench knows the walk.',
        effects: { goto: 'camp:guard', ticks: 1 },
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
          flash: 'Ugly metal for ugly trades. Kaelen the Sifter trades Drops for scrap.',
        },
      },
    ],
  },
  {
    id: 'camp:lean',
    hubId: 'camp04',
    kind: 'place',
    title: "Jaxson's Stall",
    speaker: 'Jaxson Vance',
    body: `The stall is hot metal and skimmed sap. The oversized wrench sits in his fist.

"Bleed-Cut," he says. "The Great Bleed is coming. You sabotage the Guard Station. I hotwire a Strider."`,
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
        id: 'inside',
        label: 'Take the inside job. Take the oversized wrench.',
        sub: 'Sabotage the guard station. He hotwires. You can still see Kaelen first.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
      },
      {
        id: 'talk',
        label: 'Talk to Jaxson',
        sub: 'The pitch. Valerius. The ride.',
        effects: { goto: 'camp:jaxson', ticks: 1, pressure: 1 },
      },
      {
        id: 'station',
        label: 'West steam-vent. Sabotage the station.',
        sub: 'Jaxson named the bolt. The wrench knows it.',
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
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Jaxson\'s stall.',
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
        tags: ['hotwire', 'strider', 'inside', 'wrench', 'job'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
      },
      {
        tags: ['sabotage', 'guard', 'station', 'vent', 'bolt', 'escape', 'break'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'The brass jaw grins. West steam-vent. Then the bay.',
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        tags: ['hotwire', 'strider', 'talk'],
        show: { flag: 'jaxsonInside' },
        reply: 'The brass jaw grins. He has been waiting to spend this job.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'rumor', 'news'],
        reply: '"That is Kaelen the Sifter. The Wire. Rumors for Glints. I hotwire. Do not mix the jobs."',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      {
        tags: ['valerius', 'overseer', 'tower', 'hound'],
        reply: 'You sit. The name Valerius does something ugly to the air.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
      {
        tags: ['ask', 'speak'],
        reply: 'He makes a space that is not quite hospitality.',
        effects: { goto: 'camp:jaxson', ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:jaxson',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Jaxson Vance',
    speaker: 'Jaxson Vance',
    body: `"Valerius is the first thing you have to get out from under," Jaxson says, smirking around the brass. "Tower. Baton. He hunts anyone skimming Sap. I have watched the guard station until I could draw it in grease.

Great Bleed hits, you sabotage that station. I hotwire a Strider. We leave the pens. Rumors are Kaelen, at the Wire."`,
    choices: [
      {
        id: 'inside',
        label: 'Take the inside job. Take the oversized wrench.',
        sub: 'Sabotage the guard station. He hotwires. Kaelen can still come first.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
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
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Jaxson\'s stall.',
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
        id: 'kaelen',
        label: 'Ask where Kaelen sells rumors',
        effects: {
          flag: { kaelenKnown: true },
          ticks: 1,
          pressure: 1,
          goto: 'camp:jaxson',
          flash:
            '"The Wire. Jittery little Sifter. Dust-caked canvas. Pack full of vials. Glints buy intel. Scrap buys Drops. He plays all sides. He is not me."',
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
        tags: ['beat valerius', 'beat him', 'how to beat', 'overseer'],
        reply:
          '"You do not beat him in a conversation. You sabotage his station, you steal his Strider, you put dunes between his shock baton and your back. First major victory. After that he is still a shadow. Shadows follow."',
        effects: { ticks: 1 },
      },
      {
        tags: ['hotwire', 'strider', 'inside', 'wrench', 'job'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
      },
      {
        tags: ['sabotage', 'guard', 'station', 'vent', 'bolt'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'The brass jaw grins. Guard station. Then the bay.',
        effects: { goto: 'camp:guard', ticks: 1 },
      },
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'red', 'rumor', 'news'],
        reply: '"Kaelen the Sifter. The Wire. Rumors for Glints. I hotwire. Do not mix the jobs."',
        effects: { flag: { kaelenKnown: true }, goto: 'camp:wire' },
      },
      {
        tags: ['kaelen', 'wire', 'sifter'],
        reply: '"Wire. Jittery merchant. Pack of vials. He sells Drops and intel. He is not me."',
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
        effects: { heat: { strays: 1 }, pressure: 1, flag: { cartelNotice: true } },
      },
    ],
  },
  {
    id: 'camp:jaxson-cache',
    hubId: 'camp04',
    kind: 'talk',
    title: 'Wrong Counter',
    speaker: 'Jaxson Vance',
    body: `"That heading is not my product," Jaxson says. "Kaelen the Sifter sells rumors. Wire. Glints for intel. Scrap for Drops. I hotwire. Guard station. Strider. Take the rumor to him."`,
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
    speaker: 'Jaxson Vance',
    title: 'A Drop',
    body: `"I skim Oasis Sap. Lifetime habit. I look like a charity?" The brass jaw ticks. "Sabotage the station first. I hotwire second. Then this Drop might change pockets. Kaelen will sell you one for scrap if you are impatient. That is a different job."`,
    choices: [
      {
        id: 'agree',
        label: 'Take the inside job first',
        show: { flagUnset: 'jaxsonInside' },
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:lean' },
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
    body: `The watchtower leaks shade, steam, and orders. Overseer Valerius stands in it the way a nail stands in wood. He is bald and scarred, with a steam baton in his fist. No dog.

Iron plating over a dust-cloak. The baton hisses steam. He hunts people who steal Oasis Sap, and people who hoard relics without a permit.`,
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
        sub: 'You step into his shade. Cartel Heat rises. He is the man who can spend a Hound on you.',
        effects: { goto: 'camp:valerius', ticks: 1, heat: { cartel: 1 }, pressure: 1 },
      },
      {
        id: 'chip',
        label: "Palm a chip from the clerk's hook",
        sub: 'A door-chip. Cartel Heat rises hard if the count comes due.',
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

"Escape, I will spend a Hound. The price will be your feet. Stay useful; scrape the line, until your hands forget they were hands. That will buy your life."`,
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
        show: { all: [{ item: 'overseer_chip' }, { flagUnset: 'chipBluff' }, { flagUnset: 'chipCaught' }] },
        effects: {
          ticks: 1,
          flag: { chipGamble: true },
          flash: 'You show the chip. The tower does not move.',
        },
      },
      {
        id: 'pass',
        label: 'Bargain a quiet pass out of camp',
        effects: {
          ticks: 1,
          heat: { cartel: 1 },
          flag: { quietPass: true, opposedHook: true },
          goto: 'camp:wire',
          flash:
            'He names a gap in the count. You take the wire. He says, almost idle, that the skiff-woman and he want different ends of you. A lever, if you live. You are not in the Yard. You are at the wire.',
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
          flash: 'Steel is a language. Valerius is fluent. He does not step back. He does not send you to the Yard. The baton hisses, and you are still in the tower, known.',
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
        reply: 'The tower has a memory for violence. So does he. You are still standing in it.',
        effects: { heat: { cartel: 2 }, pressure: 2, ticks: 1 },
      },
    ],
  },
  {
    id: 'camp:wire',
    hubId: 'camp04',
    kind: 'place',
    title: 'The Wire',
    body: `The perimeter. Razor wire. Steam vents coughing. Past the wire, the dunes start to have opinions.

Kaelen the Sifter is here when there is a profit in it: a jittery diminutive merchant in dust-caked canvas, with an overstuffed pack and thick gloves. He sells rumors and Drops of Oasis Sap.

Ironclad Skiff-Striders patrol the far side of this line. Red Maw is past it. So are the Hounds.`,
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
        sub: 'Rumors and Drops.',
        effects: { goto: 'camp:kaelen', ticks: 1, pressure: 1 },
      },
      FENCE_HOLE_BACK,
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
    body: `The Guard Station is Ironwood's fist. Racks of shock batons. Steam vents. A clerk who loves a ledger more than a throat. Ironclad Skiff-Striders pass on patrol and make the wire hum.

The Great Bleed is a clock. You sabotage the west steam-vent here. Jaxson hotwires a Strider at Skiff Bay. Overseer Valerius will take it personally. That is the point.`,
    variants: [
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `Steam screams from a vent that should not be open. The station is coughing. First cut in the looming shadow.`,
      },
      {
        if: { flag: 'bleedIntel' },
        mode: 'append',
        body: `Kaelen sold you a clock: west bolt, Bleed-hour.`,
      },
    ],
    choices: [
      {
        id: 'inside',
        label: 'Take Jaxson\'s inside job',
        sub: 'Take the wrench. You crack the west steam-vent. He still hotwires the Strider.',
        show: { flagUnset: 'jaxsonInside' },
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:guard' },
      },
      {
        id: 'sabotage',
        label: 'Sabotage the west steam-vent',
        sub: 'The job Jaxson gave you. The wrench on a bolt Valerius cares about. Costs sap.',
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        effects: { goto: 'camp:sabotage', ticks: 1, sap: -1 },
      },
    ],
    intents: [
      {
        tags: ['study', 'weakness', 'weaknesses', 'inspect'],
        show: { flagUnset: 'jaxsonInside' },
        reply: "Security weaknesses are Jaxson's religion. Take the job — here, or back at the stall — and the west bolt opens.",
        effects: { ticks: 1 },
      },
      {
        tags: ['inside', 'wrench', 'job', 'jaxson'],
        show: { flagUnset: 'jaxsonInside' },
        reply: TAKE_INSIDE_JOB.flash ?? '',
        effects: { ...TAKE_INSIDE_JOB, goto: 'camp:guard' },
      },
      {
        tags: ['sabotage', 'vent', 'bolt', 'crack', 'bleed'],
        show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
        reply: 'West steam-vent. The wrench knows the bolt.',
        effects: { goto: 'camp:sabotage', ticks: 1, sap: -1 },
      },
    ],
  },
  {
    id: 'camp:sabotage',
    hubId: 'camp04',
    kind: 'story',
    title: 'Great Bleed',
    body: `The Great Bleed hits. Vats weep. The west steam-vent is empty for a breath — patrol is on the wire, not on this bolt.

Quiet still risks a shout. Jaxson named this throat. The wrench knows the bolt.`,
    variants: [
      {
        if: { flag: 'ventPatrol' },
        mode: 'replace',
        body: `The Great Bleed hits. Vats weep. This bolt is not empty.

A vent patrol is in place: one clerk, shock baton, eyes on the joint. Unwatched is a lie. Scrap them, or leave the bolt alone.`,
      },
      {
        if: { flag: 'bleedIntel' },
        mode: 'append',
        body: `Kaelen's clock is exact. If the bolt is empty, you work in a gap Valerius has not budgeted.`,
      },
    ],
    choices: [
      {
        id: 'do',
        label: 'Crack the vent while they are gone',
        sub: 'Quiet work. The steam still sings your name.',
        tone: 'danger',
        show: { all: [{ flagUnset: 'ventPatrol' }, { flagUnset: 'bleedIntel' }] },
        effects: {
          flag: { guardDown: true },
          add: { scrap: 1, ironwood_baton: 1 },
          heat: { cartel: 1 },
          pressure: 1,
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'The bolt turns. Nobody is on it. The scream still puts you in the steam. Scrap. Shock Baton · Strike 4. Equip it. Jaxson is under a hull.',
        },
      },
      {
        id: 'quiet',
        label: 'Crack it on Kaelen\'s clock',
        sub: 'The gap you paid for. Less hymn. Still a risk if you linger.',
        show: { all: [{ flag: 'bleedIntel' }, { flagUnset: 'ventPatrol' }] },
        effects: {
          flag: { guardDown: true },
          add: { scrap: 1, ironwood_baton: 1 },
          pressure: 1,
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'The Sifter sold a gap. You take it. Shock Baton · Strike 4 from a clerk who was counting vats. Equip it. Jaxson still has to hotwire.',
        },
      },
      {
        id: 'scrap',
        label: 'Scrap the patrol off the bolt',
        sub: 'Short fight. Strike vs Shell. Then the vent.',
        tone: 'danger',
        show: { flag: 'ventPatrol' },
        effects: {
          unsetFlag: ['encounterDone', 'encounterClash', 'encounterFlash', 'encounterRound', 'encounterStall', 'hunterHere', 'hunterFrom'],
          flag: {
            encounterHere: true,
            encounterKind: 'patrol',
            encounterHp: 1,
          },
          ticks: 1,
          flash: 'The clerk turns. Baton up. This is a scrap, not a sermon.',
        },
      },
    ],
  },
  {
    id: 'camp:bay',
    hubId: 'camp04',
    kind: 'place',
    title: 'Skiff Bay',
    body: `You come in through the west gate. Four Skiff-Striders stand on repair cradles, each in its own bay under a tin roof. Cartel tags are still bolted to the hulls.

Pike is in the north bay on your left, working a leg of his skiff. Sarn stands beside his skiff in the east bay, straight ahead, counting bolts out loud. Vetch is in the south bay on your right, kneeling with a torch and welding a cracked skid. Jaxson's skiff stands in the center bay with nobody at it.

Ask nicely and you get a short answer. Reach for their stuff and you get a bolt thrown at you, or a shout.`,
    variants: [
      {
        if: { flag: 'striderHot' },
        mode: 'append',
        body: `Jaxson's skiff in the center bay is hotwired and ticking. The dunes are open if you ride it.`,
      },
      {
        if: { flag: 'guardDown' },
        mode: 'append',
        body: `Black smoke is still coming off the guard station behind you. Patrol is late.`,
      },
      {
        if: { all: [{ flag: 'jaxsonInside' }, { flag: 'guardDown' }, { flagUnset: 'striderHot' }] },
        mode: 'replace',
        body: `Black smoke is coming off the guard station behind you. Patrol is late.

Jaxson Vance is on his back under his skiff in the center bay, wrench in the joint, hotwiring it.

You are the lookout. "Cover me," he says. "Valerius eats dust if we are fast."

Pike, Sarn, and Vetch keep their heads down in their own bays.`,
      },
    ],
    choices: [
      {
        id: 'north-bay',
        label: 'Walk to Pike in the north bay',
        sub: 'On your left. He is working a leg of his skiff.',
        effects: { goto: 'camp:bay-pike', flag: { bayLooked: true } },
      },
      {
        id: 'east-bay',
        label: 'Walk to Sarn in the east bay',
        sub: 'Straight ahead. He counts bolts beside his skiff.',
        effects: { goto: 'camp:bay-sarn', flag: { bayLooked: true } },
      },
      {
        id: 'south-bay',
        label: 'Walk to Vetch in the south bay',
        sub: 'On your right. She is welding a cracked skid.',
        effects: { goto: 'camp:bay-vetch', flag: { bayLooked: true } },
      },
      {
        id: 'hotwire',
        label: 'Cover Jaxson while he hotwires',
        sub: 'He is the inside man. You are the extra pair of hands.',
        show: { all: [{ flag: 'jaxsonInside' }, { flag: 'guardDown' }, { flagUnset: 'striderHot' }] },
        effects: {
          flag: { striderHot: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'camp:bay',
          flash:
            'Welding leather. Oversized wrench. A Strider that believes it is still inventory. Jaxson laughs once, a shield. "Ride, or linger, or go pay Kaelen for a heading. I did my half."',
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
          flash: 'Camp-04 falls behind like a bad hymn. The wrench still smells like Jaxson\'s stall.',
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
    intents: bayHandIntents,
  },
  {
    id: 'camp:bay-pike',
    hubId: 'camp04',
    kind: 'place',
    title: "Pike's Bay",
    speaker: 'Pike',
    body: `Pike is bent over the front leg of his skiff, scraping resin out of the joint. He does not stop when you walk up.`,
    choices: pikeBayChoices,
    intents: pikeBayIntents,
  },
  {
    id: 'camp:bay-sarn',
    hubId: 'camp04',
    kind: 'place',
    title: "Sarn's Bay",
    speaker: 'Sarn',
    body: `Sarn stands at a crate in front of his skiff, turning bolts in his hands and counting them out loud. He keeps counting while you stand there.`,
    choices: sarnBayChoices,
    intents: sarnBayIntents,
  },
  {
    id: 'camp:bay-vetch',
    hubId: 'camp04',
    kind: 'place',
    title: "Vetch's Bay",
    speaker: 'Vetch',
    body: `Vetch kneels in front of her skiff with her mask down, welding a cracked skid on the ground. She keeps welding while you stand there.`,
    choices: vetchBayChoices,
    intents: vetchBayIntents,
  },
  {
    id: 'camp:gate',
    hubId: 'camp04',
    kind: 'story',
    title: 'Lockdown Gate',
    body: `The gates are counted. Sabotage is still in their teeth. A Hound-handler has the shock-leash out, amber-eyed hound at his heel.

Walking in is a fight, or a collar.`,
    choices: [
      {
        id: 'fight',
        label: 'Fight the gate',
        tone: 'danger',
        enable: { healthMin: 1 },
        locked: 'Too hurt to fight.',
        effects: {
          health: -2,
          heat: { cartel: 2 },
          flag: { gateForced: true, metHandler: true },
          goto: 'camp:yard',
          ticks: 1,
          flash: 'You hit the gate. The handler hits back. You are inside, bleeding, and counted. Health takes the bill.',
        },
      },
      {
        id: 'caught',
        label: 'Let them take you',
        effects: {
          heat: { cartel: 3 },
          flag: { gateCaught: true },
          goto: 'camp:yard',
          ticks: 1,
          flash: 'Caught. They drag you through. The lockdown writes your name again. You are in the Yard, and they know it.',
        },
      },
      {
        id: 'back',
        label: 'Stay outside',
        tone: 'quiet',
        effects: { flag: { leaveGate: true }, ticks: 1, flash: 'You stay off the count. The gate keeps its teeth.' },
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

Valerius does not run. He arrives, iron plating over dust-cloaks, shock baton hissing steam. "The penniless laborer is upright. How optimistic." Behind him a Hound-handler checks a muzzle.

He hunts Sap thieves and unpermitted relic hoarders. You look like both. First major victory is leaving.`,
    choices: [
      {
        id: 'ride',
        label: 'Run for Jaxson\'s hotwired Strider',
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
        id: 'hold',
        label: 'Hold your ground. Do not run the Yard.',
        tone: 'quiet',
        effects: {
          returnHunterFrom: true,
          unsetFlag: ['hunterHere', 'hunterFrom'],
          ticks: 1,
          flash: 'The sweep moves on. You are back where you were. The sweep does not move you.',
        },
      },
      {
        id: 'line',
        label: 'Dive back into the scrape-line',
        effects: {
          sap: -1,
          ticks: 1,
          heat: { cartel: 1 },
          unsetFlag: ['hunterHere', 'hunterFrom'],
          goto: 'camp:yard',
          flash: 'You become a back among backs. That choice is the Yard. The Hound passes. Valerius writes something that is not your death. Yet.',
        },
      },
      {
        id: 'cloak',
        label: 'Let the cloak eat the glance',
        sub: 'Armor on. Stay where you were.',
        show: { slot: 'armor' },
        effects: {
          returnHunterFrom: true,
          unsetFlag: ['hunterHere', 'hunterFrom'],
          ticks: 1,
          flash: 'The armor takes the glance. Gear gated that. You are not forced into the Yard.',
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

You can stay and scrape until the Drop in you burns out. Or take Jaxson's Strider. Or follow Kaelen's heading. Pick one job and spend it.`,
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

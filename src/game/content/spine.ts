import { WELL_SKIM_LOCKED } from '../scavenge'
import type { Scene } from '../types'
import { shadeHandChoices } from './shadeHands'

export const spineScenes: Scene[] = [
  {
    id: 'spine:ridge',
    hubId: 'spine',
    kind: 'place',
    title: 'Noon Spine',
    body: `The Bleached Spine is a ridge of bone-pale rock. Nothing casts a kind shadow. Your empty vial ticks against your ribs like a second, drier heart.

Down-slope: a tent the color of old teeth. Silas Vane sells shade by the minute. Farther, a well that has been an argument for thirty years. Hound tracks stitch the eastern wash — Cartel, or something wearing Cartel feet.`,
    variants: [
      {
        if: { sapMax: 2 },
        mode: 'append',
        body: `Your vision frays at the edges. You need a Drop before noon.`,
      },
      {
        if: { pressureMin: 8 },
        mode: 'append',
        body: `The Hound tracks are fresher than your spit. Someone is closing.`,
      },
    ],
    choices: [
      {
        id: 'scan',
        label: 'Read the wash for a heading',
        sub: 'Costs sap. You look east and south for the red haze of Red Maw.',
        effects: {
          ticks: 1,
          sap: -1,
          flag: { sawMawHaze: true },
          flash:
            'East-south, a bruise of red in the heat. Maw-country. People bury fortunes there because they think the Maw is a lock. It is a mouth.',
        },
      },
      {
        id: 'tip',
        label: "Follow Silas's tip",
        sub: 'A shade-cut. May wet the empty vial. Costs no walk if you already paid him.',
        show: { all: [{ item: 'silas_tip' }, { flagUnset: 'silasCutUsed' }] },
        effects: { goto: 'spine:tip', ticks: 1 },
      },
      {
        id: 'shade',
        label: "Walk to Silas's tent",
        sub: 'Shade is a country. He sells it by the minute.',
        effects: { goto: 'spine:shade', ticks: 1 },
      },
      {
        id: 'well',
        label: 'Walk the dry well',
        sub: 'Costs sap. The well has been dry for years. People carve warnings in the stone.',
        effects: { goto: 'spine:well', ticks: 1, sap: -1 },
      },
      {
        id: 'hunger',
        label: 'Walk the Hunger toward Red Maw',
        sub: 'You have a heading. Noon will not get kinder.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'You spend the noon on a direction. The Spine lets you go like a debt it can collect later.',
        },
      },
    ],
    intents: [
      {
        tags: ['silas', 'shade', 'tent', 'vane', 'tip'],
        reply: 'Shade is a country. You walk toward its border.',
        effects: { goto: 'spine:shade' },
      },
      {
        tags: ['well', 'water', 'drink'],
        reply: 'The well is a rumor of water. You go anyway.',
        effects: { goto: 'spine:well', ticks: 1 },
      },
    ],
  },
  {
    id: 'spine:tip',
    hubId: 'spine',
    kind: 'story',
    title: "Silas's Cut",
    body: `The scratch leads under a rib of rock the noon pretends not to own. Shade. A smear of sap in a crack — not a Drop, a lie that still wets the tongue.

The Hunger is a red bruise east-south. You could fill the empty vial with this smear and call it a first Drop, or you could save the tip for a later spend.`,
    choices: [
      {
        id: 'fill',
        label: 'Fill the empty vial',
        sub: 'A smear, not a honest Drop. It will still keep you standing.',
        show: { item: 'vial_empty' },
        effects: {
          remove: { vial_empty: 1 },
          add: { vial_drop: 1 },
          sap: 2,
          flag: { firstDrop: true, silasCutUsed: true },
          ticks: 1,
          goto: 'spine:ridge',
          flash: 'The glass stops ticking. First Drop, stolen from a crack Silas already sold. The tip is still in your palm.',
        },
      },
      {
        id: 'lick',
        label: 'Lick the smear. Leave the vial empty.',
        show: { flagUnset: 'silasSmear' },
        effects: {
          sap: 1,
          flag: { silasCutUsed: true, silasSmear: true },
          ticks: 1,
          goto: 'spine:ridge',
          flash: 'A taste. Not a future. The empty vial still argues. The tip is still spendable.',
        },
      },
      {
        id: 'back',
        label: 'Back to the Spine',
        tone: 'quiet',
        effects: { goto: 'spine:ridge', flag: { silasCutUsed: true } },
      },
      {
        id: 'hunger',
        label: 'The cut already points at the Maw. Walk it.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          flag: { silasCutUsed: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'The smear is behind you. The bruise east-south is not.',
        },
      },
    ],
  },
  {
    id: 'spine:shade',
    hubId: 'spine',
    kind: 'place',
    title: "Silas's Shade",
    speaker: 'Silas Vane',
    body: `Silas Vane is older than the well's disappointment. One eye is milk. The other is counting what you owe. The tent smells of resin-chew and wool that has never been wet.

"Noon-Empty," he says. That is what the Spine already calls you. He looks at the brand on your face and does not ask about it. "I trade with anyone who pays. That mark does not change the price. Shade is not free. Talk is not free. Drops, salve, and a little steel are on the shelf."

Two Strays share the shade. A man with amber sealed over his mouth sits where the canvas runs out. A woman with one hand sifts sand by the tent pole. Everyone else in the shade has turned their back to you.`,
    choices: [
      {
        id: 'talk',
        label: 'Sit in the expensive shade',
        sub: 'You pay for the minute by sitting down to talk. He still charges for a Drop.',
        effects: { goto: 'spine:silas', ticks: 1 },
      },
      {
        id: 'hunger',
        label: 'Leave the shade. Walk the Hunger.',
        sub: 'Red Maw. Kallik. The blonde on the skiff.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'Silas does not bless the road. Shade ends. The wash begins.',
        },
      },
      // Walk-up Strays in the shade. Empty until shadeHands.ts goes live.
      ...shadeHandChoices(),
    ],
  },
  {
    id: 'spine:silas',
    hubId: 'spine',
    kind: 'talk',
    title: 'Silas Vane',
    speaker: 'Silas Vane',
    body: `He pours nothing into a cup and drinks it with ceremony.

"Cartel Hounds on the east wash. Seeker skiff on the south wind — blonde, kohl like a bruise, blindfold up, hunting batteries that walk. And you, with a vial that sounds empty even when you don't shake it."`,
    choices: [
      {
        id: 'mercy',
        label: 'Tell him you will die at noon',
        show: { all: [{ flagUnset: 'silasMercy' }, { sapMax: 3 }] },
        effects: {
          add: { vial_drop: 1 },
          flag: { firstDrop: true, silasMercy: true, silasGave: true, silasOwed: true, silasOwedDrop: true },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'spine:shade',
          flash:
            '"Once," Silas says. "Because the Spine is uglier when it is a graveyard. You owe the rumor. Kallik. Red Maw. Go be a problem somewhere else."',
        },
      },
      {
        id: 'cache',
        label: 'Ask what people bury at Red Maw',
        effects: { goto: 'spine:silas-cache', ticks: 1 },
      },
      {
        id: 'who',
        label: 'Ask who will talk to you',
        show: { flagUnset: 'korvanNamed' },
        effects: {
          flag: { korvanNamed: true },
          ticks: 1,
          flash:
            'Silas looks at the brand, then at the back of the tent. "On this ridge? Korvan. Amber on his face. He sits where the canvas runs out. He talks to anyone the Strays turned away, and he trades what he knows for water and scrap."',
          goto: 'spine:silas',
        },
      },
      {
        id: 'leave',
        label: 'Step back into noon',
        tone: 'quiet',
        effects: { goto: 'spine:shade' },
      },
      {
        id: 'hunger',
        label: 'Walk the Hunger toward Red Maw',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'Silas watches you spend noon like coin. He does not refund shade.',
        },
      },
    ],
    intents: [
      {
        tags: ['cache', 'kallik', 'maw', 'hunger', 'bury'],
        reply: 'Silas laughs without humor, which is the only way he laughs.',
        effects: { goto: 'spine:silas-cache' },
      },
      {
        tags: ['steal', 'rob', 'take', 'grab'],
        reply: 'The milk eye tracks you. "I have buried men for less, and I am tired. Do not make me less tired."',
        effects: { heat: { strays: 1 }, pressure: 1 },
      },
    ],
  },
  {
    id: 'spine:silas-drop',
    hubId: 'spine',
    kind: 'talk',
    speaker: 'Silas Vane',
    title: 'First Drop',
    body: `"A Drop for a Glint. Or for scrap enough to patch a tent. Or for a story I don't already own. Buy. Sell. I do not take Cartel scrip. Scrip tastes like a leash."`,
    choices: [
      {
        id: 'mercy',
        label: 'Tell him you will die at noon',
        show: { all: [{ flagUnset: 'silasMercy' }, { sapMax: 3 }] },
        effects: {
          add: { vial_drop: 1 },
          flag: { firstDrop: true, silasMercy: true, silasGave: true, silasOwed: true, silasOwedDrop: true },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'spine:shade',
          flash:
            '"Once," Silas says. "Because the Spine is uglier when it is a graveyard. You owe the rumor. Kallik. Red Maw. Go be a problem somewhere else."',
        },
      },
      { id: 'no', label: 'Keep your poverty', tone: 'quiet', effects: { goto: 'spine:silas' } },
    ],
  },
  {
    id: 'spine:silas-cache',
    hubId: 'spine',
    kind: 'talk',
    speaker: 'Silas Vane',
    title: "Kallik's Hole",
    body: `"Kallik thought the Maw was a lock. Buried Drops, Glints, a tin mark. He carved a nine-tooth gear on the second rib from the jaw and never came back up. Cache is still there. So is Sybella. She wants whoever the sand should not have let walk. You have the empty look of someone who might qualify.

A heading costs a Glint. Or I put it on your tab, and the Spine hears that you owe me."`,
    choices: [
      {
        id: 'pay',
        label: 'Pay a Glint for the heading',
        sub: 'Costs 1 Glint. Nobody hears about it.',
        enable: { item: 'glints' },
        locked: 'Need 1 Glint',
        effects: {
          pay: { glints: 1 },
          flag: { hungerKnown: true, sybellaNamed: true, silasHeadingPaid: true },
          add: { kallik_mark: 1 },
          ticks: 1,
          goto: 'spine:shade',
          flash: 'Red Maw. Cache. A blonde on a skiff. The Spine suddenly has a direction besides down.',
        },
      },
      {
        id: 'tab',
        label: 'Put the heading on his tab',
        sub: 'Silas will want it back. Stray Heat rises, and the Strays start asking about you.',
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true, silasOwed: true, silasOwedHeading: true },
          heat: { strays: 1 },
          add: { kallik_mark: 1 },
          ticks: 1,
          goto: 'spine:shade',
          flash: 'Silas scratches the heading into your palm. "On the tab," he says. "Paid later is still paid." Stray Heat rises.',
        },
      },
      { id: 'later', label: 'Not while the vial is this dry', tone: 'quiet', effects: { goto: 'spine:silas' } },
    ],
  },
  {
    id: 'spine:well',
    hubId: 'spine',
    kind: 'place',
    title: 'Dry Well',
    body: `A circle of stones and a throat of dust. Someone carved CACHE IS BAIT into a brick. The letters are newer than the brick.

You can lower a hope into it. There is no bucket here that still believes in water.`,
    choices: [
      {
        id: 'skim',
        label: 'Scrape a Drop out of the well-throat',
        sub: 'The resin is hard. Costs sap. Stray Heat rises, and the Strays notice the theft.',
        tone: 'danger',
        show: { flagUnset: 'skim:spine:well' },
        enable: { slot: 'weapon' },
        locked: WELL_SKIM_LOCKED,
        effects: {
          add: { vial_drop: 1 },
          remove: { vial_empty: 1 },
          sap: -1,
          heat: { strays: 1 },
          pressure: 2,
          ticks: 1,
          flag: { 'skim:spine:well': true, skimmed: true, strayNotice: true },
          flash: 'You scrape resin off the inside of the well-throat until a Drop runs into the glass. Stray Heat rises.',
        },
      },
      {
        id: 'search',
        label: 'Search the brickwork',
        sub: 'Costs sap. A Glint and a twist of scrap, if someone hid them here.',
        show: { flagUnset: 'wellScrap' },
        effects: {
          add: { scrap: 1, glints: 1 },
          flag: { wellScrap: true },
          ticks: 1,
          sap: -1,
          goto: 'spine:well',
          flash: 'A Glint wedged like a tooth. Scrap wire. Someone hid them here and did not come back for them.',
        },
      },
      {
        id: 'hunger',
        label: 'The brick says CACHE IS BAIT. Walk anyway.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'Bait is still a heading. You spend the well\'s warning as a road.',
        },
      },
    ],
    intents: [
      {
        tags: ['climb', 'down', 'descend', 'rope'],
        reply: 'The well eats a stone you kick. It does not send a Drop back. Some mouths only swallow.',
        effects: { sap: -1, ticks: 1, pressure: 1 },
      },
    ],
  },
  {
    id: 'spine:hound',
    hubId: 'spine',
    kind: 'place',
    title: 'Hound Sign',
    body: `Prints in the dust. Shard-Hounds are made by the Cartel, with resin jaws, and they stay loyal to whoever holds the chip.

Overseer Valerius has come out from Ironwood in a dust coat. He walks behind the Hound, following its prints. He is looking for a Cartel deserter who hides somewhere in this wash. When he sees you, he looks at you the way he looks at loose property.`,
    choices: [
      {
        id: 'talk',
        label: 'Let him see you seeing him',
        sub: 'You step into his view. Cartel Heat rises.',
        effects: { goto: 'spine:valerius', ticks: 1, heat: { cartel: 1 }, pressure: 1 },
      },
      {
        id: 'tooth',
        label: 'Pry a shard from an old kill',
        sub: 'Costs sap. You pocket a spent shard worth a Glint. Cartel Heat rises.',
        show: { flagUnset: 'houndTooth' },
        effects: {
          add: { glints: 1 },
          flag: { houndTooth: true },
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flash: 'A spent shard sells as a Glint if you lie with your whole mouth. You pocket it.',
        },
      },
      {
        id: 'cut',
        label: 'Meet the Hound with equipped steel',
        sub: 'Your weapon is equipped. You take Hound Hide, Shell 4. Cartel Heat rises.',
        show: { all: [{ slot: 'weapon' }, { flagUnset: 'hideWrap' }] },
        effects: {
          add: { hide_wrap: 1 },
          flag: { hideWrap: true, houndCut: true },
          ticks: 1,
          heat: { cartel: 1 },
          goto: 'spine:hound',
          flash:
            'Resin jaw, then silence. Hound Hide · Shell 4 still smells like Cartel loyalty. Equip it in Gear. Valerius will count this.',
        },
      },
      {
        id: 'boots',
        label: 'Follow the boot-prints that go the other way',
        sub: 'One set of boots walks away from the Hound sign, toward a slab of rock.',
        effects: { goto: 'spine:corvin', ticks: 1 },
      },
      {
        id: 'hunger',
        label: 'Leave the prints. Walk toward Red Maw.',
        sub: 'You leave the tracks. Cartel Heat still rises.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          ticks: 1,
          flash: 'The tracks stay. You do not.',
        },
      },
    ],
  },
  {
    id: 'spine:valerius',
    hubId: 'spine',
    kind: 'talk',
    title: 'Overseer Valerius',
    speaker: 'Valerius',
    body: `"Outcast," he says, almost kind. "Ironwood still pays for returned property. You are a loose Drop. I can cork you or I can point you at the woman on the skiff. She pays better than bounties. She pays in not-dying."`,
    choices: [
      {
        id: 'refuse',
        label: 'Refuse the cork',
        effects: {
          heat: { cartel: 2 },
          pressure: 2,
          ticks: 1,
          goto: 'spine:hound',
          flash: 'He does not chase. Hounds that chase too early miss the evening. You feel evening coming anyway.',
        },
      },
      {
        id: 'ask',
        label: 'Ask about the woman on the skiff',
        effects: {
          flag: { sybellaNamed: true, hungerKnown: true },
          ticks: 1,
          goto: 'spine:hound',
          flash:
            '"Sybella. Wants walking amber. Red Maw is her current church. If you go, go useful or go buried." He almost smiles. "Ironwood will be behind you either way."',
        },
      },
      { id: 'back', label: 'Back onto the ridge', tone: 'quiet', effects: { goto: 'spine:ridge' } },
      {
        id: 'hunger',
        label: 'Take the woman on the skiff as a heading',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          heat: { cartel: 1 },
          ticks: 1,
          flash: 'He files you as eastbound. Hounds that chase too early miss the evening. You do not wait for evening.',
        },
      },
    ],
    intents: [
      {
        tags: ['attack', 'run', 'flee', 'hide'],
        reply: 'He watches you choose fear. He files it.',
        effects: { pressure: 2, heat: { cartel: 1 }, goto: 'spine:hound' },
      },
    ],
  },
  {
    id: 'spine:hunter',
    hubId: 'spine',
    kind: 'story',
    title: 'Hunted Ground',
    body: `Someone on the Spine has your name. The Strays who turned their backs on you are watching this stretch of ridge now, and the one who comes for you will not be the last.

You can run east, or get back under Silas's canvas.`,
    choices: [
      {
        id: 'east',
        label: 'Take the Hunger east',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: { startChapter: 'cache-run', goto: 'ch1:leave', heat: { cartel: 1 } },
      },
      {
        id: 'blind',
        label: 'Run east anyway',
        tone: 'danger',
        show: { flagUnset: 'hungerKnown' },
        effects: {
          flag: { hungerKnown: true, cacheBlind: true },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
        },
      },
      {
        id: 'silas',
        label: 'Break for Silas\'s tent',
        effects: {
          goto: 'spine:shade',
          ticks: 1,
          sap: -1,
          pressure: 1,
          flash: 'You get under the canvas. Whoever was coming for you stops at the edge of the shade.',
        },
      },
    ],
  },
  {
    id: 'spine:corvin',
    hubId: 'spine',
    kind: 'talk',
    title: 'Corvin Pryce',
    speaker: 'Corvin Pryce',
    body: `Behind a slab of bone-pale rock, out of sight of the Hound prints, a young man sits in a Cartel security coat turned inside out. The Ironwood patch has been cut off the shoulder. He carries no rifle. His hands shake when he hears you, then go still when he sees your face.

He looks at the brand. He does not turn away.

"I'm Corvin," he says. "I don't ask what that mark is for. I guarded the Cartel's ironwood harvesters out by the Gilded Hollows. Dune-Stray families came to siphon sap from the cut trees, and the Cartel shot them for it. When they ordered me to fire on the families, I dropped my rifle and walked into the deep sand. The Cartel hunts me for that. So do the Seekers.

"I know every trap on the dry ford south of here. I use that to keep Strays alive. It doesn't pay back what I watched, but it's what I have."`,
    variants: [
      {
        if: { flag: 'corvinHelped' },
        mode: 'replace',
        body: `Corvin is behind the same slab, coat inside out, watching the wash.

"When you walk east, find me at the dry ford," he says. "I'll take you past the traps. If you go down on this ridge, I'll come get you."`,
      },
    ],
    choices: [
      {
        id: 'water',
        label: 'Give him a Drop',
        sub: 'Costs 1 Drop. He has not had water today.',
        show: { flagUnset: 'corvinHelped' },
        enable: { item: 'vial_drop' },
        locked: 'Need 1 Drop',
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
          flag: { corvinHelped: true, corvinWater: true },
          ticks: 1,
          flash:
            'He drinks it slowly, like he forgot how. "Thank you. When you walk east, find me at the dry ford and I\'ll take you past the traps. If you go down on this ridge, I\'ll come get you."',
        },
      },
      {
        id: 'sweep',
        label: 'Sweep his boot-prints out of the wash',
        sub: 'Costs sap. Cartel Heat rises when the Hounds smell you on his trail.',
        show: { flagUnset: 'corvinHelped' },
        effects: {
          sap: -1,
          heat: { cartel: 1 },
          flag: { corvinHelped: true, corvinSwept: true },
          ticks: 1,
          flash:
            'You drag a strip of canvas over his prints until the wash shows only Hound sign. Cartel Heat rises. Corvin nods. "When you walk east, find me at the dry ford. I\'ll take you past the traps. If you go down on this ridge, I\'ll come get you."',
        },
      },
      {
        id: 'brand',
        label: 'Ask if he knows the brand',
        show: { flagUnset: 'corvinBrandAsked' },
        effects: {
          flag: { corvinBrandAsked: true },
          ticks: 1,
          flash:
            '"I know Cartel brands. I don\'t know Stray marks, and I\'m not going to guess at yours. The Strays know. They won\'t say it to you."',
        },
      },
      {
        id: 'back',
        label: 'Back to the Hound prints',
        tone: 'quiet',
        effects: { goto: 'spine:hound' },
      },
      {
        id: 'hunger',
        label: 'Walk east toward Red Maw',
        sub: 'You have a heading. Corvin waits at the dry ford if you helped him.',
        tone: 'hunger',
        show: { flag: 'hungerKnown' },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'Corvin watches you go and then watches the wash behind you.',
        },
      },
    ],
    intents: [
      {
        tags: ['ford', 'trap', 'traps', 'guide', 'way', 'through'],
        reply: '"The dry ford is south and east. Wire under the sand, resin pits, Cartel snares. I walk people past them."',
        effects: { ticks: 1 },
      },
      {
        tags: ['rifle', 'cartel', 'hollow', 'hollows', 'desert', 'deserter', 'families'],
        reply: '"I put the rifle down. That is the whole story I tell. The rest I carry."',
        effects: { ticks: 1 },
      },
    ],
  },
]

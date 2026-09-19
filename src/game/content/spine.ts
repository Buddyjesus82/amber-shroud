import type { Scene } from '../types'

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
        body: `Your vision frays at the edges. First Drop is not a poem. It is a requirement.`,
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
        effects: { goto: 'spine:well', ticks: 1, sap: -1 },
      },
      {
        id: 'hunger',
        label: 'Walk the Hunger toward Red Maw',
        sub: "Silas's scratch is a heading. Noon will not get kinder.",
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
          flag: { firstDrop: true, silasCutUsed: true, hungerKnown: true },
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
          flag: { silasCutUsed: true, silasSmear: true, hungerKnown: true },
          ticks: 1,
          goto: 'spine:ridge',
          flash: 'A taste. Not a future. The empty vial still argues. The tip is still spendable.',
        },
      },
      {
        id: 'back',
        label: 'Back to the Spine',
        tone: 'quiet',
        effects: { goto: 'spine:ridge', flag: { silasCutUsed: true, hungerKnown: true } },
      },
      {
        id: 'hunger',
        label: 'The cut already points at the Maw. Walk it.',
        tone: 'hunger',
        effects: {
          flag: { silasCutUsed: true, hungerKnown: true },
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
    body: `Silas Vane is older than the well's disappointment. One eye is milk. The other is accounting. The tent smells of resin-chew and wet wool that has never been wet.

"Noon-Empty," he says, which means the Spine has already named you. "Shade is not free. Talk is not free. Drops are a fairy tale I still keep in stock for people who pay."`,
    choices: [
      {
        id: 'talk',
        label: 'Sit in the expensive shade',
        effects: { goto: 'spine:silas', ticks: 1 },
      },
      {
        id: 'hunger',
        label: 'Leave the shade. Walk the Hunger.',
        sub: 'Red Maw. Kallik. The blonde on the skiff.',
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
        effects: {
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'Silas does not bless the road. Shade ends. The wash begins.',
        },
      },
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
        id: 'drop',
        label: 'Buy a Drop with whatever you have',
        effects: { goto: 'spine:silas-drop', ticks: 1 },
      },
      {
        id: 'cache',
        label: 'Ask what people bury at Red Maw',
        effects: { goto: 'spine:silas-cache', ticks: 1 },
      },
      {
        id: 'kaelen',
        label: 'Ask after Kaelen',
        effects: {
          flag: { kaelenKnown: true },
          ticks: 1,
          flash:
            '"Kaelen the Sifter passes at dusk if dusk remembers them. Jittery merchant. Pack of vials. They sell Drops for scrap and rumors for Glints. They are not shade. I am shade." Silas points his chin at the well. "They left a scratch in the stone. Read it or don\'t."',
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
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
    body: `"A Drop for a Glint. Or for scrap enough to patch a tent. Or for a story I don't already own. I do not take Cartel scrip. Scrip tastes like a leash."`,
    choices: [
      {
        id: 'glint',
        label: 'Pay a Glint',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1, vial_empty: 1 },
          add: { vial_drop: 1 },
          flag: { firstDrop: true, silasGave: true },
          ticks: 1,
          goto: 'spine:shade',
          flash: 'He sets a Drop in your vial. It looks like a captured noon. Your hands remember hope, which is irritating.',
        },
      },
      {
        id: 'scrap',
        label: 'Pay two scrap',
        show: { itemMin: ['scrap', 2] },
        effects: {
          remove: { scrap: 2 },
          add: { vial_drop: 1 },
          flag: { firstDrop: true, silasGave: true },
          ticks: 1,
          goto: 'spine:shade',
          flash: 'First Drop. It sits in the glass like a dare you already lost.',
        },
      },
      {
        id: 'mercy',
        label: 'Tell him you will die at noon',
        show: { all: [{ flagUnset: 'silasMercy' }, { sapMax: 3 }] },
        effects: {
          add: { vial_drop: 1 },
          flag: { firstDrop: true, silasMercy: true, silasGave: true },
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
    body: `"Kallik thought the Maw was a lock. Buried Drops, Glints, a tin mark. Then he buried himself by standing too close. Cache is still there. So is Sybella. She wants a person who can metabolize sap like a furnace — a walking battery. You have the empty look of someone who might qualify.

I will scratch you a heading. You take the Hunger when the noon gets honest."`,
    choices: [
      {
        id: 'take',
        label: 'Take the heading',
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true },
          add: { kallik_mark: 1 },
          ticks: 1,
          goto: 'spine:shade',
          flash: 'Red Maw. Cache. A blonde on a skiff. The Spine suddenly has a direction besides down.',
        },
      },
      {
        id: 'now',
        label: 'Take the heading. Walk it now.',
        sub: 'Kallik. Cache. The skiff. Do not bounce back to shade.',
        tone: 'hunger',
        effects: {
          flag: { hungerKnown: true, sybellaNamed: true },
          add: { kallik_mark: 1 },
          startChapter: 'cache-run',
          goto: 'ch1:leave',
          ticks: 1,
          flash: 'He scratches. You walk. Shade does not get a second invoice.',
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
    body: `A circle of stones. A throat of dust. Someone carved KAELEN CUTS DUSK into a brick, and under it a newer line: CACHE IS BAIT.

You can lower a hope. You cannot lower a bucket that still believes in water.`,
    choices: [
      {
        id: 'skim',
        label: 'Skim the well-throat anyway',
        sub: 'Risky Drop. Heat. The well may still spit once.',
        tone: 'danger',
        show: { flagUnset: 'skim:spine:well' },
        effects: {
          add: { vial_drop: 1 },
          remove: { vial_empty: 1 },
          sap: -1,
          heat: { strays: 1 },
          pressure: 2,
          ticks: 1,
          flag: { 'skim:spine:well': true, skimmed: true },
          flash:
            'Dust, then a Drop that should not have been there. The well bills you in Heat. Not a rescue. A theft.',
        },
      },
      {
        id: 'search',
        label: 'Search the brickwork',
        show: { flagUnset: 'wellScrap' },
        effects: {
          add: { scrap: 1, glints: 1 },
          flag: { wellScrap: true, kaelenKnown: true },
          ticks: 1,
          sap: -1,
          goto: 'spine:well',
          flash: 'A Glint wedged like a tooth. Scrap wire. Kaelen the Sifter leaves inventory the way other people leave warnings.',
        },
      },
      {
        id: 'kaelen',
        label: 'Wait for dusk and Kaelen the Sifter',
        sub: 'Merchant. Rumors if you ask. Not Silas\'s shade.',
        effects: { goto: 'spine:kaelen', ticks: 1, sap: -1, pressure: 1 },
      },
      {
        id: 'hunger',
        label: 'The brick says CACHE IS BAIT. Walk anyway.',
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
    body: `Prints. Not dogs. Shard-Hounds — Cartel-made, resin-jawed, loyal to whoever holds the chip.

Valerius is here in a different uniform: dust instead of cuffs, the same ledger behind the eyes. On the Spine they call him the Shard-Hound because he always finds the people who think ridges hide them.`,
    choices: [
      {
        id: 'talk',
        label: 'Let him see you seeing him',
        effects: { goto: 'spine:valerius', ticks: 1, heat: { cartel: 1 }, pressure: 1 },
      },
      {
        id: 'tooth',
        label: 'Pry a shard from an old kill',
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
        sub: 'Weapon on. Loot Hound Hide · Hide 4. No dice.',
        show: { all: [{ slot: 'weapon' }, { flagUnset: 'hideWrap' }] },
        effects: {
          add: { hide_wrap: 1 },
          flag: { hideWrap: true, houndCut: true },
          ticks: 1,
          heat: { cartel: 1 },
          goto: 'spine:hound',
          flash:
            'Resin jaw, then silence. Hound Hide · Hide 4 still smells like Cartel loyalty. Equip it in Gear. Valerius will count this.',
        },
      },
      {
        id: 'hunger',
        label: 'Leave the prints. Walk east to the Maw.',
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
    title: 'Shard-Hound Valerius',
    speaker: 'Valerius',
    body: `"Outcast," he says, almost kind. "Ironwood still pays for returned property. You are not property. You are a loose Drop. I can cork you or I can point you at the woman on the skiff. She pays better than bounties. She pays in not-dying."`,
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
            '"Sybella. Wants walking amber. Red Maw is her current church. If you go, go useful or go buried." He almost smiles. "I will be behind you either way."',
        },
      },
      { id: 'back', label: 'Back onto the ridge', tone: 'quiet', effects: { goto: 'spine:ridge' } },
      {
        id: 'hunger',
        label: 'Take the woman on the skiff as a heading',
        tone: 'hunger',
        show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }] },
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
    title: 'Hound Close',
    speaker: 'Valerius',
    body: `The Shard-Hound does not bark. The air just gets narrower.

Valerius stands on the Spine with the sun behind him like he rented it. "This wash is finished. You can be a Drop in my vial or a rumor heading east."`,
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
          flash: 'Shade takes you. Valerius lets it. For a price he has not named.',
        },
      },
    ],
  },
]

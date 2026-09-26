import type { Scene } from '../types'

export const redMawScenes: Scene[] = [
  {
    id: 'maw:rim',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Maw Rim',
    body: `Red Maw Approach is a lip of rock over a darkness that breathes warm. The cache is under that breath. So are worse things.

This is harder country than your start door. Sap goes faster. Hunters know the roads. The Hunger is not a rumor now. It is the ground.`,
    variants: [
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl at your throat itches when the wind hits it. Sybella's receipt. She will come to collect.`,
      },
      {
        if: { flag: 'sybellaHunting' },
        mode: 'append',
        body: `Skiff-smoke on the south rim. She is not hiding.`,
      },
      {
        if: { flag: 'hollowMarked' },
        mode: 'append',
        body: `The buried thing ticks in the back of your teeth. The Maw likes that.`,
      },
    ],
    choices: [
      {
        id: 'look',
        label: 'Look for Kallik\'s second rib',
        effects: {
          ticks: 1,
          sap: -1,
          pressure: 1,
          flash: 'A tin gleam far down. Cache is real. Getting it is Chapter 2\'s problem, and Chapter 2 is still a closed mouth.',
          flag: { sawCacheGleam: true },
        },
      },
    ],
    intents: [
      {
        tags: ['cache', 'kallik', 'climb', 'down', 'rib'],
        reply: 'The lip does not give you a path yet. The Walking Amber is the next Hunger. Today you survive the Approach.',
        effects: { ticks: 1, sap: -1 },
      },
    ],
  },
  {
    id: 'maw:market',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Bone Market',
    body: `A few stalls that pretend this is a town. Dried strider, spent Glints, maps that have killed people.

Zafir is at the stall whether the cairn kept him or not. He looks like a man who sold the same heading twice and is waiting to see which buyer lives. The tray behind him is stocked: Drops, Hide, a pawned baton, scrap for Glints.`,
    choices: [
      {
        id: 'zafir',
        label: 'Talk to Zafir',
        effects: { goto: 'maw:zafir', ticks: 1, flag: { zafirMet: true, metZafir: true } },
      },
      {
        id: 'browse',
        label: 'Browse like you have money',
        show: { flagUnset: 'mawGlint' },
        effects: {
          add: { scrap: 1 },
          flag: { mawGlint: true },
          ticks: 1,
          sap: -1,
          flash: 'A coil of wire nobody claimed. In the Approach, unclaimed is a kind of trap. You take it anyway.',
        },
      },
    ],
  },
  {
    id: 'maw:zafir',
    hubId: 'redmaw',
    kind: 'talk',
    title: 'Zafir',
    speaker: 'Zafir',
    body: `"You lived. How rude." Zafir's smile is thinner. "Sybella circled twice. Cache is still there. This stall is a shop now — Buy and Sell, not only headings. When the Maw opens a stair, don't take my maps with you. They get embarrassed."`,
    variants: [
      {
        if: { flagUnset: 'zafirCup' },
        mode: 'replace',
        body: `Zafir smiles in a way that costs extra. The cairn did not keep him. "You found the Approach without buying my heading. Rude, and impressive. This stall still sells. Drops, Hide, a baton the Maw pawned. Buy and Sell. I do not donate the next Hunger."`,
      },
      {
        if: { flag: 'zafirSore' },
        mode: 'append',
        body: `He remembers the crowding. He will not forget it for free.`,
      },
    ],
    choices: [
      {
        id: 'info',
        label: 'Ask what The Walking Amber is',
        effects: {
          ticks: 1,
          goto: 'maw:zafir',
          flash:
            '"Sybella\'s name for a person who can hold a cache and walk. You. Maybe. If the Maw doesn\'t edit you into a stain. That\'s the next Hunger. I don\'t sell that chapter yet."',
        },
      },
      { id: 'back', label: 'Leave his stall', tone: 'quiet', effects: { goto: 'maw:market' } },
    ],
    intents: [
      {
        tags: ['drop', 'vial', 'sap'],
        show: { itemMin: ['glints', 2] },
        reply: 'Highway robbery. He counts two Glints. Glass kisses your kit.',
        effects: { remove: { glints: 2 }, add: { vial_drop: 1 }, ticks: 1 },
      },
      {
        tags: ['hide', 'armor', 'hound'],
        show: { all: [{ itemMin: ['glints', 3] }, { flagUnset: 'zafirSoldHide' }] },
        reply: 'Hound Hide. Three Glints. Wear it or it is only a pelt.',
        effects: {
          remove: { glints: 3 },
          add: { hide_wrap: 1 },
          flag: { zafirSoldHide: true },
          ticks: 1,
        },
      },
      {
        tags: ['baton', 'weapon', 'shock'],
        show: { all: [{ itemMin: ['glints', 4] }, { flagUnset: 'zafirSoldBaton' }] },
        reply: 'Ironwood issue. Bite 4. He does not ask who you plan to correct.',
        effects: {
          remove: { glints: 4 },
          add: { ironwood_baton: 1 },
          flag: { zafirSoldBaton: true },
          ticks: 1,
        },
      },
    ],
  },
  {
    id: 'maw:stilt',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Stilt Shade',
    body: `A lean of canvas where stilts can come off without sinking. Cord. Resin-smell. A vial that is not yours.`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'replace',
        body: `Ossa is here, alive, stilts unstrapped, repairing the lash she spent on your behalf. The vial on her hip is hers. She looks up like you are a weather report.`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `Ossa is here. Alive. That was the rule. She has a new vial from someone kinder than you. She does not offer shade. She offers a look that could strip paint.`,
      },
      {
        if: { all: [{ flagUnset: 'ossaAlly' }, { flagUnset: 'ossaRobbed' }] },
        mode: 'replace',
        body: `Ossa is here anyway — stilts, vial, alive. The Approach collects survivors whether they traveled together or not.`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Talk to Ossa',
        effects: { goto: 'maw:ossa', ticks: 1 },
      },
    ],
  },
  {
    id: 'maw:ossa',
    hubId: 'redmaw',
    kind: 'talk',
    title: 'Ossa',
    speaker: 'Ossa',
    body: `"I'm alive," Ossa says, which is both greeting and warning. "The Maw wants the cache. Sybella wants a battery. I want my stilts to keep working. If you go down there next Hunger, I might go. I might not. Don't steal from me twice."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'replace',
        body: `"I'm alive," she says, and almost smiles. "You didn't get me killed. That's my favorite quality in a person. Next chapter, if the Maw opens, I can walk the lip with you. Today we drink slow and watch the skiff."`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `She is alive. She makes sure you see it. "You took a Drop off a woman on sticks. The Maw has a sense of humor. I have a memory. Next Hunger, do not stand in my shade unless you like falling."`,
      },
    ],
    choices: [
      {
        id: 'sorry',
        label: 'Say the theft was survival',
        show: { flag: 'ossaRobbed' },
        effects: {
          ticks: 1,
          goto: 'maw:stilt',
          flash: '"Survival is everyone\'s favorite knife." She does not forgive. She also does not bury you. That is the warmer ending.',
        },
      },
      {
        id: 'knot',
        label: 'Ask what the twice-tied knot means',
        show: { item: 'ossa_token' },
        effects: {
          ticks: 1,
          goto: 'maw:stilt',
          flash: '"It means I can find you. It means you can find me. It is not a marriage. It is a refusal to die separately if dying together is stupider."',
        },
      },
      { id: 'back', label: 'Give her the quiet', tone: 'quiet', effects: { goto: 'maw:stilt' } },
    ],
    intents: [
      {
        tags: ['sorry', 'apologize', 'forgive'],
        show: { flag: 'ossaRobbed' },
        reply: 'She lets the word sit. Alive is still the headline.',
        effects: { ticks: 1 },
      },
      {
        tags: ['steal', 'vial', 'rob'],
        reply: 'She is alive, and she is done being surprised by you.',
        effects: { heat: { strays: 1 } },
      },
    ],
  },
  {
    id: 'maw:smoke',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Skiff Smoke',
    body: `Sybella's skiff is parked like a threat that learned manners. Incense or resin-smoke. A ceremonial blindfold hung on the mast, not worn.

She is here. Hunting. Reasonable.`,
    choices: [
      {
        id: 'talk',
        label: 'Approach Sybella',
        effects: { goto: 'maw:sybella', ticks: 1, pressure: 1 },
      },
    ],
  },
  {
    id: 'maw:sybella',
    hubId: 'redmaw',
    kind: 'talk',
    title: 'Sybella',
    speaker: 'Sybella',
    body: `Kohl ruined. Blindfold up. Blonde hair full of grit she refuses to notice.

"The Approach is a waiting room," Sybella says. "The Walking Amber is the appointment. Fill, walk, don't crack. If you delay, I will assume you are trying to become someone else's furnace."`,
    variants: [
      {
        if: { flag: 'sybellaBargain' },
        mode: 'append',
        body: `Her eyes go to the kohl at your throat. "I keep receipts."`,
      },
      {
        if: { flagEq: ['climax', 'flee'] },
        mode: 'append',
        body: `"You run well. Don't worship it."`,
      },
    ],
    choices: [
      {
        id: 'hold',
        label: 'Tell her you will walk when the Maw opens',
        show: { door: 'vessel' },
        effects: {
          ticks: 1,
          heat: { seekers: -1 },
          goto: 'maw:smoke',
          flash: 'She accepts the delay the way a knife accepts a sheath. Temporarily. Seekers keep their cups. Nobody else.',
        },
      },
      {
        id: 'off',
        label: 'Step out of her smoke. Do not ask for help.',
        show: { not: { door: 'vessel' } },
        effects: {
          ticks: 1,
          heat: { seekers: 1 },
          pressure: 1,
          goto: 'maw:smoke',
          flash: 'No delay granted. She hunts Cartel mouths and Stray empties. She does not feed them.',
        },
      },
      {
        id: 'defy',
        label: 'Tell her you are not a battery',
        tone: 'danger',
        effects: {
          ticks: 1,
          heat: { seekers: 2 },
          pressure: 2,
          goto: 'maw:smoke',
          flash: 'A small nod. Agreement, even. She can use a person who thinks they are free. Especially those.',
        },
      },
      { id: 'back', label: 'Leave the smoke', tone: 'quiet', effects: { goto: 'maw:smoke' } },
    ],
    intents: [
      {
        tags: ['bargain', 'deal', 'useful'],
        reply: 'She already wrote that contract in kohl. Repeating it does not make it kinder.',
        effects: { ticks: 1 },
      },
      {
        tags: ['attack', 'kill', 'flee', 'run'],
        reply: 'The Approach is too small for that theater. She lets you keep the impulse.',
        effects: { pressure: 1 },
      },
    ],
  },
  {
    id: 'maw:sybella-shadow',
    hubId: 'redmaw',
    kind: 'story',
    title: 'Her Shadow',
    speaker: 'Sybella',
    body: `The skiff-shadow slides over you without the skiff arriving. Sybella's voice, almost kind:

"Tick. Tick. The Maw does not wait on hub-roaming. Drink or be drunk."`,
    choices: [
      {
        id: 'sybella-hold',
        label: 'Stay. Let the shadow pass.',
        tone: 'quiet',
        effects: {
          sap: -1,
          heat: { seekers: 1 },
          pressure: 1,
          returnHunterFrom: true,
          unsetFlag: ['hunterHere', 'hunterFrom'],
          ticks: 1,
          flash: 'The shadow lifts because you spent the hour. You stay on the ground you were already on.',
        },
      },
      {
        id: 'sybella-smoke',
        label: 'Go to her smoke and face it',
        effects: {
          goto: 'maw:sybella',
          ticks: 1,
          unsetFlag: ['hunterHere', 'hunterFrom'],
        },
      },
    ],
  },
  {
    id: 'maw:lip',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Hollow Lip',
    body: `Where the Approach meets listening sand. If you already buried something, you can hear it. If you didn't, the Lip offers a second chance at low magic — and a second bill.`,
    choices: [
      {
        id: 'bury',
        label: 'Bury a Glint',
        show: { all: [{ item: 'glints' }, { flagUnset: 'mawBuried' }] },
        effects: {
          remove: { glints: 1 },
          flag: { hollowMarked: true, mawBuried: true },
          heat: { seekers: -1 },
          sap: -1,
          ticks: 1,
          flash: 'The Lip swallows. Far off, skiff-runners hesitate. You taste metal that is not yours.',
        },
      },
      {
        id: 'listen',
        label: 'Listen for what you already buried',
        show: { flag: 'hollowMarked' },
        effects: {
          ticks: 1,
          sap: -1,
          flash: 'It is still screaming. Quietly. Like a kettle in another room. Chapter 2 will hear it better.',
        },
      },
    ],
  },
  {
    id: 'ch2:stub',
    hubId: 'redmaw',
    chapterId: 'walking-amber',
    kind: 'ending',
    art: 'hunger',
    title: 'The Walking Amber',
    body: `Chapter 2 sits under the Maw like a held breath.

The cache is real. Sybella is real. Ossa is alive. You are a survivor shaped by a start door and a Cache Run, and the desert is not finished editing.

This Hunger is not written yet. The Approach remains. Roam it. Drink slow. Keep your vial honest.

When the Maw opens a stair, you will know.`,
    choices: [
      {
        id: 'back',
        label: 'Return to the Rim',
        tone: 'quiet',
        effects: { goto: 'maw:rim', enterHub: 'redmaw' },
      },
    ],
  },
]

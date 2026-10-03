import type { Choice, Scene } from '../types'

/** Resolve Sybella and leave her smoke. Underlying ground if she interrupted it, otherwise the Approach. */
function sybellaOn(extra: Choice['effects']): Choice['effects'] {
  const { flag, ...rest } = extra
  return {
    ticks: 1,
    goto: 'maw:rim',
    unsetFlag: ['hunterHere', 'hunterFrom'],
    returnHunterFrom: true,
    ...rest,
    flag: { huntQuiet: 0, ...flag },
  }
}

export const redMawScenes: Scene[] = [
  {
    id: 'maw:rim',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Red Maw Approach',
    body: `Red Maw Approach. A lip of rock over a darkness that breathes warm. The ground is a field of fossil ribs, the jaw of something ancient, littered with holes where other people dug and did not come back. Kallik's cache is under that breath.

The ground out here takes more than the camp ever did. Sap goes faster. Hunters know the roads.`,
    variants: [
      {
        if: { flag: 'chapter1Done' },
        mode: 'append',
        body: `Hunger is open. Run, leave, or take the Hunger.`,
      },
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl on your brow itches when the wind hits it. She marked you. She will come.`,
      },
      {
        if: { all: [{ flag: 'sybellaHunting' }, { flagUnset: 'sybellaShadowed' }] },
        mode: 'append',
        body: `Skiff-smoke on the south rim. She has not closed the distance yet.`,
      },
      {
        if: { flag: 'ossaStillness' },
        mode: 'append',
        body: `Ossa's knot sits at your brow. She nodded, back at the bay, the way you'd nod at a grave marker. The test is still in her pocket.`,
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
        label: "Look for Kallik's second rib",
        sub: 'Costs sap. You search the ribs for the gear-mark he cut.',
        show: { flagUnset: 'ribOpen' },
        effects: {
          ticks: 1,
          sap: -1,
          goto: 'maw:ribs',
          flag: { sawCacheGleam: true },
        },
      },
      {
        id: 'hold',
        label: 'The gear-marked rib',
        sub: 'The sealed way. You already found the teeth.',
        show: { flag: 'ribOpen' },
        effects: { goto: 'maw:hold', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['cache', 'kallik', 'climb', 'down', 'rib'],
        show: { flag: 'chapter1Done' },
        reply: 'The cache stays under the lip. Hunger is open. Run, leave, or take the Hunger.',
        effects: { ticks: 1, sap: -1 },
      },
      {
        tags: ['cache', 'kallik', 'climb', 'down', 'rib'],
        show: { flagUnset: 'chapter1Done' },
        reply: 'The lip does not give you the rib yet. Today you survive the Approach.',
        effects: { ticks: 1, sap: -1 },
      },
    ],
  },
  {
    id: 'maw:market',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Bone Market',
    body: `A few stalls pretending this is a town. Dried strider meat. Amber chips. Maps that have killed the people who bought them.

Zafir is at his stall. He has watched buyers fail and kept the tray anyway. On it: Drops of Oasis Sap, Hound Hide, a pawned shock baton, and scrap he will trade for Glints.`,
    choices: [
      {
        id: 'zafir',
        label: 'Talk to Zafir',
        sub: 'His tray is a real shop. Buy and Sell. He does not sell a pardon.',
        effects: { goto: 'maw:zafir', ticks: 1, flag: { zafirMet: true, metZafir: true } },
      },
      {
        id: 'browse',
        label: 'Browse the stalls',
        sub: 'Costs sap. You pick up a coil of unclaimed wire. It may be a trap.',
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
    body: `"You lived." Zafir's smile is thin. "Another one crawls out of the Approach. You look like you'll need Drops. His stock is on the tray. Buy and Sell. When you go down a rib, leave my maps up here."`,
    variants: [
      {
        if: { flagUnset: 'zafirCup' },
        mode: 'replace',
        body: `"Another one crawls out of the Approach. You look like you'll need Drops." Zafir taps the tray. "His stock. Drops, Hound Hide, a baton somebody pawned. Buy and Sell. I sell what is on the tray. Nothing else."`,
      },
      {
        if: { flag: 'zafirSore' },
        mode: 'append',
        body: `He remembers the crowding. He will not forget it for free.`,
      },
    ],
    choices: [
      { id: 'back', label: 'Leave his stall', tone: 'quiet', effects: { goto: 'maw:market' } },
    ],
    intents: [
      {
        tags: ['walking amber', 'walking'],
        show: { flag: 'heardWalkingAmber' },
        reply: "Seeker talk. Something that walks out of the sand and shouldn't. Ask the woman in the skiff, if you like breathing less.",
        effects: { ticks: 1 },
      },
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
        reply: 'Ironwood issue. Strike 4. He does not ask who you plan to correct.',
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
    body: `A lean of canvas where Ossa can take her stilts off without sinking. Cord. The smell of resin. A vial on a hip that is not yours.`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'replace',
        body: `Ossa is here. The stilts are already standing. She does not repair them again. She nods the way you would nod at a grave marker, then looks at your hands to see what you kept.`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `Ossa is here, and she is alive. She has a new vial, from someone kinder than you. She does not offer shade. She looks at you like she is stripping paint.`,
      },
      {
        if: { all: [{ flagUnset: 'ossaAlly' }, { flagUnset: 'ossaRobbed' }] },
        mode: 'replace',
        body: `Ossa is here anyway. Stilts, vial, alive. The Approach collects people who lived, whether you traveled with her or not.`,
      },
      {
        // First time she sees you at all (a door whose road never crossed hers).
        if: { all: [{ flagUnset: 'ossaMet' }, { flagUnset: 'ossaAlly' }, { flagUnset: 'ossaRobbed' }] },
        mode: 'replace',
        body: `A woman on stilts is tying cord under the canvas. When you step into the shade she stops and looks at your face a beat too long. Her hand tightens on the stilt. Then she goes back to the knot.

"Shade is free to stand in," Ossa says, the way she would say it to any stranger. "Water is not."`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Talk to Ossa',
        sub: 'She is alive. What she says depends on how you left her on the road.',
        effects: { goto: 'maw:ossa', ticks: 1, flag: { ossaMet: true } },
      },
    ],
  },
  {
    id: 'maw:ossa',
    hubId: 'redmaw',
    kind: 'talk',
    title: 'Ossa',
    speaker: 'Ossa',
    body: `"I'm alive," Ossa says, which is both greeting and warning. "The Maw wants the cache. Sybella wants whoever the sand keeps. The stilts are done. Don't steal from me twice."`,
    variants: [
      {
        if: { flag: 'ossaToldDay' },
        mode: 'replace',
        body: `She does not play the stranger anymore. "I already told you the day. The dawn, the fire, the fifteen years. The rest waits until you are ready. Ask when you can hear it."`,
      },
      {
        if: { all: [{ flag: 'ossaStillness' }, { flagUnset: 'ossaToldDay' }] },
        mode: 'replace',
        body: `She looks at you longer than a stranger should. The knot at your brow is the only proof she gives.

"I have been pretending not to know your face," Ossa says. "Stay quiet with me if you want the day. I will not shout it."`,
      },
      {
        if: { all: [{ flag: 'ossaAlly' }, { flagUnset: 'ossaStillness' }] },
        mode: 'replace',
        body: `"I'm alive," she says. "You took the Glint, or the Drop, or you fixed the lash and kept walking. The stilts are standing. Today we drink slow and watch the skiff."`,
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
      {
        id: 'day',
        label: 'Stay quiet with her',
        sub: 'She stops pretending she does not know you.',
        show: { all: [{ flag: 'ossaStillness' }, { flagUnset: 'ossaToldDay' }] },
        effects: { goto: 'maw:ossa-day', ticks: 1 },
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
    id: 'maw:ossa-day',
    hubId: 'redmaw',
    kind: 'talk',
    title: 'The Day',
    speaker: 'Ossa',
    body: `Ossa sets the stilts down so you stand at the same height. The stranger voice is gone. What is left is a teacher who has lived in weather.

"I raised you," she says. "I knew your face before the sand ever had it.

"We had a homestead. Every dawn I walked the perimeter. One morning I started the circuit at the east fence and walked on. I never thought raiders would come through the place where I had just been. They did. While I was on the far side, they came in, burned everything, and took you. You were thirteen. Old enough that I had taught you well. Young enough that someone could make you into something new."

She does not look away. "I don't know who took you. I have walked this desert for fifteen years looking for you. I came across you on the road by chance, and I still did not say so. I needed to know if you kept what I taught you. You did."

A breath. The cord in her hands gets a second knot. "That is the day. The rest I will tell when you are ready to hear it. Ask me then. I will still be here."`,
    variants: [
      {
        if: { all: [{ door: 'prisoner' }, { flag: 'ossaStillness' }] },
        mode: 'append',
        body: `Her eyes go to the wire scars on your wrists. "Wherever you landed after that, it ended in a cage. I could see that the first time I saw you."`,
      },
      {
        if: { all: [{ door: 'outcast' }, { flag: 'ossaStillness' }] },
        mode: 'append',
        body: `Her eyes go to the brand once, then back to yours. "I don't know where you got that, and I won't guess. It doesn't change who I raised."`,
      },
      {
        if: { all: [{ door: 'vessel' }, { flag: 'ossaStillness' }] },
        mode: 'append',
        body: `She touches the gold thread at your collar. "Someone dressed you as a cup. That is where you landed. It is not where you started."`,
      },
      {
        if: { flagUnset: 'ossaStillness' },
        mode: 'replace',
        body: `"I'm alive," Ossa says, and nothing more. She talks to you the way she talks to any stranger on the road.`,
      },
    ],
    choices: [
      {
        id: 'back',
        label: 'Let her stop there',
        sub: 'She has said the day. The rest waits.',
        show: { flag: 'ossaStillness' },
        effects: {
          flag: { ossaToldDay: true },
          goto: 'maw:stilt',
          ticks: 1,
          flash: 'She ties the cord a second time and does not add a name. The rest waits until you ask.',
        },
      },
      {
        id: 'leave',
        label: 'Leave the shade',
        show: { flagUnset: 'ossaStillness' },
        effects: { goto: 'maw:stilt', ticks: 1 },
      },
    ],
  },
  {
    id: 'maw:smoke',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Skiff Smoke',
    body: `Sybella's sand-skiff is parked like a threat that learned manners. Incense, or resin-smoke. A ceremonial blindfold hangs on the mast.

She is here, and she is hunting. Walk up and she will talk. You can also slip past the smoke and go on into the Approach.`,
    choices: [
      {
        id: 'on',
        label: 'Continue into the Approach',
        sub: 'Slip the smoke. The ribs are still ahead.',
        tone: 'quiet',
        effects: sybellaOn({
          returnHunterFrom: false,
          flash: 'You slip the resin-smoke. The Approach is ahead, ribs and all.',
        }),
      },
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
    body: `Kohl ruined. Blindfold pushed up. Blonde hair full of grit she refuses to notice. Older than the woman who weeps gold. She was a faithful acolyte once. The war between Cartel and Dune-Stray burned that down to this.

"The Approach is patient. So am I. Give the sand something to remember you by, or I leave you for what sleeps under the ribs."`,
    variants: [
      {
        if: { flag: 'sybellaBargain' },
        mode: 'append',
        body: `Her eyes go to the kohl on your brow. "The sand has seen this one."`,
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
        label: 'Ask for help',
        sub: 'Walk when the Maw opens.',
        show: { door: 'vessel' },
        effects: sybellaOn({
          heat: { seekers: -1 },
          flash:
            'She accepts the ask the way old stone accepts a hand. Temporarily. The faith keeps its own. She does not keep you.',
        }),
      },
      {
        id: 'help',
        label: 'Ask for help',
        sub: 'She hunts. She does not pour for you.',
        show: { not: { door: 'vessel' } },
        effects: sybellaOn({
          heat: { seekers: 1 },
          flash: 'She does not pour. The faith keeps its own, and the sand keeps the rest.',
        }),
      },
      {
        id: 'off',
        label: 'Step out of her smoke. Do not ask for help.',
        show: { not: { door: 'vessel' } },
        effects: sybellaOn({
          heat: { seekers: 1 },
          pressure: 1,
          flash: 'The old roads do not wait, and she will not pour for you.',
        }),
      },
      {
        id: 'defy',
        label: 'Tell her to find someone else to shadow',
        tone: 'danger',
        effects: sybellaOn({
          heat: { seekers: 2 },
          pressure: 2,
          flash: 'A small nod. Agreement, even. She can use a person who thinks they are free. Especially those.',
        }),
      },
      {
        id: 'push',
        label: 'Push past her into the Approach',
        sub: 'She follows. You still arrive.',
        tone: 'hunger',
        effects: sybellaOn({
          returnHunterFrom: false,
          heat: { seekers: 1 },
          flash:
            "You walked past without paying. Sybella didn't stop you, and she didn't let you go either. She's following you into the Approach. Seeker Heat +1.",
        }),
      },
      {
        id: 'false',
        label: 'Throw a decoy',
        sub: 'Scrap, a wrench, or a map — only what is in your hands. She still follows.',
        enable: {
          any: [{ item: 'scrap' }, { item: 'wrench' }, { item: 'cache_map' }, { item: 'oram_map' }],
        },
        locked: 'You need scrap, a wrench, or a map in hand.',
        effects: sybellaOn({
          heat: { seekers: 1 },
          flag: { falseTrail: true, decoyNow: true },
          flash:
            'You throw what you are carrying. It buys a head start and a lie in the sand. She is a moment late. She still follows. Seeker Heat climbs.',
        }),
      },
      {
        id: 'back',
        label: 'Leave the smoke',
        tone: 'quiet',
        effects: sybellaOn({
          flash: 'You leave the resin-smoke. The ground under it is still there.',
        }),
      },
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
          flash: 'The shadow lifts. You grit your teeth and stay. You are still on the ground you were already on. Poorer in sap. Not in a lullaby.',
        },
      },
      {
        id: 'sybella-smoke',
        label: 'Go to her smoke and face it',
        effects: {
          goto: 'maw:sybella',
          ticks: 1,
          unsetFlag: ['hunterHere'],
        },
      },
    ],
  },
  {
    id: 'maw:lip',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Hollow Lip',
    body: `This is where the Approach meets sand that listens. If you already buried a Glint, you can hear it down there. If you did not, the Hollow Lip will take one now, and Seekers who are hunting you hesitate. Either way it costs sap. Nobody from the Cartel is here to see a skim.`,
    choices: [
      {
        id: 'bury',
        label: 'Bury a Glint',
        sub: 'Spend 1 Glint. Seeker Heat drops. Costs sap. The Lip swallows it.',
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
    ],
    intents: [
      {
        tags: ['listen', 'buried', 'kettle'],
        show: { flag: 'hollowMarked' },
        reply: 'It is still down there. Quiet. Like a kettle in another room. The Maw is not finished with it.',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'maw:ribs',
    hubId: 'redmaw',
    kind: 'place',
    title: 'Fossil Ribs',
    body: `The Approach is a jaw that forgot how to close. Ribs of stone, and holes where other diggers went down and stayed. Kallik buried his haul under the right rib and never came back up. He carved a gear with nine teeth on the second rib from the jaw, so he would not lose the place.

A blind pick costs sap. Scratches on the wrong rib only look like that gear.`,
    choices: [
      {
        id: 'gear',
        label: 'The second rib from the jaw',
        sub: 'Two clues agree: the mark, the map, or the rumor. The sealed way opens.',
        show: {
          any: [
            { all: [{ item: 'kallik_mark' }, { item: 'cache_map' }] },
            { all: [{ item: 'kallik_mark' }, { flag: 'heardKallik' }] },
            { all: [{ item: 'cache_map' }, { flag: 'heardKallik' }] },
          ],
        },
        effects: {
          flag: { ribOpen: true, heardGear: true },
          add: { scrap: 3 },
          ticks: 1,
          goto: 'maw:hold',
          flash: 'Scrap +3. Nine teeth, cut clean. The rib gives. A sealed way, and a little of what Kallik left in the mouth of it.',
        },
      },
      {
        id: 'narrow',
        label: 'Try the rib the one clue points at',
        sub: 'You only have one clue. The first rib is a lie. Costs sap.',
        show: {
          all: [
            { flagUnset: 'ribDecoy' },
            { flagUnset: 'ribOpen' },
            {
              any: [{ item: 'kallik_mark' }, { item: 'cache_map' }, { flag: 'heardKallik' }],
            },
            {
              not: {
                any: [
                  { all: [{ item: 'kallik_mark' }, { item: 'cache_map' }] },
                  { all: [{ item: 'kallik_mark' }, { flag: 'heardKallik' }] },
                  { all: [{ item: 'cache_map' }, { flag: 'heardKallik' }] },
                ],
              },
            },
          ],
        },
        effects: {
          sap: -1,
          ticks: 1,
          flag: { ribDecoy: true },
          flash: 'Worn scratches. Almost a gear. Not this rib. Sap spent. The next one is closer.',
        },
      },
      {
        id: 'gear-next',
        label: 'The next rib. The gear, not the scratch.',
        sub: 'You already wasted a rib. This one has the nine teeth. The way opens.',
        show: {
          all: [
            { flag: 'ribDecoy' },
            { flagUnset: 'ribOpen' },
            { any: [{ item: 'kallik_mark' }, { item: 'cache_map' }, { flag: 'heardKallik' }] },
          ],
        },
        effects: {
          flag: { ribOpen: true, heardGear: true },
          add: { scrap: 2 },
          ticks: 1,
          goto: 'maw:hold',
          flash: 'Scrap +2. Nine teeth under your thumb. The sealed way opens a handspan and gives you a little.',
        },
      },
      {
        id: 'blind',
        label: 'Pick a rib blind',
        sub: 'No clue. Sap, and usually nothing.',
        show: {
          all: [
            { flagUnset: 'ribBlind1' },
            { flagUnset: 'ribOpen' },
            { not: { any: [{ item: 'kallik_mark' }, { item: 'cache_map' }, { flag: 'heardKallik' }] } },
          ],
        },
        effects: {
          sap: -1,
          ticks: 1,
          flag: { ribBlind1: true },
          flash: 'Sand. A hole that is not a door. Nothing worth carrying. Sap spent.',
        },
      },
      {
        id: 'blind2',
        label: 'Pick again. The ribs all look like ribs.',
        show: { all: [{ flag: 'ribBlind1' }, { flagUnset: 'ribBlind2' }, { flagUnset: 'ribOpen' }] },
        effects: {
          sap: -1,
          ticks: 1,
          heat: { seekers: 1 },
          flag: { ribBlind2: true },
          flash: 'The rib sighs. A nest. Noise. Seeker Heat notices. You are poorer in sap and not richer in gear.',
        },
      },
      {
        id: 'blind3',
        label: 'The second rib from the jaw. Count it yourself.',
        show: { all: [{ flag: 'ribBlind2' }, { flagUnset: 'ribOpen' }] },
        effects: {
          sap: -1,
          ticks: 1,
          flag: { ribOpen: true, heardGear: true },
          add: { scrap: 1 },
          goto: 'maw:hold',
          flash: 'Scrap +1. You counted from the jaw with bleeding fingers. Nine teeth. The way opens, grudging.',
        },
      },
      {
        id: 'back',
        label: 'Back to the Approach',
        tone: 'quiet',
        effects: { goto: 'maw:rim' },
      },
    ],
  },
  {
    id: 'maw:hold',
    hubId: 'redmaw',
    kind: 'story',
    title: 'The Sealed Way',
    body: `The Maw keeps its secrets. For now.

The gear-marked rib opened a handspan and gave you what was in the mouth of it. The rest is still down there, under the jaw, where Kallik did not come back from. This is written down.`,
    choices: [
      {
        id: 'back',
        label: 'Climb back to the Approach',
        tone: 'quiet',
        effects: {
          goto: 'maw:rim',
          enterHub: 'redmaw',
          flash: 'You are back on the ribs. The way is marked. The Maw can wait.',
        },
      },
    ],
  },
  {
    id: 'maw:tuner',
    hubId: 'redmaw',
    kind: 'place',
    title: 'The Wreck',
    body: `A wrecked Skiff-Strider lies half sunk in a rib's shadow. Someone has made a bench of it. A big man with a brass jaw works on hoarded parts at the far end and does not look up. He waves a hand at the bench: sit if you want.

You can rest here or haul parts for him. None of it opens Kallik's cache.`,
    variants: [
      {
        if: { door: 'prisoner' },
        mode: 'replace',
        body: `A wrecked Skiff-Strider, half sunk in a rib's shadow. Jaxson Vance has made a bench of it. Hoarded parts. A way-out rig that is not a way out yet. The brass jaw ticks when he works.

"Repairs. A side job hauling parts. Salve if you are cut. I build exits for people the Hollows keep. You are early." You can bind his cut, rest, or haul. None of it opens Kallik's cache.`,
      },
      {
        if: { all: [{ door: 'prisoner' }, { flag: 'oilResentful' }] },
        mode: 'replace',
        body: `He is here, and he is hurt. The jaw is fused wrong from a fall he took alone. You skipped the station. He did not.

"You left the bolt. I left bleeding. I still build the rig. Do not ask me to like you until the cut closes."`,
      },
      {
        if: { flag: 'oilMended' },
        mode: 'append',
        body: `The cut is closed. He nods once. The smirk is a shield again, not a wound.`,
      },
      {
        if: { flag: 'ribOpen' },
        mode: 'append',
        body: `You describe nine teeth. He stops. "Tinker's sign. Kallik marked a place, not a prayer. Don't lose the rib."`,
      },
    ],
    choices: [
      {
        id: 'heal',
        label: 'Bind his cut with salve',
        show: { all: [{ door: 'prisoner' }, { flag: 'oilResentful' }, { item: 'salve' }] },
        effects: {
          remove: { salve: 1 },
          unsetFlag: ['oilResentful'],
          flag: { oilMended: true, oilAlly: true },
          ticks: 1,
          flash: 'Salve on the jaw-seam. He exhales through brass. "Better. Do not call it forgiven."',
        },
      },
      {
        id: 'heal-drop',
        label: 'Pour a Drop on the cut',
        show: { all: [{ door: 'prisoner' }, { flag: 'oilResentful' }, { item: 'vial_drop' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
          unsetFlag: ['oilResentful'],
          flag: { oilMended: true, oilAlly: true },
          ticks: 1,
          flash: 'A Drop on the cut. The brass ticks quieter. The grudge closes with the skin.',
        },
      },
      {
        id: 'rest',
        label: 'Rest on the bench',
        sub: 'Costs a little sap. Your health comes back a little.',
        enable: { sapMin: 1 },
        locked: 'No sap to sit on.',
        effects: {
          health: 2,
          sap: -1,
          ticks: 1,
          flash: 'The wreck holds you. Health comes back a little. He pretends not to watch.',
        },
      },
      {
        id: 'job',
        label: 'Take a side job. Haul parts.',
        sub: 'Costs sap. You get 2 scrap. The rig gets one bolt closer to finished.',
        effects: {
          add: { scrap: 2 },
          sap: -1,
          ticks: 1,
          flag: { oilJob: true },
          flash: 'Scrap +2. A coil he needed and a cut on your palm. The rig is one bolt less imaginary.',
        },
      },
      {
        id: 'back',
        label: 'Leave the wreck',
        tone: 'quiet',
        effects: { goto: 'maw:rim' },
      },
    ],
    intents: [
      {
        tags: ['heal', 'salve', 'bind', 'sorry'],
        show: { flag: 'oilResentful' },
        reply: 'He lets you near the jaw. The grudge is a cut. Close it or leave it.',
        effects: { ticks: 1 },
      },
    ],
  },
  {
    id: 'ch2:stub',
    hubId: 'redmaw',
    chapterId: 'walking-amber',
    kind: 'ending',
    art: 'hunger',
    title: 'Under the Jaw',
    body: `The Maw keeps its secrets. For now.

The cache is real. Sybella is real. Ossa is alive. You are still on the Approach. Roam it. Drink slow. Keep your vial honest.

The stair, if it opens, opens on a rib with nine teeth. This page is written down.`,
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

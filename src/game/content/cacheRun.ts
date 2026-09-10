import type { Scene } from '../types'

export const cacheRunScenes: Scene[] = [
  {
    id: 'ch1:leave',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Cache Run',
    body: `You leave the last honest shade behind.

The dunes take your footprints and keep them like debts. Somewhere ahead: Kallik's cache at the Red Maw. Somewhere closer: a blonde on a sand-skiff who wants a person that can hold sap without cracking.

You are not a hero. You are a custom-made survivor with a dry mouth and a heading.`,
    variants: [
      {
        if: { door: 'prisoner' },
        mode: 'append',
        body: `Camp-04's sirens thin behind you. Bleed-dust still in the seams of your hands. Valerius will not stay a tower forever.`,
      },
      {
        if: { door: 'outcast' },
        mode: 'append',
        body: `Noon follows like it signed a contract. The empty vial era is over only if you find something worth putting in it.`,
      },
      {
        if: { door: 'vessel' },
        mode: 'append',
        body: `The stolen Strider eats distance and hates you for it. The cloth still smells like Thalia's gold. Seekers do not forgive a cup that walks away.`,
      },
      {
        if: { flag: 'cacheBlind' },
        mode: 'append',
        body: `You do not have a real map. You have panic and a rumor of red rock. That has been enough for worse people.`,
      },
    ],
    choices: [
      {
        id: 'go',
        label: 'Take the dune trail',
        tone: 'hunger',
        effects: { goto: 'ch1:trail', ticks: 1, sap: -1, pressure: 1 },
      },
    ],
  },
  {
    id: 'ch1:trail',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Dune Trail',
    body: `Wind writes the same sentence on every slope: keep moving.

Three ways present themselves like bad friends. The straight wash is fast and naked. The high ridge sees everything, including you. Off the left, stilt-prints — too light for a loaded man, too regular for a dying one.`,
    choices: [
      {
        id: 'straight',
        label: 'Take the straight wash',
        sub: 'Fast. Exposed. Sap burns.',
        effects: { goto: 'ch1:zafir', ticks: 1, sap: -2, pressure: 1 },
      },
      {
        id: 'ridge',
        label: 'Climb the high ridge',
        sub: 'You will see the skiff. The skiff may see you.',
        effects: { goto: 'ch1:ridge', ticks: 1, sap: -1, heat: { seekers: 1 } },
      },
      {
        id: 'stilts',
        label: 'Follow the stilt-prints',
        sub: 'Someone is alive out here on purpose.',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, sap: -1 },
      },
    ],
    intents: [
      {
        tags: ['ossa', 'stilt', 'tracks', 'follow', 'woman'],
        reply: 'The prints are a person who refused to sink. You follow.',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, sap: -1 },
      },
      {
        tags: ['bury', 'hollow', 'hide', 'magic'],
        reply: 'Not yet. The sand is listening, but it charges more when you are in a hurry.',
        effects: { goto: 'ch1:hollow-edge' },
      },
      {
        tags: ['drink', 'sip', 'drop'],
        show: { item: 'vial_drop' },
        reply: 'You drink on your feet. The wash steadies.',
        effects: {
          sap: 3,
          remove: { vial_drop: 1 },
          add: { vial_empty: 1 },
        },
      },
    ],
  },
  {
    id: 'ch1:ridge',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Brass Horizon',
    body: `From the ridge the world is a pan of slag.

A sand-skiff cuts the south wind — lateen sail the color of old bone, hull on runners. A figure at the tiller: pale hair, a ceremonial blindfold pushed up like a crown she got tired of. Even at this distance she looks reasonable. That is the terrifying part.

She is not hunting randomly. She is hunting a furnace that learned to walk.`,
    choices: [
      {
        id: 'down',
        label: 'Drop off the ridge before she angles',
        effects: { goto: 'ch1:zafir', ticks: 1, sap: -1, flag: { sawSkiff: true } },
      },
      {
        id: 'ossa',
        label: 'Cut toward the stilt-line while you still can',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, sap: -1, flag: { sawSkiff: true } },
      },
    ],
  },
  {
    id: 'ch1:ossa-meet',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Stilts',
    speaker: 'Ossa',
    body: `She is alive.

Ossa stands three feet above the hungry sand on stilts lashed with cord that has been repaired more times than it has been made. A vial rides her hip, half-full, honest. Wind has made a banner of her wrap. She sees you seeing the vial. She does not reach for a weapon. She reaches for balance.

"If you came to rob a woman on sticks," she says, "you should have eaten first. I fall funny."`,
    choices: [
      {
        id: 'hail',
        label: 'Hail her like a person',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true }, ticks: 1 },
      },
      {
        id: 'watch',
        label: 'Hold back. Watch.',
        tone: 'quiet',
        effects: {
          goto: 'ch1:ossa-talk',
          flag: { ossaMet: true, ossaWary: true },
          ticks: 1,
          flash: 'She lets you have the silence. Stilts do not mean weak. Stilts mean she understood the ground.',
        },
      },
      {
        id: 'steal',
        label: 'Lunge for the vial',
        tone: 'danger',
        effects: {
          goto: 'ch1:ossa-rob',
          flag: { ossaMet: true },
          ticks: 1,
        },
      },
    ],
    intents: [
      {
        tags: ['steal', 'grab', 'take', 'vial', 'rob'],
        reply: 'You go for the hip. The desert tilts.',
        effects: { goto: 'ch1:ossa-rob' },
      },
      {
        tags: ['help', 'hail', 'hello', 'talk', 'friend'],
        reply: 'You show empty hands. She shows you a life that still has a Drop in it.',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true } },
      },
    ],
  },
  {
    id: 'ch1:ossa-rob',
    chapterId: 'cache-run',
    kind: 'story',
    speaker: 'Ossa',
    title: 'A Ugly Reach',
    body: `You take the vial. She takes a fall she planned for — knees, then a tumble that keeps the stilts from spearing her.

She is alive. Angry. Breathing. The sand does not get her because she refused to let it, even with your hands on her life.

"Walk," she says, from the ground. "If Sybella asks, I will describe your back."`,
    choices: [
      {
        id: 'go',
        label: 'Take the Drop and the shame',
        effects: {
          add: { vial_drop: 1 },
          flag: { ossaRobbed: true, ossaAlive: true },
          heat: { strays: 2 },
          goto: 'ch1:zafir',
          ticks: 1,
        },
      },
      {
        id: 'back',
        label: 'Give it back. Try to be a person.',
        effects: {
          flag: { ossaAlive: true, ossaWary: true, ossaMet: true },
          unsetFlag: ['ossaRobbed'],
          goto: 'ch1:ossa-talk',
          flash: 'She takes the vial without thanks. Thanks would be a lie. The option of later is still open.',
        },
      },
    ],
  },
  {
    id: 'ch1:ossa-talk',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Ossa',
    speaker: 'Ossa',
    body: `"Kallik's cache is bait with a building around it," Ossa says. "I go to Red Maw because the stilts work better where the sand is honest about wanting you. Zafir is at the bone cairn ahead, selling maps to dead men. Sybella wants a walking battery. If that's you, don't tell her. If it isn't, don't tell her that either."

The vial on her hip stays hers. She is alive. She intends to remain so.`,
    variants: [
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `She looks at you like a weather she will outlast. The stilts are back under her. The vial is not. She is still alive. That fact is now a debt with teeth.`,
      },
    ],
    choices: [
      {
        id: 'share',
        label: 'Offer a Drop if you have one',
        show: { all: [{ item: 'vial_drop' }, { flagUnset: 'ossaRobbed' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaAlive: true },
          ticks: 1,
          goto: 'ch1:ossa-talk',
          flash:
            'She does not drink it. She pockets it for a worse hour. A knot of stilt-cord lands in your palm. Twice-tied. "I don\'t die easy. Neither do my debts."',
        },
      },
      {
        id: 'together',
        label: 'Ask to walk the Maw together',
        show: { flagUnset: 'ossaRobbed' },
        effects: {
          flag: { ossaAlly: true, ossaAlive: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:zafir',
          flash: 'She shortens her stride so a person without stilts can pretend to keep up. That is love, in the dunes.',
        },
      },
      {
        id: 'sybella',
        label: 'Ask how to survive Sybella',
        effects: {
          ticks: 1,
          goto: 'ch1:ossa-talk',
          flash:
            '"She bargains first. She is good at it. False trail if you have scrap or a friend. Flee if you can spend sap you don\'t have. Or bury something you mean and let the Hollows bill you later. I will not bury with you. I like being alive."',
          flag: { ossaAlive: true },
        },
      },
      {
        id: 'on',
        label: 'Leave her on her stilts',
        tone: 'quiet',
        effects: { goto: 'ch1:zafir', flag: { ossaAlive: true, ossaMet: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'rob', 'vial', 'take'],
        show: { flagUnset: 'ossaRobbed' },
        reply: 'Second chances at theft are how graves get filled. She is watching your hands now.',
        effects: { goto: 'ch1:ossa-rob' },
      },
      {
        tags: ['ally', 'together', 'come', 'with'],
        reply: 'She nods once. Stilts and sand. A procession of two.',
        effects: { flag: { ossaAlly: true, ossaAlive: true }, add: { ossa_token: 1 }, goto: 'ch1:zafir' },
      },
    ],
  },
  {
    id: 'ch1:zafir',
    chapterId: 'cache-run',
    kind: 'talk',
    title: 'Bone Cairn',
    speaker: 'Zafir',
    body: `Zafir has built a shop out of a cairn of animal bones and other people's mistakes. He is smiling in a way that costs extra.

"You look like Hunger," he says. "I sell headings to Kallik's hole. I also sell the news that Sybella already knows you're coming. Pick the product that hurts less."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa stays at the edge of his shade, stilts planted, a second opinion with a shadow.`,
      },
    ],
    choices: [
      {
        id: 'buy',
        label: 'Buy the heading for a Glint',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          add: { cache_map: 1 },
          flag: { zafirPaid: true, zafirMet: true },
          ticks: 1,
          goto: 'ch1:pursuit',
          flash: 'He draws the Maw in bone-dust. "False lip on the east. Real cache under the second rib. Do not thank me."',
        },
      },
      {
        id: 'scrap',
        label: 'Pay in scrap',
        show: { item: 'scrap' },
        effects: {
          remove: { scrap: 1 },
          add: { cache_map: 1 },
          flag: { zafirPaid: true, zafirMet: true },
          goto: 'ch1:pursuit',
          ticks: 1,
          flash: 'He takes scrap like it is a language he still speaks.',
        },
      },
      {
        id: 'threat',
        label: 'Crowd him. Demand the heading.',
        tone: 'danger',
        effects: {
          flag: { zafirMet: true, zafirSore: true },
          add: { cache_map: 1 },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'ch1:pursuit',
          flash: 'He hands you a worse map with a better smile. You will not know which lie he kept.',
        },
      },
      {
        id: 'news',
        label: 'Take the free news and walk',
        tone: 'quiet',
        effects: {
          flag: { zafirMet: true },
          ticks: 1,
          goto: 'ch1:pursuit',
          flash: '"Skiff is an hour south and closing. She will bargain. She is very good at remaining the most reasonable person in a murder."',
        },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'map', 'heading', 'maw'],
        reply: 'He taps bone. Pay or threaten or walk. Those are the three religions.',
        effects: { ticks: 1 },
      },
      {
        tags: ['sybella', 'skiff', 'blonde'],
        reply: '"Blindfold up. Kohl ruined. Voice like a lullaby that learned law. Do not be interesting."',
        effects: { flag: { sybellaNamed: true } },
      },
    ],
  },
  {
    id: 'ch1:hollow-edge',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Listening Sand',
    body: `A patch of dune that does not move with the others. Hollow-sign. Low magic lives here: bury a thing you value, and the desert may misplace your hunters. It may also remember your name in a mouth you do not want.

You can save this for Sybella. Or you can spend it now like a coward with foresight.`,
    choices: [
      {
        id: 'later',
        label: 'Keep the option. Move.',
        effects: { goto: 'ch1:trail', flag: { hollowSeen: true } },
      },
      {
        id: 'bury',
        label: 'Bury a Glint now',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          flag: { hollowMarked: true, hollowSeen: true },
          heat: { seekers: -1 },
          sap: -1,
          goto: 'ch1:zafir',
          flash: 'The sand takes the Glint like a tongue. Somewhere a skiff runner hits a rut that was not there.',
        },
      },
    ],
  },
  {
    id: 'ch1:pursuit',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Skiff',
    body: `The sky goes brass.

Sybella's sand-skiff comes in low, runners screaming in the grit. She does not look hurried. Hurry is for people who are not sure.

When she steps down, the blindfold is up on her hair like a discarded halo. Blonde. Kohl ruined under both eyes — not sloppy, ruined on purpose, a funeral that kept walking. She is reasonable the way a closed door is reasonable.

"You are carrying sap like a lantern," she says. "I need a lantern that can walk. Shall we be adults?"`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa does not run. Stilts planted. A second lantern, if Sybella wants to count.`,
      },
    ],
    choices: [
      {
        id: 'talk',
        label: 'Stand still. Hear the bargain.',
        effects: { goto: 'ch1:sybella', ticks: 1 },
      },
    ],
  },
  {
    id: 'ch1:sybella',
    chapterId: 'cache-run',
    kind: 'talk',
    art: 'hunger',
    title: 'Sybella',
    speaker: 'Sybella',
    body: `"Kallik's cache is a pile of Drops next to a mouth. Drink it wrong and you are a stain. Drink it right and you are a battery. I am done being the cup. I will not pour myself again.

Walk with me to the Maw. Fill. Come back useful. Or run, and I will follow you until your sap is a story I tell the sand.

I prefer useful. I am not kind. Those are different sentences."`,
    choices: [
      {
        id: 'bargain',
        label: 'Bargain. Be useful on purpose.',
        effects: { goto: 'ch1:bargain', ticks: 1 },
      },
      {
        id: 'flee',
        label: 'Break for the Maw. Spend everything.',
        tone: 'danger',
        effects: { goto: 'ch1:flee', ticks: 1 },
      },
      {
        id: 'false',
        label: 'Lay a false trail',
        sub: 'Needs scrap, a map, or Ossa.',
        enable: {
          any: [{ item: 'scrap' }, { item: 'cache_map' }, { flag: 'ossaAlly' }],
        },
        locked: 'You need scrap, a cache scratch, or Ossa standing with you.',
        effects: { goto: 'ch1:false', ticks: 1 },
      },
      {
        id: 'hollow',
        label: 'Bury something valued. Call the Hollows.',
        sub: 'Low magic. A real cost.',
        enable: {
          any: [{ item: 'glints' }, { item: 'vial_drop' }, { item: 'kallik_mark' }, { item: 'strider_bit' }],
        },
        locked: 'You must bury a valued thing — Glints, a Drop, Kallik\'s mark, or the Strider bit.',
        effects: { goto: 'ch1:hollow', ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['bargain', 'deal', 'yes', 'useful', 'agree', 'walk'],
        reply: 'You nod like an adult. She almost looks grateful. That is worse.',
        effects: { goto: 'ch1:bargain' },
      },
      {
        tags: ['run', 'flee', 'maw', 'go'],
        reply: 'Sand. Breath. The skiff screams behind you.',
        effects: { goto: 'ch1:flee' },
      },
      {
        tags: ['false', 'trick', 'lie', 'trail', 'ossa'],
        show: { any: [{ item: 'scrap' }, { item: 'cache_map' }, { flag: 'ossaAlly' }] },
        reply: 'You spend a thing. The desert spends a direction.',
        effects: { goto: 'ch1:false' },
      },
      {
        tags: ['bury', 'hollow', 'magic', 'pray'],
        show: { any: [{ item: 'glints' }, { item: 'vial_drop' }, { item: 'kallik_mark' }, { item: 'strider_bit' }] },
        reply: 'You put a valued thing in the listening sand.',
        effects: { goto: 'ch1:hollow' },
      },
      {
        tags: ['attack', 'kill', 'stab', 'hit'],
        reply: 'She does not flinch. "No. We are past that kind of childish." The skiff runners tick like a clock.',
        effects: { heat: { seekers: 1 } },
      },
    ],
  },
  {
    id: 'ch1:bargain',
    chapterId: 'cache-run',
    kind: 'story',
    speaker: 'Sybella',
    title: 'Useful',
    body: `She thumbs kohl from under her eye and paints a mark at the base of your throat. A claim. A receipt.

"Fill yourself at the Maw. Do not become a hymn. Do not become a Cartel story. Come back able to walk with sap in you like a furnace that did not explode. If you lie, I will still use you. I will just use less of you."

The skiff peels away, not far. Hunting is a circling verb.`,
    choices: [
      {
        id: 'on',
        label: 'Walk into Red Maw Approach',
        tone: 'hunger',
        effects: {
          add: { kohl_smear: 1 },
          flag: {
            sybellaBargain: true,
            sybellaHunting: true,
            chapter1Done: true,
            climax: 'bargain',
            ossaAlive: true,
          },
          heat: { seekers: -1 },
          goto: 'ch1:land',
        },
      },
    ],
  },
  {
    id: 'ch1:flee',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Spend Everything',
    body: `You run. The skiff screams. Dunes become stairs. Sap burns out of you like stolen fuel.

A runner clips the slope you just left and throws a sheet of grit that would have taken your face. You keep the face. You lose the easy hours. She will not stop. You knew that when you moved.`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa is still with you, stilts eating distance, alive, cursing your choices in a way that means she has not left.`,
      },
    ],
    choices: [
      {
        id: 'on',
        label: 'Fall into the Maw\'s first shadow',
        tone: 'hunger',
        effects: {
          sap: -2,
          heat: { seekers: 2 },
          flag: { sybellaHunting: true, chapter1Done: true, climax: 'flee', ossaAlive: true },
          remove: { scrap: 1 },
          goto: 'ch1:land',
        },
      },
    ],
  },
  {
    id: 'ch1:false',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'False Trail',
    body: `You spend what you have on a lie the sand can tell.

Scrap becomes a second set of prints. A cache scratch becomes a heading that points at nothing. If Ossa is with you, her stilts plant a story of a woman going west while you go east.

Sybella reads the ground, then the wind, then you — but she is a moment late. Reasonable people hate being late. She will bill you.`,
    choices: [
      {
        id: 'on',
        label: 'Use the moment. Take the Approach.',
        tone: 'hunger',
        effects: {
          flag: { falseTrail: true, sybellaHunting: true, chapter1Done: true, climax: 'false', ossaAlive: true },
          heat: { seekers: 1 },
          remove: { scrap: 1 },
          goto: 'ch1:land',
        },
      },
    ],
  },
  {
    id: 'ch1:hollow',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'A Valued Thing',
    body: `You bury it. The dune takes the offering the way a lock takes a key it might not return.

For a breath the skiff sinks to one runner. Sybella's head turns as if someone said her true name in a room she had sealed. Kohl-black tears do not fall. She will not give the Hollows her water.

You run. Behind you, the buried thing is not silent. That is the bill. It will come due in Red Maw, or later, or in a dream with teeth.`,
    choices: [
      {
        id: 'on',
        label: 'Carry the mark into the Approach',
        tone: 'hunger',
        effects: {
          flag: { hollowMarked: true, sybellaHunting: true, chapter1Done: true, climax: 'hollow', ossaAlive: true },
          sap: -1,
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
    ],
  },
  {
    id: 'ch1:land',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Red Maw Approach',
    body: `The Maw is not a canyon. It is a bite the land never closed. Red rock. Heat that feels personal. The cache is close enough to poison your decisions.

You are not who you were at the start door. The desert has edited you.

Chapter 1 holds. The Approach is harder country. Sybella is not done. Ossa is alive — that matters, and it will keep mattering.`,
    variants: [
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl on your throat. A bargain that thinks it is a future.`,
      },
      {
        if: { flagEq: ['climax', 'flee'] },
        mode: 'append',
        body: `Your lungs are knives. She is behind you like weather.`,
      },
      {
        if: { flagEq: ['climax', 'false'] },
        mode: 'append',
        body: `The false trail bought an hour. Hours are currency. You are already spending it.`,
      },
      {
        if: { flagEq: ['climax', 'hollow'] },
        mode: 'append',
        body: `Something you loved is in the sand, screaming quietly. You and the Maw can both hear it.`,
      },
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa plants her stilts in the Approach shade and starts repairing a lash. She is alive. She looks at you like a plan.`,
      },
      {
        if: { flag: 'ossaRobbed' },
        mode: 'append',
        body: `You will see Ossa again. Alive. That should not comfort you as much as it does.`,
      },
    ],
    choices: [
      {
        id: 'hub',
        label: 'Enter the Approach',
        sub: 'Harder hub. Hunters. The next Hunger waits.',
        tone: 'hunger',
        effects: {
          enterHub: 'redmaw',
          goto: 'maw:rim',
          sap: 3,
          flash: 'Red Maw Approach. The cache is close. So is she. You steal a breath. Sap returns, a little.',
        },
      },
    ],
  },
]

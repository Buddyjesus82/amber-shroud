import type { Scene } from '../types'

// Cache Run spine (every door). Forward exits only except the authored Ossa retry:
//   leave → trail → ossa-meet → (talk | rob | zafir)
//   rob "give back" → talk (then cairn). Steal is blocked after a return.
//   talk / skip / vial / wrench → zafir → sybella → (hollow) → land → maw:rim
//   Unconditional finale: sybella "maw" / "bargain" always set chapter1Done and go to land.
const done = {
  chapter1Done: true,
  ossaAlive: true,
  sybellaHunting: true,
} as const

export const cacheRunScenes: Scene[] = [
  {
    id: 'ch1:leave',
    chapterId: 'cache-run',
    kind: 'story',
    art: 'hunger',
    title: 'Cache Run',
    body: `Want is simple: Kallik's cache at Red Maw. A pile of Drops next to a mouth.

The problem is also simple: a blonde on a sand-skiff who needs a lantern that can walk. You are carrying sap like a signal fire.

Three beats between you and her. Then you spend.`,
    variants: [
      {
        if: { door: 'prisoner' },
        mode: 'append',
        body: `Camp-04 sirens thin. Oil-Tooth's oversized wrench still smells like Strider hull. Scrip will not buy dunes. Cartel Heat will.`,
      },
      {
        if: { door: 'outcast' },
        mode: 'append',
        body: `Noon follows. Silas's tip is a scratch in your palm. The vial is still a dry throat unless you filled it.`,
      },
      {
        if: { door: 'vessel' },
        mode: 'append',
        body: `Oram's map is already a crime. The rusted dagger sits against your ribs. Seeker Heat is a hymn with teeth.`,
      },
      {
        if: { flag: 'cacheBlind' },
        mode: 'append',
        body: `You do not have a real heading. You have panic and a rumor of red rock.`,
      },
    ],
    choices: [
      {
        id: 'go',
        label: 'Take the dune trail',
        sub: 'Beat 1 — how you move is what you carry.',
        tone: 'hunger',
        effects: { goto: 'ch1:trail', ticks: 1, sap: -1, pressure: 1 },
      },
    ],
  },
  {
    id: 'ch1:trail',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Dune Trail',
    body: `Wind writes the same sentence on every slope: keep moving.

The straight wash is naked. A culvert grate rusts in the cut. Stilt-prints tick left. Heat-haze south could be a skiff — or a wish.`,
    variants: [
      {
        if: { heatMin: ['cartel', 3] },
        mode: 'append',
        body: `Cartel Heat has a smell. Shard-Hound dust on the wash. Linger and Valerius writes your name in grit.`,
      },
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `Seeker Heat has a sound: runners, still far, already angling. Thalia's love made you loud.`,
      },
      {
        if: { heatMin: ['strays', 2] },
        mode: 'append',
        body: `Stray country recognizes its own. The shade-cuts are real if you were sold one.`,
      },
      {
        if: { item: 'silas_tip' },
        mode: 'append',
        body: `Silas's scratch matches a rib of rock the wash pretends not to have.`,
      },
      {
        if: { item: 'oram_map' },
        mode: 'append',
        body: `Oram's feed-pencil marks the second rib. You could walk like you already know.`,
      },
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `The culvert bolts are Camp-04 cheap. The wrench knows that language.`,
      },
    ],
    choices: [
      {
        id: 'wrench',
        label: 'Wrench the culvert',
        sub: 'Pry the grate. Stay off the naked wash.',
        show: { item: 'wrench' },
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flag: { wrenchCut: true },
          flash: 'Bolts complain. You crawl the dark. Hounds lose a minute. Cartel Heat does not.',
        },
      },
      {
        id: 'silas',
        label: "Walk Silas's shade-cut",
        sub: 'The tip keeps you off the noon slope. Sap holds.',
        show: { item: 'silas_tip' },
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          flag: { silasCut: true },
          flash: "Shade like a stolen minute. The tip is still in your palm — unused, unless you spend it later.",
        },
      },
      {
        id: 'oram',
        label: "Follow Oram's heading",
        sub: 'Skip getting lost. Seeker Heat notices a confident cup.',
        show: { item: 'oram_map' },
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { oramHeading: true },
          flash: "You walk like a ledger. The map is still yours. The skiff likes certainty.",
        },
      },
      {
        id: 'straight',
        label: 'Take the straight wash',
        sub: 'Fast. Exposed. Sap burns.',
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -2,
          pressure: 1,
          flag: { washRun: true },
        },
      },
      {
        id: 'stilts',
        label: 'Follow the stilt-prints',
        sub: 'Someone is alive out here on purpose.',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, sap: -1, flag: { followedStilts: true } },
      },
      {
        id: 'ridge',
        label: 'Climb the high ridge',
        sub: 'You will see the skiff. It may see you.',
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { sawSkiff: true },
        },
      },
    ],
    intents: [
      {
        tags: ['ossa', 'stilt', 'tracks', 'follow', 'woman'],
        reply: 'The prints are a person who refused to sink. You follow.',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, sap: -1, flag: { followedStilts: true } },
      },
      {
        tags: ['wrench', 'grate', 'culvert', 'pry', 'bolt'],
        show: { item: 'wrench' },
        reply: 'Bolts. Dark. The wash goes on without you.',
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -1,
          heat: { cartel: 1 },
          flag: { wrenchCut: true },
        },
      },
      {
        tags: ['silas', 'shade', 'tip', 'cut'],
        show: { item: 'silas_tip' },
        reply: 'You take the cut he sold. Noon misses a bite.',
        effects: { goto: 'ch1:ossa-meet', ticks: 1, flag: { silasCut: true } },
      },
      {
        tags: ['oram', 'map', 'heading', 'rib'],
        show: { item: 'oram_map' },
        reply: "Feed-pencil doesn't lie as often as hymns.",
        effects: {
          goto: 'ch1:ossa-meet',
          ticks: 1,
          sap: -1,
          heat: { seekers: 1 },
          flag: { oramHeading: true },
        },
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
    id: 'ch1:ossa-meet',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'Stilts',
    speaker: 'Ossa',
    body: `Beat 2 is a living person.

Ossa stands three feet above the hungry sand on stilts lashed with cord repaired more times than made. A vial rides her hip, half-full, honest. She sees your kit before she sees your face.

"If you came to rob a woman on sticks," she says, "you should have eaten first. I fall funny."`,
    variants: [
      {
        if: { flag: 'silasCut' },
        mode: 'append',
        body: `"Silas still selling shade to thirsty people," she adds. "That means you might be stupid. Not necessarily cruel."`,
      },
      {
        if: { item: 'ceremonial_cloth' },
        mode: 'append',
        body: `Her eyes snag on the gold thread. "Cups don't walk this wash unless they are lying or hunting. Both are expensive."`,
      },
      {
        if: { item: 'wrench' },
        mode: 'append',
        body: `A lash on her left stilt is failing. The wrench would make a lever. She has not asked.`,
      },
      {
        if: { item: 'vial_empty' },
        mode: 'append',
        body: `She hears the empty glass tick. "That sound is a kind of honesty. Don't waste it."`,
      },
    ],
    choices: [
      {
        id: 'hail',
        label: 'Hail her like a person',
        effects: { goto: 'ch1:ossa-talk', flag: { ossaMet: true }, ticks: 1 },
      },
      {
        id: 'vial',
        label: 'Show the empty vial',
        sub: 'Thirst as a credential. Stray lean.',
        show: { all: [{ item: 'vial_empty' }, { not: { item: 'vial_drop' } }] },
        effects: {
          sap: 1,
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, emptyShown: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:zafir',
          flash:
            'She does not give you her Drop. She wets your lip from a smear in the lash-wax. "I don\'t die easy. Neither do empty glasses that admitted it." A twice-tied knot lands in your palm.',
        },
      },
      {
        id: 'wrench',
        label: 'Lever her failing lash',
        sub: 'Use the wrench. Keep the wrench.',
        show: { item: 'wrench' },
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true },
          add: { ossa_token: 1 },
          ticks: 1,
          goto: 'ch1:zafir',
          flash: 'Steel against cord. The stilt seats. She nods like a receipt. "Zafir is at the cairn. I can stand with you when the skiff comes."',
        },
      },
      {
        id: 'dagger',
        label: 'Keep the rusted dagger visible',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          goto: 'ch1:ossa-talk',
          flag: { ossaMet: true, ossaWary: true },
          ticks: 1,
          heat: { strays: 1 },
          flash: 'She watches your hands now. Stilts do not mean weak. Stilts mean she understood the ground.',
        },
      },
      {
        id: 'steal',
        label: 'Lunge for the vial',
        tone: 'danger',
        effects: { goto: 'ch1:ossa-rob', flag: { ossaMet: true }, ticks: 1 },
      },
      {
        id: 'skip',
        label: 'Pass her. The cairn is the heading.',
        tone: 'quiet',
        effects: { goto: 'ch1:zafir', flag: { ossaMet: true, ossaAlive: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'grab', 'take', 'vial', 'rob'],
        reply: 'You go for the hip. The desert tilts.',
        effects: { goto: 'ch1:ossa-rob' },
      },
      {
        tags: ['help', 'wrench', 'lash', 'fix', 'repair'],
        show: { item: 'wrench' },
        reply: 'You seat the lash. She lets you keep the steel.',
        effects: {
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, wrenchLash: true },
          add: { ossa_token: 1 },
          goto: 'ch1:zafir',
        },
      },
      {
        tags: ['empty', 'vial', 'thirst', 'dry'],
        show: { item: 'vial_empty' },
        reply: 'Honesty about thirst is a Stray password.',
        effects: {
          sap: 1,
          flag: { ossaMet: true, ossaAlive: true, ossaAlly: true, emptyShown: true },
          add: { ossa_token: 1 },
          goto: 'ch1:zafir',
        },
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

She is alive. Angry. Breathing. "Walk," she says, from the ground. "If Sybella asks, I will describe your back."`,
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
          flag: { ossaAlive: true, ossaWary: true, ossaMet: true, ossaReturned: true },
          unsetFlag: ['ossaRobbed'],
          goto: 'ch1:ossa-talk',
          flash: 'She takes the vial without thanks. Thanks would be a lie. The cairn is still ahead.',
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
    body: `"Kallik's cache is bait with a building around it. Zafir sells maps at the bone cairn. Sybella wants a walking battery. If that's you, don't tell her.

I go to Red Maw because the stilts work better where the sand is honest about wanting you."`,
    variants: [
      {
        if: { flag: 'ossaRobbed' },
        mode: 'replace',
        body: `She looks at you like weather she will outlast. The stilts are back under her. The vial is not. She is still alive. That fact is now a debt with teeth.`,
      },
      {
        if: { flag: 'ossaWary' },
        mode: 'append',
        body: `She has not forgotten your hands.`,
      },
    ],
    choices: [
      {
        id: 'share',
        label: 'Offer a Drop',
        show: { all: [{ item: 'vial_drop' }, { flagUnset: 'ossaRobbed' }] },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, ossa_token: 1 },
          flag: { ossaAlly: true, ossaAlive: true },
          ticks: 1,
          goto: 'ch1:zafir',
          flash:
            'She pockets it for a worse hour. A knot of stilt-cord lands in your palm. Twice-tied. "I don\'t die easy. Neither do my debts."',
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
          flash: 'She shortens her stride so a person without stilts can pretend to keep up.',
        },
      },
      {
        id: 'on',
        label: 'On to the cairn',
        tone: 'quiet',
        effects: { goto: 'ch1:zafir', flag: { ossaAlive: true, ossaMet: true }, ticks: 1 },
      },
    ],
    intents: [
      {
        tags: ['steal', 'rob', 'vial', 'take'],
        show: { all: [{ flagUnset: 'ossaRobbed' }, { flagUnset: 'ossaReturned' }] },
        reply: 'Second chances at theft are how graves get filled.',
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
    body: `Beat 3 is a shop made of other people's mistakes.

Zafir smiles in a way that costs extra. "You look like Hunger. I sell headings to Kallik's hole. I also sell the news that Sybella already knows you're coming. Pick the product that hurts less."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa stays at the edge of his shade, stilts planted, a second opinion with a shadow.`,
      },
      {
        if: { item: 'oram_map' },
        mode: 'append',
        body: `His eyes flick to the feed-pencil crease. "Oram still thinks animals are scripture. That heading is better than mine. I hate admitting that."`,
      },
      {
        if: { item: 'silas_tip' },
        mode: 'append',
        body: `"You smell like Silas's tent. He still sending me thirsty people with scratches in their palms?"`,
      },
      {
        if: { item: 'scrip' },
        mode: 'append',
        body: `He sniffs the scrip on you. "Ironwood lullabies. I can pretend they are money."`,
      },
      {
        if: { heatMin: ['seekers', 3] },
        mode: 'append',
        body: `"Seekers are paying for news of a walking cup. You are expensive gossip."`,
      },
    ],
    choices: [
      {
        id: 'oram',
        label: "Show Oram's map. Skip the fee.",
        show: { item: 'oram_map' },
        effects: {
          flag: { zafirPaid: true, zafirMet: true, oramShown: true },
          ticks: 1,
          heat: { seekers: 1 },
          goto: 'ch1:sybella',
          flash: 'He confirms the second rib with a grimace. You keep the map. The skiff likes people who already know the way.',
        },
      },
      {
        id: 'silas',
        label: "Spend Silas's tip for the heading",
        show: { item: 'silas_tip' },
        effects: {
          remove: { silas_tip: 1 },
          add: { cache_map: 1 },
          flag: { zafirPaid: true, zafirMet: true, silasNamed: true },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'Stray-to-stray. He draws the Maw in bone-dust and keeps the scratch. The tip is spent.',
        },
      },
      {
        id: 'buy',
        label: 'Buy the heading for a Glint',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          add: { cache_map: 1 },
          flag: { zafirPaid: true, zafirMet: true },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'He draws the Maw in bone-dust. "False lip on the east. Real cache under the second rib."',
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
          goto: 'ch1:sybella',
          ticks: 1,
          flash: 'He takes scrap like it is a language he still speaks.',
        },
      },
      {
        id: 'scrip',
        label: 'Pay in Cartel scrip',
        show: { item: 'scrip' },
        effects: {
          remove: { scrip: 1 },
          add: { cache_map: 1 },
          flag: { zafirMet: true, zafirScrip: true, zafirSore: true },
          heat: { cartel: 1 },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'He takes paper that only Ironwood loves. The heading he draws has a lie in it. Cartel Heat ticks up anyway — scrip leaves a trail.',
        },
      },
      {
        id: 'dagger',
        label: 'Crowd him with the rusted dagger',
        show: { item: 'rusted_dagger' },
        tone: 'danger',
        effects: {
          flag: { zafirMet: true, zafirSore: true },
          add: { cache_map: 1 },
          heat: { strays: 1 },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: 'He hands you a map with a smile that will outlive you if he gets a vote.',
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
          goto: 'ch1:sybella',
          flash: 'He hands you a worse map with a better smile.',
        },
      },
      {
        id: 'news',
        label: 'Take the free news and walk',
        tone: 'quiet',
        effects: {
          flag: { zafirMet: true },
          ticks: 1,
          goto: 'ch1:sybella',
          flash: '"Skiff is closing. She will bargain. She is very good at remaining the most reasonable person in a murder."',
        },
      },
    ],
    intents: [
      {
        tags: ['kallik', 'cache', 'map', 'heading', 'maw', 'oram'],
        reply: 'He taps bone and lets you keep walking. The heading is spent. The skiff is the next mouth.',
        effects: { ticks: 1, flag: { zafirMet: true }, goto: 'ch1:sybella' },
      },
      {
        tags: ['sybella', 'skiff', 'blonde'],
        reply: '"Blindfold up. Kohl ruined. Voice like a lullaby that learned law. Do not be interesting."',
        effects: { flag: { sybellaNamed: true } },
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
    body: `The sky goes brass. The skiff comes in low.

Hard choice. Resource poker. No dice — only what you still have.

Sybella steps down, blindfold up like a discarded halo, kohl ruined on purpose. "You are carrying sap like a lantern. I need a lantern that can walk. Spend something, or I write the receipt myself."`,
    variants: [
      {
        if: { flag: 'ossaAlly' },
        mode: 'append',
        body: `Ossa does not run. Stilts planted. A second lantern, if she wants to count.`,
      },
      {
        if: { sapMax: 2 },
        mode: 'append',
        body: `Your sap is thin. Fleeing is a wish unless you burn what is left.`,
      },
    ],
    choices: [
      {
        id: 'maw',
        label: 'Push past her into Red Maw Approach',
        sub: 'Chapter end. She follows. You still arrive.',
        tone: 'hunger',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'push', sybellaBargain: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash:
            'You walk the last wash like a person who has already paid. She lets you. Hunting is cheaper when the battery delivers itself.',
        },
      },
      {
        id: 'sap',
        label: 'Spend sap. Stand in the wash.',
        sub: 'Look expensive to break.',
        enable: { sapMin: 2 },
        locked: 'Sap too thin to stand as a furnace.',
        effects: {
          sap: -2,
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'sap', sybellaBargain: true },
          goto: 'ch1:land',
          flash: 'You burn fuel where she can see it. She thumbs kohl at your throat anyway — a softer receipt. You cost too much to crack today.',
        },
      },
      {
        id: 'glint',
        label: 'Burn a Glint',
        sub: 'Toss a spark. Buy a delay. Not magic — money.',
        show: { item: 'glints' },
        effects: {
          remove: { glints: 1 },
          flag: { ...done, climax: 'glint' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash: 'The Glint skips like a coin into a worse religion. She tracks the spark a breath too long. You take the Approach.',
        },
      },
      {
        id: 'hollow',
        label: 'Bait the Hollows',
        sub: 'Bury a valued thing. Low magic. A real bill.',
        enable: {
          any: [
            { item: 'glints' },
            { item: 'vial_drop' },
            { item: 'kallik_mark' },
            { item: 'strider_bit' },
            { item: 'ceremonial_cloth' },
            { item: 'rusted_dagger' },
            { item: 'wrench' },
            { item: 'silas_tip' },
          ],
        },
        locked: 'You must bury a valued thing — Glint, Drop, mark, bit, cloth, dagger, wrench, or Silas\'s tip.',
        effects: { goto: 'ch1:hollow', ticks: 1 },
      },
      {
        id: 'flee',
        label: 'Flee. Spend the legs you have.',
        sub: 'Sap burns. Seeker Heat climbs.',
        tone: 'danger',
        enable: { sapMin: 1 },
        locked: 'Legs without sap are a wish.',
        effects: {
          sap: -3,
          heat: { seekers: 2 },
          flag: { ...done, climax: 'flee' },
          goto: 'ch1:land',
          flash: 'Dunes become stairs. A runner clips the slope you just left. You keep the face. You lose the easy hours.',
        },
      },
      {
        id: 'false',
        label: 'Lay a false trail',
        sub: 'Spend scrap, wrench, a map, Silas\'s tip, the dagger, or Ossa.',
        enable: {
          any: [
            { item: 'scrap' },
            { item: 'wrench' },
            { item: 'cache_map' },
            { item: 'oram_map' },
            { item: 'rusted_dagger' },
            { item: 'silas_tip' },
            { flag: 'ossaAlly' },
          ],
        },
        locked: 'You need scrap, a tool, a heading, Silas\'s tip, or Ossa standing with you.',
        effects: {
          flag: { ...done, climax: 'false', falseTrail: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
          flash: 'You spend what the sand can tell as a lie. She is a moment late. Reasonable people hate being late.',
        },
      },
      {
        id: 'bargain-drop',
        label: 'Bargain. Spend a Drop so she thinks you are already a furnace.',
        show: { item: 'vial_drop' },
        effects: {
          remove: { vial_drop: 1 },
          add: { vial_empty: 1, kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true, bargainDrop: true },
          heat: { seekers: -1 },
          goto: 'ch1:land',
          flash: 'She watches you pour. Kohl at your throat. "Useful. Do not become a hymn." The skiff peels — not far.',
        },
      },
      {
        id: 'bargain',
        label: 'Bargain empty-handed',
        tone: 'quiet',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true },
          goto: 'ch1:land',
          flash: 'She writes the receipt on your throat. You will fill at the Maw. She will use you. Kind is a different sentence.',
        },
      },
    ],
    intents: [
      {
        tags: ['bargain', 'deal', 'yes', 'useful', 'agree', 'walk', 'maw', 'approach', 'red'],
        reply: 'You nod like an adult. She almost looks grateful. That is worse.',
        effects: {
          add: { kohl_smear: 1 },
          flag: { ...done, climax: 'bargain', sybellaBargain: true },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['run', 'flee', 'maw', 'go'],
        show: { sapMin: 1 },
        reply: 'Sand. Breath. The skiff screams behind you.',
        effects: {
          sap: -3,
          heat: { seekers: 2 },
          flag: { ...done, climax: 'flee' },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['glint', 'burn', 'toss', 'coin', 'pay'],
        show: { item: 'glints' },
        reply: 'A spark. A delay. She hates delays.',
        effects: {
          remove: { glints: 1 },
          flag: { ...done, climax: 'glint' },
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['false', 'trick', 'lie', 'trail', 'ossa'],
        show: {
          any: [
            { item: 'scrap' },
            { item: 'wrench' },
            { item: 'cache_map' },
            { item: 'oram_map' },
            { item: 'rusted_dagger' },
            { item: 'silas_tip' },
            { flag: 'ossaAlly' },
          ],
        },
        reply: 'You spend a thing. The desert spends a direction.',
        effects: {
          flag: { ...done, climax: 'false', falseTrail: true },
          heat: { seekers: 1 },
          goto: 'ch1:land',
        },
      },
      {
        tags: ['bury', 'hollow', 'magic', 'pray', 'bait'],
        show: {
          any: [
            { item: 'glints' },
            { item: 'vial_drop' },
            { item: 'kallik_mark' },
            { item: 'strider_bit' },
            { item: 'ceremonial_cloth' },
            { item: 'rusted_dagger' },
            { item: 'wrench' },
            { item: 'silas_tip' },
          ],
        },
        reply: 'You put a valued thing in the listening sand.',
        effects: { goto: 'ch1:hollow' },
      },
      {
        tags: ['attack', 'kill', 'stab', 'hit', 'dagger'],
        reply: 'She does not flinch. "No. We are past that kind of childish." The skiff runners tick like a clock.',
        effects: { heat: { seekers: 1 } },
      },
    ],
  },
  {
    id: 'ch1:hollow',
    chapterId: 'cache-run',
    kind: 'story',
    title: 'A Valued Thing',
    body: `You bury it. The dune takes the offering the way a lock takes a key it might not return.

For a breath the skiff sinks to one runner. Sybella's head turns as if someone said her true name in a room she had sealed. You run. Behind you, the buried thing is not silent. That is the bill.`,
    choices: [
      {
        id: 'on',
        label: 'Carry the mark into the Approach',
        tone: 'hunger',
        effects: {
          flag: { ...done, climax: 'hollow', hollowMarked: true },
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
    onEnter: { flag: { chapter1Done: true, ossaAlive: true, sybellaHunting: true } },
    body: `The Maw is a bite the land never closed. The cache is close enough to poison your decisions.

Chapter 1 holds. What you spent is the person you are now.`,
    variants: [
      {
        if: { flagEq: ['climax', 'bargain'] },
        mode: 'append',
        body: `Kohl on your throat. A bargain that thinks it is a future.`,
      },
      {
        if: { flagEq: ['climax', 'push'] },
        mode: 'append',
        body: `You did not spend a pretty thing. You spent the last walk. Kohl anyway. She is still behind you.`,
      },
      {
        if: { flag: 'bargainDrop' },
        mode: 'append',
        body: `The Drop you poured bought a softer leash. Softer is still a leash.`,
      },
      {
        if: { flagEq: ['climax', 'flee'] },
        mode: 'append',
        body: `Your lungs are knives. She is behind you like weather. Seeker Heat will not cool in the Approach.`,
      },
      {
        if: { flagEq: ['climax', 'false'] },
        mode: 'append',
        body: `The false trail bought an hour. Hours are currency. You are already spending it.`,
      },
      {
        if: { flagEq: ['falseSpent', 'wrench'] },
        mode: 'append',
        body: `The wrench is in the sand now, telling a story of a prisoner who went west.`,
      },
      {
        if: { flagEq: ['falseSpent', 'oram_map'] },
        mode: 'append',
        body: `Oram's map is a lie pointing the other way. He would hate that. He might also understand.`,
      },
      {
        if: { flagEq: ['falseSpent', 'silas_tip'] },
        mode: 'append',
        body: `Silas's scratch just bought you a direction that is not yours. Stray-to-stray, spent.`,
      },
      {
        if: { flagEq: ['climax', 'hollow'] },
        mode: 'append',
        body: `Something you loved is in the sand, screaming quietly. You and the Maw can both hear it.`,
      },
      {
        if: { flagEq: ['climax', 'glint'] },
        mode: 'append',
        body: `One Glint poorer. One breath richer. She will bill the delay in Red Maw.`,
      },
      {
        if: { flagEq: ['climax', 'sap'] },
        mode: 'append',
        body: `You stood as a furnace and paid in sap. The kohl receipt is lighter. Your glass is not.`,
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

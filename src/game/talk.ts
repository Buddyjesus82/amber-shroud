import { PERSON_VOICE, pickLine, VOICES, voiceForSpeaker } from './voices'
import { HEAR_PLAN, PLAN_HEARD, PLAN_UNHEARD } from './campJob'
import { personAtScene, type PersonId } from './people'
import type { IntentRule } from './types'

const TALK = ['ask', 'talk', 'hello', 'hi', 'hey', 'say', 'tell', 'speak', 'greet']
const HELP = ['help', 'aid', 'favor']
const THREAT = ['threaten', 'threat', 'intimidate', 'attack', 'kill', 'stab', 'hit', 'fight', 'punch', 'bite']
const TRADE = ['trade', 'buy', 'sell', 'shop', 'barter', 'deal', 'price']

const oiltooth: IntentRule[] = [
  {
    tags: ['plan', 'what plan', 'ask about plan', 'his plan', 'your plan', 'the plan', 'way out', 'get out'],
    show: PLAN_UNHEARD,
    reply: 'He grins around the brass. "Glad you asked."',
    effects: { ...HEAR_PLAN },
  },
  {
    tags: TALK,
    show: PLAN_UNHEARD,
    reply: 'Brass ticks. "Bleed-Cut. Valerius is the problem. I have a plan to get out of here. Ask about it."',
    effects: { ticks: 1 },
  },
  {
    tags: TALK,
    show: { all: [PLAN_HEARD, { flagUnset: 'kaelenKnown' }] },
    reply:
      'Brass ticks. "Bleed-Cut. Sabotage the station. I hotwire. That is the talk. Want rumors? There is a trader at the Wire who deals goods."',
    effects: { ticks: 1 },
  },
  {
    tags: TALK,
    show: { all: [PLAN_HEARD, { flag: 'kaelenKnown' }] },
    reply:
      'Brass ticks. "Bleed-Cut. Sabotage the station. I hotwire. That is the talk. Kaelen sells rumors at the Wire if you wanted a different mouth."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: PLAN_UNHEARD,
    reply: '"Help me with my plan and I help you out of here. Ask about it."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { all: [{ flagUnset: 'jaxsonInside' }, PLAN_HEARD] },
    reply:
      '"Help is the job. You take the west steam-vent. I take a Strider. Traders can wait. I am the ride."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { all: [{ flag: 'jaxsonInside' }, { flagUnset: 'guardDown' }] },
    reply: 'He raps the brass. "You already said yes. Guard station. West bolt. I will be under a hull when it screams."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { flag: 'guardDown' },
    reply: '"Station is coughing. Bay. Hull. That was help. Ride when you have a heading — or ride stupid."',
    effects: { ticks: 1 },
  },
  {
    tags: [...TRADE, 'trader', 'merchant', 'fence', 'goods', 'rumor', 'heading'],
    show: { flagUnset: 'kaelenKnown' },
    reply:
      '"I do not sell Drops. I do not sell headings. There is a trader at the Wire who does — Kaelen the Sifter. Scrap for a Drop. Glints for intel. I sell a Strider that is not theirs to sell."',
    effects: { ticks: 1, flag: { kaelenKnown: true } },
  },
  {
    tags: TRADE,
    show: { flag: 'kaelenKnown' },
    reply:
      '"I do not sell Drops. I do not sell headings. Kaelen the Sifter is the shop. Wire. Scrap for a Drop. Glints for intel. I sell a Strider that is not theirs to sell."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply:
      'The smirk holds. The wrench does not. "Humor is a shield. Do not make me put it down. Valerius is the throat you want, not mine."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: ['drop', 'sap', 'vial', 'thirst'],
    show: { flagUnset: 'kaelenKnown' },
    reply:
      '"I skimmed Oasis Sap for a lifetime of bolts. I do not pour it into cups that have not taken the job. Ask nicer, or find the trader at the Wire."',
    effects: { ticks: 1 },
  },
  {
    tags: ['drop', 'sap', 'vial', 'thirst'],
    show: { flag: 'kaelenKnown' },
    reply:
      '"I skimmed Oasis Sap for a lifetime of bolts. I do not pour it into cups that have not taken the job. Ask nicer, or ask Kaelen."',
    effects: { ticks: 1 },
  },
]

const kaelen: IntentRule[] = [
  {
    tags: TALK,
    reply: 'The gloves pause. "Talk is not a product. Drops. Intel. Rumors. Pick a shelf or pick a price."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { door: 'vessel' },
    reply: '"Help is a church word. I do arithmetic. Scrap in, Drop out. Glints in, heading out. Oram still counts Striders. I do not ride them."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is a church word. I do arithmetic. Scrap in, Drop out. Glints in, heading out. Oil-Tooth still hotwires."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    show: { door: 'vessel' },
    reply: '"Scrap buys a Drop. Glints buy a heading that is not a hymn. Buy and Sell are shelves. I do not take blessing as coin."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"Scrap buys a Drop of Oasis Sap. Glints buy intel. Buy and Sell are shelves — knife and cloak when the pack has them. Cost. Profit."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'He does not step back. He reprices you. "Violence is loud inventory. I sell quieter trouble. Do not make me lose a customer."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const valerius: IntentRule[] = [
  {
    tags: TALK,
    reply: '"Out of position is the whole conversation. Useful scrapes. Escaped spends a Hound. Oil-Tooth thinks I cannot hear his jokes from the tower. I hear every one. Pick which line I write."',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: HELP,
    reply: 'He almost smiles. Help from Valerius is a cage that walks. "Work the line. That is mercy."',
    effects: { sap: -1, ticks: 1, heat: { cartel: -1 } },
  },
  {
    tags: TRADE,
    reply: '"Ironwood does not haggle with penniless labor. Scrip is a lullaby. A chip is a door. Neither is friendship."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'Steam in the baton. "Steel is a language. I am fluent. The Yard is where that sentence ends."',
    effects: { heat: { cartel: 2 }, pressure: 2, ticks: 1 },
  },
]

const rell: IntentRule[] = [
  {
    tags: TALK,
    reply: '"Laborer 04-bleed is the whole conversation. Papers. Scrip. Or a Hound. Pick which line I write."',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: HELP,
    reply: 'Help from a clerk is a filing that walks. "Clock in. That is mercy."',
    effects: { ticks: 1, heat: { cartel: 1 } },
  },
  {
    tags: TRADE,
    reply: '"Ironwood does not haggle on the wash. Scrip is a lullaby. A chip is a door. Neither is a heading."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The tablet does not flinch. "Steel is a language. Hounds are fluent. I only write."',
    effects: { heat: { cartel: 2 }, pressure: 1, ticks: 1 },
  },
]

const silas: IntentRule[] = [
  {
    tags: TALK,
    reply: 'Milk eye. Accounting eye. He does not look at the brand. "Talk is not free. Shade is not free. Ask like you mean to pay, Noon-Empty."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { sapMax: 3 },
    reply: 'He looks at the empty sound in your kit. "Once, because the Spine is uglier as a graveyard. Buttons still cost. Mercy is a rumor I stock."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is shade by the minute. Drops if you pay. Headings if you listen. I sell the minute you spend out of the sun."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"Drops, salve, a wrap, a cloak, a needle for resin. Glints or scrap. I do not take Cartel scrip. Scrip tastes like a leash."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: '"I have buried men for less, and I am tired. Do not make me less tired."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const drennick: IntentRule[] = [
  {
    tags: TALK,
    reply: 'He talks to the air beside your head. "You know what you did. My crew went into the Bleed and I came out alone. I know what it is to be the one who walks out. I collect anyway. Pay or run noon."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is a Glint, a scratch, or empty glass. I do not pour. I tax. I also do not let thirsty people die in my shade, so pay me."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"Glint for the cut. Scratch as a password. Empty vial if you are honest. I do not take Cartel scrip."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The minute-knife stays a minute-knife. "Run noon. I will name you. Stilts hear names."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const brin: IntentRule[] = [
  {
    tags: TALK,
    reply: '"Thalia\'s love made you loud. Pour. Show the cloth. Or we take you to the blonde already."',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is the blonde. We are the net. Cups that hide are already cracked."',
    effects: { ticks: 1, heat: { seekers: 1 } },
  },
  {
    tags: TRADE,
    reply: '"The Court does not sell on the hymn-road. Pour or walk. Zafir will not shop a furnace either."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'Spears do not flinch. "No. We are past that kind of childish."',
    effects: { heat: { seekers: 2 }, pressure: 1, ticks: 1 },
  },
]

const oiltoothRoad: IntentRule[] = [
  {
    tags: TALK,
    reply:
      'Brass ticks. "I hotwired. I will not tour. Ride the last mile and I drop you with Ossa, walk east on your own, or I cut the Cartel tag out of your cuff. Red Maw is east, the way I am not willing to go."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is a drop-off with Ossa, or a quieter cuff. I do not sell headings. Kaelen still charges. I go west."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"I do not sell Drops on a stolen hull. I sell a mile you might survive. Ossa is east. I go west."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The smirk holds. The wrench does not. "Humor is a shield. Do not make me put it down on my own ride."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const zafirCup: IntentRule[] = [
  {
    tags: TALK,
    reply: '"I don\'t sell headings to walking batteries. I sell the news that she already knows. Walk or buy a curse."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is the blonde\'s word. I sell delays to people who are not lanterns."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"This cairn does not shop walking batteries. News is free and worse. Pay for a curse if you like ink."',
    effects: { ticks: 1, flag: { zafirMet: true, zafirCup: true } },
  },
  {
    tags: THREAT,
    reply: 'The smile costs extra. "Crowd a man who will not shop a cup and the map grows a lie."',
    effects: { heat: { strays: 1 }, flag: { zafirSore: true }, ticks: 1 },
  },
  {
    tags: ['sybella', 'skiff', 'blonde', 'shadow'],
    reply: '"Blindfold up. Kohl ruined. She will collect. I sold that news already."',
    effects: { flag: { sybellaNamed: true }, ticks: 1 },
  },
]

const zafir: IntentRule[] = [
  {
    tags: TALK,
    reply: '"You lived. How rude. Headings, news, and now a stall that actually sells things — Hound Hide, a baton if the Maw pawned one, Drops at Approach prices. Pick a product."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Help is a heading or a hide. I do not walk you into the Maw. I sell you the chance to walk wrong more slowly."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply:
      '"Glints buy a Drop. Two scrap I will call a Glint. Hound Hide if you have not worn one. A shock baton if Ironwood dropped it. Buy is one shelf. Sell is the other. News is still free and worse."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The smile costs extra. "Crowd me and the map grows a lie. I have already survived you once. Do not make the receipt interesting."',
    effects: { heat: { strays: 1 }, flag: { zafirSore: true }, ticks: 1 },
  },
  {
    tags: ['sybella', 'skiff', 'blonde', 'shadow'],
    reply: '"Blindfold up. Kohl ruined. She will collect. I sell delays, not pardons."',
    effects: { flag: { sybellaNamed: true }, ticks: 1 },
  },
]

const ossa: IntentRule[] = [
  {
    tags: TALK,
    show: { all: [{ door: 'outcast' }, { flagUnset: 'ossaAlly' }] },
    reply: 'She looks past the brand to your eyes. "Ask me for water. Talk can wait."',
    effects: { ticks: 1 },
  },
  {
    tags: TALK,
    reply: '"I\'m alive. That is the greeting and the warning. Stilts. Vial. I might walk the lip next Hunger. I might not."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { flag: 'ossaAlly' },
    reply: 'She almost smiles. "You already helped. Knot still holds. I do not need a second sermon."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { flag: 'ossaRobbed' },
    reply: '"Help a woman you already un-helped? Shade is closed. Alive is still the headline."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: 'She weighs you like weather. "Help is not stealing. Help is a lash seated, a vial admitted empty, a person left standing."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"I do not keep a stall. Zafir does, at the cairn and the Bone Market. I keep stilts and a Drop I intend to keep."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'Stilts do not mean weak. "I fall funny. You will not like the landing."',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: ['sorry', 'apologize', 'forgive'],
    show: { flag: 'ossaRobbed' },
    reply: 'She lets the word sit. Alive is still the headline. Forgive is not on the receipt.',
    effects: { ticks: 1 },
  },
]

const sybella: IntentRule[] = [
  {
    tags: TALK,
    reply: '"The Approach is patient. So am I. Talk is how the sand gets a longer look at you. Do not stall."',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: HELP,
    show: { door: 'vessel' },
    reply: '"Fill. Walk. Don\'t crack. That is the help the faith gives. I do not aid the others."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"I hunt. I do not pour. The old roads remember who waits."',
    effects: { heat: { seekers: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"I do not sell. I collect. Zafir sells delays at the market. I sell the idea that you still have time."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The Approach is too small for that theater. She lets you keep the impulse. She writes it down.',
    effects: { heat: { seekers: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: ['bargain', 'deal', 'useful', 'furnace', 'battery'],
    reply: 'She already wrote that contract in kohl. Repeating it does not make it kinder.',
    effects: { ticks: 1 },
  },
]

const thalia: IntentRule[] = [
  {
    tags: TALK,
    reply: '"Vessel. Cup. The desert poured itself into a person and chose you." She will not quite touch.',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: 'Help, to Thalia, is being poured. "Let me finish the hymn. The Maw will finish you if I do not."',
    effects: { heat: { seekers: 1 }, ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"The Court does not sell. The Court fills. If you want a thief\'s bargain, that is not my mouth."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'Gold on the cheeks cracks toward a verdict. Love and a spear are cousins here.',
    effects: { heat: { seekers: 2 }, pressure: 2, ticks: 1 },
  },
]

const oram: IntentRule[] = [
  {
    tags: TALK,
    reply: '"You\'re a better thief than a cup. Talk less. Ride before Thalia finishes turning love into a net."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"I already gave you the heading. That is help. I want the Striders alive. Do not make me choose you over them twice."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"I count feed. Take the map and leave the animals their names."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'He still does not look up. "Violence in a paddock gets the Striders hurt. I will report a heresy before I let you do that."',
    effects: { heat: { seekers: 1 }, pressure: 1, ticks: 1 },
  },
]

function match(sceneId: string, tests: (string | ((id: string) => boolean))[]): boolean {
  return tests.some((t) => (typeof t === 'string' ? sceneId === t || sceneId.startsWith(t) : t(sceneId)))
}

const korvan: IntentRule[] = [
  {
    tags: TALK,
    show: { flagUnset: 'korvanTook' },
    reply: '"Ask me about Red Maw, the east wash, or the amber. Not about your mark."',
    effects: { ticks: 1 },
  },
  {
    tags: TALK,
    show: { flag: 'korvanTook' },
    reply: 'He keeps his back to you.',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    reply: '"Water helps me. Scrap helps me. I help you with what I know."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"A Drop or two scrap for the Hunger lead. One scrap for the east wash. Silas has the shelf."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: '"The Cartel already did worse to my face than you can." He does not move.',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const mira: IntentRule[] = [
  {
    tags: [...TALK, ...HELP, ...TRADE],
    reply: 'She does not answer. She keeps sifting.',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'She sets the sand down and looks at you until you stop.',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const jodi: IntentRule[] = [
  {
    tags: [...TALK, ...HELP],
    show: { flagUnset: 'jodiTook' },
    reply: 'She answers the vulture instead of you. "He wants to chat, Pastor. Tell him we trade. Scrap for the Drop, a Glint for the salve."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    show: { flagUnset: 'jodiTook' },
    reply: '"Two scrap for the Drop. A Glint or two scrap for the salve. The rats set the prices. The girls check the change."',
    effects: { ticks: 1 },
  },
  {
    tags: [...TALK, ...HELP, ...TRADE],
    show: { flag: 'jodiTook' },
    reply: 'She feeds the vultures and watches your hands.',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'The snake lifts its head off her shoulder. Jodi thumbs the stopper half out of the spider jar, grins at you with black lips, and waits.',
    effects: { heat: { strays: 1 }, pressure: 1, ticks: 1 },
  },
]

const corvin: IntentRule[] = [
  {
    tags: TALK,
    reply: '"I don\'t ask what the mark is for. I ask if you need a way through."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { flagUnset: 'corvinHelped' },
    reply: '"Water, or my prints gone from the wash. Either one, and I walk you past the ford traps."',
    effects: { ticks: 1 },
  },
  {
    tags: HELP,
    show: { flag: 'corvinHelped' },
    reply: '"Find me at the dry ford when you walk south. If you go down on this ridge, I\'ll come get you."',
    effects: { ticks: 1 },
  },
  {
    tags: TRADE,
    reply: '"I have nothing to sell. I know where the traps are."',
    effects: { ticks: 1 },
  },
  {
    tags: THREAT,
    reply: 'He holds his empty hands up. "I put the rifle down. I\'m not picking anything up for you."',
    effects: { pressure: 1, ticks: 1 },
  },
]

const BY_PERSON: Record<PersonId, IntentRule[]> = {
  oiltooth,
  kaelen,
  valerius,
  rell,
  silas,
  drennick,
  zafir,
  ossa,
  sybella,
  thalia,
  oram,
  brin,
  korvan,
  mira,
  corvin,
  jodi,
  carapace: [],
  handler: [
    {
      tags: TALK,
      reply: '"He likes a diagram. I like a throat. Talk is how you stay upright one more breath."',
      effects: { ticks: 1 },
    },
    {
      tags: THREAT,
      reply: 'The leash ticks. The hound\'s eyes stay open. "Try it."',
      effects: { heat: { cartel: 1 }, pressure: 1, ticks: 1 },
    },
  ],
}

export function talkIntentsFor(sceneId: string): IntentRule[] {
  if (sceneId === 'ch1:p-oil') return oiltoothRoad
  if (sceneId === 'ch1:v-zafir') return zafirCup
  const here = personAtScene(sceneId)
  if (here) return BY_PERSON[here.id]
  if (match(sceneId, ['camp:jaxson', 'camp:lean', 'camp:cages'])) return oiltooth
  if (match(sceneId, ['camp:kaelen', 'camp:wire', 'thresh:kaelen', 'thresh:sift'])) {
    return kaelen
  }
  if (match(sceneId, ['camp:valerius', 'camp:tower', 'camp:hunter', 'spine:valerius', 'spine:hound'])) {
    return valerius
  }
  if (match(sceneId, ['spine:silas', 'spine:shade', 'spine:tip', 'spine:ridge', 'ch1:o-silas'])) return silas
  if (match(sceneId, ['ch1:p-clerk'])) return rell
  if (match(sceneId, ['ch1:o-tax'])) return drennick
  if (match(sceneId, ['ch1:v-runners'])) return brin
  if (match(sceneId, ['maw:zafir', 'ch1:v-zafir', 'maw:market'])) return zafir
  if (match(sceneId, ['maw:ossa', 'maw:stilt', 'ch1:ossa', 'ch1:p-ossa', 'ch1:o-ossa'])) return ossa
  if (match(sceneId, ['maw:sybella', 'maw:smoke', 'ch1:sybella'])) return sybella
  if (match(sceneId, ['thresh:thalia', 'thresh:court'])) return thalia
  if (match(sceneId, ['thresh:oram', 'thresh:paddock'])) return oram
  return []
}

/** Typed lines nobody caught: the person on screen answers in their own voice. */
export function talkFallback(sceneId: string, speaker?: string, ticks = 0, said = ''): { reply: string; effects?: IntentRule['effects'] } | null {
  const person = personAtScene(sceneId)
  const voice = voiceForSpeaker(speaker) ?? (person ? VOICES[PERSON_VOICE[person.id] ?? person.id] : null)
  if (!voice) {
    if (!talkIntentsFor(sceneId).length && !speaker) return null
    return { reply: `${speaker ?? 'They'} lets that pass without an answer.`, effects: { ticks: 1 } }
  }
  return { reply: pickLine(voice.lines, { ticks }, said), effects: { ticks: 1 } }
}

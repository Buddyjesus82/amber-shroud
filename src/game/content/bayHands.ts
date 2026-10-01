import type { IntentRule } from '../types'

/** Other prisoners at Skiff Bay, each beside their own skiff. Not quest anchors. Do is the path. */
const MOUTH = ['talk', 'speak', 'greet', 'hello', 'hi', 'chat', 'ask']
const TAKE = ['steal', 'rob', 'pickpocket', 'pick pocket', 'lift', 'snatch', 'pinch', 'swipe', 'filch', 'mug']

function phrases(verbs: string[], names: string[]): string[] {
  const tags: string[] = []
  for (const verb of verbs) {
    for (const name of names) {
      tags.push(`${verb} ${name}`)
      tags.push(`${verb} to ${name}`)
      tags.push(`${verb} the ${name}`)
      tags.push(`${verb} to the ${name}`)
      tags.push(`${verb} from ${name}`)
      tags.push(`${verb} from the ${name}`)
    }
  }
  return tags
}

const pike = ['pike', 'scraper', 'north hull', 'north bay', "pike's skiff", 'his skiff']
const sarn = ['sarn', 'rigger', 'east cradle', 'east bay', "sarn's skiff"]
const vetch = ['vetch', 'welder', 'south skid', 'south bay', "vetch's skiff"]
const oil = ['oil-tooth', 'oil tooth', 'oiltooth', 'jaxson', 'vance', 'brass jaw']

const underHull = { all: [{ flag: 'jaxsonInside' }, { flag: 'guardDown' }, { flagUnset: 'striderHot' }] }

export const bayHandIntents: IntentRule[] = [
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: underHull,
    reply:
      '"Cover me," Oil-Tooth says, brass ticking under the hull. "I hotwire. You watch the bay. This bay is the job."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: { not: underHull },
    reply:
      'The brass jaw is at the stall, or the next bunk.',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, pike),
    reply:
      'Pike does not stop scraping. "North bay. Move, or get resin on you."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, sarn),
    reply:
      'Sarn counts a bolt out loud so the bay can hear the work. "Brass jaw keeps a stall. I keep a number. Do not promote me."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, vetch),
    reply:
      'Vetch lifts the mask a finger. "South bay. Talk is sparks."',
    effects: { ticks: 1 },
  },
  {
    tags: MOUTH,
    show: underHull,
    reply:
      '"Cover me," Oil-Tooth says, without looking up from the joint. "I hotwire. You are the lookout. Pike can scrape."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(TAKE, oil),
    show: underHull,
    reply: 'His hand closes on your wrist without leaving the joint. "I like you. Do not make me unlike you. Cover the bay."',
    effects: { heat: { strays: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  {
    tags: MOUTH,
    reply: 'Pike, Sarn, or Vetch. Short answers.',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(TAKE, pike).concat(['steal bolt from pike', 'steal the bolt', 'steal resin bolt']),
    show: { flagUnset: 'bayPikeTook' },
    reply:
      'A resin bolt comes off Pike\'s skiff in the north bay. Pike does not look up. The tag on it is corporate. The Cartel can count that inventory.',
    effects: { add: { scrap: 1 }, heat: { cartel: 1 }, flag: { bayPikeTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, pike),
    show: { flag: 'bayPikeTook' },
    reply: 'Pike\'s scraper finds your wrist. "Once is a bolt. Twice is a name." No second scrap.',
    effects: { pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, sarn).concat(['steal scrap from sarn', 'steal scrap']),
    show: { flagUnset: 'baySarnTook' },
    reply: 'Sarn skips a count on purpose. Scrap in your cuff. He will notice the skip before the hour does. He does not shout yet.',
    effects: { add: { scrap: 1 }, pressure: 1, flag: { baySarnTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, sarn),
    show: { flag: 'baySarnTook' },
    reply: 'He shouts the missing number. The bay looks. Heat, not scrap.',
    effects: { heat: { cartel: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, vetch).concat(['steal wire from vetch', 'steal the wire', 'steal wire']),
    show: { flagUnset: 'bayVetchTook' },
    reply: 'A curl of wire from Vetch\'s cuff. Scrap. The wand kisses your knuckle on the way out. Sap pays. She does not call the bay.',
    effects: { add: { scrap: 1 }, sap: -1, flag: { bayVetchTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, vetch),
    show: { flag: 'bayVetchTook' },
    reply: 'She welds the air in front of your hand. You keep the fingers. You do not keep a prize.',
    effects: { pressure: 2, flag: { cartelNotice: true }, ticks: 1 },
  },
  {
    tags: ['trade wrench to pike', 'trade the wrench to pike', 'trade wrench pike', 'give wrench to pike'],
    show: { all: [{ item: 'wrench' }, { flagUnset: 'wrenchBayTrade' }, { flagUnset: 'lashCord' }] },
    reply: 'Pike takes the wrench without stopping the scrape. The lash cord comes off his skiff in the north bay into your hand. He does not shout. The Cartel does not see a theft.',
    effects: {
      remove: { wrench: 1 },
      flag: { lashCord: true, wrenchBayTrade: 'pike', bayLooked: true },
      ticks: 1,
    },
  },
  {
    tags: ['trade wrench to sarn', 'trade the wrench to sarn', 'trade wrench sarn', 'give wrench to sarn'],
    show: { all: [{ item: 'wrench' }, { flagUnset: 'wrenchBayTrade' }] },
    reply: 'Sarn takes the wrench and counts you one twist of scrap. Quiet. No Cartel Heat. The cord on Pike\'s skiff in the north bay is still a separate theft if you want it.',
    effects: { remove: { wrench: 1 }, add: { scrap: 1 }, flag: { wrenchBayTrade: 'sarn', bayLooked: true }, ticks: 1 },
  },
  {
    tags: ['trade wrench to vetch', 'trade the wrench to vetch', 'trade wrench vetch', 'give wrench to vetch'],
    show: { all: [{ item: 'wrench' }, { flagUnset: 'wrenchBayTrade' }] },
    reply: 'Vetch pockets the wrench. A small Drop comes out of the glove. She does not call a count.',
    effects: { remove: { wrench: 1 }, add: { vial_drop: 1 }, flag: { wrenchBayTrade: 'vetch', bayLooked: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'bayPikeTook' },
    reply: 'Nearest hands are Pike\'s. A resin bolt, a corporate tag, and Cartel Heat if the count comes due.',
    effects: { add: { scrap: 1 }, heat: { cartel: 1 }, flag: { bayPikeTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'baySarnTook' },
    reply: 'Pike is already short a bolt. The east bay is next. He miscounts. You take the difference. He will hear it.',
    effects: { add: { scrap: 1 }, pressure: 1, flag: { baySarnTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'bayVetchTook' },
    reply: 'The south bay. Vetch\'s cuff hides wire. Scrap, and a kiss of the wand. Sap pays.',
    effects: { add: { scrap: 1 }, sap: -1, flag: { bayVetchTook: true, cartelNotice: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    reply: 'Pike, Sarn, and Vetch are counting hands now. Nothing left to take without a shout.',
    effects: { heat: { cartel: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  {
    tags: ['attack', 'fight', 'stab', 'hit', 'punch', 'kill', 'bite', 'strike'],
    reply: 'They are prisoners with tools, not a throat worth opening. The bay gets loud. You get nothing.',
    effects: { pressure: 1, ticks: 1 },
  },
]

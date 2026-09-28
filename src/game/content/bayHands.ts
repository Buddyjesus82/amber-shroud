import type { IntentRule } from '../types'

/** Other prisoners on the Skiff Bay cradles. Not quest anchors. Do is the path. */
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

const pike = ['pike', 'scraper', 'north hull', 'north bay']
const sarn = ['sarn', 'rigger', 'east cradle', 'east bay']
const vetch = ['vetch', 'welder', 'south skid', 'south bay']
const oil = ['oil-tooth', 'oil tooth', 'oiltooth', 'jaxson', 'vance', 'brass jaw']

const underHull = { all: [{ flag: 'jaxsonInside' }, { flag: 'guardDown' }, { flagUnset: 'striderHot' }] }

export const bayHandIntents: IntentRule[] = [
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: underHull,
    reply:
      'He is under one hull — the job, not the bay. Welding leather. Brass ticking. Pike, Sarn, and Vetch still have the other cradles. Cover him if you mean to hotwire.',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: { not: underHull },
    reply:
      'Oil-Tooth is not under a hull. Not on this bay. The stall and the next bunk still have the brass jaw. Pike scrapes north. Sarn counts east. Vetch welds south.',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, pike),
    reply:
      'Pike does not stop scraping. "North hull. I am not your inside man. I am not a rumor. Move, or get resin on you."',
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
      'Vetch lifts the mask a finger. The glove\'s tag is not her name. "South skid. Talk is sparks. I don\'t hotwire and I don\'t sell headings."',
    effects: { ticks: 1 },
  },
  {
    tags: MOUTH,
    reply: 'Pike scrapes the north hull. Sarn counts the east cradle. Vetch welds the south skid. None of them is the job.',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(TAKE, pike),
    show: { flagUnset: 'bayPikeTook' },
    reply:
      'A resin bolt comes off the north hull. Pike does not look up. The tag on it is corporate. Cartel Heat if anyone counts inventory.',
    effects: { add: { scrap: 1 }, heat: { cartel: 1 }, flag: { bayPikeTook: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, pike),
    show: { flag: 'bayPikeTook' },
    reply: 'Pike\'s scraper finds your wrist. "Once is a bolt. Twice is a name." No second scrap.',
    effects: { pressure: 1, ticks: 1 },
  },
  {
    tags: phrases(TAKE, sarn),
    show: { flagUnset: 'baySarnTook' },
    reply: 'Sarn skips a count on purpose. Scrap in your cuff. He will notice the skip before the hour does.',
    effects: { add: { scrap: 1 }, pressure: 1, flag: { baySarnTook: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, sarn),
    show: { flag: 'baySarnTook' },
    reply: 'He shouts the missing number. The bay looks. Heat, not scrap.',
    effects: { heat: { cartel: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: phrases(TAKE, vetch),
    show: { flagUnset: 'bayVetchTook' },
    reply: 'A curl of wire in the glove\'s cuff. Scrap. The wand kisses your knuckle on the way out. Sap pays.',
    effects: { add: { scrap: 1 }, sap: -1, flag: { bayVetchTook: true }, ticks: 1 },
  },
  {
    tags: phrases(TAKE, vetch),
    show: { flag: 'bayVetchTook' },
    reply: 'She welds the air in front of your hand. You keep the fingers. You do not keep a prize.',
    effects: { pressure: 2, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'bayPikeTook' },
    reply: 'Nearest hands are Pike\'s. A resin bolt, a corporate tag, and Cartel Heat if the count comes due.',
    effects: { add: { scrap: 1 }, heat: { cartel: 1 }, flag: { bayPikeTook: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'baySarnTook' },
    reply: 'Pike is already short a bolt. Sarn\'s cradle is next. He miscounts. You take the difference. He will hear it.',
    effects: { add: { scrap: 1 }, pressure: 1, flag: { baySarnTook: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    show: { flagUnset: 'bayVetchTook' },
    reply: 'The south skid. Vetch\'s cuff hides wire. Scrap, and a kiss of the wand. Sap pays.',
    effects: { add: { scrap: 1 }, sap: -1, flag: { bayVetchTook: true }, ticks: 1 },
  },
  {
    tags: TAKE,
    reply: 'Pike, Sarn, and Vetch are counting hands now. Nothing left to take without a shout.',
    effects: { heat: { cartel: 1 }, pressure: 1, ticks: 1 },
  },
  {
    tags: ['attack', 'fight', 'stab', 'hit', 'punch', 'kill', 'bite', 'strike'],
    reply: 'They are prisoners with tools, not a throat worth opening. The bay gets loud. You get nothing.',
    effects: { pressure: 1, ticks: 1 },
  },
]

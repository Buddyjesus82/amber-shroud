import type { Choice, Cond, Effect, IntentRule } from '../types'

/** Other prisoners at Skiff Bay, each beside their own skiff. Not quest anchors. Do is the path. */
const MOUTH = ['talk', 'speak', 'greet', 'hello', 'hi', 'chat', 'ask']
const TAKE = ['steal', 'rob', 'pickpocket', 'pick pocket', 'lift', 'snatch', 'pinch', 'swipe', 'filch', 'mug']
const WALK = ['go', 'go to', 'walk', 'walk to', 'walk up to', 'approach', 'visit', 'head to', 'step to', 'move to', 'enter', 'look', 'look at', 'search', 'examine', 'inspect']

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

function walkPhrases(names: string[]): string[] {
  const tags: string[] = []
  for (const verb of WALK) {
    for (const name of names) {
      tags.push(`${verb} ${name}`)
      tags.push(`${verb} the ${name}`)
    }
  }
  return tags
}

const pike = ['pike', 'scraper', 'north hull', 'north bay', "pike's skiff", "pike's bay", 'his skiff']
const sarn = ['sarn', 'rigger', 'east cradle', 'east bay', "sarn's skiff", "sarn's bay"]
const vetch = ['vetch', 'welder', 'south skid', 'south bay', "vetch's skiff", "vetch's bay"]
const oil = ['jaxson', 'vance', 'jaxson vance', 'brass jaw']

export const BAY_HUB = 'camp:bay'
export const BAY_PIKE = 'camp:bay-pike'
export const BAY_SARN = 'camp:bay-sarn'
export const BAY_VETCH = 'camp:bay-vetch'
export const BAY_SCENES = [BAY_HUB, BAY_PIKE, BAY_SARN, BAY_VETCH]

export function isBayScene(id: string): boolean {
  return BAY_SCENES.includes(id)
}

const underHull: Cond = { all: [{ flag: 'jaxsonInside' }, { flag: 'guardDown' }, { flagUnset: 'striderHot' }] }
const hasWrench: Cond = { item: 'wrench' }
const noWrench: Cond = { not: { item: 'wrench' } }
const wrenchFree: Cond = { all: [hasWrench, { flagUnset: 'wrenchBayTrade' }] }

// ── Shared lines and effects. Hub typed intents and the bay screens use the same ones. ──

export const PIKE_TALK = 'Pike does not stop scraping. "Cord is on the post. Take it and I did not see you."'
export const SARN_TALK =
  'Sarn counts a bolt out loud so the bay can hear the work. "Brass jaw keeps a stall. I keep a number. Do not promote me."'
export const VETCH_TALK =
  'Vetch lifts the mask a finger. "Talk is sparks. You want cord, Pike has it on his post. You want a fight, find a guard."'

export const BOLT_NEEDS_WRENCH =
  'The resin bolt is threaded tight into the knee joint. You need a wrench to turn it out.'

const BOLT_REPLY =
  'You fit the wrench on the resin bolt in the rear knee joint and turn it out. Pike keeps scraping the front leg. The tag on it is corporate. The Cartel can count that inventory.'
const BOLT_FX: Effect = { add: { scrap: 1 }, heat: { cartel: 1 }, flag: { bayPikeTook: true, cartelNotice: true }, ticks: 1 }
const PIKE_AGAIN = 'Pike\'s scraper finds your wrist. "Once is a bolt. Twice is a name." No second scrap.'
const PIKE_AGAIN_FX: Effect = { pressure: 1, flag: { cartelNotice: true }, ticks: 1 }

const CORD_REPLY = 'Cord. Pike does not look up. A stilt-lash will take it. Cartel Heat ticks if anyone counts his skiff.'
const CORD_FX: Effect = { flag: { lashCord: true, bayPikeTook: true }, heat: { cartel: 1 }, ticks: 1 }

const SARN_REPLY =
  'Sarn skips a count on purpose. A twist of scrap off his crate goes into your cuff. He will notice the skip before the hour does. He does not shout yet.'
const SARN_FX: Effect = { add: { scrap: 1 }, pressure: 1, flag: { baySarnTook: true, cartelNotice: true }, ticks: 1 }
const SARN_AGAIN = 'He shouts the missing number. The bay looks. Heat, not scrap.'
const SARN_AGAIN_FX: Effect = { heat: { cartel: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 }

const VETCH_REPLY =
  'You lift the copper wire off her crate. Scrap. The torch kisses your knuckle on the way out. Sap pays. She does not call the bay.'
const VETCH_FX: Effect = { add: { scrap: 1 }, sap: -1, flag: { bayVetchTook: true, cartelNotice: true }, ticks: 1 }
const VETCH_AGAIN = 'She welds the air in front of your hand. You keep the fingers. You do not keep a prize.'
const VETCH_AGAIN_FX: Effect = { pressure: 2, flag: { cartelNotice: true }, ticks: 1 }

const TRADE_PIKE_REPLY =
  'Pike takes the wrench without stopping the scrape. He lifts the lash cord off the post and hands it to you. He does not shout. The Cartel does not see a theft.'
const TRADE_PIKE_FX: Effect = { remove: { wrench: 1 }, flag: { lashCord: true, wrenchBayTrade: 'pike', bayLooked: true }, ticks: 1 }
const TRADE_SARN_REPLY =
  'Sarn takes the wrench and counts you one twist of scrap off his crate. Quiet. No Cartel Heat. The cord on Pike\'s post is still a separate theft if you want it.'
const TRADE_SARN_FX: Effect = { remove: { wrench: 1 }, add: { scrap: 1 }, flag: { wrenchBayTrade: 'sarn', bayLooked: true }, ticks: 1 }
const TRADE_VETCH_REPLY =
  'Vetch pockets the wrench and hands you the Drop vial from under her skiff. She does not call a count.'
const TRADE_VETCH_FX: Effect = { remove: { wrench: 1 }, add: { vial_drop: 1 }, flag: { wrenchBayTrade: 'vetch', bayLooked: true }, ticks: 1 }

const boltTags = phrases(TAKE, pike).concat([
  'steal bolt from pike',
  'steal the bolt',
  'steal resin bolt',
  'steal the resin bolt',
  'take the bolt',
  'take resin bolt',
  'take the resin bolt',
  'turn the bolt',
  'turn out the bolt',
  'unscrew the bolt',
  'wrench the bolt',
])
const cordTags = [
  'steal cord',
  'steal the cord',
  'steal lash cord',
  'steal the lash cord',
  'take cord',
  'take the cord',
  'take lash cord',
  'take the lash cord',
  'grab the cord',
  'grab cord',
]
const sarnTakeTags = phrases(TAKE, sarn).concat(['steal scrap from sarn', 'steal scrap', 'take scrap', 'take the scrap', 'steal a twist'])
const vetchTakeTags = phrases(TAKE, vetch).concat([
  'steal wire from vetch',
  'steal the wire',
  'steal wire',
  'steal copper wire',
  'steal the copper wire',
  'take wire',
  'take the wire',
  'take copper wire',
  'take the copper wire',
])
const vialTags = ['steal vial', 'steal the vial', 'steal drop', 'steal the drop', 'take vial', 'take the vial', 'take the drop', 'grab the vial', 'grab vial']

const tradePike: IntentRule = {
  tags: ['trade wrench to pike', 'trade the wrench to pike', 'trade wrench pike', 'give wrench to pike'],
  show: { all: [wrenchFree, { flagUnset: 'lashCord' }] },
  reply: TRADE_PIKE_REPLY,
  effects: TRADE_PIKE_FX,
}
const tradeSarn: IntentRule = {
  tags: ['trade wrench to sarn', 'trade the wrench to sarn', 'trade wrench sarn', 'give wrench to sarn'],
  show: wrenchFree,
  reply: TRADE_SARN_REPLY,
  effects: TRADE_SARN_FX,
}
const tradeVetch: IntentRule = {
  tags: ['trade wrench to vetch', 'trade the wrench to vetch', 'trade wrench vetch', 'give wrench to vetch'],
  show: wrenchFree,
  reply: TRADE_VETCH_REPLY,
  effects: TRADE_VETCH_FX,
}

const pikeRules: IntentRule[] = [
  { tags: phrases(MOUTH, pike), reply: PIKE_TALK, effects: { ticks: 1 } },
  { tags: boltTags, show: { all: [hasWrench, { flagUnset: 'bayPikeTook' }] }, reply: BOLT_REPLY, effects: BOLT_FX },
  { tags: boltTags, show: { all: [noWrench, { flagUnset: 'bayPikeTook' }] }, reply: BOLT_NEEDS_WRENCH, effects: {} },
  { tags: phrases(TAKE, pike), show: { flag: 'bayPikeTook' }, reply: PIKE_AGAIN, effects: PIKE_AGAIN_FX },
  { tags: cordTags, show: { flagUnset: 'lashCord' }, reply: CORD_REPLY, effects: CORD_FX },
  { tags: cordTags, show: { flag: 'lashCord' }, reply: 'The lash cord is already in your hand.', effects: {} },
  tradePike,
]

const sarnRules: IntentRule[] = [
  { tags: phrases(MOUTH, sarn), reply: SARN_TALK, effects: { ticks: 1 } },
  { tags: sarnTakeTags, show: { flagUnset: 'baySarnTook' }, reply: SARN_REPLY, effects: SARN_FX },
  { tags: phrases(TAKE, sarn), show: { flag: 'baySarnTook' }, reply: SARN_AGAIN, effects: SARN_AGAIN_FX },
  tradeSarn,
]

const vetchRules: IntentRule[] = [
  { tags: phrases(MOUTH, vetch), reply: VETCH_TALK, effects: { ticks: 1 } },
  { tags: vetchTakeTags, show: { flagUnset: 'bayVetchTook' }, reply: VETCH_REPLY, effects: VETCH_FX },
  { tags: phrases(TAKE, vetch), show: { flag: 'bayVetchTook' }, reply: VETCH_AGAIN, effects: VETCH_AGAIN_FX },
  tradeVetch,
]

const fightRule: IntentRule = {
  tags: ['attack', 'fight', 'stab', 'hit', 'punch', 'kill', 'bite', 'strike'],
  reply: 'They are prisoners with tools, not a throat worth opening. The bay gets loud. You get nothing.',
  effects: { pressure: 1, ticks: 1 },
}

const oilRules: IntentRule[] = [
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: underHull,
    reply: '"Cover me," Jaxson says, brass ticking under the hull. "I hotwire. You watch the bay. This bay is the job."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(MOUTH, oil).concat(oil),
    show: { not: underHull },
    reply: 'The brass jaw is at the stall, or the next bunk.',
    effects: { ticks: 1 },
  },
]

/** Typed walk-ups from the hub. Buttons carry the same moves. */
export const bayWalkIntents: IntentRule[] = [
  {
    tags: walkPhrases(['center bay', 'centre bay', "jaxson's skiff", 'middle bay']),
    show: underHull,
    reply: 'Jaxson is on his back under his skiff in the center bay, hotwiring it. "Cover me."',
    effects: {},
  },
  {
    tags: walkPhrases(['center bay', 'centre bay', "jaxson's skiff", 'middle bay']),
    show: { not: underHull },
    reply: "Jaxson's skiff stands in the center bay with nobody at it.",
    effects: {},
  },
  {
    tags: walkPhrases(['pike', 'north bay', "pike's bay", "pike's skiff"]),
    reply: 'You walk over to Pike in the north bay.',
    effects: { goto: BAY_PIKE, flag: { bayLooked: true } },
  },
  {
    tags: walkPhrases(['sarn', 'east bay', "sarn's bay", "sarn's skiff"]),
    reply: 'You walk over to Sarn in the east bay.',
    effects: { goto: BAY_SARN, flag: { bayLooked: true } },
  },
  {
    tags: walkPhrases(['vetch', 'south bay', "vetch's bay", "vetch's skiff"]),
    reply: 'You walk over to Vetch in the south bay.',
    effects: { goto: BAY_VETCH, flag: { bayLooked: true } },
  },
]

/** The hub: typed talk, steal, and trade still work from the yard. */
export const bayHandIntents: IntentRule[] = [
  ...oilRules,
  ...pikeRules,
  ...sarnRules,
  ...vetchRules,
  {
    tags: MOUTH,
    show: underHull,
    reply: '"Cover me," Jaxson says, without looking up from the joint. "I hotwire. You are the lookout. Pike can scrape."',
    effects: { ticks: 1 },
  },
  {
    tags: phrases(TAKE, oil),
    show: underHull,
    reply: 'His hand closes on your wrist without leaving the joint. "I like you. Do not make me unlike you. Cover the bay."',
    effects: { heat: { strays: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  { tags: MOUTH, reply: 'Pike, Sarn, or Vetch. Short answers.', effects: { ticks: 1 } },
  {
    tags: TAKE,
    show: { all: [hasWrench, { flagUnset: 'bayPikeTook' }] },
    reply: 'Nearest hands are Pike\'s. You turn the resin bolt out of his rear leg with the wrench. A corporate tag, and Cartel Heat if the count comes due.',
    effects: BOLT_FX,
  },
  {
    tags: TAKE,
    show: { flagUnset: 'baySarnTook' },
    reply: 'Sarn miscounts on purpose. You take a twist of scrap off his crate. He will hear it.',
    effects: SARN_FX,
  },
  {
    tags: TAKE,
    show: { flagUnset: 'bayVetchTook' },
    reply: 'The south bay. You lift the copper wire off Vetch\'s crate. Scrap, and a kiss of the torch. Sap pays.',
    effects: VETCH_FX,
  },
  {
    tags: TAKE,
    reply: 'Pike, Sarn, and Vetch are counting hands now. Nothing left to take without a shout.',
    effects: { heat: { cartel: 1 }, pressure: 1, flag: { cartelNotice: true }, ticks: 1 },
  },
  fightRule,
  ...bayWalkIntents,
]

function elsewhere(names: string[], where: string, who: string): IntentRule {
  return {
    tags: phrases(MOUTH.concat(TAKE), names),
    reply: `${who} is in the ${where}. Go back to Skiff Bay and walk over.`,
    effects: {},
  }
}

const backTags = [
  'back',
  'go back',
  'step back',
  'return',
  'leave',
  'leave the bay',
  'back to skiff bay',
  'return to skiff bay',
  'go back to skiff bay',
  'back to the yard',
  'return to the yard',
  'walk away',
]
const backRule: IntentRule = { tags: backTags, reply: 'You step back into Skiff Bay.', effects: { goto: BAY_HUB } }

export const pikeBayIntents: IntentRule[] = [
  ...pikeRules,
  { tags: TAKE, show: { all: [hasWrench, { flagUnset: 'bayPikeTook' }] }, reply: BOLT_REPLY, effects: BOLT_FX },
  { tags: TAKE, show: { all: [noWrench, { flagUnset: 'bayPikeTook' }] }, reply: BOLT_NEEDS_WRENCH, effects: {} },
  { tags: TAKE, show: { flag: 'bayPikeTook' }, reply: PIKE_AGAIN, effects: PIKE_AGAIN_FX },
  { tags: MOUTH, reply: PIKE_TALK, effects: { ticks: 1 } },
  ...oilRules,
  elsewhere(sarn.filter((n) => n !== 'east bay'), 'east bay', 'Sarn'),
  elsewhere(vetch.filter((n) => n !== 'south bay'), 'south bay', 'Vetch'),
  fightRule,
  backRule,
]

export const sarnBayIntents: IntentRule[] = [
  ...sarnRules,
  { tags: ['steal bolts', 'steal a bolt', 'take bolts', 'take a bolt', 'steal bolt'], show: { flagUnset: 'baySarnTook' }, reply: SARN_REPLY, effects: SARN_FX },
  { tags: TAKE, show: { flagUnset: 'baySarnTook' }, reply: SARN_REPLY, effects: SARN_FX },
  { tags: TAKE, show: { flag: 'baySarnTook' }, reply: SARN_AGAIN, effects: SARN_AGAIN_FX },
  { tags: MOUTH, reply: SARN_TALK, effects: { ticks: 1 } },
  ...oilRules,
  elsewhere(pike.filter((n) => n !== 'north bay' && n !== 'his skiff'), 'north bay', 'Pike'),
  elsewhere(vetch.filter((n) => n !== 'south bay'), 'south bay', 'Vetch'),
  fightRule,
  backRule,
]

export const vetchBayIntents: IntentRule[] = [
  ...vetchRules,
  {
    tags: vialTags,
    show: { not: { flagEq: ['wrenchBayTrade', 'vetch'] } },
    reply: 'Vetch puts her boot beside the vial before your hand gets there. "That one is for trade."',
    effects: { pressure: 1, ticks: 1 },
  },
  { tags: TAKE, show: { flagUnset: 'bayVetchTook' }, reply: VETCH_REPLY, effects: VETCH_FX },
  { tags: TAKE, show: { flag: 'bayVetchTook' }, reply: VETCH_AGAIN, effects: VETCH_AGAIN_FX },
  { tags: MOUTH, reply: VETCH_TALK, effects: { ticks: 1 } },
  ...oilRules,
  elsewhere(pike.filter((n) => n !== 'north bay' && n !== 'his skiff'), 'north bay', 'Pike'),
  elsewhere(sarn.filter((n) => n !== 'east bay'), 'east bay', 'Sarn'),
  fightRule,
  backRule,
]

// ── Buttons for the bay screens ──

const back: Choice = {
  id: 'back',
  label: 'Back to Skiff Bay',
  tone: 'quiet',
  effects: { goto: BAY_HUB },
}

export const pikeBayChoices: Choice[] = [
  {
    id: 'cord',
    label: 'Take the lash cord off the post',
    sub: 'Pike does not look up. Cartel Heat rises if anyone counts his skiff.',
    show: { flagUnset: 'lashCord' },
    effects: { ...CORD_FX, flash: CORD_REPLY },
  },
  {
    id: 'bolt',
    label: 'Turn out the resin bolt',
    sub: 'Rear leg, the side Pike is not working. Corporate tag. Cartel Heat.',
    show: { all: [{ flagUnset: 'bayPikeTook' }, { any: [hasWrench, { flagUnset: 'wrenchBayTrade' }] }] },
    enable: hasWrench,
    locked: 'Threaded tight. It needs a wrench.',
    effects: { ...BOLT_FX, flash: BOLT_REPLY },
  },
  {
    id: 'trade-pike',
    label: 'Trade the wrench to Pike for lash cord',
    sub: 'He keeps the steel. You get the cord. He does not call the Cartel.',
    show: { all: [wrenchFree, { flagUnset: 'lashCord' }] },
    effects: { ...TRADE_PIKE_FX, flash: TRADE_PIKE_REPLY },
  },
  back,
]

export const sarnBayChoices: Choice[] = [
  {
    id: 'scrap',
    label: 'Take a twist of scrap off his crate',
    sub: 'He skips a count on purpose. He will notice the skip later.',
    show: { flagUnset: 'baySarnTook' },
    effects: { ...SARN_FX, flash: SARN_REPLY },
  },
  {
    id: 'trade-sarn',
    label: 'Trade the wrench to Sarn for scrap',
    sub: 'One scrap. A quiet trade, not a theft.',
    show: wrenchFree,
    effects: { ...TRADE_SARN_FX, flash: TRADE_SARN_REPLY },
  },
  back,
]

export const vetchBayChoices: Choice[] = [
  {
    id: 'wire',
    label: 'Take the copper wire off the crate',
    sub: 'She keeps welding. The torch costs a little Sap on the way out.',
    show: { flagUnset: 'bayVetchTook' },
    effects: { ...VETCH_FX, flash: VETCH_REPLY },
  },
  {
    id: 'trade-vetch',
    label: 'Trade the wrench to Vetch for a Drop',
    sub: 'The vial under her skiff. She keeps the steel.',
    show: wrenchFree,
    effects: { ...TRADE_VETCH_FX, flash: TRADE_VETCH_REPLY },
  },
  back,
]

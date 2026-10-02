import type { GameState } from './types'

/**
 * help <topic> cards. Plain help lists the topics; each topic opens its own card.
 * Every line here is checked against the rules in code (see scripts/smoke.ts).
 */

export type HelpRow = { key?: string; text: string; bullet?: boolean; secret?: boolean }
export type HelpSection = { title?: string; rows: HelpRow[] }
export type HelpTopic = {
  id: string
  /** Extra words that open the same card. */
  aliases: readonly string[]
  /** One line in the topic list. */
  blurb: string
  sections: HelpSection[]
}

export const HELP_HINT = 'Try: help <topic>'

const FIGHT_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'STRIKE', text: 'How hard you hit. Your weapon sets it. Bare hands are 1.' },
      { key: 'SHELL', text: 'How much a hit is blunted. Your armor sets it. No armor is 0.' },
      { key: 'SWING', text: 'Each exchange, both sides add 0, 1, or 2 to Strike.' },
      { key: 'DAMAGE', text: 'Strike + swing - Shell. Never less than 1. You and the enemy hit each other in the same exchange.' },
      { key: 'HEALTH', text: 'Hits take Health. You start at 6. Sap is for thirst and walking.' },
      { key: 'GEAR', text: 'Weapon slot sets Strike. Armor slot sets Shell. Garment and head slots add nothing in a fight.' },
      { key: 'ENEMY', text: 'The fight card lists their Strike, Shell, and Health.' },
    ],
  },
  {
    title: 'OPTIONS',
    rows: [
      { key: 'Fight', text: 'One exchange per tap.' },
      { key: 'Give the road', text: 'Ends the fight. No loot. No cost.' },
      { key: 'Cloak skip', text: 'With armor on. Same as giving the road.' },
      { text: 'Bribes and talk do nothing once a fight starts.' },
    ],
  },
  {
    title: 'WIN',
    rows: [
      { text: 'Their Health hits 0 and they drop. Loot only comes then.' },
      { text: 'People sometimes carry a Resin Salve on them. Beasts never do.' },
      { text: 'If you both hit 0 in the same exchange, you get the loot and go Down.' },
    ],
  },
  {
    title: 'AT 0 HEALTH',
    rows: [
      { text: 'You go Down. You do not die. The fight ends, the enemy is gone, and you keep your gear.' },
      { text: 'Tap "Take the hand. Get up." Where you fell sets the cost:' },
      { bullet: true, text: 'Most ground: you get up with 1 Health and lose 1 Sap.' },
      {
        bullet: true,
        text: 'Ironwood Camp-04, against a Hound-handler, Shard-pup, vent patrol, or Valerius: you wake in the Bleed Yard with 1 Health and +2 Cartel Heat.',
      },
      {
        bullet: true,
        text: "Prisoner, at Oil-Tooth's stall, Skiff Bay, or his Maw bench, once you work with him: he pulls you up. 2 Health. Costs 1 scrap, or 1 Sap if you have no scrap.",
      },
      { bullet: true, text: 'Outcast, on the Noon Spine, once you have helped Corvin Pryce: he pulls you up. 2 Health. Costs 1 Sap.' },
      { bullet: true, text: 'In Red Maw with Ossa as an ally: she pulls you up. 2 Health. Costs a Drop, or 1 Sap if you have no Drop.' },
      { text: 'If that Sap was your last, the dry-out crisis follows.' },
      {
        text: 'By door: Prisoner starts in Camp-04, so a Cartel fight there ends in the Yard. Outcast uses the most-ground rule on the Noon Spine until Corvin owes you, and Vessel uses it on the Threshold. In Red Maw, every door uses the Ossa rule once she is an ally, and the most-ground rule otherwise.',
      },
    ],
  },
]

const SCAVENGE_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'WHERE', text: 'Any hub ground off the Hunger road. Not in a crisis, an opening, or a chapter beat.' },
      { key: 'ONCE', text: 'You can scavenge once per fresh scene. Trying again right away says the patch is already in your hands.' },
      { key: 'FINDS', text: 'Scrap most often. Sometimes 2 scrap, a Glint, a Drop, or Cartel Scrip in Camp-04. Vats, vents, and wells turn up Drops more often. Rarely, a Resin Salve turns up with the find.' },
      { key: 'COST', text: 'Each scavenge passes time and adds 1 Pressure. Hunters use the hours you spend lingering.' },
    ],
  },
  {
    title: 'SECRET TIP',
    rows: [
      {
        secret: true,
        text: 'The patch refreshes. After you scavenge, take two more actions that pass time, or walk away and come back, and the same spot can be scavenged again. Look does not pass time, so it does not count.',
      },
    ],
  },
]

const SKIM_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'WHAT', text: 'Skim takes one Drop from a sap source. It costs 1 Sap and adds 2 Pressure.' },
      { key: 'WHERE', text: 'Steam Vents, cooling vats, Bleed Yard, Dry Well, Strider Paddock, Hollow Lip.' },
      { key: 'ONCE', text: 'Each place gives one skim per run.' },
      { key: 'HEAT', text: "+1 Heat for whoever owns the ground: Cartel in Camp-04, Strays on the Spine and in Red Maw, Seekers at the Threshold. The Hollow Lip has no one watching." },
      { key: 'GEAR', text: 'The Dry Well needs a weapon equipped.' },
    ],
  },
]

const LOOK_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'LOOK', text: 'Lists what this place offers right now. No time passes.' },
      { key: 'AIM', text: 'look north (or south, east, west) looks down that road.' },
      { key: 'SHORT', text: 'l works the same as look.' },
    ],
  },
]

const TALK_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'VERBS', text: 'talk, ask, threaten, bribe, give. Say them with the person in front of you.' },
      { key: 'WHO', text: 'who is <name> shows their card again, once you have met them.' },
      { key: 'BUTTONS', text: 'Typing a button\'s words does what the button does.' },
    ],
  },
]

const GO_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'MAP', text: 'Map shows the roads on this ground. You can walk only to a place a road connects.' },
      { key: 'COST', text: 'Most roads cost 1 Sap. Long roads cost 2.' },
      { key: 'TYPED', text: 'go north (or south, east, west) takes that road when only one road goes that way. Add the place name when two do.' },
      { key: 'ROADS', text: 'Walking can start a road fight. Pressure climbs with time spent.' },
    ],
  },
]

const TRADE_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'WHO', text: 'Buy and Sell shelves: Kaelen the Sifter in Camp-04 and the Threshold, Silas Vane in his shade on the Spine, and Zafir at the Maw stall.' },
      { key: 'BUY', text: 'buy <item>, for example buy a drop. Prices are on the shelf.' },
      { key: 'SELL', text: 'Unequipped items only. Keys never. They pay less than they charge.' },
      { key: 'RUMORS', text: 'Kaelen sells rumors in Camp-04 and the Threshold: Glints buy intel, scrap buys side trouble. On the Spine, Korvan Drell trades leads for a Drop or scrap.' },
    ],
  },
]

const DRINK_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'SAP', text: 'Sap is thirst and walking. It tops out at 8. At 0 the dry-out crisis takes over.' },
      { key: 'DRINK', text: 'drink a drop gives +3 Sap and leaves an empty vial. Same as the Drink a Drop row.' },
      { key: 'SALVE', text: 'use salve gives +3 Health.' },
      { key: 'NONE', text: 'With none in your pack, it says so. Nothing is bought.' },
    ],
  },
]

const HEAT_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'HEAT', text: 'Attention from three factions: Cartel, Seekers, Strays. Tap a Heat number to see who is watching.' },
      { key: 'RISES', text: 'When someone can see or trace what you did: skims, thefts, some fights and choices.' },
      { key: 'EFFECT', text: "High Heat on a faction's ground shortens the quiet between road fights: 5 actions normally, 3 at Heat 4+, 2 at Heat 7+." },
      { key: 'COOLS', text: "Some choices lower it. In Camp-04, Kaelen can muddy your name with the Cartel." },
    ],
  },
]

const GEAR_SECTIONS: HelpSection[] = [
  {
    rows: [
      { key: 'SLOTS', text: 'Weapon, armor, garment, head. Equip from the Gear sheet.' },
      { key: 'FIGHT', text: 'Weapon sets Strike. Armor sets Shell. Garment and head add nothing in a fight.' },
      { key: 'CLOTH', text: 'Vessel Cloth wears in the garment slot and leaves the armor slot free.' },
      { key: 'SELL', text: 'Unequip an item before a trader will buy it.' },
    ],
  },
]

export const HELP_TOPICS: readonly HelpTopic[] = [
  { id: 'fight', aliases: ['fights', 'fighting', 'combat', 'strike', 'shell', 'health'], blurb: 'Strike, Shell, swing, Health, and what happens at 0', sections: FIGHT_SECTIONS },
  { id: 'scavenge', aliases: ['scav', 'search', 'loot'], blurb: 'picking a patch for scrap and finds', sections: SCAVENGE_SECTIONS },
  { id: 'skim', aliases: ['skimming'], blurb: 'taking a Drop from a sap source, and the Heat it costs', sections: SKIM_SECTIONS },
  { id: 'look', aliases: ['l', 'examine'], blurb: 'seeing what a place offers', sections: LOOK_SECTIONS },
  { id: 'talk', aliases: ['ask', 'threaten', 'bribe', 'give', 'who'], blurb: 'people, and who is <name>', sections: TALK_SECTIONS },
  { id: 'go', aliases: ['walk', 'map', 'travel', 'roads', 'move'], blurb: 'roads, the Map, and Sap per road', sections: GO_SECTIONS },
  { id: 'trade', aliases: ['buy', 'sell', 'shop', 'rumors'], blurb: 'Buy and Sell shelves, and rumors', sections: TRADE_SECTIONS },
  { id: 'drink', aliases: ['sap', 'drop', 'drops', 'salve', 'use'], blurb: 'Sap, Drops, and salve', sections: DRINK_SECTIONS },
  { id: 'heat', aliases: ['cartel', 'seekers', 'strays'], blurb: 'who is watching, and what it costs', sections: HEAT_SECTIONS },
  { id: 'gear', aliases: ['equip', 'kit', 'weapon', 'armor'], blurb: 'slots and what they add', sections: GEAR_SECTIONS },
]

export function helpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id)
}

export const FIGHT_HELP_PROMPT = 'help fight'
export const FIGHT_HELP: readonly HelpSection[] = FIGHT_SECTIONS

function rowLine(row: HelpRow): string {
  if (row.key) return `${row.key}: ${row.text}`
  return row.bullet ? `- ${row.text}` : row.text
}

/** Plain-text copy of a topic card, one row per line. */
export function topicLines(topic: HelpTopic): string[] {
  return topic.sections.flatMap((section, i) => [
    ...(i ? [''] : []),
    ...(section.title ? [section.title] : []),
    ...section.rows.map(rowLine),
  ])
}

export function topicText(topic: HelpTopic): string {
  return [`help ${topic.id}`, '', ...topicLines(topic)].join('\n')
}

export const FIGHT_HELP_LINES: readonly string[] = topicLines(HELP_TOPICS[0])

export function fightHelpText(): string {
  return topicText(HELP_TOPICS[0])
}

/** The topic list, as typed help shows it. */
export function topicListText(): string {
  return [HELP_HINT, ...HELP_TOPICS.map((t) => `help ${t.id}: ${t.blurb}`)].join('\n')
}

export type HelpRoute = { kind: 'list' } | { kind: 'topic'; topic: HelpTopic } | { kind: 'unknown'; asked: string; reply: string }

/** help, help <topic>, ? <topic>. Anything else is not a help line. */
export function helpRoute(text: string): HelpRoute | null {
  const m = /^\s*(help|\?)(?:\s+(.+?))?\s*$/i.exec(text)
  if (!m) return null
  const asked = (m[2] ?? '').toLowerCase().replace(/[^a-z<> ]/g, '').trim()
  if (!asked) return { kind: 'list' }
  const word = asked.replace(/^(me |with |on |about )+/, '').replace(/^(a |the )/, '').trim()
  if (!word) return { kind: 'list' }
  const topic = HELP_TOPICS.find((t) => t.id === word || t.aliases.includes(word))
  if (topic) return { kind: 'topic', topic }
  return { kind: 'unknown', asked: word, reply: `No help topic "${word}".\n${topicListText()}` }
}

/** Opens by itself once: the first fight card of this run. Old saves that already fought skip it. */
export function fightHelpAuto(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.encounterHere && !state.flags.encounterDone && !state.flags.fightHelpSeen && !state.flags.fightTaught
}

/** Dismissing the card marks it seen for this run. Saved with the rest of the flags. */
export function markFightHelpSeen(state: GameState): GameState {
  return { ...state, flags: { ...state.flags, fightHelpSeen: true }, updatedAt: Date.now() }
}

export function isFightHelpAsk(text: string): boolean {
  const r = helpRoute(text)
  return r?.kind === 'topic' && r.topic.id === 'fight'
}

import type { GameState } from './types'

export type PersonId = 'oiltooth' | 'kaelen' | 'valerius' | 'silas' | 'thalia' | 'oram'

export type Person = {
  id: PersonId
  name: string
  aliases: string[]
  metFlag: string
  card: string
  scenes: string[]
  later: Partial<Record<string, string>>
}

export const PEOPLE: Record<PersonId, Person> = {
  oiltooth: {
    id: 'oiltooth',
    name: 'Oil-Tooth',
    aliases: ['oil-tooth', 'oil tooth', 'oiltooth', 'jaxson', 'vance', 'brass jaw'],
    metFlag: 'metOilTooth',
    card: `Jaxson "Oil-Tooth" Vance — burly, grease-stained, permanent smirk, cybernetic brass jaw catching the steam-light. Scorched welding leathers with corporate inventory tags he never cut off. An oversized wrench when he is not hiding it.

Prison-break technical inside man. Reckless. Charismatic. Anti-authority. Humor as a shield. Observant of security weaknesses. He has skimmed Oasis Sap for a lifetime of repairing Ironclad Skiff-Striders. He hotwires. He does not sell headings. That invoice is Kaelen's.`,
    scenes: [
      'camp:cages',
      'camp:lean',
      'camp:jaxson',
      'camp:jaxson-cache',
      'camp:jaxson-drop',
      'camp:bay',
      'crisis:camp',
    ],
    later: {
      'camp:cages': `Holding pens. Each cage a ribcage for a penniless laborer. Yours still smells like the last Bleed. Cartel Scrip in the hem.

Oil-Tooth is still in the next bunk, brass jaw working, already talking the job: sabotage the station, he hotwires a Strider. Kaelen the Sifter is not here. Kaelen sells rumors at the Wire.`,
      'camp:lean': `Oil-Tooth works the stall like the wrench is still in his fist. Grease. The smirk. Brass ticking.

"Bleed-Cut," he says. "Great Bleed is coming. You sabotage the guard station. I hotwire a Strider. That is the job. Kaelen the Sifter sells rumors at the Wire if you want news. They are not the inside man. I am."`,
      'camp:jaxson': `"Valerius is the first major victory you have to overcome," Oil-Tooth says, smirking around the brass. "I have watched the guard station until I could draw it in grease.

Great Bleed hits, you sabotage that station. I hotwire an Ironclad Skiff-Strider. We leave the pens. You want rumors — Kallik, the Hunger, the blonde — that is Kaelen the Sifter at the Wire. They sell leads. I sell a ride."`,
      'camp:bay': `Oil-Tooth is under a hull if the job is live — welding leather, smirk the brass jaw cannot hide. The Striders stand like bad architecture. Corporate tags he has been waiting to steal.`,
    },
  },
  kaelen: {
    id: 'kaelen',
    name: 'Kaelen',
    aliases: ['kaelen', 'sifter', 'merchant'],
    metFlag: 'metKaelen',
    card: `Kaelen the Sifter jitters — a diminutive merchant in dust-caked canvas, an overstuffed pack of vials, gears, and amber jars, thick gloves on both hands. Independent scavenger. They play all sides. Shrewd. Paranoid. Fast-talk. Everything is cost and profit. Their hidden trade routes are unmatched.

They sell Drops of Oasis Sap for scrap, intel for Glints, and rumors that open trouble. They do not hotwire Striders. They do not donate the Hunger. They are not the inside man.`,
    scenes: [
      'camp:wire',
      'camp:kaelen',
      'camp:kaelen-rumors',
      'spine:kaelen',
      'spine:kaelen-rumors',
      'spine:well',
    ],
    later: {
      'camp:wire': `The perimeter. Razor-wire. Steam-vents coughing. Beyond it the dunes begin to have opinions.

Kaelen the Sifter is here when profit says here — pack, gloves, already counting. Rumors if you ask. Drops if you pay. Oil-Tooth remains the inside man.

Ironclad Skiff-Striders patrol the other side of this line. The Hunger lives past it. So do Hounds.`,
      'camp:kaelen': `Kaelen works the pack with both gloves. The Wire at their back like a second strap. "Pick a product," they say. "Drops. Intel. Rumors that open trouble. I am not Oil-Tooth."`,
      'spine:kaelen': `Dusk on the Spine. Same pack. Same gloves. Less wire, more dust. "You're the empty vial," they say. "I fill those if you pay. I also sell rumors. Silas sold you shade. I sell inventory."`,
    },
  },
  valerius: {
    id: 'valerius',
    name: 'Valerius',
    aliases: ['valerius', 'overseer', 'shard-hound', 'shard hound'],
    metFlag: 'metValerius',
    card: `Overseer Valerius — imposing, scarred, reinforced iron plating over dust-cloaks, a steam-hissing shock baton in the fist. Cruel. Calculating. Brutal enforcer protecting corporate interests. He hunts Sap thieves and unpermitted relic hoarders. Sadistic. Arrogant. Disciplined.

He is the immediate antagonist. The looming shadow. First major victory: get out from under him. On the Spine they also call him the Shard-Hound, because he finds the people who think ridges hide them.`,
    scenes: [
      'camp:tower',
      'camp:valerius',
      'camp:hunter',
      'spine:hound',
      'spine:valerius',
      'spine:hunter',
    ],
    later: {
      'camp:tower': `The tower leaks shade, steam, and authority. Valerius stands in it like a nail stands in wood. The shock baton hisses. He is already writing you down.`,
      'camp:valerius': `Valerius does not bother to raise the shock baton. Steam hisses in the grip anyway.

"You are out of position," he says, cruel and calculating, mild as boiled water. "Escaped spends a Hound. Useful scrapes until the hands forget they were hands."`,
      'camp:hunter': `Whistles. Boots. The Yard becomes a diagram.

Valerius arrives. He does not run. "The penniless laborer is upright. How optimistic." Behind him a Hound-handler checks a muzzle that is not for dogs. First major victory is leaving.`,
      'spine:hound': `Prints. Not dogs. Shard-Hounds — Cartel-made, resin-jawed.

Valerius is here in a different uniform: dust instead of cuffs, the same ledger behind the eyes. He is already counting the wash.`,
      'spine:valerius': `"Outcast," he says, almost kind. "Ironwood still pays for returned property. You are a loose Drop. I can cork you or I can point you at the woman on the skiff."`,
    },
  },
  silas: {
    id: 'silas',
    name: 'Silas',
    aliases: ['silas', 'vane', 'shade'],
    metFlag: 'metSilas',
    card: `Silas Vane is older than the well's disappointment. One eye is milk. The other is accounting. The tent smells of resin-chew and wet wool that has never been wet.

He sells shade by the minute. Talk is not free. Drops are a fairy tale he still keeps in stock for people who pay. He is not Kaelen. Kaelen sells inventory. Silas sells the minute you are not in the sun.`,
    scenes: ['spine:ridge', 'spine:shade', 'spine:silas', 'spine:silas-drop', 'spine:silas-cache', 'spine:tip'],
    later: {
      'spine:ridge': `The Bleached Spine is a ridge of bone-pale rock. Nothing casts a kind shadow. Your empty vial ticks against your ribs like a second, drier heart.

Down-slope: Silas's tent, still selling shade by the minute. Farther, the dry well. Hound tracks stitch the eastern wash.`,
      'spine:shade': `Silas sits the expensive shade. One eye milk, one eye accounting. "Noon-Empty," he says. "Shade is not free. Talk is not free. Drops still cost."`,
      'spine:silas': `He pours nothing into a cup and drinks it with ceremony.

"Cartel Hounds on the east wash. Seeker skiff on the south wind — blonde, kohl like a bruise, hunting batteries that walk. And you, with a vial that sounds empty even when you don't shake it."`,
    },
  },
  thalia: {
    id: 'thalia',
    name: 'Thalia',
    aliases: ['thalia'],
    metFlag: 'metThalia',
    card: `Thalia loves you with a violence that thinks it is worship. Gold tracks down her face. She will not quite touch. Holy is a no-touch rule until it isn't.

She wants you poured. She will name Kallik's cache as a hymn. She will break if the cloth is a costume.`,
    scenes: ['thresh:thalia', 'thresh:court'],
    later: {
      'thresh:thalia': `Thalia's hands hover. Gold on the cheeks. "Vessel. Cup. The desert poured itself into a person and chose you." She will not quite touch.`,
    },
  },
  oram: {
    id: 'oram',
    name: 'Oram',
    aliases: ['oram'],
    metFlag: 'metOram',
    card: `Oram's ledger is full of feed-weights and heresies he has not reported. He prefers animals to hymns. Animals do not ask to be poured.

He already tore a heading from that ledger because cups crack and thieves reach Red Maw. He wants the Striders alive. Those wants are about to collide with Sybella's.`,
    scenes: ['thresh:oram', 'thresh:paddock'],
    later: {
      'thresh:oram': `Oram does not look up from the feed-weights. "You're a better thief than a cup. Good. Cups crack. Thieves reach Red Maw. I want the Striders alive."`,
      'thresh:paddock': `Striders stand like bad architecture. Oram is here more than the Court, counting joints instead of hymns. Yours stamps when it smells the bit.`,
    },
  },
}

export function personById(id: PersonId): Person {
  return PEOPLE[id]
}

export function personAtScene(sceneId: string): Person | undefined {
  return Object.values(PEOPLE).find((p) => p.scenes.includes(sceneId))
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isWhoWatching(text: string): boolean {
  const hay = normalize(text)
  return hay.includes('watching') || hay.includes('heat') || hay.includes('who is watching')
}

export function matchPersonQuery(text: string): Person | 'ask' | null {
  const hay = normalize(text)
  if (!hay || isWhoWatching(hay)) return null
  const asking =
    /^(who is|who s|who are|who's|who)\b/.test(hay) ||
    hay.startsWith('ask who') ||
    hay.startsWith('tell me about') ||
    hay.startsWith('describe ') ||
    hay.includes('who is')
  if (!asking) return null
  for (const p of Object.values(PEOPLE)) {
    if (p.aliases.some((a) => hay.includes(a))) return p
  }
  if (asking) return 'ask'
  return null
}

export function markMetOnLeave(fromScene: string, _toScene: string, flags: GameState['flags']): GameState['flags'] {
  const from = personAtScene(fromScene)
  if (!from) return flags
  return { ...flags, [from.metFlag]: true }
}

import type { GameState } from './types'

export type PersonId =
  | 'oiltooth'
  | 'kaelen'
  | 'valerius'
  | 'rell'
  | 'silas'
  | 'nim'
  | 'thalia'
  | 'oram'
  | 'brin'
  | 'zafir'
  | 'ossa'
  | 'sybella'

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
      'ch1:p-oil',
    ],
    later: {
      'camp:cages': `Holding pens. Each cage a ribcage for a penniless laborer. Yours still smells like the last Bleed. Cartel Scrip in the hem.

Oil-Tooth is still in the next bunk, brass jaw working, already talking the job: sabotage the station, he hotwires a Strider. Kaelen the Sifter is not here. Kaelen sells rumors at the Wire.`,
      'camp:lean': `Oil-Tooth works the stall like the wrench is still in his fist. Grease. The smirk. Brass ticking.

"Bleed-Cut," he says. "Great Bleed is coming. You sabotage the guard station. I hotwire a Strider. That is the job. Kaelen the Sifter sells rumors at the Wire if you want news. They are not the inside man. I am."`,
      'camp:jaxson': `"Valerius is the first major victory you have to overcome," Oil-Tooth says, smirking around the brass. "I have watched the guard station until I could draw it in grease.

Great Bleed hits, you sabotage that station. I hotwire an Ironclad Skiff-Strider. We leave the pens. You want rumors — Kallik, the Hunger, the blonde — that is Kaelen the Sifter at the Wire. They sell leads. I sell a ride."`,
      'camp:bay': `Oil-Tooth is under a hull if the job is live — welding leather, smirk the brass jaw cannot hide. The Striders stand like bad architecture. Corporate tags he has been waiting to steal.`,
      'ch1:p-oil': `The stolen Strider coughs like a guilty throat. Oil-Tooth is under the hull anyway — brass, leather, tags he still has not cut off. He hotwired. He will not tour. Red Maw is south of his cowardice.`,
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
  rell: {
    id: 'rell',
    name: 'Clerk Rell',
    aliases: ['rell', 'clerk', 'clerk rell', 'payroll'],
    metFlag: 'metRell',
    card: `Clerk Rell — a payroll clerk with a steam-tablet and dust in the seams of a uniform that was never meant to leave Ironwood. He hunts numbers that stood up.

Cruel only as a filing. He wants shade and a cooler ledger. Scrip is a lullaby. A chip is a door. Bolting just means he writes you for a Hound and goes home.`,
    scenes: ['ch1:p-clerk'],
    later: {
      'ch1:p-clerk': `Steam-tablet. Dust in the seams. "Laborer 04-bleed. Papers. Scrip as a lullaby. Or I write you for a Hound."`,
    },
  },
  silas: {
    id: 'silas',
    name: 'Silas',
    aliases: ['silas', 'vane', 'shade'],
    metFlag: 'metSilas',
    card: `Silas Vane is older than the well's disappointment. One eye is milk. The other is accounting. The tent smells of resin-chew and wet wool that has never been wet.

He sells shade by the minute. Talk is not free. Drops are a fairy tale he still keeps in stock for people who pay. He is not Kaelen. Kaelen sells inventory. Silas sells the minute you are not in the sun.`,
    scenes: [
      'spine:ridge',
      'spine:shade',
      'spine:silas',
      'spine:silas-drop',
      'spine:silas-cache',
      'spine:tip',
      'ch1:o-silas',
    ],
    later: {
      'spine:ridge': `The Bleached Spine is a ridge of bone-pale rock. Nothing casts a kind shadow. Your empty vial ticks against your ribs like a second, drier heart.

Down-slope: Silas's tent, still selling shade by the minute. Farther, the dry well. Hound tracks stitch the eastern wash.`,
      'spine:shade': `Silas sits the expensive shade. One eye milk, one eye accounting. "Noon-Empty," he says. "Shade is not free. Talk is not free. Drops still cost."`,
      'spine:silas': `He pours nothing into a cup and drinks it with ceremony.

"Cartel Hounds on the east wash. Seeker skiff on the south wind — blonde, kohl like a bruise, hunting batteries that walk. And you, with a vial that sounds empty even when you don't shake it."`,
      'ch1:o-silas': `The tent is now a rag on a rib. Milk eye. Accounting eye. "I sold you a minute. This is a different minute. South is Nim. She collects what I only sell."`,
    },
  },
  nim: {
    id: 'nim',
    name: 'Nim',
    aliases: ['nim', 'cut-fee', 'cut fee', 'cutfee'],
    metFlag: 'metNim',
    card: `Nim the Cut-Fee sits shade like a toll. Resin under the nails. A knife that has only ever been for minutes.

Silas sells the minute. She collects it. Glint, scratch, empty glass — or she names you to the wash and lets noon finish the invoice. She is not Kaelen. She is not Silas. She is the tax on being Stray in daylight.`,
    scenes: ['ch1:o-tax'],
    later: {
      'ch1:o-tax': `Resin under the nails. Shade like a till. "Noon-Empty. Pay or run noon. I tell the wash your name either way if you cheap me."`,
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
  brin: {
    id: 'brin',
    name: 'Brin',
    aliases: ['brin', 'kesh', 'runner', 'runners', 'seeker runner'],
    metFlag: 'metBrin',
    card: `Brin speaks. Kesh flanks. Gold-dust on the cheek, hymn still in the mouth, spears that think they are a kindness.

Thalia's love made you loud. They want a pour, a cloth, or a confession. They will not chase far. They will sing your shape to the blonde, and that is a net with better manners than a Hound.`,
    scenes: ['ch1:v-runners'],
    later: {
      'ch1:v-runners': `Two spears. One mouth. "Pour so we know you are still a cup. Or we take you to the blonde already."`,
    },
  },
  zafir: {
    id: 'zafir',
    name: 'Zafir',
    aliases: ['zafir'],
    metFlag: 'metZafir',
    card: `Zafir smiles in a way that costs extra. Bone-cairn merchant. Approach stall. He sells headings to Kallik's hole, news that Sybella already knows you're coming, and a small Maw shop: Drops at highway prices, Hound Hide, a shock baton somebody pawned, scrap for Glints.

He is not Kaelen. Kaelen is inventory with gloves. Zafir is a man who sold the same heading twice and is waiting to see which buyer lives.`,
    scenes: ['ch1:v-zafir', 'maw:zafir', 'maw:market'],
    later: {
      'ch1:v-zafir': `He looks at gold thread like fire in a dry stall. "I don't sell headings to walking batteries. I sell the news that she already knows."`,
      'maw:zafir': `"You lived. How rude." The stall actually stocks things now — Hide, a baton, Drops, a tray that buys scrap. Sybella circled twice. He is waiting to see which product you pick.`,
      'maw:market': `A few stalls that pretend this is a town. Zafir is here if the cairn did not keep him. Same smile. A real tray of goods, not only news.`,
    },
  },
  ossa: {
    id: 'ossa',
    name: 'Ossa',
    aliases: ['ossa', 'stilts', 'stilt'],
    metFlag: 'metOssa',
    card: `Ossa stands three feet above hungry sand on stilts lashed with cord repaired more times than made. A vial rides her hip, half-full, honest. She sees kit before faces.

She is a living person on purpose. She falls funny. She does not die easy. A twice-tied knot means she can find you — not a marriage. A refusal to die separately if dying together is stupider.`,
    scenes: ['ch1:p-ossa', 'ch1:o-ossa', 'ch1:ossa-talk', 'ch1:ossa-rob', 'maw:stilt', 'maw:ossa'],
    later: {
      'ch1:p-ossa': `Stilts. She is counting the wire still in your cuffs. "You smell like a cage. I don't hide property."`,
      'ch1:o-ossa': `Stilts. Kin-height. Honest glass. "Family can still be cruel. Don't lunge."`,
      'maw:stilt': `Ossa is here, stilts unstrapped or not, repairing a lash or refusing shade. Alive is still the headline.`,
      'maw:ossa': `"I'm alive," she says, which is both greeting and warning. The Maw wants the cache. She wants stilts that keep working.`,
    },
  },
  sybella: {
    id: 'sybella',
    name: 'Sybella',
    aliases: ['sybella', 'blonde', 'skiff'],
    metFlag: 'metSybella',
    card: `Sybella — blonde, kohl ruined on purpose, blindfold up like a discarded halo. A sand-skiff. A voice like a lullaby that learned law.

She needs a lantern that can walk. A furnace. A battery. Seekers-only kindness. Cartel mouths and Stray empties get hunted, not fed. She will bargain. She is very good at remaining the most reasonable person in a murder.`,
    scenes: ['ch1:sybella', 'maw:smoke', 'maw:sybella', 'maw:sybella-shadow'],
    later: {
      'ch1:sybella': `The sky goes brass. The skiff comes in low. Hard choice. Resource poker. No dice.`,
      'maw:smoke': `The skiff is parked like a threat that learned manners. Incense or resin-smoke. She is here. Hunting. Reasonable.`,
      'maw:sybella': `"The Approach is a waiting room," she says. "The Walking Amber is the appointment. Fill, walk, don't crack."`,
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

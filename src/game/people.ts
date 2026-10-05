import type { GameState } from './types'

export type PersonId =
  | 'oiltooth'
  | 'kaelen'
  | 'valerius'
  | 'rell'
  | 'silas'
  | 'drennick'
  | 'thalia'
  | 'oram'
  | 'brin'
  | 'zafir'
  | 'ossa'
  | 'sybella'
  | 'handler'
  | 'korvan'
  | 'mira'
  | 'corvin'
  | 'jodi'
  | 'carapace'

export type Person = {
  id: PersonId
  name: string
  aliases: string[]
  metFlag: string
  card: string
  scenes: string[]
  later: Partial<Record<string, string>>
  /** Always sees through the Vessel Cloth disguise (Prisoner and Outcast doors). */
  seesThroughDisguise?: boolean
}

export const PEOPLE: Record<PersonId, Person> = {
  carapace: {
    id: 'carapace',
    name: 'Nim',
    // Nim is his Dune-Stray name. Caius Draven is his old Cartel name. Never "Shard-Hound"; shard-hounds are beasts.
    aliases: ['nim', 'carapace hunter', 'carapace', 'bounty hunter', 'tracker', 'harpoon', 'draven', 'caius', 'caius draven'],
    metFlag: 'metCarapace',
    card: `Nim, the Carapace hunter. A scarred bounty hunter in patched armor made from the glassy black carapace of Shard-Born Striders he has killed. A cracked respirator mask under a hood. A heavy serrated harpoon rifle.

He was a high-ranking Cartel mercenary until a failed expedition got him cast out. He took the Dune-Stray name Nim after he left. His old Cartel name is Caius Draven, and Cartel people still use it. Now he tracks runaways and stolen Glance-Shards for whoever pays. Cold, relentless, superstitious. He believes the amber sands demand blood and treats every hunt as a ritual. Someone hired him to track you.`,
    scenes: [],
    later: {},
  },
  korvan: {
    id: 'korvan',
    name: 'Korvan Drell',
    aliases: ['korvan', 'drell', 'korvan drell', 'amber man', 'archivist'],
    metFlag: 'metKorvan',
    card: `Korvan Drell. Hardened amber seals his mouth and both eyes; he breathes and speaks through a gap at one corner. He kept records for the Seekers until he found a memory-fragment in the sand outside the Spire that contradicted their doctrine. They branded him a heretic. The Cartel sealed his face with molten sap, which they call amber-waxing. A Dune-Stray smuggled him out.

Wary. Ostracized. He lives at the edge of Silas's shade and trades fragments of forbidden history for water and shelter. The amber on his face is full of voices. He is the one person on the Spine who will talk to you. He will not say what your brand is for.`,
    scenes: ['spine:korvan'],
    later: {
      'spine:korvan': `Korvan sits where the canvas runs out, amber over his mouth and eyes. He moves over to make room. "Ask me anything else," he says.`,
    },
  },
  mira: {
    id: 'mira',
    name: 'Mira Thorn',
    aliases: ['mira', 'thorn', 'mira thorn', 'one-handed woman'],
    metFlag: 'metMira',
    card: `Mira Thorn. Her left hand is gone; she lost it pulling her brother out of a Gilded Hollow. Cartel overseers branded her a coward for it. She joined the Dune-Strays. She reads memory-residue in amber sand and knows the old ruins.

She does not speak. She guards people who are looking for the truth, and she has no use for people looking for profit.`,
    scenes: ['spine:mira'],
    later: {},
  },
  jodi: {
    id: 'jodi',
    name: 'Jodi Hollowmere',
    aliases: ['jodi', 'hollowmere', 'jodi hollowmere', 'snake woman', 'woman with the snake'],
    metFlag: 'metJodi',
    card: `Jodi Hollowmere. A Dune-Stray who keeps carrion birds and sand rats on the sunny side of Silas's shade. Two vultures, a sand python named Grudge, and more rats than she will count. They bring her what they find on the dead, and she trades it.

Dark, funny, a little wild. She has been through worse than most on the Spine and takes pain without much fuss. She is careful anyway. She talks to her animals more than to people, and she keeps the snake between her pile and anyone she does not know.`,
    scenes: ['spine:jodi'],
    later: {
      'spine:jodi': `Jodi sits on her canvas heap with the snake over her shoulders. The vultures shift on their frame when you come back.`,
    },
  },
  corvin: {
    id: 'corvin',
    name: 'Corvin Pryce',
    aliases: ['corvin', 'pryce', 'corvin pryce', 'deserter'],
    metFlag: 'metCorvin',
    card: `Corvin Pryce. A Cartel security conscript who guarded ironwood harvesters out by the Gilded Hollows. He watched the Cartel execute Dune-Stray refugees for siphoning sap. When they ordered him to fire on the families, he dropped his rifle and deserted into the deep sand. The Cartel and the Seekers both hunt him.

He knows the traps on the dry ford and uses them to protect Dune-Strays, as penance. He does not ask what your brand is for.`,
    scenes: ['spine:corvin'],
    later: {},
  },
  handler: {
    id: 'handler',
    name: 'Hound-handler',
    aliases: ['hound-handler', 'hound handler', 'handler', 'leash'],
    metFlag: 'metHandler',
    card: `The Hound-handler. Lean kit, shock-leash, an amber-eyed shard-hound at his heel with its eyes open. He likes a throat.`,
    scenes: [],
    later: {},
  },
  oiltooth: {
    id: 'oiltooth',
    name: 'Jaxson',
    aliases: ['jaxson', 'vance', 'jaxson vance', 'oil-tooth', 'oiltooth', 'oil tooth', 'brass jaw'],
    metFlag: 'metOilTooth',
    card: `Jaxson "Oil-Tooth" Vance — burly, grease-stained, permanent smirk, cybernetic brass jaw catching the steam-light. Scorched welding leathers with corporate inventory tags he never cut off. An oversized wrench when he is not hiding it.

People call him Oil-Tooth because of the brass jaw. He got it saving an apprentice, and the name came with it. Nobody else in Camp-04 gets to wear it.

Prison-break technical inside man. Reckless. Charismatic. Anti-authority. Humor as a shield. Observant of security weaknesses. He has skimmed Oasis Sap for a lifetime of repairing Ironclad Skiff-Striders. He hotwires. Headings are Kaelen's.`,
    scenes: [
      'camp:cages',
      'camp:lean',
      'camp:jaxson',
      'camp:jaxson-cache',
      'camp:jaxson-drop',
      'crisis:camp',
      'ch1:p-oil',
    ],
    later: {
      'camp:cages': `Holding pens. Each cage a ribcage for a penniless laborer. Yours still smells like the last Bleed. Cartel Scrip in the hem.

Jaxson is still in the next bunk, brass jaw working. The job is the station, then a Strider.`,
      'camp:lean': `The stall is hot metal and skimmed sap. The oversized wrench is in his fist.

"Bleed-Cut. Great Bleed is coming. You sabotage the guard station. I hotwire a Strider."`,
      'camp:jaxson': `"Valerius is the first thing you have to get out from under," Jaxson says, smirking around the brass. "Tower. Baton. He hunts anyone skimming Sap. I have watched the guard station until I could draw it in grease.

Great Bleed hits, you sabotage that station. I hotwire a Strider. We leave the pens. Rumors are Kaelen, at the Wire."`,
      'ch1:p-oil': `The stolen Strider coughs like a guilty throat. Jaxson is under the hull anyway — brass, leather, tags he still has not cut off. He hotwired. He will not tour. Red Maw is east of his cowardice.`,
    },
  },
  kaelen: {
    id: 'kaelen',
    name: 'Kaelen',
    aliases: ['kaelen', 'sifter', 'merchant'],
    metFlag: 'metKaelen',
    card: `Kaelen the Sifter jitters — a diminutive merchant in dust-caked canvas, an overstuffed pack of vials, gears, and amber jars, thick gloves on both hands. Born near the Ironwood roots in the first Great Bleed. Lost his family to a Gilded Hollow raid. He sifts memory-essence from amber sand, sells to the Seekers, and quietly funds storm-escape routes.

He will not sell anything meant to harm a fellow survivor. He trades Drops for scrap and rumors for Glints.`,
    scenes: [
      'camp:wire',
      'camp:kaelen',
      'camp:kaelen-rumors',
      'thresh:sift',
      'thresh:kaelen',
      'thresh:kaelen-rumors',
      'roam:kaelen',
    ],
    later: {
      'camp:wire': `The perimeter. Razor-wire. Steam-vents coughing. Beyond it the dunes begin to have opinions.

Kaelen the Sifter is here when profit says here — pack, gloves, already counting. Rumors if you ask. Drops if you pay.

Ironclad Skiff-Striders patrol the other side of this line. The Hunger lives past it. So do Hounds.`,
      'camp:kaelen': `Kaelen works the pack with both gloves. The Wire at his back like a second strap. "Pick a shelf," he says. "Buy. Sell. Rumors."`,
      'thresh:sift': `Hymn-shade off the paddock. Not a stall. A pack on a false-route wall.

Kaelen the Sifter is here when the route says here — gloves, already counting. He buys false routes. He sells what will not open a survivor.`,
      'thresh:kaelen': `Kaelen works the pack with both gloves. Hymn-dust on the canvas. "Pick a shelf," he says. "Buy. Sell. Rumors that open roads."`,
    },
  },
  valerius: {
    id: 'valerius',
    name: 'Valerius',
    aliases: ['valerius', 'overseer'],
    metFlag: 'metValerius',
    card: `Overseer Valerius — imposing, scarred, reinforced iron plating over dust-cloaks, a steam-hissing shock baton in the fist. Cruel. Calculating. Brutal enforcer protecting corporate interests. He hunts Sap thieves and unpermitted relic hoarders. Sadistic. Arrogant. Disciplined.

He is the immediate antagonist. The looming shadow. First major victory: get out from under him. On the Spine he follows the Hounds through the east wash, hunting a Cartel deserter.`,
    scenes: [
      'camp:tower',
      'camp:valerius',
      'camp:hunter',
      'spine:hound',
      'spine:valerius',
    ],
    later: {
      'camp:tower': `The tower leaks shade, steam, and authority. Valerius stands in it like a nail stands in wood. The shock baton hisses. He is already writing you down.`,
      'camp:valerius': `Valerius does not bother to raise the shock baton. Steam hisses in the grip anyway.

"You are out of position," he says, cruel and calculating, mild as boiled water. "Escaped spends a Hound. Useful scrapes until the hands forget they were hands."`,
      'camp:hunter': `Whistles. Boots. The Yard becomes a diagram.

Valerius arrives. He does not run. "The penniless laborer is upright. How optimistic." Behind him a Hound-handler checks a muzzle.`,
      'spine:hound': `Prints. Shard-Hounds — Cartel-made, resin-jawed.

Overseer Valerius walks behind the Hound in a dust coat, hunting a deserter. He looks at you like loose property.`,
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

He sells shade by the minute. Talk is not free. Drops are a fairy tale he still keeps in stock for people who pay.`,
    scenes: [
      'spine:shade',
      'spine:silas',
      'spine:silas-drop',
      'spine:silas-cache',
      'spine:tip',
      'ch1:o-silas',
    ],
    later: {
      'spine:shade': `Silas sits the expensive shade. One eye milk, one eye accounting. "Noon-Empty," he says. "Shade is not free. Talk is not free. Drops still cost."`,
      'spine:silas': `He pours nothing into a cup and drinks it with ceremony.

"Cartel Hounds on the east wash. Seeker skiff on the south wind — blonde, kohl like a bruise, hunting batteries that walk. And you, with a vial that sounds empty even when you don't shake it."`,
      'ch1:o-silas': `The tent is now a rag on a rib. Milk eye. Accounting eye. "I sold you a minute. This is a different minute. South is Drennick Voss. He collects what I only sell."`,
    },
  },
  drennick: {
    id: 'drennick',
    name: 'Drennick Voss',
    aliases: ['drennick', 'drennick voss', 'voss', 'cut-fee', 'cut fee', 'cutfee', 'toll'],
    metFlag: 'metDrennick',
    card: `Drennick Voss. Born in the shadow of the Ironwood roots and raised as a Logging Cartel Sifter runner. His job was to retrieve memory-pearls before the Gilded Hollows could claim them. At 18 he survived the Great Bleed storm alone, when a hollow automaton swallowed his whole crew. It left him with the only map to a hidden cache.

He now runs the dangerous perimeter between the Dune-Strays and the Cartel, carrying secrets that could get him killed. On the shade-road south of Silas he collects the fee: a Glint, a scratch, an empty glass, or he names you to the wash. He carries the guilt of being the only survivor, and it drives him to take impossible risks to save others. He is hiding the location of the cache, which is empty now, because he suspects an insider betrayed his crew. He knows the Strays are coming for him next.`,
    scenes: ['ch1:o-tax'],
    later: {
      'ch1:o-tax': `Drennick sits the same shade. Resin under the nails. "Noon-Empty. Pay or run noon. I tell the wash your name either way if you cheap me."`,
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

Zafir is a man who sold the same heading twice and is waiting to see which buyer lives.`,
    scenes: ['ch1:v-zafir', 'maw:zafir', 'maw:market'],
    later: {
      'ch1:v-zafir': `He looks at gold thread like fire in a dry stall. "I don't sell headings to walking batteries. I sell the news that she already knows."`,
      'maw:zafir': `"You lived. How rude." The stall actually stocks things now — Hound Hide, a baton, Drops, a tray that buys scrap. Sybella circled twice. He is waiting to see which product you pick.`,
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
    scenes: ['ch1:p-ossa', 'ch1:o-ossa', 'ch1:ossa-talk', 'ch1:ossa-rob', 'maw:stilt', 'maw:ossa', 'maw:ossa-day'],
    later: {
      'ch1:p-ossa': `Stilts. She is counting the wire still in your cuffs. "You smell like a cage. I don't hide property."`,
      'ch1:o-ossa': `Stilts. Kin-height. Honest glass. She talks to you like a stranger. "Show empty glass if you have it. Don't lunge."`,
      'maw:stilt': `Ossa is here, stilts unstrapped or not, repairing a lash or refusing shade. Alive is still the headline.`,
      'maw:ossa': `"I'm alive," she says, which is both greeting and warning. The Maw wants the cache. She wants stilts that keep working.`,
      'maw:ossa-day': `The stranger voice is gone. She tells you she raised you, that raiders burned the homestead and took you at thirteen while she walked the perimeter, and that she has looked for you for fifteen years. She does not know who took you. The rest waits until you are ready.`,
    },
  },
  sybella: {
    id: 'sybella',
    name: 'Sybella',
    aliases: ['sybella', 'blonde', 'skiff'],
    metFlag: 'metSybella',
    card: `Sybella — older, blonde, kohl ruined on purpose, blindfold pushed up. A sand-skiff. Cold of faith. She was High Seeker Thalia's mentor, a faithful acolyte until the Cartel and the Dune-Strays made her bitter.

She would bury a road in amber and sand before she let an enemy reach what is sealed in the Spire. Danger first. Enemy only if you make one.`,
    seesThroughDisguise: true,
    scenes: ['ch1:sybella', 'maw:smoke', 'maw:sybella', 'maw:sybella-shadow'],
    later: {
      'ch1:sybella': `The sky goes brass. The skiff comes in low. She has already let one name slip. She will not say it again.`,
      'maw:smoke': `The skiff is parked like a threat that learned manners. Resin-smoke. She is here. Hunting. Patient.`,
      'maw:sybella': `"The Approach is patient," she says. "So am I."`,
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

export function personKnown(state: GameState, person: Person): boolean {
  if (state.flags[person.metFlag]) return true
  if (state.flags[`asked:${person.id}`]) return true
  const here = personAtScene(state.sceneId)
  if (here?.id === person.id) return true
  // The Outcast wakes at Silas's feet; he is known from the opening on.
  if (person.id === 'silas' && state.door === 'outcast') return true
  if (person.id === 'handler' && (state.flags.metHandler || state.flags.hunterHere)) return true
  if (person.id === 'sybella' && state.flags.hunterHere && (state.hubId === 'redmaw' || state.sceneId.startsWith('maw:'))) {
    return true
  }
  return false
}

export function matchPersonQuery(text: string, state?: GameState): Person | 'ask' | 'unknown' | null {
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
    if (!p.aliases.some((a) => hay.includes(a))) continue
    if (state && !personKnown(state, p)) return 'unknown'
    return p
  }
  if (asking) return 'ask'
  return null
}

export function markMetOnLeave(fromScene: string, _toScene: string, flags: GameState['flags']): GameState['flags'] {
  const from = personAtScene(fromScene)
  if (!from) return flags
  return { ...flags, [from.metFlag]: true }
}

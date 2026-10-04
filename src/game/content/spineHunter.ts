/**
 * The Spine's hunters. Stray Heat drives the hunt on Spine ground.
 *
 * Two faces, picked when the hunt arrives (see `spineHunterFor`):
 *  - Low Stray Heat: a Stray collector, a local with two friends down-slope. Pay, fight, or hide.
 *  - Stray Heat at CARAPACE_HUNTER_HEAT or more: the Carapace hunter, the bounty tracker hired to bring you in.
 *
 * hunter.ts, art.ts, look.ts, people.ts, and encounter.ts all read from here.
 */

export type SpineHunterKind = 'collector' | 'carapace'

export type SpineHunter = {
  kind: SpineHunterKind
  /** Speaker name on the pressure card. */
  face: string
  /** Appended to the scene while the hunt is on this ground. */
  append: string
  /** `look` while the hunt is on this ground. */
  look: string
  fightLabel: string
  fightSub: string
  fightOpen: string
  /** Encounter card for the fight. */
  encounter: { name: string; strike: number; shell: number; hp: number; line: string }
  /** Scene art key while the hunt is on this ground. */
  art: 'hunger' | 'carapace'
}

/** The low-heat face. */
export const SPINE_HUNTER: SpineHunter = {
  kind: 'collector',
  face: 'Stray collector',
  append: `A Stray collector walks up onto this ground and says your name. Two more wait down-slope in the shade.

"You took from the Spine. Pay it back, or pay it here." You stay on this ground. Pay, fight, hide, or pick a road.`,
  look: 'A Stray collector has your name. Two more wait down-slope. Pay, fight, or hide.',
  fightLabel: 'Fight the collector',
  fightSub: 'The one who said your name. You stay.',
  fightOpen: 'You go for the collector. The two down-slope stay where they are. This ground is the fight.',
  encounter: {
    name: 'Stray collector',
    strike: 3,
    shell: 1,
    hp: 2,
    line: 'A Stray collector. Resin under the nails, a short knife, two friends down-slope who stay out of it.',
  },
  art: 'hunger',
}

/** Stray Heat at which the Carapace hunter takes over the Spine hunt from the collector. */
export const CARAPACE_HUNTER_HEAT = 4

/**
 * The Carapace hunter: Nim. Nim is the Dune-Stray name he took after he defected.
 * His old Cartel name is Caius Draven; Cartel people use it (spine:valerius, journal rumor "draven").
 * He is never a Shard-Hound; shard-hounds are beasts.
 */
export const CARAPACE_HUNTER: SpineHunter = {
  kind: 'carapace',
  face: 'Nim',
  append: `A man in a hood walks up the slope without hurrying. His armor is patched together from glassy black carapace, plates cut off Shard-Born Striders he has killed. A cracked respirator covers his face. A heavy harpoon rifle with a serrated head rides across his back. Scars show where the plates do not meet.

He stops at a distance he has chosen and kneels. He pours a pinch of amber sand from his glove onto the ground between you, the way someone else would say a prayer.

"The sands want blood for what they give," he says through the mask. "I am Nim. Someone paid me for yours." A Cartel rank mark has been scraped off one of his shoulder plates. You stay on this ground. Fight, hide, or pick a road. He does not take scrap.`,
  look: 'Nim, the Carapace hunter, is on this ground: carapace armor, cracked respirator, a serrated harpoon rifle. He was hired for you. He does not take scrap.',
  fightLabel: 'Fight Nim',
  fightSub: 'Strike 4, Shell 2, Health 3. A weapon and armor help.',
  fightOpen: 'He stands, unslings the harpoon rifle, and holds it like a spear. This ground is the fight.',
  encounter: {
    name: 'Nim',
    strike: 4,
    shell: 2,
    hp: 3,
    line: 'Nim, the Carapace hunter. Shard-Born carapace plates, a cracked respirator, a serrated harpoon rifle held like a spear. He was Cartel once. Now he hunts runaways and stolen Glance-Shards for pay.',
  },
  art: 'carapace',
}

export const SPINE_HUNTERS: Record<SpineHunterKind, SpineHunter> = {
  collector: SPINE_HUNTER,
  carapace: CARAPACE_HUNTER,
}

/** The face is fixed when the hunt arrives (flag `spineHunterKind`); before that, Stray Heat decides. */
export function spineHunterFor(state: { flags?: Record<string, unknown>; heat?: { strays: number } }): SpineHunter {
  const locked = state.flags?.spineHunterKind
  if (locked === 'carapace' || locked === 'collector') return SPINE_HUNTERS[locked]
  return (state.heat?.strays ?? 0) >= CARAPACE_HUNTER_HEAT ? CARAPACE_HUNTER : SPINE_HUNTER
}

import type { DoorId } from './types'

/**
 * Each door walks its own road to Red Maw. They meet at the Maw Rim.
 * Content text says "the Gullet"; it is shown as the door's own road. Ids stay the same.
 */
export const ROADS: Record<DoorId, { name: string; bare: string; from: string; maw: string; rim: string }> = {
  prisoner: {
    name: 'the Gullet',
    bare: 'Gullet',
    from: 'west',
    maw: 'Red Maw lies east of Camp-04.',
    rim: 'The Gullet runs out of the west and ends here, at the Rim.',
  },
  outcast: {
    name: 'the Bone Wash',
    bare: 'Bone Wash',
    from: 'north',
    maw: 'Red Maw lies south of the Bleached Spine.',
    rim: 'The Bone Wash, a dry riverbed, winds in from the north past the Bleached Spine and ends here, at the Rim.',
  },
  vessel: {
    name: "the Pilgrim's Scar",
    bare: "Pilgrim's Scar",
    from: 'southeast',
    maw: 'Red Maw lies northwest of the Threshold.',
    rim: "The Pilgrim's Scar climbs up from the southeast along old Seeker cairns and ends here, at the Rim.",
  },
}

/** Show the door's own road name in place of the Gullet. */
export function roadText(door: DoorId | undefined, text: string): string
export function roadText(door: DoorId | undefined, text: string | undefined): string | undefined
export function roadText(door: DoorId | undefined, text: string | undefined) {
  if (!text || !door || door === 'prisoner') return text
  return text.replace(/\bGullet\b/g, ROADS[door].bare)
}

/** Typed road words per door. "gullet" and "hunger" work everywhere as a fallback. */
export function roadWords(door: DoorId | undefined): RegExp {
  if (door === 'outcast') return /\b(?:hunger|gullet|bone wash|wash)\b/
  if (door === 'vessel') return /\b(?:hunger|gullet|pilgrim'?s scar|pilgrims scar|scar)\b/
  return /\b(?:hunger|gullet)\b/
}

/** The first time you meet him, he says his name. Until then every line calls him "the trader". */
export const KAELEN_INTRO = '"Kaelen," he says, and taps his chest with a gloved thumb. "The Sifter. Now you know who to pay."'

/** Before the player hears Kaelen's name, every line calls him "the trader". */
export function traderText(known: boolean, text: string): string
export function traderText(known: boolean, text: string | undefined): string | undefined
export function traderText(known: boolean, text: string | undefined) {
  if (!text || known || !/Kaelen/.test(text)) return text
  return text.replace(/Kaelen(?: the Sifter)?('s)?/g, (_m, poss: string | undefined, at: number, all: string) => {
    const before = all.slice(0, at)
    const start = before === '' || /(?:[.!?]["”]?\s+|\n\s*|^["“]|[.!?:]\s*["“]|\s["“])$/.test(before)
    return `${start ? 'The' : 'the'} trader${poss ?? ''}`
  })
}

/** Text as the player sees it: the door's road, and the trader's name only once heard. */
export function shownText(state: { door?: DoorId; flags: Record<string, unknown> }, text: string): string
export function shownText(state: { door?: DoorId; flags: Record<string, unknown> }, text: string | undefined): string | undefined
export function shownText(state: { door?: DoorId; flags: Record<string, unknown> }, text: string | undefined) {
  const road = roadText(state.door, text)
  // On the intro screen, everything before his line still says "the trader"; his line names him.
  if (state.flags.kaelenIntroNow && road?.includes(KAELEN_INTRO)) {
    return road.split(KAELEN_INTRO).map((part) => traderText(false, part)).join(KAELEN_INTRO)
  }
  return traderText(!!state.flags.kaelenKnown && !state.flags.kaelenIntroNow, road)
}

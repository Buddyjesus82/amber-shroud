/**
 * v223 DRAFT. Unapproved player-facing lines for the Prisoner playtest.
 * Wired so they can be heard in game. Jeramie has not approved the wording.
 */
import type { GameState, Scene } from './types'
import { PASSAGE_HEAT } from './heatRelief'

/** Cartel Heat 6+ is the existing "they are already watching" line. At that heat a name is no longer withheld. */
export function prisonerIdentityClosed(state: GameState, scene: Scene): boolean {
  if (state.door !== 'prisoner') return false
  if ((state.heat.cartel ?? 0) >= PASSAGE_HEAT) return false
  const id = scene.id
  if (id.includes('kaelen') && state.flags.kaelenKnown) return false
  if ((id.startsWith('camp:jaxson') || id === 'camp:lean') && state.flags.jaxsonInside) return false
  if (id === 'camp:bay-pike' && state.flags.wrenchBayTrade === 'pike') return false
  if (id === 'camp:bay-sarn' && state.flags.wrenchBayTrade === 'sarn') return false
  if (id === 'camp:bay-vetch' && state.flags.wrenchBayTrade === 'vetch') return false
  if (state.flags.metHandler && (id === 'camp:hunter' || id === 'camp:gate' || state.flags.hunterHere)) return false
  return true
}

/** DRAFT evasions. The real name lines in voices.ts stay for after trust or Cartel Heat 6. */
export const DRAFT_WHO: Record<string, string> = {
  pike: 'Pike does not look up. "No."',
  sarn: 'Sarn keeps counting. "A number does not get a name."',
  vetch: 'The mask stays down. "Weld, or leave."',
  kaelen: '"A name is inventory. You have not paid."',
  jaxson: 'He works the jaw. "Come back with a job."',
  valerius: '"Labor does not get an introduction."',
  handler: 'He checks the muzzle. "No."',
  rell: '"Payroll does not chat."',
  closed: 'They do not give you a name.',
}

export function draftWhoLine(scene: Scene): string {
  const id = scene.id
  const speaker = scene.speaker ?? ''
  if (id.includes('kaelen') || speaker.startsWith('Kaelen')) return DRAFT_WHO.kaelen
  if (id === 'camp:bay-pike' || speaker === 'Pike') return DRAFT_WHO.pike
  if (id === 'camp:bay-sarn' || speaker === 'Sarn') return DRAFT_WHO.sarn
  if (id === 'camp:bay-vetch' || speaker === 'Vetch') return DRAFT_WHO.vetch
  if (id.startsWith('camp:jaxson') || id === 'camp:lean' || speaker.startsWith('Jaxson')) return DRAFT_WHO.jaxson
  if (id === 'camp:valerius' || id === 'camp:tower' || id === 'camp:hunter' || speaker.includes('Valerius')) return DRAFT_WHO.valerius
  if (speaker.includes('Handler') || speaker.includes('Hound')) return DRAFT_WHO.handler
  if (speaker.includes('Clerk') || speaker.includes('Rell')) return DRAFT_WHO.rell
  return DRAFT_WHO.closed
}

export const DRAFT_KAELEN_BAYS_LABEL = 'Ask how the bays sit'
export const DRAFT_KAELEN_BAYS_SUB = 'He will name the docks. He will not fill your pockets.'
export const DRAFT_KAELEN_BAYS = '"Three skiffs. Pike north, Sarn east, Vetch south. The center hull is Jaxson\'s. I sell at the Wire. I do not stock your pockets."'

export const DRAFT_KAELEN_SHADE_LABEL = 'Ask where the shade is'
export const DRAFT_KAELEN_SHADE_SUB = 'Pens, stall, or his pack. Not a gift.'
export const DRAFT_KAELEN_SHADE = '"Shade is the pens, the stall, and this pack. The Yard and the station are not shade. A Drop is a sale."'

export const DRAFT_BAY_SURVIVE_LABEL = 'Ask what keeps you alive'
export const DRAFT_BAY_RUMOR_LABEL = 'Ask what he has heard'

export const DRAFT_BAY = {
  pike: {
    surviveSub: 'Scrape, eat, stay off the count.',
    survive: 'Pike keeps scraping. "The pens have a wall. The station does not."',
    rumorSub: 'Ridge runs, heavy stock.',
    rumor: '"The Wire gets new packs when the Cartel runs the ridge. Kaelen buys low and holds heavy."',
  },
  sarn: {
    surviveSub: 'Count what you take.',
    survive: 'Sarn does not look up. "The Yard writes the rest."',
    rumorSub: 'Seekers at the fence.',
    rumor: '"Seekers checked the outer fence twice before dusk. They aren\'t looking for stray scrap."',
  },
  vetch: {
    surviveSub: 'Keep the torch up.',
    survive: 'The mask stays down. "Rest where the wire is not."',
    rumorSub: 'Movement on the high line.',
    rumor: '"Valerius took two extra guards up the tower line. Something broke on the high conduit."',
  },
} as const

/** DRAFT path hints for Camp-04 roads that had no clause yet. Names are the existing nodes. */
export const DRAFT_LOOK: Record<string, string> = {
  'camp:overlook': 'the overlook above the pens',
  'camp:ration': 'the ration line',
  'camp:siftline': 'the resin sift',
  'camp:genpop': 'the general population pens',
}

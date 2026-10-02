import type { GameState } from './types'

/**
 * Outcast's first goal: a Drop of Oasis Sap in the empty vial Silas tossed him, before noon drains him.
 * Shown in the opening, on `look`, and on `help` until it is done. Marked done once, with a plain line.
 *
 * Paths from the empty start on the Spine (smoke checks the first three):
 *  - Silas's shade-cut (`spine:tip` → Fill the empty vial).
 *  - Silas's mercy, once, at low sap (`spine:silas` → Tell him you will die at noon).
 *  - Scrap or a Glint from scavenging or the well brickwork, then Silas's shelf (Buy a Drop: 1 Glint or 2 scrap).
 *  - Luck: a scavenge can turn up a Drop. With a weapon, the dry well's resin can be scraped.
 */

export const FIRST_DROP_GOAL = 'First goal: get a Drop of Oasis Sap into the empty vial before the noon heat drains you.'
export const FIRST_DROP_DONE = 'First goal done: you have your first Drop of Oasis Sap.'

export function firstDropPending(state: GameState): boolean {
  return state.door === 'outcast' && !state.flags.firstDropMarked && !state.flags.chapter1Done
}

/** Runs on every saved step. Marks the goal the first time a Drop is in hand. */
export function markFirstDrop(state: GameState): GameState {
  if (!firstDropPending(state) || state.sceneId.startsWith('open:')) return state
  if ((state.items.vial_drop ?? 0) <= 0 && !state.flags.firstDrop) return state
  const flash = state.flash ? `${state.flash}\n\n${FIRST_DROP_DONE}` : FIRST_DROP_DONE
  return { ...state, flash, flags: { ...state.flags, firstDropMarked: true } }
}

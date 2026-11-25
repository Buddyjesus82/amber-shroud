/**
 * v256: the player character's own card (Jeramie-approved text, four states).
 * His id is `zafirPc`. Varro keeps the legacy `zafir` person id, `metZafir` and bonewright.jpg.
 * Until Ossa names him (`ossaNamedZafir`, set by a future scene) the name Zafir appears nowhere on the card.
 */
import type { GameState } from './types'

export const ZAFIR_PC_ID = 'zafirPc'
/** Set by Ossa's name reveal (future content). Nothing in the game sets it yet. */
export const OSSA_NAMED_ZAFIR = 'ossaNamedZafir'

export const ZAFIR_TITLE_HIDDEN = 'The Shroud-Touched Orphan'
export const ZAFIR_TITLE_NAMED = 'Zafir — Ossa\u2019s Boy'

const LOOK =
  'Lean and sun-dark, in road-worn gear and a road wrap. Faint amber flecks run along his jaw and the backs of his hands. They catch low light, and only someone who knows what to look for would see them. His hands are rope-scarred. He sits still while others fidget, and he watches.'
const ORPHAN = 'He is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber.'
const ORPHAN_OSSA = 'He is the orphan of the Great Bleed, the Shroud-Touched child from The Hunger in the Amber, found half-buried and raised by Ossa the stilt-walker.'
const NO_PAST = 'On every road he wakes without his past.'
const HABITS = 'Something stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.'
const HABITS_OSSA = 'Some of Ossa stayed in him anyway, as habits he cannot explain: sure feet on bad footing, hands that know rope, and a plain thanks with nothing bargained after it.'
const SAND = 'The sand holds memories, and slowly they begin to answer him.'
const SYBELLA = 'Sybella notices. At their first meeting she lets one name slip: The Walking Amber.'

export type ZafirCardState = 1 | 2 | 3 | 4

export type ZafirCard = {
  id: typeof ZAFIR_PC_ID
  state: ZafirCardState
  title: string
  /** Two paragraphs, joined by a blank line. */
  text: string
  cover: 'zafir_pc'
}

export function zafirCardState(state: Pick<GameState, 'flags'>): ZafirCardState {
  const f = state.flags
  if (f[OSSA_NAMED_ZAFIR]) return 4
  if (f.ossaToldDay) return 3
  if (f.heardWalkingAmber) return 2
  return 1
}

export function zafirCard(state: Pick<GameState, 'flags'>): ZafirCard {
  const f = state.flags
  const level = zafirCardState(state)
  const ossa = level >= 3
  // State 4's approved text always carries the power and Sybella sentences; states 2-3 only once she has said it.
  const sybella = level === 4 || !!f.heardWalkingAmber
  const second = [ossa ? ORPHAN_OSSA : ORPHAN, NO_PAST, ossa ? HABITS_OSSA : HABITS, ...(sybella ? [SAND, SYBELLA] : [])].join(' ')
  const first = level === 4 ? `Zafir. ${LOOK}` : LOOK
  return {
    id: ZAFIR_PC_ID,
    state: level,
    title: level === 4 ? ZAFIR_TITLE_NAMED : ZAFIR_TITLE_HIDDEN,
    text: `${first}\n\n${second}`,
    cover: 'zafir_pc',
  }
}

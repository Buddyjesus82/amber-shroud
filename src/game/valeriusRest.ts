import type { GameState } from './types'

/**
 * v153: beating the hound or the handler keeps Valerius himself away for 10 quiet scenes.
 * Camp-04 hunts still come; at Cartel 7+ they stay the regular handler until the rest runs out.
 * His own win (v145/v152) is the separate full cooldown (valeriusCool).
 */
export const VALERIUS_REST = 10

/** v171: after Valerius comes himself, the handler takes the next hunts until 3 major node (hub) changes pass. */
export const VALERIUS_NODE_GAP = 3
export function valeriusNodeCooling(state: Pick<GameState, 'flags'>): boolean {
  const n = state.flags.valeriusNodes
  return typeof n === 'number' && n < VALERIUS_NODE_GAP
}

export function valeriusResting(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.valeriusRest && Number(state.flags.valeriusQuiet ?? 0) < VALERIUS_REST
}

/** The camp hunt on screen (or about to open) is Valerius himself. Fixed when the hunt opens. */
export function campHuntIsValerius(state: Pick<GameState, 'flags' | 'heat'>): boolean {
  if ((state.heat?.cartel ?? 0) < 7) return false
  if (state.flags.hunterHere && typeof state.flags.huntNoValerius === 'boolean') return !state.flags.huntNoValerius
  return !valeriusResting(state) && !valeriusNodeCooling(state)
}

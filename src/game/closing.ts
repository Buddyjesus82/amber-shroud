import { heatFactions } from './heat'
import type { Faction, GameState } from './types'

/**
 * v139: lingering at a home camp, and lying low to cool it.
 *   Pressure 10: the home faction's Heat goes up 1, once. From 10 on the home hunter can find you at any Heat (floor 1).
 *   Pressure 12: Camp-04 only, once, the Camp Closes card.
 *   Rest at a home camp: home faction Heat -1 (min 0), once every REST_HEAT_GAP scenes, Pressure +1.
 */
export const CLOSING_PRESSURE = 10
export const FORCED_PRESSURE = 12
export const REST_HEAT_GAP = 4

const HOME_FACTION: Record<string, Faction> = { camp04: 'cartel', spine: 'strays', threshold: 'seekers' }

export function homeFaction(hubId: string | null | undefined): Faction | null {
  return hubId ? (HOME_FACTION[hubId] ?? null) : null
}

/** Still pre-Chapter One, on a home camp's ground, with pressure at 10 or more. */
export function closingNow(state: Pick<GameState, 'hubId' | 'chapterId' | 'pressure' | 'flags'>): boolean {
  return !state.flags.chapter1Done && !state.chapterId && !!homeFaction(state.hubId) && state.pressure >= CLOSING_PRESSURE
}

/** Rest at home can cool Heat: some Heat to lose, and a few scenes since the last time. */
export function restCools(state: GameState): Faction | null {
  const f = homeFaction(state.hubId)
  if (!f || state.chapterId || state.heat[f] <= 0) return null
  const since = Number(state.flags.sceneSteps ?? 0) - Number(state.flags.restHeatStep ?? -99)
  return since >= REST_HEAT_GAP ? f : null
}

export function restCoolLine(state: GameState, f: Faction): string {
  return `${heatFactions(state.door)[f].name} Heat -1.`
}

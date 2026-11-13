import { applyDelta } from './logic'
import type { Effect, GameState } from './types'

export const RUBBLE_PICK = "You spend the energy, picking through the jagged seam block by block. It's slow work, but your hands stay clean and the salvage yields."
export const RUBBLE_FORCE = 'You wedge your shoulder against the loose slab and shove. The noise echoes down the corridor, and the rough concrete bites deep.'
export const RUBBLE_SAP = 'Sap −1.'
export const RUBBLE_HEALTH = 'Health −1.'
/** The Rubble Crawl is the Stray Rust-Pockets. Force raises the heat that route already uses. */
export const RUBBLE_HEAT = 'Stray Heat +1.'

const RUBBLE_LOOT = [
  { item: 'scrap' as const, line: 'Scrap +1.' },
  { item: 'salve' as const, line: 'Resin +1.' },
  { item: 'vial_drop' as const, line: 'Drop +1.' },
]

/** One of Scrap, Resin, or a Drop. Same seed as the rest of the crawl, so a reload does not reroll the seam. */
export function rubbleLoot(state: Pick<GameState, 'ticks' | 'sap' | 'sceneId' | 'flags'>): (typeof RUBBLE_LOOT)[number] {
  let h = (state.ticks * 17 + (state.sap + 3) * 13 + Number(state.flags.sceneSteps ?? 0)) >>> 0
  for (const ch of state.sceneId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return RUBBLE_LOOT[(h >>> 0) % RUBBLE_LOOT.length]
}

/** Stat lines land after the move. A rescue that already left the crawl keeps its own flash. */
export function rubbleResolve(before: GameState, next: GameState, fx: Effect): GameState {
  if (!fx.flag?.rubblePick && !fx.flag?.rubbleForce) return next
  const flags = { ...next.flags }
  delete flags.rubblePick
  delete flags.rubbleForce
  next = { ...next, flags }
  const stayed = next.sceneId === 'deep:shanty' && !next.flags.runOver
  if (fx.flag.rubblePick) {
    const loot = rubbleLoot(before)
    next = applyDelta(next, { add: { [loot.item]: 1 } })
    if (stayed) next.flash = [RUBBLE_PICK, RUBBLE_SAP, loot.line].join('\n')
    return next
  }
  if (stayed) next.flash = [RUBBLE_FORCE, RUBBLE_HEAT, RUBBLE_HEALTH].join('\n')
  return next
}

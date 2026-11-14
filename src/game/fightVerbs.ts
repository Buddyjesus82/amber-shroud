import { ITEMS } from './content/catalog'
import type { GameState, ItemId } from './types'

/** v225: the weapon in the main hand picks the fight verb. Empty hands are Strike. */
export type FightVerbId = 'wrench' | 'crack' | 'cut' | 'plunge' | 'drive' | 'jam' | 'strike'

const BUTTON: Record<FightVerbId, string> = {
  wrench: 'Wrench',
  crack: 'Crack',
  cut: 'Fight',
  plunge: 'Plunge',
  drive: 'Drive',
  jam: 'Jam',
  strike: 'Strike',
}

/** Hit-line stem. Plunge and Drive take "into". */
const HIT: Record<FightVerbId, (foe: string, n: number) => string> = {
  wrench: (foe, n) => `You wrench ${foe} for ${n}.`,
  crack: (foe, n) => `You crack ${foe} for ${n}.`,
  cut: (foe, n) => `You cut ${foe} for ${n}.`,
  plunge: (foe, n) => `You plunge into ${foe} for ${n}.`,
  drive: (foe, n) => `You drive into ${foe} for ${n}.`,
  jam: (foe, n) => `You jam ${foe} for ${n}.`,
  strike: (foe, n) => `You strike ${foe} for ${n}.`,
}

/**
 * Main-hand weapon to verb.
 * Wrench, then harpoon, then spike / Extractor / Piercing, then bolt or jam tools,
 * then club or baton, then blade / shiv / knife, otherwise Strike.
 */
export function fightVerbId(state: Pick<GameState, 'equipped'>): FightVerbId {
  const id = state.equipped?.weapon
  const def = id ? ITEMS[id as ItemId] : undefined
  if (!id || !def || def.strike == null) return 'strike'
  const name = def.name.toLowerCase()
  const note = `${def.perk ?? ''} ${def.desc}`.toLowerCase()
  if (id === 'wrench' || /\bwrench\b/.test(name)) return 'wrench'
  if (/\bharpoon\b/.test(name)) return 'drive'
  if (id === 'seeker_extractor' || /\b(spike|extractor)\b/.test(name) || /\bpiercing\b/.test(note)) return 'plunge'
  if (/\b(bolt|jam)\b/.test(name)) return 'jam'
  if (def.offhand === 'club' || /\b(baton|club)\b/.test(name)) return 'crack'
  if (def.offhand === 'blade' || /\b(blade|knife|shiv|dagger)\b/.test(name)) return 'cut'
  return 'strike'
}

export function fightVerbButton(state: Pick<GameState, 'equipped'>, foe: string): string {
  return `${BUTTON[fightVerbId(state)]} ${foe}`
}

export function fightVerbHit(state: Pick<GameState, 'equipped'>, foe: string, n: number, crit = false): string {
  const line = HIT[fightVerbId(state)](foe, n)
  return crit ? `Critical Strike! ${line}` : line
}

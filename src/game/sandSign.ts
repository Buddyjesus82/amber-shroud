import type { FlagMap, GameState } from './types'

/**
 * Outcast only: small physical signs that the sand answers him. Each shows once and saves a flag.
 * Nobody names it and nobody explains it. He does not know either.
 *
 * TODO(designer): the reveal. It belongs near the Spires or in the Maw: what the brand is for,
 * the runners, the Hollows, the amber shard. Read `sandSignsSeen(state)` to know how many signs he
 * has already had before the reveal plays. Do not reveal it from any line in this file.
 */

/** Health drops to 1 in a fight on sand ground. */
export const SAND_LOW =
  'The sand around your boots slides an inch toward you, all at once, and goes still.'

/** Going Down on sand ground. */
export const SAND_DOWN =
  'Under your cheek the sand moves. It slides out from under your face and piles against your hand, then stops.'

/** First Glint he scavenges, or first time he holds one on purpose. */
export const AMBER_WARM =
  'The amber is warm in your hand, warmer than the sun left it. For a moment it hums against your palm, low, like a plucked wire. Then it is only a stone.'

/** Mira's Hollow drawing, once. */
export const HOLLOW_PULL =
  'While the ring is in the sand, you feel a pull under your ribs toward the south, steady, like a rope tied there. When she brushes the drawing away, it stops.'

/** Typed, once each. */
export const SAND_TOUCH =
  'You put your palm flat on the sand. After a moment a few grains crawl toward the middle of your palm, slow as ants. When you lift your hand, they stop.'
export const HANDS_LOOK =
  'Dry, cracked hands. Amber dust is worked into the lines of your palms, deeper than one day of sand would put it. It does not wash out.'

/** After the first time. */
const SAND_TOUCH_LATER = 'Sand. Hot on top, cooler a finger down.'
const HANDS_LOOK_LATER = 'Dry, cracked hands with amber dust in the lines.'
const AMBER_LATER = 'Spent amber. It sits in your palm like any stone.'

export const SAND_SIGN_FLAGS = ['sandLowSeen', 'sandDownSeen', 'amberWarmSeen', 'hollowPullSeen', 'sandTouchSeen', 'handsLookSeen', 'sandGripSeen'] as const

export function sandSignsSeen(state: GameState): number {
  return SAND_SIGN_FLAGS.filter((f) => state.flags[f] != null && state.flags[f] !== false).length
}

/** In a fight that is going badly the sand takes one hit for him (fightTricks.ts `sandGripLine`). Flag: sandGripSeen. */

/** Spine ground and the Outcast's Noon Country road. */
export function sandGround(state: Pick<GameState, 'door' | 'hubId' | 'sceneId' | 'chapterId'>): boolean {
  if (state.door !== 'outcast') return false
  return (
    state.hubId === 'spine' ||
    state.sceneId.startsWith('spine:') ||
    state.chapterId === 'cache-run' ||
    state.sceneId.startsWith('ch1:o-') ||
    state.sceneId === 'crisis:spine' ||
    state.sceneId === 'crisis:dunes'
  )
}

/** Ticks a sign waits after another sign before the next can show, so two never land together. */
export const SIGN_GAP = 3

function recentSign(state: GameState): boolean {
  const at = Number(state.flags.sandSignAt ?? -99)
  return at >= 0 && state.ticks - at < SIGN_GAP
}

export function lowHealthSign(prev: GameState, next: GameState): string | null {
  if (!sandGround(next) || next.flags.sandLowSeen || recentSign(next)) return null
  if (!next.flags.encounterHere || (prev.health ?? 0) < 2 || next.health !== 1) return null
  return SAND_LOW
}

export function downedSign(state: GameState): string | null {
  if (!sandGround(state) || state.flags.sandDownSeen || recentSign(state)) return null
  return SAND_DOWN
}

export function amberFindSign(state: GameState, foundGlint: boolean): string | null {
  if (state.door !== 'outcast' || !foundGlint || state.flags.amberWarmSeen || recentSign(state)) return null
  return AMBER_WARM
}

const HANDS = /\b(look|examine|check|inspect|study)\b.*\b(hands?|palms?|fingers)\b/
const SAND = /\b(touch|feel|rub|press|put|lay|sift|dig)\b.*\bsand\b/
const AMBER = /\b(touch|feel|hold|rub|squeeze|look at|examine)\b.*\b(glints?|amber)\b/

/** Typed hands / sand / amber on the Outcast door. Returns the line and the flag to save. */
export function sandTouchReply(state: GameState, text: string): { flash: string; flag?: FlagMap } | null {
  if (state.door !== 'outcast') return null
  const t = text.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim()
  const mark = (key: string): FlagMap => ({ [key]: true, sandSignAt: state.ticks })
  if (HANDS.test(t)) {
    return state.flags.handsLookSeen ? { flash: HANDS_LOOK_LATER } : { flash: HANDS_LOOK, flag: mark('handsLookSeen') }
  }
  if (SAND.test(t)) {
    return state.flags.sandTouchSeen ? { flash: SAND_TOUCH_LATER } : { flash: SAND_TOUCH, flag: mark('sandTouchSeen') }
  }
  if (AMBER.test(t) && (state.items.glints ?? 0) > 0) {
    return state.flags.amberWarmSeen ? { flash: AMBER_LATER } : { flash: AMBER_WARM, flag: mark('amberWarmSeen') }
  }
  return null
}

import { turfFaction } from './encounter'
import { heatFactions } from './heat'
import type { GameState } from './types'

/**
 * Jodi's Heat: digging, rushing and stalling on danger ground can get you noticed.
 * Scavenging rolls in the engine (same seed every time). Rushing and stalling are timed in the
 * Play screen against visible, online time only, and pass their own roll in.
 * Timing can add at most +1 per scene.
 */

export type NoticeKind = 'scavenge' | 'rush' | 'stall'

export const NOTICE_LINES: Record<NoticeKind, (faction: string) => string> = {
  scavenge: (f) => `You dug in one spot too long. Someone noticed. ${f} Heat +1.`,
  rush: (f) => `You moved fast and loud. Someone noticed. ${f} Heat +1.`,
  stall: (f) => `You stood too long in the open. Someone noticed. ${f} Heat +1.`,
}

/** Scavenge chance per search in the same area: 10% on the first, +10% each repeat, up to 50%. */
export const SCAVENGE_NOTICE_STEP = 10
export const SCAVENGE_NOTICE_MAX = 50
/** Rushing: 3 moves inside this many ms of visible time. */
export const RUSH_WINDOW_MS = 3000
export const RUSH_MOVES = 3
export const RUSH_CHANCE = 0.35
/** Stalling: a per-scene threshold between these (visible seconds), then the chance climbs every tick. */
export const STALL_MIN_S = 25
export const STALL_MAX_S = 45
export const STALL_TICK_S = 5
export const STALL_BASE = 0.15
export const STALL_STEP = 0.1

const SAFE_SCENES = new Set([
  // Rest ground and safe shade.
  'camp:bay', 'camp:lean', 'camp:cages', 'camp:jaxson', 'camp:jaxson-cache', 'camp:jaxson-drop', 'maw:tuner', 'maw:stilt', 'spine:shade', 'thresh:cell', 'thresh:court',
  // Cutscene beats.
  'ch1:storm', 'ch1:end', 'ch1:land', 'thresh:crucible-rig', 'thresh:stairs', 'thresh:crucible-stairs',
])

/** Danger ground only: never trade, Kaelen, rest shade, cutscenes, crises, endings, Down, or a fight or hunt already running. */
export function noticeGround(state: GameState, opts: { vendor: (id: string) => boolean; kind: (id: string) => string | undefined }): boolean {
  const id = state.sceneId
  if (!id || id.startsWith('open:') || id.startsWith('crisis:') || id.startsWith('ch2:') || id.startsWith('roam:')) return false
  if (id.includes('kaelen') || id === 'thresh:sift' || SAFE_SCENES.has(id) || opts.vendor(id)) return false
  const k = opts.kind(id)
  if (k === 'crisis' || k === 'ending') return false
  if (state.flags.encounterHere || state.flags.hunterHere || state.flags.downed || (state.health ?? 1) <= 0) return false
  if (state.flags.shopShelf || state.flags.rumorShelf || state.flags.kaelenIntroNow) return false
  return true
}

export function noticeFaction(state: GameState) {
  return turfFaction(state)
}

export function noticeLine(state: GameState, kind: NoticeKind): string {
  return NOTICE_LINES[kind](heatFactions(state.door)[noticeFaction(state)].name)
}

import type { GameState } from './types'

/** v148: get-ups per attempt. A Down (or a Sap-zero rescue) with none left ends the attempt. */
export const HANDS_MAX = 3

export const HANDS_LEFT_SUB = (n: number) => `Hands left: ${n}`
export const KNOT_FREE_SUB = "Ossa's Knot. No hand spent."
export const RUN_OVER_NOTE = 'You collapse. Too hurt to fight. The ground keeps you. No hand is left to take.'
export const RUN_OVER_SAP_NOTE = 'Sap hits zero like a light going out. The ground keeps you. No hand is left to take.'
export const RUN_OVER_LABEL = 'Start the chapter again'
export const RUN_OVER_SUB = 'Back to where this chapter began. Earlier chapters stay.'
export const RUN_OVER_FLASH = `The chapter starts again. Hands: ${HANDS_MAX}.`

export function handsLeft(state: Pick<GameState, 'hands'>): number {
  const n = state.hands
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(HANDS_MAX, n)) : HANDS_MAX
}

export function handsPips(state: Pick<GameState, 'hands'>): string {
  const n = handsLeft(state)
  return '●'.repeat(n) + '○'.repeat(HANDS_MAX - n)
}

/** A clean copy for the chapter checkpoint: no nested checkpoint, no result line, standing. */
export function snapshot(state: GameState): GameState {
  const { checkpoint: _c, flash: _f, ...rest } = state
  const flags = { ...rest.flags }
  for (const k of ['downed', 'downedNote', 'downedKind', 'downLost', 'runOver']) delete flags[k]
  return { ...rest, flags, hands: HANDS_MAX }
}

/** v149: flags that mark a finished chapter, in order. Add a chapter's flag here and it gets a checkpoint and a refill. */
export const CHAPTER_DONE_FLAGS = ['chapter1Done', 'chapter2Done'] as const

/** 0 = Chapter One, 1 = Chapter Two, ... */
export function chapterIndex(state: Pick<GameState, 'flags'>): number {
  let n = 0
  for (const f of CHAPTER_DONE_FLAGS) if (state.flags[f]) n++
  return n
}

/**
 * Keep the checkpoint current: Chapter One starts at the door's opening; each later chapter starts the first
 * time the chapter before it is done. A new chapter refills the hands (v149). Old saves get one on first write.
 */
export function withCheckpoint(state: GameState, opening: () => GameState): GameState {
  const cp = state.checkpoint
  if (!state.flags.runOver && chapterIndex(state) > 0 && (!cp || chapterIndex(cp) < chapterIndex(state))) {
    return { ...state, hands: HANDS_MAX, checkpoint: snapshot(state) }
  }
  if (!cp) return { ...state, checkpoint: snapshot(opening()) }
  return state
}

/** Run over: back to the checkpoint, hands full. Earlier chapters are in the checkpoint already. */
export function restoreCheckpoint(state: GameState): GameState | null {
  const cp = state.checkpoint
  if (!cp) return null
  return { ...cp, checkpoint: cp, hands: HANDS_MAX, flash: RUN_OVER_FLASH, updatedAt: Date.now() }
}

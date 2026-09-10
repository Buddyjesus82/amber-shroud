const KEY = 'amber-shroud.save.v1'

import type { GameState } from './types'

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (parsed?.version !== 1 || !parsed.door || !parsed.sceneId) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSave(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private mode / quota — game still runs for the session
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  return loadSave() !== null
}

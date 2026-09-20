import type { DoorId } from './types'

/** In-card Resume / Overwrite flow. No window.confirm — that no-ops on some phones. */
export type DoorPhase =
  | { kind: 'idle' }
  | { kind: 'choose'; door: DoorId }
  | { kind: 'overwrite'; door: DoorId }

export type DoorTapResult = {
  phase: DoorPhase
  action?: 'start' | 'resume'
  door?: DoorId
}

export const IDLE_DOOR: DoorPhase = { kind: 'idle' }

export function tapDoor(phase: DoorPhase, saved: readonly DoorId[], id: DoorId): DoorTapResult {
  if (!saved.includes(id)) {
    return { phase: IDLE_DOOR, action: 'start', door: id }
  }
  if (phase.kind === 'choose' && phase.door === id) {
    return { phase: IDLE_DOOR, action: 'resume', door: id }
  }
  return { phase: { kind: 'choose', door: id } }
}

export function tapResume(door: DoorId): DoorTapResult {
  return { phase: IDLE_DOOR, action: 'resume', door }
}

export function tapOverwriteAsk(door: DoorId): DoorTapResult {
  return { phase: { kind: 'overwrite', door } }
}

export function tapOverwriteConfirm(door: DoorId): DoorTapResult {
  return { phase: IDLE_DOOR, action: 'start', door }
}

export function tapOverwriteBack(door: DoorId): DoorTapResult {
  return { phase: { kind: 'choose', door } }
}

export function tapDoorCancel(): DoorTapResult {
  return { phase: IDLE_DOOR }
}

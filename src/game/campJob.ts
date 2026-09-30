import type { Effect, GameState } from './types'

export const TAKE_INSIDE_JOB: Effect = {
  add: { wrench: 1 },
  flag: { jaxsonInside: true, wrenchPath: true, jaxsonFavor: true, cartelNotice: true },
  ticks: 1,
  flash:
    'The oversized wrench is heavier than pride. "West steam-vent. Guard station. Bleed-hour. I hotwire. You can still pay Kaelen for a heading first. Do not mix the jobs."',
}

export function wantsTakeJob(text: string): boolean {
  const hay = text.toLowerCase()
  return (
    /\binside job\b/.test(hay) ||
    /\binside man\b/.test(hay) ||
    /\b(take|accept|do) the (inside )?job\b/.test(hay) ||
    /\btake (oil-?tooth'?s? )?(the )?(inside )?job\b/.test(hay) ||
    /\btake the wrench\b/.test(hay)
  )
}

export function wantsDoSabotage(text: string): boolean {
  const hay = text.toLowerCase()
  return (
    /\bsabotage\b/.test(hay) ||
    /\bvent pipes?\b/.test(hay) ||
    (/\bpipes?\b/.test(hay) && /\b(vent|guard|station|west)\b/.test(hay)) ||
    /\bsteam[- ]vent\b/.test(hay) ||
    /\bwest (steam|vent|bolt|pipe)/.test(hay) ||
    /\bwest steam-vent\b/.test(hay) ||
    /\bguard station\b/.test(hay) ||
    /\bwest bolt\b/.test(hay)
  )
}

export function wantsCampSabotage(text: string): boolean {
  return wantsTakeJob(text) || wantsDoSabotage(text)
}

export function campJobOpen(state: GameState): boolean {
  return state.hubId === 'camp04' && !state.chapterId && !state.flags.guardDown
}

export function atKaelenInvoice(state: GameState): boolean {
  return state.sceneId.startsWith('camp:kaelen') || state.sceneId === 'camp:wire'
}

export function atGuardStation(state: GameState): boolean {
  return state.sceneId === 'camp:guard' || state.sceneId === 'camp:sabotage'
}

/** Accepted the inside job, station is down, Strider not hot yet. Skiff Bay is the lookout. */
export function bayLookout(state: GameState): boolean {
  return !!(state.flags.jaxsonInside && state.flags.guardDown && !state.flags.striderHot)
}

/** Cartel has a reason to look. Roam pressure alone is not one. */
export function campHeard(state: Pick<GameState, 'flags'>): boolean {
  return !!(state.flags.cartelNotice || state.flags.jaxsonInside)
}

/** West steam-vent: patrol is on the bolt, not out on the wire. Stable for this arrival. */
export function ventPatrolInPlace(state: Pick<GameState, 'ticks' | 'pressure' | 'sap'>): boolean {
  return Math.abs(state.ticks * 17 + state.pressure * 3 + state.sap * 5) % 2 === 1
}

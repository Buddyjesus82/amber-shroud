import type { Effect, GameState } from './types'

export const TAKE_INSIDE_JOB: Effect = {
  add: { wrench: 1 },
  flag: { jaxsonInside: true, wrenchPath: true, jaxsonFavor: true },
  ticks: 1,
  flash:
    'The oversized wrench is heavier than pride. "West steam-vent. Guard station. Bleed-hour. I hotwire. You can still pay Kaelen for a heading first. Do not mix the invoices."',
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

import type { Choice, Cond, Effect, GameState } from './types'

export const TAKE_INSIDE_JOB: Effect = {
  add: { wrench: 1 },
  flag: { jaxsonInside: true, jaxsonPlan: true, kaelenKnown: true, wrenchPath: true, jaxsonFavor: true, cartelNotice: true },
  ticks: 1,
  flash:
    'The oversized wrench is heavier than pride. "West steam-vent. Guard station. Bleed-hour. I hotwire. You can still pay Kaelen for a heading first. Do not mix the jobs."',
}

/** Jaxson has explained his escape plan (or you already took the job, from an older save). */
export const PLAN_HEARD: Cond = { any: [{ flag: 'jaxsonPlan' }, { flag: 'jaxsonInside' }] }
export const PLAN_UNHEARD: Cond = { all: [{ flagUnset: 'jaxsonPlan' }, { flagUnset: 'jaxsonInside' }] }

/** "Ask about his plan": beat 2 of Jaxson's first talk. Kaelen's name is earned here. */
export const HEAR_PLAN: Effect = {
  flag: { jaxsonPlan: true, kaelenKnown: true },
  goto: 'camp:jaxson',
  ticks: 1,
}

export function planHeard(state: GameState): boolean {
  return !!(state.flags.jaxsonPlan || state.flags.jaxsonInside)
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

/** Paid Kaelen for the side trouble (the relic lead) or for the hole itself. Either one opens the crawl. */
export const FENCE_HOLE_PAID: Cond = { any: [{ flag: 'relicRumor' }, { flag: 'wireCut' }] }

/** The Wire back to the Pens through the fence-hole. Same row on the Wire and on Kaelen's rumor counter. */
export const FENCE_HOLE_BACK: Choice = {
  id: 'pens',
  label: 'Walk the Yard — back to the Pens through the fence-hole',
  sub: 'Crawl the hole Kaelen priced. No Sap. The Pens, then the Yard is one road on.',
  enable: FENCE_HOLE_PAID,
  locked: 'Pay Kaelen first: a side-trouble lead (1 scrap) or the hole in the wire (2 scrap or 1 Glint)',
  effects: {
    goto: 'camp:cages',
    ticks: 1,
    flash:
      'You crawl the hole Kaelen sold you. Razor-wire takes a thread of sleeve. The Pens again. The Yard is one road on.',
  },
}

export function atTheWire(state: GameState): boolean {
  return state.sceneId === 'camp:wire' || state.sceneId.startsWith('camp:kaelen')
}

/** Typed "walk the yard", "back to the pens", "crawl through the fence-hole" at the Wire. */
export function wantsFenceHoleBack(text: string): boolean {
  const hay = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/\b(walk|go|head|back|return)( back)?( to)? (the )?(bleed )?yard\b/.test(hay)) return true
  if (/\b(walk|go|head|back|return|crawl|sneak)\b.*\b(pens?|cages?|holding pens)\b/.test(hay)) return true
  return /\b(crawl|through|back)\b.*\b(fence-?hole|hole|fence)\b/.test(hay)
}

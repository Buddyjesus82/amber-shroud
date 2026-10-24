import type { Choice, GameState } from './types'
import { getScene } from './content'
import { firstDropPending } from './firstDrop'
import { personAtScene } from './people'
import { isRumorCounter } from './rumors'
import { vendorFor } from './trade'
import { closingNow } from './closing'

/**
 * The masked figure: unnamed, no lore, recurring. He only walks the later maps (after Chapter One).
 * REVEAL HOOK (not built): `flags.maskedSeen` counts every sighting. The Spire ending can read it; nothing does yet.
 */
export * from './maskedLines'
import {
  MASKED_BLOCK_LINE, MASKED_BOOTS_LINE, MASKED_CHASE_LINE, MASKED_DROP_LINE, MASKED_FLAKE_LINE, MASKED_GAP, MASKED_GLIMPSE_LINE, MASKED_GLIMPSE_LINES_EXTRA,
  MASKED_INTERRUPT_LINE, MASKED_INTERRUPT_ODDS, MASKED_ODDS, MASKED_STRIKE_LINE, MASKED_WALKS, MASKED_TAKE_DROP_LINE, MASKED_TOLL_LINE, MASKED_WAIT_LINE, MASKED_WALKS_OFF_LINE,
} from './maskedLines'

const ALL_LINES = [
  MASKED_GLIMPSE_LINE,
  ...MASKED_GLIMPSE_LINES_EXTRA,
  MASKED_BOOTS_LINE,
  MASKED_FLAKE_LINE,
  MASKED_DROP_LINE,
  MASKED_BLOCK_LINE,
  MASKED_INTERRUPT_LINE,
  MASKED_TOLL_LINE,
  MASKED_STRIKE_LINE,
  MASKED_WALKS_OFF_LINE,
  MASKED_CHASE_LINE,
  MASKED_WAIT_LINE,
]

/** Is this result line his? The cover follows it. */
export function isMaskedFlash(flash: string | undefined | null): boolean {
  return !!flash && ALL_LINES.some((l) => flash.includes(l))
}

/**
 * Scenes he never touches, arriving or leaving: anyone speaking (a talk scene, a speaker, a person's scene), any shop or rumor
 * counter, any trader or Kaelen stop, and the job and offer screens that live in those scenes. The result of an action taken in one
 * of them (a held result on the scene you just left) counts too, so his art never swaps over a speaker card.
 */
const OFFER_IDS = new Set(['job', 'inside', 'station', 'sabotage', 'accept'])
/** Talk-like scenes that are not marked as talk in the data: the skiff bay's three crews and the two guard stops. */
const MASKED_QUIET_EXTRA = new Set(['camp:bay', 'thresh:guard', 'thresh:court-guard', 'camp:forced', 'spine:hunter', 'thresh:hunter'])

/** A choice that only walks you to another scene (it may spend a tick). Not an offer on this scene. */
function isHintButton(c: Choice): boolean {
  const fx = c.effects
  return !!fx.goto && Object.keys(fx).every((k) => k === 'goto' || k === 'ticks')
}

export function maskedQuietScene(id: string): boolean {
  if (id.includes('kaelen')) return true
  const sc = getScene(id)
  if (sc.kind === 'talk' || sc.speaker) return true
  if (MASKED_QUIET_EXTRA.has(id)) return true
  // v159: a goto-only button ("go back to Jaxson") is a hint, not an offer. Only a real offer silences him.
  if (sc.choices?.some((c) => OFFER_IDS.has(c.id) && !isHintButton(c))) return true
  return !!personAtScene(id) || !!vendorFor(id) || isRumorCounter(id)
}

/** He walks the later maps: Chapter One finished, or the Maw. Never the road, never a chapter-end screen. */
export function maskedActive(state: GameState): boolean {
  // Test hook: older walkthroughs predate him.
  if (state.flags.noMasked) return false
  if (maskedQuietScene(state.sceneId)) return false
  const later = !!(state.flags.chapter1Done || state.hubId === 'redmaw')
  if (MASKED_WALKS === 'later-maps' && !later) return false
  const id = state.sceneId
  if (id.startsWith('open:') || id.startsWith('crisis:')) return false
  if (MASKED_WALKS === 'later-maps' ? id.startsWith('ch1:') : id === 'ch1:end') return false
  const kind = getScene(id).kind
  return kind !== 'crisis' && kind !== 'ending'
}

/** Seeded 0..n-1 for this arrival, the same pattern as the other rolls: ticks, scene, steps. */
function roll(state: GameState, salt: string, n: number): number {
  let h = (state.ticks * 2654435761 + Number(state.flags.sceneSteps ?? 0) * 40503 + state.pressure * 5 + 17) >>> 0
  for (const ch of `${salt}:${state.sceneId}`) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) % n
}

const ENCOUNTER_KEYS = [
  'encounterHere',
  'encounterNoSkip',
  'encounterKind',
  'encounterHp',
  'encounterClash',
  'encounterDone',
  'encounterFlash',
  'encounterRound',
  'encounterStall',
  'encounterTerrain',
  'encounterOpen',
  'encounterPair',
  'encounterController',
]

function appendFlash(next: GameState, line: string): string {
  return next.flash ? `${next.flash}\n\n${line}` : line
}

/** His block screen (a threat on arrival). */
export function isMaskedBlock(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.maskedHere && !state.flags.encounterHere && !state.flags.downed
}

export function maskedBody(): string {
  return MASKED_BLOCK_LINE
}

export function maskedChoices(fightFx: Choice['effects']): Choice[] {
  return [
    {
      id: 'masked-strike',
      label: 'Strike the masked figure',
      sub: 'Swing at him. Health takes the hits.',
      tone: 'danger',
      effects: { ...fightFx, unsetFlag: [...(fightFx.unsetFlag ?? []), 'maskedHere'] },
    },
    {
      id: 'masked-chase',
      label: 'Chase him',
      sub: 'Costs 1 Health.',
      enable: { healthMin: 2 },
      locked: 'Needs: 2 Health',
      effects: { health: -1, still: true, unsetFlag: ['maskedHere'], flash: MASKED_CHASE_LINE },
    },
    {
      id: 'masked-wait',
      label: 'Wait for him to move',
      sub: 'Costs nothing.',
      tone: 'quiet',
      effects: { still: true, unsetFlag: ['maskedHere'], flash: MASKED_WAIT_LINE },
    },
  ]
}

/** The Drop he leaves: a pick-up while you stand on that ground. */
export function maskedPickup(state: GameState): Choice[] {
  if (state.flags.maskedDrop !== state.sceneId || state.flags.encounterHere) return []
  return [
    {
      id: 'masked-drop',
      label: 'Take the Drop',
      effects: { add: { vial_drop: 1 }, still: true, unsetFlag: ['maskedDrop'], flash: MASKED_TAKE_DROP_LINE },
    },
  ]
}

export type MaskedSighting = 'glimpse' | 'sign' | 'drop' | 'threat' | 'toll' | 'interrupt'

function stamp(next: GameState, how: MaskedSighting): GameState {
  const steps = Number(next.flags.sceneSteps ?? 0)
  const log = typeof next.flags.maskedLog === 'string' ? next.flags.maskedLog : ''
  next.flags = {
    ...next.flags,
    maskedStep: steps,
    maskedSeen: Number(next.flags.maskedSeen ?? 0) + 1,
    maskedLog: `${log}${how[0]}`.slice(-40),
  }
  return next
}

const GLIMPSES = [MASKED_GLIMPSE_LINE, ...MASKED_GLIMPSE_LINES_EXTRA]
/** Where the Prisoner's guaranteed first glimpse can land: the three camp scenes the job walks through. */
export const FORCED_GLIMPSE_SCENES: readonly string[] = ['camp:vents', 'camp:yard', 'camp:guard']

function forcedCampGlimpse(state: GameState, next: GameState, fx: { homeRoad?: unknown }): boolean {
  const f = next.flags
  if (state.door !== 'prisoner' || f.noMasked || fx.homeRoad) return false
  if (!f.jaxsonInside || Number(f.maskedSeen ?? 0) > 0) return false
  if (!FORCED_GLIMPSE_SCENES.includes(next.sceneId)) return false
  return !f.encounterHere && !f.hunterHere && !f.strayHunterHere && !f.maskedHere && !f.downed
}

/**
 * Called once at the end of every effect. A new scene may carry a sighting; a hunt or ambush that just
 * fired may be stopped by him. Never on a fight, a hunt, a Down, or a crisis; never two scenes in a row.
 */
export function maskedPass(state: GameState, next: GameState, fx: { ambush?: unknown; sneak?: unknown; ruse?: unknown; resolveEncounter?: unknown; homeRoad?: unknown; mapWalk?: unknown; flag?: Record<string, unknown> }): GameState {
  // A block never follows you to the next scene.
  if (state.flags.maskedHere && next.sceneId !== state.sceneId && next.flags.maskedHere) {
    const flags = { ...next.flags }
    delete flags.maskedHere
    next.flags = flags
  }
  const arrived = next.sceneId !== state.sceneId
  if (next.flags.downed || (next.health ?? 1) <= 0) return next
  // v159: the Prisoner's first sighting is guaranteed in the home camp, once Jaxson's job is taken.
  if (arrived && forcedCampGlimpse(state, next, fx)) {
    next.flash = appendFlash(next, GLIMPSES[roll(next, 'line', GLIMPSES.length)])
    return stamp(next, 'glimpse')
  }
  if (!maskedActive(next) || maskedQuietScene(state.sceneId)) return next
  // The road between a home camp and the Maw is a transition: he stays out of it.
  if (fx.homeRoad) return next
  const steps = Number(next.flags.sceneSteps ?? 0)
  if (steps - Number(next.flags.maskedStep ?? -99) < MASKED_GAP) return next

  // A hunt or ambush just fired on this arrival: one in four, he steps in and it ends.
  const hunted =
    (!state.flags.hunterHere && !!next.flags.hunterHere) ||
    (!state.flags.strayHunterHere && !!next.flags.strayHunterHere) ||
    (!state.flags.encounterHere &&
      !!next.flags.encounterHere &&
      !!next.flags.encounterNoSkip &&
      next.flags.encounterKind !== 'masked' &&
      !fx.ambush &&
      !fx.flag?.strayCut &&
      !fx.sneak &&
      !fx.ruse &&
      !fx.resolveEncounter)
  if (hunted) {
    // The home camp closing in (pressure 10+): nobody steps in to save you from that hunt.
    if (closingNow(next)) return next
    if (roll(next, 'interrupt', MASKED_INTERRUPT_ODDS) !== 0) return next
    const flags = { ...next.flags }
    for (const k of ['hunterHere', 'hunterFrom', 'strayHunterHere', 'strayHunterHound', ...ENCOUNTER_KEYS]) delete flags[k]
    flags.fightQuiet = 0
    flags.huntQuiet = 0
    flags.encounterAt = next.ticks
    next.flags = flags
    next.flash = MASKED_INTERRUPT_LINE
    return stamp(next, 'interrupt')
  }
  if (!arrived || next.flags.encounterHere || next.flags.hunterHere || next.flags.strayHunterHere) return next

  if (roll(next, 'sight', MASKED_ODDS) !== 0) return next
  // v159: the first sighting after the opening is always a glimpse (it used to be a fixed block for the Outcast). The block stays a normal roll later.
  const r = state.sceneId.startsWith('open:') ? 0 : roll(next, 'kind', 20)
  // 0-8 glimpse, 9-14 sign, 15-19 threat.
  if (r < 9) {
    const lines = [MASKED_GLIMPSE_LINE, ...MASKED_GLIMPSE_LINES_EXTRA]
    next.flash = appendFlash(next, lines[roll(next, 'line', lines.length)])
    return stamp(next, 'glimpse')
  }
  if (r < 15) {
    const v = roll(next, 'sign', 3)
    // The Outcast's first Drop is his own first goal: nothing the masked figure leaves may hand it over.
    if (v === 2 && !firstDropPending(next)) {
      next.flags = { ...next.flags, maskedDrop: next.sceneId }
      next.flash = appendFlash(next, MASKED_DROP_LINE)
      return stamp(next, 'drop')
    }
    next.flash = appendFlash(next, v === 1 ? MASKED_FLAKE_LINE : MASKED_BOOTS_LINE)
    return stamp(next, 'sign')
  }
  // A walk on the map never lands the Strike / Chase / Wait block: a threat roll on foot is only a glimpse.
  if (fx.mapWalk) {
    const lines = [MASKED_GLIMPSE_LINE, ...MASKED_GLIMPSE_LINES_EXTRA]
    next.flash = appendFlash(next, lines[roll(next, 'line', lines.length)])
    return stamp(next, 'glimpse')
  }
  // Threat: he takes a scrap and leaves a Drop, or he blocks the way for one scene.
  const scrap = next.items.scrap ?? 0
  if (scrap > 0 && roll(next, 'threat', 2) === 0 && !firstDropPending(next)) {
    next.items = { ...next.items, scrap: scrap - 1, vial_drop: (next.items.vial_drop ?? 0) + 1 }
    next.flash = appendFlash(next, MASKED_TOLL_LINE)
    return stamp(next, 'toll')
  }
  next.flags = { ...next.flags, maskedHere: true }
  return stamp(next, 'threat')
}

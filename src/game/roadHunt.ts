import { turfFaction } from './encounter'
import { getScene } from './content'
import type { EncounterKind } from './encounter'
import type { GameState } from './types'

/** Heat at which the ground's faction sends a hunter down the road, and the higher bar for a talk beat. */
export const ROAD_HUNT_HEAT = 4
export const ROAD_HUNT_TALK_HEAT = 6
/** Seekers send a husk instead of a runner only at this Heat. */
export const ROAD_HUSK_HEAT = 8

export const ROAD_HUNT_LINES = {
  cartel: 'Cartel Heat caught up on the road. Someone was paid to wait here. No way around.',
  strays: 'Stray Heat caught up on the road. A Stray collector steps out of the sand. No way around.',
  seekers: 'Seeker Heat caught up on the road. They sent someone ahead of you. No way around.',
} as const
/** Outcast floor: the road out is never empty. */
export const ROAD_FLOOR_LINE = 'Someone was waiting where the road starts. No way around.'

const DOOR_FACTION = { prisoner: 'cartel', outcast: 'strays', vessel: 'seekers' } as const
const ROAD = /^ch1:[pov]-/
const SKIP = new Set(['ch1:v-zafir'])

/** A road hunter or the Outcast floor fight for this arrival, or null. At most one per run. */
export function roadHunterKind(before: GameState, next: GameState): { kind: EncounterKind; line: string } | null {
  if (next.chapterId !== 'cache-run' || next.flags.roadHuntDone) return null
  if (next.sceneId === before.sceneId) return null
  if (next.flags.encounterHere || next.flags.hunterHere || next.flags.downed) return null
  const kind = getScene(next.sceneId).kind
  if (kind === 'crisis' || kind === 'ending') return null
  // Outcast floor: leaving with no road fight yet, the road starts with one.
  if (next.door === 'outcast' && next.sceneId === 'ch1:leave') {
    return next.heat.strays >= ROAD_HUNT_HEAT ? { kind: 'collector', line: ROAD_HUNT_LINES.strays } : { kind: 'scavenger', line: ROAD_FLOOR_LINE }
  }
  if (next.sceneId !== 'ch1:leave' && (!ROAD.test(next.sceneId) || SKIP.has(next.sceneId))) return null
  const f = next.sceneId === 'ch1:leave' ? DOOR_FACTION[next.door] : turfFaction(next)
  const heat = next.heat[f]
  if (heat < (kind === 'talk' ? ROAD_HUNT_TALK_HEAT : ROAD_HUNT_HEAT)) return null
  const k: EncounterKind = f === 'cartel' ? 'scavenger' : f === 'strays' ? 'collector' : heat >= ROAD_HUSK_HEAT ? 'husk' : 'runner'
  return { kind: k, line: ROAD_HUNT_LINES[f] }
}

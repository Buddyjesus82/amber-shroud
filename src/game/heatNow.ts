import { campHuntIsValerius } from './valeriusRest'
import { spineHunterFor } from './content/spineHunter'
import { ROAD_HUNT_HEAT, ROAD_HUSK_HEAT } from './roadHunt'
import { STRAY_HOUND_HEAT, STRAY_HUNT_HEAT } from './strayHunter'
import type { Faction, GameState } from './types'

/** Seeker Heat at which Valerius waits at Seeker Command (content/newPlaces.ts command-hot). */
export const COMMAND_VALERIUS_HEAT = 6

type Where = Pick<GameState, 'hubId' | 'sceneId'>
const onCamp = (s: Where) => s.hubId === 'camp04' || s.sceneId.startsWith('camp:')
const onSpine = (s: Where) => s.hubId === 'spine' || s.sceneId.startsWith('spine:') || s.sceneId.startsWith('ch1:o-')
const onMaw = (s: Where) => s.hubId === 'redmaw' || s.sceneId.startsWith('maw:') || s.sceneId === 'ch2:stub'
const onThresh = (s: Where) => s.hubId === 'threshold' || s.sceneId.startsWith('thresh:')

/**
 * v202: who is after you right now for this faction, on the ground you stand on. Built only from what the
 * hunt code does. Road hunters stay unnamed. Heat 0: no one.
 */
export function heatNow(state: Pick<GameState, 'heat' | 'flags' | 'hubId' | 'sceneId'>, f: Faction): string[] {
  const h = state.heat[f] ?? 0
  // v202: Red Maw and the Threshold hunt on effective Seeker Heat (engine.ts huntHeat: Thalia's favor adds 2).
  const favorGround = f === 'seekers' && (onMaw(state) || onThresh(state))
  const eff = favorGround && state.flags.thaliaFavor ? h + 2 : h
  if (eff <= 0) return ['No one is after you.']
  const out: string[] = []
  if (f === 'cartel') {
    if (onCamp(state)) out.push(campHuntIsValerius(state) ? 'At Camp-04: Valerius himself.' : 'At Camp-04: the Hound-handler.')
    if (h >= ROAD_HUNT_HEAT) out.push('On the roads: a paid ambusher.')
  } else if (f === 'seekers') {
    if (onMaw(state) && eff >= 1) out.push('At Red Maw: Sybella.')
    if (onThresh(state) && eff >= 1) out.push('At the Threshold: a Court Guard.')
    if (onThresh(state) && h >= COMMAND_VALERIUS_HEAT) out.push('At Seeker Command: Valerius.')
    if (h >= ROAD_HUSK_HEAT) out.push('On the roads: a husk.')
    else if (h >= ROAD_HUNT_HEAT) out.push('On the roads: Seeker runners.')
  } else {
    if (onSpine(state)) out.push(spineHunterFor(state).kind === 'carapace' ? 'On the Spine: Nim.' : 'On the Spine: a Stray collector.')
    if (h >= STRAY_HOUND_HEAT) out.push('On the roads: the Stray Hunter, with a shard-hound.')
    else if (h >= STRAY_HUNT_HEAT) out.push('On the roads: the Stray Hunter.')
    if (h >= ROAD_HUNT_HEAT) out.push('On the roads: a Stray collector.')
  }
  return out.length ? out : ['No one on this ground yet.']
}

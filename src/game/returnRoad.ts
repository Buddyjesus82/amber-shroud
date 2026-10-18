import { isPressureOverlay } from './hunter'
import { currentNode, hubMapOf } from './map'
import type { Choice, DoorId, Effect, GameState } from './types'

/**
 * v138: the road back and forth between a door's home ground and the Red Maw, once Chapter One is done.
 * Cost: 2 Sap each way (the same as a "long way round" walk on a map), and the arrival rolls the normal road
 * fight and hunt for that ground. Nothing here replays a story beat: the Cache Run stays shut after Chapter One.
 */
export const ROAD_SAP = 2
export const ROAD_NEED_LOCK = `Needs: ${ROAD_SAP + 1} Sap`

type Home = { hubId: string; sceneId: string; label: string }

/** The home camp, and the edge scene you walk in on (the same node the map marks as the road to the Maw). */
const HOME: Record<DoorId, Home> = {
  prisoner: { hubId: 'camp04', sceneId: 'camp:wire', label: 'Walk back to Camp-04' },
  outcast: { hubId: 'spine', sceneId: 'spine:hound', label: 'Walk back to the Bleached Spine' },
  vessel: { hubId: 'threshold', sceneId: 'thresh:paddock', label: 'Walk back to the Threshold' },
}

const HOME_HUBS = new Set(['camp04', 'spine', 'threshold'])

export function homeOf(door: DoorId): Home {
  return HOME[door]
}

/** Not mid-fight, mid-hunt, down, or on a crisis card. */
function onFoot(state: GameState): boolean {
  const f = state.flags
  if (f.encounterHere || f.strayHunterHere || f.maskedHere || f.downed || f.hunterHere) return false
  if (state.health <= 0 || isPressureOverlay(state)) return false
  return true
}

/** Chapter One is over and you are on a hub, not on the Cache Run. */
export function roadsOpen(state: GameState): boolean {
  return !!state.flags.chapter1Done && state.chapterId !== 'cache-run' && !!state.hubId && onFoot(state)
}

function fx(home: Home | null, state: GameState): Effect {
  const toMaw = !home
  return {
    goto: toMaw ? 'maw:rim' : home.sceneId,
    enterHub: toMaw ? 'redmaw' : home.hubId,
    sap: -ROAD_SAP,
    ticks: 1,
    pressure: 1,
    homeRoad: true,
    // The hunt count starts fresh on the new ground, so a hunter never lands the moment you arrive.
    flag: { huntQuiet: 0 },
    unsetFlag: state.flags.kaelenPassing ? ['kaelenPassing'] : undefined,
  }
}

/** At the road out of a home camp (the map's Maw-exit node): the way to the Maw. */
export function roadToMaw(state: GameState): Choice | null {
  if (!roadsOpen(state) || !state.hubId || !HOME_HUBS.has(state.hubId)) return null
  const map = hubMapOf(state)
  // Kaelen passing through the Hound Sign (or the gate, or the Paddock): the road is still the road you stand on.
  const from = state.sceneId === 'roam:kaelen' ? state.flags.kaelenFrom : null
  const here = typeof from === 'string' && from ? { ...state, sceneId: from } : state
  if (!map?.ready || !currentNode(here)?.mawExit) return null
  return {
    id: 'road-maw',
    label: 'Walk back to Red Maw',
    sub: `Costs ${ROAD_SAP} Sap. The road can find you.`,
    tone: 'quiet',
    enable: { sapMin: ROAD_SAP + 1 },
    locked: ROAD_NEED_LOCK,
    effects: fx(null, state),
  }
}

/** At the Maw Rim: the way home. */
export function roadHome(state: GameState): Choice | null {
  if (!roadsOpen(state) || state.hubId !== 'redmaw' || state.sceneId !== 'maw:rim') return null
  const home = HOME[state.door]
  return {
    id: 'road-home',
    label: home.label,
    sub: `Costs ${ROAD_SAP} Sap. The road can find you.`,
    tone: 'quiet',
    enable: { sapMin: ROAD_SAP + 1 },
    locked: ROAD_NEED_LOCK,
    effects: fx(home, state),
  }
}

export function roadChoice(state: GameState): Choice | null {
  return roadToMaw(state) ?? roadHome(state)
}

function norm(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "'").replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

const GO = '(?:go|walk|head|travel|return|run|ride)'
const BACK = '(?:back )?(?:to |toward |towards )?(?:the )?'
const TO_MAW = new RegExp(`^${GO} ${BACK}(?:red )?maw$|^${GO} ${BACK}(?:red )?maw (?:rim|approach)$`)
const HOME_WORDS: Record<DoorId, string> = {
  prisoner: '(?:camp|camp 04|ironwood|ironwood camp 04|the wire|home)',
  outcast: '(?:spine|bleached spine|silas|home|hound sign)',
  vessel: '(?:threshold|outer threshold|court|home)',
}

export type RoadPhrase = 'maw' | 'home'

export const ROAD_NOT_NOW = 'Not now.'

/**
 * A typed travel phrase, whether or not the road is open right now. After Chapter One only:
 * "walk back to red maw" from a home camp, "go home" / "return to camp" / "head to the spine" from the Maw.
 * Read before any skip/run/ride guess so a travel line is never a fight verb.
 */
export function roadPhrase(state: GameState, text: string): RoadPhrase | null {
  if (!state.flags.chapter1Done || !state.hubId) return null
  const hay = norm(text)
  if (!hay) return null
  if (state.hubId !== 'redmaw') return TO_MAW.test(hay) ? 'maw' : null
  const words = HOME_WORDS[state.door]
  if (new RegExp(`^${GO} ${BACK}${words}$`).test(hay) || /^(?:go|head|walk|return|travel) home$/.test(hay)) return 'home'
  return null
}

/** The road button a typed travel phrase means, when it is open. */
export function roadFromText(state: GameState, text: string): Choice | null {
  const phrase = roadPhrase(state, text)
  if (phrase === 'maw') return roadToMaw(state)
  if (phrase === 'home') return roadHome(state)
  return null
}

/** Any typed walk-home or walk-to-the-Maw line, after Chapter One, wherever you stand. Used only to answer "Not now." while locked. */
export function isTravelText(state: GameState, text: string): boolean {
  if (!state.flags.chapter1Done) return false
  const hay = norm(text)
  if (!hay) return false
  if (TO_MAW.test(hay) || /^(?:go|head|walk|return|travel) (?:back )?home$/.test(hay)) return true
  return Object.values(HOME_WORDS).some((w) => new RegExp(`^${GO} ${BACK}${w}$`).test(hay))
}

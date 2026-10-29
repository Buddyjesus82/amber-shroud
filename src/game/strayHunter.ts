import type { Choice, GameState } from './types'
import { getScene } from './content'

/** Stray Hunters: unnamed, killable, and there are always more. A road ambush on any door. */
export const STRAY_HUNT_HEAT = 3
/** From this Stray Heat the hunter brings a shard-hound (a tougher fight). */
export const STRAY_HOUND_HEAT = 5
/** Scenes walked between Stray Hunters. */
export const STRAY_HUNT_GAP = 3
/** Odds in 10 that cutting your trail loses them. */
export const STRAY_CUT_ODDS = 6

export * from './strayLines'
import { STRAY_ARRIVAL_LINE, STRAY_CUT_SUB, STRAY_FEED_LINE, STRAY_FEED_SUB, STRAY_FIGHT_SUB, STRAY_HOUND_LINE, STRAY_OUTCAST_LINE } from './strayLines'

/** Cover slot for the Stray Hunter: the v168 stake-line art. */
export const STRAY_HUNTER_COVER: string | null = 'ch2_o_stakes'

const ROAD = /^ch1:[pov]-|^ch1:leave$/
const CH2_OUTCAST = /^ch2:o-/

export function isStrayHunt(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.strayHunterHere && !state.flags.encounterHere
}

/** Does a Stray Hunter wait on this arrival? Road scenes only, any door, Stray Heat 3+, once every STRAY_HUNT_GAP scenes. */
export function strayHunterArrives(before: GameState, next: GameState): boolean {
  if (next.sceneId === before.sceneId) return false
  const road = next.chapterId === 'cache-run' && ROAD.test(next.sceneId) && next.sceneId !== 'ch1:v-zafir'
  // v168: the Outcast's Chapter Two route is Stray Hunter country too (the stake line has its own fixed arrival).
  const ch2 = next.chapterId === 'into-the-maw' && CH2_OUTCAST.test(next.sceneId) && next.sceneId !== 'ch2:o-stakes'
  if (!road && !ch2) return false
  if (next.flags.encounterHere || next.flags.hunterHere || next.flags.strayHunterHere || next.flags.downed) return false
  const sc = getScene(next.sceneId)
  const kind = sc.kind
  // Not on a beat that already has someone in it (Nim, Ossa, the trader): the open road only.
  if (kind === 'crisis' || kind === 'ending' || kind === 'talk' || sc.speaker) return false
  if ((next.heat.strays ?? 0) < STRAY_HUNT_HEAT) return false
  const steps = Number(next.flags.sceneSteps ?? 0)
  return steps - Number(next.flags.strayHuntStep ?? -99) >= STRAY_HUNT_GAP
}

export function strayHuntBody(state: GameState): string {
  const parts = [STRAY_ARRIVAL_LINE]
  if (state.flags.strayHunterHound) parts.push(STRAY_HOUND_LINE)
  if (state.door === 'outcast') parts.push(STRAY_OUTCAST_LINE)
  return parts.join('\n\n')
}

const CLEAR = ['strayHunterHere', 'strayHunterHound']

export function strayHuntChoices(state: GameState, fightFx: Choice['effects']): Choice[] {
  const hound = !!state.flags.strayHunterHound
  const rows: Choice[] = [
    {
      id: 'stray-cut',
      label: 'Cut your trail',
      sub: STRAY_CUT_SUB,
      enable: { sapMin: 1 },
      locked: 'Needs: 1 Sap',
      effects: { sap: -1, ticks: 1, still: true, unsetFlag: CLEAR, flag: { strayCut: true } },
    },
  ]
  if (hound) {
    rows.push({
      id: 'stray-feed',
      label: 'Feed the hound a Drop',
      sub: STRAY_FEED_SUB,
      enable: { item: 'vial_drop' },
      locked: 'Needs: a Drop',
      effects: { remove: { vial_drop: 1 }, ticks: 1, still: true, unsetFlag: CLEAR, flash: STRAY_FEED_LINE },
    })
  }
  rows.push({
    id: 'stray-fight',
    label: 'Fight the Stray Hunter',
    sub: STRAY_FIGHT_SUB,
    tone: 'danger',
    effects: { ...fightFx, unsetFlag: [...(fightFx.unsetFlag ?? []), ...CLEAR], flag: { ...(fightFx.flag ?? {}), strayHuntFight: true } },
  })
  return rows
}

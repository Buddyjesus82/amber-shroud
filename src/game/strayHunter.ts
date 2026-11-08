import { HESTER_HUNT_BONUS } from './companions'
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
import { BONE_FEED_LABEL, BONE_HIDE_LINE, BONE_HIDE_SUB, BONE_PAY_LINE, BONE_PAY_SUB, BONE_SIGN_LINE, BONE_SIGN_SUB, BONE_SLIP_LINE, BONE_SLIP_SUB, BONE_WASH_HOT, BONE_WASH_TRADE, STRAY_ARRIVAL_LINE, STRAY_CUT_SUB, STRAY_FEED_LINE, STRAY_FEED_SUB, STRAY_FIGHT_SUB, STRAY_HOUND_LINE, STRAY_OUTCAST_LINE } from './strayLines'

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
  // v211: on the Chapter Two Outcast route, a beaten Hunter stays down (no respawn on Back).
  if (ch2 && next.flags.strayHunterBeaten) return false
  if (next.flags.encounterHere || next.flags.hunterHere || next.flags.strayHunterHere || next.flags.downed) return false
  const sc = getScene(next.sceneId)
  const kind = sc.kind
  // Not on a beat that already has someone in it (Nim, Ossa, the trader): the open road only.
  if (kind === 'crisis' || kind === 'ending' || kind === 'talk' || sc.speaker) return false
  // v205: riding with Hester Ellery, the Stray Hunters need 1 more Stray Heat to come. They still come.
  if ((next.heat.strays ?? 0) < STRAY_HUNT_HEAT + (next.flags.companion === 'hester' ? HESTER_HUNT_BONUS : 0)) return false
  const steps = Number(next.flags.sceneSteps ?? 0)
  return steps - Number(next.flags.strayHuntStep ?? -99) >= STRAY_HUNT_GAP
}

/** Bone Wash only. The type stays unnamed. Heat under 3 with a hide or a pearl is the trade posture. */
export function boneWashHunter(state: Pick<GameState, 'door' | 'sceneId'>): boolean {
  return state.door === 'outcast' && state.sceneId === 'ch1:leave'
}

export function boneWashTrade(before: GameState, next: GameState): boolean {
  if (next.sceneId === before.sceneId || next.sceneId !== 'ch1:leave' || next.door !== 'outcast') return false
  if (next.flags.strayWashTradeSeen || next.flags.encounterHere || next.flags.downed || next.flags.strayHunterHere) return false
  if ((next.heat.strays ?? 0) >= STRAY_HUNT_HEAT) return false
  return (next.items.hide_wrap ?? 0) > 0 || (next.items.deep_memory_pearl ?? 0) > 0
}

export function strayHuntBody(state: GameState): string {
  if (boneWashHunter(state)) return (state.heat.strays ?? 0) < STRAY_HUNT_HEAT ? BONE_WASH_TRADE : BONE_WASH_HOT
  const parts = [STRAY_ARRIVAL_LINE]
  if (state.flags.strayHunterHound) parts.push(STRAY_HOUND_LINE)
  if (state.door === 'outcast') parts.push(STRAY_OUTCAST_LINE)
  return parts.join('\n\n')
}

const CLEAR = ['strayHunterHere', 'strayHunterHound']

export function strayHuntChoices(state: GameState, fightFx: Choice['effects']): Choice[] {
  const hound = !!state.flags.strayHunterHound
  const wash = boneWashHunter(state)
  const rows: Choice[] = [
    {
      id: 'stray-cut',
      label: 'Cut your trail',
      sub: STRAY_CUT_SUB,
      enable: { sapMin: 1 },
      locked: 'Needs: 1 Sap',
      effects: { sap: -1, ticks: 1, still: true, unsetFlag: CLEAR, flag: { strayCut: true, ...(wash ? { strayWashTradeSeen: true } : {}) } },
    },
  ]
  if (hound) {
    rows.push({
      id: 'stray-feed',
      label: wash ? BONE_FEED_LABEL : 'Feed the hound a Drop',
      sub: STRAY_FEED_SUB,
      enable: { item: 'vial_drop' },
      locked: 'Needs: a Drop',
      effects: { remove: { vial_drop: 1 }, ticks: 1, still: true, unsetFlag: CLEAR, flag: wash ? { strayWashTradeSeen: true } : undefined, flash: STRAY_FEED_LINE },
    })
  }
  rows.push({
    id: 'stray-fight',
    label: 'Fight the Stray Hunter',
    sub: STRAY_FIGHT_SUB,
    tone: 'danger',
    effects: {
      ...fightFx,
      unsetFlag: [...(fightFx.unsetFlag ?? []), ...CLEAR],
      flag: { ...(fightFx.flag ?? {}), strayHuntFight: true, ...(wash ? { boneWashFight: true, strayWashTradeSeen: true } : {}) },
    },
  })
  if (!wash) return rows
  const pass = { ticks: 1, still: true, unsetFlag: CLEAR, heat: { strays: -1 as const } }
  rows.push(
    {
      id: 'stray-slip',
      label: 'Slip the stake',
      sub: BONE_SLIP_SUB,
      enable: { item: 'dust_cloak' },
      locked: BONE_SLIP_SUB,
      effects: { ...pass, remove: { dust_cloak: 1 }, flag: { strayWashTradeSeen: true }, flash: BONE_SLIP_LINE },
    },
    {
      id: 'stray-pay',
      label: 'Pay the stake',
      sub: BONE_PAY_SUB,
      enable: { itemMin: ['scrap', 3] },
      locked: 'Needs: 3 scrap',
      effects: { ...pass, remove: { scrap: 3 }, flag: { strayWashTradeSeen: true }, flash: BONE_PAY_LINE },
    },
    {
      id: 'stray-sign',
      label: 'Buy the sign',
      sub: BONE_SIGN_SUB,
      show: { flagUnset: 'straySignBought' },
      enable: { itemMin: ['scrap', 2] },
      locked: 'Needs: 2 scrap',
      effects: { remove: { scrap: 2 }, ticks: 1, still: true, unsetFlag: CLEAR, flag: { straySignBought: true, strayWashTradeSeen: true }, flash: BONE_SIGN_LINE },
    },
    {
      id: 'stray-hide',
      label: 'Buy the hide-word',
      sub: BONE_HIDE_SUB,
      show: { item: 'hide_wrap' },
      effects: { remove: { hide_wrap: 1 }, ticks: 1, still: true, unsetFlag: CLEAR, flag: { strayWashTradeSeen: true }, flash: BONE_HIDE_LINE },
    },
  )
  return rows
}

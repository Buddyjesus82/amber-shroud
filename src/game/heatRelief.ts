import type { Choice, Effect, GameState } from './types'
import { hash } from './fightTricks'
import { getScene } from './content'

/** v218: Cartel Heat relief in the Camp-04 Pens cluster (Prisoner), and Clean Passage at Cartel Heat 6+. */
export const PENS_CLUSTER = new Set(['camp:cages', 'camp:jaxson', 'camp:shiv', 'camp:genpop'])

export const BRIBE_LINE =
  'You slide a polished length of copper wire and two twists of scrap through the food slot to the tier-walker\'s runner. Ten minutes later, the patrol rotation shifts two cells down. The weight on your neck lightens just enough to breathe.'
export const BRIBE_HEAT_LINE = 'Cartel Heat -2.'
export const BRIBE_EVERY = 3
// PLACEHOLDER: Lay Low copy not approved yet.
export const LAY_LOW_LABEL = 'PLACEHOLDER Lay Low'
export const LAY_LOW_LINE = 'PLACEHOLDER: you lay low.\n\nCartel Heat -1.'
// PLACEHOLDER: guard-check copy not approved yet.
export const PASSAGE_LINE = 'PLACEHOLDER: a guard check stops you.'
export const PASSAGE_HEAT = 6
export const PASSAGE_ONE_IN = 3

const BRIBE_AT = 'bribeTick'
const LAID_LOW = 'laidLowVisit'
const CLEAR = 'passageClear'

function inPens(state: GameState): boolean {
  return state.door === 'prisoner' && state.hubId === 'camp04' && PENS_CLUSTER.has(state.sceneId)
}

export function bribeReady(state: GameState): boolean {
  const at = state.flags[BRIBE_AT]
  return typeof at !== 'number' || state.ticks - at >= BRIBE_EVERY
}

export function heatReliefRows(state: GameState): Choice[] {
  if (!inPens(state)) return []
  const out: Choice[] = []
  const scrap = (state.items.scrap ?? 0) >= 2
  const scrip = (state.items.scrip ?? 0) >= 1
  if (!state.flags.chapter1Done && bribeReady(state) && (scrap || scrip)) {
    out.push({
      id: 'kick-up',
      label: 'Kick Up to the Block Boss',
      sub: '2 Scrap or 1 Cartel Scrip.',
      tone: 'quiet',
      effects: {
        remove: scrap ? { scrap: 2 } : { scrip: 1 },
        heat: { cartel: -2 },
        ticks: 1,
        flag: { [BRIBE_AT]: state.ticks + 1 },
        flash: `${BRIBE_LINE}\n\n${BRIBE_HEAT_LINE}`,
      },
    })
  }
  if (!state.flags[LAID_LOW]) {
    out.push({
      id: 'lay-low',
      label: LAY_LOW_LABEL,
      tone: 'quiet',
      effects: { heat: { cartel: -1 }, flag: { [LAID_LOW]: true, [CLEAR]: true }, flash: LAY_LOW_LINE },
    })
  }
  return out
}

/** Clean Passage: a walk to another camp place at Cartel Heat 6+ meets the Vent patrol 1 in 3, unless you just Laid Low. */
export function passageCheck(state: GameState, fx: Effect): Effect {
  if (fx.passageChecked || !fx.goto || fx.goto === state.sceneId || fx.ambush || fx.sneak) return fx
  const out: Effect = { ...fx, passageChecked: true }
  const leaving = state.flags[LAID_LOW] && !PENS_CLUSTER.has(fx.goto)
  if (leaving) out.unsetFlag = [...(out.unsetFlag ?? []), LAID_LOW]
  if (state.door !== 'prisoner' || state.hubId !== 'camp04' || !fx.goto.startsWith('camp:')) return out
  if (state.flags.encounterHere || state.heat.cartel < PASSAGE_HEAT) return out
  // A walk is place to place. Talks, deals and story beats resolve first.
  if (getScene(state.sceneId, state.door).kind !== 'place' || getScene(fx.goto, state.door).kind !== 'place') return out
  if (state.flags[CLEAR]) return { ...out, unsetFlag: [...(out.unsetFlag ?? []), CLEAR] }
  if (hash(state, `passage:${fx.goto}`) % PASSAGE_ONE_IN !== 0) return out
  return { ...out, flag: { ...out.flag, passagePatrol: true }, ambush: { kind: 'patrol', line: PASSAGE_LINE } }
}

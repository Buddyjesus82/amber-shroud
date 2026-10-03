import { disguiseActive } from './kit'
import { personAtScene } from './people'
import type { Effect, GameState } from './types'

/**
 * The Vessel Cloth as a disguise in the Prisoner and Outcast doors (kit.disguiseActive).
 * - Cartel Heat gains are 1 lower while it works.
 * - Off-limits ground in Camp-04 does not mark you (engine markCartelNotice).
 * - Road fights with Cartel people offer "Walk past in the Vessel cloth" (encounter.ts).
 * - People with `seesThroughDisguise` (people.ts) see through it every time they meet you.
 * - Cartel people who check faces see through it 1 time in 4 when you walk up to them.
 * Seen through, it stops working for the rest of the run (flag disguiseBlown).
 * The Vessel door is unchanged.
 */

/** Cartel people who check faces. A chance, not a certainty. */
export const CARTEL_LOOKERS = ['valerius', 'rell']

export const DISGUISE_SOFTEN_NOTE = 'The Vessel cloth turns the Cartel eye. Cartel Heat rises 1 less.'

/** Cartel Heat gain -1 while the disguise works. */
export function softenCartel(state: GameState, fx: Effect): Effect {
  const gain = fx.heat?.cartel ?? 0
  if (gain <= 0 || !disguiseActive(state) || fx.flag?.disguiseBlown) return fx
  return { ...fx, heat: { ...fx.heat, cartel: gain - 1 } }
}

function lookRoll(state: GameState): number {
  let h = state.ticks * 31 + 7
  for (const ch of state.sceneId) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return h % 4
}

/** Walking up to someone in the cloth. Returns the state with the look applied, or unchanged. */
export function disguiseArrival(prev: GameState, next: GameState): GameState {
  if (next.sceneId === prev.sceneId || !disguiseActive(next)) return next
  const who = personAtScene(next.sceneId)
  if (!who) return next
  const always = !!who.seesThroughDisguise
  if (!always && !(CARTEL_LOOKERS.includes(who.id) && lookRoll(next) === 0)) return next
  const line = always
    ? `${who.name} looks at the cloth once. "You are no Vessel." The cloth will not fool anyone now. Seeker Heat rises by 1.`
    : `${who.name} looks hard at the cloth, then at your face. "That is no Vessel." The cloth will not fool the Cartel again. Cartel Heat rises by 2.`
  const heat = always ? { ...next.heat, seekers: Math.min(8, next.heat.seekers + 1) } : { ...next.heat, cartel: Math.min(8, next.heat.cartel + 2) }
  return {
    ...next,
    heat,
    flags: { ...next.flags, disguiseBlown: true, ...(always ? {} : { cartelNotice: true }) },
    flash: next.flash ? `${next.flash} ${line}` : line,
  }
}

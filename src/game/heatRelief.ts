import type { Choice, Effect, GameState } from './types'
import { hash } from './fightTricks'
import { getScene, ITEMS } from './content'
import { EQUIP_SLOTS } from './kit'

/** v218: Cartel Heat relief in the Camp-04 Pens cluster (Prisoner), and Clean Passage at Cartel Heat 6+. */
export const PENS_CLUSTER = new Set(['camp:cages', 'camp:jaxson', 'camp:shiv', 'camp:genpop'])

export const BRIBE_LINE =
  'You slide a polished length of copper wire and two twists of scrap through the food slot to the tier-walker\'s runner. Ten minutes later, the patrol rotation shifts two cells down. The weight on your neck lightens just enough to breathe.'
export const BRIBE_HEAT_LINE = 'Cartel Heat -2.'
export const BRIBE_EVERY = 3
export const LAY_LOW_LABEL = 'Lay Low'
export const LAY_LOW_SUB = 'Face the wall. Let the walker pass.'
export const LAY_LOW_LINE = "You fold into the back of the cage and breathe through your teeth. The tier-walker's lamp slides past without stopping.\n\nCartel Heat -1."
import { PASSAGE_LINE } from './encounter'
export { PASSAGE_LINE }
export const PASSAGE_HEAT = 6
export const PASSAGE_ONE_IN = 3

const BRIBE_AT = 'bribeTick'
const LAID_LOW = 'laidLowVisit'
/** Stealth: Hidden. Set by Lay Low; the next guard check is skipped and this is consumed. No chip (none exists). */
export const HIDDEN = 'stealthHidden'

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
      sub: 'Pay 2 Scrap or 1 Cartel Scrip',
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
      sub: LAY_LOW_SUB,
      tone: 'quiet',
      effects: { heat: { cartel: -1 }, flag: { [LAID_LOW]: true, [HIDDEN]: true }, flash: LAY_LOW_LINE },
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
  if (state.flags[HIDDEN]) return { ...out, unsetFlag: [...(out.unsetFlag ?? []), HIDDEN] }
  if (hash(state, `passage:${fx.goto}`) % PASSAGE_ONE_IN !== 0) return out
  return { ...out, flag: { ...out.flag, passagePatrol: true }, ambush: { kind: 'patrol', line: PASSAGE_LINE } }
}

/** Barrow Trails caches. v221: these four scenes are a one-pick cache, not a scavenge. v222: Conduit Alpha Siphon is the same cache at a higher yield. */
export const BARROW_CACHE_SCENES: ReadonlySet<string> = new Set<string>(['camp:siftline', 'ch2:p-sift', 'thresh:conduits', 'thresh:subdrain', 'ch3:siphon'])
export const BARROW_HEAT_LINE = 'Seeker Heat -1.'
/** v221: looted. The old `barrowCache:` flag was only the first-scavenge heat cut, so it does not count. */
export const barrowLootKey = (sceneId: string) => `barrowLooted:${sceneId}`
export const BARROW_POP = 'Pop the cache'
export const BARROW_POP_SUB = 'Requires Oversized Wrench for 0 Heat'
export const BARROW_BYPASS = 'Bypass the lock'
export const BARROW_BYPASS_LOCK = `Requires: ${ITEMS.rig_passkey.name} or ${ITEMS.cipher_key.name}`
export const BARROW_SIPHON = 'Siphon conduit fuel'
export const BARROW_EMPTY = 'The cache is empty.'
export const BARROW_SCRAP_1 = 'Scrap +1.'
export const BARROW_SCRAP_2 = 'Scrap +2.'
export const BARROW_SCRAP_3 = 'Scrap +3.'
export const BARROW_SCRAP_4 = 'Scrap +4.'
export const BARROW_CARTEL_1 = 'Cartel Heat +1.'
export const BARROW_CARTEL_2 = 'Cartel Heat +2.'
export const BARROW_CARTEL_3 = 'Cartel Heat +3.'
export const BARROW_SAP_1 = 'Sap +1.'
export const BARROW_SAP_2 = 'Sap +2.'
export const BARROW_HEAT_DOWN_2 = 'Seeker Heat -2.'

type BarrowPay = { popScrap: number; popHeat: number; popLine: string; heatLine: string; bypassScrap: number; bypassHeat: number; bypassLine: string; seekerLine: string; sap: number; siphonHeat: number; sapLine: string; siphonHeatLine: string }

function barrowPay(sceneId: string): BarrowPay {
  if (sceneId === 'ch3:siphon') {
    return { popScrap: 3, popHeat: 2, popLine: BARROW_SCRAP_3, heatLine: BARROW_CARTEL_2, bypassScrap: 4, bypassHeat: -2, bypassLine: BARROW_SCRAP_4, seekerLine: BARROW_HEAT_DOWN_2, sap: 2, siphonHeat: 3, sapLine: BARROW_SAP_2, siphonHeatLine: BARROW_CARTEL_3 }
  }
  return { popScrap: 1, popHeat: 1, popLine: BARROW_SCRAP_1, heatLine: BARROW_CARTEL_1, bypassScrap: 2, bypassHeat: -1, bypassLine: BARROW_SCRAP_2, seekerLine: BARROW_HEAT_LINE, sap: 1, siphonHeat: 2, sapLine: BARROW_SAP_1, siphonHeatLine: BARROW_CARTEL_2 }
}

export function barrowScene(state: Pick<GameState, 'sceneId'>): boolean {
  return BARROW_CACHE_SCENES.has(state.sceneId)
}

export function barrowLooted(state: GameState): boolean {
  return !!state.flags[barrowLootKey(state.sceneId)]
}

function wrenchOn(state: GameState): boolean {
  return EQUIP_SLOTS.some((slot) => state.equipped?.[slot] === 'wrench')
}

/** The cache replaces Scavenge. One pick, then it stays empty. */
export function barrowRows(state: GameState): Choice[] {
  if (!barrowScene(state)) return []
  if (barrowLooted(state)) {
    return [{ id: 'barrow-empty', label: BARROW_EMPTY, tone: 'quiet', enable: { flag: '__no__' }, effects: {} }]
  }
  const id = state.sceneId
  const key = barrowLootKey(id)
  const wrench = wrenchOn(state)
  const pay = barrowPay(id)
  return [
    {
      id: 'barrow-pop',
      label: BARROW_POP,
      sub: wrench ? undefined : BARROW_POP_SUB,
      tone: 'quiet',
      effects: wrench
        ? { add: { scrap: pay.popScrap }, flag: { [key]: true }, flash: pay.popLine }
        : { add: { scrap: pay.popScrap }, heat: { cartel: pay.popHeat }, flag: { [key]: true }, flash: `${pay.popLine}\n\n${pay.heatLine}` },
    },
    {
      id: 'barrow-bypass',
      label: BARROW_BYPASS,
      tone: 'quiet',
      enable: { any: [{ item: 'rig_passkey' }, { item: 'cipher_key' }] },
      locked: BARROW_BYPASS_LOCK,
      effects: { add: { scrap: pay.bypassScrap }, heat: { seekers: pay.bypassHeat }, flag: { [key]: true }, flash: `${pay.bypassLine}\n\n${pay.seekerLine}` },
    },
    {
      id: 'barrow-siphon',
      label: BARROW_SIPHON,
      tone: 'quiet',
      effects: { sap: pay.sap, heat: { cartel: pay.siphonHeat }, flag: { [key]: true }, flash: `${pay.sapLine}\n\n${pay.siphonHeatLine}` },
    },
  ]
}

/** Old first-scavenge Seeker cut. v221: the four cache scenes no longer use it. */
export function barrowCache(before: GameState, next: GameState, tagged: ReadonlySet<string> = BARROW_CACHE_SCENES): GameState {
  const id = before.sceneId
  const key = `barrowCache:${id}`
  if (BARROW_CACHE_SCENES.has(id) || !tagged.has(id) || before.flags[key]) return next
  const found = Object.entries(next.items).some(([k, n]) => (n ?? 0) > ((before.items as Record<string, number>)[k] ?? 0))
  if (!found) return next
  return {
    ...next,
    heat: { ...next.heat, seekers: Math.max(0, next.heat.seekers - 1) },
    flags: { ...next.flags, [key]: true },
    flash: [next.flash, BARROW_HEAT_LINE].filter(Boolean).join('\n\n'),
  }
}

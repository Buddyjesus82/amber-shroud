import { DOORS, HUBS, ITEMS, getScene, hasScene, resolveBody } from './content'
import { applyDelta, check, clamp } from './logic'
import {
  aimlessRunReply,
  hungerCommandEffect,
  HUNGER_BLOCKED,
  isHungerCommand,
  isRimDepartBeat,
  isRimDepartCommand,
  RIM_HUNGER_OPEN,
  RIM_NOWHERE,
} from './hunger'
import { GLOBAL_INTENTS, matchChoiceText, matchIntent } from './intent'
import { helpText } from './help'
import { isBayScene } from './content/bayHands'
import { classifyLook, directedLookFlash, pressureLookFlash, roomLookEffect } from './look'
import { matchCompass, travelGate } from './map'
import {
  atGuardStation,
  atKaelenInvoice,
  campJobOpen,
  TAKE_INSIDE_JOB,
  bayLookout,
  campHeard,
  ventPatrolInPlace,
  wantsCampSabotage,
  wantsDoSabotage,
} from './campJob'
import { markMetOnLeave, matchPersonQuery, personAtScene } from './people'
import { downedNote, wakeEffect } from './downed'
import { isPressureOverlay, pressureAppend, pressureChoices, pressureVerb } from './hunter'
import { offButton } from './verbs'
import {
  canEncounter,
  dismissEncounter,
  encounterCard,
  encounterChoices,
  encounterGround,
  enemyHealth,
  ENCOUNTER_FLAGS,
  HEALTH_MAX,
  isEncounterResult,
  pickEncounterKind,
  resolveEncounter,
  wantsEncounterFight,
  wantsEncounterHide,
  wantsEncounterSkip,
} from './encounter'
import { talkFallback, talkIntentsFor } from './talk'
import { applyScavenge, canScavenge, canSkim, skimHeat } from './scavenge'
import { writeSave } from './save'
import { repairSceneId } from './repair'
import { isRumorCounter, matchRumorText, rumorChoices } from './rumors'
import { matchShopText, moneyLabel, pickPay, shopChoices, vendorFor } from './trade'
import type { Choice, DoorId, Effect, EquipSlot, FlagMap, GameState, ItemId, Scene } from './types'

/**
 * How often Kaelen's pack stops on a hub.
 * A pass-frequency decision is pending — change this constant, not the check below.
 * quietScenes: quiet scenes since the last hunt before he may appear.
 * tickMod: he only stops when the scene clock divides cleanly by this.
 */
export const KAELEN_APPEARANCE = { quietScenes: 8, tickMod: 11 } as const

/**
 * Opening cells and pens. His pack does not stop in these, on any door.
 * Naming him in dialogue is still allowed. Once the player is out, the usual pass applies.
 */
export const KAELEN_HELD_SCENES = [
  'open:prisoner',
  'camp:cages',
  'camp:shiv',
  'camp:jaxson',
  'camp:jaxson-cache',
  'camp:jaxson-drop',
  'open:outcast',
  'open:vessel',
  'thresh:cell',
  'thresh:shrine',
  'crisis:camp',
] as const

export function kaelenHeld(sceneId: string): boolean {
  return (KAELEN_HELD_SCENES as readonly string[]).includes(sceneId)
}

export function newGame(door: DoorId): GameState {
  const d = DOORS[door]
  const state: GameState = {
    version: 1,
    door: d.id,
    epithet: d.epithet,
    sap: d.sap,
    sapMax: 8,
    health: HEALTH_MAX,
    healthMax: HEALTH_MAX,
    heat: { ...d.heat },
    items: { ...d.items },
    flags: { ...d.flags },
    equipped: d.id === 'vessel' ? { weapon: 'rusted_dagger', garment: 'ceremonial_cloth' } : {},
    recentVerbs: [],
    sceneId: d.sceneId,
    hubId: null,
    chapterId: null,
    ticks: 0,
    pressure: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }
  return persist(state)
}

export function persist(state: GameState): GameState {
  writeSave(state)
  return state
}

export function sceneOf(state: GameState): Scene {
  return getScene(state.sceneId, state.door)
}

export function sceneProse(state: GameState): string {
  const scene = sceneOf(state)
  const person = personAtScene(scene.id)
  const base = person && state.flags[person.metFlag] && person.later[scene.id] ? person.later[scene.id] : scene.body
  return resolveBody(scene, (c) => check(c, state), base)
}

export function bodyOf(state: GameState): string {
  if (state.flags.downed || (state.health ?? 1) <= 0) {
    const note = state.flags.downedNote
    return typeof note === 'string' && note ? note : downedNote(state)
  }
  if (state.flags.encounterHere) {
    return encounterCard(state)
  }
  const knock = pressureAppend(state)
  if (knock) return knock
  return sceneProse(state)
}

function pickCrisis(state: GameState): string {
  if (state.chapterId === 'cache-run') return 'crisis:dunes'
  if (state.hubId === 'camp04') return 'crisis:camp'
  if (state.hubId === 'spine') return 'crisis:spine'
  if (state.hubId === 'threshold') return 'crisis:thresh'
  if (state.hubId === 'redmaw') return 'crisis:maw'
  if (state.door === 'prisoner') return 'crisis:camp'
  if (state.door === 'outcast') return 'crisis:spine'
  return 'crisis:thresh'
}

function spendFirst(state: GameState, order: ItemId[], flagKey: string): GameState {
  for (const id of order) {
    if ((state.items[id] ?? 0) > 0) {
      let next = applyDelta(state, { remove: { [id]: 1 } })
      if (id === 'vial_drop') next = applyDelta(next, { add: { vial_empty: 1 } })
      next.flags = { ...next.flags, [flagKey]: id }
      return next
    }
  }
  return state
}

function spendValued(state: GameState): GameState {
  return spendFirst(
    state,
    ['vial_drop', 'glints', 'kallik_mark', 'strider_bit', 'ceremonial_cloth', 'rusted_dagger', 'wrench', 'silas_tip', 'shiv'],
    'buriedItem',
  )
}

function spendFalse(state: GameState): GameState {
  return spendFirst(state, ['scrap', 'wrench', 'cache_map', 'oram_map'], 'falseSpent')
}

function huntHeat(state: GameState): number {
  const seekersGround =
    state.hubId === 'redmaw' ||
    state.hubId === 'threshold' ||
    state.sceneId.startsWith('maw:') ||
    state.sceneId.startsWith('thresh:')
  return seekersGround ? state.heat.seekers : state.heat.cartel
}

/**
 * Quiet scenes that must pass before the same hunter interrupts again.
 * Heat 0 never interrupts. One table for every faction hunter.
 */
export const HUNTER_QUIET_GAPS = [
  { heatMin: 0, heatMax: 0, quiet: null },
  { heatMin: 1, heatMax: 3, quiet: 8 },
  { heatMin: 4, heatMax: 5, quiet: 6 },
  { heatMin: 6, heatMax: 7, quiet: 4 },
  { heatMin: 8, heatMax: 8, quiet: 2 },
] as const

/** Scenes that must pass before the same hunter can hit again. Null means that Heat does not interrupt. */
export function huntGap(heat: number): number | null {
  const h = Math.max(0, Math.min(8, Math.floor(heat)))
  const row = HUNTER_QUIET_GAPS.find((r) => h >= r.heatMin && h <= r.heatMax)
  return row ? row.quiet : null
}

/** Scenes that are the confrontation. Leaving one restarts the heat gap. */
const HUNT_GROUND = new Set([
  'maw:smoke',
  'maw:sybella',
  'maw:sybella-shadow',
  'camp:hunter',
  'spine:hunter',
  'thresh:hunter',
])

function facingSybella(sceneId: string): boolean {
  return sceneId === 'maw:sybella' || sceneId === 'maw:sybella-shadow'
}

function hunterScene(state: GameState): string | null {
  if (state.flags.hunterHere || state.flags.encounterHere || state.flags.downed) return null
  if (
    state.sceneId === 'camp:sabotage' ||
    state.sceneId === 'camp:gate' ||
    state.sceneId === 'camp:shiv' ||
    state.sceneId === 'camp:cages' ||
    state.sceneId === 'camp:lean' ||
    state.sceneId === 'camp:jaxson' ||
    state.sceneId === 'camp:jaxson-cache' ||
    state.sceneId === 'camp:jaxson-drop'
  ) {
    return null
  }
  if (isBayScene(state.sceneId) && bayLookout(state)) return null
  if ((state.health ?? 1) <= 0) return null
  if (state.sceneId.startsWith('open:') || state.sceneId.startsWith('crisis:') || state.sceneId.startsWith('ch1:')) return null
  if (state.chapterId && state.hubId !== 'redmaw') return null
  const quiet = Number(state.flags.huntQuiet ?? 0)
  const gap = huntGap(huntHeat(state))
  if (gap == null || quiet < gap) return null
  if (state.hubId === 'redmaw' || state.sceneId.startsWith('maw:')) {
    if (state.sceneId === 'maw:sybella' || state.sceneId === 'maw:sybella-shadow' || state.sceneId === 'maw:smoke') {
      return null
    }
    return 'maw:sybella-shadow'
  }
  if (state.chapterId) return null
  const map: Record<string, string> = {
    camp04: 'camp:hunter',
    spine: 'spine:hunter',
    threshold: 'thresh:hunter',
  }
  const id = state.hubId ? map[state.hubId] : null
  if (!id || state.sceneId === id) return null
  if (id === 'camp:hunter' && !campHeard(state)) return null
  if (id === 'spine:hunter' && state.heat.cartel < 2 && state.pressure < 6) return null
  return id
}

function markCartelNotice(prev: GameState, next: GameState, fx: Effect): GameState {
  if (next.flags.cartelNotice) return next
  const camp =
    prev.hubId === 'camp04' ||
    next.hubId === 'camp04' ||
    prev.sceneId.startsWith('camp:') ||
    next.sceneId.startsWith('camp:')
  if (!camp || prev.chapterId || next.chapterId) return next
  const stole =
    !!fx.flag?.bayPikeTook ||
    !!fx.flag?.baySarnTook ||
    !!fx.flag?.bayVetchTook ||
    !!fx.flag?.skimmed ||
    !!fx.flag?.relicTaken ||
    !!(fx.flag?.vatDripTaken && fx.heat?.cartel) ||
    !!fx.flag?.cartelNotice
  const job = !!fx.flag?.jaxsonInside && !prev.flags.jaxsonInside
  const offLimits = next.sceneId === 'camp:guard' && prev.sceneId !== 'camp:guard' && !next.flags.jaxsonInside
  if (!stole && !job && !offLimits) return next
  return { ...next, flags: { ...next.flags, cartelNotice: true } }
}

function hunterReturnFallback(state: GameState, dest: string | undefined): string {
  if (dest) return dest
  if (state.hubId === 'redmaw') return 'maw:rim'
  if (state.hubId === 'spine') return 'spine:ridge'
  if (state.hubId === 'threshold') return 'thresh:court'
  if (state.chapterId === 'cache-run') return state.sceneId
  return 'camp:yard'
}

function resolveDest(state: GameState, fx: Effect): string | undefined {
  let dest = fx.goto
  if (fx.returnHunterFrom) {
    const from = state.flags.hunterFrom
    dest =
      typeof from === 'string' && from && getScene(from, state.door).id !== 'missing'
        ? from
        : hunterReturnFallback(state, dest)
  }
  if (fx.returnCrisisFrom) {
    const from = state.flags.crisisFrom
    if (typeof from === 'string' && from && !from.startsWith('crisis:') && getScene(from, state.door).id !== 'missing') {
      dest = from
    }
  }
  if (dest && !hasScene(dest)) {
    dest = repairSceneId({ ...state, sceneId: dest })
  }
  return dest
}

export function applyEffect(state: GameState, fx: Effect): GameState {
  if (fx.pay) {
    const spent = pickPay(state, fx.pay)
    if (!spent) {
      return { ...state, flash: `Need ${moneyLabel(fx.pay)}.`, updatedAt: Date.now() }
    }
    const remove: Partial<Record<ItemId, number>> = {
      ...spent,
      ...(spent.glints ? fx.payGlintRemove : undefined),
      ...fx.remove,
    }
    const rest = { ...fx }
    delete rest.pay
    delete rest.payGlintRemove
    fx = { ...rest, remove }
  }
  if (fx.travel) {
    const rest = { ...fx }
    delete rest.travel
    delete rest.goto
    const paid = applyEffect(state, rest)
    return travelTo(paid, fx.travel)
  }
  if (fx.flag?.chipGamble && (state.items.overseer_chip ?? 0) > 0 && !state.flags.chipBluff) {
    const rare = (state.ticks * 17 + state.heat.cartel * 3 + 1) % 8 === 0
    const flag = { ...(fx.flag ?? {}) }
    delete flag.chipGamble
    const rest = { ...fx, flag }
    if (rare) {
      fx = {
        ...rest,
        heat: { cartel: -1 },
        flag: { ...(rest.flag ?? {}), chipBluff: true },
        flash:
          'The chip catches the light and, for once, the math believes you. He lets the moment pass. You are still in the tower. It will not work twice.',
      }
    } else {
      fx = {
        ...rest,
        remove: { ...(rest.remove ?? {}), overseer_chip: 1 },
        heat: { cartel: 3 },
        flag: { ...(rest.flag ?? {}), chipCaught: true },
        flash:
          'Caught. He takes the chip off you like it was never yours. Cartel Heat spikes. You are still standing in his tower, poorer and known.',
      }
    }
  }
  const dest = resolveDest(state, fx)
  let next = applyDelta(state, fx)
  next.flash = fx.flash
  if (fx.resolveEncounter) {
    const result = resolveEncounter(state, fx.resolveEncounter)
    next = applyDelta(next, result.fx)
    if (result.fx.flag?.ventLoot) next = applyDelta(next, { add: { ironwood_baton: 1 } })
    next.flash = result.flash
    if (result.fx.add?.vial_drop && (state.items.vial_empty ?? 0) > 0) {
      next = applyDelta(next, { remove: { vial_empty: 1 } })
    }
  }

  if (fx.startChapter) {
    next.chapterId = fx.startChapter
    next.hubId = null
    const leavingCamp = state.hubId === 'camp04' || state.sceneId.startsWith('camp:')
    next.flags = {
      ...next.flags,
      hungerLocked: true,
      hungerKnown: true,
      ...(leavingCamp
        ? {
            leftCamp: true,
            campLockdown: !!state.flags.guardDown,
            quietFence: !!state.flags.wireCut && !state.flags.guardDown,
            oilResentful: !state.flags.guardDown && !state.flags.jaxsonInside ? true : next.flags.oilResentful,
          }
        : {}),
    }
    if (next.items.oram_map || next.items.silas_tip || next.items.cache_map) {
      delete next.flags.cacheBlind
    }
  }
  if (fx.enterHub) {
    const hub = HUBS[fx.enterHub]
    if (hub) {
      next.hubId = hub.id
      if (!fx.startChapter && dest !== 'ch2:stub') next.chapterId = null
    }
  }

  const arrivingLand =
    dest === 'ch1:land' ||
    dest === 'ch1:bargain' ||
    dest === 'ch1:flee' ||
    dest === 'ch1:false' ||
    dest === 'ch1:hollow'
  const destScene = dest ? getScene(dest) : null
  const recovering = sceneOf(state).kind === 'crisis' && next.sap > 0
  const sapCollapsed = next.sap <= 0
  const skipCrisis =
    !!fx.enterHub ||
    !!fx.startChapter ||
    arrivingLand ||
    destScene?.kind === 'crisis' ||
    recovering

  if (dest) {
    next.flags = markMetOnLeave(state.sceneId, dest, next.flags)
    next.sceneId = dest
    if (dest !== state.sceneId && (next.flags.shopShelf || next.flags.rumorShelf)) {
      const flags = { ...next.flags }
      delete flags.shopShelf
      delete flags.rumorShelf
      next.flags = flags
    }
    if (dest !== state.sceneId && next.flags.hunterHere) {
      const flags = { ...next.flags }
      delete flags.hunterHere
      if (!facingSybella(dest)) delete flags.hunterFrom
      next.flags = flags
    }
    if (dest !== state.sceneId) {
      const flags = { ...next.flags }
      if (flags.encounterHere) {
        for (const k of ENCOUNTER_FLAGS) delete flags[k]
      }
      delete flags.encounterDone
      delete flags.encounterClash
      delete flags.encounterFlash
      next.flags = flags
    }
    if (
      dest.startsWith('camp:') &&
      dest !== 'camp:gate' &&
      state.flags.leftCamp &&
      state.flags.campLockdown &&
      !state.flags.quietFence
    ) {
      next.sceneId = 'camp:gate'
      next.flags = { ...next.flags, gateFrom: state.sceneId }
      next.flash =
        'Lockdown. The gates are counted and the sabotage is still in their teeth. Walking in is a fight or a collar.'
    }
  }

  if (next.flags.leaveGate) {
    const from = state.flags.gateFrom
    if (typeof from === 'string' && from && !from.startsWith('camp:') && hasScene(from)) {
      next.sceneId = from
      const back = getScene(from)
      if (back.hubId) next.hubId = back.hubId
    } else if (state.flags.chapter1Done || state.hubId === 'redmaw') {
      next.sceneId = 'maw:rim'
      next.hubId = 'redmaw'
    }
    const flags = { ...next.flags }
    delete flags.leaveGate
    next.flags = flags
  }

  if (next.flags.returnPass) {
    const from = state.flags.kaelenFrom
    if (typeof from === 'string' && from && from !== 'roam:kaelen' && hasScene(from)) {
      next.sceneId = from
      const back = getScene(from)
      if (back.hubId) next.hubId = back.hubId
      if (back.chapterId) next.chapterId = back.chapterId
    }
    const flags = { ...next.flags }
    delete flags.returnPass
    next.flags = flags
  }

  if (next.sceneId === 'ch1:hollow' && state.sceneId !== 'ch1:hollow') {
    next = spendValued(next)
  }
  if (next.flags.climax === 'false' && state.flags.climax !== 'false') {
    next = spendFalse(next)
  }
  if (next.flags.decoyNow && !state.flags.decoyNow) {
    next = spendFalse(next)
    const flags = { ...next.flags }
    delete flags.decoyNow
    next.flags = flags
  }

  const arrived = getScene(next.sceneId)
  if (arrived.hubId) next.hubId = arrived.hubId
  if (arrived.chapterId) next.chapterId = arrived.chapterId

  if (sapCollapsed && !skipCrisis && arrived.kind !== 'crisis') {
    next.sap = 0
    next.flags = { ...next.flags, crisisFrom: state.sceneId }
    next.sceneId = pickCrisis(next)
    const c = getScene(next.sceneId)
    if (c.hubId) next.hubId = c.hubId
  }

  if (getScene(next.sceneId).kind === 'crisis' && next.flags.encounterHere) {
    const flags = { ...next.flags }
    const short = typeof flags.encounterFlash === 'string' ? flags.encounterFlash : next.flash
    for (const k of ENCOUNTER_FLAGS) delete flags[k]
    next.flags = flags
    if (short) next.flash = short
  }

  next = markCartelNotice(state, next, fx)
  if (next.sceneId === 'camp:sabotage' && state.sceneId !== 'camp:sabotage' && !next.flags.guardDown) {
    next.flags = { ...next.flags, ventPatrol: ventPatrolInPlace(next) }
  }

  const lingered = (fx.ticks ?? 0) > 0 || (fx.pressure ?? 0) > 0 || !!dest
  const clearingHunt = !!state.flags.hunterHere && (!next.flags.hunterHere || !!fx.unsetFlag?.includes('hunterHere'))
  if (clearingHunt) {
    const keepFrom = facingSybella(next.sceneId)
    next.flags = { ...next.flags, huntQuiet: 0 }
    delete next.flags.hunterHere
    if (!keepFrom) delete next.flags.hunterFrom
  } else if (lingered && !next.flags.hunterHere && !next.flags.encounterHere) {
    const restart = HUNT_GROUND.has(state.sceneId) && next.sceneId !== state.sceneId
    const carried = restart ? 0 : Number(next.flags.huntQuiet ?? 0)
    next.flags = { ...next.flags, huntQuiet: carried + 1 }
  }
  const interrupt = lingered && !clearingHunt ? hunterScene(next) : null
  const fightBeat = !!fx.resolveEncounter || !!next.flags.encounterHere || !!fx.unsetFlag?.includes('encounterHere')
  const arrivedKind = getScene(next.sceneId).kind
  if (interrupt && !fightBeat && arrivedKind !== 'crisis' && arrivedKind !== 'talk' && arrivedKind !== 'ending') {
    const from = next.sceneId
    next.flash = undefined
    next.flags = {
      ...next.flags,
      hunterFrom: from,
      hunterAt: next.ticks,
      hunterHere: true,
      huntQuiet: 0,
      sybellaShadowed: from.startsWith('maw:') || next.hubId === 'redmaw' ? true : next.flags.sybellaShadowed,
      metHandler: interrupt === 'camp:hunter' ? true : next.flags.metHandler,
    }
  }

  const place = getScene(next.sceneId).kind === 'place'
  if (next.sceneId === 'camp:kaelen' || next.sceneId === 'spine:kaelen' || next.sceneId === 'thresh:kaelen') {
    const hub = next.sceneId.startsWith('camp') ? 'camp04' : next.sceneId.startsWith('spine') ? 'spine' : 'threshold'
    next.flags = { ...next.flags, kaelenHub: hub }
  }
  if (
    lingered &&
    place &&
    !kaelenHeld(next.sceneId) &&
    !next.flags.kaelenPassing &&
    !next.flags.hunterHere &&
    !next.flags.encounterHere &&
    !next.sceneId.includes('kaelen') &&
    Number(next.flags.huntQuiet ?? 0) >= KAELEN_APPEARANCE.quietScenes &&
    next.ticks % KAELEN_APPEARANCE.tickMod === 0
  ) {
    next.flags = { ...next.flags, kaelenPassing: true, kaelenHub: next.hubId ?? next.flags.kaelenHub }
  }
  if (next.flags.sybellaHunting && next.heat.cartel >= 6 && !next.flags.opposedHook) {
    next.flags = { ...next.flags, opposedHook: true, heardOpposed: true }
  }

  const traveled = !!dest && dest !== state.sceneId
  const firstWalk =
    !next.flags.roadFightSeen &&
    (next.chapterId === 'cache-run' || !!state.chapterId) &&
    (next.sceneId === 'ch1:p-pipe' || next.sceneId === 'ch1:o-noon' || next.sceneId === 'ch1:v-hymn')
  const keepBayLine = isBayScene(state.sceneId) && typeof fx.flash === 'string'
  const roamBeat = lingered && (next.sceneId === state.sceneId || traveled || !!fx.travel)
  if (
    roamBeat &&
    !keepBayLine &&
    !fightBeat &&
    !next.flags.hunterHere &&
    !clearingHunt &&
    encounterGround(next) &&
    canEncounter(next, { traveled, firstWalk })
  ) {
    const kind = pickEncounterKind(next)
    next.flash = undefined
    next.flags = {
      ...next.flags,
      encounterHere: true,
      encounterKind: kind,
      encounterAt: next.ticks,
      encounterHp: enemyHealth(kind),
      roadFightSeen: true,
    }
    delete next.flags.encounterClash
  } else if (firstWalk) {
    next.flags = { ...next.flags, roadFightSeen: true }
  }

  if (arrived.onEnter && next.sceneId === arrived.id && state.sceneId !== arrived.id && !next.flags.encounterHere && !next.flags.hunterHere) {
    next = applyDelta(next, arrived.onEnter)
  }

  if ((state.health ?? 1) > 0 && (next.health ?? 1) <= 0 && !state.flags.downed) {
    const note = downedNote({ ...state, sceneId: next.sceneId, flags: next.flags, hubId: next.hubId })
    const flags: FlagMap = { ...next.flags, downed: true, downedNote: note }
    for (const k of ENCOUNTER_FLAGS) delete flags[k]
    next.flags = flags
    next.health = 0
    next.flash = undefined
  }

  next.updatedAt = Date.now()
  return persist(next)
}

export function travelTo(state: GameState, sceneId: string): GameState {
  if (state.sceneId === sceneId) return state
  const gate = travelGate(state, sceneId)
  if (!gate.ok) {
    return persist({ ...state, flash: gate.reason })
  }
  if (gate.sap <= 0) {
    return applyEffect(state, { goto: sceneId })
  }
  return applyEffect(state, {
    goto: sceneId,
    sap: -gate.sap,
    ticks: 1,
    pressure: 1,
    flash:
      state.sap <= 2 || state.sap <= gate.sap
        ? 'The walk takes a Drop you do not have to spare.'
        : gate.sap >= 2
          ? 'The long way around. The ground charges you in Drops.'
          : undefined,
  })
}

export function drinkDrop(state: GameState): GameState {
  if (!(state.items.vial_drop ?? 0)) {
    return persist({ ...state, flash: 'Nothing in the glass.' })
  }
  return applyEffect(state, {
    sap: 3,
    remove: { vial_drop: 1 },
    add: { vial_empty: 1 },
    ticks: 1,
    flash: 'The Drop hits like a nail of honey and heat. The vial is a dry throat again.',
  })
}

function withVerb(state: GameState, verb: string): GameState {
  const prev = state.recentVerbs ?? []
  const recentVerbs = [verb, ...prev.filter((v) => v !== verb)].slice(0, 4)
  return persist({ ...state, recentVerbs, updatedAt: Date.now() })
}

function verbLabel(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('who')) return 'who is'
  if (t.includes('scaven')) return 'scavenge'
  if (t === 'look around' || t === 'look' || t === 'search') return 'look'
  return t
}

export function scavenge(state: GameState): GameState {
  // applyDelta only — never applyEffect, never goto, never hunter/crisis relocate.
  const pinned = { sceneId: state.sceneId, hubId: state.hubId, chapterId: state.chapterId }
  const next = applyScavenge(state)
  return withVerb(
    persist({
      ...next,
      ...pinned,
      updatedAt: Date.now(),
    }),
    'scavenge',
  )
}

export function skim(state: GameState): GameState {
  if (state.flags[`skim:${state.sceneId}`]) {
    return persist({
      ...state,
      flash: 'This throat is already dry. You took what it would give. Heat remembers the taking.',
      updatedAt: Date.now(),
    })
  }
  if (!canSkim(state)) {
    return persist({
      ...state,
      flash: 'No drip here worth a hand. Find a vat, a vent, a well, a lip — or buy from Kaelen.',
      updatedAt: Date.now(),
    })
  }
  const heat = skimHeat(state)
  return withVerb(
    applyEffect(state, {
      add: { vial_drop: 1 },
      remove: (state.items.vial_empty ?? 0) > 0 ? { vial_empty: 1 } : undefined,
      sap: -1,
      heat,
      pressure: 2,
      ticks: 1,
      flag: { [`skim:${state.sceneId}`]: true, skimmed: true },
      flash: heat
        ? 'You skim a Drop the desert had not budgeted. Hands sticky. Someone here can trace it. Heat ticks. This is theft with a glass throat — not a crisis rescue.'
        : 'You skim a Drop off the Hollow Lip. Nobody from the Cartel, the Seekers, or the Strays is here to see it. No Heat.',
    }),
    'skim',
  )
}

function tryCampSabotageJob(state: GameState, text: string): GameState | null {
  if (!campJobOpen(state) || !wantsCampSabotage(text)) return null
  if (sceneOf(state).kind === 'crisis') return null
  const stayWithKaelen = atKaelenInvoice(state)
  const atStation = atGuardStation(state)
  const going = wantsDoSabotage(text)
  if (state.flags.guardDown) {
    return withVerb(
      persist({
        ...state,
        flash: 'The station is already coughing. Bay. Hull. That was the job.',
        updatedAt: Date.now(),
      }),
      'sabotage',
    )
  }
  if (!state.flags.jaxsonInside) {
    let goto: string | undefined
    if (stayWithKaelen) goto = undefined
    else if (atStation && going) goto = 'camp:sabotage'
    else if (going) goto = 'camp:guard'
    else if (state.sceneId === 'camp:jaxson') goto = 'camp:lean'
    return withVerb(applyEffect(state, { ...TAKE_INSIDE_JOB, goto }), 'sabotage')
  }
  if (stayWithKaelen && !going) {
    return withVerb(
      persist({
        ...state,
        flash: 'The wrench is already yours. West steam-vent. Guard station. Map when you want the bolt.',
        updatedAt: Date.now(),
      }),
      'sabotage',
    )
  }
  const dest = atStation ? 'camp:sabotage' : 'camp:guard'
  return withVerb(
    applyEffect(state, {
      goto: dest,
      ticks: 1,
      flash:
        dest === 'camp:sabotage'
          ? 'West steam-vent. The wrench knows the bolt.'
          : 'The job is the west steam-vent on the guard station. You walk it.',
    }),
    'sabotage',
  )
}

const REST_SCENES = new Set(['camp:bay', 'camp:lean', 'camp:cages', 'maw:tuner', 'maw:stilt', 'spine:shade', 'thresh:cell'])

export function interpret(state: GameState, text: string): GameState {
  const scene = sceneOf(state)
  const bare = text.trim().toLowerCase()
  const said = bare === 'l' || /^l\s/.test(bare) ? bare.replace(/^l\b/, 'look') : bare
  if (bare === 'help' || bare === '?') {
    const labels = visibleChoices(state).map((c) => c.label)
    const face = isPressureOverlay(state)
      ? 'This interrupt is the whole ground. '
      : state.flags.encounterHere
        ? 'The fight is the whole ground. '
        : ''
    return withVerb(
      persist({ ...state, flash: `${face}${helpText(state, labels)}`, updatedAt: Date.now() }),
      'help',
    )
  }
  if ((state.flags.downed || (state.health ?? 1) <= 0) && !/^(wake|up|stand|rise)$/.test(bare)) {
    return withVerb(
      persist({
        ...state,
        flash: 'You are down. Too hurt to fight. Take the hand that is offered.',
        updatedAt: Date.now(),
      }),
      'down',
    )
  }
  const who = matchPersonQuery(text, state)
  if (who === 'unknown') {
    return withVerb(
      persist({
        ...state,
        flash: 'You have not met them. The dunes can keep that name until you do.',
        updatedAt: Date.now(),
      }),
      'who is',
    )
  }
  if (who === 'ask') {
    return withVerb(
      persist({
        ...state,
        flash: 'Name someone in front of you, or someone you have already met.',
        updatedAt: Date.now(),
      }),
      'who is',
    )
  }
  if (who && isPressureOverlay(state)) {
    return withVerb(
      persist({
        ...state,
        flash: 'The one in front of you is the conversation. Talk, fight, bribe, or run.',
        updatedAt: Date.now(),
      }),
      'who is',
    )
  }
  if (who) {
    return withVerb(
      applyEffect(state, { flash: who.card, flag: { [who.metFlag]: true, [`asked:${who.id}`]: true } }),
      'who is',
    )
  }

  const job = tryCampSabotageJob(state, text)
  if (job) return job

  if (state.flags.encounterHere) {
    if ((state.health ?? 1) <= 0 && wantsEncounterFight(text)) {
      return withVerb(persist({ ...state, flash: 'Too hurt to fight.', updatedAt: Date.now() }), 'fight')
    }
    if (isEncounterResult(state)) {
      return withVerb(applyEffect(state, dismissEncounter(state)), 'on')
    }
    if (wantsEncounterFight(text)) {
      return withVerb(applyEffect(state, { resolveEncounter: 'fight', ticks: 1 }), 'fight')
    }
    if (wantsEncounterHide(text) || wantsEncounterSkip(text)) {
      return withVerb(applyEffect(state, { resolveEncounter: 'skip' }), wantsEncounterHide(text) ? 'hide' : 'skip')
    }
    return withVerb(
      persist({ ...state, flash: 'The fight is the ground. Fight, or give the road.', updatedAt: Date.now() }),
      'fight',
    )
  }

  if (isPressureOverlay(state)) {
    const shown = visibleChoices(state).filter((c) => isChoiceOn(state, c.enable))
    const button = matchChoiceText(text, shown)
    if (button) return withVerb(applyEffect(state, button.effects), button.id)
    const pressed = pressureVerb(state, text)
    if (pressed && isChoiceOn(state, pressed.enable)) {
      return withVerb(applyEffect(state, pressed.effects), pressed.id)
    }
    const knockLook = classifyLook(said)
    if (knockLook?.kind === 'room') {
      return withVerb(persist({ ...state, flash: pressureLookFlash(state), updatedAt: Date.now() }), 'look')
    }
    if (knockLook?.kind === 'dir') {
      return withVerb(persist({ ...state, flash: directedLookFlash(state, knockLook.dir), updatedAt: Date.now() }), 'look')
    }
    if (knockLook) {
      return withVerb(
        persist({
          ...state,
          flash: 'The one in front of you is the conversation. The ground under them can wait.',
          updatedAt: Date.now(),
        }),
        'look',
      )
    }
    return withVerb(
      persist({
        ...state,
        flash: 'This interrupt is the ground. Talk, fight, bribe, run, or a card. The scene underneath can wait.',
        updatedAt: Date.now(),
      }),
      'try',
    )
  }

  if (/\b(rest|sleep|bind|bandage|heal)\b/.test(bare) && (REST_SCENES.has(state.sceneId) || (state.items.salve ?? 0) > 0)) {
    if ((state.items.salve ?? 0) > 0 && /\b(bind|bandage|salve|heal)\b/.test(bare)) {
      return withVerb(
        applyEffect(state, {
          remove: { salve: 1 },
          health: 3,
          ticks: 1,
          flash: 'Resin salve on the cut. Health comes back a few pips. The tin is lighter.',
        }),
        'heal',
      )
    }
    if (REST_SCENES.has(state.sceneId) && state.health < state.healthMax && state.sap > 0) {
      return withVerb(
        applyEffect(state, {
          health: 2,
          sap: -1,
          ticks: 1,
          flash: 'You sit until the cut stops arguing. Health returns a little. Sap pays for the hour.',
        }),
        'rest',
      )
    }
  }

  const aimed = classifyLook(said)
  if (aimed?.kind === 'room') {
    const labels = visibleChoices(state).map((c) => c.label)
    return withVerb(applyEffect(state, roomLookEffect(state, labels)), 'look')
  }
  if (aimed?.kind === 'dir') {
    return withVerb(persist({ ...state, flash: directedLookFlash(state, aimed.dir), updatedAt: Date.now() }), 'look')
  }

  if (!isPressureOverlay(state)) {
    const shopHit = matchShopText(state, text)
    if (shopHit) {
      return withVerb(applyEffect(state, shopHit.effects), shopHit.verb)
    }

    const rumorHit = matchRumorText(state, text)
    if (rumorHit) {
      return withVerb(applyEffect(state, rumorHit.effects), rumorHit.verb)
    }
  }

  const shown = visibleChoices(state)
  const enabled = shown.filter((c) => isChoiceOn(state, c.enable))

  if (isHungerCommand(text)) {
    const fx = hungerCommandEffect(state, enabled)
    if (fx) return withVerb(applyEffect(state, fx), 'hunger')
    const named = enabled.filter((c) => /\bhunger\b/i.test(`${c.label} ${c.sub ?? ''}`))
    const namedHit = matchChoiceText(text, named)
    if (namedHit) return withVerb(applyEffect(state, namedHit.effects), namedHit.id)
    if (!state.flags.encounterHere && !isPressureOverlay(state)) {
      return withVerb(persist({ ...state, flash: HUNGER_BLOCKED, updatedAt: Date.now() }), 'hunger')
    }
  }

  const button = matchChoiceText(text, enabled)
  if (button) {
    return withVerb(applyEffect(state, button.effects), button.id)
  }

  const compass = matchCompass(state, text)
  if (compass) {
    return withVerb(travelTo(state, compass.sceneId), `go ${compass.dir.toLowerCase()}`)
  }

  const pressed = pressureVerb(state, text)
  if (pressed) {
    return withVerb(applyEffect(state, pressed.effects), pressed.id)
  }

  if (/^(?:look(?: around)?|search|examine|inspect)\s+\S/.test(said)) {
    const look = offButton(state, text, scene, shown.map((c) => c.label))
    if (look) return withVerb(applyEffect(state, look.effects), look.verb)
  }

  const local = matchIntent(text, [...(scene.intents ?? []), ...talkIntentsFor(scene.id)], state)
  if (local) {
    return withVerb(applyEffect(state, { ...local.effects, flash: local.reply }), verbLabel(local.tags[0]))
  }

  const labels = shown.map((c) => c.label)
  const off = offButton(state, text, scene, labels)
  if (off) {
    return withVerb(applyEffect(state, off.effects), off.verb)
  }

  const hay = text.toLowerCase()
  const wantsScavenge = /\b(scavenge|forage|rummage|scrounge)\b/.test(hay)
  const wantsSkim = /\b(skim|tap|siphon)\b/.test(hay)
  const wantsMap = /\bmap\b/.test(hay)

  if (wantsScavenge) return scavenge(state)
  if (wantsSkim) return skim(state)
  if (wantsMap) {
    return withVerb(
      persist({
        ...state,
        flash: 'Map is the charcoal scrap beside Heat. Connected roads only. Each hop costs Sap.',
        updatedAt: Date.now(),
      }),
      'map',
    )
  }

  const global = matchIntent(text, GLOBAL_INTENTS, state)
  if (global) {
    const escape = global.tags.includes('escape') && global.tags.includes('walk')
    if (escape && isRimDepartBeat(state)) {
      const fx = hungerCommandEffect(state, enabled)
      if (fx && isRimDepartCommand(text)) {
        return withVerb(applyEffect(state, fx), 'hunger')
      }
      const reply = fx ? RIM_HUNGER_OPEN : RIM_NOWHERE
      return withVerb(applyEffect(state, { ...global.effects, flash: reply }), verbLabel(global.tags[0]))
    }
    const reply = escape ? aimlessRunReply(hungerCommandEffect(state, enabled) != null) : global.reply
    return withVerb(applyEffect(state, { ...global.effects, flash: reply }), verbLabel(global.tags[0]))
  }
  const fallback = scene.intentFallback ?? (scene.kind === 'talk' || scene.speaker ? talkFallback(scene.id, scene.speaker) : null)
  if (fallback) {
    return withVerb(
      applyEffect(state, {
        ...(fallback.effects ?? {}),
        flash: fallback.reply,
        ticks: fallback.effects?.ticks ?? 1,
      }),
      'try',
    )
  }
  return persist({
    ...state,
    ticks: state.ticks + 1,
    flash: 'Miss. Try look, talk, fight, hide, bribe, give — or a button.',
    updatedAt: Date.now(),
  })
}

function scopeDecoy(state: GameState, choices: ReturnType<typeof sceneOf>['choices']) {
  return choices.map((c) => {
    if (c.id !== 'false') return c
    const bits: string[] = []
    if ((state.items.scrap ?? 0) > 0) bits.push('scrap')
    if ((state.items.wrench ?? 0) > 0) bits.push('the wrench')
    if ((state.items.cache_map ?? 0) > 0 || (state.items.oram_map ?? 0) > 0) bits.push('a map')
    if (!bits.length) return c
    return { ...c, sub: `Throw ${bits.join(' or ')}. She still follows.` }
  })
}

export function visibleChoices(state: GameState): Choice[] {
  if (state.flags.downed || (state.health ?? 1) <= 0) {
    return [
      {
        id: 'wake',
        label: 'Take the hand. Get up.',
        sub: 'Too hurt to fight.',
        tone: 'quiet',
        effects: wakeEffect(state),
      },
      {
        id: 'too-hurt',
        label: 'Fight',
        locked: 'Too hurt to fight.',
        enable: { flag: '__no__' },
        tone: 'danger',
        effects: {},
      },
    ]
  }
  if (state.flags.encounterHere) {
    return encounterChoices(state)
  }
  const knock = pressureChoices(state)
  if (knock.length) return knock
  const authored = scopeDecoy(state, sceneOf(state).choices.filter((c) => check(c.show, state)))
  const rows = vendorFor(state.sceneId)
    ? shopChoices(state, authored).filter((c) => check(c.show, state))
    : isRumorCounter(state.sceneId)
      ? rumorChoices(state, authored).filter((c) => check(c.show, state))
      : authored
  return withKaelenPass(state, rows)
}

function withKaelenPass(state: GameState, rows: Choice[]): Choice[] {
  if (!state.flags.kaelenPassing || state.sceneId === 'roam:kaelen' || kaelenHeld(state.sceneId)) return rows
  return [
    ...rows,
    {
      id: 'kaelen-pass',
      label: 'Kaelen the Sifter has stopped',
      sub: 'His pack. A rumor from the last road. He will not stay.',
      effects: {
        goto: 'roam:kaelen',
        unsetFlag: ['kaelenPassing'],
        flag: { kaelenFrom: state.sceneId, kaelenKnown: true, metKaelen: true },
        ticks: 1,
      },
    },
  ]
}

export function isChoiceOn(state: GameState, cond: import('./types').Cond | undefined) {
  return check(cond, state)
}

export function heatTone(n: number): 'cool' | 'warm' | 'hot' {
  if (n >= 5) return 'hot'
  if (n >= 3) return 'warm'
  return 'cool'
}

export function sapLabel(n: number): string {
  if (n <= 0) return 'Empty'
  if (n <= 2) return 'Thin'
  if (n <= 4) return 'Holding'
  if (n <= 6) return 'Warm'
  return 'Full'
}

export { healthLabel } from './encounter'

export function equipItem(state: GameState, id: ItemId): GameState {
  const def = ITEMS[id]
  if (!def?.slot) {
    return persist({ ...state, flash: 'That does not wear. Carry it.' })
  }
  if (!(state.items[id] ?? 0)) {
    return persist({ ...state, flash: 'You do not have it to equip.' })
  }
  const equipped = { ...(state.equipped ?? {}), [def.slot]: id }
  const flash =
    def.slot === 'weapon'
      ? `${def.name} in the hand.`
      : def.slot === 'armor'
        ? `${def.name} on the body.`
        : def.slot === 'head'
          ? `${def.name} at the brow.`
          : `${def.name} worn.`
  return persist({
    ...state,
    equipped,
    flash,
    updatedAt: Date.now(),
  })
}

export function unequipSlot(state: GameState, slot: EquipSlot): GameState {
  const equipped = { ...(state.equipped ?? {}) }
  delete equipped[slot]
  const flash =
    slot === 'weapon' ? 'Empty hand.' : slot === 'armor' ? 'Bare shoulders.' : slot === 'head' ? 'The brow is bare.' : 'The garment comes off.'
  return persist({
    ...state,
    equipped,
    flash,
    updatedAt: Date.now(),
  })
}

export { HUBS, DOORS, check, clamp, travelGate, canScavenge, canSkim }

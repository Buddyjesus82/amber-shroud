import { HUB_MAPS } from './content/maps'
import { DOORS, HUBS, ITEMS, getScene, hasScene, resolveBody } from './content'
import { applyDelta, check, clamp } from './logic'
import {
  aimlessRunReply,
  hungerCommandEffect,
  HUNGER_BLOCKED,
  hungerBlockedFor,
  isHungerCommand,
  isRimDepartBeat,
  isRimDepartCommand,
  RIM_HUNGER_OPEN,
  RIM_NOWHERE,
} from './hunger'
import { brandReply } from './brand'
import { GLOBAL_INTENTS, matchChoiceText, matchIntent, scoreChoiceText, STRONG_BUTTON } from './intent'
import { consumeAsk, NONE_TO_USE } from './consume'
import { helpText } from './help'
import { helpRoute, HELP_HINT, HELP_TOPICS, topicText } from './helpTopics'
import { isBayScene } from './content/bayHands'
import { classifyLook, directedLookFlash, pressureLookFlash, roomLookEffect } from './look'
import { matchCompass, travelGate } from './map'
import {
  atGuardStation,
  atKaelenInvoice,
  atTheWire,
  campJobOpen,
  FENCE_HOLE_BACK,
  wantsFenceHoleBack,
  TAKE_INSIDE_JOB,
  bayLookout,
  HEAR_PLAN,
  planHeard,
  campHeard,
  ventPatrolInPlace,
  wantsCampSabotage,
  wantsDoSabotage,
} from './campJob'
import { markMetOnLeave, matchPersonQuery, personAtScene } from './people'
import { downedNote, wakeEffect } from './downed'
import { markFirstDrop } from './firstDrop'
import { amberFindSign, downedSign, lowHealthSign, sandTouchReply } from './sandSign'
import { isPressureOverlay, isSybellaOverlay, pressureAppend, pressureChoices, pressureVerb, spineGround, spineHunterKindAt, straysHeard } from './hunter'
import { bareFightIsRoad, offButton } from './verbs'
import { roadHunterKind } from './roadHunt'
import { noticeFaction, noticeGround, noticeLine, SCAVENGE_NOTICE_MAX, SCAVENGE_NOTICE_STEP } from './noticeHeat'
import {
  canEncounter,
  dismissEncounter,
  encounterCard,
  encounterChoices,
  encounterGround,
  hubDanger,
  FIGHT_RESET,
  fightStartFlags,
  ENCOUNTER_FLAGS,
  HEALTH_MAX,
  isEncounterResult,
  pickEncounterKind,
  resolveEncounter,
  wantsEncounterDeal,
  wantsEncounterFeint,
  wantsEncounterFight,
  wantsEncounterGuard,
  wantsEncounterPull,
  wantsEncounterRun,
  wantsEncounterTrick,
  wantsEncounterHide,
  wantsEncounterSkip,
  foeName,
  sneakSpotted,
  beginEncounter,
  ruseSeen,
  RUSE_FIGHT_LINE,
  RUSE_HEAT_LINE,
  type EncounterKind,
} from './encounter'
import { talkFallback, talkIntentsFor } from './talk'
import { answerAsk, answerLate, hintLine, readAsk, readLateAsk, sceneVoice, voiceOnScreen } from './politeAsk'
import { pickLine } from './voices'
import { applyScavenge, canScavenge, canSkim, skimHeat, skimLocked } from './scavenge'
import { writeSave } from './save'
import { bagCap, bagCount, bagFree, bagLoad, bagStacks, bagUnits, disguiseActive, fitBag, gearLookLine, heldNames, heldOf, KNOT_STRAYS_NOTE, KNOT_TIE_LOCKED, knotWorn, SCAV_PACK_LOCKED, SCAV_PACK_RECIPE, SLOT_LABEL, slotsFor, takeHeld, wornCount } from './kit'
import { DISGUISE_SOFTEN_NOTE, disguiseArrival, softenCartel } from './disguise'
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
/**
 * Kaelen walks every door's roads once you are out of the opening.
 * He stops after `gap` unhurried actions (not mid-hunt, not mid-fight), counted, not tick-gated,
 * so a walk that skips ticks cannot skip him.
 */
export const KAELEN_APPEARANCE = { quietScenes: 2, gap: 7 } as const

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
  'thresh:crucible-rig',
  'thresh:crucible-stairs',
  'thresh:court-guard',
  'thresh:cell',
  'thresh:shrine',
  'crisis:camp',
] as const

/** His road rumor (the same line as his Maw ask in his pack). */
const KAELEN_ROAD_RUMOR =
  '"Kallik. Long dead. Buried a haul in the Red Maw and carved a nine-tooth gear on the second rib from the jaw. Blind picks waste you. The mark, the scratch, and this rumor narrow it."'
/** The short end-of-chapter screen on the first arrival at the Maw Rim. */
export const CHAPTER_ONE_END = 'ch1:end'

/** Once you have heard Kallik's rumor, he does not repeat it. */
export const KAELEN_NO_NEW_RUMOR = '"Nothing new on the road. You already have Kallik. The rib is where I said."'

/** Trade screens: no rolls while you are in one (Kaelen, Jodi, Korvan, Jaxson's stall, every shop and rumor counter). */
const TRADE_SCENES = new Set(['roam:kaelen', 'camp:kaelen', 'camp:kaelen-rumors', 'camp:relic', 'thresh:kaelen', 'thresh:kaelen-rumors', 'spine:jodi', 'spine:korvan', 'camp:lean'])
export function isVendorScene(sceneId: string): boolean {
  return TRADE_SCENES.has(sceneId) || !!vendorFor(sceneId) || isRumorCounter(sceneId)
}

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
  const next = markFirstDrop(state)
  writeSave(next)
  return next
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
  if (state.flags.kaelenIntroNow && state.sceneId.includes('kaelen')) return `${sceneProse(state)}\n\n${KAELEN_INTRO}`
  return sceneProse(state)
}

/** The first time you meet him, he says his name. Until then every line calls him "the trader". */
export { KAELEN_INTRO } from './roads'
import { KAELEN_INTRO, ROADS } from './roads'

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

function seekerHuntGround(state: GameState): boolean {
  // The Vessel's own ground: the Outer Threshold. Sybella at the Maw keeps her own pace.
  return state.door === 'vessel' && (state.hubId === 'threshold' || state.sceneId.startsWith('thresh:'))
}

function huntHeat(state: GameState): number {
  // Spine hub and the Outcast road: the Strays are the ones looking.
  if (spineGround(state)) return state.heat.strays
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
  { heatMin: 1, heatMax: 3, quiet: 6 },
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

function hunterScene(state: GameState, walked = true): string | null {
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
  const heat = huntHeat(state)
  let gap = huntGap(heat)
  // Vessel ground answers sooner: from Seeker Heat 2 the Threshold hunts at the 4-5 Heat pace.
  if (gap != null && heat >= 2 && seekerHuntGround(state)) gap = Math.min(gap, 6)
  if (gap == null || quiet < gap) return null
  if (state.hubId === 'redmaw' || state.sceneId.startsWith('maw:')) {
    if (state.sceneId === 'maw:sybella' || state.sceneId === 'maw:sybella-shadow' || state.sceneId === 'maw:smoke') {
      return null
    }
    // At top Heat her shadow comes on a walk, never on a look, a bench, or a wait: one walk in two (seeded).
    if (heat >= 8) {
      if (!walked) return null
      let h = (state.ticks * 2654435761 + 97) >>> 0
      for (const ch of state.sceneId) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
      if (((h ^ (h >>> 15)) >>> 0) % 2 === 1) return null
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
  // Spine wakes when the Strays have a reason to look (theft, debt, a run past Drennick), or a long linger.
  if (id === 'spine:hunter' && !straysHeard(state) && state.pressure < 6) return null
  return id
}

/**
 * Strays noticed you. Mirrors markCartelNotice: any Stray-raising act on Spine ground
 * (well skim, Silas's mercy or tab, a theft, a run past Drennick) gives the Spine hunt a reason.
 */
function markStrayNotice(prev: GameState, next: GameState, fx: Effect): GameState {
  if (next.flags.strayNotice) return next
  if (!spineGround(prev) && !spineGround(next)) return next
  const raised = (fx.heat?.strays ?? 0) > 0 || !!fx.flag?.skimmed || !!fx.flag?.strayNotice
  if (!raised) return next
  return { ...next, flags: { ...next.flags, strayNotice: true } }
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
  const offLimits = next.sceneId === 'camp:guard' && prev.sceneId !== 'camp:guard' && !next.flags.jaxsonInside && !disguiseActive(next)
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

/** Road and Rim rescues: they only come for an empty bag, and they are not free. */
const RESCUE_CRISES = new Set(['crisis:dunes', 'crisis:maw', 'crisis:camp', 'crisis:thresh'])
export const AUTO_DRINK_LINE = 'The glass runs dry. Your hand finds a Drop before your knees go. Sap +3.'
export const RESCUE_GLINT_LINE = 'The rescue is not free. A Glint is gone.'
export const RESCUE_SCRAP_LINE = 'The rescue is not free. Scrap -1.'

/** Flags that only last while you stay on one screen. */
const VISIT_FLAGS = ['restedHere', 'kaelenDropsHere']

export const DOWN_SCRAP_LINE = (n: number) => `You wake lighter. Scrap -${n}.`
export const DOWN_DROP_LINE = 'You wake lighter. A Drop is gone.'

function downLoss(state: GameState): { item: ItemId; n: number; line: string } | null {
  const half = Math.floor((state.items.scrap ?? 0) / 2)
  if (half > 0) return { item: 'scrap', n: half, line: DOWN_SCRAP_LINE(half) }
  if ((state.items.vial_drop ?? 0) > 0) return { item: 'vial_drop', n: 1, line: DOWN_DROP_LINE }
  return null
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
  // Ossa's Knot worn: Strays who know her go easier. Every Stray Heat rise is one lighter.
  if (knotWorn(state) && (fx.heat?.strays ?? 0) > 0) {
    fx = {
      ...fx,
      heat: { ...fx.heat, strays: (fx.heat?.strays ?? 0) - 1 },
      flash: typeof fx.flash === 'string' ? `${fx.flash} ${KNOT_STRAYS_NOTE}` : fx.flash,
    }
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
  // Trading is roll-free: opening a vendor and every buy, sell, ask, or leave inside one adds no pressure,
  // and starts no hunt, fight, or Kaelen tick (like self-care). Authored Heat (a theft) still lands.
  const vendorBeat = isVendorScene(state.sceneId) || (!!fx.goto && isVendorScene(fx.goto))
  if (vendorBeat && fx.pressure) {
    fx = { ...fx }
    delete fx.pressure
  }
  // A second Approach rescue still pours the Drop, but the Heat only rose the first time.
  if (state.sceneId === 'crisis:maw' && state.flags.mawRescued && fx.heat) {
    fx = { ...fx, heat: undefined, flash: fx.flash?.replace(/ (Cartel|Seeker|Stray) Heat rises\./, '') }
  }
  const softened = softenCartel(state, fx)
  if (softened !== fx) fx = { ...softened, flash: fx.flash ? `${fx.flash} ${DISGUISE_SOFTEN_NOTE}` : DISGUISE_SOFTEN_NOTE }
  let dest = resolveDest(state, fx)
  let next = applyDelta(state, fx)
  next.flash = fx.flash
  // Every escape out of Camp-04 plays the storm beat first; the route's own line waits for the Hunger.
  const campEscape =
    !!fx.startChapter && dest === 'ch1:leave' && (state.hubId === 'camp04' || state.sceneId.startsWith('camp:'))
  if (campEscape) {
    dest = 'ch1:storm'
    next.flags = { ...next.flags, stormFlash: fx.flash ?? '' }
    next.flash = undefined
  } else if (state.sceneId === 'ch1:storm' && dest === 'ch1:leave') {
    const held = state.flags.stormFlash
    const flags = { ...next.flags }
    delete flags.stormFlash
    next.flags = flags
    if (typeof held === 'string' && held) next.flash = [held, next.flash].filter(Boolean).join(' ')
  }
  if (fx.bagRetry) next = takeHeld(next)
  if (fx.bagLeave) {
    const flags = { ...next.flags }
    delete flags.bagHeld
    next.flags = flags
  }
  if (fx.resolveEncounter) {
    const result = resolveEncounter(state, fx.resolveEncounter, { cloak: fx.resolveEncounter === 'skip' && typeof fx.flag?.cloakSkipArea === 'string' })
    next = applyDelta(next, softenCartel(state, result.fx))
    if (result.fx.flag?.encounterGrip && !state.flags.encounterGrip) {
      next.flags = { ...next.flags, sandGripSeen: true, sandSignAt: next.ticks }
    }
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
    // A Strider readied at the paddock carries the first stretch of the Hunger.
    if (fx.startChapter === 'cache-run' && state.flags.striderReady && !state.flags.striderSpent) {
      next = applyDelta(next, { sap: STRIDER_READY_SAP, flag: { striderSpent: true } })
      next.flash = [next.flash, STRIDER_READY_FLASH].filter(Boolean).join(' ')
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
    if (state.sceneId === 'maw:rim' && dest !== 'maw:rim') next.flags = { ...next.flags, rimRoadSeen: true }
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

  // First time at the Maw Rim, in any door: Chapter One ends here. Saves already past the Rim skip it.
  if (
    next.sceneId === 'maw:rim' &&
    state.sceneId !== 'maw:rim' &&
    !next.flags.chapter1EndSeen &&
    !next.flags.rimRoadSeen &&
    !sapCollapsed
  ) {
    next.sceneId = CHAPTER_ONE_END
    next.flags = { ...next.flags, chapter1EndSeen: true }
  }

  const arrived = getScene(next.sceneId)
  if (arrived.hubId) next.hubId = arrived.hubId
  if (arrived.chapterId) next.chapterId = arrived.chapterId

  const rescueAt = sapCollapsed && !skipCrisis && arrived.kind !== 'crisis' ? pickCrisis(next) : null
  const selfDrink = !!rescueAt && RESCUE_CRISES.has(rescueAt) && (next.items.vial_drop ?? 0) > 0
  if (selfDrink) {
    // Carrying a Drop: you drink it yourself before anyone has to find you.
    next.items = { ...next.items, vial_drop: (next.items.vial_drop ?? 0) - 1, vial_empty: (next.items.vial_empty ?? 0) + 1 }
    next.sap = 3
    next.flash = AUTO_DRINK_LINE
  } else if (sapCollapsed && !skipCrisis && arrived.kind !== 'crisis') {
    next.sap = 0
    next.flags = { ...next.flags, crisisFrom: state.sceneId }
    // The rescue tells it now. A result line from the act that emptied you (a skim, a walk) does not ride along.
    next.flash = undefined
    next.sceneId = pickCrisis(next)
    const c = getScene(next.sceneId)
    if (c.hubId) next.hubId = c.hubId
    if (RESCUE_CRISES.has(next.sceneId)) {
      const pay = (next.items.glints ?? 0) > 0 ? 'glints' : (next.items.scrap ?? 0) > 0 ? 'scrap' : null
      if (pay) {
        next.items = { ...next.items, [pay]: (next.items[pay] ?? 0) - 1 }
        next.flash = pay === 'glints' ? RESCUE_GLINT_LINE : RESCUE_SCRAP_LINE
      }
    }
  }

  if (getScene(next.sceneId).kind === 'crisis' && next.flags.encounterHere) {
    const flags = { ...next.flags }
    const short = typeof flags.encounterFlash === 'string' ? flags.encounterFlash : next.flash
    for (const k of ENCOUNTER_FLAGS) delete flags[k]
    next.flags = flags
    if (short) next.flash = short
  }

  // A failed sneak or a road ambush opens a real fight on the ground you reached.
  if ((fx.sneak || fx.ambush) && getScene(next.sceneId).kind !== 'crisis' && !next.flags.encounterHere && !next.flags.downed && (next.health ?? 1) > 0) {
    if (fx.ambush) {
      next.flags = { ...next.flags, ...fightStartFlags(next, fx.ambush.kind as EncounterKind), encounterNoSkip: true }
      next.flash = fx.ambush.line
    } else if (fx.sneak && sneakSpotted(next, fx.sneak.odds)) {
      next.flags = { ...next.flags, ...fightStartFlags(next, fx.sneak.kind as EncounterKind) }
      next.flash = fx.sneak.spotted
    }
  }
  // Threshold lies at high Seeker Heat: seen through.
  if (fx.ruse && !next.flags.encounterHere && !next.flags.downed && (next.health ?? 1) > 0 && getScene(next.sceneId).kind !== 'crisis' && ruseSeen(state)) {
    // A seen-through dais lie fooled nobody: no 'wrong corridor' line later.
    if (next.flags.crucibleGuardFooled && fx.flag?.crucibleGuardFooled) {
      next.flags = { ...next.flags }
      delete next.flags.crucibleGuardFooled
    }
    if ((state.heat.seekers ?? 0) >= 8) {
      next.flags = { ...next.flags, ...fightStartFlags(next, 'courtguard'), encounterHp: 3 }
      next.flash = RUSE_FIGHT_LINE
    } else {
      next.heat = { ...next.heat, seekers: Math.min(8, (next.heat.seekers ?? 0) + 1) }
      next.flash = next.flash ? `${next.flash}\n\n${RUSE_HEAT_LINE}` : RUSE_HEAT_LINE
    }
  }
  next = markCartelNotice(state, next, fx)
  next = markStrayNotice(state, next, fx)
  if (next.sceneId === 'camp:sabotage' && state.sceneId !== 'camp:sabotage' && !next.flags.guardDown) {
    next.flags = { ...next.flags, ventPatrol: ventPatrolInPlace(next) }
  }

  // The Crucible wake and rig are one beat before the Court: they do not count toward the first hunt.
  const crucibleBeat = (state.sceneId === 'open:vessel' && next.sceneId === 'thresh:crucible-rig') || (state.sceneId === 'thresh:crucible-rig' && next.sceneId === 'thresh:crucible-stairs') || (state.sceneId === 'thresh:court-guard' && next.sceneId === 'thresh:court')
  const lingered = !fx.still && !vendorBeat && !crucibleBeat && ((fx.ticks ?? 0) > 0 || (fx.pressure ?? 0) > 0 || !!dest)
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
  // A word or a deal with the person in front of you resolves before anything hunts you: a talk beat never
  // opens an interrupting hunt or road fight. The next beat on the new ground can.
  // Stepping off the End of Chapter One screen counts the same: nothing jumps you on the way back to the Rim.
  const talkBeat = getScene(state.sceneId).kind === 'talk' || state.sceneId === CHAPTER_ONE_END
  const interrupt = lingered && !clearingHunt && !talkBeat ? hunterScene(next, !!dest && dest !== state.sceneId) : null
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
      ...(interrupt === 'spine:hunter'
        ? {
            spineHunterKind: spineHunterKindAt(next.heat.strays),
            metCarapace: spineHunterKindAt(next.heat.strays) === 'carapace' ? true : next.flags.metCarapace,
          }
        : {}),
    }
  }

  const kindHere = getScene(next.sceneId).kind
  const place = kindHere === 'place' || kindHere === 'talk' || kindHere === 'story'
  if (next.sceneId === 'camp:kaelen' || next.sceneId === 'thresh:kaelen') {
    const hub = next.sceneId.startsWith('camp') ? 'camp04' : 'threshold'
    next.flags = { ...next.flags, kaelenHub: hub }
  }
  // You hear his name when you meet him. Before that he is "the trader".
  if (next.flags.kaelenIntroNow && state.flags.kaelenIntroNow) {
    const flags = { ...next.flags }
    delete flags.kaelenIntroNow
    next.flags = flags
  }
  // First meeting on any door: he says his name, even when the step that brought you set kaelenKnown.
  if ((next.sceneId === 'camp:kaelen' || next.sceneId === 'thresh:kaelen' || next.sceneId === 'roam:kaelen') && !state.flags.kaelenKnown && !state.flags.kaelenIntroSeen) {
    next.flags = { ...next.flags, kaelenKnown: true, kaelenIntroNow: true, kaelenIntroSeen: true }
  }
  // He stops at one roadside spot. Walk on without visiting and he is gone; he does not follow you scene to scene.
  // A new chapter (the Cache Run) leaves his stop behind too.
  if (next.flags.kaelenPassing && ((next.sceneId !== state.sceneId && next.sceneId !== 'roam:kaelen' && state.flags.kaelenPassing) || next.chapterId !== state.chapterId || next.chapterId === 'cache-run')) {
    const flags = { ...next.flags }
    delete flags.kaelenPassing
    next.flags = flags
  }
  if (
    lingered &&
    place &&
    next.chapterId !== 'cache-run' &&
    !kaelenHeld(next.sceneId) &&
    !next.flags.kaelenPassing &&
    !next.flags.hunterHere &&
    !next.flags.encounterHere &&
    !next.sceneId.includes('kaelen') &&
    !next.flags.downed &&
    (next.health ?? 1) > 0
  ) {
    const gap = Number(next.flags.kaelenGap ?? 0) + 1
    if (gap >= KAELEN_APPEARANCE.gap && Number(next.flags.huntQuiet ?? 0) >= KAELEN_APPEARANCE.quietScenes) {
      next.flags = { ...next.flags, kaelenPassing: true, kaelenGap: 0, kaelenHub: next.hubId ?? next.flags.kaelenHub }
    } else {
      next.flags = { ...next.flags, kaelenGap: gap }
    }
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
    !talkBeat &&
    !keepBayLine &&
    !fightBeat &&
    !next.flags.hunterHere &&
    !clearingHunt &&
    encounterGround(next) &&
    canEncounter(next, { traveled, firstWalk })
  ) {
    const kind = pickEncounterKind(next)
    next.flash = undefined
    const fresh = { ...next.flags }
    for (const k of FIGHT_RESET) delete fresh[k]
    next.flags = { ...fresh, ...fightStartFlags(next, kind), roadFightSeen: true }
  } else if (firstWalk) {
    next.flags = { ...next.flags, roadFightSeen: true }
  }
  // Road hunters: the faction behind you sends someone down the road. One per run; ambushes ignore Health.
  const roadHunt = roadHunterKind(state, next)
  if (roadHunt) {
    next.flags = { ...next.flags, ...fightStartFlags(next, roadHunt.kind), encounterNoSkip: true, roadHuntDone: true, roadFightSeen: true }
    next.flash = roadHunt.line
  }
  // Heat comes due: count fight-free danger scenes; any fight or hunt clears the count.
  if (next.flags.encounterHere || next.flags.hunterHere) {
    if (next.flags.fightQuiet) next.flags = { ...next.flags, fightQuiet: 0 }
  } else if (roamBeat && !talkBeat && encounterGround(next) && hubDanger(next) >= 1) {
    next.flags = { ...next.flags, fightQuiet: Number(next.flags.fightQuiet ?? 0) + 1 }
  }

  if (arrived.onEnter && next.sceneId === arrived.id && state.sceneId !== arrived.id && !next.flags.encounterHere && !next.flags.hunterHere) {
    next = applyDelta(next, arrived.onEnter)
  }

  // Outcast: the sand moves when he is hurt. Once, during a fight that leaves him at Health 1.
  const low = lowHealthSign(state, next)
  if (low && typeof next.flags.encounterClash === 'string' && next.flags.encounterClash) {
    next.flags = { ...next.flags, encounterClash: `${next.flags.encounterClash}\n\n${low}`, sandLowSeen: true, sandSignAt: next.ticks }
  }

  if ((state.health ?? 1) > 0 && (next.health ?? 1) <= 0 && !state.flags.downed) {
    let note = downedNote({ ...state, sceneId: next.sceneId, flags: next.flags, hubId: next.hubId })
    const kind = next.flags.encounterKind
    const sign = downedSign({ ...next, health: 0 })
    if (sign) note = `${note}\n\n${sign}`
    // Going down costs: half your scrap, rounded down, or a Drop when that would be nothing.
    {
      // Any Down costs, even a stagger win that leaves you on the ground.
      const loss = downLoss(next)
      if (loss) {
        const had = next.items[loss.item] ?? 0
        const left = Math.max(0, had - loss.n)
        next = { ...next, items: { ...next.items, [loss.item]: left } }
        // The line names what actually left the bag.
        const line = loss.item === 'scrap' ? DOWN_SCRAP_LINE(had - left) : loss.line
        note = `${note}\n\n${line}`
        next.flags = { ...next.flags, downLost: line }
      }
    }
    const flags: FlagMap = { ...next.flags, downed: true, downedNote: note, ...(sign ? { sandDownSeen: true, sandSignAt: next.ticks } : {}) }
    // The fight card is cleared below; the wake still needs to know who put you down.
    if (typeof kind === 'string' && kind) flags.downedKind = kind
    for (const k of ENCOUNTER_FLAGS) delete flags[k]
    next.flags = flags
    next.health = 0
    next.flash = undefined
  }

  next = disguiseArrival(state, next)
  // The Heard: footer is about this ground only. A new scene starts it empty.
  if (next.sceneId !== state.sceneId && next.recentVerbs?.length) next.recentVerbs = []
  // Walking off leaves anything the full bag could not take.
  if (next.sceneId !== state.sceneId && next.flags.bagHeld && !fx.bagRetry) {
    const flags = { ...next.flags }
    delete flags.bagHeld
    next.flags = flags
  }
  // The toll fight settles the toll only when it ends without running or going down.
  if (state.flags.mawTollFight && state.flags.encounterHere && !next.flags.encounterHere) {
    const flags = { ...next.flags }
    if (!state.flags.encounterFled && !next.flags.downed && (next.health ?? 1) > 0) flags.mawTollDone = true
    delete flags.mawTollFight
    next.flags = flags
  }
  if (next.flags.encounterFled && !next.flags.encounterHere) {
    const flags = { ...next.flags }
    delete flags.encounterFled
    next.flags = flags
  }
  // Any Court Guard fight ends the Court payoffs (called off, sent down the wrong corridor).
  if (next.flags.encounterHere && next.flags.encounterKind === 'courtguard' && !next.flags.courtGuardFought) {
    next.flags = { ...next.flags, courtGuardFought: true }
  }
  // The Maw toll is once a visit: leaving the Maw resets it.
  if (next.flags.mawTollDone && next.hubId !== 'redmaw') {
    const flags = { ...next.flags }
    delete flags.mawTollDone
    next.flags = flags
  }
  // Scene steps: a walking count for cooldowns (Haul parts).
  if (next.sceneId !== state.sceneId) next.flags = { ...next.flags, sceneSteps: Number(next.flags.sceneSteps ?? 0) + 1 }
  // Once-a-visit flags clear when you walk off.
  if (next.sceneId !== state.sceneId && VISIT_FLAGS.some((k) => k in next.flags)) {
    const flags = { ...next.flags }
    for (const k of VISIT_FLAGS) delete flags[k]
    next.flags = flags
  }
  next = fitBag(state, next)

  next.updatedAt = Date.now()
  return persist(next)
}

/** Drop one of something from the bag. Worn pieces come off in Gear first. */
export function dropItem(state: GameState, id: ItemId): GameState {
  const def = ITEMS[id]
  if (!def || !(state.items[id] ?? 0)) return persist({ ...state, flash: 'You do not have that to drop.' })
  if ((state.items[id] ?? 0) <= wornCount(state, id)) {
    return persist({ ...state, flash: `${def.name} is on your body. Unequip it before you drop it.` })
  }
  return applyEffect(state, { remove: { [id]: 1 }, bagRetry: !!state.flags.bagHeld, flash: `You drop the ${def.name}.` })
}

/** Drop a whole stack (it frees its one bag slot). Worn pieces never stack. */
export function dropStack(state: GameState, id: ItemId): GameState {
  const def = ITEMS[id]
  const n = bagCount(state, id)
  if (!def || !n) return persist({ ...state, flash: 'You do not have that to drop.' })
  if (!bagStacks(id) || n === 1) return dropItem(state, id)
  return applyEffect(state, { remove: { [id]: n }, bagRetry: !!state.flags.bagHeld, flash: `You drop the ${def.name} ×${n}. One bag slot frees up.` })
}

/** Craft: stitch a Scav Pack from 3 scrap and 1 Sinew Cord. Carries 14. */
export function craftScavPack(state: GameState): GameState {
  if ((state.items.scav_pack ?? 0) > 0) return persist({ ...state, flash: 'You already have a Scav Pack.' })
  if (!canCraftScavPack(state)) return persist({ ...state, flash: `${SCAV_PACK_LOCKED}.` })
  return applyEffect(state, {
    remove: { scrap: SCAV_PACK_RECIPE.scrap, sinew_cord: SCAV_PACK_RECIPE.sinew_cord },
    add: { scav_pack: 1 },
    ticks: 1,
    flash: 'You bend the scrap into a frame and stitch canvas over it with the cord. Scav Pack: your bag now has 14 slots.',
  })
}

/** Tie Ossa's Knot through a Head Wrap: one head piece with both. Worn stays worn. */
export function canTieKnot(state: GameState): boolean {
  return (state.items.ossa_token ?? 0) > 0 && (state.items.head_wrap ?? 0) > 0
}

export function tieKnot(state: GameState): GameState {
  if (!canTieKnot(state)) return persist({ ...state, flash: `${KNOT_TIE_LOCKED}.` })
  const head = state.equipped?.head
  const wasWorn = head === 'ossa_token' || head === 'head_wrap'
  const equipped = { ...state.equipped }
  if (wasWorn) delete equipped.head
  const next = applyEffect(
    { ...state, equipped },
    {
      remove: { ossa_token: 1, head_wrap: 1 },
      add: { knotted_wrap: 1 },
      ticks: 1,
      flash: `You tie Ossa's Knot through the Head Wrap. Knotted Head Wrap: Shell 1, and everything the Knot does.${wasWorn ? ' You keep it on.' : ' Wear it in Gear.'}`,
    },
  )
  if (!wasWorn) return next
  return persist({ ...next, equipped: { ...next.equipped, head: 'knotted_wrap' } })
}

export function canCraftScavPack(state: GameState): boolean {
  return !(state.items.scav_pack ?? 0) && (state.items.scrap ?? 0) >= SCAV_PACK_RECIPE.scrap && (state.items.sinew_cord ?? 0) >= SCAV_PACK_RECIPE.sinew_cord
}

export const TOO_DRY_TO_WALK = 'You are too dry to walk that far. Drink a Drop, rest, or scavenge first.'

export function travelTo(state: GameState, sceneId: string): GameState {
  if (state.sceneId === sceneId) return state
  // The Bone Wash node on the Spine map is the road out: same as typing the road.
  if (sceneId === 'ch1:leave' && state.hubId && !state.chapterId) {
    const enabled = visibleChoices(state).filter((c) => isChoiceOn(state, c.enable))
    const fx = hungerCommandEffect(state, enabled)
    if (fx) return applyEffect(state, fx)
    return persist({ ...state, flash: hungerBlockedFor(ROADS[state.door].name) })
  }
  const gate = travelGate(state, sceneId)
  if (!gate.ok) {
    return persist({ ...state, flash: gate.reason })
  }
  if (gate.sap <= 0) {
    return applyEffect(state, { goto: sceneId })
  }
  // After one rescue on the Approach, a walk will not drain you into another.
  if (state.hubId === 'redmaw' && state.flags.mawRescued && state.sap <= gate.sap) {
    return persist({ ...state, flash: TOO_DRY_TO_WALK })
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

/** Sap the readied runner saves on the first stretch of the Hunger. */
export const STRIDER_READY_SAP = 2
export const STRIDER_READY_FLASH = 'The readied runner takes the first stretch. Two Sap you did not spend.'

export function drinkDrop(state: GameState): GameState {
  if (!(state.items.vial_drop ?? 0)) {
    return persist({ ...state, flash: NONE_TO_USE.vial_drop })
  }
  return applyEffect(state, {
    sap: 3,
    remove: { vial_drop: 1 },
    add: { vial_empty: 1 },
    ticks: 1,
    still: true,
    flash: 'The Drop hits like a nail of honey and heat. The vial is a dry throat again.',
  })
}

export const SALVE_FULL_HEALTH = 'You are not hurt. The salve stays in the tin.'

/** Same effect as the Gear sheet's Bind button. */
export const BIND_SALVE: Effect = {
  remove: { salve: 1 },
  health: 3,
  ticks: 1,
  still: true,
  flash: 'Resin salve on the cut. Health comes back a few pips. The tin is lighter.',
}

export function bindSalve(state: GameState): GameState {
  if (!(state.items.salve ?? 0)) {
    return persist({ ...state, flash: NONE_TO_USE.salve })
  }
  if ((state.health ?? HEALTH_MAX) >= (state.healthMax ?? HEALTH_MAX)) {
    return persist({ ...state, flash: SALVE_FULL_HEALTH })
  }
  return applyEffect(state, BIND_SALVE)
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

const NOTICE_OPTS = { vendor: (id: string) => isVendorScene(id), kind: (id: string) => getScene(id).kind as string }

export function noticeOn(state: GameState): boolean {
  return noticeGround(state, NOTICE_OPTS)
}

/** Searching the same area again and again: a growing chance the ground's faction notices. Resets when you leave. */
function scavengeNotice(before: GameState, next: GameState): GameState {
  const count = before.flags.scavArea === before.sceneId ? Number(before.flags.scavCount ?? 0) + 1 : 1
  next = { ...next, flags: { ...next.flags, scavArea: before.sceneId, scavCount: count } }
  if (!noticeOn(before)) return next
  const chance = Math.min(SCAVENGE_NOTICE_MAX, SCAVENGE_NOTICE_STEP * count)
  let h = (before.ticks * 2654435761 + count * 40503 + 977) >>> 0
  for (const ch of before.sceneId) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  h ^= h >>> 15
  if (h % 100 >= chance) return next
  const f = noticeFaction(before)
  const line = noticeLine(before, 'scavenge')
  return { ...next, heat: { ...next.heat, [f]: Math.min(8, (next.heat[f] ?? 0) + 1) }, flash: next.flash ? `${next.flash}\n\n${line}` : line }
}

/**
 * Rushing or stalling, timed by the Play screen (visible, online time only) and rolled there.
 * At most +1 per scene from timing; never off danger ground.
 */
export function timingNotice(state: GameState, kind: 'rush' | 'stall'): GameState {
  if (!noticeOn(state) || state.flags.timingNoticeAt === state.sceneId) return state
  const f = noticeFaction(state)
  const line = noticeLine(state, kind)
  return persist({
    ...state,
    heat: { ...state.heat, [f]: Math.min(8, (state.heat[f] ?? 0) + 1) },
    flags: { ...state.flags, timingNoticeAt: state.sceneId },
    flash: state.flash ? `${state.flash}\n\n${line}` : line,
    updatedAt: Date.now(),
  })
}

export function scavenge(state: GameState): GameState {
  // applyDelta only — never applyEffect, never goto, never hunter/crisis relocate.
  const pinned = { sceneId: state.sceneId, hubId: state.hubId, chapterId: state.chapterId }
  let next = fitBag(state, applyScavenge(state))
  const warm = amberFindSign(state, (next.items.glints ?? 0) > (state.items.glints ?? 0))
  if (warm) next = { ...next, flash: `${next.flash ?? ''} ${warm}`.trim(), flags: { ...next.flags, amberWarmSeen: true, sandSignAt: next.ticks } }
  next = scavengeNotice(state, next)
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
  const locked = skimLocked(state)
  if (locked) {
    return persist({ ...state, flash: locked, updatedAt: Date.now() })
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

/** A visible, enabled button the typed line clearly names (exact label/id or label substring). */
function strongButton(state: GameState, text: string): Choice | null {
  const enabledNow = visibleChoices(state).filter((c) => isChoiceOn(state, c.enable))
  const named = scoreChoiceText(text, enabledNow)
  return named && named.score >= STRONG_BUTTON ? named.choice : null
}

function tryCampSabotageJob(state: GameState, text: string): GameState | null {
  if (!campJobOpen(state) || !wantsCampSabotage(text)) return null
  if (sceneOf(state).kind === 'crisis') return null
  // A visible button that names this line wins (e.g. "Jaxson's inside job is still open" walks to him).
  const named = strongButton(state, text)
  if (named) return withVerb(applyEffect(state, named.effects), named.id)
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
  if (!state.flags.jaxsonInside && !planHeard(state)) {
    // You cannot take (or run) a plan you have not heard. With Jaxson, he explains it; elsewhere, a nudge.
    const withJaxson = ['camp:cages', 'camp:lean', 'camp:jaxson', 'camp:jaxson-drop'].includes(state.sceneId)
    if (withJaxson) {
      return withVerb(
        applyEffect(state, { ...HEAR_PLAN, flash: '"Easy," Jaxson says. "You have not heard the plan yet. Here it is."' }),
        'plan',
      )
    }
    return withVerb(
      persist({
        ...state,
        flash: 'You have no plan for the guard station yet. Jaxson, in the bunk next to yours in the pens, says he has one.',
        updatedAt: Date.now(),
      }),
      'plan',
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

/** Phone keyboards: smart quotes, ellipsis, wrapping quotes, stray spaces. Read them as plain text. */
export function phoneText(text: string): string {
  return text
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/…/g, '...')
    .replace(/\u00a0/g, ' ')
    .replace(/^\s*["']+|["']+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const BARE_FIGHT = /^(?:i\s+)?(?:attack|fight|kill|stab|hit|punch|strike)(?:\s+(?:something|someone|anyone|anything|now|back))?$/
export const NOTHING_TO_FIGHT = 'Nothing here to fight.'
export const SHADOW_NO_FIGHT = 'She is a shadow, not a body. If you mean it, swing at the shadow.'

export function interpret(state: GameState, raw: string): GameState {
  const text = phoneText(raw)
  const scene = sceneOf(state)
  const bare = text.trim().toLowerCase()
  const said = bare === 'l' || /^l\s/.test(bare) ? bare.replace(/^l\b/, 'look') : bare
  // Sybella's shadow is not a body: a bare typed fight does not swing at it. The button does.
  if (isSybellaOverlay(state) && BARE_FIGHT.test(said)) {
    return withVerb(persist({ ...state, flash: SHADOW_NO_FIGHT, updatedAt: Date.now() }), 'fight')
  }
  // A bare typed 'fight' names no target: no hunt, no threat to whoever stands here.
  if (
    !state.flags.encounterHere &&
    !isPressureOverlay(state) &&
    BARE_FIGHT.test(said) &&
    !bareFightIsRoad(scene) &&
    !visibleChoices(state).some((c) => /\b(fight|attack|scrap)\b/i.test(c.label) && isChoiceOn(state, c.enable))
  ) {
    return withVerb(persist({ ...state, flash: NOTHING_TO_FIGHT, updatedAt: Date.now() }), 'fight')
  }
  // Typed rest is the Rest row (or the Wreck bench), with its cost and its once-a-scene lock.
  if (/^(?:rest|sit|sleep)(?:\s+(?:again|here|a while|on the bench))?$/.test(said) && !state.flags.encounterHere && !isPressureOverlay(state)) {
    const row = visibleChoices(state).find((c) => c.id === 'rest' || c.id === 'bench')
    if (row) {
      if (isChoiceOn(state, row.enable)) return withVerb(applyEffect(state, row.effects), 'rest')
      return withVerb(persist({ ...state, flash: row.locked ?? REST_DONE_LOCK, updatedAt: Date.now() }), 'rest')
    }
  }
  // Typed "go to X" walks to a named place on this hub's map; never the aimless run.
  const goTo = /^(?:go|walk|head|travel|move|run|return)\s+(?:back\s+)?(?:to|toward|towards|into)\s+(?:the\s+)?(.+)$/.exec(said)
  if (goTo && state.hubId && !state.flags.encounterHere && !isPressureOverlay(state) && !(atTheWire(state) && wantsFenceHoleBack(text)) && !visibleChoices(state).some((c) => c.label.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() === said.replace(/[^a-z0-9 ]/g, '').trim())) {
    const want = goTo[1].replace(/[^a-z0-9' ]/g, '').trim()
    const nodes = HUB_MAPS[state.hubId]?.nodes ?? []
    const node =
      nodes.find((n) => [n.name, n.short, n.id].some((k) => k && k.toLowerCase() === want)) ??
      nodes.find((n) => [n.name, n.short].some((k) => k && k.length >= 3 && (want.includes(k.toLowerCase()) || k.toLowerCase().includes(want)) && want.length >= 3))
    if (node) {
      if (node.sceneId === state.sceneId) return persist({ ...state, flash: `You are already at ${node.name}.`, updatedAt: Date.now() })
      return travelTo(state, node.sceneId)
    }
  }
  // Kaelen passing: typed rumor or trade asks open his pack, roll-free, like the buttons.
  if (/\b(rumou?rs?|news|kaelen|trader|sifter|merchant)\b/.test(said)) {
    const row = visibleChoices(state).find((c) => c.id === (/\b(rumou?rs?|news|heard)\b/.test(said) ? 'kaelen-rumors' : 'kaelen-pass'))
    if (row) return applyEffect(state, row.effects)
  }
  if (bare === 'help' || bare === '?') {
    const labels = visibleChoices(state).map((c) => c.label)
    const face = isPressureOverlay(state)
      ? 'This interrupt is the whole ground. '
      : state.flags.encounterHere
        ? 'The fight is the whole ground. '
        : ''
    return withVerb(
      persist({
        ...state,
        flash: `${face}${helpText(state, labels)}\n\n${HELP_HINT}. Topics: ${HELP_TOPICS.map((t) => t.id).join(', ')}.`,
        updatedAt: Date.now(),
      }),
      'help',
    )
  }
  // help <topic> opens a card in the app; typed here it answers with the card text or the topic list.
  const asked = helpRoute(text)
  if (asked && asked.kind !== 'list') {
    const flash = asked.kind === 'topic' ? topicText(asked.topic) : asked.reply
    return withVerb(persist({ ...state, flash, updatedAt: Date.now() }), 'help')
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
  // Polite asks and plain questions: read the meaning before any verb guess can drink, buy, or steal.
  if (!state.flags.encounterHere && !isPressureOverlay(state)) {
    const ask = readAsk(text)
    if (ask?.kind === 'rewrite') return interpret(state, ask.text)
    if (ask) {
      const shown = visibleChoices(state)
      const ans = answerAsk(state, scene, ask, shown, (c) => isChoiceOn(state, c.enable), text)
      if (ans?.lookInstead) return interpret(state, 'look around')
      if (ans?.run) return withVerb(applyEffect(state, ans.run.effects), ans.verb)
      if (ans) return withVerb(persist({ ...state, flash: ans.flash, updatedAt: Date.now() }), ans.verb)
    }
  }

  // Using something you carry is inventory, not a shelf or a scene guess. Same result as the
  // on-screen Drink a Drop row and the Gear sheet's Drink / Bind buttons, on every screen.
  const consume = consumeAsk(text)
  if (consume) {
    const next = consume.item === 'salve' ? bindSalve(state) : drinkDrop(state)
    return withVerb(next, consume.verb)
  }

  // Outcast: the brand. Looking at it describes it; asking about it never gets the answer.
  const branded = brandReply(state, text)
  if (branded) return withVerb(persist({ ...state, flash: branded, updatedAt: Date.now() }), 'brand')

  // Outcast: hands, sand, amber. Plain sensory lines; the first of each is a sign, saved once.
  const touched = sandTouchReply(state, text)
  if (touched) {
    const flags = touched.flag ? { ...state.flags, ...touched.flag } : state.flags
    return withVerb(persist({ ...state, flags, flash: touched.flash, updatedAt: Date.now() }), 'look')
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

  // The Wire's way home is the fence-hole to the Pens. Same row on the Wire and the rumor counter.
  if (atTheWire(state) && !state.flags.encounterHere && !isPressureOverlay(state) && wantsFenceHoleBack(text)) {
    if (!isChoiceOn(state, FENCE_HOLE_BACK.enable)) {
      return withVerb(persist({ ...state, flash: `${FENCE_HOLE_BACK.locked}.`, updatedAt: Date.now() }), 'pens')
    }
    return withVerb(applyEffect(state, FENCE_HOLE_BACK.effects), 'pens')
  }

  if (state.flags.encounterHere) {
    if ((state.health ?? 1) <= 0 && wantsEncounterFight(text)) {
      return withVerb(persist({ ...state, flash: 'Too hurt to fight.', updatedAt: Date.now() }), 'fight')
    }
    if (isEncounterResult(state)) {
      return withVerb(applyEffect(state, dismissEncounter(state)), 'on')
    }
    // Typed moves pick the same row as the buttons, so locks and reasons match.
    const typedMove = wantsEncounterPull(text)
      ? 'enc-pull'
      : wantsEncounterDeal(text)
        ? 'enc-deal'
        : wantsEncounterGuard(text)
          ? 'enc-guard'
          : wantsEncounterFeint(text)
            ? 'enc-feint'
            : wantsEncounterTrick(text)
              ? 'enc-trick'
              : wantsEncounterRun(text) && state.flags.encounterRound
                ? 'enc-run'
                : null
    if (typedMove) {
      const row = visibleChoices(state).find((c) => c.id === typedMove)
      if (row) {
        if (!isChoiceOn(state, row.enable)) {
          return withVerb(persist({ ...state, flash: `${row.locked ?? 'Not now'}.`.replace(/\.\.$/, '.'), updatedAt: Date.now() }), 'fight')
        }
        return withVerb(applyEffect(state, row.effects), typedMove.replace('enc-', ''))
      }
    }
    if (wantsEncounterFight(text)) {
      return withVerb(applyEffect(state, { resolveEncounter: 'fight', ticks: 1 }), 'fight')
    }
    if (state.flags.encounterRound && (wantsEncounterHide(text) || wantsEncounterSkip(text))) {
      return withVerb(
        persist({ ...state, flash: 'The fight has started. Run, or keep fighting.', updatedAt: Date.now() }),
        'fight',
      )
    }
    if (wantsEncounterHide(text) || wantsEncounterSkip(text)) {
      // Typed skips pay the same as the buttons.
      const rows = visibleChoices(state)
      const order = wantsEncounterHide(text) ? ['enc-cloak', 'enc-skip'] : ['enc-skip', 'enc-cloak']
      const row = order.map((id) => rows.find((c) => c.id === id)).find((c) => c && isChoiceOn(state, c.enable))
      const verb = wantsEncounterHide(text) ? 'hide' : 'skip'
      if (row) return withVerb(applyEffect(state, row.effects), verb)
      const shut = order.map((id) => rows.find((c) => c.id === id)).find(Boolean)
      return withVerb(persist({ ...state, flash: shut?.locked ?? 'No way past this one. Fight, or run.', updatedAt: Date.now() }), verb)
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
      return withVerb(bindSalve(state), 'heal')
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
  if (aimed?.kind === 'target' && /^(?:my |your )?(?:gear|bag|pack|kit|self|myself|inventory|clothes|clothing)$/.test(aimed.target)) {
    return withVerb(persist({ ...state, flash: gearLookLine(state), updatedAt: Date.now() }), 'look')
  }
  if (/^tie (?:the |ossa'?s? )?knot\b/.test(said)) {
    return withVerb(tieKnot(state), 'craft')
  }
  if (/^(?:craft|stitch|make)(?: a)?(?: scav)? (?:pack|bag)$|^craft$/.test(said)) {
    return withVerb(craftScavPack(state), 'craft')
  }

  // A line that names a visible, enabled button is that button. Shelf and rumor guesses come after.
  {
    const named = strongButton(state, text)
    if (named) return withVerb(applyEffect(state, named.effects), named.id)
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

  if (isHungerCommand(text, state.door)) {
    const fx = hungerCommandEffect(state, enabled)
    if (fx) return withVerb(applyEffect(state, fx), 'hunger')
    const named = enabled.filter((c) => /\b(?:hunger|gullet)\b/i.test(`${c.label} ${c.sub ?? ''}`))
    const namedHit = matchChoiceText(text, named)
    if (namedHit) return withVerb(applyEffect(state, namedHit.effects), namedHit.id)
    if (!state.flags.encounterHere && !isPressureOverlay(state)) {
      return withVerb(persist({ ...state, flash: state.flags.chapter1Done || state.hubId === 'redmaw' || state.chapterId ? HUNGER_BLOCKED : hungerBlockedFor(ROADS[state.door].name), updatedAt: Date.now() }), 'hunger')
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

  {
    const late = readLateAsk(text)
    const ans = late ? answerLate(state, scene, late, text) : null
    if (ans) return withVerb(persist({ ...state, flash: ans.flash, updatedAt: Date.now() }), ans.verb)
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
  const voiced = !scene.intentFallback && (scene.kind === 'talk' || !!scene.speaker)
  const fallback = scene.intentFallback ?? (voiced ? talkFallback(scene.id, scene.speaker, state.ticks, text) : null)
  if (fallback) {
    return withVerb(
      applyEffect(state, {
        ...(fallback.effects ?? {}),
        flash: voiced ? `${fallback.reply} ${hintLine(shown, (c) => isChoiceOn(state, c.enable))}` : fallback.reply,
        ticks: fallback.effects?.ticks ?? 1,
      }),
      'try',
    )
  }
  // No person, no match: the place answers, with a pointer at what works here.
  const voice = voiceOnScreen(state, scene)
  const ground = voice ? pickLine(voice.lines, state, text) : sceneVoice(scene, state, text)
  return withVerb(
    persist({
      ...state,
      ticks: state.ticks + 1,
      flash: `${ground} ${hintLine(shown, (c) => isChoiceOn(state, c.enable))}`,
      updatedAt: Date.now(),
    }),
    'try',
  )
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

export const DAIS_CLEAR = 'The dais is clear. You go up the steps into the Court.'

/** Waking after a fight closes that fight: you lost it, and the foe has gone. */
function fightLostWake(state: GameState): Effect {
  let fx = wakeEffect(state)
  // The Court Guard gone from the dais (beaten or moved on): you wake with the steps clear.
  if (state.sceneId === 'thresh:court-guard' && (state.flags.downedKind === 'courtguard' || state.flags.crucibleGuardBeaten) && !fx.goto) {
    fx = { ...fx, goto: 'thresh:court', flag: { ...(fx.flag ?? {}), courtGuardGone: true }, flash: fx.flash ? `${fx.flash} ${DAIS_CLEAR}` : DAIS_CLEAR }
  }
  const name = foeName(state.flags.downedKind)
  if (!name || state.flags.downedWon) return fx
  const lost = `Fight lost. The ${name} has moved on.`
  const base = fx.flash ? `${lost} ${fx.flash}` : lost
  const cost = typeof state.flags.downLost === 'string' && state.flags.downLost ? state.flags.downLost : ''
  return { ...fx, unsetFlag: [...(fx.unsetFlag ?? []), 'downLost'], flash: cost ? `${base}\n\n${cost}` : base }
}

export function visibleChoices(state: GameState): Choice[] {
  if (state.flags.downed || (state.health ?? 1) <= 0) {
    return [
      {
        id: 'wake',
        label: 'Take the hand. Get up.',
        sub: 'Too hurt to fight.',
        tone: 'quiet',
        effects: fightLostWake(state),
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
  const bag = bagChoices(state)
  const authored = scopeDecoy(state, sceneOf(state).choices.filter((c) => check(c.show, state)))
  const rows = vendorFor(state.sceneId)
    ? shopChoices(state, authored).filter((c) => check(c.show, state))
    : isRumorCounter(state.sceneId)
      ? rumorChoices(state, authored).filter((c) => check(c.show, state))
      : authored
  return [...bag, ...withRest(state, withKaelenPass(state, hymnSapLocks(state, mawToll(state, rows))))]
}

/** The Maw toll: diggers hold the rope down to the Fossil Ribs. Pay (more at higher Cartel Heat), slip past, or fight. Once a Maw visit. */
export const MAW_TOLL_LOCK = 'Needs: the diggers\' toll settled.'
export function mawTollPrice(state: GameState): number {
  return 2 + Math.floor((state.heat.cartel ?? 0) / 3)
}
function mawToll(state: GameState, rows: Choice[]): Choice[] {
  if (state.sceneId !== 'maw:ribs' || state.flags.mawTollDone || state.flags.ribOpen) return rows
  const price = mawTollPrice(state)
  const gated = rows.map((c) => (c.effects.goto && !c.effects.flag?.ribOpen ? c : { ...c, enable: { flag: '__toll__' }, locked: MAW_TOLL_LOCK }))
  return [
    {
      id: 'toll-pay',
      label: "Pay the diggers' toll",
      sub: `Scrap -${price}. They let you down to the ribs.`,
      enable: { itemMin: ['scrap', price] },
      locked: `Needs: ${price} scrap`,
      effects: { remove: { scrap: price }, flag: { mawTollDone: true }, ticks: 1, flash: `Scrap -${price}. A digger pockets it and steps off the rope. The ribs are yours to pick.` },
    },
    {
      id: 'toll-sneak',
      label: 'Slip down past the rope',
      sub: 'Costs 1 Sap. They may see you.',
      enable: { sapMin: 1 },
      locked: 'Needs: 1 Sap',
      effects: { sap: -1, ticks: 1, flag: { mawTollDone: true }, flash: 'You go down the far side of the rib, where the rope does not reach.', sneak: { odds: 4, kind: 'scavenger', spotted: 'A digger sees you on the rib. He wants his toll another way.' } },
    },
    {
      id: 'toll-fight',
      label: 'Fight past the toll',
      sub: 'A real fight. Health takes the hits.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { ...beginEncounter(state, 'scavenger', 'The digger lets go of the rope and picks up a pick.'), flag: { ...beginEncounter(state, 'scavenger').flag, mawTollFight: true }, ticks: 1 },
    },
    ...gated,
  ]
}

/** Road beats whose 2-Sap walks lock under 2 Sap (hymn-road, Last Fence). */
const SAP_LOCK_ROADS = new Set(['ch1:v-hymn', 'ch1:p-pipe'])
export const HYMN_STAGGER_LABEL = 'Stagger on with what you have'
export const HYMN_STAGGER_SUB = 'Costs your last Sap.'

/** Hymn-road: the 2-Sap walks lock under 2 Sap. A last-Sap stagger keeps the road open (it empties you into the rescue). */
function hymnSapLocks(state: GameState, rows: Choice[]): Choice[] {
  if (!SAP_LOCK_ROADS.has(state.sceneId)) return rows
  const out = rows.map((c) => ((c.effects.sap ?? 0) <= -2 && !c.enable ? { ...c, enable: { sapMin: -(c.effects.sap ?? 0) }, locked: `Needs: ${-(c.effects.sap ?? 0)} Sap` } : c))
  if (state.sap >= 2) return out
  const lead = rows.find((c) => c.id === 'hymn') ?? rows.find((c) => (c.effects.sap ?? 0) <= -2 && c.effects.goto) ?? rows.find((c) => c.effects.goto)
  if (!lead?.effects.goto) return out
  return [...out, { id: 'stagger', label: HYMN_STAGGER_LABEL, sub: HYMN_STAGGER_SUB, tone: 'quiet', effects: { goto: lead.effects.goto, ticks: 1, sap: -1 } }]
}

/** Bag full: drop something to free a slot and take what is on the ground, or leave it. */
function bagChoices(state: GameState): Choice[] {
  const held = heldOf(state.flags)
  if (!Object.keys(held).length) return []
  const names = heldNames(held)
  const slots = `Bag ${bagLoad(state)}/${bagCap(state)} slots.`
  const rows: Choice[] = (Object.keys(state.items) as ItemId[])
    .filter((id) => bagUnits(state, id) > 0 && !bagFree(id))
    .map((id) => {
      // A stack frees its slot only when the whole stack goes.
      const n = bagStacks(id) ? bagCount(state, id) : 1
      const what = n > 1 ? `all ${n} ${ITEMS[id].name}` : `1 ${ITEMS[id].name}`
      return {
        id: `bag-drop-${id}`,
        label: `Drop ${what} to take the ${names}`,
        sub: `${slots} ${n > 1 ? 'The stack stays here.' : `The ${ITEMS[id].name} stays here.`}`,
        tone: 'quiet' as const,
        effects: { remove: { [id]: n }, bagRetry: true, flash: `You drop ${n > 1 ? `the ${ITEMS[id].name} ×${n}` : `the ${ITEMS[id].name}`} and pick up what fits.` },
      }
    })
  rows.push({
    id: 'bag-leave',
    label: `Leave the ${names}`,
    sub: 'It stays on the ground.',
    tone: 'quiet',
    effects: { bagLeave: true, flash: `You leave the ${names} where it lies.` },
  })
  return rows
}

export const REST_LINE = 'You sit in what shade there is and let the cut close a little. Health returns. Sap pays for it.'

/** Road and hub ground only: no fight, no trade, no Kaelen, not facing a hunter. */
export function restAllowed(state: GameState): boolean {
  const id = state.sceneId
  const sc = getScene(id)
  // Hubs: place screens. The road (Cache Run): every walking beat, including the people met on it.
  if (sc.kind !== 'place' && !((sc.kind === 'story' || sc.kind === 'talk') && sc.chapterId === 'cache-run')) return false
  if (id.startsWith('open:') || id.startsWith('roam:') || id.startsWith('ch2:') || id === CHAPTER_ONE_END || id === 'ch1:sybella' || id === 'ch1:storm') return false
  if (id.includes('kaelen') || id === 'thresh:sift' || isVendorScene(id)) return false
  if (state.flags.encounterHere || state.flags.hunterHere || state.flags.downed || state.flags.kaelenIntroNow) return false
  if (state.flags.shopShelf || state.flags.rumorShelf) return false
  if (Object.keys(heldOf(state.flags)).length) return false
  return true
}

/** Rest: 1 Health for 1 Sap, as often as you can pay. Hidden at full Health; locked with no Sap. */
/** Haul parts: once, then not again until you have walked 4 scenes. */
export const HAUL_GAP = 4
export const HAUL_LOCK = 'He has nothing to haul yet. Come back after a few stops.'
export const HAULER_JOB_SUB = 'Costs sap. You get 3 scrap: the Hauler Pack carries more. The rig gets one bolt closer to finished.'
export const HAULER_JOB_LINE = 'Scrap +3. The Hauler Pack takes a second coil. A cut on your palm. The rig is one bolt less imaginary.'
export const REST_DONE_LOCK = 'Rested here already. Move on first.'

function withRest(state: GameState, rows: Choice[]): Choice[] {
  // The Wreck has its own bench: that is the rest there, once a scene, and nothing stacks on it.
  if (state.sceneId === 'maw:tuner') {
    const hauledAgo = Number(state.flags.sceneSteps ?? 0) - Number(state.flags.oilJobStep ?? -99)
    return rows.map((c) => {
      if (c.id === 'bench' && state.flags.restedHere) return { ...c, enable: { flag: '__never__' }, locked: REST_DONE_LOCK }
      if (c.id === 'job') {
        const packed = (state.items.hauler_pack ?? 0) > 0
        if (hauledAgo < HAUL_GAP) return { ...c, sub: packed ? HAULER_JOB_SUB : c.sub, enable: { flag: '__never__' }, locked: HAUL_LOCK }
        const fx = { ...c.effects, flag: { ...(c.effects.flag ?? {}), oilJobStep: Number(state.flags.sceneSteps ?? 0) } }
        // The Hauler Pack carries more parts: +1 scrap on each haul.
        if (packed) {
          return { ...c, sub: HAULER_JOB_SUB, effects: { ...fx, add: { ...(fx.add ?? {}), scrap: (fx.add?.scrap ?? 0) + 1 }, flash: HAULER_JOB_LINE } }
        }
        return { ...c, effects: fx }
      }
      return c
    })
  }
  if (!restAllowed(state)) return rows
  if ((state.health ?? HEALTH_MAX) >= (state.healthMax ?? HEALTH_MAX)) return rows
  return [
    ...rows,
    {
      id: 'rest',
      label: 'Rest',
      sub: '+2 Health. Costs 1 Sap. Once a scene.',
      tone: 'quiet',
      // Resting on your last Sap would empty you into the collapse, so it takes 2.
      enable: state.flags.restedHere ? { flag: '__never__' } : { sapMin: 2 },
      locked: state.flags.restedHere ? REST_DONE_LOCK : 'Needs: 2 Sap',
      effects: { health: 2, sap: -1, still: true, flag: { restedHere: true }, flash: REST_LINE },
    },
  ]
}

function withKaelenPass(state: GameState, rows: Choice[]): Choice[] {
  if (!state.flags.kaelenPassing || state.sceneId === 'roam:kaelen' || state.sceneId === 'ch1:storm' || kaelenHeld(state.sceneId)) return rows
  const k = getScene(state.sceneId).kind
  if (k === 'crisis' || k === 'ending') return rows
  const known = !!state.flags.kaelenKnown
  const visit = {
    goto: 'roam:kaelen',
    unsetFlag: ['kaelenPassing'],
    flag: { kaelenFrom: state.sceneId, kaelenKnown: true, metKaelen: true },
    ticks: 1,
  }
  return [
    ...rows,
    {
      id: 'kaelen-pass',
      label: known ? 'Kaelen the Sifter has stopped' : 'A trader has stopped',
      sub: 'His pack. A rumor from the last road. He will not stay.',
      effects: visit,
    },
    {
      id: 'kaelen-rumors',
      label: known ? 'Ask Kaelen about rumors' : 'Ask the trader about rumors',
      sub: 'What he heard on the last road.',
      effects: { ...visit, flag: { ...visit.flag, heardKallik: true }, flash: state.flags.heardKallik ? KAELEN_NO_NEW_RUMOR : KAELEN_ROAD_RUMOR },
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

const SLOT_ON: Record<EquipSlot, string> = {
  head: 'on your head',
  armor: 'on the body',
  legs: 'on your legs',
  hands: 'on your hands',
  cloak: 'over your shoulders',
  garment: 'worn',
  weapon: 'in the main hand',
  offhand: 'in the off hand',
}

const SLOT_OFF: Record<EquipSlot, string> = {
  head: 'The head is bare.',
  armor: 'Bare shoulders.',
  legs: 'Bare legs.',
  hands: 'Bare hands.',
  cloak: 'The cloak comes off.',
  garment: 'The garment comes off.',
  weapon: 'Empty hand.',
  offhand: 'The off hand is empty.',
}

/** Why a piece cannot go in a slot right now, or null if it can. */
export function equipBlock(state: GameState, id: ItemId, slot: EquipSlot): string | null {
  const def = ITEMS[id]
  if (!def?.slot) return 'That does not wear. Carry it.'
  if (!(state.items[id] ?? 0)) return 'You do not have it to equip.'
  if (!slotsFor(id).includes(slot)) {
    if (slot === 'weapon' && def.offhand === 'shield') return 'A shield goes in the Off hand.'
    if (slot === 'offhand') return 'The Off hand takes a short blade, a club, or a shield.'
    return `${def.name} goes in the ${SLOT_LABEL[def.slot]} slot.`
  }
  const other: EquipSlot | null = slot === 'weapon' ? 'offhand' : slot === 'offhand' ? 'weapon' : null
  if (other && state.equipped?.[other] === id && (state.items[id] ?? 0) < 2) return `Your only ${def.name} is already in the other hand.`
  return null
}

export function equipItem(state: GameState, id: ItemId, slot?: EquipSlot): GameState {
  const def = ITEMS[id]
  const to = slot ?? slotsFor(id)[0]
  const block = to ? equipBlock(state, id, to) : 'That does not wear. Carry it.'
  if (block || !to || !def) return persist({ ...state, flash: block ?? 'That does not wear. Carry it.' })
  const equipped = { ...(state.equipped ?? {}), [to]: id }
  return persist({
    ...state,
    equipped,
    flash: `${def.name} ${SLOT_ON[to]}.`,
    updatedAt: Date.now(),
  })
}

export function unequipSlot(state: GameState, slot: EquipSlot): GameState {
  const equipped = { ...(state.equipped ?? {}) }
  delete equipped[slot]
  return persist({
    ...state,
    equipped,
    flash: SLOT_OFF[slot],
    updatedAt: Date.now(),
  })
}

export { HUBS, DOORS, check, clamp, travelGate, canScavenge, canSkim }

import { DOORS, HUBS, ITEMS, getScene, hasScene, resolveBody } from './content'
import { applyDelta, check, clamp } from './logic'
import { GLOBAL_INTENTS, matchChoiceText, matchIntent } from './intent'
import { travelGate } from './map'
import {
  atGuardStation,
  atKaelenInvoice,
  campJobOpen,
  TAKE_INSIDE_JOB,
  wantsCampSabotage,
  wantsDoSabotage,
} from './campJob'
import { markMetOnLeave, matchPersonQuery, personAtScene } from './people'
import {
  isSybellaOverlay,
  isWireSide,
  SYBELLA_SHADOW_APPEND,
  sybellaShadowChoices,
  WIRE_HUNTER_APPEND,
  wireHunterChoices,
} from './hunter'
import {
  canEncounter,
  dismissEncounter,
  encounterCard,
  encounterChoices,
  enemyHealth,
  ENCOUNTER_FLAGS,
  HEALTH_MAX,
  isEncounterResult,
  pickEncounterKind,
  resolveEncounter,
  wantsEncounterFight,
  wantsEncounterSkip,
} from './encounter'
import { talkFallback, talkIntentsFor } from './talk'
import { applyScavenge, canScavenge, canSkim } from './scavenge'
import { writeSave } from './save'
import { repairSceneId } from './repair'
import { isRumorCounter, matchRumorText, rumorChoices } from './rumors'
import { matchShopText, moneyLabel, pickPay, shopChoices, vendorFor } from './trade'
import type { DoorId, Effect, EquipSlot, GameState, ItemId, Scene } from './types'

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
    equipped: d.id === 'vessel' ? { weapon: 'rusted_dagger', armor: 'ceremonial_cloth' } : {},
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

export function bodyOf(state: GameState): string {
  if (state.flags.encounterHere) {
    return encounterCard(state)
  }
  const scene = sceneOf(state)
  const person = personAtScene(scene.id)
  const base = person && state.flags[person.metFlag] && person.later[scene.id] ? person.later[scene.id] : scene.body
  const resolved = resolveBody(scene, (c) => check(c, state), base)
  if (state.flags.hunterHere && isWireSide(state.sceneId)) {
    return `${resolved}\n\n${WIRE_HUNTER_APPEND}`
  }
  if (isSybellaOverlay(state)) {
    return `${resolved}\n\n${SYBELLA_SHADOW_APPEND}`
  }
  return resolved
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
  const spent = spendFirst(
    state,
    ['scrap', 'wrench', 'cache_map', 'oram_map', 'rusted_dagger', 'silas_tip'],
    'falseSpent',
  )
  if (spent.flags.falseSpent) return spent
  return applyDelta(state, { flag: { falseSpent: 'ossa' } })
}

function hunterScene(state: GameState): string | null {
  if (state.flags.hunterHere || state.flags.encounterHere) return null
  const last = Number(state.flags.hunterAt ?? -99)
  if (last >= 0 && state.ticks - last < 4) return null
  if (state.flags.chapter1Done) {
    if (state.hubId === 'redmaw' && state.pressure >= 8 && state.ticks > 0 && state.ticks % 5 === 0) {
      if (state.sceneId !== 'maw:sybella-shadow' && state.sceneId !== 'maw:sybella') {
        return 'maw:sybella-shadow'
      }
    }
    return null
  }
  if (state.chapterId) return null
  if (state.pressure < 9) return null
  if (state.ticks === 0 || state.ticks % 4 !== 0) return null
  // Park (later): Camp pressure interrupt should not star Valerius.
  const map: Record<string, string> = {
    camp04: 'camp:hunter',
    spine: 'spine:hunter',
    threshold: 'thresh:hunter',
  }
  const id = state.hubId ? map[state.hubId] : null
  if (!id || state.sceneId === id) return null
  return id
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
  const dest = resolveDest(state, fx)
  let next = applyDelta(state, fx)
  next.flash = fx.flash
  if (fx.resolveEncounter) {
    const result = resolveEncounter(state, fx.resolveEncounter)
    next = applyDelta(next, result.fx)
    next.flash = result.flash
    if (result.fx.add?.vial_drop && (state.items.vial_empty ?? 0) > 0) {
      next = applyDelta(next, { remove: { vial_empty: 1 } })
    }
  }

  if (fx.startChapter) {
    next.chapterId = fx.startChapter
    next.hubId = null
    next.flags = { ...next.flags, hungerLocked: true, hungerKnown: true }
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
    if (next.flags.hunterHere && !isWireSide(dest)) {
      const flags = { ...next.flags }
      delete flags.hunterHere
      next.flags = flags
    }
    if (next.flags.encounterHere) {
      const flags = { ...next.flags }
      for (const k of ENCOUNTER_FLAGS) delete flags[k]
      next.flags = flags
    }
  }

  if (next.sceneId === 'ch1:hollow' && state.sceneId !== 'ch1:hollow') {
    next = spendValued(next)
  }
  if (next.flags.climax === 'false' && state.flags.climax !== 'false') {
    next = spendFalse(next)
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

  const lingered = (fx.ticks ?? 0) > 0 || (fx.pressure ?? 0) > 0 || !!dest
  const interrupt = lingered ? hunterScene(next) : null
  const fightBeat = !!fx.resolveEncounter || !!next.flags.encounterHere || !!fx.unsetFlag?.includes('encounterHere')
  if (interrupt && !fightBeat && getScene(next.sceneId).kind !== 'crisis') {
    const from = next.sceneId
    next.flags = { ...next.flags, hunterFrom: from, hunterAt: next.ticks }
    if (interrupt === 'camp:hunter' && isWireSide(from)) {
      next.flags = { ...next.flags, hunterHere: true }
    } else if (interrupt === 'maw:sybella-shadow') {
      next.flags = { ...next.flags, hunterHere: true }
    } else {
      next.sceneId = interrupt
      const h = getScene(interrupt)
      if (h.hubId) next.hubId = h.hubId
    }
  }

  if (
    lingered &&
    next.sceneId === state.sceneId &&
    !fx.resolveEncounter &&
    !next.flags.hunterHere &&
    next.sceneId !== 'maw:sybella-shadow' &&
    getScene(next.sceneId).kind !== 'crisis' &&
    canEncounter(next)
  ) {
    const kind = pickEncounterKind(next)
    next.flash = undefined
    next.flags = {
      ...next.flags,
      encounterHere: true,
      encounterKind: kind,
      encounterAt: next.ticks,
      encounterHp: enemyHealth(kind),
    }
    delete next.flags.encounterClash
  }

  if (arrived.onEnter && next.sceneId === arrived.id && state.sceneId !== arrived.id) {
    next = applyDelta(next, arrived.onEnter)
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
  const heat =
    state.hubId === 'threshold'
      ? { seekers: 1 }
      : state.hubId === 'spine' || state.hubId === 'redmaw'
        ? { strays: 1 }
        : { cartel: 1 }
  return withVerb(
    applyEffect(state, {
      add: { vial_drop: 1 },
      remove: (state.items.vial_empty ?? 0) > 0 ? { vial_empty: 1 } : undefined,
      sap: -1,
      heat,
      pressure: 2,
      ticks: 1,
      flag: { [`skim:${state.sceneId}`]: true, skimmed: true },
      flash:
        'You skim a Drop the desert had not budgeted. Hands sticky. Heat ticks. This is theft with a glass throat — not a crisis rescue.',
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

export function interpret(state: GameState, text: string): GameState {
  const scene = sceneOf(state)
  const who = matchPersonQuery(text)
  if (who === 'ask') {
    return withVerb(
      persist({
        ...state,
        flash:
          'Name them. Who is Oil-Tooth. Who is Kaelen. Who is Valerius. Who is Clerk Rell. Who is Silas. Who is Nim. Who is Thalia. Who is Oram. Who is Brin. Who is Zafir. Who is Ossa. Who is Sybella.',
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
    if (isEncounterResult(state)) {
      return withVerb(applyEffect(state, dismissEncounter(state)), 'on')
    }
    if (wantsEncounterFight(text)) {
      return withVerb(applyEffect(state, { resolveEncounter: 'fight', ticks: 1 }), 'fight')
    }
    if (wantsEncounterSkip(text)) {
      return withVerb(applyEffect(state, { resolveEncounter: 'skip' }), 'skip')
    }
  }

  if (state.flags.hunterHere && isWireSide(state.sceneId)) {
    const hay = text.toLowerCase()
    if (/\b(stay|hold|wait|here|dismiss|pass)\b/.test(hay)) {
      return withVerb(applyEffect(state, wireHunterChoices()[0].effects), 'hold')
    }
    if (/\b(line|yard|scrape|dive)\b/.test(hay)) {
      return withVerb(applyEffect(state, wireHunterChoices()[1].effects), 'line')
    }
    if (/\b(cloak|hide|cover)\b/.test(hay) && state.equipped?.armor) {
      return withVerb(applyEffect(state, wireHunterChoices()[2].effects), 'cloak')
    }
  }

  if (isSybellaOverlay(state)) {
    const hay = text.toLowerCase()
    if (/\b(stay|hold|wait|dismiss|pass|here)\b/.test(hay)) {
      return withVerb(applyEffect(state, sybellaShadowChoices()[0].effects), 'stay')
    }
    if (/\b(smoke|face|approach|sybella)\b/.test(hay)) {
      return withVerb(
        applyEffect(state, {
          goto: 'maw:sybella',
          ticks: 1,
          unsetFlag: ['hunterHere', 'hunterFrom'],
        }),
        'sybella',
      )
    }
  }

  const shopHit = matchShopText(state, text)
  if (shopHit) {
    return withVerb(applyEffect(state, shopHit.effects), shopHit.verb)
  }

  const rumorHit = matchRumorText(state, text)
  if (rumorHit) {
    return withVerb(applyEffect(state, rumorHit.effects), rumorHit.verb)
  }

  const button = matchChoiceText(
    text,
    visibleChoices(state).filter((c) => isChoiceOn(state, c.enable)),
  )
  if (button) {
    return withVerb(applyEffect(state, button.effects), button.id)
  }

  const local = matchIntent(text, [...(scene.intents ?? []), ...talkIntentsFor(scene.id)], state)
  if (local) {
    return withVerb(applyEffect(state, { ...local.effects, flash: local.reply }), verbLabel(local.tags[0]))
  }

  const hay = text.toLowerCase()
  const wantsScavenge = /\b(scavenge|forage|rummage|scrounge|look around|search around)\b/.test(hay)
  const wantsLook = /\b(look|search|scan)\b/.test(hay)
  const wantsSkim = /\b(skim|tap|siphon)\b/.test(hay)
  const wantsMap = /\bmap\b/.test(hay)

  if (wantsScavenge || (wantsLook && canScavenge(state))) return scavenge(state)
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
    return withVerb(applyEffect(state, { ...global.effects, flash: global.reply }), verbLabel(global.tags[0]))
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
    flash:
      'Miss. The desert did not catch that. Try ask, who is, scavenge, look, hide, trade, map — or use the buttons.',
    updatedAt: Date.now(),
  })
}

export function visibleChoices(state: GameState) {
  if (state.flags.encounterHere) {
    return encounterChoices(state)
  }
  if (state.flags.hunterHere && isWireSide(state.sceneId)) {
    return wireHunterChoices().filter((c) => check(c.show, state))
  }
  if (isSybellaOverlay(state)) {
    return sybellaShadowChoices().filter((c) => check(c.show, state))
  }
  const authored = sceneOf(state).choices.filter((c) => check(c.show, state))
  if (vendorFor(state.sceneId)) {
    return shopChoices(state, authored).filter((c) => check(c.show, state))
  }
  if (isRumorCounter(state.sceneId)) {
    return rumorChoices(state, authored).filter((c) => check(c.show, state))
  }
  return authored
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
  return persist({
    ...state,
    equipped,
    flash: def.slot === 'weapon' ? `${def.name} in the hand.` : `${def.name} on the body.`,
    updatedAt: Date.now(),
  })
}

export function unequipSlot(state: GameState, slot: EquipSlot): GameState {
  const equipped = { ...(state.equipped ?? {}) }
  delete equipped[slot]
  return persist({
    ...state,
    equipped,
    flash: slot === 'weapon' ? 'Empty hand.' : 'Bare shoulders.',
    updatedAt: Date.now(),
  })
}

export { HUBS, DOORS, check, clamp, travelGate, canScavenge, canSkim }

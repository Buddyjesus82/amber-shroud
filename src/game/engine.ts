import { DOORS, HUBS, ITEMS, getScene, resolveBody } from './content'
import { applyDelta, check, clamp } from './logic'
import { GLOBAL_INTENTS, matchIntent } from './intent'
import { travelGate } from './map'
import { markMetOnLeave, matchPersonQuery, personAtScene, whoChoices } from './people'
import { canScavenge, canSkim, rollScavenge, scavengeCooldown } from './scavenge'
import { writeSave } from './save'
import type { DoorId, Effect, EquipSlot, GameState, ItemId, Scene } from './types'

export function newGame(door: DoorId): GameState {
  const d = DOORS[door]
  const state: GameState = {
    version: 1,
    door: d.id,
    epithet: d.epithet,
    sap: d.sap,
    sapMax: 8,
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
  return getScene(state.sceneId)
}

export function bodyOf(state: GameState): string {
  const scene = sceneOf(state)
  const person = personAtScene(scene.id)
  const base = person && state.flags[person.metFlag] && person.later[scene.id] ? person.later[scene.id] : scene.body
  return resolveBody(scene, (c) => check(c, state), base)
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
  const map: Record<string, string> = {
    camp04: 'camp:hunter',
    spine: 'spine:hunter',
    threshold: 'thresh:hunter',
  }
  const id = state.hubId ? map[state.hubId] : null
  if (!id || state.sceneId === id) return null
  return id
}

export function applyEffect(state: GameState, fx: Effect): GameState {
  let next = applyDelta(state, fx)
  next.flash = fx.flash

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
      if (!fx.startChapter && fx.goto !== 'ch2:stub') next.chapterId = null
    }
  }

  const arrivingLand =
    fx.goto === 'ch1:land' ||
    fx.goto === 'ch1:bargain' ||
    fx.goto === 'ch1:flee' ||
    fx.goto === 'ch1:false' ||
    fx.goto === 'ch1:hollow'
  const dest = fx.goto
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

  const interrupt = hunterScene(next)
  if (interrupt && getScene(next.sceneId).kind !== 'crisis') {
    next.sceneId = interrupt
    const h = getScene(interrupt)
    if (h.hubId) next.hubId = h.hubId
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
  if (!canScavenge(state)) {
    return persist({
      ...state,
      flash: 'Nothing here to pick. The road has already been picked clean — or this is not a roam.',
      updatedAt: Date.now(),
    })
  }
  if (scavengeCooldown(state)) {
    return persist({
      ...state,
      flash: 'This patch is already in your hands. Walk, wait, or try another stretch.',
      updatedAt: Date.now(),
    })
  }
  const loot = rollScavenge(state)
  return withVerb(
    applyEffect(state, {
      add: loot.add,
      remove: loot.add.vial_drop && (state.items.vial_empty ?? 0) > 0 ? { vial_empty: 1 } : undefined,
      ticks: 1,
      pressure: 1,
      flag: { [`scavenge:${state.sceneId}`]: state.ticks + 1, scavenged: true },
      flash: loot.flash,
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

export function interpret(state: GameState, text: string): GameState {
  const scene = sceneOf(state)
  const who = matchPersonQuery(text)
  if (who === 'ask') {
    return withVerb(
      persist({
        ...state,
        flash:
          'Name them. Who is Oil-Tooth. Who is Kaelen. Who is Valerius. Who is Silas. Who is Thalia. Who is Oram.',
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

  const local = matchIntent(text, scene.intents ?? [], state)
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
  const fallback = scene.intentFallback
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
  const authored = sceneOf(state).choices.filter((c) => check(c.show, state))
  if (sceneOf(state).kind === 'crisis' || state.chapterId === 'cache-run') return authored
  return [...whoChoices(state), ...authored]
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

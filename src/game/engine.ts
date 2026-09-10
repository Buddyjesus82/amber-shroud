import { DOORS, HUBS, getScene, resolveBody } from './content'
import { applyDelta, check, clamp } from './logic'
import { GLOBAL_INTENTS, matchIntent } from './intent'
import { writeSave } from './save'
import type { DoorId, Effect, GameState, ItemId, Scene } from './types'

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
  return resolveBody(scene, (c) => check(c, state))
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

function spendValued(state: GameState): GameState {
  const order: ItemId[] = ['vial_drop', 'glints', 'kallik_mark', 'strider_bit', 'ceremonial_cloth', 'shiv']
  for (const id of order) {
    if ((state.items[id] ?? 0) > 0) {
      let next = applyDelta(state, { remove: { [id]: 1 } })
      if (id === 'vial_drop') next = applyDelta(next, { add: { vial_empty: 1 } })
      next.flags = { ...next.flags, buriedItem: id }
      return next
    }
  }
  return state
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
  const sapBefore = state.sap
  let next = applyDelta(state, fx)
  next.flash = fx.flash

  if (fx.startChapter) {
    next.chapterId = fx.startChapter
    next.hubId = null
    next.flags = { ...next.flags, hungerLocked: true }
  }
  if (fx.enterHub) {
    const hub = HUBS[fx.enterHub]
    if (hub) {
      next.hubId = hub.id
      if (!fx.startChapter && fx.goto !== 'ch2:stub') next.chapterId = null
    }
  }

  const arrivingLand = fx.goto === 'ch1:land' || fx.goto === 'ch1:bargain' || fx.goto === 'ch1:flee' || fx.goto === 'ch1:false' || fx.goto === 'ch1:hollow'
  const sapCollapsed = next.sap <= 0 && sapBefore > 0
  const dest = fx.goto
  const destScene = dest ? getScene(dest) : null
  const skipCrisis =
    !!fx.enterHub ||
    !!fx.startChapter ||
    arrivingLand ||
    destScene?.kind === 'crisis' ||
    sceneOf(state).kind === 'crisis'

  if (dest) next.sceneId = dest

  if (next.sceneId === 'ch1:hollow' && state.sceneId !== 'ch1:hollow') {
    next = spendValued(next)
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
  return applyEffect(state, {
    goto: sceneId,
    sap: -1,
    ticks: 1,
    pressure: 1,
    flash: undefined,
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

export function interpret(state: GameState, text: string): GameState {
  const scene = sceneOf(state)
  const local = matchIntent(text, scene.intents ?? [], state)
  const global = matchIntent(text, GLOBAL_INTENTS, state)
  const hit = local ?? global
  if (hit) {
    return applyEffect(state, { ...hit.effects, flash: hit.reply })
  }
  const fallback = scene.intentFallback
  if (fallback) {
    return applyEffect(state, {
      ...(fallback.effects ?? {}),
      flash: fallback.reply,
      ticks: fallback.effects?.ticks ?? 1,
    })
  }
  return persist({
    ...state,
    ticks: state.ticks + 1,
    flash:
      'The desert does not parse poetry. Try a plainer act — hide, take, talk, drink, bury, run — or use the buttons.',
  })
}

export function visibleChoices(state: GameState) {
  return sceneOf(state).choices.filter((c) => check(c.show, state))
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

export { HUBS, DOORS, check, clamp }

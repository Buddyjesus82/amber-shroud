import { ITEMS } from './content/catalog'
import { applyDelta } from './logic'
import type { GameState, ItemId } from './types'

const SKIM_SCENES = new Set([
  'camp:vents',
  'camp:vats',
  'camp:yard',
  'spine:well',
  'thresh:paddock',
  'maw:lip',
])

function sceneOf(state: GameState) {
  return state.sceneId
}

function seed(state: GameState): number {
  let n = state.ticks * 13 + (state.sap + 3) * 7 + state.pressure * 3
  for (const ch of state.sceneId) n += ch.charCodeAt(0)
  n += (state.items.scrap ?? 0) * 5
  return Math.abs(n)
}

export function hubRoam(state: GameState): boolean {
  if (!state.hubId) return false
  if (state.chapterId === 'cache-run') return false
  return true
}

export function canScavenge(state: GameState): boolean {
  if (!hubRoam(state)) return false
  const id = sceneOf(state)
  if (id.startsWith('crisis:') || id.startsWith('open:') || id.startsWith('ch1:') || id.startsWith('ch2:')) {
    return false
  }
  return true
}

export function scavengeCooldown(state: GameState): boolean {
  const key = `scavenge:${state.sceneId}`
  const last = Number(state.flags[key] ?? -99)
  return last >= 0 && state.ticks - last < 2
}

export type ScavengeResult = {
  add: Partial<Record<ItemId, number>>
  flash: string
  drop: boolean
}

export function rollScavenge(state: GameState): ScavengeResult {
  const roll = seed(state) % 10
  const place = state.sceneId.includes('vat') || state.sceneId.includes('vent') || state.sceneId.includes('well')
  if (roll === 0 || (place && roll === 7)) {
    return {
      add: { vial_drop: 1 },
      drop: true,
      flash:
        'Under grit: a Drop of Oasis Sap, still warm. Not a rescue. A find. Glass kisses whatever throat you have left.',
    }
  }
  if (roll === 1) {
    return {
      add: { glints: 1 },
      drop: false,
      flash: 'A Glint wedged like a tooth. Spent amber. Dune money. Kaelen would call it inventory.',
    }
  }
  if (roll === 2 || roll === 6) {
    return {
      add: { scrap: 2 },
      drop: false,
      flash: 'Two twists of scrap. Wire. Bent tooth. Saleable. Tradeable. The Sifter buys this.',
    }
  }
  if (state.hubId === 'camp04' && roll === 3) {
    return {
      add: { scrip: 1 },
      drop: false,
      flash: 'A scrap of Cartel Scrip somebody lost and the Yard has not counted. Paper Ironwood still loves.',
    }
  }
  return {
    add: { scrap: 1 },
    drop: false,
    flash: 'Scrap. Bent metal. Things that cut or trade. Kaelen buys Drops with this.',
  }
}

export function applyScavenge(state: GameState): GameState {
  if (!canScavenge(state)) {
    return {
      ...state,
      sceneId: state.sceneId,
      hubId: state.hubId,
      flash: 'Nothing here to pick. The road has already been picked clean — or this is not a roam.',
    }
  }
  if (scavengeCooldown(state)) {
    return {
      ...state,
      sceneId: state.sceneId,
      hubId: state.hubId,
      flash: 'This patch is already in your hands. Walk, wait, or try another stretch.',
    }
  }
  const here = state.sceneId
  const hub = state.hubId
  const loot = rollScavenge(state)
  let next = applyDelta(state, {
    add: loot.add,
    ticks: 1,
    pressure: 1,
    flag: { [`scavenge:${here}`]: state.ticks + 1, scavenged: true },
  })
  if (loot.add.vial_drop && (state.items.vial_empty ?? 0) > 0) {
    next = applyDelta(next, { remove: { vial_empty: 1 } })
  }
  next.flash = loot.flash
  next.sceneId = here
  next.hubId = hub
  return next
}

export function canSkim(state: GameState): boolean {
  if (!canScavenge(state)) return false
  if (!SKIM_SCENES.has(state.sceneId)) return false
  return !state.flags[`skim:${state.sceneId}`]
}

export function applySkim(state: GameState): GameState {
  if (!SKIM_SCENES.has(state.sceneId)) {
    return {
      ...state,
      flash: 'No drip here worth a hand. Find a vat, a vent, a well, a lip — or buy from Kaelen.',
    }
  }
  if (state.flags[`skim:${state.sceneId}`]) {
    return {
      ...state,
      flash: 'This throat is already dry. You took what it would give. Heat remembers the taking.',
    }
  }
  const heat =
    state.hubId === 'threshold'
      ? { seekers: 1 }
      : state.hubId === 'spine' || state.hubId === 'redmaw'
        ? { strays: 1 }
        : { cartel: 1 }
  let next = applyDelta(state, {
    add: { vial_drop: 1 },
    sap: -1,
    heat,
    pressure: 2,
    ticks: 1,
    flag: { [`skim:${state.sceneId}`]: true, skimmed: true },
  })
  if ((state.items.vial_empty ?? 0) > 0) next = applyDelta(next, { remove: { vial_empty: 1 } })
  next.flash =
    'You skim a Drop the desert had not budgeted. Hands sticky. Heat ticks. This is theft with a glass throat — not a crisis rescue.'
  return next
}

export function lootTag(id: ItemId): string {
  const item = ITEMS[id]
  if (!item) return id
  if (item.bite != null) return `${item.name} · Bite ${item.bite}`
  if (item.hide != null) return `${item.name} · Hide ${item.hide}`
  return item.name
}

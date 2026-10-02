import { ITEMS } from './content/catalog'
import { applyDelta } from './logic'
import type { Faction, GameState, ItemId } from './types'

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
      flash: 'A Glint wedged like a tooth. Spent amber. Kaelen trades rumors for these.',
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
    flash: 'Scrap +1. Bent metal. Things that cut or trade. Kaelen trades Drops for scrap.',
  }
}

/** Loot only. Never goto, never applyEffect, never hunter/crisis relocate. */
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

/** Skims that need gear. Same rule as the scene button: locked actions name the requirement. */
export const WELL_SKIM_LOCKED = 'Needs a weapon equipped'

export function skimLocked(state: GameState): string | null {
  if (state.sceneId === 'spine:well' && !state.equipped?.weapon) {
    return 'The resin in the well-throat is too hard to scrape by hand. It needs a weapon equipped.'
  }
  return null
}

export function canSkim(state: GameState): boolean {
  if (!canScavenge(state)) return false
  if (!SKIM_SCENES.has(state.sceneId)) return false
  if (skimLocked(state)) return false
  return !state.flags[`skim:${state.sceneId}`]
}

/** Heat only for a faction that can see or trace the skim. The Hollow Lip is empty. */
export function skimHeat(state: GameState): Partial<Record<Faction, number>> | undefined {
  if (state.sceneId === 'maw:lip') return undefined
  if (state.hubId === 'threshold' || state.sceneId.startsWith('thresh:')) return { seekers: 1 }
  if (state.hubId === 'spine' || state.sceneId.startsWith('spine:')) return { strays: 1 }
  if (state.hubId === 'redmaw' || state.sceneId.startsWith('maw:')) return { strays: 1 }
  if (state.hubId === 'camp04' || state.sceneId.startsWith('camp:')) return { cartel: 1 }
  return undefined
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
  const locked = skimLocked(state)
  if (locked) return { ...state, flash: locked }
  const heat = skimHeat(state)
  let next = applyDelta(state, {
    add: { vial_drop: 1 },
    sap: -1,
    heat,
    pressure: 2,
    ticks: 1,
    flag: {
      [`skim:${state.sceneId}`]: true,
      skimmed: true,
      ...(heat?.strays && (state.hubId === 'spine' || state.sceneId.startsWith('spine:')) ? { strayNotice: true } : {}),
    },
  })
  if ((state.items.vial_empty ?? 0) > 0) next = applyDelta(next, { remove: { vial_empty: 1 } })
  next.flash = heat
    ? 'You skim a Drop the desert had not budgeted. Hands sticky. Someone here can trace it. Heat ticks. This is theft with a glass throat — not a crisis rescue.'
    : 'You skim a Drop off the Hollow Lip. Nobody from the Cartel, the Seekers, or the Strays is here to see it. No Heat.'
  return next
}

export function lootTag(id: ItemId): string {
  const item = ITEMS[id]
  if (!item) return id
  if (item.strike != null) return `${item.name} · Strike ${item.strike}`
  if (item.shell != null) return `${item.name} · Shell ${item.shell}`
  return item.name
}

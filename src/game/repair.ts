import { ITEMS, getScene, hasScene } from './content'
import type { DoorId, EquipSlot, GameState } from './types'

const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'garment']

/** Old saves parked Vessel Cloth on armor. Move a piece onto the slot its catalog declares. */
export function migrateEquipped(state: GameState): GameState {
  const prev = state.equipped ?? {}
  const next: GameState['equipped'] = { ...prev }
  let changed = !state.equipped
  for (const slot of EQUIP_SLOTS) {
    const id = next[slot]
    if (!id) continue
    const want = ITEMS[id]?.slot
    if (!want) {
      delete next[slot]
      changed = true
      continue
    }
    if (want !== slot) {
      delete next[slot]
      changed = true
      if (!next[want]) next[want] = id
    }
  }
  if (!changed) return state
  return { ...state, equipped: next }
}

/** Old Cache Run beats removed when Hunger spokes split. */
const RENAMES: Record<string, (door: DoorId) => string> = {
  'ch1:trail': (door) => (door === 'prisoner' ? 'ch1:p-pipe' : door === 'outcast' ? 'ch1:o-noon' : 'ch1:v-hymn'),
  'ch1:ossa-meet': (door) => (door === 'prisoner' ? 'ch1:p-ossa' : door === 'outcast' ? 'ch1:o-ossa' : 'ch1:v-zafir'),
  'ch1:zafir': (door) => (door === 'vessel' ? 'ch1:v-zafir' : 'ch1:sybella'),
  'ch1:bargain': () => 'ch1:land',
  'ch1:flee': () => 'ch1:land',
  'ch1:false': () => 'ch1:land',
  // Kaelen's Spine counter moved to Korvan in Silas's shade.
  'spine:kaelen': () => 'spine:korvan',
  'spine:kaelen-rumors': () => 'spine:korvan',
}

const PRISONER_SPOKE = new Set(['ch1:p-pipe', 'ch1:p-clerk', 'ch1:p-oil', 'ch1:p-ossa'])
const OUTCAST_SPOKE = new Set(['ch1:o-noon', 'ch1:o-silas', 'ch1:o-tax', 'ch1:o-ossa'])
const VESSEL_SPOKE = new Set(['ch1:v-hymn', 'ch1:v-runners', 'ch1:v-zafir'])

export function sceneFitsDoor(sceneId: string, door: DoorId): boolean {
  if (!hasScene(sceneId)) return false
  if (sceneId === 'open:prisoner' || sceneId.startsWith('camp:') || sceneId === 'crisis:camp') return door === 'prisoner'
  if (sceneId === 'open:outcast' || sceneId.startsWith('spine:') || sceneId === 'crisis:spine') return door === 'outcast'
  if (sceneId === 'open:vessel' || sceneId.startsWith('thresh:') || sceneId === 'crisis:thresh') return door === 'vessel'
  if (PRISONER_SPOKE.has(sceneId)) return door === 'prisoner'
  if (OUTCAST_SPOKE.has(sceneId)) return door === 'outcast'
  if (VESSEL_SPOKE.has(sceneId)) return door === 'vessel'
  return true
}

export function doorHomeScene(
  door: DoorId,
  opts?: { hunger?: boolean; landed?: boolean },
): { sceneId: string; hubId: string | null; chapterId: string | null } {
  if (opts?.landed) return { sceneId: 'maw:rim', hubId: 'redmaw', chapterId: null }
  if (opts?.hunger) return { sceneId: 'ch1:leave', hubId: null, chapterId: 'cache-run' }
  if (door === 'outcast') return { sceneId: 'spine:ridge', hubId: 'spine', chapterId: null }
  if (door === 'vessel') return { sceneId: 'thresh:court', hubId: 'threshold', chapterId: null }
  return { sceneId: 'camp:cages', hubId: 'camp04', chapterId: null }
}

function inHunger(state: GameState): boolean {
  return state.chapterId === 'cache-run' || state.sceneId.startsWith('ch1:')
}

function landed(state: GameState): boolean {
  return !!state.flags.chapter1Done || state.hubId === 'redmaw' || state.sceneId.startsWith('maw:')
}

/** Map a saved/missing scene onto a live beat that belongs to this door. */
export function repairSceneId(state: Pick<GameState, 'door' | 'sceneId' | 'chapterId' | 'hubId' | 'flags'>): string {
  const door = state.door
  let id = state.sceneId
  const renamed = RENAMES[id]
  if (renamed) id = renamed(door)
  if (hasScene(id) && sceneFitsDoor(id, door)) return id
  const home = doorHomeScene(door, { hunger: inHunger(state as GameState) && !landed(state as GameState), landed: landed(state as GameState) })
  return home.sceneId
}

/** Saves from before the first-Drop goal: an Outcast who already had a Drop gets the goal marked quietly. */
function markOldFirstDrop(state: GameState): GameState {
  if (state.door !== 'outcast' || state.flags.firstDropMarked) return state
  const had = !!state.flags.firstDrop || (state.items.vial_drop ?? 0) > 0 || !!state.flags.chapter1Done
  return had ? { ...state, flags: { ...state.flags, firstDropMarked: true } } : state
}

export function repairLoadedState(state: GameState): GameState {
  const base = markOldFirstDrop(migrateEquipped(state))
  const sceneId = repairSceneId(base)
  if (sceneId === base.sceneId && hasScene(sceneId) && sceneFitsDoor(sceneId, base.door)) {
    const scene = getScene(sceneId, base.door)
    let next = base
    if (scene.hubId && base.hubId !== scene.hubId) next = { ...next, hubId: scene.hubId }
    if (scene.chapterId && base.chapterId !== scene.chapterId) next = { ...next, chapterId: scene.chapterId }
    return next
  }
  const scene = getScene(sceneId, base.door)
  const next: GameState = { ...base, sceneId }
  if (scene.id === 'missing') {
    const home = doorHomeScene(state.door, { hunger: inHunger(state) && !landed(state), landed: landed(state) })
    next.sceneId = home.sceneId
    next.hubId = home.hubId
    next.chapterId = home.chapterId
    return next
  }
  next.sceneId = scene.id
  if (scene.hubId) next.hubId = scene.hubId
  else if (scene.chapterId === 'cache-run') next.hubId = null
  if (scene.chapterId) next.chapterId = scene.chapterId
  else if (scene.hubId && next.chapterId === 'cache-run' && !next.sceneId.startsWith('ch1:')) next.chapterId = null
  return next
}

export function repairedSlotChanged(before: GameState, after: GameState): boolean {
  if (before.sceneId !== after.sceneId || before.hubId !== after.hubId || before.chapterId !== after.chapterId) return true
  return EQUIP_SLOTS.some((slot) => (before.equipped?.[slot] ?? null) !== (after.equipped?.[slot] ?? null))
}

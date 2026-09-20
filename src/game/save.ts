import type { DoorId, GameState } from './types'

export const LEGACY_SAVE_KEY = 'amber-shroud.save.v1'
export const SAVE_BANK_KEY = 'amber-shroud.save.v2'

export const DOOR_ORDER: DoorId[] = ['prisoner', 'outcast', 'vessel']

export const DOOR_SLOT_LABEL: Record<DoorId, string> = {
  prisoner: 'Prisoner',
  outcast: 'Outcast',
  vessel: 'Vessel',
}

type SaveBank = {
  version: 2
  lastDoor?: DoorId
  slots: Partial<Record<DoorId, GameState>>
}

type Store = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const memory = new Map<string, string>()

function storage(): Store {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* private mode */
  }
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value)
    },
    removeItem: (key) => {
      memory.delete(key)
    },
  }
}

function emptyBank(): SaveBank {
  return { version: 2, slots: {} }
}

function isDoor(id: unknown): id is DoorId {
  return id === 'prisoner' || id === 'outcast' || id === 'vessel'
}

function hydrate(parsed: GameState): GameState | null {
  if (parsed?.version !== 1 || !isDoor(parsed.door) || !parsed.sceneId) return null
  if (!parsed.equipped) parsed.equipped = {}
  if (!parsed.recentVerbs) parsed.recentVerbs = []
  return parsed
}

function consumeLegacy(bank: SaveBank, store: Store): boolean {
  const raw = store.getItem(LEGACY_SAVE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as GameState
    const state = hydrate(parsed)
    if (state && !bank.slots[state.door]) {
      bank.slots[state.door] = state
      if (!bank.lastDoor) bank.lastDoor = state.door
    }
  } catch {
    /* junk blob — drop it */
  }
  store.removeItem(LEGACY_SAVE_KEY)
  return true
}

function readBank(): SaveBank {
  const store = storage()
  let bank = emptyBank()
  const raw = store.getItem(SAVE_BANK_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SaveBank
      if (parsed?.version === 2 && parsed.slots && typeof parsed.slots === 'object') {
        bank = { version: 2, lastDoor: isDoor(parsed.lastDoor) ? parsed.lastDoor : undefined, slots: {} }
        for (const id of DOOR_ORDER) {
          const slot = parsed.slots[id]
          if (slot) {
            const state = hydrate(slot)
            if (state) bank.slots[id] = state
          }
        }
      }
    } catch {
      bank = emptyBank()
    }
  }
  if (consumeLegacy(bank, store)) writeBank(bank, store)
  return bank
}

function writeBank(bank: SaveBank, store = storage()): void {
  try {
    store.setItem(SAVE_BANK_KEY, JSON.stringify(bank))
  } catch {
    // private mode / quota — game still runs for the session
  }
}

export function listSaves(): DoorId[] {
  const slots = readBank().slots
  return DOOR_ORDER.filter((id) => !!slots[id])
}

export function hasSave(): boolean {
  return listSaves().length > 0
}

export function hasDoorSave(door: DoorId): boolean {
  return !!readBank().slots[door]
}

export function lastSavedDoor(): DoorId | null {
  const bank = readBank()
  if (bank.lastDoor && bank.slots[bank.lastDoor]) return bank.lastDoor
  return listSaves()[0] ?? null
}

export function loadDoor(door: DoorId): GameState | null {
  const bank = readBank()
  const state = bank.slots[door]
  if (!state) return null
  if (bank.lastDoor !== door) {
    bank.lastDoor = door
    writeBank(bank)
  }
  return state
}

export function loadSave(): GameState | null {
  const door = lastSavedDoor()
  return door ? loadDoor(door) : null
}

export function writeSave(state: GameState): void {
  if (!isDoor(state.door)) return
  const bank = readBank()
  bank.slots[state.door] = state
  bank.lastDoor = state.door
  writeBank(bank)
}

/** Clear one door's slot. Other doors stay. */
export function clearSave(door: DoorId): void {
  const bank = readBank()
  delete bank.slots[door]
  if (bank.lastDoor === door) {
    const rest = listSavesFrom(bank)
    if (rest[0]) bank.lastDoor = rest[0]
    else delete bank.lastDoor
  }
  writeBank(bank)
}

function listSavesFrom(bank: SaveBank): DoorId[] {
  return DOOR_ORDER.filter((id) => !!bank.slots[id])
}

/** Wipe Prisoner, Outcast, and Vessel. Explicit only. */
export function clearAllSaves(): void {
  const store = storage()
  try {
    store.removeItem(SAVE_BANK_KEY)
    store.removeItem(LEGACY_SAVE_KEY)
  } catch {
    /* ignore */
  }
  memory.clear()
}

/** Test helper: plant an old single-slot blob so migrate can run once. */
export function plantLegacySave(state: GameState): void {
  const store = storage()
  store.setItem(LEGACY_SAVE_KEY, JSON.stringify(state))
}

export function peekLegacySave(): string | null {
  return storage().getItem(LEGACY_SAVE_KEY)
}

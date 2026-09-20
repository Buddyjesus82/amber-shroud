import type { DoorId, GameState } from './types'
import { repairLoadedState, repairedSlotChanged } from './repair'

export const LEGACY_SAVE_KEY = 'amber-shroud.save.v1'
export const SAVE_BANK_KEY = 'amber-shroud.save.v2'
const IDB_NAME = 'amber-shroud'
const IDB_STORE = 'saves'
const IDB_KEY = 'bank-v2'

export const DOOR_ORDER: DoorId[] = ['prisoner', 'outcast', 'vessel']

export const DOOR_SLOT_LABEL: Record<DoorId, string> = {
  prisoner: 'Prisoner',
  outcast: 'Outcast',
  vessel: 'Vessel',
}

export type SaveBank = {
  version: 2
  lastDoor?: DoorId
  writtenAt?: number
  slots: Partial<Record<DoorId, GameState>>
}

export type WriteStatus = {
  ok: boolean
  at: number
  disk: 'ls' | 'idb' | 'both' | 'none'
  message?: string
}

type Store = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Test / Node stand-in for localStorage. Not session RAM. */
const lsDisk = new Map<string, string>()
/** Test / Node stand-in for IndexedDB. */
const idbDisk = new Map<string, string>()

/** Last known bank this page session. Dies on cold start. Never the only copy. */
let sessionCache: SaveBank | null = null
let lastStatus: WriteStatus | null = null
let persistAsked = false
let idbChain: Promise<void> = Promise.resolve()
let dbPromise: Promise<IDBDatabase | null> | null = null

function liveLocalStorage(): Store | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* private mode */
  }
  return null
}

function lsStore(): Store {
  const live = liveLocalStorage()
  if (live) return live
  return {
    getItem: (key) => lsDisk.get(key) ?? null,
    setItem: (key, value) => {
      lsDisk.set(key, value)
    },
    removeItem: (key) => {
      lsDisk.delete(key)
    },
  }
}

function emptyBank(): SaveBank {
  return { version: 2, slots: {}, writtenAt: 0 }
}

function isDoor(id: unknown): id is DoorId {
  return id === 'prisoner' || id === 'outcast' || id === 'vessel'
}

function hydrate(parsed: GameState): GameState | null {
  if (parsed?.version !== 1 || !isDoor(parsed.door) || !parsed.sceneId) return null
  if (!parsed.equipped) parsed.equipped = {}
  if (!parsed.recentVerbs) parsed.recentVerbs = []
  if (typeof parsed.healthMax !== 'number' || parsed.healthMax < 1) parsed.healthMax = 6
  if (typeof parsed.health !== 'number') parsed.health = parsed.healthMax
  if (parsed.health > parsed.healthMax) parsed.health = parsed.healthMax
  if (parsed.health < 0) parsed.health = 0
  return repairLoadedState(parsed)
}

function parseBank(raw: string | null): SaveBank | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SaveBank
    if (parsed?.version !== 2 || !parsed.slots || typeof parsed.slots !== 'object') return null
    const bank: SaveBank = {
      version: 2,
      lastDoor: isDoor(parsed.lastDoor) ? parsed.lastDoor : undefined,
      writtenAt: typeof parsed.writtenAt === 'number' ? parsed.writtenAt : 0,
      slots: {},
    }
    for (const id of DOOR_ORDER) {
      const slot = parsed.slots[id]
      if (slot) {
        const state = hydrate(slot)
        if (state) bank.slots[id] = state
      }
    }
    return bank
  } catch {
    return null
  }
}

function sameBank(a: SaveBank | null, b: SaveBank): boolean {
  if (!a) return false
  if ((a.lastDoor ?? null) !== (b.lastDoor ?? null)) return false
  for (const id of DOOR_ORDER) {
    const sa = a.slots[id]
    const sb = b.slots[id]
    if (!sa && !sb) continue
    if (!sa || !sb) return false
    if (sa.sceneId !== sb.sceneId || sa.updatedAt !== sb.updatedAt) return false
  }
  return true
}

function bankTime(bank: SaveBank): number {
  let max = bank.writtenAt ?? 0
  for (const id of DOOR_ORDER) {
    const at = bank.slots[id]?.updatedAt ?? 0
    if (at > max) max = at
  }
  return max
}

/** Node smoke has no window storage. Never treat RAM as disk in the browser. */
function testDisk(): boolean {
  return typeof indexedDB === 'undefined' && typeof localStorage === 'undefined'
}

function listSavesFrom(bank: SaveBank): DoorId[] {
  return DOOR_ORDER.filter((id) => !!bank.slots[id])
}

function mergeBanks(a: SaveBank | null, b: SaveBank | null): SaveBank {
  const left = a ?? emptyBank()
  const right = b ?? emptyBank()
  const out = emptyBank()
  for (const id of DOOR_ORDER) {
    const sa = left.slots[id]
    const sb = right.slots[id]
    if (sa && sb) out.slots[id] = (sa.updatedAt ?? 0) >= (sb.updatedAt ?? 0) ? sa : sb
    else out.slots[id] = sa ?? sb
  }
  const newer = bankTime(left) >= bankTime(right) ? left : right
  const prefer = newer.lastDoor && out.slots[newer.lastDoor] ? newer.lastDoor : listSavesFrom(out)[0]
  if (prefer) out.lastDoor = prefer
  out.writtenAt = Math.max(bankTime(left), bankTime(right))
  return out
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
      bank.writtenAt = Math.max(bank.writtenAt ?? 0, state.updatedAt ?? Date.now())
    }
  } catch {
    /* junk blob — drop it */
  }
  store.removeItem(LEGACY_SAVE_KEY)
  return true
}

function readLocalBank(): SaveBank | null {
  if (!liveLocalStorage() && !testDisk()) return null
  return parseBank(lsStore().getItem(SAVE_BANK_KEY))
}

function writeLocalVerified(bank: SaveBank): boolean {
  if (!liveLocalStorage() && !testDisk()) return false
  const json = JSON.stringify(bank)
  const store = lsStore()
  try {
    store.setItem(SAVE_BANK_KEY, json)
    const back = store.getItem(SAVE_BANK_KEY)
    if (back === json) return true
    if (back) {
      const again = JSON.stringify(parseBank(back))
      const expect = JSON.stringify(parseBank(json))
      if (again && expect && again === expect) return true
    }
    store.setItem(SAVE_BANK_KEY, json)
    return store.getItem(SAVE_BANK_KEY) === json
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

async function readIdbBank(): Promise<SaveBank | null> {
  const db = await openDb()
  if (!db) return testDisk() ? parseBank(idbDisk.get(IDB_KEY) ?? null) : null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => {
        const val = req.result
        if (typeof val === 'string') resolve(parseBank(val))
        else if (val && typeof val === 'object') resolve(parseBank(JSON.stringify(val)))
        else resolve(null)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function writeIdbOnce(bank: SaveBank): Promise<boolean> {
  const json = JSON.stringify(bank)
  const db = await openDb()
  if (!db) {
    if (!testDisk()) return false
    idbDisk.set(IDB_KEY, json)
    return idbDisk.get(IDB_KEY) === json
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(json, IDB_KEY)
      tx.oncomplete = async () => {
        const check = await readIdbBank()
        resolve(sameBank(check, bank))
      }
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

async function writeIdbVerified(bank: SaveBank): Promise<boolean> {
  if (await writeIdbOnce(bank)) return true
  return writeIdbOnce(bank)
}

async function removeIdb(): Promise<void> {
  idbDisk.delete(IDB_KEY)
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

function askPersist(): void {
  if (persistAsked) return
  persistAsked = true
  try {
    const persist = navigator.storage?.persist
    if (typeof persist === 'function') void persist.call(navigator.storage)
  } catch {
    /* unsupported */
  }
}

function queueIdbOp<T>(op: () => Promise<T>): Promise<T> {
  const job = idbChain.then(op, op)
  idbChain = job.then(
    () => undefined,
    () => undefined,
  )
  return job
}

function queueIdb(bank: SaveBank): Promise<boolean> {
  return queueIdbOp(() => writeIdbVerified(bank).catch(() => false))
}

function stamp(bank: SaveBank): SaveBank {
  return { ...bank, writtenAt: Date.now() }
}

function readBank(): SaveBank {
  if (sessionCache && listSavesFrom(sessionCache).length > 0) return sessionCache
  let bank = readLocalBank() ?? emptyBank()
  if (liveLocalStorage() || testDisk()) {
    if (consumeLegacy(bank, lsStore())) {
      bank = stamp(bank)
      writeLocalVerified(bank)
      void queueIdb(bank)
    }
  }
  sessionCache = bank
  return bank
}

function commitBank(bank: SaveBank): WriteStatus {
  sessionCache = bank
  const lsOk = writeLocalVerified(bank)
  const at = Date.now()
  lastStatus = {
    ok: lsOk,
    at,
    disk: lsOk ? 'ls' : 'none',
    message: lsOk ? undefined : 'Could not save on this phone.',
  }
  void queueIdbOp(async () => {
    const idbOk = await writeIdbVerified(bank).catch(() => false)
    if (lsOk && idbOk) lastStatus = { ok: true, at, disk: 'both' }
    else if (lsOk) lastStatus = { ok: true, at, disk: 'ls' }
    else if (idbOk) lastStatus = { ok: true, at, disk: 'idb' }
    else lastStatus = { ok: false, at, disk: 'none', message: 'Could not save on this phone.' }
    if (lsOk || idbOk) askPersist()
  })
  if (lsOk) askPersist()
  return lastStatus
}

export function lastWriteStatus(): WriteStatus | null {
  return lastStatus
}

export function lastSavedAt(): number | null {
  const t = bankTime(readBank())
  return t > 0 ? t : null
}

export function listSaves(): DoorId[] {
  return listSavesFrom(readBank())
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
  const fixed = repairLoadedState(state)
  if (repairedSlotChanged(state, fixed) || bank.lastDoor !== door) {
    bank.slots[door] = fixed
    bank.lastDoor = door
    commitBank(stamp(bank))
  }
  return fixed
}

export function loadSave(): GameState | null {
  const door = lastSavedDoor()
  return door ? loadDoor(door) : null
}

export function writeSave(state: GameState): WriteStatus {
  if (!isDoor(state.door)) {
    return { ok: false, at: Date.now(), disk: 'none', message: 'Could not save on this phone.' }
  }
  const bank = readBank()
  bank.slots[state.door] = state
  bank.lastDoor = state.door
  return commitBank(stamp(bank))
}

export async function flushSave(state: GameState | null): Promise<WriteStatus | null> {
  if (state) writeSave(state)
  await idbChain
  return lastStatus
}

/** Merge localStorage + IndexedDB. Prefer newer updatedAt / lastDoor. */
export async function hydrateSaves(): Promise<SaveBank> {
  const store = lsStore()
  let local = readLocalBank() ?? emptyBank()
  consumeLegacy(local, store)
  const remote = await readIdbBank()
  const merged = mergeBanks(local, remote)
  sessionCache = merged
  if (listSavesFrom(merged).length) {
    writeLocalVerified(merged)
    await queueIdb(merged)
    askPersist()
  }
  return merged
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
  commitBank(stamp(bank))
}

/** Wipe Prisoner, Outcast, and Vessel. Explicit only. */
export function clearAllSaves(): void {
  sessionCache = null
  lastStatus = null
  const store = lsStore()
  try {
    store.removeItem(SAVE_BANK_KEY)
    store.removeItem(LEGACY_SAVE_KEY)
  } catch {
    /* ignore */
  }
  lsDisk.delete(SAVE_BANK_KEY)
  lsDisk.delete(LEGACY_SAVE_KEY)
  void queueIdbOp(() => removeIdb())
}

/** Test helper: plant an old single-slot blob so migrate can run once. */
export function plantLegacySave(state: GameState): void {
  sessionCache = null
  lsStore().setItem(LEGACY_SAVE_KEY, JSON.stringify(state))
}

export function peekLegacySave(): string | null {
  return lsStore().getItem(LEGACY_SAVE_KEY)
}

/** Drop RAM only — disk copies must still load. */
export function clearSessionCache(): void {
  sessionCache = null
}

/** Simulate iOS wiping localStorage overnight. IndexedDB stays. */
export function clearLocalDiskOnly(): void {
  try {
    liveLocalStorage()?.removeItem(SAVE_BANK_KEY)
    liveLocalStorage()?.removeItem(LEGACY_SAVE_KEY)
  } catch {
    /* ignore */
  }
  lsDisk.delete(SAVE_BANK_KEY)
  lsDisk.delete(LEGACY_SAVE_KEY)
}

export function formatSavedAt(ts: number | null): string | null {
  if (!ts) return null
  const d = Date.now() - ts
  if (d < 45_000) return 'just now'
  if (d < 3_600_000) {
    const m = Math.max(1, Math.floor(d / 60_000))
    return `${m} min ago`
  }
  if (d < 86_400_000) {
    const h = Math.max(1, Math.floor(d / 3_600_000))
    return `${h} hr ago`
  }
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return 'earlier'
  }
}

import { getScene } from './content'
import { HUBS } from './content/catalog'
import { CRUCIBLE_SCENES } from './content/crucible'
import { HUB_MAPS } from './content/maps'
import { isPressureOverlay } from './hunter'
import type { GameState, HubMapDef, HubMapEdge, HubMapNode } from './types'

export { HUB_MAPS }

/** Chapter 2 keeps hubId empty so the old roads stay shut. The sheet is chosen from the door and the scene. */
export function chapterTwoHub(state: { door?: GameState['door']; sceneId?: string; chapterId?: string | null }): 'ch2p' | 'ch2o' | 'ch2v' | null {
  const id = state.sceneId ?? ''
  const inCh2 = state.chapterId === 'into-the-maw' || id.startsWith('ch2:')
  if (!inCh2 || id === 'ch2:gate' || id === 'ch2:stub') return null
  if (id.startsWith('ch2:p-')) return 'ch2p'
  if (id.startsWith('ch2:o-')) return 'ch2o'
  if (id.startsWith('ch2:v-')) return 'ch2v'
  if (state.door === 'prisoner') return 'ch2p'
  if (state.door === 'outcast') return 'ch2o'
  if (state.door === 'vessel') return 'ch2v'
  return null
}

export function hubMapOf(state: GameState): HubMapDef | null {
  const ch2 = chapterTwoHub(state)
  if (ch2) return HUB_MAPS[ch2] ?? null
  if (!state.hubId) return null
  return HUB_MAPS[state.hubId] ?? null
}

export function nodeById(map: HubMapDef, id: string): HubMapNode | undefined {
  return map.nodes.find((n) => n.id === id)
}

export function nodeIdForScene(map: HubMapDef, sceneId: string, fallback = false): string | null {
  if (map.sceneNode[sceneId]) return map.sceneNode[sceneId]
  const hit = map.nodes.find((n) => n.sceneId === sceneId)
  if (hit) return hit.id
  return fallback ? map.defaultNode : null
}

export type CompassMove = {
  dir: 'North' | 'South' | 'East' | 'West'
  name: string
  sceneId: string
}

function dirOf(dx: number, dy: number): CompassMove['dir'] {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'East' : 'West') : dy > 0 ? 'South' : 'North'
}

/** Connected roads off this exact scene. No fallback node — a talk card is not a crossroads. */
export function compassMoves(state: GameState): CompassMove[] {
  const map = hubMapOf(state)
  if (!map?.ready) return []
  const nodeId = nodeIdForScene(map, state.sceneId, false)
  if (!nodeId) return []
  const node = nodeById(map, nodeId)
  if (!node) return []
  const out: CompassMove[] = []
  for (const link of adjacency(map).get(node.id) ?? []) {
    const other = nodeById(map, link.id)
    if (!other || other.sceneId === state.sceneId) continue
    const dx = other.x - node.x
    const dy = other.y - node.y
    out.push({ dir: dirOf(dx, dy), name: other.name, sceneId: other.sceneId })
  }
  return out
}

function normMove(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Typed north/south/east/west. Ambiguous directions need the place name. */
export function matchCompass(state: GameState, text: string): CompassMove | null {
  const hay = normMove(text)
  if (!hay) return null
  const moves = compassMoves(state)
  for (const move of moves) {
    const dir = move.dir.toLowerCase()
    const name = normMove(move.name)
    const named = [`go ${dir} to ${name}`, `walk ${dir} to ${name}`, `${dir} to ${name}`]
    if (named.includes(hay)) return move
    const same = moves.filter((m) => m.dir === move.dir)
    if (same.length === 1 && (hay === dir || hay === `go ${dir}` || hay === `walk ${dir}` || hay === `head ${dir}`)) {
      return move
    }
  }
  return null
}

export function compassCommand(moves: CompassMove[], move: CompassMove): string {
  const dir = move.dir.toLowerCase()
  const same = moves.filter((m) => m.dir === move.dir)
  if (same.length > 1) return `go ${dir} to ${move.name}`
  return `go ${dir}`
}

/** N/S/E/W off this scene. Shared directions stay on one label. */
export function compassLine(state: GameState): string {
  const map = hubMapOf(state)
  if (!map?.ready) return 'No marked road. The choices in front of you are the way.'
  const moves = compassMoves(state)
  if (!moves.length) {
    const nodeId = nodeIdForScene(map, state.sceneId, false)
    if (!nodeId) return 'No marked road. The choices in front of you are the way.'
    return 'No marked road off this ground.'
  }
  const grouped = new Map<CompassMove['dir'], string[]>()
  for (const move of moves) {
    const names = grouped.get(move.dir) ?? []
    if (!names.includes(move.name)) names.push(move.name)
    grouped.set(move.dir, names)
  }
  return [...grouped.entries()].map(([dir, names]) => `${dir}: ${names.join(', ')}`).join('. ') + '.'
}

export function currentNode(state: GameState): HubMapNode | null {
  const map = hubMapOf(state)
  if (!map) return null
  const from = state.flags.hunterFrom
  const prefer =
    (state.sceneId === 'camp:hunter' || state.flags.hunterHere) && typeof from === 'string' && from
      ? from
      : state.sceneId
  // v219: an off-map screen (a gate, a crisis, a place past the sheet's edge) holds the last pin, not the hub default.
  const pin = state.flags[MAP_HERE_FLAG]
  const held = typeof pin === 'string' && pin.startsWith(`${map.hubId}:`) ? pin.slice(map.hubId.length + 1) : null
  const onSheet = nodeIdForScene(map, prefer)
  // Off the Chapter 2 sheet (the cache, the heart): do not pretend you are still at the first node.
  const id = onSheet ?? (held && nodeById(map, held) ? held : chapterTwoHub(state) ? null : map.defaultNode)
  return id ? (nodeById(map, id) ?? null) : null
}

export function adjacency(map: HubMapDef): Map<string, { id: string; sap: number }[]> {
  const g = new Map<string, { id: string; sap: number }[]>()
  for (const n of map.nodes) g.set(n.id, [])
  for (const e of map.edges) {
    const sap = e.sap ?? 1
    g.get(e.a)?.push({ id: e.b, sap })
    if (!e.oneWay) g.get(e.b)?.push({ id: e.a, sap })
  }
  return g
}

export function edgeBetween(map: HubMapDef, a: string, b: string): HubMapEdge | null {
  return map.edges.find((e) => (e.a === a && e.b === b) || (!e.oneWay && e.a === b && e.b === a)) ?? null
}

export function edgeSap(map: HubMapDef, a: string, b: string): number | null {
  if (a === b) return 0
  const e = edgeBetween(map, a, b)
  return e ? (e.sap ?? 1) : null
}

export function route(map: HubMapDef, from: string, to: string): string[] | null {
  if (from === to) return [from]
  const adj = adjacency(map)
  const q: string[][] = [[from]]
  const seen = new Set([from])
  while (q.length) {
    const path = q.shift()!
    const last = path[path.length - 1]
    for (const n of adj.get(last) ?? []) {
      if (seen.has(n.id)) continue
      const next = [...path, n.id]
      if (n.id === to) return next
      seen.add(n.id)
      q.push(next)
    }
  }
  return null
}

export type TravelGate =
  | { ok: true; sap: number; from: HubMapNode; to: HubMapNode }
  | { ok: false; reason: string }

export function travelGate(state: GameState, sceneId: string): TravelGate {
  if (state.sceneId === sceneId) {
    const here = currentNode(state)
    if (here) return { ok: true, sap: 0, from: here, to: here }
    return { ok: false, reason: 'You are already here.' }
  }
  const map = hubMapOf(state)
  if (!map) {
    return { ok: false, reason: 'No map for this ground.' }
  }
  if (!map.ready) {
    return { ok: false, reason: map.coming ?? 'This ground is not mapped yet.' }
  }
  const fromId = currentNode(state)?.id
  const toId = nodeIdForScene(map, sceneId, false)
  const from = fromId ? nodeById(map, fromId) : null
  const to = toId ? nodeById(map, toId) : null
  if (!from || !to) {
    return { ok: false, reason: 'That ground is not on this map.' }
  }
  if (from.id === to.id) {
    return { ok: true, sap: 0, from, to }
  }
  const sap = edgeSap(map, from.id, to.id)
  if (sap == null) {
    return {
      ok: false,
      reason: `No road from ${from.name} to ${to.name}. Walk the connected routes.`,
    }
  }
  return { ok: true, sap, from, to }
}

export function canTravelTo(state: GameState, sceneId: string): boolean {
  return travelGate(state, sceneId).ok
}

export function isMawExit(state: GameState): boolean {
  const map = hubMapOf(state)
  if (!map?.ready) return true
  return !!currentNode(state)?.mawExit
}

/** Each hub sheet starts blank and fills in as you walk it, until its map is taken.
 * Camp-04: the Overlook. Spine: Silas's Shade. Threshold: Cup-Shadow. Red Maw: the Rim. Barrow: the Sunken Relay.
 * Chapter 2: Miller's Repair Bays, the Sifter Hermit, and Valerius's Outpost. */
export const CAMP_MAP_FLAG = 'camp04Map'
export const CAMP_SEEN_FLAG = 'camp04Seen'
export const FOG_HUBS: Record<string, { seen: string; full: string }> = {
  camp04: { seen: CAMP_SEEN_FLAG, full: CAMP_MAP_FLAG },
  spine: { seen: 'spineSeen', full: 'spineMap' },
  threshold: { seen: 'threshSeen', full: 'threshMap' },
  barrow: { seen: 'barrowSeen', full: 'barrowMap' },
  redmaw: { seen: 'mawSeen', full: 'mawMap' },
  ch2p: { seen: 'ch2pSeen', full: 'ch2pMap' },
  ch2o: { seen: 'ch2oSeen', full: 'ch2oMap' },
  ch2v: { seen: 'ch2vSeen', full: 'ch2vMap' },
}
/** v222: a Barrow Trails story scene the map must not open before its beat.
 * v229: the collared wagon has no road out until Wait (then only Supply). The Exit stays sealed after capture. */
export function ch3MapLocked(state: Pick<GameState, 'flags' | 'sceneId'>, sceneId: string): boolean {
  if (sceneId === 'ch3:capture' && (state.flags.ch3Stripped || state.flags.ch3Started)) return true
  if (state.sceneId === 'ch3:wagon' && !state.flags.ch3Out) {
    if (sceneId === 'ch3:supply' && state.flags.ch3Waited) return false
    return true
  }
  if (sceneId === 'ch3:wagon') return !state.flags.ch3Stripped
  // v228: Wait closes Slip. The 1-Sap walk to the supply wagon is the way on. Arrival still opens the rest.
  if (sceneId === 'ch3:supply') return !state.flags.ch3SupplyOpen && !state.flags.ch3Waited
  if (sceneId === 'ch3:tent') return !state.flags.ch3TentOpen
  if (sceneId === 'ch3:crosshaven') return !state.flags.ch3VaultDone
  return false
}

/** Chapter 2 map hops follow the story's own doors. A gated beat stays shut until that door is open. */
export function ch2MapLocked(state: GameState, sceneId: string): boolean {
  const hub = chapterTwoHub(state)
  if (!hub) return false
  const map = HUB_MAPS[hub]
  if (!map) return false
  if (!nodeIdForScene(map, sceneId, false)) return sceneId.startsWith('ch2:')
  const hereId = nodeIdForScene(map, state.sceneId, false)
  const destId = nodeIdForScene(map, sceneId, false)
  if (!hereId || !destId || hereId === destId) return false
  if (edgeSap(map, hereId, destId) == null) return false
  return !ch2RoadOpen(state, state.sceneId, sceneId)
}

function ch2RoadOpen(state: GameState, from: string, to: string): boolean {
  const f = state.flags
  const hop = `${from}>${to}`
  const drill = !!f.drillPast
  const shaftBack = !f.murchScrap && !f.vexFreed && !f.murchAbandoned
  switch (hop) {
    case 'ch2:p-jaws>ch2:p-haul':
    case 'ch2:p-haul>ch2:p-bays':
    case 'ch2:p-bays>ch2:p-sift':
    case 'ch2:p-sift>ch2:p-bays':
    case 'ch2:p-bays>ch2:p-bilge':
    case 'ch2:p-bilge>ch2:p-bays':
    case 'ch2:p-sift>ch2:p-bilge':
    case 'ch2:p-bilge>ch2:p-supply':
    case 'ch2:p-supply>ch2:p-shaft':
    case 'ch2:o-wash>ch2:o-stakes':
    case 'ch2:o-stakes>ch2:o-root':
    case 'ch2:o-root>ch2:o-strays':
    case 'ch2:o-strays>ch2:o-root':
    case 'ch2:o-root>ch2:o-cage':
    case 'ch2:o-cage>ch2:o-root':
    case 'ch2:o-bounty>ch2:o-root':
    case 'ch2:o-root>ch2:o-stilts':
    case 'ch2:o-stilts>ch2:o-root':
    case 'ch2:o-hermit>ch2:o-root':
    case 'ch2:v-test>ch2:v-outpost':
    case 'ch2:v-garden>ch2:v-outpost':
    case 'ch2:v-bleed>ch2:v-outpost':
    case 'ch2:v-murch>ch2:v-outpost':
    case 'ch2:v-greg>ch2:v-outpost':
    case 'ch2:v-hidden>ch2:v-outpost':
      return true
    case 'ch2:v-outpost>ch2:v-hidden':
      return !!f.hasBargainFlag && !f.coverBlown
    case 'ch2:p-bays>ch2:p-shaft':
      return !!f.murchScrap
    case 'ch2:p-shaft>ch2:p-bays':
      return shaftBack
    case 'ch2:p-drillrun>ch2:p-abyss':
    case 'ch2:o-hounds>ch2:o-abyss':
      return drill
    case 'ch2:o-root>ch2:o-bounty':
      return !f.bountyFooled && !f.bountyBroken
    case 'ch2:o-root>ch2:o-hermit':
      return !f.hermitTraded
    case 'ch2:v-scar>ch2:v-outpost':
      return !!f.gregStanding || !!f.ch2SybellaNamed
    case 'ch2:v-outpost>ch2:v-test':
      return !f.coverBlown && !f.cupPassed
    case 'ch2:v-outpost>ch2:v-garden':
      return !f.statueSiphoned
    case 'ch2:v-outpost>ch2:v-bleed':
      return !f.vexFreed
    case 'ch2:v-outpost>ch2:v-murch':
      return !f.coverBlown && !f.murchProtected && !f.murchCaptured
    case 'ch2:v-outpost>ch2:v-greg':
      return !f.coverBlown && !f.gregDealt && !f.gregSold
    case 'ch2:v-bleed>ch2:v-greg':
      return !!f.vexFreed && !f.coverBlown && !f.gregDealt && !f.gregSold
    case 'ch2:v-outpost>ch2:v-stair':
      return !f.spireKey && !!f.cupPassed && (!!f.vexFreed || !!f.crateKey)
    case 'ch2:v-stair>ch2:v-outpost':
      return !(!!f.gregSold && !f.stairGregDone) && !f.coverBlown
    default:
      return false
  }
}

/** Map button: hubs, the Cache Run, and the Barrow Trails. Hidden in a fight, Down, crisis, ending, pressure, or the Crucible. */
export function showMapButton(state: GameState): boolean {
  if (typeof state.flags.cachePending === 'string') return false
  const scene = getScene(state.sceneId, state.door)
  const hub = state.hubId ? HUBS[state.hubId] : null
  const barrow = state.hubId === 'barrow' && state.sceneId.startsWith('ch3:')
  const ch2 = !!chapterTwoHub(state)
  return (
    (!!hub || state.chapterId === 'cache-run' || barrow || ch2) &&
    scene.kind !== 'crisis' &&
    scene.kind !== 'ending' &&
    !state.flags.encounterHere &&
    !state.flags.strayHunterHere &&
    !state.flags.maskedHere &&
    !state.flags.downed &&
    !isPressureOverlay(state) &&
    (state.health ?? 0) > 0 &&
    !(CRUCIBLE_SCENES as readonly string[]).includes(state.sceneId)
  )
}
/** v219: the last map node you stood on, as `hub:node`. Off-map screens hold the pin here instead of the hub default. */
export const MAP_HERE_FLAG = 'mapHere'

/** True while this hub's scrap is still drawing in (no full map in hand). */
export function fogged(state: Pick<GameState, 'flags' | 'hubId'> & Partial<Pick<GameState, 'door' | 'sceneId' | 'chapterId'>>): boolean {
  const id = chapterTwoHub(state) ?? state.hubId
  const fog = id ? FOG_HUBS[id] : undefined
  return !!fog && !state.flags[fog.full]
}

export function seenOf(state: Pick<GameState, 'flags'>, hubId: string): Set<string> {
  const key = FOG_HUBS[hubId]?.seen
  const raw = key ? state.flags[key] : undefined
  return new Set(typeof raw === 'string' && raw ? raw.split(',') : [])
}

export function campSeen(state: Pick<GameState, 'flags'>): Set<string> {
  return seenOf(state, 'camp04')
}

/** Marks the node you stand on: drawn on the scrap (fog hubs) and remembered as the last place the pin was. */
export function markCampSeen(state: GameState): GameState {
  const map = hubMapOf(state)
  if (!map) return state
  const id = map.sceneNode[state.sceneId] ?? map.nodes.find((n) => n.sceneId === state.sceneId)?.id
  if (!id) return state
  const flags: GameState['flags'] = { ...state.flags }
  let changed = false
  const pin = `${map.hubId}:${id}`
  if (flags[MAP_HERE_FLAG] !== pin) {
    flags[MAP_HERE_FLAG] = pin
    changed = true
  }
  const fog = FOG_HUBS[map.hubId]
  if (fog && !flags[fog.full]) {
    const seen = seenOf(state, map.hubId)
    if (!seen.has(id)) {
      seen.add(id)
      flags[fog.seen] = [...seen].join(',')
      changed = true
    }
  }
  return changed ? { ...state, flags } : state
}
export const markMapSeen = markCampSeen

/** The Red Maw sheet was never fogged, so an older save already shows every node. Seed that seen-list once. A new run has no Maw progress and stays fogged until the Rim map. */
export function seedMawSeen(state: GameState): GameState {
  if (state.flags.mawSeen !== undefined || state.flags.mawMap) return state
  const cp = state.checkpoint
  const stood =
    state.sceneId.startsWith('maw:') ||
    state.hubId === 'redmaw' ||
    !!cp?.sceneId?.startsWith('maw:') ||
    cp?.hubId === 'redmaw' ||
    !!state.flags.chapter1Done ||
    !!state.flags.zafirMet ||
    !!state.flags.metZafir ||
    !!state.flags.ossaMet ||
    !!state.flags.ribOpen ||
    !!state.flags.sawCacheGleam ||
    !!state.flags.hollowMarked ||
    !!state.flags.oilMended
  if (!stood) return state
  const map = HUB_MAPS.redmaw
  if (!map) return state
  return { ...state, flags: { ...state.flags, mawSeen: map.nodes.map((n) => n.id).join(',') } }
}

const CH2_PAST_SHEET = new Set([
  'ch2:approach',
  'ch2:ditch',
  'ch2:gully',
  'ch2:irongut',
  'ch2:cache',
  'ch2:ribs',
  'ch2:vein',
  'ch2:heart',
  'ch2:end',
  'ch2:trapped',
])

/** A mid-chapter save has no seen-list yet. Pin the node they are standing on so the new sheet is not blank. */
export function seedCh2Seen(state: GameState): GameState {
  const hub = chapterTwoHub(state)
  if (!hub) return state
  const fog = FOG_HUBS[hub]
  const map = HUB_MAPS[hub]
  if (!fog || !map || state.flags[fog.seen] !== undefined || state.flags[fog.full]) return state
  const here = nodeIdForScene(map, state.sceneId, false)
  if (here) return { ...state, flags: { ...state.flags, [fog.seen]: here } }
  if (!CH2_PAST_SHEET.has(state.sceneId)) return state
  return { ...state, flags: { ...state.flags, [fog.seen]: map.nodes.map((n) => n.id).join(',') } }
}

/** The map as drawn on the player's scrap: the full sheet, or only the places (and roads between them) reached so far.
 * A road out of the hub (a node whose scene is not in the hub, like the Bone Wash) shows once the place beside it is drawn. */
export function drawnMap(state: GameState): HubMapDef | null {
  const map = hubMapOf(state)
  if (!map || !fogged(state)) return map
  const seen = seenOf(state, map.hubId)
  const here = currentNode(state)?.id
  if (here) seen.add(here)
  const prefix =
    map.hubId === 'camp04' ? 'camp:' :
    map.hubId === 'spine' ? 'spine:' :
    map.hubId === 'threshold' ? 'thresh:' :
    map.hubId === 'barrow' ? 'ch3:' :
    map.hubId === 'redmaw' ? 'maw:' :
    map.hubId === 'ch2p' || map.hubId === 'ch2o' || map.hubId === 'ch2v' ? 'ch2:' :
    `${map.hubId}:`
  const exit = (id: string) => {
    const n = nodeById(map, id)
    return !!n && !n.sceneId.startsWith(prefix)
  }
  for (const e of map.edges) {
    if (seen.has(e.a) && exit(e.b)) seen.add(e.b)
    if (seen.has(e.b) && exit(e.a)) seen.add(e.a)
  }
  // A story gate keeps the next node on the scrap, and the walk stays locked.
  if (map.hubId === 'barrow') {
    for (const e of map.edges) {
      const a = nodeById(map, e.a)
      const b = nodeById(map, e.b)
      if (seen.has(e.a) && b && ch3MapLocked(state, b.sceneId)) seen.add(e.b)
      if (seen.has(e.b) && a && ch3MapLocked(state, a.sceneId)) seen.add(e.a)
    }
  }
  return {
    ...map,
    nodes: map.nodes.filter((n) => seen.has(n.id)),
    edges: map.edges.filter((e) => seen.has(e.a) && seen.has(e.b)),
  }
}

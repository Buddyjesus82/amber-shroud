import { HUB_MAPS } from './content/maps'
import type { GameState, HubMapDef, HubMapEdge, HubMapNode } from './types'

export { HUB_MAPS }

export function hubMapOf(state: GameState): HubMapDef | null {
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

export function currentNode(state: GameState): HubMapNode | null {
  const map = hubMapOf(state)
  if (!map) return null
  const from = state.flags.hunterFrom
  const prefer =
    (state.sceneId === 'camp:hunter' || state.flags.hunterHere) && typeof from === 'string' && from
      ? from
      : state.sceneId
  const id = nodeIdForScene(map, prefer, true)
  return id ? (nodeById(map, id) ?? null) : null
}

export function adjacency(map: HubMapDef): Map<string, { id: string; sap: number }[]> {
  const g = new Map<string, { id: string; sap: number }[]>()
  for (const n of map.nodes) g.set(n.id, [])
  for (const e of map.edges) {
    const sap = e.sap ?? 1
    g.get(e.a)?.push({ id: e.b, sap })
    g.get(e.b)?.push({ id: e.a, sap })
  }
  return g
}

export function edgeBetween(map: HubMapDef, a: string, b: string): HubMapEdge | null {
  return map.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)) ?? null
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
  const fromId = nodeIdForScene(map, state.sceneId, true)
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

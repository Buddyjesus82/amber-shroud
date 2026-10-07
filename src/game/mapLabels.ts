/**
 * Map label placement: every location label sits directly above or below its marker.
 * Pick the side per node so labels avoid each other, the frame, other markers, the
 * "you are here" mark, the exit label, the compass note, and (softly) the road lines.
 * Pure: the Map sheet feeds it measured label sizes; smoke feeds it estimates.
 */

export type LabelSide = 'above' | 'below'

export type LabelNode = {
  id: string
  /** Marker centre, px inside the map frame. */
  x: number
  y: number
  /** Label box size, px. */
  w: number
  h: number
  here?: boolean
  /** Hand override from the map data. */
  side?: LabelSide
}

export type Box = { x: number; y: number; w: number; h: number }

export type LabelPlacement = {
  side: LabelSide
  /** Horizontal shift from centred, px, to keep the label inside the frame. */
  dx: number
  /** Final box, px. */
  box: Box
}

export type LabelLayoutInput = {
  width: number
  height: number
  nodes: LabelNode[]
  edges: Array<[number, number, number, number]>
  /** Fixed boxes labels must avoid (exit label, compass note). */
  obstacles?: Box[]
}

/** Marker radius and the gap between marker edge and its label. */
export const MARKER_R = 7
export const LABEL_GAP = 4
/** The "you are here" ring is bigger than a plain marker. */
export const HERE_R = 17
/** Keep labels this far inside the frame (the scrap edge is torn). */
export const FRAME_PAD = 6

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

function outside(b: Box, W: number, H: number): number {
  const inner = { x: FRAME_PAD, y: FRAME_PAD, w: W - FRAME_PAD * 2, h: H - FRAME_PAD * 2 }
  return b.w * b.h - overlap(b, inner)
}

function segmentHits(b: Box, [x1, y1, x2, y2]: [number, number, number, number]): number {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(2, Math.ceil(len / 3))
  let hits = 0
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const px = x1 + (x2 - x1) * t
    const py = y1 + (y2 - y1) * t
    if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) hits++
  }
  return hits
}

/** Box for one node on one side, clamped horizontally into the frame. */
export function labelBox(n: LabelNode, side: LabelSide, W: number, H: number): LabelPlacement {
  const r = (n.here ? HERE_R : MARKER_R) + LABEL_GAP
  const cx = n.x - n.w / 2
  const minX = FRAME_PAD
  const maxX = Math.max(minX, W - FRAME_PAD - n.w)
  const x = Math.min(Math.max(cx, minX), maxX)
  let y = side === 'above' ? n.y - r - n.h : n.y + r
  // Last resort: never past the frame vertically.
  y = Math.min(Math.max(y, FRAME_PAD), Math.max(FRAME_PAD, H - FRAME_PAD - n.h))
  return { side, dx: Math.round(x - cx), box: { x, y, w: n.w, h: n.h } }
}

function markerBox(n: LabelNode): Box {
  const r = n.here ? HERE_R : MARKER_R
  return { x: n.x - r, y: n.y - r, w: r * 2, h: r * 2 }
}

/** Penalty of one label box (used for the search and for tests). */
function boxCost(i: number, b: Box, sideRaw: Box, input: LabelLayoutInput, placed: Box[]): number {
  const { width: W, height: H, nodes, edges, obstacles = [] } = input
  let cost = 0
  // Clamped vertically = it could not sit where it wanted: as bad as leaving the frame.
  if (Math.abs(sideRaw.y - b.y) > 0.5) cost += Math.abs(sideRaw.y - b.y) * b.w * 4
  cost += outside(b, W, H) * 40
  for (let j = 0; j < nodes.length; j++) {
    if (j === i) continue
    cost += overlap(b, markerBox(nodes[j])) * 12
  }
  for (const o of obstacles) cost += overlap(b, o) * 14
  for (const p of placed) cost += overlap(b, p) * 20
  for (const e of edges) cost += segmentHits(b, e) * 6
  return cost
}

/**
 * Best side per node (exhaustive over above/below; maps have at most ~8 nodes).
 * A node with a hand `side` keeps it.
 */
export function layoutLabels(input: LabelLayoutInput): LabelPlacement[] {
  const { width: W, height: H, nodes } = input
  const n = nodes.length
  const options = nodes.map((node) => {
    const sides: LabelSide[] = node.side ? [node.side] : ['below', 'above']
    return sides.map((s) => {
      const p = labelBox(node, s, W, H)
      const r = (node.here ? HERE_R : MARKER_R) + LABEL_GAP
      const raw = { ...p.box, y: s === 'above' ? node.y - r - node.h : node.y + r }
      return { p, raw }
    })
  })
  let best: LabelPlacement[] = options.map((o) => o[0].p)
  let bestCost = Infinity
  const total = options.reduce((acc, o) => acc * o.length, 1)
  for (let mask = 0; mask < total; mask++) {
    let m = mask
    const pick: { p: LabelPlacement; raw: Box }[] = []
    for (let i = 0; i < n; i++) {
      const k = options[i].length
      pick.push(options[i][m % k])
      m = Math.floor(m / k)
    }
    let cost = 0
    const placed: Box[] = []
    for (let i = 0; i < n; i++) {
      const { p, raw } = pick[i]
      cost += boxCost(i, p.box, raw, input, placed)
      // Tie-break: labels read best under their marker.
      if (p.side === 'above') cost += 0.5
      placed.push(p.box)
      if (cost >= bestCost) break
    }
    if (cost < bestCost) {
      bestCost = cost
      best = pick.map((x) => x.p)
    }
  }
  return best
}

/** Overlap report for a finished layout (smoke uses it to check every map). */
export function layoutProblems(input: LabelLayoutInput, placed: LabelPlacement[]): string[] {
  const out: string[] = []
  const { width: W, height: H, nodes, obstacles = [] } = input
  placed.forEach((p, i) => {
    const id = nodes[i].id
    if (outside(p.box, W, H) > 0.5) out.push(`${id} label leaves the frame`)
    nodes.forEach((m, j) => {
      if (j !== i && overlap(p.box, markerBox(m)) > 0.5) out.push(`${id} label covers ${m.id} marker`)
    })
    obstacles.forEach((o, k) => {
      if (overlap(p.box, o) > 0.5) out.push(`${id} label covers fixed label ${k}`)
    })
    placed.forEach((q, j) => {
      if (j > i && overlap(p.box, q.box) > 0.5) out.push(`${id} label overlaps ${nodes[j].id} label`)
    })
  })
  return out
}

/** Rough label size before the DOM can be measured (Kalam bold 18px, sub-line 13px, plate padding). */
export function estimateLabel(name: string, sub: string | null, maxW = 118): { w: number; h: number } {
  const charW = 8.6
  const pad = 12
  const words = name.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word
    if (tryLine.length * charW + pad > maxW && line) {
      lines.push(line)
      line = word
    } else line = tryLine
  }
  if (line) lines.push(line)
  const widest = Math.max(...lines.map((l) => l.length * charW), sub ? sub.length * 6.4 : 0)
  return { w: Math.min(maxW, Math.ceil(widest + pad)), h: lines.length * 19 + (sub ? 14 : 0) + 4 }
}

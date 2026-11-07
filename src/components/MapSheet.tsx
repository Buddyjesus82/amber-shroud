import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { HUBS } from '../game/content/catalog'
import { CH2_BACKTRACK, chapterTwoLocked, travelTo } from '../game/engine'
import { adjacency, ch3MapLocked, currentNode, fogged, drawnMap, edgeSap as rawEdgeSap, nodeById } from '../game/map'
import { ROAD_SAP } from '../game/returnRoad'
import { estimateLabel, layoutLabels, type Box } from '../game/mapLabels'
import type { GameState, HubMapDef, HubMapNode } from '../game/types'

/** Layout width before the frame is measured (a 390px phone). */
const GUESS_W = 340
/** Max label width: long names wrap to two lines instead of shrinking. */
const LABEL_MAX_W = 118

type Size = { w: number; h: number }

/** After Chapter One the Bone Wash node is the road back to the Maw: it costs the road's Sap, not a walk's. */
function edgeSap(map: HubMapDef, a: string, b: string, state: GameState): number | null {
  const sap = rawEdgeSap(map, a, b)
  if (sap == null) return sap
  const to = nodeById(map, b)
  return to?.sceneId === 'ch1:leave' && state.flags.chapter1Done ? ROAD_SAP : sap
}

/** Camp-04 is a bare hand sketch: names only, no road costs or exit note. */
function sketchMap(map: HubMapDef): boolean {
  return map.hubId === 'camp04'
}

function subFor(mine: boolean, sap: number | null): string {
  return mine ? 'you' : sap ? `−${sap} sap` : sap === 0 ? '' : 'far'
}

type Props = {
  state: GameState
  onChange: (s: GameState) => void
  onClose: () => void
}

/** On the Cache Run there is no hub map: the road is the heading. */
export const ROAD_MAP_LINE = 'On the road. The only map is the heading: keep walking toward Red Maw.'

export function MapSheet({ state, onChange, onClose }: Props) {
  const map = drawnMap(state)
  const here = currentNode(state)
  const [hint, setHint] = useState<string | null>(null)

  return (
    <div className="map-backdrop scrap-map" role="dialog" aria-label="Map" onClick={onClose}>
      <div className={map?.hubId === 'camp04' ? 'map-sheet scrap-sheet charcoal-scrap' : 'map-sheet scrap-sheet'} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">scavenged scrap</p>
            <h2>{map && !chapterTwoLocked(state) ? titleFor(state, map) : 'Unmapped'}</h2>
          </div>
          <button type="button" className="text-link scrap-stow" onClick={onClose}>
            Stow
          </button>
        </header>
        {chapterTwoLocked(state) ? (
          <p className="map-coming">{CH2_BACKTRACK}</p>
        ) : state.chapterId === 'cache-run' ? (
          <p className="map-coming">{ROAD_MAP_LINE}</p>
        ) : !map || !map.ready ? (
          <p className="map-coming">{map?.coming ?? 'This ground is still being scratched. Coming.'}</p>
        ) : (
          <HubMapView
            state={state}
            map={map}
            here={here}
            hint={hint}
            onHint={setHint}
            onTravel={(sceneId) => {
              onChange(travelTo(state, sceneId))
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}

function titleFor(state: GameState, map: HubMapDef) {
  if (map.hubId === 'camp04') return 'Ironwood Camp-04'
  if (map.hubId === 'spine') return 'Bleached Spine'
  if (map.hubId === 'threshold') return 'Outer Threshold'
  if (map.hubId === 'redmaw') return 'Red Maw Approach'
  if (map.hubId === 'barrow') return 'Barrow Trails'
  return state.hubId ?? 'Map'
}

function HubMapView({
  state,
  map,
  here,
  hint,
  onHint,
  onTravel,
}: {
  state: GameState
  map: HubMapDef
  here: HubMapNode | null
  hint: string | null
  onHint: (s: string | null) => void
  onTravel: (sceneId: string) => void
}) {
  const hereId = here?.id ?? null
  const adjIds = useMemo(
    () => new Set(hereId ? (adjacency(map).get(hereId) ?? []).map((n) => n.id) : []),
    [map, hereId],
  )
  const hubNote = HUBS[map.hubId]?.mawNote

  // Labels sit directly above or below their marker; the side is chosen to avoid collisions.
  const frameEl = useRef<HTMLDivElement | null>(null)
  const labelEls = useRef<Record<string, HTMLSpanElement | null>>({})
  const exitEl = useRef<HTMLSpanElement | null>(null)
  const [measured, setMeasured] = useState<{ W: number; sizes: Record<string, Size>; exit: Size } | null>(null)

  useLayoutEffect(() => {
    const el = frameEl.current
    if (!el) return
    const measure = () => {
      const W = el.clientWidth
      if (!W) return
      const sizes: Record<string, Size> = {}
      for (const n of map.nodes) {
        const lab = labelEls.current[n.id]
        if (lab) sizes[n.id] = { w: lab.offsetWidth, h: lab.offsetHeight }
      }
      const ex = exitEl.current
      const exit = ex ? { w: ex.offsetWidth, h: ex.offsetHeight } : { w: 0, h: 0 }
      setMeasured((prev) => {
        if (
          prev &&
          prev.W === W &&
          prev.exit.w === exit.w &&
          prev.exit.h === exit.h &&
          map.nodes.every((n) => prev.sizes[n.id]?.w === sizes[n.id]?.w && prev.sizes[n.id]?.h === sizes[n.id]?.h)
        ) {
          return prev
        }
        return { W, sizes, exit }
      })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    // Web fonts can land after first paint and change label widths.
    void document.fonts?.ready.then(measure)
    return () => ro?.disconnect()
  }, [map, here?.id, adjIds.size])

  const layout = useMemo(() => {
    const W = measured?.W ?? GUESS_W
    const H = (W * map.height) / map.width
    const sizeOf = (n: HubMapNode): Size => {
      const m = measured?.sizes[n.id]
      if (m && m.w && m.h) return m
      const mine = here?.id === n.id
      const sap = here && adjIds.has(n.id) ? edgeSap(map, here.id, n.id, state) : null
      return estimateLabel(n.short ?? n.name, sketchMap(map) ? null : subFor(mine, sap), LABEL_MAX_W)
    }
    const ex = measured?.exit && measured.exit.w ? measured.exit : estimateLabel(map.maw.label, null, 150)
    const ecx = (map.maw.x / map.width) * W
    const ecy = (map.maw.y / map.height) * H
    const exitBox: Box = sketchMap(map) ? { x: -999, y: -999, w: 0, h: 0 } : {
      x: Math.min(Math.max(ecx - ex.w / 2, 6), Math.max(6, W - 6 - ex.w)),
      y: Math.min(Math.max(ecy - ex.h / 2, 6), Math.max(6, H - 6 - ex.h)),
      w: ex.w,
      h: ex.h,
    }
    // The compass note is SVG text near the top centre.
    const compass: Box = { x: W / 2 - 42, y: (4 / map.width) * W, w: 84, h: 16 }
    const pt = (id: string) => {
      const n = nodeById(map, id)
      return n ? [(n.x / map.width) * W, (n.y / map.height) * H] : null
    }
    const edges: Array<[number, number, number, number]> = []
    for (const e of map.edges) {
      const a = pt(e.a)
      const b = pt(e.b)
      if (a && b) edges.push([a[0], a[1], b[0], b[1]])
    }
    const placements = layoutLabels({
      width: W,
      height: H,
      nodes: map.nodes.map((n) => ({
        id: n.id,
        x: (n.x / map.width) * W,
        y: (n.y / map.height) * H,
        ...sizeOf(n),
        here: here?.id === n.id,
        side: n.labelSide,
      })),
      edges,
      obstacles: [exitBox, compass],
    })
    return { W, H, placements, exit: exitBox }
  }, [measured, map, here, adjIds])

  function tap(node: HubMapNode) {
    if (here && node.id === here.id) {
      onHint(`You are at ${node.name}.`)
      return
    }
    if (ch3MapLocked(state, node.sceneId)) {
      onHint('Not now.')
      return
    }
    const sap = here ? edgeSap(map, here.id, node.id, state) : null
    if (sap == null) {
      onHint(
        `No road from ${here?.name ?? 'here'} to ${node.name}. Walk the connected routes.`,
      )
      return
    }
    onTravel(node.sceneId)
  }

  return (
    <>
      <p className="map-blurb">
        {map.blurb}
        {hubNote ? ` ${hubNote}` : ''}
      </p>
      <div
        className={`hub-map hub-map-${map.hubId}`}
        style={{ aspectRatio: `${map.width} / ${map.height}` }}
        ref={frameEl}
      >
        <svg
          className="hub-map-art"
          viewBox={`0 0 ${map.width} ${map.height}`}
          aria-hidden="true"
        >
          <ScrapDefs />
          <rect className="map-hide-wash" x="0" y="0" width={map.width} height={map.height} />
          <MapArt map={map} full={!fogged(state)} />
          {map.edges.map((e) => {
            const a = nodeById(map, e.a)
            const b = nodeById(map, e.b)
            if (!a || !b) return null
            const on =
              !!here &&
              ((e.a === here.id && adjIds.has(e.b)) || (e.b === here.id && adjIds.has(e.a)))
            const long = (e.sap ?? 1) > 1
            const d = charcoalStroke(a.x, a.y, b.x, b.y, `${e.a}-${e.b}`)
            return (
              <g key={`${e.a}-${e.b}`}>
                <path d={d} className={on ? 'map-edge-smudge on' : 'map-edge-smudge'} />
                <path d={d} className={on ? 'map-edge on' : 'map-edge'} />
                {sketchMap(map) ? (
                  <path d={charcoalStroke(a.x, a.y, b.x, b.y, `${e.b}~${e.a}`, 0.8)} className="map-edge-ghost" />
                ) : null}
                {long ? (
                  <path
                    d={charcoalStroke(a.x, a.y, b.x, b.y, `${e.a}-${e.b}-long`, 0.9)}
                    className={on ? 'map-edge-long on' : 'map-edge-long'}
                  />
                ) : null}
              </g>
            )
          })}
          {here ? <YouMark x={here.x} y={here.y} /> : null}
        </svg>
        <div className="hub-map-nodes">
          {map.nodes.map((n, i) => {
            const mine = here?.id === n.id
            const sealed = ch3MapLocked(state, n.sceneId)
            const next = adjIds.has(n.id) && !sealed
            const sap = here && next ? edgeSap(map, here.id, n.id, state) : null
            const cls = mine ? 'map-node here' : next ? 'map-node next' : 'map-node far'
            const place = layout.placements[i]
            const ax = (n.x / map.width) * layout.W
            const ay = (n.y / map.height) * layout.H
            const labelStyle: CSSProperties = { left: `${place.box.x - ax}px`, top: `${place.box.y - ay}px` }
            return (
              <button
                type="button"
                key={n.id}
                className={`${cls} lab-${place.side}`}
                style={{ left: `${(n.x / map.width) * 100}%`, top: `${(n.y / map.height) * 100}%` }}
                data-map-node={n.id}
                data-label-side={place.side}
                aria-current={mine ? 'true' : undefined}
                aria-label={
                  mine
                    ? `${n.name}, you are here`
                    : next
                      ? `${n.name}, travel, minus ${sap} Sap`
                      : `${n.name}, no road from here`
                }
                onClick={() => tap(n)}
              >
                <i className="map-dot" aria-hidden="true" />
                <span
                  className="map-label"
                  style={labelStyle}
                  ref={(el) => {
                    labelEls.current[n.id] = el
                  }}
                >
                  <b>{n.short ?? n.name}</b>
                  {sketchMap(map) ? null : <small>{subFor(mine, sap)}</small>}
                </span>
              </button>
            )
          })}
          {sketchMap(map) ? null : <span
            className="map-exit-label map-maw-label"
            style={{ left: `${layout.exit.x}px`, top: `${layout.exit.y}px` }}
            ref={exitEl}
          >
            {map.maw.label}
          </span>}
        </div>
      </div>
      <p className="map-hint">{hint ?? (state.sap <= 2 ? 'Sap is thin. Walks still cost Drops — empty is a crisis.' : `You are at ${here?.name ?? 'an unnamed scrap of ground'}. Tap a connected name.`)}</p>
    </>
  )
}

function ScrapDefs() {
  return (
    <defs>
      <filter id="charcoal-jitter" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0.7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="soot-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="11" result="g" />
        <feColorMatrix
          in="g"
          type="matrix"
          values="0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0.22 0"
        />
      </filter>
      <filter id="charcoal-rough" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="19" result="tooth" />
        <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="mask" />
        <feComposite in="d" in2="mask" operator="in" />
      </filter>
      <filter id="charcoal-smudge" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      <pattern id="charcoal-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(26)">
        <path d="M0 0 V3.2" stroke="#2a1c12" strokeWidth="0.28" opacity="0.42" />
      </pattern>
      <pattern id="charcoal-hatch-steep" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <path d="M0 0 V2.6" stroke="#1a120c" strokeWidth="0.22" opacity="0.38" />
      </pattern>
    </defs>
  )
}

function YouMark({ x, y }: { x: number; y: number }) {
  return (
    <g className="map-you-mark" transform={`translate(${x} ${y})`} filter="url(#charcoal-jitter)">
      <ellipse className="map-you-smudge" cx="0.5" cy="0.8" rx="10.2" ry="8.1" />
      <path
        className="map-you-ring"
        d="M-7.6,-0.6 C-6.8,-7.2 6.2,-7.6 7.4,-0.4 C7.8,5.2 -2.4,8.1 -6.8,3.6 C-8.6,0.8 -8.1,1.6 -7.6,-0.6 Z"
      />
      <path className="map-you-x" d="M-3.6,-3.4 L4.1,3.8 M3.5,-3.8 L-3.9,3.5" />
    </g>
  )
}

function MapArt({ map, full }: { map: HubMapDef; full: boolean }) {
  if (map.hubId === 'camp04') return <CampArt full={full} />
  if (map.hubId === 'spine') return <SpineArt full={full} />
  if (map.hubId === 'threshold') return <ThreshArt full={full} />
  if (map.hubId === 'barrow') return <BarrowArt />
  return <MawArt />
}

function BarrowArt() {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="200" filter="url(#soot-grain)" opacity="0.5" />
      <ellipse cx="70" cy="28" rx="18" ry="10" className="map-stain" />
      <ellipse cx="22" cy="150" rx="16" ry="12" className="map-stain deep" />
      <path d="M26 30 L38 30 L34 196 L22 196 Z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M40 58 L78 58 L76 74 L38 74 Z" fill="url(#charcoal-hatch-steep)" className="map-block" />
    </g>
  )
}

function CampArt({ full }: { full: boolean }) {
  // Charcoal on a torn scrap: thumb smudges, a fold crease, rough blocks where the sketch puts each place.
  return (
    <g className="map-sketch charcoal">
      <g filter="url(#charcoal-smudge)" className="map-thumb">
        <ellipse cx="20" cy="30" rx="15" ry="9" />
        <ellipse cx="82" cy="98" rx="16" ry="11" />
        <ellipse cx="46" cy="60" rx="9" ry="5" />
        <path d="M60 118 q14 -6 30 2" strokeWidth="5" fill="none" />
      </g>
      <path d="M0 67 Q30 64 52 68 T100 65" className="map-crease" />
      <path d="M0 67.6 Q30 64.6 52 68.6 T100 65.6" className="map-crease light" />
      <path d="M49 0 Q51 40 48 80 T50 132" className="map-crease faint" />
      <g filter="url(#charcoal-rough)" display={full ? undefined : 'none'}>
        <path d="M5 6 Q30 2 52 7 Q74 3 95 8 M94 10 L96 118 M5 9 L4 120" fill="none" className="map-wire" />
        <path
          d="M3 124 L11 119 L19 126 L28 118 L37 126 L47 119 L57 127 L67 119 L77 127 L87 119 L96 125"
          fill="none"
          className="map-dune"
        />
        <path d="M70 -1 l10 1 l1 9 l-11 0 z" fill="url(#charcoal-hatch)" className="map-block" />
        <path d="M72 6 l3 -5 l3 5" className="map-hatch" />
        <path d="M63 19 l10 0 l0 10 l-10 0 z M66 19 l2 -5 l2 5" fill="url(#charcoal-hatch-steep)" className="map-block" />
        <path d="M13 4 l12 1 l-1 8 l-12 -1 z" fill="url(#charcoal-hatch)" className="map-block" />
        <g className="map-hatch">
          <path d="M28 32 q4 -7 8 1" />
          <path d="M33 31 q4 -8 8 0" />
          <path d="M38 33 q3 -6 7 1" />
        </g>
        <path d="M1 46 l9 1 l-1 11 l-8 -1 z" className="map-block" fill="none" />
        <path d="M82 51 l12 1 l-1 10 l-12 -1 z" fill="url(#charcoal-hatch)" className="map-block" />
        <ellipse cx="87" cy="66" rx="7" ry="2.4" fill="none" className="map-block" />
        <path d="M25 72 l12 1 l-1 7 l-12 -1 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
        <path d="M48 66 h12 M48 68 h12 M49 72 h10" className="map-hatch" />
        <path d="M60 78 l12 0 l0 6 l-12 0 z" fill="url(#charcoal-hatch)" className="map-block" />
        <g fill="url(#charcoal-hatch)" className="map-block">
          <path d="M32 106 h5 v9 h-5 z" />
          <path d="M39 106 h5 v9 h-5 z" />
          <path d="M6 97 h5 v9 h-5 z" />
          <path d="M13 97 h5 v9 h-5 z" />
        </g>
      </g>
      <text x="49" y="8" textAnchor="middle" className="map-compass">
        N · inland
      </text>
    </g>
  )
}

function SpineArt({ full }: { full: boolean }) {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="120" filter="url(#soot-grain)" opacity="0.5" />
      <ellipse cx="72" cy="18" rx="22" ry="12" className="map-stain" />
      <ellipse cx="22" cy="96" rx="16" ry="11" className="map-stain deep" />
      <g display={full ? undefined : 'none'}>
        <path
          d="M5 42 L26 16 L50 36 L76 20 L96 46 L95 72 L6 80 Z"
          fill="url(#charcoal-hatch-steep)"
          className="map-block"
        />
        <path d="M9 63 Q24 54 32 65 Q41 76 22 79 Z" fill="url(#charcoal-hatch)" className="map-block" />
        <circle cx="58" cy="46" r="5.4" fill="none" className="map-block" />
        <circle cx="58" cy="46" r="2.1" fill="none" className="map-hatch" />
        <path d="M70 71 L81 88 L89 79" fill="none" className="map-dune" />
      </g>
      <text x="50" y="11" textAnchor="middle" className="map-compass">
        N · noon
      </text>
    </g>
  )
}

function ThreshArt({ full }: { full: boolean }) {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="120" filter="url(#soot-grain)" opacity="0.5" />
      <ellipse cx="16" cy="70" rx="14" ry="18" className="map-stain" />
      <g display={full ? undefined : 'none'}>
        <path d="M17 19 H83 L71 89 H29 Z" fill="url(#charcoal-hatch)" className="map-block" />
        <path d="M42 28 h16 v18 h-16 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
        <path d="M12 28 h14 v16 h-14 z" fill="url(#charcoal-hatch)" className="map-block" />
        <path d="M40 70 h18 v14 h-18 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
        <path d="M72 40 h14 v14 h-14 z" fill="url(#charcoal-hatch)" className="map-block" />
        <path d="M18 101 Q50 91 82 105" fill="none" className="map-dune" />
      </g>
      <text x="50" y="11" textAnchor="middle" className="map-compass">
        N · nave
      </text>
    </g>
  )
}

function MawArt() {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="120" filter="url(#soot-grain)" opacity="0.55" />
      <ellipse cx="82" cy="90" rx="21" ry="18" className="map-stain deep maw" />
      <ellipse cx="82" cy="90" rx="11" ry="9" className="map-stain maw-core" />
      <path
        d="M12 31 Q50 16 89 35 Q71 52 50 49 Q26 54 12 31 Z"
        fill="url(#charcoal-hatch-steep)"
        className="map-block"
      />
      <path d="M17 69 Q31 59 41 75 Q28 82 17 69 Z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M65 27 Q79 20 88 38" fill="none" className="map-hatch" />
      <text x="48" y="11" textAnchor="middle" className="map-compass">
        N · approach
      </text>
    </g>
  )
}

function seed(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function charcoalStroke(x1: number, y1: number, x2: number, y2: number, key: string, extra = 0) {
  const h = seed(key)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const p1 = 0.26 + ((h & 15) / 15) * 0.14
  const p2 = 0.56 + (((h >> 4) & 15) / 15) * 0.14
  const j1 = ((((h >> 8) & 15) / 15) - 0.5) * 2.4 + extra
  const j2 = ((((h >> 12) & 15) / 15) - 0.5) * 2.1 - extra * 0.6
  const xA = x1 + dx * p1 + px * j1
  const yA = y1 + dy * p1 + py * j1
  const xB = x1 + dx * p2 + px * j2
  const yB = y1 + dy * p2 + py * j2
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} C${xA.toFixed(2)} ${yA.toFixed(2)}, ${xB.toFixed(2)} ${yB.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

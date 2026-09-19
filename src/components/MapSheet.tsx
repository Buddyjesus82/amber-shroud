import { useState } from 'react'
import { HUBS } from '../game/content/catalog'
import { travelTo } from '../game/engine'
import { adjacency, currentNode, edgeSap, hubMapOf, nodeById } from '../game/map'
import type { GameState, HubMapDef, HubMapNode } from '../game/types'

type Props = {
  state: GameState
  onChange: (s: GameState) => void
  onClose: () => void
}

export function MapSheet({ state, onChange, onClose }: Props) {
  const map = hubMapOf(state)
  const here = currentNode(state)
  const [hint, setHint] = useState<string | null>(null)

  return (
    <div className="map-backdrop scrap-map" role="dialog" aria-label="Map" onClick={onClose}>
      <div className="map-sheet scrap-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">scavenged scrap</p>
            <h2>{map ? titleFor(state, map) : 'Unmapped'}</h2>
          </div>
          <button type="button" className="text-link scrap-stow" onClick={onClose}>
            Stow
          </button>
        </header>
        {!map || !map.ready ? (
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
  const adj = here ? (adjacency(map).get(here.id) ?? []) : []
  const adjIds = new Set(adj.map((n) => n.id))
  const hubNote = HUBS[map.hubId]?.mawNote

  function tap(node: HubMapNode) {
    if (here && node.id === here.id) {
      onHint(`You are at ${node.name}.`)
      return
    }
    const sap = here ? edgeSap(map, here.id, node.id) : null
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
      >
        <svg
          className="hub-map-art"
          viewBox={`0 0 ${map.width} ${map.height}`}
          aria-hidden="true"
        >
          <ScrapDefs />
          <rect className="map-hide-wash" x="0" y="0" width={map.width} height={map.height} />
          <MapArt map={map} />
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
                {long ? (
                  <path
                    d={charcoalStroke(a.x, a.y, b.x, b.y, `${e.a}-${e.b}-long`, 0.9)}
                    className={on ? 'map-edge-long on' : 'map-edge-long'}
                  />
                ) : null}
              </g>
            )
          })}
          <text
            className="map-maw-label"
            x={map.maw.x}
            y={map.maw.y}
            textAnchor="middle"
            transform={`rotate(-7 ${map.maw.x} ${map.maw.y})`}
          >
            {map.maw.label}
          </text>
          {here ? <YouMark x={here.x} y={here.y} /> : null}
        </svg>
        <div className="hub-map-nodes">
          {map.nodes.map((n) => {
            const mine = here?.id === n.id
            const next = adjIds.has(n.id)
            const sap = here && next ? edgeSap(map, here.id, n.id) : null
            const cls = mine ? 'map-node here' : next ? 'map-node next' : 'map-node far'
            return (
              <button
                type="button"
                key={n.id}
                className={cls}
                style={{ left: `${(n.x / map.width) * 100}%`, top: `${(n.y / map.height) * 100}%` }}
                data-map-node={n.id}
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
                <span>{n.short ?? n.name}</span>
                {mine ? <small>you</small> : next && sap ? <small>−{sap} sap</small> : <small>far</small>}
              </button>
            )
          })}
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

function MapArt({ map }: { map: HubMapDef }) {
  if (map.hubId === 'camp04') return <CampArt />
  if (map.hubId === 'spine') return <SpineArt />
  if (map.hubId === 'threshold') return <ThreshArt />
  return <MawArt />
}

function CampArt() {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="132" filter="url(#soot-grain)" opacity="0.55" />
      <ellipse cx="18" cy="22" rx="16" ry="10" className="map-stain" />
      <ellipse cx="86" cy="96" rx="18" ry="14" className="map-stain deep" />
      <path
        d="M7 10 Q22 6 38 12 Q54 7 70 11 Q84 8 93 13 L91 106 Q74 113 52 107 Q28 112 8 108 Z"
        fill="none"
        className="map-wire"
      />
      <path
        d="M8 108 L16 103 L24 110 L33 102 L44 111 L56 104 L67 112 L78 105 L88 113 L93 108"
        fill="none"
        className="map-dune"
      />
      <path d="M66 5 l11 1 l1 13 l-12 1 z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M62 24 l17 1 l-1 11 l-16 -1 z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M74 46 l16 2 l-1 12 l-16 -1 z" fill="url(#charcoal-hatch)" className="map-block" />
      <ellipse cx="80" cy="51" rx="5.8" ry="2.4" fill="none" className="map-block" />
      <path d="M76 51 L73 58 M80 53 L80 60 M85 51 L87 58" className="map-hatch" />
      <path d="M21 61 l17 1 l-1 13 l-16 -1 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
      <g className="map-hatch">
        <path d="M28 38 q5 -7 10 1" />
        <path d="M32 42 q4 -6 8 1" />
        <path d="M36 39 q4 -7 8 0" />
      </g>
      <g fill="url(#charcoal-hatch)" className="map-block">
        <path d="M8 84 h6 v8 h-6 z" />
        <path d="M15 84 h6 v8 h-6 z" />
        <path d="M8 93 h6 v8 h-6 z" />
        <path d="M15 93 h6 v8 h-6 z" />
      </g>
      <path d="M38 82 l14 1 v10 l-15 -1 z" fill="url(#charcoal-hatch)" className="map-block" />
      <text x="49" y="8" textAnchor="middle" className="map-compass">
        N · inland
      </text>
    </g>
  )
}

function SpineArt() {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="120" filter="url(#soot-grain)" opacity="0.5" />
      <ellipse cx="72" cy="18" rx="22" ry="12" className="map-stain" />
      <ellipse cx="22" cy="96" rx="16" ry="11" className="map-stain deep" />
      <path
        d="M5 42 L26 16 L50 36 L76 20 L96 46 L95 72 L6 80 Z"
        fill="url(#charcoal-hatch-steep)"
        className="map-block"
      />
      <path d="M9 63 Q24 54 32 65 Q41 76 22 79 Z" fill="url(#charcoal-hatch)" className="map-block" />
      <circle cx="58" cy="46" r="5.4" fill="none" className="map-block" />
      <circle cx="58" cy="46" r="2.1" fill="none" className="map-hatch" />
      <path d="M70 71 L81 88 L89 79" fill="none" className="map-dune" />
      <text x="50" y="11" textAnchor="middle" className="map-compass">
        N · noon
      </text>
    </g>
  )
}

function ThreshArt() {
  return (
    <g className="map-sketch" filter="url(#charcoal-jitter)">
      <rect x="0" y="0" width="100" height="120" filter="url(#soot-grain)" opacity="0.5" />
      <ellipse cx="16" cy="70" rx="14" ry="18" className="map-stain" />
      <path d="M17 19 H83 L71 89 H29 Z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M42 28 h16 v18 h-16 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
      <path d="M12 28 h14 v16 h-14 z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M40 70 h18 v14 h-18 z" fill="url(#charcoal-hatch-steep)" className="map-block" />
      <path d="M72 40 h14 v14 h-14 z" fill="url(#charcoal-hatch)" className="map-block" />
      <path d="M18 101 Q50 91 82 105" fill="none" className="map-dune" />
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

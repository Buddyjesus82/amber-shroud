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
    <div className="map-backdrop" role="dialog" aria-label="Map" onClick={onClose}>
      <div className="map-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">Map</p>
            <h2>{map ? titleFor(state, map) : 'Unmapped'}</h2>
          </div>
          <button type="button" className="text-link" onClick={onClose}>
            Close
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
          <MapArt map={map} />
          {map.edges.map((e) => {
            const a = nodeById(map, e.a)
            const b = nodeById(map, e.b)
            if (!a || !b) return null
            const on =
              !!here &&
              ((e.a === here.id && adjIds.has(e.b)) || (e.b === here.id && adjIds.has(e.a)))
            return (
              <line
                key={`${e.a}-${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={on ? 'map-edge on' : 'map-edge'}
              />
            )
          })}
          <text className="map-maw-label" x={map.maw.x} y={map.maw.y} textAnchor="middle">
            {map.maw.label}
          </text>
          {here ? (
            <circle className="map-you-ring" cx={here.x} cy={here.y} r="7.2" />
          ) : null}
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
                {mine ? <small>You</small> : next && sap ? <small>−{sap} Sap</small> : <small>Far</small>}
              </button>
            )
          })}
        </div>
      </div>
      <p className="map-hint">{hint ?? (state.sap <= 2 ? 'Sap is thin. Walks still cost Drops — empty is a crisis.' : `You are at ${here?.name ?? 'an unnamed scrap of ground'}. Tap a connected name.`)}</p>
    </>
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
    <g>
      <defs>
        <radialGradient id="camp-glow" cx="50%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#3a220e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0a0604" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="maw-south" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4451a" stopOpacity="0" />
          <stop offset="100%" stopColor="#c4451a" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="132" fill="url(#camp-glow)" />
      <rect x="0" y="104" width="100" height="28" fill="url(#maw-south)" />
      <path
        d="M8 8 H92 V108 H8 Z"
        fill="none"
        stroke="rgba(232,163,23,0.22)"
        strokeWidth="0.7"
        strokeDasharray="1.6 1.1"
      />
      <path
        d="M8 108 L14 104 L20 109 L28 103 L36 110 L48 104 L58 111 L70 105 L82 112 L92 108"
        fill="none"
        stroke="#e8a317"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <rect x="66" y="5" width="12" height="14" rx="0.8" fill="#1c1008" stroke="#a56b12" strokeWidth="0.5" />
      <rect x="63" y="24" width="16" height="12" rx="0.6" fill="#22140a" stroke="#a56b12" strokeWidth="0.45" />
      <rect x="73" y="46" width="16" height="13" rx="1" fill="#1a0e08" stroke="#e8a317" strokeWidth="0.45" />
      <ellipse cx="80" cy="50" rx="5.5" ry="2.2" fill="#2a1a0c" stroke="#f4c15a" strokeWidth="0.4" />
      <path d="M76 50 L74 56 M80 52 L80 58 M84 50 L86 56" stroke="#c9a27a" strokeWidth="0.45" />
      <rect x="20" y="60" width="18" height="14" rx="0.5" fill="#24150c" stroke="#a56b12" strokeWidth="0.4" />
      <g fill="none" stroke="#e8a317" strokeWidth="0.45" opacity="0.7">
        <path d="M30 40 q4 -6 8 0" />
        <path d="M33 43 q4 -5 7 1" />
        <path d="M36 41 q3 -6 7 0" />
      </g>
      <g fill="#1a0e08" stroke="#a56b12" strokeWidth="0.35">
        <rect x="8" y="84" width="6" height="8" />
        <rect x="15" y="84" width="6" height="8" />
        <rect x="8" y="93" width="6" height="8" />
        <rect x="15" y="93" width="6" height="8" />
      </g>
      <rect x="38" y="82" width="14" height="10" rx="0.7" fill="#1c1008" stroke="#e8a317" strokeWidth="0.4" />
      <text x="50" y="7" textAnchor="middle" className="map-compass">
        N · inland
      </text>
    </g>
  )
}

function SpineArt() {
  return (
    <g>
      <defs>
        <linearGradient id="spine-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3208" />
          <stop offset="55%" stopColor="#140c07" />
          <stop offset="100%" stopColor="#3a120c" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="120" fill="url(#spine-sun)" />
      <path d="M4 40 L28 14 L52 34 L78 22 L96 44 L96 70 L4 78 Z" fill="#1a1009" stroke="#a56b12" strokeWidth="0.5" />
      <path d="M8 62 Q22 54 30 64 Q40 74 22 78 Z" fill="#24150c" stroke="#e8a317" strokeWidth="0.4" />
      <circle cx="58" cy="46" r="5" fill="none" stroke="#c9a27a" strokeWidth="0.5" />
      <circle cx="58" cy="46" r="2" fill="#0c0704" />
      <path d="M70 70 L82 86 L88 80" fill="none" stroke="#c4451a" strokeWidth="0.7" strokeDasharray="1.4 1" />
      <text x="50" y="10" textAnchor="middle" className="map-compass">
        N · noon
      </text>
    </g>
  )
}

function ThreshArt() {
  return (
    <g>
      <rect x="0" y="0" width="100" height="120" fill="#120c08" />
      <path d="M18 18 H82 L70 88 H30 Z" fill="#1c1008" stroke="#e8a317" strokeWidth="0.55" />
      <rect x="42" y="28" width="16" height="18" fill="#24150c" stroke="#f4c15a" strokeWidth="0.5" />
      <rect x="12" y="28" width="14" height="16" fill="#160e08" stroke="#a56b12" strokeWidth="0.4" />
      <rect x="40" y="70" width="18" height="14" fill="#1a0e08" stroke="#e8a317" strokeWidth="0.45" />
      <rect x="72" y="40" width="14" height="14" fill="#22140a" stroke="#a56b12" strokeWidth="0.4" />
      <path d="M20 100 Q50 92 80 104" fill="none" stroke="#c4451a" strokeWidth="0.7" opacity="0.7" />
      <text x="50" y="10" textAnchor="middle" className="map-compass">
        N · nave
      </text>
    </g>
  )
}

function MawArt() {
  return (
    <g>
      <defs>
        <radialGradient id="maw-hole" cx="82%" cy="82%" r="35%">
          <stop offset="0%" stopColor="#2a0c08" />
          <stop offset="70%" stopColor="#c4451a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0c0704" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="120" fill="#100804" />
      <circle cx="82" cy="90" r="22" fill="url(#maw-hole)" />
      <path d="M12 30 Q50 18 88 34 Q70 50 50 48 Q28 52 12 30 Z" fill="#1c1008" stroke="#a56b12" strokeWidth="0.45" />
      <path d="M18 68 Q30 60 40 74 Q28 80 18 68 Z" fill="#24150c" stroke="#e8a317" strokeWidth="0.4" />
      <path d="M66 28 Q78 22 86 36" fill="none" stroke="#c9a27a" strokeWidth="0.5" />
      <text x="50" y="10" textAnchor="middle" className="map-compass">
        N · approach
      </text>
    </g>
  )
}

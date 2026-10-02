import { heatFactions, HEAT_TIP } from '../game/heat'
import type { DoorId, Faction } from '../game/types'

export function HeatTip({ onDismiss, door }: { onDismiss: () => void; door?: DoorId }) {
  const HEAT_FACTIONS = heatFactions(door)
  return (
    <div className="map-backdrop heat-guide" role="dialog" aria-label="Heat is attention">
      <div className="map-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">First lesson</p>
            <h2>{HEAT_TIP.title}</h2>
          </div>
        </header>
        <p className="map-blurb">{HEAT_TIP.body}</p>
        <ul className="heat-legend heat-tip-list">
          {(Object.keys(HEAT_FACTIONS) as Faction[]).map((f) => (
            <li key={f}>
              <b>{HEAT_FACTIONS[f].name}</b> — {HEAT_FACTIONS[f].watch}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-gold" onClick={onDismiss}>
          I hear it
        </button>
      </div>
    </div>
  )
}

export function HeatExplainer({ faction, onClose, door }: { faction: Faction; onClose: () => void; door?: DoorId }) {
  const f = heatFactions(door)[faction]
  return (
    <div className="map-backdrop heat-guide" role="dialog" aria-label={`${f.name} Heat`} onClick={onClose}>
      <div className="map-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">Heat — who is watching</p>
            <h2>{f.name}</h2>
          </div>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="map-blurb">{f.body}</p>
      </div>
    </div>
  )
}

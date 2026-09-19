import { HEAT_FACTIONS, HEAT_TIP } from '../game/heat'
import type { Faction } from '../game/types'

export function HeatTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="map-backdrop heat-guide" role="dialog" aria-label="Heat is not XP">
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

export function HeatExplainer({ faction, onClose }: { faction: Faction; onClose: () => void }) {
  const f = HEAT_FACTIONS[faction]
  return (
    <div className="map-backdrop heat-guide" role="dialog" aria-label={`${f.name} Heat`} onClick={onClose}>
      <div className="map-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="kicker map-kicker">Heat — not XP</p>
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

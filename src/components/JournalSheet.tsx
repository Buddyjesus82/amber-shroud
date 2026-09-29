import { knownRumors } from '../game/journal'
import type { GameState } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
}

export function JournalSheet({ state, onClose }: Props) {
  const rows = knownRumors(state)
  return (
    <div className="sheet-backdrop" role="dialog" aria-label="Rumors" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Rumors</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </header>
        {rows.length === 0 ? (
          <p className="empty">Nothing worth writing yet. Listen until a name sticks.</p>
        ) : (
          <ul className="kit-list rumor-list">
            {rows.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  <span>{r.body}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

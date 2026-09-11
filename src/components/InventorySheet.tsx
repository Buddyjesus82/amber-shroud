import { drinkDrop, sapLabel } from '../game/engine'
import { listedKit } from '../game/kit'
import type { GameState } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
  onChange: (s: GameState) => void
}

export function InventorySheet({ state, onClose, onChange }: Props) {
  const chips = listedKit(state.items)
  return (
    <div className="sheet-backdrop" role="dialog" aria-label="Kit" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Kit</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="epithet">You are {state.epithet}.</p>
        <p className="kit-sap">
          Sap {state.sap}/{state.sapMax} · {sapLabel(state.sap)}. Empty sap is a crisis, not a death.
        </p>
        {chips.length === 0 ? (
          <p className="empty">Pockets full of heat. Nothing else. Find, buy, or steal before the next spend.</p>
        ) : (
          <ul className="kit-list">
            {chips.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.name}
                    {c.n > 1 ? ` ×${c.n}` : ''}
                  </strong>
                  <span>{c.desc}</span>
                </div>
                {c.id === 'vial_drop' ? (
                  <button
                    type="button"
                    className="btn btn-gold btn-tiny"
                    onClick={() => {
                      onChange(drinkDrop(state))
                      onClose()
                    }}
                  >
                    Drink
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="heat-legend">
          <p>
            <b>Cartel</b> {state.heat.cartel} · Ironwood, Valerius, Hounds
          </p>
          <p>
            <b>Seekers</b> {state.heat.seekers} · cloth, vessels, Sybella
          </p>
          <p>
            <b>Strays</b> {state.heat.strays} · Oil-Tooth, Silas, Kaelen the Sifter
          </p>
        </div>
      </div>
    </div>
  )
}

import { ITEMS } from '../game/content/catalog'
import { drinkDrop } from '../game/engine'
import type { GameState, ItemId } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
  onChange: (s: GameState) => void
}

export function InventorySheet({ state, onClose, onChange }: Props) {
  const ids = (Object.keys(state.items) as ItemId[]).filter((id) => (state.items[id] ?? 0) > 0)
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
        {ids.length === 0 ? (
          <p className="empty">Pockets full of heat. Nothing else.</p>
        ) : (
          <ul className="kit-list">
            {ids.map((id) => {
              const def = ITEMS[id]
              const n = state.items[id] ?? 0
              return (
                <li key={id}>
                  <div>
                    <strong>
                      {def.name}
                      {n > 1 ? ` ×${n}` : ''}
                    </strong>
                    <span>{def.desc}</span>
                  </div>
                  {id === 'vial_drop' ? (
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
              )
            })}
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
            <b>Strays</b> {state.heat.strays} · Jaxson, Silas, dune law
          </p>
        </div>
      </div>
    </div>
  )
}

import { DOORS } from '../game/content/catalog'
import type { DoorId } from '../game/types'

type Props = {
  onPick: (door: DoorId) => void
  onBack: () => void
}

const order: DoorId[] = ['prisoner', 'outcast', 'vessel']

export function DoorSelect({ onPick, onBack }: Props) {
  return (
    <div className="screen door-screen">
      <header className="sheet-head">
        <button type="button" className="text-link" onClick={onBack}>
          ← Title
        </button>
        <h2>Choose a start door</h2>
        <p>Three ways into the same Hunger. No dice. Only consequence.</p>
      </header>
      <div className="door-list">
        {order.map((id) => {
          const d = DOORS[id]
          return (
            <button type="button" className="door-card" key={id} onClick={() => onPick(id)}>
              <span className="door-role">{d.role}</span>
              <strong>{d.title}</strong>
              <span className="door-place">{d.place}</span>
              <span className="door-blurb">{d.blurb}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

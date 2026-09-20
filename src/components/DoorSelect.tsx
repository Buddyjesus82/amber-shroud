import { useState } from 'react'
import { DOORS } from '../game/content/catalog'
import { kitLine } from '../game/kit'
import { DOOR_ORDER, DOOR_SLOT_LABEL } from '../game/save'
import type { DoorId } from '../game/types'

type Props = {
  savedDoors: DoorId[]
  onResume: (door: DoorId) => void
  onStart: (door: DoorId) => void
  onBack: () => void
}

export function DoorSelect({ savedDoors, onResume, onStart, onBack }: Props) {
  const [pending, setPending] = useState<DoorId | null>(null)
  const saved = new Set(savedDoors)

  function pick(id: DoorId) {
    if (saved.has(id)) {
      setPending(id)
      return
    }
    onStart(id)
  }

  return (
    <div className="screen door-screen">
      <header className="sheet-head">
        <button type="button" className="text-link" onClick={onBack}>
          ← Title
        </button>
        <h2>Choose a start door</h2>
        <p>Same Hunger. Different gear. No dice — only what you carry. Each door keeps its own save. Add to Home Screen for stronger saves on iPhone.</p>
      </header>
      <div className="door-list">
        {DOOR_ORDER.map((id) => {
          const d = DOORS[id]
          const has = saved.has(id)
          const asking = pending === id
          return (
            <div className={`door-card ${asking ? 'door-confirming' : ''}`} key={id}>
              <button type="button" className="door-hit" onClick={() => pick(id)} disabled={asking}>
                <span className="door-role">
                  {d.role}
                  {has ? <span className="door-saved">Saved</span> : null}
                </span>
                <strong>{d.title}</strong>
                <span className="door-place">{d.place}</span>
                <span className="door-stats">
                  Sap {d.sap} · Cartel {d.heat.cartel} · Seekers {d.heat.seekers} · Strays {d.heat.strays}
                </span>
                <span className="door-kit">Gear: {kitLine(d.items)}</span>
                <span className="door-blurb">{d.blurb}</span>
              </button>
              {asking ? (
                <div className="door-confirm">
                  <p>
                    {DOOR_SLOT_LABEL[id]} already has a save. Resume it, or overwrite this door only — the other
                    two stay.
                  </p>
                  <button type="button" className="btn btn-gold" onClick={() => onResume(id)}>
                    Resume {DOOR_SLOT_LABEL[id]}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Overwrite ${DOOR_SLOT_LABEL[id]}? This door's save is gone. The other doors stay.`,
                        )
                      ) {
                        onStart(id)
                      }
                    }}
                  >
                    Overwrite this door
                  </button>
                  <button type="button" className="text-link" onClick={() => setPending(null)}>
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

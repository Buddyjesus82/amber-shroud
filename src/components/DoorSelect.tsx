import { useEffect, useRef, useState } from 'react'
import { DOORS } from '../game/content/catalog'
import {
  IDLE_DOOR,
  tapDoor,
  tapDoorCancel,
  tapOverwriteAsk,
  tapOverwriteBack,
  tapOverwriteConfirm,
  tapResume,
  type DoorPhase,
  type DoorTapResult,
} from '../game/doorPick'
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
  const [phase, setPhase] = useState<DoorPhase>(IDLE_DOOR)
  const askRef = useRef<HTMLDivElement | null>(null)
  const saved = savedDoors

  function run(next: DoorTapResult) {
    setPhase(next.phase)
    if (next.action === 'start' && next.door) onStart(next.door)
    if (next.action === 'resume' && next.door) onResume(next.door)
  }

  useEffect(() => {
    if (phase.kind === 'idle') return
    askRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [phase])

  return (
    <div className="screen door-screen">
      <header className="sheet-head">
        <button type="button" className="text-link" onClick={onBack}>
          ← Title
        </button>
        <h2>Choose a start door</h2>
        <p>
          Same Maw. Different Hunger roads. No dice — only what you carry. Each door keeps its own save. Add to Home
          Screen for stronger saves on iPhone.
        </p>
      </header>
      <div className="door-list">
        {DOOR_ORDER.map((id) => {
          const d = DOORS[id]
          const has = saved.includes(id)
          const asking = phase.kind !== 'idle' && phase.door === id
          const wiping = phase.kind === 'overwrite' && phase.door === id
          return (
            <div
              className={`door-card ${asking ? 'door-confirming' : ''}`}
              key={id}
              ref={asking ? askRef : undefined}
              data-door-card={id}
            >
              <button type="button" className="door-hit" onClick={() => run(tapDoor(phase, saved, id))}>
                <span className="door-role">
                  {d.role}
                  {has ? <span className="door-saved">Saved</span> : null}
                </span>
                <strong>{d.title}</strong>
                <span className="door-place">{d.place}</span>
                {asking ? null : (
                  <>
                    <span className="door-stats">
                      Sap {d.sap} · Cartel {d.heat.cartel} · Seekers {d.heat.seekers} · Strays {d.heat.strays}
                    </span>
                    <span className="door-kit">Gear: {kitLine(d.items)}</span>
                    <span className="door-blurb">{d.blurb}</span>
                  </>
                )}
              </button>
              {asking ? (
                <div className="door-confirm" data-door-confirm={id}>
                  {wiping ? (
                    <>
                      <p>
                        Overwrite {DOOR_SLOT_LABEL[id]}? This door&apos;s save is gone. The other two stay.
                      </p>
                      <button
                        type="button"
                        className="btn btn-gold"
                        data-door-start={id}
                        onClick={() => run(tapOverwriteConfirm(id))}
                      >
                        Overwrite {DOOR_SLOT_LABEL[id]}
                        <small>New journey on this door only</small>
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => run(tapOverwriteBack(id))}>
                        Keep the save
                        <small>Back to Resume</small>
                      </button>
                    </>
                  ) : (
                    <>
                      <p>
                        {DOOR_SLOT_LABEL[id]} already has a save. Resume it, or start a new {DOOR_SLOT_LABEL[id]} — that
                        overwrites this door only. The other two stay.
                      </p>
                      <button
                        type="button"
                        className="btn btn-gold"
                        data-door-resume={id}
                        onClick={() => run(tapResume(id))}
                      >
                        Resume {DOOR_SLOT_LABEL[id]}
                        <small>Pick up where you left this door</small>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        data-door-overwrite={id}
                        onClick={() => run(tapOverwriteAsk(id))}
                      >
                        New {DOOR_SLOT_LABEL[id]}
                        <small>Overwrite this save</small>
                      </button>
                      <button type="button" className="text-link" onClick={() => run(tapDoorCancel())}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { BUILD } from '../version'
import { DOOR_SLOT_LABEL } from '../game/save'
import type { DoorId } from '../game/types'

type Props = {
  savedDoors: DoorId[]
  lastDoor: DoorId | null
  lastWhen: string | null
  booting: boolean
  onNew: () => void
  onIntro: () => void
  onContinue: () => void
  onEraseLast: () => void
  onEraseAll: () => void
  /** v172: returns false when the code opens nothing. */
  onCode: (code: string) => boolean
}

export function TitleScreen({
  savedDoors,
  lastDoor,
  lastWhen,
  booting,
  onNew,
  onIntro,
  onContinue,
  onEraseLast,
  onEraseAll,
  onCode,
}: Props) {
  const [code, setCode] = useState('')
  const [codeMiss, setCodeMiss] = useState(false)
  const hasSave = savedDoors.length > 0
  const lastLabel = lastDoor ? DOOR_SLOT_LABEL[lastDoor] : null
  const slotLine = hasSave ? savedDoors.map((id) => DOOR_SLOT_LABEL[id]).join(' · ') : 'None yet'
  const continueSub = booting && !hasSave
    ? 'Looking for a save on this phone…'
    : hasSave
      ? lastWhen
        ? `Last saved ${lastWhen}`
        : 'Last door you touched'
      : 'No save yet'

  return (
    <div className="screen title-screen">
      <div className="title-hero">
        <img className="title-fill" src={`${import.meta.env.BASE_URL}covers/world.jpg?v=82`} alt="" aria-hidden="true" />
        <div className="title-veil" />
        <div className="title-art">
          <img src={`${import.meta.env.BASE_URL}covers/world.jpg?v=82`} alt="The Amber Shroud — three factions, one desert" />
        </div>
        <div className="title-copy">
          <p className="kicker">A desert of Drops, Glints, and bad religion</p>
          <h1>
            The Amber{' '}
            <br />
            Shroud
          </h1>
          <p className="tag">Three factions. One desert. No mercy.</p>
        </div>
      </div>
      <div className="title-actions">
        <p className="flagship">
          Flagship path: <em>The Hunger in the Amber</em>
        </p>
        <p className="save-slots">
          Saves on this phone: <strong>{slotLine}</strong>
          {hasSave && lastWhen ? <span className="save-when"> · saved {lastWhen}</span> : null}
        </p>
        <p className="save-hint">Add to Home Screen for stronger saves on iPhone.</p>
        <button type="button" className="btn btn-gold" onClick={onNew}>
          New game
          <small>Short intro, then pick Prisoner, Outcast, or Vessel</small>
        </button>
        <button type="button" className="btn btn-ghost" onClick={onContinue} disabled={!hasSave}>
          Continue{lastLabel ? ` ${lastLabel}` : ''}
          <small>{continueSub}</small>
        </button>
        <form
          className="chapter-code"
          onSubmit={(e) => {
            e.preventDefault()
            setCodeMiss(!onCode(code))
          }}
        >
          <input
            aria-label="Chapter code"
            placeholder="Chapter code"
            value={code}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => {
              setCode(e.target.value)
              setCodeMiss(false)
            }}
          />
          <button type="submit" className="btn btn-ghost">Enter code</button>
          {codeMiss ? <p className="save-hint">That code opens nothing.</p> : null}
        </form>
        <button type="button" className="text-link" data-replay-intro onClick={onIntro}>
          Watch the intro
        </button>
        {hasSave && lastDoor ? (
          <button type="button" className="text-link" onClick={onEraseLast}>
            Erase {lastLabel} save
          </button>
        ) : null}
        {savedDoors.length > 1 ? (
          <button type="button" className="text-link" onClick={onEraseAll}>
            Erase all saves
          </button>
        ) : null}
        <p className="credit">
          <strong>Jeramie Algieri</strong>
          <span className="credit-with">Gamer NERD&apos;s Human</span>
          <span className="build-tag">Build {BUILD}</span>
        </p>
      </div>
    </div>
  )
}

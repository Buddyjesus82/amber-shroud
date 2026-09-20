import { useCallback, useState } from 'react'
import { DoorSelect } from './components/DoorSelect'
import { PlayScreen } from './components/PlayScreen'
import { TitleScreen } from './components/TitleScreen'
import { newGame } from './game/engine'
import {
  clearAllSaves,
  clearSave,
  DOOR_SLOT_LABEL,
  lastSavedDoor,
  listSaves,
  loadDoor,
  loadSave,
} from './game/save'
import type { DoorId, GameState } from './game/types'

type View = 'title' | 'doors' | 'play'

function saveSnapshot() {
  return { doors: listSaves(), last: lastSavedDoor() }
}

export default function App() {
  const [view, setView] = useState<View>('title')
  const [state, setState] = useState<GameState | null>(null)
  const [saved, setSaved] = useState(() => saveSnapshot())

  const refreshSaves = useCallback(() => {
    setSaved(saveSnapshot())
  }, [])

  const onChange = useCallback((s: GameState) => {
    setState(s)
    setView('play')
    setSaved(saveSnapshot())
  }, [])

  if (view === 'play' && state) {
    return (
      <PlayScreen
        state={state}
        onChange={onChange}
        onTitle={() => {
          refreshSaves()
          setView('title')
        }}
      />
    )
  }

  if (view === 'doors') {
    return (
      <DoorSelect
        savedDoors={saved.doors}
        onBack={() => {
          refreshSaves()
          setView('title')
        }}
        onResume={(door: DoorId) => {
          const s = loadDoor(door)
          if (s) onChange(s)
        }}
        onStart={(door: DoorId) => {
          onChange(newGame(door))
        }}
      />
    )
  }

  return (
    <TitleScreen
      savedDoors={saved.doors}
      lastDoor={saved.last}
      onNew={() => {
        refreshSaves()
        setView('doors')
      }}
      onContinue={() => {
        const s = loadSave()
        if (s) {
          setState(s)
          setView('play')
          refreshSaves()
        }
      }}
      onEraseLast={() => {
        const door = saved.last
        if (!door) return
        if (
          !window.confirm(
            `Erase ${DOOR_SLOT_LABEL[door]}? Only that door. The other two stay.`,
          )
        ) {
          return
        }
        clearSave(door)
        setState((cur) => (cur?.door === door ? null : cur))
        refreshSaves()
      }}
      onEraseAll={() => {
        if (!window.confirm('Erase Prisoner, Outcast, and Vessel? All three saves on this phone.')) {
          return
        }
        clearAllSaves()
        setState(null)
        refreshSaves()
      }}
    />
  )
}

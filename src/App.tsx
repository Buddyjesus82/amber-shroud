import { useCallback, useEffect, useRef, useState } from 'react'
import { DoorSelect } from './components/DoorSelect'
import { PlayScreen } from './components/PlayScreen'
import { TitleScreen } from './components/TitleScreen'
import { newGame } from './game/engine'
import {
  clearAllSaves,
  clearSave,
  DOOR_SLOT_LABEL,
  flushSave,
  formatSavedAt,
  hydrateSaves,
  lastSavedAt,
  lastSavedDoor,
  listSaves,
  loadDoor,
  loadSave,
} from './game/save'
import type { DoorId, GameState } from './game/types'

type View = 'title' | 'doors' | 'play'

function saveSnapshot() {
  return {
    doors: listSaves(),
    last: lastSavedDoor(),
    at: lastSavedAt(),
    when: formatSavedAt(lastSavedAt()),
  }
}

export default function App() {
  const [view, setView] = useState<View>('title')
  const [state, setState] = useState<GameState | null>(null)
  const [saved, setSaved] = useState(() => saveSnapshot())
  const [booting, setBooting] = useState(true)
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const [savedCue, setSavedCue] = useState(false)
  const stateRef = useRef<GameState | null>(null)
  const cueAt = useRef(0)

  const refreshSaves = useCallback(() => {
    setSaved(saveSnapshot())
  }, [])

  const noteWrite = useCallback(() => {
    void flushSave(null).then((st) => {
      refreshSaves()
      if (st && !st.ok) {
        setSaveToast(st.message ?? 'Could not save on this phone.')
        setSavedCue(false)
        return
      }
      setSaveToast(null)
      const now = Date.now()
      if (now - cueAt.current < 4000) return
      cueAt.current = now
      setSavedCue(true)
      window.setTimeout(() => setSavedCue(false), 1600)
    })
  }, [refreshSaves])

  const onChange = useCallback(
    (s: GameState) => {
      stateRef.current = s
      setState(s)
      setView('play')
      noteWrite()
    },
    [noteWrite],
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let live = true
    void hydrateSaves().then(() => {
      if (!live) return
      refreshSaves()
      setBooting(false)
    })
    return () => {
      live = false
    }
  }, [refreshSaves])

  useEffect(() => {
    const flush = () => {
      void flushSave(stateRef.current)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  if (view === 'play' && state) {
    return (
      <PlayScreen
        state={state}
        onChange={onChange}
        onTitle={() => {
          void flushSave(state)
          refreshSaves()
          setView('title')
        }}
        savedCue={savedCue}
        saveToast={saveToast}
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
      lastWhen={saved.when}
      booting={booting}
      onNew={() => {
        refreshSaves()
        setView('doors')
      }}
      onContinue={() => {
        const s = loadSave()
        if (s) {
          stateRef.current = s
          setState(s)
          setView('play')
          refreshSaves()
        }
      }}
      onEraseLast={() => {
        const door = saved.last
        if (!door) return
        if (!window.confirm(`Erase ${DOOR_SLOT_LABEL[door]}? Only that door. The other two stay.`)) {
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

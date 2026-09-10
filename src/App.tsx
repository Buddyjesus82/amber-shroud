import { useCallback, useState } from 'react'
import { DoorSelect } from './components/DoorSelect'
import { PlayScreen } from './components/PlayScreen'
import { TitleScreen } from './components/TitleScreen'
import { newGame } from './game/engine'
import { clearSave, hasSave, loadSave } from './game/save'
import type { DoorId, GameState } from './game/types'

type View = 'title' | 'doors' | 'play'

export default function App() {
  const [view, setView] = useState<View>('title')
  const [state, setState] = useState<GameState | null>(null)
  const [saved, setSaved] = useState(() => hasSave())

  const onChange = useCallback((s: GameState) => {
    setState(s)
    setView('play')
    setSaved(true)
  }, [])

  if (view === 'play' && state) {
    return (
      <PlayScreen
        state={state}
        onChange={onChange}
        onTitle={() => {
          setSaved(hasSave())
          setView('title')
        }}
      />
    )
  }

  if (view === 'doors') {
    return (
      <DoorSelect
        onBack={() => setView('title')}
        onPick={(door: DoorId) => {
          onChange(newGame(door))
        }}
      />
    )
  }

  return (
    <TitleScreen
      hasSave={saved}
      onNew={() => setView('doors')}
      onContinue={() => {
        const s = loadSave()
        if (s) {
          setState(s)
          setView('play')
        }
      }}
      onErase={() => {
        clearSave()
        setSaved(false)
        setState(null)
      }}
    />
  )
}

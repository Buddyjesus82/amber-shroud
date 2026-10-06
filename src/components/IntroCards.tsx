import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { INTRO_CARDS, INTRO_FADE_MS, introCardMs } from '../game/intro'

type Props = {
  /** Called on Skip and after the last scene. */
  onDone: () => void
}

const TICK_MS = 100

/**
 * The intro plays on its own as a slow cinematic: each still pans or zooms (the whole picture is
 * visible at the start or end of the move), the text fades in and holds, then the scene crossfades
 * into the next. Skip intro stays in the corner. Tapping anywhere else pauses and resumes.
 * prefers-reduced-motion: no pan or zoom, just the timed crossfade (see index.css).
 */
export function IntroCards({ onDone }: Props) {
  const [i, setI] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const elapsed = useRef(0)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])
  const finished = useRef(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    doneRef.current()
  }, [])

  useEffect(() => {
    elapsed.current = 0
  }, [i])

  useEffect(() => {
    if (prev === null) return
    const t = window.setTimeout(() => setPrev(null), INTRO_FADE_MS + 100)
    return () => window.clearTimeout(t)
  }, [prev])

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      elapsed.current += TICK_MS
      if (elapsed.current < introCardMs(INTRO_CARDS[i])) return
      elapsed.current = 0
      if (i >= INTRO_CARDS.length - 1) {
        finish()
        return
      }
      setPrev(i)
      setI(i + 1)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [i, paused, finish])

  const toggle = () => setPaused((p) => !p)
  const card = INTRO_CARDS[i]

  return (
    <div className={`screen intro-screen ${paused ? 'intro-paused' : ''}`} data-intro-card={card.id}>
      <header className="intro-bar">
        <span className="intro-count" aria-label={`Scene ${i + 1} of ${INTRO_CARDS.length}`}>
          {INTRO_CARDS.map((c, n) => (
            <span key={c.id} className={`intro-dot ${n === i ? 'on' : ''} ${n < i ? 'seen' : ''}`} />
          ))}
        </span>
        <button type="button" className="text-link intro-skip" data-intro-skip onClick={finish}>
          Skip intro
        </button>
      </header>
      <div
        className="intro-stage"
        role="button"
        tabIndex={0}
        aria-pressed={paused}
        aria-label={paused ? 'Paused. Tap to resume the intro.' : 'Intro playing. Tap to pause.'}
        data-intro-stage
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        {INTRO_CARDS.map((c, n) => {
          const state = n === i ? 'on' : n === prev ? 'was' : ''
          const src = `${import.meta.env.BASE_URL}intro/${c.img}?v=58`
          const style = { '--dur': `${introCardMs(c) + INTRO_FADE_MS}ms`, '--fade': `${INTRO_FADE_MS}ms` } as CSSProperties
          return (
            <section
              key={c.id}
              className={`intro-layer ${state}`}
              style={style}
              aria-hidden={n !== i}
              data-intro-layer={c.id}
            >
              <div className="intro-art">
                <img className="intro-fill" src={src} alt="" aria-hidden="true" />
                <img className={`intro-img kb-${n % 4}`} src={src} alt={c.alt} />
              </div>
              <div className="intro-panel">
                <h2>{c.title}</h2>
                <p>{c.text}</p>
              </div>
            </section>
          )
        })}
        <p className="intro-hint" aria-live="polite">
          {paused ? 'Paused · tap to resume' : 'Tap to pause'}
        </p>
      </div>
    </div>
  )
}

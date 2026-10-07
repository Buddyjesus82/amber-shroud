import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { INTRO_CARDS, INTRO_FADE_MS, INTRO_TEXT_DELAY_MS, INTRO_TEXT_FADE_MS, introCardMs, introMotionMs } from '../game/intro'

type Props = {
  /** Called on Skip and after the last scene. */
  onDone: () => void
}

const TICK_MS = 100
/** A single tick never counts for more than this (a throttled or backgrounded tab cannot jump scenes). */
const MAX_STEP_MS = 250
/** Taps this soon after the intro opens are the New game / Watch the intro tap itself (or its echo). */
const OPEN_TAP_GUARD_MS = 800

/**
 * The intro plays on its own as a slow cinematic: each still pans or zooms (the whole picture is
 * visible at the start or end of the move), the text fades in, the reading time runs, then the scene
 * sits still for INTRO_HOLD_MS before a slow crossfade into the next. Only the current scene (and
 * the one fading out during a crossfade) is visible; the next scene stays hidden until its turn. Skip intro stays in the corner. Tapping anywhere
 * else pauses and resumes.
 *
 * Advancing is driven by one setTimeout clock measuring real elapsed time (performance.now). It
 * never waits on CSS animation/transition events, image load events, or the page visibility state
 * (which iOS Home Screen apps can misreport as hidden), and it starts running immediately.
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

  const openedAt = useRef<number | null>(null)
  useEffect(() => {
    openedAt.current = performance.now()
  }, [])

  useEffect(() => {
    if (prev === null) return
    const t = window.setTimeout(() => setPrev(null), INTRO_FADE_MS + 100)
    return () => window.clearTimeout(t)
  }, [prev])

  // The scene clock. Restarts its timer chain when the scene changes or play resumes; elapsed time
  // for the current scene survives a pause.
  useEffect(() => {
    if (paused) return
    let last = performance.now()
    let timer = 0
    const tick = () => {
      const now = performance.now()
      elapsed.current += Math.min(Math.max(now - last, 0), MAX_STEP_MS)
      last = now
      if (elapsed.current >= introCardMs(INTRO_CARDS[i])) {
        elapsed.current = 0
        if (i >= INTRO_CARDS.length - 1) {
          finish()
          return
        }
        setPrev(i)
        setI(i + 1)
        return
      }
      timer = window.setTimeout(tick, TICK_MS)
    }
    timer = window.setTimeout(tick, TICK_MS)
    return () => window.clearTimeout(timer)
  }, [i, paused, finish])

  const toggle = () => {
    // Ignore the tap that opened the intro (iOS can deliver a late echo of it to the new screen).
    if (openedAt.current === null || performance.now() - openedAt.current < OPEN_TAP_GUARD_MS) return
    setPaused((p) => !p)
  }
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
          const src = `${import.meta.env.BASE_URL}intro/${c.img}?v=65`
          const style = {
            '--dur': `${introMotionMs(c)}ms`,
            '--fade': `${INTRO_FADE_MS}ms`,
            '--text-delay': `${INTRO_TEXT_DELAY_MS}ms`,
            '--text-fade': `${INTRO_TEXT_FADE_MS}ms`,
          } as CSSProperties
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
                <img className={`intro-img kb-${n % 4}`} src={src} alt={c.alt} decoding="async" />
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

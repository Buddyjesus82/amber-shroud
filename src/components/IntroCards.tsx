import { useEffect, useState } from 'react'
import { INTRO_CARDS } from '../game/intro'

type Props = {
  /** Called on Skip and after the last card. */
  onDone: () => void
  /** Label for the last card's button. */
  doneLabel: string
}

export function IntroCards({ onDone, doneLabel }: Props) {
  const [i, setI] = useState(0)
  const card = INTRO_CARDS[i]
  const last = i === INTRO_CARDS.length - 1
  const src = `${import.meta.env.BASE_URL}intro/${card.img}?v=56`

  useEffect(() => {
    // Warm the next still so Next does not flash an empty frame.
    const next = INTRO_CARDS[i + 1]
    if (!next) return
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}intro/${next.img}?v=56`
  }, [i])

  return (
    <div className="screen intro-screen" data-intro-card={card.id}>
      <header className="intro-bar">
        <span className="intro-count" aria-label={`Card ${i + 1} of ${INTRO_CARDS.length}`}>
          {INTRO_CARDS.map((c, n) => (
            <span key={c.id} className={`intro-dot ${n === i ? 'on' : ''} ${n < i ? 'seen' : ''}`} />
          ))}
        </span>
        <button type="button" className="text-link intro-skip" data-intro-skip onClick={onDone}>
          Skip intro
        </button>
      </header>
      <div className="intro-art">
        <img className="intro-fill" src={src} alt="" aria-hidden="true" />
        <img className="intro-img" src={src} alt={card.alt} />
      </div>
      <div className="intro-panel">
        <h2>{card.title}</h2>
        <p>{card.text}</p>
      </div>
      <div className="intro-actions">
        {i > 0 ? (
          <button type="button" className="btn btn-ghost intro-back" onClick={() => setI(i - 1)}>
            Back
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-gold intro-next"
          data-intro-next
          onClick={() => (last ? onDone() : setI(i + 1))}
        >
          {last ? doneLabel : 'Next'}
        </button>
      </div>
    </div>
  )
}

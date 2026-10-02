import { useEffect, useRef } from 'react'
import type { HelpTopic } from '../game/helpTopics'

type Props = {
  topic: HelpTopic
  onClose: () => void
}

/** help <topic>. Same frame as the help card. */
export function HelpTopicCard({ topic, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="help-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <h2 id="topic-title">help {topic.id}</h2>
          <button ref={closeRef} type="button" className="help-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {topic.sections.map((section, i) => (
          <section key={section.title ?? i} className="help-group">
            {section.title ? <h3>{section.title}</h3> : null}
            {section.rows.map((row) =>
              row.key ? (
                <p key={row.text} className="topic-row">
                  <span className="topic-key">{row.key}</span>
                  <span className="topic-val">{row.text}</span>
                </p>
              ) : (
                <p
                  key={row.text}
                  className={`topic-line${row.bullet ? ' topic-bullet' : ''}${row.secret ? ' topic-secret' : ''}`}
                >
                  {row.text}
                </p>
              ),
            )}
          </section>
        ))}
        <button type="button" className="btn btn-gold topic-ok" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  )
}

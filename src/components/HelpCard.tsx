import { useEffect, useRef } from 'react'
import { HELP_GROUPS, type HelpEntry } from '../game/help'
import { HELP_HINT, HELP_TOPICS } from '../game/helpTopics'

type Props = {
  entries: HelpEntry[]
  onClose: () => void
  onPick: (command: string) => void
  onTopic: (id: string) => void
}

export function HelpCard({ entries, onClose, onPick, onTopic }: Props) {
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

  const groups = HELP_GROUPS.map((group) => ({
    group,
    items: entries.filter((entry) => entry.group === group),
  })).filter((group) => group.items.length)

  return (
    <div className="help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="help-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <h2 id="help-title">Things you could try</h2>
          <button ref={closeRef} type="button" className="help-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {groups.length ? (
          groups.map((group) => (
            <section key={group.group} className="help-group">
              <h3>{group.group}</h3>
              <ul>
                {group.items.map((entry) => (
                  <li key={entry.command}>
                    <button type="button" className="help-entry" onClick={() => onPick(entry.command)}>
                      <span className="help-cmd">{entry.command}</span>
                      <span className="help-why">: {entry.why}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="help-empty">Nothing hidden here. Try look.</p>
        )}
        <section className="help-group">
          <h3>Topics</h3>
          <p className="help-hint">{HELP_HINT}</p>
          <ul>
            {HELP_TOPICS.map((topic) => (
              <li key={topic.id}>
                <button type="button" className="help-entry" onClick={() => onTopic(topic.id)}>
                  <span className="help-cmd">help {topic.id}</span>
                  <span className="help-why">: {topic.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

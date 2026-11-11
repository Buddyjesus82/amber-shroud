import { useState } from 'react'
import { REPORT_CLOSE, REPORT_COPY, REPORT_COPIED, REPORT_LABEL, REPORT_PLACEHOLDER, reportBundle } from '../game/reportLog'
import type { GameState } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
}

export function ReportCard({ state, onClose }: Props) {
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)

  async function copy() {
    const text = reportBundle(state, note)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(text)
      setFallback(null)
      setCopied(true)
    } catch {
      setFallback(text)
      setCopied(false)
    }
  }

  return (
    <div className="map-backdrop" role="dialog" aria-label={REPORT_PLACEHOLDER} onClick={onClose}>
      <div className="map-sheet report-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{REPORT_LABEL}</h2>
          <button type="button" className="text-link" onClick={onClose}>
            {REPORT_CLOSE}
          </button>
        </header>
        <textarea
          className="report-note"
          value={note}
          placeholder={REPORT_PLACEHOLDER}
          onChange={(e) => {
            setNote(e.target.value)
            setCopied(false)
          }}
        />
        <button type="button" className="btn btn-gold" onClick={() => void copy()}>
          {copied ? REPORT_COPIED : REPORT_COPY}
        </button>
        {fallback != null ? (
          <textarea className="report-note report-fallback" readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} />
        ) : null}
      </div>
    </div>
  )
}

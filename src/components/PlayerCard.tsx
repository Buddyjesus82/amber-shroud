import { useId, useState, type CSSProperties } from 'react'
import { coverBand, playCoverFile } from '../game/art'
import { zafirCard } from '../game/zafirCard'
import type { GameState } from '../game/types'

/**
 * v256: the player's own card, first in the Gear sheet. Title and text only.
 * v257: collapsed by default to a bar (thumbnail, title, chevron icon); tap to expand, tap again to collapse.
 * Gear unmounts on close, so the card starts collapsed every time Gear opens.
 */
export function PlayerCard({ state, defaultOpen = false }: { state: GameState; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  const card = zafirCard(state)
  const [top, bot] = coverBand(card.cover)
  const span = Math.max(0.05, bot - top)
  const src = `${import.meta.env?.BASE_URL ?? '/'}covers/${playCoverFile(card.cover)}?v=82`
  const style = {
    aspectRatio: `${16 / (9 * span)}`,
    objectPosition: `center ${span >= 1 ? 0 : (top / (1 - span)) * 100}%`,
  } as CSSProperties
  return (
    <div className={`player-card${open ? ' open' : ''}`} data-card={card.id} data-card-state={card.state}>
      <button
        type="button"
        className="player-bar"
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={card.title}
        onClick={() => setOpen((o) => !o)}
      >
        <img className="player-thumb" src={src} alt="" aria-hidden="true" />
        <strong className="player-title">{card.title}</strong>
        <svg className="player-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="player-fold" id={bodyId} aria-hidden={!open} inert={!open}>
        <div className="player-fold-inner">
          <img className="player-cover" src={src} alt={card.title} style={style} />
          <div className="player-body">
            {card.text.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

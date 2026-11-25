import type { CSSProperties } from 'react'
import { coverBand, playCoverFile } from '../game/art'
import { zafirCard } from '../game/zafirCard'
import type { GameState } from '../game/types'

/** v256: the player's own card, first in the Gear sheet above the party card. Title and text only. */
export function PlayerCard({ state }: { state: GameState }) {
  const card = zafirCard(state)
  const [top, bot] = coverBand(card.cover)
  const span = Math.max(0.05, bot - top)
  const style = {
    aspectRatio: `${16 / (9 * span)}`,
    objectPosition: `center ${span >= 1 ? 0 : (top / (1 - span)) * 100}%`,
  } as CSSProperties
  return (
    <div className="player-card" data-card={card.id} data-card-state={card.state}>
      <img className="player-cover" src={`${import.meta.env?.BASE_URL ?? '/'}covers/${playCoverFile(card.cover)}?v=82`} alt={card.title} style={style} />
      <div className="player-body">
        <strong>{card.title}</strong>
        {card.text.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  )
}

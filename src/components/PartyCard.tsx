import { useState } from 'react'
import { PERKS, companionMaxHp, companionOf, dismissCompanion } from '../game/companions'
import type { GameState } from '../game/types'

/** v205: the one party slot. Compact in the HUD; with Dismiss in Gear. */
export function PartyCard({ state, onChange, full = false, onOpen }: { state: GameState; onChange?: (s: GameState) => void; full?: boolean; onOpen?: () => void }) {
  const [ask, setAsk] = useState(false)
  const mate = companionOf(state)
  if (!mate) return null
  const max = companionMaxHp(state)
  const kelt = mate.id === 'kelt' && state.flags.keltStatus === 'active'
  const left = kelt ? Math.max(0, Number(state.flags.keltMax ?? 0) - Number(state.flags.keltScenes ?? 0)) : 0
  return (
    <div className={`party-card${full ? ' party-full' : ''}`} onClick={full ? undefined : onOpen} role={full ? undefined : 'button'}>
      <img className="party-portrait" src={`${import.meta.env.BASE_URL}${mate.portrait}`} alt={mate.name} />
      <div className="party-body">
        <strong>{mate.name}</strong>
        <span className="party-stats">
          ♥ {mate.hp}/{max} · ⚔ {mate.strike} · 🛡 {mate.shell}
          {kelt ? ` · ${left} scene${left === 1 ? '' : 's'} left` : ''}
        </span>
        {full && PERKS[mate.id] ? <span className="party-perk">{PERKS[mate.id]}</span> : null}
        {full && onChange ? (
          ask ? (
            <span className="party-ask">
              <button type="button" className="text-link danger" onClick={() => { setAsk(false); onChange(dismissCompanion(state)) }}>
                Yes, dismiss
              </button>
              <button type="button" className="text-link" onClick={() => setAsk(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="text-link" onClick={() => setAsk(true)}>
              Dismiss
            </button>
          )
        ) : null}
      </div>
    </div>
  )
}

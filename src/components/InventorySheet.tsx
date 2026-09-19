import { drinkDrop, equipItem, sapLabel, unequipSlot } from '../game/engine'
import { listedKit } from '../game/kit'
import { ITEMS } from '../game/content/catalog'
import type { EquipSlot, GameState, ItemId } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
  onChange: (s: GameState) => void
}

export function InventorySheet({ state, onClose, onChange }: Props) {
  const chips = listedKit(state.items)
  const weapon = state.equipped?.weapon ? ITEMS[state.equipped.weapon] : null
  const armor = state.equipped?.armor ? ITEMS[state.equipped.armor] : null

  return (
    <div className="sheet-backdrop" role="dialog" aria-label="Gear" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Gear</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="epithet">You are {state.epithet}.</p>
        <p className="kit-sap">
          Sap {state.sap}/{state.sapMax} · {sapLabel(state.sap)}. Empty sap is a crisis, not a death. Equip
          weapons and armor — no dice. Gear gates the verbs that keep you alive.
        </p>

        <div className="equip-slots">
          <Slot
            label="Weapon"
            item={weapon}
            onClear={() => onChange(unequipSlot(state, 'weapon'))}
          />
          <Slot
            label="Armor"
            item={armor}
            onClear={() => onChange(unequipSlot(state, 'armor'))}
          />
        </div>

        {chips.length === 0 ? (
          <p className="empty">Pockets full of heat. Nothing else. Find, buy, or steal before the next spend.</p>
        ) : (
          <ul className="kit-list">
            {chips.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.name}
                    {c.n > 1 ? ` ×${c.n}` : ''}
                    {worn(state, c.id) ? ' · on' : ''}
                  </strong>
                  <span>{c.desc}</span>
                </div>
                <ItemActs state={state} id={c.id} slot={c.slot} onChange={onChange} onClose={onClose} />
              </li>
            ))}
          </ul>
        )}
        <div className="heat-legend">
          <p>
            <b>Cartel</b> {state.heat.cartel} · Ironwood, Valerius, Hounds
          </p>
          <p>
            <b>Seekers</b> {state.heat.seekers} · cloth, vessels, Sybella
          </p>
          <p>
            <b>Strays</b> {state.heat.strays} · Oil-Tooth, Silas, Kaelen the Sifter
          </p>
        </div>
      </div>
    </div>
  )
}

function worn(state: GameState, id: ItemId) {
  return state.equipped?.weapon === id || state.equipped?.armor === id
}

function Slot({
  label,
  item,
  onClear,
}: {
  label: string
  item: { name: string } | null
  onClear: () => void
}) {
  return (
    <div className="equip-slot">
      <em>{label}</em>
      <strong>{item?.name ?? 'Empty'}</strong>
      {item ? (
        <button type="button" className="text-link" onClick={onClear}>
          Unequip
        </button>
      ) : (
        <span className="kit-empty">Tap a weapon or armor below</span>
      )}
    </div>
  )
}

function ItemActs({
  state,
  id,
  slot,
  onChange,
  onClose,
}: {
  state: GameState
  id: ItemId
  slot?: EquipSlot
  onChange: (s: GameState) => void
  onClose: () => void
}) {
  if (id === 'vial_drop') {
    return (
      <button
        type="button"
        className="btn btn-gold btn-tiny"
        onClick={() => {
          onChange(drinkDrop(state))
          onClose()
        }}
      >
        Drink
      </button>
    )
  }
  if (!slot) return null
  const on = worn(state, id)
  return (
    <button
      type="button"
      className="btn btn-tiny btn-ghost"
      onClick={() => onChange(on ? unequipSlot(state, slot) : equipItem(state, id))}
    >
      {on ? 'Unequip' : 'Equip'}
    </button>
  )
}

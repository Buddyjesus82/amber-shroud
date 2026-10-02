import { bindSalve, drinkDrop, equipItem, sapLabel, unequipSlot } from '../game/engine'
import { heatFactions } from '../game/heat'
import { gearStat, isWorn, listedKit } from '../game/kit'
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
  const garment = state.equipped?.garment ? ITEMS[state.equipped.garment] : null
  const head = state.equipped?.head ? ITEMS[state.equipped.head] : null

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
          Sap {state.sap}/{state.sapMax} · {sapLabel(state.sap)}. Health {state.health}/{state.healthMax}.
          Sap is thirst and walking. Health takes fight hits. Empty sap is a crisis. Empty health puts you
          down. Slots: Weapon (Strike), Armor (Shell), Garment, Head. A garment does not add Shell.
        </p>

        <div className="equip-slots">
          <Slot
            label="Weapon"
            empty="Empty hand"
            item={weapon}
            onClear={() => onChange(unequipSlot(state, 'weapon'))}
          />
          <Slot
            label="Armor"
            empty="Bare"
            item={armor}
            onClear={() => onChange(unequipSlot(state, 'armor'))}
          />
          <Slot
            label="Garment"
            empty="Unworn"
            item={garment}
            onClear={() => onChange(unequipSlot(state, 'garment'))}
          />
          <Slot
            label="Head"
            empty="Bare brow"
            item={head}
            onClear={() => onChange(unequipSlot(state, 'head'))}
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
                    {gearStat(c) ? ` · ${gearStat(c)}` : ''}
                    {isWorn(state, c.id) ? ' · on' : ''}
                  </strong>
                  <span>{c.desc}</span>
                </div>
                <ItemActs state={state} id={c.id} slot={c.slot} onChange={onChange} onClose={onClose} />
              </li>
            ))}
          </ul>
        )}
        <div className="heat-legend">
          {(['cartel', 'seekers', 'strays'] as const).map((f) => (
            <p key={f}>
              <b>{heatFactions(state.door)[f].name}</b> {state.heat[f]} · {heatFactions(state.door)[f].watch}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function Slot({
  label,
  empty,
  item,
  onClear,
}: {
  label: string
  empty: string
  item: { name: string; strike?: number; shell?: number } | null
  onClear: () => void
}) {
  const stat = gearStat(item)
  return (
    <div className="equip-slot">
      <em>{label}</em>
      <strong>
        {item?.name ?? 'Empty'}
        {stat ? <span className="gear-stat">{stat}</span> : null}
      </strong>
      {item ? (
        <button type="button" className="btn btn-tiny unequip-btn" onClick={onClear}>
          Unequip
        </button>
      ) : (
        <span className="kit-empty">{empty}</span>
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
  if (id === 'salve') {
    return (
      <button
        type="button"
        className="btn btn-gold btn-tiny"
        onClick={() => {
          onChange(bindSalve(state))
          onClose()
        }}
      >
        Bind
      </button>
    )
  }
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
  const on = isWorn(state, id)
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

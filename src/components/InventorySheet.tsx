import { useState } from 'react'
import { bindSalve, canCraftScavPack, craftScavPack, drinkDrop, dropItem, dropStack, equipBlock, equipItem, sapLabel, unequipSlot } from '../game/engine'
import { heatFactions } from '../game/heat'
import {
  bagCap,
  bagCount,
  bagFree,
  bagLoad,
  bagStacks,
  bagUnits,
  disguiseActive,
  equippedShell,
  equippedStrike,
  gearStat,
  gearTab,
  heldNames,
  heldOf,
  listedKit,
  SCAV_PACK_LOCKED,
  SHELL_CAP,
  SLOT_EMPTY,
  SLOT_LABEL,
  slotsFor,
  wornCount,
  type GearTab,
  type KitChip,
} from '../game/kit'
import { ITEMS } from '../game/content/catalog'
import type { EquipSlot, GameState, ItemId } from '../game/types'

type Props = {
  state: GameState
  onClose: () => void
  onChange: (s: GameState) => void
}

const TABS: { id: GearTab; label: string }[] = [
  { id: 'worn', label: 'Worn' },
  { id: 'use', label: 'Consumables' },
  { id: 'trade', label: 'Scrap & trade' },
  { id: 'key', label: 'Key items' },
]

/** Body layout, three across: cloak, head, garment / main hand, body, off hand / hands, legs. */
const LAYOUT: (EquipSlot | null)[] = ['cloak', 'head', 'garment', 'weapon', 'armor', 'offhand', 'hands', 'legs', null]

export function InventorySheet({ state, onClose, onChange }: Props) {
  const [tab, setTab] = useState<GearTab>('worn')
  const chips = listedKit(state.items)
  const held = heldOf(state.flags)
  const heldText = Object.keys(held).length ? heldNames(held) : ''
  const load = bagLoad(state)
  const cap = bagCap(state)

  return (
    <div className="sheet-backdrop" role="dialog" aria-label="Gear" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Gear</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="kit-sap">
          Sap {state.sap}/{state.sapMax} · {sapLabel(state.sap)}. Health {state.health}/{state.healthMax}. Strike{' '}
          {equippedStrike(state)} · Shell {equippedShell(state)} (max {SHELL_CAP}).{' '}
          <b className={load > cap ? 'bag-over' : undefined}>
            Bag {load}/{cap} slots
          </b>
          {load > cap ? ' Over the limit: nothing new fits until slots free up. More of a stack you carry still fits.' : ''}
        </p>
        {heldText ? (
          <p className="bag-held">
            On the ground: {heldText}. Your bag is full. Drop something below to free a slot and pick it up.
          </p>
        ) : null}
        {disguiseActive(state) ? <p className="bag-held">Vessel Cloth on. Cartel eyes read a cup until someone looks closely.</p> : null}

        <div className="gear-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`gear-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'worn' ? <WornTab state={state} chips={chips} onChange={onChange} /> : null}
        {tab !== 'worn' ? <ListTab state={state} tab={tab} chips={chips} onChange={onChange} onClose={onClose} /> : null}

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

function WornTab({ state, chips, onChange }: { state: GameState; chips: KitChip[]; onChange: (s: GameState) => void }) {
  const spare = chips.filter((c) => c.slot && c.n > wornCount(state, c.id))
  return (
    <>
      <div className="body-grid" aria-label="Worn slots">
        {LAYOUT.map((slot, i) =>
          slot ? (
            <Slot key={slot} state={state} slot={slot} onClear={() => onChange(unequipSlot(state, slot))} />
          ) : (
            <div key={`gap-${i}`} className="equip-slot gap" aria-hidden="true" />
          ),
        )}
      </div>
      <p className="kit-note">
        Main hand: any weapon. Off hand: a short blade or club (Strike +1) or a shield. Body, cloak, head, legs, hands,
        and a shield add Shell. A garment adds none.
      </p>
      <h3 className="gear-sub">Spare gear</h3>
      {spare.length === 0 ? (
        <p className="empty">Nothing spare to wear. Finds and shelves turn up more.</p>
      ) : (
        <ul className="kit-list">
          {spare.map((c) => (
            <li key={c.id}>
              <div>
                <strong>
                  {c.name}
                  {c.n - wornCount(state, c.id) > 1 ? ` ×${c.n - wornCount(state, c.id)}` : ''}
                  {gearStat(c) ? ` · ${gearStat(c)}` : ''}
                </strong>
                <span>{ITEMS[c.id].perk ?? c.desc}</span>
                {slotsFor(c.id)
                  .map((slot) => equipBlock(state, c.id, slot))
                  .filter((b): b is string => !!b)
                  .map((b) => (
                    <span key={b} className="kit-lock">
                      {b}
                    </span>
                  ))}
              </div>
              <div className="item-acts">
                {slotsFor(c.id).map((slot) => {
                  const block = equipBlock(state, c.id, slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      className="btn btn-tiny btn-ghost"
                      disabled={!!block}
                      title={block ?? undefined}
                      onClick={() => onChange(equipItem(state, c.id, slot))}
                    >
                      {slotsFor(c.id).length > 1 ? SLOT_LABEL[slot] : 'Equip'}
                    </button>
                  )
                })}
                <DropBtn state={state} id={c.id} onChange={onChange} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Slot({ state, slot, onClear }: { state: GameState; slot: EquipSlot; onClear: () => void }) {
  const id = state.equipped?.[slot]
  const item = id ? ITEMS[id] : null
  const stat = slot === 'offhand' && item && item.offhand !== 'shield' ? 'Strike +1' : gearStat(item)
  return (
    <div className={`equip-slot${item ? ' filled' : ''}`}>
      <em>{SLOT_LABEL[slot]}</em>
      <strong>
        {item?.name ?? 'Empty'}
        {stat ? <span className="gear-stat">{stat}</span> : null}
      </strong>
      {item ? (
        <button type="button" className="btn btn-tiny unequip-btn" onClick={onClear}>
          Unequip
        </button>
      ) : (
        <span className="kit-empty">{SLOT_EMPTY[slot]}</span>
      )}
    </div>
  )
}

function ListTab({
  state,
  tab,
  chips,
  onChange,
  onClose,
}: {
  state: GameState
  tab: GearTab
  chips: KitChip[]
  onChange: (s: GameState) => void
  onClose: () => void
}) {
  const rows = chips.filter((c) => gearTab(c.id) === tab)
  const empty =
    tab === 'use'
      ? 'No Drops or salve. Scavenge, skim, or buy before the next spend.'
      : tab === 'trade'
        ? 'No scrap or coin. Scavenge for scrap; traders pay for spare gear.'
        : 'No tools, vials, or quest items yet.'
  return (
    <>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul className="kit-list">
          {rows.map((c) => (
            <li key={c.id}>
              <div>
                <strong>
                  {c.name}
                  {c.n > 1 ? ` ×${c.n}` : ''}
                  {slotNote(state, c.id)}
                </strong>
                <span>{c.desc}</span>
              </div>
              <div className="item-acts">
                <UseBtn state={state} id={c.id} onChange={onChange} onClose={onClose} />
                <DropBtn state={state} id={c.id} onChange={onChange} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {tab === 'key' ? <CraftBox state={state} onChange={onChange} /> : null}
    </>
  )
}

function CraftBox({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const owned = (state.items.scav_pack ?? 0) > 0
  const can = canCraftScavPack(state)
  return (
    <div className="craft-box">
      <h3 className="gear-sub">Bag and craft</h3>
      <p className="kit-note">
        Your bag has {bagCap(state)} slots. A stack of small goods (Drops, salves, scrap, cord) takes one slot however many
        are in it; each spare weapon or wearable takes its own. Key items, coin, and worn gear ride free. A Scav Pack has 14
        slots; a Hauler Pack 20.
      </p>
      {owned ? (
        <p className="kit-note">You have a Scav Pack.</p>
      ) : (
        <>
          <button type="button" className="btn btn-tiny btn-gold" disabled={!can} onClick={() => onChange(craftScavPack(state))}>
            Stitch a Scav Pack
          </button>
          <p className="kit-note">{can ? 'Uses 3 scrap and 1 Sinew Cord.' : SCAV_PACK_LOCKED}.</p>
        </>
      )}
    </div>
  )
}

function UseBtn({ state, id, onChange, onClose }: { state: GameState; id: ItemId; onChange: (s: GameState) => void; onClose: () => void }) {
  if (id !== 'salve' && id !== 'vial_drop') return null
  return (
    <button
      type="button"
      className="btn btn-gold btn-tiny"
      onClick={() => {
        onChange(id === 'salve' ? bindSalve(state) : drinkDrop(state))
        onClose()
      }}
    >
      {id === 'salve' ? 'Bind' : 'Drink'}
    </button>
  )
}

/** " · 1 slot" for a stack or a spare piece; " · 2 slots" for two spare pieces; nothing for free items. */
function slotNote(state: GameState, id: ItemId): string {
  if (bagFree(id)) return ''
  const used = bagUnits(state, id)
  if (!used) return ' · worn'
  return ` · ${used} slot${used === 1 ? '' : 's'}`
}

function DropBtn({ state, id, onChange }: { state: GameState; id: ItemId; onChange: (s: GameState) => void }) {
  if (bagFree(id) || bagUnits(state, id) <= 0) return null
  const stack = bagStacks(id) ? bagCount(state, id) : 0
  return (
    <>
      <button type="button" className="btn btn-tiny btn-ghost" onClick={() => onChange(dropItem(state, id))}>
        Drop 1
      </button>
      {stack > 1 ? (
        <button type="button" className="btn btn-tiny btn-ghost" onClick={() => onChange(dropStack(state, id))}>
          Drop all
        </button>
      ) : null}
    </>
  )
}

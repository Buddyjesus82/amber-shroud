import { ITEMS } from './content/catalog'
import { moneyLabel } from './trade'
import type { Effect, EquipSlot, GameState, ItemDef, ItemId } from './types'

/** Body layout order: head to feet, then hands. */
export const EQUIP_SLOTS: EquipSlot[] = ['head', 'cloak', 'armor', 'garment', 'hands', 'legs', 'weapon', 'offhand']

export const SLOT_LABEL: Record<EquipSlot, string> = {
  head: 'Head',
  armor: 'Body',
  legs: 'Legs',
  hands: 'Hands',
  cloak: 'Cloak',
  garment: 'Garment',
  weapon: 'Main hand',
  offhand: 'Off hand',
}

export const SLOT_EMPTY: Record<EquipSlot, string> = {
  head: 'Bare head',
  armor: 'Bare shoulders',
  legs: 'Bare legs',
  hands: 'Bare hands',
  cloak: 'No cloak',
  garment: 'Unworn',
  weapon: 'Empty hand (Strike 1)',
  offhand: 'Empty hand',
}

/** Shell pieces stack up to this. */
export const SHELL_CAP = 5
/** A short blade or club in the Off hand adds this to Strike. */
export const OFFHAND_STRIKE = 1
/** The bag you start with. Bigger bags are items (catalog `bag`). */
export const BASE_BAG = 10

export type KitChip = {
  id: ItemId
  name: string
  n: number
  kind: 'gear' | 'currency' | 'key' | 'weapon' | 'armor' | 'garment'
  desc: string
  slot?: EquipSlot
  strike?: number
  shell?: number
}

export function gearStat(item: Pick<ItemDef, 'strike' | 'shell'> | null | undefined): string | null {
  if (!item) return null
  if (item.strike != null) return `Strike ${item.strike}`
  if (item.shell != null) return `Shell ${item.shell}`
  return null
}

export function isWorn(state: GameState, id: ItemId): boolean {
  return EQUIP_SLOTS.some((slot) => state.equipped?.[slot] === id)
}

/** How many of this item are on the body. */
export function wornCount(state: GameState, id: ItemId): number {
  return EQUIP_SLOTS.filter((slot) => state.equipped?.[slot] === id).length
}

/** Slots an item can go in. Weapons with an off-hand kind can go in either hand; a shield only the Off hand. */
export function slotsFor(id: ItemId): EquipSlot[] {
  const def = ITEMS[id]
  if (!def?.slot) return []
  if (def.offhand === 'shield') return ['offhand']
  if (def.slot === 'weapon' && def.offhand) return ['weapon', 'offhand']
  return [def.slot]
}

/** Main hand Strike (bare hand is 1), plus 1 for a short blade or club in the Off hand. The fight adds its own 0-2 swing. */
export function equippedStrike(state: GameState): number {
  const id = state.equipped?.weapon
  const main = id && ITEMS[id]?.strike != null ? (ITEMS[id].strike as number) : 1
  const off = state.equipped?.offhand
  const offDef = off ? ITEMS[off] : null
  const bonus = offDef && (offDef.offhand === 'blade' || offDef.offhand === 'club') ? OFFHAND_STRIKE : 0
  return main + bonus
}

/** Body, cloak, head, legs, hands, and a shield add up, to SHELL_CAP. A garment adds nothing. Bare is 0. */
export function equippedShell(state: GameState): number {
  let total = 0
  for (const slot of ['armor', 'cloak', 'head', 'legs', 'hands', 'offhand'] as EquipSlot[]) {
    const id = state.equipped?.[slot]
    const def = id ? ITEMS[id] : null
    if (!def || def.shell == null) continue
    if (slot === 'offhand' && def.offhand !== 'shield') continue
    total += def.shell
  }
  return Math.min(SHELL_CAP, total)
}

// ── Bag ──

/** Key items, bags, and the empty vial ride free. So do coins (Glints, Scrip). */
export function bagFree(id: ItemId): boolean {
  const def = ITEMS[id]
  if (!def) return true
  return def.kind === 'key' || def.kind === 'currency' || id === 'vial_empty' || id === 'ossa_token' || def.bag != null
}

/**
 * Small goods stack: a whole stack takes ONE bag slot, however many are in it (Drops, salves, scrap,
 * sinew, and any other small consumable). Weapons, armor, garments, and anything else you can wear
 * never stack: one slot each.
 */
export function bagStacks(id: ItemId): boolean {
  const def = ITEMS[id]
  if (!def || bagFree(id)) return false
  return def.kind === 'gear' && !def.slot
}

export function bagCap(state: Pick<GameState, 'items'>): number {
  let cap = BASE_BAG
  for (const id of Object.keys(state.items) as ItemId[]) {
    const b = ITEMS[id]?.bag
    if (b && (state.items[id] ?? 0) > 0) cap = Math.max(cap, b)
  }
  return cap
}

/** Pieces of this item in the bag: everything carried that is not free and not worn. Worn gear rides free. */
export function bagCount(state: Pick<GameState, 'items' | 'equipped'>, id: ItemId): number {
  if (bagFree(id)) return 0
  const n = state.items[id] ?? 0
  const worn = EQUIP_SLOTS.filter((slot) => state.equipped?.[slot] === id).length
  return Math.max(0, n - worn)
}

/** Bag slots this item takes: a stack is one slot; each spare weapon or wearable is one slot. */
export function bagUnits(state: Pick<GameState, 'items' | 'equipped'>, id: ItemId): number {
  const n = bagCount(state, id)
  if (!n) return 0
  return bagStacks(id) ? 1 : n
}

/** Slots used. */
export function bagLoad(state: Pick<GameState, 'items' | 'equipped'>): number {
  let n = 0
  for (const id of Object.keys(state.items) as ItemId[]) n += bagUnits(state, id)
  return n
}

export function bagLine(state: Pick<GameState, 'items' | 'equipped'>): string {
  return `Bag ${bagLoad(state)}/${bagCap(state)} slots`
}

/**
 * Would the bag take `add` (after `remove`)? More of a stack you already carry always fits.
 * A bag already over its cap (an old save) takes nothing that needs a new slot until slots free up.
 */
export function bagFits(
  state: Pick<GameState, 'items' | 'equipped'>,
  add: Partial<Record<ItemId, number>>,
  remove: Partial<Record<ItemId, number>> = {},
): boolean {
  const items = { ...state.items }
  for (const id of Object.keys(remove) as ItemId[]) {
    const left = (items[id] ?? 0) - (remove[id] ?? 0)
    if (left > 0) items[id] = left
    else delete items[id]
  }
  for (const id of Object.keys(add) as ItemId[]) items[id] = (items[id] ?? 0) + (add[id] ?? 0)
  const next = { ...state, items }
  const cap = bagCap(next)
  const after = bagLoad(next)
  return after <= cap || after <= bagLoad(state)
}

/** Held finds while the bag is full, as `id:n|id:n`. */
export function heldOf(flags: GameState['flags']): Partial<Record<ItemId, number>> {
  const raw = flags.bagHeld
  const out: Partial<Record<ItemId, number>> = {}
  if (typeof raw !== 'string' || !raw) return out
  for (const part of raw.split('|')) {
    const [id, n] = part.split(':')
    if (id && ITEMS[id as ItemId] && Number(n) > 0) out[id as ItemId] = Number(n)
  }
  return out
}

export function heldString(held: Partial<Record<ItemId, number>>): string {
  return (Object.keys(held) as ItemId[])
    .filter((id) => (held[id] ?? 0) > 0)
    .map((id) => `${id}:${held[id]}`)
    .join('|')
}

export function heldNames(held: Partial<Record<ItemId, number>>): string {
  return (Object.keys(held) as ItemId[])
    .map((id) => ((held[id] ?? 0) > 1 ? `${ITEMS[id].name} ×${held[id]}` : ITEMS[id].name))
    .join(', ')
}

/**
 * After a find: anything that needs a slot the bag does not have is set aside (flag bagHeld) instead
 * of carried. More of a stack you already carry always fits. Only new slots are held; a bag that was
 * already over (an old save) keeps everything it had, but takes no new slots until some free up.
 */
export function fitBag(prev: GameState, next: GameState): GameState {
  const cap = bagCap(next)
  const before = bagLoad(prev)
  const after = bagLoad(next)
  if (after <= cap || after <= before) return next
  let excess = after - Math.max(cap, before)
  const items = { ...next.items }
  const held = heldOf(next.flags)
  const grown = (Object.keys(items) as ItemId[]).filter((id) => bagUnits(next, id) > bagUnits(prev, id)).reverse()
  for (const id of grown) {
    if (excess <= 0) break
    const slots = bagUnits(next, id) - bagUnits(prev, id)
    // A new stack goes down whole (it is one slot); spare wearables go down one slot at a time.
    const take = bagStacks(id) ? bagCount(next, id) - bagCount(prev, id) : Math.min(excess, slots)
    items[id] = (items[id] ?? 0) - take
    if (!items[id]) delete items[id]
    held[id] = (held[id] ?? 0) + take
    excess -= bagStacks(id) ? slots : take
  }
  const note = `Your bag is full (${bagLoad({ ...next, items })}/${cap} slots). The ${heldNames(held)} stays on the ground. Drop something to free a slot, or leave it.`
  return {
    ...next,
    items,
    flags: { ...next.flags, bagHeld: heldString(held) },
    flash: next.flash ? `${next.flash} ${note}` : note,
  }
}

/** Put held finds into the bag, as many as fit. A stack needs one free slot, or none if you carry some already. */
export function takeHeld(state: GameState): GameState {
  const held = heldOf(state.flags)
  const items = { ...state.items }
  let room = bagCap(state) - bagLoad(state)
  for (const id of Object.keys(held) as ItemId[]) {
    const n = held[id] ?? 0
    let take = 0
    if (bagFree(id)) take = n
    else if (bagStacks(id)) {
      if (bagCount({ ...state, items }, id) > 0) take = n
      else if (room > 0) {
        take = n
        room -= 1
      }
    } else {
      take = Math.max(0, Math.min(room, n))
      room -= take
    }
    if (!take) continue
    items[id] = (items[id] ?? 0) + take
    held[id] = n - take
  }
  const left = heldString(held)
  const flags = { ...state.flags }
  if (left) flags.bagHeld = left
  else delete flags.bagHeld
  return { ...state, items, flags }
}

// ── Gear tabs ──

export type GearTab = 'worn' | 'use' | 'trade' | 'key'

/** Which Gear tab lists the item. Wearable pieces live on the Worn tab (on the body, or spare). */
export function gearTab(id: ItemId): GearTab {
  const def = ITEMS[id]
  if (!def) return 'key'
  if (def.slot) return 'worn'
  if (id === 'vial_drop' || id === 'salve') return 'use'
  if (def.kind === 'key' || id === 'vial_empty' || def.bag != null) return 'key'
  return 'trade'
}

// ── Vessel disguise ──

/** Prisoner and Outcast doors: the Vessel Cloth worn reads as a cup to Cartel eyes, until someone sees through it. */
export function disguiseActive(state: Pick<GameState, 'door' | 'equipped' | 'flags'>): boolean {
  return state.door !== 'vessel' && state.equipped?.garment === 'ceremonial_cloth' && !state.flags.disguiseBlown
}

// ── Look ──

/** "look at my gear": what is worn, the numbers, and the bag. */
export function gearLookLine(state: GameState): string {
  const worn = EQUIP_SLOTS.filter((slot) => state.equipped?.[slot]).map((slot) => `${SLOT_LABEL[slot]}: ${ITEMS[state.equipped[slot] as ItemId].name}`)
  const parts = [
    worn.length ? `You wear ${worn.join(', ')}.` : 'You wear nothing that counts in a fight.',
    `Strike ${equippedStrike(state)}, Shell ${equippedShell(state)}.`,
    `Bag ${bagLoad(state)}/${bagCap(state)} slots.`,
  ]
  if (state.door !== 'vessel' && state.equipped?.garment === 'ceremonial_cloth') {
    parts.push(state.flags.disguiseBlown ? 'The Vessel Cloth has been seen through. It fools nobody now.' : 'The Vessel Cloth reads as a cup to Cartel eyes.')
  }
  return parts.join(' ')
}

// ── Craft ──

export const SCAV_PACK_RECIPE = { scrap: 3, sinew_cord: 1 } as const
export const SCAV_PACK_LOCKED = 'Needs 3 scrap and 1 Sinew Cord'

export function listedKit(items: Partial<Record<ItemId, number>>): KitChip[] {
  return (Object.keys(items) as ItemId[])
    .filter((id) => (items[id] ?? 0) > 0 && ITEMS[id])
    .map((id) => ({
      id,
      name: ITEMS[id].name,
      n: items[id] ?? 0,
      kind: ITEMS[id].kind,
      desc: ITEMS[id].desc,
      slot: ITEMS[id].slot,
      strike: ITEMS[id].strike,
      shell: ITEMS[id].shell,
    }))
}

export function kitLine(items: Partial<Record<ItemId, number>>): string {
  const chips = listedKit(items)
  if (!chips.length) return 'Empty pockets'
  return chips
    .map((c) => {
      const name = c.n > 1 ? `${c.name} ×${c.n}` : c.name
      const stat = gearStat(c)
      return stat ? `${name} (${stat})` : name
    })
    .join(' · ')
}

export type CostPill = { kind: 'sap' | 'item' | 'heat'; text: string }

export function effectPills(fx: Effect): CostPill[] {
  const pills: CostPill[] = []
  if (fx.sap && fx.sap < 0) pills.push({ kind: 'sap', text: `Sap ${fx.sap}` })
  if (fx.health && fx.health < 0) pills.push({ kind: 'sap', text: `Health ${fx.health}` })
  if (fx.add) {
    for (const id of Object.keys(fx.add) as ItemId[]) {
      const n = fx.add[id] ?? 0
      if (n <= 0 || !ITEMS[id]) continue
      const stat = gearStat(ITEMS[id])
      const name = n > 1 ? `${ITEMS[id].name} ×${n}` : ITEMS[id].name
      pills.push({ kind: 'item', text: stat ? `${name} · ${stat}` : name })
    }
  }
  if (fx.pay) {
    const label = moneyLabel(fx.pay)
    if (label) pills.push({ kind: 'item', text: label })
  }
  if (fx.remove) {
    for (const id of Object.keys(fx.remove) as ItemId[]) {
      const n = fx.remove[id] ?? 0
      if (n <= 0 || !ITEMS[id]) continue
      pills.push({ kind: 'item', text: n > 1 ? `${ITEMS[id].name} ×${n}` : ITEMS[id].name })
    }
  }
  if (fx.heat) {
    for (const f of ['cartel', 'seekers', 'strays'] as const) {
      const n = fx.heat[f]
      if (n) {
        const label = f === 'cartel' ? 'Cartel' : f === 'seekers' ? 'Seekers' : 'Strays'
        pills.push({ kind: 'heat', text: n > 0 ? `${label} +${n}` : `${label} Heat ${n}` })
      }
    }
  }
  return pills
}

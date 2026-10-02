import { ITEMS } from './content/catalog'
import { moneyLabel } from './trade'
import type { Effect, EquipSlot, GameState, ItemDef, ItemId } from './types'

export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'garment', 'head']

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

/** Empty hand still has a number. The fight adds its own 0-2 swing. */
export function equippedStrike(state: GameState): number {
  const id = state.equipped?.weapon
  if (id && ITEMS[id]?.strike != null) return ITEMS[id].strike as number
  return 1
}

/** Armor only. A worn garment does not stack into this. Bare shoulders are 0. */
export function equippedShell(state: GameState): number {
  const id = state.equipped?.armor
  if (id && ITEMS[id]?.shell != null) return ITEMS[id].shell as number
  return 0
}

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

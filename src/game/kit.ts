import { ITEMS } from './content/catalog'
import type { Effect, EquipSlot, ItemId } from './types'

export type KitChip = {
  id: ItemId
  name: string
  n: number
  kind: 'gear' | 'currency' | 'key' | 'weapon' | 'armor'
  desc: string
  slot?: EquipSlot
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
    }))
}

export function kitLine(items: Partial<Record<ItemId, number>>): string {
  const chips = listedKit(items)
  if (!chips.length) return 'Empty pockets'
  return chips.map((c) => (c.n > 1 ? `${c.name} ×${c.n}` : c.name)).join(' · ')
}

export type CostPill = { kind: 'sap' | 'item' | 'heat'; text: string }

export function effectPills(fx: Effect): CostPill[] {
  const pills: CostPill[] = []
  if (fx.sap && fx.sap < 0) pills.push({ kind: 'sap', text: `Sap ${fx.sap}` })
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
      if (n && n > 0) {
        const label = f === 'cartel' ? 'Cartel' : f === 'seekers' ? 'Seekers' : 'Strays'
        pills.push({ kind: 'heat', text: `${label} +${n}` })
      }
    }
  }
  return pills
}

import { ITEMS } from './content/catalog'
import type { Effect, EquipSlot, GameState, ItemDef, ItemId } from './types'

export type KitChip = {
  id: ItemId
  name: string
  n: number
  kind: 'gear' | 'currency' | 'key' | 'weapon' | 'armor'
  desc: string
  slot?: EquipSlot
  bite?: number
  hide?: number
}

export function gearStat(item: Pick<ItemDef, 'bite' | 'hide'> | null | undefined): string | null {
  if (!item) return null
  if (item.bite != null) return `Bite ${item.bite}`
  if (item.hide != null) return `Hide ${item.hide}`
  return null
}

/** Empty hand still has a number. Never a roll. */
export function equippedBite(state: GameState): number {
  const id = state.equipped?.weapon
  if (id && ITEMS[id]?.bite != null) return ITEMS[id].bite as number
  return 1
}

export function equippedHide(state: GameState): number {
  const id = state.equipped?.armor
  if (id && ITEMS[id]?.hide != null) return ITEMS[id].hide as number
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
      bite: ITEMS[id].bite,
      hide: ITEMS[id].hide,
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

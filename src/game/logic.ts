import type { Cond, Effect, GameState, ItemId } from './types'

export function check(cond: Cond | undefined, s: GameState): boolean {
  if (!cond) return true
  if (cond.all && !cond.all.every((c) => check(c, s))) return false
  if (cond.any && !cond.any.some((c) => check(c, s))) return false
  if (cond.not && check(cond.not, s)) return false
  if (cond.flag && !truthy(s.flags[cond.flag])) return false
  if (cond.flagUnset && truthy(s.flags[cond.flagUnset])) return false
  if (cond.flagEq && s.flags[cond.flagEq[0]] !== cond.flagEq[1]) return false
  if (cond.item && !(s.items[cond.item] ?? 0)) return false
  if (cond.itemMin && (s.items[cond.itemMin[0]] ?? 0) < cond.itemMin[1]) return false
  if (cond.sapMin !== undefined && s.sap < cond.sapMin) return false
  if (cond.sapMax !== undefined && s.sap > cond.sapMax) return false
  if (cond.heatMin && s.heat[cond.heatMin[0]] < cond.heatMin[1]) return false
  if (cond.heatMax && s.heat[cond.heatMax[0]] > cond.heatMax[1]) return false
  if (cond.door && s.door !== cond.door) return false
  if (cond.pressureMin !== undefined && s.pressure < cond.pressureMin) return false
  if (cond.ticksMin !== undefined && s.ticks < cond.ticksMin) return false
  return true
}

function truthy(v: boolean | string | number | undefined): boolean {
  return v !== undefined && v !== false && v !== 0 && v !== ''
}

export function itemCount(s: GameState, id: ItemId): number {
  return s.items[id] ?? 0
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function applyDelta(s: GameState, fx: Effect): GameState {
  const next: GameState = {
    ...s,
    heat: { ...s.heat },
    items: { ...s.items },
    flags: { ...s.flags },
    updatedAt: Date.now(),
  }

  if (fx.flash !== undefined) next.flash = fx.flash
  if (fx.sap) next.sap = clamp(next.sap + fx.sap, 0, next.sapMax)
  if (fx.heat) {
    ;(Object.keys(fx.heat) as (keyof typeof fx.heat)[]).forEach((k) => {
      const d = fx.heat?.[k]
      if (d) next.heat[k] = clamp(next.heat[k] + d, 0, 8)
    })
  }
  if (fx.add) {
    for (const key of Object.keys(fx.add) as ItemId[]) {
      const d = fx.add[key] ?? 0
      next.items[key] = (next.items[key] ?? 0) + d
    }
  }
  if (fx.remove) {
    for (const key of Object.keys(fx.remove) as ItemId[]) {
      const d = fx.remove[key] ?? 0
      const left = Math.max(0, (next.items[key] ?? 0) - d)
      if (left === 0) delete next.items[key]
      else next.items[key] = left
    }
  }
  if (fx.flag) Object.assign(next.flags, fx.flag)
  if (fx.unsetFlag) {
    for (const k of fx.unsetFlag) delete next.flags[k]
  }
  if (fx.pressure) next.pressure = Math.max(0, next.pressure + fx.pressure)
  if (fx.ticks) next.ticks += fx.ticks
  return next
}

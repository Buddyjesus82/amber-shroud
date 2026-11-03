import { vaultSneakOdds } from './ch3'
import type { Effect, FlagMap, GameState, ItemId } from './types'
import { CONDUITS_SPOTTED, RATIONS_SPOTTED } from './content/phase1Camps'

// v205 DRAFT: the party. One companion slot. State lives in flags (no save migration).
//   companion: id in the slot. companionHp: their Health. companionLost_<id>: downed, gone for this run.
//   Kelt's Runner: keltStatus inactive|active|completed|failed, keltScenes, keltMax, keltReward.

export type CompanionId = 'orla' | 'hester' | 'sable' | 'kelt'

export interface CompanionDef {
  id: CompanionId
  name: string
  strike: number
  shell: number
  hp: number
  portrait: string
}

/** v205: Hester's vouch. Stray ambushes need this much more Stray Heat while she rides with you. Pending Jeramie: set to Infinity for a full block. */
export const HESTER_HUNT_BONUS = 1
/** Perk text shown in Gear. Jeramie's wording (t1044u). */
export const PERKS: Partial<Record<CompanionId, string>> = {
  hester: "Hester's presence keeps the perimeter watches hesitant. Stray ambushes require +1 higher Stray Heat to trigger.",
}

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  orla: { id: 'orla', name: 'Orla Lusk', strike: 2, shell: 0, hp: 4, portrait: 'portraits/orla.jpg' },
  hester: { id: 'hester', name: 'Hester Ellery', strike: 2, shell: 2, hp: 5, portrait: 'portraits/hester.jpg' },
  sable: { id: 'sable', name: 'Sable Varn', strike: 3, shell: 1, hp: 3, portrait: 'portraits/sable.jpg' },
  kelt: { id: 'kelt', name: "Kelt's Runner", strike: 1, shell: 0, hp: 2, portrait: 'portraits/kelt.jpg' },
}

/** Every ability line and banner, in one place for approval. Kelt's lines are Jeramie's script, verbatim. */
export const LINES = {
  /** NEW */ joins: (name: string) => `${name} joins the party.`,
  /** NEW */ leaves: (name: string) => `${name} leaves the party.`,
  /** NEW */ swaps: (name: string) => `Swaps out ${name}.`,
  /** NEW */ downed: (name: string) => `${name} is down. ${name} is out of the party for this run.`,
  /** NEW */ smoke: 'Smoke Bomb: their attack is lost in the smoke.',
  /** NEW */ smokeRun: 'Smoke Bomb: running costs no extra Sap this round.',
  /** NEW */ lens: 'Lens Beam: ignores 2 of their Shell.',
  /** NEW */ guard: (name: string) => `Guard Duty: ${name} takes 1 damage meant for you.`,
  /** NEW */ mateHit: (name: string, who: string, d: number) => `${name} hits ${who} for ${d}.`,
  /** NEW */ orlaScrap: 'Orla Lusk: Scrap +1.',
  /** NEW */ sableHeat: 'Sable Varn draws the eye. Stray Heat +1. Seeker Heat +1.',
  /** NEW */ hesterCool: 'Stray Heat -1.',
  keltTick: 'Kelt\'s Runner stumbles, leaning heavily against the cavern wall. "Keep moving... the pulse on this cylinder is fading..."',
  keltFail: "Kelt's Runner drops to his knees in the dust, his hand slipping from the cylinder. He doesn't get back up.",
  /** NEW (result lines under Jeramie's banner) */ keltFailResult: 'Event Failed\n\nKelt\'s Runner is lost. Damaged Data Cylinder +1.',
  keltArrive: "We made it... didn't think my legs had another mile in 'em. Here—plug the cylinder directly into the bypass housing. Kelt's coordinates are live...",
  /** NEW (result line) */ keltReward: 'Sap +10. The Oasis Sap Reserve is a safe place to rest now.',
}

export function companionOf(state: Pick<GameState, 'flags'>): (CompanionDef & { hp: number }) | null {
  const id = state.flags.companion
  if (typeof id !== 'string' || !(id in COMPANIONS)) return null
  const def = COMPANIONS[id as CompanionId]
  return { ...def, hp: Number(state.flags.companionHp ?? def.hp) }
}

export function companionMaxHp(state: Pick<GameState, 'flags'>): number {
  const c = companionOf(state)
  if (!c) return 0
  if (c.id === 'kelt') return Number(state.flags.keltHpMax ?? c.hp)
  return COMPANIONS[c.id].hp
}

/** Sneak odds after the party: Kelt shaves 1 off every sneak, Orla off the Rations and Conduits sneaks. */
export function sneakOdds(state: Pick<GameState, 'flags'> & { heat?: GameState['heat'] }, sneak: { odds: number; spotted: string; kind?: string }): number {
  // v206 DRAFT: the Chapter Three vault sneak is solo and reads Seeker Heat.
  if (sneak.kind === 'vex') return vaultSneakOdds(state.heat?.seekers ?? 0)
  const c = companionOf(state)
  if (!c) return sneak.odds
  if (c.id === 'kelt') return Math.max(0, sneak.odds - 1)
  if (c.id === 'orla' && (sneak.spotted === RATIONS_SPOTTED || sneak.spotted === CONDUITS_SPOTTED)) return Math.max(0, sneak.odds - 1)
  return sneak.odds
}

/** Recruit (or swap in) a companion. Folded into the choice's own effect. */
export function recruitFx(state: GameState, id: CompanionId, fx: Effect, hp?: number): Effect {
  const def = COMPANIONS[id]
  const prev = companionOf(state)
  const flag: FlagMap = { ...(fx.flag ?? {}), companion: id, companionHp: hp ?? def.hp }
  const lines: string[] = []
  if (prev && prev.id !== id) {
    lines.push(LINES.leaves(prev.name))
    if (prev.id === 'kelt') Object.assign(flag, keltFailFlags())
  }
  lines.push(LINES.joins(def.name))
  let heat = fx.heat
  if (id === 'hester' && !state.flags.hesterCooled) {
    flag.hesterCooled = true
    heat = { ...(heat ?? {}), strays: (heat?.strays ?? 0) - 1 }
    lines.push(LINES.hesterCool)
  }
  const extraAdd: Partial<Record<ItemId, number>> = prev?.id === 'kelt' && id !== 'kelt' ? { damaged_data_cylinder: 1 } : {}
  return {
    ...fx,
    heat,
    flag,
    add: Object.keys(extraAdd).length ? { ...(fx.add ?? {}), ...extraAdd } : fx.add,
    flash: [fx.flash, ...lines].filter(Boolean).join('\n\n'),
  }
}

function keltFailFlags(): FlagMap {
  return { keltStatus: 'failed' }
}

/** Kelt's Runner fails: he dies, drops the Damaged Data Cylinder, and leaves the slot. */
export function keltFail(state: GameState): GameState {
  const flags: FlagMap = { ...state.flags, keltStatus: 'failed' }
  delete flags.companion
  delete flags.companionHp
  return {
    ...state,
    flags,
    items: { ...state.items, damaged_data_cylinder: (state.items.damaged_data_cylinder ?? 0) + 1 },
    flash: [LINES.keltFail, LINES.keltFailResult].join('\n\n'),
  }
}

export const OASIS = 'thresh:oasis'
export const SUBDRAIN = 'thresh:subdrain'
export const BREACH = 'thresh:breach'

/** A scene change while Kelt is escorted: arrive at the Oasis, or tick his timer. */
export function keltStep(before: GameState, next: GameState): GameState {
  if (next.sceneId === before.sceneId) return next
  if (next.flags.companion !== 'kelt' || next.flags.keltStatus !== 'active') return next
  if (next.sceneId === OASIS) {
    const flags: FlagMap = { ...next.flags, keltStatus: 'completed', keltReward: true }
    delete flags.companion
    delete flags.companionHp
    return { ...next, flags, sap: next.sap + 10, flash: [`"${LINES.keltArrive}"`, LINES.keltReward].join('\n\n') }
  }
  const scenes = Number(next.flags.keltScenes ?? 0) + 1
  let hp = Number(next.flags.companionHp ?? 0)
  if (scenes % 2 === 0) hp -= 1
  const after = { ...next, flags: { ...next.flags, keltScenes: scenes, companionHp: hp } }
  if (hp <= 0 || scenes > Number(next.flags.keltMax ?? 0)) return keltFail(after)
  if (hp === 1 && Number(next.flags.companionHp ?? 0) > 1) after.flash = [next.flash, LINES.keltTick].filter(Boolean).join('\n\n')
  return after
}

/** Dismiss: the companion leaves the slot. Kelt's Runner cannot be left behind and live: that is a failed escort. */
export function dismissCompanion(state: GameState): GameState {
  const c = companionOf(state)
  if (!c) return state
  if (c.id === 'kelt' && state.flags.keltStatus === 'active') return { ...keltFail(state), updatedAt: Date.now() }
  const flags = { ...state.flags }
  delete flags.companion
  delete flags.companionHp
  return { ...state, flags, flash: LINES.leaves(c.name), updatedAt: Date.now() }
}

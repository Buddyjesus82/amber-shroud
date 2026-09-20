import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { equippedBite, equippedHide } from './kit'
import type { Choice, Effect, GameState, ItemId } from './types'

export type EncounterKind = 'jackal' | 'cutter' | 'tick' | 'pup'

/** Fight hits. Sap stays thirst/travel. */
export const HEALTH_MAX = 6

type Spec = {
  kind: EncounterKind
  name: string
  bite: number
  hide: number
  hp: number
  line: string
}

const SPECS: Spec[] = [
  {
    kind: 'jackal',
    name: 'Dust-jackal',
    bite: 2,
    hide: 1,
    hp: 1,
    line: 'A dust-jackal blocks the grit — ribs like wire, eyes like spent Glints. It will take a hand or a skip.',
  },
  {
    kind: 'cutter',
    name: 'Rim cutter',
    bite: 3,
    hide: 2,
    hp: 2,
    line: 'A rim-cutter stands up out of scrap-shade. Knife-smile. Saleable pockets. Optional throat.',
  },
  {
    kind: 'tick',
    name: 'Amber-tick',
    bite: 1,
    hide: 3,
    hp: 1,
    line: "An amber-tick clings to a rib of rock, fat with somebody else's Drop. You can crack it or leave it humming.",
  },
  {
    kind: 'pup',
    name: 'Shard-pup',
    bite: 4,
    hide: 2,
    hp: 2,
    line: 'A Shard-pup — not a Hound yet, already a jaw. Cartel leftovers. Fight or give the road.',
  },
]

const TEACH =
  'Bite has to beat Hide to wound. Health takes the hits — not Sap. Fight or skip. Skip is free and pays nothing. Loot only if they drop.'

function seed(state: GameState): number {
  let n = state.ticks * 11 + state.pressure * 5 + state.sap * 3
  for (const ch of state.sceneId) n += ch.charCodeAt(0)
  n += (state.items.scrap ?? 0) + (state.items.glints ?? 0) * 2
  return Math.abs(n)
}

export function encounterSpec(state: GameState): Spec {
  const kind = state.flags.encounterKind
  const named = SPECS.find((s) => s.kind === kind)
  if (named) return named
  return SPECS[seed(state) % SPECS.length]
}

export function pickEncounterKind(state: GameState): EncounterKind {
  return SPECS[seed(state) % SPECS.length].kind
}

export function enemyHealth(kind: EncounterKind): number {
  return SPECS.find((s) => s.kind === kind)?.hp ?? 1
}

const ENCOUNTER_SCENES = new Set([
  'camp:yard',
  'camp:vents',
  'camp:wire',
  'camp:guard',
  'camp:bay',
  'spine:ridge',
  'spine:well',
  'spine:hound',
  'thresh:court',
  'thresh:paddock',
  'thresh:guard',
  'maw:rim',
  'maw:market',
  'maw:lip',
  'ch1:p-pipe',
  'ch1:o-noon',
  'ch1:v-hymn',
])

export function canEncounter(state: GameState): boolean {
  if (state.flags.hunterHere || state.flags.encounterHere) return false
  if (!ENCOUNTER_SCENES.has(state.sceneId)) return false
  if (state.sceneId.startsWith('open:') || state.sceneId.startsWith('crisis:')) return false
  const last = Number(state.flags.encounterAt ?? -99)
  if (last >= 0 && state.ticks - last < 6) return false
  if (state.ticks < 3) return false
  const scene = getScene(state.sceneId)
  if (scene.kind === 'talk' || scene.kind === 'crisis' || scene.kind === 'ending') return false
  const n = seed(state) % 5
  return n === 1 || n === 2
}

export type Clash = {
  spec: Spec
  bite: number
  hide: number
  dmgOut: number
  dmgIn: number
  theirHp: number
  yourHp: number
}

export function clashOf(state: GameState): Clash {
  const spec = encounterSpec(state)
  const bite = equippedBite(state)
  const hide = equippedHide(state)
  const dmgOut = Math.max(0, bite - spec.hide)
  const dmgIn = Math.max(0, spec.bite - hide)
  const theirNow = Number(state.flags.encounterHp ?? spec.hp)
  const healthMax = state.healthMax ?? HEALTH_MAX
  const yours = state.health ?? healthMax
  return {
    spec,
    bite,
    hide,
    dmgOut,
    dmgIn,
    theirHp: Math.max(0, theirNow),
    yourHp: Math.max(0, Math.min(healthMax, yours)),
  }
}

function compareLines(c: Clash): string {
  return `You Bite ${c.bite} vs their Hide ${c.spec.hide}\n\nTheir Bite ${c.spec.bite} vs your Hide ${c.hide}`
}

function compareHit(c: Clash): string {
  return `You Bite ${c.bite} vs their Hide ${c.spec.hide} → ${c.dmgOut}\n\nTheir Bite ${c.spec.bite} vs your Hide ${c.hide} → ${c.dmgIn}`
}

/** Encounter interrupt body only — never the place underneath. */
export function encounterCard(state: GameState): string {
  const clashText = state.flags.encounterClash
  if (typeof clashText === 'string' && clashText) return clashText
  const c = clashOf(state)
  const compares = compareLines(c)
  if (!state.flags.fightTaught) {
    return `${c.spec.line}\n\n${compares}\n\n${TEACH}`
  }
  return `${c.spec.line}\n\n${compares}`
}

export function encounterAppend(state: GameState): string {
  return encounterCard(state)
}

export function encounterChoices(state: GameState): Choice[] {
  const spec = encounterSpec(state)
  const rows: Choice[] = [
    {
      id: 'enc-fight',
      label: `Fight the ${spec.name}`,
      sub: 'Bite vs Hide. Health takes hits. No dice.',
      tone: 'danger',
      effects: { resolveEncounter: 'fight', ticks: 1 },
    },
    {
      id: 'enc-skip',
      label: 'Give the road. No loot.',
      tone: 'quiet',
      effects: { resolveEncounter: 'skip' },
    },
    {
      id: 'enc-cloak',
      label: 'Let the cloak eat the glance. Skip.',
      show: { slot: 'armor' },
      effects: { resolveEncounter: 'skip' },
    },
  ]
  return rows.filter((c) => check(c.show, state))
}

export function encounterSpeaker(state: GameState): string {
  return encounterSpec(state).name
}

function lootFor(kind: EncounterKind): Partial<Record<ItemId, number>> {
  if (kind === 'jackal') return { scrap: 2 }
  if (kind === 'cutter') return { glints: 1, scrap: 1 }
  if (kind === 'tick') return { vial_drop: 1 }
  return { glints: 1, scrap: 1 }
}

function lootLine(add: Partial<Record<ItemId, number>>): string {
  const bits = (Object.keys(add) as ItemId[]).map((id) => {
    const n = add[id] ?? 0
    const name = ITEMS[id]?.name ?? id
    return n > 1 ? `${name} ×${n}` : name
  })
  return bits.join(', ')
}

const CLEAR = ['encounterHere', 'encounterKind', 'encounterHp', 'encounterClash'] as const

function clearFx(state: GameState, extra: FlagMap = {}): Pick<Effect, 'unsetFlag' | 'flag'> {
  return {
    unsetFlag: [...CLEAR],
    flag: { encounterAt: state.ticks, fightTaught: true, ...extra },
  }
}

type FlagMap = GameState['flags']

export function resolveEncounter(state: GameState, how: 'fight' | 'skip'): { fx: Effect; flash: string } {
  const spec = encounterSpec(state)
  if (how === 'skip') {
    return {
      fx: { ...clearFx(state) },
      flash: `You give the ${spec.name} the road. No loot. No bill.`,
    }
  }

  const c = clashOf(state)
  const theirHp = Math.max(0, c.theirHp - c.dmgOut)
  const yourHp = Math.max(0, c.yourHp - c.dmgIn)
  const max = state.healthMax ?? HEALTH_MAX
  const healthDelta = yourHp - c.yourHp
  const hitCard = compareHit(c)

  if (theirHp <= 0) {
    const add = lootFor(spec.kind)
    const loot = lootLine(add)
    const stagger = yourHp <= 0
    const outcome = stagger
      ? `They drop. You drop with them. ${loot}. Health 1/${max}. You crawl.`
      : `They drop. ${loot}.`
    return {
      fx: {
        ...clearFx(state),
        health: stagger ? 1 - c.yourHp : healthDelta,
        add,
        pressure: c.dmgIn > 0 ? 1 : undefined,
      },
      flash: `${hitCard}\n\n${outcome}`,
    }
  }

  if (yourHp <= 0) {
    return {
      fx: {
        ...clearFx(state),
        health: 1 - c.yourHp,
        sap: state.sap > 0 ? -1 : undefined,
        pressure: 2,
      },
      flash: `${hitCard}\n\nYou drop. No loot. Health 1/${max}. The road is theirs.`,
    }
  }

  const standing = `${hitCard}\n\nThey still stand. Their Health ${theirHp}/${spec.hp}. Yours ${yourHp}/${max}. No loot yet.`
  return {
    fx: {
      health: healthDelta,
      ticks: 0,
      flag: {
        encounterHere: true,
        encounterKind: spec.kind,
        encounterHp: theirHp,
        encounterClash: standing,
        fightTaught: true,
        encounterAt: state.ticks,
      },
    },
    flash: '',
  }
}

export function wantsEncounterFight(text: string): boolean {
  return /\b(fight|attack|kill|stab|hit|punch|cut|strike|engage)\b/i.test(text)
}

export function wantsEncounterSkip(text: string): boolean {
  return /\b(skip|leave|run|flee|walk|pass|ignore|back|go)\b/i.test(text)
}

export function healthLabel(n: number): string {
  if (n <= 0) return 'Down'
  if (n <= 2) return 'Hurt'
  if (n <= 4) return 'Holding'
  return 'Steady'
}

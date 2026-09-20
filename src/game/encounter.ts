import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { equippedBite, equippedHide } from './kit'
import type { Choice, Effect, GameState, ItemId } from './types'

export type EncounterKind = 'jackal' | 'cutter' | 'tick' | 'pup'

type Spec = {
  kind: EncounterKind
  name: string
  bite: number
  hide: number
  line: string
}

const SPECS: Spec[] = [
  {
    kind: 'jackal',
    name: 'Dust-jackal',
    bite: 2,
    hide: 1,
    line: 'A dust-jackal blocks the grit — ribs like wire, eyes like spent Glints. It will take a hand or a skip.',
  },
  {
    kind: 'cutter',
    name: 'Rim cutter',
    bite: 3,
    hide: 2,
    line: 'A rim-cutter stands up out of scrap-shade. Knife-smile. Saleable pockets. Optional throat.',
  },
  {
    kind: 'tick',
    name: 'Amber-tick',
    bite: 1,
    hide: 3,
    line: 'An amber-tick clings to a rib of rock, fat with somebody else\'s Drop. You can crack it or leave it humming.',
  },
  {
    kind: 'pup',
    name: 'Shard-pup',
    bite: 4,
    hide: 2,
    line: 'A Shard-pup — not a Hound yet, already a jaw. Cartel leftovers. Fight or give the road.',
  },
]

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

const ENCOUNTER_SCENES = new Set([
  'camp:yard',
  'camp:vents',
  'camp:wire',
  'camp:guard',
  'camp:bay',
  'spine:ridge',
  'spine:well',
  'thresh:paddock',
  'thresh:guard',
  'maw:rim',
  'maw:market',
  'maw:lip',
  'ch1:trail',
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

export function encounterAppend(state: GameState): string {
  const spec = encounterSpec(state)
  return `${spec.line}

Bite ${spec.bite} against your Hide ${equippedHide(state)}. Their Hide ${spec.hide} against your Bite ${equippedBite(state)}. Numbers compare gear — no dice. You can fight or skip. Skip costs nothing. Skip pays nothing.`
}

export function encounterChoices(state: GameState): Choice[] {
  const spec = encounterSpec(state)
  const rows: Choice[] = [
    {
      id: 'enc-fight',
      label: `Fight the ${spec.name}`,
      sub: `Bite ${equippedBite(state)} vs Hide ${spec.hide}. Their Bite ${spec.bite} vs your Hide ${equippedHide(state)}. No dice.`,
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

function lootFor(kind: EncounterKind, win: boolean): Partial<Record<ItemId, number>> {
  if (!win) return {}
  if (kind === 'jackal') return { scrap: 2 }
  if (kind === 'cutter') return { glints: 1, scrap: 1 }
  if (kind === 'tick') return { vial_drop: 1 }
  return { glints: 1, scrap: 1 }
}

export function resolveEncounter(state: GameState, how: 'fight' | 'skip'): { fx: Effect; flash: string } {
  const spec = encounterSpec(state)
  const clear = { unsetFlag: ['encounterHere'], flag: { encounterAt: state.ticks } }
  if (how === 'skip') {
    return {
      fx: { ...clear },
      flash: `You give the ${spec.name} the road. No loot. No bill. The ground does not charge you for manners.`,
    }
  }
  const bite = equippedBite(state)
  const hide = equippedHide(state)
  const hit = bite >= spec.hide
  const hurt = spec.bite > hide
  const win = hit
  const add = lootFor(spec.kind, win)
  const sap = hurt ? (hit ? -1 : -2) : 0
  const lootBits = Object.keys(add) as ItemId[]
  const lootLine = lootBits.length
    ? lootBits
        .map((id) => {
          const n = add[id] ?? 0
          const name = ITEMS[id]?.name ?? id
          return n > 1 ? `${name} ×${n}` : name
        })
        .join(', ')
    : ''
  let flash: string
  if (hit && !hurt) {
    flash = `Your Bite ${bite} covers their Hide ${spec.hide}. They never land. ${lootLine}. Saleable. Equip gear in Gear if it has a slot.`
  } else if (hit && hurt) {
    flash = `You land (Bite ${bite} vs Hide ${spec.hide}). They land (Bite ${spec.bite} vs Hide ${hide}). Sap burns. ${lootLine}.`
  } else if (!hit && hurt) {
    flash = `Your Bite ${bite} does not cover Hide ${spec.hide}. Their Bite ${spec.bite} finds you. No loot. Sap spends.`
  } else {
    flash = `Nobody lands. Bite ${bite} vs Hide ${spec.hide}; their Bite ${spec.bite} vs your Hide ${hide}. You keep the road and a twist of scrap for the trouble.`
    add.scrap = (add.scrap ?? 0) + 1
  }
  return {
    fx: {
      ...clear,
      sap: sap || undefined,
      add: Object.keys(add).length ? add : undefined,
      pressure: hurt ? 1 : undefined,
    },
    flash,
  }
}

export function wantsEncounterFight(text: string): boolean {
  return /\b(fight|attack|kill|stab|hit|punch|cut|strike|engage)\b/i.test(text)
}

export function wantsEncounterSkip(text: string): boolean {
  return /\b(skip|leave|run|flee|walk|pass|ignore|back|go)\b/i.test(text)
}
